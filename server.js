const express = require("express");
const Database = require("better-sqlite3"); 
const app = express();
const db = new Database("dashboard.db"); //lädt verschiedene Sachen Frameworks oder die Datenbank

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:8080"); //Erlaubt Port:8080 das abrufen von 3000 
  next();
});

app.get("/api/finanzen", (req, res) => { //Getter-Methode für Finanzdaten
  const rows = db.prepare(`
    SELECT jahr, kategorie, konto, bezeichnung, wert 
    FROM finanzen
  `).all();   //SQL-Abfrage gibt alle gefunden Daten wieder

  res.json({ //Daten der SQL Abfrage werden als JSON weitergegeben
    finanzen: rows
  });
});

app.get("/api/personal", (req, res) => {
  const rows = db.prepare(`
    SELECT PERNRCOD, jahr, PERSALTER, GESCH, NATIOX, OTXT2, FIN_ART, VZAE, VBEDAT
    FROM personal
  `).all();

  res.json({
    personal: rows
  });
});

app.get("/api/publikationen", (req, res) => {
  const rows = db.prepare(`
    SELECT year, type, title, status
    FROM publikationen
  `).all();

  res.json({
    publikationen: rows
  });
});

app.listen(3000, () => { //startet Backend-Server
  console.log("http://localhost:3000 läuft");
});
