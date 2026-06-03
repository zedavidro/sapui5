sap.ui.define([], function () {
    "use strict";

    return {
        // Berechtigungsstufen
        Roles: {
            PRESIDIUM: 3,
            FACULTY: 2,
            CHAIR: 1
        },

        /**
         * @param {number} viewerRole Die Rechte des Benutzers
         * @param {number} requiredRole Die Rechte, die mindestens benötigt werden
         * @returns {boolean} true wenn der Zugriff gestattet ist
         */
        canView: function (viewerRole, requiredRole) {
            if (viewerRole === undefined || requiredRole === undefined || viewerRole === null || requiredRole === null) {
                return false;
            }

            return viewerRole >= requiredRole;
        }
    };
});
