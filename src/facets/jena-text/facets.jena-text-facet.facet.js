(function() {
    'use strict';

    angular.module('seco.facetedSearch')
    .value('textQueryPredicate', '<http://jena.apache.org/text#query>')
    .factory('JenaTextFacet', JenaTextFacet);

    /* ngInject */
    function JenaTextFacet(_, TextFacet, textQueryPredicate) {

        JenaTextFacet.prototype = Object.create(TextFacet.prototype);
        JenaTextFacet.prototype.getConstraint = getConstraint;

        return JenaTextFacet;

        function JenaTextFacet(options) {
            TextFacet.call(this, options);
            this.config.priority = this.config.priority || 10;
        }

        function getConstraint() {
            var value = this.getSelectedValue();
            if (!value) {
                return;
            }
            var quoteRepl;
            if ((value.match(/"/g) || []).length % 2) {
                // Unbalanced quotes, remove them
                quoteRepl = '';
            } else {
                // Balanced quotes, escape them
                quoteRepl = '\\"';
            }
            value = value.replace(/"/g, quoteRepl).trim();

            var args = [];
            if (this.config.predicate) {
                args.push(this.config.predicate);
            }

            args.push('"' + value + '"');

            if (this.config.limit) {
                args.push(this.config.limit);
            }

            var obj = '(' + args.join(' ') + ')';

            var result = '(?id ?score) ' + textQueryPredicate + ' ' + obj + ' .';

            if (this.config.graph) {
                result = 'GRAPH ' + this.config.graph + ' { ' + result + ' }';
            }

            return result;
        }
    }
})();
