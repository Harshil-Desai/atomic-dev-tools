'use client';

import { useState } from 'react';
import { BpCopyBtn } from '@/components/blueprint';
import { FileText } from 'lucide-react';

type OperationType = 'subtitles' | 'text-watermark' | 'image-watermark';

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

export default function FfmpegSubtitleWatermarkPage() {
  const [operation, setOperation] = useState<OperationType>('subtitles');
  const [inputFile, setInputFile] = useState('input.mp4');
  const [outputFile, setOutputFile] = useState('output.mp4');
  const [subtitleFile, setSubtitleFile] = useState('subtitle.srt');
  const [subtitleFontSize, setSubtitleFontSize] = useState(24);
  const [subtitleColor, setSubtitleColor] = useState('#FFFFFF');
  const [subtitlePosition, setSubtitlePosition] = useState('bottom');
  const [watermarkText, setWatermarkText] = useState('Copyright 2024');
  const [textPosition, setTextPosition] = useState('top-right');
  const [textFontSize, setTextFontSize] = useState(24);
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [textOpacity, setTextOpacity] = useState(0.7);
  const [customTextPosition, setCustomTextPosition] = useState('10:10');
  const [imageFile, setImageFile] = useState('watermark.png');
  const [imagePosition, setImagePosition] = useState('bottom-right');
  const [imageScale, setImageScale] = useState('100');
  const [imageOpacity, setImageOpacity] = useState(0.7);
  const [customImagePosition, setCustomImagePosition] = useState('10:10');
  const [command, setCommand] = useState('');

  const hexToDrawtextColor = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `0x${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}FF`;
  };

  const getTextPosition = (): string => {
    switch (textPosition) {
      case 'top-left': return 'x=10:y=10';
      case 'top-right': return 'x=w-tw-10:y=10';
      case 'bottom-left': return 'x=10:y=h-th-10';
      case 'bottom-right': return 'x=w-tw-10:y=h-th-10';
      case 'center': return 'x=(w-tw)/2:y=(h-th)/2';
      case 'custom': { const [x, y] = customTextPosition.split(':'); return `x=${x}:y=${y}`; }
      default: return 'x=10:y=10';
    }
  };

  const getImagePosition = (): string => {
    switch (imagePosition) {
      case 'top-left': return 'overlay=10:10';
      case 'top-right': return 'overlay=W-w-10:10';
      case 'bottom-left': return 'overlay=10:H-h-10';
      case 'bottom-right': return 'overlay=W-w-10:H-h-10';
      case 'center': return 'overlay=(W-w)/2:(H-h)/2';
      case 'custom': { const [x, y] = customImagePosition.split(':'); return `overlay=${x}:${y}`; }
      default: return 'overlay=W-w-10:H-h-10';
    }
  };

  const generateCommand = () => {
    let cmd = 'ffmpeg -i ' + inputFile;
    if (operation === 'subtitles') {
      const colorHex = hexToDrawtextColor(subtitleColor);
      const position = subtitlePosition === 'top' ? 'y=50' : 'y=h-th-50';
      cmd += ` -vf "subtitles=${subtitleFile}:force_style='FontSize=${subtitleFontSize},PrimaryColour=${colorHex.replace('0x', '&H').replace(/FF$/, '')},Alignment=2,${position}'"`;
      cmd += ` ${outputFile}`;
    } else if (operation === 'text-watermark') {
      const color = hexToDrawtextColor(textColor);
      const alpha = Math.round(textOpacity * 255).toString(16).padStart(2, '0');
      const colorWithAlpha = color.slice(0, -2) + alpha;
      const pos = getTextPosition();
      cmd += ` -vf "drawtext=text='${watermarkText.replace(/'/g, "\\'")}':${pos}:fontsize=${textFontSize}:fontcolor=${colorWithAlpha}"`;
      cmd += ` ${outputFile}`;
    } else if (operation === 'image-watermark') {
      const scalePercent = parseInt(imageScale);
      const opacityValue = imageOpacity;
      const pos = getImagePosition();
      cmd += ` -i ${imageFile}`;
      if (opacityValue < 1.0) cmd += ` -filter_complex "[1:v]scale=iw*${scalePercent}/100:ih*${scalePercent}/100,format=rgba,colorchannelmixer=aa=${opacityValue}[wm];[0:v][wm]${pos}"`;
      else cmd += ` -filter_complex "[1:v]scale=iw*${scalePercent}/100:ih*${scalePercent}/100[wm];[0:v][wm]${pos}"`;
      cmd += ` ${outputFile}`;
    }
    setCommand(cmd);
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.05em',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: active ? 'var(--bp-accent)' : 'var(--bp-ink-mute)',
    borderBottom: active ? '2px solid var(--bp-accent)' : '2px solid transparent',
    transition: 'color 0.15s, border-color 0.15s',
    fontFamily: 'inherit',
  });

  const inputStyle: React.CSSProperties = {
    width: '100%',
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
    width: '100%',
    background: 'var(--bp-bg)',
    border: '1px solid var(--bp-border)',
    color: 'var(--bp-ink)',
    fontFamily: 'inherit',
    fontSize: 11,
    padding: '5px 8px',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 9,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--bp-ink-faint)',
    marginBottom: 4,
    fontWeight: 600,
  };

  const sectionHeadStyle: React.CSSProperties = {
    fontSize: 9,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: 'var(--bp-ink-faint)',
    fontWeight: 600,
    marginBottom: 8,
  };

  return (
    <div
      className='h-full flex flex-col overflow-hidden'
      data-cat='ffmpeg'
      style={{ ...CSS_VARS, fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', background: 'var(--bp-bg)', color: 'var(--bp-ink)' }}
    >
      <div className='p-4 sm:p-5 md:p-6 border-b border-[var(--bp-border)] bg-[var(--bp-surface)] flex-shrink-0'>
        <h1 className='text-sm sm:text-base font-semibold text-white m-0 mb-1'>Subtitle &amp; Watermark</h1>
        <p style={{ fontSize: 11, color: 'var(--bp-ink-mute)', margin: 0 }}>Burn subtitles and image overlays into video files</p>
      </div>

      <div className='flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 overflow-hidden'>
        {/* Left panel: configuration */}
        <Panel title='Configuration' style={{ borderRight: 0, borderTop: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

            {/* Operation tabs */}
            <div style={{ borderBottom: '1px solid var(--bp-border)', display: 'flex', flexShrink: 0 }}>
              <button type='button' style={tabStyle(operation === 'subtitles')} onClick={() => setOperation('subtitles')}>Burn Subtitles</button>
              <button type='button' style={tabStyle(operation === 'text-watermark')} onClick={() => setOperation('text-watermark')}>Text Watermark</button>
              <button type='button' style={tabStyle(operation === 'image-watermark')} onClick={() => setOperation('image-watermark')}>Image Watermark</button>
            </div>

            {/* Input / Output */}
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--bp-border)', flexShrink: 0 }}>
              <div style={sectionHeadStyle}>Input / Output</div>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3'>
                <div>
                  <label style={labelStyle}>Input Video</label>
                  <input value={inputFile} onChange={(e) => setInputFile(e.target.value)} placeholder='input.mp4' style={{ ...inputStyle, fontFamily: 'monospace' }} />
                </div>
                <div>
                  <label style={labelStyle}>Output Video</label>
                  <input value={outputFile} onChange={(e) => setOutputFile(e.target.value)} placeholder='output.mp4' style={{ ...inputStyle, fontFamily: 'monospace' }} />
                </div>
              </div>
            </div>

            {/* Subtitle Settings */}
            {operation === 'subtitles' && (
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--bp-border)', flexShrink: 0 }}>
                <div style={sectionHeadStyle}>Subtitle Settings</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <label style={labelStyle}>Subtitle File (.srt, .ass, .vtt)</label>
                    <input value={subtitleFile} onChange={(e) => setSubtitleFile(e.target.value)} placeholder='subtitle.srt' style={{ ...inputStyle, fontFamily: 'monospace' }} />
                  </div>
                  <div className='grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3'>
                    <div>
                      <label style={labelStyle}>Font Size</label>
                      <input type='number' value={subtitleFontSize} onChange={(e) => setSubtitleFontSize(parseInt(e.target.value) || 24)} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Color</label>
                      <input type='color' value={subtitleColor} onChange={(e) => setSubtitleColor(e.target.value)} style={{ ...inputStyle, height: 32, padding: '2px 6px' }} />
                    </div>
                    <div>
                      <label style={labelStyle}>Position</label>
                      <select value={subtitlePosition} onChange={(e) => setSubtitlePosition(e.target.value)} style={selectStyle}>
                        <option value='bottom'>Bottom</option>
                        <option value='top'>Top</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Text Watermark Settings */}
            {operation === 'text-watermark' && (
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--bp-border)', flexShrink: 0 }}>
                <div style={sectionHeadStyle}>Text Watermark Settings</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <label style={labelStyle}>Watermark Text</label>
                    <input value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} placeholder='Copyright 2024' style={inputStyle} />
                  </div>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3'>
                    <div>
                      <label style={labelStyle}>Position</label>
                      <select value={textPosition} onChange={(e) => setTextPosition(e.target.value)} style={selectStyle}>
                        <option value='top-left'>Top Left</option>
                        <option value='top-right'>Top Right</option>
                        <option value='bottom-left'>Bottom Left</option>
                        <option value='bottom-right'>Bottom Right</option>
                        <option value='center'>Center</option>
                        <option value='custom'>Custom</option>
                      </select>
                      {textPosition === 'custom' && (
                        <input value={customTextPosition} onChange={(e) => setCustomTextPosition(e.target.value)} placeholder='10:10' style={{ ...inputStyle, marginTop: 6 }} />
                      )}
                    </div>
                    <div>
                      <label style={labelStyle}>Font Size</label>
                      <input type='number' value={textFontSize} onChange={(e) => setTextFontSize(parseInt(e.target.value) || 24)} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Color</label>
                      <input type='color' value={textColor} onChange={(e) => setTextColor(e.target.value)} style={{ ...inputStyle, height: 32, padding: '2px 6px' }} />
                    </div>
                    <div>
                      <label style={labelStyle}>Opacity (0–1)</label>
                      <input type='number' min='0' max='1' step='0.1' value={textOpacity} onChange={(e) => setTextOpacity(parseFloat(e.target.value) || 0.7)} style={inputStyle} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Image Watermark Settings */}
            {operation === 'image-watermark' && (
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--bp-border)', flexShrink: 0 }}>
                <div style={sectionHeadStyle}>Image Watermark Settings</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <label style={labelStyle}>Image File</label>
                    <input value={imageFile} onChange={(e) => setImageFile(e.target.value)} placeholder='watermark.png' style={{ ...inputStyle, fontFamily: 'monospace' }} />
                  </div>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3'>
                    <div>
                      <label style={labelStyle}>Position</label>
                      <select value={imagePosition} onChange={(e) => setImagePosition(e.target.value)} style={selectStyle}>
                        <option value='top-left'>Top Left</option>
                        <option value='top-right'>Top Right</option>
                        <option value='bottom-left'>Bottom Left</option>
                        <option value='bottom-right'>Bottom Right</option>
                        <option value='center'>Center</option>
                        <option value='custom'>Custom</option>
                      </select>
                      {imagePosition === 'custom' && (
                        <input value={customImagePosition} onChange={(e) => setCustomImagePosition(e.target.value)} placeholder='10:10' style={{ ...inputStyle, marginTop: 6 }} />
                      )}
                    </div>
                    <div>
                      <label style={labelStyle}>Scale (%)</label>
                      <input type='number' value={imageScale} onChange={(e) => setImageScale(e.target.value)} placeholder='100' style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Opacity (0–1)</label>
                      <input type='number' min='0' max='1' step='0.1' value={imageOpacity} onChange={(e) => setImageOpacity(parseFloat(e.target.value) || 0.7)} style={inputStyle} />
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Action bar */}
          <div className='flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border-t border-[var(--bp-border-str)] flex-shrink-0' style={{ borderTop: '1px dashed var(--bp-border-str)' }}>
            <button type='button' className='bp-btn bp-btn-solid min-h-10 px-2 sm:px-3' style={{ flex: 1 }} onClick={generateCommand}>
              <FileText className='w-4 h-4 mr-2 inline' />GENERATE COMMAND
            </button>
          </div>
        </Panel>

        {/* Right panel: output */}
        <Panel title='Generated FFmpeg Command' style={{ borderTop: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {command ? (
              <>
                <div className='flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border-b border-[var(--bp-border)] flex-shrink-0'>
                  <BpCopyBtn text={command} label='COPY' />
                </div>
                <pre style={{ flex: 1, margin: 0, padding: '12px 14px', fontSize: 12, color: 'var(--bp-ink)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.65, overflowY: 'auto' }}>{command}</pre>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--bp-ink-faint)' }}>
                <FileText style={{ width: 36, height: 36, opacity: 0.35 }} />
                <span style={{ fontSize: 11 }}>Configure settings and click Generate Command</span>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
