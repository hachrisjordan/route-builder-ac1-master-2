import React, { useState, useEffect } from 'react';
import { Card, Input, DatePicker, Button, Space, Row, Col } from 'antd';
import { SearchOutlined, SwapOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import HybridPathInput from './HybridPathInput';
import SourcesInput from './SourcesExcludedInput';
import NormalFlightAvailabilityCalendar from './NormalFlightAvailabilityCalendar';
import './styles/NormalRouteBuilder.css';

const { RangePicker } = DatePicker;

const NormalRouteBuilder = ({ onSearch, isLoading, errors, cachedApiKey, saveApiKey }) => {
  const [path, setPath] = useState('');
  const [sourcesState, setSourcesState] = useState({ mode: 'include', sources: [] });
  const [apiKey, setApiKey] = useState('');
  const [dateRange, setDateRange] = useState(null);
  const [flightData, setFlightData] = useState(null);
  const [currentRoute, setCurrentRoute] = useState([]);
  const [selectedDateRange, setSelectedDateRange] = useState(null);

  // Load the cached API key when the component mounts
  useEffect(() => {
    if (cachedApiKey) {
      setApiKey(cachedApiKey);
    }
  }, [cachedApiKey]);

  // Update the cached API key when it changes
  const handleApiKeyChange = (e) => {
    const newApiKey = e.target.value;
    setApiKey(newApiKey);
    saveApiKey(newApiKey);
  };

  const handleDateRangeSelect = (range) => {
    setSelectedDateRange(range);
    setDateRange([dayjs(range[0]), dayjs(range[1])]);
  };

  const handleSearch = () => {
    if (!path) {
      return;
    }

    console.log('🔍 NormalRouteBuilder - Path to search:', path);
    console.log('🔍 NormalRouteBuilder - Path type:', typeof path);

    // Split path into segments for the calendar
    setCurrentRoute(path.split(/[/-]/));

    onSearch({
      path,
      sourcesState,
      apiKey,
      dateRange: dateRange ? [dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')] : null
    });
  };

  const handleReversePath = () => {
    if (!path) return;

    // Split the path into segments
    const segments = path.split('-');
    
    // Reverse the segments and their internal airports
    const reversedSegments = segments.map(segment => {
      const airports = segment.split('/');
      return airports.reverse().join('/');
    }).reverse();
    
    // Join the segments back together
    const reversedPath = reversedSegments.join('-');
    
    setPath(reversedPath);
  };

  return (
    <>
      <Card className="normal-route-builder">
        <Row gutter={[16, 16]} className="form-row">
          {/* Path Input */}
          <Col flex="10">
            <div className="form-item">
              <div className="element-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                Path:
                <Button
                  type="text"
                  icon={<SwapOutlined />}
                  onClick={handleReversePath}
                  style={{ padding: '0 4px' }}
                  title="Reverse path"
                />
              </div>
              <HybridPathInput
                value={path}
                onChange={setPath}
                placeholder="Enter path (e.g. NRT/HND-OAK/SFO-JFK/EWR)"
              />
            </div>
          </Col>

          {/* Sources Input */}
          <Col flex="1">
            <div className="form-item">
              <div className="element-label">Sources:</div>
              <SourcesInput
                value={sourcesState.sources}
                onChange={setSourcesState}
                defaultMode={sourcesState.mode}
              />
            </div>
          </Col>

          {/* API Key */}
          <Col flex="6">
            <div className="form-item">
              <div className="element-label">API Key:</div>
              <Input.Password
                value={apiKey}
                onChange={handleApiKeyChange}
                placeholder="Enter your API key"
              />
            </div>
          </Col>

          {/* Date Range */}
          <Col flex="6">
            <div className="form-item">
              <div className="element-label">Date Range:</div>
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                format="YYYY-MM-DD"
              />
            </div>
          </Col>

          {/* Search Button */}
          <Col flex="0 1 120px" className="search-button-col">
            <Button
              type="primary"
              onClick={handleSearch}
              disabled={!path || isLoading}
              loading={isLoading}
              className="search-button"
              icon={<SearchOutlined />}
            >
              Search
            </Button>
          </Col>
        </Row>
        
        {/* Error messages */}
        {errors && Object.entries(errors).map(([key, error]) => (
          <div key={key} style={{ color: 'red', marginTop: '8px' }}>
            {error}
          </div>
        ))}
      </Card>

      {flightData && currentRoute && (
        <NormalFlightAvailabilityCalendar
          flightData={flightData}
          currentRoute={currentRoute}
          onDateRangeSelect={handleDateRangeSelect}
          selectedRange={selectedDateRange}
        />
      )}
    </>
  );
};

export default NormalRouteBuilder; 