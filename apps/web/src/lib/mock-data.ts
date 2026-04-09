// Mock data used as fallback when the API server is unavailable (e.g. Vercel demo)
// Based on actual crawled data from 11번가 / Newegg (updated 2026-03-31)

const CAT_GPU = { id: 'cat-1', name: 'GPU', slug: 'gpu' };
const CAT_CPU = { id: 'cat-2', name: 'CPU', slug: 'cpu' };
const CAT_RAM = { id: 'cat-3', name: 'RAM', slug: 'ram' };
const CAT_SSD = { id: 'cat-4', name: 'SSD', slug: 'ssd' };

export const MOCK_CATEGORIES = [CAT_GPU, CAT_CPU, CAT_RAM, CAT_SSD];

// ── Products (list view) ──────────────────────────────────────────────────────

export const MOCK_PRODUCTS = [
  // ── GPU (6 real crawled products) ─────────────────────────────────────────
  {
    id: 'p-01',
    name: 'SOYO Radeon RX580 8G GDDR5 PCIe3.0 x16 Desktop GPU',
    brand: 'SOYO',
    slug: 'soyo-radeon-rx580-8g-gddr5-pcie3-0-x-16-gpu-x-8274958404',
    imageUrl: null,
    groupId: null, group: null, minPrice: '125240.00', maxPrice: '125240.00', currency: 'KRW', previousMinPrice: '139000.00', storeCount: 1, storeNames: '11번가',
    category: CAT_GPU,
  },
  {
    id: 'p-02',
    name: 'Intel Arc Pro B70 32GB GDDR6 256-bit PCIe 5.0 x16 Workstation GPU',
    brand: 'Intel',
    slug: 'inte-arc-pro-b70-32gb-256-bit-gddr6-pci-express-5-0-x16-32-ray-tracing-units-32-xe-cores-ai-and-workstation-graphics-card-n82e16814883008',
    imageUrl: null,
    groupId: null, group: null, minPrice: '249.99', maxPrice: '249.99', currency: 'USD', previousMinPrice: '299.99', storeCount: 1, storeNames: 'Newegg',
    category: CAT_GPU,
  },
  {
    id: 'p-03',
    name: 'AMD BC 250 16GB GDDR6 256-bit Desktop Graphics Card',
    brand: 'AMD',
    slug: 'amd-bc-250-16gb-gddr6-256-gpu-dp-p-x-9168619960',
    imageUrl: null,
    groupId: null, group: null, minPrice: '253000.00', maxPrice: '253000.00', currency: 'KRW', previousMinPrice: null, storeCount: 1, storeNames: '11번가',
    category: CAT_GPU,
  },
  {
    id: 'p-04',
    name: 'ONEXPLAYER ONEXGPU 1 AMD Radeon RX 7600M XT 8GB GDDR6 eGPU (OCuLink)',
    brand: 'ONEXPLAYER',
    slug: 'onexplayer-onexgpu-1-amd-radeon-rx-7600m-xt-lightning-oculink-gddr6-x-9194394036',
    imageUrl: null,
    groupId: null, group: null, minPrice: '1756140.00', maxPrice: '1756140.00', currency: 'KRW', previousMinPrice: null, storeCount: 1, storeNames: '11번가',
    category: CAT_GPU,
  },
  {
    id: 'p-05',
    name: 'MSI RTX 5080 16G SUPRIM SOC 16GB GDDR7 256-bit 2760MHz',
    brand: 'MSI',
    slug: 'msi-rtx-5080-16g-suprim-soc-16gb-gddr7-256-2760-mhz-x-9191208766',
    imageUrl: null,
    groupId: null, group: null, minPrice: '3974300.00', maxPrice: '3974300.00', currency: 'KRW', previousMinPrice: '4200000.00', storeCount: 1, storeNames: '11번가',
    category: CAT_GPU,
  },
  {
    id: 'p-06',
    name: 'Colorful iGame RTX 5090 D v2 Vulcan W OC 24GB PCIe 5.0 GPU',
    brand: 'Colorful',
    slug: '2025-igame-rtx-5090-d-v2-vulcan-w-oc-24gb-pcie-5-0-gpu-rtx-5090-x-9173196868',
    imageUrl: null,
    groupId: null, group: null, minPrice: '10388750.00', maxPrice: '10388750.00', currency: 'KRW', previousMinPrice: null, storeCount: 1, storeNames: '11번가',
    category: CAT_GPU,
  },

  // ── CPU (4 real crawled products) ─────────────────────────────────────────
  {
    id: 'p-07',
    name: 'Intel Core Ultra 5 250K 18-Core (6P+12E) Up to 5.3GHz LGA1851 Processor',
    brand: 'Intel',
    slug: 'intel-core-ultra-5-250k-plus-processor-18-cores-6-p-cores-12-e-cores-up-to-5-3-ghz-bx80768250k-n82e16819118629',
    imageUrl: null,
    groupId: null, group: null, minPrice: '219.99', maxPrice: '219.99', currency: 'USD', previousMinPrice: '259.99', storeCount: 1, storeNames: 'Newegg',
    category: CAT_CPU,
  },
  {
    id: 'p-08',
    name: 'AMD Ryzen 5 4600G 6-Core 12-Thread 3.7GHz AM4 65W Desktop Processor',
    brand: 'AMD',
    slug: '6-3-7ghz-12-ryzen-5-amd-4600g-r5-4600g-65w-cpu-l3-8m-100-000000147-am4-x-9218237214',
    imageUrl: null,
    groupId: null, group: null, minPrice: '232000.00', maxPrice: '232000.00', currency: 'KRW', previousMinPrice: null, storeCount: 1, storeNames: '11번가',
    category: CAT_CPU,
  },
  {
    id: 'p-09',
    name: 'Intel Core i7-11700K 8-Core 16-Thread 3.6GHz LGA1200 125W Desktop Processor',
    brand: 'Intel',
    slug: '8-lga-1200-cpu-i7-11700k-3-6ghz-x-9170655040',
    imageUrl: null,
    groupId: null, group: null, minPrice: '414540.00', maxPrice: '414540.00', currency: 'KRW', previousMinPrice: null, storeCount: 1, storeNames: '11번가',
    category: CAT_CPU,
  },
  {
    id: 'p-10',
    name: 'AMD Ryzen 5 9600X 6-Core AM5 5.4GHz + PRO B650-P Wi-Fi ATX Combo',
    brand: 'AMD',
    slug: 'indarl-amd-ryzen-5-9600x-6-12-am5-5-4ghz-pro-b650-p-wifi-pro-atx-ddr5-pcie-4-0-x-9030984860',
    imageUrl: null,
    groupId: null, group: null, minPrice: '821700.00', maxPrice: '821700.00', currency: 'KRW', previousMinPrice: '890000.00', storeCount: 1, storeNames: '11번가',
    category: CAT_CPU,
  },

  // ── RAM (8 real crawled products) ─────────────────────────────────────────
  {
    id: 'p-11',
    name: 'CORSAIR Vengeance RGB Pro SL 16GB (2x8GB) DDR4 3200 288-Pin Desktop RAM',
    brand: 'Corsair',
    slug: 'corsair-vengeance-rgb-pro-sl-16gb-2-x-8gb-288-pin-pc-ram-ddr4-3200-pc4-25600-desktop-memory-model-cmh16gx4m2e3200c16-n82e16820236703',
    imageUrl: null,
    groupId: null, group: null, minPrice: '149.99', maxPrice: '149.99', currency: 'USD', previousMinPrice: '179.99', storeCount: 1, storeNames: 'Newegg',
    category: CAT_RAM,
  },
  {
    id: 'p-12',
    name: 'G.SKILL Trident Z5 Neo RGB 64GB (2x32GB) DDR5 6000 PC5-48000 CL28',
    brand: 'G.Skill',
    slug: 'g-skill-trident-z5-neo-rgb-series-64gb-2-x-32gb-288-pin-pc-ram-ddr5-6000-pc5-48000-desktop-memory-model-f5-6000j2836g32gx2-tz5nr-n82e16820374695',
    imageUrl: null,
    groupId: null, group: null, minPrice: '249.99', maxPrice: '249.99', currency: 'USD', previousMinPrice: '299.99', storeCount: 1, storeNames: 'Newegg',
    category: CAT_RAM,
  },
  {
    id: 'p-13',
    name: 'Crucial Pro Overclocking 32GB (2x16GB) DDR5 6400 PC5-51200',
    brand: 'Crucial',
    slug: 'crucial-pro-overclocking-32gb-2-x-16gb-ddr5-6400-pc5-51200-desktop-memory-model-cp2k16g64c32u5b-n82e16820156450',
    imageUrl: null,
    groupId: null, group: null, minPrice: '249.99', maxPrice: '249.99', currency: 'USD', previousMinPrice: '279.99', storeCount: 1, storeNames: 'Newegg',
    category: CAT_RAM,
  },
  {
    id: 'p-14',
    name: 'Kingston Fury Beast RGB 32GB (2x16GB) DDR5 6000MT/s CL30 EXPO',
    brand: 'Kingston',
    slug: 'rgb-32gb-2x16gb-6000mt-s-2-n-cl30-kf560c30bbeak2-32-amd-ddr5-x-8706799046',
    imageUrl: null,
    groupId: null, group: null, minPrice: '597060.00', maxPrice: '597060.00', currency: 'KRW', previousMinPrice: null, storeCount: 1, storeNames: '11번가',
    category: CAT_RAM,
  },
  {
    id: 'p-15',
    name: '32GB DDR5 6000MHz (16GBx2) Intel XMP 3.0 & AMD EXPO 1.35V Desktop RAM',
    brand: 'Generic',
    slug: '32gb-ddr5-6000mhz-ddr5-ram-32gb-16gbx2-xmp-3-0-amd-1-35v-amd-7000-13-ram-x-8771816119',
    imageUrl: null,
    groupId: null, group: null, minPrice: '169110.00', maxPrice: '169110.00', currency: 'KRW', previousMinPrice: '189000.00', storeCount: 1, storeNames: '11번가',
    category: CAT_RAM,
  },
  {
    id: 'p-16',
    name: 'Patriot Viper Venom RGB DDR5 32GB (2x16GB) 6000MHz CL36 1.35V UDIMM',
    brand: 'Patriot',
    slug: 'rgb-ddr5-ram-32gb-2x16gb-6000mhz-cl36-1-35v-udimm-x-9180383455',
    imageUrl: null,
    groupId: null, group: null, minPrice: '550020.00', maxPrice: '550020.00', currency: 'KRW', previousMinPrice: null, storeCount: 1, storeNames: '11번가',
    category: CAT_RAM,
  },
  {
    id: 'p-17',
    name: 'Samsung DDR5 32GB PC5-38400 4800MHz Desktop Memory',
    brand: 'Samsung',
    slug: 'ddr5-32gb-pc5-38400-4800b-x-9198220591',
    imageUrl: null,
    groupId: null, group: null, minPrice: '595000.00', maxPrice: '595000.00', currency: 'KRW', previousMinPrice: '620000.00', storeCount: 1, storeNames: '11번가',
    category: CAT_RAM,
  },
  {
    id: 'p-18',
    name: '16GB DDR5 RAM Kit (2x8GB) 5600MHz UDIMM 288-Pin Intel/AMD Desktop Memory',
    brand: 'Crucial',
    slug: '16gb-ddr5-ram-2x8gb-5600mhz-udimm-288-amd-7000-x-9081733753',
    imageUrl: null,
    groupId: null, group: null, minPrice: '366360.00', maxPrice: '366360.00', currency: 'KRW', previousMinPrice: null, storeCount: 1, storeNames: '11번가',
    category: CAT_RAM,
  },

  // ── SSD (8 real crawled products) ─────────────────────────────────────────
  {
    id: 'p-19',
    name: 'DATO DP700Pro 1TB M.2 NVMe PCIe Gen3x4 2280 SSD (3300/3100 MB/s)',
    brand: 'DATO',
    slug: 'dato-1tb-ssd-m-2-2280-pcie-gen3x4-nvme-3300-3100-mb-s-dp700pro-x-9224045178',
    imageUrl: null,
    groupId: null, group: null, minPrice: '258590.00', maxPrice: '258590.00', currency: 'KRW', previousMinPrice: null, storeCount: 1, storeNames: '11번가',
    category: CAT_SSD,
  },
  {
    id: 'p-20',
    name: '판샹 S501Q 1TB NVMe M.2 2280 PCIe 3.0x4 SLC 3D NAND (3600MB/s)',
    brand: 'Pansang',
    slug: 's501q-ssd-1tb-pcle-3-0x4-nvme-m-2-2280-pc-slc-3d-nand-3600mb-s-x-9186922830',
    imageUrl: null,
    groupId: null, group: null, minPrice: '195300.00', maxPrice: '195300.00', currency: 'KRW', previousMinPrice: '219000.00', storeCount: 1, storeNames: '11번가',
    category: CAT_SSD,
  },
  {
    id: 'p-21',
    name: '리뷰안 MTE110S 256GB M.2 NVMe 2280 TLC Internal SSD',
    brand: 'Reletech',
    slug: 'ssd-mte110s-series-m-2-nvme-2280-256gb-tlc-ssd-wdssd-m-2ssd-ssd1t-x-9232363175',
    imageUrl: null,
    groupId: null, group: null, minPrice: '186320.00', maxPrice: '186320.00', currency: 'KRW', previousMinPrice: null, storeCount: 1, storeNames: '11번가',
    category: CAT_SSD,
  },
  {
    id: 'p-22',
    name: 'WD_BLACK 2TB SN850 NVMe Gaming SSD with Heatsink PCIe M.2 2280 7000MB/s',
    brand: 'Western Digital',
    slug: 'wd-black-2tb-sn850-nvme-ssd-playstation-5-4-pcie-m-2-2280-7-000mb-s-wds200t1xhe-x-8970583008',
    imageUrl: null,
    groupId: null, group: null, minPrice: '249120.00', maxPrice: '249120.00', currency: 'KRW', previousMinPrice: '279000.00', storeCount: 1, storeNames: '11번가',
    category: CAT_SSD,
  },
  {
    id: 'p-23',
    name: 'Netac NVMe SSD M.2 1TB 2280 PCIe 4.0 x4 Internal Solid State Drive',
    brand: 'Netac',
    slug: 'netac-ssd-pc-ps5-m2-nvme-1tb-512gb-2280-pcie4-0-x-4-x-8677372575',
    imageUrl: null,
    groupId: null, group: null, minPrice: '96700.00', maxPrice: '96700.00', currency: 'KRW', previousMinPrice: '109000.00', storeCount: 1, storeNames: '11번가',
    category: CAT_SSD,
  },
  {
    id: 'p-24',
    name: 'Acer FA200 NVMe Gen4 SSD 2TB PCIe 4.0 M.2 2280 7200MB/s',
    brand: 'Acer',
    slug: 'acer-fa200-nvme-gen4-ssd-2tb-pcie-4-0-m-2-2280-7200mb-s-pc-ps5-bl-9bwwa-125-x-9224040739',
    imageUrl: null,
    groupId: null, group: null, minPrice: '841700.00', maxPrice: '841700.00', currency: 'KRW', previousMinPrice: null, storeCount: 1, storeNames: '11번가',
    category: CAT_SSD,
  },
  {
    id: 'p-25',
    name: 'Fikwot FN970 2TB M.2 2280 PCIe Gen4x4 NVMe 1.4 DRAM SSD (7400MB/s)',
    brand: 'Fikwot',
    slug: 'fikwot-fn970-2tb-m-2-2280-pcie-gen4-x-4-nvme-1-4-7-400mb-s-dram-ps5-ssd-x-8564870152',
    imageUrl: null,
    groupId: null, group: null, minPrice: '441000.00', maxPrice: '441000.00', currency: 'KRW', previousMinPrice: '490000.00', storeCount: 1, storeNames: '11번가',
    category: CAT_SSD,
  },
  {
    id: 'p-26',
    name: 'Samsung 990 EVO PLUS 1TB PCIe Gen4x4 / Gen5x2 M.2 2280 NVMe SSD',
    brand: 'Samsung',
    slug: 'samsung-990-evo-plus-ssd-1tb-pcie-gen-4x4-gen-5x2-m-2-2280-speeds-up-to-7-150-mb-s-upgrade-storage-for-pc-laptops-hmb-technology-and-intelligent-turbowrite-2-0-mz-v9s1t0b-am-n82e16820147899',
    imageUrl: null,
    groupId: null, group: null, minPrice: '249.99', maxPrice: '249.99', currency: 'USD', previousMinPrice: '279.99', storeCount: 1, storeNames: 'Newegg',
    category: CAT_SSD,
  },
];

// ── Deals ─────────────────────────────────────────────────────────────────────

export const MOCK_DEALS = [
  {
    id: 'p-05',
    name: 'MSI RTX 5080 16G SUPRIM SOC 16GB GDDR7 256-bit 2760MHz',
    brand: 'MSI',
    slug: 'msi-rtx-5080-16g-suprim-soc-16gb-gddr7-256-2760-mhz-x-9191208766',
    imageUrl: null,
    categoryName: 'GPU',
    categorySlug: 'gpu',
    currentPrice: '3974300.00',
    previousPrice: '4200000.00',
    originalPrice: null,
    currency: 'KRW',
  },
  {
    id: 'p-07',
    name: 'Intel Core Ultra 5 250K 18-Core (6P+12E) Up to 5.3GHz LGA1851',
    brand: 'Intel',
    slug: 'intel-core-ultra-5-250k-plus-processor-18-cores-6-p-cores-12-e-cores-up-to-5-3-ghz-bx80768250k-n82e16819118629',
    imageUrl: null,
    categoryName: 'CPU',
    categorySlug: 'cpu',
    currentPrice: '219.99',
    previousPrice: '259.99',
    originalPrice: null,
    currency: 'USD',
  },
  {
    id: 'p-15',
    name: '32GB DDR5 6000MHz (16GBx2) Intel XMP 3.0 & AMD EXPO Desktop RAM',
    brand: 'Generic',
    slug: '32gb-ddr5-6000mhz-ddr5-ram-32gb-16gbx2-xmp-3-0-amd-1-35v-amd-7000-13-ram-x-8771816119',
    imageUrl: null,
    categoryName: 'RAM',
    categorySlug: 'ram',
    currentPrice: '169110.00',
    previousPrice: '189000.00',
    originalPrice: null,
    currency: 'KRW',
  },
  {
    id: 'p-22',
    name: 'WD_BLACK 2TB SN850 NVMe Gaming SSD with Heatsink PCIe M.2 2280 7000MB/s',
    brand: 'Western Digital',
    slug: 'wd-black-2tb-sn850-nvme-ssd-playstation-5-4-pcie-m-2-2280-7-000mb-s-wds200t1xhe-x-8970583008',
    imageUrl: null,
    categoryName: 'SSD',
    categorySlug: 'ssd',
    currentPrice: '249120.00',
    previousPrice: '279000.00',
    originalPrice: null,
    currency: 'KRW',
  },
  {
    id: 'p-02',
    name: 'Intel Arc Pro B70 32GB GDDR6 256-bit PCIe 5.0 x16 Workstation GPU',
    brand: 'Intel',
    slug: 'inte-arc-pro-b70-32gb-256-bit-gddr6-pci-express-5-0-x16-32-ray-tracing-units-32-xe-cores-ai-and-workstation-graphics-card-n82e16814883008',
    imageUrl: null,
    categoryName: 'GPU',
    categorySlug: 'gpu',
    currentPrice: '249.99',
    previousPrice: '299.99',
    originalPrice: null,
    currency: 'USD',
  },
  {
    id: 'p-10',
    name: 'AMD Ryzen 5 9600X 6-Core AM5 5.4GHz + PRO B650-P Wi-Fi ATX Combo',
    brand: 'AMD',
    slug: 'indarl-amd-ryzen-5-9600x-6-12-am5-5-4ghz-pro-b650-p-wifi-pro-atx-ddr5-pcie-4-0-x-9030984860',
    imageUrl: null,
    categoryName: 'CPU',
    categorySlug: 'cpu',
    currentPrice: '821700.00',
    previousPrice: '890000.00',
    originalPrice: null,
    currency: 'KRW',
  },
  {
    id: 'p-17',
    name: 'Samsung DDR5 32GB PC5-38400 4800MHz Desktop Memory',
    brand: 'Samsung',
    slug: 'ddr5-32gb-pc5-38400-4800b-x-9198220591',
    imageUrl: null,
    categoryName: 'RAM',
    categorySlug: 'ram',
    currentPrice: '595000.00',
    previousPrice: '620000.00',
    originalPrice: null,
    currency: 'KRW',
  },
  {
    id: 'p-25',
    name: 'Fikwot FN970 2TB M.2 2280 PCIe Gen4x4 NVMe 1.4 DRAM SSD (7400MB/s)',
    brand: 'Fikwot',
    slug: 'fikwot-fn970-2tb-m-2-2280-pcie-gen4-x-4-nvme-1-4-7-400mb-s-dram-ps5-ssd-x-8564870152',
    imageUrl: null,
    categoryName: 'SSD',
    categorySlug: 'ssd',
    currentPrice: '441000.00',
    previousPrice: '490000.00',
    originalPrice: null,
    currency: 'KRW',
  },
];

// ── Product detail pages ──────────────────────────────────────────────────────

const STORES = {
  newegg: { id: 'store-1', name: 'Newegg', logoUrl: 'https://c1.neweggimages.com/WebResource/Themes/Nest/logos/logo_424x210.png' },
  amazon: { id: 'store-2', name: 'Amazon', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg' },
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
  // ── GPU details ─────────────────────────────────────────────────────────────
  'rtx-4090-founders-edition': {
    id: 'p-01',
    name: 'NVIDIA GeForce RTX 4090 24GB GDDR6X Founders Edition',
    brand: 'NVIDIA',
    model: 'RTX 4090',
    slug: 'rtx-4090-founders-edition',
    imageUrl: 'https://c1.neweggimages.com/productimage/nb640/14-126-753-01.jpg',
    description: 'The GeForce RTX 4090 is the flagship Ada Lovelace GPU. With 16,384 CUDA cores and 24GB GDDR6X, it delivers unmatched 4K gaming and creative performance.',
    specs: { 'GPU Architecture': 'Ada Lovelace', 'CUDA Cores': '16384', 'Memory': '24GB GDDR6X', 'Memory Bus': '384-bit', 'Boost Clock': '2.52 GHz', 'TDP': '450W' },
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
    imageUrl: 'https://m.media-amazon.com/images/I/81POeoI3lSL._AC_SY300_SX300_QL70_FMwebp_.jpg',
    description: 'The RTX 4080 Super delivers exceptional 4K performance with 10,240 CUDA cores and 16GB GDDR6X memory.',
    specs: { 'GPU Architecture': 'Ada Lovelace', 'CUDA Cores': '10240', 'Memory': '16GB GDDR6X', 'Memory Bus': '256-bit', 'Boost Clock': '2.55 GHz', 'TDP': '320W' },
    category: { name: 'GPU', slug: 'gpu' },
    listings: [
      { listingId: 'l-02-1', url: '#', latestPrice: '979.99', latestCurrency: 'USD', latestOriginalPrice: '999.99', inStock: true, store: STORES.newegg },
      { listingId: 'l-02-2', url: '#', latestPrice: '994.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.amazon },
    ],
  },
  'rx-7900-xtx-24gb': {
    id: 'p-03',
    name: 'AMD Radeon RX 7900 XTX 24GB GDDR6 Liquid Cooled',
    brand: 'AMD',
    model: 'RX 7900 XTX',
    slug: 'rx-7900-xtx-24gb',
    imageUrl: 'https://m.media-amazon.com/images/I/81huTBuLV+L._AC_SY300_SX300_QL70_FMwebp_.jpg',
    description: "AMD's flagship RDNA 3 GPU with 24GB GDDR6 and a built-in liquid cooler.",
    specs: { 'GPU Architecture': 'RDNA 3', 'Compute Units': '96', 'Memory': '24GB GDDR6', 'Memory Bus': '384-bit', 'Game Clock': '2.3 GHz', 'TDP': '355W' },
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
    imageUrl: 'https://c1.neweggimages.com/productimage/nb640/14-137-931-05.jpg',
    description: 'The RTX 4070 Ti Super brings 16GB GDDR6X, delivering excellent 1440p and solid 4K gaming.',
    specs: { 'GPU Architecture': 'Ada Lovelace', 'CUDA Cores': '8448', 'Memory': '16GB GDDR6X', 'Boost Clock': '2.61 GHz', 'TDP': '285W' },
    category: { name: 'GPU', slug: 'gpu' },
    listings: [
      { listingId: 'l-04-1', url: '#', latestPrice: '769.99', latestCurrency: 'USD', latestOriginalPrice: '799.99', inStock: true, store: STORES.amazon },
      { listingId: 'l-04-2', url: '#', latestPrice: '779.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.newegg },
    ],
  },
  'asus-tuf-rtx5090-32g-oc': {
    id: 'p-13',
    name: 'ASUS TUF Gaming GeForce RTX 5090 32GB GDDR7 OC Edition',
    brand: 'ASUS',
    model: 'TUF-RTX5090-O32G-GAMING',
    slug: 'asus-tuf-rtx5090-32g-oc',
    imageUrl: 'https://c1.neweggimages.com/productimage/nb640/14-126-753-01.jpg',
    description: 'ASUS TUF Gaming RTX 5090 with 32GB GDDR7, DLSS 4.0 and PCIe 5.0 for ultimate performance.',
    specs: { 'GPU Architecture': 'Blackwell', 'Memory': '32GB GDDR7', 'Interface': 'PCIe 5.0', 'DLSS': '4.0' },
    category: { name: 'GPU', slug: 'gpu' },
    listings: [
      { listingId: 'l-13-1', url: 'https://www.newegg.com/p/N82E16814126753', latestPrice: '3799.99', latestCurrency: 'USD', latestOriginalPrice: '3999.99', inStock: true, store: STORES.newegg },
    ],
  },
  'msi-rtx5070-12g-gaming-trio-oc': {
    id: 'p-14',
    name: 'MSI RTX 5070 12G Gaming Trio OC Graphics Card',
    brand: 'MSI',
    model: 'RTX 5070 12G GAMING TRIO OC',
    slug: 'msi-rtx5070-12g-gaming-trio-oc',
    imageUrl: 'https://m.media-amazon.com/images/I/71vOVP+iFnL._AC_SX300_SY300_QL70_FMwebp_.jpg',
    description: 'MSI RTX 5070 Gaming Trio OC with 12GB GDDR7, 192-bit, NVIDIA Blackwell architecture.',
    specs: { 'GPU Architecture': 'Blackwell', 'Memory': '12GB GDDR7', 'Memory Bus': '192-bit', 'Boost Clock': '2625 MHz' },
    category: { name: 'GPU', slug: 'gpu' },
    listings: [
      { listingId: 'l-14-1', url: 'https://www.amazon.com/dp/B0DYFXGDJF', latestPrice: '679.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.amazon },
    ],
  },
  'zotac-rtx5080-16g-solid-core-oc': {
    id: 'p-15',
    name: 'ZOTAC SOLID CORE OC GeForce RTX 5080 16GB GDDR7',
    brand: 'ZOTAC',
    model: 'ZT-B50800J2-10P',
    slug: 'zotac-rtx5080-16g-solid-core-oc',
    imageUrl: 'https://c1.neweggimages.com/productimage/nb640/14-500-604-02.jpg',
    description: 'ZOTAC RTX 5080 with 16GB GDDR7 256-bit, DLSS 4.0, PCIe 5.0.',
    specs: { 'GPU Architecture': 'Blackwell', 'Memory': '16GB GDDR7', 'Memory Bus': '256-bit', 'Interface': 'PCIe 5.0 x16' },
    category: { name: 'GPU', slug: 'gpu' },
    listings: [
      { listingId: 'l-15-1', url: 'https://www.newegg.com/p/N82E16814500604', latestPrice: '1099.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.newegg },
    ],
  },
  'gigabyte-rtx5070ti-16g-windforce': {
    id: 'p-16',
    name: 'GIGABYTE WindForce GeForce RTX 5070 Ti 16GB GDDR7',
    brand: 'GIGABYTE',
    model: 'GV-N507TWF3OC-16GD',
    slug: 'gigabyte-rtx5070ti-16g-windforce',
    imageUrl: 'https://c1.neweggimages.com/productimage/nb640/14-932-771-02.jpg',
    description: 'GIGABYTE WindForce RTX 5070 Ti with triple-fan cooling and 16GB GDDR7.',
    specs: { 'GPU Architecture': 'Blackwell', 'Memory': '16GB GDDR7', 'Interface': 'PCIe 5.0' },
    category: { name: 'GPU', slug: 'gpu' },
    listings: [
      { listingId: 'l-16-1', url: 'https://www.newegg.com/p/N82E16814932771', latestPrice: '849.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.newegg },
    ],
  },
  'msi-rtx5070ti-16g-gaming-trio-oc': {
    id: 'p-17',
    name: 'MSI Gaming GeForce RTX 5070 Ti 16GB GDDR7 Gaming Trio OC',
    brand: 'MSI',
    model: 'RTX 5070 Ti 16G GAMING TRIO OC',
    slug: 'msi-rtx5070ti-16g-gaming-trio-oc',
    imageUrl: 'https://c1.neweggimages.com/productimage/nb640/14-137-931-05.jpg',
    description: 'MSI Gaming Trio RTX 5070 Ti with 16GB GDDR7, PCIe 5.0.',
    specs: { 'GPU Architecture': 'Blackwell', 'Memory': '16GB GDDR7', 'Interface': 'PCIe 5.0' },
    category: { name: 'GPU', slug: 'gpu' },
    listings: [
      { listingId: 'l-17-1', url: 'https://www.newegg.com/p/N82E16814137931', latestPrice: '879.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.newegg },
    ],
  },
  'msi-rtx5090-32g-suprim-liquid-soc': {
    id: 'p-18',
    name: 'MSI Suprim GeForce RTX 5090 32GB GDDR7 Liquid SOC',
    brand: 'MSI',
    model: 'RTX 5090 32G SUPRIM LIQUID SOC',
    slug: 'msi-rtx5090-32g-suprim-liquid-soc',
    imageUrl: 'https://c1.neweggimages.com/productimage/nb640/14-137-914-03.png',
    description: 'MSI Suprim Liquid-cooled RTX 5090 with 32GB GDDR7, ultimate flagship.',
    specs: { 'GPU Architecture': 'Blackwell', 'Memory': '32GB GDDR7', 'Cooling': 'Liquid', 'Interface': 'PCIe 5.0' },
    category: { name: 'GPU', slug: 'gpu' },
    listings: [
      { listingId: 'l-18-1', url: 'https://www.newegg.com/p/N82E16814137916', latestPrice: '3499.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.newegg },
    ],
  },
  'asrock-rx9070xt-16g-steel-legend': {
    id: 'p-19',
    name: 'ASRock Steel Legend Radeon RX 9070 XT 16GB GDDR6',
    brand: 'ASRock',
    model: 'RX9070XT SL 16G',
    slug: 'asrock-rx9070xt-16g-steel-legend',
    imageUrl: 'https://c1.neweggimages.com/productimage/nb640/14-930-136-05.jpg',
    description: 'ASRock Steel Legend RX 9070 XT with 16GB GDDR6, PCIe 5.0.',
    specs: { 'GPU Architecture': 'RDNA 4', 'Memory': '16GB GDDR6', 'Interface': 'PCIe 5.0 x16' },
    category: { name: 'GPU', slug: 'gpu' },
    listings: [
      { listingId: 'l-19-1', url: 'https://www.newegg.com/p/N82E16814930136', latestPrice: '579.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.newegg },
    ],
  },
  'asus-prime-rx9070xt-oc': {
    id: 'p-20',
    name: 'ASUS Prime Radeon RX 9070 XT OC Edition 16GB',
    brand: 'ASUS',
    model: 'PRIME-RX9070XT-O16G',
    slug: 'asus-prime-rx9070xt-oc',
    imageUrl: 'https://m.media-amazon.com/images/I/81huTBuLV+L._AC_SY300_SX300_QL70_FMwebp_.jpg',
    description: 'ASUS Prime RX 9070 XT OC with Axial-tech fans, Dual BIOS, GPU Guard.',
    specs: { 'GPU Architecture': 'RDNA 4', 'Memory': '16GB GDDR6', 'Interface': 'PCIe 5.0' },
    category: { name: 'GPU', slug: 'gpu' },
    listings: [
      { listingId: 'l-20-1', url: 'https://www.amazon.com/dp/B0DRRMZDH6', latestPrice: '599.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.amazon },
    ],
  },

  // ── CPU details ─────────────────────────────────────────────────────────────
  'i9-14900k': {
    id: 'p-05',
    name: 'Intel Core i9-14900K 24-Core LGA1700 6.0GHz Desktop Processor',
    brand: 'Intel',
    model: 'Core i9-14900K',
    slug: 'i9-14900k',
    imageUrl: 'https://c1.neweggimages.com/productimage/nb640/19-118-505-08.jpg',
    description: "Intel's top-tier desktop CPU with 24 cores (8P+16E) and a max turbo boost of 6.0GHz.",
    specs: { 'Cores': '24 (8P + 16E)', 'Threads': '32', 'Max Turbo': '6.0 GHz', 'Socket': 'LGA1700', 'TDP': '125W' },
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
    imageUrl: 'https://m.media-amazon.com/images/I/51HqC0rU9HL._AC_SX300_SY300_QL70_FMwebp_.jpg',
    description: "AMD's 3D V-Cache flagship with 16 cores and 128MB stacked L3 cache.",
    specs: { 'Cores': '16', 'Threads': '32', 'Max Boost': '5.7 GHz', 'Socket': 'AM5', 'TDP': '120W', 'L3 Cache': '128MB' },
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
    imageUrl: 'https://m.media-amazon.com/images/I/513c8GtpBBL._AC_SY300_SX300_QL70_FMwebp_.jpg',
    description: 'The Core i7-14700K delivers 20-core performance at a mainstream price.',
    specs: { 'Cores': '20 (8P + 12E)', 'Threads': '28', 'Max Turbo': '5.6 GHz', 'Socket': 'LGA1700', 'TDP': '125W' },
    category: { name: 'CPU', slug: 'cpu' },
    listings: [
      { listingId: 'l-07-1', url: '#', latestPrice: '349.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.amazon },
      { listingId: 'l-07-2', url: '#', latestPrice: '354.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.newegg },
    ],
  },
  'amd-ryzen-7-7800x3d': {
    id: 'p-21',
    name: 'AMD Ryzen 7 7800X3D 8-Core 16-Thread Desktop Processor',
    brand: 'AMD',
    model: 'Ryzen 7 7800X3D',
    slug: 'amd-ryzen-7-7800x3d',
    imageUrl: 'https://m.media-amazon.com/images/I/51HqC0rU9HL._AC_SX300_SY300_QL70_FMwebp_.jpg',
    description: 'AMD 3D V-Cache gaming processor with 8 cores and 96MB L3 cache for ultimate gaming.',
    specs: { 'Cores': '8', 'Threads': '16', 'Max Boost': '5.0 GHz', 'Socket': 'AM5', 'TDP': '120W', 'L3 Cache': '96MB (3D V-Cache)' },
    category: { name: 'CPU', slug: 'cpu' },
    listings: [
      { listingId: 'l-21-1', url: 'https://www.amazon.com/dp/B0BTZB7F88', latestPrice: '384.00', latestCurrency: 'USD', latestOriginalPrice: '449.00', inStock: true, store: STORES.amazon },
    ],
  },
  'intel-core-ultra-9-285k': {
    id: 'p-22',
    name: 'Intel Core Ultra 9 285K Arrow Lake 24-Core LGA1851 125W',
    brand: 'Intel',
    model: 'Core Ultra 9 285K',
    slug: 'intel-core-ultra-9-285k',
    imageUrl: 'https://c1.neweggimages.com/productimage/nb640/19-118-505-08.jpg',
    description: 'Intel Arrow Lake flagship with 24 cores (8P+16E), LGA 1851 socket.',
    specs: { 'Cores': '24 (8P + 16E)', 'Max Turbo': '5.7 GHz', 'Socket': 'LGA1851', 'TDP': '125W', 'Cache': '40MB L3' },
    category: { name: 'CPU', slug: 'cpu' },
    listings: [
      { listingId: 'l-22-1', url: 'https://www.newegg.com/p/N82E16819118505', latestPrice: '564.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.newegg },
      { listingId: 'l-22-2', url: 'https://www.amazon.com/dp/B0DFKC99VL', latestPrice: '549.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.amazon },
    ],
  },
  'intel-core-ultra-7-265kf': {
    id: 'p-23',
    name: 'Intel Core Ultra 7 265KF 20-Core Arrow Lake Desktop Processor',
    brand: 'Intel',
    model: 'Core Ultra 7 265KF',
    slug: 'intel-core-ultra-7-265kf',
    imageUrl: 'https://m.media-amazon.com/images/I/513c8GtpBBL._AC_SY300_SX300_QL70_FMwebp_.jpg',
    description: 'Intel Arrow Lake 20-core desktop processor, 8P+12E cores, up to 5.5GHz.',
    specs: { 'Cores': '20 (8P + 12E)', 'Max Turbo': '5.5 GHz', 'Socket': 'LGA1851', 'TDP': '125W' },
    category: { name: 'CPU', slug: 'cpu' },
    listings: [
      { listingId: 'l-23-1', url: 'https://www.amazon.com/dp/B0DFK2WHF8', latestPrice: '379.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.amazon },
    ],
  },
  'amd-ryzen-9-9900x': {
    id: 'p-24',
    name: 'AMD Ryzen 9 9900X Granite Ridge (Zen 5) 12-Core AM5 4.4GHz',
    brand: 'AMD',
    model: 'Ryzen 9 9900X',
    slug: 'amd-ryzen-9-9900x',
    imageUrl: 'https://c1.neweggimages.com/productimage/nb640/19-113-842-02.png',
    description: 'AMD Zen 5 architecture with 12 cores and Radeon Graphics, 120W TDP.',
    specs: { 'Cores': '12', 'Threads': '24', 'Base Clock': '4.4 GHz', 'Socket': 'AM5', 'TDP': '120W', 'Architecture': 'Zen 5' },
    category: { name: 'CPU', slug: 'cpu' },
    listings: [
      { listingId: 'l-24-1', url: 'https://www.newegg.com/p/N82E16819113842', latestPrice: '399.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.newegg },
    ],
  },
  'amd-ryzen-5-5600': {
    id: 'p-25',
    name: 'AMD Ryzen 5 5600 Vermeer (Zen 3) 6-Core 3.5GHz Socket AM4',
    brand: 'AMD',
    model: 'Ryzen 5 5600',
    slug: 'amd-ryzen-5-5600',
    imageUrl: 'https://c1.neweggimages.com/productimage/nb640/19-113-736-V03.jpg',
    description: 'Zen 3 architecture 6-core processor with great single-threaded performance, AM4 socket.',
    specs: { 'Cores': '6', 'Threads': '12', 'Base Clock': '3.5 GHz', 'Socket': 'AM4', 'TDP': '65W', 'Architecture': 'Zen 3' },
    category: { name: 'CPU', slug: 'cpu' },
    listings: [
      { listingId: 'l-25-1', url: 'https://www.newegg.com/p/N82E16819113736', latestPrice: '109.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.newegg },
    ],
  },
  'intel-i5-12600kf': {
    id: 'p-26',
    name: 'Intel Core i5-12600KF Alder Lake 10-Core 3.7GHz LGA1700',
    brand: 'Intel',
    model: 'Core i5-12600KF',
    slug: 'intel-i5-12600kf',
    imageUrl: 'https://c1.neweggimages.com/productimage/nb640/19-118-349-05.jpg',
    description: 'Alder Lake 10-core (6P+4E), LGA 1700, 125W desktop processor.',
    specs: { 'Cores': '10 (6P + 4E)', 'Threads': '16', 'Base Clock': '3.7 GHz', 'Socket': 'LGA1700', 'TDP': '125W' },
    category: { name: 'CPU', slug: 'cpu' },
    listings: [
      { listingId: 'l-26-1', url: 'https://www.newegg.com/p/N82E16819118349', latestPrice: '149.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.newegg },
    ],
  },
  'amd-ryzen-5-5500': {
    id: 'p-27',
    name: 'AMD Ryzen 5 5500 Cezanne (Zen 3) 6-Core 3.6GHz Socket AM4',
    brand: 'AMD',
    model: 'Ryzen 5 5500',
    slug: 'amd-ryzen-5-5500',
    imageUrl: 'https://c1.neweggimages.com/productimage/nb640/19-113-737-V03.jpg',
    description: 'Cezanne Zen 3 budget 6-core processor, AM4 socket, 65W TDP.',
    specs: { 'Cores': '6', 'Threads': '12', 'Base Clock': '3.6 GHz', 'Socket': 'AM4', 'TDP': '65W', 'Architecture': 'Zen 3' },
    category: { name: 'CPU', slug: 'cpu' },
    listings: [
      { listingId: 'l-27-1', url: 'https://www.newegg.com/p/N82E16819113737', latestPrice: '89.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.newegg },
    ],
  },
  'intel-core-ultra-9-285k-amazon': {
    id: 'p-28',
    name: 'Intel Core Ultra 9 285K 24-Core Desktop Processor',
    brand: 'Intel',
    model: 'Core Ultra 9 285K',
    slug: 'intel-core-ultra-9-285k-amazon',
    imageUrl: 'https://m.media-amazon.com/images/I/51xxm7JkJ6L._AC_SY300_SX300_QL70_FMwebp_.jpg',
    description: 'Intel flagship Arrow Lake processor with 24 cores, up to 5.7GHz unlocked, 40MB cache.',
    specs: { 'Cores': '24 (8P + 16E)', 'Threads': '24', 'Max Turbo': '5.7 GHz', 'Socket': 'LGA1851', 'TDP': '125W', 'Cache': '40MB' },
    category: { name: 'CPU', slug: 'cpu' },
    listings: [
      { listingId: 'l-28-1', url: 'https://www.amazon.com/dp/B0DFKC99VL', latestPrice: '549.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.amazon },
    ],
  },

  // ── RAM details ─────────────────────────────────────────────────────────────
  'corsair-vengeance-ddr5-6000-32gb': {
    id: 'p-08',
    name: 'Corsair Vengeance DDR5-6000 32GB (2x16GB) CL30 Desktop Memory',
    brand: 'Corsair',
    model: 'CMK32GX5M2B6000C30',
    slug: 'corsair-vengeance-ddr5-6000-32gb',
    imageUrl: 'https://c1.neweggimages.com/productimage/nb640/20-236-941-08.jpg',
    description: 'High-performance DDR5 kit tuned for Intel and AMD platforms. XMP 3.0 / EXPO compatible.',
    specs: { 'Type': 'DDR5', 'Capacity': '32GB (2x16GB)', 'Speed': 'DDR5-6000', 'Timings': 'CL30-36-36-76', 'Voltage': '1.35V' },
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
    imageUrl: 'https://m.media-amazon.com/images/I/618SEnJR1nL._AC_SX300_SY300_QL70_FMwebp_.jpg',
    description: 'G.Skill flagship DDR5 kit with RGB lighting, 64GB total capacity.',
    specs: { 'Type': 'DDR5', 'Capacity': '64GB (2x32GB)', 'Speed': 'DDR5-6400', 'Timings': 'CL32-39-39-102', 'Voltage': '1.4V' },
    category: { name: 'RAM', slug: 'ram' },
    listings: [
      { listingId: 'l-09-1', url: '#', latestPrice: '164.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.newegg },
      { listingId: 'l-09-2', url: '#', latestPrice: '169.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.amazon },
    ],
  },
  'corsair-vengeance-rgb-ddr5-6400-32gb': {
    id: 'p-29',
    name: 'CORSAIR VENGEANCE RGB DDR5 32GB (2x16GB) 6400MHz CL36',
    brand: 'Corsair',
    model: 'CMH32GX5M2B6400C36',
    slug: 'corsair-vengeance-rgb-ddr5-6400-32gb',
    imageUrl: 'https://m.media-amazon.com/images/I/61D2DDpDITL._AC_SX300_SY300_QL70_FMwebp_.jpg',
    description: 'Corsair Vengeance RGB DDR5 with Intel XMP 3.0, 6400MHz CL36.',
    specs: { 'Type': 'DDR5', 'Capacity': '32GB (2x16GB)', 'Speed': 'DDR5-6400', 'Timings': 'CL36-48-48-104', 'Voltage': '1.35V' },
    category: { name: 'RAM', slug: 'ram' },
    listings: [
      { listingId: 'l-29-1', url: 'https://www.amazon.com/dp/B0BXHC74WD', latestPrice: '109.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.amazon },
    ],
  },
  'corsair-vengeance-ddr5-6000-32gb-nw': {
    id: 'p-30',
    name: 'CORSAIR Vengeance 32GB (2x16GB) DDR5 6000 Desktop Memory',
    brand: 'Corsair',
    model: 'CMK32GX5M2F6000Z36',
    slug: 'corsair-vengeance-ddr5-6000-32gb-nw',
    imageUrl: 'https://c1.neweggimages.com/productimage/nb640/20-236-941-08.jpg',
    description: 'Corsair Vengeance DDR5-6000, low-profile heatspreader design.',
    specs: { 'Type': 'DDR5', 'Capacity': '32GB (2x16GB)', 'Speed': 'DDR5-6000' },
    category: { name: 'RAM', slug: 'ram' },
    listings: [
      { listingId: 'l-30-1', url: 'https://www.newegg.com/p/N82E16820982286', latestPrice: '79.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.newegg },
    ],
  },
  'corsair-vengeance-rgb-ddr5-6000-cl38': {
    id: 'p-31',
    name: 'CORSAIR Vengeance RGB DDR5 6000 32GB (2x16GB) CL38',
    brand: 'Corsair',
    model: 'CMH32GX5M2N6000Z30',
    slug: 'corsair-vengeance-rgb-ddr5-6000-cl38',
    imageUrl: 'https://c1.neweggimages.com/productimage/nb640/20-982-198-04.png',
    description: 'Corsair Vengeance RGB DDR5-6000 with dynamic RGB lighting.',
    specs: { 'Type': 'DDR5', 'Capacity': '32GB (2x16GB)', 'Speed': 'DDR5-6000', 'Timings': 'CL38' },
    category: { name: 'RAM', slug: 'ram' },
    listings: [
      { listingId: 'l-31-1', url: 'https://www.newegg.com/p/N82E16820982184', latestPrice: '94.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.newegg },
    ],
  },
  'corsair-vengeance-rgb-ddr5-6000-cl30': {
    id: 'p-32',
    name: 'CORSAIR Vengeance RGB DDR5 6000 32GB CL30 Black',
    brand: 'Corsair',
    model: 'CMH32GX5M2B6000C38',
    slug: 'corsair-vengeance-rgb-ddr5-6000-cl30',
    imageUrl: 'https://c1.neweggimages.com/productimage/nb640/20-236-879-03.jpg',
    description: 'Corsair Vengeance RGB DDR5-6000 CL30 in black.',
    specs: { 'Type': 'DDR5', 'Capacity': '32GB (2x16GB)', 'Speed': 'DDR5-6000', 'Timings': 'CL30' },
    category: { name: 'RAM', slug: 'ram' },
    listings: [
      { listingId: 'l-32-1', url: 'https://www.newegg.com/p/N82E16820982128', latestPrice: '89.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.newegg },
    ],
  },
  'gskill-ripjawsv-ddr4-3200-32gb': {
    id: 'p-33',
    name: 'G.SKILL RipjawsV DDR4 32GB (2x16GB) 3200MT/s CL16',
    brand: 'G.Skill',
    model: 'F4-3200C16D-32GVK',
    slug: 'gskill-ripjawsv-ddr4-3200-32gb',
    imageUrl: 'https://m.media-amazon.com/images/I/618SEnJR1nL._AC_SX300_SY300_QL70_FMwebp_.jpg',
    description: 'G.SKILL RipjawsV DDR4 kit, Intel/AMD compatible, U-DIMM.',
    specs: { 'Type': 'DDR4', 'Capacity': '32GB (2x16GB)', 'Speed': 'DDR4-3200', 'Timings': 'CL16-18-18-38', 'Voltage': '1.35V' },
    category: { name: 'RAM', slug: 'ram' },
    listings: [
      { listingId: 'l-33-1', url: 'https://www.amazon.com/dp/B0171GQR0C', latestPrice: '49.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.amazon },
    ],
  },
  'corsair-vengeance-lpx-ddr4-3200-16gb': {
    id: 'p-34',
    name: 'CORSAIR Vengeance LPX 16GB (2x8GB) DDR4 3200 Desktop Memory',
    brand: 'Corsair',
    model: 'CMK16GX4M2E3200C16',
    slug: 'corsair-vengeance-lpx-ddr4-3200-16gb',
    imageUrl: 'https://c1.neweggimages.com/productimage/nb640/20-236-540-S01.jpg',
    description: 'Corsair Vengeance LPX DDR4-3200, low-profile for compact builds.',
    specs: { 'Type': 'DDR4', 'Capacity': '16GB (2x8GB)', 'Speed': 'DDR4-3200' },
    category: { name: 'RAM', slug: 'ram' },
    listings: [
      { listingId: 'l-34-1', url: 'https://www.newegg.com/p/N82E16820236540', latestPrice: '34.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.newegg },
    ],
  },
  'gskill-ripjaws-v-ddr4-3200-32gb': {
    id: 'p-35',
    name: 'G.SKILL Ripjaws V 32GB (2x16GB) DDR4 3200 Desktop Memory',
    brand: 'G.Skill',
    model: 'F4-3200C16D-32GVK',
    slug: 'gskill-ripjaws-v-ddr4-3200-32gb',
    imageUrl: 'https://c1.neweggimages.com/productimage/nb640/20-232-091-08.jpg',
    description: 'G.SKILL Ripjaws V DDR4-3200 32GB kit from Newegg.',
    specs: { 'Type': 'DDR4', 'Capacity': '32GB (2x16GB)', 'Speed': 'DDR4-3200' },
    category: { name: 'RAM', slug: 'ram' },
    listings: [
      { listingId: 'l-35-1', url: 'https://www.newegg.com/p/N82E16820232091', latestPrice: '47.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.newegg },
    ],
  },
  'corsair-vengeance-ddr5-6400-32gb-gray': {
    id: 'p-36',
    name: 'CORSAIR Vengeance DDR5 32GB (2x16GB) 6400MHz CL36 Gray',
    brand: 'Corsair',
    model: 'CMK32GX5M2B6400Z36',
    slug: 'corsair-vengeance-ddr5-6400-32gb-gray',
    imageUrl: 'https://m.media-amazon.com/images/I/718+JX81H6L._AC_SY300_SX300_QL70_FMwebp_.jpg',
    description: 'Corsair Vengeance DDR5-6400 in Gray, AMD EXPO and Intel XMP 3.0.',
    specs: { 'Type': 'DDR5', 'Capacity': '32GB (2x16GB)', 'Speed': 'DDR5-6400', 'Timings': 'CL36-48-48-104', 'Voltage': '1.35V' },
    category: { name: 'RAM', slug: 'ram' },
    listings: [
      { listingId: 'l-36-1', url: 'https://www.amazon.com/dp/B0DJW4PKY3', latestPrice: '104.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.amazon },
    ],
  },

  // ── SSD details ─────────────────────────────────────────────────────────────
  'samsung-990-pro-2tb': {
    id: 'p-10',
    name: 'Samsung 990 Pro 2TB NVMe M.2 PCIe 4.0 SSD 7450MB/s',
    brand: 'Samsung',
    model: 'MZ-V9P2T0B/AM',
    slug: 'samsung-990-pro-2tb',
    imageUrl: 'https://m.media-amazon.com/images/I/61ZL9Qpo1-L._AC_SY300_SX300_QL70_FMwebp_.jpg',
    description: "Samsung's fastest consumer NVMe SSD with sequential reads up to 7450MB/s.",
    specs: { 'Interface': 'PCIe 4.0 x4, NVMe 2.0', 'Capacity': '2TB', 'Seq. Read': '7450 MB/s', 'Seq. Write': '6900 MB/s' },
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
    imageUrl: 'https://m.media-amazon.com/images/I/61MMxdpiUEL._AC_SY300_SX300_QL70_FMwebp_.jpg',
    description: "WD's top gaming SSD with 7300MB/s sequential reads.",
    specs: { 'Interface': 'PCIe 4.0 x4, NVMe 1.4', 'Capacity': '1TB', 'Seq. Read': '7300 MB/s', 'Seq. Write': '6300 MB/s' },
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
    imageUrl: 'https://m.media-amazon.com/images/I/51WMvihHRvL._AC_SY300_SX300_QL70_FMwebp_.jpg',
    description: "Crucial's PCIe 5.0 flagship — 12400MB/s sequential reads, 4TB capacity.",
    specs: { 'Interface': 'PCIe 5.0 x4, NVMe 2.0', 'Capacity': '4TB', 'Seq. Read': '12400 MB/s', 'Seq. Write': '11800 MB/s' },
    category: { name: 'SSD', slug: 'ssd' },
    listings: [
      { listingId: 'l-12-1', url: '#', latestPrice: '269.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.newegg },
      { listingId: 'l-12-2', url: '#', latestPrice: '279.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.amazon },
    ],
  },
  'samsung-990-pro-1tb': {
    id: 'p-37',
    name: 'Samsung 990 PRO SSD 1TB PCIe 4.0 M.2 NVMe 7450MB/s',
    brand: 'Samsung',
    model: 'MZ-V9P1T0B/AM',
    slug: 'samsung-990-pro-1tb',
    imageUrl: 'https://m.media-amazon.com/images/I/61ZL9Qpo1-L._AC_SY300_SX300_QL70_FMwebp_.jpg',
    description: 'Samsung 990 PRO 1TB for high-end computing and gaming workstations.',
    specs: { 'Interface': 'PCIe 4.0 x4', 'Capacity': '1TB', 'Seq. Read': '7450 MB/s' },
    category: { name: 'SSD', slug: 'ssd' },
    listings: [
      { listingId: 'l-37-1', url: 'https://www.amazon.com/dp/B0BHJF2VRN', latestPrice: '89.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.amazon },
    ],
  },
  'crucial-t710-2tb': {
    id: 'p-38',
    name: 'Crucial T710 PCIe Gen5 NVMe 2TB SSD Up to 14900MB/s',
    brand: 'Crucial',
    model: 'CT2000T710SSD8-01',
    slug: 'crucial-t710-2tb',
    imageUrl: 'https://m.media-amazon.com/images/I/51WMvihHRvL._AC_SY300_SX300_QL70_FMwebp_.jpg',
    description: 'Crucial T710 PCIe Gen5 with up to 14,900 MB/s, for creatives and hardcore gamers.',
    specs: { 'Interface': 'PCIe 5.0 x4', 'Capacity': '2TB', 'Seq. Read': '14900 MB/s' },
    category: { name: 'SSD', slug: 'ssd' },
    listings: [
      { listingId: 'l-38-1', url: 'https://www.amazon.com/dp/B0F9XMYR15', latestPrice: '249.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.amazon },
    ],
  },
  'kingston-nv3-1tb': {
    id: 'p-39',
    name: 'Kingston NV3 1TB M.2 2280 NVMe SSD PCIe 4.0 6000MB/s',
    brand: 'Kingston',
    model: 'SNV3S/1000G',
    slug: 'kingston-nv3-1tb',
    imageUrl: 'https://m.media-amazon.com/images/I/71c5uuoM1bL._AC_SX300_SY300_QL70_FMwebp_.jpg',
    description: 'Kingston NV3 budget NVMe SSD, PCIe 4.0, up to 6000 MB/s.',
    specs: { 'Interface': 'PCIe 4.0 Gen 4x4', 'Capacity': '1TB', 'Seq. Read': '6000 MB/s' },
    category: { name: 'SSD', slug: 'ssd' },
    listings: [
      { listingId: 'l-39-1', url: 'https://www.amazon.com/dp/B0DBR3DZWG', latestPrice: '59.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.amazon },
    ],
  },
  'crucial-p310-1tb': {
    id: 'p-40',
    name: 'Crucial P310 1TB M.2 2280 PCIe 4.0 NVMe 7100MB/s',
    brand: 'Crucial',
    model: 'CT1000P310SSD8',
    slug: 'crucial-p310-1tb',
    imageUrl: 'https://c1.neweggimages.com/productimage/nb640/20-156-411-01.jpg',
    description: 'Crucial P310 3D NAND NVMe SSD, up to 7100 MB/s.',
    specs: { 'Interface': 'PCIe 4.0 x4', 'Capacity': '1TB', 'Seq. Read': '7100 MB/s' },
    category: { name: 'SSD', slug: 'ssd' },
    listings: [
      { listingId: 'l-40-1', url: 'https://www.newegg.com/p/N82E16820156412', latestPrice: '64.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.newegg },
    ],
  },
  'samsung-870-evo-4tb': {
    id: 'p-41',
    name: 'SAMSUNG 870 EVO 4TB 2.5" SATA III Internal SSD',
    brand: 'Samsung',
    model: 'MZ-77E4T0B/AM',
    slug: 'samsung-870-evo-4tb',
    imageUrl: 'https://c1.neweggimages.com/productimage/nb640/20-147-795-V01.jpg',
    description: 'Samsung 870 EVO SATA SSD with massive 4TB capacity.',
    specs: { 'Interface': 'SATA III 6 Gb/s', 'Form Factor': '2.5"', 'Capacity': '4TB', 'Seq. Read': '560 MB/s' },
    category: { name: 'SSD', slug: 'ssd' },
    listings: [
      { listingId: 'l-41-1', url: 'https://www.newegg.com/p/N82E16820147795', latestPrice: '199.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.newegg },
    ],
  },
  'crucial-bx500-2tb': {
    id: 'p-42',
    name: 'Crucial BX500 2TB 3D NAND SATA 2.5" Internal SSD 540MB/s',
    brand: 'Crucial',
    model: 'CT2000BX500SSD1',
    slug: 'crucial-bx500-2tb',
    imageUrl: 'https://c1.neweggimages.com/productimage/nb640/20-156-232-01.jpg',
    description: 'Crucial BX500 budget SATA SSD, 3D NAND, 2TB capacity.',
    specs: { 'Interface': 'SATA III 6 Gb/s', 'Form Factor': '2.5"', 'Capacity': '2TB', 'Seq. Read': '540 MB/s' },
    category: { name: 'SSD', slug: 'ssd' },
    listings: [
      { listingId: 'l-42-1', url: 'https://www.newegg.com/p/N82E16820156232', latestPrice: '99.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.newegg },
    ],
  },
  'wd-green-480gb': {
    id: 'p-43',
    name: 'Western Digital 480GB WD Green Internal SSD SATA III',
    brand: 'Western Digital',
    model: 'WDS480G3G0A',
    slug: 'wd-green-480gb',
    imageUrl: 'https://m.media-amazon.com/images/I/61MMxdpiUEL._AC_SY300_SX300_QL70_FMwebp_.jpg',
    description: 'WD Green budget SATA SSD, 2.5"/7mm, up to 545 MB/s.',
    specs: { 'Interface': 'SATA III 6 Gb/s', 'Form Factor': '2.5"', 'Capacity': '480GB', 'Seq. Read': '545 MB/s' },
    category: { name: 'SSD', slug: 'ssd' },
    listings: [
      { listingId: 'l-43-1', url: 'https://www.amazon.com/dp/B09TN1VKZL', latestPrice: '34.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.amazon },
    ],
  },
  'samsung-990-evo-plus-4tb': {
    id: 'p-44',
    name: 'SAMSUNG 990 EVO PLUS 4TB PCIe Gen4x4 / Gen5x2 M.2 7250MB/s',
    brand: 'Samsung',
    model: 'MZ-V9S4T0B/AM',
    slug: 'samsung-990-evo-plus-4tb',
    imageUrl: 'https://c1.neweggimages.com/productimage/nb640/20-147-901-02.jpg',
    description: 'Samsung 990 EVO Plus with HMB Technology and Intelligent TurboWrite 2.0.',
    specs: { 'Interface': 'PCIe Gen4x4 / Gen5x2', 'Capacity': '4TB', 'Seq. Read': '7250 MB/s' },
    category: { name: 'SSD', slug: 'ssd' },
    listings: [
      { listingId: 'l-44-1', url: 'https://www.newegg.com/p/N82E16820147901', latestPrice: '229.99', latestCurrency: 'USD', latestOriginalPrice: null, inStock: true, store: STORES.newegg },
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
    filtered = filtered.filter((p) => p.minPrice && parseFloat(p.minPrice) >= min);
  }
  if (params.maxPrice) {
    const max = parseFloat(params.maxPrice);
    filtered = filtered.filter((p) => p.minPrice && parseFloat(p.minPrice) <= max);
  }

  const total = filtered.length;
  const pageNum = parseInt(params.page) || 1;
  const totalPages = Math.max(1, Math.ceil(total / params.limit));
  const start = (pageNum - 1) * params.limit;
  const data = filtered.slice(start, start + params.limit);

  return { data, meta: { total, page: pageNum, totalPages } };
}
