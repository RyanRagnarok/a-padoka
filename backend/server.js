const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'fake_key_para_nao_quebrar');
app.use(helmet());
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("ERRO: JWT_SECRET não definida no ambiente.");
  process.exit(1);
}

// Initialization script
async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
      );
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price NUMERIC(10, 2) NOT NULL,
        category VARCHAR(50) DEFAULT 'Outros',
        has_flavors BOOLEAN DEFAULT false,
        flavors VARCHAR(255)
      );
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(100),
        description TEXT
      );
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
        quantity INTEGER NOT NULL,
        total_price NUMERIC(10, 2) NOT NULL,
        payment_method VARCHAR(50),
        delivery_date DATE,
        delivery_time TIME,
        status VARCHAR(50) DEFAULT 'Pendente',
        flavor VARCHAR(100),
        discount NUMERIC(10, 2) DEFAULT 0,
        addition NUMERIC(10, 2) DEFAULT 0,
        addition_description TEXT,
        is_paid BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        description VARCHAR(255) NOT NULL,
        category VARCHAR(50) NOT NULL,
        type VARCHAR(20) NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS ingredientes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        unit VARCHAR(20) NOT NULL,
        cost_per_unit NUMERIC(10, 4) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS ficha_tecnica (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        ingredient_id INTEGER REFERENCES ingredientes(id) ON DELETE CASCADE,
        quantity NUMERIC(10, 4) NOT NULL
      );
    `);

    await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT \'Outros\';');
    await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS has_flavors BOOLEAN DEFAULT false;');
    await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS flavors VARCHAR(255);');
    await pool.query('ALTER TABLE clients ADD COLUMN IF NOT EXISTS description TEXT;');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_date DATE;');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_time TIME;');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT \'Pendente\';');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS flavor VARCHAR(100);');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount NUMERIC(10, 2) DEFAULT 0;');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS addition NUMERIC(10, 2) DEFAULT 0;');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS addition_description TEXT;');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL;');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false;');
    await pool.query('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS details JSONB;');
    
    // Check if users exist
    const { rows } = await pool.query('SELECT * FROM users');
    if (rows.length === 0) {
      const defaultPassword = await bcrypt.hash('123456', 10);
      await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', ['bruna', defaultPassword]);
      await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', ['ryan', defaultPassword]);
      await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', ['admin', defaultPassword]);
      console.log('Default users created.');
    } else {
      const adminRes = await pool.query('SELECT * FROM users WHERE username = $1', ['admin']);
      if (adminRes.rows.length === 0) {
        const defaultPassword = await bcrypt.hash('123456', 10);
        await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', ['admin', defaultPassword]);
        console.log('Admin user created.');
      }
    }
  } catch (err) {
    console.error('Error initializing DB:', err);
  }
}

initDb();

// Middleware to authenticate
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Routes
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (rows.length === 0) return res.status(400).json({ message: 'User not found' });
    
    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ message: 'Invalid password' });
    
    const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, username: user.username });
  } catch (err) {
    console.error('[ERRO]:', err);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

app.put('/api/users/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [req.user.username]);
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    
    const user = rows[0];
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) return res.status(400).json({ message: 'Senha atual incorreta' });
    
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedNewPassword, user.id]);
    res.json({ message: 'Senha alterada com sucesso!' });
  } catch (err) {
    console.error('[ERRO]:', err);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', db_time: result.rows[0].now, message: 'Backend conectado ao PostgreSQL!' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Products CRUD
app.get('/api/products', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM products ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error('[ERRO]:', err);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});
app.post('/api/products', authenticateToken, async (req, res) => {
  const { name, description, price, category, has_flavors, flavors } = req.body;
  try {
    const { rows } = await pool.query('INSERT INTO products (name, description, price, category, has_flavors, flavors) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [name, description, price, category || 'Outros', has_flavors || false, flavors || '']);
    res.json(rows[0]);
  } catch (err) {
    console.error('[ERRO]:', err);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});
app.delete('/api/products/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[ERRO]:', err);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

app.put('/api/products/:id', authenticateToken, async (req, res) => {
  const { name, description, price, category, has_flavors, flavors } = req.body;
  try {
    await pool.query(
      'UPDATE products SET name = $1, description = $2, price = $3, category = $4, has_flavors = $5, flavors = $6 WHERE id = $7',
      [name, description, price, category, has_flavors, flavors, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[ERRO]:', err);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// Clients CRUD
app.get('/api/clients', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM clients ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error('[ERRO]:', err);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});
app.post('/api/clients', authenticateToken, async (req, res) => {
  const { name, phone, email, description } = req.body;
  try {
    const { rows } = await pool.query('INSERT INTO clients (name, phone, email, description) VALUES ($1, $2, $3, $4) RETURNING *', [name, phone, email, description]);
    res.json(rows[0]);
  } catch (err) {
    console.error('[ERRO]:', err);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});
app.delete('/api/clients/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM clients WHERE id = $1', [req.params.id]);
    res.json({ message: 'Client deleted' });
  } catch (err) {
    console.error('[ERRO]:', err);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

app.get('/api/clients/:id/stats', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.name as product_name, o.flavor as order_flavor, SUM(o.quantity) as total_quantity
      FROM orders o
      JOIN products p ON o.product_id = p.id
      WHERE o.client_id = $1 AND o.status = 'Entregue'
      GROUP BY p.name, o.flavor
      ORDER BY total_quantity DESC
    `, [req.params.id]);
    res.json(rows);
  } catch (err) {
    console.error('[ERRO]:', err);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});
app.put('/api/clients/:id', authenticateToken, async (req, res) => {
  const { name, phone, email, description } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE clients SET name = $1, phone = $2, email = $3, description = $4 WHERE id = $5 RETURNING *',
      [name, phone, email, description, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('[ERRO]:', err);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// Orders CRUD
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT o.*, p.name as product_name, c.name as client_name
      FROM orders o 
      JOIN products p ON o.product_id = p.id 
      LEFT JOIN clients c ON o.client_id = c.id
      ORDER BY o.delivery_date ASC NULLS LAST, o.delivery_time ASC NULLS LAST, o.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('[ERRO]:', err);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

app.post('/api/orders', authenticateToken, async (req, res) => {
  const { product_id, client_id, quantity, total_price, payment_method, delivery_date, delivery_time, flavor, discount, addition, addition_description } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO orders (product_id, client_id, quantity, total_price, payment_method, delivery_date, delivery_time, status, flavor, discount, addition, addition_description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
      [product_id, client_id || null, quantity, total_price, payment_method, delivery_date, delivery_time, 'Pendente', flavor, discount || 0, addition || 0, addition_description || '']
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('[ERRO]:', err);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

app.put('/api/orders/:id', authenticateToken, async (req, res) => {
  const { product_id, quantity, flavor, discount, addition, addition_description, total_price, payment_method, delivery_date, delivery_time } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE orders SET 
        product_id = $1, 
        quantity = $2, 
        flavor = $3, 
        discount = $4, 
        addition = $5, 
        addition_description = $6, 
        total_price = $7, 
        payment_method = $8, 
        delivery_date = $9, 
        delivery_time = $10 
       WHERE id = $11 RETURNING *`,
      [product_id, quantity, flavor || null, discount || 0, addition || 0, addition_description || '', total_price, payment_method, delivery_date, delivery_time, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('[ERRO]:', err);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

app.put('/api/orders/:id/status', authenticateToken, async (req, res) => {
  const { status } = req.body;
  try {
    await pool.query('UPDATE orders SET status = $1 WHERE id = $2', [status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[ERRO]:', err);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

app.put('/api/orders/:id/paid', authenticateToken, async (req, res) => {
  const { is_paid } = req.body;
  try {
    await pool.query('UPDATE orders SET is_paid = $1 WHERE id = $2', [is_paid, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[ERRO]:', err);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

app.delete('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM orders WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[ERRO]:', err);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// Ingredients CRUD
app.get('/api/ingredientes', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM ingredientes ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    console.error('[ERRO]:', err);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

app.post('/api/ingredientes', authenticateToken, async (req, res) => {
  const { name, unit, cost_per_unit } = req.body;
  try {
    const { rows } = await pool.query('INSERT INTO ingredientes (name, unit, cost_per_unit) VALUES ($1, $2, $3) RETURNING *', [name, unit, cost_per_unit]);
    res.json(rows[0]);
  } catch (err) {
    console.error('[ERRO]:', err);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

app.put('/api/ingredientes/:id', authenticateToken, async (req, res) => {
  const { name, unit, cost_per_unit } = req.body;
  try {
    await pool.query('UPDATE ingredientes SET name = $1, unit = $2, cost_per_unit = $3 WHERE id = $4', [name, unit, cost_per_unit, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[ERRO]:', err);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

app.delete('/api/ingredientes/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM ingredientes WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[ERRO]:', err);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// Ficha Tecnica
app.get('/api/products/:id/ficha-tecnica', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT f.id, f.ingredient_id, f.quantity, i.name as ingredient_name, i.unit, i.cost_per_unit 
      FROM ficha_tecnica f
      JOIN ingredientes i ON f.ingredient_id = i.id
      WHERE f.product_id = $1
    `, [req.params.id]);
    
    const total_cost = rows.reduce((acc, curr) => acc + (parseFloat(curr.quantity) * parseFloat(curr.cost_per_unit)), 0);
    
    res.json({ ingredients: rows, total_cost });
  } catch (err) {
    console.error('[ERRO]:', err);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

app.post('/api/products/:id/ficha-tecnica', authenticateToken, async (req, res) => {
  const { ingredients } = req.body; // array of { ingredient_id, quantity }
  const product_id = req.params.id;
  try {
    await pool.query('BEGIN');
    await pool.query('DELETE FROM ficha_tecnica WHERE product_id = $1', [product_id]);
    
    for (const item of ingredients) {
      await pool.query('INSERT INTO ficha_tecnica (product_id, ingredient_id, quantity) VALUES ($1, $2, $3)', [product_id, item.ingredient_id, item.quantity]);
    }
    
    await pool.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('[ERRO]:', err);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// Transactions (Fluxo de Caixa)
app.get('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM transactions ORDER BY date DESC, created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('[ERRO]:', err);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

app.post('/api/transactions', authenticateToken, async (req, res) => {
  const { date, description, category, type, amount } = req.body;
  try {
    await pool.query(
      'INSERT INTO transactions (date, description, category, type, amount) VALUES ($1, $2, $3, $4, $5)',
      [date, description, category, type, amount]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('[ERRO]:', err);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

app.put('/api/transactions/:id', authenticateToken, async (req, res) => {
  const { date, description, category, type, amount } = req.body;
  try {
    await pool.query(
      'UPDATE transactions SET date = $1, description = $2, category = $3, type = $4, amount = $5 WHERE id = $6',
      [date, description, category, type, amount, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[ERRO]:', err);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

app.post('/api/finance/upload-receipt', authenticateToken, upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Nenhuma imagem enviada.' });
    }

    const imageParts = [{
      inlineData: {
        data: req.file.buffer.toString('base64'),
        mimeType: req.file.mimetype
      }
    }];

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
      Analise este cupom fiscal brasileiro. Extraia as informações e retorne ESTRITAMENTE no formato JSON, sem marcações markdown.
      A estrutura exata deve ser:
      {
        "fornecedor": "Nome do supermercado (ex: SONDA SUPERMERCADOS)",
        "data": "Data no formato YYYY-MM-DD",
        "valor_total": numero decimal com o total da nota (ex: 80.43),
        "itens": [
          { 
            "descricao": "Nome do produto", 
            "quantidade": "Quantidade extraída da nota com a unidade de medida (ex: 2UN, 1.5KG, 1)",
            "valor": numero decimal com o valor TOTAL do item 
          }
        ]
      }
    `;

    const result = await model.generateContent([prompt, ...imageParts]);
    const responseText = result.response.text();
    
    const cleanJson = responseText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    const extractedData = JSON.parse(cleanJson);

    const { rows } = await pool.query(
      'INSERT INTO transactions (date, description, category, type, amount, details) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [extractedData.data, extractedData.fornecedor, 'Insumo', 'Saída', extractedData.valor_total, JSON.stringify(extractedData.itens)]
    );

    res.json({ success: true, data: rows[0], message: 'Nota processada com sucesso!' });

  } catch (err) {
    console.error('[ERRO NA LEITURA DA NOTA]:', err);
    res.status(500).json({ message: 'Erro ao processar o cupom fiscal com a IA.' });
  }
});

app.delete('/api/transactions/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM transactions WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[ERRO]:', err);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// Finance (Agregação de DRE)
app.get('/api/finance', authenticateToken, async (req, res) => {
  try {
    // 1. Faturamento Bruto (Soma de Vendas)
    const revenueResult = await pool.query('SELECT SUM(total_price) as total FROM orders WHERE status = \'Entregue\' OR is_paid = true');
    const gross_revenue = parseFloat(revenueResult.rows[0].total) || 0;

    // 2. Despesas e Perdas
    const expensesResult = await pool.query(`
      SELECT category, description, type, amount
      FROM transactions
    `);
    
    let total_costs = 0;
    let total_waste = 0;
    const wasteMap = {};

    expensesResult.rows.forEach(row => {
      const val = parseFloat(row.amount);
      if (row.type === 'Saída') {
        if (row.category === 'Perda' || row.category === 'Desperdício') {
          total_waste += val;
          wasteMap[row.description] = (wasteMap[row.description] || 0) + val;
        } else {
          total_costs += val;
        }
      } else if (row.type === 'Entrada') {
        // If there's an manual entry as Entrada that isn't an order, add to gross revenue?
        // Let's keep it separate or add to gross revenue. The prompt says:
        // "Faturamento Bruto (Soma de orders ou Entradas)"
        // Let's add it to gross_revenue
      }
    });

    const revenueTxResult = await pool.query('SELECT SUM(amount) as total FROM transactions WHERE type = \'Entrada\'');
    const additional_revenue = parseFloat(revenueTxResult.rows[0].total) || 0;
    const total_gross_revenue = gross_revenue + additional_revenue;

    const net_profit = total_gross_revenue - total_costs - total_waste;

    const wasteByCategory = Object.keys(wasteMap).map(k => ({ name: k, value: wasteMap[k] })).sort((a,b) => b.value - a.value);

    // Receitas x Despesas por Mês (Linhas Duplas)
    const monthlyRevenue = await pool.query(`
      SELECT TO_CHAR(delivery_date, 'YYYY-MM') as month, SUM(total_price) as total
      FROM orders
      WHERE status = 'Entregue' OR is_paid = true
      GROUP BY month
    `);
    const monthlyExpenses = await pool.query(`
      SELECT TO_CHAR(date, 'YYYY-MM') as month, SUM(amount) as total
      FROM transactions
      WHERE type = 'Saída'
      GROUP BY month
    `);
    const monthlyTxRevenue = await pool.query(`
      SELECT TO_CHAR(date, 'YYYY-MM') as month, SUM(amount) as total
      FROM transactions
      WHERE type = 'Entrada'
      GROUP BY month
    `);

    const monthsMap = {};
    monthlyRevenue.rows.forEach(r => {
      if(r.month) monthsMap[r.month] = { name: r.month, receitas: parseFloat(r.total), despesas: 0 };
    });
    monthlyTxRevenue.rows.forEach(r => {
      if(r.month) {
        if (!monthsMap[r.month]) monthsMap[r.month] = { name: r.month, receitas: 0, despesas: 0 };
        monthsMap[r.month].receitas += parseFloat(r.total);
      }
    });
    monthlyExpenses.rows.forEach(r => {
      if(r.month) {
        if (!monthsMap[r.month]) monthsMap[r.month] = { name: r.month, receitas: 0, despesas: 0 };
        monthsMap[r.month].despesas = parseFloat(r.total);
      }
    });
    const byMonth = Object.values(monthsMap).sort((a,b) => a.name.localeCompare(b.name));

    // Top 10 Produtos
    const productResult = await pool.query(`
      SELECT 
        CASE 
          WHEN o.flavor IS NOT NULL AND TRIM(o.flavor) != '' THEN p.name || ' (' || TRIM(o.flavor) || ')'
          ELSE p.name 
        END as name, 
        SUM(o.total_price) as value, SUM(o.quantity) as quantity
      FROM orders o
      JOIN products p ON o.product_id = p.id
      WHERE o.status = 'Entregue' OR o.is_paid = true
      GROUP BY 1
      ORDER BY value DESC
      LIMIT 10
    `);

    // Todos os Produtos por Quantidade
    const allProductsResult = await pool.query(`
      SELECT 
        CASE 
          WHEN o.flavor IS NOT NULL AND TRIM(o.flavor) != '' THEN p.name || ' (' || TRIM(o.flavor) || ')'
          ELSE p.name 
        END as name, 
        SUM(o.quantity) as quantity
      FROM orders o
      JOIN products p ON o.product_id = p.id
      WHERE o.status = 'Entregue' OR o.is_paid = true
      GROUP BY 1
      ORDER BY quantity DESC
    `);
    // Receitas por Dia (Faturamento Diário)
    const dailyRevenueResult = await pool.query(`
      SELECT TO_CHAR(delivery_date, 'YYYY-MM-DD') as date, SUM(total_price) as total
      FROM orders
      WHERE status = 'Entregue' OR is_paid = true
      GROUP BY date
    `);
    const dailyTxRevenueResult = await pool.query(`
      SELECT TO_CHAR(date, 'YYYY-MM-DD') as date, SUM(amount) as total
      FROM transactions
      WHERE type = 'Entrada'
      GROUP BY date
    `);

    const dailyMap = {};
    dailyRevenueResult.rows.forEach(r => {
      if(r.date) dailyMap[r.date] = { date: r.date, total: parseFloat(r.total) };
    });
    dailyTxRevenueResult.rows.forEach(r => {
      if(r.date) {
        if (!dailyMap[r.date]) dailyMap[r.date] = { date: r.date, total: 0 };
        dailyMap[r.date].total += parseFloat(r.total);
      }
    });
    const byDay = Object.values(dailyMap).sort((a,b) => a.date.localeCompare(b.date));

    // Average Cost by Category (Theoretical from Ficha Tecnica)
    const categoryCostResult = await pool.query(`
      SELECT p.category, 
             AVG(
               COALESCE((
                 SELECT SUM(f.quantity * i.cost_per_unit)
                 FROM ficha_tecnica f
                 JOIN ingredientes i ON f.ingredient_id = i.id
                 WHERE f.product_id = p.id
               ), 0)
             ) as avg_cost
      FROM products p
      GROUP BY p.category
    `);
    const byCategoryCost = categoryCostResult.rows.map(row => ({ name: row.category, cost: parseFloat(row.avg_cost) }));

    res.json({
      gross_revenue: total_gross_revenue,
      total_costs,
      total_waste,
      net_profit,
      wasteByCategory,
      byMonth,
      byProduct: productResult.rows.map(row => ({ name: row.name, value: parseFloat(row.value), quantity: parseInt(row.quantity) })),
      allProducts: allProductsResult.rows.map(row => ({ name: row.name, quantity: parseInt(row.quantity) })),
      byDay,
      byCategoryCost
    });
  } catch (err) {
    console.error('[ERRO]:', err);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
