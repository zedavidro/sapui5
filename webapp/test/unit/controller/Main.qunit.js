/* global QUnit */
sap.ui.define(["de/unigoettingen/dashboardapp/controller/Main.controller"], function (MainController) {
	"use strict";

	QUnit.module("Main Controller - Formatting");

	QUnit.test("Should format Euro values correctly", function (assert) {
		const oController = new MainController();
		assert.strictEqual(oController.formatEuro(123.456), "123.46 \u20ac", "Formats positive decimals");
		assert.strictEqual(oController.formatEuro(0), "0.00 \u20ac", "Formats zero");
		assert.strictEqual(oController.formatEuro(null), "", "Returns empty string for null");
		assert.strictEqual(oController.formatEuro(undefined), "", "Returns empty string for undefined");
		assert.strictEqual(oController.formatEuro(NaN), "", "Returns empty string for NaN");
	});
});
