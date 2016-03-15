/*
 * facets module definition
 */
(function() {
    'use strict';

    angular.module('facets', ['sparql', 'ui.bootstrap', 'angularSpinner'])
    .constant('_', _) // eslint-disable-line no-undef
    .constant('NO_SELECTION_STRING', '-- No Selection --');
})();

