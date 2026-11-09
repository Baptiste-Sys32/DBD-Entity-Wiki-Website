var STORAGE_KEYS = {
  builds: 'dbd_builds_v1',
  matches: 'dbd_matches_v1',
  progression: 'dbd_progression_v1',
  settings: 'dbd_settings_v1',
  notes: 'dbd_notes_v1',
  lastContext: 'dbd_last_context_v1',
  worldle: 'dbd_worldle_v1',
  uiState: 'dbd_ui_state_v1'
};
var loadFromStorage = (key, fallback) => {
  try {
    var raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to parse local storage for', key, err);
    return fallback;
  }
};
var saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('Failed to save local storage for', key, err);
  }
};
var ensureOrderedSubset = function ensureOrderedSubset(value, allowed) {
  var fallback = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
  var source = Array.isArray(value) ? value : fallback;
  var seen = new Set();
  var ordered = [];
  source.forEach(entry => {
    if (allowed.includes(entry) && !seen.has(entry)) {
      seen.add(entry);
      ordered.push(entry);
    }
  });
  return ordered;
};
var ensureOrderedFullSet = function ensureOrderedFullSet(value, allowed) {
  var fallback = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
  var ordered = ensureOrderedSubset(value, allowed, fallback);
  allowed.forEach(entry => {
    if (!ordered.includes(entry)) ordered.push(entry);
  });
  return ordered;
};
