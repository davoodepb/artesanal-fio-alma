import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import csv from 'csv-parser';
import admin from 'firebase-admin';

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
    csvDir: './migration-csv',
    collections: [],
    dryRun: false,
    stripFields: ['email', 'password', 'senha', 'hashed_password', 'encrypted_password'],
  };

  for (const arg of args) {
    if (arg.startsWith('--credentials=')) config.credentials = arg.split('=')[1];
    if (arg.startsWith('--csvDir=')) config.csvDir = arg.split('=')[1];
    if (arg.startsWith('--collections=')) config.collections = arg.split('=')[1].split(',').map((v) => v.trim()).filter(Boolean);
    if (arg === '--dryRun') config.dryRun = true;
    if (arg.startsWith('--stripFields=')) {
      config.stripFields = arg
        .split('=')[1]
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
    }
  }

  return config;
}

function toTypedValue(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  if (/^-?\d+$/.test(trimmed)) return Number.parseInt(trimmed, 10);
  if (/^-?\d+\.\d+$/.test(trimmed)) return Number.parseFloat(trimmed);

  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

function sanitizeRow(row, stripFields) {
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    if (stripFields.includes(key)) continue;
    out[key] = toTypedValue(value);
  }
  return out;
}

async function readCsvRows(csvPath, stripFields) {
  const rows = [];

  await new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (data) => {
        rows.push(sanitizeRow(data, stripFields));
      })
      .on('end', resolve)
      .on('error', reject);
  });

  return rows;
}

async function writeCollection(db, collectionName, rows, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] ${collectionName}: ${rows.length} docs`);
    return;
  }

  const batchSize = 400;
  let written = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const batch = db.batch();

    for (const row of chunk) {
      const docRef = db.collection(collectionName).doc();
      batch.set(docRef, row);
    }

    await batch.commit();
    written += chunk.length;
    console.log(`${collectionName}: ${written}/${rows.length} documentos`);
  }
}

async function main() {
  const { credentials, csvDir, collections, dryRun, stripFields } = parseArgs();

  if (!credentials) {
    throw new Error('Defina --credentials=CAMINHO ou GOOGLE_APPLICATION_CREDENTIALS');
  }

  const credentialsPath = path.resolve(credentials);
  if (!fs.existsSync(credentialsPath)) {
    throw new Error(`Credenciais não encontradas: ${credentialsPath}`);
  }

  const csvDirPath = path.resolve(csvDir);
  if (!fs.existsSync(csvDirPath)) {
    throw new Error(`Pasta CSV não encontrada: ${csvDirPath}`);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  const db = admin.firestore();

  const csvFiles = fs
    .readdirSync(csvDirPath)
    .filter((name) => name.toLowerCase().endsWith('.csv'))
    .map((name) => ({
      name,
      collection: name.replace(/\.csv$/i, ''),
      fullPath: path.join(csvDirPath, name),
    }));

  const selected = collections.length
    ? csvFiles.filter((f) => collections.includes(f.collection))
    : csvFiles;

  if (!selected.length) {
    throw new Error('Nenhum CSV encontrado para importar');
  }

  console.log(`Importando ${selected.length} coleção(ões)...`);

  for (const file of selected) {
    const rows = await readCsvRows(file.fullPath, stripFields);
    await writeCollection(db, file.collection, rows, dryRun);
  }

  console.log('Migração concluída.');
}

main().catch((error) => {
  console.error('Falha na migração:', error.message);
  process.exit(1);
});
