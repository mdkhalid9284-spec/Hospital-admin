# HospitalCare — Security Audit Protocol & Vulnerability Checklist

## 1. Five-Pass Security Audit Protocol

### Pass 1: Secret Leak Prevention & Configuration Audit
- **Objective:** Ensure zero sensitive credentials exist in the source repository or commit history.
- **Rules:**
  - Verify `.gitignore` excludes `.env`, `*.pem`, `*.key`, `serviceAccountKey.json`, `node_modules/`, `dist/`.
  - Provide a clean, documented `.env.example` with placeholders only.
  - Verify no hardcoded API keys, JWT secrets, database connection strings, or passwords exist in source files or comments.

### Pass 2: Personal Data Flow & PII Protection
- **Objective:** Prevent leakage of protected health information (PHI) and personally identifiable information (PII).
- **Rules:**
  - Audit logs must redact passwords, tokens, full credit card data, and raw medical file contents.
  - APIs must return only role-permitted fields (e.g. search endpoint returns basic demographic identifiers, not medical histories).
  - Client-side storage (localStorage) must never store sensitive medical records or raw passwords.

### Pass 3: Pre-Deployment Hardening
- **Objective:** Eliminate debug routes, test backdoors, and insecure default configurations.
- **Rules:**
  - Remove all `/debug`, `/test`, or bypass endpoints.
  - Ensure development seed credentials cannot be activated in production mode.
  - Enforce production security headers (Helmet, Strict-Transport-Security, CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff).

### Pass 4: Deep Vulnerability Assessment
- **Objective:** Enforce protection against OWASP Top 10 vulnerabilities.
- **Audited Vectors:**
  1. **IDOR / BOLA:** Enforce server-side ownership checks on all resource queries (`/patients/:id`, `/documents/:id`, `/prescriptions/:id`).
  2. **Injection (SQL & NoSQL):** Strictly use parameterized queries, typed Mongoose models, and Zod input sanitization.
  3. **Broken Authentication:** Progressive rate limiting (5 attempts per 15 min), cryptographically random single-use password reset tokens with 15-minute expiry.
  4. **File Upload Abuse:** Enforce MIME type, magic-byte checking, file extension validation, max 10MB limit, and non-executable storage paths.

### Pass 5: Attacker Perspective Verification
- **Objective:** Test simulated attack vectors before release:
  - Role escalation attempts (e.g., patient attempting to call admin admission endpoint).
  - Parameter tampering (e.g., modifying billing total or doctor ID).
  - Double-booking race conditions during simultaneous bed allocations.
