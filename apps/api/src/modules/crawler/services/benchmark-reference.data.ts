/**
 * Static PassMark benchmark reference data.
 * Source: passmark.com (snapshot ~2025-Q1)
 * Update by editing this file; BenchmarkMatchService will re-match on next crawl.
 */

export interface CpuBenchmark {
  model: string;
  cpuMark: number;
  singleThread: number;
  socket: string;
}

export interface GpuBenchmark {
  model: string;
  g3dMark: number;
}

export const CPU_BENCHMARKS: CpuBenchmark[] = [
  // Intel 14th gen
  { model: 'Core i9-14900KS', cpuMark: 63000, singleThread: 4500, socket: 'LGA1700' },
  { model: 'Core i9-14900K',  cpuMark: 60200, singleThread: 4450, socket: 'LGA1700' },
  { model: 'Core i9-14900KF', cpuMark: 60000, singleThread: 4440, socket: 'LGA1700' },
  { model: 'Core i9-14900',   cpuMark: 54000, singleThread: 4200, socket: 'LGA1700' },
  { model: 'Core i7-14700K',  cpuMark: 52000, singleThread: 4350, socket: 'LGA1700' },
  { model: 'Core i7-14700KF', cpuMark: 51800, singleThread: 4340, socket: 'LGA1700' },
  { model: 'Core i7-14700',   cpuMark: 47000, singleThread: 4100, socket: 'LGA1700' },
  { model: 'Core i5-14600K',  cpuMark: 40000, singleThread: 4200, socket: 'LGA1700' },
  { model: 'Core i5-14600KF', cpuMark: 39800, singleThread: 4190, socket: 'LGA1700' },
  { model: 'Core i5-14600',   cpuMark: 34000, singleThread: 3900, socket: 'LGA1700' },
  { model: 'Core i5-14500',   cpuMark: 31000, singleThread: 3800, socket: 'LGA1700' },
  { model: 'Core i5-14400',   cpuMark: 27000, singleThread: 3600, socket: 'LGA1700' },
  { model: 'Core i5-14400F',  cpuMark: 26800, singleThread: 3590, socket: 'LGA1700' },
  { model: 'Core i3-14100',   cpuMark: 14000, singleThread: 3500, socket: 'LGA1700' },
  { model: 'Core i3-14100F',  cpuMark: 13900, singleThread: 3490, socket: 'LGA1700' },
  // Intel 13th gen
  { model: 'Core i9-13900KS', cpuMark: 59000, singleThread: 4400, socket: 'LGA1700' },
  { model: 'Core i9-13900K',  cpuMark: 57800, singleThread: 4380, socket: 'LGA1700' },
  { model: 'Core i9-13900KF', cpuMark: 57600, singleThread: 4370, socket: 'LGA1700' },
  { model: 'Core i9-13900',   cpuMark: 52000, singleThread: 4100, socket: 'LGA1700' },
  { model: 'Core i7-13700K',  cpuMark: 48000, singleThread: 4300, socket: 'LGA1700' },
  { model: 'Core i7-13700KF', cpuMark: 47800, singleThread: 4290, socket: 'LGA1700' },
  { model: 'Core i7-13700',   cpuMark: 43000, singleThread: 4050, socket: 'LGA1700' },
  { model: 'Core i5-13600K',  cpuMark: 38000, singleThread: 4150, socket: 'LGA1700' },
  { model: 'Core i5-13600KF', cpuMark: 37800, singleThread: 4140, socket: 'LGA1700' },
  { model: 'Core i5-13600',   cpuMark: 32000, singleThread: 3850, socket: 'LGA1700' },
  { model: 'Core i5-13500',   cpuMark: 29000, singleThread: 3750, socket: 'LGA1700' },
  { model: 'Core i5-13400',   cpuMark: 25000, singleThread: 3550, socket: 'LGA1700' },
  { model: 'Core i5-13400F',  cpuMark: 24800, singleThread: 3540, socket: 'LGA1700' },
  { model: 'Core i3-13100',   cpuMark: 13000, singleThread: 3450, socket: 'LGA1700' },
  { model: 'Core i3-13100F',  cpuMark: 12900, singleThread: 3440, socket: 'LGA1700' },
  // Intel 12th gen
  { model: 'Core i9-12900K',  cpuMark: 40000, singleThread: 3900, socket: 'LGA1700' },
  { model: 'Core i9-12900KF', cpuMark: 39800, singleThread: 3890, socket: 'LGA1700' },
  { model: 'Core i7-12700K',  cpuMark: 34000, singleThread: 3800, socket: 'LGA1700' },
  { model: 'Core i5-12600K',  cpuMark: 26000, singleThread: 3750, socket: 'LGA1700' },
  { model: 'Core i5-12400',   cpuMark: 19000, singleThread: 3400, socket: 'LGA1700' },
  { model: 'Core i5-12400F',  cpuMark: 18800, singleThread: 3390, socket: 'LGA1700' },
  // Intel Core Ultra (Arrow Lake)
  { model: 'Core Ultra 9 285K',  cpuMark: 58000, singleThread: 4600, socket: 'LGA1851' },
  { model: 'Core Ultra 7 265K',  cpuMark: 50000, singleThread: 4500, socket: 'LGA1851' },
  { model: 'Core Ultra 7 265KF', cpuMark: 49800, singleThread: 4490, socket: 'LGA1851' },
  { model: 'Core Ultra 5 245K',  cpuMark: 38000, singleThread: 4300, socket: 'LGA1851' },
  { model: 'Core Ultra 5 245KF', cpuMark: 37800, singleThread: 4290, socket: 'LGA1851' },
  // AMD Ryzen 9000 (Zen 5)
  { model: 'Ryzen 9 9950X',  cpuMark: 72000, singleThread: 4800, socket: 'AM5' },
  { model: 'Ryzen 9 9900X',  cpuMark: 62000, singleThread: 4700, socket: 'AM5' },
  { model: 'Ryzen 7 9700X',  cpuMark: 44000, singleThread: 4600, socket: 'AM5' },
  { model: 'Ryzen 5 9600X',  cpuMark: 33000, singleThread: 4500, socket: 'AM5' },
  // AMD Ryzen 7000 (Zen 4)
  { model: 'Ryzen 9 7950X3D', cpuMark: 64000, singleThread: 4400, socket: 'AM5' },
  { model: 'Ryzen 9 7950X',   cpuMark: 62000, singleThread: 4300, socket: 'AM5' },
  { model: 'Ryzen 9 7900X3D', cpuMark: 54000, singleThread: 4250, socket: 'AM5' },
  { model: 'Ryzen 9 7900X',   cpuMark: 54000, singleThread: 4200, socket: 'AM5' },
  { model: 'Ryzen 9 7900',    cpuMark: 48000, singleThread: 4050, socket: 'AM5' },
  { model: 'Ryzen 7 7800X3D', cpuMark: 37000, singleThread: 4100, socket: 'AM5' },
  { model: 'Ryzen 7 7700X',   cpuMark: 40000, singleThread: 4150, socket: 'AM5' },
  { model: 'Ryzen 7 7700',    cpuMark: 36000, singleThread: 4000, socket: 'AM5' },
  { model: 'Ryzen 5 7600X',   cpuMark: 30000, singleThread: 4050, socket: 'AM5' },
  { model: 'Ryzen 5 7600',    cpuMark: 28000, singleThread: 3950, socket: 'AM5' },
  { model: 'Ryzen 5 7500F',   cpuMark: 25000, singleThread: 3800, socket: 'AM5' },
  // AMD Ryzen 5000 (Zen 3)
  { model: 'Ryzen 9 5950X',  cpuMark: 46000, singleThread: 3750, socket: 'AM4' },
  { model: 'Ryzen 9 5900X',  cpuMark: 40000, singleThread: 3700, socket: 'AM4' },
  { model: 'Ryzen 7 5800X3D',cpuMark: 28000, singleThread: 3600, socket: 'AM4' },
  { model: 'Ryzen 7 5800X',  cpuMark: 30000, singleThread: 3650, socket: 'AM4' },
  { model: 'Ryzen 7 5700X',  cpuMark: 26000, singleThread: 3550, socket: 'AM4' },
  { model: 'Ryzen 5 5600X',  cpuMark: 22000, singleThread: 3600, socket: 'AM4' },
  { model: 'Ryzen 5 5600',   cpuMark: 20000, singleThread: 3500, socket: 'AM4' },
  { model: 'Ryzen 5 5500',   cpuMark: 17000, singleThread: 3300, socket: 'AM4' },
];

export const GPU_BENCHMARKS: GpuBenchmark[] = [
  // NVIDIA RTX 40 series
  { model: 'RTX 4090',     g3dMark: 38000 },
  { model: 'RTX 4080 Super', g3dMark: 32000 },
  { model: 'RTX 4080',     g3dMark: 30000 },
  { model: 'RTX 4070 Ti Super', g3dMark: 27000 },
  { model: 'RTX 4070 Ti',  g3dMark: 25000 },
  { model: 'RTX 4070 Super', g3dMark: 22500 },
  { model: 'RTX 4070',     g3dMark: 20000 },
  { model: 'RTX 4060 Ti',  g3dMark: 17000 },
  { model: 'RTX 4060',     g3dMark: 13500 },
  { model: 'RTX 4050',     g3dMark: 10500 },
  // NVIDIA RTX 50 series (early data)
  { model: 'RTX 5090',     g3dMark: 56000 },
  { model: 'RTX 5080',     g3dMark: 42000 },
  { model: 'RTX 5070 Ti',  g3dMark: 35000 },
  { model: 'RTX 5070',     g3dMark: 28000 },
  // NVIDIA RTX 30 series
  { model: 'RTX 3090 Ti',  g3dMark: 23500 },
  { model: 'RTX 3090',     g3dMark: 21000 },
  { model: 'RTX 3080 Ti',  g3dMark: 21500 },
  { model: 'RTX 3080 12GB',g3dMark: 20000 },
  { model: 'RTX 3080',     g3dMark: 19000 },
  { model: 'RTX 3070 Ti',  g3dMark: 16500 },
  { model: 'RTX 3070',     g3dMark: 15500 },
  { model: 'RTX 3060 Ti',  g3dMark: 14000 },
  { model: 'RTX 3060',     g3dMark: 11000 },
  { model: 'RTX 3050',     g3dMark: 8500 },
  // AMD RX 7000 series
  { model: 'Radeon RX 7900 XTX', g3dMark: 30500 },
  { model: 'Radeon RX 7900 XT',  g3dMark: 26000 },
  { model: 'Radeon RX 7900 GRE', g3dMark: 22000 },
  { model: 'Radeon RX 7800 XT',  g3dMark: 17500 },
  { model: 'Radeon RX 7700 XT',  g3dMark: 15000 },
  { model: 'Radeon RX 7600 XT',  g3dMark: 12500 },
  { model: 'Radeon RX 7600',     g3dMark: 11500 },
  // AMD RX 6000 series
  { model: 'Radeon RX 6950 XT',  g3dMark: 24000 },
  { model: 'Radeon RX 6900 XT',  g3dMark: 22000 },
  { model: 'Radeon RX 6800 XT',  g3dMark: 20000 },
  { model: 'Radeon RX 6800',     g3dMark: 18500 },
  { model: 'Radeon RX 6750 XT',  g3dMark: 16000 },
  { model: 'Radeon RX 6700 XT',  g3dMark: 15000 },
  { model: 'Radeon RX 6700',     g3dMark: 13500 },
  { model: 'Radeon RX 6650 XT',  g3dMark: 13000 },
  { model: 'Radeon RX 6600 XT',  g3dMark: 12000 },
  { model: 'Radeon RX 6600',     g3dMark: 11000 },
  { model: 'Radeon RX 6500 XT',  g3dMark: 7000 },
];
