/*
* Facet handler service.
*/
(function() {
    'use strict';

    /* eslint-disable angular/no-service-method */
    angular.module('facets')

    .factory( 'Facets', Facets );

    /* ngInject */
    function Facets( $rootScope, $q, _, SparqlService, facetMapperService, FacetSelectionFormatter ) {
        return function( facets, config ) {
            var formatter = new FacetSelectionFormatter(facets);

            this.getStates = getStates;

            var facetStates = [];
            var endpoint = new SparqlService(config.endpointUrl);
            var queryTemplate = '' +
                ' PREFIX skos: <http://www.w3.org/2004/02/skos/core#>' +
                ' PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>' +
                ' PREFIX sf: <http://ldf.fi/functions#>' +

                ' SELECT ?cnt ?id ?facet_text ?value WHERE {' +
                '   { ' +
                '     {' +
                '       SELECT DISTINCT (count(DISTINCT ?s) as ?cnt) ?id ?value' +
                '       WHERE {' +
                '         VALUES ?id {' +
                '           <FACETS> ' +
                '         } ' +
                '         <GRAPH_START> ' +
                '           <CLASS> ' +
                '           <SELECTIONS> ' +
                '           ?s ?id ?value .' +
                '         <GRAPH_END> ' +
                '       } GROUP BY ?id ?value' +
                '     }' +
                '     OPTIONAL {' +
                '       ?value sf:preferredLanguageLiteral (skos:prefLabel "<PREF_LANG>" "" ?lbl) .' +
                '     }' +
                '     BIND(COALESCE(?lbl, ?value) as ?facet_text)' +
                '   }' +
                '   <DESELECTIONS> ' +
                ' } ' +
                ' ORDER BY ?id ?facet_text';
            queryTemplate = buildQueryTemplate(queryTemplate);

            var deselectUnionTemplate = '' +
           '     UNION { ' +
           '     { SELECT DISTINCT (count(DISTINCT ?s) as ?cnt) ' +
           '     WHERE { ' +
           '         GRAPH <http://ldf.fi/narc-menehtyneet1939-45/> { ' +
           '             <OTHER_SELECTIONS> ' +
           '         } ' +
           '     } ' +
           '     } ' +
           '     BIND("-- No Selection --" AS ?facet_text) ' +
           '     BIND(<DESELECTION> AS ?id) ' +
           ' }';

            function getStates(facetSelections) {
                var query = buildQuery(facetSelections);

                var promise = endpoint.getObjects(query);
                return promise.then(parseResults);
            }

            function parseResults( sparqlResults ) {
                facetStates = facetMapperService.makeObjectList(sparqlResults);
                return facetStates;
            }

            function buildQuery(facetSelections) {
                return queryTemplate.replace('<SELECTIONS>',
                        formatter.parseFacetSelections(facetSelections))
                        .replace('<DESELECTIONS>', buildDeselectionUnions(facetSelections));
            }

            function buildQueryTemplate(template) {
                var templateSubs = [
                    {
                        placeHolder: '<FACETS>',
                        value: getTemplateFacets()
                    },
                    {
                        placeHolder: '<GRAPH_START>',
                        value: (config.graph ? ' GRAPH ' + config.graph + ' { ' : '')
                    },
                    {
                        placeHolder: '<CLASS>',
                        value: (config.rdfClass ? ' ?s a ' + config.rdfClass + ' . ' : '')
                    },
                    {
                        placeHolder: '<GRAPH_END>',
                        value: (config.graph ? ' } ' : '') },
                    {
                        placeHolder: '<PREF_LANG>',
                        value: (config.preferredLang ? config.preferredLang : 'fi')
                    }
                ];

                templateSubs.forEach(function(s) {
                    template = template.replace(s.placeHolder, s.value);
                });
                return template;
            }

            function getTemplateFacets() {
                var res = [];
                _.forOwn(facets, function(facet, uri) {
                    if (facet.type != 'text') {
                        res.push(uri);
                    }
                });
                return res.join(' ');
            }

            function buildDeselectionUnions(facetSelections) {
                var deselections = [];
                _.forOwn( facets, function( val, key ) {
                    var s = deselectUnionTemplate.replace('<DESELECTION>', key);
                    var others = {};
                    _.forOwn( facets, function( v, k ) {
                        if (k !== key) {
                            var selected = facetSelections[k];
                            if (selected && selected.value) {
                                others[k] = facetSelections[k];
                            } else {
                                others[k] = v;
                            }
                        }
                    });
                    deselections.push(s.replace('<OTHER_SELECTIONS>',
                            formatter.parseFacetSelections(others) + ' ?s ?p ?o . '));
                });
                return deselections.join(' ');
            }

        };
    }
})();
