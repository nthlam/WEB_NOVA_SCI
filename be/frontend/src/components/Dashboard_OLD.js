// src/components/Dashboard.js
import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import ProductManagement from './ProductManagement';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const debug = process.env.REACT_APP_DEBUG === 'true';

  const log = (message, data = null) => {
    if (debug) {
      console.log(`[Dashboard Component] ${message}`, data ? data : '');
    }
  };

  const handleLogout = () => {
    log('Logout clicked');
    logout();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'products':
        return <ProductManagement />;
      case 'overview':
      default:
        return renderOverview();
    }
  };

  const renderOverview = () => (
    <div className="min-vh-100" style={{ backgroundColor: '#f8f9fa' }}>
      {/* Top Navigation */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
        <Container fluid>
          <span className="navbar-brand mb-0 h1">
            <i className="bi bi-speedometer2 me-2"></i>
            IoT Cart Admin Dashboard
          </span>
          
          <div className="navbar-nav ms-auto">
            <div className="nav-item dropdown">
              <Button variant="outline-light" onClick={handleLogout}>
                <i className="bi bi-box-arrow-right me-2"></i>
                Logout
              </Button>
            </div>
          </div>
        </Container>
      </nav>

      {/* Main Content */}
      <Container fluid className="py-4">
        <Row>
          <Col>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h1>Welcome to Admin Dashboard</h1>
              <div className="text-muted">
                <i className="bi bi-clock me-1"></i>
                {new Date().toLocaleString()}
              </div>
            </div>
            
            {/* Success Alert */}
            <Alert variant="success" className="mb-4">
              <i className="bi bi-check-circle me-2"></i>
              <strong>Login Successful!</strong> You are now logged in as an administrator.
            </Alert>
            
            {/* User Info Card */}
            <Card className="mb-4">
              <Card.Header className="bg-primary text-white">
                <i className="bi bi-person-circle me-2"></i>
                Admin Information
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <p><strong>Email:</strong> {user?.email}</p>
                    <p><strong>Role:</strong> <span className="badge bg-primary">{user?.role}</span></p>
                    <p><strong>Session ID:</strong> <code>{user?.sessionId}</code></p>
                  </Col>
                  <Col md={6}>
                    <p><strong>Token Expiry:</strong> {user?.exp ? new Date(user.exp * 1000).toLocaleString() : 'N/A'}</p>
                    <p><strong>Status:</strong> <span className="badge bg-success">Active</span></p>
                    <p><strong>Login Time:</strong> {new Date().toLocaleString()}</p>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* Quick Stats */}
            <Row className="mb-4">
              <Col md={3}>
                <Card className="text-center">
                  <Card.Body>
                    <i className="bi bi-cart text-primary" style={{ fontSize: '2rem' }}></i>
                    <h5 className="mt-2">Shopping Carts</h5>
                    <p className="text-muted">Manage cart data</p>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="text-center">
                  <Card.Body>
                    <i className="bi bi-box text-success" style={{ fontSize: '2rem' }}></i>
                    <h5 className="mt-2">Products</h5>
                    <p className="text-muted">Product management</p>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="text-center">
                  <Card.Body>
                    <i className="bi bi-activity text-warning" style={{ fontSize: '2rem' }}></i>
                    <h5 className="mt-2">Motion Logs</h5>
                    <p className="text-muted">Sensor activity</p>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="text-center">
                  <Card.Body>
                    <i className="bi bi-people text-info" style={{ fontSize: '2rem' }}></i>
                    <h5 className="mt-2">Sessions</h5>
                    <p className="text-muted">User sessions</p>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Coming Soon Notice */}
            <Card className="text-center">
              <Card.Body className="py-5">
                <i className="bi bi-tools text-muted" style={{ fontSize: '3rem' }}></i>
                <h3 className="mt-3 text-muted">Dashboard Features Coming Soon</h3>
                <p className="text-muted">
                  Additional dashboard features will be implemented step by step.
                </p>
              </Card.Body>
            </Card>

            {/* Debug Info */}
            {debug && (
              <Card className="mt-4 border-warning">
                <Card.Header className="bg-warning text-dark">
                  <i className="bi bi-bug me-2"></i>
                  Debug Information
                </Card.Header>
                <Card.Body>
                  <pre className="mb-0">
                    {JSON.stringify(user, null, 2)}
                  </pre>
                </Card.Body>
              </Card>
            )}
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Dashboard;
