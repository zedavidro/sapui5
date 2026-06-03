sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel"
], function (BaseController, JSONModel) {
	"use strict";

	return BaseController.extend("de.unigoettingen.dashboardapp.controller.App", {
		onInit: function () {
			// apply content density mode to root view
			this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());

			// Initialize sidebar model with expanded flag and hierarchical structures
			const oSidebarModel = new JSONModel({
				visible: false,
				expanded: false,
				uniStructure: [
					{
						text: "Präsidium",
						icon: "sap-icon://customer-and-contacts",
						nodes: [
							{
								text: "Wirtschaftsinformatik (Dekanat)",
								icon: "sap-icon://folder",
								nodes: [
									{ text: "LS Anwendungssysteme & E-Business", icon: "sap-icon://document" },
									{ text: "LS Informationsmanagement", icon: "sap-icon://document" },
									{ text: "LS Digitalisierung & Innovation", icon: "sap-icon://document" }
								]
							},
							{
								text: "Mathematik (Dekanat)",
								icon: "sap-icon://folder",
								nodes: [
									{ text: "LS Angewandte Analysis", icon: "sap-icon://document" },
									{ text: "LS Numerische Mathematik", icon: "sap-icon://document" },
									{ text: "LS Algebra & Geometrie", icon: "sap-icon://document" }
								]
							},
							{
								text: "Informatik (Dekanat)",
								icon: "sap-icon://folder",
								nodes: [
									{ text: "LS Softwaretechnik & Programmiersprachen", icon: "sap-icon://document" },
									{ text: "LS Computergrafik & Visualisierung", icon: "sap-icon://document" },
									{ text: "LS Verteilte Systeme", icon: "sap-icon://document" }
								]
							},
							{
								text: "Psychologie (Dekanat)",
								icon: "sap-icon://folder",
								nodes: [
									{ text: "LS Klinische Psychologie", icon: "sap-icon://document" },
									{ text: "LS Kognitionspsychologie", icon: "sap-icon://document" },
									{ text: "LS Entwicklungspsychologie", icon: "sap-icon://document" }
								]
							},
							{
								text: "Medizin (Dekanat)",
								icon: "sap-icon://folder",
								nodes: [
									{ text: "LS Kardiologie & Pneumologie", icon: "sap-icon://document" },
									{ text: "LS Humangenetik", icon: "sap-icon://document" },
									{ text: "LS Pharmakologie & Toxikologie", icon: "sap-icon://document" }
								]
							}
						]
					}
				]
			});
			this.getView().setModel(oSidebarModel, "sidebar");

			// Attach router matching to display sidebar only outside login page
			this.getOwnerComponent().getRouter().attachRouteMatched(this.onRouteMatched, this);
		},

		onRouteMatched: function (oEvent) {
			const sRouteName = oEvent.getParameter("name");
			// Hide sidebar on login page, show on all other pages
			const bShowSidebar = sRouteName !== "login";
			this.getView().getModel("sidebar").setProperty("/visible", bShowSidebar);
		},

		onToggleSidebar: function () {
			const oModel = this.getView().getModel("sidebar");
			const bExpanded = oModel.getProperty("/expanded");
			oModel.setProperty("/expanded", !bExpanded);
		},

		onShortcutPress: function (oEvent) {
			const sRoute = oEvent.getSource().data("route");
			if (sRoute) {
				this.getOwnerComponent().getRouter().navTo(sRoute);
			}
		},

		onLogoutPress: function () {
			// When logging out, also collapse the sidebar for next login
			this.getView().getModel("sidebar").setProperty("/expanded", false);
			this.getOwnerComponent().getRouter().navTo("login");
		}
	});
});
