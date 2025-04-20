import React, { useState, useEffect } from 'react';
import { Card, Input, Button, message, Form, Typography } from 'antd';
import UAExpandedSaverBuilder from '../components/FlightSearch/UAExpandedSaverBuilder';
import UAExpandedSaverResultsTable from '../components/FlightSearch/UAExpandedSaverResultsTable';
import useNormalFlightSearch from '../components/FlightSearch/hooks/useNormalFlightSearch';

const { Title, Text } = Typography;

const UAExpandedSaverPage = () => {
  const {
    flightData,
    isLoading,
    handleSearch,
    errors,
    selectedDateRange,
    handleDateRangeSelect,
    selectedFlights,
    handleFlightSelect,
    pricingData,
    cachedApiKey,
    saveApiKey
  } = useNormalFlightSearch();

  const [currentRoute, setCurrentRoute] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');

  // Check for cached authentication on component mount
  useEffect(() => {
    const checkAuth = () => {
      const authData = localStorage.getItem('uaExpandedSaverAuth');
      
      if (authData) {
        try {
          const { expiry } = JSON.parse(authData);
          
          // Check if the cached authentication is still valid
          if (expiry && new Date(expiry) > new Date()) {
            setIsAuthenticated(true);
          } else {
            // Clear expired auth data
            localStorage.removeItem('uaExpandedSaverAuth');
          }
        } catch (error) {
          console.error('Error parsing auth data:', error);
          localStorage.removeItem('uaExpandedSaverAuth');
        }
      }
    };
    
    checkAuth();
  }, []);

  const handleAuthenticate = () => {
    // Case insensitive comparison
    if (passcode.toLowerCase() === 'meatloaf') {
      // Set expiry to 24 hours from now
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + 24);
      
      // Save authentication in local storage
      localStorage.setItem('uaExpandedSaverAuth', JSON.stringify({
        expiry: expiry.toISOString()
      }));
      
      setIsAuthenticated(true);
      message.success('Authentication successful');
    } else {
      message.error('Invalid passcode');
    }
  };

  const handleSearchSubmit = (searchParams) => {
    // Check if using direct API call with isUAExpandedSaver flag
    if (searchParams.isUAExpandedSaver) {
      // When using direct API call, we already have path properly formatted
      const { path, apiResponseData } = searchParams;
      // Set current route for display purposes
      const routeSegments = path.split('-');
      setCurrentRoute(routeSegments);
      
      // Store the API response data for the results table
      setSearchResults(apiResponseData);
      
      // No need to pass to handleSearch as we're displaying our own table
      setResultsLoading(false);
      return;
    }
    
    // Regular flow - for UA Expanded Saver, we'll construct the path differently
    const { direction, airport } = searchParams;
    
    // Create a path format that won't trigger validation errors: 'dummy-airport'
    const path = `dummy-${airport}`;
    const routeSegments = [airport];
    
    setCurrentRoute(routeSegments);
    
    // Pass all parameters to the search handler
    handleSearch({
      ...searchParams,
      path
    });
  };

  const handleTableChange = (pagination) => {
    setPagination(pagination);
  };

  // If not authenticated, show passcode form
  if (!isAuthenticated) {
    return (
      <div className="auth-container">
        <Card>
          <div className="auth-content">
            <Title level={3} style={{ textAlign: 'center', marginBottom: '16px' }}>UA Expanded Saver Access</Title>
            <Text style={{ display: 'block', textAlign: 'center', marginBottom: '24px' }}>
              Please enter the passcode to access this page.
            </Text>
            <Form layout="vertical" style={{ width: '100%' }}>
              <Form.Item>
                <Input.Password 
                  placeholder="Enter passcode" 
                  value={passcode} 
                  onChange={(e) => setPasscode(e.target.value)}
                  onPressEnter={handleAuthenticate}
                  size="large"
                />
              </Form.Item>
              <Form.Item>
                <Button 
                  type="primary" 
                  onClick={handleAuthenticate} 
                  block 
                  size="large"
                  style={{ backgroundColor: '#000', borderColor: '#000' }}
                >
                  Submit
                </Button>
              </Form.Item>
            </Form>
          </div>
        </Card>
        <style jsx>{`
          .auth-container {
            max-width: 400px;
            margin: 100px auto;
          }
          .auth-content {
            padding: 16px 24px;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          :global(.ant-card-body) {
            padding: 16px !important;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="flight-search-container">
      <UAExpandedSaverBuilder 
        onSearch={handleSearchSubmit}
        isLoading={isLoading}
        errors={errors}
        cachedApiKey={cachedApiKey}
        saveApiKey={saveApiKey}
      />

      {searchResults && (
        <Card style={{ marginTop: '20px' }}>
          <UAExpandedSaverResultsTable
            searchResults={searchResults}
            isLoading={resultsLoading}
            pagination={pagination}
            onTableChange={handleTableChange}
          />
        </Card>
      )}

      <style jsx>{`
        .flight-search-container {
          max-width: 1920px;
          width: 100%;
          margin: 20px auto;
          padding: 0 12px;
          box-sizing: border-box;
          overflow: visible;
        }
        :global(.ant-card) {
          margin-bottom: 20px;
          width: 100%;
          overflow: visible;
        }
        @media (max-width: 768px) {
          .flight-search-container {
            padding: 0 8px;
            margin: 12px auto;
          }
        }
      `}</style>
    </div>
  );
};

export default UAExpandedSaverPage;