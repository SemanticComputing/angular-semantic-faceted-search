(function() {
    'use strict';

    angular.module('seco.facetedSearch')
    .value('textQueryPredicate', '<http://jena.apache.org/text#query>')
    // These are intentionally missing '\'
    .value('textQueryParserSpecialCharacters', [
        '+', '-', '&&', '||', '!', '(', ')', '{', '}', '[', ']', '^', '"', '~', '*', '?', ':', '/'
    ])
    .value('textQueryParserReservedWords', [
        'AND', 'OR', 'NOT'
    ])
    .value('regexSpecialCharacters', [
        '+', '&', '|', '(', ')', '{', '}', '[', ']', '^', '*', '?', '$', '<', '>'
    ])
    .factory('JenaTextFacet', JenaTextFacet);

    /* ngInject */
    function JenaTextFacet(_, TextFacet, textQueryPredicate, textQueryParserSpecialCharacters,
            regexSpecialCharacters, textQueryParserReservedWords) {

        var charEscapeRegex = new RegExp(_.map(textQueryParserSpecialCharacters, function(char) {
            return _.map(char.split(''), function(charPart) {
                return _.includes(regexSpecialCharacters, charPart) ? '\\' + charPart : charPart;
            }).join('');
        }).join('|'), 'g');

        JenaTextFacet.prototype = Object.create(TextFacet.prototype);
        JenaTextFacet.prototype.getConstraint = getConstraint;
        JenaTextFacet.prototype.sanitize = sanitize;
        JenaTextFacet.prototype.addWildcard = addWildcard;
        JenaTextFacet.prototype.escapeSpecialCharacters = escapeSpecialCharacters;

        return JenaTextFacet;

        function JenaTextFacet(options) {
            TextFacet.call(this, options);

            this.config.priority = this.config.priority || 0;
        }

        function getConstraint() {
            var value = this.getSelectedValue();
            if (!value) {
                return undefined;
            }

            value = this.sanitize(value);
            value = this.addWildcard(value);

            var args = [];
            if (this.config.predicate) {
                args.push(this.config.predicate);
            }

            args.push('"' + value + '"');

            if (this.config.limit) {
                args.push(this.config.limit);
            }

            var obj = '(' + args.join(' ') + ')';

            var result = '(?id ?score) ' + textQueryPredicate + ' ' + obj + ' .';

            if (this.config.graph) {
                result = 'GRAPH ' + this.config.graph + ' { ' + result + ' }';
            }

            return result || undefined;
        }

        function addWildcard(query) {
            var self = this;

            if (_.includes(['full', true], self.config.wildcard)) {
                var endingRegex = new RegExp('(' + charEscapeRegex + ')' + '$');
                var beginningRegex = new RegExp('(' + charEscapeRegex + ')' + '$');

                var wildcardQuery = '';

                query.split(/\s+/).forEach(function(word) {
                    if (!_.includes(textQueryParserReservedWords, word)) {
                        if (self.config.wildcard === 'full' && !word.match(beginningRegex)) {
                            wildcardQuery += '*';
                        }
                        wildcardQuery += word;
                        if (!word.match(endingRegex)) {
                            wildcardQuery += '* ';
                        }
                    } else {
                        wildcardQuery += word + ' ';
                    }
                });
                wildcardQuery = wildcardQuery
                    .replace(/(\w)(?:\\*-+)+(\w)/g, '$1' + (this.config.intersection ? ' && ' : ' ') + '$2');
                return wildcardQuery.trim();
            }
            return query;
        }

        function sanitize(query) {
            if (this.config.raw) {
                return query.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            } else if (this.config.escapeSpecialCharacters) {
                return this.escapeSpecialCharacters(query);
            }
            query = query
                .replace(/[\\()]/g, '') // backslashes, and parentheses
                .replace(/~{2,}/g, '~') // double ~
                .replace(/^~/g, '') // ~ as first token
                .replace(/(\b~*(AND|OR|NOT|-|&&|\|\|)\s*~*)+$/g, '') // AND, OR, NOT, - last
                .replace(/^((AND|OR|NOT|&&|\|\|)\b\s*~*)+/g, ''); // AND, OR, NOT first

            // Escape balanced quotes
            var quoteRepl = '\\"';
            if ((query.match(/"/g) || []).length % 2) {
                // Unbalanced quotes, remove them instead
                quoteRepl = '';
            }
            return query.replace(/"/g, quoteRepl).trim();
        }

        function escapeSpecialCharacters(query) {
            var escapedQuery = query.replace(/\\/g, '\\\\\\\\')
                .replace(charEscapeRegex, '\\\\$&')
                .replace('"', '\\"');
            return escapedQuery;
        }
    }
})();
