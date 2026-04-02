# Contributing Guide

Read this before writing a single line of code.

---

## How To Think About This Codebase

Before writing any code, ask three questions:
```
1. Which layer does this belong to?
   Identity / Property / Access / Operations

2. Does this need a new permission string?
   If someone needs to be authorized to do it → yes

3. Does every new table have org_id?
   If it holds society data → yes, always
```

If you can answer all three, you understand the task.
If you can't, read ARCHITECTURE.md first.

---

## Daily Workflow
```
1. Pick up a GitHub issue marked "Ready"
2. Create a branch from the feature base branch
   git checkout feature/society-setup   ← current feature branch
   git pull origin feature/society-setup
   git checkout -b feature/your-task-name

   Note: branch base changes per feature.
   Tech lead tells you which branch to branch from.
   Right now: feature/society-setup

3. Build the thing
4. Test it manually
5. Push and open a PR → target: dev
6. Wait for review
7. Address comments if any
8. Merged by reviewer
```

Never push directly to dev or main.
Never pick up an issue that isn't marked Ready.
Never start work without a GitHub issue.

---

## Branch Naming
```
feature/visitor-api          → new feature
feature/complaint-status     → new feature
fix/auth-token-expiry        → bug fix
fix/permission-middleware     → bug fix
chore/update-dependencies    → maintenance
docs/update-setup-guide      → documentation
```

One branch per issue.
One issue per branch.
Never mix two features in one branch.

---

## Commit Messages

Follow this format exactly:
```
type: short description in present tense

feat: add POST /visitors endpoint
fix: correct permission check in auth middleware
chore: update prisma client version
docs: add visitor flow to FEATURES.md
test: add tests for complaint creation
```

Rules:
- Always lowercase
- No full stop at the end
- Present tense — "add" not "added"
- Under 72 characters
- Be specific — "fix bug" is not acceptable

Good examples:
```
feat: add visitor approval endpoint with timeout logic
fix: return 403 when org_id missing from token
chore: add NODE_ENV check to test-tokens route
```

Bad examples:
```
fixed stuff
WIP
updated files
changes
```

---

## Folder Structure
```
apps/api/src/
  routes/          → one file per feature area
    auth.ts        → /auth/* endpoints
    visitors.ts    → /visitors/* endpoints
    complaints.ts  → /complaints/* endpoints

  middleware/      → reusable middleware only
    auth.ts        → authenticate — verifies JWT
    permission.ts  → requirePermission — checks permission string

  lib/
    prisma.ts      → single Prisma client instance

  utils/
    jwt.ts         → token generation and verification
    response.ts    → standard response helpers (future)

prisma/
  schema.prisma    → single source of truth for DB
  seed.ts          → test data
  migrations/      → never edit these manually
```

---

## How To Build An Endpoint — The Pattern

Every endpoint in this codebase follows this exact pattern.
Do not deviate from it.

```typescript
import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import { prisma } from '../lib/prisma'
import { sendSuccess, sendCreated, sendError, sendServerError } from '../utils/response'

const router = Router()

router.post(
  '/visitors',
  authenticate,                           // 1. verify token
  requirePermission('visitor.log'),       // 2. check permission
  async (req: AuthRequest, res: Response) => {
    try {
      const { unitCode, visitorName, visitorPhone } = req.body

      // 3. validate inputs
      if (!unitCode || !visitorName || !visitorPhone) {
        return sendError(res, 'missing_fields', 400, {
            required: ['unitCode', 'visitorName', 'visitorPhone']
        })
      }

      // 4. always scope to org from auth token
      //    never trust org from request body
      const visitor = await prisma.visitor.create({
        data: {
          orgId: req.user!.orgId!,        // from token, not body
          visitorName,
          visitorPhone,
          unitCode,
          status: 'pending',
          loggedBy: req.user!.userId,
        }
      })

      // 5. return consistent response
      return sendCreated(res, visitor)

    } catch (error) {
      console.error('POST /visitors error:', error)
      return res.status(500).json({ error: 'server_error' })
    }
  }
)

export default router
```

The order is always:
```
authenticate → requirePermission → validate → query (with orgId) → respond
```

---

## The orgId Rule — Most Important Rule In The Codebase
```typescript
// NEVER do this
const complaints = await prisma.complaint.findMany()

// NEVER do this either — orgId from body can be faked
const complaints = await prisma.complaint.findMany({
  where: { orgId: req.body.orgId }
})

// ALWAYS do this — orgId comes from the verified JWT token
const complaints = await prisma.complaint.findMany({
  where: { orgId: req.user!.orgId }
})
```

This is not optional. This is what keeps one society's data
from leaking into another society. Every single query that
touches society data must be scoped to req.user!.orgId.

---

## HTTP Status Codes — Use These Consistently
```
200  → success, returning data
201  → success, something was created
400  → bad request, missing or invalid fields
401  → not logged in (no token or invalid token)
403  → logged in but no permission
404  → resource not found
500  → something broke on our end (always log these)
```

---

## Response Format — Be Consistent

Success responses:
```json
{ "data": { ... } }          // single object
{ "data": [ ... ] }          // list
{ "data": { ... }, "meta": { "total": 42 } }  // list with count
```

Error responses:
```json
{ "error": "missing_fields", "required": ["name", "phone"] }
{ "error": "not_found" }
{ "error": "insufficient_permissions", "required": "visitor.log" }
{ "error": "server_error" }
```

Always use snake_case for error codes.
Never expose stack traces or internal error messages in responses.

---

## API Naming Conventions
```
GET    /visitors              → list visitors
GET    /visitors/:id          → get one visitor
POST   /visitors              → create a visitor entry
PATCH  /visitors/:id          → update a visitor (partial)
DELETE /visitors/:id          → delete (use rarely — prefer status updates)

GET    /complaints            → list complaints
POST   /complaints            → create complaint
PATCH  /complaints/:id/status → update complaint status
```

Rules:
- Always plural nouns: /visitors not /visitor
- Lowercase with hyphens: /pre-approved-visitors
- Actions as sub-resources: /complaints/:id/status
- Never verbs in URLs: not /createComplaint or /getVisitors

---

## Prisma — How To Use It

Always import the singleton:
```typescript
import { prisma } from '../lib/prisma'
```

Never create a new PrismaClient() anywhere else.

Selecting only what you need:
```typescript
// Bad — fetches everything including sensitive fields
const user = await prisma.user.findUnique({
  where: { id: userId }
})

// Good — only fetch what the response needs
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    phone: true,
    person: {
      select: { fullName: true }
    }
  }
})
```

Never return password hashes in responses. Ever.

---

## Adding A New Feature — The Checklist

Before opening a PR, check every item:
```
□ New migration created if schema changed
□ Migration runs cleanly from scratch (npx prisma migrate reset)
□ Every new table has org_id
□ New permission strings added to seed if needed
□ Roles updated in seed if needed
□ orgId always comes from req.user!.orgId in queries
□ All inputs validated — missing fields return 400
□ authenticate middleware on every protected route
□ requirePermission middleware on every route that needs it
□ No console.logs left in code (use proper error logging)
□ Tested manually with Thunder Client
□ PR description explains what was built and how to test it
□ PERMISSIONS.md updated if new permissions added
```


---

## What Good PRs Look Like

PR title:
```
feat: add visitor logging endpoint (#12)
```

PR description:
```
## What
Adds POST /visitors endpoint for gatekeeper to log visitor arrivals.

## How to test
1. Run server: npx tsx src/index.ts
2. Get gatekeeper token: GET /api/test-tokens
3. POST /api/visitors with:
   {
     "unitCode": "A-101",
     "visitorName": "Test Visitor",
     "visitorPhone": "9999999999",
     "purpose": "guest"
   }
4. Should return 201 with visitor object
5. Try without token → should return 401
6. Try with resident token → should return 403

## DB changes
None — uses existing visitors table

## Permissions used
visitor.log
```

This is the minimum. No description = PR gets sent back.

---

## Tests — What To Know

We are not writing automated tests in V1.
Manual testing with Thunder Client is the standard for now.

When we add tests (V2), they will be:
```
Integration tests using Jest + Supertest
Each endpoint gets tested for:
  → Happy path (correct input, correct token)
  → Missing auth (no token → 401)
  → Wrong permission (wrong role → 403)
  → Missing fields (bad input → 400)
  → Not found (wrong id → 404)
```

Write your code as if tests will be added later.
This means: no business logic inside route handlers,
keep things small and focused, avoid side effects.

---

## Things That Will Get Your PR Rejected
```
→ Direct push to dev or main (not a PR)
→ orgId taken from request body instead of token
→ Missing authenticate middleware on a protected route
→ Returning password_hash in any response
→ console.log left in production code
→ No input validation
→ Vague commit messages like "fix" or "update"
→ No PR description
→ Two unrelated features in one branch
→ Schema changes without a migration
→ Not using utils/response.ts helpers
   (raw res.status().json() instead of sendSuccess/sendError)
```

---

## When You Are Stuck
```
Stuck for under 30 mins  → keep trying, read the docs
Stuck for over 30 mins   → post in our Whatsapp group
                            share: what you tried, what error you got
Blocked by someone else  → raise it in standup immediately
                            don't stay blocked silently
```

The worst thing you can do is stay blocked and say nothing.
The second worst thing is ask a question without first
trying to solve it yourself.

---

## PR Review Checklist

Reviewer checks every PR for:

### Security
□ orgId from req.user.orgId — never from req.body
□ authenticate middleware on every protected route
□ requirePermission with correct permission string
□ inputs validated before any DB query

### Contract compliance
□ Response shape matches API contract exactly
□ Error codes are snake_case and match contract
□ HTTP status codes are correct
□ No extra fields in response not in contract
□ No missing fields from contract

### Code quality
□ utils/response.ts helpers used (sendSuccess, sendError etc)
□ No console.logs in code
□ No hardcoded strings that should be constants
□ Error messages don't expose internal details

### Database
□ Transaction used where multiple writes happen together
□ orgId scope on every query that touches society data
□ No raw SQL unless absolutely necessary

### Testing
□ PR description has test instructions
□ Happy path tested
□ All error cases tested
□ Edge cases tested
□ Definition of done checklist completed

---

## Quick Reference
```
Run server:        npx tsx src/index.ts
Reset database:    npx prisma migrate reset
New migration:     npx prisma migrate dev --name description
Generate client:   npx prisma generate
Format schema:     npx prisma format
View database:     pgAdmin → society_platform_dev

Test users:
  Builder:     +911111111111
  Resident:    +912222222222
  Gatekeeper:  +913333333333
  Co-resident: +914444444444

Get test tokens:   GET /api/test-tokens (dev only)

```