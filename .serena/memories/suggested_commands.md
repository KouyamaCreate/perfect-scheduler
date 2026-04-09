# Suggested Commands

- Run dev server: `npm run dev`
- Build: `npm run build`
- Start (prod): `npm run start`
- Lint: `npm run lint`
- Tests (all): `npm test`
- Tests (watch): `npm run test:watch`
- Tests (coverage): `npm run test:coverage`

# Firestore Rules
- Dev (open rules): use `firestore.rules.dev` during local development (manual copy or tooling); do not deploy to production.
- Prod (locked-down rules): `firestore.rules` requires authenticated users (anonymous or Google) for reads/writes.
