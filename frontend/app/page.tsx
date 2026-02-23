import Link from 'next/link';

const features = [
  { title: 'SIMD Vector Math', desc: 'AVX2 8-wide / NEON 4-wide vector operations via simple API' },
  { title: 'Matrix Operations', desc: 'Multiply, transpose, determinant, inverse with SIMD acceleration' },
  { title: 'Branchless Primitives', desc: 'Zero-branch select, clamp, min/max for predictable performance' },
  { title: 'Micro-Benchmarks', desc: 'Per-operation throughput measurement in GFLOPS' },
];

const operations = ['add', 'mul', 'fma', 'dot_product', 'normalize', 'clamp', 'distance', 'lerp', 'min', 'max'];

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">ALICE SIMD Compute</h1>
          <div className="flex gap-3">
            <Link href="/auth/login" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
            <Link href="/auth/register" className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90">Get Started</Link>
          </div>
        </div>
      </header>
      <main>
        <section className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h2 className="text-4xl font-bold mb-4">Hardware-Native Vector Compute</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">AVX2/NEON SIMD acceleration via REST API. Branchless math, batch processing, and real-time benchmarking for scientific computing and finance.</p>
          <Link href="/dashboard/console" className="px-6 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90">Launch Console</Link>
        </section>
        <section className="max-w-6xl mx-auto px-6 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((f) => (
              <div key={f.title} className="border border-border rounded-lg p-6">
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="max-w-6xl mx-auto px-6 pb-20">
          <h3 className="text-xl font-semibold mb-4 text-center">Supported Operations</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {operations.map((o) => <span key={o} className="px-4 py-2 bg-muted rounded-full text-sm font-mono">{o}</span>)}
          </div>
        </section>
      </main>
    </div>
  );
}
