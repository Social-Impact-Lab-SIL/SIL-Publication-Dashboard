"""Build src/data/hhpd.json from the Hearing Health Policy Database files.

Every number the dashboard draws from the database is computed here, so the
site can be refreshed by dropping in new versions of the files and re-running:

    python3 scripts/build_data.py \
        --mcaid-long hear_mcaidlong_V1_3.xlsx \
        --mcaid-cross hear_mcaidcross_v1.1.xlsx \
        --private hear_priv_V2_1.xlsx \
        --workforce hear_prof_V1.xlsx

Requires pandas and openpyxl. Published estimates that come from survey data
(ACS shares, regression results) are not in these files; they live in
src/data/published.js with their citations.
"""

import argparse
import json
import re
from collections import Counter
from pathlib import Path

import pandas as pd

STATES = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL",
    "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE",
    "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD",
    "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
]
NAMES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California",
    "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "DC": "District of Columbia",
    "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois",
    "IN": "Indiana", "IA": "Iowa", "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana",
    "ME": "Maine", "MD": "Maryland", "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota",
    "MS": "Mississippi", "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada",
    "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York",
    "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma",
    "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
    "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont",
    "VA": "Virginia", "WA": "Washington", "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
}
ABBR = {v: k for k, v in NAMES.items()}
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
          "September", "October", "November", "December"]
# Medicaid special-population notes, from the Notes sheet of hear_mcaidlong.
SPECIAL = {"MO", "UT"}
# Private mandate exceptions, from the Notes sheet of hear_priv.
EXCEPTION_NOTES = {
    "GA": ["Small employer plans are exempt", "Plans are exempt if benefit costs exceed 1% of annual premiums"],
    "IL": ["Small employer plans are exempt", "Plans are exempt if benefit costs exceed 1% of annual premiums",
           "Coverage offered as an optional rider"],
    "NE": ["Plans are exempt if benefit costs exceed 1% of annual premiums"],
    "RI": ["Small employer plans are exempt", "Coverage offered as an optional rider"],
    "WA": ["Mandate covers state employees and their dependents"],
    "WI": ["Mandate covers state employees and their dependents"],
}


def month_name(m, y):
    return f"{MONTHS[m - 1]} {y}"


def medicaid_longitudinal(path):
    d = pd.read_excel(path, sheet_name="Data View", header=0, skiprows=[1])
    d.columns = ["fips", "st", "year", "quarter", "month", "covered"]
    d = d.sort_values(["st", "year", "month"])
    sv = pd.read_excel(path, sheet_name="State View", header=0, skiprows=[1]).iloc[:, :2]
    sv.columns = ["jurisdiction", "determination"]
    determination = {ABBR[j]: str(t).strip() for j, t in zip(sv.jurisdiction, sv.determination) if j in ABBR}

    y0, y1 = int(d.year.min()), int(d.year.max())
    states = {}
    for st, g in d.groupby("st"):
        s = g.covered.astype(int).tolist()
        events = []
        for i in range(1, len(s)):
            if s[i] != s[i - 1]:
                row = g.iloc[i]
                events.append({"type": "start" if s[i] else "end",
                               "month": int(row.month), "year": int(row.year)})
        text = determination.get(st, "")
        # A removal recorded in the State View at the very start of the window
        # (e.g. Kansas, "Removed 01/2003") is an interruption, not a late adoption.
        removed_in_window = any(int(yr) >= y0 for yr in re.findall(r"Removed (?:\d{2}/)?(\d{4})", text))
        if min(s) == 1:
            continuity = "continuous"
        elif max(s) == 0:
            continuity = "never"
        elif s[-1] == 0:
            continuity = "removed"
        elif s[0] == 0 and len(events) == 1 and not removed_in_window:
            continuity = "adopted"
        else:
            continuity = "interrupted"
        years = int(g.groupby("year").covered.max().sum())
        states[st] = {
            "continuity": continuity,
            "yearsCovered": years,
            "monthsCovered": int(sum(s)),
            "coveredDec": bool(s[-1]),
            "determination": text,
            "events": [{**e, "label": f"Coverage {'began' if e['type'] == 'start' else 'ended'} {month_name(e['month'], e['year'])}"} for e in events],
        }
    counts = d.groupby(["year", "st"]).covered.max().groupby("year").sum()
    return {
        "years": [y0, y1],
        "totalYears": y1 - y0 + 1,
        "states": states,
        "countsByYear": [{"year": int(y), "states": int(n)} for y, n in counts.items()],
        "continuityCounts": dict(Counter(v["continuity"] for v in states.values())),
    }


def medicaid_cross(path):
    d = pd.read_excel(path, sheet_name="Data", header=0, skiprows=[1]).dropna(how="all")
    d.columns = [c.strip() for c in d.columns]
    d = d.rename(columns={
        "State Abbreviation": "st", "Hearing Loss Eligibility": "eligibility",
        "Frequency of Allowable Benefit Use (Months)": "frequency", "Cost Sharing": "costSharing",
        "Medicaid Reimbursement Structure": "reimbursement", "Provider Type": "provider",
        "Sensory Management: Monaural or Binaural Hearing Aids Covered": "aids",
        "Sensory Management: Fittings Covered": "fittings",
        "Sensory Management: Follow-up Adjustments Covered": "adjustments",
        "Sensory Management: Supplies Covered": "supplies",
        "Sensory Management: Batteries Covered": "batteries",
        "Rehabilitation: Assessments Covered": "assessments",
        "Rehabilitation: Auditory Training Covered": "auditoryTraining",
    })
    clean = lambda v: re.sub(r"\s+", " ", str(v)).strip().replace("/ ", "/")
    rows = {}
    d["st"] = d["st"].astype(str).str.strip()
    for _, r in d.iterrows():
        rec = {k: clean(r[k]) for k in ["eligibility", "frequency", "costSharing", "reimbursement",
                                         "provider", "aids", "fittings", "adjustments", "supplies",
                                         "batteries", "assessments", "auditoryTraining"]}
        rec["status"] = "special" if r.st in SPECIAL else "covered"
        rows[r.st] = rec
    n = len(rows)
    feature_labels = [
        ("supplies", "Supplies covered"),
        ("fittings", "Fittings covered"),
        ("adjustments", "Follow-up adjustments covered"),
        ("batteries", "Batteries covered"),
        ("assessments", "Rehabilitation assessments covered"),
        ("auditoryTraining", "Auditory training covered"),
    ]
    features = []
    for key, label in feature_labels:
        c = Counter(v[key] for v in rows.values())
        features.append({"key": key, "label": label, "yes": c.get("Yes", 0), "no": c.get("No", 0),
                         "notStated": c.get("NS", 0), "of": n})
    features.sort(key=lambda f: -f["yes"])
    tally = lambda key: dict(Counter(v[key] for v in rows.values()))
    status = {st: (rows[st]["status"] if st in rows else "none") for st in STATES}
    return {
        "asOf": "December 2023",
        "states": rows,
        "status": status,
        "statusCounts": dict(Counter(status.values())),
        "covering": n,
        "features": features,
        "eligibility": tally("eligibility"),
        "frequency": tally("frequency"),
        "costSharing": tally("costSharing"),
        "aids": tally("aids"),
        "provider": tally("provider"),
    }


def private_mandates(path):
    d = pd.read_excel(path, sheet_name="Longitudinal Data", header=0, skiprows=[1]).iloc[:, :24]
    d.columns = ["fips", "st", "year", "quarter", "month", "mand", "excep", "agemin", "agemax",
                 "prov", "elig", "allow", "supp", "batt", "rgen", "rass", "rfit", "radj", "rtrain",
                 "totcov", "freq", "oop", "ded", "notes"]
    d = d.sort_values(["st", "year", "month"])
    y0, y1 = int(d.year.min()), int(d.year.max())
    counts = d.groupby(["year", "st"]).mand.max().groupby("year").sum()
    last = d[(d.year == y1) & (d.month == 12)].set_index("st")
    states = {}
    for st in STATES:
        g = d[d.st == st]
        on = g[g.mand == 1]
        r = last.loc[st]
        if r.mand != 1:
            states[st] = {"status": "none"}
            continue
        first = on.iloc[0]
        agemax = str(r.agemax).strip()
        all_ages = agemax.startswith(">=") or agemax == "99"
        notes = str(r.notes).strip() if pd.notna(r.notes) else ""
        employees_only = st in {"WA", "WI"}  # per Notes sheet: mandate covers state employees and dependents
        states[st] = {
            "status": "allAges" if (all_ages and not employees_only) else "limited",
            "since": month_name(int(first.month), int(first.year)),
            "ageMax": "No maximum age" if all_ages else f"Through age {agemax}",
            "stateEmployeesOnly": employees_only,
            "exceptions": EXCEPTION_NOTES.get(st, []),
            "allowance": str(r.allow).strip(),
            "dollarLimit": str(r.totcov).strip(),
            "frequency": str(r.freq).strip(),
        }
    return {
        "years": [y0, y1],
        "countsByYear": [{"year": int(y), "states": int(n)} for y, n in counts.items()],
        "states": states,
        "statusCounts": dict(Counter(v["status"] for v in states.values())),
    }


def workforce(path):
    out = {}
    for key, sheet in [("audiologists", "Audiologists"), ("specialists", "Hearing Instrument Specialists")]:
        d = pd.read_excel(path, sheet_name=sheet).set_index("State")
        dec_cols = [c for c in d.columns if c.endswith("_DEC")]
        out[key] = {
            "national": [{"year": int(c[:4]), "n": int(d.loc["USA", c])} for c in dec_cols],
            "states": {st: {"first": int(d.loc[st, dec_cols[0]]), "last": int(d.loc[st, dec_cols[-1]])}
                       for st in STATES},
        }
    out["years"] = [out["audiologists"]["national"][0]["year"], out["audiologists"]["national"][-1]["year"]]
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mcaid-long", required=True)
    ap.add_argument("--mcaid-cross", required=True)
    ap.add_argument("--private", required=True)
    ap.add_argument("--workforce", required=True)
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent.parent / "src" / "data" / "hhpd.json"))
    a = ap.parse_args()
    data = {
        "names": NAMES,
        "medicaidLongitudinal": medicaid_longitudinal(a.mcaid_long),
        "medicaid2023": medicaid_cross(a.mcaid_cross),
        "privateMandates": private_mandates(a.private),
        "workforce": workforce(a.workforce),
        "sources": {
            "medicaidLongitudinal": Path(a.mcaid_long).name,
            "medicaid2023": Path(a.mcaid_cross).name,
            "privateMandates": Path(a.private).name,
            "workforce": Path(a.workforce).name,
        },
    }
    # The longitudinal file is authoritative for whether coverage was in place in
    # December 2023. A state covered there but missing from the 2023 benefit file
    # (Nevada in the current versions) is shown as covered, without benefit details.
    m23, ml = data["medicaid2023"], data["medicaidLongitudinal"]
    m23["notInBenefitFile"] = []
    for st, v in ml["states"].items():
        if v["coveredDec"] and m23["status"][st] == "none":
            m23["status"][st] = "covered"
            m23["notInBenefitFile"].append(st)
    m23["statusCounts"] = dict(Counter(m23["status"].values()))
    m23["coveringTotal"] = sum(1 for s in m23["status"].values() if s != "none")
    Path(a.out).write_text(json.dumps(data, indent=1))
    print("wrote", a.out)


if __name__ == "__main__":
    main()
