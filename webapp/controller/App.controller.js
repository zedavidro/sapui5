sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/Configuration",
	"sap/tnt/NavigationListItem"
], function (BaseController, JSONModel, Configuration, NavigationListItem) {
	"use strict";

	return BaseController.extend("de.unigoettingen.dashboardapp.controller.App", {
		onInit: function () {
			// apply content density mode to root view
			this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());

			// Initialize sidebar model
			const oSidebarModel = new JSONModel({
				visible: false,
				expanded: false,
				selectedKey: "finanzen",
				showTabs: false
			});
			this.getView().setModel(oSidebarModel, "sidebar");

			// Initialize header model for the shared page title
			const oHeaderModel = new JSONModel({
				title: ""
			});
			this.getView().setModel(oHeaderModel, "header");

			// Initialize theme model (defaulting to Light Mode)
			const oThemeModel = new JSONModel({
				dark: false
			});
			this.getView().setModel(oThemeModel, "theme");
			Configuration.setTheme("sap_horizon");

			// Attach router matching to display sidebar only outside login page
			this.getOwnerComponent().getRouter().attachRouteMatched(this.onRouteMatched, this);
		},

		onRouteMatched: function (oEvent) {
			const sRouteName = oEvent.getParameter("name");
			// Hide sidebar on login page, show on all other pages
			const bShowSidebar = sRouteName !== "login";
			const oSidebarModel = this.getView().getModel("sidebar");
			oSidebarModel.setProperty("/visible", bShowSidebar);

			// Collapse sidebar when navigating to login
			if (!bShowSidebar) {
				oSidebarModel.setProperty("/expanded", false);
			}

			// Synchronize selected tab and side navigation with route name
			// Show tabs for Lehrstuhl pages and for the Präsidium (unifinanzen)
			const bIsLehrstuhl = (sRouteName === "finanzen" || sRouteName === "hr" || sRouteName === "pb");
			const bIsUnifinanzen = (sRouteName === "unifinanzen");
			// Show the shared main IconTabBar only for Lehrstuhl pages —
			// Unifinanzen has its own tab header in its view.
			oSidebarModel.setProperty("/showTabs", bIsLehrstuhl);

			const oTabBar = this.getView().byId("navTabBar");
			if (oTabBar && bIsLehrstuhl) {
				oTabBar.setSelectedKey(sRouteName);
				oSidebarModel.setProperty("/selectedKey", sRouteName);
			}

			// Update dynamic header title based on current route
			const oHeaderModel = this.getView().getModel("header");
			if (oHeaderModel) {
				if (sRouteName === "finanzen") {
					oHeaderModel.setProperty("/title", "Finanzdaten");
				} else if (sRouteName === "hr") {
					oHeaderModel.setProperty("/title", "Integrierte Personalsteuerung & Controlling");
				} else if (sRouteName === "pb") {
					oHeaderModel.setProperty("/title", "Publikationsdaten");
				} else if (sRouteName === "unifinanzen") {
					oHeaderModel.setProperty("/title", "Präsidium");
				}
			}

			// === Role-based sidebar population ===
			const oUserModel = this.getOwnerComponent().getModel("userModel");
			const iRole = oUserModel ? oUserModel.getProperty("/zugriffsrechte") : 0;
			const oNavList = this.getView().byId("sideNavList");

			if (iRole >= 2) {
				// Fakultätsfinanzen für Zugang 2 und 3
				if (!this._fakultaetsfinanzenItem) {
					this._fakultaetsfinanzenItem = new NavigationListItem({
						text: "Fakultät",
						icon: "sap-icon://education",
						key: "fakultaetsfinanzen"
					});
					oNavList.addItem(this._fakultaetsfinanzenItem);
				}
			}

			// Universitätsdaten nur für Zugang 3
			if (iRole === 3) {
				if (!this._unidatenItem) {
					// Use fixed Präsidium categories to match Unifinanzen view
					this._unidatenItem = new NavigationListItem({
						text: "Präsidium",
						icon: "sap-icon://building",
						key: "unifinanzen_alle"
					});

					const aPrAttributes = [
						{ text: "Finanzen", key: "pr_fi" },
						{ text: "Drittmittel", key: "pr_dm" },
						{ text: "Personal", key: "pr_hr" }
						];
						
					// keine unterpunkte
					/*
					aPrAttributes.forEach(c => {
						const oKatItem = new NavigationListItem({
							text: c.text,
							key: "unifinanzen_" + c.key
						});
						this._unidatenItem.addItem(oKatItem);
					});
					*/

					oNavList.addItem(this._unidatenItem);
				}
			} else if (iRole < 2) {
				// Kein Zugang: Dynamische Items entfernen
				if (this._fakultaetsfinanzenItem) {
					oNavList.removeItem(this._fakultaetsfinanzenItem);
					this._fakultaetsfinanzenItem.destroy();
					this._fakultaetsfinanzenItem = null;
				}
				if (this._unidatenItem) {
					oNavList.removeItem(this._unidatenItem);
					this._unidatenItem.destroy();
					this._unidatenItem = null;
				}
			}
		},

		/**
		 * Handles navigation item selection in the Fiori SideNavigation
		 */
		onSideNavItemSelect: function (oEvent) {
			const oItem = oEvent.getParameter("item");
			const sKey = oItem.getKey();

			if (sKey === "logout") {
				this.onLogoutPress();
				return;
			}

			// Klick auf Lehrstuhl-Parent → direkt zu Finanzen
			if (sKey === "lehrstuhl") {
				this.getOwnerComponent().getRouter().navTo("finanzen");
				return;
			}

			if (sKey === "finanzen" || sKey === "hr" || sKey === "pb") {
				this.getOwnerComponent().getRouter().navTo(sKey);
				return;
			}

			if (sKey === "fakultaetsfinanzen") {
				this.getOwnerComponent().getRouter().navTo("fakultaetsfinanzen");
				return;
			}

			if (sKey.startsWith("unifinanzen_")) {
				let sKategorie = decodeURIComponent(sKey.replace("unifinanzen_", ""));

				// Map Präsidium tab keys to human-readable category names used by Unifinanzen data
				const mPrMap = {
					pr_fi: "Finanzen",
					pr_dm: "Drittmittel",
					pr_hr: "Personal",
					alle: "alle"
				};

				if (mPrMap[sKategorie]) {
					sKategorie = mPrMap[sKategorie];
				}

				this.getOwnerComponent().getRouter().navTo("unifinanzen", {
					kategorie: encodeURIComponent(sKategorie)
				});
			}
		},

		onTabSelect: function (oEvent) {
			const sKey = oEvent.getParameter("key");
			this.getOwnerComponent().getRouter().navTo(sKey);
		},

		onNavBack: function () {
			this.getOwnerComponent().getRouter().navTo("login");
		},

		onToggleSidebar: function () {
			const oToolPage = this.getView().byId("toolPage");
			oToolPage.setSideExpanded(!oToolPage.getSideExpanded());
		},

		onToggleTheme: function () {
			const oThemeModel = this.getView().getModel("theme");
			const bDark = oThemeModel.getProperty("/dark");
			const bNewDark = !bDark;
			oThemeModel.setProperty("/dark", bNewDark);

			if (bNewDark) {
				Configuration.setTheme("sap_horizon_dark");
			} else {
				Configuration.setTheme("sap_horizon");
			}
		},

		onLogoutPress: function () {
			this.getView().getModel("sidebar").setProperty("/expanded", false);
			this.getOwnerComponent().getRouter().navTo("login");
		}
	});
});
