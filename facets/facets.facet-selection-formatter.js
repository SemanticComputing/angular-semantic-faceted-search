(function() {

    'use strict';

    /* eslint-disable angular/no-service-method */
    angular.module('facets')
    .factory('FacetSelectionFormatter', function (_) {
        return function( facets ) {

            this.parseFacetSelections = parseFacetSelections;

            function parseFacetSelections( facetSelections ) {
                var result = '';
                var i = 0;
                _.forOwn( facetSelections, function( val, key ) {
                    if (val && val.value && facets[key].type === 'text') {
                        var textVar = '?text' + i++;
                        result = result + '?s ' + key + ' ' + textVar;
                        result = result + ' FILTER(REGEX(' + textVar + ', "' + val.value + '", "i")) ';
                    }
                    else if (val && val.value) {
                        result = result + '?s ' + key + ' ' + val.value + ' . ';
                    }
                });
                return result;
            }
        };
    });
})();
