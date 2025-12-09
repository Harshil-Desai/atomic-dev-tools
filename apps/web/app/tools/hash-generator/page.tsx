'use client';

import { useState } from 'react';
import { Button, Card, CardContent, Textarea } from '@/ui';
import { Hash, Copy, Check } from 'lucide-react';
import CryptoJS from 'crypto-js';

type HashAlgorithm = 'md5' | 'sha1' | 'sha256' | 'sha512';
type OutputFormat = 'hex' | 'base64';

interface HashResult {
  algorithm: HashAlgorithm;
  value: string;
  length: number;
}

export default function HashGeneratorPage() {
  const [input, setInput] = useState('');
  const [algorithms, setAlgorithms] = useState<HashAlgorithm[]>(['md5', 'sha256']);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('hex');
  const [results, setResults] = useState<HashResult[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const generateHash = async (text: string, algorithm: HashAlgorithm, format: OutputFormat): Promise<string> => {
    if (!text) return '';

    let hash: string;

    switch (algorithm) {
      case 'md5':
        hash = CryptoJS.MD5(text).toString();
        break;
      case 'sha1':
        if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
          const encoder = new TextEncoder();
          const data = encoder.encode(text);
          const hashBuffer = await window.crypto.subtle.digest('SHA-1', data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        } else {
          hash = CryptoJS.SHA1(text).toString();
        }
        break;
      case 'sha256':
        if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
          const encoder = new TextEncoder();
          const data = encoder.encode(text);
          const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        } else {
          hash = CryptoJS.SHA256(text).toString();
        }
        break;
      case 'sha512':
        if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
          const encoder = new TextEncoder();
          const data = encoder.encode(text);
          const hashBuffer = await window.crypto.subtle.digest('SHA-512', data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        } else {
          hash = CryptoJS.SHA512(text).toString();
        }
        break;
    }

    if (format === 'base64') {
      // Convert hex to base64
      const bytes = hexStringToByteArray(hash);
      return btoa(String.fromCharCode(...bytes));
    }

    return hash;
  };

  const hexStringToByteArray = (hex: string): number[] => {
    const bytes: number[] = [];
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
  };

  const handleGenerate = async () => {
    if (!input.trim()) {
      setResults([]);
      return;
    }

    const generatedResults: HashResult[] = [];

    for (const algorithm of algorithms) {
      const hashValue = await generateHash(input, algorithm, outputFormat);
      generatedResults.push({
        algorithm,
        value: hashValue,
        length: hashValue.length,
      });
    }

    setResults(generatedResults);
  };

  const handleAlgorithmToggle = (algorithm: HashAlgorithm) => {
    if (algorithms.includes(algorithm)) {
      setAlgorithms(algorithms.filter((a) => a !== algorithm));
    } else {
      setAlgorithms([...algorithms, algorithm]);
    }
  };

  const handleCopy = async (value: string, algorithm: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(algorithm);
      setTimeout(() => setCopied(null), 2000);
    } catch (e) {
      console.error('Failed to copy');
    }
  };

  const getAlgorithmLabel = (algorithm: HashAlgorithm): string => {
    return algorithm.toUpperCase();
  };

  return (
    <div className='h-full flex flex-col'>
      {/* Header */}
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-6'>
        <h1 className='text-2xl font-bold text-white mb-2'>Hash Generator</h1>
        <p className='text-gray-400'>Generate cryptographic hashes for text input</p>
      </div>
      {/* Content */}
      <div className='flex-1 overflow-auto p-6'>
        <div className='max-w-6xl mx-auto space-y-6'>
          {/* Input */}
          <Card>
            <CardContent className='pt-6 space-y-4'>
              <label className='block text-sm font-medium text-gray-300'>Input Text</label>
              <Textarea
                placeholder='Enter text to hash...'
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={8}
                className='font-mono text-sm'
              />
            </CardContent>
          </Card>

          {/* Configuration */}
          <Card>
            <CardContent className='pt-6 space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-300 mb-2'>Hash Algorithms</label>
                <div className='flex flex-wrap gap-2'>
                  {(['md5', 'sha1', 'sha256', 'sha512'] as HashAlgorithm[]).map((algorithm) => (
                    <label
                      key={algorithm}
                      className='flex items-center gap-2 px-3 py-2 rounded-md border border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] cursor-pointer hover:bg-gray-750'
                    >
                      <input
                        type='checkbox'
                        checked={algorithms.includes(algorithm)}
                        onChange={() => handleAlgorithmToggle(algorithm)}
                        className='w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500'
                      />
                      <span className='text-sm text-gray-300'>{getAlgorithmLabel(algorithm)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-300 mb-2'>Output Format</label>
                <div className='flex gap-2'>
                  <Button
                    onClick={() => setOutputFormat('hex')}
                    variant={outputFormat === 'hex' ? 'default' : 'outline'}
                    size='sm'
                  >
                    Hex
                  </Button>
                  <Button
                    onClick={() => setOutputFormat('base64')}
                    variant={outputFormat === 'base64' ? 'default' : 'outline'}
                    size='sm'
                  >
                    Base64
                  </Button>
                </div>
              </div>
              <Button onClick={handleGenerate} disabled={!input.trim() || algorithms.length === 0} className='w-full' size='lg'>
                <Hash className='w-4 h-4 mr-2' />
                Generate Hashes
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          {results.length > 0 && (
            <div className='space-y-4'>
              {results.map((result) => (
                <Card key={result.algorithm}>
                  <CardContent className='pt-6'>
                    <div className='flex items-center justify-between mb-3'>
                      <h3 className='text-sm font-semibold text-gray-300'>{getAlgorithmLabel(result.algorithm)}</h3>
                      <div className='flex items-center gap-3'>
                        <span className='text-xs text-gray-500'>{result.length} chars</span>
                        <Button
                          onClick={() => handleCopy(result.value, result.algorithm)}
                          variant='outline'
                          size='sm'
                        >
                          {copied === result.algorithm ? (
                            <>
                              <Check className='w-4 h-4 mr-2' />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className='w-4 h-4 mr-2' />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className='bg-gray-950 rounded-md p-3 font-mono text-xs text-gray-300 break-all'>
                      {result.value}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!input.trim() && (
            <Card className='border-dashed'>
              <CardContent className='pt-6'>
                <div className='text-center text-gray-500 py-12'>
                  <Hash className='w-12 h-12 mx-auto mb-4 opacity-50' />
                  <p>Enter text and select algorithms to generate hashes</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

