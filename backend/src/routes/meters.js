const express = require('express');
const { body } = require('express-validator');
const { query } = require('../config/database');
const { authenticate, authorize, tenantGuard } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');

const router = express.Router();
router.use(authenticate);
router.use(tenantGuard);

// ── GET /api/meters ──
router.get('/', async (req, res, next) => {
  try {
    const params = [req.tenantId];
    let whereClause = 'sm.organization_id = $1';

    if (req.user.role === 'super_admin' && req.query.all === 'true') {
      whereClause = '1=1';
      params.length = 0;
    }

    const result = await query(`
      SELECT sm.*,
        u.first_name || ' ' || u.last_name AS user_name,
        u.email AS user_email,
        tp.name AS tariff_name,
        tp.type AS tariff_type,
        o.name AS org_name
      FROM smart_meters sm
      LEFT JOIN users u ON u.id = sm.user_id
      LEFT JOIN tariff_plans tp ON tp.id = sm.tariff_plan_id
      LEFT JOIN organizations o ON o.id = sm.organization_id
      WHERE ${whereClause}
      ORDER BY sm.created_at DESC
    `, params);

    res.json(result.rows);
  } catch (err) { next(err); }
});

// ── GET /api/meters/:id ──
router.get('/:id', async (req, res, next) => {
  try {
    const whereOrg = req.user.role === 'super_admin' ? '' : 'AND sm.organization_id = $2';
    const params = req.user.role === 'super_admin' ? [req.params.id] : [req.params.id, req.tenantId];

    const result = await query(`
      SELECT sm.*,
        u.first_name || ' ' || u.last_name AS user_name,
        tp.name AS tariff_name, tp.type AS tariff_type,
        tp.tod_rates, tp.flat_rate, tp.tier_rates
      FROM smart_meters sm
      LEFT JOIN users u ON u.id = sm.user_id
      LEFT JOIN tariff_plans tp ON tp.id = sm.tariff_plan_id
      WHERE sm.id = $1 ${whereOrg}
    `, params);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Meter not found' });

    // Get latest reading
    const latestReading = await query(`
      SELECT * FROM energy_readings WHERE meter_id = $1 ORDER BY timestamp DESC LIMIT 1
    `, [req.params.id]);

    const meter = result.rows[0];
    meter.latest_reading = latestReading.rows[0] || null;

    res.json(meter);
  } catch (err) { next(err); }
});

// ── POST /api/meters ──
router.post(
  '/',
  authorize('super_admin', 'tenant_admin'),
  [
    body('meter_serial').trim().notEmpty(),
    body('location').trim().notEmpty(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { meter_serial, meter_type, manufacturer, model, firmware_version,
              location, latitude, longitude, max_load_kw, user_id, tariff_plan_id } = req.body;
      const orgId = req.user.role === 'super_admin' ? (req.body.organization_id || req.tenantId) : req.tenantId;

      const existing = await query('SELECT id FROM smart_meters WHERE meter_serial = $1', [meter_serial]);
      if (existing.rows.length > 0) return res.status(409).json({ error: 'Serial number already exists' });

      const result = await query(`
        INSERT INTO smart_meters (organization_id, user_id, tariff_plan_id, meter_serial, meter_type,
          manufacturer, model, firmware_version, location, latitude, longitude, max_load_kw)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *
      `, [orgId, user_id || null, tariff_plan_id || null, meter_serial, meter_type || 'smart',
          manufacturer || 'EnergyTech', model || 'ET-Smart-3000', firmware_version || 'v2.1.4',
          location, latitude, longitude, max_load_kw || 10.0]);

      res.status(201).json(result.rows[0]);
    } catch (err) { next(err); }
  }
);

// ── PUT /api/meters/:id/status ── (change status)
router.put('/:id/status', authorize('super_admin', 'tenant_admin'), async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['online', 'offline', 'maintenance', 'error', 'decommissioned'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const result = await query(`
      UPDATE smart_meters SET status = $1, last_communication = NOW()
      WHERE id = $2 AND organization_id = $3 RETURNING *
    `, [status, req.params.id, req.tenantId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Meter not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// ── POST /api/meters/:id/command ── (remote device control)
router.post('/:id/command', authorize('super_admin', 'tenant_admin'), async (req, res, next) => {
  try {
    const { command_type, payload } = req.body;
    const validCommands = ['reboot', 'firmware_update', 'read_now', 'disconnect', 'reconnect', 'set_load_limit', 'reset_tamper', 'ping'];
    if (!validCommands.includes(command_type)) {
      return res.status(400).json({ error: 'Invalid command type' });
    }

    // Verify meter belongs to tenant
    const meter = await query('SELECT id FROM smart_meters WHERE id = $1 AND organization_id = $2', [req.params.id, req.tenantId]);
    if (meter.rows.length === 0) return res.status(404).json({ error: 'Meter not found' });

    const result = await query(`
      INSERT INTO device_commands (organization_id, meter_id, command_type, payload, issued_by, status)
      VALUES ($1, $2, $3, $4, $5, 'sent') RETURNING *
    `, [req.tenantId, req.params.id, command_type, JSON.stringify(payload || {}), req.user.id]);

    // Simulate command execution (in production this would go through IoT gateway)
    setTimeout(async () => {
      await query(`
        UPDATE device_commands SET status = 'executed', executed_at = NOW(),
        response = '{"success": true, "message": "Command executed successfully"}'
        WHERE id = $1
      `, [result.rows[0].id]);
    }, 2000);

    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

// ── GET /api/meters/:id/commands ──
router.get('/:id/commands', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT dc.*, u.first_name || ' ' || u.last_name AS issued_by_name
      FROM device_commands dc
      LEFT JOIN users u ON u.id = dc.issued_by
      WHERE dc.meter_id = $1 AND dc.organization_id = $2
      ORDER BY dc.issued_at DESC LIMIT 50
    `, [req.params.id, req.tenantId]);
    res.json(result.rows);
  } catch (err) { next(err); }
});

module.exports = router;
