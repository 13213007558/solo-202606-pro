export interface AtomData {
  id: string;
  element: 'C' | 'H' | 'O' | 'N';
  position: [number, number, number];
}

export interface BondData {
  id: string;
  atom1: string;
  atom2: string;
  order: 1 | 2 | 3;
}

export interface MoleculeData {
  id: string;
  name: string;
  formula: string;
  atoms: AtomData[];
  bonds: BondData[];
}

export const ELEMENT_COLORS: Record<string, number> = {
  C: 0x9e9e9e,
  H: 0xffffff,
  O: 0xff4444,
  N: 0x4488ff
};

export const ELEMENT_RADIUS: Record<string, number> = {
  C: 0.35,
  H: 0.25,
  O: 0.32,
  N: 0.32
};

export const BOND_RADIUS = 0.12;

export const MOLECULES: MoleculeData[] = [
  {
    id: 'methane',
    name: '甲烷 (Methane)',
    formula: 'CH₄',
    atoms: [
      { id: 'C1', element: 'C', position: [0, 0, 0] },
      { id: 'H1', element: 'H', position: [0.629, 0.629, 0.629] },
      { id: 'H2', element: 'H', position: [-0.629, -0.629, 0.629] },
      { id: 'H3', element: 'H', position: [-0.629, 0.629, -0.629] },
      { id: 'H4', element: 'H', position: [0.629, -0.629, -0.629] }
    ],
    bonds: [
      { id: 'b1', atom1: 'C1', atom2: 'H1', order: 1 },
      { id: 'b2', atom1: 'C1', atom2: 'H2', order: 1 },
      { id: 'b3', atom1: 'C1', atom2: 'H3', order: 1 },
      { id: 'b4', atom1: 'C1', atom2: 'H4', order: 1 }
    ]
  },
  {
    id: 'ethane',
    name: '乙烷 (Ethane)',
    formula: 'C₂H₆',
    atoms: [
      { id: 'C1', element: 'C', position: [-0.756, 0, 0] },
      { id: 'C2', element: 'C', position: [0.756, 0, 0] },
      { id: 'H1', element: 'H', position: [-1.15, 1.02, 0] },
      { id: 'H2', element: 'H', position: [-1.15, -0.51, 0.883] },
      { id: 'H3', element: 'H', position: [-1.15, -0.51, -0.883] },
      { id: 'H4', element: 'H', position: [1.15, 0.51, 0.883] },
      { id: 'H5', element: 'H', position: [1.15, 0.51, -0.883] },
      { id: 'H6', element: 'H', position: [1.15, -1.02, 0] }
    ],
    bonds: [
      { id: 'b1', atom1: 'C1', atom2: 'C2', order: 1 },
      { id: 'b2', atom1: 'C1', atom2: 'H1', order: 1 },
      { id: 'b3', atom1: 'C1', atom2: 'H2', order: 1 },
      { id: 'b4', atom1: 'C1', atom2: 'H3', order: 1 },
      { id: 'b5', atom1: 'C2', atom2: 'H4', order: 1 },
      { id: 'b6', atom1: 'C2', atom2: 'H5', order: 1 },
      { id: 'b7', atom1: 'C2', atom2: 'H6', order: 1 }
    ]
  },
  {
    id: 'ethylene',
    name: '乙烯 (Ethylene)',
    formula: 'C₂H₄',
    atoms: [
      { id: 'C1', element: 'C', position: [-0.669, 0, 0] },
      { id: 'C2', element: 'C', position: [0.669, 0, 0] },
      { id: 'H1', element: 'H', position: [-1.242, 0.928, 0] },
      { id: 'H2', element: 'H', position: [-1.242, -0.928, 0] },
      { id: 'H3', element: 'H', position: [1.242, 0.928, 0] },
      { id: 'H4', element: 'H', position: [1.242, -0.928, 0] }
    ],
    bonds: [
      { id: 'b1', atom1: 'C1', atom2: 'C2', order: 2 },
      { id: 'b2', atom1: 'C1', atom2: 'H1', order: 1 },
      { id: 'b3', atom1: 'C1', atom2: 'H2', order: 1 },
      { id: 'b4', atom1: 'C2', atom2: 'H3', order: 1 },
      { id: 'b5', atom1: 'C2', atom2: 'H4', order: 1 }
    ]
  },
  {
    id: 'benzene',
    name: '苯 (Benzene)',
    formula: 'C₆H₆',
    atoms: [
      { id: 'C1', element: 'C', position: [1.397, 0, 0] },
      { id: 'C2', element: 'C', position: [0.698, 1.21, 0] },
      { id: 'C3', element: 'C', position: [-0.698, 1.21, 0] },
      { id: 'C4', element: 'C', position: [-1.397, 0, 0] },
      { id: 'C5', element: 'C', position: [-0.698, -1.21, 0] },
      { id: 'C6', element: 'C', position: [0.698, -1.21, 0] },
      { id: 'H1', element: 'H', position: [2.479, 0, 0] },
      { id: 'H2', element: 'H', position: [1.239, 2.148, 0] },
      { id: 'H3', element: 'H', position: [-1.239, 2.148, 0] },
      { id: 'H4', element: 'H', position: [-2.479, 0, 0] },
      { id: 'H5', element: 'H', position: [-1.239, -2.148, 0] },
      { id: 'H6', element: 'H', position: [1.239, -2.148, 0] }
    ],
    bonds: [
      { id: 'b1', atom1: 'C1', atom2: 'C2', order: 2 },
      { id: 'b2', atom1: 'C2', atom2: 'C3', order: 1 },
      { id: 'b3', atom1: 'C3', atom2: 'C4', order: 2 },
      { id: 'b4', atom1: 'C4', atom2: 'C5', order: 1 },
      { id: 'b5', atom1: 'C5', atom2: 'C6', order: 2 },
      { id: 'b6', atom1: 'C6', atom2: 'C1', order: 1 },
      { id: 'b7', atom1: 'C1', atom2: 'H1', order: 1 },
      { id: 'b8', atom1: 'C2', atom2: 'H2', order: 1 },
      { id: 'b9', atom1: 'C3', atom2: 'H3', order: 1 },
      { id: 'b10', atom1: 'C4', atom2: 'H4', order: 1 },
      { id: 'b11', atom1: 'C5', atom2: 'H5', order: 1 },
      { id: 'b12', atom1: 'C6', atom2: 'H6', order: 1 }
    ]
  },
  {
    id: 'water',
    name: '水 (Water)',
    formula: 'H₂O',
    atoms: [
      { id: 'O1', element: 'O', position: [0, 0, 0] },
      { id: 'H1', element: 'H', position: [0.757, 0.586, 0] },
      { id: 'H2', element: 'H', position: [-0.757, 0.586, 0] }
    ],
    bonds: [
      { id: 'b1', atom1: 'O1', atom2: 'H1', order: 1 },
      { id: 'b2', atom1: 'O1', atom2: 'H2', order: 1 }
    ]
  },
  {
    id: 'ammonia',
    name: '氨 (Ammonia)',
    formula: 'NH₃',
    atoms: [
      { id: 'N1', element: 'N', position: [0, 0, 0] },
      { id: 'H1', element: 'H', position: [0.938, 0, -0.337] },
      { id: 'H2', element: 'H', position: [-0.469, 0.812, -0.337] },
      { id: 'H3', element: 'H', position: [-0.469, -0.812, -0.337] }
    ],
    bonds: [
      { id: 'b1', atom1: 'N1', atom2: 'H1', order: 1 },
      { id: 'b2', atom1: 'N1', atom2: 'H2', order: 1 },
      { id: 'b3', atom1: 'N1', atom2: 'H3', order: 1 }
    ]
  },
  {
    id: 'ethanol',
    name: '乙醇 (Ethanol)',
    formula: 'C₂H₆O',
    atoms: [
      { id: 'C1', element: 'C', position: [-1.24, 0, 0] },
      { id: 'C2', element: 'C', position: [0.275, 0, 0] },
      { id: 'O1', element: 'O', position: [0.932, 1.125, 0] },
      { id: 'H1', element: 'H', position: [-1.615, 1.028, 0] },
      { id: 'H2', element: 'H', position: [-1.615, -0.514, 0.89] },
      { id: 'H3', element: 'H', position: [-1.615, -0.514, -0.89] },
      { id: 'H4', element: 'H', position: [0.58, -0.514, 0.89] },
      { id: 'H5', element: 'H', position: [0.58, -0.514, -0.89] },
      { id: 'H6', element: 'H', position: [1.88, 1.05, 0] }
    ],
    bonds: [
      { id: 'b1', atom1: 'C1', atom2: 'C2', order: 1 },
      { id: 'b2', atom1: 'C2', atom2: 'O1', order: 1 },
      { id: 'b3', atom1: 'C1', atom2: 'H1', order: 1 },
      { id: 'b4', atom1: 'C1', atom2: 'H2', order: 1 },
      { id: 'b5', atom1: 'C1', atom2: 'H3', order: 1 },
      { id: 'b6', atom1: 'C2', atom2: 'H4', order: 1 },
      { id: 'b7', atom1: 'C2', atom2: 'H5', order: 1 },
      { id: 'b8', atom1: 'O1', atom2: 'H6', order: 1 }
    ]
  }
];

export function getMoleculeList(): Array<{ id: string; name: string; formula: string }> {
  return MOLECULES.map(m => ({ id: m.id, name: m.name, formula: m.formula }));
}

export function loadMolecule(id: string): MoleculeData | null {
  const mol = MOLECULES.find(m => m.id === id);
  return mol ? JSON.parse(JSON.stringify(mol)) : null;
}
