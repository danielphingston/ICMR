import test from 'node:test';
import assert from 'node:assert/strict';
import { exportBackup, loadPatients, parseBackup, savePatients } from './storage.js';

function withStorage(run, initial = null) {
  const values = new Map(initial === null ? [] : [['nourish-patients-v1', initial]]);
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
  } });
  try { run(values); } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
}

const sample = [{ id: 'pt-1', name: 'Asha Rao', dateOfBirth: '1990-03-12', allergies: ['peanut'] }];

test('missing data loads as an empty patient list and saved data round-trips', () => {
  withStorage(() => {
    assert.deepEqual(loadPatients(), []);
    savePatients(sample);
    assert.deepEqual(loadPatients(), sample);
  });
});

test('invalid writes are rejected without replacing existing patient data', () => {
  withStorage((values) => {
    savePatients(sample);
    const before = values.get('nourish-patients-v1');
    assert.throws(() => savePatients([{ id: 'pt-2', name: '   ' }]), /nonblank string name/);
    assert.equal(values.get('nourish-patients-v1'), before);
  });
});

test('damaged saved data throws instead of silently returning an empty list', () => {
  withStorage(() => assert.throws(() => loadPatients(), /damaged/), '{');
});

test('backup export and import preserve the versioned patient payload', () => {
  const backup = exportBackup(sample);
  assert.deepEqual(parseBackup(backup), sample);
  assert.throws(() => parseBackup('{'), /valid JSON/);
  assert.throws(() => parseBackup(JSON.stringify({ format: 'nourish-patients', version: 8, patients: [] })), /Unsupported backup version/);
});

test('patient IDs and dates are validated', () => {
  assert.throws(() => savePatients([{ name: 'Asha' }]), /string id/);
  assert.throws(() => exportBackup([{ id: 'x', name: 'Asha', dateOfBirth: '2024-02-31' }]), /valid ISO date/);
});

test('macro values named fat remain numeric fields, including in biochemistry and history', () => {
  const patient = {
    ...sample[0],
    settings: { carbs: 55, protein: 15, fat: 30 },
    biochem: { fat: 1 },
    history: [{ reviewedAt: '2025-08-01T10:30:00.000Z', energy: 2000, protein: 75, snapshot: { id: 'pt-1', name: 'Asha Rao', settings: { fat: 30 }, biochem: { fat: 1 }, history: [] } }],
  };
  withStorage(() => {
    savePatients([patient]);
    assert.deepEqual(loadPatients(), [patient]);
  });
});

test('duplicate patient IDs and malformed optional app shapes are rejected', () => {
  assert.throws(() => savePatients([{ id: 'same', name: 'A' }, { id: ' same ', name: 'B' }]), /duplicates patient id/);
  assert.throws(() => savePatients([{ id: 'pt', name: 'A', settings: { fat: '30' } }]), /settings.fat/);
  assert.throws(() => savePatients([{ id: 'pt', name: 'A', portions: { cereals: '30' } }]), /portions.cereals/);
  assert.throws(() => parseBackup(JSON.stringify({ format: 'nourish-patients', version: 1, patients: [{ id: 'pt', name: 'A', meals: {} }] })), /meals must be an array/);
});

test('draft null portions are preserved and nullable biochemical objects are rejected', () => {
  const patient = { id: 'pt', name: 'Asha', portions: { cereals: null } };
  withStorage(() => {
    savePatients([patient]);
    assert.deepEqual(loadPatients(), [patient]);
  });
  assert.throws(() => parseBackup(JSON.stringify({ format: 'nourish-patients', version: 1, patients: [{ id: 'pt', name: 'Asha', biochem: null }] })), /biochem must be an object/);
});

test('review history must be renderable and contain a valid patient snapshot', () => {
  const validHistory = {
    reviewedAt: '2026-01-02T03:04:05.000Z', energy: 2000, protein: 75,
    snapshot: { id: 'pt', name: 'Asha', history: [] },
  };
  assert.doesNotThrow(() => exportBackup([{ id: 'pt', name: 'Asha', history: [validHistory] }]));
  assert.throws(() => exportBackup([{ id: 'pt', name: 'Asha', history: [null] }]), /history\[0\] must be an object/);
  assert.throws(() => exportBackup([{ id: 'pt', name: 'Asha', history: [{ ...validHistory, snapshot: null }] }]), /snapshot must be an object/);
  assert.throws(() => exportBackup([{ id: 'pt', name: 'Asha', history: [{ ...validHistory, energy: '2000' }] }]), /energy must be a finite number/);
});

test('demonstration patients cannot be saved or imported', () => {
  assert.throws(() => savePatients([{ id: 'demo', name: 'Example' }]), /demonstration patient/);
  assert.throws(() => exportBackup([{ id: 'pt', name: 'Example', demo: true }]), /demonstration patient/);
});

test('protocol drafts accept nullable numeric fields and preserve legacy fields unchanged', () => {
  const patient = {
    id: 'protocol-1', name: 'Synthetic patient',
    settings: { energyMethod: 'manual', manualEnergy: 1800, carbs: 50, protein: 20, fat: 30 },
    history: [{ reviewedAt: '2025-01-02T03:04:05.000Z', energy: 1800, protein: 90,
      snapshot: { id: 'protocol-1', name: 'Synthetic patient', history: [] } }],
    protocolVersion: 1,
    protocolReviewedAt: null,
    protocol: {
      calculationWeight: null, activityFactor: 30, carbs: 45, protein: 25, fat: 30,
      roundMacroTargets: true, minorCHO: 70,
      minorAllocations: { milk: 15, glv: 5, otherVeg: 20, roots: 10, fruit: 20, sugar: 0 },
      tolerances: { energy: 100, carbs: 25, protein: 10, fat: 5 },
      fiberTarget: null, matchMode: 'allowances',
    },
    ddp: { milk: null, cereals: 100 },
    distribution: { cereals: { breakfast: null, lunch: 50, dinner: 50 } },
    protocolMeals: [{ id: 'breakfast', label: 'Breakfast', time: '8:00 AM', note: '' }],
    protocolHistory: [{
      reviewedAt: '2025-01-03T04:05:06.000Z', energy: 1800, protein: 112.5,
      snapshot: { id: 'protocol-1', name: 'Synthetic patient', protocolHistory: [] },
    }],
  };
  withStorage(() => {
    savePatients([patient]);
    assert.deepEqual(loadPatients(), [patient]);
  });
  assert.deepEqual(parseBackup(exportBackup([patient])), [patient]);
});

test('legacy records are returned byte-for-byte as data without protocol migration', () => {
  const legacy = [{
    id: 'legacy-1', name: 'Synthetic legacy patient',
    settings: { energyMethod: 'scaled', manualEnergy: 2300, carbs: 50, protein: 20, fat: 30 },
    history: [{ reviewedAt: '2024-07-08T09:10:11.000Z', energy: 2300, protein: 92,
      snapshot: { id: 'legacy-1', name: 'Synthetic legacy patient', settings: { energyMethod: 'manual' }, history: [] } }],
  }];
  withStorage(() => {
    savePatients(legacy);
    const loaded = loadPatients();
    assert.deepEqual(loaded, legacy);
    assert.equal(Object.hasOwn(loaded[0], 'protocol'), false);
    assert.deepEqual(parseBackup(exportBackup(loaded)), legacy);
  });
});

test('protocol imports validate modes, meal limits and nonrecursive dated snapshots', () => {
  const base = { id: 'protocol-1', name: 'Synthetic patient', protocol: { matchMode: 'allowances' } };
  assert.throws(() => savePatients([{ ...base, protocol: { matchMode: 'guess' } }]), /matchMode/);
  assert.throws(() => savePatients([{ ...base, protocolMeals: Array(9).fill({ id: 'm', label: 'Meal', time: '', note: '' }) }]), /between 1 and 8/);
  assert.throws(() => savePatients([{ ...base, protocolMeals: [{ id: 'same', label: 'A', time: '', note: '' }, { id: ' same ', label: 'B', time: '', note: '' }] }]), /duplicates a meal id/);
  assert.throws(() => savePatients([{ ...base, ddp: { cereals: '100' } }]), /ddp.cereals/);
  assert.throws(() => savePatients([{ ...base, distribution: { cereals: ['100'] } }]), /distribution.cereals must be an object/);
  assert.throws(() => savePatients([{ ...base, protocolHistory: [null] }]), /protocolHistory\[0\] must be an object/);
  assert.throws(() => savePatients([{ ...base, protocolHistory: [{ reviewedAt: '2026-01-01T00:00:00.000Z', energy: null, protein: 50, snapshot: { id: 'nested', name: 'Snapshot' } }] }]), /energy must be a finite number/);
  assert.throws(() => savePatients([{ ...base, protocolHistory: [{ reviewedAt: '2026-01-01T00:00:00.000Z', energy: 1800, protein: 50, snapshot: { id: 'nested', name: 'Snapshot', protocolHistory: [{ reviewedAt: '2026-01-01', energy: 1800, protein: 50, snapshot: { id: 'deeper', name: 'Nested' } }] } }] }]), /must be empty inside a saved snapshot/);
});
