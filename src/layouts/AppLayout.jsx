import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import Footer from '../components/Footer';
import Header from '../components/Header';
import ProfileCompletionNotice from '../components/ProfileCompletionNotice';
import { useLanguage } from '../context/languageContext';
import { getPageTitle } from '../i18n/pageTitles';

function AppLayout() {
    const location = useLocation();
    const { language } = useLanguage();

    useEffect(() => {
        document.title = getPageTitle(language, location.pathname);
    }, [language, location.pathname]);

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, [location.pathname]);

    return (
        <>
            <Header />
            <ProfileCompletionNotice />
            <Outlet />
            <Footer />
        </>
    );
}

export default AppLayout;
