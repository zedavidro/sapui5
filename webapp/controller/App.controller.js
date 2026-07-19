/**
 * App.controller.js — Controller der Wurzel-View (Shell)
 * - Läuft die ganze Session über (wird nicht beim Routenwechsel neu erzeugt)
 * - Zuständig für:
 *   - Sichtbarkeit/Zustand der Seitenleiste (ein-/ausgeklappt, welcher Menüpunkt aktiv ist)
 *   - Rollenbasierten Aufbau der Seitenleiste ("Fakultät"/"Präsidium" nur je nach Zugriffsrecht)
 *   - Die beiden "Popover-Ebenen"-Sonderfälle: Klick auf "Fakultät" (auf Präsidiumsebene)
 *     bzw. "Lehrstuhl" (auf Fakultätsebene) öffnet ein Auswahl-Popover statt direkt zu navigieren
 *   - Hell-/Dunkel-Modus, Logout, Navigation zwischen den Reitern
 */
sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/Configuration",
	"sap/tnt/NavigationListItem",
	"sap/m/Popover",
	"sap/m/List",
	"sap/m/StandardListItem"
], function (BaseController, JSONModel, Configuration, NavigationListItem, Popover, List, StandardListItem) {
	"use strict";

	return BaseController.extend("de.unigoettingen.dashboardapp.controller.App", {
		onInit: function () {
			// apply content density mode to root view
			// - Setzt Compact/Cozy-Modus abhängig vom Gerät (Desktop = kompakter, Touch = größer)
			this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());

			// Initialize sidebar model
			// - visible: Seitenleiste überhaupt sichtbar? (nicht auf der Login-Seite)
			// - expanded: aufgeklappt (breit) oder eingeklappt (nur Icons)?
			// - selectedKey: welcher Menüpunkt ist gerade markiert
			// - showTabs: gemeinsame Reiterleiste (Finanzen/Personal/Publikationen) einblenden?
			const oSidebarModel = new JSONModel({
				visible: false,
				expanded: false,
				selectedKey: "finanzen",
				showTabs: false
			});
			this.getView().setModel(oSidebarModel, "sidebar");

			// Initialize header model for the shared page title
			// - Dynamischer Seitentitel in der Kopfzeile, wird je nach Route gesetzt (siehe unten)
			const oHeaderModel = new JSONModel({
				title: ""
			});
			this.getView().setModel(oHeaderModel, "header");

			// Initialize theme model (defaulting to Light Mode)
			this.getView().setModel(new JSONModel({
				dark: false
			}), "theme");
			Configuration.setTheme("sap_horizon");

			// Fakultätenübersicht mit hinterlegten Lehrstühlen (nur WiWi hat aktuell Daten) –
			// wird auf der Präsidiumsebene über den Sidebar-Eintrag "Fakultät" angezeigt.
			// - key "wiwi" ist die einzige Fakultät mit echten Lehrstuhl-Daten und einer Navigation
			// - alle anderen Fakultäten haben eine leere lehrstuehle-Liste (nur Platzhalter)
			this.getView().setModel(new JSONModel({
				faculties: [
					{ key: "physik", name: "Fakultät für Physik", lehrstuehle: [] },
					{ key: "infomath", name: "Fakultät für Informatik und Mathematik", lehrstuehle: [] },
					{
						key: "wiwi",
						name: "Wirtschaftswissenschaftliche Fakultät",
						lehrstuehle: [
							{ professor: "Prof. Adam", lehrstuhl: "Lehrstuhl Smart Services" },
							{ professor: "Prof. Schumann", lehrstuhl: "Lehrstuhl für E-Business" },
							{ professor: "Prof. Weber", lehrstuhl: "Lehrstuhl KI-Forschung", route: "finanzen" }
						]
					}
				]
			}), "fakultaeten");

			// Lehrstuhlübersicht der Fakultät – wird auf der Fakultätsebene über den
			// Sidebar-Eintrag "Lehrstuhl" angezeigt (nur KI-Forschung hat aktuell eine Detailansicht).
			// - "route" gesetzt = per Klick im Popover navigierbar, sonst nur informativ (Inactive)
			this.getView().setModel(new JSONModel({
				lehrstuehle: [
					{ lehrstuhl: "Lehrstuhl Smart Services", professor: "Prof. Adam", route: null },
					{ lehrstuhl: "Lehrstuhl für E-Business", professor: "Prof. Schumann", route: null },
					{ lehrstuhl: "Lehrstuhl KI-Forschung", professor: "Prof. Weber", route: "finanzen" },
					{ lehrstuhl: "Lehrstuhl Makroökonomik", professor: "Prof. Wagner", route: null },
					{ lehrstuhl: "Lehrstuhl International Finances", professor: "Prof. Fischer", route: null },
					{ lehrstuhl: "Lehrstuhl Marketing", professor: "Prof. Neumann", route: null }
				]
			}), "sidebarLehrstuehle");

			// Attach router matching to display sidebar only outside login page
			// - Diese Funktion feuert bei JEDEM Seitenwechsel (nicht nur beim ersten Laden)
			this.getOwnerComponent().getRouter().attachRouteMatched(this.onRouteMatched, this);
		},

		/**
		 * Wird bei jedem Routenwechsel aufgerufen und synchronisiert:
		 * - Sichtbarkeit/Zustand der Seitenleiste
		 * - Auswahl in der gemeinsamen Reiterleiste
		 * - Seitentitel in der Kopfzeile
		 * - Rollenbasierten Aufbau der Seitenleiste (Fakultät/Präsidium ein-/ausblenden)
		 * - Sonderverhalten "Fakultät"/"Lehrstuhl" auf Präsidiums- bzw. Fakultätsebene
		 */
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
			// - bIsLehrstuhl: eine der drei "eigenen" Lehrstuhl-Seiten (Finanzen/Personal/Publikationen)
			// - bIsUnifinanzen: die Präsidiumsseite
			// - bIsFakultaetsebene: die Fakultätsfinanzen-Seite
			const bIsLehrstuhl = (sRouteName === "finanzen" || sRouteName === "hr" || sRouteName === "pb");
			const bIsUnifinanzen = (sRouteName === "unifinanzen");
			const bIsFakultaetsebene = (sRouteName === "fakultaetsfinanzen");
			// Show the shared main IconTabBar only for Lehrstuhl pages —
			// Unifinanzen has its own tab header in its view.
			oSidebarModel.setProperty("/showTabs", bIsLehrstuhl);

			const oTabBar = this.getView().byId("navTabBar");
			if (oTabBar && bIsLehrstuhl) {
				oTabBar.setSelectedKey(sRouteName);
				oSidebarModel.setProperty("/selectedKey", sRouteName);
			}

			// Update dynamic header title based on current route
			// - Jede Route bekommt hier ihre eigene Überschrift für die Kopfzeile
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
			// - Zugriffsrecht (Rolle) des eingeloggten Nutzers auslesen:
			//   0/1 = nur Lehrstuhl, 2 = zusätzlich Fakultät, 3 = zusätzlich Präsidium
			const oUserModel = this.getOwnerComponent().getModel("userModel");
			const iRole = oUserModel ? oUserModel.getProperty("/zugriffsrechte") : 0;
			const oNavList = this.getView().byId("sideNavList");

			if (iRole >= 2) {
				// Fakultätsfinanzen für Zugang 2 und 3
				// - Eintrag wird nur einmal erzeugt (Guard "!this._fakultaetsfinanzenItem")
				//   und ganz oben in die Liste eingefügt (Index 0)
				if (!this._fakultaetsfinanzenItem) {
					this._fakultaetsfinanzenItem = new NavigationListItem({
						text: "Fakultät",
						icon: "sap-icon://education",
						key: "fakultaetsfinanzen"
					});
					oNavList.insertItem(this._fakultaetsfinanzenItem, 0);
				}
			} else if (this._fakultaetsfinanzenItem) {
				// Zugriffsrecht wieder < 2 (z. B. nach Nutzerwechsel im selben Tab):
				// Eintrag wieder entfernen und zerstören, damit kein "Geister-Menüpunkt" bleibt
				oNavList.removeItem(this._fakultaetsfinanzenItem);
				this._fakultaetsfinanzenItem.destroy();
				this._fakultaetsfinanzenItem = null;
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
					// - Idee für Unterpunkte pro Präsidiums-Reiter, aktuell bewusst deaktiviert
					/*
					aPrAttributes.forEach(c => {
						const oKatItem = new NavigationListItem({
							text: c.text,
							key: "unifinanzen_" + c.key
						});
						this._unidatenItem.addItem(oKatItem);
					});
					*/

					oNavList.insertItem(this._unidatenItem, 0);
				}
			} else if (this._unidatenItem) {
				// Zugang < 3: Präsidium-Eintrag entfernen (unabhängig vom Fakultät-Zugang)
				oNavList.removeItem(this._unidatenItem);
				this._unidatenItem.destroy();
				this._unidatenItem = null;
			}

			// Auf der Fakultätsebene übernimmt der "Lehrstuhl"-Eintrag die Lehrstuhlübersicht
			// (Klick statt Navigation zu den eigenen Finanzen) – analog zur Präsidiumsebene unten.
			this._bIsFakultaetsebene = bIsFakultaetsebene;

			// Auf der Präsidiumsebene übernimmt der "Fakultät"-Eintrag die Fakultäten-Übersicht
			// (Klick statt Navigation, Hover zeigt die Lehrstühle) – der separate "Lehrstuhl"-Eintrag
			// ist dort redundant und wird ausgeblendet. Auf allen anderen Seiten bleibt alles wie gewohnt.
			// - Nur für Rolle 3 relevant, da nur diese Rolle die Präsidiumsseite überhaupt erreicht
			this._bIsPraesidiumsebene = (bIsUnifinanzen && iRole === 3);
			const oLehrstuhlItem = this.byId("lehrstuhlNavItem");
			if (oLehrstuhlItem) {
				const bCurrentlyInList = oNavList.indexOfItem(oLehrstuhlItem) !== -1;
				if (this._bIsPraesidiumsebene && bCurrentlyInList) {
					// Präsidiumsebene betreten: "Lehrstuhl"-Eintrag ausblenden
					oNavList.removeItem(oLehrstuhlItem);
				} else if (!this._bIsPraesidiumsebene && !bCurrentlyInList) {
					// Präsidiumsebene verlassen: "Lehrstuhl"-Eintrag wieder anzeigen
					oNavList.addItem(oLehrstuhlItem);
				}
			}
		},

		/**
		 * Handles navigation item selection in the Fiori SideNavigation
		 * - Zentrale Klick-Weiche für alle Einträge in der Seitenleiste
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
				if (this._bIsFakultaetsebene) {
					// Auf der Fakultätsebene: Lehrstuhl-Popover statt direkter Navigation
					this._openLehrstuhlMenuPopover(oItem);
					return;
				}
				this.getOwnerComponent().getRouter().navTo("finanzen");
				return;
			}

			if (sKey === "finanzen" || sKey === "hr" || sKey === "pb") {
				this.getOwnerComponent().getRouter().navTo(sKey);
				return;
			}

			if (sKey === "fakultaetsfinanzen") {
				if (this._bIsPraesidiumsebene) {
					// Auf der Präsidiumsebene: Fakultäten-Popover statt direkter Navigation
					this._openFakultaetenPopover(oItem);
					return;
				}
				this.getOwnerComponent().getRouter().navTo("fakultaetsfinanzen");
				return;
			}

			if (sKey.startsWith("unifinanzen_")) {
				// Klick auf "Präsidium" bzw. einen seiner (aktuell deaktivierten) Unterpunkte
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

		/**
		 * Öffnet das Fakultäten-Auswahl-Popover (Klick auf "Fakultät" auf der Präsidiumsebene).
		 * - Popover wird nur beim ersten Aufruf erzeugt und danach wiederverwendet
		 * - Liste ist datengebunden an das Modell "fakultaeten" (siehe onInit)
		 * - Nach dem Öffnen wird das Hover-Verhalten (siehe _attachFacultyHover) aktiviert
		 */
		_openFakultaetenPopover: function (oAnchor) {
			if (!this._oFacultyPopover) {
				this._oFacultyList = new List({
					mode: "None",
					items: {
						path: "fakultaeten>/faculties",
						template: new StandardListItem({
							title: "{fakultaeten>name}",
							icon: "sap-icon://building",
							type: "{= ${fakultaeten>key} === 'wiwi' ? 'Navigation' : 'Inactive' }"
						})
					}
				});
				this._oFacultyList.setModel(this.getView().getModel("fakultaeten"), "fakultaeten");
				this._oFacultyList.attachItemPress(this._onFacultyItemPress, this);

				this._oFacultyPopover = new Popover({
					placement: "Right",
					showHeader: false,
					content: [this._oFacultyList]
				});
				this._oFacultyPopover.attachAfterOpen(() => this._attachFacultyHover(this._oFacultyList));
				this.getView().addDependent(this._oFacultyPopover);
			}
			this._oFacultyPopover.openBy(oAnchor);
		},

		/**
		 * Klick auf eine Fakultät im Popover: nur die Wirtschaftswissenschaftliche Fakultät
		 * hat eine Zielseite (key === "wiwi") und navigiert dorthin; alle anderen sind inaktiv.
		 */
		_onFacultyItemPress: function (oEvent) {
			const oContext = oEvent.getParameter("listItem").getBindingContext("fakultaeten");
			if (oContext.getProperty("key") === "wiwi") {
				this._oFacultyPopover.close();
				this.getOwnerComponent().getRouter().navTo("fakultaetsfinanzen");
			}
		},

		/**
		 * Hängt an jedes Listenelement einen Hover-Timer (2 Sekunden): bleibt die Maus
		 * so lange über einer Fakultät, öffnet sich die Lehrstuhl-Vorschau (siehe unten).
		 * - dataset.hoverBound verhindert doppeltes Anhängen des Listeners bei erneutem Öffnen
		 */
		_attachFacultyHover: function (oList) {
			if (!oList) {
				return;
			}
			oList.getItems().forEach((oItem) => {
				const oDomRef = oItem.getDomRef();
				if (!oDomRef || oDomRef.dataset.hoverBound) {
					return;
				}
				oDomRef.dataset.hoverBound = "true";
				let iTimer;
				oDomRef.addEventListener("mouseenter", () => {
					iTimer = setTimeout(() => this._showLehrstuhlPopover(oItem), 2000);
				});
				oDomRef.addEventListener("mouseleave", () => {
					clearTimeout(iTimer);
				});
			});
		},

		/**
		 * Zeigt ein zweites (verschachteltes) Popover mit den Lehrstühlen der gehoverten Fakultät.
		 * - Ohne Lehrstuhl-Daten (Physik, Informatik/Mathematik): Hinweistext statt Liste
		 * - Mit Daten: pro Lehrstuhl ein Eintrag, klickbar nur wenn "route" gesetzt ist
		 *   (aktuell nur Lehrstuhl KI-Forschung → navigiert zu den Lehrstuhlfinanzen)
		 */
		_showLehrstuhlPopover: function (oItem) {
			const oContext = oItem.getBindingContext("fakultaeten");
			const sName = oContext.getProperty("name");
			const aLehrstuehle = oContext.getProperty("lehrstuehle") || [];

			if (!this._oLehrstuhlPreviewPopover) {
				this._oLehrstuhlPreviewList = new List();
				this._oLehrstuhlPreviewPopover = new Popover({
					placement: "Right",
					content: [this._oLehrstuhlPreviewList]
				});
				this.getView().addDependent(this._oLehrstuhlPreviewPopover);
			}

			this._oLehrstuhlPreviewPopover.setTitle(sName);
			this._oLehrstuhlPreviewList.destroyItems();

			if (aLehrstuehle.length === 0) {
				this._oLehrstuhlPreviewList.addItem(new StandardListItem({
					title: "Keine Lehrstuhldaten verfügbar",
					icon: "sap-icon://message-information"
				}));
			} else {
				aLehrstuehle.forEach((o) => {
					const oListItem = new StandardListItem({
						title: o.lehrstuhl,
						description: o.professor,
						icon: "sap-icon://education",
						type: o.route ? "Navigation" : "Inactive"
					});
					if (o.route) {
						oListItem.attachPress(() => {
							// Beide Popover-Ebenen schließen, bevor navigiert wird
							this._oLehrstuhlPreviewPopover.close();
							if (this._oFacultyPopover) {
								this._oFacultyPopover.close();
							}
							this.getOwnerComponent().getRouter().navTo(o.route);
						});
					}
					this._oLehrstuhlPreviewList.addItem(oListItem);
				});
			}

			this._oLehrstuhlPreviewPopover.openBy(oItem);
		},

		/**
		 * Öffnet das Lehrstuhl-Auswahl-Popover (Klick auf "Lehrstuhl" auf der Fakultätsebene).
		 * - Analog zu _openFakultaetenPopover, nur eine Ebene tiefer: hier direkt die Lehrstühle
		 * - Liste ist datengebunden an das Modell "sidebarLehrstuehle" (siehe onInit)
		 * - Nur der Lehrstuhl mit gesetzter "route" (aktuell KI-Forschung) ist klickbar/navigierbar
		 */
		_openLehrstuhlMenuPopover: function (oAnchor) {
			if (!this._oLehrstuhlMenuPopover) {
				this._oLehrstuhlMenuList = new List({
					mode: "None",
					items: {
						path: "sidebarLehrstuehle>/lehrstuehle",
						template: new StandardListItem({
							title: "{sidebarLehrstuehle>lehrstuhl}",
							description: "{sidebarLehrstuehle>professor}",
							icon: "sap-icon://education",
							type: "{= ${sidebarLehrstuehle>route} ? 'Navigation' : 'Inactive' }"
						})
					}
				});
				this._oLehrstuhlMenuList.setModel(this.getView().getModel("sidebarLehrstuehle"), "sidebarLehrstuehle");
				this._oLehrstuhlMenuList.attachItemPress((oEv) => {
					const oContext = oEv.getParameter("listItem").getBindingContext("sidebarLehrstuehle");
					const sRoute = oContext ? oContext.getProperty("route") : null;
					if (sRoute) {
						this._oLehrstuhlMenuPopover.close();
						this.getOwnerComponent().getRouter().navTo(sRoute);
					}
				});

				this._oLehrstuhlMenuPopover = new Popover({
					placement: "Right",
					showHeader: false,
					content: [this._oLehrstuhlMenuList]
				});
				this.getView().addDependent(this._oLehrstuhlMenuPopover);
			}
			this._oLehrstuhlMenuPopover.openBy(oAnchor);
		},

		// Klick auf einen Reiter der gemeinsamen IconTabBar → einfache 1:1-Navigation zur Route
		onTabSelect: function (oEvent) {
			const sKey = oEvent.getParameter("key");
			this.getOwnerComponent().getRouter().navTo(sKey);
		},

		// "Zurück"-Funktion: führt immer zur Login-Seite zurück
		onNavBack: function () {
			this.getOwnerComponent().getRouter().navTo("login");
		},

		// Seitenleiste auf-/zuklappen (Button oben links in der Kopfzeile)
		onToggleSidebar: function () {
			const oToolPage = this.getView().byId("toolPage");
			oToolPage.setSideExpanded(!oToolPage.getSideExpanded());
		},

		// Hell-/Dunkel-Modus umschalten und das entsprechende UI5-Theme aktivieren
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

		// Logout: Seitenleiste einklappen und zurück zur Login-Seite navigieren
		onLogoutPress: function () {
			this.getView().getModel("sidebar").setProperty("/expanded", false);
			this.getOwnerComponent().getRouter().navTo("login");
		}
	});
});
