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
    // Free-text facet
    '<http://www.w3.org/2004/02/skos/core#prefLabel>': {
        name: 'Name',
        type: 'text'
    },
    // Time span facet
    '<http://ldf.fi/kuolinaika>' : {
        name: 'Time of death',
        type: 'timespan',
        start: '<http://ldf.fi/schema/narc-menehtyneet1939-45/kuolinaika>',
        end: '<http://ldf.fi/schema/narc-menehtyneet1939-45/kuolinaika>',
        min: '1939-10-01',
        max: '1989-12-31'
    },
    // Hierarchical facet
    '<http://ldf.fi/schema/narc-menehtyneet1939-45/sotilasarvo>': {
        name: 'Rank',
        type: 'hierarchy',
        property: '<http://purl.org/dc/terms/isPartOf>*|(<http://rdf.muninn-project.org/ontologies/organization#equalTo>/<http://purl.org/dc/terms/isPartOf>*)',
        classes: [
            '<http://ldf.fi/warsa/actors/ranks/Upseeri>',
            '<http://ldf.fi/warsa/actors/ranks/Aliupseeri>',
            '<http://ldf.fi/warsa/actors/ranks/Miehistoe>',
            '<http://ldf.fi/warsa/actors/ranks/Jaeaekaeriarvo>'
        ]
    }
};

vm.facetOptions = {
    endpointUrl: '<http://ldf.fi/narc-menehtyneet1939-45/>',
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
