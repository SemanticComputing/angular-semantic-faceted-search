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

            var endpoint = new SparqlService(config.endpointUrl);

            if (!config.updateResults) {
                config.updateResults = function() {};
            }

            /* Public API */

            self.facetChanged = facetChanged;
            self.update = update;
            self.disableFacet = disableFacet;
            self.enableFacet = enableFacet;

            self.enabledFacets = getInitialEnabledFacets(facetSetup, initialValues);
            self.disabledFacets = getInitialDisabledFacets(facetSetup, self.enabledFacets);

            var previousSelections = initPreviousSelections(initialValues, self.enabledFacets);

            self.selectedFacets = _.cloneDeep(previousSelections);

            /* Implementation */

            var _defaultCountKey = getDefaultCountKey(self.enabledFacets);

            var labelPart =
            ' OPTIONAL {' +
            '  ?value skos:prefLabel ?lbl . ' +
            '  FILTER(langMatches(lang(?lbl), "<PREF_LANG>")) .' +
            ' }' +
            ' OPTIONAL {' +
            '  ?value rdfs:label ?lbl . ' +
            '  FILTER(langMatches(lang(?lbl), "<PREF_LANG>")) .' +
            ' }' +
            ' OPTIONAL {' +
            '  ?value skos:prefLabel ?lbl . ' +
            '  FILTER(langMatches(lang(?lbl), "")) .' +
            ' }' +
            ' OPTIONAL {' +
            '  ?value rdfs:label ?lbl . ' +
            '  FILTER(langMatches(lang(?lbl), "")) .' +
            ' }';

            var queryTemplate =
            ' PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> ' +
            ' PREFIX skos: <http://www.w3.org/2004/02/skos/core#> ' +
            ' PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> ' +
            ' PREFIX sf: <http://ldf.fi/functions#> ' +
            ' PREFIX text: <http://jena.apache.org/text#> ' +

            ' SELECT ?cnt ?id ?facet_text ?value WHERE {' +
            '  <DESELECTIONS> ' +
            '  {' +
            '   SELECT ?cnt ?ss ?id ?value ?facet_text { ' +
            '    {' +
            '     SELECT DISTINCT (count(DISTINCT ?s) as ?cnt) (sample(?s) as ?ss) ?id ?value {' +
            '      VALUES ?id {' +
            '       <TEXT_FACETS> ' +
            '       <FACETS> ' +
            '      } ' +
            '      <GRAPH_START> ' +
            '       { ' +
            '        <SELECTIONS> ' +
            '        <CONSTRAINT> ' +
            '       } ' +
            '       <SELECTION_FILTERS> ' +
            '       ?s ?id ?value . ' +
            '      <GRAPH_END> ' +
            '     } GROUP BY ?id ?value ' +
            '    } ' +
            '    FILTER(BOUND(?id)) ' +
            '    <LABEL_PART> ' +
            '    <OTHER_SERVICES> ' +
            '    BIND(COALESCE(?lbl, IF(ISURI(?value), REPLACE(STR(?value), "^.+/(.+?)$", "$1"), STR(?value))) as ?facet_text)' +
            '   } ORDER BY ?id ?facet_text ' +
            '  }' +
            '  <HIERARCHY_FACETS> ' +
            ' } ';
            queryTemplate = buildQueryTemplate(queryTemplate, facetSetup);

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
            deselectUnionTemplate = buildQueryTemplate(deselectUnionTemplate, facetSetup);

            var countUnionTemplate =
            ' { ' +
            '  { ' +
            '   SELECT DISTINCT (count(DISTINCT ?s) as ?cnt) ' +
            '   WHERE { ' +
            '    <GRAPH_START> ' +
            '     <SELECTIONS> ' +
            '     <CONSTRAINT> ' +
            '    <GRAPH_END> ' +
            '   } ' +
            '  } ' +
            '  BIND("TEXT" AS ?facet_text) ' +
            '  BIND(<VALUE> AS ?value) ' +
            '  BIND(<SELECTION> AS ?id) ' +
            ' } UNION ';
            countUnionTemplate = buildQueryTemplate(countUnionTemplate, facetSetup);

            var hierarchyUnionTemplate =
            ' UNION { ' +
            '  SELECT DISTINCT ?cnt ?id ?value ?facet_text {' +
            '   { ' +
            '    SELECT DISTINCT (count(DISTINCT ?s) as ?cnt) ?id ?value ?class {' +
            '     BIND(<HIERARCHY_FACET> AS ?id) ' +
            '     VALUES ?class { ' +
            '      <HIERARCHY_CLASSES> ' +
            '     } ' +
            '     ?value <HIERARCHY_PROPERTY> ?class . ' +
            '     ?h <HIERARCHY_PROPERTY> ?value . ' +
            '     ?s ?id ?h .' +
            '     <SELECTIONS> ' +
            '     <CONSTRAINT> ' +
            '    } GROUP BY ?class ?value ?id' +
            '   } ' +
            '   FILTER(BOUND(?id))' +
            '   <LABEL_PART> ' +
            '   BIND(COALESCE(?lbl, STR(?value)) as ?label)' +
            '   BIND(IF(?value = ?class, ?label, CONCAT("-- ", ?label)) as ?facet_text)' +
            '   BIND(IF(?value = ?class, 0, 1) as ?order)' +
            '  } ORDER BY ?class ?order ?facet_text' +
            ' } ';
            hierarchyUnionTemplate = buildQueryTemplate(hierarchyUnionTemplate, facetSetup);

            /* Public API functions */

            // Update the facets and call the updateResults callback.
            // id is the id of the facet that triggered the update.
            function update(id) {
                config.updateResults(self.selectedFacets);
                if (!_.size(self.enabledFacets)) {
                    return $q.when({});
                }
                return getStates(self.selectedFacets, self.enabledFacets, id, _defaultCountKey)
                .then(function(states) {
                    _.forOwn(self.enabledFacets, function(facet, key) {
                        facet.state = _.find(states, ['id', key]);
                    });
                    return self.enabledFacets;
                });
            }

            // Handle a facet state change.
            function facetChanged(id) {
                var selectedFacet = self.selectedFacets[id];
                if (!hasChanged(id, selectedFacet, previousSelections)) {
                    return $q.when(self.enabledFacets);
                }
                switch(self.enabledFacets[id].type) {
                    case 'timespan':
                        return timeSpanFacetChanged(id);
                    case 'text':
                        return textFacetChanged(id);
                    default:
                        return basicFacetChanged(id);
                }
                return $q.when(self.enabledFacets);
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

            /* Facet change handling */

            function timeSpanFacetChanged(id) {
                var selectedFacet = self.selectedFacets[id];
                if (selectedFacet) {
                    var start = (selectedFacet.value || {}).start;
                    var end = (selectedFacet.value || {}).end;

                    if ((start || end) && !(start && end)) {
                        return $q.when();
                    }
                    return self.update(id);
                }
                return $q.when(self.enabledFacets);
            }

            function textFacetChanged(id) {
                previousSelections[id] = _.clone(self.selectedFacets[id]);
                return self.update(id);
            }

            function basicFacetChanged(id) {
                var selectedFacet = self.selectedFacets[id];
                if (selectedFacet === null) {
                    // Another facet selection (text search) has resulted in this
                    // facet not having a value even though it has a selection.
                    // Fix it by adding its previous state to the facet state list
                    // with count = 0.
                    var prev = _.clone(previousSelections[id]);
                    if (_.isArray(prev)) {
                        prev[0].count = 0;
                    } else {
                        prev.count = 0;
                    }
                    self.enabledFacets[id].state.values = self.enabledFacets[id].state.values.concat(prev);
                    self.selectedFacets[id] = _.clone(previousSelections[id]);
                    return $q.when(self.enabledFacets);
                }
                previousSelections[id] = _.cloneDeep(selectedFacet);
                return self.update(id);
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
                    count = getFreeFacetCount(facetSelections, results, selectionId, defaultCountKey);
                } else {
                    count = getNoSelectionCountFromResults(results, facetSelections, defaultCountKey);
                }

                results = setNotSelectionValues(results, count, facets);

                return results;
            }

            function getNoSelectionCountFromResults(results, facetSelections, defaultCountKey) {
                var countKeySelection;
                if (facetSelections) {
                    var v = (facetSelections[defaultCountKey] || []);
                    countKeySelection = ((_.isArray(v) ? v[0] : v) || {}).value;
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
                query = query
                    .replace('<HIERARCHY_FACETS>', buildHierarchyUnions(facets, facetSelections))
                    .replace('<DESELECTIONS>', buildCountUnions(facetSelections,
                            facets, defaultCountKey))
                    .replace(/<SELECTIONS>/g,
                        facetSelectionFormatter.parseFacetSelections(facets,
                            facetSelections))
                    .replace('<SELECTION_FILTERS>',
                            buildSelectionFilters(facetSelections, facets));

                return query;
            }

            function buildSelectionFilters(facetSelections, facets) {
                var filter = '';
                _.forOwn(facetSelections, function(facet, fId) {
                    if (!facets[fId].type) {
                        if (_.isArray(facet)) {
                            facet.forEach(function(selection) {
                                filter = filter + getSelectionFilter(fId, selection.value);
                            });
                        } else if (facet) {
                            filter = filter + getSelectionFilter(fId, facet.value);
                        }
                    }
                });
                return filter;
            }

            function getSelectionFilter(fId, value) {
                return value ? ' FILTER(?id != ' + fId +
                    ' || ?id = ' + fId + ' && ?value = ' + value + ') ' : '';
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
                            labelPart +
                        '  } ' +
                        ' } ';
                    }
                });
                query = query.replace('<OTHER_SERVICES>', unions);
                return query;
            }

            function buildHierarchyUnions(facets, facetSelections) {
                var unions = '';
                _.forOwn(facets, function(facet, id) {
                    if (facet.type === 'hierarchy') {
                        unions = unions + hierarchyUnionTemplate
                            .replace('<HIERARCHY_CLASSES>',
                                getHierarchyFacetClasses(facet, facetSelections, id))
                            .replace('<HIERARCHY_FACET>', id)
                            .replace(/<HIERARCHY_PROPERTY>/g, facet.property)
                            .replace(/<SELECTIONS>/g,
                                facetSelectionFormatter.parseFacetSelections(facets,
                                    rejectHierarchies(facets, facetSelections)));
                    }
                });
                return unions;
            }

            function getHierarchyFacetClasses(facet, facetSelections, id) {
                var selection = facetSelections[id];
                var res = '';
                if (selection) {
                    if (_.isArray(selection)) {
                        selection.forEach(function(s) {
                            if (s.value) {
                                res = res + ' ' + s.value;
                            }
                        });
                    } else {
                        res = selection.value;
                    }
                }
                return res ? res : facet.classes.join(' ');
            }

            function rejectHierarchies(facets, facetSelections) {
                return _.pickBy(facetSelections, function(s, key) {
                    return facets[key].type !== 'hierarchy';
                });
            }


            function buildQueryTemplate(template, facets) {
                var templateSubs = [
                    {
                        placeHolder: '<GRAPH_START>',
                        value: (config.graph ? ' GRAPH ' + config.graph + ' { ' : '')
                    },
                    {
                        placeHolder: '<CONSTRAINT>',
                        value: getInitialConstraints()
                    },
                    {
                        placeHolder: '<GRAPH_END>',
                        value: (config.graph ? ' } ' : '')
                    },
                    {
                        placeHolder: '<LABEL_PART>',
                        value: labelPart
                    },
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

            function getInitialConstraints() {
                var constraints = config.rdfClass ? ' ?s a ' + config.rdfClass + ' . ' : '';
                constraints = constraints + (config.constraint || '');
                return constraints;
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

            function hasChanged(id, selectedFacet, previousSelections) {
                if (!_.isEqualWith(previousSelections[id], selectedFacet, hasSameValue)) {
                    return true;
                }
                return false;
            }

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

            function getFreeFacetCount(facetSelections, results, id, defaultCountKey) {
                var isEmpty = !facetSelections[id].value;
                if (isEmpty) {
                    return getNoSelectionCountFromResults(results, facetSelections, defaultCountKey);
                }

                var facet = _.find(results, ['id', id]);
                return _.sumBy(facet.values, function(val) {
                    return val.value ? val.count : 0;
                });
            }

            function getTemplateFacets(facets) {
                var res = [];
                _.forOwn(facets, function(facet, uri) {
                    if (facet.type !== 'text' && facet.type !== 'hierarchy') {
                        res.push(uri);
                    }
                });
                return res.join(' ');
            }

            /* Exposed for testing purposes only */

            self._hasChanged = hasChanged;
            self._hasSameValue = hasSameValue;
            self._getFreeFacetCount = getFreeFacetCount;
            self._getTemplateFacets = getTemplateFacets;
            self._buildCountUnions = buildCountUnions;
            self._getHierarchyFacetClasses = getHierarchyFacetClasses;
            self._rejectHierarchies = rejectHierarchies;
            self._buildHierarchyUnions = buildHierarchyUnions;
            self._buildQueryTemplate = buildQueryTemplate;
            self._buildQuery = buildQuery;
            self._basicFacetChanged = basicFacetChanged;
            self._timeSpanFacetChanged = timeSpanFacetChanged;
            self._textFacetChanged = textFacetChanged;
            self._getNoSelectionCountFromResults = getNoSelectionCountFromResults;
            self._setNotSelectionValues = setNotSelectionValues;
            self._getStates = getStates;
            self._parseResults = parseResults;
            self._parseInitialValues = parseInitialValues;
            self._initPreviousSelections = initPreviousSelections;
            self._getInitialEnabledFacets = getInitialEnabledFacets;
            self._getInitialDisabledFacets = getInitialDisabledFacets;
            self._getDefaultCountKey = getDefaultCountKey;
            self._buildSelectionFilters = buildSelectionFilters;

            self._getCurrentDefaultCountKey = function() { return _defaultCountKey; };
            self._getPreviousSelections = function() { return previousSelections; };
        }
    }
})();
