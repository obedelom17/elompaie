-- Indemnité d'ancienneté (montant) / Seniority allowance (amount)
-- Facultatif : l'API crée cette colonne automatiquement au premier enregistrement.
-- Optional: the API creates this column automatically on first save.
ALTER TABLE payroll_variables ADD COLUMN IF NOT EXISTS indemnite_anciennete NUMERIC DEFAULT 0;
