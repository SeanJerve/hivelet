    fix AS (
      SELECT f.r, f.o, f.n, trim(f.s) AS s, lower(f.c) AS c, f.t, f.a
      FROM jsonb_to_recordset('__DATA__'::jsonb) AS f(r int, o date, n date, s text, c text, t numeric, a text)
    ),
    stored AS (
      SELECT e.id, e.expense_date AS o, trim(e.or_supplier) AS s,
             lower(e.category_code) AS c, e.total_expenses AS t,
             coalesce((SELECT string_agg(x.property_area::text || ':' || to_char(x.amount, 'FM9999999990.00'), '|'
                                         ORDER BY x.property_area::text || ':' || to_char(x.amount, 'FM9999999990.00') COLLATE "C")
                       FROM expense_property_allocations x WHERE x.expense_entry_id = e.id), '') AS a
      FROM monthly_expense_entries e
      WHERE e.expense_date < DATE '2026-08-01'
    ),
    sk AS (SELECT o, s, c, t, a, count(*) AS n_sheet, array_agg(n ORDER BY n) AS news, array_agg(r ORDER BY n) AS rows_
           FROM fix GROUP BY o, s, c, t, a),
    dk AS (SELECT o, s, c, t, a, count(*) AS n_db, array_agg(id ORDER BY id) AS ids
           FROM stored GROUP BY o, s, c, t, a),
    ok AS (SELECT sk.*, dk.ids FROM sk JOIN dk USING (o, s, c, t, a) WHERE sk.n_sheet = dk.n_db),
    pairs AS (SELECT u.id, u.new_date FROM ok, unnest(ok.ids, ok.news) AS u(id, new_date))
