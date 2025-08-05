#!/bin/bash
set -e

echo "🚀 Starting Firebase Emulator for rules testing..."
echo "📝 This will test the new database rules in isolation"
echo ""

# Kill any existing emulator processes
pkill -f "firebase emulators" || true

# Start emulator in background
firebase emulators:start --only database,functions &
EMULATOR_PID=$!

# Wait for emulator to start
echo "⏳ Waiting for emulator to start..."
sleep 5

# Run tests
echo ""
echo "🧪 Running database rules tests..."
echo ""
npx tsx scripts/test-database-rules.ts

# Kill emulator
kill $EMULATOR_PID 2>/dev/null || true

echo ""
echo "✅ Testing complete!"
