const express = require('express');
const { body, param, query: queryValidator } = require('express-validator');
const { query } = require('../config/database');
const { authenticate, authorize, tenantGuard } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');

const router = express.Router();
router.use(authenticate);
router.use(tenantGuard);

// ── GET /api/organizations ── (Super Admin: all, Tenant Admin: own)
router.get('/', async (req, res, next) => {
  try {
    let result;
    if (req.user.role === 'super_admin') {
      result = await query(`
        SELECT o.*,
          (SELECT COUNT(*) FROM users u WHERE u.organization_id = o.id) AS user_count,
          (SELECT COUNT(*) FROM smart_meters sm WHERE sm.organization_id = o.id) AS meter_count
        FROM organizations o ORDER BY o.created_at DESC
      `);
    } else {
      result = await query(`
        SELECT o.*,
          (SELECT COUNT(*) FROM users u WHERE u.organization_id = o.id) AS user_count,
          (SELECT COUNT(*) FROM smart_meters sm WHERE sm.organization_id = o.id) AS meter_count
        FROM organizations o WHERE o.id = $1
      `, [req.tenantId]);
    }
    res.json(result.rows);
  } catch (err) { next(err); }
});

// ── GET /api/organizations/:id ──
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (req.user.role !== 'super_admin' && id !== req.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const result = await query(`
      SELECT o.*,
        (SELECT COUNT(*) FROM users u WHERE u.organization_id = o.id) AS user_count,
        (SELECT COUNT(*) FROM smart_meters sm WHERE sm.organization_id = o.id) AS meter_count,
        (SELECT COALESCE(SUM(er.energy_kwh),0) FROM energy_readings er 
         WHERE er.organization_id = o.id AND er.timestamp >= DATE_TRUNC('month', NOW())) AS month_energy_kwh,
        (SELECT COALESCE(SUM(er.cost),0) FROM energy_readings er 
         WHERE er.organization_id = o.id AND er.timestamp >= DATE_TRUNC('month', NOW())) AS month_cost
      FROM organizations o WHERE o.id = $1
    `, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Organization not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// ── POST /api/organizations ── (Super Admin only)
router.post(
  '/',
  authorize('super_admin'),
  [
    body('name').trim().notEmpty(),
    body('slug').trim().notEmpty().isSlug(),
    body('type').isIn(['residential', 'commercial', 'industrial', 'utility', 'city']),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, slug, type, address, city, state, country, contact_email, contact_phone } = req.body;
      const existing = await query('SELECT id FROM organizations WHERE slug = $1', [slug]);
      if (existing.rows.length > 0) return res.status(409).json({ error: 'Slug already in use' });

      const result = await query(`
        INSERT INTO organizations (name, slug, type, address, city, state, country, contact_email, contact_phone)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
      `, [name, slug, type, address, city, state, country || 'India', contact_email, contact_phone]);

      res.status(201).json(result.rows[0]);
    } catch (err) { next(err); }
  }
);

// ── PUT /api/organizations/:id ──
router.put('/:id', authorize('super_admin', 'tenant_admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    if (req.user.role !== 'super_admin' && id !== req.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const { name, address, city, state, contact_email, contact_phone, settings } = req.body;
    const result = await query(`
      UPDATE organizations SET
        name = COALESCE($2, name), address = COALESCE($3, address),
        city = COALESCE($4, city), state = COALESCE($5, state),
        contact_email = COALESCE($6, contact_email), contact_phone = COALESCE($7, contact_phone),
        settings = COALESCE($8, settings)
      WHERE id = $1 RETURNING *
    `, [id, name, address, city, state, contact_email, contact_phone, settings ? JSON.stringify(settings) : null]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
