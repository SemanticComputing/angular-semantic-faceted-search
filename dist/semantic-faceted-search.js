/*
 * facets module definition
 */
(function() {
    'use strict';

    angular.module('seco.facetedSearch', ['sparql', 'ui.bootstrap', 'angularSpinner'])
    .constant('_', _) // eslint-disable-line no-undef
    .constant('NO_SELECTION_STRING', '-- No Selection --');
})();


(function() {

    'use strict';

    /* eslint-disable angular/no-service-method */
    angular.module('seco.facetedSearch')

    /*
    * Service for updating the URL parameters based on facet selections.
    */
    .service('facetUrlStateHandlerService', facetUrlStateHandlerService);

    /* @ngInject */
    function facetUrlStateHandlerService($location, _) {

        this.updateUrlParams = updateUrlParams;
        this.getFacetValuesFromUrlParams = getFacetValuesFromUrlParams;

        function updateUrlParams(facetSelections) {
            var values = getFacetValues(facetSelections);
            $location.search(values);
        }

        function getFacetValuesFromUrlParams() {
            return $location.search();
        }

        function getFacetValues(facetSelections) {
            var values = {};
            _.forOwn(facetSelections, function(val, id) {
                if (_.isArray(val)) {
                    // Basic facet (with multiselect)
                    var vals = _(val).map('value').compact().value();
                    if (vals.length) {
                        values[id] = vals;
                    }
                } else if (_.isObject(val.value)) {
                    // Timespan facet
                    var span = val.value;
                    if (span.start && span.end) {
                        var timespan = {
                            start: parseValue(val.value.start),
                            end: parseValue(val.value.end)
                        };
                        values[id] = angular.toJson(timespan);
                    }
                } else if (val.value) {
                    // Text facet
                    values[id] = val.value;
                }
            });
            return values;
        }

        function parseValue(value) {
            if (Date.parse(value)) {
                return value.toISOString().slice(0, 10);
            }
            return value;
        }
    }
})();

(function() {
    'use strict';

    angular.module('seco.facetedSearch')
    .constant('DEFAULT_PAGES_PER_QUERY', 1)
    .constant('DEFAULT_RESULTS_PER_PAGE', 10)

    /*
    * Result handler service.
    */
    .factory('FacetResultHandler', FacetResultHandler);

    /* @ngInject */
    function FacetResultHandler(DEFAULT_PAGES_PER_QUERY, DEFAULT_RESULTS_PER_PAGE,
            AdvancedSparqlService, facetSelectionFormatter, objectMapperService ) {

        return ResultHandler;

        function ResultHandler(endpointUrl, facets, mapper, resultsPerPage, pagesPerQuery) {
            mapper = mapper || objectMapperService;
            resultsPerPage = resultsPerPage || DEFAULT_RESULTS_PER_PAGE;
            pagesPerQuery = pagesPerQuery || DEFAULT_PAGES_PER_QUERY;

            var endpoint = new AdvancedSparqlService(endpointUrl, mapper);

            this.getResults = getResults;

            function getResults(facetSelections, query, resultSetQry) {
                query = query.replace('<FACET_SELECTIONS>',
                        facetSelectionFormatter.parseFacetSelections(facets, facetSelections));
                return endpoint.getObjects(query,
                    resultsPerPage,
                    resultSetQry.replace('<FACET_SELECTIONS>', facetSelectionFormatter.parseFacetSelections(facets, facetSelections)),
                    pagesPerQuery);
            }
        }
    }
})();

(function() {
    'use strict';

    /*
    * Service for transforming SPARQL result triples into facet objects.
    *
    * Author Erkki Heino.
    */
    angular.module('seco.facetedSearch')

    .factory('facetMapperService', facetMapperService);

    /* ngInject */
    function facetMapperService(_, objectMapperService) {
        FacetMapper.prototype.makeObject = makeObject;
        FacetMapper.prototype.mergeObjects = mergeObjects;
        FacetMapper.prototype.postProcess = postProcess;

        var proto = Object.getPrototypeOf(objectMapperService);
        FacetMapper.prototype = angular.extend({}, proto, FacetMapper.prototype);

        return new FacetMapper();

        function FacetMapper() {
            this.objectClass = Object;
        }

        function makeObject(obj) {
            var o = new this.objectClass();

            o.id = '<' + obj.id.value + '>';

            o.values = [{
                value: parseValue(obj.value),
                text: obj.facet_text.value,
                count: parseInt(obj.cnt.value)
            }];

            return o;
        }

        function mergeObjects(first, second) {
            first.values.push(second.values[0]);
            return first;
        }

        function postProcess(objs) {
            objs.forEach(function(o) {
                var noSelectionIndex = _.findIndex(o.values, function(v) {
                    return angular.isUndefined(v.value);
                });
                if (noSelectionIndex > -1) {
                    var noSel = _.pullAt(o.values, noSelectionIndex);
                    o.values = noSel.concat(o.values);
                }
            });

            return objs;
        }

        function parseValue(value) {
            if (!value) {
                return undefined;
            }
            if (value.type === 'uri') {
                return '<' + value.value + '>';
            }
            if (value.type === 'typed-literal' && value.datatype === 'http://www.w3.org/2001/XMLSchema#integer') {
                return value.value;
            }
            if (value.type === 'typed-literal' && value.datatype === 'http://www.w3.org/2001/XMLSchema#date') {
                return '"' + value.value + '"^^<http://www.w3.org/2001/XMLSchema#date>';
            }
            return '"' + value.value + '"';
        }

    }
})();

(function() {

    'use strict';

    /* eslint-disable angular/no-service-method */
    angular.module('seco.facetedSearch')
    .service('facetSelectionFormatter', facetSelectionFormatter);

    /* ngInject */
    function facetSelectionFormatter(_) {
        this.parseFacetSelections = parseFacetSelections;
        this.parseBasicFacet = parseBasicFacet;

        var resourceTimeSpanFilterTemplate =
        ' ?s <TIME_SPAN_PROPERTY> ?time_span_uri . ' +
        ' <START_FILTER> ' +
        ' <END_FILTER> ';

        var simpleTimeSpanFilterTemplate =
        ' <START_FILTER> ' +
        ' <END_FILTER> ';

        var timeSpanStartFilter =
        ' <TIME_SPAN_URI> <START_PROPERTY> ?start . ' +
        ' FILTER(?start >= "<START_VALUE>"^^<http://www.w3.org/2001/XMLSchema#date>) ';

        var timeSpanEndFilter =
        ' <TIME_SPAN_URI> <END_PROPERTY> ?end . ' +
        ' FILTER(?end <= "<END_VALUE>"^^<http://www.w3.org/2001/XMLSchema#date>) ';

        var timeSpanEndFilterSimple =
        ' FILTER(?start <= "<END_VALUE>"^^<http://www.w3.org/2001/XMLSchema#date>) ';

        var simpleTimeSpanUri = '?s';
        var resourceTimeSpanUri = '?time_span_uri';

        function parseFacetSelections(facets, facetSelections) {
            var otherFacets = [];
            var textFacets = [];
            _.forOwn(facetSelections, function(facet, id) {
                if (facets[id].type === 'text') {
                    textFacets.push({ id: id, val: facet });
                } else {
                    otherFacets.push({ id: id, val: facet });
                }
            });
            var selections = textFacets.concat(otherFacets);

            var result = '';
            var i = 0;
            _.forEach(selections, function(facet) {
                if (facet.val && _.isArray(facet.val)) {
                    for (var j = 0; j < facet.val.length; j++) {
                        if (!facet.val[j].value) {
                            return;
                        }
                    }
                } else if (!(facet.val && facet.val.value)) {
                    return;
                }

                var facetType = facets[facet.id].type;

                switch (facetType) {
                    case 'timespan':
                        result = result + parseTimeSpanFacet(facet.val, facet.id, facets);
                        break;
                    case 'text':
                        result = result + parseTextFacet(facet.val, facet.id, i++);
                        break;
                    case 'hierarchy':
                        result = result + parseHierarchyFacet(facet.val, facet.id, facets, i++);
                        break;
                    default:
                        result = result + parseBasicFacet(facet.val, facet.id);
                }
            });
            return result;
        }

        function parseHierarchyFacet(val, key, facets, i) {
            var result = '';
            var hVar = ' ?h' + i;
            var hierarchyProp = facets[key].property;
            if (_.isArray(val)) {
                val.forEach(function(value) {
                    result = result + hVar + ' ' + hierarchyProp + ' ' + value.value + ' . ';
                    result = result + ' ?s ' + key + ' ' + hVar + ' . ';
                    hVar = hVar + '_' + i++;
                });
                return result;
            }
            result = hVar + ' ' + hierarchyProp + ' ' + val.value + ' . ';
            return result = result + ' ?s ' + key + ' ' + hVar + ' . ';
        }

        function parseBasicFacet(val, key) {
            var result = '';
            if (_.isArray(val)) {
                val.forEach(function(value) {
                    result = result + ' ?s ' + key + ' ' + value.value + ' . ';
                });
                return result;
            }
            return ' ?s ' + key + ' ' + val.value + ' . ';
        }

        function parseTextFacet(val, key, i) {
            var result = ' ?s text:query "' + val.value + '*" . ';
            var textVar = ' ?text' + i;
            result = result + ' ?s ' + key + ' ' + textVar + ' . ';
            var words = val.value.replace(/[?,._*'\\/-]/g, '');

            words.split(' ').forEach(function(word) {
                result = result + ' FILTER(REGEX(' + textVar + ', "' + word + '", "i")) ';
            });

            return result;
        }

        function parseTimeSpanFacet(val, key, facets) {
            var isResource = facets[key].isResource;
            var result = isResource ?
                    resourceTimeSpanFilterTemplate :
                    simpleTimeSpanFilterTemplate;

            var start = (val.value || {}).start;
            var end = (val.value || {}).end;

            var endFilter = timeSpanEndFilter;
            var facet = facets[key];

            if (facet.start === facet.end) {
                endFilter = timeSpanEndFilterSimple;
            }
            if (start) {
                start = dateToISOString(start);
                result = result
                    .replace('<START_FILTER>',
                        timeSpanStartFilter.replace('<START_PROPERTY>',
                            facet.start))
                    .replace('<TIME_SPAN_URI>',
                            isResource ? resourceTimeSpanUri : simpleTimeSpanUri)
                    .replace('<START_VALUE>', start);
            } else {
                result = result.replace('<START_FILTER>', '');
            }
            if (end) {
                end = dateToISOString(end);
                result = result.replace('<END_FILTER>',
                        endFilter.replace('<END_PROPERTY>',
                            facet.end))
                    .replace('<TIME_SPAN_URI>',
                            isResource ? resourceTimeSpanUri : simpleTimeSpanUri)
                    .replace('<END_VALUE>', end);
            } else {
                result = result.replace('<END_FILTER>', '');
            }
            return result.replace('<TIME_SPAN_PROPERTY>', key);
        }

        function dateToISOString(date) {
            return date.toISOString().slice(0, 10);
        }
    }
})();

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
            ' UNION { ' +
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
            ' }';
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
            '     <SELECTIONS> ' +
            '     ?value <HIERARCHY_PROPERTY> ?class . ' +
            '     ?h <HIERARCHY_PROPERTY> ?value . ' +
            '     ?s ?id ?h .' +
            '     <CONSTRAINT> ' +
            '    } GROUP BY ?class ?value ?id' +
            '   } ' +
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
                    return $q.when();
                }
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
                previousSelections[id] = _.clone(self.selectedFacets[id]);
                return update(id);
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
                previousSelections[id] = _.cloneDeep(selectedFacet);
                return update(id);
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
                    if (!initialVal) {
                        return;
                    }
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
                    if (!facets[fId].type && _.isArray(facet)) {
                        facet.forEach(function(selection) {
                            filter = filter + getSelectionFilter(fId, selection.value);
                        });
                    } else {
                        filter = filter + getSelectionFilter(fId, facet.value);
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

            self._getCurrentDefaultCountKey = function() { return _defaultCountKey; };
        }
    }
})();

(function() {
    'use strict';

    angular.module('seco.facetedSearch')
    .filter( 'textWithSelection', function(_) {
        return function(values, text, selection) {
            if (!text) {
                return values;
            }
            var selectedValues;
            if (_.isArray(selection)) {
                selectedValues = _.map(selection, 'value');
            } else {
                selectedValues = [selection];
            }

            var hasNoSelection = _.some(selectedValues, angular.isUndefined);
            if (!hasNoSelection) {
                selectedValues.push(undefined);
            }

            return _.filter(values, function(val) {
                return _.includes(val.text.toLowerCase(), text.toLowerCase()) || _.includes(selectedValues, val.value);
            });
        };
    });
})();

angular.module('seco.facetedSearch').run(['$templateCache', function($templateCache) {
  'use strict';

  $templateCache.put('src/facets/facets.directive.html',
    "<style>\n" +
    "  .vertical-align {\n" +
    "    display: flex;\n" +
    "    flex-direction: row;\n" +
    "  }\n" +
    "  .vertical-align > [class^=\"col-\"],\n" +
    "  .vertical-align > [class*=\" col-\"] {\n" +
    "    display: flex;\n" +
    "    align-items: center;\n" +
    "  }\n" +
    "  .facet-enable-btn-container {\n" +
    "    justify-content: center;\n" +
    "  }\n" +
    "  .row.no-gutter {\n" +
    "    margin-left: 0;\n" +
    "    margin-right: 0;\n" +
    "  }\n" +
    "\n" +
    "  .row.no-gutter [class*='col-']:not(:first-child),\n" +
    "  .row.no-gutter [class*='col-']:not(:last-child) {\n" +
    "    padding-right: 0;\n" +
    "    padding-left: 0;\n" +
    "  }\n" +
    "</style>\n" +
    "<div class=\"facets\">\n" +
    "  <span us-spinner=\"{radius:30, width:8, length: 40}\" ng-if=\"vm.isLoadingFacets\"></span>\n" +
    "  <div class=\"facet\" ng-repeat=\"(id, facet) in vm.enabledFacets\">\n" +
    "    <div class=\"well well-sm\">\n" +
    "      <div class=\"row\">\n" +
    "        <div class=\"col-xs-12 text-left\">\n" +
    "          <h5 class=\"facet-name pull-left\">{{ facet.name }}</h5>\n" +
    "          <button\n" +
    "            ng-disabled=\"vm.isDisabled()\"\n" +
    "            ng-click=\"vm.disableFacet(id)\"\n" +
    "            class=\"btn btn-danger btn-xs pull-right glyphicon glyphicon-remove\">\n" +
    "          </button>\n" +
    "        </div>\n" +
    "      </div>\n" +
    "      <div class=\"facet-input-container\">\n" +
    "        <div ng-if=\"::!facet.type || facet.type === 'hierarchy'\">\n" +
    "          <input\n" +
    "            ng-disabled=\"vm.isDisabled()\"\n" +
    "            type=\"text\"\n" +
    "            class=\"form-control\"\n" +
    "            ng-model=\"textFilter\" />\n" +
    "          <select\n" +
    "            ng-change=\"vm.changed(id)\"\n" +
    "            ng-disabled=\"vm.isDisabled()\"\n" +
    "            size=\"{{ vm.getFacetSize(facet.state.values) }}\"\n" +
    "            id=\"{{ ::facet.name + '_select' }}\"\n" +
    "            class=\"selector form-control\"\n" +
    "            ng-options=\"value as (value.text + ' (' + value.count + ')') for value in facet.state.values | textWithSelection:textFilter:vm.selectedFacets[id] track by value.value\"\n" +
    "            ng-model=\"vm.selectedFacets[id]\">\n" +
    "          </select>\n" +
    "        </div>\n" +
    "        <div ng-if=\"::facet.type === 'text'\">\n" +
    "          <p class=\"input-group\">\n" +
    "          <input type=\"text\" class=\"form-control\"\n" +
    "          ng-change=\"vm.changed(id)\"\n" +
    "          ng-disabled=\"vm.isDisabled()\"\n" +
    "          ng-model=\"vm.selectedFacets[id].value\"\n" +
    "          ng-model-options=\"{ debounce: 1000 }\">\n" +
    "          </input>\n" +
    "          <span class=\"input-group-btn\">\n" +
    "            <button type=\"button\" class=\"btn btn-default\"\n" +
    "              ng-disabled=\"vm.isDisabled()\"\n" +
    "              ng-click=\"vm.clearTextFacet(id)\">\n" +
    "              <i class=\"glyphicon glyphicon-remove\"></i>\n" +
    "            </button>\n" +
    "          </span>\n" +
    "          </p>\n" +
    "        </div>\n" +
    "        <div ng-if=\"::facet.type === 'timespan'\">\n" +
    "          <div class=\"row no-gutter\">\n" +
    "            <div class=\"col-md-6 facet-date-left\">\n" +
    "              <span class=\"input-group\">\n" +
    "                <span class=\"input-group-btn\">\n" +
    "                  <button type=\"button\" class=\"btn btn-default\"\n" +
    "                    ng-click=\"startDate.opened = !startDate.opened\">\n" +
    "                    <i class=\"glyphicon glyphicon-calendar\"></i>\n" +
    "                  </button>\n" +
    "                </span>\n" +
    "                <input type=\"text\" class=\"form-control\"\n" +
    "                uib-datepicker-popup=\"\"\n" +
    "                ng-disabled=\"vm.isDisabled()\"\n" +
    "                ng-change=\"vm.changed(id)\"\n" +
    "                ng-readonly=\"true\"\n" +
    "                ng-model=\"vm.selectedFacets[id].value.start\"\n" +
    "                is-open=\"startDate.opened\"\n" +
    "                min-date=\"facet.min\"\n" +
    "                max-date=\"facet.max\"\n" +
    "                init-date=\"facet.min\"\n" +
    "                show-button-bar=\"false\"\n" +
    "                starting-day=\"1\"\n" +
    "                ng-required=\"true\"\n" +
    "                close-text=\"Close\" />\n" +
    "              </span>\n" +
    "            </div>\n" +
    "            <div class=\"col-md-6 facet-date-right\">\n" +
    "              <span class=\"input-group\">\n" +
    "                <span class=\"input-group-btn\">\n" +
    "                  <button type=\"button\" class=\"btn btn-default\"\n" +
    "                    ng-click=\"endDate.opened = !endDate.opened\">\n" +
    "                    <i class=\"glyphicon glyphicon-calendar\"></i>\n" +
    "                  </button>\n" +
    "                </span>\n" +
    "                <input type=\"text\" class=\"form-control\"\n" +
    "                uib-datepicker-popup=\"\"\n" +
    "                ng-disabled=\"vm.isDisabled()\"\n" +
    "                ng-readonly=\"true\"\n" +
    "                ng-change=\"vm.changed(id)\"\n" +
    "                ng-model=\"vm.selectedFacets[id].value.end\"\n" +
    "                is-open=\"endDate.opened\"\n" +
    "                min-date=\"vm.selectedFacets[id].value.start || facet.min\"\n" +
    "                max-date=\"facet.max\"\n" +
    "                init-date=\"vm.selectedFacets[id].value.start || facet.min\"\n" +
    "                show-button-bar=\"false\"\n" +
    "                starting-day=\"1\"\n" +
    "                ng-required=\"true\"\n" +
    "                close-text=\"Close\" />\n" +
    "              </span>\n" +
    "            </div>\n" +
    "          </div>\n" +
    "        </div>\n" +
    "      </div>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "  <div class=\"facet\" ng-repeat=\"(id, facet) in vm.disabledFacets\">\n" +
    "    <div class=\"well well-sm\">\n" +
    "      <div class=\"row\">\n" +
    "        <div class=\"col-xs-12\">\n" +
    "          <div class=\"row vertical-align\">\n" +
    "            <div class=\"col-xs-10 text-left\">\n" +
    "              <h5 class=\"facet-name\">{{ facet.name }}</h5>\n" +
    "            </div>\n" +
    "            <div class=\"facet-enable-btn-container col-xs-2 text-right\">\n" +
    "              <button\n" +
    "                ng-disabled=\"vm.isDisabled()\"\n" +
    "                ng-click=\"vm.enableFacet(id)\"\n" +
    "                class=\"facet-enable-btn btn btn-default btn-xs pull-right glyphicon glyphicon-plus\">\n" +
    "              </button>\n" +
    "            </div>\n" +
    "          </div>\n" +
    "        </div>\n" +
    "      </div>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "</div>\n"
  );

}]);

(function() {
    'use strict';

    angular.module('seco.facetedSearch')

    /*
    * Facet selector directive.
    */
    .directive('facetSelector', facetSelector);

    function facetSelector() {
        return {
            restrict: 'E',
            scope: {
                facets: '=',
                options: '=',
                disable: '='
            },
            controller: FacetListController,
            controllerAs: 'vm',
            templateUrl: 'src/facets/facets.directive.html'
        };
    }

    /*
    * Controller for the facet selector directive.
    */
    /* ngInject */
    function FacetListController($scope, $log, $q, _, Facets) {
        var vm = this;

        vm.facets = $scope.facets;

        vm.facetHandler = new Facets(vm.facets, $scope.options);
        vm.selectedFacets = vm.facetHandler.selectedFacets;
        vm.disabledFacets = vm.facetHandler.disabledFacets;
        vm.enabledFacets = vm.facetHandler.enabledFacets;

        vm.isDisabled = isDisabled;
        vm.changed = facetChanged;
        vm.clearTextFacet = clearTextFacet;
        vm.disableFacet = disableFacet;
        vm.enableFacet = enableFacet;

        vm.getFacetSize = getFacetSize;

        update();

        function isDisabled() {
            return vm.isLoadingFacets || $scope.disable();
        }

        function clearTextFacet(id) {
            if (vm.selectedFacets[id]) {
                vm.selectedFacets[id].value = undefined;
                return facetChanged(id);
            }
            return $q.when();
        }

        function facetChanged(id) {
            vm.isLoadingFacets = true;
            var promise = vm.facetHandler.facetChanged(id);
            return promise.then(handleUpdateSuccess, handleError);
        }

        function update() {
            vm.isLoadingFacets = true;
            return vm.facetHandler.update().then(handleUpdateSuccess, handleError);
        }

        function enableFacet(id) {
            vm.isLoadingFacets = true;
            return vm.facetHandler.enableFacet(id).then(handleUpdateSuccess, handleError);
        }

        function disableFacet(id) {
            vm.isLoadingFacets = true;
            return vm.facetHandler.disableFacet(id).then(handleUpdateSuccess, handleError);
        }

        function handleUpdateSuccess() {
            vm.isLoadingFacets = false;
        }

        function handleError(error) {
            vm.isLoadingFacets = false;
            $log.log(error);
            vm.error = error;
        }

        function getFacetSize( facetStates ) {
            if (facetStates) {
                return Math.min(facetStates.length + 2, 10).toString();
            }
            return '10';
        }
    }
})();
