import { Approach } from './components/Approach';
import { Problem } from './components/Problem';
import { ScrollSequence } from './components/ScrollSequence';
import { Closing, Footer, StatusBand } from './components/Sections';
import { SiteHeader } from './components/SiteHeader';
import { Workspace } from './components/Workspace';

export function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" tabIndex={-1}>
        <ScrollSequence />
        <Problem />
        <Approach />
        <Workspace />
        <StatusBand />
        <Closing />
      </main>
      <Footer />
    </>
  );
}
