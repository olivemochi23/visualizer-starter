# Slide Preview Pattern

Use this pattern when creating a slide-style HTML output in `visualizer`.

## Structural Contract

Keep these top-level pieces:

- `main` or direct document body with repeated slide sections
- `.slide-preview-rail`
- `.slide-preview-edge`
- `.slide-preview-panel`
- `.slide-preview-head`
- `.slide-preview-list`
- `.slide-preview-card`
- `.slide-preview-dots`
- `.slide-preview-dot`

Each slide should have:

- a stable `id`
- the `.slide` class
- `data-slide-title`
- optional `data-slide-kicker`
- optional `data-slide-summary`

## Behavior Contract

- Build the preview list from the actual slide elements in DOM order.
- Use `IntersectionObserver` to track the active slide.
- Scroll to the clicked slide with `scrollIntoView({ behavior: 'smooth', block: 'start' })`.
- Open the rail on desktop hover and focus.
- Hide the panel on mobile and keep compact dots.
- Capture wheel input on the preview panel and apply it to the preview list scroll position.

## Layout Guardrails

- Treat each `.slide` as the actual slide canvas. Do not add a nested 16:9 stage such as `.stage` or `.slide-inner` inside it.
- Let the panel clip its own contents, but give the preview list left padding so hover lift is still visible.
- Make the panel grid `auto minmax(0, 1fr)` so the header stays fixed and the list becomes the scroll area.
- Set `overscroll-behavior: contain` on both the panel and the list.
- Set `min-height: 0` on the list so internal overflow actually works.
- Screen-only responsive breakpoints should be written as `@media screen and (...)` so print/PDF export does not accidentally switch to the mobile stacked layout.

## Source Reference

Use `.agents/skills/visualizer-slide-site/assets/slide-site-template.html` as the behavioral reference, not as a fixed visual template.
