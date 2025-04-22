import React from 'react';

const VJDelayMetricsPage = () => {
  return (
    <div className="metrics-container">
      <div className="tableau-wrapper">
        <iframe 
          title="Vietjet Air Delay Metrics"
          frameBorder="0" 
          marginHeight="0" 
          marginWidth="0" 
          allowTransparency="true" 
          allowFullScreen="true" 
          className="tableauViz" 
          style={{ 
            width: '100%', 
            height: '100%', 
            display: 'block',
            margin: 0,
            padding: 0,
            border: 'none'
          }}
          src="https://public.tableau.com/views/VJ_17452710246850/Dashboard1?:embed=y&:showVizHome=no&:host_url=https%3A%2F%2Fpublic.tableau.com%2F&:embed_code_version=3&:tabs=no&:toolbar=yes&:animate_transition=yes&:display_static_image=no&:display_spinner=no&:display_overlay=yes&:display_count=yes&:language=en-US"
        ></iframe>
      </div>
      
      <style jsx>{`
        .metrics-container {
          width: 100%;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding-top: 50px;
          margin: 0;
          background-color: #f5f5f5;
        }
        
        .tableau-wrapper {
          width: 1366px;
          height: 795px;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
        }
        
        @media (max-width: 1400px) {
          .tableau-wrapper {
            width: 95%;
            height: 795px;
          }
        }
        
        @media (max-width: 800px) {
          .metrics-container {
            padding-top: 30px;
          }
          
          .tableau-wrapper {
            width: 100%;
            height: 1027px;
          }
        }
      `}</style>
    </div>
  );
};

export default VJDelayMetricsPage; 