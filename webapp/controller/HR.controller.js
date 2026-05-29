sap.ui.define([
  "sap/ui/core/mvc/Controller"
], function (Controller) {
  "use strict";

  return Controller.extend("de.unigoettingen.dashboardapp.controller.HR", {
    onNavBack: function () {
      this.getOwnerComponent().getRouter().navTo("start");
    }
  });
});
