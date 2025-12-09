const fs = require('fs');
const path = require('path');

const toolName = process.argv[2];
if (!toolName) {
  console.error('❌ Usage: pnpm new:tool <tool-name>');
  console.error('   Example: pnpm new:tool base64-encoder');
  process.exit(1);
}

const kebabCase = toolName.toLowerCase().replace(/\s+/g, '-');
const pascalCase = kebabCase.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('');

const toolPath = path.join(__dirname, `../apps/web/app/tools/${kebabCase}`);
fs.mkdirSync(toolPath, { recursive: true });

const template = `'use client';

import { useState } from 'react';
import { Button, Card, CardContent, Input } from '@/ui';

export default function ${pascalCase}Page() {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-6">
        <h1 className="text-2xl font-bold text-white mb-2">${pascalCase.replace(/([A-Z])/g, ' $1').trim()}</h1>
        <p className="text-gray-400">
          Tool description goes here
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Tool implementation */}
              <p className="text-gray-400">Tool content goes here</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(path.join(toolPath, 'page.tsx'), template);

console.log('\x1b[32m✅ Created tool file:\x1b[0m', `apps/web/app/tools/${kebabCase}/page.tsx`);
console.log('\x1b[33m⚠️  Next steps:\x1b[0m');
console.log('   1. Add tool to apps/web/lib/tools.ts');
console.log('   2. Choose an icon from lucide-react');
console.log('   3. Implement the tool logic');
