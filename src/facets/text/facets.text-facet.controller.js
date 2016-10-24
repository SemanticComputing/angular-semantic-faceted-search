(function() {
    'use strict';

    angular.module('seco.facetedSearch')
    .controller('TextFacetController', TextFacetController);

    /* ngInject */
    function TextFacetController($log, $scope, _, EVENT_FACET_CHANGED,
            EVENT_REQUEST_CONSTRAINTS, EVENT_INITIAL_CONSTRAINTS, TextFacet) {
        var vm = this;

        vm.changed = changed;
        vm.clear = clear;
        vm.enableFacet = enableFacet;
        vm.disableFacet = disableFacet;
        vm.isFacetEnabled = isFacetEnabled;

        init();

        function init() {
            var initListener = $scope.$on(EVENT_INITIAL_CONSTRAINTS, function(event, cons) {
                $log.debug($scope.options.name, 'Init');
                var initial = _.cloneDeep($scope.options);
                initial.initialConstraints = cons;
                vm.facet = new TextFacet(initial);
                // Unregister initListener
                initListener();
            });
            $scope.$emit(EVENT_REQUEST_CONSTRAINTS);
        }

        function emitChange() {
            var val = vm.facet.getSelectedValue();
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
            emitChange();
        }

        function clear() {
            vm.facet.clear();
            emitChange();
        }

        function enableFacet() {
            vm.facet.enable();
        }

        function disableFacet() {
            vm.facet.disable();
            emitChange();
        }

        function isFacetEnabled() {
            if (!vm.facet) {
                return false;
            }
            return vm.facet.isEnabled();
        }

    }
})();
