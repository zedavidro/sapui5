sap.ui.define([
	"de/unigoettingen/dashboardapp/controller/BaseController"
], function (BaseController) {
	"use strict";

	return BaseController.extend("de.unigoettingen.dashboardapp.controller.Fakultaetsfinanzen", {

		onInit: function () {
			this.getRouter().getRoute("fakultaetsfinanzen").attachMatched(this._onRouteMatched, this);
		},

		_onRouteMatched: function () {
			const oUserModel = this.getOwnerComponent().getModel("userModel");
			const iRole = oUserModel ? oUserModel.getProperty("/zugriffsrechte") : 0;
			// Nur Zugang 2 oder 3 erlaubt
			if (iRole < 2) {
				this.getOwnerComponent().getRouter().navTo("login");
			}
		}
	});
});
