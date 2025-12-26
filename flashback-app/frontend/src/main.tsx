import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './globals.css'
import App from './pages/App'
import Processing from './pages/Processing'
import Configure from './pages/Configure'
import Results from './pages/Results'

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/processing', element: <Processing /> },
  { path: '/configure', element: <Configure /> },
  { path: '/results', element: <Results /> },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
