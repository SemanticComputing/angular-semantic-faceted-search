
/*
* Facet for selecting a simple value.
*/
(function() {
    'use strict';

    angular.module('seco.facetedSearch')
    .factory('AbstractFacet', AbstractFacet);

    /* ngInject */
    function AbstractFacet($q, $log, _, SparqlService, facetMapperService,
            NO_SELECTION_STRING) {

        return AbstractFacetConstructor;

        function AbstractFacetConstructor(facet, options) {

            var self = this;

            /* Public API */

            self.update = update;

            /* Implementation */

            self.previousConstraints;
            self.state = {};

            self.labelPart =
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

            self.queryTemplate =
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
            '       <FACET_PATTERN> ' +
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

            self.deselectUnionTemplate =
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

            init(facet, options);

            function init(facet, options) {
                var defaultConfig = {
                    preferredLang: 'fi'
                };

                self.facet = facet;

                self.config = angular.extend({}, defaultConfig, options);

                self.name = self.config.name;
                self.facetUri = self.config.facetUri;
                self.predicate = self.config.predicate;
                self._isEnabled = self.config.enabled;

                self.endpoint = new SparqlService(self.config.endpointUrl);

                self.getSelectedValue = facet.getSelectedValue;

                self.getLabelPart = facet.getLabelPart || getLabelPart;
                self.getQueryTemplate = facet.getQueryTemplate || getQueryTemplate;
                self.getDeselectUnionTemplate = facet.getDeselectUnionTemplate || getDeselectUnionTemplate;

                self.buildQueryTemplate = facet.buildQueryTemplate || buildQueryTemplate;
                self.buildQuery = facet.buildQueryTemplate || buildQuery;
                self.buildDeselectUnion = facet.buildDeselectUnion || buildDeselectUnion;
                self.buildServiceUnions = facet.buildServiceUnions || buildServiceUnions;
                self.getTriplePattern = facet.getTriplePattern || getTriplePattern;
                self.getConstraint = facet.getConstraint || getConstraint;
                self.getPredicate = facet.getPredicate || getPredicate;
                self.getFacetUri = facet.getFacetUri || getFacetUri;
                self.getName = facet.getName || getName;

                self.setBusy = facet.setBusy || setBusy;
                self.isBusy = facet.isBusy || isBusy;

                self.setState = facet.setState || setState;
                self.getState = facet.getState || getState;
                self.fetchState = facet.fetchState || fetchState;

                self.queryTemplate = self.buildQueryTemplate(self.getQueryTemplate());
                self.deselectUnionTemplate = self.buildQueryTemplate(self.getDeselectUnionTemplate());
            }

            /* Public API functions */

            function update(constraints) {
                if (!self.facet.isEnabled()) {
                    return $q.when();
                }
                if (self.previousConstraints && _.isEqual(constraints.constraint,
                        self.previousConstraints)) {
                    return $q.when();
                }
                self.previousConstraints = _.clone(constraints.constraint);

                self.setBusy(true);

                return self.fetchState(constraints).then(function(state) {
                    if (!_.isEqual(self.previousConstraints, constraints.constraint)) {
                        return $q.reject('Facet state changed');
                    }
                    self.setState(state);
                    self.setBusy(false);

                    return state;
                });
            }

            function setState(state) {
                self.state = state;
            }

            function getState() {
                return self.state;
            }

            function isBusy() {
                return self._isBusy;
            }

            function setBusy(val) {
                self._isBusy = val;
            }

            // Build a query with the facet selection and use it to get the facet state.
            function fetchState(constraints) {
                var query = self.buildQuery(constraints.constraint);

                return self.endpoint.getObjects(query).then(function(results) {
                    var res = facetMapperService.makeObjectList(results);
                    return _.first(res);
                });
            }

            function getTriplePattern() {
                return '?s ' + self.getPredicate() + ' ?value . ';
            }

            function getConstraint() {
                if (!self.getSelectedValue()) {
                    return;
                }
                if (self.getSelectedValue()) {
                    return ' ?s ' + self.getPredicate() + ' ' + self.getSelectedValue() + ' . ';
                }
            }

            function getPredicate() {
                return self.predicate;
            }

            function getFacetUri() {
                return self.facetUri;
            }

            function getName() {
                return self.name;
            }

            function getLabelPart() {
                return self.labelPart;
            }

            function getDeselectUnionTemplate() {
                return self.deselectUnionTemplate;
            }

            function getQueryTemplate() {
                return self.queryTemplate;
            }

            // Build the facet query
            function buildQuery(constraints) {
                constraints = constraints || [];
                var query = self.getQueryTemplate()
                    .replace(/<OTHER_SERVICES>/g, self.buildServiceUnions(self.config.services))
                    .replace(/<DESELECTION>/g, self.buildDeselectUnion(constraints))
                    .replace(/<SELECTIONS>/g, constraints.join(' '))
                    .replace(/<PREF_LANG>/g, self.config.preferredLang);

                return query;
            }

            function buildDeselectUnion(constraints) {
                var ownConstraint = self.getConstraint();
                var deselections = _.reject(constraints, function(v) { return v === ownConstraint; });
                return self.getDeselectUnionTemplate().replace('<SELECTIONS>', deselections.join(' '));
            }

            function buildServiceUnions(services) {
                var unions = '';
                _.forEach(services, function(service) {
                    unions = unions +
                    ' UNION { ' +
                    '  SERVICE ' + service + ' { ' +
                        self.getLabelPart() +
                    '  } ' +
                    ' } ';
                });
                return unions;
            }

            // Replace placeholders in the query template using the configuration.
            function buildQueryTemplate(template) {
                var templateSubs = [
                    {
                        placeHolder: '<GRAPH_START>',
                        value: (self.config.graph ? ' GRAPH ' + self.config.graph + ' { ' : '')
                    },
                    {
                        placeHolder: '<GRAPH_END>',
                        value: (self.config.graph ? ' } ' : '')
                    },
                    {
                        placeHolder: /<ID>/g,
                        value: self.getFacetUri()
                    },
                    {
                        placeHolder: /<FACET_PATTERN>/g,
                        value: self.getTriplePattern()
                    },
                    {
                        placeHolder: /<LABEL_PART>/g,
                        value: self.getLabelPart()
                    }
                ];

                templateSubs.forEach(function(s) {
                    template = template.replace(s.placeHolder, s.value);
                });
                return template;
            }
        }
    }
})();
