#!/bin/bash

echo "=== EAS Build Pre-Install Hook ==="
echo "Current directory: $(pwd)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo ""
echo "=== Checking assets directory ==="
ls -la assets/
echo ""
echo "=== Checking for image files ==="
find assets -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.ico" | head -20
echo ""
echo "=== Environment variables ==="
env | grep -E "(EXPO|EAS|NODE)" | sort
echo "=== End of pre-install hook ===" 