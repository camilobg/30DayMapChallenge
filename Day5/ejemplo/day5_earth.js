require([
    "esri/Map",
    "esri/views/MapView",
    "esri/layers/GeoJSONLayer",
    "esri/layers/TileLayer",
    "esri/request",
    "esri/geometry/support/webMercatorUtils"
  ], function(Map, MapView, GeoJSONLayer, TileLayer, esriRequest, webMercatorUtils){

    // --- 🔧 SETTINGS YOU CAN CHANGE ------------------
    const config = {
      regionName: "Colombia",           // display name for poster
      initialCenter: [-73.30, 4.05],    // [lon, lat]
      initialZoom: 5,                  // map zoom
      minMag: 3.5,                     // minimum magnitude
      maxFeatures: 10000,              // limit for performance
      startTime: "2025-01-01",         // start date
      endTime: "NOW"                   // end date (text only)
    };
    // -------------------------------------------------

    // --- Poster auto-update ---
    document.getElementById("poster-region").textContent = config.regionName.toUpperCase();
    document.getElementById("poster-info").textContent =
      `${config.startTime.slice(0,4)} – ${config.endTime} · M ≥ ${config.minMag}`;

    // --- Base map and view ---
    const map = new Map({ basemap: "dark-gray-vector" });

    const hillshade = new TileLayer({
      portalItem: { id: "1b243539f4514b6ba35e7d995890db1d" },
      opacity: 0.85,
      blendMode: "multiply"
    });
    map.add(hillshade);

    const view = new MapView({
      container: "viewDiv",
      map,
      center: config.initialCenter,
      zoom: config.initialZoom,
      background: { color: [10,10,10,1] }
    });

    let quakesLayer = null;

    view.when(async function(){

      // Convert extent to lon/lat for query bbox
      let geoExtent = webMercatorUtils.webMercatorToGeographic(view.extent);
      let bbox = [
        geoExtent.xmin.toFixed(2),
        geoExtent.ymin.toFixed(2),
        geoExtent.xmax.toFixed(2),
        geoExtent.ymax.toFixed(2)
      ];

      // Build USGS query URL
      const usgsUrl =
        "https://earthquake.usgs.gov/fdsnws/event/1/query" +
        `?format=geojson&starttime=${config.startTime}&minmagnitude=${config.minMag}` +
        `&minlongitude=${bbox[0]}&minlatitude=${bbox[1]}` +
        `&maxlongitude=${bbox[2]}&maxlatitude=${bbox[3]}` +
        `&orderby=time&limit=${config.maxFeatures}`;

      console.log("USGS request:", usgsUrl);

      try {
        const response = await esriRequest(usgsUrl, { responseType: "json" });
        const geojson = response.data;

        console.log("geojson");
        console.log(geojson);
        let colombiaFeatures = []
        for(let f of geojson.features){
            if(f.properties.place){
            
                let place = f.properties.place.split(" ");
                let lastItem = place[place.length-1]
                if(lastItem === "Colombia") colombiaFeatures.push(f)
            }else{
                console.log("no es valido: " + f.properties);
                
            }
        }
        console.log(colombiaFeatures);
        geojson.features = colombiaFeatures
        
        

        quakesLayer = new GeoJSONLayer({
          url: URL.createObjectURL(
            new Blob([JSON.stringify(geojson)], { type: "application/json" })
          ),
          renderer: {
            type: "simple",
            symbol: {
              type: "simple-marker",
              style: "circle",
              size: 6,
              color: [255, 240, 220, 0.85],
              outline: { color: [0,0,0,0], width: 0 }
            },
            visualVariables: [
              {
                type: "size",
                field: "mag",
                stops: [
                  { value: config.minMag,     size: 2.1 },
                  { value: config.minMag + 1.0, size: 2.8 },
                  { value: config.minMag + 2.0, size: 4.0 },
                  { value: config.minMag + 3.0, size: 5.2 }
                ]
              },
              {
                type: "color",
                field: "mag",
                stops: [
                  { value: config.minMag,       color: "#fff7ec" },
                  { value: config.minMag + 1.0, color: "#ffe1b8" },
                  { value: config.minMag + 2.0, color: "#ffb680" },
                  { value: config.minMag + 3.0, color: "#ff7b5a" },
                  { value: config.minMag + 4.0, color: "#e04b5a" }
                ]
              }
            ]
          },
          // bloom: strength, size, threshold
          effect: "bloom(1.3, 0.5px, 0) drop-shadow(0,0,2px)",
          blendMode: "screen"
        });

        map.add(quakesLayer);

      } catch (err) {
        console.error("Error fetching earthquakes:", err);
      }
    });

  });