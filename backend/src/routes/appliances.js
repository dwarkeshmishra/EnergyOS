const express = require('express');
const { body } = require('express-validator');
const { query } = require('../config/database');
const { authenticate, tenantGuard } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');

const router = express.Router();
router.use(authenticate);
router.use(tenantGuard);

// ── GET /api/appliances ──
router.get('/', async (req, res, next) => {
  try {
    let whereClause = 'a.organization_id = $1';
    const params = [req.tenantId];

    // Regular users see only their own appliances
    if (req.user.role === 'user') {
      whereClause += ' AND a.user_id = $2';
      params.push(req.user.id);
    }

    const result = await query(`
      SELECT a.*,
        u.first_name || ' ' || u.last_name AS user_name,
        sm.meter_serial
      FROM appliances a
      LEFT JOIN users u ON u.id = a.user_id
      LEFT JOIN smart_meters sm ON sm.id = a.meter_id
      WHERE ${whereClause} AND a.is_active = true
      ORDER BY a.name
    `, params);

    res.json(result.rows);
  } catch (err) { next(err); }
});

// ── GET /api/appliances/:id ──
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT a.*, sm.meter_serial,
        u.first_name || ' ' || u.last_name AS user_name
      FROM appliances a
      LEFT JOIN smart_meters sm ON sm.id = a.meter_id
      LEFT JOIN users u ON u.id = a.user_id
      WHERE a.id = $1 AND a.organization_id = $2
    `, [req.params.id, req.tenantId]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Appliance not found' });

    // Get usage history (last 7 days)
    const usage = await query(`
      SELECT DATE(started_at) AS date,
        SUM(energy_consumed_kwh) AS total_kwh,
        SUM(cost) AS total_cost,
        SUM(duration_minutes) AS total_minutes
      FROM appliance_usage_logs
      WHERE appliance_id = $1 AND started_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(started_at) ORDER BY date
    `, [req.params.id]);

    const appliance = result.rows[0];
    appliance.weekly_usage = usage.rows;

    res.json(appliance);
  } catch (err) { next(err); }
});

// ── POST /api/appliances ──
router.post(
  '/',
  [
    body('name').trim().notEmpty(),
    body('type').isIn(['ac', 'refrigerator', 'washing_machine', 'ev_charger', 'water_heater',
      'microwave', 'television', 'lighting', 'fan', 'computer', 'dishwasher',
      'dryer', 'oven', 'solar_panel', 'battery_storage', 'pool_pump', 'other']),
    body('rated_power_watts').isFloat({ min: 1 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, type, brand, model, rated_power_watts, avg_daily_usage_hours,
              meter_id, is_schedulable, icon } = req.body;

      const result = await query(`
        INSERT INTO appliances (organization_id, user_id, meter_id, name, type, brand, model,
          rated_power_watts, avg_daily_usage_hours, is_schedulable, icon)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
      `, [req.tenantId, req.user.id, meter_id || null, name, type, brand, model,
          rated_power_watts, avg_daily_usage_hours || 1, is_schedulable !== false, icon]);

      res.status(201).json(result.rows[0]);
    } catch (err) { next(err); }
  }
);

// ── PUT /api/appliances/:id/toggle ── (ON/OFF control)
router.put('/:id/toggle', async (req, res, next) => {
  try {
    const appliance = await query(
      'SELECT * FROM appliances WHERE id = $1 AND organization_id = $2',
      [req.params.id, req.tenantId]
    );
    if (appliance.rows.length === 0) return res.status(404).json({ error: 'Appliance not found' });

    const app = appliance.rows[0];
    const newState = !app.is_on;
    const newPower = newState ? app.rated_power_watts * (0.7 + Math.random() * 0.3) : 0;

    await query(
      'UPDATE appliances SET is_on = $1, current_power_watts = $2 WHERE id = $3',
      [newState, newPower, req.params.id]
    );

    // Log usage if turning off
    if (!newState && app.is_on) {
      // Calculate approximate usage duration (simulated)
      const durationMinutes = 15 + Math.random() * 120;
      const energyKwh = (app.current_power_watts / 1000) * (durationMinutes / 60);
      const hour = new Date().getHours();
      let rate = 6.50;
      let tariffType = 'standard';
      if (hour >= 22 || hour < 6) { rate = 4.50; tariffType = 'off_peak'; }
      else if ((hour >= 9 && hour < 12) || (hour >= 17 && hour < 22)) { rate = 10.00; tariffType = 'peak'; }

      await query(`
        INSERT INTO appliance_usage_logs (organization_id, appliance_id, user_id, started_at, ended_at,
          duration_minutes, energy_consumed_kwh, cost, carbon_kg, tariff_type)
        VALUES ($1,$2,$3, NOW() - ($4 || ' minutes')::INTERVAL, NOW(), $4, $5, $6, $7, $8)
      `, [req.tenantId, req.params.id, req.user.id, durationMinutes, energyKwh,
          energyKwh * rate, energyKwh * 0.82, tariffType]);
    }

    res.json({
      id: req.params.id,
      is_on: newState,
      current_power_watts: newPower,
      message: `Appliance ${newState ? 'turned ON' : 'turned OFF'}`,
    });
  } catch (err) { next(err); }
});

// ── PUT /api/appliances/:id/schedule ──
router.put('/:id/schedule', async (req, res, next) => {
  try {
    const { schedule } = req.body;
    // schedule format: { "monday": [{"start":"06:00","end":"08:00"}], ... }
    const result = await query(
      'UPDATE appliances SET schedule = $1 WHERE id = $2 AND organization_id = $3 RETURNING *',
      [JSON.stringify(schedule), req.params.id, req.tenantId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Appliance not found' });
    res.json({ message: 'Schedule updated', appliance: result.rows[0] });
  } catch (err) { next(err); }
});

// ── GET /api/appliances/:id/predicted-cost ──
router.get('/:id/predicted-cost', async (req, res, next) => {
  try {
    const app = await query(
      'SELECT a.*, tp.tod_rates, tp.flat_rate, tp.type as tariff_type FROM appliances a LEFT JOIN smart_meters sm ON sm.id = a.meter_id LEFT JOIN tariff_plans tp ON tp.id = sm.tariff_plan_id WHERE a.id = $1 AND a.organization_id = $2',
      [req.params.id, req.tenantId]
    );
    if (app.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const appliance = app.rows[0];
    const powerKw = appliance.rated_power_watts / 1000;
    const hours = parseFloat(req.query.hours || appliance.avg_daily_usage_hours || 1);

    // Calculate cost for different time slots
    const predictions = [];
    const todRates = appliance.tod_rates || [
      { name: 'Off-Peak Night', start: '22:00', end: '06:00', rate: 4.50 },
      { name: 'Standard', start: '06:00', end: '09:00', rate: 6.50 },
      { name: 'Peak Morning', start: '09:00', end: '12:00', rate: 9.00 },
      { name: 'Standard Afternoon', start: '12:00', end: '17:00', rate: 7.00 },
      { name: 'Peak Evening', start: '17:00', end: '22:00', rate: 10.50 },
    ];

    for (const slot of todRates) {
      const energyKwh = powerKw * hours;
      const cost = energyKwh * slot.rate;
      predictions.push({
        slot: slot.name,
        start: slot.start,
        end: slot.end,
        rate: slot.rate,
        energy_kwh: Math.round(energyKwh * 100) / 100,
        estimated_cost: Math.round(cost * 100) / 100,
        carbon_kg: Math.round(energyKwh * 0.82 * 100) / 100,
      });
    }

    const cheapest = predictions.reduce((a, b) => a.estimated_cost < b.estimated_cost ? a : b);
    const mostExpensive = predictions.reduce((a, b) => a.estimated_cost > b.estimated_cost ? a : b);

    res.json({
      appliance: appliance.name,
      power_kw: powerKw,
      duration_hours: hours,
      predictions,
      recommendation: {
        best_time: cheapest.slot,
        best_start: cheapest.start,
        best_cost: cheapest.estimated_cost,
        worst_time: mostExpensive.slot,
        worst_cost: mostExpensive.estimated_cost,
        potential_savings: Math.round((mostExpensive.estimated_cost - cheapest.estimated_cost) * 100) / 100,
      },
    });
  } catch (err) { next(err); }
});

// ── DELETE /api/appliances/:id ──
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query(
      'UPDATE appliances SET is_active = false WHERE id = $1 AND organization_id = $2 RETURNING id',
      [req.params.id, req.tenantId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Appliance removed' });
  } catch (err) { next(err); }
});

module.exports = router;
