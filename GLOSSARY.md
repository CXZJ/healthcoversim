# HealthCoverSim

A learning simulator for private health insurance quotes. Estimates explain the separate costs of hospital and extras cover; they are not financial advice.

## Language

**Quote**:
A saved set of customer and cover inputs with an estimated premium and its explanation. It is not an insurance policy or a purchase.
_Avoid_: Policy, order

**Customer**:
The named person associated with a quote. The customer name does not imply a login account.
_Avoid_: Account, user account

**Applicant**:
An adult whose age and hospital cover history are used in the estimate. Single cover has one applicant; Couple and Family cover have two.

**Cover type**:
Single, Couple, or Family coverage. Family cover includes dependent children without individually pricing them.

**Hospital cover**:
Cover for treatment as an admitted hospital patient, with None, Basic, Bronze, Silver, and Gold levels.

**Extras cover**:
Cover for everyday services such as dental, optical, and physiotherapy, with None, Basic, Standard, and Premium levels.

**Hospital cover history**:
An applicant's answer of Yes, No, or Not sure about prior hospital cover. Not sure means loading is not applied and the estimate carries an uncertainty warning.

**Lifetime Health Cover loading (LHC loading)**:
An applicant-specific surcharge on hospital cover only. In this simulator, an applicant over 30 with no prior hospital cover has a loading of two percentage points per year above 30.

**Family upgrade fee**:
A flat $30 monthly addition for Family cover, charged once per quote.

**Monthly premium**:
The estimated monthly cost of hospital cover, extras cover, and any Family upgrade fee, before any annual-payment discount.

**Yearly premium before discount**:
Twelve times the monthly premium.

**Annual-payment discount**:
A percentage between 0% and 10% that reduces the yearly premium only when payment frequency is Yearly.

**Yearly premium after discount**:
The yearly premium before discount reduced by the annual-payment discount for Yearly payment.

**Explanation sheet**:
A plain-English breakdown of the premium, each applicant's loading, any Family upgrade fee, applicable discount, and warnings.
