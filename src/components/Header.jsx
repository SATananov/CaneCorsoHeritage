import AuthActions from './AuthActions';

function Header() {
    return (
        <header className="site-header">
            <div className="site-container header-inner">
                <a className="brand" href="#home" aria-label="USG Cane Corso Heritage home">
                    <img className="brand-logo" src="/images/logo.jpg" alt="" />

                    <span className="brand-copy">
                        <small>
                            Unico Suo Genere
                            <sup className="brand-trademark" aria-label="trademark">&trade;</sup>
                        </small>
                        <strong>Cane Corso Heritage</strong>
                    </span>
                </a>

                <nav className="main-nav" aria-label="Main navigation">
                    <a href="#home">Home</a>
                    <a href="#stories">Stories</a>
                    <a href="#heritage">Heritage</a>
                    <a href="#about">About USG</a>
                    <a href="#help">Help</a>

                    <AuthActions className="visitor-auth" ariaLabel="Account options" />
                </nav>
            </div>
        </header>
    );
}

export default Header;
