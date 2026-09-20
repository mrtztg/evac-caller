"use client";

import type * as L from "leaflet";
import { useEffect, useRef, useState } from "react";
import type { IncidentResponse, Place } from "./types";

/** Soonest arrival first: the colour of the place pin and of the danger zone ring. */
const BAND_COLOUR = (arrivalH: number) =>
  arrivalH <= 1 ? "#ff4d2e" : arrivalH <= 3 ? "#ff9a3d" : "#ffd04d";

const ZONE_STYLE: Record<number, { color: string; fillOpacity: number }> = {
  1: { color: "#ff4d2e", fillOpacity: 0.22 },
  3: { color: "#ff9a3d", fillOpacity: 0.12 },
  6: { color: "#ffd04d", fillOpacity: 0.07 },
};

export default function Map({
  incident,
  selected,
  onSelect,
}: {
  incident: IncidentResponse | null;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const leaflet = useRef<typeof L | null>(null);
  // Only the first incident sets the view, so the map does not jump when the slider moves.
  const framed = useRef(false);
  // The incident can arrive before Leaflet does; this makes the drawing effect run again.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const mod = (await import("leaflet")).default;
      if (cancelled || map.current) return;
      leaflet.current = mod;
      map.current = mod.map("map", { zoomControl: true, attributionControl: true });
      mod
        .tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        })
        .addTo(map.current);
      map.current.setView([39.83, -0.24], 11);
      layer.current = mod.layerGroup().addTo(map.current);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const mod = leaflet.current;
    if (!mod || !map.current || !layer.current || !incident) return;
    layer.current.clearLayers();
    const group = layer.current;

    // Widest zone first, so the 1-hour zone stays on top.
    for (const zone of [...incident.zones].sort((a, b) => b.hours - a.hours)) {
      if (zone.polygon.length < 3) continue;
      const style = ZONE_STYLE[zone.hours] ?? ZONE_STYLE[6];
      mod
        .polygon(zone.polygon, {
          color: style?.color,
          weight: 1,
          fillColor: style?.color,
          fillOpacity: style?.fillOpacity ?? 0.1,
        })
        .bindTooltip(`Fire could reach here within ${zone.hours} h (estimate)`)
        .addTo(group);
    }

    for (const h of incident.front)
      mod
        .circleMarker([h.lat, h.lon], {
          radius: 3,
          color: "#ff6a3d",
          weight: 0,
          fillColor: "#ff6a3d",
          fillOpacity: 0.85,
        })
        .bindTooltip(`${h.satellite} ${h.time.slice(11, 16)} UTC · ${h.frp} MW`)
        .addTo(group);

    for (const p of incident.places as Place[]) {
      const on = p.id === selected;
      mod
        .circleMarker([p.lat, p.lon], {
          radius: on ? 10 : 6,
          color: "#0c1210",
          weight: on ? 3 : 1.5,
          fillColor: BAND_COLOUR(p.arrival_h),
          fillOpacity: 1,
        })
        .bindTooltip(`${p.name} · ${p.distance_km} km · ${p.arrival_estimate}`)
        .on("click", () => onSelect(p.id))
        .addTo(group);
    }

    if (!framed.current && incident.front.length) {
      const points = incident.front.map((h) => [h.lat, h.lon] as [number, number]);
      map.current.fitBounds(mod.latLngBounds(points).pad(1.2));
      framed.current = true;
    }
  }, [ready, incident, selected, onSelect]);

  return <div id="map" />;
}
