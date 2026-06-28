// ---------------------------------------------------------------------------
// Generate 150 realistic GovLink reports by running resident scenarios through
// the LIVE Beacon pipeline (chat -> formalize -> photo caption) on the local
// dev server. Every report gets a genuine AI chat log, severity rating, formal
// summary, and (for ~50) a real photo caption/moderation verdict.
//
//   1. start the dev server with the OpenAI key:  PORT=3000 npm run dev
//   2. node scripts/generate-150.mjs [limit]
//
// Output: public/data/govlink-reports-150.json  (written incrementally).
// Reports are stored as "sent"; gov workflow is simulated when loaded via
// simulate-gov-lifecycle.ts (status, resolution times, declines).
// ---------------------------------------------------------------------------

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "public/data/govlink-reports-150.json");
const BASE = process.env.BASE_URL || "http://localhost:3000";
const LIMIT = process.argv[2] ? Number(process.argv[2]) : Infinity;

const SJ = { lat: 37.3382, lng: -121.8863 };
const CITY = "San Jose";
const GREETING = `Hi, I'm Beacon. Tell me what's going on in the city and roughly where, and I'll turn it into a report for ${CITY}. What's the issue?`;
const PHOTO_PROMPT =
  "Photos help the city respond faster. Add any below, or skip if you don't have any.";
const CONTACT_PROMPT =
  "Optional: add an email or phone number so you can find this report later on the Track page without your tracking ID. You can skip if you prefer.";
const REVIEW_PROMPT =
  "Here's your report. Review everything below and hit Submit when it looks right. If something's off — including the severity ranking — tell me here and I'll take another look.";
const FILED_MSG = "Report submitted — thank you for helping keep San Jose running!";

// --- Commons image pool (filenames resolved + validated at runtime) ---------
// Relevant images keyed loosely by issue; "bad" images are irrelevant or
// inappropriate, to exercise the vision model's moderation path.
const IMG_FILES = {
  road: ["Pothole in Villeray, Montréal.jpg", "Pothole Big.jpg", "Pothole on local Road in County Monaghan.jpg"],
  sidewalk: ["Cracked sidewalk 1.jpg", "Damaged sidewalk in Montevideo - 01.jpg", "Damaged sidewalk in Montevideo - 02.jpg"],
  graffiti: ["Graffiti.jpg", "Graffiti Vinnytsia 2022 G1.jpg"],
  tree: ["Fallen tree.jpg", "Tree fallen after a storm.jpg"],
  waste: ["Overflowing garbage bin in Helsinki, Finland, 2019.jpg", "Overflowing Hamburg street garbage bin.jpg"],
  dumping: ["Illegal dumping near Swamp Creek in North Lynnwood.jpg"],
  light: ["Shattered light fixture 3.jpg"],
  power: ["Downed power line in Cidra, Puerto Rico after Hurricane Maria.jpg", "Downed power line and closed road in Morris County, NJ after a storm at night 01.jpg"],
  animal: ["Dead animal on asphalt, Bordeaux, France.JPG"],
  bad: ["Cat August 2010-4.jpg", "Hamburger sandwich.jpg", "Pizza.jpg", "Mona Lisa, by Leonardo da Vinci, from C2RMF retouched.jpg"],
};

// --- 150 resident scenarios -------------------------------------------------
// [ message, categoryHint|null, imageKey|null, clarifyMessage|null, corroborations|null ]
const S = [
  // Roads & Sidewalks ------------------------------------------------------
  ["There's a really deep pothole on Lincoln Ave near Willow St in Willow Glen. I've seen two cars swerve to avoid it.", "Roads & Sidewalks", "road", null, 3],
  ["Huge pothole on N 1st St right before Tasman, big enough to blow a tire. Been there at least a week.", "Roads & Sidewalks", "road", null, 2],
  ["The crosswalk paint at Santa Clara St and 4th is completely faded, you can barely see it at night.", "Roads & Sidewalks", null, null, null],
  ["Sidewalk on Bird Ave is buckled from a tree root and my mom tripped on it yesterday.", "Roads & Sidewalks", "sidewalk", null, null],
  ["A stop sign got knocked down at the corner of Naglee Ave and The Alameda. It's just lying in the bushes.", "Roads & Sidewalks", null, null, null],
  ["pothole on tully rd", "Roads & Sidewalks", null, "It's on Tully Rd near Senter, in the right lane heading east. Pretty deep.", null],
  ["The traffic signal at Stevens Creek and Winchester is stuck on red for the left turn, cars are running it.", "Roads & Sidewalks", null, null, null],
  ["Big crack running across the road on Hamilton Ave near Bascom, getting wider every week.", "Roads & Sidewalks", null, null, null],
  ["Sidewalk is totally crumbling outside the library on E San Antonio St in Naglee Park.", "Roads & Sidewalks", "sidewalk", null, null],
  ["Faded lane lines on Capitol Expressway make it really confusing during rain.", "Roads & Sidewalks", null, null, null],
  ["There's construction debris and a metal plate sticking up on McKee Rd, rattles every car.", "Roads & Sidewalks", null, null, null],
  ["The speed bump on Curtner Ave has eroded and there's exposed rebar poking out.", "Roads & Sidewalks", null, null, null],
  ["Manhole cover on Almaden Expressway is sunken a couple inches and clunks loudly.", "Roads & Sidewalks", null, null, null],
  ["Pothole cluster on Story Rd near King is wrecking everyone's alignment.", "Roads & Sidewalks", "road", null, 2],
  ["The curb ramp at Hedding and 1st is broken so wheelchairs can't get up it.", "Public Safety/Hazards", null, null, null],
  ["road sign bent", "Roads & Sidewalks", null, "It's the yield sign on Meridian Ave at Foxworthy, bent almost flat.", null],
  ["Loose gravel all over the bike lane on Hillsdale Ave, slipped on my bike this morning.", "Roads & Sidewalks", null, null, null],
  ["Giant puddle that never drains at Camden and Branham, floods the whole intersection corner.", "Roads & Sidewalks", null, null, null],

  // Electricity / Power Lines ---------------------------------------------
  ["The streetlight on Delmas Ave has been out for two weeks and it's pitch black at night.", "Electricity/Power Lines", null, null, 2],
  ["A power line is sagging really low over Coleman Ave near the airport, looks dangerous.", "Electricity/Power Lines", "power", null, null],
  ["Half the streetlights on Blossom Hill Rd are flickering on and off all night.", "Electricity/Power Lines", null, null, null],
  ["streetlight out", "Electricity/Power Lines", null, "On Cottle Rd near the train station, the tall light by the bus stop is dead.", null],
  ["There's a utility box on Saratoga Ave with the door hanging open and wires showing.", "Electricity/Power Lines", null, null, null],
  ["The pedestrian crossing light at Julian and 4th won't turn on, people cross blind.", "Electricity/Power Lines", null, null, null],
  ["A transformer on Park Ave made a loud bang and now the streetlights nearby are off.", "Electricity/Power Lines", null, null, null],
  ["Streetlight pole on Senter Rd is leaning over the sidewalk, looks like it could fall.", "Public Safety/Hazards", null, null, null],
  ["The light at the Japantown parking lot entrance on Jackson St is out again.", "Electricity/Power Lines", null, null, null],
  ["Whole block of Minnesota Ave lost its streetlights after the storm last night.", "Electricity/Power Lines", null, null, 3],
  ["Sparks coming off a streetlight on Alum Rock Ave when it tries to turn on.", "Electricity/Power Lines", null, null, null],
  ["The traffic signal lost power at King and Story, it's a 4-way guess right now.", "Electricity/Power Lines", null, null, null],

  // Water / Plumbing -------------------------------------------------------
  ["Water main break on The Alameda, water is gushing into the street and down toward the storm drain.", "Water/Plumbing", null, null, 3],
  ["There's a fire hydrant leaking steadily on W San Carlos St, been running for days.", "Water/Plumbing", null, null, null],
  ["The storm drain at Bascom and Hamilton is clogged and the corner floods every rain.", "Water/Plumbing", null, null, 2],
  ["water everywhere", "Water/Plumbing", null, "There's water bubbling up through the asphalt on Meridian Ave near Willow, clean water, constant.", null],
  ["Sewer smell and dark water pooling near the manhole on Reed St downtown.", "Water/Plumbing", null, null, null],
  ["A sprinkler in the median on Santa Teresa Blvd is broken and spraying into traffic.", "Water/Plumbing", null, null, null],
  ["Low water pressure on my whole street, Virginia St, and the neighbors too since this morning.", "Water/Plumbing", null, null, 2],
  ["The drinking fountain at the park on Hedding St is stuck on and flooding the path.", "Water/Plumbing", null, null, null],
  ["Brown water coming out of the public restroom tap at the plaza on Market St.", "Water/Plumbing", null, null, null],
  ["Big puddle of standing water on Taylor St that's turning green and breeding mosquitoes.", "Water/Plumbing", null, null, null],
  ["Cracked water pipe visible in the gutter on University Ave, slow steady leak.", "Water/Plumbing", null, null, null],
  ["The creek path drain at Los Gatos Creek is backed up and overflowing onto the trail.", "Water/Plumbing", null, null, null],

  // Parks & Trees ----------------------------------------------------------
  ["A big tree branch fell across the path at Backesto Park and nobody's moved it.", "Parks & Trees", "tree", null, null],
  ["Half a tree came down on Naglee Ave during the wind, it's blocking the sidewalk completely.", "Parks & Trees", "tree", null, 2],
  ["The playground swing at Kelley Park has a broken chain, a kid could get hurt.", "Parks & Trees", null, null, null],
  ["tree leaning", "Parks & Trees", null, "There's a large oak at Alum Rock Park leaning hard over the parking lot after the rain.", null],
  ["Graffiti all over the restroom building at Roosevelt Park, pretty vulgar stuff.", "Public Safety/Hazards", "graffiti", null, null],
  ["Dead tree at the corner of Williams and 10th, all the bark is gone and branches are dropping.", "Parks & Trees", null, null, null],
  ["The park bench at Guadalupe River Park is smashed, splinters everywhere.", "Parks & Trees", null, null, null],
  ["Sprinklers at St James Park have been running 24/7 and the lawn is a swamp.", "Parks & Trees", null, null, null],
  ["A huge branch is hanging by a thread over the playground at Cahill Park.", "Public Safety/Hazards", "tree", null, null],
  ["Overgrown bushes are blocking the walking trail along Coyote Creek.", "Parks & Trees", null, null, null],
  ["Someone spray painted the whole play structure at Ryland Park overnight.", "Parks & Trees", "graffiti", null, null],
  ["The trail lights at Los Gatos Creek Trail are all out, can't walk the dog safely at dusk.", "Parks & Trees", null, null, null],

  // Waste & Sanitation -----------------------------------------------------
  ["Someone dumped a whole couch and a mattress on the corner of 7th and Empire.", "Waste & Sanitation", "dumping", null, null],
  ["The public trash can at the bus stop on First St is overflowing and trash is blowing everywhere.", "Waste & Sanitation", "waste", null, 2],
  ["Pile of construction debris dumped in the empty lot on Stockton Ave, growing every day.", "Waste & Sanitation", "dumping", null, null],
  ["illegal dumping", "Waste & Sanitation", "dumping", "There are like ten bags of garbage and old tires dumped under the 280 overpass at Bird Ave.", null],
  ["Recycling bins at the apartment complex on Hedding have been overflowing for a week.", "Waste & Sanitation", "waste", null, null],
  ["Someone left a broken TV and electronics on the sidewalk on Willow St, leaking something.", "Waste & Sanitation", null, null, null],
  ["Trash cans knocked over and garbage all over the street on Delmas after pickup.", "Waste & Sanitation", null, null, null],
  ["Dumpster behind the strip mall on Tully is overflowing into the parking lot, smells terrible.", "Waste & Sanitation", "waste", null, null],
  ["Abandoned shopping carts piling up along the Guadalupe River trail.", "Waste & Sanitation", null, null, null],
  ["Someone dumped paint cans and chemicals near the storm drain on Auzerais Ave.", "Public Safety/Hazards", null, null, null],
  ["Litter everywhere at the Berryessa flea market entrance, cans and bottles all over.", "Waste & Sanitation", null, null, null],
  ["Old furniture and a fridge dumped on the curb on McLaughlin Ave for two weeks now.", "Waste & Sanitation", "dumping", null, 2],

  // Public Safety / Hazards ------------------------------------------------
  ["There's a ton of broken glass spread across the bike lane on The Alameda.", "Public Safety/Hazards", null, null, null],
  ["An open manhole with no cover or cones on Market St, someone could fall right in.", "Public Safety/Hazards", null, null, 2],
  ["Graffiti with offensive language on the underpass wall at 87 and Julian.", "Public Safety/Hazards", "graffiti", null, null],
  ["broken glass on the road", "Public Safety/Hazards", null, "It's all over the intersection at 10th and Santa Clara, looks like a bottle smashed.", null],
  ["A chunk of the retaining wall along Coyote Creek collapsed onto the path.", "Public Safety/Hazards", null, null, null],
  ["There's an abandoned car that's been on Spencer Ave for a month, windows smashed.", "Public Safety/Hazards", null, null, null],
  ["Exposed rebar sticking out of a broken curb at the corner of 4th and William, tripping hazard.", "Public Safety/Hazards", "sidewalk", null, null],
  ["A street sign pole sheared off and the jagged metal is sticking up on Keyes St.", "Public Safety/Hazards", null, null, null],
  ["Someone pried open a storm drain grate on Almaden Rd and left the hole open.", "Public Safety/Hazards", null, null, null],
  ["The guardrail along Senter Rd is mangled from a crash and sticking into the bike lane.", "Public Safety/Hazards", null, null, null],
  ["Loose bricks falling off the old building facade onto the sidewalk on S 1st St.", "Public Safety/Hazards", null, null, null],
  ["A deep sinkhole is opening up at the edge of the road on Communications Hill Blvd.", "Public Safety/Hazards", null, null, 2],

  // Animal / Wildlife ------------------------------------------------------
  ["There's a dead deer on the side of Almaden Expressway that's been there for days.", "Animal/Wildlife", "animal", null, null],
  ["A really aggressive stray dog has been roaming the Spartan Keyes neighborhood scaring kids.", "Animal/Wildlife", null, null, null],
  ["Dead raccoon in the middle of Curtner Ave, getting hit over and over.", "Animal/Wildlife", "animal", null, null],
  ["dead animal", "Animal/Wildlife", null, "Looks like a possum, on Hamilton Ave near the Pruneyard side, in the gutter.", null],
  ["A swarm of bees set up a hive in the tree at the bus stop on Bascom Ave.", "Animal/Wildlife", null, null, null],
  ["There's an injured hawk on the ground in St James Park, can't fly.", "Animal/Wildlife", null, null, null],
  ["Coyotes have been getting into trash and there are pups near the Guadalupe trail.", "Animal/Wildlife", null, null, null],
  ["Dead cat on the road on Leigh Ave, someone should remove it.", "Animal/Wildlife", "animal", null, null],
  ["A colony of rats is nesting in the abandoned lot on Stockton Ave.", "Animal/Wildlife", null, null, null],
  ["Big rattlesnake spotted on the walking path at Communications Hill, lots of people walk there.", "Public Safety/Hazards", null, null, null],

  // Noise Complaints (mostly out-of-scope-ish but some valid city ones) ----
  ["Construction crew on N 1st St starts jackhammering at 5am, way before the allowed hours.", "Noise Complaints", null, null, null],
  ["There's a car alarm that's been going off nonstop near Reed St for hours.", "Noise Complaints", null, null, null],
  ["The crosswalk audio signal at 2nd and Santa Clara is stuck blaring at full volume all night.", "Noise Complaints", null, null, null],
  ["Loud industrial fan from the city pump station on Spring St runs all night.", "Noise Complaints", null, null, null],

  // Other ------------------------------------------------------------------
  ["The public clock in the plaza downtown has been stopped at 4:15 for months.", "Other", null, null, null],
  ["A bus shelter on Monterey Rd has a shattered glass panel, sharp edges everywhere.", "Public Safety/Hazards", null, null, null],
  ["The wheelchair ramp at the community center on Alma Ave is blocked by a broken gate.", "Other", null, null, null],
  ["Public restroom at the transit center has been locked for weeks with no notice.", "Other", null, null, null],

  // --- Vague first messages that need a clarify turn ----------------------
  ["something's wrong on my street", "Roads & Sidewalks", null, "There's a big pothole forming on Bird Ave near Coe, cars keep hitting it hard.", null],
  ["it's broken again", "Electricity/Power Lines", null, "The streetlight at Delmas and Auzerais, it keeps going out every few nights.", null],
  ["there's a problem at the park", "Parks & Trees", null, "At Backesto Park the water fountain is broken and flooding the playground area.", null],
  ["can you help with something", "Waste & Sanitation", null, "Yeah someone dumped a pile of tires behind the lot on Stockton Ave.", null],
  ["hi there is an issue near me", "Water/Plumbing", null, "A fire hydrant on W San Carlos is leaking a steady stream into the gutter.", null],

  // --- Scenarios with photos (relevant) -----------------------------------
  ["Pothole on Almaden Rd that keeps getting bigger, I took a photo of it.", "Roads & Sidewalks", "road", null, 2],
  ["The sidewalk is badly cracked outside the school on Cunningham Ave, photo attached.", "Roads & Sidewalks", "sidewalk", null, null],
  ["Graffiti covering the sound wall along 280 near Bird Ave, see photo.", "Public Safety/Hazards", "graffiti", null, null],
  ["Tree came down across the sidewalk on Newhall St, here's a picture.", "Parks & Trees", "tree", null, 2],
  ["Trash overflowing at the park bin again, attaching what it looks like.", "Waste & Sanitation", "waste", null, null],
  ["Downed line and a closed-off section on Coleman Ave after the storm, photo included.", "Electricity/Power Lines", "power", null, null],
  ["Dead animal on the shoulder of Monterey Rd, photo so you can see where.", "Animal/Wildlife", "animal", null, null],
  ["Someone dumped a load of junk by the creek, picture attached.", "Waste & Sanitation", "dumping", null, null],
  ["Broken and shattered streetlight fixture on Hedding, see attached.", "Electricity/Power Lines", "light", null, null],
  ["Crumbling sidewalk slab lifted up on Lincoln Ave, photo shows how bad.", "Roads & Sidewalks", "sidewalk", null, null],

  // --- Scenarios with photos that don't match (vision should push back) ----
  ["The pothole on Stevens Creek Blvd is huge, here's a photo.", "Roads & Sidewalks", "bad", null, null],
  ["There's graffiti on the wall at the park, attaching a picture of it.", "Public Safety/Hazards", "bad", null, null],
  ["A streetlight is out on Saratoga Ave, I added a photo.", "Electricity/Power Lines", "bad", null, null],
  ["Trash dumped on the corner of King and Story, see the image.", "Waste & Sanitation", "bad", null, null],
  ["Broken bench at the park, photo attached.", "Parks & Trees", "bad", null, null],

  // --- Additional scenarios (to reach 150) --------------------------------
  ["The asphalt is sinking around the trench they patched on Moorpark Ave, it's a dip now.", "Roads & Sidewalks", null, null, null],
  ["Faded school-zone markings on Cunningham Ave, drivers don't slow down anymore.", "Roads & Sidewalks", null, null, null],
  ["A pothole opened up right at the bus stop on Monterey Rd and Senter.", "Roads & Sidewalks", "road", null, 2],
  ["The crosswalk button at White Rd and McKee doesn't work, light never changes for walkers.", "Roads & Sidewalks", null, null, null],
  ["Tree roots have lifted the sidewalk into a ramp on Dana Ave, kids on bikes keep wiping out.", "Roads & Sidewalks", "sidewalk", null, null],
  ["Whole stretch of Quimby Rd has alligator cracking and small potholes forming.", "Roads & Sidewalks", null, null, null],
  ["Recycling never got picked up on our whole street, Bird Ave, bins out for days.", "Waste & Sanitation", null, null, 2],
  ["Someone dumped a pile of yard waste and branches into the bike lane on Leigh Ave.", "Waste & Sanitation", null, null, null],
  ["The trash enclosure at the park on Roberts Ave is overflowing and animals are getting in.", "Waste & Sanitation", "waste", null, null],
  ["Mattress and box spring dumped at the dead end of Spencer Ave, been a week.", "Waste & Sanitation", "dumping", null, null],
  ["Storm drain on Foxworthy is gurgling and backing up sewage smell into the street.", "Water/Plumbing", null, null, null],
  ["A water valve cover on Camden is shooting a little fountain every time a truck rolls over it.", "Water/Plumbing", null, null, null],
  ["The irrigation line at the Hellyer Ave median burst and it's washing mud across the road.", "Water/Plumbing", null, null, null],
  ["Standing water under the overpass on 7th St has been there for weeks and smells.", "Water/Plumbing", null, null, null],
  ["Big eucalyptus dropped a huge limb across the trail at Almaden Lake Park.", "Parks & Trees", "tree", null, null],
  ["The slide at the Cataldi Park playground is cracked with a sharp edge.", "Parks & Trees", null, null, null],
  ["Irrigation broke at Emma Prusch Park and a section is completely flooded.", "Parks & Trees", null, null, null],
  ["Graffiti tags all over the picnic shelter at Almaden Lake Park.", "Parks & Trees", "graffiti", null, null],
  ["The streetlight at the school crossing on Branham keeps cutting out at night.", "Electricity/Power Lines", null, null, 2],
  ["A power pole on King Rd is charred near the base and there's a burnt smell.", "Public Safety/Hazards", null, null, null],
  ["Streetlights along Oakland Rd are all dark, makes the whole stretch unsafe to walk.", "Electricity/Power Lines", null, null, 3],
  ["The traffic signal at Capitol and Aborn is flashing red in all directions since this morning.", "Electricity/Power Lines", null, null, null],
  ["There's a deep gap between the road and a steel plate on Berryessa Rd that nearly threw my bike.", "Public Safety/Hazards", null, null, null],
  ["A fire hydrant got sheared off on E William St and there's a hazard cone but no crew.", "Public Safety/Hazards", null, null, null],
  ["The chain-link fence by the creek on Singleton Rd collapsed into the walking path.", "Public Safety/Hazards", null, null, null],
  ["Someone left a pile of broken glass and a smashed bottle at the Bascom light rail platform.", "Public Safety/Hazards", null, null, null],
  ["There's a hawk tangled in netting on a building ledge on N 4th St, still alive.", "Animal/Wildlife", null, null, null],
  ["Dead skunk on Snell Ave that's been there a couple days, the smell is rough.", "Animal/Wildlife", "animal", null, null],
  ["Aggressive loose dog pack near the Roosevelt Community Center, people are scared to walk.", "Animal/Wildlife", null, null, null],
  ["The crosswalk speaker at Hedding and 1st is stuck chirping loudly through the night.", "Noise Complaints", null, null, null],
  ["A city leaf blower crew starts at 6am on Sundays on Naglee, way before allowed hours.", "Noise Complaints", null, null, null],
  ["The flag at city hall plaza is shredded and the pole halyard is clanging all night.", "Other", null, null, null],
  ["The info kiosk screen at the transit center has been smashed for weeks.", "Other", null, null, null],
  ["Streetlight on Tully Rd is out and I attached a photo of the pole.", "Electricity/Power Lines", "bad", null, null],
];

// --- helpers ----------------------------------------------------------------
const ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function block(n) { let s = ""; for (let i = 0; i < n; i++) s += ID_ALPHABET[(Math.random() * ID_ALPHABET.length) | 0]; return s; }
function ticketId() { return `GL-${block(3)}-${block(4)}`; }
function uid(p) { return `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const FIRST = ["Maya", "Daniel", "Aisha", "Carlos", "Priya", "James", "Linh", "Sofia", "Marcus", "Elena", "Tomás", "Grace", "Andre", "Mei", "Jordan", "Rosa", "Kenji", "Nadia", "Victor", "Hana"];
const LAST = ["Thompson", "Reyes", "Khan", "Nguyen", "Patel", "Garcia", "Chen", "Rossi", "Okafor", "Martinez", "Kim", "Singh", "Lopez", "Tran", "Walker", "Silva", "Ahmed", "Park", "Diaz", "Wong"];
function person(i) {
  const f = FIRST[i % FIRST.length], l = LAST[(i * 7) % LAST.length];
  return { name: `${f} ${l}`, email: `${f}.${l}`.toLowerCase() + "@example.com", phone: `(408) 555-0${String(100 + (i % 900)).padStart(3, "0")}` };
}

// Spread dates June 2024 -> ~late June 2026, lightly weighted to recent.
const T0 = new Date("2024-06-01T00:00:00Z").getTime();
const T1 = new Date("2026-06-20T00:00:00Z").getTime();
function dateFor(i, n) {
  const frac = (i + Math.random() * 0.6) / n;
  const skew = Math.pow(frac, 0.85); // mild recency skew
  const t = T0 + skew * (T1 - T0);
  const d = new Date(t);
  d.setHours(7 + ((i * 13) % 13), (i * 17) % 60, 0, 0);
  return d;
}

async function postJSON(path, body) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(BASE + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 429) { await sleep(1500 * (attempt + 1)); continue; }
      if (!res.ok) throw new Error(`${path} -> ${res.status}`);
      return await res.json();
    } catch (e) {
      if (attempt === 3) throw e;
      await sleep(800 * (attempt + 1));
    }
  }
}

// Resolve a Commons filename to a direct, validated image URL.
const imgCache = new Map();
async function resolveImage(file) {
  if (imgCache.has(file)) return imgCache.get(file);
  const url = "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(file);
  try {
    const res = await fetch(url, { redirect: "follow" });
    const ct = res.headers.get("content-type") || "";
    const ok = res.ok && ct.startsWith("image/");
    const final = ok ? res.url : null;
    imgCache.set(file, final);
    return final;
  } catch {
    imgCache.set(file, null);
    return null;
  }
}
const imgIdx = {};
async function pickImage(key) {
  const files = IMG_FILES[key] || [];
  for (let k = 0; k < files.length; k++) {
    imgIdx[key] = (imgIdx[key] ?? -1) + 1;
    const file = files[imgIdx[key] % files.length];
    const url = await resolveImage(file);
    if (url) return { url, file };
  }
  return null;
}

function jitterLoc(i) {
  const lat = SJ.lat + (Math.sin(i * 12.9898) * 0.5) * 0.085 + (Math.random() - 0.5) * 0.01;
  const lng = SJ.lng + (Math.cos(i * 78.233) * 0.5) * 0.105 + (Math.random() - 0.5) * 0.01;
  return { lat: +lat.toFixed(5), lng: +lng.toFixed(5) };
}

// Pull a street/landmark out of the message for a believable address label.
function addressFrom(msg) {
  const m = msg.match(/\b([A-Z][\w.]+(?:\s[A-Z][\w.]+)*\s(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Expressway|Expwy|Trail))\b/);
  if (m) return `${m[1]}, San Jose, CA`;
  return "San Jose, CA";
}

async function run() {
  const n = Math.min(S.length, LIMIT);
  console.log(`Generating ${n} reports against ${BASE} ...`);

  // sanity: is Beacon (the OpenAI key) live?
  const status = await fetch(BASE + "/api/beacon/status").then((r) => r.json()).catch(() => ({}));
  console.log("Beacon available:", status.available);
  if (!status.available) {
    console.error("OpenAI key not available on the server — start dev with the key. Aborting.");
    process.exit(1);
  }

  const reports = [];
  let withImages = 0, flagged = 0, clarified = 0, corro = 0;

  for (let i = 0; i < n; i++) {
    const [msg, hint, imgKey, clarify, corroN] = S[i];
    const created = dateFor(i, n);
    const iso = (d) => d.toISOString();
    let chatLog = [];
    let t = created.getTime();
    const stamp = () => iso(new Date((t += 45000)));

    chatLog.push({ role: "beacon", text: GREETING, at: stamp() });
    chatLog.push({ role: "user", text: msg, at: stamp() });

    // 1) intake chat (real)
    let messages = [{ role: "user", content: msg }];
    let chat = await postJSON("/api/beacon/chat", { messages });
    chatLog.push({ role: "beacon", text: chat.reply, at: stamp() });

    let residentText = msg;
    if (clarify && chat.intent !== "ready") {
      chatLog.push({ role: "user", text: clarify, at: stamp() });
      messages = [...messages, { role: "assistant", content: chat.reply }, { role: "user", content: clarify }];
      chat = await postJSON("/api/beacon/chat", { messages });
      chatLog.push({ role: "beacon", text: chat.reply, at: stamp() });
      residentText = `${msg}\n${clarify}`;
      clarified++;
    }

    const category = (chat.draft && chat.draft.category) || hint || "Other";

    // 2) formalize (real)
    const address = addressFrom(residentText);
    const formal = await postJSON("/api/beacon/formalize", {
      description: residentText,
      category,
      locationLabel: address,
    });

    const loc = jitterLoc(i);

    // 3) optional photo caption (real vision call)
    let media = [];
    if (imgKey) {
      const picked = await pickImage(imgKey);
      if (picked) {
        const cap = await postJSON("/api/beacon/caption", {
          imageDataUrl: picked.url,
          category: formal.category,
          description: residentText,
        });
        const isFlagged = cap.status !== "ok";
        media.push({
          id: uid("media"),
          dataUrl: picked.url,
          kind: "image",
          name: picked.file,
          caption: cap.caption || undefined,
          flagged: isFlagged || undefined,
        });
        withImages++;
        if (isFlagged) flagged++;
        // chat reflects the photo step + any pushback
        chatLog.push({ role: "beacon", text: PHOTO_PROMPT, at: stamp() });
        chatLog.push({ role: "user", text: "Added 1 photo", at: stamp() });
        if (isFlagged && cap.message) {
          chatLog.push({ role: "beacon", text: cap.message, at: stamp() });
        }
      }
    }
    if (media.length === 0) {
      chatLog.push({ role: "beacon", text: PHOTO_PROMPT, at: stamp() });
      chatLog.push({ role: "user", text: "No photos to add", at: stamp() });
    }

    // contact step
    const named = i % 5 < 2; // ~40% leave contact info
    const p = person(i);
    const contact = named
      ? { anonymous: false, name: p.name, email: p.email, phone: p.phone }
      : { anonymous: true };
    chatLog.push({ role: "beacon", text: CONTACT_PROMPT, at: stamp() });
    chatLog.push({
      role: "user",
      text: named ? `Contact added: email ${p.email}, phone ${p.phone}` : "Skip contact info",
      at: stamp(),
    });

    // review + filed
    chatLog.push({ role: "beacon", text: REVIEW_PROMPT, at: stamp() });
    chatLog.push({ role: "beacon", text: FILED_MSG, at: stamp() });

    // baseSeverity from the model, weighted by corroborations
    const base = clampInt(formal.baseSeverity ?? (chat.draft && chat.draft.baseSeverity) ?? 5);
    const submissions = [
      {
        id: uid("sub"),
        description: residentText,
        createdAt: iso(created),
        contact,
        chatLog,
      },
    ];
    let nCorro = 1;
    if (corroN && corroN > 1) {
      nCorro = corroN;
      for (let c = 1; c < corroN; c++) {
        const cd = new Date(created.getTime() + c * (3600_000 * (6 + (c * 5))));
        const cp = person(i + c * 3);
        submissions.push({
          id: uid("sub"),
          description: `Confirming this — ${residentText.split(/[.!?]/)[0].toLowerCase()}.`,
          createdAt: iso(cd),
          contact: c % 2 ? { anonymous: true } : { anonymous: false, name: cp.name, email: cp.email },
          distanceM: 20 + c * 35,
        });
      }
      corro++;
    }
    const severity = weightedSeverity(base, nCorro);

    const report = {
      id: ticketId(),
      formalTitle: formal.formalTitle,
      description: formal.formalDescription,
      residentDescription: residentText,
      servicePriority: formal.servicePriority,
      category: formal.category,
      location: { ...loc, address, method: "pin" },
      media,
      severity,
      baseSeverity: base,
      noticedAt: iso(new Date(created.getTime() - 86400000 * (1 + (i % 4)))),
      createdAt: iso(created),
      updatedAt: iso(created),
      status: "sent",
      contact,
      submissions,
      internalNotes: [],
      statusHistory: [{ status: "sent", at: iso(created) }],
      chatLog,
    };
    reports.push(report);

    // newest first
    reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), count: reports.length, reports }, null, 2));
    console.log(`[${i + 1}/${n}] ${report.category} sev${severity}${media.length ? " 📷" + (media[0].flagged ? "⚠" : "") : ""} — ${formal.formalTitle?.slice(0, 60)}`);
    await sleep(150);
  }

  console.log(`\nDone. ${reports.length} reports. images=${withImages} flagged=${flagged} clarified=${clarified} corroborated=${corro}`);
  console.log(`Wrote ${OUT}`);
}

function clampInt(x) { return Math.max(1, Math.min(10, Math.round(Number(x) || 5))); }
function weightedSeverity(base, corroborations) {
  const b = clampInt(base);
  const extra = Math.max(0, corroborations - 1);
  const bump = extra === 0 ? 0 : 3.2 * (1 - Math.exp(-extra / 2.2));
  return clampInt(b + bump);
}

mkdirSync(dirname(OUT), { recursive: true });
run().catch((e) => { console.error(e); process.exit(1); });
