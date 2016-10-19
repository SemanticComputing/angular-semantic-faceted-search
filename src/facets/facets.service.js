/*
* Facet handler service.
*/
(function() {
    'use strict';

    angular.module('seco.facetedSearch')

    .factory('Facets', Facets);

    /* ngInject */
    function Facets($log, $rootScope, $location, $q, _, EVENT_FACET_CONSTRAINTS,
                EVENT_FACET_CHANGED, EVENT_REQUEST_CONSTRAINTS) {

        return FacetHandler;

        function FacetHandler(config) {
            var self = this;

            /* Public API */

            self.update = update;

            /* Implementation */

            init();

            function init() {
                var defaultConfig = {
                    preferredLang: 'en'
                };

                self.config = angular.extend({}, defaultConfig, config);

                self.changeListener = $rootScope.$on(EVENT_FACET_CHANGED, update);
                self.initListener = $rootScope.$on(EVENT_REQUEST_CONSTRAINTS, broadCastConstraints);

                self.constraints = getFacetValuesFromUrlParams();
                if (self.config.constraint && !self.constraints.default) {
                    self.constraints.default = getInitialConstraints(self.config);
                }
                $log.log('Initial constraints', self.constraints);
            }


            // Update constraints, and broadcast the to listening facets.
            function update(event, constraint) {
                self.constraints[constraint.id] = constraint.constraint;
                broadCastConstraints();
            }

            function broadCastConstraints() {
                $location.search(self.constraints);
                var cons = _.values(_(self.constraints).values().compact().value());
                $log.log('Broadcast', cons);
                $rootScope.$broadcast(EVENT_FACET_CONSTRAINTS, cons);
            }

            /* Private functions */

            /* Initialization */

            function getFacetValuesFromUrlParams() {
                $log.log('URL params', $location.search());
                return $location.search() || {};
            }

            // Combine the possible RDF class and constraint definitions in the config.
            function getInitialConstraints(config) {
                var constraints = config.rdfClass ? ' ?s a ' + config.rdfClass + ' . ' : '';
                constraints = constraints + (config.constraint || '');
                return constraints;
            }
        }
    }
})();
