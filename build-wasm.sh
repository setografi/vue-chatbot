#!/bin/bash
# build-wasm.sh

set -e

echo "🦀 Building Rust WASM module..."

cd src/wasm

# Gunakan wasm-pack dari node_modules
npx wasm-pack build --target web --out-dir pkg --release

echo "✅ WASM build complete!"
echo "📦 Output: src/wasm/pkg/"

cd ../..

echo "🏗️ Building Vite frontend..."
npm run build-only
