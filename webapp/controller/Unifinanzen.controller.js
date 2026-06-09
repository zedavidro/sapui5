sap.ui.define([
	"de/unigoettingen/dashboardapp/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function (BaseController, JSONModel, Filter, FilterOperator) {
	"use strict";

	return BaseController.extend("de.unigoettingen.dashboardapp.controller.Unifinanzen", {

		onInit: function () {
			this.getRouter().getRoute("unifinanzen").attachMatched(this._onRouteMatched, this);
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
