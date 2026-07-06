# ElomPaie

Logiciel de gestion de paie multi-client pour cabinets comptables au Togo.

## Conformité légale

- **CGI OTR 2025** — Barème ITS annuel (Art. 74), Abattement 28% (Art. 26), Déduction charges famille 10 000 F/pers/mois (Art. 73)
- **Code du Travail Togo 2021** — Indemnité licenciement (Art. 97 : 35%/40%/45%), Délais de préavis (Art. 74), Congé maternité 14 semaines (Art. 190)

## Calcul ITS — Barème annuel (Art. 74 CGI 2025)

| Tranche annuelle | Taux |
|---|---|
| 0 — 900 000 F | 0% |
| 900 001 — 3 000 000 F | 3% |
| 3 000 001 — 6 000 000 F | 10% |
| 6 000 001 — 9 000 000 F | 15% |
| 9 000 001 — 12 000 000 F | 20% |
| 12 000 001 — 15 000 000 F | 25% |
| 15 000 001 — 20 000 000 F | 30% |
| Plus de 20 000 000 F | 35% |

## Déploiement Vercel

```bash
# 1. Cloner le dépôt
git clone <repo>
cd elompaie

# 2. Variables d'environnement Vercel
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# 3. Déployer
vercel --prod
```

Le fichier `vercel.json` gère le routing SPA automatiquement.

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS
- Supabase (auth + base de données)
- jsPDF (bulletins de paie PDF)
