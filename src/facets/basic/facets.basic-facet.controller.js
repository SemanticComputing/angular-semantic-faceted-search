(function() {
    'use strict';

    angular.module('seco.facetedSearch')
    .controller('BasicFacetController', BasicFacetController);

    /* ngInject */
    function BasicFacetController($scope, $log, $q, _, BasicFacet, BasicFacetService) {

        var vm = this;
        var service = new BasicFacetService($scope, BasicFacet);

        vm.isDisabled = service.isDisabled;
        vm.changed = service.changed;
        vm.enableFacet = service.enableFacet;
        vm.disableFacet = service.disableFacet;
        vm.getFacetSize = service.getFacetSize;
        vm.getFacet = service.getFacet;
    }
})();
