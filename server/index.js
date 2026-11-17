const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');

const db = require('./db');
const { signToken, requireAuth } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'data', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'file-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'client')));
app.use('/uploads', express.static(uploadDir));

// Friendly page routes (مرونة كاملة لدخول الأدمن وصفحة تسجيل الدخول)
app.get(['/admin', '/admin/*', '/dashboard', '/panel', '/admin.html'], (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'admin.html'));
});

app.get(['/login', '/login/*', '/signin', '/login.html'], (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'login.html'));
});

// ==========================================
// 🔓 PUBLIC API ENDPOINTS
// ==========================================

// Get all public data for the 3D scene & website
app.get('/api/public/data', (req, res) => {
  try {
    const settings = db.getSettings();
    const scene_items = db.getSceneItems().filter(item => item.is_active);
    const rawSections = db.getAllSections();

    // Filter only active items inside each section
    const sections = {};
    for (const key in rawSections) {
      sections[key] = {
        title: rawSections[key].title,
        subtitle: rawSections[key].subtitle,
        items: (rawSections[key].items || []).filter(item => item.is_active)
      };
    }

    res.json({
      success: true,
      settings,
      scene_items,
      sections
    });
  } catch (err) {
    console.error('Error fetching public data:', err);
    res.status(500).json({ success: false, error: 'حدث خطأ أثناء تحميل البيانات' });
  }
});

// Submit contact form (from the 3D telephone/mailbox)
app.post('/api/public/contact', (req, res) => {
  try {
    const { name, email, phone, subject, content } = req.body;
    if (!content || !name) {
      return res.status(400).json({ success: false, error: 'يرجى كتابة الاسم والرسالة' });
    }

    const message = db.addMessage({ name, email, phone, subject, content });
    res.json({
      success: true,
      message: 'تم إرسال رسالتك بنجاح وسيتواصل معك أبونا في أقرب وقت!'
    });
  } catch (err) {
    console.error('Error submitting contact form:', err);
    res.status(500).json({ success: false, error: 'تعذر إرسال الرسالة، حاول مرة أخرى' });
  }
});

// ==========================================
// 🔐 AUTH API ENDPOINTS
// ==========================================

// Admin Login (يدعم الدخول بكلمة المرور فقط أو الإيميل والباسورد)
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال كلمة المرور' });
    }

    // البحث عن مستخدم الأدمن (أو الافتراضي)
    const user = email ? db.getUserByEmail(email) : db.data.users[0];
    if (!user) {
      return res.status(401).json({ success: false, error: 'المستخدم غير موجود' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'كلمة المرور غير صحيحة' });
    }

    const token = signToken(user);
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

// Check current user
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

// Change Password
app.post('/api/auth/change-password', requireAuth, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' });
    }

    const user = db.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
    }

    const isMatch = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'كلمة المرور الحالية غير صحيحة' });
    }

    db.updatePassword(user.id, newPassword);
    res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'تعذر تغيير كلمة المرور' });
  }
});

// ==========================================
// 🛡️ ADMIN PROTECTED APIS
// ==========================================

// --- Settings ---
app.get('/api/admin/settings', requireAuth, (req, res) => {
  res.json({ success: true, settings: db.getSettings() });
});

app.put('/api/admin/settings', requireAuth, (req, res) => {
  try {
    const updated = db.updateSettings(req.body);
    res.json({ success: true, settings: updated, message: 'تم حفظ الإعدادات بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'تعذر حفظ الإعدادات' });
  }
});

// --- Scene Items ---
app.get('/api/admin/scene-items', requireAuth, (req, res) => {
  res.json({ success: true, items: db.getSceneItems() });
});

app.put('/api/admin/scene-items/:id', requireAuth, (req, res) => {
  try {
    const item = db.updateSceneItem(req.params.id, req.body);
    if (!item) return res.status(404).json({ success: false, error: 'العنصر غير موجود' });
    res.json({ success: true, item, message: 'تم تحديث عنصر المشهد' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'تعذر التحديث' });
  }
});

// --- Content Sections ---
app.get('/api/admin/sections', requireAuth, (req, res) => {
  res.json({ success: true, sections: db.getAllSections() });
});

app.post('/api/admin/sections/:key/items', requireAuth, (req, res) => {
  try {
    const newItem = db.addContentItem(req.params.key, req.body);
    res.json({ success: true, item: newItem, message: 'تم إضافة العنصر بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'تعذر إضافة العنصر' });
  }
});

app.put('/api/admin/sections/:key/items/:id', requireAuth, (req, res) => {
  try {
    const updated = db.updateContentItem(req.params.key, req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, error: 'العنصر غير موجود' });
    res.json({ success: true, item: updated, message: 'تم تحديث العنصر بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'تعذر التحديث' });
  }
});

app.delete('/api/admin/sections/:key/items/:id', requireAuth, (req, res) => {
  try {
    const ok = db.deleteContentItem(req.params.key, req.params.id);
    if (!ok) return res.status(404).json({ success: false, error: 'العنصر غير موجود' });
    res.json({ success: true, message: 'تم حذف العنصر بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'تعذر الحذف' });
  }
});

// --- Messages / Inbox ---
app.get('/api/admin/messages', requireAuth, (req, res) => {
  res.json({ success: true, messages: db.getMessages() });
});

app.put('/api/admin/messages/:id/read', requireAuth, (req, res) => {
  try {
    const msg = db.markMessageRead(req.params.id, req.body.is_read !== false);
    if (!msg) return res.status(404).json({ success: false, error: 'الرسالة غير موجودة' });
    res.json({ success: true, message: msg });
  } catch (err) {
    res.status(500).json({ success: false, error: 'تعذر التحديث' });
  }
});

app.delete('/api/admin/messages/:id', requireAuth, (req, res) => {
  try {
    const ok = db.deleteMessage(req.params.id);
    if (!ok) return res.status(404).json({ success: false, error: 'الرسالة غير موجودة' });
    res.json({ success: true, message: 'تم حذف الرسالة' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'تعذر الحذف' });
  }
});

// --- File Upload ---
app.post('/api/admin/upload', requireAuth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'لم يتم اختيار أي ملف' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const mediaItem = {
      id: `media_${Date.now()}`,
      name: req.file.originalname,
      filename: req.file.filename,
      url: fileUrl,
      mimetype: req.file.mimetype,
      size: req.file.size,
      created_at: new Date().toISOString()
    };

    db.addMedia(mediaItem);

    res.json({
      success: true,
      url: fileUrl,
      media: mediaItem,
      message: 'تم رفع الملف بنجاح'
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, error: 'تعذر رفع الملف' });
  }
});

app.get('/api/admin/media', requireAuth, (req, res) => {
  res.json({ success: true, media: db.getMedia() });
});

app.delete('/api/admin/media/:id', requireAuth, (req, res) => {
  try {
    const mediaList = db.getMedia();
    const item = mediaList.find(m => m.id === req.params.id);
    if (item) {
      const filePath = path.join(uploadDir, item.filename);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
      db.deleteMedia(item.id);
    }
    res.json({ success: true, message: 'تم حذف الملف' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'تعذر حذف الملف' });
  }
});

// Start Server if not on Vercel
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 خادم مكتب أبونا 3D يعمل الآن بنجاح!`);
    console.log(`🌐 الواجهة العامة للمكتب: http://localhost:${PORT}`);
    console.log(`🔑 لوحة تحكم الأدمن:    http://localhost:${PORT}/admin`);
    console.log(`🚪 صفحة تسجيل الدخول:   http://localhost:${PORT}/login`);
    console.log(`===============================================`);
  });
}

module.exports = app;

