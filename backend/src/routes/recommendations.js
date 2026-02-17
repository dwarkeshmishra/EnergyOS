const express = require('express');
const { query } = require('../config/database');
const { authenticate, tenantGuard } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);
router.use(tenantGuard);

// ── GET /api/recommendations ──
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.role === 'user' ? req.user.id : (req.query.user_id || null);
    let whereClause = 'r.organization_id = $1';
    const params = [req.tenantId];

    if (userId) {
      whereClause += ` AND r.user_id = $${params.length + 1}`;
      params.push(userId);
    }

    const result = await query(`
      SELECT r.*, a.name AS appliance_name, a.type AS appliance_type,
             u.first_name || ' ' || u.last_name AS user_name
      FROM recommendations r
      LEFT JOIN appliances a ON a.id = r.appliance_id
      LEFT JOIN users u ON u.id = r.user_id
      WHERE ${whereClause}
      ORDER BY 
        CASE r.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
        r.created_at DESC
    `, params);

    res.json(result.rows);
  } catch (err) { next(err); }
});

// ── PUT /api/recommendations/:id ── (accept/dismiss)
router.put('/:id', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['accepted', 'dismissed', 'applied'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await query(`
      UPDATE recommendations SET status = $1
      WHERE id = $2 AND organization_id = $3 RETURNING *
    `, [status, req.params.id, req.tenantId]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// ── GET /api/recommendations/generate ── Generate fresh AI recommendations
router.get('/generate', async (req, res, next) => {
  try {
    const userId = req.user.role === 'user' ? req.user.id : (req.query.user_id || req.user.id);

    // Get user's appliances and usage patterns
    const appliances = await query(`
      SELECT a.*, 
        COALESCE((SELECT SUM(aul.energy_consumed_kwh) FROM appliance_usage_logs aul 
          WHERE aul.appliance_id = a.id AND aul.started_at >= NOW() - INTERVAL '7 days'), 0) AS weekly_kwh,
        COALESCE((SELECT SUM(aul.cost) FROM appliance_usage_logs aul 
          WHERE aul.appliance_id = a.id AND aul.started_at >= NOW() - INTERVAL '7 days'), 0) AS weekly_cost
      FROM appliances a
      WHERE a.user_id = $1 AND a.organization_id = $2 AND a.is_active = true
    `, [userId, req.tenantId]);

    // Get peak usage patterns
    const peakUsage = await query(`
      SELECT EXTRACT(HOUR FROM er.timestamp) AS hour,
        SUM(er.energy_kwh) AS kwh, SUM(er.cost) AS cost
      FROM energy_readings er
      JOIN smart_meters sm ON sm.id = er.meter_id
      WHERE sm.user_id = $1 AND er.timestamp >= NOW() - INTERVAL '7 days'
      GROUP BY EXTRACT(HOUR FROM er.timestamp)
      ORDER BY cost DESC
    `, [userId]);

    const recommendations = [];
    const peakHours = peakUsage.rows.filter(p => parseInt(p.hour) >= 17 && parseInt(p.hour) < 22);
    const peakKwh = peakHours.reduce((s, p) => s + parseFloat(p.kwh), 0);
    const totalKwh = peakUsage.rows.reduce((s, p) => s + parseFloat(p.kwh), 0);
    const peakPercent = totalKwh > 0 ? (peakKwh / totalKwh) * 100 : 0;

    // Generate recommendations based on analysis
    for (const app of appliances.rows) {
      const weeklyKwh = parseFloat(app.weekly_kwh);
      const powerKw = parseFloat(app.rated_power_watts) / 1000;

      // High-consumption appliances during peak
      if (powerKw > 1 && weeklyKwh > 10) {
        const offPeakSaving = weeklyKwh * (10.50 - 4.50) / 7 * 30;
        recommendations.push({
          type: 'schedule_shift',
          title: `Shift ${app.name} to Off-Peak Hours`,
          description: `Running your ${app.name} (${app.rated_power_watts}W) during off-peak hours (10 PM - 6 AM) instead of peak hours can save approximately ₹${Math.round(offPeakSaving)}/month. Off-peak rates are ₹4.50/kWh compared to ₹10.50/kWh during peak.`,
          potential_savings_kwh: 0,
          potential_savings_cost: Math.round(offPeakSaving),
          potential_carbon_reduction: 0,
          priority: offPeakSaving > 300 ? 'high' : 'medium',
          appliance_id: app.id,
        });
      }

      // EV charger optimization
      if (app.type === 'ev_charger') {
        recommendations.push({
          type: 'schedule_shift',
          title: 'Schedule EV Charging for Night Hours',
          description: `Schedule your EV charger to run between 11 PM - 5 AM at ₹4.50/kWh. This can save ₹${Math.round(powerKw * 4 * (10.50 - 4.50) * 30)}/month compared to evening charging.`,
          potential_savings_kwh: powerKw * 4 * 30,
          potential_savings_cost: Math.round(powerKw * 4 * (10.50 - 4.50) * 30),
          potential_carbon_reduction: 0,
          priority: 'high',
          appliance_id: app.id,
        });
      }

      // AC optimization
      if (app.type === 'ac' && weeklyKwh > 20) {
        recommendations.push({
          type: 'usage_reduction',
          title: 'Optimize AC Temperature Settings',
          description: `Raising your AC thermostat by 2°C can reduce consumption by 15%. Estimated saving: ₹${Math.round(weeklyKwh * 0.15 * 7 * 4.3)}/month. Set AC to 24°C for optimal comfort and efficiency.`,
          potential_savings_kwh: weeklyKwh * 0.15 * 4.3,
          potential_savings_cost: Math.round(weeklyKwh * 0.15 * 7 * 4.3),
          potential_carbon_reduction: weeklyKwh * 0.15 * 0.82 * 4.3,
          priority: 'medium',
          appliance_id: app.id,
        });
      }
    }

    // Peak usage warning
    if (peakPercent > 40) {
      recommendations.push({
        type: 'peak_avoidance',
        title: 'Reduce Peak Hour Energy Usage',
        description: `${Math.round(peakPercent)}% of your energy is consumed during peak hours (5-10 PM) at highest rates. Shifting even 20% of peak consumption to off-peak can save ₹${Math.round(peakKwh * 0.2 * 6 * 4.3)}/month.`,
        potential_savings_kwh: peakKwh * 0.2 * 4.3,
        potential_savings_cost: Math.round(peakKwh * 0.2 * 6 * 4.3),
        potential_carbon_reduction: peakKwh * 0.2 * 0.82 * 4.3,
        priority: 'high',
        appliance_id: null,
      });
    }

    // Carbon footprint recommendation
    const monthlyCarbon = totalKwh * 0.82 * 4.3;
    if (monthlyCarbon > 100) {
      recommendations.push({
        type: 'carbon_reduction',
        title: 'Reduce Your Carbon Footprint',
        description: `Your estimated monthly carbon footprint is ${Math.round(monthlyCarbon)} kg CO₂. Reducing consumption by 10% would save ${Math.round(monthlyCarbon * 0.1)} kg CO₂, equivalent to planting ${Math.round(monthlyCarbon * 0.1 / 21.77)} trees.`,
        potential_savings_kwh: totalKwh * 0.1 * 4.3,
        potential_savings_cost: 0,
        potential_carbon_reduction: monthlyCarbon * 0.1,
        priority: 'medium',
        appliance_id: null,
      });
    }

    // Store generated recommendations
    for (const rec of recommendations) {
      await query(`
        INSERT INTO recommendations (organization_id, user_id, appliance_id, type, title, description,
          potential_savings_kwh, potential_savings_cost, potential_carbon_reduction, priority)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT DO NOTHING
      `, [req.tenantId, userId, rec.appliance_id, rec.type, rec.title, rec.description,
          rec.potential_savings_kwh, rec.potential_savings_cost, rec.potential_carbon_reduction, rec.priority]);
    }

    res.json({
      generated: recommendations.length,
      recommendations,
      analysis: {
        peak_usage_percent: Math.round(peakPercent),
        total_weekly_kwh: Math.round(totalKwh * 100) / 100,
        appliances_analyzed: appliances.rows.length,
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
