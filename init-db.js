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
    PERNRCOD TEXT,
    SEQNR TEXT,
    STICHTAG TEXT,
    ERSTELLUNG TEXT,
    Monat TEXT,
    Jahr TEXT,
    TITEL TEXT,
    GESCH TEXT,
    PERSALTER TEXT,
    GBJAHR TEXT,
    GBLND TEXT,
    GBLNDX TEXT,
    NATIO TEXT,
    NATIOX TEXT,
    WERKS TEXT,
    PERSG TEXT,
    PERSG_TEXT TEXT,
    PERSK TEXT,
    PERSK_TEXT TEXT,
    ABKRS TEXT,
    VDSK1 TEXT,
    OTXT2 TEXT,
    ORGEH TEXT,
    ORGEH_SH TEXT,
    ORGEH_TEXT TEXT,
    PLANS TEXT,
    PLANS_SH TEXT,
    FAK_SH TEXT,
    FAK_TEXT TEXT,
    INST_SH TEXT,
    INST_TEXT TEXT,
    AMTSB TEXT,
    AMTSB_TEXT TEXT,
    WAHL_NHG TEXT,
    WAHL_NHG_T TEXT,
    KATEG TEXT,
    FIN_ART TEXT,
    VZAE TEXT,
    CTTXT TEXT,
    CTLTD TEXT,
    EINDT TEXT,
    KONDT TEXT,
    VBEDAT TEXT,
    WOSTD TEXT,
    BSGRD TEXT,
    TRFAR TEXT,
    TRFGR TEXT,
    TRFST TEXT,
    LFBGR TEXT,
    LFBGR_TEXT TEXT,
    DART TEXT,
    UDART TEXT,
    FIN_ZWECK TEXT,
    PROZENT TEXT,
    ABSCHL TEXT,
    JAHR_ABSCHL TEXT,
    HSNR TEXT,
    QUAL_POS TEXT
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS publikationen (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS konto (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  passwort_hash TEXT NOT NULL,
  Zugriffsrechte INTEGER NOT NULL
  )
`).run();

 db.prepare(`
    CREATE TABLE IF NOT EXISTS unifinanzen (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hauptkategorie TEXT NOT NULL,
      unterkategorie TEXT NOT NULL,
      jahr INTEGER NOT NULL,
      wert REAL NOT NULL
    )
  `).run();

/*const username = "merlin"; //Zugriffsrechte aktualisieren
const neueRechte = 3;

db.prepare(`
  UPDATE konto
  SET Zugriffsrechte = ?
  WHERE username = ?
`).run(neueRechte, username);

console.log(`Die Rechte für ${username} wurden auf ${neueRechte} gesetzt.`);


db.prepare("DROP TABLE IF EXISTS personal").run();
console.log("Die Tabelle 'personal' wurde komplett gelöscht!");*/