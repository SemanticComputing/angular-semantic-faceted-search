(function() {

    'use strict';

    /* eslint-disable angular/no-service-method */
    angular.module('facets')
    .factory('FacetSelectionFormatter', function (_) {
        return function( facets ) {

            this.parseFacetSelections = parseFacetSelections;
            this.parseBasicFacet = parseBasicFacet;

            var resourceTimeSpanFilterTemplate =
            ' ?s <TIME_SPAN_PROPERTY> ?time_span_uri . ' +
            ' <START_FILTER> ' +
            ' <END_FILTER> ';

            var simpleTimeSpanFilterTemplate =
            ' <START_FILTER> ' +
            ' <END_FILTER> ';

            var timeSpanStartFilter =
            ' <TIME_SPAN_URI> <START_PROPERTY> ?start . ' +
            ' FILTER(?start >= "<START_VALUE>"^^<http://www.w3.org/2001/XMLSchema#date>) ';

            var timeSpanEndFilter =
            ' <TIME_SPAN_URI> <END_PROPERTY> ?end . ' +
            ' FILTER(?end <= "<END_VALUE>"^^<http://www.w3.org/2001/XMLSchema#date>) ';

            var timeSpanEndFilterSimple =
            ' FILTER(?start <= "<END_VALUE>"^^<http://www.w3.org/2001/XMLSchema#date>) ';

            var simpleTimeSpanUri = '?s';
            var resourceTimeSpanUri = '?time_span_uri';

            function parseFacetSelections( facetSelections ) {
                var otherFacets = [];
                var textFacets = [];
                _.forOwn(facetSelections, function(facet, id) {
                    if (facets[id].type === 'text') {
                        textFacets.push({ id: id, val: facet });
                    } else {
                        otherFacets.push({ id: id, val: facet });
                    }
                });
                var selections = textFacets.concat(otherFacets);

                var result = '';
                var i = 0;
                _.forEach( selections, function( facet ) {
                    if (facet.val && facet.val.length) {
                        for (var j = 0; j < facet.val.length; j++) {
                            if (!facet.val[j].value) {
                                return;
                            }
                        }
                    } else if (!(facet.val && facet.val.value)) {
                        return;
                    }

                    var facetType = facets[facet.id].type;

                    switch (facetType) {
                        case 'timespan':
                            result = result + parseTimeSpanFacet(facet.val, facet.id);
                            break;
                        case 'text':
                            result = result + parseTextFacet(facet.val, facet.id, i++);
                            break;
                        default:
                            result = result + parseBasicFacet(facet.val, facet.id);
                    }
                });
                return result;
            }

            function parseBasicFacet(val, key) {
                var result = '';
                if (val.forEach) {
                    val.forEach(function(value) {
                        result = result + ' ?s ' + key + ' ' + value.value + ' . ';
                    });
                    return result;
                }
                return ' ?s ' + key + ' ' + val.value + ' . ';
            }

            function parseTextFacet(val, key, i) {
                var result = ' ?s text:query "' + val.value + '*" . ';
                var textVar = ' ?text' + i;
                result = result + ' ?s ' + key + ' ' + textVar + ' . ';
                var words = val.value.replace(/[,.-_*'\\/]/g, '');

                words.split(' ').forEach(function(word) {
                    result = result + ' FILTER(REGEX(' + textVar + ', "' + word + '", "i")) ';
                });

                return result;
            }

            function parseTimeSpanFacet(val, key) {
                var isResource = facets[key].isResource;
                var result = isResource ?
                        resourceTimeSpanFilterTemplate :
                        simpleTimeSpanFilterTemplate;

                var start = (val.value || {}).start;
                var end = (val.value || {}).end;

                var endFilter = timeSpanEndFilter;
                var facet = facets[key];

                if (facet.start === facet.end) {
                    endFilter = timeSpanEndFilterSimple;
                }
                if (start) {
                    start = dateToISOString(start);
                    result = result
                        .replace('<START_FILTER>',
                            timeSpanStartFilter.replace('<START_PROPERTY>',
                                facet.start))
                        .replace('<TIME_SPAN_URI>',
                                isResource ? resourceTimeSpanUri : simpleTimeSpanUri)
                        .replace('<START_VALUE>', start);
                } else {
                    result = result.replace('<START_FILTER>', '');
                }
                if (end) {
                    end = dateToISOString(end);
                    result = result.replace('<END_FILTER>',
                            endFilter.replace('<END_PROPERTY>',
                                facet.end))
                        .replace('<TIME_SPAN_URI>',
                                isResource ? resourceTimeSpanUri : simpleTimeSpanUri)
                        .replace('<END_VALUE>', end);
                } else {
                    result = result.replace('<END_FILTER>', '');
                }
                return result.replace('<TIME_SPAN_PROPERTY>', key);
            }

            function dateToISOString(date) {
                return date.toISOString().slice(0, 10);
            }
        };
    });
})();
