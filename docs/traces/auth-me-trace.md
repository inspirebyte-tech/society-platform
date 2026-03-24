## Following the GET /auth/me

### Middleware
- Uses `authenticate` method inside `AuthRequest`
- Checks if user token exists
- If token exists:
  - Decodes `userId` and `orgId`
  - Extracts permissions
- Attaches validated data to request for further use

### Queried Tables
- Organization Membership (if org context exists)
- User Table (to validate user)

### Response

#### Valid User
- Returns:
  - user
  - memberships
  - role
  - permissions

#### Invalid User
- `User not found`

### Permissions
- There is no permission check in this request-to-response flow
- Although a permission middleware exists in the middleware folder, it is not being used here