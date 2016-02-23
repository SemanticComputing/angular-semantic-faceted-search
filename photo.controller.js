/*
 * Semantic faceted search
 *
 */

(function() {

    'use strict';

    /* eslint-disable angular/no-service-method */
    angular.module('facetApp')

    /*
    * Controller for the results view.
    */
    .controller( 'PhotoController', PhotoController );

    /* @ngInject */
    function PhotoController( _, RESULTS_PER_PAGE, photoService ) {
        var vm = this;

        vm.facets = photoService.getFacets();
        vm.facetOptions = photoService.getFacetOptions();
        vm.facetOptions.updateResults = updateResults;

        vm.disableFacets = disableFacets;
        vm.isScrollDisabled = isScrollDisabled;

        vm.nextPage = nextPage;

        vm.photos = [];

        var nextPageNo;
        var maxPage;

        function disableFacets() {
            return vm.isLoadingResults;
        }

        function nextPage() {
            vm.isLoadingResults = true;
            if (nextPageNo <= maxPage) {
                vm.pager.getPage(nextPageNo++)
                .then(function(page) {
                    vm.photos = vm.photos.concat(page);
                    vm.isLoadingResults = false;
                });
            } else {
                vm.isLoadingResults = false;
            }
        }

        function isScrollDisabled() {
            return vm.isLoadingResults || nextPageNo > maxPage;
        }

        function updateResults( facetSelections ) {
            vm.isLoadingResults = true;
            vm.photos = [];
            nextPageNo = 0;

            photoService.getResults( facetSelections )
            .then( function ( pager ) {
                vm.pager = pager;
                return vm.pager.getMaxPageNo();
            }).then( function(no) {
                maxPage = no;
                vm.isLoadingResults = false;
                return nextPage();
            });
        }
    }
})();
