# Cane Corso Heritage

**ReactJS · September 2026**
**Stefan Tananov**

Cane Corso Heritage is a React application dedicated to the history, function, identity and stories of the Cane Corso.

The application is designed as a focused heritage experience and can also become part of the larger USG Cane Corso Platform:

https://usg-cane-corso-platform.com/
## Current application
- Home experience with an automatic visual slider
- Client-side routing with React Router
- Shared application layout with Header, Footer and `Outlet`
- Dedicated routes for Home, Stories, Heritage, About USG, Help, Login and Register
- Dynamic Story and Heritage detail routes with URL parameters
- Heritage category filtering with URL search parameters
- Active navigation with `NavLink`
- Optional Help topic route segments
- 404 fallback route
- Guarded `My Stories` route prepared for a future Supabase session
- Route-based lazy loading with `React.lazy` and `Suspense`
- Stories collection loaded from Supabase REST
- Story details loaded from Supabase REST by story ID
- Public Story reads restricted to published records
- Heritage content loaded from Supabase REST
- AbortController cleanup for route and collection fetch requests
- About USG section
- Help section
- Reusable React components and props
- Lists rendered with `map()` and stable `key` props
- Local component state with `useState`
- Event handling with `onClick`
- Conditional rendering
- Lifecycle side effects and cleanup with `useEffect`
- CSS Modules for locally scoped styles
- Loading, success and error states
- Responsive layout for desktop and mobile
## Main routes

- `/` — Home
- `/stories` — Stories catalog
- `/stories/:storyId` — Story details
- `/heritage` — Heritage library
- `/heritage/:slug` — Heritage article details
- `/heritage?category=understanding` — Heritage library filtered through search params
- `/about` — About USG
- `/help/:topic?` — Help with an optional topic segment
- `/login` — Login preparation
- `/register` — Register preparation
- `/my-stories` — guarded route reserved for authenticated members
## Authentication preparation

Login and Register are UI preparation only. Supabase authentication is not connected yet and no credentials are processed. The guarded route is intentionally wired to redirect guests to `/login`; the current placeholder session is `null` until the real Supabase session milestone.
## Supabase data access

Published Heritage articles and published Stories are read through the Supabase REST API.

Local configuration is provided through `.env.local`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

`.env.local` is ignored by Git and is not part of the repository.

Public Story reads are limited by Row Level Security to records with `status = 'published'`.

Story create and delete operations are intentionally deferred until the authentication/write milestone. The local Stories server and write service code remain in the project for that later course step; they are not required to browse the current application.
## Run the application

Install dependencies:

```bash
npm install
```

Start the React application:

```bash
npm run dev
```

Open the address shown by Vite in the terminal.

The preserved local Stories service can still be started when it is needed for the later write-flow course work:

```bash
npm run server
```
## Project structure

- `src/components` — reusable interface components
- `src/pages` — route-level page components
- `src/layouts` — shared route layouts
- `src/routing` — route guard components
- `src/services` — data access functions
- `public/data` — lightweight public preview data
- `content-source` — non-public source content used to prepare Heritage data
- `server` — preserved local Stories service for later authenticated write-flow work

## Repository

https://github.com/SATananov/CaneCorsoHeritage
