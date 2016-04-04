/* eslint-env jasmine */
/* global inject, module  */

describe('Facets', function() {
    var mock, mockConstructor, facets, facetOptions, instance,
        $rootScope, $q, Facets;

    beforeEach(module('seco.facetedSearch'));
    beforeEach(module(function($provide) {
        mock = { getObjects: getNationalityResponse };
        mockConstructor = function() { return mock; };

        $provide.value('SparqlService', mockConstructor);
    }));

    beforeEach(inject(function(_$rootScope_, _$q_, _Facets_){
        $rootScope = _$rootScope_;
        $q = _$q_;
        Facets = _Facets_;

        facets = {
            /*
            '<http://www.w3.org/2004/02/skos/core#prefLabel>': { name: 'Nimi', type: 'text' },
            '<kuolinaika>' : {
                name: 'Kuolinaikarange',
                type: 'timespan',
                start: '<http://ldf.fi/schema/narc-menehtyneet1939-45/kuolinaika>',
                end: '<http://ldf.fi/schema/narc-menehtyneet1939-45/kuolinaika>',
                min: '1939-10-01',
                max: '1989-12-31'
            },
            '<http://ldf.fi/schema/narc-menehtyneet1939-45/ammatti>': {
                name: 'Ammatti',
                enabled: true
            },
            */
            '<http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus>': {
                name: 'Kansalaisuus',
                enabled: true
            }
            /*
            '<http://ldf.fi/schema/narc-menehtyneet1939-45/asuinkunta>': { name: 'Asuinkunta' },
            '<http://ldf.fi/schema/narc-menehtyneet1939-45/kuolinkunta>': { name: 'Kuolinkunta' },
            '<http://ldf.fi/schema/narc-menehtyneet1939-45/kuolinaika>': { name: 'Kuolinaika' },
            '<http://ldf.fi/schema/narc-menehtyneet1939-45/osasto>': { name: 'Joukko-osasto' },
            '<http://ldf.fi/schema/narc-menehtyneet1939-45/sukupuoli>': { name: 'Sukupuoli' },
            '<http://ldf.fi/schema/narc-menehtyneet1939-45/sotilasarvo>': {
                enabled: true,
                name: 'Sotilasarvo',
                type: 'hierarchy',
                property: '<http://purl.org/dc/terms/isPartOf>*|(<http://rdf.muninn-project.org/ontologies/organization#equalTo>/<http://purl.org/dc/terms/isPartOf>*)',
                classes: [
                    '<http://ldf.fi/warsa/actors/ranks/Upseeri>',
                    '<http://ldf.fi/warsa/actors/ranks/Aliupseeri>',
                    '<http://ldf.fi/warsa/actors/ranks/Miehistoe>'
                ]
            }
            */
        };
        facetOptions = {
            endpointUrl: '',
            //graph : '<http://ldf.fi/narc-menehtyneet1939-45/>',
            rdfClass: '<http://www.cidoc-crm.org/cidoc-crm/E31_Document>',
            preferredLang : 'fi',
            updateResults: handleSelections,
            disableFacets: disableFacets
        };

        instance = new Facets(facets, facetOptions);
    }));

    beforeEach(inject(function(){
        spyOn(mock, 'getObjects').and.callThrough();
        spyOn(facetOptions, 'updateResults').and.callThrough();
        spyOn(facetOptions, 'disableFacets').and.callThrough();
    }));


    function disableFacets() { }

    function handleSelections(selections) { }


    it('should call SparqlService.getObjects in update', function() {
        instance.update();
        expect(mock.getObjects).toHaveBeenCalled();
    });

    it('should call the given callback function in update', function() {
        instance.update();
        expect(facetOptions.updateResults).toHaveBeenCalled();
    });

    it('should not call the given disableFacets function in update', function() {
        instance.update();
        expect(facetOptions.disableFacets).not.toHaveBeenCalled();
    });

    it('should update facet states according to query results', function() {
        var results;

        instance.update().then(function(res) {
            results = res;
        });
        $rootScope.$apply();
        expect(results).toEqual(getExpectedNationalityFacetState());
    });

    /* eslint-disable */
    var nationalityResponse = [
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "1" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus" } ,
            "facet_text": { "type": "literal" , "xml:lang": "fi" , "value": "Italia" } ,
            "value": { "type": "uri" , "value": "http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Italia" }
        } ,
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "1" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus" } ,
            "facet_text": { "type": "literal" , "xml:lang": "fi" , "value": "Saksa" } ,
            "value": { "type": "uri" , "value": "http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Saksa" }
        } ,
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "1" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus" } ,
            "facet_text": { "type": "literal" , "xml:lang": "fi" , "value": "Norja" } ,
            "value": { "type": "uri" , "value": "http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Norja" }
        } ,
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "1" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus" } ,
            "facet_text": { "type": "literal" , "xml:lang": "fi" , "value": "Unkari" } ,
            "value": { "type": "uri" , "value": "http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Unkari" }
        } ,
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "118" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus" } ,
            "facet_text": { "type": "literal" , "xml:lang": "fi" , "value": "Ruotsi" } ,
            "value": { "type": "uri" , "value": "http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Ruotsi" }
        } ,
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "127" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus" } ,
            "facet_text": { "type": "literal" , "xml:lang": "fi" , "value": "Viro" } ,
            "value": { "type": "uri" , "value": "http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Viro" }
        } ,
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "16" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus" } ,
            "facet_text": { "type": "literal" , "xml:lang": "fi" , "value": "Tanska" } ,
            "value": { "type": "uri" , "value": "http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Tanska" }
        } ,
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "7" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus" } ,
            "facet_text": { "type": "literal" , "xml:lang": "fi" , "value": "Tuntematon" } ,
            "value": { "type": "uri" , "value": "http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Tuntematon" }
        } ,
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "92" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus" } ,
            "facet_text": { "type": "literal" , "xml:lang": "fi" , "value": "Neuvostoliitto" } ,
            "value": { "type": "uri" , "value": "http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Neuvostoliitto" }
        } ,
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "94332" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus" } ,
            "facet_text": { "type": "literal" , "xml:lang": "fi" , "value": "Suomi" } ,
            "value": { "type": "uri" , "value": "http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Suomi" }
        } ,
        {
            "cnt": { "datatype": "http://www.w3.org/2001/XMLSchema#integer" , "type": "typed-literal" , "value": "94696" } ,
            "id": { "type": "uri" , "value": "http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus" } ,
            "facet_text": { "type": "literal" , "value": "-- No Selection --" }
        }
    ];

    var expectedNationalityFacetState = {
        "<http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus>": {
            "name": "Kansalaisuus",
            "enabled": true,
            "state": {
                "id": "<http://ldf.fi/schema/narc-menehtyneet1939-45/kansalaisuus>",
                "values": [
                {
                    "value": undefined,
                    "text": "-- No Selection --",
                    "count": 94696
                },
                {
                    "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Italia>",
                    "text": "Italia",
                    "count": 1
                },
                {
                    "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Saksa>",
                    "text": "Saksa",
                    "count": 1
                },
                {
                    "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Norja>",
                    "text": "Norja",
                    "count": 1
                },
                {
                    "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Unkari>",
                    "text": "Unkari",
                    "count": 1
                },
                {
                    "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Ruotsi>",
                    "text": "Ruotsi",
                    "count": 118
                },
                {
                    "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Viro>",
                    "text": "Viro",
                    "count": 127
                },
                {
                    "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Tanska>",
                    "text": "Tanska",
                    "count": 16
                },
                {
                    "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Tuntematon>",
                    "text": "Tuntematon",
                    "count": 7
                },
                {
                    "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Neuvostoliitto>",
                    "text": "Neuvostoliitto",
                    "count": 92
                },
                {
                    "value": "<http://ldf.fi/narc-menehtyneet1939-45/kansalaisuus/Suomi>",
                    "text": "Suomi",
                    "count": 94332
                }
                ]
            }
        }
    };
    /* eslint-enable */

    function getNationalityResponse() {
        var deferred = $q.defer();
        deferred.resolve(nationalityResponse);
        $rootScope.$apply();

        return deferred.promise;
    }

    function getExpectedNationalityFacetState() {
        return expectedNationalityFacetState;
    }
});
