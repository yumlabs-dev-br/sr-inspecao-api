import express from "express";
import { naoEncontrado, tratarErros } from "./http/erros.ts";
import { rotas, type Dependencias } from "./routes/index.ts";

/** Cria o app Express (sem subir o servidor): é isto que os testes usam. */
export function criarApp(deps: Dependencias) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json());
  app.use(rotas(deps));
  app.use(naoEncontrado);
  app.use(tratarErros);
  return app;
}
