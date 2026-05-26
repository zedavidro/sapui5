sap.ui.define(function () {
	"use strict";

	return {
		name: "QUnit test suite for the UI5 Application: de.unigoettingen.dashboardapp",
		defaults: {
			page: "ui5://test-resources/de/unigoettingen/dashboardapp/Test.qunit.html?testsuite={suite}&test={name}",
			qunit: {
				version: 2
			},
			sinon: {
				version: 1
			},
			ui5: {
				language: "EN",
				theme: "sap_horizon"
			},
			coverage: {
				only: "de/unigoettingen/dashboardapp/",
				never: "test-resources/de/unigoettingen/dashboardapp/"
			},
			loader: {
				paths: {
					"de/unigoettingen/dashboardapp": "../"
				}
			}
		},
		tests: {
			"unit/unitTests": {
				title: "Unit tests for de.unigoettingen.dashboardapp"
			},
			"integration/opaTests": {
				title: "Integration tests for de.unigoettingen.dashboardapp"
			}
		}
	};
});
