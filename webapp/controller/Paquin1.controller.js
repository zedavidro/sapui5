sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel"
], function (BaseController, JSONModel) {
  "use strict";

  return BaseController.extend("de.unigoettingen.dashboardapp.controller.Paquin1", {

    onInit: function () {
      this._selectedYear = new Date().getFullYear().toString();

      this.getOwnerComponent().getRouter().getRoute("fakultaetsfinanzen").attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function () {
      // Rollenprüfung: nur Zugang 2 oder 3 erlaubt
      const oUserModel = this.getOwnerComponent().getModel("userModel");
      const iRole = oUserModel ? oUserModel.getProperty("/zugriffsrechte") : 0;
      if (iRole < 2) {
        this.getOwnerComponent().getRouter().navTo("login");
        return;
      }
      this._updateKPIs();
    },

    onYearChange: function (oEvent) {
      this._selectedYear = oEvent.getSource().getSelectedKey();
      this._updateKPIs();
    },

    _updateKPIs: function () {
      // Platzhalter-Daten – hier später durch echte API-Daten ersetzen
      const oPlaceholderData = {
        "2024": {
          budget: 1250000,
          einnahmenIst: 1180000,
          ausgabenIst: 980000,
          obligo: 145000,
          restVerfuegbarkeit: 125000
        },
        "2025": {
          budget: 1320000,
          einnahmenIst: 1050000,
          ausgabenIst: 870000,
          obligo: 210000,
          restVerfuegbarkeit: 240000
        },
        "2026": {
          budget: 1400000,
          einnahmenIst: 620000,
          ausgabenIst: 510000,
          obligo: 380000,
          restVerfuegbarkeit: 510000
        }
      };

      const oYearData = oPlaceholderData[this._selectedYear] || oPlaceholderData["2026"];

      let oFakFinanzenModel = this.getView().getModel("fakFinanzen");
      if (!oFakFinanzenModel) {
        oFakFinanzenModel = new JSONModel();
        this.getView().setModel(oFakFinanzenModel, "fakFinanzen");
      }
      oFakFinanzenModel.setData({
        kpis: oYearData
      });
    }

  });
});
