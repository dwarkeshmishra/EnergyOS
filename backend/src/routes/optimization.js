const express = require('express');
const { query } = require('../config/database');
const { authenticate, tenantGuard } = require('../middleware/auth');
const ai = require('../services/aiOptimization');

const router = express.Router();
router.use(authenticate);
router.use(tenantGuard);

// ── GET /api/optimization/current-rate ──
router.get('/current-rate', (req, res) => {
  const hour = new Date().getHours();
  const slot = ai.getCurrentRate(hour);
  res.json({
    current_hour: hour,
    rate: slot.rate,
    type: slot.type,
    slot_name: slot.name,
    all_rates: ai.DEFAULT_TOD_RATES,
  });
});

// ── GET /api/optimization/cheapest-slots ──
router.get('/cheapest-slots', (req, res) => {
  const duration = parseFloat(req.query.duration) || 1;
  const result = ai.findCheapestSlots(duration);
  res.json(result);
});

// ── GET /api/optimization/predict-bill ──
router.get('/predict-bill', async (req, res, next) => {
  try {
    const userId = req.user.role === 'user' ? req.user.id : (req.query.user_id || req.user.id);
    const prediction = await ai.predictMonthlyBill(userId, req.tenantId);
    res.json(prediction);
  } catch (err) { next(err); }
});

// ── GET /api/optimization/appliance-savings/:applianceId ──
router.get('/appliance-savings/:applianceId', async (req, res, next) => {
  try {
    const app = await query(
      'SELECT * FROM appliances WHERE id = $1 AND organization_id = $2',
      [req.params.applianceId, req.tenantId]
    );
    if (app.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const appliance = app.rows[0];
    const savings = ai.calculateSchedulingSavings(
      parseFloat(appliance.rated_power_watts),
      parseFloat(appliance.avg_daily_usage_hours)
    );

    res.json({ appliance: appliance.name, ...savings });
  } catch (err) { next(err); }
});

// ── GET /api/optimization/patterns ──
router.get('/patterns', async (req, res, next) => {
  try {
    const userId = req.user.role === 'user' ? req.user.id : (req.query.user_id || req.user.id);
    const patterns = await ai.detectExpensivePatterns(userId, req.tenantId);
    res.json({ patterns, analyzed_period: '14 days' });
  } catch (err) { next(err); }
});

// ── GET /api/optimization/tod-comparison ──
router.get('/tod-comparison', async (req, res, next) => {
  try {
    const userId = req.user.role === 'user' ? req.user.id : (req.query.user_id || req.user.id);

    const result = await query(`
      SELECT
        er.tariff_type,
        SUM(er.energy_kwh) AS kwh,
        SUM(er.cost) AS cost,
        COUNT(*) AS readings
      FROM energy_readings er
      JOIN smart_meters sm ON sm.id = er.meter_id
      WHERE sm.user_id = $1 AND er.timestamp >= DATE_TRUNC('month', NOW())
      GROUP BY er.tariff_type
    `, [userId]);

    const totalKwh = result.rows.reduce((s, r) => s + parseFloat(r.kwh), 0);
    const totalCost = result.rows.reduce((s, r) => s + parseFloat(r.cost), 0);

    // What if all off-peak?
    const allOffPeakCost = totalKwh * 4.50;
    const allPeakCost = totalKwh * 10.50;

    res.json({
      breakdown: result.rows.map(r => ({
        tariff_type: r.tariff_type,
        kwh: Math.round(parseFloat(r.kwh) * 100) / 100,
        cost: Math.round(parseFloat(r.cost) * 100) / 100,
        percentage: totalKwh > 0 ? Math.round((parseFloat(r.kwh) / totalKwh) * 1000) / 10 : 0,
      })),
      summary: {
        total_kwh: Math.round(totalKwh * 100) / 100,
        total_cost: Math.round(totalCost * 100) / 100,
        if_all_off_peak: Math.round(allOffPeakCost * 100) / 100,
        if_all_peak: Math.round(allPeakCost * 100) / 100,
        potential_max_savings: Math.round((totalCost - allOffPeakCost) * 100) / 100,
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
