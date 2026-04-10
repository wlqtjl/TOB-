# ── Stage 1: Build Rust headless binary ──────────────────────────────────────
FROM rust:1.78-bookworm AS rust-builder

WORKDIR /build
COPY Cargo.toml Cargo.lock ./
COPY crates/ crates/

# Build release binary (headless simulation server)
RUN cargo build -p omni-sim-headless --release \
    && strip target/release/omni-sim-headless

# ── Stage 2: Build Web Console ───────────────────────────────────────────────
FROM node:20-bookworm-slim AS web-builder

WORKDIR /build/web-console
COPY web-console/package.json web-console/package-lock.json ./
RUN npm ci --ignore-scripts
COPY web-console/ ./
RUN npm run build

# ── Stage 3: Final runtime image ────────────────────────────────────────────
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates nginx-light \
    && rm -rf /var/lib/apt/lists/*

# Copy headless simulation binary
COPY --from=rust-builder /build/target/release/omni-sim-headless /usr/local/bin/omni-sim-headless

# Copy vendor packs
COPY vendor/ /opt/omni-sim/vendor/

# Copy web console static files
COPY --from=web-builder /build/web-console/dist/ /var/www/html/

# Copy nginx config
COPY deploy/nginx.conf /etc/nginx/sites-enabled/default

# Copy entrypoint
COPY deploy/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000 9001

ENTRYPOINT ["/entrypoint.sh"]
CMD ["--opdl", "/opt/omni-sim/vendor/smartx/smartx.opdl.json", "--ticks", "100000"]
