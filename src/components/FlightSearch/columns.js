import { Tag } from 'antd';
import { Button } from 'antd';
import { DownOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

export const getResultColumns = (onRouteSelect, selectedDays = 60, currentSortField, currentSortOrder) => {
  // Get the appropriate net field based on selected days
  const getNetField = (cabin) => {
    if (selectedDays === 60) return `${cabin}net`;
    return `${cabin}T${selectedDays}net`;
  };

  const YnetField = getNetField('Y');
  const JnetField = getNetField('J');
  const FnetField = getNetField('F');

  // Helper function to get sort indicator
  const getSortIndicator = (field) => {
    if (field !== currentSortField) return null;
    return currentSortOrder === 'ascend' ? 
      <ArrowUpOutlined style={{ 
        marginLeft: 4, 
        color: '#000000',
        transition: 'all 0.3s ease-in-out',
        transform: 'scale(1)',
        opacity: 1
      }} /> : 
      <ArrowDownOutlined style={{ 
        marginLeft: 4, 
        color: '#000000',
        transition: 'all 0.3s ease-in-out',
        transform: 'scale(1)',
        opacity: 1
      }} />;
  };

  return [
    {
      title: <span>Origin{getSortIndicator('departure')}</span>,
      dataIndex: 'departure',
      sorter: (a, b) => a.departure.localeCompare(b.departure),
      width: 80,
    },
    {
      title: <span>Connections{getSortIndicator('connections')}</span>,
      key: 'connections',
      render: (_, record) => (
        <span>
          {record.connections.length > 0 
            ? record.connections.join(' → ')
            : '-'}
        </span>
      ),
      width: 200,
      sorter: (a, b) => {
        if (a.connections.length !== b.connections.length) {
          return a.connections.length - b.connections.length;
        }
        return a.connections.join('').localeCompare(b.connections.join(''));
      },
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: <span>Destination{getSortIndicator('arrival')}</span>,
      dataIndex: 'arrival',
      sorter: (a, b) => a.arrival.localeCompare(b.arrival),
      width: 80,
    },
    {
      title: <span>Stops{getSortIndicator('numConnections')}</span>,
      dataIndex: 'numConnections',
      sorter: (a, b) => a.numConnections - b.numConnections,
      render: (num) => {
        let color;
        switch (num) {
          case 0: color = 'green'; break;
          case 1: color = 'blue'; break;
          case 2: color = 'orange'; break;
          case 3: color = 'gold'; break;
          default: color = 'red';
        }
        return (
          <Tag color={color}>
            {num === 0 ? 'Direct' : `${num} Stop${num > 1 ? 's' : ''}`}
          </Tag>
        );
      },
      width: 80,
    },
    {
      title: <span>Distance{getSortIndicator('totalDistance')}</span>,
      dataIndex: 'totalDistance',
      sorter: (a, b) => a.totalDistance - b.totalDistance,
      render: (distance) => distance.toLocaleString(),
      width: 60,
      align: 'right',
    },
    {
      title: <span>Economy{getSortIndicator('YPrice')}</span>,
      dataIndex: 'YPrice',
      sorter: (a, b) => a.YPrice - b.YPrice,
      render: (price) => price.toLocaleString(),
      width: 80,
      align: 'right',
    },
    {
      title: <span>Business{getSortIndicator('JPrice')}</span>,
      dataIndex: 'JPrice',
      sorter: (a, b) => a.JPrice - b.JPrice,
      render: (price) => price.toLocaleString(),
      width: 80,
      align: 'right',
    },
    {
      title: <span>First{getSortIndicator('FPrice')}</span>,
      dataIndex: 'FPrice',
      sorter: (a, b) => a.FPrice - b.FPrice,
      render: (price) => price.toLocaleString(),
      width: 80,
      align: 'right',
    },
    {
      title: <span>Y %{getSortIndicator(YnetField)}</span>,
      dataIndex: YnetField,
      width: 160,
      render: (text) => text || '-',
      sorter: (a, b) => {
        const getPercent = (str) => {
          if (!str) return 0;
          const match = str.match(/^(-?\d+)/);
          return match ? parseInt(match[0]) : 0;
        };
        return getPercent(a[YnetField]) - getPercent(b[YnetField]);
      },
    },
    {
      title: <span>J %{getSortIndicator(JnetField)}</span>,
      dataIndex: JnetField,
      width: 160,
      render: (text) => text || '-',
      sorter: (a, b) => {
        const getPercent = (str) => {
          if (!str) return 0;
          const match = str.match(/^(-?\d+)/);
          return match ? parseInt(match[0]) : 0;
        };
        return getPercent(a[JnetField]) - getPercent(b[JnetField]);
      },
    },
    {
      title: <span>F %{getSortIndicator(FnetField)}</span>,
      dataIndex: FnetField,
      width: 160,
      render: (text) => text || '-',
      sorter: (a, b) => {
        const getPercent = (str) => {
          if (!str) return 0;
          const match = str.match(/^(-?\d+)/);
          return match ? parseInt(match[0]) : 0;
        };
        return getPercent(a[FnetField]) - getPercent(b[FnetField]);
      },
    },
    {
      title: '',
      key: 'actions',
      width: 20,
      render: (_, record) => (
        <Button 
          type="link" 
          icon={<DownOutlined />}
          onClick={() => {
            const fullRoute = [record.departure, ...record.connections, record.arrival];
            onRouteSelect(fullRoute);
          }}
          style={{ color: '#000000' }}
        />
      ),
    }
  ];
};

export const getSegmentColumns = () => [
  { 
    title: 'From', 
    dataIndex: 'from', 
    width: 80,
    sorter: (a, b) => a.from.localeCompare(b.from)
  },
  { 
    title: 'To', 
    dataIndex: 'to', 
    width: 80,
    sorter: (a, b) => a.to.localeCompare(b.to)
  },
]; 