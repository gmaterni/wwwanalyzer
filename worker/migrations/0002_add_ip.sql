-- Migration: aggiunge IP del chiamante (letto server-side dal Worker)
-- Created at: 2026-09-03

ALTER TABLE analytics ADD COLUMN ip TEXT;

CREATE INDEX IF NOT EXISTS idx_ip ON analytics(ip);
