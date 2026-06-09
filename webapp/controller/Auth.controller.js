sap.ui.define([
	"de/unigoettingen/dashboardapp/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast"
], function (BaseController, JSONModel, MessageToast) {
	"use strict";

	return BaseController.extend("de.unigoettingen.dashboardapp.controller.Auth", {

		onInit: function () {
			const oLoginModel = new JSONModel({
				username: "",
				password: ""
			});
			this.getView().setModel(oLoginModel, "login");
		},

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
					const oUserModel = new JSONModel(data.user);
					this.getOwnerComponent().setModel(oUserModel, "userModel");

					// Alle Nutzer mit Stufe 1, 2 und 3 starten standardmäßig auf dem Finanzen-Dashboard
					this.getRouter().navTo("finanzen");
				} else {
					MessageToast.show(data.message || "Login fehlgeschlagen.");
				}
			}.bind(this))
			.catch(function() {
				MessageToast.show("Fehler bei der Verbindung zum Server.");
			});
		}

	});
});
