/**
 * 제품명 기반 CPU/GPU 스펙 일괄 추출 스크립트
 *
 * 사용법: cd apps/api && npx tsx src/database/scripts/backfill-specs.ts
 *
 * CPU: cores, threads, socket 추출
 * GPU: vramGb, chipset 추출
 * 기존 specs를 덮어쓰지 않고 병합 (merge)
 */

import 'dotenv/config';
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL 환경변수가 필요합니다.');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

// ── CPU 스펙 추출 ──────────────────────────────────────────────

interface CpuSpecs {
  cores?: number;
  threads?: number;
  socket?: string;
  baseClockGhz?: number;
}

function parseCpuSpecs(name: string): CpuSpecs {
  const specs: CpuSpecs = {};

  // 코어 수: "6코어", "16코어", "8-Core"
  const coreMatch = name.match(/(\d{1,2})\s*코어|(\d{1,2})\s*-?\s*[Cc]ore/);
  if (coreMatch) specs.cores = parseInt(coreMatch[1] || coreMatch[2]);

  // 스레드 수: "32스레드", "16-Thread", "16스레드"
  const threadMatch = name.match(/(\d{1,2})\s*스레드|(\d{1,2})\s*-?\s*[Tt]hread/);
  if (threadMatch) specs.threads = parseInt(threadMatch[1] || threadMatch[2]);

  // 코어만 있고 스레드 없으면 추정 (Intel은 대부분 코어x2, AMD도 비슷)
  if (specs.cores && !specs.threads) {
    specs.threads = specs.cores * 2;
  }

  // 소켓: AM5, AM4, LGA1700, LGA1851, sTRX4
  const socketMatch = name.match(/(?:소켓\s*)?(AM[45]|LGA\s*1[78]\d{2}|sTR[X5]\d?)/i);
  if (socketMatch) {
    let socket = socketMatch[1].replace(/\s+/g, '').toUpperCase();
    // 정규화
    if (socket === 'LGA1700') socket = 'LGA1700';
    if (socket === 'LGA1851') socket = 'LGA1851';
    specs.socket = socket;
  }

  // 소켓 추정: 제품명에서 세대/모델로 추론
  if (!specs.socket) {
    if (/라이젠|Ryzen/i.test(name)) {
      // Ryzen 7000/9000 시리즈 → AM5, 5000 이하 → AM4
      const seriesMatch = name.match(/[Rr]yzen\s*\d\s*(\d)\d{3}/);
      if (seriesMatch) {
        const gen = parseInt(seriesMatch[1]);
        specs.socket = gen >= 7 ? 'AM5' : 'AM4';
      }
      // "7600X", "5600X" 패턴
      const modelMatch = name.match(/(\d)(?:\d{3})[X3D]*/);
      if (!specs.socket && modelMatch) {
        const gen = parseInt(modelMatch[1]);
        specs.socket = gen >= 7 ? 'AM5' : 'AM4';
      }
    }
    if (/i[3579]-1[234]\d{3}|14세대|13세대|12세대/i.test(name)) {
      specs.socket = 'LGA1700';
    }
    if (/i[3579]-1[56]\d{3}|15세대|울트라\s*2/i.test(name)) {
      specs.socket = 'LGA1851';
    }
  }

  // 클럭 속도: "4.7 GHz", "4.7GHz"
  const clockMatch = name.match(/(\d+\.\d+)\s*GHz/i);
  if (clockMatch) specs.baseClockGhz = parseFloat(clockMatch[1]);

  return specs;
}

// ── GPU 스펙 추출 ──────────────────────────────────────────────

interface GpuSpecs {
  vramGb?: number;
  chipset?: string;
}

function parseGpuSpecs(name: string): GpuSpecs {
  const specs: GpuSpecs = {};

  // VRAM: "12GB", "16GB GDDR6", "24GB", "8G"
  const vramMatch = name.match(/(\d{1,2})\s*G[B]?\s*(?:GDDR\d?|D[67])?/i);
  if (vramMatch) {
    const gb = parseInt(vramMatch[1]);
    // 유효한 VRAM 크기만 (4, 6, 8, 10, 12, 16, 24, 32, 48)
    if ([4, 6, 8, 10, 12, 16, 24, 32, 48].includes(gb)) {
      specs.vramGb = gb;
    }
  }

  // 칩셋: RTX 5090, RTX 4070 Ti, RX 7800 XT, Arc A770 등
  const chipsetPatterns = [
    /RTX\s*(50[89]0|5070\s*Ti?|5060\s*Ti?)/i,
    /RTX\s*(40[89]0|4070\s*Ti\s*(?:Super|SUPER)?|4070\s*(?:Super|SUPER)?|4060\s*Ti?)/i,
    /RTX\s*(30[89]0\s*Ti?|3070\s*Ti?|3060\s*Ti?)/i,
    /RX\s*(7900\s*XTX?|7800\s*XT|7700\s*XT|7600\s*XT?)/i,
    /RX\s*(6[89]00\s*XT?|6700\s*XT?|6600\s*XT?)/i,
    /GTX\s*(1660\s*(?:Super|Ti)?|1650\s*(?:Super)?|1080\s*Ti?|1070\s*Ti?)/i,
    /Arc\s*(A\d{3})/i,
  ];

  for (const pat of chipsetPatterns) {
    const m = name.match(pat);
    if (m) {
      // 정규화: 공백 정리
      const prefix = name.match(/RTX|GTX|RX|Arc/i)?.[0]?.toUpperCase() || '';
      specs.chipset = `${prefix} ${m[1]}`.replace(/\s+/g, ' ').trim();
      break;
    }
  }

  return specs;
}

// ── 메인 실행 ──────────────────────────────────────────────────

async function backfill() {
  console.log('=== 스펙 일괄 추출 시작 ===\n');

  // CPU 처리
  const cpuResult = await pool.query(`
    SELECT p.id, p.name, p.specs
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE c.name = 'CPU'
  `);

  let cpuUpdated = 0;
  for (const row of cpuResult.rows) {
    const parsed = parseCpuSpecs(row.name);
    if (Object.keys(parsed).length === 0) continue;

    // 기존 specs와 병합 (새 키만 추가, 기존 키 유지)
    const merged = { ...row.specs, ...parsed };

    await pool.query(
      `UPDATE products SET specs = $1, spec_extraction_status = 'parsed', spec_updated_at = NOW(), updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(merged), row.id],
    );
    cpuUpdated++;
  }
  console.log(`CPU: ${cpuResult.rows.length}개 중 ${cpuUpdated}개 업데이트`);

  // GPU 처리
  const gpuResult = await pool.query(`
    SELECT p.id, p.name, p.specs
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE c.name = 'GPU'
  `);

  let gpuUpdated = 0;
  for (const row of gpuResult.rows) {
    const parsed = parseGpuSpecs(row.name);
    if (Object.keys(parsed).length === 0) continue;

    const merged = { ...row.specs, ...parsed };

    await pool.query(
      `UPDATE products SET specs = $1, spec_extraction_status = 'parsed', spec_updated_at = NOW(), updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(merged), row.id],
    );
    gpuUpdated++;
  }
  console.log(`GPU: ${gpuResult.rows.length}개 중 ${gpuUpdated}개 업데이트`);

  // 결과 확인
  const checkResult = await pool.query(`
    SELECT c.name,
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE p.specs != '{}'::jsonb)::int AS has_specs,
           COUNT(*) FILTER (WHERE p.specs->>'cores' IS NOT NULL)::int AS has_cores,
           COUNT(*) FILTER (WHERE p.specs->>'vramGb' IS NOT NULL)::int AS has_vram,
           COUNT(*) FILTER (WHERE p.specs->>'socket' IS NOT NULL)::int AS has_socket,
           COUNT(*) FILTER (WHERE p.specs->>'chipset' IS NOT NULL)::int AS has_chipset
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE c.name IN ('CPU', 'GPU')
    GROUP BY c.name
  `);
  console.log('\n=== 결과 ===');
  console.table(checkResult.rows);

  await pool.end();
  console.log('\n완료.');
}

backfill().catch((e) => {
  console.error('오류:', e);
  pool.end();
  process.exit(1);
});
