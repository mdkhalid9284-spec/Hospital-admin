# HospitalCare — Engineering Rules & Operational Standards

## 1. Core Engineering Principles
1. **Understand Before Coding:** Never write exploratory code without clear requirements and domain models.
2. **Backend is the Source of Truth:** Never trust client-side validation, role claims, financial totals, or file extensions.
3. **Defense in Depth:** Every endpoint must authenticate, authorize role, and authorize resource ownership (IDOR prevention).
4. **No Secret Leakage:** Never commit secrets, API keys, passwords, or service credentials. All configurations must be sourced from `.env` with a matching `.env.example`.
5. **No PII or Secret Logging:** Passwords, tokens, raw clinical files, and sensitive financial secrets must never be logged.

## 2. API & Service Rules
1. **Consistent REST Responses:**
   ```json
   {
     "success": true,
     "data": { ... },
     "meta": { "timestamp": "...", "requestId": "..." }
   }
   ```
2. **Consistent Error Format:**
   ```json
   {
     "success": false,
     "error": {
       "code": "ERROR_CODE",
       "message": "User safe message",
       "requestId": "..."
     }
   }
   ```
3. **No Unhandled Exceptions:** Centralized Express error handler must catch all synchronous and asynchronous errors and return sanitized outputs (no stack traces in production).
4. **Zod Validation:** Every incoming request body, query parameter, and route parameter must be validated against a typed Zod schema.

## 3. Data & Storage Rules
1. **Concurrency Protection:** Bed allocations, slot reservations, and payments must use atomic operations and status checks to prevent race conditions.
2. **Safe File Uploads:**
   - Validate MIME type against allowed list (`application/pdf`, `image/jpeg`, `image/png`).
   - Validate magic bytes / signatures.
   - Enforce 10MB size limit.
   - Store with random UUID safe keys outside public directories.
   - Disallow executable extensions (`.exe`, `.sh`, `.js`, `.php`, etc.).

## 4. Documentation & Verification Rules
1. Every new feature must have an associated test case and entry in the Requirements Traceability Matrix (RTM).
2. Update `Memory.md` at the conclusion of every milestone.
