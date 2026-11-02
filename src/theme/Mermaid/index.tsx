import React, {useEffect, useId, useMemo, useRef, useState, type ReactNode} from 'react';
import ErrorBoundary from '@docusaurus/ErrorBoundary';
import {ErrorBoundaryErrorMessageFallback, useColorMode} from '@docusaurus/theme-common';
import {MermaidContainerClassName, useMermaidThemeConfig} from '@docusaurus/theme-mermaid/client';
import {loadMermaid} from '@docusaurus/theme-mermaid/lib/client/loadMermaid.js';
import type {MermaidConfig, RenderResult} from 'mermaid';
import type {Props} from '@theme/Mermaid';
import {diagramThemeConfig} from './diagramTheme';
import styles from './styles.module.css';

let renderCount = 0;

// Mermaid deletes any element that already has the id it renders into. Each
// render therefore gets a fresh id, so a re-render (for example after the color
// mode settles) never removes the diagram that is currently shown.
function useDiagramRender(text: string, config: MermaidConfig): RenderResult | null {
  const [result, setResult] = useState<RenderResult | null>(null);

  useEffect(() => {
    let current = true;
    renderCount += 1;
    const id = `mermaid-svg-${renderCount}`;
    loadMermaid()
      .then(async (mermaid) => {
        mermaid.initialize(config);
        try {
          return await mermaid.render(id, text);
        } finally {
          document.querySelector(`#d${id}`)?.remove();
        }
      })
      .then((rendered) => {
        if (current) {
          setResult(rendered);
        }
      })
      .catch((error: unknown) => {
        if (current) {
          // Hand the error to the surrounding error boundary.
          setResult(() => {
            throw error;
          });
        }
      });
    return () => {
      current = false;
    };
  }, [text, config]);

  return result;
}

// Like the stock renderer, but with the docs palette for the current color mode
// instead of one of Mermaid's built-in themes.
function DiagramRenderer({value}: Props): ReactNode {
  const {colorMode} = useColorMode();
  const {options} = useMermaidThemeConfig();
  const config = useMemo(
    () => ({startOnLoad: false, ...options, ...diagramThemeConfig(colorMode)}) as MermaidConfig,
    [options, colorMode],
  );
  const renderResult = useDiagramRender(value, config);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (renderResult && ref.current) {
      renderResult.bindFunctions?.(ref.current);
    }
  }, [renderResult]);

  if (renderResult === null) {
    return null;
  }
  return (
    <div ref={ref} className={MermaidContainerClassName}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{__html: renderResult.svg}} />
  );
}

function Mermaid(props: Props): ReactNode {
  return (
    <ErrorBoundary fallback={(params) => <ErrorBoundaryErrorMessageFallback {...params} />}>
      <DiagramRenderer {...props} />
    </ErrorBoundary>
  );
}

// Expose each rendered SVG's natural width so the CSS can size it without
// upscaling. Mermaid renders asynchronously, so watch for the SVG to appear.
function useDiagramWidth(viewport: React.RefObject<HTMLDivElement | null>, active = true) {
  useEffect(() => {
    const root = viewport.current;
    if (!active || !root) {
      return undefined;
    }
    const apply = () => {
      root.querySelectorAll('svg').forEach((svg) => {
        const width = svg.viewBox?.baseVal?.width;
        if (width) {
          svg.style.setProperty('--diagram-width', `${width}px`);
        }
      });
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, {childList: true, subtree: true});
    return () => observer.disconnect();
  }, [viewport, active]);
}

export default function ExpandableMermaid(props: Props): ReactNode {
  const [expanded, setExpanded] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const viewport = useRef<HTMLDivElement>(null);
  const expandedViewport = useRef<HTMLDivElement>(null);
  useDiagramWidth(viewport);
  useDiagramWidth(expandedViewport, expanded);

  useEffect(() => {
    if (expanded) {
      dialog.current?.showModal();
    }
  }, [expanded]);

  return (
    <figure className={styles.figure}>
      <div ref={viewport} className={styles.viewport} role="region" aria-label="Diagram" tabIndex={0}>
        <Mermaid {...props} />
      </div>
      <figcaption className={styles.caption}>
        <span>Scroll to see a wide diagram, or open a larger view.</span>
        <button type="button" className="button button--sm button--secondary"
          aria-haspopup="dialog" onClick={() => setExpanded(true)}>
          Expand diagram
        </button>
      </figcaption>
      {expanded && (
        <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId}
          onClose={() => setExpanded(false)}>
          <div className={styles.dialogHeader}>
            <h2 id={titleId}>Diagram</h2>
            <button type="button" className="button button--secondary" autoFocus
              onClick={() => dialog.current?.close()}>Close diagram</button>
          </div>
          <div ref={expandedViewport} className={`${styles.viewport} ${styles.expanded}`} role="region"
            aria-label="Expanded diagram" tabIndex={0}>
            <Mermaid {...props} />
          </div>
        </dialog>
      )}
    </figure>
  );
}
