(function() {
    'use strict';

    angular.module('seco.facetedSearch')

    .directive('secoTextFacet', textFacet);

    function textFacet() {
        return {
            restrict: 'E',
            scope: {
                options: '='
            },
            controller: 'TextFacetController',
            controllerAs: 'vm',
            templateUrl: 'src/facets/text/facets.text-facet.directive.html'
        };
    }
})();
