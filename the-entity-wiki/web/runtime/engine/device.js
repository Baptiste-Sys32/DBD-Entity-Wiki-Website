function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
var useDeviceProfile = () => {
  var readProfile = () => {
    var _window$matchMedia, _window, _window$matchMedia2, _window2;
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        width: 1024
      };
    }
    var coarse = (_window$matchMedia = (_window = window).matchMedia) === null || _window$matchMedia === void 0 ? void 0 : _window$matchMedia.call(_window, '(pointer: coarse)').matches;
    var narrow = (_window$matchMedia2 = (_window2 = window).matchMedia) === null || _window$matchMedia2 === void 0 ? void 0 : _window$matchMedia2.call(_window2, '(max-width: 768px)').matches;
    return {
      isMobile: Boolean(coarse || narrow),
      width: window.innerWidth || 0
    };
  };
  var [profile, setProfile] = useState(readProfile);
  useEffect(() => {
    var _coarseQuery$addListe, _narrowQuery$addListe;
    var update = () => setProfile(readProfile());
    var coarseQuery = window.matchMedia ? window.matchMedia('(pointer: coarse)') : null;
    var narrowQuery = window.matchMedia ? window.matchMedia('(max-width: 768px)') : null;
    window.addEventListener('resize', update);
    coarseQuery !== null && coarseQuery !== void 0 && coarseQuery.addEventListener ? coarseQuery.addEventListener('change', update) : coarseQuery === null || coarseQuery === void 0 || (_coarseQuery$addListe = coarseQuery.addListener) === null || _coarseQuery$addListe === void 0 ? void 0 : _coarseQuery$addListe.call(coarseQuery, update);
    narrowQuery !== null && narrowQuery !== void 0 && narrowQuery.addEventListener ? narrowQuery.addEventListener('change', update) : narrowQuery === null || narrowQuery === void 0 || (_narrowQuery$addListe = narrowQuery.addListener) === null || _narrowQuery$addListe === void 0 ? void 0 : _narrowQuery$addListe.call(narrowQuery, update);
    return () => {
      var _coarseQuery$removeLi, _narrowQuery$removeLi;
      window.removeEventListener('resize', update);
      coarseQuery !== null && coarseQuery !== void 0 && coarseQuery.removeEventListener ? coarseQuery.removeEventListener('change', update) : coarseQuery === null || coarseQuery === void 0 || (_coarseQuery$removeLi = coarseQuery.removeListener) === null || _coarseQuery$removeLi === void 0 ? void 0 : _coarseQuery$removeLi.call(coarseQuery, update);
      narrowQuery !== null && narrowQuery !== void 0 && narrowQuery.removeEventListener ? narrowQuery.removeEventListener('change', update) : narrowQuery === null || narrowQuery === void 0 || (_narrowQuery$removeLi = narrowQuery.removeListener) === null || _narrowQuery$removeLi === void 0 ? void 0 : _narrowQuery$removeLi.call(narrowQuery, update);
    };
  }, []);
  return profile;
};
var GlassButton = _ref => {
  var {
    children,
    onClick,
    active,
    className = ''
  } = _ref;
  return React.createElement("button", {
    onClick: onClick,
    className: "relative px-5 py-2.5 rounded-2xl font-semibold text-sm transition-all duration-300 backdrop-blur-md glass-button ".concat(active ? 'glass-button--active translate-y-[-1px]' : 'hover:text-white hover:-translate-y-0.5', " ").concat(className)
  }, children);
};
var usePullToRefresh = function usePullToRefresh(onRefresh) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var {
    threshold = 80,
    resistance = 2.5
  } = options;
  var containerRef = useRef(null);
  var [pullDistance, setPullDistance] = useState(0);
  var [isRefreshing, setIsRefreshing] = useState(false);
  var startY = useRef(0);
  var isPulling = useRef(false);
  var handleTouchStart = e => {
    var container = containerRef.current;
    if (!container || container.scrollTop > 5) return;
    startY.current = e.touches[0].clientY;
    isPulling.current = true;
  };
  var handleTouchMove = e => {
    if (!isPulling.current || isRefreshing) return;
    var container = containerRef.current;
    if (!container || container.scrollTop > 5) {
      isPulling.current = false;
      setPullDistance(0);
      return;
    }
    var currentY = e.touches[0].clientY;
    var diff = (currentY - startY.current) / resistance;
    if (diff > 0) {
      setPullDistance(Math.min(diff, threshold * 1.5));
      if (diff > 10 && e.cancelable) e.preventDefault();
    }
  };
  var handleTouchEnd = function () {
    var _ref2 = _asyncToGenerator(function* () {
      if (!isPulling.current) return;
      isPulling.current = false;
      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        triggerHaptic('Medium');
        try {
          yield onRefresh === null || onRefresh === void 0 ? void 0 : onRefresh();
        } catch (e) {}
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 500);
      } else {
        setPullDistance(0);
      }
    });
    return function handleTouchEnd() {
      return _ref2.apply(this, arguments);
    };
  }();
  return {
    containerRef,
    pullDistance,
    isRefreshing,
    pullHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    }
  };
};
var PullIndicator = _ref3 => {
  var {
    pullDistance,
    threshold,
    isRefreshing
  } = _ref3;
  var progress = Math.min(pullDistance / threshold, 1);
  var rotation = progress * 180;
  if (pullDistance < 5 && !isRefreshing) return null;
  return React.createElement("div", {
    className: "absolute left-1/2 -translate-x-1/2 z-30 flex items-center justify-center transition-all duration-200",
    style: {
      top: Math.max(pullDistance - 40, 10),
      opacity: Math.min(progress + 0.3, 1)
    }
  }, React.createElement("div", {
    className: "w-10 h-10 rounded-full bg-zinc-800/90 backdrop-blur-md border border-white/10 flex items-center justify-center ".concat(isRefreshing ? 'animate-spin' : '')
  }, React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "text-white transition-transform",
    style: {
      transform: "rotate(".concat(isRefreshing ? 0 : rotation, "deg)")
    }
  }, React.createElement("path", {
    d: "M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"
  }), React.createElement("path", {
    d: "M21 3v5h-5"
  }))));
};
