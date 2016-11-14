(function() {
    'use strict';

    angular.module('seco.facetedSearch')
    .factory('JenaTextFacet', JenaTextFacet);

    /* ngInject */
    function JenaTextFacet(_, TextFacet) {

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
            value = value.replace(/[,._'"\\/-]/g, ' ').trim();
            var args = [];
            if (this.config.predicate) {
                args.push(this.config.predicate);
            }

            args.push('"' + value + '"');

            if (this.config.limit) {
                args.push(this.config.limit);
            }

            var obj = '(' + args.join(' ') + ')';

            var result = ' ?id <http://jena.apache.org/text#query> ' + obj + ' . ';

            if (this.config.graph) {
                result = ' GRAPH ' + this.config.graph + ' { ' + result + ' } ';
            }

            return result;
        }
    }
})();
