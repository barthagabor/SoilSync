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
- `FRONTEND_URL`
- `BACKEND_PUBLIC_URL`
- `JWT_SECRET`

### Email options

Recommended for free hosting:

- `EMAIL_PROVIDER=resend`
- `EMAIL_FROM=verified@your-domain.com`
- `RESEND_API_KEY=...`

If you do not want email verification in a demo deployment:

- `REQUIRE_EMAIL_VERIFICATION=false`

With that flag, new accounts are created as verified automatically.

### AI and media variables

Only set these if you use the related features:

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
