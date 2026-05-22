'use client';

import { useState } from 'react';
import { BpToolStage, BpPanel, BpCopyBtn } from '@/components/blueprint';
import { AlertCircle, ArrowUpDown } from 'lucide-react';

export default function Base64EncoderPage() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (value: string) => {
    setInput(value);
    setError(null);
    if (!value.trim()) { setOutput(''); return; }
    try {
      if (mode === 'encode') {
        setOutput(btoa(unescape(encodeURIComponent(value))));
      } else {
        try {
          setOutput(decodeURIComponent(escape(atob(value))));
        } catch {
          setOutput('');
        }
      }
    } catch {
      setOutput('');
    }
  };

  const toggleMode = () => {
    setMode(mode === 'encode' ? 'decode' : 'encode');
    setInput(output);
    setOutput(input);
    setError(null);
  };

  return (
    <BpToolStage cat='data'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-semibold text-white mb-1'>Base64 Encoder/Decoder</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Encode or decode text to/from Base64 format instantly</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-6xl mx-auto'>
          <div className='bp-layout-2col'>
            <BpPanel title={mode === 'encode' ? 'Text to Encode' : 'Base64 to Decode'}>
              <div className='bp-panel-actions mb-3'>
                <button className='bp-btn' onClick={toggleMode} type='button'>
                  <ArrowUpDown className='w-3.5 h-3.5 mr-1 inline' />SWITCH MODE
                </button>
              </div>
              <textarea
                className='bp-textarea font-mono text-sm'
                placeholder={mode === 'encode' ? 'Enter text to encode to Base64...' : 'Enter Base64 string to decode...'}
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                rows={12}
              />
              {error && (
                <div className='flex items-start gap-2 mt-2'>
                  <AlertCircle className='w-4 h-4 text-red-400 flex-shrink-0 mt-0.5' />
                  <p className='text-xs text-red-300'>{error}</p>
                </div>
              )}
            </BpPanel>

            <BpPanel title={mode === 'encode' ? 'Base64 Output' : 'Decoded Text'}>
              <div className='bp-panel-actions mb-3'>
                <BpCopyBtn text={output} label='COPY' />
              </div>
              <textarea
                className='bp-textarea font-mono text-sm'
                placeholder={mode === 'encode' ? 'Base64 encoded output will appear here...' : 'Decoded text will appear here...'}
                value={output}
                readOnly
                rows={12}
              />
            </BpPanel>
          </div>
        </div>
      </div>
    </BpToolStage>
  );
}
