'use client';

import { useState } from 'react';
import { Button, Card, CardContent, Textarea } from '@/ui';
import { Braces, Copy, Check, AlertCircle } from 'lucide-react';

// ─── types ────────────────────────────────────────────────────────────────────

type Lang = 'typescript' | 'go' | 'rust';

type TypeNode =
  | { kind: 'primitive'; type: 'string' | 'number' | 'boolean' | 'null' | 'any' }
  | { kind: 'optional'; inner: TypeNode }
  | { kind: 'array'; element: TypeNode }
  | { kind: 'object'; name: string; fields: Field[] };

interface Field {
  key: string;
  node: TypeNode;
  nullable: boolean;
}

// ─── inference ────────────────────────────────────────────────────────────────

type JSONValue = string | number | boolean | null | JSONValue[] | { [k: string]: JSONValue };

const generatedNames = new Set<string>();

function toPascalCase(s: string): string {
  return s.replace(/[-_\s]+(.)/g, (_, c: string) => c.toUpperCase())
          .replace(/^(.)/, (c: string) => c.toUpperCase());
}

function uniqueName(base: string): string {
  const pascal = toPascalCase(base) || 'Object';
  if (!generatedNames.has(pascal)) { generatedNames.add(pascal); return pascal; }
  let i = 2;
  while (generatedNames.has(pascal + i)) i++;
  generatedNames.add(pascal + i);
  return pascal + i;
}

function inferNode(val: JSONValue, name: string): TypeNode {
  if (val === null) return { kind: 'primitive', type: 'null' };
  if (typeof val === 'string') return { kind: 'primitive', type: 'string' };
  if (typeof val === 'number') return { kind: 'primitive', type: 'number' };
  if (typeof val === 'boolean') return { kind: 'primitive', type: 'boolean' };

  if (Array.isArray(val)) {
    if (val.length === 0) return { kind: 'array', element: { kind: 'primitive', type: 'any' } };
    // Merge all element types
    const elementName = name.replace(/s$/i, '') || 'Item';
    const merged = mergeNodes(val.map((v) => inferNode(v as JSONValue, elementName)));
    return { kind: 'array', element: merged };
  }

  // Object
  const structName = uniqueName(name);
  const fields: Field[] = Object.entries(val as Record<string, JSONValue>).map(([k, v]) => {
    const nullable = v === null;
    const node = inferNode(v, k);
    return { key: k, node: nullable ? { kind: 'primitive', type: 'null' } : node, nullable };
  });
  return { kind: 'object', name: structName, fields };
}

function mergeNodes(nodes: TypeNode[]): TypeNode {
  if (nodes.length === 1) return nodes[0];
  const kinds = new Set(nodes.map((n) => n.kind));
  if (kinds.size === 1 && nodes[0].kind === 'primitive') {
    const types = new Set(nodes.map((n) => n.kind === 'primitive' ? n.type : 'any'));
    if (types.size === 1) return nodes[0];
  }
  // Fallback: any
  return { kind: 'primitive', type: 'any' };
}

// ─── collect all named objects (depth-first) ─────────────────────────────────

function collectObjects(node: TypeNode, out: TypeNode[]): void {
  if (node.kind === 'object') {
    node.fields.forEach((f) => collectObjects(f.node, out));
    out.push(node);
  } else if (node.kind === 'array') {
    collectObjects(node.element, out);
  } else if (node.kind === 'optional') {
    collectObjects(node.inner, out);
  }
}

// ─── TypeScript generator ─────────────────────────────────────────────────────

function tsType(node: TypeNode, nullable: boolean): string {
  let base: string;
  if (node.kind === 'primitive') {
    base = node.type === 'null' ? 'null' : node.type;
  } else if (node.kind === 'array') {
    base = `${tsType(node.element, false)}[]`;
  } else if (node.kind === 'object') {
    base = node.name;
  } else {
    base = `${tsType(node.inner, false)} | null`;
  }
  return nullable && node.kind !== 'primitive' ? `${base} | null` : base;
}

function generateTS(root: TypeNode): string {
  const objects: TypeNode[] = [];
  collectObjects(root, objects);

  return objects.map((obj) => {
    if (obj.kind !== 'object') return '';
    const lines = obj.fields.map((f) => {
      const optional = f.nullable ? '?' : '';
      const type = f.nullable ? `${tsType(f.node, false)} | null` : tsType(f.node, false);
      return `  ${f.key}${optional}: ${type};`;
    });
    return `interface ${obj.name} {\n${lines.join('\n')}\n}`;
  }).join('\n\n');
}

// ─── Go generator ─────────────────────────────────────────────────────────────

function goType(node: TypeNode, nullable: boolean): string {
  if (node.kind === 'primitive') {
    if (node.type === 'string') return nullable ? '*string' : 'string';
    if (node.type === 'number') return nullable ? '*float64' : 'float64';
    if (node.type === 'boolean') return nullable ? '*bool' : 'bool';
    if (node.type === 'null') return 'interface{}';
    return 'interface{}';
  }
  if (node.kind === 'array') return `[]${goType(node.element, false)}`;
  if (node.kind === 'object') return nullable ? `*${node.name}` : node.name;
  return 'interface{}';
}

function goFieldName(key: string): string {
  return toPascalCase(key);
}

function generateGo(root: TypeNode): string {
  const objects: TypeNode[] = [];
  collectObjects(root, objects);

  return objects.map((obj) => {
    if (obj.kind !== 'object') return '';
    const lines = obj.fields.map((f) => {
      const fieldName = goFieldName(f.key);
      const typ = goType(f.node, f.nullable);
      const tag = `\`json:"${f.key}${f.nullable ? ',omitempty' : ''}"\``;
      return `\t${fieldName} ${typ} ${tag}`;
    });
    return `type ${obj.name} struct {\n${lines.join('\n')}\n}`;
  }).join('\n\n');
}

// ─── Rust generator ───────────────────────────────────────────────────────────

function rustType(node: TypeNode, nullable: boolean): string {
  if (node.kind === 'primitive') {
    if (node.type === 'string') return nullable ? 'Option<String>' : 'String';
    if (node.type === 'number') return nullable ? 'Option<f64>' : 'f64';
    if (node.type === 'boolean') return nullable ? 'Option<bool>' : 'bool';
    if (node.type === 'null') return 'serde_json::Value';
    return 'serde_json::Value';
  }
  if (node.kind === 'array') return nullable ? `Option<Vec<${rustType(node.element, false)}>>` : `Vec<${rustType(node.element, false)}>`;
  if (node.kind === 'object') return nullable ? `Option<${node.name}>` : node.name;
  return 'serde_json::Value';
}

function toSnakeCase(s: string): string {
  return s.replace(/([A-Z])/g, '_$1').replace(/[-\s]+/g, '_').toLowerCase().replace(/^_/, '');
}

function generateRust(root: TypeNode): string {
  const objects: TypeNode[] = [];
  collectObjects(root, objects);

  return objects.map((obj) => {
    if (obj.kind !== 'object') return '';
    const lines = obj.fields.map((f) => {
      const snakeKey = toSnakeCase(f.key);
      const typ = rustType(f.node, f.nullable);
      const rename = snakeKey !== f.key ? `    #[serde(rename = "${f.key}")]\n` : '';
      return `${rename}    pub ${snakeKey}: ${typ},`;
    });
    return `#[derive(Debug, Clone, Serialize, Deserialize)]\npub struct ${obj.name} {\n${lines.join('\n')}\n}`;
  }).join('\n\n');
}

// ─── component ────────────────────────────────────────────────────────────────

const EXAMPLES = [
  {
    label: 'User object',
    json: `{
  "id": 1,
  "name": "Alice",
  "email": "alice@example.com",
  "age": 30,
  "active": true,
  "avatar": null,
  "address": {
    "street": "123 Main St",
    "city": "Springfield",
    "zip": "12345"
  },
  "tags": ["admin", "user"]
}`,
  },
  {
    label: 'API response',
    json: `{
  "status": "ok",
  "page": 1,
  "total": 100,
  "data": [
    { "id": 1, "title": "Post one", "published": true },
    { "id": 2, "title": "Post two", "published": false }
  ]
}`,
  },
];

export default function JsonToTypePage() {
  const [input, setInput] = useState('');
  const [lang, setLang] = useState<Lang>('typescript');
  const [rootName, setRootName] = useState('Root');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const convert = (json: string, l: Lang, name: string) => {
    generatedNames.clear();
    try {
      const parsed = JSON.parse(json) as JSONValue;
      const root = inferNode(parsed, name || 'Root');
      let result: string;
      if (l === 'typescript') result = generateTS(root);
      else if (l === 'go') result = generateGo(root);
      else result = generateRust(root);
      setOutput(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid JSON');
      setOutput('');
    }
  };

  const handleConvert = () => convert(input, lang, rootName);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const langs: { label: string; value: Lang; ext: string }[] = [
    { label: 'TypeScript', value: 'typescript', ext: '.ts' },
    { label: 'Go', value: 'go', ext: '.go' },
    { label: 'Rust', value: 'rust', ext: '.rs' },
  ];

  return (
    <div className='h-full flex flex-col'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>JSON → Type Struct</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Convert JSON payloads to TypeScript interfaces, Go structs, or Rust structs</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-5xl mx-auto space-y-4'>

          {/* Config row */}
          <Card>
            <CardContent className='pt-6 space-y-4'>
              <div className='flex flex-wrap gap-4 items-end'>
                <div className='flex-1 min-w-40'>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Target Language</label>
                  <div className='flex gap-2'>
                    {langs.map((l) => (
                      <Button key={l.value} size='sm' variant={lang === l.value ? 'default' : 'outline'}
                        onClick={() => { setLang(l.value); if (output) convert(input, l.value, rootName); }}>
                        {l.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Root Type Name</label>
                  <input
                    value={rootName}
                    onChange={(e) => setRootName(e.target.value)}
                    className='h-9 px-3 rounded-md border border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] text-gray-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 w-32'
                    placeholder='Root'
                  />
                </div>
              </div>

              {/* Quick examples */}
              <div>
                <p className='text-xs text-gray-500 mb-2'>Quick examples</p>
                <div className='flex gap-2'>
                  {EXAMPLES.map((ex) => (
                    <button key={ex.label} onClick={() => setInput(ex.json)}
                      className='text-xs px-3 py-1.5 rounded border border-[hsla(0,0%,20%,1)] bg-[#121212] hover:bg-[#222] text-gray-300 transition-colors'>
                      {ex.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* I/O */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
            <Card>
              <CardContent className='pt-6 space-y-3'>
                <label className='block text-sm font-medium text-gray-300'>JSON Input</label>
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder='Paste JSON here…'
                  rows={18}
                  className='font-mono text-xs'
                />
                <Button onClick={handleConvert} disabled={!input.trim()} className='w-full'>
                  <Braces className='w-4 h-4 mr-2' />
                  Generate Types
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className='pt-6 space-y-3'>
                <div className='flex items-center justify-between'>
                  <label className='block text-sm font-medium text-gray-300'>
                    {langs.find((l) => l.value === lang)?.label} Output
                  </label>
                  {output && (
                    <Button variant='outline' size='sm' onClick={handleCopy}>
                      {copied ? <><Check className='w-3 h-3 mr-1' />Copied</> : <><Copy className='w-3 h-3 mr-1' />Copy</>}
                    </Button>
                  )}
                </div>
                {error && (
                  <div className='flex items-start gap-2 text-red-400 text-sm'>
                    <AlertCircle className='w-4 h-4 shrink-0 mt-0.5' />
                    <span>{error}</span>
                  </div>
                )}
                <pre className='min-h-64 bg-[#121212] rounded-md p-4 font-mono text-xs text-gray-300 overflow-auto whitespace-pre'>
                  {output || <span className='text-gray-600'>Output will appear here…</span>}
                </pre>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
