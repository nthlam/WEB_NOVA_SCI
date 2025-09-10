// src/components/PurchaseReports.js
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Table, Badge } from 'react-bootstrap';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
} from 'chart.js';
import axios from 'axios';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
);

const PurchaseReports = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [purchaseData, setPurchaseData] = useState([]);
  const [filters, setFilters] = useState({
    hours: 168, // 1 week default
    user_identity: '',
    payment_status: ''
  });
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    completedOrders: 0,
    failedOrders: 0
  });

  const fetchPurchaseData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      params.append('limit', '1000');
      params.append('hours', filters.hours);
      
      if (filters.user_identity.trim()) {
        params.append('user_identity', filters.user_identity.trim());
      }
      
      if (filters.payment_status.trim()) {
        params.append('payment_status', filters.payment_status.trim());
      }

      const response = await axios.get(`http://localhost:5001/api/logs/purchases?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setPurchaseData(response.data);
      calculateStats(response.data);
      
    } catch (error) {
      console.error('Error loading purchase data:', error);
      setError('Failed to load purchase data: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const totalOrders = data.length;
    const totalRevenue = data.reduce((sum, order) => sum + (order.total_cost || 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const completedOrders = data.filter(order => 
      order.payment_status === 'PAID' || order.payment_status === 'COMPLETED'
    ).length;
    const failedOrders = data.filter(order => order.payment_status === 'FAILED').length;

    setStats({
      totalOrders,
      totalRevenue,
      avgOrderValue,
      completedOrders,
      failedOrders
    });
  };

  const getRevenueByTimeChart = () => {
    if (purchaseData.length === 0) return null;

    // Group by hour for last 24h, by day for longer periods
    const groupByHour = filters.hours <= 24;
    const timeGroups = {};

    purchaseData.forEach(order => {
      if (order.payment_status !== 'PAID' && order.payment_status !== 'COMPLETED') return;
      
      const date = new Date(order.timestamp);
      // Convert to Vietnam time (+7 hours)
      const vietnamTime = new Date(date.getTime() + (7 * 60 * 60 * 1000));
      
      let timeKey;
      if (groupByHour) {
        timeKey = vietnamTime.getHours().toString().padStart(2, '0') + ':00';
      } else {
        timeKey = vietnamTime.toISOString().split('T')[0]; // YYYY-MM-DD
      }
      
      if (!timeGroups[timeKey]) {
        timeGroups[timeKey] = 0;
      }
      timeGroups[timeKey] += order.total_cost || 0;
    });

    const sortedKeys = Object.keys(timeGroups).sort();
    
    return {
      labels: sortedKeys,
      datasets: [
        {
          label: 'Revenue (VND)',
          data: sortedKeys.map(key => timeGroups[key]),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgb(34, 197, 94)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
        }
      ]
    };
  };

  const getPaymentStatusChart = () => {
    if (purchaseData.length === 0) return null;

    const statusCounts = {};
    purchaseData.forEach(order => {
      const status = order.payment_status || 'UNKNOWN';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const colors = {
      'PAID': '#22c55e',
      'COMPLETED': '#22c55e', 
      'FAILED': '#ef4444',
      'PENDING': '#f59e0b',
      'UNKNOWN': '#6b7280'
    };

    return {
      labels: Object.keys(statusCounts),
      datasets: [
        {
          data: Object.values(statusCounts),
          backgroundColor: Object.keys(statusCounts).map(status => colors[status] || '#6b7280'),
          borderWidth: 2,
          borderColor: '#fff'
        }
      ]
    };
  };

  const formatCurrency = (amount) => {
    // Chia cho 10 để hiển thị giá trị nhỏ hơn
    const adjustedAmount = amount / 10;
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(adjustedAmount);
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    const vietnamTime = new Date(date.getTime() + (7 * 60 * 60 * 1000));
    return vietnamTime.toLocaleString('vi-VN');
  };

  const getPaymentStatusBadge = (status) => {
    const variants = {
      'PAID': 'success',
      'COMPLETED': 'success',
      'FAILED': 'danger',
      'PENDING': 'warning'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchPurchaseData();
  };

  useEffect(() => {
    fetchPurchaseData();
  }, []);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            if (context.dataset.label === 'Revenue (VND)') {
              return `Revenue: ${formatCurrency(context.parsed.y)}`;
            }
            return context.label + ': ' + context.parsed;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return formatCurrency(value);
          }
        }
      }
    }
  };

  return (
    <Container fluid>
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h3 className="mb-0">
                <i className="fas fa-chart-bar me-2 text-primary" style={{fontSize: '1.5em'}}></i>
                <span style={{fontSize: '1.2em'}}>Purchase Reports</span>
              </h3>
            </Card.Header>
            <Card.Body>
              {/* Filter Form */}
              <Form onSubmit={handleSubmit} className="mb-4">
                <Row>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Time Period</Form.Label>
                      <Form.Select
                        value={filters.hours}
                        onChange={(e) => handleFilterChange('hours', parseInt(e.target.value))}
                      >
                        <option value={24}>Last 24 hours</option>
                        <option value={72}>Last 3 days</option>
                        <option value={168}>Last week</option>
                        <option value={720}>Last month</option>
                        <option value={2160}>Last 3 months</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>User Email (Optional)</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Filter by user email"
                        value={filters.user_identity}
                        onChange={(e) => handleFilterChange('user_identity', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Payment Status</Form.Label>
                      <Form.Select
                        value={filters.payment_status}
                        onChange={(e) => handleFilterChange('payment_status', e.target.value)}
                      >
                        <option value="">All Statuses</option>
                        <option value="PAID">PAID</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="FAILED">FAILED</option>
                        <option value="PENDING">PENDING</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>&nbsp;</Form.Label>
                      <div>
                        <Button 
                          type="submit" 
                          variant="primary" 
                          disabled={loading}
                          className="w-100"
                        >
                          {loading ? (
                            <>
                              <Spinner size="sm" className="me-2" />
                              Loading...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-search me-2"></i>
                              Generate Report
                            </>
                          )}
                        </Button>
                      </div>
                    </Form.Group>
                  </Col>
                </Row>
              </Form>

              {/* Error Alert */}
              {error && (
                <Alert variant="danger" className="mb-3">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  {error}
                </Alert>
              )}

              {/* Stats Summary */}
              {purchaseData.length > 0 && (
                <Row className="mb-4">
                  <Col md={2}>
                    <Card className="bg-primary text-white h-100">
                      <Card.Body className="text-center">
                        <h4>{stats.totalOrders}</h4>
                        <small>Total Orders</small>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="bg-success text-white h-100">
                      <Card.Body className="text-center">
                        <h5>{formatCurrency(stats.totalRevenue)}</h5>
                        <small>Total Revenue</small>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="bg-info text-white h-100">
                      <Card.Body className="text-center">
                        <h5>{formatCurrency(stats.avgOrderValue)}</h5>
                        <small>Avg Order Value</small>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={2}>
                    <Card className="bg-success text-white h-100">
                      <Card.Body className="text-center">
                        <h4>{stats.completedOrders}</h4>
                        <small>Completed</small>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={2}>
                    <Card className="bg-danger text-white h-100">
                      <Card.Body className="text-center">
                        <h4>{stats.failedOrders}</h4>
                        <small>Failed</small>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              )}

              {/* Charts */}
              {purchaseData.length > 0 && (
                <Row className="mb-4">
                  <Col md={8}>
                    <Card className="h-100">
                      <Card.Header className="bg-success text-white">
                        <h6 className="mb-0">
                          <i className="fas fa-chart-line me-2"></i>
                          Revenue Over Time
                        </h6>
                      </Card.Header>
                      <Card.Body>
                        <div style={{ height: '400px' }}>
                          {getRevenueByTimeChart() && (
                            <Line data={getRevenueByTimeChart()} options={chartOptions} />
                          )}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={4}>
                    <Card className="h-100">
                      <Card.Header className="bg-warning text-dark">
                        <h6 className="mb-0">
                          <i className="fas fa-chart-pie me-2"></i>
                          Payment Status Distribution
                        </h6>
                      </Card.Header>
                      <Card.Body>
                        <div style={{ height: '400px' }}>
                          {getPaymentStatusChart() && (
                            <Doughnut 
                              data={getPaymentStatusChart()} 
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: {
                                    position: 'bottom',
                                  }
                                }
                              }} 
                            />
                          )}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              )}

              {/* Recent Orders Table */}
              {purchaseData.length > 0 && (
                <Row>
                  <Col>
                    <Card>
                      <Card.Header>
                        <h6 className="mb-0">
                          <i className="fas fa-list me-2"></i>
                          Recent Orders ({purchaseData.length} total)
                        </h6>
                      </Card.Header>
                      <Card.Body>
                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                          <Table striped hover responsive>
                            <thead className="table-dark">
                              <tr>
                                <th>Order ID</th>
                                <th>User</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Items</th>
                              </tr>
                            </thead>
                            <tbody>
                              {purchaseData.slice(0, 50).map((order, index) => (
                                <tr key={index}>
                                  <td>
                                    <code style={{ fontSize: '0.8em' }}>
                                      {order.order_id?.substring(0, 8)}...
                                    </code>
                                  </td>
                                  <td>{order.user_identity}</td>
                                  <td>{formatCurrency(order.total_cost || 0)}</td>
                                  <td>{getPaymentStatusBadge(order.payment_status)}</td>
                                  <td>{formatDateTime(order.timestamp)}</td>
                                  <td>
                                    <Badge bg="secondary">
                                      {order.items?.length || 0} items
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              )}

              {/* No Data State */}
              {!loading && purchaseData.length === 0 && (
                <div className="text-center py-5">
                  <i className="fas fa-receipt fa-3x text-muted mb-3"></i>
                  <h5 className="text-muted">No purchase data found</h5>
                  <p className="text-muted">
                    Try adjusting the time range or removing filters to see purchase reports.
                  </p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default PurchaseReports;
