const SITUATION_CONFIG = {
  social: {
    label: '社内メンバー',
    keywords: ['居酒屋', '食べ放題', '宴会'],
  },
  entertainment: {
    label: '接待',
    keywords: ['接待', '個室', '高級'],
    privateRoom: true,
  },
  partner: {
    label: '協業相手',
    keywords: ['個室', 'ダイニング'],
  },
  meeting: {
    label: '商談・打合せ',
    keywords: ['個室', '静か', 'ランチ'],
    privateRoom: true,
  },
};

const BUDGET_LABELS = {
  B008: '〜5,000円',
  B017: '5,000〜8,000円',
  B019: '8,000〜10,000円',
  B020: '10,000円〜',
};

const form = document.getElementById('searchForm');
const loading = document.getElementById('loading');
const results = document.getElementById('results');
const searchBtn = document.getElementById('searchBtn');

let currentStart = 1;
let lastSearchParams = null;

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  currentStart = 1;
  await searchRestaurants();
});

async function searchRestaurants(start = 1) {
  const area = document.getElementById('area').value.trim();
  const count = document.getElementById('count').value;
  const situation = document.getElementById('situation').value;
  const budget = document.getElementById('budget').value;
  const genre = document.getElementById('genre').value;
  const privateRoom = document.getElementById('privateRoom').checked;
  const parking = document.getElementById('parking').checked;
  const freeDrink = document.getElementById('freeDrink').checked;
  const noSmoke = document.getElementById('noSmoke').checked;

  lastSearchParams = { area, count, situation, budget, genre, privateRoom, parking, freeDrink, noSmoke };

  results.classList.add('hidden');
  loading.classList.remove('hidden');
  searchBtn.disabled = true;
  searchBtn.textContent = '検索中...';

  try {
    const params = new URLSearchParams({
      keyword: area,
      count: 5,
      start: start,
    });

    if (budget) params.append('budget', budget);
    if (genre) params.append('genre', genre);
    if (privateRoom || SITUATION_CONFIG[situation]?.privateRoom) params.append('private_room', 1);
    if (parking) params.append('parking', 1);
    if (freeDrink) params.append('free_drink', 1);
    if (noSmoke) params.append('non_smoking', 3);

    if (count && parseInt(count) >= 6) {
      params.append('party_capacity', count);
    }

    const url = `/api/restaurants?${params.toString()}`;
    const resp = await fetch(url);
    const data = await resp.json();
    renderResults(data, { area, count, situation, budget }, start);

  } catch (err) {
    loading.classList.add('hidden');
    results.classList.remove('hidden');
    results.innerHTML = `<div class="error-msg">エラーが発生しました。APIキーやネットワーク接続をご確認ください。<br><small>${err.message}</small></div>`;
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = 'お店を探す';
    loading.classList.add('hidden');
  }
}

function renderResults(data, searchParams, start = 1) {
  results.classList.remove('hidden');

  const shops = data?.results?.shop;
  const total = parseInt(data?.results?.results_available || '0');

  if (!shops || shops.length === 0) {
    results.innerHTML = `
      <div class="no-results">
        <p>条件に合うお店が見つかりませんでした。<br>エリアやこだわり条件を変えて再度お試しください。</p>
      </div>`;
    return;
  }

  const situationLabel = SITUATION_CONFIG[searchParams.situation]?.label || '';
  const budgetLabel = BUDGET_LABELS[searchParams.budget] || '';
  const nextStart = start + 5;
  const hasMore = nextStart <= total;

  let html = `<div class="results-header">
    <span>${searchParams.area}</span> ・ ${searchParams.count}名 ・ ${situationLabel} ・ ${budgetLabel} の検索結果（全${total}件中 ${start}〜${start + shops.length - 1}件目）
  </div>`;

  shops.forEach((shop) => {
    const tags = buildTags(shop);
    html += `
      <div class="restaurant-card">
        <img class="restaurant-photo" src="${shop.photo?.pc?.l || ''}" alt="${shop.name}" onerror="this.style.background='#f0f0f0'">
        <div class="restaurant-info">
          <div class="restaurant-name">${shop.name}</div>
          <div class="restaurant-meta">${tags}</div>
          <div class="restaurant-address">📍 ${shop.address || ''}</div>
          <div class="restaurant-budget">💴 ディナー平均: ${shop.budget?.average || '情報なし'}</div>
          <div class="btn-group">
            <a class="reserve-btn" href="${shop.urls?.pc || '#'}" target="_blank" rel="noopener">ホットペッパーで予約</a>
            <a class="tabelog-btn" href="https://www.google.com/search?q=site:tabelog.com+${encodeURIComponent(shop.name)}" target="_blank" rel="noopener">食べログで探す</a>
          </div>
        </div>
      </div>`;
  });

  if (hasMore) {
    html += `<button class="next-btn" onclick="searchRestaurants(${nextStart})">次の5件を見る →</button>`;
  }

  results.innerHTML = html;
}

function buildTags(shop) {
  const tags = [];

  if (shop.genre?.name) tags.push(`<span class="tag">${shop.genre.name}</span>`);
  if (shop.sub_genre?.name) tags.push(`<span class="tag">${shop.sub_genre.name}</span>`);
  if (shop.private_room === 'あり' || shop.private_room?.startsWith('あり')) tags.push(`<span class="tag highlight">個室あり</span>`);
  if (shop.parking === 'あり' || shop.parking?.startsWith('あり')) tags.push(`<span class="tag highlight">駐車場あり</span>`);
  if (shop.free_drink === 'あり' || shop.free_drink?.startsWith('あり')) tags.push(`<span class="tag highlight">飲み放題</span>`);
  if (shop.non_smoking === '全面禁煙' || shop.non_smoking === '禁煙席あり') {
    tags.push(`<span class="tag highlight">禁煙・分煙</span>`);
  }
  if (shop.capacity) tags.push(`<span class="tag">最大${shop.capacity}名</span>`);

  return tags.join('');
}
