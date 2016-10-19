/*
* Facet handler service.
*/
(function() {
    'use strict';

    angular.module('seco.facetedSearch')

    .factory('Facets', Facets);

    /* ngInject */
    function Facets($log, $rootScope, $location, $q, _, EVENT_FACET_CONSTRAINTS,
                EVENT_FACET_CHANGED) {

        return FacetHandler;

        function FacetHandler(config) {
            var self = this;

            /* Public API */

            self.update = update;

            /* Implementation */

            var defaultConfig = {
                preferredLang: 'en'
            };

            self.config = angular.extend({}, defaultConfig, config);

            self.constraints = {};
            if (self.config.constraint) {
                self.constraints.default = self.config.constraint;
            }
            if (self.config.rdfClass) {
                self.constraints.rdfClass = '?s a ' + self.config.rdfClass + ' . ';
            }

            self.listener = $rootScope.$on(EVENT_FACET_CHANGED, update);

            // Update the facets and call the updateResults callback.
            // id is the id of the facet that triggered the update.
            function update(event, constraint) {
                self.constraints[constraint.id] = constraint.constraint;
                var cons = _.values(_(self.constraints).values().compact().value());
                $log.log(cons);
                $log.log('Broadcast', cons);
                $rootScope.$broadcast(EVENT_FACET_CONSTRAINTS, cons);
            }

            /* Private functions */

            /* Initialization */

            function parseInitialConstraints(values, facets) {
                var result = {};
                _.forOwn(values, function(val, id) {
                    if (!facets[id]) {
                        return;
                    }
                    result[id] = facets[id].constraintFromUrlParam(val);
                });
                return result;
            }

            function getFacetValuesFromUrlParams() {
                return $location.search();
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
