# BarangayConnect – Barangay Bakakeng Central SK Portal

A complete, full-stack community web application for Barangay Bakakeng Central's Sangguniang Kabataan.

## Tech Stack
- **Frontend:** React 18 + Vite
- **Styling:** Tailwind CSS (Navy #1A365D · Crimson #C53030 · Gold #D69E2E)
- **Backend / Auth:** Supabase
- **Charts:** Recharts
- **Icons:** Lucide React
- **Routing:** React Router v6
- **Date utils:** date-fns

---

## Quick Setup (5 Steps)

### 1. Install Dependencies
```bash
cd barangay-connect
npm install
```

### 2. Set Up Supabase Database
1. Go to: https://zugkyfusmpojqrgxlcyt.supabase.co
2. Open **SQL Editor → New Query**
3. Paste the entire contents of `supabase-setup.sql`
4. Click **Run**

### 3. Create Storage Buckets (Supabase Dashboard)
Go to **Storage** in your Supabase dashboard and create:
- `verification-ids` — set to **Private**
- `project-images`   — set to **Public**
- `profile-pictures` — set to **Public**

For each bucket, add this **Storage Policy** (under Policies tab):
```sql
CREATE POLICY "allow_all" ON storage.objects FOR ALL USING (true) WITH CHECK (true);
```

### 4. Start the Development Server
```bash
npm run dev
```
App runs at: http://localhost:5173

### 5. Create Your Admin Account
1. Open the app and click **Sign Up**
2. Create an account with your email
3. Go back to **Supabase → SQL Editor**
4. Open `make-admin.sql` and run:
```sql
UPDATE user_roles SET role = 'super_admin' WHERE email = 'your@email.com';
```
5. Log out and log back in → you'll be redirected to `/admin/dashboard`

---

## Default Super Admin Credentials (from spec)
After signing up and promoting via SQL:
- **Email:** SkAdmin@372822023 (or any email you choose)
- **Password:** SKBAKAKENGCCx23

---

## Features Implemented

### Resident Side
- ✅ Login / Sign Up with role-based redirect
- ✅ Password show/hide toggle + strength validator
- ✅ Remember Me + Forgot Password (email reset)
- ✅ CAPTCHA checkbox verification
- ✅ Resident Profiling Form (with auto age calculation)
- ✅ Verification ID file upload to Supabase Storage
- ✅ Hero section with animated background
- ✅ Latest Announcements (live from database)
- ✅ Accomplished Projects carousel (auto-play 3s)
- ✅ 6-month calendar with event highlighting
- ✅ Feedback form (saves to database)
- ✅ Dark/light mode toggle
- ✅ Profile dropdown (View Profile, Settings, Logout)
- ✅ Logout confirmation modal
- ✅ Update profile (edit profiling form in modal)
- ✅ Change password in Settings
- ✅ Floating action button (Report Concern)

### Admin Side
- ✅ Admin Dashboard with live stat cards
- ✅ Announcement management (add / edit / delete)
- ✅ Profiling Summary table with search & filter
- ✅ Profile verification workflow (Approve / Decline)
- ✅ Demographics bar charts (Civil Status, Work Status, Youth Age Group, Classification)
- ✅ Export profiling data as CSV
- ✅ Project Management (add / edit / delete / mark complete)
- ✅ Download project reports (PDF/DOCX)
- ✅ Event Management (add / edit / delete)
- ✅ Feedback Management with statistics and charts
- ✅ ISKAI AI Chatbot (FAQ editor + live test chat)
- ✅ Role Management (change user roles inline)
- ✅ Audit Trail / Logs with search and CSV export
- ✅ Archives module
- ✅ Backup & Restore module
- ✅ Admin Settings (change password)
- ✅ All admin actions logged to audit trail

---

## Project Structure
```
src/
├── lib/supabase.js              # Supabase client
├── contexts/
│   ├── AuthContext.jsx          # Auth + role management
│   └── ToastContext.jsx         # Global toast notifications
├── components/
│   ├── UI.jsx                   # Shared: Modal, Badge, FormField, etc.
│   └── AdminLayout.jsx          # Admin sidebar + top bar
├── pages/
│   ├── LoginPage.jsx            # Login + Signup + Forgot Password
│   ├── ProfilingForm.jsx        # Resident profiling (new + update)
│   ├── Dashboard.jsx            # Resident homepage
│   └── admin/
│       ├── AdminHome.jsx        # Dashboard + Announcement management
│       ├── ProfilingSummary.jsx # Profiling table + demographics charts
│       └── AdminModules.jsx     # Projects, Events, Feedback, Chatbot,
│                                # Roles, Logs, Archives, Backup, Settings
├── App.jsx                      # Routes + protected route guards
├── main.jsx                     # Entry point
└── index.css                    # Tailwind + custom CSS
```

---

## Color Palette
| Name        | Hex       | Usage                        |
|-------------|-----------|------------------------------|
| Navy Blue   | `#1A365D` | Primary branding, headers    |
| Crimson Red | `#C53030` | CTA buttons, alerts          |
| Goldenrod   | `#D69E2E` | Secondary accents, borders   |
| Soft White  | `#F7FAFC` | Page backgrounds             |
| Charcoal    | `#2D3748` | Body text                    |

---

## Build for Production
```bash
npm run build
```
Output in `dist/` — deploy to Vercel, Netlify, or Firebase Hosting.
