'use client';

import { useState, useCallback } from 'react';
import { Binary, Copy, Check, Trash2, AlertTriangle } from 'lucide-react';
import { Button, Card, CardContent, Input } from '@/ui';

type Base = 'decimal' | 'binary' | 'octal' | 'hex';
type Sign = 'unsigned' | 'signed';

interface BaseConfig {
  label: string;
  radix: number;
  placeholder: string;
  validChars: RegExp;
  prefix: string;
}

const BASE_CONFIGS: Record<Base, BaseConfig> = {
  decimal: { label: 'Decimal', radix: 10, placeholder: '255', validChars: /^[0-9]*$/, prefix: '' },
  binary: { label: 'Binary', radix: 2, placeholder: '11111111', validChars: /^[01]*$/, prefix: '0b' },
  octal: { label: 'Octal', radix: 8, placeholder: '377', validChars: /^[0-7]*$/, prefix: '0o' },
  hex: { label: 'Hexadecimal', radix: 16, placeholder: 'FF', validChars: /^[0-9a-fA-F]*$/, prefix: '0x' },
};

const BIT_WIDTHS = [8, 16, 32] as const;

function toSigned(value: number, bits: number): number {
  const max = 2 ** (bits - 1);
  if (value >= max) return value - 2 ** bits;
  return value;
}

function toBinary32(value: number): string {
  // Use unsigned 32-bit interpretation
  const unsigned = value >>> 0;
  return unsigned.toString(2).padStart(32, '0');
}

function chunkBinary(bin: string, chunkSize: number = 4): string {
  const padded = bin.padStart(Math.ceil(bin.length / chunkSize) * chunkSize, '0');
  return padded.match(/.{1,4}/g)?.join(' ') ?? padded;
}

export default function NumberBaseConverterPage() {
  const [values, setValues] = useState<Record<Base, string>>({
    decimal: '',
    binary: '',
    octal: '',
    hex: '',
  });
  const [overflow, setOverflow] = useState(false);
  const [copied, setCopied] = useState<Base | null>(null);
  const [sign, setSign] = useState<Sign>('unsigned');

  const updateAll = useCallback((num: number, sourceBase: Base) => {
    setOverflow(false);
    setValues({
      decimal: num.toString(10),
      binary: num.toString(2),
      octal: num.toString(8),
      hex: num.toString(16).toUpperCase(),
    });
  }, []);

  const handleChange = (base: Base, raw: string) => {
    const config = BASE_CONFIGS[base];
    // Allow empty
    if (raw === '') {
      setValues({ decimal: '', binary: '', octal: '', hex: '' });
      setOverflow(false);
      return;
    }
    // Validate chars
    if (!config.validChars.test(raw)) return;

    const num = parseInt(raw, config.radix);
    if (isNaN(num)) {
      setValues((prev) => ({ ...prev, [base]: raw }));
      return;
    }

    if (num > Number.MAX_SAFE_INTEGER) {
      setOverflow(true);
      setValues((prev) => ({ ...prev, [base]: raw }));
      return;
    }

    updateAll(num, base);
    // Keep original casing in the source field
    setValues((prev) => ({ ...prev, [base]: raw }));
  };

  const handleCopy = async (base: Base) => {
    const val = values[base];
    if (!val) return;
    try {
      await navigator.clipboard.writeText(val);
      setCopied(base);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleClearAll = () => {
    setValues({ decimal: '', binary: '', octal: '', hex: '' });
    setOverflow(false);
    setCopied(null);
  };

  const decimalNum = parseInt(values.decimal, 10);
  const hasValue = values.decimal !== '' && !isNaN(decimalNum);

  // Bit width visualization
  const getBitRepresentation = (bits: (typeof BIT_WIDTHS)[number]): { fits: boolean; value: string; signedValue: number | null } => {
    if (!hasValue) return { fits: false, value: '0'.repeat(bits), signedValue: null };
    const max = 2 ** bits - 1;
    const fits = decimalNum >= 0 && decimalNum <= max;
    if (!fits) return { fits: false, value: 'overflow', signedValue: null };
    const bin = decimalNum.toString(2).padStart(bits, '0');
    const signedValue = sign === 'signed' ? toSigned(decimalNum, bits) : null;
    return { fits: true, value: bin, signedValue };
  };

  return (
    <div className='h-full flex flex-col'>
      <div className='border-b border-border bg-card p-4 sm:p-5 md:p-6'>
        <div className='flex items-center gap-3 mb-1'>
          <Binary className='w-5 h-5 text-muted-foreground' />
          <h1 className='text-xl sm:text-2xl font-semibold text-foreground'>Number Base Converter</h1>
        </div>
        <p className='text-xs sm:text-sm text-muted-foreground'>Convert numbers between Decimal, Binary, Octal, and Hex</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-4xl mx-auto space-y-4'>

          {/* Controls */}
          <Card>
            <CardContent className='pt-5'>
              <div className='flex flex-wrap items-center gap-3'>
                <div className='flex rounded-md overflow-hidden border border-[hsla(0,0%,20%,1)]'>
                  <button
                    onClick={() => setSign('unsigned')}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                      sign === 'unsigned' ? 'bg-blue-600 text-white' : 'bg-[#1C1C1C] text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Unsigned
                  </button>
                  <button
                    onClick={() => setSign('signed')}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                      sign === 'signed' ? 'bg-blue-600 text-white' : 'bg-[#1C1C1C] text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Signed (Two's Complement)
                  </button>
                </div>
                <Button onClick={handleClearAll} variant='outline' size='sm' className='ml-auto'>
                  <Trash2 className='w-3.5 h-3.5 mr-1.5' />
                  Clear All
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Overflow warning */}
          {overflow && (
            <div className='flex items-center gap-2 text-sm text-amber-400 bg-amber-950/40 border border-amber-800 px-3 py-2 rounded-md'>
              <AlertTriangle className='w-4 h-4 flex-shrink-0' />
              <span>Overflow — number exceeds Number.MAX_SAFE_INTEGER (2<sup>53</sup> - 1). Results may be inaccurate.</span>
            </div>
          )}

          {/* Base inputs */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            {(Object.entries(BASE_CONFIGS) as [Base, BaseConfig][]).map(([base, config]) => (
              <Card key={base}>
                <CardContent className='pt-5 space-y-2'>
                  <div className='flex items-center justify-between'>
                    <label className='text-sm font-medium text-gray-300'>
                      {config.label}
                      {config.prefix && (
                        <span className='ml-1.5 text-xs text-gray-500 font-mono'>{config.prefix}</span>
                      )}
                    </label>
                    <Button
                      onClick={() => handleCopy(base)}
                      variant='outline'
                      size='sm'
                      disabled={!values[base]}
                    >
                      {copied === base ? (
                        <>
                          <Check className='w-3.5 h-3.5 mr-1' />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className='w-3.5 h-3.5 mr-1' />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <Input
                    value={values[base]}
                    onChange={(e) => handleChange(base, e.target.value)}
                    placeholder={config.placeholder}
                    className='font-mono text-base tracking-wider'
                    spellCheck={false}
                    autoComplete='off'
                  />
                  {base === 'binary' && values.binary && (
                    <p className='text-xs text-gray-500 font-mono break-all leading-relaxed'>
                      {chunkBinary(values.binary)}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Bit width visualization */}
          {hasValue && (
            <Card>
              <CardContent className='pt-5 space-y-4'>
                <h3 className='text-sm font-medium text-gray-300'>Bit Width Representation</h3>
                <div className='space-y-4'>
                  {BIT_WIDTHS.map((bits) => {
                    const { fits, value, signedValue } = getBitRepresentation(bits);
                    return (
                      <div key={bits} className='space-y-1'>
                        <div className='flex items-center gap-2'>
                          <span className='text-xs font-medium text-gray-400 w-8'>{bits}-bit</span>
                          {!fits ? (
                            <span className='text-xs text-amber-500 flex items-center gap-1'>
                              <AlertTriangle className='w-3 h-3' />
                              Does not fit in {bits} bits
                            </span>
                          ) : (
                            <span className='text-xs text-gray-500'>
                              {sign === 'signed' && signedValue !== null && signedValue !== decimalNum
                                ? `Signed value: ${signedValue}`
                                : `Fits in ${bits} bits`}
                            </span>
                          )}
                        </div>
                        {fits && (
                          <div className='flex flex-wrap gap-1'>
                            {value.match(/.{1,4}/g)?.map((chunk, i) => (
                              <span
                                key={i}
                                className='font-mono text-xs bg-[#121212] border border-[hsla(0,0%,15%,1)] px-1.5 py-0.5 rounded text-gray-300 tracking-widest'
                              >
                                {chunk}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {!hasValue && !overflow && (
            <Card className='border-dashed'>
              <CardContent className='pt-6'>
                <div className='text-center text-gray-500 py-10'>
                  <Binary className='w-10 h-10 mx-auto mb-3 opacity-40' />
                  <p className='text-sm'>Type a number in any field to convert all bases simultaneously</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
