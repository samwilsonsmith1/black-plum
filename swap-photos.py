#!/usr/bin/env python3
"""
Drop replacement photos into place.

Save your images anywhere and name them booloumba / kenilworth / everglades
(any common extension), then run:

    python3 swap-photos.py ~/Downloads

Each one is resized, compressed and written over the file the page already
points at, and its on-image credit is removed — because a photo you supplied
isn't a Wikimedia one and shouldn't carry someone else's name.
"""
import json, os, re, shutil, subprocess, sys, glob

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)

SLOTS = ('booloumba', 'kenilworth', 'everglades')
EXTS = ('.jpg', '.jpeg', '.png', '.webp', '.heic')

src_dir = os.path.expanduser(sys.argv[1] if len(sys.argv) > 1 else '~/Downloads')
found = {}
for slot in SLOTS:
    for f in sorted(glob.glob(os.path.join(src_dir, '*'))):
        name = os.path.basename(f).lower()
        if name.startswith(slot) and name.endswith(EXTS):
            found[slot] = f
            break

if not found:
    print(f'Nothing to swap. Looked in {src_dir} for files starting with:')
    print('  ' + ', '.join(SLOTS))
    sys.exit(1)

page = open('things-to-do.html').read()
credits = json.load(open('photos/places/credits.json'))

for slot, src in found.items():
    dst = f'photos/places/{slot}.jpg'
    shutil.copy(src, dst)
    subprocess.run(['sips', '-Z', '1400', '-s', 'format', 'jpeg',
                    '-s', 'formatOptions', '58', dst],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # the old Commons credit no longer applies to this image
    page = re.sub(rf'\s*<figcaption[^>]*data-credit="{slot}"[^>]*>.*?</figcaption>', '', page, flags=re.S)
    page = re.sub(rf'(<img src="photos/places/{slot}\.jpg"[^>]*>)\s*<figcaption>.*?</figcaption>',
                  r'\1', page, flags=re.S)
    credits[slot] = {'title': os.path.basename(src), 'author': 'Supplied by the owners',
                     'license': 'Supplied — not a Wikimedia image',
                     'license_url': '', 'page': ''}
    print(f'{slot:<12} <- {os.path.basename(src)}  ({os.path.getsize(dst)//1024} KB)')

open('things-to-do.html', 'w').write(page)
json.dump(credits, open('photos/places/credits.json', 'w'), indent=1)

remaining = [s for s in SLOTS if s not in found]
if remaining:
    print('\nStill using the Wikimedia photo for: ' + ', '.join(remaining))
print('\nNow check the footer credit paragraph in things-to-do.html — remove any')
print('photographer who no longer has an image on the page, then rebuild and push.')
