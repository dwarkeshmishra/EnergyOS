# Smart Energy PaaS — Complete Module Documentation

> **Product**: EnergyOS — Smart Energy Platform as a Service  
> **Live App**: https://energy-os.vercel.app  
> **API Server**: https://energyos.onrender.com/api/health  
> **Tech Stack**: Next.js 14 + Express.js + PostgreSQL + WebSocket  
> **Architecture**: Multi-tenant SaaS with RBAC (3 roles)

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Access & Authentication](#2-access--authentication)
3. [Consumer Dashboard Modules](#3-consumer-dashboard-modules)
4. [Admin Portal Modules](#4-admin-portal-modules)
5. [API Reference](#5-api-reference)
6. [Real-Time Architecture](#6-real-time-architecture)
7. [Database Schema](#7-database-schema)
8. [Navigation Map & URL Reference](#8-navigation-map--url-reference)
9. [ToD Tariff Reference](#9-tod-tariff-reference)
10. [Demo Walkthrough Script](#10-demo-walkthrough-script)

---

## 1. Platform Overview

EnergyOS is a **unified smart metering super app** that consolidates smart meter data, appliance-level insights, and home automation controls. It enables **10–15% cost savings** via dynamic Time-of-Day (ToD) tariff optimization.

### What it Provides

| Capability | Description |
|---|---|
| **Real-Time Monitoring** | Live power (W), voltage (V), current (A) via WebSocket every 5 seconds |
| **Appliance Control** | ON/OFF toggle, smart scheduling, power monitoring for 10+ appliance types |
| **ToD Tariff Optimization** | 5-slot Time-of-Day rates with AI-powered cheapest-slot recommendations |
| **Bill Prediction & Forecasting** | Monthly projections, budget alerts, 3-month forecast with seasonal adjustment |
| **Carbon Footprint Tracking** | CO₂ emissions per kWh (0.82 kg/kWh factor), tree-offset equivalents |
| **Smart Recommendations** | AI-generated energy-saving suggestions with accept/dismiss workflow |
| **Multi-Tenant Management** | Organization CRUD, user provisioning, meter assignment with data isolation |
| **Platform Analytics** | Peak load analysis, revenue trends, demand response, tenant comparison |
| **Device Management** | Remote meter commands (ping, restart, firmware update, calibrate) |
| **Tariff Configuration** | ToD rate slot management, plan creation, meter assignment |

### Key Differentiators

- **Multi-tenant SaaS** — Organization-level data isolation, per-tenant metering
- **3-Role RBAC** — `super_admin`, `tenant_admin`, `user` with granular access control
- **Real-time IoT Simulation** — Generates realistic time-of-day load curves every 5 seconds
- **WebSocket with JWT Auth** — Tenant-scoped broadcasting with auto-reconnect
- **AI Optimization Engine** — ToD rate analysis, expense pattern detection, scheduling optimization

---

## 2. Access & Authentication

### URL Structure

| URL | Description | Who Can Access |
|-----|-------------|----------------|
| `/login` | Login & registration page | Everyone |
| `/dashboard` | Consumer main dashboard | All authenticated users |
| `/dashboard/appliances` | Appliance control & monitoring | All authenticated users |
| `/dashboard/energy` | Energy analytics with charts | All authenticated users |
| `/dashboard/optimization` | AI insights & recommendations | All authenticated users |
| `/dashboard/billing` | Bills, forecasts, & reports | All authenticated users |
| `/admin` | Admin overview dashboard | `super_admin`, `tenant_admin` |
| `/admin/organizations` | Organization (tenant) management | `super_admin` only |
| `/admin/analytics` | Platform-wide analytics | `super_admin`, `tenant_admin` |
| `/admin/meters` | Smart meter management | `super_admin`, `tenant_admin` |
| `/admin/tariffs` | Tariff plan management | `super_admin`, `tenant_admin` |
| `/admin/users` | User management | `super_admin`, `tenant_admin` |
| `/admin/devices` | Device remote commands | `super_admin`, `tenant_admin` |

### Demo Credentials

| Role | Email | Password | What You See |
|------|-------|----------|-------------|
| **Super Admin** | `superadmin@energypaas.com` | `password123` | Full admin portal + consumer dashboard (all organizations) |
| **Tenant Admin** | `admin@greencity.com` | `password123` | Admin portal (GreenCity org only) + consumer dashboard |
| **Consumer** | `rahul@greencity.com` | `password123` | Consumer dashboard only |
| **Consumer** | `anjali@greencity.com` | `password123` | Consumer dashboard only |
| **Consumer** | `vikram@smarttech.com` | `password123` | Consumer dashboard (SmartTech org) |

### Login Page Features

- **Sign In / Sign Up toggle** — Switch between login and registration
- **Quick Demo Login buttons** — 3 one-click buttons: Consumer, Admin, Super Admin
- **Organization selector** — New users pick their organization during signup
- **Password visibility toggle** — Eye icon to show/hide password
- **Left panel branding** — Feature highlights for desktop view

### Authentication Flow

```
Login → POST /api/auth/login → JWT token stored in localStorage
     → Role check → Redirect to /admin (for admins) or /dashboard (for users)
     → WebSocket connection established with JWT auth
```

---

## 3. Consumer Dashboard Modules

### 3.1 Main Dashboard (`/dashboard`)

**What it shows:**
- Personalized greeting with user name and time-of-day context
- **Current Rate Banner** — Shows active ToD rate slot with peak/off-peak indicator
- **4 Stat Cards:**
  - Current Power (kW) — Live power consumption from WebSocket
  - Today's Usage (kWh) — Cumulative today with estimated cost
  - Monthly Bill (₹) — Projected bill for current month
  - Carbon Footprint (kg CO₂) — Monthly emissions with tree equivalents
- **Energy Chart** — Hourly consumption area chart for today
- **Tariff Distribution** — Donut chart showing Peak/Standard/Off-Peak breakdown
- **Appliance Status** — Active vs total count with total load in kW
- **Smart Recommendations** — Top 4 AI-generated savings suggestions
- **Month Comparison Footer** — This month vs last month kWh, cost, savings trend

**Data Sources:** `/api/energy/summary`, `/api/energy/realtime`, `/api/energy/hourly`, `/api/optimization/current-rate`, `/api/recommendations`

**Real-time Updates:** Power values auto-update via WebSocket every 5 seconds. Dashboard refreshes data every 30 seconds.

---

### 3.2 Appliances Page (`/dashboard/appliances`)

**What it shows:**
- **Header stats** — Active count and total load in kW
- **Appliance Grid** — Cards for each appliance with:
  - Icon (type-specific: AC=Snowflake, Refrigerator=Thermometer, etc.)
  - Name & rated power
  - **ON/OFF Toggle** — Real-time switch with visual feedback
  - **Live Power Reading** — Current watts with animated power bar
  - **Schedule Button** — Set daily start/end times (tip: off-peak 10 PM–6 AM)
  - **Cost Button** — Predicted cost per ToD slot with best-time recommendation

**Supported Appliance Types:** AC, Refrigerator, Washing Machine, EV Charger, Water Heater, LED Lighting, Television, Microwave, Computer, Ceiling Fan, Other

**Interactive Features:**
| Action | What Happens |
|--------|-------------|
| Toggle ON/OFF | `PUT /api/appliances/:id/toggle` → Status changes instantly, broadcast via WebSocket |
| Add Appliance | Modal with Name, Type, Power (W), Daily Hours → `POST /api/appliances` |
| Schedule | Time picker for start/end → `PUT /api/appliances/:id/schedule` |
| View Cost | Modal showing cost prediction per ToD slot → `GET /api/appliances/:id/predicted-cost` |

---

### 3.3 Energy Usage Page (`/dashboard/energy`)

**What it shows:**
- **Summary Stats Row** — Today's Usage, Peak Demand, vs Last Month %, Monthly Total
- **View Mode Toggle** — Switch between Hourly / Daily / Monthly views
- **Date Navigation** — Arrow buttons to go forward/backward in time
- **Charts:**
  - Hourly: Area chart of kWh per hour for selected day
  - Daily: Bar chart of kWh per day for last 30 days
  - Monthly: Multi-line chart comparing current year vs previous year
- **Peak vs Off-Peak Distribution** — Side-by-side cards with percentage bar
- **Usage Insights** — Average hourly consumption, estimated cost, CO₂ emitted, projected monthly

**Export:** CSV export button downloads energy data for the selected date range

**Data Sources:** `/api/energy/summary`, `/api/energy/hourly`, `/api/energy/daily`, `/api/energy/monthly`, `/api/energy/export`

---

### 3.4 AI Insights & Optimization (`/dashboard/optimization`)

**What it shows:**
- **Current Rate Banner** — Full-width gradient banner showing:
  - Active rate slot name and price (₹/kWh)
  - Next rate change info
  - Cheapest rate today
- **3 Key Metrics:**
  - Predicted Monthly Bill — Amount with vs-last-month comparison
  - Potential Savings — Monthly savings with optimal scheduling + current vs optimized cost
  - Carbon Footprint — Monthly CO₂ kg with tree offset equivalents
- **ToD Rate Slots** — 5 colored cards showing all rate slots with "Active Now" indicator
- **Smart Recommendations** — Full list with Accept/Dismiss buttons per recommendation
- **Expensive Usage Patterns** — Detected bad patterns (e.g., "Running AC during super-peak")

**API Endpoints Used:**
| Endpoint | What it Returns |
|----------|----------------|
| `/api/optimization/current-rate` | Active ToD rate slot, price, peak status |
| `/api/optimization/cheapest-slots` | All 5 slots ranked by price |
| `/api/optimization/predict-bill` | Predicted monthly bill amount |
| `/api/optimization/patterns` | Expensive usage patterns + carbon footprint |
| `/api/optimization/tod-comparison` | Current cost vs optimized cost |
| `/api/recommendations` | AI-generated recommendations list |

---

### 3.5 Bills & Reports (`/dashboard/billing`)

**What it shows:**
- **3-Tab Layout:**

**Tab 1 — Current Bill:**
- Bill summary card (total amount, period dates, kWh used, days remaining)
- Bill breakdown by rate tier (Peak/Off-Peak/Standard with kWh × rate)
- Taxes breakdown
- Savings opportunity (potential savings by shifting to off-peak)
- End-of-month projection

**Tab 2 — History:**
- Monthly bill trend bar chart (last 12 months)
- Billing history table (Period, Usage kWh, Amount, Avg Rate, Status)

**Tab 3 — Forecast:**
- 3-month predicted bills with seasonal notes
- Predicted kWh and vs-average comparison
- Budget alerts
- Forecast comparison bar chart (predicted vs historical)

**Data Sources:** `/api/billing/current`, `/api/billing/history`, `/api/billing/forecast`

---

## 4. Admin Portal Modules

### 4.1 Admin Overview (`/admin`)

**Access:** `super_admin`, `tenant_admin`

**What it shows:**
- **4 Stat Cards:** Organizations, Total Users, Active Meters, Total Revenue
- **Platform Energy Chart** — 30-day aggregated energy consumption area chart
- **Recent Alerts** — Latest 5 alerts with severity indicators (critical/warning/info)
- **Organization Distribution** — Donut chart showing users per organization
- **System Status** — API Server, WebSocket, Database, IoT Simulator health indicators

**Super Admin sees:** Platform-wide data across all organizations  
**Tenant Admin sees:** Only their organization's data

---

### 4.2 Organizations Management (`/admin/organizations`)

**Access:** `super_admin` only

**What it shows:**
- **Organization Cards** — One card per tenant showing:
  - Name, slug, type (residential/commercial/industrial/utility)
  - User count, meter count
  - Active/Inactive status badge
- **Search** — Filter organizations by name or slug
- **CRUD Operations:**
  - **Create** — Name, Slug, Type, Max Users
  - **Edit** — Update name, type, active status
  - **Delete** — Confirmation dialog before deletion

**Seeded Organizations:**
| Name | Slug | Type | City |
|------|------|------|------|
| GreenCity Apartments | greencity | residential | Gurugram, Haryana |
| SmartTech Office Park | smarttech | commercial | Bangalore, Karnataka |
| Metro Utility Corp | metroutility | utility | Mumbai, Maharashtra |

---

### 4.3 Platform Analytics (`/admin/analytics`)

**Access:** `super_admin`, `tenant_admin`

**What it shows:**
- **Summary Row:** Peak Load (kW), Revenue MTD (₹), Load Factor (%), DR Events
- **4 Charts:**
  - Peak Load Trend — Hourly peak demand area chart
  - Revenue Trend — Daily revenue bar chart (last 30 days)
  - Demand Response — Peak/Standard/Off-Peak donut chart
  - Tenant Comparison — Energy consumption per organization bar chart (super_admin only)

---

### 4.4 Smart Meters (`/admin/meters`)

**Access:** `super_admin`, `tenant_admin`

**What it shows:**
- **Header** — Online/Total count, "Register Meter" button
- **Search** — Filter by meter ID or location
- **Meters Table** — Columns: Meter ID, Type, Location, Status (with signal icon), Firmware, Last Seen, Actions
- **Meter Detail Modal** (click "Manage"):
  - Status and firmware info
  - Send Command (Ping, Restart, Firmware Update, Calibrate, Read Now)
  - Command History list

**Seeded Meters:**
| Serial | Location | Organization |
|--------|----------|-------------|
| SM-GC-001 | Flat A-101 | GreenCity |
| SM-GC-002 | Flat A-203 | GreenCity |
| SM-GC-003 | Flat B-301 | GreenCity |
| SM-ST-001 | Office 101 | SmartTech |
| SM-ST-002 | Office 205 | SmartTech |
| SM-MU-001 | Substation Alpha | Metro Utility |

---

### 4.5 Tariff Plans (`/admin/tariffs`)

**Access:** `super_admin`, `tenant_admin`

**What it shows:**
- **Current Rate Banner** — Active rate with peak/off-peak gradient background
- **Tariff Cards** — One per plan showing:
  - Plan name, type, base rate
  - Color-coded rate slot list (5 ToD slots with times and prices)
  - Assigned meters count
  - Edit/Delete actions
- **Create Plan Modal** — Name, Type (ToD/Flat/Tiered), Base Rate, 5 ToD rate slots

**Seeded Tariff Plans:**
| Plan | Type | Organization | Base Rate |
|------|------|-------------|-----------|
| Residential ToD Plan | tod | GreenCity | Variable (5 slots) |
| Commercial Flat Rate | flat | SmartTech | ₹8.50/kWh |
| Utility Tiered Plan | tiered | Metro Utility | Tiered brackets |

---

### 4.6 User Management (`/admin/users`)

**Access:** `super_admin`, `tenant_admin`

**What it shows:**
- **Header** — Total users count, "Add User" button
- **Search** — Filter by name or email
- **Users Table** — Columns: User (avatar+name+email), Role (badge), Organization, Joined, Status, Actions
- **Role Management** — Dropdown to change role (User/Tenant Admin/Super Admin)
- **Delete User** — Confirmation dialog
- **Add User Modal** — Name, Email, Password, Role

**Role Badges:**
| Role | Color | Icon |
|------|-------|------|
| Super Admin | Purple | ShieldCheck |
| Tenant Admin | Blue | Shield |
| User | Gray | User |

---

### 4.7 Device Management (`/admin/devices`)

**Access:** `super_admin`, `tenant_admin`

**What it shows:**
- **Command Center** — Meter selector + Command type dropdown + Send button
- **Device Status Grid** — 4 cards: Total Devices, Online, Offline, Pending Commands
- **Command History Table** — Command type, Status (with icon), Sent At, Response
- **Search** — Filter commands by type

**Available Commands:**
| Command | Description |
|---------|-------------|
| `ping` | Check if meter is responsive |
| `restart` | Restart meter firmware |
| `firmware_update` | Push firmware OTA |
| `calibrate` | Recalibrate meter readings |
| `read_now` | Force immediate reading |
| `disconnect` | Disconnect meter |
| `reconnect` | Reconnect meter |

---

## 5. API Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register new user (name, email, password, org slug) |
| `POST` | `/api/auth/login` | Login → returns JWT token + user profile |
| `GET` | `/api/auth/me` | Get current user profile from JWT |

### Energy Data (`/api/energy`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/energy/realtime` | Live meter reading (power W, kW, today kWh) |
| `GET` | `/api/energy/hourly?date=YYYY-MM-DD` | 24 hourly consumption data points |
| `GET` | `/api/energy/daily?start_date=&end_date=` | Daily consumption breakdown |
| `GET` | `/api/energy/monthly` | Monthly consumption with year comparison |
| `GET` | `/api/energy/summary` | Dashboard summary (today, this month, last month, projections) |
| `GET` | `/api/energy/export?start_date=&end_date=` | Download CSV of energy data |

### Appliances (`/api/appliances`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/appliances` | List user's appliances |
| `POST` | `/api/appliances` | Add new appliance |
| `PUT` | `/api/appliances/:id/toggle` | Toggle ON/OFF |
| `PUT` | `/api/appliances/:id/schedule` | Set auto-schedule times |
| `GET` | `/api/appliances/:id/predicted-cost` | Cost prediction per ToD slot |

### AI & Optimization (`/api/optimization`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/optimization/current-rate` | Current ToD rate slot info |
| `GET` | `/api/optimization/cheapest-slots` | All rate slots ranked by price |
| `GET` | `/api/optimization/predict-bill` | Monthly bill prediction |
| `GET` | `/api/optimization/patterns` | Expensive usage patterns + carbon data |
| `GET` | `/api/optimization/tod-comparison` | Current vs optimized cost analysis |

### Billing (`/api/billing`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/billing/current` | Current month bill with breakdown |
| `GET` | `/api/billing/history` | Past 12 months billing history |
| `GET` | `/api/billing/forecast` | 3-month forward forecast |

### Tariffs (`/api/tariffs`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tariffs` | List all tariff plans |
| `POST` | `/api/tariffs` | Create tariff plan |
| `PUT` | `/api/tariffs/:id` | Update tariff plan |
| `DELETE` | `/api/tariffs/:id` | Delete tariff plan |
| `GET` | `/api/tariffs/current-rate` | Current active rate |

### Smart Meters (`/api/meters`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/meters` | List all meters |
| `POST` | `/api/meters` | Register new meter |
| `POST` | `/api/meters/:id/command` | Send remote command to meter |
| `GET` | `/api/meters/:id/commands` | Get command history for meter |

### Organizations (`/api/organizations`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/organizations` | List organizations |
| `POST` | `/api/organizations` | Create organization |
| `PUT` | `/api/organizations/:id` | Update organization |
| `DELETE` | `/api/organizations/:id` | Delete organization |

### Users (`/api/users`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users` | List all users |
| `PUT` | `/api/users/:id` | Update user (role, status) |
| `DELETE` | `/api/users/:id` | Delete user |

### Alerts (`/api/alerts`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/alerts?limit=5` | Get recent alerts |

### Analytics (`/api/analytics`) — Admin Only
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/analytics/overview` | Platform summary (orgs, users, meters, revenue) |
| `GET` | `/api/analytics/peak-load` | Hourly peak load profile |
| `GET` | `/api/analytics/revenue` | Monthly revenue trend |
| `GET` | `/api/analytics/demand-response` | Peak/off-peak distribution |
| `GET` | `/api/analytics/tenant-comparison` | Cross-organization comparison (super_admin) |

### Recommendations (`/api/recommendations`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/recommendations` | User's recommendations list |
| `PUT` | `/api/recommendations/:id` | Accept/dismiss recommendation |

---

## 6. Real-Time Architecture

```
Browser ←── WebSocket (ws://host/ws) ──→ WS Server (JWT Auth)
                                              ↑
                                        IoT Simulator
                                    (5-second intervals)
                                              ↓
                                    PostgreSQL (energy_readings)
```

### How it works:

1. **IoT Simulator** runs on the backend, generating realistic smart meter data every 5 seconds
2. Load curves vary by time of day (low at night, high during peak hours)
3. Weekend readings are 15% higher than weekday
4. Data is written to PostgreSQL and broadcast via **WebSocket**
5. WebSocket channels are **tenant-scoped** — users only receive their organization's data
6. Frontend auto-reconnects on disconnect with exponential backoff

### WebSocket Message Types:
| Type | Payload | Description |
|------|---------|-------------|
| `meter_reading` | `{ powerWatts, voltage, current }` | Live meter reading |
| `appliance_update` | `{ applianceId, currentPowerWatts }` | Appliance power change |
| `appliance_toggle` | `{ applianceId, is_on }` | Appliance toggled |
| `alert` | `{ severity, title, message }` | New alert notification |

---

## 7. Database Schema

**11 Tables** in PostgreSQL:

| # | Table | Description | Key Columns |
|---|-------|-------------|-------------|
| 1 | `organizations` | Tenant/company entities | name, slug, type, city, is_active |
| 2 | `users` | User accounts | email, role, organization_id, first_name |
| 3 | `tariff_plans` | Pricing plans | type (flat/tod/tiered), tod_rates (JSONB), base_rate |
| 4 | `smart_meters` | IoT meter devices | meter_serial, status, firmware, location, user_id |
| 5 | `appliances` | Home appliances | type, rated_power_watts, is_on, schedule (JSONB) |
| 6 | `energy_readings` | Time-series readings | timestamp, power_watts, energy_kwh, cost, tariff_type |
| 7 | `appliance_usage_logs` | Appliance usage tracking | started_at, ended_at, energy_consumed_kwh |
| 8 | `recommendations` | AI recommendations | title, type, potential_savings_cost, status |
| 9 | `billing_records` | Monthly bills | total_amount, total_kwh, billing_period |
| 10 | `alerts` | System/user alerts | severity, type, message, is_read |
| 11 | `meter_commands` | Remote command log | command_type, status, response |

---

## 8. Navigation Map & URL Reference

### Sidebar Navigation (Consumer View)
```
📊 Dashboard          → /dashboard
⚡ Appliances          → /dashboard/appliances
📈 Energy Usage        → /dashboard/energy
💡 AI Insights         → /dashboard/optimization
💳 Bills & Reports     → /dashboard/billing
```

### Sidebar Navigation (Admin View)
```
📊 Overview            → /admin
🏢 Organizations       → /admin/organizations  (super_admin only)
📊 Analytics           → /admin/analytics
📡 Meters              → /admin/meters
💲 Tariffs             → /admin/tariffs
👥 Users               → /admin/users
📻 Devices             → /admin/devices
```

### Portal Switcher
Admins see a **Consumer | Admin** toggle at the top of the sidebar, allowing them to switch between consumer and admin views instantly.

---

## 9. ToD Tariff Reference

### Rate Slots (Residential ToD Plan)

| Slot | Time Window | Rate (₹/kWh) | Type | Color |
|------|------------|---------------|------|-------|
| Off-Peak Night | 10:00 PM – 6:00 AM | ₹4.50 | 🟢 Cheapest | Green |
| Morning Standard | 6:00 AM – 9:00 AM | ₹6.50 | 🔵 Standard | Blue |
| Peak Morning | 9:00 AM – 12:00 PM | ₹9.00 | 🟡 Peak | Amber |
| Standard Afternoon | 12:00 PM – 5:00 PM | ₹7.00 | 🔵 Standard | Indigo |
| Peak Evening | 5:00 PM – 10:00 PM | ₹10.50 | 🔴 Highest | Red |

### How Savings are Calculated
- Running a 1.5kW AC for 4 hours during **off-peak** = 6 kWh × ₹4.50 = **₹27**
- Same usage during **peak evening** = 6 kWh × ₹10.50 = **₹63**
- **Savings = ₹36/session** → ~₹1,080/month

---

## 10. Demo Walkthrough Script

### For Clients — 10-Minute Demo Flow

**Step 1: Login (1 min)**
1. Open https://energy-os.vercel.app/login
2. Point out the branding panel with feature highlights
3. Click **"Consumer"** quick demo button (logs in as Rahul)

**Step 2: Consumer Dashboard (2 min)**
1. Show the greeting and rate banner (peak/off-peak awareness)
2. Walk through 4 stat cards — real-time power, today's usage, monthly bill, carbon footprint
3. Point to the hourly energy chart — "This updates in real-time"
4. Show tariff distribution donut — "35% of usage is during peak, costing more"
5. Show recommendations — "AI suggests shifting EV charging to off-peak"

**Step 3: Appliances (2 min)**
1. Click "Appliances" in sidebar
2. Toggle an AC ON/OFF — "Instant control with real-time power feedback"
3. Click "Cost" on EV Charger — "Shows predicted cost per time slot"
4. Click "Schedule" — "Users can auto-schedule to off-peak for cheaper rates"
5. Click "Add Appliance" — "Users can register any appliance"

**Step 4: Energy Analytics (1 min)**
1. Click "Energy Usage"
2. Toggle Hourly → Daily → Monthly views
3. Show peak vs off-peak distribution
4. Click "Export CSV" — "Data can be downloaded"

**Step 5: AI Optimization (1 min)**
1. Click "AI Insights"
2. Show current rate banner — "Contextual awareness of pricing"
3. Show 5 ToD rate slot cards — "Users see all rates at a glance"
4. Show recommendations with accept/dismiss — "Actionable insights"

**Step 6: Billing (1 min)**
1. Click "Bills & Reports"
2. Show current bill with breakdown
3. Switch to Forecast tab — "3-month prediction with seasonal notes"

**Step 7: Admin Portal (2 min)**
1. Logout → Login as Super Admin
2. Show admin overview with platform-wide stats
3. Click Organizations — "Multi-tenant management"
4. Click Analytics — "Revenue trends, peak load, tenant comparison"
5. Click Meters — "Remote device management with command center"
6. Click Tariffs — "Configure pricing plans"
7. Click Users — "Role-based access management"

**Closing Points:**
- "Platform handles 3 organizations with 7+ users and 6 smart meters"
- "Real-time WebSocket updates every 5 seconds"
- "AI engine identifies 10-15% savings potential"
- "Full multi-tenant data isolation"
- "Dark mode support with responsive mobile design"

---

## Appendix: Tech Stack Details

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14, React 18, TypeScript | SSR + SPA framework |
| Styling | Tailwind CSS, custom design system | Responsive UI |
| Charts | Recharts | Data visualization |
| Icons | Lucide React | 100+ consistent icons |
| Backend | Node.js, Express.js | REST API server |
| Database | PostgreSQL 15 | Multi-tenant data store |
| Auth | JWT (jsonwebtoken + bcryptjs) | Stateless authentication |
| Real-time | WebSocket (ws library) | Live data streaming |
| IoT | Custom IoT Simulator | Realistic data generation |
| Security | Helmet, CORS, Rate Limiting | Production-grade security |
| Deployment | Vercel (frontend) + Render (backend) | Cloud hosting |

---

> **Last Updated**: February 2026  
> **Version**: 1.0.0  
> **License**: MIT
