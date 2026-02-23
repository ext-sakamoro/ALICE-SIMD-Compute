-- SIMD Compute domain tables
create table if not exists public.compute_jobs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade,
    operation text not null check (operation in ('vector_add', 'vector_mul', 'vector_fma', 'dot_product', 'normalize', 'clamp', 'distance', 'lerp', 'matrix_multiply', 'matrix_transpose', 'matrix_determinant', 'matrix_inverse')),
    input_dimensions integer not null,
    element_count bigint not null,
    precision text default 'f32' check (precision in ('f32', 'f64', 'i32', 'i64')),
    simd_backend text,
    compute_time_us bigint,
    throughput_gflops double precision,
    status text default 'pending',
    results jsonb default '{}',
    created_at timestamptz default now()
);
create table if not exists public.compute_benchmarks (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade,
    name text not null,
    operations jsonb not null default '[]',
    cpu_features jsonb default '{}',
    scalar_time_us bigint,
    simd_time_us bigint,
    speedup_ratio double precision,
    peak_gflops double precision,
    created_at timestamptz default now()
);
create index idx_compute_jobs_user on public.compute_jobs(user_id);
create index idx_compute_jobs_op on public.compute_jobs(operation);
create index idx_compute_benchmarks_user on public.compute_benchmarks(user_id);
