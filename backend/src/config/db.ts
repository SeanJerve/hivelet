/**
 * @file db.ts
 * @description Hivelet Database Client & Connection Verification module.
 * @systemBibleRef docs/04_ARCHITECTURE.md & docs/05_DATABASE_DESIGN.md
 * @rationale Supports both local Docker PostgreSQL (via pg.Pool) and online Supabase API client (via @supabase/supabase-js)
 *            driven by the USE_LOCAL_DB environment flag.
 * @innovations Dynamic database client abstraction allowing local Docker-first development before cloud deployment.
 */

import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config();

const useLocalDb = process.env.USE_LOCAL_DB === 'true';
const databaseUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/hivelet_db';
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

// Local PostgreSQL connection pool
export const pgPool = new Pool({
  connectionString: databaseUrl,
});

// Supabase client instance
export const supabase = createClient(supabaseUrl, supabaseKey);

export async function testDbConnection(): Promise<boolean> {
  if (useLocalDb) {
    try {
      const client = await pgPool.connect();
      const res = await client.query('SELECT COUNT(*) FROM rooms;');
      client.release();
      console.log(`✅ Local Docker PostgreSQL connected. Rooms count: ${res.rows[0].count}`);
      return true;
    } catch (error: any) {
      console.warn('⚠️  Local Docker PostgreSQL Connection Warning:', error?.message || error);
      console.warn('ℹ️  Ensure your Docker Desktop container is running (docker compose up -d).');
      return false;
    }
  } else {
    try {
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase credentials missing.');
      }
      
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: { apikey: supabaseKey },
      });

      if (response.ok || response.status === 200) {
        console.log('✅ Supabase Connection initialized and reachable.');
        return true;
      } else {
        console.warn(`⚠️  Supabase Connection returned status ${response.status}`);
        return false;
      }
    } catch (error: any) {
      console.warn('⚠️  Supabase Database Connection Warning:', error?.message || error);
      return false;
    }
  }
}
