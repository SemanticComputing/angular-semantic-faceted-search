/*
* Facet handler service.
*/
(function() {
    'use strict';

    /* eslint-disable angular/no-service-method */
    angular.module('seco.facetedSearch')

    .factory('Facets', Facets);

    /* ngInject */
    function Facets($rootScope, $q, _, SparqlService, facetMapperService,
            facetSelectionFormatter, NO_SELECTION_STRING) {

        return FacetHandler;

        function FacetHandler(facetSetup, config) {
            var self = this;

            var freeFacetTypes = ['text', 'timespan'];

            var initialValues = parseInitialValues(config.initialValues, facetSetup);
            var previousSelections = initPreviousSelections(initialValues, facetSetup);

            var endpoint = new SparqlService(config.endpointUrl);

            /* Public API */

            self.facetChanged = facetChanged;
            self.update = update;
            self.disableFacet = disableFacet;
            self.enableFacet = enableFacet;

            self.selectedFacets = _.cloneDeep(previousSelections);
            self.enabledFacets = getInitialEnabledFacets(facetSetup, initialValues);
            self.disabledFacets = getInitialDisabledFacets(facetSetup, self.enabledFacets);

            /* Implementation */

            var _defaultCountKey = getDefaultCountKey(self.enabledFacets);

            var queryTemplate =
            ' PREFIX skos: <http://www.w3.org/2004/02/skos/core#> ' +
            ' PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> ' +
            ' PREFIX sf: <http://ldf.fi/functions#> ' +
            ' PREFIX text: <http://jena.apache.org/text#> ' +

            ' SELECT ?cnt ?id ?facet_text ?value WHERE {' +
            '   { ' +
            '     {' +
            '       SELECT DISTINCT (count(DISTINCT ?s) as ?cnt) (sample(?s) as ?ss) ?id ?value' +
            '       WHERE {' +
            '         VALUES ?id {' +
            '           <TEXT_FACETS> ' +
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
            queryTemplate = buildQueryTemplate(queryTemplate, facetSetup);

            var deselectUnionTemplate =
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
            deselectUnionTemplate = buildQueryTemplate(deselectUnionTemplate, facetSetup);

            var countUnionTemplate =
            ' UNION { ' +
            '   { ' +
            '     SELECT DISTINCT (count(DISTINCT ?s) as ?cnt) ' +
            '     WHERE { ' +
            '       <GRAPH_START> ' +
            '          <SELECTIONS> ' +
            '          <CLASS> ' +
            '       <GRAPH_END> ' +
            '     } ' +
            '   } ' +
            '   BIND("TEXT" AS ?facet_text) ' +
            '   BIND(<VALUE> AS ?value) ' +
            '   BIND(<SELECTION> AS ?id) ' +
            ' }';
            countUnionTemplate = buildQueryTemplate(countUnionTemplate, facetSetup);

            /* Public API functions */

            // Update the facets and call the updateResults callback.
            // id is the id of the facet that triggered the update.
            function update(id) {
                config.updateResults(self.selectedFacets);
                if (!_.size(self.enabledFacets)) {
                    return $q.when();
                }
                return getStates(self.selectedFacets, self.enabledFacets, id, _defaultCountKey)
                .then(function(states) {
                    _.forOwn(self.enabledFacets, function(facet, key) {
                        facet.state = _.find(states, ['id', key]);
                    });
                });
            }

            // Handle a facet state change.
            function facetChanged(id) {
                if (self.selectedFacets[id]) {
                    switch(self.enabledFacets[id].type) {
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

            function disableFacet(id) {
                self.disabledFacets[id] = _.cloneDeep(self.enabledFacets[id]);
                delete self.enabledFacets[id];
                delete self.selectedFacets[id];
                _defaultCountKey = getDefaultCountKey(self.enabledFacets);
                return update();
            }

            function enableFacet(id) {
                self.enabledFacets[id] = _.cloneDeep(self.disabledFacets[id]);
                delete self.disabledFacets[id];
                _defaultCountKey = getDefaultCountKey(self.enabledFacets);
                if (_.includes(freeFacetTypes, self.enabledFacets[id].type)) {
                    return $q.when();
                }
                return update();
            }

            /* Private functions */

            /* Facet change handling */

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
                if (hasChanged(id, self.enabledFacets, previousSelections)) {
                    previousSelections[id] = _.clone(self.selectedFacets[id]);
                    return update(id);
                }
                return $q.when();
            }

            function basicFacetChanged(id) {
                var selectedFacet = self.selectedFacets[id];
                if (selectedFacet.length === 0) {
                    // Another facet selection (text search) has resulted in this
                    // facet not having a value even though it has a selection.
                    // Fix it by adding its previous state to the facet state list
                    // with count = 0.
                    var prev = _.clone(previousSelections[id]);
                    prev[0].count = 0;
                    self.enabledFacets[id].state.values = self.enabledFacets[id].state.values.concat(prev);
                    self.selectedFacets[id] = _.clone(previousSelections[id]);
                    return $q.when();
                }
                if (hasChanged(id, self.enabledFacets, previousSelections)) {
                    previousSelections[id] = _.cloneDeep(selectedFacet);
                    return update(id);
                }
                return $q.when();
            }

            /* Result parsing */

            function getStates(facetSelections, facets, id, defaultCountKey) {
                var query = buildQuery(facetSelections, facets, defaultCountKey);

                var promise = endpoint.getObjects(query);
                return promise.then(function(results) {
                    return parseResults(results, facetSelections, facets, id, defaultCountKey);
                });
            }

            function parseResults(sparqlResults, facetSelections, facets,
                    selectionId, defaultCountKey) {
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
                } else {
                    count = getNoSelectionCountFromResults(results, facetSelections, defaultCountKey);
                }

                results = setNotSelectionValues(results, count, facets);

                return results;
            }

            function getNoSelectionCountFromResults(results, facetSelections, defaultCountKey) {
                var countKeySelection;
                if (facetSelections) {
                    ((facetSelections[defaultCountKey] || [])[0] || {}).value;
                }

                var count = (_.find((_.find(results, ['id', defaultCountKey]) || {}).values,
                            ['value', countKeySelection]) || {}).count || 0;
                return count;
            }

            // Set the 'no selection' values for those facets that do not have it.
            function setNotSelectionValues(results, count, facets) {
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
                return results;
            }

            /* Initialization */

            function initPreviousSelections(initialValues, facets) {
                var selections = {};
                _.forOwn(facets, function(val, id) {
                    var initialVal = initialValues[id];
                    if (!initialVal) {
                        return;
                    }
                    if (!val.type) {
                        // Basic facet
                        selections[id] = [{ value: initialVal }];
                    } else {
                        // Text/time-span facet
                        selections[id] = { value: initialVal };
                    }
                });
                return selections;
            }

            function parseInitialValues(values, facets) {
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

            function getDefaultCountKey(facets) {
                var key = _.findKey(facets, function(facet) {
                    return !facet.type;
                });
                if (!key) {
                    key = _.keys(facets)[0];
                }
                return key;
            }

            /* Query builders */

            function buildQuery(facetSelections, facets, defaultCountKey) {
                var query = queryTemplate.replace('<FACETS>',
                        getTemplateFacets(facets));
                var textFacets = '';
                _.forOwn(facetSelections, function(facet, fId) {
                    if (facets[fId].type === 'text' && facet.value) {
                        textFacets = textFacets + ' ' + fId;
                    }
                });
                query = query.replace('<TEXT_FACETS>', textFacets);
                query = query.replace('<SELECTIONS>',
                        facetSelectionFormatter.parseFacetSelections(facets,
                            facetSelections))
                        .replace('<DESELECTIONS>',
                                buildCountUnions(facetSelections, facets, defaultCountKey));
                return query;
            }

            function buildServiceUnions(query, facets) {
                var unions = '';
                _.forOwn(facets, function(facet, id) {
                    if (facet.service) {
                        unions = unions +
                        ' OPTIONAL { ' +
                        '  FILTER(?id = ' + id + ') ' +
                        '  BIND(IF(BOUND(?ss), ?value, <>) AS ?gobbledigook) ' +
                        '  ?ss ?id ?gobbledigook . ' +
                        '  SERVICE ' + facet.service + ' { ' +
                        '   ?value sf:preferredLanguageLiteral (skos:prefLabel "<PREF_LANG>" "" ?lbl) .' +
                        '  } ' +
                        ' } ';
                    }
                });
                query = query.replace('<OTHER_SERVICES>', unions);
                return query;
            }

            function buildQueryTemplate(template, facets) {
                var templateSubs = [
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

                template = buildServiceUnions(template, facets);

                templateSubs.forEach(function(s) {
                    template = template.replace(s.placeHolder, s.value);
                });
                return template;
            }

            // Build unions for deselection counts and time-span selection counts.
            function buildCountUnions(facetSelections, facets, defaultCountKey) {
                var deselections = [];

                var actualSelections = [];
                var defaultSelected = false;
                _.forOwn(facetSelections, function(val, key) {
                    if (val && (val.value || (_.isArray(val) && (val[0] || {}).value))) {
                        actualSelections.push({ id: key, value: val });
                        if (key === defaultCountKey) {
                            defaultSelected = true;
                        }
                    }
                });
                var selections = actualSelections;

                if (!defaultSelected && defaultCountKey) {
                    selections.push({ id: defaultCountKey, value: undefined });
                }
                var timeSpanSelections = [];
                _.forEach( selections, function( selection ) {
                    var s = deselectUnionTemplate.replace('<DESELECTION>', selection.id);
                    var others = {};
                    var select;
                    _.forEach( selections, function( s ) {
                        if (s.id !== selection.id) {
                            if (s.value) {
                                others[s.id] = s.value;
                            }
                        } else if (facets[s.id].type === 'timespan' && s.value) {
                            select = {};
                            select[s.id] = s.value;
                        }
                    });
                    deselections.push(s.replace('<OTHER_SELECTIONS>',
                            facetSelectionFormatter.parseFacetSelections(facets, others)));
                    if (select) {
                        var cq = countUnionTemplate.replace('<VALUE>', '"whatever"');
                        cq = cq.replace('<SELECTION>', selection.id);
                        timeSpanSelections.push(cq.replace('<SELECTIONS>',
                                facetSelectionFormatter.parseFacetSelections(facets, others) +
                                facetSelectionFormatter.parseFacetSelections(facets, select)));
                    }
                });
                return deselections.join(' ') + ' ' + timeSpanSelections.join(' ');
            }

            /* Utilities */

            function hasChanged(id, facets, previousSelections) {
                var selectedFacet = facets[id];
                if (!_.isEqualWith(previousSelections[id], selectedFacet, hasSameValue)) {
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

            function getTemplateFacets(facets) {
                var res = [];
                _.forOwn(facets, function(facet, uri) {
                    if (facet.type !== 'text') {
                        res.push(uri);
                    }
                });
                return res.join(' ');
            }
        }
    }
})();
