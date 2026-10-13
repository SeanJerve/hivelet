-- 083 - name the verifier on 082's two payments (B-107)
--
-- 082 left verified_by NULL on the two cash payments it linked to the 1d and F2B August bills, so
-- as not to claim anyone verified them in the system. check:ledger's BR-017 invariant (every
-- Verified payment names who verified it) failed on both, and the invariant is right: the receipt
-- route always names the administrator recording the receipt. These are her own receipts (INV#5237
-- and her acknowledgement receipt), so the administrator - the only one - is named, as if she had
-- entered them on Monthly Income. 082's audit rows still say how they came in.
-- Guarded: exactly one administrator and exactly these two payments still unnamed, or nothing
-- changes. Verify: check:ledger's BR-017 line passes.

DO $$
DECLARE
  n integer;
  admin_id uuid;
BEGIN
  SELECT count(*), min(id::text)::uuid INTO n, admin_id FROM profiles WHERE role = 'admin';
  IF n <> 1 THEN RAISE EXCEPTION '083: expected one administrator, found %. Nothing changed.', n; END IF;

  SELECT count(*) INTO n FROM payments
   WHERE id IN ('c0de7019-9419-4128-9ff8-96543f1d863f', 'b41eeaa8-32de-438c-bd1a-e11832331ae1')
     AND verification_status = 'Verified' AND verified_by IS NULL;
  IF n = 0 THEN RAISE NOTICE '083: already applied. Nothing to do.'; RETURN; END IF;
  IF n <> 2 THEN RAISE EXCEPTION '083: expected the two 082 payments unnamed, found %. Nothing changed.', n; END IF;

  UPDATE payments SET verified_by = admin_id
   WHERE id IN ('c0de7019-9419-4128-9ff8-96543f1d863f', 'b41eeaa8-32de-438c-bd1a-e11832331ae1');

  INSERT INTO audit_logs (action, entity_type, entity_id, previous_values, new_values, ip_address)
  VALUES ('AUDIT_CORRECTION', 'PAYMENT', 'b41eeaa8-32de-438c-bd1a-e11832331ae1',
          jsonb_build_object('verified_by', NULL),
          jsonb_build_object('verified_by', admin_id,
            'note', 'The two payments 082 linked to the 1d and F2B August bills name the administrator, whose receipts they are (BR-017).',
            'payments', jsonb_build_array('b41eeaa8-32de-438c-bd1a-e11832331ae1', 'c0de7019-9419-4128-9ff8-96543f1d863f'),
            'reference', 'migration 083; B-107'),
          NULL);
END $$;
