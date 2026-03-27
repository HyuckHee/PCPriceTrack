// Mock data used as fallback when the API server is unavailable (e.g. Vercel demo)

const CAT_GPU = { id: 'cat-1', name: 'GPU', slug: 'gpu' };
const CAT_CPU = { id: 'cat-2', name: 'CPU', slug: 'cpu' };
const CAT_RAM = { id: 'cat-3', name: 'RAM', slug: 'ram' };
const CAT_SSD = { id: 'cat-4', name: 'SSD', slug: 'ssd' };

export const MOCK_CATEGORIES = [CAT_GPU, CAT_CPU, CAT_RAM, CAT_SSD];

// ── Products (list view) ──────────────────────────────────────────────────────

export const MOCK_PRODUCTS = [
  // GPUs
  {
    id: 'p-01',
    name: 'NVIDIA GeForce RTX 4090 24GB GDDR6X Founders Edition',
    brand: 'NVIDIA',
    slug: 'rtx-4090-founders-edition',
    imageUrl: null,
    lowestPrice: '1599.00',
    lowestCurrency: 'USD',
    previousLowestPrice: '1699.00',
    originalPrice: '1599.00',
    storeNames: 'Newegg, Amazon',
    category: CAT_GPU,
  },
  {
    id: 'p-02',
    name: 'NVIDIA GeForce RTX 4080 Super 16GB GDDR6X',
    brand: 'ASUS',
    slug: 'rtx-4080-super-16gb',
    imageUrl: null,
    lowestPrice: '979.99',
    lowestCurrency: 'USD',
    previousLowestPrice: '1099.99',
    originalPrice: '999.99',
    storeNames: 'Newegg, Amazon, B&H',
    category: CAT_GPU,
  },
  {
    id: 'p-03',
    name: 'AMD Radeon RX 7900 XTX 24GB GDDR6 Liquid Cooled',
    brand: 'AMD',
    slug: 'rx-7900-xtx-24gb',
    imageUrl: null,
    lowestPrice: '849.99',
    lowestCurrency: 'USD',
    previousLowestPrice: '979.99',
    originalPrice: null,
    storeNames: 'Amazon, Newegg',
    category: CAT_GPU,
  },
  {
    id: 'p-04',
    name: 'NVIDIA GeForce RTX 4070 Ti Super 16GB GDDR6X',
    brand: 'MSI',
    slug: 'rtx-4070-ti-super-16gb',
    imageUrl: null,
    lowestPrice: '769.99',
    lowestCurrency: 'USD',
    previousLowestPrice: '849.99',
    originalPrice: '799.99',
    storeNames: 'Amazon, Newegg',
    category: CAT_GPU,
  },
  // CPUs
  {
    id: 'p-05',
    name: 'Intel Core i9-14900K 24-Core LGA1700 6.0GHz Desktop Processor',
    brand: 'Intel',
    slug: 'i9-14900k',
    imageUrl: null,
    lowestPrice: '519.99',
    lowestCurrency: 'USD',
    previousLowestPrice: '589.99',
    originalPrice: null,
    storeNames: 'Amazon, B&H',
    category: CAT_CPU,
  },
  {
    id: 'p-06',
    name: 'AMD Ryzen 9 7950X3D 16-Core AM5 5.7GHz Desktop Processor',
    brand: 'AMD',
    slug: 'ryzen-9-7950x3d',
    imageUrl: null,
    lowestPrice: '649.99',
    lowestCurrency: 'USD',
    previousLowestPrice: '699.99',
    originalPrice: null,
    storeNames: 'Newegg, Amazon',
    category: CAT_CPU,
  },
  {
    id: 'p-07',
    name: 'Intel Core i7-14700K 20-Core LGA1700 5.6GHz Desktop Processor',
    brand: 'Intel',
    slug: 'i7-14700k',
    imageUrl: null,
    lowestPrice: '349.99',
    lowestCurrency: 'USD',
    previousLowestPrice: '419.99',
    originalPrice: null,
    storeNames: 'Amazon, Newegg, B&H',
    category: CAT_CPU,
  },
  // RAM
  {
    id: 'p-08',
    name: 'Corsair Vengeance DDR5-6000 32GB (2x16GB) CL30 Desktop Memory',
    brand: 'Corsair',
    slug: 'corsair-vengeance-ddr5-6000-32gb',
    imageUrl: null,
    lowestPrice: '84.99',
    lowestCurrency: 'USD',
    previousLowestPrice: '109.99',
    originalPrice: null,
    storeNames: 'Amazon, Newegg',
    category: CAT_RAM,
  },
  {
    id: 'p-09',
    name: 'G.Skill Trident Z5 RGB DDR5-6400 64GB (2x32GB) CL32',
    brand: 'G.Skill',
    slug: 'gskill-trident-z5-ddr5-64gb',
    imageUrl: null,
    lowestPrice: '164.99',
    lowestCurrency: 'USD',
    previousLowestPrice: '199.99',
    originalPrice: null,
    storeNames: 'Newegg, Amazon',
    category: CAT_RAM,
  },
  // SSDs
  {
    id: 'p-10',
    name: 'Samsung 990 Pro 2TB NVMe M.2 PCIe 4.0 SSD 7450MB/s',
    brand: 'Samsung',
    slug: 'samsung-990-pro-2tb',
    imageUrl: null,
    lowestPrice: '129.99',
    lowestCurrency: 'USD',
    previousLowestPrice: '169.99',
    originalPrice: null,
    storeNames: 'Amazon, Newegg',
    category: CAT_SSD,
  },
  {
    id: 'p-11',
    name: 'WD Black SN850X 1TB NVMe M.2 PCIe 4.0 SSD 7300MB/s',
    brand: 'Western Digital',
    slug: 'wd-black-sn850x-1tb',
    imageUrl: null,
    lowestPrice: '84.99',
    lowestCurrency: 'USD',
    previousLowestPrice: '119.99',
    originalPrice: null,
    storeNames: 'Amazon, B&H',
    category: CAT_SSD,
  },
  {
    id: 'p-12',
    name: 'Crucial T700 4TB NVMe M.2 PCIe 5.0 SSD 12400MB/s',
    brand: 'Crucial',
    slug: 'crucial-t700-4tb',
    imageUrl: null,
    lowestPrice: '269.99',
    lowestCurrency: 'USD',
    previousLowestPrice: '349.99',
    originalPrice: null,
    storeNames: 'Newegg, Amazon',
    category: CAT_SSD,
  },
];

// ── Deals ─────────────────────────────────────────────────────────────────────

export const MOCK_DEALS = [
  {
    id: 'p-12',
    name: 'Crucial T700 4TB NVMe M.2 PCIe 5.0 SSD 12400MB/s',
    brand: 'Crucial',
    slug: 'crucial-t700-4tb',
    imageUrl: null,
    categoryName: 'SSD',
    categorySlug: 'ssd',
    currentPrice: '269.99',
    previousPrice: '349.99',
    originalPrice: null,
    currency: 'USD',
  },
  {
    id: 'p-08',
    name: 'Corsair Vengeance DDR5-6000 32GB (2x16GB) CL30 Desktop Memory',
    brand: 'Corsair',
    slug: 'corsair-vengeance-ddr5-6000-32gb',
    imageUrl: null,
    categoryName: 'RAM',
    categorySlug: 'ram',
    currentPrice: '84.99',
    previousPrice: '109.99',
    originalPrice: null,
    currency: 'USD',
  },
  {
    id: 'p-11',
    name: 'WD Black SN850X 1TB NVMe M.2 PCIe 4.0 SSD 7300MB/s',
    brand: 'Western Digital',
    slug: 'wd-black-sn850x-1tb',
    imageUrl: null,
    categoryName: 'SSD',
    categorySlug: 'ssd',
    currentPrice: '84.99',
    previousPrice: '119.99',
    originalPrice: null,
    currency: 'USD',
  },
  {
    id: 'p-07',
    name: 'Intel Core i7-14700K 20-Core LGA1700 5.6GHz Desktop Processor',
    brand: 'Intel',
    slug: 'i7-14700k',
    imageUrl: null,
    categoryName: 'CPU',
    categorySlug: 'cpu',
    currentPrice: '349.99',
    previousPrice: '419.99',
    originalPrice: null,
    currency: 'USD',
  },
  {
    id: 'p-03',
    name: 'AMD Radeon RX 7900 XTX 24GB GDDR6 Liquid Cooled',
    brand: 'AMD',
    slug: 'rx-7900-xtx-24gb',
    imageUrl: null,
    categoryName: 'GPU',
    categorySlug: 'gpu',
    currentPrice: '849.99',
    previousPrice: '979.99',
    originalPrice: null,
    currency: 'USD',
  },
  {
    id: 'p-05',
    name: 'Intel Core i9-14900K 24-Core LGA1700 6.0GHz Desktop Processor',
    brand: 'Intel',
    slug: 'i9-14900k',
    imageUrl: null,
    categoryName: 'CPU',
    categorySlug: 'cpu',
    currentPrice: '519.99',
    previousPrice: '589.99',
    originalPrice: null,
    currency: 'USD',
  },
  {
    id: 'p-09',
    name: 'G.Skill Trident Z5 RGB DDR5-6400 64GB (2x32GB) CL32',
    brand: 'G.Skill',
    slug: 'gskill-trident-z5-ddr5-64gb',
    imageUrl: null,
    categoryName: 'RAM',
    categorySlug: 'ram',
    currentPrice: '164.99',
    previousPrice: '199.99',
    originalPrice: null,
    currency: 'USD',
  },
  {
    id: 'p-10',
    name: 'Samsung 990 Pro 2TB NVMe M.2 PCIe 4.0 SSD 7450MB/s',
    brand: 'Samsung',
    slug: 'samsung-990-pro-2tb',
    imageUrl: null,
    categoryName: 'SSD',
    categorySlug: 'ssd',
    currentPrice: '129.99',
    previousPrice: '169.99',
    originalPrice: null,
    currency: 'USD',
  },
];

// ── Product detail pages ──────────────────────────────────────────────────────

const STORES = {
  newegg: { id: 'store-1', name: 'Newegg', logoUrl: null },
  amazon: { id: 'store-2', name: 'Amazon', logoUrl: null },
  bh: { id: 'store-3', name: 'B&H', logoUrl: null },
};

export const MOCK_PRODUCT_DETAILS: Record<
  string,
  {
    id: string;
    name: string;
    brand: string;
    model: string;
    slug: string;
    imageUrl: string | null;
    description: string | null;
    specs: Record<string, unknown>;
    category: { name: string; slug: string };
    listings: {
      listingId: string;
      url: string;
      latestPrice: string | null;
      latestCurrency: string | null;
      latestOriginalPrice: string | null;
      inStock: boolean | null;
      store: { id: string; name: string; logoUrl: string | null };
    }[];
  }
> = {
  'rtx-4090-founders-edition': {
    id: 'p-01',
    name: 'NVIDIA GeForce RTX 4090 24GB GDDR6X Founders Edition',
    brand: 'NVIDIA',
    model: 'RTX 4090',
    slug: 'rtx-4090-founders-edition',
    imageUrl: null,
    description: 'The GeForce RTX 4090 is the flagship Ada Lovelace GPU. With 16,384 CUDA cores and 24GB GDDR6X, it delivers unmatched 4K gaming and creative performance.',
    specs: {
      'GPU Architecture': 'Ada Lovelace',
      'CUDA Cores': '16384',
      'Memory': '24GB GDDR6X',
      'Memory Bus': '384-bit',
      'Boost Clock': '2.52 GHz',
      'TDP': '450W',
      'PCIe': 'PCIe 4.0 x16',
      'Display Outputs': '3x DisplayPort 1.4a, 1x HDMI 2.1',
    },
    category: { name: 'GPU', slug: 'gpu' },
    listings: [
      { listingId: 'l-01-1', url: '#', latestPrice: '1599.00', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.newegg },
      { listingId: 'l-01-2', url: '#', latestPrice: '1624.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.amazon },
    ],
  },
  'rtx-4080-super-16gb': {
    id: 'p-02',
    name: 'NVIDIA GeForce RTX 4080 Super 16GB GDDR6X',
    brand: 'ASUS',
    model: 'RTX 4080 Super',
    slug: 'rtx-4080-super-16gb',
    imageUrl: null,
    description: 'The RTX 4080 Super delivers exceptional 4K performance with 10,240 CUDA cores and 16GB GDDR6X memory at a more accessible price point.',
    specs: {
      'GPU Architecture': 'Ada Lovelace',
      'CUDA Cores': '10240',
      'Memory': '16GB GDDR6X',
      'Memory Bus': '256-bit',
      'Boost Clock': '2.55 GHz',
      'TDP': '320W',
      'PCIe': 'PCIe 4.0 x16',
    },
    category: { name: 'GPU', slug: 'gpu' },
    listings: [
      { listingId: 'l-02-1', url: '#', latestPrice: '979.99', latestCurrency: 'USD', latestOriginalPrice: '999.99', inStock: true, store: STORES.newegg },
      { listingId: 'l-02-2', url: '#', latestPrice: '994.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.amazon },
      { listingId: 'l-02-3', url: '#', latestPrice: '999.00', latestCurrency: 'USD', latestOriginalPrice: null, inStock: false, store: STORES.bh },
    ],
  },
  'rx-7900-xtx-24gb': {
    id: 'p-03',
    name: 'AMD Radeon RX 7900 XTX 24GB GDDR6 Liquid Cooled',
    brand: 'AMD',
    model: 'RX 7900 XTX',
    slug: 'rx-7900-xtx-24gb',
    imageUrl: null,
    description: "AMD's flagship RDNA 3 GPU with 24GB GDDR6 and a built-in liquid cooler. Outstanding performance for 4K gaming and professional workloads.",
    specs: {
      'GPU Architecture': 'RDNA 3',
      'Compute Units': '96',
      'Memory': '24GB GDDR6',
      'Memory Bus': '384-bit',
      'Game Clock': '2.3 GHz',
      'TDP': '355W',
      'PCIe': 'PCIe 4.0 x16',
    },
    category: { name: 'GPU', slug: 'gpu' },
    listings: [
      { listingId: 'l-03-1', url: '#', latestPrice: '849.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.amazon },
      { listingId: 'l-03-2', url: '#', latestPrice: '869.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.newegg },
    ],
  },
  'rtx-4070-ti-super-16gb': {
    id: 'p-04',
    name: 'NVIDIA GeForce RTX 4070 Ti Super 16GB GDDR6X',
    brand: 'MSI',
    model: 'RTX 4070 Ti Super',
    slug: 'rtx-4070-ti-super-16gb',
    imageUrl: null,
    description: 'The RTX 4070 Ti Super brings 16GB GDDR6X to the 70-class, delivering excellent 1440p and solid 4K gaming at a competitive price.',
    specs: {
      'GPU Architecture': 'Ada Lovelace',
      'CUDA Cores': '8448',
      'Memory': '16GB GDDR6X',
      'Memory Bus': '256-bit',
      'Boost Clock': '2.61 GHz',
      'TDP': '285W',
      'PCIe': 'PCIe 4.0 x16',
    },
    category: { name: 'GPU', slug: 'gpu' },
    listings: [
      { listingId: 'l-04-1', url: '#', latestPrice: '769.99', latestCurrency: 'USD', latestOriginalPrice: '799.99', inStock: true, store: STORES.amazon },
      { listingId: 'l-04-2', url: '#', latestPrice: '779.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.newegg },
    ],
  },
  'i9-14900k': {
    id: 'p-05',
    name: 'Intel Core i9-14900K 24-Core LGA1700 6.0GHz Desktop Processor',
    brand: 'Intel',
    model: 'Core i9-14900K',
    slug: 'i9-14900k',
    imageUrl: null,
    description: "Intel's top-tier desktop CPU with 24 cores (8P+16E) and a max turbo boost of 6.0GHz. Exceptional single-core and multi-threaded performance.",
    specs: {
      'Cores': '24 (8P + 16E)',
      'Threads': '32',
      'Base Clock (P-core)': '3.2 GHz',
      'Max Turbo': '6.0 GHz',
      'Socket': 'LGA1700',
      'TDP': '125W (253W PL2)',
      'Cache': '36MB L3',
      'Memory Support': 'DDR4/DDR5',
    },
    category: { name: 'CPU', slug: 'cpu' },
    listings: [
      { listingId: 'l-05-1', url: '#', latestPrice: '519.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.amazon },
      { listingId: 'l-05-2', url: '#', latestPrice: '534.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.bh },
    ],
  },
  'ryzen-9-7950x3d': {
    id: 'p-06',
    name: 'AMD Ryzen 9 7950X3D 16-Core AM5 5.7GHz Desktop Processor',
    brand: 'AMD',
    model: 'Ryzen 9 7950X3D',
    slug: 'ryzen-9-7950x3d',
    imageUrl: null,
    description: "AMD's 3D V-Cache flagship combines 16 cores with 128MB of stacked L3 cache for unmatched gaming and content creation performance.",
    specs: {
      'Cores': '16',
      'Threads': '32',
      'Base Clock': '4.2 GHz',
      'Max Boost': '5.7 GHz',
      'Socket': 'AM5',
      'TDP': '120W',
      'L3 Cache': '128MB (3D V-Cache)',
      'Memory Support': 'DDR5',
    },
    category: { name: 'CPU', slug: 'cpu' },
    listings: [
      { listingId: 'l-06-1', url: '#', latestPrice: '649.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.newegg },
      { listingId: 'l-06-2', url: '#', latestPrice: '659.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.amazon },
    ],
  },
  'i7-14700k': {
    id: 'p-07',
    name: 'Intel Core i7-14700K 20-Core LGA1700 5.6GHz Desktop Processor',
    brand: 'Intel',
    model: 'Core i7-14700K',
    slug: 'i7-14700k',
    imageUrl: null,
    description: 'The Core i7-14700K delivers 20-core performance at a mainstream price, with excellent gaming and productivity numbers.',
    specs: {
      'Cores': '20 (8P + 12E)',
      'Threads': '28',
      'Base Clock (P-core)': '3.4 GHz',
      'Max Turbo': '5.6 GHz',
      'Socket': 'LGA1700',
      'TDP': '125W (253W PL2)',
      'Cache': '33MB L3',
      'Memory Support': 'DDR4/DDR5',
    },
    category: { name: 'CPU', slug: 'cpu' },
    listings: [
      { listingId: 'l-07-1', url: '#', latestPrice: '349.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.amazon },
      { listingId: 'l-07-2', url: '#', latestPrice: '354.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.newegg },
      { listingId: 'l-07-3', url: '#', latestPrice: '359.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.bh },
    ],
  },
  'corsair-vengeance-ddr5-6000-32gb': {
    id: 'p-08',
    name: 'Corsair Vengeance DDR5-6000 32GB (2x16GB) CL30 Desktop Memory',
    brand: 'Corsair',
    model: 'CMK32GX5M2B6000C30',
    slug: 'corsair-vengeance-ddr5-6000-32gb',
    imageUrl: null,
    description: 'High-performance DDR5 kit tuned for Intel and AMD platforms. XMP 3.0 / EXPO compatible for one-click overclocking to DDR5-6000.',
    specs: {
      'Type': 'DDR5',
      'Capacity': '32GB (2x16GB)',
      'Speed': 'DDR5-6000',
      'Timings': 'CL30-36-36-76',
      'Voltage': '1.35V',
      'XMP / EXPO': 'XMP 3.0 / EXPO',
      'Form Factor': 'DIMM',
    },
    category: { name: 'RAM', slug: 'ram' },
    listings: [
      { listingId: 'l-08-1', url: '#', latestPrice: '84.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.amazon },
      { listingId: 'l-08-2', url: '#', latestPrice: '89.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.newegg },
    ],
  },
  'gskill-trident-z5-ddr5-64gb': {
    id: 'p-09',
    name: 'G.Skill Trident Z5 RGB DDR5-6400 64GB (2x32GB) CL32',
    brand: 'G.Skill',
    model: 'F5-6400J3239G32GX2-TZ5RK',
    slug: 'gskill-trident-z5-ddr5-64gb',
    imageUrl: null,
    description: 'G.Skill flagship DDR5 kit with RGB lighting, 64GB total capacity and DDR5-6400 speeds for heavy workloads and content creation.',
    specs: {
      'Type': 'DDR5',
      'Capacity': '64GB (2x32GB)',
      'Speed': 'DDR5-6400',
      'Timings': 'CL32-39-39-102',
      'Voltage': '1.4V',
      'XMP / EXPO': 'XMP 3.0',
      'Form Factor': 'DIMM',
      'Lighting': 'RGB',
    },
    category: { name: 'RAM', slug: 'ram' },
    listings: [
      { listingId: 'l-09-1', url: '#', latestPrice: '164.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.newegg },
      { listingId: 'l-09-2', url: '#', latestPrice: '169.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.amazon },
    ],
  },
  'samsung-990-pro-2tb': {
    id: 'p-10',
    name: 'Samsung 990 Pro 2TB NVMe M.2 PCIe 4.0 SSD 7450MB/s',
    brand: 'Samsung',
    model: 'MZ-V9P2T0B/AM',
    slug: 'samsung-990-pro-2tb',
    imageUrl: null,
    description: "Samsung's fastest consumer NVMe SSD with sequential reads up to 7450MB/s and optimized thermal management for sustained performance.",
    specs: {
      'Interface': 'PCIe 4.0 x4, NVMe 2.0',
      'Form Factor': 'M.2 2280',
      'Capacity': '2TB',
      'Seq. Read': '7450 MB/s',
      'Seq. Write': '6900 MB/s',
      'NAND': 'Samsung V-NAND TLC',
      'DRAM Cache': 'Yes',
      'Endurance': '1200 TBW',
    },
    category: { name: 'SSD', slug: 'ssd' },
    listings: [
      { listingId: 'l-10-1', url: '#', latestPrice: '129.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.amazon },
      { listingId: 'l-10-2', url: '#', latestPrice: '134.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.newegg },
    ],
  },
  'wd-black-sn850x-1tb': {
    id: 'p-11',
    name: 'WD Black SN850X 1TB NVMe M.2 PCIe 4.0 SSD 7300MB/s',
    brand: 'Western Digital',
    model: 'WDS100T2X0E',
    slug: 'wd-black-sn850x-1tb',
    imageUrl: null,
    description: "WD's top gaming SSD with 7300MB/s sequential reads and the latest PCIe 4.0 controller for responsive loading times.",
    specs: {
      'Interface': 'PCIe 4.0 x4, NVMe 1.4',
      'Form Factor': 'M.2 2280',
      'Capacity': '1TB',
      'Seq. Read': '7300 MB/s',
      'Seq. Write': '6300 MB/s',
      'NAND': '112-Layer TLC',
      'DRAM Cache': 'Yes',
      'Endurance': '600 TBW',
    },
    category: { name: 'SSD', slug: 'ssd' },
    listings: [
      { listingId: 'l-11-1', url: '#', latestPrice: '84.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.amazon },
      { listingId: 'l-11-2', url: '#', latestPrice: '89.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.bh },
    ],
  },
  'crucial-t700-4tb': {
    id: 'p-12',
    name: 'Crucial T700 4TB NVMe M.2 PCIe 5.0 SSD 12400MB/s',
    brand: 'Crucial',
    model: 'CT4000T700SSD3',
    slug: 'crucial-t700-4tb',
    imageUrl: null,
    description: "Crucial's PCIe 5.0 flagship reaches 12400MB/s sequential reads — the fastest consumer SSD available, with massive 4TB capacity.",
    specs: {
      'Interface': 'PCIe 5.0 x4, NVMe 2.0',
      'Form Factor': 'M.2 2280',
      'Capacity': '4TB',
      'Seq. Read': '12400 MB/s',
      'Seq. Write': '11800 MB/s',
      'NAND': '232-Layer TLC',
      'DRAM Cache': 'Yes',
      'Endurance': '2400 TBW',
    },
    category: { name: 'SSD', slug: 'ssd' },
    listings: [
      { listingId: 'l-12-1', url: '#', latestPrice: '269.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.newegg },
      { listingId: 'l-12-2', url: '#', latestPrice: '279.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.amazon },
    ],
  },
};

// ── Price history generator (deterministic) ───────────────────────────────────

interface PriceRecord {
  price: string;
  recordedAt: string;
  store: { id: string; name: string };
}

function wave(day: number, seed: number): number {
  return Math.sin(day * 0.38 + seed) * 0.5 + Math.sin(day * 0.13 + seed * 1.7) * 0.5;
}

export function getMockPriceHistory(slug: string): PriceRecord[] {
  const detail = MOCK_PRODUCT_DETAILS[slug];
  if (!detail) return [];

  const records: PriceRecord[] = [];
  const now = new Date('2026-03-27T12:00:00Z');

  for (const listing of detail.listings) {
    if (!listing.latestPrice) continue;
    const basePrice = parseFloat(listing.latestPrice);
    const seed = listing.store.id.charCodeAt(listing.store.id.length - 1);

    for (let day = 30; day >= 0; day--) {
      const date = new Date(now);
      date.setDate(date.getDate() - day);
      const variance = wave(day, seed) * basePrice * 0.04;
      const price = (basePrice + variance + (day > 20 ? basePrice * 0.05 : 0)).toFixed(2);
      records.push({
        price,
        recordedAt: date.toISOString(),
        store: { id: listing.store.id, name: listing.store.name },
      });
    }
  }

  return records;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getMockProductsResponse(params: {
  search: string;
  categoryId: string;
  minPrice: string;
  maxPrice: string;
  page: string;
  limit: number;
}) {
  let filtered = MOCK_PRODUCTS as typeof MOCK_PRODUCTS;

  if (params.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (p) => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q),
    );
  }
  if (params.categoryId) {
    filtered = filtered.filter((p) => p.category.id === params.categoryId);
  }
  if (params.minPrice) {
    const min = parseFloat(params.minPrice);
    filtered = filtered.filter((p) => p.lowestPrice && parseFloat(p.lowestPrice) >= min);
  }
  if (params.maxPrice) {
    const max = parseFloat(params.maxPrice);
    filtered = filtered.filter((p) => p.lowestPrice && parseFloat(p.lowestPrice) <= max);
  }

  const total = filtered.length;
  const pageNum = parseInt(params.page) || 1;
  const totalPages = Math.max(1, Math.ceil(total / params.limit));
  const start = (pageNum - 1) * params.limit;
  const data = filtered.slice(start, start + params.limit);

  return { data, meta: { total, page: pageNum, totalPages } };
}
