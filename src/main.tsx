import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { LocaleProvider } from './i18n/LocaleContext';
import { ProjectProvider } from './project/project.context';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <LocaleProvider>
    <ProjectProvider>
      <App />
    </ProjectProvider>
  </LocaleProvider>,
);
