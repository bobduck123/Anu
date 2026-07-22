# Studio V3 M1 screenshot index

Status: PASS - all 18 required scenarios captured, decoded, independently hashed, sanitized, and visually inspected
Directory: `screenshots/`

| # | Scenario | File | Dimensions | SHA-256 | Status |
|---:|---|---|---:|---|---|
| 1 | Selected text/copy Piece editing | `01-text-piece-editing.png` | 1280x784 | `6356e58d8356bcd077bb81abd5fd79eff903e5255815b89e53b709c9ff931a68` | PASS |
| 2 | Changed copy visible on canvas | `02-copy-change-on-canvas.png` | 1280x784 | `e13c30ce579d76e82fb361e87053e777e19473609b02bb2dd811635349110b34` | PASS |
| 3 | Selected image/media Piece editing | `03-image-piece-editing.png` | 1280x784 | `0cf20ece348fc7de029255c63bd80a08e41c43d0a9b924ed943f5d2a086528ef` | PASS |
| 4 | Changed image/media visible | `04-media-change-or-upload-disabled.png` | 1280x784 | `53996bae2ce6351863f0c1722d408286437ca62c67849a0f7e2b993e7f6d91ea` | PASS |
| 5 | Direct manipulation/reorder state | `05-direct-manipulation-reorder.png` | 1280x784 | `1cddbcd3377a6a1725d8f9f60e3fdd6ff30aaaffafd259e3aa3c2484dd9ed5a0` | PASS |
| 6 | Visual Look cards | `06-visual-look-cards.png` | 1280x5016 | `8c9d5b37de4b7753620c6fbdb4a904c6504cdb1c05c8cb8a5721cb7831d3297b` | PASS |
| 7 | Visual Room Style cards | `07-visual-room-style-cards.png` | 1280x4287 | `01315d56a5727b5cf46567387503fef8b49f4c31a81304af349544eac0542a49` | PASS |
| 8 | Treatment/background/motion controls | `08-visual-treatment-background-motion.png` | 1280x5072 | `89000ddcf18e1a9524fc7d8e49c2cb4c938ae9d92b51891c70170e744f0131b3` | PASS |
| 9 | Piece Library showing BBB Pieces | `09-piece-library-bbb-pieces.png` | 1280x784 | `18b8ee6cbbcf99ffb6e11ac6e6377dc10667bb6b5fdb47d5efaca6cf21b29299` | PASS |
| 10 | BBB canonical Collections | `10-collections-bbb-collections.png` | 1280x784 | `8191080a3a761db011d5f8d6efa6f6a254f98e9f7a43265c2d718b162849d5fd` | PASS |
| 11 | Upload/create Work state | `11-upload-create-work-state.png` | 1280x784 | `fd79bcb93e2263bb1dfecf22356f304a866384038ac560a59feca436ac2ac0db` | PASS |
| 12 | Private-state save success | `12-private-save-success.png` | 1280x784 | `226b966f16715f94157d044c9ab604e0d7cdb0a0f4ab2849d96c031f74d344de` | PASS |
| 13 | Private-state conflict example | `13-private-save-failure-or-conflict.png` | 1280x5016 | `b3956c1d8c7d69bd888183a92d8036fe34c6363e30a0c9025a1f509f69b37748` | PASS |
| 14 | Mobile bottom bar | `14-mobile-bottom-bar.png` | 390x844 | `e8a8ce61cc7697f81d3d7cea52cb3bfb31065a1e070d7895b38f019061c1e8d9` | PASS |
| 15 | Mobile edit flow | `15-mobile-edit-flow.png` | 390x1219 | `b1c88fd2317ea7a6001ef573fbc37fd6daa12b5632c6a8d56798341492140287` | PASS |
| 16 | Test as visitor after edits | `16-test-as-visitor-after-edits.png` | 1280x720 | `b7ffb22d8637c783e2e87f9f51fc1ad2d7378d49536cd822efcd32b61ad2747a` | PASS |
| 17 | Public `/p/bbbvision` unchanged | `17-public-p-bbbvision-unchanged.png` | 1280x720 | `7ce2744474a6efbc5db46853438f05200142638c2b9ebe81dcd5dd72ed007518` | PASS |
| 18 | Public `/presence/bbbvision` unchanged | `18-public-presence-bbbvision-unchanged.png` | 1280x720 | `7ce2744474a6efbc5db46853438f05200142638c2b9ebe81dcd5dd72ed007518` | PASS |

All 18 files decode through `System.Drawing.Image::FromFile`, produce 17 unique SHA-256 values, contain no PNG text/EXIF chunks, and passed visual/sanitization inspection. Screenshot 11 is settled without a transient rendering indicator. Screenshot 14 uses the 390x844 viewport and visibly shows the contextual action bar anchored to the bottom edge.

No capture shows secrets, bearer tokens, cookies, request headers, raw auth, private payloads, hosted database values, private routes, developer tools, private-client material, or local filesystem details. Screenshots 17 and 18 were hashed independently and are byte-identical because both public route aliases render the same unchanged canonical BBB entry state; route-specific browser assertions plus normalized DOM/payload comparisons establish invariance.
