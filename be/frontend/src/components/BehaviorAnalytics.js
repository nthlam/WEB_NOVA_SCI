// src/components/BehaviorAnalytics.js
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
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
  Legend
);

const BehaviorAnalytics = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [motionData, setMotionData] = useState([]);
  const [chartData, setChartData] = useState({ add: null, remove: null });
  const [filters, setFilters] = useState({
    hours: 24,
    session_id: '',
    cart_id: ''
  });

  const fetchMotionLogs = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      params.append('limit', '1000'); // Always max limit
      params.append('hours', filters.hours);
      
      if (filters.session_id.trim()) {
        params.append('session_id', filters.session_id.trim());
      }
      
      if (filters.cart_id.trim()) {
        params.append('cart_id', filters.cart_id.trim());
      }

      const response = await axios.get(`http://localhost:5001/api/motion/logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setMotionData(response.data);
      processChartData(response.data);
      
    } catch (error) {
      console.error('Error loading motion logs:', error);
      setError('Failed to load motion logs: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (data) => {
    // Create hourly buckets (0-23)
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const addCounts = new Array(24).fill(0);
    const removeCounts = new Array(24).fill(0);

    // Process each log entry
    data.forEach(log => {
      const timestamp = new Date(log.timestamp);
      // Convert to Vietnam time (+7 hours)
      const vietnamTime = new Date(timestamp.getTime() + (7 * 60 * 60 * 1000));
      const hour = vietnamTime.getHours();
      
      if (log.state === 1) { // Add operation
        addCounts[hour]++;
      } else if (log.state === 2) { // Remove operation
        removeCounts[hour]++;
      }
    });

    // Calculate max values for scaling
    const maxAddCount = Math.max(...addCounts);
    const maxRemoveForScale = Math.ceil(maxAddCount / 3); // Remove max = 1/3 of add max

    // Create chart data
    const addChartData = {
      labels: hours.map(h => `${h.toString().padStart(2, '0')}:00`),
      datasets: [
        {
          label: 'Add Operations',
          data: addCounts,
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

    const removeChartData = {
      labels: hours.map(h => `${h.toString().padStart(2, '0')}:00`),
      datasets: [
        {
          label: 'Remove Operations',
          data: removeCounts,
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgb(239, 68, 68)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
        }
      ]
    };

    setChartData({
      add: addChartData,
      remove: removeChartData,
      maxRemoveForScale: maxRemoveForScale
    });
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          title: function(context) {
            const hour = context[0].label;
            return `Time: ${hour} - ${(parseInt(hour.split(':')[0]) + 1).toString().padStart(2, '0')}:00`;
          },
          label: function(context) {
            const count = context.parsed.y;
            const operation = context.dataset.label;
            return `${operation}: ${count} times`;
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Hour of Day',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Operations',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          stepSize: 1
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  // Separate options for remove chart with scaled Y-axis
  const removeChartOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y: {
        ...chartOptions.scales.y,
        max: chartData.maxRemoveForScale || undefined
      }
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchMotionLogs();
  };

  useEffect(() => {
    fetchMotionLogs();
  }, []);

  const getStatsFromData = () => {
    const addCount = motionData.filter(log => log.state === 1).length;
    const removeCount = motionData.filter(log => log.state === 2).length;
    const totalCount = addCount + removeCount;
    
    return { addCount, removeCount, totalCount };
  };

  const stats = getStatsFromData();

  return (
    <Container fluid>
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h3 className="mb-0">
                <i className="fas fa-chart-line me-2 text-primary" style={{fontSize: '1.5em'}}></i>
                <span style={{fontSize: '1.2em'}}>Behavior Analytics</span>
              </h3>
            </Card.Header>
            <Card.Body>
              {/* Filter Form */}
              <Form onSubmit={handleSubmit} className="mb-4">
                <Row>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Hours Back</Form.Label>
                      <Form.Select
                        value={filters.hours}
                        onChange={(e) => handleFilterChange('hours', parseInt(e.target.value))}
                      >
                        <option value={6}>Last 6 hours</option>
                        <option value={12}>Last 12 hours</option>
                        <option value={24}>Last 24 hours</option>
                        <option value={48}>Last 2 days</option>
                        <option value={72}>Last 3 days</option>
                        <option value={168}>Last week</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Session ID (Optional)</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Filter by session"
                        value={filters.session_id}
                        onChange={(e) => handleFilterChange('session_id', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Cart ID (Optional)</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Filter by cart"
                        value={filters.cart_id}
                        onChange={(e) => handleFilterChange('cart_id', e.target.value)}
                      />
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
                              <i className="fas fa-chart-bar me-2"></i>
                              Generate Charts
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

              {/* Charts */}
              {chartData.add && chartData.remove && (
                <Row>
                  <Col md={6} className="mb-4">
                    <Card className="h-100">
                      <Card.Header className="bg-success text-white">
                        <h6 className="mb-0">
                          <i className="fas fa-plus-circle me-2"></i>
                          Add Operations by Hour
                        </h6>
                      </Card.Header>
                      <Card.Body>
                        <div style={{ height: '400px' }}>
                          <Line data={chartData.add} options={chartOptions} />
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6} className="mb-4">
                    <Card className="h-100">
                      <Card.Header className="bg-danger text-white">
                        <h6 className="mb-0">
                          <i className="fas fa-minus-circle me-2"></i>
                          Remove Operations by Hour
                        </h6>
                      </Card.Header>
                      <Card.Body>
                        <div style={{ height: '400px' }}>
                          <Line data={chartData.remove} options={removeChartOptions} />
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              )}

              {/* No Data State */}
              {!loading && motionData.length === 0 && (
                <div className="text-center py-5">
                  <i className="fas fa-chart-line fa-3x text-muted mb-3"></i>
                  <h5 className="text-muted">No motion data found</h5>
                  <p className="text-muted">
                    Try adjusting the time range or removing filters to see behavior analytics.
                  </p>
                </div>
              )}

              {/* Additional Info */}
              {motionData.length > 0 && (
                <Row className="mt-4">
                  <Col>
                    <Card className="border-0 bg-light">
                      <Card.Body>
                        <h6 className="mb-2">
                          <i className="fas fa-info-circle text-info me-2"></i>
                          Chart Information
                        </h6>
                        <div className="text-muted">
                          <small>
                            • <strong>Time Grouping:</strong> Operations are grouped by hour of day (24-hour format)<br/>
                            • <strong>Multi-day Data:</strong> When selecting multiple days, operations are summed for each hour<br/>
                            • <strong>Add Operations:</strong> State = 1 (items added to cart)<br/>
                            • <strong>Remove Operations:</strong> State = 2 (items removed from cart)<br/>
                            • <strong>Data Limit:</strong> Maximum 1000 most recent records
                          </small>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default BehaviorAnalytics;
