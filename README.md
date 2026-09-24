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
- Stories collection loaded through a REST API
- Create Story flow with POST and automatic list refresh
- Delete Story flow with confirmation and automatic list refresh
- Heritage content loaded with the Fetch API
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

## Stories API

The Stories collection is available through:

`http://localhost:3030/jsonstore/stories`

The included data service starts with the seeded Stories collection. Runtime changes are kept in memory, so restarting the service restores the seeded data.

## Run the application

Install dependencies:

```bash
npm install
```

Start the Stories data service in one terminal:

```bash
npm run server
```

Start the React application in another terminal:

```bash
npm run dev
```

Open the address shown by Vite in the terminal.

## Project structure

- `src/components` — reusable interface components
- `src/pages` — route-level page components
- `src/layouts` — shared route layouts
- `src/routing` — route guard components
- `src/services` — data access functions
- `public/data` — Heritage content
- `server` — Stories data service

## Repository

https://github.com/SATananov/CaneCorsoHeritage
