/**
 * HR.controller.js — Controller der Personal-Seite auf Lehrstuhlebene (Route "hr")
 * - Lädt die Personaldaten einmalig von /api/personal (echte SQLite-Tabelle "personal")
 * - Wertet sie clientseitig aus (Kopfzahl, VZÄ, Kosten, Verteilung nach Dienstart/Geschlecht/
 *   Alter, Vertragsenden, Kosten nach Struktureinheit) und bindet die Ergebnisse an die
 *   Diagramme/Kacheln im View
 * - Die Jahresauswahl filtert nur die meisten Auswertungen; einige (z. B. der Jahres-Trend)
 *   laufen bewusst ungefiltert über alle Jahre
 */
sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel"
], function (BaseController, JSONModel) {
  "use strict";

  return BaseController.extend("de.unigoettingen.dashboardapp.controller.HR", {

    onInit: function () {
      this._selectedYear = "2025";

      this.getOwnerComponent().getRouter().getRoute("hr").attachPatternMatched(this._onRouteMatched, this);

      // Attach window resize listener for the sliding tab indicator
      // - Der animierte Schieber unter dem aktiven Reiter muss bei Fenstergrößenänderung neu positioniert werden
      window.addEventListener("resize", this._updateHRTabSlider.bind(this));

      // Set scale and reference line properties programmatically to ensure X-Axis starts at year 2015 and shows today's date
      // - Diese Einstellungen hängen vom aktuellen Datum ab und können deshalb nicht
      //   statisch in der View-XML stehen, sondern werden hier zur Laufzeit berechnet
      const oVizFrame = this.getView().byId("idContractEndRadar");
      if (oVizFrame) {
        const oToday = new Date();
        const iCurrentYear = oToday.getFullYear();
        const iCurrentMonth = oToday.getMonth();
        const iCurrentDay = oToday.getDate();
        // Heutiges Datum als Dezimalzahl (z. B. Mitte 2026 ≈ 2026.5), damit es auf der
        // kontinuierlichen Jahres-Achse des Diagramms als Referenzlinie platziert werden kann
        const fTodayFractional = iCurrentYear + (iCurrentMonth + iCurrentDay / 30) / 12;
        const sDateLabel = "Heute (" + oToday.toLocaleDateString("de-DE", { month: "long", year: "numeric" }) + ")";

        oVizFrame.setVizProperties({
          plotArea: {
            // Punktfarben je nach Beschäftigungsumfang (VZÄ): Teilzeit rot, Vollzeit blau
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
            // Gestrichelte rote Linie markiert das heutige Datum auf der Zeitachse
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
          // Feste Achsen-Skala 2015–2032, damit das Diagramm nicht bei jedem Datenwechsel "springt"
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

    // Rollenprüfung + initiales Laden der Daten bei jedem Aufruf der Route "hr"
    _onRouteMatched: function () {
      const oUserModel = this.getOwnerComponent().getModel("userModel");
      const iRole = oUserModel ? oUserModel.getProperty("/zugriffsrechte") : 0;
      if (iRole < 1) {
        this.getOwnerComponent().getRouter().navTo("login");
        return;
      }
      this._loadAndUpdate();
      // Update slider position after render
      // - Zweimal verzögert, da das DOM nach dem Rendern noch nicht sofort seine finalen Maße hat
      setTimeout(this._updateHRTabSlider.bind(this), 50);
      setTimeout(this._updateHRTabSlider.bind(this), 200);
    },

    // --- Event-Handler für Dropdown ---
    // Jahr gewechselt → komplette Aggregation neu berechnen
    onYearChange: function (oEvent) {
      this._selectedYear = oEvent.getSource().getSelectedKey();
      this._loadAndUpdate();
    },

    // --- Hauptlogik für Datenladung und Aggregation ---
    /**
     * Lädt die Rohdaten genau einmal (Cache in this._aPersonalData) und ruft danach
     * immer nur noch die Neu-Aggregation auf; verhindert außerdem parallele Doppel-Requests
     * über die Promise-Zwischenspeicherung (this._pLoadPromise).
     */
    _loadAndUpdate: function () {
      if (this._aPersonalData) {
        this._updateAggregates();
        return;
      }
      if (this._pLoadPromise) {
        return;
      }

      this._pLoadPromise = fetch("http://localhost:3000/api/personal")
        .then(response => response.json())
        .then(data => {
          this._aPersonalData = data.personal || data;
          this._updateAggregates();
        })
        .catch(err => {
          console.error("Error loading personal data:", err);
        })
        .finally(() => {
          this._pLoadPromise = null;
        });
    },

    /**
     * Converts an Excel serial date number (e.g. 44163 or "44163.0") to an ISO date string "YYYY-MM-DD".
     * Excel epoch starts at 1899-12-30.
     */
    // - Die Rohdaten aus der Excel-basierten Quelle liefern Datumsangaben teils als
    //   fortlaufende Seriennummer statt als echtes Datum; diese Funktion rechnet das um
    _excelSerialToISO: function (vValue) {
      var iSerial = parseInt(parseFloat(vValue), 10);
      if (isNaN(iSerial) || iSerial < 1) {
        return null;
      }
      // Excel epoch: 1899-12-30
      var oEpoch = new Date(1899, 11, 30);
      var oDate = new Date(oEpoch.getTime() + iSerial * 86400000);
      var sYear = oDate.getFullYear();
      var sMonth = String(oDate.getMonth() + 1).padStart(2, "0");
      var sDay = String(oDate.getDate()).padStart(2, "0");
      return sYear + "-" + sMonth + "-" + sDay;
    },

    /**
     * Zentrale Aggregationsfunktion: geht einmal über alle Personaldatensätze und befüllt
     * mehrere unabhängige Zwischenspeicher (einer pro Diagramm/Kennzahl), die am Ende
     * in zwei Modelle ("Default"-Modell für Diagramme, "dashboard" für KPI-Kacheln) geschrieben werden.
     */
    _updateAggregates: function () {
      const data = this._aPersonalData || [];

      // Normalize VBEDAT: convert Excel serial numbers to ISO date strings
      // - Datumsfeld "VBEDAT" (befristet bis) vereinheitlichen, falls noch als Excel-Zahl vorliegend
      data.forEach(item => {
        if (item.VBEDAT && String(item.VBEDAT).indexOf("-") === -1) {
          item.VBEDAT = this._excelSerialToISO(item.VBEDAT);
        }
      });

      // Pauschale universitäre Jahros-Personalkostensätze für 1.0 VZÄ
      // - Vereinfachte Kostensätze pro Personalgruppe (da keine echten Gehaltsdaten vorliegen)
      const costRates = {
        "Hochschullehrergruppe": 110000,
        "wissenschaftlicher Dienst": 78000,
        "techn. und Verwaltungsdienst": 58000,
        "Unbekannt": 65000
      };

      // Globale Zähler für KPIs (Gefiltert)
      // - Diese drei Summen landen direkt in den KPI-Kacheln oben im View
      let totalHeadcount = 0;
      let totalFTE = 0;
      let totalCost = 0;

      // Zwischenspeicher für Aggregationsobjekte
      // - Je ein Objekt/Array pro Diagramm; werden unten in die finalen Datensätze umgewandelt
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
          // - Trend- und Befristungs-Auswertung ignorieren bewusst die Jahresauswahl,
          //   damit sie immer die komplette Historie zeigen

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
      // - Die Zwischenspeicher (Objekte mit Schlüsseln) werden hier in flache Arrays
      //   umgewandelt, wie sie die viz-Diagramme als Datenquelle erwarten

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
      // - Alle Diagramm-Datensätze landen im Default-Modell (ohne Namen) des Views
      let oViewModel = this.getView().getModel();
      if (!oViewModel) {
        oViewModel = new JSONModel();
        this.getView().setModel(oViewModel);
      }
      oViewModel.setData({
        employeeGroups: employeeGroups,
        timeSeriesData: timeSeriesData,
        stackedData: stackedData,
        contractEndData: contractEndData,
        contractTimelineData: contractTimelineData,
        ageStructureData: ageStructureData,
        costByFinArt: costByFinArt,
        costByOrg: costByOrg
      });

      // KPIs im globalen dashboard-Modell binden
      // - Separates benanntes Modell "dashboard" nur für die vier KPI-Kacheln oben im View
      let oDashboardModel = this.getView().getModel("dashboard");
      if (!oDashboardModel) {
        oDashboardModel = new JSONModel();
        this.getView().setModel(oDashboardModel, "dashboard");
      }
      oDashboardModel.setData({
        kpis: {
          headcount: totalHeadcount,
          fte: totalFTE,
          totalCost: totalCost,
          avgCostPerFTE: totalFTE > 0 ? (totalCost / totalFTE) : 0
        }
      });
    },

    // Reiterwechsel: Schieber-Position nach dem Rendern neu berechnen
    onHRTabSelect: function () {
      setTimeout(this._updateHRTabSlider.bind(this), 0);
    },

    /**
     * Positioniert einen selbst gezeichneten "Schieber" (div.tab-slider-indicator) unter dem
     * gerade aktiven Reiter der IconTabBar. Wird bei Fenster-Resize, Reiterwechsel und nach
     * dem ersten Rendern aufgerufen, da UI5 selbst keinen animierten Unterstrich mitbringt.
     */
    _updateHRTabSlider: function () {
      const oTabBar = this.getView().byId("idHRIconTabBar");
      if (!oTabBar) {
        return;
      }
      const oTabBarDom = oTabBar.getDomRef();
      if (!oTabBarDom) {
        // Dom not ready yet, retry in next frame
        setTimeout(this._updateHRTabSlider.bind(this), 50);
        return;
      }

      // Find head container
      const oHeadDom = oTabBarDom.querySelector(".sapMITBHead") || oTabBarDom.querySelector(".sapMITBHeadContainer");
      if (!oHeadDom) {
        return;
      }

      // Ensure indicator exists
      let oIndicator = oHeadDom.querySelector(".tab-slider-indicator");
      if (!oIndicator) {
        oIndicator = document.createElement("div");
        oIndicator.className = "tab-slider-indicator";
        oHeadDom.appendChild(oIndicator);
      }

      // Find selected tab
      const oSelectedTabDom = oHeadDom.querySelector(".sapMITBSelected");
      if (oSelectedTabDom) {
        // Offset calculations relative to oHeadDom
        oIndicator.style.left = this._getOffsetLeft(oSelectedTabDom, oHeadDom) + "px";
        oIndicator.style.top = this._getOffsetTop(oSelectedTabDom, oHeadDom) + "px";
        oIndicator.style.width = oSelectedTabDom.offsetWidth + "px";
        oIndicator.style.height = oSelectedTabDom.offsetHeight + "px";
      } else {
        // Hide if no tab is selected
        oIndicator.style.width = "0px";
      }
    },

    // Hilfsfunktion: berechnet den horizontalen Abstand eines Elements zu einem Vorfahren-Element
    _getOffsetLeft: function (oEl, oParent) {
      let nLeft = 0;
      while (oEl && oEl !== oParent) {
        nLeft += oEl.offsetLeft;
        oEl = oEl.offsetParent;
      }
      return nLeft;
    },

    // Hilfsfunktion: berechnet den vertikalen Abstand eines Elements zu einem Vorfahren-Element
    _getOffsetTop: function (oEl, oParent) {
      let nTop = 0;
      while (oEl && oEl !== oParent) {
        nTop += oEl.offsetTop;
        oEl = oEl.offsetParent;
      }
      return nTop;
    }

  });
});
