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

        function updateUrlParams(facetSelections) {
            var values = getFacetValues(facetSelections);
            $location.search(values);
        }

        function getFacetValuesFromUrlParams() {
            return $location.search();
        }

        function getFacetValues(facetSelections) {
            var values = {};
            _.forOwn(facetSelections, function(val, id) {
                if (_.isArray(val)) {
                    // Basic facet (with multiselect)
                    var vals = _(val).map('value').compact().value();
                    if (vals.length) {
                        values[id] = vals;
                    }
                } else if (_.isObject(val.value)) {
                    // Timespan facet
                    var span = val.value;
                    if (span.start && span.end) {
                        var timespan = {
                            start: parseValue(val.value.start),
                            end: parseValue(val.value.end)
                        };
                        values[id] = angular.toJson(timespan);
                    }
                } else if (val.value) {
                    // Text facet
                    values[id] = val.value;
                }
            });
            return values;
        }

        function parseValue(value) {
            if (Date.parse(value)) {
                return value.toISOString().slice(0, 10);
            }
            return value;
        }
    }
})();
