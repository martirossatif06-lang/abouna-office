// ==========================================
// ADMIN DASHBOARD JAVASCRIPT ENGINE
// ==========================================

const token = localStorage.getItem('office_admin_token');
if (!token) {
  window.location.href = '/login';
}

// Global Headers with Bearer Token
const authHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};

// State
let currentSectionsData = {};
let currentActiveSectionKey = 'bio';

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  setupLogout();
  setupSettingsForm();
  setupPasswordForm();
  setupMediaUploader();
  setupSectionSelector();
  setupItemModal();

  // Load Initial Data
  await loadDashboardData();
});

// Tab Navigation
function setupTabs() {
  const tabs = document.querySelectorAll('.sidebar-tab-btn[data-tab]');
  const panels = document.querySelectorAll('.tab-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      document.getElementById(`tab-${target}`).classList.add('active');
    });
  });
}

// Logout
function setupLogout() {
  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('office_admin_token');
    localStorage.removeItem('office_admin_user');
    window.location.href = '/login';
  });
}

// ==========================================
// LOAD DATA FROM APIS
// ==========================================
async function loadDashboardData() {
  try {
    await Promise.all([
      loadSettings(),
      loadSceneItems(),
      loadSections(),
      loadMessages(),
      loadMedia()
    ]);
  } catch (err) {
    console.error('Error loading dashboard:', err);
    if (err.status === 401) {
      localStorage.removeItem('office_admin_token');
      window.location.href = '/login';
    }
  }
}

// 1. Settings
async function loadSettings() {
  const res = await fetch('/api/admin/settings', { headers: authHeaders });
  if (res.status === 401) return handleAuthError();
  const data = await res.json();

  if (data.success && data.settings) {
    const s = data.settings;
    document.getElementById('set-office-title').value = s.office_title || '';
    document.getElementById('set-office-subtitle').value = s.office_subtitle || '';
    document.getElementById('set-bio').value = s.bio || '';
    document.getElementById('set-default-mode').value = s.default_mode || 'day';
    document.getElementById('set-contact-email').value = s.contact_email || '';
    document.getElementById('set-contact-phone').value = s.contact_phone || '';

    if (s.social_links) {
      document.getElementById('set-social-fb').value = s.social_links.facebook || '';
      document.getElementById('set-social-yt').value = s.social_links.youtube || '';
      document.getElementById('set-social-tg').value = s.social_links.telegram || '';
      document.getElementById('set-social-wa').value = s.social_links.whatsapp || '';
    }
  }
}

function setupSettingsForm() {
  const form = document.getElementById('settings-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = form.querySelector('button[type="submit"]');
    saveBtn.disabled = true;
    saveBtn.textContent = 'جاري الحفظ... ⏳';

    const payload = {
      office_title: document.getElementById('set-office-title').value,
      office_subtitle: document.getElementById('set-office-subtitle').value,
      bio: document.getElementById('set-bio').value,
      default_mode: document.getElementById('set-default-mode').value,
      contact_email: document.getElementById('set-contact-email').value,
      contact_phone: document.getElementById('set-contact-phone').value,
      social_links: {
        facebook: document.getElementById('set-social-fb').value,
        youtube: document.getElementById('set-social-yt').value,
        telegram: document.getElementById('set-social-tg').value,
        whatsapp: document.getElementById('set-social-wa').value
      }
    };

    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    saveBtn.disabled = false;
    saveBtn.textContent = 'حفظ التغييرات ✔';
    showToast(result.message || 'تم حفظ الإعدادات');
  });
}

function setupPasswordForm() {
  const form = document.getElementById('password-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cur = document.getElementById('cur-password').value;
    const next = document.getElementById('new-password').value;

    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ currentPassword: cur, newPassword: next })
    });
    const result = await res.json();
    if (result.success) {
      showToast('تم تغيير كلمة المرور بنجاح');
      form.reset();
    } else {
      showToast(result.error || 'فشل التغيير', true);
    }
  });
}

// 2. Scene Items
async function loadSceneItems() {
  const res = await fetch('/api/admin/scene-items', { headers: authHeaders });
  if (res.status === 401) return handleAuthError();
  const data = await res.json();

  if (data.success && data.items) {
    const tbody = document.getElementById('scene-items-tbody');
    tbody.innerHTML = data.items.map(item => `
      <tr>
        <td><strong>${item.name}</strong></td>
        <td><code>${item.id}</code></td>
        <td><span class="status-pill status-active">${item.target_section}</span></td>
        <td>${item.tooltip}</td>
        <td>
          <button class="status-pill ${item.is_active ? 'status-active' : 'status-inactive'}" 
                  onclick="toggleSceneItem('${item.id}', ${!item.is_active})" style="cursor: pointer; border: none;">
            ${item.is_active ? 'مفعّل ✔' : 'معطّل ✖'}
          </button>
        </td>
      </tr>
    `).join('');

    document.getElementById('stat-scene-items').textContent = data.items.filter(i => i.is_active).length;
  }
}

async function toggleSceneItem(id, newState) {
  await fetch(`/api/admin/scene-items/${id}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({ is_active: newState })
  });
  loadSceneItems();
  showToast('تم تحديث حالة العنصر');
}

// 3. Content Sections
async function loadSections() {
  const res = await fetch('/api/admin/sections', { headers: authHeaders });
  if (res.status === 401) return handleAuthError();
  const data = await res.json();

  if (data.success && data.sections) {
    currentSectionsData = data.sections;
    renderCurrentSectionItems();

    // Calculate total projects
    let totalItems = 0;
    for (const k in data.sections) {
      totalItems += (data.sections[k].items || []).length;
    }
    document.getElementById('stat-total-items').textContent = totalItems;
  }
}

function setupSectionSelector() {
  const select = document.getElementById('section-select');
  select.addEventListener('change', (e) => {
    currentActiveSectionKey = e.target.value;
    renderCurrentSectionItems();
  });
}

function renderCurrentSectionItems() {
  const section = currentSectionsData[currentActiveSectionKey];
  const tbody = document.getElementById('content-items-tbody');

  if (!section || !section.items || section.items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 30px;">لا توجد عناصر في هذا القسم حتى الآن. اضغط "إضافة عنصر جديد" للبدء.</td></tr>`;
    return;
  }

  tbody.innerHTML = section.items.map(item => `
    <tr>
      <td><strong>${item.title}</strong></td>
      <td>${item.category || '-'}</td>
      <td><span class="status-pill status-active">${item.badge || 'عادي'}</span></td>
      <td>
        <button class="status-pill ${item.is_active ? 'status-active' : 'status-inactive'}" 
                onclick="toggleContentItemActive('${item.id}', ${!item.is_active})" style="cursor: pointer; border: none;">
          ${item.is_active ? 'ظاهر' : 'مخفي'}
        </button>
      </td>
      <td>
        <button class="action-icon-btn" onclick="openEditItemModal('${item.id}')" title="تعديل">✏️</button>
        <button class="action-icon-btn delete" onclick="deleteContentItem('${item.id}')" title="حذف">🗑️</button>
      </td>
    </tr>
  `).join('');
}

async function toggleContentItemActive(id, newState) {
  await fetch(`/api/admin/sections/${currentActiveSectionKey}/items/${id}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({ is_active: newState })
  });
  loadSections();
  showToast('تم تحديث ظهور العنصر');
}

async function deleteContentItem(id) {
  if (!confirm('هل أنت متأكد من حذف هذا العنصر؟')) return;

  await fetch(`/api/admin/sections/${currentActiveSectionKey}/items/${id}`, {
    method: 'DELETE',
    headers: authHeaders
  });
  loadSections();
  showToast('تم حذف العنصر بنجاح');
}

// Item Modal (Add & Edit)
function setupItemModal() {
  const modal = document.getElementById('item-edit-modal');
  const form = document.getElementById('item-edit-form');
  const addBtn = document.getElementById('add-new-item-btn');
  const closeBtn = document.getElementById('item-modal-close');

  addBtn.addEventListener('click', () => {
    document.getElementById('item-modal-title').textContent = 'إضافة عنصر جديد';
    document.getElementById('edit-item-id').value = '';
    form.reset();
    modal.style.display = 'flex';
  });

  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const itemId = document.getElementById('edit-item-id').value;
    const isEdit = !!itemId;

    const tagsRaw = document.getElementById('item-tags').value;
    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

    const payload = {
      title: document.getElementById('item-title').value,
      category: document.getElementById('item-category').value,
      badge: document.getElementById('item-badge').value,
      desc: document.getElementById('item-desc').value,
      action_text: document.getElementById('item-action-text').value,
      file_url: document.getElementById('item-file-url').value,
      book_color: document.getElementById('item-book-color').value,
      tags
    };

    const url = isEdit
      ? `/api/admin/sections/${currentActiveSectionKey}/items/${itemId}`
      : `/api/admin/sections/${currentActiveSectionKey}/items`;
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: authHeaders,
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (result.success) {
      modal.style.display = 'none';
      loadSections();
      showToast(result.message || 'تم حفظ العنصر بنجاح');
    } else {
      showToast(result.error || 'حدث خطأ', true);
    }
  });
}

function openEditItemModal(id) {
  const section = currentSectionsData[currentActiveSectionKey];
  const item = section.items.find(i => i.id === id);
  if (!item) return;

  document.getElementById('item-modal-title').textContent = 'تعديل العنصر';
  document.getElementById('edit-item-id').value = item.id;
  document.getElementById('item-title').value = item.title || '';
  document.getElementById('item-category').value = item.category || '';
  document.getElementById('item-badge').value = item.badge || '';
  document.getElementById('item-desc').value = item.desc || '';
  document.getElementById('item-action-text').value = item.action_text || '';
  document.getElementById('item-file-url').value = item.file_url || '';
  document.getElementById('item-book-color').value = item.book_color || '#8b4513';
  document.getElementById('item-tags').value = (item.tags || []).join(', ');

  document.getElementById('item-edit-modal').style.display = 'flex';
}

// 4. Messages / Inbox
async function loadMessages() {
  const res = await fetch('/api/admin/messages', { headers: authHeaders });
  if (res.status === 401) return handleAuthError();
  const data = await res.json();

  if (data.success && data.messages) {
    const tbody = document.getElementById('messages-tbody');
    const unreadCount = data.messages.filter(m => !m.is_read).length;

    document.getElementById('stat-unread-messages').textContent = unreadCount;
    document.getElementById('sidebar-inbox-badge').textContent = unreadCount;

    if (data.messages.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 30px;">صندوق الرسائل فارغ حالياً.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.messages.map(msg => `
      <tr style="${!msg.is_read ? 'background: rgba(217, 119, 6, 0.05); font-weight: bold;' : ''}">
        <td>${msg.name}</td>
        <td>
          <div>${msg.email || '-'}</div>
          <small style="color: #64748b;">${msg.phone || ''}</small>
        </td>
        <td>${msg.subject || '-'}</td>
        <td style="max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${msg.content}
        </td>
        <td>${new Date(msg.created_at).toLocaleDateString('ar-EG')}</td>
        <td>
          <button class="action-icon-btn" onclick="toggleMessageRead('${msg.id}', ${!msg.is_read})" title="${msg.is_read ? 'تحديد كغير مقروء' : 'تحديد كمقروء'}">
            ${msg.is_read ? '✉️' : '📩'}
          </button>
          <button class="action-icon-btn delete" onclick="deleteMessage('${msg.id}')" title="حذف">🗑️</button>
        </td>
      </tr>
    `).join('');
  }
}

async function toggleMessageRead(id, newState) {
  await fetch(`/api/admin/messages/${id}/read`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({ is_read: newState })
  });
  loadMessages();
}

async function deleteMessage(id) {
  if (!confirm('حذف هذه الرسالة؟')) return;
  await fetch(`/api/admin/messages/${id}`, {
    method: 'DELETE',
    headers: authHeaders
  });
  loadMessages();
  showToast('تم حذف الرسالة');
}

// 5. Media Library & Upload
function setupMediaUploader() {
  const dropzone = document.getElementById('media-dropzone');
  const fileInput = document.getElementById('media-file-input');

  dropzone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    if (fileInput.files.length === 0) return;
    const file = fileInput.files[0];
    await uploadFile(file);
    fileInput.value = '';
  });
}

async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  try {
    showToast('جاري رفع الملف... ⏳');
    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    const result = await res.json();
    if (result.success) {
      showToast('تم رفع الملف بنجاح ✔');
      loadMedia();
    } else {
      showToast(result.error || 'فشل الرفع', true);
    }
  } catch (err) {
    showToast('حدث خطأ أثناء الرفع', true);
  }
}

async function loadMedia() {
  const res = await fetch('/api/admin/media', { headers: authHeaders });
  if (res.status === 401) return handleAuthError();
  const data = await res.json();

  if (data.success && data.media) {
    const grid = document.getElementById('media-grid');
    if (data.media.length === 0) {
      grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 20px;">لم يتم رفع أي ملفات بعد. يمكنك رفع ملفات PDF أو صور للمشاريع من هنا.</p>`;
      return;
    }

    grid.innerHTML = data.media.map(item => {
      const isImg = item.mimetype && item.mimetype.startsWith('image/');
      const preview = isImg ? `<img src="${item.url}" alt="${item.name}" />` : `📄`;

      return `
        <div class="media-item-card">
          <div class="media-preview-box">${preview}</div>
          <div class="media-footer">
            <span style="max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${item.name}">
              ${item.name}
            </span>
            <div>
              <button class="action-icon-btn" onclick="copyToClipboard('${item.url}')" title="نسخ الرابط">📋</button>
              <button class="action-icon-btn delete" onclick="deleteMedia('${item.id}')" title="حذف">🗑️</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
}

async function deleteMedia(id) {
  if (!confirm('حذف هذا الملف نهائياً؟')) return;
  await fetch(`/api/admin/media/${id}`, {
    method: 'DELETE',
    headers: authHeaders
  });
  loadMedia();
  showToast('تم حذف الملف');
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
  showToast('تم نسخ رابط الملف إلى الحافظة ✔');
}

// Toast Notification
function showToast(msg, isError = false) {
  let toast = document.getElementById('admin-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'admin-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 24px;
      background: #1e293b;
      color: #fff;
      padding: 12px 24px;
      border-radius: 12px;
      font-weight: 700;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      z-index: 9999;
      transition: all 0.3s ease;
      transform: translateY(100px);
      opacity: 0;
    `;
    document.body.appendChild(toast);
  }

  toast.style.background = isError ? '#ef4444' : '#15803d';
  toast.textContent = msg;
  toast.style.transform = 'translateY(0)';
  toast.style.opacity = '1';

  setTimeout(() => {
    toast.style.transform = 'translateY(100px)';
    toast.style.opacity = '0';
  }, 3200);
}

function handleAuthError() {
  localStorage.removeItem('office_admin_token');
  window.location.href = '/login';
}

window.toggleSceneItem = toggleSceneItem;
window.toggleContentItemActive = toggleContentItemActive;
window.deleteContentItem = deleteContentItem;
window.openEditItemModal = openEditItemModal;
window.toggleMessageRead = toggleMessageRead;
window.deleteMessage = deleteMessage;
window.copyToClipboard = copyToClipboard;
window.deleteMedia = deleteMedia;
