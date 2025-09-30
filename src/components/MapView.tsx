import React from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Stop } from "../types";

interface MapViewProps {
  stops: Stop[];
  onMapClick: (coords: [number, number]) => void;
}

const MapEvents: React.FC<{ onMapClick: (coords: [number, number]) => void }> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
};

const MapView: React.FC<MapViewProps> = ({ stops, onMapClick }) => {
  return (
    <MapContainer center={[5.6037, -0.1870]} zoom={12} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapEvents onMapClick={onMapClick} />
      {stops.map((s, i) => (
        <Marker key={i} position={s.coords}>
          <Popup>{s.name}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default MapView;
