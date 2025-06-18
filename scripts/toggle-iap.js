#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const files = [
  'App.tsx',
  'src/screens/main/ProfileScreen.tsx',
  'src/screens/onboarding/SubjectSelectionScreen.tsx',
  'src/screens/cards/CreateCardScreen.tsx'
];

const mode = process.argv[2];

if (!mode || (mode !== 'mock' && mode !== 'real')) {
  console.log('Usage: node scripts/toggle-iap.js [mock|real]');
  console.log('  mock - Use mock IAP for Expo Go development');
  console.log('  real - Use real IAP for custom builds');
  process.exit(1);
}

files.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  
  if (!fs.existsSync(filePath)) {
    console.warn(`Warning: ${file} not found`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (mode === 'mock') {
    // Switch to mock
    content = content.replace(
      /from ['"]\.\.\/\.\.\/contexts\/SubscriptionContext['"]/g,
      "from '../../contexts/SubscriptionContext.mock'"
    );
    content = content.replace(
      /from ['"]\.\/src\/contexts\/SubscriptionContext['"]/g,
      "from './src/contexts/SubscriptionContext.mock'"
    );
  } else {
    // Switch to real
    content = content.replace(
      /from ['"]\.\.\/\.\.\/contexts\/SubscriptionContext\.mock['"]/g,
      "from '../../contexts/SubscriptionContext'"
    );
    content = content.replace(
      /from ['"]\.\/src\/contexts\/SubscriptionContext\.mock['"]/g,
      "from './src/contexts/SubscriptionContext'"
    );
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`✓ Updated ${file} to use ${mode} IAP`);
});

console.log(`\n✅ Switched to ${mode} IAP mode`);
console.log(mode === 'mock' 
  ? '📱 You can now run: npx expo start' 
  : '🏗️  Ready for custom build: eas build --platform android'
); 