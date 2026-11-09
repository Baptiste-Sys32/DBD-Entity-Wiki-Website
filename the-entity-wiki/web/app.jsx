    const { useState, useEffect, useMemo, useRef, useCallback, useDeferredValue } = React;
    /* Moved to ./engine/core.js (wiki engine bundle, loaded above). */
    /* Icons moved to ./engine/icons.js (wiki engine bundle, loaded above). */
    const getPerkCode = (perkName) => {
      if (!perkName) return '';
      const words = perkName.replace(/[^a-zA-Z\s]/g, '').split(/\s+/).filter(w => w.length > 0);
      if (words.length === 1) {
        return words[0].substring(0, 3).toUpperCase();
      }
      return words.map(w => w[0]).join('').toUpperCase();
    };
    const perkMatchesName = (perk, name) => {
      if (!perk || !name) return false;
      const target = String(name).toLowerCase();
      return perk.name.toLowerCase() === target || (perk.aliases || []).some(alias => alias.toLowerCase() === target);
    };
    const buildPerkLookup = (perks) => {
      const lookup = {};
      perks.forEach(p => {
        [p.name].concat(p.aliases || []).forEach(label => {
          const code = getPerkCode(label);
          if (!lookup[code]) lookup[code] = p;
        });
      });
      return lookup;
    };


    const encodeBuild = (build) => {
      try {
        const payload = {
          v: 2,
          n: build.name || 'Shared Build',
          r: build.role || 'Survivor',
          cId: build.characterId || null,
          cN: build.characterName || null,
          p: (build.perks || []).filter(Boolean).map(p => ({
            id: p.id || null,
            n: p.name || null
          })),
          a: (build.addons || []).filter(Boolean).map(addon =>
            typeof addon === 'string' ? { n: addon } : { id: addon.id, n: addon.name }
          ),
          i: build.item ? (typeof build.item === 'string' ? { n: build.item } : { id: build.item.id, n: build.item.name }) : null,
          o: build.offering ? (typeof build.offering === 'string' ? { n: build.offering } : { id: build.offering.id, n: build.offering.name }) : null,
          notes: build.notes || ''
        };
        return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      } catch (e) {
        console.error('Failed to encode build:', e);
        return null;
      }
    };

    const decodeBuild = (code, lookups = {}) => {
      const { perks = [], killers = [], survivors = [], items = [], addons = [], offerings = [] } = lookups;
      const warnings = [];

      try {
        if (code.includes('-') && !code.match(/^[A-Za-z0-9+/=]+$/)) {
          return decodeBuildV1(code, perks);
        }

        let jsonStr;
        const compactCode = String(code || '').replace(/\s+/g, '');
        if (!compactCode) {
          return { success: false, error: 'Invalid code format. Please check the code and try again.' };
        }
        if (compactCode.length > 65536) {
          return { success: false, error: 'This code is too large to import. Please check the code and try again.' };
        }
        try {
          jsonStr = decodeURIComponent(escape(atob(compactCode)));
        } catch (e) {
          return { success: false, error: 'Invalid code format. Please check the code and try again.' };
        }

        let payload;
        try {
          payload = JSON.parse(jsonStr);
        } catch (e) {
          return { success: false, error: 'Corrupted build data. The code may be incomplete.' };
        }

        if (!payload.v) {
          return { success: false, error: 'Unrecognized shared build format.' };
        }

        if (payload.v > 2) {
          return { success: false, error: `This shared build came from a newer website version (v${payload.v}). Please refresh the wiki.` };
        }

        let character = null;
        const characterList = payload.r === 'Killer' ? killers : survivors;
        if (payload.cId) {
          character = characterList.find(c => c.id === payload.cId);
        }
        if (!character && payload.cN) {
          character = characterList.find(c => c.name.toLowerCase() === payload.cN.toLowerCase());
          if (character) warnings.push(`Character matched by name: ${payload.cN}`);
        }

        const resolvedPerks = (payload.p || []).map((perkData, idx) => {
          if (perkData.id) {
            const found = perks.find(p => p.id === perkData.id);
            if (found) return { id: found.id, name: found.name };
          }
          if (perkData.n) {
            const found = perks.find(p => perkMatchesName(p, perkData.n));
            if (found) {
              warnings.push(`Perk "${perkData.n}" matched by name`);
              return { id: found.id, name: found.name };
            }
          }
          warnings.push(`Perk not found: ${perkData.n || 'Unknown'}`);
          return null;
        }).filter(Boolean);

        const resolvedAddons = (payload.a || []).map(addonData => {
          if (addonData.id) {
            const found = addons.find(a => a.id === addonData.id);
            if (found) return found.name;
          }
          if (addonData.n) {
            const found = addons.find(a => a.name.toLowerCase() === addonData.n.toLowerCase());
            if (found) return found.name;
            warnings.push(`Addon not found in wiki data: ${addonData.n}`);
            return addonData.n;
          }
          return null;
        }).filter(Boolean);

        let resolvedItem = null;
        if (payload.i) {
          if (payload.i.id) {
            const found = items.find(i => i.id === payload.i.id);
            if (found) resolvedItem = found.name;
          }
          if (!resolvedItem && payload.i.n) {
            const found = items.find(i => i.name.toLowerCase() === payload.i.n.toLowerCase());
            resolvedItem = found ? found.name : payload.i.n;
          }
        }

        let resolvedOffering = null;
        if (payload.o) {
          if (payload.o.id) {
            const found = offerings.find(o => o.id === payload.o.id);
            if (found) resolvedOffering = found.name;
          }
          if (!resolvedOffering && payload.o.n) {
            const found = offerings.find(o => o.name.toLowerCase() === payload.o.n.toLowerCase());
            resolvedOffering = found ? found.name : payload.o.n;
          }
        }

        const build = {
          id: null,
          name: payload.n || 'Imported Build',
          role: payload.r || 'Survivor',
          characterId: character?.id || '',
          characterName: character?.name || payload.cN || '',
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
        return { success: false, error: 'Could not import this shared build. Please check the text and try again.' };
      }
    };

    const decodeBuildV1 = (code, perks) => {
      try {
        if (!code || !code.includes('-')) {
          return { success: false, error: 'This older shared-build format is invalid.' };
        }
        const [roleCode, perkString] = code.split('-');
        const role = roleCode.toUpperCase() === 'K' ? 'Killer' : 'Survivor';

        if (perkString === 'EMPTY' || !perkString) {
          return {
            success: true,
            build: {
              id: null,
              name: `Imported ${role} Build`,
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

        const lookup = buildPerkLookup(perks);
        const perkCodes = perkString.split('.');
        const resolvedPerks = [];
        const warnings = [];

        for (const pc of perkCodes) {
          const upperCode = pc.toUpperCase();
          if (lookup[upperCode]) {
            resolvedPerks.push({ id: lookup[upperCode].id, name: lookup[upperCode].name });
          } else {
            const fuzzy = perks.find(p => [p.name].concat(p.aliases || []).some(label => getPerkCode(label) === upperCode));
            if (fuzzy) {
              resolvedPerks.push({ id: fuzzy.id, name: fuzzy.name });
            } else {
              warnings.push(`Could not match one perk entry: ${pc}`);
            }
          }
        }

        return {
          success: true,
          build: {
            id: null,
            name: `Imported ${role} Build`,
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
        return { success: false, error: 'Could not import this older shared build.' };
      }
    };
    /* Moved to ./games/dbd/config.js (DBD adapter, loaded above). */
    /* Moved to ./engine/theme.js (wiki engine bundle, loaded above). */
    const stripHtml = (text) => {
      if (!text) return '';
      try {
        return new DOMParser().parseFromString(text, 'text/html').documentElement.textContent.replace(/\s+/g, ' ').trim();
      } catch {
        return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      }
    };
    const normalizePerkDescriptionText = (text = '') => {
      if (!text) return '';
      return String(text)
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map(line => {
          const match = line.match(/^(\s*)(-\s+)?(.*)$/);
          const indent = match?.[1] || '';
          const bullet = match?.[2] ? '- ' : '';
          const body = stripHtml(match?.[3] || '')
            .replace(/\s*\/\s*/g, '/')
            .replace(/([0-9])\s*%/g, '$1%')
            .replace(/([+\-][0-9]+)\s*%/g, '$1%');
          return body ? `${indent}${bullet}${body}` : '';
        })
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    };
    const getPerkDescriptionMode = (settings = {}) => settings?.perkDescriptionMode === 'post95' ? 'post95' : 'legacy';
    const getPerkLegacyDescription = (perk) => normalizePerkDescriptionText(perk?.description || '');
    const getPerkModernDescription = (perk) => normalizePerkDescriptionText(perk?.descriptionPost95 || '');
    const getPerkActiveDescription = (perk, settings = {}) => {
      if (!perk) return '';
      const modern = getPerkModernDescription(perk);
      return getPerkDescriptionMode(settings) === 'post95' && modern ? modern : getPerkLegacyDescription(perk);
    };
    const getPerkSearchDescription = (perk) => {
      const descriptions = [getPerkLegacyDescription(perk), getPerkModernDescription(perk)].filter(Boolean);
      return [...new Set(descriptions)].join('\n');
    };
    const PERCENT_TOKEN_RE = /([+\-]?\d+(?:\.\d+)?(?:\s*\/\s*[+\-]?\d+(?:\.\d+)?)+\s*%|[+\-]?\d+(?:\.\d+)?\s*%)/g;
    const isPercentToken = (value = '') => /^([+\-]?\d+(?:\.\d+)?(?:\s*\/\s*[+\-]?\d+(?:\.\d+)?)+\s*%|[+\-]?\d+(?:\.\d+)?\s*%)$/.test(value);
    const renderPerkDescriptionText = (text, accentColor) => {
      const parts = String(text).split(PERCENT_TOKEN_RE);
      return parts.map((part, idx) => (
        isPercentToken(part)
          ? <span key={idx} className="font-bold" style={{ color: accentColor }}>{part}</span>
          : <React.Fragment key={idx}>{part}</React.Fragment>
      ));
    };
    const PerkDescriptionBlock = ({ perk, settings = {}, accentColor = 'var(--accent)', className = '', lineClassName = '', compactLines = null }) => {
      if (!perk) return null;
      const text = getPerkActiveDescription(perk, settings);
      if (!text) return null;
      const isRich = getPerkDescriptionMode(settings) === 'post95' && Boolean(getPerkModernDescription(perk));
      const lines = text.split('\n');

      if (compactLines) {
        const compactText = lines
          .filter(Boolean)
          .slice(0, compactLines)
          .map(line => line.replace(/^\s*-\s+/, ''))
          .join(' ');
        return (
          <p className={className || lineClassName}>
            {isRich ? renderPerkDescriptionText(compactText, accentColor) : compactText}
          </p>
        );
      }

      return (
        <div className={className}>
          {lines.map((line, idx) => {
            if (!line.trim()) {
              return <div key={`space-${idx}`} className="h-2" />;
            }
            const bulletMatch = line.match(/^(\s*)-\s+(.*)$/);
            if (bulletMatch) {
              const depth = Math.max(0, Math.floor((bulletMatch[1] || '').length / 2));
              const content = bulletMatch[2];
              return (
                <div key={`line-${idx}`} className={`flex items-start gap-2 ${lineClassName}`} style={{ marginLeft: `${depth * 12}px` }}>
                  <span className="mt-0.5 text-zinc-500">•</span>
                  <span className="flex-1">{isRich ? renderPerkDescriptionText(content, accentColor) : content}</span>
                </div>
              );
            }
            return (
              <p key={`line-${idx}`} className={lineClassName}>
                {isRich ? renderPerkDescriptionText(line, accentColor) : line}
              </p>
            );
          })}
        </div>
      );
    };
    // Build release date lookup from timeline data for sorting
    const RELEASE_DATE_MAP = (() => {
      if (typeof TIMELINE_DATA === 'undefined') return {};
      const map = {};
      TIMELINE_DATA.releases.forEach(release => {
        const date = release.date;
        (release.killers || []).forEach(k => { map[k.name] = date; });
        (release.survivors || []).forEach(s => { map[s.name] = date; });
      });
      return map;
    })();
    const RELEASE_INFO_MAP = (() => {
      if (typeof TIMELINE_DATA === 'undefined') return {};
      const map = {};
      TIMELINE_DATA.releases.forEach((release) => {
        (release.killers || []).forEach((killer) => {
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
    /* Moved to ./games/dbd/config.js (DBD adapter, loaded above). */
    const WORLDLE_MODES = ['classic', 'emoji', 'survivorPerk', 'killerPerk', 'teachables'];
    /* Moved to ./engine/storage.js (wiki engine bundle, loaded above). */
    const STORAGE_KEY_ACHIEVEMENTS = 'dbd_achievements_progress';
    /* Moved to ./games/dbd/config.js (DBD adapter, loaded above). */
    /* Moved to ./games/dbd/config.js (DBD adapter, loaded above). */
    /* Moved to ./games/dbd/config.js (DBD adapter, loaded above). */
    /* Moved to ./games/dbd/config.js (DBD adapter, loaded above). */
    /* Moved to ./games/dbd/config.js (DBD adapter, loaded above). */
    /* Moved to ./games/dbd/config.js (DBD adapter, loaded above). */
    /* Moved to ./games/dbd/config.js (DBD adapter, loaded above). */
    /* Moved to ./games/dbd/config.js (DBD adapter, loaded above). */
    /* Moved to ./engine/theme.js (wiki engine bundle, loaded above). */
    /* Moved to ./engine/theme.js (wiki engine bundle, loaded above). */
    /* Moved to ./games/dbd/config.js (DBD adapter, loaded above). */
    const DEFAULT_PROGRESSION = {
      characters: {},
      perks: {},
      corePerkIds: [],
      cosmetics: [],
      challenges: [],
      achievements: {}
    };
    const DEFAULT_MATCH_PREFS = {
      lastRole: 'Survivor',
      lastCharacterId: null,
      lastBuildId: null,
      killerWinThreshold: 2
    };
    const APP_BACKUP_SCHEMA_VERSION = 1;
    const createWorldleHistogram = () => ({
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
    const createWorldleStatsBucket = () => ({
      played: 0,
      solved: 0,
      currentStreak: 0,
      bestStreak: 0,
      lastDailyDateKey: null,
      totalSolvedGuesses: 0,
      averageGuesses: 0,
      histogram: createWorldleHistogram()
    });
    const createWorldleHistoryShape = () => ({
      daily: [],
      practice: []
    });
    const createWorldleStateShape = () => ({
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
    /* Moved to ./engine/storage.js (wiki engine bundle, loaded above). */
    /* Moved to ./engine/storage.js (wiki engine bundle, loaded above). */
    const uuid = () => (crypto?.randomUUID ? crypto.randomUUID() : `id-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`);
    const parseTags = (val = '') => val.split(',').map(t => t.trim()).filter(Boolean);
    /* Moved to ./engine/storage.js (wiki engine bundle, loaded above). */
    /* Moved to ./engine/storage.js (wiki engine bundle, loaded above). */
    const normalizeNotesStore = (raw) => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
      return Object.entries(raw).reduce((acc, [key, value]) => {
        acc[key] = typeof value === 'string' ? value : '';
        return acc;
      }, {});
    };
    const normalizeGuessToken = (value = '') => (
      String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')
    );
    const normalizeCosmeticsEntries = (raw) => {
      if (!Array.isArray(raw)) return [];
      return raw
        .map((entry) => {
          if (!entry || typeof entry !== 'object') return null;
          if (!entry.id || !entry.name || !entry.baseCharacterId || !entry.baseCharacterName || !entry.baseCharacterType || !entry.groupKey || !entry.groupLabel || !entry.image) return null;
          const boundSlots = Array.isArray(entry.boundSlots)
            ? entry.boundSlots.filter(Boolean).map((slot) => String(slot))
            : [];
          const mode = String(entry.outfitLinkMode || '').toLowerCase();
          const isCharacterSwap = typeof entry.isCharacterSwap === 'boolean'
            ? entry.isCharacterSwap
            : mode === 'character_swap';
          const fallbackMode = isCharacterSwap
            ? 'character_swap'
            : (boundSlots.length >= 2 ? 'linked' : (boundSlots.length === 1 ? 'partially_linked' : 'unlinked'));
          const outfitLinkMode = ['character_swap', 'linked', 'partially_linked', 'unlinked'].includes(mode)
            ? mode
            : fallbackMode;
          const bindSummary = entry.bindSummary
            ? String(entry.bindSummary)
            : (boundSlots.length ? boundSlots.join(' + ') : '');
          const isLinkedSet = typeof entry.isLinkedSet === 'boolean'
            ? entry.isLinkedSet
            : (!isCharacterSwap && outfitLinkMode !== 'unlinked');
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
            aliases: Array.isArray(entry.aliases) ? entry.aliases.filter(Boolean).map((alias) => String(alias)) : [],
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
        })
        .filter(Boolean);
    };
    const normalizeCosmeticsCatalog = (raw) => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return { metadata: {}, characterSwaps: [], fullSets: [] };
      }
      return {
        metadata: raw.metadata && typeof raw.metadata === 'object' && !Array.isArray(raw.metadata) ? raw.metadata : {},
        characterSwaps: normalizeCosmeticsEntries(raw.characterSwaps),
        fullSets: normalizeCosmeticsEntries(raw.fullSets)
      };
    };
    const normalizeCommunityContentSnapshot = (raw) => {
      const emptyShape = {
        generatedAt: '',
        metadata: {},
        links: [],
        addonTierlist: { title: '', notes: [], killers: [], stats: {} },
        builds: { lastUpdateLabel: '', roles: { killers: [], survivors: [] }, perkDetails: { killers: [], survivors: [] }, stats: {} },
        characterInfo: { title: '', description: '', killers: [], survivors: [], perks: [], stats: {} },
        beginnerGuides: { title: '', description: '', entries: [], stats: {} },
        tierlists: { title: '', description: '', entries: [], stats: {} },
        guideVault: { title: '', description: '', entries: [], stats: {} }
      };
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return emptyShape;
      }
      return {
        ...emptyShape,
        ...raw,
        links: Array.isArray(raw.links) ? raw.links : [],
        addonTierlist: {
          ...emptyShape.addonTierlist,
          ...(raw.addonTierlist && typeof raw.addonTierlist === 'object' ? raw.addonTierlist : {}),
          notes: Array.isArray(raw.addonTierlist?.notes) ? raw.addonTierlist.notes : [],
          killers: Array.isArray(raw.addonTierlist?.killers)
            ? raw.addonTierlist.killers.map((killer) => ({
              ...killer,
              addons: Array.isArray(killer?.addons) ? killer.addons : [],
              combos: Array.isArray(killer?.combos) ? killer.combos : []
            }))
            : []
        },
        builds: {
          ...emptyShape.builds,
          ...(raw.builds && typeof raw.builds === 'object' ? raw.builds : {}),
          roles: {
            killers: Array.isArray(raw.builds?.roles?.killers) ? raw.builds.roles.killers : [],
            survivors: Array.isArray(raw.builds?.roles?.survivors) ? raw.builds.roles.survivors : []
          },
          perkDetails: {
            killers: Array.isArray(raw.builds?.perkDetails?.killers) ? raw.builds.perkDetails.killers : [],
            survivors: Array.isArray(raw.builds?.perkDetails?.survivors) ? raw.builds.perkDetails.survivors : []
          }
        },
        characterInfo: {
          ...emptyShape.characterInfo,
          ...(raw.characterInfo && typeof raw.characterInfo === 'object' ? raw.characterInfo : {}),
          killers: Array.isArray(raw.characterInfo?.killers) ? raw.characterInfo.killers : [],
          survivors: Array.isArray(raw.characterInfo?.survivors) ? raw.characterInfo.survivors : [],
          perks: Array.isArray(raw.characterInfo?.perks) ? raw.characterInfo.perks : []
        },
        beginnerGuides: {
          ...emptyShape.beginnerGuides,
          ...(raw.beginnerGuides && typeof raw.beginnerGuides === 'object' ? raw.beginnerGuides : {}),
          entries: Array.isArray(raw.beginnerGuides?.entries) ? raw.beginnerGuides.entries : []
        },
        tierlists: {
          ...emptyShape.tierlists,
          ...(raw.tierlists && typeof raw.tierlists === 'object' ? raw.tierlists : {}),
          entries: Array.isArray(raw.tierlists?.entries) ? raw.tierlists.entries : []
        },
        guideVault: {
          ...emptyShape.guideVault,
          ...(raw.guideVault && typeof raw.guideVault === 'object' ? raw.guideVault : {}),
          entries: Array.isArray(raw.guideVault?.entries) ? raw.guideVault.entries : []
        }
      };
    };
    /* Moved to ./engine/core.js (wiki engine bundle, loaded above). */
    /* Moved to ./engine/core.js (wiki engine bundle, loaded above). */
    const normalizeSettings = (raw) => {
      const next = raw && typeof raw === 'object' ? raw : {};
      const rest = { ...next };
      delete rest.highContrast;
      const navOptionIds = ALL_NAV_OPTIONS.map(opt => opt.id);
      const normalizedNavItems = rest.navItemsCustomized === true
        ? ensureOrderedSubset(rest.navItems, navOptionIds, DEFAULT_SETTINGS.navItems)
        : [...DEFAULT_SETTINGS.navItems];
      const needsDefaultMigration = rest.settingsVersion !== DEFAULT_SETTINGS.settingsVersion;
      return {
        ...DEFAULT_SETTINGS,
        ...rest,
        settingsVersion: DEFAULT_SETTINGS.settingsVersion,
        perkDescriptionMode: needsDefaultMigration && (!rest.perkDescriptionMode || rest.perkDescriptionMode === 'legacy') ? DEFAULT_SETTINGS.perkDescriptionMode : rest.perkDescriptionMode,
        ownedOnlyGlobal: Boolean(rest.ownedOnlyGlobal),
        navItemsCustomized: rest.navItemsCustomized === true,
        navItems: normalizedNavItems,
        progressionTabOrder: ensureOrderedFullSet(rest.progressionTabOrder, PROGRESSION_TABS, DEFAULT_SETTINGS.progressionTabOrder),
      };
    };
    const normalizeMatchPrefs = (raw) => {
      const next = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
      const threshold = Number(next.killerWinThreshold);
      return {
        ...DEFAULT_MATCH_PREFS,
        ...next,
        lastRole: String(next.lastRole || DEFAULT_MATCH_PREFS.lastRole).toLowerCase().includes('kill') ? 'Killer' : 'Survivor',
        lastCharacterId: next.lastCharacterId ? String(next.lastCharacterId) : null,
        lastBuildId: next.lastBuildId ? String(next.lastBuildId) : null,
        killerWinThreshold: Number.isFinite(threshold) && threshold >= 0 ? threshold : DEFAULT_MATCH_PREFS.killerWinThreshold
      };
    };
    const normalizeUiState = (raw) => {
      const next = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
      const allowedViews = new Set(['home', 'settings', ...ARTICLE_VIEWS, ...ALL_NAV_OPTIONS.map(option => option.id)]);
      const context = next.context && typeof next.context === 'object' && !Array.isArray(next.context) ? next.context : {};
      const normalizedContext = {};
      ['search', 'mode', 'tab', 'targetId', 'targetType', 'id', 'cosmeticId', 'scroll'].forEach((key) => {
        if (context[key]) normalizedContext[key] = String(context[key]);
      });
      return {
        view: allowedViews.has(next.view) ? next.view : 'home',
        context: normalizedContext,
        perkFilter: String(next.perkFilter || 'All'),
        perkSearch: String(next.perkSearch || '')
      };
    };
    const normalizePerkSnapshots = (snapshots = []) => {
      if (!Array.isArray(snapshots)) return [];
      return snapshots
        .map((perk) => {
          if (!perk) return null;
          const id = perk.id || null;
          const name = perk.name || '';
          if (!name && !id) return null;
          return {
            id,
            name: name || id,
            type: perk.type || '',
            owner: perk.owner || ''
          };
        })
        .filter(Boolean);
    };
    const normalizeProgression = (raw, legacyAchievements = {}) => {
      const next = raw && typeof raw === 'object' ? raw : {};
      const challenges = Array.isArray(next.challenges) ? next.challenges : [];
      return {
        ...DEFAULT_PROGRESSION,
        ...next,
        characters: next.characters && typeof next.characters === 'object' && !Array.isArray(next.characters) ? next.characters : {},
        perks: next.perks && typeof next.perks === 'object' && !Array.isArray(next.perks) ? next.perks : {},
        corePerkIds: Array.isArray(next.corePerkIds) ? [...new Set(next.corePerkIds.filter(Boolean))] : [],
        cosmetics: Array.isArray(next.cosmetics) ? next.cosmetics : [],
        challenges: challenges.map((challenge) => ({
          id: challenge?.id || uuid(),
          name: challenge?.name || '',
          description: challenge?.description || '',
          side: ['Killer', 'Survivor', 'any'].includes(challenge?.side) ? challenge.side : 'any',
          tags: Array.isArray(challenge?.tags) ? challenge.tags.filter(Boolean) : parseTags(challenge?.tags || ''),
          buildId: challenge?.buildId || '',
          status: ['planned', 'active', 'completed'].includes(challenge?.status) ? challenge.status : 'planned'
        })),
        achievements: {
          ...(legacyAchievements && typeof legacyAchievements === 'object' ? legacyAchievements : {}),
          ...(next.achievements && typeof next.achievements === 'object' && !Array.isArray(next.achievements) ? next.achievements : {})
        }
      };
    };
    const normalizeWorldleHistogram = (raw) => {
      const fallback = createWorldleHistogram();
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fallback;
      return Object.keys(fallback).reduce((acc, key) => {
        acc[key] = Number(raw[key]) || 0;
        return acc;
      }, {});
    };
    const normalizeWorldleStatsBucket = (raw) => {
      const next = raw && typeof raw === 'object' ? raw : {};
      const solved = Number(next.solved) || 0;
      const totalSolvedGuesses = Number(next.totalSolvedGuesses) || 0;
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
    const normalizeWorldleEntry = (entry) => {
      if (!entry || typeof entry !== 'object') return null;
      return {
        ...entry,
        guesses: Array.isArray(entry.guesses) ? entry.guesses : [],
        queue: Array.isArray(entry.queue) ? entry.queue : [],
        solvedIds: Array.isArray(entry.solvedIds) ? entry.solvedIds : [],
        revealedClues: Number(entry.revealedClues) || 0,
        emojiVariantId: entry.emojiVariantId || null,
        emojiClueSetId: entry.emojiClueSetId || null,
        emojiPermutation: Array.isArray(entry.emojiPermutation) && entry.emojiPermutation.length === 3
          ? entry.emojiPermutation.map((value) => Number(value) || 0)
          : null,
        emojiDisplay: Array.isArray(entry.emojiDisplay)
          ? entry.emojiDisplay.map((value) => String(value || '')).slice(0, 3)
          : [],
        completedAt: entry.completedAt || null,
        failed: entry.failed === true,
        solved: entry.solved === true
      };
    };
    const normalizeWorldleState = (raw) => {
      const base = createWorldleStateShape();
      const next = raw && typeof raw === 'object' ? raw : {};
      WORLDLE_MODES.forEach((mode) => {
        base.daily[mode] = normalizeWorldleEntry(next.daily?.[mode]);
        base.practice[mode] = normalizeWorldleEntry(next.practice?.[mode]);
        base.stats[mode] = {
          daily: normalizeWorldleStatsBucket(next.stats?.[mode]?.daily),
          practice: normalizeWorldleStatsBucket(next.stats?.[mode]?.practice)
        };
        base.history[mode] = {
          daily: Array.isArray(next.history?.[mode]?.daily) ? next.history[mode].daily.slice(0, 30) : [],
          practice: Array.isArray(next.history?.[mode]?.practice) ? next.history[mode].practice.slice(0, 30) : []
        };
      });
      return base;
    };
    const createWebsiteBackupPayload = ({
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
    }) => ({
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
    });
    const summarizeWebsiteBackupPayload = (payload) => {
      const data = payload?.data && typeof payload.data === 'object' ? payload.data : {};
      const progression = normalizeProgression(data.progression);
      const worldle = normalizeWorldleState(data.worldle);
      const worldleGamesPlayed = WORLDLE_MODES.reduce((total, mode) => {
        const stats = worldle.stats?.[mode];
        return total
          + (Number(stats?.daily?.played) || 0)
          + (Number(stats?.practice?.played) || 0);
      }, 0);
      const ownedCharacters = Object.values(progression.characters || {}).filter((entry) => entry?.owned).length;
      return {
        schemaVersion: Number(payload?.schemaVersion) || 0,
        exportedAt: payload?.exportedAt || '',
        siteVersion: payload?.meta?.siteVersion || payload?.meta?.appVersion || '',
        gameVersion: payload?.meta?.gameVersion || '',
        builds: Array.isArray(data.builds) ? data.builds.length : 0,
        matches: Array.isArray(data.matches) ? data.matches.length : 0,
        notes: Object.keys(normalizeNotesStore(data.notes)).length,
        ownedCharacters,
        challenges: Array.isArray(progression.challenges) ? progression.challenges.length : 0,
        worldleGamesPlayed
      };
    };
    const parseWebsiteBackupPayload = (rawText) => {
      const raw = typeof rawText === 'string' ? rawText.trim() : '';
      if (!raw) throw new Error('Paste a backup file before restoring.');
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (error) {
        throw new Error('Backup file content is invalid.');
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Backup file format is invalid.');
      }
      const looksLikeDirectData =
        parsed.data === undefined
        && ['settings', 'builds', 'matches', 'progression', 'notes', 'worldle', 'lastContext'].some((key) => key in parsed);
      const payload = looksLikeDirectData
        ? {
            schemaVersion: 0,
            exportedAt: '',
            meta: {},
            data: parsed
          }
        : parsed;
      if (!payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data)) {
        throw new Error('Backup file is missing required data.');
      }
      const backupSchemaVersion = Number(payload?.schemaVersion) || 0;
      if (backupSchemaVersion > APP_BACKUP_SCHEMA_VERSION) {
        throw new Error(`This backup was created by a newer version (format v${backupSchemaVersion}). Please reload the page to get the latest version, then restore again.`);
      }
      return {
        payload,
        summary: summarizeWebsiteBackupPayload(payload)
      };
    };
    const buildBackupFilename = (payload) => {
      const stamp = String(payload?.exportedAt || new Date().toISOString())
        .replace(/[:]/g, '-')
        .replace(/\..+$/, '');
      const version = payload?.meta?.siteVersion || payload?.meta?.appVersion || 'backup';
      return `the-entity-wiki-${version}-${stamp}.json`;
    };
    const downloadTextFile = (filename, text, mime = 'application/json') => {
      const blob = new Blob([text], { type: mime });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    };
    const buildDataLookups = ({ killers = [], survivors = [], perks = [], maps = [], builds = [] }) => {
      const charactersById = {};
      [...killers, ...survivors].forEach((character) => {
        if (!character?.id) return;
        charactersById[character.id] = {
          ...character,
          role: killers.some(killer => killer.id === character.id) ? 'Killer' : 'Survivor'
        };
      });
      const perksById = {};
      (perks || []).forEach((perk) => {
        if (perk?.id) perksById[perk.id] = perk;
      });
      const mapsById = {};
      const mapNameLookup = {};
      (maps || []).forEach((map) => {
        if (map?.id) mapsById[map.id] = map;
        if (map?.name) mapNameLookup[map.name.toLowerCase()] = map;
      });
      const buildsById = {};
      (builds || []).forEach((build) => {
        if (build?.id) buildsById[build.id] = build;
      });
      return { charactersById, perksById, mapsById, mapNameLookup, buildsById };
    };
    const resolveOwnedState = ({ progression, killers = [], survivors = [], perks = [] }) => {
      const characterStates = progression?.characters || {};
      const ownedCharacterIds = new Set(
        [...killers, ...survivors]
          .filter(character => characterStates?.[character.id]?.owned)
          .map(character => character.id)
      );
      const characterNameToId = {};
      [...killers, ...survivors].forEach((character) => {
        characterNameToId[character.name] = character.id;
      });
      const ownedPerkIds = new Set();
      (perks || []).forEach((perk) => {
        if (!perk.owner || perk.owner === 'All Killers' || perk.owner === 'All Survivors') {
          ownedPerkIds.add(perk.id);
          return;
        }
        const ownerId = characterNameToId[perk.owner];
        const ownerState = ownerId ? characterStates?.[ownerId] : null;
        const prestige = Number(ownerState?.prestige) || 0;
        if (ownerId && ownedCharacterIds.has(ownerId) && prestige >= 1) {
          ownedPerkIds.add(perk.id);
        }
      });
      return {
        ownedCharacterIds,
        ownedPerkIds,
        isCharacterOwned: (id) => ownedCharacterIds.has(id),
        isPerkOwned: (id) => ownedPerkIds.has(id),
        getCharacterPrestige: (id) => Number(characterStates?.[id]?.prestige) || 0,
        getDerivedPerkTier: (id) => {
          const perk = (perks || []).find(entry => entry.id === id);
          if (!perk) return 0;
          if (!perk.owner || perk.owner === 'All Killers' || perk.owner === 'All Survivors') return 3;
          const ownerId = characterNameToId[perk.owner];
          if (!ownerId || !ownedCharacterIds.has(ownerId)) return 0;
          return Math.min(3, Number(characterStates?.[ownerId]?.prestige) || 0);
        },
        isAddonOwned: (addon) => {
          if (!addon) return false;
          if (addon.role === 'killer') {
            const ownerId = characterNameToId[addon.killerName];
            return ownerId ? ownedCharacterIds.has(ownerId) : false;
          }
          return true;
        }
      };
    };
    const WORLDLE_METADATA = typeof WORLDLE_DATA === 'undefined' ? { aliases: {}, genders: {}, emojiClues: {} } : WORLDLE_DATA;
    const WORLDLE_MODE_META = {
      classic: { label: 'Classic', queue: 'flex', accent: '#fafafa', description: 'Guess the killer from stats, release clues, and comparisons.' },
      emoji: { label: 'Emoji', queue: 'flex', accent: '#d4d4d8', description: 'Decode the clues to identify the killer.' },
      survivorPerk: { label: 'Survivor Perk', queue: 'flex', accent: '#a1a1aa', description: 'Identify a survivor perk from its icon.' },
      killerPerk: { label: 'Killer Perk', queue: 'flex', accent: '#fafafa', description: 'Identify a killer perk from its icon.' },
      teachables: { label: 'Teachables', queue: 'flex', accent: '#e4e4e7', description: 'Guess the three killer teachable perks for the featured killer.' }
    };
    const getWorldleDateKey = (date = new Date()) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };
    const shiftWorldleDateKey = (dateKey, deltaDays) => {
      const parts = String(dateKey || '').split('-').map(Number);
      if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;
      const shifted = new Date(parts[0], parts[1] - 1, parts[2]);
      shifted.setDate(shifted.getDate() + deltaDays);
      return getWorldleDateKey(shifted);
    };
    const hashString = (value = '') => {
      let hash = 2166136261;
      for (let i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
      }
      return Math.abs(hash >>> 0);
    };
    const pickDeterministicEntry = (items = [], seed = '') => {
      if (!Array.isArray(items) || items.length === 0) return null;
      return items[hashString(seed) % items.length];
    };
    const shuffleBySeed = (items = [], seed = '') => {
      const copy = [...items];
      let localSeed = hashString(seed) || 1;
      for (let i = copy.length - 1; i > 0; i -= 1) {
        localSeed = (localSeed * 1664525 + 1013904223) % 4294967296;
        const j = localSeed % (i + 1);
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };
    const WORLDLE_EMOJI_PERMUTATIONS = [
      [0, 1, 2],
      [0, 2, 1],
      [1, 0, 2],
      [1, 2, 0],
      [2, 0, 1],
      [2, 1, 0]
    ];
    const normalizeWorldleEmojiClueSets = (rawSets = []) => {
      if (Array.isArray(rawSets) && rawSets.every(entry => typeof entry === 'string')) {
        return rawSets.length >= 3 ? [{ id: 'legacy-1', emojis: rawSets.slice(0, 3) }] : [];
      }
      if (!Array.isArray(rawSets)) return [];
      return rawSets
        .map((entry, index) => {
          if (Array.isArray(entry) && entry.every(item => typeof item === 'string')) {
            return entry.length >= 3 ? { id: `set-${index + 1}`, emojis: entry.slice(0, 3) } : null;
          }
          if (!entry || typeof entry !== 'object') return null;
          const emojis = Array.isArray(entry.emojis)
            ? entry.emojis.map((item) => String(item || '')).filter(Boolean).slice(0, 3)
            : [];
          if (emojis.length < 3) return null;
          return {
            id: entry.id || `set-${index + 1}`,
            emojis
          };
        })
        .filter(Boolean);
    };
    const buildWorldleEmojiVariantId = ({ targetId, clueSetId, permutation = [0, 1, 2] }) => (
      `${targetId}:${clueSetId}:${permutation.join('')}`
    );
    const buildWorldleEmojiVariant = ({ target, clueSet, permutation = [0, 1, 2] }) => {
      if (!target || !clueSet) return null;
      const ordered = Array.isArray(permutation) && permutation.length === 3 ? permutation.map((value) => Number(value) || 0) : [0, 1, 2];
      const displayEmojis = ordered.map((index) => clueSet.emojis[index] || '❔');
      return {
        variantId: buildWorldleEmojiVariantId({ targetId: target.id, clueSetId: clueSet.id, permutation: ordered }),
        targetId: target.id,
        clueSetId: clueSet.id,
        permutation: ordered,
        displayEmojis
      };
    };
    const buildWorldleEmojiVariantCatalog = (killerCatalog = []) => (
      killerCatalog.flatMap((target) => (
        (target.emojiSets || []).flatMap((clueSet) => (
          WORLDLE_EMOJI_PERMUTATIONS
            .map((permutation) => buildWorldleEmojiVariant({ target, clueSet, permutation }))
            .filter(Boolean)
        ))
      ))
    );
    const resolveWorldleEmojiVariantFromSession = ({ target, session, variantsById = {} }) => {
      if (!target || !session) return null;
      if (session.emojiVariantId && variantsById[session.emojiVariantId]) {
        return variantsById[session.emojiVariantId];
      }
      const clueSet = (target.emojiSets || []).find((entry) => entry.id === session.emojiClueSetId) || (target.emojiSets || [])[0];
      if (!clueSet) return null;
      return buildWorldleEmojiVariant({
        target,
        clueSet,
        permutation: Array.isArray(session.emojiPermutation) && session.emojiPermutation.length === 3
          ? session.emojiPermutation
          : [0, 1, 2]
      });
    };
    const withWorldleEmojiVariantSession = ({ session, target, seed = '', forceVariantId = null, variantsById = {} }) => {
      if (!session) return null;
      let variant = forceVariantId ? variantsById[forceVariantId] : null;
      if (!variant && target) {
        const clueSet = pickDeterministicEntry(target.emojiSets || [], `${seed}:set:${target.id}`) || (target.emojiSets || [])[0];
        const permutation = pickDeterministicEntry(WORLDLE_EMOJI_PERMUTATIONS, `${seed}:perm:${target.id}:${clueSet?.id || 'set-1'}`) || WORLDLE_EMOJI_PERMUTATIONS[0];
        variant = buildWorldleEmojiVariant({ target, clueSet, permutation });
      }
      if (!variant) {
        return {
          ...session,
          emojiVariantId: null,
          emojiClueSetId: null,
          emojiPermutation: [0, 1, 2],
          emojiDisplay: []
        };
      }
      return {
        ...session,
        targetId: variant.targetId,
        emojiVariantId: variant.variantId,
        emojiClueSetId: variant.clueSetId,
        emojiPermutation: [...variant.permutation],
        emojiDisplay: [...variant.displayEmojis]
      };
    };
    const buildWorldleAliasMap = (killer) => {
      const aliases = new Set([
        killer.name,
        killer.name.replace(/^The\s+/, ''),
        killer.realName || '',
        ...((WORLDLE_METADATA.aliases || {})[killer.name] || [])
      ]);
      return [...aliases]
        .map(alias => alias && String(alias).trim())
        .filter(Boolean);
    };
    const buildWorldleKillerCatalog = (killers = []) => killers.map((killer) => {
      const stats = KILLER_STATS[killer.name] || {};
      const release = RELEASE_INFO_MAP[killer.name] || {};
      const aliases = buildWorldleAliasMap(killer);
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
    const buildWorldlePerkCatalog = (perks = [], type = 'Survivor') => (
      perks
        .filter(perk => perk.type === type)
        .map((perk) => {
          const aliasTokens = [...new Set([perk.name].concat(perk.aliases || []).map(label => normalizeGuessToken(label)).filter(Boolean))];
          return {
            id: perk.id,
            name: perk.name,
            owner: perk.owner || '',
            type: perk.type,
            image: perk.image,
            aliasTokens
          };
        })
    );
    const buildTeachableCatalog = (killers = [], perks = []) => (
      killers.map((killer) => ({
        id: killer.id,
        name: killer.name,
        image: killer.image,
        aliases: buildWorldleAliasMap(killer),
        aliasTokens: buildWorldleAliasMap(killer).map(alias => normalizeGuessToken(alias)),
        teachables: perks
          .filter(perk => perk.owner === killer.name)
          .map(perk => ({ id: perk.id, name: perk.name, image: perk.image }))
          .sort((a, b) => a.name.localeCompare(b.name))
      }))
      .filter(entry => entry.teachables.length === 3)
    );
    const histogramBucketKey = (guessCount) => {
      const n = Number(guessCount) || 0;
      if (n <= 0) return '1';
      if (n >= 11) return '11+';
      return String(n);
    };
    const recordWorldleResult = (state, { mode, queue, result }) => {
      const next = normalizeWorldleState(state);
      const bucket = next.stats[mode]?.[queue] || createWorldleStatsBucket();
      bucket.played += 1;
      if (result.solved) {
        bucket.solved += 1;
        bucket.totalSolvedGuesses += result.guessCount;
        bucket.averageGuesses = Number((bucket.totalSolvedGuesses / bucket.solved).toFixed(2));
        bucket.histogram[histogramBucketKey(result.guessCount)] += 1;
      }
      if (queue === 'daily') {
        const todayKey = getWorldleDateKey();
        const lastKey = bucket.lastDailyDateKey || null;
        if (result.solved && lastKey && lastKey !== todayKey && lastKey !== shiftWorldleDateKey(todayKey, -1)) {
          bucket.currentStreak = 0;
        }
        bucket.currentStreak = result.solved ? bucket.currentStreak + 1 : 0;
        bucket.bestStreak = Math.max(bucket.bestStreak, bucket.currentStreak);
        bucket.lastDailyDateKey = todayKey;
      }
      next.stats[mode][queue] = bucket;
      const history = Array.isArray(next.history[mode]?.[queue]) ? next.history[mode][queue] : [];
      next.history[mode][queue] = [result, ...history].slice(0, 30);
      return next;
    };
    const createDailyWorldleSession = (mode, catalog = [], dateKey = getWorldleDateKey(), options = {}) => {
      const target = pickDeterministicEntry(catalog, `${mode}:${dateKey}`);
      const session = {
        dateKey,
        targetId: target?.id || null,
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
          seed: `${mode}:${dateKey}`,
          variantsById: options.emojiVariantsById || {}
        });
      }
      return session;
    };
    const createPracticeWorldleSession = (mode, catalog = [], seedKey = getWorldleDateKey(), round = 0, options = {}) => {
      if (mode === 'emoji') {
        const queue = shuffleBySeed((options.emojiVariants || []).map((item) => item.variantId), `${mode}:practice:${seedKey}:${round}`);
        const activeVariantId = queue[0] || null;
        const activeVariant = activeVariantId ? options.emojiVariantsById?.[activeVariantId] : null;
        const target = activeVariant ? catalog.find((entry) => entry.id === activeVariant.targetId) : null;
        return withWorldleEmojiVariantSession({
          session: {
            seedKey,
            round,
            queue,
            targetId: activeVariant?.targetId || null,
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
      const queue = shuffleBySeed(catalog.map(item => item.id), `${mode}:practice:${seedKey}:${round}`);
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
    const ensureWorldleSession = ({ state, mode, queue, catalog = [], dateKey = getWorldleDateKey(), options = {} }) => {
      const next = normalizeWorldleState(state);
      if (queue === 'daily') {
        const existing = next.daily[mode];
        const hasEmojiVariant = mode !== 'emoji' || (existing?.emojiVariantId && Array.isArray(existing?.emojiDisplay) && existing.emojiDisplay.length === 3);
        if (existing && existing.dateKey === dateKey && existing.targetId && hasEmojiVariant) {
          return { state: next, session: existing };
        }
        const created = createDailyWorldleSession(mode, catalog, dateKey, options);
        next.daily[mode] = created;
        return { state: next, session: created };
      }
      const existing = next.practice[mode];
      const hasPracticeEmojiVariant = mode !== 'emoji' || existing?.emojiVariantId;
      if (existing && existing.targetId && hasPracticeEmojiVariant) {
        return { state: next, session: existing };
      }
      const created = createPracticeWorldleSession(mode, catalog, dateKey, existing?.round || 0, options);
      next.practice[mode] = created;
      return { state: next, session: created };
    };
    const advancePracticeWorldleSession = ({ mode, state, catalog = [], dateKey = getWorldleDateKey(), options = {} }) => {
      const next = normalizeWorldleState(state);
      const current = next.practice[mode] || createPracticeWorldleSession(mode, catalog, dateKey, 0, options);
      if (mode === 'emoji') {
        let queue = Array.isArray(current.queue) ? current.queue.filter(id => id !== current.emojiVariantId) : [];
        let round = Number(current.round) || 0;
        if (queue.length === 0) {
          round += 1;
          queue = shuffleBySeed((options.emojiVariants || []).map((item) => item.variantId), `${mode}:practice:${dateKey}:${round}`);
        }
        const activeVariantId = queue[0] || null;
        const activeVariant = activeVariantId ? options.emojiVariantsById?.[activeVariantId] : null;
        const target = activeVariant ? catalog.find((entry) => entry.id === activeVariant.targetId) : null;
        next.practice[mode] = withWorldleEmojiVariantSession({
          session: {
            seedKey: dateKey,
            round,
            queue,
            targetId: activeVariant?.targetId || null,
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
      let queue = Array.isArray(current.queue) ? current.queue.filter(id => id !== current.targetId) : [];
      let round = Number(current.round) || 0;
      if (queue.length === 0) {
        round += 1;
        queue = shuffleBySeed(catalog.map(item => item.id), `${mode}:practice:${dateKey}:${round}`);
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
    const buildWorldleResultEntry = ({ mode, queue, target, guessCount, solved, dateKey, session, emojiVariant }) => ({
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
        variantId: emojiVariant?.variantId || session?.emojiVariantId || null,
        clueSetId: emojiVariant?.clueSetId || session?.emojiClueSetId || null,
        permutation: Array.isArray(emojiVariant?.permutation)
          ? [...emojiVariant.permutation]
          : (Array.isArray(session?.emojiPermutation) ? [...session.emojiPermutation] : []),
        displayEmojis: Array.isArray(emojiVariant?.displayEmojis)
          ? [...emojiVariant.displayEmojis]
          : (Array.isArray(session?.emojiDisplay) ? [...session.emojiDisplay] : [])
      } : null,
      guessCount,
      solved,
      failed: !solved,
      completedAt: new Date().toISOString()
    });
    const resolveWorldleGuess = (catalog = [], input = '') => {
      const token = normalizeGuessToken(input);
      if (!token) return null;
      return catalog.find(entry => Array.isArray(entry.aliasTokens) && entry.aliasTokens.includes(token)) || null;
    };
    const getWorldleCategoryPrefixToken = (label = '') => {
      const parts = String(label || '').split(':');
      if (parts.length < 2) return '';
      return normalizeGuessToken(parts[0]);
    };
    const getWorldleGuessEntityLabel = (mode = 'classic') => (
      mode === 'survivorPerk' || mode === 'killerPerk' || mode === 'teachables' ? 'perk' : 'killer'
    );
    const getLevenshteinDistance = (a = '', b = '') => {
      if (a === b) return 0;
      if (!a) return b.length;
      if (!b) return a.length;
      const matrix = Array.from({ length: a.length + 1 }, (_, rowIndex) => [rowIndex]);
      for (let columnIndex = 0; columnIndex <= b.length; columnIndex += 1) {
        matrix[0][columnIndex] = columnIndex;
      }
      for (let rowIndex = 1; rowIndex <= a.length; rowIndex += 1) {
        for (let columnIndex = 1; columnIndex <= b.length; columnIndex += 1) {
          const cost = a[rowIndex - 1] === b[columnIndex - 1] ? 0 : 1;
          matrix[rowIndex][columnIndex] = Math.min(
            matrix[rowIndex - 1][columnIndex] + 1,
            matrix[rowIndex][columnIndex - 1] + 1,
            matrix[rowIndex - 1][columnIndex - 1] + cost
          );
        }
      }
      return matrix[a.length][b.length];
    };
    const getWorldleGuessSuggestions = (catalog = [], input = '', limit = 3) => {
      const token = normalizeGuessToken(input);
      if (!token || token.length < 2) return [];
      const categoryPrefixMatches = catalog
        .filter((entry) => getWorldleCategoryPrefixToken(entry.name) === token)
        .sort((a, b) => a.name.localeCompare(b.name));
      if (categoryPrefixMatches.length > 1) {
        return categoryPrefixMatches.slice(0, limit).map((entry) => ({
          entry,
          score: 0,
          distance: 0,
          leadingPrefix: true,
          reversePrefix: false,
          prefix: true,
          contains: false
        }));
      }
      return catalog
        .map((entry) => {
          const aliasTokens = Array.isArray(entry.aliasTokens) && entry.aliasTokens.length
            ? entry.aliasTokens
            : [normalizeGuessToken(entry.name)];
          let best = null;
          aliasTokens.forEach((aliasToken) => {
            if (!aliasToken) return;
            const leadingPrefix = aliasToken.startsWith(token);
            const reversePrefix = !leadingPrefix && token.startsWith(aliasToken);
            const prefix = leadingPrefix || reversePrefix;
            const contains = !prefix && (aliasToken.includes(token) || token.includes(aliasToken));
            const distance = getLevenshteinDistance(token, aliasToken);
            const threshold = Math.max(1, Math.min(3, Math.floor(Math.max(token.length, aliasToken.length) / 4)));
            if (!prefix && !contains && distance > threshold) return;
            const score = distance + (Math.abs(aliasToken.length - token.length) * 0.15) - (leadingPrefix ? 1 : 0) - (contains ? 0.35 : 0) + (reversePrefix ? 0.45 : 0);
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
        })
        .filter(Boolean)
        .sort((a, b) => {
          if (a.prefix !== b.prefix) return a.prefix ? -1 : 1;
          if (a.contains !== b.contains) return a.contains ? -1 : 1;
          if (a.distance !== b.distance) return a.distance - b.distance;
          if (a.score !== b.score) return a.score - b.score;
          return a.entry.name.localeCompare(b.entry.name);
        })
        .filter((candidate, index, array) => index === array.findIndex(other => other.entry.id === candidate.entry.id))
        .slice(0, limit);
    };
    const resolveWorldleGuessAttempt = (catalog = [], input = '') => {
      const exact = resolveWorldleGuess(catalog, input);
      if (exact) {
        return {
          entry: exact,
          autoCorrected: false,
          correctedName: exact.name,
          suggestions: []
        };
      }
      const token = normalizeGuessToken(input);
      const suggestions = getWorldleGuessSuggestions(catalog, input, 3);
      if (!suggestions.length) {
        return {
          entry: null,
          autoCorrected: false,
          correctedName: '',
          suggestions: []
        };
      }
      const best = suggestions[0];
      const nextBest = suggestions[1] || null;
      const leadingPrefixMatches = suggestions.filter(candidate => candidate.leadingPrefix).length;
      const safeToAutoCorrect = token.length >= 3 && (
        (best.leadingPrefix && leadingPrefixMatches === 1 && (!nextBest || !nextBest.leadingPrefix || (best.distance + 1 < nextBest.distance)))
        || (best.distance <= 1 && (!nextBest || best.distance < nextBest.distance))
        || (best.distance <= 2 && !best.contains && (!nextBest || (best.distance + 2 <= nextBest.distance)))
      );
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
    const countWorldleWrongGuesses = (session) => (
      Array.isArray(session?.guesses) ? session.guesses.filter(guess => guess && guess.correct === false && guess.duplicate !== true).length : 0
    );
    const createPerkSnapshotsFromBuild = (build, perksById = {}) => {
      if (!build || !Array.isArray(build.perks)) return [];
      return build.perks
        .map((perk) => {
          const resolved = (perk?.id && perksById[perk.id]) || null;
          const id = resolved?.id || perk?.id || null;
          const name = resolved?.name || perk?.name || '';
          if (!name && !id) return null;
          return {
            id,
            name: name || id,
            type: resolved?.type || '',
            owner: resolved?.owner || ''
          };
        })
        .filter(Boolean);
    };
    const normalizeMatchRecord = (match, lookups = {}) => {
      if (!match || typeof match !== 'object') return null;
      const charactersById = lookups.charactersById || {};
      const mapsById = lookups.mapsById || {};
      const mapNameLookup = lookups.mapNameLookup || {};
      const buildsById = lookups.buildsById || {};
      const perksById = lookups.perksById || {};
      const linkedCharacter = match.characterId ? charactersById[match.characterId] : null;
      const matchedMap = (match.mapId && mapsById[match.mapId]) || (match.mapNameSnapshot && mapNameLookup[(match.mapNameSnapshot || '').toLowerCase()]) || (match.map && mapNameLookup[(match.map || '').toLowerCase()]) || null;
      const linkedBuild = match.buildId ? buildsById[match.buildId] : null;
      const mapNameSnapshot = matchedMap?.name || match.mapNameSnapshot || match.map || '';
      const mapId = matchedMap?.id || match.mapId || null;
      return {
        ...match,
        id: match.id || uuid(),
        role: roleFromString(match.role),
        buildId: match.buildId || '',
        characterId: match.characterId || '',
        characterName: linkedCharacter?.name || match.characterName || match.characterSnapshot?.name || '',
        mapId,
        map: mapNameSnapshot,
        mapNameSnapshot,
        characterSnapshot: {
          id: linkedCharacter?.id || match.characterSnapshot?.id || match.characterId || null,
          name: linkedCharacter?.name || match.characterSnapshot?.name || match.characterName || 'Any',
          role: linkedCharacter?.role || roleFromString(match.characterSnapshot?.role || match.role)
        },
        buildSnapshot: {
          id: linkedBuild?.id || match.buildSnapshot?.id || match.buildId || null,
          name: linkedBuild?.name || match.buildSnapshot?.name || ''
        },
        perkSnapshots: Array.isArray(match.perkSnapshots) && match.perkSnapshots.length > 0
          ? normalizePerkSnapshots(match.perkSnapshots)
          : [],
        createdAt: match.createdAt || match.date || new Date().toISOString(),
        updatedAt: match.updatedAt || match.date || new Date().toISOString()
      };
    };
    const normalizeMatchRecords = (records, lookups = {}) => (
      Array.isArray(records)
        ? records.map(record => normalizeMatchRecord(record, lookups)).filter(Boolean)
        : []
    );
    const createMatchSnapshot = (form, lookups = {}) => {
      const charactersById = lookups.charactersById || {};
      const mapsById = lookups.mapsById || {};
      const buildsById = lookups.buildsById || {};
      const perksById = lookups.perksById || {};
      const selectedCharacter = form.characterId ? charactersById[form.characterId] : null;
      const selectedMap = form.mapId ? mapsById[form.mapId] : null;
      const selectedBuild = form.buildId ? buildsById[form.buildId] : null;
      const preservedPerkSnapshots = normalizePerkSnapshots(form.perkSnapshots);
      return {
        ...form,
        role: roleFromString(form.role),
        characterName: selectedCharacter?.name || form.characterName || '',
        mapId: selectedMap?.id || form.mapId || null,
        map: selectedMap?.name || form.mapNameSnapshot || form.map || '',
        mapNameSnapshot: selectedMap?.name || form.mapNameSnapshot || form.map || '',
        characterSnapshot: {
          id: selectedCharacter?.id || form.characterSnapshot?.id || form.characterId || null,
          name: selectedCharacter?.name || form.characterSnapshot?.name || form.characterName || 'Any',
          role: selectedCharacter?.role || roleFromString(form.characterSnapshot?.role || form.role)
        },
        buildSnapshot: {
          id: selectedBuild?.id || form.buildSnapshot?.id || form.buildId || null,
          name: selectedBuild?.name || form.buildSnapshot?.name || ''
        },
        perkSnapshots: selectedBuild
          ? createPerkSnapshotsFromBuild(selectedBuild, perksById)
          : preservedPerkSnapshots
      };
    };
    const isMatchWin = (match, prefs = {}) => {
      const killThreshold = prefs?.killerWinThreshold ?? 2;
      if (match.role === 'Killer') return (Number(match.kills) || 0) >= killThreshold && !match.dc;
      const outcome = (match.outcome || '').toLowerCase();
      return outcome.includes('escape');
    };
    const getMatchCharacterLabel = (match) => match?.characterSnapshot?.name || match?.characterName || 'Any';
    const getMatchBuildLabel = (match) => match?.buildSnapshot?.name || 'Unlinked Build';
    const getMatchMapLabel = (match) => match?.mapNameSnapshot || match?.map || 'Unknown Map';
    const formatDate = (iso) => {
      if (!iso) return '';
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    const roleFromString = (role) => role && role.toLowerCase().includes('kill') ? 'Killer' : 'Survivor';
    /* Moved to ./engine/device.js (wiki engine bundle, loaded above). */
    /* Moved to ./engine/device.js (wiki engine bundle, loaded above). */
    /* Moved to ./engine/device.js (wiki engine bundle, loaded above). */
    /* Moved to ./engine/device.js (wiki engine bundle, loaded above). */
    /* Moved to ./engine/articles.js (wiki engine bundle, loaded above). */
    /* Moved to ./engine/articles.js (wiki engine bundle, loaded above). */
    /* Moved to ./games/dbd/config.js (DBD adapter, loaded above). */
    const MAP_LAYOUTS = {
      "Coal Tower": [
        { path: "map_layouts_hens/coal_tower.webp", label: "Variation I" },
        { path: "map_layouts_hens/coal_tower_ii.webp", label: "Variation II" }
      ],
      "Groaning Storehouse": [
        { path: "map_layouts_hens/groaning_storehouse.webp", label: "Variation I" },
        { path: "map_layouts_hens/groaning_storehouse_ii.webp", label: "Variation II" }
      ],
      "Ironworks of Misery": [
        { path: "map_layouts_hens/ironworks_of_misery.webp", label: "Variation I" },
        { path: "map_layouts_hens/ironworks_of_misery_ii.webp", label: "Variation II" }
      ],
      "Shelter Woods": [
        { path: "map_layouts_hens/shelter_woods.webp", label: "Variation I" },
        { path: "map_layouts_hens/shelter_woods_ii.webp", label: "Variation II" }
      ],
      "Suffocation Pit": [
        { path: "map_layouts_hens/suffocation_pit.webp", label: "Variation I" },
        { path: "map_layouts_hens/suffocation_pit_ii.webp", label: "Variation II" }
      ],
      "Azarov's Resting Place": [{ path: "map_layouts_hens/azarovs_resting_place.webp", label: "" }],
      "Blood Lodge": [{ path: "map_layouts_hens/blood_lodge.webp", label: "" }],
      "Gas Heaven": [{ path: "map_layouts_hens/gas_heaven.webp", label: "" }],
      "Wreckers' Yard": [{ path: "map_layouts_hens/wreckers.webp", label: "" }],
      "Wretched Shop": [{ path: "map_layouts_hens/wretched_shop.webp", label: "" }],
      "Fractured Cowshed": [{ path: "map_layouts_hens/fractured_cowshed.webp", label: "" }],
      "Rancid Abattoir": [{ path: "map_layouts_hens/rancid_abbatoir.webp", label: "" }],
      "Rotten Fields": [{ path: "map_layouts_hens/rotten_fields.webp", label: "" }],
      "The Thompson House": [{ path: "map_layouts_hens/the_thompson_house.webp", label: "" }],
      "Torment Creek": [{ path: "map_layouts_hens/torment_creek.webp", label: "" }],
      "Disturbed Ward": [{ path: "map_layouts_hens/disturbed_ward.webp", label: "" }],
      "Father Campbell's Chapel": [{ path: "map_layouts_hens/father_campbells_chapel.webp", label: "" }],
      "Grim Pantry": [{ path: "map_layouts_hens/grim_pantry.webp", label: "" }],
      "The Pale Rose": [{ path: "map_layouts_hens/pale_rose.webp", label: "" }],
      "Badham Preschool I": [{ path: "map_layouts_hens/preschool1.webp", label: "" }],
      "Badham Preschool II": [{ path: "map_layouts_hens/preschool2.webp", label: "" }],
      "Badham Preschool III": [{ path: "map_layouts_hens/preschool3.webp", label: "" }],
      "Badham Preschool IV": [{ path: "map_layouts_hens/preschool4.webp", label: "" }],
      "Badham Preschool V": [{ path: "map_layouts_hens/preschool5.webp", label: "" }],
      "Lampkin Lane": [{ path: "map_layouts_hens/haddonfield.webp", label: "" }],
      "The Game": [{ path: "map_layouts_hens/the_game.webp", label: "" }],
      "Treatment Theatre": [{ path: "map_layouts_hens/lerys.webp", label: "" }],
      "Treatment Theater": [{ path: "map_layouts_hens/lerys.webp", label: "" }],
      "Mount Ormond Resort": [
        { path: "map_layouts_hens/ormond.webp", label: "Variation I" },
        { path: "map_layouts_hens/ormond_ii.webp", label: "Variation II" },
        { path: "map_layouts_hens/ormond_iii.webp", label: "Variation III" }
      ],
      "Ormond Lake Mine": [{ path: "map_layouts_hens/ormond_lake_mine.webp", label: "" }],
      "Family Residence": [
        { path: "map_layouts_hens/family_residence.webp", label: "Variation I" },
        { path: "map_layouts_hens/family_residence_ii.webp", label: "Variation II" }
      ],
      "Sanctum of Wrath": [
        { path: "map_layouts_hens/sanctum_of_wrath.webp", label: "Variation I" },
        { path: "map_layouts_hens/sanctum_of_wrath_ii.webp", label: "Variation II" }
      ],
      "Mother's Dwelling": [{ path: "map_layouts_hens/mothers_dwelling.webp", label: "" }],
      "Temple of Purgation": [{ path: "map_layouts_hens/temple_of_purgation.webp", label: "" }],
      "Midwich Elementary School": [
        { path: "map_layouts/midwichelementaryschooloutlinelowerfloor.png", label: "Lower Floor" },
        { path: "map_layouts/midwichelementaryschooloutlineupperfloors.png", label: "Upper Floor" }
      ],
      "Dead Dawg Saloon": [{ path: "map_layouts_hens/dead_dawg_saloon.webp", label: "" }],
      "Raccoon City Police Station": [
        { path: "map_layouts_hens/rpd_east_wing.webp", label: "East Wing" },
        { path: "map_layouts_hens/rpd_west_wing.webp", label: "West Wing" }
      ],
      "Raccoon City Police Station East Wing": [{ path: "map_layouts_hens/rpd_east_wing.webp", label: "" }],
      "Raccoon City Police Station West Wing": [{ path: "map_layouts_hens/rpd_west_wing.webp", label: "" }],
      "Eyrie of Crows": [{ path: "map_layouts_hens/eyrie_of_crows.webp", label: "" }],
      "Garden of Joy": [{ path: "map_layouts_hens/garden_of_joy.webp", label: "" }],
      "Shattered Square": [{ path: "map_layouts_hens/shattered_square.webp", label: "" }],
      "Greenville Square": [{ path: "map_layouts_hens/greenville_square.webp", label: "" }],
      "Toba Landing": [{ path: "map_layouts_hens/toba_landing.webp", label: "" }],
      "Nostromo Wreckage": [{ path: "map_layouts_hens/nostromo_wreckage.webp", label: "" }],
      "Forgotten Ruins": [{ path: "map_layouts_hens/forgotten_ruins.webp", label: "" }],
      "Freddy Fazbear's Pizza": [{ path: "map_layouts_hens/freddy_fazbears_pizza.webp", label: "" }],
      "Fallen Refuge": [{ path: "map_layouts_hens/fallen_refuge.webp", label: "" }],
      "Dead Sands": [{ path: "map_layouts_hens/dead_sands.webp", label: "" }],
      "The Underground Complex": [{ path: "map_layouts_hens/the_underground_complex.webp", label: "" }],
      "Trickster's Delusion": [{ path: "map_layouts_hens/tricksters_delusion.webp", label: "" }]
    };
    const normalizeMapLayoutName = (value) => String(value || '')
      .replace(/\u2019/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
    const getMapLayoutsForName = (mapName) => {
      const normalized = normalizeMapLayoutName(mapName);
      const direct = MAP_LAYOUTS[normalized];
      if (Array.isArray(direct)) return direct;

      const withoutThe = normalized.replace(/^The\s+/i, '').trim();
      const noTheMatch = MAP_LAYOUTS[withoutThe];
      if (Array.isArray(noTheMatch)) return noTheMatch;

      const withThe = `The ${withoutThe}`;
      const withTheMatch = MAP_LAYOUTS[withThe];
      if (Array.isArray(withTheMatch)) return withTheMatch;

      return [];
    };
    const GAME_ICONS = [
      { id: "healthy", name: "Healthy", category: "health", type: "neutral", icon: "./dbd_images/game_icons/healthy.png", description: "The Survivor is at full health and can take two hits before being downed." },
      { id: "injured", name: "Injured", category: "health", type: "neutral", icon: "./dbd_images/game_icons/injured.png", description: "The Survivor has taken one hit and is bleeding. They make noise and leave blood trails. One more hit will down them." },
      { id: "dying", name: "Dying (Downed)", category: "health", type: "neutral", icon: "./dbd_images/game_icons/dying.png", description: "The Survivor is on the ground and cannot move normally. They must crawl and can be picked up by the Killer or recovered by teammates." },
      { id: "hooked", name: "Hooked", category: "health", type: "neutral", icon: "./dbd_images/game_icons/hooked.png", description: "The Survivor is hanging on a Hook. They progress through hook stages and can attempt escape or be rescued by teammates." },
      { id: "carried", name: "Carried", category: "health", type: "neutral", icon: "./dbd_images/game_icons/carried.png", description: "The Survivor is currently being carried by the Killer and can wiggle to escape before being hooked." },
      { id: "sacrificed", name: "Sacrificed", category: "health", type: "neutral", icon: "./dbd_images/game_icons/sacrificed.png", description: "The Survivor has been killed by The Entity after reaching the final hook stage. They are eliminated from the trial." },
      { id: "bledout", name: "Bled Out", category: "health", type: "neutral", icon: "./dbd_images/game_icons/bledout.png", description: "The Survivor has died from blood loss after remaining in the Dying State for too long (4 minutes)." },
      { id: "dead", name: "Dead", category: "health", type: "neutral", icon: "./dbd_images/game_icons/dead.png", description: "The Survivor has died by a means other than sacrifice, such as a Mori, bleed-out, or a special kill condition." },
      { id: "disconnected", name: "Disconnected", category: "health", type: "neutral", icon: "./dbd_images/game_icons/disconnected.png", description: "The player has disconnected from the match, either voluntarily or due to connection issues." },
      { id: "obsession", name: "Obsession", category: "health", type: "neutral", icon: "./dbd_images/game_icons/obsession.png", description: "This Survivor is the Killer's Obsession. Various Perks interact differently with the Obsession." },
      { id: "caged", name: "Caged", category: "health", type: "neutral", icon: "./dbd_images/game_icons/caged.png", description: "The Survivor is trapped in a Cage of Atonement (The Executioner). Similar to being hooked but placed by the power." },

      { id: "blessed", name: "Blessed", category: "buff", type: "buff", icon: "./dbd_images/game_icons/blessed.png", description: "Survivors benefit from Blessed and whichever effect(s) it applies whenever they are inside the Area of Effect of an active Boon Totem (24 metres)." },
      { id: "bloodlust", name: "Bloodlust", category: "buff", type: "buff", icon: "./dbd_images/game_icons/bloodlust.png", description: "Killers benefitting from Bloodlust increasingly gain more Movement speed in prolonged Chases (Tier I: +5%, Tier II: +10%, Tier III: +15%)." },
      { id: "endurance", name: "Endurance", category: "buff", type: "buff", icon: "./dbd_images/game_icons/endurance.png", description: "Survivors benefitting from Endurance can resist damage from the Killer. If hit, they are afflicted with Deep Wound instead of being injured. Cancelled by Conspicuous Actions." },
      { id: "haste", name: "Haste", category: "buff", type: "buff", icon: "./dbd_images/game_icons/haste.png", description: "Players benefitting from Haste have their Movement speed increased. The strength depends on the specific Perk or ability." },
      { id: "undetectable", name: "Undetectable", category: "buff", type: "buff", icon: "./dbd_images/game_icons/undetectable.png", description: "Killers benefitting from Undetectable: suppress their Terror Radius, suppress Red Stain, block Aura from Survivors, and suppress jump-scare SFX." },

      { id: "blindness", name: "Blindness", category: "debuff", type: "debuff", icon: "./dbd_images/game_icons/blindness.png", description: "Players suffering from Blindness are unable to read any Auras, including the default ones of their role and those from Perks." },
      { id: "broken", name: "Broken", category: "debuff", type: "debuff", icon: "./dbd_images/game_icons/broken.png", description: "Survivors suffering from Broken are unable to be healed or heal themselves past the Injured State." },
      { id: "cursed", name: "Cursed", category: "debuff", type: "debuff", icon: "./dbd_images/game_icons/cursed.png", description: "Survivors suffering from Cursed are currently affected by an active Hex Totem and its effects." },
      { id: "deepwound", name: "Deep Wound", category: "debuff", type: "debuff", icon: "./dbd_images/game_icons/deepwound.png", description: "Survivors suffering from Deep Wound have a special health bar that progressively drains when not running or mending. Once the timer runs out, they are put into the Dying State." },
      { id: "exhausted", name: "Exhausted", category: "debuff", type: "debuff", icon: "./dbd_images/game_icons/exhausted.png", description: "Survivors suffering from Exhaustion are unable to use Exhaustion Perks (Sprint Burst, Dead Hard, etc.). Exhausted recovers over time when not running." },
      { id: "exposed", name: "Exposed", category: "debuff", type: "debuff", icon: "./dbd_images/game_icons/exposed.png", description: "Survivors suffering from Exposed will suffer double-damage when hit by a Basic Attack, immediately putting them into the Dying State." },
      { id: "haemorrhage", name: "Haemorrhage", category: "debuff", type: "debuff", icon: "./dbd_images/game_icons/haemorrhage.png", description: "Survivors suffering from Haemorrhage produce more Pools of Blood (easier to track) and lose partial Healing progress at -7% per second if not healed fully." },
      { id: "hindered", name: "Hindered", category: "debuff", type: "debuff", icon: "./dbd_images/game_icons/hindered.png", description: "Players suffering from Hindered have their Movement speed decreased. The strength depends on the specific Perk or ability." },
      { id: "incapacitated", name: "Incapacitated", category: "debuff", type: "debuff", icon: "./dbd_images/game_icons/incapacitated.png", description: "Survivors suffering from Incapacitated are unable to interact with certain Props or other Survivors." },
      { id: "madness", name: "Madness", category: "debuff", type: "debuff", icon: "./dbd_images/game_icons/madness.png", description: "Survivors suffering from Madness (exclusive to The Doctor) suffer from hallucinations and other debilitating impairments. Madness is a tiered Status Effect (Tier I, II, III)." },
      { id: "mangled", name: "Mangled", category: "debuff", type: "debuff", icon: "./dbd_images/game_icons/mangled.png", description: "Survivors suffering from Mangled take 25% longer to be healed (achieved by reducing Healing speed by -20%). Only applies to healing from Injured to Healthy." },
      { id: "oblivious", name: "Oblivious", category: "debuff", type: "debuff", icon: "./dbd_images/game_icons/oblivious.png", description: "Survivors suffering from Oblivious are unable to perceive the Killer's Terror Radius and do not hear the Heartbeat warning." },

      { id: "marked", name: "Marked", category: "killer", type: "debuff", icon: "./dbd_images/game_icons/marked.png", description: "The Ghost Face has fully stalked this Survivor. They are Exposed and can be downed in one hit for a limited time." },
      { id: "marked_progress", name: "Marked Progress", category: "killer", type: "debuff", icon: "./dbd_images/game_icons/marked_progress.png", description: "The Ghost Face is actively stalking this Survivor and building Marked progress. If the meter fills, they become Marked and Exposed." },
      { id: "condemned", name: "Condemned", category: "killer", type: "debuff", icon: "./dbd_images/game_icons/condemned.png", description: "The Onryō's curse stacks on this Survivor. At maximum stacks, The Onryō can instantly kill them. Managed by picking up and returning Video Tapes." },
      { id: "condemnation", name: "Condemnation Progress", category: "killer", type: "debuff", icon: "./dbd_images/game_icons/condemnation.png", description: "The Onryō is actively building Condemned progress on this Survivor. Reaching the maximum stack count allows a special kill." },
      { id: "infected", name: "Infected", category: "killer", type: "debuff", icon: "./dbd_images/game_icons/infected.png", description: "The Mastermind (Wesker) has infected this Survivor with Uroboros. At critical infection, the Survivor is Hindered and can be grabbed." },
      { id: "infection_progress", name: "Infection Progress", category: "killer", type: "debuff", icon: "./dbd_images/game_icons/infection_progress.png", description: "Uroboros infection is building on this Survivor, but it has not yet reached the fully Infected state." },
      { id: "sickness", name: "Sickness", category: "killer", type: "debuff", icon: "./dbd_images/game_icons/sickness.png", description: "The Plague has infected this Survivor. At maximum sickness, the Survivor is Broken. Cleansing at a Pool of Devotion cures sickness but empowers The Plague." },
      { id: "sickness_progress", name: "Sickness Progress", category: "killer", type: "debuff", icon: "./dbd_images/game_icons/sickness_progress.png", description: "The Plague's Vile Purge is currently building infection on this Survivor, but they are not yet fully sick." },
      { id: "chainhunt", name: "Chain Hunt", category: "killer", type: "debuff", icon: "./dbd_images/game_icons/chainhunt.png", description: "The Cenobite has initiated a Chain Hunt. All Survivors are periodically attacked by chains until someone solves the Lament Configuration." },
      { id: "lacerated", name: "Lacerated", category: "killer", type: "debuff", icon: "./dbd_images/game_icons/lacerated.png", description: "The Trickster has thrown knives at this Survivor. At maximum laceration, the Survivor loses a health state." },
      { id: "lacerated_progress", name: "Laceration Progress", category: "killer", type: "debuff", icon: "./dbd_images/game_icons/lacerated_progress.png", description: "The Trickster has started building laceration on this Survivor, but the damage threshold has not been reached yet." },
      { id: "swarmed", name: "Swarmed", category: "killer", type: "debuff", icon: "./dbd_images/game_icons/swarmed.png", description: "The Artist's crows are on this Survivor. If hit by another Dire Crow while swarmed, the Survivor takes damage." },
      { id: "tormented", name: "Tormented", category: "killer", type: "debuff", icon: "./dbd_images/game_icons/tormented.png", description: "The Executioner can send this Survivor to a Cage of Atonement instead of hooking them, or use Final Judgment to kill." },
      { id: "contaminated", name: "Contaminated", category: "killer", type: "debuff", icon: "./dbd_images/game_icons/contaminated.png", description: "The Nemesis has contaminated this Survivor with a Tentacle Strike. Contaminated Survivors can be damaged by subsequent Tentacle Strikes and by Zombies.", tip: "Avoid Zombies and use Vaccines found in Supply Cases to cure contamination." },
      { id: "hunted", name: "Hunted", category: "killer", type: "debuff", icon: "./dbd_images/game_icons/hunted.png", description: "A Guard spawned by The Knight is hunting this Survivor. If caught, the Survivor takes damage. The hunt lasts for a limited time before the Guard dissolves.", tip: "Loop the Guard like a normal Killer - they give up after a timer." },
      { id: "latchedon", name: "Latched On", category: "killer", type: "debuff", icon: "./dbd_images/game_icons/latchedon.png", description: "Victor (The Twins) has pounced onto this Survivor's back. While latched, the Survivor's location is revealed and they cannot leave through the Exit Gate.", tip: "Have a teammate crush Victor off your back, or do it yourself (causes Broken)." },
      { id: "trapped_bear", name: "Trapped (Bear Trap)", category: "killer", type: "debuff", icon: "./dbd_images/game_icons/trapped.png", description: "This Survivor is caught in a Bear Trap (The Trapper) or a Mimic (The Lich). They are immobilized and must attempt escape or wait for rescue.", tip: "Each self-escape attempt has ~16.7% chance. Teammates can free you faster." },
      { id: "rbt", name: "Reverse Bear Trap", category: "killer", type: "debuff", icon: "./dbd_images/game_icons/rbt.png", description: "The Pig has placed a Reverse Bear Trap on this Survivor's head. Once activated (by completing a generator), a death timer starts. Search Jigsaw Boxes to remove it before time runs out.", tip: "Prioritize searching Jigsaw Boxes once your RBT is active. Don't work on gens." },
      { id: "rbt_timer_paused", name: "Reverse Bear Trap Timer (Paused)", category: "killer", type: "debuff", icon: "./dbd_images/game_icons/rbt_timer_paused.png", description: "The Pig's Reverse Bear Trap timer is paused and will not tick down until the trap becomes active." },
      { id: "rbt_timer_active", name: "Reverse Bear Trap Timer (Active)", category: "killer", type: "debuff", icon: "./dbd_images/game_icons/rbt_timer_active.png", description: "The Pig's Reverse Bear Trap timer is active and counting down to a lethal execution if the trap is not removed in time." },
      { id: "magic_disabled", name: "Magic Item Disabled", category: "killer", type: "debuff", icon: "./dbd_images/game_icons/magic_disabled.png", description: "The Lich's Dispelling Sphere has passed through this Survivor, disabling their equipped Magic Item for 60 seconds. While disabled, the Magic Item cannot be used. The Lich also sees the type of Magic Item on the Survivor's HUD.", tip: "You cannot use your Magic Item (Boots or Gauntlet) for 60s. Avoid the sphere by listening for its sound and moving perpendicular to its trajectory." },
      { id: "puzzle", name: "Puzzle Solving", category: "killer", type: "neutral", icon: "./dbd_images/game_icons/puzzle.png", description: "The Survivor is holding or solving the Lament Configuration while facing The Cenobite." },

      { id: "revealed", name: "Revealed", category: "debuff", type: "debuff", icon: "./dbd_images/game_icons/revealed.png", description: "This Survivor's Aura is revealed to both Killers in the 2v8 Game Mode. This status effect is exclusive to the 2v8 mode." },

      { id: "efficiency", name: "Efficiency", category: "proficiency", type: "neutral", icon: "./dbd_images/game_icons/efficiency.png", description: "A Proficiency Indicator that shows whether an Item is depleting slower or faster than normal while it is being used." },
      { id: "progression_speed", name: "Progression Speed", category: "proficiency", type: "neutral", icon: "./dbd_images/game_icons/progression_speed.png", description: "A Proficiency Indicator that shows whether the current interaction is progressing faster or slower than the default 1 charge per second." },
      { id: "skillcheck_difficulty", name: "Skill Check Difficulty", category: "proficiency", type: "neutral", icon: "./dbd_images/game_icons/skillcheck_difficulty.png", description: "A Proficiency Indicator that shows whether upcoming Skill Checks are easier or harder than normal." },
      { id: "skillcheck_probability", name: "Skill Check Probability", category: "proficiency", type: "neutral", icon: "./dbd_images/game_icons/skillcheck_probability.png", description: "A Proficiency Indicator that shows whether Skill Checks are appearing more or less often than usual." },

      { id: "activity_gen", name: "Repairing Generator", category: "activity", type: "neutral", icon: "./dbd_images/game_icons/activity_gen.png", description: "This Survivor is currently working on a Generator. Visible to teammates in the HUD." },
      { id: "activity_heal", name: "Healing", category: "activity", type: "neutral", icon: "./dbd_images/game_icons/activity_heal.png", description: "This Survivor is currently healing themselves or another Survivor. Visible to teammates in the HUD." },
      { id: "activity_totem", name: "Totem Interaction", category: "activity", type: "neutral", icon: "./dbd_images/game_icons/activity_totem.png", description: "This Survivor is currently cleansing or blessing a Totem. Visible to teammates in the HUD." },
      { id: "activity_exitgate", name: "Opening Exit Gate", category: "activity", type: "neutral", icon: "./dbd_images/game_icons/activity_exitgate.png", description: "This Survivor is currently opening an Exit Gate. Visible to teammates in the HUD." },
      { id: "activity_recovery", name: "Recovering", category: "activity", type: "neutral", icon: "./dbd_images/game_icons/activity_recovery.png", description: "This Survivor is recovering from the Dying State. Their recovery progress is shown to teammates." },
      { id: "activity_chest", name: "Unlocking Chest", category: "activity", type: "neutral", icon: "./dbd_images/game_icons/activity_chest.png", description: "This Survivor is currently unlocking a Chest to find an Item. Visible to teammates in the HUD." },
      { id: "activity_killerpower", name: "Killer Power Interaction", category: "activity", type: "neutral", icon: "./dbd_images/game_icons/activity_killerpower.png", description: "This Survivor is currently interacting with a Killer's Power or related prop (e.g., Jigsaw Box, Vaccine, Lament Configuration). Visible to teammates." },
      { id: "activity_invocation", name: "Invocation", category: "activity", type: "neutral", icon: "./dbd_images/game_icons/activity_invocation.png", description: "This Survivor is performing an Invocation. Progress is shown to teammates. Invocations require channeling in the basement." }
    ];
    const PERK_SYNERGIES = {
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



    const COSMETICS_FULL_SET_ASSET_PACK_NAME = 'cosmeticsfullsetpack';
    const isNativeAndroidPlatform = () => {
      try {
        return Boolean(window.Capacitor?.isNativePlatform?.()) && window.Capacitor?.getPlatform?.() === 'android';
      } catch (error) {
        return false;
      }
    };
    const getCosmeticsFullSetPackBaseUrl = () => String(window.__cosmeticsFullSetPackBaseUrl || '');
    const setCosmeticsFullSetPackBasePath = (assetsPath) => {
      const normalizedPath = typeof assetsPath === 'string' ? assetsPath.trim() : '';
      if (!normalizedPath) {
        window.__cosmeticsFullSetPackBaseUrl = '';
        return '';
      }
      const converted = typeof window.Capacitor?.convertFileSrc === 'function'
        ? window.Capacitor.convertFileSrc(normalizedPath)
        : normalizedPath;
      const normalizedBaseUrl = String(converted || '').replace(/\/+$/, '');
      window.__cosmeticsFullSetPackBaseUrl = normalizedBaseUrl;
      return normalizedBaseUrl;
    };
    const defaultCosmeticsFullSetPackState = () => ({
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
    const normalizeCosmeticsFullSetPackState = (raw) => {
      const fallback = defaultCosmeticsFullSetPackState();
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fallback;
      const assetsPath = typeof raw.assetsPath === 'string' ? raw.assetsPath : '';
      const baseUrl = assetsPath ? setCosmeticsFullSetPackBasePath(assetsPath) : setCosmeticsFullSetPackBasePath('');
      const isReady = Boolean(raw.isReady);
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
    const isCosmeticsFullSetImagePath = (url) => {
      if (!url) return false;
      const normalized = String(url).replace(/\\/g, '/').replace(/^\.\//, '');
      return normalized.startsWith('dbd_images/cosmetics/full_sets/');
    };
    const getCosmeticsFullSetResolutionCache = () => {
      if (!(window.__cosmeticsFullSetResolutionCache instanceof Map)) {
        window.__cosmeticsFullSetResolutionCache = new Map();
      }
      return window.__cosmeticsFullSetResolutionCache;
    };
    const clearCosmeticsFullSetResolutionCache = () => {
      const resolutionCache = getCosmeticsFullSetResolutionCache();
      resolutionCache.clear();
    };
    const getCosmeticsFullSetResolutionRevision = () => Number(window.__cosmeticsFullSetResolutionRevision || 0);
    const bumpCosmeticsFullSetResolutionRevision = () => {
      clearCosmeticsFullSetResolutionCache();
      const next = getCosmeticsFullSetResolutionRevision() + 1;
      window.__cosmeticsFullSetResolutionRevision = next;
      return next;
    };
    const formatAssetPackErrorLabel = (value) => {
      const key = String(value || '').trim();
      switch (key) {
        case 'insufficient_storage': return 'There is not enough free storage to finish loading full-set cosmetics.';
        case 'network_error': return 'A network issue interrupted full-set cosmetics loading.';
        case 'access_denied': return 'Full-set cosmetics could not be accessed on this device right now.';
        case 'api_not_available': return 'Full-set cosmetics are not available on this device right now.';
        case 'app_unavailable':
        case 'pack_unavailable':
        case 'invalid_request':
        case 'download_not_found':
        case 'app_not_owned':
        case 'confirmation_not_required':
        case 'unrecognized_installation':
        case 'internal_error':
          return 'Full-set cosmetics could not finish loading yet. Please try again in a moment.';
        default: return '';
      }
    };
    const formatDataSize = (bytes) => {
      const value = Number(bytes) || 0;
      if (value <= 0) return '0 B';
      if (value < 1024) return `${value} B`;
      if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
      if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
      return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    };
    const getConfiguredDbdImageBaseUrl = () => {
      const raw = typeof window.DBD_IMAGE_BASE_URL === 'string' ? window.DBD_IMAGE_BASE_URL.trim() : '';
      return raw.replace(/\/+$/, '');
    };
    const toConfiguredDbdImageSource = (url) => {
      if (!url) return null;
      const baseUrl = getConfiguredDbdImageBaseUrl();
      if (!baseUrl) return null;
      const normalized = String(url).replace(/\\/g, '/').replace(/^\.\//, '');
      if (!normalized.startsWith('dbd_images/')) return null;
      const relativePath = normalized.slice('dbd_images/'.length).replace(/^\/+/, '');
      return relativePath ? `${baseUrl}/${relativePath}` : baseUrl;
    };
    /* Resolvers moved to ./engine/assets.js; DBD pack/R2 hooks below. */
    const resolveExtraImageSource = (normalized) => {
      if (isCosmeticsFullSetImagePath(normalized)) {
        const packBaseUrl = getCosmeticsFullSetPackBaseUrl();
        if (packBaseUrl) return `${packBaseUrl}/${normalized}`;
        const configuredSource = toConfiguredDbdImageSource(normalized);
        if (configuredSource) return configuredSource;
        return isNativeAndroidPlatform() ? null : `./${normalized}`;
      }
      const configuredSource = toConfiguredDbdImageSource(normalized);
      if (configuredSource) return configuredSource;
      return undefined;
    };
    const resolveAsyncImageSource = async (normalized) => {
      if (!isCosmeticsFullSetImagePath(normalized)) return undefined;
      if (!isNativeAndroidPlatform()) {
        return `./${normalized}`;
      }
      const resolutionCache = getCosmeticsFullSetResolutionCache();
      if (resolutionCache.has(normalized)) {
        return resolutionCache.get(normalized);
      }
      const resolutionPromise = (async () => {
        const plugin = window.Capacitor?.Plugins?.CosmeticsAssetPack;
        if (plugin?.resolveAsset) {
          try {
            const raw = await plugin.resolveAsset({ assetPath: normalized });
            const resolvedPath = raw?.resolvedPath ? String(raw.resolvedPath) : '';
            if (resolvedPath) {
              return typeof window.Capacitor?.convertFileSrc === 'function'
                ? window.Capacitor.convertFileSrc(resolvedPath)
                : resolvedPath;
            }
          } catch (error) {
          }
        }
        const packBaseUrl = getCosmeticsFullSetPackBaseUrl();
        return packBaseUrl ? `${packBaseUrl}/${normalized}` : null;
      })();
      resolutionCache.set(normalized, resolutionPromise);
      const resolved = await resolutionPromise;
      if (!resolved) {
        resolutionCache.delete(normalized);
      }
      return resolved;
    };
    /* Moved to ./engine/assets.js (wiki engine bundle, loaded above). */
    /* Moved to ./engine/assets.js (wiki engine bundle, loaded above). */
    /* Moved to ./engine/shell.js (wiki engine bundle, loaded above). */
    const WikiHeader = ({ currentView, setView }) => {
      useEffect(() => {
        const onKey = (e) => {
          if (e.key !== '/') return;
          const t = e.target;
          if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
          const slot = document.getElementById('wiki-header-search-slot');
          const input = slot && slot.querySelector('input');
          if (input) {
            e.preventDefault();
            input.focus();
            input.select();
          }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, []);
      const hasSearch = !['home'].includes(currentView);
      return (
        <header className="wiki-header sticky top-0 z-30 flex items-center justify-between gap-4 px-4">
          <button type="button" onClick={() => setView('home')} className="flex items-center gap-3 shrink-0" aria-label="Main page">
            <img src="./assets/wiki-logo.png" alt="" width={100} height={42} className="wiki-logo-img" style={{ objectFit: 'contain' }} />
            <span className="flex flex-col leading-none text-left">
              <span className="text-[15px] font-bold text-[var(--text)]" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>The Entity's Wiki</span>
              <span className="text-[8.5px] uppercase tracking-[0.18em] mt-1" style={{ color: 'var(--text-faint)' }}>Dead by Daylight</span>
            </span>
          </button>
          <div
            id="wiki-header-search-slot"
            className="absolute flex items-center"
            style={{
              left: '50%',
              transform: 'translateX(-50%)',
              width: hasSearch ? '470px' : '0px',
              opacity: hasSearch ? 1 : 0,
              pointerEvents: hasSearch ? 'auto' : 'none',
              overflow: hasSearch ? 'visible' : 'hidden'
            }}
          />
          <button
            type="button"
            onClick={() => setView('settings')}
            className="shrink-0 w-9 h-9 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center"
            aria-label="Settings"
          >
            <Icons.Gear width={16} height={16} />
          </button>
        </header>
      );
    };
    const SiteFooter = ({ currentView }) => {
      useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        if (!window.matchMedia('(min-width: 768px)').matches) return undefined;
        if (currentView === 'home') return undefined;
        let injectedFooter = null;
        const timer = window.setTimeout(() => {
          const root = document.querySelector('[data-smoke-view]');
          if (!root) return;
          const locale = (typeof navigator !== 'undefined' && (navigator.language || '').toLowerCase().startsWith('fr')) ? 'fr' : 'en';
          const href = (PLAY_STORE_LINKS[locale] || PLAY_STORE_LINKS.en);
          const badge = (GOOGLE_PLAY_BADGES[locale] || GOOGLE_PLAY_BADGES.en);
          const div = document.createElement('div');
          div.className = 'site-footer';
          injectedFooter = div;
          div.innerHTML = `
            <p class="site-footer-eyebrow">Get the app</p>
            <a href="${href}" target="_blank" rel="noopener noreferrer" aria-label="Get it on Google Play">
              <img src="${badge}" alt="Get it on Google Play" class="site-footer-badge" loading="lazy" />
            </a>
            <div class="site-footer-legal">
              <a href="./privacy-policy">Privacy Policy</a>
              <a href="./privacy-policy#disclaimer">Legal &amp; Disclaimer</a>
              <span>Community data &copy; Otzdarva</span>
            </div>`;
          const article = root.querySelector('.cx-article');
          if (article) {
            article.appendChild(div);
            return;
          }
          const candidates = [root, ...Array.from(root.querySelectorAll('.overflow-y-auto'))]
            .filter((el) => el.classList.contains('overflow-y-auto'));
          const scroller = candidates.sort((a, b) => b.scrollHeight - a.scrollHeight)[0];
          if (!scroller || scroller.scrollHeight <= scroller.clientHeight + 50) return;
          scroller.appendChild(div);
          return;
        }, 60);
        return () => {
          injectedFooter?.remove();
          window.clearTimeout(timer);
        };
      }, [currentView]);
      return null;
    };
    const SiteFooterContent = () => {
      const locale = (typeof navigator !== 'undefined' && (navigator.language || '').toLowerCase().startsWith('fr')) ? 'fr' : 'en';
      const href = (PLAY_STORE_LINKS[locale] || PLAY_STORE_LINKS.en);
      const badge = (GOOGLE_PLAY_BADGES[locale] || GOOGLE_PLAY_BADGES.en);
      return (
        <div className="site-footer">
          <p className="site-footer-eyebrow">Get the app</p>
          <a href={href} target="_blank" rel="noopener noreferrer" aria-label="Get it on Google Play">
            <img src={badge} alt="Get it on Google Play" className="site-footer-badge" loading="lazy" />
          </a>
          <div className="site-footer-legal">
            <a href="./privacy-policy">Privacy Policy</a>
            <a href="./privacy-policy#disclaimer">Legal &amp; Disclaimer</a>
            <span>Community data &copy; Otzdarva</span>
          </div>
        </div>
      );
    };
    const WebsiteHeader = ({ currentView, setView, titleOverride, onOpenDrawer }) => {
      const headerTitle = currentView === 'home' ? 'Search' : (titleOverride || getNavDisplayLabel(currentView));
      return (
        <header className="website-topbar shrink-0 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 min-w-0">
          {onOpenDrawer && (
            <button type="button" onClick={onOpenDrawer} className="cx-hamb" aria-label="Open navigation">
              <span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" />
            </button>
          )}
          <button onClick={() => setView('home')} className="group flex items-center gap-3 min-w-0 text-left" aria-label="Open search">
            <div className="website-brand-mark w-9 h-9 shrink-0 flex items-center justify-center border border-white/15">
              <Icons.DbdLogo width={36} height={36} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.32em] text-zinc-500">The Entity's Wiki</p>
              <h1 className="text-lg text-[var(--text)] truncate" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '0.01em' }}>{headerTitle}</h1>
            </div>
          </button>
          </div>
          <div className="hidden md:flex items-center gap-5">
            <span style={{ fontFamily: 'var(--mono-fallback, ui-monospace, monospace)', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--faint, var(--muted))' }}>
              Patch {META.gameVersion} · synced {META.lastSynced}
            </span>
          </div>
          <button
            onClick={() => setView('settings')}
            className="shrink-0 w-10 h-10 border border-white/10 bg-white/[0.035] text-zinc-400 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center"
            aria-label="Open settings"
          >
            <Icons.Gear width={18} height={18} />
          </button>
        </header>
      );
    };

    // ── App toolbar (Wikipedia-app style: 4 fixed destinations, matches native app) ──
    /* Moved to ./engine/shell.js (wiki engine bundle, loaded above). */
    // ── Section drawer (full browse list, matches native app) ──
    /* Moved to ./games/dbd/config.js (DBD adapter, loaded above). */
    /* Moved to ./engine/shell.js (wiki engine bundle, loaded above). */

    const PlayStoreFooter = ({ compact = false, onDismiss = null, className = '' }) => {
      const locale = typeof navigator !== 'undefined' && (navigator.language || '').toLowerCase().startsWith('fr') ? 'fr' : 'en';
      const href = PLAY_STORE_LINKS[locale] || PLAY_STORE_LINKS.en;
      const badge = GOOGLE_PLAY_BADGES[locale] || GOOGLE_PLAY_BADGES.en;
      const label = locale === 'fr' ? 'Disponible sur Google Play' : 'Get it on Google Play';
      if (compact) {
        return (
          <div className={`play-store-footer--mobile rounded-2xl px-3 py-2 flex items-center gap-3 ${className}`}>
            <span className="play-store-eyebrow whitespace-nowrap">Get the app</span>
            <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="shrink-0 transition-opacity hover:opacity-85">
              <img src={badge} alt={label} className="google-play-badge" loading="lazy" />
            </a>
            {typeof onDismiss === 'function' && (
              <button
                type="button"
                onClick={onDismiss}
                className="play-store-dismiss shrink-0 rounded-full flex items-center justify-center transition-colors"
                aria-label="Hide Google Play banner"
              >
                <Icons.X width={14} height={14} />
              </button>
            )}
          </div>
        );
      }
      return (
        <div className={`play-store-footer px-5 py-4 ${className}`}>
          <p className="play-store-eyebrow">Get the app</p>
          <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="mt-2 inline-block transition-opacity hover:opacity-85">
            <img src={badge} alt={label} className="google-play-badge" loading="lazy" />
          </a>
        </div>
      );
    };

    const SiteLegalFooter = ({ className = '' }) => (
      <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500 ${className}`}>
        <a href="./privacy-policy" className="hover:text-zinc-300 transition-colors">Privacy Policy</a>
        <a href="./privacy-policy#disclaimer" className="hover:text-zinc-300 transition-colors">Legal &amp; Disclaimer</a>
        <span>Community data &copy; Otzdarva</span>
      </div>
    );

    const Navigation = ({ currentView, setView, theme, isMobile = false, onPerksReset, customNavItems = [], hideAppCta = false, onHideAppCta = null }) => {
      const navItems = useMemo(() => {
        const items = [{ id: 'home', label: 'Search' }];
        customNavItems.forEach(id => {
          const opt = ALL_NAV_OPTIONS.find(o => o.id === id);
          if (opt) items.push(opt);
        });
        items.push({ id: 'settings', label: 'Settings' });
        return items;
      }, [customNavItems]);
      const navCounts = useMemo(() => {
        const storageCount = (key) => { try { return (JSON.parse(localStorage.getItem(key)) || []).length; } catch { return 0; } };
        const favCount = () => {
          try {
            const s = JSON.parse(localStorage.getItem('dbd_settings_v1')) || {};
            return ['favoritePerks', 'favoriteKillers', 'favoriteSurvivors', 'favoriteItems', 'favoriteAddons', 'favoriteOfferings'].reduce((n, k) => n + ((s[k] || []).length), 0);
          } catch { return 0; }
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
          timeline: (typeof TIMELINE_DATA !== 'undefined' && TIMELINE_DATA.releases) ? TIMELINE_DATA.releases.length : 0,
          glossary: GLOSSARY.reduce((n, s) => n + s.items.length, 0),
          communityContent: (typeof COMMUNITY_CONTENT !== 'undefined' && COMMUNITY_CONTENT.guideVault && COMMUNITY_CONTENT.guideVault.entries) ? COMMUNITY_CONTENT.guideVault.entries.length : 0,
          gameIcons: (typeof GAME_ICONS !== 'undefined') ? GAME_ICONS.length : 0
        };
      }, []);
      const hasMany = navItems.length > 6;
      const containerClasses = isMobile
        ? 'nav-shell nav-scroll rounded-2xl px-3 py-2 border border-white/5 max-w-3xl w-full mx-auto'
        : `nav-shell rounded-2xl sm:rounded-full px-3 py-2 border border-white/5 ${hasMany ? 'max-w-5xl' : 'max-w-4xl'} w-full mx-auto`;
      const trackClasses = isMobile
        ? 'flex items-center gap-1 justify-center w-full overflow-x-auto nav-scroll px-1'
        : 'flex items-center gap-1 justify-center w-full';
      if (!isMobile) {
        return (
          <aside className="website-sidebar cx-side relative z-10 hidden md:flex h-full shrink-0 flex-col">
            <nav className="website-sidebar-scroll flex-1 overflow-y-auto cx-side-nav">
              <button
                onClick={() => setView('home')}
                className={`cx-side-link ${currentView === 'home' ? 'cx-side-link--active' : ''} cx-side-mainpage`}
              >
                <span className="truncate">Main page</span>
              </button>
              {WEBSITE_NAV_SECTIONS.map((section) => (
                <div key={section.label}>
                  <h5 className="cx-side-h5">{section.label}</h5>
                  {section.ids.map((id) => {
                    const isActive = currentView === id;
                    const count = navCounts[id];
                    return (
                      <button
                        key={id}
                        onClick={() => setView(id)}
                        onDoubleClick={() => id === 'perks' && onPerksReset?.()}
                        className={`cx-side-link ${isActive ? 'cx-side-link--active' : ''}`}
                      >
                        <span className="truncate">{getNavDisplayLabel(id)}</span>
                        {typeof count === 'number' && count > 0 ? <span className="cx-side-count">{count}</span> : null}
                      </button>
                    );
                  })}
                </div>
              ))}
              <div>
                <h5 className="cx-side-h5">Our wikis</h5>
                <a
                  href="https://r6-wiki.pages.dev/"
                  target="_blank"
                  rel="noreferrer"
                  className="cx-side-link"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <img src="./assets/r6-badge.png" alt="Rainbow Six Siege wiki" width="18" height="18" />
                    <span className="truncate">R6 Wiki</span>
                  </span>
                  <span aria-hidden="true" style={{ color: 'var(--text-faint)', fontSize: '12px' }}>↗</span>
                </a>
              </div>
            </nav>
          </aside>
        );
      }
      return (
        <div className="fixed bottom-0 left-0 w-full z-50 px-2 sm:px-6 pb-2 sm:pb-5 flex flex-col items-center gap-2 nav-safe-area">
          {!hideAppCta && <PlayStoreFooter compact onDismiss={onHideAppCta} />}
          <div className={containerClasses}>
            <div className={trackClasses}>
              {navItems.map((item) => {
                const isActive = currentView === item.id;
                const labelVisibility = (isMobile || hasMany) ? (isActive ? '' : 'hidden') : '';
                const IconComponent = Icons[NAV_ICON_MAP[item.id]] || Icons.Zap;
                return (
                  <button
                    key={item.id}
                    onClick={() => setView(item.id)}
                    onDoubleClick={() => item.id === 'perks' && onPerksReset?.()}
                    aria-label={item.label}
                    className={`nav-item ${isMobile ? 'shrink-0 flex items-center justify-center gap-2 rounded-xl px-3 py-2' : `flex-1 flex items-center justify-center gap-2 rounded-xl sm:rounded-full py-2.5 ${hasMany ? 'px-3' : ''}`} transition-all duration-200 ${isActive ? 'nav-item--active' : 'hover:text-white'}`}
                    style={isActive ? { borderColor: theme.accent } : {}}
                  >
                    <IconComponent width={20} height={20} strokeWidth={isActive ? 2.3 : 2} />
                    <span className={`text-[11px] font-semibold ${labelVisibility} ${isActive ? 'text-white' : 'text-zinc-400'}`}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    };
    const VIEW_TIPS = {};
    /* Moved to ./engine/shell.js (wiki engine bundle, loaded above). */
    /* Moved to ./engine/shell.js (wiki engine bundle, loaded above). */

    const GlassCard = ({ item, category, expanded = false, onToggle, perksForOwner = [], onPerkClick, buildsForOwner = [], onCreateBuild, isInCompare = false, onLongPress, isFavorite = false, onToggleFavorite, onPerkTap, onShowLore, onShowPower, onViewProfile, allCharacters = [], settings = {} }) => {
      let subtext = '';
      let accentTone = 'var(--accent)';
      let fallbackIcon = <Icons.Zap width={20} height={20} />;
      const isCharacter = category === 'Killer' || category === 'Survivor';
      const isPerk = category === 'Perk';
      const [pressTimer, setPressTimer] = useState(null);
      const longPressTriggered = useRef(false);
      const handleTouchStart = () => {
        if (!onLongPress) return;
        longPressTriggered.current = false;
        const timer = setTimeout(() => {
          longPressTriggered.current = true;
          onLongPress();
        }, 500);
        setPressTimer(timer);
      };
      const handleTouchEnd = () => {
        if (pressTimer) {
          clearTimeout(pressTimer);
          setPressTimer(null);
        }
      };
      const handlePerkClick = () => {
        if (longPressTriggered.current) {
          longPressTriggered.current = false;
          return;
        }
        if (onPerkTap) onPerkTap();
      };
      const handleCharacterClick = () => {
        if (onViewProfile) { onViewProfile(); return; }
        if (onToggle) onToggle();
      };
      if (category === 'Killer') {
        subtext = item.realName || item.name;
        accentTone = '#fafafa';
        fallbackIcon = <Icons.Sword width={24} height={24} className="opacity-20" />;
      } else if (category === 'Survivor') {
        subtext = item.role;
        accentTone = '#a1a1aa';
        fallbackIcon = <Icons.Heart width={24} height={24} className="opacity-20" />;
      } else if (isPerk) {
        subtext = item.owner || 'Universal';
        accentTone = item.type === 'Killer' ? '#fafafa' : '#a1a1aa';
        fallbackIcon = <Icons.BookOpen width={20} height={20} className="opacity-20" />;
      }
      return (
        <div
          className={`group relative overflow-hidden rounded-2xl glass-panel backdrop-blur-md p-4 mb-4 transition-all duration-200 ${isCharacter || (isPerk && onPerkTap) ? 'cursor-pointer' : ''} ${isInCompare ? 'ring-2 ring-zinc-500' : ''}`}
          style={expanded ? { borderColor: accentTone, boxShadow: '0 10px 30px rgba(0,0,0,0.4)' } : {}}
          onClick={isCharacter ? handleCharacterClick : (isPerk && onPerkTap ? handlePerkClick : undefined)}
          onTouchStart={isPerk ? handleTouchStart : undefined}
          onTouchEnd={isPerk ? handleTouchEnd : undefined}
          onTouchCancel={isPerk ? handleTouchEnd : undefined}
          onMouseDown={isPerk ? handleTouchStart : undefined}
          onMouseUp={isPerk ? handleTouchEnd : undefined}
          onMouseLeave={isPerk ? handleTouchEnd : undefined}
        >
          {/* Checkmark overlay for selected perks */}
          {isInCompare && (
            <div className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-zinc-400 flex items-center justify-center">
              <Icons.Check width={14} height={14} className="text-white" />
            </div>
          )}
          {/* Star button for favorite perks/killers/survivors */}
          {(isPerk || isCharacter) && onToggleFavorite && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
              className={`absolute top-2 ${isInCompare ? 'right-10' : 'right-2'} z-20 p-1.5 rounded-full transition-colors ${isFavorite ? 'bg-white/10' : 'bg-white/10 hover:bg-white/20'}`}
            >
              <Icons.Star width={16} height={16} className={isFavorite ? 'text-zinc-100 fill-zinc-100' : 'text-zinc-500'} />
            </button>
          )}
          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: accentTone, opacity: 0.6 }}></div>
          <div className="relative z-10 flex items-start gap-3">
            <div className="flex-1 py-1">
              <h3 className="text-lg font-semibold text-white mb-1 tracking-tight">{item.name}</h3>
              <p className="text-zinc-400 text-sm font-medium">{subtext}</p>
              {/* Show power description when expanded for killers */}
              {isCharacter && expanded && category === 'Killer' && item.power && (
                <p className="text-zinc-500 text-xs mt-2 leading-relaxed">{item.power}</p>
              )}
              {/* Show killer stats when expanded */}
              {isCharacter && expanded && category === 'Killer' && KILLER_STATS[item.name] && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="px-2 py-1 rounded-lg bg-zinc-500/10 border border-white/25/20 text-[10px] font-bold text-zinc-100">
                    TR: {KILLER_STATS[item.name].terrorRadius}
                  </span>
                  <span className="px-2 py-1 rounded-lg bg-zinc-500/10 border border-white/25/20 text-[10px] font-bold text-zinc-100">
                    Speed: {KILLER_STATS[item.name].speed}
                  </span>
                  <span className="px-2 py-1 rounded-lg bg-zinc-500/10 border border-white/25/20 text-[10px] font-bold text-zinc-100">
                    Height: {KILLER_STATS[item.name].height}
                  </span>
                </div>
              )}
              {isPerk && onLongPress && (
                <p className="text-zinc-600 text-[10px] mt-1">Long press to compare</p>
              )}
            </div>
            <div className={isPerk ? 'perk-icon-hover' : ''}>
              <AssetFrame type={category} imageUrl={item.image} fallbackIcon={fallbackIcon} />
            </div>
          </div>
          {item.description && (
            <div className="mt-4 pt-3 border-t border-white/5">
              {isPerk ? (
                <div className="perk-effect-text text-zinc-300/90 text-xs font-medium tracking-wide">
                  <span className="perk-effect-label text-zinc-500 mr-2 uppercase text-[10px] font-bold">Effect</span>
                  <PerkDescriptionBlock
                    perk={item}
                    settings={settings}
                    accentColor={accentTone}
                    compactLines={3}
                    className="inline"
                    lineClassName="leading-relaxed"
                  />
                </div>
              ) : (
                <p className="perk-effect-text text-zinc-300/90 text-xs leading-relaxed font-medium tracking-wide">
                  <span className="perk-effect-label text-zinc-500 mr-2 uppercase text-[10px] font-bold">Effect</span>
                  {stripHtml(item.description)}
                </p>
              )}
            </div>
          )}
          {/* Lore button for characters when expanded */}
          {isCharacter && expanded && onShowLore && (
            <div className="mt-4 pt-3 border-t border-white/5">
              <div className="flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onShowLore(); }}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Icons.BookOpen width={16} height={16} />
                  Lore
                </button>
                {category === 'Killer' && item.power && onShowPower && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onShowPower(); }}
                    className="flex-1 py-2.5 rounded-xl bg-zinc-500/20 hover:bg-zinc-500/30 border border-white/25/30 text-zinc-100 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <Icons.Zap width={16} height={16} />
                    Power
                  </button>
                )}
              </div>
            </div>
          )}
          {isCharacter && expanded && perksForOwner.length > 0 && (
            <div className="mt-4 pt-3 border-t border-white/5">
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-3">Teachables</p>
              <div className="space-y-2">
                {perksForOwner.slice(0, 3).map(perk => (
                  <button
                    key={perk.id}
                    onClick={(e) => { e.stopPropagation(); onPerkClick && onPerkClick(perk); }}
                    className="w-full text-left p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/15 transition-colors flex items-start gap-3"
                  >
                    <AssetFrame type="Perk" imageUrl={perk.image} fallbackIcon={<Icons.BookOpen width={18} height={18} className="text-white/60" />} />
                    <div className="flex-1">
                      <p className="text-white text-sm font-bold">{perk.name}</p>
                      <PerkDescriptionBlock
                        perk={perk}
                        settings={settings}
                        accentColor={accentTone}
                        compactLines={2}
                        className="text-zinc-500 text-xs mt-1 leading-relaxed"
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    };
    const ChaosShuffleView = ({ onBack, perks, killers = [], survivors = [], items = [], addons = [], offerings = [], settings = {}, ownedOnlyGlobal = false }) => {
      const [role, setRole] = useState('Survivor');
      const [isSpinning, setIsSpinning] = useState(false);
      const [randomizeCharacter, setRandomizeCharacter] = useState(true);
      const [randomizePerks, setRandomizePerks] = useState(true);
      const [randomizeAddons, setRandomizeAddons] = useState(true);
      const [randomizeItem, setRandomizeItem] = useState(true);
      const [randomizeOffering, setRandomizeOffering] = useState(false);
      const [ownedCharacters, setOwnedCharacters] = useState(new Set());
      const [characterSearch, setCharacterSearch] = useState('');
      const [showOwnedSection, setShowOwnedSection] = useState(true);
      const [previousPerks, setPreviousPerks] = useState([]);
      const [lockedCharacterId, setLockedCharacterId] = useState(null);
      const [result, setResult] = useState({
        character: null,
        perks: [null, null, null, null],
        addons: [null, null],
        item: null,
        offering: null
      });
      const characters = useMemo(() => role === 'Killer' ? killers : survivors, [role, killers, survivors]);
      const filteredCharacters = useMemo(() => {
        const term = characterSearch.toLowerCase();
        return characters.filter(c =>
          !term || c.name.toLowerCase().includes(term) || (c.realName && c.realName.toLowerCase().includes(term))
        );
      }, [characters, characterSearch]);
      useEffect(() => {
        setOwnedCharacters(new Set(characters.map(c => c.id)));
        setResult({ character: null, perks: [null, null, null, null], addons: [null, null], item: null, offering: null });
        setPreviousPerks([]);
        setLockedCharacterId(null);
      }, [role, characters]);
      const toggleCharacter = (id) => {
        const next = new Set(ownedCharacters);
        if (next.has(id)) next.delete(id); else next.add(id);
        setOwnedCharacters(next);
      };
      const selectAllCharacters = () => setOwnedCharacters(new Set(characters.map(c => c.id)));
      const selectNoneCharacters = () => setOwnedCharacters(new Set());
      const getAddonsForSelection = useMemo(() => {
        if (role === 'Killer' && result.character) {
          return addons.filter(a => a.role === 'killer' && a.killerName === result.character.name);
        } else if (role === 'Survivor' && result.item) {
          return addons.filter(a => a.role === 'survivor' && a.itemType === result.item.itemType);
        }
        return [];
      }, [role, result.character, result.item, addons]);
      const survivorItems = useMemo(() => {
        return (items || []).filter(i => i.bloodweb === true && i.role === 'survivor');
      }, [items]);
      const roleOfferings = useMemo(() => {
        return (offerings || []).filter(o => !o.retired && (!o.role || o.role === role.toLowerCase() || o.role === null));
      }, [offerings, role]);
      const rollDice = () => {
        if (ownedCharacters.size === 0 && randomizeCharacter && !lockedCharacterId) {
          alert(`Please select at least one ${role} you own!`);
          return;
        }
        setIsSpinning(true);
        triggerHaptic('Medium');
        setTimeout(() => {
          const newResult = { ...result };
          if (lockedCharacterId) {
            // Use the locked character directly
            newResult.character = characters.find(c => c.id === lockedCharacterId) || null;
          } else if (randomizeCharacter) {
            const ownedChars = characters.filter(c => ownedCharacters.has(c.id));
            newResult.character = ownedChars[Math.floor(Math.random() * ownedChars.length)] || null;
          }
          if (randomizePerks) {
            const ownedNames = characters.filter(c => ownedCharacters.has(c.id)).map(c => c.name);
            const previousPerkIds = new Set(previousPerks.map(p => p?.id).filter(Boolean));
            const perkPool = perks.filter(p => {
              if (p.type !== role || previousPerkIds.has(p.id)) return false;
              if (ownedOnlyGlobal) return true;
              if (!p.owner) return true;
              return ownedNames.includes(p.owner);
            });
            const shuffledPerks = [...perkPool].sort(() => 0.5 - Math.random());
            newResult.perks = [
              shuffledPerks[0] || null,
              shuffledPerks[1] || null,
              shuffledPerks[2] || null,
              shuffledPerks[3] || null
            ];
            setPreviousPerks(newResult.perks.filter(Boolean));
          }
          if (role === 'Survivor' && randomizeItem) {
            newResult.item = survivorItems[Math.floor(Math.random() * survivorItems.length)] || null;
          } else {
            newResult.item = null;
          }
          if (randomizeAddons) {
            let addonPool = [];
            if (role === 'Killer' && newResult.character) {
              addonPool = addons.filter(a => a.role === 'killer' && a.killerName === newResult.character.name);
            } else if (role === 'Survivor' && newResult.item) {
              addonPool = addons.filter(a => a.role === 'survivor' && a.itemType === newResult.item.itemType);
            }
            const shuffledAddons = [...addonPool].sort(() => 0.5 - Math.random());
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
    /* Moved to ./games/dbd/config.js (DBD adapter, loaded above). */
      const rollDiceRef = useRef(null);
      useEffect(() => { rollDiceRef.current = rollDice; });
      useEffect(() => {
        let lastShake = 0;
        const SHAKE_THRESHOLD = 15;
        const SHAKE_COOLDOWN = 1000;
        const handleMotion = (event) => {
          const { accelerationIncludingGravity } = event;
          if (!accelerationIncludingGravity) return;
          const { x, y, z } = accelerationIncludingGravity;
          const acceleration = Math.sqrt(x * x + y * y + z * z);
          const now = Date.now();
          if (acceleration > SHAKE_THRESHOLD && now - lastShake > SHAKE_COOLDOWN && !isSpinning) {
            lastShake = now;
            rollDiceRef.current?.();
          }
        };
        if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
          window.addEventListener('click', function requestPermission() {
            DeviceMotionEvent.requestPermission()
              .then(response => {
                if (response === 'granted') {
                  window.addEventListener('devicemotion', handleMotion);
                }
              })
              .catch(console.error);
            window.removeEventListener('click', requestPermission);
          }, { once: true });
        } else if (typeof DeviceMotionEvent !== 'undefined') {
          window.addEventListener('devicemotion', handleMotion);
        }
        return () => {
          window.removeEventListener('devicemotion', handleMotion);
        };
      }, [isSpinning]);
      const StandardView = () => (
        <div className="space-y-6">
          <h2 className="cx-sec">Shuffle result</h2>
          <table className="cx-wikitable"><tbody>
            {result.character && (
              <tr><th scope="row">{role}</th><td>
                <div className="flex items-center gap-4">
                  <div className="w-1 h-16" style={{ background: 'var(--accent)' }} />
                  <AssetFrame type={role} imageUrl={result.character.image} />
                  <div className="flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">{role}</p>
                    <h3 className="text-xl font-bold text-white">{result.character.name}</h3>
                    {result.character.realName && result.character.realName !== result.character.name && (
                      <p className="text-zinc-400 text-sm mt-1">{result.character.realName}</p>
                    )}
                  </div>
                </div>
              </td></tr>
            )}
            <tr><th scope="row">Perks</th><td>
              <div className="grid grid-cols-2 gap-4">
                {result.perks.map((perk, index) => (
                  <div key={index} className={`flex flex-col items-center transition-all duration-500 ${isSpinning ? 'scale-90 opacity-50 blur-sm' : 'scale-100 opacity-100'}`}>
                    <AssetFrame type="Perk" size="large" imageUrl={perk?.image} fallbackIcon={<Icons.BookOpen width={32} height={32} className={perk ? 'text-white' : 'text-zinc-700'} />} />
                    <div className="mt-3 text-center h-14 w-28">
                      {perk ? (
                        <>
                          <p className="text-white text-[11px] font-bold uppercase tracking-wide line-clamp-2 leading-tight">{perk.name}</p>
                          <p className="text-zinc-500 text-[9px] mt-1 truncate">{perk.owner}</p>
                        </>
                      ) : (
                        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>Empty</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </td></tr>
            {role === 'Survivor' && result.item && (
              <tr><th scope="row">Item</th><td>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 border flex items-center justify-center overflow-hidden" style={{ borderColor: 'var(--stroke)' }}>
                    <AssetFrame
                      type="Item"
                      size="fill"
                      imageUrl={result.item.image}
                      fallbackIcon={<Icons.Package width={20} height={20} className="text-white/60" />}
                    />
                  </div>
                  <div>
                    <p className="text-white font-bold">{result.item.name}</p>
                    <p className="text-xs text-zinc-500">{result.item.itemType}</p>
                  </div>
                </div>
              </td></tr>
            )}
            {(result.addons[0] || result.addons[1]) && (
              <tr><th scope="row">{role === 'Killer' ? 'Power Addons' : 'Item Addons'}</th><td>
                <div className="grid grid-cols-2 gap-3">
                  {result.addons.map((addon, i) => addon && (
                    <div key={i} className="p-3 cx-flatcard" style={{ boxShadow: getRarityGlow(addon.rarity, settings.rarityGlows !== false) }}>
                      <p className="text-white text-sm font-bold" style={{ color: getRarityColor(addon.rarity) }}>{addon.name}</p>
                      <p className="text-zinc-600 text-[10px] mt-1 line-clamp-2">{addon.description}</p>
                    </div>
                  ))}
                </div>
              </td></tr>
            )}
            {result.offering && (
              <tr><th scope="row">Offering</th><td>
                <p className="text-white font-bold">{result.offering.name}</p>
                <p className="text-zinc-500 text-xs mt-1 line-clamp-2">{result.offering.description}</p>
              </td></tr>
            )}
          </tbody></table>
        </div>
      );
      return (
        <div className="flex flex-col h-full pt-6 pb-32 px-6 overflow-y-auto custom-scrollbar space-y-4">
          <ViewCrumbs trail={[{ label: 'Main page', onClick: onBack }]} current="Chaos Shuffle" />
          <h1 className="cx-title">Chaos Shuffle</h1>
          <p className="cx-hatnote">Randomize perk combos and loadouts.</p>
          <h2 className="cx-sec">Role</h2>
          <table className="cx-wikitable"><tbody>
            <tr><th scope="row">Side</th><td>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRole('Survivor')}
                  className={`mode-choice ${role === 'Survivor' ? 'mode-choice--active' : ''} flex-1 py-2.5 text-xs font-bold uppercase tracking-wider`}
                  aria-pressed={role === 'Survivor'}
                >
                  Survivor
                </button>
                <button
                  type="button"
                  onClick={() => setRole('Killer')}
                  className={`mode-choice ${role === 'Killer' ? 'mode-choice--active' : ''} flex-1 py-2.5 text-xs font-bold uppercase tracking-wider`}
                  aria-pressed={role === 'Killer'}
                >
                  Killer
                </button>
              </div>
            </td></tr>
            <tr><th scope="row">Randomize</th><td>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setRandomizeCharacter(!randomizeCharacter)}
                  className={`cx-togglepill ${randomizeCharacter ? 'cx-togglepill--on' : ''}`}
                >
                  <span className="cx-dot" />
                  Character
                </button>
                <button
                  onClick={() => setRandomizePerks(!randomizePerks)}
                  className={`cx-togglepill ${randomizePerks ? 'cx-togglepill--on' : ''}`}
                >
                  <span className="cx-dot" />
                  Perks
                </button>
                <button
                  onClick={() => setRandomizeAddons(!randomizeAddons)}
                  className={`cx-togglepill ${randomizeAddons ? 'cx-togglepill--on' : ''}`}
                >
                  <span className="cx-dot" />
                  Addons
                </button>
                {role === 'Survivor' && (
                  <button
                    onClick={() => {
                      const newValue = !randomizeItem;
                      setRandomizeItem(newValue);
                      if (!newValue) setRandomizeAddons(false);
                    }}
                    className={`cx-togglepill ${randomizeItem ? 'cx-togglepill--on' : ''}`}
                  >
                    <span className="cx-dot" />
                    Item
                  </button>
                )}
                <button
                  onClick={() => setRandomizeOffering(!randomizeOffering)}
                  className={`cx-togglepill ${randomizeOffering ? 'cx-togglepill--on' : ''}`}
                >
                  <span className="cx-dot" />
                  Offering
                </button>
              </div>
            </td></tr>
          </tbody></table>
          {(() => {
            const lockedChar = lockedCharacterId ? characters.find(c => c.id === lockedCharacterId) : null;
            return (
              <div>
                <h2 className="cx-sec">Playing as</h2>
                <table className="cx-wikitable"><tbody>
                  <tr><th scope="row">Lock</th><td>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icons.Lock width={12} height={12} className={lockedChar ? (role === 'Killer' ? 'text-zinc-100' : 'text-zinc-100') : 'text-zinc-500'} />
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Playing As</p>
                        {lockedChar && (
                          <span className="cx-chip text-[10px] font-semibold">{lockedChar.name}</span>
                        )}
                      </div>
                      {lockedChar && (
                        <button onClick={() => setLockedCharacterId(null)} className="cx-alink text-[10px] font-bold uppercase">
                          Clear
                        </button>
                      )}
                    </div>
                    {!lockedChar ? (
                      <p className="text-zinc-600 text-[10px] mb-2">Lock a specific {role.toLowerCase()} to always play. Perks still come from your owned pool below.</p>
                    ) : (
                      <div className="flex items-center gap-3 p-2 cx-flatcard">
                        <div className="w-12 h-12 overflow-hidden border" style={{ borderColor: 'var(--stroke)' }}>
                          <AssetFrame type={role} imageUrl={lockedChar.image} size="fill" fallbackIcon={<Icons.User width={16} height={16} className="text-zinc-600" />} />
                        </div>
                        <div className="flex-1">
                          <p className="text-white text-sm font-bold">{lockedChar.name}</p>
                          {lockedChar.realName && lockedChar.realName !== lockedChar.name && (
                            <p className="text-zinc-500 text-xs">{lockedChar.realName}</p>
                          )}
                        </div>
                        <Icons.Lock width={14} height={14} className={role === 'Killer' ? 'text-zinc-100' : 'text-zinc-100'} />
                      </div>
                    )}
                    {!lockedChar && (
                      <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-1.5 mt-2 max-h-80 overflow-y-auto custom-scrollbar p-1">
                        {characters.map(char => (
                          <button
                            key={char.id}
                            onClick={() => { setLockedCharacterId(char.id); triggerHaptic('Light'); }}
                            className="cx-pooltile relative aspect-square border transition-all overflow-hidden"
                            style={{ borderColor: 'var(--stroke)' }}
                            title={`Lock ${char.name}`}
                          >
                            <AssetFrame type={role} imageUrl={char.image} size="fill" fallbackIcon={<Icons.User width={14} height={14} className="text-zinc-600" />} />
                          </button>
                        ))}
                      </div>
                    )}
                  </td></tr>
                </tbody></table>
              </div>
            );
          })()}
          <h2 className="cx-sec">Owned pool</h2>
          <table className="cx-wikitable"><tbody>
            <tr><th scope="row">Owned {role}s</th><td>
              <button
                onClick={() => setShowOwnedSection(!showOwnedSection)}
                className="w-full p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Owned {role}s</p>
                  <span className="cx-chip text-[10px]">{ownedCharacters.size}/{characters.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); selectAllCharacters(); }} className="cx-alink text-[10px] font-bold uppercase">All</button>
                  <button onClick={(e) => { e.stopPropagation(); selectNoneCharacters(); }} className="cx-alink text-[10px] font-bold uppercase">None</button>
                  <Icons.ChevronLeft width={14} height={14} className={`text-zinc-400 transition-transform ${showOwnedSection ? '-rotate-90' : 'rotate-90'}`} />
                </div>
              </button>
              {showOwnedSection && (
                <div className="px-3 pb-3 space-y-2">
                  <div className="relative">
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500"><Icons.Search width={12} height={12} /></div>
                    <input
                      value={characterSearch}
                      onChange={e => setCharacterSearch(e.target.value)}
                      placeholder="Search..."
                      className="cx-input w-full pl-7 pr-2 py-1.5 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-1.5 max-h-80 overflow-y-auto custom-scrollbar p-1">
                    {filteredCharacters.map(char => {
                      const isOwned = ownedCharacters.has(char.id);
                      return (
                        <button
                          key={char.id}
                          onClick={() => toggleCharacter(char.id)}
                          className={`cx-pooltile relative aspect-square border transition-all overflow-hidden ${isOwned ? '' : 'opacity-35 grayscale hover:opacity-60 hover:grayscale-0'}`}
                          style={{ borderColor: isOwned ? 'var(--accent)' : 'var(--stroke)' }}
                          title={char.name}
                        >
                          <AssetFrame
                            type={role}
                            imageUrl={char.image}
                            size="fill"
                            fallbackIcon={<Icons.User width={16} height={16} className="text-zinc-600" />}
                          />
                          {isOwned && (
                            <div className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full z-10" style={{ background: 'var(--accent)' }} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </td></tr>
            <tr><th scope="row">Actions</th><td>
              <div className="space-y-2 pt-2">
                <button
                  onClick={rollDice}
                  disabled={isSpinning || (ownedCharacters.size === 0 && !lockedCharacterId)}
                  className="cx-toolbtn cx-toolbtn--primary w-full py-3 uppercase tracking-widest text-sm flex items-center justify-center gap-2"
                >
                  <Icons.Dices width={18} height={18} className={isSpinning ? 'animate-spin' : ''} />
                  {isSpinning ? 'Consulting Entity...' : lockedCharacterId ? `Randomize as ${characters.find(c => c.id === lockedCharacterId)?.name || role}` : 'Randomize'}
                </button>
                {(result.character || result.perks.some(p => p)) && !isSpinning && (
                  <button
                    onClick={() => {
                      const chaosLoadout = {
                        name: `Chaos ${result.character?.name || role} Build`,
                        role: role,
                        characterId: result.character?.id || '',
                        characterName: result.character?.name || '',
                        perks: result.perks.filter(p => p !== null).map(p => ({ id: p.id, name: p.name })),
                        item: result.item?.name || '',
                        addons: result.addons.filter(a => a).map(a => a.name),
                        offering: result.offering?.name || '',
                        tags: ['chaos-shuffle'],
                        notes: 'Generated by Chaos Shuffle'
                      };
                      const code = encodeBuild(chaosLoadout);
                      if (code) {
                        navigator.clipboard.writeText(code).then(() => alert('Build share text copied!')).catch(() => alert('Could not copy automatically. Please copy it manually.'));
                      } else {
                        alert('Could not prepare this build to share.');
                      }
                    }}
                    className="cx-toolbtn cx-toolbtn--quiet w-full py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    <Icons.Share width={14} height={14} />
                    Share Build
                  </button>
                )}
              </div>
            </td></tr>
          </tbody></table>
          <div className="flex-1">
            <StandardView />
          </div>
        </div>
      );
    };
    const HomeView = ({ setView, data, theme, builds = [], maps = [], challenges = [], setBuildSeed, perks = [], setBuilds, items = [], addons = [], offerings = [], cosmeticsCatalog = { characterSwaps: [], fullSets: [] }, allCharacters = [], onOpenCharacterProfile, settings = {} }) => {
      const { killers = [], survivors = [] } = data || {};
      const [searchTerm, setSearchTerm] = useState('');
      const deferredSearchTerm = useDeferredValue(searchTerm);
      const [results, setResults] = useState([]);
      const [randomResult, setRandomResult] = useState(null);
      const [showImportModal, setShowImportModal] = useState(false);
      const [importCode, setImportCode] = useState('');
      const [importError, setImportError] = useState('');
      const [importPreview, setImportPreview] = useState(null);
      const [importWarnings, setImportWarnings] = useState([]);
      const [quickKiller, setQuickKiller] = useState(null);
      const allCharactersById = useMemo(() => {
        const map = {};
        (allCharacters || []).forEach((character) => {
          if (character?.id) map[character.id] = character;
        });
        return map;
      }, [allCharacters]);
      const { containerRef: pullRef, pullDistance, isRefreshing, pullHandlers } = usePullToRefresh(() => {
        return new Promise(resolve => setTimeout(resolve, 300));
      });;

      // Random command helpers
      const shuffleArray = (arr) => {
        const shuffled = [...arr];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      };

      const rollQuickKiller = () => {
        const killer = shuffleArray(killers)[0] || null;
        setQuickKiller(killer);
      };

      const findKiller = (query) => {
        const q = query.toLowerCase().trim().replace(/^the(?:\s+|$)/, '');
        if (!q) return null;
        const exactName = killerLookup[q];
        if (exactName) return killers.find(killer => killer.name === exactName) || null;
        const candidates = killers.filter(killer => killer.name.toLowerCase().includes(q));
        return candidates.length === 1 ? candidates[0] : null;
      };

      const findItemType = (query) => {
        const q = query.toLowerCase().trim();
        const typeMap = Object.assign(Object.create(null), {
          'medkit': 'medkit', 'med-kit': 'medkit', 'med kit': 'medkit',
          'flashlight': 'flashlight', 'torch': 'flashlight',
          'toolbox': 'toolbox', 'tool box': 'toolbox', 'tool': 'toolbox',
          'key': 'key', 'keys': 'key',
          'map': 'map', 'maps': 'map',
          'firecracker': 'firecracker', 'firecrackers': 'firecracker'
        });
        return typeMap[q] || null;
      };


      const getRandomKillerAddons = (killerName, count = 2) => {
        const killerAddons = addons.filter(a =>
          a.role === 'killer' && a.killerName === killerName
        );
        return shuffleArray(killerAddons).slice(0, count);
      };

      const getRandomItemAddons = (itemType, count = 2) => {
        const itemAddons = addons.filter(a =>
          a.role === 'survivor' && a.itemType === itemType
        );
        return shuffleArray(itemAddons).slice(0, count);
      };

      const getRandomItem = (itemType) => {
        const typeItems = items.filter(i => i.itemType === itemType && i.bloodweb === true);
        return shuffleArray(typeItems)[0] || null;
      };

      const getRandomOffering = () => {
        const available = offerings.filter(o => !o.retired);
        return shuffleArray(available)[0] || null;
      };

      const processRandomCommand = (query) => {
        const q = query.toLowerCase().trim();

        // random:killer
        if (q === 'killer' || q === 'killers') {
          const killer = shuffleArray(killers)[0] || null;
          if (killer) {
            const randomAddons = getRandomKillerAddons(killer.name);
            return { type: 'killer', killer, addons: randomAddons };
          }
        }

        // random:offering
        if (q === 'offering' || q === 'offerings') {
          const offering = getRandomOffering();
          if (offering) {
            return { type: 'offering', offering };
          }
        }

        // random:[killer name]
        const killer = findKiller(q);
        if (killer) {
          const randomAddons = getRandomKillerAddons(killer.name);
          return { type: 'killer', killer, addons: randomAddons };
        }

        // random:[item type]
        const itemType = findItemType(q);
        if (itemType) {
          const item = getRandomItem(itemType);
          const randomAddons = getRandomItemAddons(itemType);
          return { type: 'item', item, itemType, addons: randomAddons };
        }

        return null;
      };

    /* Moved to ./games/dbd/config.js (DBD adapter, loaded above). */

      const getRarityGlow = (rarity) => {
        const color = getRarityColor(rarity);
        return `0 0 12px ${color}40, 0 0 4px ${color}60`;
      };

      // Handle random: prefix in search
      useEffect(() => {
        if (searchTerm.trim().toLowerCase().startsWith('random:')) {
          const query = searchTerm.trim().slice(7).trim();
          if (query) {
            const result = processRandomCommand(query);
            setRandomResult(result);
          } else {
            setRandomResult({ type: 'help' });
          }
          setResults([]);
        } else {
          setRandomResult(null);
        }
      }, [searchTerm]);

      const rerollRandom = () => {
        if (randomResult) {
          const query = searchTerm.trim().slice(7).trim();
          const newResult = processRandomCommand(query);
          setRandomResult(newResult);
        }
      };

      const clearRandom = () => {
        setSearchTerm('');
        setRandomResult(null);
      };

      const searchableCosmetics = useMemo(() => {
        const characterSwaps = Array.isArray(cosmeticsCatalog.characterSwaps) ? cosmeticsCatalog.characterSwaps.filter((entry) => entry.status === 'ready') : [];
        const fullSets = Array.isArray(cosmeticsCatalog.fullSets) ? cosmeticsCatalog.fullSets.filter((entry) => entry.status === 'ready') : [];
        return [...characterSwaps, ...fullSets];
      }, [cosmeticsCatalog]);
      const openCosmeticProfile = (cosmetic) => {
        if (!cosmetic || !onOpenCharacterProfile) return;
        const baseCharacter = allCharactersById[cosmetic.baseCharacterId];
        if (!baseCharacter) return;
        onOpenCharacterProfile({
          ...baseCharacter,
          cosmeticFocusId: cosmetic.id
        });
      };
      const handleImportBuild = () => {
        if (!importCode.trim()) {
          setImportError('Please paste shared build text.');
          return;
        }

        const result = decodeBuild(importCode.trim(), {
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

      const confirmImport = () => {
        if (!importPreview) return;
        setBuildSeed && setBuildSeed({
          ...importPreview,
          name: importPreview.name + (importPreview.name.includes('(Imported)') ? '' : ' (Imported)'),
        });
        setShowImportModal(false);
        setImportCode('');
        setImportError('');
        setImportPreview(null);
        setImportWarnings([]);
        setView('buildLab');
      };

      const cancelImport = () => {
        setShowImportModal(false);
        setImportCode('');
        setImportError('');
        setImportPreview(null);
        setImportWarnings([]);
      };
      // ── Smart Search Engine ──
      // Rarity aliases: maps common DBD slang to internal rarity values
    /* Moved to ./games/dbd/config.js (DBD adapter, loaded above). */
      const rarityAliases = Object.assign(Object.create(null), RARITY_ALIASES);
      const IRIDESCENT_RARITIES = ['ultrarare', 'visceral'];

      // Category trigger words
      const CATEGORY_TRIGGERS = Object.assign(Object.create(null), {
        'addon': 'Addon', 'add-on': 'Addon', 'addons': 'Addon', 'add-ons': 'Addon',
        'perk': 'Perk', 'perks': 'Perk',
        'offering': 'Offering', 'offerings': 'Offering',
        'item': 'Item', 'items': 'Item',
        'killer': 'Killer', 'killers': 'Killer',
        'survivor': 'Survivor', 'survivors': 'Survivor',
        'map': 'Map', 'maps': 'Map',
        'build': 'Build', 'builds': 'Build',
        'glossary': 'Glossary',
        'icon': 'GameIcon', 'icons': 'GameIcon', 'status': 'GameIcon',
        'challenge': 'Challenge', 'challenges': 'Challenge',
        'chapter': 'Chapter',
        'legendary': 'Cosmetic', 'cosmetic': 'Cosmetic', 'cosmetics': 'Cosmetic'
      });

      // Item type aliases
      const ITEM_TYPE_ALIASES = Object.assign(Object.create(null), {
        'medkit': 'medkit', 'med-kit': 'medkit', 'med kit': 'medkit', 'medkits': 'medkit',
        'flashlight': 'flashlight', 'torch': 'flashlight', 'flashlights': 'flashlight',
        'toolbox': 'toolbox', 'tool box': 'toolbox', 'toolboxes': 'toolbox',
        'key': 'key', 'keys': 'key',
        'firecracker': 'firecracker', 'firecrackers': 'firecracker'
      });

      // Stop words to ignore during token matching (articles, question words, command filler)
      const STOP_WORDS = new Set(['the', 'a', 'an', 'that', 'this', 'with', 'for', 'and', 'but', 'or', 'of', 'to', 'in', 'on', 'is', 'it', 'has', 'his', 'her', 'its', 'your', 'you', 'yours', 'within', 'during', 'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how', 'show', 'shows', 'give', 'gives', 'find', 'finds', 'list', 'lists', 'tell', 'tells', 'me', 'my', 'are', 'was', 'were', 'be', 'been', 'being', 'do', 'does', 'did', 'done', 'can', 'could', 'should', 'would', 'will', 'shall', 'may', 'might', 'must', 'get', 'gets', 'best', 'good', 'top', 'all', 'any', 'some', 'there', 'their', 'they', 'them', 'then', 'than', 'too', 'just', 'like', 'want', 'wants', 'need', 'needs', 'use', 'uses', 'used', 'using', 'way', 'ways', 'kind', 'kinds', 'thing', 'things', 'much', 'many', 'more', 'most', 'other', 'such', 'same', 'each', 'every', 'both', 'also', 'even', 'ever', 'always', 'often', 'really', 'quite', 'please', 'vs', 'versus', 'per', 'about', 'around']);

      // Player slang → canonical description words (keys are stems; see stemWord).
      // Lets sentence queries like "perks that help heal" or "slow down generators" land.
      const MECHANIC_SYNONYMS = Object.assign(Object.create(null), {
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

      // Negation markers: the next meaningful token is excluded, not searched
      // ("perks that are not hex", "addons without hindered")
      const NEGATION_WORDS = new Set(['not', 'no', 'without', 'except', 'excluding', 'exclude']);

      // Light stemmer so inflections meet ("generators" ↔ "generator", "chasing" ↔ "chase").
      // Applied to BOTH query tokens and description words, so both sides always agree.
      const stemWord = (w) => {
        if (!w || w.length <= 2) return w;
        if (w.endsWith('ies') && w.length > 5) return w.slice(0, -3) + 'y';
        if (w.endsWith('ness') && w.length > 7) return w.slice(0, -4);
        if (w.endsWith('ing') && w.length > 6) {
          const base = w.slice(0, -3);
          if (base.length >= 4) return base;
          return w;
        }
        if (w.endsWith('ed') && w.length > 4) {
          const base = w.slice(0, -2);
          if (base.length >= 2) return base;
          return w;
        }
        if (w.endsWith('oes') && w.length > 4) return w.slice(0, -2);
        // Strip plural -es only when the base takes -es (box→boxes); a vowel before
        // -ses means plain -s plural (nurse→nurses, horse→horses), handled below.
        if (/[^aeiou](s|x|z|ch|sh)es$/.test(w) && w.length > 5) return w.slice(0, -2);
        if (w.endsWith('s') && w.length > 4 && !/(ss|us|is)$/.test(w)) return w.slice(0, -1);
        if (w.endsWith('e') && w.length > 4 && /[^aeiou]$/.test(w.slice(0, -1)) && !w.endsWith('ee')) return w.slice(0, -1);
        return w;
      };

      // Mechanic words belong in descriptions; do not run proper-name typo matching on them.
      const mechanicStems = useMemo(() => new Set([
        ...Object.keys(MECHANIC_SYNONYMS), ...Object.values(MECHANIC_SYNONYMS).flat()
      ].map(stemWord)), []);

      // Bounded Levenshtein distance (early exit past max) for typo tolerance
      const editDistance = (a, b, max) => {
        if (Math.abs(a.length - b.length) > max) return max + 1;
        let prev = new Array(b.length + 1);
        let cur = new Array(b.length + 1);
        for (let j = 0; j <= b.length; j++) prev[j] = j;
        for (let i = 1; i <= a.length; i++) {
          cur[0] = i;
          let rowMin = i;
          for (let j = 1; j <= b.length; j++) {
            cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
            if (cur[j] < rowMin) rowMin = cur[j];
          }
          if (rowMin > max) return max + 1;
          const tmp = prev; prev = cur; cur = tmp;
        }
        return prev[b.length];
      };

      // Best lookup value within typo range (distance 1, or 2 for tokens of 7+ chars).
      // Short tokens must not resolve to a SHORTER key: 'ruin' is a real word,
      // not a typo of 'rin'. Dropped-letter typos ('nuse' → 'nurse') still work
      // because the key is longer than the token.
      const fuzzyLookup = (token, lookup) => {
        const max = token.length >= 7 ? 2 : 1;
        let bestVal = null;
        let bestDist = max + 1;
        for (const key of Object.keys(lookup)) {
          if (token.length <= 5 && key.length < token.length) continue;
          const d = editDistance(token, key, max);
          if (d < bestDist) { bestDist = d; bestVal = lookup[key]; }
        }
        return bestDist <= max ? bestVal : null;
      };

      // Build killer lookup from data (handles "nurse" → "The Nurse", "sally" → "The Nurse", etc.)
      const buildKillerLookup = () => {
        const lookup = Object.create(null);
        (data.killers || []).forEach(k => {
          const name = k.name.toLowerCase();
          const shortName = name.replace(/^the\s+/, '');
          lookup[name] = k.name;
          lookup[shortName] = k.name;
          if (k.realName) {
            const realLower = k.realName.toLowerCase();
            lookup[realLower] = k.name;
            // Also first name only (e.g., "sally" for "Sally Smithson")
            const firstName = realLower.split(' ')[0];
            if (firstName.length > 2) lookup[firstName] = k.name;
          }
        });
        return lookup;
      };

      // Build survivor lookup
      const buildSurvivorLookup = () => {
        const lookup = Object.create(null);
        (data.survivors || []).forEach(s => {
          const name = s.name.toLowerCase();
          lookup[name] = s.name;
          const firstName = name.split(' ')[0];
          if (firstName.length > 2) lookup[firstName] = s.name;
        });
        return lookup;
      };

      const killerLookup = useMemo(() => buildKillerLookup(), [data.killers]);
      const survivorLookup = useMemo(() => buildSurvivorLookup(), [data.survivors]);

      // Score a single item against parsed search context
      const scoreItem = (item, tokens, context) => {
        let score = 0;
        const { nameLower, descLower, descPositions, nameWords } = item._search;

        // ── Exact full-query substring match in name (classic search behavior) ──
        const fullQuery = context.fullQuery;
        if (fullQuery) {
          if (nameLower === fullQuery) score += 100;
          else if (nameLower.includes(fullQuery)) score += 50;
        }

        // ── Per-token name matching (exact + typo-tolerant fuzzy fallback) ──
        let exactHits = 0;
        let fuzzyHits = 0;
        for (const t of tokens) {
          if (nameLower.includes(t)) { exactHits++; continue; }
          if (context.fuzzyNameTokens.has(t)) {
            const max = t.length >= 7 ? 2 : 1;
            let matches = context.fuzzyNameMatches.get(t);
            if (!matches) { matches = new Map(); context.fuzzyNameMatches.set(t, matches); }
            if (nameWords.some(word => {
              if (t.length <= 5 && word.length < t.length) return false;
              if (!matches.has(word)) matches.set(word, editDistance(t, word, max) <= max);
              return matches.get(word);
            })) fuzzyHits++;
          }
        }
        const nameTokenHits = exactHits + fuzzyHits;
        if (nameTokenHits > 0) score += exactHits * 8 + fuzzyHits * 5;
        if (tokens.length > 0 && nameTokenHits === tokens.length) score += 15; // all tokens in name

        // ── Killer name match (naming the exact character is top intent) ──
        if (context.killerName) {
          if (item.killerName === context.killerName) score += 20;
          if (item.owner === context.killerName) score += 20;
          if ((item.name || '') === context.killerName) score += 50;
        }

        // ── Survivor name match (naming the exact character is top intent) ──
        if (context.survivorName) {
          if (item.owner === context.survivorName) score += 20;
          if ((item.name || '') === context.survivorName) score += 50;
        }

        // ── Rarity match ──
        if (context.rarity) {
          const itemRarity = (item.rarity || '').toLowerCase();
          if (context.rarity === 'iridescent') {
            if (IRIDESCENT_RARITIES.includes(itemRarity)) score += 15;
          } else if (itemRarity === context.rarity) {
            score += 15;
          }
        }

        // ── Category match ──
        if (context.category && item._category === context.category) score += 10;

        // ── Item type match ──
        if (context.itemType) {
          if (item.itemType === context.itemType) score += 15;
        }

        // ── Role match (perks carry `type`, most others carry `role`) ──
        if (context.role) {
          const itemRole = (item.role || item.type || '').toLowerCase();
          if (itemRole === context.role) score += 5;
        }

        // ── Alias match (perks, cosmetics): exact alias === full query is strong,
        // a substring mention is weak. Counted once - some entries carry 7+
        // aliases and per-alias stacking drowned out exact character matches.
        const { aliases, aliasText } = item._search;
        if (aliases.length) {
          const aliasFullBonus = fullQuery && aliases.includes(fullQuery) ? 40
            : fullQuery && aliasText.includes(fullQuery) ? 15 : 0;
          let aliasTokenBonus = 0;
          for (const token of context.descTokens) {
            if (token.length < 2 || !aliasText.includes(token)) continue;
            for (const alias of aliases) {
              if (alias.includes(token)) aliasTokenBonus += 5;
              if (aliasTokenBonus >= 10) break;
            }
            if (aliasTokenBonus >= 10) break;
          }
          score += aliasFullBonus + Math.min(aliasTokenBonus, 10);
        }

        // ── Description token matching: word-boundary on stems (primary) ──
        // Query and text are both stemmed, so "generators" meets "generator"
        // and "chasing" meets "chase". A weak substring fallback preserves
        // recall for anything the stemmer misses, without its old noise weight.
        const matchedPositions = new Set();
        let descHits = 0;
        for (const t of context.descTokens) {
          let firstPosition = Infinity;
          for (const word of context.matchingDescStems.get(t) || []) {
            const position = descPositions.get(word);
            if (position !== undefined && position < firstPosition) firstPosition = position;
          }
          if (firstPosition !== Infinity) { descHits++; matchedPositions.add(firstPosition); continue; }
          if (t.length >= 3 && descLower.includes(t)) score += 1;
        }
        if (descHits > 0) {
          score += descHits * 4;
          // Bonus for matching most description tokens
          if (descHits >= context.descTokens.length * 0.7) score += 8;
        }

        // ── Synonym matches (player slang expanded in parseSmartQuery) ──
        if (context.synTokens && context.synTokens.length > 0) {
          let synHits = 0;
          for (const t of context.synTokens) {
            if (descPositions.has(t)) synHits++;
          }
          if (synHits > 0) score += Math.min(synHits, 4) * 2;
        }

        // ── Proximity bonus: query words appearing close together mean more ──
        if (matchedPositions.size >= 2) {
          const pos = [...matchedPositions].sort((a, b) => a - b);
          let minGap = Infinity;
          for (let i = 1; i < pos.length; i++) minGap = Math.min(minGap, pos[i] - pos[i - 1]);
          if (minGap <= 8) score += 10;
        }

        // ── Power field match (killers) ──
        if (item.power) {
          const powerLower = item.power.toLowerCase();
          for (const t of context.descTokens) {
            if (powerLower.includes(t)) score += 3;
          }
        }

        // Each query token earns at most one tag/perk bonus per item.
        for (const token of tokens) {
          if ((item.tags || []).some(tag => tag.toLowerCase().includes(token))) score += 6;
          if (Array.isArray(item.perks) && item.perks.some(perk => (perk.name || '').toLowerCase().includes(token))) score += 5;
        }

        // ── Realm match (maps) ──
        if (item.realm) {
          const realmLower = item.realm.toLowerCase();
          for (const t of tokens) {
            if (realmLower.includes(t)) score += 6;
          }
        }

        return score;
      };

      // Parse the search query into structured context
      const parseSmartQuery = (rawQuery) => {
        // Strip edge punctuation so "repair?", "(hex)" and '"ruin"' match cleanly
        const tokens = rawQuery.toLowerCase().split(/\s+/).map(t => t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')).filter(t => t.length > 0);
        const meaningfulTokens = tokens.filter(t => !STOP_WORDS.has(t) && t.length > 1);

        const context = {
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

        const usedTokens = new Set();

        // Consume the entire excluded phrase, including compound rarities and names.
        for (let i = 0; i < meaningfulTokens.length; i++) {
          const token = meaningfulTokens[i];
          if (!NEGATION_WORDS.has(token) || usedTokens.has(token)) continue;
          usedTokens.add(token);
          const next = meaningfulTokens[i + 1];
          if (!next) continue;
          const pair = meaningfulTokens.slice(i + 1, i + 3).join(' ');
          const raw = rarityAliases[pair] || killerLookup[pair] || survivorLookup[pair] ? pair : next;
          raw.split(' ').forEach(part => usedTokens.add(part));
          context.excluded.push({ raw, stem: stemWord(raw), rarity: rarityAliases[raw] || null });
        }

        // Multi-word detection for two-word killer names (e.g., "pig" resolves fine, but check combos)
        for (let i = 0; i < meaningfulTokens.length; i++) {
          const t = meaningfulTokens[i];
          if (usedTokens.has(t)) continue;
          const twoWord = i + 1 < meaningfulTokens.length ? t + ' ' + meaningfulTokens[i + 1] : null;

          // Check two-word combos first
          if (twoWord && killerLookup[twoWord]) {
            context.killerName = killerLookup[twoWord];
            usedTokens.add(t);
            usedTokens.add(meaningfulTokens[i + 1]);
            continue;
          }
          if (twoWord && survivorLookup[twoWord]) {
            context.survivorName = survivorLookup[twoWord];
            usedTokens.add(t);
            usedTokens.add(meaningfulTokens[i + 1]);
            continue;
          }
          // Check rarity combos like "very rare", "ultra rare"
          if (twoWord && rarityAliases[twoWord]) {
            context.rarity = rarityAliases[twoWord];
            usedTokens.add(t);
            usedTokens.add(meaningfulTokens[i + 1]);
          }
        }

        // Single-word detection
        for (const t of meaningfulTokens) {
          if (usedTokens.has(t)) continue;

          if (t === 'killer' || t === 'survivor' || t === 'killers' || t === 'survivors') {
            context.role = t.startsWith('killer') ? 'killer' : 'survivor';
            if (!context.category) context.category = t.startsWith('killer') ? 'Killer' : 'Survivor';
            usedTokens.add(t);
            continue;
          }
          if (CATEGORY_TRIGGERS[t]) {
            if (!context.category || ['Killer', 'Survivor'].includes(context.category)) context.category = CATEGORY_TRIGGERS[t];
            usedTokens.add(t);
            continue;
          }
          if (rarityAliases[t]) {
            context.rarity = rarityAliases[t];
            usedTokens.add(t);
            continue;
          }
          if (ITEM_TYPE_ALIASES[t]) {
            context.itemType = ITEM_TYPE_ALIASES[t];
            usedTokens.add(t);
            continue;
          }

          // Killer name (exact, then typo-tolerant fuzzy fallback)
          if (!context.killerName) {
            const exact = killerLookup[t];
            const fuzzy = !exact && !mechanicStems.has(stemWord(t)) && t.length >= 4 ? fuzzyLookup(t, killerLookup) : null;
            if (exact || fuzzy) {
              context.killerName = exact || fuzzy;
              usedTokens.add(t);
              continue;
            }
          }

          // Survivor name (exact, then typo-tolerant fuzzy fallback)
          if (!context.survivorName) {
            const exact = survivorLookup[t];
            const fuzzy = !exact && !mechanicStems.has(stemWord(t)) && t.length >= 4 ? fuzzyLookup(t, survivorLookup) : null;
            if (exact || fuzzy) {
              context.survivorName = exact || fuzzy;
              usedTokens.add(t);
              continue;
            }
          }
        }

        // Remaining meaningful tokens become description search words (stemmed so
        // inflections meet), expanded with player-slang synonyms at lower weight
        const leftover = meaningfulTokens.filter(t => !usedTokens.has(t) && !STOP_WORDS.has(t));
        context.descTokens = [...new Set(leftover.map(stemWord))];
        for (const t of leftover) {
          const key = stemWord(t);
          const syns = MECHANIC_SYNONYMS[key];
          if (!syns) continue;
          for (const s of syns) {
            const ss = stemWord(s);
            if (ss !== key && !context.descTokens.includes(ss) && !context.synTokens.includes(ss)) context.synTokens.push(ss);
          }
        }

        context.characterIntent = !context.category && !context.rarity && !context.itemType
          && !leftover.length && !context.excluded.length && !!(context.killerName || context.survivorName);
        return { tokens: [...new Set(meaningfulTokens.filter(token => !NEGATION_WORDS.has(token)
          && !context.excluded.some(ex => ex.raw.split(' ').includes(token))))], context };
      };

      const searchIndex = useMemo(() => {
        // ── Build flat list of all searchable items ──
        const allItems = [];
        // Filter out unresolved localization entries (@# prefixed) and disabled content
        const isValidEntry = (entry) => {
          if ((entry.name || '').startsWith('@#')) return false;
          if ((entry.description || '').startsWith('@#') && !(entry.name || '').trim()) return false;
          if (Array.isArray(entry.parents) && entry.parents.includes('DISABLED')) return false;
          return true;
        };

        if (data.killers) {
          data.killers.forEach(k => allItems.push({ ...k, _category: 'Killer' }));
        }
        if (data.survivors) {
          data.survivors.forEach(s => allItems.push({ ...s, _category: 'Survivor' }));
        }
        if (data.perks) {
          data.perks.forEach(p => allItems.push({ ...p, _category: 'Perk' }));
        }
        builds.forEach(b => allItems.push({ ...b, _category: 'Build' }));
        maps.forEach(m => allItems.push({ ...m, _category: 'Map' }));
        (challenges || []).forEach(ch => allItems.push({ ...ch, _category: 'Challenge' }));
        items.filter(isValidEntry).forEach(i => allItems.push({ ...i, _category: 'Item' }));
        addons.filter(isValidEntry).forEach(a => allItems.push({ ...a, _category: 'Addon' }));
        offerings.filter(o => !o.retired).forEach(o => allItems.push({ ...o, _category: 'Offering' }));
        GAME_ICONS.forEach(icon => allItems.push({ ...icon, iconCategory: icon.category, _category: 'GameIcon', name: icon.name }));
        GLOSSARY.forEach(section => {
          section.items.forEach(item => allItems.push({ ...item, _category: 'Glossary', name: item.term, section: section.section }));
        });
        if (typeof TIMELINE_DATA !== 'undefined' && TIMELINE_DATA.releases) {
          const allReleases = TIMELINE_DATA.getChronological();
          allReleases.forEach(release => allItems.push({
            ...release,
            _category: 'Chapter',
            name: release.name,
            chapterNumber: release.chapterNumber,
            displayDate: release.displayDate
          }));
        }
        searchableCosmetics.forEach((cosmetic) => allItems.push({
          ...cosmetic,
          _category: 'Cosmetic',
          description: cosmetic.isCharacterSwap
            ? `Character swaps outfit for ${cosmetic.baseCharacterName}`
            : `${cosmetic.collectionName || cosmetic.sourceBucket || cosmetic.rarity || 'Cosmetic'} ${cosmetic.pieceType || 'cosmetic'} for ${cosmetic.baseCharacterName}${cosmetic.bindSummary ? ` (${cosmetic.bindSummary})` : ''}`
        }));

        return allItems.map(item => {
          const nameLower = (item.name || item.term || '').toLowerCase();
          const descLower = String(item._category === 'Perk' ? getPerkSearchDescription(item) : (item.description || item.def || item.power || '')).toLowerCase();
          const descStems = (descLower.match(/[a-z0-9]+/g) || []).map(stemWord);
          const descPositions = new Map();
          descStems.forEach((word, index) => { if (!descPositions.has(word)) descPositions.set(word, index); });
          const aliases = (item.aliases || []).map(alias => alias.toLowerCase());
          return { ...item, _search: { nameLower, descLower, descPositions, aliases, aliasText: aliases.join('\0'), nameWords: nameLower.match(/[a-z0-9]+/g) || [nameLower] } };
        });
      }, [data.killers, data.survivors, data.perks, builds, maps, challenges, items, addons, offerings, searchableCosmetics]);

      const descriptionVocabulary = useMemo(() => [...new Set(searchIndex.flatMap(item => [...item._search.descPositions.keys()]))], [searchIndex]);

      useEffect(() => {
        if (!deferredSearchTerm.trim() || deferredSearchTerm.trim().toLowerCase().startsWith('random:')) {
          setResults([]);
          return;
        }

        const parseSearch = (input) => {
          const prefixes = ['killers:', 'survivors:', 'perks:', 'builds:', 'maps:', 'items:', 'addons:', 'offerings:', 'glossary:', 'icons:', 'challenges:', 'chapter:', 'legendary:', 'cosmetics:'];
          input = input.trim();
          const lowerInput = input.toLowerCase();
          for (const prefix of prefixes) {
            if (lowerInput.startsWith(prefix)) {
              return { filter: prefix.slice(0, -1), term: input.slice(prefix.length).trim().toLowerCase() };
            }
          }
          return { filter: null, term: input.toLowerCase() };
        };

        const { filter, term } = parseSearch(deferredSearchTerm);
        const categoryByPrefix = { killers: 'Killer', survivors: 'Survivor', perks: 'Perk', builds: 'Build', maps: 'Map', items: 'Item', addons: 'Addon', offerings: 'Offering', glossary: 'Glossary', icons: 'GameIcon', challenges: 'Challenge', chapter: 'Chapter', legendary: 'Cosmetic', cosmetics: 'Cosmetic' };

        // ── Smart score every item ──
        const queryText = (filter ? term : deferredSearchTerm).trim().toLowerCase();
        let { tokens, context } = parseSmartQuery(queryText);
        // Within a scoped content search, killer/survivor describe role.
        if (filter && !['killers', 'survivors'].includes(filter) && ['Killer', 'Survivor'].includes(context.category)) context.category = null;
        // Exact catalog titles can contain command words (Sole Survivor, No Mither).
        // Preserve them before interpreting those words as filters or negation.
        if (searchIndex.some(item => item._search.nameLower === queryText)
          && (queryText.includes(' ') || !CATEGORY_TRIGGERS[queryText])) {
          tokens = queryText.split(/\s+/);
          context = { ...context, category: null, role: null, itemType: null, rarity: null, excluded: [], descTokens: [], synTokens: [] };
        }
        if (!tokens.length && !filter && !context.excluded.length) {
          setResults([]);
          return;
        }
        context.fullQuery = tokens.join(' ');
        context.fuzzyNameTokens = new Set(tokens.filter(token => token.length >= 4 && !mechanicStems.has(stemWord(token))));
        // Resolve description prefixes once per query, then use constant-time position lookups.
        context.matchingDescStems = new Map(context.descTokens.map(token => [token,
          descriptionVocabulary.filter(word => word === token || (token.length >= 4 && word.startsWith(token)))
        ]));
        const matchesRarity = (item, rarity) => rarity === 'iridescent'
          ? IRIDESCENT_RARITIES.includes((item.rarity || '').toLowerCase()) : (item.rarity || '').toLowerCase() === rarity;
        const scored = searchIndex
          .filter(item => (!filter || item._category === categoryByPrefix[filter])
            && (!context.category || item._category === context.category)
            && (!context.itemType || item.itemType === context.itemType)
            && (!context.rarity || matchesRarity(item, context.rarity))
            && (!context.role || (item.role || item.type || item.baseCharacterType || item._category).toLowerCase() === context.role)
            && !context.excluded.some(ex => ex.rarity ? matchesRarity(item, ex.rarity)
              : item._search.nameLower.includes(ex.raw) || item._search.descPositions.has(ex.stem)
                || (item._category || '').toLowerCase() === (CATEGORY_TRIGGERS[ex.raw] || ex.raw).toLowerCase()))
          .map(item => {
            const s = filter && !term ? 1 : scoreItem(item, tokens, context);
            return s > 0 ? { ...item, category: item._category, _score: s } : null;
          })
          .filter(Boolean);

        // Sort by score descending, then alphabetically as tiebreaker
        // A bare character name means the entity, even when a cosmetic has that exact name.
        // Explicit cosmetic/category terms disable this priority.
        const characterPriority = item => context.characterIntent && (
          (item._category === 'Killer' && item.name === context.killerName)
          || (item._category === 'Survivor' && item.name === context.survivorName)) ? 1 : 0;
        scored.sort((a, b) => characterPriority(b) - characterPriority(a) || b._score - a._score || (a.name || '').localeCompare(b.name || ''));

        setResults(scored.slice(0, 50));
      }, [deferredSearchTerm, searchIndex, descriptionVocabulary, killerLookup, survivorLookup]);
      const visiblePerks = data?.perks || perks || [];
      const readyCosmeticCount = searchableCosmetics.length;
      return (
        <div ref={pullRef} {...pullHandlers} className="relative flex flex-col h-full px-4 sm:px-6 pt-6 sm:pt-8 pb-32 overflow-y-auto custom-scrollbar">
          <PullIndicator pullDistance={pullDistance} threshold={80} isRefreshing={isRefreshing} />
          <div className="px-0 sm:px-6 pb-4 pt-4 pointer-events-none">
            <div className="relative max-w-3xl mx-auto pointer-events-auto">
              <div className="absolute inset-0 bg-zinc-500 rounded-3xl blur-2xl opacity-0 transition-opacity duration-500"></div>
              <div className="relative flex items-center bg-white/5 border border-white/15 rounded-lg p-2">
                <div className="pl-4 text-zinc-400"><Icons.Search width={18} height={18} /></div>
                <input type="text" className="w-full bg-transparent text-white p-3 text-sm sm:text-base font-medium placeholder-zinc-600 focus:outline-none" id="home-search-input" aria-label="Search the wiki" placeholder="Search perks, killers, maps, builds..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                {searchTerm && <button onClick={() => setSearchTerm('')} className="p-2 mr-1 rounded-xl bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"><Icons.X width={18} height={18} /></button>}
              </div>
            </div>
          </div>
          <div className="home-command mt-2 pb-24">
            {/* Random Result Display */}
            {randomResult && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {randomResult.type === 'help' && (
                  <div className="p-6 rounded-3xl bg-white/5 border border-white/25/20">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-xl bg-zinc-500/15">
                        <Icons.Dices width={24} height={24} className="text-zinc-100" />
                      </div>
                      <h3 className="text-lg font-bold text-white">Quick Random</h3>
                    </div>
                    <p className="text-sm text-zinc-400 mb-4">Generate random addons and offerings instantly!</p>
                    <div className="space-y-2 text-xs">
                      <p className="text-zinc-300"><span className="text-zinc-100 font-mono">random:killer</span> - Random killer + 2 addons</p>
                      <p className="text-zinc-300"><span className="text-zinc-100 font-mono">random:trapper</span> - 2 random Trapper addons</p>
                      <p className="text-zinc-300"><span className="text-zinc-100 font-mono">random:huntress</span> - 2 random Huntress addons</p>
                      <p className="text-zinc-300"><span className="text-zinc-100 font-mono">random:medkit</span> - Random Med-Kit + 2 addons</p>
                      <p className="text-zinc-300"><span className="text-zinc-100 font-mono">random:toolbox</span> - Random Toolbox + 2 addons</p>
                      <p className="text-zinc-300"><span className="text-zinc-100 font-mono">random:offering</span> - 1 random offering</p>
                    </div>
                  </div>
                )}

                {randomResult.type === 'killer' && (
                  <div className="p-5 rounded-3xl bg-white/5 border border-white/25/20 shadow-lg shadow-white/5">
                    <div className="flex items-center gap-4 mb-4">
                      <AssetFrame type="Killer" imageUrl={randomResult.killer.image} fallbackIcon={<Icons.User width={28} height={28} className="text-zinc-500" />} />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-100 mb-1">Killer Addons</p>
                        <h3 className="text-xl font-bold text-white">{randomResult.killer.name}</h3>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {randomResult.addons.map((addon, idx) => (
                        <div
                          key={addon.id || idx}
                          className="p-3 rounded-xl bg-white/5 border border-white/5"
                          style={{ boxShadow: getRarityGlow(addon.rarity) }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden">
                              <AssetFrame type="Addon" imageUrl={addon.image} size="fill" fallbackIcon={<Icons.Wrench width={16} height={16} className="text-white/40" />} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm" style={{ color: getRarityColor(addon.rarity) }}>{addon.name}</p>
                              <p className="text-zinc-500 text-xs mt-1 line-clamp-2">{addon.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button onClick={rerollRandom} className="flex-1 py-2.5 rounded-xl bg-white/10 border border-white/20 text-zinc-100 text-xs font-bold uppercase tracking-wider hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
                        <Icons.Dices width={14} height={14} /> Re-roll
                      </button>
                      <button onClick={clearRandom} className="py-2.5 px-4 rounded-xl bg-white/5 border border-white/10 text-zinc-400 text-xs font-bold uppercase tracking-wider hover:bg-white/10 transition-colors">
                        <Icons.X width={14} height={14} />
                      </button>
                    </div>
                  </div>
                )}

                {randomResult.type === 'item' && (
                  <div className="p-5 rounded-3xl bg-white/5 border border-white/15 shadow-lg shadow-white/5">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                        <AssetFrame type="Item" imageUrl={randomResult.item?.image} size="fill" fallbackIcon={<Icons.Package width={24} height={24} className="text-zinc-500" />} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Item Addons</p>
                        <h3 className="text-xl font-bold text-white">{randomResult.item?.name || randomResult.itemType}</h3>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {randomResult.addons.map((addon, idx) => (
                        <div
                          key={addon.id || idx}
                          className="p-3 rounded-xl bg-white/5 border border-white/5"
                          style={{ boxShadow: getRarityGlow(addon.rarity) }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden">
                              <AssetFrame type="Addon" imageUrl={addon.image} size="fill" fallbackIcon={<Icons.Wrench width={16} height={16} className="text-white/40" />} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm" style={{ color: getRarityColor(addon.rarity) }}>{addon.name}</p>
                              <p className="text-zinc-500 text-xs mt-1 line-clamp-2">{addon.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button onClick={rerollRandom} className="flex-1 py-2.5 rounded-xl bg-white/10 border border-white/20 text-zinc-100 text-xs font-bold uppercase tracking-wider hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
                        <Icons.Dices width={14} height={14} /> Re-roll
                      </button>
                      <button onClick={clearRandom} className="py-2.5 px-4 rounded-xl bg-white/5 border border-white/10 text-zinc-400 text-xs font-bold uppercase tracking-wider hover:bg-white/10 transition-colors">
                        <Icons.X width={14} height={14} />
                      </button>
                    </div>
                  </div>
                )}

                {randomResult.type === 'offering' && (
                  <div className="p-5 rounded-3xl bg-amber-900/25 border border-white/15 shadow-lg shadow-white/5">
                    <div className="flex flex-col items-center text-center">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-200 mb-3">Random Offering</p>
                      <div
                        className="w-20 h-20 rounded-2xl overflow-hidden mb-3"
                        style={{ boxShadow: getRarityGlow(randomResult.offering.rarity) }}
                      >
                        <AssetFrame type="Offering" imageUrl={randomResult.offering.image} size="fill" fallbackIcon={<Icons.Flame width={32} height={32} className="text-zinc-500" />} />
                      </div>
                      <h3 className="text-lg font-bold" style={{ color: getRarityColor(randomResult.offering.rarity) }}>{randomResult.offering.name}</h3>
                      <p className="text-zinc-500 text-xs mt-2 max-w-xs line-clamp-3">{randomResult.offering.description}</p>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button onClick={rerollRandom} className="flex-1 py-2.5 rounded-xl bg-white/10 border border-white/20 text-zinc-100 text-xs font-bold uppercase tracking-wider hover:bg-white/15 transition-colors flex items-center justify-center gap-2">
                        <Icons.Dices width={14} height={14} /> Re-roll
                      </button>
                      <button onClick={clearRandom} className="py-2.5 px-4 rounded-xl bg-white/5 border border-white/10 text-zinc-400 text-xs font-bold uppercase tracking-wider hover:bg-white/10 transition-colors">
                        <Icons.X width={14} height={14} />
                      </button>
                    </div>
                  </div>
                )}

                {!randomResult.type && (
                  <div className="p-5 rounded-3xl bg-zinc-900/60 border border-white/10 text-center">
                    <Icons.AlertCircle width={32} height={32} className="text-zinc-600 mx-auto mb-2" />
                    <p className="text-zinc-400 text-sm">No match found for "<span className="text-white">{searchTerm.slice(7)}</span>"</p>
                    <p className="text-zinc-600 text-xs mt-1">Try a killer name (trapper, huntress) or item type (medkit, toolbox)</p>
                  </div>
                )}
              </div>
            )}

            {/* Regular search results */}
            {searchTerm && !randomResult ? (
              <div className="space-y-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-6 px-2">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    {results.length} Matches
                    {searchTerm.includes(':') && <span className="ml-2 text-zinc-600">• {searchTerm.split(':')[0]} filter</span>}
                  </span>
                  {results.length > 0 && results[0]._score >= 20 && searchTerm.split(/\s+/).length >= 2 && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-100 bg-white/10 border border-white/20 px-2 py-1 rounded-lg">Best Match ↓</span>
                  )}
                </div>
                {results.length > 0 ? results.map((item, idx) => {
                  const isBestMatch = idx === 0 && item._score >= 20 && searchTerm.split(/\s+/).length >= 2;
                  const wrapBest = (el) => isBestMatch ? (
                    <div key={'best-' + (item.id || item.name || idx)} className="ring-1 ring-sky-500/30 rounded-2xl shadow-lg shadow-sky-500/5">
                      {el}
                    </div>
                  ) : el;
                  if (['Killer', 'Survivor', 'Perk'].includes(item.category)) {
                    return wrapBest(<GlassCard key={item.id || Math.random()} item={item} category={item.category} settings={settings} />);
                  }
                  if (item.category === 'Cosmetic') {
                    return wrapBest(
                      <div key={item.id || item.name} className="p-3 rounded-2xl bg-zinc-900/60 border border-white/10 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex-shrink-0 overflow-hidden">
                          <AssetFrame type={item.baseCharacterType} size="fill" imageUrl={item.image} fallbackIcon={<Icons.User width={18} height={18} className="text-white/40" />} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-bold text-sm">{item.name}</p>
                          <p className="text-[11px] text-zinc-500 uppercase tracking-wider">{item.isCharacterSwap ? 'Character swaps' : `${item.pieceType || 'Cosmetic'} Cosmetic`}</p>
                          <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                            {item.isCharacterSwap
                              ? `Character swaps outfit for ${item.baseCharacterName}`
                              : `${item.collectionName || item.sourceBucket || item.rarity || 'Cosmetic'} ${item.pieceType || 'cosmetic'} for ${item.baseCharacterName}${item.bindSummary ? ` (${item.bindSummary})` : ''}`}
                          </p>
                        </div>
                        <button
                          onClick={() => openCosmeticProfile(item)}
                          className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white"
                        >
                          Open
                        </button>
                      </div>
                    );
                  }
                  if (item.category === 'Build') {
                    return wrapBest(
                      <div key={item.id || item.name} className="p-3 rounded-2xl bg-zinc-900/60 border border-white/10">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">Build</span>
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${item.role === 'Killer' ? 'bg-white/10 text-zinc-100' : 'bg-white/5 text-zinc-300'}`}>{item.role}</span>
                        </div>
                        <p className="text-white font-bold">{item.name}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(item.perks || []).slice(0, 4).map(p => <span key={p.name} className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white">{p.name}</span>)}
                        </div>
                        <button onClick={() => { setBuildSeed && setBuildSeed(item); setView('buildLab'); }} className="mt-2 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white">Open in Build Lab</button>
                      </div>
                    );
                  }
                  if (item.category === 'Map') {
                    return wrapBest(
                      <div key={item.id || item.name} className="p-3 rounded-2xl bg-zinc-900/60 border border-white/10 flex items-center justify-between">
                        <div>
                          <p className="text-white font-bold text-sm">{item.name}</p>
                          <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Map</p>
                        </div>
                        <button onClick={() => setView('realms', { search: item.name })} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white">Open maps</button>
                      </div>
                    );
                  }
                  if (item.category === 'Challenge') {
                    return wrapBest(
                      <div key={item.id} className="p-3 rounded-2xl bg-zinc-900/60 border border-white/10">
                        <p className="text-white font-bold">{item.name}</p>
                        <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Challenge</p>
                        {item.tags?.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{item.tags.map(t => <span key={t} className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] text-zinc-300 uppercase tracking-wider">{t}</span>)}</div>}
                        <button onClick={() => setView('progression', { tab: 'challenges' })} className="mt-2 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white">Open challenges</button>
                      </div>
                    );
                  }
                  if (item.category === 'Item') {
                    return wrapBest(
                      <div key={item.id || item.name} className="p-3 rounded-2xl bg-zinc-900/60 border border-white/10 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex-shrink-0 overflow-hidden">
                          <AssetFrame type="Item" size="fill" imageUrl={item.image} fallbackIcon={<Icons.Package width={16} height={16} className="text-white/40" />} />
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-bold text-sm">{item.name}</p>
                          <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Item • {item.itemType || 'Unknown'}</p>
                        </div>
                        <button onClick={() => setView('items', { search: item.name, mode: 'survivor', targetId: item.id, targetType: 'item' })} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white">Open</button>
                      </div>
                    );
                  }
                  if (item.category === 'Addon') {
                    const isKillerAddon = item.role === 'killer';
                    const searchQuery = item.name || (isKillerAddon ? (item.killerName || '') : (item.itemType || ''));
                    const addonMode = isKillerAddon ? 'killer' : 'survivor';
                    return wrapBest(
                      <div key={item.id || item.name} className="p-3 rounded-2xl bg-zinc-900/60 border border-white/10 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex-shrink-0 overflow-hidden">
                          <AssetFrame type="Addon" size="fill" imageUrl={item.image} fallbackIcon={<Icons.Wrench width={16} height={16} className="text-white/40" />} />
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-bold text-sm">{item.name}</p>
                          <p className="text-[11px] text-zinc-500 uppercase tracking-wider">
                            {isKillerAddon ? 'Killer' : 'Survivor'} Addon{item.killerName ? ` • ${item.killerName}` : item.itemType ? ` • ${item.itemType}` : ''}
                          </p>
                        </div>
                        <button onClick={() => setView('items', { search: searchQuery, mode: addonMode, targetId: item.id, targetType: 'addon' })} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white">Open</button>
                      </div>
                    );
                  }
                  if (item.category === 'Offering') {
                    return wrapBest(
                      <div key={item.id || item.name} className="p-3 rounded-2xl bg-zinc-900/60 border border-white/10 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex-shrink-0 overflow-hidden">
                          <AssetFrame type="Offering" size="fill" imageUrl={item.image} fallbackIcon={<Icons.Flame width={16} height={16} className="text-white/40" />} />
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-bold text-sm">{item.name}</p>
                          <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Offering{item.type ? ` • ${item.type}` : ''}</p>
                        </div>
                        <button onClick={() => setView('offerings', { search: item.name, targetId: item.id, targetType: 'offering' })} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white">Open</button>
                      </div>
                    );
                  }
                  if (item.category === 'GameIcon') {
                    const categoryColors = { health: 'var(--rar-veryrare)', buff: 'var(--rar-rare)', debuff: 'var(--rar-common)', killer: 'var(--rar-ultrarare)', activity: 'var(--rar-uncommon)' };
                    const color = categoryColors[item.iconCategory] || '#a1a1aa';
                    return wrapBest(
                      <div key={item.id || item.name} className="p-3 rounded-2xl bg-zinc-900/60 border border-white/10 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex-shrink-0 overflow-hidden flex items-center justify-center">
                          <AssetFrame
                            type="GameIcon"
                            size="fill"
                            imageUrl={item.icon}
                            fallbackIcon={<Icons.AlertCircle width={16} height={16} className="text-white/40" />}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-bold text-sm">{item.name}</p>
                          <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Game Icon • <span style={{ color }}>{item.iconCategory}</span></p>
                        </div>
                        <button onClick={() => setView('gameIcons')} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white">Open</button>
                      </div>
                    );
                  }
                  if (item.category === 'Glossary') {
                    return wrapBest(
                      <div key={item.term || item.name} className="p-3 rounded-2xl bg-zinc-900/60 border border-white/10">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-white font-bold text-sm">{item.name}</p>
                            <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Glossary • {item.section}</p>
                            <p className="text-xs text-zinc-400 line-clamp-2">{item.def}</p>
                          </div>
                          <button onClick={() => setView('glossary')} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white flex-shrink-0">Open</button>
                        </div>
                      </div>
                    );
                  }
                  if (item.category === 'Chapter') {
                    return wrapBest(
                      <div key={item.id || item.name} className="p-3 rounded-2xl bg-zinc-900/60 border border-white/10 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center">
                          <Icons.Clock width={18} height={18} className="text-zinc-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-bold text-sm">{item.name}</p>
                          <p className="text-[11px] text-zinc-500 uppercase tracking-wider">
                            {item.chapterNumber ? `Chapter ${item.chapterNumber}` : item.type === 'base' ? 'Base Game' : 'Release'} • {item.displayDate}
                          </p>
                        </div>
                        <button onClick={() => setView('timeline')} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white">Open Timeline</button>
                      </div>
                    );
                  }
                  return null;
                }) : <div className="text-center mt-12 text-zinc-600"><p className="font-medium text-sm">No results found.</p></div>}
                <SiteFooterContent />
              </div>
            ) : (
              <div className="cx-article">
                <div className="mp-welcome">
                  <p className="mp-welcome-title">Welcome to <span className="mp-welcome-name">The Entity's Wiki</span>,</p>
                  <p className="mp-welcome-sub">The free DBD encyclopedia.</p>
                </div>

                <section id="browse" aria-label="Browse by category">
                  <h2 className="cx-sec">Browse by category</h2>
                  <div className="cx-linkcols">
                    {[
                      { label: 'Killers', count: killers.length, open: () => setView('killers') },
                      { label: 'Survivors', count: survivors.length, open: () => setView('survivors') },
                      { label: 'Perk Finder', count: visiblePerks.length, open: () => setView('perks') },
                      { label: 'Items & Addons', count: items.length, open: () => setView('items', { mode: 'survivor' }) },
                      { label: 'Add-ons', count: addons.length, open: () => setView('items', { mode: 'killer' }) },
                      { label: 'Offerings', count: offerings.filter((offering) => !offering.retired).length, open: () => setView('offerings') },
                      { label: 'Cosmetics', count: (cosmeticsCatalog.fullSets || []).length + (cosmeticsCatalog.characterSwaps || []).length, open: () => setView('cosmetics') },
                      { label: 'Realms', count: new Set(maps.map((m) => m.realm)).size, open: () => setView('realms') },
                      { label: 'Chronicle', count: (typeof TIMELINE_DATA !== 'undefined' && TIMELINE_DATA.releases) ? TIMELINE_DATA.releases.length : 0, open: () => setView('timeline') },
                      { label: 'Glossary', count: GLOSSARY.reduce((n, sec) => n + sec.items.length, 0), open: () => setView('glossary') },
                      { label: 'My Favorites', count: null, open: () => setView('favorites') },
                      { label: 'Community Content', count: null, open: () => setView('communityContent') },
                    ].map((entry) => (
                      <div key={entry.label}>
                        <button type="button" className="cx-alink" onClick={entry.open}>{entry.label}</button>
                        {typeof entry.count === 'number' && entry.count > 0 ? <span className="cx-cnt"> {entry.count}</span> : null}
                      </div>
                    ))}
                  </div>
                </section>

                <section id="tools" aria-label="Tools directory">
                  <h2 className="cx-sec">Tools</h2>
                  <table className="cx-wikitable">
                    <thead><tr><th style={{ width: '220px' }}>Tool</th><th>Purpose</th></tr></thead>
                    <tbody>
                      {['buildLab', 'roulette', 'worldle', 'prestige', 'matches', 'progression', 'favorites', 'import', 'settings'].map((id) => MAIN_PAGE_TOOLS[id]).filter(Boolean).map((tile) => {
                        const openTile = () => {
                          if (tile.id === 'import') {
                            setShowImportModal(true);
                            return;
                          }
                          setView(tile.id);
                        };
                        return (
                          <tr key={tile.id} onClick={openTile} style={{ cursor: 'pointer' }}>
                            <td><button type="button" className="cx-alink" onClick={(e) => { e.stopPropagation(); openTile(); }}>{tile.label}</button></td>
                            <td style={{ color: 'var(--text-soft)' }}>{tile.desc}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </section>

                <section id="news" aria-label="Patch notes">
                  <h2 className="cx-sec">Patch notes</h2>
                  {(() => {
                    const chronological = (typeof TIMELINE_DATA !== 'undefined' && TIMELINE_DATA && typeof TIMELINE_DATA.getChronological === 'function') ? TIMELINE_DATA.getChronological() : [];
                    const latestTwo = chronological.slice(-2).reverse();
                    if (latestTwo.length === 0) {
                      return null;
                    }
                    return (
                      <table className="cx-wikitable">
                        <caption>Latest releases from the lore timeline</caption>
                        <thead>
                          <tr><th>Release</th><th>Date</th><th>Summary</th><th></th></tr>
                        </thead>
                        <tbody>
                          {latestTwo.map((rel) => (
                            <tr key={rel.id || rel.name}>
                              <td>
                                <span className="block text-sm text-white font-bold">{rel.name}</span>
                                <span className="block text-[11px] text-zinc-500 uppercase tracking-wider">{rel.chapterNumber ? ('Chapter ' + rel.chapterNumber) : (rel.type === 'base' ? 'Base Game' : (rel.type || 'Release'))}</span>
                              </td>
                              <td className="whitespace-nowrap">{rel.displayDate}</td>
                              <td><span className="block text-xs text-zinc-400 line-clamp-2">{rel.description}</span></td>
                              <td><button onClick={() => setView('timeline')} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white whitespace-nowrap">Open timeline</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  })()}
                </section>

                <nav className="cx-cats" aria-label="Categories">
                  <span>Categories:</span>
                  <button onClick={() => setView('killers')} style={{ color: 'var(--link)' }}>Killers</button>
                  <span> · </span>
                  <button onClick={() => setView('survivors')} style={{ color: 'var(--link)' }}>Survivors</button>
                  <span> · </span>
                  <button onClick={() => setView('perks')} style={{ color: 'var(--link)' }}>Perks</button>
                  <span> · </span>
                  <button onClick={() => setView('realms')} style={{ color: 'var(--link)' }}>Realms</button>
                  <span> · </span>
                  <button onClick={() => setView('timeline')} style={{ color: 'var(--link)' }}>Timeline</button>
                  <span> · </span>
                  <button onClick={() => setView('glossary')} style={{ color: 'var(--link)' }}>Glossary</button>
                </nav>
                <SiteFooterContent />
              </div>
            )}
          </div>
          { }
          {showImportModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={cancelImport}>
              <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">{importPreview ? 'Confirm Import' : 'Import Build'}</h2>
                  <button onClick={cancelImport} className="p-2 rounded-lg bg-white/5 text-zinc-400 hover:text-white">
                    <Icons.X width={18} height={18} />
                  </button>
                </div>

                {!importPreview ? (
                  <>
                    <p className="text-sm text-zinc-400 mb-4">Paste shared build text from a friend to import it into your Build Lab.</p>
                    <textarea
                      value={importCode}
                      onChange={e => { setImportCode(e.target.value); setImportError(''); }}
                      placeholder="Paste shared build text here..."
                      className="w-full h-24 bg-zinc-800/60 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 resize-none font-mono text-sm"
                    />
                    {importError && <p className="text-zinc-100 text-sm mt-2">{importError}</p>}
                    <div className="flex gap-3 mt-4">
                      <button onClick={cancelImport} className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-300 font-semibold hover:bg-white/10 transition-colors">Cancel</button>
                      <button onClick={handleImportBuild} className="flex-1 px-4 py-3 rounded-xl bg-zinc-800 text-zinc-100 border border-white/20 font-semibold hover:bg-zinc-500 transition-colors">Preview</button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Build Preview */}
                    <div className="space-y-4">
                      {/* Build Name & Role */}
                      <div className="p-4 rounded-xl bg-zinc-800/50 border border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${importPreview.role === 'Killer' ? 'bg-white/10 text-zinc-100' : 'bg-white/5 text-zinc-300'}`}>
                            {importPreview.role}
                          </span>
                          {importPreview.characterName && (
                            <span className="text-xs text-zinc-400">{importPreview.characterName}</span>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-white">{importPreview.name}</h3>
                      </div>

                      {/* Perks */}
                      {importPreview.perks?.length > 0 && (
                        <div>
                          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Perks</p>
                          <div className="flex flex-wrap gap-2">
                            {importPreview.perks.map((p, idx) => (
                              <span key={`${p.id}-${idx}`} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white">{p.name}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Item, Addons, Offering */}
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        {importPreview.item && (
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-500 text-xs uppercase tracking-wider">Item:</span>
                            <span className="text-zinc-300">{importPreview.item}</span>
                          </div>
                        )}
                        {importPreview.addons?.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-zinc-500 text-xs uppercase tracking-wider">Add-ons:</span>
                            <span className="text-zinc-300">{importPreview.addons.join(', ')}</span>
                          </div>
                        )}
                        {importPreview.offering && (
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-500 text-xs uppercase tracking-wider">Offering:</span>
                            <span className="text-zinc-300">{importPreview.offering}</span>
                          </div>
                        )}
                        {importPreview.notes && (
                          <div className="mt-2">
                            <span className="text-zinc-500 text-xs uppercase tracking-wider">Notes:</span>
                            <p className="text-zinc-400 text-sm mt-1">{importPreview.notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Warnings */}
                      {importWarnings.length > 0 && (
                        <div className="p-3 rounded-xl bg-white/5 border border-white/20">
                          <p className="text-zinc-200 text-xs font-bold uppercase tracking-wider mb-1">Warnings</p>
                          <ul className="text-zinc-300 text-xs space-y-0.5">
                            {importWarnings.map((w, i) => (
                              <li key={i}>• {w}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button onClick={() => { setImportPreview(null); setImportWarnings([]); }} className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-300 font-semibold hover:bg-white/10 transition-colors">Back</button>
                      <button onClick={confirmImport} className="flex-1 px-4 py-3 rounded-xl bg-zinc-100 text-black font-semibold hover:bg-zinc-300 transition-colors">Save Build</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      );
    };
    const SortTh = ({ label, sortKey, activeKey, dir, defaultDir = 'asc', onSort }) => {
      const isActive = activeKey === sortKey;
      const shownDir = isActive ? dir : defaultDir;
      return (
        <th className="cx-sortth" aria-sort={isActive ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
          <button
            type="button"
            onClick={() => onSort(sortKey, defaultDir)}
            aria-label={`Sort by ${label}${isActive ? (dir === 'asc' ? ' (ascending)' : ' (descending)') : ''}`}
            title={`Sort by ${label}`}
          >
            <span>{label}</span>
            {isActive
              ? <span className="cx-sortdir" aria-hidden="true">{dir === 'asc' ? '▲' : '▼'}</span>
              : <span className="cx-sortdir cx-sortdir--hint" aria-hidden="true">{defaultDir === 'asc' ? '▲' : '▼'}</span>}
          </button>
        </th>
      );
    };
    const ListView = ({ data, type, filterOptions, activeFilter, setActiveFilter, allPerks = [], setView, onPerkSelect, initialSearch = '', onSearchChange, buildsByOwner = {}, onCreateBuildSeed, onBack, comparePerks = [], onPerkLongPress, favoritePerks = [], onToggleFavorite, onPerkTap, onPerkPreview, onShowLore, onShowPower, onViewProfile, allCharacters = [], settings = {} }) => {
      const comparePress = useRef({ timer: null, firedId: null });
      useEffect(() => () => clearTimeout(comparePress.current.timer), []);
      const scrollRef = useRef(null);
      const [localSearch, setLocalSearch] = useState(initialSearch || '');
      const DEFAULT_SORT = { key: 'name', dir: 'asc' };
      const [sort, setSort] = useState(DEFAULT_SORT);
      const handleSort = (key, defaultDir) => {
        setSort(prev => {
          if (prev.key !== key) return { key, dir: defaultDir };
          if (prev.dir === defaultDir) return { key, dir: defaultDir === 'asc' ? 'desc' : 'asc' };
          return DEFAULT_SORT.key === key ? { ...DEFAULT_SORT } : { key: DEFAULT_SORT.key, dir: DEFAULT_SORT.dir };
        });
      };
      const scrollToTop = () => {
        scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      };
      useEffect(() => {
        setLocalSearch(initialSearch || '');
      }, [initialSearch]);
      const perksByOwner = useMemo(() => {
        const bucket = {};
        (allPerks || []).forEach(p => {
          if (!p.owner) return;
          if (!bucket[p.owner]) bucket[p.owner] = [];
          bucket[p.owner].push(p);
        });
        return bucket;
      }, [allPerks]);
      const isPerkList = type === 'Perks';
      const isCharacterList = type === 'Killers' || type === 'Survivors';
      const listHatnote = type === 'Killers'
        ? 'The playable killers of Dead by Daylight, with their real names and teachable perks.'
        : type === 'Survivors'
          ? 'The playable survivors of Dead by Daylight, with their teachable perks.'
          : 'All killer and survivor perks, searchable by role, tag, and text.';
      const effectiveFilter = activeFilter || 'All';
      const updateFilter = (val) => setActiveFilter && setActiveFilter(val);
      const stripThe = (name) => (name || '').replace(/^The\s+/i, '');
      const charByName = useMemo(() => {
        const map = new Map();
        (allCharacters || []).forEach(c => { if (c && c.name) map.set(c.name, c); });
        return map;
      }, [allCharacters]);
      const releaseByChar = useMemo(() => {
        const map = new Map();
        if (typeof TIMELINE_DATA !== 'undefined' && TIMELINE_DATA && TIMELINE_DATA.releases) {
          TIMELINE_DATA.releases.forEach(rel => {
            [...(rel.killers || []), ...(rel.survivors || [])].forEach(entry => {
              if (entry && entry.name && !map.has(entry.name)) map.set(entry.name, { name: rel.name, chapterNumber: rel.chapterNumber });
            });
          });
        }
        return map;
      }, []);
      const fmtDiff = (d) => ({ easy: 'Easy', intermediate: 'Intermediate', hard: 'Hard', veryhard: 'Very hard' }[(d || '').toLowerCase()] || d);
      const filtered = useMemo(() => {
        if (!data) return [];
        const term = localSearch.toLowerCase();
        let result = data.filter(item => {
          const searchableDescription = (isPerkList ? getPerkSearchDescription(item) : (item.description || '')).toLowerCase();
          const searchMatch = !term
            || item.name.toLowerCase().includes(term)
            || (item.realName && item.realName.toLowerCase().includes(term))
            || (item.owner && item.owner.toLowerCase().includes(term))
            || searchableDescription.includes(term);
          let filterMatch;
          const perkName = (item.name || '').toLowerCase();
          const perkDesc = searchableDescription;
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
          const dirMul = sort.dir === 'asc' ? 1 : -1;
          const getPowerName = (item) => {
            const g = item && item.name && typeof KILLER_GUIDES !== 'undefined' ? KILLER_GUIDES[item.name] : null;
            return (g && g.powerName) || '';
          };
          const getSpeedNum = (item) => {
            const s = item && item.name && typeof KILLER_STATS !== 'undefined' && KILLER_STATS[item.name] ? KILLER_STATS[item.name].speed : '';
            const m = String(s || '').match(/([\d.]+)/);
            return m ? parseFloat(m[1]) : null;
          };
          const getReleaseKey = (item) => (typeof RELEASE_DATE_MAP !== 'undefined' && RELEASE_DATE_MAP[item.name]) || '';
          result = [...result].sort((a, b) => {
            switch (sort.key) {
              case 'power': {
                const pa = getPowerName(a);
                const pb = getPowerName(b);
                if (!pa && !pb) return 0;
                if (!pa) return 1;
                if (!pb) return -1;
                return dirMul * pa.localeCompare(pb);
              }
              case 'chapter': {
                const ra = getReleaseKey(a);
                const rb = getReleaseKey(b);
                if (!ra && !rb) return 0;
                if (!ra) return 1;
                if (!rb) return -1;
                return dirMul * ra.localeCompare(rb);
              }
              case 'speed': {
                const sa = getSpeedNum(a);
                const sb = getSpeedNum(b);
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
      return (
        <div ref={scrollRef} className="flex flex-col h-full pt-6 pb-32 overflow-y-auto custom-scrollbar">
          <div className="cx-listhead">
            <ViewCrumbs trail={[{ label: 'Main page', onClick: onBack }]} current={type} />
            <h1 className="cx-title">{type}</h1>
            <p className="cx-hatnote">{listHatnote}</p>
          </div>
          <WikiHeaderSearchPortal>
            <div className="relative w-full">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                <Icons.Search width={18} height={18} />
              </div>
              <input type="text" placeholder={`Filter ${type}...`} className="w-full bg-[var(--panel)] border border-[var(--stroke)] rounded-xl py-3 pl-12 pr-10 text-white placeholder-zinc-600 text-sm focus:outline-none" value={localSearch} onChange={e => { setLocalSearch(e.target.value); onSearchChange && onSearchChange(e.target.value); }} />
              {localSearch && <button onClick={() => { setLocalSearch(''); onSearchChange && onSearchChange(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white/5 text-zinc-400 hover:text-white transition-colors"><Icons.X width={14} height={14} /></button>}

            </div>
          </WikiHeaderSearchPortal>
          {isCharacterList && (
            <div className="max-w-3xl mx-auto flex justify-center gap-2 mb-2 px-6">
              <span className="text-[11px] text-zinc-500 uppercase tracking-wider self-center">{filtered.length} {type.toLowerCase()}</span>
            </div>
          )}
          <div className="px-6">
            {isPerkList ? (
              <div className="max-w-3xl mx-auto flex flex-wrap justify-center gap-2 pb-4">
                {filterOptions && filterOptions.map(opt => (
                  <button
                    key={opt}
                    onClick={() => updateFilter(effectiveFilter === opt ? 'All' : opt)}
                    className={`px-4 py-2 text-xs rounded-lg border transition-colors ${effectiveFilter === opt ? 'bg-zinc-100 text-black border-zinc-100 font-bold' : 'bg-transparent text-zinc-300 border-white/15 hover:border-white/30'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : filterOptions && (
              <div className="max-w-3xl mx-auto flex flex-wrap justify-center gap-2 pb-4">
                {filterOptions.map(opt => (
                  <button key={opt} onClick={() => updateFilter(opt)} className={`px-4 py-2 text-xs rounded-lg border transition-colors ${activeFilter === opt ? 'bg-zinc-100 text-black border-zinc-100 font-bold' : 'bg-transparent text-zinc-300 border-white/15 hover:border-white/30'}`}>{opt}</button>
                ))}
              </div>
            )}
          </div>
<div className="cx-listwrap w-full max-w-[1280px] mx-auto px-[44px] pb-32 overflow-x-auto shrink-0">
            <table className="cx-wikitable">
            {isCharacterList ? (
              <thead><tr>
                <SortTh label="Character" sortKey="name" activeKey={sort.key} dir={sort.dir} defaultDir="asc" onSort={handleSort} />
                {type === 'Killers' ? <SortTh label="Power" sortKey="power" activeKey={sort.key} dir={sort.dir} defaultDir="asc" onSort={handleSort} /> : null}
                <SortTh label="Chapter" sortKey="chapter" activeKey={sort.key} dir={sort.dir} defaultDir="asc" onSort={handleSort} />
                {type === 'Killers'
                  ? <SortTh label="Movement speed" sortKey="speed" activeKey={sort.key} dir={sort.dir} defaultDir="desc" onSort={handleSort} />
                  : <th>Teachables</th>}
                <th aria-hidden="true"></th>
              </tr></thead>
            ) : (
              <thead><tr>
                <th>Perk</th><th>Owner</th><th>Type</th><th>Effect</th><th aria-hidden="true"></th>
              </tr></thead>
            )}
            <tbody>
            {filtered.map(item => {
              const category = type === 'Killers' ? 'Killer' : type === 'Survivors' ? 'Survivor' : 'Perk';
              const isPerk = category === 'Perk';
              const isCharacter = !isPerk;
              const fallbackIcon = category === 'Killer' ? <Icons.Sword width={24} height={24} className="opacity-20" /> : category === 'Survivor' ? <Icons.Heart width={24} height={24} className="opacity-20" /> : <Icons.BookOpen width={20} height={20} className="opacity-20" />;
              const isInCompare = isPerk && comparePerks.some(p => p.id === item.id);
              const isFavorite = favoritePerks.includes(item.id);
              const onToggleFavoriteFn = onToggleFavorite ? () => onToggleFavorite(item.id) : undefined;
              const onPerkTapFn = isPerk && onPerkTap ? () => onPerkTap(item) : undefined;
              const onViewProfileFn = isCharacter && onViewProfile ? () => onViewProfile(item) : undefined;
              const consumeComparePress = () => {
                if (comparePress.current.firedId !== item.id) return false;
                comparePress.current.firedId = null;
                return true;
              };
              const handleTouchStart = () => {
                if (!isPerk || !onPerkLongPress) return;
                clearTimeout(comparePress.current.timer);
                comparePress.current.firedId = null;
                comparePress.current.timer = setTimeout(() => {
                  comparePress.current.firedId = item.id;
                  onPerkLongPress(item);
                }, 500);
              };
              const handleTouchEnd = () => {
                clearTimeout(comparePress.current.timer);
                comparePress.current.timer = null;
              };
              const handlePerkClick = () => {
                if (!consumeComparePress()) onPerkTapFn?.();
              };
              const handleCharacterClick = () => {
                if (onViewProfileFn) onViewProfileFn();
              };
              if (isCharacter) {
                const guide = category === 'Killer' ? KILLER_GUIDES[item.name] : null;
                const stats = category === 'Killer' ? KILLER_STATS[item.name] : null;
                const rel = releaseByChar.get(item.name);
                const chapterLabel = rel ? `${rel.name}${rel.chapterNumber ? ` (${rel.chapterNumber})` : ''}` : '\u2014';
                return (
                  <tr key={item.id} onClick={handleCharacterClick} className={isInCompare ? 'cx-row-compare' : undefined} style={{ cursor: 'pointer' }}>
                    <td className="cx-perkcell">
                      <div className="cx-perkcell-inner">
                        <div className="cx-thumbzoom" style={{ width: 44, height: 44, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <AssetFrame type={category} imageUrl={item.image} fallbackIcon={fallbackIcon} size="fill" />
                        </div>
                        <span>
                          <button type="button" className="cx-alink" onClick={(e) => { e.stopPropagation(); handleCharacterClick(); }}>{item.name}</button>
                          {category === 'Killer' && item.realName && item.realName !== item.name ? <small>{item.realName}</small> : null}
                        </span>
                      </div>
                    </td>
                    {category === 'Killer' ? (
                      <td>{guide && guide.powerName ? <button type="button" className="cx-alink" onClick={(e) => { e.stopPropagation(); handleCharacterClick(); }}>{guide.powerName}</button> : '\u2014'}</td>
                    ) : null}
                    <td>{chapterLabel}</td>
                    <td>
                      {category === 'Killer'
                        ? (stats && stats.speed ? stats.speed : fmtDiff(item.difficulty))
                        : (perksByOwner[item.name] && perksByOwner[item.name].length > 0
                          ? perksByOwner[item.name].map((perk, perkIdx) => (
                            <span key={perk.id}>
                              {perkIdx > 0 && <span style={{ color: 'var(--text-faint)' }}> · </span>}
                              <button
                                type="button"
                                className="cx-alink"
                                onClick={(e) => { e.stopPropagation(); setView && setView('survivor', { id: item.id, scroll: 'perks' }); }}
                                title={`Open ${item.name} \u2014 ${perk.name}`}
                              >
                                {perk.name}
                              </button>
                            </span>
                          ))
                          : '\u2014')}
                    </td>
                    <td className="cx-star">
                      {onToggleFavoriteFn && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); onToggleFavoriteFn(); }} aria-label="Toggle favorite" className={isFavorite ? 'cx-star-on' : undefined}>
                          {isFavorite ? '\u2605' : '\u2606'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              }
              const ownerChar = charByName.get(item.owner) || null;
              const isHex = item.name.startsWith('Hex:');
              const isExhaust = /exhaust/i.test(item.description || '');
              const typeLabel = `${item.type}${isHex ? ' \u00b7 Hex' : ''}${isExhaust ? ' \u00b7 Exhaustion' : ''}`;
              return (
                <tr
                  key={item.id}
                  onClick={onPerkTapFn ? handlePerkClick : undefined}
                  onTouchStart={isPerk ? handleTouchStart : undefined}
                  onTouchEnd={isPerk ? handleTouchEnd : undefined}
                  onTouchCancel={isPerk ? handleTouchEnd : undefined}
                  onMouseDown={isPerk ? handleTouchStart : undefined}
                  onMouseUp={isPerk ? handleTouchEnd : undefined}
                  onMouseLeave={isPerk ? handleTouchEnd : undefined}
                  className={`${onPerkTapFn ? 'cursor-pointer' : ''} ${isInCompare ? 'cx-row-compare' : ''}`}
                >
                  <td className="cx-perkcell">
                    <div className="cx-perkimg">
                      {onPerkPreview && item.image ? (
                        <button type="button" onClick={(e) => { e.stopPropagation(); if (!consumeComparePress()) onPerkPreview(item); }} style={{ padding: 0, border: 0, background: 'none', cursor: 'zoom-in' }} aria-label={`Preview ${item.name}`}>
                          <div className="cx-imgbox">
                            <AssetFrame type={category} imageUrl={item.image} fallbackIcon={fallbackIcon} size="fill" />
                          </div>
                        </button>
                      ) : (
                        <div className="cx-imgbox">
                          <AssetFrame type={category} imageUrl={item.image} fallbackIcon={fallbackIcon} size="fill" />
                        </div>
                      )}
                      {onPerkTapFn ? (
                        <button type="button" className="cx-alink" onClick={(e) => { e.stopPropagation(); handlePerkClick(); }}>{item.name}</button>
                      ) : <span className="font-semibold text-zinc-100">{item.name}</span>}
                      <small>{typeLabel}</small>
                      {onPerkLongPress && <button type="button" className="cx-compare-pick" aria-label={`${isInCompare ? 'Remove' : 'Add'} ${item.name} ${isInCompare ? 'from' : 'to'} comparison`} aria-pressed={isInCompare} onMouseDown={event => event.stopPropagation()} onTouchStart={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); comparePress.current.firedId = null; onPerkLongPress(item); }}>{isInCompare ? 'Selected' : 'Compare'}</button>}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                    {ownerChar ? (
                      <button type="button" className="cx-alink" onClick={(e) => { e.stopPropagation(); setView && setView((ownerChar.power || ownerChar.type === 'Killer') ? 'killer' : 'survivor', { id: ownerChar.id }); }}>{item.owner}</button>
                    ) : (item.owner || 'Universal')}
                  </td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{item.type}</td>
                  <td>{item.description ? <PerkDescriptionBlock perk={item} settings={settings} accentColor="var(--link)" className="inline" lineClassName="leading-relaxed" /> : '\u2014'}</td>
                  <td className="cx-star">
                    {onToggleFavoriteFn && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); onToggleFavoriteFn(); }} aria-label="Toggle favorite" className={isFavorite ? 'cx-star-on' : undefined}>
                        {isFavorite ? '\u2605' : '\u2606'}
                      </button>
                    )}
                    {isInCompare && <span className="cx-compare-dot" title="In compare">{'\u25cf'}</span>}
                  </td>
                </tr>
              );
            })}
            </tbody></table>
          </div>
        </div>
      );
    };
    const RealmsView = ({ onBack, maps, realms: dbRealms = [], onViewLayout, onOpenRealm, initialSearch = '' }) => {
      const [mapSearch, setMapSearch] = useState(initialSearch || '');
      useEffect(() => {
        setMapSearch(initialSearch || '');
      }, [initialSearch]);
      const mapsById = useMemo(() => {
        const lookup = new Map();
        (maps || []).forEach(mp => {
          if (mp && mp.id && !lookup.has(mp.id)) lookup.set(mp.id, mp);
        });
        return lookup;
      }, [maps]);
      const rows = useMemo(() => {
        const term = (mapSearch || '').toLowerCase();
        const matched = (maps || []).filter(mp => {
          if (!term) return true;
          return ((mp.name || '').toLowerCase().includes(term));
        });
        const matchedIds = new Set(matched.map(mp => mp.id));
        const out = [];
        (dbRealms || []).forEach(realm => {
          const seen = new Set();
          const realmMaps = ((realm.maps || []).map(id => mapsById.get(id)).filter(Boolean)).filter(mp => {
            if (!matchedIds.has(mp.id)) return false;
            const key = (mp.name || '').trim().toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          if (term && !(realm.name || '').toLowerCase().includes(term) && realmMaps.length === 0) return;
          out.push({ key: realm.id, name: realm.name, realm, maps: realmMaps });
        });
        const placedIds = new Set();
        out.forEach(row => row.maps.forEach(mp => placedIds.add(mp.id)));
        const dbNames = new Set((dbRealms || []).map(r => (r.name || '').trim().toLowerCase()));
        const seenOther = new Set();
        const other = [];
        matched.forEach(mp => {
          if (placedIds.has(mp.id)) return;
          const rname = (mp.realm || 'Unknown Realm').trim();
          if (dbNames.has(rname.toLowerCase())) return;
          const key = (mp.name || '').trim().toLowerCase();
          if (seenOther.has(key)) return;
          seenOther.add(key);
          other.push(mp);
        });
        if (other.length > 0) out.push({ key: '__other', name: 'Other maps', realm: null, maps: other });
        return out;
      }, [maps, dbRealms, mapsById, mapSearch]);
      return (
        <div className="flex flex-col h-full pt-6 pb-32 px-6 overflow-y-auto custom-scrollbar">
          <ViewCrumbs trail={[{ label: 'Main page', onClick: onBack }]} current="Realms" />
          <h1 className="cx-title">Realms</h1>
          <p className="cx-hatnote">Maps and locations of the trials, grouped by realm.</p>
          <WikiHeaderSearchPortal>
            <div className="relative w-full">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                <Icons.Search width={18} height={18} />
              </div>
              <input value={mapSearch} onChange={e => setMapSearch(e.target.value)} placeholder="Search maps..." className="w-full bg-[var(--panel)] border border-[var(--stroke)] rounded-xl py-3 pl-12 pr-10 text-white placeholder-zinc-600 text-sm focus:outline-none" />
              {mapSearch && <button onClick={() => setMapSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white/5 text-zinc-400 hover:text-white transition-colors"><Icons.X width={14} height={14} /></button>}

            </div>
          </WikiHeaderSearchPortal>
          <div className="cx-listwrap w-full max-w-[1280px] mx-auto px-[44px] pb-32 overflow-x-auto shrink-0">
            {rows.length === 0 && (
              <div className="text-center text-zinc-500 mt-12">No map data available.</div>
            )}
            {rows.length > 0 && (
              <table className="cx-wikitable">
                <thead><tr><th style={{ width: '220px' }}>Realm</th><th>Maps</th></tr></thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.key}>
                      <td>{row.realm ? (
                        <><button type="button" className="cx-alink font-semibold" onClick={() => onOpenRealm && onOpenRealm(row.realm)}>{row.name}</button><small style={{ display: 'block', color: 'var(--text-faint)', fontSize: '11px' }}>{row.maps.length} map{row.maps.length === 1 ? '' : 's'}</small></>
                      ) : (
                        <><span className="font-semibold text-zinc-100">{row.name}</span><small style={{ display: 'block', color: 'var(--text-faint)', fontSize: '11px' }}>{row.maps.length} map{row.maps.length === 1 ? '' : 's'}</small></>
                      )}</td>
                      <td>
                        {row.maps.map((mp, idx) => {
                          const hasLayout = MAP_LAYOUTS[mp.name] && MAP_LAYOUTS[mp.name].length > 0;
                          return (
                            <span key={mp.id}>
                              {idx > 0 && <span className="cx-sep" style={{ color: 'var(--text-faint)' }}> · </span>}
                              <button type="button" className="cx-alink" onClick={() => onViewLayout && onViewLayout(mp)} title={hasLayout ? 'Open details + layout' : 'Open details'}>{mp.name}</button>
                            </span>
                          );
                        })}
                        {row.maps.length === 0 && <span style={{ color: 'var(--text-faint)' }}>No maps found</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      );
    };
    const BuildForm = ({ draft, onSave, onCancel, perks = [], killers = [], survivors = [], items = [], addons = [], offerings = [] }) => {
      const empty = { id: null, name: '', role: 'Survivor', characterId: '', characterName: '', perks: [null, null, null, null], selectedAddons: [null, null], selectedItem: null, selectedOffering: null, tags: [], notes: '', favorite: false };
      const [form, setForm] = useState(draft || empty);
      const [tagInput, setTagInput] = useState((draft?.tags || []).join(', '));
      const [perkSearch, setPerkSearch] = useState('');
      const [addonSearch, setAddonSearch] = useState('');
      const [showCharacterGrid, setShowCharacterGrid] = useState(false);
    /* Moved to ./games/dbd/config.js (DBD adapter, loaded above). */
      useEffect(() => {
        if (draft) {
          setForm({
            ...empty,
            ...draft,
            selectedAddons: draft.selectedAddons || [null, null],
            selectedItem: draft.selectedItem || null,
            selectedOffering: draft.selectedOffering || null,
          });
          setTagInput((draft?.tags || []).join(', '));
        }
      }, [draft?.id]);
      const characters = form.role === 'Killer' ? killers : survivors;
      const perkPool = useMemo(() => {
        const term = perkSearch.toLowerCase();
        return (perks || [])
          .filter(p => p.type === form.role && (!term || p.name.toLowerCase().includes(term) || (p.owner || '').toLowerCase().includes(term)))
          .sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) ||
            (a.owner || '').localeCompare(b.owner || '', undefined, { sensitivity: 'base' })
          );
      }, [perks, form.role, perkSearch]);
      const survivorItems = useMemo(() => {
        return (items || []).filter(i => i.bloodweb === true && i.role === 'survivor').sort((a, b) => getRarityOrder(b.rarity) - getRarityOrder(a.rarity));
      }, [items]);
      const availableAddons = useMemo(() => {
        const term = addonSearch.toLowerCase();
        let pool = [];
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
      const availableOfferings = useMemo(() => {
        return (offerings || []).filter(o => !o.role || o.role === form.role.toLowerCase() || o.role === null);
      }, [offerings, form.role]);
      const updatePerk = (slot, perkId) => {
        const selected = perkPool.find(p => p.id === perkId);
        const next = [...form.perks];
        next[slot] = selected ? { id: selected.id, name: selected.name, image: selected.image } : null;
        setForm(f => ({ ...f, perks: next }));
      };
      const updateAddon = (slot, addonId) => {
        const selected = availableAddons.find(a => a.id === addonId);
        const next = [...form.selectedAddons];
        next[slot] = selected || null;
        setForm(f => ({ ...f, selectedAddons: next }));
      };
      const pickCharacter = (char) => {
        setForm(f => ({
          ...f,
          characterId: char?.id || '',
          characterName: char?.name || '',
          selectedAddons: [null, null]
        }));
        setShowCharacterGrid(false);
      };
      const pickItem = (itemId) => {
        const selected = survivorItems.find(i => i.id === itemId);
        setForm(f => ({
          ...f,
          selectedItem: selected || null,
          selectedAddons: [null, null]
        }));
      };
      const pickOffering = (offeringId) => {
        const selected = availableOfferings.find(o => o.id === offeringId);
        setForm(f => ({ ...f, selectedOffering: selected || null }));
      };
      const handleSave = () => {
        if (!form.name.trim()) {
          alert('Give the build a name.');
          return;
        }
        const now = new Date().toISOString();
        const normalized = {
          ...form,
          id: form.id || uuid(),
          role: roleFromString(form.role),
          characterName: form.characterName || characters.find(c => c.id === form.characterId)?.name || '',
          perks: (form.perks || []).filter(Boolean).map(p => ({ id: p.id, name: p.name })),
          selectedAddons: form.selectedAddons.filter(Boolean),
          addons: form.selectedAddons.filter(Boolean).map(a => a.name),
          item: form.selectedItem?.name || '',
          offering: form.selectedOffering?.name || '',
          tags: parseTags(tagInput),
          updatedAt: now,
          createdAt: form.createdAt || now
        };
        onSave(normalized);
      };
      const changeRole = (newRole) => {
        setForm(f => ({
          ...f,
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
      return (
        <div className="cx-panel">
          <h2 className="cx-sec">Build editor</h2>
          <table className="cx-wikitable"><tbody>
            <tr><th scope="row">Name</th><td>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Build name..."
                className="cx-input w-full px-3 py-2 text-lg font-bold"
              />
            </td></tr>
            <tr><th scope="row">Role</th><td>
              <div className="flex gap-2">
                <button
                  onClick={() => changeRole('Survivor')}
                  className={`mode-choice ${form.role === 'Survivor' ? 'mode-choice--active' : ''} flex-1 sm:flex-none px-4 py-3 text-xs font-bold uppercase tracking-wider`}
                  aria-pressed={form.role === 'Survivor'}
                >
                  Survivor
                </button>
                <button
                  onClick={() => changeRole('Killer')}
                  className={`mode-choice ${form.role === 'Killer' ? 'mode-choice--active' : ''} flex-1 sm:flex-none px-4 py-3 text-xs font-bold uppercase tracking-wider`}
                  aria-pressed={form.role === 'Killer'}
                >
                  Killer
                </button>
                <button
                  onClick={() => setForm(f => ({ ...f, favorite: !f.favorite }))}
                  className={`mode-choice ${form.favorite ? 'mode-choice--active' : ''} px-3 py-2 text-xs font-bold uppercase`}
                  aria-pressed={form.favorite}
                >
                  <Icons.Star width={16} height={16} className={form.favorite ? 'fill-zinc-100' : ''} />
                </button>
              </div>
            </td></tr>
            <tr><th scope="row">{form.role}</th><td>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] uppercase tracking-widest text-zinc-500 font-bold">{form.role}</span>
                <button
                  onClick={() => setShowCharacterGrid(!showCharacterGrid)}
                  className="cx-toolbtn cx-toolbtn--quiet text-[10px] px-2 py-1 font-bold uppercase tracking-wider"
                >
                  {showCharacterGrid ? 'Hide' : 'Select'}
                </button>
              </div>
              {form.characterName ? (
                <div className="flex items-center gap-3 p-3 cx-flatcard">
                  <div className="w-1 h-12" style={{ background: 'var(--accent)' }} />
                  <AssetFrame type={form.role} size="large" imageUrl={characters.find(c => c.id === form.characterId)?.image} fallbackIcon={<Icons.User width={20} height={20} className="text-zinc-600" />} />
                  <div className="flex-1">
                    <p className="text-white font-bold">{form.characterName}</p>
                    <p className="text-zinc-500 text-xs">Selected {form.role.toLowerCase()}</p>
                  </div>
                  <button onClick={() => pickCharacter(null)} className="cx-toolbtn cx-toolbtn--quiet p-2">
                    <Icons.X width={14} height={14} />
                  </button>
                </div>
              ) : (
                <p className="text-zinc-600 text-sm">No character selected (generic build)</p>
              )}
              {showCharacterGrid && (
                <div className="cx-well mt-3 grid grid-cols-5 sm:grid-cols-8 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-2">
                  {characters.map(char => (
                    <button
                      key={char.id}
                      onClick={() => pickCharacter(char)}
                      className={`aspect-[3/4] border transition-all overflow-hidden ${form.characterId === char.id ? '' : 'opacity-80 hover:opacity-100'}`}
                      style={form.characterId === char.id ? { borderColor: 'var(--accent)' } : { borderColor: 'var(--stroke)' }}
                      title={char.name}
                    >
                      <div className="w-full h-full bg-zinc-900">
                        <AssetFrame type={form.role} imageUrl={char.image} size="fill" fallbackIcon={<Icons.User width={12} height={12} className="text-zinc-600" />} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </td></tr>
            <tr><th scope="row">Perks</th><td>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] uppercase tracking-widest text-zinc-500 font-bold">Perks</span>
                <div className="flex items-center gap-2">
                  <input
                    value={perkSearch}
                    onChange={e => setPerkSearch(e.target.value)}
                    placeholder="Search..."
                    className="cx-input w-32 px-2 py-1 text-xs"
                  />
                  <span className="text-[10px] text-zinc-600">{perkPool.length} available</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {form.perks.map((perk, idx) => (
                  <div key={idx} className="p-3 cx-flatcard">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-bold mb-2">Perk {idx + 1}</p>
                    <select
                      value={perk?.id || ''}
                      onChange={e => updatePerk(idx, e.target.value)}
                      className="themed-select w-full text-sm"
                    >
                      <option value="">Empty slot</option>
                      {perkPool.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    {perk?.name && (
                      <p className="text-[11px] text-zinc-400 mt-2 truncate">{perk.name}</p>
                    )}
                  </div>
                ))}
              </div>
            </td></tr>
            {form.role === 'Survivor' && (
              <tr><th scope="row">Item</th><td>
                <select
                  value={form.selectedItem?.id || ''}
                  onChange={e => pickItem(e.target.value)}
                  className="themed-select w-full text-sm"
                >
                  <option value="">No item</option>
                  {survivorItems.map(item => (
                    <option key={item.id} value={item.id}>{item.name} ({formatRarity(item.rarity)})</option>
                  ))}
                </select>
                {form.selectedItem && (
                  <div className="mt-3 p-3 cx-flatcard flex items-center gap-3">
                    <Icons.Package width={20} height={20} className="text-white/60" />
                    <div>
                      <p className="text-white font-semibold text-sm">{form.selectedItem.name}</p>
                      <p className="text-xs" style={{ color: getRarityColor(form.selectedItem.rarity) }}>{formatRarity(form.selectedItem.rarity)} {form.selectedItem.itemType}</p>
                    </div>
                  </div>
                )}
              </td></tr>
            )}
            <tr><th scope="row">{form.role === 'Killer' ? 'Power Addons' : 'Item Addons'}</th><td>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] uppercase tracking-widest text-zinc-500 font-bold">
                  {form.role === 'Killer' ? 'Power Addons' : 'Item Addons'}
                </span>
                <input
                  value={addonSearch}
                  onChange={e => setAddonSearch(e.target.value)}
                  placeholder="Search..."
                  className="cx-input w-32 px-2 py-1 text-xs"
                />
              </div>
              {(form.role === 'Killer' && !form.characterName) || (form.role === 'Survivor' && !form.selectedItem) ? (
                <p className="text-zinc-600 text-xs">
                  {form.role === 'Killer' ? 'Select a killer to choose power addons' : 'Select an item to choose addons'}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {[0, 1].map(slot => (
                    <div key={slot} className="p-3 cx-flatcard">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-bold mb-2">Addon {slot + 1}</p>
                      <select
                        value={form.selectedAddons[slot]?.id || ''}
                        onChange={e => updateAddon(slot, e.target.value)}
                        className="themed-select w-full text-sm"
                      >
                        <option value="">No addon</option>
                        {availableAddons.map(a => (
                          <option key={a.id} value={a.id} style={{ color: getRarityColor(a.rarity) }}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                      {form.selectedAddons[slot] && (
                        <p className="text-[11px] mt-2 truncate" style={{ color: getRarityColor(form.selectedAddons[slot].rarity) }}>
                          {form.selectedAddons[slot].name}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </td></tr>
            <tr><th scope="row">Offering</th><td>
              <select
                value={form.selectedOffering?.id || ''}
                onChange={e => pickOffering(e.target.value)}
                className="themed-select w-full text-sm"
              >
                <option value="">No offering</option>
                {availableOfferings.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
              {form.selectedOffering && (
                <div className="mt-3 p-3 cx-flatcard">
                  <p className="text-white font-semibold text-sm">{form.selectedOffering.name}</p>
                  <p className="text-zinc-500 text-xs mt-1 line-clamp-2">{form.selectedOffering.description}</p>
                </div>
              )}
            </td></tr>
            <tr><th scope="row">Tags</th><td>
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                placeholder="SoloQ, Tryhard, Meme..."
                className="cx-input w-full px-3 py-2 text-sm"
              />
            </td></tr>
            <tr><th scope="row">Notes</th><td>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="How to run this build..."
                className="cx-input w-full px-3 py-2 text-sm"
              />
            </td></tr>
            <tr><th scope="row">Actions</th><td>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={onCancel}
                  className="cx-toolbtn cx-toolbtn--quiet px-5 py-2.5 text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="cx-toolbtn cx-toolbtn--primary px-5 py-2.5 text-sm font-bold"
                >
                  Save Build
                </button>
              </div>
            </td></tr>
          </tbody></table>
        </div>
      );
    };
    const BuildPlannerView = ({ builds = [], setBuilds, perks = [], killers = [], survivors = [], items = [], addons = [], offerings = [], templates = [], onBack, seed, clearSeed, setRoleContext }) => {
      const [filters, setFilters] = useState({ role: 'All', character: 'All', tag: 'All', search: '', include: '', exclude: '' });
      const [editing, setEditing] = useState(null);
      const [showForm, setShowForm] = useState(false);
      useEffect(() => {
        if (seed) {
          const seedPerks = seed.perks || [];
          const perksArray = [
            seedPerks[0] || null,
            seedPerks[1] || null,
            seedPerks[2] || null,
            seedPerks[3] || null
          ];
          setEditing({
            id: null,
            name: seed.name || `${seed.characterName || seed.role} Build`,
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
      const allTags = useMemo(() => {
        const set = new Set();
        builds.forEach(b => (b.tags || []).forEach(t => set.add(t)));
        return ['All', ...Array.from(set)];
      }, [builds]);
      const filteredBuilds = useMemo(() => {
        const includeTerm = filters.include.toLowerCase();
        const excludeTerm = filters.exclude.toLowerCase();
        const searchTerm = filters.search.toLowerCase();
        return builds.filter(b => {
          const roleMatch = filters.role === 'All' || b.role === filters.role;
          const charMatch = filters.character === 'All' || b.characterId === filters.character || (b.characterName || '').toLowerCase() === filters.character.toLowerCase();
          const tagMatch = filters.tag === 'All' || (b.tags || []).includes(filters.tag);
          const searchMatch = !searchTerm || b.name.toLowerCase().includes(searchTerm) || (b.notes || '').toLowerCase().includes(searchTerm);
          const includeMatch = !includeTerm || (b.perks || []).some(p => (p?.name || '').toLowerCase().includes(includeTerm));
          const excludeMatch = !excludeTerm || !(b.perks || []).some(p => (p?.name || '').toLowerCase().includes(excludeTerm));
          return roleMatch && charMatch && tagMatch && searchMatch && includeMatch && excludeMatch;
        });
      }, [builds, filters]);
      const upsertBuild = (payload) => {
        setBuilds(prev => {
          const exists = prev.some(b => b.id === payload.id);
          const next = exists ? prev.map(b => b.id === payload.id ? payload : b) : [payload, ...prev];
          return next;
        });
        setRoleContext && setRoleContext(payload.role);
        setShowForm(false);
        setEditing(null);
      };
      const duplicateBuild = (build) => {
        const now = new Date().toISOString();
        const clone = { ...build, id: uuid(), name: `${build.name} (Copy)`, favorite: false, createdAt: now, updatedAt: now };
        setBuilds(prev => [clone, ...prev]);
      };
      const deleteBuild = (id) => {
        if (!confirm('Delete this build?')) return;
        setBuilds(prev => prev.filter(b => b.id !== id));
      };
      const toggleFavorite = (id) => {
        const now = new Date().toISOString();
        setBuilds(prev => prev.map(b => b.id === id ? { ...b, favorite: !b.favorite, updatedAt: now } : b));
      };
      const cloneTemplate = (tpl) => {
        const now = new Date().toISOString();
        const normalizedPerks = (tpl.perks || []).map(name => {
          const found = perks.find(p => perkMatchesName(p, name));
          return found ? { id: found.id, name: found.name } : { id: uuid(), name };
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
      return (
        <div className="flex flex-col h-full pt-6 pb-32 px-6 overflow-y-auto custom-scrollbar">
          <ViewCrumbs trail={[{ label: 'Main page', onClick: onBack }]} current="Build & Loadout Lab" />
          <h1 className="cx-title">Build &amp; Loadout Lab</h1>
          <p className="cx-hatnote">Craft, save, favorite and clone builds.</p>
          <h2 className="cx-sec">Actions</h2>
          <table className="cx-wikitable"><tbody>
            <tr><th scope="row">Builds</th><td>
              <div className="mb-4 flex flex-wrap gap-2 items-center">
                <button onClick={() => { setEditing(null); setShowForm(true); }} className="cx-toolbtn cx-toolbtn--primary px-4 py-2 text-sm font-bold">New Build</button>
<button type="button" onClick={() => setFilters(f => ({ ...f, role: filters.role === 'Killer' ? 'All' : 'Killer' }))} className={`mode-choice ${filters.role === 'Killer' ? 'mode-choice--active' : ''} px-4 py-2 text-xs font-bold`}>Killer</button>
<button type="button" onClick={() => setFilters(f => ({ ...f, role: filters.role === 'Survivor' ? 'All' : 'Survivor' }))} className={`mode-choice ${filters.role === 'Survivor' ? 'mode-choice--active' : ''} px-4 py-2 text-xs font-bold`}>Survivor</button>
<button type="button" onClick={() => setFilters({ role: 'All', character: 'All', tag: 'All', search: '', include: '', exclude: '' })} className="mode-choice px-4 py-2 text-xs font-bold">Reset</button>
                <span className="text-[11px] text-zinc-500 ml-auto uppercase tracking-wider">{filteredBuilds.length} builds</span>
              </div>
            </td></tr>
          </tbody></table>
          <h2 className="cx-sec">Filters</h2>
          <table className="cx-wikitable"><tbody>
            <tr><th scope="row">Search</th><td>
              <input value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} placeholder="Search name or notes" className="cx-input w-full px-3 py-2 text-sm" />
            </td></tr>
            <tr><th scope="row">Role</th><td>
              <select value={filters.role} onChange={e => setFilters(f => ({ ...f, role: e.target.value }))} className="themed-select w-full text-sm">
                <option value="All">All</option>
                <option value="Killer">Killer</option>
                <option value="Survivor">Survivor</option>
              </select>
            </td></tr>
            <tr><th scope="row">Character</th><td>
              <select value={filters.character} onChange={e => setFilters(f => ({ ...f, character: e.target.value }))} className="themed-select w-full text-sm">
                <option value="All">All</option>
                {killers.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                {survivors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </td></tr>
            <tr><th scope="row">Tag</th><td>
              <select value={filters.tag} onChange={e => setFilters(f => ({ ...f, tag: e.target.value }))} className="themed-select w-full text-sm">
                {allTags.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </td></tr>
            <tr><th scope="row">Include perk</th><td>
              <input value={filters.include} onChange={e => setFilters(f => ({ ...f, include: e.target.value }))} placeholder="Dead Hard" className="cx-input w-full px-3 py-2 text-sm" />
            </td></tr>
            <tr><th scope="row">Exclude perk</th><td>
              <input value={filters.exclude} onChange={e => setFilters(f => ({ ...f, exclude: e.target.value }))} placeholder="No Mither" className="cx-input w-full px-3 py-2 text-sm" />
            </td></tr>
          </tbody></table>
          {showForm && (
            <div>
              <h2 className="cx-sec">Build form</h2>
              <BuildForm
                draft={editing || undefined}
                onSave={upsertBuild}
                onCancel={() => { setShowForm(false); setEditing(null); }}
                perks={perks}
                killers={killers}
                survivors={survivors}
                items={items}
                addons={addons}
                offerings={offerings}
              />
            </div>
          )}
          <h2 className="cx-sec">Saved builds</h2>
          <table className="cx-wikitable"><tbody>
            {filteredBuilds.map(build => (
              <tr key={build.id}>
                <th scope="row">{build.name}</th>
                <td>
                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                      <span className="cx-chip text-[10px] font-bold uppercase tracking-widest">{build.role}</span>
                      {build.characterName && <span className="text-xs text-zinc-400 font-semibold">{build.characterName}</span>}
                      {build.favorite && <span className="text-zinc-200 text-sm">*</span>}
                    </div>
                    <div className="flex gap-2 text-[11px] text-zinc-500">
                      {build.updatedAt && <span>Updated {formatDate(build.updatedAt)}</span>}
                      {build.createdAt && <span>Created {formatDate(build.createdAt)}</span>}
                    </div>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-1 text-xs">
                    <button type="button" className="cx-alink" onClick={() => { setEditing(build); setShowForm(true); }}>Edit</button>
                    <span style={{ color: 'var(--text-faint)' }}>·</span>
                    <button type="button" className="cx-alink" onClick={() => duplicateBuild(build)}>Duplicate</button>
                    <span style={{ color: 'var(--text-faint)' }}>·</span>
                    <button type="button" className="cx-alink" onClick={() => { const code = encodeBuild(build); if (code) { navigator.clipboard.writeText(code).then(() => alert('Build share text copied!')).catch(() => alert('Could not copy automatically. Please copy it manually.')); } else { alert('Could not prepare this build to share.'); } }}>Share</button>
                    <span style={{ color: 'var(--text-faint)' }}>·</span>
                    <button type="button" className="cx-alink" onClick={() => toggleFavorite(build.id)}>{build.favorite ? 'Unfavorite' : 'Favorite'}</button>
                    <span style={{ color: 'var(--text-faint)' }}>·</span>
                    <button type="button" className="cx-alink" onClick={() => deleteBuild(build.id)}>Delete</button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(build.perks || []).map(p => (
                      <span key={`${build.id}-${p.id}-${p.name}`} className="cx-chip text-[11px]">{p.name}</span>
                    ))}
                    {build.perks?.length === 0 && <span className="text-[11px] text-zinc-500">No perks selected</span>}
                  </div>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[12px] text-zinc-400">
                    {build.item && <p><span className="text-zinc-500 uppercase tracking-wider text-[10px] mr-1">Item</span>{build.item}</p>}
                    {build.addons?.length > 0 && <p><span className="text-zinc-500 uppercase tracking-wider text-[10px] mr-1">Add-ons</span>{build.addons.join(', ')}</p>}
                    {build.offering && <p><span className="text-zinc-500 uppercase tracking-wider text-[10px] mr-1">Offering</span>{build.offering}</p>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(build.tags || []).map(tag => <span key={tag} className="cx-chip text-[10px] font-bold uppercase tracking-wider">{tag}</span>)}
                  </div>
                  {build.notes && <p className="mt-2 text-sm text-zinc-300 leading-relaxed">{build.notes}</p>}
                </td>
              </tr>
            ))}
            {filteredBuilds.length === 0 && (
              <tr><th scope="row">Results</th><td><div className="text-center text-zinc-500">No builds match the current filters.</div></td></tr>
            )}
          </tbody></table>
          {templates?.length > 0 && (
            <div className="mt-6">
              <h2 className="cx-sec">Templates / Presets</h2>
              <table className="cx-wikitable"><tbody>
                {templates.map(tpl => (
                  <tr key={tpl.title}>
                    <th scope="row">{tpl.title}</th>
                    <td>
                      <div className="flex items-center justify-between mb-1">
                        <span className="cx-chip text-[10px] font-bold uppercase tracking-wider">{tpl.role}</span>
                        <span className="text-[10px] text-zinc-500 uppercase font-bold">{tpl.perks.length} perks</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {tpl.perks.map(p => <span key={p} className="cx-chip text-[11px]">{p}</span>)}
                      </div>
                      <p className="text-xs text-zinc-400 mt-2">{tpl.note}</p>
                      <button onClick={() => cloneTemplate(tpl)} className="cx-toolbtn mt-3 w-full py-2 text-sm font-bold">Clone into Build</button>
                    </td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          )}
        </div>
      );
    };


    const MatchLogView = ({ onBack, matches = [], setMatches, killers = [], survivors = [], builds = [], maps = [], prefs, setPrefs, onBuildUsed, onOpenAnalytics }) => {
      const lookups = useMemo(() => buildDataLookups({ killers, survivors, builds, maps }), [killers, survivors, builds, maps]);
      const blankForm = (role = prefs?.lastRole || 'Survivor') => ({
        id: null,
        role,
        date: new Date().toISOString().slice(0, 16),
        characterId: prefs?.lastCharacterId || '',
        buildId: prefs?.lastBuildId || '',
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
      });
      const [form, setForm] = useState(blankForm());
      const [editingId, setEditingId] = useState(null);
      const [filters, setFilters] = useState({ role: 'All', character: 'All', build: 'All', map: 'All', from: '', to: '' });
      const characters = form.role === 'Killer' ? killers : survivors;
      const buildsForRole = useMemo(() => builds.filter(build => build.role === form.role), [builds, form.role]);
      const mapOptions = useMemo(() => {
        const known = (maps || []).map(map => ({ value: map.id, label: map.name }));
        const legacy = [];
        const seen = new Set(known.map(option => option.label.toLowerCase()));
        matches.forEach((match) => {
          const label = getMatchMapLabel(match);
          if (!label || seen.has(label.toLowerCase())) return;
          seen.add(label.toLowerCase());
          legacy.push({ value: `legacy:${label}`, label });
        });
        return [...known, ...legacy];
      }, [maps, matches]);
      const characterOptions = useMemo(() => {
        const seen = new Set();
        const result = [];
        [...killers, ...survivors].forEach((character) => {
          if (!character?.id || seen.has(character.id)) return;
          seen.add(character.id);
          result.push({ value: character.id, label: character.name });
        });
        matches.forEach((match) => {
          const snapshotId = match?.characterSnapshot?.id;
          const snapshotName = getMatchCharacterLabel(match);
          if (!snapshotId || !snapshotName || seen.has(snapshotId)) return;
          seen.add(snapshotId);
          result.push({ value: snapshotId, label: snapshotName });
        });
        return result.sort((a, b) => a.label.localeCompare(b.label));
      }, [killers, survivors, matches]);
      const buildOptions = useMemo(() => {
        const seen = new Set();
        const result = [];
        builds.forEach((build) => {
          if (!build?.id || seen.has(build.id)) return;
          seen.add(build.id);
          result.push({ value: build.id, label: build.name });
        });
        matches.forEach((match) => {
          const snapshotId = match?.buildSnapshot?.id;
          const snapshotName = getMatchBuildLabel(match);
          if (!snapshotId || !snapshotName || seen.has(snapshotId)) return;
          seen.add(snapshotId);
          result.push({ value: snapshotId, label: snapshotName });
        });
        return result.sort((a, b) => a.label.localeCompare(b.label));
      }, [builds, matches]);
      useEffect(() => {
        if (!editingId) {
          setForm(blankForm(prefs?.lastRole || 'Survivor'));
        }
      }, [prefs?.lastRole, editingId]);
      const filteredMatches = useMemo(() => {
        return matches.filter((match) => {
          const mapFilterValue = match.mapId || (getMatchMapLabel(match) ? `legacy:${getMatchMapLabel(match)}` : 'All');
          const buildFilterValue = match.buildSnapshot?.id || match.buildId || 'All';
          const characterFilterValue = match.characterSnapshot?.id || match.characterId || 'All';
          const inRole = filters.role === 'All' || match.role === filters.role;
          const inChar = filters.character === 'All' || characterFilterValue === filters.character;
          const inBuild = filters.build === 'All' || buildFilterValue === filters.build;
          const inMap = filters.map === 'All' || mapFilterValue === filters.map;
          const inFrom = !filters.from || new Date(match.date) >= new Date(filters.from);
          const inTo = !filters.to || new Date(match.date) <= new Date(filters.to + 'T23:59');
          return inRole && inChar && inBuild && inMap && inFrom && inTo;
        });
      }, [matches, filters]);
      const changeRole = (role) => {
        setForm((current) => ({
          ...blankForm(role),
          date: current.date
        }));
      };
      const handleSubmit = () => {
        const now = new Date().toISOString();
        const payload = createMatchSnapshot({
          ...form,
          id: editingId || uuid(),
          createdAt: form.createdAt || now,
          updatedAt: now
        }, lookups);
        setMatches(prev => editingId ? prev.map(match => match.id === editingId ? payload : match) : [payload, ...prev]);
        setPrefs && setPrefs({ lastRole: payload.role, lastCharacterId: payload.characterId, lastBuildId: payload.buildId || null });
        onBuildUsed && payload.buildId && onBuildUsed(payload.buildId);
        setEditingId(null);
        setForm(blankForm(payload.role));
      };
      const editMatch = (match) => {
        setEditingId(match.id);
        setForm({
          ...blankForm(match.role),
          ...match,
          mapId: match.mapId || '',
          mapNameSnapshot: match.mapNameSnapshot || match.map || '',
          perkSnapshots: normalizePerkSnapshots(match.perkSnapshots)
        });
        setPrefs && setPrefs({ lastRole: match.role, lastCharacterId: match.characterId, lastBuildId: match.buildId || null });
      };
      const deleteMatch = (id) => {
        if (!confirm('Delete this match?')) return;
        setMatches(prev => prev.filter(match => match.id !== id));
      };
      return (
        <div className="flex flex-col h-full pt-6 pb-32 px-6 overflow-y-auto custom-scrollbar">
          <ViewCrumbs trail={[{ label: 'Main page', onClick: onBack }]} current="Match Log" />
          <h1 className="cx-title">Match Log</h1>
          <p className="cx-hatnote">Log games with saved build and map details.</p>
          <h2 className="cx-sec">Log match</h2>
          <table className="cx-wikitable"><tbody>
            <tr><th scope="row">Role</th><td>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => changeRole('Survivor')}
                  className="px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                  style={form.role === 'Survivor' ? { background: '#0a0a0a', border: '2px solid #fafafa', color: '#fafafa' } : { background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', color: '#a1a1aa' }}
                >Survivor</button>
                <button
                  onClick={() => changeRole('Killer')}
                  className="px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                  style={form.role === 'Killer' ? { background: '#0a0a0a', border: '2px solid #fafafa', color: '#fafafa' } : { background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', color: '#a1a1aa' }}
                >Killer</button>
                {editingId && <span className="text-[11px] text-zinc-200 font-bold">Editing existing match</span>}
              </div>
            </td></tr>
            <tr><th scope="row">Date/Time</th><td>
              <input type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full bg-zinc-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white" />
            </td></tr>
            <tr><th scope="row">Character</th><td>
              <select value={form.characterId} onChange={e => setForm(f => ({ ...f, characterId: e.target.value }))} className="themed-select w-full text-sm">
                <option value="">Any</option>
                {characters.map(character => <option key={character.id} value={character.id}>{character.name}</option>)}
              </select>
            </td></tr>
            <tr><th scope="row">Build</th><td>
              <select value={form.buildId || ''} onChange={e => setForm(f => ({ ...f, buildId: e.target.value }))} className="themed-select w-full text-sm">
                <option value="">Unlinked</option>
                {buildsForRole.map(build => <option key={build.id} value={build.id}>{build.name}</option>)}
              </select>
            </td></tr>
            <tr><th scope="row">Map</th><td>
              <select value={form.mapId || ''} onChange={e => setForm(f => ({ ...f, mapId: e.target.value }))} className="themed-select w-full text-sm">
                <option value="">Unknown / not set</option>
                {(maps || []).map((map) => <option key={map.id} value={map.id}>{map.name}</option>)}
              </select>
            </td></tr>
            <tr><th scope="row">Outcome</th><td>
              <select value={form.outcome} onChange={e => setForm(f => ({ ...f, outcome: e.target.value }))} className="themed-select w-full text-sm">
                {form.role === 'Killer' ? (
                  ['0 Kills', '1 Kill', '2 Kills', '3 Kills', '4 Kills', 'DC', 'Early Surrender'].map(option => <option key={option} value={option}>{option}</option>)
                ) : (
                  ['Escaped Gate', 'Escaped Hatch', 'Died', 'DC'].map(option => <option key={option} value={option}>{option}</option>)
                )}
              </select>
            </td></tr>
            <tr><th scope="row">Kills / Extra</th><td>
              <input type="number" min="0" max="4" value={form.kills} onChange={e => setForm(f => ({ ...f, kills: Number(e.target.value) }))} className="w-full bg-zinc-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white" />
              <label className="mt-1 inline-flex items-center gap-2 text-[12px] text-zinc-400"><input type="checkbox" checked={form.dc} onChange={e => setForm(f => ({ ...f, dc: e.target.checked }))} /> DC / early quit</label>
            </td></tr>
            <tr><th scope="row">Self Perf</th><td>
              <input type="number" min="0" max="10" value={form.performance} onChange={e => setForm(f => ({ ...f, performance: e.target.value }))} className="w-full bg-zinc-800/60 border border-white/10 rounded-xl px-2 py-1 text-xs text-white" />
            </td></tr>
            <tr><th scope="row">Sweat</th><td>
              <input type="number" min="0" max="10" value={form.sweat} onChange={e => setForm(f => ({ ...f, sweat: e.target.value }))} className="w-full bg-zinc-800/60 border border-white/10 rounded-xl px-2 py-1 text-xs text-white" />
            </td></tr>
            <tr><th scope="row">Tilt</th><td>
              <input type="number" min="0" max="10" value={form.tilt} onChange={e => setForm(f => ({ ...f, tilt: e.target.value }))} className="w-full bg-zinc-800/60 border border-white/10 rounded-xl px-2 py-1 text-xs text-white" />
            </td></tr>
            <tr><th scope="row">Hooks</th><td>
              <input type="number" value={form.hooks} onChange={e => setForm(f => ({ ...f, hooks: e.target.value }))} className="w-full bg-zinc-800/60 border border-white/10 rounded-xl px-2 py-1 text-xs text-white" />
            </td></tr>
            <tr><th scope="row">Gens Done</th><td>
              <input type="number" value={form.gens} onChange={e => setForm(f => ({ ...f, gens: e.target.value }))} className="w-full bg-zinc-800/60 border border-white/10 rounded-xl px-2 py-1 text-xs text-white" />
            </td></tr>
            <tr><th scope="row">Notes</th><td>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full bg-zinc-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500" placeholder="What went well? What to change?"></textarea>
            </td></tr>
            <tr><th scope="row">Save</th><td>
              <div className="flex justify-end gap-2">
                <button onClick={() => { setForm(blankForm(form.role)); setEditingId(null); }} className="px-4 py-2 rounded-xl text-sm font-bold bg-white/5 text-zinc-300 border border-white/10">Reset</button>
                <button onClick={handleSubmit} className="px-4 py-2 rounded-xl text-sm font-bold bg-zinc-100 text-black shadow-lg">{editingId ? 'Update Match' : 'Save Match'}</button>
              </div>
            </td></tr>
          </tbody></table>
          <h2 className="cx-sec">History filters</h2>
          <table className="cx-wikitable"><tbody>
            <tr><th scope="row">Role</th><td>
              <select value={filters.role} onChange={e => setFilters(f => ({ ...f, role: e.target.value }))} className="themed-select w-full text-sm">
                <option value="All">All roles</option>
                <option value="Killer">Killer</option>
                <option value="Survivor">Survivor</option>
              </select>
            </td></tr>
            <tr><th scope="row">Character</th><td>
              <select value={filters.character} onChange={e => setFilters(f => ({ ...f, character: e.target.value }))} className="themed-select w-full text-sm">
                <option value="All">Any character</option>
                {characterOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </td></tr>
            <tr><th scope="row">Build</th><td>
              <select value={filters.build} onChange={e => setFilters(f => ({ ...f, build: e.target.value }))} className="themed-select w-full text-sm">
                <option value="All">Any build</option>
                {buildOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </td></tr>
            <tr><th scope="row">Map</th><td>
              <select value={filters.map} onChange={e => setFilters(f => ({ ...f, map: e.target.value }))} className="themed-select w-full text-sm">
                <option value="All">Any map</option>
                {mapOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </td></tr>
            <tr><th scope="row">From</th><td>
              <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} className="w-full bg-zinc-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white" />
            </td></tr>
            <tr><th scope="row">To</th><td>
              <input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} className="w-full bg-zinc-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white" />
            </td></tr>
            <tr><th scope="row">Win Definition - Killer</th><td>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-400 w-14">Killer:</span>
                <select
                  value={prefs?.killerWinThreshold ?? 2}
                  onChange={e => setPrefs && setPrefs(p => ({ ...p, killerWinThreshold: Number(e.target.value) }))}
                  className="themed-select text-xs py-1 px-3 min-w-[100px]"
                >
                  <option value={0}>0+ kills</option>
                  <option value={1}>1+ kills</option>
                  <option value={2}>2+ kills</option>
                  <option value={3}>3+ kills</option>
                  <option value={4}>4 kills</option>
                </select>
              </div>
              <p className="text-[9px] text-zinc-600 mt-1">Survivor: Escaped = Win</p>
            </td></tr>
            <tr><th scope="row">Analytics</th><td>
              <button
                onClick={onOpenAnalytics}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-zinc-200 hover:bg-white/10 transition-colors"
              >
                Open Progression Analytics
              </button>
              <div className="text-xs text-zinc-400 mt-2">Showing {filteredMatches.length} / {matches.length} logged matches.</div>
            </td></tr>
          </tbody></table>
          <h2 className="cx-sec">Logged matches ({filteredMatches.length} entries)</h2>
          <table className="cx-wikitable"><tbody>
            {filteredMatches.map(match => (
              <tr key={match.id}>
                <th scope="row">{getMatchCharacterLabel(match)}</th>
                <td>
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap justify-between gap-2 items-center">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${match.role === 'Killer' ? 'bg-white/10 text-zinc-100' : 'bg-white/5 text-zinc-300'}`}>{match.role}</span>
                        <span className="text-white font-semibold text-sm">{getMatchCharacterLabel(match)}</span>
                        {(match.buildSnapshot?.name || match.buildId) && <span className="text-[11px] text-zinc-400">- {getMatchBuildLabel(match)}</span>}
                      </div>
                      <div className="flex gap-2 text-[11px] text-zinc-400">
                        <button onClick={() => editMatch(match)} className="px-2 py-1 rounded-lg bg-white/5 border border-white/10">Edit</button>
                        <button onClick={() => deleteMatch(match.id)} className="px-2 py-1 rounded-lg bg-white/10 border border-white/25 text-zinc-100">Delete</button>
                      </div>
                    </div>
                    <div className="text-xs text-zinc-500 flex flex-wrap gap-2">
                      <span>{formatDate(match.date)}</span>
                      <span>- Map {getMatchMapLabel(match)}</span>
                      <span>- Outcome {match.outcome}</span>
                      <span>- Kills {match.kills}</span>
                      {match.performance && <span>- Self {match.performance}</span>}
                      {match.sweat && <span>- Sweat {match.sweat}</span>}
                      {match.tilt && <span>- Tilt {match.tilt}</span>}
                      {match.dc && <span className="text-zinc-400">- DC</span>}
                    </div>
                    {match.perkSnapshots?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {match.perkSnapshots.map((perk) => (
                          <span key={`${match.id}-${perk.id || perk.name}`} className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] text-zinc-300">
                            {perk.name}
                          </span>
                        ))}
                      </div>
                    )}
                    {match.notes && <p className="text-sm text-zinc-300">{match.notes}</p>}
                  </div>
                </td>
              </tr>
            ))}
            {filteredMatches.length === 0 && <tr><th scope="row">Results</th><td><div className="text-center text-zinc-500 py-6">No matches logged yet.</div></td></tr>}
          </tbody></table>
        </div>
      );
    };
    const ANALYTICS_FILTER_DEFAULTS = { role: 'All', character: 'All', build: 'All', map: 'All', from: '', to: '' };
    const summarizeMatchesBy = (list, prefs, getKey, getLabel) => {
      const bucket = {};
      list.forEach((match) => {
        const key = getKey(match);
        const label = getLabel(match);
        if (!key || !label) return;
        const entry = bucket[key] || { key, label, total: 0, wins: 0, perf: 0, last: null };
        entry.total += 1;
        entry.wins += isMatchWin(match, prefs) ? 1 : 0;
        entry.perf += Number(match.performance) || 0;
        entry.last = entry.last && new Date(entry.last) > new Date(match.date) ? entry.last : match.date;
        bucket[key] = entry;
      });
      return Object.values(bucket).map((entry) => {
        const avgPerfValue = entry.total ? entry.perf / entry.total : 0;
        return {
          ...entry,
          rate: entry.total ? Math.round((entry.wins / entry.total) * 100) : 0,
          avgPerfValue,
          avgPerf: entry.total ? avgPerfValue.toFixed(1) : '-'
        };
      });
    };
    const summarizePerksAcrossMatches = (list, prefs) => {
      const bucket = {};
      list.forEach((match) => {
        normalizePerkSnapshots(match.perkSnapshots).forEach((perk) => {
          const key = perk.id || perk.name;
          if (!key) return;
          const entry = bucket[key] || { key, label: perk.name, total: 0, wins: 0, perf: 0, last: null, owner: perk.owner || '', type: perk.type || '' };
          entry.total += 1;
          entry.wins += isMatchWin(match, prefs) ? 1 : 0;
          entry.perf += Number(match.performance) || 0;
          entry.last = entry.last && new Date(entry.last) > new Date(match.date) ? entry.last : match.date;
          bucket[key] = entry;
        });
      });
      return Object.values(bucket).map((entry) => {
        const avgPerfValue = entry.total ? entry.perf / entry.total : 0;
        return {
          ...entry,
          rate: entry.total ? Math.round((entry.wins / entry.total) * 100) : 0,
          avgPerfValue,
          avgPerf: entry.total ? avgPerfValue.toFixed(1) : '-'
        };
      });
    };
    const MatchAnalyticsPanel = ({ matches = [], prefs = {}, killers = [], survivors = [], builds = [], maps = [], onOpenMatches }) => {
      const [filters, setFilters] = useState(ANALYTICS_FILTER_DEFAULTS);
      const characterOptions = useMemo(() => {
        const seen = new Set();
        const options = [];
        [...killers, ...survivors].forEach((character) => {
          if (!character?.id || seen.has(character.id)) return;
          seen.add(character.id);
          options.push({ value: character.id, label: character.name });
        });
        matches.forEach((match) => {
          const snapshotId = match?.characterSnapshot?.id;
          const snapshotName = getMatchCharacterLabel(match);
          if (!snapshotId || !snapshotName || seen.has(snapshotId)) return;
          seen.add(snapshotId);
          options.push({ value: snapshotId, label: snapshotName });
        });
        return options.sort((a, b) => a.label.localeCompare(b.label));
      }, [killers, survivors, matches]);
      const buildOptions = useMemo(() => {
        const seen = new Set();
        const options = [];
        builds.forEach((build) => {
          if (!build?.id || seen.has(build.id)) return;
          seen.add(build.id);
          options.push({ value: build.id, label: build.name });
        });
        matches.forEach((match) => {
          const snapshotId = match?.buildSnapshot?.id;
          const snapshotName = getMatchBuildLabel(match);
          if (!snapshotId || !snapshotName || seen.has(snapshotId)) return;
          seen.add(snapshotId);
          options.push({ value: snapshotId, label: snapshotName });
        });
        return options.sort((a, b) => a.label.localeCompare(b.label));
      }, [builds, matches]);
      const mapOptions = useMemo(() => {
        const known = (maps || []).map((map) => ({ value: map.id, label: map.name }));
        const legacy = [];
        const seen = new Set(known.map(option => option.label.toLowerCase()));
        matches.forEach((match) => {
          const label = getMatchMapLabel(match);
          if (!label || seen.has(label.toLowerCase())) return;
          seen.add(label.toLowerCase());
          legacy.push({ value: `legacy:${label}`, label });
        });
        return [...known, ...legacy];
      }, [maps, matches]);
      const filteredMatches = useMemo(() => {
        return matches.filter((match) => {
          const mapFilterValue = match.mapId || (getMatchMapLabel(match) ? `legacy:${getMatchMapLabel(match)}` : 'All');
          const buildFilterValue = match.buildSnapshot?.id || match.buildId || 'All';
          const characterFilterValue = match.characterSnapshot?.id || match.characterId || 'All';
          const inRole = filters.role === 'All' || match.role === filters.role;
          const inChar = filters.character === 'All' || characterFilterValue === filters.character;
          const inBuild = filters.build === 'All' || buildFilterValue === filters.build;
          const inMap = filters.map === 'All' || mapFilterValue === filters.map;
          const inFrom = !filters.from || new Date(match.date) >= new Date(filters.from);
          const inTo = !filters.to || new Date(match.date) <= new Date(filters.to + 'T23:59');
          return inRole && inChar && inBuild && inMap && inFrom && inTo;
        });
      }, [matches, filters]);
      const killerMatches = filteredMatches.filter(match => match.role === 'Killer');
      const survivorMatches = filteredMatches.filter(match => match.role === 'Survivor');
      const totalWins = filteredMatches.filter(match => isMatchWin(match, prefs)).length;
      const overallWinRate = filteredMatches.length ? Math.round((totalWins / filteredMatches.length) * 100) : 0;
      const survivorWinRate = survivorMatches.length ? Math.round((survivorMatches.filter(match => isMatchWin(match, prefs)).length / survivorMatches.length) * 100) : 0;
      const killerWinRate = killerMatches.length ? Math.round((killerMatches.filter(match => isMatchWin(match, prefs)).length / killerMatches.length) * 100) : 0;
      const perkSnapshotMatches = filteredMatches.filter(match => normalizePerkSnapshots(match.perkSnapshots).length > 0).length;
      const killerStats = summarizeMatchesBy(killerMatches, prefs, match => match.characterSnapshot?.id || match.characterId || getMatchCharacterLabel(match), getMatchCharacterLabel);
      const survivorStats = summarizeMatchesBy(survivorMatches, prefs, match => match.characterSnapshot?.id || match.characterId || getMatchCharacterLabel(match), getMatchCharacterLabel);
      const buildStats = summarizeMatchesBy(filteredMatches.filter(match => match.buildSnapshot?.name || match.buildId), prefs, match => match.buildSnapshot?.id || match.buildId || getMatchBuildLabel(match), getMatchBuildLabel);
      const mapStats = summarizeMatchesBy(filteredMatches, prefs, match => match.mapId || getMatchMapLabel(match), getMatchMapLabel);
      const perkStats = summarizePerksAcrossMatches(filteredMatches, prefs);
      const sortRows = (rows) => rows.slice().sort((a, b) => b.rate - a.rate || b.total - a.total || b.avgPerfValue - a.avgPerfValue).slice(0, 8);
      const AnalyticsBoard = ({ title, rows, empty, subtitle }) => (
        <div className="p-4 rounded-3xl bg-zinc-900/50 border border-white/10">
          <div className="flex items-baseline justify-between gap-3 mb-2">
            <p className="text-xs uppercase font-bold text-zinc-500">{title}</p>
            {subtitle && <span className="text-[10px] text-zinc-600 uppercase tracking-wider">{subtitle}</span>}
          </div>
          {rows.length === 0 && <p className="text-zinc-500 text-sm">{empty}</p>}
          <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
            {sortRows(rows).map((row) => (
              <div key={row.key} className="p-2 rounded-xl bg-white/5 border border-white/10">
                <div className="flex justify-between text-sm text-white font-semibold mb-1 gap-2">
                  <span className="truncate">{row.label}</span>
                  <span style={{ color: row.rate >= 50 ? '#4ade80' : '#f87171' }}>{row.rate}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden mb-1">
                  <div className="h-full rounded-full transition-all" style={{ width: `${row.rate}%`, background: row.rate >= 50 ? '#fafafa' : '#52525b' }} />
                </div>
                <p className="text-[10px] text-zinc-500">{row.total} matches · Avg self score {row.avgPerf}</p>
                {(row.owner || row.type) && <p className="text-[10px] text-zinc-600 mt-1">{[row.type, row.owner].filter(Boolean).join(' · ')}</p>}
              </div>
            ))}
          </div>
        </div>
      );
      return (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-zinc-900/60 border border-white/10">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Analytics Filters</p>
              <button onClick={onOpenMatches} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-zinc-200 hover:bg-white/10 transition-colors">
                Open Match Log
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select value={filters.role} onChange={e => setFilters(current => ({ ...current, role: e.target.value }))} className="themed-select w-full text-sm">
                <option value="All">All roles</option>
                <option value="Killer">Killer</option>
                <option value="Survivor">Survivor</option>
              </select>
              <select value={filters.character} onChange={e => setFilters(current => ({ ...current, character: e.target.value }))} className="themed-select w-full text-sm">
                <option value="All">Any character</option>
                {characterOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <select value={filters.build} onChange={e => setFilters(current => ({ ...current, build: e.target.value }))} className="themed-select w-full text-sm">
                <option value="All">Any build</option>
                {buildOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <select value={filters.map} onChange={e => setFilters(current => ({ ...current, map: e.target.value }))} className="themed-select w-full text-sm">
                <option value="All">Any map</option>
                {mapOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <input type="date" value={filters.from} onChange={e => setFilters(current => ({ ...current, from: e.target.value }))} className="w-full bg-zinc-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white" />
              <input type="date" value={filters.to} onChange={e => setFilters(current => ({ ...current, to: e.target.value }))} className="w-full bg-zinc-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Filtered Matches', value: filteredMatches.length, color: '#f4f4f5' },
              { label: 'Overall Win Rate', value: `${overallWinRate}%`, color: overallWinRate >= 50 ? '#fafafa' : '#a1a1aa' },
              { label: 'Survivor Win Rate', value: `${survivorWinRate}%`, color: '#a1a1aa' },
              { label: 'Killer Win Rate', value: `${killerWinRate}%`, color: '#fafafa' },
              { label: 'Perk Coverage', value: `${perkSnapshotMatches}/${filteredMatches.length || 0}`, color: 'var(--rar-rare)' }
            ].map((card) => (
              <div key={card.label} className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 text-center">
                <p className="text-2xl font-bold" style={{ color: card.color }}>{card.value}</p>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mt-1">{card.label}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <AnalyticsBoard title="Killer Performance" rows={killerStats} empty="No killer-side matches in the current filter." />
            <AnalyticsBoard title="Survivor Performance" rows={survivorStats} empty="No survivor-side matches in the current filter." />
            <AnalyticsBoard title="Build Performance" rows={buildStats} empty="No linked saved builds in the current filter." />
            <AnalyticsBoard title="Map Performance" rows={mapStats} empty="No map history in the current filter." subtitle="Saved history" />
            <div className="lg:col-span-2">
              <AnalyticsBoard title="Perk Performance" rows={perkStats} empty="No perk history yet. Link a build when logging matches to populate this." subtitle="Based on saved loadouts" />
            </div>
          </div>
        </div>
      );
    };
    const WorldleView = ({ onBack, killers = [], perks = [], worldleState, setWorldleState, isCompactLayout = false }) => {
      const [mode, setMode] = useState('classic');
      const [queueType, setQueueType] = useState('daily');
      const [guessInput, setGuessInput] = useState('');
      const guessInputRef = useRef(null);
      const [inputError, setInputError] = useState('');
      const [inputNotice, setInputNotice] = useState('');
      const [inputSuggestions, setInputSuggestions] = useState([]);
      const todayKey = getWorldleDateKey();
      const killerCatalog = useMemo(() => buildWorldleKillerCatalog(killers).sort((a, b) => a.name.localeCompare(b.name)), [killers]);
      const emojiVariantCatalog = useMemo(() => buildWorldleEmojiVariantCatalog(killerCatalog), [killerCatalog]);
      const emojiVariantsById = useMemo(() => (
        Object.fromEntries(emojiVariantCatalog.map((entry) => [entry.variantId, entry]))
      ), [emojiVariantCatalog]);
      const survivorPerkCatalog = useMemo(() => buildWorldlePerkCatalog(perks, 'Survivor').sort((a, b) => a.name.localeCompare(b.name)), [perks]);
      const killerPerkCatalog = useMemo(() => buildWorldlePerkCatalog(perks, 'Killer').sort((a, b) => a.name.localeCompare(b.name)), [perks]);
      const teachableCatalog = useMemo(() => buildTeachableCatalog(killers, perks).sort((a, b) => a.name.localeCompare(b.name)), [killers, perks]);
      const practiceEnabled = WORLDLE_MODE_META[mode]?.queue === 'flex';
      const activeQueue = practiceEnabled ? queueType : 'daily';
      const activeCatalog = useMemo(() => {
        if (mode === 'classic' || mode === 'emoji') return killerCatalog;
        if (mode === 'survivorPerk') return survivorPerkCatalog;
        if (mode === 'killerPerk') return killerPerkCatalog;
        if (mode === 'teachables') return teachableCatalog;
        return [];
      }, [mode, killerCatalog, survivorPerkCatalog, killerPerkCatalog, teachableCatalog]);
      const storedSession = activeQueue === 'daily' ? worldleState?.daily?.[mode] : worldleState?.practice?.[mode];
      const session = useMemo(() => {
        const hasEmojiVariant = mode !== 'emoji'
          || (storedSession?.emojiVariantId && Array.isArray(storedSession?.emojiDisplay) && storedSession.emojiDisplay.length === 3);
        if (activeQueue === 'daily' && storedSession && storedSession.dateKey === todayKey && storedSession.targetId && hasEmojiVariant) return storedSession;
        if (activeQueue === 'practice' && storedSession && storedSession.targetId && hasEmojiVariant) return storedSession;
        return activeQueue === 'daily'
          ? createDailyWorldleSession(mode, activeCatalog, todayKey, { emojiVariantsById })
          : createPracticeWorldleSession(mode, activeCatalog, todayKey, 0, { emojiVariants: emojiVariantCatalog, emojiVariantsById });
      }, [activeQueue, storedSession, todayKey, mode, activeCatalog, emojiVariantCatalog, emojiVariantsById]);
      const isPhoneLayout = Boolean(isCompactLayout);
      const practiceRoundLabel = Math.max(1, Number(session?.round) || 1);
      const compactPuzzleBadge = useMemo(() => {
        if (activeQueue === 'practice') return `Run ${practiceRoundLabel}`;
        const parsed = new Date(`${todayKey}T12:00:00`);
        const badgeDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
        return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(badgeDate);
      }, [activeQueue, todayKey, practiceRoundLabel]);
      const target = useMemo(() => {
        if (mode === 'emoji' && session?.emojiVariantId && emojiVariantsById[session.emojiVariantId]) {
          const variant = emojiVariantsById[session.emojiVariantId];
          return activeCatalog.find(entry => entry.id === variant.targetId) || null;
        }
        return activeCatalog.find(entry => entry.id === session?.targetId)
          || (activeQueue === 'daily'
            ? pickDeterministicEntry(activeCatalog, `${mode}:${todayKey}`)
            : activeCatalog.find(entry => entry.id === session?.queue?.[0]))
          || null;
      }, [activeCatalog, session, activeQueue, mode, todayKey, emojiVariantsById]);
      const activeEmojiVariant = useMemo(() => {
        if (mode !== 'emoji') return null;
        return resolveWorldleEmojiVariantFromSession({ target, session, variantsById: emojiVariantsById });
      }, [mode, target, session, emojiVariantsById]);
      const solvedIds = Array.isArray(session?.solvedIds) ? session.solvedIds : [];
      const wrongGuesses = countWorldleWrongGuesses(session);
      const guessCount = Array.isArray(session?.guesses) ? session.guesses.filter(guess => guess && guess.duplicate !== true).length : 0;
      const isFinished = session?.solved || session?.failed;
      const statsBucket = worldleState?.stats?.[mode]?.[activeQueue] || createWorldleStatsBucket();
      const historyRows = worldleState?.history?.[mode]?.[activeQueue] || [];
      useEffect(() => {
        setGuessInput('');
        setInputError('');
        setInputNotice('');
        setInputSuggestions([]);
      }, [mode, activeQueue]);
      const persistSession = (next, nextSession) => {
        if (activeQueue === 'daily') {
          next.daily[mode] = nextSession;
        } else {
          next.practice[mode] = nextSession;
        }
        return next;
      };
      const hydrateSession = (prev) => ensureWorldleSession({
        state: prev,
        mode,
        queue: activeQueue,
        catalog: activeCatalog,
        dateKey: todayKey,
        options: { emojiVariants: emojiVariantCatalog, emojiVariantsById }
      });
      const setDuplicateError = (label) => {
        setInputError(`${label} was already tried.`);
      };
      const clearInputFeedback = () => {
        setInputError('');
        setInputNotice('');
        setInputSuggestions([]);
      };
      const normalizeGuessFeedbackInput = (value = '') => String(value || '').trim().toLowerCase();
      const getActiveGuessInput = () => {
        const liveValue = guessInputRef.current && typeof guessInputRef.current.value === 'string'
          ? guessInputRef.current.value
          : guessInput;
        return String(liveValue || '');
      };
      const handleGuessSubmit = (overrideGuess = null) => {
        const rawGuess = String(overrideGuess ?? getActiveGuessInput()).trim();
        if (!rawGuess || !target || !session || session.solved || session.failed) return;
        const entityLabel = getWorldleGuessEntityLabel(mode);
        if (mode === 'teachables') {
          const attempt = resolveWorldleGuessAttempt(killerPerkCatalog, rawGuess);
          if (!attempt.entry) {
            setInputNotice('');
            setInputSuggestions(attempt.suggestions);
            setInputError(attempt.suggestions.length
              ? `Unknown ${entityLabel}. Try one of the matches below or edit the name.`
              : `Unknown ${entityLabel}. Check the spelling and try again.`);
            return;
          }
          const guess = attempt.entry;
          const correctedName = attempt.autoCorrected ? attempt.correctedName : '';
          const alreadyTried = (session.guesses || []).some(entry => entry.id === guess.id) || (session.solvedIds || []).includes(guess.id);
          if (alreadyTried) {
            setInputNotice('');
            setInputSuggestions([]);
            setDuplicateError(correctedName || rawGuess);
            return;
          }
          setWorldleState((prev) => {
            const ensured = hydrateSession(prev);
            let next = ensured.state;
            let activeSession = activeQueue === 'daily' ? next.daily[mode] : next.practice[mode];
            if (!activeSession || activeSession.solved || activeSession.failed) return prev;
            const now = new Date().toISOString();
            const correct = target.teachables.some(perk => perk.id === guess.id);
            const nextGuesses = [...(activeSession.guesses || []), { id: guess.id, label: guess.name, correct }];
            const nextSolvedIds = correct ? [...(activeSession.solvedIds || []), guess.id] : (activeSession.solvedIds || []);
            activeSession = {
              ...activeSession,
              guesses: nextGuesses,
              solvedIds: nextSolvedIds,
              solved: nextSolvedIds.length === target.teachables.length,
              failed: false,
              completedAt: nextSolvedIds.length === target.teachables.length ? now : null
            };
            next = persistSession(next, activeSession);
            if (activeSession.solved) {
              next = recordWorldleResult(next, {
                mode,
                queue: activeQueue,
                result: buildWorldleResultEntry({ mode, queue: activeQueue, target, guessCount: nextGuesses.length, solved: true, dateKey: activeQueue === 'daily' ? activeSession.dateKey : todayKey, session: activeSession, emojiVariant: activeEmojiVariant })
              });
            }
            return next;
          });
          setGuessInput('');
          setInputError('');
          setInputSuggestions([]);
          setInputNotice(correctedName ? `Using ${correctedName}.` : '');
          return;
        }
        const attempt = resolveWorldleGuessAttempt(activeCatalog, rawGuess);
        if (!attempt.entry) {
          setInputNotice('');
          setInputSuggestions(attempt.suggestions);
          setInputError(attempt.suggestions.length
            ? `Unknown ${entityLabel}. Try one of the matches below or edit the name.`
            : `Unknown ${entityLabel}. Check the spelling and try again.`);
          return;
        }
        const guess = attempt.entry;
        const correctedName = attempt.autoCorrected ? attempt.correctedName : '';
        const alreadyTried = (session.guesses || []).some(entry => entry.id === guess.id);
        if (alreadyTried) {
          setInputNotice('');
          setInputSuggestions([]);
          setDuplicateError(correctedName || rawGuess);
          return;
        }
        setWorldleState((prev) => {
          const ensured = hydrateSession(prev);
          let next = ensured.state;
          let activeSession = activeQueue === 'daily' ? next.daily[mode] : next.practice[mode];
          if (!activeSession || activeSession.solved || activeSession.failed) return prev;
          const now = new Date().toISOString();
          const correct = guess.id === target.id;
          const nextGuesses = [...(activeSession.guesses || []), { id: guess.id, label: guess.name, correct }];
          activeSession = {
            ...activeSession,
            guesses: nextGuesses,
            solved: correct,
            failed: false,
            revealedClues: mode === 'emoji' ? Math.min(3, 1 + nextGuesses.filter(entry => entry.correct === false).length) : activeSession.revealedClues,
            completedAt: correct ? now : null
          };
          next = persistSession(next, activeSession);
          if (correct) {
            next = recordWorldleResult(next, {
              mode,
              queue: activeQueue,
              result: buildWorldleResultEntry({ mode, queue: activeQueue, target, guessCount: nextGuesses.length, solved: true, dateKey: activeQueue === 'daily' ? activeSession.dateKey : todayKey, session: activeSession, emojiVariant: activeEmojiVariant })
            });
          }
          return next;
        });
        setGuessInput('');
        setInputError('');
        setInputSuggestions([]);
        setInputNotice(correctedName ? `Using ${correctedName}.` : '');
      };
      const handleGiveUp = () => {
        if (!target || isFinished) return;
        setWorldleState((prev) => {
          const ensured = hydrateSession(prev);
          let next = ensured.state;
          let activeSession = activeQueue === 'daily' ? next.daily[mode] : next.practice[mode];
          if (!activeSession || activeSession.solved || activeSession.failed) return prev;
          activeSession = {
            ...activeSession,
            failed: true,
            solved: false,
            completedAt: new Date().toISOString()
          };
          next = persistSession(next, activeSession);
          return recordWorldleResult(next, {
            mode,
            queue: activeQueue,
            result: buildWorldleResultEntry({ mode, queue: activeQueue, target, guessCount: guessCount || 0, solved: false, dateKey: activeQueue === 'daily' ? activeSession.dateKey : todayKey, session: activeSession, emojiVariant: activeEmojiVariant })
          });
        });
        clearInputFeedback();
      };
      const advancePractice = () => {
        if (activeQueue !== 'practice') return;
        setWorldleState(prev => advancePracticeWorldleSession({ mode, state: prev, catalog: activeCatalog, dateKey: todayKey, options: { emojiVariants: emojiVariantCatalog, emojiVariantsById } }));
        setGuessInput('');
        clearInputFeedback();
      };
      const getPerkRevealStyle = () => {
        const stage = Math.min(3, wrongGuesses);
        if (stage === 0) return { filter: 'blur(8px) brightness(0.68) saturate(0.82)' };
        if (stage === 1) return { filter: 'blur(5px) brightness(0.78) saturate(0.9)' };
        if (stage === 2) return { filter: 'blur(2px) brightness(0.9) saturate(0.96)' };
        return { filter: 'none' };
      };
      const formatClassicValue = (field, value) => {
        if (field === 'licensed') return value ? 'Licensed' : 'Original';
        if (field === 'releaseYear') return value || '?';
        return value || '?';
      };
      const classicFields = [
        { key: 'height', label: 'Height' },
        { key: 'speed', label: 'Speed' },
        { key: 'terrorRadius', label: 'TR' },
        { key: 'licensed', label: 'Origin' },
        { key: 'gender', label: 'Gender' },
        { key: 'releaseYear', label: 'Year' }
      ];
      const revealedClassicFields = useMemo(() => {
        const revealed = Object.fromEntries(classicFields.map(field => [field.key, false]));
        if (!target) return revealed;
        if (isFinished) {
          classicFields.forEach(field => {
            revealed[field.key] = true;
          });
          return revealed;
        }
        (session?.guesses || []).forEach((guess) => {
          const guessedKiller = killerCatalog.find(entry => entry.id === guess.id);
          if (!guessedKiller) return;
          classicFields.forEach((field) => {
            if (guessedKiller[field.key] === target[field.key]) {
              revealed[field.key] = true;
            }
          });
        });
        return revealed;
      }, [classicFields, target, isFinished, session, killerCatalog]);
      const renderClassicGuess = (guess, index) => {
        const guessedKiller = killerCatalog.find(entry => entry.id === guess.id);
        if (!guessedKiller || !target) return null;
        return (
          <div key={`${guess.id}-${index}`} className="p-3 cx-flatcard">
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-sm font-bold text-white">{guessedKiller.name}</p>
              <span className={`px-2 py-1 border text-[10px] uppercase tracking-wider font-bold ${guess.correct ? 'wl-hit' : 'wl-miss'}`}>
                {guess.correct ? 'Solved' : 'Wrong'}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
              {classicFields.map((field) => {
                const guessedValue = guessedKiller[field.key];
                const targetValue = target[field.key];
                const exact = guessedValue === targetValue;
                const yearHint = field.key === 'releaseYear' && guessedValue && targetValue && guessedValue !== targetValue
                  ? guessedValue < targetValue ? '↑' : '↓'
                  : '';
                const palette = exact
                  ? 'wl-hit'
                  : field.key === 'releaseYear'
                    ? 'wl-miss'
                    : 'wl-miss--strong';
                return (
                  <div key={field.key} className={`p-2 border ${palette}`}>
                    <p className="text-[10px] uppercase tracking-wider opacity-70 mb-1">{field.label}</p>
                    <p className="text-xs font-semibold">
                      {formatClassicValue(field.key, guessedValue)} {yearHint}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      };
      const histogramMax = Math.max(1, ...Object.values(statsBucket.histogram || {}).map(value => Number(value) || 0));
      if (!target || activeCatalog.length === 0) {
        return (
          <div className="flex flex-col h-full pt-6 pb-32 px-6 overflow-y-auto custom-scrollbar">
            <ViewCrumbs trail={[{ label: 'Main page', onClick: onBack }]} current="Wordle" />
            <h1 className="cx-title">Wordle</h1>
            <p className="cx-hatnote">Test your DBD knowledge - daily and practice modes.</p>
            <table className="cx-wikitable"><tbody>
              <tr><th scope="row">Status</th><td><div className="text-center text-zinc-400">
                Wordle data is unavailable right now.
              </div></td></tr>
            </tbody></table>
          </div>
        );
      }
      return (
        <div className="flex flex-col h-full pt-6 pb-32 px-6 overflow-y-auto custom-scrollbar">
          <ViewCrumbs trail={[{ label: 'Main page', onClick: onBack }]} current="Wordle" />
          <h1 className="cx-title">Wordle</h1>
          <p className="cx-hatnote">Test your DBD knowledge - daily and practice modes.</p>
          <h2 className="cx-sec">Game mode</h2>
          <table className="cx-wikitable"><tbody>
            <tr><th scope="row">Mode</th><td>
              <div className={`flex flex-wrap gap-2`}>
                {WORLDLE_MODES.map((modeId) => (
                  <button
                    type="button"
                    key={modeId}
                    onClick={() => setMode(modeId)}
                    className={`mode-choice px-3 py-2 text-xs font-bold uppercase tracking-[0.22em] ${mode === modeId ? 'mode-choice--active' : ''}`}
                  >
                    {WORLDLE_MODE_META[modeId].label}
                  </button>
                ))}
              </div>
            </td></tr>
            {practiceEnabled && (
              <tr><th scope="row">Queue</th><td>
                <div className={`flex flex-wrap gap-2`}>
                  {['daily', 'practice'].map((entry) => (
                    <button
                      type="button"
                      key={entry}
                      onClick={() => setQueueType(entry)}
                      className={`mode-choice px-3 py-2 text-xs font-bold uppercase tracking-[0.22em] ${activeQueue === entry ? 'mode-choice--active' : ''}`}
                    >
                      {entry === 'daily' ? 'Daily' : 'Practice'}
                    </button>
                  ))}
                </div>
              </td></tr>
            )}
            <tr><th scope="row">Puzzle</th><td>
              <div className={`mb-4 ${isPhoneLayout ? 'space-y-3' : 'flex items-start justify-between gap-4'}`}>
                <div>
                  <div className={`flex flex-wrap items-center gap-2 ${isPhoneLayout ? 'mb-1' : ''}`}>
                    <p className="text-[11px] uppercase tracking-[0.28em] text-zinc-500 font-bold">{activeQueue === 'daily' ? 'Daily Puzzle' : 'Practice Queue'}</p>
                    {isPhoneLayout && (
                      <span className="cx-chip rounded-full text-[10px] uppercase tracking-[0.22em] font-bold">
                        {compactPuzzleBadge}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-white mt-1">{WORLDLE_MODE_META[mode].label}</h2>
                  <p className="text-sm text-zinc-400 mt-2 max-w-2xl">{WORLDLE_MODE_META[mode].description}</p>
                </div>
                {!isPhoneLayout && (
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">Puzzle Key</p>
                  <p className="text-sm text-white font-semibold">{activeQueue === 'daily' ? todayKey : `Practice-${practiceRoundLabel}`}</p>
                </div>
                )}
              </div>
            </td></tr>
            {(mode === 'classic' || mode === 'emoji') && (
              <tr><th scope="row">{mode === 'classic' ? 'Killer Stats' : 'Emoji Clues'}</th><td>
                {mode === 'classic' ? (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {classicFields.map(field => (
                      <div key={field.key} className={`p-3 ${revealedClassicFields[field.key] ? 'cx-cell--on' : 'cx-cell'}`}>
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">{field.label}</p>
                        <p className={revealedClassicFields[field.key] ? 'text-zinc-100' : 'text-zinc-300'}>
                          {revealedClassicFields[field.key] ? formatClassicValue(field.key, target[field.key]) : 'Unknown'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {[0, 1, 2].map((index) => {
                      const revealed = index < Math.min(3, 1 + wrongGuesses) || isFinished;
                      return (
                        <div key={index} className="cx-cell h-24 flex items-center justify-center text-4xl">
                          {revealed ? (activeEmojiVariant?.displayEmojis?.[index] || '❔') : '❔'}
                        </div>
                      );
                    })}
                  </div>
                )}
                {isFinished && (
                  <div className={`p-3 border mt-3 ${session.solved ? 'cx-cell--on' : 'cx-cell'}`}>
                    <p className="text-[10px] uppercase tracking-[0.22em] font-bold mb-1" style={{ color: session.solved ? 'var(--text)' : 'var(--muted)' }}>
                      {session.solved ? 'Solved' : 'Revealed'}
                    </p>
                    <p className="text-lg font-bold text-white">{target.name}</p>
                  </div>
                )}
              </td></tr>
            )}
            {(mode === 'survivorPerk' || mode === 'killerPerk') && (
              <tr><th scope="row">Perk</th><td>
                <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-4 items-center">
                  <div className="cx-cell p-4 flex items-center justify-center min-h-[220px]">
                    <div className="w-32 h-32 overflow-hidden border bg-zinc-900/70 flex items-center justify-center" style={{ borderColor: 'var(--stroke)' }}>
                      <img src={`./${target.image}`} alt="Hidden perk icon" className="w-full h-full object-contain" style={isFinished ? { filter: 'none' } : getPerkRevealStyle()} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Owner</p>
                        <p className="text-white font-semibold">{isFinished ? target.owner : 'Unknown'}</p>
                      </div>
                      <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Reveal Stage</p>
                        <p className="text-white font-semibold">{Math.min(4, wrongGuesses + 1)}/4</p>
                      </div>
                    </div>
                    {isFinished && (
                      <div className={`p-3 border ${session.solved ? 'cx-cell--on' : 'cx-cell'}`}>
                        <p className="text-[10px] uppercase tracking-[0.22em] font-bold mb-1" style={{ color: session.solved ? 'var(--text)' : 'var(--muted)' }}>
                          {session.solved ? 'Solved' : 'Revealed'}
                        </p>
                        <p className="text-lg font-bold text-white">{target.name}</p>
                      </div>
                    )}
                  </div>
                </div>
              </td></tr>
            )}
            {mode === 'teachables' && (
              <tr><th scope="row">Teachables</th><td>
                <div className="grid grid-cols-1 md:grid-cols-[170px,1fr] gap-4 items-start">
                  <div className="cx-cell p-4">
                    <div className="w-24 h-32 mx-auto overflow-hidden border bg-zinc-900/70" style={{ borderColor: 'var(--stroke)' }}>
                      <AssetFrame type="Killer" size="fill" imageUrl={target.image} fallbackIcon={<Icons.Sword width={40} height={40} className="text-zinc-600" />} />
                    </div>
                    <p className="text-base font-bold text-white mt-3 text-center">{target.name}</p>
                    <p className="text-xs text-zinc-500 mt-1 text-center">Guess all three teachable perks. Duplicate attempts do not count.</p>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {target.teachables.map((perk) => {
                        const solved = solvedIds.includes(perk.id) || isFinished;
                        return (
                          <div key={perk.id} className={`p-4 ${solved ? 'cx-cell--on' : 'cx-cell'}`}>
                            <div className="cx-cell w-16 h-16 overflow-hidden mb-3">
                              {solved ? (
                                <AssetFrame type="Perk" size="fill" imageUrl={perk.image} fallbackIcon={<Icons.BookOpen width={24} height={24} className="text-zinc-600" />} />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-600 text-2xl font-black">?</div>
                              )}
                            </div>
                            <p className="text-sm font-semibold text-white">{solved ? perk.name : 'Unknown teachable'}</p>
                          </div>
                        );
                      })}
                    </div>
                    {isFinished && (
                      <div className={`p-3 border ${session.solved ? 'cx-cell--on' : 'cx-cell'}`}>
                        <p className="text-[10px] uppercase tracking-[0.22em] font-bold mb-1" style={{ color: session.solved ? 'var(--text)' : 'var(--muted)' }}>
                          {session.solved ? 'Solved' : 'Revealed'}
                        </p>
                        <p className="text-sm text-white">Target killer: <span className="font-bold">{target.name}</span></p>
                      </div>
                    )}
                  </div>
                </div>
              </td></tr>
            )}
            <tr><th scope="row">Submit Guess</th><td>
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <input
                    ref={guessInputRef}
                    value={guessInput}
                    onChange={e => {
                      const nextValue = e.target.value;
                      const shouldClear = normalizeGuessFeedbackInput(nextValue) !== normalizeGuessFeedbackInput(guessInput);
                      setGuessInput(nextValue);
                      if (shouldClear) {
                        clearInputFeedback();
                      }
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleGuessSubmit();
                      }
                    }}
                    disabled={isFinished}
                    placeholder={mode === 'teachables' ? 'Guess a killer perk...' : mode.includes('Perk') ? 'Guess the perk...' : 'Guess the killer...'}
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    enterKeyHint="go"
                    className="cx-input w-full px-4 py-3 text-sm"
                  />
                  {inputError && <p className="text-xs text-zinc-200 mt-2">{inputError}</p>}
                  {inputNotice && <p className="text-xs text-zinc-200 mt-2">{inputNotice}</p>}
                  {inputSuggestions.length > 0 && !isFinished && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {inputSuggestions.map((option) => (
                        <button
                          type="button"
                          key={option}
                          onClick={() => handleGuessSubmit(option)}
                          className="mode-choice px-3 py-2 text-xs font-semibold"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => handleGuessSubmit()}
                  disabled={!guessInput.trim() || isFinished}
                  className="cx-toolbtn cx-toolbtn--primary px-5 py-3 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Submit
                </button>
                <button type="button" onClick={handleGiveUp} disabled={isFinished} className="cx-toolbtn cx-toolbtn--quiet px-5 py-3 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed">
                  {activeQueue === 'daily' ? 'Reveal' : 'Skip'}
                </button>
                {activeQueue === 'practice' && isFinished && (
                  <button type="button" onClick={advancePractice} className="cx-toolbtn cx-toolbtn--quiet px-5 py-3 text-sm font-bold">
                    Next Puzzle
                  </button>
                )}
              </div>
            </td></tr>
            <tr><th scope="row">Guess History ({guessCount} attempts)</th><td>
              {mode === 'classic' ? (
                <div className="space-y-3">
                  {(session.guesses || []).map(renderClassicGuess)}
                  {(session.guesses || []).length === 0 && <p className="text-sm text-zinc-500">No guesses yet. Start with any killer name and use the stat matches to narrow the field.</p>}
                </div>
              ) : (
                <div className="space-y-2">
                  {(session.guesses || []).map((guess, index) => (
                    <div key={`${guess.id || guess.label}-${index}`} className={`p-3 ${guess.correct ? 'cx-cell--on' : 'cx-cell'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-white">{guess.label}</span>
                        <span className={`text-[10px] uppercase tracking-[0.22em] font-bold ${guess.correct ? 'text-zinc-100' : 'text-zinc-500'}`}>
                          {guess.correct ? 'Correct' : 'Wrong'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {(session.guesses || []).length === 0 && <p className="text-sm text-zinc-500">No guesses yet.</p>}
                </div>
              )}
            </td></tr>
          </tbody></table>
          <h2 className="cx-sec">Statistics</h2>
          <table className="cx-wikitable"><tbody>
            <tr><th scope="row">Stats</th><td>
              <table className="cx-wikitable" style={{ marginTop: 0 }}><tbody>
                <tr><th scope="row">Played</th><td>{statsBucket.played}</td></tr>
                <tr><th scope="row">Solved</th><td>{statsBucket.solved}</td></tr>
                <tr><th scope="row">Avg Guesses</th><td>{statsBucket.averageGuesses || 0}</td></tr>
                <tr><th scope="row">{activeQueue === 'daily' ? 'Best Streak' : 'Recent Runs'}</th><td>{activeQueue === 'daily' ? statsBucket.bestStreak : historyRows.length}</td></tr>
                {activeQueue === 'daily' && <tr><th scope="row">Current Streak</th><td>{statsBucket.currentStreak}</td></tr>}
                {activeQueue === 'daily' && <tr><th scope="row">Solve Rate</th><td>{statsBucket.solved && statsBucket.played ? Math.round((statsBucket.solved / statsBucket.played) * 100) : 0}%</td></tr>}
              </tbody></table>
            </td></tr>
            <tr><th scope="row">Histogram</th><td>
              <div className="space-y-2">
                {Object.entries(statsBucket.histogram || {}).map(([bucket, value]) => (
                  <div key={bucket} className="grid grid-cols-[40px,1fr,28px] items-center gap-2">
                    <span className="text-xs text-zinc-500 font-semibold">{bucket}</span>
                    <div className="cx-meter">
                      <div style={{ width: `${((Number(value) || 0) / histogramMax) * 100}%` }} />
                    </div>
                    <span className="text-xs text-zinc-400 text-right">{value}</span>
                  </div>
                ))}
              </div>
            </td></tr>
            <tr><th scope="row">Recent Results (Last 30)</th><td>
              <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                {historyRows.map((row, index) => (
                  <div key={`${row.completedAt || row.puzzleKey}-${index}`} className="p-3 cx-flatcard">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{row.targetSnapshot?.name || 'Unknown target'}</p>
                        <p className="text-[11px] text-zinc-500 uppercase tracking-wider">{row.puzzleKey} · {row.queue}</p>
                      </div>
                      <span className={`px-2 py-1 border text-[10px] uppercase tracking-[0.22em] font-bold ${row.solved ? 'wl-hit' : 'wl-miss'}`}>
                        {row.solved ? `${row.guessCount} guesses` : 'Revealed'}
                      </span>
                    </div>
                  </div>
                ))}
                {historyRows.length === 0 && <p className="text-sm text-zinc-500">No recorded runs for this mode yet.</p>}
              </div>
            </td></tr>
          </tbody></table>
        </div>
      );
    };
    const ProgressionView = ({ onBack, onGoTo, killers = [], survivors = [], perks = [], progression, setProgression, builds = [], matches = [], prefs = {}, settings = {}, setSettings, initialTab = 'achievements', maps = [] }) => {
      const [tab, setTab] = useState(PROGRESSION_TABS.includes(initialTab) ? initialTab : 'achievements');
      const [roleFilter, setRoleFilter] = useState('All');
      const [showOwnedOnly, setShowOwnedOnly] = useState(false);
      const [achievementSearch, setAchievementSearch] = useState('');
      const [achievementSort, setAchievementSort] = useState('name_asc');
      const [hideCompletedAchievements, setHideCompletedAchievements] = useState(false);
      const [challengeDraft, setChallengeDraft] = useState({ name: '', description: '', side: 'any', tags: '', buildId: '' });
      const orderedTabs = useMemo(() => ensureOrderedFullSet(settings.progressionTabOrder, PROGRESSION_TABS, DEFAULT_SETTINGS.progressionTabOrder), [settings.progressionTabOrder]);
      useEffect(() => {
        setTab(PROGRESSION_TABS.includes(initialTab) ? initialTab : 'achievements');
      }, [initialTab]);
      const moveTab = (tabId, direction) => {
        setSettings(prev => {
          const currentOrder = ensureOrderedFullSet(prev.progressionTabOrder, PROGRESSION_TABS, DEFAULT_SETTINGS.progressionTabOrder);
          const currentIndex = currentOrder.indexOf(tabId);
          const nextIndex = currentIndex + direction;
          if (currentIndex === -1 || nextIndex < 0 || nextIndex >= currentOrder.length) return prev;
          const nextOrder = [...currentOrder];
          [nextOrder[currentIndex], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[currentIndex]];
          return { ...prev, progressionTabOrder: nextOrder };
        });
      };
      const tabMeta = {
        achievements: 'Achievements',
        roster: 'Roster',
        challenges: 'Challenges',
        analytics: 'Analytics'
      };
      const toggleCharacter = (id, field) => {
        setProgression(prev => {
          const existing = prev.characters?.[id] || {};
          return {
            ...prev,
            characters: {
              ...prev.characters,
              [id]: {
                ...existing,
                [field]: field === 'owned' ? !existing.owned : field === 'favorite' ? !existing.favorite : existing[field]
              }
            }
          };
        });
      };
      const updateCharacterPrestige = (id, prestige) => {
        setProgression(prev => {
          const existing = prev.characters?.[id] || {};
          return { ...prev, characters: { ...prev.characters, [id]: { ...existing, prestige } } };
        });
      };
      const toggleAchievement = (id) => {
        setProgression(prev => ({ ...prev, achievements: { ...(prev.achievements || {}), [id]: !prev.achievements?.[id] } }));
      };
      const addChallenge = () => {
        if (!challengeDraft.name.trim()) return;
        setProgression(prev => ({
          ...prev,
          challenges: [
            ...(prev.challenges || []),
            { ...challengeDraft, id: uuid(), tags: parseTags(challengeDraft.tags), status: 'planned' }
          ]
        }));
        setChallengeDraft({ name: '', description: '', side: 'any', tags: '', buildId: '' });
      };
      const updateChallengeStatus = (id, status) => {
        setProgression(prev => ({ ...prev, challenges: prev.challenges.map(challenge => challenge.id === id ? { ...challenge, status } : challenge) }));
      };
      const characters = useMemo(() => {
        if (roleFilter === 'Killer') return killers;
        if (roleFilter === 'Survivor') return survivors;
        return [...killers, ...survivors];
      }, [killers, survivors, roleFilter]);
      const visibleCharacters = characters.filter(character => !showOwnedOnly || progression.characters?.[character.id]?.owned);
      const ownedKillers = killers.filter(killer => progression.characters?.[killer.id]?.owned);
      const ownedSurvivors = survivors.filter(survivor => progression.characters?.[survivor.id]?.owned);
      const ownedCharacters = [...killers, ...survivors].filter(character => progression.characters?.[character.id]?.owned);
      const teachablesByOwner = useMemo(() => {
        const map = {};
        (perks || []).forEach((perk) => {
          if (!perk.owner || perk.owner === 'All Killers' || perk.owner === 'All Survivors') return;
          map[perk.owner] = map[perk.owner] || [];
          map[perk.owner].push(perk);
        });
        return map;
      }, [perks]);
      const teachableCoverage = ownedCharacters.map((character) => {
        const prestige = Number(progression.characters?.[character.id]?.prestige) || 0;
        const total = (teachablesByOwner[character.name] || []).length;
        const unlocked = prestige >= 1 ? total : 0;
        return { character, prestige, total, unlocked };
      });
      const unlockedTeachableTotal = teachableCoverage.reduce((sum, row) => sum + row.unlocked, 0);
      const prestigeUnlockedCharacters = teachableCoverage.filter(row => row.prestige >= 1).length;
      const buildName = (id) => builds.find(build => build.id === id)?.name || 'Unlinked Build';
      const achievementState = progression.achievements || {};
      const filteredAchievements = useMemo(() => {
        let list = DBD_ACHIEVEMENTS;
        if (achievementSearch.trim()) {
          const query = achievementSearch.toLowerCase();
          list = list.filter(achievement => achievement.name.toLowerCase().includes(query) || achievement.description.toLowerCase().includes(query));
        }
        if (hideCompletedAchievements) {
          list = list.filter(achievement => !achievementState[achievement.id]);
        }
        list = [...list].sort((a, b) => {
          const aComplete = !!achievementState[a.id];
          const bComplete = !!achievementState[b.id];
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
      const completedCount = Object.values(achievementState).filter(Boolean).length;
      const challengeCounts = {
        planned: (progression.challenges || []).filter(challenge => challenge.status === 'planned').length,
        active: (progression.challenges || []).filter(challenge => challenge.status === 'active').length,
        completed: (progression.challenges || []).filter(challenge => challenge.status === 'completed').length
      };
      return (
        <div className="flex flex-col h-full pt-6 pb-32 px-6 overflow-y-auto custom-scrollbar">
          <ViewCrumbs trail={[{ label: 'Main page', onClick: onBack }]} current="Progression Hub" />
          <h1 className="cx-title">Progression Hub</h1>
          <p className="cx-hatnote">Achievements, roster, challenges and analytics.</p>
          <h2 className="cx-sec">Hub tabs</h2>
          <table className="cx-wikitable"><tbody>
            <tr><th scope="row">Tabs</th><td>
              <div className="flex flex-wrap gap-2">
                {orderedTabs.map((tabId) => (
                  <button
                    key={tabId}
                    onClick={() => setTab(tabId)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border ${tab === tabId ? 'bg-zinc-100 text-black border-zinc-100' : 'bg-white/5 text-zinc-300 border-white/10'}`}
                  >
                    {tabMeta[tabId]}
                  </button>
                ))}
              </div>
            </td></tr>
            <tr><th scope="row">Tab Order</th><td>
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Tab Order</p>
                <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Saved locally</span>
              </div>
              <div className="space-y-1">
                {orderedTabs.map((tabId, index) => (
                  <div key={tabId} className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10">
                    <button onClick={() => setTab(tabId)} className="text-sm font-semibold text-white">{tabMeta[tabId]}</button>
                    <div className="ml-auto flex gap-1">
                      <button onClick={() => moveTab(tabId, -1)} disabled={index === 0} className="w-7 h-7 rounded-lg bg-white/5 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">↑</button>
                      <button onClick={() => moveTab(tabId, 1)} disabled={index === orderedTabs.length - 1} className="w-7 h-7 rounded-lg bg-white/5 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">↓</button>
                    </div>
                  </div>
                ))}
              </div>
            </td></tr>
          </tbody></table>
          {tab === 'achievements' && (
            <div>
              <h2 className="cx-sec">Achievements</h2>
              <table className="cx-wikitable"><tbody>
                <tr><th scope="row">Completed</th><td className="text-center"><p className="text-2xl font-bold text-white">{completedCount}</p></td></tr>
                <tr><th scope="row">Total</th><td className="text-center"><p className="text-2xl font-bold text-white">{DBD_ACHIEVEMENTS.length}</p></td></tr>
                <tr><th scope="row">Completion</th><td className="text-center"><p className="text-2xl font-bold text-zinc-100">{DBD_ACHIEVEMENTS.length ? Math.round((completedCount / DBD_ACHIEVEMENTS.length) * 100) : 0}%</p></td></tr>
                <tr><th scope="row">Remaining</th><td className="text-center"><p className="text-2xl font-bold text-zinc-200">{DBD_ACHIEVEMENTS.length - completedCount}</p></td></tr>
                <tr><th scope="row">Search</th><td>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"><Icons.Search width={18} height={18} /></div>
                    <input
                      type="text"
                      value={achievementSearch}
                      onChange={e => setAchievementSearch(e.target.value)}
                      placeholder="Search achievements by name or description..."
                      className="w-full bg-[var(--panel)] border border-[var(--stroke)] rounded-xl py-3 pl-12 pr-10 text-white placeholder-zinc-600 text-sm focus:outline-none"
                    />
                    {achievementSearch && (
                      <button onClick={() => setAchievementSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white/5 text-zinc-400 hover:text-white transition-colors">
                        <Icons.X width={14} height={14} />
                      </button>
                    )}
                  </div>
                </td></tr>
                <tr><th scope="row">Sort</th><td>
                  <select value={achievementSort} onChange={e => setAchievementSort(e.target.value)} className="themed-select w-full text-sm">
                    <option value="name_asc">A → Z</option>
                    <option value="name_desc">Z → A</option>
                    <option value="not_completed_first">Not Completed First</option>
                    <option value="completed_first">Completed First</option>
                  </select>
                </td></tr>
                <tr><th scope="row">Visibility</th><td>
                  <label className="inline-flex items-center gap-2 text-sm text-zinc-300 whitespace-nowrap px-3 py-2 rounded-xl bg-zinc-800/60 border border-white/10 cursor-pointer">
                    <input type="checkbox" checked={hideCompletedAchievements} onChange={e => setHideCompletedAchievements(e.target.checked)} className="accent-current" />
                    Hide completed
                  </label>
                </td></tr>
                <tr><th scope="row">List</th><td>
                  <div className="space-y-2">
                    {filteredAchievements.map((achievement) => {
                      const isComplete = !!achievementState[achievement.id];
                      return (
                        <div
                          key={achievement.id}
                          onClick={() => toggleAchievement(achievement.id)}
                          className={`p-3 rounded-2xl border cursor-pointer transition-all ${isComplete ? 'bg-white/5 border-zinc-300/40 opacity-70' : 'bg-zinc-900/60 border-white/10 hover:border-white/20'}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${isComplete ? 'bg-zinc-100 border-zinc-100' : 'border-zinc-500'}`}>
                              {isComplete && <span className="text-black text-xs font-bold">✓</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-semibold text-sm ${isComplete ? 'text-zinc-400 line-through' : 'text-white'}`}>{achievement.name}</p>
                              <p className={`text-xs leading-relaxed mt-0.5 ${isComplete ? 'text-zinc-500' : 'text-zinc-400'}`}>{achievement.description}</p>
                              <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] uppercase tracking-wider text-zinc-500">{achievement.category.replace('_', ' ')}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {filteredAchievements.length === 0 && <div className="text-center text-zinc-500 py-8">No achievements found matching the current filters.</div>}
                  </div>
                </td></tr>
              </tbody></table>
            </div>
          )}
          {tab === 'roster' && (
            <div>
              <h2 className="cx-sec">Roster</h2>
              <table className="cx-wikitable"><tbody>
                <tr><th scope="row">Owned Characters</th><td className="text-center"><p className="text-2xl font-bold text-white">{ownedCharacters.length}</p></td></tr>
                <tr><th scope="row">Owned Killers</th><td className="text-center"><p className="text-2xl font-bold text-zinc-100">{ownedKillers.length}</p></td></tr>
                <tr><th scope="row">Owned Survivors</th><td className="text-center"><p className="text-2xl font-bold text-zinc-100">{ownedSurvivors.length}</p></td></tr>
                <tr><th scope="row">Favorites</th><td className="text-center"><p className="text-2xl font-bold text-zinc-200">{ownedCharacters.filter(character => progression.characters?.[character.id]?.favorite).length}</p></td></tr>
                <tr><th scope="row">Teachable Perks Unlocked</th><td className="text-center"><p className="text-2xl font-bold text-zinc-100">{unlockedTeachableTotal}</p></td></tr>
                <tr><th scope="row">Coverage note</th><td>
                </td></tr>
                <tr><th scope="row">Role filter</th><td>
                  <div className="flex gap-2 flex-wrap items-center">
                    <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="themed-select compact text-sm">
                      <option value="All">All roles</option>
                      <option value="Killer">Killers</option>
                      <option value="Survivor">Survivors</option>
                    </select>
                    <label className="inline-flex items-center gap-2 text-sm text-zinc-400"><input type="checkbox" checked={showOwnedOnly} onChange={e => setShowOwnedOnly(e.target.checked)} /> Owned only</label>
                  </div>
                </td></tr>
                <tr><th scope="row">Characters</th><td>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {visibleCharacters.map((character) => {
                      const state = progression.characters?.[character.id] || {};
                      const isKiller = killers.some(killer => killer.id === character.id);
                      return (
                        <div key={character.id} className="p-3 rounded-2xl bg-zinc-900/60 border border-white/10">
                          <div className="flex justify-between items-center mb-2">
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${isKiller ? 'bg-white/10 text-zinc-100' : 'bg-white/5 text-zinc-300'}`}>{isKiller ? 'Killer' : 'Survivor'}</span>
                            <button onClick={() => toggleCharacter(character.id, 'favorite')} className="text-zinc-200 text-sm">{state.favorite ? '*' : ''}</button>
                          </div>
                          <p className="text-white font-bold">{character.name}</p>
                          <div className="flex items-center gap-2 mt-2 text-sm text-zinc-300">
                            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!state.owned} onChange={() => toggleCharacter(character.id, 'owned')} /> Owned</label>
                            <input type="number" min="0" max="100" value={state.prestige || 0} onChange={e => updateCharacterPrestige(character.id, Number(e.target.value) || 0)} className="w-20 bg-zinc-800/60 border border-white/10 rounded-lg px-2 py-1 text-xs text-white" />
                            <span className="text-[10px] uppercase tracking-wider text-zinc-500">Prestige</span>
                          </div>
                        </div>
                      );
                    })}
                    {visibleCharacters.length === 0 && <div className="text-center text-zinc-500 py-6 md:col-span-3">No characters match the current roster filters.</div>}
                  </div>
                </td></tr>
                <tr><th scope="row">Prestige Unlock Coverage ({prestigeUnlockedCharacters}/{ownedCharacters.length || 0} owned chars at P1+)</th><td>
                  {teachableCoverage.length === 0 && <p className="text-zinc-500 text-sm">Mark a character as owned to start tracking roster unlocks.</p>}
                  {teachableCoverage.map(row => (
                    <div key={row.character.id} className="flex justify-between items-center border-t border-white/5 py-2 text-sm text-zinc-300">
                      <span>{row.character.name}</span>
                      <span className="text-[12px] text-zinc-400">
                        {row.total === 0 ? 'No personal perks in local data' : row.prestige >= 1 ? `${row.unlocked}/${row.total} unlocked` : `P${row.prestige} · unlocks at P1`}
                      </span>
                    </div>
                  ))}
                </td></tr>
              </tbody></table>
            </div>
          )}
          {tab === 'challenges' && (
            <div>
              <h2 className="cx-sec">Challenges</h2>
              <table className="cx-wikitable"><tbody>
                <tr><th scope="row">planned</th><td className="text-center"><p className="text-2xl font-bold" style={{ color: '#a1a1aa' }}>{challengeCounts.planned}</p></td></tr>
                <tr><th scope="row">active</th><td className="text-center"><p className="text-2xl font-bold" style={{ color: 'var(--rar-rare)' }}>{challengeCounts.active}</p></td></tr>
                <tr><th scope="row">completed</th><td className="text-center"><p className="text-2xl font-bold" style={{ color: 'var(--rar-rare)' }}>{challengeCounts.completed}</p></td></tr>
                <tr><th scope="row">New Challenge</th><td>
                  <div className="space-y-2">
                    <input value={challengeDraft.name} onChange={e => setChallengeDraft(draft => ({ ...draft, name: e.target.value }))} placeholder="Name" className="w-full bg-zinc-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500" />
                    <textarea value={challengeDraft.description} onChange={e => setChallengeDraft(draft => ({ ...draft, description: e.target.value }))} rows={2} placeholder="Description" className="w-full bg-zinc-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500"></textarea>
                    <div className="grid grid-cols-2 gap-2">
                      <select value={challengeDraft.side} onChange={e => setChallengeDraft(draft => ({ ...draft, side: e.target.value }))} className="themed-select w-full text-sm">
                        <option value="any">Any</option>
                        <option value="Killer">Killer</option>
                        <option value="Survivor">Survivor</option>
                      </select>
                      <input value={challengeDraft.tags} onChange={e => setChallengeDraft(draft => ({ ...draft, tags: e.target.value }))} placeholder="Tags (comma)" className="bg-zinc-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500" />
                      <select value={challengeDraft.buildId} onChange={e => setChallengeDraft(draft => ({ ...draft, buildId: e.target.value }))} className="themed-select w-full text-sm col-span-2">
                        <option value="">Link build (optional)</option>
                        {builds.map(build => <option key={build.id} value={build.id}>{build.name}</option>)}
                      </select>
                    </div>
                    <button onClick={addChallenge} className="px-4 py-2 rounded-xl bg-zinc-100 text-black font-bold text-sm">Add Challenge</button>
                  </div>
                </td></tr>
                <tr><th scope="row">List</th><td>
                  <div className="space-y-2">
                    {(progression.challenges || []).map((challenge) => (
                      <div key={challenge.id} className="p-3 rounded-2xl bg-zinc-900/60 border border-white/10">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-white font-semibold">{challenge.name}</p>
                            <p className="text-[11px] text-zinc-500 uppercase tracking-wider">{challenge.side}</p>
                          </div>
                          <select value={challenge.status} onChange={e => updateChallengeStatus(challenge.id, e.target.value)} className="themed-select compact text-xs">
                            <option value="planned">Planned</option>
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                        {challenge.buildId && <p className="text-[11px] text-zinc-400 mt-1">Build: {buildName(challenge.buildId)}</p>}
                        <p className="text-sm text-zinc-300 mt-1">{challenge.description}</p>
                        {challenge.tags?.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{challenge.tags.map(tag => <span key={tag} className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] text-zinc-300 uppercase tracking-wider">{tag}</span>)}</div>}
                      </div>
                    ))}
                    {(progression.challenges || []).length === 0 && <div className="text-center text-zinc-500 py-4">No challenges yet.</div>}
                  </div>
                </td></tr>
              </tbody></table>
            </div>
          )}
          {tab === 'analytics' && (
            <div>
              <h2 className="cx-sec">Analytics</h2>
              <table className="cx-wikitable"><tbody>
                <tr><th scope="row">Boards</th><td>
                  <MatchAnalyticsPanel
                    matches={matches}
                    prefs={prefs}
                    killers={killers}
                    survivors={survivors}
                    builds={builds}
                    maps={maps}
                    onOpenMatches={() => onGoTo && onGoTo('matches')}
                  />
                </td></tr>
              </tbody></table>
            </div>
          )}
        </div>
      );
    };

    const ProgressionTrackerView = () => null;

    // ═══════════════════════════════════════════════════════════════════════════════
    // TIMELINE VIEW - Vertical scrolling lore timeline with proper portrait loading
    // ═══════════════════════════════════════════════════════════════════════════════
    const TimelineView = ({ onBack, setView, killers = [], survivors = [], theme = {} }) => {
      const scrollRef = useRef(null);
      const [expandedRelease, setExpandedRelease] = useState(null);
      const [expandedCharacter, setExpandedCharacter] = useState(null);
      const [selectedCharacter, setSelectedCharacter] = useState(null);
      const [search, setSearch] = useState('');
      const [yearFilter, setYearFilter] = useState('all');

      // Theme colors
      const accent = theme.accent || '#fafafa';
      const accentSoft = theme.accentSoft || '#0f172a';


      // Get timeline data sorted chronologically
      const allReleases = useMemo(() => {
        if (typeof TIMELINE_DATA !== 'undefined' && TIMELINE_DATA.releases) {
          return TIMELINE_DATA.getChronological();
        }
        return [];
      }, []);

      // Get unique years for filters
      const years = useMemo(() => {
        const yearSet = new Set();
        allReleases.forEach(r => {
          const year = new Date(r.date).getFullYear();
          yearSet.add(year);
        });
        return Array.from(yearSet).sort();
      }, [allReleases]);

      // Filter releases by search and year
      const releases = useMemo(() => {
        let filtered = allReleases;

        // Filter by year
        if (yearFilter !== 'all') {
          filtered = filtered.filter(r => new Date(r.date).getFullYear() === parseInt(yearFilter));
        }

        // Filter by search
        if (search.trim()) {
          const term = search.toLowerCase();
          filtered = filtered.filter(r => {
            // Match release name
            if (r.name.toLowerCase().includes(term)) return true;
            // Match killer names
            if (r.killers?.some(k => k.name.toLowerCase().includes(term) || k.realName?.toLowerCase().includes(term))) return true;
            // Match survivor names
            if (r.survivors?.some(s => s.name.toLowerCase().includes(term))) return true;
            // Match map names
            if (r.maps?.some(m => m.name.toLowerCase().includes(term))) return true;
            return false;
          });
        }

        return filtered;
      }, [allReleases, yearFilter, search]);

      // Look up character from data.js to get correct image path
      const findCharacterData = React.useCallback((loreChar, type) => {
        const source = type === 'killers' ? killers : survivors;
        // Try to match by ID patterns
        const loreId = loreChar.id.toLowerCase();
        return source.find(c => {
          const dataId = c.id?.toLowerCase() || '';
          const dataName = c.name?.toLowerCase() || '';
          // Match patterns like "trapper" to "K01_TheTrapper" or name "The Trapper"
          return dataId.includes(loreId) ||
            dataName.includes(loreId) ||
            dataName.includes(loreChar.name.toLowerCase().replace('the ', ''));
        });
      }, [killers, survivors]);

      // Toggle release expansion
      const toggleRelease = (releaseId) => {
        triggerHaptic('Light');
        if (expandedRelease === releaseId) {
          setExpandedRelease(null);
          setExpandedCharacter(null);
        } else {
          setExpandedRelease(releaseId);
          setExpandedCharacter(null);
        }
      };

      // Toggle character lore inline
      const toggleCharacter = (charKey) => {
        triggerHaptic('Light');
        setExpandedCharacter(expandedCharacter === charKey ? null : charKey);
      };

      // Open full character modal
      const openCharacterModal = (loreChar, type) => {
        const fullData = findCharacterData(loreChar, type);
        if (fullData) {
          setSelectedCharacter({ ...fullData, fogEntry: loreChar.fogEntry, type: type === 'killers' ? 'Killer' : 'Survivor' });
        }
      };

      // Get type badge label
      const getTypeBadge = (type, chapterNumber) => {
        switch (type) {
          case 'base': return { label: 'BASE GAME' };
          case 'chapter': return { label: chapterNumber ? `CH ${chapterNumber}` : 'CHAPTER' };
          case 'paragraph': return { label: 'PARAGRAPH' };
          default: return { label: 'RELEASE' };
        }
      };

      // Character row component
      const CharacterRow = ({ loreChar, type, charKey }) => {
        const isExpanded = expandedCharacter === charKey;
        const fullData = findCharacterData(loreChar, type);
        const imageUrl = fullData?.image;
        const isKiller = type === 'killers';

        return (
          <div className="mb-2">
            <button
              onClick={() => toggleCharacter(charKey)}
              className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors bg-[var(--panel)] border border-[var(--stroke)]"
              style={isExpanded ? { backgroundColor: `${accent}15`, borderColor: `${accent}30` } : {}}
            >
              {/* Portrait */}
              <div
                className="w-12 h-12 rounded-xl overflow-hidden border flex-shrink-0"
                style={{ borderColor: isExpanded ? accent : 'rgba(255,255,255,0.1)' }}
              >
                <AssetFrame
                  type={isKiller ? 'Killer' : 'Survivor'}
                  size="fill"
                  imageUrl={imageUrl}
                  fallbackIcon={<Icons.User width={18} height={18} className="text-zinc-500" />}
                />
              </div>

              {/* Info */}
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-semibold text-sm">{loreChar.name}</span>
                  {loreChar.licensed && (
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold"
                      style={{ backgroundColor: `${accent}20`, color: accent }}
                    >
                      Licensed
                    </span>
                  )}
                </div>
                {loreChar.realName && loreChar.realName !== loreChar.name && (
                  <p className="text-xs text-zinc-500 truncate">{loreChar.realName}</p>
                )}
              </div>

              {/* Expand indicator */}
              <Icons.ChevronDown
                width={16}
                height={16}
                className="text-zinc-500 transition-transform flex-shrink-0"
                style={isExpanded ? { color: accent, transform: 'rotate(180deg)' } : {}}
              />
            </button>

            {/* Expanded lore panel */}
            {isExpanded && (
              <div
                className="mt-2 ml-4 p-4 rounded-xl border animate-fadeIn"
                style={{ backgroundColor: `${accentSoft}80`, borderColor: `${accent}20` }}
              >
                <p className="text-[10px] uppercase tracking-wider font-bold mb-2" style={{ color: accent }}>
                  How they entered the fog
                </p>
                <p className="text-sm text-zinc-300 leading-relaxed">{loreChar.fogEntry}</p>

                {fullData && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const full = findCharacterData(loreChar, type);
                      if (full) setView(type === 'killers' ? 'killer' : 'survivor', { id: full.id });
                    }}
                    className="mt-4 w-full py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 border"
                    style={{
                      backgroundColor: `${accent}20`,
                      borderColor: `${accent}30`,
                      color: accent
                    }}
                  >
                    <Icons.ChevronRight width={14} height={14} />
                    View Full Profile
                  </button>
                )}
              </div>
            )}
          </div>
        );
      };

      return (
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 px-6 pt-6 pb-4">
            <ViewCrumbs trail={[{ label: 'Main page', onClick: onBack }]} current="Chronicle" />
            <h1 className="cx-title">Chronicle</h1>
            <p className="cx-hatnote">Releases from June 2016 to the present, most recent first.</p>

            {/* Search bar */}
            <WikiHeaderSearchPortal>
              <div className="relative w-full">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                  <Icons.Search width={18} height={18} />
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search chapters, killers, survivors..."
                  className="w-full bg-[var(--panel)] border border-[var(--stroke)] rounded-xl py-3 pl-12 pr-10 text-white placeholder-zinc-600 text-sm focus:outline-none"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white/5 text-zinc-400 hover:text-white transition-colors"
                  >
                    <Icons.X width={14} height={14} />
                  </button>
                )}
              </div>
            </WikiHeaderSearchPortal>

          </div>

          {/* Timeline content */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 pb-32">
            {/* Year filter pills */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-4">
              <button
                onClick={() => setYearFilter('all')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border"
                style={yearFilter === 'all'
                  ? { backgroundColor: accent, color: '#000', borderColor: accent }
                  : { backgroundColor: 'transparent', color: '#a1a1aa', borderColor: 'rgba(255,255,255,0.1)' }
                }
              >
                All
              </button>
              {years.map(year => (
                <button
                  key={year}
                  onClick={() => setYearFilter(year.toString())}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border"
                  style={yearFilter === year.toString()
                    ? { backgroundColor: accent, color: '#000', borderColor: accent }
                    : { backgroundColor: 'transparent', color: '#a1a1aa', borderColor: 'rgba(255,255,255,0.1)' }
                  }
                >
                  {year}
                </button>
              ))}
            </div>
            {releases.length === 0 ? (
              <div className="flex items-center justify-center h-48">
                <div className="text-center">
                  <Icons.Search width={48} height={48} className="mx-auto text-zinc-700 mb-4" />
                  <p className="text-zinc-500">No releases found</p>
                  <button onClick={() => { setSearch(''); setYearFilter('all'); }} className="mt-2 text-sm hover:underline" style={{ color: accent }}>Clear filters</button>
                </div>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                {/* Chronicle table */}
                <div className="cx-tablewrap">
                  <table className="cx-wikitable">
                    <thead><tr><th style={{ whiteSpace: 'nowrap', width: '150px' }}>Date</th><th style={{ width: '260px' }}>Release</th><th style={{ width: '110px' }}>Type</th><th>Summary</th></tr></thead>
                    <tbody>
                      {releases.map((release, idx) => {
                        const isExpanded = expandedRelease === release.id;
                        const badge = getTypeBadge(release.type, release.chapterNumber);
                        const hasContent = release.killers?.length > 0 || release.survivors?.length > 0 || release.maps?.length > 0;
                        const charCount = (release.killers?.length || 0) + (release.survivors?.length || 0);
                        return (
                          <React.Fragment key={release.id}>
                            <tr
                              onClick={() => hasContent && toggleRelease(release.id)}
                              className={hasContent ? 'cursor-pointer' : undefined}
                            >
                              <td style={{ whiteSpace: 'nowrap', color: 'var(--dim)' }}>{release.displayDate}</td>
                              <td>
                                <button type="button" className="cx-alink font-semibold" onClick={(e) => { e.stopPropagation(); setView('release', { id: release.id }); }}>{release.name}</button>
                                {release.chapterNumber ? <small style={{ display: 'block', color: 'var(--text-faint)', fontSize: '11px' }}>Chapter {release.chapterNumber}</small> : null}
                              </td>
                              <td>{badge.label}</td>
                              <td>
                                {hasContent ? (
                                  <span style={{ color: 'var(--dim)' }}>
                                    {charCount} character{charCount !== 1 ? 's' : ''}
                                    {release.maps?.length > 0 ? ` \u00b7 ${release.maps.length} map${release.maps.length !== 1 ? 's' : ''}` : ''}
                                    {' \u2014 click for details'}
                                  </span>
                                ) : (release.description ? <span style={{ color: 'var(--dim)' }}>{String(release.description).slice(0, 160)}{release.description.length > 160 ? '\u2026' : ''}</span> : '\u2014')}
                              </td>
                            </tr>
                            {isExpanded && hasContent && (
                              <tr className="cx-row-compare">
                                <td colSpan={4}>
                                  {release.description && <p style={{ color: 'var(--text-soft)', marginBottom: '12px' }}>{release.description}</p>}
                                  {release.killers?.length > 0 && (
                                    <div style={{ marginBottom: '12px' }}>
                                      <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)', fontWeight: 700, marginBottom: '6px' }}>Killers ({release.killers.length})</p>
                                      {release.killers.map(killer => (
                                        <CharacterRow key={killer.id} loreChar={killer} type="killers" charKey={`killer-${killer.id}`} />
                                      ))}
                                    </div>
                                  )}
                                  {release.survivors?.length > 0 && (
                                    <div style={{ marginBottom: '12px' }}>
                                      <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)', fontWeight: 700, marginBottom: '6px' }}>Survivors ({release.survivors.length})</p>
                                      {release.survivors.map(survivor => (
                                        <CharacterRow key={survivor.id} loreChar={survivor} type="survivors" charKey={`survivor-${survivor.id}`} />
                                      ))}
                                    </div>
                                  )}
                                  {release.maps?.length > 0 && (
                                    <div>
                                      <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)', fontWeight: 700, marginBottom: '6px' }}>Maps ({release.maps.length})</p>
                                      {release.maps.map(map => (
                                        <p key={map.name} style={{ margin: '2px 0', color: 'var(--text-soft)' }}>
                                          <span className="font-semibold text-zinc-100">{map.name}</span>
                                          {map.realm ? <span style={{ color: 'var(--text-faint)' }}> - {map.realm}</span> : null}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Character detail modal */}
          {selectedCharacter && (
            <div
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center animate-fadeIn"
              onClick={() => setSelectedCharacter(null)}
            >
              <div
                className="w-full max-w-2xl max-h-[85vh] bg-[var(--panel)] border border-[var(--stroke)] rounded-t-xl overflow-hidden animate-slideUp"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal header */}
                <div
                  className="sticky top-0 backdrop-blur-xl border-b p-4 flex items-center gap-4"
                  style={{ backgroundColor: `${accentSoft}95`, borderColor: `${accent}20` }}
                >
                  <div
                    className="w-14 h-14 rounded-xl overflow-hidden border-2"
                    style={{ borderColor: `${accent}50` }}
                  >
                    <AssetFrame
                      type={selectedCharacter.type}
                      size="fill"
                      imageUrl={selectedCharacter.image}
                      fallbackIcon={<Icons.User width={20} height={20} />}
                    />
                  </div>
                  <div className="flex-1">
                    <p
                      className="text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: accent }}
                    >
                      {selectedCharacter.type}
                    </p>
                    <h2 className="text-lg font-bold text-white">{selectedCharacter.name}</h2>
                    {selectedCharacter.realName && selectedCharacter.realName !== selectedCharacter.name && (
                      <p className="text-xs text-zinc-500">{selectedCharacter.realName}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedCharacter(null)}
                    className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                  >
                    <Icons.X width={18} height={18} />
                  </button>
                </div>

                {/* Modal content */}
                <div className="p-5 pb-20 overflow-y-auto max-h-[calc(85vh-90px)]">
                  {/* Fog entry */}
                  {selectedCharacter.fogEntry && (
                    <div className="mb-5">
                      <p className="text-[10px] uppercase tracking-wider font-bold mb-2" style={{ color: accent }}>
                        How They Entered The Fog
                      </p>
                      <p className="text-zinc-300 text-sm leading-relaxed">{selectedCharacter.fogEntry}</p>
                    </div>
                  )}

                  {/* Full lore */}
                  {selectedCharacter.lore && (
                    <div className="mb-5">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-2">Full Lore</p>
                      <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">{selectedCharacter.lore}</p>
                    </div>
                  )}

                  {/* Power (for killers) */}
                  {selectedCharacter.type === 'Killer' && selectedCharacter.power && (
                    <div className="mb-5">
                      <p className="text-[10px] uppercase tracking-wider font-bold mb-2" style={{ color: accent }}>Power</p>
                      <p className="text-zinc-300 text-sm leading-relaxed">{selectedCharacter.power}</p>
                    </div>
                  )}

                  {/* Open full view button */}
                  <button
                    onClick={() => {
                      setSelectedCharacter(null);
                      setView(selectedCharacter.type === 'Killer' ? 'killers' : 'survivors');
                    }}
                    className="w-full py-2.5 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 border"
                    style={{
                      backgroundColor: `${accent}20`,
                      borderColor: `${accent}30`,
                      color: accent
                    }}
                  >
                    View All {selectedCharacter.type === 'Killer' ? 'Killers' : 'Survivors'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    };


    const GlossaryView = ({ onBack }) => {
      const scrollRef = useRef(null);
      const [search, setSearch] = useState('');

      const allTerms = useMemo(() => {
        const terms = [];
        GLOSSARY.forEach(section => {
          section.items.forEach(item => {
            terms.push({ ...item, category: section.section });
          });
        });
        return terms.sort((a, b) => a.term.localeCompare(b.term));
      }, []);

      const filteredTerms = useMemo(() => {
        if (!search.trim()) return allTerms;
        const term = search.toLowerCase();
        return allTerms.filter(t =>
          t.term.toLowerCase().includes(term) ||
          t.def.toLowerCase().includes(term)
        );
      }, [allTerms, search]);

      const groupedTerms = useMemo(() => {
        const groups = {};
        filteredTerms.forEach(t => {
          const letter = t.term.charAt(0).toUpperCase();
          if (!groups[letter]) groups[letter] = [];
          groups[letter].push(t);
        });
        return groups;
      }, [filteredTerms]);

      const availableLetters = Object.keys(groupedTerms).sort();
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

      const scrollToLetter = (letter) => {
        const element = document.getElementById(`glossary-${letter}`);
        if (element && scrollRef.current) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      };

      return (
        <div className="flex h-full pt-6">
          {/* Main content */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-28 md:pb-8">
            <ViewCrumbs trail={[{ label: 'Main page', onClick: onBack }]} current="Glossary" />
            <h1 className="cx-title">Glossary</h1>
            <p className="cx-hatnote">Community terminology and callouts.</p>

            {/* Search bar */}
            <WikiHeaderSearchPortal>
            <div className="relative w-full">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                <Icons.Search width={18} height={18} />
              </div>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search terms..." className="w-full bg-[var(--panel)] border border-[var(--stroke)] rounded-xl py-3 pl-12 pr-10 text-white placeholder-zinc-600 text-sm focus:outline-none" />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white/5 text-zinc-400 hover:text-white transition-colors"><Icons.X width={14} height={14} /></button>}

            </div>
          </WikiHeaderSearchPortal>

            {/* Dictionary entries */}
            <div className="pb-8 pr-8">
              {filteredTerms.length === 0 ? (
                <div className="text-center text-zinc-500 mt-12">No terms found.</div>
              ) : (
                availableLetters.map(letter => (
                  <div key={letter} id={`glossary-${letter}`}>
                    {/* Letter header */}
                    <h3 className="cx-sub" style={{ borderBottom: '1px solid var(--line-soft)', paddingBottom: '4px' }}>{letter} <span style={{ color: 'var(--text-faint)', fontSize: '12px', fontWeight: 400 }}>{groupedTerms[letter].length}</span></h3>

                    {/* Terms for this letter */}
                    <dl className="cx-gloss">
                      {groupedTerms[letter].map(item => (
                        <React.Fragment key={item.term}>
                          <dt>{item.term}</dt>
                          <dd>{item.def}</dd>
                        </React.Fragment>
                      ))}
                    </dl>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* A-Z sidebar index */}
          <div className="w-6 flex flex-col items-center justify-center py-4 mr-1">
            {alphabet.map(letter => {
              const hasTerms = availableLetters.includes(letter);
              return (
                <button
                  key={letter}
                  onClick={() => hasTerms && scrollToLetter(letter)}
                  disabled={!hasTerms}
                  className="text-[9px] font-bold py-0.5 px-1 transition-all"
                  style={{
                    color: hasTerms ? 'var(--accent)' : '#3f3f46',
                    opacity: hasTerms ? 1 : 0.4
                  }}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        </div>
      );
    };
    const ItemsView = ({ onBack, items = [], addons = [], killers = [], settings = {}, initialSearch = '', initialMode = 'survivor', initialTargetId = '', initialTargetType = '', favoriteItems = [], favoriteAddons = [], onToggleFavoriteItem, onToggleFavoriteAddon }) => {
      const [search, setSearch] = useState(initialSearch);
      const [expandedId, setExpandedId] = useState(null);
      const [mode, setMode] = useState(initialMode);
      const [filterType, setFilterType] = useState('All');
      const DEFAULT_ITEM_SORT = { key: 'rarity', dir: 'desc' };
      const [itemSort, setItemSort] = useState(DEFAULT_ITEM_SORT);
      const handleItemSort = (key, defaultDir) => {
        setItemSort(prev => {
          if (prev.key !== key) return { key, dir: defaultDir };
          if (prev.dir === defaultDir) return { key, dir: defaultDir === 'asc' ? 'desc' : 'asc' };
          return { ...DEFAULT_ITEM_SORT };
        });
      };
      const itemCardRefs = useRef({});
      const killerCardRefs = useRef({});
      const addonRefs = useRef({});
    /* Moved to ./games/dbd/config.js (DBD adapter, loaded above). */
      const bloodwebItems = useMemo(() => {
        return (items || []).filter(i => i.bloodweb === true && i.role === 'survivor');
      }, [items]);
      const itemTypes = useMemo(() => {
        const types = new Set();
        bloodwebItems.forEach(i => { if (i.itemType) types.add(i.itemType); });
        return ['All', ...Array.from(types).sort()];
      }, [bloodwebItems]);
      const survivorAddons = useMemo(() => {
        return (addons || []).filter(a => a.role === 'survivor');
      }, [addons]);
      const killerAddons = useMemo(() => {
        return (addons || []).filter(a => a.role === 'killer');
      }, [addons]);
      const targetItem = useMemo(() => (initialTargetType === 'item' ? bloodwebItems.find(item => item.id === initialTargetId) || null : null), [initialTargetType, initialTargetId, bloodwebItems]);
      const targetAddon = useMemo(() => (initialTargetType === 'addon' ? (addons || []).find(addon => addon.id === initialTargetId) || null : null), [initialTargetType, initialTargetId, addons]);
      const filteredItems = useMemo(() => {
        const term = search.toLowerCase();
        let result = bloodwebItems.filter(item => {
          const matchType = filterType === 'All' || item.itemType === filterType;
          if (!matchType) return false;
          if (!term) return true;
          if (item.name.toLowerCase().includes(term)) return true;
          const iAddons = survivorAddons.filter(a => a.itemType === item.itemType);
          return iAddons.some(a => a.name.toLowerCase().includes(term));
        });
        if (itemSort.key === 'rarity') {
          const dirMul = itemSort.dir === 'asc' ? 1 : -1;
          result = result.slice().sort((a, b) => dirMul * (getRarityOrder(a.rarity) - getRarityOrder(b.rarity)) || a.name.localeCompare(b.name));
        }
        else if (itemSort.key === 'name') result = result.slice().sort((a, b) => (itemSort.dir === 'asc' ? 1 : -1) * a.name.localeCompare(b.name));
        return result;
      }, [bloodwebItems, survivorAddons, search, filterType, itemSort]);
      const filteredKillers = useMemo(() => {
        const term = search.toLowerCase();
        if (!term) return killers || [];
        return (killers || []).filter(k => {
          if (k.name.toLowerCase().includes(term)) return true;
          const kAddons = killerAddons.filter(a => a.killerName === k.name);
          return kAddons.some(a => a.name.toLowerCase().includes(term));
        });
      }, [killers, killerAddons, search]);
      const getAddonsForItemType = (itemType) => {
        if (!itemType) return [];
        let result = survivorAddons.filter(a => a.itemType === itemType);
        return result.slice().sort((a, b) => getRarityOrder(b.rarity) - getRarityOrder(a.rarity));
      };
      const getAddonsForKiller = (killer) => {
        return killerAddons
          .filter(a => a.killerName === killer.name)
          .sort((a, b) => getRarityOrder(b.rarity) - getRarityOrder(a.rarity));
      };
      const targetSurvivorAddonHostItem = useMemo(() => {
        if (!targetAddon || targetAddon.role !== 'survivor') return null;
        return filteredItems.find(item => item.itemType === targetAddon.itemType)
          || bloodwebItems.find(item => item.itemType === targetAddon.itemType)
          || null;
      }, [targetAddon, filteredItems, bloodwebItems]);
      const targetKillerAddonHost = useMemo(() => {
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
        let node = null;
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
        const raf = window.requestAnimationFrame(() => {
          node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        return () => window.cancelAnimationFrame(raf);
      }, [initialTargetType, targetItem, targetAddon, targetKillerAddonHost, targetSurvivorAddonHostItem, mode, expandedId, filteredItems, filteredKillers]);
      return (
        <div className="flex flex-col h-full pt-6 pb-32 px-6 overflow-y-auto custom-scrollbar">
          <ViewCrumbs trail={[{ label: 'Main page', onClick: onBack }]} current="Items & Addons" />
          <h1 className="cx-title">Items &amp; Addons</h1>
          <p className="cx-hatnote">Survivor items, Killer powers, and their add-ons.</p>
          <WikiHeaderSearchPortal>
            <div className="relative w-full">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                <Icons.Search width={18} height={18} />
              </div>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full bg-[var(--panel)] border border-[var(--stroke)] rounded-xl py-3 pl-12 pr-10 text-white placeholder-zinc-600 text-sm focus:outline-none" />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white/5 text-zinc-400 hover:text-white transition-colors"><Icons.X width={14} height={14} /></button>}

            </div>
          </WikiHeaderSearchPortal>
          <div className="max-w-3xl mx-auto flex flex-wrap justify-center gap-2 mb-4">
            <button onClick={() => { setMode('survivor'); setExpandedId(null); }} className={"px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all " + (mode === 'survivor' ? 'bg-zinc-100 text-black border border-zinc-100' : 'bg-white/5 text-zinc-400 border border-white/10')}>
              Survivor Items
            </button>
            <button onClick={() => { setMode('killer'); setExpandedId(null); }} className={"px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all " + (mode === 'killer' ? 'bg-zinc-500/20 text-zinc-100 border border-white/25/40' : 'bg-white/5 text-zinc-400 border border-white/10')}>
              Killer Addons
            </button>
          </div>
          {mode === 'survivor' && (
            <div className="max-w-3xl mx-auto flex flex-wrap justify-center gap-2 mb-4">
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className="themed-select compact text-sm">
                {itemTypes.map(t => <option key={t} value={t}>{t === 'All' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
              <span className="text-[11px] text-zinc-500 uppercase tracking-wider self-center">{filteredItems.length} items</span>
            </div>
          )}
<div className="pb-32 space-y-3 -mx-6 px-6">
            {mode === 'survivor' && (
              filteredItems.length === 0 ? <div className="text-center text-zinc-500 mt-12">No items found.</div> :
              <table className="cx-wikitable">
                <thead><tr><SortTh label="Item" sortKey="name" activeKey={itemSort.key} dir={itemSort.dir} defaultDir="asc" onSort={handleItemSort} /><SortTh label="Rarity" sortKey="rarity" activeKey={itemSort.key} dir={itemSort.dir} defaultDir="desc" onSort={handleItemSort} /><th>Effect</th><th aria-hidden="true"></th></tr></thead><tbody>
                {filteredItems.map(item => {
                  const isExpanded = expandedId === item.id;
                  const itemAddons = getAddonsForItemType(item.itemType);
                  return (
                    <React.Fragment key={item.id}>
                    <tr
                      data-smoke-target={initialTargetType === 'item' && initialTargetId === item.id ? 'true' : undefined}
                      ref={(node) => {
                        if (node) itemCardRefs.current[item.id] = node;
                        else delete itemCardRefs.current[item.id];
                      }}
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className={`cursor-pointer ${initialTargetType === 'item' && initialTargetId === item.id ? 'border-white/15 shadow-[0_0_0_1px_rgba(34,211,238,0.12)]' : 'border-white/5'}`}
                    >
                      <td className="cx-perkcell">
                        <div className="cx-perkcell-inner">
                          <div style={{ width: 44, height: 44, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <AssetFrame type="Item" imageUrl={item.image} fallbackIcon={<Icons.Package width={24} height={24} className="text-white/40" />} size="fill" />
                          </div>
                          <span>
                            <span className="font-semibold text-zinc-100">{item.name}</span>
                            <small>{item.itemType ? item.itemType.charAt(0).toUpperCase() + item.itemType.slice(1) : 'Item'}</small>
                          </span>
                        </div>
                      </td>
                      <td className="cx-rarity">{formatRarity(item.rarity)}</td>
                      <td>{item.description ? stripHtml(item.description) : '\u2014'}</td>
                      <td className="cx-star">
                        {onToggleFavoriteItem && (
                          <button type="button" onClick={(e) => { e.stopPropagation(); onToggleFavoriteItem(item.id); }} aria-label="Toggle favorite" className={favoriteItems.includes(item.id) ? 'cx-star-on' : undefined}>
                            {favoriteItems.includes(item.id) ? '\u2605' : '\u2606'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {isExpanded && itemAddons.length > 0 && (
                      <tr key={item.id + '-addons'}>
                        <td colSpan={4}>
                          <p className="text-xs text-zinc-500 font-bold uppercase mb-2">Compatible Add-ons ({itemAddons.length})</p>
                          <table className="cx-wikitable">
                            <thead><tr><th style={{ paddingLeft: '58px', whiteSpace: 'nowrap' }}>Add-on</th><th style={{ width: '76px' }}>Image</th><th>Rarity</th><th>Effect</th><th aria-hidden="true"></th></tr></thead><tbody>
                            {itemAddons.map(addon => (
                              <tr
                                key={addon.id}
                                data-smoke-target={initialTargetType === 'addon' && initialTargetId === addon.id ? 'true' : undefined}
                                ref={(node) => {
                                  if (node) addonRefs.current[addon.id] = node;
                                  else delete addonRefs.current[addon.id];
                                }}
                                className={`${initialTargetType === 'addon' && initialTargetId === addon.id ? 'bg-white/5 border-white/15' : 'bg-white/5 border-white/5'}`}
                              >
                                <td className="cx-perkcell">
                                  <span><span className="font-semibold text-zinc-100">{addon.name}</span></span>
                                </td>
                                <td>
                                  <div style={{ width: 44, height: 44, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <AssetFrame type="Addon" imageUrl={addon.image} fallbackIcon={<Icons.Package width={24} height={24} className="text-white/40" />} size="fill" imageLoading="lazy" />
                                  </div>
                                </td>
                                <td className="cx-rarity">{formatRarity(addon.rarity)}</td>
                                <td style={{ color: 'var(--dim)' }}>{addon.description ? stripHtml(addon.description) : '\u2014'}</td>
                                <td className="cx-star">
                                  {onToggleFavoriteAddon && (
                                    <button type="button" onClick={(e) => { e.stopPropagation(); onToggleFavoriteAddon(addon.id); }} aria-label="Toggle favorite" className={favoriteAddons.includes(addon.id) ? 'cx-star-on' : undefined}>
                                      {favoriteAddons.includes(addon.id) ? '\u2605' : '\u2606'}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody></table>
                        </td>
                      </tr>
                    )}
                    {isExpanded && itemAddons.length === 0 && (
                      <tr key={item.id + '-noaddons'}>
                        <td colSpan={4}>
                          <p className="text-zinc-600 text-xs">No addons for this item type.</p>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );
                })}
              </tbody></table>
            )}
            {mode === 'killer' && (
              filteredKillers.length === 0 ? <div className="text-center text-zinc-500 mt-12">No killers found.</div> :
              <table className="cx-wikitable">
                <thead><tr><th>Killer</th><th>Add-ons</th></tr></thead><tbody>
                {filteredKillers.map(killer => {
                  const isExpanded = expandedId === killer.id;
                  const powerAddons = getAddonsForKiller(killer);
                  return (
                    <React.Fragment key={killer.id}>
                    <tr
                      data-smoke-target={initialTargetType === 'addon' && targetAddon?.role === 'killer' && targetKillerAddonHost?.id === killer.id ? 'true' : undefined}
                      ref={(node) => {
                        if (node) killerCardRefs.current[killer.id] = node;
                        else delete killerCardRefs.current[killer.id];
                      }}
                      onClick={() => setExpandedId(isExpanded ? null : killer.id)}
                      className={`cursor-pointer ${initialTargetType === 'addon' && targetAddon?.role === 'killer' && targetKillerAddonHost?.id === killer.id ? 'border-white/15 shadow-[0_0_0_1px_rgba(34,211,238,0.12)]' : 'border-white/5'}`}
                    >
                      <td className="cx-perkcell">
                        <div className="cx-perkcell-inner">
                          <div style={{ width: 44, height: 44, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <AssetFrame type="Killer" size="fill" imageUrl={killer.image} fallbackIcon={<Icons.User width={28} height={28} className="text-zinc-500" />} />
                          </div>
                          <span>
                            <span className="font-semibold text-zinc-100">{killer.name}</span>
                            {killer.realName && killer.realName !== killer.name ? <small>{killer.realName}</small> : null}
                          </span>
                        </div>
                      </td>
                      <td>{powerAddons.length} add-ons</td>
                    </tr>
                    {isExpanded && powerAddons.length > 0 && (
                      <tr key={killer.id + '-addons'}>
                        <td colSpan={2}>
                          <p className="text-xs text-zinc-500 font-bold uppercase mb-2">Power Add-ons</p>
                          <table className="cx-wikitable">
                            <thead><tr><th style={{ paddingLeft: '58px', whiteSpace: 'nowrap' }}>Add-on</th><th style={{ width: '76px' }}>Image</th><th>Rarity</th><th>Effect</th><th aria-hidden="true"></th></tr></thead><tbody>
                            {powerAddons.map(addon => (
                              <tr
                                key={addon.id}
                                data-smoke-target={initialTargetType === 'addon' && initialTargetId === addon.id ? 'true' : undefined}
                                ref={(node) => {
                                  if (node) addonRefs.current[addon.id] = node;
                                  else delete addonRefs.current[addon.id];
                                }}
                                className={`${initialTargetType === 'addon' && initialTargetId === addon.id ? 'bg-white/5 border-white/15' : 'bg-white/5 border-white/5'}`}
                              >
                                <td className="cx-perkcell">
                                  <span><span className="font-semibold text-zinc-100">{addon.name}</span></span>
                                </td>
                                <td>
                                  <div style={{ width: 44, height: 44, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <AssetFrame type="Addon" imageUrl={addon.image} fallbackIcon={<Icons.Package width={24} height={24} className="text-white/40" />} size="fill" imageLoading="lazy" />
                                  </div>
                                </td>
                                <td className="cx-rarity">{formatRarity(addon.rarity)}</td>
                                <td style={{ color: 'var(--dim)' }}>{addon.description ? stripHtml(addon.description) : '\u2014'}</td>
                                <td className="cx-star">
                                  {onToggleFavoriteAddon && (
                                    <button type="button" onClick={(e) => { e.stopPropagation(); onToggleFavoriteAddon(addon.id); }} aria-label="Toggle favorite" className={favoriteAddons.includes(addon.id) ? 'cx-star-on' : undefined}>
                                      {favoriteAddons.includes(addon.id) ? '\u2605' : '\u2606'}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody></table>
                        </td>
                      </tr>
                    )}
                    {isExpanded && powerAddons.length === 0 && (
                      <tr key={killer.id + '-noaddons'}>
                        <td colSpan={2}>
                          <p className="text-zinc-600 text-xs">No addons found for this killer's power.</p>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );
                })}
              </tbody></table>
            )}
          </div>
        </div>
      );
    };
    const OfferingsView = ({ onBack, offerings = [], initialSearch = '', initialTargetId = '', favoriteOfferings = [], onToggleFavoriteOffering }) => {
      const [search, setSearch] = useState(initialSearch);
      const [filterRole, setFilterRole] = useState('All');
      const [filterSecret, setFilterSecret] = useState(false);
      const [sortBy, setSortBy] = useState('rarity');
      const [expandedId, setExpandedId] = useState(null);
      const offeringRefs = useRef({});
    /* Moved to ./games/dbd/config.js (DBD adapter, loaded above). */
      const getRoleColor = (role) => {
        if (!role || role === 'universal') return '#a1a1aa';
        return role === 'killer' ? '#fafafa' : '#a1a1aa';
      };
      const formatRole = (role) => {
        if (!role) return 'Universal';
        return role.charAt(0).toUpperCase() + role.slice(1);
      };
      const active = useMemo(() => {
        return (offerings || []).filter(o => !o.retired);
      }, [offerings]);
      const targetOffering = useMemo(() => active.find(offering => offering.id === initialTargetId) || null, [active, initialTargetId]);
      const filtered = useMemo(() => {
        const term = search.toLowerCase();
        let result = active.filter(o => {
          const matchSearch = !term || o.name.toLowerCase().includes(term) || (o.description || '').toLowerCase().includes(term);
          const role = o.role || 'universal';
          const matchRole = filterRole === 'All' || role === filterRole.toLowerCase();
          const matchSecret = !filterSecret || o.secret;
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
        const node = offeringRefs.current[targetOffering.id];
        if (!node) return undefined;
        const raf = window.requestAnimationFrame(() => {
          node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        return () => window.cancelAnimationFrame(raf);
      }, [targetOffering, expandedId, filtered]);
      return (
        <div className="flex flex-col h-full pt-6 pb-32 px-6 overflow-y-auto custom-scrollbar">
          <ViewCrumbs trail={[{ label: 'Main page', onClick: onBack }]} current="Offerings" />
          <h1 className="cx-title">Offerings</h1>
          <p className="cx-hatnote">Offerings for the Entity, by rarity.</p>
          <WikiHeaderSearchPortal>
            <div className="relative w-full">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                <Icons.Search width={18} height={18} />
              </div>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full bg-[var(--panel)] border border-[var(--stroke)] rounded-xl py-3 pl-12 pr-10 text-white placeholder-zinc-600 text-sm focus:outline-none" />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white/5 text-zinc-400 hover:text-white transition-colors"><Icons.X width={14} height={14} /></button>}

            </div>
          </WikiHeaderSearchPortal>
          <div className="max-w-3xl mx-auto flex flex-wrap justify-center gap-2 mb-4">
            {['All', 'Killer', 'Survivor', 'Universal'].map(opt => (
<button key={opt} type="button" onClick={() => setFilterRole(opt)} className={`mode-choice px-4 py-2 text-xs font-bold ${filterRole === opt ? 'mode-choice--active' : ''}`}>{opt}</button>
            ))}
<button type="button" onClick={() => setFilterSecret(!filterSecret)} className={`mode-choice px-4 py-2 text-xs font-bold ${filterSecret ? 'mode-choice--active' : ''}`}>Secret</button>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="themed-select compact text-sm ml-2">
              <option value="rarity">Sort by Rarity</option>
              <option value="name">Sort A-Z</option>
            </select>
            <span className="text-[11px] text-zinc-500 uppercase tracking-wider self-center ml-2">{filtered.length} offerings</span>
          </div>
<div className="pb-32 space-y-3 -mx-6 px-6">
            {filtered.length === 0 && <div className="text-center text-zinc-500 mt-12">No offerings found.</div>}
            <div className="cx-tablewrap">
            <table className="cx-wikitable cx-offerings-table" style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead><tr><th style={{ width: '300px' }}>Offering</th><th style={{ width: '90px' }}>Role</th><th style={{ width: '100px' }}>Rarity</th><th>Effect</th><th aria-hidden="true" style={{ width: '40px' }}></th></tr></thead><tbody>
            {filtered.map(offering => {
              const isExpanded = expandedId === offering.id;
              return (
                <tr
                  key={offering.id}
                  data-smoke-target={initialTargetId === offering.id ? 'true' : undefined}
                  ref={(node) => {
                    if (node) offeringRefs.current[offering.id] = node;
                    else delete offeringRefs.current[offering.id];
                  }}
                >
                  <td className="cx-perkcell">
                    <div className="cx-perkcell-inner">
                      <div style={{ width: 64, height: 64, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <AssetFrame type="Offering" imageUrl={offering.image} fallbackIcon={<Icons.Flame width={24} height={24} className="text-white/40" />} size="fill" imageLoading="lazy" />
                      </div>
                      <span>
                        <span className="font-semibold text-zinc-100">{offering.name}</span>
                      </span>
                    </div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatRole(offering.role)}</td>
                  <td className="cx-rarity" style={{ whiteSpace: 'nowrap' }}>{formatRarity(offering.rarity)}</td>
                  <td style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>{offering.description || '\u2014'}</td>
                  <td className="cx-star">
                    {onToggleFavoriteOffering && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); onToggleFavoriteOffering(offering.id); }} aria-label="Toggle favorite" className={favoriteOfferings.includes(offering.id) ? 'cx-star-on' : undefined}>
                        {favoriteOfferings.includes(offering.id) ? '\u2605' : '\u2606'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            </tbody></table>
            </div>
          </div>
        </div>
      );
    };
    const compareUiText = (left, right) => String(left || '').localeCompare(String(right || ''), undefined, { sensitivity: 'base' });
    const getOutfitLinkModeLabel = (mode) => {
      switch (String(mode || '').toLowerCase()) {
        case 'linked': return 'Linked Outfit';
        case 'partially_linked': return 'Partial Link';
        case 'unlinked': return 'Unlinked Outfit';
        case 'character_swap': return 'Character swaps';
        default: return 'Outfit';
      }
    };
    const getOutfitLinkModeChipClasses = (mode) => {
      switch (String(mode || '').toLowerCase()) {
        case 'linked': return 'bg-white/10 text-zinc-100 border-white/20';
        case 'partially_linked': return 'bg-white/5 text-zinc-300 border-white/15';
        case 'unlinked': return 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20';
        case 'character_swap': return 'bg-white/5 text-zinc-300 border-white/15';
        default: return 'bg-white/5 text-zinc-300 border-white/10';
      }
    };
    const normalizeRarityKeyForSort = (rarity) => {
      const normalized = String(rarity || '').toLowerCase().replace(/[^a-z]+/g, '');
      if (normalized === 'common') return 'common';
      if (normalized === 'uncommon') return 'uncommon';
      if (normalized === 'rare') return 'rare';
      if (normalized === 'veryrare') return 'veryrare';
      if (['ultrarare', 'iridescent', 'visceral'].includes(normalized)) return 'ultrarare';
      if (normalized === 'legendary') return 'legendary';
      if (normalized === 'event') return 'event';
      return 'other';
    };
    const raritySortRank = (rarity) => {
      const key = normalizeRarityKeyForSort(rarity);
      const order = {
        common: 0,
        uncommon: 1,
        rare: 2,
        veryrare: 3,
        ultrarare: 4,
        legendary: 5,
        event: 6,
        other: 7
      };
      return order[key] ?? order.other;
    };
    const sortCosmeticsByRarity = (entries = []) => {
      return [...entries].sort((left, right) => {
        return raritySortRank(left.rarity) - raritySortRank(right.rarity)
          || compareUiText(left.rarity, right.rarity)
          || compareUiText(left.name, right.name)
          || compareUiText(left.baseCharacterName, right.baseCharacterName);
      });
    };
    const CosmeticCard = ({ entry, accentColor = 'var(--accent)', focused = false, onOpen, assetRevision = 0, eagerImage = false }) => {
      if (!entry) return null;
      const isCharacterSwap = entry.isCharacterSwap === true || String(entry.outfitLinkMode || '').toLowerCase() === 'character_swap';
      const outfitLinkMode = String(entry.outfitLinkMode || (isCharacterSwap ? 'character_swap' : 'unlinked')).toLowerCase();
      const boundSlotsLabel = entry.bindSummary || (Array.isArray(entry.boundSlots) ? entry.boundSlots.join(' + ') : '');
      const collectionLabel = isCharacterSwap
        ? (entry.groupLabel || 'Character swaps')
        : (entry.collectionName || entry.sourceBucket || entry.groupLabel || 'Cosmetic');
      const pieceLabel = entry.pieceType || (isCharacterSwap ? 'Outfit' : 'Cosmetic');
      const roleChipClasses = entry.baseCharacterType === 'Killer'
        ? 'bg-white/10 text-zinc-100 border-white/20'
        : 'bg-white/5 text-zinc-300 border-white/10';
      const badgeStyle = {
        borderColor: `${accentColor}30`,
        color: focused ? accentColor : 'var(--cos-name)',
        backgroundColor: focused ? `${accentColor}16` : 'rgba(255,255,255,0.04)'
      };
      return (
        <div
          data-smoke-target={focused ? 'true' : undefined}
          className={typeof onOpen === 'function' ? 'cx-coscard cursor-pointer h-full flex flex-col' : 'cx-coscard h-full flex flex-col'}
          onClick={typeof onOpen === 'function' ? () => onOpen(entry) : undefined}
          style={focused ? { outline: '1px solid var(--link)', outlineOffset: '2px' } : undefined}
        >
          <div className={`${isCharacterSwap ? 'aspect-[3/4]' : 'aspect-square'} cx-cosimg`}>
            <AssetFrame
              type={isCharacterSwap ? entry.baseCharacterType : 'Image'}
              size="fill"
              imageUrl={entry.image}
              assetRevision={assetRevision}
              imageLoading={eagerImage ? 'eager' : 'lazy'}
              fallbackIcon={
                isCharacterSwap
                  ? <Icons.User width={24} height={24} className="text-zinc-500" />
                  : <Icons.Image width={24} height={24} className="text-zinc-500" />
              }
            />
          </div>
          <div className="flex flex-1 flex-col gap-1 pt-2">
            <p className="text-sm font-semibold text-zinc-100 leading-tight">{entry.name}</p>
            <p className="text-xs" style={{ color: 'var(--dim)' }}>{entry.baseCharacterName}</p>
            <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
              {entry.rarity ? `${entry.rarity} · ` : ''}{collectionLabel}
              {!isCharacterSwap && boundSlotsLabel && pieceLabel === 'Outfit' ? ` · Binds: ${boundSlotsLabel}` : ''}
            </p>
            {focused && (
              <p className="text-[10px] uppercase tracking-[0.18em] font-bold" style={{ color: 'var(--link)' }}>
                Search match
              </p>
            )}
          </div>
        </div>
      );
    };
    const CosmeticsView = ({
      onBack,
      cosmeticsCatalog = { characterSwaps: [], fullSets: [] },
      onOpenCosmetic,
      fullSetPackState = defaultCosmeticsFullSetPackState(),
      fullSetCatalogCount = 0,
      onRefreshFullSetPack = null,
      cosmeticsAssetRevision = 0
    }) => {
      const [search, setSearch] = useState('');
      const [roleFilter, setRoleFilter] = useState('Killer');
      const [characterFilter, setCharacterFilter] = useState('__all__');
      const COSMETICS_PAGE_SIZE = 120;
      const [visibleCosmeticCount, setVisibleCosmeticCount] = useState(COSMETICS_PAGE_SIZE);
      useEffect(() => {
        setVisibleCosmeticCount(COSMETICS_PAGE_SIZE);
      }, [roleFilter, characterFilter, search]);

      const readyCharacterSwaps = useMemo(
        () => (Array.isArray(cosmeticsCatalog.characterSwaps)
          ? cosmeticsCatalog.characterSwaps.filter((entry) => entry.status === 'ready').map((entry) => ({ ...entry, isCharacterSwap: true }))
          : []),
        [cosmeticsCatalog]
      );
      const readyCosmeticEntries = useMemo(
        () => (Array.isArray(cosmeticsCatalog.fullSets)
          ? cosmeticsCatalog.fullSets.filter((entry) => entry.status === 'ready').map((entry) => ({ ...entry, isCharacterSwap: Boolean(entry.isCharacterSwap) }))
          : []),
        [cosmeticsCatalog]
      );
      const readyCosmetics = useMemo(() => [...readyCharacterSwaps, ...readyCosmeticEntries], [readyCharacterSwaps, readyCosmeticEntries]);
      const roleCharacters = useMemo(() => {
        const grouped = readyCosmetics
          .filter((entry) => entry.baseCharacterType === roleFilter)
          .reduce((acc, entry) => {
            if (!acc[entry.baseCharacterId]) acc[entry.baseCharacterId] = entry.baseCharacterName;
            return acc;
          }, {});
        return Object.entries(grouped)
          .map(([id, name]) => ({ id, name }))
          .sort((left, right) => compareUiText(left.name, right.name));
      }, [readyCosmetics, roleFilter]);

      useEffect(() => {
        if (characterFilter === '__all__') return;
        if (!roleCharacters.some((character) => character.id === characterFilter)) {
          setCharacterFilter('__all__');
        }
      }, [characterFilter, roleCharacters]);

      const matchesQuery = (entry, term) => {
        if (!term) return true;
        const haystack = [
          entry.name,
          entry.baseCharacterName,
          entry.groupLabel,
          entry.pieceType,
          entry.sourceBucket,
          entry.collectionName,
          entry.rarity,
          entry.outfitLinkMode,
          entry.bindSummary,
          entry.description,
          ...(entry.boundSlots || []),
          ...(entry.aliases || [])
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(term);
      };
      const filteredCosmetics = useMemo(() => {
        const term = search.trim().toLowerCase();
        return sortCosmeticsByRarity(
          readyCosmetics.filter((entry) => {
            if (entry.baseCharacterType !== roleFilter) return false;
            if (characterFilter !== '__all__' && entry.baseCharacterId !== characterFilter) return false;
            return matchesQuery(entry, term);
          })
        );
      }, [readyCosmetics, roleFilter, characterFilter, search]);
      const groupedByRarity = useMemo(() => {
        const buckets = filteredCosmetics.reduce((acc, entry) => {
          const key = entry.rarity || 'Unknown';
          if (!acc[key]) acc[key] = [];
          acc[key].push(entry);
          return acc;
        }, {});
        return Object.entries(buckets)
          .map(([label, entries]) => ({ label, entries: sortCosmeticsByRarity(entries) }))
          .sort((left, right) => raritySortRank(left.label) - raritySortRank(right.label) || compareUiText(left.label, right.label));
      }, [filteredCosmetics]);
      const windowedGroups = useMemo(() => {
        let remaining = visibleCosmeticCount;
        const out = [];
        for (const group of groupedByRarity) {
          if (remaining <= 0) break;
          const slice = group.entries.slice(0, remaining);
          out.push({ ...group, entries: slice });
          remaining -= slice.length;
        }
        return out;
      }, [groupedByRarity, visibleCosmeticCount]);
      const shownCosmeticCount = windowedGroups.reduce((total, group) => total + group.entries.length, 0);
      const characterSwapCount = readyCosmetics.filter((entry) => entry.isCharacterSwap).length;
      const fullSetPackStatusLabel = (() => {
        switch (fullSetPackState.status) {
          case 'completed': return 'Full-set cosmetics are installed and ready.';
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
      const showFullSetPackBanner = fullSetPackState.supported && !fullSetPackState.isReady && fullSetCatalogCount > 0;
      const errorHelp = formatAssetPackErrorLabel(fullSetPackState.errorLabel);

      return (
        <div className="flex flex-col h-full pt-6 pb-32 px-6 overflow-y-auto custom-scrollbar" data-smoke-cosmetics="true">
          <ViewCrumbs trail={[{ label: 'Main page', onClick: onBack }]} current="Cosmetics" />
          <h1 className="cx-title">Cosmetics</h1>
          <p className="cx-hatnote">Browse all cosmetics by role, character, and rarity.</p>
          {showFullSetPackBanner && (
            <div className="max-w-5xl mx-auto w-full mb-4">
              <div className="p-4 rounded-xl bg-[var(--panel)] border border-[var(--stroke)] space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-200">Full Cosmetics Pack</p>
                    <p className="text-sm text-zinc-200 mt-1">{fullSetPackStatusLabel}</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      {fullSetCatalogCount} full-set cosmetics can take a little longer to appear after install or update.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {typeof onRefreshFullSetPack === 'function' && (
                      <button onClick={() => onRefreshFullSetPack({ forceAssetReload: true })} className="px-3 py-2 rounded-xl bg-[var(--panel)] border border-[var(--stroke)] text-xs font-semibold text-zinc-200">
                        Refresh
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-zinc-300/90">
                  Character swaps stay available immediately. This banner only affects the larger full-set image library.
                </p>
                {errorHelp && <p className="text-[11px] text-zinc-300">{errorHelp}</p>}
              </div>
            </div>
          )}
          <WikiHeaderSearchPortal>
            <div className="relative w-full">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                <Icons.Search width={18} height={18} />
              </div>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search cosmetics, rarity, piece type, or character..." className="w-full bg-[var(--panel)] border border-[var(--stroke)] rounded-xl py-3 pl-12 pr-10 text-white placeholder-zinc-600 text-sm focus:outline-none" />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white/5 text-zinc-400 hover:text-white transition-colors"><Icons.X width={14} height={14} /></button>}

            </div>
          </WikiHeaderSearchPortal>
          <div className="max-w-5xl mx-auto space-y-3 mb-4">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-[10px] text-zinc-500 uppercase tracking-[0.18em]">Role</span>
              {['Killer', 'Survivor'].map((role) => (
<button key={role} type="button" onClick={() => setRoleFilter(role)} className={`mode-choice px-4 py-2 text-xs font-bold ${roleFilter === role ? 'mode-choice--active' : ''}`}>{role}</button>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-[10px] text-zinc-500 uppercase tracking-[0.18em]">Character</span>
              <div className="min-w-[250px]">
                <select value={characterFilter} onChange={(e) => setCharacterFilter(e.target.value)} className="themed-select w-full text-xs">
                  <option value="__all__">{roleFilter === 'Killer' ? 'All killer cosmetics' : 'All survivor cosmetics'}</option>
                  {roleCharacters.map((character) => (
                    <option key={character.id} value={character.id}>{character.name}</option>
                  ))}
                </select>
              </div>
              <span className="text-[11px] text-zinc-500 uppercase tracking-[0.18em] self-center">
                {filteredCosmetics.length} shown • sorted by rarity
              </span>
            </div>
          </div>
          <div className="w-full max-w-[1280px] mx-auto pb-32 space-y-6">
            {(() => {
              let renderedCount = 0;
              return windowedGroups.map((group) => (
              <section key={group.label} className="space-y-3">
                <h3 className="cx-sub">{group.label} <span style={{ color: 'var(--text-faint)', fontSize: '12px', fontWeight: 400 }}>{(groupedByRarity.find((full) => full.label === group.label)?.entries.length ?? group.entries.length)}</span></h3>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">
                  {group.entries.map((entry) => {
                    const isEager = renderedCount < 16;
                    renderedCount += 1;
                    return <CosmeticCard key={entry.id} entry={entry} onOpen={onOpenCosmetic} assetRevision={cosmeticsAssetRevision} eagerImage={isEager} />;
                  })}
                </div>
              </section>
              ));
            })()}

            {filteredCosmetics.length > shownCosmeticCount && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setVisibleCosmeticCount((count) => count + COSMETICS_PAGE_SIZE)}
                  className="px-5 py-2.5 rounded-xl bg-[var(--panel)] border border-[var(--stroke)] text-sm font-semibold text-zinc-200 hover:text-white transition-colors"
                >
                  Show more ({filteredCosmetics.length - shownCosmeticCount} remaining)
                </button>
              </div>
            )}

            {groupedByRarity.length === 0 && (
              <div className="text-center py-12 rounded-xl border border-[var(--stroke)] bg-[var(--panel)]">
                <Icons.Image width={36} height={36} className="mx-auto text-zinc-700 mb-3" />
                <p className="text-zinc-500 text-sm">No cosmetics match the current filters.</p>
                <p className="text-zinc-600 text-xs mt-2">Try selecting all characters or clearing the search query.</p>
              </div>
            )}
          </div>
        </div>
      );
    };
    const COMMUNITY_LINKS = [
      { label: 'NightLight', context: 'Pick rates, escape stats, Shrine of Secrets tracker and codes. Link-out only.', url: 'https://nightlight.gg/', sourceType: 'stats' },
      { label: 'DBDVault', context: 'Build creator, curated creator builds, meta per patch, tier lists and codes. Link-out only.', url: 'https://www.dbdvault.com/', sourceType: 'builds' },
      { label: 'DBDBuilds.gg', context: 'Searchable curated killer and survivor loadout library. Link-out only.', url: 'https://dbdbuilds.gg/', sourceType: 'builds' },
      { label: 'DBDHub.me', context: 'Community builds with votes, perk stats, randomizer and patch notes. Link-out only.', url: 'https://dbdhub.me/', sourceType: 'builds' },
      { label: 'Official DBD Discord', context: 'News, LFG, strategy discussion and events. Invite link-out only.', url: 'https://discord.com/invite/deadbydaylight', sourceType: 'community' },
      { label: 'r/deadbydaylight New-Player Guide', context: 'Reddit sidebar resources and weekly megathreads. Link-out only.', url: 'https://www.reddit.com/r/deadbydaylight/wiki/new-player-guide', sourceType: 'community' },
      { label: 'TierMaker DBD', context: 'Community killer, survivor and perk tier-list templates with voting. Link-out only.', url: 'https://tiermaker.com/categories/dead-by-daylight', sourceType: 'tierlists' },
      { label: 'Hens333 (YouTube)', context: 'Meta builds, SoloQ experiments and event coverage. Link-out only.', url: 'https://www.youtube.com/c/hens333', sourceType: 'video' },
      { label: 'SpookyLoopz (YouTube)', context: 'High-level killer guides and decision-making demos. Link-out only.', url: 'https://www.youtube.com/@SpookyLoopz', sourceType: 'video' },
      { label: 'DBDGuide', context: 'Codes, perk tier lists and counter guides. Link-out only.', url: 'https://dbdguide.com/', sourceType: 'guides' }
    ];
    const CommunityContentView = ({ onBack, communityContent }) => {
      const [activeTab, setActiveTab] = useState('addons');
      const [addonSearch, setAddonSearch] = useState('');
      const [selectedKillerKey, setSelectedKillerKey] = useState('');
      const [buildRole, setBuildRole] = useState('killers');
      const [selectedBuildProfileId, setSelectedBuildProfileId] = useState('');
      const [selectedBuildPerkName, setSelectedBuildPerkName] = useState('');
      const [characterRole, setCharacterRole] = useState('killer');
      const [characterSearch, setCharacterSearch] = useState('');
      const [academySearch, setAcademySearch] = useState('');
      const [tierlistSearch, setTierlistSearch] = useState('');
      const [tierlistCategory, setTierlistCategory] = useState('all');
      const [guideSearch, setGuideSearch] = useState('');
      const [guideSourceType, setGuideSourceType] = useState('all');

      const toLookupKey = (value) => String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');

      const tabOptions = [
        { id: 'addons', label: 'Addon Tierlist' },
        { id: 'builds', label: 'Builds' },
        { id: 'characters', label: 'Character Intel' },
        { id: 'academy', label: 'Academy' },
        { id: 'tierlists', label: 'Tierlists' },
        { id: 'guideVault', label: 'Guide Vault' },
        { id: 'links', label: 'Community Links' }
      ];

      const addonKillers = useMemo(
        () => (Array.isArray(communityContent?.addonTierlist?.killers) ? communityContent.addonTierlist.killers : []),
        [communityContent]
      );

      useEffect(() => {
        if (addonKillers.length === 0) {
          setSelectedKillerKey('');
          return;
        }
        const hasSelection = addonKillers.some((killer) => (killer.killerSlug || killer.killerName) === selectedKillerKey);
        if (!hasSelection) {
          setSelectedKillerKey(addonKillers[0].killerSlug || addonKillers[0].killerName || '');
        }
      }, [addonKillers, selectedKillerKey]);

      const activeKiller = useMemo(
        () => addonKillers.find((killer) => (killer.killerSlug || killer.killerName) === selectedKillerKey) || null,
        [addonKillers, selectedKillerKey]
      );

      const filteredAddons = useMemo(() => {
        if (!activeKiller || !Array.isArray(activeKiller.addons)) return [];
        const term = addonSearch.trim().toLowerCase();
        if (!term) return activeKiller.addons;
        return activeKiller.addons.filter((addon) => {
          const haystack = [addon.name, addon.otzComment, addon.description].join(' ').toLowerCase();
          return haystack.includes(term);
        });
      }, [activeKiller, addonSearch]);

      const activeKillerCombos = useMemo(
        () => (Array.isArray(activeKiller?.combos) ? activeKiller.combos : []),
        [activeKiller]
      );

      const beginnerGuidesEntries = useMemo(
        () => (Array.isArray(communityContent?.beginnerGuides?.entries) ? communityContent.beginnerGuides.entries : []),
        [communityContent]
      );

      const filteredBeginnerGuides = useMemo(() => {
        const term = academySearch.trim().toLowerCase();
        if (!term) return beginnerGuidesEntries;
        return beginnerGuidesEntries.filter((entry) => {
          const haystack = [entry.title, entry.description].join(' ').toLowerCase();
          return haystack.includes(term);
        });
      }, [beginnerGuidesEntries, academySearch]);

      const tierlistEntries = useMemo(
        () => (Array.isArray(communityContent?.tierlists?.entries) ? communityContent.tierlists.entries : []),
        [communityContent]
      );

      const tierlistCategoryOptions = useMemo(() => {
        const values = [...new Set(tierlistEntries.map((entry) => String(entry.categoryLabel || entry.category || '').trim()).filter(Boolean))];
        return values.sort((a, b) => a.localeCompare(b));
      }, [tierlistEntries]);

      const filteredTierlists = useMemo(() => {
        const term = tierlistSearch.trim().toLowerCase();
        return tierlistEntries.filter((entry) => {
          if (tierlistCategory !== 'all' && String(entry.categoryLabel || entry.category || '') !== tierlistCategory) {
            return false;
          }
          if (!term) return true;
          const haystack = [entry.title, entry.description, entry.patch, entry.dateLabel].join(' ').toLowerCase();
          return haystack.includes(term);
        });
      }, [tierlistEntries, tierlistCategory, tierlistSearch]);

      const tierlistComparisons = useMemo(() => {
        const grouped = tierlistEntries.reduce((accumulator, entry) => {
          const categoryLabel = String(entry.categoryLabel || entry.category || 'General');
          if (!accumulator[categoryLabel]) accumulator[categoryLabel] = [];
          accumulator[categoryLabel].push(entry);
          return accumulator;
        }, {});

        return Object.entries(grouped)
          .map(([categoryLabel, entries]) => {
            const ordered = [...entries].sort((a, b) => {
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
          })
          .sort((a, b) => a.categoryLabel.localeCompare(b.categoryLabel));
      }, [tierlistEntries]);

      const buildProfiles = useMemo(() => {
        if (buildRole === 'survivors') {
          return Array.isArray(communityContent?.builds?.roles?.survivors) ? communityContent.builds.roles.survivors : [];
        }
        return Array.isArray(communityContent?.builds?.roles?.killers) ? communityContent.builds.roles.killers : [];
      }, [communityContent, buildRole]);

      const perkDetailsByRole = useMemo(() => {
        const fallback = { killers: [], survivors: [] };
        const raw = communityContent?.builds?.perkDetails;
        if (!raw || typeof raw !== 'object') return fallback;
        return {
          killers: Array.isArray(raw.killers) ? raw.killers : [],
          survivors: Array.isArray(raw.survivors) ? raw.survivors : []
        };
      }, [communityContent]);

      const activePerkDetails = useMemo(
        () => (buildRole === 'survivors' ? perkDetailsByRole.survivors : perkDetailsByRole.killers),
        [buildRole, perkDetailsByRole]
      );

      const activePerkDetailsLookup = useMemo(() => {
        const map = new Map();
        activePerkDetails.forEach((entry) => {
          const key = toLookupKey(entry?.name || entry?.key);
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
        const hasSelection = buildProfiles.some((profile) => profile.id === selectedBuildProfileId);
        if (!hasSelection) {
          setSelectedBuildProfileId(buildProfiles[0].id || '');
        }
      }, [buildProfiles, selectedBuildProfileId]);

      useEffect(() => {
        setSelectedBuildPerkName('');
      }, [buildRole, selectedBuildProfileId]);

      const activeBuildProfile = useMemo(
        () => buildProfiles.find((profile) => profile.id === selectedBuildProfileId) || null,
        [buildProfiles, selectedBuildProfileId]
      );

      const selectedBuildPerkDetails = useMemo(
        () => activePerkDetailsLookup.get(toLookupKey(selectedBuildPerkName)) || null,
        [activePerkDetailsLookup, selectedBuildPerkName]
      );

      const characterEntries = useMemo(() => {
        if (characterRole === 'survivor') {
          return Array.isArray(communityContent?.characterInfo?.survivors) ? communityContent.characterInfo.survivors : [];
        }
        return Array.isArray(communityContent?.characterInfo?.killers) ? communityContent.characterInfo.killers : [];
      }, [communityContent, characterRole]);

      const visibleCharacters = useMemo(() => {
        const term = characterSearch.trim().toLowerCase();
        const withSearch = !term
          ? characterEntries
          : characterEntries.filter((entry) => {
            const haystack = [entry.name, entry.otzComment, entry.availableIn].join(' ').toLowerCase();
            return haystack.includes(term);
          });
        return [...withSearch].sort((a, b) => {
          const aPriority = Number.isFinite(Number(a.unlockPriority)) ? Number(a.unlockPriority) : -1;
          const bPriority = Number.isFinite(Number(b.unlockPriority)) ? Number(b.unlockPriority) : -1;
          return bPriority - aPriority;
        });
      }, [characterEntries, characterSearch]);

      const guideVaultEntries = useMemo(
        () => (Array.isArray(communityContent?.guideVault?.entries) ? communityContent.guideVault.entries : []),
        [communityContent]
      );

      const guideSourceTypeOptions = useMemo(() => {
        const values = new Set();
        guideVaultEntries.forEach((entry) => {
          const type = String(entry.sourceType || '').trim();
          if (type) values.add(type);
        });
        return [...values].sort((a, b) => a.localeCompare(b));
      }, [guideVaultEntries]);

      const filteredGuideVaultEntries = useMemo(() => {
        const term = guideSearch.trim().toLowerCase();
        return guideVaultEntries.filter((entry) => {
          if (guideSourceType !== 'all' && String(entry.sourceType || '') !== guideSourceType) return false;
          if (!term) return true;
          const haystack = [entry.label, entry.context, entry.url, entry.host].join(' ').toLowerCase();
          return haystack.includes(term);
        });
      }, [guideVaultEntries, guideSourceType, guideSearch]);

      const getTierStyle = (tierBucket) => {
        const bucket = String(tierBucket || '').toLowerCase();
        if (bucket === 'strongest') return { color: '#fafafa', borderColor: 'rgba(250,250,250,0.4)' };
        if (bucket === 'good') return { color: '#e4e4e7', borderColor: 'rgba(228,228,231,0.35)' };
        if (bucket === 'decent') return { color: '#d4d4d8', borderColor: 'rgba(212,212,216,0.3)' };
        if (bucket === 'almost-no-effect') return { color: '#71717a', borderColor: 'rgba(113,113,122,0.3)' };
        if (bucket === 'detrimental') return { color: '#52525b', borderColor: 'rgba(82,82,91,0.35)' };
        return { color: '#a1a1aa', borderColor: 'rgba(161,161,170,0.3)' };
      };

      const links = useMemo(() => {
        const defaults = [
          { label: 'Otzdarva Home', url: 'https://otzdarva.com/' },
          { label: 'DBD Character Info', url: 'https://otzdarva.com/dbd/character-info' },
          { label: 'Addon Tierlist', url: 'https://otz-addon-tierlist.pages.dev/' },
          { label: 'Builds', url: 'https://otzdarva-builds.com/' }
        ];
        const sourceLinks = Array.isArray(communityContent?.links) ? communityContent.links : [];
        const merged = [...defaults, ...sourceLinks];
        const seen = new Set();
        return merged.filter((entry) => {
          const url = String(entry?.url || '').trim();
          if (!url || seen.has(url)) return false;
          seen.add(url);
          return true;
        }).slice(0, 10);
      }, [communityContent]);

      const getTierlistFreshness = (entry) => {
        if (!entry?.dateIso) return { label: 'Undated', color: 'text-zinc-400' };
        const ageDays = Math.floor((Date.now() - new Date(entry.dateIso).getTime()) / (1000 * 60 * 60 * 24));
        if (ageDays <= 120) return { label: 'Fresh', color: 'text-zinc-300' };
        if (ageDays <= 365) return { label: 'Aging', color: 'text-zinc-200' };
        return { label: 'Legacy', color: 'text-zinc-400' };
      };

      const getTierlistAgeLabel = (entry) => {
        if (!entry?.dateIso) return 'unknown age';
        const ageDays = Math.floor((Date.now() - new Date(entry.dateIso).getTime()) / (1000 * 60 * 60 * 24));
        if (ageDays < 31) return `${ageDays}d old`;
        if (ageDays < 365) return `${Math.floor(ageDays / 30)}mo old`;
        return `${Math.floor(ageDays / 365)}y old`;
      };

      return (
        <div className="flex flex-col h-full pt-6 pb-32 px-6 overflow-y-auto custom-scrollbar">
          <ViewCrumbs trail={[{ label: 'Main page', onClick: onBack }]} current="Community Content" />
          <h1 className="cx-title">Community Content</h1>
          <p className="cx-hatnote">Guides, builds, and tierlists from the community.</p>
          <div className="max-w-5xl mx-auto w-full pb-32 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {tabOptions.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-xs rounded-lg border transition-colors ${activeTab === tab.id ? 'bg-zinc-100 text-black border-zinc-100 font-bold' : 'bg-transparent text-zinc-300 border-white/15 hover:border-white/30'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'addons' && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <select value={selectedKillerKey} onChange={(event) => setSelectedKillerKey(event.target.value)} className="themed-select min-w-[220px] text-xs">
                    {addonKillers.map((killer) => {
                      const key = killer.killerSlug || killer.killerName;
                      return <option key={key} value={key}>{killer.localKillerName || killer.killerName}</option>;
                    })}
                  </select>
                  <input
                    value={addonSearch}
                    onChange={(event) => setAddonSearch(event.target.value)}
                    placeholder="Search addon or comment"
                    className="flex-1 min-w-[200px] bg-[var(--panel)] border border-[var(--stroke)] rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500"
                  />
                </div>
                {activeKillerCombos.length > 0 && (
                  <div className="p-3 rounded-xl bg-[var(--panel)] border border-[var(--stroke)]">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-bold">Recommended Addon Combos</p>
                    <div className="mt-2 space-y-2">
                      {activeKillerCombos.map((combo, comboIndex) => (
                        <div key={`${combo.tier}-${comboIndex}`} className="rounded-xl border border-white/10 bg-white/[0.02] px-2 py-2">
                          <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">{combo.label || 'Combo'}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {(combo.addons || []).map((comboAddon, addonIndex) => (
                              <div key={`${combo.label || 'combo'}-${comboAddon.rank}-${addonIndex}`} className="flex items-center gap-2">
                                {addonIndex > 0 && <span className="text-zinc-600 text-xs font-bold">+</span>}
                                <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-black/20 border border-white/10">
                                  <div className="w-8 h-8 rounded-md bg-zinc-950/70 border border-white/10 overflow-hidden shrink-0">
                                    <AssetFrame
                                      type="Addon"
                                      size="fill"
                                      imageUrl={comboAddon?.localMatch?.localImage || ''}
                                      fallbackIcon={<Icons.Package width={12} height={12} className="text-zinc-600" />}
                                    />
                                  </div>
                                  <span className="text-[11px] text-zinc-200">{comboAddon.name}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  {filteredAddons.map((addon) => {
                    const tierStyle = getTierStyle(addon.tierBucket);
                    return (
                      <div key={`${addon.rank}-${addon.name}`} className="p-3 rounded-xl bg-[var(--panel)] border border-[var(--stroke)]">
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-lg bg-zinc-950/70 border border-white/10 overflow-hidden shrink-0">
                            <AssetFrame
                              type="Addon"
                              size="fill"
                              imageUrl={addon?.localMatch?.localImage || ''}
                              fallbackIcon={<Icons.Package width={14} height={14} className="text-zinc-600" />}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[10px] text-zinc-500 font-bold w-7">#{addon.rank}</span>
                                <p className="text-sm font-semibold text-white truncate">{addon.name}</p>
                                <span className="px-2 py-0.5 rounded-md border text-[10px] uppercase tracking-wider" style={tierStyle}>{String(addon.tierBucket || 'unknown').replace(/-/g, ' ')}</span>
                              </div>
                            </div>
                            {addon.otzComment && <p className="text-xs text-zinc-300 mt-2 leading-relaxed break-words whitespace-normal">{addon.otzComment}</p>}
                            {addon.description && <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed break-words whitespace-normal">{addon.description}</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredAddons.length === 0 && (
                    <div className="p-4 rounded-xl bg-[var(--panel)] border border-[var(--stroke)] text-zinc-500 text-sm">No addon entries match the current filters.</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'builds' && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 items-center">
<button type="button" onClick={() =>  setBuildRole('killers') } className="px-4 py-2 text-xs rounded-lg border transition-colors {buildRole === 'killers' ? 'bg-zinc-100 text-black border-zinc-100 font-bold' : 'bg-transparent text-zinc-300 border-white/15 hover:border-white/30'}">Killers</button>
<button type="button" onClick={() =>  setBuildRole('survivors') } className="px-4 py-2 text-xs rounded-lg border transition-colors {buildRole === 'survivors' ? 'bg-zinc-100 text-black border-zinc-100 font-bold' : 'bg-transparent text-zinc-300 border-white/15 hover:border-white/30'}">Survivors</button>
                  <select value={selectedBuildProfileId} onChange={(event) => setSelectedBuildProfileId(event.target.value)} className="themed-select min-w-[220px] text-xs">
                    {buildProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
                  </select>
                </div>
                {activeBuildProfile ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-[var(--panel)] border border-[var(--stroke)]">
                      <p className="text-white font-semibold text-sm">{activeBuildProfile.name}</p>
                      <p className="text-[11px] text-zinc-500 mt-1">{activeBuildProfile.buildCount} builds • Featured: {activeBuildProfile.featuredBuildName || 'n/a'}</p>
                    </div>
                    {activeBuildProfile.builds.map((build) => (
                      <div key={build.name} className="p-3 rounded-xl bg-[var(--panel)] border border-[var(--stroke)] space-y-2">
                        <p className="text-white font-semibold text-sm">{build.name}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(build.perks || []).map((perk) => (
                            <button
                              key={`${build.name}-${perk.name}`}
                              onClick={() => setSelectedBuildPerkName(perk.name)}
                              className={`px-2 py-1 rounded-lg border text-[10px] uppercase tracking-wider transition-colors ${selectedBuildPerkName === perk.name ? 'bg-white/10 border-amber-400/40 text-zinc-300' : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white'}`}
                            >
                              {perk.name}
                            </button>
                          ))}
                        </div>
                        {(build.details || []).length > 0 && (
                          <div className="space-y-1">
                            {build.details.map((detail, index) => (
                              <p key={`${build.name}-detail-${index}`} className="text-[11px] text-zinc-500 leading-relaxed">• {detail}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {selectedBuildPerkName && (
                      <div className="p-3 rounded-xl bg-[var(--panel)] border border-[var(--stroke)] space-y-2">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-bold">Perk Deep Dive</p>
                        {selectedBuildPerkDetails ? (
                          <>
                            <p className="text-white font-semibold text-sm">{selectedBuildPerkDetails.name}</p>
                            <p className="text-[11px] text-zinc-500">Obtained from: {selectedBuildPerkDetails.obtainedFrom || 'Unknown'}</p>
                            <p className="text-xs text-zinc-300 leading-relaxed break-words whitespace-normal">{selectedBuildPerkDetails.descriptionText || 'No perk description available in this saved record.'}</p>
                            {(selectedBuildPerkDetails.links || []).length > 0 && (
                              <div className="flex flex-wrap gap-2 pt-1">
                                {selectedBuildPerkDetails.links.map((link) => (
                                  <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] text-zinc-300 hover:text-white transition-colors">
                                    {link.label || 'Wiki Source'}
                                  </a>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-zinc-500">No detailed entry was found for this perk in the current role dataset.</p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-[var(--panel)] border border-[var(--stroke)] text-zinc-500 text-sm">No build profiles were found for this role.</div>
                )}
              </div>
            )}

            {activeTab === 'characters' && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 items-center">
<button type="button" onClick={() =>  setCharacterRole('killer') } className="px-4 py-2 text-xs rounded-lg border transition-colors {characterRole === 'killer' ? 'bg-zinc-100 text-black border-zinc-100 font-bold' : 'bg-transparent text-zinc-300 border-white/15 hover:border-white/30'}">Killers</button>
<button type="button" onClick={() =>  setCharacterRole('survivor') } className="px-4 py-2 text-xs rounded-lg border transition-colors {characterRole === 'survivor' ? 'bg-zinc-100 text-black border-zinc-100 font-bold' : 'bg-transparent text-zinc-300 border-white/15 hover:border-white/30'}">Survivors</button>
                  <input
                    value={characterSearch}
                    onChange={(event) => setCharacterSearch(event.target.value)}
                    placeholder="Search character"
                    className="flex-1 min-w-[220px] bg-[var(--panel)] border border-[var(--stroke)] rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] text-zinc-500">Sorted from most important to least important.</p>
                  {visibleCharacters.map((entry, index) => (
                    <div key={entry.id || entry.name} className="p-3 rounded-xl bg-[var(--panel)] border border-[var(--stroke)]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm text-white font-semibold">{entry.name}</p>
                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] uppercase tracking-wider text-zinc-400">
                          Rank #{index + 1}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1">{entry.cost || 'No cost data'}{entry.availableIn ? ` • ${entry.availableIn}` : ''}</p>
                      {(entry.perks || []).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {entry.perks.slice(0, 4).map((perk) => (
                            <span key={`${entry.id}-${perk.id}`} className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] text-zinc-300 uppercase tracking-wider">
                              {perk.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {visibleCharacters.length === 0 && (
                    <div className="p-4 rounded-xl bg-[var(--panel)] border border-[var(--stroke)] text-zinc-500 text-sm">No character entries match the current filters.</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'academy' && (
              <div className="space-y-3">
                <input
                  value={academySearch}
                  onChange={(event) => setAcademySearch(event.target.value)}
                  placeholder="Search beginner guides"
                  className="w-full bg-[var(--panel)] border border-[var(--stroke)] rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500"
                />
                <div className="space-y-2">
                  {filteredBeginnerGuides.map((entry) => (
                    <div key={entry.id} className="p-3 rounded-xl bg-[var(--panel)] border border-[var(--stroke)]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm text-white font-semibold">{entry.title}</p>
                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] uppercase tracking-wider text-zinc-400">{entry.sourceType || 'resource'}</span>
                      </div>
                      {entry.description && <p className="text-xs text-zinc-300 mt-2 leading-relaxed break-words whitespace-normal">{entry.description}</p>}
                      {entry.url && (
                        <a href={entry.url} target="_blank" rel="noreferrer" className="inline-flex mt-2 px-3 py-1.5 rounded-xl bg-[var(--panel)] border border-[var(--stroke)] text-[11px] text-zinc-300 hover:text-white transition-colors">
                          Open Guide
                        </a>
                      )}
                    </div>
                  ))}
                  {filteredBeginnerGuides.length === 0 && (
                    <div className="p-4 rounded-xl bg-[var(--panel)] border border-[var(--stroke)] text-zinc-500 text-sm">No beginner guides match the current search.</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'tierlists' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {tierlistComparisons.map((comparison) => (
                    <div key={comparison.categoryLabel} className="p-3 rounded-xl bg-[var(--panel)] border border-[var(--stroke)]">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-bold">{comparison.categoryLabel}</p>
                      <p className="text-sm text-white mt-1">Latest: {comparison.latest?.title || 'n/a'}</p>
                      <p className="text-[11px] text-zinc-500 mt-1">Previous: {comparison.previous?.title || 'none recorded'}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <select value={tierlistCategory} onChange={(event) => setTierlistCategory(event.target.value)} className="themed-select min-w-[220px] text-xs">
                    <option value="all">All Categories</option>
                    {tierlistCategoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                  <input
                    value={tierlistSearch}
                    onChange={(event) => setTierlistSearch(event.target.value)}
                    placeholder="Search tierlists"
                    className="flex-1 min-w-[200px] bg-[var(--panel)] border border-[var(--stroke)] rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500"
                  />
                </div>
                <div className="space-y-2">
                  {filteredTierlists.map((entry) => {
                    const freshness = getTierlistFreshness(entry);
                    return (
                      <div key={entry.id} className="p-3 rounded-xl bg-[var(--panel)] border border-[var(--stroke)]">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm text-white font-semibold">{entry.title}</p>
                          <span className={`text-[10px] uppercase tracking-wider ${freshness.color}`}>{freshness.label}</span>
                        </div>
                        <p className="mt-1 font-mono text-[11px] text-zinc-500">{entry.categoryLabel} • {entry.patch || 'Patch n/a'} • {entry.dateLabel || 'Undated'} • {getTierlistAgeLabel(entry)}</p>
                        {entry.description && <p className="text-xs text-zinc-300 mt-2 leading-relaxed break-words whitespace-normal">{entry.description}</p>}
                        {entry.url && (
                          <a href={entry.url} target="_blank" rel="noreferrer" className="inline-flex mt-2 px-3 py-1.5 rounded-xl bg-[var(--panel)] border border-[var(--stroke)] text-[11px] text-zinc-300 hover:text-white transition-colors">
                            Open Tierlist
                          </a>
                        )}
                      </div>
                    );
                  })}
                  {filteredTierlists.length === 0 && (
                    <div className="p-4 rounded-xl bg-[var(--panel)] border border-[var(--stroke)] text-zinc-500 text-sm">No tierlists match the current filters.</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'guideVault' && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <select value={guideSourceType} onChange={(event) => setGuideSourceType(event.target.value)} className="themed-select min-w-[220px] text-xs">
                    <option value="all">All Source Types</option>
                    {guideSourceTypeOptions.map((sourceType) => <option key={sourceType} value={sourceType}>{sourceType}</option>)}
                  </select>
                  <input
                    value={guideSearch}
                    onChange={(event) => setGuideSearch(event.target.value)}
                    placeholder="Search guide vault"
                    className="flex-1 min-w-[220px] bg-[var(--panel)] border border-[var(--stroke)] rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500"
                  />
                </div>
                <div className="space-y-2">
                  {filteredGuideVaultEntries.map((entry) => (
                    <div key={entry.id} className="p-3 rounded-xl bg-[var(--panel)] border border-[var(--stroke)]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm text-white font-semibold">{entry.label}</p>
                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] uppercase tracking-wider text-zinc-400">{entry.sourceType || 'resource'}</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1">{entry.host || 'external resource'}</p>
                      {entry.context && <p className="text-xs text-zinc-300 mt-2 leading-relaxed break-words whitespace-normal">{entry.context}</p>}
                      {entry.url && (
                        <a href={entry.url} target="_blank" rel="noreferrer" className="inline-flex mt-2 px-3 py-1.5 rounded-xl bg-[var(--panel)] border border-[var(--stroke)] text-[11px] text-zinc-300 hover:text-white transition-colors">
                          Open Resource
                        </a>
                      )}
                    </div>
                  ))}
                  {filteredGuideVaultEntries.length === 0 && (
                    <div className="p-4 rounded-xl bg-[var(--panel)] border border-[var(--stroke)] text-zinc-500 text-sm">No guide vault entries match the current filters.</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'links' && (
              <div className="space-y-2">
                {COMMUNITY_LINKS.map((entry) => (
                  <div key={entry.url} className="p-3 rounded-xl bg-[var(--panel)] border border-[var(--stroke)]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm text-white font-semibold">{entry.label}</p>
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] uppercase tracking-wider text-zinc-400">{entry.sourceType || 'resource'}</span>
                    </div>
                    {entry.context && <p className="text-xs text-zinc-300 mt-2 leading-relaxed break-words whitespace-normal">{entry.context}</p>}
                    <a href={entry.url} target="_blank" rel="noreferrer" className="inline-flex mt-2 px-3 py-1.5 rounded-xl bg-[var(--panel)] border border-[var(--stroke)] text-[11px] text-zinc-300 hover:text-white transition-colors">
                      Open Resource
                    </a>
                  </div>
                ))}
              </div>
            )}

            {links.length > 0 && (
              <div className="p-4 rounded-xl bg-[var(--panel)] border border-[var(--stroke)]">
                <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-bold">Open Otzdarva Resources</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {links.map((link) => (
                    <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-xl bg-[var(--panel)] border border-[var(--stroke)] text-[11px] text-zinc-300 hover:text-white transition-colors">
                      {link.label || link.url}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    };
    const FavoritesView = ({ onBack, settings, killers = [], survivors = [], perks = [], items = [], addons = [], offerings = [], toggleFavorite, setView, onPerkTap }) => {
      const [activeTab, setActiveTab] = useState('All');
      const tabs = ['All', 'Killers', 'Survivors', 'Perks', 'Items', 'Addons', 'Offerings'];
      const resolve = (ids, pool) => (ids || []).map(id => pool.find(x => x.id === id)).filter(Boolean);
      const favKillers = useMemo(() => resolve(settings.favoriteKillers, killers), [settings.favoriteKillers, killers]);
      const favSurvivors = useMemo(() => resolve(settings.favoriteSurvivors, survivors), [settings.favoriteSurvivors, survivors]);
      const favPerks = useMemo(() => resolve(settings.favoritePerks, perks), [settings.favoritePerks, perks]);
      const favItems = useMemo(() => resolve(settings.favoriteItems, items), [settings.favoriteItems, items]);
      const favAddons = useMemo(() => resolve(settings.favoriteAddons, addons), [settings.favoriteAddons, addons]);
      const favOfferings = useMemo(() => resolve(settings.favoriteOfferings, offerings.filter(o => !o.retired)), [settings.favoriteOfferings, offerings]);
      const totalCount = favKillers.length + favSurvivors.length + favPerks.length + favItems.length + favAddons.length + favOfferings.length;
      const releaseByChar = useMemo(() => {
        const map = new Map();
        if (typeof TIMELINE_DATA !== 'undefined' && TIMELINE_DATA && TIMELINE_DATA.releases) {
          TIMELINE_DATA.releases.forEach(rel => {
            [...(rel.killers || []), ...(rel.survivors || [])].forEach(entry => {
              if (entry && entry.name && !map.has(entry.name)) map.set(entry.name, { name: rel.name, chapterNumber: rel.chapterNumber });
            });
          });
        }
        return map;
      }, []);
      const getRarityColor = (rarity) => {
        switch ((rarity || '').toLowerCase()) {
          case 'common': return '#71717a'; case 'uncommon': return '#a1a1aa'; case 'rare': return '#d4d4d8';
          case 'veryrare': return '#e4e4e7'; case 'ultrarare': case 'visceral': return '#fafafa'; case 'event': return '#e4e4e7'; default: return '#71717a';
        }
      };
      const FavSection = ({ title, items: sectionItems, columns, renderItem }) => {
        if (sectionItems.length === 0) return null;
        return (
          <div className="mb-8">
            <h3 className="cx-sub">{title} <span style={{ color: 'var(--text-faint)', fontSize: '12px', fontWeight: 400 }}>{sectionItems.length}</span></h3>
            <table className="cx-wikitable">
              <thead><tr>{columns.map((col, idx) => <th key={idx} style={col.width ? { width: col.width } : undefined}>{col.label}</th>)}<th aria-hidden="true" style={{ width: '40px' }}></th></tr></thead>
              <tbody>
                {sectionItems.map(item => renderItem(item))}
              </tbody>
            </table>
          </div>
        );
      };
      const charColumns = [{ label: 'Character' }, { label: 'Chapter' }];
      const CharRow = ({ item, category }) => {
        const rel = releaseByChar.get(item.name);
        return (
          <tr key={item.id} onClick={() => setView(category === 'Killer' ? 'killer' : 'survivor', { id: item.id })} style={{ cursor: 'pointer' }}>
            <td className="cx-perkcell">
              <div className="cx-perkcell-inner">
                <div style={{ width: 44, height: 44, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AssetFrame type={category} size="fill" imageUrl={item.image} fallbackIcon={<Icons.User width={20} height={20} className="text-white/40" />} />
                </div>
                <span>
                  <span className="font-semibold text-zinc-100">{item.name}</span>
                  {item.realName && item.realName !== item.name ? <small>{item.realName}</small> : null}
                </span>
              </div>
            </td>
            <td style={{ color: 'var(--dim)' }}>{rel ? rel.name : '\u2014'}</td>
            <td className="cx-star">
              <button type="button" onClick={(e) => { e.stopPropagation(); toggleFavorite(category, item.id); }} aria-label="Remove favorite" className="cx-star-on">{'\u2605'}</button>
            </td>
          </tr>
        );
      };
      const perkColumns = [{ label: 'Perk' }, { label: 'Owner' }];
      const PerkRow = ({ item }) => (
        <tr key={item.id} onClick={() => onPerkTap && onPerkTap(item)} style={{ cursor: 'pointer' }}>
          <td className="cx-perkcell">
            <div className="cx-perkimg">
              <div className="cx-imgbox">
                <AssetFrame type="Perk" size="fill" imageUrl={item.image} fallbackIcon={<Icons.BookOpen width={16} height={16} className="text-white/40" />} />
              </div>
              <span className="font-semibold text-zinc-100">{item.name}</span>
              <small>{item.type} Perk{item.name.startsWith('Hex:') ? ' · Hex' : ''}</small>
            </div>
          </td>
          <td style={{ color: 'var(--dim)' }}>{item.owner || 'Universal'}</td>
          <td className="cx-star">
            <button type="button" onClick={(e) => { e.stopPropagation(); toggleFavorite('Perk', item.id); }} aria-label="Remove favorite" className="cx-star-on">{'\u2605'}</button>
          </td>
        </tr>
      );
      const smallColumns = [{ label: 'Name' }, { label: 'Type' }, { label: 'Rarity' }];
      const fmtRaritySm = (r) => (r || '').replace('veryrare', 'Very Rare').replace('ultrarare', 'Ultra Rare');
      const SmallRow = ({ item, category, subtitle }) => (
        <tr key={item.id}>
          <td className="cx-perkcell">
            <div className="cx-perkcell-inner">
              <div style={{ width: 44, height: 44, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AssetFrame type={category} size="fill" imageUrl={item.image} fallbackIcon={<Icons.Package width={16} height={16} className="text-white/40" />} />
              </div>
              <span>
                <span className="font-semibold text-zinc-100">{item.name}</span>
              </span>
            </div>
          </td>
          <td style={{ color: 'var(--dim)' }}>{subtitle}</td>
          <td className="cx-rarity">{item.rarity ? fmtRaritySm(item.rarity) : '\u2014'}</td>
          <td className="cx-star">
            <button type="button" onClick={() => toggleFavorite(category, item.id)} aria-label="Remove favorite" className="cx-star-on">{'\u2605'}</button>
          </td>
        </tr>
      );
      const showSection = (tab) => activeTab === 'All' || activeTab === tab;
      return (
        <div className="flex flex-col h-full pt-6 pb-32 px-6 overflow-y-auto custom-scrollbar">
          <ViewCrumbs trail={[{ label: 'Main page', onClick: onBack }]} current="My Favorites" />
          <h1 className="cx-title">My Favorites</h1>
          <p className="cx-hatnote">Your bookmarked killers, survivors, perks, items, add-ons, and offerings.</p>
          <div className="max-w-3xl mx-auto flex flex-wrap justify-center gap-2 mb-6 mt-4">
            {tabs.map(tab => {
              const count = tab === 'All' ? totalCount : tab === 'Killers' ? favKillers.length : tab === 'Survivors' ? favSurvivors.length : tab === 'Perks' ? favPerks.length : tab === 'Items' ? favItems.length : tab === 'Addons' ? favAddons.length : favOfferings.length;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-xs rounded-lg border transition-colors ${activeTab === tab ? 'bg-zinc-100 text-black border-zinc-100 font-bold' : 'bg-transparent text-zinc-300 border-white/15 hover:border-white/30'}`}
                >
                  {tab}{count > 0 ? ` (${count})` : ''}
                </button>
              );
            })}
          </div>
          <div className="pb-32 -mx-6 px-6">
            {totalCount === 0 ? (
              <div className="flex flex-col items-center justify-center text-center mt-16 animate-in fade-in duration-500">
                <div className="w-20 h-20 rounded-xl bg-white/5 border border-white/15 flex items-center justify-center mb-4">
                  <Icons.Star width={36} height={36} className="text-zinc-500" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 [font-family:var(--font-display)]">No Favorites Yet</h3>
                <p className="text-zinc-500 text-sm max-w-xs">Star any killer, survivor, perk, item, addon, or offering to see them here for quick access.</p>
                <button onClick={() => setView('home')} className="mt-6 px-6 py-3 rounded-xl bg-[var(--panel)] border border-[var(--stroke)] text-zinc-300 text-sm font-semibold transition-colors">Browse Content</button>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {showSection('Killers') && <FavSection title="Killers" items={favKillers} category="Killer" columns={charColumns} renderItem={(item) => <CharRow key={item.id} item={item} category="Killer" />} />}
                {showSection('Survivors') && <FavSection title="Survivors" items={favSurvivors} category="Survivor" columns={charColumns} renderItem={(item) => <CharRow key={item.id} item={item} category="Survivor" />} />}
                {showSection('Perks') && <FavSection title="Perks" items={favPerks} category="Perk" columns={perkColumns} renderItem={(item) => <PerkRow key={item.id} item={item} />} />}
                {showSection('Items') && <FavSection title="Items" items={favItems} category="Item" columns={smallColumns} renderItem={(item) => <SmallRow key={item.id} item={item} category="Item" subtitle={item.itemType || 'Item'} />} />}
                {showSection('Addons') && <FavSection title="Addons" items={favAddons} category="Addon" columns={smallColumns} renderItem={(item) => <SmallRow key={item.id} item={item} category="Addon" subtitle={item.killerName || item.itemType || 'Addon'} />} />}
                {showSection('Offerings') && <FavSection title="Offerings" items={favOfferings} category="Offering" columns={smallColumns} renderItem={(item) => <SmallRow key={item.id} item={item} category="Offering" subtitle={item.role || 'Universal'} />} />}
              </div>
            )}
          </div>
        </div>
      );
    };
    const SettingsToggleRow = ({ checked, onChange, label, description }) => (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-full flex items-start gap-3 rounded-2xl border px-3 py-3 transition-all text-left select-none touch-manipulation ${checked ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all"
          style={{
            background: checked ? 'var(--accent)' : 'rgba(255,255,255,0.03)',
            borderColor: checked ? 'var(--accent)' : 'var(--stroke)',
            boxShadow: checked ? '0 8px 18px rgba(0,0,0,0.28)' : 'none',
            color: checked ? '#ffffff' : 'transparent'
          }}
        >
          <Icons.Check width={12} height={12} />
        </span>
        <span className="min-w-0 flex-1 pointer-events-none">
          <span className="block text-sm font-medium text-white leading-tight">{label}</span>
          {description && <span className="mt-1 block text-xs leading-relaxed text-zinc-400">{description}</span>}
        </span>
      </button>
    );
    const SettingsView = ({ onBack, settings, setSettings, backupSummary, onCopyBackup, onDownloadBackup, onRestoreBackup, isMobile = false }) => {
      const updateSetting = (field, value) => setSettings((prev) => {
        return { ...prev, [field]: value };
      });
      const favoriteCounts = {
        favoritePerks: (settings.favoritePerks || []).length,
        favoriteKillers: (settings.favoriteKillers || []).length,
        favoriteSurvivors: (settings.favoriteSurvivors || []).length,
        favoriteItems: (settings.favoriteItems || []).length,
        favoriteAddons: (settings.favoriteAddons || []).length,
        favoriteOfferings: (settings.favoriteOfferings || []).length
      };
      const resetAllSettings = () => {
        if (!confirm('Reset all website preferences to defaults?')) return;
        setSettings({ ...DEFAULT_SETTINGS, settingsVersion: 2 });
      };
      const [backupDraft, setBackupDraft] = useState('');
      const [backupPreview, setBackupPreview] = useState(null);
      const [backupError, setBackupError] = useState('');
      const backupFileInputRef = useRef(null);
      const refreshBackupPreview = useCallback((value) => {
        const nextValue = typeof value === 'string' ? value : '';
        setBackupDraft(nextValue);
        if (!nextValue.trim()) {
          setBackupPreview(null);
          setBackupError('');
          return;
        }
        try {
          const parsed = parseWebsiteBackupPayload(nextValue);
          setBackupPreview(parsed);
          setBackupError('');
        } catch (error) {
          setBackupPreview(null);
          setBackupError(error?.message || 'Backup content is invalid.');
        }
      }, []);
      const handleBackupFileChange = useCallback((event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => refreshBackupPreview(String(reader.result || ''));
        reader.onerror = () => {
          setBackupPreview(null);
          setBackupError('Could not read that backup file.');
        };
        reader.readAsText(file);
        event.target.value = '';
      }, [refreshBackupPreview]);
      const restorePreview = backupPreview?.payload || null;
      return (
        <div className="flex flex-col h-full pt-6 pb-32 px-6 overflow-y-auto custom-scrollbar">
          <ViewCrumbs trail={[{ label: 'Main page', onClick: onBack }]} current="Settings" />
          <h1 className="cx-title">Settings</h1>
          <p className="cx-hatnote">Website preferences and backups.</p>
          <div className="pb-32 -mx-6 px-6 space-y-4">
            {isMobile && settings.googlePlayCtaHidden === true && (
              <div>
                <h2 className="cx-sec">App</h2>
                <table className="cx-wikitable"><tbody>
                  <tr><th scope="row">Get the app</th><td>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-bold text-white">Get the app</h3>
                      <button
                        type="button"
                        onClick={() => updateSetting('googlePlayCtaHidden', false)}
                        className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        Show Banner
                      </button>
                    </div>
                    <PlayStoreFooter compact className="w-fit" />
                  </td></tr>
                </tbody></table>
              </div>
            )}
            <h2 className="cx-sec">Website info</h2>
            <table className="cx-wikitable"><tbody>
              <tr><th scope="row">Website Version</th><td><span className="text-white font-semibold">{META.siteVersion}</span></td></tr>
              <tr><th scope="row">Game Update / Data Updated</th><td><span className="text-white font-semibold">{META.gameVersion} / {META.lastSynced}</span></td></tr>
              <tr><th scope="row">Legal</th><td><SiteLegalFooter className="mt-3" /></td></tr>
            </tbody></table>
            <h2 className="cx-sec">Guide sources</h2>
            <table className="cx-wikitable"><tbody>
              <tr><th scope="row">Official DBD Wiki</th><td>Power mechanics and numbers per killer, paraphrased in our own words. <a href="https://deadbydaylight.wiki.gg/wiki/Powers" target="_blank" rel="noreferrer">Powers compendium</a> (CC BY-NC-SA, no verbatim reuse).</td></tr>
              <tr><th scope="row">Reddit</th><td>Playing-as and playing-against tactics synthesized from r/deadbydaylight character guides and counterplay threads. Summarized with thread credit per killer, never copied.</td></tr>
              <tr><th scope="row">YouTube</th><td>Expert video guides (Otzdarva killer guides, SupaAlf, ScottJund, SpookyLoopz, JRM). Tactics summarized with video credit per killer, never transcribed.</td></tr>
              <tr><th scope="row">Steam Guides</th><td>Community build and strategy guides. Ideas summarized with author credit per killer.</td></tr>
              <tr><th scope="row">Behaviour</th><td>Patch notes and game updates used to verify numbers per patch. All game text paraphrased.</td></tr>
            </tbody></table>
            <h2 className="cx-sec">Appearance</h2>
            <table className="cx-wikitable"><tbody>
              <tr><th scope="row">Color</th><td>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'dark', label: 'Dark' },
                    { id: 'oled', label: 'OLED' },
                    { id: 'light', label: 'Light' }
                  ].map((mode) => {
                    const isActive = (settings.colorMode || 'oled') === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => updateSetting('colorMode', mode.id)}
                        className={`mode-choice ${isActive ? 'mode-choice--active' : ''} rounded-xl px-2 py-2 text-xs font-bold transition-colors`}
                        aria-pressed={isActive}
                      >
                        {mode.label}
                      </button>
                    );
                  })}
                </div>
              </td></tr>
              <tr><th scope="row">Text size</th><td>
                <select value={settings.fontSize} onChange={e => updateSetting('fontSize', e.target.value)} className="themed-select w-full text-sm">
                  <option value="small">Small</option>
                  <option value="default">Standard</option>
                  <option value="large">Large</option>
                </select>
              </td></tr>
            </tbody></table>
            <h2 className="cx-sec">Features</h2>
            <table className="cx-wikitable"><tbody>
              <tr><th scope="row">Show template builds in Build Lab</th><td>
                <SettingsToggleRow
                  checked={settings.showTemplates}
                  onChange={(value) => updateSetting('showTemplates', value)}
                  label="Show template builds in Build Lab"
                  description="Keep the premade starter builds visible alongside your own saved builds."
                />
              </td></tr>
              <tr><th scope="row">Rarity glow effects on cards</th><td>
                <SettingsToggleRow
                  checked={settings.rarityGlows !== false}
                  onChange={(value) => updateSetting('rarityGlows', value)}
                  label="Rarity glow effects on cards"
                  description="Adds rarity-colored glow styling to perks, addons, items, and offerings."
                />
              </td></tr>
              <tr><th scope="row">Haptic feedback</th><td>
                <SettingsToggleRow
                  checked={settings.hapticEnabled !== false}
                  onChange={(value) => updateSetting('hapticEnabled', value)}
                  label="Haptic feedback"
                  description="Use short vibration feedback on supported mobile devices."
                />
              </td></tr>
              <tr><th scope="row">Owned Only global filter</th><td>
                <SettingsToggleRow
                  checked={settings.ownedOnlyGlobal === true}
                  onChange={(value) => updateSetting('ownedOnlyGlobal', value)}
                  label="Owned Only global filter"
                  description="Filters supported views and randomizers to the characters and perks you own."
                />
              </td></tr>
            </tbody></table>
            <h2 className="cx-sec">Perk descriptions</h2>
            <table className="cx-wikitable"><tbody>
              <tr><th scope="row">Wording</th><td>
                <p className="text-sm text-zinc-400 mb-2">Choose which perk wording the website should show when both legacy and post-9.5.0 text are available.</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'legacy', label: 'Legacy', description: 'Keep the original one-block descriptions already stored in the wiki.' },
                    { id: 'post95', label: 'Post-9.5.0', description: 'Use the newer multiline wording and highlight percentage values when available.' }
                  ].map(option => (
                    <button
                      key={option.id}
                      onClick={() => updateSetting('perkDescriptionMode', option.id)}
                      className={`p-3 rounded-2xl border text-left transition-all ${settings.perkDescriptionMode === option.id ? 'bg-white/10 text-white' : 'bg-white/5 text-zinc-300 hover:border-white/20'}`}
                      style={settings.perkDescriptionMode === option.id ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}}
                    >
                      <p className="text-sm font-bold">{option.label}</p>
                      <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">{option.description}</p>
                    </button>
                  ))}
                </div>
              </td></tr>
            </tbody></table>
            <h2 className="cx-sec">Favorites</h2>
            <table className="cx-wikitable"><tbody>
              {[
                { key: 'favoritePerks', label: 'Perks' },
                { key: 'favoriteKillers', label: 'Killers' },
                { key: 'favoriteSurvivors', label: 'Survivors' },
                { key: 'favoriteItems', label: 'Items' },
                { key: 'favoriteAddons', label: 'Addons' },
                { key: 'favoriteOfferings', label: 'Offerings' }
              ].map(entry => (
                <tr key={entry.key}><th scope="row">{entry.label} ({favoriteCounts[entry.key]})</th><td>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-zinc-300">{favoriteCounts[entry.key]} saved</span>
                    <button type="button" onClick={() => updateSetting(entry.key, [])} disabled={favoriteCounts[entry.key] === 0} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">Clear</button>
                  </div>
                </td></tr>
              ))}
            </tbody></table>
            <h2 className="cx-sec">Data backup</h2>
            <table className="cx-wikitable"><tbody>
              <tr><th scope="row">Summary</th><td>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-white">Data Backup</h3>
                    <p className="text-sm text-zinc-400 mt-1">Export the full local website state or restore it later. Restores replace your current local data.</p>
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] uppercase tracking-wider text-zinc-400">
                    Backup
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { label: 'Builds', value: backupSummary?.builds || 0 },
                    { label: 'Matches', value: backupSummary?.matches || 0 },
                    { label: 'Notes', value: backupSummary?.notes || 0 },
                    { label: 'Owned', value: backupSummary?.ownedCharacters || 0 },
                    { label: 'Challenges', value: backupSummary?.challenges || 0 },
                    { label: 'Wordle Games', value: backupSummary?.worldleGamesPlayed || 0 }
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-bold">{item.label}</p>
                      <p className="text-lg font-bold text-white mt-2">{item.value}</p>
                    </div>
                  ))}
                </div>
              </td></tr>
              <tr><th scope="row">Export</th><td>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={onCopyBackup}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <Icons.Copy width={16} height={16} />
                    <span className="text-sm font-semibold">Copy Backup Text</span>
                  </button>
                  <button
                    onClick={onDownloadBackup}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <Icons.Import width={16} height={16} className="rotate-180" />
                    <span className="text-sm font-semibold">Download Backup File</span>
                  </button>
                  <button
                    onClick={() => backupFileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <Icons.Import width={16} height={16} />
                    <span className="text-sm font-semibold">Load Backup File</span>
                  </button>
                </div>
                <input
                  ref={backupFileInputRef}
                  type="file"
                  accept=".json,application/json,text/json"
                  className="hidden"
                  onChange={handleBackupFileChange}
                />
              </td></tr>
              <tr><th scope="row">Restore from Backup</th><td>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500 font-bold">Restore from Backup</p>
                    {(restorePreview?.meta?.siteVersion || restorePreview?.meta?.appVersion) && (
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                        backup from v{restorePreview.meta.siteVersion || restorePreview.meta.appVersion}
                      </span>
                    )}
                  </div>
                  <textarea
                    value={backupDraft}
                    onChange={(event) => refreshBackupPreview(event.target.value)}
                    rows={7}
                    placeholder="Paste a full backup here..."
                    className="w-full bg-zinc-800/60 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 font-mono"
                  />
                  {backupError && (
                    <div className="rounded-2xl border border-white/25/20 bg-zinc-500/10 px-4 py-3 text-sm text-zinc-300">
                      {backupError}
                    </div>
                  )}
                  {backupPreview?.summary && !backupError && (
                    <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] uppercase tracking-wider text-zinc-300">
                          Backup format {backupPreview.summary.schemaVersion || 0}
                        </span>
                        {backupPreview.summary.exportedAt && (
                          <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] uppercase tracking-wider text-zinc-500">
                            {new Date(backupPreview.summary.exportedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          { label: 'Builds', value: backupPreview.summary.builds },
                          { label: 'Matches', value: backupPreview.summary.matches },
                          { label: 'Notes', value: backupPreview.summary.notes },
                          { label: 'Owned', value: backupPreview.summary.ownedCharacters },
                          { label: 'Challenges', value: backupPreview.summary.challenges },
                          { label: 'Wordle Games', value: backupPreview.summary.worldleGamesPlayed }
                        ].map((item) => (
                          <div key={item.label} className="rounded-xl border border-white/8 bg-white/5 px-3 py-2">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-bold">{item.label}</p>
                            <p className="text-sm font-bold text-white mt-1">{item.value}</p>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          if (!restorePreview) return;
                          const confirmed = window.confirm('Restore this backup and replace your current local data? This cannot be undone unless you export your current state first.');
                          if (!confirmed) return;
                          onRestoreBackup(restorePreview);
                          setBackupDraft('');
                          setBackupPreview(null);
                          setBackupError('');
                          alert('Backup restored.');
                        }}
                        className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-colors"
                      >
                        Restore Backup
                      </button>
                    </div>
                  )}
                </div>
              </td></tr>
            </tbody></table>
            <h2 className="cx-sec">Reset</h2>
            <table className="cx-wikitable"><tbody>
              <tr><th scope="row">Defaults</th><td>
                <p className="text-sm text-zinc-400 mb-2">Restore every website preference to its default value. Builds, matches, progression, and backups are not touched.</p>
                <button type="button" onClick={resetAllSettings} className="px-4 py-3 rounded-2xl bg-zinc-100 text-black font-bold text-sm">Reset all preferences</button>
              </td></tr>
            </tbody></table>
            <h2 className="cx-sec">About</h2>
            <table className="cx-wikitable"><tbody>
              <tr><th scope="row">Special Thanks</th><td>
                <ul className="text-sm text-zinc-400 space-y-1">
                  {META.thanks.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-zinc-100">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </td></tr>
              <tr><th scope="row">Disclaimer</th><td>
                <p className="text-sm text-zinc-400">This website is a work in progress. Core features are stable, but some rough edges may remain while it continues to improve. Not official; I do not own any of the logos or licences, just built with love for the game.</p>
              </td></tr>
              <tr><th scope="row">Contact</th><td>
                <div className="space-y-1 text-sm text-zinc-300">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 uppercase text-[10px] font-bold tracking-wide">Email</span>
                    <a
                      href={`mailto:${META.contact?.email || ''}`}
                      className="font-semibold text-white hover:underline"
                    >
                      {META.contact?.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 uppercase text-[10px] font-bold tracking-wide">Discord</span>
                    <span className="font-semibold text-white">{META.contact?.discord || 'Coming soon'}</span>
                  </div>
                </div>
              </td></tr>
            </tbody></table>
          </div>
        </div>
      );
    };
    const PrestigeCalculatorView = ({ onBack }) => {
      const [currentPrestige, setCurrentPrestige] = useState(0);
      const [currentLevel, setCurrentLevel] = useState(1);
      const [targetPrestige, setTargetPrestige] = useState(100);
      const [efficiency, setEfficiency] = useState('average');
      const [bpPerMatch, setBpPerMatch] = useState(30000);
      const [matchLength, setMatchLength] = useState(12);
      const [animatedBP, setAnimatedBP] = useState(0);
      const PRESTIGE_COSTS = {
        efficient: 850000,
        average: 1050000,
        completionist: 1500000
      };
      const costPerPrestige = PRESTIGE_COSTS[efficiency];
      const prestigesNeeded = Math.max(0, targetPrestige - currentPrestige);
      // Calculate how much BP already spent on current prestige (rough estimate: level/50 of cost)
      const levelProgress = Math.max(0, Math.min(50, currentLevel - 1)) / 50;
      const bpAlreadySpent = levelProgress * costPerPrestige;
      const totalBPNeeded = Math.max(0, (prestigesNeeded * costPerPrestige) - bpAlreadySpent);
      const matchesNeeded = Math.ceil(totalBPNeeded / bpPerMatch);
      const hoursNeeded = (matchesNeeded * matchLength) / 60;
      const progressPercent = targetPrestige > 0 ? Math.min(100, ((currentPrestige + levelProgress) / targetPrestige) * 100) : 0;
      useEffect(() => {
        const duration = 1000;
        const startTime = performance.now();
        const startValue = animatedBP;
        const endValue = totalBPNeeded;
        const animate = (currentTime) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setAnimatedBP(Math.floor(startValue + (endValue - startValue) * eased));
          if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
      }, [totalBPNeeded]);
      const getEntityQuote = () => {
        if (prestigesNeeded === 0) return "Your offering is complete...";
        if (prestigesNeeded <= 5) return "A modest offering...";
        if (prestigesNeeded <= 20) return "The Entity stirs...";
        if (prestigesNeeded <= 50) return "The Entity hungers...";
        return "An endless feast awaits...";
      };
      const formatNumber = (num) => {
        return num.toLocaleString();
      };
      return (
        <div className="h-full pt-6 pb-32 overflow-y-auto custom-scrollbar">
          <div className="relative px-6 max-w-2xl md:max-w-5xl mx-auto">
            <div className="fog-layer fixed inset-0 pointer-events-none z-0" style={{
            }} />
            <div className="relative z-10">
              <ViewCrumbs trail={[{ label: 'Main page', onClick: onBack }]} current="The Entity's Offering" />
              <h1 className="cx-title">The Entity's Offering</h1>
              <p className="cx-hatnote">Bloodpoint calculator for prestige goals.</p>
              <p className="text-zinc-100/80 text-sm italic font-medium tracking-wide text-center mb-4">{getEntityQuote()}</p>
              <h2 className="cx-sec">Prestige inputs</h2>
              <table className="cx-wikitable"><tbody>
                <tr><th scope="row">Prestige</th><td>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={currentPrestige}
                    onChange={e => setCurrentPrestige(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                    onBlur={e => setCurrentPrestige(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="cx-numinput w-full py-3 text-2xl font-bold"
                  />
                </td></tr>
                <tr><th scope="row">Level</th><td>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={currentLevel}
                    onChange={e => setCurrentLevel(e.target.value === '' ? '' : parseInt(e.target.value) || 1)}
                    onBlur={e => setCurrentLevel(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="cx-numinput w-full py-2"
                  />
                </td></tr>
                <tr><th scope="row">Target</th><td>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={targetPrestige}
                    onChange={e => setTargetPrestige(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                    onBlur={e => setTargetPrestige(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="cx-numinput w-full py-3 text-2xl font-bold"
                  />
                </td></tr>
                <tr><th scope="row">Progress</th><td>
                  <div className="flex justify-between text-xs text-zinc-500 mb-2">
                    <span>Progress</span>
                    <span>{progressPercent.toFixed(0)}%</span>
                  </div>
                  <div className="cx-meter">
                    <div style={{ width: `${progressPercent}%` }} />
                  </div>
                </td></tr>
              </tbody></table>
              <h2 className="cx-sec">Bloodpoints required</h2>
              <table className="cx-wikitable"><tbody>
                <tr><th scope="row">Bloodpoints Required</th><td>
                  <div className="text-center">
                    <div className="blood-text text-5xl sm:text-6xl font-black mb-2" style={{ letterSpacing: '-0.02em', color: 'var(--text)' }}>
                      {formatNumber(animatedBP)}
                    </div>
                    <div className="text-zinc-500 text-sm">
                      {prestigesNeeded} prestige{prestigesNeeded !== 1 ? 's' : ''} × {formatNumber(costPerPrestige)} BP
                    </div>
                  </div>
                </td></tr>
                <tr><th scope="row">Prestiges</th><td className="text-center"><div className="text-2xl font-bold text-white">{prestigesNeeded}</div></td></tr>
                <tr><th scope="row">Matches</th><td className="text-center"><div className="text-2xl font-bold text-white">{formatNumber(matchesNeeded)}</div></td></tr>
                <tr><th scope="row">Hours</th><td className="text-center"><div className="text-2xl font-bold text-white">{hoursNeeded.toFixed(1)}</div></td></tr>
              </tbody></table>
              <h2 className="cx-sec">Settings</h2>
              <table className="cx-wikitable"><tbody>
                <tr><th scope="row">Bloodweb Mode</th><td>
                  <div className="flex gap-2">
                    {[
                      { id: 'efficient', label: 'Skip Level', desc: '~850k/P', sub: 'Skip Level Up', color: '#e4e4e7', bg: 'rgba(228,228,231,0.12)' },
                      { id: 'average', label: 'Auto Buy', desc: '~1.05M/P', sub: 'Auto Purchase', color: '#e4e4e7', bg: 'rgba(228,228,231,0.12)' },
                      { id: 'completionist', label: 'Manual', desc: '~1.5M/P', sub: 'Full Bloodweb', color: '#d4d4d8', bg: 'rgba(212,212,216,0.12)' },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setEfficiency(opt.id)}
                        className={`mode-choice ${efficiency === opt.id ? 'mode-choice--active' : ''} flex-1 py-2 px-2 text-xs font-bold`}
                        aria-pressed={efficiency === opt.id}
                      >
                        <div>{opt.label}</div>
                        <div className="text-[9px] opacity-60">{opt.desc}</div>
                        <div className="text-[8px] opacity-40 mt-0.5">{opt.sub}</div>
                      </button>
                    ))}
                  </div>
                </td></tr>
                <tr><th scope="row">BP per Match</th><td>
                  <input
                    type="number"
                    value={bpPerMatch}
                    onChange={e => setBpPerMatch(e.target.value === '' ? '' : parseInt(e.target.value) || 30000)}
                    onBlur={e => setBpPerMatch(Math.max(1000, parseInt(e.target.value) || 30000))}
                    className="cx-input w-full px-3 py-2 text-sm"
                  />
                </td></tr>
                <tr><th scope="row">Match Length (min)</th><td>
                  <input
                    type="number"
                    value={matchLength}
                    onChange={e => setMatchLength(e.target.value === '' ? '' : parseInt(e.target.value) || 12)}
                    onBlur={e => setMatchLength(Math.max(1, parseInt(e.target.value) || 12))}
                    className="cx-input w-full px-3 py-2 text-sm"
                  />
                </td></tr>
                <tr><th scope="row">Milestones</th><td>
                  <div className="text-center text-[10px] text-zinc-500 leading-relaxed">
                    <span className="text-zinc-500">P1-3</span> Universal teachables (T1→T2→T3) • <span className="text-zinc-500">P4-6</span> Bloody cosmetics • <span className="text-zinc-500">P7-9</span> Perk charms • <span className="text-zinc-500">P25/50/75/100</span> Character badge reward tiers
                  </div>
                </td></tr>
              </tbody></table>
            </div>
          </div>
        </div>
      );
    };
    // Shared popup shell. Portalled above site chrome, with contained focus.
    const WikiDialog = ({ title, eyebrow, subtitle, onClose, children, footer, className = '' }) => {
      const panelRef = useRef(null);
      const closeRef = useRef(onClose);
      closeRef.current = onClose;
      const titleId = React.useId();
      useEffect(() => {
        const previous = document.activeElement;
        const shell = document.querySelector('.site-shell');
        const wasInert = shell?.inert;
        if (shell) shell.inert = true;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const panel = panelRef.current;
        panel?.querySelector('[data-dialog-close]')?.focus();
        const handleKey = event => {
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeRef.current?.(); }
          if (event.key !== 'Tab') return;
          const stops = [...(panel?.querySelectorAll('button:not([disabled]), a[href], textarea, input, select, [tabindex="0"]') || [])].filter(node => node.getClientRects().length && !node.closest('[hidden]'));
          const first = stops[0], last = stops[stops.length - 1];
          if (!first) { event.preventDefault(); panel?.focus(); return; }
          if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
        };
        document.addEventListener('keydown', handleKey, true);
        return () => {
          document.removeEventListener('keydown', handleKey, true);
          if (shell) shell.inert = wasInert;
          document.body.style.overflow = previousOverflow;
          if (previous?.isConnected) previous.focus({ preventScroll: true });
        };
      }, []);
      return ReactDOM.createPortal(
        <div className="cx-dialog-backdrop" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
          <section ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className={`cx-dialog ${className}`} data-no-swipe>
            <header className="cx-dialog-head">
              <div className="cx-dialog-heading">
                {eyebrow && <p className="cx-dialog-eyebrow">{eyebrow}</p>}
                <h2 id={titleId}>{title}</h2>
                {subtitle && <p className="cx-dialog-subtitle">{subtitle}</p>}
              </div>
              <button type="button" className="cx-dialog-close" onClick={onClose} data-dialog-close aria-label={`Close ${title}`}><Icons.X width={20} height={20} /></button>
            </header>
            <div className="cx-dialog-body">{children}</div>
            {footer && <footer className="cx-dialog-footer">{footer}</footer>}
          </section>
        </div>, document.body
      );
    };
    const GameIconsView = ({ onBack, theme }) => {
      const scrollRef = useRef(null);
      const [search, setSearch] = useState('');
      const [filter, setFilter] = useState('All');
      const [expandedId, setExpandedId] = useState(null);
      const [viewMode, setViewMode] = useState('glossary'); // 'glossary' | 'grid'
      const [flashcardIcon, setFlashcardIcon] = useState(null);
      const filters = ['All', 'Health', 'Buff', 'Debuff', 'Killer', 'Proficiency', 'Activity'];
      const categoryLabels = { health: 'Health State', buff: 'Buff', debuff: 'Debuff', killer: 'Killer Power', proficiency: 'Proficiency', activity: 'Activity' };

      const filteredIcons = useMemo(() => GAME_ICONS.filter(icon => {
        const matchesSearch = icon.name.toLowerCase().includes(search.toLowerCase()) ||
          icon.description.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === 'All' ||
          (filter === 'Health' && icon.category === 'health') ||
          (filter === 'Buff' && icon.category === 'buff') ||
          (filter === 'Debuff' && icon.category === 'debuff') ||
          (filter === 'Killer' && icon.category === 'killer') ||
          (filter === 'Proficiency' && icon.category === 'proficiency') ||
          (filter === 'Activity' && icon.category === 'activity');
        return matchesSearch && matchesFilter;
      }), [search, filter]);


      // Quick-reference tips for Trial Grid flashcards
      const getQuickTip = (icon) => {
        if (icon.tip) return icon.tip;
        const tips = {
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
          activity_invocation: 'Survivor is performing an Invocation in the basement.',
        };
        return tips[icon.id] || icon.description;
      };

      return (
        <div ref={scrollRef} className="h-full overflow-y-auto custom-scrollbar">
          <article className="cx-article cx-icons-page">
            <ViewCrumbs trail={[{ label: 'Main page', onClick: onBack }]} current="Game icons" />
            <h1 className="cx-title">Game icons</h1>
            <p className="cx-hatnote">A reference to health states, status effects and the Trial HUD.</p>
            <WikiHeaderSearchPortal><div className="cx-icon-search"><Icons.Search width={16} height={16} /><input aria-label="Search game icons" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search icons and descriptions..." />{search && <button type="button" onClick={() => setSearch('')} aria-label="Clear icon search"><Icons.X width={16} height={16} /></button>}</div></WikiHeaderSearchPortal>
            <div className="cx-icons-tools">
              <div className="cx-reference-tabs" role="group" aria-label="Icon display"><button type="button" aria-pressed={viewMode === 'glossary'} onClick={() => setViewMode('glossary')}>Reference list</button><button type="button" aria-pressed={viewMode === 'grid'} onClick={() => setViewMode('grid')}>Icon grid</button></div>
              <span aria-live="polite">{filteredIcons.length} {filteredIcons.length === 1 ? 'icon' : 'icons'}</span>
            </div>
            <div className="cx-icons-reference">
              <nav className="cx-icon-categories" aria-label="Icon categories"><p>Contents</p>{filters.map(label => {
                const category = label.toLowerCase();
                const count = label === 'All' ? GAME_ICONS.length : GAME_ICONS.filter(icon => icon.category === category).length;
                return <button type="button" key={label} aria-pressed={filter === label} onClick={() => { setFilter(label); setExpandedId(null); }}><span>{label === 'All' ? 'All icons' : categoryLabels[category]}</span><span>{count}</span></button>;
              })}</nav>
              <div className="cx-icons-results">
                {filteredIcons.length === 0 ? <div className="cx-reference-empty"><Icons.Search width={30} height={30} /><h2>No icons found</h2><p>Try another name or description, or reset the category.</p><button type="button" className="cx-alink" onClick={() => { setSearch(''); setFilter('All'); }}>Reset filters</button></div> : filters.slice(1).map(label => {
                  const group = filteredIcons.filter(icon => icon.category === label.toLowerCase());
                  if (!group.length) return null;
                  return <section key={label} className="cx-icon-section"><h2 className="cx-sec">{categoryLabels[label.toLowerCase()]}<span className="cx-reference-count">{group.length}</span></h2>
                    {viewMode === 'grid' ? <div className="cx-icon-grid">{group.map(icon => <button type="button" key={icon.id} className="cx-icon-tile" onClick={() => setFlashcardIcon(icon)} aria-label={`Open ${icon.name}`}><span className="cx-icon-art"><AssetFrame type="GameIcon" size="fill" imageUrl={icon.icon} fallbackIcon={<Icons.Zap width={28} height={28} />} /></span><span>{icon.name}</span></button>)}</div> : <div className="cx-icon-list">{group.map(icon => {
                      const expanded = expandedId === icon.id;
                      return <div className="cx-icon-entry" key={icon.id}><button type="button" className="cx-icon-summary" aria-expanded={expanded} aria-controls={`icon-detail-${icon.id}`} onClick={() => setExpandedId(expanded ? null : icon.id)}><span className="cx-icon-art"><AssetFrame type="GameIcon" size="fill" imageUrl={icon.icon} fallbackIcon={<Icons.Zap width={24} height={24} />} /></span><span className="cx-icon-summary-copy"><span className="cx-icon-name">{icon.name}</span><span className="cx-icon-excerpt">{icon.description}</span></span><span className="cx-icon-expand" aria-hidden="true">{expanded ? '−' : '+'}</span></button><div id={`icon-detail-${icon.id}`} hidden={!expanded} className="cx-icon-detail"><p>{icon.description}</p><h3>In the Trial</h3><p>{getQuickTip(icon)}</p></div></div>;
                    })}</div>}
                  </section>;
                })}
              </div>
            </div>
          </article>
          {flashcardIcon && <WikiDialog title={flashcardIcon.name} eyebrow={categoryLabels[flashcardIcon.category]} onClose={() => setFlashcardIcon(null)} className="cx-dialog--icon" footer={<><span>Game icon reference</span><button type="button" className="cx-toolbtn" onClick={() => setFlashcardIcon(null)}>Close reference</button></>}><div className="cx-icon-dialog-art"><AssetFrame type="GameIcon" size="fill" imageUrl={flashcardIcon.icon} fallbackIcon={<Icons.Zap width={48} height={48} />} /></div><section className="cx-icon-dialog-copy"><h3 className="cx-sec">What it means</h3><p>{flashcardIcon.description}</p><h3 className="cx-sec">In the Trial</h3><p>{getQuickTip(flashcardIcon)}</p></section></WikiDialog>}
        </div>
      );
    };
    const FloatingCompareBadge = ({ count, onClick, onClear }) => {
      if (!count) return null;
      return <div className="cx-compare-bar" role="region" aria-label="Selected perks"><button type="button" onClick={onClick}><Icons.BookOpen width={16} height={16} /><span aria-live="polite">Compare ({count}/4)</span></button><button type="button" onClick={onClear} aria-label="Clear comparison"><Icons.X width={16} height={16} /></button></div>;
    };
    const MapLayoutModal = ({ map, onClose, noteValue = '', onNoteChange }) => {
      const [currentIndex, setCurrentIndex] = useState(0);
      const [layoutBroken, setLayoutBroken] = useState(false);
      const [zoom, setZoom] = useState(1);
      const stageRef = useRef(null);
      useEffect(() => { setCurrentIndex(0); setZoom(1); setLayoutBroken(false); }, [map?.id]);
      useEffect(() => { setLayoutBroken(false); setZoom(1); stageRef.current?.scrollTo(0, 0); }, [currentIndex]);
      if (!map) return null;
      const layouts = getMapLayoutsForName(map.name);
      const selected = layouts[currentIndex] || layouts[0];
      const variation = selected?.label || (layouts.length > 1 ? `Layout ${currentIndex + 1}` : 'Map layout');
      return (
        <WikiDialog title={map.name} eyebrow="Map reference" subtitle={map.realm} onClose={onClose} className="cx-dialog--map" footer={
          <><span>{layouts.length} {layouts.length === 1 ? 'layout' : 'layouts'} available</span><button type="button" className="cx-toolbtn" onClick={onClose}>Close map</button></>
        }>
          <div className="cx-map-reference">
            <section className="cx-map-visual" aria-label="Layout viewer">
              <div className="cx-map-toolbar">
                <p aria-live="polite">{variation}</p>
                <div className="cx-map-zoom" role="group" aria-label="Layout zoom">
                  <button type="button" aria-label="Zoom out" disabled={zoom <= 1 || layoutBroken || !selected} onClick={() => setZoom(value => Math.max(1, value - .5))}>−</button>
                  <button type="button" disabled={!selected || layoutBroken} onClick={() => { setZoom(1); stageRef.current?.scrollTo(0, 0); }} aria-label="Fit layout">{zoom === 1 ? 'Fit' : `${Math.round(zoom * 100)}%`}</button>
                  <button type="button" aria-label="Zoom in" disabled={zoom >= 3 || layoutBroken || !selected} onClick={() => setZoom(value => Math.min(3, value + .5))}>+</button>
                </div>
              </div>
              <div ref={stageRef} className={`cx-map-stage ${zoom > 1 ? 'cx-map-stage--zoomed' : ''}`} tabIndex={0} aria-label={`${map.name} layout, scroll to inspect when zoomed`}>
                {selected && !layoutBroken ? <img key={selected.path} src={`./dbd_images/${selected.path}`} alt={`${map.name}: ${variation}`} style={{ width: `${zoom * 100}%`, maxWidth: 'none' }} onError={() => setLayoutBroken(true)} /> : <div className="cx-reference-empty"><Icons.Map width={32} height={32} /><p>{selected ? 'This layout could not load.' : 'No layout is available for this map.'}</p>{selected && <button className="cx-alink" type="button" onClick={() => setLayoutBroken(false)}>Try again</button>}</div>}
              </div>
              {layouts.length > 1 && <div className="cx-reference-tabs cx-map-variations" role="group" aria-label="Map layout variations">{layouts.map((layout, index) => <button type="button" key={layout.path} aria-pressed={index === currentIndex} onClick={() => setCurrentIndex(index)}>{layout.label || `Layout ${index + 1}`}</button>)}</div>}
              <p className="cx-reference-caption">{zoom > 1 ? 'Scroll the layout to inspect it. Select Fit to reset.' : 'Select a variation or zoom in to inspect tiles and callouts.'}</p>
            </section>
            <aside className="cx-map-sidebar">
              <h3 className="cx-sec">Overview</h3>
              <p>{map.description || 'No description is available for this map yet.'}</p>
              <dl className="cx-reference-facts"><div><dt>Realm</dt><dd>{map.realm}</dd></div></dl>
              <section className="cx-map-notes"><h3 className="cx-sec"><label htmlFor="map-reference-notes">Personal notes</label></h3><textarea id="map-reference-notes" rows={5} value={noteValue} onChange={event => onNoteChange?.(event.target.value)} placeholder="Loops, spawns, tiles and callouts..." /><p className="cx-reference-caption">Saved on this device.</p></section>
            </aside>
          </div>
        </WikiDialog>
      );
    };
    const PerkCompareModal = ({ perks, onClose, onRemove, theme, settings = {} }) => {
      if (!perks?.length) return null;
      return <WikiDialog title="Compare perks" eyebrow="Perk reference" subtitle={`${perks.length} of 4 comparison slots used`} onClose={onClose} className="cx-dialog--compare" footer={<><span>Remove a perk to free a slot.</span><button type="button" className="cx-toolbtn" onClick={onClose}>Close comparison</button></>}>
        <p className="cx-compare-hint">Swipe sideways to compare perks.</p><div className="cx-compare-grid" style={{ '--compare-columns': perks.length }}>{perks.map(perk => <section className="cx-compare-entry" key={perk.id}>
          <div className="cx-compare-entry-head"><span>{perk.type || 'Perk'}</span><button type="button" aria-label={`Remove ${perk.name}`} onClick={() => onRemove(perk)}><Icons.X width={16} height={16} /></button></div>
          <div className="cx-compare-image"><AssetFrame type="Perk" size="fill" imageUrl={perk.image} /></div><h3>{perk.name}</h3><p>{perk.owner || 'Universal'}</p>
          <PerkDescriptionBlock perk={perk} settings={settings} accentColor="var(--link)" className="cx-compare-description" lineClassName="leading-relaxed" />
        </section>)}</div>
      </WikiDialog>;
    };
    /* Moved to ./engine/shell.js (wiki engine bundle, loaded above). */
    /* ===== Codex shared components ===== */
    /* Codex article components: pure presentational units, no data loading, no routing. */
    /* Contract: ArticleShell composes the units below. Pass hatnote as a Hatnote node, */
    /* meta as a MetaLine node, lead as paragraph nodes, toc as a Toc items array, */
    /* infobox as an Infobox props object, categories as a CategoryBar array. */
    /* Section pattern for children: section with id, h2.cx-sec with label plus */
    /* button.cx-edit, anchors as plain href="#id" links. */
    /* Moved to ./engine/articles.js (wiki engine bundle, loaded above). */
    /* Moved to ./engine/articles.js (wiki engine bundle, loaded above). */
    /* Moved to ./engine/articles.js (wiki engine bundle, loaded above). */
    /* Moved to ./engine/articles.js (wiki engine bundle, loaded above). */
    const WikiTable = ({ caption, headers, rows }) => {
      return (
        <table className="cx-wikitable w-full">
          {caption ? <caption>{caption}</caption> : null}
          {headers && headers.length > 0 ? (
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th key={i} scope="col">{h}</th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  cell && typeof cell === "object" && cell.perk ? (
                    <td key={ci} className="cx-perkcell">{cell.node}</td>
                  ) : (
                    <td key={ci}>{cell}</td>
                  )
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    };
    /* Moved to ./engine/articles.js (wiki engine bundle, loaded above). */
    /* Moved to ./engine/articles.js (wiki engine bundle, loaded above). */

    const normRealmName = (v) => (v || '').trim().toLowerCase().replace(/^the\s+/, '');
    /* Moved to ./engine/articles.js (wiki engine bundle, loaded above). */
    /* Moved to ./engine/articles.js (wiki engine bundle, loaded above). */
    const CxSection = ({ id, view, setRef, title, children, collapsible = true }) => {
      const narrow = useNarrowTier();
      const storeKey = `cx-sec:${view}:${id}`;
      const [open, setOpen] = useState(() => {
        try {
          const saved = window.localStorage.getItem(storeKey);
          return saved === null ? true : saved === '1';
        } catch (e) { return true; }
      });
      useEffect(() => {
        const expand = (e) => { if (e && e.detail === id) setOpen(true); };
        window.addEventListener('cx-expand-section', expand);
        return () => window.removeEventListener('cx-expand-section', expand);
      }, [id]);
      const toggle = () => setOpen((prev) => {
        const next = !prev;
        try { window.localStorage.setItem(storeKey, next ? '1' : '0'); } catch (e) {}
        return next;
      });
      if (!narrow || !collapsible) {
        return (<section id={id} ref={setRef(id)}><h2 className="cx-sec">{title}</h2>{children}</section>);
      }
      return (
        <section id={id} ref={setRef(id)}>
          <h2
            className="cx-sec cx-sec--toggle"
            role="button"
            tabIndex={0}
            aria-expanded={open}
            onClick={toggle}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }}
          >
            <span className="cx-sec-title">{title}</span>
            <span className="cx-sec-ind" aria-hidden="true">{open ? '▾' : '▸'}</span>
          </h2>
          {open ? children : null}
        </section>
      );
    };
    const PerkArticleView = ({ perk, perks = [], killers = [], survivors = [], onHome, onOpenList, onOpenCharacter, onOpenPerk, noteValue = '', onNoteChange, settings = {}, scrollSection = null }) => {
      const scrollRef = useRef(null);
      const sectionEls = useRef({});
      const ownerChar = useMemo(() => {
        const all = [...(killers || []), ...(survivors || [])];
        return all.find(c => c.name === perk.owner) || null;
      }, [perk, killers, survivors]);
      const synergies = useMemo(() => {
        const names = (typeof PERK_SYNERGIES !== 'undefined' && PERK_SYNERGIES[perk.name]) || [];
        return names.map(n => ({ name: n, full: (perks || []).find(x => x.name === n) || null }));
      }, [perk, perks]);
      const isHex = (perk.name || '').startsWith('Hex:');
      const isExhaust = /exhaust/i.test(perk.description || '');
      const tags = [...(isHex ? ['Hex'] : []), ...(isExhaust ? ['Exhaustion'] : [])];
      const tocEntries = [
        { id: 'overview', label: 'Overview' },
        ...(synergies.length > 0 ? [{ id: 'synergies', label: 'Works Well With' }] : []),
        { id: 'notes', label: 'Notes' },
      ];
      const scrollToSection = (id) => {
        try { window.dispatchEvent(new CustomEvent('cx-expand-section', { detail: id })); } catch (e) {}
        window.setTimeout(() => {
          const node = sectionEls.current[id];
          if (node && node.scrollIntoView) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
      };
      const setSectionRef = (id) => (node) => {
        if (node) sectionEls.current[id] = node;
        else delete sectionEls.current[id];
      };
      useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
      }, [perk.id]);
      useEffect(() => {
        if (!scrollSection) return undefined;
        try { window.dispatchEvent(new CustomEvent('cx-expand-section', { detail: scrollSection })); } catch (e) {}
        const timer = window.setTimeout(() => {
          const node = sectionEls.current[scrollSection];
          if (node && node.scrollIntoView) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
        return () => window.clearTimeout(timer);
      }, [scrollSection, perk.id]);
      return (
        <div className="flex flex-col h-full overflow-y-auto custom-scrollbar" ref={scrollRef}>
          <div className="cx-article w-full max-w-[1280px] mx-auto min-h-full" data-smoke-profile={perk.id}>
            <ViewCrumbs
              trail={[{ label: 'Main page', onClick: onHome }, { label: 'Perks', onClick: onOpenList }]}
              current={perk.name}
            />
            <h1 className="cx-title">{perk.name}</h1>
            {ownerChar ? (
              <p className="cx-hatnote">For the owner of this perk, see <button type="button" className="cx-alink" onClick={() => onOpenCharacter && onOpenCharacter(ownerChar)}>{ownerChar.name}</button>.</p>
            ) : null}
            <div className="cx-leadgrid">
              <div className="cx-leadmain">
                <p><b>{perk.name}</b> is a {(perk.type || '').toLowerCase()} perk in <i>Dead by Daylight</i>{ownerChar ? <span> belonging to <button type="button" className="cx-alink" onClick={() => onOpenCharacter && onOpenCharacter(ownerChar)}>{perk.owner}</button></span> : <span> available to all Survivors</span>}.</p>
                <nav className="cx-toc" aria-label="Contents">
                  <p className="cx-toc-title">Contents</p>
                  <ol>
                    {tocEntries.map((entry) => (
                      <li key={entry.id}>
                        <button type="button" className="cx-alink" onClick={() => scrollToSection(entry.id)}>{entry.label}</button>
                      </li>
                    ))}
                  </ol>
                </nav>
              </div>
              <aside className="cx-infobox" aria-label={`${perk.name} infobox`}>
                <p className="cx-ib-title">{perk.name}</p>
                <p className="cx-ib-sub">{perk.type} Perk</p>
                <div className="cx-ib-media" style={{ width: '100%', aspectRatio: '1 / 1' }}>
                  <AssetFrame type="Perk" imageUrl={perk.image} size="fill" fallbackIcon={<Icons.BookOpen width={40} height={40} className="text-zinc-500" />} />
                </div>
                <table>
                  <tbody>
                    <tr><th>Owner</th><td>{ownerChar ? (
                      <button type="button" className="cx-alink" onClick={() => onOpenCharacter && onOpenCharacter(ownerChar)}>{perk.owner}</button>
                    ) : (perk.owner || 'Universal')}</td></tr>
                    <tr><th>Type</th><td>{perk.type}</td></tr>
                  </tbody>
                </table>
              </aside>
            </div>
            <CxSection id="overview" view="perk" setRef={setSectionRef} title="Overview" collapsible={false}>
              <PerkDescriptionBlock perk={perk} settings={settings} accentColor="var(--link)" />
            </CxSection>
            {synergies.length > 0 && (
              <CxSection id="synergies" view="perk" setRef={setSectionRef} title="Works Well With">
                <div className="flex flex-wrap gap-2">
                  {synergies.map((s) => s.full ? (
                    <button key={s.name} type="button" className="cx-chip text-xs font-semibold" style={{ cursor: 'pointer' }} onClick={() => onOpenPerk && onOpenPerk(s.full)}>{s.name}</button>
                  ) : (
                    <span key={s.name} className="cx-chip text-xs font-semibold">{s.name}</span>
                  ))}
                </div>
              </CxSection>
            )}
            <CxSection id="notes" view="perk" setRef={setSectionRef} title="Notes">
              <NotesEditor
                title="Perk Notes"
                value={noteValue}
                onChange={onNoteChange}
                placeholder="Matchups, builds, or reminders for this perk..."
              />
            </CxSection>
            <div className="cx-cats">
              <span>Categories:</span>
              <button type="button" className="cx-alink" onClick={onOpenList}>Perks</button>
              <span><span className="cx-sep"> · </span>{perk.type} Perks</span>
              {tags.map((t) => (
                <span key={t}><span className="cx-sep"> · </span>{t} Perks</span>
              ))}
            </div>
          </div>
        </div>
      );
    };

    const ReleaseArticleView = ({ release, releases = [], realms = [], maps = [], killers = [], survivors = [], onHome, onOpenList, onOpenCharacter, onOpenRelease, onOpenRealm, scrollSection = null }) => {
      const scrollRef = useRef(null);
      const sectionEls = useRef({});
      const norm = (v) => (v || '').trim().toLowerCase();
      const ordered = useMemo(() => [...(releases || [])].sort((a, b) => new Date(a.date) - new Date(b.date)), [releases]);
      const idx = ordered.findIndex(r => r.id === release.id);
      const prev = idx > 0 ? ordered[idx - 1] : null;
      const next = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : null;
      const killerRows = useMemo(() => (release.killers || []).map(k => ({
        entry: k, full: (killers || []).find(c => c.name === k.name) || null,
      })), [release, killers]);
      const survivorRows = useMemo(() => (release.survivors || []).map(sv => ({
        entry: sv, full: (survivors || []).find(c => c.name === sv.name) || null,
      })), [release, survivors]);
      const mapRows = useMemo(() => {
        const byMapName = new Map();
        (maps || []).forEach(mp => {
          const k = norm(mp.name);
          if (k && !byMapName.has(k)) byMapName.set(k, mp);
        });
        const realmByDbMapId = new Map();
        (realms || []).forEach(r => (r.maps || []).forEach(id => {
          if (!realmByDbMapId.has(id)) realmByDbMapId.set(id, r);
        }));
        return (release.maps || []).map(m => {
          let realm = (realms || []).find(r => normRealmName(r.name) === normRealmName(m.realm)) || null;
          if (!realm) {
            const hit = byMapName.get(norm(m.name));
            if (hit) realm = realmByDbMapId.get(hit.id) || (realms || []).find(r => normRealmName(r.name) === normRealmName(hit.realm)) || null;
          }
          return { entry: m, realm };
        });
      }, [release, realms, maps]);
      const typeLabel = release.type === 'base' ? 'Base game' : release.type === 'chapter' ? (release.chapterNumber ? `Chapter ${release.chapterNumber}` : 'Chapter') : 'Paragraph';
      const licensed = [...(release.killers || []), ...(release.survivors || [])].some(c => c.licensed === true);
      const charCount = killerRows.length + survivorRows.length;
      const year = String(release.date || '').slice(0, 4);
      const tocEntries = [
        { id: 'overview', label: 'Overview' },
        ...(killerRows.length > 0 ? [{ id: 'killers', label: killerRows.length > 1 ? 'New Killers' : 'New Killer' }] : []),
        ...(survivorRows.length > 0 ? [{ id: 'survivors', label: survivorRows.length > 1 ? 'New Survivors' : 'New Survivor' }] : []),
        ...(mapRows.length > 0 ? [{ id: 'maps', label: mapRows.length > 1 ? 'New Maps' : 'New Map' }] : []),
      ];
      const scrollToSection = (id) => {
        try { window.dispatchEvent(new CustomEvent('cx-expand-section', { detail: id })); } catch (e) {}
        window.setTimeout(() => {
          const node = sectionEls.current[id];
          if (node && node.scrollIntoView) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
      };
      const setSectionRef = (id) => (node) => {
        if (node) sectionEls.current[id] = node;
        else delete sectionEls.current[id];
      };
      useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
      }, [release.id]);
      useEffect(() => {
        if (!scrollSection) return undefined;
        try { window.dispatchEvent(new CustomEvent('cx-expand-section', { detail: scrollSection })); } catch (e) {}
        const timer = window.setTimeout(() => {
          const node = sectionEls.current[scrollSection];
          if (node && node.scrollIntoView) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
        return () => window.clearTimeout(timer);
      }, [scrollSection, release.id]);
      const renderCharTable = (rows) => (
        <table className="cx-wikitable">
          <thead><tr><th style={{ width: '220px' }}>Character</th><th>How they entered the Fog</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.entry.name}>
                <td>
                  <div className="flex items-center gap-3">
                    {row.full && row.full.image ? (
                      <div style={{ width: 44, height: 44, overflow: 'hidden', flexShrink: 0 }}>
                        <img src={`./${row.full.image}`} alt={row.entry.name} className="w-full h-full" style={{ objectFit: 'cover' }} loading="lazy" />
                      </div>
                    ) : null}
                    <div>
                      {row.full ? (
                        <button type="button" className="cx-alink font-semibold" onClick={() => onOpenCharacter && onOpenCharacter(row.full)}>{row.entry.name}</button>
                      ) : (
                        <span className="font-semibold">{row.entry.name}</span>
                      )}
                      {row.entry.realName ? <small style={{ display: 'block', color: 'var(--text-faint)', fontSize: '11px' }}>{row.entry.realName}</small> : null}
                      {row.entry.licensed === true ? <small style={{ display: 'block', color: 'var(--text-faint)', fontSize: '11px' }}>Licensed</small> : null}
                    </div>
                  </div>
                </td>
                <td style={{ color: 'var(--text-soft)' }}>{row.entry.fogEntry || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
      return (
        <div className="flex flex-col h-full overflow-y-auto custom-scrollbar" ref={scrollRef}>
          <div className="cx-article w-full max-w-[1280px] mx-auto min-h-full" data-smoke-profile={release.id}>
            <ViewCrumbs
              trail={[{ label: 'Main page', onClick: onHome }, { label: 'Chronicle', onClick: onOpenList }]}
              current={release.name}
            />
            <h1 className="cx-title">{release.name}</h1>
            <p className="cx-hatnote">{typeLabel} released {release.displayDate}. See also the full <button type="button" className="cx-alink" onClick={onOpenList}>Chronicle</button>.</p>
            <div className="cx-leadgrid">
              <div className="cx-leadmain">
                <p><b>{release.name}</b> is {release.type === 'base' ? 'the' : 'a'} {typeLabel.toLowerCase()} of <i>Dead by Daylight</i> released on <b>{release.displayDate}</b>, adding <b>{charCount} character{charCount === 1 ? '' : 's'}</b>{mapRows.length > 0 ? <span> and <b>{mapRows.length} map{mapRows.length === 1 ? '' : 's'}</b></span> : null}.</p>
                {release.description ? <p>{release.description}</p> : null}
                <nav className="cx-toc" aria-label="Contents">
                  <p className="cx-toc-title">Contents</p>
                  <ol>
                    {tocEntries.map((entry) => (
                      <li key={entry.id}>
                        <button type="button" className="cx-alink" onClick={() => scrollToSection(entry.id)}>{entry.label}</button>
                      </li>
                    ))}
                  </ol>
                </nav>
              </div>
              <aside className="cx-infobox" aria-label={`${release.name} infobox`}>
                <p className="cx-ib-title">{release.name}</p>
                <p className="cx-ib-sub">{typeLabel}</p>
                <table>
                  <tbody>
                    <tr><th>Released</th><td>{release.displayDate}</td></tr>
                    <tr><th>Licensed</th><td>{licensed ? 'Yes' : 'No'}</td></tr>
                    <tr><th>Killers</th><td>{killerRows.length}</td></tr>
                    <tr><th>Survivors</th><td>{survivorRows.length}</td></tr>
                    <tr><th>Maps</th><td>{mapRows.length}</td></tr>
                  </tbody>
                </table>
              </aside>
            </div>
            <CxSection id="overview" view="release" setRef={setSectionRef} title="Overview" collapsible={false}>
              <p>{release.description || `${release.name} was released on ${release.displayDate}.`}</p>
            </CxSection>
            {killerRows.length > 0 && (
              <CxSection id="killers" view="release" setRef={setSectionRef} title={killerRows.length > 1 ? 'New Killers' : 'New Killer'}>
                {renderCharTable(killerRows)}
              </CxSection>
            )}
            {survivorRows.length > 0 && (
              <CxSection id="survivors" view="release" setRef={setSectionRef} title={survivorRows.length > 1 ? 'New Survivors' : 'New Survivor'}>
                {renderCharTable(survivorRows)}
              </CxSection>
            )}
            {mapRows.length > 0 && (
              <CxSection id="maps" view="release" setRef={setSectionRef} title={mapRows.length > 1 ? 'New Maps' : 'New Map'}>
                <table className="cx-wikitable">
                  <thead><tr><th style={{ width: '220px' }}>Map</th><th>Realm</th></tr></thead>
                  <tbody>
                    {mapRows.map((row) => (
                      <tr key={`${row.entry.name}-${row.entry.realm}`}>
                        <td><span className="font-semibold">{row.entry.name}</span></td>
                        <td>{row.realm && onOpenRealm ? (
                          <button type="button" className="cx-alink" onClick={() => onOpenRealm(row.realm)}>{row.entry.realm}</button>
                        ) : (
                          <span>{row.entry.realm}</span>
                        )}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CxSection>
            )}
            <div className="flex justify-between gap-2 mt-6">
              {prev ? <button type="button" className="cx-alink" onClick={() => onOpenRelease && onOpenRelease(prev)}>← {prev.name}</button> : <span />}
              {next ? <button type="button" className="cx-alink" onClick={() => onOpenRelease && onOpenRelease(next)}>{next.name} →</button> : <span />}
            </div>
            <div className="cx-cats">
              <span>Categories:</span>
              <button type="button" className="cx-alink" onClick={onOpenList}>Chronicle</button>
              {/^\d{4}$/.test(year) ? <span><span className="cx-sep"> · </span>{year} releases</span> : null}
              <span><span className="cx-sep"> · </span>{release.type === 'base' ? 'Base game' : release.type === 'chapter' ? 'Chapters' : 'Paragraphs'}</span>
              {licensed ? <span><span className="cx-sep"> · </span>Licensed releases</span> : <span><span className="cx-sep"> · </span>Original releases</span>}
            </div>
          </div>
        </div>
      );
    };

    const RealmArticleView = ({ realm, maps = [], killers = [], survivors = [], releases = [], onHome, onOpenList, onOpenTimeline, onOpenRelease, onOpenCharacter, onViewLayout, noteValue = '', onNoteChange, scrollSection = null }) => {
      const scrollRef = useRef(null);
      const sectionEls = useRef({});
      const norm = (v) => (v || '').trim().toLowerCase();
      const mapsById = useMemo(() => {
        const lookup = new Map();
        (maps || []).forEach(mp => {
          if (mp && mp.id && !lookup.has(mp.id)) lookup.set(mp.id, mp);
        });
        return lookup;
      }, [maps]);
      const realmMaps = useMemo(() => {
        const seen = new Set();
        return ((realm.maps || []).map(id => mapsById.get(id)).filter(Boolean)).filter(mp => {
          const key = norm(mp.name);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }, [realm, mapsById]);
      const matchedReleases = useMemo(() => {
        const realmMapNames = new Set(realmMaps.map(rm => norm(rm.name)));
        return (releases || []).filter(rel => (rel.maps || []).some(m =>
          normRealmName(m.realm) === normRealmName(realm.name) || realmMapNames.has(norm(m.name))
        ));
      }, [releases, realm, realmMaps]);
      const alongside = useMemo(() => {
        const out = { killers: [], survivors: [] };
        const seenK = new Set();
        const seenS = new Set();
        matchedReleases.forEach(rel => {
          (rel.killers || []).forEach(k => {
            if (seenK.has(k.name)) return;
            seenK.add(k.name);
            out.killers.push({ entry: k, full: (killers || []).find(c => c.name === k.name) || null });
          });
          (rel.survivors || []).forEach(sv => {
            if (seenS.has(sv.name)) return;
            seenS.add(sv.name);
            out.survivors.push({ entry: sv, full: (survivors || []).find(c => c.name === sv.name) || null });
          });
        });
        return out;
      }, [matchedReleases, killers, survivors]);
      const alongsideRows = useMemo(() => ([
        ...alongside.killers.map(k => ({ ...k, role: 'Killer' })),
        ...alongside.survivors.map(sv => ({ ...sv, role: 'Survivor' })),
      ]), [alongside]);
      const years = useMemo(() => {
        const set = new Set();
        matchedReleases.forEach(rel => {
          const y = String(rel.date || '').slice(0, 4);
          if (/^\d{4}$/.test(y)) set.add(y);
        });
        return [...set].sort();
      }, [matchedReleases]);
      const [previewMap, setPreviewMap] = useState(null);
      const tocEntries = [
        { id: 'overview', label: 'Overview' },
        ...(realmMaps.length > 0 ? [{ id: 'maps', label: 'Maps' }] : []),
        ...(alongsideRows.length > 0 ? [{ id: 'characters', label: 'Introduced alongside' }] : []),
        ...(matchedReleases.length > 0 ? [{ id: 'chronicle', label: 'Chronicle' }] : []),
        { id: 'notes', label: 'Notes' },
      ];
      const scrollToSection = (id) => {
        try { window.dispatchEvent(new CustomEvent('cx-expand-section', { detail: id })); } catch (e) {}
        window.setTimeout(() => {
          const node = sectionEls.current[id];
          if (node && node.scrollIntoView) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
      };
      const setSectionRef = (id) => (node) => {
        if (node) sectionEls.current[id] = node;
        else delete sectionEls.current[id];
      };
      useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
      }, [realm.id]);
      useEffect(() => {
        if (!scrollSection) return undefined;
        try { window.dispatchEvent(new CustomEvent('cx-expand-section', { detail: scrollSection })); } catch (e) {}
        const timer = window.setTimeout(() => {
          const node = sectionEls.current[scrollSection];
          if (node && node.scrollIntoView) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
        return () => window.clearTimeout(timer);
      }, [scrollSection, realm.id]);
      const mapCount = realmMaps.length;
      return (
        <div className="flex flex-col h-full overflow-y-auto custom-scrollbar" ref={scrollRef}>
          <div className="cx-article w-full max-w-[1280px] mx-auto min-h-full" data-smoke-profile={realm.id}>
            <ViewCrumbs
              trail={[{ label: 'Main page', onClick: onHome }, { label: 'Realms', onClick: onOpenList }]}
              current={realm.name}
            />
            <h1 className="cx-title">{realm.name}</h1>
            {matchedReleases.length > 0 && (
              <p className="cx-hatnote">
                For the {matchedReleases.length === 1 ? 'release' : 'releases'} featuring this realm, see {matchedReleases.map((rel, idx) => (
                  <span key={rel.id}>{idx > 0 && ', '}<button type="button" className="cx-alink" onClick={() => onOpenRelease && onOpenRelease(rel)}>{rel.name}</button></span>
                ))}.
              </p>
            )}
            <div className="cx-leadgrid">
              <div className="cx-leadmain">
                <p><b>{realm.name}</b> is a realm in <i>Dead by Daylight</i> featuring <b>{mapCount} map{mapCount === 1 ? '' : 's'}</b>{matchedReleases.length > 0 ? <span> introduced across {matchedReleases.length} release{matchedReleases.length === 1 ? '' : 's'}</span> : null}.</p>
                <nav className="cx-toc" aria-label="Contents">
                  <p className="cx-toc-title">Contents</p>
                  <ol>
                    {tocEntries.map((entry) => (
                      <li key={entry.id}>
                        <button type="button" className="cx-alink" onClick={() => scrollToSection(entry.id)}>{entry.label}</button>
                      </li>
                    ))}
                  </ol>
                </nav>
              </div>
              <aside className="cx-infobox" aria-label={`${realm.name} infobox`}>
                <p className="cx-ib-title">{realm.name}</p>
                <p className="cx-ib-sub">Realm</p>
                <div className="cx-ib-media" style={{ width: '100%', aspectRatio: '1 / 1' }}>
                  <img src={`./${realm.image}`} alt={realm.name} className="w-full h-full" style={{ objectFit: 'cover' }} loading="lazy" />
                </div>
                <table>
                  <tbody>
                    <tr><th>Maps</th><td>{mapCount}</td></tr>
                    {matchedReleases.length > 0 && (
                      <tr><th>Releases</th><td>{matchedReleases.map((rel, idx) => (
                        <span key={rel.id}>{idx > 0 && ', '}<button type="button" className="cx-alink" onClick={() => onOpenRelease && onOpenRelease(rel)}>{rel.name}</button></span>
                      ))}</td></tr>
                    )}
                  </tbody>
                </table>
              </aside>
            </div>
            <CxSection id="overview" view="realm" setRef={setSectionRef} title="Overview" collapsible={false}>
              <p>{realm.name} is one of the realms of the Entity's world in <i>Dead by Daylight</i>. It contains {mapCount} playable map{mapCount === 1 ? '' : 's'}{matchedReleases.length > 0 ? <span>, first appearing alongside {matchedReleases.map((rel, idx) => (
                <span key={rel.id}>{idx > 0 && ', '}<button type="button" className="cx-alink" onClick={() => onOpenRelease && onOpenRelease(rel)}>{rel.name}</button></span>
              ))}</span> : null}.</p>
            </CxSection>
            {realmMaps.length > 0 && (
              <CxSection id="maps" view="realm" setRef={setSectionRef} title="Maps">
                <table className="cx-wikitable">
                  <thead><tr><th style={{ width: '320px' }}>Map</th><th>Description</th></tr></thead>
                  <tbody>
                    {realmMaps.map((mp) => (
                      <tr key={mp.id}>
                        <td>
                          <button type="button" onClick={() => setPreviewMap(mp)} style={{ display: 'block', width: '100%', maxWidth: '320px', padding: 0, border: 0, background: 'none', cursor: 'zoom-in' }} aria-label={`Preview ${mp.name}`}>
                            <img src={`./${mp.image}`} alt={mp.name} loading="lazy" style={{ display: 'block', width: '100%' }} />
                          </button>
                          <button type="button" className="cx-alink font-semibold" style={{ marginTop: '6px' }} onClick={() => onViewLayout && onViewLayout(mp)}>{mp.name}</button>
                        </td>
                        <td style={{ color: 'var(--text-soft)' }}>{mp.description || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CxSection>
            )}
            {alongsideRows.length > 0 && (
              <CxSection id="characters" view="realm" setRef={setSectionRef} title="Introduced alongside">
                <p className="cx-hatnote">Killers and Survivors introduced in the same releases as this realm's maps - not necessarily native to it.</p>
                <table className="cx-wikitable">
                  <thead><tr><th style={{ width: '220px' }}>Character</th><th>How they entered the Fog</th></tr></thead>
                  <tbody>
                    {alongsideRows.map((row) => (
                      <tr key={`${row.role}-${row.entry.name}`}>
                        <td>{row.full ? (
                          <button type="button" className="cx-alink font-semibold" onClick={() => onOpenCharacter && onOpenCharacter(row.full)}>{row.entry.name}</button>
                        ) : (
                          <span className="font-semibold">{row.entry.name}</span>
                        )}{row.entry.realName ? <small style={{ display: 'block', color: 'var(--text-faint)', fontSize: '11px' }}>{row.entry.realName}</small> : null}</td>
                        <td style={{ color: 'var(--text-soft)' }}>{row.entry.fogEntry || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CxSection>
            )}
            {matchedReleases.length > 0 && (
              <CxSection id="chronicle" view="realm" setRef={setSectionRef} title="Chronicle">
                <table className="cx-wikitable">
                  <thead><tr><th style={{ width: '220px' }}>Release</th><th>Date</th></tr></thead>
                  <tbody>
                    {matchedReleases.map((rel) => (
                      <tr key={rel.id}>
                        <td><button type="button" className="cx-alink font-semibold" onClick={() => onOpenRelease && onOpenRelease(rel)}>{rel.name}</button>{rel.chapterNumber ? <small style={{ display: 'block', color: 'var(--text-faint)', fontSize: '11px' }}>Chapter {rel.chapterNumber}</small> : null}</td>
                        <td>{rel.displayDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CxSection>
            )}
            <CxSection id="notes" view="realm" setRef={setSectionRef} title="Notes">
              <NotesEditor
                title="Realm Notes"
                value={noteValue}
                onChange={onNoteChange}
                placeholder="Loop routes, tile notes, or personal reminders for this realm..."
              />
            </CxSection>
            <div className="cx-cats">
              <span>Categories:</span>
              <button type="button" className="cx-alink" onClick={onOpenList}>Realms</button>
              {years.map((y) => (
                <span key={y}><span className="cx-sep"> · </span>{y} releases</span>
              ))}
            </div>
            {previewMap && <ImageLightbox src={`./${previewMap.image}`} alt={previewMap.name} onClose={() => setPreviewMap(null)} />}
          </div>
        </div>
      );
    };

    const guideSourceLabel = (url) => {
      const u = String(url || '');
      if (u.includes('wiki.gg')) return 'Official DBD Wiki';
      if (u.includes('reddit.com')) return 'Reddit';
      if (u.includes('otzdarva.com')) return 'Otzdarva';
      if (u.includes('youtube.com') || u.includes('youtu.be')) return 'YouTube';
      if (u.includes('steamcommunity.com')) return 'Steam Guide';
      if (u.includes('deadbydaylight.com') || u.includes('bhvr')) return 'Behaviour';
      return 'Source';
    };
    const CharacterArticleView = ({ character, roleCount = 0, onHome, onOpenList, onOpenTimeline, onOpenCommunity, allPerks = [], onPerkTap, theme, settings = {}, noteValue = '', onNoteChange, cosmeticsByBaseId = {}, allAddons = [], cosmeticFocusId = null, scrollSection = null }) => {
      if (!character) return null;
      const isKiller = character.type === 'Killer' || character.power;
      const roleNoun = isKiller ? 'Killer' : 'Survivor';
      const rolePlural = isKiller ? 'Killers' : 'Survivors';
      const stats = isKiller ? KILLER_STATS[character.name] : null;
      const guide = isKiller ? KILLER_GUIDES[character.name] : null;
      const teachables = allPerks.filter(p => p.owner === character.name);
      const [powerTipsTab, setPowerTipsTab] = useState('survivor');
      const cosmeticsSectionRef = useRef(null);
      const scrollRef = useRef(null);
      const sectionEls = useRef({});
      const cosmeticsEntries = cosmeticsByBaseId[character.id] || [];
      const focusedCosmeticId = character.cosmeticFocusId || cosmeticFocusId || null;
      const cosmeticSlotGroups = useMemo(() => {
        const RAR = { common: 1, uncommon: 2, rare: 3, veryrare: 4, ultrarare: 5, visceral: 6, legendary: 7, event: 8 };
        const rarityOf = (entry) => RAR[String(entry.rarity || '').toLowerCase()] || 9;
        const SLOT_ORDER = [
          { key: 'head', label: 'Headgear', match: (pt) => pt === 'head' },
          { key: 'body', label: 'Body', match: (pt) => pt === 'body' },
          { key: 'legs', label: 'Legs', match: (pt) => pt === 'legs' },
          { key: 'weapon', label: 'Weapon', match: (pt) => pt === 'weapon' },
          { key: 'outfit', label: 'Outfits', match: (pt) => pt === 'outfit' },
          { key: 'misc', label: 'Miscellaneous', match: (pt) => !['head', 'body', 'legs', 'weapon', 'outfit'].includes(pt) },
        ];
        const swaps = cosmeticsEntries
          .filter((entry) => entry.isCharacterSwap)
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name));
        const groups = [];
        if (swaps.length > 0) groups.push({ label: 'Character swaps', entries: swaps });
        const nonSwaps = cosmeticsEntries.filter((entry) => !entry.isCharacterSwap);
        SLOT_ORDER.forEach((slot) => {
          const entries = nonSwaps
            .filter((entry) => slot.match(String(entry.pieceType || '').toLowerCase()))
            .slice()
            .sort((a, b) => rarityOf(a) - rarityOf(b) || a.name.localeCompare(b.name));
          if (entries.length > 0) groups.push({ label: slot.label, entries });
        });
        return groups;
      }, [cosmeticsEntries]);
      const fullSetLinkStats = useMemo(() => (
        cosmeticsEntries
          .filter((entry) => !entry.isCharacterSwap)
          .reduce((acc, entry) => {
            const mode = String(entry.outfitLinkMode || 'unlinked').toLowerCase();
            const key = ['linked', 'partially_linked', 'unlinked'].includes(mode) ? mode : 'unlinked';
            acc[key] += 1;
            return acc;
          }, { linked: 0, partially_linked: 0, unlinked: 0 })
      ), [cosmeticsEntries]);
      const linkedFullSetCount = fullSetLinkStats.linked + fullSetLinkStats.partially_linked;
      const killerAddons = isKiller ? (allAddons || []).filter(a => a.role === 'killer' && a.killerName === character.name) : [];
      const RARITY_RANK = { common: 1, uncommon: 2, rare: 3, veryrare: 4, ultrarare: 5, visceral: 6, event: 7 };
      killerAddons.sort((a, b) => (RARITY_RANK[(a.rarity || '').toLowerCase()] || 0) - (RARITY_RANK[(b.rarity || '').toLowerCase()] || 0));
      // timeline release lookup (chapter, dates, fog entry, description)
      let release = null;
      if (typeof TIMELINE_DATA !== 'undefined' && TIMELINE_DATA && TIMELINE_DATA.releases) {
        for (const rel of TIMELINE_DATA.releases) {
          const hit = (rel.killers || []).find(k => k.name === character.name) || (rel.survivors || []).find(sv => sv.name === character.name);
          if (hit) { release = { ...rel, entry: hit }; break; }
        }
      }
      const releaseChapter = release ? release.name : null;
      const releaseDate = release ? release.displayDate : null;
      const chapterNumber = release ? release.chapterNumber : null;
      const isLicensed = release ? release.entry.licensed === true : false;
      const fogEntry = release && release.entry.fogEntry ? release.entry.fogEntry : '';
      const releaseDesc = release ? release.description : '';
      const scrollToSection = (id) => {
        try { window.dispatchEvent(new CustomEvent('cx-expand-section', { detail: id })); } catch (e) {}
        window.setTimeout(() => {
          const node = sectionEls.current[id];
          if (node && node.scrollIntoView) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
      };
      const setSectionRef = (id) => (node) => {
        if (node) sectionEls.current[id] = node;
        else delete sectionEls.current[id];
      };
      useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
      }, [character.id]);
      useEffect(() => {
        if (!scrollSection) return undefined;
        try { window.dispatchEvent(new CustomEvent('cx-expand-section', { detail: scrollSection })); } catch (e) {}
        const timer = window.setTimeout(() => {
          const node = sectionEls.current[scrollSection];
          if (node && node.scrollIntoView) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
        return () => window.clearTimeout(timer);
      }, [scrollSection, character.id]);
      useEffect(() => {
        if (!focusedCosmeticId || !cosmeticsSectionRef.current) return undefined;
        const timer = window.setTimeout(() => {
          cosmeticsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 140);
        return () => window.clearTimeout(timer);
      }, [focusedCosmeticId, character.id]);
      // meta line: days since sync
      let editedLabel = 'recently';
      try {
        const days = Math.max(0, Math.floor((Date.now() - new Date(META.lastSynced).getTime()) / 86400000));
        editedLabel = days <= 0 ? 'today' : days === 1 ? '1 day ago' : `${days} days ago`;
      } catch (e) { /* keep default */ }
      // lead paragraph 2: first two sentences of fog entry (fallback: lore, then power)
      const firstSentences = (text, n) => {
        if (!text) return '';
        const parts = String(text).split(/(?<=[.!?])\s+/).filter(Boolean);
        return parts.slice(0, n).join(' ');
      };
      const leadP2 = firstSentences(fogEntry, 2) || firstSentences(character.lore, 2) || (character.power ? String(character.power).split('\n\n')[0] : '');
      // lead paragraph 3: power-blurb paragraph naming teachables, else generic
      let leadP3 = null;
      if (teachables.length > 0) {
        const powerParas = character.power ? String(character.power).split('\n\n') : [];
        const perkPara = powerParas.find(p => teachables.filter(t => p.includes(t.name)).length >= 2);
        if (perkPara) leadP3 = perkPara;
      }
      // flavor/effect split for addon descriptions: “flavor” (cite) EFFECT
      const splitFlavor = (text) => {
        const m = String(text || '').match(/^“(.+?)” \(([^)]+)\)\s*([\s\S]*)$/);
        if (m) return { flavor: `“${m[1]}” (${m[2]})`, effect: m[3] };
        return { flavor: '', effect: String(text || '') };
      };
      const fmtDiff = (d) => ({ easy: 'Easy', intermediate: 'Intermediate', hard: 'Hard', veryhard: 'Very hard' }[(d || '').toLowerCase()] || d);
      const tocEntries = [
        { id: 'overview', label: 'Overview' },
        ...(isKiller && character.power ? [{ id: 'power', label: `Power: ${guide?.powerName || 'Power'}` }] : []),
        ...(teachables.length > 0 ? [{ id: 'perks', label: `${character.name}'s Perks` }] : []),
        ...(killerAddons.length > 0 ? [{ id: 'addons', label: 'Add-ons' }] : []),
        ...(character.lore ? [{ id: 'lore', label: 'Lore' }] : []),
        ...(releaseDesc ? [{ id: 'chronicle', label: 'Chronicle' }] : []),
        ...(cosmeticsEntries.length > 0 ? [{ id: 'cosmetics', label: 'Cosmetics' }] : []),
        ...(isKiller ? [{ id: 'notes', label: 'Notes' }] : []),
      ];
      const linkAccent = 'var(--link)';
      return (
        <div className="flex flex-col h-full overflow-y-auto custom-scrollbar" ref={scrollRef}>
          <div className="cx-article w-full max-w-[1280px] mx-auto min-h-full" data-smoke-profile={character.id}>
            <ViewCrumbs
              trail={[{ label: 'Main page', onClick: onHome }, { label: rolePlural, onClick: onOpenList }]}
              current={character.name}
            />
            <h1 className="cx-title">{character.name}</h1>
            {(releaseChapter || (isKiller && character.power)) && (
              <p className="cx-hatnote">
                {releaseChapter ? (
                  <span>For the chapter this {roleNoun} was introduced in, see <button type="button" className="cx-alink" onClick={onOpenTimeline}>{releaseChapter}</button>. </span>
                ) : null}
                {isKiller && character.power ? (
                  <span>For {isKiller ? 'its' : 'their'} power, see <button type="button" className="cx-alink" onClick={() => scrollToSection('power')}>{guide?.powerName || 'Power'}</button>.</span>
                ) : null}
              </p>
            )}

            <div className="cx-leadgrid">
              <div className="cx-leadmain">
                <p><b>{character.name}</b> is one of <b>{roleCount} {rolePlural}</b> featured in <i>Dead by Daylight</i>. {isKiller ? 'It was' : 'They were'} introduced as the {roleNoun} of {chapterNumber ? <span>CHAPTER {chapterNumber}: </span> : null}<button type="button" className="cx-alink" onClick={onOpenTimeline}>{releaseChapter}</button>{releaseDesc && releaseDesc.includes('community-created') ? ', a community-created Chapter' : ''} released on {releaseDate}.</p>
                {leadP2 ? <p>{leadP2}</p> : null}
                {leadP3 ? (
                  <p>{leadP3.split(new RegExp(`(${teachables.map(t => t.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g')).map((part, idx) => {
                    const hit = teachables.find(t => t.name === part);
                    return hit ? <button key={idx} type="button" className="cx-alink" onClick={() => scrollToSection('perks')}>{part}</button> : <span key={idx}>{part}</span>;
                  })}</p>
                ) : teachables.length > 0 ? (
                  <p>Their personal perks are {teachables.map(p => p.name).join(', ')}. See <button type="button" className="cx-alink" onClick={() => scrollToSection('perks')}>perks</button> for full descriptions.</p>
                ) : (
                  <p>No teachable perks are currently listed for this character.</p>
                )}
                <nav className="cx-toc" aria-label="Contents">
                  <p className="cx-toc-title">Contents</p>
                  <ol>
                    {tocEntries.map((entry, idx) => (
                      <li key={entry.id}>
                        <button type="button" className="cx-alink" onClick={() => scrollToSection(entry.id)}>{entry.label}</button>
                      </li>
                    ))}
                  </ol>
                </nav>
              </div>
              <aside className="cx-infobox" aria-label={`${character.name} infobox`}>
                <p className="cx-ib-title">{character.name}</p>
                <p className="cx-ib-sub">{roleNoun}</p>
                <div className="cx-ib-media" style={{ width: '100%', aspectRatio: '1 / 1' }}>
                  <AssetFrame type={roleNoun} imageUrl={character.image} size="fill" fallbackIcon={<Icons.User width={40} height={40} className="text-zinc-500" />} />
                </div>
                <table>
                  <tbody>
                    {character.difficulty && (character.difficulty || '').toLowerCase() !== 'none' && (
                      <tr><th>Difficulty</th><td>{fmtDiff(character.difficulty)}</td></tr>
                    )}
                    {stats && <tr><th>Terror Radius</th><td>{stats.terrorRadius}</td></tr>}
                    {stats && <tr><th>Movement speed</th><td>{stats.speed}</td></tr>}
                    {stats && <tr><th>Height</th><td>{stats.height}</td></tr>}
                    {isKiller && character.power && (
                      <tr><th>Power</th><td><button type="button" className="cx-alink" onClick={() => scrollToSection('power')}>{guide?.powerName || 'Power'}</button></td></tr>
                    )}
                    {releaseChapter && <tr><th>Chapter</th><td><button type="button" className="cx-alink" onClick={onOpenTimeline}>{releaseChapter}</button>{chapterNumber ? ` (${chapterNumber})` : ''}</td></tr>}
                    {releaseDate && <tr><th>Released</th><td>{releaseDate}</td></tr>}
                    {isLicensed && <tr><th>Licensed</th><td>Yes</td></tr>}
                    <tr><th>Teachable perks</th><td>{teachables.length}</td></tr>
                    {isKiller && <tr><th>Add-ons</th><td>{killerAddons.length}</td></tr>}
                  </tbody>
                </table>
                {release && release.entry && release.entry.realName && release.entry.realName !== character.name && (
                  <p className="cx-ib-note">Real name: {release.entry.realName}.</p>
                )}
              </aside>
            </div>

            <CxSection id="overview" view="character" setRef={setSectionRef} title="Overview" collapsible={false}>
              {fogEntry ? <p>{fogEntry}</p> : null}
              {character.power ? <p>{String(character.power).split('\n\n')[0]}</p> : null}
              {!isKiller && (
                <p>Difficulty: <b>{fmtDiff(character.difficulty)}</b>. Teaches {teachables.length} personal perk{teachables.length === 1 ? '' : 's'}. See <button type="button" className="cx-alink" onClick={() => scrollToSection('perks')}>perks</button> for full descriptions.</p>
              )}
            </CxSection>

            {isKiller && character.power && (
              <CxSection id="power" view="character" setRef={setSectionRef} title={`Power: ${guide?.powerName || 'Power'}`}>
                {guide && guide.tldr && (<p><b>TL;DR: </b>{guide.tldr}</p>)}
                {guide && guide.powerBlurb && (<p>{guide.powerBlurb}</p>)}
                {String(character.power).split('\n\n').map((para, idx) => <p key={idx}>{para}</p>)}
                {guide && guide.survivorTips && (
                  <div>
                    <h3 className="cx-sub">Playing against {guide.powerName || 'this power'}</h3>
                    <p>{guide.survivorTips}</p>
                  </div>
                )}
                {guide && guide.killerTips && (
                  <div>
                    <h3 className="cx-sub">Playing as {character.name}</h3>
                    <p>{guide.killerTips}</p>
                  </div>
                )}
                {guide && (guide.advancedAs || guide.advancedAgainst) && (
                  <details>
                    <summary className="cx-alink" style={{ cursor: 'pointer', fontWeight: 600 }}>Advanced guide: playing as and against</summary>
                    {guide.advancedAs && (<div><h3 className="cx-sub">Advanced: playing as {character.name}</h3><p>{guide.advancedAs}</p></div>)}
                    {guide.advancedAgainst && (<div><h3 className="cx-sub">Advanced: playing against {guide.powerName || 'this power'}</h3><p>{guide.advancedAgainst}</p></div>)}
                  </details>
                )}
                {guide && guide.sources && guide.sources.length > 0 && (
                  <p style={{ color: 'var(--text-faint)', fontSize: '12px' }}>Guide sources: {guide.sources.map((s, i) => (<span key={i}>{i > 0 ? ' · ' : ''}<a href={s} target="_blank" rel="noreferrer">{guideSourceLabel(s)}</a></span>))} (verified Patch {guide.verifiedPatch || '10.1.1'}). See Settings for the full source list.</p>
                )}
              </CxSection>
            )}

            {teachables.length > 0 && (
              <CxSection id="perks" view="character" setRef={setSectionRef} title={`${character.name}'s Perks`}>
                <table className="cx-wikitable">
                  <caption>Table: the {teachables.length} teachable Perk{teachables.length === 1 ? '' : 's'} of {character.name}</caption>
                  <thead><tr><th style={{ width: '280px' }}>Perk</th><th>Effect</th></tr></thead>
                  <tbody>
                    {teachables.map(perk => (
                      <tr key={perk.id} onClick={() => onPerkTap && onPerkTap(perk)} style={{ cursor: onPerkTap ? 'pointer' : 'default' }}>
                        <td className="cx-perkcell">
                          <div className="cx-perkimg">
                            <div className="cx-imgbox">
                              <AssetFrame type="Perk" size="fill" imageUrl={perk.image} fallbackIcon={<Icons.BookOpen width={24} height={24} className="text-zinc-600" />} />
                            </div>
                            <button type="button" className="cx-alink" onClick={(e) => { e.stopPropagation(); onPerkTap && onPerkTap(perk); }}>{perk.name}</button>
                            <small>{perk.type} Perk{perk.name.startsWith('Hex:') ? ' · Hex' : ''}</small>
                          </div>
                        </td>
                        <td><PerkDescriptionBlock perk={perk} settings={settings} accentColor={linkAccent} compactLines={3} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CxSection>
            )}

            {killerAddons.length > 0 && (
              <CxSection id="addons" view="character" setRef={setSectionRef} title="Add-ons">
                <table className="cx-wikitable">
                  <caption>Table: the {killerAddons.length} Add-ons of {guide?.powerName || 'this power'}</caption>
                  <thead><tr><th style={{ width: '250px' }}>Add-on</th><th>Rarity</th><th>Effect</th></tr></thead>
                  <tbody>
                    {killerAddons.map(addon => {
                      const parts = splitFlavor(addon.description);
                      const rar = (addon.rarity || '').toLowerCase();
                      const rarLabel = rar === 'veryrare' ? 'Very rare' : rar === 'ultrarare' ? 'Ultra rare' : rar.charAt(0).toUpperCase() + rar.slice(1);
                      return (
                        <tr key={addon.id}>
                          <td className="cx-perkcell"><span><span className="font-semibold text-zinc-100">{addon.name}</span></span></td>
                          <td className="cx-rarity">{rarLabel}</td>
                          <td>{parts.flavor ? <small style={{ display: 'block', color: 'var(--text-faint)', fontStyle: 'italic', marginBottom: '4px' }}>{parts.flavor}</small> : null}{parts.effect}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CxSection>
            )}

            {character.lore && (
              <CxSection id="lore" view="character" setRef={setSectionRef} title="Lore">
                {String(character.lore).split('\n\n').map((para, idx) => <p key={idx}>{para}</p>)}
              </CxSection>
            )}

            {releaseDesc && (
              <CxSection id="chronicle" view="character" setRef={setSectionRef} title="Chronicle">
                <p>{character.name} entered the fog on <b>{releaseDate}</b> with {chapterNumber ? <span>CHAPTER {chapterNumber}: </span> : null}<button type="button" className="cx-alink" onClick={onOpenTimeline}>{releaseChapter}</button>, {releaseDesc.charAt(0).toLowerCase() + releaseDesc.slice(1)}</p>
              </CxSection>
            )}

            {cosmeticsEntries.length > 0 && (
              <CxSection id="cosmetics" view="character" setRef={setSectionRef} title="Cosmetics">
                <div
                  ref={cosmeticsSectionRef}
                  data-smoke-cosmetics={character.id}
                  className="scroll-mt-24 space-y-6"
                >
                  {cosmeticSlotGroups.map((group) => (
                    <div key={group.label} className="space-y-3">
                      <h3 className="cx-sub">{group.label} <span style={{ color: 'var(--text-faint)', fontSize: '12px', fontWeight: 400 }}>{group.entries.length}</span></h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                        {group.entries.map((entry) => (
                          <div key={entry.id} className="w-full">
                            <CosmeticCard entry={entry} accentColor={linkAccent} focused={entry.id === focusedCosmeticId} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CxSection>
            )}

            {isKiller && (
              <CxSection id="notes" view="character" setRef={setSectionRef} title="Notes">
                <NotesEditor
                  title="Killer Notes"
                  value={noteValue}
                  onChange={onNoteChange}
                  placeholder="Matchups, addon ideas, macro notes, or personal reminders for this killer..."
                />
              </CxSection>
            )}

            <div className="cx-cats">
              <span>Categories:</span>
              <button type="button" className="cx-alink" onClick={onOpenList}>{rolePlural}</button>
              {releaseChapter && <span><span className="cx-sep"> · </span><button type="button" className="cx-alink" onClick={onOpenTimeline}>{chapterNumber ? `Chapter ${chapterNumber} ` : ''}{rolePlural}</button></span>}
              {character.difficulty && (character.difficulty || '').toLowerCase() !== 'none' && <span><span className="cx-sep"> · </span>{fmtDiff(character.difficulty)} {rolePlural}</span>}
              {isLicensed
                ? <span><span className="cx-sep"> · </span>Licensed Characters</span>
                : <span><span className="cx-sep"> · </span>Original Characters</span>}
            </div>
          </div>
        </div>
      );
    };

    const App = () => {
      const { killers = [], survivors = [], perks = [], maps = [], realms = [], items = [], offerings = [], addons = [] } = DATABASE;
      const isAndroidNative = useMemo(() => isNativeAndroidPlatform(), []);
      const cosmeticsCatalog = useMemo(
        () => normalizeCosmeticsCatalog(typeof COSMETICS_CATALOG === 'undefined' ? {} : COSMETICS_CATALOG),
        []
      );
      const communityContent = useMemo(
        () => normalizeCommunityContentSnapshot(typeof COMMUNITY_CONTENT === 'undefined' ? {} : COMMUNITY_CONTENT),
        []
      );
      const launchContext = useMemo(() => readLaunchContext(), []);
      const initialUiState = useMemo(() => normalizeUiState(loadFromStorage(STORAGE_KEYS.uiState, {})), []);
      const initialView = launchContext.hasRoute ? (launchContext.view || 'home') : initialUiState.view;
      const initialViewContext = launchContext.hasRoute ? (launchContext.context || {}) : (initialUiState.context || {});
      const [currentView, setViewRaw] = useState(initialView || 'home');
      const [viewContext, setViewContext] = useState(initialViewContext || {});
      const viewHistoryRef = useRef([{ view: initialView || 'home', context: initialViewContext || {} }]);
      const mainRef = useRef(null);
      const setView = (view, context = {}) => {
        setViewContext(context);
        setViewRaw(view);
        const history = viewHistoryRef.current;
        if (history.length === 0 || history[history.length - 1].view !== view) {
          history.push({ view, context });
          if (history.length > 50) history.splice(0, history.length - 50);
        }
      };
      const goBack = () => {
        const history = viewHistoryRef.current;
        if (history.length > 1) {
          history.pop();
          const prev = history[history.length - 1];
          setViewContext(prev.context || {});
          setViewRaw(prev.view);
        } else if (window.Capacitor?.Plugins?.App) {
          window.Capacitor.Plugins.App.exitApp();
        }
      };
      useEffect(() => {
        try {
          const suffix = SEO_SUFFIX;
          const viewLabels = SEO_VIEW_LABELS;
          let title = SEO_DEFAULT_TITLE;
          const id = viewContext.id;
          if (id) {
            const pools = [killers, survivors, perks, maps, realms, items, offerings];
            let entry = null;
            for (const pool of pools) {
              entry = (pool || []).find(e => e && e.id === id) || null;
              if (entry) break;
            }
            if (!entry && typeof TIMELINE_DATA !== 'undefined' && TIMELINE_DATA && TIMELINE_DATA.releases) {
              entry = TIMELINE_DATA.releases.find(r => r && r.id === id) || null;
            }
            if (entry && entry.name) title = `${entry.name}${suffix}`;
            else if (viewLabels[currentView]) title = `${viewLabels[currentView]}${suffix}`;
          } else if (viewLabels[currentView]) {
            title = `${viewLabels[currentView]}${suffix}`;
          }
          document.title = title;
          /* Self-referencing canonical per deep link so search engines can
             index ?view= / ?id= pages individually (the sitemap lists these
             URLs). Volatile params (search, tab, scroll, ...) are stripped
             so each view/id pair has exactly one canonical URL. */
          const siteBase = SEO_SITE_BASE;
          let canonical = siteBase + '/';
          if (currentView && currentView !== 'home') {
            canonical = siteBase + '/?view=' + encodeURIComponent(currentView);
            if (id) canonical += '&id=' + encodeURIComponent(id);
          }
          const canonicalLink = document.querySelector('link[rel="canonical"]');
          if (canonicalLink) canonicalLink.setAttribute('href', canonical);
          const ogUrlTag = document.querySelector('meta[property="og:url"]');
          if (ogUrlTag) ogUrlTag.setAttribute('content', canonical);
          const ogTitleTag = document.querySelector('meta[property="og:title"]');
          if (ogTitleTag) ogTitleTag.setAttribute('content', title);
        } catch (e) { /* keep default title */ }
      }, [currentView, viewContext]);
      const [perkFilter, setPerkFilter] = useState(initialUiState.perkFilter || 'All');
      const [perkSearch, setPerkSearch] = useState(initialUiState.perkSearch || '');
      const [buildSeed, setBuildSeed] = useState(null);
      const [comparePerks, setComparePerks] = useState([]);
      const [showCompareModal, setShowCompareModal] = useState(false);
      const [previewPerk, setPreviewPerk] = useState(null);
      const [layoutMap, setLayoutMap] = useState(null);
      const [drawerOpen, setDrawerOpen] = useState(false);
      const [cosmeticsFullSetPackState, setCosmeticsFullSetPackState] = useState(() => defaultCosmeticsFullSetPackState());
      const [cosmeticsAssetRevision, setCosmeticsAssetRevision] = useState(() => getCosmeticsFullSetResolutionRevision());
      const refreshCosmeticsFullSetPack = useCallback(async (options = {}) => {
        const forceAssetReload = Boolean(options?.forceAssetReload);
        const applyPackState = (next) => {
          setCosmeticsFullSetPackState(next);
          if (isAndroidNative && (forceAssetReload || next.isReady || next.status === 'completed')) {
            const revision = bumpCosmeticsFullSetResolutionRevision();
            setCosmeticsAssetRevision(revision);
          }
          return next;
        };
        if (!isAndroidNative) {
          const next = defaultCosmeticsFullSetPackState();
          return applyPackState(next);
        }
        const plugin = window.Capacitor?.Plugins?.CosmeticsAssetPack;
        if (!plugin?.getStatus) {
          setCosmeticsFullSetPackBasePath('');
          const next = {
            ...defaultCosmeticsFullSetPackState(),
            supported: false,
            status: 'unavailable',
            isReady: false
          };
          return applyPackState(next);
        }
        try {
          const raw = await plugin.getStatus();
          const next = normalizeCosmeticsFullSetPackState(raw);
          return applyPackState(next);
        } catch (error) {
          setCosmeticsFullSetPackBasePath('');
          const next = {
            ...defaultCosmeticsFullSetPackState(),
            status: 'failed',
            isReady: false
          };
          return applyPackState(next);
        }
      }, [isAndroidNative]);
      const fullSetCatalogCount = useMemo(
        () => cosmeticsCatalog.fullSets.filter((entry) => entry.status === 'ready').length,
        [cosmeticsCatalog]
      );
      const cosmeticsCatalogForDisplay = cosmeticsCatalog;
      const allCharactersById = useMemo(() => new Map([...killers, ...survivors].map((character) => [character.id, character])), [killers, survivors]);
      const readyCharacterSwaps = useMemo(() => cosmeticsCatalogForDisplay.characterSwaps.filter((entry) => entry.status === 'ready'), [cosmeticsCatalogForDisplay]);
      const readyFullSets = useMemo(() => cosmeticsCatalogForDisplay.fullSets.filter((entry) => entry.status === 'ready'), [cosmeticsCatalogForDisplay]);
      const readyCosmetics = useMemo(() => [...readyCharacterSwaps, ...readyFullSets], [readyCharacterSwaps, readyFullSets]);
      useEffect(() => {
        if (currentView !== 'cosmetics') return undefined;
        const firstVisibleCosmetics = sortCosmeticsByRarity(
          readyCosmetics.filter((entry) => entry.baseCharacterType === 'Killer')
        )
          .slice(0, 16)
          .map((entry) => entry.image);
        return preloadImageBatch(firstVisibleCosmetics, cosmeticsAssetRevision, 16);
      }, [currentView, readyCosmetics, cosmeticsAssetRevision]);
      const openCharacterArticle = useCallback((character) => {
        if (!character) return;
        const view = resolveCharacterView(character);
        setView(view, { id: character.id, ...(character.cosmeticFocusId ? { cosmeticId: character.cosmeticFocusId } : {}) });
      }, []);
      const openRealmArticle = useCallback((realm) => {
        if (!realm) return;
        setView('realm', { id: realm.id });
      }, []);
      const openReleaseArticle = useCallback((release) => {
        if (!release) return;
        setView('release', { id: release.id });
      }, []);
      const openPerkArticle = useCallback((perk) => {
        if (!perk) return;
        setView('perk', { id: perk.id });
      }, []);
      const openCosmeticProfile = useCallback((cosmetic) => {
        if (!cosmetic) return;
        const baseCharacter = allCharactersById.get(cosmetic.baseCharacterId);
        if (!baseCharacter) return;
        const view = resolveCharacterView(baseCharacter);
        setView(view, { id: baseCharacter.id, cosmeticId: cosmetic.id });
      }, [allCharactersById]);
      const togglePerkCompare = (perk) => {
        setComparePerks(prev => {
          const exists = prev.find(p => p.id === perk.id);
          if (exists) {
            return prev.filter(p => p.id !== perk.id);
          }
          if (prev.length >= 4) return prev;
          return [...prev, perk];
        });
        triggerHaptic('Light');
      };
      const clearCompare = () => {
        setComparePerks([]);
        setShowCompareModal(false);
      };
    /* Moved to ./games/dbd/config.js (DBD adapter, loaded above). */
      const toggleFavorite = (category, itemId) => {
        const key = FAVORITE_KEYS[category];
        if (!key) return;
        setSettings(prev => {
          const favs = prev[key] || [];
          const isFav = favs.includes(itemId);
          return { ...prev, [key]: isFav ? favs.filter(id => id !== itemId) : [...favs, itemId] };
        });
        triggerHaptic('Light');
      };
      const toggleFavoritePerk = (perkId) => toggleFavorite('Perk', perkId);
      const initialSettings = useMemo(() => normalizeSettings(loadFromStorage(STORAGE_KEYS.settings, DEFAULT_SETTINGS)), []);
      const initialBuilds = useMemo(() => loadFromStorage(STORAGE_KEYS.builds, []), []);
      const legacyAchievementState = useMemo(() => loadFromStorage(STORAGE_KEY_ACHIEVEMENTS, {}), []);
      const initialProgression = useMemo(() => normalizeProgression(loadFromStorage(STORAGE_KEYS.progression, DEFAULT_PROGRESSION), legacyAchievementState), [legacyAchievementState]);
      const initialLookups = useMemo(() => buildDataLookups({ killers, survivors, perks, maps, builds: initialBuilds }), [killers, survivors, perks, maps, initialBuilds]);
      const initialMatches = useMemo(() => normalizeMatchRecords(loadFromStorage(STORAGE_KEYS.matches, []), initialLookups), [initialLookups]);
      const initialNotes = useMemo(() => normalizeNotesStore(loadFromStorage(STORAGE_KEYS.notes, {})), []);
      const initialWorldle = useMemo(() => normalizeWorldleState(loadFromStorage(STORAGE_KEYS.worldle, createWorldleStateShape())), []);
      const [settings, setSettings] = useState(initialSettings);
      const [builds, setBuilds] = useState(initialBuilds);
      const [matches, setMatches] = useState(initialMatches);
      const [progression, setProgression] = useState(initialProgression);
      const [notes, setNotes] = useState(initialNotes);
      const [worldleState, setWorldleState] = useState(initialWorldle);
      const [matchPrefs, setMatchPrefs] = useState(() => normalizeMatchPrefs(loadFromStorage(STORAGE_KEYS.lastContext, DEFAULT_MATCH_PREFS)));
      const device = useDeviceProfile();
      const cosmeticsByBaseId = useMemo(() => {
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
        if (!isAndroidNative) return undefined;
        const plugin = window.Capacitor?.Plugins?.App;
        if (!plugin?.addListener) return undefined;
        let listenerHandle;
        const setup = async () => {
          listenerHandle = await plugin.addListener('resume', () => {
            refreshCosmeticsFullSetPack();
          });
        };
        setup();
        return () => {
          if (listenerHandle?.remove) listenerHandle.remove();
        };
      }, [isAndroidNative, refreshCosmeticsFullSetPack]);
      useEffect(() => {
        if (!isAndroidNative) return undefined;
        if (cosmeticsFullSetPackState.isReady) return undefined;
        if (!['checking', 'pending', 'downloading', 'transferring', 'missing', 'unknown', 'unavailable', 'failed'].includes(cosmeticsFullSetPackState.status)) {
          return undefined;
        }
        const interval = window.setInterval(() => {
          refreshCosmeticsFullSetPack();
        }, 2000);
        return () => window.clearInterval(interval);
      }, [isAndroidNative, cosmeticsFullSetPackState.isReady, cosmeticsFullSetPackState.status, refreshCosmeticsFullSetPack]);
      useEffect(() => {
        if (!launchContext.profileId) return;
        const target = allCharactersById.get(launchContext.profileId);
        if (!target) return;
        const view = (target.type === 'Killer' || target.power) ? 'killer' : 'survivor';
        setView(view, { id: target.id, ...(launchContext.cosmeticId ? { cosmeticId: launchContext.cosmeticId } : {}) });
      }, [launchContext, allCharactersById]);
      useEffect(() => {
        let cancelled = false;
        const timer = window.setTimeout(() => {
          if (!cancelled) window.__hideLaunchOverlay?.();
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
        crumbs: () => Array.from(document.querySelectorAll('.cx-crumbs__current')).map(node => node.textContent),
      };
      useEffect(() => {
        try {
          localStorage.removeItem(STORAGE_KEY_ACHIEVEMENTS);
        } catch (err) {
          console.warn('Failed to remove legacy achievements key', err);
        }
      }, []);
      useEffect(() => {
        let listenerHandle;
        const setup = async () => {
          if (window.Capacitor?.Plugins?.App) {
            listenerHandle = await window.Capacitor.Plugins.App.addListener('backButton', () => {
              goBack();
            });
          }
        };
        setup();
        return () => { if (listenerHandle?.remove) listenerHandle.remove(); };
      }, []);
      const theme = useMemo(() => {
        const palette = COLOR_MODES[settings.colorMode] || COLOR_MODES.oled;
        return { accent: palette.accent, accentSoft: palette.accentSoft };
      }, [settings.colorMode]);
      useEffect(() => {
        const rootEl = document.documentElement;
        const palette = COLOR_MODES[settings.colorMode] || COLOR_MODES.oled;
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
        const fontSize = settings.fontSize === 'small' ? '14px' : settings.fontSize === 'large' ? '18px' : '16px';
        rootEl.style.fontSize = fontSize;
        document.body.classList.toggle('light-mode', settings.colorMode === 'light');
        document.body.classList.toggle('oled-mode', settings.colorMode === 'oled');
      }, [settings.colorMode, settings.fontSize]);
      const liveLookups = useMemo(() => buildDataLookups({ killers, survivors, perks, maps, builds }), [killers, survivors, perks, maps, builds]);
      const ownedState = useMemo(() => resolveOwnedState({ progression, killers, survivors, perks }), [progression, killers, survivors, perks]);
      const visibleKillers = useMemo(() => settings.ownedOnlyGlobal ? killers.filter(killer => ownedState.isCharacterOwned(killer.id)) : killers, [settings.ownedOnlyGlobal, killers, ownedState]);
      const visibleSurvivors = useMemo(() => settings.ownedOnlyGlobal ? survivors.filter(survivor => ownedState.isCharacterOwned(survivor.id)) : survivors, [settings.ownedOnlyGlobal, survivors, ownedState]);
      const visiblePerks = useMemo(() => settings.ownedOnlyGlobal ? perks.filter(perk => ownedState.isPerkOwned(perk.id)) : perks, [settings.ownedOnlyGlobal, perks, ownedState]);
      const visibleAddons = useMemo(() => settings.ownedOnlyGlobal ? addons.filter(addon => addon.role !== 'killer' || ownedState.isAddonOwned(addon)) : addons, [settings.ownedOnlyGlobal, addons, ownedState]);
      const buildsByOwner = useMemo(() => {
        const bucket = {};
        (builds || []).forEach(b => {
          if (!b.characterName) return;
          bucket[b.characterName] = bucket[b.characterName] || [];
          bucket[b.characterName].push(b);
        });
        return bucket;
      }, [builds]);
      const getEntityNote = (type, id) => {
        if (!id) return '';
        return notes[getNoteKey(type, id)] || '';
      };
      const setEntityNote = (type, id, value) => {
        if (!id) return;
        setNotes(prev => {
          const key = getNoteKey(type, id);
          const next = { ...prev };
          if ((value || '').trim()) {
            next[key] = value;
          } else {
            delete next[key];
          }
          return next;
        });
      };
      const markBuildUsed = (id) => setBuilds(prev => prev.map(b => b.id === id ? { ...b, lastUsedAt: new Date().toISOString() } : b));
      const quickAddMatch = (entry) => {
        const now = new Date().toISOString();
        const record = createMatchSnapshot({ ...entry, createdAt: entry.createdAt || now, updatedAt: now }, liveLookups);
        setMatches(prev => [record, ...prev]);
        if (record.buildId) markBuildUsed(record.buildId);
      };
      const websiteBackupPayload = useMemo(() => createWebsiteBackupPayload({
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
      const websiteBackupSummary = useMemo(() => summarizeWebsiteBackupPayload(websiteBackupPayload), [websiteBackupPayload]);
      const copyWebsiteBackup = useCallback(() => {
        const text = JSON.stringify(websiteBackupPayload, null, 2);
        if (!navigator.clipboard?.writeText) {
          alert('Copy is not available here. Use Download Backup File instead.');
          return;
        }
        navigator.clipboard.writeText(text)
          .then(() => alert('Backup copied.'))
          .catch(() => alert('Could not copy the backup. Use Download Backup File instead.'));
      }, [websiteBackupPayload]);
      const downloadWebsiteBackup = useCallback(() => {
        const text = JSON.stringify(websiteBackupPayload, null, 2);
        downloadTextFile(buildBackupFilename(websiteBackupPayload), text);
      }, [websiteBackupPayload]);
      const restoreWebsiteBackup = useCallback((payload) => {
        const backupData = payload?.data && typeof payload.data === 'object' ? payload.data : {};
        const restoredSettings = normalizeSettings(backupData.settings);
        const restoredBuilds = Array.isArray(backupData.builds) ? backupData.builds : [];
        const restoredProgression = normalizeProgression(backupData.progression);
        const restoredNotes = normalizeNotesStore(backupData.notes);
        const restoredWorldle = normalizeWorldleState(backupData.worldle);
        const restoredPrefs = normalizeMatchPrefs(backupData.lastContext);
        const restoredLookups = buildDataLookups({ killers, survivors, perks, maps, builds: restoredBuilds });
        const restoredMatches = normalizeMatchRecords(backupData.matches, restoredLookups);
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
      const touchStartRef = useRef(null);
      const navOrder = ['home', 'favorites'];
      const isAnyOverlayOpen = !!(drawerOpen || layoutMap || previewPerk || showCompareModal);
      const handleTouchStart = (e) => {
        if (!e.touches || e.touches.length !== 1) {
          touchStartRef.current = null;
          return;
        }
        touchStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        };
      };
      const handleTouchEnd = (e) => {
        const start = touchStartRef.current;
        touchStartRef.current = null;
        if (!start) return;
        if (isAnyOverlayOpen) return;
        const target = e.target;
        if (target && target.closest && target.closest('input, textarea, select, [data-no-swipe], table.cx-wikitable, .overflow-x-auto, .nav-scroll')) return;
        const touchEnd = {
          x: e.changedTouches[0].clientX,
          y: e.changedTouches[0].clientY
        };
        const diffX = start.x - touchEnd.x;
        const diffY = start.y - touchEnd.y;
        const minSwipe = 100;
        const isHorizontalSwipe = Math.abs(diffX) > minSwipe && Math.abs(diffX) > Math.abs(diffY) * 1.5;
        if (isHorizontalSwipe) {
          const currentIndex = navOrder.indexOf(currentView);
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
      const renderContent = () => {
        switch (currentView) {
          case 'home': return <HomeView setView={setView} data={{ killers: visibleKillers, survivors: visibleSurvivors, perks: visiblePerks }} theme={theme} builds={builds} maps={maps} challenges={progression?.challenges || []} setBuildSeed={setBuildSeed} perks={visiblePerks} items={items} addons={visibleAddons} offerings={offerings} cosmeticsCatalog={cosmeticsCatalogForDisplay} allCharacters={[...killers, ...survivors]} onOpenCharacterProfile={openCharacterArticle} settings={settings} />;
          case 'progression':
            return (
              <ProgressionView
                onBack={() => setView('home')}
                onGoTo={setView}
                killers={killers}
                survivors={survivors}
                perks={perks}
                progression={progression}
                setProgression={setProgression}
                builds={builds}
                matches={matches}
                prefs={matchPrefs}
                settings={settings}
                setSettings={setSettings}
                initialTab={viewContext.tab || 'achievements'}
                maps={maps}
              />
            );
          case 'worldle':
            return <WorldleView onBack={() => setView('home')} killers={killers} perks={perks} worldleState={worldleState} setWorldleState={setWorldleState} isCompactLayout={device.width <= 640} />;
          case 'cosmetics':
            return <CosmeticsView onBack={() => setView('home')} cosmeticsCatalog={cosmeticsCatalogForDisplay} onOpenCosmetic={openCosmeticProfile} fullSetPackState={cosmeticsFullSetPackState} fullSetCatalogCount={fullSetCatalogCount} onRefreshFullSetPack={refreshCosmeticsFullSetPack} cosmeticsAssetRevision={cosmeticsAssetRevision} />;
          case 'buildLab':
          case 'builds':
            return (
              <BuildPlannerView
                builds={builds}
                setBuilds={setBuilds}
                perks={visiblePerks}
                killers={visibleKillers}
                survivors={visibleSurvivors}
                items={items}
                addons={visibleAddons}
                offerings={offerings}
                templates={settings.showTemplates ? PREMADE_BUILDS : []}
                onBack={() => setView('home')}
                seed={buildSeed}
                clearSeed={() => setBuildSeed(null)}
                setRoleContext={(role) => setMatchPrefs(p => ({ ...p, lastRole: role }))}
              />
            );
          case 'matches':
            return <MatchLogView onBack={() => setView('home')} matches={matches} setMatches={setMatches} killers={killers} survivors={survivors} builds={builds} maps={maps} prefs={matchPrefs} setPrefs={setMatchPrefs} onBuildUsed={markBuildUsed} onOpenAnalytics={() => setView('progression', { tab: 'analytics' })} />;
          case 'killer':
          case 'survivor': {
            const isKillerView = currentView === 'killer';
            const articleList = isKillerView ? killers : survivors;
            const article = allCharactersById.get(viewContext.id) || articleList.find(c => c.id === viewContext.id) || null;
            if (!article) return (
              <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
                <div className="cx-article w-full max-w-[1280px] mx-auto min-h-full">
                  <h1 className="cx-title">Unknown article</h1>
                  <p className="cx-hatnote">The requested character could not be found.</p>
                  <p><button type="button" className="cx-alink" onClick={() => setView('home')}>Return to the Main page</button>.</p>
                </div>
              </div>
            );
            return <CharacterArticleView character={article} roleCount={articleList.length} cosmeticFocusId={viewContext.cosmeticId || null} scrollSection={viewContext.scroll || null} onHome={() => setView('home')} onOpenList={() => setView(isKillerView ? 'killers' : 'survivors')} onOpenTimeline={() => setView('timeline')} onOpenCommunity={() => setView('communityContent')} allPerks={perks} onPerkTap={openPerkArticle} theme={theme} settings={settings} noteValue={isKillerView ? getEntityNote('killer', article.id) : ''} onNoteChange={(value) => { if (isKillerView) setEntityNote('killer', article.id, value); }} cosmeticsByBaseId={cosmeticsByBaseId} allAddons={addons} />;
          }
          case 'realm': {
            const realm = (realms || []).find(r => r.id === viewContext.id) || null;
            if (!realm) return (
              <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
                <div className="cx-article w-full max-w-[1280px] mx-auto min-h-full">
                  <h1 className="cx-title">Unknown article</h1>
                  <p className="cx-hatnote">The requested realm could not be found.</p>
                  <p><button type="button" className="cx-alink" onClick={() => setView('home')}>Return to the Main page</button>.</p>
                </div>
              </div>
            );
            return <RealmArticleView realm={realm} maps={maps} killers={killers} survivors={survivors} perks={perks} releases={TIMELINE_DATA.releases} onHome={() => setView('home')} onOpenList={() => setView('realms')} onOpenTimeline={() => setView('timeline')} onOpenRelease={openReleaseArticle} onOpenCharacter={openCharacterArticle} onViewLayout={setLayoutMap} noteValue={getEntityNote('realm', realm.id)} onNoteChange={(value) => setEntityNote('realm', realm.id, value)} scrollSection={viewContext.scroll || null} />;
          }
          case 'release': {
            const release = (TIMELINE_DATA.releases || []).find(r => r.id === viewContext.id) || null;
            if (!release) return (
              <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
                <div className="cx-article w-full max-w-[1280px] mx-auto min-h-full">
                  <h1 className="cx-title">Unknown article</h1>
                  <p className="cx-hatnote">The requested release could not be found.</p>
                  <p><button type="button" className="cx-alink" onClick={() => setView('home')}>Return to the Main page</button>.</p>
                </div>
              </div>
            );
            return <ReleaseArticleView release={release} releases={TIMELINE_DATA.releases} realms={realms} killers={killers} survivors={survivors} perks={perks} maps={maps} onHome={() => setView('home')} onOpenList={() => setView('timeline')} onOpenCharacter={openCharacterArticle} onOpenRelease={openReleaseArticle} onOpenRealm={openRealmArticle} scrollSection={viewContext.scroll || null} />;
          }
          case 'perk': {
            const perk = (perks || []).find(x => x.id === viewContext.id) || null;
            if (!perk) return (
              <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
                <div className="cx-article w-full max-w-[1280px] mx-auto min-h-full">
                  <h1 className="cx-title">Unknown article</h1>
                  <p className="cx-hatnote">The requested perk could not be found.</p>
                  <p><button type="button" className="cx-alink" onClick={() => setView('home')}>Return to the Main page</button>.</p>
                </div>
              </div>
            );
            return <PerkArticleView perk={perk} perks={perks} killers={killers} survivors={survivors} onHome={() => setView('home')} onOpenList={() => setView('perks')} onOpenCharacter={openCharacterArticle} onOpenPerk={openPerkArticle} noteValue={getEntityNote('perk', perk.id)} onNoteChange={(value) => setEntityNote('perk', perk.id, value)} settings={settings} scrollSection={viewContext.scroll || null} />;
          }
          case 'killers': return <ListView allCharacters={[...killers, ...survivors]} data={visibleKillers} type="Killers" activeFilter="All" setActiveFilter={() => { }} allPerks={perks} setView={setView} onPerkSelect={setPerkSearch} initialSearch={viewContext.search || ''} buildsByOwner={buildsByOwner} onCreateBuildSeed={setBuildSeed} onBack={() => setView('home')} onShowLore={openCharacterArticle} onShowPower={openCharacterArticle} favoritePerks={settings.favoriteKillers || []} onToggleFavorite={(id) => toggleFavorite('Killer', id)} onViewProfile={openCharacterArticle} settings={settings} />;
          case 'survivors': return <ListView allCharacters={[...killers, ...survivors]} data={visibleSurvivors} type="Survivors" activeFilter="All" setActiveFilter={() => { }} allPerks={perks} setView={setView} onPerkSelect={setPerkSearch} initialSearch={viewContext.search || ''} buildsByOwner={buildsByOwner} onCreateBuildSeed={setBuildSeed} onBack={() => setView('home')} onShowLore={openCharacterArticle} favoritePerks={settings.favoriteSurvivors || []} onToggleFavorite={(id) => toggleFavorite('Survivor', id)} onViewProfile={openCharacterArticle} settings={settings} />;
          case 'perks': return <ListView allCharacters={[...killers, ...survivors]} data={visiblePerks} type="Perks" filterOptions={['All', 'Survivor', 'Killer', 'Favorites', 'Exhaustion', 'Hex', 'Boon', 'Scourge', 'Obsession', 'Aura', 'Stealth', 'Gen', 'Healing']} activeFilter={perkFilter} setActiveFilter={setPerkFilter} initialSearch={perkSearch} onSearchChange={setPerkSearch} onBack={() => setView('home')} comparePerks={comparePerks} onPerkLongPress={togglePerkCompare} favoritePerks={settings.favoritePerks || []} onToggleFavorite={toggleFavoritePerk} onPerkTap={openPerkArticle} onPerkPreview={setPreviewPerk} settings={settings} />;
          case 'roulette': return <ChaosShuffleView onBack={() => setView('home')} perks={visiblePerks} killers={visibleKillers} survivors={visibleSurvivors} items={items} addons={visibleAddons} offerings={offerings} settings={settings} ownedOnlyGlobal={settings.ownedOnlyGlobal === true} />;
          case 'realms': return <RealmsView onBack={() => setView('home')} maps={maps} realms={realms} onViewLayout={setLayoutMap} onOpenRealm={openRealmArticle} initialSearch={viewContext.search || ''} />;
          case 'glossary': return <GlossaryView onBack={() => setView('home')} />;
          case 'prestige': return <PrestigeCalculatorView onBack={() => setView('home')} />;
          case 'gameIcons': return <GameIconsView onBack={() => setView('home')} theme={theme} />;
          case 'items': return <ItemsView onBack={() => setView('home')} items={items} addons={visibleAddons} killers={visibleKillers} settings={settings} initialSearch={viewContext.search || ''} initialMode={viewContext.mode || 'survivor'} initialTargetId={viewContext.targetId || ''} initialTargetType={viewContext.targetType || ''} favoriteItems={settings.favoriteItems || []} favoriteAddons={settings.favoriteAddons || []} onToggleFavoriteItem={(id) => toggleFavorite('Item', id)} onToggleFavoriteAddon={(id) => toggleFavorite('Addon', id)} />;
          case 'offerings': return <OfferingsView onBack={() => setView('home')} offerings={offerings} initialSearch={viewContext.search || ''} initialTargetId={viewContext.targetId || ''} favoriteOfferings={settings.favoriteOfferings || []} onToggleFavoriteOffering={(id) => toggleFavorite('Offering', id)} />;
          case 'communityContent':
          case 'quotes':
            return <CommunityContentView onBack={() => setView('home')} communityContent={communityContent} />;
          case 'timeline': return <TimelineView onBack={() => setView('home')} setView={setView} killers={killers} survivors={survivors} theme={theme} />;
          case 'settings': return <SettingsView onBack={() => setView('home')} settings={settings} setSettings={setSettings} backupSummary={websiteBackupSummary} onCopyBackup={copyWebsiteBackup} onDownloadBackup={downloadWebsiteBackup} onRestoreBackup={restoreWebsiteBackup} isMobile={device.isMobile} />;
          case 'favorites': return <FavoritesView onBack={() => setView('home')} settings={settings} killers={killers} survivors={survivors} perks={perks} items={items} addons={addons} offerings={offerings} toggleFavorite={toggleFavorite} setView={setView} onPerkTap={openPerkArticle} />;
          default: return <HomeView setView={setView} data={{ killers: visibleKillers, survivors: visibleSurvivors, perks: visiblePerks }} theme={theme} builds={builds} maps={maps} challenges={progression?.challenges || []} setBuildSeed={setBuildSeed} perks={visiblePerks} items={items} addons={visibleAddons} offerings={offerings} cosmeticsCatalog={cosmeticsCatalogForDisplay} allCharacters={[...killers, ...survivors]} onOpenCharacterProfile={openCharacterArticle} settings={settings} />;
        }
      };
      return (
        <div
          data-smoke-ready="true"
          data-smoke-view={currentView}
          className={`site-shell website-shell flex flex-col h-screen w-full text-slate-100 overflow-hidden relative ${device.isMobile && settings.googlePlayCtaHidden !== true ? 'mobile-app-cta-visible' : ''}`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {!device.isMobile && <WikiHeader currentView={currentView} setView={setView} />}
          <SiteFooter currentView={currentView} />
          {device.isMobile && <WebsiteHeader currentView={currentView} setView={setView} onOpenDrawer={() => setDrawerOpen(true)} titleOverride={(currentView === 'killer' || currentView === 'survivor') && viewContext.id && allCharactersById.get(viewContext.id) ? allCharactersById.get(viewContext.id).name : (currentView === 'realm' && viewContext.id && (realms || []).find(r => r.id === viewContext.id) ? (realms || []).find(r => r.id === viewContext.id).name : (currentView === 'release' && viewContext.id && (TIMELINE_DATA.releases || []).find(r => r.id === viewContext.id) ? (TIMELINE_DATA.releases || []).find(r => r.id === viewContext.id).name : (currentView === 'perk' && viewContext.id && (perks || []).find(x => x.id === viewContext.id) ? (perks || []).find(x => x.id === viewContext.id).name : null)))} />}
          <div className="website-workspace relative z-10 flex-1 min-h-0 flex">
            {!device.isMobile && <Navigation currentView={currentView} setView={setView} theme={theme} isMobile={false} onPerksReset={() => setPerkSearch('')} customNavItems={DEFAULT_SETTINGS.navItems} />}
            <main ref={mainRef} className="website-main relative flex-1 min-w-0 overflow-hidden"><div key={currentView} className="view-transition h-full">{renderContent()}</div></main>
          </div>
          {device.isMobile && (
            <SectionDrawer open={drawerOpen} currentView={currentView} onBrowse={(id) => { setDrawerOpen(false); setView(id); }} onClose={() => setDrawerOpen(false)} />
          )}
          <ScrollToTopFAB mainRef={mainRef} currentView={currentView} />
          {device.isMobile && (
            <div className="fixed bottom-0 left-0 w-full z-[55] px-2 sm:px-6 pb-2 sm:pb-5 flex flex-col items-center gap-2 nav-safe-area">
              {settings.googlePlayCtaHidden !== true && <PlayStoreFooter compact onDismiss={() => setSettings(prev => ({ ...prev, googlePlayCtaHidden: true }))} />}
              <AppToolbar
                currentView={currentView}
                drawerOpen={drawerOpen}
                onSearch={() => setView('home')}
                onSections={() => { setDrawerOpen(true); triggerHaptic('Light'); }}
                onSaved={() => setView('favorites')}
                onSettings={() => setView('settings')}
              />
            </div>
          )}
          {/* Perk Comparison UI */}
          <FloatingCompareBadge count={comparePerks.length} onClick={() => setShowCompareModal(true)} onClear={clearCompare} theme={theme} />
          {showCompareModal && (
            <PerkCompareModal
              perks={comparePerks}
              onClose={() => setShowCompareModal(false)}
              onRemove={togglePerkCompare}
              theme={theme}
              settings={settings}
            />
          )}
          {/* Map Layout Modal */}
          {layoutMap && (
            <MapLayoutModal
              map={layoutMap}
              onClose={() => setLayoutMap(null)}
              noteValue={getEntityNote('map', layoutMap?.id)}
              onNoteChange={(value) => setEntityNote('map', layoutMap?.id, value)}
            />
          )}
          {/* Bottom Sheet for perk details */}
          {previewPerk && (
            <ImageLightbox
              src={`./${previewPerk.image}`}
              alt={previewPerk.name}
              meta={[previewPerk.owner, previewPerk.type].filter(Boolean).join(' · ')}
              fit="icon"
              onClose={() => setPreviewPerk(null)}
            />
          )}
        </div>
      );
    };
    class ErrorBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
      }
      static getDerivedStateFromError(error) {
        return { hasError: true, error };
      }
      componentDidCatch(error, info) {
        console.error('[ErrorBoundary]', error, info);
        window.__hideLaunchOverlay?.(true);
      }
      render() {
        if (this.state.hasError) {
          return (
            <div style={{ padding: 40, textAlign: 'center', color: '#e5e7eb', background: '#090b11', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700 }}>Something went wrong</h2>
              <p style={{ color: '#71717a', fontSize: 14 }}>{this.state.error?.message || 'An unexpected error occurred.'}</p>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                style={{ marginTop: 8, padding: '10px 24px', borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#e5e7eb', cursor: 'pointer', fontSize: 14 }}
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{ padding: '10px 24px', borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#e5e7eb', cursor: 'pointer', fontSize: 14 }}
              >
                Reload App
              </button>
              <button
                onClick={() => {
                  try {
                    Object.keys(localStorage)
                      .filter((key) => key.startsWith('dbd_'))
                      .forEach((key) => localStorage.removeItem(key));
                  } catch (e) { }
                  window.location.reload();
                }}
                style={{ padding: '10px 24px', borderRadius: 12, background: 'rgba(225,29,72,0.15)', border: '1px solid rgba(225,29,72,0.4)', color: '#fda4af', cursor: 'pointer', fontSize: 14 }}
              >
                Clear Saved Data &amp; Reload
              </button>
            </div>
          );
        }
        return this.props.children;
      }
    }
    window.addEventListener('error', (event) => {
      console.error('[window.onerror]', event?.message, event?.filename, event?.lineno);
    });
    window.addEventListener('unhandledrejection', (event) => {
      console.error('[unhandledrejection]', event?.reason);
    });
    if (typeof DATABASE === 'undefined') {
      document.getElementById('root').innerHTML = '<div style="padding:40px;text-align:center;color:#e5e7eb;background:#090b11;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;font-family:sans-serif"><h2 style="font-size:22px;font-weight:700">Game data failed to load</h2><p style="color:#71717a;font-size:14px">The offline database did not load. Reload the page or clear your browser data, then try again.</p></div>';
      window.__hideLaunchOverlay?.(true);
    } else {
    const root = ReactDOM.createRoot(document.getElementById("root"));
    root.render(<ErrorBoundary><App /></ErrorBoundary>);
    }
