import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { LocaleProvider } from './i18n/LocaleContext';
import { ProjectProvider } from './project/project.context';
import './styles.css';
import './styles.dance-avatars.css';
import './styles.image-pulse.css';
import './styles.lyric-canvas.css';
import './styles.pro-gates.css';

createRoot(document.getElementById('root')!).render(
  <LocaleProvider>
    <ProjectProvider>
      <App />
    </ProjectProvider>
  </LocaleProvider>,
);
