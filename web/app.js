const $ = id => document.getElementById(id);
const v = id => ($(id)?.value ?? '').trim() || null;
const lines = id => ($(id)?.value ?? '').split('\n').map(s => s.trim()).filter(Boolean);
const flag = (id, def = true) => $(id) ? $(id).checked : def;
const clean = s => s.replace(/[\s.;,]+$/, '');

let selected = [];      // выбранные адресаты
let lastList = [];      // последний результат поиска
let manualMode = false;

// ---------- поиск ----------
let timer = null;
$('q').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(search, 250); });

async function search() {
  const q = $('q').value.trim();
  setError('');
  if (!q) {
    lastList = [];
    $('results').classList.add('hidden');
    $('notfound').classList.add('hidden');
    return;
  }
  try {
    const r = await fetch('/companies?q=' + encodeURIComponent(q));
    if (!r.ok) throw new Error(await readError(r));
    lastList = await r.json();
  } catch (e) {
    setError(e.message);
    return;
  }
  renderResults();
  $('notfound').classList.toggle('hidden', lastList.length > 0);
}

function safeUrl(u) {
  return u && /^https?:\/\//.test(u) ? u : null;
}

function linkTo(href, text) {
  const a = document.createElement('a');
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.textContent = text;
  return a;
}

function renderResults() {
  const box = $('results');
  box.textContent = '';
  lastList.forEach(c => {
    const on = isSelected(c);
    const item = document.createElement('div');
    item.className = 'item' + (on ? ' on' : '');

    const b = document.createElement('button');
    b.type = 'button';

    const tick = document.createElement('span');
    tick.className = 'tick';
    tick.textContent = on ? '✓' : '';

    const meta = document.createElement('span');
    meta.className = 'meta';
    const name = document.createElement('span');
    name.textContent = c.name;
    const sub = document.createElement('small');
    sub.textContent = `ИНН ${c.inn}` + (c.address ? ` · ${c.address}` : '');
    meta.append(name, sub);

    b.append(tick, meta);
    if (c.status === 'draft') {
      const tag = document.createElement('span');
      tag.className = 'draft-tag';
      tag.textContent = 'реквизиты на проверке';
      b.appendChild(tag);
    }
    b.addEventListener('click', () => toggle(c));
    item.appendChild(b);

    const links = document.createElement('div');
    links.className = 'links';
    const site = safeUrl(c.web_site);
    const article = safeUrl(c.revoke_article);
    if (site) links.appendChild(linkTo(site, 'сайт'));
    if (article) links.appendChild(linkTo(article, 'соглашение о ПД'));
    if (links.childNodes.length) item.appendChild(links);

    box.appendChild(item);
  });
  box.classList.toggle('hidden', lastList.length === 0);
}

function isSelected(c) {
  return selected.some(s => (s.inn && s.inn === c.inn) || (!s.inn && s.name === c.name));
}

function toggle(c) {
  const idx = selected.findIndex(s => (s.inn && s.inn === c.inn) || (!s.inn && s.name === c.name));
  if (idx >= 0) selected.splice(idx, 1);
  else selected.push({ inn: c.inn, name: c.name, address: c.address, dpo_email: c.dpo_email || null, slug: c.slug || null, status: c.status, web_site: c.web_site || null, revoke_article: c.revoke_article || null, revoke_email: c.revoke_email || null, });
  renderResults();
  renderChips();
}

function renderChips() {
  const box = $('chips');
  box.textContent = '';
  selected.forEach((a, i) => {
    const row = document.createElement('div');
    row.className = 'chip';
    const t = document.createElement('div');
    t.className = 't';
    const strong = document.createElement('strong');
    strong.textContent = a.name;
    const sub = document.createElement('small');
    sub.textContent = `ИНН ${a.inn || '—'}` + (a.address ? ` · ${a.address}` : '') + (a.status === 'draft' ? ' · реквизиты не сверены с ЕГРЮЛ' : '');
    t.append(strong, sub);
    const rm = document.createElement('button');
    rm.type = 'button';
    rm.textContent = 'Убрать';
    rm.addEventListener('click', () => { selected.splice(i, 1); renderChips(); renderResults(); });
    row.append(t, rm);
    box.appendChild(row);
  });
  const count = $('count');
  count.classList.toggle('hidden', selected.length === 0);
  count.textContent = selected.length ? `Выбрано компаний: ${selected.length}. Будет создано заявлений: ${selected.length}.` : '';
}

// ---------- ручной ввод ----------
$('manualBtn').addEventListener('click', () => {
  manualMode = true;
  $('notfound').classList.add('hidden');
  $('manual').classList.remove('hidden');
  const q = $('q').value.trim();
  if (/^\d{10}$/.test(q)) $('m_inn').value = q;
  $('manualNote').textContent = 'Компании нет в словаре. Проверьте наименование и адрес по ЕГРЮЛ.';
  $('manualNote').classList.remove('hidden');
  $('m_name').focus();
});

$('lookupBtn').addEventListener('click', async () => {
  const inn = $('m_inn').value.trim();
  setError('');
  try {
    const r = await fetch('/companies/' + encodeURIComponent(inn));
    if (!r.ok) throw new Error(await readError(r));
    const c = await r.json();
    $('m_name').value = c.name || '';
    $('m_addr').value = c.address || '';
    if (c.dpo_email) $('m_dpo').value = c.dpo_email;
    if (c.slug) $('m_slug').value = c.slug;
    const note = ['Реквизиты подтянуты из реестра. Проверьте их по ЕГРЮЛ.'];
    if (c.state && c.state !== 'ACTIVE') note.push('Внимание: статус компании не «действует».');
    $('manualNote').textContent = note.join(' ');
    $('manualNote').classList.remove('hidden');
  } catch (e) {
    setError(e.message);
  }
});

$('addManualBtn').addEventListener('click', () => {
  const name = v('m_name');
  const address = v('m_addr');
  if (!name || !address) {
    setError('Для ручного добавления нужны наименование и юридический адрес.');
    return;
  }
  const a = { inn: v('m_inn'), name, address, dpo_email: v('m_dpo'), slug: v('m_slug'), status: 'manual' };
  if (!isSelected(a)) selected.push(a);
  ['m_inn', 'm_name', 'm_addr', 'm_dpo', 'm_slug'].forEach(id => $(id).value = '');
  $('manual').classList.add('hidden');
  $('manualNote').classList.add('hidden');
  manualMode = false;
  renderChips();
  renderResults();
});

// ---------- общие ----------
function setError(msg) { $('error').textContent = msg; if (msg) setStatus(''); }
function setStatus(msg) {
  const s = $('status');
  s.textContent = msg;
  s.classList.toggle('hidden', !msg);
}

async function readError(r) {
  try {
    const j = await r.json();
    if (Array.isArray(j.detail)) return j.detail.map(d => d.msg).join('\n');
    return j.detail || `Ошибка ${r.status}`;
  } catch {
    return `Ошибка ${r.status}`;
  }
}

// ---------- имена файлов ----------
const TR = {а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'j',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'shch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'};
const translit = s => s.toLowerCase().split('').map(ch => (ch in TR ? TR[ch] : ch)).join('');
const capWord = w => { const t = translit(w).replace(/[^a-z0-9]/g, ''); return t ? t[0].toUpperCase() + t.slice(1) : ''; };

function slugOf(a) {
  if (a.slug) return a.slug.replace(/[^A-Za-z0-9]/g, '');
  const first = a.name
    .replace(/[«»"()]/g, '')
    .replace(/^(ООО|ПАО|АО|ЗАО|ОАО|НКО|ИП)\s+/i, '')
    .split(/\s+/)[0] || 'company';
  return capWord(first);
}

function fileNames(list, fullName) {
  const d = new Date();
  const date = [String(d.getDate()).padStart(2, '0'), String(d.getMonth() + 1).padStart(2, '0'), d.getFullYear()].join('_');
  const parts = fullName.trim().split(/\s+/);
  const who = [capWord(parts[0] || ''), capWord(parts[1] || '')].filter(Boolean).join('_');
  const seen = {};
  return list.map(a => {
    let base = [slugOf(a), who, 'otzyv', date].filter(Boolean).join('_');
    seen[base] = (seen[base] || 0) + 1;
    if (seen[base] > 1) base += '_' + seen[base];
    return base + '.pdf';
  });
}

// ---------- сборка PDF на клиенте ----------
function buildDocDef(a, ap, opt) {
  const right = (text, mb = 4) => ({ text, alignment: 'right', margin: [0, 0, 0, mb] });
  const content = [];

  content.push(right(`В ${a.name}`));
  if (a.inn) content.push(right(`ИНН ${a.inn}`));
  content.push(right(a.address, 10));
  if (a.dpo_email) {
    content.push(right('Лицу, ответственному за организацию обработки персональных данных'));
    content.push(right(a.dpo_email, 10));
  }

  const from = [`от ${ ap.full_name}`, `адрес: ${ap.address}`];
  if (ap.phone) from.push(`тел.: ${ap.phone}`);
  if (ap.email) from.push(`e-mail: ${ap.email}`);
  content.push({ text: from.join('\n'), alignment: 'right', margin: [0, 0, 0, 22] });

  content.push({ text: 'ЗАЯВЛЕНИЕ', bold: true, alignment: 'center', fontSize: 13, margin: [0, 0, 0, 2] });
  content.push({ text: 'об отзыве согласия на обработку персональных данных', bold: true, alignment: 'center', margin: [0, 0, 0, 16] });

  const intro = [];
  // if (ap.relation) intro.push(`Для идентификации сообщаю: ${clean(ap.relation)}.`);
  intro.push(`Мои персональные данные обрабатываются ${a.name} (далее — Оператор), в том числе лицами, действующими по его поручению, и третьими лицами, которым данные могли быть переданы.`);
  if (opt.data_text) intro.push(`Среди обрабатываемых данных: ${clean(opt.data_text)}.`);
  // if (opt.reason_text) intro.push(`${clean(opt.reason_text)}.`);
  content.push({ text: intro.join(' '), alignment: 'justify', margin: [0, 0, 0, 10] });

  const consents = opt.consents || [];
  content.push({
    text: 'На основании ч. 2 ст. 9 Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных» (далее — Закон) отзываю все ранее данные Оператору согласия на обработку моих персональных данных' + (consents.length ? ', в том числе:' : '.'),
    alignment: 'justify', margin: [0, 0, 0, 6],
  });
  if (consents.length) content.push({ ol: consents.map(clean), margin: [18, 0, 0, 10], alignment: 'justify' });

  const demands = [];
  if (opt.demand_stop) demands.push('Прекратить обработку моих персональных данных в срок не более 10 рабочих дней с даты получения настоящего заявления (ч. 5.1 ст. 21 Закона).');
  if (opt.demand_destroy) demands.push('Уничтожить мои персональные данные в срок не более 30 дней с даты получения настоящего заявления (ч. 5 ст. 21 Закона). Это относится ко всем носителям и информационным системам Оператора, а также к данным у лиц, осуществляющих обработку по его поручению.');
  if (opt.demand_info) demands.push('Предоставить сведения по ч. 7 ст. 14 Закона: состав обрабатываемых персональных данных, источники их получения, правовые основания и сроки обработки. Также сообщить, передавались ли мои данные третьим лицам, и если да, указать их наименования и объём переданных данных.');
  if (opt.demand_confirmation) demands.push('Направить подтверждение уничтожения персональных данных в соответствии с Требованиями, утверждёнными Приказом Роскомнадзора от 28.10.2022 № 179.');

  if (demands.length) {
    content.push({ text: 'В связи с изложенным прошу:', margin: [0, 0, 0, 6] });
    content.push({ ol: demands, alignment: 'justify', margin: [18, 0, 0, 10] });
  }

  const replyTo = opt.reply_by_email && ap.email
    ? `на электронную почту ${ap.email}`
    : `по адресу: ${ap.address}`;
  content.push({ text: `Ответ прошу направить ${replyTo}.`, alignment: 'justify', margin: [0, 0, 0, 30] });

  content.push({
    columns: [
      { text: '«___» ____________ 20__ г.', width: '*' },
      { text: `_______________ / ${ap.short_name || ap.full_name}`, width: 'auto', alignment: 'right' },
    ],
  });

  return {
    pageSize: 'A4',
    pageMargins: [60, 56, 48, 56],
    defaultStyle: { font: 'Roboto', fontSize: 11, lineHeight: 1.3 },
    content,
  };
}

function makeBlob(def) {
  return new Promise((resolve, reject) => {
    try { pdfMake.createPdf(def).getBlob(resolve); }
    catch (e) { reject(e); }
  });
}

// ---------- читаем форму и проверяем ----------
function readApplicant() {
  return {
    full_name: v('full_name'),
    short_name: v('short_name'),
    address: v('address'),
    email: v('email'),
    phone: v('phone'),
    // relation: v('relation'),
  };
}

function readOptions() {
  return {
    consents: lines('consents'),
    data_text: v('data_text'),
    // reason_text: v('reason_text'),
    demand_stop: flag('demand_stop'),
    demand_destroy: flag('demand_destroy'),
    demand_info: flag('demand_info'),
    demand_confirmation: flag('demand_confirmation'),
    reply_by_email: flag('reply_by_email'),
  };
}

function validate(needEmail) {
  if (!selected.length) return 'Выберите хотя бы одного адресата.';
  if (!v('full_name') || !v('address')) return 'Заполните ФИО и адрес для ответа.';
  if (needEmail && !v('email')) return 'Для отправки на почту укажите e-mail.';
  if (typeof pdfMake === 'undefined' || typeof JSZip === 'undefined') {
    return 'Не загрузились библиотеки PDF или архива. Проверьте соединение и обновите страницу.';
  }
  return null;
}

async function buildFiles() {
  const ap = readApplicant();
  const opt = readOptions();
  const names = fileNames(selected, ap.full_name);
  const files = [];
  for (let i = 0; i < selected.length; i++) {
    const blob = await makeBlob(buildDocDef(selected[i], ap, opt));
    files.push({ name: names[i], blob });
  }
  return files;
}

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// один файл — PDF, несколько — zip
async function deliver(files) {
  if (files.length === 1) {
    saveBlob(files[0].blob, files[0].name);
    return files[0].name;
  }
  const zip = new JSZip();
  files.forEach(f => zip.file(f.name, f.blob));
  const archive = await zip.generateAsync({ type: 'blob' });
  const d = new Date();
  const zipName = `otzyv_${String(d.getDate()).padStart(2, '0')}_${String(d.getMonth() + 1).padStart(2, '0')}_${d.getFullYear()}.zip`;
  saveBlob(archive, zipName);
  return zipName;
}

function setBusy(on) {
  $('downloadBtn').disabled = on;
  $('sendBtn').disabled = on;
}

// ---------- кнопки ----------
$('downloadBtn').addEventListener('click', async () => {
  const problem = validate(false);
  if (problem) return setError(problem);
  setError('');
  setBusy(true);
  try {
    const files = await buildFiles();
    const saved = await deliver(files);
    setStatus(`Готово: ${saved}`);
  } catch (e) {
    setError('Не удалось сформировать файлы: ' + e.message);
  } finally {
    setBusy(false);
  }
});

$('sendBtn').addEventListener('click', async () => {
  const problem = validate(true);
  if (problem) return setError(problem);
  setError('');
  setBusy(true);
  try {
    const files = await buildFiles();
    const email = v('email');

    const shareFiles = files.map(f => new File([f.blob], f.name, { type: 'application/pdf' }));
    if (navigator.canShare && navigator.canShare({ files: shareFiles })) {
      try {
        await navigator.share({ files: shareFiles, title: 'Заявления об отзыве согласия' });
        setStatus(`Отправка открыта: ${files.length} файл(ов). Выберите «Почта» и адрес ${email}.`);
        return;
      } catch (e) {
        if (e.name === 'AbortError') return; // пользователь закрыл меню
      }
    }

    const saved = await deliver(files);
    const subject = `Заявления об отзыве согласия на обработку ПД (${files.length})`;
    const body = `Во вложении заявления:\n${files.map(f => '• ' + f.name).join('\n')}\n\nФайл ${saved} прикрепите к письму вручную.`;
    setStatus(`Файлы сохранены: ${saved}. Откроется почтовый клиент: прикрепите архив и отправьте на ${email}.`);
    location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  } catch (e) {
    setError('Не удалось отправить: ' + e.message);
  } finally {
    setBusy(false);
  }
});
