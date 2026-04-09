# Code Style & Conventions

- Language: TypeScript with Next.js App Router and React 19.
- Components: Use Client Components (`'use client'`) when relying on browser APIs or React state hooks.
- Imports: Absolute imports via `@/` alias for `src`.
- Auth: Prefer central auth flows in `AuthContext`. Automatically sign in anonymously to satisfy Firestore rules; expose `signInWithGoogle`, `logout`.
- Firestore: Access via `db` from `src/lib/firebase`. Use `createdAt: new Date()` on writes and store `userId` when applicable.
- UI: Tailwind CSS utility classes. Keep components small and focused.
- Tests: Jest + Testing Library patterns for page and lib units under `src/__tests__`.
