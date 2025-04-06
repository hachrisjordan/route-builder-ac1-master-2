import React, { useState } from 'react';
import { Card } from 'antd';
import SearchForm from './SearchForm';
import ResultsTable from './ResultsTable';
import FlightDetailsModal from './FlightDetailsModal';
import useFlightSearch from './hooks/useFlightSearch';

const FlightSearch = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentRoute, setCurrentRoute] = useState(null);
  
  const {
    searchResults,
    isLoading,
    handleSearch,
    pagination,
    handleTableChange,
    errors,
  } = useFlightSearch();

  return (
    <div className="flight-search-container">
      <SearchForm 
        onSearch={handleSearch}
        isLoading={isLoading}
        errors={errors}
      />

      {searchResults && (
        <ResultsTable
          searchResults={searchResults}
          isLoading={isLoading}
          pagination={pagination}
          onTableChange={handleTableChange}
          onRouteSelect={(route) => {
            setCurrentRoute(route);
            setIsModalVisible(true);
          }}
        />
      )}

      <FlightDetailsModal
        isVisible={isModalVisible}
        currentRoute={currentRoute}
        onClose={() => {
          setIsModalVisible(false);
          setCurrentRoute(null);
        }}
      />

      <style jsx>{`
        .flight-search-container {
          max-width: 1200px;
          margin: 20px auto;
          padding: 0 20px;
        }
      `}</style>
    </div>
  );
};

export default FlightSearch;