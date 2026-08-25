import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://xeynbzcoywogcaesyhkw.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY in backend/.env!");
  process.exit(1);
}

const db = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function seed() {
  console.log("Seeding broken faucet ticket...");

  // 1. Fetch any active room assignment
  const { data: assignments, error: assignError } = await db
    .from('room_assignments')
    .select('*, rooms (id, room_number), profiles (id, full_name)')
    .eq('is_active', true)
    .limit(1);

  if (assignError) {
    console.error("Failed to query room assignments:", assignError.message);
    process.exit(1);
  }

  if (!assignments || assignments.length === 0) {
    console.error("No active room assignments found to attach ticket to!");
    process.exit(1);
  }

  const activeAssign = assignments[0];
  const roomId = activeAssign.room_id;
  const tenantId = activeAssign.tenant_profile_id;
  const roomNumber = activeAssign.rooms.room_number;
  const tenantName = activeAssign.profiles.full_name;

  console.log(`Found active assignment: Tenant "${tenantName}" (ID: ${tenantId}) in Room ${roomNumber} (ID: ${roomId})`);

  // 2. Check if the broken faucet ticket is already seeded
  const { data: existing, error: existError } = await db
    .from('maintenance_tickets')
    .select('id')
    .eq('title', 'Broken bathroom faucet leaking water')
    .maybeSingle();

  if (existError) {
    console.error("Failed to check existing tickets:", existError.message);
    process.exit(1);
  }

  if (existing) {
    console.log("Broken faucet ticket is already seeded.");
    return;
  }

  // 3. Insert maintenance ticket
  const { data: ticket, error: ticketError } = await db
    .from('maintenance_tickets')
    .insert({
      room_id: roomId,
      tenant_profile_id: tenantId,
      title: 'Broken bathroom faucet leaking water',
      description: 'The faucet in the bathroom is cracked and spraying water from the side. We need immediate assistance to replace or patch the pipe to stop water wastage.',
      category: 'Plumbing',
      priority: 'Emergency',
      status: 'Submitted'
    })
    .select('id')
    .single();

  if (ticketError) {
    console.error("Failed to insert ticket:", ticketError.message);
    process.exit(1);
  }

  console.log("Inserted maintenance ticket with ID:", ticket.id);

  // 4. Insert attachment with our faucet image url
  const { error: attachError } = await db
    .from('ticket_attachments')
    .insert({
      ticket_id: ticket.id,
      file_url: '/broken_faucet.jpg', // Local public asset
      file_type: 'image/jpeg'
    });

  if (attachError) {
    console.error("Failed to insert ticket attachment:", attachError.message);
    process.exit(1);
  }

  console.log("Seeding complete! Successfully linked broken faucet image.");
}

seed();
