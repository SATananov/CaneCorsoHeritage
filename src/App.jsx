import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import './App.css';
import AppLayout from './layouts/AppLayout';
import RequireAuth from './routing/RequireAuth';

const HomePage = lazy(() => import('./pages/HomePage'));
const StoriesPage = lazy(() => import('./pages/StoriesPage'));
const StoryDetailsPage = lazy(() => import('./pages/StoryDetailsPage'));
const HeritagePage = lazy(() => import('./pages/HeritagePage'));
const HeritageArticlePage = lazy(() => import('./pages/HeritageArticlePage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const HelpPage = lazy(() => import('./pages/HelpPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const MyStoriesPage = lazy(() => import('./pages/MyStoriesPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function App() {
    // Supabase will replace this null session in the authentication milestone.
    const authUser = null;

    return (
        <Suspense
            fallback={(
                <main className="route-loading" aria-live="polite">
                    <div className="site-container">Loading page...</div>
                </main>
            )}
        >
            <Routes>
                <Route element={<AppLayout />}>
                    <Route index element={<HomePage />} />

                    <Route path="stories">
                        <Route index element={<StoriesPage />} />
                        <Route path=":storyId" element={<StoryDetailsPage />} />
                    </Route>

                    <Route path="heritage">
                        <Route index element={<HeritagePage />} />
                        <Route path=":slug" element={<HeritageArticlePage />} />
                    </Route>

                    <Route path="about" element={<AboutPage />} />
                    <Route path="help/:topic?" element={<HelpPage />} />
                    <Route path="login" element={<LoginPage />} />
                    <Route path="register" element={<RegisterPage />} />

                    <Route element={<RequireAuth user={authUser} />}>
                        <Route path="my-stories" element={<MyStoriesPage />} />
                    </Route>

                    <Route path="*" element={<NotFoundPage />} />
                </Route>
            </Routes>
        </Suspense>
    );
}

export default App;
