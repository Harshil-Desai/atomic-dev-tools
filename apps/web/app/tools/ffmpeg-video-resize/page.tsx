'use client';

import { useState } from 'react';
import { BpToolStage, BpPanel, BpCopyBtn } from '@/components/blueprint';
import { Maximize2 } from 'lucide-react';

type ResizeMethod = 'preset' | 'custom' | 'percentage';
type ScaleAlgorithm = 'fast' | 'bilinear' | 'lanczos';
type PaddingMode = 'pad' | 'crop' | 'stretch';

const SELECT_CLS = 'w-full h-9 px-3 rounded border border-[hsla(0,0%,20%,1)] bg-[#121212] text-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500';

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

  const getPresetDimensions = (presetName: string): { width: string; height: string } => {
    switch (presetName) {
      case '4K': return { width: '3840', height: '2160' };
      case '1080p': return { width: '1920', height: '1080' };
      case '720p': return { width: '1280', height: '720' };
      case '480p': return { width: '854', height: '480' };
      case 'instagram': return { width: '1080', height: '1080' };
      case 'instagram-story': return { width: '1080', height: '1920' };
      case 'youtube-thumbnail': return { width: '1280', height: '720' };
      default: return { width: '1920', height: '1080' };
    }
  };

  const getScaleFilter = (): string => {
    const algorithmMap = { fast: 'fast_bilinear', bilinear: 'bilinear', lanczos: 'lanczos' };
    if (resizeMethod === 'preset') {
      const { width, height } = getPresetDimensions(preset);
      if (paddingMode === 'stretch') return `scale=${width}:${height}:flags=${algorithmMap[scaleAlgorithm]}`;
      if (paddingMode === 'crop') return `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`;
      return `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`;
    } else if (resizeMethod === 'custom') {
      if (maintainAspectRatio) return `scale=${customWidth}:-1:flags=${algorithmMap[scaleAlgorithm]}`;
      return `scale=${customWidth}:${customHeight}:flags=${algorithmMap[scaleAlgorithm]}`;
    } else {
      const percent = parseFloat(percentage) / 100;
      return `scale=iw*${percent}:ih*${percent}:flags=${algorithmMap[scaleAlgorithm]}`;
    }
  };

  const generateCommand = () => {
    let cmd = 'ffmpeg -i ' + inputFile;
    cmd += ` -vf "${getScaleFilter()}"`;
    if (keepCodec) cmd += ' -c:v copy -c:a copy';
    cmd += ` ${outputFile}`;
    setCommand(cmd);
  };

  const applyPreset = (presetName: string) => {
    setResizeMethod('preset');
    setPreset(presetName);
    setTimeout(generateCommand, 100);
  };

  const TAB_CLS = (active: boolean) => `px-4 py-2 text-sm font-medium transition ${active ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`;

  return (
    <BpToolStage cat='ffmpeg'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>FFmpeg Video Resize & Scale</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Generate FFmpeg commands to resize and scale videos</p>
      </div>
      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-3xl mx-auto space-y-4'>

          <BpPanel title='Resize Method'>
            <div className='flex gap-0 border-b border-[hsla(0,0%,20%,1)]'>
              <button type='button' className={TAB_CLS(resizeMethod === 'preset')} onClick={() => setResizeMethod('preset')}>Preset Resolutions</button>
              <button type='button' className={TAB_CLS(resizeMethod === 'custom')} onClick={() => setResizeMethod('custom')}>Custom Size</button>
              <button type='button' className={TAB_CLS(resizeMethod === 'percentage')} onClick={() => setResizeMethod('percentage')}>Scale by Percentage</button>
            </div>
          </BpPanel>

          <BpPanel title='Input / Output'>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Input Video</label>
                <input value={inputFile} onChange={(e) => setInputFile(e.target.value)} placeholder='input.mp4' className='bp-input w-full font-mono' />
              </div>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Output Video</label>
                <input value={outputFile} onChange={(e) => setOutputFile(e.target.value)} placeholder='output.mp4' className='bp-input w-full font-mono' />
              </div>
            </div>
          </BpPanel>

          {resizeMethod === 'preset' && (
            <BpPanel title='Preset Resolutions'>
              <div className='flex flex-wrap gap-2 mb-3'>
                {[['4K', '4K (3840x2160)'], ['1080p', '1080p'], ['720p', '720p'], ['480p', '480p'], ['instagram', 'Instagram (1:1)'], ['instagram-story', 'IG Story (9:16)'], ['youtube-thumbnail', 'YT Thumbnail']].map(([key, label]) => (
                  <button key={key} type='button' className='bp-btn text-xs' onClick={() => applyPreset(key)}>{label}</button>
                ))}
              </div>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Selected Preset</label>
                <select value={preset} onChange={(e) => { setPreset(e.target.value); generateCommand(); }} className={SELECT_CLS}>
                  <option value='4K'>4K (3840x2160)</option><option value='1080p'>1080p (1920x1080)</option><option value='720p'>720p (1280x720)</option><option value='480p'>480p (854x480)</option><option value='instagram'>Instagram (1080x1080)</option><option value='instagram-story'>Instagram Story (1080x1920)</option><option value='youtube-thumbnail'>YouTube Thumbnail (1280x720)</option>
                </select>
              </div>
            </BpPanel>
          )}

          {resizeMethod === 'custom' && (
            <BpPanel title='Custom Size'>
              <div className='grid grid-cols-2 gap-3 mb-3'>
                <div>
                  <label className='block text-xs text-gray-500 mb-1'>Width (pixels)</label>
                  <input type='number' value={customWidth} onChange={(e) => setCustomWidth(e.target.value)} placeholder='1920' className='bp-input w-full' />
                </div>
                <div>
                  <label className='block text-xs text-gray-500 mb-1'>Height (pixels)</label>
                  <input type='number' value={customHeight} onChange={(e) => setCustomHeight(e.target.value)} placeholder='1080' className='bp-input w-full' disabled={maintainAspectRatio} />
                </div>
              </div>
              <label className='flex items-center gap-2 cursor-pointer'>
                <input type='checkbox' checked={maintainAspectRatio} onChange={(e) => setMaintainAspectRatio(e.target.checked)} className='w-4 h-4 rounded' />
                <span className='text-sm text-gray-300'>Maintain aspect ratio</span>
              </label>
            </BpPanel>
          )}

          {resizeMethod === 'percentage' && (
            <BpPanel title='Scale by Percentage'>
              <div className='flex gap-2 flex-wrap'>
                <input type='number' value={percentage} onChange={(e) => setPercentage(e.target.value)} placeholder='100' className='bp-input w-24 font-mono' />
                {[25, 50, 75, 100, 150, 200].map((p) => (
                  <button key={p} type='button' className='bp-btn text-xs' onClick={() => setPercentage(p.toString())}>{p}%</button>
                ))}
              </div>
            </BpPanel>
          )}

          <BpPanel title='Options'>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3'>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Scaling Algorithm</label>
                <select value={scaleAlgorithm} onChange={(e) => setScaleAlgorithm(e.target.value as ScaleAlgorithm)} className={SELECT_CLS}>
                  <option value='fast'>Fast (fast bilinear)</option><option value='bilinear'>Balanced (bilinear)</option><option value='lanczos'>High Quality (lanczos)</option>
                </select>
              </div>
              {resizeMethod === 'preset' && (
                <div>
                  <label className='block text-xs text-gray-500 mb-1'>Padding Mode</label>
                  <select value={paddingMode} onChange={(e) => setPaddingMode(e.target.value as PaddingMode)} className={SELECT_CLS}>
                    <option value='pad'>Pad (add black bars)</option><option value='crop'>Crop</option><option value='stretch'>Stretch</option>
                  </select>
                </div>
              )}
            </div>
            <label className='flex items-center gap-2 cursor-pointer'>
              <input type='checkbox' checked={keepCodec} onChange={(e) => setKeepCodec(e.target.checked)} className='w-4 h-4 rounded' />
              <span className='text-sm text-gray-300'>Keep original codec (copy, no re-encode)</span>
            </label>
          </BpPanel>

          <button type='button' className='bp-btn bp-btn-solid w-full' onClick={generateCommand}>
            <Maximize2 className='w-4 h-4 mr-2 inline' />GENERATE COMMAND
          </button>

          {command && (
            <BpPanel title='Generated FFmpeg Command'>
              <div className='bp-panel-actions mb-3'><BpCopyBtn text={command} label='COPY' /></div>
              <code className='block bp-code-view px-4 py-3 font-mono text-sm text-gray-300 whitespace-pre-wrap break-all'>{command}</code>
            </BpPanel>
          )}

          {!command && (
            <div className='text-center text-gray-600 py-12'>
              <Maximize2 className='w-10 h-10 mx-auto mb-3 opacity-40' />
              <p className='text-sm'>Configure settings and click Generate Command</p>
            </div>
          )}
        </div>
      </div>
    </BpToolStage>
  );
}
