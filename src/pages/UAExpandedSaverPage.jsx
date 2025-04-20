import React, { useState, useEffect } from 'react';
import { Card, Input, Button, message, Form, Typography } from 'antd';
import UAExpandedSaverBuilder from '../components/FlightSearch/UAExpandedSaverBuilder';
import UAExpandedSaverResultsTable from '../components/FlightSearch/UAExpandedSaverResultsTable';
import useNormalFlightSearch from '../components/FlightSearch/hooks/useNormalFlightSearch';
import { validateAccessCode, saveAuthState } from '../services/AccessCodeService';

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
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Check for cached authentication on component mount
  useEffect(() => {
    const checkAuth = () => {
      const authData = localStorage.getItem('uaExpandedSaverAuth');
      
      if (authData) {
        try {
          const { expiry, description } = JSON.parse(authData);
          
          // Check if the cached authentication is still valid
          if (expiry && new Date(expiry) > new Date()) {
            setIsAuthenticated(true);
            console.log(`Authenticated access (${description || 'No description'})`);
          } else {
            // Clear expired auth data
            localStorage.removeItem('uaExpandedSaverAuth');
            setAuthError('Your access has expired. Please enter a new access code.');
          }
        } catch (error) {
          console.error('Error parsing auth data:', error);
          localStorage.removeItem('uaExpandedSaverAuth');
        }
      }
    };
    
    checkAuth();
  }, []);

  const handleAuthenticate = async () => {
    if (!passcode.trim()) {
      message.error('Please enter an access code');
      return;
    }

    setIsAuthLoading(true);
    setAuthError(null);
    
    try {
      const result = await validateAccessCode(passcode);
      
      if (result.isValid) {
        // Save authentication state
        saveAuthState(result.expiryDate, result.description);
        
        setIsAuthenticated(true);
        message.success('Authentication successful');
        
        // Log access for admin purposes
        console.log(`Access granted: ${result.description || 'No description'}`);
      } else {
        if (result.error) {
          setAuthError(result.error);
          message.error(result.error);
        } else {
          setAuthError('Invalid access code');
          message.error('Invalid access code');
        }
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setAuthError('Failed to verify access code. Please try again.');
      message.error('Authentication failed. Please try again.');
    } finally {
      setIsAuthLoading(false);
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
              Please enter the access code to access this page.
            </Text>
            {authError && (
              <div style={{ color: '#ff4d4f', marginBottom: '16px', textAlign: 'center' }}>
                {authError}
              </div>
            )}
            <Form layout="vertical" style={{ width: '100%' }}>
              <Form.Item>
                <Input.Password 
                  placeholder="Enter access code" 
                  value={passcode} 
                  onChange={(e) => setPasscode(e.target.value)}
                  onPressEnter={handleAuthenticate}
                  size="large"
                  disabled={isAuthLoading}
                />
              </Form.Item>
              <Form.Item>
                <Button 
                  type="primary" 
                  onClick={handleAuthenticate} 
                  block 
                  size="large"
                  loading={isAuthLoading}
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
        <div className="custom-results-container">
          <UAExpandedSaverResultsTable
            searchResults={searchResults}
            isLoading={resultsLoading}
            pagination={pagination}
            onTableChange={handleTableChange}
          />
        </div>
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
        .custom-results-container {
          background: white;
          padding: 24px;
          border-radius: 8px;
          box-shadow: 0 1px 2px -2px rgba(0, 0, 0, 0.16), 0 3px 6px 0 rgba(0, 0, 0, 0.12), 0 5px 12px 4px rgba(0, 0, 0, 0.09);
          margin-top: 20px;
          margin-bottom: 20px;
          width: 100%;
          overflow: visible;
          display: flex;
          flex-direction: column;
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