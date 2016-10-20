/*
* Facet for selecting a simple value.
*/
(function() {
    'use strict';

    angular.module('seco.facetedSearch')

    .factory('BasicFacet', BasicFacet);

    /* ngInject */
    function BasicFacet($q, $log, _, SparqlService, facetMapperService,
            facetSelectionFormatter, NO_SELECTION_STRING) {

        return BasicFacetConstructor;

        function BasicFacetConstructor(options) {
            var self = this;

            /* Public API */

            self.update = update;
            self.disable = disable;
            self.enable = enable;
            self.isLoading = isLoading;
            self.isEnabled = isEnabled;
            self.getSelectedValue = getSelectedValue;

            // Properties
            self.selectedValue = {};
            self.predicate;
            self.name;
            self.config;
            self.facetUri;
            self.endpoint;

            self.previousConstraints;

            self.getConstraint = getTriplePattern;

            init();

            /* Implementation */

            function init() {
                var defaultConfig = {
                    preferredLang: 'fi'
                };

                self.config = angular.extend({}, defaultConfig, options);
                self.name = options.name;
                self.facetUri = options.facetUri;
                self.predicate = options.predicate;
                self.endpoint = new SparqlService(self.config.endpointUrl);
                self._isEnabled = self.config.enabled;

                var constVal = self.config.initialConstraints.facets[self.facetUri];
                if (constVal && constVal.value) {
                    self.selectedValue = { value: constVal.value };
                }
            }

            var labelPart =
            ' { ' +
            '  ?value skos:prefLabel|rdfs:label [] . ' +
            '  OPTIONAL {' +
            '   ?value skos:prefLabel ?lbl . ' +
            '   FILTER(langMatches(lang(?lbl), "<PREF_LANG>")) .' +
            '  }' +
            '  OPTIONAL {' +
            '   ?value rdfs:label ?lbl . ' +
            '   FILTER(langMatches(lang(?lbl), "<PREF_LANG>")) .' +
            '  }' +
            '  OPTIONAL {' +
            '   ?value skos:prefLabel ?lbl . ' +
            '   FILTER(langMatches(lang(?lbl), "")) .' +
            '  }' +
            '  OPTIONAL {' +
            '   ?value rdfs:label ?lbl . ' +
            '   FILTER(langMatches(lang(?lbl), "")) .' +
            '  } ' +
            '  FILTER(BOUND(?lbl)) ' +
            ' }' +
            ' UNION { ' +
            '  FILTER(!ISURI(?value)) ' +
            '  BIND(STR(?value) AS ?lbl) ' +
            '  FILTER(BOUND(?lbl)) ' +
            ' } ';

            var queryTemplate =
            ' PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> ' +
            ' PREFIX skos: <http://www.w3.org/2004/02/skos/core#> ' +
            ' PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> ' +

            ' SELECT DISTINCT ?cnt ?id ?facet_text ?value WHERE {' +
            '  <DESELECTION> ' +
            '  {' +
            '   SELECT DISTINCT ?cnt ?id ?value ?facet_text { ' +
            '    {' +
            '     SELECT DISTINCT (count(DISTINCT ?s) as ?cnt) (sample(?s) as ?ss) ?id ?value {' +
            '      <GRAPH_START> ' +
            '       { ' +
            '        <SELECTIONS> ' +
            '       } ' +
            '       ?s <PREDICATE> ?value . ' +
            '       BIND(<ID> AS ?id) ' +
            '      <GRAPH_END> ' +
            '     } GROUP BY ?id ?value ' +
            '    } ' +
            '    FILTER(BOUND(?id)) ' +
            '    <LABEL_PART> ' +
            '    <OTHER_SERVICES> ' +
            '    BIND(COALESCE(?lbl, IF(ISURI(?value), REPLACE(STR(?value),' +
            '     "^.+/(.+?)$", "$1"), STR(?value))) AS ?facet_text)' +
            '   } ORDER BY ?id ?facet_text ' +
            '  }' +
            ' } ';
            queryTemplate = buildQueryTemplate(queryTemplate, self.config);

            var deselectUnionTemplate =
            ' { ' +
            '  { ' +
            '   SELECT DISTINCT (count(DISTINCT ?s) as ?cnt) ' +
            '   WHERE { ' +
            '    <GRAPH_START> ' +
            '     <SELECTIONS> ' +
            '    <GRAPH_END> ' +
            '   } ' +
            '  } ' +
            '  BIND("' + NO_SELECTION_STRING + '" AS ?facet_text) ' +
            '  BIND(<ID> AS ?id) ' +
            ' } UNION ';
            deselectUnionTemplate = buildQueryTemplate(deselectUnionTemplate, self.config);

            /* Public API functions */

            function update(constraints) {
                if (!self.isEnabled()) {
                    return $q.when();
                }
                if (self.previousConstraints &&
                    _.isEqual(constraints.constraint, self.previousConstraints)) {
                    return $q.when();
                } else {
                    self.previousConstraints = constraints.constraint;
                }
                self.isBusy = true;
                $log.debug(self.name, 'Update', constraints);
                return getState(constraints).then(function(state) {
                    $log.debug(self.name, 'Get state', state);
                    self.state = state;
                    self.isBusy = false;
                    return state;
                });
            }

            function getSelectedValue() {
                var val;
                if (_.isArray(self.selectedValue)) {
                    val = _.map(self.selectedValue, 'value');
                } else {
                    val = self.selectedValue.value;
                }
                return val;
            }

            function isEnabled() {
                return self._isEnabled;
            }

            function enable() {
                self._isEnabled = true;
            }

            function disable() {
                self.selectedValue = {};
                self._isEnabled = false;
            }

            function isLoading() {
                return self.isBusy;
            }

            /* Private functions */

            // Build a query with the facet selection and use it to get the facet state.
            function getState(constraints) {
                var query = buildQuery(constraints.constraint);

                var promise = self.endpoint.getObjects(query);
                return promise.then(function(results) {
                    var res = facetMapperService.makeObjectList(results);
                    return _.first(res);
                });
            }

            function getTriplePattern() {
                var result = '';
                if (!self.selectedValue) {
                    return;
                }
                if (_.isArray(self.selectedValue)) {
                    self.selectedValue.forEach(function(value) {
                        result = result + ' ?s ' + self.predicate + ' ' + value.value + ' . ';
                    });
                    return result;
                }
                if (self.selectedValue.value) {
                    return ' ?s ' + self.predicate + ' ' + self.selectedValue.value + ' . ';
                }
            }

            // Build the facet query
            function buildQuery(constraints) {
                constraints = constraints || [];
                var query = queryTemplate
                    .replace(/<OTHER_SERVICES>/g, buildServiceUnions(self.config.services))
                    .replace(/<DESELECTION>/g, buildDeselectUnion(constraints))
                    .replace(/<SELECTIONS>/g, constraints.join(' '))
                    .replace(/<PREF_LANG>/g, self.config.preferredLang);

                return query;
            }

            function buildDeselectUnion(constraints) {
                var ownConstraint = self.getConstraint();
                var deselections = _.reject(constraints, function(v) { return v === ownConstraint; });
                return deselectUnionTemplate.replace('<SELECTIONS>', deselections.join(' '));
            }

            function buildServiceUnions(services) {
                var unions = '';
                _.forEach(services, function(service) {
                    unions = unions +
                    ' UNION { ' +
                    '  SERVICE ' + service + ' { ' +
                        labelPart +
                    '  } ' +
                    ' } ';
                });
                return unions;
            }

            // Replace placeholders in the query template using the configuration.
            function buildQueryTemplate(template, config) {
                var templateSubs = [
                    {
                        placeHolder: '<GRAPH_START>',
                        value: (config.graph ? ' GRAPH ' + config.graph + ' { ' : '')
                    },
                    {
                        placeHolder: '<GRAPH_END>',
                        value: (config.graph ? ' } ' : '')
                    },
                    {
                        placeHolder: /<ID>/g,
                        value: self.facetUri
                    },
                    {
                        placeHolder: /<PREDICATE>/g,
                        value: config.predicate
                    },
                    {
                        placeHolder: /<LABEL_PART>/g,
                        value: labelPart
                    }
                ];

                templateSubs.forEach(function(s) {
                    template = template.replace(s.placeHolder, s.value);
                });
                return template;
            }

            /* Utilities */

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
        }
    }
})();
