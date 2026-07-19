/**
 * Paquin1.controller.js — Controller der Fakultätsfinanzen-Seite (Route "fakultaetsfinanzen")
 * - Trotz Klassenname "Paquin1": laut manifest.json ist die Route "fakultaetsfinanzen" auf
 *   diesen Controller/View gemappt (nicht auf Fakultaetsfinanzen.controller.js, das ist dead code)
 * - Alle Zahlen sind Platzhalter-Basisdaten (kein echter Backend-Call!), die je nach gewähltem
 *   Geschäftsjahr proportional zu den KPI-Verhältnissen hoch-/runterskaliert werden
 * - Enthält die Grundmittel-Übertragsregel (max. 20% Budgetübertrag ins Folgejahr) sowie die
 *   Lehrstuhl-Filterlogik für die Budgetaufstellungstabelle
 */
sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator"
], function (BaseController, JSONModel, Filter, FilterOperator) {
  "use strict";

  return BaseController.extend("de.unigoettingen.dashboardapp.controller.Paquin1", {

    onInit: function () {
      this._selectedYear = "2026";
      this._selectedLehrstuhl = "alle";

      // Platzhalter-Daten je Geschäftsjahr – hier später durch echte API-Daten ersetzen
      this._oYearlyKpiData = {
        "2024": {
          budget: 1250000,
          einnahmenIst: 1180000,
          ausgabenIst: 980000,
          obligo: 145000,
          restVerfuegbarkeit: 125000,
          headcount: 320,
          fte: 210.5,
          totalCost: 1345000,
          avgCostPerFTE: 6400
        },
        "2025": {
          budget: 1320000,
          einnahmenIst: 1050000,
          ausgabenIst: 870000,
          obligo: 210000,
          restVerfuegbarkeit: 240000,
          headcount: 340,
          fte: 223.7,
          totalCost: 1482000,
          avgCostPerFTE: 6630
        },
        "2026": {
          budget: 1400000,
          einnahmenIst: 620000,
          ausgabenIst: 510000,
          obligo: 380000,
          restVerfuegbarkeit: 510000,
          headcount: 360,
          fte: 238.3,
          totalCost: 1650000,
          avgCostPerFTE: 6920
        }
      };

      // Basisjahr-Zeilen für Budgetaufstellung (2024) und Lehrstuhlübersicht (2026);
      // andere Jahre werden daraus proportional zu den KPI-Verhältnissen abgeleitet.
      // Nur Sachkosten – Personalkosten werden hier bewusst nicht geführt (siehe Personal-Tab)
      this._aAusgabenBase = [
        { bereich: "Ausgaben", position: "Sachmittel", budget: 250000, obligo: 45000, verausgabt: 180000 },
        { bereich: "", position: "Investitionen", budget: 150000, obligo: 20000, verausgabt: 80000 },
        { bereich: "", position: "Drittmittelprojekte", budget: 150000, obligo: 0, verausgabt: 100000 }
      ];

      this._aEinnahmenBase = [
        { bereich: "Einnahmen", position: "Landesmittel", betrag: 1100000 },
        { bereich: "", position: "Drittmittel", betrag: 150000 },
        { bereich: "", position: "Erlöse", betrag: 25000 },
        { bereich: "", position: "Erträge", betrag: 20000 },
        { bereich: "", position: "Zinsen", betrag: 5000 }
      ];

      // 6 Lehrstühle der Fakultät. "route" ist nur bei "Lehrstuhl KI-Forschung" gesetzt →
      // nur dieser Lehrstuhl ist in der Tabelle klickbar/navigierbar (siehe onLehrstuhlSelect)
      this._aLehrstuehleBase = [
        { lehrstuhl: "Lehrstuhl Smart Services", kostenstelleId: "KST-4101", professor: "Prof. Adam", budget: 450000, obligo: 120000, verausgabt: 170000, route: null },
        { lehrstuhl: "Lehrstuhl für E-Business", kostenstelleId: "KST-4102", professor: "Prof. Schumann", budget: 500000, obligo: 140000, verausgabt: 190000, route: null },
        { lehrstuhl: "Lehrstuhl KI-Forschung", kostenstelleId: "KST-4103", professor: "Prof. Weber", budget: 450000, obligo: 120000, verausgabt: 150000, route: "finanzen" },
        { lehrstuhl: "Lehrstuhl Makroökonomik", kostenstelleId: "KST-4104", professor: "Prof. Wagner", budget: 480000, obligo: 130000, verausgabt: 175000, route: null },
        { lehrstuhl: "Lehrstuhl International Finances", kostenstelleId: "KST-4105", professor: "Prof. Fischer", budget: 520000, obligo: 150000, verausgabt: 200000, route: null },
        { lehrstuhl: "Lehrstuhl Marketing", kostenstelleId: "KST-4106", professor: "Prof. Neumann", budget: 470000, obligo: 125000, verausgabt: 165000, route: null }
      ];

      // Gebäude-Kostenstellen der Fakultät – statisch, unabhängig vom Geschäftsjahr
      // (Status wird aus der Grundmittel-Übertragsregel berechnet, nicht hier hinterlegt)
      this._aGebaeudeBase = [
        { gebaeude: "Oeconomicum", kostenstelleId: "KST-4901", budget: 850000, obligo: 210000, verausgabt: 540000, verfuegbar: 100000 },
        { gebaeude: "Blauer Turm", kostenstelleId: "KST-4902", budget: 620000, obligo: 150000, verausgabt: 400000, verfuegbar: 70000 },
        { gebaeude: "Verfügungsgebäude", kostenstelleId: "KST-4904", budget: 430000, obligo: 90000, verausgabt: 300000, verfuegbar: 40000 }
      ];

      // WiWi-Fakultät allgemein: zentrale Verwaltungs-/Fakultätskostenstellen (jahresunabhängig,
      // gleiche Struktur wie Gebäude), werden oberhalb der Lehrstuhlübersicht dargestellt
      this._aWiwiAllgemeinBase = [
        { bereich: "Fakultät allgemein", kostenstelleId: "KST-4801", budget: 300000, obligo: 60000, verausgabt: 200000, verfuegbar: 40000 },
        { bereich: "Dekanat", kostenstelleId: "KST-4802", budget: 180000, obligo: 30000, verausgabt: 120000, verfuegbar: 30000 },
        { bereich: "Studiendekan", kostenstelleId: "KST-4803", budget: 90000, obligo: 15000, verausgabt: 60000, verfuegbar: 15000 },
        { bereich: "Forschungszentrum", kostenstelleId: "KST-4804", budget: 220000, obligo: 50000, verausgabt: 140000, verfuegbar: 30000 }
      ];

      // Einzelbuchungen je Geschäftsjahr für die "Finanzbewegungen"-Tabelle
      this._oFinanzbewegungenByYear = {
        "2024": [
          { datum: "08.01.2024", lehrstuhl: "Prof. Adam", buchung: "Laborbedarf", kostenstelle: "Lehrstuhl Smart Services", typ: "Ausgabe", betrag: -4200 },
          { datum: "14.02.2024", lehrstuhl: "Prof. Weber", buchung: "Drittmittelzahlung", kostenstelle: "Projekt KI", typ: "Einnahme", betrag: 15000 }
        ],
        "2025": [
          { datum: "05.01.2025", lehrstuhl: "Prof. Schumann", buchung: "Konferenzreise", kostenstelle: "Lehrstuhl für E-Business", typ: "Ausgabe", betrag: -3100 },
          { datum: "20.02.2025", lehrstuhl: "Prof. Weber", buchung: "Drittmittelzahlung", kostenstelle: "Projekt KI", typ: "Einnahme", betrag: 18000 },
          { datum: "02.03.2025", lehrstuhl: "Prof. Adam", buchung: "Bestellung Server", kostenstelle: "Lehrstuhl Smart Services", typ: "Obligo", betrag: -12000 }
        ],
        "2026": [
          { datum: "03.01.2026", lehrstuhl: "Prof. Adam", buchung: "Laborbedarf", kostenstelle: "Lehrstuhl Smart Services", typ: "Ausgabe", betrag: -5200 },
          { datum: "12.02.2026", lehrstuhl: "Prof. Weber", buchung: "Drittmittelzahlung", kostenstelle: "Projekt KI", typ: "Einnahme", betrag: 20000 },
          { datum: "01.03.2026", lehrstuhl: "Prof. Adam", buchung: "Bestellung Server", kostenstelle: "Lehrstuhl Smart Services", typ: "Obligo", betrag: -15000 }
        ]
      };

      // View-lokales Modell, steuert nur, welcher Reiter/Inhalt gerade sichtbar ist
      const oViewModel = new JSONModel({ selectedTab: "pr_fi" });
      this.getView().setModel(oViewModel, "view");

      this.getOwnerComponent().getRouter().getRoute("fakultaetsfinanzen").attachPatternMatched(this._onRouteMatched, this);
    },

    // Reiterwechsel (Finanzen/Personal/Kostenstellen) → nur Sichtbarkeits-Flag im view-Modell umschalten
    onTabSelect: function (oEvent) {
      const sKey = oEvent.getParameter && oEvent.getParameter("key") ? oEvent.getParameter("key") : oEvent.getSource().getSelectedKey();
      this.getView().getModel("view").setProperty("/selectedTab", sKey);
    },

    _onRouteMatched: function () {
      // Rollenprüfung: nur Zugang 2 oder 3 erlaubt
      const oUserModel = this.getOwnerComponent().getModel("userModel");
      const iRole = oUserModel ? oUserModel.getProperty("/zugriffsrechte") : 0;
      if (iRole < 2) {
        this.getOwnerComponent().getRouter().navTo("login");
        return;
      }
      this._updateAll();
    },

    // Jahr gewechselt → KPIs und alle Tabellen neu berechnen
    onYearChange: function (oEvent) {
      this._selectedYear = oEvent.getSource().getSelectedKey();
      this._updateAll();
    },

    // Lehrstuhl-Filter gewechselt → nur die Budgetaufstellungstabelle muss neu berechnet werden
    onLehrstuhlFilterChange: function (oEvent) {
      this._selectedLehrstuhl = oEvent.getSource().getSelectedKey();
      this._updateTableData();
    },

    // Freitextsuche in der Lehrstuhlübersicht: clientseitiger Anwendungsfilter auf das Feld "lehrstuhl"
    onKostenstellenSearch: function (oEvent) {
      const sQuery = oEvent.getParameter("newValue") || "";
      const oBinding = this.byId("lehrstuhlBreakdown").getBinding("items");
      const aFilters = sQuery
        ? [new Filter("lehrstuhl", FilterOperator.Contains, sQuery)]
        : [];
      oBinding.filter(aFilters, "Application");
    },

    // Klick auf eine Lehrstuhl-Zeile: nur navigieren, wenn die Zeile eine Route hinterlegt hat
    onLehrstuhlSelect: function (oEvent) {
      const oContext = oEvent.getSource().getBindingContext("tableData");
      const sRoute = oContext ? oContext.getProperty("route") : null;
      if (sRoute) {
        this.navTo(sRoute);
      }
    },

    // Sammelaufruf: KPI-Kacheln und alle Tabellen für das aktuell gewählte Jahr neu befüllen
    _updateAll: function () {
      this._updateKPIs();
      this._updateTableData();
    },

    // Skaliert einen Basiswert proportional (ratio) und rundet auf volle Tausender
    _scaleValue: function (value, ratio) {
      if (!value) {
        return 0;
      }
      return Math.round(value * ratio / 1000) * 1000;
    },

    // Grundmittel-Übertragsregel: höchstens 20% des Original-Budgets dürfen ins Folgejahr
    // mitgenommen werden, der Rest des Verfügbar-Betrags fällt an den Zentralhaushalt der Uni.
    // Gilt nur für Grundmittel-Kostenstellen (Lehrstühle, Gebäude) – Drittmittel haben eigene
    // projektlaufzeitgebundene Restmittelregeln und sind hiervon nicht betroffen.
    _computeGrundmittelUebertrag: function (budget, verfuegbar) {
      const iKappungsgrenze = budget * 0.2;
      const iUebertragbar = Math.max(0, Math.min(verfuegbar, iKappungsgrenze));
      const iVerfaellt = Math.max(0, verfuegbar - iUebertragbar);
      return {
        uebertragbar: Math.round(iUebertragbar),
        verfaellt: Math.round(iVerfaellt)
      };
    },

    // Befüllt die KPI-Kacheln (Finanzen-Reiter: fakFinanzen; Personal-Reiter: fakPersonal)
    // direkt aus den Jahresbasiswerten, ohne weitere Skalierung
    _updateKPIs: function () {
      const oYearData = this._oYearlyKpiData[this._selectedYear] || this._oYearlyKpiData["2026"];
      const oPrevYearData = this._oYearlyKpiData[(parseInt(this._selectedYear, 10) - 1).toString()];

      let oFakFinanzenModel = this.getView().getModel("fakFinanzen");
      if (!oFakFinanzenModel) {
        oFakFinanzenModel = new JSONModel();
        this.getView().setModel(oFakFinanzenModel, "fakFinanzen");
      }
      oFakFinanzenModel.setData({
        kpis: Object.assign({}, oYearData, {
          prevBudget: oPrevYearData ? oPrevYearData.budget : null
        })
      });

      let oFakPersonalModel = this.getView().getModel("fakPersonal");
      if (!oFakPersonalModel) {
        oFakPersonalModel = new JSONModel();
        this.getView().setModel(oFakPersonalModel, "fakPersonal");
      }
      oFakPersonalModel.setData({
        kpis: {
          headcount: oYearData.headcount,
          fte: oYearData.fte,
          totalCost: oYearData.totalCost,
          avgCostPerFTE: oYearData.avgCostPerFTE
        }
      });
    },

    // Größte Funktion: berechnet alle 4 Tabellen (Budgetaufstellung, Lehrstuhlübersicht,
    // Gebäude, Finanzbewegungen) sowie die Grundmittel-/Drittmittel-Salden für das gewählte Jahr
    _updateTableData: function () {
      const oYear = this._oYearlyKpiData[this._selectedYear] || this._oYearlyKpiData["2026"];
      const oBase2024 = this._oYearlyKpiData["2024"];
      const oBase2026 = this._oYearlyKpiData["2026"];

      // --- Budgetaufstellung: Basisjahr 2024, proportional skaliert ---
      const budgetRatio = oYear.budget / oBase2024.budget;
      const obligoRatio = oYear.obligo / oBase2024.obligo;
      const ausgabenRatio = oYear.ausgabenIst / oBase2024.ausgabenIst;
      const einnahmenRatio = oYear.einnahmenIst / oBase2024.einnahmenIst;

      const aAusgaben = this._aAusgabenBase.map((r) => {
        const budget = this._scaleValue(r.budget, budgetRatio);
        const obligo = this._scaleValue(r.obligo, obligoRatio);
        const verausgabt = this._scaleValue(r.verausgabt, ausgabenRatio);
        return {
          bereich: r.bereich,
          position: r.position,
          budget: budget,
          obligo: obligo,
          verausgabt: verausgabt,
          verfuegbar: budget - obligo - verausgabt
        };
      });

      const aEinnahmen = this._aEinnahmenBase.map((r) => ({
        bereich: r.bereich,
        position: r.position,
        betrag: this._scaleValue(r.betrag, einnahmenRatio)
      }));

      // --- Grundmittel/Drittmittel: Überschuss (>=0) oder Defizit (<0) je Budgetart (fakultätsweit) ---
      const iLandesmittel = aEinnahmen.find((r) => r.position === "Landesmittel").betrag;
      const iDrittmittelEinnahmen = aEinnahmen.find((r) => r.position === "Drittmittel").betrag;
      const iRegulaereAusgaben = aAusgaben
        .filter((r) => r.position !== "Drittmittelprojekte")
        .reduce((s, r) => s + r.verausgabt, 0);
      const iDrittmittelAusgaben = aAusgaben.find((r) => r.position === "Drittmittelprojekte").verausgabt;

      const iGrundmittelSaldo = iLandesmittel - iRegulaereAusgaben;
      const iDrittmittelSaldo = iDrittmittelEinnahmen - iDrittmittelAusgaben;

      // --- Lehrstuhlübersicht: Basisjahr 2026, proportional skaliert ---
      const budgetRatioLs = oYear.budget / oBase2026.budget;
      const obligoRatioLs = oYear.obligo / oBase2026.obligo;
      const ausgabenRatioLs = oYear.ausgabenIst / oBase2026.ausgabenIst;

      const aLehrstuehle = this._aLehrstuehleBase.map((r) => {
        const budget = this._scaleValue(r.budget, budgetRatioLs);
        const obligo = this._scaleValue(r.obligo, obligoRatioLs);
        const verausgabt = this._scaleValue(r.verausgabt, ausgabenRatioLs);
        const verfuegbar = budget - obligo - verausgabt;
        const oUebertrag = this._computeGrundmittelUebertrag(budget, verfuegbar);
        return {
          lehrstuhl: r.lehrstuhl,
          kostenstelleId: r.kostenstelleId,
          professor: r.professor,
          budget: budget,
          obligo: obligo,
          verausgabt: verausgabt,
          verfuegbar: verfuegbar,
          uebertragbar: oUebertrag.uebertragbar,
          verfaellt: oUebertrag.verfaellt,
          status: oUebertrag.verfaellt > 0 ? "🟡 Kappung greift" : "🟢 Im Rahmen",
          route: r.route
        };
      });

      // --- Budgetaufstellung auf einen einzelnen Lehrstuhl filtern (Anteil an dessen Gesamtbudget) ---
      let fChairShare = 1;
      if (this._selectedLehrstuhl && this._selectedLehrstuhl !== "alle") {
        const iTotalChairBudget = aLehrstuehle.reduce((s, r) => s + r.budget, 0);
        const oSelectedChair = aLehrstuehle.find((r) => r.lehrstuhl === this._selectedLehrstuhl);
        fChairShare = (oSelectedChair && iTotalChairBudget) ? oSelectedChair.budget / iTotalChairBudget : 1;
      }

      const aAusgabenGefiltert = aAusgaben.map((r) => {
        const budget = this._scaleValue(r.budget, fChairShare);
        const obligo = this._scaleValue(r.obligo, fChairShare);
        const verausgabt = this._scaleValue(r.verausgabt, fChairShare);
        return {
          bereich: r.bereich,
          position: r.position,
          budget: budget,
          obligo: obligo,
          verausgabt: verausgabt,
          verfuegbar: budget - obligo - verausgabt
        };
      });

      const oSummeAusgaben = aAusgabenGefiltert.reduce((s, r) => ({
        budget: s.budget + r.budget,
        obligo: s.obligo + r.obligo,
        verausgabt: s.verausgabt + r.verausgabt,
        verfuegbar: s.verfuegbar + r.verfuegbar
      }), { budget: 0, obligo: 0, verausgabt: 0, verfuegbar: 0 });

      const aEinnahmenGefiltert = aEinnahmen.map((r) => ({
        bereich: r.bereich,
        position: r.position,
        betrag: this._scaleValue(r.betrag, fChairShare)
      }));

      const iSummeEinnahmen = aEinnahmenGefiltert.reduce((s, r) => s + r.betrag, 0);

      // Eine gemeinsame Zeilenliste für die Tabelle (Detail- und Summenzeilen,
      // unterschieden über rowType, damit ein einziges Table-Template beides abbildet)
      const aBudgetaufstellung = aAusgabenGefiltert.map((r) => ({
        rowType: "detail",
        bereich: r.bereich,
        position: r.position,
        budget: r.budget,
        obligo: r.obligo,
        verausgabt: r.verausgabt,
        verfuegbar: r.verfuegbar
      })).concat([{
        rowType: "total",
        bereich: "Summe Ausgaben",
        position: "",
        budget: oSummeAusgaben.budget,
        obligo: oSummeAusgaben.obligo,
        verausgabt: oSummeAusgaben.verausgabt,
        verfuegbar: oSummeAusgaben.verfuegbar
      }], aEinnahmenGefiltert.map((r) => ({
        rowType: "detail",
        bereich: r.bereich,
        position: r.position,
        budget: r.betrag,
        obligo: null,
        verausgabt: null,
        verfuegbar: null
      })), [{
        rowType: "total",
        bereich: "Summe Einnahmen",
        position: "",
        budget: iSummeEinnahmen,
        obligo: null,
        verausgabt: null,
        verfuegbar: null
      }]);

      // Gebäude sind jahresunabhängig – Übertragsregel wird direkt auf die Basiswerte angewendet
      const aGebaeude = this._aGebaeudeBase.map((r) => {
        const oUebertrag = this._computeGrundmittelUebertrag(r.budget, r.verfuegbar);
        return Object.assign({}, r, {
          uebertragbar: oUebertrag.uebertragbar,
          verfaellt: oUebertrag.verfaellt,
          status: oUebertrag.verfaellt > 0 ? "🟡 Kappung greift" : "🟢 Im Rahmen"
        });
      });

      // WiWi-Fakultät allgemein: ebenfalls jahresunabhängig, gleiche Übertragsregel wie Gebäude
      const aWiwiAllgemein = this._aWiwiAllgemeinBase.map((r) => {
        const oUebertrag = this._computeGrundmittelUebertrag(r.budget, r.verfuegbar);
        return Object.assign({}, r, {
          uebertragbar: oUebertrag.uebertragbar,
          verfaellt: oUebertrag.verfaellt,
          status: oUebertrag.verfaellt > 0 ? "🟡 Kappung greift" : "🟢 Im Rahmen"
        });
      });

      let oTableModel = this.getView().getModel("tableData");
      if (!oTableModel) {
        oTableModel = new JSONModel();
        this.getView().setModel(oTableModel, "tableData");
      }
      oTableModel.setData({
        budgetaufstellung: aBudgetaufstellung,
        lehrstuehle: aLehrstuehle,
        gebaeude: aGebaeude,
        wiwiAllgemein: aWiwiAllgemein,
        finanzbewegungen: this._oFinanzbewegungenByYear[this._selectedYear] || []
      });

      let oBudgetartModel = this.getView().getModel("budgetarten");
      if (!oBudgetartModel) {
        oBudgetartModel = new JSONModel();
        this.getView().setModel(oBudgetartModel, "budgetarten");
      }
      oBudgetartModel.setData({
        grundmittel: { saldo: iGrundmittelSaldo },
        drittmittel: { saldo: iDrittmittelSaldo }
      });
    }

  });
});
