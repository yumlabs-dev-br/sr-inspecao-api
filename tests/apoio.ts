import { readFileSync } from "node:fs";
import { criarApp } from "../src/app.ts";
import { MemoriaFotosRepository } from "../src/repositories/memoria.repository.ts";
import { MemoriaArmazenamento } from "../src/storage/memoria.armazenamento.ts";
// Etapa 4: para testar as métricas (que são em SQL), use o SQLite em memória:
//   import { abrirBanco } from "../src/db/conexao.ts";
//   import { SqliteFotosRepository } from "../src/repositories/sqlite.repository.ts";
//   repo: new SqliteFotosRepository(abrirBanco(":memory:"))

/** Um app novo para cada teste, com tudo na memória (sem Docker). */
export const appDeTeste = (limitePorMinuto = 600) => criarApp({ repo: new MemoriaFotosRepository(), armazenamento: new MemoriaArmazenamento(), limitePorMinuto });

/** Uma foto PNG de verdade da câmera (trinca 0,25 · mancha 0,40). */
export const FOTO = readFileSync(new URL("./fixtures/peca.png", import.meta.url));
