const http = require('http');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const db = require('./db.js');
const supabaseDb = require('./supabaseDb.js');

// Load persisted Supabase credentials from Documents/BillingSoftware/Config/supabase.json if present
try {
  const cfgPath = path.join(db.getBaseDir(), 'Config', 'supabase.json');
  if (fs.existsSync(cfgPath)) {
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    if (cfg.url && cfg.key) {
      process.env.SUPABASE_URL = cfg.url;
      process.env.SUPABASE_ANON_KEY = cfg.key;
    }
  }
} catch (e) {}

const PORT = process.env.PORT || 3000;
const RENDERER_DIR = path.join(__dirname, 'renderer');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // JSON API Routes
  if (pathname.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    try {
      const isSupabase = supabaseDb.isConfigured();

      if (pathname === '/api/load' && req.method === 'GET') {
        let data = null;
        if (isSupabase) {
          try {
            data = await supabaseDb.load();
          } catch (e) {
            console.log('Supabase load fallback to SQLite:', e.message);
            data = db.load();
          }
        } else {
          data = db.load();
        }
        res.writeHead(200);
        return res.end(JSON.stringify(data));
      }

      if (pathname === '/api/save' && req.method === 'POST') {
        const body = await readBody(req);
        let success = true;
        try { db.save(body); } catch (e) {}

        if (isSupabase) {
          try {
            success = await supabaseDb.save(body);
          } catch (e) {
            console.error('Supabase save error:', e.message);
            success = true;
          }
        }
        res.writeHead(success ? 200 : 500);
        return res.end(JSON.stringify({ success }));
      }

      if (pathname === '/api/backup' && req.method === 'POST') {
        const body = await readBody(req);
        const { date, data } = JSON.parse(body);
        const success = db.backup(date, data);
        res.writeHead(success ? 200 : 500);
        return res.end(JSON.stringify({ success }));
      }

      if (pathname === '/api/list' && req.method === 'GET') {
        const list = db.listBackups();
        res.writeHead(200);
        return res.end(JSON.stringify(list));
      }

      if (pathname === '/api/read' && req.method === 'GET') {
        const date = parsedUrl.searchParams.get('date');
        const backupData = db.readBackup(date);
        res.writeHead(200);
        return res.end(backupData || JSON.stringify(null));
      }

      if (pathname === '/api/info' && req.method === 'GET') {
        res.writeHead(200);
        return res.end(JSON.stringify({
          database: isSupabase ? 'Supabase' : 'SQLite',
          connected: true,
          url: supabaseDb.getUrl(),
          localPath: db.getDbPath()
        }));
      }

      if (pathname === '/api/set-supabase' && req.method === 'POST') {
        const body = await readBody(req);
        const { url, key } = JSON.parse(body);
        if (url && key) {
          process.env.SUPABASE_URL = url.trim();
          process.env.SUPABASE_ANON_KEY = key.trim();
          supabaseDb.resetClient();

          try {
            const base = db.getBaseDir();
            const cfgPath = path.join(base, 'Config', 'supabase.json');
            fs.writeFileSync(cfgPath, JSON.stringify({ url: url.trim(), key: key.trim() }, null, 2));
          } catch (e) {
            console.log('Notice: Could not write Config/supabase.json:', e.message);
          }

          try {
            const envContent = `SUPABASE_URL=${url.trim()}\nSUPABASE_ANON_KEY=${key.trim()}\n`;
            fs.writeFileSync(path.join(process.cwd(), '.env'), envContent);
          } catch (e) {}

          res.writeHead(200);
          return res.end(JSON.stringify({ success: true, message: 'Supabase configured successfully' }));
        }
        res.writeHead(400);
        return res.end(JSON.stringify({ error: 'URL and Key required' }));
      }

      res.writeHead(404);
      return res.end(JSON.stringify({ error: 'Endpoint not found' }));
    } catch (apiErr) {
      console.error('API Error:', apiErr);
      res.writeHead(500);
      return res.end(JSON.stringify({ error: apiErr.message }));
    }
  }

  // Static File Serving
  let reqPath = pathname === '/' ? '/index.html' : pathname;
  let filePath = path.join(RENDERER_DIR, reqPath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(RENDERER_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Internal Server Error');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

db.init().then(() => {
  server.listen(PORT, () => {
    console.log(`Billing & POS Server running at http://localhost:${PORT}`);
    console.log(`Current Database Mode: ${supabaseDb.isConfigured() ? 'Supabase Cloud' : 'SQLite Local'}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
});
