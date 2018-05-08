(function() {
    'use strict';

    angular.module('seco.facetedSearch')
    .factory('FacetChartService', FacetChartService);

    /* @ngInject */
    function FacetChartService(_) {

        return FacetChartService;

        function FacetChartService(config) {
            var self = this;

            self.scope = config.scope;
            self.facet = config.facet;

            self.handleChartClick = handleChartClick;
            self.updateChartData = updateChartData;
            self.clearChartData = clearChartData;

            self.scope.$on('chart-create', function(evt, chart) {
                // Highlight the selected value on init
                var selectionIndex = _.indexOf(self.chartData.values, self.facet.getSelectedValue());
                if (selectionIndex !== -1) {
                    var chartElement = _.find(chart.getDatasetMeta(0).data, ['_index', selectionIndex]);
                    highlightChartSlice(chartElement);
                }
            });

            function clearChartData() {
                self.chartData = {
                    values: [],
                    data: [],
                    labels: []
                };
            }

            function updateChartData() {
                self.clearChartData();
                if (self.facet.getState) {
                    self.facet.getState().forEach(function(val) {
                        // Don't add "no selection"
                        if (angular.isDefined(val.value)) {
                            self.chartData.values.push(val.value);
                            self.chartData.data.push(val.count);
                            self.chartData.labels.push(val.text);
                        }
                    });
                }
            }

            function clearChartSliceHighlight(chartElement, updateChart) {
                _.set(chartElement.custom, 'backgroundColor', null);
                _.set(chartElement.custom, 'borderWidth', null);
                if (updateChart) {
                    chartElement._chart.update();
                }
            }

            function highlightChartSlice(chartElement) {
                _.set(chartElement, 'custom.backgroundColor', 'grey');
                chartElement.custom.borderWidth = 10;
                chartElement._chart.update();
            }

            function updateChartSelection(chartElement) {
                var chartElements = chartElement._chart.getDatasetMeta(0).data;

                if (_.get(chartElement, 'custom.backgroundColor')) {
                    // Slice was already selected, so clear the selection
                    clearChartSliceHighlight(chartElement, true);
                    self.facet.selectedValue = _.find(self.facet.getState(), ['value', undefined]);
                    return self.facet.getSelectedValue();
                }

                // Clear previous selection
                chartElements.forEach(function(elem) {
                    clearChartSliceHighlight(elem);
                });

                highlightChartSlice(chartElement);

                var selectedValue = self.chartData.values[chartElement._index];
                self.facet.selectedValue = _.find(self.facet.getState(), ['value', selectedValue]);
                return self.facet.getSelectedValue();
            }

            function handleChartClick(chartElement) {
                return updateChartSelection(chartElement[0]);
            }
        }
    }
})();
