function Header() {
    return (
        <header className="site-header">
            <div className="site-container header-inner">
                <a className="brand" href="#home" aria-label="Cane Corso Heritage home">
                    <img className="brand-logo" src="/images/logo.jpg" alt="" />

                    <span className="brand-copy">
                        <small>Unico Suo Genere</small>
                        <strong>Cane Corso Heritage</strong>
                    </span>
                </a>

                <nav className="main-nav" aria-label="Main navigation">
                    <a href="#home">Home</a>
                    <a href="#stories">Stories</a>
                    <a href="#heritage">Heritage</a>
                    <a href="#about">About</a>
                </nav>
            </div>
        </header>
    );
}

export default Header;
