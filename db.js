const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'inventory.db');

function getDb() {
  return new DatabaseSync(DB_PATH);
}

function initDb(force = false) {
  if (force && fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      stock INTEGER NOT NULL,
      price REAL NOT NULL,
      date TEXT NOT NULL
    );
  `);

  const count = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
  if (count === 0) {
    const seed = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'seed.json'), 'utf8'));
    const insUser = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
    const insProd = db.prepare('INSERT INTO products (name, category, stock, price, date) VALUES (?, ?, ?, ?, ?)');
    for (const u of seed.users) insUser.run(u.username, u.password, u.role);
    for (const p of seed.products) insProd.run(p.name, p.category, p.stock, p.price, p.date);
    console.log(`Seed cargado: ${seed.products.length} productos, ${seed.users.length} usuarios.`);
  } else {
    console.log(`DB ya tiene ${count} productos, no se reseed.`);
  }
  db.close();
}

module.exports = { getDb, initDb };
