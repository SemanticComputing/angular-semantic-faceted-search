(function() {
    'use strict';

    /*
    * Service for transforming SPARQL result triples into more manageable objects.
    *
    * Author Erkki Heino.
    */
    /* eslint-disable angular/no-service-method */
    angular.module('sparqlMapper', [])

    .constant('_', _) // eslint-disable-line no-undef

    .service('objectMapperService', objectMapperService);

    /* ngInject */
    function objectMapperService(_) {
        ObjectMapper.prototype.makeObject = makeObject;
        ObjectMapper.prototype.mergeObjects = mergeObjects;
        ObjectMapper.prototype.postProcess = postProcess;
        ObjectMapper.prototype.makeObjectList = makeObjectList;
        ObjectMapper.prototype.makeObjectListNoGrouping = makeObjectListNoGrouping;

        return new ObjectMapper();

        function ObjectMapper() {
            this.objectClass = Object;
        }


        function makeObject(obj) {
            // Flatten the obj. Discard everything except values.
            // Assume that each property of the obj has a value property with
            // the actual value.
            var o = new this.objectClass();

            _.forIn(obj, function(value, key) {
                o[key] = value.value;
            });

            return o;
        }


        function mergeObjects(first, second) {
            // Merge two objects into one object.
            return _.mergeWith(first, second, function(a, b) {
                if (_.isEqual(a, b)) {
                    return a;
                }
                if (_.isArray(a)) {
                    if (_.isArray(b)) {
                        var res = [];
                        a.concat(b).forEach(function(val) {
                            var value = _.find(res, function(earlierVal) {
                                return _.isEqual(val, earlierVal);
                            });
                            if (!value) {
                                res.push(val);
                            }
                        });
                        return res;
                    }
                    if (_.find(a, function(val) { return _.isEqual(val, b); })) {
                        return a;
                    }
                    return a.concat(b);
                }
                if (a && !b) {
                    return a;
                }
                if (b && !a) {
                    return b;
                }
                if (_.isArray(b)) {
                    return b.concat(a);
                }

                return [a, b];
            });
        }

        function postProcess(objects) {
            return objects;
        }

        function makeObjectList(objects) {
            // Create a list of the SPARQL results where triples with the same
            // subject are merged into one object.
            var self = this;
            var obj_list = _.transform(objects, function(result, obj) {
                if (!obj.id) {
                    return null;
                }
                obj = self.makeObject(obj);
                // Check if this object has been constructed earlier
                var old = _.find(result, function(e) {
                    return e.id === obj.id;
                });
                if (old) {
                    // Merge this triple into the object constructed earlier
                    self.mergeObjects(old, obj);
                }
                else {
                    // This is the first triple related to the id
                    result.push(obj);
                }
            });
            return self.postProcess(obj_list);
        }

        function makeObjectListNoGrouping(objects) {
            // Create a list of the SPARQL results where each triple is treated
            // as a separated object.
            var self = this;
            var obj_list = _.transform(objects, function(result, obj) {
                obj = self.makeObject(obj);
                result.push(obj);
            });
            return obj_list;
        }
    }
})();
