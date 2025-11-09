// 1) Map and Carto Light basemap
let map = L.map('map').setView([4.647545,-74.089275], 6);

L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles © Esri — Sources: Esri, HERE, Garmin, USGS, Intermap, NPS, etc.'
}).addTo(map);

// 2) Overpass query for glaciers in Iceland
let query =
    '[out:json][timeout:60];' +
    'area["name"="Colombia"]["boundary"="administrative"]["admin_level"="2"]->.a;' +
    '(' +
    'way["natural"="fell"](area.a);' +
    'relation["natural"="fell"](area.a);' +
    ');' +
    'out body;>;out skel qt;';

// 3) Fetch data, convert, display
fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body: 'data=' + encodeURIComponent(query)
    })
    .then(function(r){ return r.json(); })
    .then(function(osm){
        let gj = osmtogeojson(osm);
        let glaciers = L.geoJSON(gj, {
            style: function(){
                return { color: '#00bfff', weight: 1, fillColor: '#00bfff', fillOpacity: 0.5 };
            },
            onEachFeature: function(feature, layer){
                let t = '';
                if (feature.properties && feature.properties.tags) {
                    let tags = feature.properties.tags;
                    let n = tags.name || '';
                    let en = tags['name:en'] || '';
                    if (n && en) t = n + ' (' + en + ')';
                    else if (n) t = n;
                    else if (en) t = en;
                }
                if (t)
                layer.bindPopup('<b>' + t + '</b><br>Glacier');
            }
        }).addTo(map);

        let boundsGlacier = glaciers.getBounds();
        if (boundsGlacier.isValid && boundsGlacier.isValid())
            map.fitBounds(boundsGlacier, { padding: [20, 20] });
    });