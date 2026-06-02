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
      "PERNRCOD",
      "jahr",
      "PERSALTER",
      "GESCH",
      "NATIOX",
      "OTXT2",
      "FIN_ART",
      "VZAE",
      "VBEDAT"
    ],
    mapRow: function (row) {
      return {  //übernimmt die zeilen der JSON in die neuen Objekte mit richtigem Datentyp
        PERNRCOD: row.PERNRCOD,
        jahr: Number(row.Jahr),
        PERSALTER: row.PERSALTER,
        GESCH: row.GESCH,
        NATIOX: row.NATIOX,
        OTXT2: row.OTXT2,
        FIN_ART: row.FIN_ART,
        VZAE: row.VZAE,
        VBEDAT: row.VBEDAT
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
  const jsonPath = path.join(__dirname, config.fileName);  //pfad zur JSON
  const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const rows = data[config.jsonKey];

  if (!Array.isArray(rows)) {   //Falls rows kein Array ist, wird ein Fehler
    throw new Error(`${config.fileName} muss ein Array unter '${config.jsonKey}' enthalten.`);
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
