import argparse, base64, importlib.util, json, os, pathlib, subprocess, tempfile, time
ROOT = pathlib.Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description='Popup, icon-reference and comparison browser regression checks')
parser.add_argument('--base', default='http://127.0.0.1:8893', help='Website to verify, local or deployed')
parser.add_argument('--before-base', help='Optional older website for screenshot comparison')
parser.add_argument('--out', type=pathlib.Path, required=True)
args = parser.parse_args()
OUT = args.out
OUT.mkdir(parents=True, exist_ok=True)
spec=importlib.util.spec_from_file_location('browser',ROOT/'scripts/hardening-browser.py');b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
checks=[]
def snap(cdp,name):
 (OUT/'screenshots').mkdir(exist_ok=True)
 (OUT/'screenshots'/f'{name}.png').write_bytes(base64.b64decode(cdp.call('Page.captureScreenshot',format='png')['data']))
def press(cdp,key):
 cdp.call('Input.dispatchKeyEvent',type='keyDown',key=key,code=key,windowsVirtualKeyCode={'Escape':27,'Tab':9}.get(key,0));cdp.call('Input.dispatchKeyEvent',type='keyUp',key=key,code=key)
def fixture(cdp,component,props):
 cdp.js("""(() => { const host=document.createElement('div');host.dataset.previewFixture='true';document.body.append(host);window.__previewRoot=ReactDOM.createRoot(host);
 const Fixture=()=>{const [open,setOpen]=React.useState(true); const [perks,setPerks]=React.useState(DATABASE.perks.slice(0,4)); return open ? React.createElement(COMPONENT,{...PROPS,perks,onClose:()=>setOpen(false),onRemove:perk=>setPerks(list=>list.filter(item=>item.id!==perk.id))}) : null;};__previewRoot.render(React.createElement(Fixture)); })()""".replace('COMPONENT',component).replace('PROPS',json.dumps(props)))
 time.sleep(.4)
 cdp.until("(()=>{const root=document.querySelector('.cx-dialog')||[...document.querySelectorAll('[data-preview-fixture]')].find(node=>node.childElementCount);const images=[...(root?.querySelectorAll('img')||[])];return images.length>0&&images.every(image=>image.complete&&image.naturalWidth>0&&Number(getComputedStyle(image).opacity)>.95)})()")
with tempfile.TemporaryDirectory(prefix='dbd-popup-browser-', ignore_cleanup_errors=True) as profile:
 chrome=subprocess.Popen([os.environ.get('CHROME_BIN', 'google-chrome'),'--headless=new','--no-sandbox','--disable-gpu','--remote-debugging-port=0','--remote-allow-origins=*','--user-data-dir='+profile,'about:blank'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 try:
  active=pathlib.Path(profile)/'DevToolsActivePort'
  while not active.exists():time.sleep(.1)
  c=b.CDP(int(active.read_text().splitlines()[0]))
  c.call('Page.addScriptToEvaluateOnNewDocument',source="window.__previewErrors=[];addEventListener('error',event=>__previewErrors.push(event.message));addEventListener('unhandledrejection',event=>__previewErrors.push(String(event.reason)))")
  phases = ([('before', args.before_base)] if args.before_base else []) + [('after', args.base)]
  for phase, target in phases:
   for device,rate in [('desktop',1),('mobile',4)]:
    base = target.rstrip('/') + '/'
    c.load(base+'?view=settings',rate)
    c.js("[...document.querySelectorAll('button')].find(button=>button.textContent.trim()==='OLED').click()")
    c.load(base+'?view=realms&search=Coal%20Tower',rate)
    c.until("[...document.querySelectorAll('button')].some(x=>x.textContent==='Coal Tower')")
    c.js("[...document.querySelectorAll('button')].find(x=>x.textContent==='Coal Tower').focus();[...document.querySelectorAll('button')].find(x=>x.textContent==='Coal Tower').click()")
    c.until("[...document.images].some(i=>i.src.includes('coal_tower')&&i.complete&&i.naturalWidth>0)")
    snap(c,f'{phase}-map-{device}')
    if phase=='after':
     assert c.js("document.querySelector('[role=dialog]')?.getAttribute('aria-modal')==='true'")
     assert c.js("document.activeElement.hasAttribute('data-dialog-close')")
     assert c.js("(()=>{const b=document.querySelector('.cx-dialog-footer button');const r=b.getBoundingClientRect();return r.bottom<=innerHeight&&r.top>=0&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===b})()")
     c.js("document.querySelector('[aria-label=\"Zoom in\"]').click()")
     c.until("document.querySelector('.cx-map-stage img').style.width==='150%'")
     c.js("document.querySelector('[aria-label=\"Fit layout\"]').click()")
     c.js("[...document.querySelectorAll('.cx-map-variations button')][1].click()")
     c.until("[...document.images].some(i=>i.src.includes('coal_tower_ii')&&i.complete&&i.naturalWidth>0)")
     snap(c,f'after-map-variation-{device}')
     c.js("document.querySelector('.cx-dialog-footer button').focus()")
     press(c,'Tab');assert c.js("document.activeElement.hasAttribute('data-dialog-close')")
     c.js("document.querySelector('#map-reference-notes').focus()")
     c.call('Input.insertText',text='Preview persistence check')
     press(c,'Escape');c.until("!document.querySelector('[role=dialog]')")
     assert c.js("!document.querySelector('.site-shell').inert")
     assert c.js("document.activeElement.textContent==='Coal Tower'")
     c.js("document.activeElement.click()")
     c.until("document.querySelector('#map-reference-notes')?.value==='Preview persistence check'")
     # Remove only this test note, on this separate localhost preview origin.
     c.js("const field=document.querySelector('#map-reference-notes');field.focus();field.select()")
     c.call('Input.dispatchKeyEvent',type='keyDown',key='Backspace',code='Backspace',windowsVirtualKeyCode=8);c.call('Input.dispatchKeyEvent',type='keyUp',key='Backspace',code='Backspace')
     press(c,'Escape')
     checks.append(f'{device}: map variation, zoom, note persistence, close visibility, focus trap/restore and Escape')
    c.load(base+'?view=gameIcons',rate)
    snap(c,f'{phase}-icons-list-{device}')
    c.js("(document.querySelector('[aria-label=\"Search game icons\"]')||document.querySelector('input[placeholder=\"Search icons...\"]')).focus()")
    c.call('Input.insertText',text='Exhausted');time.sleep(.4)
    if phase=='before':
     c.js("document.querySelector('.game-icon-row')?.click()")
     snap(c,f'before-icons-expanded-{device}')
     c.js("[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Trial Grid').click()")
     c.js("document.querySelector('.game-icon-tile').click()")
    else:
     c.js("document.querySelector('.cx-icon-summary').click()")
     assert c.js("document.querySelector('.cx-icon-summary').getAttribute('aria-expanded')==='true'")
     assert c.js("document.querySelector('.cx-icon-detail:not([hidden])').textContent.includes('In the Trial')")
     snap(c,f'after-icons-expanded-{device}')
     c.js("[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Icon grid').click()")
     snap(c,f'after-icons-grid-{device}')
     c.js("document.querySelector('.cx-icon-tile').focus();document.querySelector('.cx-icon-tile').click()")
    time.sleep(.3);snap(c,f'{phase}-icon-popup-{device}')
    if phase=='after':
     assert c.js("document.querySelector('[role=dialog]')?.innerText.includes('Exhausted')")
     press(c,'Escape');c.until("!document.querySelector('[role=dialog]')")
     assert c.js("document.activeElement.classList.contains('cx-icon-tile')")
     # Empty-state reset exercises search and category state together.
     c.js("document.querySelector('[aria-label=\"Search game icons\"]').focus();document.querySelector('[aria-label=\"Search game icons\"]').select()")
     c.call('Input.insertText',text='not-an-icon-789');time.sleep(.3)
     assert c.js("document.body.innerText.includes('No icons found')")
     c.js("[...document.querySelectorAll('button')].find(x=>x.textContent==='Reset filters').click()")
     c.until("document.querySelectorAll('.cx-icon-tile').length===GAME_ICONS.length")
     c.js("[...document.querySelectorAll('.cx-icon-categories button')].find(x=>x.textContent.includes('Debuff')).click()")
     assert c.js("document.querySelectorAll('.cx-icon-tile').length===GAME_ICONS.filter(x=>x.category==='debuff').length")
     checks.append(f'{device}: icon list/grid, disclosure, popup, category/search and empty reset')
    c.load(base+'?view=perks',rate)
    fixture(c,'PerkCompareModal',{})
    snap(c,f'{phase}-compare-{device}')
    if phase=='after':
     assert c.js("document.querySelectorAll('.cx-compare-entry').length===4")
     c.js("document.querySelector('.cx-compare-entry-head button').click()")
     c.until("document.querySelectorAll('.cx-compare-entry').length===3")
     press(c,'Escape');c.until("!document.querySelector('[role=dialog]')")
     checks.append(f'{device}: comparison renders four perks, removes one and closes')
    c.js("__previewRoot.unmount()")
    fixture(c,'ImageLightbox',{'src':'./'+json.loads((ROOT/'content/database.json').read_text())['perks'][0]['image'],'alt':'Perk artwork','fit':'icon'})
    snap(c,f'{phase}-image-popup-{device}')
    if phase=='after':
     press(c,'Escape');c.until("!document.querySelector('[role=dialog]')")
     assert c.js("document.querySelector('.site-shell').inert===false")
     checks.append(f'{device}: image reference and Escape')
    if phase=='after':
     c.js("__previewRoot.unmount()")
     c.load(base+'?view=settings',rate)
     c.js("[...document.querySelectorAll('button')].find(button=>button.textContent.trim()==='Light').click()")
     c.until("getComputedStyle(document.documentElement).getPropertyValue('--glass-bg').trim()==='#f8f9fa'")
     c.load(base+'?view=perks',rate)
     fixture(c,'ImageLightbox',{'src':'./'+json.loads((ROOT/'content/database.json').read_text())['perks'][0]['image'],'alt':'Perk artwork','fit':'icon'})
     snap(c,f'after-light-{device}')
     c.js("__previewRoot.unmount()")
     checks.append(f'{device}: light theme and no page overflow')
    assert not c.js("window.__previewErrors"),c.js("window.__previewErrors")
    assert not c.js("document.body.innerText.includes('Something went wrong')")
    assert c.js("document.documentElement.scrollWidth<=innerWidth"),f'horizontal overflow {phase} {device}'
    print(phase,device,'passed',flush=True)
  (OUT/'checks.json').write_text(json.dumps({'passed':True,'checks':checks},indent=2)+'\n')
 finally:
  chrome.terminate();chrome.wait();
