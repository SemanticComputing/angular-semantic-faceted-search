(function() {
    'use strict';

    /**
    * @ngdoc directive
    * @name seco.facetedSearch.secoBasicFacet
    * @restrict 'E'
    * @element ANY
    * @description
    * # secoBasicFacet
    * A basic select box facet with text filtering.
    *
    * @param {Object} options The configuration object with the following structure:
    * - **facetId** - `{string}` - A friendly id for the facet.
    *   Should be unique in the set of facets, and should be usable as a SPARQL variable.
    * - **predicate** - `{string}` - The predicate or property path that defines the facet values.
    * - **name** - `{string}` - The title of the facet. Will be displayed to end users.
    * - **[enabled]** `{boolean}` - Whether or not the facet is enabled by default.
    *   If undefined, the facet will be disabled by default.
    * - **[endpointUrl]** `{string}` - The URL of the SPARQL endpoint.
    *   Optional, as it can also be given globally in
    *   {@link seco.facetedSearch.FacetHandler FacetHandler} config.
    * - **[preferredLang]** - `{string}` - The language tag that is preferred
    *   when getting labels for facet values, in case the value is a resource.
    *   The default is 'en'.
    *   Currently only one language can be given.
    *   If a label is not found in the given language, a label without a
    *   language tag is used. If a label is still not found,
    *   the end part of the resource URI is used.
    *   Supported label properties are `skos:prefLabel`, and `rdfs:label`.
    */
    angular.module('seco.facetedSearch')
    .directive('secoBasicFacet', basicFacet);

    function basicFacet() {
        return {
            restrict: 'E',
            scope: {
                options: '='
            },
            controller: 'BasicFacetController',
            controllerAs: 'vm',
            templateUrl: 'src/facets/basic/facets.basic-facet.directive.html'
        };
    }
})();
