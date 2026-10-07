/** As chances que a IA da câmera deu (0 a 1). */
export interface Ia {
  trinca: number;
  mancha: number;
}

export const DESTINOS = ["caixa", "refugo", "revisao"] as const;
export type Destino = (typeof DESTINOS)[number];
export const ehDestino = (v: unknown): v is Destino => typeof v === "string" && (DESTINOS as readonly string[]).includes(v);

/** Uma foto de peça e o que se decidiu sobre ela. */
export interface Foto {
  id: string;
  peca: string;
  lote: string;
  camera: string;
  tipo: string;
  bytes: number;
  ia: Ia;
  destino: Destino;
  /** Segundos do turno em que a foto chegou. */
  criada_em: number;
  /** Quando o supervisor revisou (e quem); null se ninguém revisou. */
  revisada_em: number | null;
  revisada_por: string | null;
}

export type NovaFoto = Omit<Foto, "id" | "revisada_em" | "revisada_por">;

/**
 * Prejuízo (pontos): trinca que chega ao cliente 40, mancha 10, peça boa no
 * refugo 6, revisão pelo supervisor 3. Cada decisão conta pelo prejuízo
 * ESPERADO: a chance que a IA deu × o custo.
 */
export const CUSTO = { trinca: 40, mancha: 10, boa: 6, revisao: 3 } as const;
