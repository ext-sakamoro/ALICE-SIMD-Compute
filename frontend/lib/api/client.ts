const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  health: () => request<{ status: string; version: string }>('/health'),
  compute: (body: { operation: string; data_a: number[]; data_b?: number[]; scalar?: number }) =>
    request('/api/v1/simd/compute', { method: 'POST', body: JSON.stringify(body) }),
  batch: (body: { operations: { operation: string; data_a: number[]; data_b?: number[] }[] }) =>
    request('/api/v1/simd/batch', { method: 'POST', body: JSON.stringify(body) }),
  matrix: (body: { operation: string; matrix_a: number[][]; matrix_b?: number[][] }) =>
    request('/api/v1/simd/matrix', { method: 'POST', body: JSON.stringify(body) }),
  benchmark: (body: { size?: number; iterations?: number }) =>
    request('/api/v1/simd/benchmark', { method: 'POST', body: JSON.stringify(body) }),
  capabilities: () => request('/api/v1/simd/capabilities'),
  stats: () => request('/api/v1/simd/stats'),
};
