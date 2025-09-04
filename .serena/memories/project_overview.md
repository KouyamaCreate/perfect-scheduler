# Project Overview

- Purpose: A Next.js web app for collaborative schedule coordination (creating events, sharing links, collecting availability), designed to be usable with Google sign-in or as a temporary/guest (anonymous) user.
- Tech stack: Next.js 15 (App Router), React 19, TypeScript, Firebase (Auth, Firestore), Tailwind CSS 4, Jest + Testing Library for tests.
- Structure:
  - `src/app`: Next.js routes (`/`, `/create`, `/schedule/[id]`, `/schedule/demo`, plus new `/about`, `/login`, `/demo` redirect)
  - `src/contexts`: `AuthContext` providing auth state and actions
  - `src/lib`: `firebase.ts` (init), `auth.ts` (auth helpers)
  - `src/components`: UI components including `AuthHeader`, `LoginModal`, and debug helpers
  - `firestore.rules`, `firestore.rules.dev`: Firestore security rules (prod vs. dev)
- Key behavior: Automatically signs users in anonymously on first visit to satisfy Firestore rules that require `request.auth != null`, while allowing optional Google sign-in.
