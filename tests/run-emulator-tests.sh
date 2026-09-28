#!/usr/bin/env bash
# ==============================================================================
# Unified Security Rules Unit Test Launcher & Local Emulator Setup
# ==============================================================================
set -euo pipefail

echo "=========================================================="
echo " NoSQL ERP Security Rules local verification engine"
echo "=========================================================="

# Check for node dependencies
if [ ! -d "node_modules" ]; then
  echo "Installing root npm packages..."
  npm install
fi

# Ensure testing packages are configured locally
# Requirements: mocha, chai, @firebase/rules-unit-testing
if ! npm list @firebase/rules-unit-testing >/dev/null 2>&1; then
  echo "Adding local rules-unit-testing harness packages..."
  npm install -D mocha chai @firebase/rules-unit-testing ts-node firebase-tools
fi

# Check if firebase emulator is installed
if ! command -v firebase &> /dev/null; then
  echo "Notice: firebase-tools global utility is not in PATH."
  echo "Executing local project CLI wrapper instead..."
  alias firebase="npx firebase"
fi

echo "Spinning up Firebase Local Emulator Suite (Firestore only) & running tests..."
echo "----------------------------------------------------------"

# Runs firebase emulator in execution mode, starting firestore on port 8080,
# executing the mocha runner, then performing complete automatic cleanup teardown!
npx firebase emulators:exec --only firestore "npx mocha tests/firestore.test.js --exit"

echo "----------------------------------------------------------"
echo "✓ Security rules tests complete. All roles evaluated perfectly!"
echo "=========================================================="
