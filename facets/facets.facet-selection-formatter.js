(function() {

    'use strict';

    /* eslint-disable angular/no-service-method */
    angular.module('facets')
    .factory('FacetSelectionFormatter', function (_) {
        return function( facets ) {

            this.parseFacetSelections = parseFacetSelections;

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

            var simpleTimeSpanUri = '?s';
            var resourceTimeSpanUri = '?time_span_uri';

            function parseFacetSelections( facetSelections ) {
                var result = '';
                var i = 0;
                _.forOwn( facetSelections, function( val, key ) {
                    if (!(val && val.value)) {
                        return;
                    }

                    var facetType = facets[key].type;

                    switch (facetType) {
                        case 'timespan':
                            result = result + parseTimeSpanFacet(val, key);
                            break;
                        case 'text':
                            result = result + parseTextFacet(val, key, i++);
                            break;
                        default:
                            result = result + parseBasicFacet(val, key);
                    }
                });
                return result;
            }

            function parseBasicFacet(val, key) {
                return ' ?s ' + key + ' ' + val.value + ' . ';
            }

            function parseTextFacet(val, key, i) {
                var textVar = '?text' + i;
                var result = ' ?s ' + key + ' ' + textVar;
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
                if (start) {
                    result = result
                        .replace('<START_FILTER>',
                            timeSpanStartFilter.replace('<START_PROPERTY>',
                                facets[key].start))
                        .replace('<TIME_SPAN_URI>',
                                isResource ? resourceTimeSpanUri : simpleTimeSpanUri)
                        .replace('<START_VALUE>', start);
                } else {
                    result = result.replace('<START_FILTER>', '');
                }
                if (end) {
                    result = result.replace('<END_FILTER>',
                            timeSpanEndFilter.replace('<END_PROPERTY>',
                                facets[key].end))
                        .replace('<TIME_SPAN_URI>',
                                isResource ? resourceTimeSpanUri : simpleTimeSpanUri)
                        .replace('<END_VALUE>', end);
                } else {
                    result = result.replace('<END_FILTER>', '');
                }
                return result.replace('<TIME_SPAN_PROPERTY>', key);
            }
        };
    });
})();
