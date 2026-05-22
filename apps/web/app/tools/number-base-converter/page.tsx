'use client';

import { useState, useCallback } from 'react';
import { Binary, Trash2, AlertTriangle } from 'lucide-react';
import { BpToolStage, BpPanel, BpCopyBtn } from '@/components/blueprint';

type Base = 'decimal' | 'binary' | 'octal' | 'hex';
type Sign = 'unsigned' | 'signed';

interface BaseConfig { label: string; radix: number; placeholder: string; validChars: RegExp; prefix: string; }

const BASE_CONFIGS: Record<Base, BaseConfig> = {
  decimal: { label: 'Decimal', radix: 10, placeholder: '255', validChars: /^[0-9]*$/, prefix: '' },
  binary: { label: 'Binary', radix: 2, placeholder: '11111111', validChars: /^[01]*$/, prefix: '0b' },
  octal: { label: 'Octal', radix: 8, placeholder: '377', validChars: /^[0-7]*$/, prefix: '0o' },
  hex: { label: 'Hexadecimal', radix: 16, placeholder: 'FF', validChars: /^[0-9a-fA-F]*$/, prefix: '0x' },
};

const BIT_WIDTHS = [8, 16, 32] as const;

function toSigned(value: number, bits: number): number {
  const max = 2 ** (bits - 1);
  return value >= max ? value - 2 ** bits : value;
}

function chunkBinary(bin: string, chunkSize = 4): string {
  const padded = bin.padStart(Math.ceil(bin.length / chunkSize) * chunkSize, '0');
  return padded.match(/.{1,4}/g)?.join(' ') ?? padded;
}

export default function NumberBaseConverterPage() {
  const [values, setValues] = useState<Record<Base, string>>({ decimal: '', binary: '', octal: '', hex: '' });
  const [overflow, setOverflow] = useState(false);
  const [sign, setSign] = useState<Sign>('unsigned');

  const updateAll = useCallback((num: number) => {
    setOverflow(false);
    setValues({ decimal: num.toString(10), binary: num.toString(2), octal: num.toString(8), hex: num.toString(16).toUpperCase() });
  }, []);

  const handleChange = (base: Base, raw: string) => {
    const config = BASE_CONFIGS[base];
    if (raw === '') { setValues({ decimal: '', binary: '', octal: '', hex: '' }); setOverflow(false); return; }
    if (!config.validChars.test(raw)) return;
    const num = parseInt(raw, config.radix);
    if (isNaN(num)) { setValues((prev) => ({ ...prev, [base]: raw })); return; }
    if (num > Number.MAX_SAFE_INTEGER) { setOverflow(true); setValues((prev) => ({ ...prev, [base]: raw })); return; }
    updateAll(num);
    setValues((prev) => ({ ...prev, [base]: raw }));
  };

  const handleClearAll = () => { setValues({ decimal: '', binary: '', octal: '', hex: '' }); setOverflow(false); };

  const decimalNum = parseInt(values.decimal, 10);
  const hasValue = values.decimal !== '' && !isNaN(decimalNum);

  const getBitRepresentation = (bits: (typeof BIT_WIDTHS)[number]) => {
    if (!hasValue) return { fits: false, value: '0'.repeat(bits), signedValue: null };
    const max = 2 ** bits - 1;
    const fits = decimalNum >= 0 && decimalNum <= max;
    if (!fits) return { fits: false, value: 'overflow', signedValue: null };
    const bin = decimalNum.toString(2).padStart(bits, '0');
    const signedValue = sign === 'signed' ? toSigned(decimalNum, bits) : null;
    return { fits: true, value: bin, signedValue };
  };

  return (
    <BpToolStage cat='data'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <div className='flex items-center gap-3 mb-1'>
          <Binary className='w-5 h-5 text-gray-400' />
          <h1 className='text-xl sm:text-2xl font-semibold text-white'>Number Base Converter</h1>
        </div>
        <p className='text-xs sm:text-sm text-gray-400'>Convert numbers between Decimal, Binary, Octal, and Hex</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-4xl mx-auto space-y-4'>

          <BpPanel title='Options'>
            <div className='flex flex-wrap items-center gap-3'>
              <div className='flex rounded-md overflow-hidden border border-[hsla(0,0%,20%,1)]'>
                {(['unsigned', 'signed'] as Sign[]).map((s) => (
                  <button key={s} onClick={() => setSign(s)}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${sign === s ? 'bg-blue-600 text-white' : 'bg-[#1C1C1C] text-gray-400 hover:text-gray-200'}`}>
                    {s === 'unsigned' ? 'Unsigned' : "Signed (Two's Complement)"}
                  </button>
                ))}
              </div>
              <button className='bp-btn ml-auto' onClick={handleClearAll} type='button'>
                <Trash2 className='w-3.5 h-3.5 mr-1 inline' />CLEAR ALL
              </button>
            </div>
          </BpPanel>

          {overflow && (
            <div className='flex items-center gap-2 text-sm text-amber-400 bg-amber-950/40 border border-amber-800 px-3 py-2 rounded-md'>
              <AlertTriangle className='w-4 h-4 flex-shrink-0' />
              <span>Overflow — number exceeds Number.MAX_SAFE_INTEGER. Results may be inaccurate.</span>
            </div>
          )}

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            {(Object.entries(BASE_CONFIGS) as [Base, BaseConfig][]).map(([base, config]) => (
              <BpPanel key={base} title={config.label} meta={config.prefix || undefined}>
                <div className='flex gap-2 mb-2'>
                  <input
                    className='bp-input flex-1 font-mono text-base tracking-wider'
                    value={values[base]}
                    onChange={(e) => handleChange(base, e.target.value)}
                    placeholder={config.placeholder}
                    spellCheck={false}
                    autoComplete='off'
                  />
                  <BpCopyBtn text={values[base]} label='COPY' />
                </div>
                {base === 'binary' && values.binary && (
                  <p className='text-xs text-gray-500 font-mono break-all leading-relaxed'>{chunkBinary(values.binary)}</p>
                )}
              </BpPanel>
            ))}
          </div>

          {hasValue && (
            <BpPanel title='Bit Width Representation'>
              <div className='space-y-4'>
                {BIT_WIDTHS.map((bits) => {
                  const { fits, value, signedValue } = getBitRepresentation(bits);
                  return (
                    <div key={bits} className='space-y-1'>
                      <div className='flex items-center gap-2'>
                        <span className='text-xs font-medium text-gray-400 w-8'>{bits}-bit</span>
                        {!fits ? (
                          <span className='text-xs text-amber-500 flex items-center gap-1'>
                            <AlertTriangle className='w-3 h-3' />Does not fit in {bits} bits
                          </span>
                        ) : (
                          <span className='text-xs text-gray-500'>
                            {sign === 'signed' && signedValue !== null && signedValue !== decimalNum ? `Signed value: ${signedValue}` : `Fits in ${bits} bits`}
                          </span>
                        )}
                      </div>
                      {fits && (
                        <div className='flex flex-wrap gap-1'>
                          {value.match(/.{1,4}/g)?.map((chunk, i) => (
                            <span key={i} className='font-mono text-xs bg-[#121212] border border-[hsla(0,0%,15%,1)] px-1.5 py-0.5 rounded text-gray-300 tracking-widest'>{chunk}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </BpPanel>
          )}

          {!hasValue && !overflow && (
            <div className='text-center text-gray-600 py-12'>
              <Binary className='w-10 h-10 mx-auto mb-3 opacity-40' />
              <p className='text-sm'>Type a number in any field to convert all bases simultaneously</p>
            </div>
          )}
        </div>
      </div>
    </BpToolStage>
  );
}
