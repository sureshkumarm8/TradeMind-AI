import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  // Use relative path './' to ensure it resolves to the correct origin even in sub-paths or preview environments
  navigator.serviceWorker.register('./service-worker.js')
    .then((registration) => {
      console.log('SW registered with scope:', registration.scope);
    })
    .catch((registrationError) => {
      console.warn('SW registration failed (this is common in preview environments):', registrationError);
    });
}