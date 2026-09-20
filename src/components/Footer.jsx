function Footer() {
    return (
        <footer className="site-footer">
            <div className="site-container footer-inner">
                <div className="footer-brand">
                    <img src="/images/logo.jpg" alt="" />

                    <div>
                        <strong>Cane Corso Heritage</strong>
                        <span>Unico Suo Genere</span>
                    </div>
                </div>

                <nav className="footer-nav" aria-label="Footer navigation">
                    <a href="#about">About USG</a>
                    <a href="#help">Help</a>
                </nav>

                <p>© 2026 Cane Corso Heritage</p>
            </div>
        </footer>
    );
}

export default Footer;
