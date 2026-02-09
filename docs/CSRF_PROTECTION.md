# CSRF Protection Documentation

## Overview
This application implements comprehensive CSRF (Cross-Site Request Forgery) protection using a **Double Submit Cookie Pattern** combined with additional security layers.

## Implementation

### 1. Double Submit Cookie Pattern
- When users log in, the server generates a cryptographically secure CSRF token
- The token is stored in two locations:
  - **Cookie** (`csrf_token`): `httpOnly: false` - readable by JavaScript
  - **HTTP Header** (`X-CSRF-Token`): sent with each state-changing request
- The server verifies that both values match on POST/PUT/DELETE/PATCH requests

### 2. Defense in Depth Layers

**Layer 1: CSRF Token Verification**
- All state-changing operations (POST/PUT/DELETE/PATCH) require valid CSRF token
- Token comparison uses timing-safe comparison to prevent timing attacks
- Implemented in: `src/middleware.ts` and `src/lib/csrf.ts`

**Layer 2: Origin/Referer Verification**
- Server validates the `Origin` or `Referer` header matches the expected host
- Prevents cross-origin requests
- Implemented in: `src/middleware.ts` and `src/lib/csrf.ts`

**Layer 3: SameSite Cookie Attribute**
- All cookies use `sameSite: 'strict'` in both development and production
- Prevents cookies from being sent with cross-site requests
- Implemented in: `src/app/api/auth/login/route.ts`

## Protected Endpoints

All API endpoints that modify state are protected:
- `/api/auth/login` - Login (protected against Login CSRF)
- `/api/attendees/checkin` - Check-in attendees
- `/api/attendees/checkout` - Check-out attendees
- `/api/ocr` - OCR processing (if state-changing)
- `/api/transcribe` - Audio transcription (if state-changing)

## Client-Side Implementation

The application provides a common API client (`src/lib/api-client.ts`) that automatically:
1. Reads the `csrf_token` cookie
2. Includes it in the `X-CSRF-Token` header for all state-changing requests
3. Handles CSRF validation errors gracefully

**Usage:**
```typescript
import { api } from '@/lib/api-client';

// POST request with automatic CSRF token
const response = await api.post('/api/attendees/checkin', {
  rowId: '123'
});
```

## Error Handling

When CSRF validation fails (HTTP 403):
- User sees a friendly message: "セッションが更新されました。もう一度お試しください"
- Page automatically refreshes to obtain a new CSRF token
- No data loss occurs

## Security Best Practices

### Implemented ✓
1. **httpOnly Cookies** for JWT tokens (XSS protection)
2. **Rate Limiting** on login endpoint (5 attempts/minute)
3. **Zod Input Validation** on all API endpoints
4. **Bcrypt Password Hashing**
5. **JWT with 24-hour expiration**
6. **CSRF Token with timing-safe comparison**
7. **Origin/Referer verification**
8. **SameSite=strict cookies**

### Future Enhancements
1. Content Security Policy (CSP) headers
2. X-Frame-Options / X-Content-Type-Options headers
3. HSTS (HTTP Strict Transport Security)
4. Security logging and monitoring for attack attempts
5. Two-Factor Authentication (2FA) for admin functions

## OWASP Top 10 Compliance

| OWASP Category | Status | Implementation |
|----------------|--------|----------------|
| A01:2021 Broken Access Control | ✅ Protected | CSRF protection + JWT auth |
| A02:2021 Cryptographic Failures | ✅ Protected | Bcrypt + JWT + secure CSRF tokens |
| A03:2021 Injection | ✅ Protected | Zod validation |
| A04:2021 Insecure Design | ✅ Protected | Defense in Depth strategy |
| A05:2021 Security Misconfiguration | ✅ Protected | Proper cookie settings |
| A07:2021 Identity & Auth Failures | ✅ Protected | Login CSRF protection |
| A09:2021 Security Logging | ⚠️ Partial | Console logs (needs enhancement) |

## Testing CSRF Protection

### Manual Testing
1. **Valid Request:**
   ```bash
   # Login first to get cookies
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"conferenceId":"test","password":"pass","staffName":"Tester"}' \
     -c cookies.txt

   # Make a protected request with CSRF token
   CSRF_TOKEN=$(grep csrf_token cookies.txt | awk '{print $7}')
   curl -X POST http://localhost:3000/api/attendees/checkin \
     -H "Content-Type: application/json" \
     -H "X-CSRF-Token: $CSRF_TOKEN" \
     -b cookies.txt \
     -d '{"rowId":"123"}'
   ```

2. **Invalid Request (should fail with 403):**
   ```bash
   # Attempt request without CSRF token
   curl -X POST http://localhost:3000/api/attendees/checkin \
     -H "Content-Type: application/json" \
     -b cookies.txt \
     -d '{"rowId":"123"}'
   # Expected: {"error":"Forbidden - Invalid CSRF token"}
   ```

### Automated Testing (recommended)
- Use OWASP ZAP or Burp Suite for penetration testing
- Run CSRF token validation tests
- Test cross-origin request blocking

## Security Incident Response

If a CSRF attack is detected:
1. Check server logs for failed CSRF validations
2. Review `Origin` and `Referer` headers in logs
3. Verify cookie settings are correct
4. Consider temporarily blocking suspicious IP addresses
5. Notify affected users if sessions were compromised

## Development vs Production

**Development:**
- CSRF protection enabled
- `sameSite: 'strict'` enforced
- Console logging for debugging
- `secure: false` (allows HTTP)

**Production:**
- CSRF protection enabled
- `sameSite: 'strict'` enforced
- Minimal logging
- `secure: true` (HTTPS only)

## References
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [Double Submit Cookie Pattern](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#double-submit-cookie)

---

Last updated: 2026-02-09
