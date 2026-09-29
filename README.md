# Cane Corso Heritage

**ReactJS · September 2026**
**Stefan Tananov**

Cane Corso Heritage is a React single-page application dedicated to Cane Corso history, working tradition, identity and community stories.

## Current application

- React Router client-side routing with shared layout and lazy-loaded pages
- Public Home, Stories, Heritage, Members, About USG and Help sections
- Dynamic Story, Heritage article and Member profile detail routes
- Supabase authentication with Register, Login, Logout and persistent sessions
- Guest and authenticated route guards
- Public Members catalog backed by the `profiles` table
- Public Story and Heritage reads from Supabase
- Authenticated Story Create, Read, Update and Delete operations
- Story ownership through `author_id`
- Only the story owner can edit or delete their records through Supabase RLS
- Story visibility with `Community` and `My Own`
- `My Stories` private workspace for the signed-in member
- `My Files` private file workspace
- Image, audio, MP4 and text-document uploads through private Supabase Storage
- User files are private by default and can be shared with the Community
- Community files can be displayed from the member profile
- Story attachments follow the Story visibility setting
- Controlled forms, loading states, validation and API error states
- AbortController cleanup for collection and detail requests
- Responsive layout with reusable React components and CSS Modules

## Main routes

- `/` — Home
- `/stories` — public Community Stories catalog
- `/stories/:storyId` — Story details
- `/heritage` — Heritage library
- `/heritage/:slug` — Heritage article details
- `/users` — public Members catalog
- `/users/:userId` — public Member profile
- `/about` — About USG
- `/help/:topic?` — Help
- `/login` — Login for guests
- `/register` — Registration for guests
- `/my-stories` — private Story workspace
- `/my-files` — private user file workspace

## Authentication and sessions

Authentication is provided by Supabase Auth. The application restores the current session when it loads and listens for authentication state changes through the shared Auth Context.

Guests can browse public content. Authenticated users can access the private Story and file workspaces and manage only the records that belong to their account.

## Supabase data access

The application uses Supabase as its hosted backend.

Local configuration is provided through `.env.local`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

`.env.local` is ignored by Git and is not part of the repository.

Community Stories are publicly readable. `My Own` Stories are readable only by their owner. Authenticated Story writes send the signed-in user's access token and are protected by Row Level Security.

The private `user-files` Storage bucket accepts images, MP4 and TXT files up to 50 MB. File metadata is stored in `user_files`. A file can remain private or be explicitly shared with the Community.

## Run the application

Install dependencies:

```bash
npm install
```

Start the React application:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Run lint checks:

```bash
npm run lint
```

## Project structure

- `src/components` — reusable interface components
- `src/pages` — route-level page components
- `src/layouts` — shared route layouts
- `src/routing` — route guard components
- `src/context` — shared authentication context
- `src/hooks` — reusable React hooks
- `src/services` — Supabase data and file access functions
- `src/lib` — Supabase client setup
- `public/data` — lightweight public preview data
- `content-source` — non-public source content used to prepare Heritage data

## Repository

https://github.com/SATananov/CaneCorsoHeritage

- File library supports common image formats, common audio formats, MP4 video and text/document files.
