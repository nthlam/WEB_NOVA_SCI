// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Custom CSS for additional styling
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));

const debug = process.env.REACT_APP_DEBUG === 'true';

if (debug) {
  console.log('[Index] Starting IoT Admin Dashboard');
  console.log('[Index] Environment:', process.env.REACT_APP_ENV);
  console.log('[Index] API URL:', process.env.REACT_APP_API_BASE_URL);
}

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
if (debug) {
  reportWebVitals(console.log);
} else {
  reportWebVitals();
}
