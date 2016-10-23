
/*
* Facet for selecting a simple value.
*/
(function() {
    'use strict';

    angular.module('seco.facetedSearch')
    .factory('TextFacet', TextFacet);

    /* ngInject */
    function TextFacet($log) {

        TextFacetConstructor.prototype.getConstraint = getConstraint;
        TextFacetConstructor.prototype.getFacetUri = getFacetUri;
        TextFacetConstructor.prototype.getName = getName;
        TextFacetConstructor.prototype.getPredicate = getPredicate;
        TextFacetConstructor.prototype.getPreferredLang = getPreferredLang;
        TextFacetConstructor.prototype.disable = disable;
        TextFacetConstructor.prototype.enable = enable;
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
            this.facetUri = this.config.facetUri;
            this.predicate = this.config.predicate;
            if (this.config.enabled) {
                this.enable();
            } else {
                this.disable();
            }

            // Initial value
            var initial = options.initialConstraints.facets[this.getFacetUri()];
            if (initial) {
                this._isEnabled = true;
                this.selectedValue = initial;
            }
        }

        function getConstraint() {
            var value = this.getSelectedValue();
            if (!value) {
                return;
            }
            var result = this.useJenaText ? ' ?s text:query "' + value + '*" . ' : '';
            var textVar = '?text' + 0;
            result = result + ' ?s ' + this.getPredicate() + ' ' + textVar + ' . ';
            var words = value.replace(/[?,._*'\\/-]/g, ' ');

            words.split(' ').forEach(function(word) {
                result = result + ' FILTER(CONTAINS(LCASE(' + textVar + '), "' +
                        word.toLowerCase() + '")) ';
            });

            $log.warn(result);

            return result;
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
            this.selectedValue = {};
            this._isEnabled = false;
        }
    }
})();
