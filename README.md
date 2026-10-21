# MUETY — Handcrafted Silk & Luxury Ethnic Wear

> **Production Luxury E-Commerce Platform & Enterprise Retail Operations Engine**  
> Built with React 18, Vite 6, TypeScript 5, Firebase Cloud Firestore, Razorpay, and Cloudinary.

---

## 🌟 Platform Overview

**MUETY** (`muety.in`) is an end-to-end luxury e-commerce platform and retail operations ERP engineered for heritage silk sarees, bridal couture, fine jewelry, and handcrafted ethnic wear. The platform pairs a high-performance, mobile-first customer storefront with an enterprise-grade administration suite.

### Key Capabilities

- **✨ Luxury Customer Storefront**:
  - Heritage catalog showcase featuring Salem handlooms, pure mulberry silk (Silk Mark certified), and bespoke bridal weaves.
  - Multi-attribute filtering (category, price range, occasions, colors, availability), real-time search, and sorting.
  - Atelier Concierge integration for direct WhatsApp drape consultations with master stylists.
  - Floating cart drawer, persistent wishlist, coupon/promo discount engine, and Razorpay checkout.

- **🛡️ Patron Identity & Strict Privacy**:
  - Dual authentication supporting Mobile Phone OTP (Firebase Recaptcha/SMS) and Google One-Tap/OAuth.
  - Seamless account credential linking (connecting Google account to an existing phone-authenticated patron profile).
  - Dedicated 2-column customer portal: Account Overview, Order History with live tracking timeline, Delivery Addresses (with Indian state and PIN code validation), Profile Settings, and Connected Accounts.
  - **Zero Leaks Privacy Architecture**: Internal database identifiers (`#MUETY-...` Patron IDs) and product SKU identifiers are strictly hidden across all customer-facing views for buyer elegance and confidentiality.

- **💼 Executive Admin ERP Suite (`admin.muety.in`)**:
  - **Role-Based Access Control (RBAC)**: Enforced roles (`super_admin`, `admin`, `catalog_manager`, `order_manager`, `support_rep`) with domain isolation.
  - **Catalog & SKU System**: Category-code based SKU suggestion algorithm (`categoryCodeService`), collision prevention, and manual availability overrides (In Stock, Low Stock, Sold Out).
  - **Customer Relationship Management (CRM)**: Customer lookup, lifetime spend analytics, and automated synchronization of verified storefront authentication emails.
  - **Operations Engine**: Order workflow management, shipment tracking, promo coupon manager, hero banner sliders, announcement tickers, customer reviews moderation, and immutable audit logs.

- **☁️ Cloudinary Media Pipeline**:
  - Automated signed upload architecture via serverless functions (`/api/cloudinary/sign`).
  - Secure media deletion and responsive image delivery.

- **🌐 Multi-Domain Distribution Pipeline**:
  - Automated build packaging (`scripts/build/prepare-dist.mjs`) generating distribution manifests and redirects for Storefront (`muety.in`), Admin (`admin.muety.in`), and standalone Countdown (`countdown.muety.in`).

---

## 🏗️ Technology Stack

| Layer                       | Technologies                                                   |
| --------------------------- | -------------------------------------------------------------- |
| **Core Framework**          | React 18.3, React Router DOM 6.28                              |
| **Build & Tooling**         | Vite 6.0, TypeScript 5.6                                       |
| **Styling & Design System** | Vanilla CSS with Design System Tokens (`src/styles/index.css`) |
| **Database & Identity**     | Firebase Auth & Cloud Firestore 10.14, Firebase Admin SDK 14.5 |
| **Payment Gateway**         | Razorpay Client SDK & Signature Verification Adapter           |
| **Media Management**        | Cloudinary REST API & Netlify Serverless Functions             |
| **Icons & Micro-UI**        | Lucide React, Canvas Confetti                                  |
| **Testing & Quality**       | Vitest 3.0, TypeScript `tsc --noEmit`, ESLint 9                |

---

## 📁 Repository Structure

```
muetystore/
├── countdown/                 # Standalone Launch Countdown application & assets
├── docs/                      # Architectural, Security, Data & Legal Documentation
│   ├── ARCHITECTURE.md        # Modular architecture specification & dependency direction
│   ├── DATA-MODEL.md          # Firestore collections & entity schemas
│   ├── DEPLOYMENT.md          # Multi-domain Netlify & production DNS guidelines
│   ├── FIREBASE.md            # Firestore indexes, rules & emulator instructions
│   └── SECURITY.md            # RBAC matrix, API verification & data integrity
├── netlify/                   # Netlify serverless functions (Cloudinary & Admin APIs)
│   └── functions/
├── public/                    # Static brand assets, favicons, and _redirects
├── scripts/                   # Distribution packaging & Firebase seeding utilities
│   ├── build/                 # prepare-dist.mjs (Multi-domain packager)
│   ├── firebase/              # Cloud Firestore bootstrap & seed scripts
│   └── seed/                  # Baseline seed datasets
├── src/
│   ├── app/                   # App shell, context providers & routing configuration
│   ├── features/              # Domain-driven feature modules
│   │   ├── admin/             # ERP dashboards, orders, products, CRM, banners & settings
│   │   ├── auth/              # Phone OTP, Google OAuth & RBAC services
│   │   ├── banners/           # Hero banners & announcement ticker services
│   │   ├── cart/              # Cart drawer state & persistent bag management
│   │   ├── catalog/           # Products, categories, SKU service & atelier showcase
│   │   ├── checkout/          # Razorpay payment integration & checkout page
│   │   ├── coupons/           # Promotional codes & discount engine
│   │   ├── customers/         # Customer account portal & address management
│   │   ├── inquiries/         # Concierge & customer service ticket workflows
│   │   ├── orders/            # Order fulfillment, lifecycle status & invoices
│   │   ├── reviews/           # Customer review management & moderation
│   │   └── wishlist/          # Saved creations & wishlist operations
│   ├── lib/                   # Infrastructure adapters
│   │   ├── config/            # Validated runtime environment config (`env.ts`)
│   │   ├── firebase/          # Firestore client configuration & safety guards
│   │   ├── media/             # Cloudinary upload & asset management
│   │   └── storage/           # Local storage cache with reactive fallback layer
│   ├── shared/                # Cross-cutting UI components, contexts, and domain types
│   ├── styles/                # Global CSS design tokens, animations & responsive styles
│   └── tests/                 # Vitest regression suites (20+ test files, 320+ test cases)
└── firestore.rules            # Firestore declarative security rules
```

---

## 🚀 Quick Start

### 1. Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 2. Installation

```bash
# Clone repository
git clone https://github.com/muetystore/muety.git
cd muety

# Install dependencies
npm install
```

### 3. Environment Configuration

Create a `.env` or `.env.local` file in the project root:

```env
# Firebase Client SDK Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Payments
VITE_RAZORPAY_KEY_ID=rzp_live_xxxxxxxx

# Multi-Domain Origins
VITE_STORE_APP_URL=https://muety.in
VITE_ADMIN_APP_URL=https://admin.muety.in

# Cloudinary & Backend Secrets (Serverless / Admin)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 4. Running Locally

```bash
# Start Vite development server (defaults to http://localhost:5173)
npm run dev

# Start Countdown preview server
npm run countdown
```

---

## 🛠️ Available Scripts

| Command                     | Purpose                                                                                                          |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `npm run dev`               | Starts the Vite local development server with HMR.                                                               |
| `npm run build`             | Runs TypeScript compilation, Vite production bundle, and executes `prepare-dist.mjs` for multi-domain packaging. |
| `npm run preview`           | Previews the production build locally.                                                                           |
| `npm test`                  | Runs the complete Vitest regression suite.                                                                       |
| `npm run typecheck`         | Validates TypeScript types across the entire project (`tsc --noEmit`).                                           |
| `npm run lint`              | Runs ESLint validation.                                                                                          |
| `npm run format`            | Formats TypeScript, CSS, and Markdown with Prettier.                                                             |
| `npm run check`             | Runs full quality audit (`typecheck` + `lint`).                                                                  |
| `npm run firebase:seed:dev` | Seeds development data into the active Firestore database.                                                       |

---

## 🧪 Testing & Quality Assurance

MUETY includes a comprehensive test suite with over 320 tests spanning storefront flows, ERP logic, security rules, and integration behaviors:

```bash
# Run all unit and integration tests
npm test

# Run a specific domain test file
npx vitest run src/tests/patronIdAndCrmEmailSync.test.ts
npx vitest run src/tests/categoryCodeAndSku.test.ts
npx vitest run src/tests/customerAuthRestructure.test.ts
```

### Key Test Suites

- **Patron Privacy & CRM Sync** (`src/tests/patronIdAndCrmEmailSync.test.ts`): Verifies internal patron ID masking in storefront components, real verified email population in CRM, and phone-only account states.
- **Category Code & SKU Engine** (`src/tests/categoryCodeAndSku.test.ts`): Verifies two-letter category codes, sequential SKU generation, collision detection, and migration logic.
- **Customer Auth Restructure** (`src/tests/customerAuthRestructure.test.ts`): Verifies phone OTP flows, Google linking, neutral greetings, and 2-column dashboard layout.
- **Security & Authorization** (`src/tests/security/securityPolicies.test.ts`): Audits role-based access for Super Admin, Admin, and Staff roles.

---

## 🔒 Security & Data Integrity

1. **Authentication Email Authority**:
   - Storefront authentication emails originate strictly from verified Firebase Authentication identities.
   - Profile update forms cannot overwrite or fabricate authentication emails.
   - Phone-only patrons display `Not connected` instead of dummy or placeholder addresses.
2. **Identifier Confidentiality**:
   - Firestore document IDs and internal `#MUETY-...` Patron IDs are restricted to authorized admin portals and CRM views.
   - Customers interact solely with their authentic personal credentials (name, verified mobile, connected email) and order tracking numbers (`MUE-YYYY-XXXX`).
3. **Firestore Security Rules**:
   - Write access to sensitive collections (`products`, `banners`, `coupons`, `settings`, `audit_logs`) requires verified administrative authentication claims.
   - Customer document updates are restricted to the authenticated document owner.

---

## 📄 License & Attribution

Copyright © 2026 **MUETY** (`muety.in`). All rights reserved.  
Crafted with pride by Yazhai Labs.
