import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/site.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);
// Vite removes this branch and its entire draft/preview import tree from production.
if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('chapter-preview')) {
  void import('./authoring/ChapterPreview').then(({ default: ChapterPreview }) => {
    root.render(<React.StrictMode><ChapterPreview /></React.StrictMode>);
  }).catch(error => {
    root.render(<main role="alert"><h1>No se pudo abrir la vista previa</h1><p>{String(error.message ?? error)}</p></main>);
  });
} else root.render(<React.StrictMode><App /></React.StrictMode>);
