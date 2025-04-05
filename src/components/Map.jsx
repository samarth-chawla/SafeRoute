import { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import 'leaflet.heat';

// Marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const blueIcon = new L.Icon({
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const redIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const isPointNearPolyline = (point, polyline, tolerance = 0.001) => {
  return polyline.some((latlng) => {
    const dx = point[0] - latlng.lat;
    const dy = point[1] - latlng.lng;
    return Math.sqrt(dx * dx + dy * dy) < tolerance;
  });
};

const RoutingMachine = ({ 
  startPoint, 
  endPoint, 
  reports, 
  onRoutesComputed, 
  showDirections, 
  selectedRouteIndex 
}) => {
  const map = useMap();
  const [routeLayers, setRouteLayers] = useState([]);
  const [routingControl, setRoutingControl] = useState(null);
  const [previousSelectedIndex, setPreviousSelectedIndex] = useState(null);

  useEffect(() => {
    if (routingControl) {
      const container = routingControl.getContainer();
      if (container) {
        container.style.display = showDirections ? 'block' : 'none';
      }
    }
  }, [showDirections, routingControl]);

  useEffect(() => {
    if (previousSelectedIndex !== null && previousSelectedIndex !== selectedRouteIndex && routeLayers[previousSelectedIndex]) {
      routeLayers[previousSelectedIndex].setStyle({
        dashArray: '10, 10',
        weight: 4,
        opacity: showDirections ? 0.6 : 0
      });
    }
    
    if (routeLayers[selectedRouteIndex]) {
      routeLayers[selectedRouteIndex].setStyle({
        dashArray: null,
        weight: 8,
        opacity: showDirections ? 1 : 0
      });
      
      const bounds = routeLayers[selectedRouteIndex].getBounds();
      map.fitBounds(bounds, { padding: [50, 50] });
    }
    
    setPreviousSelectedIndex(selectedRouteIndex);
  }, [selectedRouteIndex, showDirections]);

  useEffect(() => {
    if (!startPoint || !endPoint) return;

    routeLayers.forEach(layer => {
      if (layer && map.hasLayer(layer)) map.removeLayer(layer);
    });
    if (routingControl) {
      routingControl.remove();
    }

    const routeStyles = [
      { color: '#2563eb', name: 'Fastest Route' },
      { color: '#dc2626', name: 'Alternative 1' },
      { color: '#059669', name: 'Alternative 2' },
      { color: '#7c3aed', name: 'Alternative 3' },
    ];

    const control = L.Routing.control({
      waypoints: [
        L.latLng(startPoint.lat, startPoint.lng),
        L.latLng(endPoint.lat, endPoint.lng),
      ],
      router: new L.Routing.OSRMv1({
        serviceUrl: 'https://routing.openstreetmap.de/routed-car/route/v1',
      }),
      createMarker: () => null,
      showAlternatives: true,
      addWaypoints: false,
      fitSelectedRoutes: false,
      routeWhileDragging: false,
      show: showDirections,
      lineOptions: { styles: [] },
      containerClassName: 'leaflet-routing-container',
    }).addTo(map);

    // Position the routing container in the top-right corner
    const container = control.getContainer();
    container.style.position = 'absolute';
    container.style.top = '70px';
    container.style.right = '10px';
    container.style.display = showDirections ? 'block' : 'none';
    container.style.backgroundColor = 'white';
    container.style.padding = '10px';
    container.style.borderRadius = '4px';
    container.style.boxShadow = '0 1px 5px rgba(0,0,0,0.2)';
    container.style.maxHeight = '400px';
    container.style.overflowY = 'auto';
    container.style.zIndex = 999;

    setRoutingControl(control);

    control.on('routesfound', (e) => {
      const newLayers = [];

      const routeData = e.routes.map((route, i) => {
        const style = routeStyles[i % routeStyles.length];
        const isSelected = i === selectedRouteIndex;

        const polyline = L.polyline(route.coordinates, {
          color: style.color,
          weight: isSelected ? 8 : 4,
          opacity: showDirections ? (isSelected ? 1 : 0.6) : 0,
          dashArray: isSelected ? null : '10, 10',
          lineCap: 'round',
        }).addTo(map);

        if (isSelected) {
          const bounds = polyline.getBounds();
          map.fitBounds(bounds, { padding: [50, 50] });
        }

        polyline.on('mouseover', () => {
          if (!isSelected) {
            polyline.setStyle({ 
              weight: 6, 
              opacity: 1 
            });
          }
        });

        polyline.on('mouseout', () => {
          if (!isSelected) {
            polyline.setStyle({ 
              weight: 4, 
              opacity: showDirections ? 0.6 : 0,
              dashArray: '10, 10'
            });
          }
        });

        newLayers.push(polyline);

        const nearReports = reports.filter((r) => isPointNearPolyline(r.location, route.coordinates));
        const scores = {
          danger: nearReports.filter(r => r.category === 'danger').length,
          caution: nearReports.filter(r => r.category === 'caution').length,
          safe: nearReports.filter(r => r.category === 'safe').length,
        };

        return {
          index: i,
          name: style.name,
          summary: route.summary,
          safetyScore: scores,
          color: style.color,
          isDashed: !isSelected,
        };
      });

      setRouteLayers(newLayers);
      onRoutesComputed(routeData);
    });

    return () => {
      control.remove();
      routeLayers.forEach(layer => map.removeLayer(layer));
    };
  }, [startPoint, endPoint, reports, showDirections]);

  return null;
};

const HeatmapLayer = ({ reports }) => {
  const map = useMap();

  useEffect(() => {
    const heatPoints = reports.map((r) => [
      r.location[0],
      r.location[1],
      r.category === 'danger' ? 1.0 : r.category === 'caution' ? 0.5 : 0.2,
    ]);

    const layer = L.heatLayer(heatPoints, {
      radius: 25,
      blur: 15,
      gradient: {
        0.2: 'green',
        0.5: 'yellow',
        1.0: 'red',
      },
    }).addTo(map);

    return () => {
      map.removeLayer(layer);
    };
  }, [reports]);

  return null;
};

const DotsLayer = ({ reports }) => {
  const map = useMap();

  useEffect(() => {
    const markers = reports.map((r) =>
      L.circleMarker(r.location, {
        radius: 6,
        color:
          r.category === 'danger'
            ? '#ef4444'
            : r.category === 'caution'
              ? '#facc15'
              : '#22c55e',
        fillOpacity: 0.8,
      }).addTo(map)
    );

    return () => markers.forEach((m) => map.removeLayer(m));
  }, [reports]);

  return null;
};

const UserLocationMarker = ({ position }) => {
  const map = useMap();

  useEffect(() => {
    if (!position) return;

    const marker = L.circleMarker(position, {
      radius: 8,
      color: '#2563eb',
      fillColor: '#3b82f6',
      fillOpacity: 0.8,
    }).addTo(map);

    map.setView(position, 13);

    return () => map.removeLayer(marker);
  }, [position]);

  return null;
};

const RouteSafetyPanel = ({ 
  routes, 
  visible, 
  onToggle, 
  selectedRouteIndex, 
  onRouteSelect 
}) => {
  if (!visible) {
    return (
      <button
        onClick={onToggle}
        className="absolute bottom-4 left-4 bg-blue-600 text-white px-4 py-2 rounded shadow z-[999]"
      >
        Show Route Safety
      </button>
    );
  }

  return (
    <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md p-4 w-72 z-[999]">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold">Route Safety</h2>
        <button onClick={onToggle} className="text-sm text-blue-600 underline">
          Hide
        </button>
      </div>
      {routes.map((r, i) => (
        <div 
          key={i} 
          className={`mb-3 border-b pb-2 last:border-b-0 cursor-pointer transition-colors ${
            selectedRouteIndex === i ? 'bg-blue-50' : 'hover:bg-gray-50'
          }`}
          onClick={() => onRouteSelect(i)}
        >
          <p className="font-medium flex items-center gap-2">
            <span
              className={`inline-block w-16 h-2 rounded ${r.isDashed ? 'border-t-2' : ''}`}
              style={{
                backgroundColor: r.isDashed ? 'transparent' : r.color,
                borderColor: r.isDashed ? r.color : 'transparent',
                borderStyle: r.isDashed ? 'dashed' : 'solid',
              }}
            ></span>
            {r.name}
            {selectedRouteIndex === i && (
              <span className="ml-auto text-blue-600 text-sm">Selected</span>
            )}
          </p>
          <p className="text-sm text-gray-600">
            Distance: {(r.summary.totalDistance / 1000).toFixed(2)} km<br />
            Duration: {(r.summary.totalTime / 60).toFixed(1)} min
          </p>
          <p className="text-sm mt-1">
            🚨 Danger: {r.safetyScore.danger}
            <br />
            ⚠ Caution: {r.safetyScore.caution}
            <br />
            ✅ Safe: {r.safetyScore.safe}
          </p>
        </div>
      ))}
    </div>
  );
};

export const Map = ({ reports, startPoint, endPoint, showHeatmap }) => {
  const [userLocation, setUserLocation] = useState([28.6139, 77.209]);
  const [routeSafetyInfo, setRouteSafetyInfo] = useState([]);
  const [panelVisible, setPanelVisible] = useState(true);
  const [showDirections, setShowDirections] = useState(true);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => {
        console.error(err);
      },
      { enableHighAccuracy: true }
    );
  }, []);

  return (
    <div className="relative w-full h-full">
      <MapContainer center={userLocation} zoom={13} className="h-[calc(100vh-4rem)] w-full z-0">
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <UserLocationMarker position={userLocation} />
        {showHeatmap ? <HeatmapLayer reports={reports} /> : <DotsLayer reports={reports} />}

        {startPoint && (
          <Marker position={[startPoint.lat, startPoint.lng]} icon={blueIcon}>
            <Popup>Start Point</Popup>
          </Marker>
        )}
        {endPoint && (
          <Marker position={[endPoint.lat, endPoint.lng]} icon={redIcon}>
            <Popup>End Point</Popup>
          </Marker>
        )}

        {startPoint && endPoint && (
          <RoutingMachine
            startPoint={startPoint}
            endPoint={endPoint}
            reports={reports}
            onRoutesComputed={setRouteSafetyInfo}
            showDirections={showDirections}
            selectedRouteIndex={selectedRouteIndex}
          />
        )}
      </MapContainer>

      <RouteSafetyPanel
        routes={routeSafetyInfo}
        visible={panelVisible}
        onToggle={() => setPanelVisible((prev) => !prev)}
        selectedRouteIndex={selectedRouteIndex}
        onRouteSelect={setSelectedRouteIndex}
      />

      <button
        onClick={() => setShowDirections((prev) => !prev)}
        className="absolute top-4 right-4 bg-white text-gray-700 px-4 py-2 rounded shadow z-[999] hover:bg-gray-100"
      >
        {showDirections ? 'Hide Directions' : 'Show Directions'}
      </button>
    </div>
  );
};

export default Map;