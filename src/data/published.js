/* Published estimates that are not in the Hearing Health Policy Database files
   (survey-weighted ACS results and regression estimates). Each value is copied
   from the cited article; edit here if an erratum changes a number. */

export const CITE = {
  jamaOto: "Arnold et al., JAMA Otolaryngol Head Neck Surg (2026)",
  aja: "Arnold et al., Am J Audiol (2026)",
  ha: "Arnold et al., Health Affairs (2025)",
  ajph: "Arnold et al., Am J Public Health (2024)",
  workforce: "Garuccio et al., JAMA Otolaryngol Head Neck Surg (2025)",
};

/* AJA 2026: share of adult (21+) Medicaid beneficiaries living in a state with coverage */
export const MEDICAID_SHARE = { from: { year: 2008, pct: 65.4 }, to: { year: 2023, pct: 70.3 }, jump: { from: 2018, to: 2019, pp: 5.5 } };

/* JAMA Otolaryngol Head Neck Surg 2026, Results and Table 4 */
export const LIFE_COURSE = [
  { key: "youth", group: "Youth (under 18)", short: "Under 18", y2008: 34.1, ci2008: "34.0–34.2", y2023: 52.5, ci2023: "52.4–52.6" },
  { key: "adult", group: "Adults 18–64", short: "18–64", y2008: 10.2, ci2008: "10.1–10.2", y2023: 19.2, ci2023: "19.2–19.3" },
  { key: "older", group: "Adults 65+", short: "65+", y2008: 18.5, ci2008: "18.4–18.6", y2023: 16.9, ci2023: "16.8–17.0" },
];
export const JAMA_OTO = {
  respondents: "50,203,993",
  youthMedicaid: { y2008: 29.6, y2023: 38.1 },
  olderMedicaid2023: 10.4,
  growthVsOlder: { youth: 1.03, adult: 0.66 },
};
/* Table 4: share WITH mandated coverage, 2023 */
export const INCOME_2023 = [
  { group: "Youth (under 18)", below: 83.4, atAbove: 44.3, renter: 69.0, owner: 42.6 },
  { group: "Adults 18–64", below: 36.5, atAbove: 16.1, renter: 24.5, owner: 15.7 },
  { group: "Adults 65+", below: 28.7, atAbove: 13.8, renter: 27.1, owner: 13.3 },
];

export const PUBLICATIONS = [
  {
    citation: "Arnold ML, Tonti L, Phillips S, Kershner SP, Lipton B, Heslin B, Ukert B, Landini A, Pesko MF. Longitudinal growth of mandated hearing aid benefits in the US.",
    venue: "JAMA Otolaryngology–Head & Neck Surgery. Published online October 15, 2026",
    doi: "10.1001/jamaoto.2026.3143",
    note: "Mandated hearing aid coverage across private insurance, Medicaid, the VA and TRICARE, 2008–2023, linked to 50.2 million American Community Survey responses. Coverage rose for youth and working-age adults and declined for adults 65 and older.",
  },
  {
    citation: "Arnold ML, Tonti L, Phillips S, Kershner SP, Lipton B, Heslin B, Ukert B, Hebert R, Pesko MF. Longitudinal trends in Medicaid hearing aid coverage for adults in the United States: 2003–2023.",
    venue: "American Journal of Audiology. 2026;35(3):883–892",
    doi: "10.1044/2026_AJA-25-00204",
    note: "Twenty-one years of triangulated policy surveillance documenting adoptions, interruptions and removals of adult Medicaid hearing aid coverage across the 50 states and D.C.",
  },
  {
    citation: "Arnold ML, Tonti L, Phillips S, Kershner SP, Lipton BJ, Heslin B, Ukert BD, Pesko MF. Number of states providing Medicaid hearing aid coverage for adults increased; variability was substantive, 2017–23.",
    venue: "Health Affairs. 2025;44(12):1522–1529",
    doi: "10.1377/hlthaff.2025.00270",
    note: "Cross-sectional policy surveillance of adult Medicaid hearing aid benefits as of December 2023, including eligibility, benefit frequency, cost sharing and covered services.",
  },
  {
    citation: "Garuccio J, Ukert B, Arnold M, Phillips S, Pesko MF. Using supply and demand to identify shortages in the hearing health care professional workforce.",
    venue: "JAMA Otolaryngology–Head & Neck Surgery. Published online July 31, 2025",
    doi: "10.1001/jamaoto.2025.2112",
    note: "State counts of audiologists and hearing instrument specialists from the National Plan and Provider Enumeration System, 2012–2022.",
  },
  {
    citation: "Arnold ML, Heslin BJ, Dowdy M, Kershner SP, Phillips S, Lipton B, Pesko MF. Longitudinal policy surveillance of private insurance hearing aid mandates in the United States: 1997–2022.",
    venue: "American Journal of Public Health. 2024;114(4):407–414",
    doi: "10.2105/AJPH.2023.307551",
    note: "State private insurance hearing aid mandates: effective dates, age limits, benefit amounts and exceptions.",
  },
];

/* Placeholders until the deposit links are confirmed */
export const LINKS = {
  openicpsr: null,
  github: "https://github.com/Social-Impact-Lab-SIL/SIL-Publication-Dashboard",
};
