# Serviço de inspeção visual

> **Situação real do webforge.** Uma fábrica de porcelanato tem uma câmera no
> fim da linha: cada peça para debaixo dela e é fotografada. A IA da câmera
> diz a chance de trinca e de mancha, e alguém precisa decidir se a peça vai
> para a **caixa** (segue para o cliente), para o **refugo** ou para a
> **revisão** do supervisor. Você constrói o serviço que guarda as fotos e
> decide.

Na Situação "A API da estação" as fotos ficavam num `Map` e sumiam a cada
reinício. Aqui o serviço é de verdade: **camadas**, metadados no **SQLite**,
fotos no **object storage** (SeaweedFS, que fala a API do S3), URLs
assinadas, a **fila de revisão** do supervisor, métricas em SQL, limite por
câmera e testes automatizados.

## Como rodar

Requisitos: **Node 22.13 ou mais novo** (recomendado o 24, veja `.nvmrc`) e,
a partir da Etapa 3, **Docker** (para o object storage).

```bash
npm install
npm run dev        # servidor em http://localhost:3000, reinicia a cada alteração
npm test           # testes automatizados (Vitest + supertest)
npm run typecheck  # checagem de tipos (TypeScript)
npm run s3         # Etapa 3: sobe o SeaweedFS (S3) em http://localhost:8333
```

Teste rápido (uma foto de verdade da câmera está em `tests/fixtures/peca.png`):

```bash
curl -i -X POST localhost:3000/fotos -F foto=@tests/fixtures/peca.png -F peca=P-1 -F lote=L-1 -F camera=cam-1 -F segundos=5
```

## As etapas

Cada etapa vale XP na plataforma e só abre depois da anterior. Antes de enviar,
rode a **central da estação** — as mesmas checagens que a plataforma faz:

```bash
npm run central -- 1     # (2, 3 ou 4)
```

| Etapa | O que fazer | Onde |
|---|---|---|
| **1. Contrato REST** | `POST /fotos` (multer, 201 + `Location`, 400/413/415 — o tipo pela **assinatura** dos bytes), `GET /fotos/:id/arquivo`, `GET /fotos` com filtros e paginação e `PATCH /fotos/:id` (a revisão; 409 na segunda vez) | `controllers/fotos.controller.ts`, `services/fotos.service.ts`, `http/upload.ts` |
| **2. O turno** | A câmera e o supervisor usam a API um turno inteiro: decida pelo **prejuízo esperado**, aceite a `Idempotency-Key` (a câmera reenvia quando a rede falha) e responda `GET /lotes/:lote`. Passe na meta | `services/decisao.service.ts`, `services/fotos.service.ts`, `services/lotes.service.ts` |
| **3. Persistência e object storage** | Metadados no SQLite e fotos no SeaweedFS (S3): `PutObject`, `GetObject`, `DeleteObject` e **URL assinada** (`GET /fotos/:id/url`). A central reinicia o servidor e confere o bucket | `repositories/sqlite.repository.ts`, `storage/s3.armazenamento.ts`, `src/server.ts` |
| **4. Métricas, limite e testes** | `GET /metricas` em SQL, **429** com `Retry-After` para a câmera que passa de `LIMITE_FOTOS_POR_MINUTO` e pelo menos 10 testes passando | `repositories/sqlite.repository.ts`, `http/limite.ts`, `tests/` |

Os pontos a implementar estão marcados com `TODO Etapa N` e respondem **501**
até você terminar. O contrato completo está em [`docs/openapi.yaml`](docs/openapi.yaml)
e a organização do código em [`docs/arquitetura.md`](docs/arquitetura.md).

## Como enviar

1. Este repositório precisa ser **público** no seu GitHub.
2. Faça commit e push.
3. Na plataforma (Situações reais → Serviço de inspeção), cole a URL do
   repositório e clique em **Validar**. A central roda o seu `npm start` (porta
   em `PORT`, banco em `DB_ARQUIVO`, object storage em `S3_ENDPOINT` /
   `S3_BUCKET`) e mostra o resultado de cada checagem.

## Estrutura

```
src/
  app.ts                  monta o app Express (sem subir o servidor)
  server.ts               sobe o servidor (PORT, DB_ARQUIVO, S3_*)
  routes/                 URLs → controllers
  controllers/            HTTP ↔ services
  services/               regras: receber, decidir, revisar, lotes, métricas
  repositories/           metadados (memória e SQLite)
  storage/                bytes das fotos (memória e S3)
  visao/                  a IA da câmera (pronta)
  db/                     conexão e migrações
  domain/                 tipos e custos (foto, destino)
  http/                   erros, validação, upload (multer) e limite por câmera
tests/                    testes (Vitest + supertest)
tools/central/            a central da estação (não edite)
docs/                     contrato (OpenAPI) e arquitetura
docker-compose.yml        o SeaweedFS (S3) da Etapa 3
```
