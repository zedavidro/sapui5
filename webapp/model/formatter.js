sap.ui.define(function () {
    "use strict";

    return {

        formatValue: function (value) {
            return value && value.toUpperCase();
        },

        formatNumber: function (value) {
			if (value === null || value === undefined || isNaN(value)) {
				return "";
			}

			var absValue = Math.abs(value);
			var formatter;

			if (absValue >= 1000000000) {
				formatter = new Intl.NumberFormat("de-DE", {
					minimumFractionDigits: 1,
					maximumFractionDigits: 1
				});
				return formatter.format(value / 1000000000);
			}

			if (absValue >= 1000000) {
				formatter = new Intl.NumberFormat("de-DE", {
					minimumFractionDigits: 1,
					maximumFractionDigits: 1
				});
				return formatter.format(value / 1000000);
			}

			formatter = new Intl.NumberFormat("de-DE", {
				maximumFractionDigits: 0
			});

			return formatter.format(value);
		},

        formatScale: function (value) {
            if (value === null || value === undefined || isNaN(value)) {
                return "";
            }

            var absValue = Math.abs(value);

            if (absValue >= 1000000000) {
                return "Mrd. €";
            }

            if (absValue >= 1000000) {
                return "Mio. €";
            }

            return "€";
        },

		formatObligoFooter: function (obligo, budget) {
			if (!obligo || !budget) {
				return "";
			}

			const percent = (obligo / budget * 100).toFixed(1);

			return percent + "% des Budgets gebunden";
		},

		formatRestFooter: function (rest, budget) {
			if (!rest || !budget) {
				return "";
			}

			const percent = (rest / budget * 100).toFixed(1);

			return percent + "% Budgetspielraum";
		}

    };
});