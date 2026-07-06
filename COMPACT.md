# COMPACT — Résumé conversation ElomPaie

## Stack
React 18 + TypeScript + Vite + TailwindCSS + Supabase + jsPDF + Groq API (Llama 3.3 70B)

## Déployé
https://elompaie.vercel.app

## Conformité légale
- CGI OTR 2025 Art.74 : barème ITS annuel 8 tranches (0% → 35%)
- Art.26 : abattement 28% (plafonné 10M annuel)
- Art.73 : 10 000 F/pers/mois à charge (conjoint + enfants ≤6)
- CNSS : 4% salarié / 17,5% employeur
- INAM : 5% salarié / 5% employeur
- CT 2021 Art.97 : licenciement 35%/40%/45% selon ancienneté

## Structure fichiers clés
- src/lib/payroll.ts → moteur calcul (calculatePayroll, calculateSeverancePay, getPreavisDays)
- src/lib/pdf.ts → génération bulletins PDF (jsPDF + autoTable)
- src/context/AuthContext.tsx → auth Supabase sans Edge Function
- src/components/AIChatbot.tsx → PaieBot (Groq Llama 3.3 70B)
- src/pages/Simulator.tsx → simulateur 3 onglets (bulletin/licenciement/comparaison)
- src/pages/ExportReports.tsx → export CSV masse salariale + PDF batch

## Supabase
- Trigger handle_new_user() crée automatiquement organizations + profiles à l'inscription
- Email confirmation : OFF obligatoire
- Tables : organizations, profiles, clients, employees, salary_grids, payroll_periods, payroll_variables

## Vercel
- vercel.json : rewrites SPA + headers sécurité
- Variables : VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_GROQ_API_KEY

## Bug résolu
- Page blanche → variables env Supabase manquantes
- {} erreur inscription → Edge Function absente → remplacé par signUp natif
- Trigger SQL 500 → fix avec search_path = public + exception handler

## Pages
/ Dashboard | /clients | /employees | /salary-grids | /payroll | /simulator | /export
