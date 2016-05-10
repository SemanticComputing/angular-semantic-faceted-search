/* eslint-env jasmine */
/* global inject, module  */

describe('facetSelectionFormatter', function() {
    var facetSelectionFormatter, facets;

    beforeEach(module('seco.facetedSearch'));

    beforeEach(inject(function(_facetSelectionFormatter_) {
        facetSelectionFormatter = _facetSelectionFormatter_;

        facets = {
            '<basic>': {
                name: 'Basic'
            },
            '<other_basic>': {
                name: 'Other basic'
            },
            '<text>': {
                name: 'Name',
                type: 'text'
            },
            '<text2>': {
                name: 'Name2',
                type: 'text'
            },
            '<time_different_property>' : {
                name: 'Kuolinaikarange',
                type: 'timespan',
                start: '<start>',
                end: '<end>',
                min: '1939-10-01',
                max: '1989-12-31'
            },
            '<time_same_property>' : {
                name: 'Time',
                type: 'timespan',
                start: '<time>',
                end: '<time>',
                min: '1939-10-01',
                max: '1989-12-31'
            },
            '<complex_time>' : {
                name: 'Complex time',
                type: 'timespan',
                start: '<start>',
                end: '<end>',
                isResource: true,
                min: '1939-10-01',
                max: '1989-12-31'
            },
            '<hierarchy>': {
                name: 'Sotilasarvo',
                type: 'hierarchy',
                property: '<isPartOf>*',
                classes: [
                    '<Upseeri>',
                    '<Aliupseeri>',
                    '<Miehistoe>'
                ]
            }
        };
    }));

    it('should format basic facets', function() {
        var parsed = facetSelectionFormatter.parseBasicFacet(
            { value: '<value>' }, '<basic>');

        expect(parsed).toContain('?s <basic> <value> .');
    });

    it('should format basic facets even if value is an array', function() {
        var parsed = facetSelectionFormatter.parseBasicFacet(
            [{ value: '<value>' }, { value: '<value2>' }],
            '<basic>');

        expect(parsed).toContain('?s <basic> <value> .');
        expect(parsed).toContain('?s <basic> <value2> .');
    });

    it('should format text facets', function() {
        var parsed = facetSelectionFormatter.parseTextFacet(
            { value: 'Pertti Turtti' }, '<text>', 0);

        expect(parsed).toContain('?s <text> ?text0 .');
        expect(parsed).toContain('FILTER(CONTAINS(LCASE(?text0), "pertti"))');
        expect(parsed).toContain('FILTER(CONTAINS(LCASE(?text0), "turtti"))');
    });

    it('should format simple time span facets', function() {
        var start = '1999-01-01';
        var end = '2000-02-02';
        var parsed = facetSelectionFormatter.parseTimeSpanFacet(
            { value: { start: new Date(start), end: new Date(end) } },
            '<time_different_property>', facets);

        expect(parsed).toContain('?s <start> ?start .');
        expect(parsed).toContain('?s <end> ?end .');
        expect(parsed).toContain('FILTER(?start >= "' + start +
                '"^^<http://www.w3.org/2001/XMLSchema#date>)');
        expect(parsed).toContain('FILTER(?end <= "' + end +
                '"^^<http://www.w3.org/2001/XMLSchema#date>)');
    });

    it('should format simple time span facets even if end is missing', function() {
        var start = '1999-01-01';
        var parsed = facetSelectionFormatter.parseTimeSpanFacet(
            { value: { start: new Date(start) } }, '<time_different_property>', facets);

        expect(parsed).toContain('?s <start> ?start .');
        expect(parsed).toContain('FILTER(?start >= "' + start +
                '"^^<http://www.w3.org/2001/XMLSchema#date>)');
        expect(parsed).not.toContain('FILTER(?end');
    });

    it('should format simple time span facets even if start is missing', function() {
        var end = '1999-01-01';
        var parsed = facetSelectionFormatter.parseTimeSpanFacet(
            { value: { end: new Date(end) } }, '<time_different_property>', facets);

        expect(parsed).toContain('?s <end> ?end .');
        expect(parsed).toContain('FILTER(?end <= "' + end +
                '"^^<http://www.w3.org/2001/XMLSchema#date>)');
        expect(parsed).not.toContain('FILTER(?start');
    });

    it('should should optimize time span facets if start and end are equal', function() {
        var start = '1999-01-01';
        var end = '1999-01-01';
        var parsed = facetSelectionFormatter.parseTimeSpanFacet(
            { value: { start: new Date(start), end: new Date(end) } },
            '<time_same_property>', facets);

        expect(parsed).toContain('?s <time> ?start .');
        expect(parsed).toContain('FILTER(?start >= "' + start +
                '"^^<http://www.w3.org/2001/XMLSchema#date>)');
        expect(parsed).toContain('FILTER(?start <= "' + start +
                '"^^<http://www.w3.org/2001/XMLSchema#date>)');
        expect(parsed).not.toContain('FILTER(?end');
    });

    it('should format complex time span facets', function() {
        var start = '1999-01-01';
        var end = '2000-02-02';
        var parsed = facetSelectionFormatter.parseTimeSpanFacet(
            { value: { start: new Date(start), end: new Date(end) } },
            '<complex_time>', facets);

        expect(parsed).toContain('?s <complex_time> ?time_span_uri .');
        expect(parsed).toContain('?time_span_uri <end> ?end .');
        expect(parsed).toContain('?time_span_uri <start> ?start .');
        expect(parsed).toContain('FILTER(?start >= "' + start +
                '"^^<http://www.w3.org/2001/XMLSchema#date>)');
        expect(parsed).toContain('FILTER(?end <= "' + end +
                '"^^<http://www.w3.org/2001/XMLSchema#date>)');
    });

    it('should format hierarchy facets', function() {
        var parsed = facetSelectionFormatter.parseHierarchyFacet(
            { value: '<value>' }, '<hierarchy>', facets, 0);

        expect(parsed).toContain('?h0 <isPartOf>* <value> .');
        expect(parsed).toContain('?s <hierarchy> ?h0 .');
    });

    it('should format hierarchy facets even if value is an array', function() {
        var parsed = facetSelectionFormatter.parseHierarchyFacet(
            [{ value: '<value>' }, { value: '<value2>' }],
            '<hierarchy>', facets, 0);

        expect(parsed).toContain('?h0 <isPartOf>* <value> .');
        expect(parsed).toContain('?h0_0 <isPartOf>* <value2> .');
        expect(parsed).toContain('?s <hierarchy> ?h0 .');
        expect(parsed).toContain('?s <hierarchy> ?h0_0 .');
    });

    describe('parseFacetSelections', function() {
        it('should format basic facets', function() {
            var parsed = facetSelectionFormatter.parseFacetSelections(
                facets, getBasicFacetSelections());

            expect(parsed).toContain('?s <basic> <value> .');
            expect(parsed).toContain('?s <other_basic> <other1> .');
            expect(parsed).toContain('?s <other_basic> <other2> .');
        });

        it('should format text facets', function() {
            var parsed = facetSelectionFormatter.parseFacetSelections(
                facets, getTextFacetSelections());

            expect(parsed).toContain('?s <text> ?text0 .');
            expect(parsed).toContain('?s <text2> ?text1 .');
            expect(parsed).toContain('FILTER(CONTAINS(LCASE(?text0), "terve"))');
            expect(parsed).toContain('FILTER(CONTAINS(LCASE(?text1), "moro"))');
        });

        it('should format time span facets', function() {
            var parsed = facetSelectionFormatter.parseFacetSelections(
                facets, getTimeSpanFacetSelections());

            expect(parsed).toContain('?s <start> ?start .');
            expect(parsed).toContain('?s <end> ?end .');
            expect(parsed).toContain(
                'FILTER(?start >= "1900-01-01"^^<http://www.w3.org/2001/XMLSchema#date>)');
            expect(parsed).toContain(
                'FILTER(?end <= "1999-03-03"^^<http://www.w3.org/2001/XMLSchema#date>)');
        });

        it('should handle multiple facet selections', function() {
            var parsed = facetSelectionFormatter.parseFacetSelections(
                facets, getMultipleFacetSelections());

            expect(parsed).toContain('?s <basic> <value> .');
            expect(parsed).toContain('?s <other_basic> <other1> .');
            expect(parsed).toContain('?s <other_basic> <other2> .');

            expect(parsed).toContain('?s <text> ?text0 .');
            expect(parsed).toContain('FILTER(CONTAINS(LCASE(?text0), "terve"))');

            expect(parsed).toContain('?s <text2> ?text1 .');
            expect(parsed).toContain('FILTER(CONTAINS(LCASE(?text1), "moro"))');

            expect(parsed).toContain('?s <start> ?start .');
            expect(parsed).toContain('?s <end> ?end .');
            expect(parsed).toContain(
                'FILTER(?start >= "1900-01-01"^^<http://www.w3.org/2001/XMLSchema#date>)');
            expect(parsed).toContain(
                'FILTER(?end <= "1999-03-03"^^<http://www.w3.org/2001/XMLSchema#date>)');
        });
    });


    var basicFacetSelections = {
        '<basic>': { value: '<value>' },
        '<other_basic>': [
            { value: '<other1>' },
            { value: '<other2>' }
        ]
    };

    var textFacetSelections = {
        '<text>': { value: 'terve' },
        '<text2>': { value: 'moro' }
    };

    var timeSpanFacetSelections = {
        '<time_different_property>': {
            value: { start: new Date('1900-01-01'), end: new Date('1999-03-03') }
        }
    };

    var multipleFacetsSelected = {
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

    function getBasicFacetSelections() {
        return basicFacetSelections;
    }

    function getTextFacetSelections() {
        return textFacetSelections;
    }

    function getTimeSpanFacetSelections() {
        return timeSpanFacetSelections;
    }

    function getMultipleFacetSelections() {
        return multipleFacetsSelected;
    }
});
