<<<<<<< HEAD
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('inventario.db', (err) => {
  if (err) {
    console.error('db open err', err);
    process.exit(1);
  } else {
    console.log('db open ok');
  }
});

db.serialize(() => {
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
    if (err) {
      console.error('tables err', err);
    } else {
      console.log('tables', rows);
    }
  });

  db.get("SELECT count(*) as c FROM usuarios", (err, row) => {
    if (err) {
      console.error('usuarios err', err);
    } else {
      console.log('usuarios', row);
    }
  });
});

db.close();
=======
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('inventario.db', (err) => {
  if (err) {
    console.error('db open err', err);
    process.exit(1);
  } else {
    console.log('db open ok');
  }
});

db.serialize(() => {
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
    if (err) {
      console.error('tables err', err);
    } else {
      console.log('tables', rows);
    }
  });

  db.get("SELECT count(*) as c FROM usuarios", (err, row) => {
    if (err) {
      console.error('usuarios err', err);
    } else {
      console.log('usuarios', row);
    }
  });
});

db.close();
>>>>>>> 13e69faebb8a7ba55613f4029cae9fc038cf582b
