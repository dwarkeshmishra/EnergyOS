const express = require('express');
const { query } = require('../config/database');
const { authenticate, tenantGuard } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);
router.use(tenantGuard);

// ── GET /api/billing/current ── Current month bill estimate
router.get('/current', async (req, res, next) => {
  try {
    const userId = req.user.role === 'user' ? req.user.id : (req.query.user_id || req.user.id);
    
    const result = await query(`
      SELECT
        COALESCE(SUM(er.energy_kwh), 0) AS total_kwh,
        COALESCE(SUM(er.cost), 0) AS total_cost,
        COALESCE(SUM(er.carbon_kg), 0) AS total_carbon,
        COALESCE(SUM(CASE WHEN er.tariff_type = 'peak' THEN er.energy_kwh ELSE 0 END), 0) AS peak_kwh,
        COALESCE(SUM(CASE WHEN er.tariff_type = 'off_peak' THEN er.energy_kwh ELSE 0 END), 0) AS off_peak_kwh,
        COALESCE(SUM(CASE WHEN er.tariff_type = 'standard' THEN er.energy_kwh ELSE 0 END), 0) AS standard_kwh,
        COALESCE(SUM(CASE WHEN er.tariff_type = 'peak' THEN er.cost ELSE 0 END), 0) AS peak_cost,
        COALESCE(SUM(CASE WHEN er.tariff_type = 'off_peak' THEN er.cost ELSE 0 END), 0) AS off_peak_cost
      FROM energy_readings er
      JOIN smart_meters sm ON sm.id = er.meter_id
      WHERE sm.user_id = $1 AND sm.organization_id = $2
        AND er.timestamp >= DATE_TRUNC('month', NOW())
    `, [userId, req.tenantId]);

    const bill = result.rows[0];
    const dayOfMonth = new Date().getDate();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const projectionFactor = daysInMonth / dayOfMonth;

    const fixedCharge = 100; // Base fixed charge
    const taxRate = 0.18;
    const energyCost = parseFloat(bill.total_cost);
    const taxAmount = energyCost * taxRate;
    const totalBill = energyCost + fixedCharge + taxAmount;
    const projectedBill = totalBill * projectionFactor;

    res.json({
      billing_period: {
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
        days_elapsed: dayOfMonth,
        days_remaining: daysInMonth - dayOfMonth,
      },
      consumption: {
        total_kwh: Math.round(parseFloat(bill.total_kwh) * 100) / 100,
        peak_kwh: Math.round(parseFloat(bill.peak_kwh) * 100) / 100,
        off_peak_kwh: Math.round(parseFloat(bill.off_peak_kwh) * 100) / 100,
        standard_kwh: Math.round(parseFloat(bill.standard_kwh) * 100) / 100,
      },
      cost_breakdown: {
        energy_charges: Math.round(energyCost * 100) / 100,
        peak_charges: Math.round(parseFloat(bill.peak_cost) * 100) / 100,
        off_peak_charges: Math.round(parseFloat(bill.off_peak_cost) * 100) / 100,
        fixed_charges: fixedCharge,
        tax: Math.round(taxAmount * 100) / 100,
        total: Math.round(totalBill * 100) / 100,
      },
      projection: {
        estimated_monthly_bill: Math.round(projectedBill * 100) / 100,
        estimated_monthly_kwh: Math.round(parseFloat(bill.total_kwh) * projectionFactor * 100) / 100,
      },
      carbon: {
        total_kg: Math.round(parseFloat(bill.total_carbon) * 100) / 100,
        trees_equivalent: Math.round(parseFloat(bill.total_carbon) / 21.77 * 10) / 10,
      },
    });
  } catch (err) { next(err); }
});

// ── GET /api/billing/history ──
router.get('/history', async (req, res, next) => {
  try {
    const userId = req.user.role === 'user' ? req.user.id : (req.query.user_id || null);
    
    let whereClause = 'br.organization_id = $1';
    const params = [req.tenantId];
    if (userId) {
      whereClause += ' AND br.user_id = $2';
      params.push(userId);
    }

    const result = await query(`
      SELECT br.*, u.first_name || ' ' || u.last_name AS user_name
      FROM billing_records br
      JOIN users u ON u.id = br.user_id
      WHERE ${whereClause}
      ORDER BY br.billing_period_start DESC
    `, params);

    res.json(result.rows);
  } catch (err) { next(err); }
});

// ── GET /api/billing/forecast ── 
router.get('/forecast', async (req, res, next) => {
  try {
    const userId = req.user.role === 'user' ? req.user.id : (req.query.user_id || req.user.id);

    // Get last 3 months average for forecasting
    const history = await query(`
      SELECT
        DATE_TRUNC('month', er.timestamp) AS month,
        SUM(er.energy_kwh) AS kwh,
        SUM(er.cost) AS cost
      FROM energy_readings er
      JOIN smart_meters sm ON sm.id = er.meter_id
      WHERE sm.user_id = $1 AND er.timestamp >= NOW() - INTERVAL '3 months'
      GROUP BY DATE_TRUNC('month', er.timestamp)
      ORDER BY month
    `, [userId]);

    const months = history.rows;
    const avgKwh = months.length > 0
      ? months.reduce((s, m) => s + parseFloat(m.kwh), 0) / months.length
      : 500;
    const avgCost = months.length > 0
      ? months.reduce((s, m) => s + parseFloat(m.cost), 0) / months.length
      : 3500;

    // Generate next 3 month forecast with seasonal adjustment
    const forecast = [];
    for (let i = 1; i <= 3; i++) {
      const futureMonth = new Date();
      futureMonth.setMonth(futureMonth.getMonth() + i);
      const monthIndex = futureMonth.getMonth();
      // Summer months (Apr-Sep) use more energy
      const seasonalFactor = [0.85, 0.85, 0.9, 1.1, 1.2, 1.3, 1.3, 1.2, 1.1, 0.95, 0.85, 0.8][monthIndex];
      
      forecast.push({
        month: futureMonth.toISOString().slice(0, 7),
        estimated_kwh: Math.round(avgKwh * seasonalFactor * 100) / 100,
        estimated_cost: Math.round(avgCost * seasonalFactor * 100) / 100,
        confidence: i === 1 ? 'high' : i === 2 ? 'medium' : 'low',
      });
    }

    // Budget alert
    const budget = 5000; // Default budget in INR
    const currentMonthProjection = forecast.length > 0 ? forecast[0].estimated_cost : avgCost;
    const budgetAlert = currentMonthProjection > budget;

    res.json({
      historical_average: {
        kwh: Math.round(avgKwh * 100) / 100,
        cost: Math.round(avgCost * 100) / 100,
      },
      forecast,
      budget: {
        monthly_budget: budget,
        projected_cost: Math.round(currentMonthProjection * 100) / 100,
        alert: budgetAlert,
        message: budgetAlert
          ? `Projected bill ₹${Math.round(currentMonthProjection)} exceeds budget of ₹${budget}`
          : 'Within budget',
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
