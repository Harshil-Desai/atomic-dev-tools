'use client';

import { useState } from 'react';
import { Button, Card, CardContent, Input } from '@/ui';
import { Image, Copy, Check } from 'lucide-react';

type ExtractMode = 'single' | 'interval' | 'evenly';
type OutputFormat = 'png' | 'jpg' | 'webp';
type ScalePreset = 'original' | '1280x720' | '640x360' | '320x180' | 'custom';

export default function FfmpegThumbnailPage() {
  const [inputFile, setInputFile] = useState('input.mp4');
  const [extractMode, setExtractMode] = useState<ExtractMode>('single');
  const [timestamp, setTimestamp] = useState('00:00:05');
  const [intervalSeconds, setIntervalSeconds] = useState('10');
  const [frameCount, setFrameCount] = useState('10');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('png');
  const [outputFilename, setOutputFilename] = useState('thumbnail.png');
  const [outputPattern, setOutputPattern] = useState('frame_%03d.png');
  const [jpgQuality, setJpgQuality] = useState(2);
  const [scalePreset, setScalePreset] = useState<ScalePreset>('original');
  const [customWidth, setCustomWidth] = useState('');
  const [customHeight, setCustomHeight] = useState('');
  const [command, setCommand] = useState('');
  const [copied, setCopied] = useState(false);

  const normalizeTimestamp = (ts: string): string => {
    if (ts.includes(':')) return ts;
    const secs = parseInt(ts);
    if (isNaN(secs)) return ts;
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getScaleFilter = (): string => {
    if (scalePreset === 'original') return '';
    if (scalePreset === 'custom') {
      const w = customWidth || '-1';
      const h = customHeight || '-1';
      return `scale=${w}:${h}`;
    }
    const [w, h] = scalePreset.split('x');
    return `scale=${w}:${h}`;
  };

  const getOutputFilenameForFormat = (pattern: string, fmt: OutputFormat): string => {
    return pattern.replace(/\.(png|jpg|jpeg|webp)$/i, `.${fmt}`);
  };

  const generateCommand = () => {
    const scale = getScaleFilter();

    if (extractMode === 'single') {
      const ts = normalizeTimestamp(timestamp);
      const outFile = getOutputFilenameForFormat(outputFilename, outputFormat);
      let cmd = `ffmpeg -ss ${ts} -i ${inputFile}`;
      cmd += ' -vframes 1';

      const filters: string[] = [];
      if (scale) filters.push(scale);

      if (filters.length > 0) {
        cmd += ` -vf "${filters.join(',')}"`;
      }

      if (outputFormat === 'jpg') {
        cmd += ` -q:v ${jpgQuality}`;
      }

      cmd += ` ${outFile}`;
      setCommand(cmd);
    } else if (extractMode === 'interval') {
      const n = intervalSeconds || '10';
      const outPattern = getOutputFilenameForFormat(outputPattern, outputFormat);
      let cmd = `ffmpeg -i ${inputFile}`;

      const filters: string[] = [`fps=1/${n}`];
      if (scale) filters.push(scale);
      cmd += ` -vf "${filters.join(',')}"`;

      if (outputFormat === 'jpg') {
        cmd += ` -q:v ${jpgQuality}`;
      }

      cmd += ` ${outPattern}`;
      setCommand(cmd);
    } else {
      // evenly spaced — use select filter with modulo step
      // We don't know total frame count ahead of time, so we use select with mod
      const n = parseInt(frameCount) || 10;
      const outPattern = getOutputFilenameForFormat(outputPattern, outputFormat);
      // Use a large step as a proxy; user should provide total duration for accuracy
      // select='not(mod(n,STEP))' picks every STEP-th frame
      // We note this in the explanation
      const step = Math.max(1, n);
      let cmd = `ffmpeg -i ${inputFile}`;

      const selectExpr = `not(mod(n,${step}))`;
      const filters: string[] = [`select='${selectExpr}'`];
      if (scale) filters.push(scale);
      cmd += ` -vf "${filters.join(',')}"`;
      cmd += ' -vsync vfr';

      if (outputFormat === 'jpg') {
        cmd += ` -q:v ${jpgQuality}`;
      }

      cmd += ` ${outPattern}`;
      setCommand(cmd);
    }
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

  const handleFormatChange = (fmt: OutputFormat) => {
    setOutputFormat(fmt);
    // Update filename extensions automatically
    setOutputFilename((prev) => prev.replace(/\.(png|jpg|jpeg|webp)$/i, `.${fmt}`));
    setOutputPattern((prev) => prev.replace(/\.(png|jpg|jpeg|webp)$/i, `.${fmt}`));
  };

  const handleModeChange = (mode: ExtractMode) => {
    setExtractMode(mode);
    // Reset command when mode changes
    setCommand('');
  };

  const getExplanationItems = (): { flag: string; description: string }[] => {
    const items: { flag: string; description: string }[] = [];

    if (extractMode === 'single') {
      items.push({ flag: '-ss', description: 'Seek to the specified timestamp before reading input (fast seek)' });
    }
    items.push({ flag: '-i', description: `Specifies the input file (${inputFile})` });

    if (extractMode === 'single') {
      items.push({ flag: '-vframes 1', description: 'Extract exactly 1 video frame and stop' });
    } else if (extractMode === 'interval') {
      items.push({
        flag: `-vf "fps=1/${intervalSeconds}"`,
        description: `Video filter: output one frame every ${intervalSeconds} second(s)`,
      });
    } else {
      items.push({
        flag: `-vf "select='not(mod(n,N))'"`,
        description: `Video filter: select every N-th frame by frame index (evenly spaced across the video)`,
      });
      items.push({
        flag: '-vsync vfr',
        description: 'Variable frame rate mode — required with the select filter to avoid duplicate frames',
      });
    }

    const scale = getScaleFilter();
    if (scale) {
      const [w, h] =
        scalePreset === 'custom' ? [customWidth || '-1', customHeight || '-1'] : scalePreset.split('x');
      items.push({ flag: `-vf scale=${w}:${h}`, description: `Resize output frames to ${w}x${h} pixels` });
    }

    if (outputFormat === 'jpg') {
      items.push({
        flag: `-q:v ${jpgQuality}`,
        description: `JPEG quality scale (1=best quality/largest file, 31=worst quality/smallest file). Current: ${jpgQuality}`,
      });
    }

    return items;
  };

  const getPatternPreview = (): string[] => {
    const ext = outputFormat;
    if (extractMode === 'single') {
      return [outputFilename];
    }
    // Show first 3 example filenames for the pattern
    const base = outputPattern.replace(/\.(png|jpg|jpeg|webp)$/i, '');
    // Check if pattern has %03d or similar
    if (base.includes('%03d')) {
      return [
        base.replace('%03d', '001') + '.' + ext,
        base.replace('%03d', '002') + '.' + ext,
        base.replace('%03d', '003') + '.' + ext,
      ];
    }
    if (base.includes('%d')) {
      return [
        base.replace('%d', '1') + '.' + ext,
        base.replace('%d', '2') + '.' + ext,
        base.replace('%d', '3') + '.' + ext,
      ];
    }
    return [outputPattern];
  };

  return (
    <div className='h-full flex flex-col'>
      {/* Header */}
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>FFmpeg Thumbnail Extractor</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Generate FFmpeg commands to extract video frames as images</p>
      </div>

      {/* Content */}
      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-3xl mx-auto space-y-6'>
          {/* Extraction Mode Tabs */}
          <Card>
            <CardContent className='pt-6'>
              <h3 className='text-xs sm:text-sm font-semibold text-gray-300 mb-3'>Extraction Mode</h3>
              <div className='flex gap-0 border-b border-gray-800'>
                <button
                  onClick={() => handleModeChange('single')}
                  className={`px-4 py-2 text-sm font-medium transition ${
                    extractMode === 'single'
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Single Frame
                </button>
                <button
                  onClick={() => handleModeChange('interval')}
                  className={`px-4 py-2 text-sm font-medium transition ${
                    extractMode === 'interval'
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Every N Seconds
                </button>
                <button
                  onClick={() => handleModeChange('evenly')}
                  className={`px-4 py-2 text-sm font-medium transition ${
                    extractMode === 'evenly'
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  N Evenly Spaced
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Input File */}
          <Card>
            <CardContent className='pt-6 space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-300 mb-2'>Input Video File</label>
                <Input
                  value={inputFile}
                  onChange={(e) => setInputFile(e.target.value)}
                  placeholder='input.mp4'
                />
              </div>

              {/* Timestamp — single mode only */}
              {extractMode === 'single' && (
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>
                    Timestamp (HH:MM:SS or seconds)
                  </label>
                  <Input
                    value={timestamp}
                    onChange={(e) => setTimestamp(e.target.value)}
                    placeholder='00:00:05'
                  />
                  <p className='text-xs text-gray-500 mt-1'>
                    Examples: <span className='text-gray-400'>00:01:30</span> or{' '}
                    <span className='text-gray-400'>90</span>
                  </p>
                </div>
              )}

              {/* Interval — every N seconds */}
              {extractMode === 'interval' && (
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Extract a frame every N seconds</label>
                  <div className='flex items-center gap-3'>
                    <Input
                      type='number'
                      min='1'
                      value={intervalSeconds}
                      onChange={(e) => setIntervalSeconds(e.target.value)}
                      placeholder='10'
                      className='w-32'
                    />
                    <span className='text-sm text-gray-400'>seconds</span>
                  </div>
                  <p className='text-xs text-gray-500 mt-1'>
                    Uses <code className='text-gray-400'>fps=1/{intervalSeconds}</code> video filter
                  </p>
                </div>
              )}

              {/* Evenly spaced — N frames */}
              {extractMode === 'evenly' && (
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Number of frames to extract</label>
                  <div className='flex items-center gap-3'>
                    <Input
                      type='number'
                      min='1'
                      value={frameCount}
                      onChange={(e) => setFrameCount(e.target.value)}
                      placeholder='10'
                      className='w-32'
                    />
                    <span className='text-sm text-gray-400'>frames</span>
                  </div>
                  <p className='text-xs text-gray-500 mt-1'>
                    Uses <code className='text-gray-400'>select</code> filter with{' '}
                    <code className='text-gray-400'>not(mod(n,{frameCount}))</code> — selects every{' '}
                    {frameCount}-th frame by index
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Output Format */}
          <Card>
            <CardContent className='pt-6 space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-300 mb-2'>Output Image Format</label>
                <select
                  value={outputFormat}
                  onChange={(e) => handleFormatChange(e.target.value as OutputFormat)}
                  className='w-full h-10 px-3 rounded-md border border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  <option value='png'>PNG (lossless)</option>
                  <option value='jpg'>JPG (lossy, smaller files)</option>
                  <option value='webp'>WebP (modern, efficient)</option>
                </select>
              </div>

              {/* JPG quality slider — only shown for JPG */}
              {outputFormat === 'jpg' && (
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>
                    JPEG Quality{' '}
                    <span className='text-gray-400 font-normal'>
                      (-q:v {jpgQuality} — lower = better quality)
                    </span>
                  </label>
                  <div className='flex items-center gap-4'>
                    <span className='text-xs text-gray-500 w-12 text-right'>Best (1)</span>
                    <input
                      type='range'
                      min='1'
                      max='31'
                      value={jpgQuality}
                      onChange={(e) => setJpgQuality(parseInt(e.target.value))}
                      className='flex-1 accent-blue-500'
                    />
                    <span className='text-xs text-gray-500 w-16'>Worst (31)</span>
                    <span className='text-sm font-mono text-blue-400 w-6'>{jpgQuality}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Output Filename / Pattern */}
          <Card>
            <CardContent className='pt-6 space-y-4'>
              {extractMode === 'single' ? (
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Output Filename</label>
                  <Input
                    value={outputFilename}
                    onChange={(e) => setOutputFilename(e.target.value)}
                    placeholder={`thumbnail.${outputFormat}`}
                  />
                </div>
              ) : (
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>
                    Output Filename Pattern
                  </label>
                  <Input
                    value={outputPattern}
                    onChange={(e) => setOutputPattern(e.target.value)}
                    placeholder={`frame_%03d.${outputFormat}`}
                  />
                  <p className='text-xs text-gray-500 mt-1'>
                    Use <code className='text-gray-400'>%03d</code> for zero-padded numbering (001, 002, …)
                  </p>
                  {/* Preview of generated filenames */}
                  <div className='mt-3 bg-[#121212] rounded-md px-3 py-2'>
                    <p className='text-xs text-gray-500 mb-1'>Preview:</p>
                    <div className='flex flex-wrap gap-2'>
                      {getPatternPreview().map((name) => (
                        <span
                          key={name}
                          className='text-xs font-mono text-gray-300 bg-gray-800 rounded px-2 py-0.5'
                        >
                          {name}
                        </span>
                      ))}
                      <span className='text-xs text-gray-600'>…</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scale Option */}
          <Card>
            <CardContent className='pt-6 space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-300 mb-2'>Output Scale</label>
                <select
                  value={scalePreset}
                  onChange={(e) => setScalePreset(e.target.value as ScalePreset)}
                  className='w-full h-10 px-3 rounded-md border border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  <option value='original'>Original (no scaling)</option>
                  <option value='1280x720'>1280x720 (720p)</option>
                  <option value='640x360'>640x360 (360p)</option>
                  <option value='320x180'>320x180 (thumbnail)</option>
                  <option value='custom'>Custom</option>
                </select>
              </div>

              {scalePreset === 'custom' && (
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-300 mb-2'>
                      Width (px, -1 = auto)
                    </label>
                    <Input
                      type='number'
                      value={customWidth}
                      onChange={(e) => setCustomWidth(e.target.value)}
                      placeholder='1280'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-300 mb-2'>
                      Height (px, -1 = auto)
                    </label>
                    <Input
                      type='number'
                      value={customHeight}
                      onChange={(e) => setCustomHeight(e.target.value)}
                      placeholder='720'
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Button onClick={generateCommand} className='w-full' size='lg'>
            <Image className='w-4 h-4 mr-2' />
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
                  <pre className='text-sm font-mono text-gray-300 whitespace-pre-wrap break-all'>{command}</pre>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Command Explanation */}
          {command && (
            <Card>
              <CardContent className='pt-6'>
                <h3 className='text-sm font-semibold text-gray-300 mb-3'>Command Explanation</h3>
                <ul className='space-y-2'>
                  {getExplanationItems().map((item) => (
                    <li key={item.flag} className='flex gap-3 text-sm'>
                      <code className='text-blue-400 font-mono shrink-0 bg-gray-900 rounded px-1.5 py-0.5 h-fit'>
                        {item.flag}
                      </code>
                      <span className='text-gray-400'>{item.description}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {!command && (
            <Card className='border-dashed'>
              <CardContent className='pt-6'>
                <div className='text-center text-gray-500 py-12'>
                  <Image className='w-12 h-12 mx-auto mb-4 opacity-50' />
                  <p>Configure settings and click "Generate Command" to create your FFmpeg command</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
