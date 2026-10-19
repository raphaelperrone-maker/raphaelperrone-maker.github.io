// ═══════════════════════════════════════════════════════════════════
//  JEU D'ICÔNES VECTORIELLES (viewBox 24×24, remplissage evenodd)
//  Même tracé utilisé dans le DOM (SVG inline) et sur le canvas (Path2D)
// ═══════════════════════════════════════════════════════════════════
const ICON_PATHS = {
  // Clans
  croissant: 'M2.5 17C2.5 10 7 5 12 5s9.5 5 9.5 12c-2.800-3.300-6-4.800-9.500-4.800S5.300 13.700 2.500 17zM8.200 6.400l1.200-.5.900 5.700-1.200.3zM15.800 6.400l-1.200-.5-.9 5.700 1.200.3z',
  wine:      'M7 3h10l-.4 6.2a4.6 4.6 0 0 1-9.2 0zM11 14v5.2H8V21h8v-1.8h-3V14zM8.7 5l-.2 2.6h7L15.3 5z',
  palette:   'M12 3C6.9 3 3 6.9 3 12s3.9 9 9 9c1.6 0 2.3-1.1 1.9-2.2-.5-1.2.3-2.4 1.6-2.4H17.5c2 0 3.5-1.5 3.5-3.5C21 6.9 17 3 12 3zM7.6 11a1.4 1.4 0 1 0 .01 0zM10.6 7.6a1.4 1.4 0 1 0 .01 0zM15 7.9a1.4 1.4 0 1 0 .01 0zM17.4 11.3a1.4 1.4 0 1 0 .01 0z',
  cheese:    'M3 9.5 20.5 4a.9.9 0 0 1 1.2.9V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM8.5 14a1.5 1.5 0 1 0 .01 0zM14.6 10.6a1.2 1.2 0 1 0 .01 0zM16.5 15.2a1 1 0 1 0 .01 0z',
  // Bâtiments par niveau (B1 → B4)
  b1: 'M3 20v-8.2l9-7 9 7V20zM10.4 20h3.2v-4.2h-3.2z',
  b2: 'M4 20v-9l8-6 8 6v9zM16 4.5h2.2v4.6L16 7.5zM10.3 20h3.4v-4.6h-3.4zM6.6 12.6h2.4v2.2H6.6zM15 12.6h2.4v2.2H15z',
  b3: 'M5 21V10l7-6 7 6v11zM1.8 21v-6l3.2-2.1V21zM19 12.9l3.2 2.1v6H19zM10.4 21h3.2v-4.4h-3.2zM9.2 10.6h2v2.2h-2zM12.8 10.6h2v2.2h-2z',
  b4: 'M3 21V6h4v3h3V6h4v3h3V6h4v15zM10.5 21h3v-5.2a1.5 1.5 0 0 0-3 0z',
  // Interface
  star:  'M12 2.8l2.7 5.9 6.4.7-4.8 4.3 1.3 6.3L12 16.8 6.4 20l1.3-6.3L2.9 9.4l6.4-.7z',
  robot: 'M11 3h2v2h4a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4zM8.8 9.5a1.4 1.4 0 1 0 .01 0zM15.2 9.5a1.4 1.4 0 1 0 .01 0zM9 13.5h6v1.6H9zM3 10h1.5v4H3zM19.5 10H21v4h-1.5z',
};
const CLAN_ICON_KEY = ['croissant','wine','palette','cheese'];

// SVG inline, couleur héritée (currentColor) ou imposée
function iconSVG(key, color, extra){
  const st = color ? ` style="color:${color}"` : '';
  return `<svg class="ico ${extra||''}" viewBox="0 0 24 24" fill="currentColor" fill-rule="evenodd" aria-hidden="true"${st}><path d="${ICON_PATHS[key]}"/></svg>`;
}
// Dessin canvas centré en (cx,cy), taille px
const _p2d = {};
function drawIcon(ctx, key, cx, cy, size, color){
  const p = _p2d[key] || (_p2d[key] = new Path2D(ICON_PATHS[key]));
  ctx.save(); ctx.translate(cx-size/2, cy-size/2); ctx.scale(size/24, size/24);
  ctx.fillStyle = color; ctx.fill(p, 'evenodd'); ctx.restore();
}
