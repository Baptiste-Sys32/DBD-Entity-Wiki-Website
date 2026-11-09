var InfoCallout = () => null;
var NotesEditor = _ref => {
  var {
    title = 'Personal Notes',
    value = '',
    onChange: _onChange,
    placeholder = 'Write anything useful here...'
  } = _ref;
  return React.createElement("div", {
    className: "mt-4 pt-4 border-t border-white/10"
  }, React.createElement("div", {
    className: "flex items-center gap-2 mb-2"
  }, React.createElement(Icons.BookOpen, {
    width: 14,
    height: 14,
    className: "text-zinc-400"
  }), React.createElement("p", {
    className: "text-[10px] uppercase tracking-widest text-zinc-500 font-bold"
  }, title)), React.createElement("textarea", {
    value: value,
    onChange: e => _onChange && _onChange(e.target.value),
    rows: 4,
    placeholder: placeholder,
    className: "w-full bg-zinc-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500"
  }), React.createElement("p", {
    className: "text-[10px] text-zinc-600 mt-1"
  }, "Stored locally only. Not included when sharing builds."));
};
var ArticleShell = _ref2 => {
  var {
    crumbs,
    title,
    hatnote,
    meta,
    lead,
    toc,
    infobox,
    categories,
    children
  } = _ref2;
  return React.createElement("article", {
    className: "cx-article w-full min-w-0"
  }, crumbs && crumbs.length > 0 ? React.createElement("nav", {
    className: "cx-crumbs",
    "aria-label": "Breadcrumbs"
  }, crumbs.map((crumb, i) => {
    var isLast = i === crumbs.length - 1;
    var label = typeof crumb === "string" ? crumb : crumb.label;
    var href = typeof crumb === "string" ? "#" : crumb.href || "#";
    var onCrumb = typeof crumb === "string" ? null : crumb.onClick || null;
    return React.createElement("span", {
      key: i
    }, i > 0 ? React.createElement("span", {
      className: "cx-sep",
      "aria-hidden": "true"
    }, "\u203A") : null, isLast ? React.createElement("b", null, label) : onCrumb ? React.createElement("button", {
      type: "button",
      className: "cx-alink",
      onClick: onCrumb
    }, label) : React.createElement("a", {
      href: href
    }, label));
  })) : null, React.createElement("h1", {
    className: "cx-title"
  }, title), hatnote ? React.createElement(Hatnote, null, hatnote) : null, meta ? React.createElement(MetaLine, {
    updated: meta.updated,
    editsLabel: meta.editsLabel,
    onHistory: meta.onHistory,
    onTalk: meta.onTalk
  }) : null, React.createElement("div", {
    className: "cx-leadgrid"
  }, React.createElement("div", {
    className: "cx-leadmain"
  }, lead, toc && toc.length > 0 ? React.createElement(Toc, {
    items: toc
  }) : null), infobox ? React.createElement(Infobox, {
    title: infobox.title,
    sub: infobox.sub,
    image: infobox.image,
    imageAlt: infobox.imageAlt,
    imageType: infobox.imageType,
    rows: infobox.rows,
    note: infobox.note
  }) : null), children, categories && categories.length > 0 ? React.createElement(CategoryBar, {
    categories: categories
  }) : null);
};
var ImageLightbox = _ref3 => {
  var {
    src,
    alt,
    meta,
    fit,
    onClose
  } = _ref3;
  if (!src) return null;
  return React.createElement(WikiDialog, {
    title: alt || 'Image reference',
    eyebrow: "Image reference",
    subtitle: meta,
    onClose: onClose,
    className: "cx-dialog--lightbox",
    footer: React.createElement(React.Fragment, null, React.createElement("span", null, fit === 'icon' ? 'Perk artwork' : 'Image preview'), React.createElement("button", {
      type: "button",
      className: "cx-toolbtn",
      onClick: onClose
    }, "Close image"))
  }, React.createElement("div", {
    className: "cx-lightbox-image ".concat(fit === 'icon' ? 'cx-lightbox-image--icon' : '')
  }, React.createElement("img", {
    src: src,
    alt: alt || ''
  })));
};
var useNarrowTier = () => {
  var [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 860px)').matches);
  useEffect(() => {
    var mq = window.matchMedia('(max-width: 860px)');
    var onChange = e => setNarrow(e.matches);
    if (mq.addEventListener) mq.addEventListener('change', onChange);else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);else mq.removeListener(onChange);
    };
  }, []);
  return narrow;
};
var Hatnote = _ref4 => {
  var {
    children
  } = _ref4;
  if (!children) return null;
  return React.createElement("p", {
    className: "cx-hatnote"
  }, children);
};
var MetaLine = () => {
  return null;
};
var Infobox = _ref5 => {
  var {
    title,
    sub,
    image,
    imageAlt,
    imageType,
    rows,
    note
  } = _ref5;
  return React.createElement("aside", {
    className: "cx-infobox w-full"
  }, React.createElement("div", {
    className: "cx-ib-title"
  }, title), sub ? React.createElement("div", {
    className: "cx-ib-sub"
  }, sub) : null, image ? React.createElement("div", {
    className: "cx-ib-media w-full aspect-[3/4] overflow-hidden",
    title: imageAlt || title
  }, React.createElement(AssetFrame, {
    type: imageType || "Killer",
    imageUrl: image,
    size: "fill"
  })) : null, rows && rows.length > 0 ? React.createElement("table", null, React.createElement("tbody", null, rows.map((row, i) => React.createElement("tr", {
    key: i
  }, React.createElement("th", {
    scope: "row"
  }, row.label), React.createElement("td", null, row.value))))) : null, note ? React.createElement("div", {
    className: "cx-ib-note"
  }, note) : null);
};
var Toc = _ref6 => {
  var {
    items
  } = _ref6;
  if (!items || items.length === 0) return null;
  return React.createElement("nav", {
    className: "cx-toc",
    "aria-label": "Contents"
  }, React.createElement("div", {
    className: "cx-toc-title"
  }, "Contents"), React.createElement("ol", null, items.map(item => React.createElement("li", {
    key: item.id
  }, React.createElement("a", {
    href: "#" + item.id
  }, item.label), item.children && item.children.length > 0 ? React.createElement("ol", null, item.children.map(child => React.createElement("li", {
    key: child.id,
    className: "cx-l2"
  }, React.createElement("a", {
    href: "#" + child.id
  }, child.label)))) : null))));
};
var CategoryBar = _ref7 => {
  var {
    categories
  } = _ref7;
  if (!categories || categories.length === 0) return null;
  return React.createElement("div", {
    className: "cx-cats"
  }, React.createElement("span", null, "Categories:"), categories.map((cat, i) => {
    var label = typeof cat === "string" ? cat : cat.label;
    var _onClick = typeof cat === "string" ? null : cat.onClick || null;
    return React.createElement("span", {
      key: i
    }, i > 0 ? React.createElement("span", {
      className: "cx-sep",
      "aria-hidden": "true"
    }, "\xB7") : null, _onClick ? React.createElement("a", {
      href: "#",
      onClick: e => {
        e.preventDefault();
        _onClick(e);
      }
    }, label) : React.createElement("a", {
      href: "#"
    }, label));
  }));
};
