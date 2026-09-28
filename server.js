const express = require('express');
const path = require('path');
const { getDb, initDb } = require('./db');

initDb(false);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- LOGIN ----------
// BUG-QA-01 (principiante): acepta "  admin  " con espacios (hace trim y deja entrar).
// BUG-QA-02 (principiante): mensaje de error engañoso, siempre dice "Usuario incorrecto"
//                           aunque el usuario exista y solo falle la clave.
app.post('/api/login', (req, res) => {
  let { username, password } = req.body || {};
  if (typeof username !== 'string') username = '';
  if (typeof password !== 'string') password = '';

  // Intencional: trim -> "  admin  " entra igual
  const u = username.trim();
  const p = password.trim();

  if (!u || !password) {
    return res.status(400).json({ ok: false, message: 'Usuario incorrecto' });
  }

  const db = getDb();
  const row = db.prepare('SELECT username, role FROM users WHERE username = ? AND password = ?').get(u, p);
  db.close();

  if (!row) {
    return res.status(401).json({ ok: false, message: 'Usuario incorrecto' });
  }
  // BUG-QA-ADV-01: no hay sesión real. El "token" no se valida en ningún endpoint.
  // Cualquiera puede llamar a /api/products sin estar logueado.
  return res.json({ ok: true, user: row, token: 'fake-token-' + Date.now() });
});

// ---------- PRODUCTS ----------
// BUG-QA-ADV-01 (avanzado): endpoints abiertos sin auth. /dashboard.html tampoco exige login.

app.get('/api/products', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM products ORDER BY id ASC').all();
  db.close();
  res.json(rows);
});

// BUG-QA-ADV-03 (avanzado): validación solo en frontend. El backend acepta
// stock negativo, precio negativo, nombre vacío y tipos incorrectos.
app.post('/api/products', (req, res) => {
  const { name, category, stock, price, date } = req.body || {};
  const db = getDb();
  const r = db.prepare(
    'INSERT INTO products (name, category, stock, price, date) VALUES (?, ?, ?, ?, ?)'
  ).run(String(name ?? ''), String(category ?? 'General'), Number(stock), Number(price), String(date ?? '2026-01-01'));
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(r.lastInsertRowid);
  db.close();
  res.status(201).json(row);
});

app.put('/api/products/:id', (req, res) => {
  const { name, category, stock, price, date } = req.body || {};
  const db = getDb();
  db.prepare('UPDATE products SET name=?, category=?, stock=?, price=?, date=? WHERE id=?')
    .run(String(name ?? ''), String(category ?? 'General'), Number(stock), Number(price), String(date ?? '2026-01-01'), req.params.id);
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  db.close();
  if (!row) return res.status(404).json({ message: 'No encontrado' });
  res.json(row);
});

app.delete('/api/products/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  db.close();
  res.json({ ok: true });
});

// BUG-QA-ADV-04 (avanzado, race condition / lost update): lee stock, espera 400ms, escribe.
// Si hay 2 ventas paralelas (doble clic rápido), ambas leen el mismo stock y una
// sobrescribe a la otra: solo descuenta 1 en vez de 2. Además no valida stock
// mínimo (puede quedar negativo).
app.post('/api/products/:id/sell', async (req, res) => {
  const qty = Number(req.body?.qty ?? 1);
  const db = getDb();
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!row) { db.close(); return res.status(404).json({ message: 'No encontrado' }); }
  const currentStock = row.stock;
  await new Promise(r => setTimeout(r, 400)); // ventana de carrera intencional
  const newStock = currentStock - qty;
  db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(newStock, req.params.id);
  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  db.close();
  res.json(updated);
});

app.get('/', (req, res) => res.redirect('/login.html'));

// Restablece la DB al seed inicial (usado por Configuración > Restablecer datos).
app.post('/api/reset', (req, res) => {
  try {
    initDb(true);
    const db = getDb();
    const p = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
    db.close();
    res.json({ ok: true, products: p });
  } catch (e) {
    res.status(500).json({ ok: false, message: 'No se pudo restablecer' });
  }
});

app.listen(PORT, () => {
  console.log(`QA Inventory Lab escuchando en http://localhost:${PORT}`);
  console.log('Usuarios demo: admin / admin123  |  vendedor / venta123');
});
