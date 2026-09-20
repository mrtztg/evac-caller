"use client";

import dynamicImport from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { type CallRow, callRows } from "./calls";
import type { CallEvent, IncidentResponse } from "./types";

// Leaflet needs a browser.
const Map = dynamicImport(() => import("./Map"), { ssr: false });

const CALLS_POLL_MS = 2000;

const hhmm = (iso: string) => iso.slice(11, 16);
const localHour = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function Page() {
  const [incident, setIncident] = useState<IncidentResponse | null>(null);
  const [events, setEvents] = useState<CallEvent[]>([]);
  const [index, setIndex] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  // First load: no hour asked for, so the API answers with the hour the bot is replaying.
  useEffect(() => {
    void fetch("/api/incident")
      .then((r) => r.json())
      .then((data: IncidentResponse) => {
        setIncident(data);
        setIndex(data.hours.indexOf(data.time));
      });
  }, []);

  // The slider: show the hour, and tell the bot to replay the same hour.
  const goto = useCallback((i: number, hours: string[]) => {
    setIndex(i);
    const time = hours[i];
    if (!time) return;
    void fetch(`/api/incident?t=${encodeURIComponent(time)}`)
      .then((r) => r.json())
      .then(setIncident);
    void fetch("/api/replay-time", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ time }),
    });
  }, []);

  useEffect(() => {
    const load = () =>
      fetch("/api/calls")
        .then((r) => r.json())
        .then((data: { events: CallEvent[] }) => setEvents(data.events));
    void load();
    const id = setInterval(load, CALLS_POLL_MS);
    return () => clearInterval(id);
  }, []);

  const rows = useMemo(() => callRows(events), [events]);
  const hours = incident?.hours ?? [];
  const maxFront = Math.max(1, ...(incident?.front_by_hour ?? [1]));

  return (
    <div className="stage">
      <Map incident={incident} selected={selected} onSelect={setSelected} />

      <div className="badges">
        <span className="badge replay">
          <span className="dot" /> REPLAY — real data from a past fire (25 Jul 2026)
        </span>
        <span className="badge live">
          <span className="dot" /> LIVE CALLS via SLNG
        </span>
      </div>

      <section className="panel incident">
        <h1>{incident?.meta.name ?? "Loading the replay…"}</h1>
        <p className="sub">
          {incident ? `Replay hour ${localHour(incident.time)} Spanish time` : ""}
        </p>
        <div className="rows">
          <div className="row">
            <span>Fire hotspots</span>
            <span>{incident?.front.length ?? "—"}</span>
          </div>
          <div className="row">
            <span>Latest satellite pass</span>
            <span>{incident?.data_time ? `${hhmm(incident.data_time)} UTC` : "none yet"}</span>
          </div>
          <div className="row">
            <span>Wind</span>
            <span>{incident?.wind_text.split(",")[0] ?? "—"}</span>
          </div>
          <div className="row">
            <span>Spread estimate</span>
            <span>{incident?.spread_kmh ? `${incident.spread_kmh.toFixed(1)} km/h` : "—"}</span>
          </div>
        </div>
        <div className="pills">
          <div className="pill">
            <b>{incident?.counts.within_1h ?? "—"}</b>
            <small>within 1 h</small>
          </div>
          <div className="pill">
            <b>{incident?.counts.within_3h ?? "—"}</b>
            <small>within 3 h</small>
          </div>
          <div className="pill">
            <b>{incident?.counts.within_6h ?? "—"}</b>
            <small>within 6 h</small>
          </div>
        </div>
        <p className="note">
          Arrival times are an estimate from a wind cone (spread = 10% of the measured wind speed),
          not a fire simulation. Wind measured at{" "}
          {incident?.meta.wind_station.name ?? "the station"}.
        </p>
      </section>

      <section className="panel places">
        <div className="card-head">
          <h2>Places at risk</h2>
          <span className="sub" style={{ margin: 0 }}>
            {incident?.places.length ?? 0} in the next 6 h
          </span>
        </div>
        <div className="scroll">
          {incident?.places.map((p, i) => (
            <button
              type="button"
              key={p.id}
              className={`place${p.id === selected ? " on" : ""}`}
              onClick={() => setSelected(p.id)}
              style={{ all: "unset", display: "flex", width: "100%" }}
            >
              <span className="rank">{i + 1}</span>
              <span>
                <span className="kind">{p.kind}</span>
                <div className="place-name">{p.name}</div>
                <div className="place-meta">
                  {p.distance_km} km · fire to the {p.fire_direction} · {p.arrival_estimate}
                </div>
                {p.likely_empty ? (
                  <span className="tag">likely empty: {p.likely_empty}</span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel calls">
        <div className="card-head">
          <h2>Calls</h2>
          <span className="sub" style={{ margin: 0 }}>
            after a human pressed Approve
          </span>
        </div>
        {rows.length === 0 ? (
          <p className="empty">
            No calls yet. The coordinator approves the calls in Telegram; every call and its result
            appears here.
          </p>
        ) : (
          <div className="scroll">
            {rows.map((row) => (
              <CallCard key={row.place_id} row={row} />
            ))}
          </div>
        )}
      </section>

      <section className="panel timeline">
        <div className="bars">
          {(incident?.front_by_hour ?? []).map((n, i) => (
            <button
              type="button"
              key={hours[i]}
              className={`bar${i === index ? " on" : ""}`}
              style={{ all: "unset", flex: 1 }}
              aria-label={`${hhmm(hours[i] ?? "")} UTC, ${n} hotspots`}
              onClick={() => goto(i, hours)}
            >
              <span
                className={`bar${i === index ? " on" : ""}`}
                style={{ display: "block", height: `${Math.max(2, (n / maxFront) * 46)}px` }}
              />
            </button>
          ))}
        </div>
        <input
          className="slider"
          type="range"
          min={0}
          max={Math.max(0, hours.length - 1)}
          value={index ?? 0}
          onChange={(e) => goto(Number(e.target.value), hours)}
          aria-label="Replay hour"
        />
        <div className="time-row">
          <span>{hours[0] ? `${hhmm(hours[0])} UTC` : ""}</span>
          <span className="time-now">
            {incident
              ? `${hhmm(incident.time)} UTC · ${localHour(incident.time)} Spanish time`
              : ""}
          </span>
          <span>{hours.at(-1) ? `${hhmm(hours.at(-1) as string)} UTC` : ""}</span>
        </div>
      </section>
    </div>
  );
}

function CallCard({ row }: { row: CallRow }) {
  const numbers = [
    row.call_id ? `call ${row.call_id}` : null,
    row.duration_s !== null ? `${Math.round(row.duration_s)} s` : null,
    row.api_latency_ms !== null ? `dispatch ${row.api_latency_ms} ms` : null,
    row.latency_s?.e2e_avg !== null && row.latency_s
      ? `voice e2e ${row.latency_s.e2e_avg} s, LLM ${row.latency_s.llm_ttft_avg} s, TTS ${row.latency_s.tts_ttfb_avg} s`
      : null,
    row.llm
      ? `classifier ${row.llm.model}, ${row.llm.latency_ms} ms, ${row.llm.input_tokens ?? "?"}+${row.llm.output_tokens ?? "?"} tokens`
      : null,
  ].filter(Boolean);

  return (
    <div className="call">
      <div className="call-top">
        <b>{row.place_name}</b>
        <span className={`status s-${row.status}`}>{row.status.replace("_", " ")}</span>
      </div>
      {row.quote ? <div className="quote">Caller said: “{row.quote}”</div> : null}
      {row.help_needed ? <div className="quote">Help needed: {row.help_needed}</div> : null}
      {row.reason ? <div className="place-meta">{row.reason}</div> : null}
      {row.followed_up ? <div className="tag">{row.followed_up}</div> : null}
      {row.transcript.length ? (
        <div className="transcript">
          {row.transcript.map((t) => (
            <div key={`${t.speaker}-${t.text}`}>
              <b>{t.speaker}:</b> {t.text}
            </div>
          ))}
        </div>
      ) : null}
      <div className="numbers">
        {row.approved_by ? `approved by ${row.approved_by} · ` : ""}
        {numbers.join(" · ")}
      </div>
    </div>
  );
}
