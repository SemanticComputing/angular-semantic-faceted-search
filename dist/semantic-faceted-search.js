/*
 * facets module definition
 */
(function() {
    'use strict';

    angular.module('seco.facetedSearch', ['sparql', 'ui.bootstrap', 'angularSpinner'])
    .constant('_', _) // eslint-disable-line no-undef
    .constant('EVENT_REQUEST_CONSTRAINTS', 'sf-request-constraints')
    .constant('EVENT_INITIAL_CONSTRAINTS', 'sf-initial-constraints')
    .constant('EVENT_FACET_CHANGED', 'sf-facet-changed')
    .constant('EVENT_FACET_CONSTRAINTS', 'sf-facet-constraints')
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
    function FacetResultHandler(_, DEFAULT_PAGES_PER_QUERY, DEFAULT_RESULTS_PER_PAGE,
            AdvancedSparqlService, facetSelectionFormatter, objectMapperService,
            QueryBuilderService) {

        return ResultHandler;

        function ResultHandler(endpointUrl, facets, facetOptions, resultOptions) {
            // Default options
            var options = {
                resultsPerPage: DEFAULT_RESULTS_PER_PAGE,
                pagesPerQuery: DEFAULT_PAGES_PER_QUERY,
                mapper: objectMapperService,
                prefixes: 'PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> ' +
                          'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> ',
                paging: true
            };
            options = angular.extend(options, resultOptions);

            /* Public API */

            this.getResults = getResults;

            /* Implementation */

            var qryBuilder = new QueryBuilderService(options.prefixes);

            var endpoint = new AdvancedSparqlService(endpointUrl, options.mapper);

            var resultSetTemplate =
            ' <FACET_SELECTIONS> ' +
            ' BIND(?s AS ?id) ';

            // Get results based on the facet selections and the query template.
            // Use paging if defined in the options.
            function getResults(facetSelections, orderBy) {
                var constraints = facetSelections.constraint.join(' ');
                var resultSet = resultSetTemplate.replace(/<FACET_SELECTIONS>/g,
                        constraints);
                var qry = qryBuilder.buildQuery(options.queryTemplate, resultSet, orderBy);

                if (options.paging) {
                    return endpoint.getObjects(qry.query, options.resultsPerPage, qry.resultSetQuery,
                            options.pagesPerQuery);
                } else {
                    return endpoint.getObjects(qry);
                }
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
            if (_.includes(value.type, 'literal') && value.datatype === 'http://www.w3.org/2001/XMLSchema#integer') {
                return value.value;
            }
            if (_.includes(value.type, 'literal') && value.datatype === 'http://www.w3.org/2001/XMLSchema#date') {
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
            // Put hierarchy facets first and text facets last, and
            // sort the selections by count for optimization
            var otherFacets = [];
            var hierarchyFacets = [];
            var textFacets = [];
            var sorted = _(facetSelections).map(function(o, k) {
                return { id: k, val: o };
            }).sortBy(facetSelections, 'val.count').value();

            _.forEach(sorted, function(facet) {
                if (facets[facet.id].type === 'text') {
                    textFacets.push(facet);
                } else if (facets[facet.id].type === 'hierarchy') {
                    hierarchyFacets.push(facet);
                } else {
                    otherFacets.push(facet);
                }
            });

            var selections = hierarchyFacets.concat(otherFacets).concat(textFacets);

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
                    result = result + ' ?s ' + key + hVar + ' . ';
                    hVar = hVar + '_' + i++;
                });
                return result;
            }
            result = hVar + ' ' + hierarchyProp + ' ' + val.value + ' . ';
            return result = result + ' ?s ' + key + hVar + ' . ';
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

        function parseTextFacet(val, key, i, useJenaText) {
            var result = useJenaText ? ' ?s text:query "' + val.value + '*" . ' : '';
            var textVar = '?text' + i;
            result = result + ' ?s ' + key + ' ' + textVar + ' . ';
            var words = val.value.replace(/[?,._*'\\/-]/g, '');

            words.split(' ').forEach(function(word) {
                result = result + ' FILTER(CONTAINS(LCASE(' + textVar + '), "' +
                        word.toLowerCase() + '")) ';
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
                start.setHours(12, 0, 0);
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
                end.setHours(12, 0, 0);
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

        /* Exposed for testing purposes only */

        this.parseBasicFacet = parseBasicFacet;
        this.parseTimeSpanFacet = parseTimeSpanFacet;
        this.parseTextFacet = parseTextFacet;
        this.parseBasicFacet = parseBasicFacet;
        this.parseHierarchyFacet = parseHierarchyFacet;
    }
})();

/*
* Facet handler service.
*/
(function() {
    'use strict';

    angular.module('seco.facetedSearch')

    .factory('Facets', Facets);

    /* ngInject */
    function Facets($log, $rootScope, $location, $q, _, EVENT_FACET_CONSTRAINTS,
                EVENT_FACET_CHANGED, EVENT_REQUEST_CONSTRAINTS, EVENT_INITIAL_CONSTRAINTS) {

        return FacetHandler;

        function FacetHandler(config) {
            var self = this;

            /* Public API */

            self.update = update;

            /* Implementation */

            init();

            function init() {
                self.state = { facets: {} };

                var defaultConfig = {
                    preferredLang: 'en'
                };

                self.config = angular.extend({}, defaultConfig, config);

                self.changeListener = $rootScope.$on(EVENT_FACET_CHANGED, update);
                self.initListener = $rootScope.$on(EVENT_REQUEST_CONSTRAINTS, broadCastInitial);

                self.state.facets = getFacetValuesFromUrlParams();
                if (self.config.constraint) {
                    self.state.default = getInitialConstraints(self.config);
                }
                $log.log('Initial state', self.state);
            }


            // Update state, and broadcast them to listening facets.
            function update(event, constraint) {
                self.state.facets[constraint.id] = constraint;
                broadCastConstraints(EVENT_FACET_CONSTRAINTS);
            }

            function broadCastInitial() {
                $log.debug('Broadcast initial');
                broadCastConstraints(EVENT_INITIAL_CONSTRAINTS);
            }

            function broadCastConstraints(event) {
                updateUrlParams();
                var constraint = getConstraint();
                constraint.push(self.state.default);
                var data = { facets: self.state.facets, constraint: constraint };
                $log.log('Broadcast', data);
                $rootScope.$broadcast(event, data);
            }

            /* Private functions */

            function getConstraint() {
                return _(self.state.facets).values().map('constraint').compact().value();
            }

            function updateUrlParams() {
                var params = {};
                _(self.state.facets).forOwn(function(val, id) {
                    if (val && val.value) {
                        params[id] = angular.toJson({ value: val.value, constraint: val.constraint });
                    }
                });
                $location.search(params);
            }

            /* Initialization */

            function getFacetValuesFromUrlParams() {
                $log.log('URL params', $location.search());
                var params = $location.search() || {};
                var res = {};
                _.forOwn(params, function(val, id) {
                    res[id] = angular.fromJson(val);
                });
                return res;
            }

            // Combine the possible RDF class and constraint definitions in the config.
            function getInitialConstraints(config) {
                var state = config.rdfClass ? ' ?s a ' + config.rdfClass + ' . ' : '';
                state = state + (config.constraint || '');
                return state;
            }
        }
    }
})();

(function() {
    'use strict';

    angular.module('seco.facetedSearch')
    .filter('textWithSelection', function(_) {
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

(function() {
    'use strict';

    angular.module('seco.facetedSearch')
    .controller('BasicFacetController', BasicFacetController);

    /* ngInject */
    function BasicFacetController($scope, $log, $q, _, BasicFacet, EVENT_FACET_CONSTRAINTS,
            EVENT_FACET_CHANGED, EVENT_REQUEST_CONSTRAINTS, EVENT_INITIAL_CONSTRAINTS) {
        var vm = this;

        vm.isDisabled = isDisabled;
        vm.changed = changed;

        vm.disableFacet = disableFacet;
        vm.enableFacet = enableFacet;

        vm.getFacetSize = getFacetSize;

        vm.facet;

        vm.listener = function() { };

        init();

        function init() {
            var initListener = $scope.$on(EVENT_INITIAL_CONSTRAINTS, function(event, cons) {
                $log.debug($scope.options.name, 'Init');
                var initial = _.cloneDeep($scope.options);
                initial.initialConstraints = cons;
                vm.facet = new BasicFacet(initial);
                if (vm.facet.isEnabled()) {
                    listen();
                    changed();
                }
                // Unregister initListener
                initListener();
            });
            $scope.$emit(EVENT_REQUEST_CONSTRAINTS);
        }

        function listen() {
            vm.listener = $scope.$on(EVENT_FACET_CONSTRAINTS, function(event, cons) {
                $log.debug(vm.facet.name, 'Receive constraints', cons);
                update(cons);
            });
        }

        function update(constraints) {
            vm.isLoadingFacet = true;
            return vm.facet.update(constraints).then(handleUpdateSuccess, handleError);
        }

        function isDisabled() {
            return vm.isLoadingFacet || vm.facet.isLoading();
        }

        function emitChange() {
            var args = {
                id: vm.facet.facetUri,
                constraint: vm.facet.getConstraint(),
                value: vm.facet.getSelectedValue()
            };
            $log.debug(vm.facet.name, 'Emit', args);
            $scope.$emit(EVENT_FACET_CHANGED, args);
        }

        function changed() {
            $log.debug(vm.facet.name, 'Changed');
            vm.isLoadingFacet = true;
            emitChange();
        }

        function enableFacet() {
            listen();
            vm.isLoadingFacet = true;
            vm.facet.enable();
            emitChange();
        }

        function disableFacet() {
            vm.listener();
            vm.facet.disable();
            emitChange();
        }

        function handleUpdateSuccess() {
            $log.debug(vm.facet.name, 'Success');
            vm.isLoadingFacet = false;
        }

        function handleError(error) {
            vm.isLoadingFacet = false;
            $log.error(vm.facet.facetUri, error);
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

(function() {
    'use strict';

    angular.module('seco.facetedSearch')

    .directive('secoBasicFacet', basicFacet);

    function basicFacet() {
        return {
            restrict: 'E',
            scope: {
                options: '='
            },
            controller: 'BasicFacetController',
            controllerAs: 'vm',
            templateUrl: 'src/facets/basic/facets.basic-facet.directive.html'
        };
    }
})();

angular.module('seco.facetedSearch').run(['$templateCache', function($templateCache) {
  'use strict';

  $templateCache.put('src/facets/basic/facets.basic-facet.directive.html',
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
    "<div class=\"facet-wrapper\">\n" +
    "  <span us-spinner=\"{radius:30, width:8, length: 40}\" ng-if=\"vm.isLoadingFacet\"></span>\n" +
    "  <div class=\"facet\" ng-if=vm.facet.isEnabled()>\n" +
    "    <div class=\"well well-sm\">\n" +
    "      <div class=\"row\">\n" +
    "        <div class=\"col-xs-12 text-left\">\n" +
    "          <h5 class=\"facet-name pull-left\">{{ vm.facet.name }}</h5>\n" +
    "          <button\n" +
    "            ng-disabled=\"vm.isDisabled()\"\n" +
    "            ng-click=\"vm.disableFacet(id)\"\n" +
    "            class=\"btn btn-danger btn-xs pull-right glyphicon glyphicon-remove\">\n" +
    "          </button>\n" +
    "        </div>\n" +
    "      </div>\n" +
    "      <div class=\"facet-input-container\">\n" +
    "        <div>\n" +
    "          <input\n" +
    "            ng-disabled=\"vm.isDisabled()\"\n" +
    "            type=\"text\"\n" +
    "            class=\"form-control\"\n" +
    "            ng-model=\"textFilter\" />\n" +
    "          <select\n" +
    "            ng-change=\"vm.changed(id)\"\n" +
    "            ng-disabled=\"vm.isDisabled()\"\n" +
    "            ng-attr-size=\"{{ vm.getFacetSize(vm.facet.state.values) }}\"\n" +
    "            id=\"{{ ::vm.facet.name + '_select' }}\"\n" +
    "            class=\"selector form-control\"\n" +
    "            ng-options=\"value as (value.text + ' (' + value.count + ')') for value in vm.facet.state.values | textWithSelection:textFilter:vm.facet.selectedValue track by value.value\"\n" +
    "            ng-model=\"vm.facet.selectedValue\">\n" +
    "          </select>\n" +
    "        </div>\n" +
    "      </div>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "  <div class=\"facet\" ng-if=!vm.facet.isEnabled()>\n" +
    "    <div class=\"well well-sm\">\n" +
    "      <div class=\"row\">\n" +
    "        <div class=\"col-xs-12\">\n" +
    "          <div class=\"row vertical-align\">\n" +
    "            <div class=\"col-xs-10 text-left\">\n" +
    "              <h5 class=\"facet-name\">{{ vm.facet.name }}</h5>\n" +
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
