# CV Tailor Studio UX Spec

## Information Architecture
- Global Header
- Product name: `CV Tailor Studio`
- Tagline: `Turn one CV into three role-targeted variants in minutes.`
- Guided Builder (progressive disclosure)
- Step 1: Add Job Posting
- Step 2: Upload Your CV
- Step 3: Choose Output Style
- Primary CTA: `Generate 3 Tailored CVs ->`
- Results (hidden by default)
- Appears only after generation
- Uses tabbed variant preview (`Classic`, `Modern`, `ATS`) with unified actions

## Key User Flows (Happy Path)
1. User lands on page and reads short guidance under header.
2. User completes Step 1 by dragging a job posting file or using `Paste text` modal.
3. User completes Step 2 by uploading CV file or using `Paste text` modal.
4. User completes Step 3 by selecting preferred visual style tile.
5. User clicks `Generate 3 Tailored CVs ->`.
6. System shows loading state on CTA and reveals Results section when complete.
7. User switches tabs to inspect each variant preview.
8. User takes action per variant: `Download PDF`, `Download Word`, or `Copy`.

## Component Inventory and States
- Button
- Variants: Primary, Secondary
- States: Default, Hover, Disabled, Loading, Success
- Card
- States: Default, Hover (elevated), Selected (accent border)
- Template Tile
- Variants: Selected, Unselected
- States: Default, Hover, Selected
- Tab
- Variants: Active, Inactive
- States: Default, Hover, Active
- Dropzone
- States: Empty, Drag-over, File attached, Error
- Toast
- Variants: Success, Error, Info
- Input Modal (`Paste text`)
- States: Default, Focused, Error, Disabled

## Microcopy
- Header
- Title: `CV Tailor Studio`
- Subtitle: `Upload your CV and a target role. We will generate tailored, truthful variants.`
- Step 1
- Title: `Step 1 - Add Job Posting`
- Helper: `Drop a .txt or .md file, or paste text manually.`
- Buttons: `Upload file`, `Paste text`
- Step 2
- Title: `Step 2 - Upload Your CV`
- Helper: `Use your latest CV. Keep formatting simple for best parsing.`
- Buttons: `Upload CV`, `Paste text`
- Step 3
- Title: `Step 3 - Choose Output Style`
- Tile labels: `Classic`, `Modern`, `ATS-Friendly`
- Helper: `We generate all 3, but this sets your default view.`
- CTA
- Default: `Generate 3 Tailored CVs ->`
- Loading: `Generating tailored variants...`
- Success toast: `Variants generated successfully.`
- Error text: `We could not generate variants. Check inputs and try again.`
- Results
- Section title: `Your Tailored CV Variants`
- Actions: `Download PDF`, `Download Word`, `Copy`

## Accessibility Notes
- Contrast
- Primary text `#0F172A` and secondary text `#475569` on white exceed WCAG AA for body text.
- Focus and keyboard
- Visible focus ring on all interactive elements.
- Logical focus order follows steps 1 -> 2 -> 3 -> CTA -> results tabs -> actions.
- Semantics
- Step cards use heading hierarchy (`h2` per step).
- Tabs expose active state and keyboard navigation.
- Motion
- Keep transitions subtle and under 200ms.
- Avoid content shift during loading by reserving results area space.
- Touch targets
- Minimum 44x44 px on mobile for buttons and tabs.
