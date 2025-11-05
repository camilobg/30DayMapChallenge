
const crs3857 = new L.Proj.CRS('EPSG:3857', '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs +type=crs');

let map = L.map('map').setView([4.647545,-74.089275], 11);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors &copy; Carto'
}).addTo(map);

const inventario = './inventario_turistico.geojson'


var markerOptions = {
    radius: 5,
    fillColor: "#ff7800",
    color: "#000",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8
}

fetch(inventario)
    .then(r => r.json())
    .then(geojson => {
        L.Proj.geoJson(geojson,{
            crs:crs3857,
            pointToLayer: (feature, latlng) => L.circleMarker(latlng,markerOptions),
            onEachFeature: (feature, marker) => {
                let name = feature.properties.Nombre
                let desc = feature.properties.Nombre_Pro
                marker.bindPopup('<b>' + name + '</b>' + ('<br>' + desc))
            }
        }).addTo(map);
    })
    .catch(e => {
        console.error(e)
    })


