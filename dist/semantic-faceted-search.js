/*
 * facets module definition
 */
(function() {
    'use strict';

    /**
     * @ngdoc overview
     * @name index
     * @description
     # SPARQL Faceter -- Faceted Search Based on SPARQL
     *
     * The module provides a set of directives that work as facets,
     * and a service that synchronizes them.
     *
     * There are four different built-in facet types:
     *
     * - {@link seco.facetedSearch.BasicFacet} - A basic select box facet with text filtering
     * - {@link seco.facetedSearch.HierarchyFacet} - A basic facet with hierarchy support.
     * - {@link seco.facetedSearch.TextFacet} - A free-text facet.
     * - {@link seco.facetedSearch.TimespanFacet} - Date range facet.
     *
     * Custom facets can be implemented reasonably easily.
     *
     ## How it works
     * Facets are implemented as a directives.
     * Each facet listens on its scope for changes in other facets,
     * and emits its state when its value changes.
     * The facets are responsible for maintaining their own state.
     *
     * {@link seco.facetedSearch.FacetHandler} mediates the facet changes
     * by listening to the facets' change events, and broadcasting the resulting
     * constraints to all facets in the scope.
     *
     * The facets are configured using the `options` attribute of the directive.
     * Configuration options that are common to all facets are:
     *
     * - **facetId** - `{string}` - A friendly id for the facet. Should be unique in the set of facets,
     *                              and should be usable as a SPARQL variable.
     * - **predicate** - `{string}` - The predicate or property path that defines the facet values.
     * - **name** - `{string}` - The title of the facet. Will be displayed to end users.
     * - **enabled** `{boolean}` - Whether or not the facet is enabled by default.
     *
     * For other options, see the facets' individual documentation.
     *
     * @example
     * <pre>
     * // Define facets
     * vm.facets = {
     *     // Text facet
     *     name: {
     *         name: 'Name',
     *         facetId: 'name',
     *         predicate: '<http://www.w3.org/2004/02/skos/core#prefLabel>',
     *         enabled: true
     *     },
     *     // Date facet
     *     deathDate: {
     *         name: 'Time of Death',
     *         facetId: 'death',
     *         startPredicate: '<http://ldf.fi/schema/narc-menehtyneet1939-45/kuolinaika>',
     *         endPredicate: '<http://ldf.fi/schema/narc-menehtyneet1939-45/kuolinaika>',
     *         min: '1939-10-01',
     *         max: '1989-12-31',
     *         enabled: true
     *     },
     *     // Basic facet
     *     profession: {
     *         name: 'Ammatti',
     *         facetId: 'occupation',
     *         predicate: '<http://ldf.fi/schema/narc-menehtyneet1939-45/ammatti>',
     *         enabled: true
     *     },
     *     // Basic facet with property path
     *     source: {
     *         name: 'Source',
     *         facetId: 'source',
     *         predicate: '^<http://www.cidoc-crm.org/cidoc-crm/P70i_is_documented_in>/<http://purl.org/dc/elements/1.1/source>',
     *         enabled: true
     *     },
     *     // Basic facet with labels in another service.
     *     birthMunicipality: {
     *         name: 'Birth Municipality',
     *         services: ['<http://ldf.fi/pnr/sparql>'],
     *         facetId: 'birthplace',
     *         predicate: '<http://ldf.fi/schema/narc-menehtyneet1939-45/synnyinkunta>',
     *         enabled: false
     *     },
     *     // Hierarchical facet
     *     rank: {
     *         name: 'Rank',
     *         facetId: 'rank',
     *         predicate: '<http://ldf.fi/schema/narc-menehtyneet1939-45/sotilasarvo>',
     *         hierarchy: '<http://purl.org/dc/terms/isPartOf>*|(<http://rdf.muninn-project.org/ontologies/organization#equalTo>/<http://purl.org/dc/terms/isPartOf>*)',
     *         enabled: true,
     *         classes: [
     *             '<http://ldf.fi/warsa/actors/ranks/Upseeri>',
     *             '<http://ldf.fi/warsa/actors/ranks/Aliupseeri>',
     *             '<http://ldf.fi/warsa/actors/ranks/Miehistoe>',
     *             '<http://ldf.fi/warsa/actors/ranks/Jaeaekaeriarvo>',
     *             '<http://ldf.fi/warsa/actors/ranks/Virkahenkiloestoe>',
     *             '<http://ldf.fi/warsa/actors/ranks/Lottahenkiloestoe>',
     *             '<http://ldf.fi/warsa/actors/ranks/Muu>'
     *         ]
     *     }
     * };
     *
     * // Define common options
     * vm.options = {
     *     endpointUrl: 'http://ldf.fi/warsa/sparql',
     *     rdfClass: '<http://ldf.fi/schema/narc-menehtyneet1939-45/DeathRecord>',
     *     constraint: '?id skos:prefLabel ?name .',
     *     preferredLang : 'fi'
     * };
     *
     * // Define a function that handles updates.
     * // 'dataService' is some service that fetches results based on the facet selections.
     * function updateResults(event, facetState) {
     *     dataService.getResults(facetState.constraints).then(function(results) {
     *         vm.results = results;
     *     }
     * }
     *
     * // Listen for the update event
     * $scope.$on('sf-facet-constraints', updateResults);
     *
     * // Listen for initial state
     * var initListener = $scope.$on('sf-initial-constraints', function(event, state) {
     *     updateResults(event, state);
     *     // Only listen once for the init event
     *     initListener();
     * });
     *
     * // Initialize the facet handler:
     * vm.handler = new FacetHandler(vm.options);
     * </pre>
     *
     * Setup the facets in the template:
     *
     * <pre>
     * <seco-text-facet
     *   data-options="vm.facets.name">
     * </seco-text-facet>
     * <seco-timespan-facet
     *   data-options="vm.facets.deathDate">
     * </seco-timespan-facet>
     * <seco-basic-facet
     *   data-options="vm.facets.source">
     * </seco-basic-facet>
     * <seco-basic-facet
     *   data-options="vm.facets.profession">
     * </seco-basic-facet>
     * <seco-basic-facet
     *   data-options="vm.facets.birthMunicipality">
     * </seco-basic-facet>
     * <seco-basic-facet
     *   data-options="vm.facets.principalAbode">
     * </seco-basic-facet>
     * <seco-hierarchy-facet
     *   data-options="vm.facets.rank">
     * </seco-hierarchy-facet>
     * </pre>
     */
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

        function updateUrlParams(facets) {
            facets = facets.facets || facets;
            var params = {};
            _(facets).forOwn(function(val, id) {
                if (val && val.value) {
                    params[id] = { value: val.value, constraint: val.constraint };
                }
            });
            if (_.isEmpty(params)) {
                params = null;
            } else {
                params = angular.toJson(params);
            }
            $location.search('facets', params);
        }

        function getFacetValuesFromUrlParams() {
            var res = {};

            var params = ($location.search() || {}).facets;
            if (!params) {
                return res;
            }
            try {
                params = angular.fromJson(params);
            }
            catch(e) {
                $location.search('facets', null);
                return res;
            }
            _.forOwn(params, function(val, id) {
                res[id] = val;
            });
            return res;
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

            // Get results based on the facet selections and the query template.
            // Use paging if defined in the options.
            function getResults(facetSelections, orderBy) {
                var constraints = facetSelections.constraint.join(' ');
                var qry = qryBuilder.buildQuery(options.queryTemplate, constraints, orderBy);

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

        var proto = Object.getPrototypeOf(objectMapperService);
        FacetMapper.prototype = angular.extend({}, proto, FacetMapper.prototype);

        return new FacetMapper();

        function FacetMapper() {
            this.objectClass = Object;
        }

        function makeObject(obj) {
            var o = new this.objectClass();

            o.value = parseValue(obj.value);
            o.text = obj.facet_text.value;
            o.count = parseInt(obj.cnt.value);

            return o;
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

    .factory('FacetHandler', FacetHandler);

    /* ngInject */
    function FacetHandler(_, EVENT_FACET_CONSTRAINTS, EVENT_FACET_CHANGED, EVENT_REQUEST_CONSTRAINTS,
            EVENT_INITIAL_CONSTRAINTS) {

        return FacetHandler;

        function FacetHandler(config) {
            var self = this;

            init();

            function init() {
                self.state = { facets: {} };

                var defaultConfig = {
                    preferredLang: 'en'
                };

                self.config = angular.extend({}, defaultConfig, config);

                self.changeListener = self.config.scope.$on(EVENT_FACET_CHANGED, update);
                self.initListener = self.config.scope.$on(EVENT_REQUEST_CONSTRAINTS, broadCastInitial);

                self.removeListeners = removeListeners;

                self.state.facets = self.config.initialState || {};
                if (self.config.constraint) {
                    self.state.default = getInitialConstraints(self.config);
                }
                broadCastInitial();
            }

            // Update state, and broadcast it to listening facets.
            function update(event, constraint) {
                event.stopPropagation();
                self.state.facets[constraint.id] = constraint;
                broadCastConstraints(EVENT_FACET_CONSTRAINTS);
            }

            function broadCastInitial(event) {
                if (event) {
                    event.stopPropagation();
                }
                var data = {
                    config: self.config
                };
                broadCastConstraints(EVENT_INITIAL_CONSTRAINTS, data);
            }

            function broadCastConstraints(eventType, data) {
                data = data || {};

                var constraint = getConstraint();
                constraint.push(self.state.default);

                data.facets = self.state.facets;
                data.constraint = constraint;

                self.config.scope.$broadcast(eventType, data);
            }

            function getConstraint() {
                return _(self.state.facets).values().map('constraint').compact().value();
            }

            // Combine the possible RDF class and constraint definitions in the config.
            function getInitialConstraints(config) {
                var state = config.rdfClass ? ' ?id a ' + config.rdfClass + ' . ' : '';
                state = state + (config.constraint || '');
                return state;
            }

            function removeListeners() {
                self.initListener();
                self.changeListener();
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

(function() {
    'use strict';

    angular.module('seco.facetedSearch')
    .controller('AbstractFacetController', AbstractFacetController);

    /* @ngInject */
    function AbstractFacetController($scope, _, EVENT_FACET_CONSTRAINTS,
            EVENT_FACET_CHANGED, EVENT_REQUEST_CONSTRAINTS, EVENT_INITIAL_CONSTRAINTS,
            FacetImpl) {

        var vm = this;

        vm.isLoading = isLoading;
        vm.changed = changed;

        vm.disableFacet = disableFacet;
        vm.enableFacet = enableFacet;

        vm.getFacetSize = getFacetSize;

        vm.listener = function() { };

        vm.getSpinnerKey = getSpinnerKey;

        init(FacetImpl);

        function init(Facet) {
            var initListener = $scope.$on(EVENT_INITIAL_CONSTRAINTS, function(event, cons) {
                var initial = _.cloneDeep($scope.options);
                initial.initialConstraints = cons;
                initial.endpointUrl = initial.endpointUrl || cons.config.endpointUrl;
                vm.facet = new Facet(initial);
                if (vm.facet.isEnabled()) {
                    vm.previousVal = vm.facet.getSelectedValue();
                    listen();
                    update(cons);
                }
                // Unregister initListener
                initListener();
            });
            $scope.$emit(EVENT_REQUEST_CONSTRAINTS);
        }

        var spinnerKey;
        function getSpinnerKey() {
            if (!spinnerKey) {
                spinnerKey = _.uniqueId('spinner');
            }
            return spinnerKey;
        }

        function listen() {
            vm.listener = $scope.$on(EVENT_FACET_CONSTRAINTS, function(event, cons) {
                update(cons);
            });
        }

        function update(constraints) {
            vm.isLoadingFacet = true;
            return vm.facet.update(constraints).then(handleUpdateSuccess, handleError);
        }

        function isLoading() {
            return vm.isLoadingFacet || !vm.facet || vm.facet.isLoading();
        }

        function emitChange(forced) {
            var val = vm.facet.getSelectedValue();
            if (!forced && _.isEqual(vm.previousVal, val)) {
                vm.isLoadingFacet = false;
                return;
            }
            vm.previousVal = _.clone(val);
            var args = {
                id: vm.facet.facetId,
                constraint: vm.facet.getConstraint(),
                value: val
            };
            $scope.$emit(EVENT_FACET_CHANGED, args);
        }

        function changed() {
            vm.isLoadingFacet = true;
            emitChange();
        }

        function enableFacet() {
            listen();
            vm.isLoadingFacet = true;
            vm.facet.enable();
            emitChange(true);
        }

        function disableFacet() {
            vm.listener();
            vm.facet.disable();
            var forced = vm.facet.getSelectedValue() ? true : false;
            emitChange(forced);
        }

        function handleUpdateSuccess() {
            vm.error = undefined;
            vm.isLoadingFacet = false;
        }

        function handleError(error) {
            vm.isLoadingFacet = false;
            if (error) {
                vm.error = error;
            } else {
                vm.error = 'Error occured';
            }
        }

        function getFacetSize(facetStates) {
            if (facetStates) {
                return Math.min(facetStates.length + 2, 10).toString();
            }
            return '10';
        }
    }
})();


/*
* Facet for selecting a simple value.
*/
(function() {
    'use strict';

    angular.module('seco.facetedSearch')
    .factory('BasicFacet', BasicFacet);

    /* ngInject */
    function BasicFacet($q, _, SparqlService, facetMapperService, NO_SELECTION_STRING) {

        BasicFacetConstructor.prototype.update = update;
        BasicFacetConstructor.prototype.getState = getState;
        BasicFacetConstructor.prototype.fetchState = fetchState;
        BasicFacetConstructor.prototype.getConstraint = getConstraint;
        BasicFacetConstructor.prototype.getTriplePattern = getTriplePattern;
        BasicFacetConstructor.prototype.getPreferredLang = getPreferredLang;
        BasicFacetConstructor.prototype.buildQueryTemplate = buildQueryTemplate;
        BasicFacetConstructor.prototype.buildQuery = buildQuery;
        BasicFacetConstructor.prototype.buildServiceUnions = buildServiceUnions;
        BasicFacetConstructor.prototype.buildSelections = buildSelections;
        BasicFacetConstructor.prototype.getOtherSelections = getOtherSelections;
        BasicFacetConstructor.prototype.getDeselectUnionTemplate = getDeselectUnionTemplate;
        BasicFacetConstructor.prototype.disable = disable;
        BasicFacetConstructor.prototype.enable = enable;
        BasicFacetConstructor.prototype.isLoading = isLoading;
        BasicFacetConstructor.prototype.isEnabled = isEnabled;
        BasicFacetConstructor.prototype.getSelectedValue = getSelectedValue;

        return BasicFacetConstructor;

        function BasicFacetConstructor(options) {

            /* Implementation */

            this.previousConstraints;
            this.state = {};

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

            ' SELECT DISTINCT ?cnt ?facet_text ?value WHERE {' +
            ' { ' +
            '  { ' +
            '   SELECT DISTINCT (count(DISTINCT ?id) as ?cnt) { ' +
            '    <OTHER_SELECTIONS> ' +
            '   } ' +
            '  } ' +
            '  BIND("<NO_SELECTION_STRING>" AS ?facet_text) ' +
            ' } UNION ' +
            '  {' +
            '   SELECT DISTINCT ?cnt ?value ?facet_text { ' +
            '    {' +
            '     SELECT DISTINCT (count(DISTINCT ?id) as ?cnt) ?value {' +
            '      <SELECTIONS> ' +
            '     } GROUP BY ?value ' +
            '    } ' +
            '    FILTER(BOUND(?value)) ' +
            '    <LABEL_PART> ' +
            '    <OTHER_SERVICES> ' +
            '    BIND(COALESCE(?lbl, IF(ISURI(?value), REPLACE(STR(?value),' +
            '     "^.+/(.+?)$", "$1"), STR(?value))) AS ?facet_text)' +
            '   } ORDER BY ?facet_text ' +
            '  }' +
            ' } ';

            var defaultConfig = {
                preferredLang: 'fi',
                queryTemplate: queryTemplate,
                labelPart: labelPart,
                noSelectionString: NO_SELECTION_STRING
            };

            this.config = angular.extend({}, defaultConfig, options);

            this.name = this.config.name;
            this.facetId = this.config.facetId;
            this.predicate = this.config.predicate;
            if (this.config.enabled) {
                this.enable();
            } else {
                this.disable();
            }

            this.endpoint = new SparqlService(this.config.endpointUrl);

            // Initial value
            var constVal = _.get(options, 'initialConstraints.facets.' + this.facetId);

            if (constVal && constVal.value) {
                this._isEnabled = true;
                this.selectedValue = { value: constVal.value };
            }

            this.queryTemplate = this.buildQueryTemplate(this.config.queryTemplate);
        }

        function update(constraints) {
            var self = this;
            if (!self.isEnabled()) {
                return $q.when();
            }
            if (!self._error && self.previousConstraints && _.isEqual(constraints.constraint,
                    self.previousConstraints)) {
                return $q.when();
            }
            self.previousConstraints = _.clone(constraints.constraint);

            self._isBusy = true;

            return self.fetchState(constraints).then(function(state) {
                if (!_.isEqual(self.previousConstraints, constraints.constraint)) {
                    return $q.reject('Facet state changed');
                }
                self.state = state;
                self._isBusy = false;

                return state;
            });
        }

        function getState() {
            return this.state;
        }

        // Build a query with the facet selection and use it to get the facet state.
        function fetchState(constraints) {
            var self = this;

            var query = self.buildQuery(constraints.constraint);

            return self.endpoint.getObjects(query).then(function(results) {
                self._error = false;
                return facetMapperService.makeObjectListNoGrouping(results);
            }).catch(function(error) {
                self._isBusy = false;
                self._error = true;
                return $q.reject(error);
            });
        }

        function getTriplePattern() {
            return '?id ' + this.predicate + ' ?value . ';
        }

        function getConstraint() {
            if (!this.getSelectedValue()) {
                return;
            }
            if (this.getSelectedValue()) {
                return ' ?id ' + this.predicate + ' ' + this.getSelectedValue() + ' . ';
            }
        }

        function getDeselectUnionTemplate() {
            return this.deselectUnionTemplate;
        }

        function getPreferredLang() {
            return this.config.preferredLang;
        }

        // Build the facet query
        function buildQuery(constraints) {
            constraints = constraints || [];
            var query = this.queryTemplate
                .replace(/<OTHER_SERVICES>/g, this.buildServiceUnions())
                .replace(/<OTHER_SELECTIONS>/g, this.getOtherSelections(constraints))
                .replace(/<SELECTIONS>/g, this.buildSelections(constraints))
                .replace(/<PREF_LANG>/g, this.getPreferredLang());

            return query;
        }

        function buildSelections(constraints) {
            constraints = constraints.join(' ');
            return constraints + ' ' + this.getTriplePattern();
        }

        function getOtherSelections(constraints) {
            var ownConstraint = this.getConstraint();
            var deselections = _.reject(constraints, function(v) { return v === ownConstraint; });
            return deselections.join(' ');
        }

        function buildServiceUnions() {
            var self = this;
            var unions = '';
            _.forEach(self.config.services, function(service) {
                unions = unions +
                ' UNION { ' +
                '  SERVICE ' + service + ' { ' +
                    self.config.labelPart +
                '  } ' +
                ' } ';
            });
            return unions;
        }

        // Replace placeholders in the query template using the configuration.
        function buildQueryTemplate(template) {
            var templateSubs = [
                {
                    placeHolder: /<ID>/g,
                    value: this.facetId
                },
                {
                    placeHolder: /<LABEL_PART>/g,
                    value: this.config.labelPart
                },
                {
                    placeHolder: /<NO_SELECTION_STRING>/g,
                    value: this.config.noSelectionString
                },
                {
                    placeHolder: /\s+/g,
                    value: ' '
                }
            ];

            templateSubs.forEach(function(s) {
                template = template.replace(s.placeHolder, s.value);
            });
            return template;
        }

        function getSelectedValue() {
            var val;
            if (this.selectedValue) {
                val = this.selectedValue.value;
            }
            return val;
        }

        function isEnabled() {
            return this._isEnabled;
        }

        function enable() {
            this._isEnabled = true;
        }

        function disable() {
            this.selectedValue = undefined;
            this._isEnabled = false;
        }

        function isLoading() {
            return this._isBusy;
        }
    }
})();

(function() {
    'use strict';

    angular.module('seco.facetedSearch')
    .controller('BasicFacetController', BasicFacetController);

    /* ngInject */
    function BasicFacetController($scope, $controller, BasicFacet) {
        var args = { $scope: $scope, FacetImpl: BasicFacet };
        return $controller('AbstractFacetController', args);
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


/*
* Facet for selecting a simple value.
*/
(function() {
    'use strict';

    angular.module('seco.facetedSearch')
    .factory('TextFacet', TextFacet);

    /* ngInject */
    function TextFacet(_) {

        TextFacetConstructor.prototype.getConstraint = getConstraint;
        TextFacetConstructor.prototype.getPreferredLang = getPreferredLang;
        TextFacetConstructor.prototype.disable = disable;
        TextFacetConstructor.prototype.enable = enable;
        TextFacetConstructor.prototype.clear = clear;
        TextFacetConstructor.prototype.isEnabled = isEnabled;
        TextFacetConstructor.prototype.getSelectedValue = getSelectedValue;

        return TextFacetConstructor;

        function TextFacetConstructor(options) {

            /* Implementation */

            var defaultConfig = {
                preferredLang: 'fi'
            };

            this.config = angular.extend({}, defaultConfig, options);

            this.name = this.config.name;
            this.facetId = this.config.facetId;
            this.predicate = this.config.predicate;
            if (this.config.enabled) {
                this.enable();
            } else {
                this.disable();
            }

            // Initial value
            var initial = _.get(options, 'initialConstraints.facets.' + this.facetId);
            if (initial && initial.value) {
                this._isEnabled = true;
                this.selectedValue = initial.value;
            }
        }

        function getConstraint() {
            var value = this.getSelectedValue();
            if (!value) {
                return;
            }
            var result = this.useJenaText ? ' ?id text:query "' + value + '*" . ' : '';
            var textVar = '?' + this.facetId;
            result = result + ' ?id ' + this.predicate + ' ' + textVar + ' . ';
            var words = value.replace(/[?,._*'\\/-]/g, ' ');

            words.split(' ').forEach(function(word) {
                result = result + ' FILTER(CONTAINS(LCASE(' + textVar + '), "' +
                        word.toLowerCase() + '")) ';
            });

            return result;
        }

        function getPreferredLang() {
            return this.config.preferredLang;
        }

        function getSelectedValue() {
            return this.selectedValue;
        }

        function clear() {
            this.selectedValue = undefined;
        }

        function isEnabled() {
            return this._isEnabled;
        }

        function enable() {
            this._isEnabled = true;
        }

        function disable() {
            this.selectedValue = undefined;
            this._isEnabled = false;
        }
    }
})();

(function() {
    'use strict';

    angular.module('seco.facetedSearch')
    .controller('TextFacetController', TextFacetController);

    /* ngInject */
    function TextFacetController($scope, _, EVENT_FACET_CHANGED,
            EVENT_REQUEST_CONSTRAINTS, EVENT_INITIAL_CONSTRAINTS, TextFacet) {
        var vm = this;

        vm.changed = changed;
        vm.clear = clear;
        vm.enableFacet = enableFacet;
        vm.disableFacet = disableFacet;
        vm.isFacetEnabled = isFacetEnabled;

        init();

        function init() {
            var initListener = $scope.$on(EVENT_INITIAL_CONSTRAINTS, function(event, cons) {
                var initial = _.cloneDeep($scope.options);
                initial.initialConstraints = cons;
                vm.facet = new TextFacet(initial);
                // Unregister initListener
                initListener();
            });
            $scope.$emit(EVENT_REQUEST_CONSTRAINTS);
        }

        function emitChange() {
            var val = vm.facet.getSelectedValue();
            var args = {
                id: vm.facet.facetId,
                constraint: vm.facet.getConstraint(),
                value: val
            };
            $scope.$emit(EVENT_FACET_CHANGED, args);
        }

        function changed() {
            emitChange();
        }

        function clear() {
            vm.facet.clear();
            emitChange();
        }

        function enableFacet() {
            vm.facet.enable();
        }

        function disableFacet() {
            vm.facet.disable();
            emitChange();
        }

        function isFacetEnabled() {
            if (!vm.facet) {
                return false;
            }
            return vm.facet.isEnabled();
        }

    }
})();

(function() {
    'use strict';

    angular.module('seco.facetedSearch')

    .directive('secoTextFacet', textFacet);

    function textFacet() {
        return {
            restrict: 'E',
            scope: {
                options: '='
            },
            controller: 'TextFacetController',
            controllerAs: 'vm',
            templateUrl: 'src/facets/text/facets.text-facet.directive.html'
        };
    }
})();


/*
* Facet for selecting a simple value.
*/
(function() {
    'use strict';

    angular.module('seco.facetedSearch')
    .factory('TimespanFacet', TimespanFacet);

    /* ngInject */
    function TimespanFacet(_) {

        TimespanFacetConstructor.prototype.getConstraint = getConstraint;
        TimespanFacetConstructor.prototype.getPreferredLang = getPreferredLang;
        TimespanFacetConstructor.prototype.disable = disable;
        TimespanFacetConstructor.prototype.enable = enable;
        TimespanFacetConstructor.prototype.isEnabled = isEnabled;
        TimespanFacetConstructor.prototype.getSelectedValue = getSelectedValue;

        return TimespanFacetConstructor;

        function TimespanFacetConstructor(options) {

            /* Implementation */

            var defaultConfig = {
                preferredLang: 'fi'
            };

            this.config = angular.extend({}, defaultConfig, options);

            this.name = this.config.name;
            this.facetId = this.config.facetId;
            this.startPredicate = this.config.startPredicate;
            this.endPredicate = this.config.endPredicate;
            this.min = this.config.min;
            this.max = this.config.max;
            if (this.config.enabled) {
                this.enable();
            } else {
                this.disable();
            }

            this.varSuffix = this.facetId;

            // Initial value
            var initial = _.get(options, 'initialConstraints.facets.' + this.facetId);
            if (initial && initial.value) {
                this._isEnabled = true;
                this.selectedValue = initial.value;
            }
        }

        function getConstraint() {
            var result =
            ' <START_FILTER> ' +
            ' <END_FILTER> ';


            var start = (this.getSelectedValue() || {}).start;
            var end = (this.getSelectedValue() || {}).end;

            var startFilter =
            ' ?id <START_PROPERTY> <VAR> . ' +
            ' FILTER(<VAR> >= "<START_VALUE>"^^<http://www.w3.org/2001/XMLSchema#date>) ';

            var endFilter =
            ' ?id <END_PROPERTY> <VAR> . ' +
            ' FILTER(<VAR> <= "<END_VALUE>"^^<http://www.w3.org/2001/XMLSchema#date>) ';

            var startVar = '?start_' + this.varSuffix;
            var endVar = '?end_' + this.varSuffix;

            if (this.startPredicate === this.endPredicate) {
                endVar = startVar;
            }

            startFilter = startFilter.replace(/<VAR>/g, startVar);
            endFilter = endFilter.replace(/<VAR>/g, endVar);

            if (start) {
                start.setHours(12, 0, 0);
                start = dateToISOString(start);
                result = result
                    .replace('<START_FILTER>',
                        startFilter.replace('<START_PROPERTY>',
                            this.startPredicate))
                    .replace('<START_VALUE>', start);
            } else {
                result = result.replace('<START_FILTER>', '');
            }
            if (end) {
                end.setHours(12, 0, 0);
                end = dateToISOString(end);
                result = result
                    .replace('<END_FILTER>',
                        endFilter.replace('<END_PROPERTY>',
                            this.endPredicate))
                    .replace('<END_VALUE>', end);
            } else {
                result = result.replace('<END_FILTER>', '');
            }
            return result;
        }

        function dateToISOString(date) {
            return date.toISOString().slice(0, 10);
        }

        function getPreferredLang() {
            return this.config.preferredLang;
        }

        function getSelectedValue() {
            return this.selectedValue;
        }

        function isEnabled() {
            return this._isEnabled;
        }

        function enable() {
            this._isEnabled = true;
        }

        function disable() {
            this.selectedValue = undefined;
            this._isEnabled = false;
        }
    }
})();

(function() {
    'use strict';

    angular.module('seco.facetedSearch')
    .controller('TimespanFacetController', TimespanFacetController);

    /* ngInject */
    function TimespanFacetController($scope, _, EVENT_FACET_CHANGED,
            EVENT_REQUEST_CONSTRAINTS, EVENT_INITIAL_CONSTRAINTS, TimespanFacet) {
        var vm = this;

        vm.changed = changed;
        vm.enableFacet = enableFacet;
        vm.disableFacet = disableFacet;
        vm.isFacetEnabled = isFacetEnabled;

        init();

        function init() {
            var initListener = $scope.$on(EVENT_INITIAL_CONSTRAINTS, function(event, cons) {
                var initial = _.cloneDeep($scope.options);
                initial.initialConstraints = cons;
                vm.facet = new TimespanFacet(initial);
                // Unregister initListener
                initListener();
            });
            $scope.$emit(EVENT_REQUEST_CONSTRAINTS);
        }

        function emitChange() {
            var val = vm.facet.getSelectedValue();
            var args = {
                id: vm.facet.facetId,
                constraint: vm.facet.getConstraint(),
                value: val
            };
            $scope.$emit(EVENT_FACET_CHANGED, args);
        }

        function changed() {
            emitChange();
        }

        function enableFacet() {
            vm.facet.enable();
        }

        function disableFacet() {
            vm.facet.disable();
            emitChange();
        }

        function isFacetEnabled() {
            if (!vm.facet) {
                return false;
            }
            return vm.facet.isEnabled();
        }

    }
})();

(function() {
    'use strict';

    angular.module('seco.facetedSearch')

    .directive('secoTimespanFacet', timespanFacet);

    function timespanFacet() {
        return {
            restrict: 'E',
            scope: {
                options: '='
            },
            controller: 'TimespanFacetController',
            controllerAs: 'vm',
            templateUrl: 'src/facets/timespan/facets.timespan-facet.directive.html'
        };
    }
})();

/*
* Facet for selecting a simple value.
*/
(function() {
    'use strict';

    angular.module('seco.facetedSearch')

    .factory('HierarchyFacet', HierarchyFacet);

    /* ngInject */
    function HierarchyFacet(_, BasicFacet) {

        HierarchyFacetConstructor.prototype = Object.create(BasicFacet.prototype);

        HierarchyFacetConstructor.prototype.getSelectedValue = getSelectedValue;
        HierarchyFacetConstructor.prototype.getConstraint = getConstraint;
        HierarchyFacetConstructor.prototype.buildQueryTemplate = buildQueryTemplate;
        HierarchyFacetConstructor.prototype.buildQuery = buildQuery;
        HierarchyFacetConstructor.prototype.getHierarchyClasses = getHierarchyClasses;

        return HierarchyFacetConstructor;

        function HierarchyFacetConstructor(options) {

            var queryTemplate =
            ' PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> ' +
            ' PREFIX skos: <http://www.w3.org/2004/02/skos/core#> ' +
            ' PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> ' +
            ' SELECT DISTINCT ?cnt ?facet_text ?value WHERE {' +
            ' { ' +
            '  { ' +
            '   SELECT DISTINCT (count(DISTINCT ?id) as ?cnt) { ' +
            '    <OTHER_SELECTIONS> ' +
            '   } ' +
            '  } ' +
            '  BIND("<NO_SELECTION_STRING>" AS ?facet_text) ' +
            ' } UNION ' +
            '  {' +
            '   SELECT DISTINCT ?cnt ?value ?facet_text {' +
            '    {' +
            '     SELECT DISTINCT (count(DISTINCT ?id) as ?cnt) ?value ?class {' +
            '      VALUES ?class { ' +
            '       <HIERARCHY_CLASSES> ' +
            '      } ' +
            '      ?value <PROPERTY> ?class . ' +
            '      ?h <PROPERTY> ?value . ' +
            '      ?id <ID> ?h .' +
            '      <OTHER_SELECTIONS> ' +
            '     } GROUP BY ?class ?value ' +
            '    } ' +
            '    FILTER(BOUND(?value))' +
            '    <LABEL_PART> ' +
            '    BIND(COALESCE(?lbl, STR(?value)) as ?label)' +
            '    BIND(IF(?value = ?class, ?label, CONCAT("-- ", ?label)) as ?facet_text)' +
            '    BIND(IF(?value = ?class, 0, 1) as ?order)' +
            '   } ORDER BY ?class ?order ?facet_text' +
            '  } ' +
            ' } ';

            options.queryTemplate = options.queryTemplate || queryTemplate;

            BasicFacet.call(this, options);

            this.selectedValue;

            // Initial value
            var constVal = _.get(options, 'initialConstraints.facets.' + this.facetId);
            if (constVal && constVal.value) {
                this._isEnabled = true;
                this.selectedValue = { value: constVal.value };
            }

            var triplePatternTemplate =
            ' VALUES ?<CLASS_VAR> { ' +
            '  <HIERARCHY_CLASSES> ' +
            ' } ' +
            ' ?<H_VAR> <PROPERTY> ?<CLASS_VAR> . ' +
            ' ?<V_VAR> <PROPERTY> ?<H_VAR> . ' +
            ' ?id <ID> ?<V_VAR> .';

            this.triplePatternTemplate = this.buildQueryTemplate(triplePatternTemplate);
        }

        function buildQueryTemplate(template) {
            var templateSubs = [
                {
                    placeHolder: /<ID>/g,
                    value: this.predicate
                },
                {
                    placeHolder: /<PROPERTY>/g,
                    value: this.config.hierarchy
                },
                {
                    placeHolder: /<LABEL_PART>/g,
                    value: this.config.labelPart
                },
                {
                    placeHolder: /<NO_SELECTION_STRING>/g,
                    value: this.config.noSelectionString
                },
                {
                    placeHolder: /<H_VAR>/g,
                    value: 'seco_h_' + this.facetId
                },
                {
                    placeHolder: /<V_VAR>/g,
                    value: 'seco_v_' + this.facetId
                },
                {
                    placeHolder: /<CLASS_VAR>/g,
                    value: 'seco_class_' + this.facetId
                },
                {
                    placeHolder: /<LABEL_PART>/g,
                    value: this.config.labelPart
                },
                {
                    placeHolder: /<NO_SELECTION_STRING>/g,
                    value: this.config.noSelectionString
                },
                {
                    placeHolder: /\s+/g,
                    value: ' '
                }
            ];

            templateSubs.forEach(function(s) {
                template = template.replace(s.placeHolder, s.value);
            });
            return template;
        }

        function getHierarchyClasses() {
            return this.config.classes || [];
        }

        function getConstraint() {
            if (!this.getSelectedValue()) {
                return;
            }
            var res = this.triplePatternTemplate
                .replace(/<HIERARCHY_CLASSES>/g, this.getSelectedValue());

            return res;
        }

        function getSelectedValue() {
            var val;
            if (this.selectedValue) {
                val = this.selectedValue.value;
            }
            return val;
        }

        // Build the facet query
        function buildQuery(constraints) {
            constraints = constraints || [];
            var query = this.queryTemplate
                .replace(/<OTHER_SELECTIONS>/g, this.getOtherSelections(constraints))
                .replace(/<HIERARCHY_CLASSES>/g,
                    this.getSelectedValue() || this.getHierarchyClasses().join(' '))
                .replace(/<PREF_LANG>/g, this.getPreferredLang());

            return query;
        }
    }
})();

(function() {
    'use strict';

    angular.module('seco.facetedSearch')
    .controller('HierarchyFacetController', HierarchyFacetController);

    /* ngInject */
    function HierarchyFacetController($scope, $controller, HierarchyFacet) {
        var args = { $scope: $scope, FacetImpl: HierarchyFacet };
        return $controller('AbstractFacetController', args);
    }
})();

(function() {
    'use strict';

    angular.module('seco.facetedSearch')

    .directive('secoHierarchyFacet', hierarchyFacet);

    function hierarchyFacet() {
        return {
            restrict: 'E',
            scope: {
                options: '='
            },
            controller: 'HierarchyFacetController',
            controllerAs: 'vm',
            templateUrl: 'src/facets/basic/facets.basic-facet.directive.html'
        };
    }
})();

angular.module('seco.facetedSearch').run(['$templateCache', function($templateCache) {
  'use strict';

  $templateCache.put('src/facets/basic/facets.basic-facet.directive.html',
    "<div class=\"facet-wrapper\">\n" +
    "  <div class=\"facet\" ng-if=vm.facet.isEnabled()>\n" +
    "    <div class=\"well well-sm\">\n" +
    "      <div class=\"row\">\n" +
    "        <div class=\"col-xs-12 text-left\">\n" +
    "          <div class=\"alert alert-danger\" ng-if=\"vm.error\">{{ vm.error|limitTo:100 }}</div>\n" +
    "          <span spinner-key=\"vm.getSpinnerKey()\" spinner-start-active=\"true\"\n" +
    "            us-spinner=\"{radius:30, width:8, length: 40}\" ng-if=\"vm.isLoading()\"></span>\n" +
    "          <h5 class=\"facet-name pull-left\">{{ vm.facet.name }}</h5>\n" +
    "          <button\n" +
    "            ng-disabled=\"vm.isLoading()\"\n" +
    "            ng-click=\"vm.disableFacet()\"\n" +
    "            class=\"btn btn-danger btn-xs pull-right glyphicon glyphicon-remove\">\n" +
    "          </button>\n" +
    "          <div class=\"facet-input-container\">\n" +
    "            <input\n" +
    "            ng-disabled=\"vm.isLoading()\"\n" +
    "            type=\"text\"\n" +
    "            class=\"form-control\"\n" +
    "            ng-model=\"textFilter\" />\n" +
    "            <select\n" +
    "              ng-change=\"vm.changed()\"\n" +
    "              ng-disabled=\"vm.isLoading()\"\n" +
    "              ng-attr-size=\"{{ vm.getFacetSize(vm.facet.getState()) }}\"\n" +
    "              id=\"{{ ::vm.facet.name + '_select' }}\"\n" +
    "              class=\"selector form-control\"\n" +
    "              ng-options=\"value as (value.text + ' (' + value.count + ')') for value in vm.facet.getState() | textWithSelection:textFilter:vm.facet.selectedValue track by value.value\"\n" +
    "              ng-model=\"vm.facet.selectedValue\">\n" +
    "            </select>\n" +
    "          </div>\n" +
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
    "                ng-disabled=\"vm.isLoading()\"\n" +
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


  $templateCache.put('src/facets/text/facets.text-facet.directive.html',
    "<div class=\"facet-wrapper\">\n" +
    "  <span us-spinner=\"{radius:30, width:8, length: 40}\" ng-if=\"vm.isLoading()\"></span>\n" +
    "  <div class=\"facet\" ng-if=vm.isFacetEnabled()>\n" +
    "    <div class=\"well well-sm\">\n" +
    "      <div class=\"row\">\n" +
    "        <div class=\"col-xs-12 text-left\">\n" +
    "          <h5 class=\"facet-name pull-left\">{{ vm.facet.name }}</h5>\n" +
    "          <button\n" +
    "            ng-disabled=\"vm.isLoading()\"\n" +
    "            ng-click=\"vm.disableFacet()\"\n" +
    "            class=\"btn btn-danger btn-xs pull-right glyphicon glyphicon-remove\">\n" +
    "          </button>\n" +
    "        </div>\n" +
    "      </div>\n" +
    "      <div class=\"row\">\n" +
    "        <div class=\"col-xs-12 text-left\">\n" +
    "          <div class=\"facet-input-container\">\n" +
    "            <p class=\"input-group\">\n" +
    "            <input type=\"text\" class=\"form-control\"\n" +
    "            ng-change=\"vm.changed()\"\n" +
    "            ng-disabled=\"vm.isLoading()\"\n" +
    "            ng-model=\"vm.facet.selectedValue\"\n" +
    "            ng-model-options=\"{ debounce: 1000 }\">\n" +
    "            </input>\n" +
    "            <span class=\"input-group-btn\">\n" +
    "              <button type=\"button\" class=\"btn btn-default\"\n" +
    "                ng-disabled=\"vm.isDisabled()\"\n" +
    "                ng-click=\"vm.clear()\">\n" +
    "                <i class=\"glyphicon glyphicon-remove\"></i>\n" +
    "              </button>\n" +
    "            </span>\n" +
    "            </p>\n" +
    "          </div>\n" +
    "        </div>\n" +
    "      </div>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "  <div class=\"facet\" ng-if=!vm.isFacetEnabled()>\n" +
    "    <div class=\"well well-sm\">\n" +
    "      <div class=\"row\">\n" +
    "        <div class=\"col-xs-12\">\n" +
    "          <div class=\"row vertical-align\">\n" +
    "            <div class=\"col-xs-10 text-left\">\n" +
    "              <h5 class=\"facet-name\">{{ vm.facet.name }}</h5>\n" +
    "            </div>\n" +
    "            <div class=\"facet-enable-btn-container col-xs-2 text-right\">\n" +
    "              <button\n" +
    "                ng-disabled=\"vm.isLoading()\"\n" +
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


  $templateCache.put('src/facets/timespan/facets.timespan-facet.directive.html',
    "<div class=\"facet-wrapper\">\n" +
    "  <span us-spinner=\"{radius:30, width:8, length: 40}\" ng-if=\"vm.isLoading()\"></span>\n" +
    "  <div class=\"facet\" ng-if=vm.isFacetEnabled()>\n" +
    "    <div class=\"well well-sm\">\n" +
    "      <div class=\"row\">\n" +
    "        <div class=\"col-xs-12 text-left\">\n" +
    "          <h5 class=\"facet-name pull-left\">{{ vm.facet.name }}</h5>\n" +
    "          <button\n" +
    "            ng-disabled=\"vm.isLoading()\"\n" +
    "            ng-click=\"vm.disableFacet()\"\n" +
    "            class=\"btn btn-danger btn-xs pull-right glyphicon glyphicon-remove\">\n" +
    "          </button>\n" +
    "        </div>\n" +
    "      </div>\n" +
    "      <div class=\"row no-gutter\">\n" +
    "        <div class=\"col-md-6 facet-date-left\">\n" +
    "          <span class=\"input-group\">\n" +
    "            <span class=\"input-group-btn\">\n" +
    "              <button type=\"button\" class=\"btn btn-default\"\n" +
    "                ng-click=\"startDate.opened = !startDate.opened\">\n" +
    "                <i class=\"glyphicon glyphicon-calendar\"></i>\n" +
    "              </button>\n" +
    "            </span>\n" +
    "            <input type=\"text\" class=\"form-control\"\n" +
    "            uib-datepicker-popup=\"\"\n" +
    "            ng-disabled=\"vm.isDisabled()\"\n" +
    "            ng-change=\"vm.changed()\"\n" +
    "            ng-readonly=\"true\"\n" +
    "            ng-model=\"vm.facet.selectedValue.start\"\n" +
    "            is-open=\"startDate.opened\"\n" +
    "            min-date=\"vm.facet.min\"\n" +
    "            max-date=\"vm.facet.max\"\n" +
    "            init-date=\"vm.facet.min\"\n" +
    "            show-button-bar=\"false\"\n" +
    "            starting-day=\"1\"\n" +
    "            ng-required=\"true\"\n" +
    "            close-text=\"Close\" />\n" +
    "          </span>\n" +
    "        </div>\n" +
    "        <div class=\"col-md-6 facet-date-right\">\n" +
    "          <span class=\"input-group\">\n" +
    "            <span class=\"input-group-btn\">\n" +
    "              <button type=\"button\" class=\"btn btn-default\"\n" +
    "                ng-click=\"endDate.opened = !endDate.opened\">\n" +
    "                <i class=\"glyphicon glyphicon-calendar\"></i>\n" +
    "              </button>\n" +
    "            </span>\n" +
    "            <input type=\"text\" class=\"form-control\"\n" +
    "            uib-datepicker-popup=\"\"\n" +
    "            ng-disabled=\"vm.isDisabled()\"\n" +
    "            ng-readonly=\"true\"\n" +
    "            ng-change=\"vm.changed(id)\"\n" +
    "            ng-model=\"vm.facet.selectedValue.end\"\n" +
    "            is-open=\"endDate.opened\"\n" +
    "            min-date=\"vm.facet.selectedValue.start || vm.facet.min\"\n" +
    "            max-date=\"vm.facet.max\"\n" +
    "            init-date=\"vm.facet.selectedValue.start || vm.facet.min\"\n" +
    "            show-button-bar=\"false\"\n" +
    "            starting-day=\"1\"\n" +
    "            ng-required=\"true\"\n" +
    "            close-text=\"Close\" />\n" +
    "          </span>\n" +
    "        </div>\n" +
    "      </div>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "  <div class=\"facet\" ng-if=!vm.isFacetEnabled()>\n" +
    "    <div class=\"well well-sm\">\n" +
    "      <div class=\"row\">\n" +
    "        <div class=\"col-xs-12\">\n" +
    "          <div class=\"row vertical-align\">\n" +
    "            <div class=\"col-xs-10 text-left\">\n" +
    "              <h5 class=\"facet-name\">{{ vm.facet.name }}</h5>\n" +
    "            </div>\n" +
    "            <div class=\"facet-enable-btn-container col-xs-2 text-right\">\n" +
    "              <button\n" +
    "                ng-disabled=\"vm.isLoading()\"\n" +
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
