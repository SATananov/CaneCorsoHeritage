const BRAND_TITLES = {
    en: 'Cane Corso Heritage',
    bg: 'Кане Корсо Наследство',
    it: 'Patrimonio Cane Corso',
};

const ROUTE_TITLES = {
    en: {
        home: 'Cane Corso Heritage | USG - Unico Suo Genere',
        stories: 'Stories',
        story: 'Story',
        heritage: 'Heritage',
        heritageArticle: 'Heritage Article',
        members: 'Members',
        member: 'Member',
        about: 'About USG',
        help: 'Help',
        login: 'Login',
        register: 'Register',
        forgotPassword: 'Password Recovery',
        updatePassword: 'Update Password',
        myStories: 'My Stories',
        myFiles: 'My Files',
        admin: 'Administration',
        notFound: 'Page Not Found',
    },
    bg: {
        home: 'Кане Корсо Наследство | USG - Unico Suo Genere',
        stories: 'Истории',
        story: 'История',
        heritage: 'Наследство',
        heritageArticle: 'Материал от Наследство',
        members: 'Членове',
        member: 'Член',
        about: 'За USG',
        help: 'Помощ',
        login: 'Вход',
        register: 'Регистрация',
        forgotPassword: 'Възстановяване на парола',
        updatePassword: 'Нова парола',
        myStories: 'Моите истории',
        myFiles: 'Моите файлове',
        admin: 'Администрация',
        notFound: 'Страницата не е намерена',
    },
    it: {
        home: 'Patrimonio Cane Corso | USG - Unico Suo Genere',
        stories: 'Storie',
        story: 'Storia',
        heritage: 'Patrimonio',
        heritageArticle: 'Articolo del Patrimonio',
        members: 'Membri',
        member: 'Membro',
        about: 'Su USG',
        help: 'Aiuto',
        login: 'Accesso',
        register: 'Registrazione',
        forgotPassword: 'Recupero password',
        updatePassword: 'Nuova password',
        myStories: 'Le mie storie',
        myFiles: 'I miei file',
        admin: 'Amministrazione',
        notFound: 'Pagina non trovata',
    },
};

function withBrand(language, title) {
    return title + ' | ' + (BRAND_TITLES[language] ?? BRAND_TITLES.en);
}

export function getPageTitle(language, pathname) {
    const activeLanguage = ROUTE_TITLES[language] ? language : 'en';
    const titles = ROUTE_TITLES[activeLanguage];

    if (pathname === '/') return titles.home;
    if (pathname === '/stories') return withBrand(activeLanguage, titles.stories);
    if (pathname.startsWith('/stories/')) return withBrand(activeLanguage, titles.story);
    if (pathname === '/heritage') return withBrand(activeLanguage, titles.heritage);
    if (pathname.startsWith('/heritage/')) return withBrand(activeLanguage, titles.heritageArticle);
    if (pathname === '/users') return withBrand(activeLanguage, titles.members);
    if (pathname.startsWith('/users/')) return withBrand(activeLanguage, titles.member);
    if (pathname === '/about') return withBrand(activeLanguage, titles.about);
    if (pathname === '/help' || pathname.startsWith('/help/')) return withBrand(activeLanguage, titles.help);
    if (pathname === '/login') return withBrand(activeLanguage, titles.login);
    if (pathname === '/register') return withBrand(activeLanguage, titles.register);
    if (pathname === '/forgot-password') return withBrand(activeLanguage, titles.forgotPassword);
    if (pathname === '/update-password') return withBrand(activeLanguage, titles.updatePassword);
    if (pathname === '/my-stories') return withBrand(activeLanguage, titles.myStories);
    if (pathname === '/my-files') return withBrand(activeLanguage, titles.myFiles);
    if (pathname === '/admin') return withBrand(activeLanguage, titles.admin);

    return withBrand(activeLanguage, titles.notFound);
}
