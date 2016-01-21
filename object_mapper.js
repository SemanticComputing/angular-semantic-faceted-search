'use strict';

/*
 * Service for transforming SPARQL result triples into more manageable objects.
 *
 * Author Erkki Heino.
 */

function ObjectMapper() {
    this.objectClass = Object;
}

ObjectMapper.prototype.makeObject = function(obj) {
    // Flatten the obj. Discard everything except values.
    // Assume that each property of the obj has a value property with
    // the actual value.
    var o = new this.objectClass();

    _.forIn(obj, function(value, key) {
        o[key] = value.value;
    });

    return o;
};

ObjectMapper.prototype.mergeObjects = function(first, second) {
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
};

ObjectMapper.prototype.postProcess = function(objects) {
    return objects;
};

ObjectMapper.prototype.makeObjectList = function(objects) {
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
};

ObjectMapper.prototype.makeObjectListNoGrouping = function(objects) {
    // Create a list of the SPARQL results where each triple is treated
    // as a separated object.
    var self = this;
    var obj_list = _.transform(objects, function(result, obj) {
        obj = self.makeObject(obj);
        result.push(obj);
    });
    return obj_list;
};

function FacetMapper() {
    this.objectClass = Object;
}

function parseValue(value) {
    if (value.type === 'uri') {
        return '<' + value.value + '>';
    }
    if (value.type === 'typed-literal' && value.datatype === 'http://www.w3.org/2001/XMLSchema#integer') {
        return value.value;
    }
    return '"' + value.value + '"';
}

FacetMapper.prototype.makeObject = function(obj) {
    var o = new this.objectClass();

    o.id = '<' + obj.id.value + '>';

    o.values = [{
        value: parseValue(obj.value),
        text: obj.facet_text.value,
        count: parseInt(obj.cnt.value)
    }];

    return o;
}

FacetMapper.prototype.mergeObjects = function(first, second) {
    first.values.push(second.values[0]);
    return first;
}

angular.module('facetApp')
.service('objectMapperService', ObjectMapper)
.factory('facetMapperService', function(objectMapperService) {
        var proto = Object.getPrototypeOf(objectMapperService);
        FacetMapper.prototype = angular.extend({}, proto, FacetMapper.prototype);

        return new FacetMapper();
});
