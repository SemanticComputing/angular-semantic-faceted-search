'use strict';

module.exports = function(grunt) {

    grunt.initConfig({
        ngtemplates: {
            'seco.facetedSearch': {
                src: ['src/facets/facets.directive.html'],
                dest: 'dist/templates.js'
            }
        },
        concat: {
            dist: {
                src: [
                    'src/facets/facets.module.js',
                    'src/faceturlstate/faceturlstate.url-state-handler-service.js',
                    'src/results/results.service.js',
                    'src/facets/facets.facet-mapper-service.js',
                    'src/facets/facets.facet-selection-formatter.js',
                    'src/facets/facets.service.js',
                    'src/facets/facets.text-with-selection.filter.js',
                    'dist/templates.js',
                    'src/facets/facets.directive.js'
                ],
                dest: 'dist/semantic-faceted-search.js'
            }
        },
        clean: {
            templates: ['dist/templates.js']
        }
    });

    grunt.loadNpmTasks('grunt-angular-templates');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-clean');

    grunt.registerTask('build', [
        'ngtemplates',
        'concat:dist',
        'clean:templates'
    ]);
};
