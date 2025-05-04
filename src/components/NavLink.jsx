import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';

const NavLink = ({ to, children, icon, className }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link 
      to={to} 
      className={`nav-link ${isActive ? 'active' : ''} ${className || ''}`}
    >
      {icon && <span className="nav-icon">{icon}</span>}
      <span className="nav-text">{children}</span>
    </Link>
  );
};

export default NavLink;