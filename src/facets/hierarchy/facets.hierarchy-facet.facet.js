/*
* Facet for selecting a simple value.
*/
(function() {
    'use strict';

    angular.module('seco.facetedSearch')

    .factory('HierarchyFacet', HierarchyFacet);

    /* ngInject */
    function HierarchyFacet($log, _, AbstractFacet) {

        return HierarchyFacetConstructor;

        function HierarchyFacetConstructor(options) {
            var self = this;

            var queryTemplate =
            ' SELECT DISTINCT ?cnt ?id ?value ?facet_text {' +
            '  { ' +
            '   SELECT DISTINCT (count(DISTINCT ?s) as ?cnt) ?id ?value ?class {' +
            '    BIND(<ID> AS ?id) ' +
            '    VALUES ?class { ' +
            '     <HIERARCHY_CLASSES> ' +
            '    } ' +
            '    ?value <PROPERTY> ?class . ' +
            '    ?h <PROPERTY> ?value . ' +
            '    ?s ?id ?h .' +
            '    <SELECTIONS> ' +
            '   } GROUP BY ?class ?value ?id' +
            '  } ' +
            '  FILTER(BOUND(?id))' +
            '  <LABEL_PART> ' +
            '  BIND(COALESCE(?lbl, STR(?value)) as ?label)' +
            '  BIND(IF(?value = ?class, ?label, CONCAT("-- ", ?label)) as ?facet_text)' +
            '  BIND(IF(?value = ?class, 0, 1) as ?order)' +
            ' } ORDER BY ?class ?order ?facet_text';

            /* Public API */

            self.disable = disable;
            self.enable = enable;
            self.isLoading = isLoading;
            self.isEnabled = isEnabled;
            self.getSelectedValue = getSelectedValue;
            self.getConstraint = getConstraint;
            self.getTriplePattern = getTriplePattern;

            // Properties
            self.selectedValue = {};

            /* Implementation */

            init(options);

            function init(options) {

                self = angular.extend(self, new AbstractFacet(self, options));
                // Initial value
                var constVal = options.initialConstraints.facets[self.getFacetUri()];
                if (constVal && constVal.value) {
                    self._isEnabled = true;
                    self.selectedValue = { value: constVal.value };
                }

                self.initTemplates();

            }

            function getTriplePattern() {
                var res =
                (' VALUES ?class { ' +
                '  <HIERARCHY_CLASSES> ' +
                ' } ' +
                ' ?value <PROPERTY> ?class . ' +
                ' ?h <PROPERTY> ?value . ' +
                ' ?s <ID> ?h .')
                .replace(/<PROPERTY>/g, self.getPredicate())
                .replace(/<ID>/g, self.getFacetUri())
                .replace(/<HIERARCHY_CLASSES>/g, self.config.classes.join(' '));

                return res;
            }

            function getConstraint() {
                if (!self.getSelectedValue()) {
                    return;
                }
                var res =
                (' VALUES ?class { ' +
                '  <HIERARCHY_CLASSES> ' +
                ' } ' +
                ' ?value <PROPERTY> ?class . ' +
                ' ?h <PROPERTY> ?value . ' +
                ' ?s <ID> ?h .')
                .replace(/<PROPERTY>/g, self.getPredicate())
                .replace(/<ID>/g, self.getFacetUri())
                .replace(/<HIERARCHY_CLASSES>/g, self.getSelectedValue());

                return res;
            }

            function getSelectedValue() {
                var val;
                if (self.selectedValue) {
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
                return self.isBusy();
            }
        }
    }
})();
