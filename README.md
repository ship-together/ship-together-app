# Ship Together

**Connect. Hang Out. Build & Ship Together.**

A global developer community platform where developers, makers, designers, founders, and learners share short build updates, showcase projects, and find collaborators.

## Live Preview Architecture (AI Studio)

In this AI Studio workspace, the live application is wired to **Firebase (Firestore + Firebase Authentication + Firebase Storage)** via `firebase-applet-config.json` and hardened `firestore.rules`.

### Key Features Implemented
- **Landing Page (`/`)**: Mission overview, 3-step community rhythm, and live showcased projects.
- **Community Feed (`/community`)**: Short updates (max 5 lines + optional project URL), likes with duplicate prevention, inline comments, and author edit/delete.
- **Project Showcase (`/projects`, `/projects/:id`)**: Filterable directory (`Building`, `Launched`, `Completed`), cover images, live demo & GitHub links, tech tags, and owner edit/delete.
- **Collaboration Directory (`/collaborate`)**: Filterable opportunities (`Open Source`, `Startup`, `Side Project`, `Learning Together`), private join requests, and owner Accept/Reject review workflow.
- **Developer Profiles (`/profile`, `/u/:username`)**: Public profiles with bio, location, skills, GitHub & portfolio links, published posts, showcased projects, and protected profile editing.
- **Authentication (`/auth`)**: Email/Password registration, login, verification, password reset, logout, and pre-configured Google Sign-In.

## Local Development

```bash
npm install
npm run dev
```

### Enabling Email/Password Auth in Firebase Console (AI Studio Preview)

1. Open [Firebase Console](https://console.firebase.google.com/) for your project (`gen-lang-client-0249838394`).
2. Navigate to **Authentication → Sign-in method**.
3. Ensure **Email/Password** is enabled alongside **Google**.

## Supabase Configuration (Optional External Deployment)

If deploying externally with Supabase:

1. Create a new Supabase project at [supabase.com](https://supabase.com).
2. Run the SQL migration in `supabase/migrations/001_initial_schema.sql` inside the Supabase SQL Editor to create `profiles`, `posts`, `comments`, `post_likes`, `projects`, `collaboration_requests`, and `collaboration_applications`, along with Row Level Security policies and public storage buckets (`avatars` and `project-images`).
3. Enable Email Auth in **Authentication → Providers → Email**.
4. Confirm the `avatars` and `project-images` buckets exist in **Storage**.
5. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` (never expose the `service_role` key in client code).

## Vercel Deployment

1. Push this repository to GitHub.
2. Import the repository in [Vercel](https://vercel.com/new).
3. Build command: `npm run build` · Output directory: `dist`.
4. Add environment variables from `.env.example` in **Project Settings → Environment Variables**.
5. Deploy.
