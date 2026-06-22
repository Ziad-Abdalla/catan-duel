# Fixing the GitHub account flag

Your account is flagged (symptoms: public repos 404 to logged-out visitors; PartyKit /
third-party apps can't be authorized). It's almost certainly an **automated false positive**
from the recent force-push history rewrite. Here's how to get it lifted.

## Steps
1. Sign in at https://github.com — if a flag banner appears, click its **"appeal" / "request a
   review"** link and paste the message below.
2. If there's no banner, open **https://support.github.com/contact/flagged-account** (signed in
   with the flagged account) and submit the message below.
3. Check the account's email (and spam) for any GitHub notice.
4. While flagged, avoid further force-pushes / history rewrites — normal commits are fine.

## Copy-paste appeal message

> Subject: Account flagged — request review and reinstatement
>
> Hello,
>
> My account (USERNAME) appears to have been flagged, which is making my public repositories
> return 404 to logged-out visitors and preventing me from authorizing third-party apps. I
> believe this was triggered automatically.
>
> I'm an individual student developer working on personal projects. The only unusual recent
> activity was rewriting commit history (a force-push) across some of my own repositories to
> remove an automatically-inserted co-author trailer from my commits. None of my activity is
> spam, malware, or abuse, and I haven't violated the Acceptable Use Policies.
>
> Could you please review my account and lift the flag? I'm happy to provide any verification
> you need. Thank you.
>
> — USERNAME

Replace `USERNAME` with the flagged account name. Replies usually come within 1–3 business days,
and automated-flag reversals are common.

## After it's lifted
- Public repos stop 404-ing.
- `npm run party:deploy` (the simple free PartyKit path) will work — see `docs/DEPLOY.md`
  and `PLAY-FOR-EVERYONE.html`.
- The auto-deploy workflow (`.github/workflows/deploy.yml`) will run on push once you add the
  two PartyKit secrets.
