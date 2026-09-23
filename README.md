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
- [x] Use a CSS Module for locally scoped component styles
- [x] Fetch project content with the Fetch API
- [x] Separate fetch logic into a service
- [x] Show loading, success and error states for fetched data
- [x] Load Stories from a local practice REST API
- [x] Show a reusable loading spinner while Stories are fetched
- [x] Fetch Story Details by id and display them in a modal
- [x] Create a Story with POST and refresh the Story list
- [x] Delete a Story with DELETE and refresh the Story list
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

## Current Visitor View

Stories now load from the local practice REST API during development. If the practice API is not running, the same three Story cards are used as a fallback so the Visitor View still works.

Heritage continues to load its introduction through the Fetch API from `public/data/heritage-preview.json`.

## Practice REST API

For this course exercise stage, the project includes the SoftUni-style practice server at:

`http://localhost:3030/jsonstore/stories`

The practice server keeps changes in memory and resets them when it restarts.

Run the project with two terminals.

Terminal 1:

```bash
npm run server
```

Terminal 2:

```bash
npm run dev
```

## Next

The next exercise-aligned step is Story Details: select one Story, fetch it by id and close the details view.

Create Story now follows the exercise pattern: submit a controlled form with POST and refresh the Story collection with a new GET after success.

Delete Story now follows the exercise pattern: confirm the selected Story, send DELETE by id and refresh the Story collection with a new GET after success.

The Edit flow in the 21 September exercise is only partially implemented, so it is not treated as finished functionality yet.

## Repository

https://github.com/SATananov/CaneCorsoHeritage


## Exercise alignment after 21 September

The completed exercise patterns now represented in Cane Corso Heritage are:

- REST collection GET
- loading Spinner
- Details GET by id
- Create with POST and collection refresh
- Delete with DELETE and collection refresh

The Edit flow from the exercise remains intentionally unimplemented because the exercise itself leaves Edit only partially completed.
