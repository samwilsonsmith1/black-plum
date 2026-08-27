#!/usr/bin/env python3
"""
Drop your own photographs into the Things to Do page.

Name your files after the slot they belong in and run:

    python3 swap-photos.py ~/Downloads

    booloumba        the falls          main frame on the Booloumba block
    booloumba-pool   the swimming hole  small inset on the same block
    kenilworth       the markets        main frame on the Kenilworth block
    everglades       the reflections    full-width band
    mount-eerwah     the summit view    main frame on the Mount Eerwah block

Any common format works, including HEIC straight off a phone. Each image is
converted, resized and compressed, the Wikimedia credit is stripped from it
(your photo shouldn't carry someone else's name), and the credit paragraph in
the footer is rewritten to list only the contributors still on the page.

It also reports how much of each photo its frame actually keeps, so a bad
crop is visible rather than silent.
"""
import glob, json, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)

# slot -> (frame aspect ratio, frame name, filename keywords that mean this slot)
# "booloumba" is the park's spelling; people reasonably write "booloomba" too.
FRAMES = {
    'booloumba':      (4/5, 'portrait frame',  ('booloumba falls', 'booloomba falls', 'falls')),
    'booloumba-pool': (4/3, 'inset',           ('booloumba creek', 'booloomba creek',
                                                'swimming hole', 'pool')),
    'kenilworth':     (5/4, 'landscape frame', ('kenilworth',)),
    'everglades':     (2/1, 'full-width band', ('everglade',)),
    'mount-eerwah':   (4/5, 'portrait frame',  ('eerwah top', 'mount eerwah', 'mt eerwah',
                                                'summit', 'eerwah')),
}
EXTS = ('.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.tif', '.tiff')
PAGE = 'things-to-do.html'

src_dir = os.path.expanduser(sys.argv[1] if len(sys.argv) > 1 else '~/Downloads')

candidates = [f for f in sorted(glob.glob(os.path.join(src_dir, '*')))
              if f.lower().endswith(EXTS)]

found, claimed = {}, set()
for slot, (_, _, keywords) in FRAMES.items():
    for f in candidates:
        if f in claimed:
            continue
        stem = os.path.splitext(os.path.basename(f))[0].lower().replace('_', ' ').replace('-', ' ')
        if stem.strip() == slot.replace('-', ' ') or any(k in stem for k in keywords):
            found[slot] = f
            claimed.add(f)
            break

if not found:
    print(f'Nothing to swap. Looked in {src_dir} for:')
    for slot, (_, _, kw) in FRAMES.items():
        print(f'  {slot:<16} (also matches: {", ".join(kw)})')
    sys.exit(1)


def dimensions(path):
    out = subprocess.run(['sips', '-g', 'pixelWidth', '-g', 'pixelHeight', path],
                         capture_output=True, text=True).stdout
    w = re.search(r'pixelWidth:\s*(\d+)', out)
    h = re.search(r'pixelHeight:\s*(\d+)', out)
    return (int(w.group(1)), int(h.group(1))) if w and h else (0, 0)


page = open(PAGE).read()
credits = json.load(open('photos/places/credits.json'))

print()
for slot, src in found.items():
    dst = f'photos/places/{slot}.jpg'
    shutil.copy(src, dst)
    subprocess.run(['sips', '-Z', '1500', '-s', 'format', 'jpeg',
                    '-s', 'formatOptions', '60', dst],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # the Wikimedia credit no longer applies to this image
    page = re.sub(rf'\s*<figcaption[^>]*data-credit="{slot}"[^>]*>.*?</figcaption>',
                  '', page, flags=re.S)

    credits[slot] = {'title': os.path.basename(src), 'author': 'The owners',
                     'license': 'Own photograph', 'license_url': '', 'page': ''}

    w, h = dimensions(dst)
    frame, frame_name, _ = FRAMES[slot]
    kb = os.path.getsize(dst) // 1024
    if w and h:
        ratio = w / h
        kept = min(1, frame / ratio) if ratio > frame else min(1, ratio / frame)
        axis = 'width' if ratio > frame else 'height'
        flag = '  <-- heavy crop, worth reframing' if kept < 0.7 else ''
        print(f'{slot:<16} {w}x{h}  {kb:>4} KB  {frame_name}: keeps {kept:.0%} of the {axis}{flag}')
    else:
        print(f'{slot:<16} {kb:>4} KB  {frame_name}')

# rebuild the footer credit line from what is actually on the page now
PLACE_NAME = {
    'booloumba': 'Booloumba Creek', 'booloumba-pool': 'Booloumba Creek',
    'kenilworth': 'Kenilworth', 'everglades': 'the Everglades',
    'mount-eerwah': 'Mount Eerwah',
}
on_page = {m for m in re.findall(r'photos/places/([\w-]+)\.jpg', page)}

ours, authors = [], []
for slot in sorted(on_page):
    info = credits.get(slot, {})
    if info.get('license') == 'Own photograph':
        name = PLACE_NAME.get(slot)
        if name and name not in ours:
            ours.append(name)
    elif info.get('license_url'):
        who = re.sub(r'\s+from .*$', '', info.get('author', ''))
        if who and who not in authors:
            authors.append(who)


def join(items):
    return ', '.join(items[:-1]) + ' and ' + items[-1] if len(items) > 1 else items[0]


first = ('Photographs of the studios, and of ' + join(ours) + ', are our own. The remaining\n'
         '        area photographs') if ours else 'Photographs of the studios are our own. The area photographs'

if authors:
    replacement = (f'{first} come from Wikimedia Commons and stay the work of\n'
                   f'        their photographers: {join(authors)}. Each is credited on the image and\n'
                   '        used under the Creative Commons licence noted there; all have been resized\n'
                   '        for the web.')
else:
    replacement = 'Every photograph on this page is our own.'

page = re.sub(r'(<div class="credits">\s*<h4>Photography</h4>\s*<p>\s*).*?(\s*</p>)',
              lambda m: m.group(1) + replacement + m.group(2), page, flags=re.S)

open(PAGE, 'w').write(page)
json.dump(credits, open('photos/places/credits.json', 'w'), indent=1)

missing = [s for s in FRAMES if s not in found]
print()
if missing:
    print('Still on a stand-in photo: ' + ', '.join(missing))
print('Footer credit line rewritten. Now rebuild and push:')
print('  python3 build-single.py   # only if you want the single-file copy refreshed')
print('  git add -A && git commit -m "Own photography" && git push')
