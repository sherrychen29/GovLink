// ---------------------------------------------------------------------------
// Nine curated demo reports for the login-page "Generate samples" action.
// Each entry mirrors a full Beacon intake: resident wording, formal summary,
// location, chat log, and varied filing style (anonymous, logged-in, terse, etc.).
// Reload with loadSampleReports() from the store — no API calls required.
// ---------------------------------------------------------------------------

import type { SeedReportInput } from "./seed";
import { BEACON_GREETING, buildReportFromSeed } from "./seed";
import type { Report } from "./types";

function daysAgo(d: number, hour = 14, minute = 0): string {
  const t = new Date();
  t.setDate(t.getDate() - d);
  t.setHours(hour, minute, 0, 0);
  return t.toISOString();
}

function hoursAgo(h: number, minute = 0): string {
  const t = new Date();
  t.setHours(t.getHours() - h, minute, 0, 0);
  return t.toISOString();
}

function atOffset(base: string, minutes: number): string {
  return new Date(new Date(base).getTime() + minutes * 60000).toISOString();
}

const SAMPLE_INPUTS: SeedReportInput[] = [
  {
    id: "GL-SM1-4102",
    category: "Roads & Sidewalks",
    formalTitle: "Large pothole — Winchester Boulevard near Hamilton Ave",
    description:
      "Large pothole in the right travel lane on Winchester Boulevard, approximately 200 feet south of Hamilton Avenue. Approx. 18 inches wide and 4 inches deep; vehicles are swerving to avoid it.",
    residentDescription:
      "There's a big pothole on Winchester Boulevard near Hamilton — it's huge and cars keep swerving around it.",
    servicePriority: "Elevated",
    lat: 37.3234,
    lng: -121.9512,
    address: "1455 Winchester Boulevard",
    crossStreet: "Winchester Blvd & Hamilton Ave",
    baseSeverity: 7,
    status: "in_progress",
    createdAt: daysAgo(5, 9, 22),
    noticedAt: daysAgo(6, 7, 0),
    reporterId: "acc_c2",
    contactName: "Daniel Reyes",
    contactEmail: "daniel.reyes@gmail.com",
    contactPhone: "(555) 274-9930",
    media: [{ label: "Pothole, Winchester", from: "#92400e", to: "#78350f" }],
    internalNotes: [
      { text: "Field crew verified. Patch scheduled for Thursday AM.", daysAgo: 2 },
    ],
    chatLog: [
      { role: "beacon", text: BEACON_GREETING, at: atOffset(daysAgo(5, 9, 22), -2) },
      {
        role: "user",
        text: "There's a big pothole on Winchester Boulevard near Hamilton — it's huge and cars keep swerving around it.",
        at: daysAgo(5, 9, 22),
      },
      {
        role: "beacon",
        text: "Got it — a large pothole on Winchester Blvd near Hamilton affecting traffic. I've categorized this under Roads & Sidewalks. Can you pin the exact spot on the map?",
        at: atOffset(daysAgo(5, 9, 22), 1),
      },
      {
        role: "user",
        text: "Pinned it and added a photo from this morning.",
        at: atOffset(daysAgo(5, 9, 22), 3),
      },
      {
        role: "beacon",
        text: "Report submitted — thank you for helping keep San Jose running!",
        at: atOffset(daysAgo(5, 9, 22), 5),
      },
    ],
  },
  {
    id: "GL-SM2-7731",
    category: "Electricity/Power Lines",
    formalTitle: "Streetlight outage — Elm Street & 22nd Street",
    description:
      "Streetlight at the northeast corner of Elm Street and 22nd Street has been non-functional for at least seven days. Corner is unlit at night near a residential crosswalk.",
    residentDescription:
      "The streetlight at Elm & 22nd has been out for over a week.",
    servicePriority: "Standard",
    lat: 37.3388,
    lng: -121.8624,
    crossStreet: "Elm St & 22nd St",
    baseSeverity: 5,
    status: "opened",
    createdAt: daysAgo(8, 19, 45),
    noticedAt: daysAgo(9, 6, 0),
    anonymous: true,
    chatLog: [
      { role: "beacon", text: BEACON_GREETING, at: atOffset(daysAgo(8, 19, 45), -1) },
      {
        role: "user",
        text: "The streetlight at Elm & 22nd has been out for over a week.",
        at: daysAgo(8, 19, 45),
      },
      {
        role: "beacon",
        text: "I'll file this under Electricity / Power Lines. Where exactly is the light — which corner of the intersection?",
        at: atOffset(daysAgo(8, 19, 45), 1),
      },
      {
        role: "user",
        text: "Northeast corner. I walk my dog there every night and it's pitch black.",
        at: atOffset(daysAgo(8, 19, 45), 4),
      },
      {
        role: "beacon",
        text: "Location set. Report submitted — thank you!",
        at: atOffset(daysAgo(8, 19, 45), 7),
      },
    ],
  },
  {
    id: "GL-SM3-2290",
    category: "Parks & Trees",
    formalTitle: "Fallen tree blocking Guadalupe River Trail near Coleman Ave",
    description:
      "Large tree trunk and branches fallen across the Guadalupe River Trail near Coleman Avenue, fully blocking the paved bike path in both directions. Debris spans approximately 12 feet.",
    residentDescription:
      "A tree fell across the bike path at Guadalupe River Trail near Coleman Avenue and is blocking the whole trail.",
    servicePriority: "Elevated",
    lat: 37.3476,
    lng: -121.9061,
    address: "Guadalupe River Trail near Coleman Avenue",
    baseSeverity: 6,
    status: "in_progress",
    createdAt: daysAgo(2, 11, 10),
    noticedAt: daysAgo(2, 7, 30),
    reporterId: "acc_c1",
    contactName: "Maya Thompson",
    contactEmail: "maya.thompson@gmail.com",
    media: [{ label: "Fallen tree, trail", from: "#166534", to: "#14532d" }],
    internalNotes: [{ text: "Parks crew dispatched with chainsaw equipment.", daysAgo: 1 }],
    chatLog: [
      { role: "beacon", text: BEACON_GREETING, at: atOffset(daysAgo(2, 11, 10), -2) },
      {
        role: "user",
        text: "A tree fell across the bike path at Guadalupe River Trail near Coleman Avenue and is blocking the whole trail.",
        at: daysAgo(2, 11, 10),
      },
      {
        role: "beacon",
        text: "Understood — a downed tree blocking the Guadalupe River Trail. I've categorized this under Parks & Trees. Please drop a pin where the trail is blocked.",
        at: atOffset(daysAgo(2, 11, 10), 2),
      },
      {
        role: "user",
        text: "Pinned it right where you can't get past in either direction. Photo attached.",
        at: atOffset(daysAgo(2, 11, 10), 5),
      },
      {
        role: "beacon",
        text: "Report submitted — thank you for helping keep San Jose running!",
        at: atOffset(daysAgo(2, 11, 10), 8),
      },
    ],
  },
  {
    id: "GL-SM4-8815",
    category: "Water/Plumbing",
    formalTitle: "Street water leak — Meridian Avenue",
    description:
      "Water surfacing through pavement on Meridian Avenue between Hedding Street and Taylor Street, active for approximately 48 hours. Road surface is slick; possible main break.",
    residentDescription:
      "There's been water bubbling up through the street on Meridian Avenue for two days, the road is getting slick.",
    servicePriority: "Elevated",
    lat: 37.3082,
    lng: -121.8984,
    address: "820 Meridian Avenue",
    baseSeverity: 7,
    status: "opened",
    createdAt: daysAgo(3, 16, 30),
    noticedAt: daysAgo(4, 8, 0),
    anonymous: true,
    media: [{ label: "Water on Meridian", from: "#0284c7", to: "#0369a1" }],
    chatLog: [
      { role: "beacon", text: BEACON_GREETING, at: atOffset(daysAgo(3, 16, 30), -1) },
      {
        role: "user",
        text: "There's been water bubbling up through the street on Meridian Avenue for two days, the road is getting slick.",
        at: daysAgo(3, 16, 30),
      },
      {
        role: "beacon",
        text: "That sounds like a water main or service leak under Water / Plumbing. Can you pin the location on the map?",
        at: atOffset(daysAgo(3, 16, 30), 2),
      },
      {
        role: "user",
        text: "Done — it's in front of the apartment building with the blue awning.",
        at: atOffset(daysAgo(3, 16, 30), 6),
      },
      {
        role: "beacon",
        text: "Report submitted — thank you!",
        at: atOffset(daysAgo(3, 16, 30), 8),
      },
    ],
  },
  {
    id: "GL-SM5-3344",
    category: "Parks & Trees",
    formalTitle: "Damaged playground slide — Backesto Park",
    description:
      "Primary slide at Backesto Park playground has a sharp, jagged edge at the bottom exit point. Resident reports a child sustained a leg laceration from contact with the damaged edge.",
    residentDescription:
      "The playground slide at Backesto Park has a sharp jagged edge at the bottom that cut a kid's leg.",
    servicePriority: "Elevated",
    lat: 37.3521,
    lng: -121.8935,
    address: "Backesto Park, 866 North 14th Street",
    baseSeverity: 6,
    status: "sent",
    createdAt: hoursAgo(14, 20),
    noticedAt: hoursAgo(26, 0),
    reporterId: "acc_c3",
    contactName: "Aisha Khan",
    contactEmail: "aisha.khan@gmail.com",
    media: [{ label: "Damaged slide", from: "#047857", to: "#065f46" }],
    chatLog: [
      { role: "beacon", text: BEACON_GREETING, at: atOffset(hoursAgo(14, 20), -2) },
      {
        role: "user",
        text: "The playground slide at Backesto Park has a sharp jagged edge at the bottom that cut a kid's leg.",
        at: hoursAgo(14, 20),
      },
      {
        role: "beacon",
        text: "I'm sorry to hear that — I'll file this under Parks & Trees as a playground safety hazard. Which slide at Backesto Park (near the main entrance or the back lot)?",
        at: atOffset(hoursAgo(14, 20), 2),
      },
      {
        role: "user",
        text: "The big yellow one by the swings. I took a picture of the crack.",
        at: atOffset(hoursAgo(14, 20), 5),
      },
      {
        role: "beacon",
        text: "Got it. Report submitted — parks maintenance will review this.",
        at: atOffset(hoursAgo(14, 20), 9),
      },
    ],
  },
  {
    id: "GL-SM6-5578",
    category: "Waste & Sanitation",
    formalTitle: "Overflowing dumpster — South 11th Street alley",
    description:
      "Commercial dumpster in the alley behind South 11th Street between East Santa Clara Street and East Saint John Street has been overflowing for multiple days. Trash scattered on ground; strong odor reported.",
    residentDescription:
      "Dumpster behind South 11th Street has been overflowing for days, trash everywhere and it smells terrible.",
    servicePriority: "Standard",
    lat: 37.3324,
    lng: -121.8786,
    address: "Alley behind 455 South 11th Street",
    crossStreet: "S 11th St & E Santa Clara St",
    baseSeverity: 4,
    status: "sent",
    createdAt: daysAgo(4, 13, 5),
    noticedAt: daysAgo(6, 10, 0),
    contactPhone: "(555) 412-8890",
    chatLog: [
      { role: "beacon", text: BEACON_GREETING, at: atOffset(daysAgo(4, 13, 5), -1) },
      {
        role: "user",
        text: "Dumpster behind South 11th Street has been overflowing for days, trash everywhere and it smells terrible.",
        at: daysAgo(4, 13, 5),
      },
      {
        role: "beacon",
        text: "I'll categorize this under Waste & Sanitation. Can you pin the alley or building the dumpster is behind?",
        at: atOffset(daysAgo(4, 13, 5), 2),
      },
      {
        role: "user",
        text: "Alley behind the taqueria on 11th. Pinned.",
        at: atOffset(daysAgo(4, 13, 5), 5),
      },
      {
        role: "beacon",
        text: "Report submitted. Sanitation will follow up.",
        at: atOffset(daysAgo(4, 13, 5), 7),
      },
    ],
  },
  {
    id: "GL-SM7-9021",
    category: "Public Safety/Hazards",
    formalTitle: "Sidewalk sinkhole — Dr. Martin Luther King Jr. Library entrance",
    description:
      "Sinkhole approximately 3 feet deep opened in the walkway outside the Dr. Martin Luther King Jr. Library main entrance. Pedestrian path partially obstructed; fall hazard.",
    residentDescription:
      "There's a big sinkhole that opened up outside the library, about 3 feet deep and right in the walkway.",
    servicePriority: "Critical",
    lat: 37.3353,
    lng: -121.885,
    address: "Dr. Martin Luther King Jr. Library, 150 East San Fernando Street",
    baseSeverity: 8,
    status: "opened",
    createdAt: daysAgo(1, 8, 40),
    noticedAt: daysAgo(1, 7, 15),
    reporterId: "acc_c1",
    contactName: "Maya Thompson",
    contactEmail: "maya.thompson@gmail.com",
    media: [{ label: "Sinkhole, library", from: "#57534e", to: "#44403c" }],
    internalNotes: [{ text: "Barricades requested. Public Works inspecting subsurface.", daysAgo: 0 }],
    chatLog: [
      { role: "beacon", text: BEACON_GREETING, at: atOffset(daysAgo(1, 8, 40), -2) },
      {
        role: "user",
        text: "There's a big sinkhole that opened up outside the library, about 3 feet deep and right in the walkway.",
        at: daysAgo(1, 8, 40),
      },
      {
        role: "beacon",
        text: "That sounds like a serious hazard — I'll flag this under Public Safety / Hazards with elevated priority. Which library entrance?",
        at: atOffset(daysAgo(1, 8, 40), 1),
      },
      {
        role: "user",
        text: "MLK Library on San Fernando — main doors. I marked it on the map.",
        at: atOffset(daysAgo(1, 8, 40), 4),
      },
      {
        role: "beacon",
        text: "Report submitted — thank you for flagging this quickly.",
        at: atOffset(daysAgo(1, 8, 40), 6),
      },
    ],
  },
  {
    id: "GL-SM8-1167",
    category: "Electricity/Power Lines",
    formalTitle: "Low-hanging power line — Pine Street sidewalk",
    description:
      "Power or utility line hanging approximately 5–6 feet above the sidewalk on Pine Street, apparently loosened during recent storm activity. Line is sagging over pedestrian path.",
    residentDescription:
      "Power line is hanging really low over the sidewalk on Pine Street, looks like it came loose in the storm.",
    servicePriority: "Critical",
    lat: 37.3391,
    lng: -121.8942,
    address: "420 Pine Street",
    baseSeverity: 9,
    status: "opened",
    createdAt: hoursAgo(22, 35),
    noticedAt: hoursAgo(24, 0),
    anonymous: true,
    media: [{ label: "Low line, Pine St", from: "#b91c1c", to: "#991b1b" }],
    chatLog: [
      { role: "beacon", text: BEACON_GREETING, at: atOffset(hoursAgo(22, 35), -1) },
      {
        role: "user",
        text: "Power line is hanging really low over the sidewalk on Pine Street, looks like it came loose in the storm.",
        at: hoursAgo(22, 35),
      },
      {
        role: "beacon",
        text: "Low-hanging lines can be dangerous — I've categorized this under Electricity / Power Lines as critical. Please stay clear of the line and pin the location.",
        at: atOffset(hoursAgo(22, 35), 2),
      },
      {
        role: "user",
        text: "Pinned. It's between 4th and 5th on Pine. Added a photo.",
        at: atOffset(hoursAgo(22, 35), 5),
      },
      {
        role: "beacon",
        text: "Report submitted. If anyone is in immediate danger, call 911.",
        at: atOffset(hoursAgo(22, 35), 7),
      },
    ],
  },
  {
    id: "GL-SM9-4483",
    category: "Animal/Wildlife",
    formalTitle: "Injured raccoon — Emma Prusch Farm Park playground",
    description:
      "Injured raccoon observed near the playground fence at Emma Prusch Farm Park for approximately two days. Animal appears to have an injured rear leg and limited mobility.",
    residentDescription:
      "Injured raccoon by the playground fence at Emma Prusch Farm Park, been there for 2 days dragging its leg.",
    servicePriority: "Standard",
    lat: 37.3442,
    lng: -121.8513,
    address: "Emma Prusch Farm Park, 647 King Road",
    baseSeverity: 4,
    status: "sent",
    createdAt: daysAgo(2, 17, 55),
    noticedAt: daysAgo(3, 9, 0),
    anonymous: true,
    chatLog: [
      { role: "beacon", text: BEACON_GREETING, at: atOffset(daysAgo(2, 17, 55), -2) },
      {
        role: "user",
        text: "Injured raccoon by the playground fence at Emma Prusch Farm Park, been there for 2 days dragging its leg.",
        at: daysAgo(2, 17, 55),
      },
      {
        role: "beacon",
        text: "I'll route this to Animal / Wildlife. Please don't approach the animal — can you pin where along the playground fence?",
        at: atOffset(daysAgo(2, 17, 55), 2),
      },
      {
        role: "user",
        text: "North side of the playground by the red barn. Location pinned.",
        at: atOffset(daysAgo(2, 17, 55), 6),
      },
      {
        role: "beacon",
        text: "Report submitted — animal services will assess.",
        at: atOffset(daysAgo(2, 17, 55), 8),
      },
    ],
  },
];

/** Returns the nine curated sample reports, newest first. */
export function buildSampleReports(): Report[] {
  return SAMPLE_INPUTS.map(buildReportFromSeed).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
