#!/usr/bin/env python3
"""Browser regression checks and optional before/after CPU measurements.

Uses the same websockets dependency as smoke-test.py. Test-only bindings are
injected by the local HTTP handler; production files are never instrumented.
Usage: python3 scripts/hardening-browser.py [--compare REF] [--out FILE]
"""
import argparse
import base64
import json
import pathlib
import re
import subprocess
import tempfile
import time
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread

from websockets.sync.client import connect

ROOT = pathlib.Path(__file__).resolve().parent.parent
WEB = ROOT / 'web'
QUERIES = [
    'dwight', 'nurse', 'trapper', 'spirit', 'trapper mask',
    'purple toolbox addons', 'green toolbox addons', 'purple toolbox items',
    'killer perks', 'survivor perks', 'perks survivor healing', 'perks:survivor healing', 'addons:killer', 'dark lord very rare addons',
    'not very rare addons', 'perks not hex', 'Sole Survivor', 'No Mither',
    'No One Left Behind', 'aura', 'icons:exausted', 'perks:', 'the',
    'aura reveal generator healing chase hex boon',
]
INIT = """
window.__hardening = {tasks: [], root: null};
new PerformanceObserver(list => list.getEntries().forEach(entry =>
  __hardening.tasks.push({start: entry.startTime, ms: entry.duration})))
  .observe({type: 'longtask', buffered: true});
new MutationObserver(() => {
  if (!__hardening.root && document.querySelector('[data-smoke-ready]'))
    __hardening.root = performance.now();
}).observe(document, {childList: true, subtree: true});
"""


def instrument(source):
    start = source.index('      useEffect(() => {\n        if (!deferredSearchTerm.trim()')
    body_start = source.index('\n', start) + 1
    body_end = source.index('\n      }, [deferredSearchTerm', body_start)
    body = source[body_start:body_end]
    body = body.replace('setResults([]);\n          return;', 'return [];')
    body = body.replace('setResults(scored.slice(0, 50));', 'return scored.slice(0, 50);')
    bindings = '\nwindow.__searchForTest = (deferredSearchTerm) => {\n' + body + '\n};\n'
    bindings += 'window.__randomForTest = processRandomCommand;\n'
    bindings += 'window.__parseForTest = parseSmartQuery;\n'
    bindings += 'window.__actualResultsForTest = results; window.__actualRandomForTest = randomResult;\n'
    if 'const searchIndex = useMemo' in source:
        bindings += 'window.__catalogForTest = searchIndex;\n'
    source = source[:start] + bindings + source[start:]
    source = source.replace('      const renderContent = () => {', '      window.__navigateForTest = setView;\n      const renderContent = () => {')
    return source


class CDP:
    def __init__(self, port):
        tabs = json.load(urllib.request.urlopen(f'http://127.0.0.1:{port}/json'))
        url = next(tab['webSocketDebuggerUrl'] for tab in tabs if tab['type'] == 'page')
        self.ws = connect(url, max_size=None, open_timeout=10)
        self.sequence = 0
        self.call('Page.enable')
        self.call('Network.enable')
        self.call('Network.setCacheDisabled', cacheDisabled=True)
        self.call('Page.addScriptToEvaluateOnNewDocument', source=INIT)

    def call(self, method, **params):
        self.sequence += 1
        self.ws.send(json.dumps(dict(id=self.sequence, method=method, params=params)))
        while True:
            response = json.loads(self.ws.recv(timeout=120))
            if response.get('id') == self.sequence:
                if 'error' in response:
                    raise RuntimeError(response['error'])
                return response.get('result', {})

    def js(self, expression):
        response = self.call('Runtime.evaluate', expression=expression, returnByValue=True, awaitPromise=True)
        if 'exceptionDetails' in response:
            raise RuntimeError(response['exceptionDetails'])
        return response.get('result', {}).get('value')

    def until(self, expression, seconds=120):
        deadline = time.monotonic() + seconds
        while time.monotonic() < deadline:
            if self.js(expression):
                return
            time.sleep(.1)
        raise RuntimeError(f'Timed out: {expression}')

    def load(self, url, rate):
        self.call('Emulation.setCPUThrottlingRate', rate=rate)
        self.call('Emulation.setDeviceMetricsOverride', width=390 if rate > 1 else 1440,
                  height=844 if rate > 1 else 1000, deviceScaleFactor=1, mobile=rate > 1)
        previous_origin = self.js('performance.timeOrigin')
        self.call('Page.navigate', url=url)
        self.until("performance.timeOrigin !== " + str(previous_origin) + " && !!document.querySelector('[data-smoke-ready]')")
        time.sleep(1)
        return self.js("""({rootMs:__hardening.root,
          paints:performance.getEntriesByType('paint').map(e=>({name:e.name,ms:e.startTime})),
          tasks:__hardening.tasks,
          resources:performance.getEntriesByType('resource').map(e=>({name:e.name.split('/').slice(3).join('/'),bytes:e.encodedBodySize,ms:e.duration}))})""")


def search(cdp, query):
    return cdp.js("""(() => { const start=performance.now();
      const results=__searchForTest(QUERY) || [];
      return {query:QUERY,ms:performance.now()-start,results:results.map(x=>({id:x.id,name:x.name,category:x.category,score:x._score,rarity:x.rarity,itemType:x.itemType,role:x.role||x.type}))}; })()""".replace('QUERY', json.dumps(query)))


def assert_search(cdp):
    results = {query: search(cdp, query)['results'] for query in QUERIES}
    for query, name in [('dwight', 'Dwight Fairfield'), ('nurse', 'The Nurse'), ('trapper', 'The Trapper'), ('spirit', 'The Spirit')]:
        assert results[query][0]['name'] == name, (query, results[query][:3])
        assert results[query][0]['category'] in ('Killer', 'Survivor')
    assert results['trapper mask'][0]['category'] == 'Cosmetic'
    assert results['purple toolbox addons'] == []
    for query, category, rarity in [('green toolbox addons', 'Addon', 'rare'), ('purple toolbox items', 'Item', 'veryrare')]:
        assert results[query] and all(x['category'] == category and x['rarity'] == rarity and x['itemType'] == 'toolbox' for x in results[query])
    for role in ['killer', 'survivor']:
        assert results[f'{role} perks'] and all(x['category'] == 'Perk' and x['role'].lower() == role for x in results[f'{role} perks'])
    assert results['perks:survivor healing'] and all(x['category'] == 'Perk' and x['role'].lower() == 'survivor' for x in results['perks:survivor healing'])
    assert cdp.js("__parseForTest('dark lord very rare addons').context.rarity") == 'veryrare'
    assert results['addons:killer'] and all(x['category'] == 'Addon' and x['role'].lower() == 'killer' for x in results['addons:killer'])
    for title in ['Sole Survivor', 'No Mither', 'No One Left Behind']:
        assert results[title][0]['name'] == title and results[title][0]['category'] == 'Perk'
    assert all(x.get('rarity', '').lower() != 'veryrare' for x in results['not very rare addons'])
    assert all('hex' not in x['name'].lower() for x in results['perks not hex'])
    assert cdp.js("__parseForTest('aura').context.survivorName") is None
    assert results['the'] == []
    assert results['perks:'] and all(x['category'] == 'Perk' for x in results['perks:'])
    assert cdp.js("__randomForTest('sally')?.killer?.name") == 'The Nurse'
    assert cdp.js("__randomForTest('the')") is None
    assert cdp.js("__randomForTest('does-not-exist')") is None
    assert cdp.js("__randomForTest('constructor')") is None
    assert isinstance(search(cdp, 'constructor')['results'], list)
    search(cdp, 'perks not constructor')
    assert cdp.js("(() => { const r=__randomForTest('toolbox'); return r.type==='item' && r.item.itemType==='toolbox' && r.addons.length===2 && r.addons.every(a=>a.itemType==='toolbox'); })()")
    # Duplicate saved metadata must not manufacture score, regardless of its field.
    assert cdp.js("""(() => {
      const entry=__catalogForTest.find(x=>x._category==='Perk');
      const run=(field,values)=>{
        const test={...entry,id:'__metadata_regression',name:'Aura',_search:{...entry._search,nameLower:'aura',nameWords:['aura'],...(field==='aliases'?{aliases:values,aliasText:values.join('\\0')}:{})},[field]:values};
        __catalogForTest.push(test);
        try {const match=__searchForTest('aura').find(x=>x.id===test.id);if(!match)throw new Error('Fixture missing');return match._score;}
        finally {__catalogForTest.pop();}
      };
      return ['tags','perks','aliases'].every(field=>{
        const value=field==='perks'?{name:'aura'}:'aura';
        const single=run(field,[value]);return single>run(field,[]) && single===run(field,Array(100).fill(value));
      });
    })()""")
    database = json.loads((ROOT / 'content/database.json').read_text())
    character_misses = []
    for category, entries in [('Killer', database['killers']), ('Survivor', database['survivors'])]:
        for character in entries:
            found = search(cdp, character['name'])['results']
            if not found or found[0]['id'] != character['id'] or found[0]['category'] != category:
                character_misses.append({'query': character['name'], 'top': found[:2]})
    assert not character_misses, character_misses
    # Exercise the real input and passive effect as well as the isolated scorer.
    cdp.js("document.querySelector('#home-search-input').focus()")
    cdp.call('Input.insertText', text='dwight')
    cdp.until("window.__actualResultsForTest?.[0]?.name==='Dwight Fairfield'")
    cdp.js("document.querySelector('#home-search-input').select()")
    cdp.call('Input.insertText', text='random:sally')
    cdp.until("window.__actualRandomForTest?.killer?.name==='The Nurse'")
    cdp.js("document.querySelector('#home-search-input').select()")
    cdp.call('Input.insertText', text='trapper mask')
    cdp.until("window.__actualResultsForTest?.[0]?.name==='Best New Trapper Mask'")
    cdp.js("[...document.querySelectorAll('p')].find(p=>p.textContent==='Best New Trapper Mask').parentElement.parentElement.querySelector('button').click()")
    cdp.until("!!document.querySelector('[data-smoke-target]')")
    assert cdp.js('document.querySelector("[data-smoke-view]").dataset.smokeView') == 'killer'
    print(f'hardening-browser: search assertions passed ({len(QUERIES)} queries plus all 98 character names)', flush=True)
    return results


def assert_maps(cdp, base, screenshots=None):
    database = json.loads((ROOT / 'content/database.json').read_text())
    maps = database['maps']
    sample = next(entry for entry in maps if entry['name'] == 'Coal Tower')
    for entry in maps:
        cdp.js('__navigateForTest("map",' + json.dumps({'id': entry['id']}) + ')')
        cdp.until('document.querySelector("[data-smoke-profile]")?.dataset.smokeProfile===' + json.dumps(entry['id']))
        primary = next(item for item in maps if item['name'] == entry['name'] and item['realm'] == entry['realm'])
        state = cdp.js('({title:document.title,h1:document.querySelector("h1")?.textContent,canonical:document.querySelector("link[rel=canonical]").href,og:document.querySelector("meta[property=\\"og:url\\"]").content})')
        assert state['h1'] == entry['name'] and state['title'].startswith(entry['name'])
        assert state['canonical'].endswith('view=map&id=' + primary['id'])
        assert state['canonical'] == state['og']
        cdp.until('document.querySelector(".cx-infobox img")?.naturalWidth>0')
    # Verify reload from a direct link, including removal of volatile canonical params.
    cdp.load(base + '/after?view=map&id=' + sample['id'] + '&scroll=notes', 1)
    cdp.until('document.querySelector("[data-smoke-profile]")?.dataset.smokeProfile===' + json.dumps(sample['id']))
    assert '&scroll=' not in cdp.js('document.querySelector("link[rel=canonical]").href')
    cdp.js('document.querySelector("article textarea").focus()')
    cdp.call('Input.insertText', text='hardening map note')
    cdp.until('document.querySelector("article textarea")?.value==="hardening map note"')
    cdp.js("[...document.querySelectorAll('article button')].find(x=>x.textContent.startsWith('Open layouts for')).click()")
    cdp.until('document.querySelectorAll("textarea").length===2')
    assert cdp.js('[...document.querySelectorAll("textarea")].every(x=>x.value==="hardening map note")')
    cdp.js("[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Close').click()")
    cdp.until('document.querySelectorAll("textarea").length===1')
    cdp.load(base + '/after?view=map&id=' + sample['id'], 1)
    assert cdp.js('document.querySelector("article textarea").value') == 'hardening map note'
    cdp.js('document.querySelector("article a[href*=realm]").click()')
    cdp.until('document.querySelector("[data-smoke-view]")?.dataset.smokeView==="realm"')
    cdp.js('document.querySelector("a[href*=\\"' + sample['id'] + '\\"]").click()')
    cdp.until('document.querySelector("[data-smoke-view]")?.dataset.smokeView==="map"')
    cdp.js('__navigateForTest("realms",{search:"MacMillan"})')
    cdp.until('!!document.querySelector("a[href*=\\"' + sample['id'] + '\\"]")')
    assert cdp.js('[...document.querySelectorAll("a[href*=map]")].length') > 0
    cdp.js('__navigateForTest("map",{id:"missing-map"})')
    cdp.until('document.querySelector("h1")?.textContent==="Unknown map"')
    cdp.js('__navigateForTest("map",' + json.dumps({'id': sample['id']}) + ')')
    cdp.until('document.querySelector("h1")?.textContent==="Coal Tower"')
    for label, width, height, mobile in [('desktop', 1440, 1100, False), ('mobile', 390, 844, True)]:
        cdp.call('Emulation.setDeviceMetricsOverride', width=width, height=height, deviceScaleFactor=1, mobile=mobile)
        time.sleep(.4)
        assert not cdp.js('document.documentElement.scrollWidth>innerWidth')
        if screenshots:
            screenshots.mkdir(parents=True, exist_ok=True)
            (screenshots / (label + '.png')).write_bytes(base64.b64decode(cdp.call('Page.captureScreenshot', format='png')['data']))
    print(f'hardening-browser: all {len(maps)} map IDs, canonicals, notes, layouts, realm links, unknown route and responsive checks passed', flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--compare', help='Baseline git ref, measured without changing the worktree')
    parser.add_argument('--out', type=pathlib.Path, help='Write detailed JSON evidence')
    parser.add_argument('--candidate-dir', type=pathlib.Path, help='Preview web directory; other assets fall back to the repo')
    parser.add_argument('--screenshots', type=pathlib.Path, help='Save reviewed map screenshots')
    parser.add_argument('--transpile-benchmark', action='store_true', help='Time three inline-script transforms per preset at desktop CPU speed')
    args = parser.parse_args()
    candidate = args.candidate_dir or WEB
    raw_current = (candidate / 'index.html').read_text()
    current = instrument(raw_current)
    baseline = instrument(subprocess.check_output(['git', 'show', f'{args.compare}:the-entity-wiki/web/index.html'], cwd=ROOT, text=True)) if args.compare else None

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *a, **kw):
            super().__init__(*a, directory=str(WEB), **kw)

        def translate_path(self, path):
            original = pathlib.Path(super().translate_path(path))
            override = candidate / original.relative_to(WEB)
            return str(override if override.is_file() else original)

        def do_GET(self):
            route = self.path.split('?', 1)[0]
            if route in ('/', '/index.html', '/before', '/after'):
                data = (baseline if route == '/before' else current).encode()
                self.send_response(200)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.send_header('Content-Length', str(len(data)))
                self.end_headers()
                self.wfile.write(data)
            else:
                super().do_GET()

        def log_message(self, *a):
            pass

    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_address[1]}'
    evidence = {}
    with tempfile.TemporaryDirectory(prefix='dbd-hardening-') as profile:
        chrome = subprocess.Popen(['google-chrome', '--headless=new', '--disable-gpu', '--no-sandbox',
                                   '--remote-debugging-port=0', f'--user-data-dir={profile}', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        try:
            active = pathlib.Path(profile) / 'DevToolsActivePort'
            for _ in range(100):
                if active.exists():
                    break
                time.sleep(.1)
            cdp = CDP(int(active.read_text().splitlines()[0]))
            for label in (['before', 'after'] if baseline else ['after']):
                evidence[label] = {}
                for rate in ([1, 4] if baseline else [1]):
                    record = {'load': cdp.load(base + '/' + label, rate)}
                    record['search'] = [search(cdp, query) for query in QUERIES]
                    for result in record['search']:
                        result['results'] = result['results'][:8]
                    evidence[label][str(rate)] = record
                    print(label, f'CPU {rate}x:', 'root', round(record['load']['rootMs']), 'ms;',
                          'worst scoring', round(max(x['ms'] for x in record['search'])), 'ms', flush=True)
            cdp.call('Emulation.setCPUThrottlingRate', rate=1)
            if args.out:
                args.out.write_text(json.dumps(evidence, indent=2) + '\n')
            assert_search(cdp)
            evidence['assertions'] = {'passed': True, 'queries': len(QUERIES), 'characterNames': 98, 'inputAndNavigation': True}
            if 'const MapArticleView =' in raw_current:
                assert_maps(cdp, base, args.screenshots)
                evidence['mapAssertions'] = 'passed'
            else:
                print('hardening-browser: map assertions pending preview approval/integration', flush=True)
            if args.transpile_benchmark:
                source = re.search(r'<script\s+type="text/babel"(?![^>]*\bsrc=)[^>]*>([\s\S]*?)</script>', raw_current).group(1)
                evidence['transpileBenchmark'] = cdp.js("""(() => {
                  const source=SOURCE;
                  return [['env','react'],['wiki']].map(presets=>{
                    const samples=[];let bytes=0;
                    for(let i=0;i<3;i++){const start=performance.now();bytes=Babel.transform(source,{presets}).code.length;samples.push(performance.now()-start);}
                    return {presets,samplesMs:samples,outputBytes:bytes};
                  });
                })()""".replace('SOURCE', json.dumps(source)))
                print('hardening-browser: inline transpile benchmark collected', flush=True)
            if args.out:
                args.out.write_text(json.dumps(evidence, indent=2) + '\n')
        finally:
            chrome.terminate()
            try:
                chrome.wait(timeout=5)
            except subprocess.TimeoutExpired:
                chrome.kill()
                chrome.wait()
            server.shutdown()
            server.server_close()


if __name__ == '__main__':
    main()
