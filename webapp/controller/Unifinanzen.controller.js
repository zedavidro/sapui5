sap.ui.define([
	"de/unigoettingen/dashboardapp/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/Popover",
	"sap/m/List",
	"sap/m/StandardListItem"
], function (BaseController, JSONModel, Filter, FilterOperator, Popover, List, StandardListItem) {
	"use strict";

	return BaseController.extend("de.unigoettingen.dashboardapp.controller.Unifinanzen", {

		onInit: function () {
			
			    this.getView().setModel(
        new sap.ui.model.json.JSONModel({
            selectedTab: "pr_fi"
        }),
        "view"
		
    );

			// Mock data for Drittmittel stacked bar chart (in Mio. €)
			const oDrittmittelChart = new JSONModel({
				data: [
					{ jahr: "2022", dfg: 10.2, bmbf: 10.0, eu: 6.1, stiftungen: 4.2, industrie: 10.2, sonstige: 6.2 },
					{ jahr: "2023", dfg: 10.4, bmbf: 10.1, eu: 8.2, stiftungen: 5.7, industrie: 10.4, sonstige: 4.3 },
					{ jahr: "2024", dfg: 10.6, bmbf: 10.3, eu: 10.0, stiftungen: 6.5, industrie: 10.6, sonstige: 1.6 },
					{ jahr: "2025", dfg: 10.8, bmbf: 10.4, eu: 10.2, stiftungen: 7.0, industrie: 10.5, sonstige: 2.5 }
				]
			});
			this.getView().setModel(oDrittmittelChart, "drittmittelChart");

			// Fakultätenübersicht mit hinterlegten Lehrstühlen (nur WiWi hat aktuell Daten)
			this.getView().setModel(new JSONModel({
				faculties: [
					{ key: "physik", name: "Fakultät für Physik", lehrstuehle: [] },
					{ key: "infomath", name: "Fakultät für Informatik und Mathematik", lehrstuehle: [] },
					{
						key: "wiwi",
						name: "Wirtschaftswissenschaftliche Fakultät",
						lehrstuehle: [
							{ professor: "Prof. Müller", lehrstuhl: "Lehrstuhl Smart Services" },
							{ professor: "Prof. Schmidt", lehrstuhl: "Lehrstuhl für E-Business" },
							{ professor: "Prof. Weber", lehrstuhl: "Lehrstuhl KI-Forschung", route: "finanzen" }
						]
					}
				]
			}), "fakultaeten");

			this.getRouter().getRoute("unifinanzen").attachMatched(this._onRouteMatched, this);
		},

		onAfterRendering: function () {
			const oViz = this.byId("drittmittelViz");
			if (oViz) {
				oViz.setVizProperties({
					title: { visible: true, text: "Drittmittel 2022–2025 (Mio. €)" },
					plotArea: { colorPalette: ['#cfe8ff', '#9fd1ff', '#6fb9ff', '#3f9fff', '#0f87ff', '#0066cc'] },
					valueAxis: { title: { visible: true, text: 'Mio. €' } }
				});
			}
		},

		onFacultyMenuPress: function (oEvent) {
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
					placement: "Bottom",
					showHeader: false,
					content: [this._oFacultyList]
				});
				this._oFacultyPopover.attachAfterOpen(() => this._attachFacultyHover(this._oFacultyList));
				this.getView().addDependent(this._oFacultyPopover);
			}
			this._oFacultyPopover.openBy(oEvent.getSource());
		},

		_onFacultyItemPress: function (oEvent) {
			const oContext = oEvent.getParameter("listItem").getBindingContext("fakultaeten");
			if (oContext.getProperty("key") === "wiwi") {
				this._oFacultyPopover.close();
				this.navTo("fakultaetsfinanzen");
			}
		},

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

		_showLehrstuhlPopover: function (oItem) {
			const oContext = oItem.getBindingContext("fakultaeten");
			const sName = oContext.getProperty("name");
			const aLehrstuehle = oContext.getProperty("lehrstuehle") || [];

			if (!this._oLehrstuhlPopover) {
				this._oLehrstuhlList = new List();
				this._oLehrstuhlPopover = new Popover({
					placement: "Right",
					content: [this._oLehrstuhlList]
				});
				this.getView().addDependent(this._oLehrstuhlPopover);
			}

			this._oLehrstuhlPopover.setTitle(sName);
			this._oLehrstuhlList.destroyItems();

			if (aLehrstuehle.length === 0) {
				this._oLehrstuhlList.addItem(new StandardListItem({
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
							this._oLehrstuhlPopover.close();
							if (this._oFacultyPopover) {
								this._oFacultyPopover.close();
							}
							this.navTo(o.route);
						});
					}
					this._oLehrstuhlList.addItem(oListItem);
				});
			}

			this._oLehrstuhlPopover.openBy(oItem);
		},

		onTabSelect: function (oEvent) {
    const key = oEvent.getParameter("key");

    this.getView()
        .getModel("view")
        .setProperty("/selectedTab", key);
},

onFacultyPress: function (oEvent) {
    const sFaculty = oEvent.getSource().getText();

    this.getOwnerComponent().getRouter().getRoute("finanzen").attachPatternMatched(this._onRouteMatched, this);
},

		_onRouteMatched: function (oEvent) {
			const oUserModel = this.getOwnerComponent().getModel("userModel");
			const iRole = oUserModel ? oUserModel.getProperty("/zugriffsrechte") : 0;
			if (iRole < 3) {
				this.getOwnerComponent().getRouter().navTo("login");
				return;
			}
			
			const oArgs = oEvent.getParameter("arguments");
			this._kategorieFilter = oArgs.kategorie;

			// Map route category names to tab keys (if a Präsidium tab was selected)
			const mMap = {
				Finanzen: "pr_fi",
				Drittmittel: "pr_dm",
				Personal: "pr_hr",
				alle: "pr_fi"
			};

			if (this._kategorieFilter) {
				const sDecoded = decodeURIComponent(this._kategorieFilter);
				const sTabKey = mMap[sDecoded];
				if (sTabKey) {
					this.getView().getModel("view").setProperty("/selectedTab", sTabKey);
				}
			}

			// Lade die Finanzen vom Backend, wenn die Route aufgerufen wird
			this._loadFinanzenData();
		},

		_loadFinanzenData: function () {
			const oView = this.getView();
			oView.setBusy(true);

			fetch("http://localhost:3000/api/unifinanzen")
				.then(response => response.json())
				.then(data => {
					const oModel = new JSONModel({
						data: data.unifinanzen
					});
					oView.setModel(oModel, "unifinanzen");
					
					// Wende Kategorie-Filter an, falls spezifiziert
					this._applyKategorieFilter();
					
					oView.setBusy(false);
				})
				.catch(error => {
					console.error("Fehler beim Laden der Unifinanzen:", error);
					oView.setBusy(false);
				});
		},

		_applyKategorieFilter: function () {
			const oChart = this.byId("unifinanzenChart");
			const oDataset = oChart.getDataset();
			if (!oDataset) return;
			const oBinding = oDataset.getBinding("data");
			if (!oBinding) return;

			let sKategorieText = "Universitätsdaten (Gesamt)";
			let aFiltered = this.getView().getModel("unifinanzen").getProperty("/data");

			if (this._kategorieFilter && this._kategorieFilter !== "alle") {
				const sKategorie = decodeURIComponent(this._kategorieFilter);
				sKategorieText = sKategorie;
				const filterHaupt = new Filter("hauptkategorie", FilterOperator.EQ, sKategorie);
				const filterUnter = new Filter("unterkategorie", FilterOperator.EQ, sKategorie);
				const oFilter = new Filter({
					filters: [filterHaupt, filterUnter],
					and: false
				});
				oBinding.filter([oFilter], "Application");
				aFiltered = aFiltered.filter(item => item.hauptkategorie === sKategorie || item.unterkategorie === sKategorie);
			} else {
				// Wenn 'alle', dann keine Filter
				oBinding.filter([], "Application");
			}

			// Trend berechnen
			const oYearSums = {};
			aFiltered.forEach(item => {
				if (!oYearSums[item.jahr]) oYearSums[item.jahr] = 0;
				oYearSums[item.jahr] += item.wert;
			});

			const aYears = Object.keys(oYearSums).sort();
			let bShowIcon = false;
			let sIconSrc = "";
			let sIconColor = "";

			if (aYears.length >= 2) {
				const lastYear = aYears[aYears.length - 1];
				const prevYear = aYears[aYears.length - 2];
				const diff = oYearSums[lastYear] - oYearSums[prevYear];
				
				if (diff > 0) {
					bShowIcon = true;
					sIconSrc = "sap-icon://trend-up";
					sIconColor = "Positive"; // Green
				} else if (diff < 0) {
					bShowIcon = true;
					sIconSrc = "sap-icon://trend-down";
					sIconColor = "Negative"; // Red
				}
			}

			// Update UI5 Controls
			const oTitle = this.byId("chartDynamicTitle");
			if (oTitle) oTitle.setText(sKategorieText);

			const oIcon = this.byId("chartTrendIcon");
			if (oIcon) {
				oIcon.setVisible(bShowIcon);
				if (bShowIcon) {
					oIcon.setSrc(sIconSrc);
					oIcon.setColor(sIconColor);
				}
			}

			// Stelle sicher, dass der interne Chart-Titel versteckt bleibt
			oChart.setVizProperties({
				title: { visible: false }
			});
		},

		onSearch: function (oEvent) {
			const aFilters = [];
			const sQuery = oEvent.getSource().getValue();
			if (sQuery && sQuery.length > 0) {
				const filterHaupt = new Filter("hauptkategorie", FilterOperator.Contains, sQuery);
				const filterUnter = new Filter("unterkategorie", FilterOperator.Contains, sQuery);
				aFilters.push(new Filter({
					filters: [filterHaupt, filterUnter],
					and: false
				}));
			}

			// Update des Chart-Bindings
			const oChart = this.byId("unifinanzenChart");
			const oDataset = oChart.getDataset();
			if (!oDataset) return;
			const oBinding = oDataset.getBinding("data");
			oBinding.filter(aFilters, "Application");
		}
	});
});
