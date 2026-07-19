/**
 * Fakultaetsfinanzen.controller.js — verwaister Controller (NICHT aktiv verwendet)
 * - Gehört zum gleichnamigen Platzhalter-View (Fakultaetsfinanzen.view.xml)
 * - Die Route "fakultaetsfinanzen" wird laut manifest.json auf den View "Paquin1" gemappt,
 *   nicht auf diesen View/Controller. Der eigentliche Fakultätsfinanzen-Bildschirm wird also
 *   über Paquin1.controller.js gesteuert (dort liegt auch die echte Rollenprüfung + alle Daten).
 * - Diese Datei bleibt aus einer früheren Prototyp-Version übrig; die Rollenprüfung unten
 *   hätte nur eine Wirkung, wenn dieser Controller/View jemals eingebunden würde.
 */
sap.ui.define([
	"de/unigoettingen/dashboardapp/controller/BaseController"
], function (BaseController) {
	"use strict";

	return BaseController.extend("de.unigoettingen.dashboardapp.controller.Fakultaetsfinanzen", {

		onInit: function () {
			// Reagiert auf die Route "fakultaetsfinanzen" (wird aber, wie oben beschrieben,
			// durch das tatsächliche Routing-Ziel "Paquin1" nie ausgelöst)
			this.getRouter().getRoute("fakultaetsfinanzen").attachMatched(this._onRouteMatched, this);
		},

		_onRouteMatched: function () {
			// Rollenprüfung: nur Zugriffsrecht 2 (Fakultät) oder 3 (Präsidium) erlaubt,
			// sonst zurück zur Login-Seite
			const oUserModel = this.getOwnerComponent().getModel("userModel");
			const iRole = oUserModel ? oUserModel.getProperty("/zugriffsrechte") : 0;
			// Nur Zugang 2 oder 3 erlaubt
			if (iRole < 2) {
				this.getOwnerComponent().getRouter().navTo("login");
			}
		}
	});
});
