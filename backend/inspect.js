const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: 'postgres://padoka_user:padoka_password@localhost:5432/padoka_db'
});

async function run() {
  try {
    const { rows } = await pool.query(`
      SELECT 
        id, 
        created_at, 
        created_at - INTERVAL '3 hours' as adjusted_time,
        TRIM(TO_CHAR(created_at - INTERVAL '3 hours', 'Day')) as day_name,
        total_price,
        status,
        delivery_date
      FROM orders
      ORDER BY id
    `);
    console.table(rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
