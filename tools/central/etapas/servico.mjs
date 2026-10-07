// Situação "Inspeção visual: o serviço de inspeção" — as checagens de cada etapa.
//
// Cada etapa sobe o servidor do aluno (npm start), fala com ele por HTTP de
// verdade (como a câmera e o supervisor) e devolve { passou, resumo,
// checagens: [{ nome, ok, detalhe }], ... }.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pedir, subirServidor } from "../http.mjs";
import { CUSTO, LOTE, mulberry32, PASSO_S, PECAS, pecasDoPeriodo, prejuizo, rotuloTempo } from "../inspecao/modelo.mjs";

/** Meta da Etapa 2: prejuízo médio (pontos) da solução de referência × 1,03. */
export const META_TURNO = 352;
export const SEMENTES = [1, 2, 3];
export const TESTES_MINIMOS = 10;
/** O supervisor pega uma foto da fila a cada 3 peças (15 s). */
const INTERVALO_SUPERVISOR = 3;
const S3 = process.env.S3_ENDPOINT ?? "http://localhost:8333";

const novaPasta = () => mkdtempSync(join(tmpdir(), "central-"));
const objeto = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const temErro = (r) => objeto(r.json) && typeof r.json.erro === "string" && r.json.erro.trim() !== "";
const resumoResposta = (r) => (r.erro ? r.erro : `${r.status}${r.corpo ? ` ${r.corpo.slice(0, 160)}` : ""}`);
const mesmos = (a, b) => a instanceof Uint8Array && a.length === b.length && a.every((x, i) => x === b[i]);

function relatorio() {
  const checagens = [];
  return {
    checagens,
    checar(nome, ok, detalhe = "") {
      checagens.push({ nome, ok: !!ok, detalhe: ok ? "" : detalhe });
      return !!ok;
    },
  };
}

// ─── Arquivos de teste e o formulário multipart ──────────────────────────────

const enc = new TextEncoder();
const TESTE = pecasDoPeriodo(99);
const FOTO = TESTE[3];
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, ...enc.encode("JFIF\0"), 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xfe, 0, 34, ...enc.encode('visao{"trinca":0.02,"mancha":0.1}'), 0xff, 0xd9]);
const PDF = enc.encode("%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n");
const EXE = new Uint8Array([0x4d, 0x5a, 0x90, 0, 3, 0, 0, 0, 4, 0, 0, 0, 0xff, 0xff, 0, 0, ...new Array(200).fill(0)]);
const ENORME = (() => {
  const b = new Uint8Array(2_500_000);
  b.set(FOTO.foto.subarray(0, 64));
  return b;
})();
const FRONTEIRA = "----EstacaoInspecao3Fronteira7MA4YWxk";

/** Corpo multipart/form-data (o mesmo que um navegador ou a câmera montariam). */
function formulario(partes) {
  const blocos = [];
  for (const p of partes) {
    if (p.arquivo) blocos.push(enc.encode(`--${FRONTEIRA}\r\nContent-Disposition: form-data; name="${p.nome}"; filename="${p.arquivo.nome}"\r\nContent-Type: ${p.arquivo.tipo}\r\n\r\n`), p.arquivo.dados, enc.encode("\r\n"));
    else blocos.push(enc.encode(`--${FRONTEIRA}\r\nContent-Disposition: form-data; name="${p.nome}"\r\n\r\n${p.valor}\r\n`));
  }
  blocos.push(enc.encode(`--${FRONTEIRA}--\r\n`));
  const r = new Uint8Array(blocos.reduce((s, b) => s + b.length, 0));
  let k = 0;
  for (const b of blocos) {
    r.set(b, k);
    k += b.length;
  }
  return r;
}
const arquivo = (dados, tipo = "image/png", nome = "peca.png", campo = "foto") => ({ nome: campo, arquivo: { nome, tipo, dados } });
const campos = (o = {}) => Object.entries({ peca: "P-0042", lote: "L-7", camera: "cam-1", segundos: "15", ...o }).filter(([, v]) => v !== undefined).map(([nome, valor]) => ({ nome, valor }));

/** POST /fotos com um formulário. */
const enviarFoto = (base, partes, cabecalhos = {}) => pedir(base, { metodo: "POST", caminho: "/fotos", corpo: formulario(partes), cabecalhos: { "content-type": `multipart/form-data; boundary=${FRONTEIRA}`, ...cabecalhos } });

// ─── Etapa 1: o contrato REST das fotos ──────────────────────────────────────

export async function etapa1({ pasta }) {
  const { checagens, checar } = relatorio();
  const dir = novaPasta();
  const s = await subirServidor({ pasta, env: { DB_ARQUIVO: join(dir, "etapa1.db"), S3_ENDPOINT: "" } });
  try {
    const b = s.base;
    const r1 = await enviarFoto(b, [arquivo(FOTO.foto), ...campos()]);
    checar("POST /fotos válido → 201", r1.status === 201, `esperava 201, veio ${resumoResposta(r1)}`);
    const f = r1.json;
    const id = objeto(f) ? f.id : undefined;
    checar(
      "corpo da foto criada",
      objeto(f) && typeof id === "string" && id && f.peca === "P-0042" && f.lote === "L-7" && f.camera === "cam-1" && f.tipo === "image/png" && f.bytes === FOTO.foto.length && f.criada_em === 15 && f.revisada_em === null && ["caixa", "refugo", "revisao"].includes(f.destino),
      `esperava {id, peca: "P-0042", lote: "L-7", camera: "cam-1", tipo: "image/png", bytes: ${FOTO.foto.length}, destino, criada_em: 15, revisada_em: null, ...}; veio ${r1.corpo.slice(0, 220)}`,
    );
    checar("a IA da foto no corpo", objeto(f?.ia) && f.ia.trinca === FOTO.ia.trinca && f.ia.mancha === FOTO.ia.mancha, `esperava "ia": ${JSON.stringify(FOTO.ia)} (analisar(req.file.buffer)); veio ${JSON.stringify(f?.ia)}`);
    checar("cabeçalho Location: /fotos/{id}", r1.cabecalhos.location === `/fotos/${id}`, `esperava Location: /fotos/${id}; veio ${r1.cabecalhos.location ?? "nenhum"}`);

    const r2 = await pedir(b, { caminho: `/fotos/${id}` });
    checar("GET /fotos/{id} → 200 com a mesma foto", r2.status === 200 && r2.json?.id === id && r2.json?.peca === "P-0042", `esperava 200 com a foto ${id}; veio ${resumoResposta(r2)}`);
    const r3 = await pedir(b, { caminho: `/fotos/${id}/arquivo`, binario: true });
    checar("GET /fotos/{id}/arquivo → os mesmos bytes, image/png", r3.status === 200 && (r3.cabecalhos["content-type"] ?? "").startsWith("image/png") && mesmos(r3.bytes, FOTO.foto), `esperava 200, Content-Type image/png e os ${FOTO.foto.length} bytes da foto; veio ${r3.status} ${r3.cabecalhos["content-type"] ?? ""} (${r3.bytes?.length ?? 0} bytes)`);
    const r4 = await pedir(b, { caminho: "/fotos/nao-existe" });
    checar("GET de foto que não existe → 404 {erro}", r4.status === 404 && temErro(r4), `esperava 404 com {"erro": ...}; veio ${resumoResposta(r4)}`);

    for (const [nome, partes, status] of [
      ["POST sem arquivo", campos(), 400],
      ["POST sem o campo peca", [arquivo(FOTO.foto), ...campos({ peca: undefined })], 400],
      ['POST com segundos "abc"', [arquivo(FOTO.foto), ...campos({ segundos: "abc" })], 400],
      ["POST de um PDF", [arquivo(PDF, "application/pdf", "laudo.pdf"), ...campos()], 415],
      ["POST de um executável disfarçado de PNG", [arquivo(EXE, "image/png", "virus.png"), ...campos()], 415],
      ["POST de 2,5 MB", [arquivo(ENORME, "image/png", "enorme.png"), ...campos()], 413],
      ['POST com a foto no campo "imagem"', [arquivo(FOTO.foto, "image/png", "peca.png", "imagem"), ...campos()], 400],
    ]) {
      const r = await enviarFoto(b, partes);
      checar(`${nome} → ${status} {erro}`, r.status === status && temErro(r), `esperava ${status} com {"erro": ...}; veio ${resumoResposta(r)}`);
    }
    const rj = await enviarFoto(b, [arquivo(JPEG, "image/jpeg", "peca.jpg"), ...campos({ peca: "P-0043", segundos: "20" })]);
    checar("POST com JPEG → 201, tipo image/jpeg", rj.status === 201 && rj.json?.tipo === "image/jpeg", `esperava 201 com "tipo": "image/jpeg"; veio ${resumoResposta(rj)}`);
    await enviarFoto(b, [arquivo(TESTE[7].foto), ...campos({ peca: "P-0099", lote: "L-8", segundos: "25" })]);

    const rl = await pedir(b, { caminho: "/fotos?lote=L-7" });
    const itens = Array.isArray(rl.json?.itens) ? rl.json.itens : null;
    checar('GET /fotos?lote=L-7 → {itens, total, pagina, por_pagina} na ordem de chegada', rl.status === 200 && itens && rl.json.total === 2 && itens.length === 2 && itens[0].id === id && itens[1].peca === "P-0043" && rl.json.pagina === 1 && rl.json.por_pagina === 20, `esperava 200 com as 2 fotos do lote L-7 (primeiro a P-0042), "total": 2, "pagina": 1, "por_pagina": 20; veio ${resumoResposta(rl)}`);
    const rp = await pedir(b, { caminho: "/fotos?por_pagina=1&pagina=2" });
    checar("GET /fotos?por_pagina=1&pagina=2 → a 2ª foto", rp.status === 200 && rp.json?.itens?.length === 1 && rp.json.itens[0].peca === "P-0043" && rp.json.total === 3, `esperava a foto P-0043 e "total": 3; veio ${resumoResposta(rp)}`);
    for (const q of ["destino=lixo", "por_pagina=0", "por_pagina=101", "pagina=abc"]) {
      const r = await pedir(b, { caminho: `/fotos?${q}` });
      checar(`GET /fotos?${q} → 400`, r.status === 400 && temErro(r), `esperava 400 com {"erro": ...}; veio ${resumoResposta(r)}`);
    }

    const rv = await pedir(b, { metodo: "PATCH", caminho: `/fotos/${id}`, corpo: { destino: "refugo", supervisor: "bruno", segundos: 40 } });
    checar("PATCH /fotos/{id} (revisão) → 200", rv.status === 200 && rv.json?.destino === "refugo" && rv.json?.revisada_em === 40 && rv.json?.revisada_por === "bruno", `esperava 200 com "destino": "refugo", "revisada_em": 40, "revisada_por": "bruno"; veio ${resumoResposta(rv)}`);
    const rr = await pedir(b, { metodo: "PATCH", caminho: `/fotos/${id}`, corpo: { destino: "caixa", supervisor: "bruno", segundos: 50 } });
    checar("PATCH de foto já revisada → 409 {erro}", rr.status === 409 && temErro(rr), `esperava 409 com {"erro": ...}; veio ${resumoResposta(rr)}`);
    const ri = await pedir(b, { metodo: "PATCH", caminho: `/fotos/${rj.json?.id}`, corpo: { destino: "lixo", supervisor: "bruno", segundos: 50 } });
    checar("PATCH com destino inválido → 400", ri.status === 400 && temErro(ri), `esperava 400; veio ${resumoResposta(ri)}`);
    const rn = await pedir(b, { metodo: "PATCH", caminho: "/fotos/nao-existe", corpo: { destino: "caixa", supervisor: "bruno", segundos: 50 } });
    checar("PATCH de foto que não existe → 404", rn.status === 404, `esperava 404; veio ${resumoResposta(rn)}`);
  } finally {
    await s.parar();
    rmSync(dir, { recursive: true, force: true });
  }
  const ok = checagens.filter((c) => c.ok).length;
  return { passou: ok === checagens.length, resumo: `${ok}/${checagens.length} checagens do contrato`, checagens };
}

// ─── O turno: a câmera e o supervisor usando a API ───────────────────────────

/**
 * Um turno contra a API: cada peça vira um POST /fotos (com Idempotency-Key;
 * a rede às vezes perde a resposta e a câmera reenvia), o supervisor tira da
 * fila a revisão mais antiga a cada 15 s (GET /fotos?destino=revisao, baixa a
 * foto, PATCH) e, no fim de cada lote, a central pede o relatório.
 */
async function turno(base, semente, { quantas = PECAS, perda = 0.12 } = {}) {
  const pecas = pecasDoPeriodo(semente).slice(0, quantas);
  const rede = mulberry32(semente * 104729 + 3);
  let pedidos = 0;
  const pedirConta = async (o) => {
    pedidos++;
    return pedir(base, o);
  };
  const porId = new Map();
  const fila = [];
  const lotes = new Map();
  const quadros = [];
  const partes = { "Risco de trinca na caixa": 0, "Risco de mancha na caixa": 0, "Peças boas no refugo": 0, "Revisões do supervisor": 0, "Revisões que não deram tempo": 0, "Relatórios errados": 0 };
  let custo = 0;
  const contagem = { caixa: 0, refugo: 0, revisao: 0 };
  const fim = (erro) => ({ custo, partes, quadros, erro, pedidos, semente, fotos: porId });
  const exigir = (r, linha, aceitos) => {
    if (!aceitos.includes(r.status)) throw new Error(`${linha} respondeu ${resumoResposta(r)} — esperava ${aceitos.join(" ou ")}.`);
    return r;
  };
  try {
    for (const p of pecas) {
      const rotulo = rotuloTempo(p.n);
      const segundos = p.n * PASSO_S;
      const partesForm = [arquivo(p.foto, "image/png", `${p.codigo}.png`), ...campos({ peca: p.codigo, lote: p.lote, camera: "estacao-3", segundos: String(segundos) })];
      const cab = { "Idempotency-Key": p.codigo };
      let perdida = false;
      if (perda && rede() < perda) {
        perdida = true;
        exigir(await (pedidos++, enviarFoto(base, partesForm, cab)), "POST /fotos", [200, 201]);
      }
      pedidos++;
      const r = exigir(await enviarFoto(base, partesForm, cab), "POST /fotos", [200, 201]);
      const f = r.json;
      if (!objeto(f) || typeof f.id !== "string" || !["caixa", "refugo", "revisao"].includes(f.destino)) throw new Error(`POST /fotos (${p.codigo}): o corpo deve ser a foto com "id" e "destino"; veio ${r.corpo.slice(0, 160)}.`);
      if (porId.has(f.id) && porId.get(f.id).p.n !== p.n) throw new Error(`POST /fotos (${p.codigo}) devolveu o id ${f.id}, que já é de outra peça.`);
      const reg = { p, id: f.id, destino: f.destino, final: f.destino === "revisao" ? null : f.destino };
      porId.set(f.id, reg);
      contagem[f.destino]++;
      const l = lotes.get(p.lote) ?? { pecas: 0, caixa: 0, refugo: 0, revisao: 0 };
      l.pecas++;
      l[f.destino]++;
      lotes.set(p.lote, l);
      let custoPeca;
      if (f.destino === "revisao") {
        fila.push(reg);
        custoPeca = CUSTO.revisao;
        partes["Revisões do supervisor"] += custoPeca;
      } else {
        custoPeca = prejuizo(p.ia, f.destino);
        if (f.destino === "caixa") {
          partes["Risco de trinca na caixa"] += p.ia.trinca * CUSTO.trinca;
          partes["Risco de mancha na caixa"] += p.ia.mancha * CUSTO.mancha;
        } else partes["Peças boas no refugo"] += custoPeca;
      }
      custo += custoPeca;

      // O supervisor pega a revisão mais antiga.
      let revisada = null;
      if ((p.n + 1) % INTERVALO_SUPERVISOR === 0) {
        const rf = exigir(await pedirConta({ caminho: "/fotos?destino=revisao&por_pagina=1" }), "GET /fotos?destino=revisao", [200]);
        const prox = Array.isArray(rf.json?.itens) ? rf.json.itens[0] : undefined;
        if (fila.length && !prox) throw new Error(`GET /fotos?destino=revisao veio vazio, mas há ${fila.length} foto(s) esperando revisão (a primeira: ${fila[0].p.codigo}).`);
        if (prox) {
          if (prox.id !== fila[0].id) throw new Error(`GET /fotos?destino=revisao&por_pagina=1 devolveu ${prox.peca ?? prox.id}, mas a mais antiga na fila é ${fila[0].p.codigo} — liste na ordem de chegada.`);
          const alvo = fila.shift();
          const ra = exigir(await pedirConta({ caminho: `/fotos/${alvo.id}/arquivo`, binario: true }), `GET /fotos/${alvo.id}/arquivo`, [200]);
          if (!mesmos(ra.bytes, alvo.p.foto)) throw new Error(`GET /fotos/${alvo.id}/arquivo não devolveu a foto da ${alvo.p.codigo} (o supervisor precisa ver a peça para revisar).`);
          const final = alvo.p.verdade === "boa" ? "caixa" : "refugo";
          const rp = exigir(await pedirConta({ metodo: "PATCH", caminho: `/fotos/${alvo.id}`, corpo: { destino: final, supervisor: "bruno", segundos } }), `PATCH /fotos/${alvo.id}`, [200]);
          if (rp.json?.destino !== final) throw new Error(`PATCH /fotos/${alvo.id} deve responder a foto com "destino": "${final}"; veio ${rp.corpo.slice(0, 120)}.`);
          alvo.final = final;
          contagem.revisao--;
          contagem[final]++;
          const la = lotes.get(alvo.p.lote);
          la.revisao--;
          la[final]++;
          revisada = { codigo: alvo.p.codigo, n: alvo.p.n, final };
        }
      }

      // Fim do lote: o relatório tem de bater com o que a câmera e o supervisor viram.
      let rel = null;
      if ((p.n + 1) % LOTE === 0) {
        const rl = await pedirConta({ caminho: `/lotes/${p.lote}` });
        const esperado = { ...lotes.get(p.lote) };
        const v = rl.json;
        const ok = rl.status === 200 && objeto(v) && ["pecas", "caixa", "refugo", "revisao"].every((k) => v[k] === esperado[k]);
        rel = { lote: p.lote, ok, esperado, veio: rl.status === 200 ? v : `${rl.status || "sem resposta"}` };
        if (!ok) {
          custo += 100;
          partes["Relatórios errados"] += 100;
        }
      }
      quadros.push({ t: p.n, rotulo, n: p.n, destino: f.destino, perdida, custoPeca, custo, contagem: { ...contagem }, revisada, relatorio: rel });
    }
    // O turno acabou: o que ficou na fila vai para o refugo sem revisão.
    for (const reg of fila) {
      const extra = prejuizo(reg.p.ia, "refugo") - CUSTO.revisao;
      custo += extra;
      partes["Revisões que não deram tempo"] += prejuizo(reg.p.ia, "refugo");
      partes["Revisões do supervisor"] -= CUSTO.revisao;
    }
  } catch (e) {
    return fim(e instanceof Error ? e.message : String(e));
  }
  return fim();
}

/** Replay compacto (as fotos a plataforma refaz pela semente). */
const replay = (r) => ({ semente: r.semente, quadros: r.quadros, partes: r.partes, custo: r.custo });

// ─── Etapa 2: o turno pela API ───────────────────────────────────────────────

export async function etapa2({ pasta }) {
  const { checagens, checar } = relatorio();
  const custos = [];
  let primeiro = null;
  for (const semente of SEMENTES) {
    const dir = novaPasta();
    const s = await subirServidor({ pasta, env: { DB_ARQUIVO: join(dir, "etapa2.db"), S3_ENDPOINT: "" } });
    try {
      const r = await turno(s.base, semente);
      primeiro ??= r;
      if (!checar(`Turno ${semente}: a câmera e o supervisor operaram pela API`, !r.erro, r.erro)) break;
      custos.push(r.custo);
      const errados = r.quadros.filter((q) => q.relatorio && !q.relatorio.ok).length;
      checar(`Turno ${semente}: relatórios dos lotes conferem`, errados === 0, `${errados} relatório(s) de lote não bateram (GET /lotes/:lote) — a câmera reenvia com a mesma Idempotency-Key: a foto não pode ser gravada duas vezes`);
      checar(`Turno ${semente}: prejuízo ${Math.round(r.custo)} pts (${r.pedidos} requisições)`, true);
    } finally {
      await s.parar();
      rmSync(dir, { recursive: true, force: true });
    }
  }
  const media = custos.length === SEMENTES.length ? custos.reduce((a, b) => a + b, 0) / custos.length : null;
  if (media !== null) checar(`Prejuízo médio ${Math.round(media)} pts ≤ meta ${META_TURNO} pts`, media <= META_TURNO, `${Math.round(media - META_TURNO)} pts acima da meta — o DecisaoService escolhe o menor prejuízo esperado entre caixa, refugo e revisão?`);
  return { passou: checagens.every((c) => c.ok), resumo: media === null ? "o turno não completou" : `prejuízo médio ${Math.round(media)} pts (meta ≤ ${META_TURNO})`, checagens, media, meta: META_TURNO, replay: primeiro ? replay(primeiro) : null };
}

// ─── Etapa 3: SQLite e object storage ────────────────────────────────────────

/** Os objetos de um bucket do S3 (SeaweedFS): [{chave, tamanho}]. */
async function objetosDoBucket(bucket) {
  const r = await fetch(`${S3}/${bucket}?list-type=2&max-keys=1000`).catch(() => null);
  if (!r || r.status !== 200) return null;
  const xml = await r.text();
  return [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)].map((m) => ({ chave: /<Key>([^<]*)<\/Key>/.exec(m[1])?.[1], tamanho: Number(/<Size>(\d+)<\/Size>/.exec(m[1])?.[1]) }));
}

export async function etapa3({ pasta }) {
  const { checagens, checar } = relatorio();
  const vivo = await fetch(S3).then(() => true, () => false);
  if (!checar(`O object storage (SeaweedFS) responde em ${S3}`, vivo, "suba o SeaweedFS: npm run s3 (docker compose up -d) e espere uns segundos")) return fim();
  const dir = novaPasta();
  const bucket = `central-${Date.now().toString(36)}`;
  const env = { DB_ARQUIVO: join(dir, "etapa3.db"), S3_ENDPOINT: S3, S3_BUCKET: bucket, S3_KEY: "central", S3_SECRET: "central" };
  let rodada = null;
  try {
    const s1 = await subirServidor({ pasta, env });
    try {
      rodada = await turno(s1.base, 1, { quantas: LOTE, perda: 0 });
    } finally {
      await s1.parar();
    }
    if (!checar(`A câmera mandou o lote inteiro (${LOTE} fotos)`, !rodada.erro, rodada.erro)) return fim();
    const objs = await objetosDoBucket(bucket);
    const tamanhos = [...rodada.fotos.values()].map((x) => x.p.foto.length).sort((a, b) => a - b);
    checar(`As ${LOTE} fotos estão no bucket "${bucket}" do object storage`, objs && objs.length === LOTE && objs.map((o) => o.tamanho).sort((a, b) => a - b).every((t, i) => t === tamanhos[i]), objs ? `o bucket tem ${objs.length} objeto(s); esperava ${LOTE}, cada um com o tamanho da foto — o servidor usa o S3Armazenamento quando há S3_ENDPOINT?` : `não consegui listar o bucket "${bucket}" — o servidor cria o bucket (garantirBucket) ao subir?`);
    checar("O servidor foi reiniciado (mesmo banco e mesmo bucket)", true);

    const s2 = await subirServidor({ pasta, env });
    try {
      const b = s2.base;
      const rl = await pedir(b, { caminho: "/fotos?por_pagina=100" });
      checar(`Depois de reiniciar: as ${LOTE} fotos continuam lá`, rl.status === 200 && rl.json?.total === LOTE, `GET /fotos devolveu total ${rl.json?.total ?? resumoResposta(rl)} — esperava ${LOTE}. Os metadados estão indo para o SQLite (DB_ARQUIVO)?`);
      const regs = [...rodada.fotos.values()];
      const revisada = regs.find((x) => x.final && x.destino === "revisao");
      if (revisada) {
        const r = await pedir(b, { caminho: `/fotos/${revisada.id}` });
        checar("Depois de reiniciar: a revisão do supervisor continua lá", r.status === 200 && r.json?.destino === revisada.final && r.json?.revisada_por === "bruno", `esperava "destino": "${revisada.final}" e "revisada_por": "bruno"; veio ${resumoResposta(r)}`);
      }
      const alvo = regs[7];
      const ra = await pedir(b, { caminho: `/fotos/${alvo.id}/arquivo`, binario: true });
      checar("Depois de reiniciar: GET /fotos/{id}/arquivo lê a foto do bucket", ra.status === 200 && mesmos(ra.bytes, alvo.p.foto), `esperava os ${alvo.p.foto.length} bytes da ${alvo.p.codigo}; veio ${ra.status} (${ra.bytes?.length ?? 0} bytes)`);
      const ru = await pedir(b, { caminho: `/fotos/${alvo.id}/url` });
      const url = ru.json?.url;
      let baixou = null;
      if (typeof url === "string" && /^https?:\/\//.test(url)) baixou = await fetch(url).then(async (x) => (x.status === 200 ? new Uint8Array(await x.arrayBuffer()) : null), () => null);
      checar("GET /fotos/{id}/url → URL assinada que baixa a foto direto do bucket", ru.status === 200 && Number.isInteger(ru.json?.expira_em_s) && baixou !== null && mesmos(baixou, alvo.p.foto), `esperava 200 com {"url": "http://…X-Amz-Signature=…", "expira_em_s": 300} e a URL baixando a foto; veio ${resumoResposta(ru)}${url ? ` (baixar a URL deu ${baixou ? "outros bytes" : "erro"})` : ""}`);
      checar("A URL assinada aponta para o object storage (não para a API)", typeof url === "string" && url.startsWith(S3) && /X-Amz-Signature=/.test(url), `a URL deveria começar com ${S3} e ter X-Amz-Signature (getSignedUrl do @aws-sdk/s3-request-presigner); veio ${String(url).slice(0, 120)}`);
      const rd = await pedir(b, { metodo: "DELETE", caminho: `/fotos/${alvo.id}` });
      checar("DELETE /fotos/{id} → 204", rd.status === 204, `esperava 204; veio ${resumoResposta(rd)}`);
      const depois = await pedir(b, { caminho: `/fotos/${alvo.id}` });
      const objs2 = await objetosDoBucket(bucket);
      checar("Depois do DELETE: a foto some da API e do bucket", depois.status === 404 && objs2?.length === LOTE - 1, `GET /fotos/{id} deu ${depois.status} (esperava 404) e o bucket tem ${objs2?.length ?? "?"} objetos (esperava ${LOTE - 1}) — apague o objeto do S3 também`);
    } finally {
      await s2.parar();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  return fim();

  function fim() {
    const ok = checagens.filter((c) => c.ok).length;
    return { passou: ok === checagens.length, resumo: `${ok}/${checagens.length} checagens de persistência e object storage`, checagens };
  }
}

// ─── Etapa 4: métricas, limite por câmera e testes ───────────────────────────

const umaCasa = (v) => Math.round(v * 10) / 10;
const perto = (a, b) => (a === null || b === null ? a === b : typeof a === "number" && Math.abs(a - b) <= 0.15);

/** O que GET /metricas deveria responder, pelo que a câmera e o supervisor viram. */
function metricasEsperadas(rodada) {
  const regs = [...rodada.fotos.values()];
  const destinoAtual = (r) => r.final ?? "revisao";
  const prej = (r) => (r.destino === "revisao" ? CUSTO.revisao : prejuizo(r.p.ia, r.destino));
  const revisadas = regs.filter((r) => r.destino === "revisao" && r.final);
  const quando = new Map(rodada.quadros.filter((q) => q.revisada).map((q) => [q.revisada.n, q.n * PASSO_S]));
  const lotes = [...new Set(regs.map((r) => r.p.lote))].sort();
  return {
    fotos: regs.length,
    por_destino: { caixa: regs.filter((r) => destinoAtual(r) === "caixa").length, refugo: regs.filter((r) => destinoAtual(r) === "refugo").length, revisao: regs.filter((r) => destinoAtual(r) === "revisao").length },
    revisadas: revisadas.length,
    prejuizo_esperado: umaCasa(regs.reduce((s, r) => s + prej(r), 0)),
    espera_revisao_media_s: revisadas.length ? umaCasa(revisadas.reduce((s, r) => s + (quando.get(r.p.n) - r.p.n * PASSO_S), 0) / revisadas.length) : null,
    por_lote: lotes.map((lote) => {
      const rs = regs.filter((r) => r.p.lote === lote);
      return { lote, fotos: rs.length, refugo: rs.filter((r) => destinoAtual(r) === "refugo").length, prejuizo_esperado: umaCasa(rs.reduce((s, r) => s + prej(r), 0)) };
    }),
  };
}

export async function etapa4({ pasta }) {
  const { checagens, checar } = relatorio();
  const dir = novaPasta();
  try {
    const s = await subirServidor({ pasta, env: { DB_ARQUIVO: join(dir, "etapa4.db"), S3_ENDPOINT: "" } });
    try {
      const rodada = await turno(s.base, 2, { perda: 0 });
      if (checar("A câmera e o supervisor operaram um turno inteiro", !rodada.erro, rodada.erro)) {
        const e = metricasEsperadas(rodada);
        const r = await pedir(s.base, { caminho: "/metricas" });
        const m = r.json;
        if (checar("GET /metricas → 200 em JSON", r.status === 200 && objeto(m), `veio ${resumoResposta(r)}`)) {
          checar(`fotos = ${e.fotos}`, m.fotos === e.fotos, `veio ${JSON.stringify(m.fotos)}`);
          checar(`por_destino = ${JSON.stringify(e.por_destino)}`, objeto(m.por_destino) && ["caixa", "refugo", "revisao"].every((k) => m.por_destino[k] === e.por_destino[k]), `veio ${JSON.stringify(m.por_destino)} (o destino ATUAL de cada foto)`);
          checar(`revisadas = ${e.revisadas}`, m.revisadas === e.revisadas, `veio ${JSON.stringify(m.revisadas)}`);
          checar(`prejuizo_esperado = ${e.prejuizo_esperado}`, perto(m.prejuizo_esperado, e.prejuizo_esperado), `veio ${JSON.stringify(m.prejuizo_esperado)} (revisada ou em revisão: 3; caixa: trinca × 40 + mancha × 10; refugo: (1 − trinca − mancha) × 6; soma com 1 casa)`);
          checar(`espera_revisao_media_s = ${e.espera_revisao_media_s}`, perto(m.espera_revisao_media_s, e.espera_revisao_media_s), `veio ${JSON.stringify(m.espera_revisao_media_s)} (média de revisada_em − criada_em das revisadas)`);
          const pl = Array.isArray(m.por_lote) ? m.por_lote : [];
          const certos = e.por_lote.every((x, i) => pl[i]?.lote === x.lote && pl[i].fotos === x.fotos && pl[i].refugo === x.refugo && perto(pl[i].prejuizo_esperado, x.prejuizo_esperado));
          checar(`por_lote (${e.por_lote.length} lotes, em ordem)`, certos && pl.length === e.por_lote.length, `esperava ${JSON.stringify(e.por_lote)}; veio ${JSON.stringify(m.por_lote)?.slice(0, 260)}`);
        }
      }
    } finally {
      await s.parar();
    }

    // Uma câmera com defeito dispara sem parar: limite de 20 por minuto.
    const s2 = await subirServidor({ pasta, env: { DB_ARQUIVO: join(dir, "etapa4-limite.db"), S3_ENDPOINT: "", LIMITE_FOTOS_POR_MINUTO: "20" } });
    try {
      const status = [];
      let retry = null;
      for (let k = 0; k < 24; k++) {
        const r = await enviarFoto(s2.base, [arquivo(TESTE[k].foto), ...campos({ peca: `P-9${k}`, camera: "cam-defeito" })]);
        status.push(r.status);
        if (r.status === 429) retry ??= r.cabecalhos["retry-after"];
      }
      const ok201 = status.filter((x) => x === 201).length;
      const ok429 = status.filter((x) => x === 429).length;
      checar("Câmera com defeito: 20 fotos aceitas e o resto 429", ok201 === 20 && ok429 === 4 && status.slice(20).every((x) => x === 429), `com LIMITE_FOTOS_POR_MINUTO=20, das 24 fotos vieram ${ok201} × 201 e ${ok429} × 429 (status: ${status.join(" ")})`);
      checar("O 429 diz quando tentar de novo (Retry-After)", retry !== null && Number(retry) >= 1 && Number(retry) <= 60, `esperava o cabeçalho Retry-After com os segundos (1 a 60); veio ${retry ?? "nenhum"}`);
      const outra = await enviarFoto(s2.base, [arquivo(TESTE[30].foto), ...campos({ peca: "P-8001", camera: "cam-boa" })]);
      checar("As outras câmeras continuam funcionando", outra.status === 201, `uma foto da cam-boa deveria passar (201); veio ${resumoResposta(outra)} — o limite é por câmera`);
    } finally {
      await s2.parar();
    }

    // Os testes do aluno (Vitest): passam todos e são pelo menos TESTES_MINIMOS.
    const saida = join(dir, "vitest.json");
    const t = spawnSync("npx", ["vitest", "run", "--reporter=json", `--outputFile=${saida}`], { cwd: pasta, encoding: "utf8", env: { ...process.env, CI: "1" }, timeout: 180000 });
    let rel = null;
    try {
      rel = JSON.parse(readFileSync(saida, "utf8"));
    } catch {
      rel = null;
    }
    if (checar("npm test roda (Vitest)", rel !== null, `os testes não rodaram: ${(t.stderr || t.stdout || "").split("\n").slice(-8).join("\n")}`)) {
      checar(`Todos os testes passam (${rel.numPassedTests} ok, ${rel.numFailedTests} falhando)`, rel.numFailedTests === 0 && rel.success !== false, "corrija os testes que falham antes de enviar");
      checar(`Pelo menos ${TESTES_MINIMOS} testes (você tem ${rel.numTotalTests})`, rel.numTotalTests >= TESTES_MINIMOS, `escreva mais ${TESTES_MINIMOS - rel.numTotalTests} teste(s) em tests/ — ex.: 415 por assinatura, 409 na revisão, paginação, idempotência, 429`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const ok = checagens.filter((c) => c.ok).length;
  return { passou: ok === checagens.length, resumo: `${ok}/${checagens.length} checagens de métricas, limite e testes`, checagens };
}

export const ETAPAS = {
  1: { titulo: "Contrato REST das fotos", rodar: etapa1 },
  2: { titulo: "O turno pela API", rodar: etapa2 },
  3: { titulo: "SQLite e object storage", rodar: etapa3 },
  4: { titulo: "Métricas, limite e testes", rodar: etapa4 },
};
