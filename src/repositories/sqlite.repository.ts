import type { DatabaseSync } from "node:sqlite";
import type { Foto, NovaFoto } from "../domain/foto.ts";
import { ErroHttp } from "../http/erros.ts";
import type { FiltroFotos, FotosRepository, Metricas, Pagina, ResumoLote } from "./fotos.repository.ts";

type Linha = Record<string, unknown>;

/** Converte uma linha da tabela "fotos" no objeto Foto. */
const paraFoto = (l: Linha): Foto => ({
  id: String(l.id),
  peca: String(l.peca),
  lote: String(l.lote),
  camera: String(l.camera),
  tipo: String(l.tipo),
  bytes: Number(l.bytes),
  ia: { trinca: Number(l.trinca), mancha: Number(l.mancha) },
  destino: l.destino as Foto["destino"],
  criada_em: Number(l.criada_em),
  revisada_em: l.revisada_em === null ? null : Number(l.revisada_em),
  revisada_por: (l.revisada_por as string | null) ?? null,
});

const umaCasa = (v: unknown) => (v === null || v === undefined ? null : Math.round(Number(v) * 10) / 10);

/** O prejuízo esperado de cada foto, em SQL (o mesmo de prejuizoEsperado()). */
const PREJUIZO = `CASE WHEN revisada_em IS NOT NULL OR destino = 'revisao' THEN 3
  WHEN destino = 'caixa' THEN trinca * 40 + mancha * 10
  ELSE (1 - trinca - mancha) * 6 END`;

/**
 * Repositório SQLite — Etapas 3 e 4. Os metadados sobrevivem ao reinício do
 * servidor. criar() e buscar() já estão prontos como exemplo de SQL com
 * parâmetros (?): nunca monte SQL concatenando valores do usuário.
 */
export class SqliteFotosRepository implements FotosRepository {
  constructor(private readonly db: DatabaseSync) {}

  criar(nova: NovaFoto, id: string): Foto {
    this.db
      .prepare("INSERT INTO fotos (id, peca, lote, camera, tipo, bytes, trinca, mancha, destino, criada_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(id, nova.peca, nova.lote, nova.camera, nova.tipo, nova.bytes, nova.ia.trinca, nova.ia.mancha, nova.destino, nova.criada_em);
    return this.buscar(id)!;
  }

  buscar(id: string): Foto | null {
    const l = this.db.prepare("SELECT * FROM fotos WHERE id = ?").get(id) as Linha | undefined;
    return l ? paraFoto(l) : null;
  }

  listar(filtro: FiltroFotos): Pagina<Foto> {
    // TODO Etapa 3: SELECT com WHERE lote = ? e/ou destino = ? (só os filtros que vierem),
    // ORDER BY seq (ordem de chegada), LIMIT ? OFFSET ? — e um SELECT COUNT(*) para o total.
    void filtro;
    throw new ErroHttp(501, "TODO Etapa 3: implemente listar() no SqliteFotosRepository");
  }

  atualizar(id: string, mudancas: Partial<Pick<Foto, "destino" | "revisada_em" | "revisada_por">>): Foto {
    // TODO Etapa 3: UPDATE fotos SET ... WHERE id = ? com os campos de mudancas; depois devolva buscar(id) (404 se sumiu).
    void id;
    void mudancas;
    throw new ErroHttp(501, "TODO Etapa 3: implemente atualizar() no SqliteFotosRepository");
  }

  apagar(id: string): void {
    // TODO Etapa 3: DELETE FROM fotos WHERE id = ?
    void id;
    throw new ErroHttp(501, "TODO Etapa 3: implemente apagar() no SqliteFotosRepository");
  }

  resumoLote(lote: string): ResumoLote {
    // TODO Etapa 3: um SELECT só — COUNT(*) e SUM(destino = 'caixa'), SUM(destino = 'refugo'), SUM(destino = 'revisao') WHERE lote = ?
    void lote;
    throw new ErroHttp(501, "TODO Etapa 3: implemente resumoLote() no SqliteFotosRepository");
  }

  metricas(): Metricas {
    // TODO Etapa 4: calcule em SQL (COUNT, SUM, AVG, GROUP BY lote). Veja docs/openapi.yaml (GET /metricas).
    // O prejuízo esperado de cada foto já está pronto em SQL na constante PREJUIZO (use SUM(${PREJUIZO})).
    // espera_revisao_media_s = AVG(revisada_em - criada_em) das revisadas. Arredonde com 1 casa (umaCasa).
    void PREJUIZO;
    void umaCasa;
    throw new ErroHttp(501, "TODO Etapa 4: implemente metricas() no SqliteFotosRepository");
  }
}
