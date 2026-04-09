# Meetrace LLMs Guide

## Overview

- Purpose: schedule coordination app that lets a creator publish candidate dates/times and lets participants register availability.
- Frontend: Next.js 15 App Router, React 19, TypeScript.
- Backend: Firebase Authentication + Firestore.
- Styling: Tailwind CSS 4 with app-wide tokens in `src/app/globals.css`.

## Core Product Flows

- `src/app/page.tsx`: landing page.
- `src/app/create/page.tsx`: create a schedule document in Firestore.
- `src/app/schedule/[id]/page.tsx`: view/edit a schedule and register participant availability.
- `src/app/me/page.tsx`: list schedules created by or joined by the current user.
- `src/app/login/page.tsx`: opens login modal for Google sign-in or guest use.
- `src/app/about/page.tsx`: usage guide.

## Firebase Model

- Auth is required for Firestore access.
- Anonymous sign-in is the default fallback for guests.
- Google sign-in is optional and upgrades the UX, but core schedule creation/join flows must still work for anonymous users.
- Main collection: `schedules/{scheduleId}`.
- Participant subcollection: `schedules/{scheduleId}/participants/{userId}`.
- `participants` document IDs are fixed to the authenticated `uid`.

## Important Constraints

- Firestore rules in `firestore.rules` require `request.auth != null`.
- Schedule creation must wait for a real authenticated user before calling `setDoc`, otherwise deployed builds can hit `permission-denied`.
- Anonymous auth must be enabled in Firebase Console for production.
- If deploying to a static or partially static host, avoid depending on Next image optimization and aggressive App Router prefetching.

## Key Files

- `src/contexts/AuthContext.tsx`: auth state, auto anonymous sign-in, login/logout actions.
- `src/lib/auth.ts`: Firebase auth helpers.
- `src/lib/firebase.ts`: Firebase app/auth/db initialization.
- `src/components/AppHeader.tsx`: top navigation used across main app pages.
- `firestore.rules`: production Firestore security rules.
- `README.md`: setup and deployment notes.

## Local Commands

```bash
npm install
npm run dev
npm run build
npm test
```

## Environment Variables

Required public Firebase vars:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## Testing Notes

- Jest is configured in `jest.config.js` and `jest.setup.js`.
- Existing tests are concentrated in `src/__tests__`.
- For auth/firestore related changes, verify both `npm run build` and the relevant Jest tests because several flows depend on mocked Firebase APIs.

## Safe Change Guidelines

- Preserve anonymous-user compatibility unless the task explicitly removes guest usage.
- Keep Firestore reads/writes aligned with the current security rules.
- Prefer minimal schema changes; `my page` and participant aggregation assume the current `schedules` plus `participants` layout.
- When changing navigation, account for deployed environments where `?_rsc` prefetches may not be supported cleanly.
