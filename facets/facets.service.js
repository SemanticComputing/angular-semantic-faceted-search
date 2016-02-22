/*
* Facet handler service.
*/
(function() {
    'use strict';

    /* eslint-disable angular/no-service-method */
    angular.module('facets')

    .factory( 'Facets', Facets );

    /* ngInject */
    function Facets( $rootScope, $q, _, SparqlService, facetMapperService, FacetSelectionFormatter,
                    NO_SELECTION_STRING) {
        return function( facets, config ) {

            var self = this;

            var formatter = new FacetSelectionFormatter(facets);

            self.getStates = getStates;
            self.facetChanged = facetChanged;
            self.timeSpanFacetChanged = timeSpanFacetChanged;
            self.update = update;

            var facetStates;
            var endpoint = new SparqlService(config.endpointUrl);

            var freeFacetTypes = ['text', 'timespan'];

            var previousSelections = {};
            _.forOwn(facets, function(val, id) {
                if (!val.type) {
                    previousSelections[id] = [{ value: undefined }];
                } else {
                    previousSelections[id] = { value: undefined };
                }
            });
            self.selectedFacets = _.cloneDeep(previousSelections);

            var defaultCountKey = _.findKey(facets, function(facet) {
                return !facet.type;
            });

            var queryTemplate = '' +
            ' PREFIX skos: <http://www.w3.org/2004/02/skos/core#> ' +
            ' PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> ' +
            ' PREFIX sf: <http://ldf.fi/functions#> ' +
            ' PREFIX text: <http://jena.apache.org/text#> ' +

            ' SELECT ?cnt ?id ?facet_text ?value WHERE {' +
            '   { ' +
            '     {' +
            '       SELECT DISTINCT (count(DISTINCT ?s) as ?cnt) ?id ?value' +
            '       WHERE {' +
            '         VALUES ?id {' +
            '           <FACETS> ' +
            '         } ' +
            '         <GRAPH_START> ' +
            '           { ' +
            '             <SELECTIONS> ' +
            '             <CLASS> ' +
            '           } ' +
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
            '   BIND("' + NO_SELECTION_STRING + '" AS ?facet_text) ' +
            '   BIND(<DESELECTION> AS ?id) ' +
            ' }';
            deselectUnionTemplate = buildQueryTemplate(deselectUnionTemplate);

            function timeSpanFacetChanged(id) {
                var selectedFacet = self.selectedFacets[id];
                if (selectedFacet) {
                    var start = (selectedFacet.value || {}).start;
                    var end = (selectedFacet.value || {}).end;

                    if ((start || end) && !(start && end)) {
                        return $q.when();
                    }
                    return facetChanged(id);
                }
                return $q.when();
            }

            function facetChanged(id) {
                var selectedFacet = self.selectedFacets[id];
                if (!facets[id].type && selectedFacet.length === 0) {
                    self.selectedFacets[id] = _.clone(previousSelections[id]);
                    return update(id);
                }

                if (selectedFacet) {
                    // As this function gets called every time a facet state is changed,
                    // check that the actual selection is changed before calling update.
                    if (!_.isEqual(previousSelections[id], selectedFacet)) {
                        previousSelections[id] = _.cloneDeep(selectedFacet);
                        return update(id);
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

            function update(id) {
                config.updateResults(self.selectedFacets);
                return getStates(self.selectedFacets, id).then(function(states) {
                    _.forOwn(facets, function(facet, key) {
                        facet.state = _.find(states, ['id', key]);
                    });
                });
            }

            function getStates(facetSelections, id) {
                var query = buildQuery(facetSelections, id);

                var promise = endpoint.getObjects(query);
                return promise.then(function(results) {
                    return parseResults(results, facetSelections, id);
                });
            }

            function parseResults( sparqlResults, facetSelections, selectionId ) {
                var results = facetMapperService.makeObjectList(sparqlResults);

                var isFreeFacet;
                if (selectionId && _.includes(freeFacetTypes, facets[selectionId].type)) {
                    isFreeFacet = true;
                }
                var isEmptyFreeFacet = isFreeFacet && !facetSelections[selectionId].value;

                // count is the current result count.
                var count;
                // Due to optimization, no redundant "no selection" values are queried.
                // Because of this, they need to be set for each facet for which
                // the value was not queried.
                if (!selectionId || isEmptyFreeFacet) {
                    // No facets selected (or emptied free facet), get the count from the results.
                    count = (_.find((_.find(results, ['id', defaultCountKey]) || {}).values,
                            ['value', undefined]) || {}).count || 0;
                } else if (isFreeFacet) {
                    // This is a facet without an explicit value, search the results
                    // for the highest defined value.
                    var max = 0;
                    _.forEach(results, function(result) {
                        var maxVal = _.maxBy(result.values, function(val) {
                            return val.value ? val.count : 0;
                        });
                        maxVal = maxVal && maxVal.value ? maxVal.count : 0;
                        if (maxVal > max) {
                            max = maxVal;
                        }
                    });
                    count = max;
                } else {
                    // Get the count from the current selection.
                    count = facetSelections[selectionId][0].count;
                }

                // Add the "no selection" values to facets without them.
                _.forOwn(facets, function(v, id) {
                    var result = _.find(results, ['id', id]);
                    if (!result) {
                        result = { id: id, values: [] };
                        results.push(result);
                    }
                    if (!_.find(result.values, ['value', undefined])) {
                        result.values = [{
                            value: undefined,
                            text: NO_SELECTION_STRING,
                            count: count
                        }].concat(result.values);
                    }
                });
                facetStates = results;

                return facetStates;
            }

            function buildQuery(facetSelections, id) {
                return queryTemplate.replace('<SELECTIONS>',
                        formatter.parseFacetSelections(facetSelections))
                        .replace('<DESELECTIONS>', buildDeselectionUnions(facetSelections, id));
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
                    if (!_.includes(freeFacetTypes, facet.type)) {
                        res.push(uri);
                    }
                });
                return res.join(' ');
            }

            function buildDeselectionUnions(facetSelections, id) {
                var deselections = [];

                var actualSelections = [];
                _.forOwn(facetSelections, function(val, key) {
                    if (val && (val.value || (val.forEach && val[0].value))) {
                        actualSelections.push({ id: key, value: val });
                    }
                });
                var actualSelectionCount = actualSelections.length;

                var currentSelection = facetSelections[id] || {};
                var selections = actualSelections;

                if (!actualSelectionCount) {
                    if (!currentSelection.count) {
                        selections.push({ id: defaultCountKey, value: undefined });
                    }
                }
                _.forEach( selections, function( selection ) {
                    var s = deselectUnionTemplate.replace('<DESELECTION>', selection.id);
                    var others = {};
                    _.forEach( selections, function( s ) {
                        if (s.id !== selection.id) {
                            if (s.value) {
                                others[s.id] = s.value;
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
