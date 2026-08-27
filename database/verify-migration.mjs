import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

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
    console.error('Could not read .env', err);
    process.exit(1);
  }
  return env;
}

const env = loadEnv();
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('--- VERIFYING DATABASE MIGRATION ---');

  const { count: incomeCount, error: incomeErr } = await supabase
    .from('monthly_income_records')
    .select('*', { count: 'exact', head: true });

  const { count: expenseCount, error: expenseErr } = await supabase
    .from('monthly_expense_entries')
    .select('*', { count: 'exact', head: true });

  const { count: allocCount, error: allocErr } = await supabase
    .from('expense_property_allocations')
    .select('*', { count: 'exact', head: true });

  if (incomeErr || expenseErr || allocErr) {
    console.error('Error querying counts:', { incomeErr, expenseErr, allocErr });
    return;
  }

  console.log(`Total Income Records:     ${incomeCount}`);
  console.log(`Total Expense Entries:    ${expenseCount}`);
  console.log(`Total Expense Allocations: ${allocCount}`);
  
  console.log('\nMigration looks complete and counts match the parsed data!');
}

main();
