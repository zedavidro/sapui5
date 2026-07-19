/**
 * Auth.controller.js — Controller der Login-Seite
 * - Verwaltet das Eingabeformular (Benutzername/Passwort)
 * - Prüft die Zugangsdaten gegen das Backend (POST /api/login)
 * - Leitet nach erfolgreichem Login abhängig von der Rolle (Zugriffsrecht) auf die
 *   passende Startseite weiter: Präsidium (3), Fakultätsfinanzen (2) oder Lehrstuhlfinanzen (0/1)
 */
sap.ui.define([
	"de/unigoettingen/dashboardapp/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast"
], function (BaseController, JSONModel, MessageToast) {
	"use strict";

	return BaseController.extend("de.unigoettingen.dashboardapp.controller.Auth", {

		onInit: function () {
			// Leeres Login-Formular-Modell anlegen (an die Input-Felder im View gebunden)
			const oLoginModel = new JSONModel({
				username: "",
				password: ""
			});
			this.getView().setModel(oLoginModel, "login");

			// Bei jedem (erneuten) Aufruf der Login-Route wird onRouteMatched ausgeführt
			this.getRouter().getRoute("login").attachPatternMatched(this.onRouteMatched, this);
		},

		// Formularfelder leeren, z. B. wenn man nach dem Logout wieder auf der Login-Seite landet
		onRouteMatched: function () {
			const oModel = this.getView().getModel("login");
			if (oModel) {
				oModel.setProperty("/username", "");
				oModel.setProperty("/password", "");
			}
		},

		/**
		 * Wird durch Klick auf "Anmelden" oder Enter im Passwortfeld ausgelöst.
		 * - Prüft zunächst, ob beide Felder ausgefüllt sind
		 * - Schickt die Zugangsdaten per POST an das Backend (server.js, Port 3000)
		 * - Bei Erfolg: Nutzerdaten (inkl. Zugriffsrecht) global speichern und passend weiterleiten
		 * - Bei Fehler: Meldung vom Server anzeigen (falsches Passwort/Nutzername) bzw.
		 *   allgemeine Verbindungsfehler abfangen
		 */
		onLoginPress: function () {
			const oModel = this.getView().getModel("login");
			const sUsername = oModel.getProperty("/username");
			const sPassword = oModel.getProperty("/password");

			if (!sUsername || !sPassword) {
				MessageToast.show("Bitte geben Sie Benutzername und Passwort ein.");
				return;
			}

			fetch("http://localhost:3000/api/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					username: sUsername,
					password: sPassword
				})
			})
			.then(function(response) {
				return response.json();
			})
			.then(function(data) {
				if (data.success) {
					MessageToast.show("Login erfolgreich!");

					// Speichere den Benutzer inklusive Zugriffsrechte im globalen Component-Modell
					// - "userModel" ist auf Komponentenebene gesetzt und damit von JEDER Seite aus lesbar
					//   (z. B. für Rollenprüfungen in den einzelnen Controllern)
					const oUserModel = new JSONModel(data.user);
					this.getOwnerComponent().setModel(oUserModel, "userModel");

					// Landing-Page richtet sich nach den Zugriffsrechten:
					// Stufe 3 → Präsidium, Stufe 2 → Fakultätsfinanzen, sonst → Lehrstuhlfinanzen
					const iRole = data.user.zugriffsrechte;
					if (iRole >= 3) {
						this.getRouter().navTo("unifinanzen", { kategorie: encodeURIComponent("alle") });
					} else if (iRole === 2) {
						this.getRouter().navTo("fakultaetsfinanzen");
					} else {
						this.getRouter().navTo("finanzen");
					}
				} else {
					// Falscher Nutzername/Passwort: Meldung kommt direkt vom Server
					MessageToast.show(data.message || "Login fehlgeschlagen.");
				}
			}.bind(this))
			.catch(function() {
				// Server nicht erreichbar (z. B. node server.js läuft nicht)
				MessageToast.show("Fehler bei der Verbindung zum Server.");
			});
		}

	});
});
