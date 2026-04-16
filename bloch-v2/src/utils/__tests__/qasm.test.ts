import { describe, it, expect } from 'vitest';
import { generateQASM } from '../qasm';
import type { GateRecord } from '../../engine/quantum-state';

describe('generateQASM', () => {
  it('produces valid QASM header', () => {
    const qasm = generateQASM(1, []);
    expect(qasm).toContain('OPENQASM 2.0;');
    expect(qasm).toContain('include "qelib1.inc";');
    expect(qasm).toContain('qreg q[1];');
    expect(qasm).toContain('creg c[1];');
  });

  it('adjusts register size to n', () => {
    const qasm = generateQASM(3, []);
    expect(qasm).toContain('qreg q[3];');
    expect(qasm).toContain('creg c[3];');
  });

  it('maps single-qubit gates correctly', () => {
    const history: GateRecord[] = [
      { gate: 'H', qubits: [0], type: 'single' },
      { gate: 'X', qubits: [1], type: 'single' },
      { gate: 'Z', qubits: [0], type: 'single' },
      { gate: 'S', qubits: [0], type: 'single' },
      { gate: 'Sd', qubits: [0], type: 'single' },
      { gate: 'T', qubits: [0], type: 'single' },
      { gate: 'Td', qubits: [0], type: 'single' },
      { gate: 'Y', qubits: [1], type: 'single' },
    ];
    const qasm = generateQASM(2, history);
    expect(qasm).toContain('h q[0];');
    expect(qasm).toContain('x q[1];');
    expect(qasm).toContain('z q[0];');
    expect(qasm).toContain('s q[0];');
    expect(qasm).toContain('sdg q[0];');
    expect(qasm).toContain('t q[0];');
    expect(qasm).toContain('tdg q[0];');
    expect(qasm).toContain('y q[1];');
  });

  it('maps two-qubit gates correctly', () => {
    const history: GateRecord[] = [
      { gate: 'CNOT', qubits: [0, 1], type: 'two' },
      { gate: 'CZ', qubits: [0, 1], type: 'two' },
      { gate: 'SWAP', qubits: [1, 0], type: 'two' },
    ];
    const qasm = generateQASM(2, history);
    expect(qasm).toContain('cx q[0], q[1];');
    expect(qasm).toContain('cz q[0], q[1];');
    expect(qasm).toContain('swap q[1], q[0];');
  });

  it('handles rotation gates', () => {
    const history: GateRecord[] = [
      { gate: 'Rx(π/2)', qubits: [0], type: 'single' },
      { gate: 'Ry(3.14)', qubits: [1], type: 'single' },
      { gate: 'Rz(π/4)', qubits: [0], type: 'single' },
    ];
    const qasm = generateQASM(2, history);
    expect(qasm).toContain('rx(π/2) q[0];');
    expect(qasm).toContain('ry(3.14) q[1];');
    expect(qasm).toContain('rz(π/4) q[0];');
  });

  it('handles measurement records', () => {
    const history: GateRecord[] = [
      { gate: 'Mz→|0⟩', qubits: [0], type: 'measure' },
    ];
    const qasm = generateQASM(1, history);
    expect(qasm).toContain('measure q[0] -> c[0];');
  });

  it('handles custom rotation with comment', () => {
    const history: GateRecord[] = [
      { gate: 'Rn(π/2)', qubits: [0], type: 'single' },
    ];
    const qasm = generateQASM(1, history);
    expect(qasm).toContain('// Custom rotation');
  });

  it('empty history produces only header', () => {
    const qasm = generateQASM(2, []);
    const lines = qasm.trim().split('\n').filter(l => l.trim().length > 0);
    expect(lines.length).toBe(4); // OPENQASM, include, qreg, creg
  });
});
