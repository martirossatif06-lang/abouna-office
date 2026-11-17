const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_FILE = path.join(__dirname, 'data', 'database.json');

// Ensure directory exists
if (!fs.existsSync(path.dirname(DB_FILE))) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
}

// Initial seed data
function getInitialData() {
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('admin123', salt);

  return {
    users: [
      {
        id: 'user_1',
        email: 'admin@office.com',
        password_hash: passwordHash,
        name: 'أدمن المكتب',
        role: 'admin'
      }
    ],
    settings: {
      office_title: 'مكتب أبونا',
      office_subtitle: 'مساحة تفاعلية 3D — استكشف الأعمال، الخدمات، والوثائق',
      bio: 'أهلاً بكم في مكتبي التفاعلي. صُمم هذا المكان ليعكس مسيرة العمل والخدمة بكل تفاصيلها. اضغط على أي عنصر في الغرفة لاكتشاف محتوياته.',
      default_mode: 'day', // 'day' or 'night'
      contact_email: 'contact@office.com',
      contact_phone: '+20 100 000 0000',
      social_links: {
        facebook: 'https://facebook.com',
        youtube: 'https://youtube.com',
        telegram: 'https://telegram.org',
        whatsapp: 'https://wa.me/201000000000'
      }
    },
    scene_items: [
      {
        id: 'cabinet_door',
        name: 'ضلفة المكتبة',
        target_section: 'bio',
        tooltip: 'نبذة عني + السيرة الذاتية والشهادات',
        description: 'تفتح ضلفة المكتبة السفلية لتكشف عن ملف السيرة الذاتية وأهم الإنجازات والشهادات.',
        icon: 'book-open',
        is_active: true,
        order: 1
      },
      {
        id: 'bookshelf',
        name: 'رف الكتب والمشاريع',
        target_section: 'projects',
        tooltip: 'المشاريع والأعمال — اضغط على أي كتاب',
        description: 'مجموعة من الكتب والمجلدات، كل كتاب يفتح مشروعاً مفصلاً مع الصور وملفات التحميل.',
        icon: 'library',
        is_active: true,
        order: 2
      },
      {
        id: 'drawers',
        name: 'أدراج المكتب',
        target_section: 'services',
        tooltip: 'الخدمات والأسعار + ملفات للتحميل',
        description: 'درجان ينزلقان لفتح تفاصيل الخدمات المتاحة، الاستشارات، والملفات المباشرة للتحميل.',
        icon: 'archive',
        is_active: true,
        order: 3
      },
      {
        id: 'wall_frames',
        name: 'الصور والشهادات على الحائط',
        target_section: 'milestones',
        tooltip: 'محطات مهمة ووثائق وصور تذكارية',
        description: 'معرض للشهادات الفخرية واللقطات التاريخية والوثائق المعتمدة.',
        icon: 'award',
        is_active: true,
        order: 4
      },
      {
        id: 'laptop',
        name: 'اللابتوب على المكتب',
        target_section: 'showcase',
        tooltip: 'أحدث الأعمال ومعرض تفاعلي رقمي',
        description: 'شاشة اللابتوب تضيء لتستعرض أحدث المبادرات والمواقع والمنصات الرقمية.',
        icon: 'monitor',
        is_active: true,
        order: 5
      },
      {
        id: 'phone',
        name: 'التليفون وصندوق البريد',
        target_section: 'contact',
        tooltip: 'تواصل مباشر وإرسال رسالة',
        description: 'تليفون أنيق يفتح نموذج إرسال رسالة مباشرة إلى صندوق بريد لوحة التحكم.',
        icon: 'phone',
        is_active: true,
        order: 6
      },
      {
        id: 'lamp',
        name: 'أباجورة المكتب',
        target_section: 'lamp_toggle',
        tooltip: 'تبديل وضع النهار / الليل للغرفة',
        description: 'مفتاح إضاءة يغيّر جو الغرفة بالكامل بين ضوء الشمس الهادئ وسحر الإضاءة الليلية.',
        icon: 'sun',
        is_active: true,
        order: 7
      }
    ],
    sections: {
      bio: {
        title: 'السيرة الذاتية والشهادات',
        subtitle: 'مسيرة ممتدة من العمل والخدمة والعطاء',
        items: [
          {
            id: 'bio_1',
            title: 'نبذة تعريفية',
            category: 'عن أبونا',
            desc: 'خدمة مستمرة لأكثر من عقدين في مجالات الرعاية والتأليف والتعليم والتنمية المجتمعية، مع التركيز على بناء الشخصية ودعم الأجيال الجديدة وتطوير المحتوى الهادف.',
            badge: 'الرسالة والرؤية',
            tags: ['تعليم', 'رعاية', 'تأليف'],
            media_url: '',
            file_url: '',
            is_active: true,
            order: 1
          },
          {
            id: 'bio_2',
            title: 'درجة الماجستير في العلوم الإنسانية واللاهوت',
            category: 'مؤهلات علمية',
            desc: 'دراسة متعمقة في التاريخ، واللغات الكلاسيكية، وتوثيق المخطوطات القديمة بتقدير امتياز مع مرتبة الشرف.',
            badge: 'شهادة أكاديمية',
            tags: ['أكاديمي', 'تاريخ', 'مخطوطات'],
            media_url: '',
            file_url: '',
            is_active: true,
            order: 2
          },
          {
            id: 'bio_3',
            title: 'شهادة التقدير للإسهامات المجتمعية والثقافية',
            category: 'تكريم وجوائز',
            desc: 'تكريم رسمي عن تأسيس برامج الدعم الشبابي والمكتبات المجتمعية التفاعلية وورش العمل الدورية.',
            badge: 'تكريم رسمي',
            tags: ['مجتمعي', 'ثقافة', 'ريادة'],
            media_url: '',
            file_url: '',
            is_active: true,
            order: 3
          }
        ]
      },
      projects: {
        title: 'رف الكتب والمشاريع',
        subtitle: 'كل كتاب في الرف يمثل رحلة عمل ومؤلفاً متكاملاً',
        items: [
          {
            id: 'proj_1',
            title: 'موسوعة المبادئ والأخلاق التطبيقية',
            category: 'مؤلفات مطبوعة',
            desc: 'كتاب في 3 أجزاء يتناول تطبيق القيم في واقع الحياة اليومية، مع دراسات حالة وأمثلة عملية معاصرة.',
            book_color: '#8b4513',
            badge: 'الأكثر قراءة',
            tags: ['كتب', 'فكر', 'تنمية'],
            media_url: '',
            file_url: '#',
            action_text: 'تحميل ملخص الكتاب (PDF)',
            is_active: true,
            order: 1
          },
          {
            id: 'proj_2',
            title: 'مشروع الأرشيف والتوثيق الرقمي',
            category: 'مبادرات رقمية',
            desc: 'منظومة إلكترونية متكاملة لجمع وفهرسة وتصوير الوثائق القديمة والمحاضرات النادرة بجودة فائقة وإتاحتها للباحثين.',
            book_color: '#1a5276',
            badge: 'مشروع تقني',
            tags: ['أرشيف', 'تكنولوجيا', 'توثيق'],
            media_url: '',
            file_url: '#',
            action_text: 'زيارة المنصة الرقمية',
            is_active: true,
            order: 2
          },
          {
            id: 'proj_3',
            title: 'سلسلة لقاءات ومحاضرات الشباب',
            category: 'محتوى مرئي وصوتي',
            desc: 'سلسلة لقاءات أسبوعية تفاعلية تناقش تحديات العصر والإجابة عن التساؤلات الفكرية والروحية بأسلوب منطقي هادئ.',
            book_color: '#196f3d',
            badge: 'مرئي ومسموع',
            tags: ['محاضرات', 'فيديو', 'شباب'],
            media_url: '',
            file_url: '#',
            action_text: 'مشاهدة الحلقات الكاملة',
            is_active: true,
            order: 3
          },
          {
            id: 'proj_4',
            title: 'دليل الإرشاد والاستشارات الأسرية',
            category: 'إصدارات متخصصة',
            desc: 'كتيب إرشادي تطبيقي يحتوي على حلول عملية للمشكلات الأسرية الشائعة وبناء أسس التفاهم والتواصل الفعال.',
            book_color: '#7d6608',
            badge: 'إصدار حديث',
            tags: ['أسرة', 'إرشاد', 'دليل عملي'],
            media_url: '',
            file_url: '#',
            action_text: 'قراءة الدليل',
            is_active: true,
            order: 4
          }
        ]
      },
      services: {
        title: 'أدراج المكتب — الخدمات والتحميلات',
        subtitle: 'الخدمات المتاحة، الاستشارات، والملفات المباشرة',
        items: [
          {
            id: 'serv_1',
            title: 'جلسات استشارية وإرشاد شخصي',
            category: 'خدمات مباشرة',
            desc: 'مواعيد منتظمة لجلسات الاستماع، والتوجيه الفكري والأسري، وتقديم حلول للمواقف الحياتية المختلفة.',
            badge: 'حضوري / أونلاين',
            tags: ['استشارات', 'إرشاد', 'دعم'],
            media_url: '',
            file_url: '#contact',
            action_text: 'طلب موعد جلسة',
            is_active: true,
            order: 1
          },
          {
            id: 'serv_2',
            title: 'إلقاء المحاضرات والندوات العامة',
            category: 'فاعليات',
            desc: 'المشاركة كمتحدث رئيسي في المؤتمرات الثقافية، الملتقيات التنموية، والندوات المتخصصة.',
            badge: 'متاح للجهات والمؤسسات',
            tags: ['ندوات', 'محاضرات', 'مؤتمرات'],
            media_url: '',
            file_url: '#contact',
            action_text: 'تنسيق ندوة أو فاعلية',
            is_active: true,
            order: 2
          },
          {
            id: 'serv_3',
            title: 'حقيبة الأدوات والملفات المجانية (Downloads)',
            category: 'تحميل مباشر',
            desc: 'مجموعة من أوراق العمل، جداول التخطيط، والملفات بصيغة PDF المتاحة لجميع الزوار مجاناً.',
            badge: 'ملفات جاهزة',
            tags: ['PDF', 'تحميل مجاني', 'أدوات'],
            media_url: '',
            file_url: '#',
            action_text: 'تحميل الحقيبة كاملة (ZIP)',
            is_active: true,
            order: 3
          }
        ]
      },
      milestones: {
        title: 'الشهادات والصور التذكارية',
        subtitle: 'لحظات فارقة ومحطات مضيئة في المسيرة',
        items: [
          {
            id: 'mile_1',
            title: 'افتتاح مركز الأنشطة الثقافية',
            category: 'محطات تاريخية',
            desc: 'صورة توثيقية من اليوم الأول لانطلاق المركز الذي خدم آلاف المستفيدين على مدار السنوات.',
            badge: '2015',
            tags: ['افتتاح', 'تاريخ', 'توثيق'],
            media_url: '',
            file_url: '',
            is_active: true,
            order: 1
          },
          {
            id: 'mile_2',
            title: 'درع العطاء الإنساني والتطوعي',
            category: 'شهادات وتقديرات',
            desc: 'شهادة شكر وتقدير من الجمعيات الأهلية تقديراً للمبادرات الخيرية والمشاركات التطوعية.',
            badge: '2020',
            tags: ['تكريم', 'عطاء', 'شهادة'],
            media_url: '',
            file_url: '',
            is_active: true,
            order: 2
          },
          {
            id: 'mile_3',
            title: 'تخريج الدفعة الخامسة من برنامج القيادات الشابة',
            category: 'إنجازات',
            desc: 'صورة تذكارية مع خريجي البرنامج التدريبي المكثف لإعداد الكوادر الشابة وصقل مهاراتهم.',
            badge: '2023',
            tags: ['تخريج', 'شباب', 'قيادة'],
            media_url: '',
            file_url: '',
            is_active: true,
            order: 3
          }
        ]
      },
      showcase: {
        title: 'معرض اللابتوب الرقمي',
        subtitle: 'أحدث المشاريع والمنصات التفاعلية الرقمية',
        items: [
          {
            id: 'show_1',
            title: 'البوابة الرقمية للمكتبة التفاعلية',
            category: 'تطوير ويب',
            desc: 'منصة إلكترونية متطورة تتيح البحث في آلاف الوثائق والمقالات مع نظام تصنيف ذكي وقارئ رقمي.',
            badge: 'أحدث أعمال 2026',
            tags: ['Web', 'Interactive', 'Library'],
            media_url: '',
            file_url: '#',
            action_text: 'مشاهدة العرض الحي (Live Demo)',
            is_active: true,
            order: 1
          },
          {
            id: 'show_2',
            title: 'تطبيق الهواتف الذكية للتأملات اليومية',
            category: 'تطبيقات موبايل',
            desc: 'تطبيق بسيط ومريح يرسل تنبيهات باقتباسات ومقاطع صوتية قصيرة ملهمة يومياً.',
            badge: 'Android & iOS',
            tags: ['App', 'Mobile', 'Daily'],
            media_url: '',
            file_url: '#',
            action_text: 'معلومات التطبيق',
            is_active: true,
            order: 2
          }
        ]
      }
    },
    messages: [
      {
        id: 'msg_1',
        name: 'محب تجريبي',
        email: 'visitor@example.com',
        phone: '+20 111 222 3333',
        subject: 'استفسار عن موعد الجلسة الاستشارية',
        content: 'سلام ونعمة يا أبونا، كنت حابب أعرف المواعيد المتاحة الأسبوع القادم للاستشارة الأسرية، وشكراً جزيلاً لحضرتك على الموقع الجميل ده!',
        is_read: false,
        created_at: new Date(Date.now() - 3600000 * 2).toISOString()
      }
    ],
    media: []
  };
}

class Database {
  constructor() {
    this.data = null;
    this.init();
  }

  init() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        this.data = getInitialData();
        this.save();
      }
    } catch (err) {
      console.error('Error reading database, resetting to initial seed:', err);
      this.data = getInitialData();
      this.save();
    }
  }

  save() {
    try {
      const tempFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.error('Error saving database:', err);
    }
  }

  // --- Auth & Users ---
  getUserByEmail(email) {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  getUserById(id) {
    return this.data.users.find(u => u.id === id);
  }

  updatePassword(userId, newPassword) {
    const user = this.getUserById(userId);
    if (!user) return false;
    const salt = bcrypt.genSaltSync(10);
    user.password_hash = bcrypt.hashSync(newPassword, salt);
    this.save();
    return true;
  }

  // --- Settings ---
  getSettings() {
    return this.data.settings;
  }

  updateSettings(newSettings) {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.save();
    return this.data.settings;
  }

  // --- Scene Items ---
  getSceneItems() {
    return this.data.scene_items.sort((a, b) => a.order - b.order);
  }

  updateSceneItem(id, updates) {
    const item = this.data.scene_items.find(i => i.id === id);
    if (!item) return null;
    Object.assign(item, updates);
    this.save();
    return item;
  }

  // --- Sections & Content Items ---
  getSection(sectionKey) {
    return this.data.sections[sectionKey] || null;
  }

  getAllSections() {
    return this.data.sections;
  }

  addContentItem(sectionKey, itemData) {
    if (!this.data.sections[sectionKey]) {
      this.data.sections[sectionKey] = { title: sectionKey, subtitle: '', items: [] };
    }
    const section = this.data.sections[sectionKey];
    const newItem = {
      id: `${sectionKey}_${Date.now()}`,
      title: itemData.title || 'عنصر جديد',
      category: itemData.category || '',
      desc: itemData.desc || '',
      badge: itemData.badge || '',
      tags: itemData.tags || [],
      media_url: itemData.media_url || '',
      file_url: itemData.file_url || '',
      action_text: itemData.action_text || '',
      book_color: itemData.book_color || '#8b4513',
      is_active: itemData.is_active !== undefined ? itemData.is_active : true,
      order: (section.items.length || 0) + 1,
      ...itemData
    };
    section.items.push(newItem);
    this.save();
    return newItem;
  }

  updateContentItem(sectionKey, itemId, updates) {
    const section = this.data.sections[sectionKey];
    if (!section) return null;
    const item = section.items.find(i => i.id === itemId);
    if (!item) return null;
    Object.assign(item, updates);
    this.save();
    return item;
  }

  deleteContentItem(sectionKey, itemId) {
    const section = this.data.sections[sectionKey];
    if (!section) return false;
    const initialLen = section.items.length;
    section.items = section.items.filter(i => i.id !== itemId);
    if (section.items.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // --- Messages ---
  getMessages() {
    return this.data.messages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  addMessage(msgData) {
    const newMsg = {
      id: `msg_${Date.now()}`,
      name: msgData.name || 'زائر',
      email: msgData.email || '',
      phone: msgData.phone || '',
      subject: msgData.subject || 'رسالة جديدة من الموقع',
      content: msgData.content || '',
      is_read: false,
      created_at: new Date().toISOString()
    };
    this.data.messages.unshift(newMsg);
    this.save();
    return newMsg;
  }

  markMessageRead(id, is_read = true) {
    const msg = this.data.messages.find(m => m.id === id);
    if (!msg) return null;
    msg.is_read = is_read;
    this.save();
    return msg;
  }

  deleteMessage(id) {
    const initialLen = this.data.messages.length;
    this.data.messages = this.data.messages.filter(m => m.id !== id);
    if (this.data.messages.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // --- Media ---
  getMedia() {
    return this.data.media || [];
  }

  addMedia(mediaItem) {
    if (!this.data.media) this.data.media = [];
    this.data.media.unshift(mediaItem);
    this.save();
    return mediaItem;
  }

  deleteMedia(id) {
    if (!this.data.media) return false;
    this.data.media = this.data.media.filter(m => m.id !== id);
    this.save();
    return true;
  }
}

module.exports = new Database();
