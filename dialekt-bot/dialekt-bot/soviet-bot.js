#!/usr/bin/env node
/*
 * ДИАЛЕКТ — Soviet discourse bot for Bluesky (AT Protocol)
 * Zero dependencies. Requires Node 18+ (uses built-in fetch).
 *
 * Generates one satirical Party "pronouncement" (<= 300 chars) and, on request,
 * posts it to a Bluesky account.
 *
 * SAFETY: dry-run by default. It will NOT post unless you explicitly opt in with
 * either DRY_RUN=false or the --post flag. Credentials come from env vars only —
 * never hardcode them. Use a Bluesky *App Password* (Settings > App Passwords),
 * not your main password, and revoke it if it ever leaks.
 *
 * Env:
 *   BSKY_HANDLE         your handle, e.g. dialekt.bsky.social   (required to post)
 *   BSKY_APP_PASSWORD   an app password                         (required to post)
 *   BSKY_PDS            PDS base URL (default https://bsky.social)
 *   TOPIC               one of the topic keys below (default: random)
 *   FERVOUR             1..4 (default: random, weighted low)
 *   VOICE               classic | online | auto (default: auto, online-leaning)
 *   DRY_RUN             "false" to actually post (default: "true")
 *
 * Usage:
 *   node soviet-bot.js              # prints a post, sends nothing
 *   node soviet-bot.js --post       # generates and posts (needs creds)
 *   TOPIC=lysenko node soviet-bot.js
 */
"use strict";

/* ------------------------------------------------------------------ */
/* Grammar — same world as the HTML playground, tuned for short posts. */
/* ------------------------------------------------------------------ */

const openers = {
  1: ["Comrades,", "The Central Committee has determined that", "Let the record show that", "It is the considered view of the Presidium that", "Pursuant to the resolutions of the Congress,", "The minutes will reflect that", "After due deliberation,", "The Plan provides that", "It has been agreed, without objection, that", "The Secretariat confirms that", "As previously minuted,", "In keeping with correct procedure,"],
  2: ["Comrades! Let there be no doubt —", "History itself confirms that", "The masses have spoken:", "As the science of dialectics makes plain,", "With one voice the assembly declares that", "Let it be known throughout the republics that", "The correlation of forces makes clear that", "Every honest worker understands that", "The evidence, comrades, is overwhelming:", "Theory and practice agree:", "The record is unambiguous:", "No serious comrade disputes that"],
  3: ["COMRADES! The hour demands vigilance —", "Admitting no debate,", "The dialectic THUNDERS its verdict:", "In the sacred name of the Plan,", "Let every wavering heart take note:", "The moment of decision is UPON US:", "There can be no retreat:", "Steel yourselves, comrades —", "The verdict of history is FINAL:", "Doubt is a luxury we cannot afford:", "Mark these words in the ledger:", "The line is drawn, and it is straight:"],
  4: ["COMRADES!!! Tremble with revolutionary joy —", "The IRON LAWS of history decree that", "Let the very tractors weep with pride:", "With the fury of ten thousand overfulfilled quotas,", "By the eternal flame of the Plan,", "Let the heavens themselves take minutes:", "The dialectic has SPOKEN and it is DEAFENING:", "Rejoice, for the contradiction is RESOLVED —", "Let no abacus rest until it is known:", "The future ARRIVES, comrades, on schedule —", "Weep, doubters, and be converted:", "Let the anthem swell, for"]
};

const subjects = {
  agriculture: ["the collective farms", "the heroic beet brigades", "our grain collectives", "the shock-harvesters of the Volga", "the potato commissariat", "the Order of the Golden Turnip", "our tireless combine operators", "the sugar-beet vanguard", "the reclaimed marshland cooperatives", "the state dairy of the ninth district"],
  industry: ["our glorious tractor plants", "the vanguard of heavy industry", "the shock-workers of the Third Brigade", "our machine-tool combines", "the pig-iron foundries", "the ball-bearing collective", "the hydroelectric shock-troops", "the assembled riveters of the north", "our record-breaking smelters", "the conveyor-belt cadres"],
  theory: ["the toiling masses", "the proletariat", "the class-conscious workers", "the vanguard of the working class", "the united peoples of the republics", "the study circle of the seventh floor", "our theoreticians", "the reading room of the Central Library", "the assembled dialecticians", "the footnote committee"],
  west: ["our peace-loving nation", "the socialist camp", "the anti-imperialist front", "our vigilant border committees", "the fraternal delegations", "the peace commission", "our tireless diplomats", "the solidarity brigade", "the international workers' chorus", "the customs inspectors of the frontier"],
  discipline: ["every loyal cadre", "the disciplinary sub-committee", "our vigilant citizens", "the assembled comrades", "the review board", "the vigilance commission", "the night-shift watch", "the self-criticism circle", "the department of correct posture", "the tribunal of punctuality"],
  lysenko: ["our Michurinist agronomists", "the vernalized winter wheat", "the re-educated seed grain", "the enemies of the gene (now abolished)", "the Lenin Academy of Agricultural Sciences", "the correctly-raised saplings", "our anti-Mendelist botanists", "the graft-hybrid orchard", "the seed-selection collective", "the greenhouse of acquired characteristics"],
  cosmism: ["the Institute of the Common Task", "our cosmist engineers", "the storming-of-the-heavens brigade", "the blood-transfusion collective", "the Commission for the Abolition of Death", "the ancestor-resurrection bureau", "our rocket theoreticians", "the immortality sub-committee", "the interplanetary soviet", "the museum of the not-yet-living"],
  tektology: ["the Universal Organisational Science", "our feedback-loop planners", "the cybernetics bureau (rehabilitated)", "the Tektological Bureau", "the systems-theory circle", "the queue-optimisation directorate", "our correlation engineers", "the linguistics commission (dissolved)", "the punch-card politburo", "the department of correct proportion"]
};

const claims = {
  agriculture: [
    "have overfulfilled the grain quota by {P}%",
    "have delivered {N} thousand tonnes of beets ahead of schedule",
    "have proven the potato, correctly organised, knows no ceiling",
    "have reorganised the milk yield along scientific lines",
    "have harvested {N} hectares before the frost dared arrive",
    "have declared the turnip the equal of any Western vegetable",
    "have doubled the beet, then apologised for not tripling it",
    "have persuaded the soil to overfulfil out of sheer loyalty",
    "have retired the scarecrow as ideologically redundant",
    "have filed the harvest report in triplicate, then harvested again"],
  industry: [
    "have exceeded the Five-Year Plan by {P}%, then exceeded it again out of enthusiasm",
    "have produced {N} extra tractors through sheer revolutionary spirit",
    "have doubled pig-iron output while singing",
    "have forged {N} tonnes of steel before the lunch bell",
    "have retooled the whole plant over a single weekend, unpaid, gladly",
    "have set a record, broken it, and set it once more before dusk",
    "have declared the coffee break a bourgeois deviation and pressed on",
    "have wired the entire oblast in a fit of correct enthusiasm",
    "have out-produced their targets and then out-produced the apology",
    "have named the millionth ball-bearing after the Plan"],
  theory: [
    "represent the necessary synthesis in the withering-away of the contradiction",
    "have grasped precisely who is doing what to whom, and minuted it",
    "have reconciled permanent revolution and socialism in one country, dialectically",
    "have resolved the base–superstructure question over a long lunch",
    "have negated the negation, then negated that, for good measure",
    "have footnoted the dialectic until it agreed with them",
    "have declared the contradiction sharpened, on schedule",
    "have proven the inevitable and scheduled it for Tuesday",
    "have re-read the pamphlet and emerged more correct than before",
    "have advanced to a higher stage of consciousness, as Resolution {N} foretold"],
  west: [
    "remain serene while the imperialist West drowns in its contradictions",
    "will not be lectured on quotas by nations that cannot run one collective farm",
    "note the bourgeois press slanders our figures, yet the harvest speaks louder",
    "have out-produced the capitalist bloc and then out-queued it",
    "greet the latest tariff with a shrug and a fresh quota",
    "remind the West that the beet does not recognise the market",
    "have translated the imperialist cartoon and found it, frankly, weak",
    "decline the invitation to panic on principle",
    "observe the stock ticker with the calm of the correctly organised",
    "have counter-slandered the slander, dialectically"],
  discipline: [
    "must remain eternally vigilant against the revisionist deviation",
    "will expose the wreckers who whisper doubt about the maintenance schedule",
    "recognise the counter-revolutionary character of arriving late to the meeting",
    "shall renew their commitment to criticism and self-criticism",
    "have detected a deviation in the seating arrangement and corrected it",
    "will re-educate the comrade who sighed during the report",
    "regard the unread pamphlet as objectively suspicious",
    "have scheduled an extra meeting to discuss the length of meetings",
    "note that enthusiasm below 100% is, itself, a kind of doubt",
    "have denounced the deviation and then, thoroughly, denounced the denouncer"],
  lysenko: [
    "have persuaded winter wheat, through correct upbringing, to become spring wheat",
    "have abolished the reactionary 'gene', a Weismannist-Morganist fabrication",
    "have vernalized the harvest by {P}% via cold treatment and warm enthusiasm",
    "hold that a warbler, raised under socialism, will hatch the egg of a cuckoo",
    "have taught the orchard to inherit whatever the Plan requires",
    "reject intra-species competition, for the beet does not compete, it cooperates",
    "have re-educated the seed and expect no further trouble from it",
    "have grafted enthusiasm directly onto the rootstock",
    "have declared heredity a matter of upbringing, and upbringing a matter of us",
    "have struck the word 'chromosome' from the seed catalogue"],
  cosmism: [
    "have resolved to resurrect every ancestor who ever overfulfilled a quota",
    "have declared death a bourgeois relic, scheduled for abolition next Plan",
    "have begun settling the cosmos with correctly-organised comrades",
    "have rejuvenated the Presidium by {P}% via the exchange of proletarian blood",
    "shall store the ancestors in a museum until the science catches up",
    "have filed a requisition for immortality, pending approval",
    "have measured the heavens and found room for {N} more soviets",
    "propose to feed the resurrected on surplus beets",
    "have declared the grave provisional, pending the next Plan",
    "have booked the cosmos for a Tuesday and asked it to be punctual"],
  tektology: [
    "have unified all sciences under one organisational principle, footnoted in triplicate",
    "have declared cybernetics a bourgeois pseudoscience, then the future of the Plan",
    "have modelled the whole economy as one feedback loop, humming with correct proportion",
    "have traced all speech to four primal sounds — sal, ber, yon, rosh — until further notice",
    "have optimised the bread queue until it curved back on itself",
    "have balanced the whole system by adjusting exactly one comrade",
    "have declared disorganisation the last refuge of the wrecker",
    "have fed the Plan into the machine and asked it, politely, to agree",
    "have re-derived the economy from first principles over breakfast",
    "have proven the whole exceeds the sum, provided the sum is planned"]
};

const tags = {
  1: ["as theory and practice require", "for the Plan is not a suggestion"],
  2: ["for dialectical materialism admits no compromise", "as the correlation of forces demands"],
  3: ["for to doubt the quota is to doubt history", "and the wavering shall be re-educated"],
  4: ["for the beet is eternal and the deviationist is dust", "and the dialectic does not repeat itself"],
  lysenko: ["since acquired characteristics are inherited, and so is class consciousness", "and the name Vavilov shall not appear in the minutes"],
  cosmism: ["for the withering of the grave outranks the withering of the state", "since the cosmos, too, must fulfil its Plan"],
  tektology: ["for the whole exceeds the sum, provided the sum is planned", "and the linguistics question is, for now, settled from above"]
};

const closers = {
  1: ["The matter is settled.", "Forward, to the next quota.", "Entered into the minutes.", "So resolved.", "The Plan endures.", "Noted, and filed.", "Onward.", "This concludes the item."],
  2: ["It was never truly open.", "Onward to overfulfilment.", "Recorded as unanimous, as always.", "Let the doubters take note.", "The vote carries itself.", "History will thank the committee.", "To work, comrades.", "The direction is correct."],
  3: ["NOT open to discussion.", "To the tractors! To the footnotes!", "The Presidium thanks itself.", "Let no one waver.", "The quota WILL be met.", "Vigilance above all.", "There is no other reading.", "The line holds."],
  4: ["ALL IN FAVOUR — there is no other kind.", "The quota is dead. Long live the quota!", "Let the anthem play thrice.", "Let the abacuses SING.", "History itself stands and applauds.", "The beet is eternal.", "Carried, gloriously, unanimously, again.", "To the STARS, and back by the night shift."]
};

const signatories = ["The Presidium", "Sub-committee 14 (Beets)", "The Bureau of Correct Enthusiasm", "The Directorate of Footnotes", "The Michurinist Praesidium", "The Institute of the Common Task", "The Rehabilitated Cybernetics Bureau", "The Standing Committee on Standing", "The Commission for the Abolition of Death", "The Tribunal of Punctuality", "The Department of Correct Proportion", "The Order of the Golden Turnip"];

/* Extremely-online layer: modern-timeline tics wrapped around Party content.
   Kept silly and apolitical — dunks land on abstract "revisionists", never on
   real people or groups. */
const onlinePrefix = [
  "hot take:", "unpopular opinion:", "POV:", "reminder that", "gm.",
  "gm to everyone except the revisionists.", "genuinely obsessed with how", "screenshotting this —",
  "idk who needs to hear this but", "in this thread i will explain why", "everyone's ignoring that",
  "normalize", "lowkey", "highkey", "not to be dramatic but", "controversial but",
  "saying it louder for the back:", "petition to acknowledge that", "friendly reminder:",
  "breaking:", "so we're just not going to talk about how", "calling it now:",
  "respectfully,", "the audacity of"
];
const onlineReaction = [
  "ratio.", "based and Plan-pilled.", "L + ratio + the revisionists lost.",
  "no thoughts, only quota.", "mid harvest tbh.", "let comrades enjoy things.",
  "the vibes are dialectically correct.", "touch grass (it's been vernalized).",
  "source: dialectical materialism.", "we are so back.", "it's giving overfulfilment.",
  "screenshot this.", "delete this later.", "🚜💯", "no bc why is this real 😭",
  "chronically online behaviour from the Presidium.", "this is canon now.",
  "and that's on the Five-Year Plan.", "peak committee behaviour.", "cinema.",
  "unserious oblast.", "the girlies are overfulfilling.", "understood the assignment (the quota).",
  "real ones already filed the paperwork.", "living rent-free in the Politburo.",
  "bestie the harvest is harvesting.", "10/10 no notes.", "everyone say thank you comrade."
];
const memes = [
  (s, c) => "nobody:\nliterally nobody:\n" + cap(s) + ": " + c,
  (s, c) => "POV: " + s + " " + c,
  (s, c) => "not " + s + " " + c + " 😭",
  (s, c) => "in this thread i will explain why " + s + " " + c + " 🧵 1/" + (7 + Math.floor(Math.random() * 40)),
  (s, c) => "the fact that " + s + " " + c + " and we're all just NORMAL about it",
  (s, c) => "day " + (100 + Math.floor(Math.random() * 4000)) + " of asking why " + s + " " + c,
  (s, c) => "me: i will not get emotional about quotas.\nalso me: " + cap(s) + " " + c + ".",
  (s, c) => "you're telling me " + s + " " + c + "?? and nobody warned me??",
  (s, c) => "everyone clapped. " + cap(s) + " " + c + ".",
  (s, c) => "breaking: " + s + " " + c + " — more at six.",
  (s, c) => "history will remember that " + s + " " + c + ". i will remember it harder.",
  (s, c) => "rating how " + s + " " + c + ": 10/10, no notes.",
  (s, c) => "it's 2am and i cannot stop thinking about how " + s + " " + c + "."
];

const TOPICS = Object.keys(subjects);
const MAX = 300;       // Bluesky's hard limit (graphemes)
const POST_MAX = 180;  // punchy target — short, feed-friendly, well under the limit

/* ------------------------------------------------------------------ */
/* Generation                                                          */
/* ------------------------------------------------------------------ */

const pick = a => a[Math.floor(Math.random() * a.length)];
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const _seg = (typeof Intl !== "undefined" && Intl.Segmenter) ? new Intl.Segmenter("en", { granularity: "grapheme" }) : null;
const glen = s => _seg ? [..._seg.segment(s)].length : Array.from(s).length; // grapheme count, matches Bluesky
const fill = t => t
  .replace("{P}", 100 + Math.floor(Math.random() * 315))
  .replace("{N}", 40 + Math.floor(Math.random() * 940));

function pickLevel() {
  const f = process.env.FERVOUR && parseInt(process.env.FERVOUR, 10);
  if (f >= 1 && f <= 4) return f;
  return pick([1, 1, 2, 2, 3, 4]); // weighted toward calmer registers
}

function pickTopic() {
  const t = process.env.TOPIC;
  return TOPICS.includes(t) ? t : pick(TOPICS);
}

function pickVoice() {
  const v = (process.env.VOICE || "auto").toLowerCase();
  return ["classic", "online", "auto"].includes(v) ? v : "auto";
}

// Produce one classic terse pronouncement (opener + subject + claim, closer sometimes).
function classicProducer(topic, lvl) {
  const o = pick(openers[lvl]), s = pick(subjects[topic]), c = fill(pick(claims[topic]));
  return (Math.random() < 0.4)
    ? cap(o + " " + s + " " + c + ". " + pick(closers[lvl]))
    : cap(o + " " + s + " " + c + ".");
}

// Produce one extremely-online post: prefix form, reaction form, or meme template.
function onlineProducer(topic, lvl) {
  const s = pick(subjects[topic]), c = fill(pick(claims[topic]));
  const r = Math.random();
  if (r < 0.34) {
    const p = pick(onlinePrefix);
    return /[.!]$/.test(p) ? p + " " + cap(s) + " " + c + "." : p + " " + s + " " + c + ".";
  }
  if (r < 0.64) return cap(s) + " " + c + ". " + pick(onlineReaction);
  return pick(memes)(s, c);
}

// Try a producer up to 40 times; return the first result under POST_MAX,
// else the shortest seen, hard-truncated on a word boundary.
function fit(producer) {
  let shortest = null;
  for (let i = 0; i < 40; i++) {
    const cand = producer();
    if (glen(cand) <= POST_MAX) return cand;
    if (!shortest || glen(cand) < glen(shortest)) shortest = cand;
  }
  const chars = _seg ? [..._seg.segment(shortest)].map(x => x.segment) : Array.from(shortest);
  return chars.slice(0, POST_MAX - 1).join("").replace(/\s+\S*$/, "") + "\u2026";
}

// Punchy composer. voice: "classic" | "online" | "auto" (auto mixes, online-leaning).
function composePost(topic, lvl, voice) {
  const v = voice === "auto" ? (Math.random() < 0.55 ? "online" : "classic") : voice;
  const producer = v === "online" ? () => onlineProducer(topic, lvl) : () => classicProducer(topic, lvl);
  return { text: fit(producer), voice: v };
}

/* ------------------------------------------------------------------ */
/* Bluesky (AT Protocol) — plain HTTPS, no SDK                         */
/* ------------------------------------------------------------------ */

async function xrpc(pds, method, token, body) {
  const res = await fetch(pds + "/xrpc/" + method, {
    method: "POST",
    headers: Object.assign({ "Content-Type": "application/json" }, token ? { Authorization: "Bearer " + token } : {}),
    body: JSON.stringify(body)
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(method + " failed (" + res.status + "): " + (json.message || text));
  return json;
}

async function postToBluesky(text) {
  const handle = process.env.BSKY_HANDLE;
  const pass = process.env.BSKY_APP_PASSWORD;
  const pds = process.env.BSKY_PDS || "https://bsky.social";
  if (!handle || !pass) {
    throw new Error("Set BSKY_HANDLE and BSKY_APP_PASSWORD to post. (Use an App Password, not your login.)");
  }

  const session = await xrpc(pds, "com.atproto.server.createSession", null, { identifier: handle, password: pass });

  const record = {
    $type: "app.bsky.feed.post",
    text: text,
    langs: ["en"],
    createdAt: new Date().toISOString()
  };

  const out = await xrpc(pds, "com.atproto.repo.createRecord", session.accessJwt, {
    repo: session.did,
    collection: "app.bsky.feed.post",
    record: record
  });

  const rkey = String(out.uri).split("/").pop();
  return "https://bsky.app/profile/" + handle + "/post/" + rkey;
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

(async function main() {
  const topic = pickTopic();
  const lvl = pickLevel();
  const result = composePost(topic, lvl, pickVoice());
  const text = result.text;

  const wantPost = process.argv.includes("--post") || process.env.DRY_RUN === "false";

  console.log("--- pronouncement (" + topic + ", fervour " + lvl + ", " + result.voice + ", " + glen(text) + "/" + MAX + " chars) ---");
  console.log(text);
  console.log("---");

  if (!wantPost) {
    console.log("DRY RUN — nothing sent. Add --post (or set DRY_RUN=false) to publish.");
    return;
  }

  try {
    const url = await postToBluesky(text);
    console.log("Posted: " + url);
  } catch (err) {
    console.error("Post failed: " + err.message);
    process.exit(1);
  }
})();
