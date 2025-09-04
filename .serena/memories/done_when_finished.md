# Done Checklist

- Build compiles: `npm run build`
- Core flows work locally:
  - Create schedule (triggers anonymous sign-in if needed)
  - View schedule by ID (waits for auth before reading Firestore)
  - Add participant to a schedule
  - Optional: Google sign-in works
- No 404s from main nav links (`/about`, `/login`, `/schedule/demo`)
- Firestore security rules appropriate for the environment (dev vs prod)
- Environment vars set for Firebase (`NEXT_PUBLIC_FIREBASE_*`)