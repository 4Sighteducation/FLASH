import { createClient } from '@supabase/supabase-js';

// Supabase configuration - hardcoded for web (anon key is public/client-safe)
const supabaseUrl = 'https://qkapwhyxcpgzahuemucg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrYXB3aHl4Y3BnemFodWVtdWNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1NTgzNTUsImV4cCI6MjA2NTEzNDM1NX0.Labu2GwodnfEce4Nh5oBqTBTaD3weN63nKRMwAsyfbg';

console.log('🔑 [WEB] Supabase initialized');

// Create Supabase client for WEB (uses localStorage, not AsyncStorage)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: 'flash-app-auth',
  },
});

