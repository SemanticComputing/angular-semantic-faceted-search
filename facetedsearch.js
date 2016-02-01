/*
 * Semantic faceted search
 *
 * TODO:
 *  - Get counts for selection clearing
 *  - LICENSE & authors
 */


'use strict';

var facetApp = angular.module('facetApp',["ngTable"]);

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
});

/*
 * Facet handler service.
 */
facetApp.factory( 'Facets', function( $rootScope, $q, SparqlService, facetMapperService, facetSelectionFormatter ) {
    return function( endpoint_url, facets, config ) {

        var facetStates = [];

        var SPARQL = new SparqlService(endpoint_url);

        this.selectFacet = function( facet, value ) {
            return $q.when(facetStates);
        };

        this.getStates = function(facetSelections) {
            var query = ' PREFIX skos: <http://www.w3.org/2004/02/skos/core#>' +
                        ' PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>' +
                        ' PREFIX sf: <http://ldf.fi/functions#>' +

                        ' SELECT ?cnt ?id ?facet_text ?value WHERE {' +
                        ' {' +
                        '   SELECT DISTINCT (count(DISTINCT ?s) as ?cnt) ?id ?value' +

                        '   WHERE {' +
                        '     VALUES ?id {' +

                        Object.keys( facets ).join(' ') +

                        '     }' +
                        (config.graph ? '     GRAPH ' + config.graph + ' { ' : '') +
                        (config.rdfClass ? ' ?s a ' + config.rdfClass + ' . ' : '') +

                        facetSelectionFormatter.parseFacetSelections(facetSelections) +

                        '       ?s ?id ?value .' +
                        (config.graph ? ' } ' : '') +
                        '   } GROUP BY ?id ?value' +
                        ' }' +
                        '   OPTIONAL {' +
                        '     ?value sf:preferredLanguageLiteral (skos:prefLabel "' + (config.preferredLang ? config.preferredLang : 'fi') + '" "" ?lbl) .' +
                        '   }' +
                        '   BIND(COALESCE(?lbl, ?value) as ?facet_text)' +
                        ' }' +
                        ' ORDER BY ?id ?facet_text';

            var promise = SPARQL.getObjects(query);
            return promise.then(parseResults);
        };

        function parseResults( sparqlResults ) {
            facetStates = facetMapperService.makeObjectList(sparqlResults);
            return facetStates;
        }
    };
});


/*
 * Facet selector directive.
 */
facetApp.directive('facetSelector', function() {
    return {
        restrict: 'E',
        scope: {
            endpointUrl: '=',
            facets: '=',
            updateResults: '=',
            options: '='
        },
        controller: FacetListCtrl,
        controllerAs: 'vm',
        templateUrl: 'facet.directive.html'
    };

    /*
     * Controller for the facet selector directive.
     */
    function FacetListCtrl ( $scope, Facets ) {
        var vm = this;

        vm.facets = $scope.facets;
        vm.selectedFacets = {};

        vm.facetHandler = new Facets($scope.endpointUrl, vm.facets, $scope.options);

        vm.getFacetSize = function( facetStates ) {
            if (facetStates) {
                return Math.min(facetStates.length + 2, 10).toString();
            }
            return '10';
        };

        $scope.$watch(function() { return vm.selectedFacets; }, function(val) {
            vm.facetHandler.getStates( val ).then( function ( states ) {
                _.forOwn(vm.facets, function (facet, key) {
                    facet.state = _.find(states, ['id', key]);
                });
            });

            $scope.updateResults(vm.selectedFacets);
        }, true);
    }
});


/*
 * Result handler service.
 */
facetApp.factory( 'Results', function( $rootScope, $q, SparqlService,
            objectMapperService, facetSelectionFormatter ) {
    return function( endpointUrl, properties ) {

        var endpoint = new SparqlService(endpointUrl);

        this.getResults = function(facetSelections) {
            console.log(facetSelections);
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

                ' SELECT ?s ?name ' +
                Object.keys( properties ).join(' ') +

                ' WHERE {' +
                ' GRAPH <http://ldf.fi/narc-menehtyneet1939-45/> {' +
                ' ?s a foaf:Person .' +
                ' ?s skos:prefLabel ?name .' +

//                ' %emptyValue(NAME_STR) ? "" : "FILTER REGEX(?nimi, \"" + NAME_STR + "\", \"i\")"%' +
//                ' %emptyValue(MARITALSTATUS) ? "" : "?s m_schema:siviilisaeaety <"+ MARITALSTATUS +"> ."%' +
//                ' %emptyValue(GENDER) ? "" : "?s m_schema:sukupuoli <"+ GENDER +"> ."%' +
//                ' %emptyValue(CHILDREN) ? "" : "?s m_schema:lasten_lukumaeaerae "+ CHILDREN +" ."%' +
//                ' %emptyValue(NATIONALITY) ? "" : "?s m_schema:kansalaisuus <"+ NATIONALITY +"> ."%' +
//                ' %emptyValue(RANK) ? "" : "?s m_schema:sotilasarvo <"+ RANK +"> ."%' +
//                ' %emptyValue(UNIT) ? "" : "?s m_schema:osasto <"+ UNIT +"> ."%' +
//                ' %(emptyValue(NATIONALITY) && emptyValue(CHILDREN) && emptyValue(GENDER) && emptyValue(MARITALSTATUS) && emptyValue(RANK) && emptyValue(UNIT) && emptyValue(NAME_STR)) ? "FILTER(STRSTARTS(?nimi, \"AA\"))" : ""%' +

                facetSelectionFormatter.parseFacetSelections(facetSelections) +

//                ' ?s m_schema:lasten_lukumaeaerae 5 .' +

//                ' OPTIONAL {' +
//                ' ?s m_schema:siviilisaeaety ?siviilisaeaetyuri .' +
//                ' ?siviilisaeaetyuri skos:prefLabel ?siviilisaeaety . }' +
//                ' OPTIONAL { ?s m_schema:sukupuoli ?sukupuoliuri .' +
//                ' ?sukupuoliuri skos:prefLabel ?sukupuoli . }' +
//                ' OPTIONAL { ?s m_schema:lasten_lukumaeaerae ?lasten_lukumaeaerae . }' +
//                ' OPTIONAL { ?s m_schema:kansalaisuus ?kansalaisuusuri .' +
//                ' ?kansalaisuusuri skos:prefLabel ?kansalaisuus . }' +
//                ' OPTIONAL { ?s m_schema:aeidinkieli ?aeidinkieliuri .' +
//                ' ?aeidinkieliuri skos:prefLabel ?aeidinkieli . }' +
//                ' OPTIONAL { ?s m_schema:menehtymisluokka ?menehtymisluokkauri .' +
//                ' ?menehtymisluokkauri skos:prefLabel ?menehtymisluokka  . }' +
//                ' OPTIONAL { ?s m_schema:kuolinkunta ?kuolinkunta_uri .' +
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
//                ' OPTIONAL { ?s m_schema:kuolinaika ?kuolinaika .' +
//
//                ' BIND(CONCAT("<a href=\"http://www.sotasampo.fi/times/page?uri=http://ldf.fi/warsa/events/times/time_",STR(?kuolinaika),"-",STR(?kuolinaika),"\">",STR(?kuolinaika),"</a>") AS ?kuolinpaiva) .' +
//                ' }' +
//                ' OPTIONAL { ?s m_schema:ammatti ?occupation . }' +
//                ' OPTIONAL { ?s m_schema:kuolinpaikka ?kuolinpaikka . }' +
//                ' OPTIONAL { ?s m_schema:sotilasarvo ?arvouri .' +
//                ' GRAPH <http://ldf.fi/warsa/actors/actor_types> {' +
//                ' ?arvouri skos:prefLabel ?sotilasarvo  .' +
//                ' }' +
//                ' }' +
//                ' OPTIONAL { ?s m_schema:osasto ?osastouri .' +
//                ' GRAPH <http://ldf.fi/warsa/actors> {' +
//                ' ?osastouri skos:prefLabel ?osasto  .' +
//                ' BIND(CONCAT("<a href=\"http://www.sotasampo.fi/page?uri=",STR(?osastouri),"\">",?osasto,"</a>") AS ?joukkoosastoHTML) .' +
//                ' }' +
//                ' }' +
//
                ' }' +
//                ' BIND(COALESCE(?kuolinkunta_warsa, ?kuolinkunta_narc) as ?kuolinkunta)' +
                ' }' +
                ' GROUP BY ?s ?name ' +
                Object.keys( properties ).join(' ') +

                ' ORDER BY ?name';

            var promise = endpoint.getObjects(query);
            return promise.then(parseResults);

            function parseResults( sparqlResults ) {
                return objectMapperService.makeObjectListNoGrouping(sparqlResults);
            }

        };
    };
});

/*
 * Controller for the results view.
 */
facetApp.controller( 'MainCtrl', function ( $scope, Results, NgTableParams ) {
    var vm = this;

    vm.facets = {
        '<http://ldf.fi/schema/narc-menehtyneet1939-45/ammatti>': { name: 'Ammatti' },
        '<http://ldf.fi/schema/narc-menehtyneet1939-45/asuinkunta>': { name: 'Asuinkunta' },
        '<http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus>': { name: 'Kansalaisuus' },
        '<http://ldf.fi/schema/narc-menehtyneet1939-45/kuolinkunta>': { name: 'Kuolinkunta' },
        '<http://ldf.fi/schema/narc-menehtyneet1939-45/kuolinaika>': { name: 'Kuolinaika' },
        '<http://ldf.fi/schema/narc-menehtyneet1939-45/osasto>': { name: 'Joukko-osasto' },
        '<http://ldf.fi/schema/narc-menehtyneet1939-45/sukupuoli>': { name: 'Sukupuoli' },
        '<http://ldf.fi/schema/narc-menehtyneet1939-45/siviilisaeaety>': { name: 'Siviilisääty' }
    };

    vm.properties = {
        '?occupation': '<http://ldf.fi/schema/narc-menehtyneet1939-45/ammatti>'
    };

    vm.endpoint_url = 'http://ldf.fi/warsa/sparql';

    vm.facetOptions = {
        graph : '<http://ldf.fi/narc-menehtyneet1939-45/>',
        preferredLang : 'fi'
    };

    vm.resultHandler = new Results('http://ldf.fi/warsa/sparql', vm.properties);

    vm.updateResults = function ( facetSelections ) {
        var numResults = null;
        _.forOwn( facetSelections, function( val ) {
            if (val && (numResults===null || val.count < numResults)) {
                numResults = val.count;
            }
        });
        console.log(numResults);
        if (numResults && numResults <= 25000) {
            vm.resultHandler.getResults( facetSelections ).then( function ( res ) {
//                console.log(facetSelections);
                vm.tableParams = new NgTableParams({}, { dataset: res, count: 50 });
            });
        }
    };
});

facetApp.service('facetSelectionFormatter', function () {
    this.parseFacetSelections = function ( facetSelections ) {
        var result = '';
        _.forOwn( facetSelections, function( val, key ) {
            if (val) {
                result = result + '?s ' + key + ' ' + val.value + ' .';
            }
        });
        return result;
    };
});
