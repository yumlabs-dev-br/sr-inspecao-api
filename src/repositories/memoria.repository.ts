import type { Foto, NovaFoto } from "../domain/foto.ts";
import { ErroHttp } from "../http/erros.ts";
import type { FiltroFotos, FotosRepository, Metricas, Pagina, ResumoLote } from "./fotos.repository.ts";

/** Repositório na memória (pronto): some quando o servidor reinicia. */
export class MemoriaFotosRepository implements FotosRepository {
  private fotos: Foto[] = [];

  criar(nova: NovaFoto, id: string): Foto {
    const f: Foto = { ...nova, id, revisada_em: null, revisada_por: null };
    this.fotos.push(f);
    return { ...f };
  }

  buscar(id: string): Foto | null {
    const f = this.fotos.find((x) => x.id === id);
    return f ? { ...f } : null;
  }

  listar({ lote, destino, pagina, porPagina }: FiltroFotos): Pagina<Foto> {
    const todas = this.fotos.filter((f) => (!lote || f.lote === lote) && (!destino || f.destino === destino));
    return { itens: todas.slice((pagina - 1) * porPagina, pagina * porPagina).map((f) => ({ ...f })), total: todas.length, pagina, por_pagina: porPagina };
  }

  atualizar(id: string, mudancas: Partial<Pick<Foto, "destino" | "revisada_em" | "revisada_por">>): Foto {
    const f = this.fotos.find((x) => x.id === id);
    if (!f) throw new ErroHttp(404, `foto ${id} não existe`);
    Object.assign(f, mudancas);
    return { ...f };
  }

  apagar(id: string): void {
    this.fotos = this.fotos.filter((f) => f.id !== id);
  }

  resumoLote(lote: string): ResumoLote {
    const doLote = this.fotos.filter((f) => f.lote === lote);
    const conta = (d: string) => doLote.filter((f) => f.destino === d).length;
    return { lote, pecas: doLote.length, caixa: conta("caixa"), refugo: conta("refugo"), revisao: conta("revisao") };
  }

  /** As métricas são calculadas em SQL (SqliteFotosRepository, Etapa 4). */
  metricas(): Metricas {
    throw new ErroHttp(501, "as métricas são calculadas em SQL: use o SqliteFotosRepository (Etapa 4)");
  }
}
