import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qkapwhyxcpgzahuemucg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrYXB3aHl4Y3BnemFodWVtdWNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1NTgzNTUsImV4cCI6MjA2NTEzNDM1NX0.Labu2GwodnfEce4Nh5oBqTBTaD3weN63nKRMwAsyfbg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const ADMIN_EMAILS = [
  'tony@vespa.academy',
  'admin@vespa.academy',
  'tonyden10@gmail.com',
];

export function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

