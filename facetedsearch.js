/*
 * Semantic faceted search
 *
 * TODO:
 *  - Get counts for selection clearing
 *  - LICENSE & authors
 */

(function() {

    'use strict';

    /* eslint-disable angular/no-service-method */
    angular.module('facetApp', ['sparql', 'facets', 'ngTable'])

    .constant('_', _) // eslint-disable-line no-undef

    /*
    * Result handler service.
    */
    .factory( 'Results', function( $rootScope, $q, SparqlService,
                objectMapperService, facetSelectionFormatter ) {
        return function( endpointUrl, properties ) {

            var endpoint = new SparqlService(endpointUrl);

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

                return endpoint.getObjects(query).then(parseResults);

                function parseResults( sparqlResults ) {
                    return objectMapperService.makeObjectListNoGrouping(sparqlResults);
                }

            };
        };
    })

    /*
    * Controller for the results view.
    */
    .controller( 'MainController', function ( $scope, _, Results, NgTableParams ) {
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
            if (numResults && numResults <= 25000) {
                vm.resultHandler.getResults( facetSelections ).then( function ( res ) {
                    vm.tableParams = new NgTableParams({}, { dataset: res, count: 50 });
                });
            }
        };
    })

    .service('facetSelectionFormatter', function (_) {
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
})();
