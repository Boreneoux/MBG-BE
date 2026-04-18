/**
 * Seeds Province, City, and District tables using two data sources:
 *
 * - Province rajaongkir_province_id: Komerce API IDs (confirmed correct via debug)
 * - City rajaongkir_city_id: emsifa BPS regency codes (placeholder — must be updated
 *   to real Komerce city IDs before shipping cost calculation will work)
 * - District rajaongkir_district_id: emsifa BPS district codes (placeholder)
 *
 * Usage:
 *   npm run seed:regions                  ← provinces + cities only
 *   npm run seed:regions:with-districts   ← provinces + cities + districts (~5000 rows)
 */
import 'dotenv/config';
import axios from 'axios';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const EMSIFA = 'https://emsifa.github.io/api-wilayah-indonesia/api';
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// --- Confirmed Komerce province IDs (from debug run 2026-04-18) ---
// Key: emsifa 2-digit BPS province code | Value: Komerce rajaongkir_province_id
const EMSIFA_TO_KOMERCE_PROVINCE: Record<string, number> = {
  '11': 9,  '12': 16, '13': 23, '14': 25, '15': 13,
  '16': 26, '17': 6,  '18': 30, '19': 24, '21': 8,
  '31': 10, '32': 5,  '33': 12, '34': 19, '35': 18,
  '36': 11, '51': 15, '52': 1,  '53': 21, '61': 28,
  '62': 4,  '63': 3,  '64': 7,  '65': 31, '71': 22,
  '72': 27, '73': 33, '74': 20, '75': 17, '76': 34,
  '81': 2,  '82': 32, '91': 29, '94': 14,
};

// Komerce province names (from debug run — used for province.name in DB)
const KOMERCE_PROVINCE_NAMES: Record<number, string> = {
  1: 'NUSA TENGGARA BARAT (NTB)', 2: 'MALUKU',
  3: 'KALIMANTAN SELATAN',        4: 'KALIMANTAN TENGAH',
  5: 'JAWA BARAT',                6: 'BENGKULU',
  7: 'KALIMANTAN TIMUR',          8: 'KEPULAUAN RIAU',
  9: 'NANGGROE ACEH DARUSSALAM (NAD)', 10: 'DKI JAKARTA',
  11: 'BANTEN',                   12: 'JAWA TENGAH',
  13: 'JAMBI',                    14: 'PAPUA',
  15: 'BALI',                     16: 'SUMATERA UTARA',
  17: 'GORONTALO',                18: 'JAWA TIMUR',
  19: 'DI YOGYAKARTA',            20: 'SULAWESI TENGGARA',
  21: 'NUSA TENGGARA TIMUR (NTT)', 22: 'SULAWESI UTARA',
  23: 'SUMATERA BARAT',           24: 'BANGKA BELITUNG',
  25: 'RIAU',                     26: 'SUMATERA SELATAN',
  27: 'SULAWESI TENGAH',          28: 'KALIMANTAN BARAT',
  29: 'PAPUA BARAT',              30: 'LAMPUNG',
  31: 'KALIMANTAN UTARA',         32: 'MALUKU UTARA',
  33: 'SULAWESI SELATAN',         34: 'SULAWESI BARAT',
};

interface EmsifaProvince { id: string; name: string; }
interface EmsifaRegency  { id: string; name: string; }
interface EmsifaDistrict { id: string; name: string; }

function parseRegency(raw: string): { type: string; name: string } {
  if (raw.startsWith('KABUPATEN ADMINISTRASI ')) {
    return { type: 'Kabupaten Administrasi', name: raw.replace('KABUPATEN ADMINISTRASI ', '') };
  }
  if (raw.startsWith('KOTA ADMINISTRASI ')) {
    return { type: 'Kota Administrasi', name: raw.replace('KOTA ADMINISTRASI ', '') };
  }
  if (raw.startsWith('KABUPATEN ')) {
    return { type: 'Kabupaten', name: raw.replace('KABUPATEN ', '') };
  }
  if (raw.startsWith('KOTA ')) {
    return { type: 'Kota', name: raw.replace('KOTA ', '') };
  }
  return { type: '', name: raw };
}

async function fetchJson<T>(url: string): Promise<T> {
  const { data } = await axios.get<T>(url);
  return data;
}

async function main() {
  const withDistricts = process.argv.includes('--with-districts');

  console.log('🌏 Seeding regions from emsifa (Indonesian government data)...');
  console.log(`   Districts: ${withDistricts ? 'YES (slow ~5 min)' : 'NO (use --with-districts to include)'}\n`);

  // --- Provinces ---
  const emsifaProvinces = await fetchJson<EmsifaProvince[]>(`${EMSIFA}/provinces.json`);
  console.log(`Fetched ${emsifaProvinces.length} provinces from emsifa`);

  // provinceDbId[komerce_id] = our DB primary key
  const provinceDbId = new Map<number, number>();

  for (const ep of emsifaProvinces) {
    const komerceId = EMSIFA_TO_KOMERCE_PROVINCE[ep.id];
    if (!komerceId) {
      console.warn(`  ⚠️  Unknown emsifa province id=${ep.id} (${ep.name}), skipping`);
      continue;
    }
    const name = KOMERCE_PROVINCE_NAMES[komerceId];
    const record = await prisma.province.upsert({
      where:  { rajaongkir_province_id: komerceId },
      update: { name },
      create: { rajaongkir_province_id: komerceId, name }
    });
    provinceDbId.set(komerceId, record.id);
  }
  console.log(`✅ ${provinceDbId.size} provinces seeded\n`);

  // --- Cities (regencies) ---
  // cityDbId[emsifa_regency_id_string] = our DB primary key
  const cityDbId = new Map<string, number>();
  let totalCities = 0;

  for (const ep of emsifaProvinces) {
    const komerceId = EMSIFA_TO_KOMERCE_PROVINCE[ep.id];
    if (!komerceId) continue;

    const dbProvinceId = provinceDbId.get(komerceId)!;
    const regencies = await fetchJson<EmsifaRegency[]>(`${EMSIFA}/regencies/${ep.id}.json`);

    for (const r of regencies) {
      const { type, name } = parseRegency(r.name);
      // Use emsifa numeric ID as rajaongkir_city_id placeholder (unique, no RajaOngkir API needed)
      const record = await prisma.city.upsert({
        where:  { rajaongkir_city_id: Number(r.id) },
        update: { name, type },
        create: {
          province_id:        dbProvinceId,
          rajaongkir_city_id: Number(r.id),
          name,
          type
        }
      });
      cityDbId.set(r.id, record.id);
    }

    totalCities += regencies.length;
    console.log(`  ${KOMERCE_PROVINCE_NAMES[komerceId]}: ${regencies.length} cities`);
    await sleep(50);
  }
  console.log(`\n✅ ${totalCities} cities seeded\n`);

  if (!withDistricts) {
    console.log('⏭  Skipping districts. Run with --with-districts to seed them.');
    return;
  }

  // --- Districts ---
  console.log(`Seeding districts for ${cityDbId.size} cities...\n`);

  let totalDistricts = 0;
  let processed = 0;

  for (const [emsifaCityId, dbCityId] of cityDbId.entries()) {
    try {
      const districts = await fetchJson<EmsifaDistrict[]>(`${EMSIFA}/districts/${emsifaCityId}.json`);
      for (const d of districts) {
        await prisma.district.upsert({
          where:  { rajaongkir_district_id: Number(d.id) },
          update: { name: d.name },
          create: { city_id: dbCityId, rajaongkir_district_id: Number(d.id), name: d.name }
        });
      }
      totalDistricts += districts.length;
    } catch (err) {
      console.warn(`  ⚠️  Skipping city emsifa_id=${emsifaCityId}: ${(err as Error).message}`);
    }

    processed++;
    if (processed % 50 === 0) {
      console.log(`  Progress: ${processed}/${cityDbId.size} cities — ${totalDistricts} districts`);
    }
    await sleep(50);
  }

  console.log(`\n✅ ${totalDistricts} districts seeded`);
}

main()
  .catch(e => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
