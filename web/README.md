# Product Ingredient – web build (Netlify + Supabase)

- `shim.js` adds `window.claude` (db / user / sample / downloads) backed by Supabase, so the same `product-ingredient.html` runs outside claude.ai.
- `build_web.py` writes `dist/index.html` (app + Supabase client + shim). Run `python3 web/build_web.py`.
- `netlify.toml` publishes `dist/`.
- Supabase project: `oaoedrenioyezaxiyqyu` (tables + RLS applied by migrations). Edge Function `ai` calls the Claude API and needs the secret `ANTHROPIC_API_KEY`.
- Auth: email + password with self sign-up (Supabase → Authentication → Sign In / Providers: allow sign-ups ON, Confirm email OFF). New users are active immediately; the admin can disable or delete accounts in "จัดการผู้ใช้".
