-- Hivelet DEMO data. Runs ONLY against the demo project (hivelet-demo org), after
-- scripts/demo/demo-schema.sql, into empty tables.
--
-- Every person, phone number, payment and expense here is invented. What is copied
-- from live is only the property's shape: the 33 units with their floors, types,
-- clusters and rates, the expense areas and categories, and the system settings.
-- The category named after a real staff member is renamed.
--
-- {{owner}}, {{admin1}} ... are bcrypt hashes printed by make-demo-passwords.mjs.
-- Substitute them before running; the plain passwords stay in credentials/.
--
-- Today is pinned to 2026-10-15 so the overdue bills stay overdue when re-run.

DO $seed$
DECLARE
  today  CONSTANT date := DATE '2026-10-15';
  first_names text[] := ARRAY['Maria','Jose','Ana','Juan','Kristine','Mark','Jasmine','Paolo','Angelica','Carlo',
    'Bea','Miguel','Patricia','Rafael','Camille','Joshua','Nicole','Gabriel','Andrea','Daniel','Erika','Francis',
    'Hazel','Ivan','Joanna','Kevin','Lovely','Nathan','Rhea','Vincent','Shiela','Arvin','Trisha','Dexter','Aira'];
  last_names text[] := ARRAY['Santos','Reyes','Cruz','Bautista','Ocampo','Garcia','Mendoza','Torres','Villanueva',
    'Ramos','Castillo','Aquino','Navarro','Salazar','Domingo','Lopez','Morales','Rivera','Agustin','Dela Cruz',
    'Pascual','Valdez','Manalo','Soriano','Lim','Tan','Abad','Bernardo','Gonzales','Flores','Llorin','Nepomuceno'];
  owner_id uuid; admin_ids uuid[] := '{}';
  t1 uuid; t2 uuid; t3 uuid;
  r record; a record; p record;
  pid uuid; aid uuid; bid uuid; tid uuid; eid uuid; iid uuid;
  nm text; start_d date; occ int; n int := 0; inv int := 1000;
  m date; ps date; pe date; dpaid date; water numeric; meth payment_method_type;
  unpaid uuid[] := '{}';
  amt numeric; area property_area_type; areas property_area_type[] :=
    ARRAY['Boarding House','Front Apartment','Back Apartment','Penthouse']::property_area_type[];
BEGIN
  PERFORM setseed(0.2026);

  -- ── Shape of the property, as live ───────────────────────────────────────
  INSERT INTO property_areas (code, name, is_rental_expense, display_order, notes) VALUES
    ('Boarding House','Boarding House Expenses',true,1,'Maps to the BH (Main Rooms) cluster.'),
    ('Main House','Main House Expenses',false,2,'The owner''s residence. Not a rental cost; excluded from net rental income.'),
    ('Front Apartment','Front Apartment Expenses',true,3,'Maps to the Front Apartment cluster.'),
    ('Back Apartment','Back Apartment Expenses',true,4,'Maps to the Back Apartment cluster.'),
    ('Other Expenses / Personal','Other Expenses / Personal',false,5,'Non-rental by definition. Excluded from net rental income.'),
    ('Penthouse','Penthouse Expenses',true,6,'The penthouse is a single large unit booked separately.');

  INSERT INTO clusters (code, name, display_order, expense_area) VALUES
    ('BH','BH (Main Rooms)',1,'Boarding House'),
    ('Back Apartment','Back Apartment',2,'Back Apartment'),
    ('Penthouse','Penthouse',3,'Penthouse'),
    ('Front Apartment','Front Apartment',4,'Front Apartment'),
    ('Linda','Linda Special Units',5,'Back Apartment');

  INSERT INTO fixed_expense_categories (code, name, parent_code, display_order) VALUES
    ('1','Supplies',NULL,1),('2','Taxes and Licenses',NULL,2),('3','Janitorial and Messengerial Services',NULL,3),
    ('4','Depreciation',NULL,4),('5','Professional Fees',NULL,5),('6','Salaries: Caretaker',NULL,6),
    ('6a','PhilHealth','6',7),('6b','SSS','6',8),('6c','Allowances','6',9),
    ('7','Communication, Light, and Water',NULL,10),('8','Repairs and Maintenance',NULL,11),
    ('9','Fuel and Oil',NULL,12),('10','Others',NULL,13);

  INSERT INTO system_settings (key, value, value_type, label, description, business_rule) VALUES
    ('water_rate_per_occupant','200','number','Standard water rate per occupant','Monthly water charge per registered occupant, in PHP.','BR-014'),
    ('linda_lf_water_charge','400','number','Linda Front (LF) fixed water charge','Flat monthly water charge for unit LF, remitted directly to Linda.','BR-040'),
    ('linda_lb_water_charge','200','number','Linda Back (LB) fixed water charge','Flat monthly water charge for unit LB, remitted directly to Linda.','BR-040'),
    ('grace_period_days','0','number','Payment grace period (days) - none','Zero. Late payment is not accepted.','BR-012'),
    ('revenue_share_percent','50','number','Fifty percent column (fixed — not configurable here)','A system-computed figure equal to half that row''s Rent Amount, kept for ledger parity with the owner''s historical spreadsheet. The divisor lives in the generated column monthly_income_records.fifty_percent_share and is never read from this row.','BR-035');

  INSERT INTO rooms (room_number, floor, cluster_code, room_type, description, capacity, base_price, current_price, operational_status, is_linda_unit) VALUES
    ('B1F',1,'Back Apartment','One-bedroom','1st Floor One-bedroom unit, front side',3,6000,10000,'Occupied',false),
    ('B2B',2,'Back Apartment','One-bedroom','2nd Floor One-bedroom unit, back side',3,6200,12000,'Occupied',false),
    ('B2F',2,'Back Apartment','One-bedroom','2nd Floor One-bedroom unit, front side',3,6200,10000,'Occupied',false),
    ('B3B',3,'Back Apartment','Two-bedroom','3rd Floor Two-bedroom unit, back side',4,7500,12000,'Occupied',false),
    ('B3F',3,'Back Apartment','Two-bedroom','3rd Floor Two-bedroom unit, front side',4,7500,12000,'Occupied',false),
    ('1a',1,'BH','Studio','1st Floor Studio unit',2,4500,8000,'Occupied',false),
    ('1b',1,'BH','Studio','1st Floor Studio unit',2,4500,8500,'Occupied',false),
    ('1c',1,'BH','Studio','1st Floor Studio unit',2,4500,8000,'Occupied',false),
    ('1d',1,'BH','Studio','1st Floor Studio unit',2,4500,7250,'Occupied',false),
    ('1e',1,'BH','Studio','1st Floor Studio unit',2,4500,6000,'Occupied',false),
    ('1f',1,'BH','Studio','1st Floor Studio unit',2,4500,6500,'Occupied',false),
    ('1g',1,'BH','Studio','1st Floor Studio unit',2,4500,6500,'Occupied',false),
    ('1h',1,'BH','Studio','1st Floor Studio unit',2,4800,6500,'Occupied',false),
    ('2a',2,'BH','One-bedroom','2nd Floor One-bedroom unit',3,5500,8000,'Occupied',false),
    ('2b',2,'BH','Studio','2nd Floor Studio unit',2,4600,8500,'Occupied',false),
    ('2c',2,'BH','Studio','2nd Floor Studio unit',2,4600,8500,'Occupied',false),
    ('2d',2,'BH','Studio','2nd Floor Studio unit',2,4600,8500,'Occupied',false),
    ('2e',2,'BH','Studio','2nd Floor Studio unit',2,4600,8000,'Occupied',false),
    ('2f',2,'BH','Studio','2nd Floor Studio unit',2,4600,6500,'Occupied',false),
    ('2g',2,'BH','Studio','2nd Floor Studio unit',2,4800,6500,'Available',false),
    ('3a',3,'BH','One-bedroom','3rd Floor One-bedroom unit',3,5800,9000,'Occupied',false),
    ('3b',3,'BH','Studio','3rd Floor Studio unit',2,4700,8500,'Occupied',false),
    ('3c',3,'BH','Studio','3rd Floor Studio unit',2,4700,8500,'Occupied',false),
    ('3d',3,'BH','Studio','3rd Floor Studio unit',2,4700,8500,'Occupied',false),
    ('3e',3,'BH','Studio','3rd Floor Studio unit',2,4700,8000,'Occupied',false),
    ('3f',3,'BH','Studio','3rd Floor Studio unit',2,4700,6500,'Occupied',false),
    ('3g',3,'BH','Studio','3rd Floor Studio unit',2,4900,7000,'Occupied',false),
    ('F1',1,'Front Apartment','One-bedroom','1st Floor One-bedroom unit',3,6500,12600,'Occupied',false),
    ('F2B',2,'Front Apartment','Two-bedroom','2nd Floor Two-bedroom unit, back side',4,8000,10000,'Occupied',false),
    ('F2F',2,'Front Apartment','Two-bedroom','2nd Floor Two-bedroom unit, front side',4,8000,8000,'Available',false),
    ('LB',1,'Linda','Studio','Studio unit beside the red gate',3,5000,5500,'Occupied',true),
    ('LF',1,'Linda','Studio','Studio unit beside the red gate',3,5000,5000,'Occupied',true),
    ('PH',4,'Penthouse','Three-bedroom','Three-bedroom unit on the rooftop level',5,12000,30000,'Occupied',false);
  UPDATE rooms SET available_from = today WHERE operational_status = 'Available';

  -- ── Sign-in accounts (hashes from make-demo-passwords.mjs) ───────────────
  INSERT INTO profiles (email, full_name, phone_number, role, password_hash, password_changed_at)
    VALUES ('owner.demo@example.com','Demo Owner','09170000001','admin','{{owner}}',now())
    RETURNING id INTO owner_id;
  INSERT INTO profiles (email, full_name, phone_number, role, password_hash, password_changed_at)
    VALUES ('evaluator1@example.com','Evaluator One','09170000002','admin','{{admin1}}',now()) RETURNING id INTO pid;
  admin_ids := admin_ids || pid;
  INSERT INTO profiles (email, full_name, phone_number, role, password_hash, password_changed_at)
    VALUES ('evaluator2@example.com','Evaluator Two','09170000003','admin','{{admin2}}',now()) RETURNING id INTO pid;
  admin_ids := admin_ids || pid;
  INSERT INTO profiles (email, full_name, phone_number, role, password_hash, password_changed_at)
    VALUES ('evaluator3@example.com','Evaluator Three','09170000004','admin','{{admin3}}',now()) RETURNING id INTO pid;
  admin_ids := admin_ids || pid;
  admin_ids := owner_id || admin_ids;

  -- ── Tenants: one per occupied unit; three of them are evaluator logins ───
  FOR r IN SELECT * FROM rooms WHERE operational_status = 'Occupied' ORDER BY room_number LOOP
    n := n + 1;
    nm := first_names[1 + floor(random() * array_length(first_names, 1))::int] || ' ' ||
          last_names[1 + floor(random() * array_length(last_names, 1))::int];
    INSERT INTO profiles (full_name, phone_number, email, occupation, emergency_contact_name, emergency_contact_phone,
                          role, login_id, password_hash, password_changed_at)
    VALUES (
      CASE r.room_number WHEN '1a' THEN 'Tenant Demo One' WHEN '2b' THEN 'Tenant Demo Two' WHEN 'B2B' THEN 'Tenant Demo Three' ELSE nm END,
      '0918' || lpad((100000 + n)::text, 7, '0'),
      CASE r.room_number WHEN '1a' THEN 'tenant1@example.com' WHEN '2b' THEN 'tenant2@example.com' WHEN 'B2B' THEN 'tenant3@example.com' END,
      (ARRAY['Student','Nurse','Call center agent','Teacher','Engineer','Bank teller','Freelancer','Government employee'])[1 + floor(random() * 8)::int],
      last_names[1 + floor(random() * array_length(last_names, 1))::int] || ' (parent)',
      '0919' || lpad((100000 + n)::text, 7, '0'),
      'tenant',
      CASE r.room_number WHEN '1a' THEN 'HV-10001' WHEN '2b' THEN 'HV-10002' WHEN 'B2B' THEN 'HV-10003'
                         ELSE 'HV-' || (20000 + n)::text END,
      CASE r.room_number WHEN '1a' THEN '{{tenant1}}' WHEN '2b' THEN '{{tenant2}}' WHEN 'B2B' THEN '{{tenant3}}' ELSE '{{unusable}}' END,
      now())
    RETURNING id INTO pid;
    IF r.room_number = '1a' THEN t1 := pid; ELSIF r.room_number = '2b' THEN t2 := pid; ELSIF r.room_number = 'B2B' THEN t3 := pid; END IF;

    start_d := DATE '2023-03-01' + floor(random() * 1150)::int;   -- up to mid-2026
    IF start_d = DATE '2026-07-01' THEN start_d := start_d + 3; END IF; -- 2026-07-01 is the import placeholder
    -- Fixed for the evaluator tenants: tenant two's October period opens on the 5th, so it is overdue.
    IF r.room_number = '1a' THEN start_d := DATE '2025-02-10';
    ELSIF r.room_number = '2b' THEN start_d := DATE '2025-03-05';
    ELSIF r.room_number = 'B2B' THEN start_d := DATE '2025-04-03'; END IF;
    occ := LEAST(r.capacity, 1 + floor(random() * 2)::int + CASE WHEN r.capacity >= 4 THEN 1 ELSE 0 END);

    INSERT INTO room_assignments (room_id, tenant_profile_id, start_date, anniversary_date, deposit_amount, occupant_count)
    VALUES (r.id, pid, start_d, start_d, r.current_price, occ);
  END LOOP;

  -- Former tenants of the two vacant units, so tenancy history is not empty.
  FOR r IN SELECT * FROM rooms WHERE operational_status = 'Available' ORDER BY room_number LOOP
    n := n + 1;
    INSERT INTO profiles (full_name, phone_number, role, login_id, password_hash, account_status)
    VALUES (first_names[1 + n % 35] || ' ' || last_names[1 + n % 32], '0918' || lpad((100000 + n)::text, 7, '0'),
            'tenant', 'HV-' || (20000 + n)::text, '{{unusable}}', 'inactive')
    RETURNING id INTO pid;
    INSERT INTO room_assignments (room_id, tenant_profile_id, start_date, end_date, anniversary_date, deposit_amount,
                                  occupant_count, is_active)
    VALUES (r.id, pid, DATE '2024-11-05', CASE r.room_number WHEN '2g' THEN DATE '2026-08-31' ELSE DATE '2026-09-30' END,
            DATE '2024-11-05', r.current_price, 2, false);
  END LOOP;

  -- Five tenants whose October period has started but is unpaid; tenant two is one.
  SELECT array_agg(x.tenant_profile_id) INTO unpaid FROM (
    SELECT ra.tenant_profile_id FROM room_assignments ra JOIN rooms ro ON ro.id = ra.room_id
     WHERE ra.is_active AND extract(day FROM ra.anniversary_date) <= 12
       AND ro.room_number NOT IN ('1a','2b','B2B','LB','LF')
     ORDER BY random() LIMIT 4) x;
  unpaid := t2 || unpaid;

  -- ── Income: every rent period from Jan 2025 (or move-in) to today ────────
  FOR a IN SELECT ra.*, ro.room_number, ro.current_price, p2.full_name
             FROM room_assignments ra JOIN rooms ro ON ro.id = ra.room_id JOIN profiles p2 ON p2.id = ra.tenant_profile_id LOOP
    m := date_trunc('month', GREATEST(a.start_date, DATE '2025-01-01'))::date;
    WHILE m <= today LOOP
      ps := make_date(extract(year FROM m)::int, extract(month FROM m)::int,
                      LEAST(extract(day FROM a.anniversary_date)::int,
                            extract(day FROM (m + interval '1 month' - interval '1 day'))::int));
      pe := (ps + interval '1 month' - interval '1 day')::date;
      IF ps >= a.start_date AND ps <= today AND (a.end_date IS NULL OR ps < a.end_date)
         AND NOT (a.tenant_profile_id = ANY(unpaid) AND ps >= DATE '2026-10-01') THEN
        inv := inv + 1;
        dpaid := LEAST(today, ps + (floor(random() * 6) - 2)::int);
        water := CASE a.room_number WHEN 'LF' THEN 400 WHEN 'LB' THEN 200 ELSE 200 * a.occupant_count END;
        meth := CASE WHEN random() < 0.85 THEN 'Cash' WHEN random() < 0.7 THEN 'GCash' ELSE 'Bank Transfer' END;
        INSERT INTO monthly_income_records (room_id, tenant_profile_id, assignment_id, year, month, date_paid, contact_name,
            invoice_number, rent_period_start, rent_period_end, rent_amount, occupants, water_payment, payment_method)
        VALUES (a.room_id, a.tenant_profile_id, a.id, extract(year FROM ps)::int, extract(month FROM ps)::int, dpaid,
                a.full_name, CASE WHEN random() < 0.08 THEN 'Acknowledgement receipt' ELSE 'INV#' || inv END,
                ps, pe, a.current_price, a.occupant_count, water, meth);
      END IF;
      m := (m + interval '1 month')::date;
    END LOOP;
  END LOOP;

  -- One row entered twice and voided, as the owner would.
  SELECT * INTO p FROM monthly_income_records WHERE tenant_profile_id = t1 ORDER BY rent_period_start DESC LIMIT 1 OFFSET 2;
  INSERT INTO monthly_income_records (room_id, tenant_profile_id, assignment_id, year, month, date_paid, contact_name,
      invoice_number, rent_period_start, rent_period_end, rent_amount, occupants, water_payment, payment_method,
      voided_at, voided_by, void_reason)
  VALUES (p.room_id, p.tenant_profile_id, p.assignment_id, p.year, p.month, p.date_paid, p.contact_name,
          'INV#' || (inv + 1), p.rent_period_start, p.rent_period_end, p.rent_amount, p.occupants, p.water_payment,
          'Cash', p.date_paid + 1, owner_id, 'Entered twice');

  -- ── Bills and payments for October ───────────────────────────────────────
  FOR a IN SELECT ra.*, ro.current_price, ro.room_number FROM room_assignments ra JOIN rooms ro ON ro.id = ra.room_id
            WHERE ra.tenant_profile_id = ANY(unpaid) LOOP
    ps := make_date(2026, 10, extract(day FROM a.anniversary_date)::int);
    water := 200 * a.occupant_count;
    INSERT INTO bills (room_id, tenant_profile_id, billing_period_start, billing_period_end, rent_amount, water_amount,
                       total_amount, due_date, grace_period_end_date, status, created_at)
    VALUES (a.room_id, a.tenant_profile_id, ps, (ps + interval '1 month' - interval '1 day')::date, a.current_price, water,
            a.current_price + water, ps, ps, (CASE WHEN ps < today THEN 'Overdue' ELSE 'Due' END)::bill_status_type, ps - 3)
    RETURNING id INTO bid;
    -- One of them has paid by GCash and is waiting for the owner to verify it.
    IF a.tenant_profile_id = unpaid[2] THEN
      INSERT INTO payments (bill_id, room_id, tenant_profile_id, amount, payment_method, payment_source,
                            verification_status, transaction_reference, paid_at)
      VALUES (bid, a.room_id, a.tenant_profile_id, a.current_price + water, 'GCash', 'On-Site GCash',
              'Pending Verification', 'GC-' || upper(substr(md5(random()::text), 1, 10)), today - 1);
      UPDATE bills SET status = 'Due' WHERE id = bid;
    END IF;
  END LOOP;

  -- Tenant one: September and October bills, both paid and verified.
  FOR p IN SELECT * FROM monthly_income_records WHERE tenant_profile_id = t1 AND voided_at IS NULL
            AND rent_period_start >= DATE '2026-09-01' ORDER BY rent_period_start LOOP
    INSERT INTO bills (room_id, tenant_profile_id, billing_period_start, billing_period_end, rent_amount, water_amount,
                       total_amount, due_date, grace_period_end_date, status)
    VALUES (p.room_id, p.tenant_profile_id, p.rent_period_start, p.rent_period_end, p.rent_amount, p.water_payment,
            p.rent_amount + p.water_payment, p.rent_period_start, p.rent_period_start, 'Paid')
    RETURNING id INTO bid;
    INSERT INTO payments (bill_id, room_id, tenant_profile_id, amount, payment_method, payment_source,
                          verification_status, paid_at, verified_at, verified_by)
    VALUES (bid, p.room_id, p.tenant_profile_id, p.rent_amount + p.water_payment, 'Cash', 'On-Site Cash', 'Verified',
            p.date_paid, p.date_paid, owner_id);
  END LOOP;

  -- ── Maintenance ──────────────────────────────────────────────────────────
  FOR p IN SELECT * FROM (VALUES
      (1,'Leaking faucet in the bathroom','The bathroom faucet drips all night even when fully closed.','Plumbing','Medium','Submitted',2,NULL::text),
      (2,'Aircon not cooling','The aircon runs but the room stays warm after an hour.','Aircon / HVAC','High','In Progress',5,'Demo Technician (Aircon)'),
      (3,'Busted hallway light','The light outside my door has been out since Monday.','Electrical','Low','Resolved',12,'Demo Technician (Electrical)'),
      (4,'Clogged kitchen sink','Water is not draining from the kitchen sink.','Plumbing','High','Closed',30,'Demo Technician (Plumbing)'),
      (5,'Loose cabinet hinge','The cabinet door under the sink is hanging off one hinge.','Carpentry','Low','Submitted',1,NULL),
      (6,'Outlet sparks when plugging in','The outlet beside the bed sparked when I plugged in a fan.','Electrical','Emergency','In Progress',0,'Demo Technician (Electrical)'),
      (7,'Door lock jammed','The main door lock is hard to turn and sometimes will not open.','Structural / Furniture','Medium','Resolved',20,'Demo Technician (Carpentry)')
    ) v(k, title, body, cat, pri, st, age, tech) LOOP
    SELECT ra.* INTO a FROM room_assignments ra
     WHERE ra.is_active AND (CASE WHEN p.k IN (1, 2) THEN ra.tenant_profile_id = t3 ELSE ra.tenant_profile_id <> t3 END)
     ORDER BY random() LIMIT 1;
    INSERT INTO maintenance_tickets (room_id, tenant_profile_id, title, description, category, priority, status, created_at,
                                     resolved_at, closed_at, closed_by, assigned_technician)
    VALUES (a.room_id, a.tenant_profile_id, p.title, p.body, p.cat, p.pri::ticket_priority_type, p.st::ticket_status_type,
            today - p.age + time '09:30',
            CASE WHEN p.st IN ('Resolved','Closed') THEN today - p.age + 2 + time '15:00' END,
            CASE WHEN p.st = 'Closed' THEN today - p.age + 3 + time '10:00' END,
            CASE WHEN p.st = 'Closed' THEN owner_id END, p.tech)
    RETURNING id INTO tid;
    INSERT INTO ticket_messages (ticket_id, sender_id, message_body, created_at)
      VALUES (tid, a.tenant_profile_id, p.body, today - p.age + time '09:30');
    IF p.st <> 'Submitted' THEN
      INSERT INTO ticket_messages (ticket_id, sender_id, message_body, created_at)
        VALUES (tid, owner_id, 'Noted. We will send someone to check it.', today - p.age + time '11:00');
    END IF;
    INSERT INTO notifications (recipient_profile_id, title, message, type, priority, related_entity_type, related_entity_id, created_at, is_read)
      SELECT x, 'New maintenance request', p.title, 'Maintenance', p.pri::ticket_priority_type, 'maintenance_ticket', tid,
             today - p.age + time '09:30', p.age > 3
        FROM unnest(admin_ids) x;
  END LOOP;

  -- ── Enquiries about the two vacant units ─────────────────────────────────
  FOR p IN SELECT * FROM (VALUES
      ('2g','Carla Mendoza','carla.demo@example.com','09990000011','Hi! Is 2g still available for November? I am a working student.','Pending','K7QM-3XRD',1),
      ('F2F','Ramon Aguilar','ramon.demo@example.com','09990000012','Good day. We are a family of four. Can we view F2F this weekend?','Contacted','P4TW-8HNB',4),
      ('2g','Liza Fernandez','liza.demo@example.com','09990000013','How much is the deposit for the studio?','Closed','Z2YF-6CJK',15),
      ('F2F','Noel Castro','noel.demo@example.com','09990000014','Is parking available for a motorcycle?','Pending','D9RV-5MSE',0)
    ) v(room, nm, em, ph, msg, st, code, age) LOOP
    INSERT INTO inquiries (room_id, prospect_name, prospect_email, prospect_phone, message, status, reference_code, created_at)
    SELECT id, p.nm, p.em, p.ph, p.msg, p.st::inquiry_status_type, p.code, today - p.age + time '14:00' FROM rooms WHERE room_number = p.room
    RETURNING id INTO iid;
    INSERT INTO inquiry_messages (inquiry_id, sender_name, message_body, sent_at) VALUES (iid, p.nm, p.msg, today - p.age + time '14:00');
    IF p.st <> 'Pending' THEN
      INSERT INTO inquiry_messages (inquiry_id, sender_id, sender_name, message_body, sent_at)
      VALUES (iid, owner_id, 'Demo Owner', 'Thank you for asking! Yes, you are welcome to visit. Please message us your preferred time.', today - p.age + time '17:00');
    END IF;
    INSERT INTO notifications (recipient_profile_id, title, message, type, priority, related_entity_type, related_entity_id, created_at, is_read)
      SELECT x, 'New enquiry for unit ' || p.room, p.nm || ': ' || p.msg, 'Inquiry', 'Medium'::ticket_priority_type, 'inquiry', iid,
             today - p.age + time '14:00', p.age > 2 FROM unnest(admin_ids) x;
  END LOOP;

  INSERT INTO notifications (recipient_profile_id, title, message, type, priority, related_entity_type, related_entity_id)
    SELECT x, 'Payment awaiting verification', 'A GCash payment was submitted and needs your review.', 'Payment', 'High'::ticket_priority_type,
           'payment', (SELECT id FROM payments WHERE verification_status = 'Pending Verification' LIMIT 1)
      FROM unnest(admin_ids) x;
  INSERT INTO notifications (recipient_profile_id, title, message, type, priority, related_entity_type, related_entity_id)
    SELECT t2, 'Rent overdue', 'Your October rent and water bill is past its due date.', 'Payment', 'High'::ticket_priority_type, 'bill', b.id
      FROM bills b WHERE b.tenant_profile_id = t2;

  -- ── Expenses, Jan 2025 to today ──────────────────────────────────────────
  m := DATE '2025-01-01';
  WHILE m <= today LOOP
    FOR p IN SELECT * FROM (VALUES
        ('7','City Power Co. - electricity', 12000, 6000, 'BH+MH'),
        ('7','Metro Water District - water', 3000, 2000, 'BH+MH'),
        ('7','Fiber Internet Co. - internet', 1699, 0, 'Boarding House'),
        ('6','Caretaker salary', 15000, 0, 'Boarding House'),
        ('6b','SSS contribution - caretaker', 720, 0, 'Boarding House'),
        ('3','Janitorial service', 5000, 2000, 'Boarding House'),
        ('8','Bicol Hardware Supply - repair materials', 800, 5000, 'random'),
        ('8','Plumbing parts', 500, 3000, 'random'),
        ('8','Electrician labor', 1500, 3500, 'random'),
        ('9','Gasoline', 800, 700, 'Other Expenses / Personal'),
        ('10','Groceries and household', 3000, 6000, 'Other Expenses / Personal'),
        ('10','Main house miscellaneous', 1500, 4000, 'Main House'),
        ('1','Cleaning supplies', 600, 1200, 'Boarding House'),
        ('2','Real property tax / business permit', 9000, 5000, 'quarterly'),
        ('6a','PhilHealth contribution - caretaker', 1500, 0, 'quarterly')
      ) v(cat, supplier, base, spread, alloc) LOOP
      CONTINUE WHEN p.alloc = 'quarterly' AND extract(month FROM m)::int NOT IN (1, 4, 7, 10);
      CONTINUE WHEN p.cat = '1' AND random() < 0.6;
      dpaid := m + floor(random() * 27)::int;
      CONTINUE WHEN dpaid > today;
      amt := round((p.base + random() * p.spread)::numeric, -1);
      INSERT INTO monthly_expense_entries (expense_date, invoice_supplier, category_code, total_expenses, created_by)
      VALUES (dpaid, p.supplier, p.cat, 0, owner_id) RETURNING id INTO eid;
      IF p.alloc = 'BH+MH' THEN
        INSERT INTO expense_property_allocations (expense_entry_id, property_area, amount) VALUES
          (eid, 'Boarding House', round(amt * 0.7, 2)), (eid, 'Main House', amt - round(amt * 0.7, 2));
      ELSE
        area := CASE p.alloc WHEN 'random' THEN areas[1 + floor(random() * 4)::int]
                             WHEN 'quarterly' THEN 'Boarding House' ELSE p.alloc::property_area_type END;
        INSERT INTO expense_property_allocations (expense_entry_id, property_area, amount) VALUES (eid, area, amt);
      END IF;
    END LOOP;
    m := (m + interval '1 month')::date;
  END LOOP;

  -- One expense entered by mistake and voided.
  UPDATE monthly_expense_entries SET voided_at = expense_date + 1, voided_by = owner_id, void_reason = 'Wrong amount; re-entered'
   WHERE id = (SELECT id FROM monthly_expense_entries WHERE category_code = '8' AND expense_date >= DATE '2026-09-01' ORDER BY expense_date LIMIT 1);

  -- ── Rate changes the owner made by hand ──────────────────────────────────
  INSERT INTO room_price_history (room_id, previous_price, new_price, effective_date, reason, created_by)
  SELECT id, current_price - d, current_price, e, 'Rate updated by the owner', owner_id
    FROM rooms JOIN (VALUES ('1a', 500, DATE '2025-06-01'), ('PH', 5000, DATE '2025-09-01'), ('F1', 600, DATE '2026-01-01')) v(rn, d, e)
      ON v.rn = rooms.room_number;
END
$seed$;
