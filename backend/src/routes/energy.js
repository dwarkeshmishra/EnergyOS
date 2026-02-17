const express = require('express');
const { query } = require('../config/database');
const { authenticate, tenantGuard } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);
router.use(tenantGuard);

// ── GET /api/energy/realtime ── Current power & today's summary
router.get('/realtime', async (req, res, next) => {
  try {
    let meterWhere = 'sm.organization_id = $1';
    const params = [req.tenantId];
    if (req.user.role === 'user') {
      meterWhere += ' AND sm.user_id = $2';
      params.push(req.user.id);
    }

    // Today's readings
    const today = await query(`
      SELECT 
        COALESCE(SUM(er.energy_kwh), 0) AS today_kwh,
        COALESCE(SUM(er.cost), 0) AS today_cost,
        COALESCE(SUM(er.carbon_kg), 0) AS today_carbon,
        COALESCE(AVG(er.power_watts), 0) AS avg_power_watts,
        COALESCE(MAX(er.power_watts), 0) AS peak_power_watts
      FROM energy_readings er
      JOIN smart_meters sm ON sm.id = er.meter_id
      WHERE ${meterWhere} AND er.timestamp >= DATE_TRUNC('day', NOW())
    `, params);

    // Current power from latest readings per meter
    const current = await query(`
      SELECT DISTINCT ON (er.meter_id)
        er.meter_id, er.power_watts, er.voltage, er.current_amps,
        er.energy_kwh, er.timestamp, sm.meter_serial
      FROM energy_readings er
      JOIN smart_meters sm ON sm.id = er.meter_id
      WHERE ${meterWhere}
      ORDER BY er.meter_id, er.timestamp DESC
    `, params);

    const totalCurrentPower = current.rows.reduce((sum, r) => sum + parseFloat(r.power_watts || 0), 0);

    res.json({
      current_power_watts: Math.round(totalCurrentPower),
      current_power_kw: Math.round(totalCurrentPower / 10) / 100,
      today_kwh: Math.round(parseFloat(today.rows[0].today_kwh) * 100) / 100,
      today_cost: Math.round(parseFloat(today.rows[0].today_cost) * 100) / 100,
      today_carbon_kg: Math.round(parseFloat(today.rows[0].today_carbon) * 100) / 100,
      avg_power_watts: Math.round(parseFloat(today.rows[0].avg_power_watts)),
      peak_power_watts: Math.round(parseFloat(today.rows[0].peak_power_watts)),
      meters: current.rows,
      timestamp: new Date().toISOString(),
    });
  } catch (err) { next(err); }
});

// ── GET /api/energy/hourly ── Hourly usage for charts
router.get('/hourly', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 1;
    let meterWhere = 'sm.organization_id = $1';
    const params = [req.tenantId, days];
    if (req.user.role === 'user') {
      meterWhere += ' AND sm.user_id = $3';
      params.push(req.user.id);
    }

    const result = await query(`
      SELECT 
        DATE_TRUNC('hour', er.timestamp) AS hour,
        SUM(er.energy_kwh) AS kwh,
        SUM(er.cost) AS cost,
        SUM(er.carbon_kg) AS carbon,
        AVG(er.power_watts) AS avg_power,
        MAX(er.power_watts) AS peak_power,
        MAX(er.tariff_type) AS tariff_type
      FROM energy_readings er
      JOIN smart_meters sm ON sm.id = er.meter_id
      WHERE ${meterWhere} AND er.timestamp >= NOW() - ($2 || ' days')::INTERVAL
      GROUP BY DATE_TRUNC('hour', er.timestamp)
      ORDER BY hour
    `, params);

    res.json(result.rows);
  } catch (err) { next(err); }
});

// ── GET /api/energy/daily ── Daily aggregations
router.get('/daily', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    let meterWhere = 'sm.organization_id = $1';
    const params = [req.tenantId, days];
    if (req.user.role === 'user') {
      meterWhere += ' AND sm.user_id = $3';
      params.push(req.user.id);
    }

    const result = await query(`
      SELECT 
        DATE(er.timestamp) AS date,
        SUM(er.energy_kwh) AS kwh,
        SUM(er.cost) AS cost,
        SUM(er.carbon_kg) AS carbon,
        AVG(er.power_watts) AS avg_power,
        MAX(er.power_watts) AS peak_power,
        SUM(CASE WHEN er.tariff_type = 'peak' THEN er.energy_kwh ELSE 0 END) AS peak_kwh,
        SUM(CASE WHEN er.tariff_type = 'off_peak' THEN er.energy_kwh ELSE 0 END) AS off_peak_kwh,
        SUM(CASE WHEN er.tariff_type = 'standard' THEN er.energy_kwh ELSE 0 END) AS standard_kwh
      FROM energy_readings er
      JOIN smart_meters sm ON sm.id = er.meter_id
      WHERE ${meterWhere} AND er.timestamp >= NOW() - ($2 || ' days')::INTERVAL
      GROUP BY DATE(er.timestamp)
      ORDER BY date
    `, params);

    res.json(result.rows);
  } catch (err) { next(err); }
});

// ── GET /api/energy/monthly ── Monthly comparison
router.get('/monthly', async (req, res, next) => {
  try {
    let meterWhere = 'sm.organization_id = $1';
    const params = [req.tenantId];
    if (req.user.role === 'user') {
      meterWhere += ' AND sm.user_id = $2';
      params.push(req.user.id);
    }

    const result = await query(`
      SELECT 
        DATE_TRUNC('month', er.timestamp) AS month,
        SUM(er.energy_kwh) AS kwh,
        SUM(er.cost) AS cost,
        SUM(er.carbon_kg) AS carbon,
        COUNT(DISTINCT er.meter_id) AS meter_count
      FROM energy_readings er
      JOIN smart_meters sm ON sm.id = er.meter_id
      WHERE ${meterWhere} AND er.timestamp >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', er.timestamp)
      ORDER BY month
    `, params);

    // Calculate month-over-month change
    const months = result.rows;
    if (months.length >= 2) {
      const current = months[months.length - 1];
      const previous = months[months.length - 2];
      const changePercent = ((parseFloat(current.kwh) - parseFloat(previous.kwh)) / parseFloat(previous.kwh)) * 100;

      res.json({
        months,
        comparison: {
          current_month_kwh: parseFloat(current.kwh),
          previous_month_kwh: parseFloat(previous.kwh),
          change_percent: Math.round(changePercent * 10) / 10,
          current_month_cost: parseFloat(current.cost),
          previous_month_cost: parseFloat(previous.cost),
        },
      });
    } else {
      res.json({ months, comparison: null });
    }
  } catch (err) { next(err); }
});

// ── GET /api/energy/summary ── Dashboard summary
router.get('/summary', async (req, res, next) => {
  try {
    let meterWhere = 'sm.organization_id = $1';
    const params = [req.tenantId];
    if (req.user.role === 'user') {
      meterWhere += ' AND sm.user_id = $2';
      params.push(req.user.id);
    }

    // This month
    const thisMonth = await query(`
      SELECT COALESCE(SUM(er.energy_kwh),0) AS kwh, COALESCE(SUM(er.cost),0) AS cost,
             COALESCE(SUM(er.carbon_kg),0) AS carbon
      FROM energy_readings er JOIN smart_meters sm ON sm.id = er.meter_id
      WHERE ${meterWhere} AND er.timestamp >= DATE_TRUNC('month', NOW())
    `, params);

    // Last month
    const lastMonth = await query(`
      SELECT COALESCE(SUM(er.energy_kwh),0) AS kwh, COALESCE(SUM(er.cost),0) AS cost,
             COALESCE(SUM(er.carbon_kg),0) AS carbon
      FROM energy_readings er JOIN smart_meters sm ON sm.id = er.meter_id
      WHERE ${meterWhere}
        AND er.timestamp >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
        AND er.timestamp < DATE_TRUNC('month', NOW())
    `, params);

    // Active appliances
    const appliances = await query(`
      SELECT COUNT(*) AS total, SUM(CASE WHEN is_on THEN 1 ELSE 0 END) AS active,
             SUM(CASE WHEN is_on THEN current_power_watts ELSE 0 END) AS total_power
      FROM appliances WHERE organization_id = $1 ${req.user.role === 'user' ? 'AND user_id = $2' : ''} AND is_active = true
    `, params);

    // Budget estimation (project to end of month)
    const dayOfMonth = new Date().getDate();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const projectedCost = (parseFloat(thisMonth.rows[0].cost) / dayOfMonth) * daysInMonth;

    const thisKwh = parseFloat(thisMonth.rows[0].kwh);
    const lastKwh = parseFloat(lastMonth.rows[0].kwh);
    const savingsPercent = lastKwh > 0 ? ((lastKwh - thisKwh * (daysInMonth / dayOfMonth)) / lastKwh) * 100 : 0;

    res.json({
      this_month: {
        kwh: Math.round(thisKwh * 100) / 100,
        cost: Math.round(parseFloat(thisMonth.rows[0].cost) * 100) / 100,
        carbon_kg: Math.round(parseFloat(thisMonth.rows[0].carbon) * 100) / 100,
      },
      last_month: {
        kwh: Math.round(lastKwh * 100) / 100,
        cost: Math.round(parseFloat(lastMonth.rows[0].cost) * 100) / 100,
        carbon_kg: Math.round(parseFloat(lastMonth.rows[0].carbon) * 100) / 100,
      },
      projected_monthly_cost: Math.round(projectedCost * 100) / 100,
      savings_indicator: Math.round(savingsPercent * 10) / 10,
      appliances: {
        total: parseInt(appliances.rows[0].total) || 0,
        active: parseInt(appliances.rows[0].active) || 0,
        total_power_watts: parseFloat(appliances.rows[0].total_power) || 0,
      },
    });
  } catch (err) { next(err); }
});

// ── GET /api/energy/export ── CSV export
router.get('/export', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    let meterWhere = 'sm.organization_id = $1';
    const params = [req.tenantId, days];
    if (req.user.role === 'user') {
      meterWhere += ' AND sm.user_id = $3';
      params.push(req.user.id);
    }

    const result = await query(`
      SELECT er.timestamp, sm.meter_serial, er.power_watts, er.energy_kwh,
             er.voltage, er.current_amps, er.cost, er.carbon_kg, er.tariff_type
      FROM energy_readings er
      JOIN smart_meters sm ON sm.id = er.meter_id
      WHERE ${meterWhere} AND er.timestamp >= NOW() - ($2 || ' days')::INTERVAL
      ORDER BY er.timestamp DESC
    `, params);

    // Generate CSV
    const headers = 'Timestamp,Meter Serial,Power (W),Energy (kWh),Voltage (V),Current (A),Cost (₹),Carbon (kg),Tariff Type\n';
    const csv = headers + result.rows.map(r =>
      `${r.timestamp},${r.meter_serial},${r.power_watts},${r.energy_kwh},${r.voltage},${r.current_amps},${r.cost},${r.carbon_kg},${r.tariff_type}`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=energy_report_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (err) { next(err); }
});

module.exports = router;
