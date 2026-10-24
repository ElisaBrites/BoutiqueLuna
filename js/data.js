/* ============================================================
   BOUTIQUE LUNA — datos del juego (pixel art)
   ============================================================ */

window.BL = window.BL || {};

BL.MAX_LIVES = 5;
BL.LIFE_MS = 5 * 60 * 1000;
BL.HEART_PRICE = 12;

/* Lógica interna: nunca se muestra el precio de un vestido. */
BL.COINS_PER_DRESS = 3;
BL.CLIENT_TIME = 20;   // segundos de paciencia por pedido
BL.TRY_ON = 5;         // segundos para probarse cada vestido
BL.CHARGE_TIME = 5;    // segundos de cobro
BL.ARRIVAL = 20;       // segundos entre clientas

BL.LEVELS = [
  {
    id: 1,
    name: 'Día de estreno',
    subtitle: 'Las primeras clientas están por llegar.',
    clients: 3,
    dresses: [2, 2, 2],
    target: 9,
    colors: ['#ffd9e8', '#ffb9d4'],
    accent: '#ef6c9b'
  },
  {
    id: 2,
    name: 'Ramo de primavera',
    subtitle: 'La tienda se llena de flores y amigas nuevas.',
    clients: 4,
    dresses: [2, 2, 2, 2],
    target: 15,
    colors: ['#d9f3e6', '#aee3c9'],
    accent: '#4ea781'
  },
  {
    id: 3,
    name: 'Fiesta de colores',
    subtitle: 'Algunas clientas quieren más vestidos.',
    clients: 5,
    dresses: [2, 2, 3, 3, 2],
    target: 21,
    colors: ['#ece0ff', '#d0b9f5'],
    accent: '#8a67c8'
  },
  {
    id: 4,
    name: 'Boda de ensueño',
    subtitle: 'Un día muy ocupado en la boutique.',
    clients: 4,
    dresses: [3, 3, 3, 3],
    target: 30,
    colors: ['#fff0d6', '#ffd9a8'],
    accent: '#d89a3e'
  },
  {
    id: 5,
    name: 'Gala de estrellas',
    subtitle: 'La noche más especial del año.',
    clients: 5,
    dresses: [4, 4, 4, 4, 4],
    target: 39,
    colors: ['#e2efff', '#bcd5f5'],
    accent: '#5b8bd0'
  }
];

BL.DRESSES = {
  dots: {
    id: 'dots',
    name: 'Lunares',
    color: '#f26b9d',
    dark: '#c94d7c',
    light: '#ffb3ce',
    ribbon: '#fff0f5',
    pattern: '#fff6fa',
    swatch: '#f26b9d'
  },
  floral: {
    id: 'floral',
    name: 'Flores',
    color: '#79c7a4',
    dark: '#4f9c7b',
    light: '#b9ead5',
    ribbon: '#effbf4',
    pattern: '#fff8d9',
    swatch: '#79c7a4'
  }
};

BL.UPGRADES = [
  {
    id: 'shoes',
    name: 'Zapatillas de ballet',
    icon: '🩰',
    desc: 'Luna camina un 20 % más rápido en cada nivel.',
    max: 2,
    prices: [15, 30],
    short: 'Velocidad'
  },
  {
    id: 'tea',
    name: 'Té de manzanilla',
    icon: '🍵',
    desc: 'Las clientas esperan 4 segundos más en cada pedido.',
    max: 2,
    prices: [20, 35],
    short: 'Paciencia'
  },
  {
    id: 'register',
    name: 'Caja exprés',
    icon: '⚡',
    desc: 'Cobrar tarda 1 segundo menos (mínimo 3 segundos).',
    max: 2,
    prices: [25, 40],
    short: 'Cobro'
  },
  {
    id: 'tip',
    name: 'Propina del corazón',
    icon: '💖',
    desc: 'Ganás 1 moneda extra por cada clienta que cobrás.',
    max: 2,
    prices: [30, 45],
    short: 'Propina'
  }
];

BL.CLIENTS = [
  { name: 'Sofía',    skin: '#f6d3ba', shade: '#e5b79d', hair: '#5b3a2a', hairShade: '#43281c', dress: '#ffb3c9', dressDark: '#ef8cac', bow: '#ff7da9', shoe: '#d95f8e' },
  { name: 'Martina',  skin: '#f0c6a5', shade: '#dfac88', hair: '#2f2420', hairShade: '#1e1715', dress: '#b9a4ea', dressDark: '#9b83d6', bow: '#8f73d8', shoe: '#7b5ec2' },
  { name: 'Lola',     skin: '#e7b48b', shade: '#d39d75', hair: '#b06a3b', hairShade: '#8d5029', dress: '#9ed7be', dressDark: '#78bfa2', bow: '#4ea781', shoe: '#3f9475' },
  { name: 'Emma',     skin: '#c98e63', shade: '#b47950', hair: '#3b2620', hairShade: '#281713', dress: '#ffd18f', dressDark: '#eab266', bow: '#e8a33d', shoe: '#c98932' },
  { name: 'Valentina',skin: '#8d5a3d', shade: '#76462e', hair: '#201718', hairShade: '#120c0c', dress: '#ffc2d8', dressDark: '#ef9bbb', bow: '#ef6a9b', shoe: '#d55387' },
  { name: 'Juana',    skin: '#f5cdb4', shade: '#e6b69b', hair: '#d9a441', hairShade: '#b9832b', dress: '#b5d9f7', dressDark: '#8fbfe8', bow: '#5b9bd5', shoe: '#4a86be' },
  { name: 'Cami',     skin: '#e9bea1', shade: '#d7a587', hair: '#6d4030', hairShade: '#4e2b20', dress: '#d3c0f2', dressDark: '#b49bdf', bow: '#a98bdd', shoe: '#8f6fc9' },
  { name: 'Olivia',   skin: '#f8d6c2', shade: '#ecc0a8', hair: '#8d5a3c', hairShade: '#6b4029', dress: '#f7c8b0', dressDark: '#e8a88c', bow: '#e08a6e', shoe: '#c9745b' },
  { name: 'Mía',      skin: '#b97b56', shade: '#a26542', hair: '#2a1b1a', hairShade: '#1a100f', dress: '#b8eccf', dressDark: '#8ed6b2', bow: '#52ad82', shoe: '#42956f' },
  { name: 'Renata',   skin: '#f3c7ae', shade: '#e4ac8d', hair: '#c75f4a', hairShade: '#a44735', dress: '#ffd6e2', dressDark: '#f2aabe', bow: '#e85680', shoe: '#d44c74' },
  { name: 'Abril',    skin: '#dba37b', shade: '#c78c64', hair: '#6b4a3e', hairShade: '#4b3027', dress: '#c9e6f5', dressDark: '#a5cee4', bow: '#6ba8c4', shoe: '#578fa9' },
  { name: 'Delfina',  skin: '#f0c6a8', shade: '#dfad8b', hair: '#e4b75c', hairShade: '#c39131', dress: '#e2c6f5', dressDark: '#c7a5e2', bow: '#a77fd1', shoe: '#9166bb' }
];

BL.PALETTE_ASSISTANT = {
  skin: '#f8d6c0',
  shade: '#eabaa2',
  hair: '#6d4229',
  hairShade: '#4d2d1a',
  dress: '#ff9fbe',
  dressDark: '#e97ea4',
  bow: '#ef5c92',
  shoe: '#d4517f'
};

/* Lienzo interno: 400×225 se muestra a 1600×900 (×4). */
BL.ART = { w: 400, h: 225, scale: 4 };
BL.STAGE = { w: 1600, h: 900 };

BL.ROOM = {
  wallH: 150,
  door: { x: 10, y: 82, w: 44, h: 66 },
  racks: [
    { x: 68, y: 94, w: 58, h: 54, type: 'dots' },
    { x: 132, y: 94, w: 58, h: 54, type: 'floral' }
  ],
  mirror: { x: 196, y: 88, w: 40, h: 60 },
  cabins: [
    { x: 300, y: 56, w: 44, h: 92 },
    { x: 348, y: 56, w: 44, h: 92 }
  ],
  register: { x: 152, y: 196, w: 92, h: 26 },
  shelf: { x: 56, y: 50, w: 128, h: 8 },
  lamps: [88, 318],
  playerStart: { x: 120, y: 208 },
  waiting: [
    { x: 72, y: 182 },
    { x: 96, y: 198 },
    { x: 120, y: 182 },
    { x: 144, y: 198 },
    { x: 96, y: 166 }
  ],
  pay: [
    { x: 256, y: 212 },
    { x: 276, y: 200 },
    { x: 290, y: 186 }
  ],
  tray: { x: 354, y: 196, w: 40, h: 24 },
  spawn: { x: -12, y: 200 },
  exit: { x: -24, y: 216 },
  deliver: [
    { x: 302, y: 206 },
    { x: 350, y: 206 }
  ],
  clientStand: [
    { x: 322, y: 148 },
    { x: 370, y: 148 }
  ]
};

BL.ICONS = {
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="2.3"/><path d="M12 7.3v5.1l3.2 2" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/></svg>',
  hanger: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.5a1.8 1.8 0 1 1 1.8 1.8c-.9 0-1.8.7-1.8 1.7v.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M12 8.4 3.9 14c-1 .7-.5 2.3.7 2.3h14.8c1.2 0 1.7-1.6.7-2.3L12 8.4Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
  heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5S3.4 15.6 3.4 9.6A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8.6 3.2c0 6-8.6 10.9-8.6 10.9Z" fill="currentColor"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.7 2.8 5.7 6.3.9-4.6 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L2.9 9.3l6.3-.9L12 2.7Z" fill="currentColor"/></svg>',
  lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 10V8a4 4 0 0 1 8 0v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="15" r="1.4" fill="currentColor"/></svg>',
  fullscreen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.2L12 5.4v13.2L7.2 14.5H4Z" fill="currentColor"/><path d="M15.5 9a4.3 4.3 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  mute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.2L12 5.4v13.2L7.2 14.5H4Z" fill="currentColor"/><path d="m16 9 5 5m0-5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
};
