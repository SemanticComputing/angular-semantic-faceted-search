/*
* Facet handler service.
*/
(function() {
    'use strict';

    angular.module('seco.facetedSearch')

    .factory('Facets', Facets);

    /* ngInject */
    function Facets($q, _, SparqlService, facetMapperService,
            facetSelectionFormatter, NO_SELECTION_STRING) {

        return FacetHandler;

        function FacetHandler(facetSetup, config) {
            var self = this;

            /* Public API */

            self.update = update;
            self.disableFacet = disableFacet;
            self.enableFacet = enableFacet;

            /* Implementation */

            var defaultConfig = {
                updateResults: function() {},
                preferredLang: 'en'
            };

            self.config = angular.extend({}, defaultConfig, config);

            self.endpoint = new SparqlService(self.config.endpointUrl);

            var initialValues = parseInitialValues(self.config.initialValues, facetSetup);
            self.enabledFacets = getInitialEnabledFacets(facetSetup, initialValues);
            self.disabledFacets = getInitialDisabledFacets(facetSetup, self.enabledFacets);

            var previousSelections = initPreviousSelections(initialValues, self.enabledFacets);

            self.selectedFacets = _.cloneDeep(previousSelections);

            /* Public API functions */

            function registerFacet(facet) {
                self.facets.push(facet);
            }

            // Update the facets and call the updateResults callback.
            // id is the id of the facet that triggered the update.
            function update(id) {
                self.config.updateResults(self.selectedFacets);
                if (!_.size(self.enabledFacets)) {
                    return $q.when({});
                }

            }

            function disableFacet(id) {
                self.disabledFacets[id] = _.cloneDeep(self.enabledFacets[id]);
                delete self.enabledFacets[id];
                delete self.selectedFacets[id];
                _defaultCountKey = getDefaultCountKey(self.enabledFacets);
                return self.update();
            }

            function enableFacet(id) {
                self.enabledFacets[id] = _.cloneDeep(self.disabledFacets[id]);
                delete self.disabledFacets[id];
                _defaultCountKey = getDefaultCountKey(self.enabledFacets);
                if (_.includes(freeFacetTypes, self.enabledFacets[id].type)) {
                    return $q.when(self.enabledFacets);
                }
                return self.update();
            }

            /* Private functions */

            /* Initialization */

            function initPreviousSelections(initialValues, facets) {
                var selections = {};
                _.forOwn(facets, function(val, id) {
                    var initialVal = initialValues[id];
                    selections[id] = { value: initialVal };
                });
                return selections;
            }

            function parseInitialValues(values, facets) {
                var result = {};
                _.forOwn(values, function(val, id) {
                    if (!facets[id]) {
                        return;
                    }
                    result[id] = facets[id].fromUrlParam(val);
                });
                return result;
            }

            function getInitialEnabledFacets(facets, initialValues) {
                var initialFacets = _.pick(facets, _.keys(initialValues));
                if (!_.isEmpty(initialFacets)) {
                    return initialFacets;
                }
                return _.pickBy(facets, function(facet) {
                    return facet.enabled;
                });
            }

            function getInitialDisabledFacets(facets, enabledFacets) {
                return _.omit(facets, _.keys(enabledFacets));
            }

            // Combine the possible RDF class and constraint definitions in the config.
            function getInitialConstraints(config) {
                var constraints = config.rdfClass ? ' ?s a ' + config.rdfClass + ' . ' : '';
                constraints = constraints + (config.constraint || '');
                return constraints;
            }

            /* Utilities */

            // Check if the value of a facet has changed
            function hasChanged(id, selectedFacet, previousSelections) {
                if (!_.isEqualWith(previousSelections[id], selectedFacet, hasSameValue)) {
                    return true;
                }
                return false;
            }

            // Check if the first facet value is the same value as the second.
            function hasSameValue(first, second) {
                if (!first && !second) {
                    return true;
                }
                if ((!first && second) || (first && !second)) {
                    return false;
                }
                var isFirstArray = _.isArray(first);
                var isSecondArray = _.isArray(second);
                if (isFirstArray || isSecondArray) {
                    if (!(isFirstArray && isSecondArray)) {
                        return false;
                    }
                    var firstVals = _.map(first, 'value');
                    var secondVals = _.map(second, 'value');
                    return _.isEqual(firstVals, secondVals);
                }
                return _.isEqual(first.value, second.value);
            }

            /* Exposed for testing purposes only */

            self._hasChanged = hasChanged;
            self._hasSameValue = hasSameValue;
            self._parseInitialValues = parseInitialValues;
            self._initPreviousSelections = initPreviousSelections;
            self._getInitialEnabledFacets = getInitialEnabledFacets;
            self._getInitialDisabledFacets = getInitialDisabledFacets;

            self._getPreviousSelections = function() { return previousSelections; };
        }
    }
})();
