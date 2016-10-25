/* eslint-env jasmine */
/* global inject, module  */

describe('HierarchyFacet', function() {
    var $rootScope, $q, $timeout, mock, mockConstructor, HierarchyFacet, facet,
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

    beforeEach(inject(function(_$timeout_, _$q_, _$rootScope_, _HierarchyFacet_) {
        $timeout = _$timeout_;
        $q = _$q_;
        $rootScope = _$rootScope_;
        HierarchyFacet = _HierarchyFacet_;

        options = {
            endpointUrl: 'endpoint',
            name: 'Name',
            facetId: 'textId',
            predicate: '<pred>',
            hierarchy: '<hierarchy>',
            classes: ['<class1>', '<class2>'],
            enabled: true
        };

        facet = new HierarchyFacet(options);

        // These are the same as the ones in BasicFacet tests, but in this regard
        // the facets work the exact same way.
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
        facet = new HierarchyFacet(options);

        expect(facet.isEnabled()).toBe(false);
    });

    it('should take its initial value from the config if present', function() {
        var iv = 'initial text';
        options.initialConstraints = { facets: { 'textId': { value: iv } } };
        facet = new HierarchyFacet(options);

        expect(facet.getSelectedValue()).toEqual(iv);
    });

    describe('enable', function() {
        it('should enable the facet', function() {
            options.enabled = false;
            facet = new HierarchyFacet(options);

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

            var expected =
            ' VALUES ?seco_class_textId { ' +
            '  <obj> ' +
            ' } ' +
            ' ?seco_h_textId <hierarchy> ?seco_class_textId . ' +
            ' ?seco_v_textId <hierarchy> ?seco_h_textId . ' +
            ' ?s <pred> ?seco_v_textId .';

            expect(facet.getConstraint()).toEqual(expected.replace(/\s+/g, ' '));

            facet.selectedValue = undefined;

            expect(facet.getConstraint()).toBeUndefined();
        });
    });

    describe('buildQuery', function() {
        it('should build a valid query', function() {
            var cons = ['?s <p> <o> .'];

            var expected =
            ' PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> ' +
            ' PREFIX skos: <http://www.w3.org/2004/02/skos/core#> ' +
            ' PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> ' +
            ' SELECT DISTINCT ?cnt ?facet_text ?value WHERE {' +
            ' { ' +
            '  { ' +
            '   SELECT DISTINCT (count(DISTINCT ?s) as ?cnt) { ' +
            '    ?s <p> <o> . ' +
            '   } ' +
            '  } ' +
            '  BIND("-- No Selection --" AS ?facet_text) ' +
            ' } UNION ' +
            '  {' +
            '   SELECT DISTINCT ?cnt ?value ?facet_text {' +
            '    {' +
            '     SELECT DISTINCT (count(DISTINCT ?s) as ?cnt) ?value ?class {' +
            '      VALUES ?class { ' +
            '       <class1> <class2> ' +
            '      } ' +
            '      ?value <hierarchy> ?class . ' +
            '      ?h <hierarchy> ?value . ' +
            '      ?s <pred> ?h .' +
            '      ?s <p> <o> . ' +
            '     } GROUP BY ?class ?value ' +
            '    } ' +
            '    FILTER(BOUND(?value))' +
            '    { ' +
            '     ?value skos:prefLabel|rdfs:label [] . ' +
            '     OPTIONAL {' +
            '      ?value skos:prefLabel ?lbl . ' +
            '      FILTER(langMatches(lang(?lbl), "fi")) .' +
            '     }' +
            '     OPTIONAL {' +
            '      ?value rdfs:label ?lbl . ' +
            '      FILTER(langMatches(lang(?lbl), "fi")) .' +
            '     }' +
            '     OPTIONAL {' +
            '      ?value skos:prefLabel ?lbl . ' +
            '      FILTER(langMatches(lang(?lbl), "")) .' +
            '     }' +
            '     OPTIONAL {' +
            '      ?value rdfs:label ?lbl . ' +
            '      FILTER(langMatches(lang(?lbl), "")) .' +
            '     } ' +
            '     FILTER(BOUND(?lbl)) ' +
            '    }' +
            '    UNION { ' +
            '     FILTER(!ISURI(?value)) ' +
            '     BIND(STR(?value) AS ?lbl) ' +
            '     FILTER(BOUND(?lbl)) ' +
            '    } ' +
            '    BIND(COALESCE(?lbl, STR(?value)) as ?label)' +
            '    BIND(IF(?value = ?class, ?label, CONCAT("-- ", ?label)) as ?facet_text)' +
            '    BIND(IF(?value = ?class, 0, 1) as ?order)' +
            '   } ORDER BY ?class ?order ?facet_text' +
            '  } ' +
            ' } ';

            expect(facet.buildQuery(cons).replace(/\s+/g, ' ')).toEqual(expected.replace(/\s+/g, ' '));
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
