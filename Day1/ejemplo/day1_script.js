let map = L.map('map').setView([5.5, 4.33], 11);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors &copy; Carto'
}).addTo(map);

fetch('day1_places.json')
    .then(r => r.json())
    .then(geojson => {
        let layer = L.geoJSON(geojson, {
            pointToLayer: function(feature, latlng) {
            return L.circleMarker(latlng, {
                radius: 6,
                color: '#d100d1',
                weight: 1.5,
                fillColor: '#d100d1',
                fillOpacity: 0.85
            });
            },
        onEachFeature: function(feature, marker) {
            let name = feature.properties && feature.properties.name ? feature.properties.name : '';
            let desc = feature.properties && feature.properties.description ? feature.properties.description : '';
            marker.bindPopup('<b>' + name + '</b>' + (desc ? '<br>' + desc : ''));
        }
        }).addTo(map);
        
    });