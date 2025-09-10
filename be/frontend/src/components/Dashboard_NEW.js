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
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Welcome to Admin Dashboard</h1>
        <div className="text-muted">
          <i className="fas fa-clock me-1"></i>
          {new Date().toLocaleString()}
        </div>
      </div>
      
      {/* Success Alert */}
      <Alert variant="success" className="mb-4">
        <i className="fas fa-check-circle me-2"></i>
        <strong>Login Successful!</strong> You are now logged in as an administrator.
      </Alert>
      
      {/* User Info Card */}
      <Card className="mb-4">
        <Card.Header className="bg-primary text-white">
          <i className="fas fa-user-circle me-2"></i>
          Admin Information
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <p><strong>Email:</strong> {user?.email || 'Unknown'}</p>
              <p><strong>Role:</strong> 
                <span className="badge bg-success ms-2">
                  {user?.role || 'Unknown'}
                </span>
              </p>
            </Col>
            <Col md={6}>
              <p><strong>Session ID:</strong> 
                <code className="ms-2">{user?.sessionId || 'N/A'}</code>
              </p>
              <p><strong>Login Time:</strong> {new Date().toLocaleString()}</p>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Feature Cards */}
      <Row>
        <Col md={4} className="mb-3">
          <Card className="h-100 border-primary">
            <Card.Body className="text-center">
              <i className="fas fa-box fs-1 text-primary mb-3"></i>
              <Card.Title>Product Management</Card.Title>
              <Card.Text>
                Manage your product inventory, add new items, and update pricing.
              </Card.Text>
              <Button 
                variant="primary" 
                onClick={() => setActiveTab('products')}
              >
                <i className="fas fa-arrow-right me-2"></i>
                Open Products
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4} className="mb-3">
          <Card className="h-100 border-info">
            <Card.Body className="text-center">
              <i className="fas fa-users fs-1 text-info mb-3"></i>
              <Card.Title>User Management</Card.Title>
              <Card.Text>
                View and manage user accounts, permissions, and access levels.
              </Card.Text>
              <Button variant="info" disabled>Coming Soon</Button>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4} className="mb-3">
          <Card className="h-100 border-success">
            <Card.Body className="text-center">
              <i className="fas fa-chart-line fs-1 text-success mb-3"></i>
              <Card.Title>Analytics</Card.Title>
              <Card.Text>
                View sales analytics, user activity, and system performance.
              </Card.Text>
              <Button variant="success" disabled>Coming Soon</Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Debug Information (only in development) */}
      {debug && (
        <Card className="mt-4 border-warning">
          <Card.Header className="bg-warning text-dark">
            <i className="fas fa-bug me-2"></i>
            Debug Information
          </Card.Header>
          <Card.Body>
            <p><strong>Debug Mode:</strong> Enabled</p>
            <p><strong>User Object:</strong></p>
            <pre className="bg-light p-2 rounded">
              {JSON.stringify(user, null, 2)}
            </pre>
          </Card.Body>
        </Card>
      )}
    </>
  );

  return (
    <div className="min-vh-100" style={{ backgroundColor: '#f8f9fa' }}>
      {/* Top Navigation */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
        <Container fluid>
          <span className="navbar-brand mb-0 h1">
            <i className="fas fa-tachometer-alt me-2"></i>
            IoT Cart Admin Dashboard
          </span>
          
          <div className="navbar-nav ms-auto">
            <div className="nav-item dropdown">
              <Button variant="outline-light" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt me-2"></i>
                Logout
              </Button>
            </div>
          </div>
        </Container>
      </nav>

      {/* Main Content */}
      <Container fluid className="py-4">
        {/* Navigation Tabs */}
        <Row className="mb-4">
          <Col>
            <ul className="nav nav-tabs">
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('overview')}
                >
                  <i className="fas fa-tachometer-alt me-2"></i>
                  Overview
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'products' ? 'active' : ''}`}
                  onClick={() => setActiveTab('products')}
                >
                  <i className="fas fa-box me-2"></i>
                  Product Management
                </button>
              </li>
            </ul>
          </Col>
        </Row>

        {/* Tab Content */}
        <Row>
          <Col>
            {renderTabContent()}
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Dashboard;
