ДИАЛЕКТ — Soviet Discourse Bot

A satirical bot that posts absurd Soviet Party "pronouncements" to Bluesky three
times a day — committee-speak, Lysenkoist biology, Cosmism, Tektology, and the
eternal war on the revisionist deviation, half of it wrapped in extremely-online
timeline patois. Every phrase is invented; the target is the rhetorical style,
not the grim history behind it.

Zero dependencies. It talks to Bluesky over plain HTTPS, so there's nothing
to npm install and no third-party package that could be compromised.

Files

soviet-bot.js                          the bot (generator + Bluesky poster)
package.json                           metadata; declares no dependencies
.gitignore                             keeps credentials out of the repo
.github/workflows/post-to-bluesky.yml  the 3×/day schedule
README.md                              this file

Setup (about 5 minutes)

1. Create a Bluesky App Password

Go to bsky.app/settings/app-passwords → Add App Password. Name it something
like dialekt-bot. Leave "Allow access to your direct messages" unchecked —
the bot only needs to post. Copy the xxxx-xxxx-xxxx-xxxx value now; it can't be
shown again (but you can always delete it and make a new one).

App passwords are safe for this: they never expose your main password, they work
alongside 2FA, they can't delete or migrate your account, and you can revoke one
instantly without affecting anything else.

2. Push these files to a GitHub repo

Public or private both work. Keep the folder layout exactly as above — the
workflow must stay at .github/workflows/post-to-bluesky.yml.

3. Add your credentials as encrypted secrets

In the repo: Settings → Secrets and variables → Actions → New repository
secret. Add two:


BSKY_HANDLE → your.handle.bsky.social
BSKY_APP_PASSWORD → the app password from step 1


GitHub encrypts these and masks them in logs. They are never committed to the
repo. Do not put credentials in the code or in any file.

4. Test it

Actions tab → Soviet Discourse Bot → Run workflow. Open the run log;
you should see Posted: https://bsky.app/.... Check your profile to confirm.

5. Done

It now posts automatically at 08:00, 14:00, and 20:00 UTC. Edit the cron lines
in the workflow to change times (GitHub cron is UTC).

Keep-alive: GitHub pauses scheduled workflows after ~60 days without repo
activity. Push a small commit now and then so it doesn't quietly stop.

Run it locally (optional)

Node 18+ required.

bashnode soviet-bot.js                 # prints a sample post, sends NOTHING (dry run)
npm run post                       # posts, needs BSKY_HANDLE + BSKY_APP_PASSWORD in env
TOPIC=lysenko node soviet-bot.js   # pin a topic
VOICE=online node soviet-bot.js    # pin the voice (classic | online | auto)
FERVOUR=4 node soviet-bot.js       # pin intensity (1–4)

Topics: agriculture, industry, theory, west, discipline, lysenko,
cosmism, tektology.

Good to know


Dry-run by default. The bot sends nothing unless you pass --post (the
workflow sets this). Run it dry a few times first to see the range it produces.
Unattended = no human review. Once live, nobody eyeballs each post before
it goes out. That's the point of automation, but decide you're happy with the
output first.
If the app password leaks, delete it in Bluesky settings (instant revoke),
create a new one, and update the BSKY_APP_PASSWORD secret.
Etiquette: put something like "automated · satire" in the bot account's
bio so it reads clearly as a bot.
Rate limits: 3 posts/day is far under Bluesky's limits.
Posts are kept ≤ 180 characters (Bluesky's hard limit is 300), counted the
same grapheme way Bluesky enforces.
