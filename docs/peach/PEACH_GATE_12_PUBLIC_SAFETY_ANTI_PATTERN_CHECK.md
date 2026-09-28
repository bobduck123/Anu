# PEACH Gate 12 Public Safety Anti-Pattern Check

Date: 2026-07-31

## PEACH implementation scan

Command:

`rg -n "paymentTaken:\s*true|payment_taken\s*=\s*True|publicContributionDisplay:\s*true|public_display\s*=\s*True|reviewStatus\W*published|cart|storefront|bookstore|product grid|checkout|public contribution feed|social feed|fake payment" flora-fauna\backend\app\api\peach.py flora-fauna\backend\tests\test_peach_gate9.py flora-fauna\backend\tests\test_peach_gate10.py frontend-next\src\data\peach frontend-next\src\lib\peach frontend-next\src\lib\api\peach.ts frontend-next\src\components\peach "frontend-next\src\app\(app)\peach" "frontend-next\src\app\(control)\control\peach" frontend-next\src\app\api\peach`

## Hits

- `flora-fauna/backend/tests/test_peach_gate9.py:216` posts `reviewStatus: "published"` to prove public review status is rejected.
- `frontend-next/src/components/peach/PeachFieldView.tsx:6` lists `Real payments or checkout` as a held surface.
- `frontend-next/src/components/peach/PeachSupportIntentForm.tsx:56` states that support intent records manual follow-up only, no payment, no checkout, no cart, and no product grid.

## Result

No PEACH implementation introduced:

- public contribution display;
- public contribution feed;
- public participant body exposure;
- cart;
- checkout;
- storefront;
- bookstore;
- product grid;
- fake payment;
- real payment;
- social feed;
- youth collection;
- sensitive-material collection;
- public Commons release;
- public Yield release.

## Broad repo note

A broad repo scan finds checkout/cart/payment code in unrelated ANU verticals such as memberships, marketplace, and Dumb Dumb. Those are not PEACH-owned files and are not part of the PEACH Gate 12 surface.
