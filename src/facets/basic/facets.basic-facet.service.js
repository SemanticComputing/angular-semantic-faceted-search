(function() {
    'use strict';

    angular.module('seco.facetedSearch')

        .factory('BasicFacetService', BasicFacetService);

    /* @ngInject */
    function BasicFacetService($log, $q, _, EVENT_FACET_CONSTRAINTS,
            EVENT_FACET_CHANGED, EVENT_REQUEST_CONSTRAINTS, EVENT_INITIAL_CONSTRAINTS) {

        return BasicFacetServiceConstructor;

        function BasicFacetServiceConstructor(scope, Facet) {
            var self = this;

            self.isDisabled = isDisabled;
            self.changed = changed;

            self.disableFacet = disableFacet;
            self.enableFacet = enableFacet;
            self.getFacet = getFacet;

            self.getFacetSize = getFacetSize;

            self.facet;

            self.listener = function() { };

            init();

            function init() {
                var initListener = scope.$on(EVENT_INITIAL_CONSTRAINTS, function(event, cons) {
                    $log.debug(scope.options.name, 'Init');
                    var initial = _.cloneDeep(scope.options);
                    initial.initialConstraints = cons;
                    self.facet = new Facet(initial);
                    if (self.facet.isEnabled()) {
                        listen();
                        changed();
                    }
                    // Unregister initListener
                    initListener();
                });
                scope.$emit(EVENT_REQUEST_CONSTRAINTS);
            }

            function getFacet() {
                return self.facet;
            }

            function listen() {
                self.listener = scope.$on(EVENT_FACET_CONSTRAINTS, function(event, cons) {
                    $log.debug(self.facet.name, 'Receive constraints', _.cloneDeep(cons));
                    update(cons);
                });
            }

            function update(constraints) {
                self.isLoadingFacet = true;
                return self.facet.update(constraints).then(handleUpdateSuccess, handleError);
            }

            function isDisabled() {
                return self.isLoadingFacet || self.facet.isLoading();
            }

            function emitChange() {
                var val = self.facet.getSelectedValue();
                if (self.previousVal && _.isEqual(self.previousVal, val)) {
                    $log.debug(self.facet.name, 'Skip emit');
                    self.isLoadingFacet = false;
                    return;
                }
                self.previousVal = _.clone(val);
                var args = {
                    id: self.facet.getFacetUri(),
                    constraint: self.facet.getConstraint(),
                    value: val
                };
                $log.debug(self.facet.name, 'Emit', args);
                scope.$emit(EVENT_FACET_CHANGED, args);
            }

            function changed() {
                $log.debug(self.facet.name, 'Changed');
                self.isLoadingFacet = true;
                emitChange();
            }

            function enableFacet() {
                listen();
                self.isLoadingFacet = true;
                self.facet.enable();
                emitChange();
            }

            function disableFacet() {
                self.listener();
                self.facet.disable();
                emitChange();
            }

            function handleUpdateSuccess() {
                $log.debug(self.facet.name, 'Success');
                self.isLoadingFacet = false;
            }

            function handleError(error) {
                self.isLoadingFacet = false;
                $log.error(self.facet.facetUri, error);
                self.error = error;
            }

            function getFacetSize( facetStates ) {
                if (facetStates) {
                    return Math.min(facetStates.length + 2, 10).toString();
                }
                return '10';
            }
        }
    }
})();
