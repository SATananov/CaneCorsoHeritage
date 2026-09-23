function Footer() {
    return (
        <footer className="site-footer">
            <div className="site-container footer-inner">
                <div className="footer-brand">
                    <img src="/images/logo.jpg" alt="" />

                    <div>
                        <strong>Cane Corso Heritage</strong>
                        <span>
                            USG · Unico Suo Genere
                            <sup className="footer-trademark" aria-label="trademark">&trade;</sup>
                        </span>
                    </div>
                </div>

                <nav className="footer-nav" aria-label="Footer navigation">
                    <a href="#about">About USG</a>
                    <a href="#help">Help</a>
                </nav>

                <p className="footer-legal">
                    © 2026 <strong>USG</strong> · Unico Suo Genere
                    <sup className="footer-trademark" aria-label="trademark">&trade;</sup>
                    <span aria-hidden="true"> · </span>Cane Corso Heritage
                </p>
            </div>
        </footer>
    );
}

export default Footer;
