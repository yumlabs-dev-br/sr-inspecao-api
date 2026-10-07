import { CUSTO, type Destino, type Ia } from "../domain/foto.ts";

/**
 * Para onde vai a peça — Etapa 2. Prejuízo ESPERADO de cada destino:
 *   caixa   = trinca × 40 + mancha × 10   (o defeito chega ao cliente)
 *   refugo  = (1 − trinca − mancha) × 6   (a chance de jogar fora uma peça boa)
 *   revisão = 3                           (o tempo do supervisor, que acerta)
 */
export class DecisaoService {
  decidir(ia: Ia): Destino {
    // Por enquanto (Etapa 1), tudo vai para a caixa.
    // TODO Etapa 2: calcule os três prejuízos com CUSTO e devolva o destino de menor prejuízo.
    void CUSTO;
    void ia;
    return "caixa";
  }
}
