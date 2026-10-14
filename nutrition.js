/**
 * Local, clinician-facing nutrition planning helpers.
 *
 * Energy references and food-group quantities are derived from ICMR-NIN
 * material listed in SOURCES. This is a planning aid, not a diagnosis or a
 * substitute for individualized clinical judgment.
 */

const ADULT_REFERENCE_ENERGY = Object.freeze({
  male: Object.freeze({
    sedentary: Object.freeze({ kcal: 2110, kcalPerKg: 32 }),
    moderate: Object.freeze({ kcal: 2710, kcalPerKg: 42 }),
    heavy: Object.freeze({ kcal: 3470, kcalPerKg: 53 }),
  }),
  female: Object.freeze({
    sedentary: Object.freeze({ kcal: 1660, kcalPerKg: 30 }),
    moderate: Object.freeze({ kcal: 2130, kcalPerKg: 39 }),
    heavy: Object.freeze({ kcal: 2720, kcalPerKg: 49 }),
  }),
});

const WHO_BMI_CATEGORIES = Object.freeze([
  { max: 18.5, label: 'Underweight' },
  { max: 25, label: 'Normal weight' },
  { max: 30, label: 'Overweight' },
  { max: 35, label: 'Obesity class I' },
  { max: 40, label: 'Obesity class II' },
  { max: Infinity, label: 'Obesity class III' },
]);

export const SOURCES = Object.freeze([
  Object.freeze({
    id: 'icmr-nin-rda-ear-2020',
    title: 'ICMR-NIN Expert Group: Nutrient Requirements for Indians, RDA and EAR (2020), brief note',
    url: 'https://www.nin.res.in/rdabook/brief_note.pdf',
    supports: 'EAR use in individual menu planning; adult energy method and context; adult protein EAR/RDA context.',
  }),
  Object.freeze({
    id: 'icmr-nin-what-india-eats-2023',
    title: 'ICMR-NIN, What India Eats (short report; Table 8 reproduces 2020 adult EAR energy/activity values)',
    url: 'https://nin.res.in/downloads/What_India_Eats%20Report_13th_April_23.pdf',
    supports: 'Adult reference energy values: men 2110/2710/3470 kcal; women 1660/2130/2720 kcal for sedentary/moderate/heavy work.',
  }),
  Object.freeze({
    id: 'icmr-nin-dietary-guidelines-2024',
    title: 'ICMR-NIN Dietary Guidelines for Indians, 2024, Tables 1.2a and 1.2b',
    url: 'https://nin.res.in/dietaryguidelines/pdfjs/locale/DGI_2024.pdf',
    supports: 'My Plate for the Day 2,000 kcal food-group raw quantities and illustrative macro energy split.',
  }),
  Object.freeze({
    id: 'who-bmi',
    title: 'World Health Organization: BMI classification in adults (WHO expert report)',
    url: 'https://iris.who.int/bitstream/handle/10665/42665/WHO_TRS_916.pdf',
    supports: 'WHO adult BMI category cutoffs used for descriptive classification.',
  }),
]);

/**
 * NIN 2024 My Plate raw quantities for a 2,000 kcal day.
 * Vegetarian quantities use Table 1.2a. Non-vegetarian quantities use Table
 * 1.2b. These are food-group guides, not individually calculated macros.
 */
export const FOOD_GROUPS = Object.freeze({
  referenceKcal: 2000,
  vegetarian: Object.freeze([
    Object.freeze({ id: 'cereals', label: 'Cereals and millets', quantity: 250, unit: 'g raw/day', note: 'The final 2024 guidance suggests 20–30% of adult cereal raw weight should be millets.' }),
    Object.freeze({ id: 'pulses', label: 'Pulses', quantity: 85, unit: 'g raw/day', note: 'NIN notes eggs, fish or meat may substitute a portion of pulses.' }),
    Object.freeze({ id: 'milk-curd', label: 'Milk or curd', quantity: 300, unit: 'ml/day', note: '' }),
    Object.freeze({ id: 'vegetables', label: 'Vegetables, including green leafy vegetables', quantity: 400, unit: 'g/day', note: 'Excludes potato; NIN allows cooked vegetables or salad.' }),
    Object.freeze({ id: 'fruits', label: 'Fresh fruit', quantity: 100, unit: 'g/day', note: 'Prefer whole fresh fruit over juice.' }),
    Object.freeze({ id: 'nuts-seeds', label: 'Nuts and seeds', quantity: 35, unit: 'g/day', note: '' }),
    Object.freeze({ id: 'fats-oils', label: 'Fats and oils', quantity: 27, unit: 'g/day', note: 'Visible fats and oils.' }),
  ]),
  nonVegetarian: Object.freeze([
    Object.freeze({ id: 'cereals', label: 'Cereals and millets', quantity: 260, unit: 'g raw/day', note: 'The final 2024 guidance suggests 20–30% of adult cereal raw weight should be millets.' }),
    Object.freeze({ id: 'pulses', label: 'Pulses', quantity: 55, unit: 'g raw/day', note: '' }),
    Object.freeze({ id: 'meat', label: 'Chicken or meat', quantity: 70, unit: 'g raw/day', note: 'NIN Table 1.2b quantity; eggs/fish options appear in the My Plate guide.' }),
    Object.freeze({ id: 'milk-curd', label: 'Milk or curd', quantity: 300, unit: 'ml/day', note: '' }),
    Object.freeze({ id: 'vegetables', label: 'Vegetables, including green leafy vegetables', quantity: 400, unit: 'g/day', note: 'Excludes potato; NIN allows cooked vegetables or salad.' }),
    Object.freeze({ id: 'fruits', label: 'Fresh fruit', quantity: 100, unit: 'g/day', note: 'Prefer whole fresh fruit over juice.' }),
    Object.freeze({ id: 'nuts-seeds', label: 'Nuts and seeds', quantity: 30, unit: 'g/day', note: '' }),
    Object.freeze({ id: 'fats-oils', label: 'Fats and oils', quantity: 27, unit: 'g/day', note: 'Visible fats and oils.' }),
  ]),
});

export const DEFAULT_SETTINGS = Object.freeze({
  energyMethod: 'reference',
  weightBasis: 'actual',
  manualEnergy: 2000,
  carbs: 55,
  protein: 15,
  fat: 30,
});

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function rounded(value, places = 1) {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function bmiCategory(bmi) {
  return WHO_BMI_CATEGORIES.find(({ max }) => bmi < max)?.label ?? null;
}

function validatePatient(patient, errors, warnings) {
  const p = patient && typeof patient === 'object' ? patient : {};
  const age = p.age;
  const sex = p.sex;
  const height = p.height;
  const weight = p.weight;
  const activity = p.activity;

  if (!isFiniteNumber(age) || age < 0 || age > 120) errors.push('Age must be a number from 0 to 120 years.');
  if (!['female', 'male'].includes(sex)) errors.push("Sex must be 'female' or 'male' for the ICMR adult reference table.");
  if (!isFiniteNumber(height) || height < 80 || height > 250) errors.push('Height must be a number from 80 to 250 cm.');
  if (!isFiniteNumber(weight) || weight < 20 || weight > 350) errors.push('Weight must be a number from 20 to 350 kg.');
  if (!['sedentary', 'moderate', 'heavy'].includes(activity)) errors.push("Activity must be 'sedentary', 'moderate' or 'heavy'.");
  for (const flag of ['pregnant', 'lactating']) {
    if (p[flag] !== undefined && typeof p[flag] !== 'boolean') errors.push(`${flag} must be true or false.`);
  }
  if (p.biochem !== undefined && (p.biochem === null || typeof p.biochem !== 'object' || Array.isArray(p.biochem))) {
    errors.push('Biochemical observations must be an object of manually recorded values.');
  }

  if (isFiniteNumber(age) && age >= 0 && age < 18) warnings.push('This engine does not calculate adult plans for people under 18.');
  if (p.pregnant === true || p.lactating === true) warnings.push('Pregnancy and lactation require individualized planning; automatic energy and portions are withheld.');

  const validAnthropometry = isFiniteNumber(height) && height >= 80 && height <= 250 && isFiniteNumber(weight) && weight >= 20 && weight <= 350;
  if (!validAnthropometry) return null;
  // Adult BMI categories are not appropriate for children and adolescents.
  if (!isFiniteNumber(age) || age < 18) return null;

  const heightM = height / 100;
  const bmi = weight / (heightM ** 2);
  const minHealthyWeight = 18.5 * heightM ** 2;
  const maxHealthyWeight = 24.9 * heightM ** 2;
  const referenceWeight = 22.5 * heightM ** 2;
  const adjustedWeight = weight > referenceWeight + 1e-9 ? referenceWeight + 0.25 * (weight - referenceWeight) : null;
  return {
    bmi: rounded(bmi, 1),
    whoCategory: bmiCategory(bmi),
    healthyWeightKg: { min: rounded(minHealthyWeight, 1), max: rounded(maxHealthyWeight, 1) },
    referenceWeightKg: rounded(referenceWeight, 1),
    bmiReference: 'BMI 22.5 kg/m²',
    adjustedWeightKg: adjustedWeight === null ? null : rounded(adjustedWeight, 1),
    adjustedWeightSuggested: bmi >= 30 && adjustedWeight !== null,
    adjustedWeightNote: 'Optional clinical convention: BMI-22.5 reference weight + 0.25 × (actual − reference weight), only when actual weight exceeds reference weight. This is not an ICMR-NIN method.',
  };
}

function validateSettings(settings, errors) {
  const s = { ...DEFAULT_SETTINGS, ...(settings && typeof settings === 'object' ? settings : {}) };
  if (!['reference', 'scaled', 'manual'].includes(s.energyMethod)) errors.push("Energy method must be 'reference', 'scaled' or 'manual'.");
  if (!['actual', 'reference', 'adjusted'].includes(s.weightBasis)) errors.push("Weight basis must be 'actual', 'reference' or 'adjusted'.");
  if (s.energyMethod === 'manual' && (!isFiniteNumber(s.manualEnergy) || s.manualEnergy < 500 || s.manualEnergy > 10000)) {
    errors.push('Manual energy must be a number from 500 to 10,000 kcal/day.');
  }
  for (const key of ['carbs', 'protein', 'fat']) {
    if (!isFiniteNumber(s[key]) || s[key] < 0 || s[key] > 100) errors.push(`${key} macro percentage must be a number from 0 to 100.`);
  }
  if (['carbs', 'protein', 'fat'].every((key) => isFiniteNumber(s[key]) && s[key] >= 0 && s[key] <= 100)) {
    const total = s.carbs + s.protein + s.fat;
    if (Math.abs(total - 100) > 0.01) errors.push(`Macro percentages must sum to 100 (currently ${rounded(total, 2)}).`);
  }
  return s;
}

function energyRecommendation(patient, settings, anthropometrics, eligible, notes) {
  if (!eligible || !['female', 'male'].includes(patient.sex) || !['sedentary', 'moderate', 'heavy'].includes(patient.activity)) {
    return { kcal: null, method: null, label: null, referenceKcal: null, weightBasis: null, weightUsedKg: null, notes };
  }
  const reference = patient.age <= 60 ? ADULT_REFERENCE_ENERGY[patient.sex][patient.activity] : null;
  let kcal;
  let method;
  let label;
  let weightBasis = null;
  let weightUsedKg = null;
  if (settings.energyMethod === 'manual') {
    kcal = settings.manualEnergy;
    method = 'manual';
    label = 'Clinician-entered daily energy target';
  } else if (settings.energyMethod === 'scaled') {
    weightBasis = settings.weightBasis;
    const actualWeight = patient.weight;
    const referenceWeight = anthropometrics.referenceWeightKg;
    if (weightBasis === 'actual') weightUsedKg = actualWeight;
    if (weightBasis === 'reference') weightUsedKg = referenceWeight;
    if (weightBasis === 'adjusted') {
      // Common clinical convention only; not an ICMR-NIN recommendation.
      const heightM = patient.height / 100;
      const preciseReferenceWeight = 22.5 * heightM ** 2;
      weightUsedKg = preciseReferenceWeight + 0.25 * (actualWeight - preciseReferenceWeight);
      notes.push('Adjusted body weight uses the common clinical convention IBW + 0.25 × (actual − IBW); this convention is not specified by ICMR-NIN.');
    }
    kcal = reference.kcalPerKg * weightUsedKg;
    method = 'scaled-estimate';
    label = `Estimated by scaling the ICMR-NIN ${reference.kcalPerKg} kcal/kg/day reference using ${weightBasis} weight`;
  } else {
    kcal = reference.kcal;
    method = 'icmr-nin-adult-reference';
    label = 'ICMR-NIN 2020 adult estimated energy requirement reference';
    notes.push('Reference applies to healthy adults ages 18–60 at the selected activity level; it is a reference value, not an automatic prescription.');
  }
  return {
    kcal: Math.round(kcal),
    method,
    label,
    referenceKcal: reference?.kcal ?? null,
    referenceKcalPerKg: reference?.kcalPerKg ?? null,
    weightBasis,
    weightUsedKg: weightUsedKg === null ? null : rounded(weightUsedKg, 1),
    notes,
  };
}

/**
 * Assess an adult's planning inputs without diagnosing or interpreting labs.
 * Patient height is centimeters, weight kilograms and age years.
 */
export function calculateAssessment(patient, settings = DEFAULT_SETTINGS) {
  const errors = [];
  const warnings = [];
  const p = patient && typeof patient === 'object' ? patient : {};
  const anthropometrics = validatePatient(p, errors, warnings);
  const s = validateSettings(settings, errors);
  if (s.energyMethod === 'scaled' && s.weightBasis === 'adjusted' && anthropometrics && anthropometrics.adjustedWeightKg === null) {
    errors.push('Adjusted weight can be used only when actual weight exceeds the BMI-22.5 reference weight.');
  }
  const isAdult = isFiniteNumber(p.age) && p.age >= 18 && p.age <= 120;
  const hasReferenceAge = isAdult && p.age <= 60;
  const physiologyExcluded = p.pregnant === true || p.lactating === true;
  const eligibleAge = s.energyMethod === 'manual' ? isAdult : hasReferenceAge;
  let eligible = errors.length === 0 && eligibleAge && !physiologyExcluded && anthropometrics !== null;
  if (!isAdult && isFiniteNumber(p.age) && p.age >= 0 && p.age <= 120) {
    warnings.push('Automated calculations in this app are not available for people under 18.');
  } else if (!hasReferenceAge && isAdult && s.energyMethod !== 'manual') {
    warnings.push('ICMR-NIN activity-based adult reference and scaled estimates are available for ages 18–60; enter a clinician-selected manual target for older adults.');
  }
  const energyNotes = [];
  let energy = energyRecommendation(p, s, anthropometrics, eligible, energyNotes);
  if (energy.kcal !== null && (energy.kcal < 500 || energy.kcal > 10000)) {
    errors.push('Calculated energy is outside the supported 500–10,000 kcal/day range; use a clinician-selected manual target.');
    eligible = false;
    energy = energyRecommendation(p, s, anthropometrics, false, energyNotes);
  }
  const macros = energy.kcal === null ? null : {
    percent: { carbs: s.carbs, protein: s.protein, fat: s.fat },
    kcal: {
      carbs: rounded(energy.kcal * s.carbs / 100, 1),
      protein: rounded(energy.kcal * s.protein / 100, 1),
      fat: rounded(energy.kcal * s.fat / 100, 1),
    },
    grams: {
      carbs: rounded((energy.kcal * s.carbs / 100) / 4, 1),
      protein: rounded((energy.kcal * s.protein / 100) / 4, 1),
      fat: rounded((energy.kcal * s.fat / 100) / 9, 1),
    },
    calculation: '4 kcal/g carbohydrate, 4 kcal/g protein, 9 kcal/g fat',
    note: '55/15/30 is the app planning default; users may customize it. The split is not presented as an ICMR-NIN prescription.',
  };
  const status = errors.length ? 'invalid' : eligible ? 'eligible' : 'clinical-review-required';
  return {
    eligible,
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
      pregnant: p.pregnant === true,
      lactating: p.lactating === true,
    },
    anthropometrics: anthropometrics ? { ...anthropometrics, asianIndianActionPoints: null } : null,
    energy,
    macros,
    biochem: { recordedOnly: true, values: p.biochem && typeof p.biochem === 'object' && !Array.isArray(p.biochem) ? { ...p.biochem } : {} },
    validation: { errors, warnings },
    sources: SOURCES,
  };
}

/** Scale NIN 2024 My Plate raw quantities proportionally from its 2,000 kcal reference. */
export function calculatePortions(energy, options = {}) {
  if (!isFiniteNumber(energy) || energy < 500 || energy > 10000) {
    return { error: 'Energy must be a number from 500 to 10,000 kcal/day.', referenceKcal: FOOD_GROUPS.referenceKcal, targetKcal: null, scale: null, method: 'proportional-estimate', isEstimate: true, items: [] };
  }
  const dietType = options && options.dietType !== undefined ? options.dietType : 'vegetarian';
  if (!['vegetarian', 'nonVegetarian'].includes(dietType)) {
    return { error: "dietType must be 'vegetarian' or 'nonVegetarian'.", referenceKcal: FOOD_GROUPS.referenceKcal, targetKcal: energy, scale: null, method: 'proportional-estimate', isEstimate: true, items: [] };
  }
  const scale = energy / FOOD_GROUPS.referenceKcal;
  const groups = FOOD_GROUPS[dietType];
  return {
    error: null,
    dietType,
    referenceKcal: FOOD_GROUPS.referenceKcal,
    targetKcal: energy,
    scale: rounded(scale, 3),
    method: 'proportional-estimate',
    isEstimate: true,
    note: 'Proportional food-group estimates scaled from the NIN 2024 2,000 kcal My Plate. They do not guarantee a macro match or replace a clinician-designed diet.',
    items: groups.map((group) => ({
      id: group.id,
      label: group.label,
      quantity: rounded(group.quantity * scale, 1),
      unit: group.unit,
      referenceQuantity: group.quantity,
      referenceUnit: group.unit,
      note: group.note,
    })),
  };
}

/**
 * Allocate a total across meal percentages in tenths using the largest
 * remainder method. Returns one quantity per percentage, or [] for invalid
 * inputs. Accepted percentages may sum to within 0.01 percentage points of 100.
 */
export function allocateMealQuantities(total, percentages) {
  if (!isFiniteNumber(total) || total < 0 || !Array.isArray(percentages) || percentages.length === 0) return [];
  if (!percentages.every((percentage) => isFiniteNumber(percentage) && percentage >= 0 && percentage <= 100)) return [];

  const percentageSum = percentages.reduce((sum, percentage) => sum + percentage, 0);
  if (percentageSum <= 0 || Math.abs(percentageSum - 100) > 0.01) return [];

  const totalUnits = Math.round((total + Number.EPSILON) * 10);
  if (!Number.isFinite(totalUnits)) return [];
  const exactUnits = percentages.map((percentage) => totalUnits * percentage / percentageSum);
  const allocatedUnits = exactUnits.map(Math.floor);
  const fractions = exactUnits.map((units, index) => ({ index, fraction: units - allocatedUnits[index] }));
  let remainingUnits = totalUnits - allocatedUnits.reduce((sum, units) => sum + units, 0);
  fractions.sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let index = 0; remainingUnits > 0; index += 1, remainingUnits -= 1) {
    allocatedUnits[fractions[index % fractions.length].index] += 1;
  }

  return allocatedUnits.map((units) => units / 10);
}
