# Architectural Decisions

This document captures the key architectural and design decisions for Dabin's Kitchen, along with the reasoning behind each choice.

---

## Tech Stack Choices

### React 19 + Vite + Tailwind CSS v4

- **React 19** was chosen for its mature ecosystem, excellent developer tooling, and the new features in v19 (improved Suspense, use() hook, Actions). Since this is a household app with relatively simple routing needs, React's component model keeps things straightforward without the overhead of a full framework like Next.js.
- **Vite** provides near-instant dev server startup and fast HMR. It requires minimal configuration compared to Webpack and has first-class support for React and modern ESM workflows.
- **Tailwind CSS v4** was selected for rapid UI development. The v4 release introduces a Vite plugin (`@tailwindcss/vite`) that eliminates the need for a separate `tailwind.config.js` and PostCSS setup, simplifying the build pipeline. Utility-first CSS keeps styling co-located with components and avoids CSS naming conflicts.

### Supabase (PostgreSQL + Auth + Row Level Security)

- **Supabase** provides a hosted PostgreSQL database, built-in authentication, and Row Level Security (RLS) out of the box. This eliminates the need to build and maintain a custom backend server.
- PostgreSQL was preferred over NoSQL alternatives because recipe data is inherently relational (recipes have ingredients, ingredients have units, recipes belong to categories, meal plans reference recipes, etc.).
- The JavaScript client library (`@supabase/supabase-js`) integrates cleanly with React and supports real-time subscriptions if needed later.

### Anthropic Claude API for AI Features

- Claude was chosen for its strong instruction-following and nuanced language understanding, which is important for tasks like ingredient substitution suggestions (where culinary context matters) and fridge-matching (understanding what ingredients can reasonably replace others).
- A single `ai.js` service module centralizes all AI interactions, making it easy to swap models or adjust prompts without touching UI components.

### USDA FoodData Central API for Nutrition

- The USDA FoodData Central API is free, well-documented, and provides comprehensive nutritional data for common ingredients. It avoids licensing costs associated with commercial nutrition APIs.
- Nutrition data is cached locally after first lookup to minimize API calls and improve response times.

---

## Database Design Decisions

### Canonical Units for Ingredients

- All ingredient quantities are stored in **SI canonical units** (grams for mass, milliliters for volume). This ensures consistent arithmetic for scaling recipes, summing nutrition data, and comparing quantities across recipes.
- The original user-entered unit and quantity are also stored so the recipe can be displayed in the format the user intended (e.g., "2 cups" rather than "473.18 mL").

### JSONB for Multilingual Notes

- Recipe notes, tips, and certain descriptive fields use PostgreSQL's **JSONB** type to store content in multiple languages (primarily English and Korean for this household).
- JSONB was chosen over separate columns per language because it is flexible — new languages can be added without schema migrations — and PostgreSQL has excellent JSONB query and indexing support.
- Example structure: `{"en": "Let the dough rest for 30 minutes", "ko": "반죽을 30분 동안 휴지시키세요"}`

### UUIDs as Primary Keys

- All tables use UUIDs (`gen_random_uuid()`) as primary keys rather than auto-incrementing integers. This avoids exposing sequential IDs in URLs and simplifies potential future data merging or migration scenarios.

---

## Unit Conversion Approach

### Dual Display with SI Canonical Storage

- **Storage**: All quantities are persisted in SI canonical form (grams / milliliters) for reliable computation.
- **Display**: The UI shows quantities in the user's preferred unit system. A toggle allows switching between US customary (cups, tablespoons, ounces, pounds) and metric (grams, milliliters, kilograms, liters).
- **Conversion logic** lives in a dedicated `units.js` service module with pure functions, making it easy to test and reuse.
- Fractional display (e.g., "1/4 cup" instead of "0.25 cups") is handled at the presentation layer for a more natural cooking experience.

---

## Nutrition Data Strategy

### USDA Cached Lookup

- When a user adds an ingredient, the app searches the USDA FoodData Central API to find a matching food item and retrieves its per-100g nutrient profile.
- The nutrient profile is **cached in the database** (in a `nutrition_cache` table keyed by USDA FDC ID) so that subsequent lookups for the same ingredient do not require another API call.
- Per-recipe and per-serving nutrition totals are computed on the fly from the cached ingredient data and the recipe's canonical quantities.
- This approach balances data freshness (USDA data is updated periodically but changes rarely for staple ingredients) with performance and API rate limits.

---

## AI Integration Architecture

### Single `ai.js` Module, Client-Side Calls

- All AI functionality is encapsulated in `src/lib/ai.js`. This module exposes focused functions such as `suggestSubstitutions()`, `matchFridgeIngredients()`, and `suggestMeals()`.
- **Client-side calls** are used initially for simplicity. The Anthropic API key is stored as a Vite environment variable and included in browser requests. This is acceptable for a private household app that is not publicly deployed. If the app were to be shared more broadly, these calls would be moved behind a serverless function or Supabase Edge Function to protect the API key.
- Prompts are constructed within `ai.js` using template literals with structured context (available ingredients, dietary preferences, recipe history) to produce high-quality suggestions.

---

## Authentication Model

### Single Household Account with RLS

- The app uses a **single shared account** for the household (Dabin and William). There is no need for multi-user role management or per-user permissions at this stage.
- **Row Level Security (RLS)** is still enabled on all tables, scoped to the authenticated user's ID. This ensures that even if the Supabase anon key is exposed, unauthenticated requests cannot read or modify data.
- Supabase Auth handles session management, token refresh, and secure credential storage. Email/password login is used for simplicity.
- If multi-user support is needed later (e.g., separate recipe collections per person), the RLS policies can be extended without changing the table schema.

---

## Mobile-First Design Philosophy

- The primary use case is cooking in the kitchen, where users will most often have a phone or tablet — not a laptop. Therefore, the UI is designed **mobile-first**.
- Layouts use a single-column flow on small screens and expand to multi-column grids on larger viewports.
- Touch targets are sized generously (minimum 44x44px) for use with wet or flour-covered hands.
- Font sizes for ingredient lists and step instructions are large enough to read at arm's length from a countertop.
- Tailwind's responsive utility prefixes (`sm:`, `md:`, `lg:`) make it straightforward to layer on desktop enhancements without cluttering the mobile baseline.

---

## Print View Approach

- A dedicated **print stylesheet** (via Tailwind's `print:` variant) strips navigation, buttons, and interactive elements, leaving only the recipe title, ingredients list, and step-by-step instructions.
- Recipes are formatted to fit cleanly on standard letter/A4 paper with sensible margins and page-break rules.
- Users can trigger printing via the browser's native print dialog (`Ctrl+P` / `Cmd+P`) or a "Print Recipe" button in the UI.
- No server-side PDF generation is needed — the browser's built-in print-to-PDF capability is sufficient for this use case.

---

## V2 TODO

Features and enhancements planned for a future iteration:

- **Diet Profiles** — Allow each household member to define dietary restrictions or goals (e.g., low-sodium, high-protein, vegetarian). Recipes and meal suggestions would be filtered or flagged accordingly.
- **AI Suggestion Engine** — Proactive meal suggestions based on what is currently in the fridge, recent cooking history, and nutritional balance over the past week. Powered by Claude with richer context windows.
- **Weekly Nutrition Dashboard** — A visual summary (charts/graphs) of macro- and micronutrient intake across the week's meal plan, helping track nutritional goals over time.
- **Language Translation UI** — An in-app interface for viewing and editing recipe content in multiple languages side by side, with optional AI-assisted translation between English and Korean.
- **Voice Cooking Mode** — A hands-free step-by-step cooking mode that uses the Web Speech API to read instructions aloud and listens for voice commands ("next step", "repeat", "set timer for 5 minutes") so the cook doesn't need to touch the screen.
