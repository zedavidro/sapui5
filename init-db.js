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
  
`).run(); //Erstellt die Tabelle, falls noch nicht vorhanden

db.prepare(`
  CREATE TABLE IF NOT EXISTS personal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    PERNRCOD TEXT NOT NULL,
    jahr INTEGER NOT NULL,
    PERSALTER INTEGER NOT NULL,
    GESCH TEXT NOT NULL,
    NATIOX TEXT NOT NULL,
    OTXT2 TEXT NOT NULL,
    FIN_ART TEXT NOT NULL,
    VZAE REAL NOT NULL,
    VBEDAT TEXT NOT NULL
  )
`).run();

const personalColumns = db.prepare("PRAGMA table_info(personal)").all();
const hasVBEDAT = personalColumns.some((column) => column.name === "VBEDAT");

if (!hasVBEDAT) {
  db.prepare(`
    ALTER TABLE personal ADD COLUMN VBEDAT TEXT
  `).run();
  console.log("VBEDAT wurd angelegt")
} //Hat VBEDAT einmalig hinzugefügt, darf aber nur einmal laufen
