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
 *   VOICE               classic | online | special | auto (default: auto)
 *   DRY_RUN             "false" to actually post (default: "true")
 *
 * Usage:
 *   node soviet-bot.js              # prints a post, sends nothing
 *   node soviet-bot.js --post       # generates and posts (needs creds)
 *   TOPIC=lysenko node soviet-bot.js
 */
"use strict";

/* ------------------------------------------------------------------ */
/* Openers — keyed by fervour level 1..4, escalating.                 */
/* Must read as:  <opener> <subject> <claim>.                         */
/* ------------------------------------------------------------------ */
const openers = {
  1: ["Comrades,", "The Central Committee has determined that", "Let the record show that", "It is the considered view of the Presidium that", "Pursuant to the resolutions of the Congress,", "The minutes will reflect that", "After due deliberation,", "The Plan provides that", "It has been agreed, without objection, that", "The Secretariat confirms that", "As previously minuted,", "In keeping with correct procedure,", "It is hereby recorded that", "The subcommittee finds that", "Following review of the ledger,", "In accordance with the standing order,", "The archive confirms that", "As tabled at the last sitting,", "The quorum having been reached,", "Upon reflection, and in triplicate,", "The relevant department reports that", "It falls to the Presidium to note that", "Per the memorandum of the second floor,", "The stenographer wishes it known that", "For the avoidance of doubt,", "The committee, duly convened, holds that"],
  2: ["Comrades! Let there be no doubt —", "History itself confirms that", "The masses have spoken:", "As the science of dialectics makes plain,", "With one voice the assembly declares that", "Let it be known throughout the republics that", "The correlation of forces makes clear that", "Every honest worker understands that", "The evidence, comrades, is overwhelming:", "Theory and practice agree:", "The record is unambiguous:", "No serious comrade disputes that", "Let the republics rejoice, for", "The ledgers do not lie:", "Any child can see that", "The dialectic, patient but firm, holds that", "It is written in the minutes and in the stars:", "The consensus, reached before the meeting, is that", "History has already voted:", "The correct comrades agree:", "As the harvest itself testifies,", "There is broad and enforced agreement that", "The facts, marshalled and grateful, confirm that", "One need only consult the Plan to see that", "The assembly rose as one to affirm that", "It is settled science, comrades:"],
  3: ["COMRADES! The hour demands vigilance —", "Admitting no debate,", "The dialectic THUNDERS its verdict:", "In the sacred name of the Plan,", "Let every wavering heart take note:", "The moment of decision is UPON US:", "There can be no retreat:", "Steel yourselves, comrades —", "The verdict of history is FINAL:", "Doubt is a luxury we cannot afford:", "Mark these words in the ledger:", "The line is drawn, and it is straight:", "Let the wreckers hear it and tremble:", "The ledger SLAMS shut on the matter:", "By the authority vested in the Plan,", "No further debate will be tolerated:", "The quota calls, and we ANSWER:", "Sound the factory whistle, for", "Let the record blaze:", "The verdict descends like the night shift:", "Waver, and be minuted:", "The dialectic raises its voice:", "Stand, comrades, and hear it:", "The committee has ruled, and the ruling is IRON:", "Let doubt find no purchase here:", "The hour is loud and it is CORRECT:"],
  4: ["COMRADES!!! Tremble with revolutionary joy —", "The IRON LAWS of history decree that", "Let the very tractors weep with pride:", "With the fury of ten thousand overfulfilled quotas,", "By the eternal flame of the Plan,", "Let the heavens themselves take minutes:", "The dialectic has SPOKEN and it is DEAFENING:", "Rejoice, for the contradiction is RESOLVED —", "Let no abacus rest until it is known:", "The future ARRIVES, comrades, on schedule —", "Weep, doubters, and be converted:", "Let the anthem swell, for", "Let the samovars BOIL with joy —", "The cosmos itself leans in to hear that", "With the thunder of a thousand rubber stamps,", "Let the grain silos SING in harmony:", "By the incandescent glory of the ledger,", "Comrades!!! The very footnotes are weeping:", "Let history stand, salute, and FILE IN TRIPLICATE:", "With joy that cannot be quota'd,", "The Plan ASCENDS, and it decrees that", "Let the tractors form a choir, for", "Ring every bell in every oblast:", "The dialectic EXPLODES with correct feeling:", "Let no heart, no abacus, no beet remain still —", "COMRADES!!! The overfulfilment overfulfils ITSELF:"]
};

/* ------------------------------------------------------------------ */
/* Subjects — keyed by topic. Plural noun phrases, lowercase start.   */
/* Every topic here MUST have a matching claims[topic] entry.         */
/* ------------------------------------------------------------------ */
const subjects = {
  agriculture: ["the collective farms", "the heroic beet brigades", "our grain collectives", "the shock-harvesters of the Volga", "the potato commissariat", "the Order of the Golden Turnip", "our tireless combine operators", "the sugar-beet vanguard", "the reclaimed marshland cooperatives", "the state dairy of the ninth district", "the tractor-station brigades", "our frost-defying agronomists", "the collective orchard", "the granary of the eleventh oblast", "our beet-counting statisticians", "the cabbage cooperative", "the irrigation shock-troops", "our loyal threshing crews", "the seed-potato vanguard", "the assembled milkmaids of the collective"],
  industry: ["our glorious tractor plants", "the vanguard of heavy industry", "the shock-workers of the Third Brigade", "our machine-tool combines", "the pig-iron foundries", "the ball-bearing collective", "the hydroelectric shock-troops", "the assembled riveters of the north", "our record-breaking smelters", "the conveyor-belt cadres", "the smelter collective of the east", "our tireless lathe operators", "the coal-hewing shock-brigade", "the assembled welders of the union", "our overfulfilling foundries", "the turbine assembly cadre", "the night-shift machinists", "our record-hungry crane operators", "the rivet quota committee", "the glorious cement works of the fourth district"],
  theory: ["the toiling masses", "the proletariat", "the class-conscious workers", "the vanguard of the working class", "the united peoples of the republics", "the study circle of the seventh floor", "our theoreticians", "the reading room of the Central Library", "the assembled dialecticians", "the footnote committee", "the seminar of correct interpretation", "our footnote-hardened cadres", "the reading circle of the annex", "the assembled pamphleteers", "our dialectical accountants", "the marginalia committee", "the standing panel on synthesis", "our patient exegetes", "the glossary sub-bureau", "the workers' university of the third landing"],
  west: ["our peace-loving nation", "the socialist camp", "the anti-imperialist front", "our vigilant border committees", "the fraternal delegations", "the peace commission", "our tireless diplomats", "the solidarity brigade", "the international workers' chorus", "the customs inspectors of the frontier", "our unflappable trade envoys", "the anti-tariff working group", "our steadfast frontier posts", "the delegation of correct handshakes", "our patient translators of slander", "the committee for serene replies", "our monitors of the bourgeois press", "the bureau of dignified shrugs", "our composed negotiators", "the friendship-caravan collective"],
  discipline: ["every loyal cadre", "the disciplinary sub-committee", "our vigilant citizens", "the assembled comrades", "the review board", "the vigilance commission", "the night-shift watch", "the self-criticism circle", "the department of correct posture", "the tribunal of punctuality", "the punctuality patrol", "our unblinking inspectors", "the committee on correct enthusiasm", "the assembled invigilators", "our sleepless monitors", "the deviation review panel", "the standing tribunal on standing", "our zealous minute-takers", "the queue-conduct commission", "the department of appropriate sighs"],
  lysenko: ["our Michurinist agronomists", "the vernalized winter wheat", "the re-educated seed grain", "the enemies of the gene (now abolished)", "the Lenin Academy of Agricultural Sciences", "the correctly-raised saplings", "our anti-Mendelist botanists", "the graft-hybrid orchard", "the seed-selection collective", "the greenhouse of acquired characteristics", "our upbringing-based botanists", "the correctly-chilled seed stock", "the anti-chromosome working group", "our loyal grafting crews", "the vernalization brigade", "the orchard of inherited enthusiasm", "our warm-hearted plant breeders", "the committee against the gene", "the re-educated turnip", "the greenhouse of the new heredity"],
  cosmism: ["the Institute of the Common Task", "our cosmist engineers", "the storming-of-the-heavens brigade", "the blood-transfusion collective", "the Commission for the Abolition of Death", "the ancestor-resurrection bureau", "our rocket theoreticians", "the immortality sub-committee", "the interplanetary soviet", "the museum of the not-yet-living", "our death-abolition taskforce", "the ancestor-storage bureau", "the cosmos-settlement committee", "our rejuvenation technicians", "the museum of the soon-to-return", "the interstellar quota board", "our resurrection accountants", "the immortality requisitions desk", "the heaven-storming cadre", "the collective of the not-yet-dead"],
  tektology: ["the Universal Organisational Science", "our feedback-loop planners", "the cybernetics bureau (rehabilitated)", "the Tektological Bureau", "the systems-theory circle", "the queue-optimisation directorate", "our correlation engineers", "the linguistics commission (dissolved)", "the punch-card politburo", "the department of correct proportion", "our proportion-balancing engineers", "the feedback-loop directorate", "the rehabilitated systems bureau", "our queue-curvature analysts", "the organisational-science circle", "the punch-card commissariat", "our correlation cadres", "the standing panel on wholes and sums", "the diagram-drawing collective", "the bureau of the well-tuned comrade"],
  maoism: ["the continuous-revolution committee", "our backyard steel furnaces", "the little red study circle", "the anti-sparrow shock-brigade", "the self-criticism collective", "the big-character poster bureau", "the correct-line working group", "our tireless rice communes", "the four-pests campaign staff", "the serve-the-people canteen", "our peasant vanguard of the countryside", "the pot-and-pan requisition brigade", "the mango-preservation sub-committee", "the permanent-revolution reading room", "our loyal quotation-memorisers", "the dazibao pasting collective", "the great-leap accounting desk", "our commune of correct enthusiasm", "the countryside-encircling-the-city planners", "the recitation-and-review circle"],
  thirdworldism: ["the tricontinental solidarity congress", "our non-aligned delegation", "the permanent liberation committee", "the anti-colonial reading group", "our brothers of the periphery", "the dependency-theory working circle", "the global-countryside planning bureau", "our tireless communiqué drafters", "the solidarity-caravan collective", "the wretched-of-the-earth reading room", "the tricontinental postage committee", "our fraternal correspondents abroad", "the anti-imperialist choir", "the periphery-encircling-the-core taskforce", "our congress that never adjourns", "the liberation-communiqué print shop", "the solidarity stamp bureau", "our delegates of the sixteen time zones", "the standing panel on standing in solidarity", "the newly-non-aligned working group"],
  cuban: ["the ten-million-ton harvest brigade", "our voluntary-Sunday labourers", "the New Man committee", "the moral-incentive working group", "the literacy-campaign volunteers", "our sugar-zafra shock-troops", "the rationing-book bureau", "the classic-car preservation collective", "our tireless cane-cutters", "the four-hour-speech drafting desk", "the guerrilla-foco study circle", "our loyal cigar-rollers of the collective", "the moral-over-material accounting office", "the eternal-harvest planning bureau", "our brigade of correct enthusiasm", "the volunteer-labour scheduling committee", "the sugar quota vanguard", "our defenders of the perpetual zafra", "the New Man training annex", "the vintage-sedan maintenance collective"],
  posadism: ["the interplanetary solidarity bureau", "our comrades of the dolphin collective", "the flying-saucer reception committee", "the atomic-dawn working group", "our cetacean liaison officers", "the extraterrestrial fraternal delegation", "the post-nuclear planning circle", "our correspondents with the saucer peoples", "the deep-sea revolutionary chorus", "the cosmic-socialism study group", "our welcoming committee for the space comrades", "the dolphin-literacy sub-committee", "the saucer-landing preparedness bureau", "our theorists of the luminous future", "the interstellar non-aligned delegation", "the friendly-atom appreciation society", "our undersea liberation brigade", "the committee for cordial first contact", "the pan-galactic solidarity annex", "our patient watchers of the night sky"],
  luxury: ["the fully-automated luxury committee", "our comrades of the group chat", "the seize-the-means working group", "the theory-reading vanguard", "our posters of the timeline", "the discourse-management bureau", "the fully-automated canteen", "our tireless podcast politburo", "the late-capitalism observation desk", "the touch-grass review board", "the meme-dissemination collective", "our chronically-correct cadres", "the reading-list enforcement circle", "the luxury-space-communism planning annex", "our stewards of the shared spreadsheet", "the vibes-and-praxis committee", "the infinite-scroll study group", "our defenders of the four-day week", "the automated-abundance bureau", "the correct-opinion posting brigade"]
};

/* ------------------------------------------------------------------ */
/* Claims — keyed by topic. Bare plural verb phrase, lowercase, no    */
/* trailing period. {P} and {N} are placeholders (first one of each   */
/* is filled; don't put two {N}s in one line).                        */
/* ------------------------------------------------------------------ */
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
    "have filed the harvest report in triplicate, then harvested again",
    "have coaxed a second harvest out of pure obligation",
    "have overfulfilled the beet quota by {P}% and blushed",
    "have taught the cabbage to hold its own in committee",
    "have shipped {N} crates of turnips before the paperwork dried",
    "have re-classified the drought as a scheduling error",
    "have out-grown their own optimistic estimates",
    "have declared the weeds ideologically confused and removed them",
    "have raised {N} calves on enthusiasm and correct feed",
    "have persuaded the frost to arrive after the deadline",
    "have filed a complaint against the moon for tardiness"],
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
    "have named the millionth ball-bearing after the Plan",
    "have poured {N} tonnes of concrete before the anthem finished",
    "have overfulfilled the bolt quota by {P}% out of habit",
    "have retooled during the applause",
    "have declared rust a wrecker and abolished it",
    "have assembled {N} turbines in a burst of correct feeling",
    "have out-welded the previous record and then the apology",
    "have run the furnace hot on principle",
    "have exceeded the target so hard it filed a complaint",
    "have produced a spare Five-Year Plan, just in case",
    "have named the new crane after the second-newest quota"],
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
    "have advanced to a higher stage of consciousness, as Resolution {N} foretold",
    "have located the contradiction and scheduled its resignation",
    "have proven the thesis, the antithesis, and the lunch break",
    "have annotated the pamphlet into full agreement",
    "have advanced consciousness by {P}% before the recess",
    "have reconciled the irreconcilable and minuted the reconciliation",
    "have derived the inevitable from first principles and a nap",
    "have upgraded the dialectic to a higher, humming register",
    "have footnoted the footnote until it confessed",
    "have declared the debate synthesised, retroactively",
    "have re-read Resolution {N} and found themselves vindicated"],
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
    "have counter-slandered the slander, dialectically",
    "meet each sanction with a fresh and slightly larger quota",
    "have read the imperialist forecast and remained unbothered",
    "regard the market with the patience of the correctly filed",
    "have out-negotiated the negotiation and then the handshake",
    "decline to be provoked, on the advice of the Plan",
    "have answered the slander with statistics and a shrug",
    "note the bourgeois economists are, once again, surprised",
    "have out-produced the rumour of their decline",
    "greet the embargo as an opportunity for correct self-reliance",
    "have translated the tariff and found it wanting"],
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
    "have denounced the deviation and then, thoroughly, denounced the denouncer",
    "have detected an unauthorised yawn and addressed it",
    "regard punctuality as the first of the virtues, and the second",
    "have re-educated the clock for running slow",
    "will investigate the comrade who looked relaxed",
    "have scheduled vigilance for the hours vigilance was resting",
    "note that a straight queue is a straight conscience",
    "have denounced the deviation, the deviant, and the doorway",
    "regard excessive comfort as a gateway to revisionism",
    "have added a meeting to review the outcome of the last meeting",
    "have corrected the posture of the entire third row"],
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
    "have struck the word 'chromosome' from the seed catalogue",
    "have convinced the barley to volunteer for winter",
    "have abolished the chromosome by unanimous agronomic vote",
    "have raised the yield by {P}% through cold water and warm words",
    "hold that a well-raised crow will lay the egg of a dove",
    "have taught the seedling to inherit the Plan directly",
    "have re-educated the frost-sensitive into frost-enthusiasts",
    "declare competition a bourgeois fiction the beet has never believed",
    "have grafted correct opinions onto the apple stock",
    "have struck the word 'heredity' and replaced it with 'upbringing'",
    "have persuaded {N} saplings to acquire useful characteristics overnight"],
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
    "have booked the cosmos for a Tuesday and asked it to be punctual",
    "have scheduled the abolition of death for the next Plan but one",
    "have requisitioned {N} hectares of sky for correct settlement",
    "have declared the grave a temporary administrative measure",
    "propose to resurrect the ancestors in order of seniority",
    "have rejuvenated the committee by {P}% via fraternal transfusion",
    "have measured eternity and found it broadly on schedule",
    "have booked the heavens and requested a receipt",
    "regard mortality as a clerical error awaiting correction",
    "have stored the departed pending the arrival of the science",
    "have begun colonising Tuesday, then the cosmos"],
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
    "have proven the whole exceeds the sum, provided the sum is planned",
    "have balanced the entire economy by nudging one comrade leftward",
    "have declared disorder a wrecker and organised it away",
    "have modelled the queue until the queue apologised",
    "have optimised the system by {P}% and one polite request",
    "have fed the Plan to the machine, which agreed at once",
    "have proven the whole exceeds the sum, weather permitting",
    "have traced all inefficiency to a single unbalanced feedback loop",
    "have re-tuned the comrade and, with him, the republic",
    "have curved the bread queue into a perfect and hungry circle",
    "have organised organisation itself, footnoted in quadruplicate"],
  maoism: [
    "have smelted {N} woks into a single triumphant and useless ingot",
    "have declared the sparrow a class enemy and pursued it accordingly",
    "have memorised the little red book front to back and sideways",
    "have advanced the continuous revolution by {P}% before breakfast",
    "have papered the wall with {N} big-character posters overnight",
    "have criticised themselves so thoroughly the room applauded",
    "hold that the countryside shall, in time, encircle the city",
    "have re-forged the whole village's cookware into revolutionary steel",
    "have served the people, then served them seconds",
    "have found a fresh deviation and swiftly corrected the wall about it",
    "have raised the rice yield by {P}% through sheer correctness of line",
    "have declared the four pests three, then reconsidered the sparrow",
    "have preserved the sacred mango under glass, pending further study",
    "regard a soft cushion as the first step toward revisionism",
    "have invited the professors to consult the cabbage directly",
    "have painted the correct slogan on every available surface, twice",
    "have declared the pot, the pan, and the doorknob newly patriotic steel",
    "have out-quoted the revisionists at the weekly recitation",
    "have determined the line, corrected the line, then straightened it",
    "propose to leap so great a leap the calendar cannot keep up"],
  thirdworldism: [
    "have drafted {N} communiqués of fraternal solidarity before lunch",
    "hold that the global countryside shall encircle the global city",
    "have convened a congress so permanent it has grown its own committees",
    "have declared solidarity with everyone, in order, alphabetically",
    "have out-manifestoed the manifesto by {P}%",
    "have added a fourth continent to the tricontinental agenda, provisionally",
    "have resolved the core–periphery contradiction over a very long dinner",
    "have translated the resolution into forty tongues and one shrug",
    "note that non-alignment requires the most careful alignment of chairs",
    "have pledged {N} brigades of correct correspondence",
    "have declared the postage of solidarity a revolutionary act",
    "have footnoted dependency theory until the theory declared independence",
    "have greeted the delegation with {N} verses of the anthem",
    "remain non-aligned with everything except the buffet",
    "have circulated the communiqué so widely it circled back unread",
    "have resolved to liberate the agenda from the previous agenda",
    "have declared every hour tricontinental o'clock",
    "have out-congressed the congress and then congratulated it",
    "propose a solidarity that scales with the number of committees",
    "have affirmed, reaffirmed, and then re-reaffirmed the resolution"],
  cuban: [
    "have vowed to cut the ten-million-ton harvest, then to explain the shortfall",
    "have cut {N} thousand tonnes of cane through moral incentive alone",
    "have forged the New Man, then scheduled his refresher course",
    "have volunteered for {N} Sundays of labour, joyfully and in advance",
    "have declared the material incentive a bourgeois crutch and set it aside",
    "have taught the whole province to read, then handed it more to read",
    "have kept the vintage sedan running on ingenuity and correct feeling",
    "have delivered a speech so thorough the sun set twice",
    "have out-harvested last year's harvest and next year's apology",
    "hold that the will overfulfils where the wallet cannot",
    "have rolled {N} cigars in honour of the perpetual zafra",
    "have declared the rationing book a document of correct proportion",
    "have replaced the day off with a more spirited kind of day on",
    "have raised morale by {P}% and sugar by slightly less",
    "regard tiredness as a rumour spread by the revisionists",
    "have promised the harvest, the New Man, and a shorter speech next time",
    "have kept the caravan of ingenuity rolling on spare enthusiasm",
    "propose to overfulfil the zafra by will, weather, and volunteer Sunday",
    "have measured the sugar in tonnes and the morale in decibels",
    "have declared the perpetual harvest perpetual, pending rain"],
  posadism: [
    "have concluded that the flying saucers are, on balance, comradely",
    "hold that the dolphins have already reached a higher stage of consciousness",
    "have prepared {N} welcome banners for the arriving saucer peoples",
    "have declared the atom a friend, once correctly organised",
    "propose to open fraternal relations with the cetacean soviets",
    "have taught the dolphins {N} verses of the anthem, phonetically",
    "await the luminous future with correct patience and warm coats",
    "have reasoned that any species crossing the void must surely be socialist",
    "have scheduled first contact for a Tuesday, void weather permitting",
    "regard the whale as a natural ally of the working class",
    "have drafted a treaty of solidarity with the peoples of the saucers",
    "have measured the heavens for signs of comradely intent",
    "hold that the interstellar comrades will bring the correct line from afar",
    "have appointed {N} liaisons to the deep and the beyond",
    "declare the night sky a bulletin board of imminent solidarity",
    "have resolved that the future is luminous, aquatic, and broadly on schedule",
    "propose to greet the saucers with beets, banners, and the anthem",
    "have determined the dolphins are merely awaiting the correct invitation",
    "have prepared the harbour, the sky, and the paperwork for arrival",
    "regard cosmic pessimism as itself a kind of revisionism"],
  luxury: [
    "have fully automated the luxury and are now automating the committee",
    "have seized the means and immediately formed a subcommittee about them",
    "have read {N} pages of theory and posted about {P}% of it",
    "hold that the future is fully automated, luxuriant, and gently online",
    "have declared touching grass a counter-revolutionary deviation",
    "have optimised the four-day week down to a spirited three",
    "have out-posted the revisionists across every timeline at once",
    "regard the group chat as the highest form of democratic centralism",
    "have automated {N} tedious tasks and scheduled a nap for each",
    "have resolved the discourse and immediately opened a new one",
    "have distributed abundance evenly, then argued about the spreadsheet",
    "declare late capitalism, once again, extremely late",
    "have read the reading list, cited the reading list, become the reading list",
    "hold that praxis is just vibes that filed the correct paperwork",
    "have achieved {P}% automation and one hundred percent opinions",
    "propose luxury for all, and a slightly nicer luxury for the committee",
    "have converted the means of production into a very good podcast",
    "note that the discourse, like the harvest, must be seasonally rotated",
    "have declared the shared spreadsheet the true general will",
    "have seized the timeline and redistributed the likes"]
};

/* ------------------------------------------------------------------ */
/* Closers — keyed by fervour level. Standalone sentences.            */
/* ------------------------------------------------------------------ */
const closers = {
  1: ["The matter is settled.", "Forward, to the next quota.", "Entered into the minutes.", "So resolved.", "The Plan endures.", "Noted, and filed.", "Onward.", "This concludes the item.", "Item closed.", "Duly noted.", "The ledger agrees.", "Filed, and forgotten by design.", "Nothing further arises.", "Adjourned, provisionally.", "The stamp is applied.", "Correct, as expected."],
  2: ["It was never truly open.", "Onward to overfulfilment.", "Recorded as unanimous, as always.", "Let the doubters take note.", "The vote carries itself.", "History will thank the committee.", "To work, comrades.", "The direction is correct.", "The motion was never in doubt.", "As the Plan foresaw.", "Recorded, and quietly celebrated.", "The room agreed, some sooner than others.", "Progress continues on schedule.", "The doubters have been noted.", "Onward, and slightly upward.", "History nods."],
  3: ["NOT open to discussion.", "To the tractors! To the footnotes!", "The Presidium thanks itself.", "Let no one waver.", "The quota WILL be met.", "Vigilance above all.", "There is no other reading.", "The line holds.", "The gavel has SPOKEN.", "No amendments. None.", "Let the wreckers reconsider their lives.", "The Plan tolerates no footnote of dissent.", "Overfulfil, or explain yourself.", "The record is sealed in iron.", "Vigilance does not sleep.", "This item is CLOSED, thunderously."],
  4: ["ALL IN FAVOUR — there is no other kind.", "The quota is dead. Long live the quota!", "Let the anthem play thrice.", "Let the abacuses SING.", "History itself stands and applauds.", "The beet is eternal.", "Carried, gloriously, unanimously, again.", "To the STARS, and back by the night shift.", "Let the anthem repeat until morale improves.", "The beet ascends! The doubter descends!", "Applause is mandatory and sincere.", "Carried unanimously, twice, for the joy of it.", "Ring the bells! Overfulfil the bells!", "History faints from pride.", "So decreed, so sung, so filed.", "GLORY, and also paperwork."]
};

/* Carried over from the original file; not used by the composer, kept for
   future use so nothing is lost. */
const tags = {
  1: ["as theory and practice require", "for the Plan is not a suggestion"],
  2: ["for dialectical materialism admits no compromise", "as the correlation of forces demands"],
  3: ["for to doubt the quota is to doubt history", "and the wavering shall be re-educated"],
  4: ["for the beet is eternal and the deviationist is dust", "and the dialectic does not repeat itself"],
  lysenko: ["since acquired characteristics are inherited, and so is class consciousness", "and the name Vavilov shall not appear in the minutes"],
  cosmism: ["for the withering of the grave outranks the withering of the state", "since the cosmos, too, must fulfil its Plan"],
  tektology: ["for the whole exceeds the sum, provided the sum is planned", "and the linguistics question is, for now, settled from above"]
};
const signatories = ["The Presidium", "Sub-committee 14 (Beets)", "The Bureau of Correct Enthusiasm", "The Directorate of Footnotes", "The Michurinist Praesidium", "The Institute of the Common Task", "The Rehabilitated Cybernetics Bureau", "The Standing Committee on Standing", "The Commission for the Abolition of Death", "The Tribunal of Punctuality", "The Department of Correct Proportion", "The Order of the Golden Turnip"];

/* ------------------------------------------------------------------ */
/* Extremely-online layer.                                            */
/*  - onlinePrefix: if it ends in . or !, the subject is capitalised.  */
/*  - memes: functions (subject, claim) => string.                     */
/* ------------------------------------------------------------------ */
const onlinePrefix = [
  "hot take:", "unpopular opinion:", "POV:", "reminder that", "gm.",
  "gm to everyone except the revisionists.", "genuinely obsessed with how", "screenshotting this —",
  "idk who needs to hear this but", "in this thread i will explain why", "everyone's ignoring that",
  "normalize", "lowkey", "highkey", "not to be dramatic but", "controversial but",
  "saying it louder for the back:", "petition to acknowledge that", "friendly reminder:",
  "breaking:", "so we're just not going to talk about how", "calling it now:",
  "respectfully,", "the audacity of",
  "real talk:", "not me realising", "the way that", "obsessed that", "crying because",
  "genuinely unwell over how", "we need to talk about how", "history nerds rise up:", "psa:",
  "hear me out:", "no thoughts just", "manifesting that", "unhinged that", "sir this is a soviet:",
  "day one of noticing that", "gm, and also"
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
  "bestie the harvest is harvesting.", "10/10 no notes.", "everyone say thank you comrade.",
  "the Plan understood the assignment.", "correct behaviour only.", "we stan a planned economy.",
  "iconic quota energy.", "and I think that's beautiful.", "no because this is CANON.",
  "the committee ate and left no crumbs.", "vernalized and thriving.", "min-maxing the harvest fr.",
  "absolute unit of a quota.", "the revisionists could never.", "sending this to the Presidium gc.",
  "brb overfulfilling.", "it's the triplicate for me.", "slay, comrade. respectfully, slay.",
  "history said periodt."
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
  (s, c) => "it's 2am and i cannot stop thinking about how " + s + " " + c + ".",
  (s, c) => cap(s) + " " + c + ". and that's the tweet.",
  (s, c) => "POV: it's your turn to minute that " + s + " " + c + ".",
  (s, c) => "the fact that " + s + " " + c + " lives in my head rent-free.",
  (s, c) => "normalise being proud that " + s + " " + c + ".",
  (s, c) => "petition for a holiday: " + s + " " + c + ".",
  (s, c) => "when " + s + " " + c + " — comrade behaviour, honestly.",
  (s, c) => "correct answer: " + s + " " + c + ". next question.",
  (s, c) => "asked the Plan what's good. " + cap(s) + " " + c + ".",
  (s, c) => "ranking today's news and " + s + " " + c + " is number one.",
  (s, c) => "them: touch grass.\nme: " + s + " " + c + ".\nthem: understood.",
  (s, c) => "screenshotting this: " + cap(s) + " " + c + "."
];

const TOPICS = Object.keys(subjects);
const MAX = 300;              // Bluesky's hard limit (graphemes)
const POST_MAX = 180;         // punchy target — short, feed-friendly
const WEIGHTED_LEVELS = [1, 1, 2, 2, 3, 4]; // random fervour, weighted low

/* ------------------------------------------------------------------ */
/* Helpers + composer                                                  */
/* ------------------------------------------------------------------ */
const pick = a => a[Math.floor(Math.random() * a.length)];
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const _seg = (typeof Intl !== "undefined" && Intl.Segmenter) ? new Intl.Segmenter("en", { granularity: "grapheme" }) : null;
const glen = s => _seg ? [..._seg.segment(s)].length : Array.from(s).length; // grapheme count, matches Bluesky

/* Numbers. Random-in-a-band reads as machine noise; specific numbers are
   funnier. Bias toward the comedically-loaded ones — just-over-100, absurdly
   round, or suspiciously precise — with a small tail of true randomness so it
   never becomes its own predictable set. */
const grp = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const FUNNY_PCT = [101, 102, 103, 104, 107, 110, 110, 112, 118, 127, 137, 150, 150, 200, 200, 240, 300, 400, 500, 700, 1000, 4000, 10000, 1000000];
const FUNNY_N   = [1, 2, 3, 3, 7, 7, 9, 11, 12, 14, 17, 40, 44, 88, 100, 144, 200, 365, 500, 1000, 4000, 9000, 40000, 1000000];
const pctVal = () => Math.random() < 0.15 ? 100 + Math.floor(Math.random() * 315) : pick(FUNNY_PCT);
const nVal   = () => Math.random() < 0.15 ? 40  + Math.floor(Math.random() * 940) : pick(FUNNY_N);
const fill = t => t
  .replace("{P}", grp(pctVal()))
  .replace("{N}", grp(nVal()));

/* Trailing clauses that let a classic line resolve without the mad-lib
   always ending on the claim. */
const asClauses = [
  "as theory and practice require", "as the correlation of forces demands",
  "as anyone but a wrecker can see", "as the Plan foresaw",
  "on schedule, and slightly ahead of it", "with no notes from the Presidium",
  "pending only the usual paperwork", "and the minutes concur",
  "to no one's surprise and everyone's relief", "as was, frankly, inevitable"
];

/* Reactions that comment on the absurdity itself rather than cheerlead — these
   read like a person replying to the bot, which is the point. */
const onlineMeta = [
  "the specificity is what gets me.", "not the triplicate 😭",
  "why is this the funniest thing i've read today.", "the deadpan is unmatched.",
  "posting through it.", "i think about this bulletin a normal amount.",
  "no notes. one note. filed in triplicate.", "the committee said what it said.",
  "professionally unwell about this.", "and they were NORMAL about it.",
  "sir. SIR.", "the way this is just… allowed.", "genuinely a masterclass.",
  "screaming at 'to no one's surprise'.", "this bulletin has no business going this hard."
];

function classicProducer(topic, lvl) {
  const o = pick(openers[lvl]);
  const s = pick(subjects[topic]);
  const c = fill(pick(claims[topic]));
  const cl = pick(closers[lvl]);
  const r = Math.random();

  // Two collectives in one breath — creates unexpected comedic pairings.
  if (r < 0.18) {
    const s2 = pick(subjects[topic]), c2 = fill(pick(claims[topic]));
    if (Math.random() < 0.5) {
      const j = pick([", while ", " — meanwhile ", ", and, not to be outdone, "]);
      return cap(o + " " + s + " " + c + j + s2 + " " + c2 + ".");
    }
    const j = pick([" Separately, ", " Elsewhere, ", " In related news, "]);
    return cap(o + " " + s + " " + c + "." + j + cap(s2) + " " + c2 + ".");
  }
  // Lead with the claim; drop the opener entirely.
  if (r < 0.34) return cap(s) + " " + c + ". " + cl;
  // Resolve on a trailing clause instead of the claim.
  if (r < 0.50) return cap(o + " " + s + " " + c + ", " + pick(asClauses) + ".");
  // Opener + subject + claim + closer.
  if (r < 0.74) return cap(o + " " + s + " " + c + ". " + cl);
  // Bare.
  return cap(o + " " + s + " " + c + ".");
}

function onlineProducer(topic, lvl) {
  const s = pick(subjects[topic]), c = fill(pick(claims[topic]));
  const r = Math.random();
  if (r < 0.30) {
    const p = pick(onlinePrefix);
    return /[.!]$/.test(p) ? p + " " + cap(s) + " " + c + "." : p + " " + s + " " + c + ".";
  }
  if (r < 0.52) return cap(s) + " " + c + ". " + pick(onlineReaction);
  if (r < 0.70) return cap(s) + " " + c + ". " + pick(onlineMeta); // meta > hype
  return pick(memes)(s, c);
}

/* Format-breakers. Same vocabulary, wholly different shapes — errata, inter-
   department sniping, the suggestion box, minutes fragments. These fire rarely;
   rarity is what keeps a feed from reading as a grid. */
function specialProducer(topic, lvl) {
  const s  = pick(subjects[topic]),  c  = fill(pick(claims[topic]));
  const s2 = pick(subjects[topic]),  c2 = fill(pick(claims[topic]));
  const cl = pick(closers[lvl]);
  const item = 2 + Math.floor(Math.random() * 30);
  const specials = [
    () => "CORRECTION to yesterday's bulletin: " + cap(s) + " " + c + " — not, as printed, the reverse. The typesetter has been thanked, thoroughly.",
    () => "ERRATUM: where the record states that " + s + " " + c + ", please read the same, but louder.",
    () => cap(s) + " " + c + ". " + cap(s2) + ", we note, only " + c2 + " — but we are not comparing.",
    () => "For the third time of asking: " + s + " " + c + ". The relevant department knows precisely what it did.",
    () => "From the suggestion box: \u201cwhat if " + s + " " + c + "?\u201d They already have. Suggestion noted, and pre-empted.",
    () => "Morale forecast: correct, with scattered overfulfilment. " + cap(s) + " " + c + ". " + cl,
    () => cap(s) + " " + c + ".*\n\n*Footnote redacted, for correctness.",
    () => "It would be a great shame if it were not widely and immediately known that " + s + " " + c + ".",
    () => "MINUTES \u2014 item " + item + ": " + cap(s) + " " + c + ". Carried unanimously. Item " + (item + 1) + ": a motion to thank item " + item + ".",
    () => "Overheard at the Congress: \u201c" + cap(s) + " " + c + "?\u201d Yes. Next question.",
    () => "Anonymous comrade writes: \u201cis it true " + s + " " + c + "?\u201d It is truer than that.",
    () => "Weekly tally \u2014 wreckers: 0. Doubters: 0. Reasons " + s + " " + c + ": all of them."
  ];
  return pick(specials)();
}

// Try a producer up to 40 times; return the first result under `max`,
// else the shortest seen, hard-truncated on a word boundary.
function fit(producer, max) {
  max = max || POST_MAX;
  let shortest = null;
  for (let i = 0; i < 40; i++) {
    const cand = producer();
    if (glen(cand) <= max) return cand;
    if (!shortest || glen(cand) < glen(shortest)) shortest = cand;
  }
  const chars = _seg ? [..._seg.segment(shortest)].map(x => x.segment) : Array.from(shortest);
  return chars.slice(0, max - 1).join("").replace(/\s+\S*$/, "") + "\u2026";
}

// voice: "classic" | "online" | "special" | "auto".
// auto mixes classic/online, with an occasional format-breaker for surprise.
function composePost(topic, lvl, voice) {
  if (voice === "auto" && Math.random() < 0.12) {
    return { text: fit(() => specialProducer(topic, lvl), 260), voice: "special" };
  }
  let v = voice;
  if (v === "auto") v = Math.random() < 0.5 ? "online" : "classic";
  if (v === "special") return { text: fit(() => specialProducer(topic, lvl), 260), voice: v };
  const producer = v === "online" ? () => onlineProducer(topic, lvl) : () => classicProducer(topic, lvl);
  return { text: fit(producer), voice: v };
}
/* ------------------------------------------------------------------ */

function pickLevel() {
  const f = process.env.FERVOUR && parseInt(process.env.FERVOUR, 10);
  if (f >= 1 && f <= 4) return f;
  return pick(WEIGHTED_LEVELS); // weighted toward calmer registers
}

function pickTopic() {
  const t = process.env.TOPIC;
  return TOPICS.includes(t) ? t : pick(TOPICS);
}

function pickVoice() {
  const v = (process.env.VOICE || "auto").toLowerCase();
  return ["classic", "online", "special", "auto"].includes(v) ? v : "auto";
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
