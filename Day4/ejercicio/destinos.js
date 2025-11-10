/* --- global controls --- */
let maxSegmentKm = 10;      // max great-circle segment length
let animationSpeedMs = 20;  // lower = faster

let map = L.map('map').setView([-75.15, 3.45], 7);

/* Carto Dark Matter */
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors &copy; Carto'
}).addTo(map);

/* --- animate small white dots along each line --- */
function animateLines(lineLayer, intervalMs) {
    if (!lineLayer) return;
    lineLayer.eachLayer(function(line){
        //console.log("line: " + line);
        
        let ll = line.getLatLngs();
        //console.log("ll= " + ll);
        //console.log("ll[0]= " + ll[0]);
        
        if (ll.length && Array.isArray(ll[0])) ll = ll[0];
        if (!ll || ll.length < 2) return;

        //console.log("ll[0]= " + ll[0]);

        let dot = L.circleMarker(ll[0], {
            radius: 1.3,
            color: '#ffffff',
            weight: 0,
            fillColor: '#ffffff',
            fillOpacity: 0.95
        }).addTo(map);

        let i = 0;
        setInterval(function(){
            i = i + 1;
            if (i >= ll.length)
            i = 0;
            dot.setLatLng(ll[i]);
        }, intervalMs);
    });
}

/* --- load combined flights + airports file --- */
fetch('destinos.geojson')
    .then(r => r.json())
    .then(data => {
    let gc = { "type": "FeatureCollection", "features": [] };
    let airports = { "type": "FeatureCollection", "features": [] };
    
    
    
    let listAirports = [...data.features].filter(a => {
        return a.geometry.type === 'Point'
    })

    listAirports.sort((a, b) => {
        return b.geometry.coordinates[1] - a.geometry.coordinates[1]
        
    })

    

    listAirports.forEach(item => airports.features.push(item))
    
    

    for (let f = 1; f < listAirports.length; f++) {

        if (listAirports.length > 2) {         
            let start = turf.point(listAirports[f-1].geometry.coordinates);
            let end = turf.point(listAirports[f].geometry.coordinates);

            // number of points for desired segment length
            let distKm = turf.distance(start, end, { units: 'kilometers' });
            let npoints = Math.max(2, Math.ceil(distKm / maxSegmentKm));

            let arc = turf.greatCircle(start, end, { npoints: npoints, properties: {from:listAirports[f-1].properties.code, to:listAirports[f].properties.code} });
            gc.features.push(arc);
        } 
    }

    // draw flight lines
    let lineLayer = L.geoJSON(gc, {
        style: () => ({ color: '#ffcc00', weight: 0.6, opacity: 0.8 })
    }).addTo(map);

    // draw airport points above
    let airportLayer = L.geoJSON(airports, {
        pointToLayer: (f, latlng) => L.circleMarker(latlng, {
        radius: 3.5,
        color: '#d100d1',
        weight: 0.5,
        fillColor: '#d100d1',
        fillOpacity: 0.8
        }),
        onEachFeature:(feature, layer) => {
            let ciudad = feature.properties.name.split(" ")[0]
            let aeropuerto = feature.properties.name.split(" ").slice(1).join(" ")
            let atraccion = feature.properties.attraction
            layer.bindPopup(
                '<b>' + ciudad + '</b><br>'+
                '<p>Aeropuerto: ' +aeropuerto + '</p><br>' +
                '<p>Atracción: ' + atraccion + '</p>'
            )
        },
    }).addTo(map);

    if (airportLayer.bringToFront) airportLayer.bringToFront();

    let all = L.featureGroup([lineLayer, airportLayer]);
    map.fitBounds(all.getBounds());

    // animate dots
    animateLines(lineLayer, animationSpeedMs);
    });