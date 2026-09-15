# Cane Corso Heritage

Cane Corso Heritage is a React web application for preserving and sharing Cane Corso stories and profiles.

The project is being developed as the exam project for the ReactJS course. It will grow progressively alongside the lectures and exercises so that each new React concept is first learned in the course and then applied directly in the application.

---

## 1. Project Overview

**Application Name:** Cane Corso Heritage

**Category / Topic:** Community / Story Sharing Application

**Main Purpose:**

Cane Corso Heritage is a web application where visitors can discover public stories and profiles related to Cane Corso.

Authenticated users will be able to create and manage their own stories, while guests will be able to browse the public catalog and open details pages.

The project is intentionally kept focused and clear. The goal is to demonstrate correct React architecture, routing, authentication, remote data communication, CRUD operations, forms, validation, Context API, hooks, and error handling without unnecessary business complexity.

---

## 2. Development Approach

The project will be developed progressively alongside the ReactJS course.

New functionality will be added step by step according to the topics covered in the lectures and exercises.

The goal is to apply each newly learned React concept directly in the project instead of implementing features before they are covered in the course.

Examples:

- **JSX and Components** → basic page structure and reusable components
- **Props** → reusable story cards and component data
- **Routing** → page navigation and parameterized routes
- **Forms** → login, register, create, and edit forms
- **Hooks** → local state, effects, and component lifecycle behavior
- **Context API** → authentication and shared application state
- **Backend Communication** → real remote data and CRUD operations
- **Validation and Error Handling** → user-friendly form and API feedback

This approach keeps the project synchronized with the course material and makes every implementation step easier to understand and explain.

---

## 3. Current Status

Implemented so far:

- React project created with Vite
- JavaScript + JSX
- ESLint configured
- Basic application composition
- `Header` functional component
- `Footer` functional component
- Initial `App` component structure
- Git repository initialized
- Public GitHub repository connected

Current project structure includes:

```text
src/
├── components/
│   ├── Footer.jsx
│   └── Header.jsx
├── App.css
├── App.jsx
├── index.css
└── main.jsx
```

---

## 4. Planned Features

The following functionality is planned and will be added gradually as the related course topics are covered:

- Home page
- Stories Catalog
- Story Details page
- User Registration
- User Login
- User Logout
- Create Story
- Edit Story
- Delete Story
- My Stories
- Likes or another API-based interaction
- Route Guards
- Authentication persistence
- Real remote backend
- CRUD operations
- Controlled forms
- Form validation
- Loading states
- Error states
- Empty-data states
- Context API
- React Hooks and lifecycle behavior
- Responsive and consistent styling
- Deployment of the final application

---

## 5. Planned User Access and Permissions

### Guest

A guest user will be able to:

- Open the Home page
- Browse the Stories Catalog
- Open Story Details
- Open Login
- Open Register

A guest user will not be able to:

- Create stories
- Edit stories
- Delete stories
- Access private user pages

### Authenticated User

An authenticated user will be able to:

- Browse public stories
- Open Story Details
- Create a new story
- View their own stories
- Interact with existing records through the API

### Story Author

The author of a story will additionally be able to:

- Edit their own story
- Delete their own story

Users must not be able to edit or delete records created by another user.

---

## 6. Planned Routing Structure

The exact routing implementation will be added when routing is covered in the course.

Planned routes:

```text
/
 /stories
 /stories/:id
 /stories/create
 /stories/:id/edit
 /my-stories
 /login
 /register
```

Planned route behavior:

- `/stories` → Stories Catalog
- `/stories/:id` → Story Details
- `/stories/create` → private route
- `/stories/:id/edit` → private route, author only
- `/my-stories` → private route
- `/login` → guest-only route
- `/register` → guest-only route

---

## 7. Planned Data Model

The main collection will contain Cane Corso stories.

A story may include fields such as:

- Name
- Title
- Image URL
- Birth year or age
- Sex
- Story / description
- Author
- Created date

The final field structure may be refined while the related forms and backend functionality are being developed.

---

## 8. Planned Backend

A real remote backend will be used.

Current preferred option:

**Supabase** — planned, not implemented yet.

The backend is expected to provide:

- Authentication
- Persistent data storage
- Real CRUD operations
- User identity
- Author ownership information

No hardcoded collection data will be used for the final exam functionality.

---

## 9. Planned CRUD Operations

The main stories collection will support all four CRUD operations:

- **Create** → authenticated users create new stories
- **Read** → catalog and details pages load stories from the backend
- **Update** → only the author can edit a story
- **Delete** → only the author can delete a story

The UI will be updated after successful backend operations.

---

## 10. Planned Forms and Validation

Planned forms:

- Register
- Login
- Create Story
- Edit Story

The forms will use controlled inputs and React synthetic events.

Validation will be added progressively and will include multiple validated fields and visible user feedback.

---

## 11. Planned React-Specific Techniques

The project is expected to demonstrate:

- Functional components
- JSX
- Props
- Component composition
- `useState`
- `useEffect`
- Custom hooks where appropriate
- Component mount / update / unmount behavior
- Context API
- Client-side routing
- Route parameters
- Controlled forms
- Synthetic events
- Remote API communication

Only techniques already covered in the course will be introduced during each development stage.

---

## 12. Styling Approach

The interface will follow a clean and consistent design.

Planned design principles:

- Simple navigation
- Consistent typography and buttons
- Clear visual hierarchy
- Good readability and contrast
- Clearly visible action buttons
- Visible feedback for interactive elements
- Sufficient whitespace
- Limited and consistent color palette

Styling will use external CSS files.

---

## 13. Run the Project Locally

### Requirements

- Node.js
- npm

### Installation

```bash
npm install
```

### Start Development Server

```bash
npm run dev
```

The development URL is normally:

```text
http://localhost:5173/
```

### Run ESLint

```bash
npm run lint
```

---

## 14. Project Development Roadmap

The roadmap will follow the ReactJS lectures and exercises.

### Stage 01 — Completed

- Create Vite + React project
- Use JavaScript
- Configure ESLint
- Create basic functional components
- Compose the initial application
- Initialize Git
- Create the public GitHub repository

### Stage 02 — Next

- Continue practicing JSX
- Add reusable components
- Introduce props
- Build the first story presentation components

### Later Stages

Later functionality will be added when the corresponding topic is covered during the course:

- Routing
- Forms
- Hooks
- Context API
- Authentication
- Backend communication
- CRUD
- Validation
- Error handling
- Deployment

---

## 15. Functional Guide — Evolving Draft

The official Functional Guide will be completed progressively inside this README as the application is implemented.

The final version will document:

1. Project Overview
2. User Access & Permissions
3. Authentication & Session Handling
4. Routing Structure
5. List → Details Flow
6. Data Source & Backend
7. Data Operations (CRUD)
8. Forms & Validation
9. React-Specific Techniques
10. Typical User Flow
11. Error & Edge Case Handling

Sections describing functionality that has not yet been implemented are intentionally marked as planned.

---

## 16. Repository

Public GitHub repository:

```text
https://github.com/SATananov/CaneCorsoHeritage
```

---

## 17. Exam Development Rule

The project will be developed through meaningful Git commits across multiple days.

Each development stage should represent real progress in the application instead of uploading the entire project at once near the exam deadline.
