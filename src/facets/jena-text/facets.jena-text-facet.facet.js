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
            var obj;
            if (this.config.predicate) {
                obj = '(' + this.config.predicate + ' "' + value + '" )';
            } else {
                obj = '"' + value + '"';

            }
            var result = ' ?id <http://jena.apache.org/text#query> ' + obj + ' . ';

            return result;
        }
    }
})();
