import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { purgeContinuationOnStartup } from './continuation';
import { EntitlementProvider } from './entitlements';
import { LocaleProvider } from './i18n/LocaleContext';
import { ProjectProvider } from './project/project.context';
import { SessionProvider } from './session';
import './styles.css';

void purgeContinuationOnStartup();

createRoot(document.getElementById('root')!).render(
  <LocaleProvider>
    <SessionProvider>
      <EntitlementProvider>
        <ProjectProvider>
          <App />
        </ProjectProvider>
      </EntitlementProvider>
    </SessionProvider>
  </LocaleProvider>,
);
