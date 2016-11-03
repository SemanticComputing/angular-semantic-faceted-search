
/*
* Facet for selecting a simple value.
*/
(function() {
    'use strict';

    angular.module('seco.facetedSearch')
    .factory('TimespanFacet', TimespanFacet);

    /* ngInject */
    function TimespanFacet($q, _, AdvancedSparqlService, objectMapperService, BasicFacet) {
        TimespanFacetConstructor.prototype = Object.create(BasicFacet.prototype);

        TimespanFacetConstructor.prototype.getSelectedValue = getSelectedValue;
        TimespanFacetConstructor.prototype.getConstraint = getConstraint;
        TimespanFacetConstructor.prototype.buildQueryTemplate = buildQueryTemplate;
        TimespanFacetConstructor.prototype.buildQuery = buildQuery;
        TimespanFacetConstructor.prototype.fetchState = fetchState;
        TimespanFacetConstructor.prototype.getOtherSelections = getOtherSelections;

        return TimespanFacetConstructor;

        function TimespanFacetConstructor(options) {
            var prefixes =
            ' PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> ' +
            ' PREFIX skos: <http://www.w3.org/2004/02/skos/core#> ' +
            ' PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> ';

            var simpleTemplate = prefixes +
            ' SELECT (min(xsd:date(?value)) AS ?min) (max(xsd:date(?value)) AS ?max) { ' +
            '   <SELECTIONS> ' +
            '   ?id <START_PROPERTY> ?value . ' +
            ' } ';

            var separateTemplate = prefixes +
            ' PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> ' +
            ' PREFIX skos: <http://www.w3.org/2004/02/skos/core#> ' +
            ' PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> ' +
            ' SELECT ?min ?max { ' +
            '   { ' +
            '     SELECT (min(xsd:date(?start)) AS ?min) { ' +
            '       <SELECTIONS> ' +
            '       ?id <START_PROPERTY> ?start . ' +
            '     } ' +
            '   } ' +
            '   { ' +
            '     SELECT (max(xsd:date(?end)) AS ?max) { ' +
            '       <SELECTIONS> ' +
            '       ?id <END_PROPERTY> ?end . ' +
            '     } ' +
            '   } ' +
            ' } ';

            var defaultConfig = {};

            this.config = angular.extend({}, defaultConfig, options);

            this.name = this.config.name;
            this.facetId = this.config.facetId;
            this.startPredicate = this.config.startPredicate;
            this.endPredicate = this.config.endPredicate;
            this.minDate = this.config.min;
            this.maxDate = this.config.max;

            this.state = {};

            this.state.start = {
                minDate: this.minDate,
                maxDate: this.maxDate,
                initDate: this.minDate,
                startingDay: this.config.startingDay || 1
            };

            this.state.end = {
                minDate: this.minDate,
                maxDate: this.maxDate,
                initDate: this.maxDate,
                startingDay: this.config.startingDay || 1
            };

            if (this.config.enabled) {
                this.enable();
            } else {
                this.disable();
            }

            this.endpoint = new AdvancedSparqlService(this.config.endpointUrl,
                objectMapperService);

            this.queryTemplate = this.buildQueryTemplate(
                this.startPredicate === this.endPredicate ? simpleTemplate : separateTemplate);

            this.varSuffix = this.facetId;

            this.selectedValue = {};

            // Initial value
            var initial = _.get(options, 'initial.' + this.facetId);
            if (initial && initial.value) {
                this._isEnabled = true;
                this.selectedValue = {};
                if (initial.value.start) {
                    this.selectedValue.start = new Date(initial.value.start);
                }
                if (initial.value.end) {
                    this.selectedValue.end = new Date(initial.value.end);
                }
            }
        }

        function buildQueryTemplate(template) {
            return template
                .replace(/<START_PROPERTY>/g, this.startPredicate)
                .replace(/<END_PROPERTY>/g, this.endPredicate)
                .replace(/\s+/g, ' ');
        }

        function buildQuery(constraints) {
            constraints = constraints || [];
            var query = this.queryTemplate
                .replace(/<SELECTIONS>/g, this.getOtherSelections(constraints));
            return query;
        }

        function getOtherSelections(constraints) {
            var ownConstraint = this.getConstraint();
            var selections = _.reject(constraints, function(v) { return v === ownConstraint; });
            return selections.join(' ');
        }

        // Build a query with the facet selection and use it to get the facet state.
        function fetchState(constraints) {
            var self = this;

            var query = self.buildQuery(constraints.constraint);

            return self.endpoint.getObjectsNoGrouping(query).then(function(results) {
                var state = _.first(results);
                var min = new Date(state.min);
                var max = new Date(state.max);

                if (min < self.minDate) {
                    min = self.minDate;
                }

                if (max > self.maxDate) {
                    max = self.maxDate;
                }

                self.state.start.minDate = min;
                self.state.start.initDate = min;
                self.state.start.maxDate = max;

                self.state.end.minDate = min;
                self.state.end.maxDate = max;
                self.state.end.initDate = max;

                self._error = false;

                return self.state;
            }).catch(function(error) {
                self._isBusy = false;
                self._error = true;
                return $q.reject(error);
            });
        }

        function getSelectedValue() {
            return this.selectedValue;
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
    }
})();
