import { randomUUID } from "node:crypto";
import type { Destino, Foto } from "../domain/foto.ts";
import { ErroHttp } from "../http/erros.ts";
import { tipoPelaAssinatura } from "../http/upload.ts";
import { inteiro, texto } from "../http/validacao.ts";
import type { FiltroFotos, FotosRepository, Pagina } from "../repositories/fotos.repository.ts";
import type { Armazenamento } from "../storage/armazenamento.ts";
import { analisar } from "../visao/analisar.ts";
import type { DecisaoService } from "./decisao.service.ts";

export interface FotoRecebida {
  arquivo?: { buffer: Uint8Array; mimetype: string };
  campos: Record<string, unknown>;
  /** Cabeçalho Idempotency-Key (a câmera reenvia com a mesma chave quando perde a resposta). */
  chave?: string;
}

/** Onde os bytes da foto ficam no armazenamento. */
export const chaveDoArquivo = (f: Pick<Foto, "lote" | "id">) => `${f.lote}/${f.id}`;

export const VALIDADE_URL_S = 300;

/**
 * Regras das fotos (Etapas 1 a 3): receber, decidir, guardar, revisar. O
 * service não sabe nada de HTTP: recebe valores já lidos pelo controller e
 * lança ErroHttp quando uma regra é violada.
 */
export class FotosService {
  /** Idempotency-Key → id da foto já criada. */
  private readonly vistas = new Map<string, string>();

  constructor(
    private readonly repo: FotosRepository,
    private readonly armazenamento: Armazenamento,
    private readonly decisao: DecisaoService,
  ) {}

  async receber({ arquivo, campos, chave }: FotoRecebida): Promise<{ foto: Foto; repetida: boolean }> {
    // TODO Etapa 2 (idempotência): se a chave já está em this.vistas, devolva { foto: a já criada, repetida: true }.
    void chave;
    // TODO Etapa 1:
    //   1. sem arquivo → ErroHttp(400); tipo = tipoPelaAssinatura(arquivo.buffer) → null? ErroHttp(415)
    //   2. peca, lote e camera com texto(...); segundos com inteiro(campos.segundos ?? "0", "segundos", 0, 86400)
    //   3. ia = analisar(arquivo.buffer); destino = this.decisao.decidir(ia)
    //   4. id = randomUUID(); await this.armazenamento.salvar(chaveDoArquivo({ lote, id }), arquivo.buffer, tipo)
    //   5. foto = this.repo.criar({ peca, lote, camera, tipo, bytes, ia, destino, criada_em: segundos }, id)
    void arquivo;
    void campos;
    void randomUUID;
    void tipoPelaAssinatura;
    void inteiro;
    void texto;
    void analisar;
    throw new ErroHttp(501, "TODO Etapa 1: implemente FotosService.receber()");
  }

  buscar(id: string): Foto {
    const f = this.repo.buscar(id);
    if (!f) throw new ErroHttp(404, `foto ${id} não existe`);
    return f;
  }

  listar(filtro: FiltroFotos): Pagina<Foto> {
    return this.repo.listar(filtro);
  }

  async arquivo(id: string) {
    const f = this.buscar(id);
    const a = await this.armazenamento.ler(chaveDoArquivo(f));
    if (!a) throw new ErroHttp(404, `o arquivo da foto ${id} sumiu do armazenamento`);
    return a;
  }

  /** O supervisor decide o destino final (uma vez só). */
  revisar(id: string, destino: Destino, supervisor: string, segundos: number): Foto {
    // TODO Etapa 1:
    //   1. f = this.buscar(id)   (404 se não existe)
    //   2. já revisada (f.revisada_em !== null) → ErroHttp(409, ...)
    //   3. destino "revisao" não vale aqui → ErroHttp(400, ...)
    //   4. return this.repo.atualizar(id, { destino, revisada_em: segundos, revisada_por: supervisor })
    void id;
    void destino;
    void supervisor;
    void segundos;
    throw new ErroHttp(501, "TODO Etapa 1: implemente FotosService.revisar()");
  }

  /** Etapa 3: { url, expira_em_s } — a URL assinada do armazenamento. */
  async url(id: string) {
    // TODO Etapa 3: f = this.buscar(id); url = await this.armazenamento.urlAssinada(chaveDoArquivo(f), VALIDADE_URL_S)
    void id;
    throw new ErroHttp(501, "TODO Etapa 3: implemente FotosService.url()");
  }

  /** Etapa 3: apaga do armazenamento e do repositório. */
  async apagar(id: string) {
    // TODO Etapa 3: f = this.buscar(id); await this.armazenamento.apagar(chaveDoArquivo(f)); this.repo.apagar(id)
    void id;
    throw new ErroHttp(501, "TODO Etapa 3: implemente FotosService.apagar()");
  }
}
