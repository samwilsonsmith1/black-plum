# Black Plum — Eerwah Vale

A website for two converted art studios in the Noosa hinterland, with a
front-end booking mock-up.

- **Black Plum Art Shed** — [airbnb.com.au/rooms/23998031](https://www.airbnb.com.au/rooms/23998031)
- **Art Studio by the Creek** — [airbnb.com.au/rooms/983655210893217814](https://www.airbnb.com.au/rooms/983655210893217814)

## Files

```
index.html            Home — hero, both studios, the area, hosts, reviews
art-shed.html         Black Plum Art Shed
creek-studio.html     Art Studio by the Creek
book.html             Four-step booking request (mock-up)
css/site.css          Design tokens + all shared styling
css/booking.css       Booking flow only
js/site.js            Nav, scroll reveal, lightbox, hero search bar
js/booking.js         Calendar, availability, pricing, the four steps
photos/               Photography, pulled from the two Airbnb listings
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
  is rejected.
- **No booking is created, no email is sent and no payment is taken.** The
  payment step is visibly disabled and labelled as a demonstration.

To make it real you would replace the confirm handler in `js/booking.js`
with a POST to a booking provider, and swap `BOOKED` for live availability
from the same source.

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
`js/booking.js`.

## Notes and assumptions

- Nightly rates ($235 and $245) are estimates derived from the Airbnb
  totals in August 2026, not figures taken from the listings. Set the real
  ones in `js/booking.js`.
- Drive times on the home page are approximate and worth checking.
- The two studios are presented under one "Black Plum" identity. If they
  are not on the same land, the copy on the home page needs a small edit.
- Review quotes are guests' own words from the Art Shed listing.
- Photography comes from the two Airbnb listings.
