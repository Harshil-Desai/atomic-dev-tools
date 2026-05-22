'use client';

import { useState } from 'react';
import { BpToolStage, BpPanel, BpCopyBtn } from '@/components/blueprint';
import { ArrowLeftRight, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
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
  const [yamlIndent, setYamlIndent] = useState(2);
  const [jsonIndent, setJsonIndent] = useState(2);
  const [compactJson, setCompactJson] = useState(false);

  const validateJson = (text: string): boolean => {
    if (!text.trim()) { setJsonValid(null); setJsonError(null); return false; }
    try { JSON.parse(text); setJsonValid(true); setJsonError(null); return true; }
    catch (e) { setJsonValid(false); setJsonError(e instanceof Error ? e.message : 'Invalid JSON'); return false; }
  };

  const validateYaml = (text: string): boolean => {
    if (!text.trim()) { setYamlValid(null); setYamlError(null); return false; }
    try { yaml.load(text); setYamlValid(true); setYamlError(null); return true; }
    catch (e) { setYamlValid(false); setYamlError(e instanceof Error ? e.message : 'Invalid YAML'); return false; }
  };

  const jsonToYaml = () => {
    if (!validateJson(jsonInput)) return;
    try { setYamlOutput(yaml.dump(JSON.parse(jsonInput), { indent: yamlIndent })); setJsonOutput(''); }
    catch (e) { setYamlError(e instanceof Error ? e.message : 'Conversion failed'); }
  };

  const yamlToJson = () => {
    if (!validateYaml(yamlInput)) return;
    try { const parsed = yaml.load(yamlInput); setJsonOutput(compactJson ? JSON.stringify(parsed) : JSON.stringify(parsed, null, jsonIndent)); setYamlOutput(''); }
    catch (e) { setJsonError(e instanceof Error ? e.message : 'Conversion failed'); }
  };

  const swapContent = () => {
    const tempInput = jsonInput;
    const tempOutput = jsonOutput;
    setJsonInput(yamlInput); setJsonOutput(yamlOutput);
    setYamlInput(tempInput); setYamlOutput(tempOutput);
    const tempValid = jsonValid; const tempError = jsonError;
    setJsonValid(yamlValid); setJsonError(yamlError);
    setYamlValid(tempValid); setYamlError(tempError);
  };

  return (
    <BpToolStage cat='data'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>JSON ↔ YAML Converter</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Convert between JSON and YAML formats instantly</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-7xl mx-auto space-y-4'>

          <BpPanel title='Settings'>
            <div className='flex flex-wrap gap-4 items-center'>
              <div className='flex items-center gap-2'>
                <label className='text-xs text-gray-500'>YAML Indent:</label>
                <select className='bp-input h-8 px-2 text-xs' value={yamlIndent} onChange={(e) => setYamlIndent(parseInt(e.target.value))}>
                  <option value='2'>2 spaces</option><option value='4'>4 spaces</option>
                </select>
              </div>
              <div className='flex items-center gap-2'>
                <label className='text-xs text-gray-500'>JSON Indent:</label>
                <select className='bp-input h-8 px-2 text-xs' value={jsonIndent} onChange={(e) => setJsonIndent(parseInt(e.target.value))}>
                  <option value='2'>2 spaces</option><option value='4'>4 spaces</option>
                </select>
              </div>
              <label className='flex items-center gap-2 text-xs text-gray-400 cursor-pointer'>
                <input type='checkbox' checked={compactJson} onChange={(e) => setCompactJson(e.target.checked)} className='w-3.5 h-3.5' />
                Compact JSON
              </label>
            </div>
          </BpPanel>

          <div className='bp-layout-2col'>
            <BpPanel title='JSON'>
              <div className='flex items-center gap-2 mb-2'>
                {jsonValid === true && <><CheckCircle className='w-4 h-4 text-green-400' /><span className='text-xs text-gray-500'>Valid</span></>}
                {jsonValid === false && <><XCircle className='w-4 h-4 text-red-400' /><span className='text-xs text-gray-500'>Invalid</span></>}
              </div>
              <textarea className='bp-textarea font-mono text-sm mb-2' placeholder='Enter JSON here...' value={jsonInput} onChange={(e) => { setJsonInput(e.target.value); validateJson(e.target.value); }} rows={16} />
              {jsonError && (
                <div className='flex items-start gap-2 text-xs text-red-400 bg-red-950/30 p-2 rounded mt-1'>
                  <AlertCircle className='w-4 h-4 flex-shrink-0 mt-0.5' /><span>{jsonError}</span>
                </div>
              )}
            </BpPanel>

            <BpPanel title='YAML'>
              <div className='flex items-center gap-2 mb-2'>
                {yamlValid === true && <><CheckCircle className='w-4 h-4 text-green-400' /><span className='text-xs text-gray-500'>Valid</span></>}
                {yamlValid === false && <><XCircle className='w-4 h-4 text-red-400' /><span className='text-xs text-gray-500'>Invalid</span></>}
              </div>
              <textarea className='bp-textarea font-mono text-sm mb-2' placeholder='Enter YAML here...' value={yamlInput} onChange={(e) => { setYamlInput(e.target.value); validateYaml(e.target.value); }} rows={16} />
              {yamlError && (
                <div className='flex items-start gap-2 text-xs text-red-400 bg-red-950/30 p-2 rounded mt-1'>
                  <AlertCircle className='w-4 h-4 flex-shrink-0 mt-0.5' /><span>{yamlError}</span>
                </div>
              )}
            </BpPanel>
          </div>

          <div className='flex items-center justify-center gap-4'>
            <button className='bp-btn bp-btn-solid' onClick={jsonToYaml} disabled={!jsonValid || !jsonInput.trim()} type='button'>JSON → YAML</button>
            <button className='bp-btn' onClick={swapContent} type='button'><ArrowLeftRight className='w-4 h-4' /></button>
            <button className='bp-btn bp-btn-solid' onClick={yamlToJson} disabled={!yamlValid || !yamlInput.trim()} type='button'>YAML → JSON</button>
          </div>

          {(jsonOutput || yamlOutput) && (
            <BpPanel title='Output'>
              <div className='bp-panel-actions mb-3'>
                <BpCopyBtn text={jsonOutput || yamlOutput} label='COPY' />
              </div>
              <textarea className='bp-textarea font-mono text-sm' value={jsonOutput || yamlOutput} readOnly rows={16} />
            </BpPanel>
          )}
        </div>
      </div>
    </BpToolStage>
  );
}
