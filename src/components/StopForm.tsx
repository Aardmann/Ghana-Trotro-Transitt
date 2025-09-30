import React, { useState, useEffect } from "react";
import type { Stop } from "../types";

interface Props {
  stop?: Stop | null;
  onSave: (stop: Omit<Stop, "id"> & { id?: string }) => void;
  onCancel: () => void;
}

export default function StopForm({ stop, onSave, onCancel }: Props) {
  const [name, setName] = useState(stop?.name ?? "");
  const [lat, setLat] = useState(stop?.coords[0]?.toString() ?? "");
  const [lng, setLng] = useState(stop?.coords[1]?.toString() ?? "");

  useEffect(() => {
    setName(stop?.name ?? "");
    setLat(stop?.coords?.[0]?.toString() ?? "");
    setLng(stop?.coords?.[1]?.toString() ?? "");
  }, [stop]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const coords: [number, number] = [Number(lat), Number(lng)];
    if (!name || Number.isNaN(coords[0]) || Number.isNaN(coords[1])) {
      alert("Please enter valid name and coordinates.");
      return;
    }
    onSave({ id: (stop as any)?.id, name, coords });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 8 }}>
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        Latitude
        <input value={lat} onChange={(e) => setLat(e.target.value)} />
      </label>
      <label>
        Longitude
        <input value={lng} onChange={(e) => setLng(e.target.value)} />
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit">Save</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
