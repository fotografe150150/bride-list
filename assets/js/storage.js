/* Local data layer: no server, account, or network requests. */
(() => {
  const STORAGE_KEY = "brideListApp.v1";
  const defaultCategories = [
    { id: "cat-bedroom", icon: "bed", name: "غرفة النوم", sortOrder: 1 },
    { id: "cat-kitchen", icon: "kitchen", name: "المطبخ", sortOrder: 2 },
    { id: "cat-appliances", icon: "appliance", name: "الأجهزة الكهربائية", sortOrder: 3 },
    { id: "cat-bathroom", icon: "drop", name: "الحمام", sortOrder: 4 },
    { id: "cat-linen", icon: "curtain", name: "المفروشات", sortOrder: 5 },
    { id: "cat-clothes", icon: "hanger", name: "الملابس", sortOrder: 6 },
    { id: "cat-personal", icon: "flower", name: "العناية الشخصية", sortOrder: 7 },
    { id: "cat-other", icon: "box", name: "متفرقات", sortOrder: 8 }
  ];
  const defaultItems = [
    ["cat-bedroom","ملايات سرير","طقم",4],["cat-bedroom","مخدات","قطعة",4],["cat-bedroom","لحاف","قطعة",2],["cat-bedroom","بطاطين","قطعة",2],["cat-bedroom","كوفرتة","قطعة",2],["cat-bedroom","واقي مرتبة","قطعة",1],
    ["cat-kitchen","طقم حلل","طقم",1],["cat-kitchen","طقم أطباق","طقم",1],["cat-kitchen","أكواب","طقم",2],["cat-kitchen","مجات","قطعة",6],["cat-kitchen","ملاعق وشوك وسكاكين","طقم",1],["cat-kitchen","صواني","قطعة",3],["cat-kitchen","طقم توابل","طقم",1],["cat-kitchen","علب حفظ الطعام","طقم",1],["cat-kitchen","مصفاة ومبشرة","قطعة",2],
    ["cat-appliances","ثلاجة","جهاز",1],["cat-appliances","غسالة","جهاز",1],["cat-appliances","بوتاجاز","جهاز",1],["cat-appliances","خلاط","جهاز",1],["cat-appliances","مكواة","جهاز",1],["cat-appliances","مروحة","جهاز",1],
    ["cat-bathroom","مناشف","قطعة",6],["cat-bathroom","دواسة حمام","قطعة",2],["cat-bathroom","ستارة حمام","قطعة",1],["cat-bathroom","سلة غسيل","قطعة",1],
    ["cat-linen","فوط مطبخ","قطعة",6],["cat-linen","مفرش سفرة","قطعة",2],["cat-linen","ستائر","طقم",2],["cat-linen","سجاد","قطعة",2],
    ["cat-clothes","ملابس بيت","قطعة",6],["cat-clothes","ملابس خروج","قطعة",4],["cat-clothes","ملابس داخلية","قطعة",8],["cat-clothes","أحذية","زوج",3],
    ["cat-personal","مستلزمات عناية","مجموعة",1],["cat-personal","فرش وأدوات شعر","مجموعة",1],["cat-personal","عطور","قطعة",2],
    ["cat-other","شنط سفر","قطعة",2],["cat-other","أدوات تنظيف","مجموعة",1],["cat-other","عدة إسعافات أولية","مجموعة",1]
  ];
  const clone = value => JSON.parse(JSON.stringify(value));
  const SCHEMA = 3;
  const ICON_KEYS = ["auto","bed","kitchen","appliance","drop","curtain","hanger","flower","box","heart","gift","bag","home","star","sparkles","pot"];
  const FALLBACK_CAT = { id: "cat-recovered", name: "بنود بدون فئة" };


  /* ---------- تخصيص چيسي + فئة «الرفايع» ----------
     البذور (Seeds) تُطبَّق مرة واحدة فقط لكل مستخدم (العلامة state.seeds.rafayea)،
     فلا تتكرر الفئة أو البنود عند التحديث، ولا تعود بنود حذفها المستخدم. */
  const DEFAULT_BRIDE_NAME = "چيسي";
  const RAFAYEA = {
    id: "cat-rafayea", name: "الرفايع", icon: "pot",
    description: "أدوات المطبخ الصغيرة ومستلزمات الطهي والتقديم"
  };
  /* [الاسم، الوحدة، الكمية المطلوبة، الملاحظات] — الكمية 1 كبداية وتُعدَّل من داخل التطبيق */
  const RAFAYEA_ITEMS = [
    ["طقم صواني فرن", "طقم", 1, "مستطيل / مدور"],
    ["طقم طواجن فرن", "طقم", 1, "بايركس أو فخار"],
    ["طقم مقالي", "طقم", 1, "تيفال - جرانيت، أحجام مختلفة"],
    ["كنك قهوة", "قطعة", 1, "ألومنيوم - جرانيت، أحجام مختلفة"],
    ["علب ثلاجة", "طقم", 1, "أحجام مختلفة"],
    ["ميزان مطبخ رقمي", "قطعة", 1, "مهم للوصفات"],
    ["طقم توزيع", "طقم", 1, "سيليكون - خشب - ألومنيوم"],
    ["فرشة سيليكون", "قطعة", 1, "للزيت"],
    ["بخاخ زيت", "قطعة", 1, "للإير فراير"],
    ["قوالب سيليكون", "طقم", 1, "للإير فراير"],
    ["قوالب سيليكون (كب كيك)", "طقم", 1, ""],
    ["قوالب كيك - إنجلش كيك", "طقم", 1, ""],
    ["نشابة للعجين", "قطعة", 1, ""],
    ["طقم توابل", "طقم", 1, ""],
    ["صفاية أطباق", "قطعة", 1, "للحوض"],
    ["مريلة للمطبخ + جوانتي سيليكون للحرارة", "طقم", 1, ""],
    ["جوانتي غسيل أطباق", "قطعة", 1, ""],
    ["ليف - سلك مواعين ومنظم", "طقم", 1, ""],
    ["صابون سائل", "قطعة", 1, ""],
    ["منظم ثلاجة", "قطعة", 1, ""],
    ["طقم مصافي", "طقم", 1, "للمكرونة والخضار"],
    ["هراسة بطاطس", "قطعة", 1, ""],
    ["قشارة سمك - مقص سمك", "طقم", 1, ""],
    ["قوالب تلج", "قطعة", 1, ""],
    ["علب تخزين بقوليات", "طقم", 1, ""],
    ["طقم سكاكين", "طقم", 1, ""],
    ["مقص مطبخ", "قطعة", 1, ""],
    ["مبشرة", "قطعة", 1, ""],
    ["قشارة", "قطعة", 1, ""],
    ["فتاحة معلبات وزجاجات", "قطعة", 1, ""],
    ["طقم معالق وشوك (استخدام يومي)", "طقم", 1, ""],
    ["طقم معالق وشوك (للضيوف)", "طقم", 1, ""],
    ["مضرب بيض يدوي", "قطعة", 1, ""],
    ["لوح تقطيع", "قطعة", 1, "خشب - بلاستيك - ستانلس"],
    ["منظم درج المعالق", "قطعة", 1, ""],
    ["قمع", "طقم", 1, "أحجام مختلفة"],
    ["مصفاة شاي صغيرة", "قطعة", 1, ""],
    ["عصارة ليمون", "قطعة", 1, ""],
    ["ولاعة بوتاجاز", "قطعة", 1, ""],
    ["مقوار محشي", "قطعة", 1, ""],
    ["مخرطة", "قطعة", 1, ""],
    ["ملاحات", "قطعة", 1, ""],
    ["قطاعة بيتزا", "قطعة", 1, ""],
    ["مقص استانلس", "قطعة", 1, ""],
    ["منخل دقيق", "طقم", 1, "أحجام مختلفة"],
    ["شياطة الأرز", "قطعة", 1, ""],
    ["طبق غويط للعجين", "قطعة", 1, ""],
    ["مدق لحمة", "قطعة", 1, ""],
    ["صفاية معالق", "قطعة", 1, ""],
    ["عليقة للمطبخ", "قطعة", 1, ""],
    ["حامل مناديل المطبخ", "قطعة", 1, ""]
  ];
  /* تطبيع الاسم للمقارنة فقط (لا يغيّر الاسم المحفوظ) */
  const nameKey = v => String(v || "").replace(/[\u064B-\u0652\u0640]/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
    .replace(/[()\[\]\-+،,/\s]+/g, " ").trim().toLocaleLowerCase();

  /* يعدّل الحالة الممرَّرة مباشرة. يرجع true لو تغيّر شيء. */
  function applySeeds(st) {
    let changed = false;
    st.seeds = st.seeds && typeof st.seeds === "object" ? st.seeds : {};
    if (!st.seeds.rafayea) {
      const now = new Date().toISOString();
      let cat = st.categories.find(c => c.id === RAFAYEA.id) || st.categories.find(c => nameKey(c.name) === nameKey(RAFAYEA.name));
      if (!cat) {
        const maxOrder = st.categories.reduce((m, c) => Math.max(m, Number(c.sortOrder) || 0), 0);
        cat = { id: RAFAYEA.id, name: RAFAYEA.name, icon: RAFAYEA.icon, description: RAFAYEA.description, sortOrder: maxOrder + 1 };
        st.categories.push(cat);
      }
      const have = new Set(st.items.filter(it => it.categoryId === cat.id).map(it => nameKey(it.name)));
      const usedIds = new Set(st.items.map(it => it.id));
      let order = st.items.reduce((m, it) => Math.max(m, Number(it.sortOrder) || 0), 0);
      RAFAYEA_ITEMS.forEach((row, i) => {
        const key = nameKey(row[0]);
        const id = `item-rafayea-${i + 1}`;
        if (have.has(key) || usedIds.has(id)) return;
        have.add(key); usedIds.add(id);
        st.items.push({
          id, categoryId: cat.id, name: row[0], unit: row[1], required: row[2], purchased: 0, unitPrice: null,
          status: "missing", notes: row[3], sortOrder: ++order, createdAt: now, updatedAt: now
        });
      });
      st.seeds.rafayea = true; changed = true;
    }
    return changed;
  }

  function makeInitialState() {
    const now = new Date().toISOString();
    const fresh = {
      version: 1, schema: SCHEMA,
      profile: { name: DEFAULT_BRIDE_NAME, weddingDate: "" },
      totalBudget: null,
      categories: clone(defaultCategories),
      items: defaultItems.map((row, index) => ({
        id: `item-default-${index + 1}`, categoryId: row[0], name: row[1],
        unit: row[2], required: row[3], purchased: 0, unitPrice: null,
        status: "missing", notes: "", sortOrder: index + 1, createdAt: now, updatedAt: now
      })),
      nextId: 1, seeds: {}
    };
    applySeeds(fresh);
    return fresh;
  }

  /* strict=true  : استيراد ملف — يرفض البيانات غير الصحيحة.
     strict=false : تحميل من المتصفح — يصلح بدل ما يفقد (Migration آمنة). */
  function normalizeState(raw, strict = true) {
    if (!raw || typeof raw !== "object" || !Array.isArray(raw.categories) || !Array.isArray(raw.items)) {
      throw new Error("ملف البيانات غير صالح.");
    }
    const categories = raw.categories.map((c, i) => ({
      id: String(c.id || `cat-import-${i}`),
      name: String(c.name || "فئة بدون اسم").slice(0, 60),
      sortOrder: Number.isFinite(Number(c.sortOrder)) ? Number(c.sortOrder) : i + 1,
      icon: ICON_KEYS.includes(c.icon) ? c.icon : "auto",
      description: String(c.description || "").slice(0, 120)
    }));
    const catIds = new Set(categories.map(c => c.id));
    const items = raw.items.map((it, i) => {
      let required = Number(it.required), purchased = Number(it.purchased);
      const price = it.unitPrice === null || it.unitPrice === "" || it.unitPrice === undefined ? null : Number(it.unitPrice);
      const label = it.name || i + 1;
      let categoryId = String(it.categoryId);
      if (!catIds.has(categoryId)) {
        if (strict) throw new Error(`البند "${label}" مرتبط بفئة غير موجودة.`);
        if (!catIds.has(FALLBACK_CAT.id)) { categories.push({ ...FALLBACK_CAT, sortOrder: categories.length + 1, icon: "box", description: "" }); catIds.add(FALLBACK_CAT.id); }
        categoryId = FALLBACK_CAT.id;
      }
      if (!Number.isInteger(required) || required < 0 || !Number.isInteger(purchased) || purchased < 0 || purchased > required) {
        if (strict) throw new Error(`كميات البند "${label}" غير صحيحة.`);
        required = Number.isFinite(required) && required > 0 ? Math.round(required) : 0;
        purchased = Number.isFinite(purchased) && purchased > 0 ? Math.round(purchased) : 0;
        purchased = Math.min(purchased, required);
      }
      let unitPrice = price;
      if (price !== null && (!Number.isFinite(price) || price < 0)) {
        if (strict) throw new Error(`سعر البند "${label}" غير صحيح.`);
        unitPrice = null;
      }
      let status = ["missing", "preparing", "complete"].includes(it.status) ? it.status : "missing";
      if (purchased === required && required > 0) status = "complete";
      else if (purchased > 0 || status === "preparing") status = "preparing";
      else status = "missing";
      return {
        id: String(it.id || `item-import-${i}`), categoryId,
        name: String(it.name || "بند بدون اسم").slice(0, 100), unit: String(it.unit || "قطعة").slice(0, 25),
        required, purchased, unitPrice, status, notes: String(it.notes || "").slice(0, 500),
        sortOrder: Number.isFinite(Number(it.sortOrder)) ? Number(it.sortOrder) : i + 1,
        createdAt: it.createdAt || new Date().toISOString(), updatedAt: it.updatedAt || new Date().toISOString()
      };
    });
    const budget = raw.totalBudget === null || raw.totalBudget === "" || raw.totalBudget === undefined ? null : Number(raw.totalBudget);
    if (budget !== null && (!Number.isFinite(budget) || budget < 0)) {
      if (strict) throw new Error("الميزانية في الملف غير صحيحة.");
    }
    return {
      version: 1, schema: SCHEMA,
      profile: {
        name: String(raw.profile?.name || "").slice(0, 60),
        weddingDate: /^\d{4}-\d{2}-\d{2}$/.test(raw.profile?.weddingDate || "") ? raw.profile.weddingDate : ""
      },
      totalBudget: budget !== null && Number.isFinite(budget) && budget >= 0 ? budget : null,
      categories, items,
      nextId: Math.max(1, Number(raw.nextId) || 1),
      seeds: raw.seeds && typeof raw.seeds === "object" ? { rafayea: raw.seeds.rafayea === true } : {}
    };
  }

  let storageOk = true;
  function load() {
    let raw = null;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (error) { storageOk = false; console.error(error); }
    if (!raw) {
      const fresh = makeInitialState();
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh)); } catch (error) { storageOk = false; }
      return fresh;
    }
    try {
      const parsed = JSON.parse(raw);
      const next = normalizeState(parsed, false);
      const needsSave = (parsed.schema || 1) < SCHEMA;
      const seeded = applySeeds(next); // إضافة «الرفايع» مرة واحدة فقط، دون لمس بيانات المستخدم
      if (needsSave || seeded) { // Migration: نحتفظ بنسخة من البيانات القبل-تحديث أولًا
        try {
          if (localStorage.getItem(STORAGE_KEY + ".pre-v3-backup") === null) localStorage.setItem(STORAGE_KEY + ".pre-v3-backup", raw);
          if ((parsed.schema || 1) < 2 && localStorage.getItem(STORAGE_KEY + ".pre-v2-backup") === null) localStorage.setItem(STORAGE_KEY + ".pre-v2-backup", raw);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch (e) { console.error(e); }
      }
      return next;
    } catch (error) {
      console.error("تعذر تحميل بيانات قائمة العروسة:", error);
      try { localStorage.setItem(`${STORAGE_KEY}.corrupt-${Date.now()}`, raw); } catch (e) { /* ignore */ }
      return makeInitialState();
    }
  }

  let state = load();
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; }
    catch (error) { console.error(error); return false; }
  }
  /* أي تعديل يُعتبر ناجحًا فقط لو اتحفظ فعلًا؛ وإلا نرجع للحالة السابقة. */
  function commit(mutator, failMessage = "المتصفح لم يستطع حفظ البيانات. تأكدي من المساحة المتاحة وأن التخزين غير معطّل.") {
    const snapshot = clone(state);
    try {
      const result = mutator();
      if (!save()) throw new Error(failMessage);
      return result;
    } catch (error) { state = snapshot; throw error; }
  }
  function createId(prefix) { return `${prefix}-${Date.now().toString(36)}-${state.nextId++}`; }
  function cleanIcon(icon) { return ICON_KEYS.includes(icon) ? icon : "auto"; }
  function checkCategoryName(name, exceptId) {
    const clean = String(name || "").trim();
    if (!clean) throw new Error("اكتبي اسم الفئة.");
    if (state.categories.some(c => c.id !== exceptId && c.name.toLocaleLowerCase() === clean.toLocaleLowerCase())) throw new Error("الفئة دي موجودة بالفعل.");
    return clean.slice(0, 60);
  }

  window.BrideStore = {
    ICON_KEYS, DEFAULT_BRIDE_NAME,
    isPersistent: () => storageOk,
    getState: () => clone(state),
    save,
    updateProfile(profile) { return commit(() => { state.profile = { ...state.profile, ...profile }; }); },
    setBudget(value) { return commit(() => { state.totalBudget = value; }); },
    addCategory(name, opts = {}) {
      const clean = checkCategoryName(name);
      return commit(() => {
        const cat = { id: createId("cat"), name: clean, sortOrder: state.categories.length + 1, icon: cleanIcon(opts.icon), description: String(opts.description || "").trim().slice(0, 120) };
        state.categories.push(cat);
        return clone(cat);
      });
    },
    updateCategory(id, opts) {
      const cat = state.categories.find(c => c.id === id);
      if (!cat) throw new Error("الفئة غير موجودة.");
      const clean = checkCategoryName(opts.name, id);
      return commit(() => {
        cat.name = clean; cat.icon = cleanIcon(opts.icon);
        cat.description = String(opts.description || "").trim().slice(0, 120);
        return clone(cat);
      });
    },
    addItem(data) {
      const item = this.validateItem(data);
      return commit(() => {
        item.id = createId("item");
        item.createdAt = item.updatedAt = new Date().toISOString();
        item.sortOrder = state.items.length + 1;
        state.items.push(item);
        return clone(item);
      });
    },
    updateItem(id, data) {
      const index = state.items.findIndex(it => it.id === id);
      if (index < 0) throw new Error("البند غير موجود.");
      const item = this.validateItem(data);
      return commit(() => {
        state.items[index] = { ...state.items[index], ...item, id, updatedAt: new Date().toISOString() };
        return clone(state.items[index]);
      });
    },
    validateItem(data) {
      const name = String(data.name || "").trim();
      if (!name) throw new Error("اكتبي اسم البند.");
      if (!state.categories.some(c => c.id === data.categoryId)) throw new Error("اختاري فئة صحيحة.");
      const required = Number(data.required), purchased = Number(data.purchased);
      if (!Number.isInteger(required) || required < 0) throw new Error("الكمية المطلوبة لازم تكون رقمًا صحيحًا يساوي صفر أو أكبر.");
      if (!Number.isInteger(purchased) || purchased < 0) throw new Error("الكمية المشتراة لازم تكون رقمًا صحيحًا يساوي صفر أو أكبر.");
      if (purchased > required) throw new Error("الكمية المشتراة لا يمكن أن تتجاوز الكمية المطلوبة.");
      const unitPrice = data.unitPrice === "" || data.unitPrice === null || data.unitPrice === undefined ? null : Number(data.unitPrice);
      if (unitPrice !== null && (!Number.isFinite(unitPrice) || unitPrice < 0)) throw new Error("سعر الوحدة لازم يكون صفر أو أكبر.");
      let status = data.status;
      if (required > 0 && purchased === required) status = "complete";
      else if (purchased > 0) status = "preparing";
      else if (status === "complete") status = "missing";
      if (!["missing", "preparing", "complete"].includes(status)) status = "missing";
      return {
        name: name.slice(0, 100), categoryId: data.categoryId,
        unit: String(data.unit || "قطعة").trim().slice(0, 25) || "قطعة",
        required, purchased, unitPrice, status, notes: String(data.notes || "").trim().slice(0, 500)
      };
    },
    deleteItem(id) { commit(() => { state.items = state.items.filter(it => it.id !== id); }, "تعذر حفظ التغيير."); },
    deleteCategory(id) {
      if (state.items.some(it => it.categoryId === id)) throw new Error("انقلي أو احذفي البنود الموجودة داخل الفئة الأول.");
      commit(() => { state.categories = state.categories.filter(c => c.id !== id); }, "تعذر حفظ التغيير.");
    },
    exportData() { return JSON.stringify({ ...clone(state), exportedAt: new Date().toISOString(), app: "قائمة العروسة" }, null, 2); },
    importData(raw) {
      const next = normalizeState(raw, true);
      applySeeds(next);
      commit(() => { state = next; }, "تعذر حفظ النسخة المستوردة في المتصفح.");
    },
    reset() { commit(() => { state = makeInitialState(); }, "تعذر إعادة ضبط البيانات."); }
  };
})();
