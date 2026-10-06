# HealthCoverSim demonstration guide

Aim for a 3–5 minute recording. Use fictional customer names, keep the browser text readable, and rehearse the sequence once before recording. Explain what the application does and why the amounts change in your own words.

## Before recording

1. Install dependencies, run `npm run db:init`, and start `npm run dev`.
2. Open <http://127.0.0.1:5173> and check that the API is running.
3. Run `npm test`, `npm run lint`, and `npm run build` in advance. Be ready to show their actual results without claiming unperformed checks.
4. Choose a fictional name such as `Demo Family`. An empty database is easiest for the create flow; optional seeded data is available with `npm run db:seed`.
5. Read `docs/calculation-guide.md` and the implementation. Be able to explain why the loading affects hospital cover only.

## Suggested recording sequence

| Time | Show | Explain |
| --- | --- | --- |
| 0:00–0:25 | Quote list and the new-quote form | React presents the pages, Express handles the API, and SQLite retains saved quote inputs. The application supports create, list, detail, edit, and delete. |
| 0:25–1:15 | Create the assignment's worked example | Customer Demo Family; Family; ages 40 and 35; histories No and Yes; Silver hospital; Standard extras; Yearly payment; 5% discount. Applicant 2 appears for Family. Save to calculate. |
| 1:15–2:05 | Explanation sheet | Applicant 1 has 20% hospital loading; applicant 2 has none. Hospital $352.00, extras $90.00, Family fee $30.00, monthly $472.00, yearly before discount $5,664.00, and yearly after discount $5,380.80. Read or point to the hospital-only loading statement. |
| 2:05–2:40 | Edit the saved quote to Monthly | The discount field disappears. Save; the final amount becomes $472.00 per month. The annual-payment discount no longer applies. Return to the list and reopen the updated quote. |
| 2:40–3:15 | Edit a history to Not sure, then save | The explanation shows the uncertainty warning for that applicant. Hospital loading changes to 0% for that applicant; extras are unchanged. |
| 3:15–3:45 | Demonstrate invalid form input | Set an age to 17 or leave a required selection blank, then attempt to save. Show the validation message and that no final quote is generated from invalid inputs. Restore valid inputs or cancel. |
| 3:45–4:15 | Delete the demonstration quote | The confirmation names the customer. Confirm deletion, return to the quote list, and show that the quote is gone. |
| 4:15–4:45 | Briefly show calculation code and verification results | Identify the shared validation/calculation module, explain hospital-only loading and yearly discount, and show the actual checks you ran. State the simplified assignment model and AI assistance accurately. |

If you need a shorter recording, combine the code explanation with the worked example and show the uncertainty warning briefly. Keep the worked-example calculation and all five CRUD operations visible.

## Values after the edits

Changing the worked example from Yearly to Monthly keeps the monthly premium at **$472.00**. Changing applicant 1's history from No to Not sure then removes their $32.00 monthly loading:

```text
Hospital: $160.00 + $160.00 = $320.00
Extras: $90.00
Family upgrade fee: $30.00
Monthly premium: $440.00
```

The uncertainty warning must name or identify applicant 1. Switching applicant 2 to Not sure would leave the premium unchanged because applicant 2 previously had no loading; it would still add their warning.

## Useful explanation prompts

- Why do Couple and Family need two applicant ages and histories?
- Where do the 20% loading and $32.00 loading amount come from?
- Why do extras remain $90.00 when hospital cover history changes?
- Why is the Family fee charged once, rather than once per applicant?
- What prevents an invalid API request from bypassing browser validation?
- How does SQLite retain a quote after a server restart?
- Why is the monthly premium not reduced by the annual-payment discount?

For persistence rehearsal, save a quote, stop and restart the server with the same database, and reopen it. This can be shown if time permits; the automated API tests also exercise database persistence.

## Submission checks

Check the assignment's submission instructions for the required repository link, source ZIP, video format, and destination. The source ZIP command is in `README.md`. Open the ZIP and confirm it contains source, tests, scripts, the lockfile, and instructions, without `node_modules`, generated databases, or build output.

Recording/uploading the video and publishing a repository are separate student tasks. Review the AI-use statement in `README.md` before submitting, and update it to reflect what you personally reviewed, verified, and changed. Do not claim authorship or checks that you did not perform.
