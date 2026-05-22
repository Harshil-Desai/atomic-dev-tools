'use client';

import { useState } from 'react';
import { BpToolStage, BpPanel, BpCopyBtn } from '@/components/blueprint';
import { Film, Scissors } from 'lucide-react';

type OutputFormat = 'mp4' | 'avi' | 'mkv' | 'gif' | 'webm';
type VideoCodec = 'h264' | 'h265' | 'vp9' | 'copy';
type AudioCodec = 'aac' | 'mp3' | 'opus' | 'copy' | 'none';
type QualityPreset = 'low' | 'medium' | 'high' | 'custom';

const SELECT_CLS = 'w-full h-9 px-3 rounded border border-[hsla(0,0%,20%,1)] bg-[#121212] text-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500';

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

  return (
    <BpToolStage cat='ffmpeg'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>FFmpeg Clipper & Converter</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Generate FFmpeg commands for clipping and converting videos</p>
      </div>
      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-3xl mx-auto space-y-4'>

          <BpPanel title='Preset Templates'>
            <div className='flex flex-wrap gap-2'>
              {[['quick-gif', 'Quick GIF'], ['social-media', 'Social Media'], ['high-quality', 'High Quality']].map(([key, label]) => (
                <button key={key} type='button' className='bp-btn' onClick={() => applyPreset(key)}>{label}</button>
              ))}
            </div>
          </BpPanel>

          <BpPanel title='Input & Timing'>
            <div className='space-y-3'>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Input Filename</label>
                <input value={inputFile} onChange={(e) => setInputFile(e.target.value)} placeholder='input.mp4' className='bp-input w-full font-mono' />
              </div>
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                <div>
                  <label className='block text-xs text-gray-500 mb-1'>Start Time</label>
                  <input value={startTime} onChange={(e) => setStartTime(e.target.value)} placeholder='00:00:10' className='bp-input w-full font-mono' />
                </div>
                <div>
                  <label className='block text-xs text-gray-500 mb-1'>Duration</label>
                  <input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder='00:00:05' className='bp-input w-full font-mono' />
                </div>
                <div>
                  <label className='block text-xs text-gray-500 mb-1'>End Time (optional)</label>
                  <input value={endTime} onChange={(e) => setEndTime(e.target.value)} placeholder='00:00:15' className='bp-input w-full font-mono' />
                </div>
              </div>
            </div>
          </BpPanel>

          <BpPanel title='Output Options'>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Output Format</label>
                <select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value as OutputFormat)} className={SELECT_CLS}>
                  <option value='mp4'>MP4</option><option value='avi'>AVI</option><option value='mkv'>MKV</option><option value='gif'>GIF</option><option value='webm'>WEBM</option>
                </select>
              </div>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Video Codec</label>
                <select value={videoCodec} onChange={(e) => setVideoCodec(e.target.value as VideoCodec)} className={SELECT_CLS}>
                  <option value='h264'>H.264</option><option value='h265'>H.265</option><option value='vp9'>VP9</option><option value='copy'>Copy (no re-encode)</option>
                </select>
              </div>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Audio Codec</label>
                <select value={audioCodec} onChange={(e) => setAudioCodec(e.target.value as AudioCodec)} className={SELECT_CLS}>
                  <option value='aac'>AAC</option><option value='mp3'>MP3</option><option value='opus'>Opus</option><option value='copy'>Copy (no re-encode)</option><option value='none'>None (remove audio)</option>
                </select>
              </div>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Quality Preset</label>
                <select value={qualityPreset} onChange={(e) => setQualityPreset(e.target.value as QualityPreset)} className={SELECT_CLS}>
                  <option value='low'>Low</option><option value='medium'>Medium</option><option value='high'>High</option><option value='custom'>Custom</option>
                </select>
                {qualityPreset === 'custom' && <input value={customBitrate} onChange={(e) => setCustomBitrate(e.target.value)} placeholder='2500k' className='bp-input w-full font-mono mt-2' />}
              </div>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Scale</label>
                <select value={scale} onChange={(e) => setScale(e.target.value)} className={SELECT_CLS}>
                  <option value=''>Keep Original</option><option value='720p'>720p</option><option value='1080p'>1080p</option><option value='480p'>480p</option>
                </select>
              </div>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>FPS (empty = keep original)</label>
                <input value={fps} onChange={(e) => setFps(e.target.value)} placeholder='30' className='bp-input w-full font-mono' />
              </div>
            </div>
          </BpPanel>

          <button type='button' className='bp-btn bp-btn-solid w-full' onClick={generateCommand}>
            <Scissors className='w-4 h-4 mr-2 inline' />GENERATE COMMAND
          </button>

          {command && (
            <BpPanel title='Generated FFmpeg Command'>
              <div className='bp-panel-actions mb-3'><BpCopyBtn text={command} label='COPY' /></div>
              <code className='block bp-code-view px-4 py-3 font-mono text-sm text-gray-300 whitespace-pre-wrap break-all'>{command}</code>
            </BpPanel>
          )}

          {!command && (
            <div className='text-center text-gray-600 py-12'>
              <Film className='w-10 h-10 mx-auto mb-3 opacity-40' />
              <p className='text-sm'>Configure settings and click Generate Command</p>
            </div>
          )}
        </div>
      </div>
    </BpToolStage>
  );
}
