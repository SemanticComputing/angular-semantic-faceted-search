(function() {
    'use strict';

    angular.module('seco.facetedSearch')
    .controller('TextFacetController', TextFacetController);

    /* ngInject */
    function TextFacetController($scope, _, EVENT_FACET_CHANGED,
            EVENT_REQUEST_CONSTRAINTS, EVENT_INITIAL_CONSTRAINTS, TextFacet) {
        var vm = this;

        vm.changed = changed;
        vm.clear = clear;
        vm.enableFacet = enableFacet;
        vm.disableFacet = disableFacet;
        vm.isFacetEnabled = isFacetEnabled;

        // Wait until the options attribute has been set.
        var watcher = $scope.$watch('options', function(val) {
            if (val) {
                init();
                watcher();
            }
        });

        function init() {
            var initListener = $scope.$on(EVENT_INITIAL_CONSTRAINTS, function(event, cons) {
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
            $scope.$emit(EVENT_FACET_CHANGED, args);
        }

        function changed() {
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
