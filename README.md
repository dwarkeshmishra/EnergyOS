# ⚡ Smart Energy Platform as a Service (PaaS)

> A unified smart metering super app that consolidates smart meter data, appliance-level insights, and home automation controls — enabling **10–15% cost savings** via dynamic Time-of-Day (ToD) tariff optimization.

![Node.js](https://img.shields.io/badge/Node.js-18+-green) ![Next.js](https://img.shields.io/badge/Next.js-14-black) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue) ![License](https://img.shields.io/badge/License-MIT-yellow)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 14)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │  Consumer     │  │   Admin      │  │    Login /     │ │
│  │  Dashboard    │  │   Portal     │  │    Auth        │ │
│  └──────────────┘  └──────────────┘  └────────────────┘ │
└─────────────────────┬───────────────────────────────────┘
                      │ REST API + WebSocket
┌─────────────────────┴───────────────────────────────────┐
│                   Backend (Express.js)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │  Auth    │ │  Energy  │ │  AI/ML   │ │ WebSocket  │  │
│  │  Module  │ │  Routes  │ │  Engine  │ │  Server    │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │ Billing  │ │ Tariffs  │ │  Alerts  │ │    IoT     │  │
│  │ Module   │ │  Module  │ │  System  │ │ Simulator  │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘  │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────┐
│               PostgreSQL Database (11 tables)            │
│  organizations · users · tariff_plans · smart_meters     │
│  appliances · energy_readings · appliance_usage_logs     │
│  recommendations · billing_records · alerts · commands   │
└─────────────────────────────────────────────────────────┘
```

## ✨ Key Features

### Consumer Dashboard
- **Real-time Energy Monitoring** — Live power (W), voltage (V), current (A) via WebSocket
- **Appliance Control** — ON/OFF toggle, smart scheduling, power monitoring for 10+ appliance types
- **ToD Tariff Optimization** — 5-slot Time-of-Day rates, AI-powered cheapest-slot recommendations
- **Bill Prediction & Forecasting** — Monthly projections, budget alerts, 3-month forecast with seasonal adjustment
- **Carbon Footprint Tracking** — CO₂ emissions per kWh (0.82 kg/kWh factor), tree-offset equivalents
- **Smart Recommendations** — AI-generated energy-saving suggestions with accept/dismiss workflow

### Admin Portal
- **Multi-Tenant Management** — Organization CRUD, user provisioning, meter assignment
- **Platform Analytics** — Peak load, revenue trends, demand response, tenant comparison
- **Device Management** — Remote meter commands (ping, restart, firmware update, calibrate)
- **Tariff Configuration** — ToD rate slot management, plan creation, meter assignment

### Technical Highlights
- **Multi-tenant SaaS** with organization-level data isolation
- **RBAC** — 3 roles: `super_admin`, `tenant_admin`, `user`
- **Real-time IoT simulation** with realistic time-of-day load curves
- **WebSocket** with JWT authentication and tenant-scoped broadcasting
- **AI Optimization Engine** — ToD rate analysis, expense pattern detection, scheduling optimization

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+
- **PostgreSQL** 15+
- **npm** or **yarn**

### 1. Clone & Install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
# backend/.env
cp .env.example .env
# Edit with your PostgreSQL credentials:
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=energy_paas
# DB_USER=postgres
# DB_PASSWORD=your_password
# JWT_SECRET=your-super-secret-key
```

### 3. Setup Database

```bash
cd backend

# Create the database
psql -U postgres -c "CREATE DATABASE energy_paas;"

# Run migrations (creates 11 tables + indexes + views)
node src/database/migrate.js

# Seed demo data (3 orgs, 7 users, meters, 30 days of readings)
node src/database/seed.js
```

### 4. Start Development

```bash
# Terminal 1: Backend (port 4000)
cd backend
npm run dev

# Terminal 2: Frontend (port 3000)
cd frontend
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## 🔑 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `superadmin@energypaas.com` | `password123` |
| Tenant Admin | `admin@greencity.com` | `password123` |
| Consumer | `rahul@greencity.com` | `password123` |
| Consumer | `priya@greencity.com` | `password123` |

> Quick-login buttons are available on the login page for instant demo access.

---

## 📁 Project Structure

```
├── backend/
│   ├── src/
│   │   ├── config/          # App config, DB connection
│   │   ├── database/        # Migration & seed scripts
│   │   ├── middleware/       # Auth, error handler, validators
│   │   ├── routes/          # 12 API route modules
│   │   │   ├── auth.js          # Login, register, profile
│   │   │   ├── organizations.js # Tenant CRUD
│   │   │   ├── meters.js        # Smart meter mgmt + commands
│   │   │   ├── appliances.js    # Appliance CRUD, toggle, schedule
│   │   │   ├── energy.js        # Realtime, hourly, daily, monthly, export
│   │   │   ├── tariffs.js       # Tariff CRUD, current rate
│   │   │   ├── billing.js       # Current bill, history, forecast
│   │   │   ├── users.js         # User management
│   │   │   ├── recommendations.js  # AI recommendations
│   │   │   ├── alerts.js        # Alert system
│   │   │   ├── analytics.js     # Platform analytics
│   │   │   └── optimization.js  # AI optimization endpoints
│   │   ├── services/
│   │   │   ├── aiOptimization.js   # ToD pricing engine
│   │   │   ├── iotSimulator.js     # Realistic IoT data generator
│   │   │   └── websocket.js        # WebSocket server
│   │   └── app.js           # Express entry point
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── login/page.tsx       # Auth UI
│   │   │   ├── dashboard/           # Consumer portal
│   │   │   │   ├── page.tsx             # Main dashboard
│   │   │   │   ├── appliances/page.tsx  # Appliance control
│   │   │   │   ├── energy/page.tsx      # Energy analytics
│   │   │   │   ├── optimization/page.tsx # AI insights
│   │   │   │   └── billing/page.tsx     # Bills & reports
│   │   │   └── admin/               # Admin portal
│   │   │       ├── page.tsx             # Overview dashboard
│   │   │       ├── organizations/       # Tenant management
│   │   │       ├── analytics/           # Platform analytics
│   │   │       ├── meters/              # Device monitoring
│   │   │       ├── tariffs/             # Rate management
│   │   │       ├── users/               # User management
│   │   │       └── devices/             # Remote commands
│   │   ├── components/
│   │   │   ├── Sidebar.tsx          # Navigation sidebar
│   │   │   ├── StatCard.tsx         # Metric display card
│   │   │   └── Charts.tsx           # Recharts components
│   │   └── providers.tsx        # Auth, Theme, WebSocket contexts
│   └── package.json
└── README.md
```

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login (returns JWT) |
| GET | `/api/auth/me` | Get current user profile |

### Energy Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/energy/realtime` | Live meter readings |
| GET | `/api/energy/hourly` | Hourly consumption |
| GET | `/api/energy/daily` | Daily breakdown |
| GET | `/api/energy/monthly` | Monthly comparison |
| GET | `/api/energy/summary` | Dashboard summary |
| GET | `/api/energy/export` | CSV export |

### AI & Optimization
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/optimization/current-rate` | Current ToD rate slot |
| GET | `/api/optimization/cheapest-slots` | All rate slots ranked |
| GET | `/api/optimization/predict-bill` | Monthly bill prediction |
| GET | `/api/optimization/patterns` | Expensive usage patterns |
| GET | `/api/optimization/tod-comparison` | Current vs optimized cost |

### Appliances
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/appliances` | List user appliances |
| POST | `/api/appliances` | Add appliance |
| PUT | `/api/appliances/:id/toggle` | Toggle ON/OFF |
| PUT | `/api/appliances/:id/schedule` | Set schedule |
| GET | `/api/appliances/:id/predicted-cost` | Cost by ToD slot |

---

## ⚙️ ToD Tariff Rate Structure

| Slot | Time | Rate (₹/kWh) | Type |
|------|------|---------------|------|
| Off-Peak Night | 10 PM – 6 AM | ₹4.50 | 🟢 Cheapest |
| Morning Standard | 6 AM – 10 AM | ₹6.50 | 🔵 Standard |
| Afternoon Peak | 10 AM – 2 PM | ₹9.00 | 🟡 Peak |
| Evening Super Peak | 2 PM – 6 PM | ₹10.50 | 🔴 Highest |
| Night Standard | 6 PM – 10 PM | ₹7.00 | 🔵 Standard |

---

## 🧠 AI Optimization Engine

The platform includes an AI-powered optimization engine that:

1. **Identifies cheapest time slots** for running high-power appliances
2. **Predicts monthly bills** based on current consumption patterns
3. **Detects expensive patterns** (e.g., running AC during super-peak)
4. **Calculates scheduling savings** — potential ₹ saved by shifting to off-peak
5. **Tracks carbon footprint** — 0.82 kg CO₂ per kWh consumed
6. **Generates smart recommendations** — personalized energy-saving tips

---

## 🌐 Real-Time Architecture

```
Browser ←──WebSocket──→ WS Server (JWT Auth)
                              ↑
                        IoT Simulator
                    (5-sec intervals)
                              ↓
                    PostgreSQL (readings)
```

- **IoT Simulator** generates realistic meter data with time-of-day load curves
- **WebSocket** broadcasts to tenant-scoped channels
- **Live updates**: Power, voltage, current, appliance status, alerts
- **Auto-reconnect** on disconnect with exponential backoff

---

## 📊 Hackathon Success Metrics

| Metric | Target | Implementation |
|--------|--------|----------------|
| Onboarding Time | < 5 min | Quick demo login, auto-created appliances |
| Controllable Appliances | ≥ 3 | 10+ types with ON/OFF + scheduling |
| Cost Savings | 10–15% | ToD optimization + AI recommendations |
| Uptime | ≥ 99% | Health checks, error handling, auto-reconnect |
| CO₂ Tracking | Visible | Per-kWh carbon factor, monthly tracking |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Charts | Recharts |
| Icons | Lucide React |
| Backend | Node.js, Express.js |
| Database | PostgreSQL 15 |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Real-time | WebSocket (ws library) |
| Security | Helmet, CORS, Rate Limiting |

---

## 📜 License

MIT — Built for SIH / Smart Energy Hackathon 2025
