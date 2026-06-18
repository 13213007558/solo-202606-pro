export interface MuralData {
  id: string;
  name: string;
  nameEn: string;
  era: string;
  eraEn: string;
  description: string;
  descriptionEn: string;
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number, toneShift: number) => void;
}

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  if (!c1 || !c2) return color1;
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function adjustTone(color: string, toneShift: number): string {
  const warmTint = '#d4a84b';
  const coolTint = '#4a90b8';
  const mixed = lerpColor(warmTint, coolTint, toneShift);
  return lerpColor(color, mixed, toneShift * 0.4);
}

function drawDunhuangApsaras(ctx: CanvasRenderingContext2D, w: number, h: number, tone: number) {
  const bg = adjustTone('#c9a66b', tone);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const stoneTex = adjustTone('#a8884a', tone);
  for (let i = 0; i < 80; i++) {
    ctx.fillStyle = stoneTex;
    ctx.globalAlpha = 0.1 + Math.random() * 0.1;
    const x = Math.random() * w;
    const y = Math.random() * h;
    ctx.beginPath();
    ctx.arc(x, y, Math.random() * 3 + 1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const haloColor = adjustTone('#ffd700', tone);
  const gradient = ctx.createRadialGradient(w * 0.5, h * 0.3, 10, w * 0.5, h * 0.3, h * 0.25);
  gradient.addColorStop(0, haloColor);
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.3, h * 0.25, 0, Math.PI * 2);
  ctx.fill();

  const ribbonColors = [
    adjustTone('#e74c3c', tone),
    adjustTone('#f39c12', tone),
    adjustTone('#9b59b6', tone),
  ];

  for (let i = 0; i < 5; i++) {
    const offset = i * 0.15;
    ctx.strokeStyle = ribbonColors[i % 3];
    ctx.lineWidth = 8 + i * 2;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(w * (0.2 + offset), h * 0.2);
    ctx.bezierCurveTo(
      w * (0.3 + offset), h * 0.5,
      w * (0.1 + offset), h * 0.7,
      w * (0.4 + offset), h * 0.9
    );
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const bodyColor = adjustTone('#f5deb3', tone);
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.45, w * 0.06, h * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.3, h * 0.07, 0, Math.PI * 2);
  ctx.fill();

  const hairColor = adjustTone('#2c1810', tone);
  ctx.fillStyle = hairColor;
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.28, h * 0.065, Math.PI, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = ribbonColors[2];
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(w * 0.45, h * 0.5);
  ctx.bezierCurveTo(w * 0.3, h * 0.6, w * 0.25, h * 0.8, w * 0.35, h * 0.95);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w * 0.55, h * 0.5);
  ctx.bezierCurveTo(w * 0.7, h * 0.6, w * 0.75, h * 0.8, w * 0.65, h * 0.95);
  ctx.stroke();

  const flowerColors = [adjustTone('#ff6b9d', tone), adjustTone('#fff68f', tone), adjustTone('#98d8c8', tone)];
  for (let i = 0; i < 8; i++) {
    const fx = w * (0.15 + Math.random() * 0.7);
    const fy = h * (0.05 + Math.random() * 0.2);
    const petalColor = flowerColors[i % 3];
    ctx.fillStyle = petalColor;
    for (let j = 0; j < 5; j++) {
      const angle = (j / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(fx + Math.cos(angle) * 8, fy + Math.sin(angle) * 8, 5, 8, angle, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = adjustTone('#ffd700', tone);
    ctx.beginPath();
    ctx.arc(fx, fy, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPersianMiniature(ctx: CanvasRenderingContext2D, w: number, h: number, tone: number) {
  const bg = adjustTone('#1a472a', tone);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const goldColor = adjustTone('#d4af37', tone);
  ctx.strokeStyle = goldColor;
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, w - 40, h - 40);

  const skyColor = adjustTone('#4a90a4', tone);
  ctx.fillStyle = skyColor;
  ctx.fillRect(30, 30, w - 60, h * 0.3);

  const sunColor = adjustTone('#ffd700', tone);
  const sunGrad = ctx.createRadialGradient(w * 0.75, h * 0.18, 5, w * 0.75, h * 0.18, h * 0.1);
  sunGrad.addColorStop(0, sunColor);
  sunGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(w * 0.75, h * 0.18, h * 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = goldColor;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.75 + Math.cos(angle) * h * 0.08, h * 0.18 + Math.sin(angle) * h * 0.08);
    ctx.lineTo(w * 0.75 + Math.cos(angle) * h * 0.12, h * 0.18 + Math.sin(angle) * h * 0.12);
    ctx.stroke();
  }

  const mountainColor = adjustTone('#2d5a3d', tone);
  ctx.fillStyle = mountainColor;
  ctx.beginPath();
  ctx.moveTo(30, h * 0.35);
  ctx.lineTo(w * 0.2, h * 0.2);
  ctx.lineTo(w * 0.35, h * 0.32);
  ctx.lineTo(w * 0.5, h * 0.18);
  ctx.lineTo(w * 0.65, h * 0.3);
  ctx.lineTo(w * 0.8, h * 0.22);
  ctx.lineTo(w - 30, h * 0.35);
  ctx.closePath();
  ctx.fill();

  const treeColor = adjustTone('#1e4620', tone);
  for (let i = 0; i < 5; i++) {
    const tx = w * (0.15 + i * 0.18);
    const ty = h * 0.55 + (i % 2) * 20;
    ctx.fillStyle = adjustTone('#4a3728', tone);
    ctx.fillRect(tx - 3, ty, 6, h * 0.12);
    ctx.fillStyle = treeColor;
    ctx.beginPath();
    ctx.moveTo(tx, ty - h * 0.06);
    ctx.lineTo(tx - w * 0.04, ty);
    ctx.lineTo(tx + w * 0.04, ty);
    ctx.closePath();
    ctx.fill();
  }

  const figureColor1 = adjustTone('#c41e3a', tone);
  const figureColor2 = adjustTone('#1e90ff', tone);

  ctx.fillStyle = figureColor1;
  ctx.beginPath();
  ctx.ellipse(w * 0.35, h * 0.68, w * 0.04, h * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = adjustTone('#f5deb3', tone);
  ctx.beginPath();
  ctx.arc(w * 0.35, h * 0.58, h * 0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = adjustTone('#2c1810', tone);
  ctx.beginPath();
  ctx.arc(w * 0.35, h * 0.57, h * 0.035, Math.PI, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = figureColor2;
  ctx.beginPath();
  ctx.ellipse(w * 0.55, h * 0.7, w * 0.035, h * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = adjustTone('#f5deb3', tone);
  ctx.beginPath();
  ctx.arc(w * 0.55, h * 0.61, h * 0.035, 0, Math.PI * 2);
  ctx.fill();

  const flowerColors = [adjustTone('#ff69b4', tone), adjustTone('#ffd700', tone), adjustTone('#ff6347', tone)];
  for (let i = 0; i < 15; i++) {
    const fx = 30 + Math.random() * (w - 60);
    const fy = h * 0.75 + Math.random() * (h * 0.18);
    ctx.fillStyle = flowerColors[i % 3];
    ctx.beginPath();
    ctx.arc(fx, fy, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = goldColor;
  ctx.font = '12px serif';
  ctx.textAlign = 'center';
  ctx.fillText('❋', w * 0.5, h - 15);
}

function drawMayaTotem(ctx: CanvasRenderingContext2D, w: number, h: number, tone: number) {
  const bg = adjustTone('#8b7355', tone);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const stoneColor = adjustTone('#6b5344', tone);
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 6; j++) {
      ctx.fillStyle = i % 2 === j % 2 ? stoneColor : bg;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(i * (w / 8), j * (h / 6), w / 8, h / 6);
    }
  }
  ctx.globalAlpha = 1;

  const totemColor = adjustTone('#4a3728', tone);
  const accentColor = adjustTone('#c41e3a', tone);
  const goldColor = adjustTone('#d4af37', tone);
  const totemX = w * 0.5;
  const totemW = w * 0.3;

  ctx.fillStyle = totemColor;
  ctx.fillRect(totemX - totemW / 2, h * 0.1, totemW, h * 0.8);

  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.moveTo(totemX - totemW / 2 - 10, h * 0.1);
  ctx.lineTo(totemX, h * 0.02);
  ctx.lineTo(totemX + totemW / 2 + 10, h * 0.1);
  ctx.closePath();
  ctx.fill();

  const eyeY = h * 0.2;
  ctx.fillStyle = goldColor;
  ctx.beginPath();
  ctx.ellipse(totemX - totemW * 0.2, eyeY, totemW * 0.12, totemW * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(totemX + totemW * 0.2, eyeY, totemW * 0.12, totemW * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = totemColor;
  ctx.beginPath();
  ctx.arc(totemX - totemW * 0.2, eyeY, totemW * 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(totemX + totemW * 0.2, eyeY, totemW * 0.05, 0, Math.PI * 2);
  ctx.fill();

  const noseY = h * 0.3;
  ctx.fillStyle = totemColor;
  ctx.beginPath();
  ctx.moveTo(totemX, noseY - 10);
  ctx.lineTo(totemX - 15, noseY + 20);
  ctx.lineTo(totemX + 15, noseY + 20);
  ctx.closePath();
  ctx.fill();

  const mouthY = h * 0.4;
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.moveTo(totemX - totemW * 0.2, mouthY);
  ctx.lineTo(totemX, mouthY + 15);
  ctx.lineTo(totemX + totemW * 0.2, mouthY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = adjustTone('#f5f5dc', tone);
  for (let i = 0; i < 4; i++) {
    const tx = totemX - totemW * 0.15 + i * totemW * 0.1;
    ctx.beginPath();
    ctx.moveTo(tx, mouthY + 2);
    ctx.lineTo(tx - 4, mouthY + 10);
    ctx.lineTo(tx + 4, mouthY + 10);
    ctx.closePath();
    ctx.fill();
  }

  const sections = [h * 0.55, h * 0.7];
  sections.forEach((y, idx) => {
    ctx.fillStyle = idx % 2 === 0 ? goldColor : accentColor;
    ctx.fillRect(totemX - totemW / 2, y, totemW, 4);
    ctx.fillStyle = totemColor;
    ctx.beginPath();
    ctx.arc(totemX, y + h * 0.05, totemW * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = goldColor;
    ctx.beginPath();
    ctx.arc(totemX, y + h * 0.05, totemW * 0.08, 0, Math.PI * 2);
    ctx.fill();
  });

  const glyphs = ['☽', '★', '◆', '▲', '●'];
  const glyphColors = [accentColor, goldColor, adjustTone('#2e8b57', tone)];
  for (let i = 0; i < 5; i++) {
    const gx = (w / 6) * (i + 1);
    const gy = h * 0.92;
    ctx.fillStyle = glyphColors[i % 3];
    ctx.font = '24px serif';
    ctx.textAlign = 'center';
    ctx.fillText(glyphs[i], gx, gy);
  }
}

function drawEgyptianMural(ctx: CanvasRenderingContext2D, w: number, h: number, tone: number) {
  const bg = adjustTone('#d4b896', tone);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const borderColor = adjustTone('#1e3a5f', tone);
  ctx.fillStyle = borderColor;
  ctx.fillRect(0, 0, w, 15);
  ctx.fillRect(0, h - 15, w, 15);
  ctx.fillRect(0, 0, 15, h);
  ctx.fillRect(w - 15, 0, 15, h);

  const goldColor = adjustTone('#d4af37', tone);
  ctx.fillStyle = goldColor;
  ctx.fillRect(15, 15, w - 30, 3);
  ctx.fillRect(15, h - 18, w - 30, 3);
  ctx.fillRect(15, 15, 3, h - 30);
  ctx.fillRect(w - 18, 15, 3, h - 30);

  const skinColor = adjustTone('#c19a6b', tone);
  const headdressColor = adjustTone('#1e90ff', tone);
  const clothColor = adjustTone('#fff8dc', tone);
  const pharaohX = w * 0.35;
  const pharaohY = h * 0.2;

  ctx.fillStyle = headdressColor;
  ctx.beginPath();
  ctx.moveTo(pharaohX - 30, pharaohY);
  ctx.lineTo(pharaohX - 40, pharaohY + 80);
  ctx.lineTo(pharaohX + 40, pharaohY + 80);
  ctx.lineTo(pharaohX + 30, pharaohY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = goldColor;
  ctx.fillRect(pharaohX - 35, pharaohY + 70, 70, 10);

  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.arc(pharaohX, pharaohY + 45, 25, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = borderColor;
  ctx.beginPath();
  ctx.ellipse(pharaohX - 8, pharaohY + 42, 6, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(pharaohX + 8, pharaohY + 42, 6, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = clothColor;
  ctx.beginPath();
  ctx.moveTo(pharaohX - 35, pharaohY + 80);
  ctx.lineTo(pharaohX - 45, h * 0.85);
  ctx.lineTo(pharaohX + 45, h * 0.85);
  ctx.lineTo(pharaohX + 35, pharaohY + 80);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = skinColor;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(pharaohX - 30, pharaohY + 90);
  ctx.lineTo(pharaohX - 55, pharaohY + 130);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(pharaohX + 30, pharaohY + 90);
  ctx.lineTo(pharaohX + 55, pharaohY + 130);
  ctx.stroke();

  const ankhColor = adjustTone('#d4af37', tone);
  ctx.fillStyle = ankhColor;
  ctx.font = '30px serif';
  ctx.textAlign = 'center';
  ctx.fillText('☥', pharaohX, pharaohY + 160);

  const hieroglyphs = ['𓂀', '𓃭', '𓆣', '𓇳', '𓊖', '𓋴'];
  ctx.fillStyle = borderColor;
  ctx.font = '18px serif';
  for (let i = 0; i < 6; i++) {
    const hx = w * 0.7 + (i % 2) * 25;
    const hy = h * 0.25 + Math.floor(i / 2) * 35;
    ctx.fillText(hieroglyphs[i], hx, hy);
  }

  const sunColor = adjustTone('#ffd700', tone);
  const sunX = w * 0.75;
  const sunY = h * 0.65;
  ctx.fillStyle = sunColor;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 28, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = sunColor;
  ctx.lineWidth = 3;
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(sunX + Math.cos(angle) * 33, sunY + Math.sin(angle) * 33);
    ctx.lineTo(sunX + Math.cos(angle) * 45, sunY + Math.sin(angle) * 45);
    ctx.stroke();
  }
}

function drawGreekVase(ctx: CanvasRenderingContext2D, w: number, h: number, tone: number) {
  const bg = adjustTone('#f5deb3', tone);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const frameColor = adjustTone('#8b4513', tone);
  ctx.strokeStyle = frameColor;
  ctx.lineWidth = 3;
  ctx.strokeRect(15, 15, w - 30, h - 30);

  const vaseColor = adjustTone('#1a1a1a', tone);
  const redFigureColor = adjustTone('#c41e3a', tone);
  const detailColor = adjustTone('#fff8dc', tone);
  const vaseX = w * 0.5;
  const vaseY = h * 0.5;
  const vaseWidth = w * 0.35;
  const vaseHeight = h * 0.7;

  ctx.fillStyle = vaseColor;
  ctx.beginPath();
  ctx.moveTo(vaseX - vaseWidth * 0.25, vaseY - vaseHeight * 0.5);
  ctx.lineTo(vaseX - vaseWidth * 0.35, vaseY - vaseHeight * 0.35);
  ctx.quadraticCurveTo(vaseX - vaseWidth * 0.5, vaseY - vaseHeight * 0.1, vaseX - vaseWidth * 0.45, vaseY + vaseHeight * 0.1);
  ctx.quadraticCurveTo(vaseX - vaseWidth * 0.4, vaseY + vaseHeight * 0.35, vaseX - vaseWidth * 0.25, vaseY + vaseHeight * 0.45);
  ctx.lineTo(vaseX + vaseWidth * 0.25, vaseY + vaseHeight * 0.45);
  ctx.quadraticCurveTo(vaseX + vaseWidth * 0.4, vaseY + vaseHeight * 0.35, vaseX + vaseWidth * 0.45, vaseY + vaseHeight * 0.1);
  ctx.quadraticCurveTo(vaseX + vaseWidth * 0.5, vaseY - vaseHeight * 0.1, vaseX + vaseWidth * 0.35, vaseY - vaseHeight * 0.35);
  ctx.lineTo(vaseX + vaseWidth * 0.25, vaseY - vaseHeight * 0.5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = detailColor;
  ctx.fillRect(vaseX - vaseWidth * 0.28, vaseY - vaseHeight * 0.5 - 5, vaseWidth * 0.56, 5);
  ctx.fillRect(vaseX - vaseWidth * 0.28, vaseY + vaseHeight * 0.45, vaseWidth * 0.56, 5);

  ctx.fillStyle = detailColor;
  for (let i = 0; i < 10; i++) {
    const px = vaseX - vaseWidth * 0.35 + i * (vaseWidth * 0.7 / 9);
    ctx.beginPath();
    ctx.moveTo(px, vaseY - vaseHeight * 0.42);
    ctx.lineTo(px - 5, vaseY - vaseHeight * 0.35);
    ctx.lineTo(px + 5, vaseY - vaseHeight * 0.35);
    ctx.closePath();
    ctx.fill();
  }

  const figY = vaseY + vaseHeight * 0.05;

  ctx.fillStyle = redFigureColor;
  ctx.beginPath();
  ctx.ellipse(vaseX - vaseWidth * 0.12, figY - 10, 10, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(vaseX - vaseWidth * 0.12, figY - 30, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = redFigureColor;
  ctx.beginPath();
  ctx.ellipse(vaseX + vaseWidth * 0.15, figY - 5, 12, 20, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(vaseX + vaseWidth * 0.15, figY - 28, 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = redFigureColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(vaseX - vaseWidth * 0.12, figY - 20);
  ctx.lineTo(vaseX + vaseWidth * 0.05, figY - 15);
  ctx.stroke();

  ctx.fillStyle = detailColor;
  ctx.beginPath();
  ctx.moveTo(vaseX + vaseWidth * 0.28, figY - 40);
  ctx.lineTo(vaseX + vaseWidth * 0.2, figY - 20);
  ctx.lineTo(vaseX + vaseWidth * 0.36, figY - 20);
  ctx.closePath();
  ctx.fill();

  const greekLetters = ['Α', 'Θ', 'Ω', 'Δ', 'Σ'];
  ctx.fillStyle = frameColor;
  ctx.font = '18px serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < 5; i++) {
    ctx.fillText(greekLetters[i], w * 0.15 + i * w * 0.175, h - 25);
  }
}

function drawIndianRockArt(ctx: CanvasRenderingContext2D, w: number, h: number, tone: number) {
  const rockColor = adjustTone('#8b7355', tone);
  ctx.fillStyle = rockColor;
  ctx.fillRect(0, 0, w, h);

  const darkerRock = adjustTone('#6b5344', tone);
  for (let i = 0; i < 50; i++) {
    ctx.fillStyle = darkerRock;
    ctx.globalAlpha = 0.3 + Math.random() * 0.3;
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = Math.random() * 20 + 5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const paintColors = [
    adjustTone('#c41e3a', tone),
    adjustTone('#fff8dc', tone),
    adjustTone('#1e90ff', tone),
    adjustTone('#32cd32', tone),
  ];

  const figures = [
    { x: 0.15, y: 0.3, type: 'human' },
    { x: 0.3, y: 0.35, type: 'human' },
    { x: 0.5, y: 0.25, type: 'animal' },
    { x: 0.7, y: 0.4, type: 'human' },
    { x: 0.85, y: 0.3, type: 'human' },
  ];

  figures.forEach((fig, idx) => {
    const fx = w * fig.x;
    const fy = h * fig.y;
    const color = paintColors[idx % paintColors.length];
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;

    if (fig.type === 'human') {
      ctx.beginPath();
      ctx.arc(fx, fy - 20, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(fx, fy - 10);
      ctx.lineTo(fx, fy + 20);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(fx - 15, fy);
      ctx.lineTo(fx + 15, fy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(fx, fy + 20);
      ctx.lineTo(fx - 12, fy + 40);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(fx, fy + 20);
      ctx.lineTo(fx + 12, fy + 40);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.ellipse(fx, fy, 25, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(fx + 20, fy - 5, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(fx - 15, fy + 10, 4, 15);
      ctx.fillRect(fx + 10, fy + 10, 4, 15);
      ctx.beginPath();
      ctx.moveTo(fx - 25, fy);
      ctx.lineTo(fx - 35, fy - 10);
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  });

  const sunColor = adjustTone('#ffd700', tone);
  ctx.fillStyle = sunColor;
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.12, 25, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = sunColor;
  ctx.lineWidth = 3;
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.5 + Math.cos(angle) * 30, h * 0.12 + Math.sin(angle) * 30);
    ctx.lineTo(w * 0.5 + Math.cos(angle) * 42, h * 0.12 + Math.sin(angle) * 42);
    ctx.stroke();
  }

  const treeColor = adjustTone('#228b22', tone);
  ctx.fillStyle = treeColor;
  ctx.beginPath();
  ctx.moveTo(w * 0.1, h * 0.65);
  ctx.lineTo(w * 0.18, h * 0.65);
  ctx.lineTo(w * 0.14, h * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(w * 0.13, h * 0.65, 3, h * 0.15);

  ctx.beginPath();
  ctx.moveTo(w * 0.88, h * 0.6);
  ctx.lineTo(w * 0.95, h * 0.6);
  ctx.lineTo(w * 0.915, h * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(w * 0.9, h * 0.6, 4, h * 0.15);

  const handColor = adjustTone('#c41e3a', tone);
  ctx.fillStyle = handColor;
  ctx.globalAlpha = 0.7;
  const handPositions = [
    { x: w * 0.25, y: h * 0.7 },
    { x: w * 0.6, y: h * 0.75 },
    { x: w * 0.8, y: h * 0.7 },
  ];
  handPositions.forEach(pos => {
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y + 8, 12, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 5; i++) {
      const angle = -Math.PI / 2 + (i - 2) * 0.35;
      ctx.beginPath();
      ctx.ellipse(pos.x + Math.cos(angle) * 10, pos.y - 8 + Math.sin(angle) * 5, 4, 8, angle, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.globalAlpha = 1;
}

function drawChineseLandscape(ctx: CanvasRenderingContext2D, w: number, h: number, tone: number) {
  const paperColor = adjustTone('#f5e6c8', tone);
  ctx.fillStyle = paperColor;
  ctx.fillRect(0, 0, w, h);

  const inkColor = adjustTone('#2c1810', tone);
  ctx.strokeStyle = inkColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, w - 40, h - 40);
  ctx.lineWidth = 1;
  ctx.strokeRect(28, 28, w - 56, h - 56);

  const lightInk = adjustTone('#6b5344', tone);
  ctx.fillStyle = lightInk;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.moveTo(40, h * 0.7);
  ctx.quadraticCurveTo(w * 0.3, h * 0.4, w * 0.45, h * 0.55);
  ctx.quadraticCurveTo(w * 0.55, h * 0.65, w * 0.6, h * 0.5);
  ctx.quadraticCurveTo(w * 0.7, h * 0.3, w - 40, h * 0.55);
  ctx.lineTo(w - 40, h * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  const midInk = adjustTone('#4a3728', tone);
  ctx.fillStyle = midInk;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.moveTo(40, h * 0.75);
  ctx.lineTo(w * 0.15, h * 0.4);
  ctx.lineTo(w * 0.25, h * 0.55);
  ctx.lineTo(w * 0.35, h * 0.35);
  ctx.lineTo(w * 0.45, h * 0.5);
  ctx.lineTo(w * 0.55, h * 0.3);
  ctx.lineTo(w * 0.7, h * 0.45);
  ctx.lineTo(w * 0.85, h * 0.25);
  ctx.lineTo(w - 40, h * 0.45);
  ctx.lineTo(w - 40, h * 0.75);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = inkColor;
  ctx.beginPath();
  ctx.moveTo(40, h - 40);
  ctx.lineTo(w * 0.1, h * 0.55);
  ctx.lineTo(w * 0.2, h * 0.65);
  ctx.lineTo(w * 0.3, h * 0.45);
  ctx.lineTo(w * 0.4, h * 0.6);
  ctx.lineTo(w * 0.5, h * 0.4);
  ctx.lineTo(w * 0.6, h * 0.55);
  ctx.lineTo(w * 0.75, h * 0.35);
  ctx.lineTo(w * 0.85, h * 0.5);
  ctx.lineTo(w - 40, h * 0.42);
  ctx.lineTo(w - 40, h - 40);
  ctx.closePath();
  ctx.fill();

  const treePositions = [
    { x: w * 0.15, y: h * 0.7, scale: 1 },
    { x: w * 0.35, y: h * 0.65, scale: 0.8 },
    { x: w * 0.65, y: h * 0.72, scale: 1.1 },
    { x: w * 0.8, y: h * 0.68, scale: 0.9 },
  ];

  treePositions.forEach(tree => {
    const tx = tree.x;
    const ty = tree.y;
    const s = tree.scale;

    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.moveTo(tx, ty + 30 * s);
    ctx.lineTo(tx, ty - 10 * s);
    ctx.stroke();

    ctx.lineWidth = 2 * s;
    for (let i = 0; i < 5; i++) {
      const branchAngle = -Math.PI / 2 + (i - 2) * 0.4;
      const bx = tx + Math.cos(branchAngle) * 15 * s;
      const by = ty - 5 * s + Math.sin(branchAngle) * 10 * s;
      ctx.beginPath();
      ctx.moveTo(tx, ty - 5 * s);
      ctx.lineTo(bx, by);
      ctx.stroke();

      ctx.fillStyle = midInk;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.ellipse(bx, by - 5 * s, 8 * s, 5 * s, branchAngle, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  });

  const sunColor = adjustTone('#c41e3a', tone);
  ctx.fillStyle = sunColor;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.arc(w * 0.75, h * 0.2, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  const sealColor = adjustTone('#c41e3a', tone);
  ctx.fillStyle = sealColor;
  ctx.fillRect(w - 55, h - 55, 30, 30);
  ctx.fillStyle = paperColor;
  ctx.font = 'bold 12px serif';
  ctx.textAlign = 'center';
  ctx.fillText('墨', w - 40, h - 35);

  ctx.fillStyle = inkColor;
  ctx.font = '16px serif';
  ctx.textAlign = 'left';
  ctx.fillText('山', 45, 55);
  ctx.fillText('水', 45, 75);
  ctx.fillText('情', 45, 95);
}

function drawByzantineMosaic(ctx: CanvasRenderingContext2D, w: number, h: number, tone: number) {
  const goldBg = adjustTone('#d4af37', tone);
  ctx.fillStyle = goldBg;
  ctx.fillRect(0, 0, w, h);

  const tileColors = [
    adjustTone('#d4af37', tone),
    adjustTone('#c19a6b', tone),
    adjustTone('#8b4513', tone),
    adjustTone('#b8860b', tone),
  ];
  const tileSize = 8;
  for (let x = 0; x < w; x += tileSize) {
    for (let y = 0; y < h; y += tileSize) {
      const colorIdx = Math.floor(Math.random() * tileColors.length);
      ctx.fillStyle = tileColors[colorIdx];
      ctx.globalAlpha = 0.7 + Math.random() * 0.3;
      ctx.fillRect(x, y, tileSize - 1, tileSize - 1);
    }
  }
  ctx.globalAlpha = 1;

  const frameColor = adjustTone('#8b0000', tone);
  ctx.fillStyle = frameColor;
  ctx.fillRect(10, 10, w - 20, 8);
  ctx.fillRect(10, h - 18, w - 20, 8);
  ctx.fillRect(10, 10, 8, h - 20);
  ctx.fillRect(w - 18, 10, 8, h - 20);

  const centerX = w * 0.5;
  const centerY = h * 0.45;

  const haloColor = adjustTone('#ffd700', tone);
  const haloGrad = ctx.createRadialGradient(centerX, centerY - 20, 10, centerX, centerY - 20, 50);
  haloGrad.addColorStop(0, haloColor);
  haloGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(centerX, centerY - 20, 50, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = haloColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(centerX, centerY - 20, 40, 0, Math.PI * 2);
  ctx.stroke();

  const robeColor = adjustTone('#4169e1', tone);
  ctx.fillStyle = robeColor;
  ctx.beginPath();
  ctx.moveTo(centerX - 50, centerY + 20);
  ctx.lineTo(centerX - 60, h * 0.85);
  ctx.lineTo(centerX + 60, h * 0.85);
  ctx.lineTo(centerX + 50, centerY + 20);
  ctx.closePath();
  ctx.fill();

  const goldTrim = adjustTone('#ffd700', tone);
  ctx.strokeStyle = goldTrim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX - 45, centerY + 20);
  ctx.lineTo(centerX - 52, h * 0.83);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(centerX + 45, centerY + 20);
  ctx.lineTo(centerX + 52, h * 0.83);
  ctx.stroke();
  ctx.fillStyle = goldTrim;
  ctx.fillRect(centerX - 55, h * 0.75, 110, 4);

  const skinColor = adjustTone('#f5deb3', tone);
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.arc(centerX, centerY - 15, 25, 0, Math.PI * 2);
  ctx.fill();

  const hairColor = adjustTone('#8b4513', tone);
  ctx.fillStyle = hairColor;
  ctx.beginPath();
  ctx.arc(centerX, centerY - 20, 22, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(centerX - 20, centerY - 38, 40, 8);

  ctx.fillStyle = adjustTone('#2c1810', tone);
  ctx.beginPath();
  ctx.arc(centerX - 8, centerY - 18, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(centerX + 8, centerY - 18, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = adjustTone('#8b4513', tone);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(centerX, centerY - 8, 8, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();

  const crossColor = adjustTone('#ffd700', tone);
  ctx.fillStyle = crossColor;
  const crossX = centerX;
  const crossY = centerY + 50;
  ctx.fillRect(crossX - 4, crossY - 15, 8, 30);
  ctx.fillRect(crossX - 12, crossY - 8, 24, 8);

  const iconColors = [
    adjustTone('#ff6347', tone),
    adjustTone('#32cd32', tone),
    adjustTone('#4169e1', tone),
  ];
  const iconPositions = [
    { x: w * 0.2, y: h * 0.25 },
    { x: w * 0.8, y: h * 0.25 },
    { x: w * 0.2, y: h * 0.7 },
    { x: w * 0.8, y: h * 0.7 },
  ];
  iconPositions.forEach((pos, i) => {
    ctx.fillStyle = iconColors[i % iconColors.length];
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = goldTrim;
    ctx.font = '14px serif';
    ctx.textAlign = 'center';
    ctx.fillText('✦', pos.x, pos.y + 5);
  });

  ctx.fillStyle = goldTrim;
  ctx.font = '12px serif';
  ctx.textAlign = 'center';
  ctx.fillText('☧ ΙΣ ΧΣ ☧', centerX, h - 30);
}

function drawAztecMural(ctx: CanvasRenderingContext2D, w: number, h: number, tone: number) {
  const bgColor = adjustTone('#8b4513', tone);
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, w, h);

  const stoneTex = adjustTone('#6b3a0f', tone);
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 8; j++) {
      ctx.fillStyle = (i + j) % 2 === 0 ? stoneTex : bgColor;
      ctx.globalAlpha = 0.2;
      ctx.fillRect(i * (w / 10), j * (h / 8), w / 10, h / 8);
    }
  }
  ctx.globalAlpha = 1;

  const centerX = w * 0.5;
  const centerY = h * 0.5;
  const diskRadius = Math.min(w, h) * 0.35;

  const diskColor = adjustTone('#2c1810', tone);
  ctx.fillStyle = diskColor;
  ctx.beginPath();
  ctx.arc(centerX, centerY, diskRadius, 0, Math.PI * 2);
  ctx.fill();

  const ringColor = adjustTone('#d4af37', tone);
  ctx.strokeStyle = ringColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(centerX, centerY, diskRadius - 5, 0, Math.PI * 2);
  ctx.stroke();

  const innerRingColor = adjustTone('#c41e3a', tone);
  ctx.strokeStyle = innerRingColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(centerX, centerY, diskRadius * 0.7, 0, Math.PI * 2);
  ctx.stroke();

  const glyphCount = 20;
  for (let i = 0; i < glyphCount; i++) {
    const angle = (i / glyphCount) * Math.PI * 2 - Math.PI / 2;
    const r = diskRadius - 15;
    const gx = centerX + Math.cos(angle) * r;
    const gy = centerY + Math.sin(angle) * r;
    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillStyle = i % 2 === 0 ? ringColor : innerRingColor;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(-6, 5);
    ctx.lineTo(6, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  const faceColor = adjustTone('#d4af37', tone);
  ctx.fillStyle = faceColor;
  ctx.beginPath();
  ctx.arc(centerX, centerY, diskRadius * 0.4, 0, Math.PI * 2);
  ctx.fill();

  const eyeColor = adjustTone('#2c1810', tone);
  ctx.fillStyle = eyeColor;
  ctx.beginPath();
  ctx.ellipse(centerX - diskRadius * 0.15, centerY - diskRadius * 0.08, diskRadius * 0.08, diskRadius * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(centerX + diskRadius * 0.15, centerY - diskRadius * 0.08, diskRadius * 0.08, diskRadius * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = adjustTone('#fff', tone);
  ctx.beginPath();
  ctx.arc(centerX - diskRadius * 0.15, centerY - diskRadius * 0.08, diskRadius * 0.03, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(centerX + diskRadius * 0.15, centerY - diskRadius * 0.08, diskRadius * 0.03, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = eyeColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX - diskRadius * 0.25, centerY - diskRadius * 0.15);
  ctx.lineTo(centerX - diskRadius * 0.08, centerY - diskRadius * 0.12);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(centerX + diskRadius * 0.25, centerY - diskRadius * 0.15);
  ctx.lineTo(centerX + diskRadius * 0.08, centerY - diskRadius * 0.12);
  ctx.stroke();

  ctx.fillStyle = eyeColor;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(centerX - 8, centerY + 15);
  ctx.lineTo(centerX + 8, centerY + 15);
  ctx.closePath();
  ctx.fill();

  const mouthColor = adjustTone('#c41e3a', tone);
  ctx.fillStyle = mouthColor;
  ctx.beginPath();
  ctx.moveTo(centerX - diskRadius * 0.2, centerY + diskRadius * 0.18);
  ctx.lineTo(centerX, centerY + diskRadius * 0.3);
  ctx.lineTo(centerX + diskRadius * 0.2, centerY + diskRadius * 0.18);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = adjustTone('#fff8dc', tone);
  for (let i = 0; i < 4; i++) {
    const tx = centerX - diskRadius * 0.12 + i * diskRadius * 0.08;
    ctx.beginPath();
    ctx.moveTo(tx, centerY + diskRadius * 0.2);
    ctx.lineTo(tx - 4, centerY + diskRadius * 0.26);
    ctx.lineTo(tx + 4, centerY + diskRadius * 0.26);
    ctx.closePath();
    ctx.fill();
  }

  const sideColors = [adjustTone('#c41e3a', tone), adjustTone('#1e90ff', tone), adjustTone('#32cd32', tone)];
  const symbols = ['☀', '☾', '★', '◈'];
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const sx = centerX + Math.cos(angle) * diskRadius * 1.3;
    const sy = centerY + Math.sin(angle) * diskRadius * 1.3;
    ctx.fillStyle = sideColors[i % 3];
    ctx.beginPath();
    ctx.arc(sx, sy, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = adjustTone('#fff', tone);
    ctx.font = '16px serif';
    ctx.textAlign = 'center';
    ctx.fillText(symbols[i], sx, sy + 5);
  }

  ctx.fillStyle = ringColor;
  ctx.font = 'bold 14px serif';
  ctx.textAlign = 'center';
  ctx.fillText('TLALOC', centerX, h - 25);
}

function drawUkiyoE(ctx: CanvasRenderingContext2D, w: number, h: number, tone: number) {
  const skyColor = adjustTone('#87ceeb', tone);
  ctx.fillStyle = skyColor;
  ctx.fillRect(0, 0, w, h * 0.6);

  const sunColor = adjustTone('#ff6347', tone);
  ctx.fillStyle = sunColor;
  ctx.beginPath();
  ctx.arc(w * 0.7, h * 0.25, 35, 0, Math.PI * 2);
  ctx.fill();

  const cloudColor = adjustTone('#f5f5f5', tone);
  ctx.fillStyle = cloudColor;
  const cloudY = h * 0.35;
  for (let i = 0; i < 3; i++) {
    const cx = w * (0.15 + i * 0.3);
    ctx.beginPath();
    ctx.arc(cx, cloudY, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx - 15, cloudY + 5, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 15, cloudY + 5, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  const mountainColor = adjustTone('#2c5f8a', tone);
  ctx.fillStyle = mountainColor;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.55);
  ctx.lineTo(w * 0.2, h * 0.45);
  ctx.lineTo(w * 0.35, h * 0.52);
  ctx.lineTo(w * 0.5, h * 0.3);
  ctx.lineTo(w * 0.65, h * 0.48);
  ctx.lineTo(w * 0.8, h * 0.38);
  ctx.lineTo(w, h * 0.45);
  ctx.lineTo(w, h * 0.6);
  ctx.lineTo(0, h * 0.6);
  ctx.closePath();
  ctx.fill();

  const snowColor = adjustTone('#ffffff', tone);
  ctx.fillStyle = snowColor;
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h * 0.3);
  ctx.lineTo(w * 0.45, h * 0.38);
  ctx.lineTo(w * 0.55, h * 0.38);
  ctx.closePath();
  ctx.fill();

  const waterColor = adjustTone('#4a90b8', tone);
  ctx.fillStyle = waterColor;
  ctx.fillRect(0, h * 0.6, w, h * 0.4);

  const waveColor = adjustTone('#ffffff', tone);
  ctx.strokeStyle = waveColor;
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const wy = h * 0.65 + i * 25;
    for (let j = 0; j < 8; j++) {
      const wx = w * 0.05 + j * w * 0.12 + (i % 2) * 30;
      ctx.beginPath();
      ctx.arc(wx, wy, 12, Math.PI, 0);
      ctx.stroke();
    }
  }

  const boatColor = adjustTone('#8b4513', tone);
  ctx.fillStyle = boatColor;
  ctx.beginPath();
  ctx.moveTo(w * 0.2, h * 0.68);
  ctx.lineTo(w * 0.35, h * 0.68);
  ctx.lineTo(w * 0.32, h * 0.73);
  ctx.lineTo(w * 0.23, h * 0.73);
  ctx.closePath();
  ctx.fill();

  const sailColor = adjustTone('#f5f5f5', tone);
  ctx.fillStyle = sailColor;
  ctx.beginPath();
  ctx.moveTo(w * 0.275, h * 0.68);
  ctx.lineTo(w * 0.275, h * 0.55);
  ctx.lineTo(w * 0.35, h * 0.68);
  ctx.closePath();
  ctx.fill();

  const figureColor = adjustTone('#2c1810', tone);
  ctx.fillStyle = figureColor;
  ctx.beginPath();
  ctx.arc(w * 0.26, h * 0.65, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(w * 0.255, h * 0.66, 3, 10);

  const frameColor = adjustTone('#2c1810', tone);
  ctx.strokeStyle = frameColor;
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, w - 6, h - 6);
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, w - 20, h - 20);
}

function drawAfricanTribal(ctx: CanvasRenderingContext2D, w: number, h: number, tone: number) {
  const bgColor = adjustTone('#d2691e', tone);
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, w, h);

  const patternColor = adjustTone('#8b4513', tone);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 === 0 ? patternColor : bgColor;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(0, i * (h / 6), w, h / 6);
  }
  ctx.globalAlpha = 1;

  const centerX = w * 0.5;
  const centerY = h * 0.5;

  const maskColor = adjustTone('#f5deb3', tone);
  ctx.fillStyle = maskColor;

  ctx.beginPath();
  ctx.ellipse(centerX, centerY, w * 0.18, h * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  const stripeColor = adjustTone('#c41e3a', tone);
  ctx.fillStyle = stripeColor;
  ctx.fillRect(centerX - w * 0.18, centerY - h * 0.05, w * 0.36, 8);
  ctx.fillRect(centerX - w * 0.18, centerY + h * 0.08, w * 0.36, 6);

  const eyeColor = adjustTone('#2c1810', tone);
  ctx.fillStyle = eyeColor;
  ctx.beginPath();
  ctx.ellipse(centerX - w * 0.07, centerY - h * 0.1, w * 0.04, h * 0.03, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(centerX + w * 0.07, centerY - h * 0.1, w * 0.04, h * 0.03, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = adjustTone('#fff', tone);
  ctx.beginPath();
  ctx.arc(centerX - w * 0.07, centerY - h * 0.1, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(centerX + w * 0.07, centerY - h * 0.1, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = eyeColor;
  ctx.beginPath();
  ctx.arc(centerX - w * 0.07, centerY - h * 0.1, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(centerX + w * 0.07, centerY - h * 0.1, 2, 0, Math.PI * 2);
  ctx.fill();

  const noseColor = adjustTone('#d2691e', tone);
  ctx.fillStyle = noseColor;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - h * 0.02);
  ctx.lineTo(centerX - 8, centerY + h * 0.06);
  ctx.lineTo(centerX + 8, centerY + h * 0.06);
  ctx.closePath();
  ctx.fill();

  const mouthColor = adjustTone('#c41e3a', tone);
  ctx.fillStyle = mouthColor;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY + h * 0.16, w * 0.05, h * 0.025, 0, 0, Math.PI * 2);
  ctx.fill();

  const scarColor = adjustTone('#8b4513', tone);
  ctx.strokeStyle = scarColor;
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(centerX - w * 0.14 - i * 5, centerY - h * 0.05 + i * 8);
    ctx.lineTo(centerX - w * 0.1 - i * 5, centerY + h * 0.02 + i * 8);
    ctx.stroke();
  }

  const headdressColor = adjustTone('#228b22', tone);
  ctx.fillStyle = headdressColor;
  for (let i = 0; i < 11; i++) {
    const angle = -Math.PI / 2 + (i - 5) * 0.2;
    const fx = centerX + Math.cos(angle) * w * 0.15;
    const fy = centerY - h * 0.25 + Math.sin(angle) * h * 0.05;
    ctx.beginPath();
    ctx.ellipse(fx, fy - 15, 6, 20, angle, 0, Math.PI * 2);
    ctx.fill();
  }

  const beadColor = adjustTone('#ffd700', tone);
  ctx.fillStyle = beadColor;
  for (let i = 0; i < 7; i++) {
    const bx = centerX - w * 0.12 + i * w * 0.04;
    ctx.beginPath();
    ctx.arc(bx, centerY - h * 0.24, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  const sidePatterns = [
    { x: w * 0.1, y: h * 0.2 },
    { x: w * 0.9, y: h * 0.2 },
    { x: w * 0.1, y: h * 0.8 },
    { x: w * 0.9, y: h * 0.8 },
  ];
  const patternColors = [
    adjustTone('#c41e3a', tone),
    adjustTone('#ffd700', tone),
    adjustTone('#228b22', tone),
    adjustTone('#4169e1', tone),
  ];
  sidePatterns.forEach((pos, idx) => {
    ctx.fillStyle = patternColors[idx % 4];
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 15, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = patternColors[(idx + 1) % 4];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
    ctx.stroke();
  });

  const dotColor = adjustTone('#2c1810', tone);
  ctx.fillStyle = dotColor;
  for (let i = 0; i < 20; i++) {
    const dx = Math.random() * w;
    const dy = Math.random() * h;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(dx, dy, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawNorseViking(ctx: CanvasRenderingContext2D, w: number, h: number, tone: number) {
  const bgColor = adjustTone('#4a5568', tone);
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, w, h);

  const woodColor = adjustTone('#8b4513', tone);
  ctx.strokeStyle = woodColor;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 12; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * (h / 12) + Math.random() * 5);
    ctx.bezierCurveTo(w * 0.3, i * (h / 12) + Math.random() * 10, w * 0.7, i * (h / 12) + Math.random() * 8, w, i * (h / 12) + Math.random() * 5);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const centerX = w * 0.5;
  const centerY = h * 0.5;

  const knotColor = adjustTone('#d4af37', tone);
  ctx.strokeStyle = knotColor;
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.arc(centerX, centerY, h * 0.35, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY, h * 0.32, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const r1 = h * 0.28;
    const r2 = h * 0.2;

    const x1 = centerX + Math.cos(angle) * r1;
    const y1 = centerY + Math.sin(angle) * r1;
    const x2 = centerX + Math.cos(angle + Math.PI / 8) * r2;
    const y2 = centerY + Math.sin(angle + Math.PI / 8) * r2;
    const x3 = centerX + Math.cos(angle + Math.PI / 4) * r1;
    const y3 = centerY + Math.sin(angle + Math.PI / 4) * r1;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(x2, y2, x3, y3);
    ctx.stroke();
  }

  const runeColor = adjustTone('#ff6347', tone);
  ctx.fillStyle = runeColor;
  ctx.font = 'bold 24px serif';
  ctx.textAlign = 'center';

  const runes = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ'];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const rx = centerX + Math.cos(angle) * h * 0.25;
    const ry = centerY + Math.sin(angle) * h * 0.25;
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillText(runes[i], 0, 8);
    ctx.restore();
  }

  const centerColor = adjustTone('#d4af37', tone);
  ctx.fillStyle = centerColor;

  ctx.beginPath();
  ctx.moveTo(centerX, centerY - h * 0.12);
  ctx.lineTo(centerX - w * 0.08, centerY);
  ctx.lineTo(centerX - w * 0.05, centerY);
  ctx.lineTo(centerX - w * 0.05, centerY + h * 0.12);
  ctx.lineTo(centerX + w * 0.05, centerY + h * 0.12);
  ctx.lineTo(centerX + w * 0.05, centerY);
  ctx.lineTo(centerX + w * 0.08, centerY);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(centerX - w * 0.1, centerY - h * 0.02);
  ctx.lineTo(centerX + w * 0.1, centerY - h * 0.02);
  ctx.lineTo(centerX + w * 0.1, centerY + h * 0.02);
  ctx.lineTo(centerX - w * 0.1, centerY + h * 0.02);
  ctx.closePath();
  ctx.fill();

  const ravenColor = adjustTone('#2c1810', tone);
  ctx.fillStyle = ravenColor;

  const drawRaven = (x: number, y: number, scale: number) => {
    ctx.beginPath();
    ctx.ellipse(x, y, 12 * scale, 8 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 8 * scale, y - 3 * scale, 6 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = adjustTone('#ffd700', tone);
    ctx.beginPath();
    ctx.moveTo(x + 14 * scale, y - 2 * scale);
    ctx.lineTo(x + 18 * scale, y);
    ctx.lineTo(x + 14 * scale, y + 2 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = ravenColor;
    ctx.beginPath();
    ctx.moveTo(x - 5 * scale, y - 3 * scale);
    ctx.lineTo(x - 18 * scale, y - 10 * scale);
    ctx.lineTo(x - 8 * scale, y + 2 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 3 * scale, y + 5 * scale);
    ctx.lineTo(x + 8 * scale, y + 15 * scale);
    ctx.lineTo(x - 2 * scale, y + 8 * scale);
    ctx.closePath();
    ctx.fill();
  };

  drawRaven(w * 0.15, h * 0.15, 1);
  drawRaven(w * 0.85, h * 0.18, 0.8);

  const dragonHeadColor = adjustTone('#8b0000', tone);
  ctx.fillStyle = dragonHeadColor;
  ctx.beginPath();
  ctx.moveTo(w * 0.08, h * 0.7);
  ctx.lineTo(w * 0.15, h * 0.65);
  ctx.lineTo(w * 0.18, h * 0.72);
  ctx.lineTo(w * 0.12, h * 0.78);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = adjustTone('#ffd700', tone);
  ctx.beginPath();
  ctx.arc(w * 0.12, h * 0.7, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = dragonHeadColor;
  ctx.beginPath();
  ctx.moveTo(w * 0.92, h * 0.72);
  ctx.lineTo(w * 0.85, h * 0.68);
  ctx.lineTo(w * 0.82, h * 0.75);
  ctx.lineTo(w * 0.88, h * 0.8);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = adjustTone('#ffd700', tone);
  ctx.beginPath();
  ctx.arc(w * 0.88, h * 0.72, 3, 0, Math.PI * 2);
  ctx.fill();

  const shipColor = adjustTone('#8b4513', tone);
  ctx.fillStyle = shipColor;
  ctx.beginPath();
  ctx.moveTo(w * 0.1, h * 0.75);
  ctx.quadraticCurveTo(w * 0.5, h * 0.9, w * 0.9, h * 0.75);
  ctx.lineTo(w * 0.85, h * 0.78);
  ctx.quadraticCurveTo(w * 0.5, h * 0.92, w * 0.15, h * 0.78);
  ctx.closePath();
  ctx.fill();

  const shieldColors = [
    adjustTone('#c41e3a', tone),
    adjustTone('#4169e1', tone),
    adjustTone('#ffd700', tone),
    adjustTone('#228b22', tone),
  ];
  for (let i = 0; i < 6; i++) {
    const sx = w * 0.25 + i * w * 0.1;
    const sy = h * 0.74;
    ctx.fillStyle = shieldColors[i % 4];
    ctx.beginPath();
    ctx.arc(sx, sy, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = adjustTone('#2c1810', tone);
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

export const murals: MuralData[] = [
  {
    id: 'dunhuang',
    name: '敦煌飞天',
    nameEn: 'Dunhuang Apsaras',
    era: '唐代 · 公元7世纪',
    eraEn: 'Tang Dynasty · 7th Century',
    description: '敦煌莫高窟中的飞天壁画，展现了佛教艺术中翩然起舞的天人形象，彩带飘逸，落花纷飞。',
    descriptionEn: 'Flying apsaras from the Mogao Caves, depicting celestial dancers with flowing ribbons and falling blossoms in Buddhist art.',
    draw: drawDunhuangApsaras,
  },
  {
    id: 'persian',
    name: '波斯细密画',
    nameEn: 'Persian Miniature',
    era: '萨法维王朝 · 公元16世纪',
    eraEn: 'Safavid Dynasty · 16th Century',
    description: '波斯细密画以精致的笔触和丰富的色彩著称，描绘宫廷宴乐、山水园林与诗意场景。',
    descriptionEn: 'Persian miniatures are renowned for delicate brushwork and rich colors, depicting court life, landscapes, and poetic scenes.',
    draw: drawPersianMiniature,
  },
  {
    id: 'maya',
    name: '玛雅图腾柱',
    nameEn: 'Maya Totem',
    era: '古典期 · 公元5-9世纪',
    eraEn: 'Classic Period · 5th-9th Century',
    description: '玛雅图腾石柱雕刻着神祇面孔与象形文字，记录着历法、祭祀与王室历史。',
    descriptionEn: 'Maya stelae carved with deity faces and hieroglyphs, recording calendars, rituals, and royal history.',
    draw: drawMayaTotem,
  },
  {
    id: 'egyptian',
    name: '埃及壁画',
    nameEn: 'Egyptian Mural',
    era: '新王国时期 · 公元前13世纪',
    eraEn: 'New Kingdom · 13th Century BCE',
    description: '古埃及墓室壁画描绘法老与神祇，采用正面律构图，色彩历经千年依然鲜明。',
    descriptionEn: 'Ancient Egyptian tomb murals depicting pharaohs and deities with frontal composition, colors remaining vivid after millennia.',
    draw: drawEgyptianMural,
  },
  {
    id: 'greek',
    name: '希腊瓶画',
    nameEn: 'Greek Vase Painting',
    era: '古风时期 · 公元前6世纪',
    eraEn: 'Archaic Period · 6th Century BCE',
    description: '古希腊黑绘陶瓶上描绘着神话故事与日常生活，线条流畅优雅，叙事性极强。',
    descriptionEn: 'Ancient Greek black-figure pottery depicting myths and daily life with graceful lines and strong narrative quality.',
    draw: drawGreekVase,
  },
  {
    id: 'indian',
    name: '印度岩画',
    nameEn: 'Indian Rock Art',
    era: '史前时期 · 公元前3000年',
    eraEn: 'Prehistoric · 3000 BCE',
    description: '比姆贝特卡岩画群记录了史前人类的狩猎、舞蹈与祭祀场景，是人类最早的艺术遗迹之一。',
    descriptionEn: 'Bhimbetka rock shelters recording prehistoric hunting, dancing, and ritual scenes — among humanity\'s earliest artistic remains.',
    draw: drawIndianRockArt,
  },
  {
    id: 'chinese',
    name: '中国山水',
    nameEn: 'Chinese Landscape',
    era: '宋代 · 公元11世纪',
    eraEn: 'Song Dynasty · 11th Century',
    description: '水墨山水以墨色浓淡表现远近层次，追求"天人合一"的意境与气韵生动。',
    descriptionEn: 'Ink wash landscapes using ink tones to convey depth, pursuing the harmony of nature and humanity with vibrant energy.',
    draw: drawChineseLandscape,
  },
  {
    id: 'byzantine',
    name: '拜占庭马赛克',
    nameEn: 'Byzantine Mosaic',
    era: '查士丁尼时代 · 公元6世纪',
    eraEn: 'Justinian Era · 6th Century',
    description: '拜占庭马赛克以金色玻璃小块拼嵌而成，圣像头顶光环，散发着神圣而永恒的光辉。',
    descriptionEn: 'Byzantine mosaics crafted from golden glass tesserae, with haloed saints radiating sacred and eternal light.',
    draw: drawByzantineMosaic,
  },
  {
    id: 'aztec',
    name: '阿兹特克太阳石',
    nameEn: 'Aztec Sun Stone',
    era: '后古典期 · 公元15世纪',
    eraEn: 'Postclassic Period · 15th Century',
    description: '阿兹特克太阳石雕刻着五重太阳纪元与日月神祇，是中美洲宇宙观的集中体现。',
    descriptionEn: 'The Aztec Sun Stone carved with five sun eras and celestial deities, embodying Mesoamerican cosmology.',
    draw: drawAztecMural,
  },
  {
    id: 'ukiyoe',
    name: '浮世绘',
    nameEn: 'Ukiyo-e',
    era: '江户时代 · 公元19世纪',
    eraEn: 'Edo Period · 19th Century',
    description: '日本浮世绘以木刻版画表现歌舞伎、武士与风景，葛饰北斋的神奈川冲浪里闻名于世。',
    descriptionEn: 'Japanese woodblock prints depicting kabuki actors, samurai, and landscapes — Hokusai\'s Great Wave is world-famous.',
    draw: drawUkiyoE,
  },
  {
    id: 'african',
    name: '非洲部落面具',
    nameEn: 'African Tribal',
    era: '约鲁巴文明 · 公元12世纪',
    eraEn: 'Yoruba Civilization · 12th Century',
    description: '西非部落面具色彩鲜艳，纹样繁复，在祭祀与成年仪式中扮演着沟通神灵的角色。',
    descriptionEn: 'West African tribal masks with vivid colors and intricate patterns, mediating between humans and spirits in rituals.',
    draw: drawAfricanTribal,
  },
  {
    id: 'norse',
    name: '北欧维京符文',
    nameEn: 'Norse Viking',
    era: '维京时代 · 公元9世纪',
    eraEn: 'Viking Age · 9th Century',
    description: '北欧维京符文石雕刻着古老的卢恩文字与凯尔特结，记录着航海英雄的传说与誓言。',
    descriptionEn: 'Norse runestones carved with ancient runes and Celtic knots, recording tales of Viking heroes and their oaths.',
    draw: drawNorseViking,
  },
];
