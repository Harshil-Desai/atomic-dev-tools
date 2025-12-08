'use client';

import { useState } from 'react';
import { Button, Card, CardContent, Input, Textarea } from '@/ui';
import { FileText, Copy, Check } from 'lucide-react';

type OperationType = 'subtitles' | 'text-watermark' | 'image-watermark';

export default function FfmpegSubtitleWatermarkPage() {
  const [operation, setOperation] = useState<OperationType>('subtitles');
  const [inputFile, setInputFile] = useState('input.mp4');
  const [outputFile, setOutputFile] = useState('output.mp4');

  // Subtitle settings
  const [subtitleFile, setSubtitleFile] = useState('subtitle.srt');
  const [subtitleFontSize, setSubtitleFontSize] = useState(24);
  const [subtitleColor, setSubtitleColor] = useState('#FFFFFF');
  const [subtitlePosition, setSubtitlePosition] = useState('bottom');

  // Text watermark settings
  const [watermarkText, setWatermarkText] = useState('Copyright 2024');
  const [textPosition, setTextPosition] = useState('top-right');
  const [textFontSize, setTextFontSize] = useState(24);
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [textOpacity, setTextOpacity] = useState(0.7);
  const [customTextPosition, setCustomTextPosition] = useState('10:10');

  // Image watermark settings
  const [imageFile, setImageFile] = useState('watermark.png');
  const [imagePosition, setImagePosition] = useState('bottom-right');
  const [imageScale, setImageScale] = useState('100');
  const [imageOpacity, setImageOpacity] = useState(0.7);
  const [customImagePosition, setCustomImagePosition] = useState('10:10');

  const [command, setCommand] = useState('');
  const [copied, setCopied] = useState(false);

  const hexToDrawtextColor = (hex: string): string => {
    // Convert #RRGGBB to 0xRRGGBBAA format for drawtext
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `0x${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}FF`;
  };

  const getTextPosition = (): string => {
    switch (textPosition) {
      case 'top-left':
        return 'x=10:y=10';
      case 'top-right':
        return 'x=w-tw-10:y=10';
      case 'bottom-left':
        return 'x=10:y=h-th-10';
      case 'bottom-right':
        return 'x=w-tw-10:y=h-th-10';
      case 'center':
        return 'x=(w-tw)/2:y=(h-th)/2';
      case 'custom':
        const [x, y] = customTextPosition.split(':');
        return `x=${x}:y=${y}`;
      default:
        return 'x=10:y=10';
    }
  };

  const getImagePosition = (): string => {
    switch (imagePosition) {
      case 'top-left':
        return 'overlay=10:10';
      case 'top-right':
        return 'overlay=W-w-10:10';
      case 'bottom-left':
        return 'overlay=10:H-h-10';
      case 'bottom-right':
        return 'overlay=W-w-10:H-h-10';
      case 'center':
        return 'overlay=(W-w)/2:(H-h)/2';
      case 'custom':
        const [x, y] = customImagePosition.split(':');
        return `overlay=${x}:${y}`;
      default:
        return 'overlay=W-w-10:H-h-10';
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
      
      if (opacityValue < 1.0) {
        cmd += ` -i ${imageFile}`;
        cmd += ` -filter_complex "[1:v]scale=iw*${scalePercent}/100:ih*${scalePercent}/100,format=rgba,colorchannelmixer=aa=${opacityValue}[wm];[0:v][wm]${pos}"`;
        cmd += ` ${outputFile}`;
      } else {
        cmd += ` -i ${imageFile}`;
        cmd += ` -filter_complex "[1:v]scale=iw*${scalePercent}/100:ih*${scalePercent}/100[wm];[0:v][wm]${pos}"`;
        cmd += ` ${outputFile}`;
      }
    }

    setCommand(cmd);
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
        <h1 className='text-2xl font-bold text-white mb-2'>FFmpeg Subtitle/Watermark Burner</h1>
        <p className='text-gray-400'>Generate FFmpeg commands to burn subtitles or watermarks into videos</p>
      </div>
      {/* Content */}
      <div className='flex-1 overflow-auto p-6'>
        <div className='max-w-6xl mx-auto space-y-6'>
          {/* Operation Type */}
          <Card>
            <CardContent className='pt-6'>
              <div className='flex gap-2 border-b border-gray-800'>
                <button
                  onClick={() => setOperation('subtitles')}
                  className={`px-4 py-2 text-sm font-medium transition ${
                    operation === 'subtitles'
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Burn Subtitles
                </button>
                <button
                  onClick={() => setOperation('text-watermark')}
                  className={`px-4 py-2 text-sm font-medium transition ${
                    operation === 'text-watermark'
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Text Watermark
                </button>
                <button
                  onClick={() => setOperation('image-watermark')}
                  className={`px-4 py-2 text-sm font-medium transition ${
                    operation === 'image-watermark'
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Image Watermark
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

          {/* Subtitles Panel */}
          {operation === 'subtitles' && (
            <Card>
              <CardContent className='pt-6 space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Subtitle File (.srt, .ass, .vtt)</label>
                  <Input value={subtitleFile} onChange={(e) => setSubtitleFile(e.target.value)} placeholder='subtitle.srt' />
                </div>
                <div className='grid md:grid-cols-3 gap-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-300 mb-2'>Font Size</label>
                    <Input
                      type='number'
                      value={subtitleFontSize}
                      onChange={(e) => setSubtitleFontSize(parseInt(e.target.value) || 24)}
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-300 mb-2'>Color</label>
                    <Input
                      type='color'
                      value={subtitleColor}
                      onChange={(e) => setSubtitleColor(e.target.value)}
                      className='h-10'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-300 mb-2'>Position</label>
                    <select
                      value={subtitlePosition}
                      onChange={(e) => setSubtitlePosition(e.target.value)}
                      className='w-full h-10 px-3 rounded-md border border-gray-700 bg-gray-800 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                    >
                      <option value='bottom'>Bottom</option>
                      <option value='top'>Top</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Text Watermark Panel */}
          {operation === 'text-watermark' && (
            <Card>
              <CardContent className='pt-6 space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Watermark Text</label>
                  <Input value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} placeholder='Copyright 2024' />
                </div>
                <div className='grid md:grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-300 mb-2'>Position</label>
                    <select
                      value={textPosition}
                      onChange={(e) => setTextPosition(e.target.value)}
                      className='w-full h-10 px-3 rounded-md border border-gray-700 bg-gray-800 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                    >
                      <option value='top-left'>Top Left</option>
                      <option value='top-right'>Top Right</option>
                      <option value='bottom-left'>Bottom Left</option>
                      <option value='bottom-right'>Bottom Right</option>
                      <option value='center'>Center</option>
                      <option value='custom'>Custom</option>
                    </select>
                    {textPosition === 'custom' && (
                      <Input
                        value={customTextPosition}
                        onChange={(e) => setCustomTextPosition(e.target.value)}
                        placeholder='10:10'
                        className='mt-2'
                      />
                    )}
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-300 mb-2'>Font Size</label>
                    <Input
                      type='number'
                      value={textFontSize}
                      onChange={(e) => setTextFontSize(parseInt(e.target.value) || 24)}
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-300 mb-2'>Color</label>
                    <Input
                      type='color'
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className='h-10'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-300 mb-2'>Opacity (0-1)</label>
                    <Input
                      type='number'
                      min='0'
                      max='1'
                      step='0.1'
                      value={textOpacity}
                      onChange={(e) => setTextOpacity(parseFloat(e.target.value) || 0.7)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Image Watermark Panel */}
          {operation === 'image-watermark' && (
            <Card>
              <CardContent className='pt-6 space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Image File</label>
                  <Input value={imageFile} onChange={(e) => setImageFile(e.target.value)} placeholder='watermark.png' />
                </div>
                <div className='grid md:grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-300 mb-2'>Position</label>
                    <select
                      value={imagePosition}
                      onChange={(e) => setImagePosition(e.target.value)}
                      className='w-full h-10 px-3 rounded-md border border-gray-700 bg-gray-800 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                    >
                      <option value='top-left'>Top Left</option>
                      <option value='top-right'>Top Right</option>
                      <option value='bottom-left'>Bottom Left</option>
                      <option value='bottom-right'>Bottom Right</option>
                      <option value='center'>Center</option>
                      <option value='custom'>Custom</option>
                    </select>
                    {imagePosition === 'custom' && (
                      <Input
                        value={customImagePosition}
                        onChange={(e) => setCustomImagePosition(e.target.value)}
                        placeholder='10:10'
                        className='mt-2'
                      />
                    )}
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-300 mb-2'>Scale (%)</label>
                    <Input
                      type='number'
                      value={imageScale}
                      onChange={(e) => setImageScale(e.target.value)}
                      placeholder='100'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-300 mb-2'>Opacity (0-1)</label>
                    <Input
                      type='number'
                      min='0'
                      max='1'
                      step='0.1'
                      value={imageOpacity}
                      onChange={(e) => setImageOpacity(parseFloat(e.target.value) || 0.7)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Generate Button */}
          <Button onClick={generateCommand} className='w-full' size='lg'>
            <FileText className='w-4 h-4 mr-2' />
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
                  <FileText className='w-12 h-12 mx-auto mb-4 opacity-50' />
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

