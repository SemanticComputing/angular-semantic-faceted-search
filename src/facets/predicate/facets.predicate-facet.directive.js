(function() {
    'use strict';

    /**
    * @ngdoc directive
    * @name seco.facetedSearch.directive:secoPredicateFacetFacet
    * @restrict 'E'
    * @element ANY
    * @description
    * A facet for selecting resources based on the existence of triples.
    *
    * @param {Object} options The configuration object with the following structure:
    * - **facetId** - `{string}` - A friendly id for the facet.
    *   Should be unique in the set of facets, and should be usable as a SPARQL variable.
    * - **name** - `{string}` - The title of the facet. Will be displayed to end users.
    * - **predicates** - `{Array}` - A list of predicates to use. Each element in the list
    *   should be an object: `{ predicate: '<predicate_uri>', label: 'predicate label' }`.
    * - **[enabled]** `{boolean}` - Whether or not the facet is enabled by default.
    *   If undefined, the facet will be disabled by default.
    * - **[priority]** - `{number}` - Priority for constraint sorting.
    *   Undefined by default.
    */
    angular.module('seco.facetedSearch')
    .directive('secoPredicateFacet', predicateFacet);

    function predicateFacet() {
        return {
            restrict: 'E',
            scope: {
                options: '='
            },
            controller: 'PredicateFacetController',
            controllerAs: 'vm',
            templateUrl: 'src/facets/predicate/facets.predicate-facet.directive.html'
        };
    }
})();
