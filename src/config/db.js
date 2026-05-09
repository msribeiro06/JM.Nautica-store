// src/config/db.js
// Suporta DATABASE_URL (Railway/produção) ou variáveis separadas (desenvolvimento local)

const { Pool } = require('pg');

let poolConfig;

if (process.env.DATABASE_URL) {
  // Produção — Railway fornece a DATABASE_URL completa
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
} else {
  // Desenvolvimento local — variáveis separadas do .env
  poolConfig = {
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME     || 'nautica_store',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl:      process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
}

const pool = new Pool(poolConfig);

pool.connect((err, client, release) => {
  if (err) {
    console.error('[DB] Erro ao conectar ao PostgreSQL:', err.message);
    process.exit(1);
  }
  release();
  console.log('[DB] PostgreSQL conectado com sucesso!');
});

async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`[DB] query(${duration}ms):`, text.substring(0, 80));
    return result;
  } catch (error) {
    console.error('[DB] Erro na query:', error.message);
    throw error;
  }
}

async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { query, transaction, pool };
