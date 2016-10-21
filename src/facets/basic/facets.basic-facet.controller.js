(function() {
    'use strict';

    angular.module('seco.facetedSearch')
    .controller('BasicFacetController', BasicFacetController);

    /* ngInject */
    function BasicFacetController($scope, $controller, $log, $q, _, BasicFacet) {
        var vm = this;
        var args = { $scope: $scope, FacetImpl: BasicFacet };
        angular.extend(vm, $controller('AbstractFacetController', args));
    }
})();
