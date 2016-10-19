(function() {
    'use strict';

    angular.module('seco.facetedSearch')

    .directive('secoBasicFacet', basicFacet);

    function basicFacet() {
        return {
            restrict: 'E',
            scope: {
                options: '='
            },
            controller: 'BasicFacetController',
            controllerAs: 'vm',
            templateUrl: 'src/facets/basic/facets.basic-facet.directive.html'
        };
    }
})();
