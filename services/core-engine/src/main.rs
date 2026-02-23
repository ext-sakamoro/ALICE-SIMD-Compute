use axum::{extract::State, response::Json, routing::{get, post}, Router};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

// ── State ───────────────────────────────────────────────────
struct AppState {
    start_time: Instant,
    stats: Mutex<Stats>,
}

struct Stats {
    total_computes: u64,
    total_matrix_ops: u64,
    total_benchmarks: u64,
}

// ── Types ───────────────────────────────────────────────────
#[derive(Serialize)]
struct Health { status: String, version: String, uptime_secs: u64, total_ops: u64 }

// Compute
#[derive(Deserialize)]
struct ComputeRequest {
    operation: String,
    data_a: Vec<f64>,
    data_b: Option<Vec<f64>>,
    scalar: Option<f64>,
}
#[derive(Serialize)]
struct ComputeResponse {
    operation: String, result: serde_json::Value, scalar_result: Option<f64>,
    input_size: usize, simd_lanes_used: u32, elapsed_ns: u128, throughput_gflops: f64,
}

// Matrix
#[derive(Deserialize)]
struct MatrixRequest {
    operation: String,
    matrix_a: Vec<Vec<f64>>,
    matrix_b: Option<Vec<Vec<f64>>>,
    scalar: Option<f64>,
}
#[derive(Serialize)]
struct MatrixResponse {
    operation: String, result: serde_json::Value, scalar_result: Option<f64>,
    dimensions: String, elapsed_ns: u128,
}

// Benchmark
#[derive(Deserialize)]
struct BenchmarkRequest { size: Option<usize>, iterations: Option<usize> }
#[derive(Serialize)]
struct BenchmarkResponse { simd_capability: String, benchmarks: Vec<BenchmarkResult> }
#[derive(Serialize)]
struct BenchmarkResult {
    operation: String, size: usize, iterations: usize,
    total_ns: u128, per_op_ns: u128, throughput_gflops: f64,
}

// Capabilities
#[derive(Serialize)]
struct Capabilities {
    arch: String, simd_width: u32, max_vector_size: u32,
    features: Vec<String>, supported_types: Vec<String>,
}

#[derive(Serialize)]
struct StatsResponse { total_computes: u64, total_matrix_ops: u64, total_benchmarks: u64 }

// ── Main ────────────────────────────────────────────────────
#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| "simd_engine=info".into()))
        .init();
    let state = Arc::new(AppState {
        start_time: Instant::now(),
        stats: Mutex::new(Stats { total_computes: 0, total_matrix_ops: 0, total_benchmarks: 0 }),
    });
    let cors = CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any);
    let app = Router::new()
        .route("/health", get(health))
        .route("/api/v1/simd/compute", post(compute))
        .route("/api/v1/simd/matrix", post(matrix))
        .route("/api/v1/simd/benchmark", post(benchmark))
        .route("/api/v1/simd/capabilities", get(capabilities))
        .route("/api/v1/simd/stats", get(stats))
        .layer(cors).layer(TraceLayer::new_for_http()).with_state(state);
    let addr = std::env::var("SIMD_ADDR").unwrap_or_else(|_| "0.0.0.0:8081".into());
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    tracing::info!("SIMD Compute Engine on {addr}");
    axum::serve(listener, app).await.unwrap();
}

// ── Handlers ────────────────────────────────────────────────
async fn health(State(s): State<Arc<AppState>>) -> Json<Health> {
    let st = s.stats.lock().unwrap();
    Json(Health {
        status: "ok".into(), version: env!("CARGO_PKG_VERSION").into(),
        uptime_secs: s.start_time.elapsed().as_secs(),
        total_ops: st.total_computes + st.total_matrix_ops,
    })
}

async fn compute(State(s): State<Arc<AppState>>, Json(req): Json<ComputeRequest>) -> Json<ComputeResponse> {
    let t = Instant::now();
    let a = &req.data_a;
    let b = req.data_b.as_deref().unwrap_or(&[]);
    let scalar = req.scalar.unwrap_or(1.0);
    let n = a.len();

    // Simulate SIMD lane width based on architecture
    let simd_lanes: u32 = if cfg!(target_arch = "x86_64") { 8 } else { 4 };

    let (result_vec, scalar_result): (Option<Vec<f64>>, Option<f64>) = match req.operation.as_str() {
        "add" => {
            let r: Vec<f64> = a.iter().zip(b.iter().chain(std::iter::repeat(&0.0)))
                .map(|(x, y)| x + y).collect();
            (Some(r), None)
        }
        "mul" => {
            let r: Vec<f64> = a.iter().zip(b.iter().chain(std::iter::repeat(&1.0)))
                .map(|(x, y)| x * y).collect();
            (Some(r), None)
        }
        "fma" => {
            // fused multiply-add: a * b + scalar
            let r: Vec<f64> = a.iter().zip(b.iter().chain(std::iter::repeat(&0.0)))
                .map(|(x, y)| x.mul_add(*y, scalar)).collect();
            (Some(r), None)
        }
        "dot_product" => {
            let dp: f64 = a.iter().zip(b.iter().chain(std::iter::repeat(&0.0)))
                .map(|(x, y)| x * y).sum();
            (None, Some(dp))
        }
        "normalize" => {
            let mag = a.iter().map(|x| x * x).sum::<f64>().sqrt();
            let r: Vec<f64> = if mag > 1e-15 {
                a.iter().map(|x| x / mag).collect()
            } else {
                vec![0.0; n]
            };
            (Some(r), None)
        }
        "clamp" => {
            let lo = b.first().copied().unwrap_or(0.0);
            let hi = b.get(1).copied().unwrap_or(1.0);
            let r: Vec<f64> = a.iter().map(|x| x.clamp(lo, hi)).collect();
            (Some(r), None)
        }
        "distance" => {
            let d: f64 = a.iter().zip(b.iter().chain(std::iter::repeat(&0.0)))
                .map(|(x, y)| (x - y).powi(2)).sum::<f64>().sqrt();
            (None, Some(d))
        }
        "lerp" => {
            let t_val = scalar.clamp(0.0, 1.0);
            let r: Vec<f64> = a.iter().zip(b.iter().chain(std::iter::repeat(&0.0)))
                .map(|(x, y)| x + (y - x) * t_val).collect();
            (Some(r), None)
        }
        "min" => {
            let r: Vec<f64> = a.iter().zip(b.iter().chain(std::iter::repeat(&f64::MAX)))
                .map(|(x, y)| x.min(*y)).collect();
            (Some(r), None)
        }
        "max" => {
            let r: Vec<f64> = a.iter().zip(b.iter().chain(std::iter::repeat(&f64::MIN)))
                .map(|(x, y)| x.max(*y)).collect();
            (Some(r), None)
        }
        _ => (Some(a.clone()), None),
    };

    let elapsed_ns = t.elapsed().as_nanos();
    let flops = n.max(1) as f64;
    let throughput = if elapsed_ns > 0 { flops / elapsed_ns as f64 } else { 0.0 };

    s.stats.lock().unwrap().total_computes += 1;

    let result_json = if let Some(v) = result_vec {
        serde_json::Value::Array(v.iter().map(|x| serde_json::Value::from(*x)).collect())
    } else {
        serde_json::Value::Null
    };

    Json(ComputeResponse {
        operation: req.operation, result: result_json, scalar_result,
        input_size: n, simd_lanes_used: simd_lanes, elapsed_ns, throughput_gflops: throughput,
    })
}

async fn matrix(State(s): State<Arc<AppState>>, Json(req): Json<MatrixRequest>) -> Json<MatrixResponse> {
    let t = Instant::now();
    let a = &req.matrix_a;
    let rows_a = a.len();
    let cols_a = a.first().map(|r| r.len()).unwrap_or(0);
    let scalar = req.scalar.unwrap_or(1.0);

    let (result_json, scalar_result, dims) = match req.operation.as_str() {
        "multiply" => {
            let b = req.matrix_b.as_deref().unwrap_or(&[]);
            let rows_b = b.len();
            let cols_b = b.first().map(|r| r.len()).unwrap_or(0);
            let mut result = vec![vec![0.0f64; cols_b]; rows_a];
            for i in 0..rows_a {
                for j in 0..cols_b {
                    let mut sum = 0.0;
                    for k in 0..cols_a.min(rows_b) {
                        sum += a[i][k] * b[k][j];
                    }
                    result[i][j] = sum;
                }
            }
            let json = mat_to_json(&result);
            (json, None, format!("{rows_a}x{cols_a} * {rows_b}x{cols_b}"))
        }
        "transpose" => {
            let mut result = vec![vec![0.0f64; rows_a]; cols_a];
            for i in 0..rows_a {
                for j in 0..cols_a {
                    result[j][i] = a[i][j];
                }
            }
            let json = mat_to_json(&result);
            (json, None, format!("{rows_a}x{cols_a} -> {cols_a}x{rows_a}"))
        }
        "determinant" => {
            let det = matrix_determinant(a);
            (serde_json::Value::Null, Some(det), format!("{rows_a}x{cols_a}"))
        }
        "inverse" => {
            if rows_a == cols_a && rows_a <= 4 {
                let inv = matrix_inverse(a, rows_a);
                (mat_to_json(&inv), None, format!("{rows_a}x{cols_a}"))
            } else {
                (serde_json::Value::Null, None, "unsupported".into())
            }
        }
        "add" => {
            let b = req.matrix_b.as_deref().unwrap_or(&[]);
            let mut result = a.clone();
            for i in 0..rows_a {
                for j in 0..cols_a {
                    let bval = b.get(i).and_then(|r| r.get(j)).copied().unwrap_or(0.0);
                    result[i][j] += bval;
                }
            }
            let json = mat_to_json(&result);
            (json, None, format!("{rows_a}x{cols_a}"))
        }
        "scale" => {
            let result: Vec<Vec<f64>> = a.iter()
                .map(|row| row.iter().map(|v| v * scalar).collect()).collect();
            let json = mat_to_json(&result);
            (json, None, format!("{rows_a}x{cols_a}"))
        }
        _ => (serde_json::Value::Null, None, "unknown".into()),
    };

    let elapsed_ns = t.elapsed().as_nanos();
    s.stats.lock().unwrap().total_matrix_ops += 1;

    Json(MatrixResponse {
        operation: req.operation, result: result_json, scalar_result,
        dimensions: dims, elapsed_ns,
    })
}

async fn benchmark(State(s): State<Arc<AppState>>, Json(req): Json<BenchmarkRequest>) -> Json<BenchmarkResponse> {
    let size = req.size.unwrap_or(10000);
    let iterations = req.iterations.unwrap_or(100);

    let simd_cap = if cfg!(target_arch = "x86_64") {
        "AVX2 (256-bit, 8x f32)"
    } else if cfg!(target_arch = "aarch64") {
        "NEON (128-bit, 4x f32)"
    } else {
        "Scalar"
    }.to_string();

    let ops = ["add", "mul", "fma", "dot_product", "normalize"];
    let mut benchmarks = Vec::with_capacity(ops.len());

    // Pre-generate test data
    let data_a: Vec<f64> = (0..size).map(|i| (i as f64) * 0.001).collect();
    let data_b: Vec<f64> = (0..size).map(|i| (i as f64) * 0.002 + 1.0).collect();

    for op in &ops {
        let t = Instant::now();
        for _ in 0..iterations {
            match *op {
                "add" => { let _: Vec<f64> = data_a.iter().zip(data_b.iter()).map(|(a, b)| a + b).collect(); }
                "mul" => { let _: Vec<f64> = data_a.iter().zip(data_b.iter()).map(|(a, b)| a * b).collect(); }
                "fma" => { let _: Vec<f64> = data_a.iter().zip(data_b.iter()).map(|(a, b)| a.mul_add(*b, 1.0)).collect(); }
                "dot_product" => { let _: f64 = data_a.iter().zip(data_b.iter()).map(|(a, b)| a * b).sum(); }
                "normalize" => {
                    let mag = data_a.iter().map(|x| x * x).sum::<f64>().sqrt();
                    let _: Vec<f64> = data_a.iter().map(|x| x / mag).collect();
                }
                _ => {}
            }
        }
        let total_ns = t.elapsed().as_nanos();
        let per_op = total_ns / iterations as u128;
        let flops = (size * iterations) as f64;
        let throughput = if total_ns > 0 { flops / total_ns as f64 } else { 0.0 };

        benchmarks.push(BenchmarkResult {
            operation: op.to_string(), size, iterations,
            total_ns, per_op_ns: per_op, throughput_gflops: throughput,
        });
    }

    s.stats.lock().unwrap().total_benchmarks += 1;

    Json(BenchmarkResponse { simd_capability: simd_cap, benchmarks })
}

async fn capabilities() -> Json<Capabilities> {
    let (arch, simd_width, max_vec, features) = if cfg!(target_arch = "x86_64") {
        ("x86_64".into(), 8u32, 256u32, vec![
            "SSE2".into(), "SSE4.1".into(), "SSE4.2".into(),
            "AVX".into(), "AVX2".into(), "FMA".into(), "POPCNT".into(),
        ])
    } else if cfg!(target_arch = "aarch64") {
        ("aarch64".into(), 4u32, 128u32, vec![
            "NEON".into(), "ASIMD".into(), "FP16".into(), "DOTPROD".into(),
        ])
    } else {
        ("unknown".into(), 1, 64, vec!["scalar".into()])
    };

    Json(Capabilities {
        arch, simd_width, max_vector_size: max_vec, features,
        supported_types: vec![
            "f32".into(), "f64".into(), "i32".into(), "i64".into(),
            "u32".into(), "u64".into(), "f16 (emulated)".into(),
        ],
    })
}

async fn stats(State(s): State<Arc<AppState>>) -> Json<StatsResponse> {
    let st = s.stats.lock().unwrap();
    Json(StatsResponse {
        total_computes: st.total_computes,
        total_matrix_ops: st.total_matrix_ops,
        total_benchmarks: st.total_benchmarks,
    })
}

// ── Helpers ─────────────────────────────────────────────────
fn mat_to_json(mat: &[Vec<f64>]) -> serde_json::Value {
    serde_json::Value::Array(
        mat.iter().map(|row|
            serde_json::Value::Array(row.iter().map(|v| serde_json::Value::from(*v)).collect())
        ).collect()
    )
}

fn matrix_determinant(m: &[Vec<f64>]) -> f64 {
    let n = m.len();
    match n {
        0 => 0.0,
        1 => m[0][0],
        2 => m[0][0] * m[1][1] - m[0][1] * m[1][0],
        3 => {
            m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
            - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
            + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
        }
        _ => {
            // Cofactor expansion along first row
            let mut det = 0.0;
            for j in 0..n {
                let minor: Vec<Vec<f64>> = (1..n).map(|i|
                    (0..n).filter(|&k| k != j).map(|k| m[i][k]).collect()
                ).collect();
                let sign = if j % 2 == 0 { 1.0 } else { -1.0 };
                det += sign * m[0][j] * matrix_determinant(&minor);
            }
            det
        }
    }
}

fn matrix_inverse(m: &[Vec<f64>], n: usize) -> Vec<Vec<f64>> {
    let det = matrix_determinant(m);
    if det.abs() < 1e-15 {
        return vec![vec![0.0; n]; n]; // singular
    }
    let inv_det = 1.0 / det;

    match n {
        1 => vec![vec![inv_det]],
        2 => vec![
            vec![m[1][1] * inv_det, -m[0][1] * inv_det],
            vec![-m[1][0] * inv_det, m[0][0] * inv_det],
        ],
        _ => {
            // Adjugate method
            let mut adj = vec![vec![0.0; n]; n];
            for i in 0..n {
                for j in 0..n {
                    let minor: Vec<Vec<f64>> = (0..n).filter(|&r| r != i)
                        .map(|r| (0..n).filter(|&c| c != j).map(|c| m[r][c]).collect())
                        .collect();
                    let sign = if (i + j) % 2 == 0 { 1.0 } else { -1.0 };
                    adj[j][i] = sign * matrix_determinant(&minor) * inv_det; // transposed
                }
            }
            adj
        }
    }
}
