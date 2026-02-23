# ALICE SIMD Compute

Hardware-native SIMD vector compute engine — AVX2/NEON accelerated vector math, matrix operations, and micro-benchmarking via REST API.

**License: AGPL-3.0**

---

## Architecture

```
                    ┌─────────────────┐
                    │   Browser / UI  │
                    │  Next.js :3000  │
                    └────────┬────────┘
                             │ HTTP
                    ┌────────▼────────┐
                    │   API Gateway   │
                    │     :8080       │
                    └────────┬────────┘
                             │ HTTP
                    ┌────────▼────────┐
                    │   SIMD Engine   │
                    │  Rust/Axum      │
                    │    :8081        │
                    └─────────────────┘
```

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | Next.js dashboard |
| API Gateway | 8080 | Reverse proxy / auth |
| SIMD Engine | 8081 | Rust/Axum core engine |

---

## API Endpoints

### POST /api/v1/simd/compute

Execute a SIMD vector operation.

**Request:**
```json
{
  "operation": "dot_product",
  "data_a": [1.0, 2.0, 3.0, 4.0],
  "data_b": [5.0, 6.0, 7.0, 8.0],
  "scalar": 1.0
}
```

**Response:**
```json
{
  "operation": "dot_product",
  "result": null,
  "scalar_result": 70.0,
  "input_size": 4,
  "simd_lanes_used": 8,
  "elapsed_ns": 250,
  "throughput_gflops": 0.016
}
```

**Supported operations:**

| Operation | Description | Returns |
|-----------|-------------|---------|
| add | Element-wise A + B | vector |
| mul | Element-wise A * B | vector |
| fma | Fused multiply-add: A * B + scalar | vector |
| dot_product | Sum of A[i] * B[i] | scalar |
| normalize | A / |A| | vector |
| clamp | Clamp A to [B[0], B[1]] | vector |
| distance | Euclidean distance between A and B | scalar |
| lerp | Linear interpolation A + (B - A) * scalar | vector |
| min | Element-wise minimum | vector |
| max | Element-wise maximum | vector |

---

### POST /api/v1/simd/matrix

Execute a matrix operation.

**Request:**
```json
{
  "operation": "multiply",
  "matrix_a": [[1,0,0],[0,1,0],[0,0,1]],
  "matrix_b": [[2,0,0],[0,2,0],[0,0,2]],
  "scalar": 1.0
}
```

**Supported operations:**

| Operation | Description |
|-----------|-------------|
| multiply | Matrix multiplication A * B |
| transpose | Transpose of A |
| determinant | Determinant of A (returns scalar) |
| inverse | Inverse of A (up to 4x4) |
| add | Element-wise A + B |
| scale | A * scalar |

---

### POST /api/v1/simd/benchmark

Run micro-benchmarks for SIMD operations.

**Request:**
```json
{
  "size": 10000,
  "iterations": 100
}
```

**Response:**
```json
{
  "simd_capability": "AVX2 (256-bit, 8x f32)",
  "benchmarks": [
    {
      "operation": "add",
      "size": 10000,
      "iterations": 100,
      "total_ns": 1200000,
      "per_op_ns": 12000,
      "throughput_gflops": 0.833
    }
  ]
}
```

Benchmarked operations: add, mul, fma, dot_product, normalize

---

### GET /api/v1/simd/capabilities

Detect SIMD hardware capabilities.

**Response:**
```json
{
  "arch": "x86_64",
  "simd_width": 8,
  "max_vector_size": 256,
  "features": ["SSE2", "SSE4.1", "SSE4.2", "AVX", "AVX2", "FMA", "POPCNT"],
  "supported_types": ["f32", "f64", "i32", "i64", "u32", "u64", "f16 (emulated)"]
}
```

---

### GET /api/v1/simd/stats

Server-wide operation statistics.

---

### GET /health

Health check endpoint.

---

## Quick Start

### SIMD Engine (Rust)

```bash
cd services/core-engine
cargo build --release
SIMD_ADDR=0.0.0.0:8081 ./target/release/simd-engine
```

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SIMD_ADDR` | `0.0.0.0:8081` | Engine bind address |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | API base URL for frontend |

---

## License

AGPL-3.0 — See [LICENSE](LICENSE) for details.
