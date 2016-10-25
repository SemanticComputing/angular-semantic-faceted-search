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

        function updateUrlParams(facets) {
            facets = facets.facets || facets;
            var params = {};
            _(facets).forOwn(function(val, id) {
                if (val && val.value) {
                    params[id] = { value: val.value, constraint: val.constraint };
                }
            });
            if (_.isEmpty(params)) {
                params = null;
            } else {
                params = angular.toJson(params);
            }
            $location.search('facets', params);
        }

        function getFacetValuesFromUrlParams() {
            var res = {};

            var params = ($location.search() || {}).facets;
            if (!params) {
                return res;
            }
            try {
                params = angular.fromJson(params);
            }
            catch(e) {
                $location.search('facets', null);
                return res;
            }
            _.forOwn(params, function(val, id) {
                res[id] = val;
            });
            return res;
        }
    }
})();
