sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel"
], function (BaseController, JSONModel) {
  "use strict";

  return BaseController.extend("de.unigoettingen.dashboardapp.controller.PB", {

    onInit: function () {
      this._selectedYear = "alle";

      this.getOwnerComponent().getRouter().getRoute("pb").attachPatternMatched(this._onRouteMatched, this);
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

    onYearChange: function (oEvent) {
      this._selectedYear = oEvent.getSource().getSelectedKey();
      this._loadAndUpdate();
    },

    _loadAndUpdate: function () {
      if (this._aPublikationenData) {
        this._updateAggregates();
        return;
      }
      if (this._pLoadPromise) {
        return;
      }

      this._pLoadPromise = fetch("http://localhost:3000/api/publikationen")
        .then(response => response.json())
        .then(data => {
          this._aPublikationenData = data.publikationen || [];
          this._updateAggregates();
        })
        .catch(err => {
          console.error("Error loading publications data:", err);
        })
        .finally(() => {
          this._pLoadPromise = null;
        });
    },

    _updateAggregates: function () {
      const data = this._aPublikationenData || [];

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
          default:
            break;
        }
      });

      const years = Array.from(yearsSet).sort();

      // Dashboard Model
      let oDashboardModel = this.getView().getModel("dashboard");
      if (!oDashboardModel) {
        oDashboardModel = new JSONModel();
        this.getView().setModel(oDashboardModel, "dashboard");
      }
      oDashboardModel.setData({
        years: years,
        selectedYear: this._selectedYear,
        kpis: {
          published: published,
          underReview: underReview,
          inPreparation: inPreparation
        }
      });
    }

  });
});