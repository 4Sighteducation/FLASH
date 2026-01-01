import fs from 'node:fs';
import { SignJWT, importPKCS8 } from 'jose';

// Usage:
// node scripts/generate-apple-client-secret.mjs <path-to-p8> <TEAM_ID> <KEY_ID> <CLIENT_ID>
//
// Example:
// node scripts/generate-apple-client-secret.mjs "./AuthKey_G2U2UTV74D.p8" "583RMY9GN3" "G2U2UTV74D" "com.foursighteducation.flash.web"

const [, , p8Path, teamId, keyId, clientId] = process.argv;

if (!p8Path || !teamId || !keyId || !clientId) {
  console.error(
    'Usage: node scripts/generate-apple-client-secret.mjs <path-to-p8> <TEAM_ID> <KEY_ID> <CLIENT_ID>'
  );
  process.exit(1);
}

const p8 = fs.readFileSync(p8Path, 'utf8').trim();

const alg = 'ES256';
const iat = Math.floor(Date.now() / 1000);
const exp = iat + 60 * 60 * 24 * 180; // 180 days (<= 6 months)

const key = await importPKCS8(p8, alg);

const jwt = await new SignJWT({})
  .setProtectedHeader({ alg, kid: keyId })
  .setIssuedAt(iat)
  .setExpirationTime(exp)
  .setIssuer(teamId)
  .setAudience('https://appleid.apple.com')
  .setSubject(clientId)
  .sign(key);

console.log(jwt);





