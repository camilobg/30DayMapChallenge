// 1) Map and Carto Light basemap
let map = L.map('map').setView([4.647545,-74.089275], 6);

L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles © Esri — Sources: Esri, HERE, Garmin, USGS, Intermap, NPS, etc.'
}).addTo(map);

// 2) Overpass query for glaciers in Iceland
let query =
    '[out:json][timeout:5];' +
    '(area["name" = "Cundinamarca"];area["name" = "Bogotá"];>;);'+
    '(way(area)["natural"="wetland"];>;);'+
    'out body;';

/*
let query =
    '[out:json][timeout:5];' +
    'area["name" = "Cundinamarca"]->.cundinamarca;'+
    'area["name" = "Bogotá"]->.bogota;'+
    '(way(area.cundinamarca)["natural"="wetland"];way(area.bogota)["natural"="wetland"];);'+
    'out geom;'; // Usar 'out geom;' en lugar de '(>;); out body;'
*/


// 3) Fetch data, convert, display
fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body: 'data=' + encodeURIComponent(query)
    })
    .then(function(r){ return r.json(); })
    .then(function(osm){
        let gj = osmtogeojson(osm);
        let wetlands = L.geoJSON(gj, {
            pointToLayer:(feture, latlng) => false,
            style: function(){
                return { color: '#18b813ff', weight: 1, fillColor: '#18e622ff', fillOpacity: 0.5 };
            },
            onEachFeature: function(feature, layer){
                let t = '';
                if (feature.properties && feature.properties.tags) {
                    console.log(feature);
                    
                    let tags = feature.properties.tags;
                    let n = tags.name || '';
                    let en = tags['name:en'] || '';
                    if (n && en) t = n + ' (' + en + ')';
                    else if (n) t = n;
                    else if (en) t = en;
                }
                if (t)layer.bindPopup('<b>' + t + '</b><br>Humedal');
            }
        }).addTo(map);

        let boundsWetland = wetlands.getBounds();
        if (boundsWetland.isValid && boundsWetland.isValid())
            map.fitBounds(boundsWetland, { padding: [20, 20] });
    });