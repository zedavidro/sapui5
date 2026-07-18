sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/m/Popover",
  "sap/m/List",
  "sap/m/StandardListItem"
], function (BaseController, JSONModel, Popover, List, StandardListItem) {
  "use strict";

  return BaseController.extend("de.unigoettingen.dashboardapp.controller.Paquin1", {

    onInit: function () {
      this._selectedYear = new Date().getFullYear().toString();

      // view model for tab selection
      const oViewModel = new JSONModel({ selectedTab: "pr_fi" });
      this.getView().setModel(oViewModel, "view");

      this.getOwnerComponent().getRouter().getRoute("fakultaetsfinanzen").attachPatternMatched(this._onRouteMatched, this);
    },

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
      this._updateKPIs();
    },

    onYearChange: function (oEvent) {
      this._selectedYear = oEvent.getSource().getSelectedKey();
      this._updateKPIs();
    },

    onLehrstuhlSelect: function () {
      // Nur der Lehrstuhl KI-Forschung hat aktuell eine hinterlegte Lehrstuhlfinanzen-Ansicht
      this.navTo("finanzen");
    },

    onLehrstuhlMenuPress: function (oEvent) {
      if (!this._oLehrstuhlPopover) {
        const oList = new List({ mode: "None" });
        oList.addItem(new StandardListItem({
          title: "Lehrstuhl Smart Services",
          description: "Prof. Müller",
          icon: "sap-icon://education",
          type: "Inactive"
        }));
        oList.addItem(new StandardListItem({
          title: "Lehrstuhl für E-Business",
          description: "Prof. Schmidt",
          icon: "sap-icon://education",
          type: "Inactive"
        }));
        oList.addItem(new StandardListItem({
          title: "Lehrstuhl KI-Forschung",
          description: "Prof. Weber",
          icon: "sap-icon://education",
          type: "Navigation"
        }));
        oList.attachItemPress((oEv) => {
          if (oEv.getParameter("listItem").getTitle() === "Lehrstuhl KI-Forschung") {
            this._oLehrstuhlPopover.close();
            this.onLehrstuhlSelect();
          }
        });

        this._oLehrstuhlPopover = new Popover({
          placement: "Bottom",
          showHeader: false,
          content: [oList]
        });
        this.getView().addDependent(this._oLehrstuhlPopover);
      }
      this._oLehrstuhlPopover.openBy(oEvent.getSource());
    },

    _updateKPIs: function () {
      // Platzhalter-Daten – hier später durch echte API-Daten ersetzen
      const oPlaceholderData = {
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

      const oYearData = oPlaceholderData[this._selectedYear] || oPlaceholderData["2026"];

      let oFakFinanzenModel = this.getView().getModel("fakFinanzen");
      if (!oFakFinanzenModel) {
        oFakFinanzenModel = new JSONModel();
        this.getView().setModel(oFakFinanzenModel, "fakFinanzen");
      }
      oFakFinanzenModel.setData({
        kpis: oYearData
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
    }

  });
});
