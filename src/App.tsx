import { useEffect, useState, type JSX } from "react";
import MapView from "./components/MapView";
import type { Stop, Route } from "./types";
import "./index.css";
import { supabase } from "./lib/supabase";

export default function App(): JSX.Element {
  const [stops, setStops] = useState<Stop[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);

  const [newStopName, setNewStopName] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [fare, setFare] = useState<number>(0);

  const [showStops, setShowStops] = useState(false);
  const [showRoutes, setShowRoutes] = useState(false);

  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [intermediateStops, setIntermediateStops] = useState<string[]>([]);

  // NEW: states for admin editing
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [searchStops, setSearchStops] = useState("");
  const [searchRoutes, setSearchRoutes] = useState("");
  const [editingStop, setEditingStop] = useState<Stop | null>(null);
  const [editingRoute, setEditingRoute] = useState<any>(null);

  function rowToStop(row: any): Stop {
    return {
      id: String(row.id),
      name: row.name,
      coords: [Number(row.lat), Number(row.lng)],
    };
  }

  // fetchRoutes now joins stop names so we don't show UUIDs
  const fetchRoutes = async () => {
    setLoading(true);
    try {
      // request relational join for from_stop and to_stop
      const { data, error } = await supabase
        .from("routes")
        .select(`
          id,
          fare,
          from_stop ( id, name ),
          to_stop ( id, name )
        `);

      if (error) throw error;

      if (Array.isArray(data)) {
        const mapped = data.map((row: any) => {
          const fromName = row.from_stop?.name ?? String(row.from_stop);
          const toName = row.to_stop?.name ?? String(row.to_stop);
          return {
            id: row.id,
            from: fromName,
            to: toName,
            fare: row.fare,
            distance: 0,
          } as Route;
        });
        setRoutes(mapped);
      }
    } catch (err: any) {
      console.error("fetchRoutes error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStops = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("stops")
        .select("id, name, lat, lng")
        .order("inserted_at", { ascending: true });
      if (error) throw error;
      if (Array.isArray(data)) {
        setStops(data.map(rowToStop));
      }
    } catch (err: any) {
      console.error("fetchStops error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      // ensure stops are loaded first so mapping works
      await fetchStops();
      await fetchRoutes();
    };
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    (async () => {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      setUser(u ?? null);
      if (u) {
        await fetchStops();
        await fetchRoutes();
      }
    })();

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMapClick = async (latlng: [number, number]) => {
    if (!newStopName) {
      alert("Please enter a stop name first.");
      return;
    }
    if (!user) {
      alert("You must be signed in to add stops. Please sign in first.");
      return;
    }

    const payload = {
      name: newStopName,
      lat: latlng[0],
      lng: latlng[1],
    };

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("stops")
        .insert([payload])
        .select("id, name, lat, lng")
        .single();

      if (error) throw error;
      setStops((prev) => [...prev, rowToStop(data)]);
      setNewStopName("");
    } catch (err: any) {
      console.error("Insert stop error:", err);
      alert("Error adding stop: " + (err?.message ?? String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoute = async () => {
    if (!from || !to) {
      alert("Please select both 'From' and 'To' stops.");
      return;
    }
    if (fare <= 0) {
      alert("Please enter a valid fare greater than 0.");
      return;
    }

    try {
      const { data: route, error: routeError } = await supabase
        .from("routes")
        .insert([{ from_stop: from, to_stop: to, fare }])
        .select("id")
        .single();

      if (routeError) throw routeError;

      const stopEntries = intermediateStops.map((stopId, idx) => ({
        route_id: route.id,
        stop_id: stopId,
        stop_order: idx + 1,
      }));

      if (stopEntries.length > 0) {
        const { error: stopsError } = await supabase
          .from("route_stops")
          .insert(stopEntries);
        if (stopsError) throw stopsError;
      }

      alert("Route added successfully!");
      setFrom("");
      setTo("");
      setFare(0);
      setIntermediateStops([]);
      await fetchRoutes();
    } catch (err: any) {
      console.error("Insert route error:", err);
      alert("Error adding route: " + err.message);
    }
  };

  const handleUpdateStop = async (id: string, name: string) => {
    if (!editingStop) return;
    try {
      const { data, error } = await supabase
        .from("stops")
        .update({ name: editingStop.name })
        .eq("id", editingStop.id)
        .select();

      if (error) throw error;

      // supabase returns array of updated rows when using .select()
      if (!data || data.length === 0) {
        // most likely RLS policy prevents update
        alert("No stop updated — check the ID and RLS policies in Supabase." + id + "  " + name);
        return;
      }

      await fetchStops();
      setEditingStop(null);
      alert("Update successful");
    } catch (err: any) {
      console.error("Update stop error:", err);
      alert("Error updating stop: " + (err?.message ?? String(err)));
    }
  };

  const handleDeleteStop = async (id: string) => {
    try {
      await supabase.from("stops").delete().eq("id", id);
      await fetchStops();
    } catch (err) {
      console.error("Delete stop error:", err);
      alert("Error deleting stop");
    }
  };

  const handleUpdateRoute = async () => {
    if (!editingRoute) return;
    try {
      const { data, error } = await supabase
        .from("routes")
        .update({ fare: editingRoute.fare })
        .eq("id", editingRoute.id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        alert("No route updated — check RLS policies");
        return;
      }

      await fetchRoutes();
      setEditingRoute(null);
      alert("Route updated");
    } catch (err) {
      console.error("Update route error:", err);
      alert("Error updating route");
    }
  };

  const handleDeleteRoute = async (id: string) => {
    try {
      await supabase.from("routes").delete().eq("id", id);
      await fetchRoutes();
    } catch (err) {
      console.error("Delete route error:", err);
      alert("Error deleting route");
    }
  };

  const handleSignIn = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });
      if (error) throw error;
      setUser(data.user ?? null);
      await fetchStops();
      await fetchRoutes();
      alert("Signed in");
    } catch (err: any) {
      console.error("Sign-in error:", err);
      alert("Sign-in error: " + (err?.message ?? String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    alert("Signed out");
  };

  return (
    <div className="app-root">
      {/* Header */}
      <header className="app-header">
        <div className="header-inner">
          <div className="brand">
            <div className="brand-title">Accra Transit</div>
            <div className="brand-sub">Admin</div>
          </div>
          <div style={{ flex: 1 }} />
          {user && (
            <button
              className="btn ghost"
              onClick={() => setShowAdminMenu(!showAdminMenu)}
            >
              ☰
            </button>
          )}
          {!user ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                placeholder="admin@example.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="input"
                style={{ width: 200 }}
              />
              <input
                placeholder="password"
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="input"
                style={{ width: 140 }}
              />
              <button className="btn" onClick={handleSignIn} disabled={loading}>
                Sign In
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ color: "white" }}>{user.email}</div>
              <button className="btn ghost" onClick={handleSignOut}>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Admin Menu */}
      {/* Admin Menu */}
{showAdminMenu && (
  <div className="admin-menu">
    <h3>Search Stop</h3>
    <input
      placeholder="Search stops..."
      value={searchStops}
      onChange={(e) => setSearchStops(e.target.value)}
    />
    <ul>
      {(searchStops
        ? stops.filter((s) =>
            s.name.toLowerCase().includes(searchStops.toLowerCase())
          )
        : stops.slice(0, 10) // ✅ Only 10 recent by default
      ).map((s) => (
        <li key={s.id}>
          {editingStop?.id === s.id ? (
            <>
              <input
                value={editingStop.name}
                onChange={(e) =>
                  setEditingStop({ ...editingStop, name: e.target.value })
                }
              />
              <button onClick={() => handleUpdateStop(s.id, editingStop.name)}>
                Save
              </button>
              <button onClick={() => setEditingStop(null)}>Cancel</button>
            </>
          ) : (
            <>
              {s.name}
              <button onClick={() => setEditingStop(s)}>Edit</button>
              <button onClick={() => handleDeleteStop(s.id)}>Delete</button>
            </>
          )}
        </li>
      ))}
    </ul>

    <h3>Search Route</h3>
    <input
      placeholder="Search routes..."
      value={searchRoutes}
      onChange={(e) => setSearchRoutes(e.target.value)}
    />
    <ul>
      {(searchRoutes
        ? routes.filter(
            (r) =>
              r.from.toLowerCase().includes(searchRoutes.toLowerCase()) ||
              r.to.toLowerCase().includes(searchRoutes.toLowerCase())
          )
        : routes.slice(0, 10) // ✅ Only 10 recent by default
      ).map((r) => (
        <li key={r.id}>
          {editingRoute?.id === r.id ? (
            <>
              {r.from} → {r.to}
              <input
                type="number"
                value={editingRoute.fare}
                onChange={(e) =>
                  setEditingRoute({
                    ...editingRoute,
                    fare: Number(e.target.value),
                  })
                }
              />
              <button onClick={handleUpdateRoute}>Save</button>
              <button onClick={() => setEditingRoute(null)}>Cancel</button>
            </>
          ) : (
            <>
              {r.from} → {r.to} (GH₵ {r.fare})
              <button onClick={() => setEditingRoute(r)}>Edit</button>
              <button onClick={() => handleDeleteRoute(r.id)}>Delete</button>
            </>
          )}
        </li>
      ))}
    </ul>
  </div>
)}


      {/* Main Content */}
      <main className="app-main">
        <div className="map-wrapper">
          <MapView stops={stops} onMapClick={handleMapClick} />
        </div>
      </main>

      {/* Persistent Bottom Card */}
      <div className="bottom-card">
        <div className="card-inner">
          <h2>Manage Stops</h2>
          <div className="controls">
            <input
              type="text"
              placeholder="New stop name"
              value={newStopName}
              onChange={(e) => setNewStopName(e.target.value)}
              className="input"
            />
            <p className="hint">Click on map to set stop location</p>
          </div>

          {/* Stops list toggle */}
          <button className="btn" onClick={() => setShowStops(!showStops)}>
            {showStops ? "Hide Stops List" : "Show Stops List"}
          </button>
          {showStops && (
            <>
              <h3>Stops List {loading ? " (loading...)" : ""}</h3>
              <ul className="legs-list">
                {stops.map((s) => (
                  <li key={s.id} className="leg-item">
                    <div className="leg-text">{s.name}</div>
                    <div className="leg-right">
                      {s.coords[0].toFixed(3)}, {s.coords[1].toFixed(3)}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Add Routes Section */}
          <h2>Add Routes</h2>
          <div className="controls">
            <input
              type="text"
              placeholder="Search From stop (type name or paste id)"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              list="stops-list"
              className="input"
            />
            <datalist id="stops-list">
              {stops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </datalist>

            {intermediateStops.map((stopId, idx) => (
              <div key={idx} style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder={`Intermediate Stop ${idx + 1}`}
                  value={stopId}
                  onChange={(e) => {
                    const newStops = [...intermediateStops];
                    newStops[idx] = e.target.value;
                    setIntermediateStops(newStops);
                  }}
                  list="stops-list"
                  className="input"
                />
                <button
                  className="btn ghost"
                  onClick={() =>
                    setIntermediateStops(
                      intermediateStops.filter((_, i) => i !== idx)
                    )
                  }
                >
                  Remove
                </button>
              </div>
            ))}

            <button
              className="btn"
              onClick={() => setIntermediateStops([...intermediateStops, ""])}
            >
              + Add Intermediate Stop
            </button>

            <input
              type="text"
              placeholder="Search To stop (type name or paste id)"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              list="stops-list"
              className="input"
            />

            <input
              type="number"
              placeholder="Fare (GH₵)"
              value={fare}
              onChange={(e) => setFare(Number(e.target.value))}
              className="input"
            />

            <button className="btn" onClick={handleAddRoute}>
              Add Route
            </button>
          </div>

          {/* Routes list toggle */}
          <button className="btn" onClick={() => setShowRoutes(!showRoutes)}>
            {showRoutes ? "Hide Routes List" : "Show Routes List"}
          </button>
          {showRoutes && (
            <>
              <h3>Routes List</h3>
              <ul className="legs-list">
                {routes.map((r, idx) => (
                  <li key={idx} className="leg-item">
                    <div className="leg-text">
                      {r.from} → {r.to}
                    </div>
                    <div className="leg-right">GH₵ {r.fare}</div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
