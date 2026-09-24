import { NavLink } from 'react-router';
import AuthActions from './AuthActions';

function getNavClassName({ isActive }) {
    return isActive ? 'main-nav-link main-nav-link-active' : 'main-nav-link';
}

function Header() {
    return (
        <header className="site-header">
            <div className="site-container header-inner">
                <NavLink className="brand" to="/" aria-label="USG Cane Corso Heritage home">
                    <img className="brand-logo" src="/images/logo.jpg" alt="" />

                    <span className="brand-copy">
                        <small>
                            Unico Suo Genere
                            <sup className="brand-trademark" aria-label="trademark">&trade;</sup>
                        </small>
                        <strong>Cane Corso Heritage</strong>
                    </span>
                </NavLink>

                <nav className="main-nav" aria-label="Main navigation">
                    <NavLink className={getNavClassName} to="/" end>Home</NavLink>
                    <NavLink className={getNavClassName} to="/stories">Stories</NavLink>
                    <NavLink className={getNavClassName} to="/heritage">Heritage</NavLink>
                    <NavLink className={getNavClassName} to="/about">About USG</NavLink>
                    <NavLink className={getNavClassName} to="/help">Help</NavLink>

                    <AuthActions className="visitor-auth" ariaLabel="Account options" />
                </nav>
            </div>
        </header>
    );
}

export default Header;
