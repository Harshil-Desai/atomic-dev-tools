'use client';

import React, { useState } from 'react';
import { BpCopyBtn } from '@/components/blueprint';
import { Image } from 'lucide-react';

type ExtractMode = 'single' | 'interval' | 'evenly';
type OutputFormat = 'png' | 'jpg' | 'webp';
type ScalePreset = 'original' | '1280x720' | '640x360' | '320x180' | 'custom';

const CSS_VARS: React.CSSProperties = {
  '--bp-bg': '#0a0e14',
  '--bp-surface': '#0f141c',
  '--bp-elevated': '#131a24',
  '--bp-border': '#1e2d3d',
  '--bp-border-str': '#2a3a52',
  '--bp-ink': '#cfd8e3',
  '--bp-ink-mute': '#6b7a8c',
  '--bp-ink-faint': '#3a4554',
  '--bp-accent': '#ff9d57',
} as React.CSSProperties;

function Panel({ title, meta, children, style }: { title: string; meta?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid var(--bp-border)', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 28, borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0 }}>
        <span style={{ width: 6, height: 6, background: 'var(--bp-accent)', flexShrink: 0 }} />
        <span style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{title}</span>
        {meta && <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--bp-ink-faint)' }}>{meta}</span>}
      </div>
      {children}
    </div>
  );
}

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

  const TAB_CLS = (active: boolean) => `px-4 py-2 text-sm font-medium transition ${active ? 'border-b-2' : 'text-gray-400 hover:text-gray-300'}`;

  const inputStyle: React.CSSProperties = {
    flex: 1,
    background: 'var(--bp-bg)',
    border: '1px solid var(--bp-border-str)',
    color: 'var(--bp-ink)',
    fontFamily: 'inherit',
    fontSize: 12,
    padding: '7px 10px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const selectStyle: React.CSSProperties = {
    background: 'var(--bp-bg)',
    border: '1px solid var(--bp-border)',
    color: 'var(--bp-ink)',
    fontFamily: 'inherit',
    fontSize: 11,
    padding: '5px 8px',
    outline: 'none',
    width: '100%',
  };

  return (
    <div
      className='h-full flex flex-col overflow-hidden'
      data-cat='ffmpeg'
      style={{ ...CSS_VARS, fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', background: 'var(--bp-bg)', color: 'var(--bp-ink)' }}
    >
      {/* Header */}
      <div style={{ padding: '12px 20px 10px', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0 }}>
        <h1 style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0, marginBottom: 2 }}>Thumbnail Generator</h1>
        <p style={{ fontSize: 11, color: 'var(--bp-ink-mute)', margin: 0 }}>Extract thumbnail frames from video at specific timestamps</p>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>
        {/* Left: Configuration */}
        <Panel title='Configuration' style={{ borderTop: 0, borderLeft: 0, borderBottom: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

            {/* Extraction Mode Tabs */}
            <div style={{ borderBottom: '1px solid var(--bp-border)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 28, borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)' }}>
                <span style={{ width: 6, height: 6, background: 'var(--bp-accent)', flexShrink: 0 }} />
                <span style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>Extraction Mode</span>
              </div>
              <div style={{ display: 'flex' }}>
                <button
                  type='button'
                  className={TAB_CLS(extractMode === 'single')}
                  style={extractMode === 'single' ? { color: '#ff9d57', borderColor: '#ff9d57' } : {}}
                  onClick={() => { setExtractMode('single'); setCommand(''); }}
                >Single Frame</button>
                <button
                  type='button'
                  className={TAB_CLS(extractMode === 'interval')}
                  style={extractMode === 'interval' ? { color: '#ff9d57', borderColor: '#ff9d57' } : {}}
                  onClick={() => { setExtractMode('interval'); setCommand(''); }}
                >Every N Seconds</button>
                <button
                  type='button'
                  className={TAB_CLS(extractMode === 'evenly')}
                  style={extractMode === 'evenly' ? { color: '#ff9d57', borderColor: '#ff9d57' } : {}}
                  onClick={() => { setExtractMode('evenly'); setCommand(''); }}
                >N Evenly Spaced</button>
              </div>
            </div>

            {/* Input & Timing */}
            <div style={{ borderBottom: '1px solid var(--bp-border)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 28, borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)' }}>
                <span style={{ width: 6, height: 6, background: 'var(--bp-accent)', flexShrink: 0 }} />
                <span style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>Input &amp; Timing</span>
              </div>
              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--bp-ink-mute)', marginBottom: 4 }}>Input Video File</label>
                  <input value={inputFile} onChange={(e) => setInputFile(e.target.value)} placeholder='input.mp4' style={{ ...inputStyle, width: '100%' }} />
                </div>
                {extractMode === 'single' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: 'var(--bp-ink-mute)', marginBottom: 4 }}>Timestamp (HH:MM:SS or seconds)</label>
                    <input value={timestamp} onChange={(e) => setTimestamp(e.target.value)} placeholder='00:00:05' style={{ ...inputStyle, width: '100%' }} />
                  </div>
                )}
                {extractMode === 'interval' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: 'var(--bp-ink-mute)', marginBottom: 4 }}>Extract a frame every N seconds</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type='number' min='1' value={intervalSeconds} onChange={(e) => setIntervalSeconds(e.target.value)} placeholder='10' style={{ ...inputStyle, width: 80, flex: 'none' }} />
                      <span style={{ fontSize: 12, color: 'var(--bp-ink-mute)' }}>seconds</span>
                    </div>
                  </div>
                )}
                {extractMode === 'evenly' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: 'var(--bp-ink-mute)', marginBottom: 4 }}>Number of frames to extract</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type='number' min='1' value={frameCount} onChange={(e) => setFrameCount(e.target.value)} placeholder='10' style={{ ...inputStyle, width: 80, flex: 'none' }} />
                      <span style={{ fontSize: 12, color: 'var(--bp-ink-mute)' }}>frames</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Output Format */}
            <div style={{ borderBottom: '1px solid var(--bp-border)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 28, borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)' }}>
                <span style={{ width: 6, height: 6, background: 'var(--bp-accent)', flexShrink: 0 }} />
                <span style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>Output Format</span>
              </div>
              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--bp-ink-mute)', marginBottom: 4 }}>Image Format</label>
                  <select value={outputFormat} onChange={(e) => handleFormatChange(e.target.value as OutputFormat)} style={selectStyle}>
                    <option value='png'>PNG (lossless)</option>
                    <option value='jpg'>JPG (lossy)</option>
                    <option value='webp'>WebP (modern)</option>
                  </select>
                </div>
                {outputFormat === 'jpg' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: 'var(--bp-ink-mute)', marginBottom: 4 }}>JPEG Quality (-q:v {jpgQuality} — lower = better)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 10, color: 'var(--bp-ink-faint)', width: 44, textAlign: 'right' }}>Best (1)</span>
                      <input type='range' min='1' max='31' value={jpgQuality} onChange={(e) => setJpgQuality(parseInt(e.target.value))} style={{ flex: 1, accentColor: '#ff9d57' }} />
                      <span style={{ fontSize: 10, color: 'var(--bp-ink-faint)', width: 56 }}>Worst (31)</span>
                      <span style={{ fontSize: 12, fontFamily: 'inherit', color: '#ff9d57', width: 20 }}>{jpgQuality}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Output Filename */}
            <div style={{ borderBottom: '1px solid var(--bp-border)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 28, borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)' }}>
                <span style={{ width: 6, height: 6, background: 'var(--bp-accent)', flexShrink: 0 }} />
                <span style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>Output Filename</span>
              </div>
              <div style={{ padding: '12px 14px' }}>
                {extractMode === 'single' ? (
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: 'var(--bp-ink-mute)', marginBottom: 4 }}>Output Filename</label>
                    <input value={outputFilename} onChange={(e) => setOutputFilename(e.target.value)} placeholder={`thumbnail.${outputFormat}`} style={{ ...inputStyle, width: '100%' }} />
                  </div>
                ) : (
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: 'var(--bp-ink-mute)', marginBottom: 4 }}>Output Pattern (use %03d for numbering)</label>
                    <input value={outputPattern} onChange={(e) => setOutputPattern(e.target.value)} placeholder={`frame_%03d.${outputFormat}`} style={{ ...inputStyle, width: '100%', marginBottom: 8 }} />
                    <div style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)', padding: '8px 12px' }}>
                      <p style={{ fontSize: 10, color: 'var(--bp-ink-mute)', margin: '0 0 6px 0' }}>Preview:</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {getPatternPreview().map((name) => (
                          <span key={name} style={{ fontSize: 11, fontFamily: 'inherit', color: 'var(--bp-ink)', background: 'var(--bp-elevated)', border: '1px solid var(--bp-border)', padding: '2px 8px' }}>{name}</span>
                        ))}
                        <span style={{ fontSize: 11, color: 'var(--bp-ink-faint)' }}>…</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Scale */}
            <div style={{ flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 28, borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)' }}>
                <span style={{ width: 6, height: 6, background: 'var(--bp-accent)', flexShrink: 0 }} />
                <span style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>Scale</span>
              </div>
              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--bp-ink-mute)', marginBottom: 4 }}>Output Scale</label>
                  <select value={scalePreset} onChange={(e) => setScalePreset(e.target.value as ScalePreset)} style={selectStyle}>
                    <option value='original'>Original (no scaling)</option>
                    <option value='1280x720'>1280x720 (720p)</option>
                    <option value='640x360'>640x360 (360p)</option>
                    <option value='320x180'>320x180 (thumbnail)</option>
                    <option value='custom'>Custom</option>
                  </select>
                </div>
                {scalePreset === 'custom' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: 'var(--bp-ink-mute)', marginBottom: 4 }}>Width (px, -1 = auto)</label>
                      <input type='number' value={customWidth} onChange={(e) => setCustomWidth(e.target.value)} placeholder='1280' style={{ ...inputStyle, width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: 'var(--bp-ink-mute)', marginBottom: 4 }}>Height (px, -1 = auto)</label>
                      <input type='number' value={customHeight} onChange={(e) => setCustomHeight(e.target.value)} placeholder='720' style={{ ...inputStyle, width: '100%' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Action bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderTop: '1px dashed var(--bp-border-str)', flexShrink: 0 }}>
            <button type='button' className='bp-btn bp-btn-solid' style={{ flex: 1 }} onClick={generateCommand}>
              <Image className='w-4 h-4 mr-2 inline' />GENERATE COMMAND
            </button>
          </div>
        </Panel>

        {/* Right: Generated Command */}
        <Panel title='Generated FFmpeg Command' style={{ borderTop: 0, borderRight: 0, borderBottom: 0 }}>
          {command ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderBottom: '1px solid var(--bp-border)', flexShrink: 0 }}>
                <BpCopyBtn text={command} label='COPY' />
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <pre style={{ margin: 0, padding: '14px 16px', fontFamily: 'inherit', fontSize: 12, color: 'var(--bp-ink)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.65 }}>{command}</pre>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--bp-ink-faint)' }}>
              <Image style={{ width: 36, height: 36, marginBottom: 12, opacity: 0.35 }} />
              <p style={{ fontSize: 12, color: 'var(--bp-ink-mute)', margin: 0 }}>Configure settings and click Generate Command</p>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
