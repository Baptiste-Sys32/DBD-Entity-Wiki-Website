/* DBD game adapter - registries consumed by the wiki engine (nav options, sections, browse shortlist, favorites, links, meta). Loaded as text/babel after engine/, before the game bundle. */
    const META = {
      siteVersion: "5.34.2",
      gameVersion: "10.1.2",
      lastSynced: "September 12, 2026",
      contact: {
        email: "hexplosions.happen@gmail.com",
        discord: "hexplosions_happen"
      },
      thanks: [
        "Hens333 - High quality map layouts",
        "Claude - Research and support",
        "Codex - Feedback and polish",
        "Steam Community - Map layout guides",
        "DBD Fandom Wiki - Game data and assets",
        "DBD public sources - up-to-date game info"
      ]
    };
    const PLAY_STORE_LINKS = {
      en: 'https://play.google.com/store/apps/details?id=com.theentity.wiki&hl=en',
      fr: 'https://play.google.com/store/apps/details?id=com.theentity.wiki&hl=fr'
    };
    const GOOGLE_PLAY_BADGES = {
      en: 'https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png',
      fr: 'https://play.google.com/intl/fr_fr/badges/static/images/badges/fr_badge_web_generic.png'
    };
    const ALL_NAV_OPTIONS = [
      { id: 'perks', label: 'Perks' },
      { id: 'buildLab', label: 'Builds' },
      { id: 'roulette', label: 'Shuffle' },
      { id: 'worldle', label: 'Wordle' },
      { id: 'progression', label: 'Progression' },
      { id: 'communityContent', label: 'Community' },
      { id: 'cosmetics', label: 'Cosmetics' },
      { id: 'favorites', label: 'Favorites' },
      { id: 'killers', label: 'Killers' },
      { id: 'survivors', label: 'Survivors' },
      { id: 'items', label: 'Items' },
      { id: 'offerings', label: 'Offerings' },
      { id: 'matches', label: 'Matches' },
      { id: 'realms', label: 'Realms' },
      { id: 'glossary', label: 'Glossary' },
      { id: 'prestige', label: 'Prestige' },
    ];
    const NAV_ICON_MAP = {
      home: 'Search',
      perks: 'BookOpen',
      buildLab: 'Wrench',
      roulette: 'Dices',
      worldle: 'Notepad',
      progression: 'Target',
      communityContent: 'MessageCircle',
      cosmetics: 'Shirt',
      favorites: 'Star',
      killers: 'Sword',
      survivors: 'Heart',
      lobby: 'Home',
      matches: 'List',
      realms: 'Map',
      items: 'Package',
      offerings: 'Flame',
      glossary: 'GraduationCap',
      prestige: 'Droplet',
      settings: 'Gear',
      timeline: 'Clock',
    };
    const MAIN_PAGE_TOOLS = {
      buildLab: { id: 'buildLab', label: 'Build Lab', desc: 'Craft and save loadouts' },
      roulette: { id: 'roulette', label: 'Chaos Shuffle', desc: 'Randomize perk combos' },
      worldle: { id: 'worldle', label: 'Wordle', desc: 'Daily and practice DBD guessing games' },
      prestige: { id: 'prestige', label: "Entity's Offering", desc: 'BP calculator for prestiges' },
      matches: { id: 'matches', label: 'Match Log', desc: 'Track matches & notes' },
      progression: { id: 'progression', label: 'Progression Hub', desc: 'Achievements, roster, challenges and analytics' },
      favorites: { id: 'favorites', label: 'My Favorites', desc: 'All your bookmarked content' },
      import: { id: 'import', label: 'Import Build', desc: 'Paste a shared build text' },
      settings: { id: 'settings', label: 'Settings', desc: 'Preferences and backups' }
    };
    const WEBSITE_NAV_SECTIONS = [
      { label: 'Characters', ids: ['killers', 'survivors'] },
      { label: 'Loadout', ids: ['perks', 'items', 'offerings', 'cosmetics'] },
      { label: 'World', ids: ['realms', 'timeline', 'glossary', 'gameIcons'] },
      { label: 'Tools', ids: ['buildLab', 'roulette', 'worldle', 'prestige'] },
      { label: 'Tracking', ids: ['progression', 'matches', 'favorites'] },
      { label: 'Community', ids: ['communityContent', 'settings'] }
    ];
    const NAV_EXTRA_LABELS = { gameIcons: 'Game Icons', import: 'Import Build' };
    const getNavDisplayLabel = (id) => {
      if (id === 'home') return 'Search';
      if (id === 'settings') return 'Settings';
      if (id === 'timeline') return 'Chronicle';
      return NAV_EXTRA_LABELS[id] || ALL_NAV_OPTIONS.find((option) => option.id === id)?.label || id;
    };
    const BROWSE_SHORTLIST = [
      { id: 'home', label: 'Home' },
      { id: 'killers', label: 'Killers' },
      { id: 'survivors', label: 'Survivors' },
      { id: 'perks', label: 'Perks' },
      { id: 'items', label: 'Items & Add-ons' },
      { id: 'offerings', label: 'Offerings' },
      { id: 'cosmetics', label: 'Cosmetics' },
      { id: 'realms', label: 'Realms & Maps' },
      { id: 'timeline', label: 'Timeline' },
      { id: 'glossary', label: 'Glossary' },
      { id: 'gameIcons', label: 'Game Icons' },
      { id: 'buildLab', label: 'Build Lab' },
      { id: 'roulette', label: 'Chaos Shuffle' },
      { id: 'worldle', label: 'Worldle' },
      { id: 'matches', label: 'Match Log' },
      { id: 'progression', label: 'Progression' },
      { id: 'prestige', label: 'Prestige Calculator' },
      { id: 'communityContent', label: 'Community' },
      { id: 'favorites', label: 'Favorites' },
      { id: 'settings', label: 'Settings' },
    ];
    const FAVORITE_KEYS = {
      Perk: 'favoritePerks', Killer: 'favoriteKillers', Survivor: 'favoriteSurvivors',
      Item: 'favoriteItems', Addon: 'favoriteAddons', Offering: 'favoriteOfferings'
    };
    const PROGRESSION_TABS = ['achievements', 'roster', 'challenges', 'analytics'];
    const DEFAULT_SETTINGS = {
      settingsVersion: 2,
      colorMode: 'oled',
      fontSize: 'default',
      perkDescriptionMode: 'post95',
      showTemplates: true,
      rarityGlows: true,
      hapticEnabled: true,
      ownedOnlyGlobal: false,
      googlePlayCtaHidden: false,
      progressionTabOrder: [...PROGRESSION_TABS],
      navItemsCustomized: false,
      navItems: ['perks', 'killers', 'survivors'],
      favoritePerks: [],
      favoriteKillers: [],
      favoriteSurvivors: [],
      favoriteItems: [],
      favoriteAddons: [],
      favoriteOfferings: []
    };
    const RARITY_ALIASES = {
      'iri': 'iridescent', 'iridescent': 'iridescent', 'pink': 'iridescent', 'ultra': 'iridescent', 'ultra rare': 'iridescent',
      'purple': 'veryrare', 'very rare': 'veryrare', 'veryrare': 'veryrare',
      'green': 'rare', 'rare': 'rare',
      'yellow': 'uncommon', 'uncommon': 'uncommon',
      'brown': 'common', 'common': 'common',
      'event': 'event'
    };
    const RARITY_ORDER = { common: 1, uncommon: 2, rare: 3, veryrare: 4, ultrarare: 5, visceral: 6, event: 7 };
    const getRarityOrder = (r) => RARITY_ORDER[(r || '').toLowerCase()] || 0;
    const getRarityColor = (rarity) => {
      switch ((rarity || '').toLowerCase()) {
        case 'common': return 'var(--rar-common)';
        case 'uncommon': return 'var(--rar-uncommon)';
        case 'rare': return 'var(--rar-rare)';
        case 'veryrare': return 'var(--rar-veryrare)';
        case 'ultrarare': return 'var(--rar-ultrarare)';
        case 'visceral': return 'var(--rar-visceral)';
        case 'event': return 'var(--rar-event)';
        default: return 'var(--rar-common)';
      }
    };
    const formatRarity = (rarity) => {
      const r = (rarity || '').toLowerCase();
      switch (r) {
        case 'veryrare': return 'Very Rare';
        case 'ultrarare': return 'Ultra Rare';
        default: return r.charAt(0).toUpperCase() + r.slice(1);
      }
    };
    const ARTICLE_VIEWS = ['killer', 'survivor', 'realm', 'release', 'perk'];
    const resolveCharacterView = (entity) => ((entity && (entity.type === 'Killer' || entity.power)) ? 'killer' : 'survivor');
    const SEO_SUFFIX = " - The Entity's Wiki";
    const SEO_DEFAULT_TITLE = "The Entity's Wiki - Dead by Daylight Database";
    const SEO_SITE_BASE = 'https://entity-wiki.pages.dev';
    const SEO_VIEW_LABELS = {
      killers: 'Killers', survivors: 'Survivors', perks: 'Perks', items: 'Items & Addons',
      offerings: 'Offerings', realms: 'Realms', timeline: 'Timeline', glossary: 'Glossary',
      gameIcons: 'Game Icons', cosmetics: 'Cosmetics', communityContent: 'Community',
      settings: 'Settings', builds: 'Builds', buildLab: 'Build Lab', roulette: 'Shuffle',
      worldle: 'Wordle', prestige: 'Prestige', progression: 'Progression', matches: 'Matches',
      favorites: 'Favorites'
    };
    const DEFAULT_IMAGES = {
      Killer: './assets/default-killer.png',
      Survivor: './assets/default-survivor.png',
      Perk: './assets/default-perk.svg',
      Map: './assets/default-map.svg'
    };
    const IMAGE_LOCAL_PREFIXES = ['dbd_images/', 'assets/'];
