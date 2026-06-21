'use client';

import React, { useState, useEffect } from 'react';
import { BpCopyBtn } from '@/components/blueprint';
import { AlertCircle } from 'lucide-react';

// ─── helpers ──────────────────────────────────────────────────────────────────

function parseIPv4(ip: string): number[] | null {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return null;
  const nums = parts.map(Number);
  if (nums.some((n) => isNaN(n) || n < 0 || n > 255)) return null;
  return nums;
}

function ipToNumber(octets: number[]): number {
  return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
}

function numberToIP(n: number): string {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff].join('.');
}

function numberToBinary(n: number): string {
  const bin = (n >>> 0).toString(2).padStart(32, '0');
  return `${bin.slice(0, 8)}.${bin.slice(8, 16)}.${bin.slice(16, 24)}.${bin.slice(24)}`;
}

function prefixToMask(prefix: number): number {
  return prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
}

function getIPClass(firstOctet: number): string {
  if (firstOctet < 128) return 'A';
  if (firstOctet < 192) return 'B';
  if (firstOctet < 224) return 'C';
  if (firstOctet < 240) return 'D (Multicast)';
  return 'E (Reserved)';
}

function isPrivate(octets: number[]): string | null {
  const [a, b] = octets;
  if (a === 10) return '10.0.0.0/8 (RFC 1918)';
  if (a === 172 && b >= 16 && b <= 31) return '172.16.0.0/12 (RFC 1918)';
  if (a === 192 && b === 168) return '192.168.0.0/16 (RFC 1918)';
  if (a === 127) return '127.0.0.0/8 (Loopback)';
  if (a === 169 && b === 254) return '169.254.0.0/16 (Link-local)';
  return null;
}

interface SubnetInfo {
  networkAddress: string; broadcastAddress: string; subnetMask: string; wildcardMask: string;
  firstHost: string; lastHost: string; totalHosts: number; usableHosts: number;
  prefix: number; ipClass: string; privateRange: string | null;
  ipBinary: string; maskBinary: string; networkBinary: string; broadcastBinary: string;
}

function calculate(cidr: string): { info: SubnetInfo | null; error: string | null } {
  const parts = cidr.trim().split('/');
  if (parts.length !== 2) return { info: null, error: 'Enter CIDR notation like 192.168.1.0/24' };
  const octets = parseIPv4(parts[0]);
  if (!octets) return { info: null, error: 'Invalid IP address' };
  const prefix = parseInt(parts[1], 10);
  if (isNaN(prefix) || prefix < 0 || prefix > 32) return { info: null, error: 'Prefix must be 0–32' };
  const ipNum = ipToNumber(octets);
  const maskNum = prefixToMask(prefix);
  const wildcardNum = (~maskNum) >>> 0;
  const networkNum = (ipNum & maskNum) >>> 0;
  const broadcastNum = (networkNum | wildcardNum) >>> 0;
  const firstHostNum = prefix < 31 ? networkNum + 1 : networkNum;
  const lastHostNum = prefix < 31 ? broadcastNum - 1 : broadcastNum;
  const totalHosts = Math.pow(2, 32 - prefix);
  const usableHosts = prefix < 31 ? totalHosts - 2 : totalHosts;
  return {
    info: {
      networkAddress: numberToIP(networkNum), broadcastAddress: numberToIP(broadcastNum),
      subnetMask: numberToIP(maskNum), wildcardMask: numberToIP(wildcardNum),
      firstHost: numberToIP(firstHostNum), lastHost: numberToIP(lastHostNum),
      totalHosts, usableHosts, prefix, ipClass: getIPClass(octets[0]),
      privateRange: isPrivate(octets), ipBinary: numberToBinary(ipNum),
      maskBinary: numberToBinary(maskNum), networkBinary: numberToBinary(networkNum),
      broadcastBinary: numberToBinary(broadcastNum),
    },
    error: null,
  };
}

const EXAMPLES = [
  { label: 'Home network', cidr: '192.168.1.0/24' },
  { label: 'Class A private', cidr: '10.0.0.0/8' },
  { label: 'Class B private', cidr: '172.16.0.0/12' },
  { label: '/16 subnet', cidr: '192.168.0.0/16' },
  { label: '/30 point-to-point', cidr: '10.0.0.0/30' },
  { label: '/32 host route', cidr: '192.168.1.1/32' },
];

// ─── CSS vars ─────────────────────────────────────────────────────────────────

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

// ─── Panel component ──────────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CIDRCalculatorPage() {
  const [cidr, setCIDR] = useState('192.168.1.0/24');
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const checkViewport = () => setIsDesktop(window.innerWidth >= 1024);
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  const { info, error } = calculate(cidr);

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
      {/* Header */}
      <div style={{ padding: '12px 20px 10px', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0 }}>
        <h1 style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0, marginBottom: 2 }}>CIDR Calculator</h1>
        <p style={{ fontSize: 11, color: 'var(--bp-ink-mute)', margin: 0 }}>Calculate subnet ranges, broadcast address and usable host count</p>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '320px 1fr', overflow: 'hidden' }}>

        {/* Left: Input + Examples */}
        <Panel title='Input' style={{ borderRight: 0, borderTop: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: 12, gap: 12 }}>
            {/* CIDR input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--bp-ink-mute)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>CIDR Notation</span>
              <input
                value={cidr}
                onChange={(e) => setCIDR(e.target.value)}
                placeholder='192.168.1.0/24'
                style={{
                  flex: 1,
                  background: 'var(--bp-bg)',
                  border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : 'var(--bp-border-str)'}`,
                  color: 'var(--bp-ink)',
                  fontFamily: 'inherit',
                  fontSize: 14,
                  padding: '8px 10px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <span style={{ fontSize: 10, color: 'var(--bp-ink-faint)' }}>Format: &lt;ip-address&gt;/&lt;prefix-length&gt; — e.g. 10.0.0.0/8</span>
            </div>

            {/* Error */}
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(127,29,29,0.2)' }}>
                <AlertCircle style={{ width: 14, height: 14, color: '#f87171', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#fca5a5' }}>{error}</span>
              </div>
            )}

            {/* Examples */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--bp-ink-mute)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Examples</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex.cidr}
                    type='button'
                    onClick={() => setCIDR(ex.cidr)}
                    style={{
                      textAlign: 'left',
                      padding: '7px 10px',
                      background: 'var(--bp-surface)',
                      border: '1px solid var(--bp-border)',
                      color: 'var(--bp-ink)',
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    <p style={{ fontSize: 10, color: 'var(--bp-ink-mute)', margin: 0, marginBottom: 2 }}>{ex.label}</p>
                    <p style={{ fontSize: 11, color: '#a78bfa', margin: 0, fontFamily: 'inherit' }}>{ex.cidr}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        {/* Right: Results */}
        <Panel title='Results' style={{ borderTop: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {info && (
              <>
                {/* Summary stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {[
                    { label: 'Network', value: info.networkAddress },
                    { label: 'Broadcast', value: info.broadcastAddress },
                    { label: 'Usable Hosts', value: info.usableHosts.toLocaleString() },
                    { label: 'IP Class', value: info.ipClass },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)', padding: '8px 10px' }}>
                      <p style={{ fontSize: 9, color: 'var(--bp-ink-mute)', margin: 0, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</p>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', margin: 0, fontFamily: 'inherit' }}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Network Details */}
                <Panel title='Network Details'>
                  <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[
                      { label: 'Network Address', value: info.networkAddress },
                      { label: 'Broadcast Address', value: info.broadcastAddress },
                      { label: 'Subnet Mask', value: info.subnetMask },
                      { label: 'Wildcard Mask', value: info.wildcardMask },
                      { label: 'First Usable Host', value: info.firstHost },
                      { label: 'Last Usable Host', value: info.lastHost },
                      { label: 'CIDR Range', value: `${info.networkAddress}/${info.prefix}` },
                      { label: 'Total Addresses', value: info.totalHosts.toLocaleString() },
                      { label: 'Usable Hosts', value: info.usableHosts.toLocaleString() },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--bp-ink-mute)', width: 140, flexShrink: 0 }}>{label}</span>
                        <code style={{ flex: 1, background: 'var(--bp-bg)', border: '1px solid var(--bp-border)', padding: '4px 10px', fontSize: 12, color: 'var(--bp-ink)', fontFamily: 'inherit' }}>{value}</code>
                        <BpCopyBtn text={value} label='COPY' />
                      </div>
                    ))}
                    {info.privateRange && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--bp-ink-mute)', width: 140, flexShrink: 0 }}>Private Range</span>
                        <span style={{ flex: 1, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', padding: '4px 10px', fontSize: 12, color: '#4ade80', fontFamily: 'inherit' }}>{info.privateRange}</span>
                      </div>
                    )}
                  </div>
                </Panel>

                {/* Binary Representation */}
                <Panel title='Binary Representation'>
                  <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[
                      { label: 'Input IP', value: info.ipBinary },
                      { label: 'Subnet Mask', value: info.maskBinary },
                      { label: 'Network Addr', value: info.networkBinary },
                      { label: 'Broadcast', value: info.broadcastBinary },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--bp-ink-mute)', width: 96, flexShrink: 0, paddingTop: 4 }}>{label}</span>
                        <code style={{ flex: 1, background: 'var(--bp-bg)', border: '1px solid var(--bp-border)', padding: '4px 10px', fontSize: 11, color: '#a5b4c8', fontFamily: 'inherit', wordBreak: 'break-all' }}>{value}</code>
                      </div>
                    ))}
                  </div>
                </Panel>
              </>
            )}

            {!info && !error && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--bp-ink-faint)', fontSize: 12 }}>
                Enter a CIDR address to see results
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
