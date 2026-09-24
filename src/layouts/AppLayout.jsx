import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import Footer from '../components/Footer';
import Header from '../components/Header';

const routeTitles = {
    '/': 'Cane Corso Heritage',
    '/stories': 'Stories | Cane Corso Heritage',
    '/heritage': 'Heritage | Cane Corso Heritage',
    '/about': 'About USG | Cane Corso Heritage',
    '/help': 'Help | Cane Corso Heritage',
    '/login': 'Login | Cane Corso Heritage',
    '/register': 'Register | Cane Corso Heritage',
    '/my-stories': 'My Stories | Cane Corso Heritage',
};

function getRouteTitle(pathname) {
    if (routeTitles[pathname]) {
        return routeTitles[pathname];
    }

    if (pathname.startsWith('/stories/')) {
        return 'Story | Cane Corso Heritage';
    }

    if (pathname.startsWith('/heritage/')) {
        return 'Heritage Article | Cane Corso Heritage';
    }

    if (pathname.startsWith('/help/')) {
        return 'Help | Cane Corso Heritage';
    }

    return 'Cane Corso Heritage';
}

function AppLayout() {
    const location = useLocation();

    useEffect(() => {
        document.title = getRouteTitle(location.pathname);
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, [location.pathname]);

    return (
        <>
            <Header />
            <Outlet />
            <Footer />
        </>
    );
}

export default AppLayout;
