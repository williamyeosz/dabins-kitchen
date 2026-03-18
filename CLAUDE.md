# Dabin's Kitchen

A personal cooking recipe web app for Dabin and William's household.

## Stack
- **Frontend**: React 19 + Vite 8 + Tailwind CSS v4
- **Database**: Supabase (PostgreSQL + Row Level Security, no auth — public read/write)
- **AI**: Anthropic Claude API via direct browser fetch (ingredient substitution, fridge matching, meal suggestions, recipe text import)
- **Nutrition**: USDA FoodData Central API
- **Hosting**: Vercel (auto-deploys on push to master)
- **Repo**: https://github.com/williamyeosz/dabins-kitchen

## Folder Structure
```
src/
  lib/
    supabase.js    — Supabase client + all DB query functions
    units.js       — Unit conversion (metric/imperial/catty/temperatures)
    nutrition.js   — Per-ingredient and per-recipe nutrition calculations
    mealPlan.js    — Week navigation, shopping list aggregation
    ai.js          — All Claude API calls (parseRecipeText, suggestRecipesFromFridge, suggestSubstitutions, suggestMealForSlot)
  components/
    Layout.jsx         — App shell with nav header (mobile hamburger + desktop)
    RecipeCard.jsx     — Card for recipe grid (image/gradient, badges, rating)
    IngredientList.jsx — Dual-unit ingredient display with scaling + ratio-based scaling
    ServingScaler.jsx  — +/- buttons for serving size
    UnitToggle.jsx     — Metric/Imperial toggle button
    NutritionPanel.jsx — Per-serving nutrition grid with USDA attribution
    RatingWidget.jsx   — 1-5 star "mark as cooked" widget
    NotesList.jsx      — Kitchen notes with label badges (preference/equipment/maid/general)
    TagFilter.jsx      — Filter panel with tag chips and sort dropdown
    StepViewer.jsx     — Numbered step list with temperature conversion + inline ingredient quantities
    CookingMode.jsx    — Full-screen step-by-step cooking mode with Wake Lock, timers, skip optional
    SubstitutionModal.jsx — AI ingredient substitution modal
    AIRecipeCard.jsx   — Card for AI-suggested recipes with "Add to Book" button
  pages/
    HomePage.jsx          — Recipe grid with search, filters, sorting
    RecipeDetailPage.jsx  — Full recipe view with scaler, nutrition, cooking mode, language toggle, cooking method tabs
    RecipeFormPage.jsx    — Add/edit recipe form with AI import, ingredient-step cross-check, autocomplete, cooking methods, optional steps
    MealPlannerPage.jsx   — Weekly calendar meal planner with AI suggestions
    ShoppingListPage.jsx  — Aggregated shopping list from meal plan
    FridgeMatcherPage.jsx — Fridge inventory + recipe matching (book + AI)
  hooks/
    useAuth.js           — Stub (always returns isAuthenticated: true, auth removed)
    useUnitPreference.js — localStorage-backed metric/imperial preference
supabase/
  migrations/            — 7 SQL files (schema, meal planning, v2 scaffold, RLS, seed data, cooking methods, optional steps)
```

## Environment Variables
All prefixed with `VITE_` (exposed to browser — this is a private household app):
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key
- `VITE_ANTHROPIC_API_KEY` — Claude API key for AI features
- `VITE_USDA_API_KEY` — USDA FoodData Central API key

These are set in `.env` locally and in Vercel dashboard for production.

## Running Locally
```bash
npm install
npm run dev
```

## Deploying
Push to `master` — Vercel auto-builds and deploys. The `.npmrc` sets `legacy-peer-deps=true` to handle the Vite 8 / Tailwind v4 peer dependency conflict.

## Database
- **Supabase project**: https://ijbellfqwanbhrpgzalr.supabase.co
- Migration files in `supabase/migrations/` — apply via Supabase SQL editor
- RLS is enabled but all policies allow public access (no auth required)
- Seed data: 3 recipes (Doenjang Jjigae, Cantonese Steamed Fish, Garlic Butter Chicken Rice)

## Key Patterns
- All Supabase queries go through `src/lib/supabase.js` — no raw `supabase.from()` in components
- All unit conversion in `src/lib/units.js` — components import `displayDual`, `scaleQuantity`, etc.
- All AI calls through `src/lib/ai.js` — single module with `callClaude()` helper
- Nutrition calculated client-side: `(canonical_quantity_in_g / 100) × per_100g`, summed, divided by servings
- Ingredients store both original unit/qty AND canonical SI (g/ml) for consistent math
- The Supabase select queries use `.order('field', { referencedTable: 'table' })` for related table ordering (not inline `order()` syntax — that breaks)
- Use `onMouseDown` instead of `onClick` for buttons on mobile to avoid overlay/tap issues
- Use `genId()` fallback instead of `crypto.randomUUID()` (breaks on mobile non-HTTPS)
- Meal planner pages exist but nav links are commented out (feature hidden, code preserved)

## Known Issues / Notes
- Build produces a 500kB+ JS bundle warning — normal for a full SPA, not a problem
- AI features require a valid `VITE_ANTHROPIC_API_KEY` — they gracefully show errors if missing
- The `useAuth` hook is a stub returning `isAuthenticated: true` always — auth was removed by request
