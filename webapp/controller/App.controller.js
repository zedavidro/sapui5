sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/Configuration"
], function (BaseController, JSONModel, Configuration) {
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
			this.getView().addStyleClass("theme-light");
			Configuration.setTheme("sap_horizon");

			// Attach router matching to display sidebar only outside login page
			this.getOwnerComponent().getRouter().attachRouteMatched(this.onRouteMatched, this);

			// Attach window resize listener for the sliding tab indicator
			window.addEventListener("resize", this._updateTabSlider.bind(this));
		},

		onRouteMatched: function (oEvent) {
			const sRouteName = oEvent.getParameter("name");
			// Hide sidebar on login page, show on all other pages
			const bShowSidebar = sRouteName !== "login";
			this.getView().getModel("sidebar").setProperty("/visible", bShowSidebar);
			this.getView().getModel("sidebar").setProperty("/expanded", false);

			const oSidebar = this.getView().byId("expandedSidebar");
			if (oSidebar) {
				oSidebar.removeStyleClass("open");
			}

			if (this._fnDocumentClick) {
				document.removeEventListener("mousedown", this._fnDocumentClick);
				this._fnDocumentClick = null;
			}

			// Synchronize selected tab with route name
			const oTabBar = this.getView().byId("navTabBar");
			if (oTabBar && (sRouteName === "finanzen" || sRouteName === "hr" || sRouteName === "pb")) {
				oTabBar.setSelectedKey(sRouteName);
				// Update slider position after render
				setTimeout(this._updateTabSlider.bind(this), 0);
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
				}
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
			const oModel = this.getView().getModel("sidebar");
			const bExpanded = oModel.getProperty("/expanded");
			const bNewExpanded = !bExpanded;
			oModel.setProperty("/expanded", bNewExpanded);

			const oSidebar = this.getView().byId("expandedSidebar");
			if (oSidebar) {
				if (bNewExpanded) {
					oSidebar.addStyleClass("open");
				} else {
					oSidebar.removeStyleClass("open");
				}
			}

			// Update slider position as sidebar width transitions
			setTimeout(this._updateTabSlider.bind(this), 50);
			setTimeout(this._updateTabSlider.bind(this), 150);
			setTimeout(this._updateTabSlider.bind(this), 300);

			// Trigger a global resize event to update other views' sliders
			setTimeout(function () { window.dispatchEvent(new Event("resize")); }, 50);
			setTimeout(function () { window.dispatchEvent(new Event("resize")); }, 150);
			setTimeout(function () { window.dispatchEvent(new Event("resize")); }, 300);

			if (!bExpanded) {
				if (!this._fnDocumentClick) {
					this._fnDocumentClick = this._onDocumentClick.bind(this);
				}
				setTimeout(function () {
					document.addEventListener("mousedown", this._fnDocumentClick);
				}.bind(this), 0);
			} else if (this._fnDocumentClick) {
				document.removeEventListener("mousedown", this._fnDocumentClick);
				this._fnDocumentClick = null;
			}
		},

		_onDocumentClick: function (oEvent) {
			const oSidebarModel = this.getView().getModel("sidebar");
			if (!oSidebarModel.getProperty("/expanded")) {
				return;
			}

			const oExpandedSidebarDom = this.getView().byId("expandedSidebar").getDomRef();
			const oThinSidebarDom = this.getView().byId("thinSidebar").getDomRef();
			const oTarget = oEvent.target;

			if (oExpandedSidebarDom && !oExpandedSidebarDom.contains(oTarget) &&
				oThinSidebarDom && !oThinSidebarDom.contains(oTarget)) {
				oSidebarModel.setProperty("/expanded", false);

				const oSidebar = this.getView().byId("expandedSidebar");
				if (oSidebar) {
					oSidebar.removeStyleClass("open");
				}
				if (this._fnDocumentClick) {
					document.removeEventListener("mousedown", this._fnDocumentClick);
					this._fnDocumentClick = null;
				}
				// Update slider position as sidebar transitions closed
				setTimeout(this._updateTabSlider.bind(this), 150);
				setTimeout(this._updateTabSlider.bind(this), 300);

				// Trigger a global resize event to update other views' sliders
				setTimeout(function () { window.dispatchEvent(new Event("resize")); }, 150);
				setTimeout(function () { window.dispatchEvent(new Event("resize")); }, 300);
			}
		},
		onToggleTheme: function () {
			const oThemeModel = this.getView().getModel("theme");
			const bDark = oThemeModel.getProperty("/dark");
			const bNewDark = !bDark;
			oThemeModel.setProperty("/dark", bNewDark);

			const oRoot = this.getView();
			if (bNewDark) {
				oRoot.addStyleClass("theme-dark");
				oRoot.removeStyleClass("theme-light");
				Configuration.setTheme("sap_horizon_dark");
			} else {
				oRoot.addStyleClass("theme-light");
				oRoot.removeStyleClass("theme-dark");
				Configuration.setTheme("sap_horizon");
			}
			// Update slider position after theme rendering
			setTimeout(this._updateTabSlider.bind(this), 100);
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
			const oSidebar = this.getView().byId("expandedSidebar");
			if (oSidebar) {
				oSidebar.removeStyleClass("open");
			}
			if (this._fnDocumentClick) {
				document.removeEventListener("mousedown", this._fnDocumentClick);
				this._fnDocumentClick = null;
			}
			this.getOwnerComponent().getRouter().navTo("login");
		},

		_updateTabSlider: function () {
			const oTabBar = this.getView().byId("navTabBar");
			if (!oTabBar) {
				return;
			}
			const oTabBarDom = oTabBar.getDomRef();
			if (!oTabBarDom) {
				// Dom not ready yet, retry in next frame
				setTimeout(this._updateTabSlider.bind(this), 50);
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

		_getOffsetLeft: function (oEl, oParent) {
			let nLeft = 0;
			while (oEl && oEl !== oParent) {
				nLeft += oEl.offsetLeft;
				oEl = oEl.offsetParent;
			}
			return nLeft;
		},

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
