require('dotenv').config();
const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool(config.db);

const migrationSQL = `
-- ============================================================
-- SMART ENERGY PAAS - DATABASE SCHEMA
-- Multi-tenant SaaS Architecture with Time-Series Support
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. ORGANIZATIONS (TENANTS)
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('residential', 'commercial', 'industrial', 'utility', 'city')),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'India',
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 2. USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(30) NOT NULL CHECK (role IN ('super_admin', 'tenant_admin', 'user')),
  phone VARCHAR(20),
  avatar_url TEXT,
  preferences JSONB DEFAULT '{"darkMode": false, "notifications": true, "currency": "INR"}',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================================
-- 3. TARIFF PLANS
-- ============================================================
CREATE TABLE IF NOT EXISTS tariff_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(30) NOT NULL CHECK (type IN ('flat', 'tod', 'tiered')),
  currency VARCHAR(10) DEFAULT 'INR',
  -- Flat rate
  flat_rate DECIMAL(10,4),
  -- Time-of-Day rates (JSONB array)
  tod_rates JSONB DEFAULT '[]',
  -- Tiered rates (JSONB array)
  tier_rates JSONB DEFAULT '[]',
  -- Carbon factor (kg CO2 per kWh)
  carbon_factor DECIMAL(8,4) DEFAULT 0.82,
  fixed_charge DECIMAL(10,2) DEFAULT 0,
  tax_percentage DECIMAL(5,2) DEFAULT 18.0,
  is_active BOOLEAN DEFAULT true,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tariff_org ON tariff_plans(organization_id);

-- ============================================================
-- 4. SMART METERS
-- ============================================================
CREATE TABLE IF NOT EXISTS smart_meters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  tariff_plan_id UUID REFERENCES tariff_plans(id) ON DELETE SET NULL,
  meter_serial VARCHAR(50) UNIQUE NOT NULL,
  meter_type VARCHAR(30) DEFAULT 'smart' CHECK (meter_type IN ('smart', 'amr', 'prepaid')),
  manufacturer VARCHAR(100),
  model VARCHAR(100),
  firmware_version VARCHAR(30),
  location TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  installation_date DATE,
  max_load_kw DECIMAL(10,2) DEFAULT 10.0,
  status VARCHAR(20) DEFAULT 'online' CHECK (status IN ('online', 'offline', 'maintenance', 'error', 'decommissioned')),
  last_communication TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  error_log JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meters_org ON smart_meters(organization_id);
CREATE INDEX IF NOT EXISTS idx_meters_user ON smart_meters(user_id);
CREATE INDEX IF NOT EXISTS idx_meters_serial ON smart_meters(meter_serial);
CREATE INDEX IF NOT EXISTS idx_meters_status ON smart_meters(status);

-- ============================================================
-- 5. APPLIANCES
-- ============================================================
CREATE TABLE IF NOT EXISTS appliances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meter_id UUID REFERENCES smart_meters(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'ac', 'refrigerator', 'washing_machine', 'ev_charger', 'water_heater',
    'microwave', 'television', 'lighting', 'fan', 'computer', 'dishwasher',
    'dryer', 'oven', 'solar_panel', 'battery_storage', 'pool_pump', 'other'
  )),
  brand VARCHAR(100),
  model VARCHAR(100),
  rated_power_watts DECIMAL(10,2) NOT NULL,
  avg_daily_usage_hours DECIMAL(5,2) DEFAULT 1.0,
  is_on BOOLEAN DEFAULT false,
  is_schedulable BOOLEAN DEFAULT true,
  schedule JSONB DEFAULT '{}',
  current_power_watts DECIMAL(10,2) DEFAULT 0,
  -- e.g., {"monday": [{"start": "06:00", "end": "08:00"}, ...], ...}
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appliances_org ON appliances(organization_id);
CREATE INDEX IF NOT EXISTS idx_appliances_user ON appliances(user_id);
CREATE INDEX IF NOT EXISTS idx_appliances_meter ON appliances(meter_id);

-- ============================================================
-- 6. ENERGY READINGS (Time-Series Simulation)
-- ============================================================
CREATE TABLE IF NOT EXISTS energy_readings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  meter_id UUID NOT NULL REFERENCES smart_meters(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  -- Power & Energy
  voltage DECIMAL(8,2),
  current_amps DECIMAL(8,3),
  power_watts DECIMAL(12,2),
  energy_kwh DECIMAL(12,4),
  power_factor DECIMAL(4,3) DEFAULT 0.95,
  frequency DECIMAL(5,2) DEFAULT 50.0,
  -- Computed
  cost DECIMAL(10,4),
  carbon_kg DECIMAL(10,4),
  tariff_type VARCHAR(20),
  -- Quality
  reading_quality VARCHAR(20) DEFAULT 'actual' CHECK (reading_quality IN ('actual', 'estimated', 'simulated')),
  source VARCHAR(30) DEFAULT 'meter'
);

-- Time-series optimized indexes
CREATE INDEX IF NOT EXISTS idx_readings_meter_time ON energy_readings(meter_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_readings_org_time ON energy_readings(organization_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON energy_readings(timestamp DESC);

-- Partition helper - monthly partitions can be added in production
-- For simulation, we use a single table with proper indexing

-- ============================================================
-- 7. APPLIANCE USAGE LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS appliance_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  appliance_id UUID NOT NULL REFERENCES appliances(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_minutes DECIMAL(10,2),
  energy_consumed_kwh DECIMAL(10,4),
  cost DECIMAL(10,4),
  carbon_kg DECIMAL(10,4),
  was_scheduled BOOLEAN DEFAULT false,
  tariff_type VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_org ON appliance_usage_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_appliance ON appliance_usage_logs(appliance_id);
CREATE INDEX IF NOT EXISTS idx_usage_user ON appliance_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_time ON appliance_usage_logs(started_at DESC);

-- ============================================================
-- 8. RECOMMENDATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  appliance_id UUID REFERENCES appliances(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'schedule_shift', 'usage_reduction', 'peak_avoidance',
    'cost_saving', 'carbon_reduction', 'maintenance', 'upgrade'
  )),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  potential_savings_kwh DECIMAL(10,4),
  potential_savings_cost DECIMAL(10,2),
  potential_carbon_reduction DECIMAL(10,4),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'dismissed', 'applied')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_recommendations_user ON recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_org ON recommendations(organization_id);

-- ============================================================
-- 9. BILLING RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS billing_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meter_id UUID NOT NULL REFERENCES smart_meters(id) ON DELETE CASCADE,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  total_kwh DECIMAL(12,4) NOT NULL DEFAULT 0,
  total_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  peak_kwh DECIMAL(12,4) DEFAULT 0,
  off_peak_kwh DECIMAL(12,4) DEFAULT 0,
  peak_cost DECIMAL(12,2) DEFAULT 0,
  off_peak_cost DECIMAL(12,2) DEFAULT 0,
  fixed_charges DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_carbon_kg DECIMAL(10,4) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'generated', 'paid', 'overdue')),
  due_date DATE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_user ON billing_records(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_org ON billing_records(organization_id);

-- ============================================================
-- 10. ALERTS & NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  meter_id UUID REFERENCES smart_meters(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'budget_exceeded', 'high_usage', 'meter_offline', 'meter_error',
    'peak_warning', 'bill_due', 'recommendation', 'system'
  )),
  severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_org ON alerts(organization_id);

-- ============================================================
-- 11. DEVICE COMMANDS (Remote Control Simulation)
-- ============================================================
CREATE TABLE IF NOT EXISTS device_commands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  meter_id UUID NOT NULL REFERENCES smart_meters(id) ON DELETE CASCADE,
  command_type VARCHAR(50) NOT NULL CHECK (command_type IN (
    'reboot', 'firmware_update', 'read_now', 'disconnect', 'reconnect',
    'set_load_limit', 'reset_tamper', 'ping'
  )),
  payload JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'acknowledged', 'executed', 'failed')),
  issued_by UUID REFERENCES users(id),
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  executed_at TIMESTAMP WITH TIME ZONE,
  response JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_commands_meter ON device_commands(meter_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY['organizations', 'users', 'tariff_plans', 'smart_meters', 'appliances'])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_update_%I ON %I;
      CREATE TRIGGER trg_update_%I
        BEFORE UPDATE ON %I
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    ', t, t, t, t);
  END LOOP;
END;
$$;

-- ============================================================
-- VIEWS
-- ============================================================

-- Tenant energy summary view
CREATE OR REPLACE VIEW v_tenant_energy_summary AS
SELECT
  o.id AS organization_id,
  o.name AS organization_name,
  COUNT(DISTINCT sm.id) AS total_meters,
  COUNT(DISTINCT u.id) AS total_users,
  COALESCE(SUM(er.energy_kwh), 0) AS total_energy_kwh,
  COALESCE(SUM(er.cost), 0) AS total_cost,
  COALESCE(SUM(er.carbon_kg), 0) AS total_carbon_kg
FROM organizations o
LEFT JOIN smart_meters sm ON sm.organization_id = o.id
LEFT JOIN users u ON u.organization_id = o.id
LEFT JOIN energy_readings er ON er.organization_id = o.id
  AND er.timestamp >= DATE_TRUNC('month', NOW())
GROUP BY o.id, o.name;

SELECT 'Migration completed successfully' AS status;
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('[Migration] Starting database migration...');
    await client.query(migrationSQL);
    console.log('[Migration] Database schema created successfully!');
  } catch (err) {
    console.error('[Migration] Error:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
