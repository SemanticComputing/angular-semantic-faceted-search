/* eslint-env jasmine */
/* global inject, module  */

describe('FacetHandler', function() {
    var $rootScope, scope, FacetHandler, options;

    beforeEach(module('seco.facetedSearch'));
    beforeEach(inject(function(_FacetHandler_, _$rootScope_) {
        $rootScope = _$rootScope_;
        FacetHandler = _FacetHandler_;
        scope = $rootScope.$new();
        spyOn(scope, '$broadcast');

        options = {
            scope: scope,
            rdfClass: '<http://ldf.fi/schema/narc-menehtyneet1939-45/DeathRecord>',
            constraint: '?id skos:prefLabel ?name .',
            preferredLang : 'fi'
        };

    }));

    it('should broadcast constraints at init', function() {
        var cons = [' ?id a <http://ldf.fi/schema/narc-menehtyneet1939-45/DeathRecord> . ?id skos:prefLabel ?name .'];
        var data = { facets: {}, constraint: cons, config: options };
        new FacetHandler(options);
        expect(scope.$broadcast).toHaveBeenCalledWith('sf-initial-constraints', data);
    });

    it('should broadcast initial constraints when requested', function() {
        var cons = [' ?id a <http://ldf.fi/schema/narc-menehtyneet1939-45/DeathRecord> . ?id skos:prefLabel ?name .'];
        var data = { facets: {}, constraint: cons, config: options };
        new FacetHandler(options);

        scope.$broadcast.calls.reset();

        scope.$emit('sf-request-constraints');

        expect(scope.$broadcast).toHaveBeenCalledWith('sf-initial-constraints', data);
    });

    it('should listen for facet changes and broadcast constraints', function() {
        var cons = [' ?id a <http://ldf.fi/schema/narc-menehtyneet1939-45/DeathRecord> . ?id skos:prefLabel ?name .'];
        var data = { facets: {}, constraint: cons };
        new FacetHandler(options);

        var args = {
            id: 'facetId',
            constraint: '?id <pred> <obj> .',
            value: '<obj>'
        };
        scope.$emit('sf-facet-changed', args);

        var updatedCons = [args.constraint].concat(cons);

        data = { facets: { facetId: args }, constraint: updatedCons };

        expect(scope.$broadcast).toHaveBeenCalledWith('sf-facet-constraints', data);
    });
});
