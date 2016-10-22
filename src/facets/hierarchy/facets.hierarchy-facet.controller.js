(function() {
    'use strict';

    angular.module('seco.facetedSearch')
    .controller('HierarchyFacetController', HierarchyFacetController);

    /* ngInject */
    function HierarchyFacetController($scope, $controller, HierarchyFacet) {
        var vm = this;
        var args = { $scope: $scope, FacetImpl: HierarchyFacet };
        angular.extend(vm, $controller('AbstractFacetController', args));
    }
})();
