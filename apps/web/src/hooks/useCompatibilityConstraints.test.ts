import { computeConstraints } from './useCompatibilityConstraints';
import type { BuildComponent } from '@/lib/data';

// 테스트용 BuildComponent 생성 헬퍼
const makePart = (category: string, specs: Record<string, unknown>): BuildComponent => ({
  category,
  categoryName: category,
  productId: '1',
  productName: 'Test',
  slug: 'test',
  brand: 'Test',
  imageUrl: null,
  price: 100,
  currency: 'KRW',
  storeUrl: null,
  storeName: null,
  inStock: true,
  specs,
});

describe('computeConstraints', () => {
  it('메인보드 선택 시 RAM 카테고리에 type=DDR5 제약', () => {
    const parts = [makePart('motherboard', { ramType: 'DDR5', socket: 'LGA1700', formFactor: 'ATX' })];
    const result = computeConstraints('ram', parts);
    expect(result.constraints).toContainEqual(
      expect.objectContaining({ specKey: 'type', operator: 'eq', value: 'DDR5' }),
    );
  });

  it('메인보드 선택 시 CPU 카테고리에 socket 제약', () => {
    const parts = [makePart('motherboard', { socket: 'LGA1700', ramType: 'DDR5', formFactor: 'ATX' })];
    const result = computeConstraints('cpu', parts);
    expect(result.constraints).toContainEqual(
      expect.objectContaining({ specKey: 'socket', operator: 'eq', value: 'LGA1700' }),
    );
  });

  it('CPU 선택 시 메인보드 카테고리에 socket + ramType 제약', () => {
    const parts = [makePart('cpu', { socket: 'AM5', supportedRam: ['DDR5'] })];
    const result = computeConstraints('motherboard', parts);
    expect(result.constraints).toContainEqual(
      expect.objectContaining({ specKey: 'socket', operator: 'eq', value: 'AM5' }),
    );
    expect(result.constraints).toContainEqual(
      expect.objectContaining({ specKey: 'ramType', operator: 'in', value: ['DDR5'] }),
    );
  });

  it('CPU + 메인보드 선택 시 쿨러 카테고리에 supportedSockets 제약 (중복 제거)', () => {
    const parts = [
      makePart('cpu', { socket: 'LGA1700', supportedRam: ['DDR5'] }),
      makePart('motherboard', { socket: 'LGA1700', ramType: 'DDR5', formFactor: 'ATX' }),
    ];
    const result = computeConstraints('cooler', parts);
    const socketConstraints = result.constraints.filter(c => c.specKey === 'supportedSockets');
    // CPU와 메인보드 모두 LGA1700 소켓 → 중복 제거 후 1개만 남아야 함
    expect(socketConstraints).toHaveLength(1);
    expect(socketConstraints[0].operator).toBe('contains');
    expect(socketConstraints[0].value).toBe('LGA1700');
  });

  it('GPU 선택 시 케이스 카테고리에 maxGpuLengthMm >= GPU lengthMm 제약', () => {
    const parts = [makePart('gpu', { lengthMm: 320 })];
    const result = computeConstraints('case', parts);
    expect(result.constraints).toContainEqual(
      expect.objectContaining({ specKey: 'maxGpuLengthMm', operator: 'gte', value: 320 }),
    );
  });

  it('케이스 선택 시 메인보드 카테고리에 formFactor in 제약', () => {
    const parts = [makePart('case', { supportedFormFactors: ['ATX', 'MicroATX'], psuFormFactor: 'ATX' })];
    const result = computeConstraints('motherboard', parts);
    expect(result.constraints).toContainEqual(
      expect.objectContaining({ specKey: 'formFactor', operator: 'in', value: ['ATX', 'MicroATX'] }),
    );
  });

  it('케이스 선택 시 PSU 카테고리에 formFactor 제약', () => {
    const parts = [makePart('case', { supportedFormFactors: ['ATX'], psuFormFactor: 'ATX' })];
    const result = computeConstraints('psu', parts);
    expect(result.constraints).toContainEqual(
      expect.objectContaining({ specKey: 'formFactor', operator: 'eq', value: 'ATX' }),
    );
  });

  it('빌더에 부품이 없으면 빈 제약 반환', () => {
    const result = computeConstraints('ram', []);
    expect(result.constraints).toHaveLength(0);
    expect(result.specsFilter).toEqual({});
  });

  it('관련 없는 카테고리에는 제약 없음', () => {
    const parts = [makePart('motherboard', { socket: 'LGA1700', ramType: 'DDR5', formFactor: 'ATX' })];
    const result = computeConstraints('ssd', parts);
    expect(result.constraints).toHaveLength(0);
  });

  it('specsFilter가 올바른 API 파라미터 형식으로 변환됨', () => {
    const parts = [makePart('motherboard', { ramType: 'DDR5', socket: 'LGA1700', formFactor: 'ATX' })];
    const result = computeConstraints('ram', parts);
    expect(result.specsFilter).toEqual({ type: { eq: 'DDR5' } });
  });

  it('activeSummary에 사람이 읽을 수 있는 요약 포함', () => {
    const parts = [makePart('motherboard', { ramType: 'DDR5', socket: 'LGA1700', formFactor: 'ATX' })];
    const result = computeConstraints('ram', parts);
    expect(result.activeSummary.length).toBeGreaterThan(0);
    expect(result.activeSummary[0]).toContain('DDR5');
  });
});
