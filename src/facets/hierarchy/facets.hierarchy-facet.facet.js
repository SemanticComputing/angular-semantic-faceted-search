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
        HierarchyFacetConstructor.prototype.buildQuery = buildQuery;
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
            '      <SELECTIONS> ' +
            '      BIND(<ID> AS ?id) ' +
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

        // Build the facet query
        function buildQuery(constraints) {
            constraints = constraints || [];
            var sel = this.buildSelections(constraints);
            $log.warn(this.getName(), sel);
            var query = this.getQueryTemplate()
                .replace(/<DESELECTION>/g, this.buildDeselectUnion(constraints))
                .replace(/<SELECTIONS>/g, this.buildSelections(constraints))
                .replace(/<HIERARCHY_CLASSES>/g, this.getSelectedValue())
                .replace(/<PREF_LANG>/g, this.getPreferredLang());

            return query;
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
