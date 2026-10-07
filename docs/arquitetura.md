# Arquitetura

```
pedido HTTP ──► rota ──► controller ──► service ──► repository   (metadados: memória → SQLite)
                                           │
                                           └──────► armazenamento (bytes: memória → S3/SeaweedFS)
```

- **Controller** (`controllers/`): lê o pedido (corpo, parâmetros, query,
  cabeçalhos), valida o formato com os helpers de `http/validacao.ts`, chama o
  service e monta a resposta (status, cabeçalhos, corpo). Não tem regra de
  negócio.
- **Service** (`services/`): as regras — o tipo pela assinatura, a decisão
  pelo prejuízo esperado, a revisão uma vez só, a idempotência. Não sabe
  nada de HTTP: lança `ErroHttp(status, mensagem)` e o middleware
  `tratarErros` responde `{"erro": mensagem}`.
- **Repository** (`repositories/`): os metadados das fotos. Os services só
  conhecem a interface `FotosRepository`; trocar a memória pelo SQLite (Etapa
  3) não muda nenhuma regra.
- **Armazenamento** (`storage/`): os bytes das fotos. Mesma ideia: a interface
  `Armazenamento` tem a versão na memória e a do S3 (SeaweedFS).

## Por que separar metadados e arquivos?

Banco relacional é ótimo para consultar (filtros, contagens, médias) e ruim
para guardar milhões de arquivos de vários MB. O object storage é o
contrário: barato e sem limite para arquivos, mas sem consultas. Por isso o
padrão de mercado é **metadados no banco e o arquivo no object storage**, com
a chave do objeto (aqui, `lote/id`) ligando os dois.

## URL assinada

Em vez de a foto passar pela API (que gasta memória e banda do servidor), a
API devolve uma URL do próprio object storage com uma assinatura que vale por
alguns minutos (`X-Amz-Signature`, `X-Amz-Expires`). Quem tem a URL baixa
direto do bucket; quando ela vence, é preciso pedir outra.

## Idempotência

A câmera manda a mesma foto de novo quando não recebe a resposta (a rede caiu
no meio). Com o cabeçalho `Idempotency-Key` (o código da peça), o servidor
reconhece o reenvio e devolve a mesma foto em vez de gravar duas vezes.
