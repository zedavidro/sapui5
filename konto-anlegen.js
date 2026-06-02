const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");

const db = new Database("dashboard.db");

const username = process.argv[2];
const password = process.argv[3];

if (!username || !password) {
  console.log("Bitte Benutzername und Passwort angeben:");
  console.log("node konto-anlegen.js <username> <passwort>");
  process.exit(1);
}

const passwordHash = bcrypt.hashSync(password, 10);

db.prepare(`
  INSERT INTO konto (username, passwort_hash)
  VALUES (?, ?)
`).run(username, passwordHash);

console.log(`Konto '${username}' wurde angelegt`);