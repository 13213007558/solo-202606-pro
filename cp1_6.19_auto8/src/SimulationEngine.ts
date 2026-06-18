export type Region = 'Asia' | 'Europe' | 'Africa' | 'Americas' | 'Oceania';
export type CultureType = 'Eastern' | 'Western' | 'African' | 'SouthAmerican';

export interface CityNode {
  id: string;
  name: string;
  nameCN: string;
  region: Region;
  culture: CultureType;
  baseInfluence: number;
  x: number;
  y: number;
  fx?: number | null;
  fy?: number | null;
  connections: string[];
}

export interface FlowEdge {
  source: string;
  target: string;
  baseStrength: number;
  culture: CultureType;
}

export interface SimulationResult {
  nodes: CityNode[];
  edges: FlowEdge[];
}

export interface EngineParams {
  regions: Region[];
  year: number;
}

const CULTURE_BY_REGION: Record<Region, CultureType[]> = {
  Asia: ['Eastern'],
  Europe: ['Western'],
  Africa: ['African'],
  Americas: ['Western', 'SouthAmerican'],
  Oceania: ['Western']
};

const CITIES: Omit<CityNode, 'id' | 'x' | 'y' | 'fx' | 'fy' | 'connections'>[] = [
  { name: 'Beijing', nameCN: '北京', region: 'Asia', culture: 'Eastern', baseInfluence: 95 },
  { name: 'Shanghai', nameCN: '上海', region: 'Asia', culture: 'Eastern', baseInfluence: 88 },
  { name: 'Tokyo', nameCN: '东京', region: 'Asia', culture: 'Eastern', baseInfluence: 92 },
  { name: 'Seoul', nameCN: '首尔', region: 'Asia', culture: 'Eastern', baseInfluence: 82 },
  { name: 'Hong Kong', nameCN: '香港', region: 'Asia', culture: 'Eastern', baseInfluence: 85 },
  { name: 'Singapore', nameCN: '新加坡', region: 'Asia', culture: 'Eastern', baseInfluence: 80 },
  { name: 'Taipei', nameCN: '台北', region: 'Asia', culture: 'Eastern', baseInfluence: 72 },
  { name: 'Mumbai', nameCN: '孟买', region: 'Asia', culture: 'Eastern', baseInfluence: 78 },
  { name: 'Delhi', nameCN: '新德里', region: 'Asia', culture: 'Eastern', baseInfluence: 75 },
  { name: 'Bangkok', nameCN: '曼谷', region: 'Asia', culture: 'Eastern', baseInfluence: 68 },
  { name: 'Jakarta', nameCN: '雅加达', region: 'Asia', culture: 'Eastern', baseInfluence: 65 },
  { name: 'Kuala Lumpur', nameCN: '吉隆坡', region: 'Asia', culture: 'Eastern', baseInfluence: 62 },
  { name: 'Ho Chi Minh', nameCN: '胡志明市', region: 'Asia', culture: 'Eastern', baseInfluence: 58 },
  { name: 'Manila', nameCN: '马尼拉', region: 'Asia', culture: 'Eastern', baseInfluence: 55 },
  { name: 'Dubai', nameCN: '迪拜', region: 'Asia', culture: 'Eastern', baseInfluence: 70 },

  { name: 'Paris', nameCN: '巴黎', region: 'Europe', culture: 'Western', baseInfluence: 90 },
  { name: 'London', nameCN: '伦敦', region: 'Europe', culture: 'Western', baseInfluence: 93 },
  { name: 'Berlin', nameCN: '柏林', region: 'Europe', culture: 'Western', baseInfluence: 85 },
  { name: 'Rome', nameCN: '罗马', region: 'Europe', culture: 'Western', baseInfluence: 82 },
  { name: 'Madrid', nameCN: '马德里', region: 'Europe', culture: 'Western', baseInfluence: 75 },
  { name: 'Amsterdam', nameCN: '阿姆斯特丹', region: 'Europe', culture: 'Western', baseInfluence: 78 },
  { name: 'Vienna', nameCN: '维也纳', region: 'Europe', culture: 'Western', baseInfluence: 72 },
  { name: 'Barcelona', nameCN: '巴塞罗那', region: 'Europe', culture: 'Western', baseInfluence: 74 },
  { name: 'Milan', nameCN: '米兰', region: 'Europe', culture: 'Western', baseInfluence: 76 },
  { name: 'Moscow', nameCN: '莫斯科', region: 'Europe', culture: 'Western', baseInfluence: 80 },
  { name: 'Istanbul', nameCN: '伊斯坦布尔', region: 'Europe', culture: 'Western', baseInfluence: 68 },
  { name: 'Prague', nameCN: '布拉格', region: 'Europe', culture: 'Western', baseInfluence: 65 },
  { name: 'Warsaw', nameCN: '华沙', region: 'Europe', culture: 'Western', baseInfluence: 60 },
  { name: 'Lisbon', nameCN: '里斯本', region: 'Europe', culture: 'Western', baseInfluence: 58 },
  { name: 'Athens', nameCN: '雅典', region: 'Europe', culture: 'Western', baseInfluence: 62 },

  { name: 'Cairo', nameCN: '开罗', region: 'Africa', culture: 'African', baseInfluence: 72 },
  { name: 'Lagos', nameCN: '拉各斯', region: 'Africa', culture: 'African', baseInfluence: 68 },
  { name: 'Johannesburg', nameCN: '约翰内斯堡', region: 'Africa', culture: 'African', baseInfluence: 65 },
  { name: 'Casablanca', nameCN: '卡萨布兰卡', region: 'Africa', culture: 'African', baseInfluence: 58 },
  { name: 'Nairobi', nameCN: '内罗毕', region: 'Africa', culture: 'African', baseInfluence: 55 },
  { name: 'Addis Ababa', nameCN: '亚的斯亚贝巴', region: 'Africa', culture: 'African', baseInfluence: 52 },
  { name: 'Accra', nameCN: '阿克拉', region: 'Africa', culture: 'African', baseInfluence: 50 },
  { name: 'Tunis', nameCN: '突尼斯', region: 'Africa', culture: 'African', baseInfluence: 54 },
  { name: 'Dakar', nameCN: '达喀尔', region: 'Africa', culture: 'African', baseInfluence: 48 },
  { name: 'Cape Town', nameCN: '开普敦', region: 'Africa', culture: 'African', baseInfluence: 60 },

  { name: 'New York', nameCN: '纽约', region: 'Americas', culture: 'Western', baseInfluence: 98 },
  { name: 'Los Angeles', nameCN: '洛杉矶', region: 'Americas', culture: 'Western', baseInfluence: 90 },
  { name: 'Chicago', nameCN: '芝加哥', region: 'Americas', culture: 'Western', baseInfluence: 82 },
  { name: 'Toronto', nameCN: '多伦多', region: 'Americas', culture: 'Western', baseInfluence: 80 },
  { name: 'San Francisco', nameCN: '旧金山', region: 'Americas', culture: 'Western', baseInfluence: 85 },
  { name: 'Mexico City', nameCN: '墨西哥城', region: 'Americas', culture: 'SouthAmerican', baseInfluence: 72 },
  { name: 'São Paulo', nameCN: '圣保罗', region: 'Americas', culture: 'SouthAmerican', baseInfluence: 78 },
  { name: 'Rio de Janeiro', nameCN: '里约热内卢', region: 'Americas', culture: 'SouthAmerican', baseInfluence: 74 },
  { name: 'Buenos Aires', nameCN: '布宜诺斯艾利斯', region: 'Americas', culture: 'SouthAmerican', baseInfluence: 70 },
  { name: 'Bogotá', nameCN: '波哥大', region: 'Americas', culture: 'SouthAmerican', baseInfluence: 62 },
  { name: 'Lima', nameCN: '利马', region: 'Americas', culture: 'SouthAmerican', baseInfluence: 58 },
  { name: 'Santiago', nameCN: '圣地亚哥', region: 'Americas', culture: 'SouthAmerican', baseInfluence: 60 },
  { name: 'Miami', nameCN: '迈阿密', region: 'Americas', culture: 'Western', baseInfluence: 75 },
  { name: 'Vancouver', nameCN: '温哥华', region: 'Americas', culture: 'Western', baseInfluence: 72 },

  { name: 'Sydney', nameCN: '悉尼', region: 'Oceania', culture: 'Western', baseInfluence: 78 },
  { name: 'Melbourne', nameCN: '墨尔本', region: 'Oceania', culture: 'Western', baseInfluence: 75 },
  { name: 'Auckland', nameCN: '奥克兰', region: 'Oceania', culture: 'Western', baseInfluence: 65 },
  { name: 'Brisbane', nameCN: '布里斯班', region: 'Oceania', culture: 'Western', baseInfluence: 62 },
  { name: 'Perth', nameCN: '珀斯', region: 'Oceania', culture: 'Western', baseInfluence: 58 }
];

const REGION_POSITIONS: Record<Region, { cx: number; cy: number; spread: number }> = {
  Asia: { cx: 320, cy: 220, spread: 180 },
  Europe: { cx: 520, cy: 180, spread: 140 },
  Africa: { cx: 450, cy: 380, spread: 130 },
  Americas: { cx: 160, cy: 300, spread: 180 },
  Oceania: { cx: 700, cy: 400, spread: 100 }
};

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function calculateYearMultiplier(year: number, base: number): number {
  const progress = (year - 1900) / (2020 - 1900);
  const growthFactor = 0.4 + progress * 1.6;
  const culturalWave = Math.sin((year - 1900) / 15) * 0.1 + 1;
  return growthFactor * culturalWave * (base / 100);
}

export function generateSimulation(params: EngineParams): SimulationResult {
  const { regions, year } = params;
  const random = seededRandom(year + regions.join(',').length * 137);

  const filteredCities = CITIES.filter(city => regions.includes(city.region));
  const allCultures = Array.from(new Set(filteredCities.flatMap(c => CULTURE_BY_REGION[c.region])));

  const nodes: CityNode[] = filteredCities.map((city, index) => {
    const pos = REGION_POSITIONS[city.region];
    const angle = random() * Math.PI * 2;
    const radius = random() * pos.spread;
    return {
      id: `city-${index}`,
      name: city.name,
      nameCN: city.nameCN,
      region: city.region,
      culture: city.culture,
      baseInfluence: city.baseInfluence,
      x: pos.cx + Math.cos(angle) * radius,
      y: pos.cy + Math.sin(angle) * radius,
      connections: []
    };
  });

  const edges: FlowEdge[] = [];
  const edgeSet = new Set<string>();

  nodes.forEach(source => {
    const potentialTargets = nodes.filter(
      t => t.id !== source.id
    );

    const sameCultureTargets = potentialTargets.filter(t => t.culture === source.culture);
    const crossCultureTargets = potentialTargets.filter(t => t.culture !== source.culture);

    const sameCultureCount = Math.min(
      sameCultureTargets.length,
      Math.floor(random() * 4) + 2
    );
    const crossCultureCount = Math.min(
      crossCultureTargets.length,
      Math.floor(random() * 2) + 1
    );

    const selectedTargets: CityNode[] = [];

    const shuffledSame = [...sameCultureTargets].sort(() => random() - 0.5);
    for (let i = 0; i < sameCultureCount; i++) {
      selectedTargets.push(shuffledSame[i]);
    }

    const shuffledCross = [...crossCultureTargets].sort(() => random() - 0.5);
    for (let i = 0; i < crossCultureCount; i++) {
      selectedTargets.push(shuffledCross[i]);
    }

    selectedTargets.forEach(target => {
      if (!target) return;
      const edgeKey = [source.id, target.id].sort().join('-');
      if (edgeSet.has(edgeKey)) return;
      edgeSet.add(edgeKey);

      const sameCulture = source.culture === target.culture;
      const culturalAffinity = sameCulture ? 1 : 0.5;

      const distance = Math.sqrt(
        Math.pow(source.x - target.x, 2) + Math.pow(source.y - target.y, 2)
      );
      const distanceFactor = Math.max(0.2, 1 - distance / 800);

      const avgInfluence = (source.baseInfluence + target.baseInfluence) / 200;
      const yearMult = calculateYearMultiplier(year, avgInfluence * 100);

      const strength = Math.min(
        1,
        Math.max(0.05, culturalAffinity * distanceFactor * avgInfluence * yearMult)
      );

      source.connections.push(target.id);
      target.connections.push(source.id);

      edges.push({
        source: source.id,
        target: target.id,
        baseStrength: strength,
        culture: random() > 0.5 ? source.culture : target.culture
      });
    });
  });

  const regionOrder = allCultures.length > 0 ? allCultures : (['Eastern', 'Western', 'African', 'SouthAmerican'] as CultureType[]);
  regionOrder.forEach(culture => {
    const cultureNodes = nodes.filter(n => n.culture === culture);
    if (cultureNodes.length < 2) return;

    for (let i = 0; i < cultureNodes.length - 1; i++) {
      for (let j = i + 1; j < Math.min(i + 3, cultureNodes.length); j++) {
        if (random() > 0.6) continue;
        const source = cultureNodes[i];
        const target = cultureNodes[j];
        const edgeKey = [source.id, target.id].sort().join('-');
        if (edgeSet.has(edgeKey)) continue;
        edgeSet.add(edgeKey);

        const avgInfluence = (source.baseInfluence + target.baseInfluence) / 200;
        const strength = Math.min(1, 0.3 + avgInfluence * 0.5 * calculateYearMultiplier(year, avgInfluence * 100));

        source.connections.push(target.id);
        target.connections.push(source.id);

        edges.push({
          source: source.id,
          target: target.id,
          baseStrength: strength,
          culture
        });
      }
    }
  });

  return { nodes, edges };
}

export function getNodeInfluenceAtYear(node: CityNode, year: number): number {
  return node.baseInfluence * calculateYearMultiplier(year, node.baseInfluence);
}

export function getEdgeStrengthAtYear(edge: FlowEdge, year: number): number {
  const yearMult = calculateYearMultiplier(year, 75);
  return Math.min(1, edge.baseStrength * (0.6 + yearMult * 0.6));
}

export const CULTURE_COLORS: Record<CultureType, string> = {
  Eastern: '#00d2ff',
  Western: '#ff6b6b',
  African: '#ffa502',
  SouthAmerican: '#2ed573'
};

export const REGION_LABELS: Record<Region, string> = {
  Asia: '亚洲',
  Europe: '欧洲',
  Africa: '非洲',
  Americas: '美洲',
  Oceania: '大洋洲'
};

export const CULTURE_LABELS: Record<CultureType, string> = {
  Eastern: '东方文化',
  Western: '西方文化',
  African: '非洲文化',
  SouthAmerican: '南美文化'
};

export const ALL_REGIONS: Region[] = ['Asia', 'Europe', 'Africa', 'Americas', 'Oceania'];
