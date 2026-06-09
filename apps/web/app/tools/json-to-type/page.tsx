'use client';

import React, { useState } from 'react';
import { BpCopyBtn } from '@/components/blueprint';
import { Braces, AlertCircle } from 'lucide-react';

// ─── types ────────────────────────────────────────────────────────────────────

type Lang = 'typescript' | 'go' | 'rust';

type TypeNode =
  | { kind: 'primitive'; type: 'string' | 'number' | 'boolean' | 'null' | 'any' }
  | { kind: 'optional'; inner: TypeNode }
  | { kind: 'array'; element: TypeNode }
  | { kind: 'object'; name: string; fields: Field[] };

interface Field { key: string; node: TypeNode; nullable: boolean; }

// ─── inference ────────────────────────────────────────────────────────────────

type JSONValue = string | number | boolean | null | JSONValue[] | { [k: string]: JSONValue };

const generatedNames = new Set<string>();

function toPascalCase(s: string): string {
  return s.replace(/[-_\s]+(.)/g, (_, c: string) => c.toUpperCase()).replace(/^(.)/, (c: string) => c.toUpperCase());
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
    const elementName = name.replace(/s$/i, '') || 'Item';
    const merged = mergeNodes(val.map((v) => inferNode(v as JSONValue, elementName)));
    return { kind: 'array', element: merged };
  }
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
  return { kind: 'primitive', type: 'any' };
}

function collectObjects(node: TypeNode, out: TypeNode[]): void {
  if (node.kind === 'object') { node.fields.forEach((f) => collectObjects(f.node, out)); out.push(node); }
  else if (node.kind === 'array') collectObjects(node.element, out);
  else if (node.kind === 'optional') collectObjects(node.inner, out);
}

function tsType(node: TypeNode, nullable: boolean): string {
  let base: string;
  if (node.kind === 'primitive') base = node.type === 'null' ? 'null' : node.type;
  else if (node.kind === 'array') base = `${tsType(node.element, false)}[]`;
  else if (node.kind === 'object') base = node.name;
  else base = `${tsType(node.inner, false)} | null`;
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

function goType(node: TypeNode, nullable: boolean): string {
  if (node.kind === 'primitive') {
    if (node.type === 'string') return nullable ? '*string' : 'string';
    if (node.type === 'number') return nullable ? '*float64' : 'float64';
    if (node.type === 'boolean') return nullable ? '*bool' : 'bool';
    return 'interface{}';
  }
  if (node.kind === 'array') return `[]${goType(node.element, false)}`;
  if (node.kind === 'object') return nullable ? `*${node.name}` : node.name;
  return 'interface{}';
}

function generateGo(root: TypeNode): string {
  const objects: TypeNode[] = [];
  collectObjects(root, objects);
  return objects.map((obj) => {
    if (obj.kind !== 'object') return '';
    const lines = obj.fields.map((f) => {
      const fieldName = toPascalCase(f.key);
      const typ = goType(f.node, f.nullable);
      const tag = `\`json:"${f.key}${f.nullable ? ',omitempty' : ''}"\``;
      return `\t${fieldName} ${typ} ${tag}`;
    });
    return `type ${obj.name} struct {\n${lines.join('\n')}\n}`;
  }).join('\n\n');
}

function toSnakeCase(s: string): string {
  return s.replace(/([A-Z])/g, '_$1').replace(/[-\s]+/g, '_').toLowerCase().replace(/^_/, '');
}

function rustType(node: TypeNode, nullable: boolean): string {
  if (node.kind === 'primitive') {
    if (node.type === 'string') return nullable ? 'Option<String>' : 'String';
    if (node.type === 'number') return nullable ? 'Option<f64>' : 'f64';
    if (node.type === 'boolean') return nullable ? 'Option<bool>' : 'bool';
    return 'serde_json::Value';
  }
  if (node.kind === 'array') return nullable ? `Option<Vec<${rustType(node.element, false)}>>` : `Vec<${rustType(node.element, false)}>`;
  if (node.kind === 'object') return nullable ? `Option<${node.name}>` : node.name;
  return 'serde_json::Value';
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

// ─── examples ─────────────────────────────────────────────────────────────────

const EXAMPLES = [
  { label: 'User object', json: `{\n  "id": 1,\n  "name": "Alice",\n  "email": "alice@example.com",\n  "age": 30,\n  "active": true,\n  "avatar": null,\n  "address": {\n    "street": "123 Main St",\n    "city": "Springfield",\n    "zip": "12345"\n  },\n  "tags": ["admin", "user"]\n}` },
  { label: 'API response', json: `{\n  "status": "ok",\n  "page": 1,\n  "total": 100,\n  "data": [\n    { "id": 1, "title": "Post one", "published": true },\n    { "id": 2, "title": "Post two", "published": false }\n  ]\n}` },
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
  '--bp-accent': '#c792ea',
} as React.CSSProperties;

// ─── local Panel component ────────────────────────────────────────────────────

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

export default function JsonToTypePage() {
  const [input, setInput] = useState('');
  const [lang, setLang] = useState<Lang>('typescript');
  const [rootName, setRootName] = useState('Root');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);

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

  const langs: { label: string; value: Lang }[] = [
    { label: 'TypeScript', value: 'typescript' },
    { label: 'Go', value: 'go' },
    { label: 'Rust', value: 'rust' },
  ];

  return (
    <div
      className='h-full flex flex-col overflow-hidden'
      data-cat='backend'
      style={{ ...CSS_VARS, fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', background: 'var(--bp-bg)', color: 'var(--bp-ink)' }}
    >
      {/* Header */}
      <div style={{ padding: '12px 20px 10px', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0 }}>
        <h1 style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0, marginBottom: 2 }}>JSON → Types</h1>
        <p style={{ fontSize: 11, color: 'var(--bp-ink-mute)', margin: 0 }}>Generate TypeScript, Go and Rust struct definitions from JSON</p>
      </div>

      {/* Settings bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 16px', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0, flexWrap: 'wrap' }}>
        {/* Language selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--bp-ink-mute)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Language</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {langs.map((l) => (
              <button
                key={l.value}
                type='button'
                onClick={() => { setLang(l.value); if (output) convert(input, l.value, rootName); }}
                style={{
                  padding: '3px 10px',
                  fontSize: 11,
                  fontFamily: 'inherit',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  border: '1px solid',
                  borderColor: lang === l.value ? 'var(--bp-accent)' : 'var(--bp-border-str)',
                  background: lang === l.value ? 'color-mix(in srgb, var(--bp-accent) 15%, transparent)' : 'transparent',
                  color: lang === l.value ? 'var(--bp-accent)' : 'var(--bp-ink-mute)',
                  cursor: 'pointer',
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Root name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--bp-ink-mute)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Root Name</span>
          <input
            value={rootName}
            onChange={(e) => setRootName(e.target.value)}
            placeholder='Root'
            style={{ background: 'var(--bp-bg)', border: '1px solid var(--bp-border-str)', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 12, padding: '3px 8px', outline: 'none', boxSizing: 'border-box', width: 96 }}
          />
        </div>

        {/* Quick examples */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--bp-ink-mute)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Examples</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                type='button'
                onClick={() => setInput(ex.json)}
                style={{
                  padding: '3px 10px',
                  fontSize: 11,
                  fontFamily: 'inherit',
                  border: '1px solid var(--bp-border-str)',
                  background: 'transparent',
                  color: 'var(--bp-ink-mute)',
                  cursor: 'pointer',
                }}
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content — 2-column split */}
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>
        {/* Left: JSON Input */}
        <Panel title='JSON Input' style={{ borderRight: 0, borderLeft: 0, borderBottom: 0, borderTop: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='Paste JSON here…'
              style={{ flex: 1, width: '100%', background: 'var(--bp-bg)', border: 0, color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 12, padding: '12px 14px', resize: 'none', outline: 'none', boxSizing: 'border-box', lineHeight: 1.65, minHeight: 200 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderTop: '1px dashed var(--bp-border-str)', flexShrink: 0 }}>
            <button
              type='button'
              className='bp-btn bp-btn-solid'
              onClick={handleConvert}
              disabled={!input.trim()}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Braces className='w-4 h-4' />
              GENERATE TYPES
            </button>
          </div>
        </Panel>

        {/* Right: Output */}
        <Panel
          title={`${langs.find((l) => l.value === lang)?.label ?? ''} Output`}
          style={{ borderLeft: '1px solid var(--bp-border)', borderRight: 0, borderBottom: 0, borderTop: 0 }}
        >
          {output && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '4px 10px', borderBottom: '1px solid var(--bp-border)', flexShrink: 0 }}>
              <BpCopyBtn text={output} label='COPY' />
            </div>
          )}
          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', color: '#f87171', fontSize: 12, flexShrink: 0 }}>
              <AlertCircle style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <pre style={{ margin: 0, padding: '12px 14px', fontFamily: 'inherit', fontSize: 12, color: 'var(--bp-ink)', lineHeight: 1.65, whiteSpace: 'pre' }}>
              {output || <span style={{ color: 'var(--bp-ink-faint)' }}>Output will appear here…</span>}
            </pre>
          </div>
        </Panel>
      </div>
    </div>
  );
}
