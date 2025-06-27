import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react'
import App from './App.jsx'
import theme from './theme'
import './index.css'

import './i18n'; // NEU: Importiere die i18n Konfiguration

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ChakraProvider theme={theme}> 
        <App />
      </ChakraProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
