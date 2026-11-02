/*
 * Mermaid palette that matches the docs shell. Mermaid's `base` theme derives
 * the remaining colours from these, so every diagram type (flowchart,
 * sequence, state) stays consistent. Values must be hex: Mermaid adjusts them.
 */
const shared = {
  fontFamily: 'system-ui, sans-serif',
  fontSize: '15px',
  // No glow or gradient behind nodes; the borders carry the shapes.
  dropShadow: 'none',
  useGradient: false,
};

const light = {
  ...shared,
  darkMode: false,
  background: '#ffffff',
  mainBkg: '#eef5f1',
  primaryColor: '#eef5f1',
  primaryBorderColor: '#9dbcac',
  primaryTextColor: '#182b22',
  secondaryColor: '#f5eef3',
  secondaryBorderColor: '#cdb4c6',
  tertiaryColor: '#f6f8f7',
  tertiaryBorderColor: '#cfd9d4',
  lineColor: '#7a8d83',
  textColor: '#182b22',
  clusterBkg: '#f6f9f7',
  clusterBorder: '#c6d6cd',
  edgeLabelBackground: '#ffffff',
  noteBkgColor: '#fbf6e8',
  noteBorderColor: '#e0cf9f',
  noteTextColor: '#3d3523',
  actorBkg: '#eef5f1',
  actorBorder: '#9dbcac',
  actorTextColor: '#182b22',
  actorLineColor: '#b3c4bb',
  signalColor: '#4c5f55',
  signalTextColor: '#182b22',
  labelBoxBkgColor: '#eef5f1',
  labelBoxBorderColor: '#9dbcac',
  labelTextColor: '#182b22',
  loopTextColor: '#182b22',
  activationBkgColor: '#dcebe3',
  activationBorderColor: '#7fa592',
  sequenceNumberColor: '#ffffff',
  transitionColor: '#7a8d83',
  stateBkg: '#eef5f1',
  // Mermaid otherwise reuses stateBkg for the label, hiding state names.
  stateLabelColor: '#182b22',
  stateBorder: '#9dbcac',
  compositeBackground: '#f6f9f7',
  compositeTitleBackground: '#e5efe9',
  altBackground: '#f6f9f7',
  specialStateColor: '#4c5f55',
};

const dark = {
  ...shared,
  darkMode: true,
  background: '#242526',
  mainBkg: '#1f3229',
  primaryColor: '#1f3229',
  primaryBorderColor: '#41715b',
  primaryTextColor: '#e6eeea',
  secondaryColor: '#33283a',
  secondaryBorderColor: '#6e5677',
  tertiaryColor: '#2b2d2c',
  tertiaryBorderColor: '#454b48',
  lineColor: '#8ea69a',
  textColor: '#e6eeea',
  clusterBkg: '#2a2c2b',
  clusterBorder: '#454e49',
  edgeLabelBackground: '#242526',
  noteBkgColor: '#3a3424',
  noteBorderColor: '#6d5f38',
  noteTextColor: '#eee5cb',
  actorBkg: '#1f3229',
  actorBorder: '#41715b',
  actorTextColor: '#e6eeea',
  actorLineColor: '#4f5a55',
  signalColor: '#b4c6bd',
  signalTextColor: '#e6eeea',
  labelBoxBkgColor: '#1f3229',
  labelBoxBorderColor: '#41715b',
  labelTextColor: '#e6eeea',
  loopTextColor: '#e6eeea',
  activationBkgColor: '#2a4538',
  activationBorderColor: '#5b8f77',
  sequenceNumberColor: '#111113',
  transitionColor: '#8ea69a',
  stateBkg: '#1f3229',
  stateLabelColor: '#e6eeea',
  stateBorder: '#41715b',
  compositeBackground: '#2a2c2b',
  compositeTitleBackground: '#33403a',
  altBackground: '#2a2c2b',
  specialStateColor: '#b4c6bd',
};

// Mermaid scopes this under each diagram's SVG id.
const themeCSS = `
  .node rect, .node polygon, .cluster rect, rect.actor, .statediagram-state rect {
    rx: 8px;
    ry: 8px;
  }
  .edgeLabel, .edgeLabel p, .edgeLabel span {
    font-size: 13px;
  }
  .edgeLabel rect, .labelBkg {
    rx: 4px;
    ry: 4px;
  }
`;

export function diagramThemeConfig(colorMode: 'light' | 'dark') {
  return {
    theme: 'base',
    // The newer "neo" look adds drop-shadow filters and taller sequence actors.
    look: 'classic',
    themeVariables: colorMode === 'dark' ? dark : light,
    themeCSS,
  };
}
