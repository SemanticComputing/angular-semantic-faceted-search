(function() {

    'use strict';

    /* eslint-disable angular/no-service-method */
    angular.module('facets')
    .service('facetSelectionFormatter', function (_) {
        this.parseFacetSelections = function ( facetSelections ) {
            var result = '';
            _.forOwn( facetSelections, function( val, key ) {
                if (val) {
                    result = result + '?s ' + key + ' ' + val.value + ' .';
                }
            });
            return result;
        };
    });
})();
