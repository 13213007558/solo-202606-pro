import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3-force'

export type CultureType = 'eastern' | 'western' | 'african' | 'southamerican'

export type Region = 'asia' | 'europe' | 'africa' | 'americas' | 'oceania'

export type RegionFilter = Region | 'all'

export interface CultureStyle {
  label: string
  color: string
  glow: string
  gradientId: string
}

export const CULTURES: Record<CultureType, CultureStyle> = {
  eastern: { label: '东方', color: '#00d2ff', glow: 'rgba(0,210,255,0.55)', gradientId: 'grad-eastern' },
  western: { label: '西方', color: '#ff6b6b', glow: 'rgba(255,107,107,0.55)', gradientId: 'grad-western' },
  african: { label: '非洲', color: '#ffa502', glow: 'rgba(255,165,2,0.55)', gradientId: 'grad-african' },
  southamerican: { label: '南美', color: '#2ed573', glow: 'rgba(46,213,115,0.55)', gradientId: 'grad-southamerican' }
}

export const REGIONS: { id: Region; label: string }[] = [
  { id: 'asia', label: '亚洲' },
  { id: 'europe', label: '欧洲' },
  { id: 'africa', label: '非洲' },
  { id: 'americas', label: '美洲' },
  { id: 'oceania', label: '大洋洲' }
]

export const YEAR_MIN = 1900
export const YEAR_MAX = 2020

interface CitySeed {
  id: string
  name: string
  region: Region
  culture: CultureType
  lat: number
  lng: number
  hub?: boolean
}

const CITY_SEEDS: CitySeed[] = [
  { id: 'tokyo', name: 'Tokyo', region: 'asia', culture: 'eastern', lat: 35.68, lng: 139.69, hub: true },
  { id: 'beijing', name: 'Beijing', region: 'asia', culture: 'eastern', lat: 39.9, lng: 116.4 },
  { id: 'shanghai', name: 'Shanghai', region: 'asia', culture: 'eastern', lat: 31.23, lng: 121.47, hub: true },
  { id: 'seoul', name: 'Seoul', region: 'asia', culture: 'eastern', lat: 37.57, lng: 126.98 },
  { id: 'hongkong', name: 'Hong Kong', region: 'asia', culture: 'eastern', lat: 22.32, lng: 114.17 },
  { id: 'singapore', name: 'Singapore', region: 'asia', culture: 'eastern', lat: 1.35, lng: 103.82 },
  { id: 'mumbai', name: 'Mumbai', region: 'asia', culture: 'eastern', lat: 19.08, lng: 72.88, hub: true },
  { id: 'delhi', name: 'Delhi', region: 'asia', culture: 'eastern', lat: 28.61, lng: 77.21 },
  { id: 'bangkok', name: 'Bangkok', region: 'asia', culture: 'eastern', lat: 13.76, lng: 100.5 },
  { id: 'jakarta', name: 'Jakarta', region: 'asia', culture: 'eastern', lat: -6.21, lng: 106.85 },
  { id: 'manila', name: 'Manila', region: 'asia', culture: 'eastern', lat: 14.6, lng: 120.98 },
  { id: 'kolkata', name: 'Kolkata', region: 'asia', culture: 'eastern', lat: 22.57, lng: 88.36 },
  { id: 'karachi', name: 'Karachi', region: 'asia', culture: 'eastern', lat: 24.86, lng: 67.01 },
  { id: 'kyoto', name: 'Kyoto', region: 'asia', culture: 'eastern', lat: 35.01, lng: 135.77 },
  { id: 'taipei', name: 'Taipei', region: 'asia', culture: 'eastern', lat: 25.03, lng: 121.57 },
  { id: 'hanoi', name: 'Hanoi', region: 'asia', culture: 'eastern', lat: 21.03, lng: 105.85 },
  { id: 'kualalumpur', name: 'Kuala Lumpur', region: 'asia', culture: 'eastern', lat: 3.14, lng: 101.69 },
  { id: 'osaka', name: 'Osaka', region: 'asia', culture: 'eastern', lat: 34.69, lng: 135.5 },
  { id: 'chengdu', name: 'Chengdu', region: 'asia', culture: 'eastern', lat: 30.57, lng: 104.07 },
  { id: 'nanjing', name: 'Nanjing', region: 'asia', culture: 'eastern', lat: 32.06, lng: 118.8 },
  { id: 'dubai', name: 'Dubai', region: 'asia', culture: 'western', lat: 25.2, lng: 55.27 },

  { id: 'london', name: 'London', region: 'europe', culture: 'western', lat: 51.51, lng: -0.13, hub: true },
  { id: 'paris', name: 'Paris', region: 'europe', culture: 'western', lat: 48.86, lng: 2.35, hub: true },
  { id: 'berlin', name: 'Berlin', region: 'europe', culture: 'western', lat: 52.52, lng: 13.4 },
  { id: 'rome', name: 'Rome', region: 'europe', culture: 'western', lat: 41.9, lng: 12.5 },
  { id: 'madrid', name: 'Madrid', region: 'europe', culture: 'western', lat: 40.42, lng: -3.7 },
  { id: 'amsterdam', name: 'Amsterdam', region: 'europe', culture: 'western', lat: 52.37, lng: 4.9 },
  { id: 'vienna', name: 'Vienna', region: 'europe', culture: 'western', lat: 48.21, lng: 16.37 },
  { id: 'barcelona', name: 'Barcelona', region: 'europe', culture: 'western', lat: 41.39, lng: 2.17 },
  { id: 'moscow', name: 'Moscow', region: 'europe', culture: 'western', lat: 55.76, lng: 37.62 },
  { id: 'athens', name: 'Athens', region: 'europe', culture: 'western', lat: 37.98, lng: 23.73 },
  { id: 'stockholm', name: 'Stockholm', region: 'europe', culture: 'western', lat: 59.33, lng: 18.07 },
  { id: 'prague', name: 'Prague', region: 'europe', culture: 'western', lat: 50.08, lng: 14.44 },
  { id: 'lisbon', name: 'Lisbon', region: 'europe', culture: 'western', lat: 38.72, lng: -9.14 },
  { id: 'istanbul', name: 'Istanbul', region: 'europe', culture: 'western', lat: 41.01, lng: 28.98 },
  { id: 'munich', name: 'Munich', region: 'europe', culture: 'western', lat: 48.14, lng: 11.58 },
  { id: 'dublin', name: 'Dublin', region: 'europe', culture: 'western', lat: 53.35, lng: -6.26 },
  { id: 'warsaw', name: 'Warsaw', region: 'europe', culture: 'western', lat: 52.23, lng: 21.01 },
  { id: 'milan', name: 'Milan', region: 'europe', culture: 'western', lat: 45.46, lng: 9.19 },

  { id: 'cairo', name: 'Cairo', region: 'africa', culture: 'african', lat: 30.04, lng: 31.24, hub: true },
  { id: 'lagos', name: 'Lagos', region: 'africa', culture: 'african', lat: 6.52, lng: 3.38, hub: true },
  { id: 'nairobi', name: 'Nairobi', region: 'africa', culture: 'african', lat: -1.29, lng: 36.82 },
  { id: 'johannesburg', name: 'Johannesburg', region: 'africa', culture: 'african', lat: -26.2, lng: 28.05 },
  { id: 'addis', name: 'Addis Ababa', region: 'africa', culture: 'african', lat: 9.03, lng: 38.74 },
  { id: 'casablanca', name: 'Casablanca', region: 'africa', culture: 'african', lat: 33.57, lng: -7.59 },
  { id: 'accra', name: 'Accra', region: 'africa', culture: 'african', lat: 5.6, lng: -0.19 },
  { id: 'dakar', name: 'Dakar', region: 'africa', culture: 'african', lat: 14.69, lng: -17.45 },
  { id: 'tunis', name: 'Tunis', region: 'africa', culture: 'african', lat: 36.81, lng: 10.18 },
  { id: 'algiers', name: 'Algiers', region: 'africa', culture: 'african', lat: 36.75, lng: 3.06 },
  { id: 'kinshasa', name: 'Kinshasa', region: 'africa', culture: 'african', lat: -4.32, lng: 15.31 },
  { id: 'abidjan', name: 'Abidjan', region: 'africa', culture: 'african', lat: 5.36, lng: -4.01 },
  { id: 'marrakech', name: 'Marrakech', region: 'africa', culture: 'african', lat: 31.63, lng: -7.99 },

  { id: 'newyork', name: 'New York', region: 'americas', culture: 'western', lat: 40.71, lng: -74.01, hub: true },
  { id: 'losangeles', name: 'Los Angeles', region: 'americas', culture: 'western', lat: 34.05, lng: -118.24 },
  { id: 'toronto', name: 'Toronto', region: 'americas', culture: 'western', lat: 43.65, lng: -79.38 },
  { id: 'chicago', name: 'Chicago', region: 'americas', culture: 'western', lat: 41.88, lng: -87.63 },
  { id: 'vancouver', name: 'Vancouver', region: 'americas', culture: 'western', lat: 49.28, lng: -123.12 },
  { id: 'mexicocity', name: 'Mexico City', region: 'americas', culture: 'southamerican', lat: 19.43, lng: -99.13 },
  { id: 'buenosaires', name: 'Buenos Aires', region: 'americas', culture: 'southamerican', lat: -34.6, lng: -58.38, hub: true },
  { id: 'rio', name: 'Rio de Janeiro', region: 'americas', culture: 'southamerican', lat: -22.91, lng: -43.17 },
  { id: 'saopaulo', name: 'São Paulo', region: 'americas', culture: 'southamerican', lat: -23.55, lng: -46.63, hub: true },
  { id: 'lima', name: 'Lima', region: 'americas', culture: 'southamerican', lat: -12.05, lng: -77.04 },
  { id: 'bogota', name: 'Bogotá', region: 'americas', culture: 'southamerican', lat: 4.71, lng: -74.07 },
  { id: 'santiago', name: 'Santiago', region: 'americas', culture: 'southamerican', lat: -33.45, lng: -70.67 },
  { id: 'havana', name: 'Havana', region: 'americas', culture: 'southamerican', lat: 23.13, lng: -82.38 },
  { id: 'montevideo', name: 'Montevideo', region: 'americas', culture: 'southamerican', lat: -34.9, lng: -56.16 },
  { id: 'quito', name: 'Quito', region: 'americas', culture: 'southamerican', lat: -0.18, lng: -78.47 },
  { id: 'caracas', name: 'Caracas', region: 'americas', culture: 'southamerican', lat: 10.49, lng: -66.88 },
  { id: 'guadalajara', name: 'Guadalajara', region: 'americas', culture: 'southamerican', lat: 20.66, lng: -103.34 },
  { id: 'medellin', name: 'Medellín', region: 'americas', culture: 'southamerican', lat: 6.25, lng: -75.57 },

  { id: 'sydney', name: 'Sydney', region: 'oceania', culture: 'western', lat: -33.87, lng: 151.21, hub: true },
  { id: 'melbourne', name: 'Melbourne', region: 'oceania', culture: 'western', lat: -37.81, lng: 144.96 },
  { id: 'auckland', name: 'Auckland', region: 'oceania', culture: 'western', lat: -36.85, lng: 174.76 },
  { id: 'perth', name: 'Perth', region: 'oceania', culture: 'western', lat: -31.95, lng: 115.86 }
]

interface Trajectory {
  start: number
  peak: number
  end: number
  peakYear: number
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t)
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

const TRAJECTORIES: Record<string, Trajectory> = (() => {
  const map: Record<string, Trajectory> = {}
  for (const c of CITY_SEEDS) {
    const rnd = mulberry32(hashStr(c.id))
    const hubBoost = c.hub ? 18 : 0
    const start = clamp(18 + rnd() * 22, 14, 42)
    const peak = clamp(46 + rnd() * 36 + hubBoost, 55, 98)
    const end = clamp(38 + rnd() * 42 + hubBoost * 0.7, 32, 94)
    const peakYear = Math.round(1955 + rnd() * 60)
    map[c.id] = { start, peak, end, peakYear }
  }
  return map
})()

export function influenceAt(id: string, year: number): number {
  const tr = TRAJECTORIES[id]
  if (!tr) return 40
  const yr = clamp(year, YEAR_MIN, YEAR_MAX)
  if (yr <= tr.peakYear) {
    const span = Math.max(1, tr.peakYear - YEAR_MIN)
    const t = smooth(clamp((yr - YEAR_MIN) / span, 0, 1))
    return tr.start + (tr.peak - tr.start) * t
  }
  const span = Math.max(1, YEAR_MAX - tr.peakYear)
  const t = smooth(clamp((yr - tr.peakYear) / span, 0, 1))
  return tr.peak + (tr.end - tr.peak) * t
}

function connectivityFactor(year: number): number {
  const t = clamp((year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN), 0, 1)
  return 0.35 + 0.65 * smooth(t)
}

function haversine(a: CitySeed, b: CitySeed): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

interface EdgeSeed {
  source: string
  target: string
  affinity: number
}

const EDGE_SEEDS: EdgeSeed[] = (() => {
  const edges: EdgeSeed[] = []
  const seen = new Set<string>()
  const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)

  for (const city of CITY_SEEDS) {
    const dists = CITY_SEEDS.filter((o) => o.id !== city.id)
      .map((o) => ({ o, d: haversine(city, o) }))
      .sort((p, q) => p.d - q.d)

    const k = city.hub ? 5 : 3
    for (let i = 0; i < k && i < dists.length; i++) {
      const other = dists[i].o
      const kk = key(city.id, other.id)
      if (seen.has(kk)) continue
      seen.add(kk)

      const sameCulture = city.culture === other.culture ? 1 : 0.45
      const crossCulture = city.culture !== other.culture ? 0.7 : 1
      const proximity = 1 / (1 + dists[i].d / 3200)
      const affinity = clamp(sameCulture * 0.5 + proximity * 0.5, 0.12, 1) * crossCulture
      edges.push({ source: city.id, target: other.id, affinity })
    }
  }
  return edges
})()

export interface CityNode extends SimulationNodeDatum {
  id: string
  name: string
  region: Region
  culture: CultureType
  lat: number
  lng: number
  influence: number
  radius: number
  active: boolean
}

export interface CultureLink extends SimulationLinkDatum<CityNode> {
  id: string
  culture: CultureType
  strength: number
}

export interface SimulationData {
  nodes: CityNode[]
  links: CultureLink[]
  year: number
  region: RegionFilter
}

export interface SimulationParams {
  year: number
  region: RegionFilter
}

const RADIUS_MIN = 4.5
const RADIUS_MAX = 17

function radiusFor(influence: number): number {
  return RADIUS_MIN + (clamp(influence, 0, 100) / 100) * (RADIUS_MAX - RADIUS_MIN)
}

export function generateSimulationData(params: SimulationParams): SimulationData {
  const { year, region } = params
  const conn = connectivityFactor(year)

  const nodeById = new Map<string, CityNode>()
  const nodes: CityNode[] = CITY_SEEDS.map((c) => {
    const influence = influenceAt(c.id, year)
    const active = region === 'all' || c.region === region
    const node: CityNode = {
      id: c.id,
      name: c.name,
      region: c.region,
      culture: c.culture,
      lat: c.lat,
      lng: c.lng,
      influence,
      radius: radiusFor(influence),
      active
    }
    nodeById.set(c.id, node)
    return node
  })

  const links: CultureLink[] = EDGE_SEEDS.map((e, i) => {
    const s = nodeById.get(e.source)!
    const t = nodeById.get(e.target)!
    const product = (s.influence * t.influence) / 10000
    const strength = clamp(conn * e.affinity * product * 1.7, 0.02, 1)
    const link: CultureLink = {
      id: `e${i}-${e.source}-${e.target}`,
      source: s,
      target: t,
      culture: s.culture,
      strength
    }
    return link
  }).filter((l) => l.source && l.target)

  return { nodes, links, year, region }
}

export function nodeDegree(nodeId: string, links: CultureLink[]): number {
  let n = 0
  for (const l of links) {
    const s = l.source as CityNode
    const t = l.target as CityNode
    if (s.id === nodeId || t.id === nodeId) n++
  }
  return n
}
