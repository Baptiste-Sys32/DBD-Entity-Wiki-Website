#!/usr/bin/env python3
"""Compare approved data and changed surfaces with an immutable Git baseline."""
import argparse
import base64
import html
import json
import pathlib
import subprocess
import tempfile
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
import importlib.util

ROOT = pathlib.Path(__file__).resolve().parents[1]
WEB = ROOT / 'web'
spec = importlib.util.spec_from_file_location('hardening', ROOT / 'scripts/hardening-browser.py')
hardening = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hardening)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline', default='85e809a')
    parser.add_argument('--out', type=pathlib.Path, required=True)
    parser.add_argument('--resume', action='store_true', help='Reuse completed measurements from this unchanged comparison')
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    baseline_files = {}
    for name in ['index.html', 'games/dbd/config.js', 'data.js', 'cosmetics.js', 'lore.js', 'community-content.js']:
        baseline_files[name] = subprocess.check_output(['git', 'show', f'{args.baseline}:the-entity-wiki/web/{name}'], cwd=ROOT)
    before_html = hardening.instrument(baseline_files['index.html'].decode()).encode()
    after_source, prepared_html, after_runtime = hardening.prepare_page(WEB)
    after_html = prepared_html.encode()
    manifest = json.loads((ROOT / 'review/maintenance-update.json').read_text())
    additions = [operation['value'] for operation in manifest['operations'] if operation.get('append')]
    gallery = '<html><head><meta charset="utf-8"><style>body{background:#141414;color:white;font:16px sans-serif}main{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}figure{margin:0;background:#242424;padding:10px}img{width:100%;height:170px;object-fit:contain}small{color:#ccc}</style></head><body><h1>New cosmetics: verified character and piece identities</h1><main>'
    for entry in additions:
        gallery += '<figure><img src="/after/' + html.escape(entry['image']) + '"><figcaption>' + html.escape(entry['name']) + '<br><small>' + html.escape(entry['baseCharacterName'] + ' / ' + entry['pieceType']) + '</small></figcaption></figure>'
    gallery += '</main></body></html>'
    (args.out / 'cosmetics-gallery.html').write_text(gallery)

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *a, **kw):
            super().__init__(*a, directory=str(WEB), **kw)

        def do_GET(self):
            request = self.path.split('?', 1)[0]
            phase = 'before' if request.startswith('/before/') else 'after'
            relative = request.removeprefix('/' + phase + '/').lstrip('/')
            if request == '/gallery':
                payload = gallery.encode()
                content_type = 'text/html'
            elif relative in ['', 'index.html']:
                payload = before_html if phase == 'before' else after_html
                content_type = 'text/html'
            elif phase == 'after' and relative == 'runtime/app.js' and after_runtime is not None:
                payload = after_runtime.encode()
                content_type = 'text/javascript'
            elif phase == 'before' and relative in baseline_files:
                payload = baseline_files[relative]
                content_type = 'text/javascript'
            else:
                self.path = '/' + relative
                return super().do_GET()
            self.send_response(200)
            self.send_header('Content-Type', content_type + '; charset=utf-8')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

        def log_message(self, *args):
            pass

    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_address[1]}'
    database = json.loads((ROOT / 'content/database.json').read_text())
    evidence = json.loads((args.out / 'measurements.json').read_text()) if args.resume and (args.out / 'measurements.json').exists() else {}
    with tempfile.TemporaryDirectory(prefix='dbd-maintenance-chrome-') as profile:
        chrome = subprocess.Popen(['google-chrome', '--headless=new', '--no-sandbox', '--disable-gpu', '--remote-debugging-port=0', f'--user-data-dir={profile}', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        try:
            active = pathlib.Path(profile) / 'DevToolsActivePort'
            for _ in range(100):
                if active.exists():
                    break
                time.sleep(.1)
            cdp = hardening.CDP(int(active.read_text().splitlines()[0]))
            for phase in ['before', 'after']:
                if args.resume and phase in evidence and all(str(rate) in evidence[phase] for rate in [1, 4]) and (args.out / f'{phase}-the-good-guy.png').exists():
                    continue
                evidence[phase] = {}
                for rate in [1, 4]:
                    runs = []
                    for _ in range(3):
                        load = cdp.load(base + '/' + phase + '/?view=home', rate)
                        scores = [hardening.search(cdp, query) for query in hardening.QUERIES]
                        runs.append({'load': load, 'worstScoringMs': max(result['ms'] for result in scores)})
                    evidence[phase][str(rate)] = runs
                    print(f'{phase} CPU {rate}x: startup samples ' + ', '.join(str(round(run['load']['rootMs'])) for run in runs), flush=True)
                (args.out / 'measurements.json').write_text(json.dumps(evidence, indent=2) + '\n')
                cdp.load(base + '/' + phase + '/?view=home', 1)
                for query, label in [('dwight', 'search-dwight'), ('icons:exhausted', 'search-icon'), ('Sugar Rush', 'new-cosmetic'), ('Surrender', 'glossary'), ('Void Crystal', 'event-item')]:
                    cdp.js("__navigateForTest('home', {})")
                    cdp.until("!!document.querySelector('#home-search-input')")
                    cdp.js("document.querySelector('#home-search-input').focus();document.querySelector('#home-search-input').select()")
                    cdp.call('Input.insertText', text=query)
                    time.sleep(.8)
                    cdp.js('window.scrollTo(0, 0)')
                    (args.out / f'{phase}-{label}.png').write_bytes(base64.b64decode(cdp.call('Page.captureScreenshot', format='png')['data']))
                for name, category, section in [('Dark Arrogance', 'perks', 'overview'), ('The Executioner', 'killers', 'power'), ('The Good Guy', 'killers', 'power')]:
                    entry = next(entry for entry in database[category] if entry['name'] == name)
                    cdp.js('__navigateForTest(' + json.dumps('perk' if category == 'perks' else 'killer') + ',' + json.dumps({'id': entry['id'], 'scroll': section}) + ')')
                    time.sleep(1)
                    text = cdp.js('document.body.innerText')
                    if phase == 'after':
                        expected = {'Dark Arrogance': '10%', 'The Executioner': '16m', 'The Good Guy': '10-second'}[name]
                        assert expected in text, (name, expected)
                    label = name.lower().replace(' ', '-')
                    (args.out / f'{phase}-{label}.png').write_bytes(base64.b64decode(cdp.call('Page.captureScreenshot', format='png')['data']))
            cdp.call('Emulation.setCPUThrottlingRate', rate=1)
            cdp.call('Page.navigate', url=base + '/gallery')
            cdp.until('document.images.length === ' + str(len(additions)) + ' && [...document.images].every(image=>image.complete && image.naturalWidth>0)')
            height = cdp.js('document.documentElement.scrollHeight')
            (args.out / 'cosmetics-gallery.png').write_bytes(base64.b64decode(cdp.call('Page.captureScreenshot', format='png', captureBeyondViewport=True, clip={'x': 0, 'y': 0, 'width': 1440, 'height': height, 'scale': 1})['data']))
            evidence['newCosmeticImages'] = len(additions)
            (args.out / 'measurements.json').write_text(json.dumps(evidence, indent=2) + '\n')
        finally:
            chrome.terminate()
            chrome.wait(timeout=10)
            server.shutdown()
            server.server_close()


if __name__ == '__main__':
    main()
