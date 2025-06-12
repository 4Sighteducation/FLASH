const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigrations() {
  try {
    console.log('Running database migrations...\n');

    // Read and run the study bank migration
    const studyBankMigration = fs.readFileSync(
      path.join(__dirname, '..', 'supabase', 'add-study-bank-system.sql'),
      'utf8'
    );
    
    console.log('1. Running study bank system migration...');
    const { error: studyBankError } = await supabase.rpc('exec_sql', {
      sql: studyBankMigration
    });
    
    if (studyBankError) {
      console.error('Error running study bank migration:', studyBankError);
    } else {
      console.log('✓ Study bank system migration completed\n');
    }

    // Read and run the existing cards migration
    const existingCardsMigration = fs.readFileSync(
      path.join(__dirname, '..', 'supabase', 'migrate-existing-cards-to-study-bank.sql'),
      'utf8'
    );
    
    console.log('2. Migrating existing cards to study bank...');
    const { error: existingCardsError } = await supabase.rpc('exec_sql', {
      sql: existingCardsMigration
    });
    
    if (existingCardsError) {
      console.error('Error migrating existing cards:', existingCardsError);
    } else {
      console.log('✓ Existing cards migration completed\n');
    }

    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
  }
}

runMigrations(); 