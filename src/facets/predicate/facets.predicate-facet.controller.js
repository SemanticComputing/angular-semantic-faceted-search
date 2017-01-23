(function() {
    'use strict';

    angular.module('seco.facetedSearch')
    .controller('PredicateFacetController', PredicateFacetController);

    /* ngInject */
    function PredicateFacetController($scope, $controller, PredicateFacet) {
        var args = { $scope: $scope, FacetImpl: PredicateFacet };
        return $controller('AbstractFacetController', args);
    }
})();
