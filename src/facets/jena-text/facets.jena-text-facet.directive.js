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
    * This facet can only be used if the SPARQL endpoint supports
    * [Jena text query](https://jena.apache.org/documentation/query/text-query.html).
    *
    * The produced constraint looks like this:
    * <pre>
    * (?id ?score) <http://jena.apache.org/text#query> (predicate "search terms" limit) .
    * </pre>
    * where `predicate`, and `limit` are based on the configuration options
    * (and left out if they are undefined).
    *
    * If the `graph` option is defined, the constraint is wrapped accordingly:
    * <pre>
    * GRAPH graph {
    *   (?id ?score) <http://jena.apache.org/text#query> (predicate "search terms" limit) .
    * }
    * </pre>
    *
    * Does not make any SPARQL queries, just generates SPARQL triple patterns
    * out of the typed text for other facets to use.
    *
    * @param {Object} options The configuration object with the following structure:
    * - **facetId** - `{string}` - A friendly id for the facet.
    *   Should be unique in the set of facets, and should be usable as a SPARQL variable.
    * - **name** - `{string}` - The title of the facet. Will be displayed to end users.
    * - **[enabled]** `{boolean}` - Whether or not the facet is enabled by default.
    *   If undefined, the facet will be disabled by default.
    * - **[predicate]** - `{string}` - The property to use in the search.
    *   See [Jena text query documentation](https://jena.apache.org/documentation/query/text-query.html#query-with-sparql).
    * - **[priority]** - `{number}` - Priority for constraint sorting. Default is 0.
    * - **[limit]** - `{number}` - Limit for the text search results.
    *   See [Jena text query documentation](https://jena.apache.org/documentation/query/text-query.html#query-with-sparql).
    * - **[graph]** - `{string}` - The URI of the graph to use for the text search.
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
