sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
  "use strict";

  return Controller.extend("de.unigoettingen.dashboardapp.controller.PB", {

    onNavBack: function () {
      this.getOwnerComponent().getRouter().navTo("start");
    },

    onInit: function () {
      this._selectedYear = "alle";
      this._loadAndUpdate();
    },

    onYearChange: function (oEvent) {
      this._selectedYear = oEvent.getSource().getSelectedKey();
      this._loadAndUpdate();
    },

    _loadAndUpdate: function () {
      const oModel = new JSONModel();
      oModel.loadData("http://localhost:3000/api/publikationen"); //Http hier machen

      oModel.attachRequestCompleted(() => {

        const data = oModel.getData().publikationen || [];

        // KPIs
        let published = 0;
        let underReview = 0;
        let inPreparation = 0;

        // dynamische Jahre sammeln
        const yearsSet = new Set();

        data.forEach(item => {
          yearsSet.add(item.year);

          // Jahrfilter
          if (this._selectedYear !== "alle" && item.year != this._selectedYear) {
            return;
          }

          // Status zählen
          switch (item.status) {
            case "published":
              published++;
              break;
            case "underReview":
              underReview++;
              break;
            case "inPreparation":
              inPreparation++;
              break;
          }
        });

        const years = Array.from(yearsSet).sort();

        // Dashboard Model
        const dashboardModel = new JSONModel({
          years: years,
          selectedYear: this._selectedYear,
          kpis: {
            published: published,
            underReview: underReview,
            inPreparation: inPreparation
          }
        });

        this.getView().setModel(dashboardModel, "dashboard");
      });
    }

  });
});