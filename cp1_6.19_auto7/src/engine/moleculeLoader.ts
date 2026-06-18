export type AtomType = 'C' | 'H' | 'O' | 'N' | 'S' | 'Cl' | 'P';

export interface AtomData {
  id: number;
  element: AtomType;
  position: [number, number, number];
}

export interface BondData {
  id: number;
  atom1: number;
  atom2: number;
  order?: number;
}

export interface MoleculeData {
  id: string;
  name: string;
  formula: string;
  atoms: AtomData[];
  bonds: BondData[];
}

export const ATOM_COLORS: Record<AtomType, number> = {
  C: 0x808080,
  H: 0xffffff,
  O: 0xff0000,
  N: 0x0000ff,
  S: 0xffff00,
  Cl: 0x00ff00,
  P: 0xff8800
};

export const ATOM_RADIUS: Record<AtomType, number> = {
  C: 0.40,
  H: 0.25,
  O: 0.35,
  N: 0.38,
  S: 0.45,
  Cl: 0.42,
  P: 0.43
};

export const BOND_RADIUS = 0.12;
export const SCALE_FACTOR = 1.2;

const molecules: MoleculeData[] = [
  {
    id: 'methane',
    name: '甲烷',
    formula: 'CH₄',
    atoms: [
      { id: 0, element: 'C', position: [0.0, 0.0, 0.0] },
      { id: 1, element: 'H', position: [0.63, 0.63, 0.63] },
      { id: 2, element: 'H', position: [-0.63, -0.63, 0.63] },
      { id: 3, element: 'H', position: [-0.63, 0.63, -0.63] },
      { id: 4, element: 'H', position: [0.63, -0.63, -0.63] }
    ],
    bonds: [
      { id: 0, atom1: 0, atom2: 1 },
      { id: 1, atom1: 0, atom2: 2 },
      { id: 2, atom1: 0, atom2: 3 },
      { id: 3, atom1: 0, atom2: 4 }
    ]
  },
  {
    id: 'ethylene',
    name: '乙烯',
    formula: 'C₂H₄',
    atoms: [
      { id: 0, element: 'C', position: [-0.67, 0.0, 0.0] },
      { id: 1, element: 'C', position: [0.67, 0.0, 0.0] },
      { id:  2, element: 'H', position: [-1.25, 0.93, 0.0] },
      { id: 3, element: 'H', position: [-1.25, -0.93, 0.0] },
      { id: 4, element: 'H', position: [1.25, 0.93, 0.0] },
      { id: 5, element: 'H', position: [1.25, -0.93, 0.0] }
    ],
    bonds: [
      { id: 0, atom1: 0, atom2: 1, order: 2 },
      { id: 1, atom1: 0, atom2: 2 },
      { id: 2, atom1: 0, atom2: 3 },
      { id: 3, atom1: 1, atom2: 4 },
      { id: 4, atom1: 1, atom2: 5 }
    ]
  },
  {
    id: 'benzene',
    name: '苯',
    formula: 'C₆H₆',
    atoms: (() => {
      const atoms: AtomData[] = [];
      const rC = 1.40;
      const rH = 2.49;
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        atoms.push({
          id: i,
          element: 'C',
          position: [rC * Math.cos(angle), rC * Math.sin(angle), 0]
        });
      }
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        atoms.push({
          id: i + 6,
          element: 'H',
          position: [rH * Math.cos(angle), rH * Math.sin(angle), 0]
        });
      }
      return atoms;
    })(),
    bonds: (() => {
      const bonds: BondData[] = [];
      for (let i = 0; i < 6; i++) {
        bonds.push({
          id: i,
          atom1: i,
          atom2: (i + 1) % 6,
          order: i % 2 === 0 ? 2 : 1
        });
      }
      for (let i = 0; i < 6; i++) {
        bonds.push({
          id: i + 6,
          atom1: i,
          atom2: i + 6
        });
      }
      return bonds;
    })()
  },
  {
    id: 'water',
    name: '水',
    formula: 'H₂O',
    atoms: [
      { id: 0, element: 'O', position: [0.0, 0.0, 0.0] },
      { id: 1, element: 'H', position: [0.76, 0.59, 0.0] },
      { id: 2, element: 'H', position: [-0.76, 0.59, 0.0] }
    ],
    bonds: [
      { id: 0, atom1: 0, atom2: 1 },
      { id: 1, atom1: 0, atom2: 2 }
    ]
  },
  {
    id: 'ammonia',
    name: '氨',
    formula: 'NH₃',
    atoms: [
      { id: 0, element: 'N', position: [0.0, 0.0, 0.0] },
      { id: 1, element: 'H', position: [0.0, 0.94, 0.0] },
      { id: 2, element: 'H', position: [-0.81, -0.47, 0.0] },
      { id: 3, element: 'H', position: [0.81, -0.47, 0.0] }
    ],
    bonds: [
      { id: 0, atom1: 0, atom2: 1 },
      { id: 1, atom1: 0, atom2: 2 },
      { id: 2, atom1: 0, atom2: 3 }
    ]
  },
  {
    id: 'ethanol',
    name: '乙醇',
    formula: 'C₂H₆O',
    atoms: [
      { id: 0, element: 'C', position: [-1.26, 0.0, 0.0] },
      { id: 1, element: 'C', position: [0.0, 0.0, 0.0] },
      { id: 2, element: 'O', position: [0.76, 1.18, 0.0] },
      { id: 3, element: 'H', position: [0.45, 1.98, 0.0] },
      { id: 4, element: 'H', position: [-1.89, 0.89, 0.0] },
      { id: 5, element: 'H', position: [-1.89, -0.52, 0.87] },
      { id: 6, element: 'H', position: [-1.89, -0.52, -0.87] },
      { id: 7, element: 'H', position: [0.52, -0.52, 0.87] },
      { id: 8, element: 'H', position: [0.52, -0.52, -0.87] }
    ],
    bonds: [
      { id: 0, atom1: 0, atom2: 1 },
      { id: 1, atom1: 1, atom2: 2 },
      { id: 2, atom1: 2, atom2: 3 },
      { id: 3, atom1: 0, atom2: 4 },
      { id: 4, atom1: 0, atom2: 5 },
      { id: 5, atom1: 0, atom2: 6 },
      { id: 6, atom1: 1, atom2: 7 },
      { id: 7, atom1: 1, atom2: 8 }
    ]
  },
  {
    id: 'acetic_acid',
    name: '乙酸',
    formula: 'C₂H₄O₂',
    atoms: [
      { id: 0, element: 'C', position: [-1.15, 0.0, 0.0] },
      { id: 1, element: 'C', position: [0.25, 0.0, 0.0] },
      { id: 2, element: 'O', position: [0.85, 0.0, 1.10] },
      { id: 3, element: 'O', position: [0.85, 0.0, -1.10] },
      { id: 4, element: 'H', position: [1.42, 0.75, -1.30] },
      { id: 5, element: 'H', position: [-1.77, 0.89, 0.0] },
      { id: 6, element: 'H', position: [-1.77, -0.52, 0.87] },
      { id: 7, element: 'H', position: [-1.77, -0.52, -0.87] }
    ],
    bonds: [
      { id: 0, atom1: 0, atom2: 1 },
      { id: 1, atom1: 1, atom2: 2, order: 2 },
      { id: 2, atom1: 1, atom2: 3 },
      { id: 3, atom1: 3, atom2: 4 },
      { id: 4, atom1: 0, atom2: 5 },
      { id: 5, atom1: 0, atom2: 6 },
      { id: 6, atom1: 0, atom2: 7 }
    ]
  }
];

export function getMoleculeList(): Array<{ id: string; name: string; formula: string }> {
  return molecules.map(m => ({
    id: m.id,
    name: m.name,
    formula: m.formula
  }));
}

export function loadMolecule(id: string): MoleculeData | null {
  const mol = molecules.find(m => m.id === id);
  if (!mol) return null;
  return JSON.parse(JSON.stringify(mol));
}

export function areAtomsBonded(atom1Id: number, atom2Id: number, bonds: BondData[]): boolean {
  return bonds.some(b =>
    (b.atom1 === atom1Id && b.atom2 === atom2Id) ||
    (b.atom1 === atom2Id && b.atom2 === atom1Id)
  );
}

export function getBondsForAtom(atomId: number, bonds: BondData[]): BondData[] {
  return bonds.filter(b => b.atom1 === atomId || b.atom2 === atomId);
}
