/** Uganda geographic defaults & district coordinate helpers */

export const UGANDA_CENTER: [number, number] = [1.3733, 32.2903];
export const UGANDA_DEFAULT_ZOOM = 7;
export const UGANDA_BOUNDS: [[number, number], [number, number]] = [
  [-1.6, 29.4],
  [4.4, 35.2],
];

/** PYU HQ — Parliamentary Avenue, Kampala */
export const PYU_HQ: {
  lat: number;
  lng: number;
  label: string;
  query: string;
} = {
  lat: 0.3142,
  lng: 32.5856,
  label: "Patriotic Youths of Uganda HQ",
  query: "Plot 1 Parliamentary Avenue Kampala Uganda",
};

/**
 * Known district seats / town centers (approx).
 * Used when CMS row has no lat/lng or for event/project district lookup.
 */
export const UGANDA_DISTRICT_COORDS: Record<string, { lat: number; lng: number }> = {
  kampala: { lat: 0.3476, lng: 32.5825 },
  wakiso: { lat: 0.4044, lng: 32.4594 },
  mukono: { lat: 0.3533, lng: 32.7553 },
  gulu: { lat: 2.7747, lng: 32.299 },
  lira: { lat: 2.249, lng: 32.8998 },
  arua: { lat: 3.0201, lng: 30.9111 },
  mbarara: { lat: -0.6072, lng: 30.6545 },
  "fort portal": { lat: 0.671, lng: 30.275 },
  kabarole: { lat: 0.671, lng: 30.275 },
  kabale: { lat: -1.2486, lng: 29.9899 },
  jinja: { lat: 0.4244, lng: 33.2041 },
  mbale: { lat: 1.082, lng: 34.175 },
  soroti: { lat: 1.7145, lng: 33.6111 },
  masaka: { lat: -0.3333, lng: 31.7333 },
  hoima: { lat: 1.4333, lng: 31.35 },
  tororo: { lat: 0.6928, lng: 34.1809 },
  moroto: { lat: 2.5347, lng: 34.6666 },
  kotido: { lat: 2.9806, lng: 34.1331 },
  kasese: { lat: 0.1833, lng: 30.0833 },
  entebbe: { lat: 0.0512, lng: 32.4637 },
  mityana: { lat: 0.4175, lng: 32.0228 },
  luwero: { lat: 0.8492, lng: 32.4731 },
  mpigi: { lat: 0.225, lng: 32.3136 },
  buikwe: { lat: 0.35, lng: 33.03 },
  iganga: { lat: 0.6092, lng: 33.4686 },
  kamuli: { lat: 0.9472, lng: 33.1197 },
  busia: { lat: 0.465, lng: 34.092 },
  kapchorwa: { lat: 1.3965, lng: 34.4509 },
  kitgum: { lat: 3.2783, lng: 32.8867 },
  pader: { lat: 2.855, lng: 33.0 },
  apac: { lat: 1.975, lng: 32.535 },
  nebbi: { lat: 2.479, lng: 31.09 },
  yumbe: { lat: 3.465, lng: 31.247 },
  adjumani: { lat: 3.377, lng: 31.791 },
  moyo: { lat: 3.654, lng: 31.724 },
  bundibugyo: { lat: 0.708, lng: 30.063 },
  ntoroko: { lat: 1.05, lng: 30.4 },
  bushenyi: { lat: -0.542, lng: 30.186 },
  sheema: { lat: -0.568, lng: 30.39 },
  ntungamo: { lat: -0.879, lng: 30.264 },
  isingiro: { lat: -0.843, lng: 30.816 },
  rukungiri: { lat: -0.788, lng: 29.942 },
  kanungu: { lat: -0.897, lng: 29.777 },
  kisoro: { lat: -1.285, lng: 29.685 },
  rubirizi: { lat: -0.3, lng: 30.1 },
  mitoma: { lat: -0.62, lng: 30.0 },
  ibanda: { lat: -0.134, lng: 30.496 },
  kiruhura: { lat: -0.2, lng: 30.85 },
  lyantonde: { lat: -0.407, lng: 31.157 },
  rakai: { lat: -0.72, lng: 31.4 },
  kyotera: { lat: -0.63, lng: 31.52 },
  sembabule: { lat: -0.15, lng: 31.45 },
  gomba: { lat: 0.2, lng: 31.7 },
  butambala: { lat: 0.17, lng: 32.08 },
  kalungu: { lat: -0.17, lng: 31.76 },
  bukomansimbi: { lat: -0.15, lng: 31.62 },
  lwengo: { lat: -0.4, lng: 31.45 },
  kayunga: { lat: 0.702, lng: 32.889 },
  nakasongola: { lat: 1.309, lng: 32.456 },
  nakaseke: { lat: 0.73, lng: 32.4 },
  kiboga: { lat: 0.916, lng: 31.774 },
  kyankwanzi: { lat: 1.2, lng: 31.7 },
  mubende: { lat: 0.589, lng: 31.36 },
  kassanda: { lat: 0.55, lng: 31.75 },
  kakumiro: { lat: 0.78, lng: 31.32 },
  kibaale: { lat: 0.8, lng: 31.08 },
  kagadi: { lat: 0.94, lng: 30.81 },
  kikube: { lat: 1.25, lng: 31.0 },
  masindi: { lat: 1.674, lng: 31.715 },
  buliisa: { lat: 2.12, lng: 31.41 },
  kiryandongo: { lat: 1.88, lng: 32.06 },
  oyam: { lat: 2.28, lng: 32.39 },
  kole: { lat: 2.4, lng: 32.8 },
  dokolo: { lat: 1.92, lng: 33.17 },
  amolatar: { lat: 1.62, lng: 32.84 },
  alebtong: { lat: 2.25, lng: 33.25 },
  otuke: { lat: 2.5, lng: 33.5 },
  agago: { lat: 3.0, lng: 33.3 },
  lamwo: { lat: 3.53, lng: 32.8 },
  nwoya: { lat: 2.63, lng: 32.0 },
  amuru: { lat: 2.82, lng: 32.0 },
  omoro: { lat: 2.65, lng: 32.35 },
  zombo: { lat: 2.51, lng: 30.9 },
  pakwach: { lat: 2.46, lng: 31.5 },
  maracha: { lat: 3.25, lng: 30.95 },
  koboko: { lat: 3.41, lng: 30.96 },
  terego: { lat: 3.15, lng: 31.15 },
  madiokollo: { lat: 3.0, lng: 31.4 },
  "madi-okollo": { lat: 3.0, lng: 31.4 },
  abim: { lat: 2.72, lng: 33.66 },
  kaabong: { lat: 3.52, lng: 34.12 },
  karenga: { lat: 3.6, lng: 33.7 },
  nabilatuk: { lat: 2.05, lng: 34.55 },
  napak: { lat: 2.25, lng: 34.25 },
  amudat: { lat: 1.95, lng: 34.95 },
  nakapiripirit: { lat: 1.92, lng: 34.72 },
  bugiri: { lat: 0.571, lng: 33.742 },
  namayingo: { lat: 0.25, lng: 33.9 },
  mayuge: { lat: 0.46, lng: 33.48 },
  bugweri: { lat: 0.65, lng: 33.55 },
  luuka: { lat: 0.7, lng: 33.3 },
  kaliro: { lat: 0.89, lng: 33.5 },
  buyende: { lat: 1.15, lng: 33.15 },
  namutumba: { lat: 0.84, lng: 33.68 },
  butaleja: { lat: 0.93, lng: 33.95 },
  budaka: { lat: 1.02, lng: 34.0 },
  kibuku: { lat: 1.05, lng: 33.8 },
  pallisa: { lat: 1.145, lng: 33.709 },
  butebo: { lat: 1.2, lng: 33.9 },
  kumi: { lat: 1.46, lng: 33.94 },
  ngora: { lat: 1.5, lng: 33.78 },
  serere: { lat: 1.5, lng: 33.55 },
  katakwi: { lat: 1.89, lng: 34.0 },
  amuria: { lat: 2.03, lng: 33.65 },
  kapelebyong: { lat: 2.15, lng: 33.85 },
  kaberamaido: { lat: 1.74, lng: 33.16 },
  kalaki: { lat: 1.85, lng: 33.3 },
  sironko: { lat: 1.23, lng: 34.25 },
  bulambuli: { lat: 1.3, lng: 34.35 },
  manafe: { lat: 0.95, lng: 34.35 },
  manafwa: { lat: 0.95, lng: 34.35 },
  bududa: { lat: 1.01, lng: 34.33 },
  bukedea: { lat: 1.35, lng: 34.05 },
  kween: { lat: 1.4, lng: 34.55 },
  bukwo: { lat: 1.28, lng: 34.75 },
  "fortportal": { lat: 0.671, lng: 30.275 },
};

function normalizeName(name: string): string {
  return String(name || "")
    .toLowerCase()
    .trim()
    .replace(/\s+district$/i, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ");
}

export function resolveDistrictCoords(
  name?: string | null,
  lat?: number | string | null,
  lng?: number | string | null
): { lat: number; lng: number } | null {
  const la = Number(lat);
  const ln = Number(lng);
  if (Number.isFinite(la) && Number.isFinite(ln) && (la !== 0 || ln !== 0)) {
    // Ignore CMS defaults that dump everything on 0.3, 32.5 unless name is Kampala-ish
    if (!(Math.abs(la - 0.3) < 0.001 && Math.abs(ln - 32.5) < 0.001)) {
      return { lat: la, lng: ln };
    }
  }
  if (!name) return null;
  const key = normalizeName(name);
  if (UGANDA_DISTRICT_COORDS[key]) return UGANDA_DISTRICT_COORDS[key];
  // partial match
  const hit = Object.entries(UGANDA_DISTRICT_COORDS).find(
    ([k]) => key.includes(k) || k.includes(key)
  );
  return hit ? hit[1] : null;
}

export function googleMapsUrl(lat: number, lng: number, label?: string): string {
  const q = label
    ? encodeURIComponent(label)
    : `${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export function openStreetMapUrl(lat: number, lng: number, zoom = 15): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`;
}
