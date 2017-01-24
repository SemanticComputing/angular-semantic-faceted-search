
/*
* Facet for selecting a date range
*/
(function() {
    'use strict';

    angular.module('seco.facetedSearch')
    .factory('PredicateFacet', PredicateFacet);

    /* ngInject */
    function PredicateFacet($q, _, AdvancedSparqlService, facetMapperService, BasicFacet,
            PREFIXES) {
        PredicateFacet.prototype = Object.create(BasicFacet.prototype);

        PredicateFacet.prototype.getConstraint = getConstraint;
        PredicateFacet.prototype.buildQueryTemplate = buildQueryTemplate;
        PredicateFacet.prototype.buildQuery = buildQuery;
        PredicateFacet.prototype.fetchState = fetchState;
        PredicateFacet.prototype.getOtherSelections = getOtherSelections;

        return PredicateFacet;

        function PredicateFacet(options) {

            var queryTemplate = PREFIXES +
            ' SELECT DISTINCT ?value ?facet_text ?cnt WHERE { ' +
            '  <PREDICATE_UNION> ' +
            ' } ';

            var predTemplate =
            ' { ' +
            '  SELECT DISTINCT (COUNT(DISTINCT(?id)) AS ?cnt) ?value ("<LABEL>" AS ?facet_text) { ' +
            '   <SELECTIONS> ' +
            '   BIND(<PREDICATE> AS ?value) ' +
            '   ?id ?value [] . ' +
            '  } GROUP BY ?value ' +
            ' } ';

            var defaultConfig = {};

            this.config = angular.extend({}, defaultConfig, options);

            this.name = this.config.name;
            this.facetId = this.config.facetId;
            this.state = {};

            if (this.config.enabled) {
                this.enable();
            } else {
                this.disable();
            }

            this.endpoint = new AdvancedSparqlService(this.config.endpointUrl,
                facetMapperService);

            this.queryTemplate = this.buildQueryTemplate(queryTemplate, predTemplate);

            this.varSuffix = this.facetId;

            this.selectedValue = {};

            // Initial value
            var initial = _.get(options, 'initial[' + this.facetId + '].value');
            if (initial) {
                this._isEnabled = true;
                this.selectedValue = { value: initial };
            }
        }

        function buildQueryTemplate(template, predTemplate) {
            var unions = '';
            this.config.predicates.forEach(function(pred) {
                var union = predTemplate
                    .replace(/<PREDICATE>/g, pred.predicate)
                    .replace(/<LABEL>/g, pred.label);
                if (unions) {
                    union = ' UNION ' + union;
                }
                unions += union;
            });

            return template
                .replace(/<PREDICATE_UNION>/g, unions)
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
                self._error = false;
                return results;
            }).catch(function(error) {
                self._isBusy = false;
                self._error = true;
                return $q.reject(error);
            });
        }

        function getConstraint() {
            var selections = _.compact(this.getSelectedValue());
            if (!(selections.length)) {
                return;
            }
            var res = '';
            selections.forEach(function(val) {
                var cons = ' ?id ' + val + ' [] . ';
                if (res) {
                    cons = ' UNION { ' + cons + ' } ';
                } else if (selections.length > 1) {
                    cons = ' { ' + cons + ' } ';
                }
                res += cons;
            });

            return res;
        }
    }
})();
