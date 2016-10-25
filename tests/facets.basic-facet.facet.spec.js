/* eslint-env jasmine */
/* global inject, module  */

describe('BasicFacet', function() {
    var $rootScope, $q, $timeout, mock, mockConstructor, BasicFacet, facet,
        options, natResponse, genResponse, genValues, natValues;

    beforeEach(module('seco.facetedSearch'));

    beforeEach(module(function($provide) {
        mock = { getObjects: getResponse };
        mockConstructor = function() { return mock; };

        $provide.value('SparqlService', mockConstructor);
    }));

    beforeEach(inject(function(){
        spyOn(mock, 'getObjects').and.callThrough();
    }));

    beforeEach(inject(function(_$timeout_, _$q_, _$rootScope_, _BasicFacet_) {
        $timeout = _$timeout_;
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

        genValues = [
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

        genResponse = [
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

        natValues = [
            {
                'value': undefined,
                'text': '-- No Selection --',
                'count': 5
            },
            {
                'value': '<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Ruotsi>',
                'text': 'Ruotsi',
                'count': 1
            },
            {
                'value': '<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Suomi>',
                'text': 'Suomi',
                'count': 4
            }
        ];

        natResponse = [
            {
                'cnt': { 'datatype': 'http://www.w3.org/2001/XMLSchema#integer' , 'type': 'typed-literal' , 'value': '5' } ,
                'facet_text': { 'type': 'literal' , 'value': '-- No Selection --' }
            },
            {
                'cnt': { 'datatype': 'http://www.w3.org/2001/XMLSchema#integer' , 'type': 'typed-literal' , 'value': '1' } ,
                'facet_text': { 'type': 'literal' , 'xml:lang': 'fi' , 'value': 'Ruotsi' } ,
                'value': { 'type': 'uri' , 'value': 'http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Ruotsi' }
            },
            {
                'cnt': { 'datatype': 'http://www.w3.org/2001/XMLSchema#integer' , 'type': 'typed-literal' , 'value': '4' } ,
                'facet_text': { 'type': 'literal' , 'xml:lang': 'fi' , 'value': 'Suomi' } ,
                'value': { 'type': 'uri' , 'value': 'http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Suomi' }
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

    it('should take its initial value from the config if present', function() {
        var iv = 'initial text';
        options.initialConstraints = { facets: { 'textId': { value: iv } } };
        facet = new BasicFacet(options);

        expect(facet.getSelectedValue()).toEqual(iv);
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

            mock.response = natResponse;

            facet.update(data).then(function(res) {
                qryRes = res;
            });

            expect(mock.getObjects).toHaveBeenCalled();

            $rootScope.$apply();

            expect(qryRes).toEqual(natValues);
        });

        it('should not fetch results if facet is disabled', function() {
            var cons = [' ?s a <http://ldf.fi/schema/narc-menehtyneet1939-45/DeathRecord> . ?s skos:prefLabel ?name .'];
            var data = { facets: {}, constraint: cons };

            var qryRes;

            facet.disable();

            facet.update(data).then(function(res) {
                qryRes = res;
            });
            $rootScope.$apply();

            expect(qryRes).toBeUndefined();
            expect(mock.getObjects).not.toHaveBeenCalled();
        });

        it('should abort if it is called again with different constraints', function() {
            var cons = [' ?s a <http://ldf.fi/schema/narc-menehtyneet1939-45/DeathRecord> . ?s skos:prefLabel ?name .'];
            var data = { facets: {}, constraint: cons };

            var qryRes;

            mock.wait = true;
            mock.response = natResponse;

            facet.update(data).then(function() {
                throw Error;
            }, function(error) {
                expect(error).toEqual('Facet state changed');
            });

            mock.wait = false;
            mock.response = genResponse;

            var newCons = ['?s ?p ?o .'];
            var newData = { facets: {}, constraint: newCons };

            facet.update(newData).then(function(res) {
                qryRes = res;
            });

            $rootScope.$apply();

            $timeout.flush();

            expect(qryRes).toEqual(genValues);
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
        var response = this.response;
        var deferred = $q.defer();
        if (this.wait) {
            $timeout(function() {
                deferred.resolve(response);
            });
        } else {
            deferred.resolve(response);
        }

        return deferred.promise;
    }
});
