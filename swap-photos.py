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

# slot -> (aspect ratio of the frame it lands in, human name for the frame)
FRAMES = {
    'booloumba':      (4/5,   'portrait frame'),
    'booloumba-pool': (4/3,   'inset'),
    'kenilworth':     (5/4,   'landscape frame'),
    'everglades':     (2/1,   'full-width band'),
    'mount-eerwah':   (4/5,   'portrait frame'),
}
EXTS = ('.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.tif', '.tiff')
PAGE = 'things-to-do.html'

src_dir = os.path.expanduser(sys.argv[1] if len(sys.argv) > 1 else '~/Downloads')

found = {}
for slot in FRAMES:
    for f in sorted(glob.glob(os.path.join(src_dir, '*'))):
        base = os.path.basename(f).lower()
        stem = os.path.splitext(base)[0].replace('_', '-').replace(' ', '-')
        if stem == slot and base.endswith(EXTS):
            found[slot] = f
            break

if not found:
    print(f'Nothing to swap. Looked in {src_dir} for:')
    for slot in FRAMES:
        print(f'  {slot}.<jpg|png|heic|…>')
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
    frame, frame_name = FRAMES[slot]
    kb = os.path.getsize(dst) // 1024
    if w and h:
        ratio = w / h
        kept = min(1, frame / ratio) if ratio > frame else min(1, ratio / frame)
        axis = 'width' if ratio > frame else 'height'
        flag = '  <-- heavy crop, worth reframing' if kept < 0.7 else ''
        print(f'{slot:<16} {w}x{h}  {kb:>4} KB  {frame_name}: keeps {kept:.0%} of the {axis}{flag}')
    else:
        print(f'{slot:<16} {kb:>4} KB  {frame_name}')

# rebuild the footer credit line from whoever is actually still on the page
on_page = {m for m in re.findall(r'photos/places/([\w-]+)\.jpg', page)}
authors = []
for slot in sorted(on_page):
    info = credits.get(slot, {})
    name = info.get('author', '')
    if info.get('license_url') and name and name not in authors:
        authors.append(name)
authors = [re.sub(r'\s+from .*$', '', a) for a in authors]

if authors:
    listed = ', '.join(authors[:-1]) + ' and ' + authors[-1] if len(authors) > 1 else authors[0]
    replacement = (
        'Photographs of the studios, and of Mount Eerwah, Booloumba Creek, Kenilworth\n'
        '        and the Everglades, are our own. The remaining area photographs come from\n'
        f'        Wikimedia Commons and stay the work of their photographers: {listed}.\n'
        '        Each is credited on the image and used under the Creative Commons licence\n'
        '        noted there; all have been resized for the web.')
else:
    replacement = 'All photographs on this page are our own.'

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
