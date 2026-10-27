/**
 * Check AI connection — makes one real call to verify the Gemini API key.
 * Run: npm run check:ai
 * Never prints the key.
 */

async function main() {
  const { env } = await import('../src/config/env.js');

  if (!env.GEMINI_API_KEY) {
    console.log('⚠️  GEMINI_API_KEY is not set. AI features will be disabled.');
    process.exit(0);
  }

  console.log(`\nChecking Gemini AI connection...`);
  console.log(`Model: ${env.GEMINI_MODEL}`);

  const { testAiConnection } = await import('../src/services/aiService.js');
  const result = await testAiConnection();

  if (result.success) {
    console.log(`\n✅ AI connection successful`);
    console.log(`   Model: ${result.model}`);
  } else {
    console.error(`\n❌ AI connection failed`);
    console.error(`   Error: ${result.error}`);
    console.error(`   Model: ${result.model}`);
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('check:ai failed:', err.message);
  process.exit(1);
});
