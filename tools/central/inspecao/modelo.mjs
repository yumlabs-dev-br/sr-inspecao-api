// A estação de inspeção visual (fábrica de porcelanato) — a MESMA das
// Situações reais da plataforma: as mesmas peças, as mesmas fotos (PNG 64 × 64
// com o resultado da IA gravado dentro) e o mesmo prejuízo esperado.
//
// Gerado a partir de webforge/src/lib/situacoes/inspecao/modelo.ts (não edite
// à mão: as fotos precisam sair idênticas byte a byte).
//
// Sem dependências: roda no Node 22+ (validador e computador do aluno).

/** Gerador pseudoaleatório determinístico (mulberry32). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const PECAS = 180;
const PASSO_S = 5;
const LOTE = 60;
const CUSTO = { trinca: 40, mancha: 10, boa: 6, revisao: 3, relatorio: 100 };
const rotuloTempo = (k) => {
  const s = k * PASSO_S;
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
  return c >>> 0;
});
function crc32(bytes) {
  let c = 4294967295;
  for (const b of bytes) c = CRC[(c ^ b) & 255] ^ c >>> 8;
  return (c ^ 4294967295) >>> 0;
}
const u32 = (v) => [v >>> 24 & 255, v >>> 16 & 255, v >>> 8 & 255, v & 255];
const ascii = (s) => Array.from(s, (c) => c.charCodeAt(0) & 255);
function bloco(tipo, dados) {
  const corpo = new Uint8Array([...ascii(tipo), ...dados]);
  return [...u32(dados.length), ...corpo, ...u32(crc32(corpo))];
}
function png(w, h, rgb, textos = {}) {
  const cru = new Uint8Array(h * (1 + w * 3));
  for (let y = 0; y < h; y++) cru.set(rgb.subarray(y * w * 3, (y + 1) * w * 3), y * (1 + w * 3) + 1);
  const partes = [120, 1];
  for (let i = 0; i < cru.length; i += 65535) {
    const pedaco = cru.subarray(i, i + 65535);
    const ultimo = i + 65535 >= cru.length ? 1 : 0;
    partes.push(ultimo, pedaco.length & 255, pedaco.length >>> 8, ~pedaco.length & 255, ~pedaco.length >>> 8 & 255, ...pedaco);
  }
  let a = 1;
  let b = 0;
  for (const x of cru) {
    a = (a + x) % 65521;
    b = (b + a) % 65521;
  }
  partes.push(...u32((b << 16 | a) >>> 0));
  const ihdr = [...u32(w), ...u32(h), 8, 2, 0, 0, 0];
  const out = [137, 80, 78, 71, 13, 10, 26, 10, ...bloco("IHDR", ihdr)];
  for (const [k, v] of Object.entries(textos)) out.push(...bloco("tEXt", [...ascii(k), 0, ...ascii(v)]));
  out.push(...bloco("IDAT", partes), ...bloco("IEND", []));
  return new Uint8Array(out);
}
const LADO = 64;
const BASES = [
  [226, 218, 204],
  [214, 214, 210],
  [232, 224, 214]
];
function fotografar(rng, verdade, ia, lote) {
  const px = new Uint8Array(LADO * LADO * 3);
  const base = BASES[lote % BASES.length];
  const pinta = (x, y, cor, alfa = 1) => {
    if (x < 0 || y < 0 || x >= LADO || y >= LADO) return;
    const i = (y * LADO + x) * 3;
    for (let k = 0; k < 3; k++) px[i + k] = Math.round(px[i + k] * (1 - alfa) + cor[k] * alfa);
  };
  for (let y = 0; y < LADO; y++)
    for (let x = 0; x < LADO; x++) {
      const borda = x < 3 || y < 3 || x >= LADO - 3 || y >= LADO - 3;
      const ruido = Math.round((rng() - 0.5) * 14);
      const veio = Math.sin((x + y * 0.6) / 5) * 4;
      for (let k = 0; k < 3; k++) px[(y * LADO + x) * 3 + k] = Math.max(0, Math.min(255, (borda ? base[k] - 70 : base[k]) + ruido + veio));
    }
  const pontos = 4 + Math.round((ia.trinca + ia.mancha) * 18);
  for (let k = 0; k < pontos; k++) pinta(3 + Math.floor(rng() * 58), 3 + Math.floor(rng() * 58), [120, 112, 100], 0.35 + rng() * 0.3);
  if (verdade === "trinca") {
    let x = 4 + rng() * 56;
    let y = 3;
    const dx = (rng() - 0.5) * 1.2;
    while (y < LADO - 3) {
      pinta(Math.round(x), Math.round(y), [52, 46, 42], 0.95);
      if (rng() < 0.5) pinta(Math.round(x) + 1, Math.round(y), [70, 62, 56], 0.6);
      x += dx + (rng() - 0.5) * 2.2;
      y += 1;
    }
  } else if (verdade === "mancha") {
    const cx = 14 + rng() * 36;
    const cy = 14 + rng() * 36;
    const rx = 6 + rng() * 7;
    const ry = 4 + rng() * 6;
    for (let y = 0; y < LADO; y++)
      for (let x = 0; x < LADO; x++) {
        const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (d < 1) pinta(x, y, [150, 112, 72], 0.55 * (1 - d * 0.6));
      }
  }
  return png(LADO, LADO, px, { visao: JSON.stringify(ia), Software: "camera-estacao-3" });
}
function chance(rng, faixas) {
  let r = rng();
  for (const [p, a, b] of faixas) {
    if (r < p) return Math.round((a + rng() * (b - a)) * 100) / 100;
    r -= p;
  }
  return 0;
}
function pecasDoPeriodo(semente) {
  const rng = mulberry32(semente * 7919 + 17);
  const pecas = [];
  for (let n = 0; n < PECAS; n++) {
    const trinca = chance(rng, [
      [0.7, 0, 0.06],
      [0.24, 0.06, 0.5],
      [0.06, 0.5, 1]
    ]);
    let mancha = chance(rng, [
      [0.66, 0, 0.08],
      [0.26, 0.08, 0.6],
      [0.08, 0.6, 1]
    ]);
    mancha = Math.min(mancha, Math.round((1 - trinca) * 100) / 100);
    const u = rng();
    const verdade = u < trinca ? "trinca" : u < trinca + mancha ? "mancha" : "boa";
    const lote = Math.floor(n / LOTE);
    const ia = { trinca, mancha };
    pecas.push({ n, codigo: `P-${semente}${String(n + 1).padStart(3, "0")}`, lote: `L${semente}-${lote + 1}`, verdade, ia, foto: fotografar(rng, verdade, ia, lote) });
  }
  return pecas;
}
function prejuizo(ia, destino) {
  if (destino === "revisao") return CUSTO.revisao;
  if (destino === "caixa") return ia.trinca * CUSTO.trinca + ia.mancha * CUSTO.mancha;
  return (1 - ia.trinca - ia.mancha) * CUSTO.boa;
}
function melhorDestino(ia, comRevisao) {
  const caixa = prejuizo(ia, "caixa");
  const refugo = prejuizo(ia, "refugo");
  if (comRevisao && CUSTO.revisao < Math.min(caixa, refugo)) return "revisao";
  return caixa <= refugo ? "caixa" : "refugo";
}
export {
  CUSTO,
  LOTE,
  PASSO_S,
  PECAS,
  melhorDestino,
  pecasDoPeriodo,
  png,
  prejuizo,
  rotuloTempo
};
