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

/*
 * Facet handler service.
 */
facetApp.factory( 'Facets', function( $rootScope, $q, SparqlService, facetMapperService ) {
    return function( endpoint_url, facets ) {

        var facetStates = [];

        var SPARQL = new SparqlService(endpoint_url);

        this.selectFacet = function( facet, value ) {
            // TODO: Update facetStates
            return $q.when(facetStates);
        }

        this.getStates = function(facetSelections) {
            var query = ' PREFIX skos: <http://www.w3.org/2004/02/skos/core#>' +
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

/*
 * Controller for the facet selector view.
 */
facetApp.controller( 'FacetListCtrl', function ( $scope, Facets ) {
    var vm = this;

    vm.facets = $scope.facets;

    vm.facetHandler = new Facets($scope.endpointUrl, $scope.facets);

    vm.getFacetSize = function( facetStates ) {
        if (facetStates) {
            return Math.min(facetStates.length + 2, 10).toString();
        }
        return '10';
    }

    vm.selectedFacets = {};

    $scope.$watch(function() { return vm.selectedFacets; }, function(val) {
        vm.facetHandler.getStates( val ).then( function ( states ) {
            states.forEach( function (state) { vm.facets[state.id].state = state; });
        });
    }, true)
});

facetApp.directive('facetSelector', function() {
    return {
        restrict: 'E',
        scope: {
            endpointUrl: '=',
            facets: '='
        },
        controller: 'FacetListCtrl',
        controllerAs: 'vm',
        templateUrl: 'facet.directive.html'
    };
});



/*
 * Result handler service.
 */
facetApp.factory( 'Results', function( $rootScope, $q, SparqlService, facetMapperService ) {
    return function( endpoint_url, properties ) {

        var SPARQL = new SparqlService(endpoint_url);

        this.getResults = function(facetSelections) {
            var query =
                ' PREFIX skos: <http://www.w3.org/2004/02/skos/core#>' +
                ' PREFIX wgs84: <http://www.w3.org/2003/01/geo/wgs84_pos#>' +
                ' PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>' +
                ' PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>' +
                ' PREFIX foaf: <http://xmlns.com/foaf/0.1/>' +
                ' PREFIX owl:  <http://www.w3.org/2002/07/owl#>' +
                ' PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>' +
                ' PREFIX georss: <http://www.georss.org/georss/>' +
                ' PREFIX text: <http://jena.apache.org/text#>' +
                ' PREFIX m: <http://ldf.fi/sotasampo/narc/menehtyneet/>' +
                ' PREFIX m_schema: <http://ldf.fi/schema/narc-menehtyneet1939-45/>' +

                ' SELECT ?uri ?name ' +
                Object.values( properties ).join(' ') +

                ' WHERE {' +
                ' GRAPH <http://ldf.fi/narc-menehtyneet1939-45/> {' +
                ' ?uri a foaf:Person .' +
                ' ?uri skos:prefLabel ?name .' +

//                ' %emptyValue(NAME_STR) ? "" : "FILTER REGEX(?nimi, \"" + NAME_STR + "\", \"i\")"%' +
//                ' %emptyValue(MARITALSTATUS) ? "" : "?uri m_schema:siviilisaeaety <"+ MARITALSTATUS +"> ."%' +
//                ' %emptyValue(GENDER) ? "" : "?uri m_schema:sukupuoli <"+ GENDER +"> ."%' +
//                ' %emptyValue(CHILDREN) ? "" : "?uri m_schema:lasten_lukumaeaerae "+ CHILDREN +" ."%' +
//                ' %emptyValue(NATIONALITY) ? "" : "?uri m_schema:kansalaisuus <"+ NATIONALITY +"> ."%' +
//                ' %emptyValue(RANK) ? "" : "?uri m_schema:sotilasarvo <"+ RANK +"> ."%' +
//                ' %emptyValue(UNIT) ? "" : "?uri m_schema:osasto <"+ UNIT +"> ."%' +
//                ' %(emptyValue(NATIONALITY) && emptyValue(CHILDREN) && emptyValue(GENDER) && emptyValue(MARITALSTATUS) && emptyValue(RANK) && emptyValue(UNIT) && emptyValue(NAME_STR)) ? "FILTER(STRSTARTS(?nimi, \"AA\"))" : ""%' +

                ' ?uri m_schema:lasten_lukumaeaerae 5 .'

//                ' OPTIONAL {' +
//                ' ?uri m_schema:siviilisaeaety ?siviilisaeaetyuri .' +
//                ' ?siviilisaeaetyuri skos:prefLabel ?siviilisaeaety . }' +
//                ' OPTIONAL { ?uri m_schema:sukupuoli ?sukupuoliuri .' +
//                ' ?sukupuoliuri skos:prefLabel ?sukupuoli . }' +
//                ' OPTIONAL { ?uri m_schema:lasten_lukumaeaerae ?lasten_lukumaeaerae . }' +
//                ' OPTIONAL { ?uri m_schema:kansalaisuus ?kansalaisuusuri .' +
//                ' ?kansalaisuusuri skos:prefLabel ?kansalaisuus . }' +
//                ' OPTIONAL { ?uri m_schema:aeidinkieli ?aeidinkieliuri .' +
//                ' ?aeidinkieliuri skos:prefLabel ?aeidinkieli . }' +
//                ' OPTIONAL { ?uri m_schema:menehtymisluokka ?menehtymisluokkauri .' +
//                ' ?menehtymisluokkauri skos:prefLabel ?menehtymisluokka  . }' +
//                ' OPTIONAL { ?uri m_schema:kuolinkunta ?kuolinkunta_uri .' +
//                ' OPTIONAL {' +
//                ' 	GRAPH <http://ldf.fi/warsa/places/municipalities> {' +
//                ' 		?kuolinkunta_uri skos:prefLabel ?kuolinkunta_warsa .' +
//                ' 		# OPTIONAL {' +
//                ' 		# 	?kuolinkunta_uri wgs84:lat ?kuolinkunta_lat .' +
//                ' 		# 	?kuolinkunta_uri wgs84:long ?kuolinkunta_long .' +
//                ' 		# }' +
//                ' 	}' +
//                ' } OPTIONAL {' +
//                ' 	?kuolinkunta_uri skos:prefLabel ?kuolinkunta_narc .' +
//                ' 	# OPTIONAL {	?kuolinkunta_uri georss:point ?kuolinkunta_point . }' +
//                ' }' +
//                ' }' +
//                ' OPTIONAL { ?uri m_schema:kuolinaika ?kuolinaika .' +
//
//                ' BIND(CONCAT("<a href=\"http://www.sotasampo.fi/times/page?uri=http://ldf.fi/warsa/events/times/time_",STR(?kuolinaika),"-",STR(?kuolinaika),"\">",STR(?kuolinaika),"</a>") AS ?kuolinpaiva) .' +
//                ' }' +
                ' OPTIONAL { ?uri m_schema:ammatti ?ammatti . }' +
//                ' OPTIONAL { ?uri m_schema:kuolinpaikka ?kuolinpaikka . }' +
//                ' OPTIONAL { ?uri m_schema:sotilasarvo ?arvouri .' +
//                ' GRAPH <http://ldf.fi/warsa/actors/actor_types> {' +
//                ' ?arvouri skos:prefLabel ?sotilasarvo  .' +
//                ' }' +
//                ' }' +
//                ' OPTIONAL { ?uri m_schema:osasto ?osastouri .' +
//                ' GRAPH <http://ldf.fi/warsa/actors> {' +
//                ' ?osastouri skos:prefLabel ?osasto  .' +
//                ' BIND(CONCAT("<a href=\"http://www.sotasampo.fi/page?uri=",STR(?osastouri),"\">",?osasto,"</a>") AS ?joukkoosastoHTML) .' +
//                ' }' +
//                ' }' +
//
                ' }' +
//                ' BIND(COALESCE(?kuolinkunta_warsa, ?kuolinkunta_narc) as ?kuolinkunta)' +
                ' }' +
                ' GROUP BY ?uri ?nimi ?aeidinkieli ?lasten_lukumaeaerae ?kansalaisuus ?menehtymisluokka ?kuolinaika ?kuolinkunta ?point ?kuolinpaikka ?sukupuoli ?siviilisaeaety ?ammatti ?aeidinkieliuri ?lasten_lukumaeaeraeuri ?kansalaisuusuri ?siviilisaeaetyuri ?menehtymisluokkauri ?sukupuoliuri ?kuolinpaiva ?sotilasarvo ?arvouri' +
                ' ORDER BY ?nimi';

            var promise = SPARQL.getObjects(query);
            return promise;
        };
    };
});

/*
 * Controller for the results view.
 */
facetApp.controller( 'MainCtrl', function ( $scope, Results ) {
    var vm = this;

    vm.facets = {
        '<http://ldf.fi/schema/narc-menehtyneet1939-45/ammatti>': { name: 'Ammatti' },
        '<http://ldf.fi/schema/narc-menehtyneet1939-45/asuinkunta>': { name: 'Asuinkunta' },
        '<http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus>': { name: 'Kansalaisuus' },
        '<http://ldf.fi/schema/narc-menehtyneet1939-45/kuolinkunta>': { name: 'Kuolinkunta' },
        '<http://ldf.fi/schema/narc-menehtyneet1939-45/osasto>': { name: 'Joukko-osasto' },
    };

    vm.properties = {
        '<http://ldf.fi/schema/narc-menehtyneet1939-45/ammatti>': { name: 'ammatti' },
    };

    vm.endpoint_url = 'http://ldf.fi/warsa/sparql';

    vm.FacetClass = '<http://xmlns.com/foaf/0.1/Person>';

    vm.facetHandler = new Results('http://ldf.fi/warsa/sparql', vm.properties);

});

