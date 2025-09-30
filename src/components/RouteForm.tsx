import React, { useState } from "react";
import type { Route, Stop } from "../types";

interface Props {
  stops: Stop[];
  route?: Route | null;
  onSave: (route: Omit<Route, "id"> & { id?: string }) => void;
  onCancel: () => void;
}

export default function RouteForm({ stops, route, onSave, onCancel }: Props) {
  const [from, setFrom] = useState(route?.from ?? (stops[0]?.id ?? ""));
  const [to, setTo] = useState(route?.to ?? (stops[1]?.id ?? ""));
  const [fare, setFare] = useState(route?.fare?.toString() ?? "0");
  const [transport, setTransport] = useState(route?.transport ?? "Taxi");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (from === to) { alert("From and To cannot be the same."); return; }
    const f = Number(fare);
    if (Number.isNaN(f)) { alert("Invalid fare"); return; }
    onSave({ id: (route as any)?.id, from, to, fare: f, transport });
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 8 }}>
      <label>
        From
        <select value={from} onChange={e => setFrom(e.target.value)}>
          {stops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      <label>
        To
        <select value={to} onChange={e => setTo(e.target.value)}>
          {stops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      <label>
        Fare (GH₵)
        <input value={fare} onChange={e => setFare(e.target.value)} />
      </label>
      <label>
        Transport
        <input value={transport} onChange={e => setTransport(e.target.value)} />
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit">Save</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
