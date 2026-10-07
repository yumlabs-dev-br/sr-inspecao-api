import { criarApp } from "./app.ts";
import { MemoriaFotosRepository } from "./repositories/memoria.repository.ts";
import { MemoriaArmazenamento } from "./storage/memoria.armazenamento.ts";
// Etapa 3: metadados no SQLite e fotos no object storage (quando houver S3_ENDPOINT):
//   import { abrirBanco } from "./db/conexao.ts";
//   import { SqliteFotosRepository } from "./repositories/sqlite.repository.ts";
//   import { S3Armazenamento } from "./storage/s3.armazenamento.ts";
//   const repo = new SqliteFotosRepository(abrirBanco(arquivo));
//   if (process.env.S3_ENDPOINT) {
//     const s3 = new S3Armazenamento({ endpoint: process.env.S3_ENDPOINT, bucket: process.env.S3_BUCKET ?? "fotos",
//                                      chave: process.env.S3_KEY ?? "inspecao", segredo: process.env.S3_SECRET ?? "inspecao-segredo" });
//     await s3.garantirBucket();
//     armazenamento = s3;
//   }

const porta = Number(process.env.PORT ?? 3000);
const arquivo = process.env.DB_ARQUIVO ?? "dados/inspecao.db";
const limitePorMinuto = Number(process.env.LIMITE_FOTOS_POR_MINUTO ?? 600);

const repo = new MemoriaFotosRepository();
const armazenamento = new MemoriaArmazenamento();

criarApp({ repo, armazenamento, limitePorMinuto }).listen(porta, () => {
  console.log(`Serviço de inspeção no ar: http://localhost:${porta} (metadados: ${repo.constructor.name}${repo instanceof MemoriaFotosRepository ? "" : `, ${arquivo}`} · fotos: ${armazenamento.constructor.name})`);
});
