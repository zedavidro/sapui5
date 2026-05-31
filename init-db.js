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
  
`).run(); //Erstellt die Tsabelle, falls noch nicht vorhanden

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
    VZAE REAL NOT NULL
  )
`).run();
