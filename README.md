# Black Plum — Eerwah Vale

A website for two converted art studios in the Noosa hinterland, with a
front-end booking mock-up.

**Live: https://samwilsonsmith1.github.io/black-plum/**

- **Black Plum Art Shed** — [airbnb.com.au/rooms/23998031](https://www.airbnb.com.au/rooms/23998031)
- **Art Studio by the Creek** — [airbnb.com.au/rooms/983655210893217814](https://www.airbnb.com.au/rooms/983655210893217814)

## Files

```
index.html            Home — hero, both studios, the area, hosts, reviews
art-shed.html         Black Plum Art Shed
creek-studio.html     Art Studio by the Creek
things-to-do.html     What's worth the drive, and "ask James"
book.html             Four-step booking request (mock-up)
css/site.css          Design tokens + all shared styling
css/booking.css       Booking flow only
js/calendar.js        Availability, pricing, and the shared range calendar
js/site.js            Nav, scroll reveal, lightbox, hero search bar, Shanika
js/booking.js         The four-step request flow
photos/               Photography, pulled from the two Airbnb listings
photos/shanika.webp   The horse, cut out of her photo (alpha preserved)
photos/places/        Area photography from Wikimedia Commons + credits.json
build-single.py       Bundles the whole site into one shareable HTML file
dist/black-plum.html  That bundle — open it directly, no server needed
```

## Running it

It's plain HTML, CSS and JavaScript — no build step, no dependencies.
Open `dist/black-plum.html` in a browser and the whole site works offline.

To work on the source, serve the folder over HTTP (the pages load each
other, so `file://` won't do):

```bash
cd black-plum && python3 -m http.server 8123
```

Then visit http://localhost:8123.

After changing anything in the source, regenerate the single-file bundle:

```bash
cd black-plum && python3 build-single.py
```

## Deploying

The live site is GitHub Pages, served from `main` at the repo root. Push to
`main` and it redeploys in a minute or so:

```bash
git add -A && git commit -m "..." && git push
```

## The booking system

`book.html` is a **mock-up**. It is deliberately complete on the front end
and deliberately inert on the back end:

- Availability is generated deterministically per studio, so the calendar
  shows the same booked nights on every load (`buildBookedSet` in
  `js/booking.js`).
- Pricing is real arithmetic: a base nightly rate, +$30 Friday and
  Saturday, +$45 in December and January, +$15 in April, July and
  September, an $80 cleaning fee, $25 for a dog, a 12% service fee, and a
  10% / 20% discount at 7 and 28 nights.
- A two-night minimum is enforced, and a range containing a booked night
  is rejected. Choosing "either studio" only blocks a night when *both*
  are taken, and on submit it resolves to whichever studio can actually
  take the whole stay.
- **No booking is created, no email is sent and no payment is taken.** The
  payment step is visibly disabled and labelled as a demonstration.

To make it real you would replace the confirm handler in `js/booking.js`
with a POST to a booking provider, and swap `BOOKED` in `js/calendar.js`
for live availability from the same source.

## Editing

Nearly everything visual is a CSS custom property at the top of
`css/site.css`:

| Token | Used for |
| --- | --- |
| `--accent` | The viridian from the artists' palette — buttons, links, selected dates |
| `--ochre` | Secondary accent, used on dark sections |
| `--paper` / `--paper-warm` | Page and alternating section backgrounds |
| `--charcoal` | The dark sections, taken from the tin cladding |
| `--ink` / `--ink-soft` / `--ink-faint` | Text |

Nightly rates, fees and the minimum stay live at the top of
`js/calendar.js`.

Shanika leans into the creek photo when it scrolls into view. She's a
`.photo-peek` figure with a `.peek-critter` cut-out; the observer that
triggers her is at the bottom of `js/site.js`. If the image is ever
missing, the script removes her rather than leaving a broken frame.

## Notes and assumptions

- Nightly rates ($235 and $245) are estimates derived from the Airbnb
  totals in August 2026, not figures taken from the listings. Set the real
  ones in `js/booking.js`.
- Drive times on the home page are approximate and worth checking.
- The two studios are presented under one "Black Plum" identity. If they
  are not on the same land, the copy on the home page needs a small edit.
- Review quotes are guests' own words from the Art Shed listing.
- Photography comes from the two Airbnb listings.

## Guest reviews

The home page carries 22 real reviews in two rows that drift past in
opposite directions, pausing when you hover so a card can actually be read.
Every one is quoted from the two Airbnb listings (collected 27 Aug 2026);
the longer ones are trimmed with an ellipsis and nothing is paraphrased.
To add or change one, edit the `.quote` figures in `index.html`.

The rows loop by translating exactly one copy of their contents. `site.js`
clones each row's cards once, and the keyframe shifts by
`-50% - half a gap` — plain `-50%` lands half a gap short and the seam
visibly jumps.

The hosts are **James and Jacqui**; Arty is their dog and Shanika the
horse. The site said "hosted by James" until the reviews corrected it.

## Things to do

Drive times on `things-to-do.html` and on the home page were each measured on
Google Maps from Eerwah Vale, without traffic:

| Destination | Time | Distance |
| --- | --- | --- |
| Eumundi Markets | 8 min | 7.2 km |
| Mount Eerwah Conservation Park | 8 min | 6.5 km |
| Kenilworth | 20 min | 24.9 km |
| Coolum Beach | 27 min | 29.6 km |
| Boreen Point (Lake Cootharaba) | 32 min | 41.3 km |
| Noosa National Park | 33 min | 30.5 km |
| Montville | 38 min | 44.9 km |
| Booloumba Creek day-use area | 39 min | 38.4 km |

### Photography and licensing

Studio photographs are the owners' own. The area photographs come from
Wikimedia Commons and stay the property of their photographers — each is
credited in the corner of the image and again in the page footer, with a link
to its licence. `photos/places/credits.json` holds the full metadata (file
title, author, licence, licence URL, Commons page) for every one.

Google Maps imagery was **not** used for photos: those images belong to their
contributors and can't be republished on a site. Maps was used only to measure
drive times.

If you swap any of these photos, update the credit on the image, the footer
paragraph, and `credits.json` together.

### Swapping a photo

`swap-photos.py` drops replacement images into place. Name your files
`booloumba.*`, `kenilworth.*` or `everglades.*`, then:

```bash
python3 swap-photos.py ~/Downloads
```

It resizes and compresses each one, overwrites the file the page already
points at, and strips that image's on-image credit — a supplied photo
shouldn't carry a Wikimedia photographer's name. Afterwards, edit the footer
credit paragraph in `things-to-do.html` to drop any photographer whose image
is no longer on the page.

**Check you have the right to publish anything you add.** The site is public,
and the Commons photos are used precisely because their licences allow it.

### "Ask James"

The panel on `things-to-do.html` is a mock-up in the same spirit as the booking
form — it validates, summarises what was picked and confirms, but sends
nothing. The logic is at the bottom of `js/site.js`.

The four lines under "Already in the house notes" are quoted from the Airbnb
listing, so they're genuinely James's own words. His actual local
recommendations still need to come from him — that copy is in the `.notebook`
block in `things-to-do.html`.
