/* eslint-env jasmine */
/* global inject, module  */

describe('JenaTextFacet', function() {
    var JenaTextFacet, facet, options;

    beforeEach(module('seco.facetedSearch'));
    beforeEach(inject(function(_JenaTextFacet_) {

        JenaTextFacet = _JenaTextFacet_;

        options = {
            name: 'Name',
            facetId: 'textId',
            enabled: true
        };

        facet = new JenaTextFacet(options);

    }));

    it('should be enabled if config says so', function() {
        expect(facet.isEnabled()).toBe(true);
    });

    it('should be disabled if config says so', function() {
        options.enabled = false;
        facet = new JenaTextFacet(options);

        expect(facet.isEnabled()).toBe(false);
    });

    it('should get its initial value from config', function() {
        options.initial = { textId: { value: 'value' } };

        var facet = new JenaTextFacet(options);

        expect(facet.getSelectedValue()).toEqual('value');
    });

    describe('enable', function() {
        it('should enable the facet', function() {
            options.enabled = false;
            facet = new JenaTextFacet(options);

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

    describe('clear', function() {
        it('should clear the selected value', function() {
            facet.selectedValue = 'blaa';

            facet.clear();

            expect(facet.getSelectedValue()).toBeUndefined();
        });
    });

    describe('getSelectedValue', function() {
        it('should get the selected value', function() {
            facet.selectedValue = 'blaa';

            expect(facet.getSelectedValue()).toEqual('blaa');
        });
    });

    describe('getConstraint', function() {
        it('should return a constraint based on the selected value', function() {
            facet.selectedValue = 'blaa';

            var isIncluded = (facet.getConstraint().indexOf('blaa') > -1);

            expect(isIncluded).toBe(true);
        });

        it('should should contain the search as is', function() {
            var searchTerms = 'FoO BBAR';
            facet.selectedValue = searchTerms;

            var cons = facet.getConstraint();

            var isIncluded = (cons.indexOf(searchTerms) > -1);
            expect(isIncluded).toBe(true);
        });

        it('should work with or without a predicate', function() {
            var searchTerms = 'foo bar';
            var pred = '<http://www.w3.org/2004/02/skos/core#prefLabel>';

            facet.selectedValue = searchTerms;
            var cons = facet.getConstraint();

            var isIncluded = (cons.indexOf(searchTerms) > -1);
            expect(isIncluded).toBe(true);

            isIncluded = (cons.indexOf(pred) > -1);
            expect(isIncluded).toBe(false);

            options.predicate = pred;
            facet = new JenaTextFacet(options);

            facet.selectedValue = searchTerms;
            cons = facet.getConstraint();

            isIncluded = (cons.indexOf(searchTerms) > -1);
            expect(isIncluded).toBe(true);

            isIncluded = (cons.indexOf(pred) > -1);
            expect(isIncluded).toBe(true);
        });
    });
});
