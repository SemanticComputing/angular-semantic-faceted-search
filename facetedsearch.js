var facetApp = angular.module('facetApp',[]);

facetApp.factory( 'Facets', function( $rootScope, $q ) {
    function FacetHandler( endpoint_url, facets ) {

        var facetStates = [];

        // TODO: Create SPARQL instance

        this.selectFacet = function( facet, value ) {
            // TODO: Update facetStates
            return $q.when(facetStates);
        }
        this.getStates = function() {
            return $q.when(facetStates);
        }
    }

    return FacetHandler;
});

facetApp.controller( 'FacetListCtrl', function ( $scope, Facets ) {
    this.facets = [
    {'name': 'Ammatti',
     'property': 'http://ldf.fi/schema/narc-menehtyneet1939-45/ammatti'},
    {'name': 'Joukko-osasto',
     'property': 'http://ldf.fi/schema/narc-menehtyneet1939-45/joukko_osasto'},
    ];

    this.facetStates = [];

    this.facetHandler = new Facets('http://ldf.fi/warsa/sparql', this.facets);

    this.facetHandler.getStates().then( function( states ) { this.facetStates = states; })
});

facetApp.factory( 'Results', [ '$rootScope', function( $rootScope ) {
    var service = {

    }

    return service;
}]);


facetApp.controller( 'MainCtrl', function ( $scope ) {
});


/*
 * Service for querying a SPARQL endpoint.
 * Takes the endpoint URL as a parameter.
 */
facetApp.factory('SparqlService', function($http, $q) {
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
})
