import React, {useEffect, useId, useRef, useState, type ReactNode} from 'react';
import Mermaid from '@theme-original/Mermaid';
import type {Props} from '@theme/Mermaid';
import styles from './styles.module.css';

export default function ExpandableMermaid(props: Props): ReactNode {
  const [expanded, setExpanded] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (expanded) {
      dialog.current?.showModal();
    }
  }, [expanded]);

  return (
    <figure className={styles.figure}>
      <div className={styles.viewport} role="region" aria-label="Diagram" tabIndex={0}>
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
          <div className={`${styles.viewport} ${styles.expanded}`} role="region"
            aria-label="Expanded diagram" tabIndex={0}>
            <Mermaid {...props} />
          </div>
        </dialog>
      )}
    </figure>
  );
}
