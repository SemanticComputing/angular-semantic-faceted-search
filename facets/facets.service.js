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
            self.update = update;

            var facetStates;
            var endpoint = new SparqlService(config.endpointUrl);

            var freeFacetTypes = ['text', 'timespan'];

            var initialValues = parseInitialValues(config.initialValues);
            var previousSelections = {};
            _.forOwn(facets, function(val, id) {
                if (!val.type) {
                    previousSelections[id] = [{ value: initialValues[id] }];
                } else {
                    previousSelections[id] = { value: initialValues[id] };
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
            '     <OTHER_SERVICES> ' +
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

            function facetChanged(id) {
                if (self.selectedFacets[id]) {
                    switch(facets[id].type) {
                        case 'timespan':
                            return timeSpanFacetChanged(id);
                        case 'text':
                            return textFacetChanged(id);
                        default:
                            return basicFacetChanged(id);
                    }
                }
                return $q.when();
            }

            function timeSpanFacetChanged(id) {
                var selectedFacet = self.selectedFacets[id];
                if (selectedFacet) {
                    var start = (selectedFacet.value || {}).start;
                    var end = (selectedFacet.value || {}).end;

                    if ((start || end) && !(start && end)) {
                        return $q.when();
                    }
                    return update(id);
                }
                return $q.when();
            }

            function textFacetChanged(id) {
                if (hasChanged(id)) {
                    return update(id);
                }
                return $q.when();
            }

            function basicFacetChanged(id) {
                var selectedFacet = self.selectedFacets[id];
                if (selectedFacet.length === 0) {
                    self.selectedFacets[id] = _.clone(previousSelections[id]);
                    return update(id);
                }
                if (hasChanged(id)) {
                    return update(id);
                }
                if (!selectedFacet[0]) {
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

            function hasChanged(id) {
                var selectedFacet = self.selectedFacets[id];
                if (!_.isEqualWith(previousSelections[id], selectedFacet, hasSameValue)) {
                    previousSelections[id] = _.cloneDeep(selectedFacet);
                    return true;
                }
                return false;
            }

            function hasSameValue(first, second) {
                if (_.isArray(first)) {
                    var firstVals = _.map(first, 'value');
                    var secondVals = _.map(second, 'value');
                    return _.isEqual(firstVals, secondVals);
                }
                return _.isEqual(first, second);
            }

            function parseInitialValues(values) {
                var result = {};
                _.forOwn(values, function(val, id) {
                    if (!facets[id]) {
                        return;
                    }
                    if (facets[id].type === 'timespan') {
                        var obj = angular.fromJson(val);
                        result[id] = {
                            start: new Date(obj.start),
                            end: new Date(obj.end)
                        };
                    } else {
                        result[id] = val;
                    }
                });
                return result;
            }

            function getFreeFacetCount(facetSelections, results, id) {
                var isEmpty = !facetSelections[id].value;
                if (isEmpty) {
                    return getNoSelectionCountFromResults(results);
                }

                var facet = _.find(results, ['id', id]);
                return _.sumBy(facet.values, function(val) {
                    return val.value ? val.count : 0;
                });
            }

            function getNoSelectionCountFromResults(results) {
                var count = (_.find((_.find(results, ['id', defaultCountKey]) || {}).values,
                            ['value', undefined]) || {}).count || 0;
                console.log(count);
                return count;
            }

            function parseResults( sparqlResults, facetSelections, selectionId ) {
                var results = facetMapperService.makeObjectList(sparqlResults);

                var isFreeFacet;
                if (selectionId && _.includes(freeFacetTypes, facets[selectionId].type)) {
                    isFreeFacet = true;
                }

                // Due to optimization, no redundant "no selection" values are queried.
                // Because of this, they need to be set for each facet for which
                // the value was not queried.

                // count is the current result count.
                var count;

                if (isFreeFacet) {
                    count = getFreeFacetCount(facetSelections, results, selectionId);
                } else if (!selectionId) {
                    // No facets selected (or emptied free facet), get the count from the results.
                    count = getNoSelectionCountFromResults(results);
                } else {
                    // Get the count from the current selection.
                    count = facetSelections[selectionId][0].count;
                }

                results = setNotSelectionValues(results, count);

                // Add the "no selection" values to facets without them.
                facetStates = results;

                return facetStates;
            }

            function setNotSelectionValues(results, count) {
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
            }

            function buildQuery(facetSelections, id) {
                var query = queryTemplate.replace('<SELECTIONS>',
                        formatter.parseFacetSelections(facetSelections))
                        .replace('<DESELECTIONS>', buildDeselectionUnions(facetSelections, id));
                return query;
            }

            function buildServiceUnions(query) {
                var unions = '';
                _.forOwn(facets, function(facet, id) {
                    if (facet.service) {
                        unions = unions +
                        ' OPTIONAL { ' +
                        '  FILTER(?id = ' + id + ') ' +
                        '  BIND(?id AS ?throwaway) ' +
                        '  SERVICE ' + facet.service + ' { ' +
                        '   ?value sf:preferredLanguageLiteral (skos:prefLabel "<PREF_LANG>" "" ?lbl) .' +
                        '  } ' +
                        ' } ';
                    }
                });
                query = query.replace('<OTHER_SERVICES>', unions);
                return query;
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
                        placeHolder: /<PREF_LANG>/g,
                        value: (config.preferredLang ? config.preferredLang : 'fi')
                    }
                ];

                template = buildServiceUnions(template);

                templateSubs.forEach(function(s) {
                    template = template.replace(s.placeHolder, s.value);
                });
                return template;
            }

            function getTemplateFacets() {
                var res = [];
                _.forOwn(facets, function(facet, uri) {
                    res.push(uri);
                });
                return res.join(' ');
            }

            function buildDeselectionUnions(facetSelections, id) {
                var deselections = [];

                var actualSelections = [];
                _.forOwn(facetSelections, function(val, key) {
                    if (val && (val.value || (_.isArray(val) && (val[0] || {}).value))) {
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
