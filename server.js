const express = require("express");
const Database = require("better-sqlite3");

const app = express();
const db = new Database("dashboard.db");

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:8080");
  next();
});

app.get("/api/finanzen", (req, res) => {
  const rows = db.prepare(`
    SELECT jahr, kategorie, konto, bezeichnung, wert
    FROM finanzen
  `).all();

  res.json({
    finanzen: rows
  });
});

app.listen(3000, () => {
  console.log("API läuft auf http://localhost:3000");
});