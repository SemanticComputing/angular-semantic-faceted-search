(function() {
    'use strict';

    angular.module('seco.facetedSearch')
    .controller('BasicFacetController', BasicFacetController);

    /* ngInject */
    function BasicFacetController($scope, $log, $q, _, BasicFacet, EVENT_FACET_CONSTRAINTS,
            EVENT_FACET_CHANGED) {
        var vm = this;

        vm.isDisabled = isDisabled;
        vm.changed = changed;

        vm.disableFacet = disableFacet;
        vm.enableFacet = enableFacet;

        vm.getFacetSize = getFacetSize;

        vm.facet;

        init();

        function init() {
            vm.facet = new BasicFacet($scope.options);
            $scope.$on(EVENT_FACET_CONSTRAINTS, function(event, cons) {
                $log.log('Receive constraints', cons);
                update(cons);
            });
        }

        function update(constraints) {
            vm.isLoadingFacets = true;
            return vm.facet.update(constraints).then(handleUpdateSuccess, handleError);
        }

        function isDisabled() {
            return vm.isLoadingFacets;
        }

        function emitChange() {
            var args = { id: vm.facet.facetUri, constraint: vm.facet.getConstraint() };
            $log.log('Emit', args);
            $scope.$emit(EVENT_FACET_CHANGED, args);
        }

        function changed() {
            vm.isLoadingFacets = true;
            emitChange();
        }

        function enableFacet() {
            vm.isLoadingFacets = true;
            vm.facet.enable();
            emitChange();
        }

        function disableFacet() {
            vm.isLoadingFacets = true;
            vm.facet.disable();
            emitChange();
        }

        function handleUpdateSuccess() {
            $log.log('Success');
            vm.isLoadingFacets = false;
        }

        function handleError(error) {
            $log.log('Fail');
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
