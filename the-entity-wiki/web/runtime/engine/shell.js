function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var WikiHeaderSearchPortal = _ref => {
  var {
    children
  } = _ref;
  if (typeof document === 'undefined') return null;
  var slot = document.getElementById('wiki-header-search-slot');
  var isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
  if (isDesktop && slot) return ReactDOM.createPortal(children, slot);
  return React.createElement("div", {
    className: "sticky top-0 z-20 px-6 pb-4 pt-1 pointer-events-none"
  }, React.createElement("div", {
    className: "relative max-w-3xl mx-auto pointer-events-auto"
  }, children));
};
var AppToolbar = _ref2 => {
  var {
    currentView,
    drawerOpen,
    onSearch,
    onSections,
    onSaved,
    onSettings
  } = _ref2;
  var tabs = [{
    id: 'search',
    label: 'Search',
    Icon: Icons.Search,
    active: currentView === 'home',
    onTap: onSearch
  }, {
    id: 'sections',
    label: 'Sections',
    Icon: Icons.List,
    active: drawerOpen,
    onTap: onSections
  }, {
    id: 'saved',
    label: 'Saved',
    Icon: Icons.Bookmark,
    active: currentView === 'favorites',
    onTap: onSaved
  }, {
    id: 'settings',
    label: 'Settings',
    Icon: Icons.Gear,
    active: currentView === 'settings',
    onTap: onSettings
  }];
  return React.createElement("nav", {
    className: "apptoolbar",
    "aria-label": "App"
  }, tabs.map(_ref3 => {
    var {
      id,
      label,
      Icon,
      active,
      onTap
    } = _ref3;
    return React.createElement("button", {
      key: id,
      type: "button",
      onClick: onTap,
      "aria-label": label,
      className: active ? 'active' : ''
    }, React.createElement(Icon, {
      width: 22,
      height: 22,
      strokeWidth: active ? 2.3 : 2
    }), label, React.createElement("span", {
      className: "tb-dot",
      "aria-hidden": "true"
    }));
  }));
};
var SectionDrawer = _ref4 => {
  var {
    open,
    currentView,
    onBrowse,
    onClose
  } = _ref4;
  var closeRef = useRef(null);
  useEffect(() => {
    var _closeRef$current;
    if (!open) return undefined;
    (_closeRef$current = closeRef.current) === null || _closeRef$current === void 0 || _closeRef$current.focus();
    var onKey = e => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  var rows = BROWSE_SHORTLIST.map((s, i) => _objectSpread(_objectSpread({}, s), {}, {
    num: String(i + 1)
  }));
  return React.createElement(React.Fragment, null, React.createElement("div", {
    className: "cx-scrim ".concat(open ? 'cx-scrim--open' : ''),
    onClick: onClose,
    "aria-hidden": "true"
  }), React.createElement("nav", {
    className: "cx-drawer ".concat(open ? 'cx-drawer--open' : ''),
    "aria-label": "Sections",
    "aria-hidden": !open,
    "data-no-swipe": true
  }, React.createElement("div", {
    className: "cx-drawer-head"
  }, React.createElement("div", {
    className: "t"
  }, "Browse the wiki", React.createElement("small", null, "SECTIONS")), React.createElement("button", {
    type: "button",
    ref: closeRef,
    onClick: onClose,
    className: "cx-drawer-close",
    "aria-label": "Close sections"
  }, "\u2715")), React.createElement("div", {
    className: "cx-drawer-list"
  }, rows.map(row => React.createElement("button", {
    key: row.id,
    type: "button",
    className: currentView === row.id ? 'current' : '',
    onClick: () => onBrowse(row.id)
  }, React.createElement("span", {
    className: "n"
  }, row.num), React.createElement("span", {
    className: "lbl"
  }, row.label)))), React.createElement("div", {
    className: "cx-drawer-foot"
  }, "Browse the wiki indexes.")));
};
var Header = _ref5 => {
  var {
    title,
    subtitle,
    onBack,
    onScrollTop
  } = _ref5;
  return React.createElement("div", {
    className: "mb-6 sm:mb-8 px-2 flex items-center justify-between"
  }, React.createElement("div", {
    className: "flex items-center gap-3"
  }, onBack && React.createElement("button", {
    onClick: onBack,
    className: "mr-1 sm:mr-3 p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-all"
  }, React.createElement(Icons.ChevronLeft, {
    width: 22,
    height: 22
  })), React.createElement("div", {
    onClick: onScrollTop,
    className: onScrollTop ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
  }, React.createElement("h1", {
    className: "text-2xl sm:text-3xl font-bold text-white tracking-tight"
  }, title), React.createElement("p", {
    className: "text-sm text-slate-400 mt-1"
  }, subtitle))));
};
var ViewCrumbs = _ref6 => {
  var {
    trail = [],
    current
  } = _ref6;
  if (!current && (!trail || trail.length === 0)) return null;
  return React.createElement("nav", {
    className: "cx-crumbs flex items-center flex-wrap gap-x-1.5 gap-y-1 px-0.5 pb-1 text-[11.5px] leading-relaxed",
    "aria-label": "Breadcrumb"
  }, trail.map((crumb, index) => React.createElement("span", {
    key: "cx-crumb-".concat(index),
    className: "cx-crumbs__item inline-flex items-center gap-1.5 min-w-0"
  }, typeof crumb.onClick === 'function' ? React.createElement("button", {
    type: "button",
    onClick: crumb.onClick,
    className: "cx-crumbs__link text-zinc-500 hover:text-zinc-200 transition-colors font-medium truncate"
  }, crumb.label) : React.createElement("span", {
    className: "cx-crumbs__link text-zinc-500 font-medium truncate"
  }, crumb.label), React.createElement("span", {
    className: "cx-crumbs__sep text-zinc-700 select-none",
    "aria-hidden": "true"
  }, "\u203A"))), React.createElement("span", {
    className: "cx-crumbs__current text-zinc-100 font-bold truncate",
    "aria-current": "page"
  }, current));
};
var ScrollToTopFAB = _ref7 => {
  var {
    mainRef,
    currentView
  } = _ref7;
  var [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(false);
    var findScrollable = () => {
      if (!mainRef.current) return null;
      var el = mainRef.current.querySelector('.overflow-y-auto, [class*="overflow-y-auto"]');
      return el;
    };
    var scrollEl = null;
    var rafId = null;
    var onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        setVisible(scrollEl ? scrollEl.scrollTop > 400 : false);
      });
    };
    var tryAttach = () => {
      var el = findScrollable();
      if (el === scrollEl) return;
      if (scrollEl) scrollEl.removeEventListener('scroll', onScroll);
      scrollEl = el;
      if (scrollEl) {
        scrollEl.addEventListener('scroll', onScroll, {
          passive: true
        });
        onScroll();
      }
    };
    var timer = setTimeout(tryAttach, 100);
    var debounceTimer = null;
    var observer = new MutationObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(tryAttach, 150);
    });
    if (mainRef.current) observer.observe(mainRef.current, {
      childList: true,
      subtree: false
    });
    return () => {
      clearTimeout(timer);
      if (debounceTimer) clearTimeout(debounceTimer);
      if (rafId) cancelAnimationFrame(rafId);
      if (scrollEl) scrollEl.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, [currentView]);
  var handleClick = () => {
    if (!mainRef.current) return;
    var el = mainRef.current.querySelector('.overflow-y-auto, [class*="overflow-y-auto"]');
    if (el) el.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    triggerHaptic('Light');
  };
  return React.createElement("button", {
    onClick: handleClick,
    "aria-label": "Scroll to top",
    className: "fixed z-50 right-4 transition-all duration-300 ease-out",
    style: {
      bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px) + 12px)',
      opacity: visible ? 1 : 0,
      transform: visible ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(10px)',
      pointerEvents: visible ? 'auto' : 'none'
    }
  }, React.createElement("div", {
    className: "w-10 h-10 rounded-full bg-zinc-800/90 backdrop-blur border border-white/10 shadow-lg flex items-center justify-center hover:bg-zinc-700/90 active:scale-90 transition-all"
  }, React.createElement(Icons.ChevronLeft, {
    width: 18,
    height: 18,
    className: "text-zinc-300 rotate-90"
  })));
};
