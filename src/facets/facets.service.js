/*
* Facet handler service.
*/
(function() {
    'use strict';

    angular.module('seco.facetedSearch')

    .factory('Facets', Facets);

    /* ngInject */
    function Facets($log, $rootScope, $location, $q, _, EVENT_FACET_CONSTRAINTS,
                EVENT_FACET_CHANGED, EVENT_REQUEST_CONSTRAINTS, EVENT_INITIAL_CONSTRAINTS) {

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

                self.changeListener = $rootScope.$on(EVENT_FACET_CHANGED, update);
                self.initListener = $rootScope.$on(EVENT_REQUEST_CONSTRAINTS, broadCastInitial);

                self.state.facets = getFacetValuesFromUrlParams();
                if (self.config.constraint) {
                    self.state.default = getInitialConstraints(self.config);
                }
                $log.log('Initial state', self.state);
            }


            // Update state, and broadcast them to listening facets.
            function update(event, constraint) {
                self.state.facets[constraint.id] = constraint;
                broadCastConstraints(EVENT_FACET_CONSTRAINTS);
            }

            function broadCastInitial() {
                $log.debug('Broadcast initial');
                broadCastConstraints(EVENT_INITIAL_CONSTRAINTS);
            }

            function broadCastConstraints(event) {
                updateUrlParams();
                var constraint = getConstraint();
                constraint.push(self.state.default);
                var data = { facets: self.state.facets, constraint: constraint };
                $log.log('Broadcast', data);
                $rootScope.$broadcast(event, data);
            }

            /* Private functions */

            function getConstraint() {
                return _(self.state.facets).values().map('constraint').compact().value();
            }

            function updateUrlParams() {
                var params = {};
                _(self.state.facets).forOwn(function(val, id) {
                    if (val && val.value) {
                        params[id] = angular.toJson({ value: val.value, constraint: val.constraint });
                    }
                });
                $location.search(params);
            }

            /* Initialization */

            function getFacetValuesFromUrlParams() {
                $log.log('URL params', $location.search());
                var params = $location.search() || {};
                var res = {};
                _.forOwn(params, function(val, id) {
                    res[id] = angular.fromJson(val);
                });
                return res;
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
