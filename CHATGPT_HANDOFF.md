# ChatGPT handoff for ycxukun/jiangsu-plan

Latest local commit discussed: `96907c0 Add editable saved volunteer forms`.

## Files to inspect

- `.github/workflows/pages.yml`
- `app.js`
- `index.html`
- `specialty/app.js`
- `specialty/index.html`
- `students/app.js`
- `students/index.html`

## What changed

1. `students/index.html` / `students/app.js`
   - Saved volunteer forms in the student archive now show actions.
   - Clicking the form title or `修改` loads that saved form into the correct student draft and redirects to the undergraduate or specialty planner.
   - Clicking `删除` confirms and deletes the `volunteer_forms` row. Child rows are expected to be removed by database cascade.

2. `app.js` / `specialty/app.js`
   - Opening a saved form from the student archive writes a one-time edit marker to localStorage.
   - The main planner consumes that marker.
   - The next save updates the original `volunteer_forms` row and replaces its group/major detail rows instead of creating a duplicate saved form.

3. `.github/workflows/pages.yml`
   - GitHub Pages build now runs:
     - `node --check app.js`
     - `node --check students/app.js`
     - `node --check specialty/app.js`

4. `index.html`, `specialty/index.html`, `students/index.html`
   - Script cache keys were bumped so deployed pages load the updated JS.

## Verified locally

The following checks passed locally:

```sh
node --check app.js
node --check students/app.js
node --check specialty/app.js
```

A local simulation of the GitHub Pages static packaging also passed.

## GitHub Pages deployment note

Earlier GitHub Actions failures were at the `deploy` job, not the `build` job.

The deploy log showed:

```text
Found 1 artifact(s)
Created deployment for 8b80fe2...
Current status: syncing_files
Deployment failed, try again later.
```

That means the static artifact was built and uploaded. The failure is likely GitHub Pages deployment service/config related, not JavaScript syntax. Check that repository Pages Source is set to `GitHub Actions`, then rerun the failed deploy or push a new commit to trigger the workflow again.

## Prompt for ChatGPT web

Use this prompt with the zip:

```text
I am continuing work on the GitHub Pages static project ycxukun/jiangsu-plan. Please inspect the attached files and help me verify the saved volunteer form editing flow and GitHub Pages deployment workflow.

Important behavior:
1. In students/index.html, saved volunteer forms must be clickable for editing and also deletable.
2. Clicking edit should load the exact saved volunteer form into the correct undergraduate or specialty planner.
3. Saving after opening an old form should update that original form, not create a duplicate.
4. Deleting should remove the volunteer_forms record; child group/major records are expected to cascade.
5. The Pages workflow should validate app.js, students/app.js, and specialty/app.js before deploying.

Please review for bugs, missing cache bumps, localStorage key mismatches between undergraduate and specialty, Supabase REST mistakes, and deployment workflow issues.
```
