'use client';
import { useState } from 'react';
import { useSimdStore } from '@/lib/hooks/use-store';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
type Tab = 'compute' | 'matrix' | 'benchmark' | 'capabilities';
const OPS = ['add', 'mul', 'fma', 'dot_product', 'normalize', 'clamp', 'distance', 'lerp', 'min', 'max'];
const MATRIX_OPS = ['multiply', 'transpose', 'determinant', 'inverse', 'add', 'scale'];

export default function ConsolePage() {
  const [tab, setTab] = useState<Tab>('compute');
  const { operation, setOperation, dataA, setDataA, dataB, setDataB, scalar, setScalar, result, setResult, loading, setLoading } = useSimdStore();
  const [matOp, setMatOp] = useState('multiply');
  const [matA, setMatA] = useState('1,0,0\n0,1,0\n0,0,1');
  const [matB, setMatB] = useState('2,0,0\n0,2,0\n0,0,2');
  const [benchSize, setBenchSize] = useState('10000');
  const [benchIter, setBenchIter] = useState('100');

  const doFetch = async (path: string, body: unknown) => {
    setLoading(true); setResult(null);
    try {
      const r = await fetch(`${API}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': 'demo' }, body: JSON.stringify(body) });
      setResult(await r.json());
    } catch (e) { setResult({ error: (e as Error).message }); } finally { setLoading(false); }
  };

  const doGet = async (path: string) => {
    setLoading(true); setResult(null);
    try {
      const r = await fetch(`${API}${path}`, { headers: { 'X-API-Key': 'demo' } });
      setResult(await r.json());
    } catch (e) { setResult({ error: (e as Error).message }); } finally { setLoading(false); }
  };

  const parseVec = (s: string) => s.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
  const parseMat = (s: string) => s.split('\n').filter(Boolean).map(row => row.split(',').map(v => parseFloat(v.trim())));

  const tabs: { key: Tab; label: string }[] = [
    { key: 'compute', label: 'Vector Compute' },
    { key: 'matrix', label: 'Matrix' },
    { key: 'benchmark', label: 'Benchmark' },
    { key: 'capabilities', label: 'Capabilities' },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">SIMD Compute Console</h1>
      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key); setResult(null); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'compute' && (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Operation</label>
            <div className="flex flex-wrap gap-2">
              {OPS.map((o) => (
                <button key={o} onClick={() => setOperation(o)}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium ${operation === o ? 'bg-orange-600 text-white' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>{o}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground block mb-1">Data A (comma-separated)</label>
              <input value={dataA} onChange={(e) => setDataA(e.target.value)} className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm font-mono" /></div>
            <div><label className="text-xs font-medium text-muted-foreground block mb-1">Data B (comma-separated)</label>
              <input value={dataB} onChange={(e) => setDataB(e.target.value)} className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm font-mono" /></div>
          </div>
          <div><label className="text-xs font-medium text-muted-foreground block mb-1">Scalar</label>
            <input value={scalar} onChange={(e) => setScalar(e.target.value)} className="w-full max-w-xs px-3 py-2 border border-input rounded-md bg-background text-sm font-mono" /></div>
          <button onClick={() => doFetch('/api/v1/simd/compute', { operation, data_a: parseVec(dataA), data_b: parseVec(dataB), scalar: +scalar })}
            disabled={loading} className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 disabled:opacity-50">
            {loading ? 'Computing...' : 'Compute'}
          </button>
          {result && !('error' in result) && (
            <div className="border border-border rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="Operation" value={String(result.operation ?? '-')} />
                <Stat label="Input Size" value={String(result.input_size ?? '-')} />
                <Stat label="SIMD Lanes" value={String(result.simd_lanes_used ?? '-')} accent />
                <Stat label="Throughput" value={`${Number(result.throughput_gflops ?? 0).toFixed(3)} GFLOPS`} accent />
                <Stat label="Time" value={`${result.elapsed_ns} ns`} />
                {result.scalar_result != null && <Stat label="Scalar Result" value={Number(result.scalar_result).toFixed(6)} accent />}
              </div>
              {Array.isArray(result.result) && (
                <div><h4 className="text-xs font-semibold text-muted-foreground mb-1">Result Vector</h4>
                  <div className="flex flex-wrap gap-1">
                    {(result.result as number[]).map((v, i) => (
                      <span key={i} className="px-2 py-1 bg-muted rounded text-xs font-mono text-orange-400">{Number(v).toFixed(4)}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'matrix' && (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Operation</label>
            <div className="flex flex-wrap gap-2">
              {MATRIX_OPS.map((o) => (
                <button key={o} onClick={() => setMatOp(o)}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium ${matOp === o ? 'bg-orange-600 text-white' : 'bg-muted text-muted-foreground'}`}>{o}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground block mb-1">Matrix A (row per line, comma-separated)</label>
              <textarea rows={4} value={matA} onChange={(e) => setMatA(e.target.value)} className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm font-mono resize-none" /></div>
            <div><label className="text-xs font-medium text-muted-foreground block mb-1">Matrix B</label>
              <textarea rows={4} value={matB} onChange={(e) => setMatB(e.target.value)} className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm font-mono resize-none" /></div>
          </div>
          <button onClick={() => doFetch('/api/v1/simd/matrix', { operation: matOp, matrix_a: parseMat(matA), matrix_b: parseMat(matB), scalar: +scalar })}
            disabled={loading} className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 disabled:opacity-50">
            {loading ? 'Computing...' : 'Compute Matrix'}
          </button>
          {result && !('error' in result) && (
            <div className="border border-border rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Operation" value={String(result.operation ?? '-')} />
                <Stat label="Dimensions" value={String(result.dimensions ?? '-')} />
                <Stat label="Time" value={`${result.elapsed_ns} ns`} />
              </div>
              {result.scalar_result != null && <Stat label="Scalar Result" value={Number(result.scalar_result).toFixed(6)} accent />}
              {Array.isArray(result.result) && (
                <div><h4 className="text-xs font-semibold text-muted-foreground mb-1">Result Matrix</h4>
                  <div className="space-y-1">
                    {(result.result as number[][]).map((row, i) => (
                      <div key={i} className="text-xs font-mono text-orange-400">[{row.map(v => Number(v).toFixed(4)).join(', ')}]</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'benchmark' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <div><label className="text-xs font-medium text-muted-foreground block mb-1">Vector Size</label>
              <input value={benchSize} onChange={(e) => setBenchSize(e.target.value)} className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm font-mono" /></div>
            <div><label className="text-xs font-medium text-muted-foreground block mb-1">Iterations</label>
              <input value={benchIter} onChange={(e) => setBenchIter(e.target.value)} className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm font-mono" /></div>
          </div>
          <button onClick={() => doFetch('/api/v1/simd/benchmark', { size: +benchSize, iterations: +benchIter })}
            disabled={loading} className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 disabled:opacity-50">
            {loading ? 'Benchmarking...' : 'Run Benchmark'}
          </button>
          {result && !('error' in result) && (
            <div className="border border-border rounded-lg p-4 space-y-3">
              {result.simd_capability && <Stat label="SIMD" value={String(result.simd_capability)} accent />}
              {Array.isArray(result.benchmarks) && (
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-muted-foreground border-b border-border">
                    <th className="py-1 pr-4">Operation</th><th className="py-1 pr-4">Size</th><th className="py-1 pr-4">Iterations</th><th className="py-1 pr-4">Per-Op</th><th className="py-1">GFLOPS</th>
                  </tr></thead>
                  <tbody>
                    {(result.benchmarks as Array<Record<string, unknown>>).map((b, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-1 pr-4 font-mono text-orange-400">{String(b.operation)}</td>
                        <td className="py-1 pr-4">{String(b.size)}</td>
                        <td className="py-1 pr-4">{String(b.iterations)}</td>
                        <td className="py-1 pr-4">{String(b.per_op_ns)} ns</td>
                        <td className="py-1 font-semibold text-orange-400">{Number(b.throughput_gflops).toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'capabilities' && (
        <div className="space-y-4">
          <button onClick={() => doGet('/api/v1/simd/capabilities')} disabled={loading}
            className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 disabled:opacity-50">
            {loading ? 'Loading...' : 'Detect Capabilities'}
          </button>
          {result && !('error' in result) && (
            <div className="border border-border rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="Architecture" value={String(result.arch ?? '-')} />
                <Stat label="SIMD Width" value={`${result.simd_width} lanes`} accent />
                <Stat label="Max Vector" value={`${result.max_vector_size} bytes`} />
              </div>
              {Array.isArray(result.features) && (
                <div><h4 className="text-xs font-semibold text-muted-foreground mb-1">CPU Features</h4>
                  <div className="flex flex-wrap gap-2">
                    {(result.features as string[]).map((f) => (
                      <span key={f} className="px-2 py-1 bg-orange-600/20 text-orange-400 rounded text-xs font-mono">{f}</span>
                    ))}
                  </div>
                </div>
              )}
              {Array.isArray(result.supported_types) && (
                <div><h4 className="text-xs font-semibold text-muted-foreground mb-1">Supported Types</h4>
                  <div className="flex flex-wrap gap-2">
                    {(result.supported_types as string[]).map((t) => (
                      <span key={t} className="px-2 py-1 bg-muted rounded text-xs font-mono">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {result && 'error' in result && <p className="text-sm text-red-500">{String(result.error)}</p>}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="px-3 py-2 bg-muted rounded-md">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold ${accent ? 'text-orange-400' : ''}`}>{value}</div>
    </div>
  );
}
