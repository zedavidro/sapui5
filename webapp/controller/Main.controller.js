sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel"  //UI% wird geladen mit COntroller und JSONModel
], function (Controller, JSONModel) {
  "use strict";

  return Controller.extend("de.unigoettingen.dashboardapp.controller.Main", {
    onNavBack: function () { //Zurück-Button
      this.getOwnerComponent().getRouter().navTo("login");
    },

    onTabSelect: function (oEvent) {
      const sKey = oEvent.getParameter("key");
      this.getOwnerComponent().getRouter().navTo(sKey);
    },

    onInit: function () {
      this._selectedYear = "2024";
      this._loadAndUpdate();  //2024 wird beim ersten Laden angezeigt

      this.getOwnerComponent().getRouter().getRoute("finanzen").attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function () {
      const oUserModel = this.getOwnerComponent().getModel("userModel");
      const iRole = oUserModel ? oUserModel.getProperty("/zugriffsrechte") : 0;
      if (iRole < 3) {
        this.getOwnerComponent().getRouter().navTo("login");
      }
    },

    formatEuro: function (value) {
      if (value === null || value === undefined || isNaN(value)) {
        return "";
      }

      return value.toFixed(2) + " \u20ac"; //Werte werden auf 2 Nachkommastellen in € angezeigt
    },

    onYearChange: function (oEvent) {
      this._selectedYear = oEvent.getSource().getSelectedKey();
      this._loadAndUpdate(); //Reiter um Jahr zu wechseln
    },

    _loadAndUpdate: function () {
      const oModel = new JSONModel();
      oModel.loadData("http://localhost:3000/api/finanzen"); //Controller holt sich Finanzdaten aus Port 3000/Backend

      oModel.attachRequestCompleted(() => {
        let totalCosts = 0;
        let totalRevenue = 0;
        let total = 0;

        const data = oModel.getData().finanzen;
        const aggregated = {};

        data.forEach(item => {
          if (this._selectedYear !== "alle" && item.jahr != this._selectedYear) {
            return; //Leere Rückgabe, wenn existierendesJahr oder alle nicht angeklickt ist
          }

          if (item.kategorie === "Ertr\u00e4ge & F\u00f6rderung") { //totalRevenue wird um item erhöht
            totalRevenue += item.wert;
            return; 
          }

          if (item.kategorie === "Gesamt") { //Gesamtkosten
            total = item.wert;
            return;
          }

          const key = item.kategorie;

          if (!aggregated[key]) {
            aggregated[key] = 0;
          }

          aggregated[key] += item.wert;
          totalCosts += item.wert; //ALle anderen Gruppe ohne gegebenen Namen
        });

        const costGroups = Object.keys(aggregated).map(key => { //Für jedes Objekt aus aggregated wird ein objekt erstellt
          return {
            name: key,
            value: Math.abs(aggregated[key])
          };
        });

        this.getView().setModel(new JSONModel({ //kann eigentlich weg, muss dann in main.view korregiert werden
          costGroups: costGroups
        }));

        this.getView().setModel(new JSONModel({ //View nimmt sich costGroups
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
