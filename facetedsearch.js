'use strict';

var facetApp = angular.module('facetApp',[]);

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

facetApp.factory( 'Facets', function( $rootScope, $q, SparqlService, facetMapperService ) {
    return function( endpoint_url, facets ) {

        var facetStates = [];

        var SPARQL = new SparqlService(endpoint_url);

        this.selectFacet = function( facet, value ) {
            // TODO: Update facetStates
            return $q.when(facetStates);
        }

        this.getStates = function(facetSelections) {
            console.log(facetSelections);
            var query = ' PREFIX skos: <http://www.w3.org/2004/02/skos/core#>' +
                        ' PREFIX foaf: <http://xmlns.com/foaf/0.1/>' +
                        ' PREFIX m: <http://ldf.fi/sotasampo/narc/menehtyneet/>' +
                        ' PREFIX m_schema: <http://ldf.fi/schema/narc-menehtyneet1939-45/>' +
                        ' PREFIX sf: <http://ldf.fi/functions#>' +

                        ' SELECT ?cnt ?id ?facet_text ?value WHERE {' +
                        ' {' +
                        '   SELECT DISTINCT (count(DISTINCT ?s) as ?cnt) ?id ?value' +

                        '   WHERE {' +
                        '     VALUES ?id {' +

                        Object.keys( facets ).join(' ') +

                        '     }' +
                        '     GRAPH <http://ldf.fi/narc-menehtyneet1939-45/> {' +
//                        '       ?s a foaf:Person .' +

                        parseFacetSelections(facetSelections) +

                        '       ?s ?id ?value .' +
                        '     }' +

                        '   } GROUP BY ?id ?value' +
                        ' }' +
                        '   OPTIONAL {' +
                        '     ?value sf:preferredLanguageLiteral (skos:prefLabel "fi" "" ?lbl) .' +
                        '   }' +
                        '   BIND(COALESCE(?lbl, ?value) as ?facet_text)' +
                        ' }' +
                        ' ORDER BY ?id ?facet_text';

            var promise = SPARQL.getObjects(query);
            return promise.then(parseResults);
        }

        function parseResults( sparqlResults ) {
            facetStates = facetMapperService.makeObjectList(sparqlResults);
            return facetStates;
        }

        function parseFacetSelections( facetSelections ) {
            var result = '';
            _.forOwn( facetSelections, function( val, key ) {
                if (val) {
                    result = result + '?s ' + key + ' ' + val.value + ' .';
                }
            });
            return result;
        }
    }
});

facetApp.controller( 'FacetListCtrl', function ( $scope, Facets ) {
    var vm = this;
    
    vm.facets = {
        '<http://ldf.fi/schema/narc-menehtyneet1939-45/ammatti>': { name: 'Ammatti' },
        '<http://ldf.fi/schema/narc-menehtyneet1939-45/asuinkunta>': { name: 'Asuinkunta' },
        '<http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus>': { name: 'Kansalaisuus' },
        '<http://ldf.fi/schema/narc-menehtyneet1939-45/kuolinkunta>': { name: 'Kuolinkunta' },
        '<http://ldf.fi/schema/narc-menehtyneet1939-45/osasto>': { name: 'Joukko-osasto' },
    };

    //vm.facetStates = [];

    vm.facetHandler = new Facets('http://ldf.fi/warsa/sparql', vm.facets);

//    vm.facetHandler.getStates().then( function( states ) { vm.facetStates = states; });

    vm.getFacetName = function( uri ) {
        return vm.facets[uri];
    }

    vm.selectedFacets = {};

    $scope.$watch(function() { return vm.selectedFacets; }, function(val) {
        vm.facetHandler.getStates( val ).then( function ( states ) {
            states.forEach( function (state) { vm.facets[state.id].state = state; });
        });
    }, true)
});

facetApp.factory( 'Results', [ '$rootScope', function( $rootScope ) {
    var service = {

    }

    return service;
}]);


facetApp.controller( 'MainCtrl', function ( $scope ) {
});

