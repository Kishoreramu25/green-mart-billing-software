const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

// Determine data directory (D:\BillingSoftware if D: drive exists, else Documents\BillingSoftware)
function getBaseDir() {
  const documents = process.env.USERPROFILE
    ? path.join(process.env.USERPROFILE, 'Documents')
    : path.join(process.env.HOME || '.', 'Documents');
  const base = fs.existsSync('D:\\') ? 'D:\\BillingSoftware' : path.join(documents, 'BillingSoftware');
  ['Data', 'Backup/Daily', 'Backup/Monthly', 'Invoices', 'Reports', 'Logs', 'Config']
    .forEach(d => fs.mkdirSync(path.join(base, ...d.split('/')), { recursive: true }));
  return base;
}

const baseDir = getBaseDir();
const dbFile = path.join(baseDir, 'Data', 'billing.sqlite');
const legacyJsonFile = path.join(baseDir, 'Data', 'billing.json');

let SQL = null;
let db = null;

function createTables(database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      val TEXT
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT,
      bc TEXT,
      cat TEXT,
      unit TEXT,
      pp REAL DEFAULT 0,
      sp REAL DEFAULT 0,
      mrp REAL DEFAULT 0,
      gst REAL DEFAULT 0,
      stock REAL DEFAULT 0,
      min REAL DEFAULT 0,
      box INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      mobile TEXT,
      bal REAL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS bills (
      no TEXT PRIMARY KEY,
      t TEXT NOT NULL,
      cust INTEGER,
      sub REAL DEFAULT 0,
      disc REAL DEFAULT 0,
      gst REAL DEFAULT 0,
      total REAL DEFAULT 0,
      pay TEXT,
      cashier TEXT,
      ret INTEGER DEFAULT 0,
      retT TEXT,
      items TEXT
    );
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      t TEXT NOT NULL,
      s TEXT,
      i TEXT,
      n TEXT,
      q REAL,
      tot REAL,
      st TEXT
    );
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      t TEXT NOT NULL,
      cat TEXT,
      amt REAL
    );
    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      t TEXT NOT NULL,
      pid INTEGER,
      qty REAL,
      why TEXT
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      t TEXT NOT NULL,
      a TEXT,
      d TEXT
    );
    CREATE TABLE IF NOT EXISTS daily_closings (
      day TEXT PRIMARY KEY,
      open REAL DEFAULT 0,
      cnt REAL
    );
  `);
}

function persistToDisk() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  const tmp = dbFile + '.tmp';
  fs.writeFileSync(tmp, buffer);
  fs.renameSync(tmp, dbFile);
}

function importFromJson(data) {
  if (!data) return;
  db.run('BEGIN TRANSACTION;');
  try {
    // Settings
    if (data.set) {
      const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, val) VALUES (?, ?);');
      for (const [k, v] of Object.entries(data.set)) {
        stmt.run([k, typeof v === 'object' ? JSON.stringify(v) : String(v)]);
      }
      stmt.free();
    }
    // Products
    if (Array.isArray(data.prods)) {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO products (id, name, code, bc, cat, unit, pp, sp, mrp, gst, stock, min, box)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);
      for (const p of data.prods) {
        stmt.run([p.id, p.name, p.code || '', p.bc || '', p.cat || '', p.unit || 'pc', +p.pp || 0, +p.sp || 0, +p.mrp || 0, +p.gst || 0, +p.stock || 0, +p.min || 0, +p.box || 0]);
      }
      stmt.free();
    }
    // Customers
    if (Array.isArray(data.custs)) {
      const stmt = db.prepare('INSERT OR REPLACE INTO customers (id, name, mobile, bal) VALUES (?, ?, ?, ?);');
      for (const c of data.custs) {
        stmt.run([c.id, c.name, c.mobile || '', +c.bal || 0]);
      }
      stmt.free();
    }
    // Bills
    if (Array.isArray(data.bills)) {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO bills (no, t, cust, sub, disc, gst, total, pay, cashier, ret, retT, items)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);
      for (const b of data.bills) {
        stmt.run([b.no, b.t, b.cust || 1, +b.sub || 0, +b.disc || 0, +b.gst || 0, +b.total || 0, JSON.stringify(b.pay || {}), b.cashier || 'Admin', b.ret ? 1 : 0, b.retT || null, JSON.stringify(b.items || [])]);
      }
      stmt.free();
    }
    // Purchases
    if (Array.isArray(data.purch)) {
      const stmt = db.prepare('INSERT INTO purchases (t, s, i, n, q, tot, st) VALUES (?, ?, ?, ?, ?, ?, ?);');
      for (const p of data.purch) {
        stmt.run([p.t, p.s || '', p.i || '', p.n || '', +p.q || 0, +p.tot || 0, p.st || '']);
      }
      stmt.free();
    }
    // Expenses
    if (Array.isArray(data.exp)) {
      const stmt = db.prepare('INSERT INTO expenses (t, cat, amt) VALUES (?, ?, ?);');
      for (const e of data.exp) {
        stmt.run([e.t, e.cat || '', +e.amt || 0]);
      }
      stmt.free();
    }
    // Stock Movements
    if (Array.isArray(data.mv)) {
      const stmt = db.prepare('INSERT INTO stock_movements (t, pid, qty, why) VALUES (?, ?, ?, ?);');
      for (const m of data.mv) {
        stmt.run([m.t, m.pid, +m.qty || 0, m.why || '']);
      }
      stmt.free();
    }
    // Audit
    if (Array.isArray(data.audit)) {
      const stmt = db.prepare('INSERT INTO audit_logs (t, a, d) VALUES (?, ?, ?);');
      for (const a of data.audit) {
        stmt.run([a.t, a.a || '', a.d || '']);
      }
      stmt.free();
    }
    // Closings
    if (data.close && typeof data.close === 'object') {
      const stmt = db.prepare('INSERT OR REPLACE INTO daily_closings (day, open, cnt) VALUES (?, ?, ?);');
      for (const [day, c] of Object.entries(data.close)) {
        stmt.run([day, +c.open || 0, c.cnt !== null && c.cnt !== undefined ? +c.cnt : null]);
      }
      stmt.free();
    }
    db.run('COMMIT;');
    persistToDisk();
  } catch (err) {
    db.run('ROLLBACK;');
    throw err;
  }
}

async function init() {
  if (db) return db;
  SQL = await initSqlJs();
  if (fs.existsSync(dbFile)) {
    const fileBuffer = fs.readFileSync(dbFile);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
    createTables(db);
    // If legacy billing.json exists, migrate data automatically
    if (fs.existsSync(legacyJsonFile)) {
      try {
        const jsonContent = JSON.parse(fs.readFileSync(legacyJsonFile, 'utf8'));
        importFromJson(jsonContent);
      } catch (err) {
        console.error('Migration error from billing.json:', err.message);
      }
    }
    persistToDisk();
  }
  return db;
}

function selectAll(query, params = []) {
  const stmt = db.prepare(query);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function load() {
  if (!db) return null;

  // Settings
  const settingsRows = selectAll('SELECT key, val FROM settings;');
  const set = {};
  for (const row of settingsRows) {
    let val = row.val;
    if (val === 'true') val = true;
    else if (val === 'false') val = false;
    else if (!isNaN(Number(val)) && val.trim() !== '') val = Number(val);
    else {
      try { val = JSON.parse(val); } catch (e) {}
    }
    set[row.key] = val;
  }

  // Products
  const prods = selectAll('SELECT * FROM products ORDER BY id ASC;');

  // Customers
  const custs = selectAll('SELECT * FROM customers ORDER BY id ASC;');

  // Bills
  const billRows = selectAll('SELECT * FROM bills ORDER BY datetime(t) DESC;');
  const bills = billRows.map(b => {
    let pay = {};
    let items = [];
    try { pay = JSON.parse(b.pay || '{}'); } catch (e) {}
    try { items = JSON.parse(b.items || '[]'); } catch (e) {}
    return {
      no: b.no,
      t: b.t,
      cust: b.cust,
      sub: b.sub,
      disc: b.disc,
      gst: b.gst,
      total: b.total,
      pay,
      cashier: b.cashier,
      ret: b.ret,
      retT: b.retT,
      items
    };
  });

  // Purchases
  const purch = selectAll('SELECT t, s, i, n, q, tot, st FROM purchases ORDER BY id DESC;');

  // Expenses
  const exp = selectAll('SELECT t, cat, amt FROM expenses ORDER BY id DESC;');

  // Stock movements
  const mv = selectAll('SELECT t, pid, qty, why FROM stock_movements ORDER BY id DESC LIMIT 300;');

  // Audit
  const audit = selectAll('SELECT t, a, d FROM audit_logs ORDER BY id DESC LIMIT 200;');

  // Closings
  const closeRows = selectAll('SELECT day, open, cnt FROM daily_closings;');
  const close = {};
  for (const c of closeRows) {
    close[c.day] = { open: c.open, cnt: c.cnt };
  }

  return {
    set: Object.keys(set).length ? set : { shop: 'Green Mart', addr: 'Main Road, Your City', phone: '98xxxxxx00', gstin: '', pre: 'INV-', w: 58, auto: true },
    prods,
    custs,
    bills,
    purch,
    exp,
    audit,
    mv,
    close
  };
}

function save(data) {
  if (!db) return false;
  const parsed = typeof data === 'string' ? JSON.parse(data) : data;

  db.run('BEGIN TRANSACTION;');
  try {
    // 1. Settings
    if (parsed.set) {
      const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, val) VALUES (?, ?);');
      for (const [k, v] of Object.entries(parsed.set)) {
        stmt.run([k, typeof v === 'object' ? JSON.stringify(v) : String(v)]);
      }
      stmt.free();
    }

    // 2. Products - sync table with current state
    if (Array.isArray(parsed.prods)) {
      db.run('DELETE FROM products;');
      const stmt = db.prepare(`
        INSERT INTO products (id, name, code, bc, cat, unit, pp, sp, mrp, gst, stock, min, box)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);
      for (const p of parsed.prods) {
        stmt.run([p.id, p.name, p.code || '', p.bc || '', p.cat || '', p.unit || 'pc', +p.pp || 0, +p.sp || 0, +p.mrp || 0, +p.gst || 0, +p.stock || 0, +p.min || 0, +p.box || 0]);
      }
      stmt.free();
    }

    // 3. Customers
    if (Array.isArray(parsed.custs)) {
      db.run('DELETE FROM customers;');
      const stmt = db.prepare('INSERT INTO customers (id, name, mobile, bal) VALUES (?, ?, ?, ?);');
      for (const c of parsed.custs) {
        stmt.run([c.id, c.name, c.mobile || '', +c.bal || 0]);
      }
      stmt.free();
    }

    // 4. Bills
    if (Array.isArray(parsed.bills)) {
      db.run('DELETE FROM bills;');
      const stmt = db.prepare(`
        INSERT INTO bills (no, t, cust, sub, disc, gst, total, pay, cashier, ret, retT, items)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);
      for (const b of parsed.bills) {
        stmt.run([b.no, b.t, b.cust || 1, +b.sub || 0, +b.disc || 0, +b.gst || 0, +b.total || 0, JSON.stringify(b.pay || {}), b.cashier || 'Admin', b.ret ? 1 : 0, b.retT || null, JSON.stringify(b.items || [])]);
      }
      stmt.free();
    }

    // 5. Purchases
    if (Array.isArray(parsed.purch)) {
      db.run('DELETE FROM purchases;');
      const stmt = db.prepare('INSERT INTO purchases (t, s, i, n, q, tot, st) VALUES (?, ?, ?, ?, ?, ?, ?);');
      for (const p of parsed.purch) {
        stmt.run([p.t, p.s || '', p.i || '', p.n || '', +p.q || 0, +p.tot || 0, p.st || '']);
      }
      stmt.free();
    }

    // 6. Expenses
    if (Array.isArray(parsed.exp)) {
      db.run('DELETE FROM expenses;');
      const stmt = db.prepare('INSERT INTO expenses (t, cat, amt) VALUES (?, ?, ?);');
      for (const e of parsed.exp) {
        stmt.run([e.t, e.cat || '', +e.amt || 0]);
      }
      stmt.free();
    }

    // 7. Stock Movements
    if (Array.isArray(parsed.mv)) {
      db.run('DELETE FROM stock_movements;');
      const stmt = db.prepare('INSERT INTO stock_movements (t, pid, qty, why) VALUES (?, ?, ?, ?);');
      for (const m of parsed.mv.slice(0, 300)) {
        stmt.run([m.t, m.pid, +m.qty || 0, m.why || '']);
      }
      stmt.free();
    }

    // 8. Audit logs
    if (Array.isArray(parsed.audit)) {
      db.run('DELETE FROM audit_logs;');
      const stmt = db.prepare('INSERT INTO audit_logs (t, a, d) VALUES (?, ?, ?);');
      for (const a of parsed.audit.slice(0, 200)) {
        stmt.run([a.t, a.a || '', a.d || '']);
      }
      stmt.free();
    }

    // 9. Closings
    if (parsed.close && typeof parsed.close === 'object') {
      db.run('DELETE FROM daily_closings;');
      const stmt = db.prepare('INSERT INTO daily_closings (day, open, cnt) VALUES (?, ?, ?);');
      for (const [day, c] of Object.entries(parsed.close)) {
        stmt.run([day, +c.open || 0, c.cnt !== null && c.cnt !== undefined ? +c.cnt : null]);
      }
      stmt.free();
    }

    db.run('COMMIT;');
    persistToDisk();

    // Also write a mirror JSON copy for compatibility / easy human inspection
    try {
      fs.writeFileSync(legacyJsonFile + '.tmp', typeof data === 'string' ? data : JSON.stringify(data, null, 2));
      fs.renameSync(legacyJsonFile + '.tmp', legacyJsonFile);
    } catch (e) {}

    return true;
  } catch (err) {
    db.run('ROLLBACK;');
    console.error('SQLite save error:', err);
    return false;
  }
}

function backup(date, jsonData) {
  if (!db) return false;
  const daily = path.join(baseDir, 'Backup', 'Daily', `billing_${date}.sqlite`);
  if (!fs.existsSync(daily)) {
    const data = db.export();
    fs.writeFileSync(daily, Buffer.from(data));

    // Keep last 30 daily backups
    const dailyDir = path.join(baseDir, 'Backup', 'Daily');
    const files = fs.readdirSync(dailyDir).filter(f => f.startsWith('billing_')).sort().reverse();
    files.slice(30).forEach(f => {
      try { fs.unlinkSync(path.join(dailyDir, f)); } catch (e) {}
    });
  }

  const month = date.slice(0, 7);
  const monthly = path.join(baseDir, 'Backup', 'Monthly', `billing_${month}.sqlite`);
  if (!fs.existsSync(monthly)) {
    const data = db.export();
    fs.writeFileSync(monthly, Buffer.from(data));
  }

  return true;
}

function listBackups() {
  const dailyDir = path.join(baseDir, 'Backup', 'Daily');
  if (!fs.existsSync(dailyDir)) return [];
  return fs.readdirSync(dailyDir)
    .filter(f => f.startsWith('billing_') && (f.endsWith('.sqlite') || f.endsWith('.json')))
    .map(f => f.slice(8, 18))
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort()
    .reverse();
}

function readBackup(date) {
  const dailyDir = path.join(baseDir, 'Backup', 'Daily');
  const sqliteFile = path.join(dailyDir, `billing_${date}.sqlite`);
  if (fs.existsSync(sqliteFile) && SQL) {
    const tempDb = new SQL.Database(fs.readFileSync(sqliteFile));
    // Load from tempDb
    const origDb = db;
    db = tempDb;
    const res = load();
    db = origDb;
    tempDb.close();
    return JSON.stringify(res);
  }
  const jsonFile = path.join(dailyDir, `billing_${date}.json`);
  if (fs.existsSync(jsonFile)) {
    return fs.readFileSync(jsonFile, 'utf8');
  }
  return null;
}

module.exports = {
  init,
  load,
  save,
  backup,
  listBackups,
  readBackup,
  getDbPath: () => dbFile,
  getBaseDir: () => baseDir
};
