'use client';

import { useState } from 'react';
import { BpToolStage, BpPanel, BpCopyBtn } from '@/components/blueprint';
import { Fingerprint, Download } from 'lucide-react';

type UuidVersion = 'v4' | 'v7';

export default function UuidGeneratorPage() {
  const [version, setVersion] = useState<UuidVersion>('v4');
  const [count, setCount] = useState(1);
  const [uuids, setUuids] = useState<string[]>([]);
  const [uppercase, setUppercase] = useState(false);
  const [withHyphens, setWithHyphens] = useState(true);
  const [withBraces, setWithBraces] = useState(false);

  const generateV4 = (): string => {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; const v = c === 'x' ? r : (r & 0x3) | 0x8; return v.toString(16); });
  };

  const generateV7 = (): string => {
    const now = Date.now();
    const timestamp = now.toString(16).padStart(12, '0');
    const randomPart1 = Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
    const randomPart2 = Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
    const randomPart3 = Math.floor(Math.random() * 0x100000000000).toString(16).padStart(12, '0');
    const versionAndVariant = '7' + (Math.floor(Math.random() * 4) | 0x8).toString(16);
    const uuid = `${timestamp.substring(0, 8)}-${timestamp.substring(8, 12)}-${versionAndVariant}${randomPart1}-${(Math.floor(Math.random() * 4) | 0x8).toString(16)}${randomPart2}-${randomPart3}`;
    return uuid.substring(0, 36);
  };

  const formatUuid = (uuid: string): string => {
    let formatted = uuid;
    if (!withHyphens) formatted = formatted.replace(/-/g, '');
    formatted = uppercase ? formatted.toUpperCase() : formatted.toLowerCase();
    if (withBraces) formatted = `{${formatted}}`;
    return formatted;
  };

  const generateUuids = () => {
    const generated: string[] = [];
    for (let i = 0; i < Math.min(count, 1000); i++) generated.push(formatUuid(version === 'v4' ? generateV4() : generateV7()));
    setUuids(generated);
  };

  const downloadAsTxt = () => {
    const blob = new Blob([uuids.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `uuids-${version}-${Date.now()}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <BpToolStage cat='time'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>UUID Generator</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Generate UUIDs (v4 random or v7 timestamp-based)</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-6xl mx-auto space-y-4'>

          <BpPanel title='Configuration'>
            <div className='flex flex-wrap gap-4 items-end mb-4'>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>UUID Version</label>
                <select value={version} onChange={(e) => setVersion(e.target.value as UuidVersion)} className='bp-input'>
                  <option value='v4'>UUID v4 (Random)</option>
                  <option value='v7'>UUID v7 (Timestamp-based)</option>
                </select>
              </div>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Count (1–1000)</label>
                <input type='number' min='1' max='1000' value={count}
                  onChange={(e) => setCount(Math.min(Math.max(1, parseInt(e.target.value) || 1), 1000))}
                  className='bp-input w-24 font-mono' />
              </div>
            </div>
            <div className='flex flex-wrap gap-4 mb-4'>
              {[['uppercase', uppercase, setUppercase, 'Uppercase'], ['withHyphens', withHyphens, setWithHyphens, 'With Hyphens'], ['withBraces', withBraces, setWithBraces, 'With Braces {}']].map(([, val, set, label]) => (
                <label key={label as string} className='flex items-center gap-2 cursor-pointer'>
                  <input type='checkbox' checked={val as boolean} onChange={(e) => (set as (v: boolean) => void)(e.target.checked)} className='w-4 h-4 rounded' />
                  <span className='text-sm text-gray-300'>{label as string}</span>
                </label>
              ))}
            </div>
            <button type='button' className='bp-btn bp-btn-solid' onClick={generateUuids}>
              <Fingerprint className='w-4 h-4 mr-2 inline' />GENERATE UUIDs
            </button>
          </BpPanel>

          {uuids.length > 0 && (
            <BpPanel title={`Generated UUIDs`} meta={`${uuids.length} UUIDs`}>
              <div className='bp-panel-actions mb-3 flex flex-wrap gap-2'>
                <BpCopyBtn text={uuids.join('\n')} label='COPY ALL' />
                <BpCopyBtn text={JSON.stringify(uuids, null, 2)} label='COPY AS ARRAY' />
                <BpCopyBtn text={uuids.join(',')} label='COPY AS CSV' />
                <button type='button' className='bp-btn' onClick={downloadAsTxt}>
                  <Download className='w-4 h-4 mr-1 inline' />DOWNLOAD .TXT
                </button>
              </div>
              <div className='bp-code-view p-3 max-h-[600px] overflow-auto'>
                <div className='space-y-1'>
                  {uuids.map((uuid, index) => (
                    <div key={index} className='flex items-center justify-between group hover:bg-gray-900 px-2 py-1 rounded'>
                      <code className='text-sm font-mono text-gray-300'>{uuid}</code>
                      <div className='opacity-0 group-hover:opacity-100 transition-opacity shrink-0'>
                        <BpCopyBtn text={uuid} label='COPY' />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </BpPanel>
          )}

          {uuids.length === 0 && (
            <div className='text-center text-gray-600 py-12'>
              <Fingerprint className='w-12 h-12 mx-auto mb-4 opacity-40' />
              <p className='text-sm'>Configure settings and click "Generate UUIDs" to get started</p>
            </div>
          )}
        </div>
      </div>
    </BpToolStage>
  );
}
