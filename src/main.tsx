import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { ProjectProvider } from './project/project.context';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <ProjectProvider>
    <App />
  </ProjectProvider>,
);
