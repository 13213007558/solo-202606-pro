export interface Mural {
  id: string;
  name: string;
  nameEn: string;
  era: string;
  eraEn: string;
  description: string;
  baseColors: string[];
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number, hueShift: number) => void;
}

function shiftHue(color: string, shift: number): string {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  const hueShiftAmount = shift * 0.02;
  const coolFactor = shift / 100;
  
  const newR = Math.round(r * (1 - coolFactor * 0.6) + 70 * coolFactor);
  const newG = Math.round(g * (1 - coolFactor * 0.3) + 130 * coolFactor);
  const newB = Math.round(b * (1 + hueShiftAmount) + 180 * coolFactor);
  
  return `rgb(${Math.min(255, newR)}, ${Math.min(255, newG)}, ${Math.min(255, newB)})`;
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  
  ctx.globalAlpha = 0.1;
  for (let i = 0; i < 50; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#000' : '#fff';
    ctx.beginPath();
    ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 2 + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawDunhuang(ctx: CanvasRenderingContext2D, w: number, h: number, hue: number) {
  const c1 = shiftHue('#c41e3a', hue);
  const c2 = shiftHue('#d4af37', hue);
  const c3 = shiftHue('#4a7c59', hue);
  const c4 = shiftHue('#f5e6c8', hue);
  
  drawBackground(ctx, w, h, shiftHue('#f0e4c8', hue));
  
  ctx.strokeStyle = shiftHue('#8b6914', hue);
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.3, w * (0.3 + i * 0.08), h * (0.15 + i * 0.04), 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  const cx = w * 0.5;
  const cy = h * 0.45;
  
  ctx.fillStyle = c2;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.15, cy - h * 0.25);
  ctx.quadraticCurveTo(cx - w * 0.25, cy - h * 0.1, cx - w * 0.2, cy + h * 0.05);
  ctx.quadraticCurveTo(cx - w * 0.1, cy + h * 0.15, cx, cy + h * 0.2);
  ctx.quadraticCurveTo(cx + w * 0.1, cy + h * 0.15, cx + w * 0.2, cy + h * 0.05);
  ctx.quadraticCurveTo(cx + w * 0.25, cy - h * 0.1, cx + w * 0.15, cy - h * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = c1;
  ctx.lineWidth = 2;
  ctx.stroke();
  
  ctx.fillStyle = c4;
  ctx.beginPath();
  ctx.ellipse(cx, cy - h * 0.18, w * 0.06, h * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  
  ctx.fillStyle = c2;
  ctx.beginPath();
  ctx.arc(cx, cy - h * 0.18, w * 0.04, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.strokeStyle = c3;
  ctx.lineWidth = 3;
  for (let i = 0; i < 7; i++) {
    const angle = (Math.PI * 2 / 7) * i - Math.PI / 2;
    const x1 = cx + Math.cos(angle) * w * 0.12;
    const y1 = cy + h * 0.1 + Math.sin(angle) * h * 0.08;
    const x2 = cx + Math.cos(angle) * w * 0.28;
    const y2 = cy + h * 0.1 + Math.sin(angle) * h * 0.2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo((x1 + x2) / 2 + Math.sin(angle * 2) * 20, (y1 + y2) / 2, x2, y2);
    ctx.stroke();
  }
  
  ctx.fillStyle = c1;
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 / 12) * i;
    const x = cx + Math.cos(angle) * w * 0.35;
    const y = cy + Math.sin(angle) * h * 0.25;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPersian(ctx: CanvasRenderingContext2D, w: number, h: number, hue: number) {
  const c1 = shiftHue('#1e3a5f', hue);
  const c2 = shiftHue('#c41e3a', hue);
  const c3 = shiftHue('#d4af37', hue);
  const c4 = shiftHue('#2d5a27', hue);
  
  drawBackground(ctx, w, h, shiftHue('#f5e6d3', hue));
  
  ctx.fillStyle = c1;
  ctx.fillRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8);
  
  ctx.fillStyle = shiftHue('#f0e4c8', hue);
  ctx.fillRect(w * 0.12, h * 0.12, w * 0.76, h * 0.76);
  
  ctx.strokeStyle = c3;
  ctx.lineWidth = 3;
  ctx.strokeRect(w * 0.13, h * 0.13, w * 0.74, h * 0.74);
  
  const cx = w * 0.5;
  const cy = h * 0.45;
  
  for (let layer = 0; layer < 5; layer++) {
    const r = w * (0.28 - layer * 0.05);
    ctx.fillStyle = layer % 2 === 0 ? c2 : c4;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 / 8) * i + layer * 0.2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r * 0.8;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = c3;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  
  ctx.fillStyle = c3;
  ctx.beginPath();
  ctx.arc(cx, cy, w * 0.05, 0, Math.PI * 2);
  ctx.fill();
  
  for (let i = 0; i < 16; i++) {
    const angle = (Math.PI * 2 / 16) * i;
    const x = cx + Math.cos(angle) * w * 0.32;
    const y = cy + Math.sin(angle) * h * 0.26;
    
    ctx.fillStyle = i % 2 === 0 ? c2 : c4;
    ctx.beginPath();
    for (let j = 0; j < 6; j++) {
      const a = (Math.PI * 2 / 6) * j + angle;
      const px = x + Math.cos(a) * w * 0.03;
      const py = y + Math.sin(a) * h * 0.025;
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = c3;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  
  ctx.fillStyle = c1;
  for (let i = 0; i < 3; i++) {
    const y = h * (0.82 + i * 0.03);
    ctx.fillRect(w * 0.15, y, w * 0.7, 2);
  }
}

function drawMaya(ctx: CanvasRenderingContext2D, w: number, h: number, hue: number) {
  const c1 = shiftHue('#8b4513', hue);
  const c2 = shiftHue('#2d5a27', hue);
  const c3 = shiftHue('#c41e3a', hue);
  const c4 = shiftHue('#d4af37', hue);
  
  drawBackground(ctx, w, h, shiftHue('#e8d5b7', hue));
  
  ctx.fillStyle = c1;
  ctx.fillRect(w * 0.05, h * 0.05, w * 0.9, h * 0.9);
  
  const cx = w * 0.5;
  const cy = h * 0.5;
  
  ctx.fillStyle = shiftHue('#d4c4a8', hue);
  ctx.fillRect(w * 0.08, h * 0.08, w * 0.84, h * 0.84);
  
  ctx.fillStyle = c2;
  ctx.fillRect(cx - w * 0.25, cy - h * 0.3, w * 0.5, h * 0.15);
  
  ctx.fillStyle = c3;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.15, cy - h * 0.3);
  ctx.lineTo(cx, cy - h * 0.4);
  ctx.lineTo(cx + w * 0.15, cy - h * 0.3);
  ctx.closePath();
  ctx.fill();
  
  ctx.fillStyle = c4;
  ctx.beginPath();
  ctx.arc(cx, cy - h * 0.22, w * 0.04, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = c1;
  ctx.fillRect(cx - w * 0.2, cy - h * 0.1, w * 0.4, h * 0.08);
  
  ctx.fillStyle = c3;
  for (let i = 0; i < 5; i++) {
    const x = cx - w * 0.15 + i * w * 0.075;
    ctx.beginPath();
    ctx.arc(x, cy - h * 0.06, w * 0.025, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.fillStyle = c2;
  ctx.fillRect(cx - w * 0.22, cy + h * 0.02, w * 0.44, h * 0.25);
  
  ctx.fillStyle = c1;
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 3; j++) {
      const x = cx - w * 0.18 + i * w * 0.1;
      const y = cy + h * 0.05 + j * h * 0.07;
      ctx.fillRect(x, y, w * 0.06, h * 0.05);
      
      ctx.fillStyle = c4;
      ctx.beginPath();
      ctx.arc(x + w * 0.03, y + h * 0.025, w * 0.015, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c1;
    }
  }
  
  ctx.strokeStyle = c3;
  ctx.lineWidth = 4;
  ctx.strokeRect(w * 0.08, h * 0.08, w * 0.84, h * 0.84);
  
  ctx.fillStyle = c4;
  for (let i = 0; i < 8; i++) {
    const x = w * 0.08 + i * w * 0.12;
    ctx.beginPath();
    ctx.moveTo(x, h * 0.08);
    ctx.lineTo(x + w * 0.06, h * 0.08);
    ctx.lineTo(x + w * 0.03, h * 0.05);
    ctx.closePath();
    ctx.fill();
  }
}

function drawEgyptian(ctx: CanvasRenderingContext2D, w: number, h: number, hue: number) {
  const c1 = shiftHue('#d4af37', hue);
  const c2 = shiftHue('#1e3a5f', hue);
  const c3 = shiftHue('#c41e3a', hue);
  const c4 = shiftHue('#2d5a27', hue);
  
  drawBackground(ctx, w, h, shiftHue('#f0e4c8', hue));
  
  ctx.fillStyle = c2;
  ctx.fillRect(w * 0.05, h * 0.05, w * 0.9, h * 0.9);
  
  ctx.fillStyle = shiftHue('#e8d5b7', hue);
  ctx.fillRect(w * 0.08, h * 0.08, w * 0.84, h * 0.84);
  
  const cx = w * 0.45;
  const cy = h * 0.55;
  
  ctx.fillStyle = c1;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.05, cy - h * 0.25);
  ctx.lineTo(cx + w * 0.05, cy - h * 0.25);
  ctx.lineTo(cx + w * 0.08, cy - h * 0.18);
  ctx.lineTo(cx, cy - h * 0.3);
  ctx.lineTo(cx - w * 0.08, cy - h * 0.18);
  ctx.closePath();
  ctx.fill();
  
  ctx.fillStyle = shiftHue('#d4a574', hue);
  ctx.beginPath();
  ctx.arc(cx, cy - h * 0.15, w * 0.06, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = c3;
  ctx.fillRect(cx - w * 0.07, cy - h * 0.08, w * 0.14, h * 0.3);
  
  ctx.fillStyle = c1;
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(cx - w * 0.07, cy - h * 0.08 + i * h * 0.08, w * 0.14, h * 0.02);
  }
  
  ctx.fillStyle = shiftHue('#d4a574', hue);
  ctx.fillRect(cx - w * 0.1, cy - h * 0.05, w * 0.03, h * 0.2);
  ctx.fillRect(cx + w * 0.07, cy - h * 0.05, w * 0.03, h * 0.2);
  
  ctx.fillStyle = c4;
  ctx.fillRect(cx - w * 0.06, cy + h * 0.22, w * 0.05, h * 0.15);
  ctx.fillRect(cx + w * 0.01, cy + h * 0.22, w * 0.05, h * 0.15);
  
  ctx.fillStyle = c1;
  const sunX = w * 0.75;
  const sunY = h * 0.25;
  ctx.beginPath();
  ctx.arc(sunX, sunY, w * 0.08, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.strokeStyle = c1;
  ctx.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 / 12) * i;
    const x1 = sunX + Math.cos(angle) * w * 0.1;
    const y1 = sunY + Math.sin(angle) * h * 0.08;
    const x2 = sunX + Math.cos(angle) * w * 0.14;
    const y2 = sunY + Math.sin(angle) * h * 0.12;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  
  ctx.fillStyle = c2;
  ctx.fillRect(w * 0.6, cy - h * 0.25, w * 0.25, h * 0.4);
  
  ctx.fillStyle = c1;
  ctx.font = `bold ${w * 0.04}px serif`;
  ctx.fillText('𓂀 𓃭 𓆣 𓇳', w * 0.62, cy - h * 0.1);
  
  ctx.strokeStyle = c3;
  ctx.lineWidth = 3;
  ctx.strokeRect(w * 0.08, h * 0.08, w * 0.84, h * 0.84);
}

function drawGreek(ctx: CanvasRenderingContext2D, w: number, h: number, hue: number) {
  const c1 = shiftHue('#1a1a1a', hue);
  const c2 = shiftHue('#d4af37', hue);
  const c3 = shiftHue('#c41e3a', hue);
  
  drawBackground(ctx, w, h, shiftHue('#e8d5b7', hue));
  
  ctx.fillStyle = shiftHue('#f0e4c8', hue);
  ctx.fillRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8);
  
  ctx.fillStyle = c1;
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.5, w * 0.35, h * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.strokeStyle = c2;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.5, w * 0.38, h * 0.38, 0, 0, Math.PI * 2);
  ctx.stroke();
  
  const cx = w * 0.5;
  const cy = h * 0.5;
  
  ctx.fillStyle = shiftHue('#e8d5b7', hue);
  ctx.beginPath();
  ctx.arc(cx - w * 0.1, cy - h * 0.12, w * 0.05, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = shiftHue('#e8d5b7', hue);
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.18, cy - h * 0.05);
  ctx.lineTo(cx - w * 0.08, cy - h * 0.06);
  ctx.lineTo(cx - w * 0.05, cy + h * 0.1);
  ctx.lineTo(cx - w * 0.15, cy + h * 0.12);
  ctx.closePath();
  ctx.fill();
  
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.02, cy - h * 0.06);
  ctx.lineTo(cx + w * 0.08, cy - h * 0.05);
  ctx.lineTo(cx + w * 0.12, cy + h * 0.1);
  ctx.lineTo(cx + w * 0.02, cy + h * 0.12);
  ctx.closePath();
  ctx.fill();
  
  ctx.fillStyle = c3;
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.05, cy - h * 0.18);
  ctx.lineTo(cx + w * 0.25, cy - h * 0.25);
  ctx.lineTo(cx + w * 0.28, cy - h * 0.15);
  ctx.lineTo(cx + w * 0.1, cy - h * 0.1);
  ctx.closePath();
  ctx.fill();
  
  ctx.fillStyle = shiftHue('#e8d5b7', hue);
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.12, cy + h * 0.12);
  ctx.lineTo(cx - w * 0.1, cy + h * 0.25);
  ctx.lineTo(cx - w * 0.05, cy + h * 0.25);
  ctx.lineTo(cx - w * 0.03, cy + h * 0.12);
  ctx.closePath();
  ctx.fill();
  
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.02, cy + h * 0.12);
  ctx.lineTo(cx + w * 0.04, cy + h * 0.25);
  ctx.lineTo(cx + w * 0.09, cy + h * 0.25);
  ctx.lineTo(cx + w * 0.11, cy + h * 0.12);
  ctx.closePath();
  ctx.fill();
  
  ctx.fillStyle = shiftHue('#e8d5b7', hue);
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.1, cy - h * 0.1);
  ctx.quadraticCurveTo(cx + w * 0.2, cy - h * 0.05, cx + w * 0.22, cy + h * 0.05);
  ctx.lineTo(cx + w * 0.18, cy + h * 0.08);
  ctx.quadraticCurveTo(cx + w * 0.15, cy, cx + w * 0.08, cy - h * 0.05);
  ctx.closePath();
  ctx.fill();
  
  ctx.strokeStyle = c2;
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const y = h * (0.12 + i * 0.02);
    ctx.beginPath();
    ctx.moveTo(w * 0.15, y);
    ctx.lineTo(w * 0.85, y);
    for (let j = 0; j < 20; j++) {
      const x = w * 0.15 + j * w * 0.035;
      ctx.moveTo(x, y);
      ctx.lineTo(x + w * 0.01, y - h * 0.015);
      ctx.lineTo(x + w * 0.02, y);
    }
    ctx.stroke();
  }
}

function drawAjanta(ctx: CanvasRenderingContext2D, w: number, h: number, hue: number) {
  const c1 = shiftHue('#8b4513', hue);
  const c2 = shiftHue('#2d5a27', hue);
  const c3 = shiftHue('#1e3a5f', hue);
  const c4 = shiftHue('#d4af37', hue);
  
  drawBackground(ctx, w, h, shiftHue('#d4c4a8', hue));
  
  ctx.fillStyle = c1;
  ctx.fillRect(w * 0.05, h * 0.05, w * 0.9, h * 0.9);
  
  ctx.fillStyle = shiftHue('#e8d5b7', hue);
  ctx.fillRect(w * 0.08, h * 0.08, w * 0.84, h * 0.84);
  
  const cx = w * 0.5;
  const cy = h * 0.5;
  
  ctx.fillStyle = c4;
  ctx.beginPath();
  ctx.arc(cx, cy - h * 0.1, w * 0.2, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.strokeStyle = c3;
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 / 8) * i;
    ctx.beginPath();
    ctx.arc(cx, cy - h * 0.1, w * 0.2, angle, angle + Math.PI / 16);
    ctx.stroke();
  }
  
  ctx.fillStyle = shiftHue('#d4a574', hue);
  ctx.beginPath();
  ctx.arc(cx, cy - h * 0.1, w * 0.08, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = c3;
  ctx.beginPath();
  ctx.arc(cx - w * 0.025, cy - h * 0.12, w * 0.01, 0, Math.PI * 2);
  ctx.arc(cx + w * 0.025, cy - h * 0.12, w * 0.01, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = c1;
  ctx.beginPath();
  ctx.arc(cx, cy - h * 0.06, w * 0.015, 0, Math.PI);
  ctx.fill();
  
  ctx.fillStyle = c2;
  ctx.beginPath();
  ctx.ellipse(cx, cy + h * 0.15, w * 0.15, h * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = c4;
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(cx - w * 0.12, cy + h * 0.05 + i * h * 0.08, w * 0.24, h * 0.015);
  }
  
  ctx.fillStyle = c3;
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 / 6) * i - Math.PI / 2;
    const x = cx + Math.cos(angle) * w * 0.3;
    const y = cy + h * 0.05 + Math.sin(angle) * h * 0.25;
    
    ctx.beginPath();
    ctx.arc(x, y, w * 0.04, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = shiftHue('#d4a574', hue);
    ctx.beginPath();
    ctx.arc(x, y, w * 0.025, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c3;
  }
  
  ctx.fillStyle = c2;
  for (let i = 0; i < 15; i++) {
    const x = w * 0.1 + Math.random() * w * 0.8;
    const y = h * 0.1 + Math.random() * h * 0.8;
    ctx.beginPath();
    ctx.ellipse(x, y, w * 0.015, h * 0.025, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.strokeStyle = c4;
  ctx.lineWidth = 3;
  ctx.strokeRect(w * 0.08, h * 0.08, w * 0.84, h * 0.84);
}

function drawAztec(ctx: CanvasRenderingContext2D, w: number, h: number, hue: number) {
  const c1 = shiftHue('#8b4513', hue);
  const c2 = shiftHue('#c41e3a', hue);
  const c3 = shiftHue('#2d5a27', hue);
  const c4 = shiftHue('#1e3a5f', hue);
  
  drawBackground(ctx, w, h, shiftHue('#d4c4a8', hue));
  
  const cx = w * 0.5;
  const cy = h * 0.5;
  
  ctx.fillStyle = c1;
  ctx.fillRect(w * 0.05, h * 0.05, w * 0.9, h * 0.9);
  
  ctx.fillStyle = shiftHue('#e8d5b7', hue);
  ctx.fillRect(w * 0.08, h * 0.08, w * 0.84, h * 0.84);
  
  ctx.fillStyle = c4;
  ctx.beginPath();
  ctx.arc(cx, cy, w * 0.32, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = c2;
  ctx.beginPath();
  ctx.arc(cx, cy, w * 0.26, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = shiftHue('#d4af37', hue);
  ctx.beginPath();
  ctx.arc(cx, cy, w * 0.2, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = c4;
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 / 8) * i;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, -w * 0.2);
    ctx.lineTo(w * 0.03, -w * 0.12);
    ctx.lineTo(-w * 0.03, -w * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  
  ctx.fillStyle = c2;
  ctx.beginPath();
  ctx.arc(cx, cy, w * 0.1, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = c4;
  ctx.beginPath();
  ctx.arc(cx, cy, w * 0.06, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = shiftHue('#d4af37', hue);
  ctx.beginPath();
  ctx.arc(cx, cy, w * 0.03, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = c3;
  for (let i = 0; i < 20; i++) {
    const angle = (Math.PI * 2 / 20) * i;
    const x = cx + Math.cos(angle) * w * 0.36;
    const y = cy + Math.sin(angle) * h * 0.29;
    
    ctx.beginPath();
    ctx.moveTo(x, y - h * 0.025);
    ctx.lineTo(x + w * 0.02, y + h * 0.015);
    ctx.lineTo(x - w * 0.02, y + h * 0.015);
    ctx.closePath();
    ctx.fill();
  }
  
  ctx.fillStyle = c4;
  for (let i = 0; i < 4; i++) {
    const x = w * (0.12 + i * 0.25);
    ctx.fillRect(x, h * 0.1, w * 0.12, h * 0.05);
    ctx.fillRect(x, h * 0.85, w * 0.12, h * 0.05);
  }
  
  ctx.fillStyle = c2;
  for (let i = 0; i < 10; i++) {
    const x = w * 0.1 + i * w * 0.08;
    ctx.beginPath();
    ctx.arc(x, h * 0.125, w * 0.015, 0, Math.PI * 2);
    ctx.arc(x, h * 0.875, w * 0.015, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawUkiyoE(ctx: CanvasRenderingContext2D, w: number, h: number, hue: number) {
  const c1 = shiftHue('#1a1a1a', hue);
  const c2 = shiftHue('#c41e3a', hue);
  const c3 = shiftHue('#1e3a5f', hue);
  const c4 = shiftHue('#d4af37', hue);
  
  drawBackground(ctx, w, h, shiftHue('#f0e4c8', hue));
  
  ctx.fillStyle = c3;
  ctx.fillRect(w * 0.05, h * 0.05, w * 0.9, h * 0.5);
  
  ctx.fillStyle = shiftHue('#f5e6d3', hue);
  ctx.beginPath();
  ctx.moveTo(w * 0.05, h * 0.35);
  ctx.quadraticCurveTo(w * 0.25, h * 0.2, w * 0.4, h * 0.3);
  ctx.quadraticCurveTo(w * 0.55, h * 0.15, w * 0.7, h * 0.25);
  ctx.quadraticCurveTo(w * 0.85, h * 0.1, w * 0.95, h * 0.2);
  ctx.lineTo(w * 0.95, h * 0.55);
  ctx.lineTo(w * 0.05, h * 0.55);
  ctx.closePath();
  ctx.fill();
  
  ctx.fillStyle = c1;
  ctx.beginPath();
  ctx.moveTo(w * 0.1, h * 0.45);
  ctx.lineTo(w * 0.2, h * 0.2);
  ctx.lineTo(w * 0.35, h * 0.3);
  ctx.lineTo(w * 0.5, h * 0.15);
  ctx.lineTo(w * 0.65, h * 0.28);
  ctx.lineTo(w * 0.8, h * 0.18);
  ctx.lineTo(w * 0.9, h * 0.4);
  ctx.lineTo(w * 0.9, h * 0.55);
  ctx.lineTo(w * 0.1, h * 0.55);
  ctx.closePath();
  ctx.fill();
  
  ctx.fillStyle = c2;
  ctx.fillRect(w * 0.05, h * 0.55, w * 0.9, h * 0.4);
  
  const cx = w * 0.35;
  const cy = h * 0.65;
  
  ctx.fillStyle = shiftHue('#f5e6d3', hue);
  ctx.beginPath();
  ctx.ellipse(cx, cy - h * 0.1, w * 0.06, h * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = c1;
  ctx.beginPath();
  ctx.arc(cx - w * 0.02, cy - h * 0.12, w * 0.008, 0, Math.PI * 2);
  ctx.arc(cx + w * 0.02, cy - h * 0.12, w * 0.008, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = c4;
  ctx.beginPath();
  ctx.arc(cx, cy - h * 0.06, w * 0.012, 0, Math.PI);
  ctx.fill();
  
  ctx.fillStyle = c1;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.08, cy - h * 0.12);
  ctx.quadraticCurveTo(cx - w * 0.1, cy - h * 0.2, cx - w * 0.05, cy - h * 0.22);
  ctx.quadraticCurveTo(cx, cy - h * 0.25, cx + w * 0.05, cy - h * 0.22);
  ctx.quadraticCurveTo(cx + w * 0.1, cy - h * 0.2, cx + w * 0.08, cy - h * 0.12);
  ctx.lineTo(cx + w * 0.06, cy - h * 0.08);
  ctx.quadraticCurveTo(cx, cy - h * 0.18, cx - w * 0.06, cy - h * 0.08);
  ctx.closePath();
  ctx.fill();
  
  ctx.fillStyle = c3;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.12, cy - h * 0.03);
  ctx.quadraticCurveTo(cx - w * 0.18, cy + h * 0.1, cx - w * 0.15, cy + h * 0.25);
  ctx.lineTo(cx + w * 0.15, cy + h * 0.25);
  ctx.quadraticCurveTo(cx + w * 0.18, cy + h * 0.1, cx + w * 0.12, cy - h * 0.03);
  ctx.closePath();
  ctx.fill();
  
  ctx.fillStyle = c4;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(cx - w * 0.08 + i * w * 0.04, cy + h * 0.1, w * 0.01, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.fillStyle = c1;
  ctx.fillRect(w * 0.6, h * 0.6, w * 0.25, h * 0.3);
  
  ctx.fillStyle = shiftHue('#f5e6d3', hue);
  ctx.font = `bold ${w * 0.035}px serif`;
  ctx.fillText('富嶽三十六景', w * 0.62, h * 0.7);
  ctx.fillText('神奈川沖浪裏', w * 0.62, h * 0.78);
  
  ctx.fillStyle = c1;
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(w * 0.05, h * (0.6 + i * 0.06), w * 0.02, h * 0.04);
  }
  
  ctx.strokeStyle = c1;
  ctx.lineWidth = 4;
  ctx.strokeRect(w * 0.05, h * 0.05, w * 0.9, h * 0.9);
}

function drawByzantine(ctx: CanvasRenderingContext2D, w: number, h: number, hue: number) {
  const c1 = shiftHue('#d4af37', hue);
  const c2 = shiftHue('#1e3a5f', hue);
  const c3 = shiftHue('#8b4513', hue);
  const c4 = shiftHue('#c41e3a', hue);
  
  drawBackground(ctx, w, h, shiftHue('#d4af37', hue));
  
  ctx.fillStyle = c2;
  ctx.fillRect(w * 0.05, h * 0.05, w * 0.9, h * 0.9);
  
  ctx.fillStyle = c1;
  for (let i = 0; i < 100; i++) {
    const x = w * 0.05 + Math.random() * w * 0.9;
    const y = h * 0.05 + Math.random() * h * 0.9;
    const size = w * 0.01 + Math.random() * w * 0.015;
    ctx.fillRect(x, y, size, size);
  }
  
  const cx = w * 0.5;
  const cy = h * 0.45;
  
  ctx.fillStyle = c1;
  ctx.beginPath();
  ctx.arc(cx, cy - h * 0.15, w * 0.1, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = shiftHue('#d4a574', hue);
  ctx.beginPath();
  ctx.arc(cx, cy - h * 0.15, w * 0.07, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = c3;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.06, cy - h * 0.22);
  ctx.quadraticCurveTo(cx, cy - h * 0.3, cx + w * 0.06, cy - h * 0.22);
  ctx.quadraticCurveTo(cx + w * 0.08, cy - h * 0.18, cx + w * 0.06, cy - h * 0.14);
  ctx.lineTo(cx - w * 0.06, cy - h * 0.14);
  ctx.quadraticCurveTo(cx - w * 0.08, cy - h * 0.18, cx - w * 0.06, cy - h * 0.22);
  ctx.closePath();
  ctx.fill();
  
  ctx.fillStyle = c1;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(cx - w * 0.04 + i * w * 0.02, cy - h * 0.24, w * 0.01, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.fillStyle = c4;
  ctx.fillRect(cx - w * 0.12, cy - h * 0.05, w * 0.24, h * 0.35);
  
  ctx.fillStyle = c1;
  ctx.fillRect(cx - w * 0.1, cy - h * 0.03, w * 0.2, h * 0.02);
  ctx.fillRect(cx - w * 0.1, cy + h * 0.05, w * 0.2, h * 0.02);
  ctx.fillRect(cx - w * 0.1, cy + h * 0.13, w * 0.2, h * 0.02);
  ctx.fillRect(cx - w * 0.1, cy + h * 0.21, w * 0.2, h * 0.02);
  
  ctx.fillStyle = c1;
  ctx.beginPath();
  ctx.moveTo(cx, cy - h * 0.25);
  ctx.lineTo(cx - w * 0.02, cy - h * 0.32);
  ctx.lineTo(cx, cy - h * 0.3);
  ctx.lineTo(cx + w * 0.02, cy - h * 0.32);
  ctx.closePath();
  ctx.fill();
  
  ctx.strokeStyle = c1;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.15, cy - h * 0.35);
  ctx.lineTo(cx, cy - h * 0.42);
  ctx.lineTo(cx + w * 0.15, cy - h * 0.35);
  ctx.stroke();
  
  ctx.fillStyle = shiftHue('#d4a574', hue);
  ctx.fillRect(cx - w * 0.16, cy - h * 0.02, w * 0.04, h * 0.15);
  ctx.fillRect(cx + w * 0.12, cy - h * 0.02, w * 0.04, h * 0.15);
  
  ctx.beginPath();
  ctx.arc(cx - w * 0.14, cy - h * 0.02, w * 0.02, 0, Math.PI * 2);
  ctx.arc(cx + w * 0.14, cy - h * 0.02, w * 0.02, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = c1;
  ctx.font = `bold ${w * 0.04}px serif`;
  ctx.textAlign = 'center';
  ctx.fillText('✝', cx, h * 0.85);
  ctx.textAlign = 'left';
  
  ctx.strokeStyle = c1;
  ctx.lineWidth = 5;
  ctx.strokeRect(w * 0.05, h * 0.05, w * 0.9, h * 0.9);
}

function drawAfrican(ctx: CanvasRenderingContext2D, w: number, h: number, hue: number) {
  const c1 = shiftHue('#8b4513', hue);
  const c2 = shiftHue('#d4a574', hue);
  const c3 = shiftHue('#c41e3a', hue);
  const c4 = shiftHue('#2d5a27', hue);
  const c5 = shiftHue('#1e3a5f', hue);
  
  drawBackground(ctx, w, h, shiftHue('#d4c4a8', hue));
  
  ctx.fillStyle = c1;
  ctx.fillRect(w * 0.05, h * 0.05, w * 0.9, h * 0.9);
  
  ctx.fillStyle = shiftHue('#e8d5b7', hue);
  ctx.fillRect(w * 0.08, h * 0.08, w * 0.84, h * 0.84);
  
  const cx = w * 0.5;
  const cy = h * 0.5;
  
  ctx.fillStyle = c2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.25, h * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = c1;
  ctx.beginPath();
  ctx.arc(cx - w * 0.08, cy - h * 0.08, w * 0.02, 0, Math.PI * 2);
  ctx.arc(cx + w * 0.08, cy - h * 0.08, w * 0.02, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = c3;
  ctx.beginPath();
  ctx.ellipse(cx, cy + h * 0.02, w * 0.03, h * 0.015, 0, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = c4;
  ctx.beginPath();
  ctx.arc(cx, cy - h * 0.18, w * 0.04, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.strokeStyle = c1;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.05, cy - h * 0.03);
  ctx.quadraticCurveTo(cx, cy + h * 0.02, cx + w * 0.05, cy - h * 0.03);
  ctx.stroke();
  
  ctx.fillStyle = c3;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.2, cy - h * 0.25 + i * h * 0.08);
    ctx.lineTo(cx - w * 0.12, cy - h * 0.25 + i * h * 0.08);
    ctx.lineTo(cx - w * 0.16, cy - h * 0.22 + i * h * 0.08);
    ctx.closePath();
    ctx.fill();
  }
  
  ctx.fillStyle = c5;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + w * 0.12, cy - h * 0.25 + i * h * 0.08);
    ctx.lineTo(cx + w * 0.2, cy - h * 0.25 + i * h * 0.08);
    ctx.lineTo(cx + w * 0.16, cy - h * 0.22 + i * h * 0.08);
    ctx.closePath();
    ctx.fill();
  }
  
  ctx.fillStyle = c4;
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 / 8) * i;
    const x = cx + Math.cos(angle) * w * 0.35;
    const y = cy + Math.sin(angle) * h * 0.28;
    
    ctx.beginPath();
    ctx.arc(x, y, w * 0.025, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = c3;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, w * 0.04, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  ctx.fillStyle = c3;
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(w * 0.15 + i * w * 0.2, h * 0.12, w * 0.015, h * 0.08);
    ctx.fillRect(w * 0.15 + i * w * 0.2, h * 0.8, w * 0.015, h * 0.08);
  }
  
  ctx.fillStyle = c5;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(w * 0.1 + i * w * 0.16, h * 0.9, w * 0.02, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.strokeStyle = c1;
  ctx.lineWidth = 3;
  ctx.strokeRect(w * 0.08, h * 0.08, w * 0.84, h * 0.84);
}

function drawViking(ctx: CanvasRenderingContext2D, w: number, h: number, hue: number) {
  const c1 = shiftHue('#1a1a1a', hue);
  const c2 = shiftHue('#8b4513', hue);
  const c3 = shiftHue('#c41e3a', hue);
  const c4 = shiftHue('#d4af37', hue);
  const c5 = shiftHue('#2d5a27', hue);
  
  drawBackground(ctx, w, h, shiftHue('#d4c4a8', hue));
  
  ctx.fillStyle = c2;
  ctx.fillRect(w * 0.05, h * 0.05, w * 0.9, h * 0.9);
  
  ctx.fillStyle = shiftHue('#e8d5b7', hue);
  ctx.fillRect(w * 0.08, h * 0.08, w * 0.84, h * 0.84);
  
  const cx = w * 0.5;
  const cy = h * 0.5;
  
  ctx.fillStyle = c1;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.15, cy - h * 0.2);
  ctx.lineTo(cx + w * 0.15, cy - h * 0.2);
  ctx.lineTo(cx + w * 0.15, cy - h * 0.1);
  ctx.quadraticCurveTo(cx + w * 0.1, cy - h * 0.05, cx + w * 0.08, cy);
  ctx.lineTo(cx + w * 0.08, cy + h * 0.15);
  ctx.lineTo(cx - w * 0.08, cy + h * 0.15);
  ctx.lineTo(cx - w * 0.08, cy);
  ctx.quadraticCurveTo(cx - w * 0.1, cy - h * 0.05, cx - w * 0.15, cy - h * 0.1);
  ctx.closePath();
  ctx.fill();
  
  ctx.fillStyle = shiftHue('#d4a574', hue);
  ctx.beginPath();
  ctx.arc(cx, cy - h * 0.02, w * 0.05, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = c1;
  ctx.beginPath();
  ctx.arc(cx - w * 0.015, cy - h * 0.03, w * 0.008, 0, Math.PI * 2);
  ctx.arc(cx + w * 0.015, cy - h * 0.03, w * 0.008, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = c3;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.12, cy - h * 0.2);
  ctx.lineTo(cx - w * 0.15, cy - h * 0.32);
  ctx.lineTo(cx - w * 0.08, cy - h * 0.2);
  ctx.closePath();
  ctx.fill();
  
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.08, cy - h * 0.2);
  ctx.lineTo(cx + w * 0.15, cy - h * 0.32);
  ctx.lineTo(cx + w * 0.12, cy - h * 0.2);
  ctx.closePath();
  ctx.fill();
  
  ctx.fillStyle = c4;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.05, cy - h * 0.18);
  ctx.lineTo(cx, cy - h * 0.28);
  ctx.lineTo(cx + w * 0.05, cy - h * 0.18);
  ctx.closePath();
  ctx.fill();
  
  ctx.fillStyle = c5;
  ctx.fillRect(cx - w * 0.1, cy + h * 0.15, w * 0.2, h * 0.03);
  
  ctx.fillStyle = c3;
  ctx.fillRect(cx - w * 0.15, cy + h * 0.18, w * 0.3, h * 0.12);
  
  ctx.fillStyle = c4;
  for (let i = 0; i < 4; i++) {
    const x = cx - w * 0.12 + i * w * 0.08;
    ctx.beginPath();
    ctx.moveTo(x, cy + h * 0.18);
    ctx.lineTo(x + w * 0.04, cy + h * 0.18);
    ctx.lineTo(x + w * 0.02, cy + h * 0.24);
    ctx.closePath();
    ctx.fill();
  }
  
  ctx.strokeStyle = c4;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.3, cy - h * 0.1);
  ctx.lineTo(cx - w * 0.3, cy + h * 0.25);
  ctx.quadraticCurveTo(cx, cy + h * 0.35, cx + w * 0.3, cy + h * 0.25);
  ctx.lineTo(cx + w * 0.3, cy - h * 0.1);
  ctx.stroke();
  
  ctx.fillStyle = c3;
  for (let i = 0; i < 7; i++) {
    const x = cx - w * 0.25 + i * w * 0.08;
    const height = h * (0.08 + Math.sin(i * 0.8) * 0.03);
    ctx.beginPath();
    ctx.moveTo(x, cy - h * 0.1);
    ctx.lineTo(x + w * 0.04, cy - h * 0.1);
    ctx.lineTo(x + w * 0.02, cy - h * 0.1 - height);
    ctx.closePath();
    ctx.fill();
  }
  
  ctx.strokeStyle = c1;
  ctx.lineWidth = 2;
  const knotPoints = [
    [0.1, 0.15], [0.15, 0.1], [0.2, 0.15], [0.25, 0.1],
    [0.75, 0.1], [0.8, 0.15], [0.85, 0.1], [0.9, 0.15]
  ];
  ctx.beginPath();
  for (let i = 0; i < knotPoints.length; i++) {
    const x = w * knotPoints[i][0];
    const y = h * knotPoints[i][1];
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  
  ctx.beginPath();
  for (let i = 0; i < knotPoints.length; i++) {
    const x = w * knotPoints[i][0];
    const y = h * (1 - knotPoints[i][1]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  
  ctx.strokeStyle = c2;
  ctx.lineWidth = 4;
  ctx.strokeRect(w * 0.08, h * 0.08, w * 0.84, h * 0.84);
}

function drawAboriginal(ctx: CanvasRenderingContext2D, w: number, h: number, hue: number) {
  const c1 = shiftHue('#8b4513', hue);
  const c2 = shiftHue('#d4a574', hue);
  const c3 = shiftHue('#1a1a1a', hue);
  const c4 = shiftHue('#c41e3a', hue);
  const c5 = shiftHue('#f5e6c8', hue);
  
  drawBackground(ctx, w, h, c1);
  
  const cx = w * 0.5;
  const cy = h * 0.5;
  
  ctx.fillStyle = c3;
  ctx.beginPath();
  ctx.arc(cx, cy, w * 0.35, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = c1;
  ctx.beginPath();
  ctx.arc(cx, cy, w * 0.3, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = c2;
  ctx.beginPath();
  ctx.arc(cx, cy, w * 0.25, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = c1;
  ctx.beginPath();
  ctx.arc(cx, cy, w * 0.2, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = c3;
  ctx.beginPath();
  ctx.arc(cx, cy, w * 0.15, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = c4;
  ctx.beginPath();
  ctx.arc(cx, cy, w * 0.1, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = c5;
  ctx.beginPath();
  ctx.arc(cx, cy, w * 0.05, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = c3;
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 / 12) * i;
    const x = cx + Math.cos(angle) * w * 0.38;
    const y = cy + Math.sin(angle) * h * 0.3;
    
    ctx.beginPath();
    ctx.arc(x, y, w * 0.02, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.fillStyle = c4;
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 / 8) * i + Math.PI / 8;
    const x = cx + Math.cos(angle) * w * 0.32;
    const y = cy + Math.sin(angle) * h * 0.25;
    
    ctx.beginPath();
    ctx.arc(x, y, w * 0.025, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.fillStyle = c2;
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 / 6) * i + Math.PI / 6;
    const x = cx + Math.cos(angle) * w * 0.22;
    const y = cy + Math.sin(angle) * h * 0.17;
    
    ctx.beginPath();
    ctx.arc(x, y, w * 0.018, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.strokeStyle = c3;
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI * 2 / 4) * i;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * w * 0.12, cy + Math.sin(angle) * h * 0.09);
    ctx.quadraticCurveTo(
      cx + Math.cos(angle + 0.3) * w * 0.25,
      cy + Math.sin(angle + 0.3) * h * 0.19,
      cx + Math.cos(angle) * w * 0.38,
      cy + Math.sin(angle) * h * 0.3
    );
    ctx.stroke();
  }
  
  ctx.fillStyle = c5;
  for (let i = 0; i < 30; i++) {
    const x = w * 0.05 + Math.random() * w * 0.9;
    const y = h * 0.05 + Math.random() * h * 0.9;
    ctx.beginPath();
    ctx.arc(x, y, w * 0.008 + Math.random() * w * 0.008, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.strokeStyle = c3;
  ctx.lineWidth = 4;
  ctx.strokeRect(w * 0.05, h * 0.05, w * 0.9, h * 0.9);
}

export const murals: Mural[] = [
  {
    id: 'dunhuang',
    name: '敦煌飞天',
    nameEn: 'Dunhuang Flying Apsaras',
    era: '唐代 · 公元618-907年',
    eraEn: 'Tang Dynasty · 618-907 AD',
    description: '敦煌飞天是中国佛教艺术的瑰宝，描绘了在空中飞舞的天人形象。这些壁画位于甘肃省敦煌莫高窟，融汇了中印两国的艺术风格，以飘逸的丝带、优雅的姿态和丰富的色彩展现了佛教净土的美妙景象。飞天不依靠翅膀，仅凭云气和飘带便能凌空起舞，是中国古代艺术家最富想象力的创造之一。',
    baseColors: ['#c41e3a', '#d4af37', '#4a7c59', '#f5e6c8'],
    draw: drawDunhuang
  },
  {
    id: 'persian',
    name: '波斯细密画',
    nameEn: 'Persian Miniature',
    era: '萨法维王朝 · 公元1501-1736年',
    eraEn: 'Safavid Dynasty · 1501-1736 AD',
    description: '波斯细密画是伊朗传统艺术的精华，以精细的笔触、丰富的色彩和复杂的构图著称。这些小型画作常装饰于手稿或书籍中，描绘宫廷生活、狩猎场景、历史故事和神秘主义主题。艺术家们运用几何对称、细腻的纹理和程式化的人物形象，创造出既装饰性又富有叙事性的艺术世界。',
    baseColors: ['#1e3a5f', '#c41e3a', '#d4af37', '#2d5a27'],
    draw: drawPersian
  },
  {
    id: 'maya',
    name: '玛雅图腾',
    nameEn: 'Maya Totem',
    era: '古典时期 · 公元250-900年',
    eraEn: 'Classic Period · 250-900 AD',
    description: '玛雅壁画是中美洲古代文明的重要遗存，广泛发现于墨西哥和危地马拉的神庙与宫殿中。这些壁画描绘了玛雅人的神祇、统治者、祭祀仪式和日常生活。图腾符号融合了人类与动物的特征，采用鲜明的红、黄、蓝、黑四色，配合独特的象形文字，记录了玛雅复杂的宇宙观和历史。',
    baseColors: ['#8b4513', '#2d5a27', '#c41e3a', '#d4af37'],
    draw: drawMaya
  },
  {
    id: 'egyptian',
    name: '埃及壁画',
    nameEn: 'Egyptian Mural',
    era: '新王国时期 · 公元前1550-1070年',
    eraEn: 'New Kingdom · 1550-1070 BC',
    description: '古埃及壁画装饰于法老的陵墓和神庙中，其独特的"正面律"风格影响了整个地中海艺术。人物采用头部侧面、肩部正面、腰部以下侧面的程式化表现，配合象形文字，讲述神话故事、法老功绩和来世信仰。色彩保持千年鲜艳，得益于沙漠干燥的气候和使用矿物颜料的精湛技艺。',
    baseColors: ['#d4af37', '#1e3a5f', '#c41e3a', '#2d5a27'],
    draw: drawEgyptian
  },
  {
    id: 'greek',
    name: '希腊瓶画',
    nameEn: 'Greek Vase Painting',
    era: '古风时期 · 公元前700-480年',
    eraEn: 'Archaic Period · 700-480 BC',
    description: '古希腊瓶画是西方绘画的源头，以红绘和黑绘两种主要风格闻名于后世。艺术家们在陶瓶上描绘神话传说、奥林匹克竞技、宴饮场景和日常生活。流畅的线条、优美的人体比例和生动的叙事性，展现了古希腊人对"美"的极致追求，也为研究古希腊社会提供了珍贵的图像资料。',
    baseColors: ['#1a1a1a', '#d4af37', '#c41e3a', '#e8d5b7'],
    draw: drawGreek
  },
  {
    id: 'ajanta',
    name: '阿旃陀石窟',
    nameEn: 'Ajanta Cave Painting',
    era: '笈多王朝 · 公元200-650年',
    eraEn: 'Gupta Empire · 200-650 AD',
    description: '印度阿旃陀石窟壁画是佛教艺术的巅峰之作，开凿于德干高原的玄武岩悬崖上。29座石窟中保存了大量描绘佛陀本生故事、菩萨形象和宫廷生活的壁画。艺术家们运用"凹凸法"晕染技巧，使人物形象富有立体感，优雅的体态、柔美的线条和宁静的表情，体现了印度古典美学的精髓。',
    baseColors: ['#8b4513', '#2d5a27', '#1e3a5f', '#d4af37'],
    draw: drawAjanta
  },
  {
    id: 'aztec',
    name: '阿兹特克古抄本',
    nameEn: 'Aztec Codex',
    era: '后古典时期 · 公元1300-1521年',
    eraEn: 'Post-classic Period · 1300-1521 AD',
    description: '阿兹特克古抄本是中美洲原住民的智慧结晶，用动物皮或树皮纸制成，记录了天文历法、祭祀仪式、神话传说和族谱。这些手抄本以鲜艳的色彩和程式化的图像符号系统，展现了阿兹特克人复杂的宇宙观。著名的太阳历石将时间与神祇完美结合，象征着阿兹特克文明对宇宙秩序的理解。',
    baseColors: ['#8b4513', '#c41e3a', '#2d5a27', '#1e3a5f'],
    draw: drawAztec
  },
  {
    id: 'ukiyoe',
    name: '浮世绘',
    nameEn: 'Ukiyo-e',
    era: '江户时代 · 公元1603-1868年',
    eraEn: 'Edo Period · 1603-1868 AD',
    description: '浮世绘是日本江户时代兴起的木版印刷艺术，以描绘"浮华世界"的风景、艺伎、歌舞伎演员和相扑力士闻名。葛饰北斋的《富岳三十六景》、喜多川歌麿的美人绘、歌川广重的风景版画，将日本的自然与人文之美凝结于方寸之间。这种艺术后来通过商船传入欧洲，深刻影响了印象派和后印象派画家。',
    baseColors: ['#1a1a1a', '#c41e3a', '#1e3a5f', '#d4af37'],
    draw: drawUkiyoE
  },
  {
    id: 'byzantine',
    name: '拜占庭马赛克',
    nameEn: 'Byzantine Mosaic',
    era: '查士丁尼时代 · 公元527-565年',
    eraEn: 'Justinian Era · 527-565 AD',
    description: '拜占庭马赛克是东罗马帝国艺术的最高成就，以彩色玻璃、石材和金箔拼接而成，装饰于教堂的墙壁和穹顶。拉文纳的圣维塔莱教堂保存了最精美的拜占庭镶嵌画，皇帝查士丁尼与皇后狄奥多拉的仪仗队列庄严肃穆。金箔背景闪烁着天国的光芒，人物形象程式化而神圣，体现了基督教的神秘主义精神。',
    baseColors: ['#d4af37', '#1e3a5f', '#8b4513', '#c41e3a'],
    draw: drawByzantine
  },
  {
    id: 'african',
    name: '非洲岩画',
    nameEn: 'African Rock Art',
    era: '新石器时代 · 公元前10000-2000年',
    eraEn: 'Neolithic Period · 10000-2000 BC',
    description: '非洲岩画是人类最古老的艺术形式之一，广泛分布于撒哈拉沙漠和南部非洲。这些岩画描绘了大象、犀牛、长颈鹿等野生动物，以及狩猎、舞蹈和祭祀的人类形象。简洁的轮廓、几何化的造型和鲜明的赭石色彩，记录了远古人类与自然共生的生活图景，是跨文化、跨时空的人类共同艺术遗产。',
    baseColors: ['#8b4513', '#d4a574', '#c41e3a', '#2d5a27'],
    draw: drawAfrican
  },
  {
    id: 'viking',
    name: '维京艺术',
    nameEn: 'Viking Art',
    era: '维京时代 · 公元793-1066年',
    eraEn: 'Viking Age · 793-1066 AD',
    description: '维京艺术是北欧海盗文明的视觉表达，以复杂的绳结图案、缠绕的兽形装饰和凶猛的战士形象著称。这种艺术风格广泛应用于木雕、金属制品、石刻和船首装饰。野兽交缠的" gripping beast"风格和华丽的"Jelling"风格，展现了维京人对力量、勇气和神秘自然的崇拜，其影响延伸至整个欧洲的装饰艺术。',
    baseColors: ['#1a1a1a', '#8b4513', '#c41e3a', '#d4af37'],
    draw: drawViking
  },
  {
    id: 'aboriginal',
    name: '原住民梦幻时光',
    nameEn: 'Aboriginal Dreamtime',
    era: '永续传承 · 超过60000年',
    eraEn: 'Continuous Tradition · Over 60000 Years',
    description: '澳大利亚原住民艺术是世界上最古老的持续艺术传统，与"梦幻时光"(Dreamtime)的创世神话紧密相连。圆点绘画、X射线绘画和树皮画等形式，通过同心圆、波浪线和象征符号，讲述祖先创世、地理景观和文化律法。这些艺术不仅是美的表达，更是原住民传递知识、连接过去与现在的神圣媒介。',
    baseColors: ['#8b4513', '#d4a574', '#1a1a1a', '#c41e3a'],
    draw: drawAboriginal
  }
];
