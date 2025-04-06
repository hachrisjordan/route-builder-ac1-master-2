import React, { useState } from 'react';
import { Button, Menu, Dropdown, Checkbox } from 'antd';
import { PlusOutlined, DeleteOutlined, DownOutlined } from '@ant-design/icons';
import GroupFilter from './GroupFilter';
import ClassFilter from './ClassFilter';
import SourcesFilter from './SourcesFilter';
import AirlinesFilter from './AirlinesFilter';
import PointsFilter from './PointsFilter';
import DatesFilter from './DatesFilter';

// New component for segment-based filters
const SegmentBasedFilter = ({
  additionalFilters,
  segmentFilters,
  renderSegmentsDropdownSimple,
  deleteFilter,
  uniqueSources,
  uniqueAirlines,
  pointsRange,
  uniqueDates,
  updateSegmentFilter
}) => {
  // Move state hooks to component level - MUST be before any conditionals
  const [searchTexts, setSearchTexts] = useState({});
  
  // Helper to get/set search text for a specific filter
  const getSearchText = (filterId, type) => searchTexts[`${filterId}-${type}`] || '';
  const setSearchText = (filterId, type, value) => {
    setSearchTexts(prev => ({
      ...prev,
      [`${filterId}-${type}`]: value
    }));
  };
  
  // Early return after hooks are declared
  if (additionalFilters.length === 0) return null;
  
  return (
    <>
      {additionalFilters.map(filter => {
        if (filter.type === 'segment') {
          // Get or initialize filter settings for this specific filter
          const filterData = segmentFilters[filter.id] || {
            segments: [],
            directFilter: false,
            classFilter: [],
            sourceFilter: { mode: 'include', sources: [] },
            airlinesFilter: { mode: 'include', airlines: [] },
            pointsFilter: null,
            dateFilter: []
          };
          
          // Helper to update any filter property
          const updateFilter = (key, value) => {
            console.log('[DEBUG] SegmentBasedFilter updateFilter called for:', key, 'with value:', value);
            
            // Use the proper update function instead of direct mutation
            if (updateSegmentFilter) {
              updateSegmentFilter(filter.id, key, value);
            } else {
              // Fallback to direct mutation if updateSegmentFilter is not provided
              console.log('[DEBUG] WARNING: updateSegmentFilter not provided, using direct mutation');
              const newFilterData = {
                ...(segmentFilters[filter.id] || {}),
                [key]: value
              };
              segmentFilters[filter.id] = newFilterData;
            }
          };
          
          return (
            <div key={filter.id} style={{ 
              display: 'flex', 
              flexDirection: 'column',
              borderRadius: '4px',
              marginBottom: '12px',
              gap: '8px'
            }}>
              {/* Header with scope selection */}
              <div style={{ 
                display: 'flex', 
                gap: '8px', 
                alignItems: 'center'
              }}>
                <span style={{ 
                  fontWeight: 600, 
                  marginRight: '4px',
                  fontSize: '14px'
                }}>
                  Segment-based Filter
                </span>
                <span style={{ whiteSpace: 'nowrap' }}>for</span>
                <Dropdown 
                  overlay={renderSegmentsDropdownSimple(filter.id)}
                  trigger={['click']}
                >
                  <Button 
                    type={filterData.segments?.length > 0 ? "primary" : "default"}
                    size="small"
                    style={{ 
                      fontWeight: filterData.segments?.length > 0 ? 600 : 400
                    }}
                  >
                    Segments {filterData.segments?.length > 0 && `(${filterData.segments.length})`}
                  </Button>
                </Dropdown>
                
                <Button 
                  type="text" 
                  icon={<DeleteOutlined />} 
                  size="small"
                  style={{ marginLeft: 'auto', color: '#ff4d4f' }}
                  onClick={() => deleteFilter(filter.id)}
                />
              </div>
              
              {/* Filter controls - similar to global filters */}
              <div style={{ 
                display: 'flex', 
                gap: '8px', 
                justifyContent: 'flex-start',
                flexWrap: 'wrap',
                alignItems: 'center',
                backgroundColor: '#ffffff',
                padding: '8px',
                borderRadius: '4px'
              }}>
                {/* Direct only toggle */}
                <Checkbox 
                  checked={filterData.directFilter}
                  onChange={e => updateFilter('directFilter', e.target.checked)}
                  style={{ 
                    marginLeft: '8px',
                    fontSize: '13px'
                  }}
                >
                  <span style={{ fontWeight: filterData.directFilter ? 600 : 400 }}>Direct Only</span>
                </Checkbox>
                
                {/* Class filter */}
                <Dropdown 
                  overlay={
                    <ClassFilter 
                      classFilter={Array.isArray(filterData.classFilter) ? filterData.classFilter : []}
                      setClassFilter={(newVal) => updateFilter('classFilter', newVal)}
                    />
                  } 
                  trigger={['click']}
                >
                  <Button 
                    type={filterData.classFilter?.length > 0 ? "primary" : "default"}
                    size="small"
                    icon={<DownOutlined />}
                    style={{ 
                      fontWeight: filterData.classFilter?.length > 0 ? 600 : 400
                    }}
                  >
                    Classes {filterData.classFilter?.length > 0 && `(${filterData.classFilter.length})`}
                  </Button>
                </Dropdown>
                
                {/* Airlines filter */}
                <Dropdown 
                  overlay={
                    <AirlinesFilter 
                      airlinesFilter={filterData.airlinesFilter || { mode: 'include', airlines: [] }}
                      setAirlinesFilter={(newVal) => updateFilter('airlinesFilter', newVal)}
                      airlinesSearchText={getSearchText(filter.id, 'airlines')}
                      setAirlinesSearchText={(value) => setSearchText(filter.id, 'airlines', value)}
                      uniqueAirlines={uniqueAirlines}
                    />
                  } 
                  trigger={['click']}
                >
                  <Button 
                    type={filterData.airlinesFilter?.airlines?.length > 0 ? "primary" : "default"}
                    size="small"
                    icon={<DownOutlined />}
                    style={{ 
                      fontWeight: filterData.airlinesFilter?.airlines?.length > 0 ? 600 : 400
                    }}
                  >
                    Airlines {filterData.airlinesFilter?.airlines?.length > 0 && `(${filterData.airlinesFilter.airlines.length})`}
                  </Button>
                </Dropdown>
                
                {/* Points filter */}
                <Dropdown 
                  overlay={
                    <PointsFilter 
                      pointsFilter={filterData.pointsFilter}
                      setPointsFilter={(newVal) => updateFilter('pointsFilter', newVal)}
                      pointsRange={pointsRange}
                    />
                  } 
                  trigger={['click']}
                >
                  <Button 
                    type={filterData.pointsFilter ? "primary" : "default"}
                    size="small"
                    icon={<DownOutlined />}
                    style={{ 
                      fontWeight: filterData.pointsFilter ? 600 : 400
                    }}
                  >
                    Points {filterData.pointsFilter && `(${filterData.pointsFilter[0].toLocaleString()}-${filterData.pointsFilter[1].toLocaleString()})`}
                  </Button>
                </Dropdown>
                
                {/* Dates filter */}
                <Dropdown 
                  overlay={
                    <DatesFilter 
                      dateFilter={filterData.dateFilter || []}
                      setDateFilter={(newVal) => updateFilter('dateFilter', newVal)}
                      dateSearchText={getSearchText(filter.id, 'dates')}
                      setDateSearchText={(value) => setSearchText(filter.id, 'dates', value)}
                      uniqueDates={uniqueDates}
                    />
                  } 
                  trigger={['click']}
                >
                  <Button 
                    type={filterData.dateFilter?.length > 0 ? "primary" : "default"}
                    size="small"
                    icon={<DownOutlined />}
                    style={{ 
                      fontWeight: filterData.dateFilter?.length > 0 ? 600 : 400
                    }}
                  >
                    Dates {filterData.dateFilter?.length > 0 && `(${filterData.dateFilter.length})`}
                  </Button>
                </Dropdown>
                
                {/* Sources filter */}
                <Dropdown 
                  overlay={
                    <SourcesFilter 
                      sourceFilter={filterData.sourceFilter || { mode: 'include', sources: [] }}
                      setSourceFilter={(newVal) => updateFilter('sourceFilter', newVal)}
                      sourceSearchText={getSearchText(filter.id, 'sources')}
                      setSourceSearchText={(value) => setSearchText(filter.id, 'sources', value)}
                      uniqueSources={uniqueSources}
                    />
                  } 
                  trigger={['click']}
                >
                  <Button 
                    type={filterData.sourceFilter?.sources?.length > 0 ? "primary" : "default"}
                    size="small"
                    icon={<DownOutlined />}
                    style={{ 
                      fontWeight: filterData.sourceFilter?.sources?.length > 0 ? 600 : 400
                    }}
                  >
                    Sources {filterData.sourceFilter?.sources?.length > 0 && `(${filterData.sourceFilter.sources.length})`}
                  </Button>
                </Dropdown>
              </div>
            </div>
          );
        }
        return null;
      })}
    </>
  );
};

const AdditionalFilter = ({
  additionalFilters,
  setAdditionalFilters,
  groupFilters,
  setGroupFilters,
  segmentFilters,
  setSegmentFilters,
  renderOriginDropdown,
  renderDestDropdown,
  renderSegmentsDropdownSimple,
  deleteFilter,
  uniqueSources,
  uniqueAirlines,
  pointsRange,
  uniqueDates,
  updateGroupFilter,
  updateSegmentFilter
}) => {
  // Render the "Add filter" dropdown menu
  const addFilterMenu = (
    <Menu
      onClick={({ key }) => {
        // Generate a unique ID for the new filter
        const filterId = `${key}-${Date.now()}`;
        
        // Add the new filter to the list
        setAdditionalFilters(prev => [...prev, { id: filterId, type: key }]);
        
        // Initialize the filter data
        if (key === 'group') {
          setGroupFilters(prev => ({
            ...prev,
            [filterId]: {
              originFilter: { mode: 'include', airports: [] },
              destFilter: { mode: 'include', airports: [] }
            }
          }));
        } else if (key === 'segment') {
          setSegmentFilters(prev => ({
            ...prev,
            [filterId]: { segments: [] }
          }));
        }
      }}
      items={[
        {
          key: 'group',
          label: 'Group-based Filter',
        },
        {
          key: 'segment',
          label: 'Segment-based Filter',
        },
      ]}
    />
  );

  return (
    <div>
      
      {/* Render group filters */}
      <GroupFilter 
        additionalFilters={additionalFilters.filter(f => f.type === 'group')} 
        groupFilters={groupFilters}
        renderOriginDropdown={renderOriginDropdown}
        renderDestDropdown={renderDestDropdown}
        deleteFilter={deleteFilter}
        uniqueSources={uniqueSources}
        uniqueAirlines={uniqueAirlines}
        pointsRange={pointsRange}
        uniqueDates={uniqueDates}
        updateGroupFilter={updateGroupFilter}
      />
      
      {/* Render segment filters */}
      <SegmentBasedFilter
        additionalFilters={additionalFilters.filter(f => f.type === 'segment')}
        segmentFilters={segmentFilters}
        renderSegmentsDropdownSimple={renderSegmentsDropdownSimple}
        deleteFilter={deleteFilter}
        uniqueSources={uniqueSources}
        uniqueAirlines={uniqueAirlines}
        pointsRange={pointsRange}
        uniqueDates={uniqueDates}
        updateSegmentFilter={updateSegmentFilter}
      />
    </div>
  );
};

export default AdditionalFilter; 