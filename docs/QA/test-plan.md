# Vaastio — Manual Test Plan v0.16.2

**Total Test Cases:** 127
**Estimated Time:** 6-8 hours (can split across 2 days)
**Phones Required:** 1 (2 for cross-role tests in Phase 5)

---

## Legend
📸 = Take screenshot
⚠️ = Edge case / error test
🔄 = Requires second phone or role switch

---

## Test Data Setup

Before starting, note these details:
- Builder phone: +919111111111
- Resident phone: +919222222222  
- Gatekeeper phone: +919333333333
- Co-resident phone: +919444444444
- Admin phone: use a fresh number you have access to
- Society name in system: (check with Mohit)
- OTP: always check Render logs at dashboard.render.com

---

## PHASE 1 — Authentication
*Login as Builder: +919111111111*

| ID | Step | Expected Result | 📸 | Pass/Fail |
|----|------|----------------|-----|-----------|
| TC001 | Open app fresh | Welcome/login screen shown | 📸 | |
| TC002 | Enter phone +919111111111, tap Send OTP | "OTP sent" message shown | | |
| TC003 | Check Render logs for OTP | 6-digit OTP visible in logs | | |
| TC004 | Enter correct OTP | Login successful, dashboard loads | 📸 | |
| TC005 | Tap profile icon or name | Profile screen opens | 📸 | |
| TC006 | Verify name and phone shown correctly | Builder name and +919111111111 shown | | |
| TC007 | Tap logout | Returns to login screen | 📸 | |
| TC008 ⚠️ | Enter invalid phone 12345 | Error shown — invalid phone | | |
| TC009 ⚠️ | Enter phone, request OTP, enter wrong OTP | Error shown — invalid OTP | | |
| TC010 ⚠️ | Enter wrong OTP 3 times | Account temporarily locked or error | 📸 | |
| TC011 | Login again with correct OTP | Login successful | | |

---

## PHASE 2 — Builder: Society Setup
*Stay logged in as Builder*

### 2A — Dashboard
| ID | Step | Expected Result | 📸 | Pass/Fail |
|----|------|----------------|-----|-----------|
| TC012 | View dashboard | Society name, address, stats visible | 📸 | |
| TC013 | Tap society card | Society Info screen opens | 📸 | |
| TC014 | Verify Society Info shows name, type, address | All fields visible | | |
| TC015 | Go back, tap gear icon (top right) | Society Settings screen opens | 📸 | |

### 2B — Society Settings
| ID | Step | Expected Result | 📸 | Pass/Fail |
|----|------|----------------|-----|-----------|
| TC016 | Tap change photo, select from gallery | Photo preview shown | 📸 | |
| TC017 | Fill contact phone: 9876543210 | Field accepts input | | |
| TC018 | Fill contact email: test@vaastio.com | Field accepts input | | |
| TC019 | Fill description: "Test society description" | Field accepts input | | |
| TC020 | Tap Save Changes | Success toast, navigate back | 📸 | |
| TC021 | Tap society card on dashboard | Society photo, contact, description visible | 📸 | |
| TC022 ⚠️ | Go to settings, enter invalid email: notanemail | Error shown on save | | |
| TC023 ⚠️ | Enter pincode: 12345 (5 digits) | Error — must be 6 digits | | |

### 2C — Structure Management
| ID | Step | Expected Result | 📸 | Pass/Fail |
|----|------|----------------|-----|-----------|
| TC024 | Tap Structure tile on dashboard | Structure screen opens, tree visible | 📸 | |
| TC025 | Tap + to add a node (Tower A) | Add node screen opens | | |
| TC026 | Enter name: Tower A, type: Tower, tap Save | Tower A appears in tree | 📸 | |
| TC027 | Tap Tower A, add child: Floor 1 (type: Floor) | Floor 1 appears under Tower A | | |
| TC028 | Tap Floor 1, add child: Flat 101 (type: Unit) | Flat 101 appears under Floor 1 | 📸 | |
| TC029 | Add 2 more units: Flat 102, Flat 103 | All 3 flats visible in tree | | |
| TC030 ⚠️ | Try adding node with same code as existing | Error — duplicate code | | |
| TC031 | Tap Unit Inventory tile | All units listed with vacancy status | 📸 | |

### 2D — Member Management
| ID | Step | Expected Result | 📸 | Pass/Fail |
|----|------|----------------|-----|-----------|
| TC032 | Tap Members tile | Members list screen opens | 📸 | |
| TC033 | Tap + icon (top right) | Alert: Invite via SMS / Add Directly | 📸 | |
| TC034 | Tap Invite via SMS | Invite Member screen opens | 📸 | |
| TC035 | Enter admin phone number, select role Admin, tap Invite | Invitation sent, pending member appears | 📸 | |
| TC036 | Go back, tap + again, tap Add Directly | Direct Add screen opens | 📸 | |
| TC037 | Enter name: Test Resident, phone: +919222222222, role: Resident | Fields filled | | |
| TC038 | Select unit: Flat 101, occupancy type: Owner Resident | Unit picker shows vacant/occupied status | 📸 | |
| TC039 | Tap Add Member | Success toast, member appears in list | 📸 | |
| TC040 ⚠️ | Try adding same phone again (+919222222222) | Error — already a member | | |
| TC041 | Direct add Gatekeeper: +919333333333, role: Gatekeeper, no unit | Success | | |
| TC042 | Tap on Test Resident in members list | Member detail screen opens | 📸 | |
| TC043 | Verify unit assignment shows Flat 101 | Flat 101 shown with occupancy type | | |
| TC044 | Tap Assign Unit | Unit assignment screen opens | 📸 | |
| TC045 | Assign Flat 102 to resident as Co-resident | Assignment saved | 📸 | |
| TC046 | Go back to member detail | Two End Occupancy buttons visible | 📸 | |
| TC047 | Tap End Occupancy — Flat 102 | Confirmation sheet shown | 📸 | |
| TC048 | Confirm end occupancy | Success, Flat 102 button disappears | 📸 | |
| TC049 | Verify only Flat 101 occupancy remains | One button shown | | |

### 2E — Announcements
| ID | Step | Expected Result | 📸 | Pass/Fail |
|----|------|----------------|-----|-----------|
| TC050 | Tap Announcements tile | Announcements list opens | 📸 | |
| TC051 | Tap + to create announcement | Create announcement screen | 📸 | |
| TC052 | Enter title: "Test Announcement", body: "This is a test", category: General | Fields filled | | |
| TC053 | Tap Post | Announcement appears in list | 📸 | |
| TC054 | Create 5 more announcements with different categories | All appear in list | | |
| TC055 | Tap a category filter chip | List filters correctly | 📸 | |
| TC056 | Scroll to bottom of long list | Loads more if available | | |
| TC057 | Pull to refresh | List reloads | | |
| TC058 ⚠️ | Try creating announcement with empty title | Error shown | | |

### 2F — Complaints
| ID | Step | Expected Result | 📸 | Pass/Fail |
|----|------|----------------|-----|-----------|
| TC059 | Tap Complaints tile | Complaints list opens | 📸 | |
| TC060 | Tap + to raise complaint | Raise complaint screen | 📸 | |
| TC061 | Enter title, description, category: Water Supply | Fields filled | | |
| TC062 | Tap Submit | Complaint appears in list | 📸 | |
| TC063 | Tap complaint | Detail screen opens | 📸 | |
| TC064 | Tap Resolve | Complaint marked resolved | 📸 | |

---

## PHASE 3 — Admin Role
*Clear app data. Login as Admin (the number you invited in TC035)*
*Accept the SMS invitation first if not done*

### 3A — Admin Dashboard
| ID | Step | Expected Result | 📸 | Pass/Fail |
|----|------|----------------|-----|-----------|
| TC065 | Login as Admin | Dashboard loads with Admin role | 📸 | |
| TC066 | Verify tiles visible: Members, Structure, Complaints, Announcements | All tiles shown | 📸 | |
| TC067 | Verify NO gear icon for society settings structural fields | Society settings opens but name/address not editable | | |
| TC068 | Tap gear icon → Society Settings | Can edit photo, contact, description only | 📸 | |
| TC069 ⚠️ | Try editing society name field | Field should not be present or editable | | |

### 3B — Admin Structure Management
| ID | Step | Expected Result | 📸 | Pass/Fail |
|----|------|----------------|-----|-----------|
| TC070 | Tap Structure tile | Structure tree visible | 📸 | |
| TC071 | Tap + to add new unit: Flat 104 under Floor 1 | Node created successfully | 📸 | |
| TC072 | Tap Flat 104, tap delete | Confirmation shown | | |
| TC073 | Confirm delete | Flat 104 removed from tree | 📸 | |

### 3C — Admin Member Management
| ID | Step | Expected Result | 📸 | Pass/Fail |
|----|------|----------------|-----|-----------|
| TC074 | Tap Members | Members list with all members | 📸 | |
| TC075 | Tap + → Add Directly | Direct add screen opens | | |
| TC076 | Try adding Admin role | Error — Admin cannot add Admin | 📸 | |
| TC077 | Try adding Builder role | Error — Admin cannot add Builder | | |
| TC078 | Add Resident role successfully | Success | 📸 | |
| TC079 | Tap a member → Member Detail | Detail screen opens | 📸 | |
| TC080 | Tap Remove Access on active member | Confirmation shown | | |
| TC081 | Confirm deactivation | Member moves to Inactive section | 📸 | |
| TC082 ⚠️ | Try deactivating last Admin when no Builder | Error — last admin no builder | | |

---

## PHASE 4 — Resident Role
*Clear app data. Login as Resident: +919222222222*

### 4A — Resident Dashboard
| ID | Step | Expected Result | 📸 | Pass/Fail |
|----|------|----------------|-----|-----------|
| TC083 | Login as Resident | Dashboard loads with Resident role | 📸 | |
| TC084 | Verify tiles: My Home, Complaints, Announcements, My Visitors | Correct tiles shown | 📸 | |
| TC085 | Verify NO Structure, NO Members, NO Unit Inventory tiles | These should not appear | | |
| TC086 | Tap society card | Society Info screen — read only | 📸 | |
| TC087 | Verify no Edit button on Society Info | Cannot edit | | |

### 4B — My Home
| ID | Step | Expected Result | 📸 | Pass/Fail |
|----|------|----------------|-----|-----------|
| TC088 | Tap My Home | Unit details screen opens | 📸 | |
| TC089 | Verify Flat 101 shown with correct details | Unit name, occupancy type visible | | |
| TC090 | Verify owner/occupant info shown | Name and role visible | | |

### 4C — Visitor Management (Resident)
| ID | Step | Expected Result | 📸 | Pass/Fail |
|----|------|----------------|-----|-----------|
| TC091 | Tap My Visitors | Visitors screen opens | 📸 | |
| TC092 | Tap Pre-Approvals tab | Pre-approvals list shown | | |
| TC093 | Tap + to create pre-approval | Pre-approval form opens | 📸 | |
| TC094 | Enter visitor name: John Doe, select Flat 101 | Fields filled | | |
| TC095 | Tap Save | Pre-approval created | 📸 | |
| TC096 | Verify pre-approval appears in list | John Doe visible | | |
| TC097 | Tap cancel on pre-approval | Confirmation shown | | |
| TC098 | Confirm cancel | Pre-approval removed | 📸 | |

### 4D — Complaints (Resident)
| ID | Step | Expected Result | 📸 | Pass/Fail |
|----|------|----------------|-----|-----------|
| TC099 | Tap Complaints | Own complaints visible | 📸 | |
| TC100 | Raise new complaint: Electricity issue | Complaint created | 📸 | |
| TC101 | Verify only own complaints visible | Cannot see other residents' complaints | | |

### 4E — Announcements (Resident)
| ID | Step | Expected Result | 📸 | Pass/Fail |
|----|------|----------------|-----|-----------|
| TC102 | Tap Announcements | All society announcements visible | 📸 | |
| TC103 | Tap category filter | Filter works correctly | 📸 | |
| TC104 | Tap an announcement | Detail screen opens | 📸 | |
| TC105 | Scroll to bottom | Infinite scroll loads more | | |

### 4F — Profile
| ID | Step | Expected Result | 📸 | Pass/Fail |
|----|------|----------------|-----|-----------|
| TC106 | Tap profile | Profile screen opens | 📸 | |
| TC107 | Change profile photo | Photo updated | 📸 | |
| TC108 | Change display name | Name updated | 📸 | |

---

## PHASE 5 — Gatekeeper Role
*Clear app data. Login as Gatekeeper: +919333333333*

### 5A — Gatekeeper Dashboard
| ID | Step | Expected Result | 📸 | Pass/Fail |
|----|------|----------------|-----|-----------|
| TC109 | Login as Gatekeeper | Dashboard loads with Gatekeeper role | 📸 | |
| TC110 | Verify tiles: Log Visitor, Active Visitors, Entry Log | Correct tiles shown | 📸 | |
| TC111 | Verify NO Complaints, NO Announcements, NO Members tiles | Should not appear | | |

### 5B — Log Visitor
| ID | Step | Expected Result | 📸 | Pass/Fail |
|----|------|----------------|-----|-----------|
| TC112 | Tap Log Visitor | Log visitor form opens | 📸 | |
| TC113 | Enter visitor name: Ravi Kumar, type: Individual | Fields filled | | |
| TC114 | Select unit: Flat 101 | Unit selected | | |
| TC115 | Tap Log Entry | Entry created, resident notified | 📸 | |
| TC116 | Verify entry appears in Active Visitors | Ravi Kumar shown as PENDING | 📸 | |
| TC117 | Tap Entry Log | Recent entries visible | 📸 | |

---

## PHASE 6 — Cross-Role Tests
*Requires 2 phones for notification tests*
*Phone 1: Gatekeeper. Phone 2: Resident*

| ID | Step | Expected Result | 📸 | Pass/Fail |
|----|------|----------------|-----|-----------|
| TC118 🔄 | Gatekeeper logs visitor for Flat 101 | Entry created | | |
| TC119 🔄 | Resident receives push notification | Bell badge updates, notification visible | 📸 | |
| TC120 🔄 | Resident taps notification | Takes to visitor approval screen | 📸 | |
| TC121 🔄 | Resident taps Approve | Visitor status changes to ALLOWED | 📸 | |
| TC122 🔄 | Gatekeeper checks Active Visitors | Status shows ALLOWED | 📸 | |
| TC123 🔄 | Log another visitor, Resident taps Deny | Status changes to DENIED | 📸 | |
| TC124 🔄 | Gatekeeper checks — status shows DENIED | Correct status shown | 📸 | |

---

## PHASE 7 — Society Handover
*Login as Builder: +919111111111*
*Use a throwaway test society for this test*
*Create a new society first, add an Admin to it*

| ID | Step | Expected Result | 📸 | Pass/Fail |
|----|------|----------------|-----|-----------|
| TC125 | Builder goes to Society Settings | Settings screen opens | | |
| TC126 | Scroll to bottom — Danger Zone visible | Leave Society button shown in red | 📸 | |
| TC127 ⚠️ | Try to leave society with no Admin | Error: Add an Admin first | 📸 | |
| TC128 | (Ensure Admin exists) Tap Leave Society | First confirmation dialog shown | 📸 | |
| TC129 | Tap Continue | Second confirmation shown | 📸 | |
| TC130 | Tap Yes Leave Society | App navigates to Create Society screen | 📸 | |
| TC131 | Verify green success banner shown | "Society handed over successfully" | 📸 | |
| TC132 | Login as Admin of that society | Admin sees society, Builder gone from active members | 📸 | |

---

## PHASE 8 — Edge Cases
*Login as Builder or Admin as needed*

| ID | Step | Expected Result | 📸 | Pass/Fail |
|----|------|----------------|-----|-----------|
| TC133 ⚠️ | Create society with 5-digit pincode | Error — must be 6 digits | | |
| TC134 ⚠️ | Create complaint with empty title | Error shown | | |
| TC135 ⚠️ | Create announcement with empty body | Error shown | | |
| TC136 ⚠️ | Add member with invalid phone: 123 | Error — invalid phone format | | |
| TC137 ⚠️ | Assign unit that already has primary owner as primary owner again | Error — primary owner exists | | |
| TC138 ⚠️ | Add member with phone already in system as active | Error — already a member | | |
| TC139 ⚠️ | Add member with phone of deactivated member | Reactivation prompt shown | 📸 | |
| TC140 ⚠️ | Try to deactivate self (Builder deactivates own account) | Error — cannot deactivate self | | |
| TC141 ⚠️ | Turn off internet, try to load dashboard | Graceful error or cached content | 📸 | |
| TC142 ⚠️ | Enter OTP after it expires (wait 10+ mins) | Error — OTP expired | | |

---

## PHASE 9 — Notifications
*Requires actions that trigger notifications*

| ID | Step | Expected Result | 📸 | Pass/Fail |
|----|------|----------------|-----|-----------|
| TC143 | Resident has unread notifications | Bell badge shows count on dashboard | 📸 | |
| TC144 | Tap bell icon | Notifications inbox opens | 📸 | |
| TC145 | Tap a notification | Navigates to relevant screen | 📸 | |
| TC146 | Pull to refresh notifications | List refreshes | | |
| TC147 | Scroll to bottom of notifications | Loads more if available | | |

---

## Bugs Found

List any bugs found during testing:

| Bug # | TC ID | Severity | Description | Screenshot |
|-------|-------|----------|-------------|------------|
| | | | | |

---

## Notes
- Severity levels: Critical (app crash/data loss), High (feature broken), Medium (wrong behaviour), Low (UI issue)
- Mark skipped tests with SKIP and reason
- If unsure about expected result — mark as QUESTION and ask Mohit

---
