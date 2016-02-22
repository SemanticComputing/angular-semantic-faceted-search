(function() {

    'use strict';

    angular.module('resultHandler', ['sparql'])

    /*
    * Result handler service.
    */
    .factory('Results', Results);

    /* @ngInject */
    function Results( RESULTS_PER_PAGE, PAGES_PER_QUERY, AdvancedSparqlService,
                personMapperService, FacetSelectionFormatter ) {
        return function( endpointUrl, facets ) {

            var formatter = new FacetSelectionFormatter(facets);
            var endpoint = new AdvancedSparqlService(endpointUrl, personMapperService);

            this.getResults = getResults;

            function getResults(facetSelections, query, resultSetQry) {
                return endpoint.getObjects(
                    query.replace('<FACET_SELECTIONS>', formatter.parseFacetSelections(facetSelections)),
                    RESULTS_PER_PAGE,
                    resultSetQry.replace('<FACET_SELECTIONS>', formatter.parseFacetSelections(facetSelections)),
                    PAGES_PER_QUERY);
            }
        };
    }
})();
