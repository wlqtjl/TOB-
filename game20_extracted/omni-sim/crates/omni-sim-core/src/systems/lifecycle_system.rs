/// Entity lifecycle management.
/// Phase 1: no-op stub.
/// Phase 2: process deferred despawn queues to avoid mid-tick iterator invalidation.
pub fn run_lifecycle(_world: &mut hecs::World, _delta: f32) {
    // TODO(phase2): drain despawn queue and remove entities safely.
}
