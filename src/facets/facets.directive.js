(function() {
    'use strict';

    angular.module('seco.facetedSearch')

    /*
    * Facet selector directive.
    */
    .directive('facetSelector', facetSelector);

    function facetSelector() {
        return {
            restrict: 'E',
            scope: {
                facets: '=',
                options: '=',
                disable: '='
            },
            controller: FacetListController,
            controllerAs: 'vm',
            templateUrl: 'src/facets/facets.directive.html'
        };
    }

    /*
    * Controller for the facet selector directive.
    */
    /* ngInject */
    function FacetListController($scope, $log, $q, _, Facets) {
        var vm = this;

        vm.facets = $scope.facets;

        vm.facetHandler = new Facets(vm.facets, $scope.options);
        vm.selectedFacets = vm.facetHandler.selectedFacets;
        vm.disabledFacets = vm.facetHandler.disabledFacets;
        vm.enabledFacets = vm.facetHandler.enabledFacets;

        vm.isDisabled = isDisabled;
        vm.changed = facetChanged;
        vm.clearTextFacet = clearTextFacet;
        vm.disableFacet = disableFacet;
        vm.enableFacet = enableFacet;

        vm.getFacetSize = getFacetSize;

        update();

        function isDisabled() {
            return vm.isLoadingFacets || $scope.disable();
        }

        function clearTextFacet(id) {
            if (vm.selectedFacets[id]) {
                vm.selectedFacets[id].value = undefined;
                return facetChanged(id);
            }
            return $q.when();
        }

        function facetChanged(id) {
            vm.isLoadingFacets = true;
            var promise = vm.facetHandler.facetChanged(id);
            return promise.then(handleUpdateSuccess, handleError);
        }

        function update() {
            vm.isLoadingFacets = true;
            return vm.facetHandler.update().then(handleUpdateSuccess, handleError);
        }

        function enableFacet(id) {
            vm.isLoadingFacets = true;
            return vm.facetHandler.enableFacet(id).then(handleUpdateSuccess, handleError);
        }

        function disableFacet(id) {
            vm.isLoadingFacets = true;
            return vm.facetHandler.disableFacet(id).then(handleUpdateSuccess, handleError);
        }

        function handleUpdateSuccess() {
            vm.isLoadingFacets = false;
        }

        function handleError(error) {
            vm.isLoadingFacets = false;
            $log.log(error);
            vm.error = error;
        }

        function getFacetSize( facetStates ) {
            if (facetStates) {
                return Math.min(facetStates.length + 2, 10).toString();
            }
            return '10';
        }
    }
})();
