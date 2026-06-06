# SoilSync deployment

## Recommended free setup

- Frontend: Vercel Hobby
- Backend: Render free web service
- Database: MongoDB Atlas free

## Frontend on Vercel

- Root Directory: `Frontend`
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment variable:
  - `VITE_API_URL=https://your-backend.onrender.com`

`Frontend/vercel.json` already includes the SPA rewrite for React Router.

## Backend on Render

This repository includes:

- `render.yaml` for a Render Blueprint
- `Backend/Dockerfile` so Node and Python run in the same backend service
- `Backend/.dockerignore` to keep the image smaller

### Important backend environment variables

- `MONGO_URI`
- `JWT_SECRET`

For the first deployment without email flows, `FRONTEND_URL` and `BACKEND_PUBLIC_URL` can stay empty.

### Email options

Recommended for free hosting later, after you own a sending domain:

- `EMAIL_PROVIDER=resend`
- `EMAIL_FROM=verified@your-domain.com`
- `RESEND_API_KEY=...`

For the simplest first deployment without email:

- `REQUIRE_EMAIL_VERIFICATION=false`

With that flag, new accounts are created as verified automatically, so `EMAIL_FROM`, `RESEND_API_KEY`, and `EMAIL_REPLY_TO` can stay empty for now.

### AI and media variables

Only set these if you want the related features to work immediately in production:

- `GOOGLE_API_KEY` or `GEMINI_API_KEY`
- `GOOGLE_GENAI_API_VERSION`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `EPPO_API_KEY`

## Python recommender

The backend now supports Linux-friendly Python resolution and the Docker image installs:

- Node 20
- Python 3
- Python dependencies from `Backend/requirements.txt`

The backend health endpoint is:

- `/health`

## Suggested order

1. Push the repo to GitHub.
2. Create MongoDB Atlas and copy `MONGO_URI`.
3. Deploy backend on Render from `render.yaml`.
4. Deploy frontend on Vercel from `Frontend`.
5. Set `VITE_API_URL` in Vercel to the Render backend URL.
6. Set `FRONTEND_URL` and `BACKEND_PUBLIC_URL` in Render to the final public URLs.
