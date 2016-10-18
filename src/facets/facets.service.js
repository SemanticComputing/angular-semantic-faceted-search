/*
* Facet handler service.
*/
(function() {
    'use strict';

    angular.module('seco.facetedSearch')

    .factory('Facets', Facets);

    /* ngInject */
    function Facets($location, $q, _) {

        return FacetHandler;

        function FacetHandler(facetSetup, config) {
            var self = this;

            /* Public API */

            self.update = update;

            /* Implementation */

            var defaultConfig = {
                preferredLang: 'en'
            };

            self.config = angular.extend({}, defaultConfig, config);

            /* Public API functions */

            // Update the facets and call the updateResults callback.
            // id is the id of the facet that triggered the update.
            function update(id) {
                self.constraints[id] = _.find(self.facets, ['id', id]).getConstraint();
                var promises = [];
                var cons = _.values(_(self.constraints).values().compact().value());
                self.facets.forEach(function(facet) {
                    promises.push(facet.update(cons));
                });
                return $q.all(promises).then(function(results) {
                    self.facets.forEach(function(facet) {
                        facet.ready();
                    });
                    return results;
                });
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
