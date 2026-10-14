import test from 'node:test';
import assert from 'node:assert/strict';
import { allocateMealQuantities, calculateAssessment, calculatePortions, DEFAULT_SETTINGS, FOOD_GROUPS } from './nutrition.js';

const adult = {
  name: 'Sample',
  age: 35,
  sex: 'male',
  height: 170,
  weight: 65,
  activity: 'moderate',
  pregnant: false,
  lactating: false,
};

test('reference assessment uses ICMR-NIN sex and activity energy values', () => {
  const male = calculateAssessment(adult);
  const female = calculateAssessment({ ...adult, sex: 'female' });
  assert.equal(male.energy.kcal, 2710);
  assert.equal(male.energy.referenceKcal, 2710);
  assert.equal(male.energy.method, 'icmr-nin-adult-reference');
  assert.equal(female.energy.kcal, 2130);
  assert.equal(male.macros.percent.carbs, 55);
  assert.equal(male.macros.percent.protein, 15);
  assert.equal(male.macros.percent.fat, 30);
  assert.equal(male.macros.grams.protein, 101.6);
  assert.ok(male.macros.note.includes('not presented as an ICMR-NIN prescription'));
});

test('all six ICMR-NIN 2020 adult reference energy values and the age boundary are correct', () => {
  const expected = {
    male: { sedentary: 2110, moderate: 2710, heavy: 3470 },
    female: { sedentary: 1660, moderate: 2130, heavy: 2720 },
  };
  for (const [sex, activities] of Object.entries(expected)) {
    for (const [activity, kcal] of Object.entries(activities)) {
      const result = calculateAssessment({ ...adult, sex, activity });
      assert.equal(result.energy.kcal, kcal, `${sex}/${activity}`);
    }
  }
  assert.equal(calculateAssessment({ ...adult, age: 60 }).energy.kcal, 2710);
  const age61 = calculateAssessment({ ...adult, age: 61 });
  assert.equal(age61.eligible, false);
  assert.equal(age61.energy.kcal, null);
  assert.ok(age61.validation.warnings.some((warning) => warning.includes('18–60')));
});

test('WHO BMI, healthy weight and reference weight are explicit adult measures', () => {
  const result = calculateAssessment(adult);
  assert.equal(result.anthropometrics.bmi, 22.5);
  assert.equal(result.anthropometrics.whoCategory, 'Normal weight');
  assert.deepEqual(result.anthropometrics.healthyWeightKg, { min: 53.5, max: 72.0 });
  assert.equal(result.anthropometrics.referenceWeightKg, 65);
  assert.equal(result.anthropometrics.adjustedWeightSuggested, false);
  assert.equal(result.anthropometrics.asianIndianActionPoints, null);
});

test('scaled energy is labeled an estimate and reports its weight basis', () => {
  const result = calculateAssessment(adult, { energyMethod: 'scaled', weightBasis: 'actual' });
  assert.equal(result.energy.kcal, 2730);
  assert.equal(result.energy.method, 'scaled-estimate');
  assert.equal(result.energy.weightUsedKg, 65);
  const adjusted = calculateAssessment({ ...adult, weight: 100 }, { energyMethod: 'scaled', weightBasis: 'adjusted' });
  assert.ok(adjusted.energy.notes.some((note) => note.includes('not specified by ICMR-NIN')));
  assert.equal(adjusted.anthropometrics.adjustedWeightSuggested, true);
  assert.equal(adjusted.anthropometrics.adjustedWeightKg, 73.8);
  assert.equal(adjusted.energy.kcal, 3098, 'calculation uses unrounded reference weight');
});

test('adjusted weight is unavailable at or below the reference weight', () => {
  const below = calculateAssessment({ ...adult, weight: 62 }, { energyMethod: 'scaled', weightBasis: 'adjusted' });
  assert.equal(below.anthropometrics.adjustedWeightKg, null);
  assert.equal(below.anthropometrics.adjustedWeightSuggested, false);
  assert.equal(below.eligible, false);
  assert.equal(below.energy.kcal, null);
  assert.ok(below.validation.errors.some((error) => error.includes('only when actual weight exceeds')));

  const equal = calculateAssessment({ ...adult, weight: 65.025 });
  assert.equal(equal.anthropometrics.adjustedWeightKg, null);
});

test('manual energy is available for older adults, while minors and pregnancy/lactation are withheld', () => {
  const older = calculateAssessment({ ...adult, age: 72 }, { energyMethod: 'manual', manualEnergy: 1850 });
  assert.equal(older.eligible, true);
  assert.equal(older.energy.kcal, 1850);
  assert.equal(older.energy.referenceKcal, null);

  const minor = calculateAssessment({ ...adult, age: 17 });
  assert.equal(minor.eligible, false);
  assert.equal(minor.anthropometrics, null);
  assert.equal(minor.energy.kcal, null);
  assert.equal(minor.macros, null);

  const pregnancy = calculateAssessment({ ...adult, sex: 'female', pregnant: true });
  assert.equal(pregnancy.eligible, false);
  assert.equal(pregnancy.energy.kcal, null);
  assert.equal(pregnancy.macros, null);
});

test('biochemical observations are copied for manual recording only', () => {
  const biochem = { hb: { value: 12, unit: 'g/dL', date: '2026-10-14' }, note: 'Entered by clinician' };
  const result = calculateAssessment({ ...adult, biochem });
  assert.equal(result.biochem.recordedOnly, true);
  assert.deepEqual(result.biochem.values, biochem);
});

test('invalid numbers and non-100 macro percentages return structured validation errors', () => {
  const badNumber = calculateAssessment({ ...adult, weight: '65' });
  assert.equal(badNumber.status, 'invalid');
  assert.equal(badNumber.energy.kcal, null);
  assert.ok(badNumber.validation.errors.some((error) => error.includes('Weight must be a number')));

  const badMacros = calculateAssessment(adult, { carbs: 50, protein: 20, fat: 20 });
  assert.equal(badMacros.status, 'invalid');
  assert.equal(badMacros.macros, null);
  assert.ok(badMacros.validation.errors.some((error) => error.includes('sum to 100')));
});

test('invalid, zero, and null weights are rejected without producing BMI or energy', () => {
  for (const weight of [Number.NaN, null, 0]) {
    const result = calculateAssessment({ ...adult, weight });
    assert.equal(result.status, 'invalid');
    assert.equal(result.anthropometrics, null);
    assert.equal(result.energy.kcal, null);
    assert.ok(result.validation.errors.some((error) => error.includes('Weight must be a number')));
  }
});

test('scaled energy outside the portion planner range makes the assessment ineligible', () => {
  const result = calculateAssessment(
    { ...adult, weight: 350, activity: 'heavy' },
    { energyMethod: 'scaled', weightBasis: 'actual' },
  );
  assert.equal(result.eligible, false);
  assert.equal(result.status, 'invalid');
  assert.equal(result.energy.kcal, null);
  assert.equal(result.macros, null);
  assert.ok(result.validation.errors.some((error) => error.includes('clinician-selected manual target')));
});

test('macro allocations must sum to 100, including zero; extreme valid splits calculate safely', () => {
  const zero = calculateAssessment(adult, { carbs: 0, protein: 0, fat: 0 });
  assert.equal(zero.status, 'invalid');
  assert.ok(zero.validation.errors.some((error) => error.includes('sum to 100')));

  const allCarbohydrate = calculateAssessment(adult, { carbs: 100, protein: 0, fat: 0 });
  assert.equal(allCarbohydrate.eligible, true);
  assert.deepEqual(allCarbohydrate.macros.percent, { carbs: 100, protein: 0, fat: 0 });
  assert.deepEqual(allCarbohydrate.macros.grams, { carbs: 677.5, protein: 0, fat: 0 });
});

test('NIN portions are scaled from the correct vegetarian or non-vegetarian raw reference quantities', () => {
  const veg = calculatePortions(1000);
  assert.equal(veg.scale, 0.5);
  assert.equal(veg.items.find((item) => item.id === 'cereals').quantity, 125);
  assert.equal(veg.items.find((item) => item.id === 'milk-curd').quantity, 150);
  assert.equal(veg.isEstimate, true);
  assert.ok(veg.note.includes('do not guarantee a macro match'));

  const nonVeg = calculatePortions(2000, { dietType: 'nonVegetarian' });
  assert.equal(nonVeg.items.find((item) => item.id === 'meat').quantity, 70);
  assert.equal(nonVeg.items.find((item) => item.id === 'pulses').quantity, 55);
  assert.equal(FOOD_GROUPS.vegetarian[0].quantity, 250);
});

test('portions reject invalid energy and diet options without producing NaN', () => {
  assert.ok(calculatePortions(Number.NaN).error);
  const invalidDiet = calculatePortions(2000, { dietType: 'therapeutic' });
  assert.ok(invalidDiet.error);
  assert.deepEqual(invalidDiet.items, []);
  assert.equal(DEFAULT_SETTINGS.carbs + DEFAULT_SETTINGS.protein + DEFAULT_SETTINGS.fat, 100);
});

test('meal quantities allocate a normal day and fractional totals to one decimal place', () => {
  assert.deepEqual(allocateMealQuantities(2000, [25, 35, 40]), [500, 700, 800]);
  assert.deepEqual(allocateMealQuantities(10, [33.3, 33.3, 33.4]), [3.3, 3.3, 3.4]);
  assert.deepEqual(allocateMealQuantities(1, [33.333, 33.333, 33.334]), [0.3, 0.3, 0.4]);
  assert.deepEqual(allocateMealQuantities(4.05, [50, 50]), [2.1, 2]);
});

test('meal allocations preserve zero shares and normalize near-100 percentages', () => {
  assert.deepEqual(allocateMealQuantities(123.45, [100, 0, 0]), [123.5, 0, 0]);
  const near100 = allocateMealQuantities(1234.6, [33.336, 33.336, 33.337]);
  assert.equal(near100.length, 3);
  assert.equal(near100.reduce((sum, quantity) => sum + quantity, 0), 1234.6);
  assert.deepEqual(allocateMealQuantities(0, [60, 40]), [0, 0]);
});

test('meal allocator rejects invalid totals and percentages, and handles large totals', () => {
  for (const total of [Number.NaN, Number.POSITIVE_INFINITY, -1, null]) {
    assert.deepEqual(allocateMealQuantities(total, [50, 50]), []);
  }
  for (const percentages of [[], [50], [100.1, 0], [Number.NaN, 100], [-1, 101], ['50', 50]]) {
    assert.deepEqual(allocateMealQuantities(100, percentages), []);
  }
  const large = allocateMealQuantities(1_000_000_000.1, [20, 30, 50]);
  assert.deepEqual(large, [200_000_000, 300_000_000, 500_000_000.1]);
  assert.equal(Math.round(large.reduce((sum, quantity) => sum + quantity, 0) * 10) / 10, 1_000_000_000.1);
});
