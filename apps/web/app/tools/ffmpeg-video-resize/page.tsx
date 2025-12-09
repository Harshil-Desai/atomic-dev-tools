'use client';

import { useState } from 'react';
import { Button, Card, CardContent, Input } from '@/ui';
import { Maximize2, Copy, Check } from 'lucide-react';

type ResizeMethod = 'preset' | 'custom' | 'percentage';
type ScaleAlgorithm = 'fast' | 'bilinear' | 'lanczos';
type PaddingMode = 'pad' | 'crop' | 'stretch';

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
  const [copied, setCopied] = useState(false);

  const getPresetDimensions = (presetName: string): { width: string; height: string } => {
    switch (presetName) {
      case '4K':
        return { width: '3840', height: '2160' };
      case '1080p':
        return { width: '1920', height: '1080' };
      case '720p':
        return { width: '1280', height: '720' };
      case '480p':
        return { width: '854', height: '480' };
      case 'instagram':
        return { width: '1080', height: '1080' };
      case 'instagram-story':
        return { width: '1080', height: '1920' };
      case 'youtube-thumbnail':
        return { width: '1280', height: '720' };
      default:
        return { width: '1920', height: '1080' };
    }
  };

  const getScaleFilter = (): string => {
    const algorithmMap = {
      fast: 'fast_bilinear',
      bilinear: 'bilinear',
      lanczos: 'lanczos',
    };

    if (resizeMethod === 'preset') {
      const { width, height } = getPresetDimensions(preset);
      if (paddingMode === 'stretch') {
        return `scale=${width}:${height}:flags=${algorithmMap[scaleAlgorithm]}`;
      } else if (paddingMode === 'crop') {
        return `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`;
      } else {
        // pad
        return `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`;
      }
    } else if (resizeMethod === 'custom') {
      if (maintainAspectRatio) {
        return `scale=${customWidth}:-1:flags=${algorithmMap[scaleAlgorithm]}`;
      } else {
        return `scale=${customWidth}:${customHeight}:flags=${algorithmMap[scaleAlgorithm]}`;
      }
    } else {
      // percentage
      const percent = parseFloat(percentage) / 100;
      return `scale=iw*${percent}:ih*${percent}:flags=${algorithmMap[scaleAlgorithm]}`;
    }
  };

  const generateCommand = () => {
    let cmd = 'ffmpeg -i ' + inputFile;

    const scaleFilter = getScaleFilter();
    cmd += ` -vf "${scaleFilter}"`;

    if (keepCodec) {
      cmd += ' -c:v copy -c:a copy';
    }

    cmd += ` ${outputFile}`;

    setCommand(cmd);
  };

  const applyPreset = (presetName: string) => {
    setResizeMethod('preset');
    setPreset(presetName);
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
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>FFmpeg Video Resize & Scale</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Generate FFmpeg commands to resize and scale videos</p>
      </div>
      {/* Content */}
      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-6xl mx-auto space-y-6'>
          {/* Resize Method Tabs */}
          <Card>
            <CardContent className='pt-6'>
              <div className='flex gap-2 border-b border-gray-800'>
                <button
                  onClick={() => setResizeMethod('preset')}
                  className={`px-4 py-2 text-sm font-medium transition ${
                    resizeMethod === 'preset'
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Preset Resolutions
                </button>
                <button
                  onClick={() => setResizeMethod('custom')}
                  className={`px-4 py-2 text-sm font-medium transition ${
                    resizeMethod === 'custom'
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Custom Size
                </button>
                <button
                  onClick={() => setResizeMethod('percentage')}
                  className={`px-4 py-2 text-sm font-medium transition ${
                    resizeMethod === 'percentage'
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Scale by Percentage
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Input/Output */}
          <Card>
            <CardContent className='pt-6 space-y-4'>
              <div className='grid md:grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Input Video</label>
                  <Input value={inputFile} onChange={(e) => setInputFile(e.target.value)} placeholder='input.mp4' />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Output Video</label>
                  <Input value={outputFile} onChange={(e) => setOutputFile(e.target.value)} placeholder='output.mp4' />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preset Resolutions */}
          {resizeMethod === 'preset' && (
            <Card>
              <CardContent className='pt-6 space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Common Presets</label>
                  <div className='grid md:grid-cols-2 lg:grid-cols-4 gap-2'>
                    <Button onClick={() => applyPreset('4K')} variant='outline' size='sm'>
                      4K (3840x2160)
                    </Button>
                    <Button onClick={() => applyPreset('1080p')} variant='outline' size='sm'>
                      1080p (1920x1080)
                    </Button>
                    <Button onClick={() => applyPreset('720p')} variant='outline' size='sm'>
                      720p (1280x720)
                    </Button>
                    <Button onClick={() => applyPreset('480p')} variant='outline' size='sm'>
                      480p (854x480)
                    </Button>
                    <Button onClick={() => applyPreset('instagram')} variant='outline' size='sm'>
                      Instagram (1080x1080)
                    </Button>
                    <Button onClick={() => applyPreset('instagram-story')} variant='outline' size='sm'>
                      Instagram Story (1080x1920)
                    </Button>
                    <Button onClick={() => applyPreset('youtube-thumbnail')} variant='outline' size='sm'>
                      YouTube Thumbnail (1280x720)
                    </Button>
                  </div>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Selected Preset</label>
                  <select
                    value={preset}
                    onChange={(e) => {
                      setPreset(e.target.value);
                      generateCommand();
                    }}
                    className='w-full h-10 px-3 rounded-md border border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
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
              </CardContent>
            </Card>
          )}

          {/* Custom Size */}
          {resizeMethod === 'custom' && (
            <Card>
              <CardContent className='pt-6 space-y-4'>
                <div className='grid md:grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-300 mb-2'>Width (pixels)</label>
                    <Input
                      type='number'
                      value={customWidth}
                      onChange={(e) => setCustomWidth(e.target.value)}
                      placeholder='1920'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-300 mb-2'>Height (pixels)</label>
                    <Input
                      type='number'
                      value={customHeight}
                      onChange={(e) => setCustomHeight(e.target.value)}
                      placeholder='1080'
                      disabled={maintainAspectRatio}
                    />
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  <input
                    type='checkbox'
                    checked={maintainAspectRatio}
                    onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                    className='w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500'
                  />
                  <label className='text-sm text-gray-300'>Maintain aspect ratio</label>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Percentage */}
          {resizeMethod === 'percentage' && (
            <Card>
              <CardContent className='pt-6 space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Scale Percentage</label>
                  <div className='flex gap-2'>
                    <Input
                      type='number'
                      value={percentage}
                      onChange={(e) => setPercentage(e.target.value)}
                      placeholder='100'
                      className='flex-1'
                    />
                    <div className='flex gap-1'>
                      {[25, 50, 75, 100, 150, 200].map((p) => (
                        <Button key={p} onClick={() => setPercentage(p.toString())} variant='outline' size='sm'>
                          {p}%
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Options */}
          <Card>
            <CardContent className='pt-6 space-y-4'>
              <div className='grid md:grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Scaling Algorithm</label>
                  <select
                    value={scaleAlgorithm}
                    onChange={(e) => setScaleAlgorithm(e.target.value as ScaleAlgorithm)}
                    className='w-full h-10 px-3 rounded-md border border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                  >
                    <option value='fast'>Fast (fast bilinear)</option>
                    <option value='bilinear'>Balanced (bilinear)</option>
                    <option value='lanczos'>High Quality (lanczos)</option>
                  </select>
                </div>
                {resizeMethod === 'preset' && (
                  <div>
                    <label className='block text-sm font-medium text-gray-300 mb-2'>Padding Mode</label>
                    <select
                      value={paddingMode}
                      onChange={(e) => setPaddingMode(e.target.value as PaddingMode)}
                      className='w-full h-10 px-3 rounded-md border border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                    >
                      <option value='pad'>Pad (add black bars)</option>
                      <option value='crop'>Crop</option>
                      <option value='stretch'>Stretch</option>
                    </select>
                  </div>
                )}
              </div>
              <div className='flex items-center gap-2'>
                <input
                  type='checkbox'
                  checked={keepCodec}
                  onChange={(e) => setKeepCodec(e.target.checked)}
                  className='w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500'
                />
                <label className='text-sm text-gray-300'>Keep original codec (copy, no re-encode)</label>
              </div>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Button onClick={generateCommand} className='w-full' size='lg'>
            <Maximize2 className='w-4 h-4 mr-2' />
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
                  <Maximize2 className='w-12 h-12 mx-auto mb-4 opacity-50' />
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
