'use client';

import { useState } from 'react';
import { BpToolStage, BpPanel, BpCopyBtn } from '@/components/blueprint';
import { Hash } from 'lucide-react';
import CryptoJS from 'crypto-js';

type HashAlgorithm = 'md5' | 'sha1' | 'sha256' | 'sha512';
type OutputFormat = 'hex' | 'base64';

interface HashResult { algorithm: HashAlgorithm; value: string; length: number; }

export default function HashGeneratorPage() {
  const [input, setInput] = useState('');
  const [algorithms, setAlgorithms] = useState<HashAlgorithm[]>(['md5', 'sha256']);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('hex');
  const [results, setResults] = useState<HashResult[]>([]);

  const hexStringToByteArray = (hex: string): number[] => {
    const bytes: number[] = [];
    for (let i = 0; i < hex.length; i += 2) bytes.push(parseInt(hex.substr(i, 2), 16));
    return bytes;
  };

  const generateHash = async (text: string, algorithm: HashAlgorithm, format: OutputFormat): Promise<string> => {
    if (!text) return '';
    let hash: string;
    if (algorithm === 'md5') {
      hash = CryptoJS.MD5(text).toString();
    } else {
      const subtleAlg = algorithm === 'sha1' ? 'SHA-1' : algorithm === 'sha256' ? 'SHA-256' : 'SHA-512';
      if (typeof window !== 'undefined' && window.crypto?.subtle) {
        const data = new TextEncoder().encode(text);
        const buf = await window.crypto.subtle.digest(subtleAlg, data);
        hash = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
      } else {
        hash = (algorithm === 'sha1' ? CryptoJS.SHA1 : algorithm === 'sha256' ? CryptoJS.SHA256 : CryptoJS.SHA512)(text).toString();
      }
    }
    if (format === 'base64') return btoa(String.fromCharCode(...hexStringToByteArray(hash)));
    return hash;
  };

  const handleGenerate = async () => {
    if (!input.trim()) { setResults([]); return; }
    const generated: HashResult[] = [];
    for (const alg of algorithms) {
      const value = await generateHash(input, alg, outputFormat);
      generated.push({ algorithm: alg, value, length: value.length });
    }
    setResults(generated);
  };

  const handleAlgorithmToggle = (algorithm: HashAlgorithm) => {
    setAlgorithms((prev) => prev.includes(algorithm) ? prev.filter((a) => a !== algorithm) : [...prev, algorithm]);
  };

  return (
    <BpToolStage cat='data'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>Hash Generator</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Generate cryptographic hashes for text input</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-3xl mx-auto space-y-4'>

          <BpPanel title='Input Text'>
            <textarea className='bp-textarea font-mono text-sm' placeholder='Enter text to hash...' value={input} onChange={(e) => setInput(e.target.value)} rows={8} />
          </BpPanel>

          <BpPanel title='Configuration'>
            <div className='space-y-4'>
              <div>
                <label className='block text-xs text-gray-500 mb-2'>Hash Algorithms</label>
                <div className='flex flex-wrap gap-2'>
                  {(['md5', 'sha1', 'sha256', 'sha512'] as HashAlgorithm[]).map((alg) => (
                    <label key={alg} className='flex items-center gap-2 px-3 py-2 rounded border border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] cursor-pointer hover:bg-[#222] transition-colors'>
                      <input type='checkbox' checked={algorithms.includes(alg)} onChange={() => handleAlgorithmToggle(alg)} className='w-4 h-4' />
                      <span className='text-sm text-gray-300'>{alg.toUpperCase()}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className='block text-xs text-gray-500 mb-2'>Output Format</label>
                <div className='flex gap-2'>
                  {(['hex', 'base64'] as OutputFormat[]).map((f) => (
                    <button key={f} onClick={() => setOutputFormat(f)} type='button'
                      className={`px-3 py-1.5 text-sm rounded border transition-colors ${outputFormat === f ? 'bg-blue-600 text-white border-blue-600' : 'border-[hsla(0,0%,20%,1)] text-gray-400 hover:text-gray-200'}`}>
                      {f === 'hex' ? 'Hex' : 'Base64'}
                    </button>
                  ))}
                </div>
              </div>
              <button className='bp-btn bp-btn-solid w-full' onClick={handleGenerate} disabled={!input.trim() || algorithms.length === 0} type='button'>
                <Hash className='w-4 h-4 mr-2 inline' />GENERATE HASHES
              </button>
            </div>
          </BpPanel>

          {results.length > 0 && (
            <BpPanel title='Results'>
              <div className='space-y-4'>
                {results.map((result) => (
                  <div key={result.algorithm}>
                    <div className='flex items-center justify-between mb-1'>
                      <span className='text-xs font-mono font-semibold text-gray-300'>{result.algorithm.toUpperCase()}</span>
                      <div className='flex items-center gap-2'>
                        <span className='text-xs text-gray-600'>{result.length} chars</span>
                        <BpCopyBtn text={result.value} label='COPY' />
                      </div>
                    </div>
                    <div className='bp-code-view'>
                      <pre className='bp-code-pre break-all whitespace-pre-wrap'>{result.value}</pre>
                    </div>
                  </div>
                ))}
              </div>
            </BpPanel>
          )}

          {!input.trim() && (
            <div className='text-center text-gray-600 py-12'>
              <Hash className='w-12 h-12 mx-auto mb-4 opacity-40' />
              <p className='text-sm'>Enter text and select algorithms to generate hashes</p>
            </div>
          )}
        </div>
      </div>
    </BpToolStage>
  );
}
