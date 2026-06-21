'use client';

import React, { useState } from 'react';
import { BpCopyBtn } from '@/components/blueprint';
import { Music } from 'lucide-react';

type AudioFormat = 'mp3' | 'aac' | 'flac' | 'wav' | 'ogg' | 'm4a' | 'opus';
type Bitrate = '128k' | '192k' | '256k' | '320k' | 'custom';
type SampleRate = '44100' | '48000' | '96000' | 'original';
type Channels = 'mono' | 'stereo' | 'original';

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

export default function FfmpegAudioExtractorPage() {
  const [inputFile, setInputFile] = useState('input.mp4');
  const [outputFile, setOutputFile] = useState('output.mp3');
  const [audioFormat, setAudioFormat] = useState<AudioFormat>('mp3');
  const [bitrate, setBitrate] = useState<Bitrate>('192k');
  const [customBitrate, setCustomBitrate] = useState('');
  const [sampleRate, setSampleRate] = useState<SampleRate>('44100');
  const [channels, setChannels] = useState<Channels>('stereo');
  const [trimStart, setTrimStart] = useState('');
  const [trimDuration, setTrimDuration] = useState('');
  const [normalize, setNormalize] = useState(false);
  const [volume, setVolume] = useState('0');
  const [command, setCommand] = useState('');

  const getAudioCodec = (): string => {
    switch (audioFormat) {
      case 'mp3': return 'libmp3lame';
      case 'aac': return 'aac';
      case 'flac': return 'flac';
      case 'wav': return 'pcm_s16le';
      case 'ogg': return 'libvorbis';
      case 'm4a': return 'aac';
      case 'opus': return 'libopus';
    }
  };

  const getBitrateValue = (): string => {
    if (bitrate === 'custom' && customBitrate) return customBitrate;
    return bitrate;
  };

  const generateCommand = () => {
    let cmd = 'ffmpeg -i ' + inputFile;
    if (trimStart) cmd += ` -ss ${trimStart}`;
    if (trimDuration) cmd += ` -t ${trimDuration}`;
    cmd += ' -vn';
    cmd += ` -acodec ${getAudioCodec()}`;
    if (audioFormat !== 'flac' && audioFormat !== 'wav') cmd += ` -ab ${getBitrateValue()}`;
    if (sampleRate !== 'original') cmd += ` -ar ${sampleRate}`;
    if (channels === 'mono') cmd += ' -ac 1';
    else if (channels === 'stereo') cmd += ' -ac 2';
    if (volume !== '0') {
      const volumeValue = parseFloat(volume);
      if (volumeValue !== 0) { const volumeDb = volumeValue > 0 ? `+${volumeValue}` : volumeValue.toString(); cmd += ` -af "volume=${volumeDb}dB"`; }
    }
    if (normalize) {
      if (volume !== '0') cmd = cmd.replace(/-af "[^"]*"/, `-af "volume=${volume !== '0' ? (parseFloat(volume) > 0 ? '+' + volume : volume) : ''}dB,loudnorm"`);
      else cmd += ' -af "loudnorm"';
    }
    cmd += ` ${outputFile}`;
    setCommand(cmd);
  };

  const applyPreset = (preset: string) => {
    switch (preset) {
      case 'podcast': setAudioFormat('mp3'); setBitrate('128k'); setSampleRate('44100'); setChannels('mono'); break;
      case 'music': setAudioFormat('mp3'); setBitrate('320k'); setSampleRate('44100'); setChannels('stereo'); break;
      case 'audiobook': setAudioFormat('m4a'); setBitrate('128k'); setSampleRate('44100'); setChannels('mono'); break;
    }
    setTimeout(generateCommand, 100);
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

  return (
    <div
      className='h-full flex flex-col overflow-hidden'
      data-cat='ffmpeg'
      style={{ ...CSS_VARS, fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', background: 'var(--bp-bg)', color: 'var(--bp-ink)' }}
    >
      <div className='p-4 sm:p-5 md:p-6 border-b border-[var(--bp-border)] bg-[var(--bp-surface)] flex-shrink-0'>
        <h1 className='text-sm sm:text-base font-semibold text-white m-0 mb-1'>FFmpeg Audio Extractor</h1>
        <p style={{ fontSize: 11, color: 'var(--bp-ink-mute)', margin: 0 }}>Extract audio tracks from video files to common formats</p>
      </div>

      <div className='flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 overflow-hidden'>
        {/* Left: Configuration */}
        <Panel title='Configuration' style={{ borderTop: 0, borderLeft: 0, borderBottom: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

            {/* Preset Profiles */}
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--bp-border)' }}>
              <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)', marginBottom: 8, fontWeight: 600 }}>Preset Profiles</div>
              <div className='flex flex-wrap gap-2 sm:gap-3'>
                {[['podcast', 'Podcast'], ['music', 'Music'], ['audiobook', 'Audiobook']].map(([key, label]) => (
                  <button key={key} type='button' className='bp-btn min-h-10 px-2 sm:px-3' onClick={() => applyPreset(key)}>{label}</button>
                ))}
              </div>
            </div>

            {/* Input / Output */}
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--bp-border)' }}>
              <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)', marginBottom: 8, fontWeight: 600 }}>Input / Output</div>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3'>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--bp-ink-mute)', marginBottom: 4 }}>Input Video/Audio</label>
                  <input
                    value={inputFile}
                    onChange={(e) => setInputFile(e.target.value)}
                    placeholder='input.mp4'
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--bp-ink-mute)', marginBottom: 4 }}>Output Audio</label>
                  <input
                    value={outputFile}
                    onChange={(e) => setOutputFile(e.target.value)}
                    placeholder='output.mp3'
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* Format & Quality */}
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--bp-border)' }}>
              <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)', marginBottom: 8, fontWeight: 600 }}>Format & Quality</div>
              <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 mb-2'>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--bp-ink-mute)', marginBottom: 4 }}>Output Format</label>
                  <select
                    value={audioFormat}
                    onChange={(e) => {
                      setAudioFormat(e.target.value as AudioFormat);
                      setOutputFile(outputFile.replace(/\.[^.]+$/, '') + '.' + e.target.value);
                    }}
                    style={selectStyle}
                  >
                    <option value='mp3'>MP3</option>
                    <option value='aac'>AAC</option>
                    <option value='flac'>FLAC (lossless)</option>
                    <option value='wav'>WAV (uncompressed)</option>
                    <option value='ogg'>OGG</option>
                    <option value='m4a'>M4A</option>
                    <option value='opus'>OPUS</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--bp-ink-mute)', marginBottom: 4 }}>Bitrate</label>
                  <select
                    value={bitrate}
                    onChange={(e) => setBitrate(e.target.value as Bitrate)}
                    style={{ ...selectStyle, opacity: (audioFormat === 'flac' || audioFormat === 'wav') ? 0.4 : 1 }}
                    disabled={audioFormat === 'flac' || audioFormat === 'wav'}
                  >
                    <option value='128k'>128 kbps</option>
                    <option value='192k'>192 kbps</option>
                    <option value='256k'>256 kbps</option>
                    <option value='320k'>320 kbps</option>
                    <option value='custom'>Custom</option>
                  </select>
                  {bitrate === 'custom' && (
                    <input
                      value={customBitrate}
                      onChange={(e) => setCustomBitrate(e.target.value)}
                      placeholder='192k'
                      style={{ ...inputStyle, marginTop: 6 }}
                    />
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--bp-ink-mute)', marginBottom: 4 }}>Sample Rate</label>
                  <select value={sampleRate} onChange={(e) => setSampleRate(e.target.value as SampleRate)} style={selectStyle}>
                    <option value='44100'>44.1 kHz (CD)</option>
                    <option value='48000'>48 kHz (pro)</option>
                    <option value='96000'>96 kHz (hi-res)</option>
                    <option value='original'>Keep original</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, color: 'var(--bp-ink-mute)', marginBottom: 4 }}>Channels</label>
                <select value={channels} onChange={(e) => setChannels(e.target.value as Channels)} style={selectStyle}>
                  <option value='mono'>Mono</option>
                  <option value='stereo'>Stereo</option>
                  <option value='original'>Keep original</option>
                </select>
              </div>
            </div>

            {/* Advanced Options */}
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--bp-border)' }}>
              <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)', marginBottom: 8, fontWeight: 600 }}>Advanced Options</div>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3'>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--bp-ink-mute)', marginBottom: 4 }}>Trim Start</label>
                  <input
                    value={trimStart}
                    onChange={(e) => setTrimStart(e.target.value)}
                    placeholder='00:00:10'
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--bp-ink-mute)', marginBottom: 4 }}>Trim Duration</label>
                  <input
                    value={trimDuration}
                    onChange={(e) => setTrimDuration(e.target.value)}
                    placeholder='00:00:30'
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--bp-ink-mute)', marginBottom: 4 }}>Volume Adjustment (+/- dB)</label>
                  <input
                    type='number'
                    value={volume}
                    onChange={(e) => setVolume(e.target.value)}
                    placeholder='0'
                    style={inputStyle}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
                  <input
                    type='checkbox'
                    checked={normalize}
                    onChange={(e) => setNormalize(e.target.checked)}
                    style={{ width: 14, height: 14 }}
                  />
                  <label style={{ fontSize: 11, color: 'var(--bp-ink)' }}>Normalize audio (loudnorm)</label>
                </div>
              </div>
            </div>

          </div>

          {/* Action bar */}
          <div className='flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border-t border-dashed border-[var(--bp-border-str)] flex-shrink-0'>
            <button
              type='button'
              className='bp-btn bp-btn-solid flex-1 flex items-center justify-center gap-2 sm:gap-3 min-h-10 px-2 sm:px-3'
              onClick={generateCommand}
            >
              <Music style={{ width: 14, height: 14 }} />
              GENERATE COMMAND
            </button>
          </div>
        </Panel>

        {/* Right: Generated Command */}
        <Panel title='Generated FFmpeg Command' style={{ borderTop: 0, borderRight: 0, borderBottom: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {command ? (
              <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 8 }}>
                  <BpCopyBtn text={command} label='COPY' />
                </div>
                <code style={{ display: 'block', background: 'var(--bp-surface)', border: '1px solid var(--bp-border)', padding: '12px 14px', fontFamily: 'inherit', fontSize: 12, color: 'var(--bp-ink)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.65 }}>
                  {command}
                </code>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <Music style={{ width: 36, height: 36, opacity: 0.2, color: 'var(--bp-ink-faint)' }} />
                <p style={{ fontSize: 11, color: 'var(--bp-ink-mute)', margin: 0 }}>Configure settings and click Generate Command</p>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
