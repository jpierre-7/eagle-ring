# Joining Eagle Ring

Eagle Ring is a webring for Houston City College CS students, alumni, faculty and staff. It has two parts:

- the **Directory**, a public page that lists every Member's personal website, grouped by Graduation Year;
- the **Ring Widget**, a small block of links you can add to your own site. It sends visitors to the previous, next or a random Member's site.

This guide takes you from nothing to listed. You don't need to have used git before. Every step can be done in your web browser on github.com.

## TL;DR (if you already know GitHub)

1. Fork the repo and copy [`docs/member-example.yaml`](docs/member-example.yaml) to `src/content/members/<your-slug>.yaml`. The slug is 2 to 32 lowercase letters and digits in groups joined by single hyphens, like `kevin-tran`. It never changes after merge.
2. Fill in `name`, `site`, `graduationYear` and `github`. `tagline` and `status` are optional. If you're Faculty (you teach or taught CS at the School, or work or worked there with CS students, for example as a dean or an advisor), add `faculty: true`; Faculty who never studied at the School leave out `graduationYear`. The rules are in [section 4](#4-every-field-and-its-rules).
3. Optional: add a 16:9 [screenshot](#your-screenshot-optional) of your Site at `src/content/screenshots/<your-slug>.webp` (or `.png` / `.jpg`), 1280×720 to 1920×1080, at most 500 KB. The Directory shows it when someone hovers over your row.
4. Open a PR against `main` that changes **only** your Member file (and your screenshot, if you added one), and tick the three boxes in the template. Faculty also link a public School page that shows their role.
5. Fix anything [CI](#5-what-ci-checks) flags. The Maintainer reviews your Site and merges.
6. Optional: add the [Ring Widget](#6-adding-the-ring-widget) to your Site.

New to GitHub? Skip this and follow the full guide below.

A few words used below:

- **Member**: someone listed in the Directory.
- **Site**: your personal website, the thing the Directory links to.
- **Graduation Year**: the year you graduated, expect to graduate, or left the School. Faculty who never studied at the School have none.
- **Standing**: an optional note on how you relate to the School (graduated, transferred or attended).
- **Faculty**: a Member who teaches or has taught a CS course at the School, or works or worked there with CS students (for example, a dean or an advisor).
- **Submission**: the pull request (explained below) that adds or edits your record.
- **Maintainer**: the person who reviews and accepts Submissions. Right now that's John Pierre, [@jpierre-7](https://github.com/jpierre-7).
- **the School**: Houston City College.

## Contents

1. [Who can be a Member](#1-who-can-be-a-member)
2. [What you need first](#2-what-you-need-first)
3. [Steps to join](#3-steps-to-join)
4. [Every field and its rules](#4-every-field-and-its-rules)
5. [What CI checks](#5-what-ci-checks)
6. [Adding the Ring Widget](#6-adding-the-ring-widget)
7. [Editing your record or leaving](#7-editing-your-record-or-leaving)
8. [Contacting the Maintainer](#8-contacting-the-maintainer)

## 1. Who can be a Member

Anyone who takes or took CS classes at Houston City College, plus Faculty.

- You don't need a degree from the School. If you transferred to another school, you count.
- Current students count too.
- Nobody checks your transcript. It works on trust. The Maintainer looks at your Site before accepting it.
- **Faculty count too.** Faculty means anyone who teaches or has taught a CS course at the School, or who works or worked there in a role that serves CS students, such as a dean or an advisor. Now or in the past, adjuncts included. Teaching assistants don't count as Faculty (but if you take or took CS classes, you can still join as a student).
  - Faculty are listed in the Directory with a yellow **Faculty & Staff** label next to their name, and use the same ring as everyone else.
  - The Maintainer checks Faculty before merging, using a public School page such as a course schedule or a staff listing. Link one in your PR. If the Maintainer can't confirm it, they'll ask you to remove `faculty: true` from your file.

## 2. What you need first

- **A Site that starts with `https://`.** It must be your own personal website. A free GitHub Pages site (like `https://yourname.github.io/`) is fine, and so is one in a subfolder (like `https://yourname.github.io/my-site/`). A profile page on another service (LinkedIn, X, your GitHub profile page) is not a Site.
- **A GitHub account.** It's free. Sign up at [github.com/signup](https://github.com/signup).

## 3. Steps to join

First, some words you'll see:

- **Repository (repo)**: a project's folder of files on GitHub, with its full history. Eagle Ring's repo is [github.com/jpierre-7/eagle-ring](https://github.com/jpierre-7/eagle-ring).
- **Fork**: your own copy of someone else's repo, under your account. You change your copy, then ask for your change to be copied back.
- **Commit**: a saved change to one or more files, with a short message saying what changed.
- **Pull request (PR)**: a request to the Maintainer to pull your change from your fork into the real repo. On Eagle Ring, your PR is your Submission.
- **CI (continuous integration)**: robot checks that run on every PR and report problems before a person looks at it.
- **YAML**: a simple text format of `field: value` lines. Your Member file is written in it.

### Step 1: Pick your slug

Your **slug** is a short ID for you, usually your name, like `kevin-tran`. It becomes your filename and appears in your Ring Widget links.

- 2 to 32 characters.
- Only lowercase letters `a` to `z` and digits `0` to `9`, in groups joined by single hyphens.
  - Good: `kevin-tran`, `jo`, `mary-jane-watson`, `ada2024`.
  - Not allowed: `Kevin-Tran` (capitals), `kevin_tran` (underscore), `kevin--tran` (two hyphens), `-kevin` or `kevin-` (hyphen at the start or end), `kevin.tran` (dot), `josé` (accented letter).
- **Choose carefully: your slug never changes after your Submission is merged**, because other Sites link to it.

### Step 2: Fork the repo

1. Sign in to GitHub.
2. Go to [github.com/jpierre-7/eagle-ring](https://github.com/jpierre-7/eagle-ring).
3. Click **Fork** near the top right, then **Create fork**.

You now have your own copy at `github.com/<your-username>/eagle-ring`. Do the next steps there.

### Step 3: Create your Member file

1. In your fork, open [`docs/member-example.yaml`](docs/member-example.yaml). Click the **Copy raw file** button (two overlapping squares) above the file to copy all of it.
2. Go back to the top of your fork and open the folder `src/content/members/`.
3. Click **Add file**, then **Create new file**.
4. In the name box, type your slug followed by `.yaml`, for example `kevin-tran.yaml`. The full path must be `src/content/members/<your-slug>.yaml`. Use `.yaml`, not `.yml`, and don't put it in a subfolder.
5. Paste the example into the big text box.

### Step 4: Fill it in

Change every value to your own. [Section 4](#4-every-field-and-its-rules) explains each field. You can delete the comment lines (the ones starting with `#`).

A finished file looks like this:

```yaml
name: Kevin Tran
site: https://kevintran.github.io/
graduationYear: 2023
github: kvtran
tagline: Data analyst. Plots things in R.
status: transferred
```

When you're done, click **Commit changes**, write a short message such as `Add kevin-tran`, and click **Commit changes** again.

### Step 4b (optional): Add a screenshot of your Site

If you'd like, the Directory can show a small picture of your Site when someone hovers over your name. [Your screenshot](#your-screenshot-optional) in section 4 has the rules and how to make one. To upload it:

1. In your fork, open the folder `src/content/screenshots/`.
2. Click **Add file**, then **Upload files**, and drag your picture in. Its name must be your slug plus `.webp`, `.png` or `.jpg`, for example `kevin-tran.webp`. Rename it on your computer first if needed.
3. Click **Commit changes**.

You can also do this later, in its own PR.

### Step 5: Open your pull request

1. At the top of your fork, click **Contribute**, then **Open pull request**.
2. Check that the PR shows exactly one new file, yours, or two if you added a screenshot.
3. The description box already holds three checkboxes. Tick each one by changing `[ ]` to `[x]`:
   - I take or took CS coursework at the School, or I'm Faculty.
   - This Site is mine.
   - This PR changes only my Member file (and my screenshot, if I added one).
4. If you're Faculty, link a public School page that shows your role (a course schedule or a staff listing).
5. Under *Anything the Maintainer should know?*, add a note if you like, or leave it empty.
6. Click **Create pull request**.

### Step 6: Wait for CI and review

CI runs on your PR ([section 5](#5-what-ci-checks)). If a check fails, its message names the file and field. Fix the file in your fork (open it, click the pencil icon, edit, commit). The PR updates by itself and CI runs again.

The Maintainer then reviews your PR, looks at your Site, and merges it. **Merge** means your change is copied into the real repo. The Directory updates a few minutes later.

### Step 7 (optional): Add the Ring Widget

See [section 6](#6-adding-the-ring-widget).

### If you already use git

Fork, clone your fork, then:

```sh
git switch -c join/<your-slug>
cp docs/member-example.yaml src/content/members/<your-slug>.yaml
# edit the file
git add src/content/members/<your-slug>.yaml
git commit -m "Add <your-slug>"
git push -u origin join/<your-slug>
```

Then open a PR against `main` on `jpierre-7/eagle-ring`.

## 4. Every field and its rules

These rules are checked by code. If this page and the code ever disagree, the code wins. The rules live in [`src/lib/member.ts`](src/lib/member.ts) (the fields) and [`src/content.config.ts`](src/content.config.ts) (how Member files are loaded).

### The filename (your slug)

- The file goes directly in `src/content/members/`, not in a subfolder.
- It's named `<your-slug>.yaml`. It must end in `.yaml` (not `.yml`).
- The slug follows the rules in [Step 1](#step-1-pick-your-slug): 2 to 32 characters, lowercase letters and digits in groups joined by single hyphens.
- It never changes after your Submission is merged.

### `name` (required)

- Your name as you want it shown in the Directory. It can be a nickname.
- 1 to 60 characters. Spaces at the start and end are trimmed off.

### `site` (required)

- Your Site's address. It must start with `https://`.
- No query string (the part from `?`) and no fragment (the part from `#`).
- Subfolders are fine: `https://7jpierre.github.io/jp-website/`.
- It must be on a public domain name, with a dot in it. `https://localhost/` is not allowed.
- No username or password in the address (like `https://me:secret@example.com/`).
- No other Member can already have the same Site. Capital letters in the domain and a trailing `/` don't make it different.
- It can't be a page on a profile or social service. That means anything on `github.com`, social sites like LinkedIn, X, Instagram or YouTube, code hosts like GitLab or Codeberg, coding-profile sites like LeetCode or Kaggle, and link-in-bio pages like Linktree. A GitHub Pages site like `yourname.github.io` is fine. The full list is in [`scripts/submission/profile-hosts.ts`](scripts/submission/profile-hosts.ts).

### `graduationYear` (required, except for Faculty)

- The year you graduated, expect to graduate, or left the School (for example, the year you transferred out).
- Still a student? Put your best guess. You can change it later.
- A whole number from 1990 to six years after the current year.
- Write it as a plain number, without quotes: `graduationYear: 2023`, not `graduationYear: "2023"`.
- **Faculty who never studied at the School leave it out** (delete the whole line). They're listed in the Directory's Faculty group. Only Faculty (`faculty: true`) may leave it out.
- Faculty who also studied at the School keep their Graduation Year, and are listed in that year's group.

### `github` (required)

- Your GitHub username (handle), **without** the `@`: `github: kvtran`, not `github: "@kvtran"`.
- It follows GitHub's own rules: 1 to 39 letters, digits or single hyphens, not starting or ending with a hyphen.
- No other Member can already have the same handle, ignoring capital letters.
- It's shown in the Directory. It also decides who owns the record: changes to it are expected to come from this account (see [section 7](#7-editing-your-record-or-leaving)).
- If your handle is only digits (like `12345`), wrap it in double quotes: `github: "12345"`. Otherwise YAML reads it as a number and the check fails.

### `tagline` (optional)

- A short line about you, shown in the Directory.
- Plain text, one line, at most 80 characters.
- No HTML (like `<b>`), no Markdown links (like `[text](url)`), and no links or web addresses (nothing with `http://`, `https://` or `www.`).
- If you don't want one, delete the whole `tagline:` line. Don't leave it empty.

### `status` (optional): your Standing

- One of `graduated`, `transferred` or `attended`, written in lowercase. The Directory shows it as Graduated, Transferred or Attended.
  - `graduated`: you graduated from the School.
  - `transferred`: you moved to another school.
  - `attended`: you took classes and left without graduating or transferring.
- **Current students leave it out.** It's not allowed when your `graduationYear` is after the current year.
- It's also not allowed when you have no `graduationYear` (Faculty who never studied at the School), because a Standing describes your time as a student there.
- If you don't want to set it, delete the whole `status:` line.

### `faculty` (optional)

- Add `faculty: true` if you teach or have taught a CS course at the School, or work or worked there in a role that serves CS students (for example, a dean or an advisor). Now or in the past. Adjuncts count; teaching assistants don't.
- The only allowed value is `true`. If you're not Faculty, leave the field out; don't write `faculty: false`.
- The Directory shows a yellow **Faculty & Staff** label next to your name, and searching for "faculty" or "staff" finds you.
- In your PR, link a public School page that shows your role. The Maintainer checks it before merging (see [section 1](#1-who-can-be-a-member)).

### Your screenshot (optional)

A picture of your Site that pops up when someone hovers over your row in the Directory (on a computer; phones don't show it). It's a separate file, not a field in your Member file.

- **Where:** `src/content/screenshots/<your-slug>.webp`, for example `src/content/screenshots/kevin-tran.webp`. The name is your slug, the same as your Member file's.
- **Format:** WebP (`.webp`), PNG (`.png`) or JPEG (`.jpg`), with a lowercase extension. The file must really be that format: renaming a `.png` to `.webp` doesn't convert it.
- **Shape and size:** 16:9, from 1280×720 to 1920×1080 pixels. 1280×720 is best.
- **File size:** at most 500 KB. A 1280×720 WebP is usually under 150 KB; PNGs are bigger, so convert to WebP if yours is too large (for example at [squoosh.app](https://squoosh.app)).
- **One per Member.** If you delete your Member file, delete your screenshot in the same PR.
- **Content:** your own Site, as a visitor sees it. The Maintainer reviews it like the rest of your Submission.

To make one: open your Site in a desktop browser with the window about 1280 pixels wide, take a screenshot of the visible page (no browser bars), then crop it to 16:9 and resize it to 1280×720. In Chrome or Edge, you can open DevTools (F12), turn on the device toolbar (Ctrl+Shift+M), set the size to 1280 × 720, and choose **Capture screenshot** from its **⋮** menu: that gives exactly 1280×720.

To change it later, upload a new file with the same name. To remove it, delete the file. Either way, open a PR as usual.

### No other fields

Only the seven fields above are allowed. Any other field (a typo like `Name:` or `graduation_year:` counts) fails the check with "is not a Member field". Field names are case-sensitive.

### YAML tips

- Put a space after each colon: `name: Kevin Tran`.
- If a value contains `: ` (colon then space) or ` #`, wrap it in double quotes: `tagline: "Student: loves compilers"`.
- Indentation matters in YAML. Keep every line flush to the left.

## 5. What CI checks

When you open or update your PR, CI runs a check called **Submission checks**. You'll see it near the bottom of the PR page: a green tick passed, a red cross failed. Click **Details** next to it to see its summary, which says exactly what to fix.

**Blocking checks.** If any of these fail, the PR can't be merged until you fix it:

- **Your record only.** Your PR changes **exactly one file** in `src/content/members/`, plus, optionally, your screenshot in `src/content/screenshots/`, **and nothing else**. A PR that only adds, replaces or deletes your screenshot is fine too. The Maintainer's own PRs are exempt.
  - **Never rename your file.** A rename counts as deleting one Member file and adding another, which is two files. Your slug stays the same forever once it's merged.
- **Valid file.** The filename is a valid slug, the file is valid YAML, and every field follows [section 4](#4-every-field-and-its-rules).
- **Valid screenshot**, if you added one. It follows [the screenshot rules](#your-screenshot-optional): named after your slug, a real WebP, PNG or JPEG, 16:9 from 1280×720 to 1920×1080, at most 500 KB.
- **Not a profile page.** Your `site` isn't on the list of profile and social services (see [`site`](#site-required)).
- **Not already taken.** Your `site` and `github` aren't already used by another Member.
- **The Directory still builds** with your file in it.

**The checks run from `main`, not from your PR.** Editing anything under `scripts/` or `.github/` won't change the result: a Submission that touches those folders fails with "This PR changes the checks themselves". If you think a check is wrong, [open an issue](https://github.com/jpierre-7/eagle-ring/issues/new) instead.

**Warning only: Site reachability.** CI tries to open your Site once. If it can't, you'll see a warning, not a failure. Some Sites block robots or are slow to wake up, so this can happen even when your Site works fine. The Maintainer checks it by hand and decides.

**"Needs Maintainer approval".** If your PR edits or deletes a record that already exists (adding, replacing or deleting its screenshot counts), and your GitHub account isn't the one in that record's `github` field, the check's summary says the PR needs Maintainer approval. This covers someone editing another person's record, and a Member who renamed their GitHub account. It never fails the check. It means the Maintainer will check with the owner before merging. If you renamed your GitHub account, say so in your PR description.

The first time you open a PR, GitHub may wait for the Maintainer to approve running CI at all. That's a normal GitHub safety step for new contributors.

**Running the check yourself (optional, for git users).** You need Node.js 22.18 or newer. From your clone, commit your file first (the check reads commits, not unsaved changes), then run:

```sh
npm ci
npm run check:submission -- --author <your-github-handle>
```

It compares your commit with `origin/main`. If your fork is behind, sync it first. Add `--no-fetch` to skip opening your Site.

## 6. Adding the Ring Widget

This step is optional, and you can do it any time after your Submission is merged. The Ring Widget is a small block of links for your Site: **Previous**, **Eagle Ring** (the Directory), **Random** and **Next**. It's plain HTML, with no scripts and no files to host.

**Replace every `SLUG` with your slug.** It appears three times in each snippet. For `kevin-tran`, `.../ring/SLUG/prev` becomes `.../ring/kevin-tran/prev`, and `random?from=SLUG` becomes `random?from=kevin-tran`.

Paste it into your Site's HTML where you want it to appear, often the footer.

### Snippet A: default (plain links)

Use this one unless you want the styled version. It has no styling of its own, so it takes on your Site's look.

```html
<nav class="eagle-ring" aria-label="Eagle Ring webring">
  <a href="https://jpierre-7.github.io/eagle-ring/ring/SLUG/prev">&larr; Previous</a>
  <a href="https://jpierre-7.github.io/eagle-ring/">Eagle Ring</a>
  <a href="https://jpierre-7.github.io/eagle-ring/ring/random?from=SLUG">Random</a>
  <a href="https://jpierre-7.github.io/eagle-ring/ring/SLUG/next">Next &rarr;</a>
</nav>
```

### Snippet B: optional styled version

This one keeps your Site's font and text colour, lays the links out in a row, and adds a yellow line on top, yellow underlines and a yellow outline when a link is selected with the keyboard. It also undoes any styles your Site applies to every `nav` or link, so the widget looks the same everywhere.

```html
<style>
.eagle-ring{all:unset;display:flex;flex-wrap:wrap;align-items:baseline;gap:.25rem 1.25rem;margin:2rem 0;padding:.75rem 0 0;border-top:3px solid #facc15;font:inherit;color:inherit}
.eagle-ring a{all:unset;cursor:pointer;color:inherit;text-decoration:underline;text-decoration-color:#facc15;text-decoration-thickness:2px;text-underline-offset:3px}
.eagle-ring a::before,.eagle-ring a::after{content:none}
.eagle-ring a:focus-visible{outline:3px solid #facc15;outline-offset:2px}
.eagle-ring .er-home{font-weight:800}
</style>
<nav class="eagle-ring" aria-label="Eagle Ring webring">
  <a href="https://jpierre-7.github.io/eagle-ring/ring/SLUG/prev">&larr; Previous</a>
  <a class="er-home" href="https://jpierre-7.github.io/eagle-ring/">Eagle Ring</a>
  <a href="https://jpierre-7.github.io/eagle-ring/ring/random?from=SLUG">Random</a>
  <a href="https://jpierre-7.github.io/eagle-ring/ring/SLUG/next">Next &rarr;</a>
</nav>
```

The links work from the moment your Submission is merged. When Members join or leave, your neighbours change on their own. You never need to edit the widget.

## 7. Editing your record or leaving

### Editing

Open a new PR that changes your own file, from the GitHub account named in its `github` field. The steps are the same as joining, but you open your existing file in `src/content/members/` and click the pencil icon instead of creating a new file. (If your fork is old, click **Sync fork** on your fork's page first.)

- You can change any field, including `github` if you renamed your GitHub account. In that case CI flags the PR "needs Maintainer approval", which is expected.
- You can't change your slug (the filename).
- Students: update `graduationYear` if your plans change, and add `status` once your Graduation Year arrives if you want to.

### Leaving

- Open a PR that deletes your file: open it in your fork, click the **...** menu, choose **Delete file**, commit, and open a PR. If you added a screenshot, delete it in the same PR.
- If you don't use git, [open an issue](https://github.com/jpierre-7/eagle-ring/issues/new) asking to be removed instead.
- Take the Ring Widget off your Site. If you forget, its links still work: they send visitors on to the right neighbours.

### When the Maintainer removes a record

The Maintainer only removes a record when the Site has been down for 30 days or more, its content is inappropriate, or the Member isn't eligible. They'll @-mention you on the removal PR.

### Your details and the licence

The Eagle Ring code is under the MIT License, but your Member file isn't. Your file is used only to list you in Eagle Ring, and the [LICENSE](LICENSE) file says so explicitly. If you leave, your file is deleted from the Directory. Like every file in a public repo, older versions stay visible in the git history.

## 8. Contacting the Maintainer

- For questions or problems, [open an issue](https://github.com/jpierre-7/eagle-ring/issues/new) on the repo. An **issue** is a public discussion thread on GitHub.
- To get the Maintainer's attention on a PR or issue, mention [@jpierre-7](https://github.com/jpierre-7) in a comment.
