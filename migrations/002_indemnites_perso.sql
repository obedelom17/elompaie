-- Indemnités personnalisées / Custom allowances
-- Facultatif : l'API crée cette colonne automatiquement au premier enregistrement.
-- Optional: the API creates this column automatically on first save.
ALTER TABLE payroll_variables ADD COLUMN IF NOT EXISTS indemnites_perso JSONB DEFAULT '[]'::jsonb;
