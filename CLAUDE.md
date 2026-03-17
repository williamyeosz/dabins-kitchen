# Dabin's Kitchen

A personal cooking recipe web app for Dabin and William's household.

## Stack
- **Frontend**: React 19 + Vite + Tailwind CSS v4
- **Database & Auth**: Supabase (PostgreSQL + Row Level Security)
- **AI**: Anthropic Claude API (ingredient substitution, fridge matching, meal suggestions)
- **Nutrition**: USDA FoodData Central API

## Folder Structure
```
src/
  lib/         — service modules (supabase, units, nutrition, mealPlan, ai)
  components/  — reusable UI components
  pages/       — route-level page components
  hooks/       — custom React hooks
supabase/
  migrations/  — SQL migration files
```

## Environment Variables
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key
- `VITE_ANTHROPIC_API_KEY` — Claude API key for AI features
- `VITE_USDA_API_KEY` — USDA FoodData Central API key

## Running Locally
```bash
npm install
npm run dev
```

## Database Migrations
Migration files are in `supabase/migrations/`. Apply them via the Supabase dashboard SQL editor or the Supabase CLI.
