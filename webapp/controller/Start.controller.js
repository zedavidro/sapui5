sap.ui.define([
  "sap/ui/core/mvc/Controller"
], function (Controller) {
  "use strict";

  return Controller.extend("de.unigoettingen.dashboardapp.controller.Start", {

    onNavToFinance: function () {
      this.getOwnerComponent().getRouter().navTo("finanzen");
    },

    onNavToHR: function () {
      this.getOwnerComponent().getRouter().navTo("hr");
    }

  });
});