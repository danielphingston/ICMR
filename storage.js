const STORAGE_KEY = 'nourish-patients-v1';
const BACKUP_FORMAT = 'nourish-patients';
const BACKUP_VERSION = 1;
const forbiddenKeys = new Set(['__proto__', 'prototype', 'constructor']);
const dateFields = new Set([
  'date', 'dob', 'dateofbirth', 'createdat', 'updatedat', 'reviewedat',
  'exportedat', 'followupdate', 'labdate', 'archivedat', 'protocolreviewedat',
]);

function storage() {
  try {
    if (!globalThis.localStorage) throw new Error('Browser storage is unavailable.');
    return globalThis.localStorage;
  } catch (error) {
    throw new Error(`Patient storage is unavailable: ${error.message}`, { cause: error });
  }
}

function validateJsonValue(value, path = 'patient') {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (!(index in value)) throw new Error(`${path} cannot contain empty entries.`);
      validateJsonValue(value[index], `${path}[${index}]`);
    }
    return;
  }
  if (typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new Error(`${path} must contain only plain JSON data.`);
  }
  for (const [key, item] of Object.entries(value)) {
    if (forbiddenKeys.has(key)) throw new Error(`${path} contains an unsafe field name.`);
    if (dateFields.has(key.toLowerCase()) && item !== '' && item !== null && item !== undefined) {
      if (typeof item !== 'string' || !isValidDate(item)) throw new Error(`${path}.${key} must be a valid ISO date or date-time.`);
    }
    validateJsonValue(item, `${path}.${key}`);
  }
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(value)) return false;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return false;
  const time = value.slice(11, 19);
  if (time && time.split(':').some((part, index) => Number(part) > [23, 59, 59][index])) return false;
  return Number.isFinite(Date.parse(value));
}

function validatePatients(patients) {
  if (!Array.isArray(patients)) throw new Error('Patient data must be an array.');
  const ids = new Set();
  for (let index = 0; index < patients.length; index += 1) {
    if (!(index in patients)) throw new Error(`Patient list cannot contain an empty entry at index ${index}.`);
    const patient = patients[index];
    const label = `Patient at index ${index}`;
    validatePatientRecord(patient, label);
    const normalizedId = patient.id.trim();
    if (ids.has(normalizedId)) throw new Error(`${label} duplicates patient id "${normalizedId}".`);
    ids.add(normalizedId);
  }
  return patients;
}

function validateOptionalShape(patient, label) {
  if (patient.settings !== undefined) {
    if (!patient.settings || typeof patient.settings !== 'object' || Array.isArray(patient.settings) || Object.getPrototypeOf(patient.settings) !== Object.prototype) {
      throw new Error(`${label}.settings must be an object.`);
    }
    for (const key of ['carb', 'carbs', 'protein', 'fat']) {
      const value = patient.settings[key];
      if (value !== undefined && value !== null && (typeof value !== 'number' || !Number.isFinite(value))) {
        throw new Error(`${label}.settings.${key} must be a finite number or null.`);
      }
    }
  }
  for (const key of ['age', 'height', 'weight']) {
    const value = patient[key];
    if (value !== undefined && value !== null && (typeof value !== 'number' || !Number.isFinite(value))) {
      throw new Error(`${label}.${key} must be a finite number or null.`);
    }
  }
  if (patient.meals !== undefined) {
    if (!Array.isArray(patient.meals)) throw new Error(`${label}.meals must be an array.`);
    patient.meals.forEach((meal, index) => {
      const mealLabel = `${label}.meals[${index}]`;
      if (!meal || typeof meal !== 'object' || Array.isArray(meal) || Object.getPrototypeOf(meal) !== Object.prototype) {
        throw new Error(`${mealLabel} must be an object.`);
      }
      for (const key of ['id', 'label', 'time', 'note']) {
        if (meal[key] !== undefined && typeof meal[key] !== 'string') throw new Error(`${mealLabel}.${key} must be a string.`);
      }
      if (meal.percent !== undefined && meal.percent !== null && (typeof meal.percent !== 'number' || !Number.isFinite(meal.percent))) {
        throw new Error(`${mealLabel}.percent must be a finite number or null.`);
      }
    });
  }
  if (patient.portions !== undefined) {
    if (!patient.portions || typeof patient.portions !== 'object' || Array.isArray(patient.portions) || Object.getPrototypeOf(patient.portions) !== Object.prototype) {
      throw new Error(`${label}.portions must be an object.`);
    }
    for (const [key, value] of Object.entries(patient.portions)) {
      if (value !== null && (typeof value !== 'number' || !Number.isFinite(value))) {
        throw new Error(`${label}.portions.${key} must be a finite number or null.`);
      }
    }
  }
  if (patient.biochem !== undefined) {
    if (!patient.biochem || typeof patient.biochem !== 'object' || Array.isArray(patient.biochem) || Object.getPrototypeOf(patient.biochem) !== Object.prototype) {
      throw new Error(`${label}.biochem must be an object.`);
    }
  }
  if (patient.history !== undefined) {
    if (!Array.isArray(patient.history)) throw new Error(`${label}.history must be an array.`);
    validateReviewHistory(patient.history, `${label}.history`, { energyAndProtein: true, historyMustBeEmpty: true });
  }
  if (patient.protocolVersion !== undefined && patient.protocolVersion !== 1) {
    throw new Error(`${label}.protocolVersion must be 1.`);
  }
  if (patient.protocol !== undefined) validateProtocol(patient.protocol, `${label}.protocol`);
  if (patient.ddp !== undefined) validateNumberMap(patient.ddp, `${label}.ddp`);
  if (patient.distribution !== undefined) validateDistributionShape(patient.distribution, `${label}.distribution`);
  if (patient.protocolMeals !== undefined) validateProtocolMeals(patient.protocolMeals, `${label}.protocolMeals`);
  if (patient.protocolHistory !== undefined) {
    if (!Array.isArray(patient.protocolHistory)) throw new Error(`${label}.protocolHistory must be an array.`);
    validateReviewHistory(patient.protocolHistory, `${label}.protocolHistory`, {
      energyAndProtein: true,
      protocolHistoryMustBeEmpty: true,
    });
  }
}

function validateReviewHistory(history, path, snapshotOptions = {}) {
  history.forEach((entry, index) => {
    const entryPath = `${path}[${index}]`;
    requirePlainObject(entry, entryPath);
    if (typeof entry.reviewedAt !== 'string' || !isValidDate(entry.reviewedAt)) {
      throw new Error(`${entryPath}.reviewedAt must be a valid ISO date-time.`);
    }
    if (snapshotOptions.energyAndProtein) {
      for (const key of ['energy', 'protein']) {
        if (typeof entry[key] !== 'number' || !Number.isFinite(entry[key])) {
          throw new Error(`${entryPath}.${key} must be a finite number.`);
        }
      }
    }
    const snapshot = entry.snapshot;
    requirePlainObject(snapshot, `${entryPath}.snapshot`);
    validatePatientRecord(snapshot, `${entryPath}.snapshot`, {
      historyMustBeEmpty: true,
      protocolHistoryMustBeEmpty: true,
    });
  });
}

function validateDistributionShape(value, path) {
  requirePlainObject(value, path);
  for (const [foodId, allocation] of Object.entries(value)) {
    validateNumberMap(allocation, `${path}.${foodId}`);
  }
}

function validateProtocolMeals(meals, path) {
  if (!Array.isArray(meals) || meals.length < 1 || meals.length > 8) {
    throw new Error(`${path} must contain between 1 and 8 meals.`);
  }
  const ids = new Set();
  meals.forEach((meal, index) => {
    const mealPath = `${path}[${index}]`;
    requirePlainObject(meal, mealPath);
    if (typeof meal.id !== 'string' || !meal.id.trim()) throw new Error(`${mealPath}.id must be a nonblank string.`);
    if (ids.has(meal.id.trim())) throw new Error(`${mealPath}.id duplicates a meal id.`);
    ids.add(meal.id.trim());
    for (const key of ['label', 'time', 'note']) {
      if (typeof meal[key] !== 'string') throw new Error(`${mealPath}.${key} must be a string.`);
    }
  });
}

function requirePlainObject(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new Error(`${path} must be an object.`);
  }
}

function validateNullableNumbers(object, keys, path) {
  for (const key of keys) {
    const value = object[key];
    if (value !== undefined && value !== null && (typeof value !== 'number' || !Number.isFinite(value))) {
      throw new Error(`${path}.${key} must be a finite number or null.`);
    }
  }
}

function validateNumberMap(value, path) {
  requirePlainObject(value, path);
  for (const [key, item] of Object.entries(value)) {
    if (item !== null && (typeof item !== 'number' || !Number.isFinite(item))) {
      throw new Error(`${path}.${key} must be a finite number or null.`);
    }
  }
}

function validateProtocol(protocol, path) {
  requirePlainObject(protocol, path);
  if (protocol.protocolVersion !== undefined && protocol.protocolVersion !== 1) {
    throw new Error(`${path}.protocolVersion must be 1.`);
  }
  validateNullableNumbers(protocol, [
    'calculationWeight', 'activityFactor', 'carbs', 'protein', 'fat',
    'minorCHO', 'fiberTarget',
  ], path);
  if (protocol.roundMacroTargets !== undefined && typeof protocol.roundMacroTargets !== 'boolean') {
    throw new Error(`${path}.roundMacroTargets must be boolean.`);
  }
  if (protocol.matchMode !== undefined && !['allowances', 'exact'].includes(protocol.matchMode)) {
    throw new Error(`${path}.matchMode must be allowances or exact.`);
  }
  if (protocol.minorAllocations !== undefined) validateNumberMap(protocol.minorAllocations, `${path}.minorAllocations`);
  if (protocol.tolerances !== undefined) {
    requirePlainObject(protocol.tolerances, `${path}.tolerances`);
    validateNullableNumbers(protocol.tolerances, ['energy', 'carbs', 'protein', 'fat'], `${path}.tolerances`);
  }
  if (protocol.settings !== undefined) {
    requirePlainObject(protocol.settings, `${path}.settings`);
    const settings = protocol.settings;
    validateNullableNumbers(settings, [
      'calculationWeight', 'activityFactor', 'carbs', 'protein', 'fat',
      'minorCHO', 'fiberTarget',
    ], `${path}.settings`);
    for (const [key, expectedType] of [['roundMacroTargets', 'boolean']]) {
      if (settings[key] !== undefined && typeof settings[key] !== expectedType) {
        throw new Error(`${path}.settings.${key} must be ${expectedType}.`);
      }
    }
    if (settings.matchMode !== undefined && !['allowances', 'exact'].includes(settings.matchMode)) {
      throw new Error(`${path}.settings.matchMode must be allowances or exact.`);
    }
    if (settings.minorAllocations !== undefined) {
      validateNumberMap(settings.minorAllocations, `${path}.settings.minorAllocations`);
    }
    if (settings.tolerances !== undefined) {
      requirePlainObject(settings.tolerances, `${path}.settings.tolerances`);
      validateNullableNumbers(settings.tolerances, ['energy', 'carbs', 'protein', 'fat'], `${path}.settings.tolerances`);
    }
  }
  if (protocol.ddp !== undefined) validateNumberMap(protocol.ddp, `${path}.ddp`);
  if (protocol.distribution !== undefined) {
    validateDistributionShape(protocol.distribution, `${path}.distribution`);
  }
  if (protocol.protocolMeals !== undefined) {
    validateProtocolMeals(protocol.protocolMeals, `${path}.protocolMeals`);
  }
  if (protocol.protocolHistory !== undefined) {
    if (!Array.isArray(protocol.protocolHistory)) throw new Error(`${path}.protocolHistory must be an array.`);
    validateReviewHistory(protocol.protocolHistory, `${path}.protocolHistory`, {
      energyAndProtein: true,
      protocolHistoryMustBeEmpty: true,
    });
  }
}

function validatePatientRecord(patient, label, { historyMustBeEmpty = false, protocolHistoryMustBeEmpty = false } = {}) {
  if (!patient || typeof patient !== 'object' || Array.isArray(patient) || Object.getPrototypeOf(patient) !== Object.prototype) {
    throw new Error(`${label} must be a plain patient object.`);
  }
  if (typeof patient.id !== 'string' || !patient.id.trim()) throw new Error(`${label} needs a nonblank string id.`);
  if (patient.id.trim().toLowerCase() === 'demo' || (patient.demo !== undefined && patient.demo !== false)) {
    throw new Error(`${label} cannot be the demonstration patient.`);
  }
  if (typeof patient.name !== 'string' || !patient.name.trim()) throw new Error(`${label} needs a nonblank string name.`);
  if (historyMustBeEmpty && patient.history !== undefined && patient.history.length > 0) {
    throw new Error(`${label}.history must be empty inside a saved snapshot.`);
  }
  if (protocolHistoryMustBeEmpty && patient.protocolHistory !== undefined && patient.protocolHistory.length > 0) {
    throw new Error(`${label}.protocolHistory must be empty inside a saved snapshot.`);
  }
  if (protocolHistoryMustBeEmpty && patient.protocol?.protocolHistory !== undefined && patient.protocol.protocolHistory.length > 0) {
    throw new Error(`${label}.protocol.protocolHistory must be empty inside a saved snapshot.`);
  }
  validateOptionalShape(patient, label);
  validateJsonValue(patient, label);
}

export function loadPatients() {
  const store = storage();
  let raw;
  try { raw = store.getItem(STORAGE_KEY); } catch (error) {
    throw new Error(`Could not read patient data: ${error.message}`, { cause: error });
  }
  if (raw === null) return [];
  let patients;
  try { patients = JSON.parse(raw); } catch (error) {
    throw new Error('Saved patient data is damaged and could not be read. Export or recover a backup before saving new data.', { cause: error });
  }
  try { return validatePatients(patients); } catch (error) {
    throw new Error(`Saved patient data is invalid: ${error.message}`, { cause: error });
  }
}

export function savePatients(patients) {
  validatePatients(patients);
  const store = storage();
  let serialized;
  try { serialized = JSON.stringify(patients); } catch (error) {
    throw new Error(`Could not prepare patient data for saving: ${error.message}`, { cause: error });
  }
  try { store.setItem(STORAGE_KEY, serialized); } catch (error) {
    throw new Error(`Could not save patient data. Browser storage may be full or unavailable: ${error.message}`, { cause: error });
  }
}

export function exportBackup(patients = loadPatients()) {
  validatePatients(patients);
  return JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), patients }, null, 2);
}

export function parseBackup(text) {
  let backup;
  try { backup = JSON.parse(text); } catch (error) {
    throw new Error('Backup file is not valid JSON.', { cause: error });
  }
  if (!backup || typeof backup !== 'object' || Array.isArray(backup) || backup.format !== BACKUP_FORMAT) {
    throw new Error('This file is not a Nourish patient backup.');
  }
  if (backup.version !== BACKUP_VERSION) throw new Error(`Unsupported backup version: ${String(backup.version)}.`);
  if (backup.exportedAt !== undefined && !isValidDate(backup.exportedAt)) throw new Error('Backup export date is invalid.');
  return validatePatients(backup.patients);
}
