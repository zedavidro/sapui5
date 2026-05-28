sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
  "use strict";

  return Controller.extend("de.unigoettingen.dashboardapp.controller.Main", {
	
	onInit: function () {

  	this._selectedYear = "2024";

  	this._loadAndUpdate();

	},

  formatEuro: function (value) {
  if (value === null || value === undefined || isNaN(value)) {
    return "";
  }

  return value.toFixed(2) + " €";
},

	onYearChange: function (oEvent) {

    	this._selectedYear = oEvent.getSource().getSelectedKey();

    	this._loadAndUpdate();

	},

    _loadAndUpdate: function () {
      
	    const oModel = new JSONModel();
      oModel.loadData("model/finanzen.json");

      oModel.attachRequestCompleted(() => {
        let totalCosts = 0;
        let totalRevenue = 0;
        let total = 0;

        const data = oModel.getData().finanzen;

        // 1. Kategorie aggregieren
        const aggregated = {};

        data.forEach(item => {

		  if (this._selectedYear !== "alle" && item.jahr != this._selectedYear) {
    		return;
  		  }		
          // Erträge und Förderung müssen in Bar Chart
          if (item.kategorie === "Erträge & Förderung") {
            totalRevenue += item.wert;
            return;
          }

          if(item.kategorie === "Gesamt") {
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

        // 2. in Pie Chart Format umwandeln
        const costGroups = Object.keys(aggregated).map(key => {
          return {
            name: key,
            value: Math.abs(aggregated[key]) // optional: negative Werte vermeiden
          };
        });

        // 3. neues Model setzen (für Chart)
        const chartModel = new JSONModel({
          costGroups: costGroups
        });

        this.getView().setModel(chartModel);
        this.getView().setModel(new JSONModel({
          costGroups: costGroups,
          kpis: {
            costs: totalCosts,
            revenue: totalRevenue*(-1),
            result: total*(-1)
          }
        }), "dashboard"
        );
    	});

    }

  });
});
