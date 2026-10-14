import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDDP,
  calculateProtocol,
  PROTOCOL_DEFAULTS,
  PROTOCOL_FOODS,
  suggestDDP,
  validateDistribution,
} from './protocol.js';

const referencePatient = {
  name: 'Sajitha K M',
  age: 50,
  sex: 'female',
  height: 154,
  weight: 75.75,
  activity: 'moderate',
  clinicalNotes: 'Prediabetes and dyslipidemia',
};

const referenceSettings = {
  calculationWeight: 59,
  activityFactor: 30,
  carbs: 45,
  protein: 25,
  fat: 30,
  roundMacroTargets: true,
  minorCHO: 70,
  minorAllocations: { milk: 15, glv: 5, otherVeg: 20, roots: 10, fruit: 20, sugar: 0 },
  tolerances: { energy: 100, carbs: 25, protein: 10, fat: 5 },
  fiberTarget: 35.4,
};

const referenceQuantities = {
  cereals: 169.3,
  pulses: 28.4,
  milk: 300,
  glv: 100,
  otherVeg: 300,
  roots: 100,
  fruit: 200,
  meat: 200,
  eggs: 150,
  oil: 20,
  sugar: 0,
};

test('reference assessment calculates Asian Indian BMI, manual calculation weight and exact/rounded targets', () => {
  const result = calculateProtocol(referencePatient, referenceSettings);
  assert.equal(result.eligible, true);
  assert.equal(result.anthropometrics.bmi, 31.9);
  assert.equal(result.anthropometrics.asianIndianCategory, 'Obesity');
  assert.equal(result.anthropometrics.categorySource, 'Asian Indian Consensus Group action thresholds (overweight 23, obesity 25 kg/m²); standard adult underweight threshold <18.5 kg/m².');
  assert.equal(result.anthropometrics.calculationWeightKg, 59);
  assert.equal(result.anthropometrics.weightSource, 'clinician-entered override');
  assert.equal(result.energy.ter, 1770);
  assert.deepEqual(result.macros.exactGrams, { carbs: 199.125, protein: 110.625, fat: 59 });
  assert.deepEqual(result.macros.roundedGrams, { carbs: 199, protein: 111, fat: 59 });
  assert.deepEqual(result.macros.targetGrams, { carbs: 199, protein: 111, fat: 59 });
  assert.equal(result.carbohydrateSplit.majorTarget, 129);
  assert.equal(result.carbohydrateSplit.cerealsCHO, 112.875);
  assert.equal(result.carbohydrateSplit.pulsesCHO, 16.125);
  assert.equal(result.carbohydrateSplit.minorAllocatedTotal, 70);
  assert.equal(result.ddp.rows.length, 11);
  assert.equal(result.ddp.allocationMatch.all, true);
  assert.equal(result.fiber.target, 35.4);
  assert.equal(result.fiber.actual, null, 'fiber is not fabricated from the macro matrix');
});

test('overweight patients require clinician-entered calculation weight and never get formula-derived ABW', () => {
  const result = calculateProtocol(referencePatient, { ...referenceSettings, calculationWeight: null });
  assert.equal(result.eligible, false);
  assert.equal(result.energy.ter, null);
  assert.equal(result.macros.targetGrams, null);
  assert.equal(result.anthropometrics.calculationWeightKg, null);
  assert.equal(result.anthropometrics.clinicianOverrideRequired, true);
  assert.ok(result.errors.some((error) => error.includes('No adjusted-weight formula is applied automatically')));

  const underThreshold = calculateProtocol({ ...referencePatient, weight: 52 }, { ...referenceSettings, calculationWeight: null });
  assert.equal(underThreshold.anthropometrics.asianIndianCategory, 'Normal');
  assert.equal(underThreshold.anthropometrics.calculationWeightKg, 52);
  assert.equal(underThreshold.anthropometrics.weightSource, 'actual body weight');
});

test('BMI action thresholds and activity factors respect the selected activity level', () => {
  const base = { age: 30, sex: 'male', height: 170, activity: 'sedentary' };
  const at23 = calculateProtocol({ ...base, weight: 66.47 }, { ...referenceSettings, calculationWeight: 60, activityFactor: 25 });
  assert.equal(at23.anthropometrics.asianIndianCategory, 'Overweight');
  assert.equal(at23.energy.ter, 1500);
  const at25 = calculateProtocol({ ...base, weight: 72.25 }, { ...referenceSettings, calculationWeight: 60, activityFactor: 25 });
  assert.equal(at25.anthropometrics.asianIndianCategory, 'Obesity');
  assert.equal(calculateProtocol({ ...base, weight: 52 }, undefined).energy.activityFactor, 25);
  const mismatch = calculateProtocol({ ...base, weight: 60 }, { ...referenceSettings, calculationWeight: null, activityFactor: 30 });
  assert.equal(mismatch.eligible, false);
  assert.ok(mismatch.errors.some((error) => error.includes('does not match the selected sedentary')));
  const heavy = calculateProtocol({ ...base, weight: 60, activity: 'heavy' }, { ...referenceSettings, calculationWeight: null, activityFactor: 40 });
  assert.equal(heavy.energy.ter, 2400);
});

test('minor CHO allocations must sum to target; no allocation is automatically redistributed', () => {
  const result = calculateProtocol(referencePatient, {
    ...referenceSettings,
    minorCHO: 80,
    minorAllocations: { milk: 15, glv: 5, otherVeg: 20, roots: 10, fruit: 20, sugar: 0 },
  });
  assert.equal(result.eligible, false);
  assert.ok(result.errors.some((error) => error.includes('must sum to the entered minor CHO target')));
  assert.equal(result.ddp.rows.length, 0);
});

test('rounding is optional and exact macro math remains available', () => {
  const exact = calculateProtocol(referencePatient, { ...referenceSettings, roundMacroTargets: false });
  assert.equal(exact.macros.roundingApplied, false);
  assert.deepEqual(exact.macros.targetGrams, exact.macros.exactGrams);
  assert.equal(exact.macros.targetGrams.carbs, 199.125);
  assert.equal(exact.macros.targetGrams.protein, 110.625);
});

test('DDP matrix recalculates reference quantities and exposes allowance success separately from exact match', () => {
  const result = calculateDDP(
    { energy: 1770, carbs: 199, protein: 111, fat: 59 },
    referenceQuantities,
    { tolerances: referenceSettings.tolerances, fiberTarget: 35.4 },
  );
  assert.equal(result.rows.length, 11);
  assert.ok(Math.abs(result.totals.carbs - 196.96) < 0.00001);
  assert.ok(Math.abs(result.totals.protein - 101.456667) < 0.00001);
  assert.equal(result.totals.fat, 56);
  assert.ok(Math.abs(result.totals.energy - 1697.666668) < 0.00001);
  assert.equal(result.withinAllowances.all, true);
  assert.equal(result.exactMatch, false, 'the supplied reference DDP is close but does not exactly match its stated targets');
  assert.equal(result.residuals.carbs, 2.04);
  assert.equal(result.fiber.actual, null);
});

test('DDP retains unrounded raw quantities and UI-level exact-match threshold is 0.1', () => {
  const assessment = calculateProtocol(referencePatient, referenceSettings);
  const suggested = suggestDDP(assessment);
  assert.equal(suggested.rows.find((row) => row.id === 'cereals').quantity, 169.3125);
  assert.equal(suggested.rows.find((row) => row.id === 'pulses').quantity, suggested.quantities.pulses);

  const quantities = { cereals: 30, pulses: 0, milk: 0, glv: 0, otherVeg: 0, roots: 0, fruit: 0, meat: 0, eggs: 0, oil: 0, sugar: 0 };
  const actual = calculateDDP({ energy: 0, carbs: 0, protein: 0, fat: 0 }, quantities);
  const withinTenth = calculateDDP({ ...actual.totals, energy: actual.totals.energy + 0.1 }, quantities);
  const beyondTenth = calculateDDP({ ...actual.totals, energy: actual.totals.energy + 0.1001 }, quantities);
  assert.equal(withinTenth.exactMatch, true);
  assert.equal(beyondTenth.exactMatch, false);
});

test('allowance checks do not add an unconfigured 0.05 buffer', () => {
  const result = calculateDDP(
    { energy: 100.01, carbs: 0, protein: 0, fat: 0 },
    { cereals: 0, pulses: 0, milk: 0, glv: 0, otherVeg: 0, roots: 0, fruit: 0, meat: 0, eggs: 0, oil: 0, sugar: 0 },
    { tolerances: { energy: 100, carbs: 0, protein: 0, fat: 0 } },
  );
  assert.equal(result.ranges.energy.min, 0.01);
  assert.equal(result.withinAllowances.energy, false);
});

test('suggestDDP seeds all eleven rows from CHO splits and flags clinician edits that break them', () => {
  const assessment = calculateProtocol(referencePatient, referenceSettings);
  const suggested = suggestDDP(assessment);
  assert.equal(suggested.rows.length, 11);
  assert.ok(Math.abs(suggested.quantities.cereals - 169.3125) < 0.000001);
  assert.ok(Math.abs(suggested.quantities.pulses - 28.4558823529) < 0.000001);
  assert.equal(suggested.quantities.meat, 0);
  assert.equal(suggested.quantities.eggs, 0);
  assert.equal(suggested.quantities.oil, 0);
  assert.equal(suggested.allocationMatch.all, true);
  const changed = suggestDDP(assessment, { ...suggested.quantities, glv: 0 });
  assert.equal(changed.allocationMatch.minor, false);
  assert.ok(changed.warnings.some((warning) => warning.includes('minor-source food quantities')));
});

test('meal-grid totals expose reference row mismatches instead of changing prescriptions', () => {
  const meals = ['Breakfast', 'Lunch', 'Dinner'];
  const grid = {
    cereals: [60, 60, 30],
    pulses: [30, 0, 30],
    milk: { Breakfast: 1, Lunch: 1, Dinner: 1 },
    glv: [0, 1, 0],
    otherVeg: [1, 1, 0],
    roots: [0, 1, 0],
    fruit: [0, 0, 2],
    meat: [0, 2, 2],
    eggs: [3, 0, 0],
    oil: [1, 1, 2],
    sugar: [0, 0, 0],
  };
  const distribution = validateDistribution(referenceQuantities, meals, grid);
  assert.equal(distribution.allMatched, false);
  assert.equal(distribution.rows.find((row) => row.id === 'cereals').prescribed, 169.3);
  assert.equal(distribution.rows.find((row) => row.id === 'cereals').allocated, 150);
  assert.equal(distribution.rows.find((row) => row.id === 'pulses').prescribed, 28.4);
  assert.equal(distribution.rows.find((row) => row.id === 'pulses').allocated, 60);
  assert.equal(distribution.rows.find((row) => row.id === 'otherVeg').prescribed, 3);
  assert.equal(distribution.rows.find((row) => row.id === 'otherVeg').allocated, 2);
});

test('meal-grid validation rejects missing cells and invalid prescribed quantities', () => {
  const meals = ['Breakfast', 'Dinner'];
  const completeGrid = Object.fromEntries(PROTOCOL_FOODS.map((food) => [food.id, [0, 0]]));
  const missing = validateDistribution(referenceQuantities, meals, { ...completeGrid, cereals: [30, null] });
  assert.equal(missing.allMatched, false);
  assert.ok(missing.errors.some((error) => error.includes('Cereals allocation for Dinner is missing')));

  const missingRow = validateDistribution(referenceQuantities, meals, { ...completeGrid, oil: undefined });
  assert.ok(missingRow.errors.some((error) => error.includes('Fats & oils needs an allocation')));

  const missingQuantity = { ...referenceQuantities };
  delete missingQuantity.eggs;
  const absent = validateDistribution(missingQuantity, meals, completeGrid);
  assert.ok(absent.errors.some((error) => error.includes('Eggs prescribed quantity is required')));
  for (const invalid of [null, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const invalidResult = validateDistribution({ ...referenceQuantities, eggs: invalid }, meals, completeGrid);
    assert.ok(invalidResult.errors.some((error) => error.includes('Eggs prescribed quantity must be a finite nonnegative number')));
  }
});

test('distribution matching compares unrounded quantities at 0.0001 tolerance', () => {
  const quantities = Object.fromEntries(PROTOCOL_FOODS.map((food) => [food.id, 0]));
  quantities.cereals = 30;
  const within = Object.fromEntries(PROTOCOL_FOODS.map((food) => [food.id, [0, 0]]));
  within.cereals = [29.99995, 0];
  const matched = validateDistribution(quantities, ['Breakfast', 'Dinner'], within);
  const cerealMatched = matched.rows.find((row) => row.id === 'cereals');
  assert.equal(cerealMatched.matched, true);
  assert.equal(cerealMatched.delta, -0.00005);

  const outside = { ...within, cereals: [29.99989, 0] };
  const notMatched = validateDistribution(quantities, ['Breakfast', 'Dinner'], outside);
  assert.equal(notMatched.rows.find((row) => row.id === 'cereals').matched, false);
});

test('invalid patient, target, quantity, and meal inputs are structured and null-safe', () => {
  const under18 = calculateProtocol({ ...referencePatient, age: 17 }, referenceSettings);
  assert.equal(under18.eligible, false);
  assert.equal(under18.energy.ter, null);
  const pregnancy = calculateProtocol({ ...referencePatient, pregnant: true }, referenceSettings);
  assert.equal(pregnancy.eligible, false);
  const badMacros = calculateProtocol(referencePatient, { ...referenceSettings, carbs: 50, protein: 30, fat: 30 });
  assert.equal(badMacros.eligible, false);
  assert.ok(badMacros.errors.some((error) => error.includes('sum to 100')));
  assert.equal(calculateDDP({ energy: 1, carbs: 1, protein: 1, fat: 1 }, { cereals: Number.NaN }).rows.length, 0);
  const badGrid = validateDistribution(referenceQuantities, ['Breakfast', 'Lunch'], { cereals: [30] });
  assert.equal(badGrid.allMatched, false);
  assert.ok(badGrid.errors.length > 0);
  assert.equal(PROTOCOL_FOODS.length, 11);
  assert.equal(PROTOCOL_DEFAULTS.roundMacroTargets, true);
});
