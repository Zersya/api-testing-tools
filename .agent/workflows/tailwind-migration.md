---
description: CSS to TailwindCSS Migration Workflow
---

# CSS to TailwindCSS Migration

This workflow tracked the phased migration of existing CSS to TailwindCSS utility classes.

## Phase Overview

| Phase | Description | Status | Files |
|-------|-------------|--------|-------|
| 1 | Foundation Setup | ✅ Complete | tailwind.config.js, main.css |
| 2 | Small Components | ✅ Complete | MethodBadge.vue, Modal.vue, AppHeader.vue |
| 3 | Sidebar Component | ✅ Complete | AppSidebar.vue |
| 4 | Auth & Layouts | ✅ Complete | login.vue, layouts/*.vue |
| 5 | Admin CRUD Pages | ✅ Complete | admin/create.vue, admin/[id].vue |
| 6 | Admin Dashboard | ✅ Complete | admin/index.vue |

---

## Migration Summary

### Total CSS Lines Removed: ~2000+ lines

### Files Modified:

1. **tailwind.config.js** (NEW)
   - Custom colors matching design tokens
   - Custom fonts, spacing, shadows, animations
   - Method colors for HTTP verbs

2. **app/assets/css/main.css** (REFACTORED)
   - Added Tailwind directives
   - Organized with @layer (base, components, utilities)
   - Kept CSS custom properties for backward compatibility
   - Reusable component classes with @apply

3. **app/components/MethodBadge.vue** (~55 lines CSS → 0)
   - Fully migrated to Tailwind utility classes
   - Uses computed classes for size/method variants

4. **app/components/Modal.vue** (~95 lines CSS → ~25)
   - Migrated to Tailwind classes
   - Kept only Vue transition animation CSS

5. **app/components/AppHeader.vue** (~70 lines CSS → 0)
   - Fully migrated to Tailwind utility classes

6. **app/components/AppSidebar.vue** (~285 lines CSS → ~20)
   - Migrated to Tailwind classes
   - Kept only Vue transition animation CSS

7. **app/layouts/default.vue** (~5 lines CSS → 0)
   - Fully migrated to Tailwind utility classes

8. **app/layouts/empty.vue** (~5 lines CSS → 0)
   - Fully migrated to Tailwind utility classes

9. **app/pages/login.vue** (~195 lines CSS → 0)
   - Fully migrated to Tailwind utility classes
   - Includes gradients, shadows, hover states

10. **app/pages/admin/create.vue** (~360 lines CSS → 0)
    - Fully migrated to Tailwind utility classes

11. **app/pages/admin/[id].vue** (~355 lines CSS → 0)
    - Fully migrated to Tailwind utility classes

12. **app/pages/admin/index.vue** (~580 lines CSS → 0)
    - Fully migrated to Tailwind utility classes
    - Largest and most complex file

---

## Verification Steps

Run the following to verify the migration:

```bash
// turbo
npm run dev
```

### Visual Verification Checklist:
- [ ] Login page renders correctly with gradient button and decorative circles
- [ ] Admin sidebar shows collections and mocks with proper colors
- [ ] Method badges display correct colors (GET=green, POST=yellow, etc.)
- [ ] Modals open/close with smooth animations
- [ ] Mock detail view shows info cards, response preview, code snippets
- [ ] Try It panel sends requests and displays responses
- [ ] Forms in settings and collection modals work properly
- [ ] Toggle switches animate correctly
- [ ] Hover states work on buttons and tree items

---

## Tailwind Class Reference

### Custom Colors Used:
| Color Name | Hex | Usage |
|------------|-----|-------|
| `bg-primary` | #1C1C1C | Main background |
| `bg-secondary` | #252526 | Card backgrounds |
| `bg-tertiary` | #2D2D2D | Input backgrounds |
| `text-primary` | #E0E0E0 | Main text |
| `text-secondary` | #9E9E9E | Secondary text |
| `text-muted` | #6E6E6E | Muted text |
| `accent-orange` | #FF6C37 | Primary accent |
| `accent-blue` | #007AFF | Buttons, links |
| `accent-green` | #73BF69 | Success, GET |
| `accent-red` | #EF5350 | Danger, DELETE |
| `method-get` | #73BF69 | GET badge |
| `method-post` | #FFCA28 | POST badge |
| `method-put` | #64B5F6 | PUT badge |
| `method-delete` | #EF5350 | DELETE badge |
| `method-patch` | #AB47BC | PATCH badge |

### Common Patterns:
```html
<!-- Button primary -->
<button class="btn btn-primary">Click</button>

<!-- Method badge -->
<MethodBadge :method="mock.method" size="sm" />

<!-- Card -->
<div class="bg-bg-secondary border border-border-default rounded-lg p-4">

<!-- Form input -->
<input class="w-full py-2.5 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm focus:outline-none focus:border-accent-blue" />

<!-- Toggle button -->
<button :class="[
  'relative w-11 h-6 border-none rounded-xl cursor-pointer transition-colors duration-normal',
  isActive ? 'bg-accent-green' : 'bg-bg-hover'
]">
  <span :class="[
    'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-normal',
    isActive ? 'translate-x-5' : 'translate-x-0'
  ]"></span>
</button>
```

---

## Notes

1. **CSS Custom Properties Preserved**: The `:root` CSS variables are kept in main.css for any edge cases
2. **Vue Transitions**: Some scoped CSS kept for Vue transition animations (expand, modal)
3. **Arbitrary Values**: Used `[value]` syntax for custom values (e.g., `w-[34px]`)
4. **Responsive Design**: Used `xl:` prefix for responsive grid layouts
