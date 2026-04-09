//! Criterion benchmarks (§6.2, §11 SLA targets).
//!
//! Run:  cargo bench -p omni-sim-core
//! SLA:  1k entities < 0.5ms  |  100k entities < 2ms  (Phase 1 / Phase 3)

use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion};
use omni_sim_core::SimulationCore;

fn generate_opdl(n: usize) -> String {
    let entities: Vec<String> = (0..n)
        .map(|i| {
            format!(
                r#"{{"id":"node-{i:06}","entity_type":"Server",
               "components":{{"cpu":0.2,"memory":0.3,"cpu_cores":8}},
               "behaviors":{{"cpu_growth_rate":0.01,"burst_threshold":0.9}}}}"#
            )
        })
        .collect();
    format!(
        r#"{{"version":"1.0","pack_id":"bench","entities":[{}]}}"#,
        entities.join(",")
    )
}

fn bench_tick(c: &mut Criterion) {
    let mut group = c.benchmark_group("tick");

    for size in [100usize, 1_000, 10_000, 100_000] {
        let opdl = generate_opdl(size);
        let mut core = SimulationCore::from_opdl(&opdl)
            .unwrap_or_else(|e| panic!("failed to create {size}-entity world: {e}"));

        group.bench_with_input(BenchmarkId::new("entities", size), &size, |b, _| {
            b.iter(|| core.update(black_box(0.016)))
        });
    }
    group.finish();
}

fn bench_hash(c: &mut Criterion) {
    let opdl = generate_opdl(1_000);
    let mut core = SimulationCore::from_opdl(&opdl).unwrap();
    for _ in 0..100 {
        core.update(0.016);
    }

    c.bench_function("state_hash_1k", |b| b.iter(|| black_box(core.state_hash())));
}

fn bench_opdl_compile(c: &mut Criterion) {
    let opdl_1k = generate_opdl(1_000);
    c.bench_function("opdl_compile_1k", |b| {
        b.iter(|| SimulationCore::from_opdl(black_box(&opdl_1k)).unwrap())
    });
}

criterion_group!(benches, bench_tick, bench_hash, bench_opdl_compile);
criterion_main!(benches);
