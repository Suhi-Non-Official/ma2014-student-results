# MA2014 student results

A mobile-friendly student grading portal for Semester 3, Intake 2024. Students enter an index number to see their name, email, quiz totals, question totals and the scheme's assessed subparts. Quiz 1 directs students to their marked answer script. Deduction reasons and submission filenames are excluded.

## Preview

Run `python -m http.server 8000 --directory site` from this folder and open http://localhost:8000. Do not open `index.html` directly: lookup uses browser encryption and fetch APIs, which require HTTPS or localhost.

## Publish a new GitHub repository

1. Create a new repository named `ma2014-student-results` under your account. Keep the source Grades and Marking Schemes folders on your computer.
2. Upload the contents of this project **except** `Grades`, `Marking Schemes`, `.local` and `node_modules`. The included `.gitignore` protects these folders when using Git; browser uploads do not enforce `.gitignore`.
3. Include the hidden `.github/workflows/pages.yml` folder/file. Commit to the `main` branch.
4. In the repository, open **Settings → Pages → Build and deployment → Source → GitHub Actions**.
5. Open **Actions → Publish student results → Run workflow** if deployment has not started. The completed run displays the website link.

The workflow publishes only `site/`. It does not publish the Excel files, marking schemes or local reports.

Official guidance: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Update marks later

1. Replace the relevant workbooks in the local `Grades/` folder, retaining their current names and column layouts.
2. Install Python dependencies with `python -m pip install -r requirements.txt` if needed.
3. Run `python tools/build_data.py` from this folder. Review `.local/data-report.json` for unmatched indices and unidentified submissions. Total conflicts stop the build.
4. Preview and check the affected student. Commit and push the updated `site/records/` and `site/metadata.json` files.

Workbook formulas are not evaluated by the import script. Detailed totals are calculated from the supplied numerical component marks. The overall roster's quiz cells must contain numeric marks. Quizzes with no recorded mark are labelled Absent, as requested. They contribute no marks to the CA total, which is the sum of all five quiz marks out of 100. A recorded zero remains a marked result, not an absence.

## Index-only access

This is the index-only lookup requested for this project; it is **not student authentication**. Anyone who knows or guesses a valid index can view that student's name, email and grades. Do not describe it as a private student account. Names and emails are rendered only after lookup and are not stored in URLs, browser local storage or analytics. The project uses no third-party scripts or fonts.

Each record has a hashed lookup key and is encrypted with an index-derived AES-GCM key. The records are grouped into 16 small files for easy hosting. This avoids publishing a directly readable bulk roster, but does not prevent guessing indices or stop someone who knows an index. A private GitHub repository alone does not make a publicly served Pages website private. Search engine exclusion is a request, not access control.

Unknown indices get a neutral no-record message. Existing roster students with no marks see Absent for each quiz and a CA total of 0/100. Recorded indices absent from the roster show their marks with name and email unavailable. Unidentified submissions cannot be matched to students and are not exposed through lookup. No uncertain identity is automatically reassigned.

## Files

- `site/`: the complete website and per-student lookup records, ready for GitHub Pages.
- `tools/build_data.py`: local data importer and validation.
- `.github/workflows/pages.yml`: deployment of `site/` only.
- `.local/data-report.json`: local-only reconciliation notes.

Tested views should include a full record, partial marks, absent quizzes, an unknown index, lowercase input and a narrow mobile viewport.
