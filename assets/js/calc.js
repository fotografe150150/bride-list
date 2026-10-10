/* وحدة الحسابات الوحيدة: تُستخدم في الرئيسية والفئات وصفحة الفئة والميزانية. لا تلمس التخزين. */
(() => {
  const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

  /* حالة البند تُشتق دائمًا من الكميات (مع استثناء «قيد التجهيز» اليدوي عندما المشترى = 0). */
  function itemStatus(it) {
    const required = Math.max(0, num(it.required));
    const purchased = Math.min(Math.max(0, num(it.purchased)), required);
    if (required > 0 && purchased >= required) return "complete";
    if (purchased > 0) return "preparing";
    return it.status === "preparing" ? "preparing" : "missing";
  }
  const remaining = it => Math.max(0, num(it.required) - num(it.purchased));

  /* نسبة الإنجاز = مجموع المشترى ÷ مجموع المطلوب × 100 (0% لو المطلوب صفر). */
  function percentOf(purchased, required) {
    if (required <= 0) return 0;
    if (purchased >= required) return 100;
    return Math.min(99, Math.round((purchased / required) * 100));
  }

  function summarize(items) {
    const out = { total: items.length, complete: 0, preparing: 0, missing: 0, requiredQty: 0, purchasedQty: 0, remainingQty: 0, percent: 0 };
    for (const it of items) {
      out[itemStatus(it)]++;
      out.requiredQty += num(it.required);
      out.purchasedQty += Math.min(num(it.purchased), num(it.required));
    }
    out.remainingQty = out.requiredQty - out.purchasedQty;
    out.percent = percentOf(out.purchasedQty, out.requiredQty);
    out.incomplete = out.total - out.complete;
    return out;
  }

  /* حالة الفئة كمؤشر بصري */
  function categoryState(sum) {
    if (!sum.total) return "empty";
    if (sum.complete === sum.total) return "complete";
    if (sum.purchasedQty > 0 || sum.preparing > 0) return "preparing";
    return "missing";
  }

  function cost(items, qtyOf) {
    const priced = items.filter(it => it.unitPrice !== null && it.unitPrice !== undefined);
    return { total: priced.reduce((s, it) => s + qtyOf(it) * it.unitPrice, 0), incomplete: priced.length !== items.length, pricedCount: priced.length };
  }
  function costs(items) {
    return {
      requiredCost: cost(items, it => num(it.required)),
      purchasedCost: cost(items, it => num(it.purchased)),
      remainingCost: cost(items, remaining)
    };
  }

  /* أيام متبقية بالتقويم المحلي (بدون UTC ولا مشاكل التوقيت الصيفي). null = غير محدد/غير صالح */
  function daysUntil(dateStr, now = new Date()) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || "");
    if (!m) return null;
    const y = +m[1], mo = +m[2], d = +m[3];
    const check = new Date(y, mo - 1, d);
    if (check.getFullYear() !== y || check.getMonth() !== mo - 1 || check.getDate() !== d) return null;
    const target = Date.UTC(y, mo - 1, d);
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((target - today) / 86400000);
  }

  window.BrideCalc = { itemStatus, remaining, percentOf, summarize, categoryState, costs, daysUntil };
})();
