# TODO - Organize CSS per page

## Completed
- [x] Add missing import so Auth/Login page actually uses `src/pages/AuthForm.css`
  - File: `src/pages/AuthForm.tsx`

## Next
- [ ] Create per-page CSS files and move page-specific selectors out of `src/App.css`.
  - Candidate/ballot-related selectors likely belong in `src/pages/BallotPage.css` (or shared candidate CSS if used across multiple pages).
  - Profile-related selectors likely belong in `src/pages/StudentProfile.css` and/or `src/pages/CandidateProfile.css`.
  - Photo modal selectors likely belong in a shared component CSS (if PhotoViewerModal uses it) or the page(s) that trigger it.
- [ ] Ensure each page TSX imports its own page CSS (no reliance on global `src/App.css` for page-specific selectors).
- [ ] Run `npm run build` after each move set to confirm no regression.

