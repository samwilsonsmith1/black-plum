#!/usr/bin/env python3
"""
Builds a single self-contained HTML file from the multi-page site:
all four pages become hash routes, CSS/JS are inlined and every photo
is embedded as a data URI. Output: dist/black-plum.html
"""
import base64, os, re, subprocess, sys, tempfile, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)

MAX_W, QUALITY = 1000, 40

# ---------- 1. compress + encode every photo ----------
def encode_photos():
    tmp = tempfile.mkdtemp()
    uris = {}
    for root, _, files in os.walk('photos'):
        for f in sorted(files):
            if not f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                continue
            src = os.path.join(root, f)

            # cut-outs keep their alpha, so embed them untouched
            if f.lower().endswith(('.png', '.webp')):
                mime = 'image/webp' if f.lower().endswith('.webp') else 'image/png'
                with open(src, 'rb') as fh:
                    uris[src] = f'data:{mime};base64,' + base64.b64encode(fh.read()).decode()
                continue

            dst = os.path.join(tmp, src.replace('/', '-'))
            shutil.copy(src, dst)
            subprocess.run(['sips', '-Z', str(MAX_W), '-s', 'format', 'jpeg',
                            '-s', 'formatOptions', str(QUALITY), dst],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            with open(dst, 'rb') as fh:
                uris[src] = 'data:image/jpeg;base64,' + base64.b64encode(fh.read()).decode()
    shutil.rmtree(tmp)
    return uris

# ---------- 2. pull the content out of each page ----------
def body_content(path):
    html = open(path).read()
    body = html.split('<body>', 1)[1].rsplit('</body>', 1)[0]
    # drop the chrome that becomes shared
    for pat in (r'<header class="nav".*?</header>',
                r'<div class="mobile-menu">.*?</div>\s*(?=<)',
                r'<footer class="footer".*?</footer>',
                r'<div class="mobile-bar">.*?</div>',
                r'<script src=.*?</script>'):
        body = re.sub(pat, '', body, flags=re.S)
    return body.strip()

def title_of(path):
    return re.search(r'<title>(.*?)</title>', open(path).read(), re.S).group(1)

ROUTES = [
    ('home',          'index.html'),
    ('art-shed',      'art-shed.html'),
    ('creek-studio',  'creek-studio.html'),
    ('things-to-do',  'things-to-do.html'),
    ('book',          'book.html'),
]
FILE_TO_ROUTE = {f: r for r, f in ROUTES}

def rewrite_links(html):
    def sub(m):
        href = m.group(1)
        file, _, rest = href.partition('?')
        file, _, frag = (file.partition('#') if '#' in file else (file, '', ''))
        if '#' in rest:
            rest, _, frag = rest.partition('#')
        if file not in FILE_TO_ROUTE:
            return m.group(0)
        out = '#/' + FILE_TO_ROUTE[file]
        if rest:
            out += '?' + rest
        if frag:
            out += '!' + frag
        return f'href="{out}"'
    return re.sub(r'href="((?:index|art-shed|creek-studio|things-to-do|book)\.html[^"]*)"', sub, html)

def embed(html, uris):
    """Swap every photo path for its data URI — in markup and in the JS config alike."""
    for path, uri in uris.items():
        html = html.replace(f'"{path}"', f'"{uri}"').replace(f"'{path}'", f"'{uri}'")
    return html

# ---------- 3. assemble ----------
uris = encode_photos()
print(f'  {len(uris)} photos embedded')

chrome = open('index.html').read()
nav = re.search(r'<header class="nav">.*?</header>', chrome, re.S).group(0)
menu = re.search(r'<div class="mobile-menu">.*?</div>\s*(?=<!-- =)', chrome, re.S).group(0)
footer = re.search(r'<footer class="footer">.*?</footer>', chrome, re.S).group(0)

panes = []
for route, f in ROUTES:
    panes.append(f'<div class="route" data-route="{route}">\n{body_content(f)}\n</div>')

css = open('css/site.css').read() + '\n' + open('css/booking.css').read()
css = css.replace("@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Inter:wght@300;400;500;600&display=swap');", '')
css += '''
/* --- single-file router --- */
.route{ display:none; }
.route.on{ display:block; }
.route[data-route="book"]{ background:var(--paper); }
'''

js = open('js/calendar.js').read() + '\n' + open('js/site.js').read() + '\n' + open('js/booking.js').read() + '''

/* ============================================================
   Single-file router
   ============================================================ */
(function () {
  const routes = [...document.querySelectorAll('.route')];
  const names = routes.map(r => r.dataset.route);
  let current = 'home';

  function scrollToAnchor(id) {
    const el = id && document.getElementById(id);
    if (!el) { window.scrollTo({ top: 0, behavior: 'auto' }); return; }
    void document.body.offsetHeight;                       // force layout
    const y = el.getBoundingClientRect().top + window.scrollY - 92;
    window.scrollTo({ top: Math.max(0, y), behavior: 'auto' });
  }

  function apply() {
    const hash = location.hash.slice(1);

    // a plain "#studios" is an anchor inside whatever route we're on
    if (hash && !hash.startsWith('/')) { scrollToAnchor(hash); return; }

    const raw = hash.replace(/^\//, '') || 'home';
    const [pathAndQuery, anchor] = raw.split('!');
    const [name, query] = pathAndQuery.split('?');
    const route = names.includes(name) ? name : 'home';
    current = route;

    routes.forEach(r => r.classList.toggle('on', r.dataset.route === route));
    document.querySelector('.nav')?.classList.toggle('on-paper', route === 'book');

    if (route === 'book') {
      if (query) window.BPapplyQuery?.('?' + query);
      window.BPgoStep?.(1);
    }

    // everything in the newly shown route should be visible
    document.querySelectorAll('.route.on .rv').forEach(e => e.classList.add('in'));

    if (anchor) scrollToAnchor(anchor);
    else window.scrollTo({ top: 0, behavior: 'auto' });
  }

  window.addEventListener('hashchange', apply);
  apply();
})();
'''

# the hero search bar navigates to a page in the multi-page site; here it's a route
js = js.replace("window.location.href = 'book.html?' + q.toString();",
                "window.location.hash = '#/book?' + q.toString();")

html = f'''<meta charset="utf-8">
<title>Black Plum, Eerwah Vale</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Inter:wght@300;400;500;600&display=swap">
<style>
{css}
</style>
<script>document.documentElement.classList.add('js')</script>

{nav}
{menu}
<main>
{chr(10).join(panes)}
</main>
{footer}

<script>
{js}
</script>
'''

html = rewrite_links(html)
html = embed(html, uris)

os.makedirs('dist', exist_ok=True)
out = 'dist/black-plum.html'
open(out, 'w').write(html)
print(f'  wrote {out} — {os.path.getsize(out)/1024/1024:.1f} MB')
