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

// Prepare database statements once at startup for optimal performance
const finanzenStmt = db.prepare(`
  SELECT jahr, kategorie, konto, bezeichnung, wert
  FROM finanzen
`);

const personalStmt = db.prepare(`
  SELECT PERNRCOD, jahr, PERSALTER, GESCH, NATIOX, OTXT2, FIN_ART, VZAE, VBEDAT
  FROM personal
`);

const publikationenStmt = db.prepare(`
  SELECT year, type, title, status
  FROM publikationen
`);

const userStmt = db.prepare(`
  SELECT id, username, passwort_hash, Zugriffsrechte
  FROM konto
  WHERE username = ?
`);

app.get("/api/finanzen", (req, res) => { //Getter-Methode für Finanzdaten
  try {
    const rows = finanzenStmt.all();   //SQL-Abfrage gibt alle gefunden Daten wieder
    res.json({ //Daten der SQL Abfrage werden als JSON weitergegeben
      finanzen: rows
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/unifinanzen", (req, res) => {
  const rows = db.prepare(`
    SELECT hauptkategorie, unterkategorie, jahr, wert
    FROM unifinanzen
    WHERE unterkategorie != 'davon Studienbeiträge' OR unterkategorie IS NULL
  `).all();

  res.json({
    unifinanzen: rows
  });
});

app.get("/api/unifinanzen/kategorien", (req, res) => {
  const rows = db.prepare(`
    SELECT DISTINCT hauptkategorie, unterkategorie
    FROM unifinanzen
    WHERE unterkategorie != 'davon Studienbeiträge' OR unterkategorie IS NULL
  `).all();

  const grouped = {};
  rows.forEach(r => {
    if (!grouped[r.hauptkategorie]) {
      grouped[r.hauptkategorie] = [];
    }
    if (r.unterkategorie && r.unterkategorie.trim() !== "") {
      if (!grouped[r.hauptkategorie].includes(r.unterkategorie)) {
         grouped[r.hauptkategorie].push(r.unterkategorie);
      }
    }
  });

  const result = Object.keys(grouped).map(hk => ({
    hauptkategorie: hk,
    unterkategorien: grouped[hk]
  }));

  res.json({
    kategorien: result
  });
});

app.get("/api/personal", (req, res) => {
  try {
    const rows = personalStmt.all();
    res.json({
      personal: rows
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/publikationen", (req, res) => {
  try {
    const rows = publikationenStmt.all();
    res.json({
      publikationen: rows
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
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

  try {
    const user = userStmt.get(username);

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
        username: user.username,
        zugriffsrechte: user.Zugriffsrechte
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(3000, () => { //startet Backend-Server
  console.log("http://localhost:3000 läuft");
});
