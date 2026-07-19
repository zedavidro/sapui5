/**
 * Main.controller.js — Controller der Lehrstuhlfinanzen-Seite (Route "finanzen")
 * - Lädt die Finanzdaten des Lehrstuhls von /api/finanzen (echte SQLite-Tabelle "finanzen")
 * - Aggregiert sie zu: KPI-Kacheln (Kosten/Erträge/Ergebnis), Kostenaufteilung nach Kategorie
 *   (Säulendiagramm) und Jahres-Trend 2024–2026 (Liniendiagramm)
 * - Enthält außerdem den Workaround für die Einfärbung der Trend-Diagramm-Beschriftungen,
 *   da sap.viz das nicht direkt unterstützt
 */
sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel"
], function (BaseController, JSONModel) {
  "use strict";

  return BaseController.extend("de.unigoettingen.dashboardapp.controller.Main", {

    onInit: function () {
      this._selectedYear = "2026";

      this.getOwnerComponent().getRouter().getRoute("finanzen").attachPatternMatched(this._onRouteMatched, this);
    },

    // Rollenprüfung (jede Rolle ab 0/1 darf hier rein) + initiales Laden der Finanzdaten
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
    //
    // - Wird direkt nach jedem (Neu-)Rendern des Liniendiagramms aufgerufen (renderComplete)
    // - aColors muss zur colorPalette in der View-XML passen, damit Linie und Label gleichfarbig sind
    // - aOffsets verschiebt Kosten-Labels nach oben, Ergebnis-Labels nach unten, damit sie
    //   sich bei ähnlichen Werten nicht überlappen
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

    // Hilfsfunktion zur Euro-Formatierung (aktuell ungenutzt im View, aber verfügbar)
    formatEuro: function (value) {
      if (value === null || value === undefined || isNaN(value)) {
        return "";
      }

      return value.toFixed(2) + " €"; //Werte werden auf 2 Nachkommastellen in € angezeigt
    },

    // Jahr gewechselt → Aggregation neu berechnen
    onYearChange: function (oEvent) {
      this._selectedYear = oEvent.getSource().getSelectedKey();
      this._loadAndUpdate(); //Reiter um Jahr zu wechseln
    },

    /**
     * Lädt die Rohdaten genau einmal (Cache in this._aFinanzenData) und ruft danach
     * immer nur noch die Neu-Aggregation auf; verhindert außerdem parallele Doppel-Requests.
     */
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

    /**
     * Berechnet aus den Rohdaten sowohl die (jahresgefilterte) Kostenaufteilung als auch
     * den (immer über alle 3 Jahre laufenden) Trend, und schreibt beides in zwei Modelle:
     * das Default-Modell (für die Diagramme) und "dashboard" (für die KPI-Kacheln).
     */
    _updateAggregates: function () {
      const data = this._aFinanzenData || [];
      let totalCosts = 0;
      let totalRevenue = 0;
      let total = 0;

      const aggregated = {};

      // --- Erster Durchlauf: nur für das gewählte Jahr (oder "alle") ---
      data.forEach(item => {
        if (this._selectedYear !== "alle" && item.jahr != this._selectedYear) {
          return;
        }

        // Sonderkategorie "Erträge & Förderung" fließt in die Erträge-Summe, nicht in die Kosten
        if (item.kategorie === "Erträge & Förderung") {
          totalRevenue += item.wert;
          return;
        }

        // Sonderkategorie "Gesamt" ist bereits das Saldo/Ergebnis, keine einzelne Kostenart
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

      // costGroups = Datensatz für das Säulendiagramm "Kostenaufteilung nach Kategorie"
      const costGroups = Object.keys(aggregated).map(key => {
        return {
          name: key,
          value: Math.abs(aggregated[key])
        };
      });

      // Calculate yearly trend (always for 2024, 2025, 2026)
      // - Der Trend läuft bewusst IMMER über alle drei Jahre, unabhängig von der Jahresauswahl oben
      const trendData = {};
      const targetYears = ["2024", "2025", "2026"];
      targetYears.forEach(y => {
        trendData[y] = {
          costs: 0,
          revenue: 0,
          result: 0
        };
      });

      // --- Zweiter Durchlauf: ungefiltert, für den 3-Jahres-Trend ---
      data.forEach(item => {
        const y = String(item.jahr);
        if (!trendData[y]) {
          return;
        }

        // Erträge und Ergebnis werden vorzeichenverkehrt in der Quelle geführt, daher *(-1)
        if (item.kategorie === "Erträge & Förderung") {
          trendData[y].revenue += item.wert * (-1);
        } else if (item.kategorie === "Gesamt") {
          trendData[y].result += item.wert * (-1);
        } else {
          trendData[y].costs += item.wert;
        }
      });

      // yearlyTrend = flacher Datensatz für das Liniendiagramm, 3 Kategorien x 3 Jahre = 9 Punkte
      const yearlyTrend = [];
      targetYears.forEach(y => {
        yearlyTrend.push({ jahr: y, kategorie: "Kosten", wert: trendData[y].costs });
        yearlyTrend.push({ jahr: y, kategorie: "Erträge", wert: trendData[y].revenue });
        yearlyTrend.push({ jahr: y, kategorie: "Ergebnis", wert: trendData[y].result });
      });

      // Default-Modell (ohne Namen): Datenquelle für die beiden Diagramme im View
      let oDefaultModel = this.getView().getModel();
      if (!oDefaultModel) {
        oDefaultModel = new JSONModel();
        this.getView().setModel(oDefaultModel);
      }
      oDefaultModel.setData({
        costGroups: costGroups,
        yearlyTrend: yearlyTrend
      });

      // Benanntes Modell "dashboard": zusätzlich mit den KPI-Werten für die drei Kacheln oben
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
