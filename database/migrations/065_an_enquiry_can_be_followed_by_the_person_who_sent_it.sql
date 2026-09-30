-- =============================================================================
-- 065 - an enquiry can be followed, and answered, by the person who sent it
-- =============================================================================
-- NOT APPLIED by the author. Run the PREVIEW at the foot first; then
-- `npm run backup`; then run this whole file in the Supabase SQL editor.
-- It only ADDS two empty columns and two indexes: no existing row changes.
--
-- WHY
-- ---
-- Sean, 30 September 2026: an enquiry went into Michelle's Inquiries page, she
-- replied there (inquiry_messages already holds the thread), and the visitor
-- could never see the reply. She had to ring or text them from her own phone,
-- which is the scattered back-and-forth the booking module exists to replace.
--
-- The visitor gets their own way back into the thread instead of an account:
--   * a private link, shown once when they send, whose secret is stored here
--     only as a SHA-256 hash (like a password: the database cannot give it
--     back, and a copy of the table does not open anyone's conversation);
--   * a short reference code (e.g. K7QM-3XRD), which with the phone number
--     they gave opens the same conversation if the link is lost.
-- No sign-up: there is no public account creation, and no way to reset a
-- forgotten password without email or SMS, so a password would be the weaker
-- choice for people who may send one message and never come back.
--
-- WHAT CHANGES
-- ------------
--   * inquiries.access_token_hash  text, NULL for every existing enquiry
--   * inquiries.reference_code     varchar(9), NULL for every existing enquiry
--   * a unique index on each, ignoring NULLs
-- Enquiries sent before this have neither, and are answered by phone or email
-- as before; the Inquiries page says so on those.
--
-- The server code that uses them (routes/public.ts) tolerates their absence,
-- so the site keeps taking enquiries whether or not this has run yet.
--
-- SAFETY
-- ------
--   * IF NOT EXISTS throughout: a second run does nothing.
--   * No data is read, changed or removed.
-- =============================================================================

ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS access_token_hash text;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS reference_code varchar(9);

CREATE UNIQUE INDEX IF NOT EXISTS inquiries_access_token_hash_key
  ON inquiries (access_token_hash) WHERE access_token_hash IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS inquiries_reference_code_key
  ON inquiries (reference_code) WHERE reference_code IS NOT NULL;

COMMENT ON COLUMN inquiries.access_token_hash IS
  'SHA-256 (hex) of the secret in the visitor''s private conversation link. The secret itself is never stored (065).';
COMMENT ON COLUMN inquiries.reference_code IS
  'Short code shown to the visitor; with the phone number they gave, it opens their conversation (065).';

-- "Success. No rows returned" means it ran.
--
-- PREVIEW - run first, on its own; it only reads. Expect no rows (the columns
-- do not exist yet):
--
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'inquiries' AND column_name IN ('access_token_hash', 'reference_code');
--
-- AFTER - the same query returns both names.
