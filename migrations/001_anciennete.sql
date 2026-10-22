-- Indemnité d'ancienneté / Seniority allowance
-- Facultatif : l'API crée ces colonnes automatiquement au premier enregistrement.
-- Optional: the API creates these columns automatically on first save.
ALTER TABLE payroll_variables ADD COLUMN IF NOT EXISTS taux_anciennete NUMERIC DEFAULT 0;
ALTER TABLE payroll_variables ADD COLUMN IF NOT EXISTS indemnite_anciennete NUMERIC DEFAULT 0;
