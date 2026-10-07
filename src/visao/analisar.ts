import type { Ia } from "../domain/foto.ts";

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const texto = (b: Uint8Array, ini: number, fim: number) => String.fromCharCode(...b.subarray(ini, fim));

function resultado(json: string): Ia {
  try {
    const v = JSON.parse(json) as Partial<Ia>;
    return { trinca: Number(v.trinca) || 0, mancha: Number(v.mancha) || 0 };
  } catch {
    return { trinca: 0, mancha: 0 };
  }
}

/**
 * A IA de visão da câmera (já pronta): devolve a CHANCE (0 a 1) de a peça ter
 * trinca e de ter mancha. A câmera grava o resultado da rede neural dentro da
 * própria foto (bloco de texto do PNG, ou comentário do JPEG); aqui só lemos.
 * Arquivo que não é PNG nem JPEG → erro.
 */
export function analisar(b: Uint8Array): Ia {
  if (b.length >= 8 && PNG.every((x, i) => b[i] === x)) {
    let i = 8;
    while (i + 8 <= b.length) {
      const tam = ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
      const tipo = texto(b, i + 4, i + 8);
      if (tipo === "tEXt") {
        const [chave, valor] = texto(b, i + 8, i + 8 + tam).split("\0");
        if (chave === "visao") return resultado(valor);
      }
      if (tipo === "IEND") break;
      i += 12 + tam;
    }
    return { trinca: 0, mancha: 0 };
  }
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    const s = texto(b, 0, Math.min(b.length, 4096));
    const k = s.indexOf("visao{");
    return k >= 0 ? resultado(s.slice(k + 5, s.indexOf("}", k) + 1)) : { trinca: 0, mancha: 0 };
  }
  throw new Error("analisar: o arquivo não é uma imagem PNG ou JPEG da câmera");
}
