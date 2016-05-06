# SPARQL Faceter

## Installation

`bower install sparql-faceter`

Include `seco.facetedSearch` in your module dependenies:

```
angular.module('myApp', ['seco.facetedSearch'])
```

## Configuration and Usage

Setup in the controller:

```
var vm = this;

// Define facets
vm.facets = {
    // Basic facet
    '<http://ldf.fi/schema/narc-menehtyneet1939-45/asuinkunta>': {
        name: 'Principal abode'
    },
    // Basic facet with labels in another service
    '<http://ldf.fi/schema/narc-menehtyneet1939-45/kuolinkunta>': {
        name: 'Municipality of death',
        service: '<http://ldf.fi/pnr/sparql>'
    },
    // Free-text facet (the endpoint has to support Jena text query)
    '<http://www.w3.org/2004/02/skos/core#prefLabel>': {
        name: 'Name',
        type: 'text'
    },
    // Time span facet
    '<http://ldf.fi/kuolinaika>' : {
        name: 'Time of death',
        type: 'timespan',
        // start is the property that holds the value for the beginning of the time span
        start: '<http://ldf.fi/schema/narc-menehtyneet1939-45/kuolinaika>',
        // end is the property that holds the value for the end of the time span
        end: '<http://ldf.fi/schema/narc-menehtyneet1939-45/kuolinaika>',
        // min and max are the earliest and latest dates, respectively,
        // that are displayed in the date selection popup
        min: '1939-10-01',
        max: '1989-12-31'
    },
    // Hierarchical facet
    '<http://ldf.fi/schema/narc-menehtyneet1939-45/sotilasarvo>': {
        name: 'Rank',
        type: 'hierarchy',
        // property is the property path that defines the hierarchy
        property: '<http://purl.org/dc/terms/isPartOf>*|(<http://rdf.muninn-project.org/ontologies/organization#equalTo>/<http://purl.org/dc/terms/isPartOf>*)',
        // classes are the top level terms
        classes: [
            '<http://ldf.fi/warsa/actors/ranks/Upseeri>',
            '<http://ldf.fi/warsa/actors/ranks/Aliupseeri>',
            '<http://ldf.fi/warsa/actors/ranks/Miehistoe>',
            '<http://ldf.fi/warsa/actors/ranks/Jaeaekaeriarvo>'
        ]
    }
};

vm.facetOptions = {
    endpointUrl: '<http://ldf.fi/warsa/sparql>',
    rdfClass: '<http://www.cidoc-crm.org/cidoc-crm/E31_Document>',
    preferredLang : 'fi'
};

// Callback for facet selection change
vm.updateResults = function(facetSelections) {
    vm.isLoadingResults = true;

    // Do something with the selections ...

    vm.isLoadingResults = false;
}

// Define when the facets should be disabled (to prevent async issues)
vm.disableFacets = function() {
    return vm.isLoadingResults;
}
```

Then, in the template:

```
<facet-selector ng-if="vm.facets"
    data-facets="vm.facets"
    data-update-results="vm.updateResults"
    data-options="vm.facetOptions"
    data-disable="vm.disableFacets">
</facet-selector>
```

## Examples
See the [WarSampo casualties demo](https://github.com/SemanticComputing/casualties-demo).

Simplistic demo using DBpedia: [Demo](http://semanticcomputing.github.io/sparql-faceter-dbpedia-demo/#),
[Demo repository](https://github.com/SemanticComputing/sparql-faceter-dbpedia-demo) (the code in the repo contains helpful comments)
