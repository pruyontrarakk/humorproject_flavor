# Humor Flavor — prompt chain tool

Next.js app for practicing the humor flavor assignment: CRUD on `humor_flavors` / `humor_flavor_steps`, reorder steps, pick a test image from `images`, and call a configurable caption API.

## Setup

```bash
npm install
cp .env.example .env.local
# Fill in Supabase keys + CAPTION_API_URL (see below)
npm run dev
```

## Auth

- Google OAuth via Supabase.
- After login, `profiles.is_superadmin` **or** `profiles.is_matrix_admin` must be true.

## Caption API

`POST /api/generate-captions` (same-origin, uses your session cookie) loads steps for a flavor and forwards this JSON to `CAPTION_API_URL`:

```json
{
  "image_url": "https://…",
  "humor_flavor_id": 123,
  "steps": [
    {
      "humor_flavor_step_type_id": 1,
      "description": null,
      "llm_system_prompt": "…",
      "llm_user_prompt": "…"
    }
  ]
}
```

Adjust `CAPTION_API_URL` / payload in `src/app/api/generate-captions/route.ts` if your course API expects a different shape.

## UI

Styling matches **`humorproject_admin`**: Tailwind CSS, **brand** amber palette (`tailwind.config.ts`), system font stack (`SF Pro Text` / system-ui), `.card`, `.btn-primary`, `.input`, etc.

## Theme

Header includes **Light**, **Dark**, and **System** (uses `prefers-color-scheme` when System is selected; `class="dark"` on `<html>`).

## Reorder behavior

Step order follows `humor_flavor_step_type_id`. Swapping two adjacent steps uses a temporary unused step type id so unique constraints are less likely to conflict.
