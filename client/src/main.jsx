// client/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1b1b23',
              color:      '#ececf4',
              border:     '1.5px solid #35354580',
              fontSize:   '13px',
            },
            success: { iconTheme: { primary: '#3dd68c', secondary: '#1b1b23' } },
            error:   { iconTheme: { primary: '#f16a6a', secondary: '#1b1b23' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
