'use client';

import { useState } from 'react';
import { BpToolStage, BpPanel, BpCopyBtn } from '@/components/blueprint';
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

export default function CIDRCalculatorPage() {
  const [cidr, setCIDR] = useState('192.168.1.0/24');

  const { info, error } = calculate(cidr);

  return (
    <BpToolStage cat='infra'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>CIDR / Subnet Calculator</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Calculate IP ranges, netmasks, and broadcast addresses from CIDR notation</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-3xl mx-auto space-y-4'>

          <BpPanel title='CIDR Notation'>
            <input value={cidr} onChange={(e) => setCIDR(e.target.value)} placeholder='192.168.1.0/24'
              className={`bp-input w-full font-mono text-lg mb-2 ${error ? 'border-red-500/50' : ''}`} />
            <p className='text-xs text-gray-500'>Format: &lt;ip-address&gt;/&lt;prefix-length&gt; — e.g. 10.0.0.0/8</p>
          </BpPanel>

          <BpPanel title='Examples'>
            <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
              {EXAMPLES.map((ex) => (
                <button key={ex.cidr} type='button' onClick={() => setCIDR(ex.cidr)}
                  className='text-left rounded px-3 py-2 bg-[#121212] hover:bg-[#222] border border-[hsla(0,0%,20%,1)] transition-colors'>
                  <p className='text-xs text-gray-400 mb-0.5'>{ex.label}</p>
                  <p className='font-mono text-xs text-blue-400'>{ex.cidr}</p>
                </button>
              ))}
            </div>
          </BpPanel>

          {error && (
            <div className='flex items-center gap-2 p-3 rounded border border-red-500/40 bg-red-950/20'>
              <AlertCircle className='w-4 h-4 text-red-400 shrink-0' />
              <span className='text-sm text-red-300'>{error}</span>
            </div>
          )}

          {info && (
            <>
              <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
                {[
                  { label: 'Network', value: info.networkAddress },
                  { label: 'Broadcast', value: info.broadcastAddress },
                  { label: 'Usable Hosts', value: info.usableHosts.toLocaleString() },
                  { label: 'IP Class', value: info.ipClass },
                ].map(({ label, value }) => (
                  <div key={label} className='bg-[#1C1C1C] border border-[hsla(0,0%,20%,1)] rounded-lg p-3'>
                    <p className='text-xs text-gray-500 mb-1'>{label}</p>
                    <p className='font-mono text-sm font-semibold text-white'>{value}</p>
                  </div>
                ))}
              </div>

              <BpPanel title='Network Details'>
                <div className='space-y-2'>
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
                    <div key={label} className='flex items-center gap-2'>
                      <span className='text-xs text-gray-500 w-36 shrink-0'>{label}</span>
                      <code className='flex-1 bp-code-view px-3 py-1.5 font-mono text-sm text-gray-200'>{value}</code>
                      <BpCopyBtn text={value} label='COPY' />
                    </div>
                  ))}
                  {info.privateRange && (
                    <div className='flex items-center gap-2'>
                      <span className='text-xs text-gray-500 w-36 shrink-0'>Private Range</span>
                      <span className='flex-1 bg-green-500/10 border border-green-500/30 rounded px-3 py-1.5 text-sm text-green-400 font-mono'>{info.privateRange}</span>
                    </div>
                  )}
                </div>
              </BpPanel>

              <BpPanel title='Binary Representation'>
                <div className='space-y-2'>
                  {[
                    { label: 'Input IP', value: info.ipBinary },
                    { label: 'Subnet Mask', value: info.maskBinary },
                    { label: 'Network Addr', value: info.networkBinary },
                    { label: 'Broadcast', value: info.broadcastBinary },
                  ].map(({ label, value }) => (
                    <div key={label} className='flex items-start gap-2'>
                      <span className='text-xs text-gray-500 w-24 shrink-0 pt-1.5'>{label}</span>
                      <code className='flex-1 bp-code-view px-3 py-1.5 font-mono text-xs text-gray-300 break-all'>{value}</code>
                    </div>
                  ))}
                </div>
              </BpPanel>
            </>
          )}

        </div>
      </div>
    </BpToolStage>
  );
}
