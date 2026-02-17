const express = require('express');
const { body } = require('express-validator');
const { query } = require('../config/database');
const { authenticate, authorize, tenantGuard } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');

const router = express.Router();
router.use(authenticate);
router.use(tenantGuard);

// ── GET /api/tariffs ──
router.get('/', async (req, res, next) => {
  try {
    let whereClause = 'tp.organization_id = $1 OR tp.organization_id IS NULL';
    const params = [req.tenantId];

    if (req.user.role === 'super_admin' && req.query.all === 'true') {
      whereClause = '1=1';
      params.length = 0;
    }

    const result = await query(`
      SELECT tp.*, o.name AS org_name,
        (SELECT COUNT(*) FROM smart_meters sm WHERE sm.tariff_plan_id = tp.id) AS assigned_meters
      FROM tariff_plans tp
      LEFT JOIN organizations o ON o.id = tp.organization_id
      WHERE ${whereClause}
      ORDER BY tp.created_at DESC
    `, params);

    res.json(result.rows);
  } catch (err) { next(err); }
});

// ── GET /api/tariffs/:id ──
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM tariff_plans WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tariff not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// ── POST /api/tariffs ──
router.post(
  '/',
  authorize('super_admin', 'tenant_admin'),
  [
    body('name').trim().notEmpty(),
    body('type').isIn(['flat', 'tod', 'tiered']),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, description, type, flat_rate, tod_rates, tier_rates,
              carbon_factor, fixed_charge, tax_percentage, effective_from } = req.body;
      const orgId = req.user.role === 'super_admin' ? (req.body.organization_id || req.tenantId) : req.tenantId;

      const result = await query(`
        INSERT INTO tariff_plans (organization_id, name, description, type, flat_rate,
          tod_rates, tier_rates, carbon_factor, fixed_charge, tax_percentage, effective_from)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
      `, [orgId, name, description, type, flat_rate,
          JSON.stringify(tod_rates || []), JSON.stringify(tier_rates || []),
          carbon_factor || 0.82, fixed_charge || 0, tax_percentage || 18, effective_from || new Date()]);

      res.status(201).json(result.rows[0]);
    } catch (err) { next(err); }
  }
);

// ── PUT /api/tariffs/:id ──
router.put('/:id', authorize('super_admin', 'tenant_admin'), async (req, res, next) => {
  try {
    const { name, description, tod_rates, tier_rates, flat_rate,
            carbon_factor, fixed_charge, tax_percentage, is_active } = req.body;

    const result = await query(`
      UPDATE tariff_plans SET
        name = COALESCE($2, name), description = COALESCE($3, description),
        tod_rates = COALESCE($4, tod_rates), tier_rates = COALESCE($5, tier_rates),
        flat_rate = COALESCE($6, flat_rate), carbon_factor = COALESCE($7, carbon_factor),
        fixed_charge = COALESCE($8, fixed_charge), tax_percentage = COALESCE($9, tax_percentage),
        is_active = COALESCE($10, is_active)
      WHERE id = $1 RETURNING *
    `, [req.params.id, name, description,
        tod_rates ? JSON.stringify(tod_rates) : null, tier_rates ? JSON.stringify(tier_rates) : null,
        flat_rate, carbon_factor, fixed_charge, tax_percentage, is_active]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// ── PUT /api/tariffs/:id/assign ── Assign tariff to a meter
router.put('/:id/assign', authorize('super_admin', 'tenant_admin'), async (req, res, next) => {
  try {
    const { meter_ids } = req.body;
    if (!Array.isArray(meter_ids) || meter_ids.length === 0) {
      return res.status(400).json({ error: 'meter_ids array required' });
    }

    const updated = await query(`
      UPDATE smart_meters SET tariff_plan_id = $1
      WHERE id = ANY($2) AND organization_id = $3
      RETURNING id, meter_serial
    `, [req.params.id, meter_ids, req.tenantId]);

    res.json({ message: `Tariff assigned to ${updated.rowCount} meters`, meters: updated.rows });
  } catch (err) { next(err); }
});

// ── GET /api/tariffs/current-rate ── Get current applicable rate
router.get('/current/rate', async (req, res, next) => {
  try {
    // Find user's tariff plan
    const meter = await query(`
      SELECT tp.* FROM smart_meters sm
      JOIN tariff_plans tp ON tp.id = sm.tariff_plan_id
      WHERE sm.organization_id = $1 AND sm.user_id = $2 LIMIT 1
    `, [req.tenantId, req.user.id]);

    if (meter.rows.length === 0) {
      return res.json({ rate: 6.50, type: 'default', slot: 'standard' });
    }

    const tariff = meter.rows[0];
    const now = new Date();
    const currentHour = now.getHours();
    const currentTime = `${String(currentHour).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (tariff.type === 'flat') {
      return res.json({ rate: parseFloat(tariff.flat_rate), type: 'flat', slot: 'flat' });
    }

    if (tariff.type === 'tod') {
      const todRates = tariff.tod_rates || [];
      for (const slot of todRates) {
        let inSlot = false;
        if (slot.start > slot.end) {
          // Overnight slot (e.g., 22:00 to 06:00)
          inSlot = currentTime >= slot.start || currentTime < slot.end;
        } else {
          inSlot = currentTime >= slot.start && currentTime < slot.end;
        }
        if (inSlot) {
          return res.json({ rate: slot.rate, type: 'tod', slot: slot.name, allSlots: todRates });
        }
      }
    }

    res.json({ rate: 6.50, type: 'default', slot: 'standard' });
  } catch (err) { next(err); }
});

module.exports = router;
