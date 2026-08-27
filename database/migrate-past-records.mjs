import { createClient } from '@supabase/supabase-js';
import xlsx from 'xlsx';
import { readFileSync } from 'fs';
import path from 'path';

// Parse arguments
const isDryRun = process.argv.includes('--dry-run');

function loadEnv() {
  const env = {};
  try {
    const raw = readFileSync('../.env', 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
  } catch (err) {
    console.error('Could not read .env at the repository root.', err);
    process.exit(1);
  }
  return env;
}

const env = loadEnv();
const supabaseUrl = env.SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// Helper: Supabase insert with automatic retries and exponential backoff
async function supabaseInsertWithRetry(table, payload, selectSingle = false, retries = 5, delay = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      let query = supabase.from(table).insert(payload);
      if (selectSingle) {
        query = query.select('*').single();
      }
      const res = await query;
      if (res.error) throw new Error(res.error.message);
      return res.data;
    } catch (err) {
      if (attempt === retries) {
        throw err;
      }
      console.warn(`[RETRY] Attempt ${attempt} failed for table ${table}: ${err.message}. Retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      delay *= 1.5;
    }
  }
}

// Helper: Excel date serial to YYYY-MM-DD
function excelDateToJSDate(serial) {
  if (typeof serial !== 'number') return null;
  // Excel leap year bug adjustment (serial 60 is Feb 29 1900, which didn't exist)
  const days = serial - (serial < 60 ? 25567 : 25569);
  const dateObj = new Date(days * 86400 * 1000);
  // Remove timezone offset shifts
  const tzOffset = dateObj.getTimezoneOffset();
  const adjusted = new Date(dateObj.getTime() + tzOffset * 60 * 1000);
  return adjusted.toISOString().split('T')[0];
}

// Helper: Parse Rent Period
function parseRentPeriod(str, defaultYear) {
  if (!str || typeof str !== 'string') return { start: null, end: null };
  const cleaned = str.replace(/\s+/g, '');
  
  let year = defaultYear;
  const yearMatch = cleaned.match(/\/(\d{2})$/);
  let baseStr = cleaned;
  if (yearMatch) {
    year = 2000 + parseInt(yearMatch[1], 10);
    baseStr = cleaned.substring(0, cleaned.indexOf('/' + yearMatch[1]));
  }

  const parts = baseStr.split('-');
  if (parts.length !== 2) return { start: null, end: null };

  const startStr = parts[0];
  const endStr = parts[1];

  function parseMonthDay(s) {
    const match = s.match(/^([a-zA-Z\.]+)(\d+)$/);
    if (!match) return null;
    const mStr = match[1].toLowerCase().replace(/\./g, '');
    const d = parseInt(match[2], 10);

    let monthIdx = null;
    if (mStr.startsWith('jan')) monthIdx = 0;
    else if (mStr.startsWith('feb')) monthIdx = 1;
    else if (mStr.startsWith('mar')) monthIdx = 2;
    else if (mStr.startsWith('apr') || mStr.startsWith('ap')) monthIdx = 3;
    else if (mStr.startsWith('may')) monthIdx = 4;
    else if (mStr.startsWith('jun')) monthIdx = 5;
    else if (mStr.startsWith('jul')) monthIdx = 6;
    else if (mStr.startsWith('aug')) monthIdx = 7;
    else if (mStr.startsWith('sep')) monthIdx = 8;
    else if (mStr.startsWith('oct')) monthIdx = 9;
    else if (mStr.startsWith('nov')) monthIdx = 10;
    else if (mStr.startsWith('dec')) monthIdx = 11;

    if (monthIdx === null || isNaN(d)) return null;
    return { month: monthIdx, day: d };
  }

  const startMD = parseMonthDay(startStr);
  const endMD = parseMonthDay(endStr);

  if (!startMD) return { start: null, end: null };

  const startObj = new Date(year, startMD.month, startMD.day);
  let endObj = null;

  if (endMD) {
    let endYear = year;
    if (endMD.month < startMD.month) {
      endYear = year + 1;
    }
    endObj = new Date(endYear, endMD.month, endMD.day);
  } else {
    const endDay = parseInt(endStr, 10);
    if (!isNaN(endDay)) {
      endObj = new Date(year, startMD.month, endDay);
    }
  }

  if (startObj && endObj) {
    const startISO = new Date(startObj.getTime() - startObj.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const endISO = new Date(endObj.getTime() - endObj.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    return { start: startISO, end: endISO };
  }

  return { start: null, end: null };
}

// Main logic
async function run() {
  console.log(`--- HIVELET PAST RECORDS MIGRATION --- ${isDryRun ? '(DRY RUN)' : ''}`);

  // 1. Fetch Rooms & Profiles to build lookup caches
  console.log('Fetching database rooms...');
  const { data: dbRooms, error: roomsError } = await supabase
    .from('rooms')
    .select('id, room_number, cluster_code');
  if (roomsError) {
    console.error('Failed to fetch rooms from DB:', roomsError);
    process.exit(1);
  }

  const roomMap = {};
  dbRooms.forEach(r => {
    roomMap[r.room_number.toLowerCase()] = r;
  });

  console.log('Fetching database profiles...');
  const { data: dbProfiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, email');
  if (profilesError) {
    console.error('Failed to fetch profiles from DB:', profilesError);
    process.exit(1);
  }

  // Find profile ID by fuzzy name match
  function findProfileId(name) {
    if (!name || typeof name !== 'string') return null;
    const cleanName = name.toLowerCase().trim().replace(/\s+/g, ' ');
    const match = dbProfiles.find(p => p.full_name.toLowerCase().trim().replace(/\s+/g, ' ') === cleanName);
    return match ? match.id : null;
  }

  // Find admin profile to set as creator for expenses
  const adminProfile = dbProfiles.find(p => p.email === 'admin@hivelet.ph');
  const adminId = adminProfile ? adminProfile.id : null;

  // 2. Open Excel
  const excelPath = path.resolve('../INCOME AND EXPENSES PAST RECORDS/Michelles-BH-Report-Income-and-Expenses-fr-Yr-2024-up (1) (1) (1).xlsx');
  console.log('Reading Excel file:', excelPath);
  const workbook = xlsx.readFile(excelPath);

  // =========================================================================
  // PART A: MONTHLY INCOME MIGRATION
  // =========================================================================
  console.log('\n--- Parsing Monthly Income Sheet ---');
  const incomeSheet = workbook.Sheets['Monthly Income'];
  const incomeRows = xlsx.utils.sheet_to_json(incomeSheet, { header: 1 });

  let activeYear = 2024;
  let activeMonth = 1;
  let activeCluster = 'BH';

  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];

  const incomeInserts = [];

  for (let idx = 0; idx < incomeRows.length; idx++) {
    const row = incomeRows[idx];
    if (!row || row.length === 0) continue;

    const cell0 = row[0] ? String(row[0]).trim() : '';
    const cell1 = row[1] ? String(row[1]).trim() : '';
    const cell2 = row[2] ? String(row[2]).trim() : '';

    // Check for month/year header blocks or cluster separators
    // e.g. [ 'BH', 'January \'2024' ]
    if (cell0 === 'BH' && cell1) {
      activeCluster = 'BH';
      const cleanDateStr = cell1.toLowerCase().replace(/['"]/g, '').trim();
      
      // Parse year if specified (like "2024", "2025", "2026")
      const yrMatch = cleanDateStr.match(/\b(202\d)\b/);
      if (yrMatch) {
        activeYear = parseInt(yrMatch[1], 10);
      }
      
      // Parse month
      const foundMonth = monthNames.findIndex(m => cleanDateStr.includes(m));
      if (foundMonth !== -1) {
        activeMonth = foundMonth + 1;
      }
      console.log(`Setting current context: ${monthNames[activeMonth - 1].toUpperCase()} ${activeYear}, Cluster: ${activeCluster}`);
      continue;
    }

    // Check for single cluster header rows (e.g. [ 'Back Apartment' ])
    if (cell0 && !row[1] && !row[2] && !row[3] && !row[4]) {
      const lowerCell0 = cell0.toLowerCase();
      if (lowerCell0 === 'back apartment') {
        activeCluster = 'Back Apartment';
      } else if (lowerCell0 === 'pent house' || lowerCell0 === 'penthouse') {
        activeCluster = 'Penthouse';
      } else if (lowerCell0 === 'front apartment') {
        activeCluster = 'Front Apartment';
      } else if (lowerCell0 === 'linda') {
        activeCluster = 'Linda';
      }
      continue;
    }

    // Skip column headers row
    if (cell0 === 'Rm #') continue;

    // Check if it's a data row
    // Room number must map to a room, and cell2 (tenant info) must not be VACANT
    if (cell0) {
      // Map Linda rooms prefixed with *
      let roomNum = cell0;
      if (roomNum.startsWith('*')) {
        roomNum = roomNum.substring(1); // LF, LB
      }
      
      const matchedRoom = roomMap[roomNum.toLowerCase()];
      if (matchedRoom) {
        if (cell2.toUpperCase() === 'VACANT') {
          // Skip vacant room rows
          continue;
        }

        // Parse Tenant Info: e.g. "Lobby Toor OR#4627"
        let tenantName = cell2;
        let invoiceNum = null;
        
        const orMatch = cell2.match(/(.*)\b(OR#|OR|O#|OR #)(\d+)(.*)/i);
        if (orMatch) {
          tenantName = orMatch[1].trim();
          invoiceNum = orMatch[2].trim() + orMatch[3].trim() + (orMatch[4] ? orMatch[4].trim() : '');
        }

        // If tenant name is empty, skip
        if (!tenantName) continue;

        if (!invoiceNum) {
          invoiceNum = `N/A-${roomNum}-${activeMonth}-${activeYear}`;
        }

        // Parse Date Paid
        let datePaid = null;
        if (typeof row[1] === 'number') {
          datePaid = excelDateToJSDate(row[1]);
        } else {
          // fallback to 1st of active month
          datePaid = `${activeYear}-${String(activeMonth).padStart(2, '0')}-01`;
        }

        // Parse Rent Period
        const rentPeriodStr = row[3] ? String(row[3]).trim() : '';
        const rentPeriod = parseRentPeriod(rentPeriodStr, activeYear);
        let rentPeriodStart = rentPeriod.start;
        let rentPeriodEnd = rentPeriod.end;
        if (!rentPeriodStart || !rentPeriodEnd) {
          rentPeriodStart = `${activeYear}-${String(activeMonth).padStart(2, '0')}-01`;
          const lastDay = new Date(activeYear, activeMonth, 0).getDate();
          rentPeriodEnd = `${activeYear}-${String(activeMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        }

        // Parse amounts
        const rentAmount = parseFloat(row[4]) || 0;
        const col5Val = parseFloat(row[5]) || 0;
        const occupants = parseInt(row[6]) || 1;
        const waterPayment = parseFloat(row[7]) || 0;
        const gbgFee = parseFloat(row[8]) || 0;

        const isLinda = matchedRoom.cluster_code === 'Linda';
        const lindaElectricCharge = isLinda ? col5Val : 0;
        const lindaWaterCharge = isLinda ? waterPayment : 0;

        // Try link to database profile
        const profileId = findProfileId(tenantName);

        incomeInserts.push({
          room_id: matchedRoom.id,
          tenant_profile_id: profileId,
          year: activeYear,
          month: activeMonth,
          date_paid: datePaid,
          contact_name: tenantName,
          invoice_number: invoiceNum,
          rent_period_start: rentPeriodStart,
          rent_period_end: rentPeriodEnd,
          rent_amount: rentAmount,
          occupants: occupants,
          water_payment: isLinda ? 0 : waterPayment,
          gbg_fee: gbgFee,
          payment_method: 'Cash',
          is_linda_billing: isLinda,
          linda_electricity_charge: lindaElectricCharge,
          linda_water_charge: lindaWaterCharge,
          verification_status: 'Verified'
        });
      }
    }
  }

  console.log(`Parsed ${incomeInserts.length} Monthly Income records.`);

  // =========================================================================
  // PART B: MONTHLY EXPENSES MIGRATION
  // =========================================================================
  console.log('\n--- Parsing Monthly Expenses Sheet ---');
  const expensesSheet = workbook.Sheets['Monthly Expenses'];
  const expensesRows = xlsx.utils.sheet_to_json(expensesSheet, { header: 1 });

  let expActiveYear = 2024;
  let expActiveMonth = 1;

  const expenseInserts = []; // Entries & their allocations

  for (let idx = 0; idx < expensesRows.length; idx++) {
    const row = expensesRows[idx];
    if (!row || row.length === 0) continue;

    const cell0 = row[0] ? String(row[0]).trim() : '';
    const cell1 = row[1] ? String(row[1]).trim() : '';

    // Check for year headers like [ "2024'" ] or [ "2025\"" ]
    if (cell0.match(/^\d{4}['"]?$/) && !row[1] && !row[2]) {
      expActiveYear = parseInt(cell0.match(/^\d{4}/)[0], 10);
      console.log(`Setting expense year: ${expActiveYear}`);
      continue;
    }

    // Check for month headers like [ 'January' ]
    if (cell0 && !row[1] && !row[2] && !row[3] && !row[4]) {
      const lowerCell0 = cell0.toLowerCase().replace(/['"]/g, '').trim();
      const foundMonth = monthNames.findIndex(m => lowerCell0.startsWith(m));
      if (foundMonth !== -1) {
        expActiveMonth = foundMonth + 1;
        console.log(`Setting expense context: ${monthNames[expActiveMonth - 1].toUpperCase()} ${expActiveYear}`);
      }
      continue;
    }

    // Skip headers row
    if (cell1.toLowerCase() === 'or/supplier') continue;
    if (cell1.toLowerCase() === 'total' || cell1.toLowerCase() === '        total') continue;

    // Check if data row: must have an OR/Supplier (cell1) and a Category Code (cell7)
    // Wait, in some rows cell0 might be an excel date number, or empty.
    const categoryVal = row[7] !== undefined ? String(row[7]).trim() : '';
    
    if (cell1 && categoryVal) {
      // Parse Date
      let expenseDate = null;
      if (typeof row[0] === 'number') {
        expenseDate = excelDateToJSDate(row[0]);
      } else {
        expenseDate = `${expActiveYear}-${String(expActiveMonth).padStart(2, '0')}-01`;
      }

      const orSupplier = cell1;
      // Category Code in DB is clean string e.g. "1", "2", "6", "6a", "6b", "6c"
      const categoryCode = categoryVal.toLowerCase().replace(/\s+/g, '');

      // Allocations
      // Index 2: Boarding House Expenses
      // Index 3: Main House Expenses
      // Index 4: Front Apartment Expenses
      // Index 5: Back Apartment Expenses
      // Index 6: Other Expenses / Personal
      const allocs = [];
      const bhVal = parseFloat(row[2]) || 0;
      const mhVal = parseFloat(row[3]) || 0;
      const faVal = parseFloat(row[4]) || 0;
      const baVal = parseFloat(row[5]) || 0;
      const otVal = parseFloat(row[6]) || 0;

      if (bhVal > 0) allocs.push({ area: 'Boarding House', amount: bhVal });
      if (mhVal > 0) allocs.push({ area: 'Main House', amount: mhVal });
      if (faVal > 0) allocs.push({ area: 'Front Apartment', amount: faVal });
      if (baVal > 0) allocs.push({ area: 'Back Apartment', amount: baVal });
      if (otVal > 0) allocs.push({ area: 'Other Expenses / Personal', amount: otVal });

      const totalExpenses = allocs.reduce((sum, a) => sum + a.amount, 0);

      // If total expenses is 0, check if there is a total listed in Col 8
      const col8Val = parseFloat(row[8]) || 0;
      const finalTotal = totalExpenses > 0 ? totalExpenses : col8Val;

      if (finalTotal > 0) {
        // If allocs is empty but finalTotal is positive, allocate to Boarding House as fallback
        if (allocs.length === 0) {
          allocs.push({ area: 'Boarding House', amount: finalTotal });
        }

        expenseInserts.push({
          expense_date: expenseDate,
          or_supplier: orSupplier,
          category_code: categoryCode,
          total_expenses: finalTotal,
          allocations: allocs
        });
      }
    }
  }

  console.log(`Parsed ${expenseInserts.length} Monthly Expense entries.`);

  // =========================================================================
  // PART C: WRITE TO DATABASE (IF NOT DRY RUN)
  // =========================================================================
  if (isDryRun) {
    console.log('\n--- DRY RUN SUMMARY (No database modifications made) ---');
    console.log(`Income records parsed: ${incomeInserts.length}`);
    console.log(`Expense entries parsed: ${expenseInserts.length}`);
    console.log('Sample Income record:', incomeInserts[0]);
    console.log('Sample Expense entry:', expenseInserts[0]);
    return;
  }

  // Clear pre-existing historical data (optional, but makes it idempotent)
  console.log('\nCleaning up existing records to ensure clean import...');
  const { error: clearIncomeError } = await supabase
    .from('monthly_income_records')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (clearIncomeError) {
    console.error('Failed to clean up monthly_income_records:', clearIncomeError.message);
    process.exit(1);
  }

  const { error: clearExpenseError } = await supabase
    .from('monthly_expense_entries')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (clearExpenseError) {
    console.error('Failed to clean up monthly_expense_entries:', clearExpenseError.message);
    process.exit(1);
  }
  console.log('Database cleaned successfully.');

  const batchSize = 100;

  console.log('\nInserting Income Records into DB...');
  for (let i = 0; i < incomeInserts.length; i += batchSize) {
    const batch = incomeInserts.slice(i, i + batchSize);
    try {
      await supabaseInsertWithRetry('monthly_income_records', batch);
    } catch (error) {
      console.error(`Error inserting income batch starting at index ${i}:`, error.message);
      process.exit(1);
    }
    console.log(`Inserted income records ${i + 1} to ${Math.min(i + batchSize, incomeInserts.length)}...`);
  }

  console.log('Inserting Expense Entries & Allocations into DB (Concurrently in chunks)...');
  const chunkSize = 10;
  for (let i = 0; i < expenseInserts.length; i += chunkSize) {
    const chunk = expenseInserts.slice(i, i + chunkSize);
    await Promise.all(chunk.map(async (item) => {
      try {
        // 1. Insert main entry
        const entry = await supabaseInsertWithRetry('monthly_expense_entries', {
          expense_date: item.expense_date,
          or_supplier: item.or_supplier,
          category_code: item.category_code,
          total_expenses: item.total_expenses,
          created_by: adminId
        }, true);

        // 2. Insert allocations
        const allocationInserts = item.allocations.map(a => ({
          expense_entry_id: entry.id,
          property_area: a.area,
          amount: a.amount
        }));

        await supabaseInsertWithRetry('expense_property_allocations', allocationInserts);
      } catch (err) {
        console.error(`Failed to migrate expense entry "${item.or_supplier}":`, err.message);
        process.exit(1);
      }
    }));
    console.log(`Inserted expense entries and allocations up to index ${Math.min(i + chunkSize, expenseInserts.length)}...`);
  }

  console.log('\n🎉 Past records migration complete!');
}

run();
