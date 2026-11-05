# Hague Open Hours

Build a mobile-first React web app called Late Hague for students in The Hague who need a place to study or eat late, when the university library is closed. PROBLEM: The Haagse Hogeschool main library closes at 22:30 Monday to Thursday and at 18:00 on Friday, and no weekend hours are listed. The Centrale Bibliotheek closes at 20:00. Students who study late have no easy way to find which study places and food spots are actually open at the time they want. USERS: students of De Haagse Hogeschool and other higher education students in The Hague who study in the evening, at night or at weekends. Not for tourists, and it does not replace asking a place if studying is allowed. DATA: load live data from the OpenStreetMap Overpass API (https://overpass-api.de/api/interpreter) in the browser, inside the municipality of Den Haag (area name Den Haag, admin_level 8). Fetch with tags and centre point: amenity=library, amenity=cafe, amenity=coworking_space, office=coworking (these are Study places) and amenity=fast_food, shop=convenience, shop=supermarket, amenity=restaurant (these are Food). Show the text Data: OpenStreetMap contributors linking to https://www.openstreetmap.org/copyright. FEATURES: 1) A day-and-time picker, default to the current day and time in Europe/Amsterdam, with quick buttons Now, Tonight 23:00, Friday 20:00, Saturday 14:00. 2) Use the npm package opening_hours to read each place's opening_hours tag and decide if it is open at the chosen day and time (make sure it installs and works in the browser build). Show three groups: Open then, Closed then, and Hours unknown (places without an opening_hours tag). Never treat unknown as open. Show the unknown group collapsed with a note that many places in OpenStreetMap have no hours. 3) Two tabs, Study and Food. On the Study tab show small badges only when the tags say so: Wi-Fi (internet_access=wlan or yes) and power sockets (power_supply or socket tags). Do not invent badges. 4) A map (react-leaflet with OpenStreetMap tiles) and a list, synchronised. Clicking a list item centres the map. Each item shows name, type, the opening hours text, distance from the user only if they press a Near me button and allow location, and a Directions link to https://www.google.com/maps/dir/?api=1&destination=LAT,LON (just a link, no Google API). 5) A fixed card at the top of the Study tab with the official Haagse Hogeschool library hours: Monday to Thursday 09:00 to 22:30, Friday 09:00 to 18:00, weekends not listed, holiday hours differ, with source link https://www.dehaagsehogeschool.nl/over-de-haagse/faciliteiten/bibliotheek/over-de-bibliotheek/openingstijden-en-contactgegevens and the text Check the source, hours can change. 6) An About and limits page saying: what the app does and for whom, that data comes from OpenStreetMap volunteers, that only part of the places have opening hours so some real places are missing or wrong, that it does not know if a place allows studying or how busy it is, and who it does not serve (people without a smartphone or internet, people who need accessibility information, which the app does not provide). Add a Report wrong hours link to https://www.openstreetmap.org/ so users can fix the data. 7) Clear loading, error and empty-result messages. Cache the Overpass response in localStorage for one hour. DESIGN: dark theme friendly for night use, large touch targets, readable on a phone. No login, no accounts, no tracking, no ads. Never store or send the user's location anywhere.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://hague-open-hours.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f76c1121-4a19-4f75-8f71-a594fe2f5813).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
