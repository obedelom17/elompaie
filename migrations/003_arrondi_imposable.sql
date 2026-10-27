-- Option d'arrondi du revenu imposable / Taxable income rounding option
-- Facultatif : l'API crée cette colonne automatiquement au premier enregistrement.
-- Optional: the API creates this column automatically on first save.
ALTER TABLE payroll_variables ADD COLUMN IF NOT EXISTS arrondi_imposable BOOLEAN DEFAULT FALSE;
