/**
 * BaseController.js — gemeinsame Basisklasse für alle Controller der Anwendung
 * - Alle anderen Controller (App, Auth, Main, HR, PB, Paquin1, Paquin2, Unifinanzen, ...)
 *   erben von diesem Controller ("extend")
 * - Bündelt immer wieder benötigte Hilfsfunktionen (Router holen, Modell holen/setzen,
 *   Navigation, "Zurück"-Funktion), damit sie nicht in jedem Controller neu geschrieben werden müssen
 */
sap.ui.define(["sap/ui/core/mvc/Controller", "sap/ui/core/UIComponent", "sap/ui/core/routing/History"], function (Controller, UIComponent, History) {
	"use strict";

	return Controller.extend("de.unigoettingen.dashboardapp.controller.BaseController", {
		/**
		 * Convenience method to get the components' router instance.
		 * @returns {sap.m.routing.Router} The router instance
		 */
		// - Liefert den zentralen Router der App (für navTo/getRoute in allen Controllern)
		getRouter: function () {
			return UIComponent.getRouterFor(this);
		},

		/**
		 * Convenience method for getting the i18n resource bundle of the component.
		 * @returns {Promise<sap.base.i18n.ResourceBundle>} The i18n resource bundle of the component
		 */
		// - Zugriff auf die i18n-Textdatei (Internationalisierung), falls verwendet
		getResourceBundle: function () {
			const oModel = this.getOwnerComponent().getModel("i18n");
			return oModel.getResourceBundle();
		},

		/**
		 * Convenience method for getting the view model by name in every controller of the application.
		 * @param {string} [sName] The model name
		 * @returns {sap.ui.model.Model} The model instance
		 */
		// - Kurzform für this.getView().getModel(sName)
		getModel: function (sName) {
			return this.getView().getModel(sName);
		},

		/**
		 * Convenience method for setting the view model in every controller of the application.
		 * @param {sap.ui.model.Model} oModel The model instance
		 * @param {string} [sName] The model name
		 * @returns {sap.ui.core.mvc.Controller} The current base controller instance
		 */
		// - Kurzform für this.getView().setModel(oModel, sName); gibt sich selbst zurück (verkettbar)
		setModel: function (oModel, sName) {
			this.getView().setModel(oModel, sName);
			return this;
		},

		/**
		 * Convenience method for triggering the navigation to a specific target.
		 * @public
		 * @param {string} sName Target name
		 * @param {object} [oParameters] Navigation parameters
		 * @param {boolean} [bReplace] Defines if the hash should be replaced (no browser history entry) or set (browser history entry)
		 */
		// - Kurzform für this.getRouter().navTo(...); wird in fast allen Controllern zur Navigation genutzt
		navTo: function (sName, oParameters, bReplace) {
			this.getRouter().navTo(sName, oParameters, undefined, bReplace);
		},

		/**
		 * Convenience event handler for navigating back.
		 * It there is a history entry we go one step back in the browser history
		 * If not, it will replace the current entry of the browser history with the main route.
		 */
		// - Browser-"Zurück"-Verhalten: gibt es einen vorherigen Verlaufseintrag, dorthin zurück;
		//   sonst Ersatz-Sprung auf die Route "main" (ohne neuen Verlaufseintrag zu erzeugen)
		onNavBack: function () {
			const sPreviousHash = History.getInstance().getPreviousHash();
			if (sPreviousHash !== undefined) {
				window.history.go(-1);
			} else {
				this.getRouter().navTo("main", {}, undefined, true);
			}
		}
	});
});
