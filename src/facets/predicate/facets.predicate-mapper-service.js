(function() {
    'use strict';

    angular.module('seco.facetedSearch')

    .factory('predicateMapperService', predicateMapperService);

    /* ngInject */
    function predicateMapperService(_, objectMapperService) {
        PredicateMapper.prototype.makeObject = makeObject;

        var proto = Object.getPrototypeOf(objectMapperService);
        PredicateMapper.prototype = angular.extend({}, proto, PredicateMapper.prototype);

        return new PredicateMapper();

        function PredicateMapper() {
            this.objectClass = Object;
        }

        function makeObject(obj) {
            var o = new this.objectClass();

            o.value = obj.value.value;
            o.text = obj.label.value;

            return o;
        }
    }
})();
