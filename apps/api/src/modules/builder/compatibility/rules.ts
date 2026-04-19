import {
  CpuSpec,
  MotherboardSpec,
  RamSpec,
  GpuSpec,
  PsuSpec,
  CaseSpec,
  CoolerSpec,
  CpuSocketEnum,
} from '../../products/specs';

export interface CompatibilityIssue {
  severity: 'error' | 'warning';
  rule: string;
  message: string;
}

type Parts = {
  cpu?: CpuSpec;
  motherboard?: MotherboardSpec;
  ram?: RamSpec;
  gpu?: GpuSpec;
  psu?: PsuSpec;
  case?: CaseSpec;
  cooler?: CoolerSpec;
  cpuTdp?: number;
  gpuTdp?: number;
};

export function checkCompatibility(parts: Parts): CompatibilityIssue[] {
  const issues: CompatibilityIssue[] = [];

  // CPU ↔ Motherboard: socket must match
  if (parts.cpu && parts.motherboard) {
    if (parts.cpu.socket !== parts.motherboard.socket) {
      issues.push({
        severity: 'error',
        rule: 'cpu-mobo-socket',
        message: `CPU 소켓(${parts.cpu.socket})과 메인보드 소켓(${parts.motherboard.socket})이 다릅니다.`,
      });
    }
  }

  // CPU ↔ Motherboard: RAM type must match
  if (parts.cpu && parts.motherboard) {
    const moboRam = parts.motherboard.ramType;
    if (!parts.cpu.supportedRam.includes(moboRam)) {
      issues.push({
        severity: 'error',
        rule: 'cpu-mobo-ram-type',
        message: `CPU가 지원하는 메모리 타입(${parts.cpu.supportedRam.join('/')})과 메인보드 메모리 타입(${moboRam})이 다릅니다.`,
      });
    }
  }

  // RAM ↔ Motherboard: type must match
  if (parts.ram && parts.motherboard) {
    if (parts.ram.type !== parts.motherboard.ramType) {
      issues.push({
        severity: 'error',
        rule: 'ram-mobo-type',
        message: `RAM 타입(${parts.ram.type})과 메인보드 지원 타입(${parts.motherboard.ramType})이 다릅니다.`,
      });
    }
    // slots: assume 2 modules
    if (parts.ram.modules > parts.motherboard.ramSlots) {
      issues.push({
        severity: 'error',
        rule: 'ram-mobo-slots',
        message: `RAM 모듈 수(${parts.ram.modules})가 메인보드 슬롯 수(${parts.motherboard.ramSlots})를 초과합니다.`,
      });
    }
    // max capacity
    if (parts.motherboard.maxRamGb && parts.ram.capacityGb > parts.motherboard.maxRamGb) {
      issues.push({
        severity: 'error',
        rule: 'ram-mobo-max',
        message: `RAM 용량(${parts.ram.capacityGb}GB)이 메인보드 최대 지원 용량(${parts.motherboard.maxRamGb}GB)을 초과합니다.`,
      });
    }
  }

  // GPU ↔ Case: length clearance
  if (parts.gpu && parts.case) {
    if (parts.gpu.lengthMm > parts.case.maxGpuLengthMm) {
      issues.push({
        severity: 'error',
        rule: 'gpu-case-length',
        message: `GPU 길이(${parts.gpu.lengthMm}mm)가 케이스 최대 허용 길이(${parts.case.maxGpuLengthMm}mm)를 초과합니다.`,
      });
    } else if (parts.gpu.lengthMm > parts.case.maxGpuLengthMm - 20) {
      issues.push({
        severity: 'warning',
        rule: 'gpu-case-length-tight',
        message: `GPU 길이(${parts.gpu.lengthMm}mm)가 케이스 여유 공간이 20mm 미만입니다. 케이블 정리에 주의하세요.`,
      });
    }
  }

  // Motherboard ↔ Case: form factor
  if (parts.motherboard && parts.case) {
    if (!parts.case.supportedFormFactors.includes(parts.motherboard.formFactor)) {
      issues.push({
        severity: 'error',
        rule: 'mobo-case-formfactor',
        message: `메인보드 폼팩터(${parts.motherboard.formFactor})가 케이스에서 지원되지 않습니다. (지원: ${parts.case.supportedFormFactors.join(', ')})`,
      });
    }
  }

  // Cooler ↔ Case: height clearance
  if (parts.cooler?.heightMm && parts.case) {
    if (parts.cooler.heightMm > parts.case.maxCoolerHeightMm) {
      issues.push({
        severity: 'error',
        rule: 'cooler-case-height',
        message: `쿨러 높이(${parts.cooler.heightMm}mm)가 케이스 최대 허용 높이(${parts.case.maxCoolerHeightMm}mm)를 초과합니다.`,
      });
    }
  }

  // Cooler ↔ CPU: socket support
  if (parts.cooler && parts.cpu) {
    if (!parts.cooler.supportedSockets.includes(parts.cpu.socket)) {
      issues.push({
        severity: 'error',
        rule: 'cooler-cpu-socket',
        message: `쿨러가 CPU 소켓(${parts.cpu.socket})을 지원하지 않습니다. (지원: ${parts.cooler.supportedSockets.join(', ')})`,
      });
    }
  }

  // PSU ↔ Case: form factor
  if (parts.psu && parts.case) {
    if (parts.psu.formFactor !== parts.case.psuFormFactor) {
      issues.push({
        severity: 'error',
        rule: 'psu-case-formfactor',
        message: `PSU 폼팩터(${parts.psu.formFactor})와 케이스 지원 폼팩터(${parts.case.psuFormFactor})가 다릅니다.`,
      });
    }
  }

  // PSU wattage: must cover CPU + GPU TDP × 1.3
  if (parts.psu && (parts.cpuTdp || parts.gpuTdp)) {
    const required = Math.ceil(((parts.cpuTdp ?? 65) + (parts.gpuTdp ?? 0)) * 1.3);
    if (parts.psu.wattage < required) {
      issues.push({
        severity: 'error',
        rule: 'psu-wattage',
        message: `PSU 용량(${parts.psu.wattage}W)이 권장 최소 용량(${required}W)보다 낮습니다.`,
      });
    } else if (parts.psu.wattage < required + 100) {
      issues.push({
        severity: 'warning',
        rule: 'psu-wattage-tight',
        message: `PSU 용량(${parts.psu.wattage}W)의 여유가 100W 미만입니다. 향후 업그레이드 시 부족할 수 있습니다.`,
      });
    }
  }

  return issues;
}

/** GPU/CPU 성능 밸런스 경고 */
export function checkBottleneck(
  cpuScore: number | null,
  gpuScore: number | null,
  ratioRange: [number, number],
): CompatibilityIssue | null {
  if (!cpuScore || !gpuScore) return null;
  const ratio = gpuScore / cpuScore;
  if (ratio < ratioRange[0]) {
    return {
      severity: 'warning',
      rule: 'bottleneck-cpu',
      message: `CPU 대비 GPU 성능이 낮아 CPU 병목이 발생할 수 있습니다. (비율: ${ratio.toFixed(2)}, 권장: ${ratioRange[0]}~${ratioRange[1]})`,
    };
  }
  if (ratio > ratioRange[1]) {
    return {
      severity: 'warning',
      rule: 'bottleneck-gpu',
      message: `GPU 대비 CPU 성능이 낮아 GPU가 충분히 활용되지 않을 수 있습니다. (비율: ${ratio.toFixed(2)}, 권장: ${ratioRange[0]}~${ratioRange[1]})`,
    };
  }
  return null;
}
