const Database = require("better-sqlite3");

const db = new Database("dashboard.db");

db.prepare(`
  CREATE TABLE IF NOT EXISTS finanzen (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jahr INTEGER NOT NULL,
    kategorie TEXT NOT NULL,
    konto TEXT,
    bezeichnung TEXT,
    wert REAL NOT NULL
  )
`).run();

console.log("Datenbank angelegt: dashboard.db");
