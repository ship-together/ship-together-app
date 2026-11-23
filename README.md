
<div align="center">

# Ship Together

### Connect. Hang Out. Build & Ship Together.

A global community platform for developers, designers, founders, makers, and learners to share progress, showcase projects, exchange ideas, and find people to build with.

[![GitHub](https://img.shields.io/badge/GitHub-Ship--Together-181717?style=for-the-badge&logo=github)](https://github.com/ship-together)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-Fast-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Backend-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)

[Explore Ship Together](https://github.com/ship-together) · [Report a Bug](https://github.com/ship-together/ship-together-app/issues) · [Request a Feature](https://github.com/ship-together/ship-together-app/issues)

</div>

---

## About

Ship Together is a developer community platform built around one simple idea: **building is better together.**

It gives developers and creators a place to share what they are working on, document their progress, showcase completed projects, and connect with people who want to collaborate.

Instead of focusing on lengthy articles or complicated networking features, Ship Together encourages short updates, real projects, meaningful interactions, and practical collaboration.

## Features

### Community Feed
- Publish short build updates (up to five lines).
- Attach an optional project link.
- Like and comment on community posts.
- Edit and delete your own posts.
- Discover what other builders are working on.

### Project Showcase
- Publish and manage personal projects.
- Display project descriptions, cover images, and technology tags.
- Add GitHub repositories and live demo links.
- Organize projects by status:
  - Building
  - Launched
  - Completed
- Explore projects created by other community members.

### Collaboration Hub
- Discover developers looking for teammates.
- Publish collaboration opportunities.
- Browse opportunities by category:
  - Open Source
  - Startup
  - Side Project
  - Learning Together
- Submit private collaboration requests.
- Review and manage applications as a project owner.

### Developer Profiles
- Create a personalized public profile.
- Add a biography, location, and technical skills.
- Connect GitHub and portfolio accounts.
- Showcase published projects.
- Display community activity and build updates.
- Edit and manage your profile.

### Authentication
- Email and password registration.
- Secure sign-in and sign-out.
- Email verification.
- Password reset.
- Google Sign-In.
- Authenticated access to personal features.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Authentication | Firebase Authentication |
| Database | Cloud Firestore |
| File Storage | Firebase Storage |
| Optional Backend | Supabase |
| Deployment | Vercel |

---

## Project Structure

```text
ship-together-app/
│
├── public/
│   └── assets/
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── context/
│   ├── services/
│   ├── lib/
│   ├── types/
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
│
├── firebase-applet-config.json
├── firestore.rules
├── storage.rules
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
│
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
└── README.md
```

---

## Getting Started

Follow these steps to run Ship Together locally.

### Prerequisites

Make sure you have installed:

- [Node.js](https://nodejs.org/) (LTS recommended)
- npm
- Git
- A Firebase project

### 1. Clone the Repository

```bash
git clone https://github.com/ship-together/ship-together-app.git

cd ship-together-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Firebase

Ship Together uses Firebase as its active backend.

1. Create a project in the [Firebase Console](https://console.firebase.google.com/).
2. Enable Firebase Authentication.
3. Enable Email/Password and Google sign-in providers.
4. Create a Cloud Firestore database.
5. Enable Firebase Storage.
6. Configure the application using the Firebase configuration expected by the project.

Ensure the Firestore and Storage security rules are deployed before using the application in production.

### 4. Start the Development Server

```bash
npm run dev
```

Open the local development URL displayed in your terminal.

### 5. Build for Production

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

---

## Backend Configuration

### Firebase — Primary Backend

Firebase provides the core backend infrastructure:

| Service | Purpose |
|---|---|
| Firebase Authentication | User registration and login |
| Cloud Firestore | Profiles, posts, projects, comments, and collaboration data |
| Firebase Storage | Profile pictures and project images |
| Firestore Rules | Database access control |
| Storage Rules | File access permissions |

Firebase is the active backend configuration for the application.

### Supabase — Optional Alternative

Supabase integration is available for projects that prefer PostgreSQL-based infrastructure.

To configure it:

1. Create a project at [Supabase](https://supabase.com/).
2. Open the SQL Editor.
3. Execute `supabase/migrations/001_initial_schema.sql`.
4. Configure authentication providers.
5. Set up the required storage buckets.
6. Add the following environment variables:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Security:** Never expose your Supabase `service_role` key or other private credentials in frontend code.

---

## Deployment

Ship Together can be deployed using [Vercel](https://vercel.com/).

### Deploy to Vercel

1. Push your latest changes to GitHub.
2. Open [Vercel](https://vercel.com/new).
3. Import the `ship-together/ship-together-app` repository.
4. Configure the build settings:

| Setting | Value |
|---|---|
| Framework | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

5. Add any required environment variables.
6. Deploy the application.

### Firebase Production Configuration

After deployment:

- Add your Vercel domain to Firebase Authorized Domains.
- Verify authentication redirect URLs.
- Deploy and review Firestore security rules.
- Deploy and review Storage security rules.
- Test registration, login, posts, projects, and image uploads.

For client-side routing, configure a Vercel rewrite if required.

Example `vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## Community Guidelines

Ship Together is built for people who enjoy learning, sharing, and creating together.

We encourage:

- Respectful communication.
- Constructive feedback.
- Genuine collaboration.
- Sharing real progress and achievements.
- Helping other builders grow.
- Giving credit to contributors.

Please read our community guidelines before contributing.

---

## Contributing

Contributions are welcome!

If you have an idea, found a bug, or want to improve the platform:

1. Fork the repository.
2. Create a feature branch.

```bash
git checkout -b feat/your-feature
```

3. Make your changes.
4. Commit your work.

```bash
git commit -m "feat: add your feature"
```

5. Push your branch.

```bash
git push origin feat/your-feature
```

6. Open a Pull Request.

Please review [CONTRIBUTING.md](CONTRIBUTING.md) before submitting changes.

---

## Security

Security issues should be reported privately.

Please read [SECURITY.md](SECURITY.md) for information about responsible vulnerability disclosure.

Never commit API keys, private credentials, passwords, or environment files containing secrets.

---

## License

This project is distributed under the terms of the Apache License 2.0.

See the [LICENSE](LICENSE) file for details.

---

<div align="center">

### Built for builders. Powered by community.

**Connect. Collaborate. Create. Ship Together.**

[GitHub Organization](https://github.com/ship-together)

</div>
