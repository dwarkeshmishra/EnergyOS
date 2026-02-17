# 🧪 EnergyOS — Testing Guide

> **Live App**: https://energy-os.vercel.app  
> **API Health Check**: https://energyos.onrender.com/api/health  
> ⚠️ First load may take ~30 seconds (free-tier server wakes up on demand)

---

## 📋 Test Accounts

| Role | Email | Password | What you can access |
|------|-------|----------|-------------------|
| **Super Admin** | superadmin@energypaas.com | password123 | Full admin portal + consumer dashboard |
| **Tenant Admin** | admin@greencity.com | password123 | Admin portal (GreenCity org) + consumer dashboard |
| **Consumer** | rahul@greencity.com | password123 | Consumer dashboard only |
| **Consumer** | anjali@greencity.com | password123 | Consumer dashboard only |
| **Consumer** | vikram@smarttech.com | password123 | Consumer dashboard (SmartTech org) |

---

## 🔐 Module 1: Authentication

### Test 1.1 — Login
1. Go to https://energy-os.vercel.app/login
2. Click **"Already have an account? Sign in"** (bottom of page)
3. Enter `rahul@greencity.com` / `password123`
4. Click **Sign In**
5. ✅ **Expected**: Redirected to `/dashboard` with greeting "Hello, Rahul"

### Test 1.2 — Login with Wrong Password
1. On the login page, click **Sign in**
2. Enter `rahul@greencity.com` / `wrongpassword`
3. ✅ **Expected**: Error message like "Invalid credentials"

### Test 1.3 — Sign Up (New Account)
1. Go to https://energy-os.vercel.app/login
2. Fill in:
   - First Name: `Test`
   - Last Name: `User`
   - Email: `testuser@example.com`
   - Password: `test12345`
   - Organization: Select **GreenCity Apartments**
3. Click **Create Account**
4. ✅ **Expected**: Account created, redirected to dashboard
5. 🔄 **Cleanup**: You can continue using this account or log out and use the pre-seeded ones

### Test 1.4 — Logout
1. While logged in, click the **Logout** button (sidebar or profile menu)
2. ✅ **Expected**: Redirected to `/login` page, session cleared

### Test 1.5 — Role-Based Access
1. Log in as `rahul@greencity.com` (role: user)
2. Try navigating to https://energy-os.vercel.app/admin
3. ✅ **Expected**: Redirected away or access denied (only admins can access `/admin`)
4. Log in as `superadmin@energypaas.com`
5. Navigate to `/admin`
6. ✅ **Expected**: Full admin dashboard loads

---

## 📊 Module 2: Consumer Dashboard

> Log in as `rahul@greencity.com` / `password123` for all tests below.

### Test 2.1 — Main Dashboard (`/dashboard`)
1. After login, you should be on the dashboard
2. ✅ **Verify these elements are visible**:
   - [ ] Current power consumption (kW) card
   - [ ] Today's energy usage (kWh) card
   - [ ] Current month's bill (₹) card
   - [ ] Carbon footprint card
   - [ ] Energy usage chart (line/area chart)
   - [ ] Recent activity or alerts section
3. ✅ **Expected**: All cards show numeric values (not zeros or errors), chart renders with data

### Test 2.2 — Appliances Page (`/dashboard/appliances`)
1. Click **Appliances** in the sidebar
2. ✅ **Verify**:
   - [ ] Grid of appliance cards is displayed (AC, Refrigerator, Washing Machine, etc.)
   - [ ] Each card shows: name, power rating (watts), status (ON/OFF)
   - [ ] Power consumption bar is visible on each card
3. **Test Toggle**: Click the ON/OFF toggle on any appliance
   - ✅ **Expected**: Status changes (ON ↔ OFF), UI updates
4. **Test Scheduling**: Click on an appliance card to open details
   - ✅ **Expected**: Scheduling modal or detail view opens
5. **Test Add Appliance**: Look for an "Add Appliance" button
   - ✅ **Expected**: Modal opens with fields for name, type, power rating

### Test 2.3 — Energy Page (`/dashboard/energy`)
1. Click **Energy** in the sidebar
2. ✅ **Verify**:
   - [ ] Time period selector (Hourly / Daily / Monthly)
   - [ ] Date navigation arrows (← →)
   - [ ] Energy consumption chart
   - [ ] Peak vs Off-Peak breakdown
   - [ ] Usage insights cards
3. **Test Time Toggle**: Switch between Hourly → Daily → Monthly
   - ✅ **Expected**: Chart reloads with appropriate data for each view
4. **Test Date Navigation**: Click the date arrows
   - ✅ **Expected**: Data changes to show different date ranges

### Test 2.4 — Optimization Page (`/dashboard/optimization`)
1. Click **Optimization** in the sidebar
2. ✅ **Verify**:
   - [ ] Current electricity rate banner (with gradient)
   - [ ] Predicted monthly bill
   - [ ] Potential savings amount
   - [ ] Carbon footprint metric
   - [ ] Time-of-Day (ToD) visualization showing 5 rate slots
   - [ ] Smart recommendations list
3. **Test Recommendation Actions**: Find a recommendation card
   - Click **Accept** → ✅ Status should update to "accepted"
   - Click **Dismiss** on another → ✅ Should be dismissed
4. **ToD Slots**: Verify 5 time slots are shown:
   - Off-Peak Night (10 PM – 6 AM)
   - Standard Morning (6 AM – 9 AM)
   - Peak Morning (9 AM – 12 PM)
   - Standard Afternoon (12 PM – 5 PM)
   - Peak Evening (5 PM – 10 PM)

### Test 2.5 — Billing Page (`/dashboard/billing`)
1. Click **Billing** in the sidebar
2. ✅ **Verify Tabs**: Current | History | Forecast
3. **Current Tab**:
   - [ ] Bill breakdown by rate tier (peak, off-peak, standard)
   - [ ] Total amount
   - [ ] Savings opportunity callout
4. **History Tab**:
   - [ ] Table of past bills
   - [ ] Chart showing billing trend
5. **Forecast Tab**:
   - [ ] 3-month projected bills
   - [ ] Budget alert indicator (if applicable)

---

## 🛡️ Module 3: Admin Portal

> Log in as `superadmin@energypaas.com` / `password123` for all admin tests.

### Test 3.1 — Admin Overview (`/admin`)
1. Navigate to `/admin`
2. ✅ **Verify**:
   - [ ] Stat cards: Total Organizations, Total Users, Active Meters, Revenue
   - [ ] Energy trend chart
   - [ ] Recent alerts list
   - [ ] Organization distribution donut chart
   - [ ] System status indicators

### Test 3.2 — Organizations Management (`/admin/organizations`)
1. Click **Organizations** in admin sidebar
2. ✅ **Verify**:
   - [ ] Organization cards displayed (GreenCity Apartments, SmartTech Office Park, Metro Utility Corp)
   - [ ] Each card shows: name, type, user count, meter count
   - [ ] Search bar works (type "Green" → only GreenCity shows)
3. **Test Edit**: Click edit on an organization
   - ✅ **Expected**: Edit form opens with current data
4. **Test Add**: Click "Add Organization" button
   - ✅ **Expected**: Form opens for creating a new org

### Test 3.3 — Analytics (`/admin/analytics`)
1. Click **Analytics** in admin sidebar
2. ✅ **Verify**:
   - [ ] Peak load analysis chart
   - [ ] Revenue trends chart
   - [ ] Demand response donut chart
   - [ ] Tenant comparison metrics

### Test 3.4 — Smart Meters (`/admin/meters`)
1. Click **Meters** in admin sidebar
2. ✅ **Verify**:
   - [ ] Table of smart meters with columns: Serial, Location, Status, Organization
   - [ ] Status badges (online/offline)
3. **Test Remote Commands**: Select a meter and try:
   - **Ping** → ✅ Shows response
   - **Restart** → ✅ Shows command sent confirmation
   - **Read** → ✅ Shows current reading
4. **Command History**: Recent commands should appear in the history section

### Test 3.5 — Tariff Plans (`/admin/tariffs`)
1. Click **Tariffs** in admin sidebar
2. ✅ **Verify**:
   - [ ] List of tariff plans (Residential ToD, Commercial Flat, Utility Tiered)
   - [ ] Each plan shows type and rate visualization
3. **Test Create Plan**: Click "Create Plan"
   - Fill in name, select type (ToD)
   - Configure 5 time-slot rates
   - ✅ **Expected**: Plan created successfully

### Test 3.6 — User Management (`/admin/users`)
1. Click **Users** in admin sidebar
2. ✅ **Verify**:
   - [ ] User table with: Name, Email, Role, Organization, Status
   - [ ] Role dropdown (super_admin, tenant_admin, user)
3. **Test Role Change**: Change a user's role using the dropdown
   - ✅ **Expected**: Role updates (⚠️ don't change superadmin's own role!)
4. **Test Add User**: Click "Add User"
   - ✅ **Expected**: Modal with fields for name, email, password, role, org

### Test 3.7 — Devices (`/admin/devices`)
1. Click **Devices** in admin sidebar
2. ✅ **Verify**:
   - [ ] Device status grid
   - [ ] Remote command center
   - [ ] Command history table

---

## 🌗 Module 4: Theme & UI

### Test 4.1 — Dark Mode Toggle
1. Find the dark mode toggle (sun/moon icon in sidebar or header)
2. Click it
3. ✅ **Expected**: Entire UI switches to dark theme
4. Refresh the page
5. ✅ **Expected**: Dark mode persists after refresh

### Test 4.2 — Responsive Design
1. Open the app on your phone (or resize browser to mobile width)
2. ✅ **Verify**:
   - [ ] Sidebar collapses to a hamburger menu
   - [ ] Dashboard cards stack vertically
   - [ ] Charts resize properly
   - [ ] Login page is usable on mobile

### Test 4.3 — Navigation
1. ✅ **Verify sidebar links**:
   - Consumer: Dashboard, Appliances, Energy, Optimization, Billing
   - Admin: Overview, Organizations, Analytics, Meters, Tariffs, Users, Devices
2. Click each link
3. ✅ **Expected**: Each page loads without errors, no blank pages

---

## ⚡ Module 5: Real-Time Features

### Test 5.1 — WebSocket Connection
1. Log in and open browser DevTools → Console tab
2. ✅ **Expected**: You should see `[WS] Connected` in console
3. Wait 10-15 seconds
4. ✅ **Expected**: Live data messages appear (energy readings update)

### Test 5.2 — Live Dashboard Updates
1. Stay on the main dashboard for 30+ seconds
2. ✅ **Expected**: Power/energy values update periodically without page refresh

---

## 🔄 Module 6: Multi-Tenancy

### Test 6.1 — Data Isolation
1. Log in as `rahul@greencity.com` (GreenCity org)
2. Note the appliances and energy data shown
3. Log out, then log in as `vikram@smarttech.com` (SmartTech org)
4. ✅ **Expected**: Different appliances and energy data (SmartTech data, not GreenCity)
5. ✅ **Key**: Users should ONLY see data from their own organization

### Test 6.2 — Organization Context
1. As any user, check the sidebar or header
2. ✅ **Expected**: Organization name is displayed (e.g., "GreenCity Apartments")

---

## 🐛 Bug Report Template

If you find any issues, please report them using this format:

```
**Page**: (e.g., /dashboard/energy)
**Account Used**: (e.g., rahul@greencity.com)
**Steps to Reproduce**:
1. ...
2. ...
3. ...
**Expected Behavior**: What should happen
**Actual Behavior**: What actually happened
**Screenshot**: (if possible)
**Browser**: (Chrome/Firefox/Safari + version)
**Device**: (Desktop/Mobile + OS)
```

---

## 📊 Test Summary Checklist

| # | Module | Test | Pass? |
|---|--------|------|-------|
| 1.1 | Auth | Login with valid credentials | ⬜ |
| 1.2 | Auth | Login with wrong password | ⬜ |
| 1.3 | Auth | Sign up new account | ⬜ |
| 1.4 | Auth | Logout | ⬜ |
| 1.5 | Auth | Role-based access control | ⬜ |
| 2.1 | Dashboard | Main dashboard loads with data | ⬜ |
| 2.2 | Appliances | Appliance list, toggle, add | ⬜ |
| 2.3 | Energy | Charts with time toggles | ⬜ |
| 2.4 | Optimization | ToD rates, recommendations | ⬜ |
| 2.5 | Billing | Current/history/forecast tabs | ⬜ |
| 3.1 | Admin | Overview stats & charts | ⬜ |
| 3.2 | Admin | Organizations CRUD | ⬜ |
| 3.3 | Admin | Analytics charts | ⬜ |
| 3.4 | Admin | Meters & remote commands | ⬜ |
| 3.5 | Admin | Tariff plans management | ⬜ |
| 3.6 | Admin | User management | ⬜ |
| 3.7 | Admin | Devices management | ⬜ |
| 4.1 | UI | Dark mode toggle & persistence | ⬜ |
| 4.2 | UI | Responsive/mobile layout | ⬜ |
| 4.3 | UI | All sidebar navigation works | ⬜ |
| 5.1 | Realtime | WebSocket connects | ⬜ |
| 5.2 | Realtime | Live data updates on dashboard | ⬜ |
| 6.1 | Multi-tenant | Data isolation between orgs | ⬜ |
| 6.2 | Multi-tenant | Org name displayed correctly | ⬜ |

---

> **Thank you for testing! 🙏**  
> Please send your completed checklist and any bug reports back.
