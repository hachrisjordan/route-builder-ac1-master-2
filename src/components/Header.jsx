import { Drawer, Button } from "antd";
import { Link } from "react-router-dom";
import { AirplaneIcon, MenuIcon, HomeIcon, CloseIcon } from '../components/Icons';
import React from 'react';
import NavLink from "./NavLink";



const Header = ({ mobileMenuOpen, setMobileMenuOpen }) => {

  return (
    <>
       <header className="app-header" style={{ height: '64px' }}>
        <div className="header-container">
          <div className="logo-container">
            <AirplaneIcon className="logo-icon" />
            <div className="logo">Route Builder</div>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="desktop-nav">
            <NavLink to="/ac" icon={
              <img src="/AC.png" alt="AC" style={{ width: '18px', height: '18px', marginRight: '8px', borderRadius: '3px' }} />
            }>AC Route Builder</NavLink>
            <NavLink to="/normal" icon={<AirplaneIcon />}>Route Builder</NavLink>
            <NavLink to="/ua-expanded-saver" icon={
              <img src="/UA.png" alt="UA" style={{ width: '18px', height: '18px', marginRight: '8px', borderRadius: '3px' }} />
            }>UA Expanded Saver</NavLink>
            <NavLink to="/vj-delay-metrics" icon={
              <img src="/VJ.png" alt="VJ" style={{ width: '18px', height: '18px', marginRight: '8px', borderRadius: '3px' }} />
            }>VJ Delay Metrics</NavLink>
            <NavLink to="/seat-type-viewer" icon={<AirplaneIcon />}>Seat Type Viewer</NavLink>
            <NavLink to="/map-view" icon={<AirplaneIcon />}>Map View</NavLink>
          </nav>
          
          {/* Mobile menu button */}
          <Button 
            className="mobile-menu-button"
            type="text"
            icon={<MenuIcon />}
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Menu"
          />
        </div>
      </header>
      
      {/* Mobile Navigation Drawer */}
      <Drawer
        title={
          <div className="drawer-header">
            <AirplaneIcon className="drawer-logo-icon" />
            <span>Route Builder</span>
          </div>
        }
        placement="right"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        width={280}
        closeIcon={<CloseIcon />}
        className="mobile-nav-drawer"
        styles={{ header: { padding: '16px', borderBottom: '1px solid rgba(0,0,0,0.06)' } }}
      >
        <div className="mobile-nav">
          <Link to="/ac" onClick={() => setMobileMenuOpen(false)}>
            <img src="/AC.png" alt="AC" style={{ width: '18px', height: '18px', marginRight: '8px', borderRadius: '3px' }} /> AC Route Builder
          </Link>
          <Link to="/normal" onClick={() => setMobileMenuOpen(false)}>
            <HomeIcon /> Normal Route Builder
          </Link>
          <Link to="/ua-expanded-saver" onClick={() => setMobileMenuOpen(false)}>
            <img src="/UA.png" alt="UA" style={{ width: '18px', height: '18px', marginRight: '8px', borderRadius: '3px' }} /> UA Expanded Saver
          </Link>
          <Link to="/vj-delay-metrics" onClick={() => setMobileMenuOpen(false)}>
            <img src="/VJ.png" alt="VJ" style={{ width: '18px', height: '18px', marginRight: '8px', borderRadius: '3px' }} /> VJ Delay Metrics
          </Link>
          <Link to="/seat-type-viewer" onClick={() => setMobileMenuOpen(false)}>
            <AirplaneIcon /> Seat Type Viewer
          </Link>
          <Link to="/map-view" onClick={() => setMobileMenuOpen(false)}>
            <AirplaneIcon /> Map View
          </Link>
        </div>
      </Drawer>
      </>
  );
};

export default Header;