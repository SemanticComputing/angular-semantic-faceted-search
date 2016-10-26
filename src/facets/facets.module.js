/*
 * facets module definition
 */
(function() {
    'use strict';

    /**
     * @ngdoc overview
     * @name index
     * @description
     # SPARQL Faceter -- Faceted Search Based on SPARQL
     *
     * The module provides a set of directives that work as facets,
     * and a service that synchronizes them.
     *
     * There are four different built-in facet types:
     *
     * - {@link seco.facetedSearch.BasicFacet} - A basic select box facet with text filtering
     * - {@link seco.facetedSearch.HierarchyFacet} - A basic facet with hierarchy support.
     * - {@link seco.facetedSearch.TextFacet} - A free-text facet.
     * - {@link seco.facetedSearch.TimespanFacet} - Date range facet.
     *
     * Custom facets can be implemented reasonably easily.
     *
     ## How it works
     * Facets are implemented as a directives.
     * Each facet listens on its scope for changes in other facets,
     * and emits its state when its value changes.
     * The facets are responsible for maintaining their own state.
     *
     * {@link seco.facetedSearch.FacetHandler} mediates the facet changes
     * by listening to the facets' change events, and broadcasting the resulting
     * constraints to all facets in the scope.
     *
     * The facets are configured using the `options` attribute of the directive.
     * Configuration options that are common to all facets are:
     *
     * - **facetId** - `{string}` - A friendly id for the facet. Should be unique in the set of facets,
     *                              and should be usable as a SPARQL variable.
     * - **predicate** - `{string}` - The predicate or property path that defines the facet values.
     * - **name** - `{string}` - The title of the facet. Will be displayed to end users.
     * - **enabled** `{boolean}` - Whether or not the facet is enabled by default.
     *
     * For other options, see the facets' individual documentation.
     *
     * @example
     * <pre>
     * // Define facets
     * vm.facets = {
     *     // Text facet
     *     name: {
     *         name: 'Name',
     *         facetId: 'name',
     *         predicate: '<http://www.w3.org/2004/02/skos/core#prefLabel>',
     *         enabled: true
     *     },
     *     // Date facet
     *     deathDate: {
     *         name: 'Time of Death',
     *         facetId: 'death',
     *         startPredicate: '<http://ldf.fi/schema/narc-menehtyneet1939-45/kuolinaika>',
     *         endPredicate: '<http://ldf.fi/schema/narc-menehtyneet1939-45/kuolinaika>',
     *         min: '1939-10-01',
     *         max: '1989-12-31',
     *         enabled: true
     *     },
     *     // Basic facet
     *     profession: {
     *         name: 'Ammatti',
     *         facetId: 'occupation',
     *         predicate: '<http://ldf.fi/schema/narc-menehtyneet1939-45/ammatti>',
     *         enabled: true
     *     },
     *     // Basic facet with property path
     *     source: {
     *         name: 'Source',
     *         facetId: 'source',
     *         predicate: '^<http://www.cidoc-crm.org/cidoc-crm/P70i_is_documented_in>/<http://purl.org/dc/elements/1.1/source>',
     *         enabled: true
     *     },
     *     // Basic facet with labels in another service.
     *     birthMunicipality: {
     *         name: 'Birth Municipality',
     *         services: ['<http://ldf.fi/pnr/sparql>'],
     *         facetId: 'birthplace',
     *         predicate: '<http://ldf.fi/schema/narc-menehtyneet1939-45/synnyinkunta>',
     *         enabled: false
     *     },
     *     // Hierarchical facet
     *     rank: {
     *         name: 'Rank',
     *         facetId: 'rank',
     *         predicate: '<http://ldf.fi/schema/narc-menehtyneet1939-45/sotilasarvo>',
     *         hierarchy: '<http://purl.org/dc/terms/isPartOf>*|(<http://rdf.muninn-project.org/ontologies/organization#equalTo>/<http://purl.org/dc/terms/isPartOf>*)',
     *         enabled: true,
     *         classes: [
     *             '<http://ldf.fi/warsa/actors/ranks/Upseeri>',
     *             '<http://ldf.fi/warsa/actors/ranks/Aliupseeri>',
     *             '<http://ldf.fi/warsa/actors/ranks/Miehistoe>',
     *             '<http://ldf.fi/warsa/actors/ranks/Jaeaekaeriarvo>',
     *             '<http://ldf.fi/warsa/actors/ranks/Virkahenkiloestoe>',
     *             '<http://ldf.fi/warsa/actors/ranks/Lottahenkiloestoe>',
     *             '<http://ldf.fi/warsa/actors/ranks/Muu>'
     *         ]
     *     }
     * };
     *
     * // Define common options
     * vm.options = {
     *     endpointUrl: 'http://ldf.fi/warsa/sparql',
     *     rdfClass: '<http://ldf.fi/schema/narc-menehtyneet1939-45/DeathRecord>',
     *     constraint: '?id skos:prefLabel ?name .',
     *     preferredLang : 'fi'
     * };
     *
     * // Define a function that handles updates.
     * // 'dataService' is some service that fetches results based on the facet selections.
     * function updateResults(event, facetState) {
     *     dataService.getResults(facetState.constraints).then(function(results) {
     *         vm.results = results;
     *     }
     * }
     *
     * // Listen for the update event
     * $scope.$on('sf-facet-constraints', updateResults);
     *
     * // Listen for initial state
     * var initListener = $scope.$on('sf-initial-constraints', function(event, state) {
     *     updateResults(event, state);
     *     // Only listen once for the init event
     *     initListener();
     * });
     *
     * // Initialize the facet handler:
     * vm.handler = new FacetHandler(vm.options);
     * </pre>
     *
     * Setup the facets in the template:
     *
     * <pre>
     * <seco-text-facet
     *   data-options="vm.facets.name">
     * </seco-text-facet>
     * <seco-timespan-facet
     *   data-options="vm.facets.deathDate">
     * </seco-timespan-facet>
     * <seco-basic-facet
     *   data-options="vm.facets.source">
     * </seco-basic-facet>
     * <seco-basic-facet
     *   data-options="vm.facets.profession">
     * </seco-basic-facet>
     * <seco-basic-facet
     *   data-options="vm.facets.birthMunicipality">
     * </seco-basic-facet>
     * <seco-basic-facet
     *   data-options="vm.facets.principalAbode">
     * </seco-basic-facet>
     * <seco-hierarchy-facet
     *   data-options="vm.facets.rank">
     * </seco-hierarchy-facet>
     * </pre>
     */
    angular.module('seco.facetedSearch', ['sparql', 'ui.bootstrap', 'angularSpinner'])
    .constant('_', _) // eslint-disable-line no-undef
    .constant('EVENT_REQUEST_CONSTRAINTS', 'sf-request-constraints')
    .constant('EVENT_INITIAL_CONSTRAINTS', 'sf-initial-constraints')
    .constant('EVENT_FACET_CHANGED', 'sf-facet-changed')
    .constant('EVENT_FACET_CONSTRAINTS', 'sf-facet-constraints')
    .constant('NO_SELECTION_STRING', '-- No Selection --');
})();

