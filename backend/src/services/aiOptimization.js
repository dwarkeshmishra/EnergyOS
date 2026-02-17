/**
 * AI Optimization Engine
 * - Time-of-Day pricing model
 * - Bill prediction based on historical usage
 * - Smart scheduling recommendations
 * - Carbon footprint calculations
 * - Peak avoidance strategies
 */

const { query } = require('../config/database');

// ── ToD Tariff Definitions ──
const DEFAULT_TOD_RATES = [
  { name: 'Off-Peak Night', start: '22:00', end: '06:00', rate: 4.50, type: 'off_peak' },
  { name: 'Standard Morning', start: '06:00', end: '09:00', rate: 6.50, type: 'standard' },
  { name: 'Peak Morning', start: '09:00', end: '12:00', rate: 9.00, type: 'peak' },
  { name: 'Standard Afternoon', start: '12:00', end: '17:00', rate: 7.00, type: 'standard' },
  { name: 'Peak Evening', start: '17:00', end: '22:00', rate: 10.50, type: 'peak' },
];

const CARBON_FACTOR = 0.82; // kg CO₂ per kWh (India grid average)

/**
 * Get current tariff rate based on time of day
 */
function getCurrentRate(hour, todRates = DEFAULT_TOD_RATES) {
  const timeStr = `${String(hour).padStart(2, '0')}:00`;
  for (const slot of todRates) {
    if (slot.start > slot.end) {
      // Overnight slot
      if (timeStr >= slot.start || timeStr < slot.end) return slot;
    } else {
      if (timeStr >= slot.start && timeStr < slot.end) return slot;
    }
  }
  return { rate: 6.50, type: 'standard', name: 'Default' };
}

/**
 * Find the cheapest time slots for running an appliance
 */
function findCheapestSlots(durationHours, todRates = DEFAULT_TOD_RATES) {
  // Create 24 hourly slots with rates
  const hourlyRates = [];
  for (let h = 0; h < 24; h++) {
    const slot = getCurrentRate(h, todRates);
    hourlyRates.push({ hour: h, rate: slot.rate, type: slot.type, name: slot.name });
  }

  // Find optimal start time (consecutive hours with lowest total cost)
  let bestStart = 0;
  let bestCost = Infinity;
  const duration = Math.ceil(durationHours);

  for (let start = 0; start < 24; start++) {
    let totalCost = 0;
    for (let i = 0; i < duration; i++) {
      const hourIndex = (start + i) % 24;
      totalCost += hourlyRates[hourIndex].rate;
    }
    if (totalCost < bestCost) {
      bestCost = totalCost;
      bestStart = start;
    }
  }

  // Also find worst time for comparison
  let worstStart = 0;
  let worstCost = 0;
  for (let start = 0; start < 24; start++) {
    let totalCost = 0;
    for (let i = 0; i < duration; i++) {
      const hourIndex = (start + i) % 24;
      totalCost += hourlyRates[hourIndex].rate;
    }
    if (totalCost > worstCost) {
      worstCost = totalCost;
      worstStart = start;
    }
  }

  return {
    best_start_hour: bestStart,
    best_start_time: `${String(bestStart).padStart(2, '0')}:00`,
    best_end_time: `${String((bestStart + duration) % 24).padStart(2, '0')}:00`,
    best_cost_per_kwh: bestCost / duration,
    worst_start_hour: worstStart,
    worst_cost_per_kwh: worstCost / duration,
    savings_per_kwh: (worstCost - bestCost) / duration,
    hourly_rates: hourlyRates,
  };
}

/**
 * Predict monthly bill based on historical patterns
 */
async function predictMonthlyBill(userId, organizationId) {
  // Get last 30 days of data
  const result = await query(`
    SELECT DATE(er.timestamp) AS date, SUM(er.energy_kwh) AS kwh, SUM(er.cost) AS cost
    FROM energy_readings er
    JOIN smart_meters sm ON sm.id = er.meter_id
    WHERE sm.user_id = $1 AND sm.organization_id = $2
      AND er.timestamp >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(er.timestamp) ORDER BY date
  `, [userId, organizationId]);

  const days = result.rows;
  if (days.length === 0) {
    return { predicted_kwh: 0, predicted_cost: 0, confidence: 'none' };
  }

  const totalKwh = days.reduce((s, d) => s + parseFloat(d.kwh), 0);
  const totalCost = days.reduce((s, d) => s + parseFloat(d.cost), 0);
  const avgDailyKwh = totalKwh / days.length;
  const avgDailyCost = totalCost / days.length;

  // Simple seasonal adjustment
  const month = new Date().getMonth();
  const seasonalFactors = [0.85, 0.85, 0.9, 1.1, 1.2, 1.3, 1.3, 1.2, 1.1, 0.95, 0.85, 0.8];
  const factor = seasonalFactors[month];

  const daysInMonth = new Date(new Date().getFullYear(), month + 1, 0).getDate();
  const predictedKwh = avgDailyKwh * daysInMonth * factor;
  const predictedCost = avgDailyCost * daysInMonth * factor;

  // Confidence based on data availability
  const confidence = days.length >= 25 ? 'high' : days.length >= 14 ? 'medium' : 'low';

  // Trend analysis
  const firstHalf = days.slice(0, Math.floor(days.length / 2));
  const secondHalf = days.slice(Math.floor(days.length / 2));
  const firstAvg = firstHalf.reduce((s, d) => s + parseFloat(d.kwh), 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((s, d) => s + parseFloat(d.kwh), 0) / secondHalf.length;
  const trend = secondAvg > firstAvg ? 'increasing' : secondAvg < firstAvg ? 'decreasing' : 'stable';

  return {
    predicted_kwh: Math.round(predictedKwh * 100) / 100,
    predicted_cost: Math.round(predictedCost * 100) / 100,
    predicted_carbon_kg: Math.round(predictedKwh * CARBON_FACTOR * 100) / 100,
    daily_average_kwh: Math.round(avgDailyKwh * 100) / 100,
    daily_average_cost: Math.round(avgDailyCost * 100) / 100,
    trend,
    confidence,
    data_points: days.length,
  };
}

/**
 * Calculate potential savings from scheduling optimization
 */
function calculateSchedulingSavings(appliancePowerWatts, dailyHours, todRates = DEFAULT_TOD_RATES) {
  const powerKw = appliancePowerWatts / 1000;
  const dailyKwh = powerKw * dailyHours;
  
  const slots = findCheapestSlots(dailyHours, todRates);
  
  // Current cost assumption: running at average rate
  const avgRate = todRates.reduce((s, r) => s + r.rate, 0) / todRates.length;
  const currentMonthlyCost = dailyKwh * avgRate * 30;
  
  // Optimized cost: running at cheapest slot
  const optimizedMonthlyCost = dailyKwh * slots.best_cost_per_kwh * 30;
  
  // Worst case cost: running at most expensive
  const worstMonthlyCost = dailyKwh * slots.worst_cost_per_kwh * 30;

  return {
    daily_kwh: Math.round(dailyKwh * 100) / 100,
    monthly_kwh: Math.round(dailyKwh * 30 * 100) / 100,
    current_estimated_monthly: Math.round(currentMonthlyCost * 100) / 100,
    optimized_monthly: Math.round(optimizedMonthlyCost * 100) / 100,
    worst_case_monthly: Math.round(worstMonthlyCost * 100) / 100,
    potential_monthly_savings: Math.round((currentMonthlyCost - optimizedMonthlyCost) * 100) / 100,
    max_possible_savings: Math.round((worstMonthlyCost - optimizedMonthlyCost) * 100) / 100,
    best_run_time: slots.best_start_time,
    carbon_monthly_kg: Math.round(dailyKwh * 30 * CARBON_FACTOR * 100) / 100,
  };
}

/**
 * Detect expensive usage patterns
 */
async function detectExpensivePatterns(userId, organizationId) {
  const result = await query(`
    SELECT
      EXTRACT(HOUR FROM er.timestamp) AS hour,
      EXTRACT(DOW FROM er.timestamp) AS day_of_week,
      SUM(er.energy_kwh) AS kwh,
      SUM(er.cost) AS cost,
      AVG(er.power_watts) AS avg_power
    FROM energy_readings er
    JOIN smart_meters sm ON sm.id = er.meter_id
    WHERE sm.user_id = $1 AND sm.organization_id = $2
      AND er.timestamp >= NOW() - INTERVAL '14 days'
    GROUP BY EXTRACT(HOUR FROM er.timestamp), EXTRACT(DOW FROM er.timestamp)
    ORDER BY cost DESC
  `, [userId, organizationId]);

  const patterns = [];
  const peakHourUsage = result.rows.filter(r => {
    const h = parseInt(r.hour);
    return (h >= 9 && h < 12) || (h >= 17 && h < 22);
  });

  const totalCost = result.rows.reduce((s, r) => s + parseFloat(r.cost), 0);
  const peakCost = peakHourUsage.reduce((s, r) => s + parseFloat(r.cost), 0);
  const peakPercent = totalCost > 0 ? (peakCost / totalCost) * 100 : 0;

  if (peakPercent > 50) {
    patterns.push({
      type: 'high_peak_usage',
      severity: 'high',
      message: `${Math.round(peakPercent)}% of your costs come from peak hours. Consider shifting load.`,
      potential_savings: Math.round(peakCost * 0.3),
    });
  }

  // Weekend vs weekday
  const weekendUsage = result.rows.filter(r => [0, 6].includes(parseInt(r.day_of_week)));
  const weekdayUsage = result.rows.filter(r => ![0, 6].includes(parseInt(r.day_of_week)));

  const weekendAvg = weekendUsage.reduce((s, r) => s + parseFloat(r.kwh), 0) / (weekendUsage.length || 1);
  const weekdayAvg = weekdayUsage.reduce((s, r) => s + parseFloat(r.kwh), 0) / (weekdayUsage.length || 1);

  if (weekendAvg > weekdayAvg * 1.3) {
    patterns.push({
      type: 'high_weekend_usage',
      severity: 'medium',
      message: `Weekend consumption is ${Math.round((weekendAvg / weekdayAvg - 1) * 100)}% higher than weekdays.`,
      potential_savings: Math.round((weekendAvg - weekdayAvg) * 2 * 7 * 4.3),
    });
  }

  // Night standby
  const nightUsage = result.rows.filter(r => {
    const h = parseInt(r.hour);
    return h >= 0 && h < 5;
  });
  const nightPower = nightUsage.reduce((s, r) => s + parseFloat(r.avg_power), 0) / (nightUsage.length || 1);
  if (nightPower > 300) {
    patterns.push({
      type: 'high_standby',
      severity: 'medium',
      message: `High standby power detected: ~${Math.round(nightPower)}W at night. Check for always-on devices.`,
      potential_savings: Math.round((nightPower - 100) / 1000 * 5 * 4.50 * 30),
    });
  }

  return patterns;
}

module.exports = {
  getCurrentRate,
  findCheapestSlots,
  predictMonthlyBill,
  calculateSchedulingSavings,
  detectExpensivePatterns,
  DEFAULT_TOD_RATES,
  CARBON_FACTOR,
};
