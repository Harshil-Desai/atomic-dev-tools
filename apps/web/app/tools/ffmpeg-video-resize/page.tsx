'use client';

import React, { useState } from 'react';
import { BpCopyBtn } from '@/components/blueprint';
import { Maximize2 } from 'lucide-react';

type ResizeMethod = 'preset' | 'custom' | 'percentage';
type ScaleAlgorithm = 'fast' | 'bilinear' | 'lanczos';
type PaddingMode = 'pad' | 'crop' | 'stretch';

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

export default function FfmpegVideoResizePage() {
  const [inputFile, setInputFile] = useState('input.mp4');
  const [outputFile, setOutputFile] = useState('output.mp4');
  const [resizeMethod, setResizeMethod] = useState<ResizeMethod>('preset');
  const [preset, setPreset] = useState('1080p');
  const [customWidth, setCustomWidth] = useState('');
  const [customHeight, setCustomHeight] = useState('');
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [percentage, setPercentage] = useState('100');
  const [scaleAlgorithm, setScaleAlgorithm] = useState<ScaleAlgorithm>('lanczos');
  const [paddingMode, setPaddingMode] = useState<PaddingMode>('pad');
  const [keepCodec, setKeepCodec] = useState(false);
  const [command, setCommand] = useState('');

  const getPresetDimensions = (presetName: string): { width: string; height: string } => {
    switch (presetName) {
      case '4K': return { width: '3840', height: '2160' };
      case '1080p': return { width: '1920', height: '1080' };
      case '720p': return { width: '1280', height: '720' };
      case '480p': return { width: '854', height: '480' };
      case 'instagram': return { width: '1080', height: '1080' };
      case 'instagram-story': return { width: '1080', height: '1920' };
      case 'youtube-thumbnail': return { width: '1280', height: '720' };
      default: return { width: '1920', height: '1080' };
    }
  };

  const getScaleFilter = (): string => {
    const algorithmMap = { fast: 'fast_bilinear', bilinear: 'bilinear', lanczos: 'lanczos' };
    if (resizeMethod === 'preset') {
      const { width, height } = getPresetDimensions(preset);
      if (paddingMode === 'stretch') return `scale=${width}:${height}:flags=${algorithmMap[scaleAlgorithm]}`;
      if (paddingMode === 'crop') return `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`;
      return `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`;
    } else if (resizeMethod === 'custom') {
      if (maintainAspectRatio) return `scale=${customWidth}:-1:flags=${algorithmMap[scaleAlgorithm]}`;
      return `scale=${customWidth}:${customHeight}:flags=${algorithmMap[scaleAlgorithm]}`;
    } else {
      const percent = parseFloat(percentage) / 100;
      return `scale=iw*${percent}:ih*${percent}:flags=${algorithmMap[scaleAlgorithm]}`;
    }
  };

  const generateCommand = () => {
    let cmd = 'ffmpeg -i ' + inputFile;
    cmd += ` -vf "${getScaleFilter()}"`;
    if (keepCodec) cmd += ' -c:v copy -c:a copy';
    cmd += ` ${outputFile}`;
    setCommand(cmd);
  };

  const applyPreset = (presetName: string) => {
    setResizeMethod('preset');
    setPreset(presetName);
    setTimeout(generateCommand, 100);
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    fontSize: 11,
    fontWeight: 500,
    background: 'none',
    border: 'none',
    borderBottom: active ? '2px solid var(--bp-accent)' : '2px solid transparent',
    color: active ? 'var(--bp-accent)' : 'var(--bp-ink-mute)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'color 0.15s',
    letterSpacing: '0.05em',
  });

  const inputStyle: React.CSSProperties = {
    background: 'var(--bp-bg)',
    border: '1px solid var(--bp-border-str)',
    color: 'var(--bp-ink)',
    fontFamily: 'inherit',
    fontSize: 12,
    padding: '7px 10px',
    outline: 'none',
    boxSizing: 'border-box',
    width: '100%',
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
        <h1 style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0, marginBottom: 2 }}>Video Resize & Convert</h1>
        <p style={{ fontSize: 11, color: 'var(--bp-ink-mute)', margin: 0 }}>Resize video to standard presets and convert between formats</p>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>

        {/* Left: Configuration */}
        <Panel title='Configuration' style={{ borderTop: 0, borderLeft: 0, borderBottom: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

            {/* Resize Method Tabs */}
            <div style={{ borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingTop: 4 }}>
                <button type='button' style={tabStyle(resizeMethod === 'preset')} onClick={() => setResizeMethod('preset')}>Preset Resolutions</button>
                <button type='button' style={tabStyle(resizeMethod === 'custom')} onClick={() => setResizeMethod('custom')}>Custom Size</button>
                <button type='button' style={tabStyle(resizeMethod === 'percentage')} onClick={() => setResizeMethod('percentage')}>Percentage</button>
              </div>
            </div>

            {/* Input / Output */}
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--bp-border)', flexShrink: 0 }}>
              <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-faint)', marginBottom: 8 }}>Input / Output</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--bp-ink-mute)', marginBottom: 4 }}>Input Video</div>
                  <input
                    value={inputFile}
                    onChange={(e) => setInputFile(e.target.value)}
                    placeholder='input.mp4'
                    style={inputStyle}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--bp-ink-mute)', marginBottom: 4 }}>Output Video</div>
                  <input
                    value={outputFile}
                    onChange={(e) => setOutputFile(e.target.value)}
                    placeholder='output.mp4'
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* Preset Resolutions */}
            {resizeMethod === 'preset' && (
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--bp-border)', flexShrink: 0 }}>
                <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-faint)', marginBottom: 8 }}>Preset Resolutions</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {[['4K', '4K (3840x2160)'], ['1080p', '1080p'], ['720p', '720p'], ['480p', '480p'], ['instagram', 'Instagram (1:1)'], ['instagram-story', 'IG Story (9:16)'], ['youtube-thumbnail', 'YT Thumbnail']].map(([key, label]) => (
                    <button key={key} type='button' className='bp-btn' style={{ fontSize: 10 }} onClick={() => applyPreset(key)}>{label}</button>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--bp-ink-mute)', marginBottom: 4 }}>Selected Preset</div>
                  <select
                    value={preset}
                    onChange={(e) => { setPreset(e.target.value); generateCommand(); }}
                    style={selectStyle}
                  >
                    <option value='4K'>4K (3840x2160)</option>
                    <option value='1080p'>1080p (1920x1080)</option>
                    <option value='720p'>720p (1280x720)</option>
                    <option value='480p'>480p (854x480)</option>
                    <option value='instagram'>Instagram (1080x1080)</option>
                    <option value='instagram-story'>Instagram Story (1080x1920)</option>
                    <option value='youtube-thumbnail'>YouTube Thumbnail (1280x720)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Custom Size */}
            {resizeMethod === 'custom' && (
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--bp-border)', flexShrink: 0 }}>
                <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-faint)', marginBottom: 8 }}>Custom Size</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--bp-ink-mute)', marginBottom: 4 }}>Width (pixels)</div>
                    <input
                      type='number'
                      value={customWidth}
                      onChange={(e) => setCustomWidth(e.target.value)}
                      placeholder='1920'
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--bp-ink-mute)', marginBottom: 4 }}>Height (pixels)</div>
                    <input
                      type='number'
                      value={customHeight}
                      onChange={(e) => setCustomHeight(e.target.value)}
                      placeholder='1080'
                      disabled={maintainAspectRatio}
                      style={{ ...inputStyle, opacity: maintainAspectRatio ? 0.4 : 1 }}
                    />
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type='checkbox'
                    checked={maintainAspectRatio}
                    onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                    style={{ width: 14, height: 14 }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--bp-ink)' }}>Maintain aspect ratio</span>
                </label>
              </div>
            )}

            {/* Percentage */}
            {resizeMethod === 'percentage' && (
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--bp-border)', flexShrink: 0 }}>
                <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-faint)', marginBottom: 8 }}>Scale by Percentage</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    type='number'
                    value={percentage}
                    onChange={(e) => setPercentage(e.target.value)}
                    placeholder='100'
                    style={{ ...inputStyle, width: 80 }}
                  />
                  {[25, 50, 75, 100, 150, 200].map((p) => (
                    <button key={p} type='button' className='bp-btn' style={{ fontSize: 10 }} onClick={() => setPercentage(p.toString())}>{p}%</button>
                  ))}
                </div>
              </div>
            )}

            {/* Options */}
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--bp-border)', flexShrink: 0 }}>
              <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-faint)', marginBottom: 8 }}>Options</div>
              <div style={{ display: 'grid', gridTemplateColumns: resizeMethod === 'preset' ? '1fr 1fr' : '1fr', gap: 8, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--bp-ink-mute)', marginBottom: 4 }}>Scaling Algorithm</div>
                  <select
                    value={scaleAlgorithm}
                    onChange={(e) => setScaleAlgorithm(e.target.value as ScaleAlgorithm)}
                    style={selectStyle}
                  >
                    <option value='fast'>Fast (fast bilinear)</option>
                    <option value='bilinear'>Balanced (bilinear)</option>
                    <option value='lanczos'>High Quality (lanczos)</option>
                  </select>
                </div>
                {resizeMethod === 'preset' && (
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--bp-ink-mute)', marginBottom: 4 }}>Padding Mode</div>
                    <select
                      value={paddingMode}
                      onChange={(e) => setPaddingMode(e.target.value as PaddingMode)}
                      style={selectStyle}
                    >
                      <option value='pad'>Pad (add black bars)</option>
                      <option value='crop'>Crop</option>
                      <option value='stretch'>Stretch</option>
                    </select>
                  </div>
                )}
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type='checkbox'
                  checked={keepCodec}
                  onChange={(e) => setKeepCodec(e.target.checked)}
                  style={{ width: 14, height: 14 }}
                />
                <span style={{ fontSize: 12, color: 'var(--bp-ink)' }}>Keep original codec (copy, no re-encode)</span>
              </label>
            </div>

          </div>

          {/* Action bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderTop: '1px dashed var(--bp-border-str)', flexShrink: 0 }}>
            <button
              type='button'
              className='bp-btn bp-btn-solid'
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              onClick={generateCommand}
            >
              <Maximize2 style={{ width: 13, height: 13 }} />
              GENERATE COMMAND
            </button>
          </div>
        </Panel>

        {/* Right: Output */}
        <Panel title='Generated FFmpeg Command' style={{ borderTop: 0, borderRight: 0, borderBottom: 0 }}>
          {command ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0 }}>
                <BpCopyBtn text={command} label='COPY' />
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
                <code style={{ display: 'block', fontFamily: 'inherit', fontSize: 12, color: 'var(--bp-ink)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.7 }}>
                  {command}
                </code>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--bp-ink-faint)' }}>
              <Maximize2 style={{ width: 36, height: 36, opacity: 0.3 }} />
              <span style={{ fontSize: 11 }}>Configure settings and click Generate Command</span>
            </div>
          )}
        </Panel>

      </div>
    </div>
  );
}
