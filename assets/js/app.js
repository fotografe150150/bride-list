(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const store = window.BrideStore, calc = window.BrideCalc, Icons = window.BrideIcons;
  const ico = (name, cls) => Icons.svg(name, cls);
  const n = v => new Intl.NumberFormat("ar-EG").format(v);
  const money = v => new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 }).format(v) + " ج.م";
  const statusLabels = { missing: "لم يبدأ", preparing: "قيد التجهيز", complete: "مكتمل" };
  const statusIcon = { missing: "notstarted", preparing: "clock", complete: "check" };
  const catStateLabels = { empty: "فارغة", missing: "لم تبدأ", preparing: "قيد التجهيز", complete: "مكتملة" };
  const catStateIcon = { empty: "plus", missing: "notstarted", preparing: "clock", complete: "check" };
  const TONES = ["rose", "beige", "mauve", "sage", "peach", "plum"];
  const VIEWS = ["dashboard", "categories", "category", "items", "budget", "settings"];
  const TITLES = { dashboard: "الرئيسية", categories: "الفئات", category: "تفاصيل الفئة", items: "كل البنود", budget: "الميزانية", settings: "الإعدادات" };

  let currentView = "dashboard", currentCatId = "";
  let toastTimer;
  const itemFilters = { q: "", cat: "", status: "" };
  let categoryQuery = "";
  const detailFilters = {};        // حالة البحث والتصفية لكل فئة (تتحفظ عند الرجوع)
  const lastPercent = {};          // لتحريك شريط التقدم عند التحديث

  const state = () => store.getState();
  const brideName = s => (s.profile.name || "").trim() || store.DEFAULT_BRIDE_NAME;
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const sortedCats = s => s.categories.slice().sort((a, b) => a.sortOrder - b.sortOrder);
  const catById = (s, id) => s.categories.find(c => c.id === id);
  const catName = (s, id) => catById(s, id)?.name || "فئة محذوفة";
  const toneOf = (s, cat) => TONES[Math.max(0, sortedCats(s).findIndex(c => c.id === cat.id)) % TONES.length];
  const itemsOf = (s, id) => s.items.filter(it => it.categoryId === id).sort((a, b) => a.sortOrder - b.sortOrder);
  const displayCost = o => (o.incomplete ? `${money(o.total)}*` : money(o.total));
  const matches = (s, it, q) => !q || `${it.name} ${it.notes} ${it.unit} ${catName(s, it.categoryId)}`.toLocaleLowerCase().includes(q);

  function toast(message, ms = 2800) {
    const el = $("toast"); el.textContent = message; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), ms);
  }

  /* ---------- التوجيه (Hash) : الرجوع في المتصفح/الموبايل يشتغل طبيعي ---------- */
  function navigate(hash) { if (location.hash === hash) applyRoute(); else location.hash = hash; }
  function applyRoute() {
    const parts = location.hash.replace(/^#\/?/, "").split("/");
    let view = VIEWS.includes(parts[0]) ? parts[0] : "dashboard";
    let id = parts[1] ? decodeURIComponent(parts[1]) : "";
    if (view === "category" && !catById(state(), id)) view = "categories";
    currentView = view; currentCatId = view === "category" ? id : "";
    document.querySelectorAll(".view").forEach(el => el.classList.toggle("active", el.id === `view-${view}`));
    const navKey = view === "category" ? "categories" : view;
    document.querySelectorAll("[data-nav]").forEach(el => {
      const on = el.dataset.nav === navKey; el.classList.toggle("active", on);
      if (on) el.setAttribute("aria-current", "page"); else el.removeAttribute("aria-current");
    });
    $("pageTitle").textContent = TITLES[view];
    render();
    window.scrollTo(0, 0);
  }

  /* ---------- مكوّنات العرض ---------- */
  function categoryCard(s, cat, sum) {
    const st = calc.categoryState(sum), icon = Icons.iconFor(cat);
    return `<a class="cat-card tone-${toneOf(s, cat)}" href="#/category/${encodeURIComponent(cat.id)}" aria-label="${esc(cat.name)}: ${n(sum.percent)}% إنجاز">
      <div class="cat-top"><span class="cat-icon">${ico(icon)}</span><span class="cat-badge cs-${st}">${ico(catStateIcon[st])}${catStateLabels[st]}</span></div>
      <h3 class="cat-name">${esc(cat.name)}</h3>
      <div class="cat-percent"><strong>${n(sum.percent)}%</strong><span>إنجاز</span></div>
      <div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${sum.percent}"><span style="width:${sum.percent}%"></span></div>
      <dl class="cat-counts"><div><dt>البنود</dt><dd>${n(sum.total)}</dd></div><div><dt>مكتمل</dt><dd>${n(sum.complete)}</dd></div><div><dt>لم يكتمل</dt><dd>${n(sum.incomplete)}</dd></div></dl>
    </a>`;
  }
  function itemCard(s, it, showCategory) {
    const st = calc.itemStatus(it), rem = calc.remaining(it), pct = calc.percentOf(it.purchased, it.required);
    const nm = esc(it.name), unit = esc(it.unit);
    return `<article class="item-card st-${st}">
      <span class="item-state-icon">${ico(statusIcon[st])}</span>
      <div class="item-info">
        <div class="item-title"><h3>${nm}</h3><span class="pill st-${st}">${ico(statusIcon[st])}${statusLabels[st]}</span></div>
        <p class="item-sub">${showCategory ? `<span class="chip">${esc(catName(s, it.categoryId))}</span>` : ""}<span>تم شراء ${n(it.purchased)} من ${n(it.required)} ${unit}</span><span>المتبقي <b>${n(rem)}</b> ${unit}</span>${it.unitPrice === null ? "" : `<span>${money(it.unitPrice)} للوحدة</span>`}</p>
        ${it.notes ? `<p class="item-notes">${esc(it.notes)}</p>` : ""}
        <div class="mini-track"><span style="width:${pct}%"></span></div>
      </div>
      <div class="item-controls">
        <div class="stepper" role="group" aria-label="الكمية المشتراة من ${nm}">
          <button type="button" data-step="dec" data-id="${esc(it.id)}" aria-label="تقليل الكمية المشتراة من ${nm}" ${it.purchased <= 0 ? "disabled" : ""}>${ico("minus")}</button>
          <output>${n(it.purchased)}</output>
          <button type="button" data-step="inc" data-id="${esc(it.id)}" aria-label="زيادة الكمية المشتراة من ${nm}" ${it.purchased >= it.required ? "disabled" : ""}>${ico("plus")}</button>
        </div>
        <div class="item-actions">
          <button type="button" class="mini-button" data-edit="${esc(it.id)}" title="تعديل" aria-label="تعديل ${nm}">${ico("edit")}</button>
          <button type="button" class="mini-button delete" data-delete="${esc(it.id)}" title="حذف" aria-label="حذف ${nm}">${ico("trash")}</button>
        </div>
      </div>
    </article>`;
  }
  function fillCategorySelects() {
    const s = state();
    const options = sortedCats(s).map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
    const keep = $("itemCategory").value;
    $("itemCategory").innerHTML = options;
    if (s.categories.some(c => c.id === keep)) $("itemCategory").value = keep;
    $("categoryFilter").innerHTML = `<option value="">كل الفئات</option>${options}`;
    $("categoryFilter").value = s.categories.some(c => c.id === itemFilters.cat) ? itemFilters.cat : "";
  }

  /* ---------- الرئيسية ---------- */
  function renderHero(s) {
    const days = calc.daysUntil(s.profile.weddingDate);
    const count = $("heroCount"), days$ = $("heroDays"), unit = $("heroUnit"), msg = $("heroMessage");
    $("heroButtonText").textContent = days === null ? "تحديد موعد الفرح" : "تعديل موعد الفرح";
    count.classList.remove("hidden");
    if (days === null) {
      count.classList.add("hidden");
      msg.textContent = "حددي موعد الفرح من الإعدادات علشان نبدأ العد التنازلي لأجمل يوم.";
    } else if (days > 0) {
      const [y, m, d] = s.profile.weddingDate.split("-").map(Number);
      days$.textContent = n(days);
      unit.textContent = days === 1 ? "يوم واحد باقي" : days === 2 ? "يومين باقيين" : days <= 10 ? "أيام باقية" : "يوم باقي";
      msg.textContent = `موعد الفرح ${new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "long", year: "numeric" }).format(new Date(y, m - 1, d))}. كل يوم بيقربك من حلمك.`;
    } else if (days === 0) {
      days$.textContent = "النهارده يومك!"; unit.textContent = "";
      msg.textContent = "نتمنالك يوم مليان فرحة وذكريات حلوة.";
    } else {
      count.classList.add("hidden");
      msg.textContent = "ألف مبروك على يومك الجميل! لو حبيتي تبدأي عدّ جديد، حدّثي الموعد من الإعدادات.";
    }
  }
  function renderDashboard() {
    const s = state(), sum = calc.summarize(s.items), cost = calc.costs(s.items);
    $("welcomeName").textContent = brideName(s);
    $("totalItems").textContent = n(sum.total);
    $("completedItems").textContent = n(sum.complete);
    $("remainingItems").textContent = n(sum.incomplete);
    $("progressPercent").textContent = n(sum.percent) + "%";
    $("progressBig").textContent = n(sum.percent) + "%";
    $("progressBar").style.width = sum.percent + "%";
    $("budgetLimit").textContent = s.totalBudget === null ? "لم تُحدد بعد" : money(s.totalBudget);
    $("requiredCost").textContent = displayCost(cost.requiredCost);
    $("purchasedCost").textContent = displayCost(cost.purchasedCost);
    $("remainingCost").textContent = displayCost(cost.remainingCost);
    $("encouragementText").textContent = sum.total === 0 ? "ابدئي بإضافة أول بند في قائمتك، والباقي هيبقى أسهل."
      : sum.percent === 100 ? "برافو عليكي! كل الكميات المطلوبة اتسجلت كمشتراة."
      : `خلصتي ${n(sum.percent)}% من الكميات. خطوة صغيرة كل يوم هتفرق.`;
    renderHero(s);
    $("dashCategories").innerHTML = sortedCats(s).map(c => categoryCard(s, c, calc.summarize(itemsOf(s, c.id)))).join("") || `<div class="empty-inline">لسه مفيش فئات.</div>`;
    const attention = s.items.filter(it => calc.itemStatus(it) !== "complete").slice(0, 4);
    $("attentionList").innerHTML = attention.length ? attention.map(it => {
      const st = calc.itemStatus(it), cat = catById(s, it.categoryId);
      return `<a class="attention-row" href="#/category/${encodeURIComponent(it.categoryId)}"><span class="mini-ic tone-${cat ? toneOf(s, cat) : "beige"}">${ico(Icons.iconFor(cat))}</span><div class="attention-main"><strong>${esc(it.name)}</strong><small>${esc(catName(s, it.categoryId))} · متبقي ${n(calc.remaining(it))} ${esc(it.unit)}</small></div><span class="pill st-${st}">${ico(statusIcon[st])}${statusLabels[st]}</span></a>`;
    }).join("") : `<div class="empty-inline">${s.items.length ? "كل البنود مكتملة حسب الكميات المسجلة، عاش!" : "لسه مفيش بنود. أضيفي أول بند وابدئي رحلتك."}</div>`;
  }

  /* ---------- الفئات ---------- */
  function renderCategories() {
    const s = state(), q = categoryQuery;
    const cats = sortedCats(s).filter(c => !q || `${c.name} ${c.description || ""}`.toLocaleLowerCase().includes(q));
    $("categoriesGrid").innerHTML = cats.map(c => categoryCard(s, c, calc.summarize(itemsOf(s, c.id)))).join("");
    $("emptyCategories").classList.toggle("hidden", cats.length !== 0);
    $("categoriesGrid").classList.toggle("hidden", cats.length === 0);
  }

  /* ---------- تفاصيل الفئة ---------- */
  function renderCategoryDetail() {
    const s = state(), cat = catById(s, currentCatId); if (!cat) return;
    const all = itemsOf(s, cat.id), sum = calc.summarize(all), tone = toneOf(s, cat);
    const f = detailFilters[cat.id] || (detailFilters[cat.id] = { q: "", status: "" });
    $("pageTitle").textContent = cat.name;
    $("detailHead").innerHTML = `
      <a class="back-link" href="#/categories">${ico("back")} رجوع إلى الفئات</a>
      <div class="detail-main tone-${tone}">
        <span class="cat-icon big">${ico(Icons.iconFor(cat))}</span>
        <div class="detail-title"><h1>${esc(cat.name)}</h1><p class="muted">${esc(cat.description || "كل بنود الفئة ومتابعة إنجازها في مكان واحد.")}</p></div>
        <div class="detail-actions">
          <button type="button" class="primary-button" data-add-here>${ico("plus")} إضافة بند</button>
          <button type="button" class="icon-btn" data-edit-cat title="تعديل الفئة" aria-label="تعديل الفئة">${ico("edit")}</button>
          <button type="button" class="icon-btn danger" data-del-cat title="حذف الفئة" aria-label="حذف الفئة">${ico("trash")}</button>
        </div>
      </div>`;
    const tile = (cls, icon, label, value, note) => `<div class="tile ${cls}"><span class="tile-ic">${ico(icon)}</span><strong>${value}</strong><span class="tile-label">${label}</span>${note ? `<small>${note}</small>` : ""}</div>`;
    $("detailStats").innerHTML =
      tile("t-pct", "sparkles", "نسبة الإنجاز", n(sum.percent) + "%") +
      tile("st-complete", "check", "البنود المكتملة", n(sum.complete)) +
      tile("st-preparing", "clock", "قيد التجهيز", n(sum.preparing)) +
      tile("st-missing", "notstarted", "لم يبدأ", n(sum.missing)) +
      tile("t-total", "list", "إجمالي البنود", n(sum.total)) +
      tile("t-rem", "box", "الكميات المتبقية", n(sum.remainingQty));
    const prev = lastPercent[cat.id] ?? 0;
    $("detailProgress").innerHTML = `
      <div class="bp-top"><div><h3>إنجاز ${esc(cat.name)}</h3><p class="muted">تم شراء ${n(sum.purchasedQty)} من ${n(sum.requiredQty)} من الكميات المطلوبة</p></div><strong class="bp-num">${n(sum.percent)}%</strong></div>
      <div class="progress-track big" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${sum.percent}" aria-label="نسبة إنجاز الفئة"><span id="bigBar" style="width:${prev}%"></span></div>`;
    lastPercent[cat.id] = sum.percent;
    requestAnimationFrame(() => requestAnimationFrame(() => { const b = $("bigBar"); if (b) b.style.width = sum.percent + "%"; }));

    $("detailSearch").value = f.q; $("detailStatus").value = f.status;
    const q = f.q.trim().toLocaleLowerCase();
    const list = all.filter(it => matches(s, it, q) && (!f.status || calc.itemStatus(it) === f.status));
    $("detailSummary").textContent = `عرض ${n(list.length)} من ${n(all.length)} بند`;
    $("detailList").innerHTML = list.map(it => itemCard(s, it, false)).join("");
    $("detailList").classList.toggle("hidden", list.length === 0);
    const empty = $("detailEmpty");
    empty.classList.toggle("hidden", list.length !== 0);
    if (!all.length) empty.innerHTML = `<div class="empty-illustration">${ico(Icons.iconFor(cat))}</div><h3>الفئة دي لسه فاضية</h3><p>ابدئي بإضافة أول بند في ${esc(cat.name)}.</p><button type="button" class="primary-button" data-add-here>${ico("plus")} إضافة بند</button>`;
    else if (!list.length) empty.innerHTML = `<div class="empty-illustration">${ico("search")}</div><h3>مفيش نتائج</h3><p>غيّري كلمة البحث أو الحالة.</p>`;
  }

  /* ---------- كل البنود ---------- */
  function renderItems() {
    const s = state(), q = itemFilters.q;
    $("searchInput").value = itemFilters.q; $("statusFilter").value = itemFilters.status;
    const list = s.items.filter(it => matches(s, it, q) && (!itemFilters.cat || it.categoryId === itemFilters.cat) && (!itemFilters.status || calc.itemStatus(it) === itemFilters.status)).sort((a, b) => a.sortOrder - b.sortOrder);
    $("itemsSummary").textContent = `عرض ${n(list.length)} من ${n(s.items.length)} بند`;
    $("itemsList").innerHTML = list.map(it => itemCard(s, it, true)).join("");
    $("emptyItems").classList.toggle("hidden", list.length !== 0);
    $("itemsList").classList.toggle("hidden", list.length === 0);
  }

  /* ---------- الميزانية والإعدادات ---------- */
  function renderBudget() {
    const s = state(), cost = calc.costs(s.items);
    $("budgetInput").value = s.totalBudget === null ? "" : s.totalBudget;
    $("budgetRequired").textContent = displayCost(cost.requiredCost);
    $("budgetPurchased").textContent = displayCost(cost.purchasedCost);
    $("budgetRemaining").textContent = displayCost(cost.remainingCost);
    const box = $("budgetStatus");
    if (s.totalBudget === null) {
      box.className = "budget-status"; box.innerHTML = `<span class="status-badge">لم تُحدد ميزانية بعد</span><p>حددي الميزانية الإجمالية علشان يظهر تقدير الموقف.</p>`;
    } else if (cost.requiredCost.incomplete) {
      box.className = "budget-status"; box.innerHTML = `<span class="status-badge">التكلفة غير مكتملة</span><p>في بنود من غير سعر وحدة. سجلي أسعارها علشان تقارني تكلفة القائمة بميزانيتك. المجموع الحالي يشمل البنود المسعّرة فقط.</p>`;
    } else {
      const diff = s.totalBudget - cost.requiredCost.total;
      box.className = `budget-status ${diff >= 0 ? "good" : "over"}`;
      box.innerHTML = `<span class="status-badge">${diff >= 0 ? "داخل الميزانية" : "أعلى من الميزانية"}</span><p>${diff >= 0 ? `متبقي ${money(diff)} من ميزانيتك بعد تقدير كل البنود.` : `القائمة أعلى من الميزانية بحوالي ${money(Math.abs(diff))}. راجعي الأولويات والأسعار.`}</p>`;
    }
    const rows = s.categories.map(cat => {
      const items = itemsOf(s, cat.id), priced = items.filter(it => it.unitPrice !== null);
      return { cat, items, priced, total: priced.reduce((sum, it) => sum + it.required * it.unitPrice, 0) };
    }).filter(x => x.items.length).sort((a, b) => b.total - a.total);
    $("categoryCostList").innerHTML = rows.length ? rows.map(x => `<a class="cost-row" href="#/category/${encodeURIComponent(x.cat.id)}"><span class="mini-ic tone-${toneOf(s, x.cat)}">${ico(Icons.iconFor(x.cat))}</span><div><strong>${esc(x.cat.name)}</strong><small>${n(x.priced.length)} من ${n(x.items.length)} بند له سعر مسجل</small></div><strong class="cost-value">${x.priced.length ? money(x.total) : "غير مكتملة"}${x.priced.length < x.items.length ? "*" : ""}</strong></a>`).join("") : `<div class="empty-inline">أضيفي بنود وسجلي أسعارها علشان تظهر تكلفة الفئات.</div>`;
  }
  function renderSettings() { const s = state(); $("nameInput").value = brideName(s); $("weddingDateInput").value = s.profile.weddingDate; }

  function render() {
    const s = state();
    $("avatarBtn").textContent = brideName(s).charAt(0) || "چ";
    fillCategorySelects();
    ({ dashboard: renderDashboard, categories: renderCategories, category: renderCategoryDetail, items: renderItems, budget: renderBudget, settings: renderSettings })[currentView]();
  }

  /* ---------- نافذة البند ---------- */
  function syncItemForm() {
    const r = parseInt($("itemRequired").value, 10), p = parseInt($("itemPurchased").value, 10), sel = $("itemStatus");
    $("itemPurchased").max = Number.isFinite(r) ? String(r) : "";
    if (!Number.isFinite(r) || !Number.isFinite(p)) return;
    if (r > 0 && p >= r) sel.value = "complete";
    else if (p > 0) sel.value = "preparing";
    else if (sel.value === "complete") sel.value = "missing";
  }
  function openItemDialog(id = "", presetCat = "") {
    const s = state();
    if (!s.categories.length) { openCategoryDialog(); toast("ضيفي فئة الأول علشان تضيفي بند."); return; }
    $("itemForm").reset(); $("itemId").value = id || "";
    $("itemRequired").value = "1"; $("itemPurchased").value = "0"; $("itemUnit").value = "قطعة"; $("itemPrice").value = ""; $("itemStatus").value = "missing";
    fillCategorySelects();
    if (id) {
      const item = s.items.find(it => it.id === id); if (!item) return;
      $("dialogTitle").textContent = "تعديل البند";
      $("itemName").value = item.name; $("itemCategory").value = item.categoryId; $("itemUnit").value = item.unit;
      $("itemRequired").value = item.required; $("itemPurchased").value = item.purchased;
      $("itemPrice").value = item.unitPrice === null ? "" : item.unitPrice; $("itemStatus").value = calc.itemStatus(item); $("itemNotes").value = item.notes;
    } else {
      $("dialogTitle").textContent = "إضافة بند جديد";
      const preset = presetCat || (currentView === "category" ? currentCatId : "");
      if (preset && s.categories.some(c => c.id === preset)) $("itemCategory").value = preset;
    }
    $("itemPurchased").max = $("itemRequired").value;
    $("itemDialog").showModal();
  }
  const closeItemDialog = () => $("itemDialog").close();
  function handleItemSubmit(event) {
    event.preventDefault();
    const data = { name: $("itemName").value, categoryId: $("itemCategory").value, unit: $("itemUnit").value, required: $("itemRequired").value, purchased: $("itemPurchased").value, unitPrice: $("itemPrice").value, status: $("itemStatus").value, notes: $("itemNotes").value };
    try {
      const id = $("itemId").value;
      if (id) store.updateItem(id, data); else store.addItem(data);
      closeItemDialog(); render(); toast(id ? "تم تحديث البند بنجاح." : "اتضاف البند لقائمتك.");
    } catch (error) { toast(error.message || "حصلت مشكلة أثناء الحفظ.", 4200); }
  }

  /* ---------- نافذة الفئة ---------- */
  function openCategoryDialog(id = "") {
    const s = state(), cat = id ? catById(s, id) : null;
    $("categoryForm").reset(); $("categoryId").value = cat ? cat.id : "";
    $("categoryDialogTitle").textContent = cat ? "تعديل الفئة" : "إضافة فئة جديدة";
    $("categoryName").value = cat ? cat.name : ""; $("categoryDesc").value = cat ? cat.description || "" : "";
    const chosen = cat && cat.icon ? cat.icon : "auto";
    $("iconPicker").innerHTML = store.ICON_KEYS.map(k => `<label class="icon-opt"><input type="radio" name="catIcon" value="${k}" ${k === chosen ? "checked" : ""}><span title="${k === "auto" ? "تلقائي حسب الاسم" : ""}">${k === "auto" ? `<em>تلقائي</em>` : ico(k)}</span></label>`).join("");
    $("categoryDialog").showModal();
  }
  const closeCategoryDialog = () => $("categoryDialog").close();
  function handleCategorySubmit(event) {
    event.preventDefault();
    const opts = { description: $("categoryDesc").value, icon: document.querySelector("input[name=catIcon]:checked")?.value || "auto" };
    try {
      const id = $("categoryId").value;
      const cat = id ? store.updateCategory(id, { name: $("categoryName").value, ...opts }) : store.addCategory($("categoryName").value, opts);
      closeCategoryDialog(); render();
      if (!id && $("itemDialog").open) $("itemCategory").value = cat.id;
      toast(id ? "تم تحديث الفئة." : "تمت إضافة الفئة.");
    } catch (error) { toast(error.message || "تعذر حفظ الفئة.", 4200); }
  }
  function deleteCurrentCategory() {
    const s = state(), cat = catById(s, currentCatId); if (!cat) return;
    if (itemsOf(s, cat.id).length) { toast("انقلي أو احذفي البنود الموجودة داخل الفئة الأول.", 4200); return; }
    if (!confirm(`متأكدة إنك عايزة تحذفي فئة "${cat.name}"؟`)) return;
    try { store.deleteCategory(cat.id); delete detailFilters[cat.id]; toast("تم حذف الفئة."); navigate("#/categories"); }
    catch (error) { toast(error.message || "تعذر حذف الفئة.", 4200); }
  }

  /* ---------- إجراءات البنود (تفويض الأحداث) ---------- */
  function handleItemAction(e) {
    const edit = e.target.closest("[data-edit]"), del = e.target.closest("[data-delete]"), step = e.target.closest("[data-step]");
    const s = state();
    if (edit) openItemDialog(edit.dataset.edit);
    else if (del) {
      const item = s.items.find(it => it.id === del.dataset.delete); if (!item) return;
      if (confirm(`متأكدة إنك عايزة تحذفي "${item.name}"؟`)) {
        try { store.deleteItem(item.id); render(); toast("تم حذف البند."); } catch (error) { toast(error.message || "تعذر حذف البند.", 4200); }
      }
    } else if (step && !step.disabled) {
      const item = s.items.find(it => it.id === step.dataset.id); if (!item) return;
      const next = Math.min(item.required, Math.max(0, item.purchased + (step.dataset.step === "inc" ? 1 : -1)));
      try {
        store.updateItem(item.id, { ...item, purchased: next, status: next === 0 ? "missing" : item.status });
        render();
        const again = document.querySelector(`[data-step="${step.dataset.step}"][data-id="${CSS.escape(item.id)}"]:not([disabled])`); if (again) again.focus({ preventScroll: true });
      } catch (error) { toast(error.message || "تعذر تحديث الكمية.", 4200); }
    }
  }

  /* ---------- النسخ الاحتياطي ---------- */
  function exportData() {
    const blob = new Blob([store.exportData()], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob), link = document.createElement("a");
    link.href = url; link.download = `قائمة-العروسة-نسخة-احتياطية-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("جهزنا ملف النسخة الاحتياطية.");
  }
  async function importData(file) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!confirm("استعادة النسخة هتستبدل البيانات الحالية. متأكدة إنك عايزة تكملي؟")) return;
      store.importData(parsed); render(); toast("تمت استعادة النسخة الاحتياطية.");
    } catch (error) { toast(error instanceof SyntaxError ? "الملف غير صالح أو تعذر استيراده." : (error.message || "تعذر استيراد الملف."), 4200); }
    finally { $("importInput").value = ""; }
  }
  function resetData() {
    if (!confirm("ده هيمسح كل البنود والفئات والإعدادات المحفوظة في المتصفح ويرجع القائمة الافتراضية. هل أنتِ متأكدة؟")) return;
    if (!confirm("تأكيد أخير: صدّري نسخة احتياطية لو محتاجة تحتفظي ببياناتك. نكمل المسح؟")) return;
    try { store.reset(); Object.keys(detailFilters).forEach(k => delete detailFilters[k]); toast("تمت إعادة ضبط القائمة."); navigate("#/dashboard"); }
    catch (error) { toast(error.message || "تعذر مسح البيانات.", 4200); }
  }

  /* ---------- الربط ---------- */
  function bind() {
    window.addEventListener("hashchange", applyRoute);
    $("addFirstItem").addEventListener("click", () => openItemDialog());
    $("addItemButton").addEventListener("click", () => openItemDialog());
    $("emptyAddButton").addEventListener("click", () => openItemDialog());
    $("addCategoryButton").addEventListener("click", () => openCategoryDialog());
    $("addCategoryInline").addEventListener("click", () => openCategoryDialog());
    $("closeDialog").addEventListener("click", closeItemDialog); $("cancelDialog").addEventListener("click", closeItemDialog);
    $("closeCategoryDialog").addEventListener("click", closeCategoryDialog); $("cancelCategory").addEventListener("click", closeCategoryDialog);
    $("itemForm").addEventListener("submit", handleItemSubmit);
    $("categoryForm").addEventListener("submit", handleCategorySubmit);
    ["itemRequired", "itemPurchased", "itemStatus"].forEach(id => $(id).addEventListener("input", syncItemForm));
    $("itemStatus").addEventListener("change", syncItemForm);
    $("itemDialog").addEventListener("click", e => { if (e.target === $("itemDialog")) closeItemDialog(); });
    $("categoryDialog").addEventListener("click", e => { if (e.target === $("categoryDialog")) closeCategoryDialog(); });

    $("categorySearch").addEventListener("input", e => { categoryQuery = e.target.value.trim().toLocaleLowerCase(); renderCategories(); });
    $("searchInput").addEventListener("input", e => { itemFilters.q = e.target.value.trim().toLocaleLowerCase(); renderItems(); });
    $("categoryFilter").addEventListener("change", e => { itemFilters.cat = e.target.value; renderItems(); });
    $("statusFilter").addEventListener("change", e => { itemFilters.status = e.target.value; renderItems(); });
    $("detailSearch").addEventListener("input", e => { (detailFilters[currentCatId] ||= { q: "", status: "" }).q = e.target.value; renderCategoryDetail(); });
    $("detailStatus").addEventListener("change", e => { (detailFilters[currentCatId] ||= { q: "", status: "" }).status = e.target.value; renderCategoryDetail(); });

    $("itemsList").addEventListener("click", handleItemAction);
    $("detailList").addEventListener("click", handleItemAction);
    $("view-category").addEventListener("click", e => {
      if (e.target.closest("[data-add-here]")) openItemDialog("", currentCatId);
      else if (e.target.closest("[data-edit-cat]")) openCategoryDialog(currentCatId);
      else if (e.target.closest("[data-del-cat]")) deleteCurrentCategory();
    });

    $("profileForm").addEventListener("submit", e => {
      e.preventDefault();
      const date = $("weddingDateInput").value;
      if (date && calc.daysUntil(date) === null) { toast("راجعي تاريخ الفرح."); return; }
      try { store.updateProfile({ name: $("nameInput").value.trim(), weddingDate: date }); render(); toast("تم حفظ بياناتك."); }
      catch (error) { toast(error.message || "تعذر حفظ البيانات.", 4200); }
    });
    $("saveBudgetButton").addEventListener("click", () => {
      const val = $("budgetInput").value;
      try {
        if (val.trim() === "") { store.setBudget(null); renderBudget(); toast("تم مسح الميزانية المحددة."); return; }
        const num = Number(val); if (!Number.isFinite(num) || num < 0) { toast("اكتبي ميزانية صحيحة أكبر من أو تساوي صفر."); return; }
        store.setBudget(num); renderBudget(); toast("تم حفظ الميزانية.");
      } catch (error) { toast(error.message || "تعذر حفظ الميزانية.", 4200); }
    });
    $("exportButton").addEventListener("click", exportData);
    $("importInput").addEventListener("change", e => importData(e.target.files?.[0]));
    $("resetButton").addEventListener("click", resetData);
    setInterval(() => { if (currentView === "dashboard") renderHero(state()); }, 60000); // تحديث العد بعد منتصف الليل
  }

  Icons.hydrate();
  bind();
  applyRoute();
  if (!store.isPersistent()) toast("تنبيه: المتصفح لا يسمح بحفظ البيانات حاليًا، فلن تبقى بعد إغلاق الصفحة.", 6000);
})();
