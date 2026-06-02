sap.ui.define([
	"de/unigoettingen/dashboardapp/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast"
], function (BaseController, JSONModel, MessageToast) {
	"use strict";

	return BaseController.extend("de.unigoettingen.dashboardapp.controller.Auth", {

		onInit: function () {
			var oLoginModel = new JSONModel({
				username: "",
				password: ""
			});
			this.getView().setModel(oLoginModel, "login");
		},

		onLoginPress: function () {
			var oModel = this.getView().getModel("login");
			var sUsername = oModel.getProperty("/username");
			var sPassword = oModel.getProperty("/password");

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
					// In der manifest.json heißt die Route fürs Dashboard "dashboard"
					this.getRouter().navTo("dashboard");
				} else {
					MessageToast.show(data.message || "Login fehlgeschlagen.");
				}
			}.bind(this))
			.catch(function(error) {
				MessageToast.show("Fehler bei der Verbindung zum Server.");
			});
		}

	});
});
