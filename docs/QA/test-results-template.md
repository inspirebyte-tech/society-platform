# Vaastio Test Results — v0.16.2

**Tester:** _______________
**Date Started:** _______________
**Date Completed:** _______________
**APK Version:** v0.16.2
**Device 1:** _______________ (Android version: ___)
**Device 2:** _______________ (Android version: ___)

---

## Summary

| Total | Passed | Failed | Skipped |
|-------|--------|--------|---------|
| 207   |        |        |         |

---

## Phase 1 — Authentication

| ID | Description | Result | Screenshot | Notes |
|----|-------------|--------|------------|-------|
| TC001 | App opens to login screen | | | |
| TC002 | OTP request sent | | | |
| TC003 | OTP visible in Render logs | | | |
| TC004 | Login successful | | | |
| TC005 | Profile screen opens | | | |
| TC006 | Name and phone correct | | | |
| TC007 | Logout works | | | |
| TC008 | Invalid phone rejected | | | |
| TC009 | Wrong OTP rejected | | | |
| TC010 | 3 wrong OTPs handled | | | |
| TC011 | Re-login works | | | |

## Phase 2A — Builder Dashboard

| ID | Description | Result | Screenshot | Notes |
|----|-------------|--------|------------|-------|
| TC012 | Dashboard loads | | | |
| TC013 | Society card tappable | | | |
| TC014 | Society Info shows correctly | | | |
| TC015 | Gear icon opens settings | | | |

## Phase 2B — Society Settings

| ID | Description | Result | Screenshot | Notes |
|----|-------------|--------|------------|-------|
| TC016 | Photo upload works | | | |
| TC017 | Contact phone accepted | | | |
| TC018 | Contact email accepted | | | |
| TC019 | Description accepted | | | |
| TC020 | Save navigates back | | | |
| TC021 | Info visible on society card | | | |
| TC022 | Invalid email rejected | | | |
| TC023 | 5-digit pincode rejected | | | |

## Phase 2C — Structure Management

| ID | Description | Result | Screenshot | Notes |
|----|-------------|--------|------------|-------|
| TC024 | Structure screen opens | | | |
| TC025 | Add node screen opens | | | |
| TC026 | Tower A created | | | |
| TC027 | Floor 1 created under Tower A | | | |
| TC028 | Flat 101 created | | | |
| TC029 | Flat 102 and 103 created | | | |
| TC030 | Duplicate code rejected | | | |
| TC031 | Unit Inventory shows all units | | | |

## Phase 2D — Member Management

| ID | Description | Result | Screenshot | Notes |
|----|-------------|--------|------------|-------|
| TC032 | Members list opens | | | |
| TC033 | + shows alert with options | | | |
| TC034 | Invite via SMS opens | | | |
| TC035 | Admin invited successfully | | | |
| TC036 | Add Directly opens | | | |
| TC037 | Direct add form filled | | | |
| TC038 | Unit picker shows vacancy | | | |
| TC039 | Member added successfully | | | |
| TC040 | Duplicate member rejected | | | |
| TC041 | Gatekeeper added | | | |
| TC042 | Member detail opens | | | |
| TC043 | Unit assignment shown | | | |
| TC044 | Assign Unit opens | | | |
| TC045 | Second unit assigned | | | |
| TC046 | Two End Occupancy buttons visible | | | |
| TC047 | End Occupancy confirmation shown | | | |
| TC048 | Occupancy ended successfully | | | |
| TC049 | One occupancy remains | | | |

## Phase 2E — Announcements

| ID | Description | Result | Screenshot | Notes |
|----|-------------|--------|------------|-------|
| TC050 | Announcements list opens | | | |
| TC051 | Create screen opens | | | |
| TC052 | Fields filled | | | |
| TC053 | Announcement posted | | | |
| TC054 | Multiple announcements created | | | |
| TC055 | Category filter works | | | |
| TC056 | Infinite scroll works | | | |
| TC057 | Pull to refresh works | | | |
| TC058 | Empty title rejected | | | |

## Phase 2F — Complaints

| ID | Description | Result | Screenshot | Notes |
|----|-------------|--------|------------|-------|
| TC059 | Complaints list opens | | | |
| TC060 | Raise complaint screen opens | | | |
| TC061 | Fields filled | | | |
| TC062 | Complaint created | | | |
| TC063 | Complaint detail opens | | | |
| TC064 | Complaint resolved | | | |

## Phase 3A — Admin Dashboard

| ID | Description | Result | Screenshot | Notes |
|----|-------------|--------|------------|-------|
| TC065 | Admin login works | | | |
| TC066 | Correct tiles shown | | | |
| TC067 | Structural fields not editable | | | |
| TC068 | Settings shows limited fields | | | |
| TC069 | Society name not editable | | | |

## Phase 3B — Admin Structure

| ID | Description | Result | Screenshot | Notes |
|----|-------------|--------|------------|-------|
| TC070 | Structure visible | | | |
| TC071 | Admin can add node | | | |
| TC072 | Delete confirmation shown | | | |
| TC073 | Node deleted | | | |

## Phase 3C — Admin Members

| ID | Description | Result | Screenshot | Notes |
|----|-------------|--------|------------|-------|
| TC074 | Members list visible | | | |
| TC075 | Direct add opens | | | |
| TC076 | Admin role rejected | | | |
| TC077 | Builder role rejected | | | |
| TC078 | Resident added | | | |
| TC079 | Member detail opens | | | |
| TC080 | Remove access confirmation | | | |
| TC081 | Member deactivated | | | |
| TC082 | Last admin protection works | | | |

## Phase 4A — Resident Dashboard

| ID | Description | Result | Screenshot | Notes |
|----|-------------|--------|------------|-------|
| TC083 | Resident login works | | | |
| TC084 | Correct tiles shown | | | |
| TC085 | Admin tiles not visible | | | |
| TC086 | Society Info read-only | | | |
| TC087 | No edit button | | | |

## Phase 4B — My Home

| ID | Description | Result | Screenshot | Notes |
|----|-------------|--------|------------|-------|
| TC088 | My Home opens | | | |
| TC089 | Flat 101 details shown | | | |
| TC090 | Owner info shown | | | |

## Phase 4C — Visitor Management

| ID | Description | Result | Screenshot | Notes |
|----|-------------|--------|------------|-------|
| TC091 | My Visitors opens | | | |
| TC092 | Pre-Approvals tab shown | | | |
| TC093 | Create pre-approval opens | | | |
| TC094 | Fields filled | | | |
| TC095 | Pre-approval created | | | |
| TC096 | Appears in list | | | |
| TC097 | Cancel confirmation shown | | | |
| TC098 | Pre-approval cancelled | | | |

## Phase 4D — Resident Complaints

| ID | Description | Result | Screenshot | Notes |
|----|-------------|--------|------------|-------|
| TC099 | Own complaints visible | | | |
| TC100 | New complaint created | | | |
| TC101 | Other complaints not visible | | | |

## Phase 4E — Resident Announcements

| ID | Description | Result | Screenshot | Notes |
|----|-------------|--------|------------|-------|
| TC102 | Announcements visible | | | |
| TC103 | Category filter works | | | |
| TC104 | Detail screen opens | | | |
| TC105 | Infinite scroll works | | | |

## Phase 4F — Profile

| ID | Description | Result | Screenshot | Notes |
|----|-------------|--------|------------|-------|
| TC106 | Profile screen opens | | | |
| TC107 | Photo updated | | | |
| TC108 | Name updated | | | |

## Phase 5A — Gatekeeper Dashboard

| ID | Description | Result | Screenshot | Notes |
|----|-------------|--------|------------|-------|
| TC109 | Gatekeeper login works | | | |
| TC110 | Correct tiles shown | | | |
| TC111 | Other tiles not visible | | | |

## Phase 5B — Log Visitor

| ID | Description | Result | Screenshot | Notes |
|----|-------------|--------|------------|-------|
| TC112 | Log Visitor form opens | | | |
| TC113 | Fields filled | | | |
| TC114 | Unit selected | | | |
| TC115 | Entry created | | | |
| TC116 | Appears in Active Visitors | | | |
| TC117 | Entry Log visible | | | |

## Phase 6 — Cross-Role Visitor Approval

| ID | Description | Result | Screenshot | Notes |
|----|-------------|--------|------------|-------|
| TC118 | Gatekeeper logs visitor | | | |
| TC119 | Resident gets notification | | | |
| TC120 | Notification navigates correctly | | | |
| TC121 | Resident approves | | | |
| TC122 | Gatekeeper sees ALLOWED | | | |
| TC123 | Resident denies another visitor | | | |
| TC124 | Gatekeeper sees DENIED | | | |

## Phase 7 — Society Handover

| ID | Description | Result | Screenshot | Notes |
|----|-------------|--------|------------|-------|
| TC125 | Settings screen opens | | | |
| TC126 | Danger Zone visible | | | |
| TC127 | Leave blocked without admin | | | |
| TC128 | First confirmation shown | | | |
| TC129 | Second confirmation shown | | | |
| TC130 | Navigates to Create Society | | | |
| TC131 | Success banner shown | | | |
| TC132 | Admin sees society, Builder gone | | | |

## Phase 8 — Edge Cases

| ID | Description | Result | Screenshot | Notes |
|----|-------------|--------|------------|-------|
| TC133 | 5-digit pincode rejected | | | |
| TC134 | Empty complaint title rejected | | | |
| TC135 | Empty announcement body rejected | | | |
| TC136 | Invalid phone rejected | | | |
| TC137 | Duplicate primary owner rejected | | | |
| TC138 | Duplicate active member rejected | | | |
| TC139 | Inactive member reactivation prompt | | | |
| TC140 | Cannot deactivate self | | | |
| TC141 | Offline graceful error | | | |
| TC142 | Expired OTP rejected | | | |

## Phase 9 — Notifications

| ID | Description | Result | Screenshot | Notes |
|----|-------------|--------|------------|-------|
| TC143 | Badge count shown | | | |
| TC144 | Inbox opens | | | |
| TC145 | Notification navigates correctly | | | |
| TC146 | Pull to refresh works | | | |
| TC147 | Infinite scroll works | | | |

## Phase 10 — Invitation Flow

| ID | Description | Result | Screenshot | Notes |
|----|-------------|--------|------------|-------|
| TC144 | Pending member appears | | | |
| TC145 | Fresh phone login screen | | | |
| TC146 | OTP requested | | | |
| TC147 | Invitation detected | | | |
| TC148 | Name saved | | | |
| TC149 | Dashboard loads correctly | | | |
| TC150 | Member now Active | | | |
| TC151 | Cancelled invitation removed | | | |
| TC152 | Cancelled invitee blocked | | | |

## Phase 11 — Co-Resident

| ID | Description | Result | Screenshot | Notes |
|----|-------------|--------|------------|-------|
| TC153 | Co-resident login works | | | |
| TC154 | Correct tiles shown | | | |
| TC155 | My Home visible | | | |
| TC156 | My Visitors opens | | | |
| TC157 | Gets visitor notification | | | |
| TC158 | Can approve visitor | | | |
| TC159 | Can raise complaint | | | |
| TC160 | Can view announcements | | | |
| TC161 | No Members tile | | | |
| TC162 | No Structure tile | | | |

## Phase 12 — Pre-Approval At Gate

| ID | Description | Result | Screenshot | Notes |
|----|-------------|--------|------------|-------|
| TC163 | Pre-approval created | | | |
| TC164 | Gatekeeper log form opens | | | |
| TC165 | Pre-approval detected | | | |
| TC166 | Entry created correctly | | | |
| TC167 | Resident sees entry | | | |
| TC168 | Pre-approval marked used | | | |

## Phase 13 — Frequent Visitors

| ID | Description | Result | Screenshot | Notes |
|----|-------------|--------|------------|-------|
| TC169 | Visitor logged | | | |
| TC170 | Visitor detail opens | | | |
| TC171 | Marked as frequent | | | |
| TC172 | Appears in frequent list | | | |
| TC173 | Frequent tag on re-entry | | | |
| TC174 | Frequent status removed | | | |

## Phase 14 — Complaint Lifecycle

| ID | Description | Result | Screenshot | Notes |
|----|-------------|--------|------------|-------|
| TC175 | Resident raises complaint | | | |
| TC176 | Admin sees complaint | | | |
| TC177 | Admin views detail | | | |
| TC178 | Admin resolves with note | | | |
| TC179 | Resident sees resolved status | | | |
| TC180 | Resident cannot resolve own | | | |

## Phase 15 — Move Out vs End Occupancy

| ID | Description | Result | Screenshot | Notes |
|----|-------------|--------|------------|-------|
| TC181 | Member detail actions visible | | | |
| TC182 | Both buttons present | | | |
| TC183 | End Occupancy confirmation correct | | | |
| TC184 | Member stays active | | | |
| TC185 | Re-assign unit works | | | |
| TC186 | Move Out confirmation correct | | | |
| TC187 | Member moves to Inactive | | | |
| TC188 | No Move Out without unit | | | |

## Phase 16 — Switch Society

| ID | Description | Result | Screenshot | Notes |
|----|-------------|--------|------------|-------|
| TC189 | Second society created | | | |
| TC190 | Switch Society lists both | | | |
| TC191 | First society selected | | | |
| TC192 | Correct society shown | | | |
| TC193 | Switch back works | | | |
| TC194 | Single society no switch option | | | |

## Phase 17 — Entry Log Filters

| ID | Description | Result | Screenshot | Notes |
|----|-------------|--------|------------|-------|
| TC195 | Entry log opens | | | |
| TC196 | Date filter works | | | |
| TC197 | Approved filter works | | | |
| TC198 | Denied filter works | | | |
| TC199 | Unit filter works | | | |
| TC200 | Empty filter state graceful | | | |

## Phase 18 — Announcements Advanced

| ID | Description | Result | Screenshot | Notes |
|----|-------------|--------|------------|-------|
| TC201 | Announcement pinned | | | |
| TC202 | Pinned shows at top | | | |
| TC203 | Infinite scroll page 2 loads | | | |
| TC204 | Refresh resets to page 1 | | | |
| TC205 | Image attachment works | | | |
| TC206 | Announcement deleted | | | |
| TC207 | Resident cannot create | | | |

---

## Bugs Found

| # | TC ID | Severity | Description | Steps | Expected | Actual | Screenshot |
|---|-------|----------|-------------|-------|----------|--------|------------|
| 1 | | | | | | | |

---

## Sign Off

- [ ] All critical tests passed
- [ ] All high priority tests passed
- [ ] Screenshots submitted
- [ ] Bugs documented

**Tester signature:** _______________
**Date:** _______________

---
