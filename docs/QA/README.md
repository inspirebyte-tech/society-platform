---

# Vaastio — QA Testing Guide

## Overview
This guide is for the manual tester. Follow it top to bottom.
One tester, one or two phones, no special tools needed.

---

## What You Need Before Starting

### Devices
- 1 Android phone (primary)
- 1 Android phone (secondary) — needed for cross-role tests
- Both phones must have internet connection

### Access You Need
- APK download link (get from Mohit)
- Render logs access: https://dashboard.render.com
  (to see OTP codes during testing)
- Neon DB console (optional, for verification)

### Test Phone Numbers
These are pre-seeded test accounts:
| Role | Phone Number |
|------|-------------|
| Builder | +919111111111 |
| Resident | +919222222222 |
| Gatekeeper | +919333333333 |
| Co-resident | +919444444444 |

For Admin tests: you will create a new admin account
during the Builder phase by inviting a fresh number.
Use a real SIM you have access to, or use
+919555555555 if it exists in the system.

---

## Installing The App

1. Download the APK from the link Mohit provides
2. On your Android phone go to Settings
3. Allow installation from unknown sources
   (Settings → Security → Unknown Sources → On)
4. Open the downloaded APK file and install
5. Open Vaastio app

If you already have the app installed:
- Uninstall first, then reinstall fresh APK
- This ensures you have the latest version

---

## How To Get OTP During Testing

Since SMS is not live yet, OTP codes appear in server logs.

1. Open browser and go to:
   https://dashboard.render.com
2. Login with credentials Mohit provides
3. Go to: vaastio-api → Logs
4. When you request OTP in the app, the log shows:
   [PILOT] OTP for +91XXXXXXXXXX: 123456
5. Enter that 6-digit code in the app

Note: OTP expires in 10 minutes.
Note: You can only request OTP 3 times per hour
per phone number. If rate limited, wait 1 hour
or use a different test number.

---

## Running The Backend Locally (Optional)

Only needed if Render is down or for debugging.
Skip this section if using production server.

### Prerequisites
- Node.js 18+ installed
- Git installed
- PostgreSQL running locally (port 5433)

### Setup Steps

Open Terminal 1 — Backend:
```bash
git clone https://github.com/inspirebyte-tech/society-platform.git
cd society-platform
npm install
cd apps/api
npm install
npm run dev
```

Server starts on port 3000. You should see:
```
Notification dispatcher initialized with 10 rules
Server running on port 3000
```

Open Terminal 2 — Mobile (Expo):
```bash
cd society-platform/apps/mobile
npm install
npx expo start
```

Scan the QR code with Expo Go app on your phone.

### Switch App To Local Server
In apps/mobile/src/constants/api.ts change DEV_API_URL
to your computer's local IP address (e.g. 192.168.1.5).

---

## Screenshot Instructions

### When To Take Screenshots
Each test case marked with 📸 requires a screenshot.
Take screenshot immediately after the expected result appears.

### How To Name Screenshots
Format: TC[number]_[short_description].png
Examples:
- TC001_login_otp_screen.png
- TC023_dashboard_builder.png
- TC045_visitor_approved.png

### Where To Save Screenshots
Create a folder on your phone/computer:
Vaastio_QA_v0.16.2/

Organize into subfolders:
Vaastio_QA_v0.16.2/
  01_auth/
  02_builder/
  03_admin/
  04_resident/
  05_gatekeeper/
  06_cross_role/
  07_edge_cases/

At end of testing, zip the folder and share with Mohit.

---

## Filling Test Results

Open docs/QA/test-results-template.md
Make a copy named: test-results-v0.16.2.md

For each test case:
- Mark PASS or FAIL
- If FAIL: write what happened instead of expected result
- Note screenshot filename
- Note any bugs in the Bugs Found section at bottom

---

## Important Notes

### Clearing App Data Between Role Tests
When switching between roles on same phone:
1. Go to Android Settings
2. Apps → Vaastio → Storage
3. Tap "Clear Data" and "Clear Cache"
4. Reopen app and login with new role

### Push Notifications
For notification tests, make sure you tap "Allow"
when app asks for notification permission.
If you missed it: Settings → Apps → Vaastio →
Notifications → Allow.

### If Something Goes Wrong
- App crashes: note which screen and what you did
- API error shown: screenshot the error message
- Cannot login: check OTP in Render logs
- Rate limited on OTP: wait 1 hour

### Known Limitations (Not Bugs)
- First app load after server idle takes 30-60 seconds
  (Render free tier cold start — this is normal)
- SMS not live yet — always use Render logs for OTP
- iOS not supported yet

---