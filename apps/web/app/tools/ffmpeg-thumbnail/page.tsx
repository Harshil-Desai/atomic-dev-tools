'use client';

import { useState } from 'react';
import { BpToolStage, BpPanel, BpCopyBtn } from '@/components/blueprint';
import { Image } from 'lucide-react';

type ExtractMode = 'single' | 'interval' | 'evenly';
type OutputFormat = 'png' | 'jpg' | 'webp';
type ScalePreset = 'original' | '1280x720' | '640x360' | '320x180' | 'custom';

const SELECT_CLS = 'w-full h-9 px-3 rounded border border-[hsla(0,0%,20%,1)] bg-[#121212] text-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500';

export default function FfmpegThumbnailPage() {
  const [inputFile, setInputFile] = useState('input.mp4');
  const [extractMode, setExtractMode] = useState<ExtractMode>('single');
  const [timestamp, setTimestamp] = useState('00:00:05');
  const [intervalSeconds, setIntervalSeconds] = useState('10');
  const [frameCount, setFrameCount] = useState('10');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('png');
  const [outputFilename, setOutputFilename] = useState('thumbnail.png');
  const [outputPattern, setOutputPattern] = useState('frame_%03d.png');
  const [jpgQuality, setJpgQuality] = useState(2);
  const [scalePreset, setScalePreset] = useState<ScalePreset>('original');
  const [customWidth, setCustomWidth] = useState('');
  const [customHeight, setCustomHeight] = useState('');
  const [command, setCommand] = useState('');

  const normalizeTimestamp = (ts: string): string => {
    if (ts.includes(':')) return ts;
    const secs = parseInt(ts);
    if (isNaN(secs)) return ts;
    const h = Math.floor(secs / 3600); const m = Math.floor((secs % 3600) / 60); const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getScaleFilter = (): string => {
    if (scalePreset === 'original') return '';
    if (scalePreset === 'custom') { const w = customWidth || '-1'; const h = customHeight || '-1'; return `scale=${w}:${h}`; }
    const [w, h] = scalePreset.split('x');
    return `scale=${w}:${h}`;
  };

  const getOutputFilenameForFormat = (pattern: string, fmt: OutputFormat): string => pattern.replace(/\.(png|jpg|jpeg|webp)$/i, `.${fmt}`);

  const generateCommand = () => {
    const scale = getScaleFilter();
    if (extractMode === 'single') {
      const ts = normalizeTimestamp(timestamp);
      const outFile = getOutputFilenameForFormat(outputFilename, outputFormat);
      let cmd = `ffmpeg -ss ${ts} -i ${inputFile}`;
      cmd += ' -vframes 1';
      const filters: string[] = [];
      if (scale) filters.push(scale);
      if (filters.length > 0) cmd += ` -vf "${filters.join(',')}"`;
      if (outputFormat === 'jpg') cmd += ` -q:v ${jpgQuality}`;
      cmd += ` ${outFile}`;
      setCommand(cmd);
    } else if (extractMode === 'interval') {
      const n = intervalSeconds || '10';
      const outPattern = getOutputFilenameForFormat(outputPattern, outputFormat);
      let cmd = `ffmpeg -i ${inputFile}`;
      const filters: string[] = [`fps=1/${n}`];
      if (scale) filters.push(scale);
      cmd += ` -vf "${filters.join(',')}"`;
      if (outputFormat === 'jpg') cmd += ` -q:v ${jpgQuality}`;
      cmd += ` ${outPattern}`;
      setCommand(cmd);
    } else {
      const n = parseInt(frameCount) || 10;
      const outPattern = getOutputFilenameForFormat(outputPattern, outputFormat);
      const step = Math.max(1, n);
      let cmd = `ffmpeg -i ${inputFile}`;
      const selectExpr = `not(mod(n,${step}))`;
      const filters: string[] = [`select='${selectExpr}'`];
      if (scale) filters.push(scale);
      cmd += ` -vf "${filters.join(',')}"`;
      cmd += ' -vsync vfr';
      if (outputFormat === 'jpg') cmd += ` -q:v ${jpgQuality}`;
      cmd += ` ${outPattern}`;
      setCommand(cmd);
    }
  };

  const handleFormatChange = (fmt: OutputFormat) => {
    setOutputFormat(fmt);
    setOutputFilename((prev) => prev.replace(/\.(png|jpg|jpeg|webp)$/i, `.${fmt}`));
    setOutputPattern((prev) => prev.replace(/\.(png|jpg|jpeg|webp)$/i, `.${fmt}`));
  };

  const getPatternPreview = (): string[] => {
    const ext = outputFormat;
    if (extractMode === 'single') return [outputFilename];
    const base = outputPattern.replace(/\.(png|jpg|jpeg|webp)$/i, '');
    if (base.includes('%03d')) return [base.replace('%03d', '001') + '.' + ext, base.replace('%03d', '002') + '.' + ext, base.replace('%03d', '003') + '.' + ext];
    if (base.includes('%d')) return [base.replace('%d', '1') + '.' + ext, base.replace('%d', '2') + '.' + ext, base.replace('%d', '3') + '.' + ext];
    return [outputPattern];
  };

  const TAB_CLS = (active: boolean) => `px-4 py-2 text-sm font-medium transition ${active ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`;

  return (
    <BpToolStage cat='ffmpeg'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>FFmpeg Thumbnail Extractor</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Generate FFmpeg commands to extract video frames as images</p>
      </div>
      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-3xl mx-auto space-y-4'>

          <BpPanel title='Extraction Mode'>
            <div className='flex gap-0 border-b border-[hsla(0,0%,20%,1)]'>
              <button type='button' className={TAB_CLS(extractMode === 'single')} onClick={() => { setExtractMode('single'); setCommand(''); }}>Single Frame</button>
              <button type='button' className={TAB_CLS(extractMode === 'interval')} onClick={() => { setExtractMode('interval'); setCommand(''); }}>Every N Seconds</button>
              <button type='button' className={TAB_CLS(extractMode === 'evenly')} onClick={() => { setExtractMode('evenly'); setCommand(''); }}>N Evenly Spaced</button>
            </div>
          </BpPanel>

          <BpPanel title='Input & Timing'>
            <div className='space-y-3'>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Input Video File</label>
                <input value={inputFile} onChange={(e) => setInputFile(e.target.value)} placeholder='input.mp4' className='bp-input w-full font-mono' />
              </div>
              {extractMode === 'single' && (
                <div>
                  <label className='block text-xs text-gray-500 mb-1'>Timestamp (HH:MM:SS or seconds)</label>
                  <input value={timestamp} onChange={(e) => setTimestamp(e.target.value)} placeholder='00:00:05' className='bp-input w-full font-mono' />
                </div>
              )}
              {extractMode === 'interval' && (
                <div>
                  <label className='block text-xs text-gray-500 mb-1'>Extract a frame every N seconds</label>
                  <div className='flex items-center gap-3'>
                    <input type='number' min='1' value={intervalSeconds} onChange={(e) => setIntervalSeconds(e.target.value)} placeholder='10' className='bp-input w-24 font-mono' />
                    <span className='text-sm text-gray-400'>seconds</span>
                  </div>
                </div>
              )}
              {extractMode === 'evenly' && (
                <div>
                  <label className='block text-xs text-gray-500 mb-1'>Number of frames to extract</label>
                  <div className='flex items-center gap-3'>
                    <input type='number' min='1' value={frameCount} onChange={(e) => setFrameCount(e.target.value)} placeholder='10' className='bp-input w-24 font-mono' />
                    <span className='text-sm text-gray-400'>frames</span>
                  </div>
                </div>
              )}
            </div>
          </BpPanel>

          <BpPanel title='Output Format'>
            <div className='space-y-3'>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Image Format</label>
                <select value={outputFormat} onChange={(e) => handleFormatChange(e.target.value as OutputFormat)} className={SELECT_CLS}>
                  <option value='png'>PNG (lossless)</option><option value='jpg'>JPG (lossy)</option><option value='webp'>WebP (modern)</option>
                </select>
              </div>
              {outputFormat === 'jpg' && (
                <div>
                  <label className='block text-xs text-gray-500 mb-1'>JPEG Quality (-q:v {jpgQuality} — lower = better)</label>
                  <div className='flex items-center gap-4'>
                    <span className='text-xs text-gray-500 w-12 text-right'>Best (1)</span>
                    <input type='range' min='1' max='31' value={jpgQuality} onChange={(e) => setJpgQuality(parseInt(e.target.value))} className='flex-1 accent-blue-500' />
                    <span className='text-xs text-gray-500 w-16'>Worst (31)</span>
                    <span className='text-sm font-mono text-blue-400 w-6'>{jpgQuality}</span>
                  </div>
                </div>
              )}
            </div>
          </BpPanel>

          <BpPanel title='Output Filename'>
            {extractMode === 'single' ? (
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Output Filename</label>
                <input value={outputFilename} onChange={(e) => setOutputFilename(e.target.value)} placeholder={`thumbnail.${outputFormat}`} className='bp-input w-full font-mono' />
              </div>
            ) : (
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Output Pattern (use %03d for numbering)</label>
                <input value={outputPattern} onChange={(e) => setOutputPattern(e.target.value)} placeholder={`frame_%03d.${outputFormat}`} className='bp-input w-full font-mono mb-2' />
                <div className='bp-code-view px-3 py-2'>
                  <p className='text-xs text-gray-500 mb-1'>Preview:</p>
                  <div className='flex flex-wrap gap-2'>
                    {getPatternPreview().map((name) => (<span key={name} className='text-xs font-mono text-gray-300 bg-[#1a1a1a] rounded px-2 py-0.5'>{name}</span>))}
                    <span className='text-xs text-gray-600'>…</span>
                  </div>
                </div>
              </div>
            )}
          </BpPanel>

          <BpPanel title='Scale'>
            <div className='space-y-3'>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Output Scale</label>
                <select value={scalePreset} onChange={(e) => setScalePreset(e.target.value as ScalePreset)} className={SELECT_CLS}>
                  <option value='original'>Original (no scaling)</option><option value='1280x720'>1280x720 (720p)</option><option value='640x360'>640x360 (360p)</option><option value='320x180'>320x180 (thumbnail)</option><option value='custom'>Custom</option>
                </select>
              </div>
              {scalePreset === 'custom' && (
                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <label className='block text-xs text-gray-500 mb-1'>Width (px, -1 = auto)</label>
                    <input type='number' value={customWidth} onChange={(e) => setCustomWidth(e.target.value)} placeholder='1280' className='bp-input w-full' />
                  </div>
                  <div>
                    <label className='block text-xs text-gray-500 mb-1'>Height (px, -1 = auto)</label>
                    <input type='number' value={customHeight} onChange={(e) => setCustomHeight(e.target.value)} placeholder='720' className='bp-input w-full' />
                  </div>
                </div>
              )}
            </div>
          </BpPanel>

          <button type='button' className='bp-btn bp-btn-solid w-full' onClick={generateCommand}>
            <Image className='w-4 h-4 mr-2 inline' />GENERATE COMMAND
          </button>

          {command && (
            <>
              <BpPanel title='Generated FFmpeg Command'>
                <div className='bp-panel-actions mb-3'><BpCopyBtn text={command} label='COPY' /></div>
                <pre className='bp-code-pre px-4 py-3 font-mono text-sm text-gray-300 whitespace-pre-wrap break-all'>{command}</pre>
              </BpPanel>
            </>
          )}

          {!command && (
            <div className='text-center text-gray-600 py-12'>
              <Image className='w-10 h-10 mx-auto mb-3 opacity-40' />
              <p className='text-sm'>Configure settings and click Generate Command</p>
            </div>
          )}
        </div>
      </div>
    </BpToolStage>
  );
}
