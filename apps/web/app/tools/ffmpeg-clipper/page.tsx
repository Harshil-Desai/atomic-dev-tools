'use client';

import { useState } from 'react';
import { Button, Card, CardContent, Input, Textarea } from '@/ui';
import { Film, Copy, Check, Scissors } from 'lucide-react';

type OutputFormat = 'mp4' | 'avi' | 'mkv' | 'gif' | 'webm';
type VideoCodec = 'h264' | 'h265' | 'vp9' | 'copy';
type AudioCodec = 'aac' | 'mp3' | 'opus' | 'copy' | 'none';
type QualityPreset = 'low' | 'medium' | 'high' | 'custom';

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
  const [copied, setCopied] = useState(false);

  const parseTime = (timeStr: string): string => {
    // Accept HH:MM:SS or just seconds
    if (timeStr.includes(':')) {
      return timeStr;
    }
    const seconds = parseInt(timeStr);
    if (isNaN(seconds)) return timeStr;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const getBitrate = (): string => {
    if (qualityPreset === 'custom' && customBitrate) {
      return customBitrate;
    }
    switch (qualityPreset) {
      case 'low':
        return '1000k';
      case 'medium':
        return '2500k';
      case 'high':
        return '5000k';
      default:
        return '2500k';
    }
  };

  const generateCommand = () => {
    let cmd = 'ffmpeg -i ' + inputFile;

    // Start time
    if (startTime) {
      cmd += ` -ss ${parseTime(startTime)}`;
    }

    // Duration or end time
    if (duration) {
      cmd += ` -t ${parseTime(duration)}`;
    } else if (endTime && startTime) {
      // Calculate duration from start and end
      const start = parseTime(startTime);
      const end = parseTime(endTime);
      cmd += ` -t ${end}`;
    }

    // Video filters
    const videoFilters: string[] = [];

    if (scale) {
      if (scale === '720p') {
        videoFilters.push('scale=1280:720');
      } else if (scale === '1080p') {
        videoFilters.push('scale=1920:1080');
      } else if (scale === '480p') {
        videoFilters.push('scale=854:480');
      } else if (scale.includes('x') || scale.includes(':')) {
        videoFilters.push(`scale=${scale}`);
      }
    }

    if (fps) {
      videoFilters.push(`fps=${fps}`);
    }

    if (videoFilters.length > 0) {
      cmd += ` -vf "${videoFilters.join(',')}"`;
    } else if (fps && !scale) {
      cmd += ` -r ${fps}`;
    }

    // Video codec
    if (videoCodec !== 'copy') {
      cmd += ` -c:v ${videoCodec}`;
      if (qualityPreset !== 'custom' || customBitrate) {
        cmd += ` -b:v ${getBitrate()}`;
      }
    } else {
      cmd += ` -c:v copy`;
    }

    // Audio codec
    if (audioCodec === 'none') {
      cmd += ' -an';
    } else if (audioCodec !== 'copy') {
      cmd += ` -c:a ${audioCodec}`;
    } else {
      cmd += ` -c:a copy`;
    }

    // Output file
    const outputFile = inputFile.replace(/\.[^.]+$/, '') + '_clipped.' + outputFormat;
    cmd += ` ${outputFile}`;

    setCommand(cmd);
  };

  const applyPreset = (preset: string) => {
    switch (preset) {
      case 'quick-gif':
        setOutputFormat('gif');
        setScale('720p');
        setFps('10');
        setVideoCodec('h264');
        setAudioCodec('none');
        break;
      case 'social-media':
        setOutputFormat('mp4');
        setScale('1080p');
        setFps('30');
        setVideoCodec('h264');
        setAudioCodec('aac');
        setQualityPreset('high');
        break;
      case 'high-quality':
        setOutputFormat('mp4');
        setScale('');
        setFps('');
        setVideoCodec('h265');
        setAudioCodec('aac');
        setQualityPreset('high');
        break;
    }
    setTimeout(generateCommand, 100);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy');
    }
  };

  return (
    <div className='h-full flex flex-col'>
      {/* Header */}
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>FFmpeg Clipper & Converter</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Generate FFmpeg commands for clipping and converting videos</p>
      </div>
      {/* Content */}
      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-6xl mx-auto space-y-6'>
          {/* Preset Templates */}
          <Card>
            <CardContent className='pt-6'>
              <h3 className='text-xs sm:text-sm font-semibold text-gray-300 mb-3'>Preset Templates</h3>
              <div className='flex flex-wrap gap-2'>
                <Button onClick={() => applyPreset('quick-gif')} variant='outline' size='sm'>
                  Quick GIF
                </Button>
                <Button onClick={() => applyPreset('social-media')} variant='outline' size='sm'>
                  Social Media
                </Button>
                <Button onClick={() => applyPreset('high-quality')} variant='outline' size='sm'>
                  High Quality
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Input Section */}
          <Card>
            <CardContent className='pt-6 space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-300 mb-2'>Input Filename</label>
                <Input value={inputFile} onChange={(e) => setInputFile(e.target.value)} placeholder='input.mp4' />
              </div>
              <div className='grid md:grid-cols-3 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>
                    Start Time (HH:MM:SS or seconds)
                  </label>
                  <Input value={startTime} onChange={(e) => setStartTime(e.target.value)} placeholder='00:00:10' />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Duration (HH:MM:SS or seconds)</label>
                  <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder='00:00:05' />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>
                    End Time (optional, HH:MM:SS or seconds)
                  </label>
                  <Input value={endTime} onChange={(e) => setEndTime(e.target.value)} placeholder='00:00:15' />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Output Format */}
          <Card>
            <CardContent className='pt-6 space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-300 mb-2'>Output Format</label>
                <select
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
                  className='w-full h-10 px-3 rounded-md border border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  <option value='mp4'>MP4</option>
                  <option value='avi'>AVI</option>
                  <option value='mkv'>MKV</option>
                  <option value='gif'>GIF</option>
                  <option value='webm'>WEBM</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Codec Options */}
          <Card>
            <CardContent className='pt-6 space-y-4'>
              <div className='grid md:grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Video Codec</label>
                  <select
                    value={videoCodec}
                    onChange={(e) => setVideoCodec(e.target.value as VideoCodec)}
                    className='w-full h-10 px-3 rounded-md border border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                  >
                    <option value='h264'>H.264</option>
                    <option value='h265'>H.265</option>
                    <option value='vp9'>VP9</option>
                    <option value='copy'>Copy (no re-encode)</option>
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Audio Codec</label>
                  <select
                    value={audioCodec}
                    onChange={(e) => setAudioCodec(e.target.value as AudioCodec)}
                    className='w-full h-10 px-3 rounded-md border border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                  >
                    <option value='aac'>AAC</option>
                    <option value='mp3'>MP3</option>
                    <option value='opus'>Opus</option>
                    <option value='copy'>Copy (no re-encode)</option>
                    <option value='none'>None (remove audio)</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quality & Scale */}
          <Card>
            <CardContent className='pt-6 space-y-4'>
              <div className='grid md:grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Quality/Bitrate Preset</label>
                  <select
                    value={qualityPreset}
                    onChange={(e) => setQualityPreset(e.target.value as QualityPreset)}
                    className='w-full h-10 px-3 rounded-md border border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                  >
                    <option value='low'>Low</option>
                    <option value='medium'>Medium</option>
                    <option value='high'>High</option>
                    <option value='custom'>Custom</option>
                  </select>
                  {qualityPreset === 'custom' && (
                    <Input
                      value={customBitrate}
                      onChange={(e) => setCustomBitrate(e.target.value)}
                      placeholder='2500k'
                      className='mt-2'
                    />
                  )}
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Scale/Resize</label>
                  <select
                    value={scale}
                    onChange={(e) => setScale(e.target.value)}
                    className='w-full h-10 px-3 rounded-md border border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                  >
                    <option value=''>Keep Original</option>
                    <option value='720p'>720p (1280x720)</option>
                    <option value='1080p'>1080p (1920x1080)</option>
                    <option value='480p'>480p (854x480)</option>
                    <option value='custom'>Custom (enter below)</option>
                  </select>
                  {scale === 'custom' && (
                    <Input
                      value={scale}
                      onChange={(e) => setScale(e.target.value)}
                      placeholder='1280:720 or 1280:-1'
                      className='mt-2'
                    />
                  )}
                </div>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-300 mb-2'>
                  FPS (Leave empty to keep original)
                </label>
                <Input value={fps} onChange={(e) => setFps(e.target.value)} placeholder='30' />
              </div>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Button onClick={generateCommand} className='w-full' size='lg'>
            <Scissors className='w-4 h-4 mr-2' />
            Generate Command
          </Button>

          {/* Generated Command */}
          {command && (
            <Card>
              <CardContent className='pt-6 space-y-4'>
                <div className='flex items-center justify-between mb-3'>
                  <h3 className='text-sm font-semibold text-gray-300'>Generated FFmpeg Command</h3>
                  <Button onClick={handleCopy} variant='outline' size='sm'>
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
                <div className='bg-gray-950 rounded-md p-4'>
                  <code className='text-sm font-mono text-gray-300 whitespace-pre-wrap break-all'>{command}</code>
                </div>
              </CardContent>
            </Card>
          )}

          {!command && (
            <Card className='border-dashed'>
              <CardContent className='pt-6'>
                <div className='text-center text-gray-500 py-12'>
                  <Film className='w-12 h-12 mx-auto mb-4 opacity-50' />
                  <p>Configure settings and click "Generate Command" to create FFmpeg command</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
