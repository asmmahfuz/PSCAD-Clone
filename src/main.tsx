import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { DetachedScopeWindow } from './components/oscilloscope/DetachedScopeWindow.tsx'

const urlParams = new URLSearchParams(window.location.search);
const isDetachedScope = urlParams.get('view') === 'detached-scope' || urlParams.get('window') === 'scope';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isDetachedScope ? <DetachedScopeWindow /> : <App />}
  </StrictMode>,
)
