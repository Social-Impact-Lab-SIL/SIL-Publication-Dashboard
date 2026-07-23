import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip,
  CartesianGrid, ReferenceDot,
} from "recharts";

/* ============================================================
   HEARING HEALTH POLICY TRACKER
   Social Impact Lab · University of Missouri

   State-level data coded from:
   - Arnold ML, Tonti L, Phillips S, et al. Longitudinal Trends in
     Medicaid Hearing Aid Coverage for Adults in the United States:
     2003–2023. Am J Audiol (2026). Table 1.
   - Arnold ML, Tonti L, Phillips S, et al. Number of States Providing
     Medicaid Hearing Aid Coverage for Adults Increased; Variability
     Was Substantive, 2017–23. Health Aff. 2025;44(12):1522–1529.

   NOTE: interior points of the beneficiary-share trend line are
   approximated from Figure 2 of the AJA paper (published endpoints:
   65.4% in 2008, 70.3% in 2023). Replace with exact dataset values.
   ============================================================ */

const C = {
  bg: "#FAFAF8", ink: "#16243A", inkSoft: "#5A6577",
  teal: "#0F5E63", tealLight: "#5FA8A0", amber: "#D9A21B",
  rust: "#B0563B", none: "#D8DCD6", line: "#E4E6E1", card: "#FFFFFF",
};

/* ---- 2023 coverage status (HA 2025; AJA 2026 Table 1) ---- */
const STATUS_2023 = {
  covered: { label: "Hearing aids covered (adults 21+)", color: C.teal },
  special: { label: "Special populations only", color: C.amber },
  none: { label: "Not covered", color: C.none },
};

/* ---- Coverage continuity, Jan 2003 – Dec 2023 (AJA Table 1) ---- */
const CONTINUITY = {
  continuous: { label: "Continuous coverage", color: C.teal },
  adopted: { label: "Adopted during period", color: C.tealLight },
  interrupted: { label: "Interrupted, then restored", color: C.amber },
  removed: { label: "Removed without restoring", color: C.rust },
  never: { label: "No coverage at any time", color: C.none },
};

/* Tile-grid map coordinates [col, row] */
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

const NAMES = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

/* ---- Coded state data (AJA 2026, Table 1) ----
   yearsCovered = years (of 21, 2003–2023) with any adult Medicaid
   hearing aid coverage; part-year coverage counted as covered.
   null = adoption timing differs across sources; see dataset. */
const CONTINUOUS = ["CA","CT","HI","IL","IN","IA","MA","MN","MT","NE","NV","NH","NJ","NM","NY","ND","OH","OR","RI","SD","VT","WI","WY"];
const NEVER = ["AL","AZ","AR","CO","DE","DC","GA","KY","LA","MS","NC","OK","PA","TN","VA","WV"];

const STATE_DATA = {
  ...Object.fromEntries(CONTINUOUS.map((s) => [s, {
    status2023: "covered", continuity: "continuous", yearsCovered: 21,
    note: "Coverage in effect throughout the 2003–2023 study period.",
  }])),
  ...Object.fromEntries(NEVER.map((s) => [s, {
    status2023: "none", continuity: "never", yearsCovered: 0,
    note: "No adult Medicaid hearing aid coverage at any point, 2003–2023.",
  }])),
  AK: { status2023: "covered", continuity: "adopted", yearsCovered: null,
    note: "Late adoption; effective date differs across primary and secondary sources — see dataset." },
  FL: { status2023: "covered", continuity: "adopted", yearsCovered: 18,
    note: "Coverage removed July 2002; restored July 2006." },
  ME: { status2023: "covered", continuity: "adopted", yearsCovered: 9,
    note: "Coverage instated June 2015." },
  MD: { status2023: "covered", continuity: "adopted", yearsCovered: 6,
    note: "Coverage instated October 2018." },
  KS: { status2023: "covered", continuity: "interrupted", yearsCovered: 21,
    note: "Removed January 2003; restored July 2003." },
  MI: { status2023: "covered", continuity: "interrupted", yearsCovered: 12,
    note: "Removed July 2003; restored July 2004; removed July 2008; restored September 2018." },
  TX: { status2023: "covered", continuity: "interrupted", yearsCovered: 20,
    note: "Removed October 2003; restored October 2005." },
  WA: { status2023: "covered", continuity: "interrupted", yearsCovered: 13,
    note: "Removed January 2011; restored January 2019." },
  ID: { status2023: "none", continuity: "removed", yearsCovered: 9,
    note: "Coverage removed July 3, 2011, without restoration." },
  SC: { status2023: "none", continuity: "removed", yearsCovered: 3,
    note: "Coverage removed 2005, without restoration." },
  MO: { status2023: "special", continuity: "removed", yearsCovered: 3,
    note: "General coverage removed July 2005. Covers beneficiaries who are pregnant or have qualifying intellectual or physical disabilities." },
  UT: { status2023: "special", continuity: "removed", yearsCovered: 6,
    note: "General coverage removed November 2008. Covers pregnant beneficiaries only." },
};

/* ---- Share of adult (21+) Medicaid beneficiaries with coverage ----
   Endpoints published (65.4% in 2008; 70.3% in 2023); interior points
   approximated from AJA Figure 2 — replace with exact values. */
const TREND_DATA = [
  { year: 2008, share: 65.4 }, { year: 2009, share: 64.0 },
  { year: 2010, share: 63.8 }, { year: 2011, share: 62.6 },
  { year: 2012, share: 62.5 }, { year: 2013, share: 63.0 },
  { year: 2014, share: 63.4 }, { year: 2015, share: 63.9 },
  { year: 2016, share: 64.3 }, { year: 2017, share: 64.4 },
  { year: 2018, share: 65.0 }, { year: 2019, share: 70.5 },
  { year: 2020, share: 71.0 }, { year: 2021, share: 71.0 },
  { year: 2022, share: 71.0 }, { year: 2023, share: 70.3 },
];

/* ---- 2023 policy features among the 32 covering states (HA 2025) ---- */
const FEATURES_2023 = [
  { n: 32, of: 32, label: "One-time dispensing fee (initial fit and delivery)" },
  { n: 30, of: 32, label: "Coverage for supplies beyond dispensing" },
  { n: 24, of: 32, label: "Battery costs covered" },
  { n: 22, of: 32, label: "Rehabilitation assessments beyond initial evaluation" },
  { n: 6, of: 32, label: "Auditory training or rehabilitative treatment" },
];

/* ---- Mandated hearing aid coverage by age group, 2008 vs 2023 ----
   (Arnold et al., under review: private mandates, Medicaid, VA, TRICARE;
   traditional Medicare excluded — statutory hearing aid exclusion since 1965) */
const LIFE_COURSE = [
  { group: "Youth (under 18)", y2008: 34.1, y2023: 52.5, color: C.teal },
  { group: "Adults 18–64", y2008: 10.2, y2023: 19.2, color: C.tealLight },
  { group: "Adults 65+", y2008: 18.5, y2023: 16.9, color: C.rust },
];

const PUBLICATIONS = [
  {
    citation: "Arnold ML, Tonti L, Phillips S, Kershner SP, Lipton BJ, Heslin B, Ukert BD, Pesko MF. Number of States Providing Medicaid Hearing Aid Coverage for Adults Increased; Variability Was Substantive, 2017–23.",
    venue: "Health Affairs. 2025;44(12):1522–1529",
    doi: "10.1377/hlthaff.2025.00270",
    note: "Cross-sectional policy surveillance of adult Medicaid hearing aid coverage as of December 31, 2023, merged with American Community Survey data to estimate national coverage rates and sociodemographic patterns.",
  },
  {
    citation: "Arnold ML, Tonti L, Phillips S, Kershner SP, Lipton B, Heslin B, Ukert B, Hebert R, Pesko MF. Longitudinal Trends in Medicaid Hearing Aid Coverage for Adults in the United States: 2003–2023.",
    venue: "American Journal of Audiology. 2026",
    doi: "10.1044/2026_AJA-25-00204",
    note: "Twenty-one years of triangulated policy surveillance documenting coverage adoptions, interruptions, and removals across all 50 states and D.C.",
  },
  {
    citation: "Arnold ML, Phillips S, Tonti L, Kershner SP, Lipton B, Heslin B, Ukert B, Landini A, Pesko MF. Longitudinal Growth of Mandated Hearing Aid Benefits in the US, 2008–2023.",
    venue: "Under review",
    doi: null,
    note: "The first systematic longitudinal analysis of mandated hearing aid coverage across private insurance, Medicaid, VA, and TRICARE — showing that guaranteed coverage declines across the life course even as clinical need rises.",
  },
  {
    citation: "Arnold ML, Heslin B, Dowdy M, Kershner SP, Phillips S, Lipton B, Pesko MF. Longitudinal Policy Surveillance of Private Insurance Hearing Aid Mandates in the United States: 1997–2022.",
    venue: "American Journal of Public Health. 2024;114(4):407–414",
    doi: "10.2105/ajph.2023.307551",
    note: "Companion surveillance of private insurance hearing aid mandates — 26 states as of 2022, most age-restricted.",
  },
];

/* ============================ components ============================ */

function Waveform() {
  const abbrs = Object.keys(TILES).sort();
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 110, padding: "8px 0" }}
        aria-label="Each bar is one jurisdiction; height shows years with adult Medicaid hearing aid coverage, 2003 to 2023.">
        {abbrs.map((abbr) => {
          const d = STATE_DATA[abbr];
          const yrs = d.yearsCovered;
          const h = yrs === null ? 60 : 6 + (yrs / 21) * 96;
          return (
            <div key={abbr}
              title={`${NAMES[abbr]} — ${yrs === null ? "covered; adoption timing varies by source" : `${yrs} of 21 years covered`}`}
              style={{
                width: 8, height: h, borderRadius: 2,
                background: yrs === null ? "transparent" : STATUS_2023[d.status2023].color,
                border: yrs === null ? `2px dashed ${C.teal}` : "none",
              }} />
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: C.inkSoft }}>
        One bar per jurisdiction (A–Z) · height = years with adult Medicaid hearing aid coverage, 2003–2023 · color = 2023 status
      </div>
    </div>
  );
}

function TileMap({ view, selected, setSelected }) {
  const size = 46, gap = 5, cols = 12, rows = 8;
  const scheme = view === "status" ? STATUS_2023 : CONTINUITY;
  const keyOf = (d) => (view === "status" ? d.status2023 : d.continuity);
  return (
    <svg viewBox={`0 0 ${cols * (size + gap)} ${rows * (size + gap)}`}
      style={{ width: "100%", maxWidth: 640 }} role="img"
      aria-label="Tile grid map of adult Medicaid hearing aid coverage by state">
      {Object.entries(TILES).map(([abbr, [c, r]]) => {
        const k = keyOf(STATE_DATA[abbr]);
        const fill = scheme[k].color;
        const lightText = fill !== C.none;
        const isSel = selected === abbr;
        return (
          <g key={abbr} transform={`translate(${c * (size + gap)}, ${r * (size + gap)})`}
            style={{ cursor: "pointer" }} onClick={() => setSelected(isSel ? null : abbr)}>
            <rect width={size} height={size} rx={6} fill={fill}
              stroke={isSel ? C.ink : "transparent"} strokeWidth={isSel ? 2.5 : 0} />
            <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fontSize={13} fontWeight={600}
              fill={lightText ? "#FFFFFF" : C.inkSoft}
              style={{ fontFamily: "'Public Sans', system-ui, sans-serif", pointerEvents: "none" }}>
              {abbr}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function MapLegend({ view }) {
  const scheme = view === "status" ? STATUS_2023 : CONTINUITY;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 10 }}>
      {Object.values(scheme).map((s) => (
        <span key={s.label} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: C.inkSoft }}>
          <span style={{ width: 14, height: 14, borderRadius: 4, background: s.color, display: "inline-block" }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

function SlopeChart() {
  const W = 560, H = 260, padX = 130, padY = 24;
  const max = 60;
  const y = (v) => H - padY - ((v / max) * (H - padY * 2));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 620 }} role="img"
      aria-label="Slope chart comparing mandated hearing aid coverage by age group in 2008 and 2023">
      {[0, 20, 40, 60].map((v) => (
        <line key={v} x1={padX} x2={W - padX} y1={y(v)} y2={y(v)} stroke={C.line} strokeWidth={1} />
      ))}
      <text x={padX} y={H - 4} textAnchor="middle" fontSize={13} fontWeight={700} fill={C.inkSoft}
        style={{ fontFamily: "'Public Sans', system-ui, sans-serif" }}>2008</text>
      <text x={W - padX} y={H - 4} textAnchor="middle" fontSize={13} fontWeight={700} fill={C.inkSoft}
        style={{ fontFamily: "'Public Sans', system-ui, sans-serif" }}>2023</text>
      {LIFE_COURSE.map((d) => (
        <g key={d.group} style={{ fontFamily: "'Public Sans', system-ui, sans-serif" }}>
          <line x1={padX} y1={y(d.y2008)} x2={W - padX} y2={y(d.y2023)} stroke={d.color} strokeWidth={3} />
          <circle cx={padX} cy={y(d.y2008)} r={5} fill={d.color} />
          <circle cx={W - padX} cy={y(d.y2023)} r={5} fill={d.color} />
          <text x={padX - 10} y={y(d.y2008) + 4} textAnchor="end" fontSize={12.5} fill={C.ink} fontWeight={600}>
            {d.y2008}%
          </text>
          <text x={W - padX + 10} y={y(d.y2023) + 4} fontSize={12.5} fill={C.ink} fontWeight={600}>
            {d.y2023}% {d.group}
          </text>
        </g>
      ))}
    </svg>
  );
}

function SectionTitle({ kicker, title }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: C.teal, fontWeight: 700, marginBottom: 6 }}>
        {kicker}
      </div>
      <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 30, fontWeight: 600, color: C.ink, margin: 0, lineHeight: 1.15 }}>
        {title}
      </h2>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div style={{ minWidth: 150 }}>
      <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 40, fontWeight: 600, color: C.teal, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 13.5, color: C.inkSoft, marginTop: 6, lineHeight: 1.45, maxWidth: 200 }}>{label}</div>
    </div>
  );
}

/* ============================ app ============================ */

export default function HearingPolicyDashboard() {
  const [view, setView] = useState("status");
  const [selected, setSelected] = useState(null);

  const counts = useMemo(() => {
    const scheme = view === "status" ? STATUS_2023 : CONTINUITY;
    const tally = Object.fromEntries(Object.keys(scheme).map((k) => [k, 0]));
    Object.values(STATE_DATA).forEach((d) => tally[view === "status" ? d.status2023 : d.continuity]++);
    return tally;
  }, [view]);

  const card = { background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 24 };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.ink, fontFamily: "'Public Sans', system-ui, -apple-system, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Public+Sans:wght@400;600;700&display=swap');
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
        a { color: ${C.teal}; }
      `}</style>

      <header style={{ borderBottom: `1px solid ${C.line}`, background: C.card }}>
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: C.inkSoft, fontWeight: 700 }}>
              Social Impact Lab · University of Missouri
            </div>
            <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 22, fontWeight: 600 }}>
              Hearing Health Policy Tracker
            </div>
          </div>
          <nav style={{ display: "flex", gap: 18, fontSize: 14, fontWeight: 600 }}>
            <a href="#map" style={{ textDecoration: "none" }}>Coverage map</a>
            <a href="#trends" style={{ textDecoration: "none" }}>Trends</a>
            <a href="#lifecourse" style={{ textDecoration: "none" }}>Life course</a>
            <a href="#features" style={{ textDecoration: "none" }}>Policy features</a>
            <a href="#publications" style={{ textDecoration: "none" }}>Publications</a>
            <a href="#data" style={{ textDecoration: "none" }}>Open data</a>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 980, margin: "0 auto", padding: "40px 24px 80px" }}>
        {/* Hero */}
        <section style={{ marginBottom: 56 }}>
          <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: "clamp(30px, 4.5vw, 44px)", fontWeight: 600, lineHeight: 1.12, margin: "0 0 14px", maxWidth: 780 }}>
            Tracking Medicaid hearing aid coverage for adults across the United States
          </h1>
          <p style={{ fontSize: 17, color: C.inkSoft, maxWidth: 700, lineHeight: 1.6, margin: "0 0 28px" }}>
            Two decades of legal epidemiology surveillance tracking adult Medicaid hearing aid
            coverage across all 50 states and the District of Columbia. Coverage looks stable in
            the aggregate — but that stability masks adoptions, interruptions, and removals that
            disrupt care for beneficiaries who depend on it.
          </p>
          <div style={{ display: "flex", gap: 40, flexWrap: "wrap", marginBottom: 30 }}>
            <Stat value="32" label="states covered hearing aids for adult Medicaid beneficiaries as of December 2023" />
            <Stat value="70.3%" label="of adult Medicaid beneficiaries lived in a state with coverage in 2023, up from 65.4% in 2008" />
            <Stat value="16" label="states never covered adult hearing aids at any point from 2003 through 2023" />
          </div>
          <Waveform />
        </section>

        {/* Map */}
        <section id="map" style={{ ...card, marginBottom: 32 }}>
          <SectionTitle kicker="Policy surveillance · 2003–2023" title="Coverage by jurisdiction" />
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {[["status", "Coverage in 2023"], ["continuity", "Continuity, 2003–23"]].map(([key, label]) => (
              <button key={key} onClick={() => { setView(key); setSelected(null); }}
                style={{
                  padding: "8px 16px", borderRadius: 999, fontSize: 14, fontWeight: 600,
                  border: `1.5px solid ${view === key ? C.teal : C.line}`,
                  background: view === key ? C.teal : "transparent",
                  color: view === key ? "#fff" : C.ink, cursor: "pointer",
                }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 420px", minWidth: 320 }}>
              <TileMap view={view} selected={selected} setSelected={setSelected} />
              <MapLegend view={view} />
            </div>
            <aside style={{ flex: "0 1 270px", minWidth: 250 }}>
              {selected ? (
                <div>
                  <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 24, fontWeight: 600, marginBottom: 10 }}>
                    {NAMES[selected]}
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", color: C.inkSoft, fontWeight: 700 }}>
                      Status, December 2023
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15 }}>
                      <span style={{ width: 11, height: 11, borderRadius: 3, background: STATUS_2023[STATE_DATA[selected].status2023].color }} />
                      {STATUS_2023[STATE_DATA[selected].status2023].label}
                    </div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", color: C.inkSoft, fontWeight: 700 }}>
                      Continuity, 2003–2023
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15 }}>
                      <span style={{ width: 11, height: 11, borderRadius: 3, background: CONTINUITY[STATE_DATA[selected].continuity].color }} />
                      {CONTINUITY[STATE_DATA[selected].continuity].label}
                    </div>
                  </div>
                  <div style={{ fontSize: 13.5, color: C.inkSoft, lineHeight: 1.55 }}>
                    {STATE_DATA[selected].note}
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 14, color: C.inkSoft, marginBottom: 14 }}>
                    Select a state to see its coverage history.
                  </div>
                  {Object.entries(view === "status" ? STATUS_2023 : CONTINUITY).map(([k, s]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.line}`, fontSize: 14 }}>
                      <span style={{ color: C.inkSoft }}>{s.label}</span>
                      <span style={{ fontWeight: 700 }}>{counts[k]}</span>
                    </div>
                  ))}
                </div>
              )}
            </aside>
          </div>
          <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 16, lineHeight: 1.5 }}>
            Source: Arnold et al., Am J Audiol (2026), Table 1, and Arnold et al., Health Affairs (2025).
            Missouri and Utah cover specific populations only. Part-year coverage counted as covered.
          </div>
        </section>

        {/* Trends */}
        <section id="trends" style={{ ...card, marginBottom: 32 }}>
          <SectionTitle kicker="2008 – 2023" title="Share of beneficiaries living in states with coverage" />
          <p style={{ fontSize: 15, color: C.inkSoft, maxWidth: 660, lineHeight: 1.6, marginTop: 0 }}>
            Share of adult Medicaid beneficiaries (ages 21+) residing in a state with hearing aid
            coverage. The most notable change is the 5.5 percentage-point increase between 2018
            and 2019, when Maryland, Michigan, and Washington started or reinstated coverage
            within the same half-year period.
          </p>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <AreaChart data={TREND_DATA} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid stroke={C.line} vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: C.inkSoft }} tickLine={false} />
                <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12, fill: C.inkSoft }} tickLine={false} axisLine={false} />
                <RTooltip formatter={(v) => [`${v}%`, "Beneficiaries with coverage"]}
                  contentStyle={{ borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 13 }} />
                <Area type="monotone" dataKey="share" stroke={C.teal} fill={C.teal} fillOpacity={0.14} strokeWidth={2.5} />
                <ReferenceDot x={2008} y={65.4} r={4} fill={C.teal} stroke="#fff" />
                <ReferenceDot x={2023} y={70.3} r={4} fill={C.teal} stroke="#fff" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 8, lineHeight: 1.5 }}>
            Published endpoints: 65.4% (2008) and 70.3% (2023). Interior values approximated from
            Arnold et al. (2026), Figure 2 — to be replaced with exact dataset values. State counts
            over the period: 32 states (2003) → 27 (2013) → 32 (2023).
          </div>
        </section>

        {/* Life course */}
        <section id="lifecourse" style={{ ...card, marginBottom: 32 }}>
          <SectionTitle kicker="Across all coverage types · 2008 – 2023" title="Mandated coverage shrinks across the life course" />
          <p style={{ fontSize: 15, color: C.inkSoft, maxWidth: 680, lineHeight: 1.6, marginTop: 0 }}>
            Looking beyond Medicaid — across private insurance mandates, Medicaid, VA, and
            TRICARE — the share of Americans with legally mandated hearing aid coverage rises for
            youth and working-age adults but has declined for adults 65 and older, the group with
            the greatest clinical need. Traditional Medicare has excluded hearing aids by statute
            since 1965.
          </p>
          <SlopeChart />
          <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 10, lineHeight: 1.5 }}>
            Share of each age group with mandated hearing aid coverage through private insurance
            mandates, Medicaid, VA, or TRICARE. Source: Arnold et al., Longitudinal Growth of
            Mandated Hearing Aid Benefits in the US, 2008–2023 (manuscript under review; findings
            subject to change pending peer review).
          </div>
        </section>

        {/* Policy features */}
        <section id="features" style={{ ...card, marginBottom: 32 }}>
          <SectionTitle kicker="Beyond yes or no" title="What coverage actually includes" />
          <p style={{ fontSize: 15, color: C.inkSoft, maxWidth: 660, lineHeight: 1.6, marginTop: 0 }}>
            Among the 32 covering states in 2023, benefit design varied substantially. A state can
            cover a hearing aid yet omit the services that make sustained use possible.
          </p>
          <div style={{ marginTop: 8 }}>
            {FEATURES_2023.map((f) => (
              <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: `1px solid ${C.line}` }}>
                <div style={{ flex: "0 0 200px", height: 10, background: "#EEF0EC", borderRadius: 5, overflow: "hidden" }}>
                  <div style={{ width: `${(f.n / f.of) * 100}%`, height: "100%", background: f.n / f.of > 0.5 ? C.teal : C.rust, borderRadius: 5 }} />
                </div>
                <div style={{ fontWeight: 700, minWidth: 64, fontSize: 15 }}>{f.n} of {f.of}</div>
                <div style={{ fontSize: 14.5, color: C.inkSoft, lineHeight: 1.4 }}>{f.label}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 13.5, color: C.inkSoft, marginTop: 16, lineHeight: 1.6, maxWidth: 700 }}>
            Eligibility also diverged: 11 states covered any degree of hearing loss, 13 left
            eligibility to provider discretion, and 8 required at least mild hearing loss. The most
            common benefit-use period was 60 months. Source: Arnold et al., Health Affairs (2025).
          </div>
        </section>

        {/* Publications */}
        <section id="publications" style={{ ...card, marginBottom: 32 }}>
          <SectionTitle kicker="Evidence base" title="Publications" />
          {PUBLICATIONS.map((p, i) => (
            <div key={i} style={{ padding: "16px 0", borderBottom: i < PUBLICATIONS.length - 1 ? `1px solid ${C.line}` : "none" }}>
              <div style={{ fontWeight: 600, fontSize: 15.5, marginBottom: 4, lineHeight: 1.45 }}>{p.citation}</div>
              <div style={{ fontSize: 13, color: C.teal, fontWeight: 700, marginBottom: 6 }}>
                {p.venue}{p.doi ? ` · doi:${p.doi}` : ""}
              </div>
              <div style={{ fontSize: 14, color: C.inkSoft, lineHeight: 1.55 }}>{p.note}</div>
            </div>
          ))}
        </section>

        {/* Open data */}
        <section id="data" style={{ ...card }}>
          <SectionTitle kicker="Resources" title="Open data" />
          <p style={{ fontSize: 15, color: C.inkSoft, maxWidth: 660, lineHeight: 1.6, marginTop: 0 }}>
            The Hearing Health Policy Database — state-level adult Medicaid hearing aid coverage
            policies with primary legal sources, triangulation documentation, and policy feature
            coding — is actively maintained and continues to be updated. Interactive coverage maps
            accompany the Health Affairs article at healthaffairs.org.
          </p>
          <div style={{ marginTop: 16, padding: 18, borderRadius: 10, background: "#F0F4F2", border: `1px solid ${C.line}`, fontSize: 14, lineHeight: 1.6 }}>
            <strong>Use the data.</strong> Dataset and replication materials:{" "}
            <a href="#" onClick={(e) => e.preventDefault()}>OpenICPSR deposit</a> ·{" "}
            <a href="#" onClick={(e) => e.preventDefault()}>GitHub repository</a>
            <span style={{ color: C.inkSoft }}> (links to be added)</span>
          </div>
        </section>

        <footer style={{ marginTop: 48, fontSize: 13, color: C.inkSoft, lineHeight: 1.6 }}>
          Hearing Health Policy Tracker · Social Impact Lab, University of Missouri. Research
          supported by NIDCD grant R01 DC019661. Coding follows policy surveillance and data
          triangulation methods; coverage determinations are documented with primary legal texts.
          This tracker is for informational purposes and does not constitute legal advice.
        </footer>
      </main>
    </div>
  );
}
