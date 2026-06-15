export interface ProductImage {
  url: string;
  alt: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  manufacturer: string;
  productTypeName: string;
  modelName: string;
  modelNumber: string;
  taxSlab: string;
  status: 'active' | 'inactive' | 'discontinued';
  uom: string;
  hsnCode: string;
  unitPrice: number;
  mrp: number;
  stockQty: number;
  shipMode: string;
  weight?: string;
  dimensions?: string;
  description?: string;
  isCombo: boolean;
  images: ProductImage[];
  createdAt: string;
  updatedAt: string;
}

export const CATEGORIES = [
'Personal Care',
'Home Care',
'FMCG',
'Pharma',
'Beverages',
'Snacks & Confectionery',
'Dairy',
'Staples'];


export const BRANDS = [
'HUL',
'P&G',
'ITC',
'Dabur',
'Colgate-Palmolive',
'Reckitt',
'Tata',
'Nestle',
'Britannia',
'Amul'];


export const MANUFACTURERS = [
'Hindustan Unilever Ltd',
'Procter & Gamble India',
'ITC Limited',
'Dabur India Ltd',
'Colgate-Palmolive India',
'Reckitt Benckiser India',
'Tata Consumer Products',
'Nestle India',
'Britannia Industries',
'Amul (GCMMF)'];


export const PRODUCT_TYPES = [
'Shampoo',
'Soap',
'Detergents',
'Dishwash',
'Toothpaste',
'Disinfectant',
'Ayurvedic',
'Spices & Condiments',
'Beverages',
'Biscuits'];


export const TAX_SLABS = ['0%', '5%', '12%', '18%', '28%'];

export const SHIP_MODES = ['Surface', 'Air', 'Express', 'Cold Chain'];

const PLACEHOLDER = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=200&fit=crop';

export const mockProducts: Product[] = [
{
  id: 'p-001',
  sku: 'SKU-7730',
  name: 'Clinic Plus Shampoo 340ml',
  category: 'Personal Care',
  brand: 'HUL',
  manufacturer: 'Hindustan Unilever Ltd',
  productTypeName: 'Shampoo',
  modelName: 'Strength & Shine',
  modelNumber: 'CLP-340',
  taxSlab: '18%',
  status: 'active',
  uom: 'Btl',
  hsnCode: '33051000',
  unitPrice: 145,
  mrp: 175,
  stockQty: 240,
  shipMode: 'Surface',
  weight: '0.38 kg',
  dimensions: '6x6x18 cm',
  description: 'Clinic Plus Strength & Shine Shampoo 340ml for strong and shiny hair.',
  isCombo: false,
  images: [
  { url: "https://img.rocket.new/generatedImages/rocket_gen_img_19f4e7885-1781520232046.png", alt: 'Clinic Plus Shampoo 340ml front view' },
  { url: "https://img.rocket.new/generatedImages/rocket_gen_img_1838ec328-1781520234359.png", alt: 'Clinic Plus Shampoo 340ml back label' }],

  createdAt: '2026-01-10',
  updatedAt: '2026-05-20'
},
{
  id: 'p-002',
  sku: 'SKU-1122',
  name: 'ITC Savlon 200ml',
  category: 'Personal Care',
  brand: 'ITC',
  manufacturer: 'ITC Limited',
  productTypeName: 'Disinfectant',
  modelName: 'Antiseptic',
  modelNumber: 'SVL-200',
  taxSlab: '12%',
  status: 'inactive',
  uom: 'Btl',
  hsnCode: '30049099',
  unitPrice: 88,
  mrp: 110,
  stockQty: 0,
  shipMode: 'Surface',
  weight: '0.22 kg',
  dimensions: '5x5x14 cm',
  description: 'Savlon antiseptic liquid 200ml for wound care and disinfection.',
  isCombo: false,
  images: [
  { url: "https://images.unsplash.com/photo-1586021000708-c31dc9ad7bb5", alt: 'ITC Savlon antiseptic liquid 200ml bottle' }],

  createdAt: '2026-01-15',
  updatedAt: '2026-04-10'
},
{
  id: 'p-003',
  sku: 'SKU-9104',
  name: 'Vim Bar 200g x6',
  category: 'Home Care',
  brand: 'HUL',
  manufacturer: 'Hindustan Unilever Ltd',
  productTypeName: 'Dishwash',
  modelName: 'Bar Soap',
  modelNumber: 'VIM-200B',
  taxSlab: '18%',
  status: 'active',
  uom: 'Pack',
  hsnCode: '34011900',
  unitPrice: 72,
  mrp: 90,
  stockQty: 560,
  shipMode: 'Surface',
  weight: '1.3 kg',
  dimensions: '20x10x8 cm',
  description: 'Vim dishwash bar 200g pack of 6 for tough grease removal.',
  isCombo: true,
  images: [
  { url: "https://img.rocket.new/generatedImages/rocket_gen_img_18b29fd45-1766903134981.png", alt: 'Vim dishwash bar 200g pack of 6' }],

  createdAt: '2026-01-20',
  updatedAt: '2026-05-15'
},
{
  id: 'p-004',
  sku: 'SKU-8840',
  name: 'Dabur Chyawanprash 1kg',
  category: 'Pharma',
  brand: 'Dabur',
  manufacturer: 'Dabur India Ltd',
  productTypeName: 'Ayurvedic',
  modelName: 'Classic',
  modelNumber: 'DBR-1KG',
  taxSlab: '5%',
  status: 'active',
  uom: 'Jar',
  hsnCode: '21069099',
  unitPrice: 265,
  mrp: 320,
  stockQty: 180,
  shipMode: 'Surface',
  weight: '1.1 kg',
  dimensions: '12x12x14 cm',
  description: 'Dabur Chyawanprash 1kg classic formulation for immunity boost.',
  isCombo: false,
  images: [
  { url: "https://img.rocket.new/generatedImages/rocket_gen_img_13c401398-1780217670185.png", alt: 'Dabur Chyawanprash 1kg jar classic formulation' }],

  createdAt: '2026-02-01',
  updatedAt: '2026-05-18'
},
{
  id: 'p-005',
  sku: 'SKU-7612',
  name: 'Colgate 200g Twin Pack',
  category: 'Personal Care',
  brand: 'Colgate-Palmolive',
  manufacturer: 'Colgate-Palmolive India',
  productTypeName: 'Toothpaste',
  modelName: 'Strong Teeth',
  modelNumber: 'CLG-200T',
  taxSlab: '12%',
  status: 'active',
  uom: 'Pack',
  hsnCode: '33061000',
  unitPrice: 95,
  mrp: 120,
  stockQty: 420,
  shipMode: 'Surface',
  weight: '0.45 kg',
  dimensions: '15x8x5 cm',
  description: 'Colgate Strong Teeth toothpaste 200g twin pack for cavity protection.',
  isCombo: true,
  images: [
  { url: "https://img.rocket.new/generatedImages/rocket_gen_img_1c47941a0-1774030800426.png", alt: 'Colgate Strong Teeth toothpaste 200g twin pack' }],

  createdAt: '2026-02-10',
  updatedAt: '2026-05-20'
},
{
  id: 'p-006',
  sku: 'SKU-5567',
  name: 'Dettol Antiseptic 500ml',
  category: 'Personal Care',
  brand: 'Reckitt',
  manufacturer: 'Reckitt Benckiser India',
  productTypeName: 'Disinfectant',
  modelName: 'Original',
  modelNumber: 'DTL-500',
  taxSlab: '12%',
  status: 'active',
  uom: 'Btl',
  hsnCode: '30049099',
  unitPrice: 185,
  mrp: 230,
  stockQty: 310,
  shipMode: 'Surface',
  weight: '0.55 kg',
  dimensions: '7x7x20 cm',
  description: 'Dettol Original antiseptic liquid 500ml for multi-purpose disinfection.',
  isCombo: false,
  images: [
  { url: "https://img.rocket.new/generatedImages/rocket_gen_img_1bd8e5583-1765104398811.png", alt: 'Dettol antiseptic liquid 500ml original bottle' }],

  createdAt: '2026-02-15',
  updatedAt: '2026-05-10'
},
{
  id: 'p-007',
  sku: 'SKU-2934',
  name: 'Ariel Powder 3kg',
  category: 'Home Care',
  brand: 'P&G',
  manufacturer: 'Procter & Gamble India',
  productTypeName: 'Detergents',
  modelName: 'Matic',
  modelNumber: 'ARL-3KG',
  taxSlab: '18%',
  status: 'active',
  uom: 'Pkt',
  hsnCode: '34022090',
  unitPrice: 340,
  mrp: 420,
  stockQty: 195,
  shipMode: 'Surface',
  weight: '3.1 kg',
  dimensions: '25x15x10 cm',
  description: 'Ariel Matic front load detergent powder 3kg for superior clean.',
  isCombo: true,
  images: [
  { url: "https://img.rocket.new/generatedImages/rocket_gen_img_1a1c4e9e4-1773715682031.png", alt: 'Ariel Matic detergent powder 3kg pack' }],

  createdAt: '2026-02-20',
  updatedAt: '2026-05-22'
},
{
  id: 'p-008',
  sku: 'SKU-3380',
  name: 'Lifebuoy Bar Soap 100g x4',
  category: 'Personal Care',
  brand: 'HUL',
  manufacturer: 'Hindustan Unilever Ltd',
  productTypeName: 'Soap',
  modelName: 'Total Protection',
  modelNumber: 'LFB-100X4',
  taxSlab: '12%',
  status: 'active',
  uom: 'Pack',
  hsnCode: '34011100',
  unitPrice: 68,
  mrp: 84,
  stockQty: 780,
  shipMode: 'Surface',
  weight: '0.45 kg',
  dimensions: '18x10x5 cm',
  description: 'Lifebuoy Total Protection bar soap 100g pack of 4 for germ protection.',
  isCombo: true,
  images: [
  { url: "https://img.rocket.new/generatedImages/rocket_gen_img_1033d5527-1775543414298.png", alt: 'Lifebuoy Total Protection bar soap 100g pack of 4' }],

  createdAt: '2026-03-01',
  updatedAt: '2026-05-20'
},
{
  id: 'p-009',
  sku: 'SKU-3301',
  name: 'Surf Excel 2kg',
  category: 'Home Care',
  brand: 'HUL',
  manufacturer: 'Hindustan Unilever Ltd',
  productTypeName: 'Detergents',
  modelName: 'Quick Wash',
  modelNumber: 'SRF-2KG',
  taxSlab: '18%',
  status: 'active',
  uom: 'Pkt',
  hsnCode: '34022090',
  unitPrice: 210,
  mrp: 260,
  stockQty: 340,
  shipMode: 'Surface',
  weight: '2.1 kg',
  dimensions: '22x14x8 cm',
  description: 'Surf Excel Quick Wash detergent powder 2kg for quick and easy washing.',
  isCombo: false,
  images: [
  { url: "https://img.rocket.new/generatedImages/rocket_gen_img_1bd9cc5cb-1773399883712.png", alt: 'Surf Excel Quick Wash detergent powder 2kg pack' }],

  createdAt: '2026-03-05',
  updatedAt: '2026-05-18'
},
{
  id: 'p-010',
  sku: 'SKU-4821',
  name: 'Tata Salt 1kg',
  category: 'FMCG',
  brand: 'Tata',
  manufacturer: 'Tata Consumer Products',
  productTypeName: 'Spices & Condiments',
  modelName: 'Premium Grade',
  modelNumber: 'TSG-001',
  taxSlab: '0%',
  status: 'active',
  uom: 'Pkt',
  hsnCode: '25010010',
  unitPrice: 20,
  mrp: 24,
  stockQty: 1200,
  shipMode: 'Surface',
  weight: '1.05 kg',
  dimensions: '10x6x4 cm',
  description: 'Tata Salt premium grade iodized salt 1kg for daily cooking.',
  isCombo: false,
  images: [
  { url: "https://img.rocket.new/generatedImages/rocket_gen_img_15808aabb-1778230571189.png", alt: 'Tata Salt premium grade iodized salt 1kg pack' }],

  createdAt: '2026-03-10',
  updatedAt: '2026-05-15'
},
{
  id: 'p-011',
  sku: 'SKU-6612',
  name: 'Nestle KitKat 4F 41.5g',
  category: 'Snacks & Confectionery',
  brand: 'Nestle',
  manufacturer: 'Nestle India',
  productTypeName: 'Biscuits',
  modelName: 'Classic',
  modelNumber: 'KTK-4F',
  taxSlab: '18%',
  status: 'active',
  uom: 'Pcs',
  hsnCode: '18062000',
  unitPrice: 28,
  mrp: 35,
  stockQty: 2400,
  shipMode: 'Surface',
  weight: '0.05 kg',
  dimensions: '12x3x2 cm',
  description: 'Nestle KitKat 4 finger chocolate wafer bar 41.5g.',
  isCombo: false,
  images: [
  { url: "https://img.rocket.new/generatedImages/rocket_gen_img_1ec3f726c-1773089088185.png", alt: 'Nestle KitKat 4 finger chocolate wafer bar 41.5g' }],

  createdAt: '2026-03-15',
  updatedAt: '2026-05-20'
},
{
  id: 'p-012',
  sku: 'SKU-9921',
  name: 'Amul Butter 500g',
  category: 'Dairy',
  brand: 'Amul',
  manufacturer: 'Amul (GCMMF)',
  productTypeName: 'Beverages',
  modelName: 'Pasteurised',
  modelNumber: 'AMB-500',
  taxSlab: '5%',
  status: 'discontinued',
  uom: 'Pkt',
  hsnCode: '04051000',
  unitPrice: 220,
  mrp: 270,
  stockQty: 0,
  shipMode: 'Cold Chain',
  weight: '0.52 kg',
  dimensions: '12x8x4 cm',
  description: 'Amul pasteurised butter 500g for cooking and spreading.',
  isCombo: false,
  images: [
  { url: "https://img.rocket.new/generatedImages/rocket_gen_img_1482f0228-1774030802433.png", alt: 'Amul pasteurised butter 500g pack' }],

  createdAt: '2026-03-20',
  updatedAt: '2026-04-30'
}];