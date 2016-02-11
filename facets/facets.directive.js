(function() {
    'use strict';

    angular.module('facets')

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
            templateUrl: 'facets/facets.directive.html'
        };
    }

    /*
    * Controller for the facet selector directive.
    */
    /* ngInject */
    function FacetListController( $scope, $log, _, Facets ) {
        var vm = this;

        vm.facets = $scope.facets;

        vm.facetHandler = new Facets(vm.facets, $scope.options);

        vm.selectedFacets = vm.facetHandler.selectedFacets;
        vm.isDisabled = isDisabled;
        vm.changed = facetChanged;

        vm.getFacetSize = getFacetSize;

        update();

        function isDisabled() {
            return vm.isLoadingFacets || $scope.disable();
        }

        function facetChanged(id) {
            vm.isLoadingFacets = true;
            return vm.facetHandler.facetChanged(id)
                .then(handleUpdateSuccess, handleError);
        }

        function update() {
            vm.isLoadingFacets = true;
            return vm.facetHandler.update().then(handleUpdateSuccess, handleError);
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
