// ==========================================
// CLIENT API MODULE
// ==========================================

const API = {
  // Fetch all public data (settings, active scene items, sections content)
  async getPublicData() {
    try {
      const res = await fetch('/api/public/data');
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    } catch (err) {
      console.error('Failed to fetch public data:', err);
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
      return await res.json();
    } catch (err) {
      console.error('Failed to submit contact:', err);
      return { success: false, error: 'تعذر الاتصال بالخادم، يرجى المحاولة لاحقاً' };
    }
  }
};

window.API = API;
