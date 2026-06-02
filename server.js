const express = require("express");
const Database = require("better-sqlite3"); 
const app = express();
const bcrypt = require("bcryptjs")
const db = new Database("dashboard.db"); //lädt verschiedene Sachen Frameworks oder die Datenbank

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:8080"); //Erlaubt Port:8080 das abrufen von 3000 
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS"); //Get oder Post 
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { //preflight anfrage aufgrund der post-Methode -> Browser darf senden
    return res.sendStatus(204);
  }
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

//Server überprüft login-Daten
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Benutzername und Passwort muessen angegeben werden."
    });
  }

  const user = db.prepare(`
    SELECT id, username, passwort_hash
    FROM konto
    WHERE username = ?
  `).get(username);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Benutzername ist falsch."
    });
  }

  const passwordIsValid = bcrypt.compareSync(password, user.passwort_hash);

  if (!passwordIsValid) {
    return res.status(401).json({
      success: false,
      message: "Passwort ist falsch."
    });
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username
    }
  });
});

app.listen(3000, () => { //startet Backend-Server
  console.log("http://localhost:3000 läuft");
});
