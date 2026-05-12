-- Migration: Initial Schema
-- Created at: 2026-02-13

CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_name TEXT NOT NULL,
    user_id TEXT NOT NULL,
    action_name TEXT NOT NULL,
    user_agent TEXT,
    timezone TEXT,
    language TEXT,
    referrer TEXT,
    url_params TEXT, -- JSON string
    timestamp INTEGER, -- Unix timestamp client-side
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_app_name ON analytics(app_name);
CREATE INDEX IF NOT EXISTS idx_action_name ON analytics(action_name);
CREATE INDEX IF NOT EXISTS idx_created_at ON analytics(created_at);
