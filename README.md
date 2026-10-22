# ElomPaie

[Français](#francais) | [English](#english)

---

<a id="francais"></a>

## Français

ElomPaie est un logiciel de gestion de paie multi-client destiné aux cabinets comptables du Togo. Un cabinet y gère les entreprises qu'il accompagne, leurs salariés et leurs périodes de paie, puis édite les bulletins et les états de charges.

Application en ligne : https://elompaie.vercel.app

### Fonctionnalités

- Gestion de plusieurs entreprises clientes, avec logo et identifiants fiscaux et sociaux.
- Fiches salariés : contrat, catégorie, situation familiale, date d'embauche, statut.
- Grilles salariales par catégorie et par échelon.
- Périodes de paie mensuelles, saisie des variables, calcul instantané et clôture.
- Indemnité d'ancienneté calculée à partir du salaire (voir plus bas).
- Simulateur de bulletin, d'indemnité de licenciement et comparaison de deux profils.
- Exports : bulletins (Excel, PDF, PNG), état des charges, bordereau CNSS/AMU, déclaration IRPP, solde de tout compte.
- ElomPaie AI, assistant qui calcule une paie et interroge les données du cabinet.
- Interface bilingue français / anglais, avec un sélecteur FR | EN dans l'en-tête et sur la page de connexion. Le choix est mémorisé dans le navigateur.

### Conformité légale

- CGI OTR 2025 : barème de l'impôt annuel (art. 74), abattement de 28 % (art. 26), déduction pour charges de famille de 10 000 F par personne et par mois.
- Code du Travail du Togo, 2021 : indemnité de licenciement (art. 97, taux de 35 %, 40 % et 45 %), préavis (art. 74), congé de maternité de 14 semaines (art. 190).
- Cotisations : CNSS 4 % salarié et 17,5 % employeur, AMU 5 % salarié et 5 % employeur.

### Barème annuel (art. 74 CGI 2025)

| Tranche annuelle          | Taux |
|---------------------------|------|
| 0 à 900 000 F             | 0 %  |
| 900 001 à 3 000 000 F     | 3 %  |
| 3 000 001 à 6 000 000 F   | 10 % |
| 6 000 001 à 9 000 000 F   | 15 % |
| 9 000 001 à 12 000 000 F  | 20 % |
| 12 000 001 à 15 000 000 F | 25 % |
| 15 000 001 à 20 000 000 F | 30 % |
| Plus de 20 000 000 F      | 35 % |

### Indemnité d'ancienneté

Dans l'écran de saisie des variables d'une période, le champ « Taux ancienneté (%) » détermine l'indemnité :

```
indemnité d'ancienneté = (salaire de base + sursalaire) x taux / 100
```

- Le montant est recalculé à chaque modification du salaire ou du taux.
- Un taux est proposé à partir de la date d'embauche : 2 % par année complète, à partir de 2 ans d'ancienneté. Le bouton « Appliquer le taux suggéré » le reprend. Le taux reste modifiable, car il dépend de la convention collective applicable.
- L'indemnité est incluse dans le salaire brut cotisable : elle entre dans la base de la CNSS, de l'AMU et de l'impôt.
- Elle apparaît sur le bulletin sous la rubrique « Ancienneté ».
- Les colonnes `taux_anciennete` et `indemnite_anciennete` sont créées automatiquement par l'API au premier enregistrement. Le script `migrations/001_anciennete.sql` permet de les créer à la main si besoin.

### Langues

Tous les écrans existent en français et en anglais. Les textes sont déclarés dans `src/lib/locales/en.ts`, la clé étant le texte français. Pour ajouter une phrase, il suffit d'écrire `t("Texte en français")` dans le code puis d'ajouter sa traduction dans ce fichier. Les documents officiels (bulletins, états, bordereaux) restent rédigés en français.

### Technologies

- React 18, TypeScript, Vite
- Tailwind CSS
- Fonctions serverless Vercel (Node.js)
- Neon (PostgreSQL) et Neon Auth pour l'authentification
- Vercel Blob pour les logos et l'archivage des bulletins
- ExcelJS et jsPDF pour les exports
- Groq (Llama 3.3 70B) pour ElomPaie AI

### Installation locale

```bash
git clone https://github.com/obedelom17/elompaie.git
cd elompaie
npm install
cp .env.example .env
npm run dev
```

### Déploiement sur Vercel

1. Importer le dépôt dans Vercel.
2. Ajouter l'intégration Neon : elle fournit `DATABASE_URL` automatiquement.
3. Exécuter `neon-schema.sql` dans l'éditeur SQL de Neon.
4. Renseigner les variables d'environnement ci-dessous.
5. Déployer. Le fichier `vercel.json` gère les routes de l'application et de l'API.

### Variables d'environnement

| Variable               | Rôle                                                      |
|------------------------|-----------------------------------------------------------|
| `DATABASE_URL`         | Connexion PostgreSQL Neon                                 |
| `NEON_AUTH_BASE_URL`   | Adresse du service Neon Auth (serveur)                    |
| `VITE_NEON_AUTH_URL`   | Adresse du service Neon Auth (navigateur)                 |
| `BETTER_AUTH_URL`      | URL publique de l'application                             |
| `BLOB_READ_WRITE_TOKEN`| Jeton Vercel Blob                                         |
| `GROQ_API_KEY`         | Clé Groq pour ElomPaie AI, lue uniquement côté serveur        |

### Structure du projet

```
api/         Fonctions serverless (routes, calculs, exports Excel)
public/      Icônes, manifeste, image de partage
src/
  components/  Mise en page, logo, sélecteur de langue, ElomPaie AI
  context/     Authentification
  lib/         Moteur de paie, PDF, client API, internationalisation
  pages/       Écrans de l'application
migrations/  Scripts SQL ponctuels
neon-schema.sql  Schéma complet de la base
```

---

<a id="english"></a>

## English

ElomPaie is a multi-client payroll application for accounting firms in Togo. A firm manages the companies it serves, their employees and their payroll periods, then produces payslips and statements of charges.

Live application: https://elompaie.vercel.app

### Features

- Management of several client companies, with logo and tax and social security identifiers.
- Employee records: contract, category, family status, hire date, status.
- Salary grids by category and step.
- Monthly payroll periods, entry of variables, instant calculation and closing.
- Seniority allowance calculated from salary (see below).
- Payslip simulator, severance pay simulator and side-by-side comparison of two profiles.
- Exports: payslips (Excel, PDF, PNG), statement of charges, CNSS/AMU schedule, income tax return, final settlement.
- ElomPaie AI, an assistant that runs payroll calculations and queries the firm's data.
- Bilingual French / English interface, with an FR | EN switch in the header and on the sign-in page. The choice is remembered in the browser.

### Legal compliance

- 2025 OTR Tax Code (CGI): annual income tax scale (art. 74), 28% allowance (art. 26), family deduction of 10,000 F per person per month.
- Togo Labour Code, 2021: severance pay (art. 97, rates of 35%, 40% and 45%), notice periods (art. 74), 14 weeks of maternity leave (art. 190).
- Contributions: CNSS 4% employee and 17.5% employer, AMU 5% employee and 5% employer.

### Annual scale (art. 74, 2025 CGI)

| Annual bracket            | Rate |
|---------------------------|------|
| 0 to 900,000 F            | 0%   |
| 900,001 to 3,000,000 F    | 3%   |
| 3,000,001 to 6,000,000 F  | 10%  |
| 6,000,001 to 9,000,000 F  | 15%  |
| 9,000,001 to 12,000,000 F | 20%  |
| 12,000,001 to 15,000,000 F| 25%  |
| 15,000,001 to 20,000,000 F| 30%  |
| Over 20,000,000 F         | 35%  |

### Seniority allowance

On the payroll variables screen of a period, the "Seniority rate (%)" field determines the allowance:

```
seniority allowance = (base salary + over-salary) x rate / 100
```

- The amount is recalculated whenever the salary or the rate changes.
- A rate is suggested from the hire date: 2% per completed year, starting at 2 years of service. The "Apply suggested rate" button copies it into the field. The rate stays editable, because it depends on the applicable collective agreement.
- The allowance is part of the contributory gross salary: it is included in the CNSS, AMU and income tax base.
- It appears on the payslip under the "Ancienneté" line.
- The `taux_anciennete` and `indemnite_anciennete` columns are created automatically by the API on first save. The `migrations/001_anciennete.sql` script creates them by hand if needed.

### Languages

Every screen is available in French and English. Texts are declared in `src/lib/locales/en.ts`, the key being the French text. To add a sentence, write `t("Texte en français")` in the code and add its translation to that file. Official documents (payslips, statements, schedules) remain in French.

### Tech stack

- React 18, TypeScript, Vite
- Tailwind CSS
- Vercel serverless functions (Node.js)
- Neon (PostgreSQL) and Neon Auth for authentication
- Vercel Blob for logos and payslip archiving
- ExcelJS and jsPDF for exports
- Groq (Llama 3.3 70B) for ElomPaie AI

### Local setup

```bash
git clone https://github.com/obedelom17/elompaie.git
cd elompaie
npm install
cp .env.example .env
npm run dev
```

### Deploying on Vercel

1. Import the repository into Vercel.
2. Add the Neon integration: it provides `DATABASE_URL` automatically.
3. Run `neon-schema.sql` in the Neon SQL editor.
4. Set the environment variables listed below.
5. Deploy. The `vercel.json` file handles application and API routing.

### Environment variables

| Variable               | Purpose                                                   |
|------------------------|-----------------------------------------------------------|
| `DATABASE_URL`         | Neon PostgreSQL connection                                |
| `NEON_AUTH_BASE_URL`   | Neon Auth service address (server)                        |
| `VITE_NEON_AUTH_URL`   | Neon Auth service address (browser)                       |
| `BETTER_AUTH_URL`      | Public URL of the application                             |
| `BLOB_READ_WRITE_TOKEN`| Vercel Blob token                                         |
| `GROQ_API_KEY`         | Groq key for ElomPaie AI, read on the server only             |

### Project structure

```
api/         Serverless functions (routes, calculations, Excel exports)
public/      Icons, manifest, share image
src/
  components/  Layout, logo, language switch, ElomPaie AI
  context/     Authentication
  lib/         Payroll engine, PDF, API client, internationalisation
  pages/       Application screens
migrations/  One-off SQL scripts
neon-schema.sql  Full database schema
```
