/* eslint-env jasmine */
/* global inject, module  */

describe('Facets', function() {
    var mock, mockConstructor, nationalityFacet, facetOptions,
        defaultInstance, $rootScope, $q, Facets, basicFacetSelections,
        textFacetSelections, timeSpanFacetSelections, multipleFacetsSelected;

    beforeEach(module('seco.facetedSearch'));
    beforeEach(module(function($provide) {
        mock = { getObjects: getResponse };
        mockConstructor = function() { return mock; };

        $provide.value('SparqlService', mockConstructor);
    }));

    beforeEach(inject(function(_$rootScope_, _$q_, _Facets_){
        $rootScope = _$rootScope_;
        $q = _$q_;
        Facets = _Facets_;

        nationalityFacet = {
            '<http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus>': {
                name: 'Kansalaisuus',
                enabled: true
            }
        };

        facetOptions = {
            endpointUrl: '',
            //graph : '<http://ldf.fi/narc-menehtyneet1939-45/>',
            rdfClass: '<http://www.cidoc-crm.org/cidoc-crm/E31_Document>',
            preferredLang : 'fi',
            updateResults: handleSelections,
            disableFacets: disableFacets
        };

        defaultInstance = new Facets(nationalityFacet, facetOptions);

        basicFacetSelections = {
            '<basic>': { value: '<value>' },
            '<other_basic>': [
                { value: '<other1>' },
                { value: '<other2>' }
            ]
        };

        textFacetSelections = {
            '<text>': { value: 'terve' },
            '<text2>': { value: 'moro' }
        };

        timeSpanFacetSelections = {
            '<time_different_property>': {
                value: { start: new Date('1900-01-01'), end: new Date('1999-03-03') }
            }
        };

        multipleFacetsSelected = {
            '<basic>': { value: '<value>' },
            '<other_basic>': [
                { value: '<other1>' },
                { value: '<other2>' }
            ],
            '<text>': { value: 'terve' },
            '<text2>': { value: 'moro' },
            '<time_different_property>': {
                value: { start: new Date('1900-01-01'), end: new Date('1999-03-03') }
            }
        };

    }));

    beforeEach(inject(function(){
        spyOn(mock, 'getObjects').and.callThrough();
        spyOn(facetOptions, 'updateResults').and.callThrough();
        spyOn(facetOptions, 'disableFacets').and.callThrough();
    }));

    describe('update', function() {
        it('should call SparqlService.getObjects', function() {
            defaultInstance.update();
            expect(mock.getObjects).toHaveBeenCalled();
        });

        it('should call the given callback function', function() {
            defaultInstance.update();
            expect(facetOptions.updateResults).toHaveBeenCalled();
        });

        it('should not call the given disableFacets function', function() {
            defaultInstance.update();
            expect(facetOptions.disableFacets).not.toHaveBeenCalled();
        });

        it('should update facet states according to query results', function() {
            var results;

            defaultInstance.update().then(function(res) {
                results = res;
            });
            $rootScope.$apply();
            expect(results).toEqual(getExpectedNationalityFacetState());
        });

        it('should work with multiple facets', function() {
            var facets = {
                '<http://ldf.fi/schema/narc-menehtyneet1939-45/sukupuoli>': {
                    name: 'Sukupuoli',
                    enabled: true
                },
                '<http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus>': {
                    name: 'Kansalaisuus',
                    enabled: true
                }
            };

            var results;
            var instance = new Facets(facets, facetOptions);
            mock._testResponse = 'nationalityAndGender';
            instance.update().then(function(res) {
                results = res;
            });
            $rootScope.$apply();
            expect(results).toEqual(getExpectedNationalityAndGenderFacetState());
        });
    });

    it('should count "no selection" amounts correctly', function() {
        var facets = {
            '<http://ldf.fi/schema/narc-menehtyneet1939-45/sukupuoli>': {
                name: 'Sukupuoli',
                enabled: true
            },
            '<http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus>': {
                name: 'Kansalaisuus',
                enabled: true
            }
        };

        var facetId = '<http://ldf.fi/schema/narc-menehtyneet1939-45/sukupuoli>';
        var instance = new Facets(facets, facetOptions);
        var countKey = instance._getCurrentDefaultCountKey();

        var selectedFacets = {};
        selectedFacets[facetId] = [{
            value: '<http://ldf.fi/narc-menehtyneet1939-45/sukupuoli/Tuntematon>'
        }];

        var count = instance._getNoSelectionCountFromResults(
                getUnknownGenderFacetObjectList(), selectedFacets, countKey);

        expect(count).toEqual(5);
    });

    describe('facetChanged', function() {
        it('should set counts correctly', function() {
            var facets = {
                '<http://ldf.fi/schema/narc-menehtyneet1939-45/sukupuoli>': {
                    name: 'Sukupuoli',
                    enabled: true
                },
                '<http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus>': {
                    name: 'Kansalaisuus',
                    enabled: true
                }
            };

            var results;
            var instance = new Facets(facets, facetOptions);
            mock._testResponse = 'unknownGenderSelected';
            var facetId = '<http://ldf.fi/schema/narc-menehtyneet1939-45/sukupuoli>';

            instance.selectedFacets = {};
            instance.selectedFacets[facetId] = [{
                value: '<http://ldf.fi/narc-menehtyneet1939-45/sukupuoli/Tuntematon>'
            }];

            instance.facetChanged(facetId).then(function(res) {
                results = res;
            });
            $rootScope.$apply();
            expect(results).toEqual(getExpectedUnknownGenderFacetState());
        });

        xit('should call update if facet value has changed', function() {
        });

        xit('should not call update if facet value has not changed', function() {
        });
    });

    describe('_hasSameValue', function() {
        it('should return true if facet values are identical', function() {
            expect(defaultInstance._hasSameValue({ value: 'value' }, {value: 'value' }))
                .toBe(true);

            var list1 = [{ value: 'value' }, {value: 'value2' }];
            var list2 = [{ value: 'value' }, {value: 'value2' }];
            expect(defaultInstance._hasSameValue(list1, list2)).toBe(true);

            var timeSpan1 = { start: new Date('1999-02-02'), end: new Date('1999-02-02') };
            var timeSpan2 = { start: new Date('1999-02-02'), end: new Date('1999-02-02') };
            expect(defaultInstance._hasSameValue(
                    { value: timeSpan1 }, { value: timeSpan2 }))
                .toBe(true);
        });

        it('should return false if facet values are not identical', function() {
            expect(defaultInstance._hasSameValue({ value: 'value' }, { value: 'not same' }))
                .toBe(false);

            var list1 = [{ value: 'value' }, {value: 'value2' }];
            var list2 = [{ value: 'valu' }, {value: 'value2' }];
            expect(defaultInstance._hasSameValue(list1, list2)).toBe(false);

            var timeSpan1 = { start: new Date('1999-02-02'), end: new Date('1999-02-02') };
            var timeSpan2 = { start: new Date('1999-02-02'), end: new Date('2000-02-02') };
            expect(defaultInstance._hasSameValue(
                    { value: timeSpan1 }, { value: timeSpan2 }))
                .toBe(false);
        });
    });

    describe('_hasChanged', function() {
        it('should return true if the facet value has changed', function() {

            expect(defaultInstance._hasChanged('<basic>', { value: '<value2>' },
                    basicFacetSelections))
                .toBe(true);

            var timeSpan = { start: new Date('1999-02-02'), end: new Date('1999-02-02') };
            expect(defaultInstance._hasChanged('<time_different_property>',
                    { value: timeSpan }, timeSpanFacetSelections))
                .toBe(true);
        });

        it('should return false if the facet value has not changed', function() {
            expect(defaultInstance._hasChanged('<basic>', { value: '<value>' },
                    basicFacetSelections))
                .toBe(false);

            var timeSpan = { start: new Date('1900-01-01'), end: new Date('1999-03-03') };
            expect(defaultInstance._hasChanged('<time_different_property>',
                    { value: timeSpan }, timeSpanFacetSelections))
                .toBe(false);
        });
    });

    describe('_basicFacetChanged', function() {
        var facets;
        beforeEach(function() {
            facets = {
                '<basic>': {
                    name: 'Basic',
                    enabled: true
                }
            };
        });

        it('should update previousSelections', function() {
            var instance = new Facets(facets, facetOptions);

            instance.selectedFacets['<basic>'] = { value: '<initial>' };
            instance._basicFacetChanged('<basic>');
            expect(instance._getPreviousSelections()).toEqual({ '<basic>': { value: '<initial>' } });
        });

        it('should call update', function() {
            var instance = new Facets(facets, facetOptions);

            spyOn(instance, 'update');

            instance.selectedFacets['<basic>'] = { value: '<initial>' };
            instance._basicFacetChanged('<basic>');

            expect(instance.update).toHaveBeenCalledWith('<basic>');
        });

        xit('should revert to a previous value if facet has no value', function() {
        });

        xit('should handle hierarchy facets as well', function() {
        });
    });

    describe('_timeSpanFacetChanged', function() {
        xit('should call update if both start and end have been selected', function() {
        });

        xit('should not call update if either start or end has no selection', function() {
        });
    });

    describe('_textFacetChanged', function() {
        var facets;
        beforeEach(function() {
            facets = {
                '<text>': {
                    name: 'Text',
                    type: 'text',
                    enabled: true
                }
            };
        });

        it('should update previousSelections', function() {
            var instance = new Facets(facets, facetOptions);

            instance.selectedFacets['<text>'] = { value: 'initial' };
            instance._textFacetChanged('<text>');
            expect(instance._getPreviousSelections()).toEqual({ '<text>': { value: 'initial' } });
        });

        it('should call update', function() {
            var instance = new Facets(facets, facetOptions);

            spyOn(instance, 'update');

            instance.selectedFacets['<text>'] = { value: 'initial' };
            instance._textFacetChanged('<text>');

            expect(instance.update).toHaveBeenCalledWith('<text>');
        });
    });

    describe('_getFreeFacetCount', function() {
        xit('should get the "no selection" count from results if facet has no selection', function() {
        });

        xit('should calculate the count using the results if the facet has a selection', function() {
        });
    });

    describe('_getTemplateFacets', function() {
        xit('should include all facets except types "text" and "hierarchy"', function() {
        });
    });

    describe('_buildCountUnions', function() {
        xit('should build union queries for deselections', function() {
        });

        xit('should build union queries for time span counts', function() {
        });
    });

    describe('_getHierarchyFacetClasses', function() {
        xit('should return hierarchy facet classes', function() {
        });
    });

    describe('_rejectHierarchies', function() {
        xit('should filter out hierarchy facets from facet selections', function() {
        });
    });

    describe('_buildHierarchyUnions', function() {
        xit('should build hierarchy facet union queries', function() {
        });
    });

    describe('_buildQueryTemplate', function() {
        xit('should build the facet query template by replacing placeholders', function() {
        });
    });

    describe('_buildQuery', function() {
        xit('should build a query based on facets and selections', function() {
        });
    });

    function disableFacets() { }

    function handleSelections() { }

    /* eslint-disable */
    var nationalityResponse = [
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "1" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus" } ,
            "facet_text": { "type": "literal" , "xml:lang": "fi" , "value": "Italia" } ,
            "value": { "type": "uri" , "value": "http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Italia" }
        } ,
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "1" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus" } ,
            "facet_text": { "type": "literal" , "xml:lang": "fi" , "value": "Saksa" } ,
            "value": { "type": "uri" , "value": "http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Saksa" }
        } ,
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "1" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus" } ,
            "facet_text": { "type": "literal" , "xml:lang": "fi" , "value": "Norja" } ,
            "value": { "type": "uri" , "value": "http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Norja" }
        } ,
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "1" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus" } ,
            "facet_text": { "type": "literal" , "xml:lang": "fi" , "value": "Unkari" } ,
            "value": { "type": "uri" , "value": "http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Unkari" }
        } ,
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "118" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus" } ,
            "facet_text": { "type": "literal" , "xml:lang": "fi" , "value": "Ruotsi" } ,
            "value": { "type": "uri" , "value": "http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Ruotsi" }
        } ,
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "127" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus" } ,
            "facet_text": { "type": "literal" , "xml:lang": "fi" , "value": "Viro" } ,
            "value": { "type": "uri" , "value": "http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Viro" }
        } ,
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "16" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus" } ,
            "facet_text": { "type": "literal" , "xml:lang": "fi" , "value": "Tanska" } ,
            "value": { "type": "uri" , "value": "http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Tanska" }
        } ,
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "7" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus" } ,
            "facet_text": { "type": "literal" , "xml:lang": "fi" , "value": "Tuntematon" } ,
            "value": { "type": "uri" , "value": "http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Tuntematon" }
        } ,
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "92" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus" } ,
            "facet_text": { "type": "literal" , "xml:lang": "fi" , "value": "Neuvostoliitto" } ,
            "value": { "type": "uri" , "value": "http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Neuvostoliitto" }
        } ,
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "94332" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus" } ,
            "facet_text": { "type": "literal" , "xml:lang": "fi" , "value": "Suomi" } ,
            "value": { "type": "uri" , "value": "http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Suomi" }
        } ,
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "94696" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus" } ,
            "facet_text": { "type": "literal" , "value": "-- No Selection --" }
        }
    ];

    var nationalityAndGenderResponse = [
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "1" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus" } ,
            "facet_text": { "type": "literal" , "xml:lang": "fi" , "value": "Italia" } ,
            "value": { "type": "uri" , "value": "http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Italia" }
        } ,
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "1" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus" } ,
            "facet_text": { "type": "literal" , "xml:lang": "fi" , "value": "Saksa" } ,
            "value": { "type": "uri" , "value": "http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Saksa" }
        } ,
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "1" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus" } ,
            "facet_text": { "type": "literal" , "xml:lang": "fi" , "value": "Norja" } ,
            "value": { "type": "uri" , "value": "http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Norja" }
        } ,
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "1" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus" } ,
            "facet_text": { "type": "literal" , "xml:lang": "fi" , "value": "Unkari" } ,
            "value": { "type": "uri" , "value": "http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Unkari" }
        } ,
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "118" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus" } ,
            "facet_text": { "type": "literal" , "xml:lang": "fi" , "value": "Ruotsi" } ,
            "value": { "type": "uri" , "value": "http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Ruotsi" }
        } ,
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "127" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus" } ,
            "facet_text": { "type": "literal" , "xml:lang": "fi" , "value": "Viro" } ,
            "value": { "type": "uri" , "value": "http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Viro" }
        } ,
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "16" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus" } ,
            "facet_text": { "type": "literal" , "xml:lang": "fi" , "value": "Tanska" } ,
            "value": { "type": "uri" , "value": "http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Tanska" }
        } ,
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "7" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus" } ,
            "facet_text": { "type": "literal" , "xml:lang": "fi" , "value": "Tuntematon" } ,
            "value": { "type": "uri" , "value": "http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Tuntematon" }
        } ,
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "92" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus" } ,
            "facet_text": { "type": "literal" , "xml:lang": "fi" , "value": "Neuvostoliitto" } ,
            "value": { "type": "uri" , "value": "http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Neuvostoliitto" }
        } ,
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "94332" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus" } ,
            "facet_text": { "type": "literal" , "xml:lang": "fi" , "value": "Suomi" } ,
            "value": { "type": "uri" , "value": "http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Suomi" }
        } ,
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "405" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/sukupuoli" } ,
            "facet_text": { "type": "literal" , "xml:lang": "fi" , "value": "Nainen" } ,
            "value": { "type": "uri" , "value": "http://ldf.fi/narc-menehtyneet1939-45/sukupuoli/Nainen" }
        } ,
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "5" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/sukupuoli" } ,
            "facet_text": { "type": "literal" , "xml:lang": "fi" , "value": "Tuntematon" } ,
            "value": { "type": "uri" , "value": "http://ldf.fi/narc-menehtyneet1939-45/sukupuoli/Tuntematon" }
        } ,
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "94286" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/sukupuoli" } ,
            "facet_text": { "type": "literal" , "xml:lang": "fi" , "value": "Mies" } ,
            "value": { "type": "uri" , "value": "http://ldf.fi/narc-menehtyneet1939-45/sukupuoli/Mies" }
        } ,
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "94696" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/sukupuoli" } ,
            "facet_text": { "type": "literal" , "value": "-- No Selection --" }
        }
    ];

    var unknownGenderSelectedResponse = [
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "1" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus" } ,
            "facet_text": { "type": "literal" , "xml:lang": "fi" , "value": "Ruotsi" } ,
            "value": { "type": "uri" , "value": "http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Ruotsi" }
        } ,
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "4" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus" } ,
            "facet_text": { "type": "literal" , "xml:lang": "fi" , "value": "Suomi" } ,
            "value": { "type": "uri" , "value": "http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Suomi" }
        } ,
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "5" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/sukupuoli" } ,
            "facet_text": { "type": "literal" , "xml:lang": "fi" , "value": "Tuntematon" } ,
            "value": { "type": "uri" , "value": "http://ldf.fi/narc-menehtyneet1939-45/sukupuoli/Tuntematon" }
        } ,
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "94696" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/sukupuoli" } ,
            "facet_text": { "type": "literal" , "value": "-- No Selection --" }
        }
    ];

    var expectedUnknownGenderSelectedFacetState = {
        "<http://ldf.fi/schema/narc-menehtyneet1939-45/sukupuoli>": {
            "name": "Sukupuoli",
            "enabled": true,
            "state": {
                "id": "<http://ldf.fi/schema/narc-menehtyneet1939-45/sukupuoli>",
                "values": [
                {
                    "value": undefined,
                    "text": "-- No Selection --",
                    "count": 94696
                },
                {
                    "value": "<http://ldf.fi/narc-menehtyneet1939-45/sukupuoli/Tuntematon>",
                    "text": "Tuntematon",
                    "count": 5
                }
                ]
            }
        },
        "<http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus>": {
            "name": "Kansalaisuus",
            "enabled": true,
            "state": {
                "id": "<http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus>",
                "values": [
                {
                    "value": undefined,
                    "text": "-- No Selection --",
                    "count": 5
                },
                {
                    "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Ruotsi>",
                    "text": "Ruotsi",
                    "count": 1
                },
                {
                    "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Suomi>",
                    "text": "Suomi",
                    "count": 4
                }
                ]
            }
        }
    };

    var expectedNationalityAndGenderFacetState = {
        "<http://ldf.fi/schema/narc-menehtyneet1939-45/sukupuoli>": {
            "name": "Sukupuoli",
            "enabled": true,
            "state": {
                "id": "<http://ldf.fi/schema/narc-menehtyneet1939-45/sukupuoli>",
                "values": [
                {
                    "value": undefined,
                    "text": "-- No Selection --",
                    "count": 94696
                },
                {
                    "value": "<http://ldf.fi/narc-menehtyneet1939-45/sukupuoli/Nainen>",
                    "text": "Nainen",
                    "count": 405
                },
                {
                    "value": "<http://ldf.fi/narc-menehtyneet1939-45/sukupuoli/Tuntematon>",
                    "text": "Tuntematon",
                    "count": 5
                },
                {
                    "value": "<http://ldf.fi/narc-menehtyneet1939-45/sukupuoli/Mies>",
                    "text": "Mies",
                    "count": 94286
                }
                ]
            }
        },
        "<http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus>": {
            "name": "Kansalaisuus",
            "enabled": true,
            "state": {
                "id": "<http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus>",
                "values": [
                {
                    "value": undefined,
                    "text": "-- No Selection --",
                    "count": 94696
                },
                {
                    "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Italia>",
                    "text": "Italia",
                    "count": 1
                },
                {
                    "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Saksa>",
                    "text": "Saksa",
                    "count": 1
                },
                {
                    "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Norja>",
                    "text": "Norja",
                    "count": 1
                },
                {
                    "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Unkari>",
                    "text": "Unkari",
                    "count": 1
                },
                {
                    "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Ruotsi>",
                    "text": "Ruotsi",
                    "count": 118
                },
                {
                    "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Viro>",
                    "text": "Viro",
                    "count": 127
                },
                {
                    "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Tanska>",
                    "text": "Tanska",
                    "count": 16
                },
                {
                    "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Tuntematon>",
                    "text": "Tuntematon",
                    "count": 7
                },
                {
                    "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Neuvostoliitto>",
                    "text": "Neuvostoliitto",
                    "count": 92
                },
                {
                    "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Suomi>",
                    "text": "Suomi",
                    "count": 94332
                }
                ]
            }
        }
    };

    var expectedNationalityFacetState = {
        "<http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus>": {
            "name": "Kansalaisuus",
            "enabled": true,
            "state": {
                "id": "<http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus>",
                "values": [
                {
                    "value": undefined,
                    "text": "-- No Selection --",
                    "count": 94696
                },
                {
                    "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Italia>",
                    "text": "Italia",
                    "count": 1
                },
                {
                    "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Saksa>",
                    "text": "Saksa",
                    "count": 1
                },
                {
                    "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Norja>",
                    "text": "Norja",
                    "count": 1
                },
                {
                    "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Unkari>",
                    "text": "Unkari",
                    "count": 1
                },
                {
                    "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Ruotsi>",
                    "text": "Ruotsi",
                    "count": 118
                },
                {
                    "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Viro>",
                    "text": "Viro",
                    "count": 127
                },
                {
                    "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Tanska>",
                    "text": "Tanska",
                    "count": 16
                },
                {
                    "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Tuntematon>",
                    "text": "Tuntematon",
                    "count": 7
                },
                {
                    "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Neuvostoliitto>",
                    "text": "Neuvostoliitto",
                    "count": 92
                },
                {
                    "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Suomi>",
                    "text": "Suomi",
                    "count": 94332
                }
                ]
            }
        }
    };

    var unknownGenderFacetObjectList = [
    {
        "id": "<http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus>",
            "values": [
            {
                "value": undefined,
                "text": "-- No Selection --",
                "count": 94696
            },
            {
                "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Italia>",
                "text": "Italia",
                "count": 1
            },
            {
                "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Saksa>",
                "text": "Saksa",
                "count": 1
            },
            {
                "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Norja>",
                "text": "Norja",
                "count": 1
            },
            {
                "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Unkari>",
                "text": "Unkari",
                "count": 1
            },
            {
                "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Ruotsi>",
                "text": "Ruotsi",
                "count": 118
            },
            {
                "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Viro>",
                "text": "Viro",
                "count": 127
            },
            {
                "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Tanska>",
                "text": "Tanska",
                "count": 16
            },
            {
                "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Tuntematon>",
                "text": "Tuntematon",
                "count": 7
            },
            {
                "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Neuvostoliitto>",
                "text": "Neuvostoliitto",
                "count": 92
            },
            {
                "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Suomi>",
                "text": "Suomi",
                "count": 94332
            }
        ]
    },
    {
        "id": "<http://ldf.fi/schema/narc-menehtyneet1939-45/sukupuoli>",
        "values": [
        {
            "value": undefined,
            "text": "-- No Selection --",
            "count": 94696
        },
        {
            "value": "<http://ldf.fi/narc-menehtyneet1939-45/sukupuoli/Nainen>",
            "text": "Nainen",
            "count": 405
        },
        {
            "value": "<http://ldf.fi/narc-menehtyneet1939-45/sukupuoli/Tuntematon>",
            "text": "Tuntematon",
            "count": 5
        },
        {
            "value": "<http://ldf.fi/narc-menehtyneet1939-45/sukupuoli/Mies>",
            "text": "Mies",
            "count": 94286
        }
        ]
    }
    ];
    /* eslint-enable */

    function getResponse(qry) {
        var response;
        switch(this._testResponse) {
            case 'nationalityAndGender':
                response = nationalityAndGenderResponse;
                break;
            case 'unknownGenderSelected':
                response = unknownGenderSelectedResponse;
                break;
            default:
                response = nationalityResponse;
        }
        var deferred = $q.defer();
        deferred.resolve(response);
        $rootScope.$apply();

        return deferred.promise;
    }

    function getUnknownGenderSelectedReponse() {
        return unknownGenderSelectedResponse;
    }

    function getExpectedNationalityFacetState() {
        return expectedNationalityFacetState;
    }

    function getExpectedNationalityAndGenderFacetState() {
        return expectedNationalityAndGenderFacetState;
    }

    function getExpectedUnknownGenderFacetState() {
        return expectedUnknownGenderSelectedFacetState;
    }

    function getUnknownGenderFacetObjectList() {
        return unknownGenderFacetObjectList;
    }
});

/*
   facets = {
   '<http://www.w3.org/2004/02/skos/core#prefLabel>': { name: 'Nimi', type: 'text' },
   '<kuolinaika>' : {
   name: 'Kuolinaikarange',
   type: 'timespan',
   start: '<http://ldf.fi/schema/narc-menehtyneet1939-45/kuolinaika>',
   end: '<http://ldf.fi/schema/narc-menehtyneet1939-45/kuolinaika>',
   min: '1939-10-01',
   max: '1989-12-31'
   },
   '<http://ldf.fi/schema/narc-menehtyneet1939-45/ammatti>': {
   name: 'Ammatti',
   enabled: true
   },
   '<http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus>': {
   name: 'Kansalaisuus',
   enabled: true
   }
   '<http://ldf.fi/schema/narc-menehtyneet1939-45/asuinkunta>': { name: 'Asuinkunta' },
   '<http://ldf.fi/schema/narc-menehtyneet1939-45/kuolinkunta>': { name: 'Kuolinkunta' },
   '<http://ldf.fi/schema/narc-menehtyneet1939-45/kuolinaika>': { name: 'Kuolinaika' },
   '<http://ldf.fi/schema/narc-menehtyneet1939-45/osasto>': { name: 'Joukko-osasto' },
   '<http://ldf.fi/schema/narc-menehtyneet1939-45/sukupuoli>': { name: 'Sukupuoli' },
   '<http://ldf.fi/schema/narc-menehtyneet1939-45/sotilasarvo>': {
   enabled: true,
   name: 'Sotilasarvo',
   type: 'hierarchy',
   property: '<http://purl.org/dc/terms/isPartOf>*|(<http://rdf.muninn-project.org/ontologies/organization#equalTo>/<http://purl.org/dc/terms/isPartOf>*)',
   classes: [
   '<http://ldf.fi/warsa/actors/ranks/Upseeri>',
   '<http://ldf.fi/warsa/actors/ranks/Aliupseeri>',
   '<http://ldf.fi/warsa/actors/ranks/Miehistoe>'
   ]
   }
   };
   */
