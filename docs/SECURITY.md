# MUETY STORE — SECURITY ARCHITECTURE & BOUNDARIES

## Security Guidelines & Boundaries

1. **Client-Side Environment Access**
   - Public client credentials (`VITE_FIREBASE_*`, `VITE_RAZORPAY_KEY_ID`) are accessed ONLY through `src/lib/config/env.ts`.
   - Direct `import.meta.env` references across application UI components or domain services are strictly prohibited.

2. **Secret Separation**
   - Private payment secrets (e.g. Razorpay Key Secret), SMS provider secrets, server-side webhook signatures, and admin master credentials MUST NOT be bundled in client-side Vite builds or exposed in `VITE_*` environment variables.
   - Privileged operations (payment verification, server-side order signature validation, administrative role elevation) must be processed through backend serverless endpoints or Firebase Cloud Functions.

3. **Firestore Security & Data Validation**
   - All client-side requests to Firebase Firestore must be governed by strict Firestore Security Rules.
   - Role-based access control (RBAC) ensures only authenticated users with `role: 'admin'` can mutate global settings, product pricing, or coupon records.

4. **Third-Party API Integrations**
   - Customer support form submissions (FormSubmit) and Email OTP verification are isolated inside `src/lib/notifications/`.
