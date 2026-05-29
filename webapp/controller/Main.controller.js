sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
  "use strict";

  return Controller.extend("de.unigoettingen.dashboardapp.controller.Main", {
    onNavBack: function () {
      this.getOwnerComponent().getRouter().navTo("start");
    },

    onInit: function () {
      this._selectedYear = "2024";
      this._loadAndUpdate();
    },

    formatEuro: function (value) {
      if (value === null || value === undefined || isNaN(value)) {
        return "";
      }

      return value.toFixed(2) + " \u20ac";
    },

    onYearChange: function (oEvent) {
      this._selectedYear = oEvent.getSource().getSelectedKey();
      this._loadAndUpdate();
    },

    _loadAndUpdate: function () {
      const oModel = new JSONModel();
      oModel.loadData("http://localhost:3000/api/finanzen");

      oModel.attachRequestCompleted(() => {
        let totalCosts = 0;
        let totalRevenue = 0;
        let total = 0;

        const data = oModel.getData().finanzen;
        const aggregated = {};

        data.forEach(item => {
          if (this._selectedYear !== "alle" && item.jahr != this._selectedYear) {
            return;
          }

          if (item.kategorie === "Ertr\u00e4ge & F\u00f6rderung") {
            totalRevenue += item.wert;
            return;
          }

          if (item.kategorie === "Gesamt") {
            total = item.wert;
            return;
          }

          const key = item.kategorie;

          if (!aggregated[key]) {
            aggregated[key] = 0;
          }

          aggregated[key] += item.wert;
          totalCosts += item.wert;
        });

        const costGroups = Object.keys(aggregated).map(key => {
          return {
            name: key,
            value: Math.abs(aggregated[key])
          };
        });

        this.getView().setModel(new JSONModel({
          costGroups: costGroups
        }));

        this.getView().setModel(new JSONModel({
          costGroups: costGroups,
          kpis: {
            costs: totalCosts,
            revenue: totalRevenue * (-1),
            result: total * (-1)
          }
        }), "dashboard");
      });
    }
  });
});
