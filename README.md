# MUETY STORE — PRODUCTION ARCHITECTURE BASELINE

MUETYSTORE is a domain-oriented luxury e-commerce platform built with React 18, Vite, TypeScript, and Firebase/Firestore integration.

## Project Purpose

MUETYSTORE provides an end-to-end digital luxury storefront showcasing handcrafted silk sarees, bridal couture, fine jewelry, and luxury apparel. The platform features dynamic real-time inventory management, promo engines, customer concierges, and an executive administration dashboard.

## Technology Stack

- **Core Library**: React 18
- **Build Tool**: Vite 5
- **Language**: TypeScript 5
- **Routing**: React Router DOM 6
- **Styling**: Vanilla CSS with Design System Tokens (`src/styles/index.css`)
- **Database & Cloud**: Firebase Cloud Firestore SDK 10
- **Payments**: Razorpay Client SDK Adapter
- **Icons**: Lucide React
- **Testing**: Vitest
- **Code Quality**: ESLint, Prettier

## Folder Structure

```
muetystore/
├── docs/                   # Architecture, Development, Security & Data Documentation
│   ├── ARCHITECTURE.md
│   ├── DATA-MODEL.md
│   ├── DEPLOYMENT.md
│   ├── DEVELOPMENT.md
│   ├── FIREBASE.md
│   └── SECURITY.md
├── scripts/                # Seed tooling & administrative scripts
│   └── seed/
│       ├── seedData.ts
│       └── seed-to-firebase.mjs
├── src/
│   ├── app/                # Application Shell, Providers & Router
│   ├── features/           # Domain-Oriented Features (auth, catalog, cart, admin, etc.)
│   ├── shared/             # Shared Components, Contexts & Types
│   ├── lib/                # Infrastructure Adapters (config, firebase, payments, storage)
│   ├── styles/             # CSS Design System
│   └── assets/             # Media Assets
```

## Available Scripts

```bash
npm run dev           # Start Vite development server
npm run typecheck     # Run TypeScript type validation
npm run lint          # Run ESLint check
npm run format        # Format code with Prettier
npm run format:check  # Check formatting compliance
npm run test          # Run Vitest test suite
npm run build         # Perform type check and create production build
npm run check         # Run full quality check (typecheck + lint)
npm run preview       # Preview production build locally
npm run seed:firebase # Seed baseline catalog to live Firebase Cloud Firestore
```

## Environment Setup

Create `.env.local` based on `.env.example`:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxx
```

## Security Notes

- Public environment variables are validated through `src/lib/config/env.ts`.
- Server-side verification (such as Razorpay Secret signatures) must be handled on backend/serverless functions.
- Firestore Security Rules enforce role-based access control for admin write operations.
