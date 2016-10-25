/*
* Facet handler service.
*/
(function() {
    'use strict';

    angular.module('seco.facetedSearch')

    .factory('FacetHandler', FacetHandler);

    /* ngInject */
    function FacetHandler($log, $location, _, facetUrlStateHandlerService,
            EVENT_FACET_CONSTRAINTS, EVENT_FACET_CHANGED, EVENT_REQUEST_CONSTRAINTS,
            EVENT_INITIAL_CONSTRAINTS) {

        return FacetHandler;

        function FacetHandler(config) {
            var self = this;

            /* Public API */

            self.update = update;

            /* Implementation */

            init();

            function init() {
                self.state = { facets: {} };

                var defaultConfig = {
                    preferredLang: 'en'
                };

                self.config = angular.extend({}, defaultConfig, config);

                self.changeListener = self.config.scope.$on(EVENT_FACET_CHANGED, update);
                self.initListener = self.config.scope.$on(EVENT_REQUEST_CONSTRAINTS, broadCastInitial);

                self.state.facets = self.config.initialState || {};
                if (self.config.constraint) {
                    self.state.default = getInitialConstraints(self.config);
                }
                $log.log('Initial state', self.state);
                broadCastInitial();
            }

            // Update state, and broadcast them to listening facets.
            function update(event, constraint) {
                event.stopPropagation();
                $log.debug('Update', constraint);
                self.state.facets[constraint.id] = constraint;
                broadCastConstraints(EVENT_FACET_CONSTRAINTS);
            }

            function broadCastInitial(event) {
                if (event) {
                    event.stopPropagation();
                }
                $log.debug('Broadcast initial');
                var data = {
                    config: self.config
                };
                broadCastConstraints(EVENT_INITIAL_CONSTRAINTS, data);
            }

            function broadCastConstraints(eventType, data) {

                data = data || {};

                var constraint = getConstraint();
                constraint.push(self.state.default);

                data.facets = self.state.facets;
                data.constraint = constraint;

                $log.log('Broadcast', data);
                self.config.scope.$broadcast(eventType, data);
            }

            function getConstraint() {
                return _(self.state.facets).values().map('constraint').compact().value();
            }

            // Combine the possible RDF class and constraint definitions in the config.
            function getInitialConstraints(config) {
                var state = config.rdfClass ? ' ?s a ' + config.rdfClass + ' . ' : '';
                state = state + (config.constraint || '');
                return state;
            }
        }
    }
})();
