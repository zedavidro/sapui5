sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
  "use strict";

  return Controller.extend("de.unigoettingen.dashboardapp.controller.HR", {

    // --- Navigation ---
    onNavBack: function () {
      this.getOwnerComponent().getRouter().navTo("login");
    },

    onTabSelect: function (oEvent) {
      const sKey = oEvent.getParameter("key");
      this.getOwnerComponent().getRouter().navTo(sKey);
    },

    onInit: function () {
      this._selectedYear = "2025";
      this._loadAndUpdate();

      this.getOwnerComponent().getRouter().getRoute("hr").attachPatternMatched(this._onRouteMatched, this);

      // Set scale and reference line properties programmatically to ensure X-Axis starts at year 2015 and shows today's date
      const oVizFrame = this.getView().byId("idContractEndRadar");
      if (oVizFrame) {
        const oToday = new Date();
        const iCurrentYear = oToday.getFullYear();
        const iCurrentMonth = oToday.getMonth();
        const iCurrentDay = oToday.getDate();
        const fTodayFractional = iCurrentYear + (iCurrentMonth + iCurrentDay / 30) / 12;
        const sDateLabel = "Heute (" + oToday.toLocaleDateString("de-DE", { month: "long", year: "numeric" }) + ")";

        oVizFrame.setVizProperties({
          plotArea: {
            dataPointStyle: {
              rules: [
                {
                  dataContext: { "VZÄ": "0.5" },
                  properties: {
                    color: "#f87171" // Coral/light red for 0.5 VZÄ
                  },
                  displayName: "Teilzeit (0.5 VZÄ)"
                },
                {
                  dataContext: { "VZÄ": "1.0" },
                  properties: {
                    color: "#818cf8" // Indigo for 1.0 VZÄ
                  },
                  displayName: "Vollzeit (1.0 VZÄ)"
                }
              ]
            },
            referenceLine: {
              line: {
                valueAxis: [
                  {
                    value: fTodayFractional,
                    visible: true,
                    size: 2,
                    type: "dashed",
                    color: "#ef4444",
                    label: {
                      text: sDateLabel,
                      visible: true
                    }
                  }
                ]
              }
            }
          },
          valueAxis: {
            scale: {
              fixedRange: true,
              minValue: 2015,
              maxValue: 2032
            },
            label: {
              formatString: "0"
            }
          }
        });
      }
    },

    _onRouteMatched: function () {
      const oUserModel = this.getOwnerComponent().getModel("userModel");
      const iRole = oUserModel ? oUserModel.getProperty("/zugriffsrechte") : 0;
      if (iRole < 2) {
        this.getOwnerComponent().getRouter().navTo("login");
      }
    },

    // --- Event-Handler für Dropdown ---
    onYearChange: function (oEvent) {
      this._selectedYear = oEvent.getSource().getSelectedKey();
      this._loadAndUpdate();
    },

    // --- Hauptlogik für Datenladung und Aggregation ---
    _loadAndUpdate: function () {
      const oModel = new JSONModel();
      oModel.loadData("http://localhost:3000/api/personal");

      oModel.attachRequestCompleted(() => {
        const data = oModel.getData().personal || oModel.getData();

        // Pauschale universitäre Jahros-Personalkostensätze für 1.0 VZÄ
        const costRates = {
          "Hochschullehrergruppe": 110000,
          "wissenschaftlicher Dienst": 78000,
          "techn. und Verwaltungsdienst": 58000,
          "Unbekannt": 65000
        };

        // Globale Zähler für KPIs (Gefiltert)
        let totalHeadcount = 0;
        let totalFTE = 0;
        let totalCost = 0;

        // Zwischenspeicher für Aggregationsobjekte
        const contractTimelineData = [];
        const aggregatedPie = {};
        const aggregatedTrend = {};
        const aggregatedStacked = {};
        const aggregatedContracts = {};
        const aggregatedAge = {};
        const aggCostFinArt = {};
        const aggCostOrg = {};

        if (Array.isArray(data)) {
          data.forEach(item => {

            const itemYear = item.jahr || item.Jahr;
            const yearStr = itemYear ? itemYear.toString() : "Unbekannt";
            const finArtKey = item.FIN_ART || "Unbekannt";
            const geschKey = item.GESCH || "Unbekannt";
            const orgKey = item.OTXT2 || "Unbekannt";
            const currentFte = parseFloat(item.VZAE) || 0;

            // Kostenberechnung für diesen Datensatz (VZÄ * Kostensatz der Gruppe)
            const calculatedCost = currentFte * (costRates[finArtKey] || costRates["Unbekannt"]);

            // ==========================================================
            // LOGIK (Ungefiltert - über alle Jahre hinweg)
            // ==========================================================

            // 1. Trend-Chart Aggregation
            if (!aggregatedTrend[yearStr]) {
              aggregatedTrend[yearStr] = { year: yearStr, headcount: 0, fte: 0 };
            }
            aggregatedTrend[yearStr].headcount += 1;
            aggregatedTrend[yearStr].fte += currentFte;

            // 2. Befristungs-Radar Aggregation
            if (item.VBEDAT) {
              const vbedatPrefix = item.VBEDAT.substring(0, 7); // "YYYY-MM"
              if (!aggregatedContracts[vbedatPrefix]) {
                aggregatedContracts[vbedatPrefix] = {};
              }
              if (!aggregatedContracts[vbedatPrefix][finArtKey]) {
                aggregatedContracts[vbedatPrefix][finArtKey] = 0;
              }
              aggregatedContracts[vbedatPrefix][finArtKey] += currentFte;
            }

            // ==========================================================
            // FILTERUNG: Ab hier nur Berechnungen für das gewählte Jahr
            // ==========================================================
            if (this._selectedYear !== "alle" && itemYear != this._selectedYear) {
              return;
            }

            if (item.VBEDAT) {
              const parts = item.VBEDAT.split("-");
              const year = parseInt(parts[0], 10);
              if (!isNaN(year) && year > 1900) {
                const month = parseInt(parts[1], 10) - 1;
                const day = parseInt(parts[2], 10);
                const fractionalYear = year + (month + day / 30) / 12;

                contractTimelineData.push({
                  empCode: item.PERNRCOD ? "Mitarbeiter " + item.PERNRCOD : "Mitarbeiter",
                  dateStr: item.VBEDAT,
                  vzaeStr: item.VZAE ? item.VZAE.toFixed(1) : "0.0",
                  finArt: finArtKey,
                  endYear: parseFloat(fractionalYear.toFixed(2))
                });
              }
            }

            // Globale KPI Werte erhöhen
            totalHeadcount += 1;
            totalFTE += currentFte;
            totalCost += calculatedCost;

            // 3. Klassisches Pie-Chart (Dienstartenverteilung)
            if (!aggregatedPie[finArtKey]) { aggregatedPie[finArtKey] = 0; }
            aggregatedPie[finArtKey] += 1;

            // 4. Gestapeltes Diagramm (Dienstart & Geschlecht)
            if (!aggregatedStacked[finArtKey]) { aggregatedStacked[finArtKey] = {}; }
            if (!aggregatedStacked[finArtKey][geschKey]) { aggregatedStacked[finArtKey][geschKey] = 0; }
            aggregatedStacked[finArtKey][geschKey] += 1;

            // 5. Altersstruktur-Histogramm
            const age = parseInt(item.PERSALTER, 10);
            if (!isNaN(age)) {
              let ageGroup = "";
              if (age < 30) ageGroup = "20-29 Jahre";
              else if (age < 40) ageGroup = "30-39 Jahre";
              else if (age < 50) ageGroup = "40-49 Jahre";
              else if (age < 60) ageGroup = "50-59 Jahre";
              else ageGroup = "60+ Jahre";

              if (!aggregatedAge[ageGroup]) { aggregatedAge[ageGroup] = {}; }
              if (!aggregatedAge[ageGroup][finArtKey]) { aggregatedAge[ageGroup][finArtKey] = 0; }
              aggregatedAge[ageGroup][finArtKey] += 1;
            }

            // 6. Controlling: Kosten nach Dienstart
            if (!aggCostFinArt[finArtKey]) { aggCostFinArt[finArtKey] = 0; }
            aggCostFinArt[finArtKey] += calculatedCost;

            // 7. Controlling: Kosten nach Struktureinheit / Abteilung
            if (!aggCostOrg[orgKey]) { aggCostOrg[orgKey] = 0; }
            aggCostOrg[orgKey] += calculatedCost;

          });
        }

        // ==========================================================
        // DATEN-TRANSFORMATIONEN FÜR DIE GRAFIKEN
        // ==========================================================

        const employeeGroups = Object.keys(aggregatedPie).map(key => {
          return { name: key, value: aggregatedPie[key] };
        });

        const timeSeriesData = Object.values(aggregatedTrend).sort((a, b) => a.year.localeCompare(b.year));

        const stackedData = [];
        Object.keys(aggregatedStacked).forEach(fKey => {
          Object.keys(aggregatedStacked[fKey]).forEach(gKey => {
            stackedData.push({ finArt: fKey, gesch: gKey, count: aggregatedStacked[fKey][gKey] });
          });
        });

        const contractEndData = [];
        Object.keys(aggregatedContracts).forEach(mKey => {
          Object.keys(aggregatedContracts[mKey]).forEach(fKey => {
            contractEndData.push({ month: mKey, finArt: fKey, fte: aggregatedContracts[mKey][fKey] });
          });
        });
        contractEndData.sort((a, b) => a.month.localeCompare(b.month));

        const ageStructureData = [];
        Object.keys(aggregatedAge).forEach(aKey => {
          Object.keys(aggregatedAge[aKey]).forEach(fKey => {
            ageStructureData.push({ ageGroup: aKey, finArt: fKey, headcount: aggregatedAge[aKey][fKey] });
          });
        });
        ageStructureData.sort((a, b) => a.ageGroup.localeCompare(b.ageGroup));
        contractTimelineData.sort((a, b) => a.dateStr.localeCompare(b.dateStr));

        // NEU: Controlling Transformationen
        const costByFinArt = Object.keys(aggCostFinArt).map(key => {
          return { finArt: key, cost: aggCostFinArt[key] };
        });

        const costByOrg = Object.keys(aggCostOrg).map(key => {
          return { org: key, cost: aggCostOrg[key] };
        });

        // ==========================================================
        // MODELLBINDUNG AN DIE VIEW
        // ==========================================================

				// Diagramme
        this.getView().setModel(new JSONModel({
          employeeGroups: employeeGroups,
          timeSeriesData: timeSeriesData,
          stackedData: stackedData,
          contractEndData: contractEndData,
          contractTimelineData: contractTimelineData,
          ageStructureData: ageStructureData,
          costByFinArt: costByFinArt,
          costByOrg: costByOrg
        }));

        // KPIs im globalen dashboard-Modell binden
        this.getView().setModel(new JSONModel({
          kpis: {
            headcount: totalHeadcount,
            fte: totalFTE,
            totalCost: totalCost,
            avgCostPerFTE: totalFTE > 0 ? (totalCost / totalFTE) : 0
          }
        }), "dashboard");
      });
    }

  });
});
