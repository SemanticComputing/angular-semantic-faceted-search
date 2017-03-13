(function() {
    'use strict';

    /*
    * Service for transforming SPARQL result triples into facet objects.
    *
    * Author Erkki Heino.
    */
    angular.module('seco.facetedSearch')

    .factory('facetMapperService', facetMapperService);

    /* ngInject */
    function facetMapperService(_, objectMapperService) {
        FacetMapper.prototype.makeObject = makeObject;
        FacetMapper.prototype.makeObjectListNoGrouping = makeObjectListNoGrouping;

        var proto = Object.getPrototypeOf(objectMapperService);
        FacetMapper.prototype = angular.extend({}, proto, FacetMapper.prototype);

        return new FacetMapper();

        function FacetMapper() {
            this.objectClass = Object;
        }

        function makeObject(obj) {
            var o = new this.objectClass();

            o.value = parseValue(obj.value);
            o.text = obj.facet_text.value;
            o.count = parseInt(obj.cnt.value);

            return o;
        }

        function makeObjectListNoGrouping(objects) {
            var self = this;
            var obj_list = _.transform(objects, function(result, obj) {
                obj = self.makeObject(obj);
                var last = _.last(result);
                if (last && last.value === obj.value) {
                    if (obj.facet_text) {
                        last.facet_text = last.facet_text ? last.face_text + ', ' + obj.face_text : obj.face_text;
                    }
                } else {
                    result.push(obj);
                }
            });
            return obj_list;
        }

        function parseValue(value) {
            if (!value) {
                return undefined;
            }
            if (value.type === 'uri') {
                return '<' + value.value + '>';
            }
            if (_.includes(value.type, 'literal') && value.datatype === 'http://www.w3.org/2001/XMLSchema#integer') {
                return value.value;
            }
            if (_.includes(value.type, 'literal') && value.datatype) {
                return '"' + value.value + '"^^<' + value.datatype + '>';
            }
            return '"' + value.value + '"' + (value['xml:lang'] ? '@' + value['xml:lang'] : '');
        }

    }
})();
