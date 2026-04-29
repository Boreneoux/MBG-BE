import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import slugify from 'slugify';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

// Use direct connection for seed (not serverless pooler)
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

function makeSlug(name: string) {
  return slugify(name, { lower: true, strict: true });
}

async function uploadFromUrl(url: string, folder: string) {
  const result = await cloudinary.uploader.upload(url, { folder });
  return { secureUrl: result.secure_url, publicId: result.public_id };
}

// ─── Data ────────────────────────────────────────────────────────────────────

interface CategorySeed {
  name: string;
  imageUrl: string;
}

interface ProductSeed {
  name: string;
  categoryName: string;
  price: number;
  weight: number;
  images: [string, string]; // [primary, secondary]
}

const CATEGORIES: CategorySeed[] = [
  {
    name: 'Buah & Sayur',
    imageUrl: 'https://www.lalpathlabs.com/blog/wp-content/uploads/2019/01/Fruits-and-Vegetables.jpg',
  },
  {
    name: 'Susu & Telur',
    imageUrl: 'https://img.magnific.com/premium-photo/fresh-milk-eggs-packaged-white-background-culinary-use-generative-ai_437323-52891.jpg?semt=ais_hybrid&w=740&q=80',
  },
  {
    name: 'Daging & Seafood',
    imageUrl: 'https://www.letsorganic.com/cdn/shop/collections/meat_and_seafood.png?v=1760085856',
  },
  {
    name: 'Roti & Kue',
    imageUrl: 'https://idb.gov.lk/training/wp-content/uploads/2023/01/Manufacture-of-Bakery-Products.jpg',
  },
  {
    name: 'Dapur & Bumbu',
    imageUrl: 'https://shop.jasatani.com/wp-content/uploads/2024/08/Paket-Bundle-Sembako-Lengkap-B-2-Bulan.jpg',
  },
  {
    name: 'Minuman',
    imageUrl: 'https://png.klev.club/uploads/posts/2024-03/thumbs/png-klev-club-p-napitki-png-3.png',
  },
];

const PRODUCTS: ProductSeed[] = [
  // ── Buah & Sayur ──────────────────────────────────────────────────────────
  {
    name: 'Apel Fuji Alfa 1 kg',
    categoryName: 'Buah & Sayur',
    price: 28000,
    weight: 1.0,
    images: [
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full/catalog-image/MTA-177766179/no_brand_apel_fuji_alfa_full01_fq02ogn3.webp',
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full/catalog-image/114/MTA-177766179/no-brand_apel-fuji-alfa_full01.jpg',
    ],
  },
  {
    name: 'Sweet Pear 500 gr',
    categoryName: 'Buah & Sayur',
    price: 22000,
    weight: 0.5,
    images: [
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//95/MTA-21935920/farmers-market_pear-fantasi-sweet-pear-350gr_full01.jpg',
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//95/MTA-21935920/farmers-market_pear-fantasi-sweet-pear-350gr_full02.jpg',
    ],
  },
  {
    name: 'Buah Naga Merah Lokal 1 kg',
    categoryName: 'Buah & Sayur',
    price: 32000,
    weight: 1.0,
    images: [
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//102/MTA-21959480/farmers-market_dragon-fruit-red-lokal-500gr_full01.jpg',
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//102/MTA-21959480/farmers-market_dragon-fruit-red-lokal-500gr_full02.jpg',
    ],
  },
  {
    name: 'Jambu Batu Less Seed Sunpride 1 kg',
    categoryName: 'Buah & Sayur',
    price: 25000,
    weight: 1.0,
    images: [
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//103/MTA-21959428/farmers-market_jambu-batu-less-seed-sunpride-250gr_full01.jpg',
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//103/MTA-21959428/farmers-market_jambu-batu-less-seed-sunpride-250gr_full03.jpg',
    ],
  },
  {
    name: 'Jeruk Baby Jaffa 1 kg',
    categoryName: 'Buah & Sayur',
    price: 35000,
    weight: 1.0,
    images: [
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//110/MTA-21779768/farmers-market_jeruk-baby-jaffa-f_full01.jpg',
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//110/MTA-21779768/farmers-market_jeruk-baby-jaffa-f_full02.jpg',
    ],
  },
  {
    name: 'Apel Red Delicious Besar 500 gr',
    categoryName: 'Buah & Sayur',
    price: 32000,
    weight: 0.5,
    images: [
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//103/MTA-21935884/farmers-market_apel-red-delicious-besar-170gr_full01.jpg',
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//103/MTA-21935884/farmers-market_apel-red-delicious-besar-170gr_full03.jpg',
    ],
  },
  {
    name: 'Jeruk Valencia Africa 500 gr',
    categoryName: 'Buah & Sayur',
    price: 20000,
    weight: 0.5,
    images: [
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//109/MTA-21935899/farmers-market_jeruk-valencia-africa-300gr_full01.jpg',
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//109/MTA-21935899/farmers-market_jeruk-valencia-africa-300gr_full03.jpg',
    ],
  },
  {
    name: 'Blueberry Import Jumbo 250 gr',
    categoryName: 'Buah & Sayur',
    price: 75000,
    weight: 0.25,
    images: [
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full/catalog-image/MTA-177766240/no_brand_blueberry_import_jumbo_full01_v8lzmxsi.jpg',
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full/catalog-image/104/MTA-177766240/no-brand_blueberry-import-jumbo_full01.jpg',
    ],
  },
  {
    name: 'Strawberry Korea 250 gr',
    categoryName: 'Buah & Sayur',
    price: 65000,
    weight: 0.25,
    images: [
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full/catalog-image/MTA-77355637/no_brand_strawberry_korea_250gr_full01_rvajn5u9.webp',
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//catalog-image/106/MTA-77355637/_no-brand_strawberry-korea-250gr_full01.jpg',
    ],
  },
  {
    name: 'Pisang Cavendish Single Sunpride 1 kg',
    categoryName: 'Buah & Sayur',
    price: 22000,
    weight: 1.0,
    images: [
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//101/MTA-21779830/sunpride_pisang-cavendise-single-sunpride-1kg_full01.jpg',
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//101/MTA-21779830/sunpride_pisang-cavendise-single-sunpride-1kg_full02.jpg',
    ],
  },
  {
    name: 'Brokoli 500 gr',
    categoryName: 'Buah & Sayur',
    price: 18000,
    weight: 0.5,
    images: [
      'https://assets-cloudflare.segari-ops.id/products/10000500001_1_22082025090500.webp',
      'https://assets-cloudflare.segari-ops.id/products/10000500001_2_22082025090500.webp',
    ],
  },
  {
    name: 'Tomat Cherry 250 gr',
    categoryName: 'Buah & Sayur',
    price: 18000,
    weight: 0.25,
    images: [
      'https://assets-cloudflare.segari-ops.id/products/10003900006_1_22082025090604.webp',
      'https://assets-cloudflare.segari-ops.id/products/10003900006_2_22082025090604.webp',
    ],
  },
  {
    name: 'Wortel Brastagi 500 gr',
    categoryName: 'Buah & Sayur',
    price: 12000,
    weight: 0.5,
    images: [
      'https://assets-cloudflare.segari-ops.id/products/10004100002_1_26062024040830.webp',
      'https://assets-cloudflare.segari-ops.id/products/10004100002_2_26062024040830.webp',
    ],
  },
  {
    name: 'Terong 500 gr',
    categoryName: 'Buah & Sayur',
    price: 10000,
    weight: 0.5,
    images: [
      'https://assets-cloudflare.segari-ops.id/products/10003700002_1_22082025090555.webp',
      'https://assets-cloudflare.segari-ops.id/products/10003700002_2_22082025090555.webp',
    ],
  },
  {
    name: 'Cabai Rawit Merah 150 gr',
    categoryName: 'Buah & Sayur',
    price: 15000,
    weight: 0.15,
    images: [
      'https://assets-cloudflare.segari-ops.id/products/10000900004_1_26062024105607.webp',
      'https://assets-cloudflare.segari-ops.id/products/10000900004_2_26062024105607.webp',
    ],
  },
  {
    name: 'Sawi Hijau 250 gr',
    categoryName: 'Buah & Sayur',
    price: 8000,
    weight: 0.25,
    images: [
      'https://assets-cloudflare.segari-ops.id/products/10003300001_1_21072025040719.webp',
      'https://assets-cloudflare.segari-ops.id/products/10003300001_2_21072025040719.webp',
    ],
  },
  {
    name: 'Tauge 250 gr',
    categoryName: 'Buah & Sayur',
    price: 7000,
    weight: 0.25,
    images: [
      'https://assets-cloudflare.segari-ops.id/products/10003600001_1_22082025090554.webp',
      'https://assets-cloudflare.segari-ops.id/products/10003600001_2_22082025090554.webp',
    ],
  },
  {
    name: 'Kentang Dieng Super 1 kg',
    categoryName: 'Buah & Sayur',
    price: 18000,
    weight: 1.0,
    images: [
      'https://assets-cloudflare.segari-ops.id/products/10002300003_1_13082024081502.webp',
      'https://assets-cloudflare.segari-ops.id/products/10002300003_2_13082024081502.webp',
    ],
  },
  {
    name: 'Jamur Enoki 100 gr',
    categoryName: 'Buah & Sayur',
    price: 12000,
    weight: 0.1,
    images: [
      'https://assets-cloudflare.segari-ops.id/products/10001500001_1_20052024110614.webp',
      'https://assets-cloudflare.segari-ops.id/products/10001500001_2_20052024110614.webp',
    ],
  },
  {
    name: 'Timun Lokal Organik 500 gr',
    categoryName: 'Buah & Sayur',
    price: 9000,
    weight: 0.5,
    images: [
      'https://assets-cloudflare.segari-ops.id/products/10006300013_1_20042024014629.webp',
      'https://assets-cloudflare.segari-ops.id/products/10006300013_2_20042024014629.webp',
    ],
  },

  // ── Susu & Telur ──────────────────────────────────────────────────────────
  {
    name: 'Telur Puyuh 300 gr',
    categoryName: 'Susu & Telur',
    price: 15000,
    weight: 0.3,
    images: [
      'https://img.sayurbox.com/de301d7c007ba647df87b815ce5f21c8?tr=f-auto,w-1000',
      'https://img.sayurbox.com/bcb1c3751ca58a289699a185c2e966cd?tr=f-auto,w-1000',
    ],
  },
  {
    name: 'Telur Ayam Negeri 1 kg',
    categoryName: 'Susu & Telur',
    price: 28000,
    weight: 1.0,
    images: [
      'https://img.sayurbox.com/719ad970da792273bc24cb2bc2ebbf59?tr=f-auto,w-1000',
      'https://img.sayurbox.com/7ba7c7c20631aba24a9c22fe579ead6a?tr=f-auto,w-1000',
    ],
  },
  {
    name: 'Telur Ayam Kampung 1 kg',
    categoryName: 'Susu & Telur',
    price: 42000,
    weight: 1.0,
    images: [
      'https://img.sayurbox.com/b763bc040950bc71de5dacb07f696fec?tr=f-auto,w-1000',
      'https://img.sayurbox.com/c3192c8771bcf384aa57eaabcd19597d?tr=f-auto,w-1000',
    ],
  },
  {
    name: 'Ayyomi Telur Fresh Egg 650 gr',
    categoryName: 'Susu & Telur',
    price: 20000,
    weight: 0.65,
    images: [
      'https://img.sayurbox.com/fbab31c90b5d1c754dc20e8913bd155f?tr=f-auto,w-1000',
      'https://img.sayurbox.com/799bae84fd1b36d75ebc66d3220b822c?tr=f-auto,w-1000',
    ],
  },
  {
    name: 'Sunny Farm Telur Ayam Probiotik 600 gr',
    categoryName: 'Susu & Telur',
    price: 25000,
    weight: 0.6,
    images: [
      'https://img.sayurbox.com/0d9596d7864b0f0ce917fc5d0a1dd951?tr=f-auto,w-1000',
      'https://img.sayurbox.com/5b23e4166da3103c748afd19640cb13f?tr=f-auto,w-1000',
    ],
  },
  {
    name: 'Diabetasol Susu Bubuk Dewasa Vanila 570 g',
    categoryName: 'Susu & Telur',
    price: 135000,
    weight: 0.57,
    images: [
      'https://c.alfagift.id/product/4/4_A7151460000980_20241115164525014_base.jpg',
      'https://c.alfagift.id/product/4/4_A7151460000980_20241115164517132_base.jpg',
    ],
  },
  {
    name: 'Entrasol Platinum Susu Bubuk Nutrisi Dewasa Vanila 800 g',
    categoryName: 'Susu & Telur',
    price: 175000,
    weight: 0.8,
    images: [
      'https://c.alfagift.id/product/1/1_A7688180001073_20240116150054872_base.jpg',
      'https://c.alfagift.id/product/1/1_A7688180001073_20240116150101106_base.jpg',
    ],
  },
  {
    name: 'Anlene Gold 5X Susu Bubuk Dewasa Original 560 g',
    categoryName: 'Susu & Telur',
    price: 145000,
    weight: 0.56,
    images: [
      'https://c.alfagift.id/product/1/1_A13070001280_20260304164919259_base.jpg',
      'https://c.alfagift.id/product/1/1_A13070001280_20251014102635455_base.jpg',
    ],
  },
  {
    name: 'HiLo Teen Susu Protein Cokelat 250 g',
    categoryName: 'Susu & Telur',
    price: 55000,
    weight: 0.25,
    images: [
      'https://c.alfagift.id/product/1/1_A13070001397_20240223134656951_base.jpg',
      'https://c.alfagift.id/product/1/1_A13070001397_20240223134650741_base.jpg',
    ],
  },
  {
    name: 'Milo Pro Minuman Susu Bubuk Cokelat Protein 250 g',
    categoryName: 'Susu & Telur',
    price: 52000,
    weight: 0.25,
    images: [
      'https://c.alfagift.id/product/1/1_A8301930002167_20250728135740150_base.jpg',
      'https://c.alfagift.id/product/1/1_A8301930002167_20250728135742050_base.jpg',
    ],
  },
  {
    name: 'Frisian Flag Susu UHT Coconut Delight Kotak 225 ml',
    categoryName: 'Susu & Telur',
    price: 8500,
    weight: 0.225,
    images: [
      'https://c.alfagift.id/product/1/1_A13230011745_20250430150556548_base.jpg',
      'https://c.alfagift.id/product/1/1_A13230011745_20250430150558649_base.jpg',
    ],
  },
  {
    name: 'Entrasol Olive Susu Cair Steril Ekstrak Buah Zaitun Kaleng 180 ml',
    categoryName: 'Susu & Telur',
    price: 12000,
    weight: 0.18,
    images: [
      'https://c.alfagift.id/product/1/1_A8142680002167_20251117112921678_base.jpg',
      'https://c.alfagift.id/product/1/1_A8142680002167_20251117112920370_base.jpg',
    ],
  },
  {
    name: 'Ultra Milk Susu UHT Taro Kotak 200 ml',
    categoryName: 'Susu & Telur',
    price: 7000,
    weight: 0.2,
    images: [
      'https://c.alfagift.id/product/1/1_A6628980001094_20251015132703084_base.jpg',
      'https://c.alfagift.id/product/1/1_A6628980001094_20251015132701869_base.jpg',
    ],
  },
  {
    name: 'Greenfields Susu UHT Stroberi Kotak 250 ml',
    categoryName: 'Susu & Telur',
    price: 9500,
    weight: 0.25,
    images: [
      'https://c.alfagift.id/product/1/1_A7871500002167_20231117144105717_base.jpg',
      'https://c.alfagift.id/product/1/1_A7871500002167_20231117144100121_base.jpg',
    ],
  },
  {
    name: 'Bebelac Susu Formula Cair Rasa Plain Kotak 105 ml',
    categoryName: 'Susu & Telur',
    price: 12000,
    weight: 0.105,
    images: [
      'https://c.alfagift.id/product/1/1_A8281060002167_20250526165704705_base.jpg',
      'https://c.alfagift.id/product/1/1_A8281060002167_20250526165708298_base.jpg',
    ],
  },
  {
    name: 'Kin A2 Fresh Milk 1 Liter',
    categoryName: 'Susu & Telur',
    price: 45000,
    weight: 1.0,
    images: [
      'https://image.astronauts.cloud/product-images/2024/3/KINA2FreshMilk1000ml1_15e088f7-f07d-405d-b73f-f22bc22ec1c9_900x900.png',
      'https://image.astronauts.cloud/product-images/2025/9/KINA2FreshMilk1Literpdp1_23aa0ad0-6a6a-40c3-9f52-84b399f6d4c5_900x900.jpg',
    ],
  },
  {
    name: 'Greenfields Fresh Milk Full Cream 950 ml',
    categoryName: 'Susu & Telur',
    price: 32000,
    weight: 0.95,
    images: [
      'https://image.astronauts.cloud/product-images/2024/6/GreenfieldsFreshMilkPlain1L_4b5c6b74-6c8c-49bb-9666-9e7773d11d13_900x900.jpg',
      'https://image.astronauts.cloud/product-images/2024/3/greenfields2_f59c73f0-de8d-46cf-b9d6-877cac24f65c_900x900.png',
    ],
  },
  {
    name: 'Meiji Fresh Milk Deluxe 946 ml',
    categoryName: 'Susu & Telur',
    price: 52000,
    weight: 0.946,
    images: [
      'https://image.astronauts.cloud/product-images/2025/11/AL20251107T164325_a36119eb-9adf-439a-bf7b-8c3533e943a8_900x900.jpg',
      'https://image.astronauts.cloud/product-images/2025/11/AL20251107T165338_646ae074-4d13-41d6-ab0f-f472108b86f9_900x900.jpg',
    ],
  },
  {
    name: 'Brookfarm Fresh Milk Chocolate 946 ml',
    categoryName: 'Susu & Telur',
    price: 42000,
    weight: 0.946,
    images: [
      'https://image.astronauts.cloud/product-images/2025/11/AL20251114T154933_4ac0d195-13ac-4a64-8ace-75f5ce863d37_900x900.jpg',
      'https://image.astronauts.cloud/product-images/2024/6/SusuBrookfarmFreshMilkChocolate946ml_2d4620bd-c4f7-4e7b-ab8d-b996eeddbb98_900x900.jpg',
    ],
  },
  {
    name: 'Greenfields Fresh Milk Skimmed 950 ml',
    categoryName: 'Susu & Telur',
    price: 30000,
    weight: 0.95,
    images: [
      'https://image.astronauts.cloud/product-images/2024/4/GreenfieldsFreshMilkSkim1_8d93c1e2-ff0f-4c11-ae1b-e3b9f9dc0042_900x900.jpeg',
      'https://image.astronauts.cloud/product-images/2025/9/GreenfieldsFreshMilkSkim950mlpdp1_2fd614bc-641f-4d04-b785-f8b38fb2edcd_900x900.jpg',
    ],
  },

  // ── Daging & Seafood ──────────────────────────────────────────────────────
  {
    name: 'Daging Sapi Iris Shortplate 500 gr',
    categoryName: 'Daging & Seafood',
    price: 65000,
    weight: 0.5,
    images: [
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//100/MTA-26561638/no_brand_daging_sapi_iris_empuk_ala_yoshinoya_500gr_trimming_shortplate_full01_kiz56tn4.jpg',
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//100/MTA-26561638/no_brand_daging_sapi_iris_empuk_ala_yoshinoya_500gr_trimming_shortplate_full03_fsqg5te6.jpg',
    ],
  },
  {
    name: 'Daging Sengkel Sapi Impor Australia 1 kg',
    categoryName: 'Daging & Seafood',
    price: 130000,
    weight: 1.0,
    images: [
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//91/MTA-14015277/no_brand_daging_sengkel_sapi_impor__australia_angus_beef_shank_1kg_halal_full04_ukc5cskq.jpg',
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//91/MTA-14015277/no_brand_daging_sengkel_sapi_impor__australia_angus_beef_shank_1kg_halal_full01_phad4u9p.jpg',
    ],
  },
  {
    name: 'Beef Sirloin Meltique Premium 200 gr',
    categoryName: 'Daging & Seafood',
    price: 85000,
    weight: 0.2,
    images: [
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//86/MTA-20128711/no_brand_beef_striploin_wagyu_meltique_premium_200gr_halal_-_meltik_full01_dkya7ysz.jpg',
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//86/MTA-20128711/no_brand_beef_striploin_wagyu_meltique_premium_200gr_halal_-_meltik_full02_l43q4n3n.jpg',
    ],
  },
  {
    name: 'Iga Dada Sapi Short Rib 1 kg',
    categoryName: 'Daging & Seafood',
    price: 120000,
    weight: 1.0,
    images: [
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//116/MTA-13988888/no_brand_iga_dada_sapi_short_rib_daging_tebal_kiloan_halal_dan_potongan_galby_cut__full01_lhszc5es.jpg',
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//116/MTA-13988888/no_brand_iga_dada_sapi_short_rib_daging_tebal_kiloan_halal_dan_potongan_galby_cut__full04_n22fx8s4.jpg',
    ],
  },
  {
    name: 'Ceker Ayam CP 1 kg',
    categoryName: 'Daging & Seafood',
    price: 22000,
    weight: 1.0,
    images: [
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//87/MTA-22028530/no_brand_ceker_ayam_cp_1kg_chicken_feet_halal__full01_jwjs5zg6.jpg',
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//87/MTA-22028530/no_brand_ceker_ayam_cp_1kg_chicken_feet_halal__full02_f2kjfxqw.jpg',
    ],
  },
  {
    name: 'Steak Tuna 500 gr',
    categoryName: 'Daging & Seafood',
    price: 55000,
    weight: 0.5,
    images: [
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full/catalog-image/100/MTA-180635193/no_brand_tuna_steak_500gr_daging_ikan_full01_uvjygz56.jpg',
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full/catalog-image/100/MTA-180635193/no_brand_tuna_steak_500gr_daging_ikan_full02_k4t9w8km.jpg',
    ],
  },
  {
    name: 'Cumi Beku 1 kg',
    categoryName: 'Daging & Seafood',
    price: 65000,
    weight: 1.0,
    images: [
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//106/MTA-37955617/no_brand_cumi_beku_frozen_squid_1kg_full01_g41m5pif.jpg',
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//106/MTA-37955617/no_brand_cumi_beku_frozen_squid_1kg_full02_oav5ksot.jpg',
    ],
  },
  {
    name: 'Ikan Gindara Fillet Oil Fish Steak 500 gr',
    categoryName: 'Daging & Seafood',
    price: 75000,
    weight: 0.5,
    images: [
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//96/MTA-47103079/no_brand_ikan_gindara_fillet_oil_fish_steak_500gr_full01_mrhsx5d1.jpg',
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//96/MTA-47103079/no_brand_ikan_gindara_fillet_oil_fish_steak_500gr_full02_bkcb2ovz.jpg',
    ],
  },
  {
    name: 'Udang Beku Ebinoya 454 gr',
    categoryName: 'Daging & Seafood',
    price: 65000,
    weight: 0.454,
    images: [
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//98/MTA-27555910/ebinoya_udang_beku_ebinoya_454gr_raw_shrimp_export_quality_full03_u34hwc8a.jpg',
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//98/MTA-27555910/ebinoya_udang_beku_ebinoya_454gr_raw_shrimp_export_quality_full04_kn9vbtjn.jpg',
    ],
  },
  {
    name: 'Ikan Dori Fillet 1 kg',
    categoryName: 'Daging & Seafood',
    price: 58000,
    weight: 1.0,
    images: [
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//86/MTA-14016523/no_brand_ikan_dori_iris_1kg_-_dory_fish_fillet_premium_full01_e7k7ym7n.jpg',
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//86/MTA-14016523/no_brand_ikan_dori_iris_1kg_-_dory_fish_fillet_premium_full02_mf7qqguj.jpg',
    ],
  },
  {
    name: 'Kemfood Sosis Sapi Keju 340 gr',
    categoryName: 'Daging & Seafood',
    price: 32000,
    weight: 0.34,
    images: [
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//90/MTA-23420384/kemfood_kemfood_sosis_sapi_keju_-_cheese_beef_sausage_bockwurst_340gr_full02_o44hbofb.jpg',
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//90/MTA-23420384/kemfood_kemfood_sosis_sapi_keju_-_cheese_beef_sausage_bockwurst_340gr_full03_p7c3lff8.jpg',
    ],
  },
  {
    name: 'Chief Daging Sapi Asap 200 gr',
    categoryName: 'Daging & Seafood',
    price: 28000,
    weight: 0.2,
    images: [
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//88/MTA-23425117/kemfood_chief_paket_buy_2_get_3_smoked_beef_-__daging_sapi_asap_200gr_full02_qqcywhrt.jpg',
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//88/MTA-23425117/kemfood_chief_paket_buy_2_get_3_smoked_beef_-__daging_sapi_asap_200gr_full03_ghgkwaza.jpg',
    ],
  },
  {
    name: 'Villa Bakso Sapi 390 gr',
    categoryName: 'Daging & Seafood',
    price: 35000,
    weight: 0.39,
    images: [
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//88/MTA-23412390/kemfood_villa_bakso_sapi_390gr_full02_t24gpjrg.jpg',
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//88/MTA-23412390/kemfood_villa_bakso_sapi_390gr_full03_cemukip4.jpg',
    ],
  },
  {
    name: 'Sosis Ayam So Nice 375 gr',
    categoryName: 'Daging & Seafood',
    price: 22000,
    weight: 0.375,
    images: [
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//92/MTA-19618210/so_nice_sosis_ayam_so_nice_sedap_chicken_sausage_halal_375_gr__full01_ungdj7rj.jpg',
      'https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//92/MTA-19618210/so_nice_sosis_ayam_so_nice_sedap_chicken_sausage_halal_375_gr__full02_eoc1qjqa.jpg',
    ],
  },
  {
    name: 'Udang Jerbung 250 gr',
    categoryName: 'Daging & Seafood',
    price: 38000,
    weight: 0.25,
    images: [
      'https://assets-cloudflare.segari-ops.id/products/40440600108_1_04042024041558.webp',
      'https://assets-cloudflare.segari-ops.id/products/40440600108_3_04042024041558.webp',
    ],
  },
  {
    name: 'Ikan Salmon Fillet 200 gr',
    categoryName: 'Daging & Seafood',
    price: 65000,
    weight: 0.2,
    images: [
      'https://assets-cloudflare.segari-ops.id/products/40110200029_1_26062024031735.webp',
      'https://assets-cloudflare.segari-ops.id/products/40110200029_3_26062024031735.webp',
    ],
  },
  {
    name: 'Tiram 250 gr',
    categoryName: 'Daging & Seafood',
    price: 35000,
    weight: 0.25,
    images: [
      'https://assets-cloudflare.segari-ops.id/products/40000700027_1_12112024031414.webp',
      'https://assets-cloudflare.segari-ops.id/products/40000700027_3_12112024031414.webp',
    ],
  },
  {
    name: 'Ikan Nila 500 gr',
    categoryName: 'Daging & Seafood',
    price: 28000,
    weight: 0.5,
    images: [
      'https://assets-cloudflare.segari-ops.id/products/40440600101_1_30042024122221.webp',
      'https://assets-cloudflare.segari-ops.id/products/40440600101_3_30042024122221.webp',
    ],
  },
  {
    name: 'Ikan Kerapu 400 gr',
    categoryName: 'Daging & Seafood',
    price: 55000,
    weight: 0.4,
    images: [
      'https://assets-cloudflare.segari-ops.id/products/40112100049_1_08042024024131.webp',
      'https://assets-cloudflare.segari-ops.id/products/40112100049_3_08042024024131.webp',
    ],
  },
  {
    name: 'Kepiting Soka 500 gr',
    categoryName: 'Daging & Seafood',
    price: 75000,
    weight: 0.5,
    images: [
      'https://assets-cloudflare.segari-ops.id/products/40322000089_1_04042024042959.webp',
      'https://assets-cloudflare.segari-ops.id/products/40322000089_3_04042024042959.webp',
    ],
  },

  // ── Roti & Kue ────────────────────────────────────────────────────────────
  {
    name: 'Wonder Bread 567 gr',
    categoryName: 'Roti & Kue',
    price: 45000,
    weight: 0.567,
    images: [
      'https://seabrafoods.com/cdn/shop/products/wonder-classic-white-bread-20-oz-seabra-foods-online-2_1200x1200.jpg?v=1706323208',
      'https://seabrafoods.com/cdn/shop/products/wonder-classic-white-bread-20-oz-seabra-foods-online-1_1024x.png?v=1706323207',
    ],
  },
  {
    name: 'Brownies Kering 260 gr',
    categoryName: 'Roti & Kue',
    price: 65000,
    weight: 0.26,
    images: [
      'https://amandabrownies.co.id/wp-content/uploads/2025/01/BrowniesKering1-600x600.png',
      'https://amandabrownies.co.id/wp-content/uploads/2025/01/BrowniesKering3-600x600.jpg',
    ],
  },
  {
    name: 'Brownies Kukus Tiramisu 650 gr',
    categoryName: 'Roti & Kue',
    price: 85000,
    weight: 0.65,
    images: [
      'https://amandabrownies.co.id/wp-content/uploads/2025/01/Tiramisu1.png',
      'https://amandabrownies.co.id/wp-content/uploads/2025/01/Tiramisu-02.jpg',
    ],
  },
  {
    name: 'Pisang Bolen Cokelat 450 gr',
    categoryName: 'Roti & Kue',
    price: 75000,
    weight: 0.45,
    images: [
      'https://amandabrownies.co.id/wp-content/uploads/2025/01/BolenCokelat1.png',
      'https://amandabrownies.co.id/wp-content/uploads/2025/01/BolenCokelat2.jpg',
    ],
  },
  {
    name: 'Bolu Pandan 400 gr',
    categoryName: 'Roti & Kue',
    price: 65000,
    weight: 0.4,
    images: [
      'https://amandabrownies.co.id/wp-content/uploads/2025/01/BoluPandan1.png',
      'https://amandabrownies.co.id/wp-content/uploads/2025/01/BoluPandan2.png',
    ],
  },
  {
    name: 'Lapis Legit 600 gr',
    categoryName: 'Roti & Kue',
    price: 125000,
    weight: 0.6,
    images: [
      'https://amandabrownies.co.id/wp-content/uploads/2025/01/LapisLegit1.png',
      'https://amandabrownies.co.id/wp-content/uploads/2025/01/LapisLegit2.jpg',
    ],
  },
  {
    name: 'Cookies Kastengel 600 gr',
    categoryName: 'Roti & Kue',
    price: 95000,
    weight: 0.6,
    images: [
      'https://amandabrownies.co.id/wp-content/uploads/2025/05/Kastengel2.png',
      'https://amandabrownies.co.id/wp-content/uploads/2025/05/Kastengel1.png',
    ],
  },
  {
    name: 'Brownies Bakar 375 gr',
    categoryName: 'Roti & Kue',
    price: 72000,
    weight: 0.375,
    images: [
      'https://amandabrownies.co.id/wp-content/uploads/2025/01/BrowniesBakar1.png',
      'https://amandabrownies.co.id/wp-content/uploads/2025/01/BrowniesBakar2.jpg',
    ],
  },
  {
    name: 'Ganache Choco 700 gr',
    categoryName: 'Roti & Kue',
    price: 105000,
    weight: 0.7,
    images: [
      'https://amandabrownies.co.id/wp-content/uploads/2025/01/Ganache1.png',
      'https://amandabrownies.co.id/wp-content/uploads/2025/01/Ganache2.jpg',
    ],
  },
  {
    name: 'Cheese Stick 150 gr',
    categoryName: 'Roti & Kue',
    price: 45000,
    weight: 0.15,
    images: [
      'https://amandabrownies.co.id/wp-content/uploads/2025/01/CheeseStick1.png',
      'https://amandabrownies.co.id/wp-content/uploads/2025/01/CheeseStick2.jpg',
    ],
  },
  {
    name: 'Cookies Crispy Cheese 600 gr',
    categoryName: 'Roti & Kue',
    price: 95000,
    weight: 0.6,
    images: [
      'https://amandabrownies.co.id/wp-content/uploads/2025/05/CrispyCheese2.png',
      'https://amandabrownies.co.id/wp-content/uploads/2025/05/CrispyCheese1.png',
    ],
  },
  {
    name: 'Sari Roti Tawar Jumbo Special 555 gr',
    categoryName: 'Roti & Kue',
    price: 22000,
    weight: 0.555,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/10/DSC_0465_hkicm4G.JPG',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/10/DSC_0466_tbsnT1W.JPG',
    ],
  },
  {
    name: 'Sari Roti Tawar Kupas 200 gr',
    categoryName: 'Roti & Kue',
    price: 12000,
    weight: 0.2,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/10/DSC_0469_8XQqIqT.JPG',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/10/DSC_0470_eJgKbGp.JPG',
    ],
  },
  {
    name: 'Sari Roti Tawar Special 370 gr',
    categoryName: 'Roti & Kue',
    price: 17000,
    weight: 0.37,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/10/DSC_0472_R22Sial.JPG',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/10/DSC_0473_jIW26wl.JPG',
    ],
  },
  {
    name: 'Sari Roti Soft Milky 360 gr',
    categoryName: 'Roti & Kue',
    price: 18000,
    weight: 0.36,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/07/DSC_0465_copy_GkviI8l.jpg',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/07/DSC_0466_copy_taL62cE.jpg',
    ],
  },
  {
    name: 'Sari Roti Tawar Pandan Manis 370 gr',
    categoryName: 'Roti & Kue',
    price: 17000,
    weight: 0.37,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/10/DSC_0474_qHnHMN6.JPG',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/10/DSC_0475_JmdoAi5.JPG',
    ],
  },
  {
    name: 'Sari Roti Tawar Jumbo Milky Soft 500 gr',
    categoryName: 'Roti & Kue',
    price: 22000,
    weight: 0.5,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2024/07/BRM_0314.JPG',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2024/07/BRM_0315.JPG',
    ],
  },
  {
    name: 'Sari Roti Tawar Kupas Jumbo 300 gr',
    categoryName: 'Roti & Kue',
    price: 15000,
    weight: 0.3,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/10/DSC_0463_AB24kM0.JPG',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/10/DSC_0464_OW5NWQL.JPG',
    ],
  },
  {
    name: 'Myroti Funwari Tawar White Soft 380 gr',
    categoryName: 'Roti & Kue',
    price: 18000,
    weight: 0.38,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2022/01/DSC_0603.JPG',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2022/01/DSC_0604.JPG',
    ],
  },
  {
    name: 'Sharon Toast 350 gr',
    categoryName: 'Roti & Kue',
    price: 16000,
    weight: 0.35,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/10/DSC_0467_pXbiHym.JPG',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/10/DSC_0468_cBKQfwc.JPG',
    ],
  },

  // ── Dapur & Bumbu ─────────────────────────────────────────────────────────
  {
    name: 'Beras Premium Befood Setra Ramos 5 kg',
    categoryName: 'Dapur & Bumbu',
    price: 85000,
    weight: 5.0,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2025/10/WhatsApp_Image_2025-08-16_at_14.40.54_1.jpg',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2025/10/WhatsApp_Image_2025-08-16_at_14.40.54.jpg',
    ],
  },
  {
    name: 'Gulaku Kuning 1 kg',
    categoryName: 'Dapur & Bumbu',
    price: 16500,
    weight: 1.0,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/04/2033a.jpg',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/04/2033b.jpg',
    ],
  },
  {
    name: 'Koepoe Jinten Bubuk 32 gr',
    categoryName: 'Dapur & Bumbu',
    price: 8500,
    weight: 0.032,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/04/DSC_0093_UrrMcTY.JPG',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/04/DSC_0094_O80GmIm.JPG',
    ],
  },
  {
    name: 'Minyak Goreng Sunco Pouch 2 lt',
    categoryName: 'Dapur & Bumbu',
    price: 42000,
    weight: 2.0,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/04/2378a.jpg',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/04/2378b.jpg',
    ],
  },
  {
    name: 'Gulaku Putih 1 kg',
    categoryName: 'Dapur & Bumbu',
    price: 15500,
    weight: 1.0,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/04/2028a.jpg',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/04/2028b.jpg',
    ],
  },
  {
    name: 'Beras Sania 5 kg',
    categoryName: 'Dapur & Bumbu',
    price: 78000,
    weight: 5.0,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/06/DSC_0074_copy_MGum30k.jpg',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/06/DSC_0075_copy_PLa0Ng4.jpg',
    ],
  },
  {
    name: 'Mc Lewis Cheese Sauce 250 gr',
    categoryName: 'Dapur & Bumbu',
    price: 25000,
    weight: 0.25,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2026/04/BRM_0545.JPG',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2026/04/BRM_0546.JPG',
    ],
  },
  {
    name: 'Beras Anak Raja Fortifikasi Pulen Wangi 5 kg',
    categoryName: 'Dapur & Bumbu',
    price: 80000,
    weight: 5.0,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2025/11/BRM_0637.JPG',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2025/11/BRM_0638.JPG',
    ],
  },
  {
    name: 'Beras Raja Ultima 5 kg',
    categoryName: 'Dapur & Bumbu',
    price: 95000,
    weight: 5.0,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2023/11/211_tBsncBU.jpg',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2023/11/210_5EydkgQ.jpg',
    ],
  },
  {
    name: 'Minyak Rizki 800 ml',
    categoryName: 'Dapur & Bumbu',
    price: 18000,
    weight: 0.8,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2024/03/BRM_0883.JPG',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2024/03/BRM_0884.JPG',
    ],
  },
  {
    name: 'Minyak Siip 1.8 lt',
    categoryName: 'Dapur & Bumbu',
    price: 35000,
    weight: 1.8,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/04/2092a.jpg',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/04/2092b.jpg',
    ],
  },
  {
    name: 'Tepung Terigu Tulip 1 kg',
    categoryName: 'Dapur & Bumbu',
    price: 14000,
    weight: 1.0,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/04/2020a.jpg',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/04/2020b.jpg',
    ],
  },
  {
    name: 'Sania Pouch 1.8 lt',
    categoryName: 'Dapur & Bumbu',
    price: 38000,
    weight: 1.8,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2025/10/BRM_0149.JPG',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2025/10/BRM_0150.JPG',
    ],
  },
  {
    name: 'Santan Kelapa Kara Sun 65 ml',
    categoryName: 'Dapur & Bumbu',
    price: 5500,
    weight: 0.065,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/11/IMG20211119130655.jpg',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/11/IMG20211119130635.jpg',
    ],
  },
  {
    name: 'Tepung Terigu Segitiga Biru 1 kg',
    categoryName: 'Dapur & Bumbu',
    price: 13500,
    weight: 1.0,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/04/2030a.jpg',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/04/2030b.jpg',
    ],
  },
  {
    name: 'Rose Brand Gula Kuning 1 kg',
    categoryName: 'Dapur & Bumbu',
    price: 15000,
    weight: 1.0,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2022/08/DSC_0829.JPG',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2022/08/DSC_0830.JPG',
    ],
  },
  {
    name: 'Santan Kelapa Sasa 65 ml',
    categoryName: 'Dapur & Bumbu',
    price: 5000,
    weight: 0.065,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/03/1328a.jpg',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/03/1328b.jpg',
    ],
  },
  {
    name: 'Minyak Goreng Sunco Pouch 1 lt',
    categoryName: 'Dapur & Bumbu',
    price: 24000,
    weight: 1.0,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/04/2368a.jpg',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/04/2368b.jpg',
    ],
  },
  {
    name: 'Margarin Blue Band Serbaguna 200 gr',
    categoryName: 'Dapur & Bumbu',
    price: 12000,
    weight: 0.2,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/03/1070a.jpg',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/03/1070b.jpg',
    ],
  },
  {
    name: 'Royco Kaldu Ayam 94 gr',
    categoryName: 'Dapur & Bumbu',
    price: 8500,
    weight: 0.094,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/03/1190a.jpg',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/03/1190b.jpg',
    ],
  },

  // ── Minuman ───────────────────────────────────────────────────────────────
  {
    name: 'Nu Yoghurt Tea 450 ml',
    categoryName: 'Minuman',
    price: 8500,
    weight: 0.45,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2024/04/113_IggNDmJ.jpg',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2024/04/114_VSi4xOz.jpg',
    ],
  },
  {
    name: 'Ultra Sari Kacang Ijo 250 ml',
    categoryName: 'Minuman',
    price: 5500,
    weight: 0.25,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2020/12/22.1.png',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2020/12/22.3.png',
    ],
  },
  {
    name: 'Teh Kotak Jasmine Less Sugar 300 ml',
    categoryName: 'Minuman',
    price: 5000,
    weight: 0.3,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2020/12/13.1.png',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2020/12/13.2.png',
    ],
  },
  {
    name: 'Nu Green Tea Honey 450 ml',
    categoryName: 'Minuman',
    price: 8500,
    weight: 0.45,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2024/04/127_x8adkYa.jpg',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2024/04/128_Mktx1Gp.jpg',
    ],
  },
  {
    name: 'Teh Kotak Jasmine 300 ml',
    categoryName: 'Minuman',
    price: 4500,
    weight: 0.3,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2020/12/14.1.png',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2020/12/14.2.png',
    ],
  },
  {
    name: 'Sosro Teh Botol Original 350 ml',
    categoryName: 'Minuman',
    price: 5000,
    weight: 0.35,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2022/08/DSC_0380.JPG',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2022/08/DSC_0381.JPG',
    ],
  },
  {
    name: 'Teh Kotak Lemon 300 ml',
    categoryName: 'Minuman',
    price: 4500,
    weight: 0.3,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2020/12/40.1.png',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2020/12/40.2.png',
    ],
  },
  {
    name: 'Teh Kotak Blackcurrant 300 ml',
    categoryName: 'Minuman',
    price: 4500,
    weight: 0.3,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2020/12/17.1.png',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2020/12/17.2.png',
    ],
  },
  {
    name: 'Polaris Soda Water 330 ml',
    categoryName: 'Minuman',
    price: 6500,
    weight: 0.33,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2023/01/DSC_0663_ilHYDyS.JPG',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2023/01/DSC_0664_cGGuMu8.JPG',
    ],
  },
  {
    name: 'Pororo Milk 235 ml',
    categoryName: 'Minuman',
    price: 7500,
    weight: 0.235,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/03/8801128945073.jpg',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/03/8801128945073.2.jpg',
    ],
  },
  {
    name: 'Floridina Coco 350 ml',
    categoryName: 'Minuman',
    price: 6000,
    weight: 0.35,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/04/2565a.jpg',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/04/2565b.jpg',
    ],
  },
  {
    name: 'Ultra Sari Asem Asli 250 ml',
    categoryName: 'Minuman',
    price: 5500,
    weight: 0.25,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2020/12/42.1.png',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2020/12/42.2.png',
    ],
  },
  {
    name: 'Teh Kotak Apel 300 ml',
    categoryName: 'Minuman',
    price: 4500,
    weight: 0.3,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2020/11/9.1.png',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2020/11/9.2.png',
    ],
  },
  {
    name: 'Pororo Blueberry 235 ml',
    categoryName: 'Minuman',
    price: 7500,
    weight: 0.235,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/06/DSC_0083_copy_uHULDi9.jpg',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/06/DSC_0084_copy_aP8ftvk.jpg',
    ],
  },
  {
    name: 'Floridina Orange 350 ml',
    categoryName: 'Minuman',
    price: 6000,
    weight: 0.35,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/06/DSC_0162_copy_oSLuDmW.jpg',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/06/DSC_0163_copy_SaWjAzS.jpg',
    ],
  },
  {
    name: 'Nu Teh Tarik 330 ml',
    categoryName: 'Minuman',
    price: 8000,
    weight: 0.33,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/06/DSC_0092_copy_VbL6DM3.jpg',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/06/DSC_0093_copy_rlmRKJI.jpg',
    ],
  },
  {
    name: 'ABC Sari Kacang Hijau 250 ml',
    categoryName: 'Minuman',
    price: 5000,
    weight: 0.25,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2024/03/128.jpg',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2024/03/130.jpg',
    ],
  },
  {
    name: 'Nu Choco Hazeltea 330 ml',
    categoryName: 'Minuman',
    price: 8500,
    weight: 0.33,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2023/03/DSC_0021_1.JPG',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2023/03/DSC_0022_1.JPG',
    ],
  },
  {
    name: 'Sunkist Orange Water C 350 ml',
    categoryName: 'Minuman',
    price: 7500,
    weight: 0.35,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2023/10/BRM_0501.JPG',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2023/10/BRM_0502.JPG',
    ],
  },
  {
    name: 'Mizone Cranberry 500 ml',
    categoryName: 'Minuman',
    price: 8000,
    weight: 0.5,
    images: [
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/06/DSC_0114_copy_flkXlEv.jpg',
      'https://solvent-production.s3.amazonaws.com/media/images/products/2021/06/DSC_0115_copy_GJZEPra.jpg',
    ],
  },
];

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Seeding categories ===');
  const categoryMap: Record<string, string> = {};

  for (const cat of CATEGORIES) {
    const existing = await prisma.productCategory.findUnique({ where: { name: cat.name } });

    if (existing) {
      categoryMap[cat.name] = existing.id;
      console.log(`  [skip] "${cat.name}" already exists`);
      continue;
    }

    try {
      const { secureUrl, publicId } = await uploadFromUrl(cat.imageUrl, 'categories');
      const created = await prisma.productCategory.create({
        data: {
          name: cat.name,
          slug: makeSlug(cat.name),
          image_url: secureUrl,
          public_id: publicId,
        },
      });
      categoryMap[cat.name] = created.id;
      console.log(`  [ok] "${cat.name}" → ${publicId}`);
    } catch (err) {
      console.error(`  [error] "${cat.name}":`, err);
    }
  }

  console.log('\n=== Seeding products ===');

  for (const prod of PRODUCTS) {
    const existing = await prisma.product.findUnique({ where: { name: prod.name } });

    if (existing) {
      console.log(`  [skip] "${prod.name}" already exists`);
      continue;
    }

    const categoryId = categoryMap[prod.categoryName];
    if (!categoryId) {
      console.error(`  [error] "${prod.name}": category "${prod.categoryName}" not found, skipping`);
      continue;
    }

    try {
      const product = await prisma.product.create({
        data: {
          name: prod.name,
          slug: makeSlug(prod.name),
          price: prod.price,
          weight: prod.weight,
          category_id: categoryId,
        },
      });

      const [primaryUrl, secondaryUrl] = prod.images;

      const primary = await uploadFromUrl(primaryUrl, 'products');
      await prisma.productImage.create({
        data: {
          product_id: product.id,
          image_url: primary.secureUrl,
          public_id: primary.publicId,
          is_primary: true,
        },
      });

      const secondary = await uploadFromUrl(secondaryUrl, 'products');
      await prisma.productImage.create({
        data: {
          product_id: product.id,
          image_url: secondary.secureUrl,
          public_id: secondary.publicId,
          is_primary: false,
        },
      });

      console.log(`  [ok] "${prod.name}"`);
    } catch (err) {
      console.error(`  [error] "${prod.name}":`, err);
    }
  }

  console.log('\nDone.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
