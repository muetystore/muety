# MUETY STORE — PRODUCTION ARCHITECTURE BASELINE

## Overview

MUETYSTORE is a domain-driven, production-ready e-commerce web application engineered with Vite, React 18, TypeScript, and Firebase/Firestore integration.

## Architecture Layers & Path Aliases

```
src/
├── app/                  # Application Shell & Bootstrap Layer (@app/*)
│   ├── providers/        # Combined Context Providers (AppProviders.tsx)
│   ├── router/           # Code-split Client Router (AppRouter.tsx)
│   └── App.tsx           # Main Root Entry Point
│
├── features/             # Domain-Driven Feature Modules (@features/*)
│   ├── admin/            # Executive Dashboard & Store Management
│   ├── auth/             # User Authentication & Role Management
│   ├── cart/             # Shopping Bag & Persistent Wishlist State
│   ├── catalog/          # Products, Categories & Atelier Showcase
│   ├── checkout/         # Order Checkout Flow & Payment Adapters
│   ├── coupons/          # Promo Code & Discount Engine
│   ├── customers/        # Customer Accounts & Profile Management
│   ├── inquiries/        # Customer Support & Atelier Concierge Inquiries
│   ├── notifications/    # Push, Toast & Email Notification Services
│   ├── orders/           # Order Tracking & Fulfillment Lifecycle
│   └── reviews/          # Patron Testimonials & Review Moderation
│
├── shared/               # Cross-Cutting Shared Modules (@shared/*)
│   ├── components/       # Shared UI & Festive Components (ui/*, festive/*)
│   ├── context/          # Shared App Contexts (Auth, Cart, Notification)
│   └── types/            # Genuinely Shared Domain Types
│
├── lib/                  # Infrastructure & Service Adapters (@lib/*)
│   ├── config/           # Validated Runtime Env Config (env.ts)
│   ├── firebase/         # Live Firestore Client & Fallback Controls
│   ├── notifications/    # Email OTP & FormSubmit Adapters
│   ├── payments/         # Razorpay Infrastructure Adapter
│   └── storage/          # Storage Cache & Fallback Layer (storageService.ts)
│
├── styles/               # Global Brand CSS Tokens & Design System (@styles/*)
└── assets/               # Production Static Media Assets (@assets/*)
```

## Dependency Direction & Boundary Rules

1. `app` → `features` → `shared` → `lib`
2. UI presentation components inside `shared/components` MUST NOT depend on business domains.
3. Feature domains own their respective business logic, services, and domain types.
4. Infrastructure concerns (Firebase SDK initialization, Razorpay integration, Env Validation) reside strictly in `src/lib`.
5. No direct `import.meta.env.*` access outside of `src/lib/config/env.ts`.

## Seed & Tooling Scripts

- Seed datasets and Firestore cloud sync tools reside under `scripts/seed/`:
  - `scripts/seed/seedData.ts`: Baseline catalog, coupon, category, and review seed records.
  - `scripts/seed/seed-to-firebase.mjs`: CLI seed tool for populating live Firebase Firestore.
