'use client';

import { useState, useEffect } from 'react';
import { Button, Card, CardContent, Input, Textarea } from '@/ui';
import { Clock, Copy, Check, ArrowUpDown } from 'lucide-react';

export default function EpochConverterPage() {
  const [currentEpoch, setCurrentEpoch] = useState<number>(Math.floor(Date.now() / 1000));
  const [humanInput, setHumanInput] = useState('');
  const [epochInput, setEpochInput] = useState('');
  const [humanOutput, setHumanOutput] = useState('');
  const [epochOutput, setEpochOutput] = useState('');
  const [timezone, setTimezone] = useState<'UTC' | 'Local'>('Local');
  const [copied, setCopied] = useState<string | null>(null);

  // Update current epoch every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentEpoch(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const isSeconds = (timestamp: number): boolean => {
    // If timestamp is less than 10^12, it's likely seconds
    return timestamp < 1000000000000;
  };

  const formatDate = (date: Date, format: 'iso' | 'rfc2822' | 'local' | 'relative'): string => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    switch (format) {
      case 'iso':
        return date.toISOString();
      case 'rfc2822':
        return date.toUTCString();
      case 'local':
        return date.toLocaleString();
      case 'relative':
        if (Math.abs(diffSeconds) < 60) {
          return diffSeconds === 0
            ? 'now'
            : `${Math.abs(diffSeconds)} second${Math.abs(diffSeconds) !== 1 ? 's' : ''} ${
                diffSeconds > 0 ? 'from now' : 'ago'
              }`;
        } else if (Math.abs(diffMinutes) < 60) {
          return `${Math.abs(diffMinutes)} minute${Math.abs(diffMinutes) !== 1 ? 's' : ''} ${
            diffMinutes > 0 ? 'from now' : 'ago'
          }`;
        } else if (Math.abs(diffHours) < 24) {
          return `${Math.abs(diffHours)} hour${Math.abs(diffHours) !== 1 ? 's' : ''} ${
            diffHours > 0 ? 'from now' : 'ago'
          }`;
        } else if (Math.abs(diffDays) < 7) {
          return `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ${diffDays > 0 ? 'from now' : 'ago'}`;
        } else {
          return date.toLocaleDateString();
        }
    }
  };

  const humanToEpoch = () => {
    if (!humanInput.trim()) {
      setEpochOutput('');
      return;
    }

    try {
      const date = new Date(humanInput);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }

      const epochSeconds = Math.floor(date.getTime() / 1000);
      const epochMs = date.getTime();

      setEpochOutput(`${epochSeconds} (seconds)\n${epochMs} (milliseconds)`);
    } catch (e) {
      setEpochOutput('Invalid date format');
    }
  };

  const epochToHuman = () => {
    if (!epochInput.trim()) {
      setHumanOutput('');
      return;
    }

    try {
      const inputValue = parseFloat(epochInput.trim());
      if (isNaN(inputValue)) {
        throw new Error('Invalid number');
      }

      const isSecondsValue = isSeconds(inputValue);
      const date = isSecondsValue ? new Date(inputValue * 1000) : new Date(inputValue);

      if (isNaN(date.getTime())) {
        throw new Error('Invalid timestamp');
      }

      // Adjust for timezone
      let displayDate = date;
      if (timezone === 'UTC') {
        displayDate = new Date(date.toISOString());
      }

      const formats = {
        'ISO 8601': formatDate(displayDate, 'iso'),
        'RFC 2822': formatDate(displayDate, 'rfc2822'),
        Local: formatDate(displayDate, 'local'),
        Relative: formatDate(displayDate, 'relative'),
      };

      const output = Object.entries(formats)
        .map(([label, value]) => `${label}: ${value}`)
        .join('\n');

      setHumanOutput(output);
    } catch (e) {
      setHumanOutput('Invalid epoch timestamp');
    }
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch (e) {
      console.error('Failed to copy');
    }
  };

  const quickAction = (action: string) => {
    const now = Date.now();
    let timestamp: number;

    switch (action) {
      case 'now':
        timestamp = Math.floor(now / 1000);
        break;
      case '+1hour':
        timestamp = Math.floor((now + 3600000) / 1000);
        break;
      case '+1day':
        timestamp = Math.floor((now + 86400000) / 1000);
        break;
      case '+1week':
        timestamp = Math.floor((now + 604800000) / 1000);
        break;
      case 'today':
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        timestamp = Math.floor(today.getTime() / 1000);
        break;
      case 'yesterday':
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        timestamp = Math.floor(yesterday.getTime() / 1000);
        break;
      default:
        timestamp = Math.floor(now / 1000);
    }

    setEpochInput(timestamp.toString());
    epochToHuman();
  };

  return (
    <div className='h-full flex flex-col'>
      {/* Header */}
      <div className='border-b border-gray-800 bg-gray-900 p-6'>
        <h1 className='text-2xl font-bold text-white mb-2'>Epoch Time Converter</h1>
        <p className='text-gray-400'>Convert between human-readable dates and Unix timestamps</p>
      </div>
      {/* Content */}
      <div className='flex-1 overflow-auto p-6'>
        <div className='max-w-6xl mx-auto space-y-6'>
          {/* Current Time */}
          <Card>
            <CardContent className='pt-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <h3 className='text-sm font-semibold text-gray-300 mb-1'>Current Epoch Time</h3>
                  <p className='text-2xl font-mono text-white'>{currentEpoch}</p>
                  <p className='text-sm text-gray-500 mt-1'>{new Date(currentEpoch * 1000).toLocaleString()}</p>
                </div>
                <Button onClick={() => handleCopy(currentEpoch.toString(), 'current')} variant='outline' size='sm'>
                  {copied === 'current' ? <Check className='w-4 h-4' /> : <Copy className='w-4 h-4' />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardContent className='pt-6'>
              <h3 className='text-sm font-semibold text-gray-300 mb-3'>Quick Actions</h3>
              <div className='flex flex-wrap gap-2'>
                <Button onClick={() => quickAction('now')} variant='outline' size='sm'>
                  Now
                </Button>
                <Button onClick={() => quickAction('+1hour')} variant='outline' size='sm'>
                  +1 hour
                </Button>
                <Button onClick={() => quickAction('+1day')} variant='outline' size='sm'>
                  +1 day
                </Button>
                <Button onClick={() => quickAction('+1week')} variant='outline' size='sm'>
                  +1 week
                </Button>
                <Button onClick={() => quickAction('today')} variant='outline' size='sm'>
                  Start of Today
                </Button>
                <Button onClick={() => quickAction('yesterday')} variant='outline' size='sm'>
                  Yesterday
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Conversion Cards */}
          <div className='grid lg:grid-cols-2 gap-6'>
            {/* Human to Epoch */}
            <Card>
              <CardContent className='pt-6 space-y-4'>
                <div className='flex items-center justify-between'>
                  <h3 className='text-sm font-semibold text-gray-300'>Human → Epoch</h3>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value as 'UTC' | 'Local')}
                    className='h-8 px-2 rounded-md border border-gray-700 bg-gray-800 text-gray-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500'
                  >
                    <option>Local</option>
                    <option>UTC</option>
                  </select>
                </div>
                <Input
                  type='datetime-local'
                  value={humanInput}
                  onChange={(e) => setHumanInput(e.target.value)}
                  className='w-full'
                />
                <Button onClick={humanToEpoch} disabled={!humanInput.trim()} className='w-full'>
                  Convert
                </Button>
                {epochOutput && (
                  <div className='bg-gray-950 rounded-md p-3'>
                    <div className='flex items-center justify-between mb-2'>
                      <span className='text-xs text-gray-400'>Result:</span>
                      <Button onClick={() => handleCopy(epochOutput, 'epoch-output')} variant='ghost' size='sm'>
                        {copied === 'epoch-output' ? <Check className='w-3 h-3' /> : <Copy className='w-3 h-3' />}
                      </Button>
                    </div>
                    <pre className='text-sm font-mono text-gray-300 whitespace-pre-wrap'>{epochOutput}</pre>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Epoch to Human */}
            <Card>
              <CardContent className='pt-6 space-y-4'>
                <div className='flex items-center justify-between'>
                  <h3 className='text-sm font-semibold text-gray-300'>Epoch → Human</h3>
                  <select
                    value={timezone}
                    onChange={(e) => {
                      setTimezone(e.target.value as 'UTC' | 'Local');
                      if (epochInput) epochToHuman();
                    }}
                    className='h-8 px-2 rounded-md border border-gray-700 bg-gray-800 text-gray-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500'
                  >
                    <option>Local</option>
                    <option>UTC</option>
                  </select>
                </div>
                <Input
                  type='number'
                  placeholder='Enter epoch timestamp (seconds or milliseconds)'
                  value={epochInput}
                  onChange={(e) => {
                    setEpochInput(e.target.value);
                    if (e.target.value.trim()) {
                      setTimeout(() => epochToHuman(), 300);
                    }
                  }}
                  className='w-full font-mono'
                />
                <Button onClick={epochToHuman} disabled={!epochInput.trim()} className='w-full'>
                  Convert
                </Button>
                {humanOutput && (
                  <div className='bg-gray-950 rounded-md p-3'>
                    <div className='flex items-center justify-between mb-2'>
                      <span className='text-xs text-gray-400'>Result:</span>
                      <Button onClick={() => handleCopy(humanOutput, 'human-output')} variant='ghost' size='sm'>
                        {copied === 'human-output' ? <Check className='w-3 h-3' /> : <Copy className='w-3 h-3' />}
                      </Button>
                    </div>
                    <pre className='text-sm font-mono text-gray-300 whitespace-pre-wrap'>{humanOutput}</pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {!humanInput && !epochInput && (
            <Card className='border-dashed'>
              <CardContent className='pt-6'>
                <div className='text-center text-gray-500 py-12'>
                  <Clock className='w-12 h-12 mx-auto mb-4 opacity-50' />
                  <p>Enter a date or epoch timestamp to convert</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
