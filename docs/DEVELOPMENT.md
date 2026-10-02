# MUETY STORE — DEVELOPMENT GUIDE

## Setup & Prerequisites

- **Node.js**: >= 18.x
- **npm**: >= 9.x

### Installation

```bash
npm install
```

## Available NPM Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the local development server with Vite hot-reloading |
| `npm run typecheck` | Executes TypeScript compiler verification (`tsc --noEmit`) |
| `npm run lint` | Runs ESLint check across TypeScript codebase |
| `npm run format` | Formats code with Prettier |
| `npm run format:check` | Verifies code formatting via Prettier |
| `npm run test` | Executes unit tests with Vitest |
| `npm run build` | Performs typechecking then bundles application with Vite |
| `npm run check` | Combined quality check (`typecheck` + `lint`) |
| `npm run preview` | Previews production build locally |
| `npm run seed:firebase` | Runs script to seed catalog to live Firebase Firestore |

## Environment Configuration

Copy `.env.example` to `.env.local` or configure environment variables:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxx
```

All environment variable access is validated at runtime via `src/lib/config/env.ts`.

## Testing & Quality Assurance

Before committing code, ensure all quality checks pass:

```bash
npm run check
npm run test
npm run build
```
