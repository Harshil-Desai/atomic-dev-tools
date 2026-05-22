'use client';

import { useState } from 'react';
import { BpToolStage, BpPanel, BpCopyBtn } from '@/components/blueprint';
import { Music } from 'lucide-react';

type AudioFormat = 'mp3' | 'aac' | 'flac' | 'wav' | 'ogg' | 'm4a' | 'opus';
type Bitrate = '128k' | '192k' | '256k' | '320k' | 'custom';
type SampleRate = '44100' | '48000' | '96000' | 'original';
type Channels = 'mono' | 'stereo' | 'original';

const SELECT_CLS = 'w-full h-9 px-3 rounded border border-[hsla(0,0%,20%,1)] bg-[#121212] text-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500';

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

  return (
    <BpToolStage cat='ffmpeg'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>FFmpeg Audio Extractor</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Generate FFmpeg commands to extract audio from videos</p>
      </div>
      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-3xl mx-auto space-y-4'>

          <BpPanel title='Preset Profiles'>
            <div className='flex flex-wrap gap-2'>
              {[['podcast', 'Podcast'], ['music', 'Music'], ['audiobook', 'Audiobook']].map(([key, label]) => (
                <button key={key} type='button' className='bp-btn' onClick={() => applyPreset(key)}>{label}</button>
              ))}
            </div>
          </BpPanel>

          <BpPanel title='Input / Output'>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Input Video/Audio</label>
                <input value={inputFile} onChange={(e) => setInputFile(e.target.value)} placeholder='input.mp4' className='bp-input w-full font-mono' />
              </div>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Output Audio</label>
                <input value={outputFile} onChange={(e) => setOutputFile(e.target.value)} placeholder='output.mp3' className='bp-input w-full font-mono' />
              </div>
            </div>
          </BpPanel>

          <BpPanel title='Format & Quality'>
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3'>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Output Format</label>
                <select value={audioFormat} onChange={(e) => { setAudioFormat(e.target.value as AudioFormat); setOutputFile(outputFile.replace(/\.[^.]+$/, '') + '.' + e.target.value); }} className={SELECT_CLS}>
                  <option value='mp3'>MP3</option><option value='aac'>AAC</option><option value='flac'>FLAC (lossless)</option><option value='wav'>WAV (uncompressed)</option><option value='ogg'>OGG</option><option value='m4a'>M4A</option><option value='opus'>OPUS</option>
                </select>
              </div>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Bitrate</label>
                <select value={bitrate} onChange={(e) => setBitrate(e.target.value as Bitrate)} className={SELECT_CLS} disabled={audioFormat === 'flac' || audioFormat === 'wav'}>
                  <option value='128k'>128 kbps</option><option value='192k'>192 kbps</option><option value='256k'>256 kbps</option><option value='320k'>320 kbps</option><option value='custom'>Custom</option>
                </select>
                {bitrate === 'custom' && <input value={customBitrate} onChange={(e) => setCustomBitrate(e.target.value)} placeholder='192k' className='bp-input w-full font-mono mt-2' />}
              </div>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Sample Rate</label>
                <select value={sampleRate} onChange={(e) => setSampleRate(e.target.value as SampleRate)} className={SELECT_CLS}>
                  <option value='44100'>44.1 kHz (CD)</option><option value='48000'>48 kHz (pro)</option><option value='96000'>96 kHz (hi-res)</option><option value='original'>Keep original</option>
                </select>
              </div>
            </div>
            <div>
              <label className='block text-xs text-gray-500 mb-1'>Channels</label>
              <select value={channels} onChange={(e) => setChannels(e.target.value as Channels)} className={SELECT_CLS}>
                <option value='mono'>Mono</option><option value='stereo'>Stereo</option><option value='original'>Keep original</option>
              </select>
            </div>
          </BpPanel>

          <BpPanel title='Advanced Options'>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3'>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Trim Start</label>
                <input value={trimStart} onChange={(e) => setTrimStart(e.target.value)} placeholder='00:00:10' className='bp-input w-full font-mono' />
              </div>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Trim Duration</label>
                <input value={trimDuration} onChange={(e) => setTrimDuration(e.target.value)} placeholder='00:00:30' className='bp-input w-full font-mono' />
              </div>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Volume Adjustment (+/- dB)</label>
                <input type='number' value={volume} onChange={(e) => setVolume(e.target.value)} placeholder='0' className='bp-input w-full font-mono' />
              </div>
              <div className='flex items-center gap-2 pt-5'>
                <input type='checkbox' checked={normalize} onChange={(e) => setNormalize(e.target.checked)} className='w-4 h-4 rounded' />
                <label className='text-sm text-gray-300'>Normalize audio (loudnorm)</label>
              </div>
            </div>
          </BpPanel>

          <button type='button' className='bp-btn bp-btn-solid w-full' onClick={generateCommand}>
            <Music className='w-4 h-4 mr-2 inline' />GENERATE COMMAND
          </button>

          {command && (
            <BpPanel title='Generated FFmpeg Command'>
              <div className='bp-panel-actions mb-3'><BpCopyBtn text={command} label='COPY' /></div>
              <code className='block bp-code-view px-4 py-3 font-mono text-sm text-gray-300 whitespace-pre-wrap break-all'>{command}</code>
            </BpPanel>
          )}

          {!command && (
            <div className='text-center text-gray-600 py-12'>
              <Music className='w-10 h-10 mx-auto mb-3 opacity-40' />
              <p className='text-sm'>Configure settings and click Generate Command</p>
            </div>
          )}
        </div>
      </div>
    </BpToolStage>
  );
}
