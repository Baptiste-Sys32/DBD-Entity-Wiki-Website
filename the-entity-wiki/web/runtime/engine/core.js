function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
var triggerHaptic = function () {
  var _ref = _asyncToGenerator(function* () {
    var style = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'Medium';
    try {
      var _window$Capacitor;
      var stored = localStorage.getItem('dbd_settings_v1');
      if (stored) {
        var s = JSON.parse(stored);
        if (s.hapticEnabled === false) return;
      }
      if ((_window$Capacitor = window.Capacitor) !== null && _window$Capacitor !== void 0 && (_window$Capacitor = _window$Capacitor.Plugins) !== null && _window$Capacitor !== void 0 && _window$Capacitor.Haptics) {
        yield window.Capacitor.Plugins.Haptics.impact({
          style
        });
      }
    } catch (e) {}
  });
  return function triggerHaptic() {
    return _ref.apply(this, arguments);
  };
}();
var readLaunchContext = () => {
  try {
    var params = new URLSearchParams(window.location.search || '');
    var hasRoute = ['view', 'search', 'mode', 'tab', 'targetId', 'targetType', 'profileId', 'cosmeticId'].some(key => params.has(key));
    var view = params.get('view') || 'home';
    var context = {};
    ['search', 'mode', 'tab', 'targetId', 'targetType', 'id', 'cosmeticId', 'scroll'].forEach(key => {
      var value = params.get(key);
      if (value) context[key] = value;
    });
    return {
      view,
      context,
      profileId: params.get('profileId') || '',
      cosmeticId: params.get('cosmeticId') || '',
      hasRoute
    };
  } catch (error) {
    return {
      view: 'home',
      context: {},
      profileId: '',
      cosmeticId: '',
      hasRoute: false
    };
  }
};
var getNoteKey = (type, id) => "".concat(type, ":").concat(id);
