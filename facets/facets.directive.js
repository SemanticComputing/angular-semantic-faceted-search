/*
* Facet handler service.
*/
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
                options: '='
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

        vm.facetHandler = new Facets(vm.facets, $scope.options);

        vm.getFacetSize = function( facetStates ) {
            if (facetStates) {
                return Math.min(facetStates.length + 2, 10).toString();
            }
            return '10';
        };

        $scope.$watch(function() { return vm.selectedFacets; }, function(val) {
            vm.facetHandler.getStates( val ).then( function ( states ) {
                _.forOwn(vm.facets, function (facet, key) {
                    facet.state = _.find(states, ['id', key]);
                });
            });

            $scope.updateResults(vm.selectedFacets);
        }, true);
    }
})();
