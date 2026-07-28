// Helper for sending image + caption messages, and swapping images on button navigation.
// Images can come from: a public URL, a local file in src/assets, or a cached Telegram file_id
// (file_id is fastest since Telegram already has the file - store it after first upload).

const path = require('path');

const ASSET_DIR = path.join(__dirname, '..', 'assets');

// Map of logical image keys -> source. Swap these for your real art/banners.
const IMAGES = {
  welcome_banner: path.join(ASSET_DIR, 'welcome_banner.png'),
  profile_banner: path.join(ASSET_DIR, 'profile_banner.png'),
  market_banner: path.join(ASSET_DIR, 'market_banner.png'),
  explore_banner: path.join(ASSET_DIR, 'explore_banner.png')
};

async function sendImageMessage(ctx, imageKey, caption, extra = {}) {
  const source = IMAGES[imageKey];
  if (!source) {
    // Fallback to plain text if no image configured yet
    return ctx.reply(caption, extra);
  }
  try {
    return await ctx.replyWithPhoto({ source }, { caption, parse_mode: 'HTML', ...extra });
  } catch (err) {
    // If the asset file doesn't exist yet, don't crash the bot - fall back to text
    return ctx.reply(caption, extra);
  }
}

// For editing an existing message's image (e.g. paginated item catalog)
async function editImageMessage(ctx, imageKey, caption, extra = {}) {
  const source = IMAGES[imageKey];
  if (!source) return ctx.editMessageCaption(caption, extra);
  try {
    return await ctx.editMessageMedia(
      { type: 'photo', media: { source }, caption, parse_mode: 'HTML' },
      extra
    );
  } catch (err) {
    return ctx.editMessageCaption(caption, extra);
  }
}

module.exports = { sendImageMessage, editImageMessage, IMAGES };
