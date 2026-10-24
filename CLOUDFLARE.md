# Déploiement Cloudflare Pages

- Build command : `npm run build` — Output directory : `dist`
- `functions/api/[[path]].js` adapte les handlers `api/*.js` (style Vercel) aux Pages Functions.
- Réglages (Pages → Settings → Functions) : compatibility flag `nodejs_compat`, compatibility date ≥ 2025-09-01 (Production ET Preview).
- Variables (Settings → Variables and Secrets) : NEON_AUTH_BASE_URL, VITE_NEON_AUTH_URL, BETTER_AUTH_URL (= URL Cloudflare), DATABASE_URL, GROQ_API_KEY, BLOB_READ_WRITE_TOKEN.
- Ajouter le nouveau domaine dans les origines autorisées de Neon Auth.
