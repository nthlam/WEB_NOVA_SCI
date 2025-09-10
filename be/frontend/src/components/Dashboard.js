// src/components/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Navbar, Nav, Dropdown } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import Header from './Header';
import ProductManagement from './ProductManagement';
import HeatmapAnalytics from './HeatmapAnalytics';
import BehaviorAnalytics from './BehaviorAnalytics';
import PurchaseReports from './PurchaseReports';
import authService from '../services/authService';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Khởi động auto-refresh token khi component mount
  useEffect(() => {
    authService.startAutoRefresh();
    
    return () => {
      authService.stopAutoRefresh();
    };
  }, []);  const handleLogout = () => {
    logout();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'products':
        return <ProductManagement />;
      case 'heatmap':
        return <HeatmapAnalytics />;
      case 'behavior':
        return <BehaviorAnalytics />;
      case 'reports':
        return <PurchaseReports />;
      case 'overview':
      default:
        return renderOverview();
    }
  };

  const renderOverview = () => (
    <>
      {/* Welcome Header with Image */}
      <div className="mb-4">
        <Row className="align-items-center">
          <Col md={8}>
            <h1 className="mb-2">Welcome to NOVA-SCI Admin Dashboard</h1>
            <p className="text-muted fs-5 mb-0">
              Your comprehensive IoT shopping cart management system
            </p>
          </Col>
          <Col md={4} className="text-end">
            <img 
              src="/welcome.png" 
              alt="NOVA-SCI Welcome" 
              className="img-fluid rounded shadow-sm"
              style={{maxHeight: '120px', objectFit: 'contain'}}
            />
          </Col>
        </Row>
        <hr className="my-4" />
      </div>

      {/* Main Feature Cards - Analytics & Management */}
      <Row className="g-4 mb-4">
        <Col lg={6} md={6}>
          <Card className="h-100 border-primary shadow-sm">
            <Card.Body className="text-center p-4">
              <div className="mb-3">
                <i className="fas fa-map-marked-alt text-primary mb-3" style={{fontSize: '4em'}}></i>
              </div>
              <Card.Title className="h4 text-primary">Heatmap Analytics</Card.Title>
              <Card.Text className="text-muted mb-4">
                Visualize customer movement patterns and UWB tracking data with interactive heatmaps
              </Card.Text>
              <Button 
                variant="primary" 
                size="lg"
                className="px-4"
                onClick={() => setActiveTab('heatmap')}
              >
                <i className="fas fa-chart-area me-2"></i>
                Launch Heatmap
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6} md={6}>
          <Card className="h-100 border-info shadow-sm">
            <Card.Body className="text-center p-4">
              <div className="mb-3">
                <i className="fas fa-chart-line text-primary mb-3" style={{fontSize: '4em'}}></i>
              </div>
              <Card.Title className="h4 text-primary">Behavior Analytics</Card.Title>
              <Card.Text className="text-muted mb-4">
                Analyze customer add/remove patterns and shopping behavior trends by time
              </Card.Text>
              <Button 
                variant="primary" 
                size="lg"
                className="px-4"
                onClick={() => setActiveTab('behavior')}
              >
                <i className="fas fa-analytics me-2"></i>
                View Behavior
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Secondary Feature Cards */}
      <Row className="g-4">
        <Col lg={4} md={6}>
          <Card className="h-100 border-success shadow-sm">
            <Card.Body className="text-center">
              <i className="fas fa-box text-success mb-3" style={{fontSize: '2.5em'}}></i>
              <Card.Title className="h5">Product Management</Card.Title>
              <Card.Text>
                Manage inventory, pricing, and product information
              </Card.Text>
              <Button 
                variant="outline-success" 
                onClick={() => setActiveTab('products')}
              >
                <i className="fas fa-cog me-2"></i>
                Manage Products
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4} md={6}>
          <Card className="h-100 border-warning shadow-sm">
            <Card.Body className="text-center">
              <i className="fas fa-chart-bar text-warning mb-3" style={{fontSize: '2.5em'}}></i>
              <Card.Title className="h5">Purchase Reports</Card.Title>
              <Card.Text>
                Revenue analytics, payment status, and sales reports
              </Card.Text>
              <Button 
                variant="outline-warning" 
                onClick={() => setActiveTab('reports')}
              >
                <i className="fas fa-file-invoice me-2"></i>
                View Reports
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4} md={6}>
          <Card className="h-100 border-secondary shadow-sm">
            <Card.Body className="text-center">
              <i className="fas fa-user-tie text-secondary mb-3" style={{fontSize: '2.5em'}}></i>
              <Card.Title className="h5">Staff Management</Card.Title>
              <Card.Text>
                Employee management and staff scheduling tools
              </Card.Text>
              <Button variant="outline-secondary" disabled>
                <i className="fas fa-users me-2"></i>
                Coming Soon
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );

  return (
    <div className="min-vh-100 fixed-header-body" style={{ backgroundColor: '#f8f9fa' }}>
      {/* Fixed Header */}
      <Header />

      {/* Main Content with proper spacing for fixed header */}
      <div className="main-content">
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
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'heatmap' ? 'active' : ''}`}
                  onClick={() => setActiveTab('heatmap')}
                  style={{fontSize: '1.1em'}}
                >
                  <i className="fas fa-map-marked-alt me-2 text-primary" style={{fontSize: '1.3em'}}></i>
                  Heatmap Analytics
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'behavior' ? 'active' : ''}`}
                  onClick={() => setActiveTab('behavior')}
                  style={{fontSize: '1.1em'}}
                >
                  <i className="fas fa-chart-line me-2 text-primary" style={{fontSize: '1.3em'}}></i>
                  Behavior Analytics
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'reports' ? 'active' : ''}`}
                  onClick={() => setActiveTab('reports')}
                  style={{fontSize: '1.1em'}}
                >
                  <i className="fas fa-chart-bar me-2 text-primary" style={{fontSize: '1.3em'}}></i>
                  Purchase Reports
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
      </div> {/* Close main-content div */}
    </div>
  );
};

export default Dashboard;
