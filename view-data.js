const db = require('./db.js');

(async () => {
  await db.init();
  const data = db.load();

  console.log('\n========================================');
  console.log('       BILLING & POS - DATABASE INFO     ');
  console.log('========================================');
  console.log(`Database File:  ${db.getDbPath()}`);
  console.log(`Data Directory: ${db.getBaseDir()}\n`);

  console.log('--- STORE SETTINGS ---');
  console.log(`Shop Name:    ${data.set.shop}`);
  console.log(`Address:      ${data.set.addr}`);
  console.log(`Phone:        ${data.set.phone}`);
  console.log(`Invoice Pre:  ${data.set.pre}\n`);

  console.log('--- PRODUCTS (' + data.prods.length + ') ---');
  console.table(data.prods.map(p => ({
    ID: p.id,
    Name: p.name,
    Category: p.cat,
    Stock: p.stock,
    Cost: '₹' + p.pp,
    Price: '₹' + p.sp,
    MRP: '₹' + p.mrp,
    GST: p.gst + '%'
  })));

  console.log('\n--- CUSTOMERS (' + data.custs.length + ') ---');
  console.table(data.custs.map(c => ({
    ID: c.id,
    Name: c.name,
    Mobile: c.mobile || 'N/A',
    Balance: '₹' + c.bal
  })));

  console.log('\n--- BILLS / INVOICES (' + data.bills.length + ') ---');
  if (data.bills.length === 0) {
    console.log('No bills created yet.');
  } else {
    console.table(data.bills.slice(0, 10).map(b => ({
      'Bill No': b.no,
      Date: new Date(b.t).toLocaleString('en-IN'),
      Items: b.items ? b.items.length : 0,
      Total: '₹' + b.total
    })));
  }

  const backups = db.listBackups();
  console.log('\n--- BACKUPS AVAILABLE (' + backups.length + ') ---');
  console.log(backups.length ? backups.join(', ') : 'No backups yet.');
  console.log('========================================\n');
})();
