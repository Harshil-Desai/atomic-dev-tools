'use client';

import { useState } from 'react';
import { Button, Card, CardContent, Input, Textarea } from '@/ui';
import { Music, Copy, Check } from 'lucide-react';

type AudioFormat = 'mp3' | 'aac' | 'flac' | 'wav' | 'ogg' | 'm4a' | 'opus';
type Bitrate = '128k' | '192k' | '256k' | '320k' | 'custom';
type SampleRate = '44100' | '48000' | '96000' | 'original';
type Channels = 'mono' | 'stereo' | 'original';

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
  const [copied, setCopied] = useState(false);

  const getAudioCodec = (): string => {
    switch (audioFormat) {
      case 'mp3':
        return 'libmp3lame';
      case 'aac':
        return 'aac';
      case 'flac':
        return 'flac';
      case 'wav':
        return 'pcm_s16le';
      case 'ogg':
        return 'libvorbis';
      case 'm4a':
        return 'aac';
      case 'opus':
        return 'libopus';
    }
  };

  const getBitrateValue = (): string => {
    if (bitrate === 'custom' && customBitrate) {
      return customBitrate;
    }
    return bitrate;
  };

  const generateCommand = () => {
    let cmd = 'ffmpeg -i ' + inputFile;

    // Trim options
    if (trimStart) {
      cmd += ` -ss ${trimStart}`;
    }
    if (trimDuration) {
      cmd += ` -t ${trimDuration}`;
    }

    // Remove video stream
    cmd += ' -vn';

    // Audio codec
    const codec = getAudioCodec();
    cmd += ` -acodec ${codec}`;

    // Bitrate (for lossy formats)
    if (audioFormat !== 'flac' && audioFormat !== 'wav') {
      cmd += ` -ab ${getBitrateValue()}`;
    }

    // Sample rate
    if (sampleRate !== 'original') {
      cmd += ` -ar ${sampleRate}`;
    }

    // Channels
    if (channels === 'mono') {
      cmd += ' -ac 1';
    } else if (channels === 'stereo') {
      cmd += ' -ac 2';
    }

    // Volume adjustment
    if (volume !== '0') {
      const volumeValue = parseFloat(volume);
      if (volumeValue !== 0) {
        const volumeDb = volumeValue > 0 ? `+${volumeValue}` : volumeValue.toString();
        cmd += ` -af "volume=${volumeDb}dB"`;
      }
    }

    // Normalize
    if (normalize) {
      if (volume !== '0') {
        cmd = cmd.replace(
          /-af "[^"]*"/,
          `-af "volume=${volume !== '0' ? (parseFloat(volume) > 0 ? '+' + volume : volume) : ''}dB,loudnorm"`,
        );
      } else {
        cmd += ' -af "loudnorm"';
      }
    }

    // Output file
    cmd += ` ${outputFile}`;

    setCommand(cmd);
  };

  const applyPreset = (preset: string) => {
    switch (preset) {
      case 'podcast':
        setAudioFormat('mp3');
        setBitrate('128k');
        setSampleRate('44100');
        setChannels('mono');
        break;
      case 'music':
        setAudioFormat('mp3');
        setBitrate('320k');
        setSampleRate('44100');
        setChannels('stereo');
        break;
      case 'audiobook':
        setAudioFormat('m4a');
        setBitrate('128k');
        setSampleRate('44100');
        setChannels('mono');
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
      <div className='border-b border-gray-800 bg-gray-900 p-6'>
        <h1 className='text-2xl font-bold text-white mb-2'>FFmpeg Audio Extractor</h1>
        <p className='text-gray-400'>Generate FFmpeg commands to extract audio from videos</p>
      </div>
      {/* Content */}
      <div className='flex-1 overflow-auto p-6'>
        <div className='max-w-6xl mx-auto space-y-6'>
          {/* Preset Profiles */}
          <Card>
            <CardContent className='pt-6'>
              <h3 className='text-sm font-semibold text-gray-300 mb-3'>Preset Profiles</h3>
              <div className='flex flex-wrap gap-2'>
                <Button onClick={() => applyPreset('podcast')} variant='outline' size='sm'>
                  Podcast
                </Button>
                <Button onClick={() => applyPreset('music')} variant='outline' size='sm'>
                  Music
                </Button>
                <Button onClick={() => applyPreset('audiobook')} variant='outline' size='sm'>
                  Audiobook
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Input/Output */}
          <Card>
            <CardContent className='pt-6 space-y-4'>
              <div className='grid md:grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Input Video/Audio</label>
                  <Input value={inputFile} onChange={(e) => setInputFile(e.target.value)} placeholder='input.mp4' />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Output Audio</label>
                  <Input value={outputFile} onChange={(e) => setOutputFile(e.target.value)} placeholder='output.mp3' />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Format & Quality */}
          <Card>
            <CardContent className='pt-6 space-y-4'>
              <div className='grid md:grid-cols-3 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Output Format</label>
                  <select
                    value={audioFormat}
                    onChange={(e) => {
                      setAudioFormat(e.target.value as AudioFormat);
                      const ext = e.target.value;
                      setOutputFile(outputFile.replace(/\.[^.]+$/, '') + '.' + ext);
                    }}
                    className='w-full h-10 px-3 rounded-md border border-gray-700 bg-gray-800 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
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
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Bitrate</label>
                  <select
                    value={bitrate}
                    onChange={(e) => setBitrate(e.target.value as Bitrate)}
                    className='w-full h-10 px-3 rounded-md border border-gray-700 bg-gray-800 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                    disabled={audioFormat === 'flac' || audioFormat === 'wav'}
                  >
                    <option value='128k'>128 kbps (low)</option>
                    <option value='192k'>192 kbps (medium)</option>
                    <option value='256k'>256 kbps (high)</option>
                    <option value='320k'>320 kbps (highest)</option>
                    <option value='custom'>Custom</option>
                  </select>
                  {bitrate === 'custom' && (
                    <Input
                      value={customBitrate}
                      onChange={(e) => setCustomBitrate(e.target.value)}
                      placeholder='192k'
                      className='mt-2'
                    />
                  )}
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Sample Rate</label>
                  <select
                    value={sampleRate}
                    onChange={(e) => setSampleRate(e.target.value as SampleRate)}
                    className='w-full h-10 px-3 rounded-md border border-gray-700 bg-gray-800 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                  >
                    <option value='44100'>44.1 kHz (CD quality)</option>
                    <option value='48000'>48 kHz (professional)</option>
                    <option value='96000'>96 kHz (high-res)</option>
                    <option value='original'>Keep original</option>
                  </select>
                </div>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-300 mb-2'>Channels</label>
                <select
                  value={channels}
                  onChange={(e) => setChannels(e.target.value as Channels)}
                  className='w-full h-10 px-3 rounded-md border border-gray-700 bg-gray-800 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  <option value='mono'>Mono</option>
                  <option value='stereo'>Stereo</option>
                  <option value='original'>Keep original</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Advanced Options */}
          <Card>
            <CardContent className='pt-6 space-y-4'>
              <h3 className='text-sm font-semibold text-gray-300 mb-3'>Advanced Options</h3>
              <div className='grid md:grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>
                    Trim Start (HH:MM:SS or seconds)
                  </label>
                  <Input value={trimStart} onChange={(e) => setTrimStart(e.target.value)} placeholder='00:00:10' />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>
                    Trim Duration (HH:MM:SS or seconds)
                  </label>
                  <Input
                    value={trimDuration}
                    onChange={(e) => setTrimDuration(e.target.value)}
                    placeholder='00:00:30'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Volume Adjustment (+/- dB)</label>
                  <Input type='number' value={volume} onChange={(e) => setVolume(e.target.value)} placeholder='0' />
                </div>
                <div className='flex items-center gap-2 pt-6'>
                  <input
                    type='checkbox'
                    checked={normalize}
                    onChange={(e) => setNormalize(e.target.checked)}
                    className='w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500'
                  />
                  <label className='text-sm text-gray-300'>Normalize audio</label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Button onClick={generateCommand} className='w-full' size='lg'>
            <Music className='w-4 h-4 mr-2' />
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
                  <Music className='w-12 h-12 mx-auto mb-4 opacity-50' />
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
