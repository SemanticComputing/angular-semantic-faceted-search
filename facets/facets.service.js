/*
* Facet handler service.
*/
(function() {
    'use strict';

    /* eslint-disable angular/no-service-method */
    angular.module('facets')

    .factory( 'Facets', Facets );

    /* ngInject */
    function Facets( $rootScope, $q, _, SparqlService, facetMapperService, FacetSelectionFormatter ) {
        return function( facets, config ) {

            var self = this;

            var formatter = new FacetSelectionFormatter(facets);

            self.getStates = getStates;
            self.facetChanged = facetChanged;
            self.update = update;
            self.selectedFacets = {};

            var facetStates;
            var endpoint = new SparqlService(config.endpointUrl);

            var previousSelections = _.clone(facets);

            var queryTemplate = '' +
            ' PREFIX skos: <http://www.w3.org/2004/02/skos/core#>' +
            ' PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>' +
            ' PREFIX sf: <http://ldf.fi/functions#>' +

            ' SELECT ?cnt ?id ?facet_text ?value WHERE {' +
            '   { ' +
            '     {' +
            '       SELECT DISTINCT (count(DISTINCT ?s) as ?cnt) ?id ?value' +
            '       WHERE {' +
            '         VALUES ?id {' +
            '           <FACETS> ' +
            '         } ' +
            '         <GRAPH_START> ' +
            '           <SELECTIONS> ' +
            '           <CLASS> ' +
            '           ?s ?id ?value .' +
            '         <GRAPH_END> ' +
            '       } GROUP BY ?id ?value' +
            '     }' +
            '     OPTIONAL {' +
            '       ?value sf:preferredLanguageLiteral (skos:prefLabel "<PREF_LANG>" "" ?lbl) .' +
            '     }' +
            '     BIND(COALESCE(?lbl, STR(?value)) as ?facet_text)' +
            '   }' +
            '   <DESELECTIONS> ' +
            ' } ' +
            ' ORDER BY ?id ?facet_text';
            queryTemplate = buildQueryTemplate(queryTemplate);

            var deselectUnionTemplate = '' +
            ' UNION { ' +
            '   { ' +
            '     SELECT DISTINCT (count(DISTINCT ?s) as ?cnt) ' +
            '     WHERE { ' +
            '       <GRAPH_START> ' +
            '          <OTHER_SELECTIONS> ' +
            '          <CLASS> ' +
            '       <GRAPH_END> ' +
            '     } ' +
            '   } ' +
            '   BIND("-- No Selection --" AS ?facet_text) ' +
            '   BIND(<DESELECTION> AS ?id) ' +
            ' }';
            deselectUnionTemplate = buildQueryTemplate(deselectUnionTemplate);

            function facetChanged(id) {
                var selectedFacet = self.selectedFacets[id];
                if (selectedFacet) {
                    if (selectedFacet.type === 'timespan' &&
                            !((selectedFacet.value || {}).start && (selectedFacet || {}).value.end)) {
                        return $q.when();
                    }
                    // As this function gets called every time a facet state is changed,
                    // check that the actual selection is changed before calling update.
                    if (!_.isEqual(previousSelections[id].value, selectedFacet.value)) {
                        previousSelections[id] = _.cloneDeep(selectedFacet);
                        return update();
                    }
                } else {
                    // Another facet selection (text search) has resulted in this
                    // facet not having a value even though it has a selection.
                    // Fix it by adding its previous state to the facet state list
                    // with count = 0.
                    var prev = {
                        id: id,
                        values: [_.clone(previousSelections[id])]
                    };
                    prev.values[0].count = 0;
                    facets[id].state = prev;
                    self.selectedFacets[id] = _.clone(previousSelections[id]);
                }
                return $q.when();
            }

            function update() {
                config.updateResults(self.selectedFacets);
                return getStates(self.selectedFacets).then(function(states) {
                    _.forOwn(facets, function (facet, key) {
                        facet.state = _.find(states, ['id', key]);
                    });
                });
            }

            function getStates(facetSelections) {
                var query = buildQuery(facetSelections);

                var promise = endpoint.getObjects(query);
                return promise.then(parseResults);
            }

            function parseResults( sparqlResults ) {
                facetStates = facetMapperService.makeObjectList(sparqlResults);
                return facetStates;
            }

            function buildQuery(facetSelections) {
                return queryTemplate.replace('<SELECTIONS>',
                        formatter.parseFacetSelections(facetSelections))
                        .replace('<DESELECTIONS>', buildDeselectionUnions(facetSelections));
            }

            function buildQueryTemplate(template) {
                var templateSubs = [
                    {
                        placeHolder: '<FACETS>',
                        value: getTemplateFacets()
                    },
                    {
                        placeHolder: '<GRAPH_START>',
                        value: (config.graph ? ' GRAPH ' + config.graph + ' { ' : '')
                    },
                    {
                        placeHolder: '<CLASS>',
                        value: (config.rdfClass ? ' ?s a ' + config.rdfClass + ' . ' : '')
                    },
                    {
                        placeHolder: '<GRAPH_END>',
                        value: (config.graph ? ' } ' : '') },
                    {
                        placeHolder: '<PREF_LANG>',
                        value: (config.preferredLang ? config.preferredLang : 'fi')
                    }
                ];

                templateSubs.forEach(function(s) {
                    template = template.replace(s.placeHolder, s.value);
                });
                return template;
            }

            function getTemplateFacets() {
                var res = [];
                _.forOwn(facets, function(facet, uri) {
                    if (facet.type !== 'text' && facet.type !== 'timespan') {
                        res.push(uri);
                    }
                });
                return res.join(' ');
            }

            function buildDeselectionUnions(facetSelections) {
                var deselections = [];
                _.forOwn( facets, function( val, key ) {
                    var s = deselectUnionTemplate.replace('<DESELECTION>', key);
                    var others = {};
                    _.forOwn( facets, function( v, k ) {
                        if (k !== key) {
                            var selected = facetSelections[k];
                            if (selected && selected.value) {
                                others[k] = facetSelections[k];
                            } else {
                                others[k] = v;
                            }
                        }
                    });
                    deselections.push(s.replace('<OTHER_SELECTIONS>',
                            formatter.parseFacetSelections(others)));
                });
                return deselections.join(' ');
            }

        };
    }
})();
