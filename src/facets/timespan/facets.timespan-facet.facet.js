
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
