import React, { useState } from 'react';

const NormalRouteBuilderPage = () => {
  const [currentRoute, setCurrentRoute] = useState([]);

  const handleSearch = (searchParams) => {
    console.log('Handling search with params:', searchParams);
    // Implementation would go here
  };

  const handleSearchSubmit = (searchParams) => {
    const { path } = searchParams;
    console.log('🔍 NormalRouteBuilderPage - Received search params:', searchParams);
    console.log('🔍 NormalRouteBuilderPage - Path received:', path);
    
    // Extract route segments from path
    const routeSegments = path.split(/[/-]/);
    console.log('🔍 NormalRouteBuilderPage - Route segments extracted:', routeSegments);
    
    setCurrentRoute(routeSegments);
    handleSearch(searchParams);
  };

  return (
    <div>
      <h1>Route Builder</h1>
      {/* Your component content would go here */}
    </div>
  );
};

export default NormalRouteBuilderPage; 