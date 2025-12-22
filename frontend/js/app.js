/**
 * LoL Stats - Frontend Application
 */

const state = {
    puuid: null,
    region: 'la2',
    gameName: null,
    tagLine: null,
    summoner: null,
    ddragonVersion: null,
    champions: {},
    spells: {},
    items: {},
    runes: [],
    runeIndex: {},
    matches: [],
    matchesLoaded: 0,
    championStats: {},
    championStatsList: [],
    championStatsExpanded: false,
    profileSummary: null,
    profileSummarySeasonYear: null,
    currentSection: 'hero'
};

// Cache system
const cache = {
    data: new Map(),
    ttl: 5 * 60 * 1000, // 5 minutos
    
    set(key, value) {
        this.data.set(key, { value, timestamp: Date.now() });
    },
    
    get(key) {
        const entry = this.data.get(key);
        if (!entry) return null;
        if (Date.now() - entry.timestamp > this.ttl) {
            this.data.delete(key);
            return null;
        }
        return entry.value;
    },
    
    clear() {
        this.data.clear();
    }
};

// API helper with cache
const api = async (endpoint, useCache = true) => {
    if (useCache) {
        const cached = cache.get(endpoint);
        if (cached) return cached;
    }
    
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    if (useCache) cache.set(endpoint, data);
    return data;
};

// Utilidades
const formatNumber = n => n >= 1000 ? (n/1000).toFixed(1) + 'K' : n.toString();

const timeAgo = ts => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `hace ${days}d`;
    if (hrs > 0) return `hace ${hrs}h`;
    if (mins > 0) return `hace ${mins}m`;
    return 'ahora';
};

const formatDuration = s => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

const getChampionIcon = id => {
    const champ = Object.values(state.champions).find(c => c.key == id);
    return `https://ddragon.leagueoflegends.com/cdn/${state.ddragonVersion}/img/champion/${champ?.id || 'Aatrox'}.png`;
};

const getChampionName = id => {
    const champ = Object.values(state.champions).find(c => c.key == id);
    return champ?.name || 'Desconocido';
};

const getChampionById = id => Object.values(state.champions).find(c => c.key == id || c.key == String(id));

const getItemIcon = id => id && id !== 0 
    ? `https://ddragon.leagueoflegends.com/cdn/${state.ddragonVersion}/img/item/${id}.png` 
    : null;

const getSpellIcon = id => {
    const spell = Object.values(state.spells).find(s => s.key == id);
    return `https://ddragon.leagueoflegends.com/cdn/${state.ddragonVersion}/img/spell/${spell?.id || 'SummonerFlash'}.png`;
};

const getProfileIcon = id => `https://ddragon.leagueoflegends.com/cdn/${state.ddragonVersion}/img/profileicon/${id}.png`;

// Utilidad para pausar (backoff)
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

function getMasteryTooltip(championId) {
    const mastery = (state.mastery || []).find(m => parseInt(m.championId, 10) === parseInt(championId, 10));
    if (!mastery) return null;
    const points = formatNumber(mastery.championPoints || 0);
    const level = mastery.championLevel || 0;
    return encodeTooltipData({
        title: `${getChampionName(championId)} · Maestría ${level}`,
        desc: `${points} puntos de maestría`
    });
}

// Compara entradas de ranked para elegir la de mayor nivel/LP
function resolveBestEntry(a, b) {
    if (!a) return b;
    if (!b) return a;
    const tierOrder = {
        IRON: 1, BRONZE: 2, SILVER: 3, GOLD: 4, PLATINUM: 5, EMERALD: 6,
        DIAMOND: 7, MASTER: 8, GRANDMASTER: 9, CHALLENGER: 10
    };
    const divOrder = { IV: 1, III: 2, II: 3, I: 4 };
    const score = (e) => (tierOrder[e.tier] || 0) * 1000 + (divOrder[e.rank] || 0) * 10 + (e.leaguePoints || 0);
    return score(a) >= score(b) ? a : b;
}

function buildRuneIndex(runeTrees = []) {
    const index = {};
    runeTrees.forEach(tree => {
        tree.slots?.forEach(slot => {
            slot.runes?.forEach(rune => {
                index[rune.id] = {
                    id: rune.id,
                    name: rune.name,
                    icon: `https://ddragon.leagueoflegends.com/cdn/img/${rune.icon}`,
                    shortDesc: rune.shortDesc
                };
            });
        });
    });
    return index;
}

const getRuneInfo = runeId => runeId ? state.runeIndex?.[runeId] : null;

const getTopEntries = (obj = {}, limit = 3) => Object.entries(obj || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

const encodeTooltipData = data => JSON.stringify(data).replace(/"/g, '&quot;');

// Rank emblem - usando CDN de Riot con fallback
const getRankEmblem = tier => {
    if (!tier) return 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-iron.png';
    const t = tier.toLowerCase();
    // Usar Riot CDN directamente
    return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-${t}.png`;
};

const queueNames = {
    420: 'Ranked Solo/Duo',
    440: 'Ranked Flex',
    450: 'ARAM',
    400: 'Normal Draft',
    430: 'Normal Blind',
    900: 'URF',
    1020: 'One for All'
};

const rankedQueueLabels = {
    RANKED_SOLO_5x5: 'Solo/Duo',
    RANKED_FLEX_SR: 'Flex'
};

const formatTierText = tier => tier ? tier.charAt(0) + tier.slice(1).toLowerCase() : 'Sin clasificar';

const regionNames = {
    br1: 'Brasil', eun1: 'EU Nordic', euw1: 'EU West', jp1: 'Japón',
    kr: 'Corea', la1: 'LAN', la2: 'LAS', na1: 'NA', oc1: 'Oceanía',
    tr1: 'Turquía', ru: 'Rusia'
};

function getStatClass(value, thresholds) {
    if (value >= thresholds.good) return 'good';
    if (value <= thresholds.bad) return 'bad';
    return '';
}

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    await init();
    setupEvents();
    checkUrlParams();
    initTheme();
});

// Theme management
function initTheme() {
    const saved = localStorage.getItem('lol-stats-theme');
    if (saved) {
        document.documentElement.setAttribute('data-theme', saved);
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        document.documentElement.setAttribute('data-theme', 'light');
    }
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('lol-stats-theme', next);
}

async function init() {
    try {
        const { version } = await api('/api/ddragon/version');
        state.ddragonVersion = version;
        
        const [champions, spells, items, runes] = await Promise.all([
            api('/api/ddragon/champions'),
            api('/api/ddragon/spells'),
            api('/api/ddragon/items'),
            api('/api/ddragon/runes')
        ]);
        
        state.champions = champions;
        state.spells = spells;
        state.items = items;
        state.runes = runes;
        state.runeIndex = buildRuneIndex(runes);
        console.log('App ready, version:', version, '| Items loaded:', Object.keys(items).length, '| Runes:', Object.keys(state.runeIndex).length);
    } catch (err) {
        console.error('Init error:', err);
        state.ddragonVersion = '14.24.1';
    }
}

function setupEvents() {
    // Theme toggle
    $('#theme-toggle')?.addEventListener('click', toggleTheme);
    
    // Logo
    $('#logo-home')?.addEventListener('click', e => {
        e.preventDefault();
        showSection('hero');
    });
    
    // Búsquedas
    $('#hero-search-form')?.addEventListener('submit', e => {
        e.preventDefault();
        search($('#hero-search-input').value, $('#selected-region').value);
    });
    
    $('#header-search-form')?.addEventListener('submit', e => {
        e.preventDefault();
        search($('#header-search-input').value, $('#header-region').value);
    });
    
    // Navegación
    $('#nav-champions')?.addEventListener('click', e => {
        e.preventDefault();
        showSection('champions');
    });
    
    $('#nav-items')?.addEventListener('click', e => {
        e.preventDefault();
        showSection('items');
    });
    
    $('#nav-ranking')?.addEventListener('click', e => {
        e.preventDefault();
        showSection('ranking');
    });
    
    $('#nav-tierlist')?.addEventListener('click', e => {
        e.preventDefault();
        showSection('tierlist');
    });
    
    $('#nav-multisearch')?.addEventListener('click', e => {
        e.preventDefault();
        showSection('multisearch');
    });
    
    // Botones
    $('#error-back-btn')?.addEventListener('click', () => showSection('hero'));
    $('#btn-update')?.addEventListener('click', refreshProfile);
    $('#btn-live')?.addEventListener('click', showLiveGame);
    $('#load-more-btn')?.addEventListener('click', loadMoreMatches);
    $('#match-queue-filter')?.addEventListener('change', filterMatches);
    $('#champion-stats-toggle')?.addEventListener('click', toggleChampionStatsView);
    
    // Modal
    $('#modal-close')?.addEventListener('click', closeModal);
    $('.modal-backdrop')?.addEventListener('click', closeModal);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
    
    // Ranking filters
    $('#ranking-region')?.addEventListener('change', loadRanking);
    $('#ranking-queue')?.addEventListener('change', loadRanking);
    
    // Champion search
    $('#champ-search')?.addEventListener('input', filterChampions);
    
    // Item filters
    $('#item-search')?.addEventListener('input', filterItems);
    $('#item-category')?.addEventListener('change', filterItems);
    
    // Tier list filters
    $('#tierlist-role')?.addEventListener('change', loadTierList);
    $('#tierlist-tier')?.addEventListener('change', loadTierList);
    
    // Multi-search
    $('#multisearch-btn')?.addEventListener('click', doMultiSearch);
    
    setupTooltips();
}

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const name = params.get('name');
    const tag = params.get('tag');
    const region = params.get('region');
    
    if (name && region) {
        const tagValue = tag || region.toUpperCase().replace(/[0-9]/g, '');
        setTimeout(() => search(`${name}#${tagValue}`, region), 300);
    }
}

// Navegación
function showSection(section) {
    state.currentSection = section;
    
    ['hero-section', 'profile-section', 'error-section', 'loading', 'champions-section', 'items-section', 'ranking-section', 'tierlist-section', 'multisearch-section'].forEach(id => {
        const el = $(`#${id}`);
        if (el) {
            el.classList.add('hidden');
            el.classList.remove('active');
        }
    });
    
    switch(section) {
        case 'hero':
            $('#hero-section')?.classList.remove('hidden');
            $('#hero-section')?.classList.add('active');
            $('.header-search')?.classList.add('hidden');
            break;
        case 'profile':
            $('#profile-section')?.classList.remove('hidden');
            $('.header-search')?.classList.remove('hidden');
            break;
        case 'champions':
            $('#champions-section')?.classList.remove('hidden');
            $('.header-search')?.classList.remove('hidden');
            loadChampionsList();
            break;
        case 'items':
            $('#items-section')?.classList.remove('hidden');
            $('.header-search')?.classList.remove('hidden');
            loadItemsList();
            break;
        case 'ranking':
            $('#ranking-section')?.classList.remove('hidden');
            $('.header-search')?.classList.remove('hidden');
            loadRanking();
            break;
        case 'tierlist':
            $('#tierlist-section')?.classList.remove('hidden');
            $('.header-search')?.classList.remove('hidden');
            loadTierList();
            break;
        case 'multisearch':
            $('#multisearch-section')?.classList.remove('hidden');
            $('.header-search')?.classList.remove('hidden');
            break;
        case 'error':
            $('#error-section')?.classList.remove('hidden');
            break;
    }
    
    $$('.nav-link').forEach(link => link.classList.remove('active'));
    if (section === 'champions') $('#nav-champions')?.classList.add('active');
    if (section === 'items') $('#nav-items')?.classList.add('active');
    if (section === 'ranking') $('#nav-ranking')?.classList.add('active');
    if (section === 'tierlist') $('#nav-tierlist')?.classList.add('active');
    if (section === 'multisearch') $('#nav-multisearch')?.classList.add('active');
}

function showLoading(show) {
    $('#loading')?.classList.toggle('hidden', !show);
}

function showError(msg) {
    $('#error-text').textContent = msg;
    showSection('error');
}

// Búsqueda
async function search(input, region) {
    if (!input?.trim()) return;
    
    let gameName, tagLine;
    if (input.includes('#')) {
        [gameName, tagLine] = input.split('#');
    } else {
        gameName = input;
        tagLine = region.toUpperCase().replace(/[0-9]/g, '');
    }
    
    state.gameName = gameName.trim();
    state.tagLine = tagLine?.trim() || 'LAN';
    state.region = region;
    
    showLoading(true);
    
    try {
        const account = await api(`/api/account/${encodeURIComponent(state.gameName)}/${encodeURIComponent(state.tagLine)}?region=${region}`);
        state.puuid = account.puuid;
        
        await loadProfile();
        showSection('profile');
    } catch (err) {
        console.error('Search error:', err);
        showError('No se encontró el invocador. Verifica el nombre y el tag.');
    } finally {
        showLoading(false);
    }
}

// Cargar perfil
async function loadProfile() {
    const seasonYear = new Date().getUTCFullYear();
    let summary = null;
    try {
        summary = await api(`/api/profile/summary/${state.puuid}?region=${state.region}&seasonYear=${seasonYear}`);
    } catch (err) {
        console.warn('Summary fetch failed', err);
    }

    // Datos base obligatorios
    const [summoner, mastery] = await Promise.all([
        api(`/api/summoner/${state.puuid}?region=${state.region}`),
        api(`/api/mastery/${state.puuid}?region=${state.region}&count=10`).catch(() => [])
    ]);

    // Ranked entries: prefer resumen; si no, pedir ranked con tolerancia a error
    let rankedEntries = Array.isArray(summary?.ranked?.entries) ? summary.ranked.entries : [];
    if (!rankedEntries.length) {
        try {
            rankedEntries = await api(`/api/ranked/${state.puuid}?region=${state.region}`);
        } catch (err) {
            console.warn('Ranked fetch failed', err);
            rankedEntries = [];
        }
    }

    // Match IDs: prefer los del summary; si no, pedir pocos
    let matchIdList = Array.isArray(summary?.matches) && summary.matches.length ? summary.matches : [];
    if (!matchIdList.length) {
        try {
            matchIdList = await api(`/api/matches/${state.puuid}?region=${state.region}&count=15`);
        } catch (err) {
            console.warn('Matches fetch failed', err);
            matchIdList = [];
        }
    }

    state.summoner = summoner;
    state.matches = [];
    state.matchesLoaded = 0;
    state.championStats = {};
    state.championStatsList = [];
    state.championStatsExpanded = false;
    state.profileSummarySeasonYear = seasonYear;
    state.mastery = mastery || [];
    state.profileSummary = summary || null;
    state.allMatchIds = matchIdList;
    
    renderProfileHeader(summoner);
    renderRanked(rankedEntries);
    renderMasteryList(mastery);

    // Armar y aplicar resumen de ranked (del summary o derivado de entries)
    let summaryData = summary?.ranked;
    if (!summaryData && Array.isArray(rankedEntries) && rankedEntries.length) {
        const totals = rankedEntries.reduce((acc, entry) => {
            acc.wins += entry.wins || 0;
            acc.losses += entry.losses || 0;
            return acc;
        }, { wins: 0, losses: 0 });
        const best = rankedEntries.reduce((a, b) => resolveBestEntry(a, b), null);
        summaryData = { best_queue: best, overall: totals, entries: rankedEntries };
    }
    if (summaryData) {
        applyProfileSummary(summaryData);
        if (state.profileSummary) {
            state.profileSummary.ranked = summaryData;
        } else {
            state.profileSummary = { ranked: summaryData };
        }
    }

    $('#matches-container').innerHTML = '';
    $('#champion-stats-list').innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted);">Calculando estadísticas de temporada...</div>';

    if (matchIdList.length) {
        // Cargar un bloque inicial mayor (hasta 10) para mostrar historial útil
        await loadMatches(matchIdList.slice(0, 10));
    } else {
        $('#matches-container').innerHTML = '<div style="padding:16px; color: var(--text-muted);">Sin partidas recientes disponibles.</div>';
    }

    if (summary?.champions?.length) {
        setChampionStatsFromSummary(summary.champions);
        renderChampionStatsList();
    } else {
        state.championStatsList = [];
        renderChampionStatsList();
        // Si no llegaron stats pero ya cargamos partidas, derivar
        if (state.matches.length) {
            deriveChampionStatsFromMatches();
            renderChampionStatsList();
        }
    }

    // Si no había matchIds pero el summary trae matches, cargarlos
    if (!matchIdList.length && summary?.matches?.length) {
        state.allMatchIds = summary.matches;
        await loadMatches(summary.matches.slice(0, 10));
        if (!summary?.champions?.length) {
            deriveChampionStatsFromMatches();
            renderChampionStatsList();
        }
    }
    
    checkLiveGame();
    
    $('#header-region').value = state.region;
    $('#header-search-input').value = `${state.gameName}#${state.tagLine}`;
}

function renderProfileHeader(summoner) {
    $('#profile-icon').src = getProfileIcon(summoner.profileIconId);
    $('#profile-level').textContent = summoner.summonerLevel;
    $('#profile-name').textContent = state.gameName;
    $('#profile-tag').textContent = `#${state.tagLine}`;
    $('#profile-region').textContent = regionNames[state.region] || state.region.toUpperCase();
    $('#profile-update').textContent = 'Actualizado ahora';
}

function renderRanked(entries) {
    if ((!entries || !entries.length) && state.profileSummary?.ranked?.entries?.length) {
        entries = state.profileSummary.ranked.entries;
    }
    entries = entries || [];
    const solo = entries.find(e => e.queueType === 'RANKED_SOLO_5x5');
    const flex = entries.find(e => e.queueType === 'RANKED_FLEX_SR');
    
    renderRankedCard('solo', solo);
    renderRankedCard('flex', flex);
    updateProfileHighlightsFromEntries(entries, solo, flex);
}

function renderRankedCard(type, data) {
    const emblem = $(`#ranked-${type}-emblem`);
    const tier = $(`#ranked-${type}-tier`);
    const lp = $(`#ranked-${type}-lp`);
    const wr = $(`#ranked-${type}-wr`);
    
    if (!emblem || !tier) {
        console.error(`Ranked card elements not found for ${type}`);
        return;
    }
    
    if (data) {
        const rankImg = getRankEmblem(data.tier);
        emblem.src = rankImg;
        emblem.style.display = 'block';
        emblem.style.opacity = '1';
        tier.textContent = `${data.tier} ${data.rank}`;
        if (lp) lp.textContent = `${data.leaguePoints} LP`;
        
        const wins = data.wins || 0;
        const losses = data.losses || 0;
        const total = wins + losses;
        const winrate = total > 0 ? Math.round((wins / total) * 100) : 0;
        if (wr) wr.textContent = `${wins}W ${losses}L · ${winrate}%`;
    } else {
        emblem.src = getRankEmblem('iron');
        emblem.style.opacity = '0.3';
        tier.textContent = 'Sin clasificar';
        if (lp) lp.textContent = '';
        if (wr) wr.textContent = '';
    }
}

function updateProfileHighlightsFromEntries(entries = [], solo, flex) {
    const eloEl = $('#profile-elo');
    const eloDetailsEl = $('#profile-elo-details');
    const winrateEl = $('#profile-overall-winrate');
    const recordEl = $('#profile-overall-record');
    const emblemImg = $('#profile-elo-emblem');
    if (!eloEl || !eloDetailsEl || !winrateEl || !recordEl) return;
    
    const bestQueue = solo || flex || entries[0];
    if (bestQueue) {
        const tierText = formatTierText(bestQueue.tier || '');
        eloEl.textContent = `${tierText} ${bestQueue.rank || ''}`.trim();
        eloDetailsEl.textContent = `${bestQueue.leaguePoints || 0} LP · ${rankedQueueLabels[bestQueue.queueType] || 'Clasificatoria'}`;
        if (emblemImg) {
            emblemImg.src = getRankEmblem(bestQueue.tier);
            emblemImg.style.opacity = '1';
        }
    } else {
        eloEl.textContent = 'Sin clasificar';
        eloDetailsEl.textContent = 'Sin ranked esta temporada';
        if (emblemImg) {
            emblemImg.src = getRankEmblem('iron');
            emblemImg.style.opacity = '0.35';
        }
    }
    
    let totals = entries.reduce((acc, entry) => {
        acc.wins += entry.wins || 0;
        acc.losses += entry.losses || 0;
        return acc;
    }, { wins: 0, losses: 0 });
    let totalGames = totals.wins + totals.losses;
    let isRankedData = true;
    // Si no hay ranked entries, derivar de champion stats
    if (totalGames === 0 && state.profileSummary?.champions?.length) {
        const champs = state.profileSummary.champions;
        totals.wins = champs.reduce((sum, c) => sum + (c.wins || 0), 0);
        const games = champs.reduce((sum, c) => sum + (c.games || 0), 0);
        totals.losses = games - totals.wins;
        totalGames = games;
        isRankedData = false;
    }
    if (totalGames > 0) {
        const wr = Math.round((totals.wins / totalGames) * 100);
        winrateEl.textContent = `${wr}%`;
        winrateEl.style.color = wr >= 50 ? 'var(--win)' : 'var(--loss)';
        const label = isRankedData ? 'clasificatorias' : 'partidas';
        recordEl.textContent = `${totals.wins}W · ${totals.losses}L (${totalGames} ${label})`;
    } else {
        winrateEl.textContent = '-';
        winrateEl.style.color = 'var(--text)';
        recordEl.textContent = 'Sin partidas registradas';
    }
}

function applyProfileSummary(summary) {
    const best = summary?.best_queue;
    const totals = summary?.overall || {};
    const eloEl = $('#profile-elo');
    const eloDetailsEl = $('#profile-elo-details');
    const winrateEl = $('#profile-overall-winrate');
    const recordEl = $('#profile-overall-record');
    const emblemImg = $('#profile-elo-emblem');
    if (!eloEl || !eloDetailsEl || !winrateEl || !recordEl) return;
    if (best) {
        const tierText = formatTierText(best.tier || '');
        eloEl.textContent = `${tierText} ${best.rank || ''}`.trim();
        eloDetailsEl.textContent = `${best.leaguePoints || 0} LP · ${rankedQueueLabels[best.queueType] || 'Clasificatoria'}`;
        if (emblemImg) {
            const emblemUrl = getRankEmblem(best.tier);
            emblemImg.src = emblemUrl;
            emblemImg.style.opacity = '1';
        }
    } else {
        eloEl.textContent = 'Sin clasificar';
        eloDetailsEl.textContent = 'Sin ranked esta temporada';
        if (emblemImg) {
            emblemImg.src = getRankEmblem('iron');
            emblemImg.style.opacity = '0.35';
        }
    }
    // Ranked totals
    let wins = totals.wins || 0;
    let losses = totals.losses || 0;
    let totalGames = wins + losses;
    let isRankedData = true;
    // Si no hay ranked entries, derivar de champion stats (todas las partidas)
    if (totalGames === 0 && state.profileSummary?.champions?.length) {
        const champs = state.profileSummary.champions;
        wins = champs.reduce((sum, c) => sum + (c.wins || 0), 0);
        const games = champs.reduce((sum, c) => sum + (c.games || 0), 0);
        losses = games - wins;
        totalGames = games;
        isRankedData = false;
    }
    if (totalGames > 0) {
        const wr = Math.round((wins / totalGames) * 100);
        winrateEl.textContent = `${wr}%`;
        winrateEl.style.color = wr >= 50 ? 'var(--win)' : 'var(--loss)';
        const label = isRankedData ? 'clasificatorias' : 'partidas';
        recordEl.textContent = `${wins}W · ${losses}L (${totalGames} ${label})`;
    } else {
        winrateEl.textContent = '-';
        winrateEl.style.color = 'var(--text)';
        recordEl.textContent = 'Sin partidas registradas';
    }
}

function setChampionStatsFromSummary(champions = []) {
    state.championStats = {};
    state.championStatsList = champions || [];
    state.championStatsExpanded = false;
    (champions || []).forEach(champ => {
        const itemCounts = {};
        (champ.items || []).forEach(item => {
            if (item?.id) itemCounts[item.id] = item.count;
        });
        const spellPairs = {};
        (champ.spells || []).forEach(spell => {
            if (Array.isArray(spell.ids) && spell.ids.length === 2) {
                const ids = [...spell.ids].sort((a, b) => a - b);
                spellPairs[ids.join('-')] = spell.count;
            }
        });
        const keystones = {};
        (champ.keystones || []).forEach(perk => {
            if (perk?.id) keystones[perk.id] = perk.count;
        });
        state.championStats[champ.championId] = {
            championId: champ.championId,
            games: champ.games,
            wins: champ.wins,
            kills: champ.kills,
            deaths: champ.deaths,
            assists: champ.assists,
            cs: champ.cs,
            duration: champ.duration,
            damage: champ.damage,
            gold: champ.gold,
            vision: champ.vision,
            itemCounts,
            spellPairs,
            keystones
        };
    });
}

// Renderizar lista de maestría
function renderMasteryList(masteries) {
    const container = $('#mastery-list');
    if (!container) return;
    
    if (!masteries || masteries.length === 0) {
        container.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-muted);">Sin datos de maestría</div>';
        return;
    }
    
    container.innerHTML = masteries.slice(0, 7).map(m => {
        const champId = m.championId;
        const points = formatNumber(m.championPoints || 0);
        const level = m.championLevel || 0;
        const tooltip = encodeTooltipData({
            title: `${getChampionName(champId)} · M${level}`,
            desc: `${points} puntos`
        });
        
        return `
            <div class="mastery-item" data-champion-id="${champId}" data-tooltip="${tooltip}">
                <img src="${getChampionIcon(champId)}" alt="" class="mastery-icon">
                <div class="mastery-info">
                    <div class="mastery-name">${getChampionName(champId)}</div>
                    <div class="mastery-details">
                        <span class="mastery-level">M${level}</span>
                        <span class="mastery-points">${points} pts</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.querySelectorAll('.mastery-item').forEach(item => {
        item.addEventListener('click', () => showChampionModal(item.dataset.championId));
    });
}

// Partidas
async function loadMatches(matchIds) {
    const container = $('#matches-container');
    let rateLimited = false;

    for (const id of matchIds) {
        let match = null;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                match = await api(`/api/match/${id}?region=${state.region}`);
                break;
            } catch (err) {
                const is429 = String(err.message || '').includes('429') || /HTTP 429/.test(err.message || '');
                if (is429) {
                    rateLimited = true;
                    await sleep(800 * (attempt + 1));
                    continue;
                }
                console.error(`Error loading match ${id}:`, err);
                break;
            }
        }
        if (!match) continue;
        state.matches.push(match);
        container.appendChild(createMatchCard(match));
        state.matchesLoaded++;
        // pequeña pausa para evitar ráfaga
        await sleep(120);
        if (rateLimited) break;
    }

    if (rateLimited && !state.matches.length) {
        container.innerHTML = '<div style="padding:16px; color: var(--loss);">Riot limitó las peticiones (429). Intenta de nuevo en unos segundos.</div>';
    }

    updateStats();
    updateRecentResults();
    updateRoleStats();
    $('#load-more-btn').classList.toggle('hidden', state.matchesLoaded >= 30);
}

function renderChampionStatsList() {
    const container = $('#champion-stats-list');
    const toggleBtn = $('#champion-stats-toggle');
    const seasonLabel = $('#champion-stats-season');
    if (!container) return;
    const champions = state.championStatsList || [];
    if (seasonLabel && state.profileSummarySeasonYear) {
        seasonLabel.textContent = `Temporada ${state.profileSummarySeasonYear}`;
    }

    if (!champions.length) {
        container.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-muted);">Sin datos</div>';
        if (toggleBtn) toggleBtn.classList.add('hidden');
        return;
    }

    const limit = state.championStatsExpanded ? champions.length : Math.min(10, champions.length);
    const subset = champions.slice(0, limit);

    container.innerHTML = subset.map(champ => {
        const champId = champ.championId;
        const stats = state.championStats[champId] || champ;
        const wr = Math.round((stats.wins / stats.games) * 100);
        const losses = stats.games - stats.wins;
        const kda = stats.deaths === 0 ? 'Perfect' : ((stats.kills + stats.assists) / stats.deaths).toFixed(1);
        const wrClass = wr >= 55 ? 'good' : (wr <= 45 ? 'bad' : '');
        const csMin = stats.duration ? (stats.cs / (stats.duration / 60)).toFixed(1) : '0.0';
        const avgDamage = stats.games ? formatNumber(Math.round(stats.damage / stats.games)) : '0';
        const masteryTip = getMasteryTooltip(champId);
        
        return `
            <div class="champ-stat-item" data-champion-id="${champId}" ${masteryTip ? `data-tooltip='${masteryTip}'` : ''}>
                <img src="${getChampionIcon(champId)}" alt="" class="champ-stat-icon">
                <div class="champ-stat-info">
                    <div class="champ-stat-name">${getChampionName(champId)}</div>
                    <div class="champ-stat-details">
                        <span class="champ-stat-wr ${wrClass}">${wr}% WR</span>
                        <span class="champ-stat-kda">${kda} KDA</span>
                        <span class="champ-stat-games">${stats.games}G (${stats.wins}V-${losses}L)</span>
                    </div>
                    <div class="champ-stat-extra">
                        <span>${csMin} CS/min</span>
                        <span>${avgDamage} dmg</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.querySelectorAll('.champ-stat-item').forEach(item => {
        item.addEventListener('click', () => showChampionModal(item.dataset.championId));
    });

    if (toggleBtn) {
        toggleBtn.classList.toggle('hidden', champions.length <= 10);
        toggleBtn.textContent = state.championStatsExpanded ? 'Ver menos' : 'Ver más';
    }
}

function toggleChampionStatsView() {
    state.championStatsExpanded = !state.championStatsExpanded;
    renderChampionStatsList();
}

function createMatchCard(match) {
    const me = match.info.participants.find(p => p.puuid === state.puuid);
    if (!me) return document.createElement('div');
    
    const isWin = me.win;
    const isRemake = match.info.gameDuration < 300;
    
    const kda = me.deaths === 0 ? 'Perfect' : ((me.kills + me.assists) / me.deaths).toFixed(2);
    const cs = me.totalMinionsKilled + me.neutralMinionsKilled;
    const csMin = (cs / (match.info.gameDuration / 60)).toFixed(1);
    
    const items = [me.item0, me.item1, me.item2, me.item3, me.item4, me.item5, me.item6]
        .filter(id => id && id !== 0)
        .map(id => `<img src="${getItemIcon(id)}" alt="" class="item-icon">`)
        .join('');
    
    const blue = match.info.participants.filter(p => p.teamId === 100);
    const red = match.info.participants.filter(p => p.teamId === 200);
    
    const renderParticipant = (p) => {
        const isCurrent = p.puuid === state.puuid;
        const name = p.riotIdGameName || p.summonerName || 'Jugador';
        const tag = p.riotIdTagline || '';
        
        if (isCurrent) {
            return `<div class="participant current">
                <img src="${getChampionIcon(p.championId)}" class="participant-icon">
                <span>${name}</span>
            </div>`;
        }
        
        return `<div class="participant">
            <img src="${getChampionIcon(p.championId)}" class="participant-icon">
            <a href="#" class="participant-link" data-name="${name}" data-tag="${tag}" data-region="${state.region}">${name}</a>
        </div>`;
    };
    
    const card = document.createElement('div');
    card.className = `match-card ${isRemake ? 'remake' : (isWin ? 'win' : 'loss')}`;
    card.dataset.queueId = match.info.queueId;
    card.dataset.matchId = match.metadata.matchId;
    
    card.innerHTML = `
        <div class="match-result">
            <span class="result-text">${isRemake ? 'Remake' : (isWin ? 'Victoria' : 'Derrota')}</span>
            <div class="match-meta">
                <div>${queueNames[match.info.queueId] || 'Partida'}</div>
                <div>${formatDuration(match.info.gameDuration)} · ${timeAgo(match.info.gameEndTimestamp)}</div>
            </div>
        </div>
        <div class="match-champion">
            <img src="${getChampionIcon(me.championId)}" alt="" class="match-champ-icon" data-champion-id="${me.championId}">
            <div class="match-spells">
                <img src="${getSpellIcon(me.summoner1Id)}" alt="" class="spell-icon">
                <img src="${getSpellIcon(me.summoner2Id)}" alt="" class="spell-icon">
            </div>
        </div>
        <div class="match-stats">
            <div class="match-kda">
                <span class="kills">${me.kills}</span> / 
                <span class="deaths">${me.deaths}</span> / 
                <span class="assists">${me.assists}</span>
                <span class="match-kda-ratio">${kda} KDA</span>
            </div>
            <div class="match-extra">${cs} CS (${csMin}/m) · ${me.visionScore} visión</div>
            <div class="match-items">${items}</div>
        </div>
        <div class="match-participants">
            <div class="team-col">${blue.map(renderParticipant).join('')}</div>
            <div class="team-col">${red.map(renderParticipant).join('')}</div>
        </div>
    `;
    
    card.addEventListener('click', (e) => {
        if (!e.target.classList.contains('participant-link') && !e.target.classList.contains('match-champ-icon')) {
            showMatchDetail(match);
        }
    });
    
    card.querySelector('.match-champ-icon')?.addEventListener('click', (e) => {
        e.stopPropagation();
        showChampionModal(me.championId);
    });
    
    card.querySelectorAll('.participant-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const url = `${window.location.origin}${window.location.pathname}?name=${encodeURIComponent(link.dataset.name)}&tag=${encodeURIComponent(link.dataset.tag)}&region=${link.dataset.region}`;
            window.open(url, '_blank');
        });
    });
    
    return card;
}

function updateStats() {
    if (!state.matches.length) return;
    
    let wins = 0, kills = 0, deaths = 0, assists = 0;
    
    state.matches.forEach(m => {
        const me = m.info.participants.find(p => p.puuid === state.puuid);
        if (!me) return;
        if (me.win) wins++;
        kills += me.kills;
        deaths += me.deaths;
        assists += me.assists;
    });
    
    const games = state.matches.length;
    const winrate = Math.round((wins / games) * 100);
    const kda = deaths === 0 ? 'Perfect' : ((kills + assists) / deaths).toFixed(2);
    
    const wrEl = $('#stat-winrate');
    wrEl.textContent = `${winrate}%`;
    wrEl.style.color = winrate >= 50 ? 'var(--win)' : 'var(--loss)';
    
    $('#stat-kda').textContent = kda;
    $('#stat-games').textContent = games;
}

// Deriva estadísticas de campeones a partir de las partidas cargadas (fallback)
function deriveChampionStatsFromMatches() {
    const champMap = {};
    state.matches.forEach(match => {
        const me = match?.info?.participants?.find(p => p.puuid === state.puuid);
        if (!me) return;
        const champId = parseInt(me.championId, 10);
        if (!champId) return;
        const entry = champMap[champId] || {
            championId: champId,
            games: 0,
            wins: 0,
            kills: 0,
            deaths: 0,
            assists: 0,
            cs: 0,
            duration: 0,
            damage: 0,
            gold: 0,
            vision: 0
        };
        entry.games += 1;
        entry.wins += me.win ? 1 : 0;
        entry.kills += me.kills || 0;
        entry.deaths += me.deaths || 0;
        entry.assists += me.assists || 0;
        entry.cs += (me.totalMinionsKilled || 0) + (me.neutralMinionsKilled || 0);
        entry.duration += match.info?.gameDuration || 0;
        entry.damage += me.totalDamageDealtToChampions || 0;
        entry.gold += me.goldEarned || 0;
        entry.vision += me.visionScore || 0;
        champMap[champId] = entry;
    });

    const list = Object.values(champMap).sort((a, b) => b.games - a.games);
    state.championStats = champMap;
    state.championStatsList = list;
    state.championStatsExpanded = false;
}

async function loadMoreMatches() {
    const btn = $('#load-more-btn');
    btn.textContent = 'Cargando...';
    btn.disabled = true;
    
    try {
        const ids = await api(`/api/matches/${state.puuid}?region=${state.region}&start=${state.matchesLoaded}&count=10`);
        if (ids?.length) await loadMatches(ids);
        if (ids.length < 10) btn.classList.add('hidden');
    } catch (err) {
        console.error('Error loading more:', err);
    } finally {
        btn.textContent = 'Cargar más partidas';
        btn.disabled = false;
    }
}

function filterMatches() {
    const filter = $('#match-queue-filter').value;
    $$('.match-card').forEach(card => {
        card.style.display = (filter === 'all' || card.dataset.queueId === filter) ? '' : 'none';
    });
}

// Match Detail Modal
function showMatchDetail(match) {
    const me = match.info.participants.find(p => p.puuid === state.puuid);
    const isWin = me?.win;
    
    const blue = match.info.participants.filter(p => p.teamId === 100);
    const red = match.info.participants.filter(p => p.teamId === 200);
    const blueWin = blue[0]?.win;
    
    const renderTeam = (team) => team.map(p => {
        const kda = `${p.kills}/${p.deaths}/${p.assists}`;
        const cs = p.totalMinionsKilled + p.neutralMinionsKilled;
        const dmg = formatNumber(p.totalDamageDealtToChampions);
        const name = p.riotIdGameName || p.summonerName || 'Jugador';
        const tag = p.riotIdTagline || '';
        const isCurrent = p.puuid === state.puuid;
        
        const nameHtml = isCurrent 
            ? `<span>${name}</span>` 
            : `<a href="#" class="participant-link" data-name="${name}" data-tag="${tag}" data-region="${state.region}">${name}</a>`;
        
        return `
            <div class="modal-player ${isCurrent ? 'current' : ''}">
                <img src="${getChampionIcon(p.championId)}" class="modal-player-champ" data-champion-id="${p.championId}">
                <div>
                    <div class="modal-player-name">${nameHtml}</div>
                    <div class="modal-player-kda">${kda} · ${cs} CS</div>
                </div>
                <div class="modal-player-stats">
                    <div>${dmg} daño</div>
                    <div>${p.visionScore} visión</div>
                </div>
            </div>
        `;
    }).join('');
    
    $('#modal-body').innerHTML = `
        <div class="modal-header">
            <div>
                <div class="modal-match-result ${isWin ? 'win' : 'loss'}">${isWin ? 'Victoria' : 'Derrota'}</div>
                <div style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px;">
                    ${queueNames[match.info.queueId] || 'Partida'} · ${formatDuration(match.info.gameDuration)}
                </div>
            </div>
            <div class="modal-match-info">
                ${timeAgo(match.info.gameEndTimestamp)}<br>
                <small>${match.metadata.matchId}</small>
            </div>
        </div>
        <div class="modal-teams">
            <div class="modal-team blue">
                <div class="modal-team-header">Equipo Azul ${blueWin ? '(Victoria)' : '(Derrota)'}</div>
                ${renderTeam(blue)}
            </div>
            <div class="modal-team red">
                <div class="modal-team-header">Equipo Rojo ${!blueWin ? '(Victoria)' : '(Derrota)'}</div>
                ${renderTeam(red)}
            </div>
        </div>
    `;
    
    $('#modal-body').querySelectorAll('.participant-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const url = `${window.location.origin}${window.location.pathname}?name=${encodeURIComponent(link.dataset.name)}&tag=${encodeURIComponent(link.dataset.tag)}&region=${link.dataset.region}`;
            window.open(url, '_blank');
        });
    });
    
    $('#modal-body').querySelectorAll('.modal-player-champ').forEach(img => {
        img.style.cursor = 'pointer';
        img.addEventListener('click', () => showChampionModal(img.dataset.championId));
    });
    
    $('#match-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// Champion Modal
function showChampionModal(championId) {
    const champ = getChampionById(championId);
    const summaryEntry = state.profileSummary?.champions?.find(
        c => String(c.championId) === String(championId)
    );
    const stats = state.championStats[championId];
    
    let statsHtml = '';
    if (stats && stats.games > 0) {
        const wr = Math.round((stats.wins / stats.games) * 100);
        const kda = stats.deaths === 0 ? 'Perfect' : ((stats.kills + stats.assists) / stats.deaths).toFixed(2);
        const avgKills = (stats.kills / stats.games).toFixed(1);
        const avgDeaths = (stats.deaths / stats.games).toFixed(1);
        const avgAssists = (stats.assists / stats.games).toFixed(1);
        const csMin = stats.duration ? (stats.cs / (stats.duration / 60)).toFixed(1) : '0.0';
        const avgDamage = stats.games ? formatNumber(Math.round(stats.damage / stats.games)) : '0';
        const avgGold = stats.games ? formatNumber(Math.round(stats.gold / stats.games)) : '0';
        const vision = stats.games ? (stats.vision / stats.games).toFixed(1) : '0.0';
        
        const wrClass = wr >= 55 ? 'good' : (wr <= 45 ? 'bad' : '');
        
        statsHtml = `
            <h3 style="margin: 24px 0 16px; font-size: 1rem;">Estadísticas Recientes</h3>
            <div class="champ-stats-grid">
                <div class="champ-stat-card">
                    <span class="champ-stat-val">${stats.games}</span>
                    <span class="champ-stat-label">Partidas</span>
                </div>
                <div class="champ-stat-card">
                    <span class="champ-stat-val ${wrClass}">${wr}%</span>
                    <span class="champ-stat-label">Winrate</span>
                </div>
                <div class="champ-stat-card">
                    <span class="champ-stat-val">${kda}</span>
                    <span class="champ-stat-label">KDA</span>
                </div>
                <div class="champ-stat-card">
                    <span class="champ-stat-val">${csMin}</span>
                    <span class="champ-stat-label">CS/min</span>
                </div>
                <div class="champ-stat-card">
                    <span class="champ-stat-val">${avgDamage}</span>
                    <span class="champ-stat-label">Daño</span>
                </div>
                <div class="champ-stat-card">
                    <span class="champ-stat-val">${avgGold}</span>
                    <span class="champ-stat-label">Oro</span>
                </div>
            </div>
            <div style="display: flex; gap: 20px; justify-content: center; color: var(--text-secondary); font-size: 0.9rem;">
                <span><strong style="color: var(--win)">${avgKills}</strong> Kills</span>
                <span><strong style="color: var(--loss)">${avgDeaths}</strong> Deaths</span>
                <span><strong style="color: var(--text)">${avgAssists}</strong> Assists</span>
                <span><strong style="color: var(--text)">${vision}</strong> Visión</span>
            </div>
        `;
    } else {
        statsHtml = `<div style="padding: 20px; text-align: center; color: var(--text-muted);">No hay estadísticas recientes para este campeón</div>`;
    }
    
    // Generar builds recomendadas (basadas en datos populares)
    const buildsHtml = generateBuildsSection(championId, summaryEntry);
    
    $('#modal-body').innerHTML = `
        <div class="champ-modal-header">
            <img src="${getChampionIcon(championId)}" class="champ-modal-icon">
            <div class="champ-modal-info">
                <h2>${champ?.name || 'Campeón'}</h2>
                <p>${champ?.title || ''}</p>
            </div>
        </div>
        ${statsHtml}
        ${buildsHtml}
    `;
    
    $('#match-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// Generar sección de builds recomendadas
function generateBuildsSection(championId, summaryEntry) {
    const stats = state.championStats[championId];
    const playerBuild = generatePlayerBuildSection(summaryEntry, stats);
    if (playerBuild) return playerBuild;
    return generateFallbackBuildSection(championId);
}

function generatePlayerBuildSection(summaryEntry, stats) {
    const games = summaryEntry?.games ?? stats?.games ?? 0;
    if (games < 2) return null;

    const items = (summaryEntry?.items || []).filter(item => item?.id);
    const spells = summaryEntry?.spells || [];
    const keystones = summaryEntry?.keystones || [];

    const topItems = items.slice(0, 6);
    const spellPair = spells[0];
    const keystone = keystones[0];

    const keystoneInfo = keystone ? getRuneInfo(Number(keystone.id)) : null;
    const keystonePick = keystone && games ? Math.round((keystone.count / games) * 100) : 0;
    const spellPick = spellPair && games ? Math.round((spellPair.count / games) * 100) : 0;
    const spellIds = Array.isArray(spellPair?.ids) ? spellPair.ids : [];

    const itemsContent = topItems.length
        ? topItems.map(item => {
            const pick = games ? Math.round((item.count / games) * 100) : 0;
            return `
                <div class="build-item-wrapper" style="display:flex;flex-direction:column;align-items:center;gap:4px;min-width:48px;">
                    <img src="${getItemIcon(item.id)}" alt="item ${item.id}" class="build-item" onerror="this.style.display='none'">
                    <span style="font-size:0.75rem;color:var(--text-muted);">${pick}%</span>
                </div>
            `;
        }).join('')
        : '<span>Sin items registrados</span>';

    return `
        <div class="builds-section">
            <h3 class="builds-title">Build basada en tus últimas ${games} partidas</h3>
            <div class="build-row">
                <div class="build-category">
                    <span class="build-label">Runa más usada</span>
                    ${keystoneInfo ? `
                        <div class="rune-display">
                            <img src="${keystoneInfo.icon}" alt="${keystoneInfo.name}" class="keystone-icon">
                            <div>
                                <span>${keystoneInfo.name}</span>
                                <small style="display:block;color:var(--text-muted);">${keystonePick}% de las partidas</small>
                            </div>
                        </div>
                    ` : '<span>Sin datos</span>'}
                </div>
                <div class="build-category">
                    <span class="build-label">Hechizos favoritos</span>
                    ${spellIds.length ? `
                        <div class="spell-row">
                            ${spellIds.map(id => `<img src="${getSpellIcon(id)}" class="build-spell" alt="spell ${id}">`).join('')}
                        </div>
                        <small style="display:block;color:var(--text-muted);margin-top:4px;">${spellPick}% de las partidas</small>
                    ` : '<span>Sin datos</span>'}
                </div>
            </div>
            <div class="build-category" style="margin-top: 12px;">
                <span class="build-label">Items más frecuentes</span>
                <div class="items-row">
                    ${itemsContent}
                </div>
            </div>
        </div>
    `;
}

function generateFallbackBuildSection(championId) {
    const champ = getChampionById(championId);
    const tags = champ?.tags || ['Fighter'];
    const itemsByRole = {
        Assassin: [3142, 6693, 6676, 3814, 6694, 3158],
        Fighter: [3078, 3053, 6333, 3071, 3748, 3111],
        Mage: [3089, 3157, 3135, 4645, 3116, 3020],
        Marksman: [6672, 3031, 3094, 3085, 3046, 3006],
        Support: [3853, 3860, 3857, 3190, 3107, 3158],
        Tank: [3075, 3068, 3143, 3742, 3065, 3047],
        default: [3078, 3053, 6333, 3071, 3748, 3111]
    };
    const runesByRole = {
        Assassin: { primary: 'Electrocute', secondary: 'Sorcery', keystone: 'https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Domination/Electrocute/Electrocute.png' },
        Fighter: { primary: 'Conqueror', secondary: 'Resolve', keystone: 'https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Precision/Conqueror/Conqueror.png' },
        Mage: { primary: 'Arcane Comet', secondary: 'Inspiration', keystone: 'https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Sorcery/ArcaneComet/ArcaneComet.png' },
        Marksman: { primary: 'Lethal Tempo', secondary: 'Inspiration', keystone: 'https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Precision/LethalTempo/LethalTempoTemp.png' },
        Support: { primary: 'Guardian', secondary: 'Inspiration', keystone: 'https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Resolve/Guardian/Guardian.png' },
        Tank: { primary: 'Grasp', secondary: 'Precision', keystone: 'https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Resolve/GraspOfTheUndying/GraspOfTheUndying.png' },
        default: { primary: 'Conqueror', secondary: 'Resolve', keystone: 'https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Precision/Conqueror/Conqueror.png' }
    };
    const role = tags[0] || 'default';
    const items = itemsByRole[role] || itemsByRole.default;
    const runes = runesByRole[role] || runesByRole.default;
    
    return `
        <div class="builds-section">
            <h3 class="builds-title">Build recomendada (genérica)</h3>
            <div class="build-row">
                <div class="build-category">
                    <span class="build-label">Runa Principal</span>
                    <div class="rune-display">
                        <img src="${runes.keystone}" alt="${runes.primary}" class="keystone-icon">
                        <span>${runes.primary}</span>
                    </div>
                </div>
                <div class="build-category">
                    <span class="build-label">Secundaria</span>
                    <span class="build-value">${runes.secondary}</span>
                </div>
            </div>
            <div class="build-category" style="margin-top: 12px;">
                <span class="build-label">Items Core</span>
                <div class="items-row">
                    ${items.map(id => `<img src="${getItemIcon(id)}" alt="" class="build-item" onerror="this.style.display='none'">`).join('')}
                </div>
            </div>
        </div>
    `;
}

function closeModal() {
    $('#match-modal').classList.add('hidden');
    document.body.style.overflow = '';
}

// Live game mejorado
async function checkLiveGame() {
    try {
        if (!state.summoner?.id) {
            $('#btn-live').classList.add('hidden');
            return;
        }
        await api(`/api/live/${state.summoner.id}?region=${state.region}`);
        $('#btn-live').classList.remove('hidden');
    } catch {
        $('#btn-live').classList.add('hidden');
    }
}

async function showLiveGame() {
    try {
        if (!state.summoner?.id) {
            showError('No se pudo obtener la información del invocador');
            return;
        }
        const live = await api(`/api/live/${state.summoner.id}?region=${state.region}`);
        
        const blue = live.participants.filter(p => p.teamId === 100);
        const red = live.participants.filter(p => p.teamId === 200);
        
        // Cargar datos adicionales de cada jugador
        const renderTeamEnhanced = async (team) => {
            const playersHtml = await Promise.all(team.map(async (p) => {
                let rankInfo = '';
                let recentWR = '';
                
                // Intentar obtener ranked info
                try {
                    const summoner = await api(`/api/summoner/by-name/${encodeURIComponent(p.summonerName || p.riotId)}?region=${state.region}`).catch(() => null);
                    if (summoner?.id) {
                        const ranked = await api(`/api/ranked/by-summoner/${summoner.id}?region=${state.region}`).catch(() => []);
                        const solo = Array.isArray(ranked) ? ranked.find(r => r.queueType === 'RANKED_SOLO_5x5') : null;
                        if (solo) {
                            const wr = Math.round((solo.wins / (solo.wins + solo.losses)) * 100);
                            rankInfo = `<span class="live-rank">${solo.tier} ${solo.rank}</span>`;
                            recentWR = `<span class="live-wr">${wr}% WR</span>`;
                        }
                    }
                } catch {}
                
                const isCurrent = p.summonerId === state.summoner?.id || p.puuid === state.puuid;
                
                return `
                    <div class="live-player ${isCurrent ? 'current' : ''}">
                        <img src="${getChampionIcon(p.championId)}" class="live-champ-icon">
                        <div class="live-player-info">
                            <div class="live-player-name">${p.riotId || p.summonerName || 'Jugador'}</div>
                            <div class="live-player-meta">
                                ${rankInfo}
                                ${recentWR}
                            </div>
                        </div>
                        <div class="live-spells">
                            <img src="${getSpellIcon(p.spell1Id)}" class="live-spell">
                            <img src="${getSpellIcon(p.spell2Id)}" class="live-spell">
                        </div>
                    </div>
                `;
            }));
            return playersHtml.join('');
        };
        
        const blueHtml = await renderTeamEnhanced(blue);
        const redHtml = await renderTeamEnhanced(red);
        
        $('#modal-body').innerHTML = `
            <div class="modal-header">
                <div>
                    <div class="live-indicator">
                        <span class="live-dot"></span>
                        EN VIVO
                    </div>
                    <div style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px;">
                        ${queueNames[live.gameQueueConfigId] || 'Partida'} · ${formatDuration(Math.floor(live.gameLength))}
                    </div>
                </div>
            </div>
            <div class="live-teams">
                <div class="live-team blue">
                    <div class="live-team-header">Equipo Azul</div>
                    ${blueHtml}
                </div>
                <div class="live-team red">
                    <div class="live-team-header">Equipo Rojo</div>
                    ${redHtml}
                </div>
            </div>
        `;
        
        $('#match-modal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } catch (err) {
        console.error('Live game error:', err);
    }
}

// Refresh
async function refreshProfile() {
    const btn = $('#btn-update');
    btn.disabled = true;
    btn.style.opacity = '0.5';
    
    try {
        $('#matches-container').innerHTML = '';
        state.matches = [];
        state.matchesLoaded = 0;
        state.championStats = {};
        await loadProfile();
    } catch (err) {
        console.error('Refresh error:', err);
    } finally {
        btn.disabled = false;
        btn.style.opacity = '';
    }
}

// Champions Section
function loadChampionsList() {
    const container = $('#champions-grid');
    if (!container) return;
    
    const sorted = Object.values(state.champions).sort((a, b) => a.name.localeCompare(b.name));
    
    container.innerHTML = sorted.map(champ => `
        <div class="champ-card" data-champion-id="${champ.key}" data-name="${champ.name.toLowerCase()}">
            <img src="https://ddragon.leagueoflegends.com/cdn/${state.ddragonVersion}/img/champion/${champ.id}.png" class="champ-card-icon" loading="lazy">
            <div class="champ-card-name">${champ.name}</div>
        </div>
    `).join('');
    
    container.querySelectorAll('.champ-card').forEach(card => {
        card.addEventListener('click', () => showChampionModal(card.dataset.championId));
    });
}

function filterChampions() {
    const query = $('#champ-search')?.value.toLowerCase() || '';
    $$('.champ-card').forEach(card => {
        card.style.display = card.dataset.name.includes(query) ? '' : 'none';
    });
}

// Items Section
function loadItemsList() {
    const container = $('#items-grid');
    if (!container || !state.items) return;
    
    // Filtrar items válidos (que se pueden comprar y no son componentes ocultos)
    const items = Object.entries(state.items)
        .filter(([id, item]) => {
            // Excluir items de jungla antigua, items de Ornn, etc.
            if (!item.gold?.purchasable) return false;
            if (item.requiredChampion) return false;
            if (item.maps && !item.maps['11']) return false; // Solo Summoner's Rift
            return true;
        })
        .map(([id, item]) => ({ id, ...item }))
        .sort((a, b) => (b.gold?.total || 0) - (a.gold?.total || 0));
    
    renderItems(items);
}

function renderItems(items) {
    const container = $('#items-grid');
    if (!container) return;
    
    container.innerHTML = items.map(item => {
        const tags = item.tags || [];
        const gold = item.gold?.total || 0;
        const isMythic = tags.includes('Mythic');
        const isLegendary = gold >= 2800 && !isMythic;
        
        return `
            <div class="item-card ${isMythic ? 'mythic' : ''} ${isLegendary ? 'legendary' : ''}" 
                 data-item-id="${item.id}" 
                 data-name="${item.name.toLowerCase()}"
                 data-tags="${tags.join(',').toLowerCase()}">
                <div class="item-icon-wrapper">
                    <img src="${getItemIcon(item.id)}" class="item-card-icon" alt="${item.name}" loading="lazy">
                    ${isMythic ? '<span class="item-badge mythic-badge">M</span>' : ''}
                </div>
                <div class="item-card-info">
                    <div class="item-card-name">${item.name}</div>
                    <div class="item-card-gold">${formatNumber(gold)} oro</div>
                </div>
            </div>
        `;
    }).join('');
    
    container.querySelectorAll('.item-card').forEach(card => {
        card.addEventListener('click', () => showItemModal(card.dataset.itemId));
    });
}

function filterItems() {
    const query = $('#item-search')?.value.toLowerCase() || '';
    const category = $('#item-category')?.value || 'all';
    
    $$('.item-card').forEach(card => {
        const nameMatch = card.dataset.name.includes(query);
        const categoryMatch = category === 'all' || card.dataset.tags.includes(category.toLowerCase());
        card.style.display = (nameMatch && categoryMatch) ? '' : 'none';
    });
}

function showItemModal(itemId) {
    const item = state.items[itemId];
    if (!item) return;
    
    const gold = item.gold || {};
    const stats = item.stats || {};
    const tags = item.tags || [];
    
    // Parsear descripción para hacerla más legible
    let description = item.description || '';
    description = description
        .replace(/<br>/gi, '<br>')
        .replace(/<li>/gi, '<li>')
        .replace(/<\/li>/gi, '</li>')
        .replace(/<stats>/gi, '<span class="item-stats-text">')
        .replace(/<\/stats>/gi, '</span>')
        .replace(/<attention>/gi, '<strong class="item-attention">')
        .replace(/<\/attention>/gi, '</strong>')
        .replace(/<passive>/gi, '<span class="item-passive">')
        .replace(/<\/passive>/gi, '</span>')
        .replace(/<active>/gi, '<span class="item-active">')
        .replace(/<\/active>/gi, '</span>')
        .replace(/<unique>/gi, '<span class="item-unique">')
        .replace(/<\/unique>/gi, '</span>')
        .replace(/<keywordMajor>/gi, '<strong>')
        .replace(/<\/keywordMajor>/gi, '</strong>')
        .replace(/<keywordStealth>/gi, '<em>')
        .replace(/<\/keywordStealth>/gi, '</em>');
    
    // Componentes
    const fromItems = item.from || [];
    const intoItems = item.into || [];
    
    $('#modal-body').innerHTML = `
        <div class="item-modal-header">
            <img src="${getItemIcon(itemId)}" class="item-modal-icon">
            <div class="item-modal-info">
                <h2>${item.name}</h2>
                <div class="item-modal-tags">${tags.join(' • ')}</div>
            </div>
            <div class="item-modal-gold">
                <span class="gold-total">${gold.total || 0}</span>
                <span class="gold-label">oro</span>
            </div>
        </div>
        
        <div class="item-description">${description}</div>
        
        ${fromItems.length > 0 ? `
            <div class="item-recipe">
                <h4>Componentes</h4>
                <div class="recipe-items">
                    ${fromItems.map(id => `
                        <img src="${getItemIcon(id)}" class="recipe-item" title="${state.items[id]?.name || id}" data-item-id="${id}">
                    `).join('')}
                </div>
            </div>
        ` : ''}
        
        ${intoItems.length > 0 ? `
            <div class="item-builds-into">
                <h4>Se construye en</h4>
                <div class="recipe-items">
                    ${intoItems.map(id => `
                        <img src="${getItemIcon(id)}" class="recipe-item" title="${state.items[id]?.name || id}" data-item-id="${id}">
                    `).join('')}
                </div>
            </div>
        ` : ''}
    `;
    
    // Click en items de receta
    $('#modal-body').querySelectorAll('.recipe-item').forEach(img => {
        img.addEventListener('click', () => showItemModal(img.dataset.itemId));
    });
    
    $('#match-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// Ranking Section
async function loadRanking() {
    const region = $('#ranking-region')?.value || 'la2';
    const queue = $('#ranking-queue')?.value || 'RANKED_SOLO_5x5';
    
    const table = $('#ranking-table');
    const lpCutoffs = $('#lp-cutoffs');
    
    if (!table) return;
    
    table.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-muted);">Cargando ranking...</div>';
    if (lpCutoffs) lpCutoffs.innerHTML = '';
    
    try {
        const ranking = await api(`/api/ranking/top?region=${region}&queue=${queue}`);
        const players = ranking?.players || [];
        const cutoffs = ranking?.cutoffs || {};

        if (lpCutoffs) {
            lpCutoffs.innerHTML = `
                <div class="lp-cutoff">
                    <span class="cutoff-label">LP mínimo Challenger</span>
                    <span class="cutoff-value">${cutoffs.challenger ?? 'N/A'} LP</span>
                </div>
                <div class="lp-cutoff">
                    <span class="cutoff-label">LP mínimo Grandmaster</span>
                    <span class="cutoff-value">${cutoffs.grandmaster ?? 'N/A'} LP</span>
                </div>
            `;
        }

        if (!players.length) {
            table.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-muted);">No se encontraron jugadores para esta cola.</div>';
            return;
        }

        let html = `
            <div class="ranking-row header">
                <div>#</div>
                <div></div>
                <div>Invocador</div>
                <div style="text-align: center">Partidas</div>
                <div style="text-align: right">LP</div>
                <div style="text-align: right">WR%</div>
            </div>
        `;

        const fallbackVersion = state.ddragonVersion || 'latest';

        players.forEach((player, index) => {
            const pos = player.position || index + 1;
            const wins = player.wins || 0;
            const losses = player.losses || 0;
            const games = wins + losses;
            const wr = games ? Math.round((wins / games) * 100) : 0;
            const name = player.displayName || player.summonerName || `Jugador ${pos}`;
            const level = player.summonerLevel || '';
            const iconUrl = player.profileIconUrl
                || (player.profileIconId ? getProfileIcon(player.profileIconId) : `https://ddragon.leagueoflegends.com/cdn/${fallbackVersion}/img/profileicon/29.png`);
            const tierText = formatTierText(player.tier);
            const wrClass = wr >= 55 ? 'good' : (wr <= 45 ? 'bad' : '');

            html += `
                <div class="ranking-row">
                    <div class="rank-pos ${pos <= 3 ? 'top3' : ''}">${pos}</div>
                    <img src="${getRankEmblem(player.tier)}" class="rank-emblem" onerror="this.style.display='none'">
                    <div class="rank-player">
                        <img src="${iconUrl}" class="rank-player-icon" alt="${name}">
                        <div class="rank-player-info">
                            <span class="rank-name">${name}</span>
                            <span class="rank-tier-label">${tierText}${level ? ` - Nv.${level}` : ''}</span>
                        </div>
                    </div>
                    <div class="rank-games">${games} (${wins}V-${losses}L)</div>
                    <div class="rank-lp">${player.leaguePoints} LP</div>
                    <div class="rank-wr ${wrClass}">${wr}%</div>
                </div>
            `;
        });

        table.innerHTML = html;
    } catch (err) {
        console.error('Error loading ranking:', err);
        table.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-muted);">Error al cargar el ranking.</div>';
        if (lpCutoffs) {
            lpCutoffs.innerHTML = '<div class="lp-cutoff" style="color: var(--loss);">Sin datos disponibles</div>';
        }
    }
}

// Tooltips
function setupTooltips() {
    const tooltip = $('#tooltip');
    if (!tooltip) return;
    
    document.addEventListener('mouseover', e => {
        const el = e.target.closest('[data-tooltip]');
        if (!el) return;
        
        try {
            const data = JSON.parse(el.dataset.tooltip);
            
            let html = `<div class="tooltip-title">${data.title}</div>`;
            if (data.desc) html += `<div class="tooltip-desc">${data.desc}</div>`;
            if (data.stats) {
                html += data.stats.map(s => `<div class="tooltip-stat"><span>${s.label}</span><span>${s.value}</span></div>`).join('');
            }
            
            tooltip.innerHTML = html;
            tooltip.classList.add('visible');
            
            const rect = el.getBoundingClientRect();
            tooltip.style.left = `${rect.left + rect.width/2 - tooltip.offsetWidth/2}px`;
            tooltip.style.top = `${rect.bottom + 8}px`;
        } catch {}
    });
    
    document.addEventListener('mouseout', e => {
        if (e.target.closest('[data-tooltip]')) {
            tooltip.classList.remove('visible');
        }
    });
}

// ==================== TIER LIST ====================
function loadTierList() {
    const container = $('#tierlist-container');
    if (!container) return;
    
    const role = $('#tierlist-role')?.value || 'all';
    const tierFilter = $('#tierlist-tier')?.value || 'all';
    
    const tierData = generateTierListData(role);
    
    const tiers = ['S', 'A', 'B', 'C', 'D'];
    const tierColors = {
        'S': 'tier-s',
        'A': 'tier-a', 
        'B': 'tier-b',
        'C': 'tier-c',
        'D': 'tier-d'
    };
    
    const tierDescriptions = {
        'S': 'Meta dominante - Alta prioridad de pick/ban',
        'A': 'Muy fuerte - Opciones solidas para rankear',
        'B': 'Balanceado - Funcional en manos experimentadas',
        'C': 'Por debajo del promedio - Requiere dominio del campeon',
        'D': 'Debil en el meta - No recomendado para rankear'
    };
    
    // Filtrar por tier si es necesario
    const tiersToShow = tierFilter === 'all' ? tiers : [tierFilter];
    
    container.innerHTML = tiersToShow.map(tier => {
        const champs = tierData[tier] || [];
        if (!champs.length) return '';
        
        return `
            <div class="tier-row">
                <div class="tier-label-container">
                    <div class="tier-label ${tierColors[tier]}">${tier}</div>
                    <div class="tier-description">${tierDescriptions[tier]}</div>
                </div>
                <div class="tier-champions">
                    ${champs.map(c => `
                        <div class="tier-champ" data-champion-id="${c.key}" onclick="showChampionModal('${c.key}')">
                            <img src="https://ddragon.leagueoflegends.com/cdn/${state.ddragonVersion}/img/champion/${c.id}.png" 
                                 alt="${c.name}" class="tier-champ-icon">
                            <div class="tier-champ-info">
                                <div class="tier-champ-name">${c.name}</div>
                                <div class="tier-champ-stats">
                                    <span class="tier-champ-wr ${c.wr >= 52 ? 'good' : c.wr <= 48 ? 'bad' : ''}">${c.wr}%</span>
                                    <span class="tier-champ-games">${formatNumber(c.games)}G</span>
                                </div>
                                <div class="tier-champ-pick">PR: ${c.pickRate}%</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function generateTierListData(role) {
    const allChamps = Object.values(state.champions);
    if (!allChamps.length) return {};
    
    // Datos de campeones por rol con estadisticas aproximadas del meta actual
    const championMeta = {
        top: {
            S: ['Ambessa', 'Ksante', 'Jax', 'Camille', 'Aatrox'],
            A: ['Fiora', 'Riven', 'Gwen', 'Renekton', 'Darius', 'Mordekaiser', 'Sett', 'Gragas'],
            B: ['Garen', 'Malphite', 'Ornn', 'Shen', 'Volibear', 'Trundle', 'Rumble', 'Kennen', 'Jayce', 'Quinn'],
            C: ['Teemo', 'Singed', 'Yorick', 'Illaoi', 'Kayle', 'Nasus', 'Cho\'Gath', 'Urgot'],
            D: ['Tryndamere', 'Gangplank', 'Heimerdinger', 'Akshan']
        },
        jungle: {
            S: ['Viego', 'LeeSin', 'Elise', 'Nidalee', 'Rek\'Sai'],
            A: ['Graves', 'Khazix', 'Hecarim', 'JarvanIV', 'Vi', 'XinZhao', 'Nocturne', 'Warwick'],
            B: ['Amumu', 'Rammus', 'Sejuani', 'Zac', 'Nunu', 'Diana', 'Ekko', 'Evelynn', 'Shyvana'],
            C: ['MasterYi', 'Shaco', 'Rengar', 'Kindred', 'Taliyah', 'Lillia', 'Fiddlesticks'],
            D: ['Ivern', 'Karthus', 'Skarner', 'Udyr']
        },
        mid: {
            S: ['Aurora', 'Syndra', 'Orianna', 'Ahri', 'Leblanc'],
            A: ['Sylas', 'Viktor', 'Azir', 'Akali', 'Zed', 'Yasuo', 'Yone', 'Corki'],
            B: ['Lux', 'Vex', 'Malzahar', 'TwistedFate', 'Galio', 'Kassadin', 'Cassiopeia', 'Anivia', 'Xerath'],
            C: ['Annie', 'Veigar', 'Brand', 'Ziggs', 'Lissandra', 'Neeko', 'Taliyah'],
            D: ['Ryze', 'Aurelion Sol', 'ASol']
        },
        adc: {
            S: ['Jinx', 'Jhin', 'Caitlyn', 'Ashe', 'Ezreal'],
            A: ['Kai\'Sa', 'Vayne', 'Lucian', 'MissFortune', 'Draven', 'Tristana', 'Xayah'],
            B: ['Samira', 'Zeri', 'Sivir', 'Aphelios', 'Varus', 'Twitch', 'Kog\'Maw'],
            C: ['Kalista', 'Nilah'],
            D: []
        },
        support: {
            S: ['Thresh', 'Nautilus', 'Leona', 'Blitzcrank', 'Rakan'],
            A: ['Lulu', 'Nami', 'Janna', 'Milio', 'Rell', 'Alistar', 'Braum'],
            B: ['Morgana', 'Karma', 'Senna', 'Pyke', 'Bard', 'Soraka', 'Renata'],
            C: ['Yuumi', 'Sona', 'Taric', 'Zilean', 'Seraphine'],
            D: ['Tahm Kench']
        }
    };
    
    // WR base por tier (simulado pero realista)
    const wrBase = { S: 53, A: 51, B: 50, C: 48, D: 46 };
    const prBase = { S: 12, A: 8, B: 5, C: 3, D: 1.5 };
    const gamesBase = { S: 80000, A: 50000, B: 30000, C: 15000, D: 8000 };
    
    const result = { S: [], A: [], B: [], C: [], D: [] };
    
    const rolesToProcess = role === 'all' ? Object.keys(championMeta) : [role];
    const addedChamps = new Set();
    
    for (const currentRole of rolesToProcess) {
        const roleData = championMeta[currentRole];
        if (!roleData) continue;
        
        for (const tier of Object.keys(result)) {
            const champNames = roleData[tier] || [];
            
            for (const champName of champNames) {
                if (addedChamps.has(champName)) continue;
                
                const champ = allChamps.find(c => 
                    c.name === champName || 
                    c.id === champName || 
                    c.name.includes(champName) ||
                    champName.includes(c.name)
                );
                
                if (champ && !addedChamps.has(champ.id)) {
                    addedChamps.add(champ.id);
                    
                    // Agregar variacion para que no sean todos iguales
                    const wrVariation = (Math.random() - 0.5) * 2;
                    const prVariation = (Math.random() - 0.5) * 2;
                    const gamesVariation = Math.random() * 0.3;
                    
                    result[tier].push({
                        ...champ,
                        wr: (wrBase[tier] + wrVariation).toFixed(1),
                        pickRate: (prBase[tier] + prVariation).toFixed(1),
                        games: Math.floor(gamesBase[tier] * (1 + gamesVariation))
                    });
                }
            }
        }
    }
    
    // Ordenar cada tier por WR descendente
    for (const tier of Object.keys(result)) {
        result[tier].sort((a, b) => parseFloat(b.wr) - parseFloat(a.wr));
    }
    
    return result;
}

// ==================== MULTI-SEARCH ====================
async function doMultiSearch() {
    const input = $('#multisearch-input')?.value;
    const region = $('#multisearch-region')?.value || 'la2';
    const container = $('#multisearch-results');
    
    if (!input?.trim() || !container) return;
    
    // Parsear nombres del input
    const lines = input.split('\n').filter(l => l.trim());
    const players = lines.map(line => {
        const cleaned = line.trim();
        // Intentar parsear Nombre#TAG
        if (cleaned.includes('#')) {
            const [name, tag] = cleaned.split('#');
            return { name: name.trim(), tag: tag.trim() };
        }
        // Si no tiene #, intentar extraer de formato de lobby
        const match = cleaned.match(/([^\s]+)\s+joined/i) || cleaned.match(/^([^\s]+)/);
        if (match) {
            return { name: match[1], tag: region.toUpperCase().replace(/[0-9]/g, '') };
        }
        return null;
    }).filter(Boolean);
    
    if (players.length === 0) {
        container.innerHTML = '<div style="padding: 20px; color: var(--text-muted);">No se encontraron nombres válidos. Usa el formato Nombre#TAG</div>';
        return;
    }
    
    container.innerHTML = players.map((p, i) => `
        <div class="multisearch-player loading" id="ms-player-${i}">
            <div class="multisearch-header">
                <div class="spinner" style="width: 24px; height: 24px;"></div>
                <div class="multisearch-info">
                    <div class="multisearch-name">${p.name}#${p.tag}</div>
                    <div class="multisearch-rank">Cargando...</div>
                </div>
            </div>
        </div>
    `).join('');
    
    // Buscar cada jugador
    for (let i = 0; i < players.length; i++) {
        const p = players[i];
        const el = $(`#ms-player-${i}`);
        
        try {
            const account = await api(`/api/account/${encodeURIComponent(p.name)}/${encodeURIComponent(p.tag)}?region=${region}`);
            const [summoner, ranked, matchIds] = await Promise.all([
                api(`/api/summoner/${account.puuid}?region=${region}`),
                api(`/api/ranked/${account.puuid}?region=${region}`),
                api(`/api/matches/${account.puuid}?region=${region}&count=10`)
            ]);
            
            const solo = ranked.find(e => e.queueType === 'RANKED_SOLO_5x5');
            
            // Calcular stats de las últimas partidas
            let wins = 0, games = 0;
            const champCounts = {};
            
            for (const matchId of matchIds.slice(0, 5)) {
                try {
                    const match = await api(`/api/match/${matchId}?region=${region}`);
                    const me = match.info.participants.find(pp => pp.puuid === account.puuid);
                    if (me) {
                        games++;
                        if (me.win) wins++;
                        champCounts[me.championId] = (champCounts[me.championId] || 0) + 1;
                    }
                } catch {}
            }
            
            const topChamps = Object.entries(champCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([id]) => id);
            
            const wr = games > 0 ? Math.round((wins / games) * 100) : 0;
            
            el.classList.remove('loading');
            el.innerHTML = `
                <div class="multisearch-header">
                    <img src="${getProfileIcon(summoner.profileIconId)}" class="multisearch-icon">
                    <div class="multisearch-info">
                        <div class="multisearch-name" onclick="window.open('?name=${encodeURIComponent(p.name)}&tag=${encodeURIComponent(p.tag)}&region=${region}', '_blank')">${p.name}#${p.tag}</div>
                        <div class="multisearch-rank">
                            ${solo ? `
                                <img src="${getRankEmblem(solo.tier)}" class="multisearch-rank-emblem">
                                <span>${solo.tier} ${solo.rank} - ${solo.leaguePoints} LP</span>
                            ` : '<span>Sin clasificar</span>'}
                        </div>
                    </div>
                </div>
                <div class="multisearch-stats">
                    <div class="multisearch-stat">
                        <div class="multisearch-stat-val" style="color: ${wr >= 50 ? 'var(--win)' : 'var(--loss)'}">${wr}%</div>
                        <div class="multisearch-stat-label">WR (${games}G)</div>
                    </div>
                    <div class="multisearch-stat">
                        <div class="multisearch-stat-val">${solo ? `${solo.wins}W` : '-'}</div>
                        <div class="multisearch-stat-label">Victorias</div>
                    </div>
                    <div class="multisearch-stat">
                        <div class="multisearch-stat-val">${solo ? `${solo.losses}L` : '-'}</div>
                        <div class="multisearch-stat-label">Derrotas</div>
                    </div>
                </div>
                <div class="multisearch-champs">
                    ${topChamps.map(id => `<img src="${getChampionIcon(id)}" class="multisearch-champ" title="${getChampionName(id)}">`).join('')}
                </div>
            `;
        } catch (err) {
            el.classList.remove('loading');
            el.innerHTML = `
                <div class="multisearch-header">
                    <div style="width: 48px; height: 48px; background: var(--bg-hover); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></div>
                    <div class="multisearch-info">
                        <div class="multisearch-name">${p.name}#${p.tag}</div>
                        <div class="multisearch-rank" style="color: var(--loss);">No encontrado</div>
                    </div>
                </div>
            `;
        }
    }
}

// ==================== PROFILE ENHANCEMENTS ====================
function updateRecentResults() {
    const container = $('#recent-results');
    const streakEl = $('#streak-indicator');
    
    if (!container || !state.matches.length) return;
    
    // Últimos 10 resultados
    const recent = state.matches.slice(0, 10).map(m => {
        const me = m.info.participants.find(p => p.puuid === state.puuid);
        if (!me) return 'loss';
        if (m.info.gameDuration < 300) return 'remake';
        return me.win ? 'win' : 'loss';
    });
    
    container.innerHTML = recent.map((r, i) => `
        <div class="recent-result ${r}" title="Partida ${i + 1}: ${r === 'win' ? 'Victoria' : r === 'loss' ? 'Derrota' : 'Remake'}">
            ${r === 'win' ? 'W' : r === 'loss' ? 'L' : 'R'}
        </div>
    `).join('');
    
    // Calcular racha
    let streak = 0;
    const first = recent[0];
    if (first === 'win' || first === 'loss') {
        for (const r of recent) {
            if (r === first) streak++;
            else break;
        }
    }
    
    if (streakEl) {
        if (streak >= 2) {
            streakEl.className = `streak-indicator ${first === 'win' ? 'winning' : 'losing'}`;
        } else {
            streakEl.className = 'streak-indicator';
        }
    }
}

function updateRoleStats() {
    const container = $('#role-stats');
    if (!container || !state.matches.length) return;
    
    const roles = { TOP: 0, JUNGLE: 0, MIDDLE: 0, BOTTOM: 0, UTILITY: 0 };
    
    state.matches.forEach(m => {
        const me = m.info.participants.find(p => p.puuid === state.puuid);
        if (me?.teamPosition && roles[me.teamPosition] !== undefined) {
            roles[me.teamPosition]++;
        }
    });
    
    const total = Object.values(roles).reduce((a, b) => a + b, 0) || 1;
    const maxRole = Object.entries(roles).sort((a, b) => b[1] - a[1])[0]?.[0] || 'MIDDLE';
    
    const roleIcons = {
        TOP: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-top.png',
        JUNGLE: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-jungle.png',
        MIDDLE: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-middle.png',
        BOTTOM: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-bottom.png',
        UTILITY: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-utility.png'
    };
    
    const roleNames = { TOP: 'Top', JUNGLE: 'Jg', MIDDLE: 'Mid', BOTTOM: 'ADC', UTILITY: 'Sup' };
    
    container.innerHTML = Object.entries(roles).map(([role, count]) => {
        const percent = Math.round((count / total) * 100);
        return `
            <div class="role-stat ${role === maxRole ? 'active' : ''}">
                <img src="${roleIcons[role]}" class="role-icon" alt="${roleNames[role]}" onerror="this.style.display='none'">
                <span class="role-percent">${percent}%</span>
            </div>
        `;
    }).join('');
}
