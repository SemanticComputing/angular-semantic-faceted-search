'use strict';

/* global module */
module.exports = function(grunt) {

    grunt.initConfig({
        ngtemplates: {
            'seco.facetedSearch': {
                src: ['src/facets/basic/facets.basic-facet.directive.html'],
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
                    'src/facets/facets.abstract-facet.service.js',
                    'src/facets/facets.abstract-facet.controller.js',
                    'src/facets/basic/facets.basic-facet.facet.js',
                    'src/facets/basic/facets.basic-facet.controller.js',
                    'src/facets/basic/facets.basic-facet.directive.js',
                    'src/facets/hierarchy/facets.hierarchy-facet.facet.js',
                    'src/facets/hierarchy/facets.hierarchy-facet.controller.js',
                    'src/facets/hierarchy/facets.hierarchy-facet.directive.js',
                    'dist/templates.js'
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
