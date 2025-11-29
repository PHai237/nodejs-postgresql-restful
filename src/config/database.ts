import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || 'nodejspro',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '123456',
});

export default pool;
