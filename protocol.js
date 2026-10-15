/** Clinical diet protocol calculations from the supplied reference documents. */

export const PROTOCOL_SOURCES = Object.freeze([
  Object.freeze({
    id: 'asian-indian-bmi-consensus-2009',
    title: 'Consensus Statement for Diagnosis of Obesity, Abdominal Obesity and the Metabolic Syndrome for Asian Indians',
    url: 'https://kemdiabetes.org/Paper/125%20Consensus%20Statement%20for%20Diagnosis%20of%20Obesity,%20Abdominal%20Obesity%20and%20the%20Metabolic%20Syndrome%20for%20Asian%20Indians.pdf',
    supports: 'Asian Indian adult BMI categories: normal 18.0–22.9, overweight 23.0–24.9, obesity above 25 kg/m².',
  }),
  Object.freeze({
    id: 'who-adult-underweight-threshold',
    title: 'WHO: Malnutrition in women (adult BMI interpretation)',
    url: 'https://www.who.int/data/nutrition/nlis/info/malnutrition-in-women',
    supports: 'Adult BMI below 18.5 kg/m² is underweight; this category uses the standard threshold alongside Asian Indian 23/25 action thresholds.',
  }),
]);

/** Per-portion matrix copied from the clinician-supplied protocol document. */
export const PROTOCOL_FOODS = Object.freeze([
  Object.freeze({ id: 'cereals', label: 'Cereals', portionSize: 30, unit: 'g raw', carbs: 20, protein: 3, fat: 0, role: 'major-cho' }),
  Object.freeze({ id: 'pulses', label: 'Pulses', portionSize: 30, unit: 'g raw', carbs: 17, protein: 7, fat: 0, role: 'major-cho' }),
  Object.freeze({ id: 'milk', label: 'Milk & curd', portionSize: 100, unit: 'ml', carbs: 5, protein: 3.3, fat: 3, role: 'minor-cho' }),
  Object.freeze({ id: 'glv', label: 'Green leafy vegetables', portionSize: 100, unit: 'g', carbs: 3, protein: 3, fat: 0, role: 'minor-cho' }),
  Object.freeze({ id: 'otherVeg', label: 'Other vegetables', portionSize: 100, unit: 'g', carbs: 5, protein: 1.5, fat: 0, role: 'minor-cho' }),
  Object.freeze({ id: 'roots', label: 'Roots & tubers', portionSize: 100, unit: 'g', carbs: 15, protein: 1, fat: 0, role: 'minor-cho' }),
  Object.freeze({ id: 'fruit', label: 'Fruits', portionSize: 100, unit: 'g', carbs: 10, protein: 0, fat: 0, role: 'minor-cho' }),
  Object.freeze({ id: 'meat', label: 'Meat / fish', portionSize: 50, unit: 'g', carbs: 0, protein: 10, fat: 3, role: 'optional-protein' }),
  Object.freeze({ id: 'eggs', label: 'Eggs', portionSize: 50, unit: 'g', carbs: 0, protein: 6.5, fat: 5, role: 'optional-protein' }),
  Object.freeze({ id: 'oil', label: 'Fats & oils', portionSize: 5, unit: 'g', carbs: 0, protein: 0, fat: 5, role: 'optional-fat' }),
  Object.freeze({ id: 'sugar', label: 'Sugars & jaggery', portionSize: 5, unit: 'g', carbs: 5, protein: 0, fat: 0, role: 'minor-cho' }),
]);

const DEFAULT_MINOR_ALLOCATIONS = Object.freeze({
  milk: 15,
  glv: 5,
  otherVeg: 20,
  roots: 10,
  fruit: 20,
  sugar: 0,
});

export const PROTOCOL_DEFAULTS = Object.freeze({
  weightMode: 'recommended',
  calculationWeight: null,
  customWeight: null,
  activityFactor: 30,
  carbs: 45,
  protein: 25,
  fat: 30,
  roundMacroTargets: true,
  minorCHO: 70,
  minorAllocations: DEFAULT_MINOR_ALLOCATIONS,
  tolerances: Object.freeze({ energy: 100, carbs: 25, protein: 10, fat: 5 }),
  fiberTarget: null,
  fiberTolerance: Object.freeze({ below: 5, above: 15 }),
});

const MINOR_FOOD_IDS = Object.freeze(['milk', 'glv', 'otherVeg', 'roots', 'fruit', 'sugar']);
const VALID_ACTIVITY_FACTORS = (value) => value === 25 || value === 30 || (value >= 35 && value <= 40);
const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const round1 = (value) => Math.round((value + Number.EPSILON) * 10) / 10;
const round6 = (value) => Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
const closeEnough = (a, b, tolerance = 0.05) => Math.abs(a - b) <= tolerance;

function mergeSettings(settings) {
  const input = settings && typeof settings === 'object' && !Array.isArray(settings) ? settings : {};
  return {
    ...PROTOCOL_DEFAULTS,
    ...input,
    minorAllocations: { ...DEFAULT_MINOR_ALLOCATIONS, ...(input.minorAllocations && typeof input.minorAllocations === 'object' ? input.minorAllocations : {}) },
    tolerances: { ...PROTOCOL_DEFAULTS.tolerances, ...(input.tolerances && typeof input.tolerances === 'object' ? input.tolerances : {}) },
    fiberTolerance: { ...PROTOCOL_DEFAULTS.fiberTolerance, ...(input.fiberTolerance && typeof input.fiberTolerance === 'object' ? input.fiberTolerance : {}) },
  };
}

function asianIndianBmiCategory(bmi) {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 23) return 'Normal';
  if (bmi < 25) return 'Overweight';
  return 'Obesity';
}

function validatePatient(patient, errors, warnings) {
  const p = patient && typeof patient === 'object' && !Array.isArray(patient) ? patient : {};
  if (!isFiniteNumber(p.age) || p.age < 0 || p.age > 120) errors.push('Age must be a finite number from 0 to 120 years.');
  if (!isFiniteNumber(p.height) || p.height <= 0 || p.height > 250) errors.push('Height must be a finite number above 0 and at most 250 cm.');
  if (!isFiniteNumber(p.weight) || p.weight <= 0 || p.weight > 500) errors.push('Weight must be a finite number above 0 and at most 500 kg.');
  if (!['female', 'male'].includes(p.sex)) errors.push("Sex must be 'female' or 'male'.");
  if (!['sedentary', 'moderate', 'heavy'].includes(p.activity)) errors.push("Activity must be 'sedentary', 'moderate' or 'heavy'.");
  if (p.pregnant === true || p.lactating === true) warnings.push('Pregnancy or lactation requires individualized clinical review; automated protocol targets are withheld.');
  const isAdult = isFiniteNumber(p.age) && p.age >= 18;
  if (isFiniteNumber(p.age) && p.age < 18) warnings.push('This adult protocol does not calculate targets for people under 18.');

  let bmi = null;
  let bmiCategory = null;
  if (isAdult && isFiniteNumber(p.height) && p.height > 0 && p.height <= 250 && isFiniteNumber(p.weight) && p.weight > 0 && p.weight <= 500) {
    bmi = p.weight / ((p.height / 100) ** 2);
    bmiCategory = asianIndianBmiCategory(bmi);
  }
  return { isAdult, bmi, bmiCategory };
}

function validateSettings(settings, errors, activity) {
  const input = settings && typeof settings === 'object' && !Array.isArray(settings) ? settings : {};
  const s = mergeSettings(input);
  if (input.activityFactor === undefined) {
    s.activityFactor = activity === 'sedentary' ? 25 : activity === 'heavy' ? 35 : 30;
  }
  if (!['recommended', 'actual', 'ibw', 'abw', 'custom'].includes(s.weightMode)) {
    errors.push('Weight mode must be recommended, actual, IBW, ABW or custom.');
  }
  for (const [key, value] of [['customWeight', s.customWeight], ['calculationWeight', s.calculationWeight]]) {
    if (value !== null && (!isFiniteNumber(value) || value <= 0 || value > 500)) {
      errors.push(`${key} must be null or a finite number above 0 and at most 500 kg.`);
    }
  }
  if (!isFiniteNumber(s.activityFactor) || !VALID_ACTIVITY_FACTORS(s.activityFactor)) {
    errors.push('Activity factor must be 25, 30, or a number from 35 to 40 kcal/kg/day.');
  }
  const activityMatchesFactor = activity === 'sedentary' ? s.activityFactor === 25
    : activity === 'moderate' ? s.activityFactor === 30
      : activity === 'heavy' ? s.activityFactor >= 35 && s.activityFactor <= 40
        : false;
  if (isFiniteNumber(s.activityFactor) && VALID_ACTIVITY_FACTORS(s.activityFactor) && !activityMatchesFactor) {
    errors.push(`Activity factor ${s.activityFactor} does not match the selected ${activity} activity level.`);
  }
  for (const key of ['carbs', 'protein', 'fat']) {
    if (!isFiniteNumber(s[key]) || s[key] < 0 || s[key] > 100) errors.push(`${key} percentage must be a number from 0 to 100.`);
  }
  if (['carbs', 'protein', 'fat'].every((key) => isFiniteNumber(s[key]) && s[key] >= 0 && s[key] <= 100)) {
    const sum = s.carbs + s.protein + s.fat;
    if (Math.abs(sum - 100) > 0.01) errors.push(`Macro percentages must sum to 100 (currently ${round1(sum)}).`);
  }
  if (typeof s.roundMacroTargets !== 'boolean') errors.push('roundMacroTargets must be true or false.');
  if (!isFiniteNumber(s.minorCHO) || s.minorCHO < 0) errors.push('Minor carbohydrate target must be a finite nonnegative number of grams.');
  for (const id of MINOR_FOOD_IDS) {
    const value = s.minorAllocations[id];
    if (!isFiniteNumber(value) || value < 0) errors.push(`Minor allocation ${id} must be a finite nonnegative number of grams of carbohydrate.`);
  }
  const minorSum = MINOR_FOOD_IDS.every((id) => isFiniteNumber(s.minorAllocations[id]) && s.minorAllocations[id] >= 0)
    ? MINOR_FOOD_IDS.reduce((sum, id) => sum + s.minorAllocations[id], 0)
    : null;
  if (minorSum !== null && isFiniteNumber(s.minorCHO) && Math.abs(minorSum - s.minorCHO) > 0.01) {
    errors.push(`Minor-source allocations must sum to the entered minor CHO target (${round1(minorSum)} g allocated; ${round1(s.minorCHO)} g targeted).`);
  }
  for (const key of ['energy', 'carbs', 'protein', 'fat']) {
    if (!isFiniteNumber(s.tolerances[key]) || s.tolerances[key] < 0) errors.push(`${key} tolerance must be a finite nonnegative number.`);
  }
  if (s.fiberTarget !== null && (!isFiniteNumber(s.fiberTarget) || s.fiberTarget < 0)) errors.push('Fiber target must be null or a finite nonnegative number of grams.');
  if (!isFiniteNumber(s.fiberTolerance.below) || s.fiberTolerance.below < 0 || !isFiniteNumber(s.fiberTolerance.above) || s.fiberTolerance.above < 0) {
    errors.push('Fiber allowance values must be finite and nonnegative.');
  }
  return { settings: s, minorSum };
}

function emptyDdp(errors = [], warnings = []) {
  return {
    rows: [],
    totals: { energy: null, carbs: null, protein: null, fat: null },
    residuals: { energy: null, carbs: null, protein: null, fat: null },
    ranges: {},
    withinAllowances: { energy: false, carbs: false, protein: false, fat: false, all: false },
    exactMatch: false,
    errors: [...errors],
    warnings: [...warnings],
  };
}

function normalizeTargets(targets) {
  if (!targets || typeof targets !== 'object') return null;
  const source = targets.targets && typeof targets.targets === 'object' ? targets.targets : targets;
  const energy = source.energy ?? source.energyKcal;
  const carbs = source.carbs ?? source.carbsG;
  const protein = source.protein ?? source.proteinG;
  const fat = source.fat ?? source.fatG;
  if (![energy, carbs, protein, fat].every((value) => isFiniteNumber(value) && value >= 0)) return null;
  return { energy, carbs, protein, fat };
}

function getQuantityRecord(quantities) {
  const result = Object.fromEntries(PROTOCOL_FOODS.map((food) => [food.id, 0]));
  if (!quantities || typeof quantities !== 'object' || Array.isArray(quantities)) return result;
  for (const food of PROTOCOL_FOODS) {
    if (quantities[food.id] !== undefined) result[food.id] = quantities[food.id];
  }
  return result;
}

function buildSeedQuantities(targets, split, edits = {}) {
  const quantities = getQuantityRecord(edits);
  if (!targets || !split) return quantities;
  const cereals = PROTOCOL_FOODS.find((food) => food.id === 'cereals');
  const pulses = PROTOCOL_FOODS.find((food) => food.id === 'pulses');
  quantities.cereals = split.cerealsCHO / cereals.carbs * cereals.portionSize;
  quantities.pulses = split.pulsesCHO / pulses.carbs * pulses.portionSize;
  for (const id of MINOR_FOOD_IDS) {
    const food = PROTOCOL_FOODS.find((item) => item.id === id);
    quantities[id] = split.minorAllocations[id] / food.carbs * food.portionSize;
  }
  return { ...quantities, ...edits };
}

/** Recalculate DDP nutrient contributions from editable raw weights/volumes. */
export function calculateDDP(targets, quantities, options = {}) {
  const normalizedTargets = normalizeTargets(targets);
  const errors = [];
  const warnings = [];
  if (!normalizedTargets) errors.push('Targets must include finite nonnegative energy, carbs, protein and fat values.');
  const quantityRecord = getQuantityRecord(quantities);
  for (const food of PROTOCOL_FOODS) {
    if (!isFiniteNumber(quantityRecord[food.id]) || quantityRecord[food.id] < 0) errors.push(`${food.label} quantity must be a finite nonnegative number.`);
  }
  if (errors.length) return emptyDdp(errors);

  const tolerances = { ...PROTOCOL_DEFAULTS.tolerances, ...(options.tolerances && typeof options.tolerances === 'object' ? options.tolerances : {}) };
  const rows = PROTOCOL_FOODS.map((food) => {
    const quantity = quantityRecord[food.id];
    const portions = quantity / food.portionSize;
    const carbs = portions * food.carbs;
    const protein = portions * food.protein;
    const fat = portions * food.fat;
    return {
      id: food.id,
      label: food.label,
      portionSize: food.portionSize,
      unit: food.unit,
      // Preserve raw, freely divisible grams/ml; rounding here would silently
      // change the clinician's seeded amount when the UI edits another field.
      quantity,
      portions: round6(portions),
      carbs: round6(carbs),
      protein: round6(protein),
      fat: round6(fat),
      energy: round6(carbs * 4 + protein * 4 + fat * 9),
    };
  });
  const totals = {
    carbs: round6(rows.reduce((sum, row) => sum + row.carbs, 0)),
    protein: round6(rows.reduce((sum, row) => sum + row.protein, 0)),
    fat: round6(rows.reduce((sum, row) => sum + row.fat, 0)),
  };
  totals.energy = round6(totals.carbs * 4 + totals.protein * 4 + totals.fat * 9);
  const residuals = {
    energy: round6(normalizedTargets.energy - totals.energy),
    carbs: round6(normalizedTargets.carbs - totals.carbs),
    protein: round6(normalizedTargets.protein - totals.protein),
    fat: round6(normalizedTargets.fat - totals.fat),
  };
  const ranges = Object.fromEntries(['energy', 'carbs', 'protein', 'fat'].map((key) => [key, {
    min: round6(normalizedTargets[key] - (isFiniteNumber(tolerances[key]) ? tolerances[key] : 0)),
    max: round6(normalizedTargets[key] + (isFiniteNumber(tolerances[key]) ? tolerances[key] : 0)),
  }]));
  const withinAllowances = Object.fromEntries(['energy', 'carbs', 'protein', 'fat'].map((key) => [key,
    totals[key] >= ranges[key].min - 1e-6 && totals[key] <= ranges[key].max + 1e-6,
  ]));
  withinAllowances.all = Object.values(withinAllowances).every(Boolean);
  const exactMatch = ['energy', 'carbs', 'protein', 'fat'].every((key) => closeEnough(totals[key], normalizedTargets[key], 0.1));

  const fiberTarget = options.fiberTarget ?? null;
  let fiber = null;
  if (fiberTarget !== null && isFiniteNumber(fiberTarget) && fiberTarget >= 0) {
    const fiberTolerance = { ...PROTOCOL_DEFAULTS.fiberTolerance, ...(options.fiberTolerance && typeof options.fiberTolerance === 'object' ? options.fiberTolerance : {}) };
    fiber = {
      target: fiberTarget,
      min: round1(fiberTarget - fiberTolerance.below),
      max: round1(fiberTarget + fiberTolerance.above),
      actual: null,
      withinAllowance: null,
      note: 'Fiber intake is not calculated because the supplied DDP matrix has no fiber constants.',
    };
  }

  return { rows, totals, residuals, ranges, withinAllowances, exactMatch, errors, warnings, fiber, quantities: { ...quantityRecord } };
}

/** Seed the DDP matrix from explicit minor CHO allocation and 7:1 major CHO. */
export function suggestDDP(assessmentOrTargets, quantities = {}) {
  const assessment = assessmentOrTargets && assessmentOrTargets.macros ? assessmentOrTargets : null;
  const targets = normalizeTargets(assessment?.macros?.targetGrams
    ? { energy: assessment.energy?.ter ?? assessment.energy?.energy ?? assessment.macros.targetGrams.energy, ...assessment.macros.targetGrams }
    : assessmentOrTargets?.targets ?? assessmentOrTargets);
  const split = assessment?.carbohydrateSplit ?? assessmentOrTargets?.carbohydrateSplit ?? null;
  if (!targets) return emptyDdp(['A valid assessment or target object is required to seed DDP quantities.']);
  if (!split || !isFiniteNumber(split.cerealsCHO) || !isFiniteNumber(split.pulsesCHO) || !split.minorAllocations) {
    return emptyDdp(['Major and minor carbohydrate split is required to seed DDP quantities.']);
  }
  const seeded = buildSeedQuantities(targets, split, quantities);
  const result = calculateDDP(targets, seeded, {
    tolerances: assessment?.tolerances,
    fiberTarget: assessment?.fiber?.target ?? assessment?.fiberTarget ?? null,
    fiberTolerance: assessment?.fiberTolerance,
  });
  result.quantities = seeded;
  result.carbohydrateSplit = split;
  result.exactMacroTargets = targets;
  const actualCarbs = Object.fromEntries(result.rows.map((row) => [row.id, row.carbs]));
  const minorMatch = MINOR_FOOD_IDS.every((id) => closeEnough(actualCarbs[id], split.minorAllocations[id]));
  const majorMatch = closeEnough(actualCarbs.cereals, split.cerealsCHO) && closeEnough(actualCarbs.pulses, split.pulsesCHO);
  result.allocationMatch = { major: majorMatch, minor: minorMatch, all: majorMatch && minorMatch };
  if (!result.allocationMatch.minor) result.warnings.push('Edited minor-source food quantities no longer match the clinician-entered minor CHO allocation.');
  if (!result.allocationMatch.major) result.warnings.push('Edited cereal/pulse quantities no longer match the 7:1 major CHO split; these raw quantities remain clinician-editable.');
  result.warnings.push('Non-CHO rows (meat/fish, eggs and fats/oils) start at zero unless clinician-entered quantities are supplied.');
  return result;
}

/**
 * Validate the transpose meal grid. Cereals/pulses use raw grams per meal;
 * the remaining nine rows use portion counts per meal.
 */
export function validateDistribution(quantities, meals, grid) {
  const errors = [];
  const mealNames = Array.isArray(meals) ? meals : [];
  if (!mealNames.length || !mealNames.every((meal) => typeof meal === 'string' && meal.trim().length > 0)) {
    errors.push('Meals must be a nonempty array of meal names.');
  }
  if (!grid || typeof grid !== 'object' || Array.isArray(grid)) errors.push('Grid must be an object keyed by food ID.');
  const quantityInput = quantities && typeof quantities === 'object' && !Array.isArray(quantities) ? quantities : {};
  if (!quantities || typeof quantities !== 'object' || Array.isArray(quantities)) errors.push('Prescribed quantities must be an object keyed by food ID.');
  const rows = PROTOCOL_FOODS.map((food) => {
    const hasQuantity = Object.hasOwn(quantityInput, food.id);
    const rawQuantity = hasQuantity ? quantityInput[food.id] : null;
    if (!hasQuantity) errors.push(`${food.label} prescribed quantity is required.`);
    else if (!isFiniteNumber(rawQuantity) || rawQuantity < 0) errors.push(`${food.label} prescribed quantity must be a finite nonnegative number.`);
    const allocationUnit = food.id === 'cereals' || food.id === 'pulses' ? 'g raw' : 'portion';
    const prescribed = !isFiniteNumber(rawQuantity) || rawQuantity < 0 ? null
      : allocationUnit === 'portion' ? rawQuantity / food.portionSize : rawQuantity;
    const hasGridRow = Boolean(grid && typeof grid === 'object' && Object.hasOwn(grid, food.id) && grid[food.id] !== null && grid[food.id] !== undefined);
    if (!hasGridRow) errors.push(`${food.label} needs an allocation for every configured meal.`);
    const rawAllocation = hasGridRow ? grid[food.id] : undefined;
    let values;
    if (Array.isArray(rawAllocation)) {
      values = rawAllocation;
      if (values.length !== mealNames.length) errors.push(`${food.label} needs one allocation per configured meal.`);
      for (let i = 0; i < mealNames.length; i += 1) {
        if (!Object.hasOwn(values, i) || values[i] === null || values[i] === undefined) errors.push(`${food.label} allocation for ${mealNames[i] ?? `meal ${i + 1}`} is missing.`);
      }
    } else if (rawAllocation && typeof rawAllocation === 'object') {
      values = mealNames.map((meal) => {
        if (!Object.hasOwn(rawAllocation, meal) || rawAllocation[meal] === null || rawAllocation[meal] === undefined) {
          errors.push(`${food.label} allocation for ${meal} is missing.`);
          return null;
        }
        return rawAllocation[meal];
      });
    } else {
      values = [];
    }
    if (!values.every((value) => isFiniteNumber(value) && value >= 0)) errors.push(`${food.label} meal allocations must be finite nonnegative numbers.`);
    const allocated = values.every((value) => isFiniteNumber(value) && value >= 0) ? values.reduce((sum, value) => sum + value, 0) : null;
    const rawDelta = allocated === null || !isFiniteNumber(prescribed) ? null : allocated - prescribed;
    const delta = rawDelta === null ? null : round6(rawDelta);
    return {
      id: food.id,
      label: food.label,
      unit: allocationUnit,
      prescribed: isFiniteNumber(prescribed) ? round6(prescribed) : null,
      allocated: allocated === null ? null : round6(allocated),
      delta,
      matched: rawDelta !== null && Math.abs(rawDelta) <= 0.0001,
    };
  });
  const allMatched = errors.length === 0 && rows.every((row) => row.matched);
  return { meals: [...mealNames], rows, allMatched, errors };
}

/** Compute energy, exact/rounded macros and the protocol's DDP seed. */
export function calculateProtocol(patient, settings) {
  const errors = [];
  const warnings = [];
  const p = patient && typeof patient === 'object' && !Array.isArray(patient) ? patient : {};
  const patientState = validatePatient(p, errors, warnings);
  const { settings: s } = validateSettings(settings, errors, p.activity);
  const overweight = patientState.bmi !== null && patientState.bmi >= 23;
  const heightM = isFiniteNumber(p.height) && p.height > 0 ? p.height / 100 : null;
  const idealBodyWeightKg = heightM === null ? null : heightM ** 2 * 22.5;
  const adjustedBodyWeightKg = idealBodyWeightKg !== null && isFiniteNumber(p.weight)
    ? idealBodyWeightKg + 0.25 * (p.weight - idealBodyWeightKg)
    : null;
  // Older saved plans had only calculationWeight. Keep that clinician value as a custom selection.
  const weightMode = settings?.weightMode === undefined && isFiniteNumber(s.calculationWeight)
    ? 'custom'
    : s.weightMode;
  let calculationWeightKg = null;
  let weightSource = null;
  const defaultWeight = overweight && adjustedBodyWeightKg !== null ? Math.round(adjustedBodyWeightKg) : p.weight;
  if (weightMode === 'recommended') {
    calculationWeightKg = defaultWeight;
    weightSource = overweight ? 'recommended adjusted body weight (rounded to nearest kg)' : 'recommended actual body weight';
  } else if (weightMode === 'actual') {
    calculationWeightKg = p.weight;
    weightSource = 'actual body weight';
  } else if (weightMode === 'ibw') {
    calculationWeightKg = idealBodyWeightKg;
    weightSource = 'ideal body weight (target BMI 22.5)';
  } else if (weightMode === 'abw') {
    calculationWeightKg = adjustedBodyWeightKg === null ? null : Math.round(adjustedBodyWeightKg);
    weightSource = 'adjusted body weight (rounded to nearest kg)';
  } else if (weightMode === 'custom') {
    calculationWeightKg = settings?.weightMode === undefined ? s.calculationWeight : (s.customWeight ?? s.calculationWeight);
    weightSource = 'custom clinician-entered weight';
  }
  if (!isFiniteNumber(calculationWeightKg) || calculationWeightKg <= 0) {
    calculationWeightKg = null;
    errors.push(weightMode === 'custom'
      ? 'Enter a valid custom calculation weight.'
      : 'Complete valid height and actual weight measurements to calculate the selected weight basis.');
  }
  if (!patientState.isAdult) errors.push('Protocol energy and macro targets are available for adults aged 18 years and older.');
  if (p.pregnant === true || p.lactating === true) errors.push('Automated protocol targets are withheld during pregnancy or lactation; clinician review is required.');

  const canCalculate = errors.length === 0 && calculationWeightKg !== null;
  const ter = canCalculate ? calculationWeightKg * s.activityFactor : null;
  const exactGrams = ter === null ? null : {
    carbs: ter * s.carbs / 100 / 4,
    protein: ter * s.protein / 100 / 4,
    fat: ter * s.fat / 100 / 9,
  };
  const roundedGrams = exactGrams === null ? null : {
    carbs: Math.round(exactGrams.carbs),
    protein: Math.round(exactGrams.protein),
    fat: Math.round(exactGrams.fat),
  };
  const targetGrams = exactGrams === null ? null : s.roundMacroTargets ? roundedGrams : { ...exactGrams };
  const macroTargets = ter === null ? null : {
    energy: ter,
    carbs: targetGrams.carbs,
    protein: targetGrams.protein,
    fat: targetGrams.fat,
  };
  const minorAllocations = { ...s.minorAllocations };
  const majorCHO = ter === null || targetGrams === null ? null : targetGrams.carbs - s.minorCHO;
  if (majorCHO !== null && majorCHO < -0.01) errors.push('Minor carbohydrate target cannot exceed the total carbohydrate target.');
  const carbohydrateSplit = majorCHO === null || majorCHO < 0 ? null : {
    totalCHO: targetGrams.carbs,
    minorTarget: s.minorCHO,
    minorAllocations,
    minorAllocatedTotal: MINOR_FOOD_IDS.reduce((sum, id) => sum + minorAllocations[id], 0),
    majorTarget: majorCHO,
    cerealsCHO: majorCHO * 7 / 8,
    pulsesCHO: majorCHO / 8,
  };
  if (carbohydrateSplit) {
    const expectedSum = carbohydrateSplit.cerealsCHO + carbohydrateSplit.pulsesCHO + carbohydrateSplit.minorAllocatedTotal;
    if (Math.abs(expectedSum - targetGrams.carbs) > 0.01) errors.push('Major and minor carbohydrate allocations do not equal the carbohydrate target.');
  }

  const tolerances = { ...s.tolerances };
  const ranges = macroTargets ? Object.fromEntries(['energy', 'carbs', 'protein', 'fat'].map((key) => [key, {
    min: macroTargets[key] - tolerances[key],
    max: macroTargets[key] + tolerances[key],
  }])) : {};
  const fiber = s.fiberTarget === null ? { target: null, min: null, max: null, actual: null, withinAllowance: null }
    : { target: s.fiberTarget, min: Math.max(0, s.fiberTarget - s.fiberTolerance.below), max: s.fiberTarget + s.fiberTolerance.above, actual: null, withinAllowance: null };

  let ddp = emptyDdp(errors);
  if (macroTargets && carbohydrateSplit && errors.length === 0) {
    ddp = suggestDDP({ macros: { targetGrams: { ...targetGrams, energy: ter } }, energy: { ter }, carbohydrateSplit, tolerances, fiber }, {});
  }
  const status = errors.length > 0 ? 'clinical-review-required' : canCalculate ? 'eligible' : 'clinical-review-required';
  return {
    eligible: canCalculate && errors.length === 0,
    status,
    patient: {
      name: typeof p.name === 'string' ? p.name : '',
      age: isFiniteNumber(p.age) ? p.age : null,
      sex: ['female', 'male'].includes(p.sex) ? p.sex : null,
      height: isFiniteNumber(p.height) ? p.height : null,
      heightUnit: 'cm',
      weight: isFiniteNumber(p.weight) ? p.weight : null,
      weightUnit: 'kg',
      activity: ['sedentary', 'moderate', 'heavy'].includes(p.activity) ? p.activity : null,
      clinicalNotes: p.clinicalNotes ?? p.clinical ?? '',
      pregnant: p.pregnant === true,
      lactating: p.lactating === true,
    },
    anthropometrics: {
      bmi: patientState.bmi === null ? null : round1(patientState.bmi),
      asianIndianCategory: patientState.bmiCategory,
      categorySource: 'Asian Indian Consensus Group action thresholds (overweight 23, obesity 25 kg/m²); standard adult underweight threshold <18.5 kg/m².',
      referenceCategory: 'Asian Indian action thresholds',
      calculationWeightKg,
      weightSource,
      weightMode,
      idealBodyWeightKg: idealBodyWeightKg === null ? null : round6(idealBodyWeightKg),
      adjustedBodyWeightKg: adjustedBodyWeightKg === null ? null : round6(adjustedBodyWeightKg),
      actualWeightKg: isFiniteNumber(p.weight) ? p.weight : null,
      clinicianOverrideRequired: false,
      adjustedWeightNote: 'IBW = height in metres squared × 22.5. ABW = IBW + 0.25 × (actual − IBW). Recommended mode uses actual weight below BMI 23 and ABW rounded to the nearest kilogram at BMI 23 or above.',
    },
    energy: { activityFactor: s.activityFactor, ter, unit: 'kcal/day', formula: 'calculation weight (kg) × clinician-selected activity factor (kcal/kg/day)' },
    macros: {
      percent: { carbs: s.carbs, protein: s.protein, fat: s.fat },
      exactGrams,
      roundedGrams,
      targetGrams,
      roundingApplied: s.roundMacroTargets,
      calculation: '4 kcal/g carbohydrate, 4 kcal/g protein, 9 kcal/g fat',
    },
    carbohydrateSplit,
    tolerances,
    ranges,
    fiber,
    fiberTarget: fiber.target,
    fiberTolerance: { ...s.fiberTolerance },
    ddp,
    warnings: [...warnings, ...(s.roundMacroTargets ? ['Macro targets are rounded to whole grams for the active prescription; exact values are also shown.'] : [])],
    errors,
    sources: PROTOCOL_SOURCES,
  };
}
