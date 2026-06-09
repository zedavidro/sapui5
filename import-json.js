const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const db = new Database("dashboard.db");

const importConfigs = { //Die Struktur der JSON und der neuen TAbelle wird heir beschrieben
    personal: {
    fileName: "personal.json",
    jsonKey: "personal",
    tableName: "personal",
    columns: [
      "PERNRCOD", "SEQNR", "STICHTAG", "ERSTELLUNG", "Monat", "Jahr", "TITEL", "GESCH", "PERSALTER", 
      "GBJAHR", "GBLND", "GBLNDX", "NATIO", "NATIOX", "WERKS", "PERSG", "PERSG_TEXT", "PERSK", 
      "PERSK_TEXT", "ABKRS", "VDSK1", "OTXT2", "ORGEH", "ORGEH_SH", "ORGEH_TEXT", "PLANS", "PLANS_SH", 
      "FAK_SH", "FAK_TEXT", "INST_SH", "INST_TEXT", "AMTSB", "AMTSB_TEXT", "WAHL_NHG", "WAHL_NHG_T", 
      "KATEG", "FIN_ART", "VZAE", "CTTXT", "CTLTD", "EINDT", "KONDT", "VBEDAT", "WOSTD", "BSGRD", 
      "TRFAR", "TRFGR", "TRFST", "LFBGR", "LFBGR_TEXT", "DART", "UDART", "FIN_ZWECK", "PROZENT", 
      "ABSCHL", "JAHR_ABSCHL", "HSNR", "QUAL_POS"
    ],
    mapRow: function (row) {
      return {
        PERNRCOD: row.PERNRCOD,
        SEQNR: row.SEQNR,
        STICHTAG: row.STICHTAG,
        ERSTELLUNG: row.ERSTELLUNG,
        Monat: row.Monat,
        Jahr: row.Jahr,
        TITEL: row.TITEL,
        GESCH: row.GESCH,
        PERSALTER: row.PERSALTER,
        GBJAHR: row.GBJAHR,
        GBLND: row.GBLND,
        GBLNDX: row.GBLNDX,
        NATIO: row.NATIO,
        NATIOX: row.NATIOX,
        WERKS: row.WERKS,
        PERSG: row.PERSG,
        PERSG_TEXT: row.PERSG_TEXT,
        PERSK: row.PERSK,
        PERSK_TEXT: row.PERSK_TEXT,
        ABKRS: row.ABKRS,
        VDSK1: row.VDSK1,
        OTXT2: row.OTXT2,
        ORGEH: row.ORGEH,
        ORGEH_SH: row.ORGEH_SH,
        ORGEH_TEXT: row.ORGEH_TEXT,
        PLANS: row.PLANS,
        PLANS_SH: row.PLANS_SH,
        FAK_SH: row.FAK_SH,
        FAK_TEXT: row.FAK_TEXT,
        INST_SH: row.INST_SH,
        INST_TEXT: row.INST_TEXT,
        AMTSB: row.AMTSB,
        AMTSB_TEXT: row.AMTSB_TEXT,
        WAHL_NHG: row.WAHL_NHG,
        WAHL_NHG_T: row.WAHL_NHG_T,
        KATEG: row.KATEG,
        FIN_ART: row.FIN_ART,
        VZAE: row.VZAE,
        CTTXT: row.CTTXT,
        CTLTD: row.CTLTD,
        EINDT: row.EINDT,
        KONDT: row.KONDT,
        VBEDAT: row.VBEDAT,
        WOSTD: row.WOSTD,
        BSGRD: row.BSGRD,
        TRFAR: row.TRFAR,
        TRFGR: row.TRFGR,
        TRFST: row.TRFST,
        LFBGR: row.LFBGR,
        LFBGR_TEXT: row.LFBGR_TEXT,
        DART: row.DART,
        UDART: row.UDART,
        FIN_ZWECK: row.FIN_ZWECK,
        PROZENT: row.PROZENT,
        ABSCHL: row.ABSCHL,
        JAHR_ABSCHL: row.JAHR_ABSCHL,
        HSNR: row.HSNR,
        QUAL_POS: row.QUAL_POS
      };
    }
  },
   publikationen: {
    fileName: "publikationen.json",
    jsonKey: "publikationen",
    tableName: "publikationen",
    columns: [
      "year",
      "type",
      "title",
      "status"
    ],
    mapRow: function (row) {
      return {
        year: Number(row.year),
        type: row.type,
        title: row.title,
        status: row.status
      };
    }
  },
    finanzen: {
    fileName: "Universitätsfinanzen.json",
    tableName: "unifinanzen",
    // tabelle wir flachgedrückt zu 4 spalten
    columns: ["hauptkategorie", "unterkategorie", "jahr", "wert"],
    customRead: function (data) {
      const rows = [];
      
      // 1. Schleife: Geht durch die 3 Hauptkategorien
      for (const hauptkategorie in data) {
        const unterkategorien = data[hauptkategorie];
        
        // 2. Schleife: Geht durch alle Unterkategorien
        for (const unterkategorie in unterkategorien) {
          const jahre = unterkategorien[unterkategorie];
          
          // 3. Schleife: Geht durch alle Jahre
          for (const jahr in jahre) {
            const wert = jahre[jahr];
            
            // Aus der Verschachtelung wird hier eine einfache flache Tabellenzeile gebaut
            rows.push({
              hauptkategorie: hauptkategorie,
              unterkategorie: unterkategorie,
              jahr: Number(jahr),
              wert: Number(wert)
            });
          }
        }
      }
      return rows;
    },
    mapRow: function (row) {
      return row; // Wurde bereits in customRead richtig aufgebaut
    },
    setupTable: function(db) {
       // Falls die Tabelle schon existiert, löschen und neu anlegen
       db.prepare(`DROP TABLE IF EXISTS ${this.tableName}`).run();
       db.prepare(`
         CREATE TABLE ${this.tableName} (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           hauptkategorie TEXT,
           unterkategorie TEXT,
           jahr INTEGER,
           wert REAL
         )
       `).run();
    }
  }
};

function getConfig(importName) {  //Methode falls etwas hinzugefügt wird, was der Code nicht kennt
  const config = importConfigs[importName];

  if (!config) {
    const names = Object.keys(importConfigs).join(", ");
    throw new Error(`Unbekannter Import '${importName}'. Verfuegbar: ${names}`);
  }

  return config;
}

function readRows(config) {
  const jsonPath = path.join(__dirname, config.fileName);
  const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

  // Wenn customRead existiert, dieses verwenden (wichtig für finanzen und personaldaten!)
  if (config.customRead) {
    return config.customRead(data);
  }
  
  // Nimm das Array direkt, oder suche unter dem jsonKey
  const rows = Array.isArray(data) ? data : data[config.jsonKey];

  if (!Array.isArray(rows)) {   
    throw new Error(`${config.fileName} muss ein Array sein oder ein Array unter '${config.jsonKey}' enthalten.`);
  }

  return rows;
}

function createInsertStatement(config) {  //Erzeugt Platzhalter, wo später die daten eingefügt werden
  const columns = config.columns.join(", ");
  const placeholders = config.columns.map((column) => `@${column}`).join(", ");

  return db.prepare(`
    INSERT INTO ${config.tableName} (${columns})
    VALUES (${placeholders})
  `);
}

function importJson(importName) {
  const config = getConfig(importName);
  const rows = readRows(config);
  const insert = createInsertStatement(config);

  const importRows = db.transaction((jsonRows) => {
    db.prepare(`DELETE FROM ${config.tableName}`).run();  //Verhindern von Duplikaten, wenn nochmal ausgeführt

    for (const row of jsonRows) {
      insert.run(config.mapRow(row));  //Einfügen in Tabelle 
    }
  });

  importRows(rows);
  console.log(`${rows.length} Datensaetze nach '${config.tableName}' importiert.`);
}

const importName = process.argv[2] || "personal";
importJson(importName);
