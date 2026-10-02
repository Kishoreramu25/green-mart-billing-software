const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

let supabase = null;

function getClient() {
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_ANON_KEY || '';
  if (url && key) {
    if (!supabase) {
      supabase = createClient(url, key, { auth: { persistSession: false } });
    }
    return supabase;
  }
  return null;
}

async function load() {
  const sb = getClient();
  if (!sb) throw new Error('Supabase is not configured. Please provide SUPABASE_URL and SUPABASE_ANON_KEY in .env');

  // Fetch all tables in parallel
  const [
    settingsRes,
    prodsRes,
    custsRes,
    billsRes,
    purchRes,
    expRes,
    mvRes,
    auditRes,
    closeRes
  ] = await Promise.all([
    sb.from('settings').select('*'),
    sb.from('products').select('*').order('id', { ascending: true }),
    sb.from('customers').select('*').order('id', { ascending: true }),
    sb.from('bills').select('*').order('t', { ascending: false }),
    sb.from('purchases').select('*').order('id', { ascending: false }),
    sb.from('expenses').select('*').order('id', { ascending: false }),
    sb.from('stock_movements').select('*').order('id', { ascending: false }).limit(300),
    sb.from('audit_logs').select('*').order('id', { ascending: false }).limit(200),
    sb.from('daily_closings').select('*')
  ]);

  if (settingsRes.error) console.error('Error loading settings:', settingsRes.error.message);
  if (prodsRes.error) console.error('Error loading products:', prodsRes.error.message);
  if (custsRes.error) console.error('Error loading customers:', custsRes.error.message);

  // Format Settings
  const set = {};
  for (const s of (settingsRes.data || [])) {
    let val = s.val;
    if (val === 'true') val = true;
    else if (val === 'false') val = false;
    else if (!isNaN(Number(val)) && val.trim() !== '') val = Number(val);
    else {
      try { val = JSON.parse(val); } catch (e) {}
    }
    set[s.key] = val;
  }

  // Format Closings
  const close = {};
  for (const c of (closeRes.data || [])) {
    close[c.day] = { open: +c.open || 0, cnt: c.cnt !== null ? +c.cnt : null };
  }

  return {
    set: Object.keys(set).length ? set : { shop: 'Green Mart', addr: 'Main Road, Your City', phone: '98xxxxxx00', gstin: '', pre: 'INV-', w: 58, auto: true },
    prods: (prodsRes.data || []).map(p => ({
      id: +p.id,
      name: p.name,
      code: p.code || '',
      bc: p.bc || '',
      cat: p.cat || '',
      unit: p.unit || 'pc',
      pp: +p.pp || 0,
      sp: +p.sp || 0,
      mrp: +p.mrp || 0,
      gst: +p.gst || 0,
      stock: +p.stock || 0,
      min: +p.min || 0,
      box: +p.box || 0
    })),
    custs: (custsRes.data || []).map(c => ({
      id: +c.id,
      name: c.name,
      mobile: c.mobile || '',
      bal: +c.bal || 0
    })),
    bills: (billsRes.data || []).map(b => ({
      no: b.no,
      t: b.t,
      cust: b.cust,
      sub: +b.sub || 0,
      disc: +b.disc || 0,
      gst: +b.gst || 0,
      total: +b.total || 0,
      pay: b.pay || {},
      cashier: b.cashier || 'Admin',
      ret: b.ret ? 1 : 0,
      retT: b.ret_t || null,
      items: b.items || []
    })),
    purch: (purchRes.data || []).map(p => ({
      t: p.t,
      s: p.s || '',
      i: p.i || '',
      n: p.n || '',
      q: +p.q || 0,
      tot: +p.tot || 0,
      st: p.st || ''
    })),
    exp: (expRes.data || []).map(e => ({
      t: e.t,
      cat: e.cat || '',
      amt: +e.amt || 0
    })),
    mv: (mvRes.data || []).map(m => ({
      t: m.t,
      pid: m.pid,
      qty: +m.qty || 0,
      why: m.why || ''
    })),
    audit: (auditRes.data || []).map(a => ({
      t: a.t,
      a: a.a || '',
      d: a.d || ''
    })),
    close
  };
}

async function save(data) {
  const sb = getClient();
  if (!sb) throw new Error('Supabase is not configured.');

  const parsed = typeof data === 'string' ? JSON.parse(data) : data;

  // 1. Settings
  if (parsed.set) {
    const settingsRows = Object.entries(parsed.set).map(([key, val]) => ({
      key,
      val: typeof val === 'object' ? JSON.stringify(val) : String(val)
    }));
    await sb.from('settings').upsert(settingsRows, { onConflict: 'key' });
  }

  // 2. Products
  if (Array.isArray(parsed.prods) && parsed.prods.length > 0) {
    const prodRows = parsed.prods.map(p => ({
      id: p.id,
      name: p.name,
      code: p.code || '',
      bc: p.bc || '',
      cat: p.cat || '',
      unit: p.unit || 'pc',
      pp: +p.pp || 0,
      sp: +p.sp || 0,
      mrp: +p.mrp || 0,
      gst: +p.gst || 0,
      stock: +p.stock || 0,
      min: +p.min || 0,
      box: +p.box || 0
    }));
    await sb.from('products').upsert(prodRows, { onConflict: 'id' });
  }

  // 3. Customers
  if (Array.isArray(parsed.custs) && parsed.custs.length > 0) {
    const custRows = parsed.custs.map(c => ({
      id: c.id,
      name: c.name,
      mobile: c.mobile || '',
      bal: +c.bal || 0
    }));
    await sb.from('customers').upsert(custRows, { onConflict: 'id' });
  }

  // 4. Bills
  if (Array.isArray(parsed.bills) && parsed.bills.length > 0) {
    const billRows = parsed.bills.map(b => ({
      no: b.no,
      t: b.t,
      cust: b.cust || 1,
      sub: +b.sub || 0,
      disc: +b.disc || 0,
      gst: +b.gst || 0,
      total: +b.total || 0,
      pay: b.pay || {},
      cashier: b.cashier || 'Admin',
      ret: b.ret ? 1 : 0,
      ret_t: b.retT || null,
      items: b.items || []
    }));
    await sb.from('bills').upsert(billRows, { onConflict: 'no' });
  }

  // 5. Purchases
  if (Array.isArray(parsed.purch) && parsed.purch.length > 0) {
    const existing = await sb.from('purchases').select('t, n, q');
    const existingKeys = new Set((existing.data || []).map(x => `${x.t}_${x.n}_${x.q}`));
    const newRows = parsed.purch.filter(p => !existingKeys.has(`${p.t}_${p.n}_${p.q}`)).map(p => ({
      t: p.t,
      s: p.s || '',
      i: p.i || '',
      n: p.n || '',
      q: +p.q || 0,
      tot: +p.tot || 0,
      st: p.st || ''
    }));
    if (newRows.length > 0) {
      await sb.from('purchases').insert(newRows);
    }
  }

  // 6. Expenses
  if (Array.isArray(parsed.exp) && parsed.exp.length > 0) {
    const existing = await sb.from('expenses').select('t, cat, amt');
    const existingKeys = new Set((existing.data || []).map(x => `${x.t}_${x.cat}_${x.amt}`));
    const newRows = parsed.exp.filter(e => !existingKeys.has(`${e.t}_${e.cat}_${e.amt}`)).map(e => ({
      t: e.t,
      cat: e.cat || '',
      amt: +e.amt || 0
    }));
    if (newRows.length > 0) {
      await sb.from('expenses').insert(newRows);
    }
  }

  // 7. Stock Movements
  if (Array.isArray(parsed.mv) && parsed.mv.length > 0) {
    const existing = await sb.from('stock_movements').select('t, pid, qty');
    const existingKeys = new Set((existing.data || []).map(x => `${x.t}_${x.pid}_${x.qty}`));
    const newRows = parsed.mv.filter(m => !existingKeys.has(`${m.t}_${m.pid}_${m.qty}`)).slice(0, 50).map(m => ({
      t: m.t,
      pid: +m.pid,
      qty: +m.qty || 0,
      why: m.why || ''
    }));
    if (newRows.length > 0) {
      await sb.from('stock_movements').insert(newRows);
    }
  }

  // 8. Audit Logs
  if (Array.isArray(parsed.audit) && parsed.audit.length > 0) {
    const existing = await sb.from('audit_logs').select('t, a, d');
    const existingKeys = new Set((existing.data || []).map(x => `${x.t}_${x.a}_${x.d}`));
    const newRows = parsed.audit.filter(a => !existingKeys.has(`${a.t}_${a.a}_${a.d}`)).slice(0, 50).map(a => ({
      t: a.t,
      a: a.a || '',
      d: a.d || ''
    }));
    if (newRows.length > 0) {
      await sb.from('audit_logs').insert(newRows);
    }
  }

  // 9. Daily Closings
  if (parsed.close && typeof parsed.close === 'object') {
    const closeRows = Object.entries(parsed.close).map(([day, c]) => ({
      day,
      open: +c.open || 0,
      cnt: c.cnt !== null && c.cnt !== undefined ? +c.cnt : null
    }));
    if (closeRows.length > 0) {
      await sb.from('daily_closings').upsert(closeRows, { onConflict: 'day' });
    }
  }

  return true;
}

module.exports = {
  load,
  save,
  getClient,
  isConfigured: () => {
    return !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
  }
};
