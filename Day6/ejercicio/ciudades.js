require(
    [
        "esri/Map",
        "esri/views/SceneView",
        "esri/layers/GeoJSONLayer",
        "esri/layers/GraphicsLayer",
        "esri/Graphic",
        "esri/geometry/Polyline"
    ],
    (Map, SceneView, GeoJSONLayer, GraphicsLayer, Graphic, Polyline) => {

        // ---------------------------------------
        // 🔧 GLOBAL SETTINGS (tweak here)
        // ---------------------------------------

        // Start position (Keflavík)
        const START_LON = -74.3;
        const START_LAT = 4.5;
        const START_Z   = 2000;

        // Camera view
        const CAMERA_HEADING = 0;      // looking north
        const CAMERA_TILT    = 10;     // degrees
        const CAMERA_ZOOM    = 7;      // zoom level
        const CAMERA_SPEED_FACTOR = 0.5; // how smooth the camera follows (higher = slower)

        // Animation
        const CAR_SPEED_INDICES_PER_SECOND = 800; // how fast to move along route
        const CAMERA_UPDATE_EVERY_N_FRAMES = 50;   // how often we update camera

        // Layer elevation offsets
        const PLACES_OFFSET = 8;
        const ROUTE_OFFSET  = 10;
        const CAR_OFFSET    = 12;

        // Visuals
        const BASEMAP_ID      = "satellite";
        const QUALITY_PROFILE = "low"; // medium, high

        // Car styling
        const CAR_COLOR = "#f6b331";
        const CAR_SIZE  = 10;

        // ---------------------------------------
        // Map + View
        // ---------------------------------------

        const map = new Map({
        basemap: BASEMAP_ID,
        ground: "world-elevation"
        });

        const view = new SceneView({
        container: "viewDiv",
        map,
        center: [START_LON, START_LAT], // 👈 same as follow mode
        zoom: CAMERA_ZOOM,              // 👈 uses the global zoom
        heading: CAMERA_HEADING,
        tilt: CAMERA_TILT,
        qualityProfile: QUALITY_PROFILE,
        environment: {
            atmosphereEnabled: false,
            lighting: {
            type: "virtual",
            directShadowsEnabled: false
            }
        }
        });

        // ---------------------------------------
        // Layers
        // ---------------------------------------

        const placesLayer = new GeoJSONLayer({
        url: "ciudades.geojson",
        elevationInfo: { mode: "relative-to-ground", offset: PLACES_OFFSET },
        renderer: {
            type: "simple",
            symbol: {
                type: "point-3d",
                symbolLayers: [
                    {
                    type: "icon",
                    resource: { primitive: "circle" },
                    material: { color: "#d100d1" },
                    outline: { color: "#fff", size: 1 },
                    size: 10
                    }
                ],
                verticalOffset: {
                    screenLength: 20,
                    minWorldLength: 20,
                    maxWorldLength: 200
                }
            }
        }
        });

        map.add(placesLayer);

        const routeLayer = new GraphicsLayer({
        elevationInfo: { mode: "relative-to-ground", offset: ROUTE_OFFSET }
        });
        map.add(routeLayer);

        const carLayer = new GraphicsLayer({
        elevationInfo: { mode: "relative-to-ground", offset: CAR_OFFSET }
        });
        map.add(carLayer);

        let carGraphic = null;
        let animationId = null;

        // we’ll store route coords + scene readiness here
        let routeCoords = null;
        let sceneReady  = false;
        let animationStarted = false;

        // ---------------------------------------
        // FPS overlay
        // ---------------------------------------

        const fpsEl = document.createElement("div");
        fpsEl.id = "fps";
        fpsEl.textContent = "FPS: 0";
        document.body.appendChild(fpsEl);

        let fpsLast = performance.now();
        let fpsFrames = 0;

        function updateFPS(now) {
        fpsFrames++;
        const elapsed = now - fpsLast;
        if (elapsed >= 1000) {
            const fps = Math.round((fpsFrames * 1000) / elapsed);
            fpsEl.textContent = `FPS: ${fps}`;
            fpsFrames = 0;
            fpsLast = now;
        }
        }

        // ---------------------------------------
        // Only start animation when BOTH:
        // 1) scene finished initial loading
        // 2) routeCoords are ready
        // ---------------------------------------

        function maybeStartAnimation() {
            if (sceneReady && routeCoords && !animationStarted) {
                animationStarted = true;
                animateCar(routeCoords);
            }
        }

        // Watch the view's updating status after view is ready
        view.when().then(() => {
            const handle = view.watch("updating", (updating) => {
                // when updating turns false, the initial draw is done
                if (!updating) {
                    sceneReady = true;
                    handle.remove(); // only care about the first time
                    maybeStartAnimation();
                }
            });
        });

        // ---------------------------------------
        // Build route from OSRM using your places
        // ---------------------------------------

        fetch("ciudades.geojson")
        .then((r) => r.json())
        .then((geojson) => {
            const coords = geojson.features
            //.filter((f) => f.geometry && f.geometry.type === "Point")
            .sort((f, g) => g.geometry.coordinates[1] - f.geometry.coordinates[1])
            .map((f) => f.geometry.coordinates.join(","));

            if (!coords.length) return;
            coords.push(coords[0]); // close loop

            const url =
            "https://router.project-osrm.org/route/v1/driving/" +
            coords.join(";") +
            "?overview=full&geometries=geojson";

            return fetch(url)
            .then((r) => r.json())
            .then((data) => {
                if (!data || !data.routes || !data.routes.length) return;
                const route = data.routes[0];
                const lineCoords = route.geometry.coordinates;

                // --- Draw route ---
                const polyline = new Polyline({
                paths: [lineCoords.map((c) => [c[0], c[1], 0])],
                spatialReference: { wkid: 4326 }
                });

                const routeGraphic = new Graphic({
                geometry: polyline,
                symbol: {
                    type: "line-3d",
                    symbolLayers: [
                    {
                        type: "line",
                        material: { color: "#00ffff" },
                        size: 4
                    }
                    ]
                }
                });
                routeLayer.add(routeGraphic);

                // --- Car at start ---
                const start = lineCoords[0];
                carGraphic = new Graphic({
                geometry: {
                    type: "point",
                    longitude: start[0],
                    latitude: start[1]
                },
                symbol: {
                    type: "point-3d",
                    symbolLayers: [
                    {
                        type: "icon",
                        resource: { primitive: "circle" },
                        material: { color: CAR_COLOR },
                        outline: { color: "#000000", size: 1 },
                        size: CAR_SIZE
                    }
                    ],
                    verticalOffset: {
                    screenLength: 24,
                    minWorldLength: 20,
                    maxWorldLength: 200
                    }
                }
                });
                carLayer.add(carGraphic);

                // store route coords globally & maybe start animation
                routeCoords = lineCoords;
                maybeStartAnimation();
            });
        })
        .catch((err) => console.error(err));

        // ---------------------------------------
        // Camera follow helper
        // ---------------------------------------

        function updateCameraToCar(lon, lat) {
        view.goTo(
            {
            center: [lon, lat],
            heading: CAMERA_HEADING,
            zoom: CAMERA_ZOOM,
            tilt: CAMERA_TILT
            },
            {
            speedFactor: CAMERA_SPEED_FACTOR
            // animate: false // uncomment for instant (non-smooth) jumps
            }
        );
        }

        // ---------------------------------------
        // Time-based animation + follow camera
        // ---------------------------------------

        function animateCar(lineCoords) {
            if (!carGraphic || !lineCoords || lineCoords.length < 2) return;

            let progress = 0;
            const maxIndex = lineCoords.length - 1;
            const speed = CAR_SPEED_INDICES_PER_SECOND;
            let lastTime = null;
            let frameCount = 0;

            function step(timestamp) {
                updateFPS(timestamp);

                if (lastTime == null) lastTime = timestamp;
                const dt = (timestamp - lastTime) / 1000;
                lastTime = timestamp;

                progress += speed * dt;
                if (progress >= maxIndex) progress = 0;

                const i = Math.floor(progress);
                const t = progress - i;
                const p0 = lineCoords[i];
                const p1 = lineCoords[Math.min(i + 1, maxIndex)];

                const lon = p0[0] + (p1[0] - p0[0]) * t;
                const lat = p0[1] + (p1[1] - p0[1]) * t;

                carGraphic.geometry = {
                    type: "point",
                    longitude: lon,
                    latitude: lat
                };

                frameCount++;
                if (frameCount % CAMERA_UPDATE_EVERY_N_FRAMES === 0) {
                    updateCameraToCar(lon, lat);
                }

                animationId = requestAnimationFrame(step);
            }

            if (animationId) cancelAnimationFrame(animationId);
            animationId = requestAnimationFrame(step);
        }
    }
);