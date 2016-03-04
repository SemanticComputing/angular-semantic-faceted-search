(function() {
    'use strict';

    angular.module('facetUrlState', [])
    .constant('_', _); // eslint-disable-line no-undef
})();

(function() {

    'use strict';

    /* eslint-disable angular/no-service-method */
    angular.module('facetUrlState')

    /*
    * Service for updating the URL parameters based on facet selections.
    */
    .service( 'urlStateHandlerService', urlStateHandlerService );

    /* @ngInject */
    function urlStateHandlerService($location, _) {

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

    angular.module('resultHandler', ['sparql'])

    /*
    * Result handler service.
    */
    .factory('Results', Results);

    /* @ngInject */
    function Results( RESULTS_PER_PAGE, PAGES_PER_QUERY, AdvancedSparqlService,
                FacetSelectionFormatter, objectMapperService ) {
        return function( endpointUrl, facets, mapper ) {
            mapper = mapper || objectMapperService;

            var formatter = new FacetSelectionFormatter(facets);
            var endpoint = new AdvancedSparqlService(endpointUrl, mapper);

            this.getResults = getResults;

            function getResults(facetSelections, query, resultSetQry) {
                query = query.replace('<FACET_SELECTIONS>',
                        formatter.parseFacetSelections(facetSelections));
                return endpoint.getObjects(query,
                    RESULTS_PER_PAGE,
                    resultSetQry.replace('<FACET_SELECTIONS>', formatter.parseFacetSelections(facetSelections)),
                    PAGES_PER_QUERY);
            }
        };
    }
})();

/*
 * facets module definition
 */
(function() {
    'use strict';

    angular.module('facets', ['sparql', 'ui.bootstrap'])
    .constant('_', _) // eslint-disable-line no-undef
    .constant('NO_SELECTION_STRING', '-- No Selection --');
})();


(function() {
    'use strict';

    /*
    * Service for transforming SPARQL result triples into facet objects.
    *
    * Author Erkki Heino.
    */
    angular.module('facets')

    .factory('facetMapperService', facetMapperService);

    /* ngInject */
    function facetMapperService(objectMapperService) {
        FacetMapper.prototype.makeObject = makeObject;
        FacetMapper.prototype.mergeObjects = mergeObjects;

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
    angular.module('facets')
    .factory('FacetSelectionFormatter', function (_) {
        return function( facets ) {

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

            function parseFacetSelections( facetSelections ) {
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
                _.forEach( selections, function( facet ) {
                    if (facet.val && facet.val.length) {
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
                            result = result + parseTimeSpanFacet(facet.val, facet.id);
                            break;
                        case 'text':
                            result = result + parseTextFacet(facet.val, facet.id, i++);
                            break;
                        default:
                            result = result + parseBasicFacet(facet.val, facet.id);
                    }
                });
                return result;
            }

            function parseBasicFacet(val, key) {
                var result = '';
                if (val.forEach) {
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
                var words = val.value.replace(/[,.-_*'\\/]/g, '');

                words.split(' ').forEach(function(word) {
                    result = result + ' FILTER(REGEX(' + textVar + ', "' + word + '", "i")) ';
                });

                return result;
            }

            function parseTimeSpanFacet(val, key) {
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
        };
    });
})();

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

        return FacetHandler;

        function FacetHandler( facets, config ) {
            var self = this;

            var freeFacetTypes = ['text', 'timespan'];

            var initialId;
            var defaultCountKey = getDefaultCountKey(facets);
            var initialValues = parseInitialValues(config.initialValues);
            var previousSelections = initPreviousSelections(initialValues);

            var formatter = new FacetSelectionFormatter(facets);
            var endpoint = new SparqlService(config.endpointUrl);

            /* Public API */

            self.facetChanged = facetChanged;
            self.update = update;

            self.selectedFacets = _.cloneDeep(previousSelections);


            /* Implementation */

            var queryTemplate = '' +
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

            var countUnionTemplate = '' +
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
            countUnionTemplate = buildQueryTemplate(countUnionTemplate);

            /* Public API functions */

            // Update the facets and call the updateResults callback.
            // id is the id of the facet that triggered the update.
            function update(id) {
                config.updateResults(self.selectedFacets);
                return getStates(self.selectedFacets, id).then(function(states) {
                    _.forOwn(facets, function(facet, key) {
                        facet.state = _.find(states, ['id', key]);
                    });
                });
            }

            // Handle a facet state change.
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

            /* Result parsing */

            function getStates(facetSelections, id) {
                id = id ? id : initialId;
                var query = buildQuery(facetSelections);

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

                // Due to optimization, no redundant "no selection" values are queried.
                // Because of this, they need to be set for each facet for which
                // the value was not queried.

                // count is the current result count.
                var count;

                if (isFreeFacet) {
                    count = getFreeFacetCount(facetSelections, results, selectionId);
                } else if (!selectionId) {
                    // No facets selected, get the count from the results.
                    count = getNoSelectionCountFromResults(results, facetSelections);
                } else {
                    // Get the count from the current selection.
                    count = facetSelections[selectionId][0].count;
                }

                results = setNotSelectionValues(results, count);

                return results;
            }

            function getNoSelectionCountFromResults(results, facetSelections) {
                var countKeySelection = (facetSelections[defaultCountKey] || [])[0].value;
                var val = countKeySelection ? countKeySelection : undefined;


                var count = (_.find((_.find(results, ['id', defaultCountKey]) || {}).values,
                            ['value', val]) || {}).count || 0;
                return count;
            }

            // Set the 'no selection' values for those facets that do not have it.
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
                return results;
            }

            /* Initialization */

            function initPreviousSelections(initialValues) {
                var selections = {};
                _.forOwn(facets, function(val, id) {
                    var initialVal = initialValues[id];
                    if (!val.type) {
                        selections[id] = [{ value: initialVal }];
                    } else {
                        selections[id] = { value: initialVal };
                        if (_.includes(freeFacetTypes, facets[id].type) && initialVal) {
                            initialId = id;
                        }
                    }
                });
                return selections;
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

            function getDefaultCountKey(facets) {
                return _.findKey(facets, function(facet) {
                    return !facet.type;
                });
            }

            /* Query builders */

            function buildQuery(facetSelections) {
                var query = queryTemplate;
                var textFacets = '';
                _.forOwn(facetSelections, function(facet, fId) {
                    if (facets[fId].type === 'text' && facet.value) {
                        textFacets = textFacets + ' ' + fId;
                    }
                });
                query = query.replace('<TEXT_FACETS>', textFacets);
                query = query.replace('<SELECTIONS>',
                        formatter.parseFacetSelections(facetSelections))
                        .replace('<DESELECTIONS>', buildCountUnions(facetSelections));
                return query;
            }

            function buildServiceUnions(query) {
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

            // Build unions for deselection counts and time-span selection counts.
            function buildCountUnions(facetSelections) {
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

                if (!defaultSelected) {
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
                            formatter.parseFacetSelections(others)));
                    if (select) {
                        var cq = countUnionTemplate.replace('<VALUE>', '"whatever"');
                        cq = cq.replace('<SELECTION>', selection.id);
                        timeSpanSelections.push(cq.replace('<SELECTIONS>',
                                formatter.parseFacetSelections(others) +
                                formatter.parseFacetSelections(select)));
                    }
                });
                return deselections.join(' ') + ' ' + timeSpanSelections.join(' ');
            }

            /* Utilities */

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

            function getTemplateFacets() {
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

(function() {
    'use strict';

    angular.module('facets')
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

            return _.filter(values, function(val) {
                return _.includes(val.text.toLowerCase(), text.toLowerCase()) || _.includes(selectedValues, val.value);
            });
        };
    });
})();

angular.module('facets').run(['$templateCache', function($templateCache) {
  'use strict';

  $templateCache.put('src/facets/facets.directive.html',
    "<div class=\"facet\" ng-repeat=\"(id, facet) in vm.facets\">\n" +
    "  <div class=\"facet-name\">\n" +
    "    {{ facet.name }}\n" +
    "    <img src=\"images/loading-sm.gif\" ng-if=\"vm.isLoadingFacets\"></img>\n" +
    "  </div>\n" +
    "  <div ng-if=\"::!facet.type\">\n" +
    "    <input type=\"text\" class=\"form-control\" ng-model=\"textFilter\" />\n" +
    "    <select\n" +
    "      ng-change=\"vm.changed(id)\"\n" +
    "      multiple=\"true\"\n" +
    "      ng-disabled=\"vm.isDisabled()\"\n" +
    "      size=\"{{ vm.getFacetSize(facet.state.values) }}\"\n" +
    "      id=\"{{ ::facet.name + '_select' }}\"\n" +
    "      class=\"selector form-control\"\n" +
    "      ng-options=\"value as (value.text + ' (' + value.count + ')') for value in facet.state.values | textWithSelection:textFilter:vm.selectedFacets[id] track by value.value\"\n" +
    "      ng-model=\"vm.selectedFacets[id]\">\n" +
    "    </select>\n" +
    "  </div>\n" +
    "  <div ng-if=\"::facet.type === 'text'\">\n" +
    "    <p class=\"input-group\">\n" +
    "      <input type=\"text\" class=\"form-control\"\n" +
    "        ng-change=\"vm.changed(id)\"\n" +
    "        ng-disabled=\"vm.isDisabled()\"\n" +
    "        ng-model=\"vm.selectedFacets[id].value\"\n" +
    "        ng-model-options=\"{ debounce: 1000 }\">\n" +
    "      </input>\n" +
    "      <span class=\"input-group-btn\">\n" +
    "        <button type=\"button\" class=\"btn btn-default\"\n" +
    "            ng-disabled=\"vm.isDisabled()\"\n" +
    "            ng-click=\"vm.clearTextFacet(id)\">\n" +
    "          <i class=\"glyphicon glyphicon-remove\"></i>\n" +
    "        </button>\n" +
    "      </span>\n" +
    "    </p>\n" +
    "  </div>\n" +
    "  <div ng-if=\"::facet.type === 'timespan'\">\n" +
    "    <p class=\"input-group\">\n" +
    "      <input type=\"text\" class=\"form-control\"\n" +
    "        uib-datepicker-popup=\"\"\n" +
    "        ng-disabled=\"vm.isDisabled()\"\n" +
    "        ng-change=\"vm.changed(id)\"\n" +
    "        ng-readonly=\"true\"\n" +
    "        ng-model=\"vm.selectedFacets[id].value.start\"\n" +
    "        is-open=\"startDate.opened\"\n" +
    "        min-date=\"facet.min\"\n" +
    "        max-date=\"facet.max\"\n" +
    "        init-date=\"facet.min\"\n" +
    "        starting-day=\"1\"\n" +
    "        ng-required=\"true\"\n" +
    "        close-text=\"Close\" />\n" +
    "      <span class=\"input-group-btn\">\n" +
    "        <button type=\"button\" class=\"btn btn-default\"\n" +
    "            ng-click=\"startDate.opened = !startDate.opened\">\n" +
    "          <i class=\"glyphicon glyphicon-calendar\"></i>\n" +
    "        </button>\n" +
    "      </span>\n" +
    "      <input type=\"text\" class=\"form-control\"\n" +
    "        uib-datepicker-popup=\"\"\n" +
    "        ng-disabled=\"vm.isDisabled()\"\n" +
    "        ng-readonly=\"true\"\n" +
    "        ng-change=\"vm.changed(id)\"\n" +
    "        ng-model=\"vm.selectedFacets[id].value.end\"\n" +
    "        is-open=\"endDate.opened\"\n" +
    "        min-date=\"vm.selectedFacets[id].value.start || facet.min\"\n" +
    "        max-date=\"facet.max\"\n" +
    "        init-date=\"vm.selectedFacets[id].value.start || facet.min\"\n" +
    "        starting-day=\"1\"\n" +
    "        ng-required=\"true\"\n" +
    "        close-text=\"Close\" />\n" +
    "      <span class=\"input-group-btn\">\n" +
    "        <button type=\"button\" class=\"btn btn-default\"\n" +
    "            ng-click=\"endDate.opened = !endDate.opened\">\n" +
    "          <i class=\"glyphicon glyphicon-calendar\"></i>\n" +
    "        </button>\n" +
    "      </span>\n" +
    "    </p>\n" +
    "  </div>\n" +
    "</div>\n"
  );

}]);

(function() {
    'use strict';

    angular.module('facets')

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
    function FacetListController( $scope, $log, _, Facets ) {
        var vm = this;

        vm.facets = $scope.facets;

        vm.facetHandler = new Facets(vm.facets, $scope.options);
        vm.selectedFacets = vm.facetHandler.selectedFacets;

        vm.isDisabled = isDisabled;
        vm.changed = facetChanged;
        vm.clearTextFacet = clearTextFacet;

        vm.getFacetSize = getFacetSize;

        update();

        function isDisabled() {
            return vm.isLoadingFacets || $scope.disable();
        }

        function clearTextFacet(id) {
            vm.selectedFacets[id].value = undefined;
            return facetChanged(id);
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
