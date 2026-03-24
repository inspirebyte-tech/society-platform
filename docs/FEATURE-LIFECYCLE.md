# Feature Lifecycle

# (Spec → Build → Ship)

The goal is simple:

No confusion

No rework

No “I thought it worked like this”

**think first, then build**.

---

# Overview

Every feature goes through these steps:

1. Feature Brief
2. Flow Diagram (if needed)
3. Wireframes
4. API Contract
5. Database Changes
6. Backend Build
7. Frontend Build
8. Integration & Testing

---

# 1. Feature Brief (MANDATORY)

Before writing any code, we define the feature clearly.

### What to include:

- **Who uses it**
- **What it does**
- **What it does NOT do**
- **Edge cases**

### Why this matters:

Most bugs and confusion happen because the feature was not clearly defined.

---

# 2. Flow Diagram (ONLY for complex features)

Used when feature has:

- Multiple steps
- Decisions (if/else)
- Different outcomes

### What to include:

- Every user path
- Every decision point
- Every outcome

### Why:

Everyone should agree on how the feature behaves **before coding starts**.

---

# 3. Wireframes

This is NOT design. No colors, no styling.

### What to define:

- What each screen has
- What buttons exist
- What happens when user clicks/taps

### Why:

Prevents frontend confusion and rework.

---

# 4. API Contract (VERY IMPORTANT)

Backend and frontend both agree on this BEFORE building.

### Define:

- Endpoint (URL)
- Method (GET/POST/etc)
- Request format
- Response format
- Error responses

### Why:

Frontend and backend can work **in parallel without blocking each other**.

---

# 5. Database Changes

Before backend coding:

### Define:

- New tables
- New columns
- Relationships

### Always:

- Write migration first

---

# 6. Backend Build

Now backend starts coding.

### Includes:

- API endpoints
- Business logic
- Validation
- Tests (basic at least)

---

# 6.5 Testing (Backend + Frontend)

## Types of Tests We Use

### 1. Basic Unit Tests (Backend)

Test small pieces of logic.

 Example:

- If amount < 0 → error
- If flat not found → return 404

### Why:

Catches bugs early without running full app


### 2. API Tests (VERY IMPORTANT)

Test your endpoints directly.

 Example:

- POST /visitors with valid data → success
- POST /visitors with empty name → 400
- GET /visitors → returns correct list

### Tools:

- Postman / Thunder Client / curl


### 3. Integration Tests (Lightweight)

Test flow with DB.

 Example:

- Create visitor → check DB → fetch visitors → verify entry exists


### 4. Frontend Testing (Basic)

We don’t overcomplicate this yet.

 Test:

- Form submits correctly
- Error messages show
- API response handled


### 5. Manual Testing (Final Layer)

Now test like a real user.

 Example:

- Guard adds visitor
- Resident sees it
- Try wrong inputs

---

# 7. Frontend Build

Frontend builds using:

- Wireframes
- API contract (NOT guesswork)

---

# 8. Integration & Testing

Final step.

### Do:

- Connect frontend to real API
- Test full flow
- Fix mismatches

---

---

**Think → Define → Build → Connect → Test**

---

# Example Feature: “Create Visitor Entry”

(this is just an example, not the complete detailed one as per our app)

---

## 1. Feature Brief

**Feature:** Add Visitor Entry (Gate Entry System)

### Who uses it:

- Security Guard / Gate Person

### What it does:

- Guard adds a visitor entry when someone comes
- Visitor is linked to a flat
- Entry is visible to resident

### What it does NOT do:

- No OTP verification (future feature)
- No automatic approval system
- No face recognition, etc.

### Edge cases:

- Flat does not exist
- Guard enters wrong phone number
- Visitor name is empty
- Duplicate entries (same person multiple times)
- Entry made but resident never checks

---

## 2. Flow Diagram

Guard → Click “Add Visitor”

→ Fill details (name, phone, flat, purpose)

→ Submit

System:

→ Validate

→ Save entry

→ Return success

Resident:

→ Opens app

→ Sees visitor entry

---

### Error Paths:

- Missing data → show error
- Invalid flat → reject
- Server error → retry

---

## 3. Wireframes

### Screen: Guard Dashboard

- Button: “Add Visitor”

---

### Screen: Add Visitor Form

Fields:

- Visitor Name (input)
- Phone Number (input)
- Flat Number (dropdown or input)
- Purpose (optional)

Buttons:

- Submit
- Cancel

---

### Screen: Resident View

- List of visitors:
    - Name
    - Time
    - Purpose

---

## 4. API Contract

---

### Create Visitor Entry

**Endpoint:**

`POST /visitors`

**Request:**

```
{
  "name": "Ramesh Kumar",
  "phone": "9876543210",
  "flatId": "B-203",
  "purpose": "Delivery"
}
```

---

**Response:**

```
{
  "id": "vis_101",
  "name": "Ramesh Kumar",
  "flatId": "B-203",
  "time": "2026-03-17T10:30:00Z",
  "purpose": "Delivery"
}
```

---

### Get Visitors (Resident View)

**Endpoint:**

`GET /visitors?flatId=B-203`

**Response:**

```
[
  {
    "id": "vis_101",
    "name": "Ramesh Kumar",
    "time": "2026-03-17T10:30:00Z",
    "purpose": "Delivery"
  }
]
```

---

### Error Cases:

```
400 → Missing/invalid data
404 → Flat not found
500 → Server error
```

---

## 5. Database Changes

### Table: visitors

Fields:

- id
- name
- phone
- flat_id
- purpose
- created_at

---

## 6. Backend Build

### Steps:

1. Create route:
- `POST /visitors`
1. Validate:
- name not empty
- phone valid
- flat exists
1. Save to DB
2. Return response

---

## 6.5. Unit Test Examples (Backend)

- Empty name → should fail
- Invalid phone → should fail
- Valid input → should pass


## API Test Examples

### Test 1:

POST /visitors with valid data → ✅ success

### Test 2:

POST /visitors with missing name → ❌ 400

### Test 3:

GET /visitors → returns correct list


### Integration Test

- Add visitor
- Check DB → entry exists
- Fetch → entry returned


### Frontend Test

- Submit empty form → error shown
- Submit valid form → success message
- Data appears in list


### Manual Test

- Real flow from guard → resident
- Try wrong flat
- Try duplicate entries


###  Rules for Testing

-  Don’t skip API testing
-  Don’t rely only on UI testing
-  Don’t test only “happy path”
-  Always test errors
-  Always test edge cases
-  Always test full flow once


###  How Much Testing is Enough?

Right now (small team, early stage):

 Minimum standard:

- API tested
- Edge cases tested
- One full flow tested manually

Bonus (good devs do this):

- Add unit tests for validation logic


---

## 7. Frontend Build

### Guard Side:

- Form UI
- Submit → API call
- Show:
    - loading
    - success
    - error

---

### Resident Side:

- Fetch visitor list
- Show entries clearly

---

8. Integration & Testing

### Test:

 Add visitor → appears in DB

 Resident sees entry

 Invalid input → error shown

 Server error → handled

---

# Common Mistakes

 Skipping validation

 Assuming flat exists

 Hardcoding data in frontend

 Not handling API errors

---

# Final Understanding

This feature may look simple, but the process stays the same.

 Even simple features follow full lifecycle

 This avoids confusion as app grows

---