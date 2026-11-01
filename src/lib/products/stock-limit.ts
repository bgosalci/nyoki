/**
 * Whether a piece can be ordered in any number, whatever its stock says.
 *
 * Made to order is never held in stock, and shoppers are told so, with how
 * long it takes. Made on order is held in stock - often only a little, of
 * things quick to make - and made again when it runs out: 0 is not out of
 * stock, and shoppers are told nothing different.
 */
export function neverRunsOut(piece: { madeToOrder: boolean; madeOnOrder: boolean }): boolean {
  return piece.madeToOrder || piece.madeOnOrder;
}
