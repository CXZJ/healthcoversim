# Understanding a HealthCoverSim quote

HealthCoverSim adds hospital cover, extras cover, and any Family upgrade fee to produce a monthly premium. An annual-payment discount can then reduce the yearly premium. Every amount is in Australian dollars.

## 1. Count the applicants

Single cover has one adult. Couple and Family cover have two adults. Each adult gets the selected hospital and extras levels. Family also adds a flat $30.00 fee per month, once for the whole quote. Dependent children are not individually priced in this assignment.

## 2. Calculate each applicant's hospital cost

The monthly hospital base per adult is $0.00 for None, $90.00 for Basic, $120.00 for Bronze, $160.00 for Silver, and $220.00 for Gold.

For an applicant older than 30 who answers `No` to hospital cover history:

```text
Loading percentage = (age − 30) × 2
Hospital loading amount = hospital base × loading percentage / 100
Applicant hospital cost = hospital base + hospital loading amount
```

The loading is 0% for ages 30 or younger, for `Yes` history, and for `Not sure` history. Selecting None hospital cover gives a zero hospital cost. `Not sure` produces a warning for the relevant applicant because their estimate may change when the history is confirmed.

**Lifetime Health Cover loading applies only to hospital cover. It does not apply to extras cover.**

## 3. Add extras and the Family upgrade fee

The monthly extras base per adult is $0.00 for None, $25.00 for Basic, $45.00 for Standard, and $70.00 for Premium. Multiply the selected extras base by the number of adults. Do not apply LHC loading to this amount.

```text
Monthly premium = total applicant hospital costs
                + extras base × adult count
                + Family upgrade fee, if applicable
```

## 4. Apply payment frequency

```text
Yearly premium before discount = monthly premium × 12
Yearly premium after discount = yearly premium before discount × (1 − discount / 100)
```

An annual-payment discount from 0% to 10% applies only when payment frequency is Yearly. Monthly payment uses the monthly premium without a discount. Keep the monthly premium separate from the yearly total: the monthly figure is not a discounted monthly instalment.

## Worked example

Create a Family quote with these inputs:

| Input | Value |
| --- | --- |
| Applicant 1 | Age 40, hospital cover history No |
| Applicant 2 | Age 35, hospital cover history Yes |
| Hospital cover | Silver |
| Extras cover | Standard |
| Payment frequency | Yearly |
| Annual-payment discount | 5% |

Applicant 1 is ten years older than 30, so their loading is `10 × 2% = 20%`. Silver hospital cover costs `160 × 1.20 = $192.00`. Applicant 2 has Yes history, so their hospital cost is $160.00 with no loading.

| Component | Calculation | Amount |
| --- | --- | ---: |
| Applicant 1 hospital | $160.00 + 20% of $160.00 | $192.00 |
| Applicant 2 hospital | $160.00 + $0.00 loading | $160.00 |
| Hospital total | $192.00 + $160.00 | $352.00 |
| Extras total | $45.00 × 2 | $90.00 |
| Family upgrade fee | Charged once per month | $30.00 |
| Monthly premium | $352.00 + $90.00 + $30.00 | $472.00 |
| Yearly before discount | $472.00 × 12 | $5,664.00 |
| Discount amount | 5% of $5,664.00 | $283.20 |
| Yearly after discount | $5,664.00 − $283.20 | $5,380.80 |

The final payable estimate is **$5,380.80 per year** for this Yearly quote. If payment changes to Monthly, the final estimate is **$472.00 per month**; the annual-payment discount does not apply.

## Cases to explain during review

- **Couple instead of Family:** the adult prices and loadings remain the same; the $30.00 monthly fee disappears.
- **Applicant 1 history changes to Yes:** their $32.00 monthly hospital loading disappears. Extras stay unchanged.
- **Applicant 1 history changes to Not sure:** the simulator also uses 0% loading, but adds an uncertainty warning for that applicant.
- **None hospital with Standard extras:** hospital cost and hospital loading amount are zero; the selected extras are still charged per adult.
- **Both cover levels are None:** hospital and extras are zero. Single and Couple cost $0.00; Family still has its $30.00 monthly fee.
- **Age 100 with No history:** the assignment formula produces `(100 − 30) × 2% = 140%` loading. The simulator does not add a real-world cap.

Applicants must be integer ages from 18 to 100. Couple and Family require both applicants' ages and histories. The simulator rejects missing selections, out-of-range ages, and invalid discounts before saving.

## Where the logic lives

`shared/quote.js` contains validation and the quote calculation. The browser and API use the same rules, and the API validates requests even if someone bypasses the form. SQLite stores the inputs; reading a saved quote recalculates the result and explanation sheet.

When explaining the code, follow one input through validation, applicant hospital loading, total monthly premium, annual-payment discount, and the displayed explanation. Read the implementation before presenting so you can connect each step to the actual functions.
