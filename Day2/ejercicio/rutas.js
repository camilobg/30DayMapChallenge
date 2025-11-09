
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
        
        geojson = L.Proj.geoJson(geojson, {
            crs:crs3857,
            filter:item => item.properties.Nombre_Pro === 'Instituto Distrital de Recreación y Deporte - IDRD'
        }).toGeoJSON()
        
        let coords = [];
        let placeCount = 0;
        //let limit = geojson.features.length;
        let limit = 5;
        for(let i = 0; i<limit; i++){
            let f = geojson.features[i];
            if(f && f.geometry && f.geometry.type === 'Point'){
                let c = f.geometry.coordinates; //[lon, lat]
                coords.push(c[0] + ',' + c[1]);
                placeCount += 1
            }
        }

        //close the loop: add the first point at the end

        if(coords.length > 0){
            coords.push(coords[0])
        }

        let url = 'https://router.project-osrm.org/route/v1/driving/' + coords.join(';') + '?overview=full&geometries=geojson';

        fetch(url)
            .then( r => r.json())
            .then( data =>{
                //draw route first (keeps it under points)
                if(data && data.routes && data.routes.length > 0){
                    let route = data.routes[0];
                    let geom = route.geometry;
                    

                    //update info panel with stats
                    let dist = (route.distance / 1000).toFixed(1) + 'km';
                    let hrs = Math.floor(route.duration / 3600);
                    let mins = Math.round((route.duration % 3600)/60);
                    let dur = hrs + 'h' + mins + 'min';
                    let longest = 0;
                    if(route.legs && route.legs.length){
                        for(let j = 0; j < route.legs.length; j++){
                            if(route.legs[j].distance > longest){
                                 longest = route.legs[j].distance;
                            }
                        }
                    }
    
                    
            
                    var hh =L.Proj.geoJson(geom, {
                        style: ( ) => {return { color:'#00ffff', weight:4, opacity: 0.8};}
                    }).addTo(map);
                    console.log(hh);
                    


                    let infoEl = document.getElementById('info');
                    if(infoEl){
                        infoEl.innerHTML =
                            '<b>Route stats</b>' +
                            '<div class="row">Distancia total: ' + dist + '</div>' +
                            '<div class="row">Tiempo estimado: ' + dur + '</div>' +
                            '<div class="row">Lugares: ' + placeCount + '</div>' +
                            '<div class="row">Trayecto más largo: ' + (longest / 1000).toFixed(1) + ' km</div>';
                    }
                }

                //points above the line
                let count = 0;
                L.Proj.geoJson(geojson,{
                    crs:crs3857,
                    filter:item => count++ < limit,
                    pointToLayer: (feature, latlng) => L.circleMarker(latlng,markerOptions),
                    onEachFeature: (feature, marker) => {
                        let name = feature.properties.Nombre
                        let desc = feature.properties.Nombre_Pro
                        marker.bindPopup('<b>' + name + '</b>' + ('<br>' + desc))
                        //this.setStyle(() => {return {color:'#bbbf'}})
                    }
                }).addTo(map);
                
                
            })
    })
    .catch(e => {
        console.log(e)
    })