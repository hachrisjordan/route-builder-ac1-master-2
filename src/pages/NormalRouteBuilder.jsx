import React, { useState } from 'react';
import { Card } from 'antd';
import NormalRouteBuilder from '../components/FlightSearch/NormalRouteBuilder';
import NormalFlightAvailabilityCalendar from '../components/FlightSearch/NormalFlightAvailabilityCalendar';
import useNormalFlightSearch from '../components/FlightSearch/hooks/useNormalFlightSearch';

const NormalRouteBuilderPage = () => {
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

  const handleSearchSubmit = (searchParams) => {
    const { path } = searchParams;
    // Extract route segments from path
    const routeSegments = path.split(/[/-]/);
    setCurrentRoute(routeSegments);
    handleSearch(searchParams);
  };

  return (
    <div className="flight-search-container">
      <NormalRouteBuilder 
        onSearch={handleSearchSubmit}
        isLoading={isLoading}
        errors={errors}
        cachedApiKey={cachedApiKey}
        saveApiKey={saveApiKey}
      />

      {flightData && currentRoute && (
        <Card style={{ marginTop: '20px' }}>
          <NormalFlightAvailabilityCalendar
            flightData={flightData}
            currentRoute={currentRoute}
            onDateRangeSelect={handleDateRangeSelect}
            selectedRange={selectedDateRange}
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

export default NormalRouteBuilderPage;