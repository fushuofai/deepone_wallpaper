// ============ 数据加载 ============

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`加载 ${path} 失败 (${res.status})`);
  return res.json();
}

async function getCharacters() {
  try {
    const data = await loadJSON('def/character.json');
    return Array.isArray(data) ? data : [data];
  } catch (e) {
    console.error(e);
    return [];
  }
}

async function getWallpapers() {
  try {
    const data = await loadJSON('def/wallpaper.json');
    return data.wallpaper_list || [];
  } catch (e) {
    console.error(e);
    return [];
  }
}

function getCharFolder(id) {
  return String(id).padStart(2, '0');
}

function getCharAvatarPath(charId) {
  const f = getCharFolder(charId);
  return `10/${f}/10${f}16.png`;
}

function getWallpaperImagePath(wallpaperId, ext) {
  const f = wallpaperId.substring(2, 4);
  return `10/${f}/${wallpaperId}.${ext}`;
}

function getCharIdFromWallpaperId(wallpaperId) {
  return parseInt(wallpaperId.substring(2, 4), 10);
}

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============ Toast ============

function toast(msg, type = 'info') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

// ============ 首页：角色列表 ============

let allCharacters = [];
let allWallpapers = [];

async function initMainPage() {
  allCharacters = await getCharacters();
  allWallpapers = await getWallpapers();
  renderCharacters(allCharacters);
}

function handleSearch() {
  const kw = document.getElementById('searchInput').value.trim().toLowerCase();
  if (!kw) {
    renderCharacters(allCharacters);
    return;
  }

  // 检查是否是壁纸编号搜索（6位数字，以10开头）
  if (/^10\d{4}$/.test(kw)) {
    const charId = getCharIdFromWallpaperId(kw);
    const char = allCharacters.find(c => c.id === charId);
    if (char) {
      window.location.href = `character.html?id=${char.id}&search=${kw}`;
      return;
    }
    toast('未找到该壁纸对应的角色', 'error');
    return;
  }

  // 按角色名称搜索
  const filtered = allCharacters.filter(c =>
    c.name.toLowerCase().includes(kw) ||
    String(c.id).includes(kw)
  );
  renderCharacters(filtered);
  if (filtered.length === 0) {
    toast('未找到匹配的角色', 'error');
  }
}

function renderCharacters(characters) {
  const grid = document.getElementById('characterGrid');
  if (!characters || characters.length === 0) {
    grid.innerHTML = '<div class="empty">暂无角色</div>';
    return;
  }
  grid.innerHTML = characters.map(c => `
    <div class="character-card" data-id="${c.id}">
      <img class="avatar" src="${getCharAvatarPath(c.id)}" alt="${esc(c.name)}" onerror="this.src='default-avatar.svg'">
      <div class="name">${esc(c.name)}</div>
    </div>
  `).join('');
}

// ============ 壁纸页面 ============

let currentCharId = null;

async function initCharacterPage() {
  const params = new URLSearchParams(window.location.search);
  currentCharId = params.get('id');
  if (!currentCharId) {
    document.getElementById('charName').textContent = '无效的角色';
    return;
  }

  const characters = await getCharacters();
  const char = characters.find(c => String(c.id) === currentCharId);
  if (char) {
    document.getElementById('charName').textContent = char.name;
    const avatarEl = document.getElementById('charAvatar');
    avatarEl.src = getCharAvatarPath(char.id);
    avatarEl.onerror = () => { avatarEl.src = 'default-avatar.svg'; };
  } else {
    document.getElementById('charName').textContent = '角色不存在';
  }

  await loadWallpapers();

  // 如果 URL 带了搜索参数，自动填入并搜索
  const searchKw = params.get('search');
  if (searchKw) {
    document.getElementById('wallpaperSearch').value = searchKw;
    searchWallpapers();
  }
}

async function loadWallpapers() {
  allWallpapers = await getWallpapers();
  const f = getCharFolder(parseInt(currentCharId));
  const charWallpapers = allWallpapers.filter(w => w.wallpaper_id.substring(2, 4) === f);
  renderWallpapers(charWallpapers);
}

function searchWallpapers() {
  const kw = document.getElementById('wallpaperSearch').value.trim().toLowerCase();
  const all = allWallpapers.length > 0
    ? allWallpapers
    : [];

  // 懒加载壁纸数据（如果还没加载）
  if (all.length === 0) {
    getWallpapers().then(wps => {
      allWallpapers = wps;
      searchWallpapers();
    });
    return;
  }

  const f = getCharFolder(parseInt(currentCharId));
  let filtered = all.filter(w => w.wallpaper_id.substring(2, 4) === f);
  if (kw) {
    filtered = filtered.filter(w => w.wallpaper_id.toLowerCase().includes(kw));
  }
  renderWallpapers(filtered);
}

function renderWallpapers(wallpapers) {
  const grid = document.getElementById('wallpaperGrid');
  if (!wallpapers || wallpapers.length === 0) {
    grid.innerHTML = '<div class="empty">暂无壁纸</div>';
    return;
  }
  grid.innerHTML = wallpapers.map(w => {
    const hasLink = w.link && w.link !== 'None';
    const imgSrc = getWallpaperImagePath(w.wallpaper_id, 'png');
    return `
      <div class="wallpaper-card${hasLink ? '' : ' no-link'}">
        <div class="wp-image-wrapper">
          <img class="wp-image${hasLink ? '' : ' gray'}" src="${imgSrc}" alt="壁纸 #${esc(w.wallpaper_id)}" data-link="${esc(w.link)}" data-id="${esc(w.wallpaper_id)}" onerror="tryWallpaperExt(this)">
          ${hasLink ? '' : '<div class="no-link-overlay">暂无下载</div>'}
        </div>
        <div class="wp-footer">
          <span class="wp-id">#${esc(w.wallpaper_id)}</span>
        </div>
      </div>
    `;
  }).join('');
}

function tryWallpaperExt(img) {
  const id = img.dataset.id;
  const f = id.substring(2, 4);
  if (!img.dataset.tried) {
    img.dataset.tried = 'png';
    img.src = `10/${f}/${id}.jpg`;
  } else if (img.dataset.tried === 'png') {
    img.dataset.tried = 'jpg';
    img.src = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 9%22><rect fill=%22%23e8e8ed%22 width=%2216%22 height=%229%22/></svg>`;
    img.classList.add('img-missing');
  }
}

// ============ 文件下载（解决手机 .lpk 变 .zip 的问题） ============

async function downloadFile(url) {
  try {
    const filename = url.split('/').pop() || 'download';
    const res = await fetch(url);
    if (!res.ok) throw new Error('下载失败');
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  } catch (e) {
    // fallback: 如果 CORS 限制导致 blob 下载失败，直接开新窗口
    window.open(url, '_blank');
  }
}

// ============ 事件处理 ============

document.addEventListener('click', e => {
  // 点击角色卡片
  const card = e.target.closest('.character-card');
  if (card) {
    window.location.href = `character.html?id=${card.dataset.id}`;
    return;
  }

  // 点击壁纸图片
  const img = e.target.closest('.wp-image');
  if (img) {
    const link = img.dataset.link;
    const id = img.dataset.id;
    if (link && link !== 'None') {
      downloadFile(link);
    } else {
      toast(`壁纸 #${id}：管理员还未导入壁纸`, 'info');
    }
    return;
  }
});

// ============ 页面初始化 ============

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.endsWith('character.html')) {
    initCharacterPage();
  } else {
    initMainPage();
  }
});
