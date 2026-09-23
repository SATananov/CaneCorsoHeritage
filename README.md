# Cane Corso Heritage

**ReactJS · September 2026**
**Stefan Tananov**

Cane Corso Heritage is a React application dedicated to the history, function, identity and stories of the Cane Corso.

The application is designed as a focused heritage experience and can also become part of the larger USG Cane Corso Platform:

https://usg-cane-corso-platform.com/

## Current application

- Home experience with an automatic visual slider
- Stories collection loaded through a REST API
- Story Details modal
- Create Story flow with POST and automatic list refresh
- Delete Story flow with confirmation and automatic list refresh
- Heritage content loaded with the Fetch API
- Heritage Details modal
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

- `src/components` — interface components
- `src/services` — data access functions
- `public/data` — Heritage content
- `server` — Stories data service

## Repository

https://github.com/SATananov/CaneCorsoHeritage
