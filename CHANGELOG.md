# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/),
and this project adheres to [Semantic Versioning](http://semver.org/).

## [1.1.0] - 2016-11-03

### Changed
- Timespan facet now works as an actual facet by querying for minimum and maximum
  available dates, and adjusts the datepicker max and min dates accordingly.

## [1.0.7] - 2016-11-03

### Fixed
- Fix setting the timespan face's initial values.
- Fix an issue with the timespan facet where the selected date could be different
  from the one actually used in the query.

## [1.0.6] - 2016-11-02

### Added
- Changelog

### Changed
- UI Bootstrap dependency updated to ^2.2.0

### Fixed
- Fix the timespan facet, and its documentation

[1.1.0]: https://github.com/SemanticComputing/angular-semantic-faceted-search/compare/1.0.7...1.1.0
[1.0.7]: https://github.com/SemanticComputing/angular-semantic-faceted-search/compare/1.0.6...1.0.7
[1.0.6]: https://github.com/SemanticComputing/angular-semantic-faceted-search/compare/1.0.5...1.0.6
