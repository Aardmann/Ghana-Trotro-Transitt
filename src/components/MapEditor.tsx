import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from "react-leaflet";
import type { Stop, Route } from "../types";

interface Props {
  stops: Stop[];
  routes: Route[];
  onAddStop: (coords: [number, number]) => void;
  onSelectStop: (id: string) => void;
  selectedStopId?: string | null;
}

function ClickHandler({ onAddStop }: { onAddStop: (coords: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      onAddStop([e.latlng.lat, e.latlng.lng]);
    }
  });
  return null;
}

export default function MapEditor({ stops, routes, onAddStop, onSelectStop }: Props) {
  const center: [number, number] = stops[0]?.coords ?? [5.6037, -0.1870];

  // Draw polylines for each route using stop coordinates lookup
  const coordsById = new Map(stops.map(s => [s.id, s.coords] as [string, [number, number]]));

  return (
    <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ClickHandler onAddStop={onAddStop} />

      {routes.map(r => {
        const a = coordsById.get(r.from);
        const b = coordsById.get(r.to);
        if (!a || !b) return null;
        return <Polyline key={r.id} positions={[a, b]} color="#7c3aed" weight={4} opacity={0.8} />;
      })}

      {stops.map(s => (
        <Marker
          key={s.id}
          position={s.coords}
          eventHandlers={{
            click: () => onSelectStop(s.id)
          }}
        >
          <Popup>
            <div style={{ minWidth: 150 }}>
              <div style={{ fontWeight: 700 }}>{s.name}</div>
              <div style={{ fontSize: 12, color: "#444" }}>{s.coords[0].toFixed(5)}, {s.coords[1].toFixed(5)}</div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
