function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  useDeferredValue
} = React;
var getPerkCode = perkName => {
  if (!perkName) return '';
  var words = perkName.replace(/[^a-zA-Z\s]/g, '').split(/\s+/).filter(w => w.length > 0);
  if (words.length === 1) {
    return words[0].substring(0, 3).toUpperCase();
  }
  return words.map(w => w[0]).join('').toUpperCase();
};
var perkMatchesName = (perk, name) => {
  if (!perk || !name) return false;
  var target = String(name).toLowerCase();
  return perk.name.toLowerCase() === target || (perk.aliases || []).some(alias => alias.toLowerCase() === target);
};
var buildPerkLookup = perks => {
  var lookup = {};
  perks.forEach(p => {
    [p.name].concat(p.aliases || []).forEach(label => {
      var code = getPerkCode(label);
      if (!lookup[code]) lookup[code] = p;
    });
  });
  return lookup;
};
var encodeBuild = build => {
  try {
    var payload = {
      v: 2,
      n: build.name || 'Shared Build',
      r: build.role || 'Survivor',
      cId: build.characterId || null,
      cN: build.characterName || null,
      p: (build.perks || []).filter(Boolean).map(p => ({
        id: p.id || null,
        n: p.name || null
      })),
      a: (build.addons || []).filter(Boolean).map(addon => typeof addon === 'string' ? {
        n: addon
      } : {
        id: addon.id,
        n: addon.name
      }),
      i: build.item ? typeof build.item === 'string' ? {
        n: build.item
      } : {
        id: build.item.id,
        n: build.item.name
      } : null,
      o: build.offering ? typeof build.offering === 'string' ? {
        n: build.offering
      } : {
        id: build.offering.id,
        n: build.offering.name
      } : null,
      notes: build.notes || ''
    };
    return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  } catch (e) {
    console.error('Failed to encode build:', e);
    return null;
  }
};
var decodeBuild = function decodeBuild(code) {
  var lookups = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var {
    perks = [],
    killers = [],
    survivors = [],
    items = [],
    addons = [],
    offerings = []
  } = lookups;
  var warnings = [];
  try {
    var _character, _character2;
    if (code.includes('-') && !code.match(/^[A-Za-z0-9+/=]+$/)) {
      return decodeBuildV1(code, perks);
    }
    var jsonStr;
    var compactCode = String(code || '').replace(/\s+/g, '');
    if (!compactCode) {
      return {
        success: false,
        error: 'Invalid code format. Please check the code and try again.'
      };
    }
    if (compactCode.length > 65536) {
      return {
        success: false,
        error: 'This code is too large to import. Please check the code and try again.'
      };
    }
    try {
      jsonStr = decodeURIComponent(escape(atob(compactCode)));
    } catch (e) {
      return {
        success: false,
        error: 'Invalid code format. Please check the code and try again.'
      };
    }
    var payload;
    try {
      payload = JSON.parse(jsonStr);
    } catch (e) {
      return {
        success: false,
        error: 'Corrupted build data. The code may be incomplete.'
      };
    }
    if (!payload.v) {
      return {
        success: false,
        error: 'Unrecognized shared build format.'
      };
    }
    if (payload.v > 2) {
      return {
        success: false,
        error: "This shared build came from a newer website version (v".concat(payload.v, "). Please refresh the wiki.")
      };
    }
    var character = null;
    var characterList = payload.r === 'Killer' ? killers : survivors;
    if (payload.cId) {
      character = characterList.find(c => c.id === payload.cId);
    }
    if (!character && payload.cN) {
      character = characterList.find(c => c.name.toLowerCase() === payload.cN.toLowerCase());
      if (character) warnings.push("Character matched by name: ".concat(payload.cN));
    }
    var resolvedPerks = (payload.p || []).map((perkData, idx) => {
      if (perkData.id) {
        var found = perks.find(p => p.id === perkData.id);
        if (found) return {
          id: found.id,
          name: found.name
        };
      }
      if (perkData.n) {
        var _found = perks.find(p => perkMatchesName(p, perkData.n));
        if (_found) {
          warnings.push("Perk \"".concat(perkData.n, "\" matched by name"));
          return {
            id: _found.id,
            name: _found.name
          };
        }
      }
      warnings.push("Perk not found: ".concat(perkData.n || 'Unknown'));
      return null;
    }).filter(Boolean);
    var resolvedAddons = (payload.a || []).map(addonData => {
      if (addonData.id) {
        var found = addons.find(a => a.id === addonData.id);
        if (found) return found.name;
      }
      if (addonData.n) {
        var _found2 = addons.find(a => a.name.toLowerCase() === addonData.n.toLowerCase());
        if (_found2) return _found2.name;
        warnings.push("Addon not found in wiki data: ".concat(addonData.n));
        return addonData.n;
      }
      return null;
    }).filter(Boolean);
    var resolvedItem = null;
    if (payload.i) {
      if (payload.i.id) {
        var found = items.find(i => i.id === payload.i.id);
        if (found) resolvedItem = found.name;
      }
      if (!resolvedItem && payload.i.n) {
        var _found3 = items.find(i => i.name.toLowerCase() === payload.i.n.toLowerCase());
        resolvedItem = _found3 ? _found3.name : payload.i.n;
      }
    }
    var resolvedOffering = null;
    if (payload.o) {
      if (payload.o.id) {
        var _found4 = offerings.find(o => o.id === payload.o.id);
        if (_found4) resolvedOffering = _found4.name;
      }
      if (!resolvedOffering && payload.o.n) {
        var _found5 = offerings.find(o => o.name.toLowerCase() === payload.o.n.toLowerCase());
        resolvedOffering = _found5 ? _found5.name : payload.o.n;
      }
    }
    var build = {
      id: null,
      name: payload.n || 'Imported Build',
      role: payload.r || 'Survivor',
      characterId: ((_character = character) === null || _character === void 0 ? void 0 : _character.id) || '',
      characterName: ((_character2 = character) === null || _character2 === void 0 ? void 0 : _character2.name) || payload.cN || '',
      perks: resolvedPerks,
      addons: resolvedAddons,
      item: resolvedItem || '',
      offering: resolvedOffering || '',
      tags: ['imported'],
      notes: payload.notes || '',
      favorite: false
    };
    return {
      success: true,
      build,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  } catch (e) {
    console.error('Failed to decode build:', e);
    return {
      success: false,
      error: 'Could not import this shared build. Please check the text and try again.'
    };
  }
};
var decodeBuildV1 = (code, perks) => {
  try {
    if (!code || !code.includes('-')) {
      return {
        success: false,
        error: 'This older shared-build format is invalid.'
      };
    }
    var [roleCode, perkString] = code.split('-');
    var role = roleCode.toUpperCase() === 'K' ? 'Killer' : 'Survivor';
    if (perkString === 'EMPTY' || !perkString) {
      return {
        success: true,
        build: {
          id: null,
          name: "Imported ".concat(role, " Build"),
          role: role,
          characterName: '',
          characterId: '',
          perks: [],
          addons: [],
          item: '',
          offering: '',
          tags: ['imported', 'legacy'],
          notes: 'Imported from older shared-build format',
          favorite: false
        },
        warnings: ['Older format: only perks were imported']
      };
    }
    var lookup = buildPerkLookup(perks);
    var perkCodes = perkString.split('.');
    var resolvedPerks = [];
    var warnings = [];
    var _loop = function _loop() {
      var upperCode = pc.toUpperCase();
      if (lookup[upperCode]) {
        resolvedPerks.push({
          id: lookup[upperCode].id,
          name: lookup[upperCode].name
        });
      } else {
        var fuzzy = perks.find(p => [p.name].concat(p.aliases || []).some(label => getPerkCode(label) === upperCode));
        if (fuzzy) {
          resolvedPerks.push({
            id: fuzzy.id,
            name: fuzzy.name
          });
        } else {
          warnings.push("Could not match one perk entry: ".concat(pc));
        }
      }
    };
    for (var pc of perkCodes) {
      _loop();
    }
    return {
      success: true,
      build: {
        id: null,
        name: "Imported ".concat(role, " Build"),
        role: role,
        characterName: '',
        characterId: '',
        perks: resolvedPerks,
        addons: [],
        item: '',
        offering: '',
        tags: ['imported', 'legacy'],
        notes: 'Imported from older shared-build format',
        favorite: false
      },
      warnings: warnings.length > 0 ? [...warnings, 'Older format: only perks were imported'] : ['Older format: only perks were imported']
    };
  } catch (e) {
    console.error('Failed to decode v1 build:', e);
    return {
      success: false,
      error: 'Could not import this older shared build.'
    };
  }
};
var stripHtml = text => {
  if (!text) return '';
  try {
    return new DOMParser().parseFromString(text, 'text/html').documentElement.textContent.replace(/\s+/g, ' ').trim();
  } catch (_unused) {
    return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
};
var normalizePerkDescriptionText = function normalizePerkDescriptionText() {
  var text = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  if (!text) return '';
  return String(text).replace(/\r\n/g, '\n').split('\n').map(line => {
    var match = line.match(/^(\s*)(-\s+)?(.*)$/);
    var indent = (match === null || match === void 0 ? void 0 : match[1]) || '';
    var bullet = match !== null && match !== void 0 && match[2] ? '- ' : '';
    var body = stripHtml((match === null || match === void 0 ? void 0 : match[3]) || '').replace(/\s*\/\s*/g, '/').replace(/([0-9])\s*%/g, '$1%').replace(/([+\-][0-9]+)\s*%/g, '$1%');
    return body ? "".concat(indent).concat(bullet).concat(body) : '';
  }).join('\n').replace(/\n{3,}/g, '\n\n').trim();
};
var getPerkDescriptionMode = function getPerkDescriptionMode() {
  var settings = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return (settings === null || settings === void 0 ? void 0 : settings.perkDescriptionMode) === 'post95' ? 'post95' : 'legacy';
};
var getPerkLegacyDescription = perk => normalizePerkDescriptionText((perk === null || perk === void 0 ? void 0 : perk.description) || '');
var getPerkModernDescription = perk => normalizePerkDescriptionText((perk === null || perk === void 0 ? void 0 : perk.descriptionPost95) || '');
var getPerkActiveDescription = function getPerkActiveDescription(perk) {
  var settings = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  if (!perk) return '';
  var modern = getPerkModernDescription(perk);
  return getPerkDescriptionMode(settings) === 'post95' && modern ? modern : getPerkLegacyDescription(perk);
};
var getPerkSearchDescription = perk => {
  var descriptions = [getPerkLegacyDescription(perk), getPerkModernDescription(perk)].filter(Boolean);
  return [...new Set(descriptions)].join('\n');
};
var PERCENT_TOKEN_RE = /([+\-]?\d+(?:\.\d+)?(?:\s*\/\s*[+\-]?\d+(?:\.\d+)?)+\s*%|[+\-]?\d+(?:\.\d+)?\s*%)/g;
var isPercentToken = function isPercentToken() {
  var value = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  return /^([+\-]?\d+(?:\.\d+)?(?:\s*\/\s*[+\-]?\d+(?:\.\d+)?)+\s*%|[+\-]?\d+(?:\.\d+)?\s*%)$/.test(value);
};
var renderPerkDescriptionText = (text, accentColor) => {
  var parts = String(text).split(PERCENT_TOKEN_RE);
  return parts.map((part, idx) => isPercentToken(part) ? React.createElement("span", {
    key: idx,
    className: "font-bold",
    style: {
      color: accentColor
    }
  }, part) : React.createElement(React.Fragment, {
    key: idx
  }, part));
};
var PerkDescriptionBlock = _ref => {
  var {
    perk,
    settings = {},
    accentColor = 'var(--accent)',
    className = '',
    lineClassName = '',
    compactLines = null
  } = _ref;
  if (!perk) return null;
  var text = getPerkActiveDescription(perk, settings);
  if (!text) return null;
  var isRich = getPerkDescriptionMode(settings) === 'post95' && Boolean(getPerkModernDescription(perk));
  var lines = text.split('\n');
  if (compactLines) {
    var compactText = lines.filter(Boolean).slice(0, compactLines).map(line => line.replace(/^\s*-\s+/, '')).join(' ');
    return React.createElement("p", {
      className: className || lineClassName
    }, isRich ? renderPerkDescriptionText(compactText, accentColor) : compactText);
  }
  return React.createElement("div", {
    className: className
  }, lines.map((line, idx) => {
    if (!line.trim()) {
      return React.createElement("div", {
        key: "space-".concat(idx),
        className: "h-2"
      });
    }
    var bulletMatch = line.match(/^(\s*)-\s+(.*)$/);
    if (bulletMatch) {
      var depth = Math.max(0, Math.floor((bulletMatch[1] || '').length / 2));
      var content = bulletMatch[2];
      return React.createElement("div", {
        key: "line-".concat(idx),
        className: "flex items-start gap-2 ".concat(lineClassName),
        style: {
          marginLeft: "".concat(depth * 12, "px")
        }
      }, React.createElement("span", {
        className: "mt-0.5 text-zinc-500"
      }, "\u2022"), React.createElement("span", {
        className: "flex-1"
      }, isRich ? renderPerkDescriptionText(content, accentColor) : content));
    }
    return React.createElement("p", {
      key: "line-".concat(idx),
      className: lineClassName
    }, isRich ? renderPerkDescriptionText(line, accentColor) : line);
  }));
};
var RELEASE_DATE_MAP = (() => {
  if (typeof TIMELINE_DATA === 'undefined') return {};
  var map = {};
  TIMELINE_DATA.releases.forEach(release => {
    var date = release.date;
    (release.killers || []).forEach(k => {
      map[k.name] = date;
    });
    (release.survivors || []).forEach(s => {
      map[s.name] = date;
    });
  });
  return map;
})();
var RELEASE_INFO_MAP = (() => {
  if (typeof TIMELINE_DATA === 'undefined') return {};
  var map = {};
  TIMELINE_DATA.releases.forEach(release => {
    (release.killers || []).forEach(killer => {
      map[killer.name] = {
        year: Number(String(release.date || '').slice(0, 4)) || null,
        licensed: Boolean(killer.licensed),
        chapter: release.name || '',
        displayDate: release.displayDate || ''
      };
    });
  });
  return map;
})();
var WORLDLE_MODES = ['classic', 'emoji', 'survivorPerk', 'killerPerk', 'teachables'];
var STORAGE_KEY_ACHIEVEMENTS = 'dbd_achievements_progress';
var DEFAULT_PROGRESSION = {
  characters: {},
  perks: {},
  corePerkIds: [],
  cosmetics: [],
  challenges: [],
  achievements: {}
};
var DEFAULT_MATCH_PREFS = {
  lastRole: 'Survivor',
  lastCharacterId: null,
  lastBuildId: null,
  killerWinThreshold: 2
};
var APP_BACKUP_SCHEMA_VERSION = 1;
var createWorldleHistogram = () => ({
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
  6: 0,
  7: 0,
  8: 0,
  9: 0,
  10: 0,
  '11+': 0
});
var createWorldleStatsBucket = () => ({
  played: 0,
  solved: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastDailyDateKey: null,
  totalSolvedGuesses: 0,
  averageGuesses: 0,
  histogram: createWorldleHistogram()
});
var createWorldleHistoryShape = () => ({
  daily: [],
  practice: []
});
var createWorldleStateShape = () => ({
  daily: {},
  practice: {},
  stats: WORLDLE_MODES.reduce((acc, mode) => {
    acc[mode] = {
      daily: createWorldleStatsBucket(),
      practice: createWorldleStatsBucket()
    };
    return acc;
  }, {}),
  history: WORLDLE_MODES.reduce((acc, mode) => {
    acc[mode] = createWorldleHistoryShape();
    return acc;
  }, {})
});
var uuid = () => {
  var _crypto;
  return (_crypto = crypto) !== null && _crypto !== void 0 && _crypto.randomUUID ? crypto.randomUUID() : "id-".concat(Date.now().toString(36), "-").concat(Math.random().toString(16).slice(2));
};
var parseTags = function parseTags() {
  var val = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  return val.split(',').map(t => t.trim()).filter(Boolean);
};
var normalizeNotesStore = raw => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.entries(raw).reduce((acc, _ref2) => {
    var [key, value] = _ref2;
    acc[key] = typeof value === 'string' ? value : '';
    return acc;
  }, {});
};
var normalizeGuessToken = function normalizeGuessToken() {
  var value = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
};
var normalizeCosmeticsEntries = raw => {
  if (!Array.isArray(raw)) return [];
  return raw.map(entry => {
    if (!entry || typeof entry !== 'object') return null;
    if (!entry.id || !entry.name || !entry.baseCharacterId || !entry.baseCharacterName || !entry.baseCharacterType || !entry.groupKey || !entry.groupLabel || !entry.image) return null;
    var boundSlots = Array.isArray(entry.boundSlots) ? entry.boundSlots.filter(Boolean).map(slot => String(slot)) : [];
    var mode = String(entry.outfitLinkMode || '').toLowerCase();
    var isCharacterSwap = typeof entry.isCharacterSwap === 'boolean' ? entry.isCharacterSwap : mode === 'character_swap';
    var fallbackMode = isCharacterSwap ? 'character_swap' : boundSlots.length >= 2 ? 'linked' : boundSlots.length === 1 ? 'partially_linked' : 'unlinked';
    var outfitLinkMode = ['character_swap', 'linked', 'partially_linked', 'unlinked'].includes(mode) ? mode : fallbackMode;
    var bindSummary = entry.bindSummary ? String(entry.bindSummary) : boundSlots.length ? boundSlots.join(' + ') : '';
    var isLinkedSet = typeof entry.isLinkedSet === 'boolean' ? entry.isLinkedSet : !isCharacterSwap && outfitLinkMode !== 'unlinked';
    return {
      id: String(entry.id),
      name: String(entry.name),
      baseCharacterId: String(entry.baseCharacterId),
      baseCharacterName: String(entry.baseCharacterName),
      baseCharacterType: entry.baseCharacterType === 'Killer' ? 'Killer' : 'Survivor',
      groupKey: String(entry.groupKey),
      groupLabel: String(entry.groupLabel),
      collectionName: entry.collectionName ? String(entry.collectionName) : '',
      image: String(entry.image),
      aliases: Array.isArray(entry.aliases) ? entry.aliases.filter(Boolean).map(alias => String(alias)) : [],
      sourceKind: entry.sourceKind ? String(entry.sourceKind) : '',
      sourcePage: entry.sourcePage ? String(entry.sourcePage) : '',
      assetProvenance: entry.assetProvenance ? String(entry.assetProvenance) : '',
      status: entry.status ? String(entry.status) : 'blocked_art',
      rarity: entry.rarity ? String(entry.rarity) : '',
      outfitLinkMode,
      boundSlots,
      bindSummary,
      isLinkedSet,
      isCharacterSwap,
      pieceType: entry.pieceType ? String(entry.pieceType) : '',
      sourceBucket: entry.sourceBucket ? String(entry.sourceBucket) : '',
      description: entry.description ? String(entry.description) : ''
    };
  }).filter(Boolean);
};
var normalizeCosmeticsCatalog = raw => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      metadata: {},
      characterSwaps: [],
      fullSets: []
    };
  }
  return {
    metadata: raw.metadata && typeof raw.metadata === 'object' && !Array.isArray(raw.metadata) ? raw.metadata : {},
    characterSwaps: normalizeCosmeticsEntries(raw.characterSwaps),
    fullSets: normalizeCosmeticsEntries(raw.fullSets)
  };
};
var normalizeCommunityContentSnapshot = raw => {
  var _raw$addonTierlist, _raw$addonTierlist2, _raw$builds, _raw$builds2, _raw$builds3, _raw$builds4, _raw$characterInfo, _raw$characterInfo2, _raw$characterInfo3, _raw$beginnerGuides, _raw$tierlists, _raw$guideVault;
  var emptyShape = {
    generatedAt: '',
    metadata: {},
    links: [],
    addonTierlist: {
      title: '',
      notes: [],
      killers: [],
      stats: {}
    },
    builds: {
      lastUpdateLabel: '',
      roles: {
        killers: [],
        survivors: []
      },
      perkDetails: {
        killers: [],
        survivors: []
      },
      stats: {}
    },
    characterInfo: {
      title: '',
      description: '',
      killers: [],
      survivors: [],
      perks: [],
      stats: {}
    },
    beginnerGuides: {
      title: '',
      description: '',
      entries: [],
      stats: {}
    },
    tierlists: {
      title: '',
      description: '',
      entries: [],
      stats: {}
    },
    guideVault: {
      title: '',
      description: '',
      entries: [],
      stats: {}
    }
  };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return emptyShape;
  }
  return _objectSpread(_objectSpread(_objectSpread({}, emptyShape), raw), {}, {
    links: Array.isArray(raw.links) ? raw.links : [],
    addonTierlist: _objectSpread(_objectSpread(_objectSpread({}, emptyShape.addonTierlist), raw.addonTierlist && typeof raw.addonTierlist === 'object' ? raw.addonTierlist : {}), {}, {
      notes: Array.isArray((_raw$addonTierlist = raw.addonTierlist) === null || _raw$addonTierlist === void 0 ? void 0 : _raw$addonTierlist.notes) ? raw.addonTierlist.notes : [],
      killers: Array.isArray((_raw$addonTierlist2 = raw.addonTierlist) === null || _raw$addonTierlist2 === void 0 ? void 0 : _raw$addonTierlist2.killers) ? raw.addonTierlist.killers.map(killer => _objectSpread(_objectSpread({}, killer), {}, {
        addons: Array.isArray(killer === null || killer === void 0 ? void 0 : killer.addons) ? killer.addons : [],
        combos: Array.isArray(killer === null || killer === void 0 ? void 0 : killer.combos) ? killer.combos : []
      })) : []
    }),
    builds: _objectSpread(_objectSpread(_objectSpread({}, emptyShape.builds), raw.builds && typeof raw.builds === 'object' ? raw.builds : {}), {}, {
      roles: {
        killers: Array.isArray((_raw$builds = raw.builds) === null || _raw$builds === void 0 || (_raw$builds = _raw$builds.roles) === null || _raw$builds === void 0 ? void 0 : _raw$builds.killers) ? raw.builds.roles.killers : [],
        survivors: Array.isArray((_raw$builds2 = raw.builds) === null || _raw$builds2 === void 0 || (_raw$builds2 = _raw$builds2.roles) === null || _raw$builds2 === void 0 ? void 0 : _raw$builds2.survivors) ? raw.builds.roles.survivors : []
      },
      perkDetails: {
        killers: Array.isArray((_raw$builds3 = raw.builds) === null || _raw$builds3 === void 0 || (_raw$builds3 = _raw$builds3.perkDetails) === null || _raw$builds3 === void 0 ? void 0 : _raw$builds3.killers) ? raw.builds.perkDetails.killers : [],
        survivors: Array.isArray((_raw$builds4 = raw.builds) === null || _raw$builds4 === void 0 || (_raw$builds4 = _raw$builds4.perkDetails) === null || _raw$builds4 === void 0 ? void 0 : _raw$builds4.survivors) ? raw.builds.perkDetails.survivors : []
      }
    }),
    characterInfo: _objectSpread(_objectSpread(_objectSpread({}, emptyShape.characterInfo), raw.characterInfo && typeof raw.characterInfo === 'object' ? raw.characterInfo : {}), {}, {
      killers: Array.isArray((_raw$characterInfo = raw.characterInfo) === null || _raw$characterInfo === void 0 ? void 0 : _raw$characterInfo.killers) ? raw.characterInfo.killers : [],
      survivors: Array.isArray((_raw$characterInfo2 = raw.characterInfo) === null || _raw$characterInfo2 === void 0 ? void 0 : _raw$characterInfo2.survivors) ? raw.characterInfo.survivors : [],
      perks: Array.isArray((_raw$characterInfo3 = raw.characterInfo) === null || _raw$characterInfo3 === void 0 ? void 0 : _raw$characterInfo3.perks) ? raw.characterInfo.perks : []
    }),
    beginnerGuides: _objectSpread(_objectSpread(_objectSpread({}, emptyShape.beginnerGuides), raw.beginnerGuides && typeof raw.beginnerGuides === 'object' ? raw.beginnerGuides : {}), {}, {
      entries: Array.isArray((_raw$beginnerGuides = raw.beginnerGuides) === null || _raw$beginnerGuides === void 0 ? void 0 : _raw$beginnerGuides.entries) ? raw.beginnerGuides.entries : []
    }),
    tierlists: _objectSpread(_objectSpread(_objectSpread({}, emptyShape.tierlists), raw.tierlists && typeof raw.tierlists === 'object' ? raw.tierlists : {}), {}, {
      entries: Array.isArray((_raw$tierlists = raw.tierlists) === null || _raw$tierlists === void 0 ? void 0 : _raw$tierlists.entries) ? raw.tierlists.entries : []
    }),
    guideVault: _objectSpread(_objectSpread(_objectSpread({}, emptyShape.guideVault), raw.guideVault && typeof raw.guideVault === 'object' ? raw.guideVault : {}), {}, {
      entries: Array.isArray((_raw$guideVault = raw.guideVault) === null || _raw$guideVault === void 0 ? void 0 : _raw$guideVault.entries) ? raw.guideVault.entries : []
    })
  });
};
var normalizeSettings = raw => {
  var next = raw && typeof raw === 'object' ? raw : {};
  var rest = _objectSpread({}, next);
  delete rest.highContrast;
  var navOptionIds = ALL_NAV_OPTIONS.map(opt => opt.id);
  var normalizedNavItems = rest.navItemsCustomized === true ? ensureOrderedSubset(rest.navItems, navOptionIds, DEFAULT_SETTINGS.navItems) : [...DEFAULT_SETTINGS.navItems];
  var needsDefaultMigration = rest.settingsVersion !== DEFAULT_SETTINGS.settingsVersion;
  return _objectSpread(_objectSpread(_objectSpread({}, DEFAULT_SETTINGS), rest), {}, {
    settingsVersion: DEFAULT_SETTINGS.settingsVersion,
    perkDescriptionMode: needsDefaultMigration && (!rest.perkDescriptionMode || rest.perkDescriptionMode === 'legacy') ? DEFAULT_SETTINGS.perkDescriptionMode : rest.perkDescriptionMode,
    ownedOnlyGlobal: Boolean(rest.ownedOnlyGlobal),
    navItemsCustomized: rest.navItemsCustomized === true,
    navItems: normalizedNavItems,
    progressionTabOrder: ensureOrderedFullSet(rest.progressionTabOrder, PROGRESSION_TABS, DEFAULT_SETTINGS.progressionTabOrder)
  });
};
var normalizeMatchPrefs = raw => {
  var next = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  var threshold = Number(next.killerWinThreshold);
  return _objectSpread(_objectSpread(_objectSpread({}, DEFAULT_MATCH_PREFS), next), {}, {
    lastRole: String(next.lastRole || DEFAULT_MATCH_PREFS.lastRole).toLowerCase().includes('kill') ? 'Killer' : 'Survivor',
    lastCharacterId: next.lastCharacterId ? String(next.lastCharacterId) : null,
    lastBuildId: next.lastBuildId ? String(next.lastBuildId) : null,
    killerWinThreshold: Number.isFinite(threshold) && threshold >= 0 ? threshold : DEFAULT_MATCH_PREFS.killerWinThreshold
  });
};
var normalizeUiState = raw => {
  var next = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  var allowedViews = new Set(['home', 'settings', ...ARTICLE_VIEWS, ...ALL_NAV_OPTIONS.map(option => option.id)]);
  var context = next.context && typeof next.context === 'object' && !Array.isArray(next.context) ? next.context : {};
  var normalizedContext = {};
  ['search', 'mode', 'tab', 'targetId', 'targetType', 'id', 'cosmeticId', 'scroll'].forEach(key => {
    if (context[key]) normalizedContext[key] = String(context[key]);
  });
  return {
    view: allowedViews.has(next.view) ? next.view : 'home',
    context: normalizedContext,
    perkFilter: String(next.perkFilter || 'All'),
    perkSearch: String(next.perkSearch || '')
  };
};
var normalizePerkSnapshots = function normalizePerkSnapshots() {
  var snapshots = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  if (!Array.isArray(snapshots)) return [];
  return snapshots.map(perk => {
    if (!perk) return null;
    var id = perk.id || null;
    var name = perk.name || '';
    if (!name && !id) return null;
    return {
      id,
      name: name || id,
      type: perk.type || '',
      owner: perk.owner || ''
    };
  }).filter(Boolean);
};
var normalizeProgression = function normalizeProgression(raw) {
  var legacyAchievements = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var next = raw && typeof raw === 'object' ? raw : {};
  var challenges = Array.isArray(next.challenges) ? next.challenges : [];
  return _objectSpread(_objectSpread(_objectSpread({}, DEFAULT_PROGRESSION), next), {}, {
    characters: next.characters && typeof next.characters === 'object' && !Array.isArray(next.characters) ? next.characters : {},
    perks: next.perks && typeof next.perks === 'object' && !Array.isArray(next.perks) ? next.perks : {},
    corePerkIds: Array.isArray(next.corePerkIds) ? [...new Set(next.corePerkIds.filter(Boolean))] : [],
    cosmetics: Array.isArray(next.cosmetics) ? next.cosmetics : [],
    challenges: challenges.map(challenge => ({
      id: (challenge === null || challenge === void 0 ? void 0 : challenge.id) || uuid(),
      name: (challenge === null || challenge === void 0 ? void 0 : challenge.name) || '',
      description: (challenge === null || challenge === void 0 ? void 0 : challenge.description) || '',
      side: ['Killer', 'Survivor', 'any'].includes(challenge === null || challenge === void 0 ? void 0 : challenge.side) ? challenge.side : 'any',
      tags: Array.isArray(challenge === null || challenge === void 0 ? void 0 : challenge.tags) ? challenge.tags.filter(Boolean) : parseTags((challenge === null || challenge === void 0 ? void 0 : challenge.tags) || ''),
      buildId: (challenge === null || challenge === void 0 ? void 0 : challenge.buildId) || '',
      status: ['planned', 'active', 'completed'].includes(challenge === null || challenge === void 0 ? void 0 : challenge.status) ? challenge.status : 'planned'
    })),
    achievements: _objectSpread(_objectSpread({}, legacyAchievements && typeof legacyAchievements === 'object' ? legacyAchievements : {}), next.achievements && typeof next.achievements === 'object' && !Array.isArray(next.achievements) ? next.achievements : {})
  });
};
var normalizeWorldleHistogram = raw => {
  var fallback = createWorldleHistogram();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fallback;
  return Object.keys(fallback).reduce((acc, key) => {
    acc[key] = Number(raw[key]) || 0;
    return acc;
  }, {});
};
var normalizeWorldleStatsBucket = raw => {
  var next = raw && typeof raw === 'object' ? raw : {};
  var solved = Number(next.solved) || 0;
  var totalSolvedGuesses = Number(next.totalSolvedGuesses) || 0;
  return {
    played: Number(next.played) || 0,
    solved,
    currentStreak: Number(next.currentStreak) || 0,
    bestStreak: Number(next.bestStreak) || 0,
    lastDailyDateKey: typeof next.lastDailyDateKey === 'string' ? next.lastDailyDateKey : null,
    totalSolvedGuesses,
    averageGuesses: solved > 0 ? Number((totalSolvedGuesses / solved).toFixed(2)) : 0,
    histogram: normalizeWorldleHistogram(next.histogram)
  };
};
var normalizeWorldleEntry = entry => {
  if (!entry || typeof entry !== 'object') return null;
  return _objectSpread(_objectSpread({}, entry), {}, {
    guesses: Array.isArray(entry.guesses) ? entry.guesses : [],
    queue: Array.isArray(entry.queue) ? entry.queue : [],
    solvedIds: Array.isArray(entry.solvedIds) ? entry.solvedIds : [],
    revealedClues: Number(entry.revealedClues) || 0,
    emojiVariantId: entry.emojiVariantId || null,
    emojiClueSetId: entry.emojiClueSetId || null,
    emojiPermutation: Array.isArray(entry.emojiPermutation) && entry.emojiPermutation.length === 3 ? entry.emojiPermutation.map(value => Number(value) || 0) : null,
    emojiDisplay: Array.isArray(entry.emojiDisplay) ? entry.emojiDisplay.map(value => String(value || '')).slice(0, 3) : [],
    completedAt: entry.completedAt || null,
    failed: entry.failed === true,
    solved: entry.solved === true
  });
};
var normalizeWorldleState = raw => {
  var base = createWorldleStateShape();
  var next = raw && typeof raw === 'object' ? raw : {};
  WORLDLE_MODES.forEach(mode => {
    var _next$daily, _next$practice, _next$stats, _next$stats2, _next$history, _next$history2;
    base.daily[mode] = normalizeWorldleEntry((_next$daily = next.daily) === null || _next$daily === void 0 ? void 0 : _next$daily[mode]);
    base.practice[mode] = normalizeWorldleEntry((_next$practice = next.practice) === null || _next$practice === void 0 ? void 0 : _next$practice[mode]);
    base.stats[mode] = {
      daily: normalizeWorldleStatsBucket((_next$stats = next.stats) === null || _next$stats === void 0 || (_next$stats = _next$stats[mode]) === null || _next$stats === void 0 ? void 0 : _next$stats.daily),
      practice: normalizeWorldleStatsBucket((_next$stats2 = next.stats) === null || _next$stats2 === void 0 || (_next$stats2 = _next$stats2[mode]) === null || _next$stats2 === void 0 ? void 0 : _next$stats2.practice)
    };
    base.history[mode] = {
      daily: Array.isArray((_next$history = next.history) === null || _next$history === void 0 || (_next$history = _next$history[mode]) === null || _next$history === void 0 ? void 0 : _next$history.daily) ? next.history[mode].daily.slice(0, 30) : [],
      practice: Array.isArray((_next$history2 = next.history) === null || _next$history2 === void 0 || (_next$history2 = _next$history2[mode]) === null || _next$history2 === void 0 ? void 0 : _next$history2.practice) ? next.history[mode].practice.slice(0, 30) : []
    };
  });
  return base;
};
var createWebsiteBackupPayload = _ref3 => {
  var {
    settings,
    builds,
    matches,
    progression,
    notes,
    worldleState,
    matchPrefs,
    siteVersion = '',
    gameVersion = '',
    lastSynced = ''
  } = _ref3;
  return {
    schemaVersion: APP_BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    meta: {
      siteVersion,
      gameVersion,
      lastSynced
    },
    data: {
      settings: normalizeSettings(settings),
      builds: Array.isArray(builds) ? builds : [],
      matches: Array.isArray(matches) ? matches : [],
      progression: normalizeProgression(progression),
      notes: normalizeNotesStore(notes),
      worldle: normalizeWorldleState(worldleState),
      lastContext: normalizeMatchPrefs(matchPrefs)
    }
  };
};
var summarizeWebsiteBackupPayload = payload => {
  var _payload$meta, _payload$meta2, _payload$meta3;
  var data = payload !== null && payload !== void 0 && payload.data && typeof payload.data === 'object' ? payload.data : {};
  var progression = normalizeProgression(data.progression);
  var worldle = normalizeWorldleState(data.worldle);
  var worldleGamesPlayed = WORLDLE_MODES.reduce((total, mode) => {
    var _worldle$stats, _stats$daily, _stats$practice;
    var stats = (_worldle$stats = worldle.stats) === null || _worldle$stats === void 0 ? void 0 : _worldle$stats[mode];
    return total + (Number(stats === null || stats === void 0 || (_stats$daily = stats.daily) === null || _stats$daily === void 0 ? void 0 : _stats$daily.played) || 0) + (Number(stats === null || stats === void 0 || (_stats$practice = stats.practice) === null || _stats$practice === void 0 ? void 0 : _stats$practice.played) || 0);
  }, 0);
  var ownedCharacters = Object.values(progression.characters || {}).filter(entry => entry === null || entry === void 0 ? void 0 : entry.owned).length;
  return {
    schemaVersion: Number(payload === null || payload === void 0 ? void 0 : payload.schemaVersion) || 0,
    exportedAt: (payload === null || payload === void 0 ? void 0 : payload.exportedAt) || '',
    siteVersion: (payload === null || payload === void 0 || (_payload$meta = payload.meta) === null || _payload$meta === void 0 ? void 0 : _payload$meta.siteVersion) || (payload === null || payload === void 0 || (_payload$meta2 = payload.meta) === null || _payload$meta2 === void 0 ? void 0 : _payload$meta2.appVersion) || '',
    gameVersion: (payload === null || payload === void 0 || (_payload$meta3 = payload.meta) === null || _payload$meta3 === void 0 ? void 0 : _payload$meta3.gameVersion) || '',
    builds: Array.isArray(data.builds) ? data.builds.length : 0,
    matches: Array.isArray(data.matches) ? data.matches.length : 0,
    notes: Object.keys(normalizeNotesStore(data.notes)).length,
    ownedCharacters,
    challenges: Array.isArray(progression.challenges) ? progression.challenges.length : 0,
    worldleGamesPlayed
  };
};
var parseWebsiteBackupPayload = rawText => {
  var raw = typeof rawText === 'string' ? rawText.trim() : '';
  if (!raw) throw new Error('Paste a backup file before restoring.');
  var parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error('Backup file content is invalid.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Backup file format is invalid.');
  }
  var looksLikeDirectData = parsed.data === undefined && ['settings', 'builds', 'matches', 'progression', 'notes', 'worldle', 'lastContext'].some(key => key in parsed);
  var payload = looksLikeDirectData ? {
    schemaVersion: 0,
    exportedAt: '',
    meta: {},
    data: parsed
  } : parsed;
  if (!payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data)) {
    throw new Error('Backup file is missing required data.');
  }
  var backupSchemaVersion = Number(payload === null || payload === void 0 ? void 0 : payload.schemaVersion) || 0;
  if (backupSchemaVersion > APP_BACKUP_SCHEMA_VERSION) {
    throw new Error("This backup was created by a newer version (format v".concat(backupSchemaVersion, "). Please reload the page to get the latest version, then restore again."));
  }
  return {
    payload,
    summary: summarizeWebsiteBackupPayload(payload)
  };
};
var buildBackupFilename = payload => {
  var _payload$meta4, _payload$meta5;
  var stamp = String((payload === null || payload === void 0 ? void 0 : payload.exportedAt) || new Date().toISOString()).replace(/[:]/g, '-').replace(/\..+$/, '');
  var version = (payload === null || payload === void 0 || (_payload$meta4 = payload.meta) === null || _payload$meta4 === void 0 ? void 0 : _payload$meta4.siteVersion) || (payload === null || payload === void 0 || (_payload$meta5 = payload.meta) === null || _payload$meta5 === void 0 ? void 0 : _payload$meta5.appVersion) || 'backup';
  return "the-entity-wiki-".concat(version, "-").concat(stamp, ".json");
};
var downloadTextFile = function downloadTextFile(filename, text) {
  var mime = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'application/json';
  var blob = new Blob([text], {
    type: mime
  });
  var url = URL.createObjectURL(blob);
  var link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};
var buildDataLookups = _ref4 => {
  var {
    killers = [],
    survivors = [],
    perks = [],
    maps = [],
    builds = []
  } = _ref4;
  var charactersById = {};
  [...killers, ...survivors].forEach(character => {
    if (!(character !== null && character !== void 0 && character.id)) return;
    charactersById[character.id] = _objectSpread(_objectSpread({}, character), {}, {
      role: killers.some(killer => killer.id === character.id) ? 'Killer' : 'Survivor'
    });
  });
  var perksById = {};
  (perks || []).forEach(perk => {
    if (perk !== null && perk !== void 0 && perk.id) perksById[perk.id] = perk;
  });
  var mapsById = {};
  var mapNameLookup = {};
  (maps || []).forEach(map => {
    if (map !== null && map !== void 0 && map.id) mapsById[map.id] = map;
    if (map !== null && map !== void 0 && map.name) mapNameLookup[map.name.toLowerCase()] = map;
  });
  var buildsById = {};
  (builds || []).forEach(build => {
    if (build !== null && build !== void 0 && build.id) buildsById[build.id] = build;
  });
  return {
    charactersById,
    perksById,
    mapsById,
    mapNameLookup,
    buildsById
  };
};
var resolveOwnedState = _ref5 => {
  var {
    progression,
    killers = [],
    survivors = [],
    perks = []
  } = _ref5;
  var characterStates = (progression === null || progression === void 0 ? void 0 : progression.characters) || {};
  var ownedCharacterIds = new Set([...killers, ...survivors].filter(character => {
    var _characterStates$char;
    return characterStates === null || characterStates === void 0 || (_characterStates$char = characterStates[character.id]) === null || _characterStates$char === void 0 ? void 0 : _characterStates$char.owned;
  }).map(character => character.id));
  var characterNameToId = {};
  [...killers, ...survivors].forEach(character => {
    characterNameToId[character.name] = character.id;
  });
  var ownedPerkIds = new Set();
  (perks || []).forEach(perk => {
    if (!perk.owner || perk.owner === 'All Killers' || perk.owner === 'All Survivors') {
      ownedPerkIds.add(perk.id);
      return;
    }
    var ownerId = characterNameToId[perk.owner];
    var ownerState = ownerId ? characterStates === null || characterStates === void 0 ? void 0 : characterStates[ownerId] : null;
    var prestige = Number(ownerState === null || ownerState === void 0 ? void 0 : ownerState.prestige) || 0;
    if (ownerId && ownedCharacterIds.has(ownerId) && prestige >= 1) {
      ownedPerkIds.add(perk.id);
    }
  });
  return {
    ownedCharacterIds,
    ownedPerkIds,
    isCharacterOwned: id => ownedCharacterIds.has(id),
    isPerkOwned: id => ownedPerkIds.has(id),
    getCharacterPrestige: id => {
      var _characterStates$id;
      return Number(characterStates === null || characterStates === void 0 || (_characterStates$id = characterStates[id]) === null || _characterStates$id === void 0 ? void 0 : _characterStates$id.prestige) || 0;
    },
    getDerivedPerkTier: id => {
      var _characterStates$owne;
      var perk = (perks || []).find(entry => entry.id === id);
      if (!perk) return 0;
      if (!perk.owner || perk.owner === 'All Killers' || perk.owner === 'All Survivors') return 3;
      var ownerId = characterNameToId[perk.owner];
      if (!ownerId || !ownedCharacterIds.has(ownerId)) return 0;
      return Math.min(3, Number(characterStates === null || characterStates === void 0 || (_characterStates$owne = characterStates[ownerId]) === null || _characterStates$owne === void 0 ? void 0 : _characterStates$owne.prestige) || 0);
    },
    isAddonOwned: addon => {
      if (!addon) return false;
      if (addon.role === 'killer') {
        var ownerId = characterNameToId[addon.killerName];
        return ownerId ? ownedCharacterIds.has(ownerId) : false;
      }
      return true;
    }
  };
};
var WORLDLE_METADATA = typeof WORLDLE_DATA === 'undefined' ? {
  aliases: {},
  genders: {},
  emojiClues: {}
} : WORLDLE_DATA;
var WORLDLE_MODE_META = {
  classic: {
    label: 'Classic',
    queue: 'flex',
    accent: '#fafafa',
    description: 'Guess the killer from stats, release clues, and comparisons.'
  },
  emoji: {
    label: 'Emoji',
    queue: 'flex',
    accent: '#d4d4d8',
    description: 'Decode the clues to identify the killer.'
  },
  survivorPerk: {
    label: 'Survivor Perk',
    queue: 'flex',
    accent: '#a1a1aa',
    description: 'Identify a survivor perk from its icon.'
  },
  killerPerk: {
    label: 'Killer Perk',
    queue: 'flex',
    accent: '#fafafa',
    description: 'Identify a killer perk from its icon.'
  },
  teachables: {
    label: 'Teachables',
    queue: 'flex',
    accent: '#e4e4e7',
    description: 'Guess the three killer teachable perks for the featured killer.'
  }
};
var getWorldleDateKey = function getWorldleDateKey() {
  var date = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : new Date();
  var y = date.getFullYear();
  var m = String(date.getMonth() + 1).padStart(2, '0');
  var d = String(date.getDate()).padStart(2, '0');
  return "".concat(y, "-").concat(m, "-").concat(d);
};
var shiftWorldleDateKey = (dateKey, deltaDays) => {
  var parts = String(dateKey || '').split('-').map(Number);
  if (parts.length !== 3 || parts.some(part => !Number.isFinite(part))) return null;
  var shifted = new Date(parts[0], parts[1] - 1, parts[2]);
  shifted.setDate(shifted.getDate() + deltaDays);
  return getWorldleDateKey(shifted);
};
var hashString = function hashString() {
  var value = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  var hash = 2166136261;
  for (var i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash >>> 0);
};
var pickDeterministicEntry = function pickDeterministicEntry() {
  var items = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  var seed = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
  if (!Array.isArray(items) || items.length === 0) return null;
  return items[hashString(seed) % items.length];
};
var shuffleBySeed = function shuffleBySeed() {
  var items = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  var seed = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
  var copy = [...items];
  var localSeed = hashString(seed) || 1;
  for (var i = copy.length - 1; i > 0; i -= 1) {
    localSeed = (localSeed * 1664525 + 1013904223) % 4294967296;
    var j = localSeed % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};
var WORLDLE_EMOJI_PERMUTATIONS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
var normalizeWorldleEmojiClueSets = function normalizeWorldleEmojiClueSets() {
  var rawSets = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  if (Array.isArray(rawSets) && rawSets.every(entry => typeof entry === 'string')) {
    return rawSets.length >= 3 ? [{
      id: 'legacy-1',
      emojis: rawSets.slice(0, 3)
    }] : [];
  }
  if (!Array.isArray(rawSets)) return [];
  return rawSets.map((entry, index) => {
    if (Array.isArray(entry) && entry.every(item => typeof item === 'string')) {
      return entry.length >= 3 ? {
        id: "set-".concat(index + 1),
        emojis: entry.slice(0, 3)
      } : null;
    }
    if (!entry || typeof entry !== 'object') return null;
    var emojis = Array.isArray(entry.emojis) ? entry.emojis.map(item => String(item || '')).filter(Boolean).slice(0, 3) : [];
    if (emojis.length < 3) return null;
    return {
      id: entry.id || "set-".concat(index + 1),
      emojis
    };
  }).filter(Boolean);
};
var buildWorldleEmojiVariantId = _ref6 => {
  var {
    targetId,
    clueSetId,
    permutation = [0, 1, 2]
  } = _ref6;
  return "".concat(targetId, ":").concat(clueSetId, ":").concat(permutation.join(''));
};
var buildWorldleEmojiVariant = _ref7 => {
  var {
    target,
    clueSet,
    permutation = [0, 1, 2]
  } = _ref7;
  if (!target || !clueSet) return null;
  var ordered = Array.isArray(permutation) && permutation.length === 3 ? permutation.map(value => Number(value) || 0) : [0, 1, 2];
  var displayEmojis = ordered.map(index => clueSet.emojis[index] || '❔');
  return {
    variantId: buildWorldleEmojiVariantId({
      targetId: target.id,
      clueSetId: clueSet.id,
      permutation: ordered
    }),
    targetId: target.id,
    clueSetId: clueSet.id,
    permutation: ordered,
    displayEmojis
  };
};
var buildWorldleEmojiVariantCatalog = function buildWorldleEmojiVariantCatalog() {
  var killerCatalog = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  return killerCatalog.flatMap(target => (target.emojiSets || []).flatMap(clueSet => WORLDLE_EMOJI_PERMUTATIONS.map(permutation => buildWorldleEmojiVariant({
    target,
    clueSet,
    permutation
  })).filter(Boolean)));
};
var resolveWorldleEmojiVariantFromSession = _ref8 => {
  var {
    target,
    session,
    variantsById = {}
  } = _ref8;
  if (!target || !session) return null;
  if (session.emojiVariantId && variantsById[session.emojiVariantId]) {
    return variantsById[session.emojiVariantId];
  }
  var clueSet = (target.emojiSets || []).find(entry => entry.id === session.emojiClueSetId) || (target.emojiSets || [])[0];
  if (!clueSet) return null;
  return buildWorldleEmojiVariant({
    target,
    clueSet,
    permutation: Array.isArray(session.emojiPermutation) && session.emojiPermutation.length === 3 ? session.emojiPermutation : [0, 1, 2]
  });
};
var withWorldleEmojiVariantSession = _ref9 => {
  var {
    session,
    target,
    seed = '',
    forceVariantId = null,
    variantsById = {}
  } = _ref9;
  if (!session) return null;
  var variant = forceVariantId ? variantsById[forceVariantId] : null;
  if (!variant && target) {
    var clueSet = pickDeterministicEntry(target.emojiSets || [], "".concat(seed, ":set:").concat(target.id)) || (target.emojiSets || [])[0];
    var permutation = pickDeterministicEntry(WORLDLE_EMOJI_PERMUTATIONS, "".concat(seed, ":perm:").concat(target.id, ":").concat((clueSet === null || clueSet === void 0 ? void 0 : clueSet.id) || 'set-1')) || WORLDLE_EMOJI_PERMUTATIONS[0];
    variant = buildWorldleEmojiVariant({
      target,
      clueSet,
      permutation
    });
  }
  if (!variant) {
    return _objectSpread(_objectSpread({}, session), {}, {
      emojiVariantId: null,
      emojiClueSetId: null,
      emojiPermutation: [0, 1, 2],
      emojiDisplay: []
    });
  }
  return _objectSpread(_objectSpread({}, session), {}, {
    targetId: variant.targetId,
    emojiVariantId: variant.variantId,
    emojiClueSetId: variant.clueSetId,
    emojiPermutation: [...variant.permutation],
    emojiDisplay: [...variant.displayEmojis]
  });
};
var buildWorldleAliasMap = killer => {
  var aliases = new Set([killer.name, killer.name.replace(/^The\s+/, ''), killer.realName || '', ...((WORLDLE_METADATA.aliases || {})[killer.name] || [])]);
  return [...aliases].map(alias => alias && String(alias).trim()).filter(Boolean);
};
var buildWorldleKillerCatalog = function buildWorldleKillerCatalog() {
  var killers = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  return killers.map(killer => {
    var stats = KILLER_STATS[killer.name] || {};
    var release = RELEASE_INFO_MAP[killer.name] || {};
    var aliases = buildWorldleAliasMap(killer);
    return {
      id: killer.id,
      name: killer.name,
      realName: killer.realName || '',
      difficulty: killer.difficulty || 'unknown',
      height: stats.height || 'Unknown',
      speed: stats.speed || 'Unknown',
      terrorRadius: stats.terrorRadius || 'Unknown',
      releaseYear: release.year || null,
      licensed: release.licensed === true,
      gender: (WORLDLE_METADATA.genders || {})[killer.name] || 'Other',
      chapter: release.chapter || '',
      displayDate: release.displayDate || '',
      image: killer.image,
      aliases,
      aliasTokens: aliases.map(alias => normalizeGuessToken(alias)),
      emojiSets: normalizeWorldleEmojiClueSets((WORLDLE_METADATA.emojiClues || {})[killer.name])
    };
  }).filter(Boolean);
};
var buildWorldlePerkCatalog = function buildWorldlePerkCatalog() {
  var perks = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'Survivor';
  return perks.filter(perk => perk.type === type).map(perk => {
    var aliasTokens = [...new Set([perk.name].concat(perk.aliases || []).map(label => normalizeGuessToken(label)).filter(Boolean))];
    return {
      id: perk.id,
      name: perk.name,
      owner: perk.owner || '',
      type: perk.type,
      image: perk.image,
      aliasTokens
    };
  });
};
var buildTeachableCatalog = function buildTeachableCatalog() {
  var killers = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  var perks = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  return killers.map(killer => ({
    id: killer.id,
    name: killer.name,
    image: killer.image,
    aliases: buildWorldleAliasMap(killer),
    aliasTokens: buildWorldleAliasMap(killer).map(alias => normalizeGuessToken(alias)),
    teachables: perks.filter(perk => perk.owner === killer.name).map(perk => ({
      id: perk.id,
      name: perk.name,
      image: perk.image
    })).sort((a, b) => a.name.localeCompare(b.name))
  })).filter(entry => entry.teachables.length === 3);
};
var histogramBucketKey = guessCount => {
  var n = Number(guessCount) || 0;
  if (n <= 0) return '1';
  if (n >= 11) return '11+';
  return String(n);
};
var recordWorldleResult = (state, _ref10) => {
  var _next$stats$mode, _next$history$mode;
  var {
    mode,
    queue,
    result
  } = _ref10;
  var next = normalizeWorldleState(state);
  var bucket = ((_next$stats$mode = next.stats[mode]) === null || _next$stats$mode === void 0 ? void 0 : _next$stats$mode[queue]) || createWorldleStatsBucket();
  bucket.played += 1;
  if (result.solved) {
    bucket.solved += 1;
    bucket.totalSolvedGuesses += result.guessCount;
    bucket.averageGuesses = Number((bucket.totalSolvedGuesses / bucket.solved).toFixed(2));
    bucket.histogram[histogramBucketKey(result.guessCount)] += 1;
  }
  if (queue === 'daily') {
    var todayKey = getWorldleDateKey();
    var lastKey = bucket.lastDailyDateKey || null;
    if (result.solved && lastKey && lastKey !== todayKey && lastKey !== shiftWorldleDateKey(todayKey, -1)) {
      bucket.currentStreak = 0;
    }
    bucket.currentStreak = result.solved ? bucket.currentStreak + 1 : 0;
    bucket.bestStreak = Math.max(bucket.bestStreak, bucket.currentStreak);
    bucket.lastDailyDateKey = todayKey;
  }
  next.stats[mode][queue] = bucket;
  var history = Array.isArray((_next$history$mode = next.history[mode]) === null || _next$history$mode === void 0 ? void 0 : _next$history$mode[queue]) ? next.history[mode][queue] : [];
  next.history[mode][queue] = [result, ...history].slice(0, 30);
  return next;
};
var createDailyWorldleSession = function createDailyWorldleSession(mode) {
  var catalog = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  var dateKey = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : getWorldleDateKey();
  var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  var target = pickDeterministicEntry(catalog, "".concat(mode, ":").concat(dateKey));
  var session = {
    dateKey,
    targetId: (target === null || target === void 0 ? void 0 : target.id) || null,
    guesses: [],
    solvedIds: [],
    revealedClues: mode === 'emoji' ? 1 : 0,
    solved: false,
    failed: false,
    completedAt: null
  };
  if (mode === 'emoji') {
    return withWorldleEmojiVariantSession({
      session,
      target,
      seed: "".concat(mode, ":").concat(dateKey),
      variantsById: options.emojiVariantsById || {}
    });
  }
  return session;
};
var createPracticeWorldleSession = function createPracticeWorldleSession(mode) {
  var catalog = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  var seedKey = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : getWorldleDateKey();
  var round = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
  var options = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};
  if (mode === 'emoji') {
    var _options$emojiVariant;
    var _queue = shuffleBySeed((options.emojiVariants || []).map(item => item.variantId), "".concat(mode, ":practice:").concat(seedKey, ":").concat(round));
    var activeVariantId = _queue[0] || null;
    var activeVariant = activeVariantId ? (_options$emojiVariant = options.emojiVariantsById) === null || _options$emojiVariant === void 0 ? void 0 : _options$emojiVariant[activeVariantId] : null;
    var target = activeVariant ? catalog.find(entry => entry.id === activeVariant.targetId) : null;
    return withWorldleEmojiVariantSession({
      session: {
        seedKey,
        round,
        queue: _queue,
        targetId: (activeVariant === null || activeVariant === void 0 ? void 0 : activeVariant.targetId) || null,
        guesses: [],
        solvedIds: [],
        revealedClues: 1,
        solved: false,
        failed: false,
        completedAt: null
      },
      target,
      forceVariantId: activeVariantId,
      variantsById: options.emojiVariantsById || {}
    });
  }
  var queue = shuffleBySeed(catalog.map(item => item.id), "".concat(mode, ":practice:").concat(seedKey, ":").concat(round));
  return {
    seedKey,
    round,
    queue,
    targetId: queue[0] || null,
    guesses: [],
    solvedIds: [],
    revealedClues: mode === 'emoji' ? 1 : 0,
    solved: false,
    failed: false,
    completedAt: null
  };
};
var ensureWorldleSession = _ref11 => {
  var {
    state,
    mode,
    queue,
    catalog = [],
    dateKey = getWorldleDateKey(),
    options = {}
  } = _ref11;
  var next = normalizeWorldleState(state);
  if (queue === 'daily') {
    var _existing = next.daily[mode];
    var hasEmojiVariant = mode !== 'emoji' || (_existing === null || _existing === void 0 ? void 0 : _existing.emojiVariantId) && Array.isArray(_existing === null || _existing === void 0 ? void 0 : _existing.emojiDisplay) && _existing.emojiDisplay.length === 3;
    if (_existing && _existing.dateKey === dateKey && _existing.targetId && hasEmojiVariant) {
      return {
        state: next,
        session: _existing
      };
    }
    var _created = createDailyWorldleSession(mode, catalog, dateKey, options);
    next.daily[mode] = _created;
    return {
      state: next,
      session: _created
    };
  }
  var existing = next.practice[mode];
  var hasPracticeEmojiVariant = mode !== 'emoji' || (existing === null || existing === void 0 ? void 0 : existing.emojiVariantId);
  if (existing && existing.targetId && hasPracticeEmojiVariant) {
    return {
      state: next,
      session: existing
    };
  }
  var created = createPracticeWorldleSession(mode, catalog, dateKey, (existing === null || existing === void 0 ? void 0 : existing.round) || 0, options);
  next.practice[mode] = created;
  return {
    state: next,
    session: created
  };
};
var advancePracticeWorldleSession = _ref12 => {
  var {
    mode,
    state,
    catalog = [],
    dateKey = getWorldleDateKey(),
    options = {}
  } = _ref12;
  var next = normalizeWorldleState(state);
  var current = next.practice[mode] || createPracticeWorldleSession(mode, catalog, dateKey, 0, options);
  if (mode === 'emoji') {
    var _options$emojiVariant2;
    var _queue2 = Array.isArray(current.queue) ? current.queue.filter(id => id !== current.emojiVariantId) : [];
    var _round = Number(current.round) || 0;
    if (_queue2.length === 0) {
      _round += 1;
      _queue2 = shuffleBySeed((options.emojiVariants || []).map(item => item.variantId), "".concat(mode, ":practice:").concat(dateKey, ":").concat(_round));
    }
    var activeVariantId = _queue2[0] || null;
    var activeVariant = activeVariantId ? (_options$emojiVariant2 = options.emojiVariantsById) === null || _options$emojiVariant2 === void 0 ? void 0 : _options$emojiVariant2[activeVariantId] : null;
    var target = activeVariant ? catalog.find(entry => entry.id === activeVariant.targetId) : null;
    next.practice[mode] = withWorldleEmojiVariantSession({
      session: {
        seedKey: dateKey,
        round: _round,
        queue: _queue2,
        targetId: (activeVariant === null || activeVariant === void 0 ? void 0 : activeVariant.targetId) || null,
        guesses: [],
        solvedIds: [],
        revealedClues: 1,
        solved: false,
        failed: false,
        completedAt: null
      },
      target,
      forceVariantId: activeVariantId,
      variantsById: options.emojiVariantsById || {}
    });
    return next;
  }
  var queue = Array.isArray(current.queue) ? current.queue.filter(id => id !== current.targetId) : [];
  var round = Number(current.round) || 0;
  if (queue.length === 0) {
    round += 1;
    queue = shuffleBySeed(catalog.map(item => item.id), "".concat(mode, ":practice:").concat(dateKey, ":").concat(round));
  }
  next.practice[mode] = {
    seedKey: dateKey,
    round,
    queue,
    targetId: queue[0] || null,
    guesses: [],
    solvedIds: [],
    revealedClues: mode === 'emoji' ? 1 : 0,
    solved: false,
    failed: false,
    completedAt: null
  };
  return next;
};
var buildWorldleResultEntry = _ref13 => {
  var {
    mode,
    queue,
    target,
    guessCount,
    solved,
    dateKey,
    session,
    emojiVariant
  } = _ref13;
  return {
    mode,
    queue,
    puzzleKey: dateKey,
    targetSnapshot: target ? {
      id: target.id || null,
      name: target.name || '',
      owner: target.owner || '',
      type: target.type || '',
      image: target.image || ''
    } : null,
    emojiVariant: mode === 'emoji' ? {
      variantId: (emojiVariant === null || emojiVariant === void 0 ? void 0 : emojiVariant.variantId) || (session === null || session === void 0 ? void 0 : session.emojiVariantId) || null,
      clueSetId: (emojiVariant === null || emojiVariant === void 0 ? void 0 : emojiVariant.clueSetId) || (session === null || session === void 0 ? void 0 : session.emojiClueSetId) || null,
      permutation: Array.isArray(emojiVariant === null || emojiVariant === void 0 ? void 0 : emojiVariant.permutation) ? [...emojiVariant.permutation] : Array.isArray(session === null || session === void 0 ? void 0 : session.emojiPermutation) ? [...session.emojiPermutation] : [],
      displayEmojis: Array.isArray(emojiVariant === null || emojiVariant === void 0 ? void 0 : emojiVariant.displayEmojis) ? [...emojiVariant.displayEmojis] : Array.isArray(session === null || session === void 0 ? void 0 : session.emojiDisplay) ? [...session.emojiDisplay] : []
    } : null,
    guessCount,
    solved,
    failed: !solved,
    completedAt: new Date().toISOString()
  };
};
var resolveWorldleGuess = function resolveWorldleGuess() {
  var catalog = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  var input = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
  var token = normalizeGuessToken(input);
  if (!token) return null;
  return catalog.find(entry => Array.isArray(entry.aliasTokens) && entry.aliasTokens.includes(token)) || null;
};
var getWorldleCategoryPrefixToken = function getWorldleCategoryPrefixToken() {
  var label = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  var parts = String(label || '').split(':');
  if (parts.length < 2) return '';
  return normalizeGuessToken(parts[0]);
};
var getWorldleGuessEntityLabel = function getWorldleGuessEntityLabel() {
  var mode = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'classic';
  return mode === 'survivorPerk' || mode === 'killerPerk' || mode === 'teachables' ? 'perk' : 'killer';
};
var getLevenshteinDistance = function getLevenshteinDistance() {
  var a = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  var b = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;
  var matrix = Array.from({
    length: a.length + 1
  }, (_, rowIndex) => [rowIndex]);
  for (var columnIndex = 0; columnIndex <= b.length; columnIndex += 1) {
    matrix[0][columnIndex] = columnIndex;
  }
  for (var rowIndex = 1; rowIndex <= a.length; rowIndex += 1) {
    for (var _columnIndex = 1; _columnIndex <= b.length; _columnIndex += 1) {
      var cost = a[rowIndex - 1] === b[_columnIndex - 1] ? 0 : 1;
      matrix[rowIndex][_columnIndex] = Math.min(matrix[rowIndex - 1][_columnIndex] + 1, matrix[rowIndex][_columnIndex - 1] + 1, matrix[rowIndex - 1][_columnIndex - 1] + cost);
    }
  }
  return matrix[a.length][b.length];
};
var getWorldleGuessSuggestions = function getWorldleGuessSuggestions() {
  var catalog = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  var input = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
  var limit = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 3;
  var token = normalizeGuessToken(input);
  if (!token || token.length < 2) return [];
  var categoryPrefixMatches = catalog.filter(entry => getWorldleCategoryPrefixToken(entry.name) === token).sort((a, b) => a.name.localeCompare(b.name));
  if (categoryPrefixMatches.length > 1) {
    return categoryPrefixMatches.slice(0, limit).map(entry => ({
      entry,
      score: 0,
      distance: 0,
      leadingPrefix: true,
      reversePrefix: false,
      prefix: true,
      contains: false
    }));
  }
  return catalog.map(entry => {
    var aliasTokens = Array.isArray(entry.aliasTokens) && entry.aliasTokens.length ? entry.aliasTokens : [normalizeGuessToken(entry.name)];
    var best = null;
    aliasTokens.forEach(aliasToken => {
      if (!aliasToken) return;
      var leadingPrefix = aliasToken.startsWith(token);
      var reversePrefix = !leadingPrefix && token.startsWith(aliasToken);
      var prefix = leadingPrefix || reversePrefix;
      var contains = !prefix && (aliasToken.includes(token) || token.includes(aliasToken));
      var distance = getLevenshteinDistance(token, aliasToken);
      var threshold = Math.max(1, Math.min(3, Math.floor(Math.max(token.length, aliasToken.length) / 4)));
      if (!prefix && !contains && distance > threshold) return;
      var score = distance + Math.abs(aliasToken.length - token.length) * 0.15 - (leadingPrefix ? 1 : 0) - (contains ? 0.35 : 0) + (reversePrefix ? 0.45 : 0);
      if (!best || score < best.score) {
        best = {
          entry,
          score,
          distance,
          leadingPrefix,
          reversePrefix,
          prefix,
          contains
        };
      }
    });
    return best;
  }).filter(Boolean).sort((a, b) => {
    if (a.prefix !== b.prefix) return a.prefix ? -1 : 1;
    if (a.contains !== b.contains) return a.contains ? -1 : 1;
    if (a.distance !== b.distance) return a.distance - b.distance;
    if (a.score !== b.score) return a.score - b.score;
    return a.entry.name.localeCompare(b.entry.name);
  }).filter((candidate, index, array) => index === array.findIndex(other => other.entry.id === candidate.entry.id)).slice(0, limit);
};
var resolveWorldleGuessAttempt = function resolveWorldleGuessAttempt() {
  var catalog = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  var input = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
  var exact = resolveWorldleGuess(catalog, input);
  if (exact) {
    return {
      entry: exact,
      autoCorrected: false,
      correctedName: exact.name,
      suggestions: []
    };
  }
  var token = normalizeGuessToken(input);
  var suggestions = getWorldleGuessSuggestions(catalog, input, 3);
  if (!suggestions.length) {
    return {
      entry: null,
      autoCorrected: false,
      correctedName: '',
      suggestions: []
    };
  }
  var best = suggestions[0];
  var nextBest = suggestions[1] || null;
  var leadingPrefixMatches = suggestions.filter(candidate => candidate.leadingPrefix).length;
  var safeToAutoCorrect = token.length >= 3 && (best.leadingPrefix && leadingPrefixMatches === 1 && (!nextBest || !nextBest.leadingPrefix || best.distance + 1 < nextBest.distance) || best.distance <= 1 && (!nextBest || best.distance < nextBest.distance) || best.distance <= 2 && !best.contains && (!nextBest || best.distance + 2 <= nextBest.distance));
  if (safeToAutoCorrect) {
    return {
      entry: best.entry,
      autoCorrected: true,
      correctedName: best.entry.name,
      suggestions: suggestions.slice(1).map(candidate => candidate.entry.name)
    };
  }
  return {
    entry: null,
    autoCorrected: false,
    correctedName: '',
    suggestions: suggestions.map(candidate => candidate.entry.name)
  };
};
var countWorldleWrongGuesses = session => Array.isArray(session === null || session === void 0 ? void 0 : session.guesses) ? session.guesses.filter(guess => guess && guess.correct === false && guess.duplicate !== true).length : 0;
var createPerkSnapshotsFromBuild = function createPerkSnapshotsFromBuild(build) {
  var perksById = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  if (!build || !Array.isArray(build.perks)) return [];
  return build.perks.map(perk => {
    var resolved = (perk === null || perk === void 0 ? void 0 : perk.id) && perksById[perk.id] || null;
    var id = (resolved === null || resolved === void 0 ? void 0 : resolved.id) || (perk === null || perk === void 0 ? void 0 : perk.id) || null;
    var name = (resolved === null || resolved === void 0 ? void 0 : resolved.name) || (perk === null || perk === void 0 ? void 0 : perk.name) || '';
    if (!name && !id) return null;
    return {
      id,
      name: name || id,
      type: (resolved === null || resolved === void 0 ? void 0 : resolved.type) || '',
      owner: (resolved === null || resolved === void 0 ? void 0 : resolved.owner) || ''
    };
  }).filter(Boolean);
};
var normalizeMatchRecord = function normalizeMatchRecord(match) {
  var _match$characterSnaps, _match$characterSnaps2, _match$characterSnaps3, _match$characterSnaps4, _match$buildSnapshot, _match$buildSnapshot2;
  var lookups = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  if (!match || typeof match !== 'object') return null;
  var charactersById = lookups.charactersById || {};
  var mapsById = lookups.mapsById || {};
  var mapNameLookup = lookups.mapNameLookup || {};
  var buildsById = lookups.buildsById || {};
  var perksById = lookups.perksById || {};
  var linkedCharacter = match.characterId ? charactersById[match.characterId] : null;
  var matchedMap = match.mapId && mapsById[match.mapId] || match.mapNameSnapshot && mapNameLookup[(match.mapNameSnapshot || '').toLowerCase()] || match.map && mapNameLookup[(match.map || '').toLowerCase()] || null;
  var linkedBuild = match.buildId ? buildsById[match.buildId] : null;
  var mapNameSnapshot = (matchedMap === null || matchedMap === void 0 ? void 0 : matchedMap.name) || match.mapNameSnapshot || match.map || '';
  var mapId = (matchedMap === null || matchedMap === void 0 ? void 0 : matchedMap.id) || match.mapId || null;
  return _objectSpread(_objectSpread({}, match), {}, {
    id: match.id || uuid(),
    role: roleFromString(match.role),
    buildId: match.buildId || '',
    characterId: match.characterId || '',
    characterName: (linkedCharacter === null || linkedCharacter === void 0 ? void 0 : linkedCharacter.name) || match.characterName || ((_match$characterSnaps = match.characterSnapshot) === null || _match$characterSnaps === void 0 ? void 0 : _match$characterSnaps.name) || '',
    mapId,
    map: mapNameSnapshot,
    mapNameSnapshot,
    characterSnapshot: {
      id: (linkedCharacter === null || linkedCharacter === void 0 ? void 0 : linkedCharacter.id) || ((_match$characterSnaps2 = match.characterSnapshot) === null || _match$characterSnaps2 === void 0 ? void 0 : _match$characterSnaps2.id) || match.characterId || null,
      name: (linkedCharacter === null || linkedCharacter === void 0 ? void 0 : linkedCharacter.name) || ((_match$characterSnaps3 = match.characterSnapshot) === null || _match$characterSnaps3 === void 0 ? void 0 : _match$characterSnaps3.name) || match.characterName || 'Any',
      role: (linkedCharacter === null || linkedCharacter === void 0 ? void 0 : linkedCharacter.role) || roleFromString(((_match$characterSnaps4 = match.characterSnapshot) === null || _match$characterSnaps4 === void 0 ? void 0 : _match$characterSnaps4.role) || match.role)
    },
    buildSnapshot: {
      id: (linkedBuild === null || linkedBuild === void 0 ? void 0 : linkedBuild.id) || ((_match$buildSnapshot = match.buildSnapshot) === null || _match$buildSnapshot === void 0 ? void 0 : _match$buildSnapshot.id) || match.buildId || null,
      name: (linkedBuild === null || linkedBuild === void 0 ? void 0 : linkedBuild.name) || ((_match$buildSnapshot2 = match.buildSnapshot) === null || _match$buildSnapshot2 === void 0 ? void 0 : _match$buildSnapshot2.name) || ''
    },
    perkSnapshots: Array.isArray(match.perkSnapshots) && match.perkSnapshots.length > 0 ? normalizePerkSnapshots(match.perkSnapshots) : [],
    createdAt: match.createdAt || match.date || new Date().toISOString(),
    updatedAt: match.updatedAt || match.date || new Date().toISOString()
  });
};
var normalizeMatchRecords = function normalizeMatchRecords(records) {
  var lookups = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  return Array.isArray(records) ? records.map(record => normalizeMatchRecord(record, lookups)).filter(Boolean) : [];
};
var createMatchSnapshot = function createMatchSnapshot(form) {
  var _form$characterSnapsh, _form$characterSnapsh2, _form$characterSnapsh3, _form$buildSnapshot, _form$buildSnapshot2;
  var lookups = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var charactersById = lookups.charactersById || {};
  var mapsById = lookups.mapsById || {};
  var buildsById = lookups.buildsById || {};
  var perksById = lookups.perksById || {};
  var selectedCharacter = form.characterId ? charactersById[form.characterId] : null;
  var selectedMap = form.mapId ? mapsById[form.mapId] : null;
  var selectedBuild = form.buildId ? buildsById[form.buildId] : null;
  var preservedPerkSnapshots = normalizePerkSnapshots(form.perkSnapshots);
  return _objectSpread(_objectSpread({}, form), {}, {
    role: roleFromString(form.role),
    characterName: (selectedCharacter === null || selectedCharacter === void 0 ? void 0 : selectedCharacter.name) || form.characterName || '',
    mapId: (selectedMap === null || selectedMap === void 0 ? void 0 : selectedMap.id) || form.mapId || null,
    map: (selectedMap === null || selectedMap === void 0 ? void 0 : selectedMap.name) || form.mapNameSnapshot || form.map || '',
    mapNameSnapshot: (selectedMap === null || selectedMap === void 0 ? void 0 : selectedMap.name) || form.mapNameSnapshot || form.map || '',
    characterSnapshot: {
      id: (selectedCharacter === null || selectedCharacter === void 0 ? void 0 : selectedCharacter.id) || ((_form$characterSnapsh = form.characterSnapshot) === null || _form$characterSnapsh === void 0 ? void 0 : _form$characterSnapsh.id) || form.characterId || null,
      name: (selectedCharacter === null || selectedCharacter === void 0 ? void 0 : selectedCharacter.name) || ((_form$characterSnapsh2 = form.characterSnapshot) === null || _form$characterSnapsh2 === void 0 ? void 0 : _form$characterSnapsh2.name) || form.characterName || 'Any',
      role: (selectedCharacter === null || selectedCharacter === void 0 ? void 0 : selectedCharacter.role) || roleFromString(((_form$characterSnapsh3 = form.characterSnapshot) === null || _form$characterSnapsh3 === void 0 ? void 0 : _form$characterSnapsh3.role) || form.role)
    },
    buildSnapshot: {
      id: (selectedBuild === null || selectedBuild === void 0 ? void 0 : selectedBuild.id) || ((_form$buildSnapshot = form.buildSnapshot) === null || _form$buildSnapshot === void 0 ? void 0 : _form$buildSnapshot.id) || form.buildId || null,
      name: (selectedBuild === null || selectedBuild === void 0 ? void 0 : selectedBuild.name) || ((_form$buildSnapshot2 = form.buildSnapshot) === null || _form$buildSnapshot2 === void 0 ? void 0 : _form$buildSnapshot2.name) || ''
    },
    perkSnapshots: selectedBuild ? createPerkSnapshotsFromBuild(selectedBuild, perksById) : preservedPerkSnapshots
  });
};
var isMatchWin = function isMatchWin(match) {
  var _prefs$killerWinThres;
  var prefs = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var killThreshold = (_prefs$killerWinThres = prefs === null || prefs === void 0 ? void 0 : prefs.killerWinThreshold) !== null && _prefs$killerWinThres !== void 0 ? _prefs$killerWinThres : 2;
  if (match.role === 'Killer') return (Number(match.kills) || 0) >= killThreshold && !match.dc;
  var outcome = (match.outcome || '').toLowerCase();
  return outcome.includes('escape');
};
var getMatchCharacterLabel = match => {
  var _match$characterSnaps5;
  return (match === null || match === void 0 || (_match$characterSnaps5 = match.characterSnapshot) === null || _match$characterSnaps5 === void 0 ? void 0 : _match$characterSnaps5.name) || (match === null || match === void 0 ? void 0 : match.characterName) || 'Any';
};
var getMatchBuildLabel = match => {
  var _match$buildSnapshot3;
  return (match === null || match === void 0 || (_match$buildSnapshot3 = match.buildSnapshot) === null || _match$buildSnapshot3 === void 0 ? void 0 : _match$buildSnapshot3.name) || 'Unlinked Build';
};
var getMatchMapLabel = match => (match === null || match === void 0 ? void 0 : match.mapNameSnapshot) || (match === null || match === void 0 ? void 0 : match.map) || 'Unknown Map';
var formatDate = iso => {
  if (!iso) return '';
  var d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
};
var roleFromString = role => role && role.toLowerCase().includes('kill') ? 'Killer' : 'Survivor';
var MAP_LAYOUTS = {
  "Coal Tower": [{
    path: "map_layouts_hens/coal_tower.webp",
    label: "Variation I"
  }, {
    path: "map_layouts_hens/coal_tower_ii.webp",
    label: "Variation II"
  }],
  "Groaning Storehouse": [{
    path: "map_layouts_hens/groaning_storehouse.webp",
    label: "Variation I"
  }, {
    path: "map_layouts_hens/groaning_storehouse_ii.webp",
    label: "Variation II"
  }],
  "Ironworks of Misery": [{
    path: "map_layouts_hens/ironworks_of_misery.webp",
    label: "Variation I"
  }, {
    path: "map_layouts_hens/ironworks_of_misery_ii.webp",
    label: "Variation II"
  }],
  "Shelter Woods": [{
    path: "map_layouts_hens/shelter_woods.webp",
    label: "Variation I"
  }, {
    path: "map_layouts_hens/shelter_woods_ii.webp",
    label: "Variation II"
  }],
  "Suffocation Pit": [{
    path: "map_layouts_hens/suffocation_pit.webp",
    label: "Variation I"
  }, {
    path: "map_layouts_hens/suffocation_pit_ii.webp",
    label: "Variation II"
  }],
  "Azarov's Resting Place": [{
    path: "map_layouts_hens/azarovs_resting_place.webp",
    label: ""
  }],
  "Blood Lodge": [{
    path: "map_layouts_hens/blood_lodge.webp",
    label: ""
  }],
  "Gas Heaven": [{
    path: "map_layouts_hens/gas_heaven.webp",
    label: ""
  }],
  "Wreckers' Yard": [{
    path: "map_layouts_hens/wreckers.webp",
    label: ""
  }],
  "Wretched Shop": [{
    path: "map_layouts_hens/wretched_shop.webp",
    label: ""
  }],
  "Fractured Cowshed": [{
    path: "map_layouts_hens/fractured_cowshed.webp",
    label: ""
  }],
  "Rancid Abattoir": [{
    path: "map_layouts_hens/rancid_abbatoir.webp",
    label: ""
  }],
  "Rotten Fields": [{
    path: "map_layouts_hens/rotten_fields.webp",
    label: ""
  }],
  "The Thompson House": [{
    path: "map_layouts_hens/the_thompson_house.webp",
    label: ""
  }],
  "Torment Creek": [{
    path: "map_layouts_hens/torment_creek.webp",
    label: ""
  }],
  "Disturbed Ward": [{
    path: "map_layouts_hens/disturbed_ward.webp",
    label: ""
  }],
  "Father Campbell's Chapel": [{
    path: "map_layouts_hens/father_campbells_chapel.webp",
    label: ""
  }],
  "Grim Pantry": [{
    path: "map_layouts_hens/grim_pantry.webp",
    label: ""
  }],
  "The Pale Rose": [{
    path: "map_layouts_hens/pale_rose.webp",
    label: ""
  }],
  "Badham Preschool I": [{
    path: "map_layouts_hens/preschool1.webp",
    label: ""
  }],
  "Badham Preschool II": [{
    path: "map_layouts_hens/preschool2.webp",
    label: ""
  }],
  "Badham Preschool III": [{
    path: "map_layouts_hens/preschool3.webp",
    label: ""
  }],
  "Badham Preschool IV": [{
    path: "map_layouts_hens/preschool4.webp",
    label: ""
  }],
  "Badham Preschool V": [{
    path: "map_layouts_hens/preschool5.webp",
    label: ""
  }],
  "Lampkin Lane": [{
    path: "map_layouts_hens/haddonfield.webp",
    label: ""
  }],
  "The Game": [{
    path: "map_layouts_hens/the_game.webp",
    label: ""
  }],
  "Treatment Theatre": [{
    path: "map_layouts_hens/lerys.webp",
    label: ""
  }],
  "Treatment Theater": [{
    path: "map_layouts_hens/lerys.webp",
    label: ""
  }],
  "Mount Ormond Resort": [{
    path: "map_layouts_hens/ormond.webp",
    label: "Variation I"
  }, {
    path: "map_layouts_hens/ormond_ii.webp",
    label: "Variation II"
  }, {
    path: "map_layouts_hens/ormond_iii.webp",
    label: "Variation III"
  }],
  "Ormond Lake Mine": [{
    path: "map_layouts_hens/ormond_lake_mine.webp",
    label: ""
  }],
  "Family Residence": [{
    path: "map_layouts_hens/family_residence.webp",
    label: "Variation I"
  }, {
    path: "map_layouts_hens/family_residence_ii.webp",
    label: "Variation II"
  }],
  "Sanctum of Wrath": [{
    path: "map_layouts_hens/sanctum_of_wrath.webp",
    label: "Variation I"
  }, {
    path: "map_layouts_hens/sanctum_of_wrath_ii.webp",
    label: "Variation II"
  }],
  "Mother's Dwelling": [{
    path: "map_layouts_hens/mothers_dwelling.webp",
    label: ""
  }],
  "Temple of Purgation": [{
    path: "map_layouts_hens/temple_of_purgation.webp",
    label: ""
  }],
  "Midwich Elementary School": [{
    path: "map_layouts/midwichelementaryschooloutlinelowerfloor.png",
    label: "Lower Floor"
  }, {
    path: "map_layouts/midwichelementaryschooloutlineupperfloors.png",
    label: "Upper Floor"
  }],
  "Dead Dawg Saloon": [{
    path: "map_layouts_hens/dead_dawg_saloon.webp",
    label: ""
  }],
  "Raccoon City Police Station": [{
    path: "map_layouts_hens/rpd_east_wing.webp",
    label: "East Wing"
  }, {
    path: "map_layouts_hens/rpd_west_wing.webp",
    label: "West Wing"
  }],
  "Raccoon City Police Station East Wing": [{
    path: "map_layouts_hens/rpd_east_wing.webp",
    label: ""
  }],
  "Raccoon City Police Station West Wing": [{
    path: "map_layouts_hens/rpd_west_wing.webp",
    label: ""
  }],
  "Eyrie of Crows": [{
    path: "map_layouts_hens/eyrie_of_crows.webp",
    label: ""
  }],
  "Garden of Joy": [{
    path: "map_layouts_hens/garden_of_joy.webp",
    label: ""
  }],
  "Shattered Square": [{
    path: "map_layouts_hens/shattered_square.webp",
    label: ""
  }],
  "Greenville Square": [{
    path: "map_layouts_hens/greenville_square.webp",
    label: ""
  }],
  "Toba Landing": [{
    path: "map_layouts_hens/toba_landing.webp",
    label: ""
  }],
  "Nostromo Wreckage": [{
    path: "map_layouts_hens/nostromo_wreckage.webp",
    label: ""
  }],
  "Forgotten Ruins": [{
    path: "map_layouts_hens/forgotten_ruins.webp",
    label: ""
  }],
  "Freddy Fazbear's Pizza": [{
    path: "map_layouts_hens/freddy_fazbears_pizza.webp",
    label: ""
  }],
  "Fallen Refuge": [{
    path: "map_layouts_hens/fallen_refuge.webp",
    label: ""
  }],
  "Dead Sands": [{
    path: "map_layouts_hens/dead_sands.webp",
    label: ""
  }],
  "The Underground Complex": [{
    path: "map_layouts_hens/the_underground_complex.webp",
    label: ""
  }],
  "Trickster's Delusion": [{
    path: "map_layouts_hens/tricksters_delusion.webp",
    label: ""
  }]
};
var normalizeMapLayoutName = value => String(value || '').replace(/\u2019/g, "'").replace(/\s+/g, ' ').trim();
var getMapLayoutsForName = mapName => {
  var normalized = normalizeMapLayoutName(mapName);
  var direct = MAP_LAYOUTS[normalized];
  if (Array.isArray(direct)) return direct;
  var withoutThe = normalized.replace(/^The\s+/i, '').trim();
  var noTheMatch = MAP_LAYOUTS[withoutThe];
  if (Array.isArray(noTheMatch)) return noTheMatch;
  var withThe = "The ".concat(withoutThe);
  var withTheMatch = MAP_LAYOUTS[withThe];
  if (Array.isArray(withTheMatch)) return withTheMatch;
  return [];
};
var GAME_ICONS = [{
  id: "healthy",
  name: "Healthy",
  category: "health",
  type: "neutral",
  icon: "./dbd_images/game_icons/healthy.png",
  description: "The Survivor is at full health and can take two hits before being downed."
}, {
  id: "injured",
  name: "Injured",
  category: "health",
  type: "neutral",
  icon: "./dbd_images/game_icons/injured.png",
  description: "The Survivor has taken one hit and is bleeding. They make noise and leave blood trails. One more hit will down them."
}, {
  id: "dying",
  name: "Dying (Downed)",
  category: "health",
  type: "neutral",
  icon: "./dbd_images/game_icons/dying.png",
  description: "The Survivor is on the ground and cannot move normally. They must crawl and can be picked up by the Killer or recovered by teammates."
}, {
  id: "hooked",
  name: "Hooked",
  category: "health",
  type: "neutral",
  icon: "./dbd_images/game_icons/hooked.png",
  description: "The Survivor is hanging on a Hook. They progress through hook stages and can attempt escape or be rescued by teammates."
}, {
  id: "carried",
  name: "Carried",
  category: "health",
  type: "neutral",
  icon: "./dbd_images/game_icons/carried.png",
  description: "The Survivor is currently being carried by the Killer and can wiggle to escape before being hooked."
}, {
  id: "sacrificed",
  name: "Sacrificed",
  category: "health",
  type: "neutral",
  icon: "./dbd_images/game_icons/sacrificed.png",
  description: "The Survivor has been killed by The Entity after reaching the final hook stage. They are eliminated from the trial."
}, {
  id: "bledout",
  name: "Bled Out",
  category: "health",
  type: "neutral",
  icon: "./dbd_images/game_icons/bledout.png",
  description: "The Survivor has died from blood loss after remaining in the Dying State for too long (4 minutes)."
}, {
  id: "dead",
  name: "Dead",
  category: "health",
  type: "neutral",
  icon: "./dbd_images/game_icons/dead.png",
  description: "The Survivor has died by a means other than sacrifice, such as a Mori, bleed-out, or a special kill condition."
}, {
  id: "disconnected",
  name: "Disconnected",
  category: "health",
  type: "neutral",
  icon: "./dbd_images/game_icons/disconnected.png",
  description: "The player has disconnected from the match, either voluntarily or due to connection issues."
}, {
  id: "obsession",
  name: "Obsession",
  category: "health",
  type: "neutral",
  icon: "./dbd_images/game_icons/obsession.png",
  description: "This Survivor is the Killer's Obsession. Various Perks interact differently with the Obsession."
}, {
  id: "caged",
  name: "Caged",
  category: "health",
  type: "neutral",
  icon: "./dbd_images/game_icons/caged.png",
  description: "The Survivor is trapped in a Cage of Atonement (The Executioner). Similar to being hooked but placed by the power."
}, {
  id: "blessed",
  name: "Blessed",
  category: "buff",
  type: "buff",
  icon: "./dbd_images/game_icons/blessed.png",
  description: "Survivors benefit from Blessed and whichever effect(s) it applies whenever they are inside the Area of Effect of an active Boon Totem (24 metres)."
}, {
  id: "bloodlust",
  name: "Bloodlust",
  category: "buff",
  type: "buff",
  icon: "./dbd_images/game_icons/bloodlust.png",
  description: "Killers benefitting from Bloodlust increasingly gain more Movement speed in prolonged Chases (Tier I: +5%, Tier II: +10%, Tier III: +15%)."
}, {
  id: "endurance",
  name: "Endurance",
  category: "buff",
  type: "buff",
  icon: "./dbd_images/game_icons/endurance.png",
  description: "Survivors benefitting from Endurance can resist damage from the Killer. If hit, they are afflicted with Deep Wound instead of being injured. Cancelled by Conspicuous Actions."
}, {
  id: "haste",
  name: "Haste",
  category: "buff",
  type: "buff",
  icon: "./dbd_images/game_icons/haste.png",
  description: "Players benefitting from Haste have their Movement speed increased. The strength depends on the specific Perk or ability."
}, {
  id: "undetectable",
  name: "Undetectable",
  category: "buff",
  type: "buff",
  icon: "./dbd_images/game_icons/undetectable.png",
  description: "Killers benefitting from Undetectable: suppress their Terror Radius, suppress Red Stain, block Aura from Survivors, and suppress jump-scare SFX."
}, {
  id: "blindness",
  name: "Blindness",
  category: "debuff",
  type: "debuff",
  icon: "./dbd_images/game_icons/blindness.png",
  description: "Players suffering from Blindness are unable to read any Auras, including the default ones of their role and those from Perks."
}, {
  id: "broken",
  name: "Broken",
  category: "debuff",
  type: "debuff",
  icon: "./dbd_images/game_icons/broken.png",
  description: "Survivors suffering from Broken are unable to be healed or heal themselves past the Injured State."
}, {
  id: "cursed",
  name: "Cursed",
  category: "debuff",
  type: "debuff",
  icon: "./dbd_images/game_icons/cursed.png",
  description: "Survivors suffering from Cursed are currently affected by an active Hex Totem and its effects."
}, {
  id: "deepwound",
  name: "Deep Wound",
  category: "debuff",
  type: "debuff",
  icon: "./dbd_images/game_icons/deepwound.png",
  description: "Survivors suffering from Deep Wound have a special health bar that progressively drains when not running or mending. Once the timer runs out, they are put into the Dying State."
}, {
  id: "exhausted",
  name: "Exhausted",
  category: "debuff",
  type: "debuff",
  icon: "./dbd_images/game_icons/exhausted.png",
  description: "Survivors suffering from Exhaustion are unable to use Exhaustion Perks (Sprint Burst, Dead Hard, etc.). Exhausted recovers over time when not running."
}, {
  id: "exposed",
  name: "Exposed",
  category: "debuff",
  type: "debuff",
  icon: "./dbd_images/game_icons/exposed.png",
  description: "Survivors suffering from Exposed will suffer double-damage when hit by a Basic Attack, immediately putting them into the Dying State."
}, {
  id: "haemorrhage",
  name: "Haemorrhage",
  category: "debuff",
  type: "debuff",
  icon: "./dbd_images/game_icons/haemorrhage.png",
  description: "Survivors suffering from Haemorrhage produce more Pools of Blood (easier to track) and lose partial Healing progress at -7% per second if not healed fully."
}, {
  id: "hindered",
  name: "Hindered",
  category: "debuff",
  type: "debuff",
  icon: "./dbd_images/game_icons/hindered.png",
  description: "Players suffering from Hindered have their Movement speed decreased. The strength depends on the specific Perk or ability."
}, {
  id: "incapacitated",
  name: "Incapacitated",
  category: "debuff",
  type: "debuff",
  icon: "./dbd_images/game_icons/incapacitated.png",
  description: "Survivors suffering from Incapacitated are unable to interact with certain Props or other Survivors."
}, {
  id: "madness",
  name: "Madness",
  category: "debuff",
  type: "debuff",
  icon: "./dbd_images/game_icons/madness.png",
  description: "Survivors suffering from Madness (exclusive to The Doctor) suffer from hallucinations and other debilitating impairments. Madness is a tiered Status Effect (Tier I, II, III)."
}, {
  id: "mangled",
  name: "Mangled",
  category: "debuff",
  type: "debuff",
  icon: "./dbd_images/game_icons/mangled.png",
  description: "Survivors suffering from Mangled take 25% longer to be healed (achieved by reducing Healing speed by -20%). Only applies to healing from Injured to Healthy."
}, {
  id: "oblivious",
  name: "Oblivious",
  category: "debuff",
  type: "debuff",
  icon: "./dbd_images/game_icons/oblivious.png",
  description: "Survivors suffering from Oblivious are unable to perceive the Killer's Terror Radius and do not hear the Heartbeat warning."
}, {
  id: "marked",
  name: "Marked",
  category: "killer",
  type: "debuff",
  icon: "./dbd_images/game_icons/marked.png",
  description: "The Ghost Face has fully stalked this Survivor. They are Exposed and can be downed in one hit for a limited time."
}, {
  id: "marked_progress",
  name: "Marked Progress",
  category: "killer",
  type: "debuff",
  icon: "./dbd_images/game_icons/marked_progress.png",
  description: "The Ghost Face is actively stalking this Survivor and building Marked progress. If the meter fills, they become Marked and Exposed."
}, {
  id: "condemned",
  name: "Condemned",
  category: "killer",
  type: "debuff",
  icon: "./dbd_images/game_icons/condemned.png",
  description: "The Onryō's curse stacks on this Survivor. At maximum stacks, The Onryō can instantly kill them. Managed by picking up and returning Video Tapes."
}, {
  id: "condemnation",
  name: "Condemnation Progress",
  category: "killer",
  type: "debuff",
  icon: "./dbd_images/game_icons/condemnation.png",
  description: "The Onryō is actively building Condemned progress on this Survivor. Reaching the maximum stack count allows a special kill."
}, {
  id: "infected",
  name: "Infected",
  category: "killer",
  type: "debuff",
  icon: "./dbd_images/game_icons/infected.png",
  description: "The Mastermind (Wesker) has infected this Survivor with Uroboros. At critical infection, the Survivor is Hindered and can be grabbed."
}, {
  id: "infection_progress",
  name: "Infection Progress",
  category: "killer",
  type: "debuff",
  icon: "./dbd_images/game_icons/infection_progress.png",
  description: "Uroboros infection is building on this Survivor, but it has not yet reached the fully Infected state."
}, {
  id: "sickness",
  name: "Sickness",
  category: "killer",
  type: "debuff",
  icon: "./dbd_images/game_icons/sickness.png",
  description: "The Plague has infected this Survivor. At maximum sickness, the Survivor is Broken. Cleansing at a Pool of Devotion cures sickness but empowers The Plague."
}, {
  id: "sickness_progress",
  name: "Sickness Progress",
  category: "killer",
  type: "debuff",
  icon: "./dbd_images/game_icons/sickness_progress.png",
  description: "The Plague's Vile Purge is currently building infection on this Survivor, but they are not yet fully sick."
}, {
  id: "chainhunt",
  name: "Chain Hunt",
  category: "killer",
  type: "debuff",
  icon: "./dbd_images/game_icons/chainhunt.png",
  description: "The Cenobite has initiated a Chain Hunt. All Survivors are periodically attacked by chains until someone solves the Lament Configuration."
}, {
  id: "lacerated",
  name: "Lacerated",
  category: "killer",
  type: "debuff",
  icon: "./dbd_images/game_icons/lacerated.png",
  description: "The Trickster has thrown knives at this Survivor. At maximum laceration, the Survivor loses a health state."
}, {
  id: "lacerated_progress",
  name: "Laceration Progress",
  category: "killer",
  type: "debuff",
  icon: "./dbd_images/game_icons/lacerated_progress.png",
  description: "The Trickster has started building laceration on this Survivor, but the damage threshold has not been reached yet."
}, {
  id: "swarmed",
  name: "Swarmed",
  category: "killer",
  type: "debuff",
  icon: "./dbd_images/game_icons/swarmed.png",
  description: "The Artist's crows are on this Survivor. If hit by another Dire Crow while swarmed, the Survivor takes damage."
}, {
  id: "tormented",
  name: "Tormented",
  category: "killer",
  type: "debuff",
  icon: "./dbd_images/game_icons/tormented.png",
  description: "The Executioner can send this Survivor to a Cage of Atonement instead of hooking them, or use Final Judgment to kill."
}, {
  id: "contaminated",
  name: "Contaminated",
  category: "killer",
  type: "debuff",
  icon: "./dbd_images/game_icons/contaminated.png",
  description: "The Nemesis has contaminated this Survivor with a Tentacle Strike. Contaminated Survivors can be damaged by subsequent Tentacle Strikes and by Zombies.",
  tip: "Avoid Zombies and use Vaccines found in Supply Cases to cure contamination."
}, {
  id: "hunted",
  name: "Hunted",
  category: "killer",
  type: "debuff",
  icon: "./dbd_images/game_icons/hunted.png",
  description: "A Guard spawned by The Knight is hunting this Survivor. If caught, the Survivor takes damage. The hunt lasts for a limited time before the Guard dissolves.",
  tip: "Loop the Guard like a normal Killer - they give up after a timer."
}, {
  id: "latchedon",
  name: "Latched On",
  category: "killer",
  type: "debuff",
  icon: "./dbd_images/game_icons/latchedon.png",
  description: "Victor (The Twins) has pounced onto this Survivor's back. While latched, the Survivor's location is revealed and they cannot leave through the Exit Gate.",
  tip: "Have a teammate crush Victor off your back, or do it yourself (causes Broken)."
}, {
  id: "trapped_bear",
  name: "Trapped (Bear Trap)",
  category: "killer",
  type: "debuff",
  icon: "./dbd_images/game_icons/trapped.png",
  description: "This Survivor is caught in a Bear Trap (The Trapper) or a Mimic (The Lich). They are immobilized and must attempt escape or wait for rescue.",
  tip: "Each self-escape attempt has ~16.7% chance. Teammates can free you faster."
}, {
  id: "rbt",
  name: "Reverse Bear Trap",
  category: "killer",
  type: "debuff",
  icon: "./dbd_images/game_icons/rbt.png",
  description: "The Pig has placed a Reverse Bear Trap on this Survivor's head. Once activated (by completing a generator), a death timer starts. Search Jigsaw Boxes to remove it before time runs out.",
  tip: "Prioritize searching Jigsaw Boxes once your RBT is active. Don't work on gens."
}, {
  id: "rbt_timer_paused",
  name: "Reverse Bear Trap Timer (Paused)",
  category: "killer",
  type: "debuff",
  icon: "./dbd_images/game_icons/rbt_timer_paused.png",
  description: "The Pig's Reverse Bear Trap timer is paused and will not tick down until the trap becomes active."
}, {
  id: "rbt_timer_active",
  name: "Reverse Bear Trap Timer (Active)",
  category: "killer",
  type: "debuff",
  icon: "./dbd_images/game_icons/rbt_timer_active.png",
  description: "The Pig's Reverse Bear Trap timer is active and counting down to a lethal execution if the trap is not removed in time."
}, {
  id: "magic_disabled",
  name: "Magic Item Disabled",
  category: "killer",
  type: "debuff",
  icon: "./dbd_images/game_icons/magic_disabled.png",
  description: "The Lich's Dispelling Sphere has passed through this Survivor, disabling their equipped Magic Item for 60 seconds. While disabled, the Magic Item cannot be used. The Lich also sees the type of Magic Item on the Survivor's HUD.",
  tip: "You cannot use your Magic Item (Boots or Gauntlet) for 60s. Avoid the sphere by listening for its sound and moving perpendicular to its trajectory."
}, {
  id: "puzzle",
  name: "Puzzle Solving",
  category: "killer",
  type: "neutral",
  icon: "./dbd_images/game_icons/puzzle.png",
  description: "The Survivor is holding or solving the Lament Configuration while facing The Cenobite."
}, {
  id: "revealed",
  name: "Revealed",
  category: "debuff",
  type: "debuff",
  icon: "./dbd_images/game_icons/revealed.png",
  description: "This Survivor's Aura is revealed to both Killers in the 2v8 Game Mode. This status effect is exclusive to the 2v8 mode."
}, {
  id: "efficiency",
  name: "Efficiency",
  category: "proficiency",
  type: "neutral",
  icon: "./dbd_images/game_icons/efficiency.png",
  description: "A Proficiency Indicator that shows whether an Item is depleting slower or faster than normal while it is being used."
}, {
  id: "progression_speed",
  name: "Progression Speed",
  category: "proficiency",
  type: "neutral",
  icon: "./dbd_images/game_icons/progression_speed.png",
  description: "A Proficiency Indicator that shows whether the current interaction is progressing faster or slower than the default 1 charge per second."
}, {
  id: "skillcheck_difficulty",
  name: "Skill Check Difficulty",
  category: "proficiency",
  type: "neutral",
  icon: "./dbd_images/game_icons/skillcheck_difficulty.png",
  description: "A Proficiency Indicator that shows whether upcoming Skill Checks are easier or harder than normal."
}, {
  id: "skillcheck_probability",
  name: "Skill Check Probability",
  category: "proficiency",
  type: "neutral",
  icon: "./dbd_images/game_icons/skillcheck_probability.png",
  description: "A Proficiency Indicator that shows whether Skill Checks are appearing more or less often than usual."
}, {
  id: "activity_gen",
  name: "Repairing Generator",
  category: "activity",
  type: "neutral",
  icon: "./dbd_images/game_icons/activity_gen.png",
  description: "This Survivor is currently working on a Generator. Visible to teammates in the HUD."
}, {
  id: "activity_heal",
  name: "Healing",
  category: "activity",
  type: "neutral",
  icon: "./dbd_images/game_icons/activity_heal.png",
  description: "This Survivor is currently healing themselves or another Survivor. Visible to teammates in the HUD."
}, {
  id: "activity_totem",
  name: "Totem Interaction",
  category: "activity",
  type: "neutral",
  icon: "./dbd_images/game_icons/activity_totem.png",
  description: "This Survivor is currently cleansing or blessing a Totem. Visible to teammates in the HUD."
}, {
  id: "activity_exitgate",
  name: "Opening Exit Gate",
  category: "activity",
  type: "neutral",
  icon: "./dbd_images/game_icons/activity_exitgate.png",
  description: "This Survivor is currently opening an Exit Gate. Visible to teammates in the HUD."
}, {
  id: "activity_recovery",
  name: "Recovering",
  category: "activity",
  type: "neutral",
  icon: "./dbd_images/game_icons/activity_recovery.png",
  description: "This Survivor is recovering from the Dying State. Their recovery progress is shown to teammates."
}, {
  id: "activity_chest",
  name: "Unlocking Chest",
  category: "activity",
  type: "neutral",
  icon: "./dbd_images/game_icons/activity_chest.png",
  description: "This Survivor is currently unlocking a Chest to find an Item. Visible to teammates in the HUD."
}, {
  id: "activity_killerpower",
  name: "Killer Power Interaction",
  category: "activity",
  type: "neutral",
  icon: "./dbd_images/game_icons/activity_killerpower.png",
  description: "This Survivor is currently interacting with a Killer's Power or related prop (e.g., Jigsaw Box, Vaccine, Lament Configuration). Visible to teammates."
}, {
  id: "activity_invocation",
  name: "Invocation",
  category: "activity",
  type: "neutral",
  icon: "./dbd_images/game_icons/activity_invocation.png",
  description: "This Survivor is performing an Invocation. Progress is shown to teammates. Invocations require channeling in the basement."
}];
var PERK_SYNERGIES = {
  "Dead Hard": ["Off the Record", "Windows of Opportunity", "Resilience"],
  "Sprint Burst": ["Fixated", "Vigil", "Spine Chill"],
  "Lithe": ["Dance With Me", "Quick & Quiet", "Windows of Opportunity"],
  "Balanced Landing": ["Urban Evasion", "Lightweight", "Iron Will"],
  "Adrenaline": ["Hope", "Resilience", "We're Gonna Live Forever"],
  "Self-Care": ["Botany Knowledge", "Desperate Measures", "Built to Last"],
  "Circle of Healing": ["Boon: Shadow Step", "Empathic Connection", "Botany Knowledge"],
  "Solidarity": ["Empathy", "Desperate Measures", "We're Gonna Live Forever"],
  "Iron Will": ["Off the Record", "Calm Spirit", "Lightweight"],
  "Urban Evasion": ["Iron Will", "Calm Spirit", "Distortion"],
  "Distortion": ["Off the Record", "Iron Will", "Lightweight"],
  "Prove Thyself": ["Resilience", "Spine Chill", "Stake Out"],
  "Resilience": ["Prove Thyself", "This Is Not Happening", "Spine Chill"],
  "Deja Vu": ["Prove Thyself", "Situational Awareness", "Fast Track"],
  "Will To Live": ["Off the Record", "Unbreakable", "Dead Hard"],
  "Off the Record": ["Will To Live", "Dead Hard", "Iron Will"],
  "Borrowed Time": ["We're Gonna Live Forever", "Guardian", "Desperate Measures"],
  "A Place For Us": ["We'll Make It", "Empathy", "We're Gonna Live Forever"],
  "Five Moves Ahead": ["Windows of Opportunity", "Lithe", "Dance With Me"],
  "Flow State": ["Botany Knowledge", "We'll Make It", "A Place For Us"],
  "Hex: Ruin": ["Hex: Undying", "Corrupt Intervention", "Surveillance"],
  "Pop Goes the Weasel": ["Brutal Strength", "Nowhere to Hide", "Call of Brine"],
  "Call of Brine": ["Overcharge", "Eruption", "Nowhere to Hide"],
  "Scourge Hook: Pain Resonance": ["Dead Man's Switch", "Grim Embrace", "Corrupt Intervention"],
  "Keep Them Waiting": ["Brutal Strength", "Enduring", "Spirit Fury"],
  "Enduring": ["Spirit Fury", "Brutal Strength", "Fire Up"],
  "Bamboozle": ["Fire Up", "Brutal Strength", "Crowd Control"],
  "I'm All Ears": ["Lethal Pursuer", "Nowhere to Hide", "A Nurse's Calling"],
  "Lethal Pursuer": ["Barbecue & Chilli", "Nowhere to Hide", "I'm All Ears"],
  "Barbecue & Chilli": ["Lethal Pursuer", "Hex: Retribution", "I'm All Ears"],
  "A Nurse's Calling": ["Sloppy Butcher", "Coulrophobia", "Distressing"],
  "Hex: No One Escapes Death": ["Hex: Blood Favor", "Remember Me", "Blood Warden"],
  "Remember Me": ["Blood Warden", "No Way Out", "Hex: No One Escapes Death"],
  "No Way Out": ["Remember Me", "Blood Warden", "Hex: No One Escapes Death"]
};
var COSMETICS_FULL_SET_ASSET_PACK_NAME = 'cosmeticsfullsetpack';
var isNativeAndroidPlatform = () => {
  try {
    var _window$Capacitor, _window$Capacitor$isN, _window$Capacitor2, _window$Capacitor2$ge;
    return Boolean((_window$Capacitor = window.Capacitor) === null || _window$Capacitor === void 0 || (_window$Capacitor$isN = _window$Capacitor.isNativePlatform) === null || _window$Capacitor$isN === void 0 ? void 0 : _window$Capacitor$isN.call(_window$Capacitor)) && ((_window$Capacitor2 = window.Capacitor) === null || _window$Capacitor2 === void 0 || (_window$Capacitor2$ge = _window$Capacitor2.getPlatform) === null || _window$Capacitor2$ge === void 0 ? void 0 : _window$Capacitor2$ge.call(_window$Capacitor2)) === 'android';
  } catch (error) {
    return false;
  }
};
var getCosmeticsFullSetPackBaseUrl = () => String(window.__cosmeticsFullSetPackBaseUrl || '');
var setCosmeticsFullSetPackBasePath = assetsPath => {
  var _window$Capacitor3;
  var normalizedPath = typeof assetsPath === 'string' ? assetsPath.trim() : '';
  if (!normalizedPath) {
    window.__cosmeticsFullSetPackBaseUrl = '';
    return '';
  }
  var converted = typeof ((_window$Capacitor3 = window.Capacitor) === null || _window$Capacitor3 === void 0 ? void 0 : _window$Capacitor3.convertFileSrc) === 'function' ? window.Capacitor.convertFileSrc(normalizedPath) : normalizedPath;
  var normalizedBaseUrl = String(converted || '').replace(/\/+$/, '');
  window.__cosmeticsFullSetPackBaseUrl = normalizedBaseUrl;
  return normalizedBaseUrl;
};
var defaultCosmeticsFullSetPackState = () => ({
  supported: isNativeAndroidPlatform(),
  packName: COSMETICS_FULL_SET_ASSET_PACK_NAME,
  status: isNativeAndroidPlatform() ? 'checking' : 'completed',
  isReady: !isNativeAndroidPlatform(),
  assetsPath: '',
  baseUrl: '',
  bytesDownloaded: 0,
  totalBytesToDownload: 0,
  errorCode: 0,
  errorLabel: ''
});
var normalizeCosmeticsFullSetPackState = raw => {
  var fallback = defaultCosmeticsFullSetPackState();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fallback;
  var assetsPath = typeof raw.assetsPath === 'string' ? raw.assetsPath : '';
  var baseUrl = assetsPath ? setCosmeticsFullSetPackBasePath(assetsPath) : setCosmeticsFullSetPackBasePath('');
  var isReady = Boolean(raw.isReady);
  return {
    supported: raw.supported !== false,
    packName: raw.packName ? String(raw.packName) : COSMETICS_FULL_SET_ASSET_PACK_NAME,
    status: raw.status ? String(raw.status) : fallback.status,
    isReady,
    assetsPath,
    baseUrl,
    bytesDownloaded: Number(raw.bytesDownloaded) || 0,
    totalBytesToDownload: Number(raw.totalBytesToDownload) || 0,
    errorCode: Number(raw.errorCode) || 0,
    errorLabel: raw.errorLabel ? String(raw.errorLabel) : ''
  };
};
var isCosmeticsFullSetImagePath = url => {
  if (!url) return false;
  var normalized = String(url).replace(/\\/g, '/').replace(/^\.\//, '');
  return normalized.startsWith('dbd_images/cosmetics/full_sets/');
};
var getCosmeticsFullSetResolutionCache = () => {
  if (!(window.__cosmeticsFullSetResolutionCache instanceof Map)) {
    window.__cosmeticsFullSetResolutionCache = new Map();
  }
  return window.__cosmeticsFullSetResolutionCache;
};
var clearCosmeticsFullSetResolutionCache = () => {
  var resolutionCache = getCosmeticsFullSetResolutionCache();
  resolutionCache.clear();
};
var getCosmeticsFullSetResolutionRevision = () => Number(window.__cosmeticsFullSetResolutionRevision || 0);
var bumpCosmeticsFullSetResolutionRevision = () => {
  clearCosmeticsFullSetResolutionCache();
  var next = getCosmeticsFullSetResolutionRevision() + 1;
  window.__cosmeticsFullSetResolutionRevision = next;
  return next;
};
var formatAssetPackErrorLabel = value => {
  var key = String(value || '').trim();
  switch (key) {
    case 'insufficient_storage':
      return 'There is not enough free storage to finish loading full-set cosmetics.';
    case 'network_error':
      return 'A network issue interrupted full-set cosmetics loading.';
    case 'access_denied':
      return 'Full-set cosmetics could not be accessed on this device right now.';
    case 'api_not_available':
      return 'Full-set cosmetics are not available on this device right now.';
    case 'app_unavailable':
    case 'pack_unavailable':
    case 'invalid_request':
    case 'download_not_found':
    case 'app_not_owned':
    case 'confirmation_not_required':
    case 'unrecognized_installation':
    case 'internal_error':
      return 'Full-set cosmetics could not finish loading yet. Please try again in a moment.';
    default:
      return '';
  }
};
var formatDataSize = bytes => {
  var value = Number(bytes) || 0;
  if (value <= 0) return '0 B';
  if (value < 1024) return "".concat(value, " B");
  if (value < 1024 * 1024) return "".concat((value / 1024).toFixed(1), " KB");
  if (value < 1024 * 1024 * 1024) return "".concat((value / (1024 * 1024)).toFixed(1), " MB");
  return "".concat((value / (1024 * 1024 * 1024)).toFixed(2), " GB");
};
var getConfiguredDbdImageBaseUrl = () => {
  var raw = typeof window.DBD_IMAGE_BASE_URL === 'string' ? window.DBD_IMAGE_BASE_URL.trim() : '';
  return raw.replace(/\/+$/, '');
};
var toConfiguredDbdImageSource = url => {
  if (!url) return null;
  var baseUrl = getConfiguredDbdImageBaseUrl();
  if (!baseUrl) return null;
  var normalized = String(url).replace(/\\/g, '/').replace(/^\.\//, '');
  if (!normalized.startsWith('dbd_images/')) return null;
  var relativePath = normalized.slice('dbd_images/'.length).replace(/^\/+/, '');
  return relativePath ? "".concat(baseUrl, "/").concat(relativePath) : baseUrl;
};
var resolveExtraImageSource = normalized => {
  if (isCosmeticsFullSetImagePath(normalized)) {
    var packBaseUrl = getCosmeticsFullSetPackBaseUrl();
    if (packBaseUrl) return "".concat(packBaseUrl, "/").concat(normalized);
    var _configuredSource = toConfiguredDbdImageSource(normalized);
    if (_configuredSource) return _configuredSource;
    return isNativeAndroidPlatform() ? null : "./".concat(normalized);
  }
  var configuredSource = toConfiguredDbdImageSource(normalized);
  if (configuredSource) return configuredSource;
  return undefined;
};
var resolveAsyncImageSource = function () {
  var _ref14 = _asyncToGenerator(function* (normalized) {
    if (!isCosmeticsFullSetImagePath(normalized)) return undefined;
    if (!isNativeAndroidPlatform()) {
      return "./".concat(normalized);
    }
    var resolutionCache = getCosmeticsFullSetResolutionCache();
    if (resolutionCache.has(normalized)) {
      return resolutionCache.get(normalized);
    }
    var resolutionPromise = _asyncToGenerator(function* () {
      var _window$Capacitor4;
      var plugin = (_window$Capacitor4 = window.Capacitor) === null || _window$Capacitor4 === void 0 || (_window$Capacitor4 = _window$Capacitor4.Plugins) === null || _window$Capacitor4 === void 0 ? void 0 : _window$Capacitor4.CosmeticsAssetPack;
      if (plugin !== null && plugin !== void 0 && plugin.resolveAsset) {
        try {
          var raw = yield plugin.resolveAsset({
            assetPath: normalized
          });
          var resolvedPath = raw !== null && raw !== void 0 && raw.resolvedPath ? String(raw.resolvedPath) : '';
          if (resolvedPath) {
            var _window$Capacitor5;
            return typeof ((_window$Capacitor5 = window.Capacitor) === null || _window$Capacitor5 === void 0 ? void 0 : _window$Capacitor5.convertFileSrc) === 'function' ? window.Capacitor.convertFileSrc(resolvedPath) : resolvedPath;
          }
        } catch (error) {}
      }
      var packBaseUrl = getCosmeticsFullSetPackBaseUrl();
      return packBaseUrl ? "".concat(packBaseUrl, "/").concat(normalized) : null;
    })();
    resolutionCache.set(normalized, resolutionPromise);
    var resolved = yield resolutionPromise;
    if (!resolved) {
      resolutionCache.delete(normalized);
    }
    return resolved;
  });
  return function resolveAsyncImageSource(_x) {
    return _ref14.apply(this, arguments);
  };
}();
var WikiHeader = _ref16 => {
  var {
    currentView,
    setView
  } = _ref16;
  useEffect(() => {
    var onKey = e => {
      if (e.key !== '/') return;
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      var slot = document.getElementById('wiki-header-search-slot');
      var input = slot && slot.querySelector('input');
      if (input) {
        e.preventDefault();
        input.focus();
        input.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  var hasSearch = !['home'].includes(currentView);
  return React.createElement("header", {
    className: "wiki-header sticky top-0 z-30 flex items-center justify-between gap-4 px-4"
  }, React.createElement("button", {
    type: "button",
    onClick: () => setView('home'),
    className: "flex items-center gap-3 shrink-0",
    "aria-label": "Main page"
  }, React.createElement("img", {
    src: "./assets/wiki-logo.png",
    alt: "",
    width: 100,
    height: 42,
    className: "wiki-logo-img",
    style: {
      objectFit: 'contain'
    }
  }), React.createElement("span", {
    className: "flex flex-col leading-none text-left"
  }, React.createElement("span", {
    className: "text-[15px] font-bold text-[var(--text)]",
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700
    }
  }, "The Entity's Wiki"), React.createElement("span", {
    className: "text-[8.5px] uppercase tracking-[0.18em] mt-1",
    style: {
      color: 'var(--text-faint)'
    }
  }, "Dead by Daylight"))), React.createElement("div", {
    id: "wiki-header-search-slot",
    className: "absolute flex items-center",
    style: {
      left: '50%',
      transform: 'translateX(-50%)',
      width: hasSearch ? '470px' : '0px',
      opacity: hasSearch ? 1 : 0,
      pointerEvents: hasSearch ? 'auto' : 'none',
      overflow: hasSearch ? 'visible' : 'hidden'
    }
  }), React.createElement("button", {
    type: "button",
    onClick: () => setView('settings'),
    className: "shrink-0 w-9 h-9 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center",
    "aria-label": "Settings"
  }, React.createElement(Icons.Gear, {
    width: 16,
    height: 16
  })));
};
var SiteFooter = _ref17 => {
  var {
    currentView
  } = _ref17;
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!window.matchMedia('(min-width: 768px)').matches) return undefined;
    if (currentView === 'home') return undefined;
    var injectedFooter = null;
    var timer = window.setTimeout(() => {
      var root = document.querySelector('[data-smoke-view]');
      if (!root) return;
      var locale = typeof navigator !== 'undefined' && (navigator.language || '').toLowerCase().startsWith('fr') ? 'fr' : 'en';
      var href = PLAY_STORE_LINKS[locale] || PLAY_STORE_LINKS.en;
      var badge = GOOGLE_PLAY_BADGES[locale] || GOOGLE_PLAY_BADGES.en;
      var div = document.createElement('div');
      div.className = 'site-footer';
      injectedFooter = div;
      div.innerHTML = "\n            <p class=\"site-footer-eyebrow\">Get the app</p>\n            <a href=\"".concat(href, "\" target=\"_blank\" rel=\"noopener noreferrer\" aria-label=\"Get it on Google Play\">\n              <img src=\"").concat(badge, "\" alt=\"Get it on Google Play\" class=\"site-footer-badge\" loading=\"lazy\" />\n            </a>\n            <div class=\"site-footer-legal\">\n              <a href=\"./privacy-policy\">Privacy Policy</a>\n              <a href=\"./privacy-policy#disclaimer\">Legal &amp; Disclaimer</a>\n              <span>Community data &copy; Otzdarva</span>\n            </div>");
      var article = root.querySelector('.cx-article');
      if (article) {
        article.appendChild(div);
        return;
      }
      var candidates = [root, ...Array.from(root.querySelectorAll('.overflow-y-auto'))].filter(el => el.classList.contains('overflow-y-auto'));
      var scroller = candidates.sort((a, b) => b.scrollHeight - a.scrollHeight)[0];
      if (!scroller || scroller.scrollHeight <= scroller.clientHeight + 50) return;
      scroller.appendChild(div);
      return;
    }, 60);
    return () => {
      var _injectedFooter;
      (_injectedFooter = injectedFooter) === null || _injectedFooter === void 0 || _injectedFooter.remove();
      window.clearTimeout(timer);
    };
  }, [currentView]);
  return null;
};
var SiteFooterContent = () => {
  var locale = typeof navigator !== 'undefined' && (navigator.language || '').toLowerCase().startsWith('fr') ? 'fr' : 'en';
  var href = PLAY_STORE_LINKS[locale] || PLAY_STORE_LINKS.en;
  var badge = GOOGLE_PLAY_BADGES[locale] || GOOGLE_PLAY_BADGES.en;
  return React.createElement("div", {
    className: "site-footer"
  }, React.createElement("p", {
    className: "site-footer-eyebrow"
  }, "Get the app"), React.createElement("a", {
    href: href,
    target: "_blank",
    rel: "noopener noreferrer",
    "aria-label": "Get it on Google Play"
  }, React.createElement("img", {
    src: badge,
    alt: "Get it on Google Play",
    className: "site-footer-badge",
    loading: "lazy"
  })), React.createElement("div", {
    className: "site-footer-legal"
  }, React.createElement("a", {
    href: "./privacy-policy"
  }, "Privacy Policy"), React.createElement("a", {
    href: "./privacy-policy#disclaimer"
  }, "Legal & Disclaimer"), React.createElement("span", null, "Community data \xA9 Otzdarva")));
};
var WebsiteHeader = _ref18 => {
  var {
    currentView,
    setView,
    titleOverride,
    onOpenDrawer
  } = _ref18;
  var headerTitle = currentView === 'home' ? 'Search' : titleOverride || getNavDisplayLabel(currentView);
  return React.createElement("header", {
    className: "website-topbar shrink-0 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4"
  }, React.createElement("div", {
    className: "flex items-center gap-1 min-w-0"
  }, onOpenDrawer && React.createElement("button", {
    type: "button",
    onClick: onOpenDrawer,
    className: "cx-hamb",
    "aria-label": "Open navigation"
  }, React.createElement("span", {
    "aria-hidden": "true"
  }), React.createElement("span", {
    "aria-hidden": "true"
  }), React.createElement("span", {
    "aria-hidden": "true"
  })), React.createElement("button", {
    onClick: () => setView('home'),
    className: "group flex items-center gap-3 min-w-0 text-left",
    "aria-label": "Open search"
  }, React.createElement("div", {
    className: "website-brand-mark w-9 h-9 shrink-0 flex items-center justify-center border border-white/15"
  }, React.createElement(Icons.DbdLogo, {
    width: 36,
    height: 36
  })), React.createElement("div", {
    className: "min-w-0"
  }, React.createElement("p", {
    className: "text-[9px] font-bold uppercase tracking-[0.32em] text-zinc-500"
  }, "The Entity's Wiki"), React.createElement("h1", {
    className: "text-lg text-[var(--text)] truncate",
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      letterSpacing: '0.01em'
    }
  }, headerTitle)))), React.createElement("div", {
    className: "hidden md:flex items-center gap-5"
  }, React.createElement("span", {
    style: {
      fontFamily: 'var(--mono-fallback, ui-monospace, monospace)',
      fontSize: '10px',
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: 'var(--faint, var(--muted))'
    }
  }, "Patch ", META.gameVersion, " \xB7 synced ", META.lastSynced)), React.createElement("button", {
    onClick: () => setView('settings'),
    className: "shrink-0 w-10 h-10 border border-white/10 bg-white/[0.035] text-zinc-400 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center",
    "aria-label": "Open settings"
  }, React.createElement(Icons.Gear, {
    width: 18,
    height: 18
  })));
};
var PlayStoreFooter = _ref19 => {
  var {
    compact = false,
    onDismiss = null,
    className = ''
  } = _ref19;
  var locale = typeof navigator !== 'undefined' && (navigator.language || '').toLowerCase().startsWith('fr') ? 'fr' : 'en';
  var href = PLAY_STORE_LINKS[locale] || PLAY_STORE_LINKS.en;
  var badge = GOOGLE_PLAY_BADGES[locale] || GOOGLE_PLAY_BADGES.en;
  var label = locale === 'fr' ? 'Disponible sur Google Play' : 'Get it on Google Play';
  if (compact) {
    return React.createElement("div", {
      className: "play-store-footer--mobile rounded-2xl px-3 py-2 flex items-center gap-3 ".concat(className)
    }, React.createElement("span", {
      className: "play-store-eyebrow whitespace-nowrap"
    }, "Get the app"), React.createElement("a", {
      href: href,
      target: "_blank",
      rel: "noopener noreferrer",
      "aria-label": label,
      className: "shrink-0 transition-opacity hover:opacity-85"
    }, React.createElement("img", {
      src: badge,
      alt: label,
      className: "google-play-badge",
      loading: "lazy"
    })), typeof onDismiss === 'function' && React.createElement("button", {
      type: "button",
      onClick: onDismiss,
      className: "play-store-dismiss shrink-0 rounded-full flex items-center justify-center transition-colors",
      "aria-label": "Hide Google Play banner"
    }, React.createElement(Icons.X, {
      width: 14,
      height: 14
    })));
  }
  return React.createElement("div", {
    className: "play-store-footer px-5 py-4 ".concat(className)
  }, React.createElement("p", {
    className: "play-store-eyebrow"
  }, "Get the app"), React.createElement("a", {
    href: href,
    target: "_blank",
    rel: "noopener noreferrer",
    "aria-label": label,
    className: "mt-2 inline-block transition-opacity hover:opacity-85"
  }, React.createElement("img", {
    src: badge,
    alt: label,
    className: "google-play-badge",
    loading: "lazy"
  })));
};
var SiteLegalFooter = _ref20 => {
  var {
    className = ''
  } = _ref20;
  return React.createElement("div", {
    className: "flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500 ".concat(className)
  }, React.createElement("a", {
    href: "./privacy-policy",
    className: "hover:text-zinc-300 transition-colors"
  }, "Privacy Policy"), React.createElement("a", {
    href: "./privacy-policy#disclaimer",
    className: "hover:text-zinc-300 transition-colors"
  }, "Legal & Disclaimer"), React.createElement("span", null, "Community data \xA9 Otzdarva"));
};
var Navigation = _ref21 => {
  var {
    currentView,
    setView,
    theme,
    isMobile = false,
    onPerksReset,
    customNavItems = [],
    hideAppCta = false,
    onHideAppCta = null
  } = _ref21;
  var navItems = useMemo(() => {
    var items = [{
      id: 'home',
      label: 'Search'
    }];
    customNavItems.forEach(id => {
      var opt = ALL_NAV_OPTIONS.find(o => o.id === id);
      if (opt) items.push(opt);
    });
    items.push({
      id: 'settings',
      label: 'Settings'
    });
    return items;
  }, [customNavItems]);
  var navCounts = useMemo(() => {
    var storageCount = key => {
      try {
        return (JSON.parse(localStorage.getItem(key)) || []).length;
      } catch (_unused2) {
        return 0;
      }
    };
    var favCount = () => {
      try {
        var s = JSON.parse(localStorage.getItem('dbd_settings_v1')) || {};
        return ['favoritePerks', 'favoriteKillers', 'favoriteSurvivors', 'favoriteItems', 'favoriteAddons', 'favoriteOfferings'].reduce((n, k) => n + (s[k] || []).length, 0);
      } catch (_unused3) {
        return 0;
      }
    };
    return {
      killers: DATABASE.killers.length,
      survivors: DATABASE.survivors.length,
      perks: DATABASE.perks.length,
      addons: DATABASE.addons.length,
      items: DATABASE.items.length,
      offerings: DATABASE.offerings.length,
      realms: DATABASE.realms.length,
      maps: DATABASE.maps.length,
      cosmetics: (COSMETICS_CATALOG.fullSets || []).length + (COSMETICS_CATALOG.characterSwaps || []).length,
      buildLab: storageCount('dbd_builds_v1'),
      matches: storageCount('dbd_matches_v1'),
      favorites: favCount(),
      timeline: typeof TIMELINE_DATA !== 'undefined' && TIMELINE_DATA.releases ? TIMELINE_DATA.releases.length : 0,
      glossary: GLOSSARY.reduce((n, s) => n + s.items.length, 0),
      communityContent: typeof COMMUNITY_CONTENT !== 'undefined' && COMMUNITY_CONTENT.guideVault && COMMUNITY_CONTENT.guideVault.entries ? COMMUNITY_CONTENT.guideVault.entries.length : 0,
      gameIcons: typeof GAME_ICONS !== 'undefined' ? GAME_ICONS.length : 0
    };
  }, []);
  var hasMany = navItems.length > 6;
  var containerClasses = isMobile ? 'nav-shell nav-scroll rounded-2xl px-3 py-2 border border-white/5 max-w-3xl w-full mx-auto' : "nav-shell rounded-2xl sm:rounded-full px-3 py-2 border border-white/5 ".concat(hasMany ? 'max-w-5xl' : 'max-w-4xl', " w-full mx-auto");
  var trackClasses = isMobile ? 'flex items-center gap-1 justify-center w-full overflow-x-auto nav-scroll px-1' : 'flex items-center gap-1 justify-center w-full';
  if (!isMobile) {
    return React.createElement("aside", {
      className: "website-sidebar cx-side relative z-10 hidden md:flex h-full shrink-0 flex-col"
    }, React.createElement("nav", {
      className: "website-sidebar-scroll flex-1 overflow-y-auto cx-side-nav"
    }, React.createElement("button", {
      onClick: () => setView('home'),
      className: "cx-side-link ".concat(currentView === 'home' ? 'cx-side-link--active' : '', " cx-side-mainpage")
    }, React.createElement("span", {
      className: "truncate"
    }, "Main page")), WEBSITE_NAV_SECTIONS.map(section => React.createElement("div", {
      key: section.label
    }, React.createElement("h5", {
      className: "cx-side-h5"
    }, section.label), section.ids.map(id => {
      var isActive = currentView === id;
      var count = navCounts[id];
      return React.createElement("button", {
        key: id,
        onClick: () => setView(id),
        onDoubleClick: () => id === 'perks' && (onPerksReset === null || onPerksReset === void 0 ? void 0 : onPerksReset()),
        className: "cx-side-link ".concat(isActive ? 'cx-side-link--active' : '')
      }, React.createElement("span", {
        className: "truncate"
      }, getNavDisplayLabel(id)), typeof count === 'number' && count > 0 ? React.createElement("span", {
        className: "cx-side-count"
      }, count) : null);
    }))), React.createElement("div", null, React.createElement("h5", {
      className: "cx-side-h5"
    }, "Our wikis"), React.createElement("a", {
      href: "https://r6-wiki.pages.dev/",
      target: "_blank",
      rel: "noreferrer",
      className: "cx-side-link"
    }, React.createElement("span", {
      className: "flex items-center gap-2 min-w-0"
    }, React.createElement("img", {
      src: "./assets/r6-badge.png",
      alt: "Rainbow Six Siege wiki",
      width: "18",
      height: "18"
    }), React.createElement("span", {
      className: "truncate"
    }, "R6 Wiki")), React.createElement("span", {
      "aria-hidden": "true",
      style: {
        color: 'var(--text-faint)',
        fontSize: '12px'
      }
    }, "\u2197")))));
  }
  return React.createElement("div", {
    className: "fixed bottom-0 left-0 w-full z-50 px-2 sm:px-6 pb-2 sm:pb-5 flex flex-col items-center gap-2 nav-safe-area"
  }, !hideAppCta && React.createElement(PlayStoreFooter, {
    compact: true,
    onDismiss: onHideAppCta
  }), React.createElement("div", {
    className: containerClasses
  }, React.createElement("div", {
    className: trackClasses
  }, navItems.map(item => {
    var isActive = currentView === item.id;
    var labelVisibility = isMobile || hasMany ? isActive ? '' : 'hidden' : '';
    var IconComponent = Icons[NAV_ICON_MAP[item.id]] || Icons.Zap;
    return React.createElement("button", {
      key: item.id,
      onClick: () => setView(item.id),
      onDoubleClick: () => item.id === 'perks' && (onPerksReset === null || onPerksReset === void 0 ? void 0 : onPerksReset()),
      "aria-label": item.label,
      className: "nav-item ".concat(isMobile ? 'shrink-0 flex items-center justify-center gap-2 rounded-xl px-3 py-2' : "flex-1 flex items-center justify-center gap-2 rounded-xl sm:rounded-full py-2.5 ".concat(hasMany ? 'px-3' : ''), " transition-all duration-200 ").concat(isActive ? 'nav-item--active' : 'hover:text-white'),
      style: isActive ? {
        borderColor: theme.accent
      } : {}
    }, React.createElement(IconComponent, {
      width: 20,
      height: 20,
      strokeWidth: isActive ? 2.3 : 2
    }), React.createElement("span", {
      className: "text-[11px] font-semibold ".concat(labelVisibility, " ").concat(isActive ? 'text-white' : 'text-zinc-400')
    }, item.label));
  }))));
};
var VIEW_TIPS = {};
var GlassCard = _ref22 => {
  var {
    item,
    category,
    expanded = false,
    onToggle,
    perksForOwner = [],
    onPerkClick,
    buildsForOwner = [],
    onCreateBuild,
    isInCompare = false,
    onLongPress,
    isFavorite = false,
    onToggleFavorite,
    onPerkTap,
    onShowLore,
    onShowPower,
    onViewProfile,
    allCharacters = [],
    settings = {}
  } = _ref22;
  var subtext = '';
  var accentTone = 'var(--accent)';
  var fallbackIcon = React.createElement(Icons.Zap, {
    width: 20,
    height: 20
  });
  var isCharacter = category === 'Killer' || category === 'Survivor';
  var isPerk = category === 'Perk';
  var [pressTimer, setPressTimer] = useState(null);
  var longPressTriggered = useRef(false);
  var handleTouchStart = () => {
    if (!onLongPress) return;
    longPressTriggered.current = false;
    var timer = setTimeout(() => {
      longPressTriggered.current = true;
      onLongPress();
    }, 500);
    setPressTimer(timer);
  };
  var handleTouchEnd = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };
  var handlePerkClick = () => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    if (onPerkTap) onPerkTap();
  };
  var handleCharacterClick = () => {
    if (onViewProfile) {
      onViewProfile();
      return;
    }
    if (onToggle) onToggle();
  };
  if (category === 'Killer') {
    subtext = item.realName || item.name;
    accentTone = '#fafafa';
    fallbackIcon = React.createElement(Icons.Sword, {
      width: 24,
      height: 24,
      className: "opacity-20"
    });
  } else if (category === 'Survivor') {
    subtext = item.role;
    accentTone = '#a1a1aa';
    fallbackIcon = React.createElement(Icons.Heart, {
      width: 24,
      height: 24,
      className: "opacity-20"
    });
  } else if (isPerk) {
    subtext = item.owner || 'Universal';
    accentTone = item.type === 'Killer' ? '#fafafa' : '#a1a1aa';
    fallbackIcon = React.createElement(Icons.BookOpen, {
      width: 20,
      height: 20,
      className: "opacity-20"
    });
  }
  return React.createElement("div", {
    className: "group relative overflow-hidden rounded-2xl glass-panel backdrop-blur-md p-4 mb-4 transition-all duration-200 ".concat(isCharacter || isPerk && onPerkTap ? 'cursor-pointer' : '', " ").concat(isInCompare ? 'ring-2 ring-zinc-500' : ''),
    style: expanded ? {
      borderColor: accentTone,
      boxShadow: '0 10px 30px rgba(0,0,0,0.4)'
    } : {},
    onClick: isCharacter ? handleCharacterClick : isPerk && onPerkTap ? handlePerkClick : undefined,
    onTouchStart: isPerk ? handleTouchStart : undefined,
    onTouchEnd: isPerk ? handleTouchEnd : undefined,
    onTouchCancel: isPerk ? handleTouchEnd : undefined,
    onMouseDown: isPerk ? handleTouchStart : undefined,
    onMouseUp: isPerk ? handleTouchEnd : undefined,
    onMouseLeave: isPerk ? handleTouchEnd : undefined
  }, isInCompare && React.createElement("div", {
    className: "absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-zinc-400 flex items-center justify-center"
  }, React.createElement(Icons.Check, {
    width: 14,
    height: 14,
    className: "text-white"
  })), (isPerk || isCharacter) && onToggleFavorite && React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      onToggleFavorite();
    },
    className: "absolute top-2 ".concat(isInCompare ? 'right-10' : 'right-2', " z-20 p-1.5 rounded-full transition-colors ").concat(isFavorite ? 'bg-white/10' : 'bg-white/10 hover:bg-white/20')
  }, React.createElement(Icons.Star, {
    width: 16,
    height: 16,
    className: isFavorite ? 'text-zinc-100 fill-zinc-100' : 'text-zinc-500'
  })), React.createElement("div", {
    className: "absolute left-0 top-0 bottom-0 w-1",
    style: {
      background: accentTone,
      opacity: 0.6
    }
  }), React.createElement("div", {
    className: "relative z-10 flex items-start gap-3"
  }, React.createElement("div", {
    className: "flex-1 py-1"
  }, React.createElement("h3", {
    className: "text-lg font-semibold text-white mb-1 tracking-tight"
  }, item.name), React.createElement("p", {
    className: "text-zinc-400 text-sm font-medium"
  }, subtext), isCharacter && expanded && category === 'Killer' && item.power && React.createElement("p", {
    className: "text-zinc-500 text-xs mt-2 leading-relaxed"
  }, item.power), isCharacter && expanded && category === 'Killer' && KILLER_STATS[item.name] && React.createElement("div", {
    className: "flex flex-wrap gap-2 mt-2"
  }, React.createElement("span", {
    className: "px-2 py-1 rounded-lg bg-zinc-500/10 border border-white/25/20 text-[10px] font-bold text-zinc-100"
  }, "TR: ", KILLER_STATS[item.name].terrorRadius), React.createElement("span", {
    className: "px-2 py-1 rounded-lg bg-zinc-500/10 border border-white/25/20 text-[10px] font-bold text-zinc-100"
  }, "Speed: ", KILLER_STATS[item.name].speed), React.createElement("span", {
    className: "px-2 py-1 rounded-lg bg-zinc-500/10 border border-white/25/20 text-[10px] font-bold text-zinc-100"
  }, "Height: ", KILLER_STATS[item.name].height)), isPerk && onLongPress && React.createElement("p", {
    className: "text-zinc-600 text-[10px] mt-1"
  }, "Long press to compare")), React.createElement("div", {
    className: isPerk ? 'perk-icon-hover' : ''
  }, React.createElement(AssetFrame, {
    type: category,
    imageUrl: item.image,
    fallbackIcon: fallbackIcon
  }))), item.description && React.createElement("div", {
    className: "mt-4 pt-3 border-t border-white/5"
  }, isPerk ? React.createElement("div", {
    className: "perk-effect-text text-zinc-300/90 text-xs font-medium tracking-wide"
  }, React.createElement("span", {
    className: "perk-effect-label text-zinc-500 mr-2 uppercase text-[10px] font-bold"
  }, "Effect"), React.createElement(PerkDescriptionBlock, {
    perk: item,
    settings: settings,
    accentColor: accentTone,
    compactLines: 3,
    className: "inline",
    lineClassName: "leading-relaxed"
  })) : React.createElement("p", {
    className: "perk-effect-text text-zinc-300/90 text-xs leading-relaxed font-medium tracking-wide"
  }, React.createElement("span", {
    className: "perk-effect-label text-zinc-500 mr-2 uppercase text-[10px] font-bold"
  }, "Effect"), stripHtml(item.description))), isCharacter && expanded && onShowLore && React.createElement("div", {
    className: "mt-4 pt-3 border-t border-white/5"
  }, React.createElement("div", {
    className: "flex gap-2"
  }, React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      onShowLore();
    },
    className: "flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
  }, React.createElement(Icons.BookOpen, {
    width: 16,
    height: 16
  }), "Lore"), category === 'Killer' && item.power && onShowPower && React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      onShowPower();
    },
    className: "flex-1 py-2.5 rounded-xl bg-zinc-500/20 hover:bg-zinc-500/30 border border-white/25/30 text-zinc-100 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
  }, React.createElement(Icons.Zap, {
    width: 16,
    height: 16
  }), "Power"))), isCharacter && expanded && perksForOwner.length > 0 && React.createElement("div", {
    className: "mt-4 pt-3 border-t border-white/5"
  }, React.createElement("p", {
    className: "text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-3"
  }, "Teachables"), React.createElement("div", {
    className: "space-y-2"
  }, perksForOwner.slice(0, 3).map(perk => React.createElement("button", {
    key: perk.id,
    onClick: e => {
      e.stopPropagation();
      onPerkClick && onPerkClick(perk);
    },
    className: "w-full text-left p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/15 transition-colors flex items-start gap-3"
  }, React.createElement(AssetFrame, {
    type: "Perk",
    imageUrl: perk.image,
    fallbackIcon: React.createElement(Icons.BookOpen, {
      width: 18,
      height: 18,
      className: "text-white/60"
    })
  }), React.createElement("div", {
    className: "flex-1"
  }, React.createElement("p", {
    className: "text-white text-sm font-bold"
  }, perk.name), React.createElement(PerkDescriptionBlock, {
    perk: perk,
    settings: settings,
    accentColor: accentTone,
    compactLines: 2,
    className: "text-zinc-500 text-xs mt-1 leading-relaxed"
  })))))));
};
var ChaosShuffleView = _ref23 => {
  var _characters$find;
  var {
    onBack,
    perks,
    killers = [],
    survivors = [],
    items = [],
    addons = [],
    offerings = [],
    settings = {},
    ownedOnlyGlobal = false
  } = _ref23;
  var [role, setRole] = useState('Survivor');
  var [isSpinning, setIsSpinning] = useState(false);
  var [randomizeCharacter, setRandomizeCharacter] = useState(true);
  var [randomizePerks, setRandomizePerks] = useState(true);
  var [randomizeAddons, setRandomizeAddons] = useState(true);
  var [randomizeItem, setRandomizeItem] = useState(true);
  var [randomizeOffering, setRandomizeOffering] = useState(false);
  var [ownedCharacters, setOwnedCharacters] = useState(new Set());
  var [characterSearch, setCharacterSearch] = useState('');
  var [showOwnedSection, setShowOwnedSection] = useState(true);
  var [previousPerks, setPreviousPerks] = useState([]);
  var [lockedCharacterId, setLockedCharacterId] = useState(null);
  var [result, setResult] = useState({
    character: null,
    perks: [null, null, null, null],
    addons: [null, null],
    item: null,
    offering: null
  });
  var characters = useMemo(() => role === 'Killer' ? killers : survivors, [role, killers, survivors]);
  var filteredCharacters = useMemo(() => {
    var term = characterSearch.toLowerCase();
    return characters.filter(c => !term || c.name.toLowerCase().includes(term) || c.realName && c.realName.toLowerCase().includes(term));
  }, [characters, characterSearch]);
  useEffect(() => {
    setOwnedCharacters(new Set(characters.map(c => c.id)));
    setResult({
      character: null,
      perks: [null, null, null, null],
      addons: [null, null],
      item: null,
      offering: null
    });
    setPreviousPerks([]);
    setLockedCharacterId(null);
  }, [role, characters]);
  var toggleCharacter = id => {
    var next = new Set(ownedCharacters);
    if (next.has(id)) next.delete(id);else next.add(id);
    setOwnedCharacters(next);
  };
  var selectAllCharacters = () => setOwnedCharacters(new Set(characters.map(c => c.id)));
  var selectNoneCharacters = () => setOwnedCharacters(new Set());
  var getAddonsForSelection = useMemo(() => {
    if (role === 'Killer' && result.character) {
      return addons.filter(a => a.role === 'killer' && a.killerName === result.character.name);
    } else if (role === 'Survivor' && result.item) {
      return addons.filter(a => a.role === 'survivor' && a.itemType === result.item.itemType);
    }
    return [];
  }, [role, result.character, result.item, addons]);
  var survivorItems = useMemo(() => {
    return (items || []).filter(i => i.bloodweb === true && i.role === 'survivor');
  }, [items]);
  var roleOfferings = useMemo(() => {
    return (offerings || []).filter(o => !o.retired && (!o.role || o.role === role.toLowerCase() || o.role === null));
  }, [offerings, role]);
  var rollDice = () => {
    if (ownedCharacters.size === 0 && randomizeCharacter && !lockedCharacterId) {
      alert("Please select at least one ".concat(role, " you own!"));
      return;
    }
    setIsSpinning(true);
    triggerHaptic('Medium');
    setTimeout(() => {
      var newResult = _objectSpread({}, result);
      if (lockedCharacterId) {
        newResult.character = characters.find(c => c.id === lockedCharacterId) || null;
      } else if (randomizeCharacter) {
        var ownedChars = characters.filter(c => ownedCharacters.has(c.id));
        newResult.character = ownedChars[Math.floor(Math.random() * ownedChars.length)] || null;
      }
      if (randomizePerks) {
        var ownedNames = characters.filter(c => ownedCharacters.has(c.id)).map(c => c.name);
        var previousPerkIds = new Set(previousPerks.map(p => p === null || p === void 0 ? void 0 : p.id).filter(Boolean));
        var perkPool = perks.filter(p => {
          if (p.type !== role || previousPerkIds.has(p.id)) return false;
          if (ownedOnlyGlobal) return true;
          if (!p.owner) return true;
          return ownedNames.includes(p.owner);
        });
        var shuffledPerks = [...perkPool].sort(() => 0.5 - Math.random());
        newResult.perks = [shuffledPerks[0] || null, shuffledPerks[1] || null, shuffledPerks[2] || null, shuffledPerks[3] || null];
        setPreviousPerks(newResult.perks.filter(Boolean));
      }
      if (role === 'Survivor' && randomizeItem) {
        newResult.item = survivorItems[Math.floor(Math.random() * survivorItems.length)] || null;
      } else {
        newResult.item = null;
      }
      if (randomizeAddons) {
        var addonPool = [];
        if (role === 'Killer' && newResult.character) {
          addonPool = addons.filter(a => a.role === 'killer' && a.killerName === newResult.character.name);
        } else if (role === 'Survivor' && newResult.item) {
          addonPool = addons.filter(a => a.role === 'survivor' && a.itemType === newResult.item.itemType);
        }
        var shuffledAddons = [...addonPool].sort(() => 0.5 - Math.random());
        newResult.addons = [shuffledAddons[0] || null, shuffledAddons[1] || null];
      } else {
        newResult.addons = [null, null];
      }
      if (randomizeOffering) {
        newResult.offering = roleOfferings[Math.floor(Math.random() * roleOfferings.length)] || null;
      }
      setResult(newResult);
      setIsSpinning(false);
    }, 800);
  };
  var rollDiceRef = useRef(null);
  useEffect(() => {
    rollDiceRef.current = rollDice;
  });
  useEffect(() => {
    var lastShake = 0;
    var SHAKE_THRESHOLD = 15;
    var SHAKE_COOLDOWN = 1000;
    var handleMotion = event => {
      var {
        accelerationIncludingGravity
      } = event;
      if (!accelerationIncludingGravity) return;
      var {
        x,
        y,
        z
      } = accelerationIncludingGravity;
      var acceleration = Math.sqrt(x * x + y * y + z * z);
      var now = Date.now();
      if (acceleration > SHAKE_THRESHOLD && now - lastShake > SHAKE_COOLDOWN && !isSpinning) {
        var _rollDiceRef$current;
        lastShake = now;
        (_rollDiceRef$current = rollDiceRef.current) === null || _rollDiceRef$current === void 0 || _rollDiceRef$current.call(rollDiceRef);
      }
    };
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      window.addEventListener('click', function requestPermission() {
        DeviceMotionEvent.requestPermission().then(response => {
          if (response === 'granted') {
            window.addEventListener('devicemotion', handleMotion);
          }
        }).catch(console.error);
        window.removeEventListener('click', requestPermission);
      }, {
        once: true
      });
    } else if (typeof DeviceMotionEvent !== 'undefined') {
      window.addEventListener('devicemotion', handleMotion);
    }
    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [isSpinning]);
  var StandardView = () => React.createElement("div", {
    className: "space-y-6"
  }, React.createElement("h2", {
    className: "cx-sec"
  }, "Shuffle result"), React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("tbody", null, result.character && React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, role), React.createElement("td", null, React.createElement("div", {
    className: "flex items-center gap-4"
  }, React.createElement("div", {
    className: "w-1 h-16",
    style: {
      background: 'var(--accent)'
    }
  }), React.createElement(AssetFrame, {
    type: role,
    imageUrl: result.character.image
  }), React.createElement("div", {
    className: "flex-1"
  }, React.createElement("p", {
    className: "text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1"
  }, role), React.createElement("h3", {
    className: "text-xl font-bold text-white"
  }, result.character.name), result.character.realName && result.character.realName !== result.character.name && React.createElement("p", {
    className: "text-zinc-400 text-sm mt-1"
  }, result.character.realName))))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Perks"), React.createElement("td", null, React.createElement("div", {
    className: "grid grid-cols-2 gap-4"
  }, result.perks.map((perk, index) => React.createElement("div", {
    key: index,
    className: "flex flex-col items-center transition-all duration-500 ".concat(isSpinning ? 'scale-90 opacity-50 blur-sm' : 'scale-100 opacity-100')
  }, React.createElement(AssetFrame, {
    type: "Perk",
    size: "large",
    imageUrl: perk === null || perk === void 0 ? void 0 : perk.image,
    fallbackIcon: React.createElement(Icons.BookOpen, {
      width: 32,
      height: 32,
      className: perk ? 'text-white' : 'text-zinc-700'
    })
  }), React.createElement("div", {
    className: "mt-3 text-center h-14 w-28"
  }, perk ? React.createElement(React.Fragment, null, React.createElement("p", {
    className: "text-white text-[11px] font-bold uppercase tracking-wide line-clamp-2 leading-tight"
  }, perk.name), React.createElement("p", {
    className: "text-zinc-500 text-[9px] mt-1 truncate"
  }, perk.owner)) : React.createElement("p", {
    className: "text-xs font-bold uppercase tracking-widest",
    style: {
      color: 'var(--text-faint)'
    }
  }, "Empty"))))))), role === 'Survivor' && result.item && React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Item"), React.createElement("td", null, React.createElement("div", {
    className: "flex items-center gap-3"
  }, React.createElement("div", {
    className: "w-12 h-12 border flex items-center justify-center overflow-hidden",
    style: {
      borderColor: 'var(--stroke)'
    }
  }, React.createElement(AssetFrame, {
    type: "Item",
    size: "fill",
    imageUrl: result.item.image,
    fallbackIcon: React.createElement(Icons.Package, {
      width: 20,
      height: 20,
      className: "text-white/60"
    })
  })), React.createElement("div", null, React.createElement("p", {
    className: "text-white font-bold"
  }, result.item.name), React.createElement("p", {
    className: "text-xs text-zinc-500"
  }, result.item.itemType))))), (result.addons[0] || result.addons[1]) && React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, role === 'Killer' ? 'Power Addons' : 'Item Addons'), React.createElement("td", null, React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, result.addons.map((addon, i) => addon && React.createElement("div", {
    key: i,
    className: "p-3 cx-flatcard",
    style: {
      boxShadow: getRarityGlow(addon.rarity, settings.rarityGlows !== false)
    }
  }, React.createElement("p", {
    className: "text-white text-sm font-bold",
    style: {
      color: getRarityColor(addon.rarity)
    }
  }, addon.name), React.createElement("p", {
    className: "text-zinc-600 text-[10px] mt-1 line-clamp-2"
  }, addon.description)))))), result.offering && React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Offering"), React.createElement("td", null, React.createElement("p", {
    className: "text-white font-bold"
  }, result.offering.name), React.createElement("p", {
    className: "text-zinc-500 text-xs mt-1 line-clamp-2"
  }, result.offering.description))))));
  return React.createElement("div", {
    className: "flex flex-col h-full pt-6 pb-32 px-6 overflow-y-auto custom-scrollbar space-y-4"
  }, React.createElement(ViewCrumbs, {
    trail: [{
      label: 'Main page',
      onClick: onBack
    }],
    current: "Chaos Shuffle"
  }), React.createElement("h1", {
    className: "cx-title"
  }, "Chaos Shuffle"), React.createElement("p", {
    className: "cx-hatnote"
  }, "Randomize perk combos and loadouts."), React.createElement("h2", {
    className: "cx-sec"
  }, "Role"), React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Side"), React.createElement("td", null, React.createElement("div", {
    className: "flex gap-2"
  }, React.createElement("button", {
    type: "button",
    onClick: () => setRole('Survivor'),
    className: "mode-choice ".concat(role === 'Survivor' ? 'mode-choice--active' : '', " flex-1 py-2.5 text-xs font-bold uppercase tracking-wider"),
    "aria-pressed": role === 'Survivor'
  }, "Survivor"), React.createElement("button", {
    type: "button",
    onClick: () => setRole('Killer'),
    className: "mode-choice ".concat(role === 'Killer' ? 'mode-choice--active' : '', " flex-1 py-2.5 text-xs font-bold uppercase tracking-wider"),
    "aria-pressed": role === 'Killer'
  }, "Killer")))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Randomize"), React.createElement("td", null, React.createElement("div", {
    className: "flex flex-wrap gap-1.5"
  }, React.createElement("button", {
    onClick: () => setRandomizeCharacter(!randomizeCharacter),
    className: "cx-togglepill ".concat(randomizeCharacter ? 'cx-togglepill--on' : '')
  }, React.createElement("span", {
    className: "cx-dot"
  }), "Character"), React.createElement("button", {
    onClick: () => setRandomizePerks(!randomizePerks),
    className: "cx-togglepill ".concat(randomizePerks ? 'cx-togglepill--on' : '')
  }, React.createElement("span", {
    className: "cx-dot"
  }), "Perks"), React.createElement("button", {
    onClick: () => setRandomizeAddons(!randomizeAddons),
    className: "cx-togglepill ".concat(randomizeAddons ? 'cx-togglepill--on' : '')
  }, React.createElement("span", {
    className: "cx-dot"
  }), "Addons"), role === 'Survivor' && React.createElement("button", {
    onClick: () => {
      var newValue = !randomizeItem;
      setRandomizeItem(newValue);
      if (!newValue) setRandomizeAddons(false);
    },
    className: "cx-togglepill ".concat(randomizeItem ? 'cx-togglepill--on' : '')
  }, React.createElement("span", {
    className: "cx-dot"
  }), "Item"), React.createElement("button", {
    onClick: () => setRandomizeOffering(!randomizeOffering),
    className: "cx-togglepill ".concat(randomizeOffering ? 'cx-togglepill--on' : '')
  }, React.createElement("span", {
    className: "cx-dot"
  }), "Offering")))))), (() => {
    var lockedChar = lockedCharacterId ? characters.find(c => c.id === lockedCharacterId) : null;
    return React.createElement("div", null, React.createElement("h2", {
      className: "cx-sec"
    }, "Playing as"), React.createElement("table", {
      className: "cx-wikitable"
    }, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("th", {
      scope: "row"
    }, "Lock"), React.createElement("td", null, React.createElement("div", {
      className: "flex items-center justify-between mb-2"
    }, React.createElement("div", {
      className: "flex items-center gap-2"
    }, React.createElement(Icons.Lock, {
      width: 12,
      height: 12,
      className: lockedChar ? role === 'Killer' ? 'text-zinc-100' : 'text-zinc-100' : 'text-zinc-500'
    }), React.createElement("p", {
      className: "text-[10px] font-bold uppercase tracking-wider text-zinc-400"
    }, "Playing As"), lockedChar && React.createElement("span", {
      className: "cx-chip text-[10px] font-semibold"
    }, lockedChar.name)), lockedChar && React.createElement("button", {
      onClick: () => setLockedCharacterId(null),
      className: "cx-alink text-[10px] font-bold uppercase"
    }, "Clear")), !lockedChar ? React.createElement("p", {
      className: "text-zinc-600 text-[10px] mb-2"
    }, "Lock a specific ", role.toLowerCase(), " to always play. Perks still come from your owned pool below.") : React.createElement("div", {
      className: "flex items-center gap-3 p-2 cx-flatcard"
    }, React.createElement("div", {
      className: "w-12 h-12 overflow-hidden border",
      style: {
        borderColor: 'var(--stroke)'
      }
    }, React.createElement(AssetFrame, {
      type: role,
      imageUrl: lockedChar.image,
      size: "fill",
      fallbackIcon: React.createElement(Icons.User, {
        width: 16,
        height: 16,
        className: "text-zinc-600"
      })
    })), React.createElement("div", {
      className: "flex-1"
    }, React.createElement("p", {
      className: "text-white text-sm font-bold"
    }, lockedChar.name), lockedChar.realName && lockedChar.realName !== lockedChar.name && React.createElement("p", {
      className: "text-zinc-500 text-xs"
    }, lockedChar.realName)), React.createElement(Icons.Lock, {
      width: 14,
      height: 14,
      className: role === 'Killer' ? 'text-zinc-100' : 'text-zinc-100'
    })), !lockedChar && React.createElement("div", {
      className: "grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-1.5 mt-2 max-h-80 overflow-y-auto custom-scrollbar p-1"
    }, characters.map(char => React.createElement("button", {
      key: char.id,
      onClick: () => {
        setLockedCharacterId(char.id);
        triggerHaptic('Light');
      },
      className: "cx-pooltile relative aspect-square border transition-all overflow-hidden",
      style: {
        borderColor: 'var(--stroke)'
      },
      title: "Lock ".concat(char.name)
    }, React.createElement(AssetFrame, {
      type: role,
      imageUrl: char.image,
      size: "fill",
      fallbackIcon: React.createElement(Icons.User, {
        width: 14,
        height: 14,
        className: "text-zinc-600"
      })
    })))))))));
  })(), React.createElement("h2", {
    className: "cx-sec"
  }, "Owned pool"), React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Owned ", role, "s"), React.createElement("td", null, React.createElement("button", {
    onClick: () => setShowOwnedSection(!showOwnedSection),
    className: "w-full p-3 flex items-center justify-between"
  }, React.createElement("div", {
    className: "flex items-center gap-2"
  }, React.createElement("p", {
    className: "text-[10px] font-bold uppercase tracking-wider text-zinc-400"
  }, "Owned ", role, "s"), React.createElement("span", {
    className: "cx-chip text-[10px]"
  }, ownedCharacters.size, "/", characters.length)), React.createElement("div", {
    className: "flex items-center gap-2"
  }, React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      selectAllCharacters();
    },
    className: "cx-alink text-[10px] font-bold uppercase"
  }, "All"), React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      selectNoneCharacters();
    },
    className: "cx-alink text-[10px] font-bold uppercase"
  }, "None"), React.createElement(Icons.ChevronLeft, {
    width: 14,
    height: 14,
    className: "text-zinc-400 transition-transform ".concat(showOwnedSection ? '-rotate-90' : 'rotate-90')
  }))), showOwnedSection && React.createElement("div", {
    className: "px-3 pb-3 space-y-2"
  }, React.createElement("div", {
    className: "relative"
  }, React.createElement("div", {
    className: "absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500"
  }, React.createElement(Icons.Search, {
    width: 12,
    height: 12
  })), React.createElement("input", {
    value: characterSearch,
    onChange: e => setCharacterSearch(e.target.value),
    placeholder: "Search...",
    className: "cx-input w-full pl-7 pr-2 py-1.5 text-xs"
  })), React.createElement("div", {
    className: "grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-1.5 max-h-80 overflow-y-auto custom-scrollbar p-1"
  }, filteredCharacters.map(char => {
    var isOwned = ownedCharacters.has(char.id);
    return React.createElement("button", {
      key: char.id,
      onClick: () => toggleCharacter(char.id),
      className: "cx-pooltile relative aspect-square border transition-all overflow-hidden ".concat(isOwned ? '' : 'opacity-35 grayscale hover:opacity-60 hover:grayscale-0'),
      style: {
        borderColor: isOwned ? 'var(--accent)' : 'var(--stroke)'
      },
      title: char.name
    }, React.createElement(AssetFrame, {
      type: role,
      imageUrl: char.image,
      size: "fill",
      fallbackIcon: React.createElement(Icons.User, {
        width: 16,
        height: 16,
        className: "text-zinc-600"
      })
    }), isOwned && React.createElement("div", {
      className: "absolute top-0.5 right-0.5 w-2 h-2 rounded-full z-10",
      style: {
        background: 'var(--accent)'
      }
    }));
  }))))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Actions"), React.createElement("td", null, React.createElement("div", {
    className: "space-y-2 pt-2"
  }, React.createElement("button", {
    onClick: rollDice,
    disabled: isSpinning || ownedCharacters.size === 0 && !lockedCharacterId,
    className: "cx-toolbtn cx-toolbtn--primary w-full py-3 uppercase tracking-widest text-sm flex items-center justify-center gap-2"
  }, React.createElement(Icons.Dices, {
    width: 18,
    height: 18,
    className: isSpinning ? 'animate-spin' : ''
  }), isSpinning ? 'Consulting Entity...' : lockedCharacterId ? "Randomize as ".concat(((_characters$find = characters.find(c => c.id === lockedCharacterId)) === null || _characters$find === void 0 ? void 0 : _characters$find.name) || role) : 'Randomize'), (result.character || result.perks.some(p => p)) && !isSpinning && React.createElement("button", {
    onClick: () => {
      var _result$character, _result$character2, _result$character3, _result$item, _result$offering;
      var chaosLoadout = {
        name: "Chaos ".concat(((_result$character = result.character) === null || _result$character === void 0 ? void 0 : _result$character.name) || role, " Build"),
        role: role,
        characterId: ((_result$character2 = result.character) === null || _result$character2 === void 0 ? void 0 : _result$character2.id) || '',
        characterName: ((_result$character3 = result.character) === null || _result$character3 === void 0 ? void 0 : _result$character3.name) || '',
        perks: result.perks.filter(p => p !== null).map(p => ({
          id: p.id,
          name: p.name
        })),
        item: ((_result$item = result.item) === null || _result$item === void 0 ? void 0 : _result$item.name) || '',
        addons: result.addons.filter(a => a).map(a => a.name),
        offering: ((_result$offering = result.offering) === null || _result$offering === void 0 ? void 0 : _result$offering.name) || '',
        tags: ['chaos-shuffle'],
        notes: 'Generated by Chaos Shuffle'
      };
      var code = encodeBuild(chaosLoadout);
      if (code) {
        navigator.clipboard.writeText(code).then(() => alert('Build share text copied!')).catch(() => alert('Could not copy automatically. Please copy it manually.'));
      } else {
        alert('Could not prepare this build to share.');
      }
    },
    className: "cx-toolbtn cx-toolbtn--quiet w-full py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
  }, React.createElement(Icons.Share, {
    width: 14,
    height: 14
  }), "Share Build")))))), React.createElement("div", {
    className: "flex-1"
  }, React.createElement(StandardView, null)));
};
var HomeView = _ref24 => {
  var _randomResult$item, _randomResult$item2, _importPreview$perks, _importPreview$addons;
  var {
    setView,
    data,
    theme,
    builds = [],
    maps = [],
    challenges = [],
    setBuildSeed,
    perks = [],
    setBuilds,
    items = [],
    addons = [],
    offerings = [],
    cosmeticsCatalog = {
      characterSwaps: [],
      fullSets: []
    },
    allCharacters = [],
    onOpenCharacterProfile,
    settings = {}
  } = _ref24;
  var {
    killers = [],
    survivors = []
  } = data || {};
  var [searchTerm, setSearchTerm] = useState('');
  var deferredSearchTerm = useDeferredValue(searchTerm);
  var [results, setResults] = useState([]);
  var [randomResult, setRandomResult] = useState(null);
  var [showImportModal, setShowImportModal] = useState(false);
  var [importCode, setImportCode] = useState('');
  var [importError, setImportError] = useState('');
  var [importPreview, setImportPreview] = useState(null);
  var [importWarnings, setImportWarnings] = useState([]);
  var [quickKiller, setQuickKiller] = useState(null);
  var allCharactersById = useMemo(() => {
    var map = {};
    (allCharacters || []).forEach(character => {
      if (character !== null && character !== void 0 && character.id) map[character.id] = character;
    });
    return map;
  }, [allCharacters]);
  var {
    containerRef: pullRef,
    pullDistance,
    isRefreshing,
    pullHandlers
  } = usePullToRefresh(() => {
    return new Promise(resolve => setTimeout(resolve, 300));
  });
  ;
  var shuffleArray = arr => {
    var shuffled = [...arr];
    for (var i = shuffled.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };
  var rollQuickKiller = () => {
    var killer = shuffleArray(killers)[0] || null;
    setQuickKiller(killer);
  };
  var findKiller = query => {
    var q = query.toLowerCase().trim().replace(/^the(?:\s+|$)/, '');
    if (!q) return null;
    var exactName = killerLookup[q];
    if (exactName) return killers.find(killer => killer.name === exactName) || null;
    var candidates = killers.filter(killer => killer.name.toLowerCase().includes(q));
    return candidates.length === 1 ? candidates[0] : null;
  };
  var findItemType = query => {
    var q = query.toLowerCase().trim();
    var typeMap = Object.assign(Object.create(null), {
      'medkit': 'medkit',
      'med-kit': 'medkit',
      'med kit': 'medkit',
      'flashlight': 'flashlight',
      'torch': 'flashlight',
      'toolbox': 'toolbox',
      'tool box': 'toolbox',
      'tool': 'toolbox',
      'key': 'key',
      'keys': 'key',
      'map': 'map',
      'maps': 'map',
      'firecracker': 'firecracker',
      'firecrackers': 'firecracker'
    });
    return typeMap[q] || null;
  };
  var getRandomKillerAddons = function getRandomKillerAddons(killerName) {
    var count = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 2;
    var killerAddons = addons.filter(a => a.role === 'killer' && a.killerName === killerName);
    return shuffleArray(killerAddons).slice(0, count);
  };
  var getRandomItemAddons = function getRandomItemAddons(itemType) {
    var count = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 2;
    var itemAddons = addons.filter(a => a.role === 'survivor' && a.itemType === itemType);
    return shuffleArray(itemAddons).slice(0, count);
  };
  var getRandomItem = itemType => {
    var typeItems = items.filter(i => i.itemType === itemType && i.bloodweb === true);
    return shuffleArray(typeItems)[0] || null;
  };
  var getRandomOffering = () => {
    var available = offerings.filter(o => !o.retired);
    return shuffleArray(available)[0] || null;
  };
  var processRandomCommand = query => {
    var q = query.toLowerCase().trim();
    if (q === 'killer' || q === 'killers') {
      var _killer = shuffleArray(killers)[0] || null;
      if (_killer) {
        var randomAddons = getRandomKillerAddons(_killer.name);
        return {
          type: 'killer',
          killer: _killer,
          addons: randomAddons
        };
      }
    }
    if (q === 'offering' || q === 'offerings') {
      var offering = getRandomOffering();
      if (offering) {
        return {
          type: 'offering',
          offering
        };
      }
    }
    var killer = findKiller(q);
    if (killer) {
      var _randomAddons = getRandomKillerAddons(killer.name);
      return {
        type: 'killer',
        killer,
        addons: _randomAddons
      };
    }
    var itemType = findItemType(q);
    if (itemType) {
      var item = getRandomItem(itemType);
      var _randomAddons2 = getRandomItemAddons(itemType);
      return {
        type: 'item',
        item,
        itemType,
        addons: _randomAddons2
      };
    }
    return null;
  };
  var getRarityGlow = rarity => {
    var color = getRarityColor(rarity);
    return "0 0 12px ".concat(color, "40, 0 0 4px ").concat(color, "60");
  };
  useEffect(() => {
    if (searchTerm.trim().toLowerCase().startsWith('random:')) {
      var query = searchTerm.trim().slice(7).trim();
      if (query) {
        var result = processRandomCommand(query);
        setRandomResult(result);
      } else {
        setRandomResult({
          type: 'help'
        });
      }
      setResults([]);
    } else {
      setRandomResult(null);
    }
  }, [searchTerm]);
  var rerollRandom = () => {
    if (randomResult) {
      var query = searchTerm.trim().slice(7).trim();
      var newResult = processRandomCommand(query);
      setRandomResult(newResult);
    }
  };
  var clearRandom = () => {
    setSearchTerm('');
    setRandomResult(null);
  };
  var searchableCosmetics = useMemo(() => {
    var characterSwaps = Array.isArray(cosmeticsCatalog.characterSwaps) ? cosmeticsCatalog.characterSwaps.filter(entry => entry.status === 'ready') : [];
    var fullSets = Array.isArray(cosmeticsCatalog.fullSets) ? cosmeticsCatalog.fullSets.filter(entry => entry.status === 'ready') : [];
    return [...characterSwaps, ...fullSets];
  }, [cosmeticsCatalog]);
  var openCosmeticProfile = cosmetic => {
    if (!cosmetic || !onOpenCharacterProfile) return;
    var baseCharacter = allCharactersById[cosmetic.baseCharacterId];
    if (!baseCharacter) return;
    onOpenCharacterProfile(_objectSpread(_objectSpread({}, baseCharacter), {}, {
      cosmeticFocusId: cosmetic.id
    }));
  };
  var handleImportBuild = () => {
    if (!importCode.trim()) {
      setImportError('Please paste shared build text.');
      return;
    }
    var result = decodeBuild(importCode.trim(), {
      perks,
      killers,
      survivors,
      items,
      addons,
      offerings
    });
    if (!result.success) {
      setImportError(result.error || 'That shared build text is invalid. Please check and try again.');
      setImportPreview(null);
      return;
    }
    setImportPreview(result.build);
    setImportWarnings(result.warnings || []);
    setImportError('');
  };
  var confirmImport = () => {
    if (!importPreview) return;
    setBuildSeed && setBuildSeed(_objectSpread(_objectSpread({}, importPreview), {}, {
      name: importPreview.name + (importPreview.name.includes('(Imported)') ? '' : ' (Imported)')
    }));
    setShowImportModal(false);
    setImportCode('');
    setImportError('');
    setImportPreview(null);
    setImportWarnings([]);
    setView('buildLab');
  };
  var cancelImport = () => {
    setShowImportModal(false);
    setImportCode('');
    setImportError('');
    setImportPreview(null);
    setImportWarnings([]);
  };
  var rarityAliases = Object.assign(Object.create(null), RARITY_ALIASES);
  var IRIDESCENT_RARITIES = ['ultrarare', 'visceral'];
  var CATEGORY_TRIGGERS = Object.assign(Object.create(null), {
    'addon': 'Addon',
    'add-on': 'Addon',
    'addons': 'Addon',
    'add-ons': 'Addon',
    'perk': 'Perk',
    'perks': 'Perk',
    'offering': 'Offering',
    'offerings': 'Offering',
    'item': 'Item',
    'items': 'Item',
    'killer': 'Killer',
    'killers': 'Killer',
    'survivor': 'Survivor',
    'survivors': 'Survivor',
    'map': 'Map',
    'maps': 'Map',
    'build': 'Build',
    'builds': 'Build',
    'glossary': 'Glossary',
    'icon': 'GameIcon',
    'icons': 'GameIcon',
    'status': 'GameIcon',
    'challenge': 'Challenge',
    'challenges': 'Challenge',
    'chapter': 'Chapter',
    'legendary': 'Cosmetic',
    'cosmetic': 'Cosmetic',
    'cosmetics': 'Cosmetic'
  });
  var ITEM_TYPE_ALIASES = Object.assign(Object.create(null), {
    'medkit': 'medkit',
    'med-kit': 'medkit',
    'med kit': 'medkit',
    'medkits': 'medkit',
    'flashlight': 'flashlight',
    'torch': 'flashlight',
    'flashlights': 'flashlight',
    'toolbox': 'toolbox',
    'tool box': 'toolbox',
    'toolboxes': 'toolbox',
    'key': 'key',
    'keys': 'key',
    'firecracker': 'firecracker',
    'firecrackers': 'firecracker'
  });
  var STOP_WORDS = new Set(['the', 'a', 'an', 'that', 'this', 'with', 'for', 'and', 'but', 'or', 'of', 'to', 'in', 'on', 'is', 'it', 'has', 'his', 'her', 'its', 'your', 'you', 'yours', 'within', 'during', 'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how', 'show', 'shows', 'give', 'gives', 'find', 'finds', 'list', 'lists', 'tell', 'tells', 'me', 'my', 'are', 'was', 'were', 'be', 'been', 'being', 'do', 'does', 'did', 'done', 'can', 'could', 'should', 'would', 'will', 'shall', 'may', 'might', 'must', 'get', 'gets', 'best', 'good', 'top', 'all', 'any', 'some', 'there', 'their', 'they', 'them', 'then', 'than', 'too', 'just', 'like', 'want', 'wants', 'need', 'needs', 'use', 'uses', 'used', 'using', 'way', 'ways', 'kind', 'kinds', 'thing', 'things', 'much', 'many', 'more', 'most', 'other', 'such', 'same', 'each', 'every', 'both', 'also', 'even', 'ever', 'always', 'often', 'really', 'quite', 'please', 'vs', 'versus', 'per', 'about', 'around']);
  var MECHANIC_SYNONYMS = Object.assign(Object.create(null), {
    'gen': ['generator'],
    'heal': ['heal', 'recover', 'mend'],
    'mend': ['mend', 'heal'],
    'recover': ['recover', 'heal'],
    'hook': ['hook', 'unhook'],
    'unhook': ['unhook', 'hook', 'rescue'],
    'save': ['unhook', 'rescue'],
    'aura': ['aura', 'reveal'],
    'info': ['aura', 'reveal'],
    'pallet': ['pallet'],
    'vault': ['vault'],
    'chas': ['chase'],
    'loop': ['loop', 'tile'],
    'totem': ['totem'],
    'dull': ['totem'],
    'boon': ['boon', 'totem'],
    'bless': ['bless', 'boon'],
    'gate': ['gate', 'exit'],
    'exit': ['exit', 'gate'],
    'hatch': ['hatch'],
    'terror': ['terror', 'radius'],
    'tr': ['terror', 'radius'],
    'blind': ['blind'],
    'haste': ['haste', 'speed'],
    'speed': ['speed', 'haste'],
    'slow': ['slow', 'hinder'],
    'hinder': ['hinder', 'slow'],
    'exhaust': ['exhaust'],
    'broken': ['broken'],
    'mangl': ['mangl'],
    'undetectabl': ['undetectabl'],
    'stealth': ['undetectabl', 'sneak'],
    'collaps': ['collaps'],
    'endgam': ['endgam', 'collaps'],
    'regression': ['regression', 'kick'],
    'repair': ['repair'],
    'runn': ['run'],
    'stunn': ['stun'],
    'dropp': ['drop'],
    'trapp': ['trap'],
    'stopp': ['stop'],
    'grabb': ['grab']
  });
  var NEGATION_WORDS = new Set(['not', 'no', 'without', 'except', 'excluding', 'exclude']);
  var stemWord = w => {
    if (!w || w.length <= 2) return w;
    if (w.endsWith('ies') && w.length > 5) return w.slice(0, -3) + 'y';
    if (w.endsWith('ness') && w.length > 7) return w.slice(0, -4);
    if (w.endsWith('ing') && w.length > 6) {
      var base = w.slice(0, -3);
      if (base.length >= 4) return base;
      return w;
    }
    if (w.endsWith('ed') && w.length > 4) {
      var _base = w.slice(0, -2);
      if (_base.length >= 2) return _base;
      return w;
    }
    if (w.endsWith('oes') && w.length > 4) return w.slice(0, -2);
    if (/[^aeiou](s|x|z|ch|sh)es$/.test(w) && w.length > 5) return w.slice(0, -2);
    if (w.endsWith('s') && w.length > 4 && !/(ss|us|is)$/.test(w)) return w.slice(0, -1);
    if (w.endsWith('e') && w.length > 4 && /[^aeiou]$/.test(w.slice(0, -1)) && !w.endsWith('ee')) return w.slice(0, -1);
    return w;
  };
  var mechanicStems = useMemo(() => new Set([...Object.keys(MECHANIC_SYNONYMS), ...Object.values(MECHANIC_SYNONYMS).flat()].map(stemWord)), []);
  var editDistance = (a, b, max) => {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var prev = new Array(b.length + 1);
    var cur = new Array(b.length + 1);
    for (var j = 0; j <= b.length; j++) prev[j] = j;
    for (var i = 1; i <= a.length; i++) {
      cur[0] = i;
      var rowMin = i;
      for (var _j = 1; _j <= b.length; _j++) {
        cur[_j] = Math.min(prev[_j] + 1, cur[_j - 1] + 1, prev[_j - 1] + (a[i - 1] === b[_j - 1] ? 0 : 1));
        if (cur[_j] < rowMin) rowMin = cur[_j];
      }
      if (rowMin > max) return max + 1;
      var tmp = prev;
      prev = cur;
      cur = tmp;
    }
    return prev[b.length];
  };
  var fuzzyLookup = (token, lookup) => {
    var max = token.length >= 7 ? 2 : 1;
    var bestVal = null;
    var bestDist = max + 1;
    for (var key of Object.keys(lookup)) {
      if (token.length <= 5 && key.length < token.length) continue;
      var d = editDistance(token, key, max);
      if (d < bestDist) {
        bestDist = d;
        bestVal = lookup[key];
      }
    }
    return bestDist <= max ? bestVal : null;
  };
  var buildKillerLookup = () => {
    var lookup = Object.create(null);
    (data.killers || []).forEach(k => {
      var name = k.name.toLowerCase();
      var shortName = name.replace(/^the\s+/, '');
      lookup[name] = k.name;
      lookup[shortName] = k.name;
      if (k.realName) {
        var realLower = k.realName.toLowerCase();
        lookup[realLower] = k.name;
        var firstName = realLower.split(' ')[0];
        if (firstName.length > 2) lookup[firstName] = k.name;
      }
    });
    return lookup;
  };
  var buildSurvivorLookup = () => {
    var lookup = Object.create(null);
    (data.survivors || []).forEach(s => {
      var name = s.name.toLowerCase();
      lookup[name] = s.name;
      var firstName = name.split(' ')[0];
      if (firstName.length > 2) lookup[firstName] = s.name;
    });
    return lookup;
  };
  var killerLookup = useMemo(() => buildKillerLookup(), [data.killers]);
  var survivorLookup = useMemo(() => buildSurvivorLookup(), [data.survivors]);
  var scoreItem = (item, tokens, context) => {
    var score = 0;
    var {
      nameLower,
      descLower,
      descPositions,
      nameWords
    } = item._search;
    var fullQuery = context.fullQuery;
    if (fullQuery) {
      if (nameLower === fullQuery) score += 100;else if (nameLower.includes(fullQuery)) score += 50;
    }
    var exactHits = 0;
    var fuzzyHits = 0;
    var _loop2 = function _loop2(t) {
      if (nameLower.includes(t)) {
        exactHits++;
        return 1;
      }
      if (context.fuzzyNameTokens.has(t)) {
        var max = t.length >= 7 ? 2 : 1;
        var matches = context.fuzzyNameMatches.get(t);
        if (!matches) {
          matches = new Map();
          context.fuzzyNameMatches.set(t, matches);
        }
        if (nameWords.some(word => {
          if (t.length <= 5 && word.length < t.length) return false;
          if (!matches.has(word)) matches.set(word, editDistance(t, word, max) <= max);
          return matches.get(word);
        })) fuzzyHits++;
      }
    };
    for (var t of tokens) {
      if (_loop2(t)) continue;
    }
    var nameTokenHits = exactHits + fuzzyHits;
    if (nameTokenHits > 0) score += exactHits * 8 + fuzzyHits * 5;
    if (tokens.length > 0 && nameTokenHits === tokens.length) score += 15;
    if (context.killerName) {
      if (item.killerName === context.killerName) score += 20;
      if (item.owner === context.killerName) score += 20;
      if ((item.name || '') === context.killerName) score += 50;
    }
    if (context.survivorName) {
      if (item.owner === context.survivorName) score += 20;
      if ((item.name || '') === context.survivorName) score += 50;
    }
    if (context.rarity) {
      var itemRarity = (item.rarity || '').toLowerCase();
      if (context.rarity === 'iridescent') {
        if (IRIDESCENT_RARITIES.includes(itemRarity)) score += 15;
      } else if (itemRarity === context.rarity) {
        score += 15;
      }
    }
    if (context.category && item._category === context.category) score += 10;
    if (context.itemType) {
      if (item.itemType === context.itemType) score += 15;
    }
    if (context.role) {
      var itemRole = (item.role || item.type || '').toLowerCase();
      if (itemRole === context.role) score += 5;
    }
    var {
      aliases,
      aliasText
    } = item._search;
    if (aliases.length) {
      var aliasFullBonus = fullQuery && aliases.includes(fullQuery) ? 40 : fullQuery && aliasText.includes(fullQuery) ? 15 : 0;
      var aliasTokenBonus = 0;
      for (var token of context.descTokens) {
        if (token.length < 2 || !aliasText.includes(token)) continue;
        for (var alias of aliases) {
          if (alias.includes(token)) aliasTokenBonus += 5;
          if (aliasTokenBonus >= 10) break;
        }
        if (aliasTokenBonus >= 10) break;
      }
      score += aliasFullBonus + Math.min(aliasTokenBonus, 10);
    }
    var matchedPositions = new Set();
    var descHits = 0;
    for (var _t of context.descTokens) {
      var firstPosition = Infinity;
      for (var word of context.matchingDescStems.get(_t) || []) {
        var position = descPositions.get(word);
        if (position !== undefined && position < firstPosition) firstPosition = position;
      }
      if (firstPosition !== Infinity) {
        descHits++;
        matchedPositions.add(firstPosition);
        continue;
      }
      if (_t.length >= 3 && descLower.includes(_t)) score += 1;
    }
    if (descHits > 0) {
      score += descHits * 4;
      if (descHits >= context.descTokens.length * 0.7) score += 8;
    }
    if (context.synTokens && context.synTokens.length > 0) {
      var synHits = 0;
      for (var _t2 of context.synTokens) {
        if (descPositions.has(_t2)) synHits++;
      }
      if (synHits > 0) score += Math.min(synHits, 4) * 2;
    }
    if (matchedPositions.size >= 2) {
      var pos = [...matchedPositions].sort((a, b) => a - b);
      var minGap = Infinity;
      for (var i = 1; i < pos.length; i++) minGap = Math.min(minGap, pos[i] - pos[i - 1]);
      if (minGap <= 8) score += 10;
    }
    if (item.power) {
      var powerLower = item.power.toLowerCase();
      for (var _t3 of context.descTokens) {
        if (powerLower.includes(_t3)) score += 3;
      }
    }
    var _loop3 = function _loop3(_token) {
      if ((item.tags || []).some(tag => tag.toLowerCase().includes(_token))) score += 6;
      if (Array.isArray(item.perks) && item.perks.some(perk => (perk.name || '').toLowerCase().includes(_token))) score += 5;
    };
    for (var _token of tokens) {
      _loop3(_token);
    }
    if (item.realm) {
      var realmLower = item.realm.toLowerCase();
      for (var _t4 of tokens) {
        if (realmLower.includes(_t4)) score += 6;
      }
    }
    return score;
  };
  var parseSmartQuery = rawQuery => {
    var tokens = rawQuery.toLowerCase().split(/\s+/).map(t => t.replace(/^(?:[\0-\/:-@\[-`\{-\xA9\xAB-\xB1\xB4\xB6-\xB8\xBB\xBF\xD7\xF7\u02C2-\u02C5\u02D2-\u02DF\u02E5-\u02EB\u02ED\u02EF-\u036F\u0375\u0378\u0379\u037E\u0380-\u0385\u0387\u038B\u038D\u03A2\u03F6\u0482-\u0489\u0530\u0557\u0558\u055A-\u055F\u0589-\u05CF\u05EB-\u05EE\u05F3-\u061F\u064B-\u065F\u066A-\u066D\u0670\u06D4\u06D6-\u06E4\u06E7-\u06ED\u06FD\u06FE\u0700-\u070F\u0711\u0730-\u074C\u07A6-\u07B0\u07B2-\u07BF\u07EB-\u07F3\u07F6-\u07F9\u07FB-\u07FF\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u083F\u0859-\u085F\u086B-\u086F\u0888\u088F-\u089F\u08CA-\u0903\u093A-\u093C\u093E-\u094F\u0951-\u0957\u0962-\u0965\u0970\u0981-\u0984\u098D\u098E\u0991\u0992\u09A9\u09B1\u09B3-\u09B5\u09BA-\u09BC\u09BE-\u09CD\u09CF-\u09DB\u09DE\u09E2-\u09E5\u09F2\u09F3\u09FA\u09FB\u09FD-\u0A04\u0A0B-\u0A0E\u0A11\u0A12\u0A29\u0A31\u0A34\u0A37\u0A3A-\u0A58\u0A5D\u0A5F-\u0A65\u0A70\u0A71\u0A75-\u0A84\u0A8E\u0A92\u0AA9\u0AB1\u0AB4\u0ABA-\u0ABC\u0ABE-\u0ACF\u0AD1-\u0ADF\u0AE2-\u0AE5\u0AF0-\u0AF8\u0AFA-\u0B04\u0B0D\u0B0E\u0B11\u0B12\u0B29\u0B31\u0B34\u0B3A-\u0B3C\u0B3E-\u0B5B\u0B5E\u0B62-\u0B65\u0B70\u0B78-\u0B82\u0B84\u0B8B-\u0B8D\u0B91\u0B96-\u0B98\u0B9B\u0B9D\u0BA0-\u0BA2\u0BA5-\u0BA7\u0BAB-\u0BAD\u0BBA-\u0BCF\u0BD1-\u0BE5\u0BF3-\u0C04\u0C0D\u0C11\u0C29\u0C3A-\u0C3C\u0C3E-\u0C57\u0C5B\u0C5C\u0C5E\u0C5F\u0C62-\u0C65\u0C70-\u0C77\u0C7F\u0C81-\u0C84\u0C8D\u0C91\u0CA9\u0CB4\u0CBA-\u0CBC\u0CBE-\u0CDC\u0CDF\u0CE2-\u0CE5\u0CF0\u0CF3-\u0D03\u0D0D\u0D11\u0D3B\u0D3C\u0D3E-\u0D4D\u0D4F-\u0D53\u0D57\u0D62-\u0D65\u0D79\u0D80-\u0D84\u0D97-\u0D99\u0DB2\u0DBC\u0DBE\u0DBF\u0DC7-\u0DE5\u0DF0-\u0E00\u0E31\u0E34-\u0E3F\u0E47-\u0E4F\u0E5A-\u0E80\u0E83\u0E85\u0E8B\u0EA4\u0EA6\u0EB1\u0EB4-\u0EBC\u0EBE\u0EBF\u0EC5\u0EC7-\u0ECF\u0EDA\u0EDB\u0EE0-\u0EFF\u0F01-\u0F1F\u0F34-\u0F3F\u0F48\u0F6D-\u0F87\u0F8D-\u0FFF\u102B-\u103E\u104A-\u104F\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F\u109A-\u109F\u10C6\u10C8-\u10CC\u10CE\u10CF\u10FB\u1249\u124E\u124F\u1257\u1259\u125E\u125F\u1289\u128E\u128F\u12B1\u12B6\u12B7\u12BF\u12C1\u12C6\u12C7\u12D7\u1311\u1316\u1317\u135B-\u1368\u137D-\u137F\u1390-\u139F\u13F6\u13F7\u13FE-\u1400\u166D\u166E\u1680\u169B-\u169F\u16EB-\u16ED\u16F9-\u16FF\u1712-\u171E\u1732-\u173F\u1752-\u175F\u176D\u1771-\u177F\u17B4-\u17D6\u17D8-\u17DB\u17DD-\u17DF\u17EA-\u17EF\u17FA-\u180F\u181A-\u181F\u1879-\u187F\u1885\u1886\u18A9\u18AB-\u18AF\u18F6-\u18FF\u191F-\u1945\u196E\u196F\u1975-\u197F\u19AC-\u19AF\u19CA-\u19CF\u19DB-\u19FF\u1A17-\u1A1F\u1A55-\u1A7F\u1A8A-\u1A8F\u1A9A-\u1AA6\u1AA8-\u1B04\u1B34-\u1B44\u1B4D-\u1B4F\u1B5A-\u1B82\u1BA1-\u1BAD\u1BE6-\u1BFF\u1C24-\u1C3F\u1C4A-\u1C4C\u1C7E\u1C7F\u1C8B-\u1C8F\u1CBB\u1CBC\u1CC0-\u1CE8\u1CED\u1CF4\u1CF7-\u1CF9\u1CFB-\u1CFF\u1DC0-\u1DFF\u1F16\u1F17\u1F1E\u1F1F\u1F46\u1F47\u1F4E\u1F4F\u1F58\u1F5A\u1F5C\u1F5E\u1F7E\u1F7F\u1FB5\u1FBD\u1FBF-\u1FC1\u1FC5\u1FCD-\u1FCF\u1FD4\u1FD5\u1FDC-\u1FDF\u1FED-\u1FF1\u1FF5\u1FFD-\u206F\u2072\u2073\u207A-\u207E\u208A-\u208F\u209D-\u2101\u2103-\u2106\u2108\u2109\u2114\u2116-\u2118\u211E-\u2123\u2125\u2127\u2129\u212E\u213A\u213B\u2140-\u2144\u214A-\u214D\u214F\u218A-\u245F\u249C-\u24E9\u2500-\u2775\u2794-\u2BFF\u2CE5-\u2CEA\u2CEF-\u2CF1\u2CF4-\u2CFC\u2CFE\u2CFF\u2D26\u2D28-\u2D2C\u2D2E\u2D2F\u2D68-\u2D6E\u2D70-\u2D7F\u2D97-\u2D9F\u2DA7\u2DAF\u2DB7\u2DBF\u2DC7\u2DCF\u2DD7\u2DDF-\u2E2E\u2E30-\u3004\u3008-\u3020\u302A-\u3030\u3036\u3037\u303D-\u3040\u3097-\u309C\u30A0\u30FB\u3100-\u3104\u3130\u318F-\u3191\u3196-\u319F\u31C0-\u31EF\u3200-\u321F\u322A-\u3247\u3250\u3260-\u327F\u328A-\u32B0\u32C0-\u33FF\u4DC0-\u4DFF\uA48D-\uA4CF\uA4FE\uA4FF\uA60D-\uA60F\uA62C-\uA63F\uA66F-\uA67E\uA69E\uA69F\uA6F0-\uA716\uA720\uA721\uA789\uA78A\uA7CE\uA7CF\uA7D2\uA7D4\uA7DD-\uA7F1\uA802\uA806\uA80B\uA823-\uA82F\uA836-\uA83F\uA874-\uA881\uA8B4-\uA8CF\uA8DA-\uA8F1\uA8F8-\uA8FA\uA8FC\uA8FF\uA926-\uA92F\uA947-\uA95F\uA97D-\uA983\uA9B3-\uA9CE\uA9DA-\uA9DF\uA9E5\uA9FF\uAA29-\uAA3F\uAA43\uAA4C-\uAA4F\uAA5A-\uAA5F\uAA77-\uAA79\uAA7B-\uAA7D\uAAB0\uAAB2-\uAAB4\uAAB7\uAAB8\uAABE\uAABF\uAAC1\uAAC3-\uAADA\uAADE\uAADF\uAAEB-\uAAF1\uAAF5-\uAB00\uAB07\uAB08\uAB0F\uAB10\uAB17-\uAB1F\uAB27\uAB2F\uAB5B\uAB6A-\uAB6F\uABE3-\uABEF\uABFA-\uABFF\uD7A4-\uD7AF\uD7C7-\uD7CA\uD7FC-\uD7FF\uE000-\uF8FF\uFA6E\uFA6F\uFADA-\uFAFF\uFB07-\uFB12\uFB18-\uFB1C\uFB1E\uFB29\uFB37\uFB3D\uFB3F\uFB42\uFB45\uFBB2-\uFBD2\uFD3E-\uFD4F\uFD90\uFD91\uFDC8-\uFDEF\uFDFC-\uFE6F\uFE75\uFEFD-\uFF0F\uFF1A-\uFF20\uFF3B-\uFF40\uFF5B-\uFF65\uFFBF-\uFFC1\uFFC8\uFFC9\uFFD0\uFFD1\uFFD8\uFFD9\uFFDD-\uFFFF]|\uD800[\uDC0C\uDC27\uDC3B\uDC3E\uDC4E\uDC4F\uDC5E-\uDC7F\uDCFB-\uDD06\uDD34-\uDD3F\uDD79-\uDD89\uDD8C-\uDE7F\uDE9D-\uDE9F\uDED1-\uDEE0\uDEFC-\uDEFF\uDF24-\uDF2C\uDF4B-\uDF4F\uDF76-\uDF7F\uDF9E\uDF9F\uDFC4-\uDFC7\uDFD0\uDFD6-\uDFFF]|\uD801[\uDC9E\uDC9F\uDCAA-\uDCAF\uDCD4-\uDCD7\uDCFC-\uDCFF\uDD28-\uDD2F\uDD64-\uDD6F\uDD7B\uDD8B\uDD93\uDD96\uDDA2\uDDB2\uDDBA\uDDBD-\uDDBF\uDDF4-\uDDFF\uDF37-\uDF3F\uDF56-\uDF5F\uDF68-\uDF7F\uDF86\uDFB1\uDFBB-\uDFFF]|\uD802[\uDC06\uDC07\uDC09\uDC36\uDC39-\uDC3B\uDC3D\uDC3E\uDC56\uDC57\uDC77\uDC78\uDC9F-\uDCA6\uDCB0-\uDCDF\uDCF3\uDCF6-\uDCFA\uDD1C-\uDD1F\uDD3A-\uDD7F\uDDB8-\uDDBB\uDDD0\uDDD1\uDE01-\uDE0F\uDE14\uDE18\uDE36-\uDE3F\uDE49-\uDE5F\uDE7F\uDEA0-\uDEBF\uDEC8\uDEE5-\uDEEA\uDEF0-\uDEFF\uDF36-\uDF3F\uDF56\uDF57\uDF73-\uDF77\uDF92-\uDFA8\uDFB0-\uDFFF]|\uD803[\uDC49-\uDC7F\uDCB3-\uDCBF\uDCF3-\uDCF9\uDD24-\uDD2F\uDD3A-\uDD3F\uDD66-\uDD6E\uDD86-\uDE5F\uDE7F\uDEAA-\uDEAF\uDEB2-\uDEC1\uDEC5-\uDEFF\uDF28-\uDF2F\uDF46-\uDF50\uDF55-\uDF6F\uDF82-\uDFAF\uDFCC-\uDFDF\uDFF7-\uDFFF]|\uD804[\uDC00-\uDC02\uDC38-\uDC51\uDC70\uDC73\uDC74\uDC76-\uDC82\uDCB0-\uDCCF\uDCE9-\uDCEF\uDCFA-\uDD02\uDD27-\uDD35\uDD40-\uDD43\uDD45\uDD46\uDD48-\uDD4F\uDD73-\uDD75\uDD77-\uDD82\uDDB3-\uDDC0\uDDC5-\uDDCF\uDDDB\uDDDD-\uDDE0\uDDF5-\uDDFF\uDE12\uDE2C-\uDE3E\uDE41-\uDE7F\uDE87\uDE89\uDE8E\uDE9E\uDEA9-\uDEAF\uDEDF-\uDEEF\uDEFA-\uDF04\uDF0D\uDF0E\uDF11\uDF12\uDF29\uDF31\uDF34\uDF3A-\uDF3C\uDF3E-\uDF4F\uDF51-\uDF5C\uDF62-\uDF7F\uDF8A\uDF8C\uDF8D\uDF8F\uDFB6\uDFB8-\uDFD0\uDFD2\uDFD4-\uDFFF]|\uD805[\uDC35-\uDC46\uDC4B-\uDC4F\uDC5A-\uDC5E\uDC62-\uDC7F\uDCB0-\uDCC3\uDCC6\uDCC8-\uDCCF\uDCDA-\uDD7F\uDDAF-\uDDD7\uDDDC-\uDDFF\uDE30-\uDE43\uDE45-\uDE4F\uDE5A-\uDE7F\uDEAB-\uDEB7\uDEB9-\uDEBF\uDECA-\uDECF\uDEE4-\uDEFF\uDF1B-\uDF2F\uDF3C-\uDF3F\uDF47-\uDFFF]|\uD806[\uDC2C-\uDC9F\uDCF3-\uDCFE\uDD07\uDD08\uDD0A\uDD0B\uDD14\uDD17\uDD30-\uDD3E\uDD40\uDD42-\uDD4F\uDD5A-\uDD9F\uDDA8\uDDA9\uDDD1-\uDDE0\uDDE2\uDDE4-\uDDFF\uDE01-\uDE0A\uDE33-\uDE39\uDE3B-\uDE4F\uDE51-\uDE5B\uDE8A-\uDE9C\uDE9E-\uDEAF\uDEF9-\uDFBF\uDFE1-\uDFEF\uDFFA-\uDFFF]|\uD807[\uDC09\uDC2F-\uDC3F\uDC41-\uDC4F\uDC6D-\uDC71\uDC90-\uDCFF\uDD07\uDD0A\uDD31-\uDD45\uDD47-\uDD4F\uDD5A-\uDD5F\uDD66\uDD69\uDD8A-\uDD97\uDD99-\uDD9F\uDDAA-\uDEDF\uDEF3-\uDF01\uDF03\uDF11\uDF34-\uDF4F\uDF5A-\uDFAF\uDFB1-\uDFBF\uDFD5-\uDFFF]|\uD808[\uDF9A-\uDFFF]|\uD809[\uDC6F-\uDC7F\uDD44-\uDFFF]|[\uD80A\uD812-\uD817\uD819\uD824-\uD82A\uD82D\uD82E\uD830-\uD832\uD836\uD83D\uD83F\uD87C\uD87D\uD87F\uD889-\uDBFF][\uDC00-\uDFFF]|\uD80B[\uDC00-\uDF8F\uDFF1-\uDFFF]|\uD80D[\uDC30-\uDC40\uDC47-\uDC5F]|\uD810[\uDFFB-\uDFFF]|\uD811[\uDE47-\uDFFF]|\uD818[\uDC00-\uDCFF\uDD1E-\uDD2F\uDD3A-\uDFFF]|\uD81A[\uDE39-\uDE3F\uDE5F\uDE6A-\uDE6F\uDEBF\uDECA-\uDECF\uDEEE-\uDEFF\uDF30-\uDF3F\uDF44-\uDF4F\uDF5A\uDF62\uDF78-\uDF7C\uDF90-\uDFFF]|\uD81B[\uDC00-\uDD3F\uDD6D-\uDD6F\uDD7A-\uDE3F\uDE97-\uDEFF\uDF4B-\uDF4F\uDF51-\uDF92\uDFA0-\uDFDF\uDFE2\uDFE4-\uDFFF]|\uD821[\uDFF8-\uDFFF]|\uD823[\uDCD6-\uDCFE\uDD09-\uDFFF]|\uD82B[\uDC00-\uDFEF\uDFF4\uDFFC\uDFFF]|\uD82C[\uDD23-\uDD31\uDD33-\uDD4F\uDD53\uDD54\uDD56-\uDD63\uDD68-\uDD6F\uDEFC-\uDFFF]|\uD82F[\uDC6B-\uDC6F\uDC7D-\uDC7F\uDC89-\uDC8F\uDC9A-\uDFFF]|\uD833[\uDC00-\uDCEF\uDCFA-\uDFFF]|\uD834[\uDC00-\uDEBF\uDED4-\uDEDF\uDEF4-\uDF5F\uDF79-\uDFFF]|\uD835[\uDC55\uDC9D\uDCA0\uDCA1\uDCA3\uDCA4\uDCA7\uDCA8\uDCAD\uDCBA\uDCBC\uDCC4\uDD06\uDD0B\uDD0C\uDD15\uDD1D\uDD3A\uDD3F\uDD45\uDD47-\uDD49\uDD51\uDEA6\uDEA7\uDEC1\uDEDB\uDEFB\uDF15\uDF35\uDF4F\uDF6F\uDF89\uDFA9\uDFC3\uDFCC\uDFCD]|\uD837[\uDC00-\uDEFF\uDF1F-\uDF24\uDF2B-\uDFFF]|\uD838[\uDC00-\uDC2F\uDC6E-\uDCFF\uDD2D-\uDD36\uDD3E\uDD3F\uDD4A-\uDD4D\uDD4F-\uDE8F\uDEAE-\uDEBF\uDEEC-\uDEEF\uDEFA-\uDFFF]|\uD839[\uDC00-\uDCCF\uDCEC-\uDCEF\uDCFA-\uDDCF\uDDEE\uDDEF\uDDFB-\uDFDF\uDFE7\uDFEC\uDFEF\uDFFF]|\uD83A[\uDCC5\uDCC6\uDCD0-\uDCFF\uDD44-\uDD4A\uDD4C-\uDD4F\uDD5A-\uDFFF]|\uD83B[\uDC00-\uDC70\uDCAC\uDCB0\uDCB5-\uDD00\uDD2E\uDD3E-\uDDFF\uDE04\uDE20\uDE23\uDE25\uDE26\uDE28\uDE33\uDE38\uDE3A\uDE3C-\uDE41\uDE43-\uDE46\uDE48\uDE4A\uDE4C\uDE50\uDE53\uDE55\uDE56\uDE58\uDE5A\uDE5C\uDE5E\uDE60\uDE63\uDE65\uDE66\uDE6B\uDE73\uDE78\uDE7D\uDE7F\uDE8A\uDE9C-\uDEA0\uDEA4\uDEAA\uDEBC-\uDFFF]|\uD83C[\uDC00-\uDCFF\uDD0D-\uDFFF]|\uD83E[\uDC00-\uDFEF\uDFFA-\uDFFF]|\uD869[\uDEE0-\uDEFF]|\uD86D[\uDF3A-\uDF3F]|\uD86E[\uDC1E\uDC1F]|\uD873[\uDEA2-\uDEAF]|\uD87A[\uDFE1-\uDFEF]|\uD87B[\uDE5E-\uDFFF]|\uD87E[\uDE1E-\uDFFF]|\uD884[\uDF4B-\uDF4F]|\uD888[\uDFB0-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+|(?:[\0-\/:-@\[-`\{-\xA9\xAB-\xB1\xB4\xB6-\xB8\xBB\xBF\xD7\xF7\u02C2-\u02C5\u02D2-\u02DF\u02E5-\u02EB\u02ED\u02EF-\u036F\u0375\u0378\u0379\u037E\u0380-\u0385\u0387\u038B\u038D\u03A2\u03F6\u0482-\u0489\u0530\u0557\u0558\u055A-\u055F\u0589-\u05CF\u05EB-\u05EE\u05F3-\u061F\u064B-\u065F\u066A-\u066D\u0670\u06D4\u06D6-\u06E4\u06E7-\u06ED\u06FD\u06FE\u0700-\u070F\u0711\u0730-\u074C\u07A6-\u07B0\u07B2-\u07BF\u07EB-\u07F3\u07F6-\u07F9\u07FB-\u07FF\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u083F\u0859-\u085F\u086B-\u086F\u0888\u088F-\u089F\u08CA-\u0903\u093A-\u093C\u093E-\u094F\u0951-\u0957\u0962-\u0965\u0970\u0981-\u0984\u098D\u098E\u0991\u0992\u09A9\u09B1\u09B3-\u09B5\u09BA-\u09BC\u09BE-\u09CD\u09CF-\u09DB\u09DE\u09E2-\u09E5\u09F2\u09F3\u09FA\u09FB\u09FD-\u0A04\u0A0B-\u0A0E\u0A11\u0A12\u0A29\u0A31\u0A34\u0A37\u0A3A-\u0A58\u0A5D\u0A5F-\u0A65\u0A70\u0A71\u0A75-\u0A84\u0A8E\u0A92\u0AA9\u0AB1\u0AB4\u0ABA-\u0ABC\u0ABE-\u0ACF\u0AD1-\u0ADF\u0AE2-\u0AE5\u0AF0-\u0AF8\u0AFA-\u0B04\u0B0D\u0B0E\u0B11\u0B12\u0B29\u0B31\u0B34\u0B3A-\u0B3C\u0B3E-\u0B5B\u0B5E\u0B62-\u0B65\u0B70\u0B78-\u0B82\u0B84\u0B8B-\u0B8D\u0B91\u0B96-\u0B98\u0B9B\u0B9D\u0BA0-\u0BA2\u0BA5-\u0BA7\u0BAB-\u0BAD\u0BBA-\u0BCF\u0BD1-\u0BE5\u0BF3-\u0C04\u0C0D\u0C11\u0C29\u0C3A-\u0C3C\u0C3E-\u0C57\u0C5B\u0C5C\u0C5E\u0C5F\u0C62-\u0C65\u0C70-\u0C77\u0C7F\u0C81-\u0C84\u0C8D\u0C91\u0CA9\u0CB4\u0CBA-\u0CBC\u0CBE-\u0CDC\u0CDF\u0CE2-\u0CE5\u0CF0\u0CF3-\u0D03\u0D0D\u0D11\u0D3B\u0D3C\u0D3E-\u0D4D\u0D4F-\u0D53\u0D57\u0D62-\u0D65\u0D79\u0D80-\u0D84\u0D97-\u0D99\u0DB2\u0DBC\u0DBE\u0DBF\u0DC7-\u0DE5\u0DF0-\u0E00\u0E31\u0E34-\u0E3F\u0E47-\u0E4F\u0E5A-\u0E80\u0E83\u0E85\u0E8B\u0EA4\u0EA6\u0EB1\u0EB4-\u0EBC\u0EBE\u0EBF\u0EC5\u0EC7-\u0ECF\u0EDA\u0EDB\u0EE0-\u0EFF\u0F01-\u0F1F\u0F34-\u0F3F\u0F48\u0F6D-\u0F87\u0F8D-\u0FFF\u102B-\u103E\u104A-\u104F\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F\u109A-\u109F\u10C6\u10C8-\u10CC\u10CE\u10CF\u10FB\u1249\u124E\u124F\u1257\u1259\u125E\u125F\u1289\u128E\u128F\u12B1\u12B6\u12B7\u12BF\u12C1\u12C6\u12C7\u12D7\u1311\u1316\u1317\u135B-\u1368\u137D-\u137F\u1390-\u139F\u13F6\u13F7\u13FE-\u1400\u166D\u166E\u1680\u169B-\u169F\u16EB-\u16ED\u16F9-\u16FF\u1712-\u171E\u1732-\u173F\u1752-\u175F\u176D\u1771-\u177F\u17B4-\u17D6\u17D8-\u17DB\u17DD-\u17DF\u17EA-\u17EF\u17FA-\u180F\u181A-\u181F\u1879-\u187F\u1885\u1886\u18A9\u18AB-\u18AF\u18F6-\u18FF\u191F-\u1945\u196E\u196F\u1975-\u197F\u19AC-\u19AF\u19CA-\u19CF\u19DB-\u19FF\u1A17-\u1A1F\u1A55-\u1A7F\u1A8A-\u1A8F\u1A9A-\u1AA6\u1AA8-\u1B04\u1B34-\u1B44\u1B4D-\u1B4F\u1B5A-\u1B82\u1BA1-\u1BAD\u1BE6-\u1BFF\u1C24-\u1C3F\u1C4A-\u1C4C\u1C7E\u1C7F\u1C8B-\u1C8F\u1CBB\u1CBC\u1CC0-\u1CE8\u1CED\u1CF4\u1CF7-\u1CF9\u1CFB-\u1CFF\u1DC0-\u1DFF\u1F16\u1F17\u1F1E\u1F1F\u1F46\u1F47\u1F4E\u1F4F\u1F58\u1F5A\u1F5C\u1F5E\u1F7E\u1F7F\u1FB5\u1FBD\u1FBF-\u1FC1\u1FC5\u1FCD-\u1FCF\u1FD4\u1FD5\u1FDC-\u1FDF\u1FED-\u1FF1\u1FF5\u1FFD-\u206F\u2072\u2073\u207A-\u207E\u208A-\u208F\u209D-\u2101\u2103-\u2106\u2108\u2109\u2114\u2116-\u2118\u211E-\u2123\u2125\u2127\u2129\u212E\u213A\u213B\u2140-\u2144\u214A-\u214D\u214F\u218A-\u245F\u249C-\u24E9\u2500-\u2775\u2794-\u2BFF\u2CE5-\u2CEA\u2CEF-\u2CF1\u2CF4-\u2CFC\u2CFE\u2CFF\u2D26\u2D28-\u2D2C\u2D2E\u2D2F\u2D68-\u2D6E\u2D70-\u2D7F\u2D97-\u2D9F\u2DA7\u2DAF\u2DB7\u2DBF\u2DC7\u2DCF\u2DD7\u2DDF-\u2E2E\u2E30-\u3004\u3008-\u3020\u302A-\u3030\u3036\u3037\u303D-\u3040\u3097-\u309C\u30A0\u30FB\u3100-\u3104\u3130\u318F-\u3191\u3196-\u319F\u31C0-\u31EF\u3200-\u321F\u322A-\u3247\u3250\u3260-\u327F\u328A-\u32B0\u32C0-\u33FF\u4DC0-\u4DFF\uA48D-\uA4CF\uA4FE\uA4FF\uA60D-\uA60F\uA62C-\uA63F\uA66F-\uA67E\uA69E\uA69F\uA6F0-\uA716\uA720\uA721\uA789\uA78A\uA7CE\uA7CF\uA7D2\uA7D4\uA7DD-\uA7F1\uA802\uA806\uA80B\uA823-\uA82F\uA836-\uA83F\uA874-\uA881\uA8B4-\uA8CF\uA8DA-\uA8F1\uA8F8-\uA8FA\uA8FC\uA8FF\uA926-\uA92F\uA947-\uA95F\uA97D-\uA983\uA9B3-\uA9CE\uA9DA-\uA9DF\uA9E5\uA9FF\uAA29-\uAA3F\uAA43\uAA4C-\uAA4F\uAA5A-\uAA5F\uAA77-\uAA79\uAA7B-\uAA7D\uAAB0\uAAB2-\uAAB4\uAAB7\uAAB8\uAABE\uAABF\uAAC1\uAAC3-\uAADA\uAADE\uAADF\uAAEB-\uAAF1\uAAF5-\uAB00\uAB07\uAB08\uAB0F\uAB10\uAB17-\uAB1F\uAB27\uAB2F\uAB5B\uAB6A-\uAB6F\uABE3-\uABEF\uABFA-\uABFF\uD7A4-\uD7AF\uD7C7-\uD7CA\uD7FC-\uD7FF\uE000-\uF8FF\uFA6E\uFA6F\uFADA-\uFAFF\uFB07-\uFB12\uFB18-\uFB1C\uFB1E\uFB29\uFB37\uFB3D\uFB3F\uFB42\uFB45\uFBB2-\uFBD2\uFD3E-\uFD4F\uFD90\uFD91\uFDC8-\uFDEF\uFDFC-\uFE6F\uFE75\uFEFD-\uFF0F\uFF1A-\uFF20\uFF3B-\uFF40\uFF5B-\uFF65\uFFBF-\uFFC1\uFFC8\uFFC9\uFFD0\uFFD1\uFFD8\uFFD9\uFFDD-\uFFFF]|\uD800[\uDC0C\uDC27\uDC3B\uDC3E\uDC4E\uDC4F\uDC5E-\uDC7F\uDCFB-\uDD06\uDD34-\uDD3F\uDD79-\uDD89\uDD8C-\uDE7F\uDE9D-\uDE9F\uDED1-\uDEE0\uDEFC-\uDEFF\uDF24-\uDF2C\uDF4B-\uDF4F\uDF76-\uDF7F\uDF9E\uDF9F\uDFC4-\uDFC7\uDFD0\uDFD6-\uDFFF]|\uD801[\uDC9E\uDC9F\uDCAA-\uDCAF\uDCD4-\uDCD7\uDCFC-\uDCFF\uDD28-\uDD2F\uDD64-\uDD6F\uDD7B\uDD8B\uDD93\uDD96\uDDA2\uDDB2\uDDBA\uDDBD-\uDDBF\uDDF4-\uDDFF\uDF37-\uDF3F\uDF56-\uDF5F\uDF68-\uDF7F\uDF86\uDFB1\uDFBB-\uDFFF]|\uD802[\uDC06\uDC07\uDC09\uDC36\uDC39-\uDC3B\uDC3D\uDC3E\uDC56\uDC57\uDC77\uDC78\uDC9F-\uDCA6\uDCB0-\uDCDF\uDCF3\uDCF6-\uDCFA\uDD1C-\uDD1F\uDD3A-\uDD7F\uDDB8-\uDDBB\uDDD0\uDDD1\uDE01-\uDE0F\uDE14\uDE18\uDE36-\uDE3F\uDE49-\uDE5F\uDE7F\uDEA0-\uDEBF\uDEC8\uDEE5-\uDEEA\uDEF0-\uDEFF\uDF36-\uDF3F\uDF56\uDF57\uDF73-\uDF77\uDF92-\uDFA8\uDFB0-\uDFFF]|\uD803[\uDC49-\uDC7F\uDCB3-\uDCBF\uDCF3-\uDCF9\uDD24-\uDD2F\uDD3A-\uDD3F\uDD66-\uDD6E\uDD86-\uDE5F\uDE7F\uDEAA-\uDEAF\uDEB2-\uDEC1\uDEC5-\uDEFF\uDF28-\uDF2F\uDF46-\uDF50\uDF55-\uDF6F\uDF82-\uDFAF\uDFCC-\uDFDF\uDFF7-\uDFFF]|\uD804[\uDC00-\uDC02\uDC38-\uDC51\uDC70\uDC73\uDC74\uDC76-\uDC82\uDCB0-\uDCCF\uDCE9-\uDCEF\uDCFA-\uDD02\uDD27-\uDD35\uDD40-\uDD43\uDD45\uDD46\uDD48-\uDD4F\uDD73-\uDD75\uDD77-\uDD82\uDDB3-\uDDC0\uDDC5-\uDDCF\uDDDB\uDDDD-\uDDE0\uDDF5-\uDDFF\uDE12\uDE2C-\uDE3E\uDE41-\uDE7F\uDE87\uDE89\uDE8E\uDE9E\uDEA9-\uDEAF\uDEDF-\uDEEF\uDEFA-\uDF04\uDF0D\uDF0E\uDF11\uDF12\uDF29\uDF31\uDF34\uDF3A-\uDF3C\uDF3E-\uDF4F\uDF51-\uDF5C\uDF62-\uDF7F\uDF8A\uDF8C\uDF8D\uDF8F\uDFB6\uDFB8-\uDFD0\uDFD2\uDFD4-\uDFFF]|\uD805[\uDC35-\uDC46\uDC4B-\uDC4F\uDC5A-\uDC5E\uDC62-\uDC7F\uDCB0-\uDCC3\uDCC6\uDCC8-\uDCCF\uDCDA-\uDD7F\uDDAF-\uDDD7\uDDDC-\uDDFF\uDE30-\uDE43\uDE45-\uDE4F\uDE5A-\uDE7F\uDEAB-\uDEB7\uDEB9-\uDEBF\uDECA-\uDECF\uDEE4-\uDEFF\uDF1B-\uDF2F\uDF3C-\uDF3F\uDF47-\uDFFF]|\uD806[\uDC2C-\uDC9F\uDCF3-\uDCFE\uDD07\uDD08\uDD0A\uDD0B\uDD14\uDD17\uDD30-\uDD3E\uDD40\uDD42-\uDD4F\uDD5A-\uDD9F\uDDA8\uDDA9\uDDD1-\uDDE0\uDDE2\uDDE4-\uDDFF\uDE01-\uDE0A\uDE33-\uDE39\uDE3B-\uDE4F\uDE51-\uDE5B\uDE8A-\uDE9C\uDE9E-\uDEAF\uDEF9-\uDFBF\uDFE1-\uDFEF\uDFFA-\uDFFF]|\uD807[\uDC09\uDC2F-\uDC3F\uDC41-\uDC4F\uDC6D-\uDC71\uDC90-\uDCFF\uDD07\uDD0A\uDD31-\uDD45\uDD47-\uDD4F\uDD5A-\uDD5F\uDD66\uDD69\uDD8A-\uDD97\uDD99-\uDD9F\uDDAA-\uDEDF\uDEF3-\uDF01\uDF03\uDF11\uDF34-\uDF4F\uDF5A-\uDFAF\uDFB1-\uDFBF\uDFD5-\uDFFF]|\uD808[\uDF9A-\uDFFF]|\uD809[\uDC6F-\uDC7F\uDD44-\uDFFF]|[\uD80A\uD812-\uD817\uD819\uD824-\uD82A\uD82D\uD82E\uD830-\uD832\uD836\uD83D\uD83F\uD87C\uD87D\uD87F\uD889-\uDBFF][\uDC00-\uDFFF]|\uD80B[\uDC00-\uDF8F\uDFF1-\uDFFF]|\uD80D[\uDC30-\uDC40\uDC47-\uDC5F]|\uD810[\uDFFB-\uDFFF]|\uD811[\uDE47-\uDFFF]|\uD818[\uDC00-\uDCFF\uDD1E-\uDD2F\uDD3A-\uDFFF]|\uD81A[\uDE39-\uDE3F\uDE5F\uDE6A-\uDE6F\uDEBF\uDECA-\uDECF\uDEEE-\uDEFF\uDF30-\uDF3F\uDF44-\uDF4F\uDF5A\uDF62\uDF78-\uDF7C\uDF90-\uDFFF]|\uD81B[\uDC00-\uDD3F\uDD6D-\uDD6F\uDD7A-\uDE3F\uDE97-\uDEFF\uDF4B-\uDF4F\uDF51-\uDF92\uDFA0-\uDFDF\uDFE2\uDFE4-\uDFFF]|\uD821[\uDFF8-\uDFFF]|\uD823[\uDCD6-\uDCFE\uDD09-\uDFFF]|\uD82B[\uDC00-\uDFEF\uDFF4\uDFFC\uDFFF]|\uD82C[\uDD23-\uDD31\uDD33-\uDD4F\uDD53\uDD54\uDD56-\uDD63\uDD68-\uDD6F\uDEFC-\uDFFF]|\uD82F[\uDC6B-\uDC6F\uDC7D-\uDC7F\uDC89-\uDC8F\uDC9A-\uDFFF]|\uD833[\uDC00-\uDCEF\uDCFA-\uDFFF]|\uD834[\uDC00-\uDEBF\uDED4-\uDEDF\uDEF4-\uDF5F\uDF79-\uDFFF]|\uD835[\uDC55\uDC9D\uDCA0\uDCA1\uDCA3\uDCA4\uDCA7\uDCA8\uDCAD\uDCBA\uDCBC\uDCC4\uDD06\uDD0B\uDD0C\uDD15\uDD1D\uDD3A\uDD3F\uDD45\uDD47-\uDD49\uDD51\uDEA6\uDEA7\uDEC1\uDEDB\uDEFB\uDF15\uDF35\uDF4F\uDF6F\uDF89\uDFA9\uDFC3\uDFCC\uDFCD]|\uD837[\uDC00-\uDEFF\uDF1F-\uDF24\uDF2B-\uDFFF]|\uD838[\uDC00-\uDC2F\uDC6E-\uDCFF\uDD2D-\uDD36\uDD3E\uDD3F\uDD4A-\uDD4D\uDD4F-\uDE8F\uDEAE-\uDEBF\uDEEC-\uDEEF\uDEFA-\uDFFF]|\uD839[\uDC00-\uDCCF\uDCEC-\uDCEF\uDCFA-\uDDCF\uDDEE\uDDEF\uDDFB-\uDFDF\uDFE7\uDFEC\uDFEF\uDFFF]|\uD83A[\uDCC5\uDCC6\uDCD0-\uDCFF\uDD44-\uDD4A\uDD4C-\uDD4F\uDD5A-\uDFFF]|\uD83B[\uDC00-\uDC70\uDCAC\uDCB0\uDCB5-\uDD00\uDD2E\uDD3E-\uDDFF\uDE04\uDE20\uDE23\uDE25\uDE26\uDE28\uDE33\uDE38\uDE3A\uDE3C-\uDE41\uDE43-\uDE46\uDE48\uDE4A\uDE4C\uDE50\uDE53\uDE55\uDE56\uDE58\uDE5A\uDE5C\uDE5E\uDE60\uDE63\uDE65\uDE66\uDE6B\uDE73\uDE78\uDE7D\uDE7F\uDE8A\uDE9C-\uDEA0\uDEA4\uDEAA\uDEBC-\uDFFF]|\uD83C[\uDC00-\uDCFF\uDD0D-\uDFFF]|\uD83E[\uDC00-\uDFEF\uDFFA-\uDFFF]|\uD869[\uDEE0-\uDEFF]|\uD86D[\uDF3A-\uDF3F]|\uD86E[\uDC1E\uDC1F]|\uD873[\uDEA2-\uDEAF]|\uD87A[\uDFE1-\uDFEF]|\uD87B[\uDE5E-\uDFFF]|\uD87E[\uDE1E-\uDFFF]|\uD884[\uDF4B-\uDF4F]|\uD888[\uDFB0-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+$/g, '')).filter(t => t.length > 0);
    var meaningfulTokens = tokens.filter(t => !STOP_WORDS.has(t) && t.length > 1);
    var context = {
      killerName: null,
      survivorName: null,
      rarity: null,
      category: null,
      role: null,
      itemType: null,
      descTokens: [],
      synTokens: [],
      excluded: [],
      fuzzyNameMatches: new Map()
    };
    var usedTokens = new Set();
    for (var i = 0; i < meaningfulTokens.length; i++) {
      var token = meaningfulTokens[i];
      if (!NEGATION_WORDS.has(token) || usedTokens.has(token)) continue;
      usedTokens.add(token);
      var next = meaningfulTokens[i + 1];
      if (!next) continue;
      var pair = meaningfulTokens.slice(i + 1, i + 3).join(' ');
      var raw = rarityAliases[pair] || killerLookup[pair] || survivorLookup[pair] ? pair : next;
      raw.split(' ').forEach(part => usedTokens.add(part));
      context.excluded.push({
        raw,
        stem: stemWord(raw),
        rarity: rarityAliases[raw] || null
      });
    }
    for (var _i = 0; _i < meaningfulTokens.length; _i++) {
      var t = meaningfulTokens[_i];
      if (usedTokens.has(t)) continue;
      var twoWord = _i + 1 < meaningfulTokens.length ? t + ' ' + meaningfulTokens[_i + 1] : null;
      if (twoWord && killerLookup[twoWord]) {
        context.killerName = killerLookup[twoWord];
        usedTokens.add(t);
        usedTokens.add(meaningfulTokens[_i + 1]);
        continue;
      }
      if (twoWord && survivorLookup[twoWord]) {
        context.survivorName = survivorLookup[twoWord];
        usedTokens.add(t);
        usedTokens.add(meaningfulTokens[_i + 1]);
        continue;
      }
      if (twoWord && rarityAliases[twoWord]) {
        context.rarity = rarityAliases[twoWord];
        usedTokens.add(t);
        usedTokens.add(meaningfulTokens[_i + 1]);
      }
    }
    for (var _t5 of meaningfulTokens) {
      if (usedTokens.has(_t5)) continue;
      if (_t5 === 'killer' || _t5 === 'survivor' || _t5 === 'killers' || _t5 === 'survivors') {
        context.role = _t5.startsWith('killer') ? 'killer' : 'survivor';
        if (!context.category) context.category = _t5.startsWith('killer') ? 'Killer' : 'Survivor';
        usedTokens.add(_t5);
        continue;
      }
      if (CATEGORY_TRIGGERS[_t5]) {
        if (!context.category || ['Killer', 'Survivor'].includes(context.category)) context.category = CATEGORY_TRIGGERS[_t5];
        usedTokens.add(_t5);
        continue;
      }
      if (rarityAliases[_t5]) {
        context.rarity = rarityAliases[_t5];
        usedTokens.add(_t5);
        continue;
      }
      if (ITEM_TYPE_ALIASES[_t5]) {
        context.itemType = ITEM_TYPE_ALIASES[_t5];
        usedTokens.add(_t5);
        continue;
      }
      if (!context.killerName) {
        var exact = killerLookup[_t5];
        var fuzzy = !exact && !mechanicStems.has(stemWord(_t5)) && _t5.length >= 4 ? fuzzyLookup(_t5, killerLookup) : null;
        if (exact || fuzzy) {
          context.killerName = exact || fuzzy;
          usedTokens.add(_t5);
          continue;
        }
      }
      if (!context.survivorName) {
        var _exact = survivorLookup[_t5];
        var _fuzzy = !_exact && !mechanicStems.has(stemWord(_t5)) && _t5.length >= 4 ? fuzzyLookup(_t5, survivorLookup) : null;
        if (_exact || _fuzzy) {
          context.survivorName = _exact || _fuzzy;
          usedTokens.add(_t5);
          continue;
        }
      }
    }
    var leftover = meaningfulTokens.filter(t => !usedTokens.has(t) && !STOP_WORDS.has(t));
    context.descTokens = [...new Set(leftover.map(stemWord))];
    for (var _t6 of leftover) {
      var key = stemWord(_t6);
      var syns = MECHANIC_SYNONYMS[key];
      if (!syns) continue;
      for (var s of syns) {
        var ss = stemWord(s);
        if (ss !== key && !context.descTokens.includes(ss) && !context.synTokens.includes(ss)) context.synTokens.push(ss);
      }
    }
    context.characterIntent = !context.category && !context.rarity && !context.itemType && !leftover.length && !context.excluded.length && !!(context.killerName || context.survivorName);
    return {
      tokens: [...new Set(meaningfulTokens.filter(token => !NEGATION_WORDS.has(token) && !context.excluded.some(ex => ex.raw.split(' ').includes(token))))],
      context
    };
  };
  var searchIndex = useMemo(() => {
    var allItems = [];
    var isValidEntry = entry => {
      if ((entry.name || '').startsWith('@#')) return false;
      if ((entry.description || '').startsWith('@#') && !(entry.name || '').trim()) return false;
      if (Array.isArray(entry.parents) && entry.parents.includes('DISABLED')) return false;
      return true;
    };
    if (data.killers) {
      data.killers.forEach(k => allItems.push(_objectSpread(_objectSpread({}, k), {}, {
        _category: 'Killer'
      })));
    }
    if (data.survivors) {
      data.survivors.forEach(s => allItems.push(_objectSpread(_objectSpread({}, s), {}, {
        _category: 'Survivor'
      })));
    }
    if (data.perks) {
      data.perks.forEach(p => allItems.push(_objectSpread(_objectSpread({}, p), {}, {
        _category: 'Perk'
      })));
    }
    builds.forEach(b => allItems.push(_objectSpread(_objectSpread({}, b), {}, {
      _category: 'Build'
    })));
    maps.forEach(m => allItems.push(_objectSpread(_objectSpread({}, m), {}, {
      _category: 'Map'
    })));
    (challenges || []).forEach(ch => allItems.push(_objectSpread(_objectSpread({}, ch), {}, {
      _category: 'Challenge'
    })));
    items.filter(isValidEntry).forEach(i => allItems.push(_objectSpread(_objectSpread({}, i), {}, {
      _category: 'Item'
    })));
    addons.filter(isValidEntry).forEach(a => allItems.push(_objectSpread(_objectSpread({}, a), {}, {
      _category: 'Addon'
    })));
    offerings.filter(o => !o.retired).forEach(o => allItems.push(_objectSpread(_objectSpread({}, o), {}, {
      _category: 'Offering'
    })));
    GAME_ICONS.forEach(icon => allItems.push(_objectSpread(_objectSpread({}, icon), {}, {
      iconCategory: icon.category,
      _category: 'GameIcon',
      name: icon.name
    })));
    GLOSSARY.forEach(section => {
      section.items.forEach(item => allItems.push(_objectSpread(_objectSpread({}, item), {}, {
        _category: 'Glossary',
        name: item.term,
        section: section.section
      })));
    });
    if (typeof TIMELINE_DATA !== 'undefined' && TIMELINE_DATA.releases) {
      var allReleases = TIMELINE_DATA.getChronological();
      allReleases.forEach(release => allItems.push(_objectSpread(_objectSpread({}, release), {}, {
        _category: 'Chapter',
        name: release.name,
        chapterNumber: release.chapterNumber,
        displayDate: release.displayDate
      })));
    }
    searchableCosmetics.forEach(cosmetic => allItems.push(_objectSpread(_objectSpread({}, cosmetic), {}, {
      _category: 'Cosmetic',
      description: cosmetic.isCharacterSwap ? "Character swaps outfit for ".concat(cosmetic.baseCharacterName) : "".concat(cosmetic.collectionName || cosmetic.sourceBucket || cosmetic.rarity || 'Cosmetic', " ").concat(cosmetic.pieceType || 'cosmetic', " for ").concat(cosmetic.baseCharacterName).concat(cosmetic.bindSummary ? " (".concat(cosmetic.bindSummary, ")") : '')
    })));
    return allItems.map(item => {
      var nameLower = (item.name || item.term || '').toLowerCase();
      var descLower = String(item._category === 'Perk' ? getPerkSearchDescription(item) : item.description || item.def || item.power || '').toLowerCase();
      var descStems = (descLower.match(/[a-z0-9]+/g) || []).map(stemWord);
      var descPositions = new Map();
      descStems.forEach((word, index) => {
        if (!descPositions.has(word)) descPositions.set(word, index);
      });
      var aliases = (item.aliases || []).map(alias => alias.toLowerCase());
      return _objectSpread(_objectSpread({}, item), {}, {
        _search: {
          nameLower,
          descLower,
          descPositions,
          aliases,
          aliasText: aliases.join('\0'),
          nameWords: nameLower.match(/[a-z0-9]+/g) || [nameLower]
        }
      });
    });
  }, [data.killers, data.survivors, data.perks, builds, maps, challenges, items, addons, offerings, searchableCosmetics]);
  var descriptionVocabulary = useMemo(() => [...new Set(searchIndex.flatMap(item => [...item._search.descPositions.keys()]))], [searchIndex]);
  useEffect(() => {
    if (!deferredSearchTerm.trim() || deferredSearchTerm.trim().toLowerCase().startsWith('random:')) {
      setResults([]);
      return;
    }
    var parseSearch = input => {
      var prefixes = ['killers:', 'survivors:', 'perks:', 'builds:', 'maps:', 'items:', 'addons:', 'offerings:', 'glossary:', 'icons:', 'challenges:', 'chapter:', 'legendary:', 'cosmetics:'];
      input = input.trim();
      var lowerInput = input.toLowerCase();
      for (var prefix of prefixes) {
        if (lowerInput.startsWith(prefix)) {
          return {
            filter: prefix.slice(0, -1),
            term: input.slice(prefix.length).trim().toLowerCase()
          };
        }
      }
      return {
        filter: null,
        term: input.toLowerCase()
      };
    };
    var {
      filter,
      term
    } = parseSearch(deferredSearchTerm);
    var categoryByPrefix = {
      killers: 'Killer',
      survivors: 'Survivor',
      perks: 'Perk',
      builds: 'Build',
      maps: 'Map',
      items: 'Item',
      addons: 'Addon',
      offerings: 'Offering',
      glossary: 'Glossary',
      icons: 'GameIcon',
      challenges: 'Challenge',
      chapter: 'Chapter',
      legendary: 'Cosmetic',
      cosmetics: 'Cosmetic'
    };
    var queryText = (filter ? term : deferredSearchTerm).trim().toLowerCase();
    var {
      tokens,
      context
    } = parseSmartQuery(queryText);
    if (filter && !['killers', 'survivors'].includes(filter) && ['Killer', 'Survivor'].includes(context.category)) context.category = null;
    if (searchIndex.some(item => item._search.nameLower === queryText) && (queryText.includes(' ') || !CATEGORY_TRIGGERS[queryText])) {
      tokens = queryText.split(/\s+/);
      context = _objectSpread(_objectSpread({}, context), {}, {
        category: null,
        role: null,
        itemType: null,
        rarity: null,
        excluded: [],
        descTokens: [],
        synTokens: []
      });
    }
    if (!tokens.length && !filter && !context.excluded.length) {
      setResults([]);
      return;
    }
    context.fullQuery = tokens.join(' ');
    context.fuzzyNameTokens = new Set(tokens.filter(token => token.length >= 4 && !mechanicStems.has(stemWord(token))));
    context.matchingDescStems = new Map(context.descTokens.map(token => [token, descriptionVocabulary.filter(word => word === token || token.length >= 4 && word.startsWith(token))]));
    var matchesRarity = (item, rarity) => rarity === 'iridescent' ? IRIDESCENT_RARITIES.includes((item.rarity || '').toLowerCase()) : (item.rarity || '').toLowerCase() === rarity;
    var scored = searchIndex.filter(item => (!filter || item._category === categoryByPrefix[filter]) && (!context.category || item._category === context.category) && (!context.itemType || item.itemType === context.itemType) && (!context.rarity || matchesRarity(item, context.rarity)) && (!context.role || (item.role || item.type || item.baseCharacterType || item._category).toLowerCase() === context.role) && !context.excluded.some(ex => ex.rarity ? matchesRarity(item, ex.rarity) : item._search.nameLower.includes(ex.raw) || item._search.descPositions.has(ex.stem) || (item._category || '').toLowerCase() === (CATEGORY_TRIGGERS[ex.raw] || ex.raw).toLowerCase())).map(item => {
      var s = filter && !term ? 1 : scoreItem(item, tokens, context);
      return s > 0 ? _objectSpread(_objectSpread({}, item), {}, {
        category: item._category,
        _score: s
      }) : null;
    }).filter(Boolean);
    var characterPriority = item => context.characterIntent && (item._category === 'Killer' && item.name === context.killerName || item._category === 'Survivor' && item.name === context.survivorName) ? 1 : 0;
    scored.sort((a, b) => characterPriority(b) - characterPriority(a) || b._score - a._score || (a.name || '').localeCompare(b.name || ''));
    setResults(scored.slice(0, 50));
  }, [deferredSearchTerm, searchIndex, descriptionVocabulary, killerLookup, survivorLookup]);
  var visiblePerks = (data === null || data === void 0 ? void 0 : data.perks) || perks || [];
  var readyCosmeticCount = searchableCosmetics.length;
  return React.createElement("div", _extends({
    ref: pullRef
  }, pullHandlers, {
    className: "relative flex flex-col h-full px-4 sm:px-6 pt-6 sm:pt-8 pb-32 overflow-y-auto custom-scrollbar"
  }), React.createElement(PullIndicator, {
    pullDistance: pullDistance,
    threshold: 80,
    isRefreshing: isRefreshing
  }), React.createElement("div", {
    className: "px-0 sm:px-6 pb-4 pt-4 pointer-events-none"
  }, React.createElement("div", {
    className: "relative max-w-3xl mx-auto pointer-events-auto"
  }, React.createElement("div", {
    className: "absolute inset-0 bg-zinc-500 rounded-3xl blur-2xl opacity-0 transition-opacity duration-500"
  }), React.createElement("div", {
    className: "relative flex items-center bg-white/5 border border-white/15 rounded-lg p-2"
  }, React.createElement("div", {
    className: "pl-4 text-zinc-400"
  }, React.createElement(Icons.Search, {
    width: 18,
    height: 18
  })), React.createElement("input", {
    type: "text",
    className: "w-full bg-transparent text-white p-3 text-sm sm:text-base font-medium placeholder-zinc-600 focus:outline-none",
    id: "home-search-input",
    "aria-label": "Search the wiki",
    placeholder: "Search perks, killers, maps, builds...",
    value: searchTerm,
    onChange: e => setSearchTerm(e.target.value)
  }), searchTerm && React.createElement("button", {
    onClick: () => setSearchTerm(''),
    className: "p-2 mr-1 rounded-xl bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
  }, React.createElement(Icons.X, {
    width: 18,
    height: 18
  }))))), React.createElement("div", {
    className: "home-command mt-2 pb-24"
  }, randomResult && React.createElement("div", {
    className: "space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
  }, randomResult.type === 'help' && React.createElement("div", {
    className: "p-6 rounded-3xl bg-white/5 border border-white/25/20"
  }, React.createElement("div", {
    className: "flex items-center gap-3 mb-4"
  }, React.createElement("div", {
    className: "p-2 rounded-xl bg-zinc-500/15"
  }, React.createElement(Icons.Dices, {
    width: 24,
    height: 24,
    className: "text-zinc-100"
  })), React.createElement("h3", {
    className: "text-lg font-bold text-white"
  }, "Quick Random")), React.createElement("p", {
    className: "text-sm text-zinc-400 mb-4"
  }, "Generate random addons and offerings instantly!"), React.createElement("div", {
    className: "space-y-2 text-xs"
  }, React.createElement("p", {
    className: "text-zinc-300"
  }, React.createElement("span", {
    className: "text-zinc-100 font-mono"
  }, "random:killer"), " - Random killer + 2 addons"), React.createElement("p", {
    className: "text-zinc-300"
  }, React.createElement("span", {
    className: "text-zinc-100 font-mono"
  }, "random:trapper"), " - 2 random Trapper addons"), React.createElement("p", {
    className: "text-zinc-300"
  }, React.createElement("span", {
    className: "text-zinc-100 font-mono"
  }, "random:huntress"), " - 2 random Huntress addons"), React.createElement("p", {
    className: "text-zinc-300"
  }, React.createElement("span", {
    className: "text-zinc-100 font-mono"
  }, "random:medkit"), " - Random Med-Kit + 2 addons"), React.createElement("p", {
    className: "text-zinc-300"
  }, React.createElement("span", {
    className: "text-zinc-100 font-mono"
  }, "random:toolbox"), " - Random Toolbox + 2 addons"), React.createElement("p", {
    className: "text-zinc-300"
  }, React.createElement("span", {
    className: "text-zinc-100 font-mono"
  }, "random:offering"), " - 1 random offering"))), randomResult.type === 'killer' && React.createElement("div", {
    className: "p-5 rounded-3xl bg-white/5 border border-white/25/20 shadow-lg shadow-white/5"
  }, React.createElement("div", {
    className: "flex items-center gap-4 mb-4"
  }, React.createElement(AssetFrame, {
    type: "Killer",
    imageUrl: randomResult.killer.image,
    fallbackIcon: React.createElement(Icons.User, {
      width: 28,
      height: 28,
      className: "text-zinc-500"
    })
  }), React.createElement("div", null, React.createElement("p", {
    className: "text-[10px] font-bold uppercase tracking-widest text-zinc-100 mb-1"
  }, "Killer Addons"), React.createElement("h3", {
    className: "text-xl font-bold text-white"
  }, randomResult.killer.name))), React.createElement("div", {
    className: "space-y-2"
  }, randomResult.addons.map((addon, idx) => React.createElement("div", {
    key: addon.id || idx,
    className: "p-3 rounded-xl bg-white/5 border border-white/5",
    style: {
      boxShadow: getRarityGlow(addon.rarity)
    }
  }, React.createElement("div", {
    className: "flex items-start gap-3"
  }, React.createElement("div", {
    className: "w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden"
  }, React.createElement(AssetFrame, {
    type: "Addon",
    imageUrl: addon.image,
    size: "fill",
    fallbackIcon: React.createElement(Icons.Wrench, {
      width: 16,
      height: 16,
      className: "text-white/40"
    })
  })), React.createElement("div", {
    className: "flex-1 min-w-0"
  }, React.createElement("p", {
    className: "font-bold text-sm",
    style: {
      color: getRarityColor(addon.rarity)
    }
  }, addon.name), React.createElement("p", {
    className: "text-zinc-500 text-xs mt-1 line-clamp-2"
  }, addon.description)))))), React.createElement("div", {
    className: "flex gap-2 mt-4"
  }, React.createElement("button", {
    onClick: rerollRandom,
    className: "flex-1 py-2.5 rounded-xl bg-white/10 border border-white/20 text-zinc-100 text-xs font-bold uppercase tracking-wider hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
  }, React.createElement(Icons.Dices, {
    width: 14,
    height: 14
  }), " Re-roll"), React.createElement("button", {
    onClick: clearRandom,
    className: "py-2.5 px-4 rounded-xl bg-white/5 border border-white/10 text-zinc-400 text-xs font-bold uppercase tracking-wider hover:bg-white/10 transition-colors"
  }, React.createElement(Icons.X, {
    width: 14,
    height: 14
  })))), randomResult.type === 'item' && React.createElement("div", {
    className: "p-5 rounded-3xl bg-white/5 border border-white/15 shadow-lg shadow-white/5"
  }, React.createElement("div", {
    className: "flex items-center gap-4 mb-4"
  }, React.createElement("div", {
    className: "w-14 h-14 rounded-xl overflow-hidden flex-shrink-0"
  }, React.createElement(AssetFrame, {
    type: "Item",
    imageUrl: (_randomResult$item = randomResult.item) === null || _randomResult$item === void 0 ? void 0 : _randomResult$item.image,
    size: "fill",
    fallbackIcon: React.createElement(Icons.Package, {
      width: 24,
      height: 24,
      className: "text-zinc-500"
    })
  })), React.createElement("div", null, React.createElement("p", {
    className: "text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1"
  }, "Item Addons"), React.createElement("h3", {
    className: "text-xl font-bold text-white"
  }, ((_randomResult$item2 = randomResult.item) === null || _randomResult$item2 === void 0 ? void 0 : _randomResult$item2.name) || randomResult.itemType))), React.createElement("div", {
    className: "space-y-2"
  }, randomResult.addons.map((addon, idx) => React.createElement("div", {
    key: addon.id || idx,
    className: "p-3 rounded-xl bg-white/5 border border-white/5",
    style: {
      boxShadow: getRarityGlow(addon.rarity)
    }
  }, React.createElement("div", {
    className: "flex items-start gap-3"
  }, React.createElement("div", {
    className: "w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden"
  }, React.createElement(AssetFrame, {
    type: "Addon",
    imageUrl: addon.image,
    size: "fill",
    fallbackIcon: React.createElement(Icons.Wrench, {
      width: 16,
      height: 16,
      className: "text-white/40"
    })
  })), React.createElement("div", {
    className: "flex-1 min-w-0"
  }, React.createElement("p", {
    className: "font-bold text-sm",
    style: {
      color: getRarityColor(addon.rarity)
    }
  }, addon.name), React.createElement("p", {
    className: "text-zinc-500 text-xs mt-1 line-clamp-2"
  }, addon.description)))))), React.createElement("div", {
    className: "flex gap-2 mt-4"
  }, React.createElement("button", {
    onClick: rerollRandom,
    className: "flex-1 py-2.5 rounded-xl bg-white/10 border border-white/20 text-zinc-100 text-xs font-bold uppercase tracking-wider hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
  }, React.createElement(Icons.Dices, {
    width: 14,
    height: 14
  }), " Re-roll"), React.createElement("button", {
    onClick: clearRandom,
    className: "py-2.5 px-4 rounded-xl bg-white/5 border border-white/10 text-zinc-400 text-xs font-bold uppercase tracking-wider hover:bg-white/10 transition-colors"
  }, React.createElement(Icons.X, {
    width: 14,
    height: 14
  })))), randomResult.type === 'offering' && React.createElement("div", {
    className: "p-5 rounded-3xl bg-amber-900/25 border border-white/15 shadow-lg shadow-white/5"
  }, React.createElement("div", {
    className: "flex flex-col items-center text-center"
  }, React.createElement("p", {
    className: "text-[10px] font-bold uppercase tracking-widest text-zinc-200 mb-3"
  }, "Random Offering"), React.createElement("div", {
    className: "w-20 h-20 rounded-2xl overflow-hidden mb-3",
    style: {
      boxShadow: getRarityGlow(randomResult.offering.rarity)
    }
  }, React.createElement(AssetFrame, {
    type: "Offering",
    imageUrl: randomResult.offering.image,
    size: "fill",
    fallbackIcon: React.createElement(Icons.Flame, {
      width: 32,
      height: 32,
      className: "text-zinc-500"
    })
  })), React.createElement("h3", {
    className: "text-lg font-bold",
    style: {
      color: getRarityColor(randomResult.offering.rarity)
    }
  }, randomResult.offering.name), React.createElement("p", {
    className: "text-zinc-500 text-xs mt-2 max-w-xs line-clamp-3"
  }, randomResult.offering.description)), React.createElement("div", {
    className: "flex gap-2 mt-4"
  }, React.createElement("button", {
    onClick: rerollRandom,
    className: "flex-1 py-2.5 rounded-xl bg-white/10 border border-white/20 text-zinc-100 text-xs font-bold uppercase tracking-wider hover:bg-white/15 transition-colors flex items-center justify-center gap-2"
  }, React.createElement(Icons.Dices, {
    width: 14,
    height: 14
  }), " Re-roll"), React.createElement("button", {
    onClick: clearRandom,
    className: "py-2.5 px-4 rounded-xl bg-white/5 border border-white/10 text-zinc-400 text-xs font-bold uppercase tracking-wider hover:bg-white/10 transition-colors"
  }, React.createElement(Icons.X, {
    width: 14,
    height: 14
  })))), !randomResult.type && React.createElement("div", {
    className: "p-5 rounded-3xl bg-zinc-900/60 border border-white/10 text-center"
  }, React.createElement(Icons.AlertCircle, {
    width: 32,
    height: 32,
    className: "text-zinc-600 mx-auto mb-2"
  }), React.createElement("p", {
    className: "text-zinc-400 text-sm"
  }, "No match found for \"", React.createElement("span", {
    className: "text-white"
  }, searchTerm.slice(7)), "\""), React.createElement("p", {
    className: "text-zinc-600 text-xs mt-1"
  }, "Try a killer name (trapper, huntress) or item type (medkit, toolbox)"))), searchTerm && !randomResult ? React.createElement("div", {
    className: "space-y-1 animate-in fade-in slide-in-from-bottom-4 duration-500"
  }, React.createElement("div", {
    className: "flex items-center justify-between mb-6 px-2"
  }, React.createElement("span", {
    className: "text-xs font-bold text-zinc-500 uppercase tracking-wider"
  }, results.length, " Matches", searchTerm.includes(':') && React.createElement("span", {
    className: "ml-2 text-zinc-600"
  }, "\u2022 ", searchTerm.split(':')[0], " filter")), results.length > 0 && results[0]._score >= 20 && searchTerm.split(/\s+/).length >= 2 && React.createElement("span", {
    className: "text-[10px] font-bold uppercase tracking-wider text-zinc-100 bg-white/10 border border-white/20 px-2 py-1 rounded-lg"
  }, "Best Match \u2193")), results.length > 0 ? results.map((item, idx) => {
    var isBestMatch = idx === 0 && item._score >= 20 && searchTerm.split(/\s+/).length >= 2;
    var wrapBest = el => isBestMatch ? React.createElement("div", {
      key: 'best-' + (item.id || item.name || idx),
      className: "ring-1 ring-sky-500/30 rounded-2xl shadow-lg shadow-sky-500/5"
    }, el) : el;
    if (['Killer', 'Survivor', 'Perk'].includes(item.category)) {
      return wrapBest(React.createElement(GlassCard, {
        key: item.id || Math.random(),
        item: item,
        category: item.category,
        settings: settings
      }));
    }
    if (item.category === 'Cosmetic') {
      return wrapBest(React.createElement("div", {
        key: item.id || item.name,
        className: "p-3 rounded-2xl bg-zinc-900/60 border border-white/10 flex items-center gap-3"
      }, React.createElement("div", {
        className: "w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex-shrink-0 overflow-hidden"
      }, React.createElement(AssetFrame, {
        type: item.baseCharacterType,
        size: "fill",
        imageUrl: item.image,
        fallbackIcon: React.createElement(Icons.User, {
          width: 18,
          height: 18,
          className: "text-white/40"
        })
      })), React.createElement("div", {
        className: "flex-1 min-w-0"
      }, React.createElement("p", {
        className: "text-white font-bold text-sm"
      }, item.name), React.createElement("p", {
        className: "text-[11px] text-zinc-500 uppercase tracking-wider"
      }, item.isCharacterSwap ? 'Character swaps' : "".concat(item.pieceType || 'Cosmetic', " Cosmetic")), React.createElement("p", {
        className: "text-xs text-zinc-400 mt-1 line-clamp-2"
      }, item.isCharacterSwap ? "Character swaps outfit for ".concat(item.baseCharacterName) : "".concat(item.collectionName || item.sourceBucket || item.rarity || 'Cosmetic', " ").concat(item.pieceType || 'cosmetic', " for ").concat(item.baseCharacterName).concat(item.bindSummary ? " (".concat(item.bindSummary, ")") : ''))), React.createElement("button", {
        onClick: () => openCosmeticProfile(item),
        className: "px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white"
      }, "Open")));
    }
    if (item.category === 'Build') {
      return wrapBest(React.createElement("div", {
        key: item.id || item.name,
        className: "p-3 rounded-2xl bg-zinc-900/60 border border-white/10"
      }, React.createElement("div", {
        className: "flex justify-between items-center mb-1"
      }, React.createElement("span", {
        className: "text-[10px] uppercase tracking-widest font-bold text-zinc-500"
      }, "Build"), React.createElement("span", {
        className: "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ".concat(item.role === 'Killer' ? 'bg-white/10 text-zinc-100' : 'bg-white/5 text-zinc-300')
      }, item.role)), React.createElement("p", {
        className: "text-white font-bold"
      }, item.name), React.createElement("div", {
        className: "flex flex-wrap gap-1 mt-1"
      }, (item.perks || []).slice(0, 4).map(p => React.createElement("span", {
        key: p.name,
        className: "px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white"
      }, p.name))), React.createElement("button", {
        onClick: () => {
          setBuildSeed && setBuildSeed(item);
          setView('buildLab');
        },
        className: "mt-2 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white"
      }, "Open in Build Lab")));
    }
    if (item.category === 'Map') {
      return wrapBest(React.createElement("div", {
        key: item.id || item.name,
        className: "p-3 rounded-2xl bg-zinc-900/60 border border-white/10 flex items-center justify-between"
      }, React.createElement("div", null, React.createElement("p", {
        className: "text-white font-bold text-sm"
      }, item.name), React.createElement("p", {
        className: "text-[11px] text-zinc-500 uppercase tracking-wider"
      }, "Map")), React.createElement("button", {
        onClick: () => setView('realms', {
          search: item.name
        }),
        className: "px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white"
      }, "Open maps")));
    }
    if (item.category === 'Challenge') {
      var _item$tags;
      return wrapBest(React.createElement("div", {
        key: item.id,
        className: "p-3 rounded-2xl bg-zinc-900/60 border border-white/10"
      }, React.createElement("p", {
        className: "text-white font-bold"
      }, item.name), React.createElement("p", {
        className: "text-[11px] text-zinc-500 uppercase tracking-wider"
      }, "Challenge"), ((_item$tags = item.tags) === null || _item$tags === void 0 ? void 0 : _item$tags.length) > 0 && React.createElement("div", {
        className: "flex flex-wrap gap-1 mt-1"
      }, item.tags.map(t => React.createElement("span", {
        key: t,
        className: "px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] text-zinc-300 uppercase tracking-wider"
      }, t))), React.createElement("button", {
        onClick: () => setView('progression', {
          tab: 'challenges'
        }),
        className: "mt-2 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white"
      }, "Open challenges")));
    }
    if (item.category === 'Item') {
      return wrapBest(React.createElement("div", {
        key: item.id || item.name,
        className: "p-3 rounded-2xl bg-zinc-900/60 border border-white/10 flex items-center gap-3"
      }, React.createElement("div", {
        className: "w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex-shrink-0 overflow-hidden"
      }, React.createElement(AssetFrame, {
        type: "Item",
        size: "fill",
        imageUrl: item.image,
        fallbackIcon: React.createElement(Icons.Package, {
          width: 16,
          height: 16,
          className: "text-white/40"
        })
      })), React.createElement("div", {
        className: "flex-1"
      }, React.createElement("p", {
        className: "text-white font-bold text-sm"
      }, item.name), React.createElement("p", {
        className: "text-[11px] text-zinc-500 uppercase tracking-wider"
      }, "Item \u2022 ", item.itemType || 'Unknown')), React.createElement("button", {
        onClick: () => setView('items', {
          search: item.name,
          mode: 'survivor',
          targetId: item.id,
          targetType: 'item'
        }),
        className: "px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white"
      }, "Open")));
    }
    if (item.category === 'Addon') {
      var isKillerAddon = item.role === 'killer';
      var searchQuery = item.name || (isKillerAddon ? item.killerName || '' : item.itemType || '');
      var addonMode = isKillerAddon ? 'killer' : 'survivor';
      return wrapBest(React.createElement("div", {
        key: item.id || item.name,
        className: "p-3 rounded-2xl bg-zinc-900/60 border border-white/10 flex items-center gap-3"
      }, React.createElement("div", {
        className: "w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex-shrink-0 overflow-hidden"
      }, React.createElement(AssetFrame, {
        type: "Addon",
        size: "fill",
        imageUrl: item.image,
        fallbackIcon: React.createElement(Icons.Wrench, {
          width: 16,
          height: 16,
          className: "text-white/40"
        })
      })), React.createElement("div", {
        className: "flex-1"
      }, React.createElement("p", {
        className: "text-white font-bold text-sm"
      }, item.name), React.createElement("p", {
        className: "text-[11px] text-zinc-500 uppercase tracking-wider"
      }, isKillerAddon ? 'Killer' : 'Survivor', " Addon", item.killerName ? " \u2022 ".concat(item.killerName) : item.itemType ? " \u2022 ".concat(item.itemType) : '')), React.createElement("button", {
        onClick: () => setView('items', {
          search: searchQuery,
          mode: addonMode,
          targetId: item.id,
          targetType: 'addon'
        }),
        className: "px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white"
      }, "Open")));
    }
    if (item.category === 'Offering') {
      return wrapBest(React.createElement("div", {
        key: item.id || item.name,
        className: "p-3 rounded-2xl bg-zinc-900/60 border border-white/10 flex items-center gap-3"
      }, React.createElement("div", {
        className: "w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex-shrink-0 overflow-hidden"
      }, React.createElement(AssetFrame, {
        type: "Offering",
        size: "fill",
        imageUrl: item.image,
        fallbackIcon: React.createElement(Icons.Flame, {
          width: 16,
          height: 16,
          className: "text-white/40"
        })
      })), React.createElement("div", {
        className: "flex-1"
      }, React.createElement("p", {
        className: "text-white font-bold text-sm"
      }, item.name), React.createElement("p", {
        className: "text-[11px] text-zinc-500 uppercase tracking-wider"
      }, "Offering", item.type ? " \u2022 ".concat(item.type) : '')), React.createElement("button", {
        onClick: () => setView('offerings', {
          search: item.name,
          targetId: item.id,
          targetType: 'offering'
        }),
        className: "px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white"
      }, "Open")));
    }
    if (item.category === 'GameIcon') {
      var categoryColors = {
        health: 'var(--rar-veryrare)',
        buff: 'var(--rar-rare)',
        debuff: 'var(--rar-common)',
        killer: 'var(--rar-ultrarare)',
        activity: 'var(--rar-uncommon)'
      };
      var color = categoryColors[item.iconCategory] || '#a1a1aa';
      return wrapBest(React.createElement("div", {
        key: item.id || item.name,
        className: "p-3 rounded-2xl bg-zinc-900/60 border border-white/10 flex items-center gap-3"
      }, React.createElement("div", {
        className: "w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex-shrink-0 overflow-hidden flex items-center justify-center"
      }, React.createElement(AssetFrame, {
        type: "GameIcon",
        size: "fill",
        imageUrl: item.icon,
        fallbackIcon: React.createElement(Icons.AlertCircle, {
          width: 16,
          height: 16,
          className: "text-white/40"
        })
      })), React.createElement("div", {
        className: "flex-1"
      }, React.createElement("p", {
        className: "text-white font-bold text-sm"
      }, item.name), React.createElement("p", {
        className: "text-[11px] text-zinc-500 uppercase tracking-wider"
      }, "Game Icon \u2022 ", React.createElement("span", {
        style: {
          color
        }
      }, item.iconCategory))), React.createElement("button", {
        onClick: () => setView('gameIcons'),
        className: "px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white"
      }, "Open")));
    }
    if (item.category === 'Glossary') {
      return wrapBest(React.createElement("div", {
        key: item.term || item.name,
        className: "p-3 rounded-2xl bg-zinc-900/60 border border-white/10"
      }, React.createElement("div", {
        className: "flex items-start justify-between gap-2"
      }, React.createElement("div", {
        className: "flex-1"
      }, React.createElement("p", {
        className: "text-white font-bold text-sm"
      }, item.name), React.createElement("p", {
        className: "text-[11px] text-zinc-500 uppercase tracking-wider mb-1"
      }, "Glossary \u2022 ", item.section), React.createElement("p", {
        className: "text-xs text-zinc-400 line-clamp-2"
      }, item.def)), React.createElement("button", {
        onClick: () => setView('glossary'),
        className: "px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white flex-shrink-0"
      }, "Open"))));
    }
    if (item.category === 'Chapter') {
      return wrapBest(React.createElement("div", {
        key: item.id || item.name,
        className: "p-3 rounded-2xl bg-zinc-900/60 border border-white/10 flex items-center gap-3"
      }, React.createElement("div", {
        className: "w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center"
      }, React.createElement(Icons.Clock, {
        width: 18,
        height: 18,
        className: "text-zinc-400"
      })), React.createElement("div", {
        className: "flex-1"
      }, React.createElement("p", {
        className: "text-white font-bold text-sm"
      }, item.name), React.createElement("p", {
        className: "text-[11px] text-zinc-500 uppercase tracking-wider"
      }, item.chapterNumber ? "Chapter ".concat(item.chapterNumber) : item.type === 'base' ? 'Base Game' : 'Release', " \u2022 ", item.displayDate)), React.createElement("button", {
        onClick: () => setView('timeline'),
        className: "px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white"
      }, "Open Timeline")));
    }
    return null;
  }) : React.createElement("div", {
    className: "text-center mt-12 text-zinc-600"
  }, React.createElement("p", {
    className: "font-medium text-sm"
  }, "No results found.")), React.createElement(SiteFooterContent, null)) : React.createElement("div", {
    className: "cx-article"
  }, React.createElement("div", {
    className: "mp-welcome"
  }, React.createElement("p", {
    className: "mp-welcome-title"
  }, "Welcome to ", React.createElement("span", {
    className: "mp-welcome-name"
  }, "The Entity's Wiki"), ","), React.createElement("p", {
    className: "mp-welcome-sub"
  }, "The free DBD encyclopedia.")), React.createElement("section", {
    id: "browse",
    "aria-label": "Browse by category"
  }, React.createElement("h2", {
    className: "cx-sec"
  }, "Browse by category"), React.createElement("div", {
    className: "cx-linkcols"
  }, [{
    label: 'Killers',
    count: killers.length,
    open: () => setView('killers')
  }, {
    label: 'Survivors',
    count: survivors.length,
    open: () => setView('survivors')
  }, {
    label: 'Perk Finder',
    count: visiblePerks.length,
    open: () => setView('perks')
  }, {
    label: 'Items & Addons',
    count: items.length,
    open: () => setView('items', {
      mode: 'survivor'
    })
  }, {
    label: 'Add-ons',
    count: addons.length,
    open: () => setView('items', {
      mode: 'killer'
    })
  }, {
    label: 'Offerings',
    count: offerings.filter(offering => !offering.retired).length,
    open: () => setView('offerings')
  }, {
    label: 'Cosmetics',
    count: (cosmeticsCatalog.fullSets || []).length + (cosmeticsCatalog.characterSwaps || []).length,
    open: () => setView('cosmetics')
  }, {
    label: 'Realms',
    count: new Set(maps.map(m => m.realm)).size,
    open: () => setView('realms')
  }, {
    label: 'Chronicle',
    count: typeof TIMELINE_DATA !== 'undefined' && TIMELINE_DATA.releases ? TIMELINE_DATA.releases.length : 0,
    open: () => setView('timeline')
  }, {
    label: 'Glossary',
    count: GLOSSARY.reduce((n, sec) => n + sec.items.length, 0),
    open: () => setView('glossary')
  }, {
    label: 'My Favorites',
    count: null,
    open: () => setView('favorites')
  }, {
    label: 'Community Content',
    count: null,
    open: () => setView('communityContent')
  }].map(entry => React.createElement("div", {
    key: entry.label
  }, React.createElement("button", {
    type: "button",
    className: "cx-alink",
    onClick: entry.open
  }, entry.label), typeof entry.count === 'number' && entry.count > 0 ? React.createElement("span", {
    className: "cx-cnt"
  }, " ", entry.count) : null)))), React.createElement("section", {
    id: "tools",
    "aria-label": "Tools directory"
  }, React.createElement("h2", {
    className: "cx-sec"
  }, "Tools"), React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", {
    style: {
      width: '220px'
    }
  }, "Tool"), React.createElement("th", null, "Purpose"))), React.createElement("tbody", null, ['buildLab', 'roulette', 'worldle', 'prestige', 'matches', 'progression', 'favorites', 'import', 'settings'].map(id => MAIN_PAGE_TOOLS[id]).filter(Boolean).map(tile => {
    var openTile = () => {
      if (tile.id === 'import') {
        setShowImportModal(true);
        return;
      }
      setView(tile.id);
    };
    return React.createElement("tr", {
      key: tile.id,
      onClick: openTile,
      style: {
        cursor: 'pointer'
      }
    }, React.createElement("td", null, React.createElement("button", {
      type: "button",
      className: "cx-alink",
      onClick: e => {
        e.stopPropagation();
        openTile();
      }
    }, tile.label)), React.createElement("td", {
      style: {
        color: 'var(--text-soft)'
      }
    }, tile.desc));
  })))), React.createElement("section", {
    id: "news",
    "aria-label": "Patch notes"
  }, React.createElement("h2", {
    className: "cx-sec"
  }, "Patch notes"), (() => {
    var chronological = typeof TIMELINE_DATA !== 'undefined' && TIMELINE_DATA && typeof TIMELINE_DATA.getChronological === 'function' ? TIMELINE_DATA.getChronological() : [];
    var latestTwo = chronological.slice(-2).reverse();
    if (latestTwo.length === 0) {
      return null;
    }
    return React.createElement("table", {
      className: "cx-wikitable"
    }, React.createElement("caption", null, "Latest releases from the lore timeline"), React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "Release"), React.createElement("th", null, "Date"), React.createElement("th", null, "Summary"), React.createElement("th", null))), React.createElement("tbody", null, latestTwo.map(rel => React.createElement("tr", {
      key: rel.id || rel.name
    }, React.createElement("td", null, React.createElement("span", {
      className: "block text-sm text-white font-bold"
    }, rel.name), React.createElement("span", {
      className: "block text-[11px] text-zinc-500 uppercase tracking-wider"
    }, rel.chapterNumber ? 'Chapter ' + rel.chapterNumber : rel.type === 'base' ? 'Base Game' : rel.type || 'Release')), React.createElement("td", {
      className: "whitespace-nowrap"
    }, rel.displayDate), React.createElement("td", null, React.createElement("span", {
      className: "block text-xs text-zinc-400 line-clamp-2"
    }, rel.description)), React.createElement("td", null, React.createElement("button", {
      onClick: () => setView('timeline'),
      className: "px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white whitespace-nowrap"
    }, "Open timeline"))))));
  })()), React.createElement("nav", {
    className: "cx-cats",
    "aria-label": "Categories"
  }, React.createElement("span", null, "Categories:"), React.createElement("button", {
    onClick: () => setView('killers'),
    style: {
      color: 'var(--link)'
    }
  }, "Killers"), React.createElement("span", null, " \xB7 "), React.createElement("button", {
    onClick: () => setView('survivors'),
    style: {
      color: 'var(--link)'
    }
  }, "Survivors"), React.createElement("span", null, " \xB7 "), React.createElement("button", {
    onClick: () => setView('perks'),
    style: {
      color: 'var(--link)'
    }
  }, "Perks"), React.createElement("span", null, " \xB7 "), React.createElement("button", {
    onClick: () => setView('realms'),
    style: {
      color: 'var(--link)'
    }
  }, "Realms"), React.createElement("span", null, " \xB7 "), React.createElement("button", {
    onClick: () => setView('timeline'),
    style: {
      color: 'var(--link)'
    }
  }, "Timeline"), React.createElement("span", null, " \xB7 "), React.createElement("button", {
    onClick: () => setView('glossary'),
    style: {
      color: 'var(--link)'
    }
  }, "Glossary")), React.createElement(SiteFooterContent, null))), showImportModal && React.createElement("div", {
    className: "fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm",
    onClick: cancelImport
  }, React.createElement("div", {
    className: "bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto",
    onClick: e => e.stopPropagation()
  }, React.createElement("div", {
    className: "flex items-center justify-between mb-4"
  }, React.createElement("h2", {
    className: "text-xl font-bold text-white"
  }, importPreview ? 'Confirm Import' : 'Import Build'), React.createElement("button", {
    onClick: cancelImport,
    className: "p-2 rounded-lg bg-white/5 text-zinc-400 hover:text-white"
  }, React.createElement(Icons.X, {
    width: 18,
    height: 18
  }))), !importPreview ? React.createElement(React.Fragment, null, React.createElement("p", {
    className: "text-sm text-zinc-400 mb-4"
  }, "Paste shared build text from a friend to import it into your Build Lab."), React.createElement("textarea", {
    value: importCode,
    onChange: e => {
      setImportCode(e.target.value);
      setImportError('');
    },
    placeholder: "Paste shared build text here...",
    className: "w-full h-24 bg-zinc-800/60 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 resize-none font-mono text-sm"
  }), importError && React.createElement("p", {
    className: "text-zinc-100 text-sm mt-2"
  }, importError), React.createElement("div", {
    className: "flex gap-3 mt-4"
  }, React.createElement("button", {
    onClick: cancelImport,
    className: "flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-300 font-semibold hover:bg-white/10 transition-colors"
  }, "Cancel"), React.createElement("button", {
    onClick: handleImportBuild,
    className: "flex-1 px-4 py-3 rounded-xl bg-zinc-800 text-zinc-100 border border-white/20 font-semibold hover:bg-zinc-500 transition-colors"
  }, "Preview"))) : React.createElement(React.Fragment, null, React.createElement("div", {
    className: "space-y-4"
  }, React.createElement("div", {
    className: "p-4 rounded-xl bg-zinc-800/50 border border-white/5"
  }, React.createElement("div", {
    className: "flex items-center gap-2 mb-2"
  }, React.createElement("span", {
    className: "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ".concat(importPreview.role === 'Killer' ? 'bg-white/10 text-zinc-100' : 'bg-white/5 text-zinc-300')
  }, importPreview.role), importPreview.characterName && React.createElement("span", {
    className: "text-xs text-zinc-400"
  }, importPreview.characterName)), React.createElement("h3", {
    className: "text-lg font-bold text-white"
  }, importPreview.name)), ((_importPreview$perks = importPreview.perks) === null || _importPreview$perks === void 0 ? void 0 : _importPreview$perks.length) > 0 && React.createElement("div", null, React.createElement("p", {
    className: "text-xs text-zinc-500 uppercase tracking-wider mb-2"
  }, "Perks"), React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, importPreview.perks.map((p, idx) => React.createElement("span", {
    key: "".concat(p.id, "-").concat(idx),
    className: "px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white"
  }, p.name)))), React.createElement("div", {
    className: "grid grid-cols-1 gap-2 text-sm"
  }, importPreview.item && React.createElement("div", {
    className: "flex items-center gap-2"
  }, React.createElement("span", {
    className: "text-zinc-500 text-xs uppercase tracking-wider"
  }, "Item:"), React.createElement("span", {
    className: "text-zinc-300"
  }, importPreview.item)), ((_importPreview$addons = importPreview.addons) === null || _importPreview$addons === void 0 ? void 0 : _importPreview$addons.length) > 0 && React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, React.createElement("span", {
    className: "text-zinc-500 text-xs uppercase tracking-wider"
  }, "Add-ons:"), React.createElement("span", {
    className: "text-zinc-300"
  }, importPreview.addons.join(', '))), importPreview.offering && React.createElement("div", {
    className: "flex items-center gap-2"
  }, React.createElement("span", {
    className: "text-zinc-500 text-xs uppercase tracking-wider"
  }, "Offering:"), React.createElement("span", {
    className: "text-zinc-300"
  }, importPreview.offering)), importPreview.notes && React.createElement("div", {
    className: "mt-2"
  }, React.createElement("span", {
    className: "text-zinc-500 text-xs uppercase tracking-wider"
  }, "Notes:"), React.createElement("p", {
    className: "text-zinc-400 text-sm mt-1"
  }, importPreview.notes))), importWarnings.length > 0 && React.createElement("div", {
    className: "p-3 rounded-xl bg-white/5 border border-white/20"
  }, React.createElement("p", {
    className: "text-zinc-200 text-xs font-bold uppercase tracking-wider mb-1"
  }, "Warnings"), React.createElement("ul", {
    className: "text-zinc-300 text-xs space-y-0.5"
  }, importWarnings.map((w, i) => React.createElement("li", {
    key: i
  }, "\u2022 ", w))))), React.createElement("div", {
    className: "flex gap-3 mt-6"
  }, React.createElement("button", {
    onClick: () => {
      setImportPreview(null);
      setImportWarnings([]);
    },
    className: "flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-300 font-semibold hover:bg-white/10 transition-colors"
  }, "Back"), React.createElement("button", {
    onClick: confirmImport,
    className: "flex-1 px-4 py-3 rounded-xl bg-zinc-100 text-black font-semibold hover:bg-zinc-300 transition-colors"
  }, "Save Build"))))));
};
var SortTh = _ref25 => {
  var {
    label,
    sortKey,
    activeKey,
    dir,
    defaultDir = 'asc',
    onSort
  } = _ref25;
  var isActive = activeKey === sortKey;
  var shownDir = isActive ? dir : defaultDir;
  return React.createElement("th", {
    className: "cx-sortth",
    "aria-sort": isActive ? dir === 'asc' ? 'ascending' : 'descending' : 'none'
  }, React.createElement("button", {
    type: "button",
    onClick: () => onSort(sortKey, defaultDir),
    "aria-label": "Sort by ".concat(label).concat(isActive ? dir === 'asc' ? ' (ascending)' : ' (descending)' : ''),
    title: "Sort by ".concat(label)
  }, React.createElement("span", null, label), isActive ? React.createElement("span", {
    className: "cx-sortdir",
    "aria-hidden": "true"
  }, dir === 'asc' ? '▲' : '▼') : React.createElement("span", {
    className: "cx-sortdir cx-sortdir--hint",
    "aria-hidden": "true"
  }, defaultDir === 'asc' ? '▲' : '▼')));
};
var ListView = _ref26 => {
  var {
    data,
    type,
    filterOptions,
    activeFilter,
    setActiveFilter,
    allPerks = [],
    setView,
    onPerkSelect,
    initialSearch = '',
    onSearchChange,
    buildsByOwner = {},
    onCreateBuildSeed,
    onBack,
    comparePerks = [],
    onPerkLongPress,
    favoritePerks = [],
    onToggleFavorite,
    onPerkTap,
    onPerkPreview,
    onShowLore,
    onShowPower,
    onViewProfile,
    allCharacters = [],
    settings = {}
  } = _ref26;
  var comparePress = useRef({
    timer: null,
    firedId: null
  });
  useEffect(() => () => clearTimeout(comparePress.current.timer), []);
  var scrollRef = useRef(null);
  var [localSearch, setLocalSearch] = useState(initialSearch || '');
  var DEFAULT_SORT = {
    key: 'name',
    dir: 'asc'
  };
  var [sort, setSort] = useState(DEFAULT_SORT);
  var handleSort = (key, defaultDir) => {
    setSort(prev => {
      if (prev.key !== key) return {
        key,
        dir: defaultDir
      };
      if (prev.dir === defaultDir) return {
        key,
        dir: defaultDir === 'asc' ? 'desc' : 'asc'
      };
      return DEFAULT_SORT.key === key ? _objectSpread({}, DEFAULT_SORT) : {
        key: DEFAULT_SORT.key,
        dir: DEFAULT_SORT.dir
      };
    });
  };
  var scrollToTop = () => {
    var _scrollRef$current;
    (_scrollRef$current = scrollRef.current) === null || _scrollRef$current === void 0 || _scrollRef$current.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  useEffect(() => {
    setLocalSearch(initialSearch || '');
  }, [initialSearch]);
  var perksByOwner = useMemo(() => {
    var bucket = {};
    (allPerks || []).forEach(p => {
      if (!p.owner) return;
      if (!bucket[p.owner]) bucket[p.owner] = [];
      bucket[p.owner].push(p);
    });
    return bucket;
  }, [allPerks]);
  var isPerkList = type === 'Perks';
  var isCharacterList = type === 'Killers' || type === 'Survivors';
  var listHatnote = type === 'Killers' ? 'The playable killers of Dead by Daylight, with their real names and teachable perks.' : type === 'Survivors' ? 'The playable survivors of Dead by Daylight, with their teachable perks.' : 'All killer and survivor perks, searchable by role, tag, and text.';
  var effectiveFilter = activeFilter || 'All';
  var updateFilter = val => setActiveFilter && setActiveFilter(val);
  var stripThe = name => (name || '').replace(/^The\s+/i, '');
  var charByName = useMemo(() => {
    var map = new Map();
    (allCharacters || []).forEach(c => {
      if (c && c.name) map.set(c.name, c);
    });
    return map;
  }, [allCharacters]);
  var releaseByChar = useMemo(() => {
    var map = new Map();
    if (typeof TIMELINE_DATA !== 'undefined' && TIMELINE_DATA && TIMELINE_DATA.releases) {
      TIMELINE_DATA.releases.forEach(rel => {
        [...(rel.killers || []), ...(rel.survivors || [])].forEach(entry => {
          if (entry && entry.name && !map.has(entry.name)) map.set(entry.name, {
            name: rel.name,
            chapterNumber: rel.chapterNumber
          });
        });
      });
    }
    return map;
  }, []);
  var fmtDiff = d => ({
    easy: 'Easy',
    intermediate: 'Intermediate',
    hard: 'Hard',
    veryhard: 'Very hard'
  })[(d || '').toLowerCase()] || d;
  var filtered = useMemo(() => {
    if (!data) return [];
    var term = localSearch.toLowerCase();
    var result = data.filter(item => {
      var searchableDescription = (isPerkList ? getPerkSearchDescription(item) : item.description || '').toLowerCase();
      var searchMatch = !term || item.name.toLowerCase().includes(term) || item.realName && item.realName.toLowerCase().includes(term) || item.owner && item.owner.toLowerCase().includes(term) || searchableDescription.includes(term);
      var filterMatch;
      var perkName = (item.name || '').toLowerCase();
      var perkDesc = searchableDescription;
      if (effectiveFilter === 'Favorites') {
        filterMatch = favoritePerks.includes(item.id);
      } else if (effectiveFilter === 'Exhaustion') {
        filterMatch = perkDesc.includes('causes exhaustion') || perkDesc.includes('causes the exhausted');
      } else if (effectiveFilter === 'Hex') {
        filterMatch = perkName.startsWith('hex:');
      } else if (effectiveFilter === 'Boon') {
        filterMatch = perkName.startsWith('boon:');
      } else if (effectiveFilter === 'Scourge') {
        filterMatch = perkName.startsWith('scourge hook:');
      } else if (effectiveFilter === 'Obsession') {
        filterMatch = perkDesc.includes('obsession');
      } else if (effectiveFilter === 'Aura') {
        filterMatch = perkDesc.includes('aura') && (perkDesc.includes('see') || perkDesc.includes('reveal') || perkDesc.includes('read'));
      } else if (effectiveFilter === 'Stealth') {
        filterMatch = perkDesc.includes('undetectable') || perkDesc.includes('scratch marks') || perkDesc.includes('terror radius') || perkDesc.includes('red stain');
      } else if (effectiveFilter === 'Gen') {
        filterMatch = perkDesc.includes('generator') || perkDesc.includes('repair');
      } else if (effectiveFilter === 'Healing') {
        filterMatch = perkDesc.includes('heal') || perkDesc.includes('mend') || perkDesc.includes('recover');
      } else {
        filterMatch = effectiveFilter === 'All' || item.type === effectiveFilter;
      }
      return searchMatch && filterMatch;
    });
    if (isCharacterList) {
      var dirMul = sort.dir === 'asc' ? 1 : -1;
      var getPowerName = item => {
        var g = item && item.name && typeof KILLER_GUIDES !== 'undefined' ? KILLER_GUIDES[item.name] : null;
        return g && g.powerName || '';
      };
      var getSpeedNum = item => {
        var s = item && item.name && typeof KILLER_STATS !== 'undefined' && KILLER_STATS[item.name] ? KILLER_STATS[item.name].speed : '';
        var m = String(s || '').match(/([\d.]+)/);
        return m ? parseFloat(m[1]) : null;
      };
      var getReleaseKey = item => typeof RELEASE_DATE_MAP !== 'undefined' && RELEASE_DATE_MAP[item.name] || '';
      result = [...result].sort((a, b) => {
        switch (sort.key) {
          case 'power':
            {
              var pa = getPowerName(a);
              var pb = getPowerName(b);
              if (!pa && !pb) return 0;
              if (!pa) return 1;
              if (!pb) return -1;
              return dirMul * pa.localeCompare(pb);
            }
          case 'chapter':
            {
              var ra = getReleaseKey(a);
              var rb = getReleaseKey(b);
              if (!ra && !rb) return 0;
              if (!ra) return 1;
              if (!rb) return -1;
              return dirMul * ra.localeCompare(rb);
            }
          case 'speed':
            {
              var sa = getSpeedNum(a);
              var sb = getSpeedNum(b);
              if (sa === null && sb === null) return 0;
              if (sa === null) return 1;
              if (sb === null) return -1;
              return dirMul * (sa - sb);
            }
          case 'name':
          default:
            return dirMul * stripThe(a.name).localeCompare(stripThe(b.name));
        }
      });
    }
    if (isPerkList) {
      result = [...result].sort((a, b) => stripThe(a.name).localeCompare(stripThe(b.name)));
    }
    return result;
  }, [data, localSearch, effectiveFilter, sort, isCharacterList, favoritePerks, isPerkList]);
  return React.createElement("div", {
    ref: scrollRef,
    className: "flex flex-col h-full pt-6 pb-32 overflow-y-auto custom-scrollbar"
  }, React.createElement("div", {
    className: "cx-listhead"
  }, React.createElement(ViewCrumbs, {
    trail: [{
      label: 'Main page',
      onClick: onBack
    }],
    current: type
  }), React.createElement("h1", {
    className: "cx-title"
  }, type), React.createElement("p", {
    className: "cx-hatnote"
  }, listHatnote)), React.createElement(WikiHeaderSearchPortal, null, React.createElement("div", {
    className: "relative w-full"
  }, React.createElement("div", {
    className: "absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
  }, React.createElement(Icons.Search, {
    width: 18,
    height: 18
  })), React.createElement("input", {
    type: "text",
    placeholder: "Filter ".concat(type, "..."),
    className: "w-full bg-[var(--panel)] border border-[var(--stroke)] rounded-xl py-3 pl-12 pr-10 text-white placeholder-zinc-600 text-sm focus:outline-none",
    value: localSearch,
    onChange: e => {
      setLocalSearch(e.target.value);
      onSearchChange && onSearchChange(e.target.value);
    }
  }), localSearch && React.createElement("button", {
    onClick: () => {
      setLocalSearch('');
      onSearchChange && onSearchChange('');
    },
    className: "absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white/5 text-zinc-400 hover:text-white transition-colors"
  }, React.createElement(Icons.X, {
    width: 14,
    height: 14
  })))), isCharacterList && React.createElement("div", {
    className: "max-w-3xl mx-auto flex justify-center gap-2 mb-2 px-6"
  }, React.createElement("span", {
    className: "text-[11px] text-zinc-500 uppercase tracking-wider self-center"
  }, filtered.length, " ", type.toLowerCase())), React.createElement("div", {
    className: "px-6"
  }, isPerkList ? React.createElement("div", {
    className: "max-w-3xl mx-auto flex flex-wrap justify-center gap-2 pb-4"
  }, filterOptions && filterOptions.map(opt => React.createElement("button", {
    key: opt,
    onClick: () => updateFilter(effectiveFilter === opt ? 'All' : opt),
    className: "px-4 py-2 text-xs rounded-lg border transition-colors ".concat(effectiveFilter === opt ? 'bg-zinc-100 text-black border-zinc-100 font-bold' : 'bg-transparent text-zinc-300 border-white/15 hover:border-white/30')
  }, opt))) : filterOptions && React.createElement("div", {
    className: "max-w-3xl mx-auto flex flex-wrap justify-center gap-2 pb-4"
  }, filterOptions.map(opt => React.createElement("button", {
    key: opt,
    onClick: () => updateFilter(opt),
    className: "px-4 py-2 text-xs rounded-lg border transition-colors ".concat(activeFilter === opt ? 'bg-zinc-100 text-black border-zinc-100 font-bold' : 'bg-transparent text-zinc-300 border-white/15 hover:border-white/30')
  }, opt)))), React.createElement("div", {
    className: "cx-listwrap w-full max-w-[1280px] mx-auto px-[44px] pb-32 overflow-x-auto shrink-0"
  }, React.createElement("table", {
    className: "cx-wikitable"
  }, isCharacterList ? React.createElement("thead", null, React.createElement("tr", null, React.createElement(SortTh, {
    label: "Character",
    sortKey: "name",
    activeKey: sort.key,
    dir: sort.dir,
    defaultDir: "asc",
    onSort: handleSort
  }), type === 'Killers' ? React.createElement(SortTh, {
    label: "Power",
    sortKey: "power",
    activeKey: sort.key,
    dir: sort.dir,
    defaultDir: "asc",
    onSort: handleSort
  }) : null, React.createElement(SortTh, {
    label: "Chapter",
    sortKey: "chapter",
    activeKey: sort.key,
    dir: sort.dir,
    defaultDir: "asc",
    onSort: handleSort
  }), type === 'Killers' ? React.createElement(SortTh, {
    label: "Movement speed",
    sortKey: "speed",
    activeKey: sort.key,
    dir: sort.dir,
    defaultDir: "desc",
    onSort: handleSort
  }) : React.createElement("th", null, "Teachables"), React.createElement("th", {
    "aria-hidden": "true"
  }))) : React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "Perk"), React.createElement("th", null, "Owner"), React.createElement("th", null, "Type"), React.createElement("th", null, "Effect"), React.createElement("th", {
    "aria-hidden": "true"
  }))), React.createElement("tbody", null, filtered.map(item => {
    var category = type === 'Killers' ? 'Killer' : type === 'Survivors' ? 'Survivor' : 'Perk';
    var isPerk = category === 'Perk';
    var isCharacter = !isPerk;
    var fallbackIcon = category === 'Killer' ? React.createElement(Icons.Sword, {
      width: 24,
      height: 24,
      className: "opacity-20"
    }) : category === 'Survivor' ? React.createElement(Icons.Heart, {
      width: 24,
      height: 24,
      className: "opacity-20"
    }) : React.createElement(Icons.BookOpen, {
      width: 20,
      height: 20,
      className: "opacity-20"
    });
    var isInCompare = isPerk && comparePerks.some(p => p.id === item.id);
    var isFavorite = favoritePerks.includes(item.id);
    var onToggleFavoriteFn = onToggleFavorite ? () => onToggleFavorite(item.id) : undefined;
    var onPerkTapFn = isPerk && onPerkTap ? () => onPerkTap(item) : undefined;
    var onViewProfileFn = isCharacter && onViewProfile ? () => onViewProfile(item) : undefined;
    var consumeComparePress = () => {
      if (comparePress.current.firedId !== item.id) return false;
      comparePress.current.firedId = null;
      return true;
    };
    var handleTouchStart = () => {
      if (!isPerk || !onPerkLongPress) return;
      clearTimeout(comparePress.current.timer);
      comparePress.current.firedId = null;
      comparePress.current.timer = setTimeout(() => {
        comparePress.current.firedId = item.id;
        onPerkLongPress(item);
      }, 500);
    };
    var handleTouchEnd = () => {
      clearTimeout(comparePress.current.timer);
      comparePress.current.timer = null;
    };
    var handlePerkClick = () => {
      if (!consumeComparePress()) onPerkTapFn === null || onPerkTapFn === void 0 || onPerkTapFn();
    };
    var handleCharacterClick = () => {
      if (onViewProfileFn) onViewProfileFn();
    };
    if (isCharacter) {
      var guide = category === 'Killer' ? KILLER_GUIDES[item.name] : null;
      var stats = category === 'Killer' ? KILLER_STATS[item.name] : null;
      var rel = releaseByChar.get(item.name);
      var chapterLabel = rel ? "".concat(rel.name).concat(rel.chapterNumber ? " (".concat(rel.chapterNumber, ")") : '') : '\u2014';
      return React.createElement("tr", {
        key: item.id,
        onClick: handleCharacterClick,
        className: isInCompare ? 'cx-row-compare' : undefined,
        style: {
          cursor: 'pointer'
        }
      }, React.createElement("td", {
        className: "cx-perkcell"
      }, React.createElement("div", {
        className: "cx-perkcell-inner"
      }, React.createElement("div", {
        className: "cx-thumbzoom",
        style: {
          width: 44,
          height: 44,
          overflow: 'hidden',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }
      }, React.createElement(AssetFrame, {
        type: category,
        imageUrl: item.image,
        fallbackIcon: fallbackIcon,
        size: "fill"
      })), React.createElement("span", null, React.createElement("button", {
        type: "button",
        className: "cx-alink",
        onClick: e => {
          e.stopPropagation();
          handleCharacterClick();
        }
      }, item.name), category === 'Killer' && item.realName && item.realName !== item.name ? React.createElement("small", null, item.realName) : null))), category === 'Killer' ? React.createElement("td", null, guide && guide.powerName ? React.createElement("button", {
        type: "button",
        className: "cx-alink",
        onClick: e => {
          e.stopPropagation();
          handleCharacterClick();
        }
      }, guide.powerName) : '\u2014') : null, React.createElement("td", null, chapterLabel), React.createElement("td", null, category === 'Killer' ? stats && stats.speed ? stats.speed : fmtDiff(item.difficulty) : perksByOwner[item.name] && perksByOwner[item.name].length > 0 ? perksByOwner[item.name].map((perk, perkIdx) => React.createElement("span", {
        key: perk.id
      }, perkIdx > 0 && React.createElement("span", {
        style: {
          color: 'var(--text-faint)'
        }
      }, " \xB7 "), React.createElement("button", {
        type: "button",
        className: "cx-alink",
        onClick: e => {
          e.stopPropagation();
          setView && setView('survivor', {
            id: item.id,
            scroll: 'perks'
          });
        },
        title: "Open ".concat(item.name, " \u2014 ").concat(perk.name)
      }, perk.name))) : '\u2014'), React.createElement("td", {
        className: "cx-star"
      }, onToggleFavoriteFn && React.createElement("button", {
        type: "button",
        onClick: e => {
          e.stopPropagation();
          onToggleFavoriteFn();
        },
        "aria-label": "Toggle favorite",
        className: isFavorite ? 'cx-star-on' : undefined
      }, isFavorite ? '\u2605' : '\u2606')));
    }
    var ownerChar = charByName.get(item.owner) || null;
    var isHex = item.name.startsWith('Hex:');
    var isExhaust = /exhaust/i.test(item.description || '');
    var typeLabel = "".concat(item.type).concat(isHex ? ' \u00b7 Hex' : '').concat(isExhaust ? ' \u00b7 Exhaustion' : '');
    return React.createElement("tr", {
      key: item.id,
      onClick: onPerkTapFn ? handlePerkClick : undefined,
      onTouchStart: isPerk ? handleTouchStart : undefined,
      onTouchEnd: isPerk ? handleTouchEnd : undefined,
      onTouchCancel: isPerk ? handleTouchEnd : undefined,
      onMouseDown: isPerk ? handleTouchStart : undefined,
      onMouseUp: isPerk ? handleTouchEnd : undefined,
      onMouseLeave: isPerk ? handleTouchEnd : undefined,
      className: "".concat(onPerkTapFn ? 'cursor-pointer' : '', " ").concat(isInCompare ? 'cx-row-compare' : '')
    }, React.createElement("td", {
      className: "cx-perkcell"
    }, React.createElement("div", {
      className: "cx-perkimg"
    }, onPerkPreview && item.image ? React.createElement("button", {
      type: "button",
      onClick: e => {
        e.stopPropagation();
        if (!consumeComparePress()) onPerkPreview(item);
      },
      style: {
        padding: 0,
        border: 0,
        background: 'none',
        cursor: 'zoom-in'
      },
      "aria-label": "Preview ".concat(item.name)
    }, React.createElement("div", {
      className: "cx-imgbox"
    }, React.createElement(AssetFrame, {
      type: category,
      imageUrl: item.image,
      fallbackIcon: fallbackIcon,
      size: "fill"
    }))) : React.createElement("div", {
      className: "cx-imgbox"
    }, React.createElement(AssetFrame, {
      type: category,
      imageUrl: item.image,
      fallbackIcon: fallbackIcon,
      size: "fill"
    })), onPerkTapFn ? React.createElement("button", {
      type: "button",
      className: "cx-alink",
      onClick: e => {
        e.stopPropagation();
        handlePerkClick();
      }
    }, item.name) : React.createElement("span", {
      className: "font-semibold text-zinc-100"
    }, item.name), React.createElement("small", null, typeLabel), onPerkLongPress && React.createElement("button", {
      type: "button",
      className: "cx-compare-pick",
      "aria-label": "".concat(isInCompare ? 'Remove' : 'Add', " ").concat(item.name, " ").concat(isInCompare ? 'from' : 'to', " comparison"),
      "aria-pressed": isInCompare,
      onMouseDown: event => event.stopPropagation(),
      onTouchStart: event => event.stopPropagation(),
      onClick: event => {
        event.stopPropagation();
        comparePress.current.firedId = null;
        onPerkLongPress(item);
      }
    }, isInCompare ? 'Selected' : 'Compare'))), React.createElement("td", {
      style: {
        textAlign: 'center',
        verticalAlign: 'middle'
      }
    }, ownerChar ? React.createElement("button", {
      type: "button",
      className: "cx-alink",
      onClick: e => {
        e.stopPropagation();
        setView && setView(ownerChar.power || ownerChar.type === 'Killer' ? 'killer' : 'survivor', {
          id: ownerChar.id
        });
      }
    }, item.owner) : item.owner || 'Universal'), React.createElement("td", {
      style: {
        textAlign: 'center',
        verticalAlign: 'middle'
      }
    }, item.type), React.createElement("td", null, item.description ? React.createElement(PerkDescriptionBlock, {
      perk: item,
      settings: settings,
      accentColor: "var(--link)",
      className: "inline",
      lineClassName: "leading-relaxed"
    }) : '\u2014'), React.createElement("td", {
      className: "cx-star"
    }, onToggleFavoriteFn && React.createElement("button", {
      type: "button",
      onClick: e => {
        e.stopPropagation();
        onToggleFavoriteFn();
      },
      "aria-label": "Toggle favorite",
      className: isFavorite ? 'cx-star-on' : undefined
    }, isFavorite ? '\u2605' : '\u2606'), isInCompare && React.createElement("span", {
      className: "cx-compare-dot",
      title: "In compare"
    }, '\u25cf')));
  })))));
};
var RealmsView = _ref27 => {
  var {
    onBack,
    maps,
    realms: dbRealms = [],
    onViewLayout,
    onOpenRealm,
    initialSearch = ''
  } = _ref27;
  var [mapSearch, setMapSearch] = useState(initialSearch || '');
  useEffect(() => {
    setMapSearch(initialSearch || '');
  }, [initialSearch]);
  var mapsById = useMemo(() => {
    var lookup = new Map();
    (maps || []).forEach(mp => {
      if (mp && mp.id && !lookup.has(mp.id)) lookup.set(mp.id, mp);
    });
    return lookup;
  }, [maps]);
  var rows = useMemo(() => {
    var term = (mapSearch || '').toLowerCase();
    var matched = (maps || []).filter(mp => {
      if (!term) return true;
      return (mp.name || '').toLowerCase().includes(term);
    });
    var matchedIds = new Set(matched.map(mp => mp.id));
    var out = [];
    (dbRealms || []).forEach(realm => {
      var seen = new Set();
      var realmMaps = (realm.maps || []).map(id => mapsById.get(id)).filter(Boolean).filter(mp => {
        if (!matchedIds.has(mp.id)) return false;
        var key = (mp.name || '').trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (term && !(realm.name || '').toLowerCase().includes(term) && realmMaps.length === 0) return;
      out.push({
        key: realm.id,
        name: realm.name,
        realm,
        maps: realmMaps
      });
    });
    var placedIds = new Set();
    out.forEach(row => row.maps.forEach(mp => placedIds.add(mp.id)));
    var dbNames = new Set((dbRealms || []).map(r => (r.name || '').trim().toLowerCase()));
    var seenOther = new Set();
    var other = [];
    matched.forEach(mp => {
      if (placedIds.has(mp.id)) return;
      var rname = (mp.realm || 'Unknown Realm').trim();
      if (dbNames.has(rname.toLowerCase())) return;
      var key = (mp.name || '').trim().toLowerCase();
      if (seenOther.has(key)) return;
      seenOther.add(key);
      other.push(mp);
    });
    if (other.length > 0) out.push({
      key: '__other',
      name: 'Other maps',
      realm: null,
      maps: other
    });
    return out;
  }, [maps, dbRealms, mapsById, mapSearch]);
  return React.createElement("div", {
    className: "flex flex-col h-full pt-6 pb-32 px-6 overflow-y-auto custom-scrollbar"
  }, React.createElement(ViewCrumbs, {
    trail: [{
      label: 'Main page',
      onClick: onBack
    }],
    current: "Realms"
  }), React.createElement("h1", {
    className: "cx-title"
  }, "Realms"), React.createElement("p", {
    className: "cx-hatnote"
  }, "Maps and locations of the trials, grouped by realm."), React.createElement(WikiHeaderSearchPortal, null, React.createElement("div", {
    className: "relative w-full"
  }, React.createElement("div", {
    className: "absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
  }, React.createElement(Icons.Search, {
    width: 18,
    height: 18
  })), React.createElement("input", {
    value: mapSearch,
    onChange: e => setMapSearch(e.target.value),
    placeholder: "Search maps...",
    className: "w-full bg-[var(--panel)] border border-[var(--stroke)] rounded-xl py-3 pl-12 pr-10 text-white placeholder-zinc-600 text-sm focus:outline-none"
  }), mapSearch && React.createElement("button", {
    onClick: () => setMapSearch(''),
    className: "absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white/5 text-zinc-400 hover:text-white transition-colors"
  }, React.createElement(Icons.X, {
    width: 14,
    height: 14
  })))), React.createElement("div", {
    className: "cx-listwrap w-full max-w-[1280px] mx-auto px-[44px] pb-32 overflow-x-auto shrink-0"
  }, rows.length === 0 && React.createElement("div", {
    className: "text-center text-zinc-500 mt-12"
  }, "No map data available."), rows.length > 0 && React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", {
    style: {
      width: '220px'
    }
  }, "Realm"), React.createElement("th", null, "Maps"))), React.createElement("tbody", null, rows.map(row => React.createElement("tr", {
    key: row.key
  }, React.createElement("td", null, row.realm ? React.createElement(React.Fragment, null, React.createElement("button", {
    type: "button",
    className: "cx-alink font-semibold",
    onClick: () => onOpenRealm && onOpenRealm(row.realm)
  }, row.name), React.createElement("small", {
    style: {
      display: 'block',
      color: 'var(--text-faint)',
      fontSize: '11px'
    }
  }, row.maps.length, " map", row.maps.length === 1 ? '' : 's')) : React.createElement(React.Fragment, null, React.createElement("span", {
    className: "font-semibold text-zinc-100"
  }, row.name), React.createElement("small", {
    style: {
      display: 'block',
      color: 'var(--text-faint)',
      fontSize: '11px'
    }
  }, row.maps.length, " map", row.maps.length === 1 ? '' : 's'))), React.createElement("td", null, row.maps.map((mp, idx) => {
    var hasLayout = MAP_LAYOUTS[mp.name] && MAP_LAYOUTS[mp.name].length > 0;
    return React.createElement("span", {
      key: mp.id
    }, idx > 0 && React.createElement("span", {
      className: "cx-sep",
      style: {
        color: 'var(--text-faint)'
      }
    }, " \xB7 "), React.createElement("button", {
      type: "button",
      className: "cx-alink",
      onClick: () => onViewLayout && onViewLayout(mp),
      title: hasLayout ? 'Open details + layout' : 'Open details'
    }, mp.name));
  }), row.maps.length === 0 && React.createElement("span", {
    style: {
      color: 'var(--text-faint)'
    }
  }, "No maps found"))))))));
};
var BuildForm = _ref28 => {
  var _characters$find3, _form$selectedItem2, _form$selectedOfferin2;
  var {
    draft,
    onSave,
    onCancel,
    perks = [],
    killers = [],
    survivors = [],
    items = [],
    addons = [],
    offerings = []
  } = _ref28;
  var empty = {
    id: null,
    name: '',
    role: 'Survivor',
    characterId: '',
    characterName: '',
    perks: [null, null, null, null],
    selectedAddons: [null, null],
    selectedItem: null,
    selectedOffering: null,
    tags: [],
    notes: '',
    favorite: false
  };
  var [form, setForm] = useState(draft || empty);
  var [tagInput, setTagInput] = useState(((draft === null || draft === void 0 ? void 0 : draft.tags) || []).join(', '));
  var [perkSearch, setPerkSearch] = useState('');
  var [addonSearch, setAddonSearch] = useState('');
  var [showCharacterGrid, setShowCharacterGrid] = useState(false);
  useEffect(() => {
    if (draft) {
      setForm(_objectSpread(_objectSpread(_objectSpread({}, empty), draft), {}, {
        selectedAddons: draft.selectedAddons || [null, null],
        selectedItem: draft.selectedItem || null,
        selectedOffering: draft.selectedOffering || null
      }));
      setTagInput(((draft === null || draft === void 0 ? void 0 : draft.tags) || []).join(', '));
    }
  }, [draft === null || draft === void 0 ? void 0 : draft.id]);
  var characters = form.role === 'Killer' ? killers : survivors;
  var perkPool = useMemo(() => {
    var term = perkSearch.toLowerCase();
    return (perks || []).filter(p => p.type === form.role && (!term || p.name.toLowerCase().includes(term) || (p.owner || '').toLowerCase().includes(term))).sort((a, b) => a.name.localeCompare(b.name, undefined, {
      sensitivity: 'base'
    }) || (a.owner || '').localeCompare(b.owner || '', undefined, {
      sensitivity: 'base'
    }));
  }, [perks, form.role, perkSearch]);
  var survivorItems = useMemo(() => {
    return (items || []).filter(i => i.bloodweb === true && i.role === 'survivor').sort((a, b) => getRarityOrder(b.rarity) - getRarityOrder(a.rarity));
  }, [items]);
  var availableAddons = useMemo(() => {
    var term = addonSearch.toLowerCase();
    var pool = [];
    if (form.role === 'Killer' && form.characterName) {
      pool = (addons || []).filter(a => a.role === 'killer' && a.killerName === form.characterName);
    } else if (form.role === 'Survivor' && form.selectedItem) {
      pool = (addons || []).filter(a => a.role === 'survivor' && a.itemType === form.selectedItem.itemType);
    }
    if (term) {
      pool = pool.filter(a => a.name.toLowerCase().includes(term));
    }
    return pool.sort((a, b) => getRarityOrder(b.rarity) - getRarityOrder(a.rarity));
  }, [addons, form.role, form.characterName, form.selectedItem, addonSearch]);
  var availableOfferings = useMemo(() => {
    return (offerings || []).filter(o => !o.role || o.role === form.role.toLowerCase() || o.role === null);
  }, [offerings, form.role]);
  var updatePerk = (slot, perkId) => {
    var selected = perkPool.find(p => p.id === perkId);
    var next = [...form.perks];
    next[slot] = selected ? {
      id: selected.id,
      name: selected.name,
      image: selected.image
    } : null;
    setForm(f => _objectSpread(_objectSpread({}, f), {}, {
      perks: next
    }));
  };
  var updateAddon = (slot, addonId) => {
    var selected = availableAddons.find(a => a.id === addonId);
    var next = [...form.selectedAddons];
    next[slot] = selected || null;
    setForm(f => _objectSpread(_objectSpread({}, f), {}, {
      selectedAddons: next
    }));
  };
  var pickCharacter = char => {
    setForm(f => _objectSpread(_objectSpread({}, f), {}, {
      characterId: (char === null || char === void 0 ? void 0 : char.id) || '',
      characterName: (char === null || char === void 0 ? void 0 : char.name) || '',
      selectedAddons: [null, null]
    }));
    setShowCharacterGrid(false);
  };
  var pickItem = itemId => {
    var selected = survivorItems.find(i => i.id === itemId);
    setForm(f => _objectSpread(_objectSpread({}, f), {}, {
      selectedItem: selected || null,
      selectedAddons: [null, null]
    }));
  };
  var pickOffering = offeringId => {
    var selected = availableOfferings.find(o => o.id === offeringId);
    setForm(f => _objectSpread(_objectSpread({}, f), {}, {
      selectedOffering: selected || null
    }));
  };
  var handleSave = () => {
    var _characters$find2, _form$selectedItem, _form$selectedOfferin;
    if (!form.name.trim()) {
      alert('Give the build a name.');
      return;
    }
    var now = new Date().toISOString();
    var normalized = _objectSpread(_objectSpread({}, form), {}, {
      id: form.id || uuid(),
      role: roleFromString(form.role),
      characterName: form.characterName || ((_characters$find2 = characters.find(c => c.id === form.characterId)) === null || _characters$find2 === void 0 ? void 0 : _characters$find2.name) || '',
      perks: (form.perks || []).filter(Boolean).map(p => ({
        id: p.id,
        name: p.name
      })),
      selectedAddons: form.selectedAddons.filter(Boolean),
      addons: form.selectedAddons.filter(Boolean).map(a => a.name),
      item: ((_form$selectedItem = form.selectedItem) === null || _form$selectedItem === void 0 ? void 0 : _form$selectedItem.name) || '',
      offering: ((_form$selectedOfferin = form.selectedOffering) === null || _form$selectedOfferin === void 0 ? void 0 : _form$selectedOfferin.name) || '',
      tags: parseTags(tagInput),
      updatedAt: now,
      createdAt: form.createdAt || now
    });
    onSave(normalized);
  };
  var changeRole = newRole => {
    setForm(f => _objectSpread(_objectSpread({}, f), {}, {
      role: newRole,
      perks: [null, null, null, null],
      characterId: '',
      characterName: '',
      selectedItem: null,
      selectedAddons: [null, null],
      selectedOffering: null
    }));
    setAddonSearch('');
    setPerkSearch('');
  };
  return React.createElement("div", {
    className: "cx-panel"
  }, React.createElement("h2", {
    className: "cx-sec"
  }, "Build editor"), React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Name"), React.createElement("td", null, React.createElement("input", {
    value: form.name,
    onChange: e => setForm(f => _objectSpread(_objectSpread({}, f), {}, {
      name: e.target.value
    })),
    placeholder: "Build name...",
    className: "cx-input w-full px-3 py-2 text-lg font-bold"
  }))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Role"), React.createElement("td", null, React.createElement("div", {
    className: "flex gap-2"
  }, React.createElement("button", {
    onClick: () => changeRole('Survivor'),
    className: "mode-choice ".concat(form.role === 'Survivor' ? 'mode-choice--active' : '', " flex-1 sm:flex-none px-4 py-3 text-xs font-bold uppercase tracking-wider"),
    "aria-pressed": form.role === 'Survivor'
  }, "Survivor"), React.createElement("button", {
    onClick: () => changeRole('Killer'),
    className: "mode-choice ".concat(form.role === 'Killer' ? 'mode-choice--active' : '', " flex-1 sm:flex-none px-4 py-3 text-xs font-bold uppercase tracking-wider"),
    "aria-pressed": form.role === 'Killer'
  }, "Killer"), React.createElement("button", {
    onClick: () => setForm(f => _objectSpread(_objectSpread({}, f), {}, {
      favorite: !f.favorite
    })),
    className: "mode-choice ".concat(form.favorite ? 'mode-choice--active' : '', " px-3 py-2 text-xs font-bold uppercase"),
    "aria-pressed": form.favorite
  }, React.createElement(Icons.Star, {
    width: 16,
    height: 16,
    className: form.favorite ? 'fill-zinc-100' : ''
  }))))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, form.role), React.createElement("td", null, React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, React.createElement("span", {
    className: "text-[11px] uppercase tracking-widest text-zinc-500 font-bold"
  }, form.role), React.createElement("button", {
    onClick: () => setShowCharacterGrid(!showCharacterGrid),
    className: "cx-toolbtn cx-toolbtn--quiet text-[10px] px-2 py-1 font-bold uppercase tracking-wider"
  }, showCharacterGrid ? 'Hide' : 'Select')), form.characterName ? React.createElement("div", {
    className: "flex items-center gap-3 p-3 cx-flatcard"
  }, React.createElement("div", {
    className: "w-1 h-12",
    style: {
      background: 'var(--accent)'
    }
  }), React.createElement(AssetFrame, {
    type: form.role,
    size: "large",
    imageUrl: (_characters$find3 = characters.find(c => c.id === form.characterId)) === null || _characters$find3 === void 0 ? void 0 : _characters$find3.image,
    fallbackIcon: React.createElement(Icons.User, {
      width: 20,
      height: 20,
      className: "text-zinc-600"
    })
  }), React.createElement("div", {
    className: "flex-1"
  }, React.createElement("p", {
    className: "text-white font-bold"
  }, form.characterName), React.createElement("p", {
    className: "text-zinc-500 text-xs"
  }, "Selected ", form.role.toLowerCase())), React.createElement("button", {
    onClick: () => pickCharacter(null),
    className: "cx-toolbtn cx-toolbtn--quiet p-2"
  }, React.createElement(Icons.X, {
    width: 14,
    height: 14
  }))) : React.createElement("p", {
    className: "text-zinc-600 text-sm"
  }, "No character selected (generic build)"), showCharacterGrid && React.createElement("div", {
    className: "cx-well mt-3 grid grid-cols-5 sm:grid-cols-8 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-2"
  }, characters.map(char => React.createElement("button", {
    key: char.id,
    onClick: () => pickCharacter(char),
    className: "aspect-[3/4] border transition-all overflow-hidden ".concat(form.characterId === char.id ? '' : 'opacity-80 hover:opacity-100'),
    style: form.characterId === char.id ? {
      borderColor: 'var(--accent)'
    } : {
      borderColor: 'var(--stroke)'
    },
    title: char.name
  }, React.createElement("div", {
    className: "w-full h-full bg-zinc-900"
  }, React.createElement(AssetFrame, {
    type: form.role,
    imageUrl: char.image,
    size: "fill",
    fallbackIcon: React.createElement(Icons.User, {
      width: 12,
      height: 12,
      className: "text-zinc-600"
    })
  }))))))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Perks"), React.createElement("td", null, React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, React.createElement("span", {
    className: "text-[11px] uppercase tracking-widest text-zinc-500 font-bold"
  }, "Perks"), React.createElement("div", {
    className: "flex items-center gap-2"
  }, React.createElement("input", {
    value: perkSearch,
    onChange: e => setPerkSearch(e.target.value),
    placeholder: "Search...",
    className: "cx-input w-32 px-2 py-1 text-xs"
  }), React.createElement("span", {
    className: "text-[10px] text-zinc-600"
  }, perkPool.length, " available"))), React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, form.perks.map((perk, idx) => React.createElement("div", {
    key: idx,
    className: "p-3 cx-flatcard"
  }, React.createElement("p", {
    className: "text-[10px] uppercase tracking-wider text-zinc-600 font-bold mb-2"
  }, "Perk ", idx + 1), React.createElement("select", {
    value: (perk === null || perk === void 0 ? void 0 : perk.id) || '',
    onChange: e => updatePerk(idx, e.target.value),
    className: "themed-select w-full text-sm"
  }, React.createElement("option", {
    value: ""
  }, "Empty slot"), perkPool.map(p => React.createElement("option", {
    key: p.id,
    value: p.id
  }, p.name))), (perk === null || perk === void 0 ? void 0 : perk.name) && React.createElement("p", {
    className: "text-[11px] text-zinc-400 mt-2 truncate"
  }, perk.name)))))), form.role === 'Survivor' && React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Item"), React.createElement("td", null, React.createElement("select", {
    value: ((_form$selectedItem2 = form.selectedItem) === null || _form$selectedItem2 === void 0 ? void 0 : _form$selectedItem2.id) || '',
    onChange: e => pickItem(e.target.value),
    className: "themed-select w-full text-sm"
  }, React.createElement("option", {
    value: ""
  }, "No item"), survivorItems.map(item => React.createElement("option", {
    key: item.id,
    value: item.id
  }, item.name, " (", formatRarity(item.rarity), ")"))), form.selectedItem && React.createElement("div", {
    className: "mt-3 p-3 cx-flatcard flex items-center gap-3"
  }, React.createElement(Icons.Package, {
    width: 20,
    height: 20,
    className: "text-white/60"
  }), React.createElement("div", null, React.createElement("p", {
    className: "text-white font-semibold text-sm"
  }, form.selectedItem.name), React.createElement("p", {
    className: "text-xs",
    style: {
      color: getRarityColor(form.selectedItem.rarity)
    }
  }, formatRarity(form.selectedItem.rarity), " ", form.selectedItem.itemType))))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, form.role === 'Killer' ? 'Power Addons' : 'Item Addons'), React.createElement("td", null, React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, React.createElement("span", {
    className: "text-[11px] uppercase tracking-widest text-zinc-500 font-bold"
  }, form.role === 'Killer' ? 'Power Addons' : 'Item Addons'), React.createElement("input", {
    value: addonSearch,
    onChange: e => setAddonSearch(e.target.value),
    placeholder: "Search...",
    className: "cx-input w-32 px-2 py-1 text-xs"
  })), form.role === 'Killer' && !form.characterName || form.role === 'Survivor' && !form.selectedItem ? React.createElement("p", {
    className: "text-zinc-600 text-xs"
  }, form.role === 'Killer' ? 'Select a killer to choose power addons' : 'Select an item to choose addons') : React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, [0, 1].map(slot => {
    var _form$selectedAddons$;
    return React.createElement("div", {
      key: slot,
      className: "p-3 cx-flatcard"
    }, React.createElement("p", {
      className: "text-[10px] uppercase tracking-wider text-zinc-600 font-bold mb-2"
    }, "Addon ", slot + 1), React.createElement("select", {
      value: ((_form$selectedAddons$ = form.selectedAddons[slot]) === null || _form$selectedAddons$ === void 0 ? void 0 : _form$selectedAddons$.id) || '',
      onChange: e => updateAddon(slot, e.target.value),
      className: "themed-select w-full text-sm"
    }, React.createElement("option", {
      value: ""
    }, "No addon"), availableAddons.map(a => React.createElement("option", {
      key: a.id,
      value: a.id,
      style: {
        color: getRarityColor(a.rarity)
      }
    }, a.name))), form.selectedAddons[slot] && React.createElement("p", {
      className: "text-[11px] mt-2 truncate",
      style: {
        color: getRarityColor(form.selectedAddons[slot].rarity)
      }
    }, form.selectedAddons[slot].name));
  })))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Offering"), React.createElement("td", null, React.createElement("select", {
    value: ((_form$selectedOfferin2 = form.selectedOffering) === null || _form$selectedOfferin2 === void 0 ? void 0 : _form$selectedOfferin2.id) || '',
    onChange: e => pickOffering(e.target.value),
    className: "themed-select w-full text-sm"
  }, React.createElement("option", {
    value: ""
  }, "No offering"), availableOfferings.map(o => React.createElement("option", {
    key: o.id,
    value: o.id
  }, o.name))), form.selectedOffering && React.createElement("div", {
    className: "mt-3 p-3 cx-flatcard"
  }, React.createElement("p", {
    className: "text-white font-semibold text-sm"
  }, form.selectedOffering.name), React.createElement("p", {
    className: "text-zinc-500 text-xs mt-1 line-clamp-2"
  }, form.selectedOffering.description)))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Tags"), React.createElement("td", null, React.createElement("input", {
    value: tagInput,
    onChange: e => setTagInput(e.target.value),
    placeholder: "SoloQ, Tryhard, Meme...",
    className: "cx-input w-full px-3 py-2 text-sm"
  }))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Notes"), React.createElement("td", null, React.createElement("textarea", {
    value: form.notes,
    onChange: e => setForm(f => _objectSpread(_objectSpread({}, f), {}, {
      notes: e.target.value
    })),
    rows: 2,
    placeholder: "How to run this build...",
    className: "cx-input w-full px-3 py-2 text-sm"
  }))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Actions"), React.createElement("td", null, React.createElement("div", {
    className: "flex gap-3 justify-end pt-2"
  }, React.createElement("button", {
    onClick: onCancel,
    className: "cx-toolbtn cx-toolbtn--quiet px-5 py-2.5 text-sm font-bold"
  }, "Cancel"), React.createElement("button", {
    onClick: handleSave,
    className: "cx-toolbtn cx-toolbtn--primary px-5 py-2.5 text-sm font-bold"
  }, "Save Build")))))));
};
var BuildPlannerView = _ref29 => {
  var {
    builds = [],
    setBuilds,
    perks = [],
    killers = [],
    survivors = [],
    items = [],
    addons = [],
    offerings = [],
    templates = [],
    onBack,
    seed,
    clearSeed,
    setRoleContext
  } = _ref29;
  var [filters, setFilters] = useState({
    role: 'All',
    character: 'All',
    tag: 'All',
    search: '',
    include: '',
    exclude: ''
  });
  var [editing, setEditing] = useState(null);
  var [showForm, setShowForm] = useState(false);
  useEffect(() => {
    if (seed) {
      var seedPerks = seed.perks || [];
      var perksArray = [seedPerks[0] || null, seedPerks[1] || null, seedPerks[2] || null, seedPerks[3] || null];
      setEditing({
        id: null,
        name: seed.name || "".concat(seed.characterName || seed.role, " Build"),
        role: seed.role || 'Survivor',
        characterId: seed.characterId || '',
        characterName: seed.characterName || '',
        perks: perksArray,
        addons: seed.addons || [],
        item: seed.item || '',
        offering: seed.offering || '',
        tags: seed.tags || [],
        notes: seed.notes || '',
        favorite: false
      });
      setShowForm(true);
      clearSeed && clearSeed();
    }
  }, [seed, clearSeed]);
  var allTags = useMemo(() => {
    var set = new Set();
    builds.forEach(b => (b.tags || []).forEach(t => set.add(t)));
    return ['All', ...Array.from(set)];
  }, [builds]);
  var filteredBuilds = useMemo(() => {
    var includeTerm = filters.include.toLowerCase();
    var excludeTerm = filters.exclude.toLowerCase();
    var searchTerm = filters.search.toLowerCase();
    return builds.filter(b => {
      var roleMatch = filters.role === 'All' || b.role === filters.role;
      var charMatch = filters.character === 'All' || b.characterId === filters.character || (b.characterName || '').toLowerCase() === filters.character.toLowerCase();
      var tagMatch = filters.tag === 'All' || (b.tags || []).includes(filters.tag);
      var searchMatch = !searchTerm || b.name.toLowerCase().includes(searchTerm) || (b.notes || '').toLowerCase().includes(searchTerm);
      var includeMatch = !includeTerm || (b.perks || []).some(p => ((p === null || p === void 0 ? void 0 : p.name) || '').toLowerCase().includes(includeTerm));
      var excludeMatch = !excludeTerm || !(b.perks || []).some(p => ((p === null || p === void 0 ? void 0 : p.name) || '').toLowerCase().includes(excludeTerm));
      return roleMatch && charMatch && tagMatch && searchMatch && includeMatch && excludeMatch;
    });
  }, [builds, filters]);
  var upsertBuild = payload => {
    setBuilds(prev => {
      var exists = prev.some(b => b.id === payload.id);
      var next = exists ? prev.map(b => b.id === payload.id ? payload : b) : [payload, ...prev];
      return next;
    });
    setRoleContext && setRoleContext(payload.role);
    setShowForm(false);
    setEditing(null);
  };
  var duplicateBuild = build => {
    var now = new Date().toISOString();
    var clone = _objectSpread(_objectSpread({}, build), {}, {
      id: uuid(),
      name: "".concat(build.name, " (Copy)"),
      favorite: false,
      createdAt: now,
      updatedAt: now
    });
    setBuilds(prev => [clone, ...prev]);
  };
  var deleteBuild = id => {
    if (!confirm('Delete this build?')) return;
    setBuilds(prev => prev.filter(b => b.id !== id));
  };
  var toggleFavorite = id => {
    var now = new Date().toISOString();
    setBuilds(prev => prev.map(b => b.id === id ? _objectSpread(_objectSpread({}, b), {}, {
      favorite: !b.favorite,
      updatedAt: now
    }) : b));
  };
  var cloneTemplate = tpl => {
    var now = new Date().toISOString();
    var normalizedPerks = (tpl.perks || []).map(name => {
      var found = perks.find(p => perkMatchesName(p, name));
      return found ? {
        id: found.id,
        name: found.name
      } : {
        id: uuid(),
        name
      };
    });
    setEditing({
      id: null,
      name: tpl.title || tpl.name,
      role: roleFromString(tpl.role || 'Survivor'),
      characterId: tpl.characterId || '',
      characterName: tpl.character || '',
      perks: normalizedPerks.concat([null, null, null, null]).slice(0, 4),
      addons: tpl.addons || [],
      item: tpl.item || '',
      offering: tpl.offering || '',
      tags: tpl.tags || ['Template'],
      notes: tpl.note || tpl.notes || '',
      favorite: false
    });
    setShowForm(true);
  };
  return React.createElement("div", {
    className: "flex flex-col h-full pt-6 pb-32 px-6 overflow-y-auto custom-scrollbar"
  }, React.createElement(ViewCrumbs, {
    trail: [{
      label: 'Main page',
      onClick: onBack
    }],
    current: "Build & Loadout Lab"
  }), React.createElement("h1", {
    className: "cx-title"
  }, "Build & Loadout Lab"), React.createElement("p", {
    className: "cx-hatnote"
  }, "Craft, save, favorite and clone builds."), React.createElement("h2", {
    className: "cx-sec"
  }, "Actions"), React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Builds"), React.createElement("td", null, React.createElement("div", {
    className: "mb-4 flex flex-wrap gap-2 items-center"
  }, React.createElement("button", {
    onClick: () => {
      setEditing(null);
      setShowForm(true);
    },
    className: "cx-toolbtn cx-toolbtn--primary px-4 py-2 text-sm font-bold"
  }, "New Build"), React.createElement("button", {
    type: "button",
    onClick: () => setFilters(f => _objectSpread(_objectSpread({}, f), {}, {
      role: filters.role === 'Killer' ? 'All' : 'Killer'
    })),
    className: "mode-choice ".concat(filters.role === 'Killer' ? 'mode-choice--active' : '', " px-4 py-2 text-xs font-bold")
  }, "Killer"), React.createElement("button", {
    type: "button",
    onClick: () => setFilters(f => _objectSpread(_objectSpread({}, f), {}, {
      role: filters.role === 'Survivor' ? 'All' : 'Survivor'
    })),
    className: "mode-choice ".concat(filters.role === 'Survivor' ? 'mode-choice--active' : '', " px-4 py-2 text-xs font-bold")
  }, "Survivor"), React.createElement("button", {
    type: "button",
    onClick: () => setFilters({
      role: 'All',
      character: 'All',
      tag: 'All',
      search: '',
      include: '',
      exclude: ''
    }),
    className: "mode-choice px-4 py-2 text-xs font-bold"
  }, "Reset"), React.createElement("span", {
    className: "text-[11px] text-zinc-500 ml-auto uppercase tracking-wider"
  }, filteredBuilds.length, " builds")))))), React.createElement("h2", {
    className: "cx-sec"
  }, "Filters"), React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Search"), React.createElement("td", null, React.createElement("input", {
    value: filters.search,
    onChange: e => setFilters(f => _objectSpread(_objectSpread({}, f), {}, {
      search: e.target.value
    })),
    placeholder: "Search name or notes",
    className: "cx-input w-full px-3 py-2 text-sm"
  }))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Role"), React.createElement("td", null, React.createElement("select", {
    value: filters.role,
    onChange: e => setFilters(f => _objectSpread(_objectSpread({}, f), {}, {
      role: e.target.value
    })),
    className: "themed-select w-full text-sm"
  }, React.createElement("option", {
    value: "All"
  }, "All"), React.createElement("option", {
    value: "Killer"
  }, "Killer"), React.createElement("option", {
    value: "Survivor"
  }, "Survivor")))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Character"), React.createElement("td", null, React.createElement("select", {
    value: filters.character,
    onChange: e => setFilters(f => _objectSpread(_objectSpread({}, f), {}, {
      character: e.target.value
    })),
    className: "themed-select w-full text-sm"
  }, React.createElement("option", {
    value: "All"
  }, "All"), killers.map(k => React.createElement("option", {
    key: k.id,
    value: k.id
  }, k.name)), survivors.map(s => React.createElement("option", {
    key: s.id,
    value: s.id
  }, s.name))))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Tag"), React.createElement("td", null, React.createElement("select", {
    value: filters.tag,
    onChange: e => setFilters(f => _objectSpread(_objectSpread({}, f), {}, {
      tag: e.target.value
    })),
    className: "themed-select w-full text-sm"
  }, allTags.map(t => React.createElement("option", {
    key: t,
    value: t
  }, t))))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Include perk"), React.createElement("td", null, React.createElement("input", {
    value: filters.include,
    onChange: e => setFilters(f => _objectSpread(_objectSpread({}, f), {}, {
      include: e.target.value
    })),
    placeholder: "Dead Hard",
    className: "cx-input w-full px-3 py-2 text-sm"
  }))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Exclude perk"), React.createElement("td", null, React.createElement("input", {
    value: filters.exclude,
    onChange: e => setFilters(f => _objectSpread(_objectSpread({}, f), {}, {
      exclude: e.target.value
    })),
    placeholder: "No Mither",
    className: "cx-input w-full px-3 py-2 text-sm"
  }))))), showForm && React.createElement("div", null, React.createElement("h2", {
    className: "cx-sec"
  }, "Build form"), React.createElement(BuildForm, {
    draft: editing || undefined,
    onSave: upsertBuild,
    onCancel: () => {
      setShowForm(false);
      setEditing(null);
    },
    perks: perks,
    killers: killers,
    survivors: survivors,
    items: items,
    addons: addons,
    offerings: offerings
  })), React.createElement("h2", {
    className: "cx-sec"
  }, "Saved builds"), React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("tbody", null, filteredBuilds.map(build => {
    var _build$perks, _build$addons;
    return React.createElement("tr", {
      key: build.id
    }, React.createElement("th", {
      scope: "row"
    }, build.name), React.createElement("td", null, React.createElement("div", {
      className: "flex flex-wrap items-center gap-2 justify-between"
    }, React.createElement("div", {
      className: "flex items-center gap-2"
    }, React.createElement("span", {
      className: "cx-chip text-[10px] font-bold uppercase tracking-widest"
    }, build.role), build.characterName && React.createElement("span", {
      className: "text-xs text-zinc-400 font-semibold"
    }, build.characterName), build.favorite && React.createElement("span", {
      className: "text-zinc-200 text-sm"
    }, "*")), React.createElement("div", {
      className: "flex gap-2 text-[11px] text-zinc-500"
    }, build.updatedAt && React.createElement("span", null, "Updated ", formatDate(build.updatedAt)), build.createdAt && React.createElement("span", null, "Created ", formatDate(build.createdAt)))), React.createElement("div", {
      className: "mt-1 flex flex-wrap items-center gap-x-1 gap-y-1 text-xs"
    }, React.createElement("button", {
      type: "button",
      className: "cx-alink",
      onClick: () => {
        setEditing(build);
        setShowForm(true);
      }
    }, "Edit"), React.createElement("span", {
      style: {
        color: 'var(--text-faint)'
      }
    }, "\xB7"), React.createElement("button", {
      type: "button",
      className: "cx-alink",
      onClick: () => duplicateBuild(build)
    }, "Duplicate"), React.createElement("span", {
      style: {
        color: 'var(--text-faint)'
      }
    }, "\xB7"), React.createElement("button", {
      type: "button",
      className: "cx-alink",
      onClick: () => {
        var code = encodeBuild(build);
        if (code) {
          navigator.clipboard.writeText(code).then(() => alert('Build share text copied!')).catch(() => alert('Could not copy automatically. Please copy it manually.'));
        } else {
          alert('Could not prepare this build to share.');
        }
      }
    }, "Share"), React.createElement("span", {
      style: {
        color: 'var(--text-faint)'
      }
    }, "\xB7"), React.createElement("button", {
      type: "button",
      className: "cx-alink",
      onClick: () => toggleFavorite(build.id)
    }, build.favorite ? 'Unfavorite' : 'Favorite'), React.createElement("span", {
      style: {
        color: 'var(--text-faint)'
      }
    }, "\xB7"), React.createElement("button", {
      type: "button",
      className: "cx-alink",
      onClick: () => deleteBuild(build.id)
    }, "Delete")), React.createElement("div", {
      className: "mt-3 flex flex-wrap gap-2"
    }, (build.perks || []).map(p => React.createElement("span", {
      key: "".concat(build.id, "-").concat(p.id, "-").concat(p.name),
      className: "cx-chip text-[11px]"
    }, p.name)), ((_build$perks = build.perks) === null || _build$perks === void 0 ? void 0 : _build$perks.length) === 0 && React.createElement("span", {
      className: "text-[11px] text-zinc-500"
    }, "No perks selected")), React.createElement("div", {
      className: "mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[12px] text-zinc-400"
    }, build.item && React.createElement("p", null, React.createElement("span", {
      className: "text-zinc-500 uppercase tracking-wider text-[10px] mr-1"
    }, "Item"), build.item), ((_build$addons = build.addons) === null || _build$addons === void 0 ? void 0 : _build$addons.length) > 0 && React.createElement("p", null, React.createElement("span", {
      className: "text-zinc-500 uppercase tracking-wider text-[10px] mr-1"
    }, "Add-ons"), build.addons.join(', ')), build.offering && React.createElement("p", null, React.createElement("span", {
      className: "text-zinc-500 uppercase tracking-wider text-[10px] mr-1"
    }, "Offering"), build.offering)), React.createElement("div", {
      className: "mt-2 flex flex-wrap gap-2"
    }, (build.tags || []).map(tag => React.createElement("span", {
      key: tag,
      className: "cx-chip text-[10px] font-bold uppercase tracking-wider"
    }, tag))), build.notes && React.createElement("p", {
      className: "mt-2 text-sm text-zinc-300 leading-relaxed"
    }, build.notes)));
  }), filteredBuilds.length === 0 && React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Results"), React.createElement("td", null, React.createElement("div", {
    className: "text-center text-zinc-500"
  }, "No builds match the current filters."))))), (templates === null || templates === void 0 ? void 0 : templates.length) > 0 && React.createElement("div", {
    className: "mt-6"
  }, React.createElement("h2", {
    className: "cx-sec"
  }, "Templates / Presets"), React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("tbody", null, templates.map(tpl => React.createElement("tr", {
    key: tpl.title
  }, React.createElement("th", {
    scope: "row"
  }, tpl.title), React.createElement("td", null, React.createElement("div", {
    className: "flex items-center justify-between mb-1"
  }, React.createElement("span", {
    className: "cx-chip text-[10px] font-bold uppercase tracking-wider"
  }, tpl.role), React.createElement("span", {
    className: "text-[10px] text-zinc-500 uppercase font-bold"
  }, tpl.perks.length, " perks")), React.createElement("div", {
    className: "flex flex-wrap gap-1 mt-2"
  }, tpl.perks.map(p => React.createElement("span", {
    key: p,
    className: "cx-chip text-[11px]"
  }, p))), React.createElement("p", {
    className: "text-xs text-zinc-400 mt-2"
  }, tpl.note), React.createElement("button", {
    onClick: () => cloneTemplate(tpl),
    className: "cx-toolbtn mt-3 w-full py-2 text-sm font-bold"
  }, "Clone into Build"))))))));
};
var MatchLogView = _ref30 => {
  var _prefs$killerWinThres2;
  var {
    onBack,
    matches = [],
    setMatches,
    killers = [],
    survivors = [],
    builds = [],
    maps = [],
    prefs,
    setPrefs,
    onBuildUsed,
    onOpenAnalytics
  } = _ref30;
  var lookups = useMemo(() => buildDataLookups({
    killers,
    survivors,
    builds,
    maps
  }), [killers, survivors, builds, maps]);
  var blankForm = function blankForm() {
    var role = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : (prefs === null || prefs === void 0 ? void 0 : prefs.lastRole) || 'Survivor';
    return {
      id: null,
      role,
      date: new Date().toISOString().slice(0, 16),
      characterId: (prefs === null || prefs === void 0 ? void 0 : prefs.lastCharacterId) || '',
      buildId: (prefs === null || prefs === void 0 ? void 0 : prefs.lastBuildId) || '',
      mapId: '',
      mapNameSnapshot: '',
      outcome: role === 'Killer' ? '3 Kills' : 'Escaped Gate',
      kills: role === 'Killer' ? 3 : 0,
      performance: '',
      sweat: '',
      tilt: '',
      hooks: '',
      gens: '',
      notes: '',
      dc: false,
      perkSnapshots: []
    };
  };
  var [form, setForm] = useState(blankForm());
  var [editingId, setEditingId] = useState(null);
  var [filters, setFilters] = useState({
    role: 'All',
    character: 'All',
    build: 'All',
    map: 'All',
    from: '',
    to: ''
  });
  var characters = form.role === 'Killer' ? killers : survivors;
  var buildsForRole = useMemo(() => builds.filter(build => build.role === form.role), [builds, form.role]);
  var mapOptions = useMemo(() => {
    var known = (maps || []).map(map => ({
      value: map.id,
      label: map.name
    }));
    var legacy = [];
    var seen = new Set(known.map(option => option.label.toLowerCase()));
    matches.forEach(match => {
      var label = getMatchMapLabel(match);
      if (!label || seen.has(label.toLowerCase())) return;
      seen.add(label.toLowerCase());
      legacy.push({
        value: "legacy:".concat(label),
        label
      });
    });
    return [...known, ...legacy];
  }, [maps, matches]);
  var characterOptions = useMemo(() => {
    var seen = new Set();
    var result = [];
    [...killers, ...survivors].forEach(character => {
      if (!(character !== null && character !== void 0 && character.id) || seen.has(character.id)) return;
      seen.add(character.id);
      result.push({
        value: character.id,
        label: character.name
      });
    });
    matches.forEach(match => {
      var _match$characterSnaps6;
      var snapshotId = match === null || match === void 0 || (_match$characterSnaps6 = match.characterSnapshot) === null || _match$characterSnaps6 === void 0 ? void 0 : _match$characterSnaps6.id;
      var snapshotName = getMatchCharacterLabel(match);
      if (!snapshotId || !snapshotName || seen.has(snapshotId)) return;
      seen.add(snapshotId);
      result.push({
        value: snapshotId,
        label: snapshotName
      });
    });
    return result.sort((a, b) => a.label.localeCompare(b.label));
  }, [killers, survivors, matches]);
  var buildOptions = useMemo(() => {
    var seen = new Set();
    var result = [];
    builds.forEach(build => {
      if (!(build !== null && build !== void 0 && build.id) || seen.has(build.id)) return;
      seen.add(build.id);
      result.push({
        value: build.id,
        label: build.name
      });
    });
    matches.forEach(match => {
      var _match$buildSnapshot4;
      var snapshotId = match === null || match === void 0 || (_match$buildSnapshot4 = match.buildSnapshot) === null || _match$buildSnapshot4 === void 0 ? void 0 : _match$buildSnapshot4.id;
      var snapshotName = getMatchBuildLabel(match);
      if (!snapshotId || !snapshotName || seen.has(snapshotId)) return;
      seen.add(snapshotId);
      result.push({
        value: snapshotId,
        label: snapshotName
      });
    });
    return result.sort((a, b) => a.label.localeCompare(b.label));
  }, [builds, matches]);
  useEffect(() => {
    if (!editingId) {
      setForm(blankForm((prefs === null || prefs === void 0 ? void 0 : prefs.lastRole) || 'Survivor'));
    }
  }, [prefs === null || prefs === void 0 ? void 0 : prefs.lastRole, editingId]);
  var filteredMatches = useMemo(() => {
    return matches.filter(match => {
      var _match$buildSnapshot5, _match$characterSnaps7;
      var mapFilterValue = match.mapId || (getMatchMapLabel(match) ? "legacy:".concat(getMatchMapLabel(match)) : 'All');
      var buildFilterValue = ((_match$buildSnapshot5 = match.buildSnapshot) === null || _match$buildSnapshot5 === void 0 ? void 0 : _match$buildSnapshot5.id) || match.buildId || 'All';
      var characterFilterValue = ((_match$characterSnaps7 = match.characterSnapshot) === null || _match$characterSnaps7 === void 0 ? void 0 : _match$characterSnaps7.id) || match.characterId || 'All';
      var inRole = filters.role === 'All' || match.role === filters.role;
      var inChar = filters.character === 'All' || characterFilterValue === filters.character;
      var inBuild = filters.build === 'All' || buildFilterValue === filters.build;
      var inMap = filters.map === 'All' || mapFilterValue === filters.map;
      var inFrom = !filters.from || new Date(match.date) >= new Date(filters.from);
      var inTo = !filters.to || new Date(match.date) <= new Date(filters.to + 'T23:59');
      return inRole && inChar && inBuild && inMap && inFrom && inTo;
    });
  }, [matches, filters]);
  var changeRole = role => {
    setForm(current => _objectSpread(_objectSpread({}, blankForm(role)), {}, {
      date: current.date
    }));
  };
  var handleSubmit = () => {
    var now = new Date().toISOString();
    var payload = createMatchSnapshot(_objectSpread(_objectSpread({}, form), {}, {
      id: editingId || uuid(),
      createdAt: form.createdAt || now,
      updatedAt: now
    }), lookups);
    setMatches(prev => editingId ? prev.map(match => match.id === editingId ? payload : match) : [payload, ...prev]);
    setPrefs && setPrefs({
      lastRole: payload.role,
      lastCharacterId: payload.characterId,
      lastBuildId: payload.buildId || null
    });
    onBuildUsed && payload.buildId && onBuildUsed(payload.buildId);
    setEditingId(null);
    setForm(blankForm(payload.role));
  };
  var editMatch = match => {
    setEditingId(match.id);
    setForm(_objectSpread(_objectSpread(_objectSpread({}, blankForm(match.role)), match), {}, {
      mapId: match.mapId || '',
      mapNameSnapshot: match.mapNameSnapshot || match.map || '',
      perkSnapshots: normalizePerkSnapshots(match.perkSnapshots)
    }));
    setPrefs && setPrefs({
      lastRole: match.role,
      lastCharacterId: match.characterId,
      lastBuildId: match.buildId || null
    });
  };
  var deleteMatch = id => {
    if (!confirm('Delete this match?')) return;
    setMatches(prev => prev.filter(match => match.id !== id));
  };
  return React.createElement("div", {
    className: "flex flex-col h-full pt-6 pb-32 px-6 overflow-y-auto custom-scrollbar"
  }, React.createElement(ViewCrumbs, {
    trail: [{
      label: 'Main page',
      onClick: onBack
    }],
    current: "Match Log"
  }), React.createElement("h1", {
    className: "cx-title"
  }, "Match Log"), React.createElement("p", {
    className: "cx-hatnote"
  }, "Log games with saved build and map details."), React.createElement("h2", {
    className: "cx-sec"
  }, "Log match"), React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Role"), React.createElement("td", null, React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, React.createElement("button", {
    onClick: () => changeRole('Survivor'),
    className: "px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
    style: form.role === 'Survivor' ? {
      background: '#0a0a0a',
      border: '2px solid #fafafa',
      color: '#fafafa'
    } : {
      background: '#0a0a0a',
      border: '1px solid rgba(255,255,255,0.1)',
      color: '#a1a1aa'
    }
  }, "Survivor"), React.createElement("button", {
    onClick: () => changeRole('Killer'),
    className: "px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
    style: form.role === 'Killer' ? {
      background: '#0a0a0a',
      border: '2px solid #fafafa',
      color: '#fafafa'
    } : {
      background: '#0a0a0a',
      border: '1px solid rgba(255,255,255,0.1)',
      color: '#a1a1aa'
    }
  }, "Killer"), editingId && React.createElement("span", {
    className: "text-[11px] text-zinc-200 font-bold"
  }, "Editing existing match")))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Date/Time"), React.createElement("td", null, React.createElement("input", {
    type: "datetime-local",
    value: form.date,
    onChange: e => setForm(f => _objectSpread(_objectSpread({}, f), {}, {
      date: e.target.value
    })),
    className: "w-full bg-zinc-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
  }))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Character"), React.createElement("td", null, React.createElement("select", {
    value: form.characterId,
    onChange: e => setForm(f => _objectSpread(_objectSpread({}, f), {}, {
      characterId: e.target.value
    })),
    className: "themed-select w-full text-sm"
  }, React.createElement("option", {
    value: ""
  }, "Any"), characters.map(character => React.createElement("option", {
    key: character.id,
    value: character.id
  }, character.name))))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Build"), React.createElement("td", null, React.createElement("select", {
    value: form.buildId || '',
    onChange: e => setForm(f => _objectSpread(_objectSpread({}, f), {}, {
      buildId: e.target.value
    })),
    className: "themed-select w-full text-sm"
  }, React.createElement("option", {
    value: ""
  }, "Unlinked"), buildsForRole.map(build => React.createElement("option", {
    key: build.id,
    value: build.id
  }, build.name))))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Map"), React.createElement("td", null, React.createElement("select", {
    value: form.mapId || '',
    onChange: e => setForm(f => _objectSpread(_objectSpread({}, f), {}, {
      mapId: e.target.value
    })),
    className: "themed-select w-full text-sm"
  }, React.createElement("option", {
    value: ""
  }, "Unknown / not set"), (maps || []).map(map => React.createElement("option", {
    key: map.id,
    value: map.id
  }, map.name))))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Outcome"), React.createElement("td", null, React.createElement("select", {
    value: form.outcome,
    onChange: e => setForm(f => _objectSpread(_objectSpread({}, f), {}, {
      outcome: e.target.value
    })),
    className: "themed-select w-full text-sm"
  }, form.role === 'Killer' ? ['0 Kills', '1 Kill', '2 Kills', '3 Kills', '4 Kills', 'DC', 'Early Surrender'].map(option => React.createElement("option", {
    key: option,
    value: option
  }, option)) : ['Escaped Gate', 'Escaped Hatch', 'Died', 'DC'].map(option => React.createElement("option", {
    key: option,
    value: option
  }, option))))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Kills / Extra"), React.createElement("td", null, React.createElement("input", {
    type: "number",
    min: "0",
    max: "4",
    value: form.kills,
    onChange: e => setForm(f => _objectSpread(_objectSpread({}, f), {}, {
      kills: Number(e.target.value)
    })),
    className: "w-full bg-zinc-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
  }), React.createElement("label", {
    className: "mt-1 inline-flex items-center gap-2 text-[12px] text-zinc-400"
  }, React.createElement("input", {
    type: "checkbox",
    checked: form.dc,
    onChange: e => setForm(f => _objectSpread(_objectSpread({}, f), {}, {
      dc: e.target.checked
    }))
  }), " DC / early quit"))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Self Perf"), React.createElement("td", null, React.createElement("input", {
    type: "number",
    min: "0",
    max: "10",
    value: form.performance,
    onChange: e => setForm(f => _objectSpread(_objectSpread({}, f), {}, {
      performance: e.target.value
    })),
    className: "w-full bg-zinc-800/60 border border-white/10 rounded-xl px-2 py-1 text-xs text-white"
  }))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Sweat"), React.createElement("td", null, React.createElement("input", {
    type: "number",
    min: "0",
    max: "10",
    value: form.sweat,
    onChange: e => setForm(f => _objectSpread(_objectSpread({}, f), {}, {
      sweat: e.target.value
    })),
    className: "w-full bg-zinc-800/60 border border-white/10 rounded-xl px-2 py-1 text-xs text-white"
  }))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Tilt"), React.createElement("td", null, React.createElement("input", {
    type: "number",
    min: "0",
    max: "10",
    value: form.tilt,
    onChange: e => setForm(f => _objectSpread(_objectSpread({}, f), {}, {
      tilt: e.target.value
    })),
    className: "w-full bg-zinc-800/60 border border-white/10 rounded-xl px-2 py-1 text-xs text-white"
  }))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Hooks"), React.createElement("td", null, React.createElement("input", {
    type: "number",
    value: form.hooks,
    onChange: e => setForm(f => _objectSpread(_objectSpread({}, f), {}, {
      hooks: e.target.value
    })),
    className: "w-full bg-zinc-800/60 border border-white/10 rounded-xl px-2 py-1 text-xs text-white"
  }))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Gens Done"), React.createElement("td", null, React.createElement("input", {
    type: "number",
    value: form.gens,
    onChange: e => setForm(f => _objectSpread(_objectSpread({}, f), {}, {
      gens: e.target.value
    })),
    className: "w-full bg-zinc-800/60 border border-white/10 rounded-xl px-2 py-1 text-xs text-white"
  }))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Notes"), React.createElement("td", null, React.createElement("textarea", {
    value: form.notes,
    onChange: e => setForm(f => _objectSpread(_objectSpread({}, f), {}, {
      notes: e.target.value
    })),
    rows: 2,
    className: "w-full bg-zinc-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500",
    placeholder: "What went well? What to change?"
  }))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Save"), React.createElement("td", null, React.createElement("div", {
    className: "flex justify-end gap-2"
  }, React.createElement("button", {
    onClick: () => {
      setForm(blankForm(form.role));
      setEditingId(null);
    },
    className: "px-4 py-2 rounded-xl text-sm font-bold bg-white/5 text-zinc-300 border border-white/10"
  }, "Reset"), React.createElement("button", {
    onClick: handleSubmit,
    className: "px-4 py-2 rounded-xl text-sm font-bold bg-zinc-100 text-black shadow-lg"
  }, editingId ? 'Update Match' : 'Save Match')))))), React.createElement("h2", {
    className: "cx-sec"
  }, "History filters"), React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Role"), React.createElement("td", null, React.createElement("select", {
    value: filters.role,
    onChange: e => setFilters(f => _objectSpread(_objectSpread({}, f), {}, {
      role: e.target.value
    })),
    className: "themed-select w-full text-sm"
  }, React.createElement("option", {
    value: "All"
  }, "All roles"), React.createElement("option", {
    value: "Killer"
  }, "Killer"), React.createElement("option", {
    value: "Survivor"
  }, "Survivor")))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Character"), React.createElement("td", null, React.createElement("select", {
    value: filters.character,
    onChange: e => setFilters(f => _objectSpread(_objectSpread({}, f), {}, {
      character: e.target.value
    })),
    className: "themed-select w-full text-sm"
  }, React.createElement("option", {
    value: "All"
  }, "Any character"), characterOptions.map(option => React.createElement("option", {
    key: option.value,
    value: option.value
  }, option.label))))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Build"), React.createElement("td", null, React.createElement("select", {
    value: filters.build,
    onChange: e => setFilters(f => _objectSpread(_objectSpread({}, f), {}, {
      build: e.target.value
    })),
    className: "themed-select w-full text-sm"
  }, React.createElement("option", {
    value: "All"
  }, "Any build"), buildOptions.map(option => React.createElement("option", {
    key: option.value,
    value: option.value
  }, option.label))))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Map"), React.createElement("td", null, React.createElement("select", {
    value: filters.map,
    onChange: e => setFilters(f => _objectSpread(_objectSpread({}, f), {}, {
      map: e.target.value
    })),
    className: "themed-select w-full text-sm"
  }, React.createElement("option", {
    value: "All"
  }, "Any map"), mapOptions.map(option => React.createElement("option", {
    key: option.value,
    value: option.value
  }, option.label))))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "From"), React.createElement("td", null, React.createElement("input", {
    type: "date",
    value: filters.from,
    onChange: e => setFilters(f => _objectSpread(_objectSpread({}, f), {}, {
      from: e.target.value
    })),
    className: "w-full bg-zinc-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
  }))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "To"), React.createElement("td", null, React.createElement("input", {
    type: "date",
    value: filters.to,
    onChange: e => setFilters(f => _objectSpread(_objectSpread({}, f), {}, {
      to: e.target.value
    })),
    className: "w-full bg-zinc-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
  }))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Win Definition - Killer"), React.createElement("td", null, React.createElement("div", {
    className: "flex items-center gap-2"
  }, React.createElement("span", {
    className: "text-[11px] text-zinc-400 w-14"
  }, "Killer:"), React.createElement("select", {
    value: (_prefs$killerWinThres2 = prefs === null || prefs === void 0 ? void 0 : prefs.killerWinThreshold) !== null && _prefs$killerWinThres2 !== void 0 ? _prefs$killerWinThres2 : 2,
    onChange: e => setPrefs && setPrefs(p => _objectSpread(_objectSpread({}, p), {}, {
      killerWinThreshold: Number(e.target.value)
    })),
    className: "themed-select text-xs py-1 px-3 min-w-[100px]"
  }, React.createElement("option", {
    value: 0
  }, "0+ kills"), React.createElement("option", {
    value: 1
  }, "1+ kills"), React.createElement("option", {
    value: 2
  }, "2+ kills"), React.createElement("option", {
    value: 3
  }, "3+ kills"), React.createElement("option", {
    value: 4
  }, "4 kills"))), React.createElement("p", {
    className: "text-[9px] text-zinc-600 mt-1"
  }, "Survivor: Escaped = Win"))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Analytics"), React.createElement("td", null, React.createElement("button", {
    onClick: onOpenAnalytics,
    className: "w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-zinc-200 hover:bg-white/10 transition-colors"
  }, "Open Progression Analytics"), React.createElement("div", {
    className: "text-xs text-zinc-400 mt-2"
  }, "Showing ", filteredMatches.length, " / ", matches.length, " logged matches."))))), React.createElement("h2", {
    className: "cx-sec"
  }, "Logged matches (", filteredMatches.length, " entries)"), React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("tbody", null, filteredMatches.map(match => {
    var _match$buildSnapshot6, _match$perkSnapshots;
    return React.createElement("tr", {
      key: match.id
    }, React.createElement("th", {
      scope: "row"
    }, getMatchCharacterLabel(match)), React.createElement("td", null, React.createElement("div", {
      className: "flex flex-col gap-1"
    }, React.createElement("div", {
      className: "flex flex-wrap justify-between gap-2 items-center"
    }, React.createElement("div", {
      className: "flex items-center gap-2 flex-wrap"
    }, React.createElement("span", {
      className: "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ".concat(match.role === 'Killer' ? 'bg-white/10 text-zinc-100' : 'bg-white/5 text-zinc-300')
    }, match.role), React.createElement("span", {
      className: "text-white font-semibold text-sm"
    }, getMatchCharacterLabel(match)), (((_match$buildSnapshot6 = match.buildSnapshot) === null || _match$buildSnapshot6 === void 0 ? void 0 : _match$buildSnapshot6.name) || match.buildId) && React.createElement("span", {
      className: "text-[11px] text-zinc-400"
    }, "- ", getMatchBuildLabel(match))), React.createElement("div", {
      className: "flex gap-2 text-[11px] text-zinc-400"
    }, React.createElement("button", {
      onClick: () => editMatch(match),
      className: "px-2 py-1 rounded-lg bg-white/5 border border-white/10"
    }, "Edit"), React.createElement("button", {
      onClick: () => deleteMatch(match.id),
      className: "px-2 py-1 rounded-lg bg-white/10 border border-white/25 text-zinc-100"
    }, "Delete"))), React.createElement("div", {
      className: "text-xs text-zinc-500 flex flex-wrap gap-2"
    }, React.createElement("span", null, formatDate(match.date)), React.createElement("span", null, "- Map ", getMatchMapLabel(match)), React.createElement("span", null, "- Outcome ", match.outcome), React.createElement("span", null, "- Kills ", match.kills), match.performance && React.createElement("span", null, "- Self ", match.performance), match.sweat && React.createElement("span", null, "- Sweat ", match.sweat), match.tilt && React.createElement("span", null, "- Tilt ", match.tilt), match.dc && React.createElement("span", {
      className: "text-zinc-400"
    }, "- DC")), ((_match$perkSnapshots = match.perkSnapshots) === null || _match$perkSnapshots === void 0 ? void 0 : _match$perkSnapshots.length) > 0 && React.createElement("div", {
      className: "flex flex-wrap gap-1 mt-1"
    }, match.perkSnapshots.map(perk => React.createElement("span", {
      key: "".concat(match.id, "-").concat(perk.id || perk.name),
      className: "px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] text-zinc-300"
    }, perk.name))), match.notes && React.createElement("p", {
      className: "text-sm text-zinc-300"
    }, match.notes))));
  }), filteredMatches.length === 0 && React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Results"), React.createElement("td", null, React.createElement("div", {
    className: "text-center text-zinc-500 py-6"
  }, "No matches logged yet."))))));
};
var ANALYTICS_FILTER_DEFAULTS = {
  role: 'All',
  character: 'All',
  build: 'All',
  map: 'All',
  from: '',
  to: ''
};
var summarizeMatchesBy = (list, prefs, getKey, getLabel) => {
  var bucket = {};
  list.forEach(match => {
    var key = getKey(match);
    var label = getLabel(match);
    if (!key || !label) return;
    var entry = bucket[key] || {
      key,
      label,
      total: 0,
      wins: 0,
      perf: 0,
      last: null
    };
    entry.total += 1;
    entry.wins += isMatchWin(match, prefs) ? 1 : 0;
    entry.perf += Number(match.performance) || 0;
    entry.last = entry.last && new Date(entry.last) > new Date(match.date) ? entry.last : match.date;
    bucket[key] = entry;
  });
  return Object.values(bucket).map(entry => {
    var avgPerfValue = entry.total ? entry.perf / entry.total : 0;
    return _objectSpread(_objectSpread({}, entry), {}, {
      rate: entry.total ? Math.round(entry.wins / entry.total * 100) : 0,
      avgPerfValue,
      avgPerf: entry.total ? avgPerfValue.toFixed(1) : '-'
    });
  });
};
var summarizePerksAcrossMatches = (list, prefs) => {
  var bucket = {};
  list.forEach(match => {
    normalizePerkSnapshots(match.perkSnapshots).forEach(perk => {
      var key = perk.id || perk.name;
      if (!key) return;
      var entry = bucket[key] || {
        key,
        label: perk.name,
        total: 0,
        wins: 0,
        perf: 0,
        last: null,
        owner: perk.owner || '',
        type: perk.type || ''
      };
      entry.total += 1;
      entry.wins += isMatchWin(match, prefs) ? 1 : 0;
      entry.perf += Number(match.performance) || 0;
      entry.last = entry.last && new Date(entry.last) > new Date(match.date) ? entry.last : match.date;
      bucket[key] = entry;
    });
  });
  return Object.values(bucket).map(entry => {
    var avgPerfValue = entry.total ? entry.perf / entry.total : 0;
    return _objectSpread(_objectSpread({}, entry), {}, {
      rate: entry.total ? Math.round(entry.wins / entry.total * 100) : 0,
      avgPerfValue,
      avgPerf: entry.total ? avgPerfValue.toFixed(1) : '-'
    });
  });
};
var MatchAnalyticsPanel = _ref31 => {
  var {
    matches = [],
    prefs = {},
    killers = [],
    survivors = [],
    builds = [],
    maps = [],
    onOpenMatches
  } = _ref31;
  var [filters, setFilters] = useState(ANALYTICS_FILTER_DEFAULTS);
  var characterOptions = useMemo(() => {
    var seen = new Set();
    var options = [];
    [...killers, ...survivors].forEach(character => {
      if (!(character !== null && character !== void 0 && character.id) || seen.has(character.id)) return;
      seen.add(character.id);
      options.push({
        value: character.id,
        label: character.name
      });
    });
    matches.forEach(match => {
      var _match$characterSnaps8;
      var snapshotId = match === null || match === void 0 || (_match$characterSnaps8 = match.characterSnapshot) === null || _match$characterSnaps8 === void 0 ? void 0 : _match$characterSnaps8.id;
      var snapshotName = getMatchCharacterLabel(match);
      if (!snapshotId || !snapshotName || seen.has(snapshotId)) return;
      seen.add(snapshotId);
      options.push({
        value: snapshotId,
        label: snapshotName
      });
    });
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [killers, survivors, matches]);
  var buildOptions = useMemo(() => {
    var seen = new Set();
    var options = [];
    builds.forEach(build => {
      if (!(build !== null && build !== void 0 && build.id) || seen.has(build.id)) return;
      seen.add(build.id);
      options.push({
        value: build.id,
        label: build.name
      });
    });
    matches.forEach(match => {
      var _match$buildSnapshot7;
      var snapshotId = match === null || match === void 0 || (_match$buildSnapshot7 = match.buildSnapshot) === null || _match$buildSnapshot7 === void 0 ? void 0 : _match$buildSnapshot7.id;
      var snapshotName = getMatchBuildLabel(match);
      if (!snapshotId || !snapshotName || seen.has(snapshotId)) return;
      seen.add(snapshotId);
      options.push({
        value: snapshotId,
        label: snapshotName
      });
    });
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [builds, matches]);
  var mapOptions = useMemo(() => {
    var known = (maps || []).map(map => ({
      value: map.id,
      label: map.name
    }));
    var legacy = [];
    var seen = new Set(known.map(option => option.label.toLowerCase()));
    matches.forEach(match => {
      var label = getMatchMapLabel(match);
      if (!label || seen.has(label.toLowerCase())) return;
      seen.add(label.toLowerCase());
      legacy.push({
        value: "legacy:".concat(label),
        label
      });
    });
    return [...known, ...legacy];
  }, [maps, matches]);
  var filteredMatches = useMemo(() => {
    return matches.filter(match => {
      var _match$buildSnapshot8, _match$characterSnaps9;
      var mapFilterValue = match.mapId || (getMatchMapLabel(match) ? "legacy:".concat(getMatchMapLabel(match)) : 'All');
      var buildFilterValue = ((_match$buildSnapshot8 = match.buildSnapshot) === null || _match$buildSnapshot8 === void 0 ? void 0 : _match$buildSnapshot8.id) || match.buildId || 'All';
      var characterFilterValue = ((_match$characterSnaps9 = match.characterSnapshot) === null || _match$characterSnaps9 === void 0 ? void 0 : _match$characterSnaps9.id) || match.characterId || 'All';
      var inRole = filters.role === 'All' || match.role === filters.role;
      var inChar = filters.character === 'All' || characterFilterValue === filters.character;
      var inBuild = filters.build === 'All' || buildFilterValue === filters.build;
      var inMap = filters.map === 'All' || mapFilterValue === filters.map;
      var inFrom = !filters.from || new Date(match.date) >= new Date(filters.from);
      var inTo = !filters.to || new Date(match.date) <= new Date(filters.to + 'T23:59');
      return inRole && inChar && inBuild && inMap && inFrom && inTo;
    });
  }, [matches, filters]);
  var killerMatches = filteredMatches.filter(match => match.role === 'Killer');
  var survivorMatches = filteredMatches.filter(match => match.role === 'Survivor');
  var totalWins = filteredMatches.filter(match => isMatchWin(match, prefs)).length;
  var overallWinRate = filteredMatches.length ? Math.round(totalWins / filteredMatches.length * 100) : 0;
  var survivorWinRate = survivorMatches.length ? Math.round(survivorMatches.filter(match => isMatchWin(match, prefs)).length / survivorMatches.length * 100) : 0;
  var killerWinRate = killerMatches.length ? Math.round(killerMatches.filter(match => isMatchWin(match, prefs)).length / killerMatches.length * 100) : 0;
  var perkSnapshotMatches = filteredMatches.filter(match => normalizePerkSnapshots(match.perkSnapshots).length > 0).length;
  var killerStats = summarizeMatchesBy(killerMatches, prefs, match => {
    var _match$characterSnaps10;
    return ((_match$characterSnaps10 = match.characterSnapshot) === null || _match$characterSnaps10 === void 0 ? void 0 : _match$characterSnaps10.id) || match.characterId || getMatchCharacterLabel(match);
  }, getMatchCharacterLabel);
  var survivorStats = summarizeMatchesBy(survivorMatches, prefs, match => {
    var _match$characterSnaps11;
    return ((_match$characterSnaps11 = match.characterSnapshot) === null || _match$characterSnaps11 === void 0 ? void 0 : _match$characterSnaps11.id) || match.characterId || getMatchCharacterLabel(match);
  }, getMatchCharacterLabel);
  var buildStats = summarizeMatchesBy(filteredMatches.filter(match => {
    var _match$buildSnapshot9;
    return ((_match$buildSnapshot9 = match.buildSnapshot) === null || _match$buildSnapshot9 === void 0 ? void 0 : _match$buildSnapshot9.name) || match.buildId;
  }), prefs, match => {
    var _match$buildSnapshot10;
    return ((_match$buildSnapshot10 = match.buildSnapshot) === null || _match$buildSnapshot10 === void 0 ? void 0 : _match$buildSnapshot10.id) || match.buildId || getMatchBuildLabel(match);
  }, getMatchBuildLabel);
  var mapStats = summarizeMatchesBy(filteredMatches, prefs, match => match.mapId || getMatchMapLabel(match), getMatchMapLabel);
  var perkStats = summarizePerksAcrossMatches(filteredMatches, prefs);
  var sortRows = rows => rows.slice().sort((a, b) => b.rate - a.rate || b.total - a.total || b.avgPerfValue - a.avgPerfValue).slice(0, 8);
  var AnalyticsBoard = _ref32 => {
    var {
      title,
      rows,
      empty,
      subtitle
    } = _ref32;
    return React.createElement("div", {
      className: "p-4 rounded-3xl bg-zinc-900/50 border border-white/10"
    }, React.createElement("div", {
      className: "flex items-baseline justify-between gap-3 mb-2"
    }, React.createElement("p", {
      className: "text-xs uppercase font-bold text-zinc-500"
    }, title), subtitle && React.createElement("span", {
      className: "text-[10px] text-zinc-600 uppercase tracking-wider"
    }, subtitle)), rows.length === 0 && React.createElement("p", {
      className: "text-zinc-500 text-sm"
    }, empty), React.createElement("div", {
      className: "space-y-2 max-h-72 overflow-y-auto custom-scrollbar"
    }, sortRows(rows).map(row => React.createElement("div", {
      key: row.key,
      className: "p-2 rounded-xl bg-white/5 border border-white/10"
    }, React.createElement("div", {
      className: "flex justify-between text-sm text-white font-semibold mb-1 gap-2"
    }, React.createElement("span", {
      className: "truncate"
    }, row.label), React.createElement("span", {
      style: {
        color: row.rate >= 50 ? '#4ade80' : '#f87171'
      }
    }, row.rate, "%")), React.createElement("div", {
      className: "h-1.5 rounded-full bg-zinc-800 overflow-hidden mb-1"
    }, React.createElement("div", {
      className: "h-full rounded-full transition-all",
      style: {
        width: "".concat(row.rate, "%"),
        background: row.rate >= 50 ? '#fafafa' : '#52525b'
      }
    })), React.createElement("p", {
      className: "text-[10px] text-zinc-500"
    }, row.total, " matches \xB7 Avg self score ", row.avgPerf), (row.owner || row.type) && React.createElement("p", {
      className: "text-[10px] text-zinc-600 mt-1"
    }, [row.type, row.owner].filter(Boolean).join(' · '))))));
  };
  return React.createElement("div", {
    className: "space-y-4"
  }, React.createElement("div", {
    className: "p-4 rounded-3xl bg-zinc-900/60 border border-white/10"
  }, React.createElement("div", {
    className: "flex items-center justify-between gap-3 mb-3 flex-wrap"
  }, React.createElement("p", {
    className: "text-xs text-zinc-400 font-bold uppercase tracking-wider"
  }, "Analytics Filters"), React.createElement("button", {
    onClick: onOpenMatches,
    className: "px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-zinc-200 hover:bg-white/10 transition-colors"
  }, "Open Match Log")), React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-3 gap-3"
  }, React.createElement("select", {
    value: filters.role,
    onChange: e => setFilters(current => _objectSpread(_objectSpread({}, current), {}, {
      role: e.target.value
    })),
    className: "themed-select w-full text-sm"
  }, React.createElement("option", {
    value: "All"
  }, "All roles"), React.createElement("option", {
    value: "Killer"
  }, "Killer"), React.createElement("option", {
    value: "Survivor"
  }, "Survivor")), React.createElement("select", {
    value: filters.character,
    onChange: e => setFilters(current => _objectSpread(_objectSpread({}, current), {}, {
      character: e.target.value
    })),
    className: "themed-select w-full text-sm"
  }, React.createElement("option", {
    value: "All"
  }, "Any character"), characterOptions.map(option => React.createElement("option", {
    key: option.value,
    value: option.value
  }, option.label))), React.createElement("select", {
    value: filters.build,
    onChange: e => setFilters(current => _objectSpread(_objectSpread({}, current), {}, {
      build: e.target.value
    })),
    className: "themed-select w-full text-sm"
  }, React.createElement("option", {
    value: "All"
  }, "Any build"), buildOptions.map(option => React.createElement("option", {
    key: option.value,
    value: option.value
  }, option.label))), React.createElement("select", {
    value: filters.map,
    onChange: e => setFilters(current => _objectSpread(_objectSpread({}, current), {}, {
      map: e.target.value
    })),
    className: "themed-select w-full text-sm"
  }, React.createElement("option", {
    value: "All"
  }, "Any map"), mapOptions.map(option => React.createElement("option", {
    key: option.value,
    value: option.value
  }, option.label))), React.createElement("input", {
    type: "date",
    value: filters.from,
    onChange: e => setFilters(current => _objectSpread(_objectSpread({}, current), {}, {
      from: e.target.value
    })),
    className: "w-full bg-zinc-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
  }), React.createElement("input", {
    type: "date",
    value: filters.to,
    onChange: e => setFilters(current => _objectSpread(_objectSpread({}, current), {}, {
      to: e.target.value
    })),
    className: "w-full bg-zinc-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
  }))), React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-5 gap-3"
  }, [{
    label: 'Filtered Matches',
    value: filteredMatches.length,
    color: '#f4f4f5'
  }, {
    label: 'Overall Win Rate',
    value: "".concat(overallWinRate, "%"),
    color: overallWinRate >= 50 ? '#fafafa' : '#a1a1aa'
  }, {
    label: 'Survivor Win Rate',
    value: "".concat(survivorWinRate, "%"),
    color: '#a1a1aa'
  }, {
    label: 'Killer Win Rate',
    value: "".concat(killerWinRate, "%"),
    color: '#fafafa'
  }, {
    label: 'Perk Coverage',
    value: "".concat(perkSnapshotMatches, "/").concat(filteredMatches.length || 0),
    color: 'var(--rar-rare)'
  }].map(card => React.createElement("div", {
    key: card.label,
    className: "p-4 rounded-2xl bg-zinc-900/60 border border-white/10 text-center"
  }, React.createElement("p", {
    className: "text-2xl font-bold",
    style: {
      color: card.color
    }
  }, card.value), React.createElement("p", {
    className: "text-[10px] uppercase tracking-wider text-zinc-500 font-bold mt-1"
  }, card.label)))), React.createElement("div", {
    className: "grid grid-cols-1 lg:grid-cols-2 gap-3"
  }, React.createElement(AnalyticsBoard, {
    title: "Killer Performance",
    rows: killerStats,
    empty: "No killer-side matches in the current filter."
  }), React.createElement(AnalyticsBoard, {
    title: "Survivor Performance",
    rows: survivorStats,
    empty: "No survivor-side matches in the current filter."
  }), React.createElement(AnalyticsBoard, {
    title: "Build Performance",
    rows: buildStats,
    empty: "No linked saved builds in the current filter."
  }), React.createElement(AnalyticsBoard, {
    title: "Map Performance",
    rows: mapStats,
    empty: "No map history in the current filter.",
    subtitle: "Saved history"
  }), React.createElement("div", {
    className: "lg:col-span-2"
  }, React.createElement(AnalyticsBoard, {
    title: "Perk Performance",
    rows: perkStats,
    empty: "No perk history yet. Link a build when logging matches to populate this.",
    subtitle: "Based on saved loadouts"
  }))));
};
var WorldleView = _ref33 => {
  var _WORLDLE_MODE_META$mo, _worldleState$daily, _worldleState$practic, _worldleState$stats, _worldleState$history;
  var {
    onBack,
    killers = [],
    perks = [],
    worldleState,
    setWorldleState,
    isCompactLayout = false
  } = _ref33;
  var [mode, setMode] = useState('classic');
  var [queueType, setQueueType] = useState('daily');
  var [guessInput, setGuessInput] = useState('');
  var guessInputRef = useRef(null);
  var [inputError, setInputError] = useState('');
  var [inputNotice, setInputNotice] = useState('');
  var [inputSuggestions, setInputSuggestions] = useState([]);
  var todayKey = getWorldleDateKey();
  var killerCatalog = useMemo(() => buildWorldleKillerCatalog(killers).sort((a, b) => a.name.localeCompare(b.name)), [killers]);
  var emojiVariantCatalog = useMemo(() => buildWorldleEmojiVariantCatalog(killerCatalog), [killerCatalog]);
  var emojiVariantsById = useMemo(() => Object.fromEntries(emojiVariantCatalog.map(entry => [entry.variantId, entry])), [emojiVariantCatalog]);
  var survivorPerkCatalog = useMemo(() => buildWorldlePerkCatalog(perks, 'Survivor').sort((a, b) => a.name.localeCompare(b.name)), [perks]);
  var killerPerkCatalog = useMemo(() => buildWorldlePerkCatalog(perks, 'Killer').sort((a, b) => a.name.localeCompare(b.name)), [perks]);
  var teachableCatalog = useMemo(() => buildTeachableCatalog(killers, perks).sort((a, b) => a.name.localeCompare(b.name)), [killers, perks]);
  var practiceEnabled = ((_WORLDLE_MODE_META$mo = WORLDLE_MODE_META[mode]) === null || _WORLDLE_MODE_META$mo === void 0 ? void 0 : _WORLDLE_MODE_META$mo.queue) === 'flex';
  var activeQueue = practiceEnabled ? queueType : 'daily';
  var activeCatalog = useMemo(() => {
    if (mode === 'classic' || mode === 'emoji') return killerCatalog;
    if (mode === 'survivorPerk') return survivorPerkCatalog;
    if (mode === 'killerPerk') return killerPerkCatalog;
    if (mode === 'teachables') return teachableCatalog;
    return [];
  }, [mode, killerCatalog, survivorPerkCatalog, killerPerkCatalog, teachableCatalog]);
  var storedSession = activeQueue === 'daily' ? worldleState === null || worldleState === void 0 || (_worldleState$daily = worldleState.daily) === null || _worldleState$daily === void 0 ? void 0 : _worldleState$daily[mode] : worldleState === null || worldleState === void 0 || (_worldleState$practic = worldleState.practice) === null || _worldleState$practic === void 0 ? void 0 : _worldleState$practic[mode];
  var session = useMemo(() => {
    var hasEmojiVariant = mode !== 'emoji' || (storedSession === null || storedSession === void 0 ? void 0 : storedSession.emojiVariantId) && Array.isArray(storedSession === null || storedSession === void 0 ? void 0 : storedSession.emojiDisplay) && storedSession.emojiDisplay.length === 3;
    if (activeQueue === 'daily' && storedSession && storedSession.dateKey === todayKey && storedSession.targetId && hasEmojiVariant) return storedSession;
    if (activeQueue === 'practice' && storedSession && storedSession.targetId && hasEmojiVariant) return storedSession;
    return activeQueue === 'daily' ? createDailyWorldleSession(mode, activeCatalog, todayKey, {
      emojiVariantsById
    }) : createPracticeWorldleSession(mode, activeCatalog, todayKey, 0, {
      emojiVariants: emojiVariantCatalog,
      emojiVariantsById
    });
  }, [activeQueue, storedSession, todayKey, mode, activeCatalog, emojiVariantCatalog, emojiVariantsById]);
  var isPhoneLayout = Boolean(isCompactLayout);
  var practiceRoundLabel = Math.max(1, Number(session === null || session === void 0 ? void 0 : session.round) || 1);
  var compactPuzzleBadge = useMemo(() => {
    if (activeQueue === 'practice') return "Run ".concat(practiceRoundLabel);
    var parsed = new Date("".concat(todayKey, "T12:00:00"));
    var badgeDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(badgeDate);
  }, [activeQueue, todayKey, practiceRoundLabel]);
  var target = useMemo(() => {
    if (mode === 'emoji' && session !== null && session !== void 0 && session.emojiVariantId && emojiVariantsById[session.emojiVariantId]) {
      var variant = emojiVariantsById[session.emojiVariantId];
      return activeCatalog.find(entry => entry.id === variant.targetId) || null;
    }
    return activeCatalog.find(entry => entry.id === (session === null || session === void 0 ? void 0 : session.targetId)) || (activeQueue === 'daily' ? pickDeterministicEntry(activeCatalog, "".concat(mode, ":").concat(todayKey)) : activeCatalog.find(entry => {
      var _session$queue;
      return entry.id === (session === null || session === void 0 || (_session$queue = session.queue) === null || _session$queue === void 0 ? void 0 : _session$queue[0]);
    })) || null;
  }, [activeCatalog, session, activeQueue, mode, todayKey, emojiVariantsById]);
  var activeEmojiVariant = useMemo(() => {
    if (mode !== 'emoji') return null;
    return resolveWorldleEmojiVariantFromSession({
      target,
      session,
      variantsById: emojiVariantsById
    });
  }, [mode, target, session, emojiVariantsById]);
  var solvedIds = Array.isArray(session === null || session === void 0 ? void 0 : session.solvedIds) ? session.solvedIds : [];
  var wrongGuesses = countWorldleWrongGuesses(session);
  var guessCount = Array.isArray(session === null || session === void 0 ? void 0 : session.guesses) ? session.guesses.filter(guess => guess && guess.duplicate !== true).length : 0;
  var isFinished = (session === null || session === void 0 ? void 0 : session.solved) || (session === null || session === void 0 ? void 0 : session.failed);
  var statsBucket = (worldleState === null || worldleState === void 0 || (_worldleState$stats = worldleState.stats) === null || _worldleState$stats === void 0 || (_worldleState$stats = _worldleState$stats[mode]) === null || _worldleState$stats === void 0 ? void 0 : _worldleState$stats[activeQueue]) || createWorldleStatsBucket();
  var historyRows = (worldleState === null || worldleState === void 0 || (_worldleState$history = worldleState.history) === null || _worldleState$history === void 0 || (_worldleState$history = _worldleState$history[mode]) === null || _worldleState$history === void 0 ? void 0 : _worldleState$history[activeQueue]) || [];
  useEffect(() => {
    setGuessInput('');
    setInputError('');
    setInputNotice('');
    setInputSuggestions([]);
  }, [mode, activeQueue]);
  var persistSession = (next, nextSession) => {
    if (activeQueue === 'daily') {
      next.daily[mode] = nextSession;
    } else {
      next.practice[mode] = nextSession;
    }
    return next;
  };
  var hydrateSession = prev => ensureWorldleSession({
    state: prev,
    mode,
    queue: activeQueue,
    catalog: activeCatalog,
    dateKey: todayKey,
    options: {
      emojiVariants: emojiVariantCatalog,
      emojiVariantsById
    }
  });
  var setDuplicateError = label => {
    setInputError("".concat(label, " was already tried."));
  };
  var clearInputFeedback = () => {
    setInputError('');
    setInputNotice('');
    setInputSuggestions([]);
  };
  var normalizeGuessFeedbackInput = function normalizeGuessFeedbackInput() {
    var value = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
    return String(value || '').trim().toLowerCase();
  };
  var getActiveGuessInput = () => {
    var liveValue = guessInputRef.current && typeof guessInputRef.current.value === 'string' ? guessInputRef.current.value : guessInput;
    return String(liveValue || '');
  };
  var handleGuessSubmit = function handleGuessSubmit() {
    var overrideGuess = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    var rawGuess = String(overrideGuess !== null && overrideGuess !== void 0 ? overrideGuess : getActiveGuessInput()).trim();
    if (!rawGuess || !target || !session || session.solved || session.failed) return;
    var entityLabel = getWorldleGuessEntityLabel(mode);
    if (mode === 'teachables') {
      var _attempt = resolveWorldleGuessAttempt(killerPerkCatalog, rawGuess);
      if (!_attempt.entry) {
        setInputNotice('');
        setInputSuggestions(_attempt.suggestions);
        setInputError(_attempt.suggestions.length ? "Unknown ".concat(entityLabel, ". Try one of the matches below or edit the name.") : "Unknown ".concat(entityLabel, ". Check the spelling and try again."));
        return;
      }
      var _guess = _attempt.entry;
      var _correctedName = _attempt.autoCorrected ? _attempt.correctedName : '';
      var _alreadyTried = (session.guesses || []).some(entry => entry.id === _guess.id) || (session.solvedIds || []).includes(_guess.id);
      if (_alreadyTried) {
        setInputNotice('');
        setInputSuggestions([]);
        setDuplicateError(_correctedName || rawGuess);
        return;
      }
      setWorldleState(prev => {
        var ensured = hydrateSession(prev);
        var next = ensured.state;
        var activeSession = activeQueue === 'daily' ? next.daily[mode] : next.practice[mode];
        if (!activeSession || activeSession.solved || activeSession.failed) return prev;
        var now = new Date().toISOString();
        var correct = target.teachables.some(perk => perk.id === _guess.id);
        var nextGuesses = [...(activeSession.guesses || []), {
          id: _guess.id,
          label: _guess.name,
          correct
        }];
        var nextSolvedIds = correct ? [...(activeSession.solvedIds || []), _guess.id] : activeSession.solvedIds || [];
        activeSession = _objectSpread(_objectSpread({}, activeSession), {}, {
          guesses: nextGuesses,
          solvedIds: nextSolvedIds,
          solved: nextSolvedIds.length === target.teachables.length,
          failed: false,
          completedAt: nextSolvedIds.length === target.teachables.length ? now : null
        });
        next = persistSession(next, activeSession);
        if (activeSession.solved) {
          next = recordWorldleResult(next, {
            mode,
            queue: activeQueue,
            result: buildWorldleResultEntry({
              mode,
              queue: activeQueue,
              target,
              guessCount: nextGuesses.length,
              solved: true,
              dateKey: activeQueue === 'daily' ? activeSession.dateKey : todayKey,
              session: activeSession,
              emojiVariant: activeEmojiVariant
            })
          });
        }
        return next;
      });
      setGuessInput('');
      setInputError('');
      setInputSuggestions([]);
      setInputNotice(_correctedName ? "Using ".concat(_correctedName, ".") : '');
      return;
    }
    var attempt = resolveWorldleGuessAttempt(activeCatalog, rawGuess);
    if (!attempt.entry) {
      setInputNotice('');
      setInputSuggestions(attempt.suggestions);
      setInputError(attempt.suggestions.length ? "Unknown ".concat(entityLabel, ". Try one of the matches below or edit the name.") : "Unknown ".concat(entityLabel, ". Check the spelling and try again."));
      return;
    }
    var guess = attempt.entry;
    var correctedName = attempt.autoCorrected ? attempt.correctedName : '';
    var alreadyTried = (session.guesses || []).some(entry => entry.id === guess.id);
    if (alreadyTried) {
      setInputNotice('');
      setInputSuggestions([]);
      setDuplicateError(correctedName || rawGuess);
      return;
    }
    setWorldleState(prev => {
      var ensured = hydrateSession(prev);
      var next = ensured.state;
      var activeSession = activeQueue === 'daily' ? next.daily[mode] : next.practice[mode];
      if (!activeSession || activeSession.solved || activeSession.failed) return prev;
      var now = new Date().toISOString();
      var correct = guess.id === target.id;
      var nextGuesses = [...(activeSession.guesses || []), {
        id: guess.id,
        label: guess.name,
        correct
      }];
      activeSession = _objectSpread(_objectSpread({}, activeSession), {}, {
        guesses: nextGuesses,
        solved: correct,
        failed: false,
        revealedClues: mode === 'emoji' ? Math.min(3, 1 + nextGuesses.filter(entry => entry.correct === false).length) : activeSession.revealedClues,
        completedAt: correct ? now : null
      });
      next = persistSession(next, activeSession);
      if (correct) {
        next = recordWorldleResult(next, {
          mode,
          queue: activeQueue,
          result: buildWorldleResultEntry({
            mode,
            queue: activeQueue,
            target,
            guessCount: nextGuesses.length,
            solved: true,
            dateKey: activeQueue === 'daily' ? activeSession.dateKey : todayKey,
            session: activeSession,
            emojiVariant: activeEmojiVariant
          })
        });
      }
      return next;
    });
    setGuessInput('');
    setInputError('');
    setInputSuggestions([]);
    setInputNotice(correctedName ? "Using ".concat(correctedName, ".") : '');
  };
  var handleGiveUp = () => {
    if (!target || isFinished) return;
    setWorldleState(prev => {
      var ensured = hydrateSession(prev);
      var next = ensured.state;
      var activeSession = activeQueue === 'daily' ? next.daily[mode] : next.practice[mode];
      if (!activeSession || activeSession.solved || activeSession.failed) return prev;
      activeSession = _objectSpread(_objectSpread({}, activeSession), {}, {
        failed: true,
        solved: false,
        completedAt: new Date().toISOString()
      });
      next = persistSession(next, activeSession);
      return recordWorldleResult(next, {
        mode,
        queue: activeQueue,
        result: buildWorldleResultEntry({
          mode,
          queue: activeQueue,
          target,
          guessCount: guessCount || 0,
          solved: false,
          dateKey: activeQueue === 'daily' ? activeSession.dateKey : todayKey,
          session: activeSession,
          emojiVariant: activeEmojiVariant
        })
      });
    });
    clearInputFeedback();
  };
  var advancePractice = () => {
    if (activeQueue !== 'practice') return;
    setWorldleState(prev => advancePracticeWorldleSession({
      mode,
      state: prev,
      catalog: activeCatalog,
      dateKey: todayKey,
      options: {
        emojiVariants: emojiVariantCatalog,
        emojiVariantsById
      }
    }));
    setGuessInput('');
    clearInputFeedback();
  };
  var getPerkRevealStyle = () => {
    var stage = Math.min(3, wrongGuesses);
    if (stage === 0) return {
      filter: 'blur(8px) brightness(0.68) saturate(0.82)'
    };
    if (stage === 1) return {
      filter: 'blur(5px) brightness(0.78) saturate(0.9)'
    };
    if (stage === 2) return {
      filter: 'blur(2px) brightness(0.9) saturate(0.96)'
    };
    return {
      filter: 'none'
    };
  };
  var formatClassicValue = (field, value) => {
    if (field === 'licensed') return value ? 'Licensed' : 'Original';
    if (field === 'releaseYear') return value || '?';
    return value || '?';
  };
  var classicFields = [{
    key: 'height',
    label: 'Height'
  }, {
    key: 'speed',
    label: 'Speed'
  }, {
    key: 'terrorRadius',
    label: 'TR'
  }, {
    key: 'licensed',
    label: 'Origin'
  }, {
    key: 'gender',
    label: 'Gender'
  }, {
    key: 'releaseYear',
    label: 'Year'
  }];
  var revealedClassicFields = useMemo(() => {
    var revealed = Object.fromEntries(classicFields.map(field => [field.key, false]));
    if (!target) return revealed;
    if (isFinished) {
      classicFields.forEach(field => {
        revealed[field.key] = true;
      });
      return revealed;
    }
    ((session === null || session === void 0 ? void 0 : session.guesses) || []).forEach(guess => {
      var guessedKiller = killerCatalog.find(entry => entry.id === guess.id);
      if (!guessedKiller) return;
      classicFields.forEach(field => {
        if (guessedKiller[field.key] === target[field.key]) {
          revealed[field.key] = true;
        }
      });
    });
    return revealed;
  }, [classicFields, target, isFinished, session, killerCatalog]);
  var renderClassicGuess = (guess, index) => {
    var guessedKiller = killerCatalog.find(entry => entry.id === guess.id);
    if (!guessedKiller || !target) return null;
    return React.createElement("div", {
      key: "".concat(guess.id, "-").concat(index),
      className: "p-3 cx-flatcard"
    }, React.createElement("div", {
      className: "flex items-center justify-between gap-3 mb-2"
    }, React.createElement("p", {
      className: "text-sm font-bold text-white"
    }, guessedKiller.name), React.createElement("span", {
      className: "px-2 py-1 border text-[10px] uppercase tracking-wider font-bold ".concat(guess.correct ? 'wl-hit' : 'wl-miss')
    }, guess.correct ? 'Solved' : 'Wrong')), React.createElement("div", {
      className: "grid grid-cols-2 md:grid-cols-7 gap-2"
    }, classicFields.map(field => {
      var guessedValue = guessedKiller[field.key];
      var targetValue = target[field.key];
      var exact = guessedValue === targetValue;
      var yearHint = field.key === 'releaseYear' && guessedValue && targetValue && guessedValue !== targetValue ? guessedValue < targetValue ? '↑' : '↓' : '';
      var palette = exact ? 'wl-hit' : field.key === 'releaseYear' ? 'wl-miss' : 'wl-miss--strong';
      return React.createElement("div", {
        key: field.key,
        className: "p-2 border ".concat(palette)
      }, React.createElement("p", {
        className: "text-[10px] uppercase tracking-wider opacity-70 mb-1"
      }, field.label), React.createElement("p", {
        className: "text-xs font-semibold"
      }, formatClassicValue(field.key, guessedValue), " ", yearHint));
    })));
  };
  var histogramMax = Math.max(1, ...Object.values(statsBucket.histogram || {}).map(value => Number(value) || 0));
  if (!target || activeCatalog.length === 0) {
    return React.createElement("div", {
      className: "flex flex-col h-full pt-6 pb-32 px-6 overflow-y-auto custom-scrollbar"
    }, React.createElement(ViewCrumbs, {
      trail: [{
        label: 'Main page',
        onClick: onBack
      }],
      current: "Wordle"
    }), React.createElement("h1", {
      className: "cx-title"
    }, "Wordle"), React.createElement("p", {
      className: "cx-hatnote"
    }, "Test your DBD knowledge - daily and practice modes."), React.createElement("table", {
      className: "cx-wikitable"
    }, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("th", {
      scope: "row"
    }, "Status"), React.createElement("td", null, React.createElement("div", {
      className: "text-center text-zinc-400"
    }, "Wordle data is unavailable right now."))))));
  }
  return React.createElement("div", {
    className: "flex flex-col h-full pt-6 pb-32 px-6 overflow-y-auto custom-scrollbar"
  }, React.createElement(ViewCrumbs, {
    trail: [{
      label: 'Main page',
      onClick: onBack
    }],
    current: "Wordle"
  }), React.createElement("h1", {
    className: "cx-title"
  }, "Wordle"), React.createElement("p", {
    className: "cx-hatnote"
  }, "Test your DBD knowledge - daily and practice modes."), React.createElement("h2", {
    className: "cx-sec"
  }, "Game mode"), React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Mode"), React.createElement("td", null, React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, WORLDLE_MODES.map(modeId => React.createElement("button", {
    type: "button",
    key: modeId,
    onClick: () => setMode(modeId),
    className: "mode-choice px-3 py-2 text-xs font-bold uppercase tracking-[0.22em] ".concat(mode === modeId ? 'mode-choice--active' : '')
  }, WORLDLE_MODE_META[modeId].label))))), practiceEnabled && React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Queue"), React.createElement("td", null, React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, ['daily', 'practice'].map(entry => React.createElement("button", {
    type: "button",
    key: entry,
    onClick: () => setQueueType(entry),
    className: "mode-choice px-3 py-2 text-xs font-bold uppercase tracking-[0.22em] ".concat(activeQueue === entry ? 'mode-choice--active' : '')
  }, entry === 'daily' ? 'Daily' : 'Practice'))))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Puzzle"), React.createElement("td", null, React.createElement("div", {
    className: "mb-4 ".concat(isPhoneLayout ? 'space-y-3' : 'flex items-start justify-between gap-4')
  }, React.createElement("div", null, React.createElement("div", {
    className: "flex flex-wrap items-center gap-2 ".concat(isPhoneLayout ? 'mb-1' : '')
  }, React.createElement("p", {
    className: "text-[11px] uppercase tracking-[0.28em] text-zinc-500 font-bold"
  }, activeQueue === 'daily' ? 'Daily Puzzle' : 'Practice Queue'), isPhoneLayout && React.createElement("span", {
    className: "cx-chip rounded-full text-[10px] uppercase tracking-[0.22em] font-bold"
  }, compactPuzzleBadge)), React.createElement("h2", {
    className: "text-xl md:text-2xl font-black text-white mt-1"
  }, WORLDLE_MODE_META[mode].label), React.createElement("p", {
    className: "text-sm text-zinc-400 mt-2 max-w-2xl"
  }, WORLDLE_MODE_META[mode].description)), !isPhoneLayout && React.createElement("div", {
    className: "text-right"
  }, React.createElement("p", {
    className: "text-[10px] uppercase tracking-wider text-zinc-500"
  }, "Puzzle Key"), React.createElement("p", {
    className: "text-sm text-white font-semibold"
  }, activeQueue === 'daily' ? todayKey : "Practice-".concat(practiceRoundLabel)))))), (mode === 'classic' || mode === 'emoji') && React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, mode === 'classic' ? 'Killer Stats' : 'Emoji Clues'), React.createElement("td", null, mode === 'classic' ? React.createElement("div", {
    className: "grid grid-cols-2 gap-2 text-sm"
  }, classicFields.map(field => React.createElement("div", {
    key: field.key,
    className: "p-3 ".concat(revealedClassicFields[field.key] ? 'cx-cell--on' : 'cx-cell')
  }, React.createElement("p", {
    className: "text-[10px] uppercase tracking-wider text-zinc-500 mb-1"
  }, field.label), React.createElement("p", {
    className: revealedClassicFields[field.key] ? 'text-zinc-100' : 'text-zinc-300'
  }, revealedClassicFields[field.key] ? formatClassicValue(field.key, target[field.key]) : 'Unknown')))) : React.createElement("div", {
    className: "grid grid-cols-3 gap-3"
  }, [0, 1, 2].map(index => {
    var _activeEmojiVariant$d;
    var revealed = index < Math.min(3, 1 + wrongGuesses) || isFinished;
    return React.createElement("div", {
      key: index,
      className: "cx-cell h-24 flex items-center justify-center text-4xl"
    }, revealed ? (activeEmojiVariant === null || activeEmojiVariant === void 0 || (_activeEmojiVariant$d = activeEmojiVariant.displayEmojis) === null || _activeEmojiVariant$d === void 0 ? void 0 : _activeEmojiVariant$d[index]) || '❔' : '❔');
  })), isFinished && React.createElement("div", {
    className: "p-3 border mt-3 ".concat(session.solved ? 'cx-cell--on' : 'cx-cell')
  }, React.createElement("p", {
    className: "text-[10px] uppercase tracking-[0.22em] font-bold mb-1",
    style: {
      color: session.solved ? 'var(--text)' : 'var(--muted)'
    }
  }, session.solved ? 'Solved' : 'Revealed'), React.createElement("p", {
    className: "text-lg font-bold text-white"
  }, target.name)))), (mode === 'survivorPerk' || mode === 'killerPerk') && React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Perk"), React.createElement("td", null, React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-[220px,1fr] gap-4 items-center"
  }, React.createElement("div", {
    className: "cx-cell p-4 flex items-center justify-center min-h-[220px]"
  }, React.createElement("div", {
    className: "w-32 h-32 overflow-hidden border bg-zinc-900/70 flex items-center justify-center",
    style: {
      borderColor: 'var(--stroke)'
    }
  }, React.createElement("img", {
    src: "./".concat(target.image),
    alt: "Hidden perk icon",
    className: "w-full h-full object-contain",
    style: isFinished ? {
      filter: 'none'
    } : getPerkRevealStyle()
  }))), React.createElement("div", {
    className: "space-y-3"
  }, React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, React.createElement("div", {
    className: "p-3 rounded-2xl bg-white/5 border border-white/10"
  }, React.createElement("p", {
    className: "text-[10px] uppercase tracking-wider text-zinc-500 mb-1"
  }, "Owner"), React.createElement("p", {
    className: "text-white font-semibold"
  }, isFinished ? target.owner : 'Unknown')), React.createElement("div", {
    className: "p-3 rounded-2xl bg-white/5 border border-white/10"
  }, React.createElement("p", {
    className: "text-[10px] uppercase tracking-wider text-zinc-500 mb-1"
  }, "Reveal Stage"), React.createElement("p", {
    className: "text-white font-semibold"
  }, Math.min(4, wrongGuesses + 1), "/4"))), isFinished && React.createElement("div", {
    className: "p-3 border ".concat(session.solved ? 'cx-cell--on' : 'cx-cell')
  }, React.createElement("p", {
    className: "text-[10px] uppercase tracking-[0.22em] font-bold mb-1",
    style: {
      color: session.solved ? 'var(--text)' : 'var(--muted)'
    }
  }, session.solved ? 'Solved' : 'Revealed'), React.createElement("p", {
    className: "text-lg font-bold text-white"
  }, target.name)))))), mode === 'teachables' && React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Teachables"), React.createElement("td", null, React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-[170px,1fr] gap-4 items-start"
  }, React.createElement("div", {
    className: "cx-cell p-4"
  }, React.createElement("div", {
    className: "w-24 h-32 mx-auto overflow-hidden border bg-zinc-900/70",
    style: {
      borderColor: 'var(--stroke)'
    }
  }, React.createElement(AssetFrame, {
    type: "Killer",
    size: "fill",
    imageUrl: target.image,
    fallbackIcon: React.createElement(Icons.Sword, {
      width: 40,
      height: 40,
      className: "text-zinc-600"
    })
  })), React.createElement("p", {
    className: "text-base font-bold text-white mt-3 text-center"
  }, target.name), React.createElement("p", {
    className: "text-xs text-zinc-500 mt-1 text-center"
  }, "Guess all three teachable perks. Duplicate attempts do not count.")), React.createElement("div", {
    className: "space-y-3"
  }, React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-3 gap-3"
  }, target.teachables.map(perk => {
    var solved = solvedIds.includes(perk.id) || isFinished;
    return React.createElement("div", {
      key: perk.id,
      className: "p-4 ".concat(solved ? 'cx-cell--on' : 'cx-cell')
    }, React.createElement("div", {
      className: "cx-cell w-16 h-16 overflow-hidden mb-3"
    }, solved ? React.createElement(AssetFrame, {
      type: "Perk",
      size: "fill",
      imageUrl: perk.image,
      fallbackIcon: React.createElement(Icons.BookOpen, {
        width: 24,
        height: 24,
        className: "text-zinc-600"
      })
    }) : React.createElement("div", {
      className: "w-full h-full flex items-center justify-center text-zinc-600 text-2xl font-black"
    }, "?")), React.createElement("p", {
      className: "text-sm font-semibold text-white"
    }, solved ? perk.name : 'Unknown teachable'));
  })), isFinished && React.createElement("div", {
    className: "p-3 border ".concat(session.solved ? 'cx-cell--on' : 'cx-cell')
  }, React.createElement("p", {
    className: "text-[10px] uppercase tracking-[0.22em] font-bold mb-1",
    style: {
      color: session.solved ? 'var(--text)' : 'var(--muted)'
    }
  }, session.solved ? 'Solved' : 'Revealed'), React.createElement("p", {
    className: "text-sm text-white"
  }, "Target killer: ", React.createElement("span", {
    className: "font-bold"
  }, target.name))))))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Submit Guess"), React.createElement("td", null, React.createElement("div", {
    className: "flex flex-col md:flex-row gap-3"
  }, React.createElement("div", {
    className: "flex-1"
  }, React.createElement("input", {
    ref: guessInputRef,
    value: guessInput,
    onChange: e => {
      var nextValue = e.target.value;
      var shouldClear = normalizeGuessFeedbackInput(nextValue) !== normalizeGuessFeedbackInput(guessInput);
      setGuessInput(nextValue);
      if (shouldClear) {
        clearInputFeedback();
      }
    },
    onKeyDown: e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleGuessSubmit();
      }
    },
    disabled: isFinished,
    placeholder: mode === 'teachables' ? 'Guess a killer perk...' : mode.includes('Perk') ? 'Guess the perk...' : 'Guess the killer...',
    autoCorrect: "off",
    autoCapitalize: "none",
    spellCheck: false,
    enterKeyHint: "go",
    className: "cx-input w-full px-4 py-3 text-sm"
  }), inputError && React.createElement("p", {
    className: "text-xs text-zinc-200 mt-2"
  }, inputError), inputNotice && React.createElement("p", {
    className: "text-xs text-zinc-200 mt-2"
  }, inputNotice), inputSuggestions.length > 0 && !isFinished && React.createElement("div", {
    className: "mt-3 flex flex-wrap gap-2"
  }, inputSuggestions.map(option => React.createElement("button", {
    type: "button",
    key: option,
    onClick: () => handleGuessSubmit(option),
    className: "mode-choice px-3 py-2 text-xs font-semibold"
  }, option)))), React.createElement("button", {
    type: "button",
    onMouseDown: e => e.preventDefault(),
    onClick: () => handleGuessSubmit(),
    disabled: !guessInput.trim() || isFinished,
    className: "cx-toolbtn cx-toolbtn--primary px-5 py-3 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
  }, "Submit"), React.createElement("button", {
    type: "button",
    onClick: handleGiveUp,
    disabled: isFinished,
    className: "cx-toolbtn cx-toolbtn--quiet px-5 py-3 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
  }, activeQueue === 'daily' ? 'Reveal' : 'Skip'), activeQueue === 'practice' && isFinished && React.createElement("button", {
    type: "button",
    onClick: advancePractice,
    className: "cx-toolbtn cx-toolbtn--quiet px-5 py-3 text-sm font-bold"
  }, "Next Puzzle")))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Guess History (", guessCount, " attempts)"), React.createElement("td", null, mode === 'classic' ? React.createElement("div", {
    className: "space-y-3"
  }, (session.guesses || []).map(renderClassicGuess), (session.guesses || []).length === 0 && React.createElement("p", {
    className: "text-sm text-zinc-500"
  }, "No guesses yet. Start with any killer name and use the stat matches to narrow the field.")) : React.createElement("div", {
    className: "space-y-2"
  }, (session.guesses || []).map((guess, index) => React.createElement("div", {
    key: "".concat(guess.id || guess.label, "-").concat(index),
    className: "p-3 ".concat(guess.correct ? 'cx-cell--on' : 'cx-cell')
  }, React.createElement("div", {
    className: "flex items-center justify-between gap-3"
  }, React.createElement("span", {
    className: "text-sm font-semibold text-white"
  }, guess.label), React.createElement("span", {
    className: "text-[10px] uppercase tracking-[0.22em] font-bold ".concat(guess.correct ? 'text-zinc-100' : 'text-zinc-500')
  }, guess.correct ? 'Correct' : 'Wrong')))), (session.guesses || []).length === 0 && React.createElement("p", {
    className: "text-sm text-zinc-500"
  }, "No guesses yet.")))))), React.createElement("h2", {
    className: "cx-sec"
  }, "Statistics"), React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Stats"), React.createElement("td", null, React.createElement("table", {
    className: "cx-wikitable",
    style: {
      marginTop: 0
    }
  }, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Played"), React.createElement("td", null, statsBucket.played)), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Solved"), React.createElement("td", null, statsBucket.solved)), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Avg Guesses"), React.createElement("td", null, statsBucket.averageGuesses || 0)), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, activeQueue === 'daily' ? 'Best Streak' : 'Recent Runs'), React.createElement("td", null, activeQueue === 'daily' ? statsBucket.bestStreak : historyRows.length)), activeQueue === 'daily' && React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Current Streak"), React.createElement("td", null, statsBucket.currentStreak)), activeQueue === 'daily' && React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Solve Rate"), React.createElement("td", null, statsBucket.solved && statsBucket.played ? Math.round(statsBucket.solved / statsBucket.played * 100) : 0, "%")))))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Histogram"), React.createElement("td", null, React.createElement("div", {
    className: "space-y-2"
  }, Object.entries(statsBucket.histogram || {}).map(_ref34 => {
    var [bucket, value] = _ref34;
    return React.createElement("div", {
      key: bucket,
      className: "grid grid-cols-[40px,1fr,28px] items-center gap-2"
    }, React.createElement("span", {
      className: "text-xs text-zinc-500 font-semibold"
    }, bucket), React.createElement("div", {
      className: "cx-meter"
    }, React.createElement("div", {
      style: {
        width: "".concat((Number(value) || 0) / histogramMax * 100, "%")
      }
    })), React.createElement("span", {
      className: "text-xs text-zinc-400 text-right"
    }, value));
  })))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Recent Results (Last 30)"), React.createElement("td", null, React.createElement("div", {
    className: "space-y-2 max-h-80 overflow-y-auto custom-scrollbar"
  }, historyRows.map((row, index) => {
    var _row$targetSnapshot;
    return React.createElement("div", {
      key: "".concat(row.completedAt || row.puzzleKey, "-").concat(index),
      className: "p-3 cx-flatcard"
    }, React.createElement("div", {
      className: "flex items-center justify-between gap-3"
    }, React.createElement("div", null, React.createElement("p", {
      className: "text-sm font-semibold text-white"
    }, ((_row$targetSnapshot = row.targetSnapshot) === null || _row$targetSnapshot === void 0 ? void 0 : _row$targetSnapshot.name) || 'Unknown target'), React.createElement("p", {
      className: "text-[11px] text-zinc-500 uppercase tracking-wider"
    }, row.puzzleKey, " \xB7 ", row.queue)), React.createElement("span", {
      className: "px-2 py-1 border text-[10px] uppercase tracking-[0.22em] font-bold ".concat(row.solved ? 'wl-hit' : 'wl-miss')
    }, row.solved ? "".concat(row.guessCount, " guesses") : 'Revealed')));
  }), historyRows.length === 0 && React.createElement("p", {
    className: "text-sm text-zinc-500"
  }, "No recorded runs for this mode yet.")))))));
};
var ProgressionView = _ref35 => {
  var {
    onBack,
    onGoTo,
    killers = [],
    survivors = [],
    perks = [],
    progression,
    setProgression,
    builds = [],
    matches = [],
    prefs = {},
    settings = {},
    setSettings,
    initialTab = 'achievements',
    maps = []
  } = _ref35;
  var [tab, setTab] = useState(PROGRESSION_TABS.includes(initialTab) ? initialTab : 'achievements');
  var [roleFilter, setRoleFilter] = useState('All');
  var [showOwnedOnly, setShowOwnedOnly] = useState(false);
  var [achievementSearch, setAchievementSearch] = useState('');
  var [achievementSort, setAchievementSort] = useState('name_asc');
  var [hideCompletedAchievements, setHideCompletedAchievements] = useState(false);
  var [challengeDraft, setChallengeDraft] = useState({
    name: '',
    description: '',
    side: 'any',
    tags: '',
    buildId: ''
  });
  var orderedTabs = useMemo(() => ensureOrderedFullSet(settings.progressionTabOrder, PROGRESSION_TABS, DEFAULT_SETTINGS.progressionTabOrder), [settings.progressionTabOrder]);
  useEffect(() => {
    setTab(PROGRESSION_TABS.includes(initialTab) ? initialTab : 'achievements');
  }, [initialTab]);
  var moveTab = (tabId, direction) => {
    setSettings(prev => {
      var currentOrder = ensureOrderedFullSet(prev.progressionTabOrder, PROGRESSION_TABS, DEFAULT_SETTINGS.progressionTabOrder);
      var currentIndex = currentOrder.indexOf(tabId);
      var nextIndex = currentIndex + direction;
      if (currentIndex === -1 || nextIndex < 0 || nextIndex >= currentOrder.length) return prev;
      var nextOrder = [...currentOrder];
      [nextOrder[currentIndex], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[currentIndex]];
      return _objectSpread(_objectSpread({}, prev), {}, {
        progressionTabOrder: nextOrder
      });
    });
  };
  var tabMeta = {
    achievements: 'Achievements',
    roster: 'Roster',
    challenges: 'Challenges',
    analytics: 'Analytics'
  };
  var toggleCharacter = (id, field) => {
    setProgression(prev => {
      var _prev$characters;
      var existing = ((_prev$characters = prev.characters) === null || _prev$characters === void 0 ? void 0 : _prev$characters[id]) || {};
      return _objectSpread(_objectSpread({}, prev), {}, {
        characters: _objectSpread(_objectSpread({}, prev.characters), {}, {
          [id]: _objectSpread(_objectSpread({}, existing), {}, {
            [field]: field === 'owned' ? !existing.owned : field === 'favorite' ? !existing.favorite : existing[field]
          })
        })
      });
    });
  };
  var updateCharacterPrestige = (id, prestige) => {
    setProgression(prev => {
      var _prev$characters2;
      var existing = ((_prev$characters2 = prev.characters) === null || _prev$characters2 === void 0 ? void 0 : _prev$characters2[id]) || {};
      return _objectSpread(_objectSpread({}, prev), {}, {
        characters: _objectSpread(_objectSpread({}, prev.characters), {}, {
          [id]: _objectSpread(_objectSpread({}, existing), {}, {
            prestige
          })
        })
      });
    });
  };
  var toggleAchievement = id => {
    setProgression(prev => {
      var _prev$achievements;
      return _objectSpread(_objectSpread({}, prev), {}, {
        achievements: _objectSpread(_objectSpread({}, prev.achievements || {}), {}, {
          [id]: !((_prev$achievements = prev.achievements) !== null && _prev$achievements !== void 0 && _prev$achievements[id])
        })
      });
    });
  };
  var addChallenge = () => {
    if (!challengeDraft.name.trim()) return;
    setProgression(prev => _objectSpread(_objectSpread({}, prev), {}, {
      challenges: [...(prev.challenges || []), _objectSpread(_objectSpread({}, challengeDraft), {}, {
        id: uuid(),
        tags: parseTags(challengeDraft.tags),
        status: 'planned'
      })]
    }));
    setChallengeDraft({
      name: '',
      description: '',
      side: 'any',
      tags: '',
      buildId: ''
    });
  };
  var updateChallengeStatus = (id, status) => {
    setProgression(prev => _objectSpread(_objectSpread({}, prev), {}, {
      challenges: prev.challenges.map(challenge => challenge.id === id ? _objectSpread(_objectSpread({}, challenge), {}, {
        status
      }) : challenge)
    }));
  };
  var characters = useMemo(() => {
    if (roleFilter === 'Killer') return killers;
    if (roleFilter === 'Survivor') return survivors;
    return [...killers, ...survivors];
  }, [killers, survivors, roleFilter]);
  var visibleCharacters = characters.filter(character => {
    var _progression$characte;
    return !showOwnedOnly || ((_progression$characte = progression.characters) === null || _progression$characte === void 0 || (_progression$characte = _progression$characte[character.id]) === null || _progression$characte === void 0 ? void 0 : _progression$characte.owned);
  });
  var ownedKillers = killers.filter(killer => {
    var _progression$characte2;
    return (_progression$characte2 = progression.characters) === null || _progression$characte2 === void 0 || (_progression$characte2 = _progression$characte2[killer.id]) === null || _progression$characte2 === void 0 ? void 0 : _progression$characte2.owned;
  });
  var ownedSurvivors = survivors.filter(survivor => {
    var _progression$characte3;
    return (_progression$characte3 = progression.characters) === null || _progression$characte3 === void 0 || (_progression$characte3 = _progression$characte3[survivor.id]) === null || _progression$characte3 === void 0 ? void 0 : _progression$characte3.owned;
  });
  var ownedCharacters = [...killers, ...survivors].filter(character => {
    var _progression$characte4;
    return (_progression$characte4 = progression.characters) === null || _progression$characte4 === void 0 || (_progression$characte4 = _progression$characte4[character.id]) === null || _progression$characte4 === void 0 ? void 0 : _progression$characte4.owned;
  });
  var teachablesByOwner = useMemo(() => {
    var map = {};
    (perks || []).forEach(perk => {
      if (!perk.owner || perk.owner === 'All Killers' || perk.owner === 'All Survivors') return;
      map[perk.owner] = map[perk.owner] || [];
      map[perk.owner].push(perk);
    });
    return map;
  }, [perks]);
  var teachableCoverage = ownedCharacters.map(character => {
    var _progression$characte5;
    var prestige = Number((_progression$characte5 = progression.characters) === null || _progression$characte5 === void 0 || (_progression$characte5 = _progression$characte5[character.id]) === null || _progression$characte5 === void 0 ? void 0 : _progression$characte5.prestige) || 0;
    var total = (teachablesByOwner[character.name] || []).length;
    var unlocked = prestige >= 1 ? total : 0;
    return {
      character,
      prestige,
      total,
      unlocked
    };
  });
  var unlockedTeachableTotal = teachableCoverage.reduce((sum, row) => sum + row.unlocked, 0);
  var prestigeUnlockedCharacters = teachableCoverage.filter(row => row.prestige >= 1).length;
  var buildName = id => {
    var _builds$find;
    return ((_builds$find = builds.find(build => build.id === id)) === null || _builds$find === void 0 ? void 0 : _builds$find.name) || 'Unlinked Build';
  };
  var achievementState = progression.achievements || {};
  var filteredAchievements = useMemo(() => {
    var list = DBD_ACHIEVEMENTS;
    if (achievementSearch.trim()) {
      var query = achievementSearch.toLowerCase();
      list = list.filter(achievement => achievement.name.toLowerCase().includes(query) || achievement.description.toLowerCase().includes(query));
    }
    if (hideCompletedAchievements) {
      list = list.filter(achievement => !achievementState[achievement.id]);
    }
    list = [...list].sort((a, b) => {
      var aComplete = !!achievementState[a.id];
      var bComplete = !!achievementState[b.id];
      if (achievementSort === 'completed_first') {
        if (aComplete !== bComplete) return aComplete ? -1 : 1;
        return a.name.localeCompare(b.name);
      }
      if (achievementSort === 'not_completed_first') {
        if (aComplete !== bComplete) return aComplete ? 1 : -1;
        return a.name.localeCompare(b.name);
      }
      if (achievementSort === 'name_desc') return b.name.localeCompare(a.name);
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [achievementSearch, achievementSort, hideCompletedAchievements, achievementState]);
  var completedCount = Object.values(achievementState).filter(Boolean).length;
  var challengeCounts = {
    planned: (progression.challenges || []).filter(challenge => challenge.status === 'planned').length,
    active: (progression.challenges || []).filter(challenge => challenge.status === 'active').length,
    completed: (progression.challenges || []).filter(challenge => challenge.status === 'completed').length
  };
  return React.createElement("div", {
    className: "flex flex-col h-full pt-6 pb-32 px-6 overflow-y-auto custom-scrollbar"
  }, React.createElement(ViewCrumbs, {
    trail: [{
      label: 'Main page',
      onClick: onBack
    }],
    current: "Progression Hub"
  }), React.createElement("h1", {
    className: "cx-title"
  }, "Progression Hub"), React.createElement("p", {
    className: "cx-hatnote"
  }, "Achievements, roster, challenges and analytics."), React.createElement("h2", {
    className: "cx-sec"
  }, "Hub tabs"), React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Tabs"), React.createElement("td", null, React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, orderedTabs.map(tabId => React.createElement("button", {
    key: tabId,
    onClick: () => setTab(tabId),
    className: "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border ".concat(tab === tabId ? 'bg-zinc-100 text-black border-zinc-100' : 'bg-white/5 text-zinc-300 border-white/10')
  }, tabMeta[tabId]))))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Tab Order"), React.createElement("td", null, React.createElement("div", {
    className: "flex items-center justify-between gap-3 mb-2"
  }, React.createElement("p", {
    className: "text-[11px] uppercase tracking-wider text-zinc-500 font-bold"
  }, "Tab Order"), React.createElement("span", {
    className: "text-[10px] text-zinc-600 uppercase tracking-wider"
  }, "Saved locally")), React.createElement("div", {
    className: "space-y-1"
  }, orderedTabs.map((tabId, index) => React.createElement("div", {
    key: tabId,
    className: "flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10"
  }, React.createElement("button", {
    onClick: () => setTab(tabId),
    className: "text-sm font-semibold text-white"
  }, tabMeta[tabId]), React.createElement("div", {
    className: "ml-auto flex gap-1"
  }, React.createElement("button", {
    onClick: () => moveTab(tabId, -1),
    disabled: index === 0,
    className: "w-7 h-7 rounded-lg bg-white/5 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
  }, "\u2191"), React.createElement("button", {
    onClick: () => moveTab(tabId, 1),
    disabled: index === orderedTabs.length - 1,
    className: "w-7 h-7 rounded-lg bg-white/5 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
  }, "\u2193"))))))))), tab === 'achievements' && React.createElement("div", null, React.createElement("h2", {
    className: "cx-sec"
  }, "Achievements"), React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Completed"), React.createElement("td", {
    className: "text-center"
  }, React.createElement("p", {
    className: "text-2xl font-bold text-white"
  }, completedCount))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Total"), React.createElement("td", {
    className: "text-center"
  }, React.createElement("p", {
    className: "text-2xl font-bold text-white"
  }, DBD_ACHIEVEMENTS.length))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Completion"), React.createElement("td", {
    className: "text-center"
  }, React.createElement("p", {
    className: "text-2xl font-bold text-zinc-100"
  }, DBD_ACHIEVEMENTS.length ? Math.round(completedCount / DBD_ACHIEVEMENTS.length * 100) : 0, "%"))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Remaining"), React.createElement("td", {
    className: "text-center"
  }, React.createElement("p", {
    className: "text-2xl font-bold text-zinc-200"
  }, DBD_ACHIEVEMENTS.length - completedCount))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Search"), React.createElement("td", null, React.createElement("div", {
    className: "relative"
  }, React.createElement("div", {
    className: "absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
  }, React.createElement(Icons.Search, {
    width: 18,
    height: 18
  })), React.createElement("input", {
    type: "text",
    value: achievementSearch,
    onChange: e => setAchievementSearch(e.target.value),
    placeholder: "Search achievements by name or description...",
    className: "w-full bg-[var(--panel)] border border-[var(--stroke)] rounded-xl py-3 pl-12 pr-10 text-white placeholder-zinc-600 text-sm focus:outline-none"
  }), achievementSearch && React.createElement("button", {
    onClick: () => setAchievementSearch(''),
    className: "absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white/5 text-zinc-400 hover:text-white transition-colors"
  }, React.createElement(Icons.X, {
    width: 14,
    height: 14
  }))))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Sort"), React.createElement("td", null, React.createElement("select", {
    value: achievementSort,
    onChange: e => setAchievementSort(e.target.value),
    className: "themed-select w-full text-sm"
  }, React.createElement("option", {
    value: "name_asc"
  }, "A \u2192 Z"), React.createElement("option", {
    value: "name_desc"
  }, "Z \u2192 A"), React.createElement("option", {
    value: "not_completed_first"
  }, "Not Completed First"), React.createElement("option", {
    value: "completed_first"
  }, "Completed First")))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Visibility"), React.createElement("td", null, React.createElement("label", {
    className: "inline-flex items-center gap-2 text-sm text-zinc-300 whitespace-nowrap px-3 py-2 rounded-xl bg-zinc-800/60 border border-white/10 cursor-pointer"
  }, React.createElement("input", {
    type: "checkbox",
    checked: hideCompletedAchievements,
    onChange: e => setHideCompletedAchievements(e.target.checked),
    className: "accent-current"
  }), "Hide completed"))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "List"), React.createElement("td", null, React.createElement("div", {
    className: "space-y-2"
  }, filteredAchievements.map(achievement => {
    var isComplete = !!achievementState[achievement.id];
    return React.createElement("div", {
      key: achievement.id,
      onClick: () => toggleAchievement(achievement.id),
      className: "p-3 rounded-2xl border cursor-pointer transition-all ".concat(isComplete ? 'bg-white/5 border-zinc-300/40 opacity-70' : 'bg-zinc-900/60 border-white/10 hover:border-white/20')
    }, React.createElement("div", {
      className: "flex items-start gap-3"
    }, React.createElement("div", {
      className: "mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ".concat(isComplete ? 'bg-zinc-100 border-zinc-100' : 'border-zinc-500')
    }, isComplete && React.createElement("span", {
      className: "text-black text-xs font-bold"
    }, "\u2713")), React.createElement("div", {
      className: "flex-1 min-w-0"
    }, React.createElement("p", {
      className: "font-semibold text-sm ".concat(isComplete ? 'text-zinc-400 line-through' : 'text-white')
    }, achievement.name), React.createElement("p", {
      className: "text-xs leading-relaxed mt-0.5 ".concat(isComplete ? 'text-zinc-500' : 'text-zinc-400')
    }, achievement.description), React.createElement("span", {
      className: "inline-block mt-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] uppercase tracking-wider text-zinc-500"
    }, achievement.category.replace('_', ' ')))));
  }), filteredAchievements.length === 0 && React.createElement("div", {
    className: "text-center text-zinc-500 py-8"
  }, "No achievements found matching the current filters."))))))), tab === 'roster' && React.createElement("div", null, React.createElement("h2", {
    className: "cx-sec"
  }, "Roster"), React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Owned Characters"), React.createElement("td", {
    className: "text-center"
  }, React.createElement("p", {
    className: "text-2xl font-bold text-white"
  }, ownedCharacters.length))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Owned Killers"), React.createElement("td", {
    className: "text-center"
  }, React.createElement("p", {
    className: "text-2xl font-bold text-zinc-100"
  }, ownedKillers.length))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Owned Survivors"), React.createElement("td", {
    className: "text-center"
  }, React.createElement("p", {
    className: "text-2xl font-bold text-zinc-100"
  }, ownedSurvivors.length))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Favorites"), React.createElement("td", {
    className: "text-center"
  }, React.createElement("p", {
    className: "text-2xl font-bold text-zinc-200"
  }, ownedCharacters.filter(character => {
    var _progression$characte6;
    return (_progression$characte6 = progression.characters) === null || _progression$characte6 === void 0 || (_progression$characte6 = _progression$characte6[character.id]) === null || _progression$characte6 === void 0 ? void 0 : _progression$characte6.favorite;
  }).length))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Teachable Perks Unlocked"), React.createElement("td", {
    className: "text-center"
  }, React.createElement("p", {
    className: "text-2xl font-bold text-zinc-100"
  }, unlockedTeachableTotal))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Coverage note"), React.createElement("td", null)), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Role filter"), React.createElement("td", null, React.createElement("div", {
    className: "flex gap-2 flex-wrap items-center"
  }, React.createElement("select", {
    value: roleFilter,
    onChange: e => setRoleFilter(e.target.value),
    className: "themed-select compact text-sm"
  }, React.createElement("option", {
    value: "All"
  }, "All roles"), React.createElement("option", {
    value: "Killer"
  }, "Killers"), React.createElement("option", {
    value: "Survivor"
  }, "Survivors")), React.createElement("label", {
    className: "inline-flex items-center gap-2 text-sm text-zinc-400"
  }, React.createElement("input", {
    type: "checkbox",
    checked: showOwnedOnly,
    onChange: e => setShowOwnedOnly(e.target.checked)
  }), " Owned only")))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Characters"), React.createElement("td", null, React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-3 gap-3"
  }, visibleCharacters.map(character => {
    var _progression$characte7;
    var state = ((_progression$characte7 = progression.characters) === null || _progression$characte7 === void 0 ? void 0 : _progression$characte7[character.id]) || {};
    var isKiller = killers.some(killer => killer.id === character.id);
    return React.createElement("div", {
      key: character.id,
      className: "p-3 rounded-2xl bg-zinc-900/60 border border-white/10"
    }, React.createElement("div", {
      className: "flex justify-between items-center mb-2"
    }, React.createElement("span", {
      className: "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ".concat(isKiller ? 'bg-white/10 text-zinc-100' : 'bg-white/5 text-zinc-300')
    }, isKiller ? 'Killer' : 'Survivor'), React.createElement("button", {
      onClick: () => toggleCharacter(character.id, 'favorite'),
      className: "text-zinc-200 text-sm"
    }, state.favorite ? '*' : '')), React.createElement("p", {
      className: "text-white font-bold"
    }, character.name), React.createElement("div", {
      className: "flex items-center gap-2 mt-2 text-sm text-zinc-300"
    }, React.createElement("label", {
      className: "inline-flex items-center gap-2"
    }, React.createElement("input", {
      type: "checkbox",
      checked: !!state.owned,
      onChange: () => toggleCharacter(character.id, 'owned')
    }), " Owned"), React.createElement("input", {
      type: "number",
      min: "0",
      max: "100",
      value: state.prestige || 0,
      onChange: e => updateCharacterPrestige(character.id, Number(e.target.value) || 0),
      className: "w-20 bg-zinc-800/60 border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
    }), React.createElement("span", {
      className: "text-[10px] uppercase tracking-wider text-zinc-500"
    }, "Prestige")));
  }), visibleCharacters.length === 0 && React.createElement("div", {
    className: "text-center text-zinc-500 py-6 md:col-span-3"
  }, "No characters match the current roster filters.")))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Prestige Unlock Coverage (", prestigeUnlockedCharacters, "/", ownedCharacters.length || 0, " owned chars at P1+)"), React.createElement("td", null, teachableCoverage.length === 0 && React.createElement("p", {
    className: "text-zinc-500 text-sm"
  }, "Mark a character as owned to start tracking roster unlocks."), teachableCoverage.map(row => React.createElement("div", {
    key: row.character.id,
    className: "flex justify-between items-center border-t border-white/5 py-2 text-sm text-zinc-300"
  }, React.createElement("span", null, row.character.name), React.createElement("span", {
    className: "text-[12px] text-zinc-400"
  }, row.total === 0 ? 'No personal perks in local data' : row.prestige >= 1 ? "".concat(row.unlocked, "/").concat(row.total, " unlocked") : "P".concat(row.prestige, " \xB7 unlocks at P1"))))))))), tab === 'challenges' && React.createElement("div", null, React.createElement("h2", {
    className: "cx-sec"
  }, "Challenges"), React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "planned"), React.createElement("td", {
    className: "text-center"
  }, React.createElement("p", {
    className: "text-2xl font-bold",
    style: {
      color: '#a1a1aa'
    }
  }, challengeCounts.planned))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "active"), React.createElement("td", {
    className: "text-center"
  }, React.createElement("p", {
    className: "text-2xl font-bold",
    style: {
      color: 'var(--rar-rare)'
    }
  }, challengeCounts.active))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "completed"), React.createElement("td", {
    className: "text-center"
  }, React.createElement("p", {
    className: "text-2xl font-bold",
    style: {
      color: 'var(--rar-rare)'
    }
  }, challengeCounts.completed))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "New Challenge"), React.createElement("td", null, React.createElement("div", {
    className: "space-y-2"
  }, React.createElement("input", {
    value: challengeDraft.name,
    onChange: e => setChallengeDraft(draft => _objectSpread(_objectSpread({}, draft), {}, {
      name: e.target.value
    })),
    placeholder: "Name",
    className: "w-full bg-zinc-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500"
  }), React.createElement("textarea", {
    value: challengeDraft.description,
    onChange: e => setChallengeDraft(draft => _objectSpread(_objectSpread({}, draft), {}, {
      description: e.target.value
    })),
    rows: 2,
    placeholder: "Description",
    className: "w-full bg-zinc-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500"
  }), React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, React.createElement("select", {
    value: challengeDraft.side,
    onChange: e => setChallengeDraft(draft => _objectSpread(_objectSpread({}, draft), {}, {
      side: e.target.value
    })),
    className: "themed-select w-full text-sm"
  }, React.createElement("option", {
    value: "any"
  }, "Any"), React.createElement("option", {
    value: "Killer"
  }, "Killer"), React.createElement("option", {
    value: "Survivor"
  }, "Survivor")), React.createElement("input", {
    value: challengeDraft.tags,
    onChange: e => setChallengeDraft(draft => _objectSpread(_objectSpread({}, draft), {}, {
      tags: e.target.value
    })),
    placeholder: "Tags (comma)",
    className: "bg-zinc-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500"
  }), React.createElement("select", {
    value: challengeDraft.buildId,
    onChange: e => setChallengeDraft(draft => _objectSpread(_objectSpread({}, draft), {}, {
      buildId: e.target.value
    })),
    className: "themed-select w-full text-sm col-span-2"
  }, React.createElement("option", {
    value: ""
  }, "Link build (optional)"), builds.map(build => React.createElement("option", {
    key: build.id,
    value: build.id
  }, build.name)))), React.createElement("button", {
    onClick: addChallenge,
    className: "px-4 py-2 rounded-xl bg-zinc-100 text-black font-bold text-sm"
  }, "Add Challenge")))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "List"), React.createElement("td", null, React.createElement("div", {
    className: "space-y-2"
  }, (progression.challenges || []).map(challenge => {
    var _challenge$tags;
    return React.createElement("div", {
      key: challenge.id,
      className: "p-3 rounded-2xl bg-zinc-900/60 border border-white/10"
    }, React.createElement("div", {
      className: "flex justify-between items-center"
    }, React.createElement("div", null, React.createElement("p", {
      className: "text-white font-semibold"
    }, challenge.name), React.createElement("p", {
      className: "text-[11px] text-zinc-500 uppercase tracking-wider"
    }, challenge.side)), React.createElement("select", {
      value: challenge.status,
      onChange: e => updateChallengeStatus(challenge.id, e.target.value),
      className: "themed-select compact text-xs"
    }, React.createElement("option", {
      value: "planned"
    }, "Planned"), React.createElement("option", {
      value: "active"
    }, "Active"), React.createElement("option", {
      value: "completed"
    }, "Completed"))), challenge.buildId && React.createElement("p", {
      className: "text-[11px] text-zinc-400 mt-1"
    }, "Build: ", buildName(challenge.buildId)), React.createElement("p", {
      className: "text-sm text-zinc-300 mt-1"
    }, challenge.description), ((_challenge$tags = challenge.tags) === null || _challenge$tags === void 0 ? void 0 : _challenge$tags.length) > 0 && React.createElement("div", {
      className: "flex flex-wrap gap-1 mt-1"
    }, challenge.tags.map(tag => React.createElement("span", {
      key: tag,
      className: "px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] text-zinc-300 uppercase tracking-wider"
    }, tag))));
  }), (progression.challenges || []).length === 0 && React.createElement("div", {
    className: "text-center text-zinc-500 py-4"
  }, "No challenges yet."))))))), tab === 'analytics' && React.createElement("div", null, React.createElement("h2", {
    className: "cx-sec"
  }, "Analytics"), React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Boards"), React.createElement("td", null, React.createElement(MatchAnalyticsPanel, {
    matches: matches,
    prefs: prefs,
    killers: killers,
    survivors: survivors,
    builds: builds,
    maps: maps,
    onOpenMatches: () => onGoTo && onGoTo('matches')
  })))))));
};
var ProgressionTrackerView = () => null;
var TimelineView = _ref36 => {
  var {
    onBack,
    setView,
    killers = [],
    survivors = [],
    theme = {}
  } = _ref36;
  var scrollRef = useRef(null);
  var [expandedRelease, setExpandedRelease] = useState(null);
  var [expandedCharacter, setExpandedCharacter] = useState(null);
  var [selectedCharacter, setSelectedCharacter] = useState(null);
  var [search, setSearch] = useState('');
  var [yearFilter, setYearFilter] = useState('all');
  var accent = theme.accent || '#fafafa';
  var accentSoft = theme.accentSoft || '#0f172a';
  var allReleases = useMemo(() => {
    if (typeof TIMELINE_DATA !== 'undefined' && TIMELINE_DATA.releases) {
      return TIMELINE_DATA.getChronological();
    }
    return [];
  }, []);
  var years = useMemo(() => {
    var yearSet = new Set();
    allReleases.forEach(r => {
      var year = new Date(r.date).getFullYear();
      yearSet.add(year);
    });
    return Array.from(yearSet).sort();
  }, [allReleases]);
  var releases = useMemo(() => {
    var filtered = allReleases;
    if (yearFilter !== 'all') {
      filtered = filtered.filter(r => new Date(r.date).getFullYear() === parseInt(yearFilter));
    }
    if (search.trim()) {
      var term = search.toLowerCase();
      filtered = filtered.filter(r => {
        var _r$killers, _r$survivors, _r$maps;
        if (r.name.toLowerCase().includes(term)) return true;
        if ((_r$killers = r.killers) !== null && _r$killers !== void 0 && _r$killers.some(k => {
          var _k$realName;
          return k.name.toLowerCase().includes(term) || ((_k$realName = k.realName) === null || _k$realName === void 0 ? void 0 : _k$realName.toLowerCase().includes(term));
        })) return true;
        if ((_r$survivors = r.survivors) !== null && _r$survivors !== void 0 && _r$survivors.some(s => s.name.toLowerCase().includes(term))) return true;
        if ((_r$maps = r.maps) !== null && _r$maps !== void 0 && _r$maps.some(m => m.name.toLowerCase().includes(term))) return true;
        return false;
      });
    }
    return filtered;
  }, [allReleases, yearFilter, search]);
  var findCharacterData = React.useCallback((loreChar, type) => {
    var source = type === 'killers' ? killers : survivors;
    var loreId = loreChar.id.toLowerCase();
    return source.find(c => {
      var _c$id, _c$name;
      var dataId = ((_c$id = c.id) === null || _c$id === void 0 ? void 0 : _c$id.toLowerCase()) || '';
      var dataName = ((_c$name = c.name) === null || _c$name === void 0 ? void 0 : _c$name.toLowerCase()) || '';
      return dataId.includes(loreId) || dataName.includes(loreId) || dataName.includes(loreChar.name.toLowerCase().replace('the ', ''));
    });
  }, [killers, survivors]);
  var toggleRelease = releaseId => {
    triggerHaptic('Light');
    if (expandedRelease === releaseId) {
      setExpandedRelease(null);
      setExpandedCharacter(null);
    } else {
      setExpandedRelease(releaseId);
      setExpandedCharacter(null);
    }
  };
  var toggleCharacter = charKey => {
    triggerHaptic('Light');
    setExpandedCharacter(expandedCharacter === charKey ? null : charKey);
  };
  var openCharacterModal = (loreChar, type) => {
    var fullData = findCharacterData(loreChar, type);
    if (fullData) {
      setSelectedCharacter(_objectSpread(_objectSpread({}, fullData), {}, {
        fogEntry: loreChar.fogEntry,
        type: type === 'killers' ? 'Killer' : 'Survivor'
      }));
    }
  };
  var getTypeBadge = (type, chapterNumber) => {
    switch (type) {
      case 'base':
        return {
          label: 'BASE GAME'
        };
      case 'chapter':
        return {
          label: chapterNumber ? "CH ".concat(chapterNumber) : 'CHAPTER'
        };
      case 'paragraph':
        return {
          label: 'PARAGRAPH'
        };
      default:
        return {
          label: 'RELEASE'
        };
    }
  };
  var CharacterRow = _ref37 => {
    var {
      loreChar,
      type,
      charKey
    } = _ref37;
    var isExpanded = expandedCharacter === charKey;
    var fullData = findCharacterData(loreChar, type);
    var imageUrl = fullData === null || fullData === void 0 ? void 0 : fullData.image;
    var isKiller = type === 'killers';
    return React.createElement("div", {
      className: "mb-2"
    }, React.createElement("button", {
      onClick: () => toggleCharacter(charKey),
      className: "w-full flex items-center gap-3 p-3 rounded-xl transition-colors bg-[var(--panel)] border border-[var(--stroke)]",
      style: isExpanded ? {
        backgroundColor: "".concat(accent, "15"),
        borderColor: "".concat(accent, "30")
      } : {}
    }, React.createElement("div", {
      className: "w-12 h-12 rounded-xl overflow-hidden border flex-shrink-0",
      style: {
        borderColor: isExpanded ? accent : 'rgba(255,255,255,0.1)'
      }
    }, React.createElement(AssetFrame, {
      type: isKiller ? 'Killer' : 'Survivor',
      size: "fill",
      imageUrl: imageUrl,
      fallbackIcon: React.createElement(Icons.User, {
        width: 18,
        height: 18,
        className: "text-zinc-500"
      })
    })), React.createElement("div", {
      className: "flex-1 text-left min-w-0"
    }, React.createElement("div", {
      className: "flex items-center gap-2 flex-wrap"
    }, React.createElement("span", {
      className: "text-white font-semibold text-sm"
    }, loreChar.name), loreChar.licensed && React.createElement("span", {
      className: "px-1.5 py-0.5 rounded text-[9px] uppercase font-bold",
      style: {
        backgroundColor: "".concat(accent, "20"),
        color: accent
      }
    }, "Licensed")), loreChar.realName && loreChar.realName !== loreChar.name && React.createElement("p", {
      className: "text-xs text-zinc-500 truncate"
    }, loreChar.realName)), React.createElement(Icons.ChevronDown, {
      width: 16,
      height: 16,
      className: "text-zinc-500 transition-transform flex-shrink-0",
      style: isExpanded ? {
        color: accent,
        transform: 'rotate(180deg)'
      } : {}
    })), isExpanded && React.createElement("div", {
      className: "mt-2 ml-4 p-4 rounded-xl border animate-fadeIn",
      style: {
        backgroundColor: "".concat(accentSoft, "80"),
        borderColor: "".concat(accent, "20")
      }
    }, React.createElement("p", {
      className: "text-[10px] uppercase tracking-wider font-bold mb-2",
      style: {
        color: accent
      }
    }, "How they entered the fog"), React.createElement("p", {
      className: "text-sm text-zinc-300 leading-relaxed"
    }, loreChar.fogEntry), fullData && React.createElement("button", {
      onClick: e => {
        e.stopPropagation();
        var full = findCharacterData(loreChar, type);
        if (full) setView(type === 'killers' ? 'killer' : 'survivor', {
          id: full.id
        });
      },
      className: "mt-4 w-full py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 border",
      style: {
        backgroundColor: "".concat(accent, "20"),
        borderColor: "".concat(accent, "30"),
        color: accent
      }
    }, React.createElement(Icons.ChevronRight, {
      width: 14,
      height: 14
    }), "View Full Profile")));
  };
  return React.createElement("div", {
    className: "h-full flex flex-col"
  }, React.createElement("div", {
    className: "flex-shrink-0 px-6 pt-6 pb-4"
  }, React.createElement(ViewCrumbs, {
    trail: [{
      label: 'Main page',
      onClick: onBack
    }],
    current: "Chronicle"
  }), React.createElement("h1", {
    className: "cx-title"
  }, "Chronicle"), React.createElement("p", {
    className: "cx-hatnote"
  }, "Releases from June 2016 to the present, most recent first."), React.createElement(WikiHeaderSearchPortal, null, React.createElement("div", {
    className: "relative w-full"
  }, React.createElement("div", {
    className: "absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
  }, React.createElement(Icons.Search, {
    width: 18,
    height: 18
  })), React.createElement("input", {
    type: "text",
    value: search,
    onChange: e => setSearch(e.target.value),
    placeholder: "Search chapters, killers, survivors...",
    className: "w-full bg-[var(--panel)] border border-[var(--stroke)] rounded-xl py-3 pl-12 pr-10 text-white placeholder-zinc-600 text-sm focus:outline-none"
  }), search && React.createElement("button", {
    onClick: () => setSearch(''),
    className: "absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white/5 text-zinc-400 hover:text-white transition-colors"
  }, React.createElement(Icons.X, {
    width: 14,
    height: 14
  }))))), React.createElement("div", {
    ref: scrollRef,
    className: "flex-1 overflow-y-auto px-6 pb-32"
  }, React.createElement("div", {
    className: "flex gap-2 overflow-x-auto hide-scrollbar pb-4"
  }, React.createElement("button", {
    onClick: () => setYearFilter('all'),
    className: "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border",
    style: yearFilter === 'all' ? {
      backgroundColor: accent,
      color: '#000',
      borderColor: accent
    } : {
      backgroundColor: 'transparent',
      color: '#a1a1aa',
      borderColor: 'rgba(255,255,255,0.1)'
    }
  }, "All"), years.map(year => React.createElement("button", {
    key: year,
    onClick: () => setYearFilter(year.toString()),
    className: "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border",
    style: yearFilter === year.toString() ? {
      backgroundColor: accent,
      color: '#000',
      borderColor: accent
    } : {
      backgroundColor: 'transparent',
      color: '#a1a1aa',
      borderColor: 'rgba(255,255,255,0.1)'
    }
  }, year))), releases.length === 0 ? React.createElement("div", {
    className: "flex items-center justify-center h-48"
  }, React.createElement("div", {
    className: "text-center"
  }, React.createElement(Icons.Search, {
    width: 48,
    height: 48,
    className: "mx-auto text-zinc-700 mb-4"
  }), React.createElement("p", {
    className: "text-zinc-500"
  }, "No releases found"), React.createElement("button", {
    onClick: () => {
      setSearch('');
      setYearFilter('all');
    },
    className: "mt-2 text-sm hover:underline",
    style: {
      color: accent
    }
  }, "Clear filters"))) : React.createElement("div", {
    className: "relative"
  }, React.createElement("div", {
    className: "cx-tablewrap"
  }, React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", {
    style: {
      whiteSpace: 'nowrap',
      width: '150px'
    }
  }, "Date"), React.createElement("th", {
    style: {
      width: '260px'
    }
  }, "Release"), React.createElement("th", {
    style: {
      width: '110px'
    }
  }, "Type"), React.createElement("th", null, "Summary"))), React.createElement("tbody", null, releases.map((release, idx) => {
    var _release$killers, _release$survivors, _release$maps, _release$killers2, _release$survivors2, _release$maps2, _release$killers3, _release$survivors3, _release$maps3;
    var isExpanded = expandedRelease === release.id;
    var badge = getTypeBadge(release.type, release.chapterNumber);
    var hasContent = ((_release$killers = release.killers) === null || _release$killers === void 0 ? void 0 : _release$killers.length) > 0 || ((_release$survivors = release.survivors) === null || _release$survivors === void 0 ? void 0 : _release$survivors.length) > 0 || ((_release$maps = release.maps) === null || _release$maps === void 0 ? void 0 : _release$maps.length) > 0;
    var charCount = (((_release$killers2 = release.killers) === null || _release$killers2 === void 0 ? void 0 : _release$killers2.length) || 0) + (((_release$survivors2 = release.survivors) === null || _release$survivors2 === void 0 ? void 0 : _release$survivors2.length) || 0);
    return React.createElement(React.Fragment, {
      key: release.id
    }, React.createElement("tr", {
      onClick: () => hasContent && toggleRelease(release.id),
      className: hasContent ? 'cursor-pointer' : undefined
    }, React.createElement("td", {
      style: {
        whiteSpace: 'nowrap',
        color: 'var(--dim)'
      }
    }, release.displayDate), React.createElement("td", null, React.createElement("button", {
      type: "button",
      className: "cx-alink font-semibold",
      onClick: e => {
        e.stopPropagation();
        setView('release', {
          id: release.id
        });
      }
    }, release.name), release.chapterNumber ? React.createElement("small", {
      style: {
        display: 'block',
        color: 'var(--text-faint)',
        fontSize: '11px'
      }
    }, "Chapter ", release.chapterNumber) : null), React.createElement("td", null, badge.label), React.createElement("td", null, hasContent ? React.createElement("span", {
      style: {
        color: 'var(--dim)'
      }
    }, charCount, " character", charCount !== 1 ? 's' : '', ((_release$maps2 = release.maps) === null || _release$maps2 === void 0 ? void 0 : _release$maps2.length) > 0 ? " \xB7 ".concat(release.maps.length, " map").concat(release.maps.length !== 1 ? 's' : '') : '', ' \u2014 click for details') : release.description ? React.createElement("span", {
      style: {
        color: 'var(--dim)'
      }
    }, String(release.description).slice(0, 160), release.description.length > 160 ? '\u2026' : '') : '\u2014')), isExpanded && hasContent && React.createElement("tr", {
      className: "cx-row-compare"
    }, React.createElement("td", {
      colSpan: 4
    }, release.description && React.createElement("p", {
      style: {
        color: 'var(--text-soft)',
        marginBottom: '12px'
      }
    }, release.description), ((_release$killers3 = release.killers) === null || _release$killers3 === void 0 ? void 0 : _release$killers3.length) > 0 && React.createElement("div", {
      style: {
        marginBottom: '12px'
      }
    }, React.createElement("p", {
      style: {
        fontSize: '10px',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--text-faint)',
        fontWeight: 700,
        marginBottom: '6px'
      }
    }, "Killers (", release.killers.length, ")"), release.killers.map(killer => React.createElement(CharacterRow, {
      key: killer.id,
      loreChar: killer,
      type: "killers",
      charKey: "killer-".concat(killer.id)
    }))), ((_release$survivors3 = release.survivors) === null || _release$survivors3 === void 0 ? void 0 : _release$survivors3.length) > 0 && React.createElement("div", {
      style: {
        marginBottom: '12px'
      }
    }, React.createElement("p", {
      style: {
        fontSize: '10px',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--text-faint)',
        fontWeight: 700,
        marginBottom: '6px'
      }
    }, "Survivors (", release.survivors.length, ")"), release.survivors.map(survivor => React.createElement(CharacterRow, {
      key: survivor.id,
      loreChar: survivor,
      type: "survivors",
      charKey: "survivor-".concat(survivor.id)
    }))), ((_release$maps3 = release.maps) === null || _release$maps3 === void 0 ? void 0 : _release$maps3.length) > 0 && React.createElement("div", null, React.createElement("p", {
      style: {
        fontSize: '10px',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--text-faint)',
        fontWeight: 700,
        marginBottom: '6px'
      }
    }, "Maps (", release.maps.length, ")"), release.maps.map(map => React.createElement("p", {
      key: map.name,
      style: {
        margin: '2px 0',
        color: 'var(--text-soft)'
      }
    }, React.createElement("span", {
      className: "font-semibold text-zinc-100"
    }, map.name), map.realm ? React.createElement("span", {
      style: {
        color: 'var(--text-faint)'
      }
    }, " - ", map.realm) : null))))));
  })))))), selectedCharacter && React.createElement("div", {
    className: "fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center animate-fadeIn",
    onClick: () => setSelectedCharacter(null)
  }, React.createElement("div", {
    className: "w-full max-w-2xl max-h-[85vh] bg-[var(--panel)] border border-[var(--stroke)] rounded-t-xl overflow-hidden animate-slideUp",
    onClick: e => e.stopPropagation()
  }, React.createElement("div", {
    className: "sticky top-0 backdrop-blur-xl border-b p-4 flex items-center gap-4",
    style: {
      backgroundColor: "".concat(accentSoft, "95"),
      borderColor: "".concat(accent, "20")
    }
  }, React.createElement("div", {
    className: "w-14 h-14 rounded-xl overflow-hidden border-2",
    style: {
      borderColor: "".concat(accent, "50")
    }
  }, React.createElement(AssetFrame, {
    type: selectedCharacter.type,
    size: "fill",
    imageUrl: selectedCharacter.image,
    fallbackIcon: React.createElement(Icons.User, {
      width: 20,
      height: 20
    })
  })), React.createElement("div", {
    className: "flex-1"
  }, React.createElement("p", {
    className: "text-[10px] font-bold uppercase tracking-wider",
    style: {
      color: accent
    }
  }, selectedCharacter.type), React.createElement("h2", {
    className: "text-lg font-bold text-white"
  }, selectedCharacter.name), selectedCharacter.realName && selectedCharacter.realName !== selectedCharacter.name && React.createElement("p", {
    className: "text-xs text-zinc-500"
  }, selectedCharacter.realName)), React.createElement("button", {
    onClick: () => setSelectedCharacter(null),
    className: "w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
  }, React.createElement(Icons.X, {
    width: 18,
    height: 18
  }))), React.createElement("div", {
    className: "p-5 pb-20 overflow-y-auto max-h-[calc(85vh-90px)]"
  }, selectedCharacter.fogEntry && React.createElement("div", {
    className: "mb-5"
  }, React.createElement("p", {
    className: "text-[10px] uppercase tracking-wider font-bold mb-2",
    style: {
      color: accent
    }
  }, "How They Entered The Fog"), React.createElement("p", {
    className: "text-zinc-300 text-sm leading-relaxed"
  }, selectedCharacter.fogEntry)), selectedCharacter.lore && React.createElement("div", {
    className: "mb-5"
  }, React.createElement("p", {
    className: "text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-2"
  }, "Full Lore"), React.createElement("p", {
    className: "text-zinc-300 text-sm leading-relaxed whitespace-pre-line"
  }, selectedCharacter.lore)), selectedCharacter.type === 'Killer' && selectedCharacter.power && React.createElement("div", {
    className: "mb-5"
  }, React.createElement("p", {
    className: "text-[10px] uppercase tracking-wider font-bold mb-2",
    style: {
      color: accent
    }
  }, "Power"), React.createElement("p", {
    className: "text-zinc-300 text-sm leading-relaxed"
  }, selectedCharacter.power)), React.createElement("button", {
    onClick: () => {
      setSelectedCharacter(null);
      setView(selectedCharacter.type === 'Killer' ? 'killers' : 'survivors');
    },
    className: "w-full py-2.5 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 border",
    style: {
      backgroundColor: "".concat(accent, "20"),
      borderColor: "".concat(accent, "30"),
      color: accent
    }
  }, "View All ", selectedCharacter.type === 'Killer' ? 'Killers' : 'Survivors')))));
};
var GlossaryView = _ref38 => {
  var {
    onBack
  } = _ref38;
  var scrollRef = useRef(null);
  var [search, setSearch] = useState('');
  var allTerms = useMemo(() => {
    var terms = [];
    GLOSSARY.forEach(section => {
      section.items.forEach(item => {
        terms.push(_objectSpread(_objectSpread({}, item), {}, {
          category: section.section
        }));
      });
    });
    return terms.sort((a, b) => a.term.localeCompare(b.term));
  }, []);
  var filteredTerms = useMemo(() => {
    if (!search.trim()) return allTerms;
    var term = search.toLowerCase();
    return allTerms.filter(t => t.term.toLowerCase().includes(term) || t.def.toLowerCase().includes(term));
  }, [allTerms, search]);
  var groupedTerms = useMemo(() => {
    var groups = {};
    filteredTerms.forEach(t => {
      var letter = t.term.charAt(0).toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(t);
    });
    return groups;
  }, [filteredTerms]);
  var availableLetters = Object.keys(groupedTerms).sort();
  var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  var scrollToLetter = letter => {
    var element = document.getElementById("glossary-".concat(letter));
    if (element && scrollRef.current) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };
  return React.createElement("div", {
    className: "flex h-full pt-6"
  }, React.createElement("div", {
    ref: scrollRef,
    className: "flex-1 overflow-y-auto custom-scrollbar px-6 pb-28 md:pb-8"
  }, React.createElement(ViewCrumbs, {
    trail: [{
      label: 'Main page',
      onClick: onBack
    }],
    current: "Glossary"
  }), React.createElement("h1", {
    className: "cx-title"
  }, "Glossary"), React.createElement("p", {
    className: "cx-hatnote"
  }, "Community terminology and callouts."), React.createElement(WikiHeaderSearchPortal, null, React.createElement("div", {
    className: "relative w-full"
  }, React.createElement("div", {
    className: "absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
  }, React.createElement(Icons.Search, {
    width: 18,
    height: 18
  })), React.createElement("input", {
    value: search,
    onChange: e => setSearch(e.target.value),
    placeholder: "Search terms...",
    className: "w-full bg-[var(--panel)] border border-[var(--stroke)] rounded-xl py-3 pl-12 pr-10 text-white placeholder-zinc-600 text-sm focus:outline-none"
  }), search && React.createElement("button", {
    onClick: () => setSearch(''),
    className: "absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white/5 text-zinc-400 hover:text-white transition-colors"
  }, React.createElement(Icons.X, {
    width: 14,
    height: 14
  })))), React.createElement("div", {
    className: "pb-8 pr-8"
  }, filteredTerms.length === 0 ? React.createElement("div", {
    className: "text-center text-zinc-500 mt-12"
  }, "No terms found.") : availableLetters.map(letter => React.createElement("div", {
    key: letter,
    id: "glossary-".concat(letter)
  }, React.createElement("h3", {
    className: "cx-sub",
    style: {
      borderBottom: '1px solid var(--line-soft)',
      paddingBottom: '4px'
    }
  }, letter, " ", React.createElement("span", {
    style: {
      color: 'var(--text-faint)',
      fontSize: '12px',
      fontWeight: 400
    }
  }, groupedTerms[letter].length)), React.createElement("dl", {
    className: "cx-gloss"
  }, groupedTerms[letter].map(item => React.createElement(React.Fragment, {
    key: item.term
  }, React.createElement("dt", null, item.term), React.createElement("dd", null, item.def)))))))), React.createElement("div", {
    className: "w-6 flex flex-col items-center justify-center py-4 mr-1"
  }, alphabet.map(letter => {
    var hasTerms = availableLetters.includes(letter);
    return React.createElement("button", {
      key: letter,
      onClick: () => hasTerms && scrollToLetter(letter),
      disabled: !hasTerms,
      className: "text-[9px] font-bold py-0.5 px-1 transition-all",
      style: {
        color: hasTerms ? 'var(--accent)' : '#3f3f46',
        opacity: hasTerms ? 1 : 0.4
      }
    }, letter);
  })));
};
var ItemsView = _ref39 => {
  var {
    onBack,
    items = [],
    addons = [],
    killers = [],
    settings = {},
    initialSearch = '',
    initialMode = 'survivor',
    initialTargetId = '',
    initialTargetType = '',
    favoriteItems = [],
    favoriteAddons = [],
    onToggleFavoriteItem,
    onToggleFavoriteAddon
  } = _ref39;
  var [search, setSearch] = useState(initialSearch);
  var [expandedId, setExpandedId] = useState(null);
  var [mode, setMode] = useState(initialMode);
  var [filterType, setFilterType] = useState('All');
  var DEFAULT_ITEM_SORT = {
    key: 'rarity',
    dir: 'desc'
  };
  var [itemSort, setItemSort] = useState(DEFAULT_ITEM_SORT);
  var handleItemSort = (key, defaultDir) => {
    setItemSort(prev => {
      if (prev.key !== key) return {
        key,
        dir: defaultDir
      };
      if (prev.dir === defaultDir) return {
        key,
        dir: defaultDir === 'asc' ? 'desc' : 'asc'
      };
      return _objectSpread({}, DEFAULT_ITEM_SORT);
    });
  };
  var itemCardRefs = useRef({});
  var killerCardRefs = useRef({});
  var addonRefs = useRef({});
  var bloodwebItems = useMemo(() => {
    return (items || []).filter(i => i.bloodweb === true && i.role === 'survivor');
  }, [items]);
  var itemTypes = useMemo(() => {
    var types = new Set();
    bloodwebItems.forEach(i => {
      if (i.itemType) types.add(i.itemType);
    });
    return ['All', ...Array.from(types).sort()];
  }, [bloodwebItems]);
  var survivorAddons = useMemo(() => {
    return (addons || []).filter(a => a.role === 'survivor');
  }, [addons]);
  var killerAddons = useMemo(() => {
    return (addons || []).filter(a => a.role === 'killer');
  }, [addons]);
  var targetItem = useMemo(() => initialTargetType === 'item' ? bloodwebItems.find(item => item.id === initialTargetId) || null : null, [initialTargetType, initialTargetId, bloodwebItems]);
  var targetAddon = useMemo(() => initialTargetType === 'addon' ? (addons || []).find(addon => addon.id === initialTargetId) || null : null, [initialTargetType, initialTargetId, addons]);
  var filteredItems = useMemo(() => {
    var term = search.toLowerCase();
    var result = bloodwebItems.filter(item => {
      var matchType = filterType === 'All' || item.itemType === filterType;
      if (!matchType) return false;
      if (!term) return true;
      if (item.name.toLowerCase().includes(term)) return true;
      var iAddons = survivorAddons.filter(a => a.itemType === item.itemType);
      return iAddons.some(a => a.name.toLowerCase().includes(term));
    });
    if (itemSort.key === 'rarity') {
      var dirMul = itemSort.dir === 'asc' ? 1 : -1;
      result = result.slice().sort((a, b) => dirMul * (getRarityOrder(a.rarity) - getRarityOrder(b.rarity)) || a.name.localeCompare(b.name));
    } else if (itemSort.key === 'name') result = result.slice().sort((a, b) => (itemSort.dir === 'asc' ? 1 : -1) * a.name.localeCompare(b.name));
    return result;
  }, [bloodwebItems, survivorAddons, search, filterType, itemSort]);
  var filteredKillers = useMemo(() => {
    var term = search.toLowerCase();
    if (!term) return killers || [];
    return (killers || []).filter(k => {
      if (k.name.toLowerCase().includes(term)) return true;
      var kAddons = killerAddons.filter(a => a.killerName === k.name);
      return kAddons.some(a => a.name.toLowerCase().includes(term));
    });
  }, [killers, killerAddons, search]);
  var getAddonsForItemType = itemType => {
    if (!itemType) return [];
    var result = survivorAddons.filter(a => a.itemType === itemType);
    return result.slice().sort((a, b) => getRarityOrder(b.rarity) - getRarityOrder(a.rarity));
  };
  var getAddonsForKiller = killer => {
    return killerAddons.filter(a => a.killerName === killer.name).sort((a, b) => getRarityOrder(b.rarity) - getRarityOrder(a.rarity));
  };
  var targetSurvivorAddonHostItem = useMemo(() => {
    if (!targetAddon || targetAddon.role !== 'survivor') return null;
    return filteredItems.find(item => item.itemType === targetAddon.itemType) || bloodwebItems.find(item => item.itemType === targetAddon.itemType) || null;
  }, [targetAddon, filteredItems, bloodwebItems]);
  var targetKillerAddonHost = useMemo(() => {
    if (!targetAddon || targetAddon.role !== 'killer') return null;
    return (killers || []).find(killer => killer.name === targetAddon.killerName) || null;
  }, [targetAddon, killers]);
  useEffect(() => {
    setSearch(initialSearch || '');
  }, [initialSearch]);
  useEffect(() => {
    setMode(initialMode || 'survivor');
  }, [initialMode]);
  useEffect(() => {
    if (initialTargetType === 'item' && targetItem) {
      setMode('survivor');
      setExpandedId(targetItem.id);
      return;
    }
    if (initialTargetType === 'addon' && targetAddon) {
      if (targetAddon.role === 'killer' && targetKillerAddonHost) {
        setMode('killer');
        setExpandedId(targetKillerAddonHost.id);
        return;
      }
      if (targetAddon.role === 'survivor' && targetSurvivorAddonHostItem) {
        setMode('survivor');
        setExpandedId(targetSurvivorAddonHostItem.id);
      }
    }
  }, [initialTargetType, targetItem, targetAddon, targetKillerAddonHost, targetSurvivorAddonHostItem]);
  useEffect(() => {
    var node = null;
    if (initialTargetType === 'item' && targetItem && mode === 'survivor' && expandedId === targetItem.id) {
      node = itemCardRefs.current[targetItem.id] || null;
    } else if (initialTargetType === 'addon' && targetAddon) {
      if (targetAddon.role === 'killer' && mode === 'killer' && targetKillerAddonHost && expandedId === targetKillerAddonHost.id) {
        node = addonRefs.current[targetAddon.id] || killerCardRefs.current[targetKillerAddonHost.id] || null;
      } else if (targetAddon.role === 'survivor' && mode === 'survivor' && targetSurvivorAddonHostItem && expandedId === targetSurvivorAddonHostItem.id) {
        node = addonRefs.current[targetAddon.id] || itemCardRefs.current[targetSurvivorAddonHostItem.id] || null;
      }
    }
    if (!node) return undefined;
    var raf = window.requestAnimationFrame(() => {
      node.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [initialTargetType, targetItem, targetAddon, targetKillerAddonHost, targetSurvivorAddonHostItem, mode, expandedId, filteredItems, filteredKillers]);
  return React.createElement("div", {
    className: "flex flex-col h-full pt-6 pb-32 px-6 overflow-y-auto custom-scrollbar"
  }, React.createElement(ViewCrumbs, {
    trail: [{
      label: 'Main page',
      onClick: onBack
    }],
    current: "Items & Addons"
  }), React.createElement("h1", {
    className: "cx-title"
  }, "Items & Addons"), React.createElement("p", {
    className: "cx-hatnote"
  }, "Survivor items, Killer powers, and their add-ons."), React.createElement(WikiHeaderSearchPortal, null, React.createElement("div", {
    className: "relative w-full"
  }, React.createElement("div", {
    className: "absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
  }, React.createElement(Icons.Search, {
    width: 18,
    height: 18
  })), React.createElement("input", {
    value: search,
    onChange: e => setSearch(e.target.value),
    placeholder: "Search...",
    className: "w-full bg-[var(--panel)] border border-[var(--stroke)] rounded-xl py-3 pl-12 pr-10 text-white placeholder-zinc-600 text-sm focus:outline-none"
  }), search && React.createElement("button", {
    onClick: () => setSearch(''),
    className: "absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white/5 text-zinc-400 hover:text-white transition-colors"
  }, React.createElement(Icons.X, {
    width: 14,
    height: 14
  })))), React.createElement("div", {
    className: "max-w-3xl mx-auto flex flex-wrap justify-center gap-2 mb-4"
  }, React.createElement("button", {
    onClick: () => {
      setMode('survivor');
      setExpandedId(null);
    },
    className: "px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all " + (mode === 'survivor' ? 'bg-zinc-100 text-black border border-zinc-100' : 'bg-white/5 text-zinc-400 border border-white/10')
  }, "Survivor Items"), React.createElement("button", {
    onClick: () => {
      setMode('killer');
      setExpandedId(null);
    },
    className: "px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all " + (mode === 'killer' ? 'bg-zinc-500/20 text-zinc-100 border border-white/25/40' : 'bg-white/5 text-zinc-400 border border-white/10')
  }, "Killer Addons")), mode === 'survivor' && React.createElement("div", {
    className: "max-w-3xl mx-auto flex flex-wrap justify-center gap-2 mb-4"
  }, React.createElement("select", {
    value: filterType,
    onChange: e => setFilterType(e.target.value),
    className: "themed-select compact text-sm"
  }, itemTypes.map(t => React.createElement("option", {
    key: t,
    value: t
  }, t === 'All' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)))), React.createElement("span", {
    className: "text-[11px] text-zinc-500 uppercase tracking-wider self-center"
  }, filteredItems.length, " items")), React.createElement("div", {
    className: "pb-32 space-y-3 -mx-6 px-6"
  }, mode === 'survivor' && (filteredItems.length === 0 ? React.createElement("div", {
    className: "text-center text-zinc-500 mt-12"
  }, "No items found.") : React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement(SortTh, {
    label: "Item",
    sortKey: "name",
    activeKey: itemSort.key,
    dir: itemSort.dir,
    defaultDir: "asc",
    onSort: handleItemSort
  }), React.createElement(SortTh, {
    label: "Rarity",
    sortKey: "rarity",
    activeKey: itemSort.key,
    dir: itemSort.dir,
    defaultDir: "desc",
    onSort: handleItemSort
  }), React.createElement("th", null, "Effect"), React.createElement("th", {
    "aria-hidden": "true"
  }))), React.createElement("tbody", null, filteredItems.map(item => {
    var isExpanded = expandedId === item.id;
    var itemAddons = getAddonsForItemType(item.itemType);
    return React.createElement(React.Fragment, {
      key: item.id
    }, React.createElement("tr", {
      "data-smoke-target": initialTargetType === 'item' && initialTargetId === item.id ? 'true' : undefined,
      ref: node => {
        if (node) itemCardRefs.current[item.id] = node;else delete itemCardRefs.current[item.id];
      },
      onClick: () => setExpandedId(isExpanded ? null : item.id),
      className: "cursor-pointer ".concat(initialTargetType === 'item' && initialTargetId === item.id ? 'border-white/15 shadow-[0_0_0_1px_rgba(34,211,238,0.12)]' : 'border-white/5')
    }, React.createElement("td", {
      className: "cx-perkcell"
    }, React.createElement("div", {
      className: "cx-perkcell-inner"
    }, React.createElement("div", {
      style: {
        width: 44,
        height: 44,
        overflow: 'hidden',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, React.createElement(AssetFrame, {
      type: "Item",
      imageUrl: item.image,
      fallbackIcon: React.createElement(Icons.Package, {
        width: 24,
        height: 24,
        className: "text-white/40"
      }),
      size: "fill"
    })), React.createElement("span", null, React.createElement("span", {
      className: "font-semibold text-zinc-100"
    }, item.name), React.createElement("small", null, item.itemType ? item.itemType.charAt(0).toUpperCase() + item.itemType.slice(1) : 'Item')))), React.createElement("td", {
      className: "cx-rarity"
    }, formatRarity(item.rarity)), React.createElement("td", null, item.description ? stripHtml(item.description) : '\u2014'), React.createElement("td", {
      className: "cx-star"
    }, onToggleFavoriteItem && React.createElement("button", {
      type: "button",
      onClick: e => {
        e.stopPropagation();
        onToggleFavoriteItem(item.id);
      },
      "aria-label": "Toggle favorite",
      className: favoriteItems.includes(item.id) ? 'cx-star-on' : undefined
    }, favoriteItems.includes(item.id) ? '\u2605' : '\u2606'))), isExpanded && itemAddons.length > 0 && React.createElement("tr", {
      key: item.id + '-addons'
    }, React.createElement("td", {
      colSpan: 4
    }, React.createElement("p", {
      className: "text-xs text-zinc-500 font-bold uppercase mb-2"
    }, "Compatible Add-ons (", itemAddons.length, ")"), React.createElement("table", {
      className: "cx-wikitable"
    }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", {
      style: {
        paddingLeft: '58px',
        whiteSpace: 'nowrap'
      }
    }, "Add-on"), React.createElement("th", {
      style: {
        width: '76px'
      }
    }, "Image"), React.createElement("th", null, "Rarity"), React.createElement("th", null, "Effect"), React.createElement("th", {
      "aria-hidden": "true"
    }))), React.createElement("tbody", null, itemAddons.map(addon => React.createElement("tr", {
      key: addon.id,
      "data-smoke-target": initialTargetType === 'addon' && initialTargetId === addon.id ? 'true' : undefined,
      ref: node => {
        if (node) addonRefs.current[addon.id] = node;else delete addonRefs.current[addon.id];
      },
      className: "".concat(initialTargetType === 'addon' && initialTargetId === addon.id ? 'bg-white/5 border-white/15' : 'bg-white/5 border-white/5')
    }, React.createElement("td", {
      className: "cx-perkcell"
    }, React.createElement("span", null, React.createElement("span", {
      className: "font-semibold text-zinc-100"
    }, addon.name))), React.createElement("td", null, React.createElement("div", {
      style: {
        width: 44,
        height: 44,
        overflow: 'hidden',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, React.createElement(AssetFrame, {
      type: "Addon",
      imageUrl: addon.image,
      fallbackIcon: React.createElement(Icons.Package, {
        width: 24,
        height: 24,
        className: "text-white/40"
      }),
      size: "fill",
      imageLoading: "lazy"
    }))), React.createElement("td", {
      className: "cx-rarity"
    }, formatRarity(addon.rarity)), React.createElement("td", {
      style: {
        color: 'var(--dim)'
      }
    }, addon.description ? stripHtml(addon.description) : '\u2014'), React.createElement("td", {
      className: "cx-star"
    }, onToggleFavoriteAddon && React.createElement("button", {
      type: "button",
      onClick: e => {
        e.stopPropagation();
        onToggleFavoriteAddon(addon.id);
      },
      "aria-label": "Toggle favorite",
      className: favoriteAddons.includes(addon.id) ? 'cx-star-on' : undefined
    }, favoriteAddons.includes(addon.id) ? '\u2605' : '\u2606')))))))), isExpanded && itemAddons.length === 0 && React.createElement("tr", {
      key: item.id + '-noaddons'
    }, React.createElement("td", {
      colSpan: 4
    }, React.createElement("p", {
      className: "text-zinc-600 text-xs"
    }, "No addons for this item type."))));
  })))), mode === 'killer' && (filteredKillers.length === 0 ? React.createElement("div", {
    className: "text-center text-zinc-500 mt-12"
  }, "No killers found.") : React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "Killer"), React.createElement("th", null, "Add-ons"))), React.createElement("tbody", null, filteredKillers.map(killer => {
    var isExpanded = expandedId === killer.id;
    var powerAddons = getAddonsForKiller(killer);
    return React.createElement(React.Fragment, {
      key: killer.id
    }, React.createElement("tr", {
      "data-smoke-target": initialTargetType === 'addon' && (targetAddon === null || targetAddon === void 0 ? void 0 : targetAddon.role) === 'killer' && (targetKillerAddonHost === null || targetKillerAddonHost === void 0 ? void 0 : targetKillerAddonHost.id) === killer.id ? 'true' : undefined,
      ref: node => {
        if (node) killerCardRefs.current[killer.id] = node;else delete killerCardRefs.current[killer.id];
      },
      onClick: () => setExpandedId(isExpanded ? null : killer.id),
      className: "cursor-pointer ".concat(initialTargetType === 'addon' && (targetAddon === null || targetAddon === void 0 ? void 0 : targetAddon.role) === 'killer' && (targetKillerAddonHost === null || targetKillerAddonHost === void 0 ? void 0 : targetKillerAddonHost.id) === killer.id ? 'border-white/15 shadow-[0_0_0_1px_rgba(34,211,238,0.12)]' : 'border-white/5')
    }, React.createElement("td", {
      className: "cx-perkcell"
    }, React.createElement("div", {
      className: "cx-perkcell-inner"
    }, React.createElement("div", {
      style: {
        width: 44,
        height: 44,
        overflow: 'hidden',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, React.createElement(AssetFrame, {
      type: "Killer",
      size: "fill",
      imageUrl: killer.image,
      fallbackIcon: React.createElement(Icons.User, {
        width: 28,
        height: 28,
        className: "text-zinc-500"
      })
    })), React.createElement("span", null, React.createElement("span", {
      className: "font-semibold text-zinc-100"
    }, killer.name), killer.realName && killer.realName !== killer.name ? React.createElement("small", null, killer.realName) : null))), React.createElement("td", null, powerAddons.length, " add-ons")), isExpanded && powerAddons.length > 0 && React.createElement("tr", {
      key: killer.id + '-addons'
    }, React.createElement("td", {
      colSpan: 2
    }, React.createElement("p", {
      className: "text-xs text-zinc-500 font-bold uppercase mb-2"
    }, "Power Add-ons"), React.createElement("table", {
      className: "cx-wikitable"
    }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", {
      style: {
        paddingLeft: '58px',
        whiteSpace: 'nowrap'
      }
    }, "Add-on"), React.createElement("th", {
      style: {
        width: '76px'
      }
    }, "Image"), React.createElement("th", null, "Rarity"), React.createElement("th", null, "Effect"), React.createElement("th", {
      "aria-hidden": "true"
    }))), React.createElement("tbody", null, powerAddons.map(addon => React.createElement("tr", {
      key: addon.id,
      "data-smoke-target": initialTargetType === 'addon' && initialTargetId === addon.id ? 'true' : undefined,
      ref: node => {
        if (node) addonRefs.current[addon.id] = node;else delete addonRefs.current[addon.id];
      },
      className: "".concat(initialTargetType === 'addon' && initialTargetId === addon.id ? 'bg-white/5 border-white/15' : 'bg-white/5 border-white/5')
    }, React.createElement("td", {
      className: "cx-perkcell"
    }, React.createElement("span", null, React.createElement("span", {
      className: "font-semibold text-zinc-100"
    }, addon.name))), React.createElement("td", null, React.createElement("div", {
      style: {
        width: 44,
        height: 44,
        overflow: 'hidden',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, React.createElement(AssetFrame, {
      type: "Addon",
      imageUrl: addon.image,
      fallbackIcon: React.createElement(Icons.Package, {
        width: 24,
        height: 24,
        className: "text-white/40"
      }),
      size: "fill",
      imageLoading: "lazy"
    }))), React.createElement("td", {
      className: "cx-rarity"
    }, formatRarity(addon.rarity)), React.createElement("td", {
      style: {
        color: 'var(--dim)'
      }
    }, addon.description ? stripHtml(addon.description) : '\u2014'), React.createElement("td", {
      className: "cx-star"
    }, onToggleFavoriteAddon && React.createElement("button", {
      type: "button",
      onClick: e => {
        e.stopPropagation();
        onToggleFavoriteAddon(addon.id);
      },
      "aria-label": "Toggle favorite",
      className: favoriteAddons.includes(addon.id) ? 'cx-star-on' : undefined
    }, favoriteAddons.includes(addon.id) ? '\u2605' : '\u2606')))))))), isExpanded && powerAddons.length === 0 && React.createElement("tr", {
      key: killer.id + '-noaddons'
    }, React.createElement("td", {
      colSpan: 2
    }, React.createElement("p", {
      className: "text-zinc-600 text-xs"
    }, "No addons found for this killer's power."))));
  }))))));
};
var OfferingsView = _ref40 => {
  var {
    onBack,
    offerings = [],
    initialSearch = '',
    initialTargetId = '',
    favoriteOfferings = [],
    onToggleFavoriteOffering
  } = _ref40;
  var [search, setSearch] = useState(initialSearch);
  var [filterRole, setFilterRole] = useState('All');
  var [filterSecret, setFilterSecret] = useState(false);
  var [sortBy, setSortBy] = useState('rarity');
  var [expandedId, setExpandedId] = useState(null);
  var offeringRefs = useRef({});
  var getRoleColor = role => {
    if (!role || role === 'universal') return '#a1a1aa';
    return role === 'killer' ? '#fafafa' : '#a1a1aa';
  };
  var formatRole = role => {
    if (!role) return 'Universal';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };
  var active = useMemo(() => {
    return (offerings || []).filter(o => !o.retired);
  }, [offerings]);
  var targetOffering = useMemo(() => active.find(offering => offering.id === initialTargetId) || null, [active, initialTargetId]);
  var filtered = useMemo(() => {
    var term = search.toLowerCase();
    var result = active.filter(o => {
      var matchSearch = !term || o.name.toLowerCase().includes(term) || (o.description || '').toLowerCase().includes(term);
      var role = o.role || 'universal';
      var matchRole = filterRole === 'All' || role === filterRole.toLowerCase();
      var matchSecret = !filterSecret || o.secret;
      return matchSearch && matchRole && matchSecret;
    });
    if (sortBy === 'rarity') {
      result = result.slice().sort((a, b) => getRarityOrder(b.rarity) - getRarityOrder(a.rarity));
    } else if (sortBy === 'name') {
      result = result.slice().sort((a, b) => a.name.localeCompare(b.name));
    }
    return result;
  }, [active, search, filterRole, sortBy]);
  useEffect(() => {
    setSearch(initialSearch || '');
  }, [initialSearch]);
  useEffect(() => {
    if (!targetOffering) return;
    setExpandedId(targetOffering.id);
  }, [targetOffering]);
  useEffect(() => {
    if (!targetOffering || expandedId !== targetOffering.id || !filtered.some(offering => offering.id === targetOffering.id)) return undefined;
    var node = offeringRefs.current[targetOffering.id];
    if (!node) return undefined;
    var raf = window.requestAnimationFrame(() => {
      node.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [targetOffering, expandedId, filtered]);
  return React.createElement("div", {
    className: "flex flex-col h-full pt-6 pb-32 px-6 overflow-y-auto custom-scrollbar"
  }, React.createElement(ViewCrumbs, {
    trail: [{
      label: 'Main page',
      onClick: onBack
    }],
    current: "Offerings"
  }), React.createElement("h1", {
    className: "cx-title"
  }, "Offerings"), React.createElement("p", {
    className: "cx-hatnote"
  }, "Offerings for the Entity, by rarity."), React.createElement(WikiHeaderSearchPortal, null, React.createElement("div", {
    className: "relative w-full"
  }, React.createElement("div", {
    className: "absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
  }, React.createElement(Icons.Search, {
    width: 18,
    height: 18
  })), React.createElement("input", {
    value: search,
    onChange: e => setSearch(e.target.value),
    placeholder: "Search...",
    className: "w-full bg-[var(--panel)] border border-[var(--stroke)] rounded-xl py-3 pl-12 pr-10 text-white placeholder-zinc-600 text-sm focus:outline-none"
  }), search && React.createElement("button", {
    onClick: () => setSearch(''),
    className: "absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white/5 text-zinc-400 hover:text-white transition-colors"
  }, React.createElement(Icons.X, {
    width: 14,
    height: 14
  })))), React.createElement("div", {
    className: "max-w-3xl mx-auto flex flex-wrap justify-center gap-2 mb-4"
  }, ['All', 'Killer', 'Survivor', 'Universal'].map(opt => React.createElement("button", {
    key: opt,
    type: "button",
    onClick: () => setFilterRole(opt),
    className: "mode-choice px-4 py-2 text-xs font-bold ".concat(filterRole === opt ? 'mode-choice--active' : '')
  }, opt)), React.createElement("button", {
    type: "button",
    onClick: () => setFilterSecret(!filterSecret),
    className: "mode-choice px-4 py-2 text-xs font-bold ".concat(filterSecret ? 'mode-choice--active' : '')
  }, "Secret"), React.createElement("select", {
    value: sortBy,
    onChange: e => setSortBy(e.target.value),
    className: "themed-select compact text-sm ml-2"
  }, React.createElement("option", {
    value: "rarity"
  }, "Sort by Rarity"), React.createElement("option", {
    value: "name"
  }, "Sort A-Z")), React.createElement("span", {
    className: "text-[11px] text-zinc-500 uppercase tracking-wider self-center ml-2"
  }, filtered.length, " offerings")), React.createElement("div", {
    className: "pb-32 space-y-3 -mx-6 px-6"
  }, filtered.length === 0 && React.createElement("div", {
    className: "text-center text-zinc-500 mt-12"
  }, "No offerings found."), React.createElement("div", {
    className: "cx-tablewrap"
  }, React.createElement("table", {
    className: "cx-wikitable cx-offerings-table",
    style: {
      tableLayout: 'fixed',
      width: '100%'
    }
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", {
    style: {
      width: '300px'
    }
  }, "Offering"), React.createElement("th", {
    style: {
      width: '90px'
    }
  }, "Role"), React.createElement("th", {
    style: {
      width: '100px'
    }
  }, "Rarity"), React.createElement("th", null, "Effect"), React.createElement("th", {
    "aria-hidden": "true",
    style: {
      width: '40px'
    }
  }))), React.createElement("tbody", null, filtered.map(offering => {
    var isExpanded = expandedId === offering.id;
    return React.createElement("tr", {
      key: offering.id,
      "data-smoke-target": initialTargetId === offering.id ? 'true' : undefined,
      ref: node => {
        if (node) offeringRefs.current[offering.id] = node;else delete offeringRefs.current[offering.id];
      }
    }, React.createElement("td", {
      className: "cx-perkcell"
    }, React.createElement("div", {
      className: "cx-perkcell-inner"
    }, React.createElement("div", {
      style: {
        width: 64,
        height: 64,
        overflow: 'hidden',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, React.createElement(AssetFrame, {
      type: "Offering",
      imageUrl: offering.image,
      fallbackIcon: React.createElement(Icons.Flame, {
        width: 24,
        height: 24,
        className: "text-white/40"
      }),
      size: "fill",
      imageLoading: "lazy"
    })), React.createElement("span", null, React.createElement("span", {
      className: "font-semibold text-zinc-100"
    }, offering.name)))), React.createElement("td", {
      style: {
        whiteSpace: 'nowrap'
      }
    }, formatRole(offering.role)), React.createElement("td", {
      className: "cx-rarity",
      style: {
        whiteSpace: 'nowrap'
      }
    }, formatRarity(offering.rarity)), React.createElement("td", {
      style: {
        overflowWrap: 'break-word',
        wordBreak: 'break-word'
      }
    }, offering.description || '\u2014'), React.createElement("td", {
      className: "cx-star"
    }, onToggleFavoriteOffering && React.createElement("button", {
      type: "button",
      onClick: e => {
        e.stopPropagation();
        onToggleFavoriteOffering(offering.id);
      },
      "aria-label": "Toggle favorite",
      className: favoriteOfferings.includes(offering.id) ? 'cx-star-on' : undefined
    }, favoriteOfferings.includes(offering.id) ? '\u2605' : '\u2606')));
  }))))));
};
var compareUiText = (left, right) => String(left || '').localeCompare(String(right || ''), undefined, {
  sensitivity: 'base'
});
var getOutfitLinkModeLabel = mode => {
  switch (String(mode || '').toLowerCase()) {
    case 'linked':
      return 'Linked Outfit';
    case 'partially_linked':
      return 'Partial Link';
    case 'unlinked':
      return 'Unlinked Outfit';
    case 'character_swap':
      return 'Character swaps';
    default:
      return 'Outfit';
  }
};
var getOutfitLinkModeChipClasses = mode => {
  switch (String(mode || '').toLowerCase()) {
    case 'linked':
      return 'bg-white/10 text-zinc-100 border-white/20';
    case 'partially_linked':
      return 'bg-white/5 text-zinc-300 border-white/15';
    case 'unlinked':
      return 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20';
    case 'character_swap':
      return 'bg-white/5 text-zinc-300 border-white/15';
    default:
      return 'bg-white/5 text-zinc-300 border-white/10';
  }
};
var normalizeRarityKeyForSort = rarity => {
  var normalized = String(rarity || '').toLowerCase().replace(/[^a-z]+/g, '');
  if (normalized === 'common') return 'common';
  if (normalized === 'uncommon') return 'uncommon';
  if (normalized === 'rare') return 'rare';
  if (normalized === 'veryrare') return 'veryrare';
  if (['ultrarare', 'iridescent', 'visceral'].includes(normalized)) return 'ultrarare';
  if (normalized === 'legendary') return 'legendary';
  if (normalized === 'event') return 'event';
  return 'other';
};
var raritySortRank = rarity => {
  var _order$key;
  var key = normalizeRarityKeyForSort(rarity);
  var order = {
    common: 0,
    uncommon: 1,
    rare: 2,
    veryrare: 3,
    ultrarare: 4,
    legendary: 5,
    event: 6,
    other: 7
  };
  return (_order$key = order[key]) !== null && _order$key !== void 0 ? _order$key : order.other;
};
var sortCosmeticsByRarity = function sortCosmeticsByRarity() {
  var entries = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  return [...entries].sort((left, right) => {
    return raritySortRank(left.rarity) - raritySortRank(right.rarity) || compareUiText(left.rarity, right.rarity) || compareUiText(left.name, right.name) || compareUiText(left.baseCharacterName, right.baseCharacterName);
  });
};
var CosmeticCard = _ref41 => {
  var {
    entry,
    accentColor = 'var(--accent)',
    focused = false,
    onOpen,
    assetRevision = 0,
    eagerImage = false
  } = _ref41;
  if (!entry) return null;
  var isCharacterSwap = entry.isCharacterSwap === true || String(entry.outfitLinkMode || '').toLowerCase() === 'character_swap';
  var outfitLinkMode = String(entry.outfitLinkMode || (isCharacterSwap ? 'character_swap' : 'unlinked')).toLowerCase();
  var boundSlotsLabel = entry.bindSummary || (Array.isArray(entry.boundSlots) ? entry.boundSlots.join(' + ') : '');
  var collectionLabel = isCharacterSwap ? entry.groupLabel || 'Character swaps' : entry.collectionName || entry.sourceBucket || entry.groupLabel || 'Cosmetic';
  var pieceLabel = entry.pieceType || (isCharacterSwap ? 'Outfit' : 'Cosmetic');
  var roleChipClasses = entry.baseCharacterType === 'Killer' ? 'bg-white/10 text-zinc-100 border-white/20' : 'bg-white/5 text-zinc-300 border-white/10';
  var badgeStyle = {
    borderColor: "".concat(accentColor, "30"),
    color: focused ? accentColor : 'var(--cos-name)',
    backgroundColor: focused ? "".concat(accentColor, "16") : 'rgba(255,255,255,0.04)'
  };
  return React.createElement("div", {
    "data-smoke-target": focused ? 'true' : undefined,
    className: typeof onOpen === 'function' ? 'cx-coscard cursor-pointer h-full flex flex-col' : 'cx-coscard h-full flex flex-col',
    onClick: typeof onOpen === 'function' ? () => onOpen(entry) : undefined,
    style: focused ? {
      outline: '1px solid var(--link)',
      outlineOffset: '2px'
    } : undefined
  }, React.createElement("div", {
    className: "".concat(isCharacterSwap ? 'aspect-[3/4]' : 'aspect-square', " cx-cosimg")
  }, React.createElement(AssetFrame, {
    type: isCharacterSwap ? entry.baseCharacterType : 'Image',
    size: "fill",
    imageUrl: entry.image,
    assetRevision: assetRevision,
    imageLoading: eagerImage ? 'eager' : 'lazy',
    fallbackIcon: isCharacterSwap ? React.createElement(Icons.User, {
      width: 24,
      height: 24,
      className: "text-zinc-500"
    }) : React.createElement(Icons.Image, {
      width: 24,
      height: 24,
      className: "text-zinc-500"
    })
  })), React.createElement("div", {
    className: "flex flex-1 flex-col gap-1 pt-2"
  }, React.createElement("p", {
    className: "text-sm font-semibold text-zinc-100 leading-tight"
  }, entry.name), React.createElement("p", {
    className: "text-xs",
    style: {
      color: 'var(--dim)'
    }
  }, entry.baseCharacterName), React.createElement("p", {
    className: "text-[11px]",
    style: {
      color: 'var(--text-faint)'
    }
  }, entry.rarity ? "".concat(entry.rarity, " \xB7 ") : '', collectionLabel, !isCharacterSwap && boundSlotsLabel && pieceLabel === 'Outfit' ? " \xB7 Binds: ".concat(boundSlotsLabel) : ''), focused && React.createElement("p", {
    className: "text-[10px] uppercase tracking-[0.18em] font-bold",
    style: {
      color: 'var(--link)'
    }
  }, "Search match")));
};
var CosmeticsView = _ref42 => {
  var {
    onBack,
    cosmeticsCatalog = {
      characterSwaps: [],
      fullSets: []
    },
    onOpenCosmetic,
    fullSetPackState = defaultCosmeticsFullSetPackState(),
    fullSetCatalogCount = 0,
    onRefreshFullSetPack = null,
    cosmeticsAssetRevision = 0
  } = _ref42;
  var [search, setSearch] = useState('');
  var [roleFilter, setRoleFilter] = useState('Killer');
  var [characterFilter, setCharacterFilter] = useState('__all__');
  var COSMETICS_PAGE_SIZE = 120;
  var [visibleCosmeticCount, setVisibleCosmeticCount] = useState(COSMETICS_PAGE_SIZE);
  useEffect(() => {
    setVisibleCosmeticCount(COSMETICS_PAGE_SIZE);
  }, [roleFilter, characterFilter, search]);
  var readyCharacterSwaps = useMemo(() => Array.isArray(cosmeticsCatalog.characterSwaps) ? cosmeticsCatalog.characterSwaps.filter(entry => entry.status === 'ready').map(entry => _objectSpread(_objectSpread({}, entry), {}, {
    isCharacterSwap: true
  })) : [], [cosmeticsCatalog]);
  var readyCosmeticEntries = useMemo(() => Array.isArray(cosmeticsCatalog.fullSets) ? cosmeticsCatalog.fullSets.filter(entry => entry.status === 'ready').map(entry => _objectSpread(_objectSpread({}, entry), {}, {
    isCharacterSwap: Boolean(entry.isCharacterSwap)
  })) : [], [cosmeticsCatalog]);
  var readyCosmetics = useMemo(() => [...readyCharacterSwaps, ...readyCosmeticEntries], [readyCharacterSwaps, readyCosmeticEntries]);
  var roleCharacters = useMemo(() => {
    var grouped = readyCosmetics.filter(entry => entry.baseCharacterType === roleFilter).reduce((acc, entry) => {
      if (!acc[entry.baseCharacterId]) acc[entry.baseCharacterId] = entry.baseCharacterName;
      return acc;
    }, {});
    return Object.entries(grouped).map(_ref43 => {
      var [id, name] = _ref43;
      return {
        id,
        name
      };
    }).sort((left, right) => compareUiText(left.name, right.name));
  }, [readyCosmetics, roleFilter]);
  useEffect(() => {
    if (characterFilter === '__all__') return;
    if (!roleCharacters.some(character => character.id === characterFilter)) {
      setCharacterFilter('__all__');
    }
  }, [characterFilter, roleCharacters]);
  var matchesQuery = (entry, term) => {
    if (!term) return true;
    var haystack = [entry.name, entry.baseCharacterName, entry.groupLabel, entry.pieceType, entry.sourceBucket, entry.collectionName, entry.rarity, entry.outfitLinkMode, entry.bindSummary, entry.description, ...(entry.boundSlots || []), ...(entry.aliases || [])].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(term);
  };
  var filteredCosmetics = useMemo(() => {
    var term = search.trim().toLowerCase();
    return sortCosmeticsByRarity(readyCosmetics.filter(entry => {
      if (entry.baseCharacterType !== roleFilter) return false;
      if (characterFilter !== '__all__' && entry.baseCharacterId !== characterFilter) return false;
      return matchesQuery(entry, term);
    }));
  }, [readyCosmetics, roleFilter, characterFilter, search]);
  var groupedByRarity = useMemo(() => {
    var buckets = filteredCosmetics.reduce((acc, entry) => {
      var key = entry.rarity || 'Unknown';
      if (!acc[key]) acc[key] = [];
      acc[key].push(entry);
      return acc;
    }, {});
    return Object.entries(buckets).map(_ref44 => {
      var [label, entries] = _ref44;
      return {
        label,
        entries: sortCosmeticsByRarity(entries)
      };
    }).sort((left, right) => raritySortRank(left.label) - raritySortRank(right.label) || compareUiText(left.label, right.label));
  }, [filteredCosmetics]);
  var windowedGroups = useMemo(() => {
    var remaining = visibleCosmeticCount;
    var out = [];
    for (var group of groupedByRarity) {
      if (remaining <= 0) break;
      var slice = group.entries.slice(0, remaining);
      out.push(_objectSpread(_objectSpread({}, group), {}, {
        entries: slice
      }));
      remaining -= slice.length;
    }
    return out;
  }, [groupedByRarity, visibleCosmeticCount]);
  var shownCosmeticCount = windowedGroups.reduce((total, group) => total + group.entries.length, 0);
  var characterSwapCount = readyCosmetics.filter(entry => entry.isCharacterSwap).length;
  var fullSetPackStatusLabel = (() => {
    switch (fullSetPackState.status) {
      case 'completed':
        return 'Full-set cosmetics are installed and ready.';
      case 'pending':
      case 'downloading':
      case 'transferring':
        return 'Finishing full-set cosmetics.';
      case 'failed':
        return 'Full-set cosmetics could not finish loading yet.';
      case 'missing':
        return 'Full-set cosmetics are still becoming available.';
      default:
        return 'Checking full-set cosmetics.';
    }
  })();
  var showFullSetPackBanner = fullSetPackState.supported && !fullSetPackState.isReady && fullSetCatalogCount > 0;
  var errorHelp = formatAssetPackErrorLabel(fullSetPackState.errorLabel);
  return React.createElement("div", {
    className: "flex flex-col h-full pt-6 pb-32 px-6 overflow-y-auto custom-scrollbar",
    "data-smoke-cosmetics": "true"
  }, React.createElement(ViewCrumbs, {
    trail: [{
      label: 'Main page',
      onClick: onBack
    }],
    current: "Cosmetics"
  }), React.createElement("h1", {
    className: "cx-title"
  }, "Cosmetics"), React.createElement("p", {
    className: "cx-hatnote"
  }, "Browse all cosmetics by role, character, and rarity."), showFullSetPackBanner && React.createElement("div", {
    className: "max-w-5xl mx-auto w-full mb-4"
  }, React.createElement("div", {
    className: "p-4 rounded-xl bg-[var(--panel)] border border-[var(--stroke)] space-y-3"
  }, React.createElement("div", {
    className: "flex flex-wrap items-start justify-between gap-3"
  }, React.createElement("div", null, React.createElement("p", {
    className: "text-[10px] uppercase tracking-widest font-bold text-zinc-200"
  }, "Full Cosmetics Pack"), React.createElement("p", {
    className: "text-sm text-zinc-200 mt-1"
  }, fullSetPackStatusLabel), React.createElement("p", {
    className: "text-xs text-zinc-400 mt-1"
  }, fullSetCatalogCount, " full-set cosmetics can take a little longer to appear after install or update.")), React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, typeof onRefreshFullSetPack === 'function' && React.createElement("button", {
    onClick: () => onRefreshFullSetPack({
      forceAssetReload: true
    }),
    className: "px-3 py-2 rounded-xl bg-[var(--panel)] border border-[var(--stroke)] text-xs font-semibold text-zinc-200"
  }, "Refresh"))), React.createElement("p", {
    className: "text-[11px] text-zinc-300/90"
  }, "Character swaps stay available immediately. This banner only affects the larger full-set image library."), errorHelp && React.createElement("p", {
    className: "text-[11px] text-zinc-300"
  }, errorHelp))), React.createElement(WikiHeaderSearchPortal, null, React.createElement("div", {
    className: "relative w-full"
  }, React.createElement("div", {
    className: "absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
  }, React.createElement(Icons.Search, {
    width: 18,
    height: 18
  })), React.createElement("input", {
    value: search,
    onChange: e => setSearch(e.target.value),
    placeholder: "Search cosmetics, rarity, piece type, or character...",
    className: "w-full bg-[var(--panel)] border border-[var(--stroke)] rounded-xl py-3 pl-12 pr-10 text-white placeholder-zinc-600 text-sm focus:outline-none"
  }), search && React.createElement("button", {
    onClick: () => setSearch(''),
    className: "absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white/5 text-zinc-400 hover:text-white transition-colors"
  }, React.createElement(Icons.X, {
    width: 14,
    height: 14
  })))), React.createElement("div", {
    className: "max-w-5xl mx-auto space-y-3 mb-4"
  }, React.createElement("div", {
    className: "flex flex-wrap items-center justify-center gap-2"
  }, React.createElement("span", {
    className: "text-[10px] text-zinc-500 uppercase tracking-[0.18em]"
  }, "Role"), ['Killer', 'Survivor'].map(role => React.createElement("button", {
    key: role,
    type: "button",
    onClick: () => setRoleFilter(role),
    className: "mode-choice px-4 py-2 text-xs font-bold ".concat(roleFilter === role ? 'mode-choice--active' : '')
  }, role))), React.createElement("div", {
    className: "flex flex-wrap items-center justify-center gap-2"
  }, React.createElement("span", {
    className: "text-[10px] text-zinc-500 uppercase tracking-[0.18em]"
  }, "Character"), React.createElement("div", {
    className: "min-w-[250px]"
  }, React.createElement("select", {
    value: characterFilter,
    onChange: e => setCharacterFilter(e.target.value),
    className: "themed-select w-full text-xs"
  }, React.createElement("option", {
    value: "__all__"
  }, roleFilter === 'Killer' ? 'All killer cosmetics' : 'All survivor cosmetics'), roleCharacters.map(character => React.createElement("option", {
    key: character.id,
    value: character.id
  }, character.name)))), React.createElement("span", {
    className: "text-[11px] text-zinc-500 uppercase tracking-[0.18em] self-center"
  }, filteredCosmetics.length, " shown \u2022 sorted by rarity"))), React.createElement("div", {
    className: "w-full max-w-[1280px] mx-auto pb-32 space-y-6"
  }, (() => {
    var renderedCount = 0;
    return windowedGroups.map(group => {
      var _groupedByRarity$find, _groupedByRarity$find2;
      return React.createElement("section", {
        key: group.label,
        className: "space-y-3"
      }, React.createElement("h3", {
        className: "cx-sub"
      }, group.label, " ", React.createElement("span", {
        style: {
          color: 'var(--text-faint)',
          fontSize: '12px',
          fontWeight: 400
        }
      }, (_groupedByRarity$find = (_groupedByRarity$find2 = groupedByRarity.find(full => full.label === group.label)) === null || _groupedByRarity$find2 === void 0 ? void 0 : _groupedByRarity$find2.entries.length) !== null && _groupedByRarity$find !== void 0 ? _groupedByRarity$find : group.entries.length)), React.createElement("div", {
        className: "grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4"
      }, group.entries.map(entry => {
        var isEager = renderedCount < 16;
        renderedCount += 1;
        return React.createElement(CosmeticCard, {
          key: entry.id,
          entry: entry,
          onOpen: onOpenCosmetic,
          assetRevision: cosmeticsAssetRevision,
          eagerImage: isEager
        });
      })));
    });
  })(), filteredCosmetics.length > shownCosmeticCount && React.createElement("div", {
    className: "flex justify-center pt-2"
  }, React.createElement("button", {
    onClick: () => setVisibleCosmeticCount(count => count + COSMETICS_PAGE_SIZE),
    className: "px-5 py-2.5 rounded-xl bg-[var(--panel)] border border-[var(--stroke)] text-sm font-semibold text-zinc-200 hover:text-white transition-colors"
  }, "Show more (", filteredCosmetics.length - shownCosmeticCount, " remaining)")), groupedByRarity.length === 0 && React.createElement("div", {
    className: "text-center py-12 rounded-xl border border-[var(--stroke)] bg-[var(--panel)]"
  }, React.createElement(Icons.Image, {
    width: 36,
    height: 36,
    className: "mx-auto text-zinc-700 mb-3"
  }), React.createElement("p", {
    className: "text-zinc-500 text-sm"
  }, "No cosmetics match the current filters."), React.createElement("p", {
    className: "text-zinc-600 text-xs mt-2"
  }, "Try selecting all characters or clearing the search query."))));
};
var COMMUNITY_LINKS = [{
  label: 'NightLight',
  context: 'Pick rates, escape stats, Shrine of Secrets tracker and codes. Link-out only.',
  url: 'https://nightlight.gg/',
  sourceType: 'stats'
}, {
  label: 'DBDVault',
  context: 'Build creator, curated creator builds, meta per patch, tier lists and codes. Link-out only.',
  url: 'https://www.dbdvault.com/',
  sourceType: 'builds'
}, {
  label: 'DBDBuilds.gg',
  context: 'Searchable curated killer and survivor loadout library. Link-out only.',
  url: 'https://dbdbuilds.gg/',
  sourceType: 'builds'
}, {
  label: 'DBDHub.me',
  context: 'Community builds with votes, perk stats, randomizer and patch notes. Link-out only.',
  url: 'https://dbdhub.me/',
  sourceType: 'builds'
}, {
  label: 'Official DBD Discord',
  context: 'News, LFG, strategy discussion and events. Invite link-out only.',
  url: 'https://discord.com/invite/deadbydaylight',
  sourceType: 'community'
}, {
  label: 'r/deadbydaylight New-Player Guide',
  context: 'Reddit sidebar resources and weekly megathreads. Link-out only.',
  url: 'https://www.reddit.com/r/deadbydaylight/wiki/new-player-guide',
  sourceType: 'community'
}, {
  label: 'TierMaker DBD',
  context: 'Community killer, survivor and perk tier-list templates with voting. Link-out only.',
  url: 'https://tiermaker.com/categories/dead-by-daylight',
  sourceType: 'tierlists'
}, {
  label: 'Hens333 (YouTube)',
  context: 'Meta builds, SoloQ experiments and event coverage. Link-out only.',
  url: 'https://www.youtube.com/c/hens333',
  sourceType: 'video'
}, {
  label: 'SpookyLoopz (YouTube)',
  context: 'High-level killer guides and decision-making demos. Link-out only.',
  url: 'https://www.youtube.com/@SpookyLoopz',
  sourceType: 'video'
}, {
  label: 'DBDGuide',
  context: 'Codes, perk tier lists and counter guides. Link-out only.',
  url: 'https://dbdguide.com/',
  sourceType: 'guides'
}];
var CommunityContentView = _ref45 => {
  var {
    onBack,
    communityContent
  } = _ref45;
  var [activeTab, setActiveTab] = useState('addons');
  var [addonSearch, setAddonSearch] = useState('');
  var [selectedKillerKey, setSelectedKillerKey] = useState('');
  var [buildRole, setBuildRole] = useState('killers');
  var [selectedBuildProfileId, setSelectedBuildProfileId] = useState('');
  var [selectedBuildPerkName, setSelectedBuildPerkName] = useState('');
  var [characterRole, setCharacterRole] = useState('killer');
  var [characterSearch, setCharacterSearch] = useState('');
  var [academySearch, setAcademySearch] = useState('');
  var [tierlistSearch, setTierlistSearch] = useState('');
  var [tierlistCategory, setTierlistCategory] = useState('all');
  var [guideSearch, setGuideSearch] = useState('');
  var [guideSourceType, setGuideSourceType] = useState('all');
  var toLookupKey = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  var tabOptions = [{
    id: 'addons',
    label: 'Addon Tierlist'
  }, {
    id: 'builds',
    label: 'Builds'
  }, {
    id: 'characters',
    label: 'Character Intel'
  }, {
    id: 'academy',
    label: 'Academy'
  }, {
    id: 'tierlists',
    label: 'Tierlists'
  }, {
    id: 'guideVault',
    label: 'Guide Vault'
  }, {
    id: 'links',
    label: 'Community Links'
  }];
  var addonKillers = useMemo(() => {
    var _communityContent$add;
    return Array.isArray(communityContent === null || communityContent === void 0 || (_communityContent$add = communityContent.addonTierlist) === null || _communityContent$add === void 0 ? void 0 : _communityContent$add.killers) ? communityContent.addonTierlist.killers : [];
  }, [communityContent]);
  useEffect(() => {
    if (addonKillers.length === 0) {
      setSelectedKillerKey('');
      return;
    }
    var hasSelection = addonKillers.some(killer => (killer.killerSlug || killer.killerName) === selectedKillerKey);
    if (!hasSelection) {
      setSelectedKillerKey(addonKillers[0].killerSlug || addonKillers[0].killerName || '');
    }
  }, [addonKillers, selectedKillerKey]);
  var activeKiller = useMemo(() => addonKillers.find(killer => (killer.killerSlug || killer.killerName) === selectedKillerKey) || null, [addonKillers, selectedKillerKey]);
  var filteredAddons = useMemo(() => {
    if (!activeKiller || !Array.isArray(activeKiller.addons)) return [];
    var term = addonSearch.trim().toLowerCase();
    if (!term) return activeKiller.addons;
    return activeKiller.addons.filter(addon => {
      var haystack = [addon.name, addon.otzComment, addon.description].join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [activeKiller, addonSearch]);
  var activeKillerCombos = useMemo(() => Array.isArray(activeKiller === null || activeKiller === void 0 ? void 0 : activeKiller.combos) ? activeKiller.combos : [], [activeKiller]);
  var beginnerGuidesEntries = useMemo(() => {
    var _communityContent$beg;
    return Array.isArray(communityContent === null || communityContent === void 0 || (_communityContent$beg = communityContent.beginnerGuides) === null || _communityContent$beg === void 0 ? void 0 : _communityContent$beg.entries) ? communityContent.beginnerGuides.entries : [];
  }, [communityContent]);
  var filteredBeginnerGuides = useMemo(() => {
    var term = academySearch.trim().toLowerCase();
    if (!term) return beginnerGuidesEntries;
    return beginnerGuidesEntries.filter(entry => {
      var haystack = [entry.title, entry.description].join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [beginnerGuidesEntries, academySearch]);
  var tierlistEntries = useMemo(() => {
    var _communityContent$tie;
    return Array.isArray(communityContent === null || communityContent === void 0 || (_communityContent$tie = communityContent.tierlists) === null || _communityContent$tie === void 0 ? void 0 : _communityContent$tie.entries) ? communityContent.tierlists.entries : [];
  }, [communityContent]);
  var tierlistCategoryOptions = useMemo(() => {
    var values = [...new Set(tierlistEntries.map(entry => String(entry.categoryLabel || entry.category || '').trim()).filter(Boolean))];
    return values.sort((a, b) => a.localeCompare(b));
  }, [tierlistEntries]);
  var filteredTierlists = useMemo(() => {
    var term = tierlistSearch.trim().toLowerCase();
    return tierlistEntries.filter(entry => {
      if (tierlistCategory !== 'all' && String(entry.categoryLabel || entry.category || '') !== tierlistCategory) {
        return false;
      }
      if (!term) return true;
      var haystack = [entry.title, entry.description, entry.patch, entry.dateLabel].join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [tierlistEntries, tierlistCategory, tierlistSearch]);
  var tierlistComparisons = useMemo(() => {
    var grouped = tierlistEntries.reduce((accumulator, entry) => {
      var categoryLabel = String(entry.categoryLabel || entry.category || 'General');
      if (!accumulator[categoryLabel]) accumulator[categoryLabel] = [];
      accumulator[categoryLabel].push(entry);
      return accumulator;
    }, {});
    return Object.entries(grouped).map(_ref46 => {
      var [categoryLabel, entries] = _ref46;
      var ordered = [...entries].sort((a, b) => {
        if (a.dateIso && b.dateIso) return b.dateIso.localeCompare(a.dateIso);
        if (a.dateIso) return -1;
        if (b.dateIso) return 1;
        return String(a.title || '').localeCompare(String(b.title || ''));
      });
      return {
        categoryLabel,
        latest: ordered[0] || null,
        previous: ordered[1] || null
      };
    }).sort((a, b) => a.categoryLabel.localeCompare(b.categoryLabel));
  }, [tierlistEntries]);
  var buildProfiles = useMemo(() => {
    var _communityContent$bui2;
    if (buildRole === 'survivors') {
      var _communityContent$bui;
      return Array.isArray(communityContent === null || communityContent === void 0 || (_communityContent$bui = communityContent.builds) === null || _communityContent$bui === void 0 || (_communityContent$bui = _communityContent$bui.roles) === null || _communityContent$bui === void 0 ? void 0 : _communityContent$bui.survivors) ? communityContent.builds.roles.survivors : [];
    }
    return Array.isArray(communityContent === null || communityContent === void 0 || (_communityContent$bui2 = communityContent.builds) === null || _communityContent$bui2 === void 0 || (_communityContent$bui2 = _communityContent$bui2.roles) === null || _communityContent$bui2 === void 0 ? void 0 : _communityContent$bui2.killers) ? communityContent.builds.roles.killers : [];
  }, [communityContent, buildRole]);
  var perkDetailsByRole = useMemo(() => {
    var _communityContent$bui3;
    var fallback = {
      killers: [],
      survivors: []
    };
    var raw = communityContent === null || communityContent === void 0 || (_communityContent$bui3 = communityContent.builds) === null || _communityContent$bui3 === void 0 ? void 0 : _communityContent$bui3.perkDetails;
    if (!raw || typeof raw !== 'object') return fallback;
    return {
      killers: Array.isArray(raw.killers) ? raw.killers : [],
      survivors: Array.isArray(raw.survivors) ? raw.survivors : []
    };
  }, [communityContent]);
  var activePerkDetails = useMemo(() => buildRole === 'survivors' ? perkDetailsByRole.survivors : perkDetailsByRole.killers, [buildRole, perkDetailsByRole]);
  var activePerkDetailsLookup = useMemo(() => {
    var map = new Map();
    activePerkDetails.forEach(entry => {
      var key = toLookupKey((entry === null || entry === void 0 ? void 0 : entry.name) || (entry === null || entry === void 0 ? void 0 : entry.key));
      if (!key || map.has(key)) return;
      map.set(key, entry);
    });
    return map;
  }, [activePerkDetails]);
  useEffect(() => {
    if (buildProfiles.length === 0) {
      setSelectedBuildProfileId('');
      return;
    }
    var hasSelection = buildProfiles.some(profile => profile.id === selectedBuildProfileId);
    if (!hasSelection) {
      setSelectedBuildProfileId(buildProfiles[0].id || '');
    }
  }, [buildProfiles, selectedBuildProfileId]);
  useEffect(() => {
    setSelectedBuildPerkName('');
  }, [buildRole, selectedBuildProfileId]);
  var activeBuildProfile = useMemo(() => buildProfiles.find(profile => profile.id === selectedBuildProfileId) || null, [buildProfiles, selectedBuildProfileId]);
  var selectedBuildPerkDetails = useMemo(() => activePerkDetailsLookup.get(toLookupKey(selectedBuildPerkName)) || null, [activePerkDetailsLookup, selectedBuildPerkName]);
  var characterEntries = useMemo(() => {
    var _communityContent$cha2;
    if (characterRole === 'survivor') {
      var _communityContent$cha;
      return Array.isArray(communityContent === null || communityContent === void 0 || (_communityContent$cha = communityContent.characterInfo) === null || _communityContent$cha === void 0 ? void 0 : _communityContent$cha.survivors) ? communityContent.characterInfo.survivors : [];
    }
    return Array.isArray(communityContent === null || communityContent === void 0 || (_communityContent$cha2 = communityContent.characterInfo) === null || _communityContent$cha2 === void 0 ? void 0 : _communityContent$cha2.killers) ? communityContent.characterInfo.killers : [];
  }, [communityContent, characterRole]);
  var visibleCharacters = useMemo(() => {
    var term = characterSearch.trim().toLowerCase();
    var withSearch = !term ? characterEntries : characterEntries.filter(entry => {
      var haystack = [entry.name, entry.otzComment, entry.availableIn].join(' ').toLowerCase();
      return haystack.includes(term);
    });
    return [...withSearch].sort((a, b) => {
      var aPriority = Number.isFinite(Number(a.unlockPriority)) ? Number(a.unlockPriority) : -1;
      var bPriority = Number.isFinite(Number(b.unlockPriority)) ? Number(b.unlockPriority) : -1;
      return bPriority - aPriority;
    });
  }, [characterEntries, characterSearch]);
  var guideVaultEntries = useMemo(() => {
    var _communityContent$gui;
    return Array.isArray(communityContent === null || communityContent === void 0 || (_communityContent$gui = communityContent.guideVault) === null || _communityContent$gui === void 0 ? void 0 : _communityContent$gui.entries) ? communityContent.guideVault.entries : [];
  }, [communityContent]);
  var guideSourceTypeOptions = useMemo(() => {
    var values = new Set();
    guideVaultEntries.forEach(entry => {
      var type = String(entry.sourceType || '').trim();
      if (type) values.add(type);
    });
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [guideVaultEntries]);
  var filteredGuideVaultEntries = useMemo(() => {
    var term = guideSearch.trim().toLowerCase();
    return guideVaultEntries.filter(entry => {
      if (guideSourceType !== 'all' && String(entry.sourceType || '') !== guideSourceType) return false;
      if (!term) return true;
      var haystack = [entry.label, entry.context, entry.url, entry.host].join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [guideVaultEntries, guideSourceType, guideSearch]);
  var getTierStyle = tierBucket => {
    var bucket = String(tierBucket || '').toLowerCase();
    if (bucket === 'strongest') return {
      color: '#fafafa',
      borderColor: 'rgba(250,250,250,0.4)'
    };
    if (bucket === 'good') return {
      color: '#e4e4e7',
      borderColor: 'rgba(228,228,231,0.35)'
    };
    if (bucket === 'decent') return {
      color: '#d4d4d8',
      borderColor: 'rgba(212,212,216,0.3)'
    };
    if (bucket === 'almost-no-effect') return {
      color: '#71717a',
      borderColor: 'rgba(113,113,122,0.3)'
    };
    if (bucket === 'detrimental') return {
      color: '#52525b',
      borderColor: 'rgba(82,82,91,0.35)'
    };
    return {
      color: '#a1a1aa',
      borderColor: 'rgba(161,161,170,0.3)'
    };
  };
  var links = useMemo(() => {
    var defaults = [{
      label: 'Otzdarva Home',
      url: 'https://otzdarva.com/'
    }, {
      label: 'DBD Character Info',
      url: 'https://otzdarva.com/dbd/character-info'
    }, {
      label: 'Addon Tierlist',
      url: 'https://otz-addon-tierlist.pages.dev/'
    }, {
      label: 'Builds',
      url: 'https://otzdarva-builds.com/'
    }];
    var sourceLinks = Array.isArray(communityContent === null || communityContent === void 0 ? void 0 : communityContent.links) ? communityContent.links : [];
    var merged = [...defaults, ...sourceLinks];
    var seen = new Set();
    return merged.filter(entry => {
      var url = String((entry === null || entry === void 0 ? void 0 : entry.url) || '').trim();
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    }).slice(0, 10);
  }, [communityContent]);
  var getTierlistFreshness = entry => {
    if (!(entry !== null && entry !== void 0 && entry.dateIso)) return {
      label: 'Undated',
      color: 'text-zinc-400'
    };
    var ageDays = Math.floor((Date.now() - new Date(entry.dateIso).getTime()) / (1000 * 60 * 60 * 24));
    if (ageDays <= 120) return {
      label: 'Fresh',
      color: 'text-zinc-300'
    };
    if (ageDays <= 365) return {
      label: 'Aging',
      color: 'text-zinc-200'
    };
    return {
      label: 'Legacy',
      color: 'text-zinc-400'
    };
  };
  var getTierlistAgeLabel = entry => {
    if (!(entry !== null && entry !== void 0 && entry.dateIso)) return 'unknown age';
    var ageDays = Math.floor((Date.now() - new Date(entry.dateIso).getTime()) / (1000 * 60 * 60 * 24));
    if (ageDays < 31) return "".concat(ageDays, "d old");
    if (ageDays < 365) return "".concat(Math.floor(ageDays / 30), "mo old");
    return "".concat(Math.floor(ageDays / 365), "y old");
  };
  return React.createElement("div", {
    className: "flex flex-col h-full pt-6 pb-32 px-6 overflow-y-auto custom-scrollbar"
  }, React.createElement(ViewCrumbs, {
    trail: [{
      label: 'Main page',
      onClick: onBack
    }],
    current: "Community Content"
  }), React.createElement("h1", {
    className: "cx-title"
  }, "Community Content"), React.createElement("p", {
    className: "cx-hatnote"
  }, "Guides, builds, and tierlists from the community."), React.createElement("div", {
    className: "max-w-5xl mx-auto w-full pb-32 space-y-4"
  }, React.createElement("div", {
    className: "flex flex-wrap items-center gap-2"
  }, tabOptions.map(tab => React.createElement("button", {
    key: tab.id,
    onClick: () => setActiveTab(tab.id),
    className: "px-4 py-2 text-xs rounded-lg border transition-colors ".concat(activeTab === tab.id ? 'bg-zinc-100 text-black border-zinc-100 font-bold' : 'bg-transparent text-zinc-300 border-white/15 hover:border-white/30')
  }, tab.label))), activeTab === 'addons' && React.createElement("div", {
    className: "space-y-3"
  }, React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, React.createElement("select", {
    value: selectedKillerKey,
    onChange: event => setSelectedKillerKey(event.target.value),
    className: "themed-select min-w-[220px] text-xs"
  }, addonKillers.map(killer => {
    var key = killer.killerSlug || killer.killerName;
    return React.createElement("option", {
      key: key,
      value: key
    }, killer.localKillerName || killer.killerName);
  })), React.createElement("input", {
    value: addonSearch,
    onChange: event => setAddonSearch(event.target.value),
    placeholder: "Search addon or comment",
    className: "flex-1 min-w-[200px] bg-[var(--panel)] border border-[var(--stroke)] rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500"
  })), activeKillerCombos.length > 0 && React.createElement("div", {
    className: "p-3 rounded-xl bg-[var(--panel)] border border-[var(--stroke)]"
  }, React.createElement("p", {
    className: "text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-bold"
  }, "Recommended Addon Combos"), React.createElement("div", {
    className: "mt-2 space-y-2"
  }, activeKillerCombos.map((combo, comboIndex) => React.createElement("div", {
    key: "".concat(combo.tier, "-").concat(comboIndex),
    className: "rounded-xl border border-white/10 bg-white/[0.02] px-2 py-2"
  }, React.createElement("p", {
    className: "text-[10px] uppercase tracking-wider text-zinc-400 font-bold"
  }, combo.label || 'Combo'), React.createElement("div", {
    className: "mt-2 flex flex-wrap items-center gap-2"
  }, (combo.addons || []).map((comboAddon, addonIndex) => {
    var _comboAddon$localMatc;
    return React.createElement("div", {
      key: "".concat(combo.label || 'combo', "-").concat(comboAddon.rank, "-").concat(addonIndex),
      className: "flex items-center gap-2"
    }, addonIndex > 0 && React.createElement("span", {
      className: "text-zinc-600 text-xs font-bold"
    }, "+"), React.createElement("div", {
      className: "flex items-center gap-2 px-2 py-1 rounded-lg bg-black/20 border border-white/10"
    }, React.createElement("div", {
      className: "w-8 h-8 rounded-md bg-zinc-950/70 border border-white/10 overflow-hidden shrink-0"
    }, React.createElement(AssetFrame, {
      type: "Addon",
      size: "fill",
      imageUrl: (comboAddon === null || comboAddon === void 0 || (_comboAddon$localMatc = comboAddon.localMatch) === null || _comboAddon$localMatc === void 0 ? void 0 : _comboAddon$localMatc.localImage) || '',
      fallbackIcon: React.createElement(Icons.Package, {
        width: 12,
        height: 12,
        className: "text-zinc-600"
      })
    })), React.createElement("span", {
      className: "text-[11px] text-zinc-200"
    }, comboAddon.name)));
  })))))), React.createElement("div", {
    className: "space-y-2"
  }, filteredAddons.map(addon => {
    var _addon$localMatch;
    var tierStyle = getTierStyle(addon.tierBucket);
    return React.createElement("div", {
      key: "".concat(addon.rank, "-").concat(addon.name),
      className: "p-3 rounded-xl bg-[var(--panel)] border border-[var(--stroke)]"
    }, React.createElement("div", {
      className: "flex items-start gap-3"
    }, React.createElement("div", {
      className: "w-11 h-11 rounded-lg bg-zinc-950/70 border border-white/10 overflow-hidden shrink-0"
    }, React.createElement(AssetFrame, {
      type: "Addon",
      size: "fill",
      imageUrl: (addon === null || addon === void 0 || (_addon$localMatch = addon.localMatch) === null || _addon$localMatch === void 0 ? void 0 : _addon$localMatch.localImage) || '',
      fallbackIcon: React.createElement(Icons.Package, {
        width: 14,
        height: 14,
        className: "text-zinc-600"
      })
    })), React.createElement("div", {
      className: "flex-1 min-w-0"
    }, React.createElement("div", {
      className: "flex flex-wrap items-center gap-2 justify-between"
    }, React.createElement("div", {
      className: "flex items-center gap-2 min-w-0"
    }, React.createElement("span", {
      className: "text-[10px] text-zinc-500 font-bold w-7"
    }, "#", addon.rank), React.createElement("p", {
      className: "text-sm font-semibold text-white truncate"
    }, addon.name), React.createElement("span", {
      className: "px-2 py-0.5 rounded-md border text-[10px] uppercase tracking-wider",
      style: tierStyle
    }, String(addon.tierBucket || 'unknown').replace(/-/g, ' ')))), addon.otzComment && React.createElement("p", {
      className: "text-xs text-zinc-300 mt-2 leading-relaxed break-words whitespace-normal"
    }, addon.otzComment), addon.description && React.createElement("p", {
      className: "text-[11px] text-zinc-500 mt-1 leading-relaxed break-words whitespace-normal"
    }, addon.description))));
  }), filteredAddons.length === 0 && React.createElement("div", {
    className: "p-4 rounded-xl bg-[var(--panel)] border border-[var(--stroke)] text-zinc-500 text-sm"
  }, "No addon entries match the current filters."))), activeTab === 'builds' && React.createElement("div", {
    className: "space-y-3"
  }, React.createElement("div", {
    className: "flex flex-wrap gap-2 items-center"
  }, React.createElement("button", {
    type: "button",
    onClick: () => setBuildRole('killers'),
    className: "px-4 py-2 text-xs rounded-lg border transition-colors {buildRole === 'killers' ? 'bg-zinc-100 text-black border-zinc-100 font-bold' : 'bg-transparent text-zinc-300 border-white/15 hover:border-white/30'}"
  }, "Killers"), React.createElement("button", {
    type: "button",
    onClick: () => setBuildRole('survivors'),
    className: "px-4 py-2 text-xs rounded-lg border transition-colors {buildRole === 'survivors' ? 'bg-zinc-100 text-black border-zinc-100 font-bold' : 'bg-transparent text-zinc-300 border-white/15 hover:border-white/30'}"
  }, "Survivors"), React.createElement("select", {
    value: selectedBuildProfileId,
    onChange: event => setSelectedBuildProfileId(event.target.value),
    className: "themed-select min-w-[220px] text-xs"
  }, buildProfiles.map(profile => React.createElement("option", {
    key: profile.id,
    value: profile.id
  }, profile.name)))), activeBuildProfile ? React.createElement("div", {
    className: "space-y-3"
  }, React.createElement("div", {
    className: "p-3 rounded-xl bg-[var(--panel)] border border-[var(--stroke)]"
  }, React.createElement("p", {
    className: "text-white font-semibold text-sm"
  }, activeBuildProfile.name), React.createElement("p", {
    className: "text-[11px] text-zinc-500 mt-1"
  }, activeBuildProfile.buildCount, " builds \u2022 Featured: ", activeBuildProfile.featuredBuildName || 'n/a')), activeBuildProfile.builds.map(build => React.createElement("div", {
    key: build.name,
    className: "p-3 rounded-xl bg-[var(--panel)] border border-[var(--stroke)] space-y-2"
  }, React.createElement("p", {
    className: "text-white font-semibold text-sm"
  }, build.name), React.createElement("div", {
    className: "flex flex-wrap gap-1.5"
  }, (build.perks || []).map(perk => React.createElement("button", {
    key: "".concat(build.name, "-").concat(perk.name),
    onClick: () => setSelectedBuildPerkName(perk.name),
    className: "px-2 py-1 rounded-lg border text-[10px] uppercase tracking-wider transition-colors ".concat(selectedBuildPerkName === perk.name ? 'bg-white/10 border-amber-400/40 text-zinc-300' : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white')
  }, perk.name))), (build.details || []).length > 0 && React.createElement("div", {
    className: "space-y-1"
  }, build.details.map((detail, index) => React.createElement("p", {
    key: "".concat(build.name, "-detail-").concat(index),
    className: "text-[11px] text-zinc-500 leading-relaxed"
  }, "\u2022 ", detail))))), selectedBuildPerkName && React.createElement("div", {
    className: "p-3 rounded-xl bg-[var(--panel)] border border-[var(--stroke)] space-y-2"
  }, React.createElement("p", {
    className: "text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-bold"
  }, "Perk Deep Dive"), selectedBuildPerkDetails ? React.createElement(React.Fragment, null, React.createElement("p", {
    className: "text-white font-semibold text-sm"
  }, selectedBuildPerkDetails.name), React.createElement("p", {
    className: "text-[11px] text-zinc-500"
  }, "Obtained from: ", selectedBuildPerkDetails.obtainedFrom || 'Unknown'), React.createElement("p", {
    className: "text-xs text-zinc-300 leading-relaxed break-words whitespace-normal"
  }, selectedBuildPerkDetails.descriptionText || 'No perk description available in this saved record.'), (selectedBuildPerkDetails.links || []).length > 0 && React.createElement("div", {
    className: "flex flex-wrap gap-2 pt-1"
  }, selectedBuildPerkDetails.links.map(link => React.createElement("a", {
    key: link.url,
    href: link.url,
    target: "_blank",
    rel: "noreferrer",
    className: "px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] text-zinc-300 hover:text-white transition-colors"
  }, link.label || 'Wiki Source')))) : React.createElement("p", {
    className: "text-xs text-zinc-500"
  }, "No detailed entry was found for this perk in the current role dataset."))) : React.createElement("div", {
    className: "p-4 rounded-xl bg-[var(--panel)] border border-[var(--stroke)] text-zinc-500 text-sm"
  }, "No build profiles were found for this role.")), activeTab === 'characters' && React.createElement("div", {
    className: "space-y-3"
  }, React.createElement("div", {
    className: "flex flex-wrap gap-2 items-center"
  }, React.createElement("button", {
    type: "button",
    onClick: () => setCharacterRole('killer'),
    className: "px-4 py-2 text-xs rounded-lg border transition-colors {characterRole === 'killer' ? 'bg-zinc-100 text-black border-zinc-100 font-bold' : 'bg-transparent text-zinc-300 border-white/15 hover:border-white/30'}"
  }, "Killers"), React.createElement("button", {
    type: "button",
    onClick: () => setCharacterRole('survivor'),
    className: "px-4 py-2 text-xs rounded-lg border transition-colors {characterRole === 'survivor' ? 'bg-zinc-100 text-black border-zinc-100 font-bold' : 'bg-transparent text-zinc-300 border-white/15 hover:border-white/30'}"
  }, "Survivors"), React.createElement("input", {
    value: characterSearch,
    onChange: event => setCharacterSearch(event.target.value),
    placeholder: "Search character",
    className: "flex-1 min-w-[220px] bg-[var(--panel)] border border-[var(--stroke)] rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500"
  })), React.createElement("div", {
    className: "space-y-2"
  }, React.createElement("p", {
    className: "text-[11px] text-zinc-500"
  }, "Sorted from most important to least important."), visibleCharacters.map((entry, index) => React.createElement("div", {
    key: entry.id || entry.name,
    className: "p-3 rounded-xl bg-[var(--panel)] border border-[var(--stroke)]"
  }, React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-2"
  }, React.createElement("p", {
    className: "text-sm text-white font-semibold"
  }, entry.name), React.createElement("span", {
    className: "px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] uppercase tracking-wider text-zinc-400"
  }, "Rank #", index + 1)), React.createElement("p", {
    className: "text-[11px] text-zinc-500 mt-1"
  }, entry.cost || 'No cost data', entry.availableIn ? " \u2022 ".concat(entry.availableIn) : ''), (entry.perks || []).length > 0 && React.createElement("div", {
    className: "mt-2 flex flex-wrap gap-1.5"
  }, entry.perks.slice(0, 4).map(perk => React.createElement("span", {
    key: "".concat(entry.id, "-").concat(perk.id),
    className: "px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] text-zinc-300 uppercase tracking-wider"
  }, perk.name))))), visibleCharacters.length === 0 && React.createElement("div", {
    className: "p-4 rounded-xl bg-[var(--panel)] border border-[var(--stroke)] text-zinc-500 text-sm"
  }, "No character entries match the current filters."))), activeTab === 'academy' && React.createElement("div", {
    className: "space-y-3"
  }, React.createElement("input", {
    value: academySearch,
    onChange: event => setAcademySearch(event.target.value),
    placeholder: "Search beginner guides",
    className: "w-full bg-[var(--panel)] border border-[var(--stroke)] rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500"
  }), React.createElement("div", {
    className: "space-y-2"
  }, filteredBeginnerGuides.map(entry => React.createElement("div", {
    key: entry.id,
    className: "p-3 rounded-xl bg-[var(--panel)] border border-[var(--stroke)]"
  }, React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-2"
  }, React.createElement("p", {
    className: "text-sm text-white font-semibold"
  }, entry.title), React.createElement("span", {
    className: "px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] uppercase tracking-wider text-zinc-400"
  }, entry.sourceType || 'resource')), entry.description && React.createElement("p", {
    className: "text-xs text-zinc-300 mt-2 leading-relaxed break-words whitespace-normal"
  }, entry.description), entry.url && React.createElement("a", {
    href: entry.url,
    target: "_blank",
    rel: "noreferrer",
    className: "inline-flex mt-2 px-3 py-1.5 rounded-xl bg-[var(--panel)] border border-[var(--stroke)] text-[11px] text-zinc-300 hover:text-white transition-colors"
  }, "Open Guide"))), filteredBeginnerGuides.length === 0 && React.createElement("div", {
    className: "p-4 rounded-xl bg-[var(--panel)] border border-[var(--stroke)] text-zinc-500 text-sm"
  }, "No beginner guides match the current search."))), activeTab === 'tierlists' && React.createElement("div", {
    className: "space-y-3"
  }, React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-2"
  }, tierlistComparisons.map(comparison => {
    var _comparison$latest, _comparison$previous;
    return React.createElement("div", {
      key: comparison.categoryLabel,
      className: "p-3 rounded-xl bg-[var(--panel)] border border-[var(--stroke)]"
    }, React.createElement("p", {
      className: "text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-bold"
    }, comparison.categoryLabel), React.createElement("p", {
      className: "text-sm text-white mt-1"
    }, "Latest: ", ((_comparison$latest = comparison.latest) === null || _comparison$latest === void 0 ? void 0 : _comparison$latest.title) || 'n/a'), React.createElement("p", {
      className: "text-[11px] text-zinc-500 mt-1"
    }, "Previous: ", ((_comparison$previous = comparison.previous) === null || _comparison$previous === void 0 ? void 0 : _comparison$previous.title) || 'none recorded'));
  })), React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, React.createElement("select", {
    value: tierlistCategory,
    onChange: event => setTierlistCategory(event.target.value),
    className: "themed-select min-w-[220px] text-xs"
  }, React.createElement("option", {
    value: "all"
  }, "All Categories"), tierlistCategoryOptions.map(category => React.createElement("option", {
    key: category,
    value: category
  }, category))), React.createElement("input", {
    value: tierlistSearch,
    onChange: event => setTierlistSearch(event.target.value),
    placeholder: "Search tierlists",
    className: "flex-1 min-w-[200px] bg-[var(--panel)] border border-[var(--stroke)] rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500"
  })), React.createElement("div", {
    className: "space-y-2"
  }, filteredTierlists.map(entry => {
    var freshness = getTierlistFreshness(entry);
    return React.createElement("div", {
      key: entry.id,
      className: "p-3 rounded-xl bg-[var(--panel)] border border-[var(--stroke)]"
    }, React.createElement("div", {
      className: "flex flex-wrap items-center justify-between gap-2"
    }, React.createElement("p", {
      className: "text-sm text-white font-semibold"
    }, entry.title), React.createElement("span", {
      className: "text-[10px] uppercase tracking-wider ".concat(freshness.color)
    }, freshness.label)), React.createElement("p", {
      className: "mt-1 font-mono text-[11px] text-zinc-500"
    }, entry.categoryLabel, " \u2022 ", entry.patch || 'Patch n/a', " \u2022 ", entry.dateLabel || 'Undated', " \u2022 ", getTierlistAgeLabel(entry)), entry.description && React.createElement("p", {
      className: "text-xs text-zinc-300 mt-2 leading-relaxed break-words whitespace-normal"
    }, entry.description), entry.url && React.createElement("a", {
      href: entry.url,
      target: "_blank",
      rel: "noreferrer",
      className: "inline-flex mt-2 px-3 py-1.5 rounded-xl bg-[var(--panel)] border border-[var(--stroke)] text-[11px] text-zinc-300 hover:text-white transition-colors"
    }, "Open Tierlist"));
  }), filteredTierlists.length === 0 && React.createElement("div", {
    className: "p-4 rounded-xl bg-[var(--panel)] border border-[var(--stroke)] text-zinc-500 text-sm"
  }, "No tierlists match the current filters."))), activeTab === 'guideVault' && React.createElement("div", {
    className: "space-y-3"
  }, React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, React.createElement("select", {
    value: guideSourceType,
    onChange: event => setGuideSourceType(event.target.value),
    className: "themed-select min-w-[220px] text-xs"
  }, React.createElement("option", {
    value: "all"
  }, "All Source Types"), guideSourceTypeOptions.map(sourceType => React.createElement("option", {
    key: sourceType,
    value: sourceType
  }, sourceType))), React.createElement("input", {
    value: guideSearch,
    onChange: event => setGuideSearch(event.target.value),
    placeholder: "Search guide vault",
    className: "flex-1 min-w-[220px] bg-[var(--panel)] border border-[var(--stroke)] rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500"
  })), React.createElement("div", {
    className: "space-y-2"
  }, filteredGuideVaultEntries.map(entry => React.createElement("div", {
    key: entry.id,
    className: "p-3 rounded-xl bg-[var(--panel)] border border-[var(--stroke)]"
  }, React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-2"
  }, React.createElement("p", {
    className: "text-sm text-white font-semibold"
  }, entry.label), React.createElement("span", {
    className: "px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] uppercase tracking-wider text-zinc-400"
  }, entry.sourceType || 'resource')), React.createElement("p", {
    className: "text-[11px] text-zinc-500 mt-1"
  }, entry.host || 'external resource'), entry.context && React.createElement("p", {
    className: "text-xs text-zinc-300 mt-2 leading-relaxed break-words whitespace-normal"
  }, entry.context), entry.url && React.createElement("a", {
    href: entry.url,
    target: "_blank",
    rel: "noreferrer",
    className: "inline-flex mt-2 px-3 py-1.5 rounded-xl bg-[var(--panel)] border border-[var(--stroke)] text-[11px] text-zinc-300 hover:text-white transition-colors"
  }, "Open Resource"))), filteredGuideVaultEntries.length === 0 && React.createElement("div", {
    className: "p-4 rounded-xl bg-[var(--panel)] border border-[var(--stroke)] text-zinc-500 text-sm"
  }, "No guide vault entries match the current filters."))), activeTab === 'links' && React.createElement("div", {
    className: "space-y-2"
  }, COMMUNITY_LINKS.map(entry => React.createElement("div", {
    key: entry.url,
    className: "p-3 rounded-xl bg-[var(--panel)] border border-[var(--stroke)]"
  }, React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-2"
  }, React.createElement("p", {
    className: "text-sm text-white font-semibold"
  }, entry.label), React.createElement("span", {
    className: "px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] uppercase tracking-wider text-zinc-400"
  }, entry.sourceType || 'resource')), entry.context && React.createElement("p", {
    className: "text-xs text-zinc-300 mt-2 leading-relaxed break-words whitespace-normal"
  }, entry.context), React.createElement("a", {
    href: entry.url,
    target: "_blank",
    rel: "noreferrer",
    className: "inline-flex mt-2 px-3 py-1.5 rounded-xl bg-[var(--panel)] border border-[var(--stroke)] text-[11px] text-zinc-300 hover:text-white transition-colors"
  }, "Open Resource")))), links.length > 0 && React.createElement("div", {
    className: "p-4 rounded-xl bg-[var(--panel)] border border-[var(--stroke)]"
  }, React.createElement("p", {
    className: "text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-bold"
  }, "Open Otzdarva Resources"), React.createElement("div", {
    className: "mt-3 flex flex-wrap gap-2"
  }, links.map(link => React.createElement("a", {
    key: link.url,
    href: link.url,
    target: "_blank",
    rel: "noreferrer",
    className: "px-3 py-1.5 rounded-xl bg-[var(--panel)] border border-[var(--stroke)] text-[11px] text-zinc-300 hover:text-white transition-colors"
  }, link.label || link.url))))));
};
var FavoritesView = _ref47 => {
  var {
    onBack,
    settings,
    killers = [],
    survivors = [],
    perks = [],
    items = [],
    addons = [],
    offerings = [],
    toggleFavorite,
    setView,
    onPerkTap
  } = _ref47;
  var [activeTab, setActiveTab] = useState('All');
  var tabs = ['All', 'Killers', 'Survivors', 'Perks', 'Items', 'Addons', 'Offerings'];
  var resolve = (ids, pool) => (ids || []).map(id => pool.find(x => x.id === id)).filter(Boolean);
  var favKillers = useMemo(() => resolve(settings.favoriteKillers, killers), [settings.favoriteKillers, killers]);
  var favSurvivors = useMemo(() => resolve(settings.favoriteSurvivors, survivors), [settings.favoriteSurvivors, survivors]);
  var favPerks = useMemo(() => resolve(settings.favoritePerks, perks), [settings.favoritePerks, perks]);
  var favItems = useMemo(() => resolve(settings.favoriteItems, items), [settings.favoriteItems, items]);
  var favAddons = useMemo(() => resolve(settings.favoriteAddons, addons), [settings.favoriteAddons, addons]);
  var favOfferings = useMemo(() => resolve(settings.favoriteOfferings, offerings.filter(o => !o.retired)), [settings.favoriteOfferings, offerings]);
  var totalCount = favKillers.length + favSurvivors.length + favPerks.length + favItems.length + favAddons.length + favOfferings.length;
  var releaseByChar = useMemo(() => {
    var map = new Map();
    if (typeof TIMELINE_DATA !== 'undefined' && TIMELINE_DATA && TIMELINE_DATA.releases) {
      TIMELINE_DATA.releases.forEach(rel => {
        [...(rel.killers || []), ...(rel.survivors || [])].forEach(entry => {
          if (entry && entry.name && !map.has(entry.name)) map.set(entry.name, {
            name: rel.name,
            chapterNumber: rel.chapterNumber
          });
        });
      });
    }
    return map;
  }, []);
  var getRarityColor = rarity => {
    switch ((rarity || '').toLowerCase()) {
      case 'common':
        return '#71717a';
      case 'uncommon':
        return '#a1a1aa';
      case 'rare':
        return '#d4d4d8';
      case 'veryrare':
        return '#e4e4e7';
      case 'ultrarare':
      case 'visceral':
        return '#fafafa';
      case 'event':
        return '#e4e4e7';
      default:
        return '#71717a';
    }
  };
  var FavSection = _ref48 => {
    var {
      title,
      items: sectionItems,
      columns,
      renderItem
    } = _ref48;
    if (sectionItems.length === 0) return null;
    return React.createElement("div", {
      className: "mb-8"
    }, React.createElement("h3", {
      className: "cx-sub"
    }, title, " ", React.createElement("span", {
      style: {
        color: 'var(--text-faint)',
        fontSize: '12px',
        fontWeight: 400
      }
    }, sectionItems.length)), React.createElement("table", {
      className: "cx-wikitable"
    }, React.createElement("thead", null, React.createElement("tr", null, columns.map((col, idx) => React.createElement("th", {
      key: idx,
      style: col.width ? {
        width: col.width
      } : undefined
    }, col.label)), React.createElement("th", {
      "aria-hidden": "true",
      style: {
        width: '40px'
      }
    }))), React.createElement("tbody", null, sectionItems.map(item => renderItem(item)))));
  };
  var charColumns = [{
    label: 'Character'
  }, {
    label: 'Chapter'
  }];
  var CharRow = _ref49 => {
    var {
      item,
      category
    } = _ref49;
    var rel = releaseByChar.get(item.name);
    return React.createElement("tr", {
      key: item.id,
      onClick: () => setView(category === 'Killer' ? 'killer' : 'survivor', {
        id: item.id
      }),
      style: {
        cursor: 'pointer'
      }
    }, React.createElement("td", {
      className: "cx-perkcell"
    }, React.createElement("div", {
      className: "cx-perkcell-inner"
    }, React.createElement("div", {
      style: {
        width: 44,
        height: 44,
        overflow: 'hidden',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, React.createElement(AssetFrame, {
      type: category,
      size: "fill",
      imageUrl: item.image,
      fallbackIcon: React.createElement(Icons.User, {
        width: 20,
        height: 20,
        className: "text-white/40"
      })
    })), React.createElement("span", null, React.createElement("span", {
      className: "font-semibold text-zinc-100"
    }, item.name), item.realName && item.realName !== item.name ? React.createElement("small", null, item.realName) : null))), React.createElement("td", {
      style: {
        color: 'var(--dim)'
      }
    }, rel ? rel.name : '\u2014'), React.createElement("td", {
      className: "cx-star"
    }, React.createElement("button", {
      type: "button",
      onClick: e => {
        e.stopPropagation();
        toggleFavorite(category, item.id);
      },
      "aria-label": "Remove favorite",
      className: "cx-star-on"
    }, '\u2605')));
  };
  var perkColumns = [{
    label: 'Perk'
  }, {
    label: 'Owner'
  }];
  var PerkRow = _ref50 => {
    var {
      item
    } = _ref50;
    return React.createElement("tr", {
      key: item.id,
      onClick: () => onPerkTap && onPerkTap(item),
      style: {
        cursor: 'pointer'
      }
    }, React.createElement("td", {
      className: "cx-perkcell"
    }, React.createElement("div", {
      className: "cx-perkimg"
    }, React.createElement("div", {
      className: "cx-imgbox"
    }, React.createElement(AssetFrame, {
      type: "Perk",
      size: "fill",
      imageUrl: item.image,
      fallbackIcon: React.createElement(Icons.BookOpen, {
        width: 16,
        height: 16,
        className: "text-white/40"
      })
    })), React.createElement("span", {
      className: "font-semibold text-zinc-100"
    }, item.name), React.createElement("small", null, item.type, " Perk", item.name.startsWith('Hex:') ? ' · Hex' : ''))), React.createElement("td", {
      style: {
        color: 'var(--dim)'
      }
    }, item.owner || 'Universal'), React.createElement("td", {
      className: "cx-star"
    }, React.createElement("button", {
      type: "button",
      onClick: e => {
        e.stopPropagation();
        toggleFavorite('Perk', item.id);
      },
      "aria-label": "Remove favorite",
      className: "cx-star-on"
    }, '\u2605')));
  };
  var smallColumns = [{
    label: 'Name'
  }, {
    label: 'Type'
  }, {
    label: 'Rarity'
  }];
  var fmtRaritySm = r => (r || '').replace('veryrare', 'Very Rare').replace('ultrarare', 'Ultra Rare');
  var SmallRow = _ref51 => {
    var {
      item,
      category,
      subtitle
    } = _ref51;
    return React.createElement("tr", {
      key: item.id
    }, React.createElement("td", {
      className: "cx-perkcell"
    }, React.createElement("div", {
      className: "cx-perkcell-inner"
    }, React.createElement("div", {
      style: {
        width: 44,
        height: 44,
        overflow: 'hidden',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, React.createElement(AssetFrame, {
      type: category,
      size: "fill",
      imageUrl: item.image,
      fallbackIcon: React.createElement(Icons.Package, {
        width: 16,
        height: 16,
        className: "text-white/40"
      })
    })), React.createElement("span", null, React.createElement("span", {
      className: "font-semibold text-zinc-100"
    }, item.name)))), React.createElement("td", {
      style: {
        color: 'var(--dim)'
      }
    }, subtitle), React.createElement("td", {
      className: "cx-rarity"
    }, item.rarity ? fmtRaritySm(item.rarity) : '\u2014'), React.createElement("td", {
      className: "cx-star"
    }, React.createElement("button", {
      type: "button",
      onClick: () => toggleFavorite(category, item.id),
      "aria-label": "Remove favorite",
      className: "cx-star-on"
    }, '\u2605')));
  };
  var showSection = tab => activeTab === 'All' || activeTab === tab;
  return React.createElement("div", {
    className: "flex flex-col h-full pt-6 pb-32 px-6 overflow-y-auto custom-scrollbar"
  }, React.createElement(ViewCrumbs, {
    trail: [{
      label: 'Main page',
      onClick: onBack
    }],
    current: "My Favorites"
  }), React.createElement("h1", {
    className: "cx-title"
  }, "My Favorites"), React.createElement("p", {
    className: "cx-hatnote"
  }, "Your bookmarked killers, survivors, perks, items, add-ons, and offerings."), React.createElement("div", {
    className: "max-w-3xl mx-auto flex flex-wrap justify-center gap-2 mb-6 mt-4"
  }, tabs.map(tab => {
    var count = tab === 'All' ? totalCount : tab === 'Killers' ? favKillers.length : tab === 'Survivors' ? favSurvivors.length : tab === 'Perks' ? favPerks.length : tab === 'Items' ? favItems.length : tab === 'Addons' ? favAddons.length : favOfferings.length;
    return React.createElement("button", {
      key: tab,
      onClick: () => setActiveTab(tab),
      className: "px-4 py-2 text-xs rounded-lg border transition-colors ".concat(activeTab === tab ? 'bg-zinc-100 text-black border-zinc-100 font-bold' : 'bg-transparent text-zinc-300 border-white/15 hover:border-white/30')
    }, tab, count > 0 ? " (".concat(count, ")") : '');
  })), React.createElement("div", {
    className: "pb-32 -mx-6 px-6"
  }, totalCount === 0 ? React.createElement("div", {
    className: "flex flex-col items-center justify-center text-center mt-16 animate-in fade-in duration-500"
  }, React.createElement("div", {
    className: "w-20 h-20 rounded-xl bg-white/5 border border-white/15 flex items-center justify-center mb-4"
  }, React.createElement(Icons.Star, {
    width: 36,
    height: 36,
    className: "text-zinc-500"
  })), React.createElement("h3", {
    className: "text-lg font-bold text-white mb-2 [font-family:var(--font-display)]"
  }, "No Favorites Yet"), React.createElement("p", {
    className: "text-zinc-500 text-sm max-w-xs"
  }, "Star any killer, survivor, perk, item, addon, or offering to see them here for quick access."), React.createElement("button", {
    onClick: () => setView('home'),
    className: "mt-6 px-6 py-3 rounded-xl bg-[var(--panel)] border border-[var(--stroke)] text-zinc-300 text-sm font-semibold transition-colors"
  }, "Browse Content")) : React.createElement("div", {
    className: "animate-in fade-in slide-in-from-bottom-4 duration-500"
  }, showSection('Killers') && React.createElement(FavSection, {
    title: "Killers",
    items: favKillers,
    category: "Killer",
    columns: charColumns,
    renderItem: item => React.createElement(CharRow, {
      key: item.id,
      item: item,
      category: "Killer"
    })
  }), showSection('Survivors') && React.createElement(FavSection, {
    title: "Survivors",
    items: favSurvivors,
    category: "Survivor",
    columns: charColumns,
    renderItem: item => React.createElement(CharRow, {
      key: item.id,
      item: item,
      category: "Survivor"
    })
  }), showSection('Perks') && React.createElement(FavSection, {
    title: "Perks",
    items: favPerks,
    category: "Perk",
    columns: perkColumns,
    renderItem: item => React.createElement(PerkRow, {
      key: item.id,
      item: item
    })
  }), showSection('Items') && React.createElement(FavSection, {
    title: "Items",
    items: favItems,
    category: "Item",
    columns: smallColumns,
    renderItem: item => React.createElement(SmallRow, {
      key: item.id,
      item: item,
      category: "Item",
      subtitle: item.itemType || 'Item'
    })
  }), showSection('Addons') && React.createElement(FavSection, {
    title: "Addons",
    items: favAddons,
    category: "Addon",
    columns: smallColumns,
    renderItem: item => React.createElement(SmallRow, {
      key: item.id,
      item: item,
      category: "Addon",
      subtitle: item.killerName || item.itemType || 'Addon'
    })
  }), showSection('Offerings') && React.createElement(FavSection, {
    title: "Offerings",
    items: favOfferings,
    category: "Offering",
    columns: smallColumns,
    renderItem: item => React.createElement(SmallRow, {
      key: item.id,
      item: item,
      category: "Offering",
      subtitle: item.role || 'Universal'
    })
  }))));
};
var SettingsToggleRow = _ref52 => {
  var {
    checked,
    onChange,
    label,
    description
  } = _ref52;
  return React.createElement("button", {
    type: "button",
    role: "switch",
    "aria-checked": checked,
    onClick: () => onChange(!checked),
    className: "w-full flex items-start gap-3 rounded-2xl border px-3 py-3 transition-all text-left select-none touch-manipulation ".concat(checked ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/10 hover:border-white/20'),
    style: {
      WebkitTapHighlightColor: 'transparent'
    }
  }, React.createElement("span", {
    "aria-hidden": "true",
    className: "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all",
    style: {
      background: checked ? 'var(--accent)' : 'rgba(255,255,255,0.03)',
      borderColor: checked ? 'var(--accent)' : 'var(--stroke)',
      boxShadow: checked ? '0 8px 18px rgba(0,0,0,0.28)' : 'none',
      color: checked ? '#ffffff' : 'transparent'
    }
  }, React.createElement(Icons.Check, {
    width: 12,
    height: 12
  })), React.createElement("span", {
    className: "min-w-0 flex-1 pointer-events-none"
  }, React.createElement("span", {
    className: "block text-sm font-medium text-white leading-tight"
  }, label), description && React.createElement("span", {
    className: "mt-1 block text-xs leading-relaxed text-zinc-400"
  }, description)));
};
var SettingsView = _ref53 => {
  var _restorePreview$meta, _restorePreview$meta2, _META$contact, _META$contact2, _META$contact3;
  var {
    onBack,
    settings,
    setSettings,
    backupSummary,
    onCopyBackup,
    onDownloadBackup,
    onRestoreBackup,
    isMobile = false
  } = _ref53;
  var updateSetting = (field, value) => setSettings(prev => {
    return _objectSpread(_objectSpread({}, prev), {}, {
      [field]: value
    });
  });
  var favoriteCounts = {
    favoritePerks: (settings.favoritePerks || []).length,
    favoriteKillers: (settings.favoriteKillers || []).length,
    favoriteSurvivors: (settings.favoriteSurvivors || []).length,
    favoriteItems: (settings.favoriteItems || []).length,
    favoriteAddons: (settings.favoriteAddons || []).length,
    favoriteOfferings: (settings.favoriteOfferings || []).length
  };
  var resetAllSettings = () => {
    if (!confirm('Reset all website preferences to defaults?')) return;
    setSettings(_objectSpread(_objectSpread({}, DEFAULT_SETTINGS), {}, {
      settingsVersion: 2
    }));
  };
  var [backupDraft, setBackupDraft] = useState('');
  var [backupPreview, setBackupPreview] = useState(null);
  var [backupError, setBackupError] = useState('');
  var backupFileInputRef = useRef(null);
  var refreshBackupPreview = useCallback(value => {
    var nextValue = typeof value === 'string' ? value : '';
    setBackupDraft(nextValue);
    if (!nextValue.trim()) {
      setBackupPreview(null);
      setBackupError('');
      return;
    }
    try {
      var parsed = parseWebsiteBackupPayload(nextValue);
      setBackupPreview(parsed);
      setBackupError('');
    } catch (error) {
      setBackupPreview(null);
      setBackupError((error === null || error === void 0 ? void 0 : error.message) || 'Backup content is invalid.');
    }
  }, []);
  var handleBackupFileChange = useCallback(event => {
    var _event$target$files;
    var file = (_event$target$files = event.target.files) === null || _event$target$files === void 0 ? void 0 : _event$target$files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = () => refreshBackupPreview(String(reader.result || ''));
    reader.onerror = () => {
      setBackupPreview(null);
      setBackupError('Could not read that backup file.');
    };
    reader.readAsText(file);
    event.target.value = '';
  }, [refreshBackupPreview]);
  var restorePreview = (backupPreview === null || backupPreview === void 0 ? void 0 : backupPreview.payload) || null;
  return React.createElement("div", {
    className: "flex flex-col h-full pt-6 pb-32 px-6 overflow-y-auto custom-scrollbar"
  }, React.createElement(ViewCrumbs, {
    trail: [{
      label: 'Main page',
      onClick: onBack
    }],
    current: "Settings"
  }), React.createElement("h1", {
    className: "cx-title"
  }, "Settings"), React.createElement("p", {
    className: "cx-hatnote"
  }, "Website preferences and backups."), React.createElement("div", {
    className: "pb-32 -mx-6 px-6 space-y-4"
  }, isMobile && settings.googlePlayCtaHidden === true && React.createElement("div", null, React.createElement("h2", {
    className: "cx-sec"
  }, "App"), React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Get the app"), React.createElement("td", null, React.createElement("div", {
    className: "flex items-center justify-between gap-3"
  }, React.createElement("h3", {
    className: "text-lg font-bold text-white"
  }, "Get the app"), React.createElement("button", {
    type: "button",
    onClick: () => updateSetting('googlePlayCtaHidden', false),
    className: "px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
  }, "Show Banner")), React.createElement(PlayStoreFooter, {
    compact: true,
    className: "w-fit"
  })))))), React.createElement("h2", {
    className: "cx-sec"
  }, "Website info"), React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Website Version"), React.createElement("td", null, React.createElement("span", {
    className: "text-white font-semibold"
  }, META.siteVersion))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Game Update / Data Updated"), React.createElement("td", null, React.createElement("span", {
    className: "text-white font-semibold"
  }, META.gameVersion, " / ", META.lastSynced))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Legal"), React.createElement("td", null, React.createElement(SiteLegalFooter, {
    className: "mt-3"
  }))))), React.createElement("h2", {
    className: "cx-sec"
  }, "Guide sources"), React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Official DBD Wiki"), React.createElement("td", null, "Power mechanics and numbers per killer, paraphrased in our own words. ", React.createElement("a", {
    href: "https://deadbydaylight.wiki.gg/wiki/Powers",
    target: "_blank",
    rel: "noreferrer"
  }, "Powers compendium"), " (CC BY-NC-SA, no verbatim reuse).")), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Reddit"), React.createElement("td", null, "Playing-as and playing-against tactics synthesized from r/deadbydaylight character guides and counterplay threads. Summarized with thread credit per killer, never copied.")), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "YouTube"), React.createElement("td", null, "Expert video guides (Otzdarva killer guides, SupaAlf, ScottJund, SpookyLoopz, JRM). Tactics summarized with video credit per killer, never transcribed.")), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Steam Guides"), React.createElement("td", null, "Community build and strategy guides. Ideas summarized with author credit per killer.")), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Behaviour"), React.createElement("td", null, "Patch notes and game updates used to verify numbers per patch. All game text paraphrased.")))), React.createElement("h2", {
    className: "cx-sec"
  }, "Appearance"), React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Color"), React.createElement("td", null, React.createElement("div", {
    className: "grid grid-cols-3 gap-1.5"
  }, [{
    id: 'dark',
    label: 'Dark'
  }, {
    id: 'oled',
    label: 'OLED'
  }, {
    id: 'light',
    label: 'Light'
  }].map(mode => {
    var isActive = (settings.colorMode || 'oled') === mode.id;
    return React.createElement("button", {
      key: mode.id,
      type: "button",
      onClick: () => updateSetting('colorMode', mode.id),
      className: "mode-choice ".concat(isActive ? 'mode-choice--active' : '', " rounded-xl px-2 py-2 text-xs font-bold transition-colors"),
      "aria-pressed": isActive
    }, mode.label);
  })))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Text size"), React.createElement("td", null, React.createElement("select", {
    value: settings.fontSize,
    onChange: e => updateSetting('fontSize', e.target.value),
    className: "themed-select w-full text-sm"
  }, React.createElement("option", {
    value: "small"
  }, "Small"), React.createElement("option", {
    value: "default"
  }, "Standard"), React.createElement("option", {
    value: "large"
  }, "Large")))))), React.createElement("h2", {
    className: "cx-sec"
  }, "Features"), React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Show template builds in Build Lab"), React.createElement("td", null, React.createElement(SettingsToggleRow, {
    checked: settings.showTemplates,
    onChange: value => updateSetting('showTemplates', value),
    label: "Show template builds in Build Lab",
    description: "Keep the premade starter builds visible alongside your own saved builds."
  }))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Rarity glow effects on cards"), React.createElement("td", null, React.createElement(SettingsToggleRow, {
    checked: settings.rarityGlows !== false,
    onChange: value => updateSetting('rarityGlows', value),
    label: "Rarity glow effects on cards",
    description: "Adds rarity-colored glow styling to perks, addons, items, and offerings."
  }))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Haptic feedback"), React.createElement("td", null, React.createElement(SettingsToggleRow, {
    checked: settings.hapticEnabled !== false,
    onChange: value => updateSetting('hapticEnabled', value),
    label: "Haptic feedback",
    description: "Use short vibration feedback on supported mobile devices."
  }))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Owned Only global filter"), React.createElement("td", null, React.createElement(SettingsToggleRow, {
    checked: settings.ownedOnlyGlobal === true,
    onChange: value => updateSetting('ownedOnlyGlobal', value),
    label: "Owned Only global filter",
    description: "Filters supported views and randomizers to the characters and perks you own."
  }))))), React.createElement("h2", {
    className: "cx-sec"
  }, "Perk descriptions"), React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Wording"), React.createElement("td", null, React.createElement("p", {
    className: "text-sm text-zinc-400 mb-2"
  }, "Choose which perk wording the website should show when both legacy and post-9.5.0 text are available."), React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, [{
    id: 'legacy',
    label: 'Legacy',
    description: 'Keep the original one-block descriptions already stored in the wiki.'
  }, {
    id: 'post95',
    label: 'Post-9.5.0',
    description: 'Use the newer multiline wording and highlight percentage values when available.'
  }].map(option => React.createElement("button", {
    key: option.id,
    onClick: () => updateSetting('perkDescriptionMode', option.id),
    className: "p-3 rounded-2xl border text-left transition-all ".concat(settings.perkDescriptionMode === option.id ? 'bg-white/10 text-white' : 'bg-white/5 text-zinc-300 hover:border-white/20'),
    style: settings.perkDescriptionMode === option.id ? {
      borderColor: 'var(--accent)',
      color: 'var(--accent)'
    } : {}
  }, React.createElement("p", {
    className: "text-sm font-bold"
  }, option.label), React.createElement("p", {
    className: "text-[11px] text-zinc-500 mt-1 leading-relaxed"
  }, option.description)))))))), React.createElement("h2", {
    className: "cx-sec"
  }, "Favorites"), React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("tbody", null, [{
    key: 'favoritePerks',
    label: 'Perks'
  }, {
    key: 'favoriteKillers',
    label: 'Killers'
  }, {
    key: 'favoriteSurvivors',
    label: 'Survivors'
  }, {
    key: 'favoriteItems',
    label: 'Items'
  }, {
    key: 'favoriteAddons',
    label: 'Addons'
  }, {
    key: 'favoriteOfferings',
    label: 'Offerings'
  }].map(entry => React.createElement("tr", {
    key: entry.key
  }, React.createElement("th", {
    scope: "row"
  }, entry.label, " (", favoriteCounts[entry.key], ")"), React.createElement("td", null, React.createElement("div", {
    className: "flex items-center justify-between gap-3"
  }, React.createElement("span", {
    className: "text-sm text-zinc-300"
  }, favoriteCounts[entry.key], " saved"), React.createElement("button", {
    type: "button",
    onClick: () => updateSetting(entry.key, []),
    disabled: favoriteCounts[entry.key] === 0,
    className: "px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
  }, "Clear"))))))), React.createElement("h2", {
    className: "cx-sec"
  }, "Data backup"), React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Summary"), React.createElement("td", null, React.createElement("div", {
    className: "flex items-start justify-between gap-3 mb-2"
  }, React.createElement("div", null, React.createElement("h3", {
    className: "text-lg font-bold text-white"
  }, "Data Backup"), React.createElement("p", {
    className: "text-sm text-zinc-400 mt-1"
  }, "Export the full local website state or restore it later. Restores replace your current local data.")), React.createElement("span", {
    className: "px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] uppercase tracking-wider text-zinc-400"
  }, "Backup")), React.createElement("div", {
    className: "grid grid-cols-2 sm:grid-cols-3 gap-2"
  }, [{
    label: 'Builds',
    value: (backupSummary === null || backupSummary === void 0 ? void 0 : backupSummary.builds) || 0
  }, {
    label: 'Matches',
    value: (backupSummary === null || backupSummary === void 0 ? void 0 : backupSummary.matches) || 0
  }, {
    label: 'Notes',
    value: (backupSummary === null || backupSummary === void 0 ? void 0 : backupSummary.notes) || 0
  }, {
    label: 'Owned',
    value: (backupSummary === null || backupSummary === void 0 ? void 0 : backupSummary.ownedCharacters) || 0
  }, {
    label: 'Challenges',
    value: (backupSummary === null || backupSummary === void 0 ? void 0 : backupSummary.challenges) || 0
  }, {
    label: 'Wordle Games',
    value: (backupSummary === null || backupSummary === void 0 ? void 0 : backupSummary.worldleGamesPlayed) || 0
  }].map(item => React.createElement("div", {
    key: item.label,
    className: "rounded-2xl border border-white/8 bg-black/20 px-3 py-3"
  }, React.createElement("p", {
    className: "text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-bold"
  }, item.label), React.createElement("p", {
    className: "text-lg font-bold text-white mt-2"
  }, item.value)))))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Export"), React.createElement("td", null, React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-3 gap-2"
  }, React.createElement("button", {
    onClick: onCopyBackup,
    className: "flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-all"
  }, React.createElement(Icons.Copy, {
    width: 16,
    height: 16
  }), React.createElement("span", {
    className: "text-sm font-semibold"
  }, "Copy Backup Text")), React.createElement("button", {
    onClick: onDownloadBackup,
    className: "flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-all"
  }, React.createElement(Icons.Import, {
    width: 16,
    height: 16,
    className: "rotate-180"
  }), React.createElement("span", {
    className: "text-sm font-semibold"
  }, "Download Backup File")), React.createElement("button", {
    onClick: () => {
      var _backupFileInputRef$c;
      return (_backupFileInputRef$c = backupFileInputRef.current) === null || _backupFileInputRef$c === void 0 ? void 0 : _backupFileInputRef$c.click();
    },
    className: "flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-all"
  }, React.createElement(Icons.Import, {
    width: 16,
    height: 16
  }), React.createElement("span", {
    className: "text-sm font-semibold"
  }, "Load Backup File"))), React.createElement("input", {
    ref: backupFileInputRef,
    type: "file",
    accept: ".json,application/json,text/json",
    className: "hidden",
    onChange: handleBackupFileChange
  }))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Restore from Backup"), React.createElement("td", null, React.createElement("div", {
    className: "space-y-2"
  }, React.createElement("div", {
    className: "flex items-center justify-between gap-3"
  }, React.createElement("p", {
    className: "text-[11px] uppercase tracking-[0.16em] text-zinc-500 font-bold"
  }, "Restore from Backup"), ((restorePreview === null || restorePreview === void 0 || (_restorePreview$meta = restorePreview.meta) === null || _restorePreview$meta === void 0 ? void 0 : _restorePreview$meta.siteVersion) || (restorePreview === null || restorePreview === void 0 || (_restorePreview$meta2 = restorePreview.meta) === null || _restorePreview$meta2 === void 0 ? void 0 : _restorePreview$meta2.appVersion)) && React.createElement("span", {
    className: "text-[10px] uppercase tracking-wider text-zinc-500"
  }, "backup from v", restorePreview.meta.siteVersion || restorePreview.meta.appVersion)), React.createElement("textarea", {
    value: backupDraft,
    onChange: event => refreshBackupPreview(event.target.value),
    rows: 7,
    placeholder: "Paste a full backup here...",
    className: "w-full bg-zinc-800/60 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 font-mono"
  }), backupError && React.createElement("div", {
    className: "rounded-2xl border border-white/25/20 bg-zinc-500/10 px-4 py-3 text-sm text-zinc-300"
  }, backupError), (backupPreview === null || backupPreview === void 0 ? void 0 : backupPreview.summary) && !backupError && React.createElement("div", {
    className: "rounded-2xl border border-white/8 bg-black/20 px-4 py-4 space-y-3"
  }, React.createElement("div", {
    className: "flex flex-wrap items-center gap-2"
  }, React.createElement("span", {
    className: "px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] uppercase tracking-wider text-zinc-300"
  }, "Backup format ", backupPreview.summary.schemaVersion || 0), backupPreview.summary.exportedAt && React.createElement("span", {
    className: "px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] uppercase tracking-wider text-zinc-500"
  }, new Date(backupPreview.summary.exportedAt).toLocaleString())), React.createElement("div", {
    className: "grid grid-cols-2 sm:grid-cols-3 gap-2"
  }, [{
    label: 'Builds',
    value: backupPreview.summary.builds
  }, {
    label: 'Matches',
    value: backupPreview.summary.matches
  }, {
    label: 'Notes',
    value: backupPreview.summary.notes
  }, {
    label: 'Owned',
    value: backupPreview.summary.ownedCharacters
  }, {
    label: 'Challenges',
    value: backupPreview.summary.challenges
  }, {
    label: 'Wordle Games',
    value: backupPreview.summary.worldleGamesPlayed
  }].map(item => React.createElement("div", {
    key: item.label,
    className: "rounded-xl border border-white/8 bg-white/5 px-3 py-2"
  }, React.createElement("p", {
    className: "text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-bold"
  }, item.label), React.createElement("p", {
    className: "text-sm font-bold text-white mt-1"
  }, item.value)))), React.createElement("button", {
    onClick: () => {
      if (!restorePreview) return;
      var confirmed = window.confirm('Restore this backup and replace your current local data? This cannot be undone unless you export your current state first.');
      if (!confirmed) return;
      onRestoreBackup(restorePreview);
      setBackupDraft('');
      setBackupPreview(null);
      setBackupError('');
      alert('Backup restored.');
    },
    className: "w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-colors"
  }, "Restore Backup"))))))), React.createElement("h2", {
    className: "cx-sec"
  }, "Reset"), React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Defaults"), React.createElement("td", null, React.createElement("p", {
    className: "text-sm text-zinc-400 mb-2"
  }, "Restore every website preference to its default value. Builds, matches, progression, and backups are not touched."), React.createElement("button", {
    type: "button",
    onClick: resetAllSettings,
    className: "px-4 py-3 rounded-2xl bg-zinc-100 text-black font-bold text-sm"
  }, "Reset all preferences"))))), React.createElement("h2", {
    className: "cx-sec"
  }, "About"), React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Special Thanks"), React.createElement("td", null, React.createElement("ul", {
    className: "text-sm text-zinc-400 space-y-1"
  }, META.thanks.map((item, i) => React.createElement("li", {
    key: i,
    className: "flex items-start gap-2"
  }, React.createElement("span", {
    className: "text-zinc-100"
  }, "\u2022"), React.createElement("span", null, item)))))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Disclaimer"), React.createElement("td", null, React.createElement("p", {
    className: "text-sm text-zinc-400"
  }, "This website is a work in progress. Core features are stable, but some rough edges may remain while it continues to improve. Not official; I do not own any of the logos or licences, just built with love for the game."))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Contact"), React.createElement("td", null, React.createElement("div", {
    className: "space-y-1 text-sm text-zinc-300"
  }, React.createElement("div", {
    className: "flex items-center gap-2"
  }, React.createElement("span", {
    className: "text-zinc-500 uppercase text-[10px] font-bold tracking-wide"
  }, "Email"), React.createElement("a", {
    href: "mailto:".concat(((_META$contact = META.contact) === null || _META$contact === void 0 ? void 0 : _META$contact.email) || ''),
    className: "font-semibold text-white hover:underline"
  }, (_META$contact2 = META.contact) === null || _META$contact2 === void 0 ? void 0 : _META$contact2.email)), React.createElement("div", {
    className: "flex items-center gap-2"
  }, React.createElement("span", {
    className: "text-zinc-500 uppercase text-[10px] font-bold tracking-wide"
  }, "Discord"), React.createElement("span", {
    className: "font-semibold text-white"
  }, ((_META$contact3 = META.contact) === null || _META$contact3 === void 0 ? void 0 : _META$contact3.discord) || 'Coming soon')))))))));
};
var PrestigeCalculatorView = _ref54 => {
  var {
    onBack
  } = _ref54;
  var [currentPrestige, setCurrentPrestige] = useState(0);
  var [currentLevel, setCurrentLevel] = useState(1);
  var [targetPrestige, setTargetPrestige] = useState(100);
  var [efficiency, setEfficiency] = useState('average');
  var [bpPerMatch, setBpPerMatch] = useState(30000);
  var [matchLength, setMatchLength] = useState(12);
  var [animatedBP, setAnimatedBP] = useState(0);
  var PRESTIGE_COSTS = {
    efficient: 850000,
    average: 1050000,
    completionist: 1500000
  };
  var costPerPrestige = PRESTIGE_COSTS[efficiency];
  var prestigesNeeded = Math.max(0, targetPrestige - currentPrestige);
  var levelProgress = Math.max(0, Math.min(50, currentLevel - 1)) / 50;
  var bpAlreadySpent = levelProgress * costPerPrestige;
  var totalBPNeeded = Math.max(0, prestigesNeeded * costPerPrestige - bpAlreadySpent);
  var matchesNeeded = Math.ceil(totalBPNeeded / bpPerMatch);
  var hoursNeeded = matchesNeeded * matchLength / 60;
  var progressPercent = targetPrestige > 0 ? Math.min(100, (currentPrestige + levelProgress) / targetPrestige * 100) : 0;
  useEffect(() => {
    var duration = 1000;
    var startTime = performance.now();
    var startValue = animatedBP;
    var endValue = totalBPNeeded;
    var animate = currentTime => {
      var elapsed = currentTime - startTime;
      var progress = Math.min(elapsed / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedBP(Math.floor(startValue + (endValue - startValue) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [totalBPNeeded]);
  var getEntityQuote = () => {
    if (prestigesNeeded === 0) return "Your offering is complete...";
    if (prestigesNeeded <= 5) return "A modest offering...";
    if (prestigesNeeded <= 20) return "The Entity stirs...";
    if (prestigesNeeded <= 50) return "The Entity hungers...";
    return "An endless feast awaits...";
  };
  var formatNumber = num => {
    return num.toLocaleString();
  };
  return React.createElement("div", {
    className: "h-full pt-6 pb-32 overflow-y-auto custom-scrollbar"
  }, React.createElement("div", {
    className: "relative px-6 max-w-2xl md:max-w-5xl mx-auto"
  }, React.createElement("div", {
    className: "fog-layer fixed inset-0 pointer-events-none z-0",
    style: {}
  }), React.createElement("div", {
    className: "relative z-10"
  }, React.createElement(ViewCrumbs, {
    trail: [{
      label: 'Main page',
      onClick: onBack
    }],
    current: "The Entity's Offering"
  }), React.createElement("h1", {
    className: "cx-title"
  }, "The Entity's Offering"), React.createElement("p", {
    className: "cx-hatnote"
  }, "Bloodpoint calculator for prestige goals."), React.createElement("p", {
    className: "text-zinc-100/80 text-sm italic font-medium tracking-wide text-center mb-4"
  }, getEntityQuote()), React.createElement("h2", {
    className: "cx-sec"
  }, "Prestige inputs"), React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Prestige"), React.createElement("td", null, React.createElement("input", {
    type: "number",
    min: "0",
    max: "100",
    value: currentPrestige,
    onChange: e => setCurrentPrestige(e.target.value === '' ? '' : parseInt(e.target.value) || 0),
    onBlur: e => setCurrentPrestige(Math.min(100, Math.max(0, parseInt(e.target.value) || 0))),
    className: "cx-numinput w-full py-3 text-2xl font-bold"
  }))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Level"), React.createElement("td", null, React.createElement("input", {
    type: "number",
    min: "1",
    max: "50",
    value: currentLevel,
    onChange: e => setCurrentLevel(e.target.value === '' ? '' : parseInt(e.target.value) || 1),
    onBlur: e => setCurrentLevel(Math.min(50, Math.max(1, parseInt(e.target.value) || 1))),
    className: "cx-numinput w-full py-2"
  }))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Target"), React.createElement("td", null, React.createElement("input", {
    type: "number",
    min: "0",
    max: "100",
    value: targetPrestige,
    onChange: e => setTargetPrestige(e.target.value === '' ? '' : parseInt(e.target.value) || 0),
    onBlur: e => setTargetPrestige(Math.min(100, Math.max(0, parseInt(e.target.value) || 0))),
    className: "cx-numinput w-full py-3 text-2xl font-bold"
  }))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Progress"), React.createElement("td", null, React.createElement("div", {
    className: "flex justify-between text-xs text-zinc-500 mb-2"
  }, React.createElement("span", null, "Progress"), React.createElement("span", null, progressPercent.toFixed(0), "%")), React.createElement("div", {
    className: "cx-meter"
  }, React.createElement("div", {
    style: {
      width: "".concat(progressPercent, "%")
    }
  })))))), React.createElement("h2", {
    className: "cx-sec"
  }, "Bloodpoints required"), React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Bloodpoints Required"), React.createElement("td", null, React.createElement("div", {
    className: "text-center"
  }, React.createElement("div", {
    className: "blood-text text-5xl sm:text-6xl font-black mb-2",
    style: {
      letterSpacing: '-0.02em',
      color: 'var(--text)'
    }
  }, formatNumber(animatedBP)), React.createElement("div", {
    className: "text-zinc-500 text-sm"
  }, prestigesNeeded, " prestige", prestigesNeeded !== 1 ? 's' : '', " \xD7 ", formatNumber(costPerPrestige), " BP")))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Prestiges"), React.createElement("td", {
    className: "text-center"
  }, React.createElement("div", {
    className: "text-2xl font-bold text-white"
  }, prestigesNeeded))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Matches"), React.createElement("td", {
    className: "text-center"
  }, React.createElement("div", {
    className: "text-2xl font-bold text-white"
  }, formatNumber(matchesNeeded)))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Hours"), React.createElement("td", {
    className: "text-center"
  }, React.createElement("div", {
    className: "text-2xl font-bold text-white"
  }, hoursNeeded.toFixed(1)))))), React.createElement("h2", {
    className: "cx-sec"
  }, "Settings"), React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Bloodweb Mode"), React.createElement("td", null, React.createElement("div", {
    className: "flex gap-2"
  }, [{
    id: 'efficient',
    label: 'Skip Level',
    desc: '~850k/P',
    sub: 'Skip Level Up',
    color: '#e4e4e7',
    bg: 'rgba(228,228,231,0.12)'
  }, {
    id: 'average',
    label: 'Auto Buy',
    desc: '~1.05M/P',
    sub: 'Auto Purchase',
    color: '#e4e4e7',
    bg: 'rgba(228,228,231,0.12)'
  }, {
    id: 'completionist',
    label: 'Manual',
    desc: '~1.5M/P',
    sub: 'Full Bloodweb',
    color: '#d4d4d8',
    bg: 'rgba(212,212,216,0.12)'
  }].map(opt => React.createElement("button", {
    key: opt.id,
    onClick: () => setEfficiency(opt.id),
    className: "mode-choice ".concat(efficiency === opt.id ? 'mode-choice--active' : '', " flex-1 py-2 px-2 text-xs font-bold"),
    "aria-pressed": efficiency === opt.id
  }, React.createElement("div", null, opt.label), React.createElement("div", {
    className: "text-[9px] opacity-60"
  }, opt.desc), React.createElement("div", {
    className: "text-[8px] opacity-40 mt-0.5"
  }, opt.sub)))))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "BP per Match"), React.createElement("td", null, React.createElement("input", {
    type: "number",
    value: bpPerMatch,
    onChange: e => setBpPerMatch(e.target.value === '' ? '' : parseInt(e.target.value) || 30000),
    onBlur: e => setBpPerMatch(Math.max(1000, parseInt(e.target.value) || 30000)),
    className: "cx-input w-full px-3 py-2 text-sm"
  }))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Match Length (min)"), React.createElement("td", null, React.createElement("input", {
    type: "number",
    value: matchLength,
    onChange: e => setMatchLength(e.target.value === '' ? '' : parseInt(e.target.value) || 12),
    onBlur: e => setMatchLength(Math.max(1, parseInt(e.target.value) || 12)),
    className: "cx-input w-full px-3 py-2 text-sm"
  }))), React.createElement("tr", null, React.createElement("th", {
    scope: "row"
  }, "Milestones"), React.createElement("td", null, React.createElement("div", {
    className: "text-center text-[10px] text-zinc-500 leading-relaxed"
  }, React.createElement("span", {
    className: "text-zinc-500"
  }, "P1-3"), " Universal teachables (T1\u2192T2\u2192T3) \u2022 ", React.createElement("span", {
    className: "text-zinc-500"
  }, "P4-6"), " Bloody cosmetics \u2022 ", React.createElement("span", {
    className: "text-zinc-500"
  }, "P7-9"), " Perk charms \u2022 ", React.createElement("span", {
    className: "text-zinc-500"
  }, "P25/50/75/100"), " Character badge reward tiers"))))))));
};
var WikiDialog = _ref55 => {
  var {
    title,
    eyebrow,
    subtitle,
    onClose,
    children,
    footer,
    className = ''
  } = _ref55;
  var panelRef = useRef(null);
  var closeRef = useRef(onClose);
  closeRef.current = onClose;
  var titleId = React.useId();
  useEffect(() => {
    var _panel$querySelector;
    var previous = document.activeElement;
    var shell = document.querySelector('.site-shell');
    var wasInert = shell === null || shell === void 0 ? void 0 : shell.inert;
    if (shell) shell.inert = true;
    var previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    var panel = panelRef.current;
    panel === null || panel === void 0 || (_panel$querySelector = panel.querySelector('[data-dialog-close]')) === null || _panel$querySelector === void 0 || _panel$querySelector.focus();
    var handleKey = event => {
      if (event.key === 'Escape') {
        var _closeRef$current;
        event.preventDefault();
        event.stopPropagation();
        (_closeRef$current = closeRef.current) === null || _closeRef$current === void 0 || _closeRef$current.call(closeRef);
      }
      if (event.key !== 'Tab') return;
      var stops = [...((panel === null || panel === void 0 ? void 0 : panel.querySelectorAll('button:not([disabled]), a[href], textarea, input, select, [tabindex="0"]')) || [])].filter(node => node.getClientRects().length && !node.closest('[hidden]'));
      var first = stops[0],
        last = stops[stops.length - 1];
      if (!first) {
        event.preventDefault();
        panel === null || panel === void 0 || panel.focus();
        return;
      }
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKey, true);
    return () => {
      document.removeEventListener('keydown', handleKey, true);
      if (shell) shell.inert = wasInert;
      document.body.style.overflow = previousOverflow;
      if (previous !== null && previous !== void 0 && previous.isConnected) previous.focus({
        preventScroll: true
      });
    };
  }, []);
  return ReactDOM.createPortal(React.createElement("div", {
    className: "cx-dialog-backdrop",
    onClick: event => {
      if (event.target === event.currentTarget) onClose();
    }
  }, React.createElement("section", {
    ref: panelRef,
    tabIndex: -1,
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": titleId,
    className: "cx-dialog ".concat(className),
    "data-no-swipe": true
  }, React.createElement("header", {
    className: "cx-dialog-head"
  }, React.createElement("div", {
    className: "cx-dialog-heading"
  }, eyebrow && React.createElement("p", {
    className: "cx-dialog-eyebrow"
  }, eyebrow), React.createElement("h2", {
    id: titleId
  }, title), subtitle && React.createElement("p", {
    className: "cx-dialog-subtitle"
  }, subtitle)), React.createElement("button", {
    type: "button",
    className: "cx-dialog-close",
    onClick: onClose,
    "data-dialog-close": true,
    "aria-label": "Close ".concat(title)
  }, React.createElement(Icons.X, {
    width: 20,
    height: 20
  }))), React.createElement("div", {
    className: "cx-dialog-body"
  }, children), footer && React.createElement("footer", {
    className: "cx-dialog-footer"
  }, footer))), document.body);
};
var GameIconsView = _ref56 => {
  var {
    onBack,
    theme
  } = _ref56;
  var scrollRef = useRef(null);
  var [search, setSearch] = useState('');
  var [filter, setFilter] = useState('All');
  var [expandedId, setExpandedId] = useState(null);
  var [viewMode, setViewMode] = useState('glossary');
  var [flashcardIcon, setFlashcardIcon] = useState(null);
  var filters = ['All', 'Health', 'Buff', 'Debuff', 'Killer', 'Proficiency', 'Activity'];
  var categoryLabels = {
    health: 'Health State',
    buff: 'Buff',
    debuff: 'Debuff',
    killer: 'Killer Power',
    proficiency: 'Proficiency',
    activity: 'Activity'
  };
  var filteredIcons = useMemo(() => GAME_ICONS.filter(icon => {
    var matchesSearch = icon.name.toLowerCase().includes(search.toLowerCase()) || icon.description.toLowerCase().includes(search.toLowerCase());
    var matchesFilter = filter === 'All' || filter === 'Health' && icon.category === 'health' || filter === 'Buff' && icon.category === 'buff' || filter === 'Debuff' && icon.category === 'debuff' || filter === 'Killer' && icon.category === 'killer' || filter === 'Proficiency' && icon.category === 'proficiency' || filter === 'Activity' && icon.category === 'activity';
    return matchesSearch && matchesFilter;
  }), [search, filter]);
  var getQuickTip = icon => {
    if (icon.tip) return icon.tip;
    var tips = {
      healthy: 'Can take 2 hits before going down.',
      injured: 'One more hit = downed. You leave blood trails and make noise.',
      dying: 'Crawl to safety or recover. Teammates can pick you up.',
      hooked: 'Progress through stages. Signal teammates for rescue.',
      carried: 'Wiggle, use nearby obstacles, and buy time before the hook.',
      sacrificed: 'Eliminated from the trial.',
      bledout: 'Died from blood loss after 4 minutes in Dying State.',
      dead: 'The Survivor died by a kill condition other than being sacrificed on a Hook.',
      disconnected: 'Player left the match.',
      obsession: 'Certain perks interact differently with you.',
      caged: 'Similar to being hooked but placed by Pyramid Head\'s power.',
      blessed: 'You\'re in a Boon Totem\'s 24m range. Benefits apply while inside.',
      bloodlust: 'Killer speeds up during long chases (+5/10/15%). Break chase to reset.',
      endurance: 'Next hit gives Deep Wound instead of downing. Lost on conspicuous actions.',
      haste: 'Movement speed is increased.',
      undetectable: 'Killer has no Terror Radius, no Red Stain, and hidden Aura.',
      blindness: 'You cannot see ANY auras. Memorize locations beforehand.',
      broken: 'Cannot be healed past Injured. Wait for it to expire.',
      cursed: 'A Hex Totem is affecting you. Find and cleanse it.',
      deepwound: 'Mend yourself ASAP or you\'ll go down when the timer runs out.',
      exhausted: 'Can\'t use exhaustion perks. Recovers while not running.',
      exposed: 'One hit = down from basic attacks. Play safe until it expires.',
      haemorrhage: 'More blood pools + healing regresses at -7%/s if interrupted.',
      hindered: 'Movement speed reduced.',
      incapacitated: 'Cannot interact with props or other Survivors.',
      madness: 'Doctor-exclusive. Causes hallucinations. Snap Out Of It to reduce.',
      mangled: 'Healing takes 25% longer.',
      oblivious: 'Cannot hear the Killer\'s heartbeat or Terror Radius.',
      marked: 'Ghost Face stalked you. You\'re Exposed - avoid the Killer.',
      condemned: 'Onryō curse stacks. At max, she can kill you. Use Video Tapes.',
      infected: 'Wesker\'s Uroboros. At critical, you\'re Hindered and grabbable.',
      sickness: 'Plague\'s vomit. At max, you\'re Broken. Cleanse at a Pool of Devotion.',
      chainhunt: 'Chains attacking everyone. Someone needs to solve the Lament Configuration.',
      lacerated: 'Trickster\'s knives. At max laceration, you lose a health state.',
      swarmed: 'Artist\'s crows on you. Another Dire Crow hit = damage.',
      tormented: 'Pyramid Head can cage you or use Final Judgment instead of hooking.',
      rbt_timer_paused: 'The Reverse Bear Trap is attached, but the death timer is not ticking yet.',
      rbt_timer_active: 'The Reverse Bear Trap timer is live. Get to Jigsaw Boxes immediately.',
      puzzle: 'You are carrying or solving the Lament Configuration. Expect pressure fast.',
      revealed: '2v8 mode: your Aura is shown to both Killers.',
      efficiency: 'Your item lasts longer when this is positive and drains faster when it is negative.',
      progression_speed: 'The main catch-all for faster or slower interaction progress.',
      skillcheck_difficulty: 'Expect larger or smaller Skill Check success zones than normal.',
      skillcheck_probability: 'Skill Checks will show up more or less often than usual.',
      marked_progress: 'Ghost Face is still stalking you. Break line of sight before the bar fills.',
      condemnation: 'Your Condemned meter is still climbing. Deal with tapes before it caps out.',
      infection_progress: 'Wesker is building infection on you. Spray before it reaches critical.',
      sickness_progress: 'Plague infection is building. Avoid teammates and consider when to cleanse.',
      lacerated_progress: 'Each extra knife matters. Break line of sight and force reloads.',
      activity_gen: 'Survivor is repairing a Generator.',
      activity_heal: 'Survivor is healing.',
      activity_totem: 'Survivor is cleansing or blessing a Totem.',
      activity_exitgate: 'Survivor is opening an Exit Gate.',
      activity_recovery: 'Survivor is recovering from Dying State.',
      activity_chest: 'Survivor is unlocking a Chest.',
      activity_killerpower: 'Survivor is interacting with a Killer power prop.',
      activity_invocation: 'Survivor is performing an Invocation in the basement.'
    };
    return tips[icon.id] || icon.description;
  };
  return React.createElement("div", {
    ref: scrollRef,
    className: "h-full overflow-y-auto custom-scrollbar"
  }, React.createElement("article", {
    className: "cx-article cx-icons-page"
  }, React.createElement(ViewCrumbs, {
    trail: [{
      label: 'Main page',
      onClick: onBack
    }],
    current: "Game icons"
  }), React.createElement("h1", {
    className: "cx-title"
  }, "Game icons"), React.createElement("p", {
    className: "cx-hatnote"
  }, "A reference to health states, status effects and the Trial HUD."), React.createElement(WikiHeaderSearchPortal, null, React.createElement("div", {
    className: "cx-icon-search"
  }, React.createElement(Icons.Search, {
    width: 16,
    height: 16
  }), React.createElement("input", {
    "aria-label": "Search game icons",
    value: search,
    onChange: event => setSearch(event.target.value),
    placeholder: "Search icons and descriptions..."
  }), search && React.createElement("button", {
    type: "button",
    onClick: () => setSearch(''),
    "aria-label": "Clear icon search"
  }, React.createElement(Icons.X, {
    width: 16,
    height: 16
  })))), React.createElement("div", {
    className: "cx-icons-tools"
  }, React.createElement("div", {
    className: "cx-reference-tabs",
    role: "group",
    "aria-label": "Icon display"
  }, React.createElement("button", {
    type: "button",
    "aria-pressed": viewMode === 'glossary',
    onClick: () => setViewMode('glossary')
  }, "Reference list"), React.createElement("button", {
    type: "button",
    "aria-pressed": viewMode === 'grid',
    onClick: () => setViewMode('grid')
  }, "Icon grid")), React.createElement("span", {
    "aria-live": "polite"
  }, filteredIcons.length, " ", filteredIcons.length === 1 ? 'icon' : 'icons')), React.createElement("div", {
    className: "cx-icons-reference"
  }, React.createElement("nav", {
    className: "cx-icon-categories",
    "aria-label": "Icon categories"
  }, React.createElement("p", null, "Contents"), filters.map(label => {
    var category = label.toLowerCase();
    var count = label === 'All' ? GAME_ICONS.length : GAME_ICONS.filter(icon => icon.category === category).length;
    return React.createElement("button", {
      type: "button",
      key: label,
      "aria-pressed": filter === label,
      onClick: () => {
        setFilter(label);
        setExpandedId(null);
      }
    }, React.createElement("span", null, label === 'All' ? 'All icons' : categoryLabels[category]), React.createElement("span", null, count));
  })), React.createElement("div", {
    className: "cx-icons-results"
  }, filteredIcons.length === 0 ? React.createElement("div", {
    className: "cx-reference-empty"
  }, React.createElement(Icons.Search, {
    width: 30,
    height: 30
  }), React.createElement("h2", null, "No icons found"), React.createElement("p", null, "Try another name or description, or reset the category."), React.createElement("button", {
    type: "button",
    className: "cx-alink",
    onClick: () => {
      setSearch('');
      setFilter('All');
    }
  }, "Reset filters")) : filters.slice(1).map(label => {
    var group = filteredIcons.filter(icon => icon.category === label.toLowerCase());
    if (!group.length) return null;
    return React.createElement("section", {
      key: label,
      className: "cx-icon-section"
    }, React.createElement("h2", {
      className: "cx-sec"
    }, categoryLabels[label.toLowerCase()], React.createElement("span", {
      className: "cx-reference-count"
    }, group.length)), viewMode === 'grid' ? React.createElement("div", {
      className: "cx-icon-grid"
    }, group.map(icon => React.createElement("button", {
      type: "button",
      key: icon.id,
      className: "cx-icon-tile",
      onClick: () => setFlashcardIcon(icon),
      "aria-label": "Open ".concat(icon.name)
    }, React.createElement("span", {
      className: "cx-icon-art"
    }, React.createElement(AssetFrame, {
      type: "GameIcon",
      size: "fill",
      imageUrl: icon.icon,
      fallbackIcon: React.createElement(Icons.Zap, {
        width: 28,
        height: 28
      })
    })), React.createElement("span", null, icon.name)))) : React.createElement("div", {
      className: "cx-icon-list"
    }, group.map(icon => {
      var expanded = expandedId === icon.id;
      return React.createElement("div", {
        className: "cx-icon-entry",
        key: icon.id
      }, React.createElement("button", {
        type: "button",
        className: "cx-icon-summary",
        "aria-expanded": expanded,
        "aria-controls": "icon-detail-".concat(icon.id),
        onClick: () => setExpandedId(expanded ? null : icon.id)
      }, React.createElement("span", {
        className: "cx-icon-art"
      }, React.createElement(AssetFrame, {
        type: "GameIcon",
        size: "fill",
        imageUrl: icon.icon,
        fallbackIcon: React.createElement(Icons.Zap, {
          width: 24,
          height: 24
        })
      })), React.createElement("span", {
        className: "cx-icon-summary-copy"
      }, React.createElement("span", {
        className: "cx-icon-name"
      }, icon.name), React.createElement("span", {
        className: "cx-icon-excerpt"
      }, icon.description)), React.createElement("span", {
        className: "cx-icon-expand",
        "aria-hidden": "true"
      }, expanded ? '−' : '+')), React.createElement("div", {
        id: "icon-detail-".concat(icon.id),
        hidden: !expanded,
        className: "cx-icon-detail"
      }, React.createElement("p", null, icon.description), React.createElement("h3", null, "In the Trial"), React.createElement("p", null, getQuickTip(icon))));
    })));
  })))), flashcardIcon && React.createElement(WikiDialog, {
    title: flashcardIcon.name,
    eyebrow: categoryLabels[flashcardIcon.category],
    onClose: () => setFlashcardIcon(null),
    className: "cx-dialog--icon",
    footer: React.createElement(React.Fragment, null, React.createElement("span", null, "Game icon reference"), React.createElement("button", {
      type: "button",
      className: "cx-toolbtn",
      onClick: () => setFlashcardIcon(null)
    }, "Close reference"))
  }, React.createElement("div", {
    className: "cx-icon-dialog-art"
  }, React.createElement(AssetFrame, {
    type: "GameIcon",
    size: "fill",
    imageUrl: flashcardIcon.icon,
    fallbackIcon: React.createElement(Icons.Zap, {
      width: 48,
      height: 48
    })
  })), React.createElement("section", {
    className: "cx-icon-dialog-copy"
  }, React.createElement("h3", {
    className: "cx-sec"
  }, "What it means"), React.createElement("p", null, flashcardIcon.description), React.createElement("h3", {
    className: "cx-sec"
  }, "In the Trial"), React.createElement("p", null, getQuickTip(flashcardIcon)))));
};
var FloatingCompareBadge = _ref57 => {
  var {
    count,
    onClick,
    onClear
  } = _ref57;
  if (!count) return null;
  return React.createElement("div", {
    className: "cx-compare-bar",
    role: "region",
    "aria-label": "Selected perks"
  }, React.createElement("button", {
    type: "button",
    onClick: onClick
  }, React.createElement(Icons.BookOpen, {
    width: 16,
    height: 16
  }), React.createElement("span", {
    "aria-live": "polite"
  }, "Compare (", count, "/4)")), React.createElement("button", {
    type: "button",
    onClick: onClear,
    "aria-label": "Clear comparison"
  }, React.createElement(Icons.X, {
    width: 16,
    height: 16
  })));
};
var MapLayoutModal = _ref58 => {
  var {
    map,
    onClose,
    noteValue = '',
    onNoteChange
  } = _ref58;
  var [currentIndex, setCurrentIndex] = useState(0);
  var [layoutBroken, setLayoutBroken] = useState(false);
  var [zoom, setZoom] = useState(1);
  var stageRef = useRef(null);
  useEffect(() => {
    setCurrentIndex(0);
    setZoom(1);
    setLayoutBroken(false);
  }, [map === null || map === void 0 ? void 0 : map.id]);
  useEffect(() => {
    var _stageRef$current;
    setLayoutBroken(false);
    setZoom(1);
    (_stageRef$current = stageRef.current) === null || _stageRef$current === void 0 || _stageRef$current.scrollTo(0, 0);
  }, [currentIndex]);
  if (!map) return null;
  var layouts = getMapLayoutsForName(map.name);
  var selected = layouts[currentIndex] || layouts[0];
  var variation = (selected === null || selected === void 0 ? void 0 : selected.label) || (layouts.length > 1 ? "Layout ".concat(currentIndex + 1) : 'Map layout');
  return React.createElement(WikiDialog, {
    title: map.name,
    eyebrow: "Map reference",
    subtitle: map.realm,
    onClose: onClose,
    className: "cx-dialog--map",
    footer: React.createElement(React.Fragment, null, React.createElement("span", null, layouts.length, " ", layouts.length === 1 ? 'layout' : 'layouts', " available"), React.createElement("button", {
      type: "button",
      className: "cx-toolbtn",
      onClick: onClose
    }, "Close map"))
  }, React.createElement("div", {
    className: "cx-map-reference"
  }, React.createElement("section", {
    className: "cx-map-visual",
    "aria-label": "Layout viewer"
  }, React.createElement("div", {
    className: "cx-map-toolbar"
  }, React.createElement("p", {
    "aria-live": "polite"
  }, variation), React.createElement("div", {
    className: "cx-map-zoom",
    role: "group",
    "aria-label": "Layout zoom"
  }, React.createElement("button", {
    type: "button",
    "aria-label": "Zoom out",
    disabled: zoom <= 1 || layoutBroken || !selected,
    onClick: () => setZoom(value => Math.max(1, value - .5))
  }, "\u2212"), React.createElement("button", {
    type: "button",
    disabled: !selected || layoutBroken,
    onClick: () => {
      var _stageRef$current2;
      setZoom(1);
      (_stageRef$current2 = stageRef.current) === null || _stageRef$current2 === void 0 || _stageRef$current2.scrollTo(0, 0);
    },
    "aria-label": "Fit layout"
  }, zoom === 1 ? 'Fit' : "".concat(Math.round(zoom * 100), "%")), React.createElement("button", {
    type: "button",
    "aria-label": "Zoom in",
    disabled: zoom >= 3 || layoutBroken || !selected,
    onClick: () => setZoom(value => Math.min(3, value + .5))
  }, "+"))), React.createElement("div", {
    ref: stageRef,
    className: "cx-map-stage ".concat(zoom > 1 ? 'cx-map-stage--zoomed' : ''),
    tabIndex: 0,
    "aria-label": "".concat(map.name, " layout, scroll to inspect when zoomed")
  }, selected && !layoutBroken ? React.createElement("img", {
    key: selected.path,
    src: "./dbd_images/".concat(selected.path),
    alt: "".concat(map.name, ": ").concat(variation),
    style: {
      width: "".concat(zoom * 100, "%"),
      maxWidth: 'none'
    },
    onError: () => setLayoutBroken(true)
  }) : React.createElement("div", {
    className: "cx-reference-empty"
  }, React.createElement(Icons.Map, {
    width: 32,
    height: 32
  }), React.createElement("p", null, selected ? 'This layout could not load.' : 'No layout is available for this map.'), selected && React.createElement("button", {
    className: "cx-alink",
    type: "button",
    onClick: () => setLayoutBroken(false)
  }, "Try again"))), layouts.length > 1 && React.createElement("div", {
    className: "cx-reference-tabs cx-map-variations",
    role: "group",
    "aria-label": "Map layout variations"
  }, layouts.map((layout, index) => React.createElement("button", {
    type: "button",
    key: layout.path,
    "aria-pressed": index === currentIndex,
    onClick: () => setCurrentIndex(index)
  }, layout.label || "Layout ".concat(index + 1)))), React.createElement("p", {
    className: "cx-reference-caption"
  }, zoom > 1 ? 'Scroll the layout to inspect it. Select Fit to reset.' : 'Select a variation or zoom in to inspect tiles and callouts.')), React.createElement("aside", {
    className: "cx-map-sidebar"
  }, React.createElement("h3", {
    className: "cx-sec"
  }, "Overview"), React.createElement("p", null, map.description || 'No description is available for this map yet.'), React.createElement("dl", {
    className: "cx-reference-facts"
  }, React.createElement("div", null, React.createElement("dt", null, "Realm"), React.createElement("dd", null, map.realm))), React.createElement("section", {
    className: "cx-map-notes"
  }, React.createElement("h3", {
    className: "cx-sec"
  }, React.createElement("label", {
    htmlFor: "map-reference-notes"
  }, "Personal notes")), React.createElement("textarea", {
    id: "map-reference-notes",
    rows: 5,
    value: noteValue,
    onChange: event => onNoteChange === null || onNoteChange === void 0 ? void 0 : onNoteChange(event.target.value),
    placeholder: "Loops, spawns, tiles and callouts..."
  }), React.createElement("p", {
    className: "cx-reference-caption"
  }, "Saved on this device.")))));
};
var PerkCompareModal = _ref59 => {
  var {
    perks,
    onClose,
    onRemove,
    theme,
    settings = {}
  } = _ref59;
  if (!(perks !== null && perks !== void 0 && perks.length)) return null;
  return React.createElement(WikiDialog, {
    title: "Compare perks",
    eyebrow: "Perk reference",
    subtitle: "".concat(perks.length, " of 4 comparison slots used"),
    onClose: onClose,
    className: "cx-dialog--compare",
    footer: React.createElement(React.Fragment, null, React.createElement("span", null, "Remove a perk to free a slot."), React.createElement("button", {
      type: "button",
      className: "cx-toolbtn",
      onClick: onClose
    }, "Close comparison"))
  }, React.createElement("p", {
    className: "cx-compare-hint"
  }, "Swipe sideways to compare perks."), React.createElement("div", {
    className: "cx-compare-grid",
    style: {
      '--compare-columns': perks.length
    }
  }, perks.map(perk => React.createElement("section", {
    className: "cx-compare-entry",
    key: perk.id
  }, React.createElement("div", {
    className: "cx-compare-entry-head"
  }, React.createElement("span", null, perk.type || 'Perk'), React.createElement("button", {
    type: "button",
    "aria-label": "Remove ".concat(perk.name),
    onClick: () => onRemove(perk)
  }, React.createElement(Icons.X, {
    width: 16,
    height: 16
  }))), React.createElement("div", {
    className: "cx-compare-image"
  }, React.createElement(AssetFrame, {
    type: "Perk",
    size: "fill",
    imageUrl: perk.image
  })), React.createElement("h3", null, perk.name), React.createElement("p", null, perk.owner || 'Universal'), React.createElement(PerkDescriptionBlock, {
    perk: perk,
    settings: settings,
    accentColor: "var(--link)",
    className: "cx-compare-description",
    lineClassName: "leading-relaxed"
  })))));
};
var WikiTable = _ref60 => {
  var {
    caption,
    headers,
    rows
  } = _ref60;
  return React.createElement("table", {
    className: "cx-wikitable w-full"
  }, caption ? React.createElement("caption", null, caption) : null, headers && headers.length > 0 ? React.createElement("thead", null, React.createElement("tr", null, headers.map((h, i) => React.createElement("th", {
    key: i,
    scope: "col"
  }, h)))) : null, React.createElement("tbody", null, rows.map((row, ri) => React.createElement("tr", {
    key: ri
  }, row.map((cell, ci) => cell && typeof cell === "object" && cell.perk ? React.createElement("td", {
    key: ci,
    className: "cx-perkcell"
  }, cell.node) : React.createElement("td", {
    key: ci
  }, cell))))));
};
var normRealmName = v => (v || '').trim().toLowerCase().replace(/^the\s+/, '');
var CxSection = _ref61 => {
  var {
    id,
    view,
    setRef,
    title,
    children,
    collapsible = true
  } = _ref61;
  var narrow = useNarrowTier();
  var storeKey = "cx-sec:".concat(view, ":").concat(id);
  var [open, setOpen] = useState(() => {
    try {
      var saved = window.localStorage.getItem(storeKey);
      return saved === null ? true : saved === '1';
    } catch (e) {
      return true;
    }
  });
  useEffect(() => {
    var expand = e => {
      if (e && e.detail === id) setOpen(true);
    };
    window.addEventListener('cx-expand-section', expand);
    return () => window.removeEventListener('cx-expand-section', expand);
  }, [id]);
  var toggle = () => setOpen(prev => {
    var next = !prev;
    try {
      window.localStorage.setItem(storeKey, next ? '1' : '0');
    } catch (e) {}
    return next;
  });
  if (!narrow || !collapsible) {
    return React.createElement("section", {
      id: id,
      ref: setRef(id)
    }, React.createElement("h2", {
      className: "cx-sec"
    }, title), children);
  }
  return React.createElement("section", {
    id: id,
    ref: setRef(id)
  }, React.createElement("h2", {
    className: "cx-sec cx-sec--toggle",
    role: "button",
    tabIndex: 0,
    "aria-expanded": open,
    onClick: toggle,
    onKeyDown: e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    }
  }, React.createElement("span", {
    className: "cx-sec-title"
  }, title), React.createElement("span", {
    className: "cx-sec-ind",
    "aria-hidden": "true"
  }, open ? '▾' : '▸')), open ? children : null);
};
var PerkArticleView = _ref62 => {
  var {
    perk,
    perks = [],
    killers = [],
    survivors = [],
    onHome,
    onOpenList,
    onOpenCharacter,
    onOpenPerk,
    noteValue = '',
    onNoteChange,
    settings = {},
    scrollSection = null
  } = _ref62;
  var scrollRef = useRef(null);
  var sectionEls = useRef({});
  var ownerChar = useMemo(() => {
    var all = [...(killers || []), ...(survivors || [])];
    return all.find(c => c.name === perk.owner) || null;
  }, [perk, killers, survivors]);
  var synergies = useMemo(() => {
    var names = typeof PERK_SYNERGIES !== 'undefined' && PERK_SYNERGIES[perk.name] || [];
    return names.map(n => ({
      name: n,
      full: (perks || []).find(x => x.name === n) || null
    }));
  }, [perk, perks]);
  var isHex = (perk.name || '').startsWith('Hex:');
  var isExhaust = /exhaust/i.test(perk.description || '');
  var tags = [...(isHex ? ['Hex'] : []), ...(isExhaust ? ['Exhaustion'] : [])];
  var tocEntries = [{
    id: 'overview',
    label: 'Overview'
  }, ...(synergies.length > 0 ? [{
    id: 'synergies',
    label: 'Works Well With'
  }] : []), {
    id: 'notes',
    label: 'Notes'
  }];
  var scrollToSection = id => {
    try {
      window.dispatchEvent(new CustomEvent('cx-expand-section', {
        detail: id
      }));
    } catch (e) {}
    window.setTimeout(() => {
      var node = sectionEls.current[id];
      if (node && node.scrollIntoView) node.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 60);
  };
  var setSectionRef = id => node => {
    if (node) sectionEls.current[id] = node;else delete sectionEls.current[id];
  };
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [perk.id]);
  useEffect(() => {
    if (!scrollSection) return undefined;
    try {
      window.dispatchEvent(new CustomEvent('cx-expand-section', {
        detail: scrollSection
      }));
    } catch (e) {}
    var timer = window.setTimeout(() => {
      var node = sectionEls.current[scrollSection];
      if (node && node.scrollIntoView) node.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [scrollSection, perk.id]);
  return React.createElement("div", {
    className: "flex flex-col h-full overflow-y-auto custom-scrollbar",
    ref: scrollRef
  }, React.createElement("div", {
    className: "cx-article w-full max-w-[1280px] mx-auto min-h-full",
    "data-smoke-profile": perk.id
  }, React.createElement(ViewCrumbs, {
    trail: [{
      label: 'Main page',
      onClick: onHome
    }, {
      label: 'Perks',
      onClick: onOpenList
    }],
    current: perk.name
  }), React.createElement("h1", {
    className: "cx-title"
  }, perk.name), ownerChar ? React.createElement("p", {
    className: "cx-hatnote"
  }, "For the owner of this perk, see ", React.createElement("button", {
    type: "button",
    className: "cx-alink",
    onClick: () => onOpenCharacter && onOpenCharacter(ownerChar)
  }, ownerChar.name), ".") : null, React.createElement("div", {
    className: "cx-leadgrid"
  }, React.createElement("div", {
    className: "cx-leadmain"
  }, React.createElement("p", null, React.createElement("b", null, perk.name), " is a ", (perk.type || '').toLowerCase(), " perk in ", React.createElement("i", null, "Dead by Daylight"), ownerChar ? React.createElement("span", null, " belonging to ", React.createElement("button", {
    type: "button",
    className: "cx-alink",
    onClick: () => onOpenCharacter && onOpenCharacter(ownerChar)
  }, perk.owner)) : React.createElement("span", null, " available to all Survivors"), "."), React.createElement("nav", {
    className: "cx-toc",
    "aria-label": "Contents"
  }, React.createElement("p", {
    className: "cx-toc-title"
  }, "Contents"), React.createElement("ol", null, tocEntries.map(entry => React.createElement("li", {
    key: entry.id
  }, React.createElement("button", {
    type: "button",
    className: "cx-alink",
    onClick: () => scrollToSection(entry.id)
  }, entry.label)))))), React.createElement("aside", {
    className: "cx-infobox",
    "aria-label": "".concat(perk.name, " infobox")
  }, React.createElement("p", {
    className: "cx-ib-title"
  }, perk.name), React.createElement("p", {
    className: "cx-ib-sub"
  }, perk.type, " Perk"), React.createElement("div", {
    className: "cx-ib-media",
    style: {
      width: '100%',
      aspectRatio: '1 / 1'
    }
  }, React.createElement(AssetFrame, {
    type: "Perk",
    imageUrl: perk.image,
    size: "fill",
    fallbackIcon: React.createElement(Icons.BookOpen, {
      width: 40,
      height: 40,
      className: "text-zinc-500"
    })
  })), React.createElement("table", null, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("th", null, "Owner"), React.createElement("td", null, ownerChar ? React.createElement("button", {
    type: "button",
    className: "cx-alink",
    onClick: () => onOpenCharacter && onOpenCharacter(ownerChar)
  }, perk.owner) : perk.owner || 'Universal')), React.createElement("tr", null, React.createElement("th", null, "Type"), React.createElement("td", null, perk.type)))))), React.createElement(CxSection, {
    id: "overview",
    view: "perk",
    setRef: setSectionRef,
    title: "Overview",
    collapsible: false
  }, React.createElement(PerkDescriptionBlock, {
    perk: perk,
    settings: settings,
    accentColor: "var(--link)"
  })), synergies.length > 0 && React.createElement(CxSection, {
    id: "synergies",
    view: "perk",
    setRef: setSectionRef,
    title: "Works Well With"
  }, React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, synergies.map(s => s.full ? React.createElement("button", {
    key: s.name,
    type: "button",
    className: "cx-chip text-xs font-semibold",
    style: {
      cursor: 'pointer'
    },
    onClick: () => onOpenPerk && onOpenPerk(s.full)
  }, s.name) : React.createElement("span", {
    key: s.name,
    className: "cx-chip text-xs font-semibold"
  }, s.name)))), React.createElement(CxSection, {
    id: "notes",
    view: "perk",
    setRef: setSectionRef,
    title: "Notes"
  }, React.createElement(NotesEditor, {
    title: "Perk Notes",
    value: noteValue,
    onChange: onNoteChange,
    placeholder: "Matchups, builds, or reminders for this perk..."
  })), React.createElement("div", {
    className: "cx-cats"
  }, React.createElement("span", null, "Categories:"), React.createElement("button", {
    type: "button",
    className: "cx-alink",
    onClick: onOpenList
  }, "Perks"), React.createElement("span", null, React.createElement("span", {
    className: "cx-sep"
  }, " \xB7 "), perk.type, " Perks"), tags.map(t => React.createElement("span", {
    key: t
  }, React.createElement("span", {
    className: "cx-sep"
  }, " \xB7 "), t, " Perks")))));
};
var ReleaseArticleView = _ref63 => {
  var {
    release,
    releases = [],
    realms = [],
    maps = [],
    killers = [],
    survivors = [],
    onHome,
    onOpenList,
    onOpenCharacter,
    onOpenRelease,
    onOpenRealm,
    scrollSection = null
  } = _ref63;
  var scrollRef = useRef(null);
  var sectionEls = useRef({});
  var norm = v => (v || '').trim().toLowerCase();
  var ordered = useMemo(() => [...(releases || [])].sort((a, b) => new Date(a.date) - new Date(b.date)), [releases]);
  var idx = ordered.findIndex(r => r.id === release.id);
  var prev = idx > 0 ? ordered[idx - 1] : null;
  var next = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : null;
  var killerRows = useMemo(() => (release.killers || []).map(k => ({
    entry: k,
    full: (killers || []).find(c => c.name === k.name) || null
  })), [release, killers]);
  var survivorRows = useMemo(() => (release.survivors || []).map(sv => ({
    entry: sv,
    full: (survivors || []).find(c => c.name === sv.name) || null
  })), [release, survivors]);
  var mapRows = useMemo(() => {
    var byMapName = new Map();
    (maps || []).forEach(mp => {
      var k = norm(mp.name);
      if (k && !byMapName.has(k)) byMapName.set(k, mp);
    });
    var realmByDbMapId = new Map();
    (realms || []).forEach(r => (r.maps || []).forEach(id => {
      if (!realmByDbMapId.has(id)) realmByDbMapId.set(id, r);
    }));
    return (release.maps || []).map(m => {
      var realm = (realms || []).find(r => normRealmName(r.name) === normRealmName(m.realm)) || null;
      if (!realm) {
        var hit = byMapName.get(norm(m.name));
        if (hit) realm = realmByDbMapId.get(hit.id) || (realms || []).find(r => normRealmName(r.name) === normRealmName(hit.realm)) || null;
      }
      return {
        entry: m,
        realm
      };
    });
  }, [release, realms, maps]);
  var typeLabel = release.type === 'base' ? 'Base game' : release.type === 'chapter' ? release.chapterNumber ? "Chapter ".concat(release.chapterNumber) : 'Chapter' : 'Paragraph';
  var licensed = [...(release.killers || []), ...(release.survivors || [])].some(c => c.licensed === true);
  var charCount = killerRows.length + survivorRows.length;
  var year = String(release.date || '').slice(0, 4);
  var tocEntries = [{
    id: 'overview',
    label: 'Overview'
  }, ...(killerRows.length > 0 ? [{
    id: 'killers',
    label: killerRows.length > 1 ? 'New Killers' : 'New Killer'
  }] : []), ...(survivorRows.length > 0 ? [{
    id: 'survivors',
    label: survivorRows.length > 1 ? 'New Survivors' : 'New Survivor'
  }] : []), ...(mapRows.length > 0 ? [{
    id: 'maps',
    label: mapRows.length > 1 ? 'New Maps' : 'New Map'
  }] : [])];
  var scrollToSection = id => {
    try {
      window.dispatchEvent(new CustomEvent('cx-expand-section', {
        detail: id
      }));
    } catch (e) {}
    window.setTimeout(() => {
      var node = sectionEls.current[id];
      if (node && node.scrollIntoView) node.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 60);
  };
  var setSectionRef = id => node => {
    if (node) sectionEls.current[id] = node;else delete sectionEls.current[id];
  };
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [release.id]);
  useEffect(() => {
    if (!scrollSection) return undefined;
    try {
      window.dispatchEvent(new CustomEvent('cx-expand-section', {
        detail: scrollSection
      }));
    } catch (e) {}
    var timer = window.setTimeout(() => {
      var node = sectionEls.current[scrollSection];
      if (node && node.scrollIntoView) node.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [scrollSection, release.id]);
  var renderCharTable = rows => React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", {
    style: {
      width: '220px'
    }
  }, "Character"), React.createElement("th", null, "How they entered the Fog"))), React.createElement("tbody", null, rows.map(row => React.createElement("tr", {
    key: row.entry.name
  }, React.createElement("td", null, React.createElement("div", {
    className: "flex items-center gap-3"
  }, row.full && row.full.image ? React.createElement("div", {
    style: {
      width: 44,
      height: 44,
      overflow: 'hidden',
      flexShrink: 0
    }
  }, React.createElement("img", {
    src: "./".concat(row.full.image),
    alt: row.entry.name,
    className: "w-full h-full",
    style: {
      objectFit: 'cover'
    },
    loading: "lazy"
  })) : null, React.createElement("div", null, row.full ? React.createElement("button", {
    type: "button",
    className: "cx-alink font-semibold",
    onClick: () => onOpenCharacter && onOpenCharacter(row.full)
  }, row.entry.name) : React.createElement("span", {
    className: "font-semibold"
  }, row.entry.name), row.entry.realName ? React.createElement("small", {
    style: {
      display: 'block',
      color: 'var(--text-faint)',
      fontSize: '11px'
    }
  }, row.entry.realName) : null, row.entry.licensed === true ? React.createElement("small", {
    style: {
      display: 'block',
      color: 'var(--text-faint)',
      fontSize: '11px'
    }
  }, "Licensed") : null))), React.createElement("td", {
    style: {
      color: 'var(--text-soft)'
    }
  }, row.entry.fogEntry || '-')))));
  return React.createElement("div", {
    className: "flex flex-col h-full overflow-y-auto custom-scrollbar",
    ref: scrollRef
  }, React.createElement("div", {
    className: "cx-article w-full max-w-[1280px] mx-auto min-h-full",
    "data-smoke-profile": release.id
  }, React.createElement(ViewCrumbs, {
    trail: [{
      label: 'Main page',
      onClick: onHome
    }, {
      label: 'Chronicle',
      onClick: onOpenList
    }],
    current: release.name
  }), React.createElement("h1", {
    className: "cx-title"
  }, release.name), React.createElement("p", {
    className: "cx-hatnote"
  }, typeLabel, " released ", release.displayDate, ". See also the full ", React.createElement("button", {
    type: "button",
    className: "cx-alink",
    onClick: onOpenList
  }, "Chronicle"), "."), React.createElement("div", {
    className: "cx-leadgrid"
  }, React.createElement("div", {
    className: "cx-leadmain"
  }, React.createElement("p", null, React.createElement("b", null, release.name), " is ", release.type === 'base' ? 'the' : 'a', " ", typeLabel.toLowerCase(), " of ", React.createElement("i", null, "Dead by Daylight"), " released on ", React.createElement("b", null, release.displayDate), ", adding ", React.createElement("b", null, charCount, " character", charCount === 1 ? '' : 's'), mapRows.length > 0 ? React.createElement("span", null, " and ", React.createElement("b", null, mapRows.length, " map", mapRows.length === 1 ? '' : 's')) : null, "."), release.description ? React.createElement("p", null, release.description) : null, React.createElement("nav", {
    className: "cx-toc",
    "aria-label": "Contents"
  }, React.createElement("p", {
    className: "cx-toc-title"
  }, "Contents"), React.createElement("ol", null, tocEntries.map(entry => React.createElement("li", {
    key: entry.id
  }, React.createElement("button", {
    type: "button",
    className: "cx-alink",
    onClick: () => scrollToSection(entry.id)
  }, entry.label)))))), React.createElement("aside", {
    className: "cx-infobox",
    "aria-label": "".concat(release.name, " infobox")
  }, React.createElement("p", {
    className: "cx-ib-title"
  }, release.name), React.createElement("p", {
    className: "cx-ib-sub"
  }, typeLabel), React.createElement("table", null, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("th", null, "Released"), React.createElement("td", null, release.displayDate)), React.createElement("tr", null, React.createElement("th", null, "Licensed"), React.createElement("td", null, licensed ? 'Yes' : 'No')), React.createElement("tr", null, React.createElement("th", null, "Killers"), React.createElement("td", null, killerRows.length)), React.createElement("tr", null, React.createElement("th", null, "Survivors"), React.createElement("td", null, survivorRows.length)), React.createElement("tr", null, React.createElement("th", null, "Maps"), React.createElement("td", null, mapRows.length)))))), React.createElement(CxSection, {
    id: "overview",
    view: "release",
    setRef: setSectionRef,
    title: "Overview",
    collapsible: false
  }, React.createElement("p", null, release.description || "".concat(release.name, " was released on ").concat(release.displayDate, "."))), killerRows.length > 0 && React.createElement(CxSection, {
    id: "killers",
    view: "release",
    setRef: setSectionRef,
    title: killerRows.length > 1 ? 'New Killers' : 'New Killer'
  }, renderCharTable(killerRows)), survivorRows.length > 0 && React.createElement(CxSection, {
    id: "survivors",
    view: "release",
    setRef: setSectionRef,
    title: survivorRows.length > 1 ? 'New Survivors' : 'New Survivor'
  }, renderCharTable(survivorRows)), mapRows.length > 0 && React.createElement(CxSection, {
    id: "maps",
    view: "release",
    setRef: setSectionRef,
    title: mapRows.length > 1 ? 'New Maps' : 'New Map'
  }, React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", {
    style: {
      width: '220px'
    }
  }, "Map"), React.createElement("th", null, "Realm"))), React.createElement("tbody", null, mapRows.map(row => React.createElement("tr", {
    key: "".concat(row.entry.name, "-").concat(row.entry.realm)
  }, React.createElement("td", null, React.createElement("span", {
    className: "font-semibold"
  }, row.entry.name)), React.createElement("td", null, row.realm && onOpenRealm ? React.createElement("button", {
    type: "button",
    className: "cx-alink",
    onClick: () => onOpenRealm(row.realm)
  }, row.entry.realm) : React.createElement("span", null, row.entry.realm))))))), React.createElement("div", {
    className: "flex justify-between gap-2 mt-6"
  }, prev ? React.createElement("button", {
    type: "button",
    className: "cx-alink",
    onClick: () => onOpenRelease && onOpenRelease(prev)
  }, "\u2190 ", prev.name) : React.createElement("span", null), next ? React.createElement("button", {
    type: "button",
    className: "cx-alink",
    onClick: () => onOpenRelease && onOpenRelease(next)
  }, next.name, " \u2192") : React.createElement("span", null)), React.createElement("div", {
    className: "cx-cats"
  }, React.createElement("span", null, "Categories:"), React.createElement("button", {
    type: "button",
    className: "cx-alink",
    onClick: onOpenList
  }, "Chronicle"), /^\d{4}$/.test(year) ? React.createElement("span", null, React.createElement("span", {
    className: "cx-sep"
  }, " \xB7 "), year, " releases") : null, React.createElement("span", null, React.createElement("span", {
    className: "cx-sep"
  }, " \xB7 "), release.type === 'base' ? 'Base game' : release.type === 'chapter' ? 'Chapters' : 'Paragraphs'), licensed ? React.createElement("span", null, React.createElement("span", {
    className: "cx-sep"
  }, " \xB7 "), "Licensed releases") : React.createElement("span", null, React.createElement("span", {
    className: "cx-sep"
  }, " \xB7 "), "Original releases"))));
};
var RealmArticleView = _ref64 => {
  var {
    realm,
    maps = [],
    killers = [],
    survivors = [],
    releases = [],
    onHome,
    onOpenList,
    onOpenTimeline,
    onOpenRelease,
    onOpenCharacter,
    onViewLayout,
    noteValue = '',
    onNoteChange,
    scrollSection = null
  } = _ref64;
  var scrollRef = useRef(null);
  var sectionEls = useRef({});
  var norm = v => (v || '').trim().toLowerCase();
  var mapsById = useMemo(() => {
    var lookup = new Map();
    (maps || []).forEach(mp => {
      if (mp && mp.id && !lookup.has(mp.id)) lookup.set(mp.id, mp);
    });
    return lookup;
  }, [maps]);
  var realmMaps = useMemo(() => {
    var seen = new Set();
    return (realm.maps || []).map(id => mapsById.get(id)).filter(Boolean).filter(mp => {
      var key = norm(mp.name);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [realm, mapsById]);
  var matchedReleases = useMemo(() => {
    var realmMapNames = new Set(realmMaps.map(rm => norm(rm.name)));
    return (releases || []).filter(rel => (rel.maps || []).some(m => normRealmName(m.realm) === normRealmName(realm.name) || realmMapNames.has(norm(m.name))));
  }, [releases, realm, realmMaps]);
  var alongside = useMemo(() => {
    var out = {
      killers: [],
      survivors: []
    };
    var seenK = new Set();
    var seenS = new Set();
    matchedReleases.forEach(rel => {
      (rel.killers || []).forEach(k => {
        if (seenK.has(k.name)) return;
        seenK.add(k.name);
        out.killers.push({
          entry: k,
          full: (killers || []).find(c => c.name === k.name) || null
        });
      });
      (rel.survivors || []).forEach(sv => {
        if (seenS.has(sv.name)) return;
        seenS.add(sv.name);
        out.survivors.push({
          entry: sv,
          full: (survivors || []).find(c => c.name === sv.name) || null
        });
      });
    });
    return out;
  }, [matchedReleases, killers, survivors]);
  var alongsideRows = useMemo(() => [...alongside.killers.map(k => _objectSpread(_objectSpread({}, k), {}, {
    role: 'Killer'
  })), ...alongside.survivors.map(sv => _objectSpread(_objectSpread({}, sv), {}, {
    role: 'Survivor'
  }))], [alongside]);
  var years = useMemo(() => {
    var set = new Set();
    matchedReleases.forEach(rel => {
      var y = String(rel.date || '').slice(0, 4);
      if (/^\d{4}$/.test(y)) set.add(y);
    });
    return [...set].sort();
  }, [matchedReleases]);
  var [previewMap, setPreviewMap] = useState(null);
  var tocEntries = [{
    id: 'overview',
    label: 'Overview'
  }, ...(realmMaps.length > 0 ? [{
    id: 'maps',
    label: 'Maps'
  }] : []), ...(alongsideRows.length > 0 ? [{
    id: 'characters',
    label: 'Introduced alongside'
  }] : []), ...(matchedReleases.length > 0 ? [{
    id: 'chronicle',
    label: 'Chronicle'
  }] : []), {
    id: 'notes',
    label: 'Notes'
  }];
  var scrollToSection = id => {
    try {
      window.dispatchEvent(new CustomEvent('cx-expand-section', {
        detail: id
      }));
    } catch (e) {}
    window.setTimeout(() => {
      var node = sectionEls.current[id];
      if (node && node.scrollIntoView) node.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 60);
  };
  var setSectionRef = id => node => {
    if (node) sectionEls.current[id] = node;else delete sectionEls.current[id];
  };
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [realm.id]);
  useEffect(() => {
    if (!scrollSection) return undefined;
    try {
      window.dispatchEvent(new CustomEvent('cx-expand-section', {
        detail: scrollSection
      }));
    } catch (e) {}
    var timer = window.setTimeout(() => {
      var node = sectionEls.current[scrollSection];
      if (node && node.scrollIntoView) node.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [scrollSection, realm.id]);
  var mapCount = realmMaps.length;
  return React.createElement("div", {
    className: "flex flex-col h-full overflow-y-auto custom-scrollbar",
    ref: scrollRef
  }, React.createElement("div", {
    className: "cx-article w-full max-w-[1280px] mx-auto min-h-full",
    "data-smoke-profile": realm.id
  }, React.createElement(ViewCrumbs, {
    trail: [{
      label: 'Main page',
      onClick: onHome
    }, {
      label: 'Realms',
      onClick: onOpenList
    }],
    current: realm.name
  }), React.createElement("h1", {
    className: "cx-title"
  }, realm.name), matchedReleases.length > 0 && React.createElement("p", {
    className: "cx-hatnote"
  }, "For the ", matchedReleases.length === 1 ? 'release' : 'releases', " featuring this realm, see ", matchedReleases.map((rel, idx) => React.createElement("span", {
    key: rel.id
  }, idx > 0 && ', ', React.createElement("button", {
    type: "button",
    className: "cx-alink",
    onClick: () => onOpenRelease && onOpenRelease(rel)
  }, rel.name))), "."), React.createElement("div", {
    className: "cx-leadgrid"
  }, React.createElement("div", {
    className: "cx-leadmain"
  }, React.createElement("p", null, React.createElement("b", null, realm.name), " is a realm in ", React.createElement("i", null, "Dead by Daylight"), " featuring ", React.createElement("b", null, mapCount, " map", mapCount === 1 ? '' : 's'), matchedReleases.length > 0 ? React.createElement("span", null, " introduced across ", matchedReleases.length, " release", matchedReleases.length === 1 ? '' : 's') : null, "."), React.createElement("nav", {
    className: "cx-toc",
    "aria-label": "Contents"
  }, React.createElement("p", {
    className: "cx-toc-title"
  }, "Contents"), React.createElement("ol", null, tocEntries.map(entry => React.createElement("li", {
    key: entry.id
  }, React.createElement("button", {
    type: "button",
    className: "cx-alink",
    onClick: () => scrollToSection(entry.id)
  }, entry.label)))))), React.createElement("aside", {
    className: "cx-infobox",
    "aria-label": "".concat(realm.name, " infobox")
  }, React.createElement("p", {
    className: "cx-ib-title"
  }, realm.name), React.createElement("p", {
    className: "cx-ib-sub"
  }, "Realm"), React.createElement("div", {
    className: "cx-ib-media",
    style: {
      width: '100%',
      aspectRatio: '1 / 1'
    }
  }, React.createElement("img", {
    src: "./".concat(realm.image),
    alt: realm.name,
    className: "w-full h-full",
    style: {
      objectFit: 'cover'
    },
    loading: "lazy"
  })), React.createElement("table", null, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("th", null, "Maps"), React.createElement("td", null, mapCount)), matchedReleases.length > 0 && React.createElement("tr", null, React.createElement("th", null, "Releases"), React.createElement("td", null, matchedReleases.map((rel, idx) => React.createElement("span", {
    key: rel.id
  }, idx > 0 && ', ', React.createElement("button", {
    type: "button",
    className: "cx-alink",
    onClick: () => onOpenRelease && onOpenRelease(rel)
  }, rel.name))))))))), React.createElement(CxSection, {
    id: "overview",
    view: "realm",
    setRef: setSectionRef,
    title: "Overview",
    collapsible: false
  }, React.createElement("p", null, realm.name, " is one of the realms of the Entity's world in ", React.createElement("i", null, "Dead by Daylight"), ". It contains ", mapCount, " playable map", mapCount === 1 ? '' : 's', matchedReleases.length > 0 ? React.createElement("span", null, ", first appearing alongside ", matchedReleases.map((rel, idx) => React.createElement("span", {
    key: rel.id
  }, idx > 0 && ', ', React.createElement("button", {
    type: "button",
    className: "cx-alink",
    onClick: () => onOpenRelease && onOpenRelease(rel)
  }, rel.name)))) : null, ".")), realmMaps.length > 0 && React.createElement(CxSection, {
    id: "maps",
    view: "realm",
    setRef: setSectionRef,
    title: "Maps"
  }, React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", {
    style: {
      width: '320px'
    }
  }, "Map"), React.createElement("th", null, "Description"))), React.createElement("tbody", null, realmMaps.map(mp => React.createElement("tr", {
    key: mp.id
  }, React.createElement("td", null, React.createElement("button", {
    type: "button",
    onClick: () => setPreviewMap(mp),
    style: {
      display: 'block',
      width: '100%',
      maxWidth: '320px',
      padding: 0,
      border: 0,
      background: 'none',
      cursor: 'zoom-in'
    },
    "aria-label": "Preview ".concat(mp.name)
  }, React.createElement("img", {
    src: "./".concat(mp.image),
    alt: mp.name,
    loading: "lazy",
    style: {
      display: 'block',
      width: '100%'
    }
  })), React.createElement("button", {
    type: "button",
    className: "cx-alink font-semibold",
    style: {
      marginTop: '6px'
    },
    onClick: () => onViewLayout && onViewLayout(mp)
  }, mp.name)), React.createElement("td", {
    style: {
      color: 'var(--text-soft)'
    }
  }, mp.description || '-')))))), alongsideRows.length > 0 && React.createElement(CxSection, {
    id: "characters",
    view: "realm",
    setRef: setSectionRef,
    title: "Introduced alongside"
  }, React.createElement("p", {
    className: "cx-hatnote"
  }, "Killers and Survivors introduced in the same releases as this realm's maps - not necessarily native to it."), React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", {
    style: {
      width: '220px'
    }
  }, "Character"), React.createElement("th", null, "How they entered the Fog"))), React.createElement("tbody", null, alongsideRows.map(row => React.createElement("tr", {
    key: "".concat(row.role, "-").concat(row.entry.name)
  }, React.createElement("td", null, row.full ? React.createElement("button", {
    type: "button",
    className: "cx-alink font-semibold",
    onClick: () => onOpenCharacter && onOpenCharacter(row.full)
  }, row.entry.name) : React.createElement("span", {
    className: "font-semibold"
  }, row.entry.name), row.entry.realName ? React.createElement("small", {
    style: {
      display: 'block',
      color: 'var(--text-faint)',
      fontSize: '11px'
    }
  }, row.entry.realName) : null), React.createElement("td", {
    style: {
      color: 'var(--text-soft)'
    }
  }, row.entry.fogEntry || '-')))))), matchedReleases.length > 0 && React.createElement(CxSection, {
    id: "chronicle",
    view: "realm",
    setRef: setSectionRef,
    title: "Chronicle"
  }, React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", {
    style: {
      width: '220px'
    }
  }, "Release"), React.createElement("th", null, "Date"))), React.createElement("tbody", null, matchedReleases.map(rel => React.createElement("tr", {
    key: rel.id
  }, React.createElement("td", null, React.createElement("button", {
    type: "button",
    className: "cx-alink font-semibold",
    onClick: () => onOpenRelease && onOpenRelease(rel)
  }, rel.name), rel.chapterNumber ? React.createElement("small", {
    style: {
      display: 'block',
      color: 'var(--text-faint)',
      fontSize: '11px'
    }
  }, "Chapter ", rel.chapterNumber) : null), React.createElement("td", null, rel.displayDate)))))), React.createElement(CxSection, {
    id: "notes",
    view: "realm",
    setRef: setSectionRef,
    title: "Notes"
  }, React.createElement(NotesEditor, {
    title: "Realm Notes",
    value: noteValue,
    onChange: onNoteChange,
    placeholder: "Loop routes, tile notes, or personal reminders for this realm..."
  })), React.createElement("div", {
    className: "cx-cats"
  }, React.createElement("span", null, "Categories:"), React.createElement("button", {
    type: "button",
    className: "cx-alink",
    onClick: onOpenList
  }, "Realms"), years.map(y => React.createElement("span", {
    key: y
  }, React.createElement("span", {
    className: "cx-sep"
  }, " \xB7 "), y, " releases"))), previewMap && React.createElement(ImageLightbox, {
    src: "./".concat(previewMap.image),
    alt: previewMap.name,
    onClose: () => setPreviewMap(null)
  })));
};
var guideSourceLabel = url => {
  var u = String(url || '');
  if (u.includes('wiki.gg')) return 'Official DBD Wiki';
  if (u.includes('reddit.com')) return 'Reddit';
  if (u.includes('otzdarva.com')) return 'Otzdarva';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'YouTube';
  if (u.includes('steamcommunity.com')) return 'Steam Guide';
  if (u.includes('deadbydaylight.com') || u.includes('bhvr')) return 'Behaviour';
  return 'Source';
};
var CharacterArticleView = _ref65 => {
  var {
    character,
    roleCount = 0,
    onHome,
    onOpenList,
    onOpenTimeline,
    onOpenCommunity,
    allPerks = [],
    onPerkTap,
    theme,
    settings = {},
    noteValue = '',
    onNoteChange,
    cosmeticsByBaseId = {},
    allAddons = [],
    cosmeticFocusId = null,
    scrollSection = null
  } = _ref65;
  if (!character) return null;
  var isKiller = character.type === 'Killer' || character.power;
  var roleNoun = isKiller ? 'Killer' : 'Survivor';
  var rolePlural = isKiller ? 'Killers' : 'Survivors';
  var stats = isKiller ? KILLER_STATS[character.name] : null;
  var guide = isKiller ? KILLER_GUIDES[character.name] : null;
  var teachables = allPerks.filter(p => p.owner === character.name);
  var [powerTipsTab, setPowerTipsTab] = useState('survivor');
  var cosmeticsSectionRef = useRef(null);
  var scrollRef = useRef(null);
  var sectionEls = useRef({});
  var cosmeticsEntries = cosmeticsByBaseId[character.id] || [];
  var focusedCosmeticId = character.cosmeticFocusId || cosmeticFocusId || null;
  var cosmeticSlotGroups = useMemo(() => {
    var RAR = {
      common: 1,
      uncommon: 2,
      rare: 3,
      veryrare: 4,
      ultrarare: 5,
      visceral: 6,
      legendary: 7,
      event: 8
    };
    var rarityOf = entry => RAR[String(entry.rarity || '').toLowerCase()] || 9;
    var SLOT_ORDER = [{
      key: 'head',
      label: 'Headgear',
      match: pt => pt === 'head'
    }, {
      key: 'body',
      label: 'Body',
      match: pt => pt === 'body'
    }, {
      key: 'legs',
      label: 'Legs',
      match: pt => pt === 'legs'
    }, {
      key: 'weapon',
      label: 'Weapon',
      match: pt => pt === 'weapon'
    }, {
      key: 'outfit',
      label: 'Outfits',
      match: pt => pt === 'outfit'
    }, {
      key: 'misc',
      label: 'Miscellaneous',
      match: pt => !['head', 'body', 'legs', 'weapon', 'outfit'].includes(pt)
    }];
    var swaps = cosmeticsEntries.filter(entry => entry.isCharacterSwap).slice().sort((a, b) => a.name.localeCompare(b.name));
    var groups = [];
    if (swaps.length > 0) groups.push({
      label: 'Character swaps',
      entries: swaps
    });
    var nonSwaps = cosmeticsEntries.filter(entry => !entry.isCharacterSwap);
    SLOT_ORDER.forEach(slot => {
      var entries = nonSwaps.filter(entry => slot.match(String(entry.pieceType || '').toLowerCase())).slice().sort((a, b) => rarityOf(a) - rarityOf(b) || a.name.localeCompare(b.name));
      if (entries.length > 0) groups.push({
        label: slot.label,
        entries
      });
    });
    return groups;
  }, [cosmeticsEntries]);
  var fullSetLinkStats = useMemo(() => cosmeticsEntries.filter(entry => !entry.isCharacterSwap).reduce((acc, entry) => {
    var mode = String(entry.outfitLinkMode || 'unlinked').toLowerCase();
    var key = ['linked', 'partially_linked', 'unlinked'].includes(mode) ? mode : 'unlinked';
    acc[key] += 1;
    return acc;
  }, {
    linked: 0,
    partially_linked: 0,
    unlinked: 0
  }), [cosmeticsEntries]);
  var linkedFullSetCount = fullSetLinkStats.linked + fullSetLinkStats.partially_linked;
  var killerAddons = isKiller ? (allAddons || []).filter(a => a.role === 'killer' && a.killerName === character.name) : [];
  var RARITY_RANK = {
    common: 1,
    uncommon: 2,
    rare: 3,
    veryrare: 4,
    ultrarare: 5,
    visceral: 6,
    event: 7
  };
  killerAddons.sort((a, b) => (RARITY_RANK[(a.rarity || '').toLowerCase()] || 0) - (RARITY_RANK[(b.rarity || '').toLowerCase()] || 0));
  var release = null;
  if (typeof TIMELINE_DATA !== 'undefined' && TIMELINE_DATA && TIMELINE_DATA.releases) {
    for (var rel of TIMELINE_DATA.releases) {
      var hit = (rel.killers || []).find(k => k.name === character.name) || (rel.survivors || []).find(sv => sv.name === character.name);
      if (hit) {
        release = _objectSpread(_objectSpread({}, rel), {}, {
          entry: hit
        });
        break;
      }
    }
  }
  var releaseChapter = release ? release.name : null;
  var releaseDate = release ? release.displayDate : null;
  var chapterNumber = release ? release.chapterNumber : null;
  var isLicensed = release ? release.entry.licensed === true : false;
  var fogEntry = release && release.entry.fogEntry ? release.entry.fogEntry : '';
  var releaseDesc = release ? release.description : '';
  var scrollToSection = id => {
    try {
      window.dispatchEvent(new CustomEvent('cx-expand-section', {
        detail: id
      }));
    } catch (e) {}
    window.setTimeout(() => {
      var node = sectionEls.current[id];
      if (node && node.scrollIntoView) node.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 60);
  };
  var setSectionRef = id => node => {
    if (node) sectionEls.current[id] = node;else delete sectionEls.current[id];
  };
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [character.id]);
  useEffect(() => {
    if (!scrollSection) return undefined;
    try {
      window.dispatchEvent(new CustomEvent('cx-expand-section', {
        detail: scrollSection
      }));
    } catch (e) {}
    var timer = window.setTimeout(() => {
      var node = sectionEls.current[scrollSection];
      if (node && node.scrollIntoView) node.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [scrollSection, character.id]);
  useEffect(() => {
    if (!focusedCosmeticId || !cosmeticsSectionRef.current) return undefined;
    var timer = window.setTimeout(() => {
      var _cosmeticsSectionRef$;
      (_cosmeticsSectionRef$ = cosmeticsSectionRef.current) === null || _cosmeticsSectionRef$ === void 0 || _cosmeticsSectionRef$.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }, 140);
    return () => window.clearTimeout(timer);
  }, [focusedCosmeticId, character.id]);
  var editedLabel = 'recently';
  try {
    var days = Math.max(0, Math.floor((Date.now() - new Date(META.lastSynced).getTime()) / 86400000));
    editedLabel = days <= 0 ? 'today' : days === 1 ? '1 day ago' : "".concat(days, " days ago");
  } catch (e) {}
  var firstSentences = (text, n) => {
    if (!text) return '';
    var parts = String(text).split(/(?<=[.!?])\s+/).filter(Boolean);
    return parts.slice(0, n).join(' ');
  };
  var leadP2 = firstSentences(fogEntry, 2) || firstSentences(character.lore, 2) || (character.power ? String(character.power).split('\n\n')[0] : '');
  var leadP3 = null;
  if (teachables.length > 0) {
    var powerParas = character.power ? String(character.power).split('\n\n') : [];
    var perkPara = powerParas.find(p => teachables.filter(t => p.includes(t.name)).length >= 2);
    if (perkPara) leadP3 = perkPara;
  }
  var splitFlavor = text => {
    var m = String(text || '').match(/^“(.+?)” \(([^)]+)\)\s*([\s\S]*)$/);
    if (m) return {
      flavor: "\u201C".concat(m[1], "\u201D (").concat(m[2], ")"),
      effect: m[3]
    };
    return {
      flavor: '',
      effect: String(text || '')
    };
  };
  var fmtDiff = d => ({
    easy: 'Easy',
    intermediate: 'Intermediate',
    hard: 'Hard',
    veryhard: 'Very hard'
  })[(d || '').toLowerCase()] || d;
  var tocEntries = [{
    id: 'overview',
    label: 'Overview'
  }, ...(isKiller && character.power ? [{
    id: 'power',
    label: "Power: ".concat((guide === null || guide === void 0 ? void 0 : guide.powerName) || 'Power')
  }] : []), ...(teachables.length > 0 ? [{
    id: 'perks',
    label: "".concat(character.name, "'s Perks")
  }] : []), ...(killerAddons.length > 0 ? [{
    id: 'addons',
    label: 'Add-ons'
  }] : []), ...(character.lore ? [{
    id: 'lore',
    label: 'Lore'
  }] : []), ...(releaseDesc ? [{
    id: 'chronicle',
    label: 'Chronicle'
  }] : []), ...(cosmeticsEntries.length > 0 ? [{
    id: 'cosmetics',
    label: 'Cosmetics'
  }] : []), ...(isKiller ? [{
    id: 'notes',
    label: 'Notes'
  }] : [])];
  var linkAccent = 'var(--link)';
  return React.createElement("div", {
    className: "flex flex-col h-full overflow-y-auto custom-scrollbar",
    ref: scrollRef
  }, React.createElement("div", {
    className: "cx-article w-full max-w-[1280px] mx-auto min-h-full",
    "data-smoke-profile": character.id
  }, React.createElement(ViewCrumbs, {
    trail: [{
      label: 'Main page',
      onClick: onHome
    }, {
      label: rolePlural,
      onClick: onOpenList
    }],
    current: character.name
  }), React.createElement("h1", {
    className: "cx-title"
  }, character.name), (releaseChapter || isKiller && character.power) && React.createElement("p", {
    className: "cx-hatnote"
  }, releaseChapter ? React.createElement("span", null, "For the chapter this ", roleNoun, " was introduced in, see ", React.createElement("button", {
    type: "button",
    className: "cx-alink",
    onClick: onOpenTimeline
  }, releaseChapter), ". ") : null, isKiller && character.power ? React.createElement("span", null, "For ", isKiller ? 'its' : 'their', " power, see ", React.createElement("button", {
    type: "button",
    className: "cx-alink",
    onClick: () => scrollToSection('power')
  }, (guide === null || guide === void 0 ? void 0 : guide.powerName) || 'Power'), ".") : null), React.createElement("div", {
    className: "cx-leadgrid"
  }, React.createElement("div", {
    className: "cx-leadmain"
  }, React.createElement("p", null, React.createElement("b", null, character.name), " is one of ", React.createElement("b", null, roleCount, " ", rolePlural), " featured in ", React.createElement("i", null, "Dead by Daylight"), ". ", isKiller ? 'It was' : 'They were', " introduced as the ", roleNoun, " of ", chapterNumber ? React.createElement("span", null, "CHAPTER ", chapterNumber, ": ") : null, React.createElement("button", {
    type: "button",
    className: "cx-alink",
    onClick: onOpenTimeline
  }, releaseChapter), releaseDesc && releaseDesc.includes('community-created') ? ', a community-created Chapter' : '', " released on ", releaseDate, "."), leadP2 ? React.createElement("p", null, leadP2) : null, leadP3 ? React.createElement("p", null, leadP3.split(new RegExp("(".concat(teachables.map(t => t.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), ")"), 'g')).map((part, idx) => {
    var hit = teachables.find(t => t.name === part);
    return hit ? React.createElement("button", {
      key: idx,
      type: "button",
      className: "cx-alink",
      onClick: () => scrollToSection('perks')
    }, part) : React.createElement("span", {
      key: idx
    }, part);
  })) : teachables.length > 0 ? React.createElement("p", null, "Their personal perks are ", teachables.map(p => p.name).join(', '), ". See ", React.createElement("button", {
    type: "button",
    className: "cx-alink",
    onClick: () => scrollToSection('perks')
  }, "perks"), " for full descriptions.") : React.createElement("p", null, "No teachable perks are currently listed for this character."), React.createElement("nav", {
    className: "cx-toc",
    "aria-label": "Contents"
  }, React.createElement("p", {
    className: "cx-toc-title"
  }, "Contents"), React.createElement("ol", null, tocEntries.map((entry, idx) => React.createElement("li", {
    key: entry.id
  }, React.createElement("button", {
    type: "button",
    className: "cx-alink",
    onClick: () => scrollToSection(entry.id)
  }, entry.label)))))), React.createElement("aside", {
    className: "cx-infobox",
    "aria-label": "".concat(character.name, " infobox")
  }, React.createElement("p", {
    className: "cx-ib-title"
  }, character.name), React.createElement("p", {
    className: "cx-ib-sub"
  }, roleNoun), React.createElement("div", {
    className: "cx-ib-media",
    style: {
      width: '100%',
      aspectRatio: '1 / 1'
    }
  }, React.createElement(AssetFrame, {
    type: roleNoun,
    imageUrl: character.image,
    size: "fill",
    fallbackIcon: React.createElement(Icons.User, {
      width: 40,
      height: 40,
      className: "text-zinc-500"
    })
  })), React.createElement("table", null, React.createElement("tbody", null, character.difficulty && (character.difficulty || '').toLowerCase() !== 'none' && React.createElement("tr", null, React.createElement("th", null, "Difficulty"), React.createElement("td", null, fmtDiff(character.difficulty))), stats && React.createElement("tr", null, React.createElement("th", null, "Terror Radius"), React.createElement("td", null, stats.terrorRadius)), stats && React.createElement("tr", null, React.createElement("th", null, "Movement speed"), React.createElement("td", null, stats.speed)), stats && React.createElement("tr", null, React.createElement("th", null, "Height"), React.createElement("td", null, stats.height)), isKiller && character.power && React.createElement("tr", null, React.createElement("th", null, "Power"), React.createElement("td", null, React.createElement("button", {
    type: "button",
    className: "cx-alink",
    onClick: () => scrollToSection('power')
  }, (guide === null || guide === void 0 ? void 0 : guide.powerName) || 'Power'))), releaseChapter && React.createElement("tr", null, React.createElement("th", null, "Chapter"), React.createElement("td", null, React.createElement("button", {
    type: "button",
    className: "cx-alink",
    onClick: onOpenTimeline
  }, releaseChapter), chapterNumber ? " (".concat(chapterNumber, ")") : '')), releaseDate && React.createElement("tr", null, React.createElement("th", null, "Released"), React.createElement("td", null, releaseDate)), isLicensed && React.createElement("tr", null, React.createElement("th", null, "Licensed"), React.createElement("td", null, "Yes")), React.createElement("tr", null, React.createElement("th", null, "Teachable perks"), React.createElement("td", null, teachables.length)), isKiller && React.createElement("tr", null, React.createElement("th", null, "Add-ons"), React.createElement("td", null, killerAddons.length)))), release && release.entry && release.entry.realName && release.entry.realName !== character.name && React.createElement("p", {
    className: "cx-ib-note"
  }, "Real name: ", release.entry.realName, "."))), React.createElement(CxSection, {
    id: "overview",
    view: "character",
    setRef: setSectionRef,
    title: "Overview",
    collapsible: false
  }, fogEntry ? React.createElement("p", null, fogEntry) : null, character.power ? React.createElement("p", null, String(character.power).split('\n\n')[0]) : null, !isKiller && React.createElement("p", null, "Difficulty: ", React.createElement("b", null, fmtDiff(character.difficulty)), ". Teaches ", teachables.length, " personal perk", teachables.length === 1 ? '' : 's', ". See ", React.createElement("button", {
    type: "button",
    className: "cx-alink",
    onClick: () => scrollToSection('perks')
  }, "perks"), " for full descriptions.")), isKiller && character.power && React.createElement(CxSection, {
    id: "power",
    view: "character",
    setRef: setSectionRef,
    title: "Power: ".concat((guide === null || guide === void 0 ? void 0 : guide.powerName) || 'Power')
  }, guide && guide.tldr && React.createElement("p", null, React.createElement("b", null, "TL;DR: "), guide.tldr), guide && guide.powerBlurb && React.createElement("p", null, guide.powerBlurb), String(character.power).split('\n\n').map((para, idx) => React.createElement("p", {
    key: idx
  }, para)), guide && guide.survivorTips && React.createElement("div", null, React.createElement("h3", {
    className: "cx-sub"
  }, "Playing against ", guide.powerName || 'this power'), React.createElement("p", null, guide.survivorTips)), guide && guide.killerTips && React.createElement("div", null, React.createElement("h3", {
    className: "cx-sub"
  }, "Playing as ", character.name), React.createElement("p", null, guide.killerTips)), guide && (guide.advancedAs || guide.advancedAgainst) && React.createElement("details", null, React.createElement("summary", {
    className: "cx-alink",
    style: {
      cursor: 'pointer',
      fontWeight: 600
    }
  }, "Advanced guide: playing as and against"), guide.advancedAs && React.createElement("div", null, React.createElement("h3", {
    className: "cx-sub"
  }, "Advanced: playing as ", character.name), React.createElement("p", null, guide.advancedAs)), guide.advancedAgainst && React.createElement("div", null, React.createElement("h3", {
    className: "cx-sub"
  }, "Advanced: playing against ", guide.powerName || 'this power'), React.createElement("p", null, guide.advancedAgainst))), guide && guide.sources && guide.sources.length > 0 && React.createElement("p", {
    style: {
      color: 'var(--text-faint)',
      fontSize: '12px'
    }
  }, "Guide sources: ", guide.sources.map((s, i) => React.createElement("span", {
    key: i
  }, i > 0 ? ' · ' : '', React.createElement("a", {
    href: s,
    target: "_blank",
    rel: "noreferrer"
  }, guideSourceLabel(s)))), " (verified Patch ", guide.verifiedPatch || '10.1.1', "). See Settings for the full source list.")), teachables.length > 0 && React.createElement(CxSection, {
    id: "perks",
    view: "character",
    setRef: setSectionRef,
    title: "".concat(character.name, "'s Perks")
  }, React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("caption", null, "Table: the ", teachables.length, " teachable Perk", teachables.length === 1 ? '' : 's', " of ", character.name), React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", {
    style: {
      width: '280px'
    }
  }, "Perk"), React.createElement("th", null, "Effect"))), React.createElement("tbody", null, teachables.map(perk => React.createElement("tr", {
    key: perk.id,
    onClick: () => onPerkTap && onPerkTap(perk),
    style: {
      cursor: onPerkTap ? 'pointer' : 'default'
    }
  }, React.createElement("td", {
    className: "cx-perkcell"
  }, React.createElement("div", {
    className: "cx-perkimg"
  }, React.createElement("div", {
    className: "cx-imgbox"
  }, React.createElement(AssetFrame, {
    type: "Perk",
    size: "fill",
    imageUrl: perk.image,
    fallbackIcon: React.createElement(Icons.BookOpen, {
      width: 24,
      height: 24,
      className: "text-zinc-600"
    })
  })), React.createElement("button", {
    type: "button",
    className: "cx-alink",
    onClick: e => {
      e.stopPropagation();
      onPerkTap && onPerkTap(perk);
    }
  }, perk.name), React.createElement("small", null, perk.type, " Perk", perk.name.startsWith('Hex:') ? ' · Hex' : ''))), React.createElement("td", null, React.createElement(PerkDescriptionBlock, {
    perk: perk,
    settings: settings,
    accentColor: linkAccent,
    compactLines: 3
  }))))))), killerAddons.length > 0 && React.createElement(CxSection, {
    id: "addons",
    view: "character",
    setRef: setSectionRef,
    title: "Add-ons"
  }, React.createElement("table", {
    className: "cx-wikitable"
  }, React.createElement("caption", null, "Table: the ", killerAddons.length, " Add-ons of ", (guide === null || guide === void 0 ? void 0 : guide.powerName) || 'this power'), React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", {
    style: {
      width: '250px'
    }
  }, "Add-on"), React.createElement("th", null, "Rarity"), React.createElement("th", null, "Effect"))), React.createElement("tbody", null, killerAddons.map(addon => {
    var parts = splitFlavor(addon.description);
    var rar = (addon.rarity || '').toLowerCase();
    var rarLabel = rar === 'veryrare' ? 'Very rare' : rar === 'ultrarare' ? 'Ultra rare' : rar.charAt(0).toUpperCase() + rar.slice(1);
    return React.createElement("tr", {
      key: addon.id
    }, React.createElement("td", {
      className: "cx-perkcell"
    }, React.createElement("span", null, React.createElement("span", {
      className: "font-semibold text-zinc-100"
    }, addon.name))), React.createElement("td", {
      className: "cx-rarity"
    }, rarLabel), React.createElement("td", null, parts.flavor ? React.createElement("small", {
      style: {
        display: 'block',
        color: 'var(--text-faint)',
        fontStyle: 'italic',
        marginBottom: '4px'
      }
    }, parts.flavor) : null, parts.effect));
  })))), character.lore && React.createElement(CxSection, {
    id: "lore",
    view: "character",
    setRef: setSectionRef,
    title: "Lore"
  }, String(character.lore).split('\n\n').map((para, idx) => React.createElement("p", {
    key: idx
  }, para))), releaseDesc && React.createElement(CxSection, {
    id: "chronicle",
    view: "character",
    setRef: setSectionRef,
    title: "Chronicle"
  }, React.createElement("p", null, character.name, " entered the fog on ", React.createElement("b", null, releaseDate), " with ", chapterNumber ? React.createElement("span", null, "CHAPTER ", chapterNumber, ": ") : null, React.createElement("button", {
    type: "button",
    className: "cx-alink",
    onClick: onOpenTimeline
  }, releaseChapter), ", ", releaseDesc.charAt(0).toLowerCase() + releaseDesc.slice(1))), cosmeticsEntries.length > 0 && React.createElement(CxSection, {
    id: "cosmetics",
    view: "character",
    setRef: setSectionRef,
    title: "Cosmetics"
  }, React.createElement("div", {
    ref: cosmeticsSectionRef,
    "data-smoke-cosmetics": character.id,
    className: "scroll-mt-24 space-y-6"
  }, cosmeticSlotGroups.map(group => React.createElement("div", {
    key: group.label,
    className: "space-y-3"
  }, React.createElement("h3", {
    className: "cx-sub"
  }, group.label, " ", React.createElement("span", {
    style: {
      color: 'var(--text-faint)',
      fontSize: '12px',
      fontWeight: 400
    }
  }, group.entries.length)), React.createElement("div", {
    className: "grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4"
  }, group.entries.map(entry => React.createElement("div", {
    key: entry.id,
    className: "w-full"
  }, React.createElement(CosmeticCard, {
    entry: entry,
    accentColor: linkAccent,
    focused: entry.id === focusedCosmeticId
  })))))))), isKiller && React.createElement(CxSection, {
    id: "notes",
    view: "character",
    setRef: setSectionRef,
    title: "Notes"
  }, React.createElement(NotesEditor, {
    title: "Killer Notes",
    value: noteValue,
    onChange: onNoteChange,
    placeholder: "Matchups, addon ideas, macro notes, or personal reminders for this killer..."
  })), React.createElement("div", {
    className: "cx-cats"
  }, React.createElement("span", null, "Categories:"), React.createElement("button", {
    type: "button",
    className: "cx-alink",
    onClick: onOpenList
  }, rolePlural), releaseChapter && React.createElement("span", null, React.createElement("span", {
    className: "cx-sep"
  }, " \xB7 "), React.createElement("button", {
    type: "button",
    className: "cx-alink",
    onClick: onOpenTimeline
  }, chapterNumber ? "Chapter ".concat(chapterNumber, " ") : '', rolePlural)), character.difficulty && (character.difficulty || '').toLowerCase() !== 'none' && React.createElement("span", null, React.createElement("span", {
    className: "cx-sep"
  }, " \xB7 "), fmtDiff(character.difficulty), " ", rolePlural), isLicensed ? React.createElement("span", null, React.createElement("span", {
    className: "cx-sep"
  }, " \xB7 "), "Licensed Characters") : React.createElement("span", null, React.createElement("span", {
    className: "cx-sep"
  }, " \xB7 "), "Original Characters"))));
};
var App = () => {
  var {
    killers = [],
    survivors = [],
    perks = [],
    maps = [],
    realms = [],
    items = [],
    offerings = [],
    addons = []
  } = DATABASE;
  var isAndroidNative = useMemo(() => isNativeAndroidPlatform(), []);
  var cosmeticsCatalog = useMemo(() => normalizeCosmeticsCatalog(typeof COSMETICS_CATALOG === 'undefined' ? {} : COSMETICS_CATALOG), []);
  var communityContent = useMemo(() => normalizeCommunityContentSnapshot(typeof COMMUNITY_CONTENT === 'undefined' ? {} : COMMUNITY_CONTENT), []);
  var launchContext = useMemo(() => readLaunchContext(), []);
  var initialUiState = useMemo(() => normalizeUiState(loadFromStorage(STORAGE_KEYS.uiState, {})), []);
  var initialView = launchContext.hasRoute ? launchContext.view || 'home' : initialUiState.view;
  var initialViewContext = launchContext.hasRoute ? launchContext.context || {} : initialUiState.context || {};
  var [currentView, setViewRaw] = useState(initialView || 'home');
  var [viewContext, setViewContext] = useState(initialViewContext || {});
  var viewHistoryRef = useRef([{
    view: initialView || 'home',
    context: initialViewContext || {}
  }]);
  var mainRef = useRef(null);
  var setView = function setView(view) {
    var context = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    setViewContext(context);
    setViewRaw(view);
    var history = viewHistoryRef.current;
    if (history.length === 0 || history[history.length - 1].view !== view) {
      history.push({
        view,
        context
      });
      if (history.length > 50) history.splice(0, history.length - 50);
    }
  };
  var goBack = () => {
    var _window$Capacitor6;
    var history = viewHistoryRef.current;
    if (history.length > 1) {
      history.pop();
      var prev = history[history.length - 1];
      setViewContext(prev.context || {});
      setViewRaw(prev.view);
    } else if ((_window$Capacitor6 = window.Capacitor) !== null && _window$Capacitor6 !== void 0 && (_window$Capacitor6 = _window$Capacitor6.Plugins) !== null && _window$Capacitor6 !== void 0 && _window$Capacitor6.App) {
      window.Capacitor.Plugins.App.exitApp();
    }
  };
  useEffect(() => {
    try {
      var suffix = SEO_SUFFIX;
      var viewLabels = SEO_VIEW_LABELS;
      var title = SEO_DEFAULT_TITLE;
      var id = viewContext.id;
      if (id) {
        var pools = [killers, survivors, perks, maps, realms, items, offerings];
        var entry = null;
        for (var pool of pools) {
          entry = (pool || []).find(e => e && e.id === id) || null;
          if (entry) break;
        }
        if (!entry && typeof TIMELINE_DATA !== 'undefined' && TIMELINE_DATA && TIMELINE_DATA.releases) {
          entry = TIMELINE_DATA.releases.find(r => r && r.id === id) || null;
        }
        if (entry && entry.name) title = "".concat(entry.name).concat(suffix);else if (viewLabels[currentView]) title = "".concat(viewLabels[currentView]).concat(suffix);
      } else if (viewLabels[currentView]) {
        title = "".concat(viewLabels[currentView]).concat(suffix);
      }
      document.title = title;
      var siteBase = SEO_SITE_BASE;
      var canonical = siteBase + '/';
      if (currentView && currentView !== 'home') {
        canonical = siteBase + '/?view=' + encodeURIComponent(currentView);
        if (id) canonical += '&id=' + encodeURIComponent(id);
      }
      var canonicalLink = document.querySelector('link[rel="canonical"]');
      if (canonicalLink) canonicalLink.setAttribute('href', canonical);
      var ogUrlTag = document.querySelector('meta[property="og:url"]');
      if (ogUrlTag) ogUrlTag.setAttribute('content', canonical);
      var ogTitleTag = document.querySelector('meta[property="og:title"]');
      if (ogTitleTag) ogTitleTag.setAttribute('content', title);
    } catch (e) {}
  }, [currentView, viewContext]);
  var [perkFilter, setPerkFilter] = useState(initialUiState.perkFilter || 'All');
  var [perkSearch, setPerkSearch] = useState(initialUiState.perkSearch || '');
  var [buildSeed, setBuildSeed] = useState(null);
  var [comparePerks, setComparePerks] = useState([]);
  var [showCompareModal, setShowCompareModal] = useState(false);
  var [previewPerk, setPreviewPerk] = useState(null);
  var [layoutMap, setLayoutMap] = useState(null);
  var [drawerOpen, setDrawerOpen] = useState(false);
  var [cosmeticsFullSetPackState, setCosmeticsFullSetPackState] = useState(() => defaultCosmeticsFullSetPackState());
  var [cosmeticsAssetRevision, setCosmeticsAssetRevision] = useState(() => getCosmeticsFullSetResolutionRevision());
  var refreshCosmeticsFullSetPack = useCallback(_asyncToGenerator(function* () {
    var _window$Capacitor7;
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var forceAssetReload = Boolean(options === null || options === void 0 ? void 0 : options.forceAssetReload);
    var applyPackState = next => {
      setCosmeticsFullSetPackState(next);
      if (isAndroidNative && (forceAssetReload || next.isReady || next.status === 'completed')) {
        var revision = bumpCosmeticsFullSetResolutionRevision();
        setCosmeticsAssetRevision(revision);
      }
      return next;
    };
    if (!isAndroidNative) {
      var next = defaultCosmeticsFullSetPackState();
      return applyPackState(next);
    }
    var plugin = (_window$Capacitor7 = window.Capacitor) === null || _window$Capacitor7 === void 0 || (_window$Capacitor7 = _window$Capacitor7.Plugins) === null || _window$Capacitor7 === void 0 ? void 0 : _window$Capacitor7.CosmeticsAssetPack;
    if (!(plugin !== null && plugin !== void 0 && plugin.getStatus)) {
      setCosmeticsFullSetPackBasePath('');
      var _next2 = _objectSpread(_objectSpread({}, defaultCosmeticsFullSetPackState()), {}, {
        supported: false,
        status: 'unavailable',
        isReady: false
      });
      return applyPackState(_next2);
    }
    try {
      var raw = yield plugin.getStatus();
      var _next3 = normalizeCosmeticsFullSetPackState(raw);
      return applyPackState(_next3);
    } catch (error) {
      setCosmeticsFullSetPackBasePath('');
      var _next4 = _objectSpread(_objectSpread({}, defaultCosmeticsFullSetPackState()), {}, {
        status: 'failed',
        isReady: false
      });
      return applyPackState(_next4);
    }
  }), [isAndroidNative]);
  var fullSetCatalogCount = useMemo(() => cosmeticsCatalog.fullSets.filter(entry => entry.status === 'ready').length, [cosmeticsCatalog]);
  var cosmeticsCatalogForDisplay = cosmeticsCatalog;
  var allCharactersById = useMemo(() => new Map([...killers, ...survivors].map(character => [character.id, character])), [killers, survivors]);
  var readyCharacterSwaps = useMemo(() => cosmeticsCatalogForDisplay.characterSwaps.filter(entry => entry.status === 'ready'), [cosmeticsCatalogForDisplay]);
  var readyFullSets = useMemo(() => cosmeticsCatalogForDisplay.fullSets.filter(entry => entry.status === 'ready'), [cosmeticsCatalogForDisplay]);
  var readyCosmetics = useMemo(() => [...readyCharacterSwaps, ...readyFullSets], [readyCharacterSwaps, readyFullSets]);
  useEffect(() => {
    if (currentView !== 'cosmetics') return undefined;
    var firstVisibleCosmetics = sortCosmeticsByRarity(readyCosmetics.filter(entry => entry.baseCharacterType === 'Killer')).slice(0, 16).map(entry => entry.image);
    return preloadImageBatch(firstVisibleCosmetics, cosmeticsAssetRevision, 16);
  }, [currentView, readyCosmetics, cosmeticsAssetRevision]);
  var openCharacterArticle = useCallback(character => {
    if (!character) return;
    var view = resolveCharacterView(character);
    setView(view, _objectSpread({
      id: character.id
    }, character.cosmeticFocusId ? {
      cosmeticId: character.cosmeticFocusId
    } : {}));
  }, []);
  var openRealmArticle = useCallback(realm => {
    if (!realm) return;
    setView('realm', {
      id: realm.id
    });
  }, []);
  var openReleaseArticle = useCallback(release => {
    if (!release) return;
    setView('release', {
      id: release.id
    });
  }, []);
  var openPerkArticle = useCallback(perk => {
    if (!perk) return;
    setView('perk', {
      id: perk.id
    });
  }, []);
  var openCosmeticProfile = useCallback(cosmetic => {
    if (!cosmetic) return;
    var baseCharacter = allCharactersById.get(cosmetic.baseCharacterId);
    if (!baseCharacter) return;
    var view = resolveCharacterView(baseCharacter);
    setView(view, {
      id: baseCharacter.id,
      cosmeticId: cosmetic.id
    });
  }, [allCharactersById]);
  var togglePerkCompare = perk => {
    setComparePerks(prev => {
      var exists = prev.find(p => p.id === perk.id);
      if (exists) {
        return prev.filter(p => p.id !== perk.id);
      }
      if (prev.length >= 4) return prev;
      return [...prev, perk];
    });
    triggerHaptic('Light');
  };
  var clearCompare = () => {
    setComparePerks([]);
    setShowCompareModal(false);
  };
  var toggleFavorite = (category, itemId) => {
    var key = FAVORITE_KEYS[category];
    if (!key) return;
    setSettings(prev => {
      var favs = prev[key] || [];
      var isFav = favs.includes(itemId);
      return _objectSpread(_objectSpread({}, prev), {}, {
        [key]: isFav ? favs.filter(id => id !== itemId) : [...favs, itemId]
      });
    });
    triggerHaptic('Light');
  };
  var toggleFavoritePerk = perkId => toggleFavorite('Perk', perkId);
  var initialSettings = useMemo(() => normalizeSettings(loadFromStorage(STORAGE_KEYS.settings, DEFAULT_SETTINGS)), []);
  var initialBuilds = useMemo(() => loadFromStorage(STORAGE_KEYS.builds, []), []);
  var legacyAchievementState = useMemo(() => loadFromStorage(STORAGE_KEY_ACHIEVEMENTS, {}), []);
  var initialProgression = useMemo(() => normalizeProgression(loadFromStorage(STORAGE_KEYS.progression, DEFAULT_PROGRESSION), legacyAchievementState), [legacyAchievementState]);
  var initialLookups = useMemo(() => buildDataLookups({
    killers,
    survivors,
    perks,
    maps,
    builds: initialBuilds
  }), [killers, survivors, perks, maps, initialBuilds]);
  var initialMatches = useMemo(() => normalizeMatchRecords(loadFromStorage(STORAGE_KEYS.matches, []), initialLookups), [initialLookups]);
  var initialNotes = useMemo(() => normalizeNotesStore(loadFromStorage(STORAGE_KEYS.notes, {})), []);
  var initialWorldle = useMemo(() => normalizeWorldleState(loadFromStorage(STORAGE_KEYS.worldle, createWorldleStateShape())), []);
  var [settings, setSettings] = useState(initialSettings);
  var [builds, setBuilds] = useState(initialBuilds);
  var [matches, setMatches] = useState(initialMatches);
  var [progression, setProgression] = useState(initialProgression);
  var [notes, setNotes] = useState(initialNotes);
  var [worldleState, setWorldleState] = useState(initialWorldle);
  var [matchPrefs, setMatchPrefs] = useState(() => normalizeMatchPrefs(loadFromStorage(STORAGE_KEYS.lastContext, DEFAULT_MATCH_PREFS)));
  var device = useDeviceProfile();
  var cosmeticsByBaseId = useMemo(() => {
    return readyCosmetics.reduce((acc, entry) => {
      if (!acc[entry.baseCharacterId]) acc[entry.baseCharacterId] = [];
      acc[entry.baseCharacterId].push(entry);
      return acc;
    }, {});
  }, [readyCosmetics]);
  useEffect(() => {
    refreshCosmeticsFullSetPack();
  }, [refreshCosmeticsFullSetPack]);
  useEffect(() => {
    var _window$Capacitor8;
    if (!isAndroidNative) return undefined;
    var plugin = (_window$Capacitor8 = window.Capacitor) === null || _window$Capacitor8 === void 0 || (_window$Capacitor8 = _window$Capacitor8.Plugins) === null || _window$Capacitor8 === void 0 ? void 0 : _window$Capacitor8.App;
    if (!(plugin !== null && plugin !== void 0 && plugin.addListener)) return undefined;
    var listenerHandle;
    var setup = function () {
      var _ref67 = _asyncToGenerator(function* () {
        listenerHandle = yield plugin.addListener('resume', () => {
          refreshCosmeticsFullSetPack();
        });
      });
      return function setup() {
        return _ref67.apply(this, arguments);
      };
    }();
    setup();
    return () => {
      var _listenerHandle;
      if ((_listenerHandle = listenerHandle) !== null && _listenerHandle !== void 0 && _listenerHandle.remove) listenerHandle.remove();
    };
  }, [isAndroidNative, refreshCosmeticsFullSetPack]);
  useEffect(() => {
    if (!isAndroidNative) return undefined;
    if (cosmeticsFullSetPackState.isReady) return undefined;
    if (!['checking', 'pending', 'downloading', 'transferring', 'missing', 'unknown', 'unavailable', 'failed'].includes(cosmeticsFullSetPackState.status)) {
      return undefined;
    }
    var interval = window.setInterval(() => {
      refreshCosmeticsFullSetPack();
    }, 2000);
    return () => window.clearInterval(interval);
  }, [isAndroidNative, cosmeticsFullSetPackState.isReady, cosmeticsFullSetPackState.status, refreshCosmeticsFullSetPack]);
  useEffect(() => {
    if (!launchContext.profileId) return;
    var target = allCharactersById.get(launchContext.profileId);
    if (!target) return;
    var view = target.type === 'Killer' || target.power ? 'killer' : 'survivor';
    setView(view, _objectSpread({
      id: target.id
    }, launchContext.cosmeticId ? {
      cosmeticId: launchContext.cosmeticId
    } : {}));
  }, [launchContext, allCharactersById]);
  useEffect(() => {
    var cancelled = false;
    var timer = window.setTimeout(() => {
      var _window$__hideLaunchO, _window;
      if (!cancelled) (_window$__hideLaunchO = (_window = window).__hideLaunchOverlay) === null || _window$__hideLaunchO === void 0 || _window$__hideLaunchO.call(_window);
    }, 80);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);
  useEffect(() => saveToStorage(STORAGE_KEYS.settings, settings), [settings]);
  useEffect(() => saveToStorage(STORAGE_KEYS.builds, builds), [builds]);
  useEffect(() => saveToStorage(STORAGE_KEYS.matches, matches), [matches]);
  useEffect(() => saveToStorage(STORAGE_KEYS.progression, progression), [progression]);
  useEffect(() => saveToStorage(STORAGE_KEYS.notes, notes), [notes]);
  useEffect(() => saveToStorage(STORAGE_KEYS.worldle, worldleState), [worldleState]);
  useEffect(() => saveToStorage(STORAGE_KEYS.lastContext, matchPrefs), [matchPrefs]);
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.uiState, {
      view: currentView,
      context: viewContext,
      perkFilter,
      perkSearch
    });
  }, [currentView, viewContext, perkFilter, perkSearch]);
  window.__codexQA = {
    view: () => currentView,
    context: () => viewContext,
    crumbs: () => Array.from(document.querySelectorAll('.cx-crumbs__current')).map(node => node.textContent)
  };
  useEffect(() => {
    try {
      localStorage.removeItem(STORAGE_KEY_ACHIEVEMENTS);
    } catch (err) {
      console.warn('Failed to remove legacy achievements key', err);
    }
  }, []);
  useEffect(() => {
    var listenerHandle;
    var setup = function () {
      var _ref68 = _asyncToGenerator(function* () {
        var _window$Capacitor9;
        if ((_window$Capacitor9 = window.Capacitor) !== null && _window$Capacitor9 !== void 0 && (_window$Capacitor9 = _window$Capacitor9.Plugins) !== null && _window$Capacitor9 !== void 0 && _window$Capacitor9.App) {
          listenerHandle = yield window.Capacitor.Plugins.App.addListener('backButton', () => {
            goBack();
          });
        }
      });
      return function setup() {
        return _ref68.apply(this, arguments);
      };
    }();
    setup();
    return () => {
      var _listenerHandle2;
      if ((_listenerHandle2 = listenerHandle) !== null && _listenerHandle2 !== void 0 && _listenerHandle2.remove) listenerHandle.remove();
    };
  }, []);
  var theme = useMemo(() => {
    var palette = COLOR_MODES[settings.colorMode] || COLOR_MODES.oled;
    return {
      accent: palette.accent,
      accentSoft: palette.accentSoft
    };
  }, [settings.colorMode]);
  useEffect(() => {
    var rootEl = document.documentElement;
    var palette = COLOR_MODES[settings.colorMode] || COLOR_MODES.oled;
    rootEl.style.setProperty('--bg-01', palette.bg01);
    rootEl.style.setProperty('--bg-02', palette.bg02);
    rootEl.style.setProperty('--panel', palette.panel);
    rootEl.style.setProperty('--stroke', palette.stroke);
    rootEl.style.setProperty('--chip', palette.chip);
    rootEl.style.setProperty('--text', palette.text);
    rootEl.style.setProperty('--muted', palette.muted);
    rootEl.style.setProperty('--nav-bg', palette.nav);
    rootEl.style.setProperty('--glass-bg', palette.glass);
    rootEl.style.setProperty('--ghost-surface', palette.ghost);
    rootEl.style.setProperty('--ghost-strong', palette.ghostStrong);
    rootEl.style.setProperty('--shadow-soft', palette.shadowSoft);
    rootEl.style.setProperty('--shadow-strong', palette.shadowStrong);
    rootEl.style.setProperty('--site-shell-bg', palette.appShellBg);
    rootEl.style.setProperty('--ambient-glow', palette.ambientGlow);
    rootEl.style.setProperty('--ambient-opacity', palette.ambientOpacity);
    rootEl.style.setProperty('--selection-bg', palette.selectionBg);
    rootEl.style.setProperty('--selection-text', palette.selectionText);
    rootEl.style.setProperty('--accent', palette.accent);
    rootEl.style.setProperty('--accent-soft', palette.accentSoft);
    var fontSize = settings.fontSize === 'small' ? '14px' : settings.fontSize === 'large' ? '18px' : '16px';
    rootEl.style.fontSize = fontSize;
    document.body.classList.toggle('light-mode', settings.colorMode === 'light');
    document.body.classList.toggle('oled-mode', settings.colorMode === 'oled');
  }, [settings.colorMode, settings.fontSize]);
  var liveLookups = useMemo(() => buildDataLookups({
    killers,
    survivors,
    perks,
    maps,
    builds
  }), [killers, survivors, perks, maps, builds]);
  var ownedState = useMemo(() => resolveOwnedState({
    progression,
    killers,
    survivors,
    perks
  }), [progression, killers, survivors, perks]);
  var visibleKillers = useMemo(() => settings.ownedOnlyGlobal ? killers.filter(killer => ownedState.isCharacterOwned(killer.id)) : killers, [settings.ownedOnlyGlobal, killers, ownedState]);
  var visibleSurvivors = useMemo(() => settings.ownedOnlyGlobal ? survivors.filter(survivor => ownedState.isCharacterOwned(survivor.id)) : survivors, [settings.ownedOnlyGlobal, survivors, ownedState]);
  var visiblePerks = useMemo(() => settings.ownedOnlyGlobal ? perks.filter(perk => ownedState.isPerkOwned(perk.id)) : perks, [settings.ownedOnlyGlobal, perks, ownedState]);
  var visibleAddons = useMemo(() => settings.ownedOnlyGlobal ? addons.filter(addon => addon.role !== 'killer' || ownedState.isAddonOwned(addon)) : addons, [settings.ownedOnlyGlobal, addons, ownedState]);
  var buildsByOwner = useMemo(() => {
    var bucket = {};
    (builds || []).forEach(b => {
      if (!b.characterName) return;
      bucket[b.characterName] = bucket[b.characterName] || [];
      bucket[b.characterName].push(b);
    });
    return bucket;
  }, [builds]);
  var getEntityNote = (type, id) => {
    if (!id) return '';
    return notes[getNoteKey(type, id)] || '';
  };
  var setEntityNote = (type, id, value) => {
    if (!id) return;
    setNotes(prev => {
      var key = getNoteKey(type, id);
      var next = _objectSpread({}, prev);
      if ((value || '').trim()) {
        next[key] = value;
      } else {
        delete next[key];
      }
      return next;
    });
  };
  var markBuildUsed = id => setBuilds(prev => prev.map(b => b.id === id ? _objectSpread(_objectSpread({}, b), {}, {
    lastUsedAt: new Date().toISOString()
  }) : b));
  var quickAddMatch = entry => {
    var now = new Date().toISOString();
    var record = createMatchSnapshot(_objectSpread(_objectSpread({}, entry), {}, {
      createdAt: entry.createdAt || now,
      updatedAt: now
    }), liveLookups);
    setMatches(prev => [record, ...prev]);
    if (record.buildId) markBuildUsed(record.buildId);
  };
  var websiteBackupPayload = useMemo(() => createWebsiteBackupPayload({
    settings,
    builds,
    matches,
    progression,
    notes,
    worldleState,
    matchPrefs,
    siteVersion: META.siteVersion,
    gameVersion: META.gameVersion,
    lastSynced: META.lastSynced
  }), [settings, builds, matches, progression, notes, worldleState, matchPrefs]);
  var websiteBackupSummary = useMemo(() => summarizeWebsiteBackupPayload(websiteBackupPayload), [websiteBackupPayload]);
  var copyWebsiteBackup = useCallback(() => {
    var _navigator$clipboard;
    var text = JSON.stringify(websiteBackupPayload, null, 2);
    if (!((_navigator$clipboard = navigator.clipboard) !== null && _navigator$clipboard !== void 0 && _navigator$clipboard.writeText)) {
      alert('Copy is not available here. Use Download Backup File instead.');
      return;
    }
    navigator.clipboard.writeText(text).then(() => alert('Backup copied.')).catch(() => alert('Could not copy the backup. Use Download Backup File instead.'));
  }, [websiteBackupPayload]);
  var downloadWebsiteBackup = useCallback(() => {
    var text = JSON.stringify(websiteBackupPayload, null, 2);
    downloadTextFile(buildBackupFilename(websiteBackupPayload), text);
  }, [websiteBackupPayload]);
  var restoreWebsiteBackup = useCallback(payload => {
    var backupData = payload !== null && payload !== void 0 && payload.data && typeof payload.data === 'object' ? payload.data : {};
    var restoredSettings = normalizeSettings(backupData.settings);
    var restoredBuilds = Array.isArray(backupData.builds) ? backupData.builds : [];
    var restoredProgression = normalizeProgression(backupData.progression);
    var restoredNotes = normalizeNotesStore(backupData.notes);
    var restoredWorldle = normalizeWorldleState(backupData.worldle);
    var restoredPrefs = normalizeMatchPrefs(backupData.lastContext);
    var restoredLookups = buildDataLookups({
      killers,
      survivors,
      perks,
      maps,
      builds: restoredBuilds
    });
    var restoredMatches = normalizeMatchRecords(backupData.matches, restoredLookups);
    setSettings(restoredSettings);
    setBuilds(restoredBuilds);
    setMatches(restoredMatches);
    setProgression(restoredProgression);
    setNotes(restoredNotes);
    setWorldleState(restoredWorldle);
    setMatchPrefs(restoredPrefs);
    setLayoutMap(null);
    setBuildSeed(null);
    setComparePerks([]);
    setShowCompareModal(false);
  }, [killers, survivors, perks, maps]);
  var touchStartRef = useRef(null);
  var navOrder = ['home', 'favorites'];
  var isAnyOverlayOpen = !!(drawerOpen || layoutMap || previewPerk || showCompareModal);
  var handleTouchStart = e => {
    if (!e.touches || e.touches.length !== 1) {
      touchStartRef.current = null;
      return;
    }
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  };
  var handleTouchEnd = e => {
    var start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    if (isAnyOverlayOpen) return;
    var target = e.target;
    if (target && target.closest && target.closest('input, textarea, select, [data-no-swipe], table.cx-wikitable, .overflow-x-auto, .nav-scroll')) return;
    var touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY
    };
    var diffX = start.x - touchEnd.x;
    var diffY = start.y - touchEnd.y;
    var minSwipe = 100;
    var isHorizontalSwipe = Math.abs(diffX) > minSwipe && Math.abs(diffX) > Math.abs(diffY) * 1.5;
    if (isHorizontalSwipe) {
      var currentIndex = navOrder.indexOf(currentView);
      if (currentIndex === -1) return;
      if (diffX > 0 && currentIndex < navOrder.length - 1) {
        setView(navOrder[currentIndex + 1]);
        triggerHaptic('Light');
      } else if (diffX < 0 && currentIndex > 0) {
        setView(navOrder[currentIndex - 1]);
        triggerHaptic('Light');
      }
    }
  };
  var renderContent = () => {
    switch (currentView) {
      case 'home':
        return React.createElement(HomeView, {
          setView: setView,
          data: {
            killers: visibleKillers,
            survivors: visibleSurvivors,
            perks: visiblePerks
          },
          theme: theme,
          builds: builds,
          maps: maps,
          challenges: (progression === null || progression === void 0 ? void 0 : progression.challenges) || [],
          setBuildSeed: setBuildSeed,
          perks: visiblePerks,
          items: items,
          addons: visibleAddons,
          offerings: offerings,
          cosmeticsCatalog: cosmeticsCatalogForDisplay,
          allCharacters: [...killers, ...survivors],
          onOpenCharacterProfile: openCharacterArticle,
          settings: settings
        });
      case 'progression':
        return React.createElement(ProgressionView, {
          onBack: () => setView('home'),
          onGoTo: setView,
          killers: killers,
          survivors: survivors,
          perks: perks,
          progression: progression,
          setProgression: setProgression,
          builds: builds,
          matches: matches,
          prefs: matchPrefs,
          settings: settings,
          setSettings: setSettings,
          initialTab: viewContext.tab || 'achievements',
          maps: maps
        });
      case 'worldle':
        return React.createElement(WorldleView, {
          onBack: () => setView('home'),
          killers: killers,
          perks: perks,
          worldleState: worldleState,
          setWorldleState: setWorldleState,
          isCompactLayout: device.width <= 640
        });
      case 'cosmetics':
        return React.createElement(CosmeticsView, {
          onBack: () => setView('home'),
          cosmeticsCatalog: cosmeticsCatalogForDisplay,
          onOpenCosmetic: openCosmeticProfile,
          fullSetPackState: cosmeticsFullSetPackState,
          fullSetCatalogCount: fullSetCatalogCount,
          onRefreshFullSetPack: refreshCosmeticsFullSetPack,
          cosmeticsAssetRevision: cosmeticsAssetRevision
        });
      case 'buildLab':
      case 'builds':
        return React.createElement(BuildPlannerView, {
          builds: builds,
          setBuilds: setBuilds,
          perks: visiblePerks,
          killers: visibleKillers,
          survivors: visibleSurvivors,
          items: items,
          addons: visibleAddons,
          offerings: offerings,
          templates: settings.showTemplates ? PREMADE_BUILDS : [],
          onBack: () => setView('home'),
          seed: buildSeed,
          clearSeed: () => setBuildSeed(null),
          setRoleContext: role => setMatchPrefs(p => _objectSpread(_objectSpread({}, p), {}, {
            lastRole: role
          }))
        });
      case 'matches':
        return React.createElement(MatchLogView, {
          onBack: () => setView('home'),
          matches: matches,
          setMatches: setMatches,
          killers: killers,
          survivors: survivors,
          builds: builds,
          maps: maps,
          prefs: matchPrefs,
          setPrefs: setMatchPrefs,
          onBuildUsed: markBuildUsed,
          onOpenAnalytics: () => setView('progression', {
            tab: 'analytics'
          })
        });
      case 'killer':
      case 'survivor':
        {
          var isKillerView = currentView === 'killer';
          var articleList = isKillerView ? killers : survivors;
          var article = allCharactersById.get(viewContext.id) || articleList.find(c => c.id === viewContext.id) || null;
          if (!article) return React.createElement("div", {
            className: "flex flex-col h-full overflow-y-auto custom-scrollbar"
          }, React.createElement("div", {
            className: "cx-article w-full max-w-[1280px] mx-auto min-h-full"
          }, React.createElement("h1", {
            className: "cx-title"
          }, "Unknown article"), React.createElement("p", {
            className: "cx-hatnote"
          }, "The requested character could not be found."), React.createElement("p", null, React.createElement("button", {
            type: "button",
            className: "cx-alink",
            onClick: () => setView('home')
          }, "Return to the Main page"), ".")));
          return React.createElement(CharacterArticleView, {
            character: article,
            roleCount: articleList.length,
            cosmeticFocusId: viewContext.cosmeticId || null,
            scrollSection: viewContext.scroll || null,
            onHome: () => setView('home'),
            onOpenList: () => setView(isKillerView ? 'killers' : 'survivors'),
            onOpenTimeline: () => setView('timeline'),
            onOpenCommunity: () => setView('communityContent'),
            allPerks: perks,
            onPerkTap: openPerkArticle,
            theme: theme,
            settings: settings,
            noteValue: isKillerView ? getEntityNote('killer', article.id) : '',
            onNoteChange: value => {
              if (isKillerView) setEntityNote('killer', article.id, value);
            },
            cosmeticsByBaseId: cosmeticsByBaseId,
            allAddons: addons
          });
        }
      case 'realm':
        {
          var realm = (realms || []).find(r => r.id === viewContext.id) || null;
          if (!realm) return React.createElement("div", {
            className: "flex flex-col h-full overflow-y-auto custom-scrollbar"
          }, React.createElement("div", {
            className: "cx-article w-full max-w-[1280px] mx-auto min-h-full"
          }, React.createElement("h1", {
            className: "cx-title"
          }, "Unknown article"), React.createElement("p", {
            className: "cx-hatnote"
          }, "The requested realm could not be found."), React.createElement("p", null, React.createElement("button", {
            type: "button",
            className: "cx-alink",
            onClick: () => setView('home')
          }, "Return to the Main page"), ".")));
          return React.createElement(RealmArticleView, {
            realm: realm,
            maps: maps,
            killers: killers,
            survivors: survivors,
            perks: perks,
            releases: TIMELINE_DATA.releases,
            onHome: () => setView('home'),
            onOpenList: () => setView('realms'),
            onOpenTimeline: () => setView('timeline'),
            onOpenRelease: openReleaseArticle,
            onOpenCharacter: openCharacterArticle,
            onViewLayout: setLayoutMap,
            noteValue: getEntityNote('realm', realm.id),
            onNoteChange: value => setEntityNote('realm', realm.id, value),
            scrollSection: viewContext.scroll || null
          });
        }
      case 'release':
        {
          var release = (TIMELINE_DATA.releases || []).find(r => r.id === viewContext.id) || null;
          if (!release) return React.createElement("div", {
            className: "flex flex-col h-full overflow-y-auto custom-scrollbar"
          }, React.createElement("div", {
            className: "cx-article w-full max-w-[1280px] mx-auto min-h-full"
          }, React.createElement("h1", {
            className: "cx-title"
          }, "Unknown article"), React.createElement("p", {
            className: "cx-hatnote"
          }, "The requested release could not be found."), React.createElement("p", null, React.createElement("button", {
            type: "button",
            className: "cx-alink",
            onClick: () => setView('home')
          }, "Return to the Main page"), ".")));
          return React.createElement(ReleaseArticleView, {
            release: release,
            releases: TIMELINE_DATA.releases,
            realms: realms,
            killers: killers,
            survivors: survivors,
            perks: perks,
            maps: maps,
            onHome: () => setView('home'),
            onOpenList: () => setView('timeline'),
            onOpenCharacter: openCharacterArticle,
            onOpenRelease: openReleaseArticle,
            onOpenRealm: openRealmArticle,
            scrollSection: viewContext.scroll || null
          });
        }
      case 'perk':
        {
          var perk = (perks || []).find(x => x.id === viewContext.id) || null;
          if (!perk) return React.createElement("div", {
            className: "flex flex-col h-full overflow-y-auto custom-scrollbar"
          }, React.createElement("div", {
            className: "cx-article w-full max-w-[1280px] mx-auto min-h-full"
          }, React.createElement("h1", {
            className: "cx-title"
          }, "Unknown article"), React.createElement("p", {
            className: "cx-hatnote"
          }, "The requested perk could not be found."), React.createElement("p", null, React.createElement("button", {
            type: "button",
            className: "cx-alink",
            onClick: () => setView('home')
          }, "Return to the Main page"), ".")));
          return React.createElement(PerkArticleView, {
            perk: perk,
            perks: perks,
            killers: killers,
            survivors: survivors,
            onHome: () => setView('home'),
            onOpenList: () => setView('perks'),
            onOpenCharacter: openCharacterArticle,
            onOpenPerk: openPerkArticle,
            noteValue: getEntityNote('perk', perk.id),
            onNoteChange: value => setEntityNote('perk', perk.id, value),
            settings: settings,
            scrollSection: viewContext.scroll || null
          });
        }
      case 'killers':
        return React.createElement(ListView, {
          allCharacters: [...killers, ...survivors],
          data: visibleKillers,
          type: "Killers",
          activeFilter: "All",
          setActiveFilter: () => {},
          allPerks: perks,
          setView: setView,
          onPerkSelect: setPerkSearch,
          initialSearch: viewContext.search || '',
          buildsByOwner: buildsByOwner,
          onCreateBuildSeed: setBuildSeed,
          onBack: () => setView('home'),
          onShowLore: openCharacterArticle,
          onShowPower: openCharacterArticle,
          favoritePerks: settings.favoriteKillers || [],
          onToggleFavorite: id => toggleFavorite('Killer', id),
          onViewProfile: openCharacterArticle,
          settings: settings
        });
      case 'survivors':
        return React.createElement(ListView, {
          allCharacters: [...killers, ...survivors],
          data: visibleSurvivors,
          type: "Survivors",
          activeFilter: "All",
          setActiveFilter: () => {},
          allPerks: perks,
          setView: setView,
          onPerkSelect: setPerkSearch,
          initialSearch: viewContext.search || '',
          buildsByOwner: buildsByOwner,
          onCreateBuildSeed: setBuildSeed,
          onBack: () => setView('home'),
          onShowLore: openCharacterArticle,
          favoritePerks: settings.favoriteSurvivors || [],
          onToggleFavorite: id => toggleFavorite('Survivor', id),
          onViewProfile: openCharacterArticle,
          settings: settings
        });
      case 'perks':
        return React.createElement(ListView, {
          allCharacters: [...killers, ...survivors],
          data: visiblePerks,
          type: "Perks",
          filterOptions: ['All', 'Survivor', 'Killer', 'Favorites', 'Exhaustion', 'Hex', 'Boon', 'Scourge', 'Obsession', 'Aura', 'Stealth', 'Gen', 'Healing'],
          activeFilter: perkFilter,
          setActiveFilter: setPerkFilter,
          initialSearch: perkSearch,
          onSearchChange: setPerkSearch,
          onBack: () => setView('home'),
          comparePerks: comparePerks,
          onPerkLongPress: togglePerkCompare,
          favoritePerks: settings.favoritePerks || [],
          onToggleFavorite: toggleFavoritePerk,
          onPerkTap: openPerkArticle,
          onPerkPreview: setPreviewPerk,
          settings: settings
        });
      case 'roulette':
        return React.createElement(ChaosShuffleView, {
          onBack: () => setView('home'),
          perks: visiblePerks,
          killers: visibleKillers,
          survivors: visibleSurvivors,
          items: items,
          addons: visibleAddons,
          offerings: offerings,
          settings: settings,
          ownedOnlyGlobal: settings.ownedOnlyGlobal === true
        });
      case 'realms':
        return React.createElement(RealmsView, {
          onBack: () => setView('home'),
          maps: maps,
          realms: realms,
          onViewLayout: setLayoutMap,
          onOpenRealm: openRealmArticle,
          initialSearch: viewContext.search || ''
        });
      case 'glossary':
        return React.createElement(GlossaryView, {
          onBack: () => setView('home')
        });
      case 'prestige':
        return React.createElement(PrestigeCalculatorView, {
          onBack: () => setView('home')
        });
      case 'gameIcons':
        return React.createElement(GameIconsView, {
          onBack: () => setView('home'),
          theme: theme
        });
      case 'items':
        return React.createElement(ItemsView, {
          onBack: () => setView('home'),
          items: items,
          addons: visibleAddons,
          killers: visibleKillers,
          settings: settings,
          initialSearch: viewContext.search || '',
          initialMode: viewContext.mode || 'survivor',
          initialTargetId: viewContext.targetId || '',
          initialTargetType: viewContext.targetType || '',
          favoriteItems: settings.favoriteItems || [],
          favoriteAddons: settings.favoriteAddons || [],
          onToggleFavoriteItem: id => toggleFavorite('Item', id),
          onToggleFavoriteAddon: id => toggleFavorite('Addon', id)
        });
      case 'offerings':
        return React.createElement(OfferingsView, {
          onBack: () => setView('home'),
          offerings: offerings,
          initialSearch: viewContext.search || '',
          initialTargetId: viewContext.targetId || '',
          favoriteOfferings: settings.favoriteOfferings || [],
          onToggleFavoriteOffering: id => toggleFavorite('Offering', id)
        });
      case 'communityContent':
      case 'quotes':
        return React.createElement(CommunityContentView, {
          onBack: () => setView('home'),
          communityContent: communityContent
        });
      case 'timeline':
        return React.createElement(TimelineView, {
          onBack: () => setView('home'),
          setView: setView,
          killers: killers,
          survivors: survivors,
          theme: theme
        });
      case 'settings':
        return React.createElement(SettingsView, {
          onBack: () => setView('home'),
          settings: settings,
          setSettings: setSettings,
          backupSummary: websiteBackupSummary,
          onCopyBackup: copyWebsiteBackup,
          onDownloadBackup: downloadWebsiteBackup,
          onRestoreBackup: restoreWebsiteBackup,
          isMobile: device.isMobile
        });
      case 'favorites':
        return React.createElement(FavoritesView, {
          onBack: () => setView('home'),
          settings: settings,
          killers: killers,
          survivors: survivors,
          perks: perks,
          items: items,
          addons: addons,
          offerings: offerings,
          toggleFavorite: toggleFavorite,
          setView: setView,
          onPerkTap: openPerkArticle
        });
      default:
        return React.createElement(HomeView, {
          setView: setView,
          data: {
            killers: visibleKillers,
            survivors: visibleSurvivors,
            perks: visiblePerks
          },
          theme: theme,
          builds: builds,
          maps: maps,
          challenges: (progression === null || progression === void 0 ? void 0 : progression.challenges) || [],
          setBuildSeed: setBuildSeed,
          perks: visiblePerks,
          items: items,
          addons: visibleAddons,
          offerings: offerings,
          cosmeticsCatalog: cosmeticsCatalogForDisplay,
          allCharacters: [...killers, ...survivors],
          onOpenCharacterProfile: openCharacterArticle,
          settings: settings
        });
    }
  };
  return React.createElement("div", {
    "data-smoke-ready": "true",
    "data-smoke-view": currentView,
    className: "site-shell website-shell flex flex-col h-screen w-full text-slate-100 overflow-hidden relative ".concat(device.isMobile && settings.googlePlayCtaHidden !== true ? 'mobile-app-cta-visible' : ''),
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd
  }, !device.isMobile && React.createElement(WikiHeader, {
    currentView: currentView,
    setView: setView
  }), React.createElement(SiteFooter, {
    currentView: currentView
  }), device.isMobile && React.createElement(WebsiteHeader, {
    currentView: currentView,
    setView: setView,
    onOpenDrawer: () => setDrawerOpen(true),
    titleOverride: (currentView === 'killer' || currentView === 'survivor') && viewContext.id && allCharactersById.get(viewContext.id) ? allCharactersById.get(viewContext.id).name : currentView === 'realm' && viewContext.id && (realms || []).find(r => r.id === viewContext.id) ? (realms || []).find(r => r.id === viewContext.id).name : currentView === 'release' && viewContext.id && (TIMELINE_DATA.releases || []).find(r => r.id === viewContext.id) ? (TIMELINE_DATA.releases || []).find(r => r.id === viewContext.id).name : currentView === 'perk' && viewContext.id && (perks || []).find(x => x.id === viewContext.id) ? (perks || []).find(x => x.id === viewContext.id).name : null
  }), React.createElement("div", {
    className: "website-workspace relative z-10 flex-1 min-h-0 flex"
  }, !device.isMobile && React.createElement(Navigation, {
    currentView: currentView,
    setView: setView,
    theme: theme,
    isMobile: false,
    onPerksReset: () => setPerkSearch(''),
    customNavItems: DEFAULT_SETTINGS.navItems
  }), React.createElement("main", {
    ref: mainRef,
    className: "website-main relative flex-1 min-w-0 overflow-hidden"
  }, React.createElement("div", {
    key: currentView,
    className: "view-transition h-full"
  }, renderContent()))), device.isMobile && React.createElement(SectionDrawer, {
    open: drawerOpen,
    currentView: currentView,
    onBrowse: id => {
      setDrawerOpen(false);
      setView(id);
    },
    onClose: () => setDrawerOpen(false)
  }), React.createElement(ScrollToTopFAB, {
    mainRef: mainRef,
    currentView: currentView
  }), device.isMobile && React.createElement("div", {
    className: "fixed bottom-0 left-0 w-full z-[55] px-2 sm:px-6 pb-2 sm:pb-5 flex flex-col items-center gap-2 nav-safe-area"
  }, settings.googlePlayCtaHidden !== true && React.createElement(PlayStoreFooter, {
    compact: true,
    onDismiss: () => setSettings(prev => _objectSpread(_objectSpread({}, prev), {}, {
      googlePlayCtaHidden: true
    }))
  }), React.createElement(AppToolbar, {
    currentView: currentView,
    drawerOpen: drawerOpen,
    onSearch: () => setView('home'),
    onSections: () => {
      setDrawerOpen(true);
      triggerHaptic('Light');
    },
    onSaved: () => setView('favorites'),
    onSettings: () => setView('settings')
  })), React.createElement(FloatingCompareBadge, {
    count: comparePerks.length,
    onClick: () => setShowCompareModal(true),
    onClear: clearCompare,
    theme: theme
  }), showCompareModal && React.createElement(PerkCompareModal, {
    perks: comparePerks,
    onClose: () => setShowCompareModal(false),
    onRemove: togglePerkCompare,
    theme: theme,
    settings: settings
  }), layoutMap && React.createElement(MapLayoutModal, {
    map: layoutMap,
    onClose: () => setLayoutMap(null),
    noteValue: getEntityNote('map', layoutMap === null || layoutMap === void 0 ? void 0 : layoutMap.id),
    onNoteChange: value => setEntityNote('map', layoutMap === null || layoutMap === void 0 ? void 0 : layoutMap.id, value)
  }), previewPerk && React.createElement(ImageLightbox, {
    src: "./".concat(previewPerk.image),
    alt: previewPerk.name,
    meta: [previewPerk.owner, previewPerk.type].filter(Boolean).join(' · '),
    fit: "icon",
    onClose: () => setPreviewPerk(null)
  }));
};
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }
  componentDidCatch(error, info) {
    var _window$__hideLaunchO2, _window2;
    console.error('[ErrorBoundary]', error, info);
    (_window$__hideLaunchO2 = (_window2 = window).__hideLaunchOverlay) === null || _window$__hideLaunchO2 === void 0 || _window$__hideLaunchO2.call(_window2, true);
  }
  render() {
    if (this.state.hasError) {
      var _this$state$error;
      return React.createElement("div", {
        style: {
          padding: 40,
          textAlign: 'center',
          color: '#e5e7eb',
          background: '#090b11',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16
        }
      }, React.createElement("h2", {
        style: {
          fontSize: 22,
          fontWeight: 700
        }
      }, "Something went wrong"), React.createElement("p", {
        style: {
          color: '#71717a',
          fontSize: 14
        }
      }, ((_this$state$error = this.state.error) === null || _this$state$error === void 0 ? void 0 : _this$state$error.message) || 'An unexpected error occurred.'), React.createElement("button", {
        onClick: () => this.setState({
          hasError: false,
          error: null
        }),
        style: {
          marginTop: 8,
          padding: '10px 24px',
          borderRadius: 12,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: '#e5e7eb',
          cursor: 'pointer',
          fontSize: 14
        }
      }, "Try Again"), React.createElement("button", {
        onClick: () => window.location.reload(),
        style: {
          padding: '10px 24px',
          borderRadius: 12,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: '#e5e7eb',
          cursor: 'pointer',
          fontSize: 14
        }
      }, "Reload App"), React.createElement("button", {
        onClick: () => {
          try {
            Object.keys(localStorage).filter(key => key.startsWith('dbd_')).forEach(key => localStorage.removeItem(key));
          } catch (e) {}
          window.location.reload();
        },
        style: {
          padding: '10px 24px',
          borderRadius: 12,
          background: 'rgba(225,29,72,0.15)',
          border: '1px solid rgba(225,29,72,0.4)',
          color: '#fda4af',
          cursor: 'pointer',
          fontSize: 14
        }
      }, "Clear Saved Data & Reload"));
    }
    return this.props.children;
  }
}
window.addEventListener('error', event => {
  console.error('[window.onerror]', event === null || event === void 0 ? void 0 : event.message, event === null || event === void 0 ? void 0 : event.filename, event === null || event === void 0 ? void 0 : event.lineno);
});
window.addEventListener('unhandledrejection', event => {
  console.error('[unhandledrejection]', event === null || event === void 0 ? void 0 : event.reason);
});
if (typeof DATABASE === 'undefined') {
  var _window$__hideLaunchO3, _window3;
  document.getElementById('root').innerHTML = '<div style="padding:40px;text-align:center;color:#e5e7eb;background:#090b11;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;font-family:sans-serif"><h2 style="font-size:22px;font-weight:700">Game data failed to load</h2><p style="color:#71717a;font-size:14px">The offline database did not load. Reload the page or clear your browser data, then try again.</p></div>';
  (_window$__hideLaunchO3 = (_window3 = window).__hideLaunchOverlay) === null || _window$__hideLaunchO3 === void 0 ? void 0 : _window$__hideLaunchO3.call(_window3, true);
} else {
  var root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(React.createElement(ErrorBoundary, null, React.createElement(App, null)));
}
