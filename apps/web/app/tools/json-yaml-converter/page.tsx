'use client';

import { useState } from 'react';
import { Button, Card, CardContent, Textarea } from '@/ui';
import { ArrowLeftRight, Copy, Check, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import yaml from 'js-yaml';

export default function JsonYamlConverterPage() {
  const [jsonInput, setJsonInput] = useState('');
  const [yamlInput, setYamlInput] = useState('');
  const [jsonOutput, setJsonOutput] = useState('');
  const [yamlOutput, setYamlOutput] = useState('');
  const [jsonValid, setJsonValid] = useState<boolean | null>(null);
  const [yamlValid, setYamlValid] = useState<boolean | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [yamlError, setYamlError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [yamlIndent, setYamlIndent] = useState(2);
  const [jsonIndent, setJsonIndent] = useState(2);
  const [compactJson, setCompactJson] = useState(false);

  const validateJson = (text: string): boolean => {
    if (!text.trim()) {
      setJsonValid(null);
      setJsonError(null);
      return false;
    }
    try {
      JSON.parse(text);
      setJsonValid(true);
      setJsonError(null);
      return true;
    } catch (e) {
      setJsonValid(false);
      setJsonError(e instanceof Error ? e.message : 'Invalid JSON');
      return false;
    }
  };

  const validateYaml = (text: string): boolean => {
    if (!text.trim()) {
      setYamlValid(null);
      setYamlError(null);
      return false;
    }
    try {
      yaml.load(text);
      setYamlValid(true);
      setYamlError(null);
      return true;
    } catch (e) {
      setYamlValid(false);
      setYamlError(e instanceof Error ? e.message : 'Invalid YAML');
      return false;
    }
  };

  const handleJsonChange = (value: string) => {
    setJsonInput(value);
    validateJson(value);
  };

  const handleYamlChange = (value: string) => {
    setYamlInput(value);
    validateYaml(value);
  };

  const jsonToYaml = () => {
    if (!validateJson(jsonInput)) return;

    try {
      const parsed = JSON.parse(jsonInput);
      const yamlStr = yaml.dump(parsed, { indent: yamlIndent });
      setYamlOutput(yamlStr);
      setJsonOutput('');
    } catch (e) {
      setYamlError(e instanceof Error ? e.message : 'Conversion failed');
    }
  };

  const yamlToJson = () => {
    if (!validateYaml(yamlInput)) return;

    try {
      const parsed = yaml.load(yamlInput);
      const jsonStr = compactJson ? JSON.stringify(parsed) : JSON.stringify(parsed, null, jsonIndent);
      setJsonOutput(jsonStr);
      setYamlOutput('');
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : 'Conversion failed');
    }
  };

  const swapContent = () => {
    const tempInput = jsonInput;
    const tempOutput = jsonOutput;
    setJsonInput(yamlInput);
    setJsonOutput(yamlOutput);
    setYamlInput(tempInput);
    setYamlOutput(tempOutput);

    // Also swap validations
    const tempValid = jsonValid;
    const tempError = jsonError;
    setJsonValid(yamlValid);
    setJsonError(yamlError);
    setYamlValid(tempValid);
    setYamlError(tempError);
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy');
    }
  };

  return (
    <div className='h-full flex flex-col'>
      {/* Header */}
      <div className='border-b border-gray-800 bg-gray-900 p-6'>
        <h1 className='text-2xl font-bold text-white mb-2'>JSON ↔ YAML Converter</h1>
        <p className='text-gray-400'>Convert between JSON and YAML formats instantly</p>
      </div>
      {/* Content */}
      <div className='flex-1 overflow-auto p-6'>
        <div className='max-w-7xl mx-auto space-y-6'>
          {/* Settings */}
          <Card>
            <CardContent className='pt-6 space-y-4'>
              <div className='grid md:grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>YAML Indent</label>
                  <select
                    value={yamlIndent}
                    onChange={(e) => setYamlIndent(parseInt(e.target.value))}
                    className='w-full h-10 px-3 rounded-md border border-gray-700 bg-gray-800 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                  >
                    <option value='2'>2 spaces</option>
                    <option value='4'>4 spaces</option>
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>JSON Indent</label>
                  <div className='flex items-center gap-3'>
                    <select
                      value={jsonIndent}
                      onChange={(e) => setJsonIndent(parseInt(e.target.value))}
                      className='flex-1 h-10 px-3 rounded-md border border-gray-700 bg-gray-800 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                    >
                      <option value='2'>2 spaces</option>
                      <option value='4'>4 spaces</option>
                    </select>
                    <label className='flex items-center gap-2 text-sm text-gray-300 cursor-pointer'>
                      <input
                        type='checkbox'
                        checked={compactJson}
                        onChange={(e) => setCompactJson(e.target.checked)}
                        className='w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500'
                      />
                      Compact
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Converter */}
          <div className='grid lg:grid-cols-2 gap-6'>
            {/* JSON Input */}
            <Card>
              <CardContent className='pt-6 space-y-4'>
                <div className='flex items-center justify-between'>
                  <label className='block text-sm font-medium text-gray-300'>JSON</label>
                  {jsonValid !== null && (
                    <div className='flex items-center gap-2'>
                      {jsonValid ? (
                        <CheckCircle className='w-4 h-4 text-green-400' />
                      ) : (
                        <XCircle className='w-4 h-4 text-red-400' />
                      )}
                      <span className='text-xs text-gray-500'>Valid</span>
                    </div>
                  )}
                </div>
                <Textarea
                  placeholder='Enter JSON here...'
                  value={jsonInput}
                  onChange={(e) => handleJsonChange(e.target.value)}
                  rows={16}
                  className='font-mono text-sm'
                />
                {jsonError && (
                  <div className='flex items-start gap-2 text-xs text-red-400 bg-red-950/30 p-2 rounded'>
                    <AlertCircle className='w-4 h-4 flex-shrink-0 mt-0.5' />
                    <span>{jsonError}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* YAML Input */}
            <Card>
              <CardContent className='pt-6 space-y-4'>
                <div className='flex items-center justify-between'>
                  <label className='block text-sm font-medium text-gray-300'>YAML</label>
                  {yamlValid !== null && (
                    <div className='flex items-center gap-2'>
                      {yamlValid ? (
                        <CheckCircle className='w-4 h-4 text-green-400' />
                      ) : (
                        <XCircle className='w-4 h-4 text-red-400' />
                      )}
                      <span className='text-xs text-gray-500'>Valid</span>
                    </div>
                  )}
                </div>
                <Textarea
                  placeholder='Enter YAML here...'
                  value={yamlInput}
                  onChange={(e) => handleYamlChange(e.target.value)}
                  rows={16}
                  className='font-mono text-sm'
                />
                {yamlError && (
                  <div className='flex items-start gap-2 text-xs text-red-400 bg-red-950/30 p-2 rounded'>
                    <AlertCircle className='w-4 h-4 flex-shrink-0 mt-0.5' />
                    <span>{yamlError}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className='flex items-center justify-center gap-4'>
            <Button onClick={jsonToYaml} disabled={!jsonValid || !jsonInput.trim()} size='lg'>
              JSON → YAML
            </Button>
            <Button onClick={swapContent} variant='outline' size='sm'>
              <ArrowLeftRight className='w-4 h-4' />
            </Button>
            <Button onClick={yamlToJson} disabled={!yamlValid || !yamlInput.trim()} size='lg'>
              YAML → JSON
            </Button>
          </div>

          {/* Output */}
          {(jsonOutput || yamlOutput) && (
            <Card>
              <CardContent className='pt-6 space-y-4'>
                <div className='flex items-center justify-between mb-3'>
                  <h3 className='text-sm font-semibold text-gray-300'>Output</h3>
                  <Button onClick={() => handleCopy(jsonOutput || yamlOutput)} variant='outline' size='sm'>
                    {copied ? (
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
                <Textarea
                  value={jsonOutput || yamlOutput}
                  readOnly
                  rows={16}
                  className='font-mono text-sm bg-gray-950'
                />
              </CardContent>
            </Card>
          )}

          {!jsonInput && !yamlInput && (
            <Card className='border-dashed'>
              <CardContent className='pt-6'>
                <div className='text-center text-gray-500 py-12'>
                  <ArrowLeftRight className='w-12 h-12 mx-auto mb-4 opacity-50' />
                  <p>Enter JSON or YAML to convert between formats</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
