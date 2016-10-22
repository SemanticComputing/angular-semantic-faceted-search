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

        function updateUrlParams(facets) {
            var params = {};
            _(facets).forOwn(function(val, id) {
                if (val && val.value) {
                    params[id] = { value: val.value, constraint: val.constraint };
                }
            });
            if (!_.isEmpty(params)) {
                $location.search('facets', angular.toJson(params));
            }
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
                $location.search('facets', '');
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
    function Facets($log, $rootScope, $location, _, facetUrlStateHandlerService,
            EVENT_FACET_CONSTRAINTS, EVENT_FACET_CHANGED, EVENT_REQUEST_CONSTRAINTS,
            EVENT_INITIAL_CONSTRAINTS) {

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
                    preferredLang: 'en',
                    urlHandler: facetUrlStateHandlerService
                };

                self.config = angular.extend({}, defaultConfig, config);

                self.changeListener = $rootScope.$on(EVENT_FACET_CHANGED, update);
                self.initListener = $rootScope.$on(EVENT_REQUEST_CONSTRAINTS, broadCastInitial);

                if (!self.config.urlHandler) {
                    var noop = function() { };
                    var noopUrlHandler = {
                        getFacetValuesFromUrlParams: noop,
                        updateUrlParams: noop
                    };
                    self.urlHandler = noopUrlHandler;
                } else {
                    self.urlHandler = self.config.urlHandler;
                }

                self.state.facets = self.urlHandler.getFacetValuesFromUrlParams();
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
                self.urlHandler.updateUrlParams(self.state.facets);
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
    .factory('AbstractFacet', AbstractFacet);

    /* ngInject */
    function AbstractFacet($q, $log, _, SparqlService, facetMapperService,
            NO_SELECTION_STRING) {

        AbstractFacetConstructor.prototype.update = update;
        AbstractFacetConstructor.prototype.setState = setState;
        AbstractFacetConstructor.prototype.getState = getState;
        AbstractFacetConstructor.prototype.fetchState = fetchState;
        AbstractFacetConstructor.prototype.getConstraint = getConstraint;
        AbstractFacetConstructor.prototype.getTriplePattern = getTriplePattern;
        AbstractFacetConstructor.prototype.getFacetUri = getFacetUri;
        AbstractFacetConstructor.prototype.getLabelPart = getLabelPart;
        AbstractFacetConstructor.prototype.getName = getName;
        AbstractFacetConstructor.prototype.getPredicate = getPredicate;
        AbstractFacetConstructor.prototype.isBusy = isBusy;
        AbstractFacetConstructor.prototype.setBusy = setBusy;
        AbstractFacetConstructor.prototype.buildQueryTemplate = buildQueryTemplate;
        AbstractFacetConstructor.prototype.buildQuery = buildQuery;
        AbstractFacetConstructor.prototype.getQueryTemplate = getQueryTemplate;
        AbstractFacetConstructor.prototype.buildServiceUnions = buildServiceUnions;
        AbstractFacetConstructor.prototype.buildDeselectUnion = buildDeselectUnion;
        AbstractFacetConstructor.prototype.getDeselectUnionTemplate = getDeselectUnionTemplate;
        AbstractFacetConstructor.prototype.initTemplates = initTemplates;

        return AbstractFacetConstructor;

        function AbstractFacetConstructor(options) {

            /* Implementation */

            this.previousConstraints;
            this.state = {};

            this.labelPart =
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

            this.queryTemplate =
            ' PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> ' +
            ' PREFIX skos: <http://www.w3.org/2004/02/skos/core#> ' +
            ' PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> ' +

            ' SELECT DISTINCT ?cnt ?id ?facet_text ?value WHERE {' +
            '  <DESELECTION> ' +
            '  {' +
            '   SELECT DISTINCT ?cnt ?id ?value ?facet_text { ' +
            '    {' +
            '     SELECT DISTINCT (count(DISTINCT ?s) as ?cnt) (sample(?s) as ?ss) ?id ?value {' +
            '      <SELECTIONS> ' +
            '      <FACET_PATTERN> ' +
            '      BIND(<ID> AS ?id) ' +
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

            this.deselectUnionTemplate =
            ' { ' +
            '  { ' +
            '   SELECT DISTINCT (count(DISTINCT ?s) as ?cnt) ' +
            '   WHERE { ' +
            '    <SELECTIONS> ' +
            '   } ' +
            '  } ' +
            '  BIND("' + NO_SELECTION_STRING + '" AS ?facet_text) ' +
            '  BIND(<ID> AS ?id) ' +
            ' } UNION ';

            var defaultConfig = {
                preferredLang: 'fi'
            };

            this.config = angular.extend({}, defaultConfig, options);

            this.name = this.config.name;
            this.facetUri = this.config.facetUri;
            this.predicate = this.config.predicate;
            if (this.config.enabled) {
                this.enable();
            } else {
                this.disable();
            }

            this.endpoint = new SparqlService(this.config.endpointUrl);
        }

        function initTemplates() {
            this.queryTemplate = this.buildQueryTemplate(this.getQueryTemplate());
            this.deselectUnionTemplate = this.buildQueryTemplate(this.getDeselectUnionTemplate());
        }

        function update(constraints) {
            var self = this;
            if (!self.isEnabled()) {
                return $q.when();
            }
            if (self.previousConstraints && _.isEqual(constraints.constraint,
                    self.previousConstraints)) {
                return $q.when();
            }
            self.previousConstraints = _.clone(constraints.constraint);

            self.setBusy(true);

            return self.fetchState(constraints).then(function(state) {
                if (!_.isEqual(self.previousConstraints, constraints.constraint)) {
                    return $q.reject('Facet state changed');
                }
                self.setState(state);
                self.setBusy(false);

                return state;
            });
        }

        function setState(state) {
            this.state = state;
        }

        function getState() {
            return this.state;
        }

        function isBusy() {
            return this._isBusy;
        }

        function setBusy(val) {
            this._isBusy = val;
        }

        // Build a query with the facet selection and use it to get the facet state.
        function fetchState(constraints) {
            var query = this.buildQuery(constraints.constraint);

            return this.endpoint.getObjects(query).then(function(results) {
                var res = facetMapperService.makeObjectList(results);
                return _.first(res);
            });
        }

        function getTriplePattern() {
            return '?s ' + this.getPredicate() + ' ?value . ';
        }

        function getConstraint() {
            if (!this.getSelectedValue()) {
                return;
            }
            if (this.getSelectedValue()) {
                return ' ?s ' + this.getPredicate() + ' ' + this.getSelectedValue() + ' . ';
            }
        }

        function getPredicate() {
            return this.predicate;
        }

        function getFacetUri() {
            return this.facetUri;
        }

        function getName() {
            return this.name;
        }

        function getLabelPart() {
            return this.labelPart;
        }

        function getDeselectUnionTemplate() {
            return this.deselectUnionTemplate;
        }

        function getQueryTemplate() {
            return this.queryTemplate;
        }

        // Build the facet query
        function buildQuery(constraints) {
            constraints = constraints || [];
            var query = this.getQueryTemplate()
                .replace(/<OTHER_SERVICES>/g, this.buildServiceUnions(this.config.services))
                .replace(/<DESELECTION>/g, this.buildDeselectUnion(constraints))
                .replace(/<SELECTIONS>/g, constraints.join(' '))
                .replace(/<PREF_LANG>/g, this.config.preferredLang);

            return query;
        }

        function buildDeselectUnion(constraints) {
            var ownConstraint = this.getConstraint();
            var deselections = _.reject(constraints, function(v) { return v === ownConstraint; });
            return this.getDeselectUnionTemplate().replace('<SELECTIONS>', deselections.join(' '));
        }

        function buildServiceUnions(services) {
            var unions = '';
            _.forEach(services, function(service) {
                unions = unions +
                ' UNION { ' +
                '  SERVICE ' + service + ' { ' +
                    this.getLabelPart() +
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
                    value: this.getFacetUri()
                },
                {
                    placeHolder: /<FACET_PATTERN>/g,
                    value: this.getTriplePattern()
                },
                {
                    placeHolder: /<LABEL_PART>/g,
                    value: this.getLabelPart()
                }
            ];

            templateSubs.forEach(function(s) {
                template = template.replace(s.placeHolder, s.value);
            });
            return template;
        }
    }
})();

(function() {
    'use strict';

    angular.module('seco.facetedSearch')
    .controller('AbstractFacetController', AbstractFacetController);

    /* @ngInject */
    function AbstractFacetController($scope, $log, $q, _, EVENT_FACET_CONSTRAINTS,
            EVENT_FACET_CHANGED, EVENT_REQUEST_CONSTRAINTS, EVENT_INITIAL_CONSTRAINTS,
            FacetImpl) {

        var vm = this;

        vm.isLoading = isLoading;
        vm.changed = changed;

        vm.disableFacet = disableFacet;
        vm.enableFacet = enableFacet;

        vm.getFacet = getFacet;
        vm.getFacetName = getFacetName;
        vm.getFacetValues = getFacetValues;
        vm.isFacetEnabled = isFacetEnabled;

        vm.getFacetSize = getFacetSize;

        vm.listener = function() { };

        init(FacetImpl);

        function init(Facet) {
            var initListener = $scope.$on(EVENT_INITIAL_CONSTRAINTS, function(event, cons) {
                $log.debug($scope.options.name, 'Init');
                var initial = _.cloneDeep($scope.options);
                initial.initialConstraints = cons;
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

        function getFacet() {
            return vm.facet;
        }

        function getFacetName() {
            return vm.getFacet().getName();
        }

        function getFacetValues() {
            return vm.getFacet().getState().values;
        }

        function isFacetEnabled() {
            return vm.getFacet().isEnabled();
        }

        function listen() {
            vm.listener = $scope.$on(EVENT_FACET_CONSTRAINTS, function(event, cons) {
                $log.debug(vm.facet.name, 'Receive constraints', _.cloneDeep(cons));
                update(cons);
            });
        }

        function update(constraints) {
            vm.isLoadingFacet = true;
            $log.warn(_.cloneDeep(vm.facet));
            return vm.facet.update(constraints).then(handleUpdateSuccess, handleError);
        }

        function isLoading() {
            return vm.isLoadingFacet || vm.getFacet().isLoading();
        }

        function emitChange(forced) {
            var val = vm.facet.getSelectedValue();
            if (!forced && _.isEqual(vm.previousVal, val)) {
                $log.warn(vm.facet.name, 'Skip emit', val);
                vm.isLoadingFacet = false;
                return;
            }
            vm.previousVal = _.clone(val);
            var args = {
                id: vm.facet.getFacetUri(),
                constraint: vm.facet.getConstraint(),
                value: val
            };
            $log.log(vm.facet.name, 'Emit', args);
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
            emitChange(true);
        }

        function disableFacet() {
            vm.listener();
            vm.facet.disable();
            var forced = vm.facet.getSelectedValue() ? true : false;
            emitChange(forced);
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
    function BasicFacet($log, _, AbstractFacet) {

        BasicFacetConstructor.prototype = Object.create(AbstractFacet.prototype);

        BasicFacetConstructor.prototype.disable = disable;
        BasicFacetConstructor.prototype.enable = enable;
        BasicFacetConstructor.prototype.isLoading = isLoading;
        BasicFacetConstructor.prototype.isEnabled = isEnabled;
        BasicFacetConstructor.prototype.getSelectedValue = getSelectedValue;

        return BasicFacetConstructor;

        function BasicFacetConstructor(options) {

            AbstractFacet.call(this, options);

            this.selectedValue = {};

            var constVal = options.initialConstraints.facets[this.getFacetUri()];
            if (constVal && constVal.value) {
                this._isEnabled = true;
                this.selectedValue = { value: constVal.value };
            }

            this.initTemplates();
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
            this.selectedValue = {};
            this._isEnabled = false;
        }

        function isLoading() {
            return this.isBusy();
        }
    }
})();

(function() {
    'use strict';

    angular.module('seco.facetedSearch')
    .controller('BasicFacetController', BasicFacetController);

    /* ngInject */
    function BasicFacetController($scope, $controller, $log, $q, _, BasicFacet) {
        var vm = this;
        var args = { $scope: $scope, FacetImpl: BasicFacet };
        angular.extend(vm, $controller('AbstractFacetController', args));
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

    .factory('HierarchyFacet', HierarchyFacet);

    /* ngInject */
    function HierarchyFacet($log, _, AbstractFacet) {

        HierarchyFacetConstructor.prototype = Object.create(AbstractFacet.prototype);

        HierarchyFacetConstructor.prototype.disable = disable;
        HierarchyFacetConstructor.prototype.enable = enable;
        HierarchyFacetConstructor.prototype.isLoading = isLoading;
        HierarchyFacetConstructor.prototype.isEnabled = isEnabled;
        HierarchyFacetConstructor.prototype.getSelectedValue = getSelectedValue;
        HierarchyFacetConstructor.prototype.getConstraint = getConstraint;
        HierarchyFacetConstructor.prototype.getTriplePattern = getTriplePattern;
        HierarchyFacetConstructor.prototype.buildQueryTemplate = buildQueryTemplate;
        HierarchyFacetConstructor.prototype.getHierarchyClasses = getHierarchyClasses;

        return HierarchyFacetConstructor;

        function HierarchyFacetConstructor(options) {

            AbstractFacet.call(this, options);

            this.queryTemplate =
            ' PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> ' +
            ' PREFIX skos: <http://www.w3.org/2004/02/skos/core#> ' +
            ' PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> ' +
            ' SELECT DISTINCT ?cnt ?id ?facet_text ?value WHERE {' +
            '  <DESELECTION> ' +
            '  {' +
            '   SELECT DISTINCT ?cnt ?id ?value ?facet_text {' +
            '    {' +
            '     SELECT DISTINCT (count(DISTINCT ?s) as ?cnt) ?id ?value ?class {' +
            '      BIND(<ID> AS ?id) ' +
            '      VALUES ?class { ' +
            '       <HIERARCHY_CLASSES> ' +
            '      } ' +
            '      ?value <PROPERTY> ?class . ' +
            '      ?h <PROPERTY> ?value . ' +
            '      ?s ?id ?h .' +
            '      <SELECTIONS> ' +
            '     } GROUP BY ?class ?value ?id' +
            '    } ' +
            '    FILTER(BOUND(?id))' +
            '    <LABEL_PART> ' +
            '    BIND(COALESCE(?lbl, STR(?value)) as ?label)' +
            '    BIND(IF(?value = ?class, ?label, CONCAT("-- ", ?label)) as ?facet_text)' +
            '    BIND(IF(?value = ?class, 0, 1) as ?order)' +
            '   } ORDER BY ?class ?order ?facet_text' +
            '  } ' +
            ' } ';

            this.selectedValue = {};

            // Initial value
            var constVal = options.initialConstraints.facets[this.getFacetUri()];
            if (constVal && constVal.value) {
                this._isEnabled = true;
                this.selectedValue = { value: constVal.value };
            }

            this.initTemplates();
        }

        function buildQueryTemplate(template) {
            var templateSubs = [
                {
                    placeHolder: /<ID>/g,
                    value: this.getFacetUri()
                },
                {
                    placeHolder: /<PROPERTY>/g,
                    value: this.config.predicate
                },
                {
                    placeHolder: /<HIERARCHY_CLASSES>/g,
                    value: this.getHierarchyClasses().join(' ')
                },
                {
                    placeHolder: /<LABEL_PART>/g,
                    value: this.getLabelPart()
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

        function getTriplePattern() {
            var res =
            (' VALUES ?class { ' +
            '  <HIERARCHY_CLASSES> ' +
            ' } ' +
            ' ?value <PROPERTY> ?class . ' +
            ' ?h <PROPERTY> ?value . ' +
            ' ?s <ID> ?h .')
            .replace(/<PROPERTY>/g, this.getPredicate())
            .replace(/<ID>/g, this.getFacetUri())
            .replace(/<HIERARCHY_CLASSES>/g, this.getHierarchyClasses().join(' '));

            return res;
        }

        function getConstraint() {
            if (!this.getSelectedValue()) {
                return;
            }
            var res =
            (' VALUES ?class { ' +
            '  <HIERARCHY_CLASSES> ' +
            ' } ' +
            ' ?value <PROPERTY> ?class . ' +
            ' ?h <PROPERTY> ?value . ' +
            ' ?s <ID> ?h .')
            .replace(/<PROPERTY>/g, this.getPredicate())
            .replace(/<ID>/g, this.getFacetUri())
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

        function isEnabled() {
            return this._isEnabled;
        }

        function enable() {
            this._isEnabled = true;
        }

        function disable() {
            this.selectedValue = {};
            this._isEnabled = false;
        }

        function isLoading() {
            return this.isBusy();
        }
    }
})();

(function() {
    'use strict';

    angular.module('seco.facetedSearch')
    .controller('HierarchyFacetController', HierarchyFacetController);

    /* ngInject */
    function HierarchyFacetController($scope, $controller, HierarchyFacet) {
        var vm = this;
        var args = { $scope: $scope, FacetImpl: HierarchyFacet };
        angular.extend(vm, $controller('AbstractFacetController', args));
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
    "  <span us-spinner=\"{radius:30, width:8, length: 40}\" ng-if=\"vm.isLoading()\"></span>\n" +
    "  <div class=\"facet\" ng-if=vm.isFacetEnabled()>\n" +
    "    <div class=\"well well-sm\">\n" +
    "      <div class=\"row\">\n" +
    "        <div class=\"col-xs-12 text-left\">\n" +
    "          <h5 class=\"facet-name pull-left\">{{ vm.getFacetName() }}</h5>\n" +
    "          <button\n" +
    "            ng-disabled=\"vm.isLoading()\"\n" +
    "            ng-click=\"vm.disableFacet()\"\n" +
    "            class=\"btn btn-danger btn-xs pull-right glyphicon glyphicon-remove\">\n" +
    "          </button>\n" +
    "        </div>\n" +
    "      </div>\n" +
    "      <div class=\"facet-input-container\">\n" +
    "        <div>\n" +
    "          <input\n" +
    "            ng-disabled=\"vm.isLoading()\"\n" +
    "            type=\"text\"\n" +
    "            class=\"form-control\"\n" +
    "            ng-model=\"textFilter\" />\n" +
    "          <select\n" +
    "            ng-change=\"vm.changed(id)\"\n" +
    "            ng-disabled=\"vm.isLoading()\"\n" +
    "            ng-attr-size=\"{{ vm.getFacetSize(vm.getFacetValues()) }}\"\n" +
    "            id=\"{{ ::vm.getFacet().name + '_select' }}\"\n" +
    "            class=\"selector form-control\"\n" +
    "            ng-options=\"value as (value.text + ' (' + value.count + ')') for value in vm.getFacetValues() | textWithSelection:textFilter:vm.getFacet().selectedValue track by value.value\"\n" +
    "            ng-model=\"vm.getFacet().selectedValue\">\n" +
    "          </select>\n" +
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
    "              <h5 class=\"facet-name\">{{ vm.getFacetName() }}</h5>\n" +
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
