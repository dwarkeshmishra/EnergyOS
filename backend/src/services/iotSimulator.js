/**
 * IoT Simulation Layer
 * Simulates realistic smart meter data, appliance consumption,
 * and device state changes via WebSocket broadcasting.
 */

const { query } = require('../config/database');
const { getCurrentRate, CARBON_FACTOR } = require('./aiOptimization');

class IoTSimulator {
  constructor(wsBroadcast) {
    this.wsBroadcast = wsBroadcast;
    this.interval = null;
    this.running = false;
  }

  start(intervalMs = 5000) {
    if (this.running) return;
    this.running = true;
    console.log(`[IoT Simulator] Started (interval: ${intervalMs}ms)`);

    this.interval = setInterval(() => this.tick(), intervalMs);
    // Initial tick
    setTimeout(() => this.tick(), 1000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.running = false;
    console.log('[IoT Simulator] Stopped');
  }

  async tick() {
    try {
      // Get all active meters
      const meters = await query(`
        SELECT sm.id, sm.organization_id, sm.user_id, sm.meter_serial, sm.max_load_kw, sm.status,
               tp.type AS tariff_type, tp.tod_rates, tp.flat_rate
        FROM smart_meters sm
        LEFT JOIN tariff_plans tp ON tp.id = sm.tariff_plan_id
        WHERE sm.is_active = true AND sm.status != 'decommissioned'
      `);

      const now = new Date();
      const hour = now.getHours();
      const currentSlot = getCurrentRate(hour);

      for (const meter of meters.rows) {
        // Simulate meter status changes (rare)
        if (Math.random() < 0.002 && meter.status === 'online') {
          await this.simulateOffline(meter);
          continue;
        }
        if (meter.status === 'offline' && Math.random() < 0.05) {
          await this.simulateOnline(meter);
        }
        if (meter.status !== 'online') continue;

        // Generate realistic power reading
        const reading = this.generateReading(meter, hour);

        // Calculate cost
        let rate = currentSlot.rate;
        if (meter.tariff_type === 'flat' && meter.flat_rate) {
          rate = parseFloat(meter.flat_rate);
        }
        const cost = reading.energyKwh * rate;
        const carbon = reading.energyKwh * CARBON_FACTOR;

        // Insert reading
        await query(`
          INSERT INTO energy_readings (organization_id, meter_id, timestamp, voltage, current_amps,
            power_watts, energy_kwh, power_factor, cost, carbon_kg, tariff_type, reading_quality)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'simulated')
        `, [meter.organization_id, meter.id, now,
            reading.voltage, reading.currentAmps, reading.powerWatts,
            reading.energyKwh, reading.powerFactor,
            cost, carbon, currentSlot.type]);

        // Update meter's last communication
        await query(
          'UPDATE smart_meters SET last_communication = $1 WHERE id = $2',
          [now, meter.id]
        );

        // Broadcast via WebSocket
        this.wsBroadcast(meter.organization_id, {
          type: 'meter_reading',
          data: {
            meterId: meter.id,
            meterSerial: meter.meter_serial,
            organizationId: meter.organization_id,
            timestamp: now.toISOString(),
            powerWatts: Math.round(reading.powerWatts),
            energyKwh: Math.round(reading.energyKwh * 1000) / 1000,
            voltage: Math.round(reading.voltage * 10) / 10,
            currentAmps: Math.round(reading.currentAmps * 100) / 100,
            cost: Math.round(cost * 100) / 100,
            carbonKg: Math.round(carbon * 1000) / 1000,
            tariffType: currentSlot.type,
            tariffRate: rate,
            slotName: currentSlot.name,
          },
        });
      }

      // Simulate appliance power changes
      await this.simulateAppliances(now);

    } catch (err) {
      console.error('[IoT Simulator] Error:', err.message);
    }
  }

  generateReading(meter, hour) {
    const maxLoadW = (parseFloat(meter.max_load_kw) || 10) * 1000;

    // Realistic load curve based on time of day
    const loadCurve = {
      0: 0.15, 1: 0.12, 2: 0.10, 3: 0.10, 4: 0.10, 5: 0.12,
      6: 0.25, 7: 0.35, 8: 0.45, 9: 0.55, 10: 0.50, 11: 0.48,
      12: 0.45, 13: 0.42, 14: 0.40, 15: 0.42, 16: 0.48, 17: 0.55,
      18: 0.65, 19: 0.75, 20: 0.70, 21: 0.60, 22: 0.40, 23: 0.25,
    };

    const baseFactor = loadCurve[hour] || 0.3;
    // Add realistic noise (±20%)
    const noise = 1 + (Math.random() - 0.5) * 0.4;
    const powerWatts = maxLoadW * baseFactor * noise;

    // Voltage simulation (220V ±5%)
    const voltage = 220 + (Math.random() - 0.5) * 22;
    const powerFactor = 0.85 + Math.random() * 0.13;
    const currentAmps = powerWatts / (voltage * powerFactor);

    // Energy for this interval (assuming 5-second intervals / ~1 reading per interval)
    // Normalized to approximate hourly kWh
    const energyKwh = powerWatts / 1000;

    return {
      powerWatts: Math.max(50, powerWatts),
      voltage,
      currentAmps: Math.max(0.1, currentAmps),
      powerFactor,
      energyKwh: Math.max(0.01, energyKwh),
    };
  }

  async simulateAppliances(now) {
    try {
      // Get ON appliances and update their power consumption with slight variations
      const appliances = await query(`
        SELECT id, rated_power_watts, current_power_watts, organization_id, user_id
        FROM appliances WHERE is_on = true AND is_active = true
      `);

      for (const app of appliances.rows) {
        const variation = 0.7 + Math.random() * 0.3;
        const newPower = parseFloat(app.rated_power_watts) * variation;

        await query(
          'UPDATE appliances SET current_power_watts = $1 WHERE id = $2',
          [newPower, app.id]
        );

        this.wsBroadcast(app.organization_id, {
          type: 'appliance_update',
          data: {
            applianceId: app.id,
            currentPowerWatts: Math.round(newPower),
            timestamp: now.toISOString(),
          },
        });
      }

      // Random ON/OFF toggles (simulate scheduled operations)
      if (Math.random() < 0.01) {
        const randomApp = await query(`
          SELECT id, name, is_on, organization_id, user_id
          FROM appliances WHERE is_active = true AND is_schedulable = true
          ORDER BY RANDOM() LIMIT 1
        `);

        if (randomApp.rows.length > 0) {
          const app = randomApp.rows[0];
          await query('UPDATE appliances SET is_on = NOT is_on WHERE id = $1', [app.id]);

          this.wsBroadcast(app.organization_id, {
            type: 'appliance_toggle',
            data: {
              applianceId: app.id,
              name: app.name,
              is_on: !app.is_on,
              trigger: 'schedule',
              timestamp: now.toISOString(),
            },
          });
        }
      }
    } catch (err) {
      console.error('[IoT Simulator] Appliance simulation error:', err.message);
    }
  }

  async simulateOffline(meter) {
    await query("UPDATE smart_meters SET status = 'offline' WHERE id = $1", [meter.id]);
    
    // Add error log
    await query(`
      UPDATE smart_meters SET error_log = error_log || $1::jsonb WHERE id = $2
    `, [JSON.stringify([{
      timestamp: new Date().toISOString(),
      type: 'communication_loss',
      message: 'Simulated communication failure',
    }]), meter.id]);

    // Create alert
    await query(`
      INSERT INTO alerts (organization_id, user_id, meter_id, type, severity, title, message)
      VALUES ($1, $2, $3, 'meter_offline', 'warning', 'Meter Offline',
        'Smart meter ' || $4 || ' has gone offline. Last communication lost.')
    `, [meter.organization_id, meter.user_id, meter.id, meter.meter_serial]);

    this.wsBroadcast(meter.organization_id, {
      type: 'meter_status',
      data: {
        meterId: meter.id,
        meterSerial: meter.meter_serial,
        status: 'offline',
        timestamp: new Date().toISOString(),
      },
    });
  }

  async simulateOnline(meter) {
    await query("UPDATE smart_meters SET status = 'online', last_communication = NOW() WHERE id = $1", [meter.id]);

    this.wsBroadcast(meter.organization_id, {
      type: 'meter_status',
      data: {
        meterId: meter.id,
        meterSerial: meter.meter_serial,
        status: 'online',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

module.exports = IoTSimulator;
