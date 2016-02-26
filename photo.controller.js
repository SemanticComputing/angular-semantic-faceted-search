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
    .controller( 'PhotoController', PhotoController )
    .controller( 'PhotoModalController', PhotoModalController )

    /* @ngInject */
    function PhotoController( $uibModal, _, RESULTS_PER_PAGE, photoService, urlStateHandlerService ) {
        var vm = this;

        vm.facets = photoService.getFacets();
        vm.facetOptions = getFacetOptions();

        vm.disableFacets = disableFacets;
        vm.isScrollDisabled = isScrollDisabled;

        vm.nextPage = nextPage;
        vm.openModal = openModal;

        vm.photos = [];

        var nextPageNo;
        var maxPage;

        function openModal(photo) {
            $uibModal.open({
                templateUrl: 'photo.modal.html',
                controller: 'PhotoModalController',
                controllerAs: 'vm',
                size: 'lg',
                resolve: {
                    photo: function() { return photo; }
                }
            });
        }

        function getFacetOptions() {
            var options = photoService.getFacetOptions();
            options.updateResults = updateResults;
            options.initialValues = urlStateHandlerService.getFacetValuesFromUrlParams();
            return options;
        }

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
            urlStateHandlerService.updateUrlParams(facetSelections);
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

    /* @ngInject */
    function PhotoModalController(photo) {
        var vm = this;
        vm.photo = photo;
    }
})();
