# ReactJS

**September 2026**

**Stefan Tananov**

# Cane Corso Heritage
## Project Idea

I chose this project because Cane Corso is a subject I know well and care about.

My idea is that, after the course and the exam, Cane Corso Heritage can become a separate section of the larger application I am developing:

https://usg-cane-corso-platform.com/

For the ReactJS course I will keep the project simple and focus on clean and understandable React code that I can explain myself.
## How I will work
I will build the project step by step by following the lectures and exercises from the course.
I do not want to add functionality before we study it. After every new lecture and exercise, I will apply what I have learned to this project.
## Current progress
- [x] Create the project with Vite and React
- [x] Use JavaScript and JSX
- [x] Create reusable React components
- [x] Pass data with props
- [x] Reuse shared preview cards and account actions with props
- [x] Render repeated UI from arrays with `map()` and stable `key` props
- [x] Add local component state with `useState`
- [x] Handle button events with `onClick`
- [x] Use conditional rendering with boolean and ternary operators
- [x] Use `useEffect` for a component lifecycle side effect
- [x] Add a `useEffect` cleanup function
- [x] Add the USG visual style
- [x] Add a standalone automatic intro slider
- [x] Build the Home section
- [x] Add the three main entrance cards
- [x] Add a public Visitor View
- [x] Add Stories, Heritage, About USG and Help sections
- [x] Add visual Login and Register actions
- [x] Add a link from About USG to the USG Cane Corso Platform
- [x] Add responsive styling for different screen sizes
- [x] Complete the current visual polish
Current components:
```text
Header
AuthActions
HeritageSlider
HeritageSlide
Hero
PathsSection
EntranceCard
StoriesPreviewSection
HeritagePreviewSection
PreviewCard
AboutUsgSection
HelpSection
Footer
```
## Current Visitor View

A visitor can currently:

- explore the Home page
- use the main entrance cards to move to Stories, Heritage and About USG
- read the current public preview content
- use the Details buttons to conditionally show or hide additional preview information
- see each Details button change its label according to the current component state
- open the USG Cane Corso Platform from the About USG section
- see the prepared Login and Register actions

The application also uses `useEffect` in the root App component for a browser page-title side effect with cleanup.

The Login and Register actions are visual only at this stage.

The current navigation still uses page anchors. Real routing will be added after routing is covered in the course.
## Planned functionality

Later in the course I plan to add:

- real routes
- Login and Register
- authentication and session handling
- Stories list and Story Details
- Create Story
- Edit and Delete for the author of a story
- protected user actions
- real backend data
- forms and validation
- React hooks
- Context API

I will add these only after the related topics are covered in the lectures and exercises.
## Run the project

```bash
npm install
npm run dev
```
## Next

The next functional step will be decided after the next ReactJS lecture and exercise.

Before the final exam submission I will complete the required Functional Guide in this README and add the final deployment information.

## Repository

https://github.com/SATananov/CaneCorsoHeritage
