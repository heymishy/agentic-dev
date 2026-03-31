# UI Standards

<!-- Fill in your frontend component and accessibility rules. Examples below — replace with your own. -->

## Component library

[e.g. Use components from the design system package (@your-org/design-system). Do not build raw HTML equivalents of existing components.]

## Accessibility

[e.g. WCAG 2.1 AA minimum. All interactive elements keyboard-navigable. All images have alt text. Forms have visible labels (not just placeholders). Colour is never the only signal.]

## Responsive design

[e.g. Mobile-first. Breakpoints: sm 640px, md 768px, lg 1024px, xl 1280px. No fixed-width layouts below 1024px.]

## Forms

[e.g. Use controlled components. Validate on blur and on submit. Show inline error messages adjacent to the failing field. Disable submit during async operations.]

## State management

[e.g. Server state via React Query / SWR. Client UI state via Zustand / useState. No Redux unless pre-existing.]

## Performance

[e.g. No layout shifts on load (CLS < 0.1). Images use lazy loading. Bundle split at route level. No blocking scripts in head.]

## Prohibited patterns

- No inline styles (use design tokens / utility classes)
- No direct DOM manipulation (use framework refs/state)
- No hardcoded colours or spacing values outside the design token set
