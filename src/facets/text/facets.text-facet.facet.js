
/*
* Facet for selecting a simple value.
*/
(function() {
    'use strict';

    angular.module('seco.facetedSearch')
    .factory('TextFacet', TextFacet);

    /* ngInject */
    function TextFacet() {

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
            var initial = options.initialConstraints.facets[this.facetId];
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
            var result = this.useJenaText ? ' ?s text:query "' + value + '*" . ' : '';
            var textVar = '?' + this.facetId;
            result = result + ' ?s ' + this.predicate + ' ' + textVar + ' . ';
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
