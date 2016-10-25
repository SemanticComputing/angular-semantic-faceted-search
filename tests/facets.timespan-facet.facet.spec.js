/* eslint-env jasmine */
/* global inject, module  */

describe('TimespanFacet', function() {
    var TimespanFacet, facet, options;

    beforeEach(module('seco.facetedSearch'));
    beforeEach(inject(function(_TimespanFacet_) {

        TimespanFacet = _TimespanFacet_;

        options = {
            name: 'Timespan',
            startPredicate: '<http://ldf.fi/start>',
            endPredicate: '<http://ldf.fi/end>',
            facetId: 'spanId',
            min: '1939-10-01',
            max: '1989-12-31',
            enabled: true
        };

        facet = new TimespanFacet(options);

    }));

    it('should be enabled if config says so', function() {
        expect(facet.isEnabled()).toBe(true);
    });

    it('should be disabled if config says so', function() {
        options.enabled = false;
        facet = new TimespanFacet(options);

        expect(facet.isEnabled()).toBe(false);
    });

    it('should get its initial value from config', function() {
        var d = new Date('1945-02-02');
        var val = { start: d, end: d };
        options.initialConstraints = { facets: { spanId: { value: val } } };

        var facet = new TimespanFacet(options);

        expect(facet.getSelectedValue()).toEqual(val);
    });

    describe('enable', function() {
        it('should enable the facet', function() {
            options.enabled = false;
            facet = new TimespanFacet(options);

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
            var d = new Date();
            var val = { start: d, end: d };
            facet.selectedValue = val;

            expect(facet.getSelectedValue()).toEqual(val);
        });
    });

    describe('getConstraint', function() {
        it('should return a constraint based on the selected value', function() {
            var start = new Date('1945-02-02');
            var end = new Date('1945-03-02');

            var val = { start: start, end: end };
            facet.selectedValue = val;

            var filter = 'FILTER(?start_spanId >= "' + start.toISOString().slice(0, 10) +
                    '"^^<http://www.w3.org/2001/XMLSchema#date>)';

            var isIncluded = (facet.getConstraint().indexOf(filter) > -1);
            expect(isIncluded).toBe(true);

            filter = 'FILTER(?end_spanId <= "' + end.toISOString().slice(0, 10) +
                    '"^^<http://www.w3.org/2001/XMLSchema#date>)';

            isIncluded = (facet.getConstraint().indexOf(filter) > -1);
            expect(isIncluded).toBe(true);
        });

        it('should use only one variable if start and end properties are the same', function() {
            options.endPredicate = options.startPredicate;
            facet = new TimespanFacet(options);

            var start = new Date('1945-02-02');
            var end = new Date('1945-03-02');

            var val = { start: start, end: end };
            facet.selectedValue = val;

            var filter = 'FILTER(?start_spanId >= "' + start.toISOString().slice(0, 10) +
                    '"^^<http://www.w3.org/2001/XMLSchema#date>)';

            var isIncluded = (facet.getConstraint().indexOf(filter) > -1);
            expect(isIncluded).toBe(true);

            filter = 'FILTER(?start_spanId <= "' + end.toISOString().slice(0, 10) +
                    '"^^<http://www.w3.org/2001/XMLSchema#date>)';

            isIncluded = (facet.getConstraint().indexOf(filter) > -1);
            expect(isIncluded).toBe(true);
        });
    });
});
