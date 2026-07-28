import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xeynbzcoywogcaesyhkw.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhleW5iemNveXdvZ2NhZXN5aGt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMDg0MjksImV4cCI6MjEwMDc4NDQyOX0.8frGFwGxrTfW07kYFZ4_OBQc_VHyHybifTg8PA0cgSg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
