'use client';

import { useState } from 'react';
import { BpToolStage, BpPanel, BpCopyBtn } from '@/components/blueprint';
import { FileText } from 'lucide-react';

type OperationType = 'subtitles' | 'text-watermark' | 'image-watermark';

const SELECT_CLS = 'w-full h-9 px-3 rounded border border-[hsla(0,0%,20%,1)] bg-[#121212] text-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500';

export default function FfmpegSubtitleWatermarkPage() {
  const [operation, setOperation] = useState<OperationType>('subtitles');
  const [inputFile, setInputFile] = useState('input.mp4');
  const [outputFile, setOutputFile] = useState('output.mp4');
  const [subtitleFile, setSubtitleFile] = useState('subtitle.srt');
  const [subtitleFontSize, setSubtitleFontSize] = useState(24);
  const [subtitleColor, setSubtitleColor] = useState('#FFFFFF');
  const [subtitlePosition, setSubtitlePosition] = useState('bottom');
  const [watermarkText, setWatermarkText] = useState('Copyright 2024');
  const [textPosition, setTextPosition] = useState('top-right');
  const [textFontSize, setTextFontSize] = useState(24);
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [textOpacity, setTextOpacity] = useState(0.7);
  const [customTextPosition, setCustomTextPosition] = useState('10:10');
  const [imageFile, setImageFile] = useState('watermark.png');
  const [imagePosition, setImagePosition] = useState('bottom-right');
  const [imageScale, setImageScale] = useState('100');
  const [imageOpacity, setImageOpacity] = useState(0.7);
  const [customImagePosition, setCustomImagePosition] = useState('10:10');
  const [command, setCommand] = useState('');

  const hexToDrawtextColor = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `0x${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}FF`;
  };

  const getTextPosition = (): string => {
    switch (textPosition) {
      case 'top-left': return 'x=10:y=10';
      case 'top-right': return 'x=w-tw-10:y=10';
      case 'bottom-left': return 'x=10:y=h-th-10';
      case 'bottom-right': return 'x=w-tw-10:y=h-th-10';
      case 'center': return 'x=(w-tw)/2:y=(h-th)/2';
      case 'custom': { const [x, y] = customTextPosition.split(':'); return `x=${x}:y=${y}`; }
      default: return 'x=10:y=10';
    }
  };

  const getImagePosition = (): string => {
    switch (imagePosition) {
      case 'top-left': return 'overlay=10:10';
      case 'top-right': return 'overlay=W-w-10:10';
      case 'bottom-left': return 'overlay=10:H-h-10';
      case 'bottom-right': return 'overlay=W-w-10:H-h-10';
      case 'center': return 'overlay=(W-w)/2:(H-h)/2';
      case 'custom': { const [x, y] = customImagePosition.split(':'); return `overlay=${x}:${y}`; }
      default: return 'overlay=W-w-10:H-h-10';
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
      cmd += ` -i ${imageFile}`;
      if (opacityValue < 1.0) cmd += ` -filter_complex "[1:v]scale=iw*${scalePercent}/100:ih*${scalePercent}/100,format=rgba,colorchannelmixer=aa=${opacityValue}[wm];[0:v][wm]${pos}"`;
      else cmd += ` -filter_complex "[1:v]scale=iw*${scalePercent}/100:ih*${scalePercent}/100[wm];[0:v][wm]${pos}"`;
      cmd += ` ${outputFile}`;
    }
    setCommand(cmd);
  };

  const TAB_CLS = (active: boolean) => `px-4 py-2 text-sm font-medium transition ${active ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`;

  return (
    <BpToolStage cat='ffmpeg'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>FFmpeg Subtitle/Watermark Burner</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Generate FFmpeg commands to burn subtitles or watermarks into videos</p>
      </div>
      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-3xl mx-auto space-y-4'>

          <BpPanel title='Operation'>
            <div className='flex gap-0 border-b border-[hsla(0,0%,20%,1)]'>
              <button type='button' className={TAB_CLS(operation === 'subtitles')} onClick={() => setOperation('subtitles')}>Burn Subtitles</button>
              <button type='button' className={TAB_CLS(operation === 'text-watermark')} onClick={() => setOperation('text-watermark')}>Text Watermark</button>
              <button type='button' className={TAB_CLS(operation === 'image-watermark')} onClick={() => setOperation('image-watermark')}>Image Watermark</button>
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

          {operation === 'subtitles' && (
            <BpPanel title='Subtitle Settings'>
              <div className='space-y-3'>
                <div>
                  <label className='block text-xs text-gray-500 mb-1'>Subtitle File (.srt, .ass, .vtt)</label>
                  <input value={subtitleFile} onChange={(e) => setSubtitleFile(e.target.value)} placeholder='subtitle.srt' className='bp-input w-full font-mono' />
                </div>
                <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                  <div>
                    <label className='block text-xs text-gray-500 mb-1'>Font Size</label>
                    <input type='number' value={subtitleFontSize} onChange={(e) => setSubtitleFontSize(parseInt(e.target.value) || 24)} className='bp-input w-full' />
                  </div>
                  <div>
                    <label className='block text-xs text-gray-500 mb-1'>Color</label>
                    <input type='color' value={subtitleColor} onChange={(e) => setSubtitleColor(e.target.value)} className='bp-input w-full h-9 p-1' />
                  </div>
                  <div>
                    <label className='block text-xs text-gray-500 mb-1'>Position</label>
                    <select value={subtitlePosition} onChange={(e) => setSubtitlePosition(e.target.value)} className={SELECT_CLS}>
                      <option value='bottom'>Bottom</option><option value='top'>Top</option>
                    </select>
                  </div>
                </div>
              </div>
            </BpPanel>
          )}

          {operation === 'text-watermark' && (
            <BpPanel title='Text Watermark Settings'>
              <div className='space-y-3'>
                <div>
                  <label className='block text-xs text-gray-500 mb-1'>Watermark Text</label>
                  <input value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} placeholder='Copyright 2024' className='bp-input w-full' />
                </div>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                  <div>
                    <label className='block text-xs text-gray-500 mb-1'>Position</label>
                    <select value={textPosition} onChange={(e) => setTextPosition(e.target.value)} className={SELECT_CLS}>
                      <option value='top-left'>Top Left</option><option value='top-right'>Top Right</option><option value='bottom-left'>Bottom Left</option><option value='bottom-right'>Bottom Right</option><option value='center'>Center</option><option value='custom'>Custom</option>
                    </select>
                    {textPosition === 'custom' && <input value={customTextPosition} onChange={(e) => setCustomTextPosition(e.target.value)} placeholder='10:10' className='bp-input w-full mt-2' />}
                  </div>
                  <div>
                    <label className='block text-xs text-gray-500 mb-1'>Font Size</label>
                    <input type='number' value={textFontSize} onChange={(e) => setTextFontSize(parseInt(e.target.value) || 24)} className='bp-input w-full' />
                  </div>
                  <div>
                    <label className='block text-xs text-gray-500 mb-1'>Color</label>
                    <input type='color' value={textColor} onChange={(e) => setTextColor(e.target.value)} className='bp-input w-full h-9 p-1' />
                  </div>
                  <div>
                    <label className='block text-xs text-gray-500 mb-1'>Opacity (0–1)</label>
                    <input type='number' min='0' max='1' step='0.1' value={textOpacity} onChange={(e) => setTextOpacity(parseFloat(e.target.value) || 0.7)} className='bp-input w-full' />
                  </div>
                </div>
              </div>
            </BpPanel>
          )}

          {operation === 'image-watermark' && (
            <BpPanel title='Image Watermark Settings'>
              <div className='space-y-3'>
                <div>
                  <label className='block text-xs text-gray-500 mb-1'>Image File</label>
                  <input value={imageFile} onChange={(e) => setImageFile(e.target.value)} placeholder='watermark.png' className='bp-input w-full font-mono' />
                </div>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                  <div>
                    <label className='block text-xs text-gray-500 mb-1'>Position</label>
                    <select value={imagePosition} onChange={(e) => setImagePosition(e.target.value)} className={SELECT_CLS}>
                      <option value='top-left'>Top Left</option><option value='top-right'>Top Right</option><option value='bottom-left'>Bottom Left</option><option value='bottom-right'>Bottom Right</option><option value='center'>Center</option><option value='custom'>Custom</option>
                    </select>
                    {imagePosition === 'custom' && <input value={customImagePosition} onChange={(e) => setCustomImagePosition(e.target.value)} placeholder='10:10' className='bp-input w-full mt-2' />}
                  </div>
                  <div>
                    <label className='block text-xs text-gray-500 mb-1'>Scale (%)</label>
                    <input type='number' value={imageScale} onChange={(e) => setImageScale(e.target.value)} placeholder='100' className='bp-input w-full' />
                  </div>
                  <div>
                    <label className='block text-xs text-gray-500 mb-1'>Opacity (0–1)</label>
                    <input type='number' min='0' max='1' step='0.1' value={imageOpacity} onChange={(e) => setImageOpacity(parseFloat(e.target.value) || 0.7)} className='bp-input w-full' />
                  </div>
                </div>
              </div>
            </BpPanel>
          )}

          <button type='button' className='bp-btn bp-btn-solid w-full' onClick={generateCommand}>
            <FileText className='w-4 h-4 mr-2 inline' />GENERATE COMMAND
          </button>

          {command && (
            <BpPanel title='Generated FFmpeg Command'>
              <div className='bp-panel-actions mb-3'><BpCopyBtn text={command} label='COPY' /></div>
              <code className='block bp-code-view px-4 py-3 font-mono text-sm text-gray-300 whitespace-pre-wrap break-all'>{command}</code>
            </BpPanel>
          )}

          {!command && (
            <div className='text-center text-gray-600 py-12'>
              <FileText className='w-10 h-10 mx-auto mb-3 opacity-40' />
              <p className='text-sm'>Configure settings and click Generate Command</p>
            </div>
          )}
        </div>
      </div>
    </BpToolStage>
  );
}
