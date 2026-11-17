// ==========================================
// CLIENT API MODULE
// ==========================================

const API = {
  // Fetch all public data (settings, active scene items, sections content)
  async getPublicData() {
    try {
      const res = await fetch('/api/public/data');
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) return data;
      }
      throw new Error('API not available, fallback to static JSON');
    } catch (err) {
      console.log('Using static JSON data fallback...');
      try {
        const fallbackRes = await fetch('./data/database.json');
        if (fallbackRes.ok) {
          const db = await fallbackRes.json();
          return {
            success: true,
            settings: db.settings || {},
            items: (db.scene_items || []).filter(i => i.is_active !== false),
            sections: db.sections || {}
          };
        }
      } catch (e2) {
        console.error('Failed to load fallback JSON:', e2);
      }
      return null;
    }
  },

  // Submit visitor contact message
  async submitContact(formData) {
    try {
      const res = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        return await res.json();
      }
      throw new Error('Server unavailable');
    } catch (err) {
      // In static GitHub Pages mode, store in localStorage
      try {
        const saved = JSON.parse(localStorage.getItem('abouna_messages') || '[]');
        saved.push({ ...formData, id: Date.now(), createdAt: new Date().toISOString() });
        localStorage.setItem('abouna_messages', JSON.stringify(saved));
        return { success: true, message: 'تم إرسال رسالتك بنجاح وسنقوم بالتواصل معك قريباً!' };
      } catch (e) {
        return { success: false, error: 'تعذر حفظ الرسالة، يرجى المحاولة لاحقاً' };
      }
    }
  }
};

window.API = API;
