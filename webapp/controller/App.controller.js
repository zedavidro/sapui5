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
				uniStructure: []
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

			// Dynamically add Universitätsdaten if user has role 3
			const oUserModel = this.getOwnerComponent().getModel("userModel");
			const iRole = oUserModel ? oUserModel.getProperty("/zugriffsrechte") : 0;

			if (iRole >= 2) {
				const oSidebarModel = this.getView().getModel("sidebar");
				const aStructure = JSON.parse(JSON.stringify(oSidebarModel.getProperty("/uniStructure")));

				// Fakultätsfinanzen für Zugang 2 und 3
				if (!aStructure.find(n => n.text === "Fakultätsfinanzen")) {
					aStructure.push({
						text: "Fakultätsfinanzen",
						icon: "sap-icon://building",
						isFakultaetsfinanzen: true
					});
					oSidebarModel.setProperty("/uniStructure", aStructure);
					oSidebarModel.refresh(true);
				}
			}

			// Universitätsdaten nur für Zugang 3
			if (iRole === 3) {
				const oSidebarModel = this.getView().getModel("sidebar");
				const aStructure = JSON.parse(JSON.stringify(oSidebarModel.getProperty("/uniStructure")));
				
				if (!aStructure.find(n => n.text === "Universitätsdaten")) {
					fetch("http://localhost:3000/api/unifinanzen/kategorien")
						.then(response => response.json())
						.then(data => {
							const aNodes = data.kategorien.map(k => {
								const oNode = {
									text: k.hauptkategorie,
									isKategorie: true
								};
								
								if (k.unterkategorien && k.unterkategorien.length > 0) {
									oNode.nodes = k.unterkategorien.map(uk => ({
										text: uk,
										isUnterkategorie: true
									}));
								}
								return oNode;
							});
							
							// Re-read model in case Fakultätsfinanzen was already added
							const aLatest = JSON.parse(JSON.stringify(oSidebarModel.getProperty("/uniStructure")));
							if (!aLatest.find(n => n.text === "Universitätsdaten")) {
								aLatest.push({
									text: "Universitätsdaten",
									icon: "sap-icon://lead",
									isUnifinanzenMain: true,
									nodes: aNodes
								});
								oSidebarModel.setProperty("/uniStructure", aLatest);
								oSidebarModel.refresh(true);
							}
						})
						.catch(err => console.error("Fehler beim Laden der Kategorien:", err));
				}
			} else if (iRole < 2) {
				// Kein Zugang: Sidebar leeren
				const oSidebarModel = this.getView().getModel("sidebar");
				const aStructure = oSidebarModel.getProperty("/uniStructure");
				const aFiltered = aStructure.filter(n => n.text !== "Universitätsdaten" && n.text !== "Fakultätsfinanzen");
				oSidebarModel.setProperty("/uniStructure", aFiltered);
				oSidebarModel.refresh(true);
			}
		},

		onTreeItemSelect: function (oEvent) {
			const oItem = oEvent.getParameter("listItem");
			const oContext = oItem.getBindingContext("sidebar");
			if (!oContext) return;
			const oData = oContext.getObject();

			if (oData.isUnifinanzenMain) {
				this.getOwnerComponent().getRouter().navTo("unifinanzen", {
					kategorie: "alle"
				});
			} else if (oData.isKategorie) {
				this.getOwnerComponent().getRouter().navTo("unifinanzen", {
					kategorie: encodeURIComponent(oData.text)
				});
			} else if (oData.isUnterkategorie) {
				this.getOwnerComponent().getRouter().navTo("unifinanzen", {
					kategorie: encodeURIComponent(oData.text)
				});
			} else if (oData.isFakultaetsfinanzen) {
				this.getOwnerComponent().getRouter().navTo("fakultaetsfinanzen");
			}
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
