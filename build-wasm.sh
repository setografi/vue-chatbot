#!/bin/bash
# build-wasm.sh

set -e

if [ -d "src/wasm/pkg" ]; then
  echo "✅ Skipping WASM build (pkg/ already exists)"
else
  echo "🦀 Building Rust WASM module..."
  cd src/wasm
  npx wasm-pack build --target web --out-dir pkg --release
  cd ../..
  echo "✅ WASM build complete!"
fi

echo "🏗️ Building Vite frontend..."
npm run build-only
