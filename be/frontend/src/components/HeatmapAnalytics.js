// src/components/HeatmapAnalytics.js
import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Toast, ToastContainer } from 'react-bootstrap';
import axios from 'axios';

const HeatmapAnalytics = () => {
  const canvasRef = useRef(null);
  const [mapImage, setMapImage] = useState(null);
  const [uwbData, setUwbData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [sessionIds, setSessionIds] = useState([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [filters, setFilters]= useState({
    session_id: '',
    limit: 100,
    hours: 24
  });
  const [heatmapSettings, setHeatmapSettings] = useState({
    intensity: 1.0,
    opacity: 0.7,
    showGrid: true,
    showDataPoints: false
  });

  // Map coordinates configuration
  const [MAP_CONFIG, setMapConfig] = useState({
    maxX: 3320,
    maxY: 6900,
    canvasWidth: 1000, // Default size, will be adjusted based on image aspect ratio
    canvasHeight: 600,
    aspectRatio: 6900 / 3320 // Y/X ratio for proper scaling
  });

  useEffect(() => {
    loadMapImage();
  }, []);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadUWBData();
      }, 30000); // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, filters]);

  useEffect(() => {
    // Redraw heatmap when settings change
    if (uwbData.length > 0) {
      drawHeatmap(uwbData);
    }
  }, [heatmapSettings, MAP_CONFIG]); // Added MAP_CONFIG dependency

  const loadMapImage = async () => {
    try {
      setLoading(true);
      
      // Create image element to get natural dimensions
      const img = new Image();
      img.onload = () => {
        console.log(`Image natural size: ${img.naturalWidth}x${img.naturalHeight}`);
        
        // Calculate proper canvas size maintaining aspect ratio
        const imageAspectRatio = img.naturalWidth / img.naturalHeight;
        const maxCanvasWidth = 1200; // Maximum width for responsive design
        const maxCanvasHeight = 800; // Maximum height
        
        let canvasWidth, canvasHeight;
        
        // Scale to fit within max dimensions while preserving aspect ratio
        if (imageAspectRatio > maxCanvasWidth / maxCanvasHeight) {
          // Image is wider, constrain by width
          canvasWidth = maxCanvasWidth;
          canvasHeight = Math.round(maxCanvasWidth / imageAspectRatio);
        } else {
          // Image is taller, constrain by height
          canvasHeight = maxCanvasHeight;
          canvasWidth = Math.round(maxCanvasHeight * imageAspectRatio);
        }
        
        // Update map config with proper dimensions
        setMapConfig(prev => ({
          ...prev,
          canvasWidth,
          canvasHeight,
          aspectRatio: img.naturalWidth / img.naturalHeight,
          imageWidth: img.naturalWidth,
          imageHeight: img.naturalHeight
        }));
        
        console.log(`Canvas adjusted to: ${canvasWidth}x${canvasHeight} (aspect: ${imageAspectRatio.toFixed(2)})`);
      };
      
      img.onerror = () => {
        console.error('Failed to load image');
        setError('Failed to load map image');
      };
      
      // Use local map image directly
      img.src = '/map_ok.jpg';
      setMapImage('/map_ok.jpg');
      console.log('Using local map image: /map_ok.jpg');
      
    } catch (error) {
      console.error('Error loading map:', error);
      setError('Failed to load map image');
      // Fallback to local image
      setMapImage('/map_ok.jpg');
    } finally {
      setLoading(false);
    }
  };

  const loadUWBData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (filters.session_id.trim()) {
        params.append('session_id', filters.session_id.trim());
      }
      params.append('limit', filters.limit);
      params.append('hours', filters.hours);

      const response = await axios.get(`http://localhost:5001/api/motion/uwb-locations?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setUwbData(response.data);
      setLastUpdate(new Date());
      
      // Extract unique session IDs from the response
      const uniqueSessionIds = [...new Set(response.data
        .map(point => point.session_id)
        .filter(id => id && id.trim() !== '')
      )].sort();
      setSessionIds(uniqueSessionIds);
      
      // Show success toast
      const sessionInfo = filters.session_id 
        ? ` for session: ${filters.session_id}` 
        : uniqueSessionIds.length > 0 
          ? ` (${uniqueSessionIds.length} sessions detected)` 
          : '';
      
      const dataStats = response.data.length > 0 
        ? ` • Last ${filters.hours}h • Limit: ${filters.limit}` 
        : '';
      
      showToastMessage(`✅ ${response.data.length} location points loaded${sessionInfo}${dataStats}`);
      
      drawHeatmap(response.data);
    } catch (error) {
      console.error('Error loading UWB data:', error);
      setError('Failed to load UWB location data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const drawHeatmap = (data) => {
    const canvas = canvasRef.current;
    if (!canvas || !mapImage) return;

    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw map background - maintain aspect ratio and fill canvas
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Draw grid lines first (before heatmap) - only if enabled
      if (heatmapSettings.showGrid) {
        drawGridLines(ctx, canvas);
      }
      
      if (data.length === 0) return;
      
      // Create heatmap points array
      const heatmapPoints = data.map(point => {
        // Convert coordinates from UWB space to canvas space
        // NEW COORDINATE SYSTEM:
        // UWB: X is vertical (0-3320, increases bottom to top), Y is horizontal (0-6900, increases left to right)
        // Canvas: origin top-left
        const canvasX = (point.y / MAP_CONFIG.maxY) * canvas.width;  // Y maps to canvas X (horizontal)
        const canvasY = canvas.height - (point.x / MAP_CONFIG.maxX) * canvas.height; // X maps to canvas Y (vertical, flipped)
        
        return {
          x: canvasX,
          y: canvasY,
          intensity: 1 // You can adjust this based on tracking_mode or other data
        };
      });
      
      // Create heatmap overlay
      const heatmapCanvas = document.createElement('canvas');
      heatmapCanvas.width = canvas.width;
      heatmapCanvas.height = canvas.height;
      const heatmapCtx = heatmapCanvas.getContext('2d');
      
      // Draw density-based heatmap
      const heatmapData = createHeatmapData(heatmapPoints, canvas.width, canvas.height);
      drawHeatmapFromData(heatmapCtx, heatmapData, canvas.width, canvas.height);
      
      // Overlay heatmap on main canvas with better blend mode
      ctx.globalCompositeOperation = 'source-over'; // Normal blending for better color visibility
      ctx.globalAlpha = heatmapSettings.opacity;
      ctx.drawImage(heatmapCanvas, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      
      // Draw data points for better visibility - only if enabled
      // Removed data points rendering to show only heatmap colors
      // if (heatmapSettings.showDataPoints) {
      //   drawDataPoints(ctx, heatmapPoints);
      // }
      
      // Draw coordinate info
      drawCoordinateInfo(ctx, canvas, data);
    };
    
    img.src = mapImage;
  };

  const createHeatmapData = (points, width, height) => {
    const gridSize = 5; // Smaller grid for higher resolution
    const gridWidth = Math.ceil(width / gridSize);
    const gridHeight = Math.ceil(height / gridSize);
    const grid = Array(gridHeight).fill().map(() => Array(gridWidth).fill(0));
    
    // Count points in each grid cell with extended influence
    points.forEach(point => {
      const centerGridX = Math.floor(point.x / gridSize);
      const centerGridY = Math.floor(point.y / gridSize);
      const influence = 3; // Extend influence to surrounding cells
      
      for (let dy = -influence; dy <= influence; dy++) {
        for (let dx = -influence; dx <= influence; dx++) {
          const gridX = centerGridX + dx;
          const gridY = centerGridY + dy;
          
          if (gridX >= 0 && gridX < gridWidth && gridY >= 0 && gridY < gridHeight) {
            const distance = Math.sqrt(dx * dx + dy * dy);
            const weight = Math.exp(-distance * distance / (2 * influence * influence));
            grid[gridY][gridX] += point.intensity * weight;
          }
        }
      }
    });
    
    // Apply Gaussian blur for smoother heatmap
    return applyGaussianBlur(grid, 3); // Increased blur radius
  };

  const applyGaussianBlur = (grid, radius) => {
    const height = grid.length;
    const width = grid[0].length;
    const result = Array(height).fill().map(() => Array(width).fill(0));
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let weightSum = 0;
        
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              const distance = Math.sqrt(dx * dx + dy * dy);
              const weight = Math.exp(-distance * distance / (2 * radius * radius));
              sum += grid[ny][nx] * weight;
              weightSum += weight;
            }
          }
        }
        
        result[y][x] = weightSum > 0 ? sum / weightSum : 0;
      }
    }
    
    return result;
  };

  const drawHeatmapFromData = (ctx, heatmapData, width, height) => {
    const gridSize = 5; // Smaller grid for smoother heatmap
    const maxValue = Math.max(...heatmapData.flat());
    
    if (maxValue === 0) return;
    
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const gridX = Math.floor(x / gridSize);
        const gridY = Math.floor(y / gridSize);
        
        if (gridY < heatmapData.length && gridX < heatmapData[0].length) {
          const intensity = heatmapData[gridY][gridX] / maxValue;
          
          // Only draw if there's meaningful intensity for cleaner look
          if (intensity > 0.02) {
            const color = getHeatmapColor(intensity);
            
            const index = (y * width + x) * 4;
            data[index] = color.r;     // Red
            data[index + 1] = color.g; // Green
            data[index + 2] = color.b; // Blue
            data[index + 3] = color.a; // Alpha
          }
        }
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  };

  const getHeatmapColor = (intensity) => {
    if (intensity === 0) {
      return { r: 0, g: 0, b: 0, a: 0 };
    }
    
    // Color gradient: Blue -> Cyan -> Yellow -> Red
    const colors = [
      { r: 0, g: 0, b: 255 },     // Blue
      { r: 0, g: 255, b: 255 },   // Cyan
      { r: 255, g: 255, b: 0 },   // Yellow
      { r: 255, g: 0, b: 0 }      // Red
    ];
    
    const scaledIntensity = Math.min(1, intensity * heatmapSettings.intensity) * (colors.length - 1);
    const index = Math.floor(scaledIntensity);
    const fraction = scaledIntensity - index;
    
    if (index >= colors.length - 1) {
      return { ...colors[colors.length - 1], a: Math.min(255, intensity * heatmapSettings.intensity * 150) };
    }
    
    const color1 = colors[index];
    const color2 = colors[index + 1];
    
    return {
      r: Math.round(color1.r + (color2.r - color1.r) * fraction),
      g: Math.round(color1.g + (color2.g - color1.g) * fraction),
      b: Math.round(color1.b + (color2.b - color1.b) * fraction),
      a: Math.min(255, intensity * heatmapSettings.intensity * 150)
    };
  };

  const drawDataPoints = (ctx, points) => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.lineWidth = 1;
    
    points.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    });
  };

  const drawGridLines = (ctx, canvas) => {
    // Grid configuration - made bolder
    const majorGridSpacing = 80; // Major grid every 80 pixels  
    const minorGridSpacing = 40;  // Minor grid every 40 pixels
    
    // Calculate spacing based on map coordinates (with swapped axes)
    const xMajorSpacing = (MAP_CONFIG.maxY / canvas.width) * majorGridSpacing; // Y maps to canvas X
    const yMajorSpacing = (MAP_CONFIG.maxX / canvas.height) * majorGridSpacing; // X maps to canvas Y
    const xMinorSpacing = (MAP_CONFIG.maxY / canvas.width) * minorGridSpacing;
    const yMinorSpacing = (MAP_CONFIG.maxX / canvas.height) * minorGridSpacing;
    
    ctx.save();
    
    // Minor grid lines (stronger than before)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; // Increased opacity
    ctx.lineWidth = 1; // Increased width
    ctx.setLineDash([3, 6]);
    
    // Vertical minor lines
    for (let x = minorGridSpacing; x < canvas.width; x += minorGridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    
    // Horizontal minor lines  
    for (let y = minorGridSpacing; y < canvas.height; y += minorGridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    
    // Major grid lines (much stronger)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; // Increased opacity
    ctx.lineWidth = 2; // Increased width
    ctx.setLineDash([6, 3]);
    
    // Add shadow for better visibility
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    
    // Vertical major lines with labels
    for (let x = majorGridSpacing; x < canvas.width; x += majorGridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
      
      // Add coordinate label (Y coordinate because X canvas maps to Y UWB)
      const mapY = Math.round((x / canvas.width) * MAP_CONFIG.maxY);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 11px Arial';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeText(`Y:${mapY}`, x + 3, 15);
      ctx.fillText(`Y:${mapY}`, x + 3, 15);
    }
    
    // Horizontal major lines with labels
    for (let y = majorGridSpacing; y < canvas.height; y += majorGridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
      
      // Add coordinate label (X coordinate because Y canvas maps to X UWB, flipped)
      const mapX = Math.round(MAP_CONFIG.maxX - (y / canvas.height) * MAP_CONFIG.maxX);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 11px Arial';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeText(`X:${mapX}`, 3, y - 3);
      ctx.fillText(`X:${mapX}`, 3, y - 3);
    }
    
    // Corner labels for reference (updated coordinate system)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = 'bold 13px Arial';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.lineWidth = 2;
    
    // Top-left: X=3320, Y=0
    ctx.strokeText('(X:3320,Y:0)', 8, 18);
    ctx.fillText('(X:3320,Y:0)', 8, 18);
    
    // Top-right: X=3320, Y=6900
    ctx.strokeText('(X:3320,Y:6900)', canvas.width - 120, 18);
    ctx.fillText('(X:3320,Y:6900)', canvas.width - 120, 18);
    
    // Bottom-left: X=0, Y=0
    ctx.strokeText('(X:0,Y:0)', 8, canvas.height - 8);
    ctx.fillText('(X:0,Y:0)', 8, canvas.height - 8);
    
    // Bottom-right: X=0, Y=6900
    ctx.strokeText('(X:0,Y:6900)', canvas.width - 100, canvas.height - 8);
    ctx.fillText('(X:0,Y:6900)', canvas.width - 100, canvas.height - 8);
    
    ctx.restore();
  };

  const drawCoordinateInfo = (ctx, canvas, data) => {
    if (data.length === 0) return;
    
    // Legend removed - displaying only heatmap without annotations
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const showToastMessage = (message) => {
    setToastMessage(message);
    setShowToast(true);
    // Auto hide after 3 seconds
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    loadUWBData();
  };

  const exportHeatmap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `heatmap_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const exportData = () => {
    if (uwbData.length === 0) return;
    
    const csvContent = [
      'timestamp,x,y,session_id,cart_id,filtered,tracking_mode',
      ...uwbData.map(point => 
        `${point.timestamp},${point.x},${point.y},${point.session_id},${point.cart_id},${point.filtered},${point.tracking_mode}`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.download = `uwb_data_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  return (
    <Container fluid>
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h3 className="mb-0">
                <i className="fas fa-map-marked-alt me-2 text-primary" style={{fontSize: '1.5em'}}></i>
                <span style={{fontSize: '1.2em'}}>Heatmap Analytics</span>
              </h3>
            </Card.Header>
            <Card.Body>
              {/* Filter Form */}
              <Form onSubmit={handleSubmit} className="mb-4">
                <Row>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Session ID</Form.Label>
                      <Form.Select
                        value={filters.session_id}
                        onChange={(e) => handleFilterChange('session_id', e.target.value)}
                      >
                        <option value="">All Sessions</option>
                        {sessionIds.map(sessionId => (
                          <option key={sessionId} value={sessionId}>
                            {sessionId}
                          </option>
                        ))}
                      </Form.Select>
                      {sessionIds.length === 0 && (
                        <Form.Text className="text-muted">
                          Generate heatmap first to see available sessions
                        </Form.Text>
                      )}
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Limit Records</Form.Label>
                      <Form.Control
                        type="number"
                        min="1"
                        max="10000"
                        value={filters.limit}
                        onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Hours Back</Form.Label>
                      <Form.Control
                        type="number"
                        min="1"
                        max="168"
                        value={filters.hours}
                        onChange={(e) => handleFilterChange('hours', parseInt(e.target.value))}
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
                          className="me-2"
                        >
                          {loading ? (
                            <>
                              <Spinner size="sm" className="me-2" />
                              Loading...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-search me-2"></i>
                              Generate Heatmap
                            </>
                          )}
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline-secondary"
                          onClick={loadMapImage}
                          className="me-2"
                        >
                          <i className="fas fa-image me-2"></i>
                          Reload Map & Resize
                        </Button>
                      </div>
                      <div className="mt-2">
                        <Form.Check
                          type="switch"
                          id="auto-refresh-switch"
                          label="Auto-refresh (30s)"
                          checked={autoRefresh}
                          onChange={(e) => setAutoRefresh(e.target.checked)}
                        />
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

              {/* Export Controls */}
              {uwbData.length > 0 && (
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div className="d-flex align-items-center">
                    <div className="me-4">
                      <small className="text-muted">Data Points:</small>
                      <strong className="ms-1">{uwbData.length}</strong>
                    </div>
                    <div className="me-4">
                      <small className="text-muted">Sessions:</small>
                      <strong className="ms-1">{sessionIds.length}</strong>
                    </div>
                    {lastUpdate && (
                      <div className="me-4">
                        <small className="text-muted">Updated:</small>
                        <strong className="ms-1">{lastUpdate.toLocaleTimeString()}</strong>
                      </div>
                    )}
                  </div>
                  <div className="btn-group">
                    <Button 
                      variant="outline-primary" 
                      size="sm" 
                      className="me-2"
                      onClick={exportHeatmap}
                    >
                      <i className="fas fa-download me-2"></i>
                      Export Heatmap
                    </Button>
                    <Button 
                      variant="outline-success" 
                      size="sm"
                      onClick={exportData}
                    >
                      <i className="fas fa-file-csv me-2"></i>
                      Export Data (CSV)
                    </Button>
                  </div>
                </div>
              )}

              {/* Heatmap Canvas Container */}
              <div className="text-center mb-3">
                <div className="position-relative d-inline-block" style={{ maxWidth: '100%', overflow: 'auto' }}>
                  <canvas
                    ref={canvasRef}
                    width={MAP_CONFIG.canvasWidth}
                    height={MAP_CONFIG.canvasHeight}
                    style={{
                      border: '2px solid #dee2e6',
                      borderRadius: '8px',
                      maxWidth: '100%',
                      height: 'auto',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                      display: 'block',
                      margin: '0 auto' // Center the canvas
                    }}
                  />
                  {loading && (
                    <div 
                      className="position-absolute top-50 start-50 translate-middle"
                      style={{ zIndex: 10 }}
                    >
                      <div className="bg-white rounded p-3 shadow">
                        <Spinner animation="border" size="sm" className="me-2" />
                        Processing...
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Heatmap Controls */}
              <Row className="mb-3">
                <Col md={6}>
                  <Card className="border-0 bg-light">
                    <Card.Body className="py-2">
                      <h6 className="mb-2">
                        <i className="fas fa-sliders-h me-2"></i>
                        Heatmap Settings
                      </h6>
                      
                      {/* Intensity Control */}
                      <div className="mb-3">
                        <Form.Label className="small mb-1">
                          Intensity: {heatmapSettings.intensity.toFixed(1)}x
                        </Form.Label>
                        <Form.Range
                          min="0.1"
                          max="3.0"
                          step="0.1"
                          value={heatmapSettings.intensity}
                          onChange={(e) => setHeatmapSettings(prev => ({
                            ...prev,
                            intensity: parseFloat(e.target.value)
                          }))}
                        />
                        <div className="d-flex justify-content-between">
                          <small className="text-muted">Weak</small>
                          <small className="text-muted">Strong</small>
                        </div>
                      </div>

                      {/* Opacity Control */}
                      <div className="mb-3">
                        <Form.Label className="small mb-1">
                          Opacity: {Math.round(heatmapSettings.opacity * 100)}%
                        </Form.Label>
                        <Form.Range
                          min="0.1"
                          max="1.0"
                          step="0.05"
                          value={heatmapSettings.opacity}
                          onChange={(e) => setHeatmapSettings(prev => ({
                            ...prev,
                            opacity: parseFloat(e.target.value)
                          }))}
                        />
                        <div className="d-flex justify-content-between">
                          <small className="text-muted">Transparent</small>
                          <small className="text-muted">Opaque</small>
                        </div>
                      </div>

                      {/* Display Options */}
                      <div>
                        <Form.Label className="small mb-2">Display Options</Form.Label>
                        <div className="mb-2">
                          <Form.Check
                            type="switch"
                            id="show-grid-switch"
                            label="Show coordinate grid"
                            checked={heatmapSettings.showGrid}
                            onChange={(e) => setHeatmapSettings(prev => ({
                              ...prev,
                              showGrid: e.target.checked
                            }))}
                          />
                        </div>
                        <div>
                          <small className="text-muted">
                            Data points disabled - showing heat colors only
                          </small>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="border-0 bg-light">
                    <Card.Body className="py-2">
                      <h6 className="mb-2">
                        <i className="fas fa-info-circle me-2"></i>
                        Color Legend & Info
                      </h6>
                      
                      {/* Color Gradient */}
                      <div className="mb-2">
                        <div className="d-flex align-items-center">
                          <span className="me-2 small">Low</span>
                          <div 
                            className="flex-fill" 
                            style={{
                              height: '15px',
                              background: 'linear-gradient(to right, blue, cyan, yellow, red)',
                              borderRadius: '3px',
                              border: '1px solid #dee2e6'
                            }}
                          ></div>
                          <span className="ms-2 small">High</span>
                        </div>
                        <small className="text-muted">Point density visualization</small>
                      </div>

                      {/* Coordinate Info */}
                      <div className="text-muted">
                        <small>
                          <strong>Coordinates:</strong> X(0-{MAP_CONFIG.maxX}) vertical ↑, Y(0-{MAP_CONFIG.maxY}) horizontal →<br/>
                          <strong>Origin:</strong> Bottom-Left corner (X:0,Y:0)<br/>
                          <strong>Canvas:</strong> {MAP_CONFIG.canvasWidth}×{MAP_CONFIG.canvasHeight}px<br/>
                          {MAP_CONFIG.imageWidth && (
                            <>
                              <strong>Image:</strong> {MAP_CONFIG.imageWidth}×{MAP_CONFIG.imageHeight}px (ratio: {MAP_CONFIG.aspectRatio?.toFixed(2)})<br/>
                            </>
                          )}
                          <strong>Map:</strong> /map_ok.jpg
                        </small>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Toast Notifications */}
      <ToastContainer
        className="position-fixed"
        position="top-end"
        style={{ zIndex: 1050 }}
      >
        <Toast 
          show={showToast} 
          onClose={() => setShowToast(false)}
          bg="success"
          delay={3000}
          autohide
        >
          <Toast.Header>
            <i className="fas fa-check-circle text-success me-2"></i>
            <strong className="me-auto">Heatmap Generated</strong>
            <small>{lastUpdate && lastUpdate.toLocaleTimeString()}</small>
          </Toast.Header>
          <Toast.Body className="text-white">
            {toastMessage}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </Container>
  );
};

export default HeatmapAnalytics;
