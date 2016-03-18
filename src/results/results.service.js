(function() {
    'use strict';

    angular.module('seco.facetedSearch')
    .constant('DEFAULT_PAGES_PER_QUERY', 1)
    .constant('DEFAULT_RESULTS_PER_PAGE', 10)

    /*
    * Result handler service.
    */
    .factory('FacetResultHandler', FacetResultHandler);

    /* @ngInject */
    function FacetResultHandler(DEFAULT_PAGES_PER_QUERY, DEFAULT_RESULTS_PER_PAGE,
            AdvancedSparqlService, facetSelectionFormatter, objectMapperService ) {

        return ResultHandler;

        function ResultHandler(endpointUrl, facets, mapper, resultsPerPage, pagesPerQuery) {
            mapper = mapper || objectMapperService;
            resultsPerPage = resultsPerPage || DEFAULT_RESULTS_PER_PAGE;
            pagesPerQuery = pagesPerQuery || DEFAULT_PAGES_PER_QUERY;

            var endpoint = new AdvancedSparqlService(endpointUrl, mapper);

            this.getResults = getResults;

            function getResults(facetSelections, query, resultSetQry) {
                query = query.replace('<FACET_SELECTIONS>',
                        facetSelectionFormatter.parseFacetSelections(facets, facetSelections));
                return endpoint.getObjects(query,
                    resultsPerPage,
                    resultSetQry.replace('<FACET_SELECTIONS>', facetSelectionFormatter.parseFacetSelections(facets, facetSelections)),
                    pagesPerQuery);
            }
        }
    }
})();
