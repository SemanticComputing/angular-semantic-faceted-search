/*
 * facets module definition
 */
(function() {
    'use strict';

    angular.module('seco.facetedSearch', ['sparql', 'ui.bootstrap', 'angularSpinner'])
    .constant('_', _) // eslint-disable-line no-undef
    .constant('EVENT_REQUEST_CONSTRAINTS', 'sf-request-constraints')
    .constant('EVENT_INITIAL_CONSTRAINTS', 'sf-initial-constraints')
    .constant('EVENT_FACET_CHANGED', 'sf-facet-changed')
    .constant('EVENT_FACET_CONSTRAINTS', 'sf-facet-constraints')
    .constant('NO_SELECTION_STRING', '-- No Selection --');
})();

