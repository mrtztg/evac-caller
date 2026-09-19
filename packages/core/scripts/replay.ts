// Prints, hour by hour, the places at risk from the replayed real fire. Run: pnpm replay [max places per hour]
import { DEMO_FIRE, incidentAt, loadFixture, replayHours } from "../src/index.js";

const perHour = Number(process.argv[2] ?? 5);
const fx = loadFixture(DEMO_FIRE);
console.log(`REPLAY of ${fx.meta.name}`);
for (const s of fx.sources)
  console.log(`  source: ${s.name} (fetched ${s.fetched_at.slice(0, 16)}Z)`);
console.log(
  `  ${fx.hotspots.length} fire hotspots; ignored: ${fx.low_confidence_hotspots} low-confidence, ${fx.excluded_hotspots} isolated detections outside the fire`,
);
console.log("  Arrival times are ESTIMATES from a wind cone (10% rule), not a fire simulation.\n");

for (const t of replayHours(fx)) {
  const inc = incidentAt(fx, t);
  const stamp = t.toISOString().slice(0, 16).replace("T", " ");
  console.log(
    `${stamp} UTC | hotspots ${inc.front.length} (pass ${inc.data_time?.slice(11, 16) ?? "-"}) | wind ${inc.wind_text.split(",")[0]} | spread ${inc.spread_kmh?.toFixed(1) ?? "-"} km/h | at risk ≤1h ${inc.counts.within_1h}, ≤3h ${inc.counts.within_3h}, ≤6h ${inc.counts.within_6h}`,
  );
  for (const p of inc.places.slice(0, perHour))
    console.log(
      `    ${p.kind.padEnd(13)} ${p.name.slice(0, 45).padEnd(45)} ${String(p.distance_km).padStart(5)} km, fire to the ${p.fire_direction}, ${p.arrival_estimate} (${p.reason})${p.likely_empty ? `, likely empty: ${p.likely_empty}` : ""}`,
    );
}
