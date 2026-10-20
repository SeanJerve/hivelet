-- 085 - an inquiry needs no email address
--
-- Sean, 20 Oct 2026: "emails are nothing in our website". A visitor's inquiry is answered on its
-- own page (the private link, or the reference code with the phone number they gave), and the
-- landlady calls or texts the number; nothing in the system has ever sent an email. The inquiry
-- form stops asking for one, so the column that required it may now be empty.
--
-- Schema only: nothing is deleted or rewritten, and the addresses already on the existing
-- inquiries stay where they are. Checked in the catalogue on 20 Oct 2026: no constraint, index or
-- function reads `prospect_email`; only its NOT NULL stood in the way.
--
-- Backup taken before this session's first data change: backups/2026-10-20T00-10-46.
-- Verify:
--   SELECT is_nullable FROM information_schema.columns
--    WHERE table_name = 'inquiries' AND column_name = 'prospect_email';   -- YES

ALTER TABLE inquiries ALTER COLUMN prospect_email DROP NOT NULL;
