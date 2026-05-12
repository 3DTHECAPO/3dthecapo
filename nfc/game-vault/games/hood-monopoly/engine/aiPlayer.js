/* PLAY 3D · Hood Monopoly — AI player logic */
window.HM = window.HM || {};
HM.aiShouldBuy = (state, player, tileIndex, difficulty) => {
  const tile = HM.BOARD[tileIndex];
  if (!tile.price) return false;
  if (player.cash < tile.price) return false;
  const reserve = difficulty === 'easy' ? 400 : difficulty === 'medium' ? 250 : 100;
  if (player.cash - tile.price < reserve) return false;
  if (difficulty === 'aggressive') return true;
  if (difficulty === 'medium') {
    if (tile.type === 'property' && tile.price <= player.cash * 0.55) return true;
    if (tile.type === 'transit' && player.cash > 350) return true;
    if (tile.type === 'utility' && player.cash > 500) return true;
    return tile.price <= 200;
  }
  return Math.random() < 0.55;
};
