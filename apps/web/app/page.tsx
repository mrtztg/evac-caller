"use client";

import dynamicImport from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { type CallRow, callRows } from "./calls";
import type { CallEvent, IncidentResponse } from "./types";

// Leaflet needs a browser.
const Map = dynamicImport(() => import("./Map"), { ssr: false });

const CALLS_POLL_MS = 2000;

const hhmm = (iso: string) => iso.slice(11, 16);
/** "25 Jul 09:00 UTC": the replay runs over five days, so the ends of the slider need the date. */
const dayHour = (iso: string) =>
  `${new Date(iso).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short" })} ${hhmm(iso)} UTC`;
const localHour = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Keeps the last good answer on screen: a broken request must never blank the demo. */
async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  return (await res.json()) as T;
}

export default function Page() {
  const [incident, setIncident] = useState<IncidentResponse | null>(null);
  const [events, setEvents] = useState<CallEvent[]>([]);
  const [index, setIndex] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  // First load: no hour asked for, so the API answers with the hour the bot is replaying.
  useEffect(() => {
    void getJson<IncidentResponse>("/api/incident")
      .then((data) => {
        setIncident(data);
        setIndex(Math.max(0, data.hours.indexOf(data.time)));
        setProblem(null);
      })
      .catch((err: Error) => setProblem(err.message));
  }, []);

  // The slider: show the hour, and tell the bot to replay the same hour.
  const goto = useCallback((i: number, hours: string[]) => {
    setIndex(i);
    const time = hours[i];
    if (!time) return;
    void getJson<IncidentResponse>(`/api/incident?t=${encodeURIComponent(time)}`)
      .then((data) => {
        // A slow earlier answer must not overwrite the hour that is on screen now.
        setIncident((current) => (current && data.time !== time ? current : data));
        setProblem(null);
      })
      .catch((err: Error) => setProblem(err.message));
    void fetch("/api/replay-time", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ time }),
    }).catch(() => setProblem("could not tell the bot which hour to replay"));
  }, []);

  useEffect(() => {
    const load = () =>
      getJson<{ events: CallEvent[] }>("/api/calls")
        .then((data) => setEvents(data.events))
        .catch(() => {
          // One failed poll is not worth a message on stage; the next one is 2 s away.
        });
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
        {problem ? <span className="badge problem">⚠ {problem}</span> : null}
        <span className="badge replay">
          <span className="dot" /> REPLAY — real data from a past fire
          {incident ? ` (${dayHour(incident.time).slice(0, 6)} 2026)` : ""}
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
            >
              <span className="rank">{i + 1}</span>
              <span>
                <span className="kind">{p.kind}</span>
                <span className="place-name">{p.name}</span>
                <span className="place-meta">
                  {p.distance_km} km · fire to the {p.fire_direction} · {p.arrival_estimate}
                </span>
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
              className="bar-slot"
              aria-label={`${hhmm(hours[i] ?? "")} UTC, ${n} hotspots`}
              onClick={() => goto(i, hours)}
            >
              <span
                className={`bar${i === index ? " on" : ""}`}
                style={{ height: `${Math.max(2, (n / maxFront) * 46)}px` }}
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
          <span>{hours[0] ? dayHour(hours[0]) : ""}</span>
          <span className="time-now">
            {incident ? `${dayHour(incident.time)} · ${localHour(incident.time)} Spanish time` : ""}
          </span>
          <span>{hours.at(-1) ? dayHour(hours.at(-1) as string) : ""}</span>
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
    row.latency_s
      ? [
          row.latency_s.e2e_avg === null ? null : `voice e2e ${row.latency_s.e2e_avg} s`,
          row.latency_s.llm_ttft_avg === null ? null : `LLM ${row.latency_s.llm_ttft_avg} s`,
          row.latency_s.tts_ttfb_avg === null ? null : `TTS ${row.latency_s.tts_ttfb_avg} s`,
        ]
          .filter(Boolean)
          .join(", ") || null
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
          {row.transcript.map((t, i) => (
            // Two identical turns are possible, so the position in the call is the key.
            <div key={`${i}-${t.speaker}`}>
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
