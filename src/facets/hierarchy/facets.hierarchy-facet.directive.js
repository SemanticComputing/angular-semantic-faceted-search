(function() {
    'use strict';

    angular.module('seco.facetedSearch')

    .directive('secoHierarchyFacet', hierarchyFacet);

    function hierarchyFacet() {
        return {
            restrict: 'E',
            scope: {
                options: '='
            },
            controller: 'HierarchyFacetController',
            controllerAs: 'vm',
            templateUrl: 'src/facets/basic/facets.basic-facet.directive.html'
        };
    }
})();
