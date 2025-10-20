#!/bin/bash
# build-wasm.sh

set -e  # stop kalau ada error

echo "🦀 Building Rust WASM module..."

# Cek apakah wasm-pack sudah terpasang
if ! command -v wasm-pack &> /dev/null
then
    echo "⚙️ wasm-pack not found, installing..."
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
fi

cd src/wasm

# Build WASM package
wasm-pack build --target web --out-dir pkg --release

echo "✅ WASM build complete!"
echo "📦 Output: src/wasm/pkg/"

cd ../..

echo "🏗️ Building Vite frontend..."
npm run build-only
