import { useEffect, useMemo, useRef, useState } from "react";
import DATA from "./data/hhpd.json";
import {
  CITE, MEDICAID_SHARE, LIFE_COURSE, JAMA_OTO, INCOME_2023, PUBLICATIONS, LINKS,
} from "./data/published.js";

/* ============================================================
   HEARING HEALTH POLICY TRACKER
   Hearing Health Policy Database · Social Impact Lab · University of Missouri

   State-level values come from src/data/hhpd.json, which
   scripts/build_data.py computes from the database files.
   Survey-based estimates come from src/data/published.js.
   ============================================================ */

const BASE = import.meta.env.BASE_URL;
const NAMES = DATA.names;
const ML = DATA.medicaidLongitudinal;
const M23 = DATA.medicaid2023;
const PRIV = DATA.privateMandates;
const WF = DATA.workforce;
const [ML_Y0, ML_Y1] = ML.years;

const TILES = {
  AK: [0, 0], ME: [11, 0],
  WI: [5, 1], VT: [10, 1], NH: [11, 1],
  WA: [1, 2], ID: [2, 2], MT: [3, 2], ND: [4, 2], MN: [5, 2], IL: [6, 2], MI: [7, 2], NY: [9, 2], MA: [10, 2], RI: [11, 2],
  OR: [1, 3], NV: [2, 3], WY: [3, 3], SD: [4, 3], IA: [5, 3], IN: [6, 3], OH: [7, 3], PA: [8, 3], NJ: [9, 3], CT: [10, 3],
  CA: [1, 4], UT: [2, 4], CO: [3, 4], NE: [4, 4], MO: [5, 4], KY: [6, 4], WV: [7, 4], VA: [8, 4], MD: [9, 4], DE: [10, 4],
  AZ: [2, 5], NM: [3, 5], KS: [4, 5], AR: [5, 5], TN: [6, 5], NC: [7, 5], SC: [8, 5], DC: [9, 5],
  OK: [4, 6], LA: [5, 6], MS: [6, 6], AL: [7, 6], GA: [8, 6],
  HI: [0, 7], TX: [4, 7], FL: [9, 7],
};

/* Category scales — labels kept verbatim across Tracker, slides and posts */
const STATUS_2023 = {
  covered: "Hearing aids covered (adults 21+)",
  special: "Special populations only",
  none: "Not covered",
};
const CONTINUITY = {
  continuous: "Continuous coverage",
  adopted: "Adopted during period",
  interrupted: "Interrupted, then restored",
  removed: "Removed without restoring",
  never: "No coverage at any time",
};
const PRIVATE = {
  allAges: "Mandate with no age limit",
  limited: "Mandate limited by age or to state employees",
  none: "No mandate",
};

const SPECIAL_NOTES = {
  MO: "Covers beneficiaries who are pregnant or who have qualifying intellectual or physical disabilities.",
  UT: "Covers pregnant beneficiaries only.",
};
/* Places where the database files disagree with each other or with the article text */
const DATA_NOTES = {
  AK: "The longitudinal file codes Alaska as covered in every month from January 2003. Table 1 of the Am J Audiol article classifies Alaska as a late adopter, because primary legal texts show no policy in 2003.",
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function historyText(st) {
  const t = ML.states[st].determination;
  if (t === "Yes") return `Covered every month, January ${ML_Y0} to December ${ML_Y1}.`;
  if (t === "No") return `No adult Medicaid hearing aid coverage at any point, ${ML_Y0}–${ML_Y1}.`;
  const s = t
    .replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g, (_, m, d, y) => `${MONTHS[+m - 1]} ${+d}, ${y}`)
    .replace(/(\d{2})\/(\d{4})/g, (_, m, y) => `${MONTHS[+m - 1]} ${y}`)
    .replace(/Restored in/g, "restored")
    .replace(/; /g, "; ")
    .replace(/Yes, until/, "Covered until");
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/Restored/g, "restored").replace(/; Removed/g, "; removed") + ".";
}
const fmt = (n) => n.toLocaleString("en-US");
const months = (v) => (/^\d+$/.test(v) ? `Every ${v} months` : "Not stated");
const notStated = (v) => (v === "NS" ? "Not stated" : v);

/* ============================ components ============================ */

function SectionTitle({ kicker, title }) {
  return (
    <div className="hh-section-title">
      <p className="hh-section-title__kicker kicker">{kicker}</p>
      <h2 className="hh-section-title__title title">{title}</h2>
    </div>
  );
}

function Legend({ scheme, counts }) {
  return (
    <div className="hh-legend small">
      {Object.entries(scheme).map(([k, label]) => (
        <span key={k} className="hh-legend__item">
          <span className={`hh-swatch fill-${k}`} />
          {label}{counts ? ` (${counts[k] || 0})` : ""}
        </span>
      ))}
    </div>
  );
}

function SourceNote({ children }) {
  return <p className="hh-source source-note">{children}</p>;
}

function TileMap({ categoryOf, scheme, selected, onSelect, label }) {
  const size = 46, gap = 5, cols = 12, rows = 8;
  return (
    <svg className="hh-tilemap" viewBox={`0 0 ${cols * (size + gap)} ${rows * (size + gap)}`} role="group" aria-label={label}>
      {Object.entries(TILES).map(([st, [c, r]]) => {
        const k = categoryOf(st);
        const isSel = selected === st;
        return (
          <g key={st} className="hh-tile" transform={`translate(${c * (size + gap)}, ${r * (size + gap)})`}
            tabIndex={0} role="button" aria-pressed={isSel} aria-label={`${NAMES[st]}: ${scheme[k]}`}
            onClick={() => onSelect(isSel ? null : st)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(isSel ? null : st); } }}>
            <title>{`${NAMES[st]} — ${scheme[k]}`}</title>
            <rect width={size} height={size} rx={6} className={`fill-${k}`} />
            {isSel && <rect x={1.25} y={1.25} width={size - 2.5} height={size - 2.5} rx={5} className="sel" />}
            <rect x={-3} y={-3} width={size + 6} height={size + 6} rx={8} className="focus" />
            <text x={size / 2} y={size / 2 + 4} className={`text-${k}`}>{st}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Toggles({ options, value, onChange, label }) {
  return (
    <div className="hh-toggles label" role="group" aria-label={label}>
      {options.map(([k, l]) => (
        <button key={k} type="button" className="hh-toggle" aria-pressed={value === k} onClick={() => onChange(k)}>{l}</button>
      ))}
    </div>
  );
}

function Field({ label, swatch, children }) {
  return (
    <div className="panel-field">
      <div className="panel-field__label kicker">{label}</div>
      <div className="panel-field__value">
        {swatch && <span className={`hh-swatch hh-swatch--sm fill-${swatch}`} />}
        <span>{children}</span>
      </div>
    </div>
  );
}

function CountList({ scheme, counts, prompt }) {
  return (
    <div>
      <p className="panel-note small">{prompt}</p>
      {Object.entries(scheme).map(([k, l]) => (
        <div key={k} className="panel-row small"><span>{l}</span><span>{counts[k] || 0}</span></div>
      ))}
    </div>
  );
}

const WAVE_STATUS = {
  covered: "Covered in December 2023",
  special: "Special populations only",
  none: "Not covered in December 2023",
};

function Waveform() {
  const abbrs = Object.keys(TILES).sort();
  const statusOf = (st) => (ML.states[st].coveredDec ? "covered" : (SPECIAL_NOTES[st] ? "special" : "none"));
  const [ref, measured] = useWidth(980);
  const W = Math.max(940, measured), H = 200, padL = 40, padR = 4, padT = 10, padB = 26;
  const slot = (W - padL - padR) / abbrs.length;
  const barW = Math.min(12, slot * 0.62);
  const max = ML.totalYears;
  const y = (v) => H - padB - (v / max) * (H - padT - padB);
  const ticks = [0, 7, 14, 21];
  return (
    <figure style={{ margin: 0 }}>
      <p className="label" style={{ margin: "0 0 6px", color: "var(--ink)" }}>
        Years with adult Medicaid hearing aid coverage, {ML_Y0}–{ML_Y1}, by state
      </p>
      <p className="source-note" style={{ margin: "0 0 4px", color: "var(--ink-soft)" }}>Years covered</p>
      <div ref={ref} style={{ overflowX: "auto" }}>
        <svg className="chart" viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 940 }} role="img"
          aria-label={`Bar chart of years with adult Medicaid hearing aid coverage, ${ML_Y0} to ${ML_Y1}, for each state and D.C.`}>
          {ticks.map((t) => (
            <g key={t}>
              <line className="grid" x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} />
              <text className="axis-text" x={padL - 8} y={y(t) + 4} textAnchor="end">{t}</text>
            </g>
          ))}
          {abbrs.map((st, i) => {
            const yrs = ML.states[st].yearsCovered;
            const cx = padL + slot * (i + 0.5);
            const h = Math.max(2, y(0) - y(yrs));
            return (
              <g key={st}>
                <title>{`${NAMES[st]}: ${yrs} of ${max} years covered; ${WAVE_STATUS[statusOf(st)].toLowerCase()}`}</title>
                <rect x={cx - barW / 2} y={y(0) - h} width={barW} height={h} rx={2} className={`fill-${statusOf(st)}`} />
                <text className="axis-text" x={cx} y={H - 8} textAnchor="middle" style={{ fontSize: 10 }}>{st}</text>
              </g>
            );
          })}
        </svg>
      </div>
      {measured < 940 && <p className="source-note" style={{ color: "var(--ink-soft)", margin: "4px 0 0" }}>Scroll sideways to see all states.</p>}
      <div className="hh-legend small">
        {Object.entries(WAVE_STATUS).map(([k, l]) => (
          <span key={k} className="hh-legend__item"><span className={`hh-swatch fill-${k}`} />{l}</span>
        ))}
      </div>
      <figcaption className="hh-source source-note">
        Each bar is one state or D.C., in alphabetical order by postal code. Bar height is the number of years from {ML_Y0} to {ML_Y1} with
        coverage for any part of the year (maximum {max}). Source: {CITE.aja}, study data.
      </figcaption>
    </figure>
  );
}

/* Measure a container so charts draw at their real pixel width (legible text on phones) */
function useWidth(fallback) {
  const ref = useRef(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    if (!ref.current || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width) || fallback));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [fallback]);
  return [ref, w];
}

/* Multi-series line chart with a hover readout. series: [{name, cls, points:[{x,y}]}] */
function LineChart({ series, xMin, xMax, yMax, yTicks, unit = "", height = 300, ariaLabel }) {
  const [hover, setHover] = useState(null);
  const [ref, measured] = useWidth(900);
  const W = Math.max(300, measured), H = height, padL = 44, padR = W < 560 ? 52 : 130, padT = 12, padB = 30;
  const x = (v) => padL + ((v - xMin) / (xMax - xMin)) * (W - padL - padR);
  const y = (v) => H - padB - (v / yMax) * (H - padT - padB);
  const years = [];
  for (let v = xMin; v <= xMax; v++) years.push(v);
  const step = Math.ceil((xMax - xMin) / (W < 560 ? 4 : 8));
  const valueAt = (s, v) => s.points.find((p) => p.x === v);
  const lastPoints = series.map((s) => s.points[s.points.length - 1]);
  // keep end labels from colliding
  const labelY = lastPoints.map((p) => y(p.y));
  if (labelY.length === 2 && Math.abs(labelY[0] - labelY[1]) < 16) {
    const mid = (labelY[0] + labelY[1]) / 2;
    const up = labelY[0] <= labelY[1] ? 0 : 1;
    labelY[up] = mid - 9; labelY[1 - up] = mid + 9;
  }
  return (
    <div className="chart-wrap" ref={ref}>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}
        onMouseLeave={() => setHover(null)}>
        {yTicks.map((t) => (
          <g key={t}>
            <line className="grid" x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} />
            <text className="axis-text" x={padL - 8} y={y(t) + 4} textAnchor="end">{fmt(t)}{unit}</text>
          </g>
        ))}
        {years.filter((v) => ((v - xMin) % step === 0 && xMax - v >= step * 0.8) || v === xMax).map((v) => (
          <text key={v} className="axis-text" x={x(v)} y={H - 8} textAnchor="middle">{v}</text>
        ))}
        {hover !== null && <line className="hover-line" x1={x(hover)} x2={x(hover)} y1={padT} y2={H - padB} />}
        {series.map((s, i) => (
          <g key={s.name}>
            <polyline fill="none" strokeWidth={2.5} strokeLinejoin="round" className={`series-${i + 1}`}
              points={s.points.map((p) => `${x(p.x)},${y(p.y)}`).join(" ")} />
            {hover !== null && valueAt(s, hover) && <circle className={`dot-${i + 1}`} r={4} cx={x(hover)} cy={y(valueAt(s, hover).y)} />}
            <circle className={`dot-${i + 1}`} r={3.5} cx={x(lastPoints[i].x)} cy={y(lastPoints[i].y)} />
            <text className="end-label" x={x(lastPoints[i].x) + 10} y={labelY[i] + 4}>{fmt(lastPoints[i].y)}{unit}{W < 560 ? "" : ` ${s.short || s.name}`}</text>
          </g>
        ))}
        {years.map((v) => (
          <rect key={v} className="hit" x={x(v) - (W - padL - padR) / (xMax - xMin) / 2} y={padT}
            width={(W - padL - padR) / (xMax - xMin)} height={H - padT - padB}
            onMouseEnter={() => setHover(v)} />
        ))}
      </svg>
      {hover !== null && (
        <div className="chart-tip" style={{ left: `${(x(hover) / W) * 100}%`, top: 0 }}>
          <strong>{hover}</strong>
          {series.map((s) => {
            const p = valueAt(s, hover);
            return <div key={s.name}>{s.name}: {p ? `${fmt(p.y)}${unit}` : "no data"}</div>;
          })}
        </div>
      )}
    </div>
  );
}

function SlopeChart() {
  const [ref, measured] = useWidth(620);
  const W = Math.max(300, Math.min(640, measured)), H = 270, padY = 26, max = 60;
  const padX = W < 480 ? 50 : 120;
  const x2 = W - (W < 480 ? 110 : 180);
  const y = (v) => H - padY - (v / max) * (H - padY * 2);
  // spread end labels so close values (19.2% and 16.9%) do not overlap
  const spread = (key) => {
    const ys = LIFE_COURSE.map((d) => ({ k: d.key, v: y(d[key]) })).sort((a, b) => a.v - b.v);
    for (let i = 1; i < ys.length; i++) if (ys[i].v - ys[i - 1].v < 16) ys[i].v = ys[i - 1].v + 16;
    return Object.fromEntries(ys.map((o) => [o.k, o.v]));
  };
  const L08 = spread("y2008"), L23 = spread("y2023");
  return (
    <div ref={ref} style={{ maxWidth: 640 }}>
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label="Slope chart: share of each age group with mandated hearing aid coverage, 2008 and 2023">
      {[0, 20, 40, 60].map((v) => (
        <g key={v}>
          <line className="grid" x1={padX} x2={x2} y1={y(v)} y2={y(v)} />
        </g>
      ))}
      <text className="axis-text" x={padX} y={H - 4} textAnchor="middle" fontWeight={700}>2008</text>
      <text className="axis-text" x={x2} y={H - 4} textAnchor="middle" fontWeight={700}>2023</text>
      {LIFE_COURSE.map((d) => (
        <g key={d.key} className={`lc-${d.key}`}>
          <title>{`${d.group}: ${d.y2008}% in 2008 (95% CI ${d.ci2008}) to ${d.y2023}% in 2023 (95% CI ${d.ci2023})`}</title>
          <line x1={padX} y1={y(d.y2008)} x2={x2} y2={y(d.y2023)} strokeWidth={3} />
          <circle cx={padX} cy={y(d.y2008)} r={5} stroke="none" />
          <circle cx={x2} cy={y(d.y2023)} r={5} stroke="none" />
          <text className="lc-label" x={padX - 10} y={L08[d.key] + 4} textAnchor="end">{d.y2008.toFixed(1)}%</text>
          <text className="lc-label" x={x2 + 10} y={L23[d.key] + 4}>{d.y2023.toFixed(1)}% {W < 480 ? d.short : d.group}</text>
        </g>
      ))}
    </svg>
    </div>
  );
}

function FeatureBar({ yes, of, label, sub }) {
  return (
    <div className="hh-feature">
      <div className="hh-feature__track" aria-hidden="true">
        <div className={`hh-feature__fill${yes / of < 0.5 ? " hh-feature__fill--low" : ""}`} style={{ width: `${(yes / of) * 100}%` }} />
      </div>
      <div className="hh-feature__count body">{yes} of {of}</div>
      <div className="hh-feature__label small">{label}{sub ? <span> · {sub}</span> : null}</div>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div className="hh-stat">
      <div className="hh-stat__value stat">{value}</div>
      <div className="hh-stat__label small">{label}</div>
    </div>
  );
}

/* ============================ sections ============================ */

function MedicaidMap() {
  const [view, setView] = useState("status");
  const [sel, setSel] = useState(null);
  const scheme = view === "status" ? STATUS_2023 : CONTINUITY;
  const categoryOf = (st) => (view === "status" ? M23.status[st] : ML.states[st].continuity);
  const counts = view === "status" ? M23.statusCounts : ML.continuityCounts;
  const b = sel && M23.states[sel];
  return (
    <section id="medicaid" className="hh-card">
      <SectionTitle kicker={`Medicaid · adults 21+ · ${ML_Y0}–${ML_Y1}`} title="Medicaid coverage by jurisdiction" />
      <Toggles label="Map view" value={view} onChange={(v) => { setView(v); }}
        options={[["status", "Coverage in 2023"], ["continuity", `Continuity, ${ML_Y0}–${String(ML_Y1).slice(2)}`]]} />
      <div className="map-layout">
        <div className="map-layout__map">
          <TileMap label="Tile map of adult Medicaid hearing aid coverage. Select a state for details." categoryOf={categoryOf} scheme={scheme} selected={sel} onSelect={setSel} />
          <Legend scheme={scheme} />
        </div>
        <aside className="map-layout__panel" aria-live="polite">
          {sel ? (
            <div>
              <h3 className="subtitle" style={{ margin: "0 0 10px" }}>{NAMES[sel]}</h3>
              <Field label="Status, December 2023" swatch={M23.status[sel]}>{STATUS_2023[M23.status[sel]]}</Field>
              <Field label={`Continuity, ${ML_Y0}–${ML_Y1}`} swatch={ML.states[sel].continuity}>{CONTINUITY[ML.states[sel].continuity]}</Field>
              <Field label="Years with coverage">{ML.states[sel].yearsCovered} of {ML.totalYears}</Field>
              <p className="panel-note small">{historyText(sel)}</p>
              {SPECIAL_NOTES[sel] && <p className="panel-note small">{SPECIAL_NOTES[sel]}</p>}
              {b && (
                <div className="small" style={{ marginTop: 10 }}>
                  <div className="panel-row"><span>Hearing loss eligibility</span><span>{notStated(b.eligibility)}</span></div>
                  <div className="panel-row"><span>Benefit frequency</span><span>{months(b.frequency)}</span></div>
                  <div className="panel-row"><span>Cost sharing</span><span>{notStated(b.costSharing)}</span></div>
                  <div className="panel-row"><span>Hearing aids</span><span>{notStated(b.aids)}</span></div>
                </div>
              )}
              {M23.notInBenefitFile.includes(sel) && <p className="panel-note small">Coverage was in place in December 2023. Benefit details for 2023 are not yet coded for this state.</p>}
              {DATA_NOTES[sel] && <p className="panel-flag small"><strong>Data note.</strong> {DATA_NOTES[sel]}</p>}
              <button type="button" className="panel-clear small" onClick={() => setSel(null)}>Show all states</button>
            </div>
          ) : (
            <CountList scheme={scheme} counts={counts} prompt="Select a state to see its coverage history and 2023 benefit details." />
          )}
        </aside>
      </div>
      <SourceNote>
        {view === "status"
          ? <>Sources: {CITE.ha} and {CITE.aja}, study data; status as of December 31, 2023. Missouri and Utah cover specific populations only.</>
          : <>Source: {CITE.aja}; study data (monthly coverage, January {ML_Y0}–December {ML_Y1}). Part-year coverage counted as a covered year.</>}
      </SourceNote>
    </section>
  );
}

function PrivateMap() {
  const [sel, setSel] = useState(null);
  const s = sel && PRIV.states[sel];
  const n = PRIV.statusCounts.allAges + PRIV.statusCounts.limited;
  return (
    <section id="private" className="hh-card">
      <SectionTitle kicker={`Private insurance · ${PRIV.years[0]}–${PRIV.years[1]}`} title="Private insurance mandates by jurisdiction" />
      <p className="hh-card__body body">
        {n} states require fully insured private health plans to cover hearing aids. {PRIV.statusCounts.limited} of
        them limit the mandate to children and young adults or to state employees. Self-insured employer plans are
        exempt from state mandates under federal law (ERISA).
      </p>
      <div className="map-layout">
        <div className="map-layout__map">
          <TileMap label="Tile map of private insurance hearing aid mandates. Select a state for details." categoryOf={(st) => PRIV.states[st].status} scheme={PRIVATE} selected={sel} onSelect={setSel} />
          <Legend scheme={PRIVATE} />
        </div>
        <aside className="map-layout__panel" aria-live="polite">
          {sel ? (
            <div>
              <h3 className="subtitle" style={{ margin: "0 0 10px" }}>{NAMES[sel]}</h3>
              <Field label={`Status, December ${PRIV.years[1]}`} swatch={s.status}>{PRIVATE[s.status]}</Field>
              {s.status !== "none" && (
                <div className="small">
                  <div className="panel-row"><span>Mandate in effect since</span><span>{s.since}</span></div>
                  <div className="panel-row"><span>Ages covered</span><span>{s.ageMax}</span></div>
                  <div className="panel-row"><span>Hearing aids</span><span>{s.allowance}</span></div>
                  <div className="panel-row"><span>Dollar limit</span><span>{/^\d+$/.test(s.dollarLimit) ? `$${fmt(+s.dollarLimit)}` : s.dollarLimit}</span></div>
                  <div className="panel-row"><span>Benefit frequency</span><span>{months(s.frequency)}</span></div>
                  {s.exceptions.length > 0 && <p className="panel-note" style={{ marginTop: 10 }}>{s.exceptions.join(". ")}.</p>}
                </div>
              )}
              <button type="button" className="panel-clear small" onClick={() => setSel(null)}>Show all states</button>
            </div>
          ) : (
            <CountList scheme={PRIVATE} counts={PRIV.statusCounts} prompt="Select a state to see the terms of its mandate." />
          )}
        </aside>
      </div>
      <SourceNote>Source: {CITE.ajph}; study data (monthly, January {PRIV.years[0]}–December {PRIV.years[1]}). Terms shown are those in effect in December {PRIV.years[1]}; "since" is the first month any mandate applied.</SourceNote>
    </section>
  );
}

function Trends() {
  const series = [
    { name: "Medicaid coverage for adults", short: "Medicaid", points: ML.countsByYear.map((d) => ({ x: d.year, y: d.states })) },
    { name: "Private insurance mandate", short: "Private mandate", points: PRIV.countsByYear.map((d) => ({ x: d.year, y: d.states })) },
  ];
  const c = Object.fromEntries(ML.countsByYear.map((d) => [d.year, d.states]));
  return (
    <section id="trends" className="hh-card">
      <SectionTitle kicker={`${PRIV.years[0]}–${ML_Y1}`} title="Number of states with coverage over time" />
      <p className="hh-card__body body">
        Adult Medicaid coverage fell from {c[ML_Y0]} states in {ML_Y0} to {c[2013]} in 2013 and recovered to {c[ML_Y1]} in {ML_Y1}.
        The number of states with a private insurance mandate has grown every few years since the first took effect in 2001 and has never fallen. In {MEDICAID_SHARE.from.year},
        {" "}{MEDICAID_SHARE.from.pct}% of adult Medicaid beneficiaries lived in a state with coverage; by {MEDICAID_SHARE.to.year}
        {" "}it was {MEDICAID_SHARE.to.pct}%, with the largest change ({MEDICAID_SHARE.jump.pp} percentage points) between
        {" "}{MEDICAID_SHARE.jump.from} and {MEDICAID_SHARE.jump.to}, when Maryland, Michigan and Washington started or reinstated coverage.
      </p>
      <div className="hh-legend small" style={{ marginBottom: 8 }}>
        <span className="hh-legend__item"><span className="hh-swatch hh-swatch--line" style={{ background: "var(--teal)" }} />Medicaid coverage for adults (21+), any part of the year</span>
        <span className="hh-legend__item"><span className="hh-swatch hh-swatch--line" style={{ background: "var(--series-2)" }} />Private insurance mandate, any part of the year</span>
      </div>
      <LineChart series={series} xMin={PRIV.years[0]} xMax={ML_Y1} yMax={51} yTicks={[0, 10, 20, 30, 40, 50]}
        ariaLabel="Line chart of the number of states with adult Medicaid hearing aid coverage and with private insurance mandates, by year" />
      <SourceNote>
        Counts of the 50 states and D.C. with the policy in effect for any part of each year. Medicaid counts exclude Missouri and Utah after they limited coverage to special populations.
        Sources: {CITE.aja} and {CITE.ajph}, study data. Beneficiary shares: {CITE.aja}.
      </SourceNote>
    </section>
  );
}

function LifeCourse() {
  return (
    <section id="lifecourse" className="hh-card">
      <SectionTitle kicker="All coverage types · 2008–2023" title="Mandated coverage shrinks across the life course" />
      <p className="hh-card__body body">
        Across private insurance mandates, Medicaid, the VA and TRICARE, the share of people with legally mandated
        hearing aid coverage rose for youth and working-age adults but fell for adults 65 and older. Coverage grew
        {" "}{JAMA_OTO.growthVsOlder.youth} percentage points per year faster for youth than for older adults. Traditional
        Medicare has excluded hearing aids by statute since 1965.
      </p>
      <SlopeChart />
      <SourceNote>
        Share of each age group with mandated hearing aid coverage. Estimates from {JAMA_OTO.respondents} American Community Survey respondents,
        2008–2023; hover a line for 95% confidence intervals. Source: {CITE.jamaOto}.
      </SourceNote>

      <h3 className="hh-subhead">Mandated coverage by household income, 2023</h3>
      <p className="hh-card__body body">
        Because Medicaid is the main route to mandated coverage, people below the federal poverty threshold were more likely
        to have it than people at or above the federal poverty threshold in every age group. Even so, most adults below the federal poverty threshold had no mandated coverage.
      </p>
      <div className="table-scroll">
        <table className="hh-table">
          <caption className="sr-only">Percentage with mandated hearing aid coverage by age group and household characteristics, 2023</caption>
          <thead>
            <tr><th scope="col">Age group</th><th scope="col" className="num">Below federal poverty threshold</th><th scope="col" className="num">At or above federal poverty threshold</th><th scope="col" className="num">Renters</th><th scope="col" className="num">Homeowners</th></tr>
          </thead>
          <tbody>
            {INCOME_2023.map((r) => (
              <tr key={r.group}>
                <th scope="row" style={{ fontWeight: 600, color: "var(--ink)" }}>{r.group}</th>
                {[r.below, r.atAbove, r.renter, r.owner].map((v, i) => <td key={i} className="num">{v.toFixed(1)}%</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SourceNote>Percentage of each group with mandated hearing aid coverage, 2023, weighted. Source: {CITE.jamaOto}, Table 4.</SourceNote>
    </section>
  );
}

function PolicyFeatures() {
  const n = M23.covering;
  const e = M23.eligibility;
  const f = M23.frequency;
  return (
    <section id="features" className="hh-card">
      <SectionTitle kicker="Medicaid benefit design · 2023" title="What Medicaid coverage includes" />
      <p className="hh-card__body body">
        Among the {n} states with adult Medicaid hearing aid coverage in 2023{M23.notInBenefitFile.length ? ` (benefit details not yet coded for ${M23.notInBenefitFile.map((k) => NAMES[k]).join(" and ")})` : ""}, benefit design varied. A state can cover a
        hearing aid yet leave out the services that make sustained use possible.
      </p>
      <div>
        {M23.features.map((ft) => (
          <FeatureBar key={ft.key} yes={ft.yes} of={ft.of} label={ft.label}
            sub={ft.notStated ? `not stated in ${ft.notStated}` : null} />
        ))}
      </div>
      <p className="small" style={{ color: "var(--ink-soft)", marginTop: 16, maxWidth: "var(--prose-width)" }}>
        Eligibility: {e["Any HL"]} states covered any degree of hearing loss, {e["At Provider's Discretion"]} left eligibility to
        provider discretion and {e["Mild HL or Greater"]} required at least mild hearing loss. The most common benefit
        period was every 60 months ({f["60"]} states).
      </p>
      <SourceNote>Counts of covering states, including Missouri and Utah. Source: {CITE.ha}, study data (version 1.1, updated September 2026, which adds Nevada).</SourceNote>
    </section>
  );
}

function Workforce() {
  const [st, setSt] = useState("");
  const [y0, y1] = WF.years;
  const series = [
    { name: "Audiologists", points: WF.audiologists.national.map((d) => ({ x: d.year, y: d.n })) },
    { name: "Hearing instrument specialists", short: "Specialists", points: WF.specialists.national.map((d) => ({ x: d.year, y: d.n })) },
  ];
  const a = WF.audiologists.national, h = WF.specialists.national;
  const pct = (s) => Math.round(((s[s.length - 1].n - s[0].n) / s[0].n) * 100);
  const sorted = useMemo(() => Object.keys(NAMES).sort((p, q) => NAMES[p].localeCompare(NAMES[q])), []);
  return (
    <section id="workforce" className="hh-card">
      <SectionTitle kicker={`Hearing care workforce · ${y0}–${y1}`} title="Audiologists and hearing instrument specialists" />
      <p className="hh-card__body body">
        Registered audiologists rose from {fmt(a[0].n)} to {fmt(a[a.length - 1].n)} ({pct(a)}%) and hearing instrument
        specialists from {fmt(h[0].n)} to {fmt(h[h.length - 1].n)} ({pct(h)}%) between December {y0} and December {y1}.
      </p>
      <div className="hh-legend small" style={{ marginBottom: 8 }}>
        <span className="hh-legend__item"><span className="hh-swatch hh-swatch--line" style={{ background: "var(--teal)" }} />Audiologists</span>
        <span className="hh-legend__item"><span className="hh-swatch hh-swatch--line" style={{ background: "var(--series-2)" }} />Hearing instrument specialists</span>
      </div>
      <LineChart series={series} xMin={y0} xMax={y1} yMax={25000} yTicks={[0, 5000, 10000, 15000, 20000, 25000]} height={280}
        ariaLabel="Line chart of the national number of audiologists and hearing instrument specialists, 2012 to 2022" />
      <div style={{ marginTop: 20, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <label htmlFor="wf-state" className="label">State</label>
        <select id="wf-state" className="hh-select" value={st} onChange={(e) => setSt(e.target.value)}>
          <option value="">Choose a state</option>
          {sorted.map((k) => <option key={k} value={k}>{NAMES[k]}</option>)}
        </select>
      </div>
      {st && (
        <div className="table-scroll" style={{ marginTop: 12, maxWidth: 520 }}>
          <table className="hh-table">
            <caption className="sr-only">{NAMES[st]} workforce counts</caption>
            <thead><tr><th scope="col">{NAMES[st]}</th><th scope="col" className="num">Dec {y0}</th><th scope="col" className="num">Dec {y1}</th></tr></thead>
            <tbody>
              <tr><th scope="row">Audiologists</th><td className="num">{fmt(WF.audiologists.states[st].first)}</td><td className="num">{fmt(WF.audiologists.states[st].last)}</td></tr>
              <tr><th scope="row">Hearing instrument specialists</th><td className="num">{fmt(WF.specialists.states[st].first)}</td><td className="num">{fmt(WF.specialists.states[st].last)}</td></tr>
            </tbody>
          </table>
        </div>
      )}
      <SourceNote>Providers registered in the National Plan and Provider Enumeration System (NPPES), December of each year. Source: {CITE.workforce}, eTables 2–3.</SourceNote>
    </section>
  );
}

function Publications() {
  return (
    <section id="publications" className="hh-card">
      <SectionTitle kicker="Evidence base" title="Publications" />
      {PUBLICATIONS.map((p) => (
        <article key={p.doi} className="hh-pub">
          <p className="hh-pub__citation citation">{p.citation}</p>
          <p className="hh-pub__venue">{p.venue} · <a href={`https://doi.org/${p.doi}`}>doi:{p.doi}</a></p>
          <p className="hh-pub__note small">{p.note}</p>
        </article>
      ))}
    </section>
  );
}

function OpenData() {
  const sets = [
    { name: "Medicaid hearing aid coverage for adults, monthly, 2003–2023", file: DATA.sources.medicaidLongitudinal, cite: CITE.aja, desc: "Coverage in place for adult (21+) beneficiaries by state and month, with a coverage determination for each jurisdiction." },
    { name: "Key policy features of state Medicaid hearing aid coverage for adults, 2023", file: DATA.sources.medicaid2023, cite: CITE.ha, desc: "Eligibility, benefit frequency, cost sharing, reimbursement, provider type and covered services for each covering state." },
    { name: "Private insurance hearing aid mandates, monthly, 1997–2023", file: DATA.sources.privateMandates, cite: CITE.ajph, desc: "Mandate status, age limits, provider type, allowances, dollar limits and exceptions by state and month, with a summary of changes." },
    { name: "Hearing care workforce, 2012–2022", file: DATA.sources.workforce, cite: CITE.workforce, desc: "NPPES counts of audiologists and hearing instrument specialists by state, three times a year." },
  ];
  return (
    <section id="data" className="hh-card">
      <SectionTitle kicker="Resources" title="Open data" />
      <p className="hh-card__body body">
        The Hearing Health Policy Database is actively maintained and updated. Each file below records its coding sources,
        notes and version. Every state-level chart on this page is computed directly from these files.
      </p>
      {sets.map((s) => (
        <div key={s.file} className="dataset">
          <p className="dataset__name body">{s.name}</p>
          <p className="dataset__meta small">{s.desc} File: {s.file}. Cite as {s.cite}.</p>
        </div>
      ))}
      <div className="hh-callout small" style={{ marginTop: 16 }}>
        <strong>Use the data.</strong> Download the files from the{" "}
        <a href={LINKS.openicpsr}>ICPSR repository record</a> ({LINKS.repositoryLabel}). Site code is in the{" "}
        <a href={LINKS.github}>GitHub repository</a>.
        <span className="hh-callout__muted"> Any publication or public output using these data must cite the associated peer-reviewed article and the versioned repository record.</span>
      </div>
    </section>
  );
}

/* ============================ app ============================ */

export default function App() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Close dropdown if clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('#sil-nav-container')) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <>
      <header className="hh-header">
        <div className="hh-header__inner" style={{ flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          
          {/* Click-to-Toggle Dropdown Navigation Menu */}
          <div id="sil-nav-container" style={{ position: 'relative', display: 'inline-block' }}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{
                backgroundColor: 'var(--accent-bg, #f1f8ff)',
                color: 'var(--accent, #0366d6)',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '600',
                border: '1px solid var(--accent-border, #c8e1ff)',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              📁 SIL Navigation {isDropdownOpen ? '▴' : '▾'}
            </button>
            {isDropdownOpen && (
              <div style={{
                position: 'absolute',
                left: 0,
                top: '100%',
                backgroundColor: '#ffffff',
                minWidth: '260px',
                boxShadow: '0 8px 24px rgba(149, 157, 165, 0.2)',
                border: '1px solid #e1e4e8',
                borderRadius: '6px',
                zIndex: 1000,
                marginTop: '4px',
                overflow: 'hidden',
                textAlign: 'left'
              }}>
                <a 
                  href="https://social-impact-lab-sil.github.io" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  onClick={() => setIsDropdownOpen(false)}
                  style={{ color: '#24292e', padding: '10px 16px', textDecoration: 'none', display: 'block', fontSize: '14px', borderBottom: '1px solid #eaecef' }}
                >
                  🏠 SIL Homepage
                </a>
                <a 
                  href="https://github.com/Social-Impact-Lab-SIL" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  onClick={() => setIsDropdownOpen(false)}
                  style={{ color: '#24292e', padding: '10px 16px', textDecoration: 'none', display: 'block', fontSize: '14px', borderBottom: '1px solid #eaecef' }}
                >
                  🌐 SIL GitHub
                </a>
                <a 
                  href="https://social-impact-lab-sil.github.io/SIL-Publications-Archive/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  onClick={() => setIsDropdownOpen(false)}
                  style={{ color: '#24292e', padding: '10px 16px', textDecoration: 'none', display: 'block', fontSize: '14px', borderBottom: '1px solid #eaecef' }}
                >
                  📚 Publications Archive
                </a>
                <a 
                  href="https://social-impact-lab-sil.github.io/SIL-Data-Repository/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  onClick={() => setIsDropdownOpen(false)}
                  style={{ color: '#24292e', padding: '10px 16px', textDecoration: 'none', display: 'block', fontSize: '14px', borderBottom: '1px solid #eaecef' }}
                >
                  🏠 Data Repository
                </a>
                <a 
                  href="./" 
                  onClick={() => setIsDropdownOpen(false)}
                  style={{ color: '#24292e', padding: '10px 16px', textDecoration: 'none', display: 'block', fontSize: '14px' }}
                >
                  📊 Lab Dashboard
                </a>
              </div>
            )}
          </div>

          <a className="hh-header__brand" href="#top" aria-label="Hearing Health Policy Database, top of page">
  <img className="logo-light" src="./brand/hhpd-lockup.svg" alt="Hearing Health Policy Database" width="179" height="40" />
  <img className="logo-dark" src="./brand/hhpd-lockup-reversed.svg" alt="Hearing Health Policy Database" width="179" height="40" />
</a>
          <nav className="hh-nav label" aria-label="Sections">
            <a href="#medicaid">Medicaid</a>
            <a href="#private">Private insurance</a>
            <a href="#trends">Trends</a>
            <a href="#lifecourse">Life course</a>
            <a href="#features">Policy features</a>
            <a href="#workforce">Workforce</a>
            <a href="#publications">Publications</a>
            <a href="#data">Open data</a>
          </nav>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <p className="kicker" style={{ color: "var(--ink-soft)", margin: "0 0 10px" }}>Hearing Health Policy Tracker</p>
          <h1 className="display">Tracking hearing aid coverage policy across the United States</h1>
          <p className="lead">
            The Tracker monitors hearing aid coverage laws and policies in all 50 states and the District of Columbia.
            It reports adult Medicaid hearing aid coverage since {ML_Y0}, state private insurance mandates since {PRIV.years[0]},
            and the share of people with mandated coverage through Medicaid, private insurance, the Department of
            Veterans Affairs and TRICARE.
          </p>
          <div className="hh-stats">
            <Stat value={M23.coveringTotal} label={`states covered hearing aids for adult Medicaid beneficiaries in December 2023, ${M23.statusCounts.special} of them for special populations only`} />
            <Stat value={`${MEDICAID_SHARE.to.pct}%`} label={`of adult Medicaid beneficiaries lived in a state with coverage in ${MEDICAID_SHARE.to.year}, up from ${MEDICAID_SHARE.from.pct}% in ${MEDICAID_SHARE.from.year}`} />
            <Stat value={ML.continuityCounts.never} label={`jurisdictions never covered adult hearing aids through Medicaid, ${ML_Y0}–${ML_Y1}`} />
            <Stat value={`${LIFE_COURSE[2].y2023}%`} label={`of adults 65 and older had mandated hearing aid coverage in 2023, down from ${LIFE_COURSE[2].y2008}% in 2008`} />
          </div>
          <Waveform />
        </section>

        <MedicaidMap />
        <PrivateMap />
        <Trends />
        <LifeCourse />
        <PolicyFeatures />
        <Workforce />
        <Publications />
        <OpenData />

        <footer className="site-footer small">
          <p>Hearing Health Policy Tracker · Hearing Health Policy Database · Social Impact Lab, University of Missouri.</p>
          <p>Research supported by NIDCD grant R01 DC019661. Coding follows policy surveillance and data triangulation methods; coverage determinations are documented with primary legal texts.</p>
          <p>This tracker is for informational purposes and does not constitute legal advice.</p>
        </footer>
      </main>
    </>
  );
}