(function() {
    'use strict';

    angular.module('seco.facetedSearch')
    .controller('AbstractFacetController', AbstractFacetController);

    /* @ngInject */
    function AbstractFacetController($scope, $log, $q, _, EVENT_FACET_CONSTRAINTS,
            EVENT_FACET_CHANGED, EVENT_REQUEST_CONSTRAINTS, EVENT_INITIAL_CONSTRAINTS,
            FacetImpl) {

        var vm = this;

        vm.isLoading = isLoading;
        vm.changed = changed;

        vm.disableFacet = disableFacet;
        vm.enableFacet = enableFacet;

        vm.getFacetSize = getFacetSize;

        vm.listener = function() { };

        vm.getSpinnerKey = getSpinnerKey;

        init(FacetImpl);

        function init(Facet) {
            var initListener = $scope.$on(EVENT_INITIAL_CONSTRAINTS, function(event, cons) {
                $log.debug($scope.options.name, 'Init');
                var initial = _.cloneDeep($scope.options);
                initial.initialConstraints = cons;
                vm.facet = new Facet(initial);
                if (vm.facet.isEnabled()) {
                    vm.previousVal = vm.facet.getSelectedValue();
                    listen();
                    update(cons);
                }
                $log.debug(vm.facet.name, vm.facet);
                // Unregister initListener
                initListener();
            });
            $log.debug($scope.options.name, 'Listening for init');
            $scope.$emit(EVENT_REQUEST_CONSTRAINTS);
        }

        var spinnerKey;
        function getSpinnerKey() {
            if (!spinnerKey) {
                spinnerKey = _.uniqueId('spinner');
            }
            return spinnerKey;
        }

        function listen() {
            vm.listener = $scope.$on(EVENT_FACET_CONSTRAINTS, function(event, cons) {
                $log.debug(vm.facet.name, 'Receive constraints', _.cloneDeep(cons));
                update(cons);
            });
        }

        function update(constraints) {
            vm.isLoadingFacet = true;
            return vm.facet.update(constraints).then(handleUpdateSuccess, handleError);
        }

        function isLoading() {
            return vm.isLoadingFacet || !vm.facet || vm.facet.isLoading();
        }

        function emitChange(forced) {
            var val = vm.facet.getSelectedValue();
            if (!forced && _.isEqual(vm.previousVal, val)) {
                $log.warn(vm.facet.name, 'Skip emit', val);
                vm.isLoadingFacet = false;
                return;
            }
            vm.previousVal = _.clone(val);
            var args = {
                id: vm.facet.facetId,
                constraint: vm.facet.getConstraint(),
                value: val
            };
            $log.log(vm.facet.name, 'Emit', args);
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
            emitChange(true);
        }

        function disableFacet() {
            vm.listener();
            vm.facet.disable();
            var forced = vm.facet.getSelectedValue() ? true : false;
            emitChange(forced);
        }

        function handleUpdateSuccess() {
            $log.debug(vm.facet.name, 'Success');
            vm.isLoadingFacet = false;
        }

        function handleError(error) {
            vm.isLoadingFacet = false;
            $log.error(vm.facet.facetId, error);
            vm.error = error;
        }

        function getFacetSize(facetStates) {
            if (facetStates) {
                return Math.min(facetStates.length + 2, 10).toString();
            }
            return '10';
        }
    }
})();
