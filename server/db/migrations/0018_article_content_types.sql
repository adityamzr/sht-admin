-- Migration: expand article content types and migrate legacy values
-- Legacy mapping:
-- article -> article (no change)
-- update -> news
-- practical -> guide
-- Idempotent: running twice has no effect after first migration

UPDATE "articles" SET "content_type" = 'news' WHERE "content_type" = 'update';
UPDATE "articles" SET "content_type" = 'guide' WHERE "content_type" = 'practical';
