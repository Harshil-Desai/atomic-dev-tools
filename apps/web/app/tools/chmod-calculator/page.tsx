'use client';

import { useState } from 'react';
import { BpToolStage, BpPanel, BpCopyBtn } from '@/components/blueprint';

// ─── types ────────────────────────────────────────────────────────────────────

interface PermSet { r: boolean; w: boolean; x: boolean; }
interface Permissions {
  owner: PermSet; group: PermSet; other: PermSet;
  setuid: boolean; setgid: boolean; sticky: boolean;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function permSetToOctal(p: PermSet): number { return (p.r ? 4 : 0) + (p.w ? 2 : 0) + (p.x ? 1 : 0); }

function permSetToSymbolic(p: PermSet, special: boolean, specialChar: string): string {
  const x = p.x ? (special ? specialChar : 'x') : (special ? specialChar.toUpperCase() : '-');
  return `${p.r ? 'r' : '-'}${p.w ? 'w' : '-'}${x}`;
}

function toOctal(perms: Permissions): string {
  const special = (perms.setuid ? 4 : 0) + (perms.setgid ? 2 : 0) + (perms.sticky ? 1 : 0);
  const owner = permSetToOctal(perms.owner);
  const group = permSetToOctal(perms.group);
  const other = permSetToOctal(perms.other);
  return special > 0 ? `${special}${owner}${group}${other}` : `${owner}${group}${other}`;
}

function toSymbolic(perms: Permissions): string {
  return (
    permSetToSymbolic(perms.owner, perms.setuid, 's') +
    permSetToSymbolic(perms.group, perms.setgid, 's') +
    permSetToSymbolic(perms.other, perms.sticky, 't')
  );
}

function octalToPerms(octalStr: string): Permissions | null {
  const cleaned = octalStr.trim();
  if (!/^[0-7]{3,4}$/.test(cleaned)) return null;
  const digits = cleaned.length === 4 ? cleaned : '0' + cleaned;
  const special = parseInt(digits[0], 8);
  const owner = parseInt(digits[1], 8);
  const group = parseInt(digits[2], 8);
  const other = parseInt(digits[3], 8);
  return {
    owner: { r: !!(owner & 4), w: !!(owner & 2), x: !!(owner & 1) },
    group: { r: !!(group & 4), w: !!(group & 2), x: !!(group & 1) },
    other: { r: !!(other & 4), w: !!(other & 2), x: !!(other & 1) },
    setuid: !!(special & 4), setgid: !!(special & 2), sticky: !!(special & 1),
  };
}

function describePermission(perms: Permissions): string {
  const octal = toOctal(perms);
  const descriptions: string[] = [];
  const ownerO = permSetToOctal(perms.owner);
  const groupO = permSetToOctal(perms.group);
  if (ownerO === 7) descriptions.push('owner has full access');
  else if (ownerO === 6) descriptions.push('owner can read & write');
  else if (ownerO === 5) descriptions.push('owner can read & execute');
  else if (ownerO === 4) descriptions.push('owner can only read');
  if (groupO === 7) descriptions.push('group has full access');
  else if (groupO === 6) descriptions.push('group can read & write');
  else if (groupO === 5) descriptions.push('group can read & execute');
  else if (groupO === 4) descriptions.push('group can only read');
  else if (groupO === 0) descriptions.push('group has no access');
  const otherO = permSetToOctal(perms.other);
  if (otherO === 0) descriptions.push('others have no access');
  else if (otherO === 4) descriptions.push('others can only read');
  else if (otherO === 5) descriptions.push('others can read & execute');
  if (perms.setuid) descriptions.push('setuid bit set');
  if (perms.setgid) descriptions.push('setgid bit set');
  if (perms.sticky) descriptions.push('sticky bit set');
  return descriptions.join(', ') || `chmod ${octal}`;
}

// ─── presets ─────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: '755 (rwxr-xr-x)', octal: '755', desc: 'Executable / directory' },
  { label: '644 (rw-r--r--)', octal: '644', desc: 'Regular file' },
  { label: '600 (rw-------)', octal: '600', desc: 'Private file' },
  { label: '777 (rwxrwxrwx)', octal: '777', desc: 'World-writable' },
  { label: '700 (rwx------)', octal: '700', desc: 'Private executable' },
  { label: '664 (rw-rw-r--)', octal: '664', desc: 'Group-writable' },
  { label: '1755 (rwxr-xr-t)', octal: '1755', desc: 'Sticky directory' },
  { label: '4755 (rwsr-xr-x)', octal: '4755', desc: 'Setuid executable' },
];

// ─── sub-components ───────────────────────────────────────────────────────────

function PermRow({ label, perm, onChange, special, specialLabel, specialValue, onSpecialChange }: {
  label: string; perm: PermSet; onChange: (p: PermSet) => void;
  special: boolean; specialLabel: string; specialValue: boolean; onSpecialChange: (v: boolean) => void;
}) {
  const octal = permSetToOctal(perm);
  const symbolic = permSetToSymbolic(perm, specialValue, specialLabel === 'SetUID' ? 's' : specialLabel === 'SetGID' ? 's' : 't');

  const BitBox = ({ bit, value, onToggle, color }: { bit: string; value: boolean; onToggle: () => void; color: string }) => (
    <button type='button' onClick={onToggle}
      className={`w-10 h-10 rounded-md flex items-center justify-center font-mono text-sm font-bold transition-colors border ${value ? `${color} border-opacity-60` : 'bg-[#1a1a1a] text-gray-600 border-[hsla(0,0%,15%,1)] hover:bg-[#252525]'}`}>
      {bit}
    </button>
  );

  return (
    <div className='flex items-center gap-3 flex-wrap'>
      <span className='text-sm font-medium text-gray-300 w-12 shrink-0'>{label}</span>
      <div className='flex gap-1'>
        <BitBox bit='r' value={perm.r} onToggle={() => onChange({ ...perm, r: !perm.r })} color='bg-green-500/20 text-green-300 border-green-500/40' />
        <BitBox bit='w' value={perm.w} onToggle={() => onChange({ ...perm, w: !perm.w })} color='bg-yellow-500/20 text-yellow-300 border-yellow-500/40' />
        <BitBox bit='x' value={perm.x} onToggle={() => onChange({ ...perm, x: !perm.x })} color='bg-blue-500/20 text-blue-300 border-blue-500/40' />
      </div>
      <div className='flex items-center gap-2 ml-2'>
        <code className='font-mono text-sm text-gray-300 w-8'>{octal}</code>
        <code className='font-mono text-sm text-gray-400 w-10'>{symbolic}</code>
      </div>
      <label className='flex items-center gap-1.5 ml-auto cursor-pointer'>
        <input type='checkbox' checked={specialValue} onChange={(e) => onSpecialChange(e.target.checked)} className='w-3.5 h-3.5 rounded' />
        <span className='text-xs text-gray-500'>{specialLabel}</span>
      </label>
    </div>
  );
}

// ─── component ────────────────────────────────────────────────────────────────

const DEFAULT_PERMS: Permissions = {
  owner: { r: true, w: true, x: true },
  group: { r: true, w: false, x: true },
  other: { r: true, w: false, x: true },
  setuid: false, setgid: false, sticky: false,
};

export default function ChmodCalculatorPage() {
  const [perms, setPerms] = useState<Permissions>(DEFAULT_PERMS);
  const [octalInput, setOctalInput] = useState('');
  const [filename, setFilename] = useState('<file>');

  const handleOctalInput = (val: string) => {
    setOctalInput(val);
    const parsed = octalToPerms(val);
    if (parsed) setPerms(parsed);
  };

  const handlePreset = (octal: string) => {
    const parsed = octalToPerms(octal);
    if (parsed) { setPerms(parsed); setOctalInput(octal); }
  };

  const octal = toOctal(perms);
  const symbolic = toSymbolic(perms);
  const chmodCmd = `chmod ${octal} ${filename}`;
  const chmodSymCmd = `chmod ${symbolic} ${filename}`;

  return (
    <BpToolStage cat='infra'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>Chmod / Permission Calculator</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Visual Unix permission builder — toggle bits to generate octal and symbolic representations</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-2xl mx-auto space-y-4'>

          <BpPanel title='Permission Builder'>
            <div className='space-y-5'>
              <div className='flex items-center gap-3 mb-1'>
                <span className='text-xs text-gray-500 w-12'></span>
                <div className='flex gap-1'>
                  {['Read', 'Write', 'Exec'].map((l) => (
                    <span key={l} className='w-10 text-center text-xs text-gray-500'>{l}</span>
                  ))}
                </div>
                <span className='text-xs text-gray-500 ml-2 w-8'>Oct</span>
                <span className='text-xs text-gray-500 w-10'>Sym</span>
                <span className='text-xs text-gray-500 ml-auto'>Special</span>
              </div>
              <PermRow label='Owner' perm={perms.owner} onChange={(p) => setPerms({ ...perms, owner: p })}
                special={perms.setuid} specialLabel='SetUID' specialValue={perms.setuid} onSpecialChange={(v) => setPerms({ ...perms, setuid: v })} />
              <PermRow label='Group' perm={perms.group} onChange={(p) => setPerms({ ...perms, group: p })}
                special={perms.setgid} specialLabel='SetGID' specialValue={perms.setgid} onSpecialChange={(v) => setPerms({ ...perms, setgid: v })} />
              <PermRow label='Other' perm={perms.other} onChange={(p) => setPerms({ ...perms, other: p })}
                special={perms.sticky} specialLabel='Sticky' specialValue={perms.sticky} onSpecialChange={(v) => setPerms({ ...perms, sticky: v })} />
            </div>
          </BpPanel>

          <BpPanel title='Result'>
            <div className='grid grid-cols-2 gap-3 mb-3'>
              <div className='bg-[#121212] rounded-lg p-4 text-center'>
                <p className='text-xs text-gray-500 mb-1'>Octal</p>
                <p className='font-mono text-3xl font-bold text-white'>{octal}</p>
              </div>
              <div className='bg-[#121212] rounded-lg p-4 text-center'>
                <p className='text-xs text-gray-500 mb-1'>Symbolic</p>
                <p className='font-mono text-2xl font-bold text-white tracking-wider'>{symbolic}</p>
              </div>
            </div>
            <p className='text-xs text-gray-400 italic'>{describePermission(perms)}</p>
          </BpPanel>

          <BpPanel title='chmod Commands'>
            <div className='flex items-center gap-3 mb-3'>
              <label className='text-xs text-gray-500 shrink-0'>Filename</label>
              <input value={filename} onChange={(e) => setFilename(e.target.value || '<file>')} placeholder='filename'
                className='bp-input flex-1 text-xs font-mono' />
            </div>
            <div className='space-y-2'>
              {[{ label: 'Octal', value: chmodCmd }, { label: 'Symbolic', value: chmodSymCmd }].map(({ label, value }) => (
                <div key={label} className='flex items-center gap-2'>
                  <span className='text-xs text-gray-500 w-16 shrink-0'>{label}</span>
                  <code className='flex-1 bp-code-view px-3 py-1.5 font-mono text-sm text-green-400'>{value}</code>
                  <BpCopyBtn text={value} label='COPY' />
                </div>
              ))}
            </div>
          </BpPanel>

          <BpPanel title='Import from Octal'>
            <div className='flex gap-2 mb-2'>
              <input value={octalInput} onChange={(e) => handleOctalInput(e.target.value)} placeholder='e.g. 755 or 1755'
                className='bp-input font-mono flex-1' maxLength={4} />
              <button type='button' className='bp-btn' onClick={() => handleOctalInput(octal)}>Sync current</button>
            </div>
            <p className='text-xs text-gray-500'>Enter 3 or 4 digit octal to set the checkboxes above</p>
          </BpPanel>

          <BpPanel title='Common Presets'>
            <div className='grid grid-cols-2 gap-2'>
              {PRESETS.map((p) => (
                <button key={p.octal} type='button' onClick={() => handlePreset(p.octal)}
                  className='text-left rounded px-3 py-2 bg-[#121212] hover:bg-[#222] border border-[hsla(0,0%,20%,1)] transition-colors'>
                  <p className='font-mono text-xs text-blue-400 mb-0.5'>{p.label}</p>
                  <p className='text-xs text-gray-500'>{p.desc}</p>
                </button>
              ))}
            </div>
          </BpPanel>

          <BpPanel title='Bit Reference'>
            <div className='grid grid-cols-3 gap-2 text-xs'>
              {[
                ['4 (r)', 'Read', 'text-green-400'],
                ['2 (w)', 'Write', 'text-yellow-400'],
                ['1 (x)', 'Execute', 'text-blue-400'],
                ['4000', 'SetUID — run as file owner', 'text-purple-400'],
                ['2000', 'SetGID — run as group', 'text-pink-400'],
                ['1000', 'Sticky — only owner can delete', 'text-orange-400'],
              ].map(([bit, desc, color]) => (
                <div key={bit} className='flex gap-2'>
                  <code className={`font-mono w-14 shrink-0 ${color}`}>{bit}</code>
                  <span className='text-gray-400'>{desc}</span>
                </div>
              ))}
            </div>
          </BpPanel>

        </div>
      </div>
    </BpToolStage>
  );
}
