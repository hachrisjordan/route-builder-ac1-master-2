import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Drawer, Tooltip } from 'antd';
import { AirplaneIcon, MenuIcon, HomeIcon, CloseIcon } from './components/Icons';
import './App.css';
import FlightSearch from './pages/FlightSearch';
import NormalRouteBuilderPage from './pages/NormalRouteBuilder';
import UAExpandedSaverPage from './pages/UAExpandedSaverPage';
import VJDelayMetricsPage from './pages/VJDelayMetricsPage';

const { Header, Content, Footer } = Layout;

// Custom NavLink component that handles active state
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

// Main app component
function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  // Handle scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <Router>
      <AppContent 
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        scrolled={scrolled}
      />
    </Router>
  );
}

// Separate component to access useLocation hook inside Router context
function AppContent({ mobileMenuOpen, setMobileMenuOpen, scrolled }) {
  const location = useLocation();
  
  return (
    <Layout className="layout">
      <Header className={`app-header ${scrolled ? 'scrolled' : ''}`}>
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
            <NavLink to="/normal" icon={<HomeIcon />}>Normal Route Builder</NavLink>
            <NavLink to="/ua-expanded-saver" icon={
              <img src="/UA.png" alt="UA" style={{ width: '18px', height: '18px', marginRight: '8px', borderRadius: '3px' }} />
            }>UA Expanded Saver</NavLink>
            <NavLink to="/vj-delay-metrics" icon={
              <img src="/VJ.png" alt="VJ" style={{ width: '18px', height: '18px', marginRight: '8px', borderRadius: '3px' }} />
            }>VJ Delay Metrics</NavLink>
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
      </Header>
      
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
        headerStyle={{ padding: '16px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}
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
            <HomeIcon /> VJ Delay Metrics
          </Link>
        </div>
      </Drawer>
      
      <Content className="app-content">
        <Routes>
          <Route path="/ac" element={<FlightSearch />} />
          <Route path="/normal" element={<NormalRouteBuilderPage />} />
          <Route path="/ua-expanded-saver" element={<UAExpandedSaverPage />} />
          <Route path="/vj-delay-metrics" element={<VJDelayMetricsPage />} />
          <Route path="/" element={<Navigate to="/ac" replace />} />
        </Routes>
      </Content>
      
      <Footer className="app-footer">
        <div className="footer-content">
          <div className="footer-copyright">
            2025 Route Builder by Ha Nguyen (binbinhihi)
          </div>
          <div className="footer-kofi">
            <a href='https://ko-fi.com/binbinhihi' target='_blank' rel="noopener noreferrer">
              <img height='36' style={{border:0, height:36}} src='https://storage.ko-fi.com/cdn/kofi3.png?v=6' alt='Buy Me a Coffee at ko-fi.com' />
            </a>
          </div>
        </div>
      </Footer>
    </Layout>
  );
}

export default App;
