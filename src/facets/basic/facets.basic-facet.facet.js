/*
* Facet for selecting a simple value.
*/
(function() {
    'use strict';

    angular.module('seco.facetedSearch')

    .factory('BasicFacet', BasicFacet);

    /* ngInject */
    function BasicFacet(_, AbstractFacet) {

        return BasicFacetConstructor;

        function BasicFacetConstructor(options) {
            var self = this;

            /* Public API */

            self.disable = disable;
            self.enable = enable;
            self.isLoading = isLoading;
            self.isEnabled = isEnabled;
            self.getSelectedValue = getSelectedValue;

            // Properties
            self.selectedValue = {};

            /* Implementation */

            init(options);

            function init(options) {
                // Initial value
                var constVal = options.initialConstraints.facets[self.facetUri];
                if (constVal && constVal.value) {
                    self.selectedValue = { value: constVal.value };
                }

                self.super = new AbstractFacet(self, options);

                self = angular.extend(self, self.super);
            }

            /* Public API functions */

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
                return self.super.isBusy();
            }
        }
    }
})();
