const { Markup } = require('telegraf');

function mainMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('👤 Profile', 'menu:profile'), Markup.button.callback('🎒 Inventory', 'menu:inventory')],
    [Markup.button.callback('🌍 Explore', 'menu:explore'), Markup.button.callback('🏪 Market', 'menu:market')],
    [Markup.button.callback('⚙️ Settings', 'menu:settings')]
  ]);
}

function backRow(target = 'menu:main') {
  return [Markup.button.callback('⬅️ Back', target), Markup.button.callback('🏠 Main menu', 'menu:main')];
}

function explorePad() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('⬆️', 'move:up')],
    [Markup.button.callback('⬅️', 'move:left'), Markup.button.callback('📍', 'explore:here'), Markup.button.callback('➡️', 'move:right')],
    [Markup.button.callback('⬇️', 'move:down')],
    backRow()
  ]);
}

function marketCategoryRow() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('⚔️ Weapons', 'market:cat:weapon'), Markup.button.callback('📦 Resources', 'market:cat:resource')],
    backRow()
  ]);
}

function itemBuyButton(itemKey) {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🛒 Buy', `market:buy:${itemKey}`)],
    backRow('menu:market')
  ]);
}

module.exports = { mainMenu, backRow, explorePad, marketCategoryRow, itemBuyButton };
