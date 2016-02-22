(function() {

    'use strict';

    angular.module('resultHandler', ['sparql'])

    /*
    * Result handler service.
    */
    .factory('Results', Results);

    /* @ngInject */
    function Results( RESULTS_PER_PAGE, PAGES_PER_QUERY, AdvancedSparqlService,
                FacetSelectionFormatter, objectMapperService ) {
        return function( endpointUrl, facets, mapper ) {
            mapper = mapper || objectMapperService;

            var formatter = new FacetSelectionFormatter(facets);
            var endpoint = new AdvancedSparqlService(endpointUrl, mapper);

            this.getResults = getResults;

            function getResults(facetSelections, query, resultSetQry) {
                query = query.replace('<FACET_SELECTIONS>',
                        formatter.parseFacetSelections(facetSelections));
                return endpoint.getObjects(query,
                    RESULTS_PER_PAGE,
                    resultSetQry.replace('<FACET_SELECTIONS>', formatter.parseFacetSelections(facetSelections)),
                    PAGES_PER_QUERY);
            }
        };
    }
})();
