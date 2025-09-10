// src/components/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Container, Row, Col, Spinner } from 'react-bootstrap';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  const debug = process.env.REACT_APP_DEBUG === 'true';

  const log = (message, data = null) => {
    if (debug) {
      console.log(`[ProtectedRoute] ${message}`, data ? data : '');
    }
  };

  // Show loading spinner while checking authentication
  if (loading) {
    log('Loading authentication status...');
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{
        background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
      }}>
        <Container>
          <Row className="justify-content-center">
            <Col xs="auto" className="text-center text-white">
              <Spinner animation="border" role="status" size="lg" className="mb-3">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
              <div>
                <h5>Loading Dashboard...</h5>
                <p className="mb-0">Verifying authentication</p>
              </div>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    log('User not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  log('User authenticated, rendering protected content');
  return children;
};

export default ProtectedRoute;
