import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { StudioApp } from './StudioApp';
import { currentFiles, subscribe } from './source';

function Root() {
  const [files, setFiles] = useState(currentFiles());
  useEffect(() => subscribe(next => setFiles({ ...next })), []);
  return <StudioApp files={files} />;
}
if (import.meta.env.DEV) ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);
else document.getElementById('root')!.textContent = 'O estúdio de arte só existe em desenvolvimento.';
