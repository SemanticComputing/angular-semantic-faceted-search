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
                updateResults: '=',
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
    function FacetListController( $scope, _, Facets ) {
        var vm = this;

        vm.facets = $scope.facets;
        vm.selectedFacets = {};
        vm.previousSelections = _.clone(vm.facets);

        vm.isDisabled = isDisabled;

        vm.changed = facetChanged;

        vm.facetHandler = new Facets(vm.facets, $scope.options);

        vm.getFacetSize = function( facetStates ) {
            if (facetStates) {
                return Math.min(facetStates.length + 2, 10).toString();
            }
            return '10';
        };

        update();

        function facetChanged(id) {
            var selectedFacet = vm.selectedFacets[id];
            if (selectedFacet) {
                if (vm.previousSelections[id].value !== selectedFacet.value) {
                    vm.previousSelections[id] = _.clone(selectedFacet);
                    update();
                }
            } else {
                var prev = {
                    id: id,
                    values: [_.clone(vm.previousSelections[id])]
                };
                vm.facets[id].state = prev;
                vm.selectedFacets[id] = _.clone(vm.previousSelections[id]);
            }
        }

        function isDisabled() {
            return vm.isLoadingFacets || $scope.disable();
        }

        function update() {
            vm.isLoadingFacets = true;
            vm.facetHandler.getStates( vm.selectedFacets ).then( function ( states ) {
                _.forOwn(vm.facets, function (facet, key) {
                    facet.state = _.find(states, ['id', key]);
                });
                vm.isLoadingFacets = false;
            });

            $scope.updateResults(vm.selectedFacets);
        }

    }
})();
