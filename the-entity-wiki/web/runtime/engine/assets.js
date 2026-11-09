function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
var toLocalImageSource = url => {
  if (!url) return null;
  var normalized = String(url).replace(/\\/g, '/').replace(/^\.\//, '');
  if (typeof resolveExtraImageSource === 'function') {
    var extra = resolveExtraImageSource(normalized);
    if (extra !== undefined) return extra;
  }
  var prefixes = typeof IMAGE_LOCAL_PREFIXES !== 'undefined' && IMAGE_LOCAL_PREFIXES || ['assets/'];
  if (prefixes.some(prefix => normalized.startsWith(prefix))) return "./".concat(normalized);
  return null;
};
var resolveAppImageSource = function () {
  var _ref = _asyncToGenerator(function* (url) {
    if (!url) return null;
    var normalized = String(url).replace(/\\/g, '/').replace(/^\.\//, '');
    if (typeof resolveAsyncImageSource === 'function') {
      var resolved = yield resolveAsyncImageSource(normalized);
      if (resolved !== undefined) return resolved;
    }
    return toLocalImageSource(normalized);
  });
  return function resolveAppImageSource(_x) {
    return _ref.apply(this, arguments);
  };
}();
var getPreloadedImageCache = () => {
  if (!(window.__entityPreloadedImages instanceof Set)) {
    window.__entityPreloadedImages = new Set();
  }
  return window.__entityPreloadedImages;
};
var preloadResolvedImage = function () {
  var _ref2 = _asyncToGenerator(function* (imageUrl) {
    var _navigator$connection;
    var assetRevision = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    if (!imageUrl || (_navigator$connection = navigator.connection) !== null && _navigator$connection !== void 0 && _navigator$connection.saveData) return;
    var cache = getPreloadedImageCache();
    var cacheKey = "".concat(assetRevision, ":").concat(String(imageUrl));
    if (cache.has(cacheKey)) return;
    cache.add(cacheKey);
    var source = yield resolveAppImageSource(imageUrl);
    if (!source) return;
    yield new Promise(resolve => {
      var img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = source;
      if (typeof img.decode === 'function') {
        img.decode().then(resolve).catch(resolve);
      }
    });
  });
  return function preloadResolvedImage(_x2) {
    return _ref2.apply(this, arguments);
  };
}();
var preloadImageBatch = function preloadImageBatch() {
  var imageUrls = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  var assetRevision = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  var limit = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 16;
  var urls = [...new Set((imageUrls || []).filter(Boolean))].slice(0, limit);
  if (urls.length === 0) return () => {};
  var cancelled = false;
  var run = function () {
    var _ref3 = _asyncToGenerator(function* () {
      for (var url of urls) {
        if (cancelled) return;
        yield preloadResolvedImage(url, assetRevision);
      }
    });
    return function run() {
      return _ref3.apply(this, arguments);
    };
  }();
  var idleId = typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(run, {
    timeout: 1200
  }) : window.setTimeout(run, 250);
  return () => {
    cancelled = true;
    if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleId);else window.clearTimeout(idleId);
  };
};
var AssetFrame = _ref4 => {
  var {
    type,
    imageUrl,
    fallbackIcon,
    size = 'normal',
    assetRevision = 0,
    imageLoading = null
  } = _ref4;
  var [primarySource, setPrimarySource] = useState(null);
  var [broken, setBroken] = useState(false);
  var [loaded, setLoaded] = useState(false);
  var [sourceIndex, setSourceIndex] = useState(0);
  var defaultImg = DEFAULT_IMAGES[type];
  var sources = useMemo(() => {
    var entries = [];
    var add = val => {
      if (val && !entries.includes(val)) entries.push(val);
    };
    add(primarySource);
    add(toLocalImageSource(defaultImg));
    return entries;
  }, [primarySource, defaultImg]);
  useEffect(() => {
    var cancelled = false;
    setPrimarySource(null);
    setBroken(false);
    setLoaded(false);
    setSourceIndex(0);
    var resolveSource = function () {
      var _ref5 = _asyncToGenerator(function* () {
        var nextSource = yield resolveAppImageSource(imageUrl);
        if (!cancelled) {
          setPrimarySource(nextSource);
        }
      });
      return function resolveSource() {
        return _ref5.apply(this, arguments);
      };
    }();
    resolveSource();
    return () => {
      cancelled = true;
    };
  }, [imageUrl, type, assetRevision]);
  var diamondTypes = typeof IMAGE_DIAMOND_TYPES !== 'undefined' && IMAGE_DIAMOND_TYPES || ['Perk'];
  var isDiamond = diamondTypes.includes(type);
  var handleError = () => {
    var next = sourceIndex + 1;
    if (next < sources.length) {
      setSourceIndex(next);
    } else {
      setBroken(true);
    }
  };
  var handleLoad = () => {
    setLoaded(true);
  };
  var src = broken ? null : sources[sourceIndex];
  var containerClass = isDiamond ? 'w-16 h-16 rotate-45 m-2 rounded-lg' : 'w-16 h-20 rounded-xl';
  var imgClass = isDiamond ? '-rotate-45 scale-125' : '';
  if (size === 'large') {
    containerClass = isDiamond ? 'w-24 h-24 rotate-45 m-4 rounded-xl' : 'w-24 h-32 rounded-2xl';
  } else if (size === 'fill') {
    containerClass = 'w-full h-full rounded-none';
    imgClass = '';
  }
  var baseClasses = size === 'fill' ? "relative flex items-center justify-center overflow-hidden ".concat(containerClass) : "relative flex items-center justify-center bg-zinc-950/50 border border-white/10 overflow-hidden shrink-0 ".concat(containerClass);
  var containTypes = typeof IMAGE_CONTAIN_TYPES !== 'undefined' && IMAGE_CONTAIN_TYPES || ['Addon', 'Item', 'Offering', 'Power', 'GameIcon'];
  var objectFit = containTypes.includes(type) ? 'object-contain' : 'object-cover';
  return React.createElement("div", {
    className: baseClasses
  }, !loaded && !broken && src && React.createElement("div", {
    className: "absolute inset-0 skeleton-shimmer ".concat(isDiamond ? '' : 'rounded-xl')
  }), src && !broken ? React.createElement("img", {
    src: src,
    alt: type,
    loading: imageLoading || undefined,
    className: "w-full h-full ".concat(objectFit, " ").concat(imgClass, " ").concat(loaded ? 'opacity-100' : 'opacity-0', " transition-opacity duration-300"),
    onError: handleError,
    onLoad: handleLoad
  }) : React.createElement("div", {
    className: "flex items-center justify-center w-full h-full text-zinc-700 ".concat(isDiamond && size !== 'fill' ? '-rotate-45' : '')
  }, fallbackIcon ? fallbackIcon : React.createElement(Icons.Image, {
    width: size === 'large' ? 32 : 20,
    height: size === 'large' ? 32 : 20
  })), React.createElement("div", {
    className: "absolute inset-0 pointer-events-none",
    style: {
      boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)'
    }
  }));
};
