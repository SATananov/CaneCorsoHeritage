import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import './App.css';
import { useLanguage } from './context/languageContext';
import { getTranslation } from './i18n/translations';
import AppLayout from './layouts/AppLayout';
import RequireAuth from './routing/RequireAuth';
import RequireGuest from './routing/RequireGuest';
import RequireAdmin from './routing/RequireAdmin';
import RequireCompleteProfile from './routing/RequireCompleteProfile';

const HomePage = lazy(() => import('./pages/HomePage'));
const StoriesPage = lazy(() => import('./pages/StoriesPage'));
const StoryDetailsPage = lazy(() => import('./pages/StoryDetailsPage'));
const HeritagePage = lazy(() => import('./pages/HeritagePage'));
const HeritageArticlePage = lazy(() => import('./pages/HeritageArticlePage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const HelpPage = lazy(() => import('./pages/HelpPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const UpdatePasswordPage = lazy(() => import('./pages/UpdatePasswordPage'));
const MyStoriesPage = lazy(() => import('./pages/MyStoriesPage'));
const MyFilesPage = lazy(() => import('./pages/MyFilesPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const UserDetailsPage = lazy(() => import('./pages/UserDetailsPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function App() {
    const { language } = useLanguage();
    const t = (key) => getTranslation(language, 'systemUi', key);

    return (
        <Suspense
            fallback={(
                <main className="route-loading" aria-live="polite">
                    <div className="site-container">{t('loadingPage')}</div>
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

                    <Route path="users">
                        <Route index element={<UsersPage />} />
                        <Route path=":userId" element={<UserDetailsPage />} />
                    </Route>

                    <Route path="about" element={<AboutPage />} />
                    <Route path="help/:topic?" element={<HelpPage />} />

                    <Route element={<RequireGuest />}>
                        <Route path="login" element={<LoginPage />} />
                        <Route path="register" element={<RegisterPage />} />
                    </Route>

                    <Route path="forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="update-password" element={<UpdatePasswordPage />} />

                    <Route element={<RequireAuth />}>
                        <Route element={<RequireCompleteProfile />}>
                            <Route path="my-stories" element={<MyStoriesPage />} />
                            <Route path="my-files" element={<MyFilesPage />} />
                        </Route>
                    </Route>

                    <Route element={<RequireAdmin />}>
                        <Route path="admin" element={<AdminPage />} />
                    </Route>

                    <Route path="*" element={<NotFoundPage />} />
                </Route>
            </Routes>
        </Suspense>
    );
}

export default App;
