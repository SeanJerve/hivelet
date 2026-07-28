import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Supabase URL or Key is missing from environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function testDbConnection(): Promise<boolean> {
  try {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials missing.');
    }
    
    // Quick ping to check Supabase API connectivity
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
    console.warn('ℹ️  Ensure your SUPABASE_URL and SUPABASE_ANON_KEY environment variables are correct.');
    return false;
  }
}
