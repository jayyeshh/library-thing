tt.setProductInfo('Codepen Examples', '${analytics.productVersion}');
var map = tt.map({
    key: 'GbvvyavOUYChtvYbuqnwwAOZD7IahFty',
    container: 'map',
    center: [-0.12582778930664062, 51.49912573429843],
    zoom: 6,
    dragPan: !isMobileOrTablet()
});
map.addControl(new tt.FullscreenControl({ container: document.querySelector('body') }));
map.addControl(new tt.NavigationControl());
new SidePanel('.tt-side-panel', map);
var tabs = new Tabs('.js-tabs');
var searchMarkersManager = new SearchMarkersManager(map);
Array.prototype.slice.call(document.querySelectorAll('.js-slider'))
    .forEach(function(slider) {
        new Slider(slider);
    });
var types = {
    fuzzySearch: 'Fuzzy search',
    poiSearch: 'POI search',
    categorySearch: 'Category search',
    geometrySearch: 'Geometry search',
    nearbySearch: 'Nearby search'
};
var typeSelect = new TailSelector(types, '.js-type-select', 'fuzzySearch');
var languageSelector = new TailSelector(searchLanguages, '.js-language-select', 'en-GB');
function Search() {
    this.domHelpers = DomHelpers;
    this.searchResultsParser = SearchResultsParser;
    this.formatters = Formatters;
    this.resultsManager = new ResultsManager();
    this.errorHint = new InfoHint('error', 'bottom-center', 5000)
        .addTo(document.getElementById('map'));
    this.elements = {
        language: languageSelector.getElement(),
        type: typeSelect.getElement(),
        biasContainer: document.querySelector('.js-bias-container'),
        biasPlaceholder: document.querySelector('.js-bias-placeholder'),
        biasControls: document.querySelector('.js-bias-controls'),
        geobiasToggle: document.querySelector('.js-bias-toggle'),
        form: document.querySelector('.js-form')
    };
    Array.prototype.slice.call(document.querySelectorAll('input'))
        .forEach(function(input) {
            this.elements[input.name] = input;
        }.bind(this));
    this.state = {
        query: this.elements.query.value,
        language: 'en-GB',
        minFuzzyLevel: this.elements.minFuzzyLevel.value,
        maxFuzzyLevel: this.elements.maxFuzzyLevel.value,
        limit: this.elements.limit.value,
        radius: this.elements.radius.value,
        type: 'fuzzySearch',
        isGeobiasActive: true
    };
    this.updateInputValue = this.updateInputValue.bind(this);
    this.updateSelectValue = this.updateSelectValue.bind(this);
    this.bindEvents();
}
Search.prototype.bindEvents = function() {
    this.elements.language.on('change', this.updateSelectValue.bind(this, 'language'));
    this.elements.type.on('change', this.updateSelectValue.bind(this, 'type'));
    this.elements.minFuzzyLevel.addEventListener('change', this.updateInputValue.bind(this, 'minFuzzyLevel'));
    this.elements.maxFuzzyLevel.addEventListener('change', this.updateInputValue.bind(this, 'maxFuzzyLevel'));
    this.elements.latitude.addEventListener('change', this.updateInputValue.bind(this, 'latitude'));
    this.elements.longitude.addEventListener('change', this.updateInputValue.bind(this, 'longitude'));
    this.elements.limit.addEventListener('change', this.updateInputValue.bind(this, 'limit'));
    this.elements.radius.addEventListener('change', this.updateInputValue.bind(this, 'radius'));
    this.elements.geobiasToggle.addEventListener('click', this.toggleGeoBias.bind(this));
    this.elements.submit.addEventListener('click', this.handleSubmit.bind(this));
    this.elements.query.addEventListener('keydown', function(event) {
        this.updateInputValue('query', event);
        if (event.key === 'Enter' || event.keyCode === 13) {
            this.handleSubmit(event);
        }
    }.bind(this));
    map.on('load', this.updateBiasPosition.bind(this));
    map.on('moveend', this.updateBiasPosition.bind(this));
};
Search.prototype.updateBiasPosition = function() {
    var lat = Formatters.roundLatLng(map.getCenter().lat);
    var lng = Formatters.roundLatLng(map.getCenter().lng);
    this.elements.latitude.value = lat;
    this.elements.longitude.value = lng;
    this.state.latitude = lat;
    this.state.longitude = lng;
};
Search.prototype.updateInputValue = function(property, event) {
    if (property === 'minFuzzyLevel' || property === 'maxFuzzyLevel') {
        this.validateMinMaxFuzzy();
    }
    if (property === 'latitude' || property === 'longitude') {
        var value = this.formatters.roundLatLng(event.target.value);
        this.state[property] = value;
        this.elements[property].value = value;
        return;
    }
    this.state[property] = event.target.value;
};
Search.prototype.updateSelectValue = function(property, selected) {
    var selectedKey = selected.key;
    if (property === 'type') {
        this.handleUiForService(selectedKey);
    }
    this.state[property] = selectedKey;
};
Search.prototype.handleUiForService = function(serviceType) {
    var header = document.querySelector('.tt-side-panel__header');
    this.elements.biasContainer.removeAttribute('hidden');
    this.elements.geobiasToggle.removeAttribute('disabled');
    this.elements.radius.min = 0;
    this.elements.radius.value = 0;
    var event = this.getCrossBrowserDispatchEvent('change');
    this.elements.radius.dispatchEvent(event);
    header.removeAttribute('hidden');
    if (serviceType === 'geometrySearch') {
        this.elements.biasContainer.setAttribute('hidden', 'hidden');
    }
    if (serviceType === 'nearbySearch') {
        header.setAttribute('hidden', true);
        this.elements.geobiasToggle.setAttribute('disabled', true);
        this.elements.geobiasToggle.checked = true;
        this.elements.radius.min = 1;
        this.elements.radius.value = 10000;
        this.elements.radius.dispatchEvent(event);
        if (!this.state.isGeobiasActive) {
            this.toggleGeoBias();
        }
        this.state.isGeobiasActive = true;
    }
};
Search.prototype.toggleGeoBias = function() {
    var isGeobiasActive = !this.state.isGeobiasActive;
    this.state.isGeobiasActive = isGeobiasActive;
    Array.prototype.slice.call(this.elements.biasControls.querySelectorAll('label, input'))
        .forEach(function(label) {
            if (isGeobiasActive) {
                label.removeAttribute('disabled');
            } else {
                label.setAttribute('disabled', 'true');
            }
        });
};
Search.prototype.getSearchAreaVertices = function() {
    var mapBounds = map.getBounds();
    return [
        mapBounds.getSouthEast().toArray(),
        mapBounds.getSouthWest().toArray(),
        mapBounds.getNorthWest().toArray(),
        mapBounds.getNorthEast().toArray()
    ];
};
Search.prototype.handleSubmit = function(event) {
    event.preventDefault();
    var callParameters = {
        key: 'GbvvyavOUYChtvYbuqnwwAOZD7IahFty',
        query: this.state.query,
        language: this.state.language,
        limit: this.state.limit,
        minFuzzyLevel: this.state.minFuzzyLevel,
        maxFuzzyLevel: this.state.maxFuzzyLevel
    };
    this.resultsManager.loading();
    searchMarkersManager.clear();
    if (this.state.query) {
        tabs.clickTab(document.querySelector('[aria-controls="results"]'));
    } else {
        this.resultsManager.resultsNotFound();
    }
    var areaLayerId = 'geometrySearchArea';
    if (map.getSource(areaLayerId) && map.getLayer(areaLayerId)) {
        map.removeLayer(areaLayerId);
        map.removeSource(areaLayerId);
    }
    var serviceCall = tt.services[this.state.type];
    if (this.state.type !== 'geometrySearch' && this.state.isGeobiasActive) {
        callParameters.radius = this.state.radius;
        callParameters.center = [this.state.longitude, this.state.latitude];
    }
    if (this.state.type === 'geometrySearch' && this.state.query) {
        var vertices = this.getSearchAreaVertices();
        var geometryListValue = [{
            'type': 'POLYGON',
            'vertices': vertices
        }];
        map.addLayer({
            'id': areaLayerId,
            'type': 'fill',
            'source': {
                'type': 'geojson',
                'data': {
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Polygon',
                        'coordinates': [vertices]
                    }
                }
            },
            'layout': {},
            'paint': {
                'fill-color': '#bcd730',
                'fill-opacity': 0.3
            }
        });
        callParameters.geometryList = geometryListValue;
    }
    serviceCall(callParameters)
        .then(this.handleResponse.bind(this))
        .catch(this.handleError.bind(this));
};
Search.prototype.handleResponse = function(response) {
    var resultList = this.domHelpers.createResultList();
    this.errorHint.hide();
    if (response.results && response.results.length > 0) {
        this.resultsManager.success();
        Array.prototype.slice.call(response.results).forEach(function(result) {
            var distance = this.searchResultsParser.getResultDistance(result);
            var addressLines = this.searchResultsParser.getAddressLines(result);
            var searchResult = this.domHelpers.createSearchResult(
                addressLines[0],
                addressLines[1],
                distance ? this.formatters.formatAsMetricDistance(distance) : ''
            );
            var resultItem = this.domHelpers.createResultItem();
            resultItem.appendChild(searchResult);
            resultItem.setAttribute('data-id', result.id);
            resultItem.addEventListener('click', this.handleSearchResultItemClick.bind(this));
            resultList.appendChild(resultItem);
        }, this);
        searchMarkersManager.draw(response.results);
        if (this.state.type === 'geometrySearch') {
            map.setZoom(map.getZoom() - 0.2);
        } else {
            map.fitBounds(searchMarkersManager.getMarkersBounds(), { padding: 50 });
        }
        this.resultsManager.append(resultList);
    } else {
        this.resultsManager.resultsNotFound();
        this.errorHint.setMessage('No results found for given parameters');
    }
};
Search.prototype.handleError = function(error) {
    this.errorHint.setMessage(error.message);
};
Search.prototype.selectResultItem = function(resultItem) {
    if (resultItem.classList.contains('-selected')) {
        return;
    }
    Array.prototype.slice.call(document.querySelectorAll('.tt-results-list__item'))
        .forEach(function(item) {
            item.classList.remove('-selected');
        });
    resultItem.classList.add('-selected');
};
Search.prototype.handleSearchResultItemClick = function(event) {
    var id = event.currentTarget.getAttribute('data-id');
    searchMarkersManager.openPopup(id);
    searchMarkersManager.jumpToMarker(id);
};
Search.prototype.validateMinMaxFuzzy = function() {
    var maxFuzzyLevelValue = this.elements.maxFuzzyLevel.value;
    if (this.elements.minFuzzyLevel.value > maxFuzzyLevelValue) {
        this.elements.minFuzzyLevel.value = maxFuzzyLevelValue;
        var event = this.getCrossBrowserDispatchEvent('change');
        this.elements.minFuzzyLevel.dispatchEvent(event);
    }
};
Search.prototype.getCrossBrowserDispatchEvent = function(eventName) {
    if (typeof Event === 'function') {
        return new Event(eventName);
    }
    var event = document.createEvent('Event');
    event.initEvent(eventName, true, true);
    return event;
};
new Search();
