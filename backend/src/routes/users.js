const express = require('express');
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const { query } = require('../config/database');
const { authenticate, authorize, tenantGuard } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');

const router = express.Router();
router.use(authenticate);
router.use(tenantGuard);

// ── GET /api/users ──
router.get('/', authorize('super_admin', 'tenant_admin'), async (req, res, next) => {
  try {
    let whereClause = 'u.organization_id = $1';
    const params = [req.tenantId];

    if (req.user.role === 'super_admin' && req.query.all === 'true') {
      whereClause = '1=1';
      params.length = 0;
    }

    const result = await query(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.phone,
             u.is_active, u.last_login, u.created_at,
             o.name AS org_name, o.slug AS org_slug,
             (SELECT COUNT(*) FROM appliances a WHERE a.user_id = u.id AND a.is_active = true) AS appliance_count,
             (SELECT COUNT(*) FROM smart_meters sm WHERE sm.user_id = u.id) AS meter_count
      FROM users u
      JOIN organizations o ON o.id = u.organization_id
      WHERE ${whereClause}
      ORDER BY u.created_at DESC
    `, params);

    res.json(result.rows);
  } catch (err) { next(err); }
});

// ── GET /api/users/:id ──
router.get('/:id', authorize('super_admin', 'tenant_admin'), async (req, res, next) => {
  try {
    const result = await query(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.phone,
             u.is_active, u.last_login, u.created_at, u.preferences,
             o.name AS org_name
      FROM users u JOIN organizations o ON o.id = u.organization_id
      WHERE u.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    // Tenant isolation check
    const user = result.rows[0];
    if (req.user.role !== 'super_admin' && user.organization_id !== req.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get usage summary
    const usage = await query(`
      SELECT COALESCE(SUM(er.energy_kwh), 0) AS month_kwh,
             COALESCE(SUM(er.cost), 0) AS month_cost
      FROM energy_readings er
      JOIN smart_meters sm ON sm.id = er.meter_id
      WHERE sm.user_id = $1 AND er.timestamp >= DATE_TRUNC('month', NOW())
    `, [req.params.id]);

    res.json({ ...user, usage: usage.rows[0] });
  } catch (err) { next(err); }
});

// ── POST /api/users ── (Admin creates user)
router.post(
  '/',
  authorize('super_admin', 'tenant_admin'),
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    body('role').isIn(['tenant_admin', 'user']),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { email, password, firstName, lastName, role, phone } = req.body;

      // Tenant admin cannot create super_admin
      if (req.user.role === 'tenant_admin' && role === 'super_admin') {
        return res.status(403).json({ error: 'Cannot assign this role' });
      }

      const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) return res.status(409).json({ error: 'Email already registered' });

      const orgId = req.user.role === 'super_admin' ? (req.body.organization_id || req.tenantId) : req.tenantId;
      const passwordHash = await bcrypt.hash(password, 12);

      const result = await query(`
        INSERT INTO users (organization_id, email, password_hash, first_name, last_name, role, phone)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING id, email, first_name, last_name, role, organization_id, created_at
      `, [orgId, email, passwordHash, firstName, lastName, role, phone]);

      res.status(201).json(result.rows[0]);
    } catch (err) { next(err); }
  }
);

// ── PUT /api/users/:id ──
router.put('/:id', authorize('super_admin', 'tenant_admin'), async (req, res, next) => {
  try {
    const { firstName, lastName, role, phone, is_active } = req.body;

    const result = await query(`
      UPDATE users SET
        first_name = COALESCE($2, first_name), last_name = COALESCE($3, last_name),
        role = COALESCE($4, role), phone = COALESCE($5, phone),
        is_active = COALESCE($6, is_active)
      WHERE id = $1 RETURNING id, email, first_name, last_name, role, is_active
    `, [req.params.id, firstName, lastName, role, phone, is_active]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// ── DELETE /api/users/:id ──
router.delete('/:id', authorize('super_admin', 'tenant_admin'), async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    const result = await query(
      'UPDATE users SET is_active = false WHERE id = $1 AND organization_id = $2 RETURNING id',
      [req.params.id, req.tenantId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'User deactivated' });
  } catch (err) { next(err); }
});

// ── GET /api/users/:id/usage-history ──
router.get('/:id/usage-history', async (req, res, next) => {
  try {
    const userId = req.user.role === 'user' ? req.user.id : req.params.id;
    const days = parseInt(req.query.days) || 30;

    const result = await query(`
      SELECT DATE(er.timestamp) AS date,
        SUM(er.energy_kwh) AS kwh, SUM(er.cost) AS cost, SUM(er.carbon_kg) AS carbon
      FROM energy_readings er
      JOIN smart_meters sm ON sm.id = er.meter_id
      WHERE sm.user_id = $1 AND er.timestamp >= NOW() - ($2 || ' days')::INTERVAL
      GROUP BY DATE(er.timestamp) ORDER BY date
    `, [userId, days]);

    res.json(result.rows);
  } catch (err) { next(err); }
});

module.exports = router;
