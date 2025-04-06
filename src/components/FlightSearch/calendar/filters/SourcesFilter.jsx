import React from 'react';
import { Radio, Input, Checkbox } from 'antd';

const SourcesFilter = ({ 
  sourceFilter, 
  setSourceFilter, 
  sourceSearchText, 
  setSourceSearchText,
  uniqueSources 
}) => {
  console.log('[DEBUG] SourcesFilter render with:', JSON.stringify(sourceFilter));
  
  // Ensure sourceFilter is properly initialized
  const safeSourceFilter = sourceFilter || { mode: 'include', sources: [] };
  const sources = Array.isArray(safeSourceFilter.sources) ? safeSourceFilter.sources : [];
  
  // Ensure uniqueSources is an array
  const safeUniqueSources = Array.isArray(uniqueSources) ? uniqueSources : [];
  
  // Filter sources based on search text
  const filteredSources = safeUniqueSources.filter(source => 
    source.airline.toLowerCase().includes(sourceSearchText.toLowerCase()) ||
    source.code.toLowerCase().includes(sourceSearchText.toLowerCase()) ||
    (source.ffname && source.ffname.toLowerCase().includes(sourceSearchText.toLowerCase()))
  );
  
  // Helper function to update the filter
  const updateFilter = (updatedFilter) => {
    console.log('[DEBUG] SourcesFilter updating filter to:', JSON.stringify(updatedFilter));
    setSourceFilter(updatedFilter);
  };

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
          value={safeSourceFilter.mode}
          onChange={e => {
            const newMode = e.target.value;
            console.log('[DEBUG] SourcesFilter changing mode to:', newMode);
            const newFilter = {
              mode: newMode,
              sources: sources
            };
            updateFilter(newFilter);
          }}
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
          placeholder="Search sources..."
          value={sourceSearchText}
          onChange={e => setSourceSearchText(e.target.value)}
          size="small"
          allowClear
          onClick={e => e.stopPropagation()}
        />
      </div>
      <div style={{ 
        maxHeight: '400px', 
        overflowY: 'auto',
        padding: '8px 0'
      }}>
        {filteredSources.map(source => (
          <div 
            key={source.code} 
            style={{ 
              padding: '4px 12px',
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: '#f5f5f5'
              }
            }}
          >
            <Checkbox
              checked={sources.includes(source.code)}
              onChange={e => {
                const isChecked = e.target.checked;
                console.log('[DEBUG] SourcesFilter checkbox changed for:', source.code, 'checked:', isChecked);
                
                const newSources = isChecked 
                  ? [...sources, source.code]
                  : sources.filter(s => s !== source.code);
                  
                const newFilter = {
                  mode: safeSourceFilter.mode,
                  sources: newSources
                };
                
                updateFilter(newFilter);
              }}
            >
              <div style={{ 
                display: 'flex',
                alignItems: 'center', 
                gap: '8px'
              }}>
                {/* Logo - use airline logo for the source */}
                <div style={{ 
                  width: '24px', 
                  height: '24px',
                  flexShrink: 0
                }}>
                  <img 
                    src={`/${source.iata || source.code}.png`} 
                    alt={source.airline} 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'contain',
                      borderRadius: '4px'
                    }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
                
                {/* Text content */}
                <div style={{ fontSize: '13px' }}>
                  {source.airline} {source.ffname && <span style={{ color: '#999' }}>({source.ffname})</span>}
                </div>
              </div>
            </Checkbox>
          </div>
        ))}
        {filteredSources.length === 0 && (
          <div style={{ padding: '8px 12px', color: '#999', textAlign: 'center' }}>
            No sources found
          </div>
        )}
      </div>
    </div>
  );
};

export default SourcesFilter; 