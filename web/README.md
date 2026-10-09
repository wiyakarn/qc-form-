# Product Ingredient – web build (Netlify + Supabase)

- `shim.js` adds `window.claude` (db / user / sample / downloads) backed by Supabase, so the same `product-ingredient.html` runs outside claude.ai.
- `build_web.py` writes `dist/index.html` (app + Supabase client + shim). Run `python3 web/build_web.py`.
- `netlify.toml` publishes `dist/`.
- Supabase project: `oaoedrenioyezaxiyqyu` (tables + RLS applied by migrations). Edge Function `ai` calls the Claude API and needs the secret `ANTHROPIC_API_KEY`.
- Auth: email magic link. In Supabase → Authentication → URL Configuration set Site URL and Redirect URLs to the Netlify site URL.
