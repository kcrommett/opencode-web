interface Theme {
  name: string;
  id: string;
  colors: {
    background: string;
    backgroundAlt: string;
    backgroundAccent: string;
    foreground: string;
    foregroundAlt: string;
    border: string;
    primary: string;
    primaryHover: string;
    success: string;
    warning: string;
    error: string;
    muted: string;
  };
}

export const themes: Record<string, Theme> = {
  opencode: {
    name: 'OpenCode',
    id: 'opencode',
    colors: {
      background: '#0a0a0a',
      backgroundAlt: '#1e1e1e',
      backgroundAccent: '#2a2a2a',
      foreground: '#e0e0e0',
      foregroundAlt: '#c0c0c0',
      border: '#3a3a3a',
      primary: '#fab283',
      primaryHover: '#5c9cf5',
      success: '#a6e3a1',
      warning: '#f9e2af',
      error: '#f38ba8',
      muted: '#6c7086',
    },
  },
  tokyonight: {
    name: 'Tokyo Night',
    id: 'tokyonight',
    colors: {
      background: '#1a1b26',
      backgroundAlt: '#222436',
      backgroundAccent: '#414868',
      foreground: '#c0caf5',
      foregroundAlt: '#a9b1d6',
      border: '#414868',
      primary: '#82aaff',
      primaryHover: '#c099ff',
      success: '#9ece6a',
      warning: '#e0af68',
      error: '#ff966c',
      muted: '#565f89',
    },
  },
  ayu: {
    name: 'Ayu Dark',
    id: 'ayu',
    colors: {
      background: '#0b0e14',
      backgroundAlt: '#0f131a',
      backgroundAccent: '#1f2430',
      foreground: '#b3b1ad',
      foregroundAlt: '#8a9199',
      border: '#1f2430',
      primary: '#59c2ff',
      primaryHover: '#d2a6ff',
      success: '#91b362',
      warning: '#e6b450',
      error: '#d95757',
      muted: '#4d5566',
    },
  },
  nord: {
    name: 'Nord',
    id: 'nord',
    colors: {
      background: '#2e3440',
      backgroundAlt: '#3b4252',
      backgroundAccent: '#434c5e',
      foreground: '#eceff4',
      foregroundAlt: '#e5e9f0',
      border: '#434c5e',
      primary: '#88c0d0',
      primaryHover: '#81a1c1',
      success: '#a3be8c',
      warning: '#ebcb8b',
      error: '#bf616a',
      muted: '#4c566a',
    },
  },
  catppuccin: {
    name: 'Catppuccin Mocha',
    id: 'catppuccin',
    colors: {
      background: '#1e1e2e',
      backgroundAlt: '#11111b',
      backgroundAccent: '#313244',
      foreground: '#cdd6f4',
      foregroundAlt: '#bac2de',
      border: '#45475a',
      primary: '#89b4fa',
      primaryHover: '#cba6f7',
      success: '#a6e3a1',
      warning: '#f9e2af',
      error: '#f38ba8',
      muted: '#6c7086',
    },
  },
  dracula: {
    name: 'Dracula',
    id: 'dracula',
    colors: {
      background: '#282a36',
      backgroundAlt: '#1e1f29',
      backgroundAccent: '#44475a',
      foreground: '#f8f8f2',
      foregroundAlt: '#e5e5e0',
      border: '#44475a',
      primary: '#bd93f9',
      primaryHover: '#ff79c6',
      success: '#50fa7b',
      warning: '#f1fa8c',
      error: '#ff5555',
      muted: '#6272a4',
    },
  },
  gruvbox: {
    name: 'Gruvbox',
    id: 'gruvbox',
    colors: {
      background: '#282828',
      backgroundAlt: '#1d2021',
      backgroundAccent: '#3c3836',
      foreground: '#ebdbb2',
      foregroundAlt: '#d5c4a1',
      border: '#504945',
      primary: '#83a598',
      primaryHover: '#d3869b',
      success: '#b8bb26',
      warning: '#fabd2f',
      error: '#fb4934',
      muted: '#928374',
    },
  },
  matrix: {
    name: 'Matrix',
    id: 'matrix',
    colors: {
      background: '#0a0e0a',
      backgroundAlt: '#141c12',
      backgroundAccent: '#1a2a1a',
      foreground: '#2eff6a',
      foregroundAlt: '#00efff',
      border: '#1a2a1a',
      primary: '#2eff6a',
      primaryHover: '#00efff',
      success: '#2eff6a',
      warning: '#ffff00',
      error: '#ff0000',
      muted: '#1cc24b',
    },
  },
  'one-dark': {
    name: 'One Dark',
    id: 'one-dark',
    colors: {
      background: '#282c34',
      backgroundAlt: '#21252b',
      backgroundAccent: '#2c323c',
      foreground: '#abb2bf',
      foregroundAlt: '#9da5b4',
      border: '#3e4451',
      primary: '#61afef',
      primaryHover: '#c678dd',
      success: '#98c379',
      warning: '#e5c07b',
      error: '#e06c75',
      muted: '#5c6370',
    },
  },
  vesper: {
    name: 'Vesper',
    id: 'vesper',
    colors: {
      background: '#101010',
      backgroundAlt: '#1a1a1a',
      backgroundAccent: '#232323',
      foreground: '#b7b7b7',
      foregroundAlt: '#999999',
      border: '#232323',
      primary: '#ffc799',
      primaryHover: '#99ffe4',
      success: '#99ffe4',
      warning: '#ffc799',
      error: '#ff6188',
      muted: '#666666',
    },
  },
  rosepine: {
    name: 'Rosé Pine',
    id: 'rosepine',
    colors: {
      background: '#191724',
      backgroundAlt: '#1f1d2e',
      backgroundAccent: '#26233a',
      foreground: '#e0def4',
      foregroundAlt: '#908caa',
      border: '#26233a',
      primary: '#9ccfd8',
      primaryHover: '#c4a7e7',
      success: '#31748f',
      warning: '#f6c177',
      error: '#eb6f92',
      muted: '#6e6a86',
    },
  },
  cobalt2: {
    name: 'Cobalt2',
    id: 'cobalt2',
    colors: {
      background: '#193549',
      backgroundAlt: '#122738',
      backgroundAccent: '#1f4662',
      foreground: '#ffffff',
      foregroundAlt: '#c5c8c6',
      border: '#1f4662',
      primary: '#0088ff',
      primaryHover: '#9a5feb',
      success: '#3ad900',
      warning: '#ffc600',
      error: '#ff0088',
      muted: '#8899aa',
    },
  },
  solarized: {
    name: 'Solarized Dark',
    id: 'solarized',
    colors: {
      background: '#002b36',
      backgroundAlt: '#073642',
      backgroundAccent: '#586e75',
      foreground: '#839496',
      foregroundAlt: '#93a1a1',
      border: '#586e75',
      primary: '#268bd2',
      primaryHover: '#6c71c4',
      success: '#859900',
      warning: '#b58900',
      error: '#dc322f',
      muted: '#657b83',
    },
  },
  palenight: {
    name: 'Palenight',
    id: 'palenight',
    colors: {
      background: '#292d3e',
      backgroundAlt: '#1f2233',
      backgroundAccent: '#343847',
      foreground: '#bfc7d5',
      foregroundAlt: '#a6accd',
      border: '#343847',
      primary: '#82aaff',
      primaryHover: '#c792ea',
      success: '#c3e88d',
      warning: '#ffcb6b',
      error: '#f07178',
      muted: '#676e95',
    },
  },
  material: {
    name: 'Material',
    id: 'material',
    colors: {
      background: '#263238',
      backgroundAlt: '#1e272c',
      backgroundAccent: '#2c3b41',
      foreground: '#eeffff',
      foregroundAlt: '#b0bec5',
      border: '#2c3b41',
      primary: '#82aaff',
      primaryHover: '#c792ea',
      success: '#c3e88d',
      warning: '#ffcb6b',
      error: '#f07178',
      muted: '#546e7a',
    },
  },
  monokai: {
    name: 'Monokai',
    id: 'monokai',
    colors: {
      background: '#272822',
      backgroundAlt: '#1e1f1c',
      backgroundAccent: '#3e3d32',
      foreground: '#f8f8f2',
      foregroundAlt: '#cfcfc2',
      border: '#3e3d32',
      primary: '#66d9ef',
      primaryHover: '#ae81ff',
      success: '#a6e22e',
      warning: '#e6db74',
      error: '#f92672',
      muted: '#75715e',
    },
  },
  github: {
    name: 'GitHub Dark',
    id: 'github',
    colors: {
      background: '#0d1117',
      backgroundAlt: '#161b22',
      backgroundAccent: '#21262d',
      foreground: '#c9d1d9',
      foregroundAlt: '#8b949e',
      border: '#30363d',
      primary: '#58a6ff',
      primaryHover: '#bc8cff',
      success: '#3fb950',
      warning: '#d29922',
      error: '#f85149',
      muted: '#6e7681',
    },
  },
  aura: {
    name: 'Aura',
    id: 'aura',
    colors: {
      background: '#0f0f0f',
      backgroundAlt: '#1a1a1a',
      backgroundAccent: '#252525',
      foreground: '#edecee',
      foregroundAlt: '#bdbdbd',
      border: '#252525',
      primary: '#a277ff',
      primaryHover: '#f694ff',
      success: '#61ffca',
      warning: '#ffca85',
      error: '#ff6767',
      muted: '#6d6d6d',
    },
  },
  synthwave84: {
    name: 'Synthwave 84',
    id: 'synthwave84',
    colors: {
      background: '#262335',
      backgroundAlt: '#1f1b2e',
      backgroundAccent: '#2d2b55',
      foreground: '#ffffff',
      foregroundAlt: '#fede5d',
      border: '#2d2b55',
      primary: '#36f9f6',
      primaryHover: '#ff7edb',
      success: '#72f1b8',
      warning: '#fede5d',
      error: '#fe4450',
      muted: '#848bbd',
    },
  },
  zenburn: {
    name: 'Zenburn',
    id: 'zenburn',
    colors: {
      background: '#3f3f3f',
      backgroundAlt: '#2b2b2b',
      backgroundAccent: '#4f4f4f',
      foreground: '#dcdccc',
      foregroundAlt: '#c3bf9f',
      border: '#4f4f4f',
      primary: '#8cd0d3',
      primaryHover: '#dc8cc3',
      success: '#7f9f7f',
      warning: '#e0cf9f',
      error: '#cc9393',
      muted: '#9f9f9f',
    },
  },
  everforest: {
    name: 'Everforest',
    id: 'everforest',
    colors: {
      background: '#2d353b',
      backgroundAlt: '#232a2e',
      backgroundAccent: '#343f44',
      foreground: '#d3c6aa',
      foregroundAlt: '#bdc3af',
      border: '#475258',
      primary: '#a7c080',
      primaryHover: '#7fbbb3',
      success: '#a7c080',
      warning: '#dbbc7f',
      error: '#e67e80',
      muted: '#859289',
    },
  },
  kanagawa: {
    name: 'Kanagawa',
    id: 'kanagawa',
    colors: {
      background: '#1f1f28',
      backgroundAlt: '#16161d',
      backgroundAccent: '#2a2a37',
      foreground: '#dcd7ba',
      foregroundAlt: '#c8c093',
      border: '#363646',
      primary: '#7e9cd8',
      primaryHover: '#957fb8',
      success: '#98bb6c',
      warning: '#e6c384',
      error: '#d27e99',
      muted: '#54546d',
    },
  },
};

export const themeList = Object.values(themes);

function updateThemeColor(color: string): void {
  let metaThemeColor = document.querySelector('meta[name="theme-color"]');
  
  if (!metaThemeColor) {
    metaThemeColor = document.createElement('meta');
    metaThemeColor.setAttribute('name', 'theme-color');
    document.head.appendChild(metaThemeColor);
  }
  
  metaThemeColor.setAttribute('content', color);
  
  const metaAppleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (metaAppleStatusBar) {
    metaAppleStatusBar.setAttribute('content', 'black-translucent');
  }
}

export function applyTheme(themeId: string): void {
  const theme = themes[themeId] || themes.catppuccin;
  const root = document.documentElement;

  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--theme-${key}`, value);
  });

  // Map theme variables to WebTUI variables
  root.style.setProperty('--background0', theme.colors.background);
  root.style.setProperty('--background1', theme.colors.backgroundAlt);
  root.style.setProperty('--background2', theme.colors.backgroundAccent);
  root.style.setProperty('--background3', theme.colors.border);
  root.style.setProperty('--foreground0', theme.colors.primary);
  root.style.setProperty('--foreground1', theme.colors.foreground);
  root.style.setProperty('--foreground2', theme.colors.foregroundAlt);

  updateThemeColor(theme.colors.background);

  localStorage.setItem('opencode-theme', themeId);
}

export function getStoredTheme(): string {
  return localStorage.getItem('opencode-theme') || 'catppuccin';
}