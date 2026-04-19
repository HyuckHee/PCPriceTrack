export type UsageType = 'office' | 'gaming-fhd' | 'gaming-qhd' | 'gaming-4k' | 'video-editing' | 'ai-workstation';

export interface BuildPreset {
  usage: UsageType;
  label: string;
  cpuMinScore: number;
  gpuMinScore: number;
  /** Acceptable gpu_score / cpu_score ratio range */
  ratioRange: [number, number];
  /** Budget share per category [min%, max%] */
  budgetAllocation: Record<string, [number, number]>;
}

export const BUILD_PRESETS: Record<UsageType, BuildPreset> = {
  office: {
    usage: 'office',
    label: '사무/웹서핑',
    cpuMinScore: 8000,
    gpuMinScore: 0,
    ratioRange: [0, 99],
    budgetAllocation: {
      cpu:         [0.20, 0.35],
      gpu:         [0.00, 0.10],
      motherboard: [0.10, 0.20],
      ram:         [0.10, 0.20],
      ssd:         [0.10, 0.20],
      case:        [0.05, 0.15],
      cooler:      [0.03, 0.08],
      psu:         [0.05, 0.12],
    },
  },
  'gaming-fhd': {
    usage: 'gaming-fhd',
    label: '게이밍 FHD',
    cpuMinScore: 20000,
    gpuMinScore: 11000,
    ratioRange: [0.8, 1.6],
    budgetAllocation: {
      cpu:         [0.12, 0.22],
      gpu:         [0.28, 0.42],
      motherboard: [0.08, 0.16],
      ram:         [0.08, 0.14],
      ssd:         [0.06, 0.12],
      case:        [0.05, 0.12],
      cooler:      [0.03, 0.08],
      psu:         [0.05, 0.10],
    },
  },
  'gaming-qhd': {
    usage: 'gaming-qhd',
    label: '게이밍 QHD',
    cpuMinScore: 25000,
    gpuMinScore: 17000,
    ratioRange: [1.0, 2.0],
    budgetAllocation: {
      cpu:         [0.10, 0.20],
      gpu:         [0.32, 0.46],
      motherboard: [0.08, 0.15],
      ram:         [0.07, 0.13],
      ssd:         [0.06, 0.12],
      case:        [0.05, 0.12],
      cooler:      [0.03, 0.08],
      psu:         [0.05, 0.10],
    },
  },
  'gaming-4k': {
    usage: 'gaming-4k',
    label: '게이밍 4K',
    cpuMinScore: 28000,
    gpuMinScore: 25000,
    ratioRange: [1.3, 2.8],
    budgetAllocation: {
      cpu:         [0.08, 0.16],
      gpu:         [0.38, 0.52],
      motherboard: [0.07, 0.13],
      ram:         [0.06, 0.12],
      ssd:         [0.05, 0.10],
      case:        [0.04, 0.10],
      cooler:      [0.03, 0.07],
      psu:         [0.05, 0.10],
    },
  },
  'video-editing': {
    usage: 'video-editing',
    label: '영상 편집',
    cpuMinScore: 35000,
    gpuMinScore: 13000,
    ratioRange: [0.3, 0.9],
    budgetAllocation: {
      cpu:         [0.22, 0.35],
      gpu:         [0.15, 0.28],
      motherboard: [0.08, 0.15],
      ram:         [0.12, 0.22],
      ssd:         [0.08, 0.15],
      case:        [0.04, 0.10],
      cooler:      [0.04, 0.09],
      psu:         [0.05, 0.10],
    },
  },
  'ai-workstation': {
    usage: 'ai-workstation',
    label: 'AI/3D 워크스테이션',
    cpuMinScore: 30000,
    gpuMinScore: 22000,
    ratioRange: [0.8, 1.5],
    budgetAllocation: {
      cpu:         [0.12, 0.22],
      gpu:         [0.32, 0.48],
      motherboard: [0.08, 0.15],
      ram:         [0.10, 0.20],
      ssd:         [0.06, 0.12],
      case:        [0.04, 0.10],
      cooler:      [0.04, 0.09],
      psu:         [0.05, 0.10],
    },
  },
};
