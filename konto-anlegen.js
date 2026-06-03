const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");

const db = new Database("dashboard.db");

const username = process.argv[2];
const password = process.argv[3];
const zugriffsrechte = process.argv[4] || 0; // Standardwert 0, falls nichts angegeben wird

if (!username || !password) {
  console.log("Bitte Benutzername und Passwort angeben:");
  console.log("node konto-anlegen.js <username> <passwort> [zugriffsrechte]");
  process.exit(1);
}

const passwordHash = bcrypt.hashSync(password, 10);

db.prepare(`
  INSERT INTO konto (username, passwort_hash, Zugriffsrechte)
  VALUES (?, ?, ?)
`).run(username, passwordHash, zugriffsrechte);

console.log(`Konto '${username}' mit Zugriffsrechten '${zugriffsrechte}' wurde angelegt.`);
