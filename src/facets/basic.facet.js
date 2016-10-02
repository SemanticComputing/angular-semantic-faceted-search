/*
* Facet for selecting a simple value.
*/
(function() {
    'use strict';

    angular.module('seco.facetedSearch')

    .factory('BasicFacet', BasicFacet);

    /* ngInject */
    function BasicFacet($q, _, SparqlService, facetMapperService,
            facetSelectionFormatter, NO_SELECTION_STRING) {

        return BasicFacetConstructor;

        function BasicFacetConstructor(facetUri, handler) {
            var self = this;

            /* Public API */

            self.update = update;
            self.disable = disable;
            self.enable = enable;
            self.isLoading = isLoading;

            /* Implementation */

            self.facetUri = facetUri;
            self.handler = handler;
            self.config = handler.getConfig();
            self.endpoint = new SparqlService(self.config.endpointUrl);

            self.getTriplePattern = getTriplePattern;

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
            '  <DESELECTIONS> ' +
            '  {' +
            '   SELECT DISTINCT ?cnt ?id ?value ?facet_text { ' +
            '    {' +
            '     SELECT DISTINCT (count(DISTINCT ?s) as ?cnt) (sample(?s) as ?ss) ?id ?value {' +
            '      VALUES ?id {' +
            '       <FACET_ID> ' +
            '      } ' +
            '      <GRAPH_START> ' +
            '       { ' +
            '        <SELECTIONS> ' +
            '        <CONSTRAINT> ' +
            '       } ' +
            '       ?s ?id ?value . ' +
            '      <GRAPH_END> ' +
            '     } GROUP BY ?id ?value ' +
            '    } ' +
            '    FILTER(BOUND(?id)) ' +
            '    <SELECTION_FILTERS> ' + // This is in this particular spot because DBPedia
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
            '     <OTHER_SELECTIONS> ' +
            '     <CONSTRAINT> ' +
            '    <GRAPH_END> ' +
            '   } ' +
            '  } ' +
            '  BIND("' + NO_SELECTION_STRING + '" AS ?facet_text) ' +
            '  BIND(<DESELECTION> AS ?id) ' +
            ' } UNION ';
            deselectUnionTemplate = buildQueryTemplate(deselectUnionTemplate, self.config);

            /* Public API functions */

            function update(value) {
                self.isBusy = true;
                var pattern = self.getTriplePattern(value);
                var constraints = self.handler.update(self.facetUri, pattern);
                return getState(value, constraints).then(function(state) {
                    self.state = state;
                    self.isBusy = false;
                    return state;
                });
            }

            function enable() {
                self.isEnabled = true;
                return self.update();
            }

            function disable() {
                self.isEnabled = false;
            }

            function isLoading() {
                return self.isBusy;
            }

            /* Private functions */

            // Build a query with the facet selection and use it to get the facet state.
            function getState(value, constraints) {
                var query = buildQuery(value, constraints, self.config.preferredLang);

                var promise = self.endpoint.getObjects(query);
                return promise.then(function(results) {
                    return facetMapperService.makeObjectList(results);
                });
            }

            function getTriplePattern(val) {
                var result = '';
                if (_.isArray(val)) {
                    val.forEach(function(value) {
                        result = result + ' ?s ' + self.facetUri + ' ' + value.value + ' . ';
                    });
                    return result;
                }
                return ' ?s ' + self.facetUri + ' ' + val.value + ' . ';
            }

            // Build the facet query
            function buildQuery(selection, constraints, lang) {
                var query = queryTemplate.replace('<FACET>', self.facetUri);
                query = query
                    .replace(/<OTHER_SERVICES>/g, buildServiceUnions(self.config.services))
                    .replace(/<DESELECTIONS>/g, buildDeselectUnion(constraints))
                    .replace(/<SELECTIONS>/g, constraints.join(' '))
                    .replace(/<PREF_LANG>/g, lang);

                return query;
            }

            function buildDeselectUnion(constraints, ownConstraint) {
                var deselections = _.reject(constraints, function(v) { return v === ownConstraint; });
                return deselectUnionTemplate.replace('<DESELECTION>', deselections.join(' '));
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
                        placeHolder: '<CONSTRAINT>',
                        value: config.constraints
                    },
                    {
                        placeHolder: '<GRAPH_END>',
                        value: (config.graph ? ' } ' : '')
                    },
                    {
                        placeHolder: '<FACET_ID>',
                        value: self.facetUri
                    },
                    {
                        placeholder: /<LABEL_PART>/g,
                        value: labelPart
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
