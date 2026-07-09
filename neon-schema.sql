-- ============================================================
-- ElomPaie — Schéma Neon PostgreSQL
-- Exécuter dans Neon SQL Editor
-- ============================================================

-- 1. Organisations (à créer AVANT better-auth migrate)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Après "npx better-auth generate" + "npx better-auth migrate":
--    Better Auth crée automatiquement les tables: user, session, account, verification
--    Ensuite ajouter la colonne organization_id:
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- 3. Clients
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT, phone TEXT, email TEXT, ifu TEXT, rccm TEXT,
  sector TEXT, num_employeur TEXT, nif TEXT, bp TEXT, entite_name TEXT, logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Employés
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  matricule TEXT, first_name TEXT NOT NULL, last_name TEXT NOT NULL,
  gender TEXT DEFAULT 'M', birth_date DATE, hire_date DATE,
  position TEXT, category TEXT, marital_status TEXT DEFAULT 'celibataire',
  children_count INT DEFAULT 0, social_security_number TEXT,
  phone TEXT, email TEXT, active BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT 'actif', contract_type TEXT DEFAULT 'cdi', contract_end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Périodes de paie
CREATE TABLE IF NOT EXISTS payroll_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INT NOT NULL, status TEXT DEFAULT 'open',
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, period_year, period_month)
);

-- 6. Variables de paie
CREATE TABLE IF NOT EXISTS payroll_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  base_salary NUMERIC(12,2) DEFAULT 0,
  overtime_premium NUMERIC(12,2) DEFAULT 0,
  pregnancy_allowance NUMERIC(12,2) DEFAULT 0,
  function_allowance NUMERIC(12,2) DEFAULT 0,
  communication_allowance NUMERIC(12,2) DEFAULT 0,
  housing_premium NUMERIC(12,2) DEFAULT 0,
  meal_premium NUMERIC(12,2) DEFAULT 0,
  transport_allowance NUMERIC(12,2) DEFAULT 0,
  salary_advance NUMERIC(12,2) DEFAULT 0,
  loan_payment NUMERIC(12,2) DEFAULT 0,
  flat_deduction NUMERIC(12,2) DEFAULT 0,
  gross_salary NUMERIC(12,2) DEFAULT 0,
  net_payable NUMERIC(12,2) DEFAULT 0,
  cnss_employee NUMERIC(12,2) DEFAULT 0,
  cnss_employer NUMERIC(12,2) DEFAULT 0,
  amu_employee NUMERIC(12,2) DEFAULT 0,
  amu_employer NUMERIC(12,2) DEFAULT 0,
  irpp_net NUMERIC(12,2) DEFAULT 0,
  employer_total NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'draft',
  calculated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(period_id, employee_id)
);

-- 7. Grilles salariales
CREATE TABLE IF NOT EXISTS salary_grids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  category TEXT NOT NULL, echelon INT DEFAULT 1,
  base_salary NUMERIC(12,2) DEFAULT 0, hourly_rate NUMERIC(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Logs d'activité
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT, action TEXT NOT NULL, details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_clients_org ON clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_employees_client ON employees(client_id);
CREATE INDEX IF NOT EXISTS idx_payroll_client ON payroll_periods(client_id);
CREATE INDEX IF NOT EXISTS idx_payroll_vars_period ON payroll_variables(period_id);
CREATE INDEX IF NOT EXISTS idx_activity_org ON activity_logs(organization_id);
