import { Send, Type, Database, Film, Clock, GitCompare, Code2, CaseSensitive, ArrowLeftRight, Hash as HashIcon, Shield, Fingerprint, FileText, Music, Maximize2 } from 'lucide-react';
import { Tool } from '@/utils';

export const TOOLS: Tool[] = [
    {
        id: 'api-tester',
        name: 'API Tester',
        description: 'Test HTTP endpoints instantly',
        icon: Send,
        category: 'api',
        path: '/tools/api-tester',
    },
    {
        id: 'base64-encoder',
        name: 'Base64 Encoder/Decoder',
        description: 'Encode or decode text to/from Base64',
        icon: Database,
        category: 'data',
        path: '/tools/base64-encoder',
    },
    {
        id: 'format-aware-diff',
        name: 'Format-Aware Diff',
        description: 'Compare code with normalized whitespace',
        icon: GitCompare,
        category: 'text',
        path: '/tools/format-aware-diff',
    },
    {
        id: 'text-escape',
        name: 'Text Escape/Unescape',
        description: 'Encode or decode text in various formats',
        icon: Type,
        category: 'text',
        path: '/tools/text-escape',
    },
    {
        id: 'code-formatter',
        name: 'Code Minifier/Beautifier',
        description: 'Format or minify code in various languages',
        icon: Code2,
        category: 'text',
        path: '/tools/code-formatter',
    },
    {
        id: 'case-converter',
        name: 'String Case Converter',
        description: 'Convert text between different case formats',
        icon: CaseSensitive,
        category: 'text',
        path: '/tools/case-converter',
    },
    {
        id: 'json-yaml-converter',
        name: 'JSON ↔ YAML Converter',
        description: 'Convert between JSON and YAML formats',
        icon: ArrowLeftRight,
        category: 'data',
        path: '/tools/json-yaml-converter',
    },
    {
        id: 'hash-generator',
        name: 'Hash Generator',
        description: 'Generate cryptographic hashes',
        icon: HashIcon,
        category: 'data',
        path: '/tools/hash-generator',
    },
    {
        id: 'cors-checker',
        name: 'CORS Preflight Checker',
        description: 'Test CORS configuration and check if requests are allowed',
        icon: Shield,
        category: 'api',
        path: '/tools/cors-checker',
    },
    {
        id: 'epoch-converter',
        name: 'Epoch Time Converter',
        description: 'Convert between human-readable dates and Unix timestamps',
        icon: Clock,
        category: 'time',
        path: '/tools/epoch-converter',
    },
    {
        id: 'uuid-generator',
        name: 'UUID Generator',
        description: 'Generate UUIDs (v4 random or v7 timestamp-based)',
        icon: Fingerprint,
        category: 'time',
        path: '/tools/uuid-generator',
    },
    {
        id: 'ffmpeg-clipper',
        name: 'FFmpeg Clipper & Converter',
        description: 'Generate FFmpeg commands for clipping and converting videos',
        icon: Film,
        category: 'ffmpeg',
        path: '/tools/ffmpeg-clipper',
    },
    {
        id: 'ffmpeg-subtitle-watermark',
        name: 'FFmpeg Subtitle/Watermark Burner',
        description: 'Generate FFmpeg commands to burn subtitles or watermarks',
        icon: FileText,
        category: 'ffmpeg',
        path: '/tools/ffmpeg-subtitle-watermark',
    },
    {
        id: 'ffmpeg-audio-extractor',
        name: 'FFmpeg Audio Extractor',
        description: 'Generate FFmpeg commands to extract audio from videos',
        icon: Music,
        category: 'ffmpeg',
        path: '/tools/ffmpeg-audio-extractor',
    },
    {
        id: 'ffmpeg-video-resize',
        name: 'FFmpeg Video Resize & Scale',
        description: 'Generate FFmpeg commands to resize and scale videos',
        icon: Maximize2,
        category: 'ffmpeg',
        path: '/tools/ffmpeg-video-resize',
    },
];

export function getToolById(id: string): Tool | undefined {
    return TOOLS.find(tool => tool.id === id);
}

export function getToolsByCategory(category: string): Tool[] {
    return TOOLS.filter(tool => tool.category === category);
}
