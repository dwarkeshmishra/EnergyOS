require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool(config.db);

async function seed() {
  const client = await pool.connect();
  try {
    console.log('[Seed] Starting database seeding...');
    await client.query('BEGIN');

    // ── Organizations ──
    const org1Id = uuidv4();
    const org2Id = uuidv4();
    const org3Id = uuidv4();

    await client.query(`
      INSERT INTO organizations (id, name, slug, type, address, city, state, country, contact_email) VALUES
      ($1, 'GreenCity Apartments', 'greencity', 'residential', '123 Green Avenue, Sector 45', 'Gurugram', 'Haryana', 'India', 'admin@greencity.com'),
      ($2, 'SmartTech Office Park', 'smarttech', 'commercial', '456 Tech Boulevard', 'Bangalore', 'Karnataka', 'India', 'admin@smarttech.com'),
      ($3, 'Metro Utility Corp', 'metroutility', 'utility', '789 Power Grid Road', 'Mumbai', 'Maharashtra', 'India', 'admin@metroutility.com')
    `, [org1Id, org2Id, org3Id]);

    // ── Users ──
    const passwordHash = await bcrypt.hash('password123', 12);

    const superAdminId = uuidv4();
    const tenantAdmin1Id = uuidv4();
    const tenantAdmin2Id = uuidv4();
    const user1Id = uuidv4();
    const user2Id = uuidv4();
    const user3Id = uuidv4();
    const user4Id = uuidv4();

    await client.query(`
      INSERT INTO users (id, organization_id, email, password_hash, first_name, last_name, role, phone) VALUES
      ($1, $8, 'superadmin@energypaas.com', $7, 'System', 'Admin', 'super_admin', '+91-9000000001'),
      ($2, $8, 'admin@greencity.com', $7, 'Rajesh', 'Kumar', 'tenant_admin', '+91-9000000002'),
      ($3, $9, 'admin@smarttech.com', $7, 'Priya', 'Sharma', 'tenant_admin', '+91-9000000003'),
      ($4, $8, 'rahul@greencity.com', $7, 'Rahul', 'Verma', 'user', '+91-9000000004'),
      ($5, $8, 'anjali@greencity.com', $7, 'Anjali', 'Patel', 'user', '+91-9000000005'),
      ($6, $9, 'vikram@smarttech.com', $7, 'Vikram', 'Singh', 'user', '+91-9000000006'),
      ($10, $9, 'neha@smarttech.com', $7, 'Neha', 'Gupta', 'user', '+91-9000000007')
    `, [superAdminId, tenantAdmin1Id, tenantAdmin2Id, user1Id, user2Id, user3Id, passwordHash, org1Id, org2Id, user4Id]);

    // ── Tariff Plans ──
    const tariff1Id = uuidv4();
    const tariff2Id = uuidv4();
    const tariff3Id = uuidv4();

    await client.query(`
      INSERT INTO tariff_plans (id, organization_id, name, description, type, flat_rate, tod_rates, tier_rates, carbon_factor) VALUES
      ($1, $4, 'Residential ToD Plan', 'Time-of-Day tariff for residential consumers', 'tod', NULL, $7, '[]', 0.82),
      ($2, $5, 'Commercial Flat Rate', 'Flat rate commercial tariff', 'flat', 8.50, '[]', '[]', 0.92),
      ($3, $6, 'Utility Tiered Plan', 'Tiered pricing based on consumption', 'tiered', NULL, '[]', $8, 0.85)
    `, [
      tariff1Id, tariff2Id, tariff3Id,
      org1Id, org2Id, org3Id,
      JSON.stringify([
        { name: 'Off-Peak Night', start: '22:00', end: '06:00', rate: 4.50 },
        { name: 'Standard', start: '06:00', end: '09:00', rate: 6.50 },
        { name: 'Peak Morning', start: '09:00', end: '12:00', rate: 9.00 },
        { name: 'Standard Afternoon', start: '12:00', end: '17:00', rate: 7.00 },
        { name: 'Peak Evening', start: '17:00', end: '22:00', rate: 10.50 },
      ]),
      JSON.stringify([
        { min_kwh: 0, max_kwh: 100, rate: 4.00 },
        { min_kwh: 101, max_kwh: 300, rate: 6.50 },
        { min_kwh: 301, max_kwh: 500, rate: 8.50 },
        { min_kwh: 501, max_kwh: null, rate: 11.00 },
      ]),
    ]);

    // ── Smart Meters ──
    const meters = [];
    const meterData = [
      { orgId: org1Id, userId: user1Id, tariffId: tariff1Id, serial: 'SM-GC-001', location: 'Flat A-101' },
      { orgId: org1Id, userId: user2Id, tariffId: tariff1Id, serial: 'SM-GC-002', location: 'Flat A-203' },
      { orgId: org1Id, userId: tenantAdmin1Id, tariffId: tariff1Id, serial: 'SM-GC-003', location: 'Flat B-301' },
      { orgId: org2Id, userId: user3Id, tariffId: tariff2Id, serial: 'SM-ST-001', location: 'Office 101' },
      { orgId: org2Id, userId: user4Id, tariffId: tariff2Id, serial: 'SM-ST-002', location: 'Office 205' },
      { orgId: org3Id, userId: null, tariffId: tariff3Id, serial: 'SM-MU-001', location: 'Substation Alpha' },
    ];

    for (const m of meterData) {
      const meterId = uuidv4();
      meters.push({ ...m, id: meterId });
      await client.query(`
        INSERT INTO smart_meters (id, organization_id, user_id, tariff_plan_id, meter_serial, manufacturer, model, firmware_version, location, max_load_kw, status)
        VALUES ($1, $2, $3, $4, $5, 'EnergyTech', 'ET-Smart-3000', 'v2.1.4', $6, 10.0, 'online')
      `, [meterId, m.orgId, m.userId, m.tariffId, m.serial, m.location]);
    }

    // ── Appliances ──
    const applianceTemplates = [
      { name: 'Air Conditioner', type: 'ac', watts: 1500, hours: 8, icon: 'Snowflake' },
      { name: 'Refrigerator', type: 'refrigerator', watts: 150, hours: 24, icon: 'Thermometer' },
      { name: 'Washing Machine', type: 'washing_machine', watts: 500, hours: 1, icon: 'Waves' },
      { name: 'EV Charger', type: 'ev_charger', watts: 7200, hours: 4, icon: 'Zap' },
      { name: 'Water Heater', type: 'water_heater', watts: 2000, hours: 1, icon: 'Flame' },
      { name: 'LED Lighting', type: 'lighting', watts: 60, hours: 10, icon: 'Lightbulb' },
      { name: 'Television', type: 'television', watts: 120, hours: 5, icon: 'Monitor' },
      { name: 'Microwave', type: 'microwave', watts: 1200, hours: 0.5, icon: 'Utensils' },
      { name: 'Desktop Computer', type: 'computer', watts: 300, hours: 8, icon: 'Monitor' },
      { name: 'Ceiling Fan', type: 'fan', watts: 75, hours: 12, icon: 'Wind' },
    ];

    // Add appliances for user1
    const userMeters = meters.filter(m => m.userId);
    for (const um of userMeters) {
      const count = um.orgId === org2Id ? 5 : 6; // fewer for commercial
      const selectedAppliances = applianceTemplates.slice(0, count);
      for (const a of selectedAppliances) {
        const appId = uuidv4();
        await client.query(`
          INSERT INTO appliances (id, organization_id, user_id, meter_id, name, type, rated_power_watts, avg_daily_usage_hours, is_on, icon)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [appId, um.orgId, um.userId, um.id, a.name, a.type, a.watts, a.hours, Math.random() > 0.5, a.icon]);
      }
    }

    // ── Generate Historical Energy Readings (last 30 days) ──
    console.log('[Seed] Generating historical energy readings...');
    const now = new Date();
    for (const m of meters.filter(mt => mt.userId)) {
      for (let day = 29; day >= 0; day--) {
        for (let hour = 0; hour < 24; hour++) {
          const ts = new Date(now);
          ts.setDate(ts.getDate() - day);
          ts.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

          // Realistic load curve
          let basePower;
          if (hour >= 0 && hour < 6) basePower = 200 + Math.random() * 300;
          else if (hour >= 6 && hour < 9) basePower = 800 + Math.random() * 600;
          else if (hour >= 9 && hour < 12) basePower = 1200 + Math.random() * 800;
          else if (hour >= 12 && hour < 17) basePower = 900 + Math.random() * 600;
          else if (hour >= 17 && hour < 22) basePower = 1500 + Math.random() * 1000;
          else basePower = 400 + Math.random() * 400;

          // Add weekday/weekend variation
          const dayOfWeek = ts.getDay();
          if (dayOfWeek === 0 || dayOfWeek === 6) basePower *= 1.15;

          const voltage = 220 + (Math.random() - 0.5) * 10;
          const currentAmps = basePower / voltage;
          const energyKwh = basePower / 1000;

          // Determine tariff type  
          let tariffType = 'standard';
          let rate = 6.50;
          if (hour >= 22 || hour < 6) { tariffType = 'off_peak'; rate = 4.50; }
          else if ((hour >= 9 && hour < 12) || (hour >= 17 && hour < 22)) { tariffType = 'peak'; rate = 10.00; }

          const cost = energyKwh * rate;
          const carbonKg = energyKwh * 0.82;

          await client.query(`
            INSERT INTO energy_readings (organization_id, meter_id, timestamp, voltage, current_amps, power_watts, energy_kwh, cost, carbon_kg, tariff_type, reading_quality)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'simulated')
          `, [m.orgId, m.id, ts, voltage, currentAmps, basePower, energyKwh, cost, carbonKg, tariffType]);
        }
      }
    }

    // ── Recommendations ──
    const recUsers = [user1Id, user2Id, user3Id];
    const recommendations = [
      {
        type: 'schedule_shift',
        title: 'Shift EV Charging to Off-Peak',
        description: 'Charging your EV between 10 PM - 6 AM can save up to ₹450/month. Off-peak rates are 57% lower than peak rates.',
        savings_kwh: 120,
        savings_cost: 450,
        carbon: 98.4,
        priority: 'high',
      },
      {
        type: 'peak_avoidance',
        title: 'Reduce AC usage during Peak Hours',
        description: 'Your AC runs heavily between 5-10 PM (peak). Raising thermostat by 2°C during peak can save ₹280/month.',
        savings_kwh: 60,
        savings_cost: 280,
        carbon: 49.2,
        priority: 'medium',
      },
      {
        type: 'usage_reduction',
        title: 'Optimize Washing Machine Usage',
        description: 'Running full loads instead of partial loads can reduce energy by 30%. Schedule for off-peak hours for maximum savings.',
        savings_kwh: 15,
        savings_cost: 80,
        carbon: 12.3,
        priority: 'low',
      },
      {
        type: 'cost_saving',
        title: 'Switch to ToD Tariff Plan',
        description: 'Based on your usage pattern, a Time-of-Day plan could save you ₹600/month by leveraging off-peak rates.',
        savings_kwh: 0,
        savings_cost: 600,
        carbon: 0,
        priority: 'high',
      },
    ];

    for (const userId of recUsers) {
      const orgId = userId === user3Id ? org2Id : org1Id;
      for (const rec of recommendations) {
        await client.query(`
          INSERT INTO recommendations (organization_id, user_id, type, title, description, potential_savings_kwh, potential_savings_cost, potential_carbon_reduction, priority)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [orgId, userId, rec.type, rec.title, rec.description, rec.savings_kwh, rec.savings_cost, rec.carbon, rec.priority]);
      }
    }

    await client.query('COMMIT');
    console.log('[Seed] Database seeded successfully!');
    console.log('[Seed] ── Login Credentials ──');
    console.log('[Seed] Super Admin:    superadmin@energypaas.com / password123');
    console.log('[Seed] Tenant Admin:   admin@greencity.com / password123');
    console.log('[Seed] User:           rahul@greencity.com / password123');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Seed] Error:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
