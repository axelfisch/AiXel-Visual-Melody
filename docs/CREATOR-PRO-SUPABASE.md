# Creator Pro authentication

Authentication is optional. When the public Supabase variables are absent, Visual Melody starts directly in anonymous Free mode and no hosted request is made.

## Local verification

1. Install and start Docker.
2. Run `npm ci`.
3. Run `npm run supabase:start`.
4. Run `npm run supabase:test` and `npm run supabase:lint`.
5. Run `npm run supabase:types` after every database schema change and commit the generated type file.

The normal web checks remain `npm run test:run` and `npm run build`.

## Hosted configuration

Copy `.env.example` into the hosting provider's environment settings. Only the project URL and browser publishable key belong in the Vite bundle. Never add a Supabase secret or service-role key to a `VITE_` variable.

Configure the Supabase Auth URL allow list with exact origins used by the app. Production currently uses `https://visualmelody.netlify.app`; local development uses `http://localhost:5173`. Wildcards are intentionally not used.

Google OAuth is disabled by default in `supabase/config.toml`. Enable it only after its client ID and secret are stored outside the repository and the Supabase callback URL is registered with Google.

## Data boundary

The `profiles` table contains non-billing account preferences only. A trusted Auth trigger provisions one profile per user. Row-level security permits authenticated users to read and update only their own documented fields. Billing and entitlement data are deliberately outside this ticket.
