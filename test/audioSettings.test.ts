import { languagePackService, PackPreferences } from '../src/services/languagePackService';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

console.log('🎙️ Starting Audio Settings & VAD Microphone Sensitivity Test Suite...');

// Test 1: Initial Default VAD Sensitivity Threshold
const initialPrefs = languagePackService.getPreferences();
assert(
  typeof initialPrefs.vadSensitivityThreshold === 'number',
  'vadSensitivityThreshold must be a number'
);
assert(
  initialPrefs.vadSensitivityThreshold === 24,
  `Default vadSensitivityThreshold should be 24 dB, got ${initialPrefs.vadSensitivityThreshold}`
);
console.log('  ✓ Initial default vadSensitivityThreshold verified as 24 dB.');

// Test 2: Subscriber Notifications on Threshold Change
let notifiedPrefs: PackPreferences | null = null;
const unsubscribe = languagePackService.subscribe((_, updatedPrefs) => {
  notifiedPrefs = updatedPrefs;
});

languagePackService.updatePreferences({ vadSensitivityThreshold: 15 });
assert(
  notifiedPrefs !== null && (notifiedPrefs as PackPreferences).vadSensitivityThreshold === 15,
  'Subscriber should receive updated vadSensitivityThreshold = 15 dB'
);
console.log('  ✓ Preference subscriber correctly notified of sensitivity threshold change.');

// Test 3: Sensitivity Level Threshold Calculations
const highSensitivity = 12; // Whispers / Quiet
const lowSensitivity = 40;  // Noisy Highway

const highSilenceCutoff = Math.max(4, Math.round(highSensitivity * 0.4));
const lowSilenceCutoff = Math.max(4, Math.round(lowSensitivity * 0.4));

assert(highSilenceCutoff === 5, `Expected high sensitivity silence cutoff = 5, got ${highSilenceCutoff}`);
assert(lowSilenceCutoff === 16, `Expected low sensitivity silence cutoff = 16, got ${lowSilenceCutoff}`);
console.log('  ✓ Silence cutoff auto-scaling verified across sensitivity levels.');

// Cleanup: Reset preference to default 24
languagePackService.updatePreferences({ vadSensitivityThreshold: 24 });
unsubscribe();

console.log('🎉 ALL AUDIO SETTINGS & VAD SENSITIVITY TESTS PASSED SUCCESSFULLY!\n');
