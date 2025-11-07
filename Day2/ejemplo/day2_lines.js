let map = L.map('map').setView([64.9, -18.8], 6);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors &copy; Carto'
    }).addTo(map);

fetch('day1_places.json')
    .then(function(r){ return r.json(); })
    .then(function(geojson){

    // collect coordinates for OSRM
    let coords = [];
    let placeCount = 0;

    for (let i = 0; i < geojson.features.length; i++) {
        let f = geojson.features[i];
        if (f && f.geometry && f.geometry.type === 'Point') {
            let c = f.geometry.coordinates; // [lon, lat]
            coords.push(c[0] + ',' + c[1]);
            placeCount += 1;
        }
    }

    // close the loop: add the first point again at the end
    if (coords.length > 0) {
        coords.push(coords[0]);
    }

    let url = 'https://router.project-osrm.org/route/v1/driving/' + coords.join(';') + '?overview=full&geometries=geojson';

    fetch(url)
        .then(function(r){ return r.json(); })
        .then(function(data){

            // draw route first (keeps it under points)
            if (data && data.routes && data.routes.length > 0) {
                let route = data.routes[0];
                let geom = route.geometry;
                L.geoJSON(geom, {
                    style: function(){ return { color: '#00ffff', weight: 4, opacity: 0.8 }; }
                }).addTo(map);

                // update info panel with stats
                let dist = (route.distance / 1000).toFixed(1) + ' km';
                let hrs = Math.floor(route.duration / 3600);
                let mins = Math.round((route.duration % 3600) / 60);
                let dur = hrs + ' h ' + mins + ' min';
                let longest = 0;
                if (route.legs && route.legs.length) {
                    for (let j = 0; j < route.legs.length; j++) {
                        if (route.legs[j].distance > longest) longest = route.legs[j].distance;
                    }
                }
                let infoEl = document.getElementById('info');
                if (infoEl) {
                    infoEl.innerHTML =
                        '<b>Route stats</b>' +
                        '<div class="row">Total distance: ' + dist + '</div>' +
                        '<div class="row">Est. time: ' + dur + '</div>' +
                        '<div class="row">Places: ' + placeCount + '</div>' +
                        '<div class="row">Longest leg: ' + (longest / 1000).toFixed(1) + ' km</div>';
                }
            }

            // points above the line
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

            if (layer && layer.bringToFront) { layer.bringToFront(); }
            map.fitBounds(layer.getBounds(), { padding: [20, 20] });
        });
});