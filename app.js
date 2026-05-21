// ============ 数据层 (localStorage) ============

const STORAGE_KEY = 'deepone_wallpaper';
const ADMIN_PASSWORD = 'YSNB';

function loadData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { characters: [], wallpapers: [] };
  } catch { return { characters: [], wallpapers: [] }; }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getCharacters() { return loadData().characters; }
function getWallpapers(characterId) {
  return loadData().wallpapers.filter(w => w.characterId === characterId);
}

// ============ 图片转 base64 ============

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ============ UI 工具 ============

function toast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

function openModal(id) {
  document.getElementById(id).classList.add('active');
}

// ============ 管理员验证 ============

let pendingAction = null;
let pendingData = null;
let adminPwd = '';

function showAdminModal(action, data) {
  pendingAction = action;
  pendingData = data || null;
  adminPwd = '';
  document.getElementById('adminPassword').value = '';
  const titles = {
    character: '新建角色 - 管理员验证',
    wallpaper: '新建壁纸 - 管理员验证',
    deleteChar: '删除角色 - 管理员验证',
    deleteWall: '删除壁纸 - 管理员验证'
  };
  document.getElementById('modalTitle').textContent = titles[action] || '管理员验证';
  openModal('adminModal');
}

function confirmAdmin() {
  const pwd = document.getElementById('adminPassword').value;
  if (!pwd) { toast('请输入密码', 'error'); return; }
  if (pwd !== ADMIN_PASSWORD) { toast('密码错误', 'error'); return; }
  adminPwd = pwd;

  if (pendingAction === 'character') {
    closeModal('adminModal');
    openModal('characterModal');
  } else if (pendingAction === 'wallpaper') {
    closeModal('adminModal');
    openModal('wallpaperModal');
  } else if (pendingAction === 'deleteChar') {
    closeModal('adminModal');
    deleteCharacter(pendingData);
  } else if (pendingAction === 'deleteWall') {
    closeModal('adminModal');
    deleteWallpaper(pendingData);
  }
}

// ============ 首页：角色管理 ============

function searchCharacters() {
  const kw = document.getElementById('searchInput').value.trim().toLowerCase();
  let characters = getCharacters();
  if (kw) characters = characters.filter(c => c.name.toLowerCase().includes(kw));
  renderCharacters(characters);
}

function renderCharacters(characters) {
  const grid = document.getElementById('characterGrid');
  if (!characters || characters.length === 0) {
    grid.innerHTML = '<div class="empty">暂无角色</div>';
    return;
  }
  grid.innerHTML = characters.map(c => `
    <div class="character-card" data-id="${c.id}">
      <button class="delete-btn" data-action="deleteChar" data-id="${c.id}" title="删除角色">&times;</button>
      <img class="avatar" src="${c.avatar || 'default-avatar.svg'}" alt="${esc(c.name)}" onerror="this.src='default-avatar.svg'">
      <div class="name">${esc(c.name)}</div>
    </div>
  `).join('');
}

async function createCharacter() {
  const name = document.getElementById('characterName').value.trim();
  const fileInput = document.getElementById('characterAvatar');
  if (!name) { toast('请输入角色名称', 'error'); return; }
  if (!adminPwd) { toast('请先进行管理员验证', 'error'); return; }

  const data = loadData();
  if (data.characters.some(c => c.name === name)) {
    toast('该角色已存在', 'error');
    return;
  }

  let avatar = null;
  if (fileInput.files[0]) {
    avatar = await fileToDataUrl(fileInput.files[0]);
  }

  const character = {
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
    name,
    avatar,
    createdAt: new Date().toISOString()
  };
  data.characters.push(character);
  saveData(data);

  toast('角色创建成功');
  closeModal('characterModal');
  document.getElementById('characterName').value = '';
  document.getElementById('characterAvatar').value = '';
  adminPwd = '';
  searchCharacters();
}

function deleteCharacter(charId) {
  const data = loadData();
  data.characters = data.characters.filter(c => c.id !== charId);
  data.wallpapers = data.wallpapers.filter(w => w.characterId !== charId);
  saveData(data);
  toast('角色已删除');
  adminPwd = '';
  searchCharacters();
}

function goToCharacter(id) {
  window.location.href = `character.html?id=${id}`;
}

// ============ 壁纸页面 ============

let currentCharacterId = null;

function initCharacterPage() {
  const params = new URLSearchParams(window.location.search);
  currentCharacterId = params.get('id');
  if (!currentCharacterId) {
    document.getElementById('charName').textContent = '无效的角色';
    return;
  }
  const characters = getCharacters();
  const char = characters.find(c => c.id === currentCharacterId);
  if (char) {
    document.getElementById('charName').textContent = char.name;
    const avatarEl = document.getElementById('charAvatar');
    avatarEl.src = char.avatar || 'default-avatar.svg';
    avatarEl.onerror = () => { avatarEl.src = 'default-avatar.svg'; };
  }
  loadWallpapers();
}

function loadWallpapers() {
  const wallpapers = getWallpapers(currentCharacterId);
  renderWallpapers(wallpapers);
}

function searchWallpapers() {
  const kw = document.getElementById('wallpaperSearch').value.trim().toLowerCase();
  let wallpapers = getWallpapers(currentCharacterId);
  if (kw) wallpapers = wallpapers.filter(w => w.wallpaperId.toLowerCase().includes(kw));
  renderWallpapers(wallpapers);
}

function renderWallpapers(wallpapers) {
  const grid = document.getElementById('wallpaperGrid');
  if (!wallpapers || wallpapers.length === 0) {
    grid.innerHTML = '<div class="empty">暂无壁纸</div>';
    return;
  }
  grid.innerHTML = wallpapers.map(w => `
    <div class="wallpaper-card">
      <img class="wp-image" src="${w.image || 'default-avatar.svg'}" alt="壁纸 #${esc(w.wallpaperId)}" data-link="${esc(w.link)}" onerror="this.src='default-avatar.svg'">
      <div class="wp-footer">
        <span class="wp-id">#${esc(w.wallpaperId)}</span>
        <button class="delete-btn" data-action="deleteWall" data-id="${w.id}" title="删除壁纸">&times;</button>
      </div>
    </div>
  `).join('');
}

// ============ 壁纸 CRUD ============

async function createWallpaper() {
  const wallpaperId = document.getElementById('wallpaperId').value.trim();
  const link = document.getElementById('wallpaperLink').value.trim();
  const fileInput = document.getElementById('wallpaperImage');
  if (!wallpaperId) { toast('请输入壁纸编号', 'error'); return; }
  if (!link) { toast('请输入下载链接', 'error'); return; }
  if (!adminPwd) { toast('请先进行管理员验证', 'error'); return; }

  let image = null;
  if (fileInput.files[0]) {
    image = await fileToDataUrl(fileInput.files[0]);
  }

  const data = loadData();
  const wallpaper = {
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
    characterId: currentCharacterId,
    wallpaperId,
    link,
    image,
    createdAt: new Date().toISOString()
  };
  data.wallpapers.push(wallpaper);
  saveData(data);

  toast('壁纸创建成功');
  closeModal('wallpaperModal');
  document.getElementById('wallpaperId').value = '';
  document.getElementById('wallpaperLink').value = '';
  document.getElementById('wallpaperImage').value = '';
  adminPwd = '';
  loadWallpapers();
}

function deleteWallpaper(wpId) {
  const data = loadData();
  data.wallpapers = data.wallpapers.filter(w => w.id !== wpId);
  saveData(data);
  toast('壁纸已删除');
  adminPwd = '';
  loadWallpapers();
}

// ============ 事件代理 ============

document.addEventListener('click', e => {
  // 角色卡片点击跳转
  const card = e.target.closest('.character-card');
  if (card) {
    goToCharacter(card.dataset.id);
    return;
  }

  // 壁纸图片点击下载
  const img = e.target.closest('.wp-image');
  if (img) {
    const link = img.dataset.link;
    if (link) {
      const a = document.createElement('a');
      a.href = link;
      a.target = '_blank';
      a.rel = 'noopener';
      a.click();
    }
    return;
  }

  // 删除按钮
  const del = e.target.closest('[data-action="deleteChar"]');
  if (del) {
    e.stopPropagation();
    showAdminModal('deleteChar', del.dataset.id);
    return;
  }
  const delw = e.target.closest('[data-action="deleteWall"]');
  if (delw) {
    e.stopPropagation();
    showAdminModal('deleteWall', delw.dataset.id);
    return;
  }
});

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============ 页面初始化 ============

if (window.location.pathname.endsWith('character.html')) {
  document.addEventListener('DOMContentLoaded', initCharacterPage);
} else {
  document.addEventListener('DOMContentLoaded', searchCharacters);
}
