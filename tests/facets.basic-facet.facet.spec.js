/* eslint-env jasmine */
/* global inject, module  */

describe('BasicFacet', function() {
    var $rootScope, $q, mock, mockConstructor, BasicFacet, facet,
        options, response, values;

    beforeEach(module('seco.facetedSearch'));

    beforeEach(module(function($provide) {
        mock = { getObjects: getResponse };
        mockConstructor = function() { return mock; };

        $provide.value('SparqlService', mockConstructor);
    }));

    beforeEach(inject(function(_$q_, _$rootScope_, _BasicFacet_) {
        $q = _$q_;
        $rootScope = _$rootScope_;
        BasicFacet = _BasicFacet_;

        options = {
            endpointUrl: 'endpoint',
            name: 'Name',
            facetId: 'textId',
            predicate: '<pred>',
            enabled: true
        };

        facet = new BasicFacet(options);

        values = [
            {
                'value': undefined,
                'text': '-- No Selection --',
                'count': 94696
            },
            {
                'value': '<http://ldf.fi/narc-menehtyneet1939-45/sukupuoli/Nainen>',
                'text': 'Nainen',
                'count': 405
            },
            {
                'value': '<http://ldf.fi/narc-menehtyneet1939-45/sukupuoli/Tuntematon>',
                'text': 'Tuntematon',
                'count': 5
            },
            {
                'value': '<http://ldf.fi/narc-menehtyneet1939-45/sukupuoli/Mies>',
                'text': 'Mies',
                'count': 94286
            }
        ];

        response = [
            {
                'cnt': { 'datatype': 'http://www.w3.org/2001/XMLSchema#integer' , 'type': 'typed-literal' , 'value': '94696' } ,
                'facet_text': { 'type': 'literal' , 'value': '-- No Selection --' }
            },
            {
                'cnt': { 'datatype': 'http://www.w3.org/2001/XMLSchema#integer' , 'type': 'typed-literal' , 'value': '405' } ,
                'facet_text': { 'type': 'literal' , 'xml:lang': 'fi' , 'value': 'Nainen' } ,
                'value': { 'type': 'uri' , 'value': 'http://ldf.fi/narc-menehtyneet1939-45/sukupuoli/Nainen' }
            },
            {
                'cnt': { 'datatype': 'http://www.w3.org/2001/XMLSchema#integer' , 'type': 'typed-literal' , 'value': '5' } ,
                'facet_text': { 'type': 'literal' , 'xml:lang': 'fi' , 'value': 'Tuntematon' } ,
                'value': { 'type': 'uri' , 'value': 'http://ldf.fi/narc-menehtyneet1939-45/sukupuoli/Tuntematon' }
            },
            {
                'cnt': { 'datatype': 'http://www.w3.org/2001/XMLSchema#integer' , 'type': 'typed-literal' , 'value': '94286' } ,
                'facet_text': { 'type': 'literal' , 'xml:lang': 'fi' , 'value': 'Mies' } ,
                'value': { 'type': 'uri' , 'value': 'http://ldf.fi/narc-menehtyneet1939-45/sukupuoli/Mies' }
            }
        ];


    }));

    it('should be enabled if config says so', function() {
        expect(facet.isEnabled()).toBe(true);
    });

    it('should be disabled if config says so', function() {
        options.enabled = false;
        facet = new BasicFacet(options);

        expect(facet.isEnabled()).toBe(false);
    });

    describe('enable', function() {
        it('should enable the facet', function() {
            options.enabled = false;
            facet = new BasicFacet(options);

            expect(facet.isEnabled()).toBe(false);

            facet.enable();

            expect(facet.isEnabled()).toBe(true);
        });
    });

    describe('disable', function() {
        it('should disable the facet', function() {
            facet.disable();

            expect(facet.isEnabled()).toBe(false);
        });
    });

    describe('getSelectedValue', function() {
        it('should get the selected value', function() {
            expect(facet.getSelectedValue()).toBeUndefined();

            facet.selectedValue = { value: '<obj>' };

            expect(facet.getSelectedValue()).toEqual('<obj>');
        });
    });

    describe('getConstraint', function() {
        it('should return a constraint based on the selected value', function() {
            facet.selectedValue = { value: '<obj>' };

            expect(facet.getConstraint()).toEqual(' ?s <pred> <obj> . ');
        });
    });

    describe('update', function() {
        it('should update the facet state according to query results', function() {
            var cons = [' ?s a <http://ldf.fi/schema/narc-menehtyneet1939-45/DeathRecord> . ?s skos:prefLabel ?name .'];
            var data = { facets: {}, constraint: cons };

            var qryRes;

            facet.update(data).then(function(res) {
                qryRes = res;
            });
            $rootScope.$apply();
            expect(qryRes).toEqual(values);
        });

        it('should make the facet busy', function() {
            var cons = [' ?s a <http://ldf.fi/schema/narc-menehtyneet1939-45/DeathRecord> . ?s skos:prefLabel ?name .'];
            var data = { facets: {}, constraint: cons };

            expect(facet.isLoading()).toBeFalsy();

            facet.update(data);

            expect(facet.isLoading()).toBe(true);

            $rootScope.$apply();

            expect(facet.isLoading()).toBe(false);
        });
    });

    function getResponse() {
        var deferred = $q.defer();
        deferred.resolve(response);
        $rootScope.$apply();

        return deferred.promise;
    }
});
