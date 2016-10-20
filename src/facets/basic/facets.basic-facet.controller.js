(function() {
    'use strict';

    angular.module('seco.facetedSearch')
    .controller('BasicFacetController', BasicFacetController);

    /* ngInject */
    function BasicFacetController($scope, $log, $q, _, BasicFacet, EVENT_FACET_CONSTRAINTS,
            EVENT_FACET_CHANGED, EVENT_REQUEST_CONSTRAINTS, EVENT_INITIAL_CONSTRAINTS) {
        var vm = this;

        vm.isDisabled = isDisabled;
        vm.changed = changed;

        vm.disableFacet = disableFacet;
        vm.enableFacet = enableFacet;

        vm.getFacetSize = getFacetSize;

        vm.facet;

        vm.listener = function() { };

        init();

        function init() {
            var initListener = $scope.$on(EVENT_INITIAL_CONSTRAINTS, function(event, cons) {
                $log.debug($scope.options.name, 'Init');
                var initial = _.cloneDeep($scope.options);
                initial.initialConstraints = cons;
                vm.facet = new BasicFacet(initial);
                if (vm.facet.isEnabled()) {
                    listen();
                    changed();
                }
                // Unregister initListener
                initListener();
            });
            $scope.$emit(EVENT_REQUEST_CONSTRAINTS);
        }

        function listen() {
            vm.listener = $scope.$on(EVENT_FACET_CONSTRAINTS, function(event, cons) {
                $log.debug(vm.facet.name, 'Receive constraints', cons);
                update(cons);
            });
        }

        function update(constraints) {
            vm.isLoadingFacet = true;
            return vm.facet.update(constraints).then(handleUpdateSuccess, handleError);
        }

        function isDisabled() {
            return vm.isLoadingFacet || vm.facet.isLoading();
        }

        function emitChange() {
            var args = {
                id: vm.facet.facetUri,
                constraint: vm.facet.getConstraint(),
                value: vm.facet.getSelectedValue()
            };
            $log.debug(vm.facet.name, 'Emit', args);
            $scope.$emit(EVENT_FACET_CHANGED, args);
        }

        function changed() {
            $log.debug(vm.facet.name, 'Changed');
            vm.isLoadingFacet = true;
            emitChange();
        }

        function enableFacet() {
            listen();
            vm.isLoadingFacet = true;
            vm.facet.enable();
            emitChange();
        }

        function disableFacet() {
            vm.listener();
            vm.facet.disable();
            emitChange();
        }

        function handleUpdateSuccess() {
            $log.debug(vm.facet.name, 'Success');
            vm.isLoadingFacet = false;
        }

        function handleError(error) {
            vm.isLoadingFacet = false;
            $log.error(vm.facet.facetUri, error);
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
