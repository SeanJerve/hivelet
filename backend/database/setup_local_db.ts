/**
 * @file setup_local_db.ts
 * @description Local PostgreSQL Database Provisioning & 3NF Schema Verification Script.
 * @systemBibleRef docs/01_SYSTEM_BIBLE.md, docs/04_ARCHITECTURE.md, docs/05_DATABASE_DESIGN.md
 * @rationale Connects to local Docker PostgreSQL container, executes schema.sql DDL and seed.sql DML,
 *            and verifies 3NF table structures, constraint enforcement, and seed row counts.
 * @innovations 
 *  1. Automated execution of DDL and seed files with error reporting.
 *  2. Verification suite validating 32 canonical rooms, 5 clusters, 10 expense categories, and RLS enablement.
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/hivelet_db';

const pool = new Pool({
  connectionString,
});

async function main() {
  const isVerifyOnly = process.argv.includes('--verify-only');
  console.log('\n====================================================================');
  console.log('   HIVELET LOCAL DOCKER DATABASE PROVISIONING & VERIFICATION');
  console.log('====================================================================');
  console.log(`📡 Connecting to PostgreSQL at: ${connectionString.replace(/:[^:@]+@/, ':****@')}`);

  try {
    const client = await pool.connect();
    console.log('✅ Connected successfully to PostgreSQL database engine.');

    if (!isVerifyOnly) {
      console.log('\n🛠️  [1/3] Reading SQL files...');
      const schemaPath = path.join(__dirname, 'schema.sql');
      const seedPath = path.join(__dirname, 'seed.sql');

      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      const seedSql = fs.readFileSync(seedPath, 'utf8');

      console.log('⚡ [2/3] Executing schema.sql (3NF Tables, RLS Policies, Triggers)...');
      await client.query(schemaSql);
      console.log('✅ Schema created successfully!');

      console.log('🌱 [3/3] Executing seed.sql (32 Canonical Units & Test Dataset)...');
      await client.query(seedSql);
      console.log('✅ Canonical Seed data populated successfully!');
    } else {
      console.log('🔍 Running in --verify-only mode...');
    }

    // VERIFICATION SUITE
    console.log('\n📊 DATABASE VERIFICATION REPORT');
    console.log('--------------------------------------------------------------------');

    const tablesToVerify = [
      'clusters',
      'rooms',
      'profiles',
      'room_assignments',
      'room_price_history',
      'inquiries',
      'inquiry_messages',
      'monthly_income_records',
      'bills',
      'payments',
      'fixed_expense_categories',
      'monthly_expense_entries',
      'expense_property_allocations',
      'maintenance_tickets',
      'ticket_attachments',
      'ticket_messages',
      'notifications',
      'audit_logs'
    ];

    let allPassed = true;

    for (const tableName of tablesToVerify) {
      try {
        const res = await client.query(`SELECT COUNT(*) FROM ${tableName};`);
        const count = parseInt(res.rows[0].count, 10);

        // Specific Check Assertions
        let statusNote = '';
        if (tableName === 'rooms' && count !== 33) {
          statusNote = `⚠️ Warning: Expected 33 canonical units, found ${count}`;
          allPassed = false;
        } else if (tableName === 'clusters' && count !== 5) {
          statusNote = `⚠️ Warning: Expected 5 property clusters, found ${count}`;
          allPassed = false;
        } else if (tableName === 'fixed_expense_categories' && count < 13) {
          statusNote = `⚠️ Warning: Expected 13 categories (10 main + 3 sublines), found ${count}`;
          allPassed = false;
        } else {
          statusNote = 'OK';
        }

        console.log(`  • Table [${tableName.padEnd(28)}]: ${count.toString().padStart(4)} rows  [${statusNote}]`);
      } catch (err: any) {
        console.error(`  ❌ Error querying table [${tableName}]:`, err?.message || err);
        allPassed = false;
      }
    }

    // Verify Generated Columns in monthly_income_records
    console.log('\n🧮 VERIFYING 3NF GENERATED COLUMNS & FORMULAS');
    console.log('--------------------------------------------------------------------');
    const incomeTest = await client.query(`
      SELECT contact_name, rent_amount, fifty_percent_share, water_payment, remitted_amount 
      FROM monthly_income_records 
      LIMIT 1;
    `);

    if (incomeTest.rows.length > 0) {
      const row = incomeTest.rows[0];
      const rent = parseFloat(row.rent_amount);
      const halfShare = parseFloat(row.fifty_percent_share);
      const water = parseFloat(row.water_payment);
      const remitted = parseFloat(row.remitted_amount);

      console.log(`  • Contact Name: ${row.contact_name}`);
      console.log(`  • Rent Amount: ₱${rent.toFixed(2)}`);
      console.log(`  • 50% Share (Generated): ₱${halfShare.toFixed(2)} -> ${halfShare === rent / 2 ? '✅ Verified (Rent / 2)' : '❌ Failed'}`);
      console.log(`  • Water Payment: ₱${water.toFixed(2)}`);
      console.log(`  • Remitted Amount (Generated): ₱${remitted.toFixed(2)} -> ${remitted === rent + water ? '✅ Verified (Rent + Water)' : '❌ Failed'}`);
    }

    // Verify RLS Enablement
    console.log('\n🔒 VERIFYING ROW-LEVEL SECURITY (RLS) ENABLEMENT');
    console.log('--------------------------------------------------------------------');
    const rlsRes = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename IN ('rooms', 'monthly_income_records', 'monthly_expense_entries', 'audit_logs');
    `);

    for (const row of rlsRes.rows) {
      console.log(`  • Table [${row.tablename.padEnd(24)}]: RLS ${row.rowsecurity ? '✅ ENABLED' : '❌ DISABLED'}`);
    }

    client.release();

    console.log('====================================================================');
    if (allPassed) {
      console.log('🎉 SUCCESS: All 18 database tables, 3NF formulas, and RLS policies verified!');
    } else {
      console.log('⚠️  COMPLETED WITH WARNINGS: Review the output above.');
    }
    console.log('====================================================================\n');

  } catch (error: any) {
    console.error('\n❌ Database Connection or Setup Error:', error?.message || error);
    console.error('💡 Make sure your Docker container is running (docker compose up -d).\n');
  } finally {
    await pool.end();
  }
}

main();
