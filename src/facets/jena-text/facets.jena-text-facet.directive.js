(function() {
    'use strict';

    /**
    * @ngdoc directive
    * @name seco.facetedSearch.directive:secoJenaTextFacet
    * @restrict 'E'
    * @element ANY
    * @description
    * A free-text search facet using Jena text search.
    *
    * Does not make any SPARQL queries, just generates SPARQL triple patterns
    * out of the typed text for other facets to use.
    *
    * @param {Object} options The configuration object with the following structure:
    * - **facetId** - `{string}` - A friendly id for the facet.
    *   Should be unique in the set of facets, and should be usable as a SPARQL variable.
    * - **name** - `{string}` - The title of the facet. Will be displayed to end users.
    * - **[predicate]** - `{string}` - The predicate to use in the search.
    * - **[enabled]** `{boolean}` - Whether or not the facet is enabled by default.
    *   If undefined, the facet will be disabled by default.
    * - **[priority]** - `{number}` - Priority for constraint sorting.
    *   Default is 10.
    *
    */
    angular.module('seco.facetedSearch')
    .directive('secoJenaTextFacet', jenaTextFacet);

    function jenaTextFacet() {
        return {
            restrict: 'E',
            scope: {
                options: '='
            },
            controller: 'JenaTextFacetController',
            controllerAs: 'vm',
            templateUrl: 'src/facets/text/facets.text-facet.directive.html'
        };
    }
})();
