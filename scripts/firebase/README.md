# MUETYSTORE — Automated Firebase Initialization & Governance

This directory contains the server-side, idempotent automated initialization architecture for MUETYSTORE using the **Firebase Admin SDK**.

---

## Architecture Overview

```
scripts/firebase/
├── bootstrap.mjs            # Main entrypoint (npm run firebase:setup)
├── seed-auth.mjs            # Auth admin user bootstrap & multi-role custom claims
├── seed-firestore.mjs       # Authoritative Firestore catalog, categories & settings seeding
├── status.mjs               # Status inspection script (npm run firebase:status)
├── admin-init.mjs           # Privileged Firebase Admin SDK initialization helper
├── README.md                # Technical documentation
└── config/
    ├── muety-settings.json  # StoreSettings configuration (Address, Phone, Email)
    ├── catalog.json         # Real Muety pure silk saree catalog & categories
    └── coupons.json         # Active promotional campaign configuration
```

---

## Environment Variables

Server-side initialization variables must be isolated from client `VITE_*` variables:

| Variable | Description | Default / Example |
|---|---|---|
| `FIREBASE_PROJECT_ID` | Production Firebase Project ID | `muetystore-fdad2` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to Firebase Admin Service Account JSON | `./service-account.json` |
| `BOOTSTRAP_ADMIN_EMAIL` | First administrator email address | `kalvimohan03@gmail.com` |
| `BOOTSTRAP_ADMIN_PASSWORD` | First administrator account password | *(Secure secret)* |

---

## Available Commands

### 1. Complete Idempotent Setup
Runs auth bootstrap, role assignment, and Firestore catalog initialization:
```bash
npm run firebase:setup
```

### 2. Infrastructure Status Inspection
Checks collection counts and verification status:
```bash
npm run firebase:status
```

---

## Security Governance

- **Zero Passwords in Git**: Administrator passwords and service account keys are read exclusively from environment variables or local ignored config files.
- **Privileged Role Assignment**: Multi-role Custom Claims (`roles: ["super_admin", "admin"]`) can only be modified by the server-side Admin SDK.
- **Production Data Integrity**: Production setup creates **0 fake orders**, **0 fake inquiries**, and **0 fake reviews**. Real transactions and inquiries are generated exclusively through user interactions.
