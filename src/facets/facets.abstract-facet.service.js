
/*
* Facet for selecting a simple value.
*/
(function() {
    'use strict';

    angular.module('seco.facetedSearch')
    .factory('AbstractFacet', AbstractFacet);

    /* ngInject */
    function AbstractFacet($q, $log, _, SparqlService, facetMapperService, NO_SELECTION_STRING) {

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
        AbstractFacetConstructor.prototype.getPreferredLang = getPreferredLang;
        AbstractFacetConstructor.prototype.isBusy = isBusy;
        AbstractFacetConstructor.prototype.setBusy = setBusy;
        AbstractFacetConstructor.prototype.buildQueryTemplate = buildQueryTemplate;
        AbstractFacetConstructor.prototype.buildQuery = buildQuery;
        AbstractFacetConstructor.prototype.getQueryTemplate = getQueryTemplate;
        AbstractFacetConstructor.prototype.buildServiceUnions = buildServiceUnions;
        AbstractFacetConstructor.prototype.buildSelections = buildSelections;
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
            $log.warn(self.getName(), constraints.constraint, self.previousConstraints);
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
                $log.warn(self.getName(), state);
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

            $log.warn(this.getName(), query);

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

        function getPreferredLang() {
            return this.config.preferredLang;
        }

        // Build the facet query
        function buildQuery(constraints) {
            constraints = constraints || [];
            var query = this.getQueryTemplate()
                .replace(/<OTHER_SERVICES>/g, this.buildServiceUnions(this.config.services))
                .replace(/<DESELECTION>/g, this.buildDeselectUnion(constraints))
                .replace(/<SELECTIONS>/g, this.buildSelections(constraints))
                .replace(/<PREF_LANG>/g, this.getPreferredLang());

            return query;
        }

        function buildSelections(constraints) {
            constraints = constraints.join(' ');
            if (this.getSelectedValue()) {
                // The constraints already include this facet's selection
                return constraints;
            }
            return constraints + ' ' + this.getTriplePattern();
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
