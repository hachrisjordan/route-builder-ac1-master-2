import React from 'react';
import { Radio, Input, Checkbox } from 'antd';
import { MenuOutlined } from '@ant-design/icons';

const SegmentsFilter = ({
  segmentFilter,
  setSegmentFilter,
  segmentSearchText,
  setSegmentSearchText,
  segmentOrder,
  setSegmentOrder,
  filteredSegments,
  totalSegmentsCount
}) => {
  // Function to handle drag end and reordering
  const handleDragEnd = (result) => {
    // Dropped outside the list
    if (!result.destination) {
      return;
    }
    
    const startIndex = result.source.index;
    const endIndex = result.destination.index;
    
    // Don't update if dropped in the same position
    if (startIndex === endIndex) {
      return;
    }
    
    // Create a copy of the current order or initialize with filtered segments
    const currentOrder = segmentOrder.length > 0 
      ? [...segmentOrder] 
      : filteredSegments;
    
    // Get the item being dragged
    const [removed] = currentOrder.splice(startIndex, 1);
    // Insert at the new position
    currentOrder.splice(endIndex, 0, removed);
    
    // Update the segment order
    setSegmentOrder(currentOrder);
  };
  
  // Select or deselect all segments
  const handleSelectAll = () => {
    if (filteredSegments.length === segmentFilter.segments.length) {
      // Deselect all if all are currently selected
      setSegmentFilter(prev => ({
        ...prev,
        segments: []
      }));
    } else {
      // Select all if not all are selected
      setSegmentFilter(prev => ({
        ...prev,
        segments: [...filteredSegments]
      }));
    }
  };

  // Calculate how many segments were filtered out
  const invalidSegmentsCount = totalSegmentsCount ? (totalSegmentsCount - filteredSegments.length) : 0;

  // Filter segments based on search text
  const displaySegments = filteredSegments.filter(segment => 
    segment.toLowerCase().includes(segmentSearchText.toLowerCase())
  );

  return (
    <div style={{ 
      backgroundColor: 'white', 
      boxShadow: '0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08), 0 9px 28px 8px rgba(0,0,0,.05)',
      borderRadius: '8px',
      padding: '8px 0',
      width: '320px'
    }}>
      <div style={{ padding: '4px 12px 8px', borderBottom: '1px solid #f0f0f0' }}>
        <Radio.Group
          value={segmentFilter.mode}
          onChange={e => setSegmentFilter(prev => ({ ...prev, mode: e.target.value }))}
          style={{ display: 'flex', gap: '8px' }}
        >
          <Radio.Button 
            value="include" 
            style={{ flex: 1, textAlign: 'center' }}
          >
            Include
          </Radio.Button>
          <Radio.Button 
            value="exclude" 
            style={{ flex: 1, textAlign: 'center' }}
          >
            Exclude
          </Radio.Button>
        </Radio.Group>
      </div>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
        <Input
          placeholder="Search segments..."
          value={segmentSearchText}
          onChange={e => setSegmentSearchText(e.target.value)}
          size="small"
          allowClear
          onClick={e => e.stopPropagation()}
        />
      </div>
      
      {invalidSegmentsCount > 0 && (
        <div style={{ 
          padding: '4px 12px', 
          fontSize: '11px', 
          color: '#ff4d4f', 
          backgroundColor: '#fff1f0',
          marginBottom: '4px',
          borderBottom: '1px solid #f0f0f0' 
        }}>
          {invalidSegmentsCount} invalid segment(s) hidden for current route
        </div>
      )}
      
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
        <Checkbox
          checked={filteredSegments.length > 0 && filteredSegments.length === segmentFilter.segments.length}
          indeterminate={segmentFilter.segments.length > 0 && segmentFilter.segments.length < filteredSegments.length}
          onChange={handleSelectAll}
          onClick={(e) => e.stopPropagation()}
        >
          {filteredSegments.length === segmentFilter.segments.length
            ? 'Deselect All'
            : 'Select All'} ({displaySegments.length} segments)
        </Checkbox>
      </div>
      <div style={{ 
        maxHeight: '400px', 
        overflowY: 'auto',
        padding: '8px 0'
      }}>
        {displaySegments.map((segment, index) => (
          <div 
            key={segment} 
            style={{ 
              padding: '4px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'white',
              borderBottom: '1px solid #f9f9f9',
              '&:hover': {
                backgroundColor: '#f5f5f5'
              }
            }}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', segment);
              e.currentTarget.style.opacity = '0.4';
              e.currentTarget.style.backgroundColor = '#f0f0f0';
            }}
            onDragEnd={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.backgroundColor = 'white';
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.style.borderTop = '2px solid #1890ff';
            }}
            onDragLeave={(e) => {
              e.currentTarget.style.borderTop = '1px solid #f9f9f9';
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.style.borderTop = '1px solid #f9f9f9';
              
              const draggedSegment = e.dataTransfer.getData('text/plain');
              if (draggedSegment === segment) return; // Same segment, no change
              
              // Get current ordered segments or initialize with filtered segments
              const currentOrder = segmentOrder.length > 0 
                ? [...segmentOrder] 
                : filteredSegments;
              
              const sourceIndex = currentOrder.indexOf(draggedSegment);
              const targetIndex = currentOrder.indexOf(segment);
              
              if (sourceIndex === -1 || targetIndex === -1) return;
              
              // Create new array with reordered segments
              const newOrder = [...currentOrder];
              newOrder.splice(sourceIndex, 1);
              newOrder.splice(targetIndex, 0, draggedSegment);
              
              setSegmentOrder(newOrder);
            }}
          >
            <div
              style={{
                cursor: 'grab',
                padding: '0 8px 0 0',
                display: 'flex',
                alignItems: 'center',
                color: '#999',
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <MenuOutlined />
            </div>
            
            <Checkbox
              checked={segmentFilter.segments.includes(segment)}
              onChange={e => {
                const isChecked = e.target.checked;
                setSegmentFilter(prev => ({
                  ...prev,
                  segments: isChecked 
                    ? [...prev.segments, segment]
                    : prev.segments.filter(s => s !== segment)
                }));
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {segment}
            </Checkbox>
          </div>
        ))}
        {displaySegments.length === 0 && (
          <div style={{ padding: '8px 12px', color: '#999', textAlign: 'center' }}>
            No valid segments found
          </div>
        )}
      </div>
    </div>
  );
};

export default SegmentsFilter; 