'use client';

import { useState } from 'react';
import { Button, Card, CardContent, Input, Textarea } from '@/ui';
import { Fingerprint, Copy, Check, Download } from 'lucide-react';

type UuidVersion = 'v4' | 'v7';

export default function UuidGeneratorPage() {
  const [version, setVersion] = useState<UuidVersion>('v4');
  const [count, setCount] = useState(1);
  const [uuids, setUuids] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [uppercase, setUppercase] = useState(false);
  const [withHyphens, setWithHyphens] = useState(true);
  const [withBraces, setWithBraces] = useState(false);

  // UUID v4 generator using crypto.randomUUID()
  const generateV4 = (): string => {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    // Fallback if crypto.randomUUID is not available
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  // UUID v7 generator (simplified version - timestamp-based)
  const generateV7 = (): string => {
    const now = Date.now();
    const timestamp = now.toString(16).padStart(12, '0');

    // Random part (80 bits)
    const randomPart1 = Math.floor(Math.random() * 0x10000)
      .toString(16)
      .padStart(4, '0');
    const randomPart2 = Math.floor(Math.random() * 0x10000)
      .toString(16)
      .padStart(4, '0');
    const randomPart3 = Math.floor(Math.random() * 0x100000000000)
      .toString(16)
      .padStart(12, '0');

    // Version 7 (0111) and variant (10)
    const versionAndVariant = '7' + (Math.floor(Math.random() * 4) | 0x8).toString(16);

    const uuid = `${timestamp.substring(0, 8)}-${timestamp.substring(8, 12)}-${versionAndVariant}${randomPart1}-${(
      Math.floor(Math.random() * 4) | 0x8
    ).toString(16)}${randomPart2}-${randomPart3}`;

    return uuid.substring(0, 36); // Ensure it's exactly 36 characters with hyphens
  };

  const formatUuid = (uuid: string): string => {
    let formatted = uuid;

    if (!withHyphens) {
      formatted = formatted.replace(/-/g, '');
    }

    if (uppercase) {
      formatted = formatted.toUpperCase();
    } else {
      formatted = formatted.toLowerCase();
    }

    if (withBraces) {
      formatted = `{${formatted}}`;
    }

    return formatted;
  };

  const generateUuids = () => {
    const generated: string[] = [];
    const maxCount = Math.min(count, 1000);

    for (let i = 0; i < maxCount; i++) {
      const uuid = version === 'v4' ? generateV4() : generateV7();
      generated.push(formatUuid(uuid));
    }

    setUuids(generated);
  };

  const handleCopy = async (text: string, format: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(format);
      setTimeout(() => setCopied(null), 2000);
    } catch (e) {
      console.error('Failed to copy');
    }
  };

  const copyAll = () => {
    const text = uuids.join('\n');
    handleCopy(text, 'all');
  };

  const copyAsArray = () => {
    const arrayText = JSON.stringify(uuids, null, 2);
    handleCopy(arrayText, 'array');
  };

  const copyAsCsv = () => {
    const csvText = uuids.join(',');
    handleCopy(csvText, 'csv');
  };

  const downloadAsTxt = () => {
    const text = uuids.join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uuids-${version}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const validateUuid = (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  return (
    <div className='h-full flex flex-col'>
      {/* Header */}
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-6'>
        <h1 className='text-2xl font-bold text-white mb-2'>UUID Generator</h1>
        <p className='text-gray-400'>Generate UUIDs (v4 random or v7 timestamp-based)</p>
      </div>
      {/* Content */}
      <div className='flex-1 overflow-auto p-6'>
        <div className='max-w-6xl mx-auto space-y-6'>
          {/* Configuration */}
          <Card>
            <CardContent className='pt-6 space-y-4'>
              <div className='grid md:grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>UUID Version</label>
                  <select
                    value={version}
                    onChange={(e) => setVersion(e.target.value as UuidVersion)}
                    className='w-full h-10 px-3 rounded-md border border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                  >
                    <option value='v4'>UUID v4 (Random)</option>
                    <option value='v7'>UUID v7 (Timestamp-based)</option>
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Generate Count (1-1000)</label>
                  <Input
                    type='number'
                    min='1'
                    max='1000'
                    value={count}
                    onChange={(e) => setCount(Math.min(Math.max(1, parseInt(e.target.value) || 1), 1000))}
                    className='w-full'
                  />
                </div>
              </div>
              <div className='grid md:grid-cols-3 gap-4'>
                <label className='flex items-center gap-2 text-sm text-gray-300 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={uppercase}
                    onChange={(e) => setUppercase(e.target.checked)}
                    className='w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500'
                  />
                  Uppercase
                </label>
                <label className='flex items-center gap-2 text-sm text-gray-300 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={withHyphens}
                    onChange={(e) => setWithHyphens(e.target.checked)}
                    className='w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500'
                  />
                  With Hyphens
                </label>
                <label className='flex items-center gap-2 text-sm text-gray-300 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={withBraces}
                    onChange={(e) => setWithBraces(e.target.checked)}
                    className='w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500'
                  />
                  With Braces {'{}'}
                </label>
              </div>
              <Button onClick={generateUuids} className='w-full' size='lg'>
                <Fingerprint className='w-4 h-4 mr-2' />
                Generate UUIDs
              </Button>
            </CardContent>
          </Card>

          {/* Output Actions */}
          {uuids.length > 0 && (
            <Card>
              <CardContent className='pt-6'>
                <div className='flex flex-wrap gap-2'>
                  <Button onClick={copyAll} variant='outline' size='sm'>
                    <Copy className='w-4 h-4 mr-2' />
                    Copy All
                  </Button>
                  <Button onClick={copyAsArray} variant='outline' size='sm'>
                    <Copy className='w-4 h-4 mr-2' />
                    Copy as Array
                  </Button>
                  <Button onClick={copyAsCsv} variant='outline' size='sm'>
                    <Copy className='w-4 h-4 mr-2' />
                    Copy as CSV
                  </Button>
                  <Button onClick={downloadAsTxt} variant='outline' size='sm'>
                    <Download className='w-4 h-4 mr-2' />
                    Download .txt
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* UUIDs List */}
          {uuids.length > 0 && (
            <Card>
              <CardContent className='pt-6'>
                <div className='flex items-center justify-between mb-3'>
                  <h3 className='text-sm font-semibold text-gray-300'>Generated UUIDs ({uuids.length})</h3>
                  {copied && (
                    <span className='text-xs text-green-400 flex items-center gap-1'>
                      <Check className='w-3 h-3' />
                      Copied!
                    </span>
                  )}
                </div>
                <div className='bg-gray-950 rounded-md p-3 max-h-[600px] overflow-auto'>
                  <div className='space-y-1'>
                    {uuids.map((uuid, index) => (
                      <div
                        key={index}
                        className='flex items-center justify-between group hover:bg-gray-900 px-2 py-1 rounded'
                      >
                        <code className='text-sm font-mono text-gray-300'>{uuid}</code>
                        <Button
                          onClick={() => handleCopy(uuid, `uuid-${index}`)}
                          variant='ghost'
                          size='sm'
                          className='opacity-0 group-hover:opacity-100'
                        >
                          {copied === `uuid-${index}` ? <Check className='w-3 h-3' /> : <Copy className='w-3 h-3' />}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {uuids.length === 0 && (
            <Card className='border-dashed'>
              <CardContent className='pt-6'>
                <div className='text-center text-gray-500 py-12'>
                  <Fingerprint className='w-12 h-12 mx-auto mb-4 opacity-50' />
                  <p>Configure settings and click "Generate UUIDs" to get started</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
