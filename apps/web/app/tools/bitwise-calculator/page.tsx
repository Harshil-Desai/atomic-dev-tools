'use client';

import { useState } from 'react';
import { BpToolStage, BpPanel, BpCopyBtn } from '@/components/blueprint';

// ─── types ────────────────────────────────────────────────────────────────────

type Operation = 'AND' | 'OR' | 'XOR' | 'NOT' | 'LSHIFT' | 'RSHIFT' | 'SWAP';
type BitWidth = 8 | 16 | 32;
type InputBase = 'dec' | 'hex' | 'bin';

// ─── helpers ──────────────────────────────────────────────────────────────────

function parseInput(val: string, base: InputBase): number | null {
  const s = val.trim().replace(/^0x/i, '').replace(/\s/g, '');
  if (!s) return null;
  let n: number;
  if (base === 'hex') n = parseInt(s, 16);
  else if (base === 'bin') n = parseInt(s.replace(/_/g, ''), 2);
  else n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}

function mask(n: number, width: BitWidth): number {
  if (width === 8) return n & 0xff;
  if (width === 16) return n & 0xffff;
  return n >>> 0;
}

function swapBytes(n: number, width: BitWidth): number {
  if (width === 8) return n & 0xff;
  if (width === 16) {
    return ((n & 0xff) << 8) | ((n >> 8) & 0xff);
  }
  const b0 = (n >>> 24) & 0xff;
  const b1 = (n >>> 16) & 0xff;
  const b2 = (n >>> 8) & 0xff;
  const b3 = n & 0xff;
  return ((b3 << 24) | (b2 << 16) | (b1 << 8) | b0) >>> 0;
}

function compute(a: number, b: number, op: Operation, width: BitWidth): number {
  switch (op) {
    case 'AND': return mask(a & b, width);
    case 'OR': return mask(a | b, width);
    case 'XOR': return mask(a ^ b, width);
    case 'NOT': return mask(~a, width);
    case 'LSHIFT': return mask(a << (b % width), width);
    case 'RSHIFT': return mask(a >>> (b % width), width);
    case 'SWAP': return swapBytes(a, width);
  }
}

function toBin(n: number, width: BitWidth): string {
  return n.toString(2).padStart(width, '0');
}

function toHex(n: number, width: BitWidth): string {
  const digits = width / 4;
  return '0x' + n.toString(16).toUpperCase().padStart(digits, '0');
}

function groupBits(bin: string): string {
  return bin.replace(/(.{4})/g, '$1 ').trim();
}

// ─── bit display component ────────────────────────────────────────────────────

function BitRow({ value, width, label }: { value: number; width: BitWidth; label: string }) {
  const bin = toBin(value, width);
  return (
    <div className='space-y-1'>
      <div className='flex items-center justify-between'>
        <span className='text-xs text-gray-500'>{label}</span>
        <span className='font-mono text-xs text-gray-400'>{toHex(value, width)} | {value}</span>
      </div>
      <div className='flex gap-0.5 flex-wrap'>
        {bin.split('').map((bit, i) => (
          <div key={i} className={`w-6 h-6 flex items-center justify-center rounded text-xs font-mono font-bold ${bit === '1' ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50' : 'bg-[#1a1a1a] text-gray-600 border border-[hsla(0,0%,15%,1)]'}`}>
            {bit}
          </div>
        ))}
      </div>
      <div className='flex gap-0.5 flex-wrap'>
        {Array.from({ length: width }, (_, i) => width - 1 - i).map((pos, i) => (
          <div key={i} className='w-6 text-center'>
            {pos % 4 === 0 || pos === 0 ? <span className='text-[9px] text-gray-600'>{pos}</span> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── component ────────────────────────────────────────────────────────────────

const UNARY_OPS: Operation[] = ['NOT', 'SWAP'];

export default function BitwiseCalculatorPage() {
  const [inputA, setInputA] = useState('42');
  const [inputB, setInputB] = useState('15');
  const [baseA, setBaseA] = useState<InputBase>('dec');
  const [baseB, setBaseB] = useState<InputBase>('dec');
  const [op, setOp] = useState<Operation>('AND');
  const [width, setWidth] = useState<BitWidth>(8);

  const a = parseInput(inputA, baseA);
  const b = parseInput(inputB, baseB);
  const isUnary = UNARY_OPS.includes(op);

  const aValid = a !== null;
  const bValid = isUnary || b !== null;
  const canCompute = aValid && bValid;

  const result = canCompute ? compute(a!, isUnary ? 0 : b!, op, width) : null;

  const ops: { label: string; value: Operation; sym: string }[] = [
    { label: 'AND', value: 'AND', sym: '&' },
    { label: 'OR', value: 'OR', sym: '|' },
    { label: 'XOR', value: 'XOR', sym: '^' },
    { label: 'NOT', value: 'NOT', sym: '~' },
    { label: 'Left Shift', value: 'LSHIFT', sym: '<<' },
    { label: 'Right Shift', value: 'RSHIFT', sym: '>>' },
    { label: 'Swap Endian', value: 'SWAP', sym: '⇄' },
  ];

  const bases: { label: string; value: InputBase }[] = [
    { label: 'Dec', value: 'dec' },
    { label: 'Hex', value: 'hex' },
    { label: 'Bin', value: 'bin' },
  ];

  return (
    <BpToolStage cat='infra'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>Bitwise Calculator</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Visual calculator for bit masking, shifting, and endianness swapping</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-3xl mx-auto space-y-4'>

          <BpPanel title='Bit Width & Operation'>
            <div className='space-y-4'>
              <div>
                <label className='block text-xs text-gray-500 mb-2'>Bit Width</label>
                <div className='flex gap-2'>
                  {([8, 16, 32] as BitWidth[]).map((w) => (
                    <button key={w} type='button' onClick={() => setWidth(w)}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${width === w ? 'bg-blue-600 text-white' : 'bp-btn'}`}>
                      {w}-bit
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className='block text-xs text-gray-500 mb-2'>Operation</label>
                <div className='flex flex-wrap gap-2'>
                  {ops.map((o) => (
                    <button key={o.value} type='button' onClick={() => setOp(o.value)}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${op === o.value ? 'bg-blue-600 text-white' : 'bp-btn'}`}>
                      <span className='font-mono mr-1 text-blue-300'>{o.sym}</span>{o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <label className='block text-xs text-gray-500'>Operand A</label>
                  <div className='flex gap-1'>
                    {bases.map((bv) => (
                      <button key={bv.value} type='button' onClick={() => setBaseA(bv.value)}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${baseA === bv.value ? 'bg-blue-600 text-white' : 'bp-btn'}`}>
                        {bv.label}
                      </button>
                    ))}
                  </div>
                  <input value={inputA} onChange={(e) => setInputA(e.target.value)}
                    placeholder={baseA === 'hex' ? '0x2A' : baseA === 'bin' ? '00101010' : '42'}
                    className={`bp-input w-full font-mono ${!aValid && inputA ? 'border-red-500/50' : ''}`} />
                </div>
                {!isUnary && (
                  <div className='space-y-2'>
                    <label className='block text-xs text-gray-500'>Operand B</label>
                    <div className='flex gap-1'>
                      {bases.map((bv) => (
                        <button key={bv.value} type='button' onClick={() => setBaseB(bv.value)}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${baseB === bv.value ? 'bg-blue-600 text-white' : 'bp-btn'}`}>
                          {bv.label}
                        </button>
                      ))}
                    </div>
                    <input value={inputB} onChange={(e) => setInputB(e.target.value)}
                      placeholder={baseB === 'hex' ? '0x0F' : baseB === 'bin' ? '00001111' : '15'}
                      className={`bp-input w-full font-mono ${!bValid && inputB ? 'border-red-500/50' : ''}`} />
                  </div>
                )}
              </div>
            </div>
          </BpPanel>

          {canCompute && result !== null && (
            <BpPanel title='Bit Visualization'>
              <div className='space-y-5'>
                <BitRow value={mask(a!, width)} width={width} label='A' />
                {!isUnary && <BitRow value={mask(b!, width)} width={width} label='B' />}
                <div className='border-t border-[hsla(0,0%,20%,1)] pt-4'>
                  <div className='flex items-center gap-2 mb-3'>
                    <span className='text-xs text-gray-500'>Result</span>
                    <span className='font-mono text-xs text-yellow-400'>({op})</span>
                  </div>
                  <BitRow value={result} width={width} label='Result' />
                </div>
              </div>
            </BpPanel>
          )}

          {canCompute && result !== null && (
            <BpPanel title='Result Representations'>
              <div className='space-y-2'>
                {[
                  { label: 'Decimal', value: result.toString(10) },
                  { label: 'Hexadecimal', value: toHex(result, width) },
                  { label: 'Binary', value: groupBits(toBin(result, width)) },
                  { label: 'Octal', value: '0o' + result.toString(8) },
                ].map(({ label, value }) => (
                  <div key={label} className='flex items-center gap-2'>
                    <span className='text-xs text-gray-500 w-24 shrink-0'>{label}</span>
                    <code className='flex-1 bp-code-view px-3 py-1.5 font-mono text-sm text-gray-200'>{value}</code>
                    <BpCopyBtn text={value} label='COPY' />
                  </div>
                ))}
              </div>
            </BpPanel>
          )}

          <BpPanel title='Common Patterns'>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs'>
              {[
                ['Check bit n', 'val & (1 << n)'],
                ['Set bit n', 'val | (1 << n)'],
                ['Clear bit n', 'val & ~(1 << n)'],
                ['Toggle bit n', 'val ^ (1 << n)'],
                ['Check if power of 2', 'val & (val - 1) == 0'],
                ['Lower nibble', 'val & 0x0F'],
                ['Upper nibble (8-bit)', '(val >> 4) & 0x0F'],
                ['Align to 4 bytes', '(val + 3) & ~3'],
              ].map(([desc, pattern]) => (
                <div key={desc} className='flex gap-2'>
                  <span className='text-gray-500 w-36 shrink-0'>{desc}</span>
                  <code className='text-blue-400 font-mono'>{pattern}</code>
                </div>
              ))}
            </div>
          </BpPanel>

        </div>
      </div>
    </BpToolStage>
  );
}
