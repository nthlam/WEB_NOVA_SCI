// src/components/Header.js
import React, { useState } from 'react';
import { Navbar, Nav, Container, Button, Badge, Modal, Row, Col } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';

const Header = () => {
  const { user, logout } = useAuth();
  const [showAdminModal, setShowAdminModal] = useState(false);

  const handleLogout = () => {
    logout();
  };

  return (
    <>
    <Navbar 
      bg="dark" 
      variant="dark" 
      expand="lg" 
      fixed="top"
      className="shadow-sm"
      style={{ zIndex: 1030 }}
    >
      <Container fluid>
        <Navbar.Brand href="#" className="d-flex align-items-center">
          <i className="fas fa-wifi me-2 text-primary"></i>
          <span className="fw-bold">NOVA-SCI Admin</span>
          <Badge bg="primary" className="ms-2 small">Dashboard</Badge>
        </Navbar.Brand>
        
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto">
            {user && (
              <>
                
                
                <Button 
                  variant="outline-info" 
                  size="sm"
                  className="me-2 d-flex align-items-center"
                  onClick={() => setShowAdminModal(true)}
                >
                  <i className="fas fa-user-shield me-1"></i>
                  Admin
                </Button>
                
                <Button 
                  variant="outline-light" 
                  size="sm"
                  onClick={handleLogout}
                  className="d-flex align-items-center"
                >
                  <i className="fas fa-sign-out-alt me-1"></i>
                  Logout
                </Button>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>

    {/* Admin Details Modal */}
    <Modal show={showAdminModal} onHide={() => setShowAdminModal(false)} centered>
      <Modal.Header closeButton className="bg-primary text-white">
        <Modal.Title>
          <i className="fas fa-user-shield me-2"></i>
          Administrator Details
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row>
          <Col md={6}>
            <div className="mb-3">
              <strong className="text-muted">Email Address</strong>
              <div className="fs-6">{user?.email || 'Unknown'}</div>
            </div>
            <div className="mb-3">
              <strong className="text-muted">User Role</strong>
              <div>
                <span className="badge bg-success fs-6 px-3 py-2">
                  <i className="fas fa-crown me-1"></i>
                  {user?.role || 'Unknown'}
                </span>
              </div>
            </div>
          </Col>
          <Col md={6}>
            <div className="mb-3">
              <strong className="text-muted">Session ID</strong>
              <div className="font-monospace text-break" style={{fontSize: '0.9em'}}>
                {user?.sessionId || 'N/A'}
              </div>
            </div>
            <div className="mb-3">
              <strong className="text-muted">Login Time</strong>
              <div className="text-muted">
                {new Date().toLocaleString('vi-VN')}
              </div>
            </div>
          </Col>
        </Row>
        <Row className="mt-3">
          <Col>
            <div className="d-flex gap-2">
              <span className="badge bg-info px-3 py-2">
                <i className="fas fa-shield-alt me-1"></i>
                Authenticated
              </span>
              <span className="badge bg-warning text-dark px-3 py-2">
                <i className="fas fa-key me-1"></i>
                Admin Access
              </span>
            </div>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => setShowAdminModal(false)}>
          <i className="fas fa-times me-2"></i>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
    </>
  );
};

export default Header;
