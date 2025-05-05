import React, { useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { Layout } from 'antd';
import './App.css';
import FlightSearch from './pages/FlightSearch';
import NormalRouteBuilderPage from './pages/NormalRouteBuilder';
import UAExpandedSaverPage from './pages/UAExpandedSaverPage';
import VJDelayMetricsPage from './pages/VJDelayMetricsPage';
import SeatTypeViewer from './pages/seat-type-viewer';
import Header from './components/Header';
import Footer from './components/Footer';

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <Router>
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

      <AppContent
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />
      <Footer />
    </Router>
  );
}

function AppContent() {
  return (
    <Layout className="layout">

      <Layout.Content className="app-content">
        <Routes>
          <Route path="/ac" element={<FlightSearch />} />
          <Route path="/normal" element={<NormalRouteBuilderPage />} />
          <Route path="/ua-expanded-saver" element={<UAExpandedSaverPage />} />
          <Route path="/vj-delay-metrics" element={<VJDelayMetricsPage />} />
          <Route path="/seat-type-viewer" element={<SeatTypeViewer />} />
          <Route path="/" element={<Navigate to="/ac" replace />} />
        </Routes>
      </Layout.Content>

    </Layout>
  );
}

export default App;
