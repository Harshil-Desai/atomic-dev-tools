import { LucideIcon } from 'lucide-react';

export interface Tool {
    id: string;
    name: string;
    description: string;
    icon: LucideIcon;
    category: 'api' | 'text' | 'data' | 'ffmpeg' | 'time';
    path: string;
}

export const TOOL_CATEGORIES = {
    api: 'API & Networking',
    text: 'Text & Code',
    data: 'Data & Encoding',
    ffmpeg: 'FFmpeg Tools',
    time: 'Time & IDs',
} as const;