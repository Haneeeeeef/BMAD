# Code Review Checklist

Run this review periodically to maintain code quality. Each category scores 0-100, then averaged for total.

---

## 1. Performance

- [ ] No unnecessary re-renders (React.memo on list items)
- [ ] No inline object/function definitions in JSX
- [ ] Images optimized (next/image, proper sizing)
- [ ] Lazy loading for heavy components
- [ ] No blocking operations in render path
- [ ] Bundle size reasonable (check with `npm run build`)

**Score: __ /100**

---

## 2. Reusability

- [ ] All UI components in `@/components` (not inline)
- [ ] No inline styles (use Tailwind classes)
- [ ] Components have clear, typed props interfaces
- [ ] Barrel exports in `@/components/index.ts`
- [ ] Shared logic extracted to hooks/utils
- [ ] Components follow single responsibility principle

**Score: __ /100**

---

## 3. Security

- [ ] No `dangerouslySetInnerHTML` (or properly sanitized)
- [ ] No secrets/API keys in code (use env vars)
- [ ] User input sanitized before display
- [ ] No SQL/NoSQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] External links have `rel="noopener noreferrer"`

**Score: __ /100**

---

## 4. Accessibility

- [ ] All icon-only buttons have `aria-label`
- [ ] Semantic HTML elements used (`button`, `nav`, `main`, etc.)
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Focus states visible
- [ ] Color contrast meets WCAG AA
- [ ] Form inputs have labels

**Score: __ /100**

---

## 5. Code Quality

- [ ] TypeScript strict mode, no `any` types
- [ ] No `console.log` in production code
- [ ] No commented-out code blocks
- [ ] Consistent naming conventions (camelCase, PascalCase)
- [ ] No unused imports/variables
- [ ] Error boundaries for critical sections
- [ ] Proper loading/error states

**Score: __ /100**

---

## Total: __ /100

*(Average of all 5 categories)*

---

## Quick Commands

```bash
# Check for console.logs
grep -r "console.log" src/ --include="*.tsx" --include="*.ts"

# Check for 'any' types
grep -r ": any" src/ --include="*.tsx" --include="*.ts"

# Check for dangerouslySetInnerHTML
grep -r "dangerouslySetInnerHTML" src/ --include="*.tsx"

# Check for missing aria-labels on icon buttons
grep -r "className=.*button" src/ --include="*.tsx" | grep -v "aria-label"

# Build to check bundle size
npm run build
```

---

## Review History

| Date | Perf | Reuse | Security | A11y | Quality | Total |
|------|------|-------|----------|------|---------|-------|
| ___ | __ | __ | __ | __ | __ | __/100 |
