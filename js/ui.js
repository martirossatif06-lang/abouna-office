// ==========================================
// CLIENT UI, SEARCH & CARDS VIEW CONTROLLER
// ==========================================

class UIController {
  constructor() {
    this.tooltipEl = document.getElementById('tooltip-3d');
    this.modalBackdrop = document.getElementById('modal-backdrop');
    this.modalTitle = document.getElementById('modal-title');
    this.modalSubtitle = document.getElementById('modal-subtitle');
    this.modalBody = document.getElementById('modal-body');
    this.resetBtn = document.getElementById('reset-view-btn');
    this.themeToggleBtn = document.getElementById('theme-toggle-btn');
    this.soundToggleBtn = document.getElementById('sound-toggle-btn');

    // Search elements
    this.searchInput = document.getElementById('office-search-input');
    this.clearSearchBtn = document.getElementById('clear-search-btn');
    this.searchResultsDropdown = document.getElementById('search-results-dropdown');

    // Cards View elements
    this.viewModeToggleBtn = document.getElementById('view-mode-toggle');
    this.viewModeIcon = document.getElementById('view-mode-icon');
    this.viewModeText = document.getElementById('view-mode-text');
    this.cardsViewContainer = document.getElementById('cards-view-container');
    this.closeCardsViewBtn = document.getElementById('close-cards-view-btn');
    this.cardsCategoryTabs = document.getElementById('cards-category-tabs');
    this.cardsItemsList = document.getElementById('cards-items-list');

    this.siteData = null;
    this.activeSection = null;
    this.isCardsViewActive = false;

    this.init();
  }

  async init() {
    this.siteData = await window.API.getPublicData();
    if (this.siteData) {
      this.applySettings(this.siteData.settings);
      this.setupSearch();
      this.setupCardsView();
    }

    // Modal Close & Minimize
    document.getElementById('modal-close-btn').addEventListener('click', () => {
      this.closeModal();
    });
    const minBtn = document.getElementById('modal-minimize-btn');
    if (minBtn) {
      minBtn.addEventListener('click', () => {
        this.closeModal();
      });
    }

    this.modalBackdrop.addEventListener('click', (e) => {
      if (e.target === this.modalBackdrop) this.closeModal();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
        this.closeSearchResults();
        if (this.isCardsViewActive) this.toggleCardsView(false);
      }
    });

    // Reset View
    this.resetBtn.addEventListener('click', () => {
      if (window.officeScene) {
        window.officeScene.resetCameraOverview();
      }
    });

    // Theme Toggle
    this.themeToggleBtn.addEventListener('click', () => {
      if (window.officeScene) {
        window.officeScene.toggleDayNight();
      }
    });

    // Sound Toggle
    this.soundToggleBtn.addEventListener('click', () => {
      if (window.officeScene) {
        window.officeScene.audioEnabled = !window.officeScene.audioEnabled;
        this.soundToggleBtn.textContent = window.officeScene.audioEnabled ? '🔊' : '🔇';
      }
    });

    // View Switcher (3D vs Cards)
    this.viewModeToggleBtn.addEventListener('click', () => {
      this.toggleCardsView(!this.isCardsViewActive);
    });

    this.closeCardsViewBtn.addEventListener('click', () => {
      this.toggleCardsView(false);
    });

    this.setupQuickNav();
  }

  applySettings(settings) {
    if (!settings) return;
    if (settings.office_title) {
      document.getElementById('brand-title').textContent = settings.office_title;
    }
    if (settings.office_subtitle) {
      document.getElementById('brand-subtitle').textContent = settings.office_subtitle;
    }
    if (settings.default_mode && window.officeScene) {
      window.officeScene.toggleDayNight(settings.default_mode);
    }
  }

  setupQuickNav() {
    const navButtons = document.querySelectorAll('.nav-btn[data-section]');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const sectionKey = btn.dataset.section;
        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (this.isCardsViewActive) {
          this.filterCardsByCategory(sectionKey);
          return;
        }

        if (window.officeScene) {
          const item = window.officeScene.interactables.find(
            obj => obj.userData && obj.userData.section === sectionKey
          );
          if (item && item.userData) {
            window.officeScene.focusOnItem(item.userData);
          }
        }

        this.openSection(sectionKey, btn.textContent.trim());
      });
    });
  }

  // ==========================================
  // SMART SEARCH & 3D LOCATOR ENGINE
  // ==========================================
  setupSearch() {
    const allSearchable = this.buildSearchIndex();

    this.searchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (!q) {
        this.clearSearchBtn.style.display = 'none';
        this.closeSearchResults();
        return;
      }

      this.clearSearchBtn.style.display = 'block';
      const matches = allSearchable.filter(item => {
        return (
          item.title.toLowerCase().includes(q) ||
          (item.desc && item.desc.toLowerCase().includes(q)) ||
          (item.category && item.category.toLowerCase().includes(q)) ||
          (item.locationName && item.locationName.toLowerCase().includes(q)) ||
          (item.tags && item.tags.some(t => t.toLowerCase().includes(q)))
        );
      });

      this.renderSearchResults(matches, q);
    });

    this.clearSearchBtn.addEventListener('click', () => {
      this.searchInput.value = '';
      this.clearSearchBtn.style.display = 'none';
      this.closeSearchResults();
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.header-search-wrap')) {
        this.closeSearchResults();
      }
    });
  }

  buildSearchIndex() {
    const index = [];
    const locationMap = {
      bio: {
        doorId: 'vestment_door_left',
        locationName: 'دولاب تواني وأباركة أبونا (حائط المدخل الشمالي)',
        icon: '👔'
      },
      projects: {
        doorId: 'library_glass_0',
        locationName: 'مكتبة الـ 4 ضلف قزاز (الحائط الغربي)',
        icon: '📚'
      },
      services: {
        doorId: 'grand_drawer_1',
        locationName: 'أدراج المكتبة بالأسفل (الحائط الجنوبي)',
        icon: '🗄️'
      },
      milestones: {
        doorId: 'grand_glass_L',
        locationName: 'ضلف القزاز لعرض الدروع والشهادات (الحائط الجنوبي)',
        icon: '🏆'
      },
      showcase: {
        doorId: 'laptop',
        locationName: 'شاشة اللابتوب على مكتب أبونا (الحائط الشرقي)',
        icon: '💻'
      },
      contact: {
        doorId: 'phone',
        locationName: 'تليفون المكتب (الحائط الشرقي)',
        icon: '☎️'
      }
    };

    // Add predefined elements
    index.push({
      id: 'tunic_search_item',
      title: 'التوني والملابس الكهنوتية لأبونا',
      category: 'ملابس الخدمة',
      desc: 'التواني الكهنوتية البيضاء والسوداء المعلقة داخل دولاب أبونا الخاص.',
      tags: ['توني', 'ملابس', 'كهنوت', 'تواني'],
      section: 'bio',
      doorId: 'vestment_door_left',
      locationName: 'دولاب تواني وأباركة أبونا (الحائط الشمالي)'
    });

    index.push({
      id: 'abarqa_search_item',
      title: 'الأباركة وكاس الخدمة ومقتنيات الصلوات',
      category: 'طقوس وخدمة',
      desc: 'كاس وقارورة الأباركة ومقتنيات الخدمة في الضلف البوكس العلوية بدولاب أبونا.',
      tags: ['أباركة', 'اباركة', 'كاس', 'طقوس', 'خدمة'],
      section: 'bio',
      doorId: 'vestment_box_left',
      locationName: 'ضلف الأباركة العلوية (دولاب أبونا)'
    });

    // Index all items from sections
    if (this.siteData && this.siteData.sections) {
      for (const sectionKey in this.siteData.sections) {
        const sec = this.siteData.sections[sectionKey];
        const loc = locationMap[sectionKey] || { doorId: 'bookshelf', locationName: 'أثاث المكتب' };

        (sec.items || []).forEach(item => {
          index.push({
            ...item,
            section: sectionKey,
            doorId: loc.doorId,
            locationName: loc.locationName
          });
        });
      }
    }

    return index;
  }

  renderSearchResults(matches, query) {
    if (matches.length === 0) {
      this.searchResultsDropdown.innerHTML = `
        <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
          <div style="font-size: 1.8rem; margin-bottom: 6px;">🔍</div>
          <strong>لم نجد أي عنصر باسم "${query}"</strong>
          <p style="font-size: 0.8rem; margin-top: 4px;">جرب كلمة أخرى مثل: توني، أباركة، شهادة، استشارة، كتاب</p>
        </div>
      `;
      this.searchResultsDropdown.classList.add('visible');
      return;
    }

    this.searchResultsDropdown.innerHTML = matches.map(item => `
      <div class="search-result-item" data-id="${item.id}">
        <div class="search-result-title">${item.title}</div>
        <div class="search-location-badge">📍 ${item.locationName}</div>
        ${item.desc ? `<div class="search-result-desc">${item.desc}</div>` : ''}
      </div>
    `).join('');

    this.searchResultsDropdown.classList.add('visible');

    // Attach click to focus and highlight in 3D
    this.searchResultsDropdown.querySelectorAll('.search-result-item').forEach(el => {
      el.addEventListener('click', () => {
        const itemId = el.dataset.id;
        const target = matches.find(m => m.id === itemId);
        if (target) {
          this.locateAndHighlightItem(target);
        }
      });
    });
  }

  locateAndHighlightItem(item) {
    this.closeSearchResults();

    // If currently in cards view, switch to 3D to see the highlight
    if (this.isCardsViewActive) {
      this.toggleCardsView(false);
    }

    // Call 3D scene to guide camera, highlight door, and swing open
    if (window.officeScene) {
      window.officeScene.locateAndHighlightDoor(item);
    }
  }

  closeSearchResults() {
    this.searchResultsDropdown.classList.remove('visible');
  }

  // ==========================================
  // ALTERNATIVE MOBILE CARDS VIEW
  // ==========================================
  setupCardsView() {
    const categories = [
      { key: 'all', label: '🌟 كل المحتويات' },
      { key: 'bio', label: '👔 دولاب أبونا (السيرة والتواني)' },
      { key: 'projects', label: '📚 مكتبة الكتب والمشاريع' },
      { key: 'services', label: '🗄️ أدراج الخدمات والملفات' },
      { key: 'milestones', label: '🏆 ضلف الدروع والشهادات' },
      { key: 'showcase', label: '💻 معرض اللابتوب' }
    ];

    this.cardsCategoryTabs.innerHTML = categories.map(cat => `
      <button class="cards-tab-pill ${cat.key === 'all' ? 'active' : ''}" data-cat="${cat.key}">
        ${cat.label}
      </button>
    `).join('');

    this.cardsCategoryTabs.querySelectorAll('.cards-tab-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        this.cardsCategoryTabs.querySelectorAll('.cards-tab-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.filterCardsByCategory(btn.dataset.cat);
      });
    });

    this.renderAllCardsList('all');
  }

  toggleCardsView(active) {
    this.isCardsViewActive = active;
    if (active) {
      this.cardsViewContainer.classList.add('active');
      this.viewModeIcon.textContent = '🏛️';
      this.viewModeText.textContent = 'المشهد 3D';
      this.viewModeToggleBtn.classList.add('active');
    } else {
      this.cardsViewContainer.classList.remove('active');
      this.viewModeIcon.textContent = '📋';
      this.viewModeText.textContent = 'عرض البطاقات';
      this.viewModeToggleBtn.classList.remove('active');
    }
  }

  filterCardsByCategory(catKey) {
    this.renderAllCardsList(catKey);
  }

  renderAllCardsList(filterCategory = 'all') {
    const allSearchable = this.buildSearchIndex();
    const filtered = filterCategory === 'all'
      ? allSearchable
      : allSearchable.filter(item => item.section === filterCategory);

    if (filtered.length === 0) {
      this.cardsItemsList.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">
          <h3>لا توجد عناصر في هذا التصنيف حالياً</h3>
        </div>
      `;
      return;
    }

    this.cardsItemsList.innerHTML = filtered.map(item => `
      <div class="card-view-item">
        <div class="card-top">
          <h3 class="card-title">${item.title}</h3>
          ${item.badge ? `<span class="card-badge">${item.badge}</span>` : ''}
        </div>
        <div class="search-location-badge">📍 مكانها: ${item.locationName}</div>
        ${item.category ? `<div style="font-size: 0.85rem; color: var(--gold); font-weight: 700;">${item.category}</div>` : ''}
        <p class="card-desc">${item.desc || ''}</p>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
          <button class="find-in-3d-btn" onclick="UI.locateAndHighlightItemById('${item.id}')">
            <span>👁️ اعرض مكانها في الـ 3D</span> ➔
          </button>
          ${item.file_url ? `<a href="${item.file_url}" target="_blank" class="card-action-btn" style="padding: 6px 14px; font-size: 0.8rem;">تحميل الملف ⬇</a>` : ''}
        </div>
      </div>
    `).join('');
  }

  locateAndHighlightItemById(id) {
    const allSearchable = this.buildSearchIndex();
    const item = allSearchable.find(i => i.id === id);
    if (item) {
      this.locateAndHighlightItem(item);
    }
  }

  showTooltip(x, y, text) {
    if (!this.tooltipEl) return;
    this.tooltipEl.textContent = text;
    this.tooltipEl.style.left = `${x}px`;
    this.tooltipEl.style.top = `${y}px`;
    this.tooltipEl.classList.add('visible');
  }

  hideTooltip() {
    if (this.tooltipEl) {
      this.tooltipEl.classList.remove('visible');
    }
  }

  showResetViewButton(show) {
    if (this.resetBtn) {
      if (show) this.resetBtn.classList.add('visible');
      else this.resetBtn.classList.remove('visible');
    }
  }

  updateDayNightIcons(isNight) {
    if (this.themeToggleBtn) {
      this.themeToggleBtn.textContent = isNight ? '🌙' : '☀️';
    }
  }

  openSection(sectionKey, defaultTitle = '') {
    this.activeSection = sectionKey;

    if (!this.siteData || !this.siteData.sections) {
      return;
    }

    setTimeout(() => {
      if (sectionKey === 'contact') {
        this.renderContactModal();
      } else {
        const section = this.siteData.sections[sectionKey];
        const title = section ? section.title : defaultTitle;
        const subtitle = section ? section.subtitle : '';
        const items = section ? section.items || [] : [];

        this.modalTitle.innerHTML = `<span>📂</span> ${title}`;
        this.modalSubtitle.textContent = subtitle;

        if (items.length === 0) {
          this.modalBody.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
              <div style="font-size: 3rem; margin-bottom: 10px;">✨</div>
              <h3>لا توجد عناصر حالياً في هذا القسم</h3>
              <p>يمكنك إضافة عناصر جديدة بسهولة من لوحة تحكم الأدمن.</p>
            </div>
          `;
        } else {
          this.modalBody.innerHTML = items.map(item => this.createCardHTML(item, sectionKey)).join('');
        }
      }

      this.modalBackdrop.classList.add('open');
    }, 650);
  }

  createCardHTML(item, sectionKey) {
    const isBook = sectionKey === 'projects';
    const accentBorder = isBook && item.book_color ? `style="border-right: 5px solid ${item.book_color}"` : '';

    const badgeHTML = item.badge ? `<span class="card-badge">${item.badge}</span>` : '';
    const tagsHTML = item.tags && item.tags.length > 0
      ? `<div class="card-tags">${item.tags.map(t => `<span class="tag-item">#${t}</span>`).join('')}</div>`
      : '';

    const actionHTML = item.action_text && item.file_url
      ? `<div class="card-actions">
           <a href="${item.file_url}" target="_blank" class="card-action-btn">
             ${item.action_text} ↗
           </a>
         </div>`
      : '';

    return `
      <div class="content-card" ${accentBorder}>
        <div class="card-top">
          <h3 class="card-title">${item.title}</h3>
          ${badgeHTML}
        </div>
        ${item.category ? `<div style="font-size: 0.85rem; color: var(--gold); font-weight: 700;">${item.category}</div>` : ''}
        <p class="card-desc">${item.desc}</p>
        ${tagsHTML}
        ${actionHTML}
      </div>
    `;
  }

  renderContactModal() {
    this.modalTitle.innerHTML = `<span>☎️</span> تواصل مع أبونا`;
    this.modalSubtitle.textContent = 'يسعدنا دائماً استقبال رسائلكم واستفساراتكم في أي وقت';

    this.modalBody.innerHTML = `
      <form id="contact-form" class="contact-form">
        <div id="contact-alert" class="contact-alert"></div>
        <div class="form-group">
          <label>الاسم الكريم *</label>
          <input type="text" id="contact-name" class="form-input" placeholder="اكتب اسمك الكامل" required />
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
          <div class="form-group">
            <label>البريد الإلكتروني</label>
            <input type="email" id="contact-email" class="form-input" placeholder="example@email.com" />
          </div>
          <div class="form-group">
            <label>رقم الهاتف / واتساب</label>
            <input type="tel" id="contact-phone" class="form-input" placeholder="+20 100 000 0000" />
          </div>
        </div>
        <div class="form-group">
          <label>موضوع الرسالة</label>
          <input type="text" id="contact-subject" class="form-input" placeholder="استشارة، استفسار، ندوة..." />
        </div>
        <div class="form-group">
          <label>الرسالة *</label>
          <textarea id="contact-content" class="form-textarea" rows="4" placeholder="اكتب رسالتك هنا بكل وضوح..." required></textarea>
        </div>
        <button type="submit" class="submit-btn">
          <span>إرسال الرسالة الآن</span> 📨
        </button>
      </form>
    `;

    const form = document.getElementById('contact-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('.submit-btn');
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'جاري الإرسال... ⏳';

      const res = await window.API.submitContact({
        name: document.getElementById('contact-name').value,
        email: document.getElementById('contact-email').value,
        phone: document.getElementById('contact-phone').value,
        subject: document.getElementById('contact-subject').value,
        content: document.getElementById('contact-content').value
      });

      const alert = document.getElementById('contact-alert');
      if (res.success) {
        alert.className = 'contact-alert success';
        alert.textContent = res.message || 'تم إرسال رسالتك بنجاح!';
        form.reset();
        submitBtn.innerHTML = 'تم الإرسال بنجاح ✔';
      } else {
        alert.className = 'contact-alert';
        alert.style.display = 'block';
        alert.style.color = '#ef4444';
        alert.style.background = 'rgba(239, 68, 68, 0.1)';
        alert.textContent = res.error || 'حدث خطأ، يرجى المحاولة ثانية';
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'إعادة المحاولة 📨';
      }
    });
  }

  closeModal() {
    this.modalBackdrop.classList.remove('open');
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(b => b.classList.remove('active'));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.UI = new UIController();
  window.officeScene = new window.OfficeScene('canvas-container');
});
