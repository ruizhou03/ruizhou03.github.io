(() => {
  'use strict';

  const RANK_LABELS = Object.freeze(['2','3','4','5','6','7','8','9','10','J','Q','K','A']);
  const LEVEL_SEQ = RANK_LABELS;
  const T = Object.freeze({
    SINGLE: 'single',
    PAIR: 'pair',
    TRIPLE: 'triple',
    TRIPLE_PAIR: 'triple_pair',
    PAIR_STR: 'pair_str',
    TRIPLE_STR: 'triple_str',
    STRAIGHT: 'straight',
    BOMB: 'bomb',
    STR_FLUSH: 'str_flush',
    JOKER_BOMB: 'joker_bomb',
  });

  function isJoker(card) {
    const normalized = card % 54;
    return normalized === 52 || normalized === 53;
  }

  function jokerKind(card) {
    return (card % 54) === 53 ? 'big' : 'small';
  }

  function cardDeck(card) {
    return Math.floor(card / 54);
  }

  function cardSuit(card) {
    return Math.floor((card % 54) / 13);
  }

  function cardRankIdx(card) {
    return (card % 54) % 13;
  }

  function singleWeight(card, level) {
    if (isJoker(card)) return jokerKind(card) === 'big' ? 17 : 16;
    const rank = cardRankIdx(card);
    return RANK_LABELS[rank] === level ? 15 : rank + 2;
  }

  function isWild(card, level) {
    return !isJoker(card) &&
      cardSuit(card) === 1 &&
      RANK_LABELS[cardRankIdx(card)] === level;
  }

  function columnKey(card, level) {
    return isWild(card, level) ? 15.5 : singleWeight(card, level);
  }

  function straightPoint(card) {
    return cardRankIdx(card) + 2;
  }

  function rankIdxWeight(rank, level) {
    return RANK_LABELS[rank] === level ? 15 : rank + 2;
  }

  function bombStrengthN(size, rankWeight) {
    if (size === 4) return 100 + rankWeight;
    if (size === 5) return 200 + rankWeight;
    return (size - 1) * 100 + rankWeight;
  }

  function isBombType(type) {
    return type === T.BOMB || type === T.STR_FLUSH || type === T.JOKER_BOMB;
  }

  function bombMultiplierFor(combo) {
    if (!combo) return 1;
    if (combo.type === T.JOKER_BOMB) return 8;
    if (combo.type === T.STR_FLUSH) return 4;
    if (combo.type !== T.BOMB) return 1;
    const size = combo.len | 0;
    if (size === 4) return 2;
    if (size === 5) return 3;
    if (size === 6) return 4;
    if (size === 7) return 5;
    return 6;
  }

  window.GuandanRules = Object.freeze({
    rulesVersion: window.GuandanContract.rulesVersion,
    RANK_LABELS,
    LEVEL_SEQ,
    T,
    isJoker,
    jokerKind,
    cardDeck,
    cardSuit,
    cardRankIdx,
    singleWeight,
    isWild,
    columnKey,
    straightPoint,
    rankIdxWeight,
    bombStrengthN,
    isBombType,
    bombMultiplierFor,
  });
})();
