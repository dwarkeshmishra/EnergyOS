const express = require('express');
const { query } = require('../config/database');
const { authenticate, authorize, tenantGuard } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);
router.use(authorize('super_admin', 'tenant_admin'));
router.use(tenantGuard);

// ── GET /api/analytics/overview ──
router.get('/overview', async (req, res, next) => {
  try {
    const isSuperAdmin = req.user.role === 'super_admin';
    const orgFilter = isSuperAdmin ? '' : 'WHERE organization_id = $1';
    const params = isSuperAdmin ? [] : [req.tenantId];

    // Org count
    const orgs = await query(`SELECT COUNT(*) FROM organizations ${orgFilter}`, params);
    const users = await query(`SELECT COUNT(*) FROM users ${orgFilter}`, params);
    const meters = await query(`SELECT COUNT(*) FROM smart_meters ${orgFilter}`, params);
    const onlineMeters = await query(
      `SELECT COUNT(*) FROM smart_meters ${orgFilter ? orgFilter + " AND" : "WHERE"} status = 'online'`,
      params
    );

    // Revenue this month
    const revenue = await query(`
      SELECT COALESCE(SUM(er.cost), 0) AS total
      FROM energy_readings er
      ${isSuperAdmin ? '' : 'JOIN smart_meters sm ON sm.id = er.meter_id'}
      WHERE er.timestamp >= DATE_TRUNC('month', NOW())
      ${isSuperAdmin ? '' : 'AND sm.organization_id = $1'}
    `, params);

    // Energy this month
    const energy = await query(`
      SELECT COALESCE(SUM(er.energy_kwh), 0) AS total
      FROM energy_readings er
      ${isSuperAdmin ? '' : 'JOIN smart_meters sm ON sm.id = er.meter_id'}
      WHERE er.timestamp >= DATE_TRUNC('month', NOW())  
      ${isSuperAdmin ? '' : 'AND sm.organization_id = $1'}
    `, params);

    res.json({
      organizations: parseInt(orgs.rows[0].count),
      users: parseInt(users.rows[0].count),
      meters: {
        total: parseInt(meters.rows[0].count),
        online: parseInt(onlineMeters.rows[0].count),
      },
      this_month: {
        revenue: Math.round(parseFloat(revenue.rows[0].total) * 100) / 100,
        energy_kwh: Math.round(parseFloat(energy.rows[0].total) * 100) / 100,
      },
    });
  } catch (err) { next(err); }
});

// ── GET /api/analytics/peak-load ──
router.get('/peak-load', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 7;
    let meterWhere = '';
    const params = [days];
    if (req.user.role !== 'super_admin') {
      meterWhere = 'AND sm.organization_id = $2';
      params.push(req.tenantId);
    }

    const result = await query(`
      SELECT
        EXTRACT(HOUR FROM er.timestamp) AS hour,
        AVG(er.power_watts) AS avg_power,
        MAX(er.power_watts) AS peak_power,
        SUM(er.energy_kwh) AS total_kwh,
        SUM(er.cost) AS total_cost
      FROM energy_readings er
      JOIN smart_meters sm ON sm.id = er.meter_id
      WHERE er.timestamp >= NOW() - ($1 || ' days')::INTERVAL ${meterWhere}
      GROUP BY EXTRACT(HOUR FROM er.timestamp)
      ORDER BY hour
    `, params);

    const peakHour = result.rows.reduce((max, r) =>
      parseFloat(r.peak_power) > parseFloat(max.peak_power) ? r : max,
      result.rows[0] || { hour: 0, peak_power: 0 }
    );

    res.json({
      hourly_profile: result.rows,
      peak_hour: parseInt(peakHour.hour),
      peak_demand_watts: Math.round(parseFloat(peakHour.peak_power)),
    });
  } catch (err) { next(err); }
});

// ── GET /api/analytics/revenue ──
router.get('/revenue', async (req, res, next) => {
  try {
    let orgWhere = '';
    const params = [];
    if (req.user.role !== 'super_admin') {
      orgWhere = 'AND sm.organization_id = $1';
      params.push(req.tenantId);
    }

    const result = await query(`
      SELECT
        DATE_TRUNC('month', er.timestamp) AS month,
        SUM(er.cost) AS revenue,
        SUM(er.energy_kwh) AS energy_kwh,
        COUNT(DISTINCT er.meter_id) AS active_meters
      FROM energy_readings er
      JOIN smart_meters sm ON sm.id = er.meter_id
      WHERE er.timestamp >= NOW() - INTERVAL '12 months' ${orgWhere}
      GROUP BY DATE_TRUNC('month', er.timestamp)
      ORDER BY month
    `, params);

    res.json(result.rows);
  } catch (err) { next(err); }
});

// ── GET /api/analytics/demand-response ──
router.get('/demand-response', async (req, res, next) => {
  try {
    const params = [];
    let orgWhere = '';
    if (req.user.role !== 'super_admin') {
      orgWhere = 'AND sm.organization_id = $1';
      params.push(req.tenantId);
    }

    // Peak vs off-peak distribution
    const result = await query(`
      SELECT
        er.tariff_type,
        SUM(er.energy_kwh) AS total_kwh,
        SUM(er.cost) AS total_cost,
        COUNT(*) AS reading_count
      FROM energy_readings er
      JOIN smart_meters sm ON sm.id = er.meter_id
      WHERE er.timestamp >= DATE_TRUNC('month', NOW()) ${orgWhere}
      GROUP BY er.tariff_type
    `, params);

    const total = result.rows.reduce((s, r) => s + parseFloat(r.total_kwh), 0);
    const distribution = result.rows.map(r => ({
      ...r,
      percentage: total > 0 ? Math.round((parseFloat(r.total_kwh) / total) * 1000) / 10 : 0,
    }));

    res.json({
      distribution,
      total_kwh: Math.round(total * 100) / 100,
      peak_ratio: distribution.find(d => d.tariff_type === 'peak')?.percentage || 0,
    });
  } catch (err) { next(err); }
});

// ── GET /api/analytics/tenant-comparison ── (Super Admin)
router.get('/tenant-comparison', authorize('super_admin'), async (req, res, next) => {
  try {
    const result = await query(`
      SELECT
        o.id, o.name, o.type,
        COUNT(DISTINCT sm.id) AS meter_count,
        COUNT(DISTINCT u.id) AS user_count,
        COALESCE(SUM(er.energy_kwh), 0) AS month_kwh,
        COALESCE(SUM(er.cost), 0) AS month_revenue
      FROM organizations o
      LEFT JOIN smart_meters sm ON sm.organization_id = o.id
      LEFT JOIN users u ON u.organization_id = o.id
      LEFT JOIN energy_readings er ON er.organization_id = o.id
        AND er.timestamp >= DATE_TRUNC('month', NOW())
      GROUP BY o.id, o.name, o.type
      ORDER BY month_revenue DESC
    `);

    res.json(result.rows);
  } catch (err) { next(err); }
});

module.exports = router;
