sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel"
], function (BaseController, JSONModel) {
  "use strict";

  return BaseController.extend("de.unigoettingen.dashboardapp.controller.Main", {

    onInit: function () {
      this._selectedYear = "2024";

      this.getOwnerComponent().getRouter().getRoute("finanzen").attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function () {
      const oUserModel = this.getOwnerComponent().getModel("userModel");
      const iRole = oUserModel ? oUserModel.getProperty("/zugriffsrechte") : 0;
      if (iRole < 1) {
        this.getOwnerComponent().getRouter().navTo("login");
        return;
      }
      this._loadAndUpdate();
    },

    // sap.viz hat keine deklarative Option, Data-Label-Text pro Serie einzufärben.
    // Die gerenderten <text>-Knoten sind serienweise gruppiert (erst alle Kosten-Punkte,
    // dann alle Erträge-, dann alle Ergebnis-Punkte je Jahr) statt zeilenweise wie im Datenmodell,
    // daher Gruppierung per Index-Drittel statt Modulo. Zusätzlich werden die Labels je Serie
    // vertikal versetzt, da nah beieinanderliegende Werte sich sonst überlappen.
    onTrendChartRenderComplete: function (oEvent) {
      const oChart = oEvent.getSource();
      const oDomRef = oChart.getDomRef();
      if (!oDomRef) {
        return;
      }
      const aColors = ["#aa0808", "#256f3a", "#131e29"];
      const aOffsets = [-18, 0, 18];
      const aLabels = oDomRef.querySelectorAll(".v-datalabel text");
      const iPerSeries = aLabels.length / aColors.length;
      aLabels.forEach((oText, i) => {
        const iSeries = Math.floor(i / iPerSeries);
        oText.setAttribute("fill", aColors[iSeries]);
        oText.setAttribute("transform", "translate(0, " + aOffsets[iSeries] + ")");
      });
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
      if (this._aFinanzenData) {
        this._updateAggregates();
        return;
      }
      if (this._pLoadPromise) {
        return;
      }

      this._pLoadPromise = fetch("http://localhost:3000/api/finanzen")
        .then(response => response.json())
        .then(data => {
          this._aFinanzenData = data.finanzen || [];
          this._updateAggregates();
        })
        .catch(err => {
          console.error("Error loading financial data:", err);
        })
        .finally(() => {
          this._pLoadPromise = null;
        });
    },

    _updateAggregates: function () {
      const data = this._aFinanzenData || [];
      let totalCosts = 0;
      let totalRevenue = 0;
      let total = 0;

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

      // Calculate yearly trend (always for 2024, 2025, 2026)
      const trendData = {};
      const targetYears = ["2024", "2025", "2026"];
      targetYears.forEach(y => {
        trendData[y] = {
          costs: 0,
          revenue: 0,
          result: 0
        };
      });

      data.forEach(item => {
        const y = String(item.jahr);
        if (!trendData[y]) {
          return;
        }

        if (item.kategorie === "Ertr\u00e4ge & F\u00f6rderung") {
          trendData[y].revenue += item.wert * (-1);
        } else if (item.kategorie === "Gesamt") {
          trendData[y].result += item.wert * (-1);
        } else {
          trendData[y].costs += item.wert;
        }
      });

      const yearlyTrend = [];
      targetYears.forEach(y => {
        yearlyTrend.push({ jahr: y, kategorie: "Kosten", wert: trendData[y].costs });
        yearlyTrend.push({ jahr: y, kategorie: "Ertr\u00e4ge", wert: trendData[y].revenue });
        yearlyTrend.push({ jahr: y, kategorie: "Ergebnis", wert: trendData[y].result });
      });

      let oDefaultModel = this.getView().getModel();
      if (!oDefaultModel) {
        oDefaultModel = new JSONModel();
        this.getView().setModel(oDefaultModel);
      }
      oDefaultModel.setData({
        costGroups: costGroups,
        yearlyTrend: yearlyTrend
      });

      let oDashboardModel = this.getView().getModel("dashboard");
      if (!oDashboardModel) {
        oDashboardModel = new JSONModel();
        this.getView().setModel(oDashboardModel, "dashboard");
      }
      oDashboardModel.setData({
        costGroups: costGroups,
        yearlyTrend: yearlyTrend,
        kpis: {
          costs: totalCosts,
          revenue: totalRevenue * (-1),
          result: total * (-1)
        }
      });
    }
  });
});
