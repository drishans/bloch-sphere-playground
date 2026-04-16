/**
 * OpenQASM 2.0 export from gate history.
 */
import type { GateRecord } from '../engine/quantum-state';

export function generateQASM(n: number, history: GateRecord[]): string {
  let qasm = 'OPENQASM 2.0;\ninclude "qelib1.inc";\n\n';
  qasm += `qreg q[${n}];\ncreg c[${n}];\n\n`;

  const gateMap: Record<string, string> = {
    X: 'x', Y: 'y', Z: 'z', H: 'h',
    S: 's', Sd: 'sdg', T: 't', Td: 'tdg',
  };
  const gateMap2: Record<string, string> = {
    CNOT: 'cx', CZ: 'cz', SWAP: 'swap', CH: 'ch',
  };

  for (const h of history) {
    if (h.type === 'single') {
      if (gateMap[h.gate]) {
        qasm += `${gateMap[h.gate]} q[${h.qubits[0]}];\n`;
      } else if (h.gate.startsWith('Rx(') || h.gate.startsWith('Ry(') || h.gate.startsWith('Rz(')) {
        const axis = h.gate[1].toLowerCase();
        const angle = h.gate.match(/\((.+)\)/)?.[1] || '0';
        qasm += `r${axis}(${angle}) q[${h.qubits[0]}];\n`;
      } else if (h.gate.startsWith('Rn(')) {
        qasm += `// Custom rotation: ${h.gate} on q[${h.qubits[0]}]\n`;
      }
    } else if (h.type === 'two') {
      if (gateMap2[h.gate]) {
        qasm += `${gateMap2[h.gate]} q[${h.qubits[0]}], q[${h.qubits[1]}];\n`;
      }
    } else if (h.type === 'measure') {
      qasm += `measure q[${h.qubits[0]}] -> c[${h.qubits[0]}];\n`;
    }
  }

  return qasm;
}
