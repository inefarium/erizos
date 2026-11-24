import './styles/index.css';

// Los temas se cargan como efectos secundarios, en el mismo orden que el HTML
// original: primero el nucleo del menu y despues los plugins que se registran.
import './themes/opciones-temas.js';
import './themes/regalo-cosmico.js';
import './themes/florcita_amarilla.js';
import './themes/calabaza.js';
import './themes/navidad-chamoys.js';

import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');
if (!container) {
  throw new Error('No se encontro el contenedor #root');
}

createRoot(container).render(<App />);
