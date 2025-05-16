import { useState } from 'react';
import { API_ENDPOINTS } from '../../../config/cloud';

export default function useFlightSearch() {
  const [searchResults, setSearchResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 25,
    total: 0,
    sortField: null,
    sortOrder: null
  });
  const [errors, setErrors] = useState({
    departure: false,
    arrival: false,
    maxSegments: false
  });

  const handleSearch = async (searchParams) => {
    const { departure, arrival, maxSegments, selectedAirlines } = searchParams;
    
    // Reset errors
    setErrors({
      departure: !departure,
      arrival: !arrival,
      maxSegments: !maxSegments
    });

    // Validate mandatory fields
    if (!departure || !arrival || !maxSegments) {
      return;
    }

    setIsLoading(true);
    try {
      // Use centralized API endpoint configuration
      const response = await fetch(API_ENDPOINTS.FIND_ROUTES, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          departureAirport: departure,
          arrivalAirport: arrival,
          excludedAirline: selectedAirlines.length ? selectedAirlines[0] : "null",
          maxSegments: maxSegments
        })
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setSearchResults(data);
      setPagination(prev => ({
        ...prev,
        total: data.routes.length
      }));
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTableChange = (newPagination, filters, sorter) => {
    console.log('handleTableChange called with:', { newPagination, filters, sorter });
    setPagination(prev => {
      const updated = {
        ...prev,
        current: newPagination.current,
        pageSize: newPagination.pageSize,
        sortField: sorter?.field || null,
        sortOrder: sorter?.order || null
      };
      console.log('Updating pagination to:', updated);
      return updated;
    });
  };

  return {
    searchResults,
    isLoading,
    handleSearch,
    pagination,
    handleTableChange,
    errors,
  };
} 