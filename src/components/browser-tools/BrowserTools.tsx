import React, { useState } from 'react';
import { Card, Tabs, Button, Space, Input, message } from 'antd';
import { ChromeOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';

const { TabPane } = Tabs;

interface BrowserToolsProps {
  onUrlChange?: (url: string) => void;
}

const BrowserTools: React.FC<BrowserToolsProps> = ({ onUrlChange }) => {
  const [url, setUrl] = useState('');
  const [activeTab, setActiveTab] = useState('1');

  const handleUrlSubmit = () => {
    if (!url) {
      message.error('Please enter a URL');
      return;
    }
    onUrlChange?.(url);
  };

  const handleRefresh = () => {
    message.success('Page refreshed');
    // Add refresh logic here
  };

  return (
    <Card className="browser-tools-container">
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane
          tab={
            <span>
              <ChromeOutlined />
              Browser
            </span>
          }
          key="1"
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                prefix={<SearchOutlined />}
                placeholder="Enter URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onPressEnter={handleUrlSubmit}
              />
              <Button type="primary" onClick={handleUrlSubmit}>
                Go
              </Button>
            </Space.Compact>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
              Refresh Page
            </Button>
          </Space>
        </TabPane>
      </Tabs>
    </Card>
  );
};

export default BrowserTools; 