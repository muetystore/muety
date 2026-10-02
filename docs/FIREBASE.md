# MUETY STORE — FIREBASE & CLOUD INTEGRATION

## Overview

MUETYSTORE supports live sync with Firebase Firestore alongside a client-side localStorage fallback strategy.

## Collections Schema

| Collection | Description | Document ID Strategy |
| :--- | :--- | :--- |
| `products` | Product catalog items | `prod-<timestamp>-<rand>` |
| `categories` | Atelier categories | `cat-<slug>` |
| `orders` | Customer order transactions | `MT-<timestamp>-<rand>` |
| `coupons` | Promo codes & discounts | `cpn-<code/id>` |
| `reviews` | Patron reviews & ratings | `rev-<timestamp>-<rand>` |
| `inquiries` | Support & concierge inquiries | `inq-<timestamp>-<rand>` |

## Hybrid Sync Strategy

1. **Reads**: Real-time Firestore subscriptions via `onSnapshot` keep application state reactive. If offline or Firebase environment variables are unconfigured, application falls back to `storageService` cache.
2. **Writes**: Writes update local state immediately for responsive UI, then asynchronously sync to Firestore.
3. **Cloud Population**: Executive administrators can push the baseline catalog directly from the Admin Dashboard or via `npm run seed:firebase`.
