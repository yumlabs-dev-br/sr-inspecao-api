import type { Destino, Foto, NovaFoto } from "../domain/foto.ts";

export interface FiltroFotos {
  lote?: string;
  destino?: Destino;
  pagina: number;
  porPagina: number;
}

export interface Pagina<T> {
  itens: T[];
  total: number;
  pagina: number;
  por_pagina: number;
}

export interface ResumoLote {
  lote: string;
  pecas: number;
  caixa: number;
  refugo: number;
  revisao: number;
}

export interface Metricas {
  fotos: number;
  por_destino: { caixa: number; refugo: number; revisao: number };
  revisadas: number;
  prejuizo_esperado: number;
  espera_revisao_media_s: number | null;
  por_lote: { lote: string; fotos: number; refugo: number; prejuizo_esperado: number }[];
}

/**
 * Contrato da camada de dados. Os serviços só conhecem esta interface: trocar
 * a memória pelo SQLite (Etapa 3) não muda nenhuma regra de negócio.
 */
export interface FotosRepository {
  criar(nova: NovaFoto, id: string): Foto;
  buscar(id: string): Foto | null;
  /** Na ordem de chegada (a primeira foto primeiro). */
  listar(filtro: FiltroFotos): Pagina<Foto>;
  atualizar(id: string, mudancas: Partial<Pick<Foto, "destino" | "revisada_em" | "revisada_por">>): Foto;
  apagar(id: string): void;
  /** Etapa 2: quantas peças do lote foram para cada destino (destino atual). */
  resumoLote(lote: string): ResumoLote;
  /** Etapa 4: números do turno (de preferência calculados em SQL). */
  metricas(): Metricas;
}
