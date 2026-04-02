# Humor Flavor — prompt chain tool

Next.js app for practicing the humor flavor assignment: CRUD on `humor_flavors` / `humor_flavor_steps`, reorder steps, pick a test image from `images`, and call a configurable caption API.

## Setup

```bash
npm install
cp .env.example .env.local
# Fill in Supabase keys (CAPTION_API_URL optional — see Caption API)
npm run dev
```

## Auth

- Google OAuth via Supabase.
- After login, `profiles.is_superadmin` **or** `profiles.is_matrix_admin` must be true.

## Caption API

`POST /api/generate-captions` (same-origin, admin session cookie) supports two upstream modes:

### Default — Almost Crack’d pipeline (matches `humorproject` upload flow)

If `CAPTION_API_URL` / `ALMOST_CRACKD_CAPTION_URL` are **unset**, the server POSTs to:

`https://api.almostcrackd.ai/pipeline/generate-captions`

with `Authorization: Bearer <Supabase access_token>` and body:

```json
{ "imageId": "<uuid from images.id>" }
```

### Custom — full flavor chain

Set `CAPTION_API_URL` to any URL whose path does **not** end in `/pipeline/generate-captions`. The server loads steps from Supabase and POSTs:

```json
{
  "image_url": "https://…",
  "humor_flavor_id": 123,
  "steps": [ … ]
}
```

Optional `CAPTION_API_KEY` (or `ALMOST_CRACKD_API_KEY`) is sent as `Bearer` in this mode only.

See `src/app/api/generate-captions/route.ts` for details.

## UI

Styling matches **`humorproject_admin`**: Tailwind CSS, **brand** amber palette (`tailwind.config.ts`), system font stack (`SF Pro Text` / system-ui), `.card`, `.btn-primary`, `.input`, etc.

## Theme

Header includes **Light**, **Dark**, and **System** (uses `prefers-color-scheme` when System is selected; `class="dark"` on `<html>`).

## Reorder behavior

Step order follows `humor_flavor_step_type_id`. Swapping two adjacent steps uses a temporary unused step type id so unique constraints are less likely to conflict.
