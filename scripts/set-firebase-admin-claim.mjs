import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import admin from 'firebase-admin';

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
    uid: process.env.FIREBASE_ADMIN_UID || process.env.VITE_FIREBASE_ADMIN_UID || '',
  };

  for (const arg of args) {
    if (arg.startsWith('--credentials=')) config.credentials = arg.split('=')[1];
    if (arg.startsWith('--uid=')) config.uid = arg.split('=')[1];
  }

  return config;
}

async function main() {
  const { credentials, uid } = parseArgs();

  if (!credentials) {
    throw new Error('Defina --credentials=CAMINHO ou GOOGLE_APPLICATION_CREDENTIALS');
  }

  if (!uid) {
    throw new Error('Defina --uid=FIREBASE_UID_DO_ADMIN');
  }

  const credentialsPath = path.resolve(credentials);
  if (!fs.existsSync(credentialsPath)) {
    throw new Error(`Credenciais não encontradas: ${credentialsPath}`);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  await admin.auth().setCustomUserClaims(uid, { admin: true });
  console.log(`Claim admin=true aplicada ao UID: ${uid}`);
}

main().catch((error) => {
  console.error('Falha ao definir claim:', error.message);
  process.exit(1);
});
