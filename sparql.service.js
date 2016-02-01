/*
* Service for querying a SPARQL endpoint.
* Takes the endpoint URL as a parameter.
*/
(function() {
    'use strict';

    /* eslint-disable angular/no-service-method */
    angular.module('sparql', [])

    .factory('SparqlService', SparqlService);

    /* ngInject */
    function SparqlService($http, $q) {
        return function(endpointUrl) {

            var executeQuery = function(sparqlQry) {
                return $http.get(endpointUrl + '?query=' + encodeURIComponent(sparqlQry) + '&format=json',
                    { cache: true });
            };

            return {
                getObjects: function(sparqlQry) {
                    // Query the endpoint and return a promise of the bindings.
                    return executeQuery(sparqlQry).then(function(response) {
                        return response.data.results.bindings;
                    }, function(response) {
                        return $q.reject(response.data);
                    });
                }
            };
        };
    }
})();
