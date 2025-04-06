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

// Default Marker Fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const blueIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const normalizeLocation = (loc) => Array.isArray(loc) ? loc : [loc.lat, loc.lng];

const getDistanceFromLatLng = (lat1, lng1, lat2, lng2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
};

const getPointToLineDistance = (point, lineStart, lineEnd) => {
  const lat = point[0];
  const lng = point[1];
  const lat1 = lineStart.lat;
  const lng1 = lineStart.lng;
  const lat2 = lineEnd.lat;
  const lng2 = lineEnd.lng;

  // Convert to radians
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const φ = lat * Math.PI / 180;
  const λ1 = lng1 * Math.PI / 180;
  const λ2 = lng2 * Math.PI / 180;
  const λ = lng * Math.PI / 180;

  // If line segment is very short, just return distance to one endpoint
  if (Math.abs(lat1 - lat2) < 0.00001 && Math.abs(lng1 - lng2) < 0.00001) {
    return getDistanceFromLatLng(lat, lng, lat1, lng1);
  }

  // Calculate the bearing from start to end
  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) -
           Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
  const bearing1 = Math.atan2(y, x);

  // Calculate the bearing from start to point
  const y2 = Math.sin(λ - λ1) * Math.cos(φ);
  const x2 = Math.cos(φ1) * Math.sin(φ) -
            Math.sin(φ1) * Math.cos(φ) * Math.cos(λ - λ1);
  const bearing2 = Math.atan2(y2, x2);

  // Calculate distance from start to point
  const d13 = getDistanceFromLatLng(lat1, lng1, lat, lng);

  // Calculate cross-track distance
  const dxt = Math.abs(Math.asin(Math.sin(d13/6371e3) * 
                      Math.sin(bearing2 - bearing1)) * 6371e3);

  // Calculate along-track distance
  const dat = Math.acos(Math.cos(d13/6371e3) / 
                       Math.cos(dxt/6371e3)) * 6371e3;

  // Check if point is beyond the segment endpoints
  const d12 = getDistanceFromLatLng(lat1, lng1, lat2, lng2);
  
  if (dat > d12) {
    return getDistanceFromLatLng(lat, lng, lat2, lng2);
  }
  
  if (dat < 0) {
    return getDistanceFromLatLng(lat, lng, lat1, lng1);
  }

  return dxt;
};

const isPointNearPolyline = (point, coordinates, tolerance = 400) => { // Changed tolerance to 400 meters
  for (let i = 0; i < coordinates.length - 1; i++) {
    const distance = getPointToLineDistance(
      point,
      coordinates[i],
      coordinates[i + 1]
    );
    
    if (distance < tolerance) return true;
  }
  return false;
};

const calculateSafetyScore = (safetyScore) => {
  const weights = {
    danger: 3,
    caution: 2,
    safe: 1
  };

  const weightedSum = 
    safetyScore.danger * weights.danger +
    safetyScore.caution * weights.caution -
    safetyScore.safe * weights.safe;

  const maxScore = Math.max(weightedSum, 0);
  const score = Math.max(0, Math.min(100, 100 - (maxScore * 10)));

  return score;
};

const getSafetyLabel = (score) => {
  if (score >= 80) return { text: 'Very Safe', color: 'text-green-600' };
  if (score >= 60) return { text: 'Safe', color: 'text-green-500' };
  if (score >= 40) return { text: 'Moderate', color: 'text-yellow-500' };
  if (score >= 20) return { text: 'Caution', color: 'text-orange-500' };
  return { text: 'High Risk', color: 'text-red-600' };
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
        opacity: showDirections ? 0.6 : 0,
      });
    }

    if (routeLayers[selectedRouteIndex]) {
      routeLayers[selectedRouteIndex].setStyle({
        dashArray: null,
        weight: 8,
        opacity: showDirections ? 1 : 0,
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
      waypoints: [L.latLng(startPoint.lat, startPoint.lng), L.latLng(endPoint.lat, endPoint.lng)],
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

    const container = control.getContainer();
    Object.assign(container.style, {
      position: 'absolute',
      top: '70px',
      right: '10px',
      display: showDirections ? 'block' : 'none',
      backgroundColor: 'white',
      padding: '10px',
      borderRadius: '4px',
      boxShadow: '0 1px 5px rgba(0,0,0,0.2)',
      maxHeight: '400px',
      overflowY: 'auto',
      zIndex: 999,
    });

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
          map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
        }

        polyline.on('mouseover', () => {
          if (!isSelected) polyline.setStyle({ weight: 6, opacity: 1 });
        });

        polyline.on('mouseout', () => {
          if (!isSelected) polyline.setStyle({ weight: 4, opacity: showDirections ? 0.6 : 0, dashArray: '10, 10' });
        });

        newLayers.push(polyline);

        // Count reports near the route using improved distance calculation
        const nearReports = reports.filter(report => {
          const reportLocation = normalizeLocation(report.location);
          return isPointNearPolyline(reportLocation, route.coordinates);
        });

        const safetyScore = {
          danger: nearReports.filter(r => r.category === 'danger').length,
          caution: nearReports.filter(r => r.category === 'caution').length,
          safe: nearReports.filter(r => r.category === 'safe').length,
        };

        const overallSafetyScore = calculateSafetyScore(safetyScore);

        return {
          index: i,
          name: style.name,
          summary: route.summary,
          safetyScore,
          overallSafetyScore,
          color: style.color,
          isDashed: !isSelected,
        };
      });

      setRouteLayers(newLayers);
      onRoutesComputed(routeData);
    });

    return () => {
      control.remove();
      routeLayers.forEach((layer) => map.removeLayer(layer));
    };
  }, [startPoint, endPoint, reports, showDirections]);

  return null;
};

const HeatmapLayer = ({ reports }) => {
  const map = useMap();

  useEffect(() => {
    const heatPoints = reports.map((r) => {
      const [lat, lng] = normalizeLocation(r.location);
      return [lat, lng, r.category === 'danger' ? 1.0 : r.category === 'caution' ? 0.5 : 0.2];
    });

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

const getColor = (category) => {
  const type = category?.toLowerCase();
  if (type === 'danger') return '#ef4444';
  if (type === 'caution') return '#facc15';
  return '#22c55e';
};

const DotsLayer = ({ reports }) => {
  const map = useMap();

  useEffect(() => {
    if (!Array.isArray(reports)) return;

    const markers = reports.map((r) => {
      const [lat, lng] = normalizeLocation(r.location);
      return L.circleMarker([lat, lng], {
        radius: 6,
        color: getColor(r.category),
        fillColor: getColor(r.category),
        fillOpacity: 0.8,
      }).addTo(map);
    });

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

const RouteSafetyPanel = ({ routes, visible, onToggle, selectedRouteIndex, onRouteSelect }) => {
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
    <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md p-4 w-80 z-[999]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Route Safety</h2>
        <button onClick={onToggle} className="text-sm text-blue-600 hover:underline">Hide</button>
      </div>
      {routes.map((r, i) => {
        const safetyLabel = getSafetyLabel(r.overallSafetyScore);
        return (
          <div
            key={i}
            className={`mb-4 p-3 rounded-lg border transition-colors cursor-pointer ${
              selectedRouteIndex === i 
                ? 'bg-blue-50 border-blue-200' 
                : 'hover:bg-gray-50 border-gray-200'
            }`}
            onClick={() => onRouteSelect(i)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block w-16 h-2 rounded ${r.isDashed ? 'border-t-2' : ''}`}
                  style={{
                    backgroundColor: r.isDashed ? 'transparent' : r.color,
                    borderColor: r.isDashed ? r.color : 'transparent',
                    borderStyle: r.isDashed ? 'dashed' : 'solid',
                  }}
                ></span>
                <span className="font-medium">{r.name}</span>
              </div>
              {selectedRouteIndex === i && (
                <span className="text-blue-600 text-sm">Selected</span>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="text-sm text-gray-600">
                <div>Distance: {(r.summary.totalDistance / 1000).toFixed(2)} km</div>
                <div>Duration: {(r.summary.totalTime / 60).toFixed(1)} min</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">{Math.round(r.overallSafetyScore)}</div>
                <div className={`text-sm ${safetyLabel.color}`}>{safetyLabel.text}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="flex flex-col items-center p-2 bg-red-50 rounded">
                <span className="text-red-600 font-semibold">{r.safetyScore.danger}</span>
                <span className="text-xs text-gray-600">Danger</span>
              </div>
              <div className="flex flex-col items-center p-2 bg-yellow-50 rounded">
                <span className="text-yellow-600 font-semibold">{r.safetyScore.caution}</span>
                <span className="text-xs text-gray-600">Caution</span>
              </div>
              <div className="flex flex-col items-center p-2 bg-green-50 rounded">
                <span className="text-green-600 font-semibold">{r.safetyScore.safe}</span>
                <span className="text-xs text-gray-600">Safe</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const Map = ({ startPoint, endPoint, showHeatmap }) => {
  const [userLocation, setUserLocation] = useState([28.6139, 77.209]);
  const [reports, setReports] = useState([]);
  const [routeSafetyInfo, setRouteSafetyInfo] = useState([]);
  const [panelVisible, setPanelVisible] = useState(true);
  const [showDirections, setShowDirections] = useState(true);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    fetch('/api/reports')
      .then(res => res.json())
      .then(data => setReports(data))
      .catch(err => console.error('Failed to fetch reports:', err));
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
        {startPoint && <Marker position={[startPoint.lat, startPoint.lng]} icon={blueIcon}><Popup>Start Point</Popup></Marker>}
        {endPoint && <Marker position={[endPoint.lat, endPoint.lng]} icon={redIcon}><Popup>End Point</Popup></Marker>}

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
        onToggle={() => setPanelVisible(prev => !prev)}
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