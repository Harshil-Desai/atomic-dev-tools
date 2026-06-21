'use client';

import React, { useState, useEffect } from 'react';
import { BpCopyBtn } from '@/components/blueprint';

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

// ─── css vars ─────────────────────────────────────────────────────────────────

const CSS_VARS: React.CSSProperties = {
  '--bp-bg': '#0a0e14',
  '--bp-surface': '#0f141c',
  '--bp-elevated': '#131a24',
  '--bp-border': '#1e2d3d',
  '--bp-border-str': '#2a3a52',
  '--bp-ink': '#cfd8e3',
  '--bp-ink-mute': '#6b7a8c',
  '--bp-ink-faint': '#3a4554',
  '--bp-accent': '#b48cff',
} as React.CSSProperties;

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

// ─── panel component ──────────────────────────────────────────────────────────

function Panel({ title, meta, children, style }: { title: string; meta?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid var(--bp-border)', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 28, borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0 }}>
        <span style={{ width: 6, height: 6, background: 'var(--bp-accent)', flexShrink: 0 }} />
        <span style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{title}</span>
        {meta && <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--bp-ink-faint)' }}>{meta}</span>}
      </div>
      {children}
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
  const [isDesktop, setIsDesktop] = useState(true);
  const [perms, setPerms] = useState<Permissions>(DEFAULT_PERMS);
  const [octalInput, setOctalInput] = useState('');
  const [filename, setFilename] = useState('<file>');

  useEffect(() => {
    const checkViewport = () => setIsDesktop(window.innerWidth >= 1024);
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

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

  if (!isDesktop) {
    return (
      <div className='h-full flex flex-col items-center justify-center' style={{...CSS_VARS, background: 'var(--bp-bg)', color: 'var(--bp-ink)', fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace'}}>
        <div className='text-center px-4 sm:px-6'>
          <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>Desktop Only</h1>
          <p className='text-sm sm:text-base text-[var(--bp-ink-mute)] mb-4'>This tool requires a larger screen for optimal use.</p>
          <p className='text-xs sm:text-sm text-[var(--bp-ink-faint)]'>Please open this tool on a desktop or laptop (1024px+ width)</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className='h-full flex flex-col overflow-hidden'
      data-cat='systems'
      style={{ ...CSS_VARS, fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', background: 'var(--bp-bg)', color: 'var(--bp-ink)' }}
    >
      {/* header */}
      <div style={{ padding: '12px 20px 10px', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0 }}>
        <h1 style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0, marginBottom: 2 }}>Chmod Calculator</h1>
        <p style={{ fontSize: 11, color: 'var(--bp-ink-mute)', margin: 0 }}>Build and decode Unix file permission strings interactively</p>
      </div>

      {/* content */}
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>

        {/* left column */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--bp-border)' }}>

          {/* permission builder */}
          <Panel title='Permission Builder' style={{ borderLeft: 0, borderTop: 0, borderRight: 0, flex: '0 0 auto' }}>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className='flex items-center gap-3 mb-1'>
                <span className='text-xs w-12' style={{ color: 'var(--bp-ink-faint)' }}></span>
                <div className='flex gap-1'>
                  {['Read', 'Write', 'Exec'].map((l) => (
                    <span key={l} className='w-10 text-center text-xs' style={{ color: 'var(--bp-ink-mute)' }}>{l}</span>
                  ))}
                </div>
                <span className='text-xs ml-2 w-8' style={{ color: 'var(--bp-ink-mute)' }}>Oct</span>
                <span className='text-xs w-10' style={{ color: 'var(--bp-ink-mute)' }}>Sym</span>
                <span className='text-xs ml-auto' style={{ color: 'var(--bp-ink-mute)' }}>Special</span>
              </div>
              <PermRow label='Owner' perm={perms.owner} onChange={(p) => setPerms({ ...perms, owner: p })}
                special={perms.setuid} specialLabel='SetUID' specialValue={perms.setuid} onSpecialChange={(v) => setPerms({ ...perms, setuid: v })} />
              <PermRow label='Group' perm={perms.group} onChange={(p) => setPerms({ ...perms, group: p })}
                special={perms.setgid} specialLabel='SetGID' specialValue={perms.setgid} onSpecialChange={(v) => setPerms({ ...perms, setgid: v })} />
              <PermRow label='Other' perm={perms.other} onChange={(p) => setPerms({ ...perms, other: p })}
                special={perms.sticky} specialLabel='Sticky' specialValue={perms.sticky} onSpecialChange={(v) => setPerms({ ...perms, sticky: v })} />
            </div>
          </Panel>

          {/* import from octal */}
          <Panel title='Import from Octal' style={{ borderLeft: 0, borderTop: 0, borderRight: 0, flex: '0 0 auto' }}>
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={octalInput}
                  onChange={(e) => handleOctalInput(e.target.value)}
                  placeholder='e.g. 755 or 1755'
                  maxLength={4}
                  style={{ flex: 1, background: 'var(--bp-bg)', border: '1px solid var(--bp-border-str)', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 12, padding: '7px 10px', outline: 'none', boxSizing: 'border-box' }}
                />
                <button type='button' className='bp-btn' onClick={() => handleOctalInput(octal)}>Sync current</button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--bp-ink-mute)', margin: 0 }}>Enter 3 or 4 digit octal to set the checkboxes above</p>
            </div>
          </Panel>

          {/* common presets */}
          <Panel title='Common Presets' style={{ borderLeft: 0, borderTop: 0, borderRight: 0, flex: 1, minHeight: 0 }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {PRESETS.map((p) => (
                  <button key={p.octal} type='button' onClick={() => handlePreset(p.octal)}
                    style={{ textAlign: 'left', padding: '8px 12px', background: 'var(--bp-bg)', border: '1px solid var(--bp-border)', cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bp-elevated)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bp-bg)')}
                  >
                    <p style={{ fontFamily: 'inherit', fontSize: 11, color: '#93c5fd', margin: 0, marginBottom: 2 }}>{p.label}</p>
                    <p style={{ fontSize: 10, color: 'var(--bp-ink-mute)', margin: 0 }}>{p.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </Panel>

        </div>

        {/* right column */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* result */}
          <Panel title='Result' style={{ borderLeft: 0, borderTop: 0, borderRight: 0, flex: '0 0 auto' }}>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: 'var(--bp-bg)', border: '1px solid var(--bp-border)', padding: '14px 12px', textAlign: 'center' }}>
                  <p style={{ fontSize: 10, color: 'var(--bp-ink-mute)', margin: 0, marginBottom: 6, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Octal</p>
                  <p style={{ fontFamily: 'inherit', fontSize: 28, fontWeight: 700, color: '#fff', margin: 0 }}>{octal}</p>
                </div>
                <div style={{ background: 'var(--bp-bg)', border: '1px solid var(--bp-border)', padding: '14px 12px', textAlign: 'center' }}>
                  <p style={{ fontSize: 10, color: 'var(--bp-ink-mute)', margin: 0, marginBottom: 6, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Symbolic</p>
                  <p style={{ fontFamily: 'inherit', fontSize: 20, fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '0.1em' }}>{symbolic}</p>
                </div>
              </div>
              <p style={{ fontSize: 11, color: 'var(--bp-ink-mute)', fontStyle: 'italic', margin: 0 }}>{describePermission(perms)}</p>
            </div>
          </Panel>

          {/* chmod commands */}
          <Panel title='chmod Commands' style={{ borderLeft: 0, borderTop: 0, borderRight: 0, flex: '0 0 auto' }}>
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--bp-ink-mute)', flexShrink: 0 }}>Filename</span>
                <input
                  value={filename}
                  onChange={(e) => setFilename(e.target.value || '<file>')}
                  placeholder='filename'
                  style={{ flex: 1, background: 'var(--bp-bg)', border: '1px solid var(--bp-border-str)', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 12, padding: '7px 10px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[{ label: 'Octal', value: chmodCmd }, { label: 'Symbolic', value: chmodSymCmd }].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--bp-ink-mute)', width: 60, flexShrink: 0 }}>{label}</span>
                    <code style={{ flex: 1, background: 'var(--bp-bg)', border: '1px solid var(--bp-border)', fontFamily: 'inherit', fontSize: 12, padding: '6px 10px', color: '#86efac', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</code>
                    <BpCopyBtn text={value} label='COPY' />
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          {/* bit reference */}
          <Panel title='Bit Reference' style={{ borderLeft: 0, borderTop: 0, borderRight: 0, flex: 1, minHeight: 0 }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {[
                  ['4 (r)', 'Read', '#86efac'],
                  ['2 (w)', 'Write', '#fde68a'],
                  ['1 (x)', 'Execute', '#93c5fd'],
                  ['4000', 'SetUID — run as file owner', '#d8b4fe'],
                  ['2000', 'SetGID — run as group', '#f9a8d4'],
                  ['1000', 'Sticky — only owner can delete', '#fdba74'],
                ].map(([bit, desc, color]) => (
                  <div key={bit} style={{ display: 'flex', gap: 8 }}>
                    <code style={{ fontFamily: 'inherit', fontSize: 11, width: 40, flexShrink: 0, color: color as string }}>{bit}</code>
                    <span style={{ fontSize: 11, color: 'var(--bp-ink-mute)' }}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

        </div>
      </div>
    </div>
  );
}
