# System Design

# **Core Architecture**

### **Identity vs Access — Core Authorization Model**

A User is not tied to one organization.

Access is controlled through memberships and role of a User in that Org.

```jsx
            IDENTITY
             (User)

               │

               │ membership

               ▼

          ORGANIZATION

               │

               │ role

               ▼

           PERMISSIONS
```

### **High-Level System Architecture**

```jsx
                FRONTEND

                    │

                    ▼

                API LAYER

                    │

        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼

     AUTH        ORG         USERS

        │           │           │

        ▼           ▼           ▼

                DATABASE
```

### **Plug-and-Play Feature Architecture**

```jsx
                CORE SYSTEM

                   │
                   │ stable foundation
                   │

        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼

     Billing     Visitors     Notices

        │          │          │

        ▼          ▼          ▼

      New tables added
      No core changes needed
```

# Authentication System

### **User Authentication Flow**

```jsx
[ User enters phone ]
          ↓
   POST /request-otp
          ↓
   [ OTP sent via SMS ]
          ↓
[ User enters OTP ]
          ↓
   POST /verify-otp
          ↓
   ┌───────────────────────────────┐
   │        USER EXISTS?           │
   └──────────────┬────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
     YES (login)        NO (signup)
        │                   │
        └─────────┬─────────┘
                  ↓
      [ Check Invitations ]
                  ↓
      [ Create Membership if invited ]
                  ↓
   ┌───────────────────────────────┐
   │   HOW MANY ORGS USER HAS?     │
   └──────────────┬────────────────┘
                  │
     ┌────────────┼────────────┐
     │            │            │
    0 org        1 org      multiple
     │            │            │
     ↓            ↓            ↓
 "No society"   Auto login   Ask user to pick
                                │
                                ↓
                     POST /select-org
                                ↓
                          Final Token
```

### **OTP Lifecycle**

```jsx
[ Request OTP ]
      ↓
[ Old OTPs invalidated ]
      ↓
[ New OTP generated ]
      ↓
[ Stored in DB ]
      ↓
[ Sent via SMS ]
      ↓
-----------------------------
      ↓
[ User enters OTP ]
      ↓
[ Find latest OTP ]
      ↓
   ┌────────────────────────────┐
   │ Checks:                    │
   │ - Exists?                  │
   │ - Not expired?             │
   │ - Attempts < 3?            │
   │ - Matches?                 │
   └──────────────┬─────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
     FAIL                SUCCESS
        │                   │
 attempts++           mark verified
        │                   │
   error response        login flow
```

### **OTP Validation Flow**

```jsx
User requests OTP
        │
        ▼
Old OTPs invalidated
        │
        ▼
New OTP generated
        │
        ▼
Saved in database
        │
        ▼
Sent via SMS
        │
        ▼
User enters OTP
        │
        ▼
System checks:
   • Exists
   • Not expired
   • Attempts < 3
   • Matches
```

### **Authentication Token Flow** | **DEV only**

```jsx
STEP 1: After OTP verify

Token Types:

1. Base Token
   { userId }

2. Org Token
   { userId, orgId }

----------------------------------

CASE 1: No org
→ Base token

CASE 2: One org
→ Org token (auto)

CASE 3: Multiple orgs
→ Base token → then select-org → Org token
```

# Access & Membership

### **User–Organization Relationship Model**

User is a person, but access comes through memberships in organizations.

```jsx
            [ USER ]
               │
               │ 1-to-1
               ↓
           [ PERSON ]
        (profile data)

               │
               │ 1-to-many
               ↓
         [ MEMBERSHIPS ]
           /     |     \
          /      |      \
         ↓       ↓       ↓
     [ORG A]  [ORG B]  [ORG C]
       │         │         │
    [Role]    [Role]    [Role]
```

### **Invitation Acceptance Flow**

```jsx
[ Admin invites user ]
        ↓
[ Invitation stored ]
        ↓
[ User logs in via OTP ]
        ↓
[ System checks invitation ]
        ↓
   IF EXISTS:
        ↓
[ Auto create membership ]
        ↓
[ Mark invitation accepted ]
```