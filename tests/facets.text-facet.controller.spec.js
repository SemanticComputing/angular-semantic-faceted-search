/* eslint-env jasmine */
/* global inject, module  */
describe('TextFacetController', function() {
    beforeEach(module('seco.facetedSearch'));

    var $controller, $rootScope, $scope, mock, constraints, controller;

    beforeEach(module(function($provide) {
        mock = {
            getSelectedValue: function() { return 'text'; },
            getConstraint: function() { return 'constraint'; },
            facetId: 'textId',
            clear: function() { },
            enable: function() { },
            disable: function() { },
            isEnabled: function() { return true; }
        };
        var mockConstructor = function() { return mock; };

        $provide.value('TextFacet', mockConstructor);
    }));

    beforeEach(inject(function(_$controller_, _$rootScope_){
        $rootScope = _$rootScope_;
        $controller = _$controller_;
        $scope = $rootScope.$new();

        constraints = {
            facets: {
                textId: {
                    constraint: 'constraint',
                    value: 'text'
                }
            },
            constraint: ['default', 'constraint']
        };
    }));

    beforeEach(function() {
        $scope.options = {};
        controller = $controller('TextFacetController', { $scope: $scope });
        $scope.$digest();
        $scope.$broadcast('sf-initial-constraints', constraints);
    });

    it('should listen for initial values initially', function() {
        spyOn($scope, '$emit');

        $scope.options = {};

        $controller('TextFacetController', { $scope: $scope });
        $scope.$digest();

        expect($scope.$emit).toHaveBeenCalledWith('sf-request-constraints');
    });

    describe('vm.changed', function() {
        beforeEach(function() {
            $scope.options = {};
            controller = $controller('TextFacetController', { $scope: $scope });
            $scope.$digest();
            $scope.$broadcast('sf-initial-constraints', constraints);
        });

        it('should emit the state of the facet', function() {
            spyOn($scope, '$emit');

            controller.changed();

            var args = { id: 'textId', constraint: 'constraint', value: 'text' };
            expect($scope.$emit).toHaveBeenCalledWith('sf-facet-changed', args);
        });
    });

    describe('vm.clear', function() {
        it('should call facet.clear, and emit change event', function() {
            spyOn($scope, '$emit');
            spyOn(controller.facet, 'clear');

            controller.clear();

            expect(controller.facet.clear).toHaveBeenCalled();
            expect($scope.$emit).toHaveBeenCalledWith('sf-facet-changed', jasmine.any(Object));
        });
    });

    describe('vm.enableFacet', function() {
        it('should enable facet, and not emit a change event', function() {
            spyOn($scope, '$emit');
            spyOn(controller.facet, 'enable');

            controller.enableFacet();

            expect(controller.facet.enable).toHaveBeenCalled();
            expect($scope.$emit).not.toHaveBeenCalled();
        });
    });

    describe('vm.disableFacet', function() {
        it('should disable facet, and emit a change event', function() {
            spyOn($scope, '$emit');
            spyOn(controller.facet, 'disable');

            controller.disableFacet();

            expect(controller.facet.disable).toHaveBeenCalled();
            expect($scope.$emit).toHaveBeenCalledWith('sf-facet-changed', jasmine.any(Object));
        });
    });

    describe('vm.isFacetEnabled', function() {
        it('should check if the facet is enabled', function() {
            spyOn(controller.facet, 'isEnabled').and.returnValue(true);

            var res = controller.isFacetEnabled();

            expect(res).toBe(true);
            expect(controller.facet.isEnabled).toHaveBeenCalled();
        });
    });
});
