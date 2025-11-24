// scripts/init-db.mjs
import 'dotenv/config';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL missing');
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  connect_timeout: 10,
});

try {
  // Şemayı ve extension'ı oluştur
  await sql`create schema if not exists app`;
  await sql`create extension if not exists pgcrypto`;
  console.log('✅ app schema & pgcrypto ready');
} catch (e) {
  console.error('❌ init failed:', e);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
