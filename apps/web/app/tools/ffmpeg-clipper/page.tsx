'use client';

import { useState } from 'react';
import { BpCopyBtn } from '@/components/blueprint';
import { Film, Scissors } from 'lucide-react';

type OutputFormat = 'mp4' | 'avi' | 'mkv' | 'gif' | 'webm';
type VideoCodec = 'h264' | 'h265' | 'vp9' | 'copy';
type AudioCodec = 'aac' | 'mp3' | 'opus' | 'copy' | 'none';
type QualityPreset = 'low' | 'medium' | 'high' | 'custom';

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

export default function FfmpegClipperPage() {
  const [inputFile, setInputFile] = useState('input.mp4');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState('');
  const [endTime, setEndTime] = useState('');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('mp4');
  const [videoCodec, setVideoCodec] = useState<VideoCodec>('h264');
  const [audioCodec, setAudioCodec] = useState<AudioCodec>('aac');
  const [qualityPreset, setQualityPreset] = useState<QualityPreset>('medium');
  const [customBitrate, setCustomBitrate] = useState('');
  const [scale, setScale] = useState('');
  const [fps, setFps] = useState('');
  const [command, setCommand] = useState('');

  const parseTime = (timeStr: string): string => {
    if (timeStr.includes(':')) return timeStr;
    const seconds = parseInt(timeStr);
    if (isNaN(seconds)) return timeStr;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getBitrate = (): string => {
    if (qualityPreset === 'custom' && customBitrate) return customBitrate;
    switch (qualityPreset) {
      case 'low': return '1000k';
      case 'medium': return '2500k';
      case 'high': return '5000k';
      default: return '2500k';
    }
  };

  const generateCommand = () => {
    let cmd = 'ffmpeg -i ' + inputFile;
    if (startTime) cmd += ` -ss ${parseTime(startTime)}`;
    if (duration) cmd += ` -t ${parseTime(duration)}`;
    else if (endTime && startTime) cmd += ` -t ${parseTime(endTime)}`;
    const videoFilters: string[] = [];
    if (scale) {
      if (scale === '720p') videoFilters.push('scale=1280:720');
      else if (scale === '1080p') videoFilters.push('scale=1920:1080');
      else if (scale === '480p') videoFilters.push('scale=854:480');
      else if (scale.includes('x') || scale.includes(':')) videoFilters.push(`scale=${scale}`);
    }
    if (fps) videoFilters.push(`fps=${fps}`);
    if (videoFilters.length > 0) cmd += ` -vf "${videoFilters.join(',')}"`;
    else if (fps && !scale) cmd += ` -r ${fps}`;
    if (videoCodec !== 'copy') { cmd += ` -c:v ${videoCodec}`; if (qualityPreset !== 'custom' || customBitrate) cmd += ` -b:v ${getBitrate()}`; }
    else cmd += ` -c:v copy`;
    if (audioCodec === 'none') cmd += ' -an';
    else if (audioCodec !== 'copy') cmd += ` -c:a ${audioCodec}`;
    else cmd += ` -c:a copy`;
    const outputFile = inputFile.replace(/\.[^.]+$/, '') + '_clipped.' + outputFormat;
    cmd += ` ${outputFile}`;
    setCommand(cmd);
  };

  const applyPreset = (preset: string) => {
    switch (preset) {
      case 'quick-gif': setOutputFormat('gif'); setScale('720p'); setFps('10'); setVideoCodec('h264'); setAudioCodec('none'); break;
      case 'social-media': setOutputFormat('mp4'); setScale('1080p'); setFps('30'); setVideoCodec('h264'); setAudioCodec('aac'); setQualityPreset('high'); break;
      case 'high-quality': setOutputFormat('mp4'); setScale(''); setFps(''); setVideoCodec('h265'); setAudioCodec('aac'); setQualityPreset('high'); break;
    }
    setTimeout(generateCommand, 100);
  };

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
    fontSize: 9,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: 'var(--bp-ink-mute)',
    marginBottom: 4,
    display: 'block',
  };

  return (
    <div
      className='h-full flex flex-col overflow-hidden'
      data-cat='ffmpeg'
      style={{ ...CSS_VARS, fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', background: 'var(--bp-bg)', color: 'var(--bp-ink)' }}
    >
      <div style={{ padding: '12px 20px 10px', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0 }}>
        <h1 style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0, marginBottom: 2 }}>FFmpeg Clipper</h1>
        <p style={{ fontSize: 11, color: 'var(--bp-ink-mute)', margin: 0 }}>Trim video clips with precise start and end time controls</p>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>
        {/* Left panel: configuration */}
        <Panel title='Configuration' style={{ borderTop: 0, borderLeft: 0, borderBottom: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

            {/* Preset Templates */}
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--bp-border)' }}>
              <span style={labelStyle}>Preset Templates</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[['quick-gif', 'Quick GIF'], ['social-media', 'Social Media'], ['high-quality', 'High Quality']].map(([key, label]) => (
                  <button key={key} type='button' className='bp-btn' onClick={() => applyPreset(key)}>{label}</button>
                ))}
              </div>
            </div>

            {/* Input & Timing */}
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--bp-border)' }}>
              <span style={labelStyle}>Input & Timing</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <label style={labelStyle}>Input Filename</label>
                  <input
                    value={inputFile}
                    onChange={(e) => setInputFile(e.target.value)}
                    placeholder='input.mp4'
                    style={inputStyle}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={labelStyle}>Start Time</label>
                    <input
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      placeholder='00:00:10'
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Duration</label>
                    <input
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder='00:00:05'
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>End Time</label>
                    <input
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      placeholder='00:00:15'
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Output Options */}
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--bp-border)' }}>
              <span style={labelStyle}>Output Options</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={labelStyle}>Output Format</label>
                  <select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value as OutputFormat)} style={selectStyle}>
                    <option value='mp4'>MP4</option>
                    <option value='avi'>AVI</option>
                    <option value='mkv'>MKV</option>
                    <option value='gif'>GIF</option>
                    <option value='webm'>WEBM</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Video Codec</label>
                  <select value={videoCodec} onChange={(e) => setVideoCodec(e.target.value as VideoCodec)} style={selectStyle}>
                    <option value='h264'>H.264</option>
                    <option value='h265'>H.265</option>
                    <option value='vp9'>VP9</option>
                    <option value='copy'>Copy (no re-encode)</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Audio Codec</label>
                  <select value={audioCodec} onChange={(e) => setAudioCodec(e.target.value as AudioCodec)} style={selectStyle}>
                    <option value='aac'>AAC</option>
                    <option value='mp3'>MP3</option>
                    <option value='opus'>Opus</option>
                    <option value='copy'>Copy (no re-encode)</option>
                    <option value='none'>None (remove audio)</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Quality Preset</label>
                  <select value={qualityPreset} onChange={(e) => setQualityPreset(e.target.value as QualityPreset)} style={selectStyle}>
                    <option value='low'>Low</option>
                    <option value='medium'>Medium</option>
                    <option value='high'>High</option>
                    <option value='custom'>Custom</option>
                  </select>
                  {qualityPreset === 'custom' && (
                    <input
                      value={customBitrate}
                      onChange={(e) => setCustomBitrate(e.target.value)}
                      placeholder='2500k'
                      style={{ ...inputStyle, marginTop: 6 }}
                    />
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Scale</label>
                  <select value={scale} onChange={(e) => setScale(e.target.value)} style={selectStyle}>
                    <option value=''>Keep Original</option>
                    <option value='720p'>720p</option>
                    <option value='1080p'>1080p</option>
                    <option value='480p'>480p</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>FPS (empty = keep original)</label>
                  <input
                    value={fps}
                    onChange={(e) => setFps(e.target.value)}
                    placeholder='30'
                    style={inputStyle}
                  />
                </div>
              </div>
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
              <Scissors style={{ width: 14, height: 14 }} />
              GENERATE COMMAND
            </button>
          </div>
        </Panel>

        {/* Right panel: output */}
        <Panel title='Generated FFmpeg Command' meta={command ? 'READY' : undefined} style={{ borderTop: 0, borderRight: 0, borderBottom: 0 }}>
          {command ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderBottom: '1px solid var(--bp-border)', flexShrink: 0 }}>
                <BpCopyBtn text={command} label='COPY' />
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <pre style={{ margin: 0, padding: '12px 14px', fontSize: 12, color: 'var(--bp-ink)', lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: 'var(--bp-bg)' }}>{command}</pre>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <Film style={{ width: 36, height: 36, opacity: 0.2, color: 'var(--bp-ink-mute)' }} />
              <p style={{ fontSize: 11, color: 'var(--bp-ink-faint)', margin: 0 }}>Configure settings and click Generate Command</p>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
