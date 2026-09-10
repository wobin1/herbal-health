# Herbal Health Seminar Series

## International Standards, Security, Privacy & Compliance Requirements

**Document purpose:** Define the international standards, security frameworks, privacy requirements, accessibility requirements, payment requirements, engineering practices, and operational controls that the Herbal Health Seminar Series website/web application should follow to reach an industry-grade and internationally deployable standard.

**Technology context:** Next.js + TypeScript + Prisma ORM + PostgreSQL.

> **Important:** Standards alignment is not the same as certification or legal compliance. Where a standard or regulation requires formal certification, audit, registration, or legal assessment, the project must complete that process separately.

---

## 1. Standards Baseline

| Area                           | Standard / Framework       | Target                                            |
| ------------------------------ | -------------------------- | ------------------------------------------------- |
| Accessibility                  | WCAG 2.2                   | Level AA                                          |
| Accessibility                  | ISO/IEC 40500:2025         | Align/conform through WCAG 2.2                    |
| Application Security           | OWASP ASVS 5.0             | Level 2                                           |
| Web Application Risk           | OWASP Top 10               | Address all applicable risks                      |
| API Security                   | OWASP API Security Top 10  | Address all applicable risks                      |
| Digital Identity               | NIST SP 800-63-4           | Apply relevant controls                           |
| Cybersecurity Framework        | NIST CSF 2.0               | Adopt                                             |
| Secure Development             | NIST SSDF SP 800-218       | Adopt                                             |
| Information Security           | ISO/IEC 27001:2022         | Design controls toward                            |
| Privacy Information Management | ISO/IEC 27701              | Apply privacy principles                          |
| Payment Security               | PCI DSS v4.0.1             | Meet applicable scope                             |
| Privacy Law                    | GDPR                       | Where applicable                                  |
| California Privacy Law         | CCPA/CPRA                  | Where applicable                                  |
| Transport Security             | HTTPS/TLS                  | TLS 1.3 preferred; TLS 1.2 minimum where required |
| API Specification              | OpenAPI 3.1                | Recommended                                       |
| Date/Time                      | ISO 8601 / RFC 3339        | Required                                          |
| Email Authentication           | SPF, DKIM, DMARC           | Required                                          |
| Domain Security                | DNSSEC                     | Recommended where supported                       |
| Business Continuity            | ISO 22301 principles       | Recommended                                       |
| Quality Management             | ISO 9001 principles        | Optional                                          |
| Web Performance                | Core Web Vitals            | Required performance target                       |
| Software Supply Chain          | SBOM + dependency scanning | Required                                          |

---

# 2. Accessibility

## 2.1 WCAG 2.2 Level AA

The entire public website, registration flow, checkout, account area, and admin interface should target **WCAG 2.2 Level AA**.

Requirements include:

- Full keyboard accessibility.
- Visible and logical focus states.
- Semantic HTML.
- Correct heading hierarchy.
- Accessible forms and validation errors.
- Labels associated with inputs.
- Accessible buttons and links.
- Sufficient text/background contrast.
- Responsive text resizing.
- Screen-reader compatibility.
- No keyboard traps.
- Accessible modal/dialog behavior.
- Accessible navigation.
- Meaningful alternative text for images.
- Captions/transcripts for relevant video or audio.
- Accessible checkout and payment-error messages.
- Accessible authentication and account recovery.
- Touch targets with adequate size and spacing.
- Consistent navigation.
- Error prevention for important transactions.

Accessibility must be tested before production release.

---

# 3. ISO/IEC 40500

ISO/IEC 40500:2025 is the international standard corresponding to WCAG 2.2.

The implementation should therefore use **WCAG 2.2 AA as the practical accessibility engineering target**.

The project should maintain an accessibility checklist covering:

1. Perceivable
2. Operable
3. Understandable
4. Robust

A formal accessibility audit should be performed before major public launch if budget permits.

---

# 4. Application Security

## 4.1 OWASP ASVS 5.0

**OWASP Application Security Verification Standard (ASVS) 5.0** should be the primary application-security verification baseline.

Target:

**OWASP ASVS Level 2**

This is appropriate for a professional public-facing application handling:

- User accounts
- Event registrations
- Personal information
- Orders
- Payments
- Administrative functions
- Email communications

Security controls should cover:

- Architecture
- Authentication
- Session management
- Access control
- Input validation
- Output encoding
- Cryptography
- Error handling
- Logging
- Data protection
- File handling
- Business logic
- API security
- Frontend security
- Configuration
- External integrations

---

# 5. OWASP Top 10

The development team must review the application against the applicable OWASP Top 10 risks, including:

- Broken access control
- Cryptographic failures
- Injection
- Insecure design
- Security misconfiguration
- Vulnerable/outdated components
- Identification/authentication failures
- Software/data integrity failures
- Logging/monitoring failures
- Server-side request forgery where applicable

The application must not simply rely on framework defaults.

---

# 6. API Security

The Next.js API layer must be designed against the OWASP API Security Top 10.

Particular attention is required for:

- Broken Object Level Authorization (BOLA)
- Broken authentication
- Broken object property-level authorization
- Unrestricted resource consumption
- Broken function-level authorization
- Unrestricted access to sensitive business flows
- Server-side request forgery
- Security misconfiguration
- Improper inventory management
- Unsafe consumption of APIs

API requirements:

- Validate every request with schemas.
- Authenticate protected endpoints.
- Authorize every resource access.
- Apply rate limits.
- Enforce maximum request sizes.
- Avoid excessive data exposure.
- Never trust client-supplied prices or permissions.
- Return controlled error responses.
- Maintain API versioning where necessary.
- Document APIs with OpenAPI.

---

# 7. Authentication and Identity

The system should follow relevant NIST SP 800-63-4 digital identity principles.

## Administrator requirements

Admin accounts must have:

- Strong authentication.
- MFA.
- Role-based access control.
- Session expiration.
- Secure password recovery.
- Login monitoring.
- Failed-login protection.
- Audit logging.

Recommended:

- Passkeys/WebAuthn where practical.
- MFA for all privileged accounts.
- No shared administrator accounts.

---

# 8. Password Security

If the application manages passwords:

- Passwords must never be stored in plaintext.
- Use a modern password hashing algorithm such as **Argon2id**.
- Use secure password-reset tokens.
- Reset tokens must expire.
- Reset tokens must be single-use.
- Do not log passwords or reset tokens.
- Avoid unnecessary password complexity rules that harm usability.
- Prevent credential stuffing through rate limiting and monitoring.

---

# 9. Session Security

Authentication cookies should use:

- `Secure`
- `HttpOnly`
- Appropriate `SameSite`
- Short-lived sessions where appropriate
- Session rotation after authentication/privilege changes

Session invalidation must occur after:

- Logout
- Password reset
- Security-sensitive account changes
- Administrator deactivation

---

# 10. NIST Cybersecurity Framework 2.0

The application and operational environment should map security activities to the six NIST CSF 2.0 functions:

1. Govern
2. Identify
3. Protect
4. Detect
5. Respond
6. Recover

This should be reflected in policies, monitoring, incident response, access management, backups, and risk management.

---

# 11. NIST Secure Software Development Framework

The project should follow NIST SP 800-218 / SSDF principles.

The development lifecycle should include:

- Security requirements.
- Threat modeling.
- Secure architecture.
- Secure coding practices.
- Code review.
- Automated security testing.
- Dependency management.
- Vulnerability remediation.
- Secure build/deployment pipelines.
- Release verification.
- Security incident response.

---

# 12. ISO/IEC 27001:2022

The platform should be designed using controls aligned with **ISO/IEC 27001:2022**.

Relevant areas include:

- Information security governance.
- Asset management.
- Access control.
- Cryptography.
- Operations security.
- Communications security.
- Supplier security.
- Incident management.
- Business continuity.
- Logging and monitoring.
- Backup management.
- Secure development.
- Vulnerability management.

The project should not claim to be ISO 27001 certified unless an accredited certification process has actually been completed.

---

# 13. Privacy

## 13.1 ISO/IEC 27701

Privacy engineering should follow ISO/IEC 27701 principles where practical.

Core principles:

- Data minimization.
- Purpose limitation.
- Transparency.
- Appropriate retention.
- Data accuracy.
- Access controls.
- Privacy risk assessment.
- Secure processing.
- Data-subject rights.
- Vendor/data-processor management.

---

# 14. GDPR

If the platform processes personal data of people protected by the GDPR, the product must support applicable GDPR requirements.

The implementation should consider:

- Lawful processing.
- Privacy notices.
- Consent where required.
- Data minimization.
- Purpose limitation.
- Data retention.
- Access requests.
- Correction.
- Deletion where applicable.
- Data portability where applicable.
- Data-processing agreements.
- International data transfers.
- Data breach procedures.
- Cookie/tracking consent where required.

A legal/privacy review should determine the actual applicability and obligations.

---

# 15. CCPA/CPRA

If the platform falls within the scope of California privacy laws, it should support applicable requirements concerning:

- Notice at collection.
- Consumer access.
- Correction.
- Deletion.
- Opt-out rights.
- Sensitive personal information handling.
- Data sharing.
- Service-provider/contractor relationships.

Legal applicability must be assessed based on the organization's activities and users.

---

# 16. Health Information Boundary

The MVP is an **educational seminar and event platform**, not a clinical medical-record system.

Therefore:

- Do not collect medical histories unnecessarily.
- Do not collect diagnoses.
- Do not collect prescriptions.
- Do not collect patient records.
- Do not store health information unless a future feature explicitly requires it.

If the product later introduces clinical services or protected health information, a separate healthcare compliance assessment must be performed, including applicable jurisdiction-specific requirements.

---

# 17. Payment Security

## PCI DSS v4.0.1

The platform must meet all applicable PCI DSS requirements.

### Recommended architecture

```text
Customer
   |
   v
Next.js Checkout
   |
   v
Payment Provider
   |
   | Payment Result / Webhook
   v
Next.js API
   |
   v
Prisma
   |
   v
PostgreSQL
```

### Card-data rule

The application should **not store**:

- Full card numbers
- CVV/CVC
- Magnetic-stripe data
- PIN data

Use hosted/tokenized payment mechanisms whenever possible.

The server must verify payment status through the payment provider's trusted webhook/API rather than trusting the browser.

---

# 18. Payment and Order Integrity

The following values must be server-authoritative:

- Ticket price
- Discount amount
- Tax where applicable
- Order total
- Ticket availability
- Ticket quantity limits
- Registration status
- Payment status

Never trust:

```text
price
total
role
discount
payment_status
inventory
```

when received from the browser.

---

# 19. Inventory and Ticket Concurrency

Ticket inventory must protect against race conditions.

Recommended flow:

1. User selects ticket.
2. Server validates availability.
3. Server creates a temporary reservation.
4. Inventory is reserved atomically.
5. Payment session is created.
6. Payment completes.
7. Webhook confirms payment.
8. Registration is created.
9. Reservation is finalized.
10. Expired reservations release inventory.

Database transactions and appropriate locking/constraints must be used.

---

# 20. HTTPS and TLS

Production traffic must use HTTPS.

Recommended:

- TLS 1.3 preferred.
- TLS 1.2 only where compatibility requires it.
- HTTP automatically redirected to HTTPS.
- HSTS enabled after validating deployment.
- No mixed content.
- Secure cookies.
- Certificate monitoring/renewal.

---

# 21. Security Headers

The production application should configure appropriate security headers, including:

- Content-Security-Policy (CSP)
- Strict-Transport-Security (HSTS)
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy
- Appropriate frame restrictions using CSP `frame-ancestors`

The CSP should use explicit allowlists and avoid unnecessary use of unsafe script directives.

---

# 22. Content Security Policy

CSP should be implemented carefully around:

- Next.js scripts
- Payment provider
- Analytics
- Fonts
- Images
- CDN resources
- Embedded video
- Third-party services

Third-party origins should be explicitly reviewed before being added to CSP.

---

# 23. Database Security

PostgreSQL must follow least-privilege principles.

Requirements:

- No direct public database exposure.
- Encrypted database connections where supported.
- Separate credentials for environments.
- Separate development/staging/production databases.
- Restricted database users.
- Automated backups.
- Backup encryption.
- Restore testing.
- Database monitoring.
- Migration control.

---

# 24. Prisma Security

Prisma should be used as the normal database-access layer.

Requirements:

- Validate input before database operations.
- Avoid unsafe raw SQL.
- Parameterize unavoidable raw SQL.
- Enforce authorization before queries.
- Avoid returning unnecessary fields.
- Use database constraints in addition to application validation.

---

# 25. API Design

APIs should follow REST principles where REST is used.

Recommended:

**OpenAPI 3.1**

API documentation should define:

- Endpoints
- Methods
- Parameters
- Request schemas
- Response schemas
- Authentication
- Authorization
- Error formats
- Rate limits
- Versioning

---

# 26. Data Formats

Use:

- JSON for API payloads.
- UTF-8 encoding.
- ISO 8601 / RFC 3339 timestamps.
- Standard HTTP status codes.
- Consistent error-response structures.

---

# 27. Date, Time and Time Zones

All event dates and times must be timezone-aware.

Database recommendations:

- Store timestamps consistently, preferably in UTC.
- Store the event's IANA timezone separately.
- Display dates/times in the event's local timezone.
- Display timezone abbreviations where useful.

Example:

```text
2026-10-30T08:00:00-04:00
```

Avoid storing event schedules as ambiguous strings such as:

```text
October 30, 8 AM
```

---

# 28. Internationalization

The application should be designed for international deployment.

Requirements:

- Unicode/UTF-8.
- Timezone support.
- Currency abstraction.
- Locale-aware dates.
- Locale-aware number formatting.
- International phone-number support.
- Address fields suitable for multiple countries.
- Translation-ready UI architecture.
- Avoid hard-coded country assumptions.

---

# 29. Email Security

The domain should implement:

- SPF
- DKIM
- DMARC

Recommended DMARC rollout:

```text
p=none
   ↓
p=quarantine
   ↓
p=reject
```

Email systems should also monitor:

- Delivery failures.
- Bounces.
- Spam complaints.
- Authentication failures.
- Domain reputation.

---

# 30. DNS Security

DNSSEC is recommended where supported by the DNS provider and deployment architecture.

The domain should also maintain:

- Secure registrar access.
- MFA for domain administration.
- Registrar-lock protections where appropriate.
- Controlled DNS changes.
- Monitoring of important DNS records.

---

# 31. Software Supply-Chain Security

The project should implement:

- Dependency scanning.
- Lockfiles.
- Automated vulnerability alerts.
- Dependabot/Renovate or equivalent.
- SAST.
- Secret scanning.
- SBOM generation.
- Container/image scanning if containers are used.
- Review of third-party packages.

No secret should be committed to Git.

---

# 32. Static Application Security Testing

CI should include appropriate automated checks such as:

- TypeScript type checking.
- ESLint.
- SAST.
- Dependency vulnerability scanning.
- Secret scanning.
- Infrastructure/configuration scanning where applicable.

Tools may include:

- Semgrep
- GitHub CodeQL
- npm audit or equivalent
- Secret-scanning tooling

The exact toolset can vary.

---

# 33. Dynamic Application Security Testing

A staging environment should undergo DAST/security testing before major production releases.

Tests should cover:

- Authentication.
- Authorization.
- Session management.
- Injection.
- XSS.
- CSRF where applicable.
- API access control.
- Rate limiting.
- File upload behavior.
- Checkout security.
- Business logic.

A professional penetration test is strongly recommended before a major public launch.

---

# 34. Threat Modeling

Security threat modeling should be performed for critical flows.

At minimum:

- Authentication
- Admin access
- Checkout
- Payment webhook
- Ticket inventory
- Registration
- Refunds
- File uploads
- Third-party integrations
- Email links
- Password reset

Threat models should be updated when major architecture changes occur.

---

# 35. Audit Logging

Security-sensitive actions must be auditable.

Audit records should capture where appropriate:

- Who performed the action.
- What action occurred.
- When it occurred.
- Which resource was affected.
- Previous state where appropriate.
- New state where appropriate.
- Source/IP metadata where legally and operationally appropriate.

Examples:

- Admin login.
- Failed admin login.
- Event creation.
- Event publication.
- Ticket-price change.
- Registration cancellation.
- Refund.
- Role change.
- Content change.

Never log:

- Passwords.
- CVV.
- Full payment-card numbers.
- Authentication secrets.
- Private API keys.

---

# 36. Logging and Monitoring

Implement structured application logs for:

- API requests.
- Authentication events.
- Payment events.
- Webhook events.
- Errors.
- Background jobs.
- Email delivery.
- Database errors.
- Security events.

Monitoring should cover:

- Application availability.
- API latency.
- Error rates.
- Database health.
- Payment failures.
- Email failures.
- Storage failures.
- Authentication anomalies.

---

# 37. Backup and Disaster Recovery

The platform must have:

- Automated database backups.
- Backup encryption.
- Retention policies.
- Point-in-time recovery where supported.
- Off-site/independent backup strategy.
- Restore testing.
- Documented recovery procedures.

Example targets to validate with the business:

- **RPO:** 15 minutes
- **RTO:** 4 hours

These are proposed targets, not mandatory values.

---

# 38. Business Continuity

Use ISO 22301 principles for business continuity planning.

Document procedures for:

- Database outage.
- Hosting outage.
- Payment-provider outage.
- Email-provider outage.
- DNS outage.
- Security incident.
- Accidental deletion.
- Data corruption.
- Administrator account compromise.

---

# 39. Availability and Reliability

Suggested initial target:

**99.9% monthly availability**

Reliability metrics should include:

- API p50 latency.
- API p95 latency.
- API p99 latency.
- Error rate.
- Database response time.
- Payment success rate.
- Email delivery rate.

Service-level objectives should be finalized before production launch.

---

# 40. Web Performance

The website should target strong **Core Web Vitals**:

- LCP — Largest Contentful Paint
- INP — Interaction to Next Paint
- CLS — Cumulative Layout Shift

Recommended Next.js practices:

- Server Components by default.
- Minimal client-side JavaScript.
- Image optimization.
- Responsive images.
- Proper caching.
- CDN usage.
- Lazy loading for non-critical assets.
- Avoid unnecessary third-party scripts.

---

# 41. SEO and Structured Data

The public website should implement:

- Semantic HTML.
- Unique page titles.
- Meta descriptions.
- Canonical URLs.
- XML sitemap.
- Robots directives.
- Open Graph metadata.
- Social metadata.
- Descriptive image alt text.
- Structured data where applicable.

Relevant structured-data types may include:

- Organization
- Person
- Event
- FAQPage where eligible

---

# 42. Privacy by Design

Privacy must be considered during architecture rather than added after development.

Every collected data field should answer:

> Why do we need this?

If there is no clear business/legal reason, do not collect it.

Examples:

Avoid collecting:

- Unnecessary medical information.
- Unnecessary demographic information.
- Unnecessary identification documents.
- Unnecessary payment information.

---

# 43. Data Retention

Each category of personal data should have a retention rule.

Example categories:

| Data                         | Retention approach                                |
| ---------------------------- | ------------------------------------------------- |
| Account data                 | While account is active + defined deletion period |
| Registration                 | Based on operational/legal requirements           |
| Payment records              | Based on accounting/legal requirements            |
| Marketing consent            | Until withdrawn + audit requirement               |
| Audit logs                   | Defined security retention                        |
| Email logs                   | Defined operational retention                     |
| Abandoned checkout           | Short retention period                            |
| Temporary ticket reservation | Minutes, not indefinite                           |

Final periods must be determined by legal, accounting, and business requirements.

---

# 44. Role-Based Access Control

Recommended roles:

### Super Admin

Full platform access.

### Admin

Operational management.

### Event Manager

Events, tickets, registrations and attendees.

### Content Editor

Pages, FAQs, instructor profiles and educational content.

### Finance

Orders, payments and refunds, without unnecessary content-management access.

Access must follow least privilege.

---

# 45. Separation of Environments

Maintain separate:

- Development
- Testing
- Staging
- Production

Production credentials must never be reused in development.

Production data must not be copied into development unless appropriately sanitized and authorized.

---

# 46. CI/CD Security Gates

A production deployment should be blocked when critical security checks fail.

Recommended pipeline:

```text
Commit
  ↓
Lint
  ↓
Type Check
  ↓
Unit Tests
  ↓
Integration Tests
  ↓
SAST
  ↓
Dependency Scan
  ↓
Secret Scan
  ↓
Build
  ↓
DAST / Staging Tests
  ↓
Security Approval
  ↓
Production Deployment
```

---

# 47. Testing Standards

Testing should cover:

### Unit tests

Business logic and utility functions.

### Integration tests

Database, payment adapters, email services and APIs.

### End-to-end tests

Critical user journeys.

### Security tests

Authentication, authorization and attack scenarios.

### Accessibility tests

Automated plus manual testing.

### Performance tests

Important public and checkout routes.

Critical flows requiring E2E tests:

1. Browse events.
2. Open event.
3. Select ticket.
4. Complete checkout.
5. Payment success.
6. Payment failure.
7. Webhook processing.
8. Registration confirmation.
9. Admin login.
10. Event publication.
11. Refund.
12. Registration lookup.

---

# 48. Payment Webhook Security

Payment webhooks must:

- Verify provider signatures.
- Reject invalid signatures.
- Be idempotent.
- Validate event type.
- Validate transaction/order reference.
- Avoid trusting client payment status.
- Prevent replay attacks where supported.
- Log processing results.
- Handle retries safely.

Duplicate webhook delivery must not create duplicate registrations.

---

# 49. Database Integrity

The database should enforce important business rules through:

- Unique constraints.
- Foreign keys.
- Check constraints where appropriate.
- Transactions.
- Proper indexes.
- Referential integrity.

Application validation and database constraints should complement each other.

---

# 50. File Upload Security

If administrators can upload images/documents:

- Validate MIME type.
- Validate file extension.
- Validate actual file content.
- Enforce file-size limits.
- Rename uploaded files.
- Store outside executable paths.
- Scan files where appropriate.
- Restrict dangerous file types.
- Use signed URLs for private assets.
- Do not trust client filenames.

---

# 51. Third-Party Integration Security

Every third-party integration must be evaluated for:

- Data shared.
- Permissions requested.
- Authentication method.
- Webhook security.
- Data retention.
- Vendor security posture.
- Availability.
- Failure behavior.
- Privacy implications.

Third parties may include:

- Payment provider.
- Email provider.
- Analytics.
- Cloud storage.
- Video platform.
- CAPTCHA/bot protection.

---

# 52. Cookie and Tracking Controls

The application must classify cookies/tracking technologies appropriately.

Where legally required:

- Obtain consent before non-essential tracking.
- Provide understandable cookie information.
- Allow users to change applicable preferences.
- Avoid loading unnecessary tracking before consent.
- Maintain consent records where required.

---

# 53. Incident Response

Maintain an incident-response process covering:

1. Detection
2. Triage
3. Containment
4. Investigation
5. Eradication
6. Recovery
7. Notification where legally required
8. Post-incident review

Security incidents should be documented.

---

# 54. Security Incident Examples

The incident process must account for:

- Admin account compromise.
- Database exposure.
- Payment webhook compromise.
- Credential leakage.
- Malicious file upload.
- XSS.
- SQL injection.
- API authorization bypass.
- Data breach.
- DDoS/availability attack.
- Third-party provider compromise.

---

# 55. Internationalization and Localization

The architecture should allow future:

- Multiple languages.
- Multiple currencies.
- Multiple countries.
- Multiple tax rules.
- Multiple timezones.
- Multiple date formats.
- International phone formats.
- Localized email templates.

Do not hard-code:

```text
USD
United States
MM/DD/YYYY
+1
```

into business logic.

---

# 56. Compliance Matrix

| Requirement                |              MVP |      Production Gate |                        Future |
| -------------------------- | ---------------: | -------------------: | ----------------------------: |
| WCAG 2.2 AA                |              Yes |                  Yes |                    Continuous |
| ISO/IEC 40500 alignment    |              Yes |                  Yes |                    Continuous |
| OWASP ASVS 5.0 L2          |              Yes |                  Yes |                    Continuous |
| OWASP Top 10               |              Yes |                  Yes |                    Continuous |
| OWASP API Security         |              Yes |                  Yes |                    Continuous |
| NIST CSF 2.0               |              Yes |                  Yes |                    Continuous |
| NIST SSDF                  |              Yes |                  Yes |                    Continuous |
| ISO 27001-aligned controls |              Yes |                  Yes |      Certification if desired |
| ISO 27701-aligned privacy  |              Yes |                  Yes |      Certification if desired |
| PCI DSS v4.0.1             | Applicable scope |                  Yes |                    Continuous |
| GDPR readiness             |    If applicable |                  Yes |              Legal assessment |
| CCPA/CPRA readiness        |    If applicable |                  Yes |              Legal assessment |
| TLS/HTTPS                  |              Yes |                  Yes |                    Continuous |
| MFA for admins             |              Yes |                  Yes |       Stronger authentication |
| RBAC                       |              Yes |                  Yes |            Fine-grained roles |
| Audit logs                 |              Yes |                  Yes |                 Advanced SIEM |
| Automated backups          |              Yes |                  Yes |               Multi-region DR |
| SAST                       |              Yes |                  Yes |                    Continuous |
| DAST                       |          Staging |                  Yes |                    Continuous |
| Dependency scanning        |              Yes |                  Yes |                    Continuous |
| SBOM                       |      Recommended |                  Yes |                    Continuous |
| Threat modeling            |              Yes |                  Yes |                    Continuous |
| Penetration test           |      Recommended | Strongly recommended |         Annual/major releases |
| ISO 22301 principles       |      Recommended |          Recommended |                   Formal BCMS |
| SOC 2 Type II              |               No |                   No | If enterprise demand requires |
| HIPAA                      |               No |   Only if applicable |          If PHI is introduced |
| ISO certifications         |               No |                   No |   Optional business objective |

---

# 57. Mandatory Engineering Gates

Before production launch, the following should be treated as release gates:

- WCAG 2.2 AA acceptance testing.
- OWASP ASVS 5.0 Level 2 security review.
- OWASP Top 10 review.
- OWASP API Security review.
- Admin MFA.
- RBAC verification.
- Secure session management.
- HTTPS/TLS.
- HSTS and appropriate security headers.
- CSP review.
- Server-authoritative pricing and inventory.
- Payment webhook signature verification.
- Payment idempotency.
- Database backups.
- Restore test.
- Audit logging.
- Error monitoring.
- SAST.
- Dependency scanning.
- Secret scanning.
- DAST/security testing.
- Threat modeling of critical flows.
- Privacy review.
- Legal terms/disclaimer acceptance tracking.
- SEO validation.
- Core Web Vitals testing.
- E2E testing of checkout and registration.
- Production/staging environment separation.

---

# 58. Recommended Future Enterprise Controls

As the platform grows, consider:

- Formal ISO/IEC 27001 certification.
- Formal ISO/IEC 27701 certification.
- SOC 2 Type II.
- ISO 22301 certification.
- Annual penetration testing.
- External accessibility audit.
- SIEM integration.
- Centralized security monitoring.
- Web Application Firewall.
- DDoS protection.
- Multi-region disaster recovery.
- Passkeys for administrators.
- Hardware security keys for privileged users.
- Advanced fraud detection.
- Vendor-risk management.
- Formal security awareness training.
- Security bug bounty or responsible disclosure program.

---

# 59. Definition of International-Standard Readiness

The website/web application can be considered **industry-grade and internationally deployable** when:

1. Accessibility meets WCAG 2.2 AA.
2. Application security is verified against OWASP ASVS 5.0 Level 2.
3. Applicable OWASP Top 10/API risks are addressed.
4. Admin accounts use MFA.
5. RBAC and least privilege are enforced.
6. Payment processing follows applicable PCI DSS requirements.
7. Personal data is handled according to applicable privacy laws.
8. HTTPS and modern security headers are enforced.
9. Critical business logic is server-authoritative.
10. Payment webhooks are verified and idempotent.
11. Database backups and recovery are tested.
12. Security and audit logs are available.
13. SAST, DAST, dependency and secret scanning are integrated into CI/CD.
14. Threat modeling covers critical workflows.
15. Accessibility, performance and E2E tests pass.
16. Privacy, retention and legal requirements are documented.
17. Incident-response procedures exist.
18. Production monitoring and alerting are operational.
19. The system supports international currencies, timezones and localization architecture.
20. No claim of formal certification is made unless certification has actually been obtained.

---

# 60. Primary Standards to Put in the Developer Contract

The developer/project team should explicitly agree to build against this minimum baseline:

> **Accessibility:** WCAG 2.2 Level AA  
> **Application Security:** OWASP ASVS 5.0 Level 2  
> **API Security:** OWASP API Security Top 10  
> **Security Risk:** OWASP Top 10  
> **Cybersecurity:** NIST CSF 2.0  
> **Secure Development:** NIST SSDF SP 800-218  
> **Information Security:** ISO/IEC 27001:2022-aligned controls  
> **Privacy:** ISO/IEC 27701 principles + applicable privacy laws  
> **Payments:** PCI DSS v4.0.1 applicable requirements  
> **Identity:** NIST SP 800-63-4 applicable principles  
> **Transport:** HTTPS with modern TLS  
> **Email:** SPF + DKIM + DMARC  
> **API Documentation:** OpenAPI 3.1  
> **Date/Time:** ISO 8601 / RFC 3339  
> **Business Continuity:** ISO 22301 principles  
> **Performance:** Core Web Vitals  
> **Software Supply Chain:** Dependency scanning + SBOM + secret scanning

---

## 61. Important Legal and Certification Note

Following these requirements does **not automatically make the organization legally compliant or certified**.

The project should distinguish between:

- **Engineering standards** — e.g. WCAG, OWASP, NIST.
- **International management standards** — e.g. ISO/IEC 27001.
- **Technical payment standards** — e.g. PCI DSS.
- **Privacy/security laws** — e.g. GDPR and CCPA/CPRA.
- **Formal certifications/audits** — independently verified claims requiring their own process.

For launch, the development team should document which requirements are:

**Implemented → Tested → Verified → Audited → Certified**

rather than simply stating that the website is “internationally compliant.”

---

## 62. Reference Authorities

The project should maintain current copies/references to the authoritative publications from:

- W3C — Web Content Accessibility Guidelines (WCAG)
- OWASP — Application Security Verification Standard and OWASP Top 10/API Security
- NIST — Cybersecurity Framework, Digital Identity Guidelines and Secure Software Development Framework
- ISO/IEC — 27001, 27701, 40500 and 22301
- PCI Security Standards Council — PCI DSS
- Applicable privacy regulators and legal counsel

Standards should be reviewed periodically because versions and regulatory requirements can change.
