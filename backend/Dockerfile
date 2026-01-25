FROM lukemathwalker/cargo-chef:latest-rust-1.91 AS planner
WORKDIR /app
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

FROM lukemathwalker/cargo-chef:latest-rust-1.91 AS builder
WORKDIR /app
COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json
COPY . .
RUN cargo build --release --bin backend

FROM debian:bookworm-slim AS runtime
WORKDIR /app

# 1. Instalacja curl i zależności
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl ca-certificates curl \
    && apt-get autoremove -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

# 2. Pobranie biblioteki ONNX Runtime
RUN curl -L https://github.com/microsoft/onnxruntime/releases/download/v1.8.1/onnxruntime-linux-x64-1.8.1.tgz -o onnxruntime.tgz \
    && tar -xzf onnxruntime.tgz \
    && mv onnxruntime-linux-x64-1.8.1/lib/libonnxruntime.so.1.8.1 /usr/lib/ \
    && ln -s /usr/lib/libonnxruntime.so.1.8.1 /usr/lib/libonnxruntime.so \
    && rm onnxruntime.tgz && rm -rf onnxruntime-linux-x64-1.8.1

# 3. Pobranie modelu AI
RUN curl -L https://github.com/onnx/models/raw/main/validated/vision/body_analysis/arcface/model/arcface-resnet100-8.onnx -o /app/arcface.onnx

COPY --from=builder /app/target/release/backend /usr/local/bin/app

ENTRYPOINT ["/usr/local/bin/app"]