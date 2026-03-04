// ══════════════════════════════════════════════════════════
//  MARKET TERMINAL — Daily Report Generator
//  Llama a Claude API → genera HTML completo del día
// ══════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync } from 'fs';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Fecha de hoy en Argentina ──────────────────────────────
const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const fechaLarga = `${dias[now.getDay()]} ${now.getDate()} de ${meses[now.getMonth()]}, ${now.getFullYear()}`;
const fechaCorta = `${String(now.getDate()).padStart(2,'0')}${meses[now.getMonth()].slice(0,3).toLowerCase()}${now.getFullYear()}`;
const hora = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

console.log(`📅 Generando informe para: ${fechaLarga}`);

// ── Pedir análisis editorial a Claude ─────────────────────
async function getEditorialContent() {
  console.log('🤖 Llamando a Claude para contenido editorial...');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: `Sos un analista financiero senior especializado en mercados argentinos y globales. 
Hoy es ${fechaLarga}.

Generá el contenido editorial para un informe de mercado diario en formato JSON estricto. 
Basate en el contexto económico-financiero más reciente que conozcas.

Respondé SOLO con JSON válido, sin texto extra, sin markdown, sin backticks:

{
  "driver_titulo": "título del driver principal del día (máx 60 chars)",
  "driver_emoji": "emoji relevante",
  "driver_alerta_tipo": "red|yellow|blue|green",
  "driver_alerta_titulo": "título del alert box",
  "driver_alerta_texto": "texto HTML del alert, puede tener <strong> y <em>",
  "driver_contexto": "párrafo HTML de contexto general del mercado hoy, 3-4 oraciones, puede tener <strong> y <em>",
  "stat1_label": "label stat card 1",
  "stat1_valor": "valor stat 1",
  "stat1_clase": "up|dn|warn|info",
  "stat1_sub": "subtexto",
  "stat2_label": "label stat card 2",
  "stat2_valor": "valor stat 2",
  "stat2_clase": "up|dn|warn|info",
  "stat2_sub": "subtexto",
  "stat3_label": "label stat card 3",
  "stat3_valor": "valor stat 3",
  "stat3_clase": "up|dn|warn|info",
  "stat3_sub": "subtexto",
  "stat4_label": "label stat card 4",
  "stat4_valor": "valor stat 4",
  "stat4_clase": "up|dn|warn|info",
  "stat4_sub": "subtexto",
  "resumen_ejecutivo": "texto HTML del resumen ejecutivo del día",
  "badge_mercado": "texto del badge de estado (ej: NYSE ABIERTO — BAJA MODERADA)",
  "badge_clase": "badge-open|badge-warn",
  "riesgo_geopolitico": "BAJO|MODERADO|ALTO|MÁXIMO",
  "commodities_alerta": "texto corto sobre energía/commodities hoy",
  "commodities_tipo": "red|yellow|blue|green",
  "geo_eventos": [
    {
      "badge": "texto badge",
      "badge_color": "#ff4060|#ff8c00|#f0c040|#4a9eff|#8b5cf6|#00d49a",
      "badge_bg": "rgba(255,64,96,.15)|rgba(255,140,0,.15)|rgba(240,192,64,.15)|rgba(74,158,255,.15)|rgba(139,92,246,.15)|rgba(0,212,154,.15)",
      "region": "región",
      "headline": "titular del evento geopolítico",
      "body": "análisis del evento en 2-3 oraciones",
      "impacto": "impacto en mercados en una línea"
    }
  ],
  "calendario_eventos": [
    {
      "dia": "Hoy|Mañana|Lun DD|Mar DD|Mie DD|Jue DD|Vie DD",
      "hora": "HH:MM ET|HH:MM AR|HH:MM EU",
      "flag": "🇺🇸|🇦🇷|🇪🇺|🇨🇳|🇬🇧",
      "evento": "nombre del evento económico",
      "impacto": "CRÍTICO|ALTO|MEDIO",
      "impacto_color": "#ff4060|#ff8c00|#4a9eff",
      "impacto_bg": "rgba(255,64,96,.12)|rgba(255,140,0,.12)|rgba(74,158,255,.12)",
      "descripcion": "descripción breve del impacto esperado"
    }
  ],
  "analisis_global": "análisis HTML del mercado global hoy, 4-5 oraciones",
  "analisis_argentina": "análisis HTML del mercado argentino hoy, 4-5 oraciones",
  "analisis_tecnico_sp": "análisis técnico HTML del S&P 500 hoy",
  "analisis_latam": "análisis HTML de Brasil y LatAm",
  "outlook_48h": "texto HTML del outlook para las próximas 48 horas",
  "dolar_oficial_venta": "precio en pesos sin puntos (ej: 1425)",
  "dolar_blue_venta": "precio",
  "dolar_mep_venta": "precio",
  "dolar_ccl_venta": "precio",
  "dolar_cripto_venta": "precio",
  "dolar_tarjeta_venta": "precio estimado",
  "brecha_blue": "porcentaje de brecha blue vs oficial",
  "merval_ars": "valor aproximado del MERVAL en ARS",
  "merval_usd": "valor aproximado del MERVAL en USD CCL",
  "riesgo_pais": "valor en bps",
  "reservas_bcra": "valor en millones USD",
  "fear_greed_valor": número entre 0 y 100,
  "fear_greed_label": "MIEDO EXTREMO|MIEDO|NEUTRAL|CODICIA|CODICIA EXTREMA",
  "fear_greed_color": "#ff4060|#ff8060|#ffaa00|#80d49a|#00d49a",
  "fear_greed_needle_pct": número entre 0 y 100 (posición de la aguja),
  "ganadores_dia": "texto sobre ganadores del día en USA",
  "perdedores_dia": "texto sobre perdedores del día en USA"
}`
    }]
  });

  const text = response.content[0].text.trim();
  return JSON.parse(text);
}

// ── Generar HTML completo ──────────────────────────────────
function generateHTML(d) {
  console.log('🎨 Generando HTML...');

  const geoCards = (d.geo_eventos || []).map(e => `
    <div class="geo-card" style="border-color:${e.badge_color};" onclick="this.classList.toggle('open')">
      <div class="geo-header">
        <span class="geo-badge" style="color:${e.badge_color};background:${e.badge_bg}">${e.badge}</span>
        <span class="geo-region">${e.region}</span>
      </div>
      <div class="geo-headline">${e.headline}</div>
      <div class="geo-toggle"></div>
      <div class="geo-detail">
        <div class="geo-body">${e.body}</div>
        <div class="geo-impact">📊 IMPACTO: ${e.impacto}</div>
      </div>
    </div>`).join('\n');

  const calItems = (d.calendario_eventos || []).map(e => `
    <div class="cal-item">
      <div class="cal-date"><div class="cal-day">${e.dia}</div><div class="cal-time">${e.hora}</div></div>
      <div class="cal-body">
        <div class="cal-event"><span class="cal-flag">${e.flag}</span> ${e.evento}</div>
        <span class="impact-badge" style="color:${e.impacto_color};background:${e.impacto_bg}">${e.impacto}</span>
        <div style="font-size:10px;color:var(--dim);margin-top:4px">${e.descripcion}</div>
      </div>
    </div>`).join('\n');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Market Terminal — ${fechaLarga}</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Syne:wght@400;700;800&display=swap" rel="stylesheet"/>
<style>
  :root {
    --bg:#05080f; --bg2:#0a1020; --bg3:#0d1828; --border:#1a2a40;
    --up:#00d49a; --dn:#ff4060; --warn:#ffaa00; --info:#4a9eff;
    --purple:#8b5cf6; --text:#c8d8e8; --dim:#4a6a8a; --bright:#e8f4ff;
    --accent:#00d49a;
  }
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:var(--bg);color:var(--text);font-family:'Space Mono',monospace;min-height:100vh;overflow-x:hidden;}
  body::before{content:'';position:fixed;inset:0;z-index:1000;pointer-events:none;
    background:repeating-linear-gradient(0deg,rgba(0,212,154,.018) 0px,rgba(0,212,154,.018) 1px,transparent 1px,transparent 3px);}
  .header{background:linear-gradient(180deg,#0d1828 0%,#05080f 100%);border-bottom:1px solid #1a3a5a;padding:20px 24px 0;position:sticky;top:0;z-index:100;}
  .header-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;}
  .logo-area{display:flex;flex-direction:column;gap:3px;}
  .logo-tag{font-size:9px;color:var(--up);letter-spacing:4px;}
  .logo-title{font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:var(--bright);letter-spacing:-1px;}
  .logo-date{font-size:11px;color:var(--dim);margin-top:2px;}
  .header-stats{display:flex;flex-direction:column;align-items:flex-end;gap:5px;}
  .market-badge{display:inline-flex;align-items:center;gap:5px;font-size:9px;letter-spacing:1.5px;font-weight:700;padding:3px 10px;border-radius:20px;}
  .badge-open{background:rgba(0,212,154,.15);color:var(--up);border:1px solid rgba(0,212,154,.3);}
  .badge-warn{background:rgba(255,170,0,.12);color:var(--warn);border:1px solid rgba(255,170,0,.3);}
  .hero-strip{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:10px 0 6px;flex-wrap:nowrap;}
  .hero-strip::-webkit-scrollbar{display:none;}
  .hero-chip{flex-shrink:0;background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:7px 12px;display:flex;flex-direction:column;gap:1px;min-width:90px;}
  .chip-label{font-size:8px;color:var(--dim);letter-spacing:1px;}
  .chip-val{font-size:13px;font-weight:700;color:var(--bright);}
  .chip-chg{font-size:10px;font-weight:700;}
  .up{color:var(--up);} .dn{color:var(--dn);} .warn{color:var(--warn);} .info{color:var(--info);}
  .tab-bar{display:flex;gap:2px;overflow-x:auto;scrollbar-width:none;border-top:1px solid var(--border);margin-top:8px;}
  .tab-bar::-webkit-scrollbar{display:none;}
  .tab-btn{flex-shrink:0;background:none;border:none;border-bottom:2px solid transparent;color:var(--dim);cursor:pointer;padding:10px 14px;font-size:11px;font-family:'Space Mono',monospace;letter-spacing:.3px;white-space:nowrap;transition:all .18s;}
  .tab-btn:hover{color:var(--text);}
  .tab-btn.active{color:var(--up);border-bottom-color:var(--up);background:rgba(0,212,154,.04);}
  .content{padding:20px 20px 60px;max-width:960px;margin:0 auto;}
  .tab-panel{display:none;animation:fadeIn .2s ease;}
  .tab-panel.active{display:block;}
  @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
  .sec-title{font-family:'Syne',sans-serif;font-size:10px;letter-spacing:3px;color:var(--dim);text-transform:uppercase;margin:20px 0 10px;display:flex;align-items:center;gap:10px;}
  .sec-title::before,.sec-title::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,#1a3a5a,transparent);}
  .sec-title::after{background:linear-gradient(270deg,#1a3a5a,transparent);}
  .alert{border-radius:8px;padding:12px 16px;margin-bottom:14px;border-left:3px solid;font-size:12px;line-height:1.65;}
  .alert-red{background:rgba(255,64,96,.07);border-color:var(--dn);color:#ffaab8;}
  .alert-yellow{background:rgba(255,170,0,.07);border-color:var(--warn);color:#ffd080;}
  .alert-blue{background:rgba(74,158,255,.07);border-color:var(--info);color:#90c0ff;}
  .alert-green{background:rgba(0,212,154,.07);border-color:var(--up);color:#80e8c8;}
  .alert-title{font-family:'Syne',sans-serif;font-weight:700;font-size:13px;color:var(--bright);margin-bottom:5px;}
  .mkt-table{width:100%;border-collapse:collapse;}
  .mkt-table th{font-size:9px;letter-spacing:2px;color:var(--dim);text-align:left;padding:6px 10px;border-bottom:1px solid var(--border);font-weight:400;}
  .mkt-table th:last-child,.mkt-table td:last-child{text-align:right;}
  .mkt-table td{padding:9px 10px;font-size:12px;border-bottom:1px solid rgba(26,42,64,.5);vertical-align:middle;}
  .mkt-table tr:hover td{background:rgba(255,255,255,.02);}
  .sym{font-size:10px;color:var(--dim);}
  .name{color:var(--bright);font-weight:700;font-size:13px;}
  .price{font-size:14px;color:var(--bright);font-weight:700;font-variant-numeric:tabular-nums;}
  .chg-up{color:var(--up);font-weight:700;} .chg-dn{color:var(--dn);font-weight:700;} .chg-flat{color:var(--dim);}
  .fx-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
  .fx-card{background:var(--bg2);border-radius:8px;padding:12px;border-left:3px solid var(--info);display:flex;flex-direction:column;gap:3px;}
  .fx-name{font-size:11px;font-weight:700;color:var(--bright);}
  .fx-pair{font-size:9px;color:var(--dim);}
  .fx-price{font-size:16px;font-weight:700;color:var(--bright);font-variant-numeric:tabular-nums;}
  .stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;}
  .stat-card{background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:14px 12px;}
  .stat-label{font-size:9px;color:var(--dim);letter-spacing:1.5px;margin-bottom:5px;}
  .stat-val{font-family:'Syne',sans-serif;font-size:22px;font-weight:800;}
  .stat-sub{font-size:10px;color:var(--dim);margin-top:3px;}
  .context-box{background:linear-gradient(135deg,#0d2030,#08101a);border:1px solid #1a3a5a;border-radius:10px;padding:18px;margin-bottom:16px;line-height:1.8;font-size:12px;color:#8ab0d0;}
  .context-box strong{color:var(--bright);} .context-box em{color:var(--warn);font-style:normal;}
  .geo-card{border-radius:8px;padding:14px;margin-bottom:10px;border-left:3px solid;cursor:pointer;background:linear-gradient(135deg,#0d1828,#08101a);transition:background .15s;}
  .geo-card:hover{background:linear-gradient(135deg,#0f1e30,#0a1420);}
  .geo-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;}
  .geo-badge{font-size:8px;font-weight:700;letter-spacing:1.5px;padding:2px 8px;border-radius:3px;}
  .geo-region{font-size:9px;color:var(--dim);}
  .geo-headline{font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:var(--bright);line-height:1.4;margin-bottom:6px;}
  .geo-body{font-size:11px;color:#7a9ab8;line-height:1.65;margin-bottom:10px;}
  .geo-impact{background:rgba(0,212,154,.08);border-radius:4px;padding:6px 10px;font-size:10px;color:var(--up);}
  .geo-toggle{font-size:9px;color:var(--up);opacity:.6;text-align:right;}
  .geo-detail{display:none;margin-top:10px;padding-top:10px;border-top:1px solid #1a3a5a;}
  .geo-card.open .geo-detail{display:block;}
  .geo-card.open .geo-toggle::after{content:' ▲ Cerrar';}
  .geo-card:not(.open) .geo-toggle::after{content:' ▼ Ver análisis';}
  .cal-item{display:flex;gap:12px;align-items:flex-start;padding:10px 14px;margin-bottom:8px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;}
  .cal-date{min-width:56px;}
  .cal-day{font-size:10px;color:var(--info);font-weight:700;}
  .cal-time{font-size:9px;color:var(--dim);}
  .cal-body{flex:1;}
  .cal-event{font-size:12px;color:var(--bright);margin-bottom:4px;display:flex;align-items:center;gap:6px;}
  .cal-flag{font-size:14px;}
  .impact-badge{font-size:8px;font-weight:700;letter-spacing:1px;padding:2px 6px;border-radius:3px;}
  .comment-card{border-radius:10px;padding:16px;margin-bottom:12px;border-left:3px solid;background:linear-gradient(135deg,#0d1828,#08101a);}
  .comment-header{display:flex;gap:10px;align-items:center;margin-bottom:10px;}
  .comment-icon{font-size:22px;}
  .comment-author{font-family:'Syne',sans-serif;font-size:13px;font-weight:700;}
  .comment-time{font-size:9px;color:var(--dim);}
  .comment-body{font-size:12px;color:#8ab0d0;line-height:1.75;}
  .live-loading{color:var(--dim);font-size:11px;padding:12px;letter-spacing:1px;}
  .live-tbl{width:100%;border-collapse:collapse;margin-bottom:16px;}
  .live-tbl th{font-size:9px;letter-spacing:2px;color:var(--dim);padding:6px 10px;border-bottom:1px solid var(--border);text-align:left;font-weight:400;}
  .live-tbl th:nth-child(3),.live-tbl th:nth-child(4){text-align:right;}
  .live-tbl td{padding:9px 10px;font-size:12px;border-bottom:1px solid rgba(26,42,64,.4);vertical-align:middle;}
  .live-tbl tr:hover td{background:rgba(255,255,255,.02);}
  .live-tbl td:nth-child(3),.live-tbl td:nth-child(4){text-align:right;font-variant-numeric:tabular-nums;}
  .lv-name{color:var(--bright);font-weight:700;font-size:13px;}
  .lv-sym{font-size:9px;color:var(--dim);}
  .lv-price{font-size:14px;font-weight:700;color:var(--bright);}
  .lv-up{color:var(--up);font-weight:700;} .lv-dn{color:var(--dn);font-weight:700;} .lv-flat{color:var(--dim);}
  .lv-err{color:var(--warn);font-size:10px;}
  .live-badge{display:inline-block;font-size:8px;padding:1px 5px;border-radius:3px;margin-left:4px;vertical-align:middle;}
  .badge-live{background:rgba(0,212,154,.15);color:var(--up);border:1px solid rgba(0,212,154,.3);}
  .badge-closed{background:rgba(255,170,0,.15);color:var(--warn);border:1px solid rgba(255,170,0,.3);}
  .footer{text-align:center;padding:20px;font-size:9px;color:var(--dim);letter-spacing:1px;border-top:1px solid var(--border);}
  @media(max-width:600px){.fx-grid{grid-template-columns:1fr;}.stat-grid{grid-template-columns:1fr;}.logo-title{font-size:20px;}.mkt-table td,.mkt-table th{padding:7px 6px;font-size:11px;}}
</style>
</head>
<body>

<div class="header">
  <div class="header-top">
    <div class="logo-area">
      <div class="logo-tag">▶ MARKET TERMINAL LIVE</div>
      <div class="logo-title">INFORME DE MERCADO</div>
      <div class="logo-date">${fechaLarga} · ${hora} hs AR</div>
    </div>
    <div class="header-stats">
      <div class="market-badge ${d.badge_clase}">⚡ ${d.badge_mercado}</div>
      <div style="font-size:11px;color:#4a9eff;margin-top:4px;">Riesgo geopolítico: <strong style="color:${d.riesgo_geopolitico==='MÁXIMO'?'#ff4060':d.riesgo_geopolitico==='ALTO'?'#ff8c00':'#ffaa00'}">${d.riesgo_geopolitico}</strong></div>
    </div>
  </div>

  <div class="hero-strip" id="hero-strip">
    <div class="hero-chip"><span class="chip-label">S&P 500</span><span class="chip-val" id="hs-sp500">—</span><span class="chip-chg" id="hs-sp500c">⏳</span></div>
    <div class="hero-chip"><span class="chip-label">NASDAQ</span><span class="chip-val" id="hs-nq">—</span><span class="chip-chg" id="hs-nqc">⏳</span></div>
    <div class="hero-chip"><span class="chip-label">VIX</span><span class="chip-val" id="hs-vix">—</span><span class="chip-chg" id="hs-vixc">⏳</span></div>
    <div class="hero-chip"><span class="chip-label">DÓLAR BLUE</span><span class="chip-val">$${d.dolar_blue_venta}</span><span class="chip-chg up">ARS</span></div>
    <div class="hero-chip"><span class="chip-label">CCL</span><span class="chip-val">$${d.dolar_ccl_venta}</span><span class="chip-chg up">ARS</span></div>
    <div class="hero-chip"><span class="chip-label">MERVAL</span><span class="chip-val" id="hs-merv">—</span><span class="chip-chg" id="hs-mervc">⏳</span></div>
    <div class="hero-chip"><span class="chip-label">WTI OIL</span><span class="chip-val" id="hs-wti">—</span><span class="chip-chg" id="hs-wtic">⏳</span></div>
    <div class="hero-chip"><span class="chip-label">ORO</span><span class="chip-val" id="hs-gold">—</span><span class="chip-chg" id="hs-goldc">⏳</span></div>
    <div class="hero-chip"><span class="chip-label">BTC</span><span class="chip-val" id="hs-btc">—</span><span class="chip-chg" id="hs-btcc">⏳</span></div>
  </div>

  <div class="tab-bar">
    <button class="tab-btn active" onclick="showTab('contexto',this)">📊 Contexto</button>
    <button class="tab-btn" onclick="showTab('usa',this)">🇺🇸 USA</button>
    <button class="tab-btn" onclick="showTab('argentina',this)">🇦🇷 Argentina</button>
    <button class="tab-btn" onclick="showTab('mundo',this)">🌍 Mundo</button>
    <button class="tab-btn" onclick="showTab('commodities',this)">⚡ Commodities</button>
    <button class="tab-btn" onclick="showTab('geo',this)">🎖️ Geopolítica</button>
    <button class="tab-btn" onclick="showTab('calendario',this)">📅 Calendario</button>
    <button class="tab-btn" onclick="showTab('analisis',this)">💬 Análisis</button>
  </div>
</div>

<div class="content">

  <!-- ══ CONTEXTO ══ -->
  <div id="tab-contexto" class="tab-panel active">
    <div class="sec-title">DRIVER CENTRAL DEL DÍA</div>
    <div class="alert alert-${d.driver_alerta_tipo}">
      <div class="alert-title">${d.driver_emoji} ${d.driver_alerta_titulo}</div>
      ${d.driver_alerta_texto}
    </div>
    <div class="context-box">${d.driver_contexto}</div>
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-label">${d.stat1_label}</div><div class="stat-val ${d.stat1_clase}">${d.stat1_valor}</div><div class="stat-sub">${d.stat1_sub}</div></div>
      <div class="stat-card"><div class="stat-label">${d.stat2_label}</div><div class="stat-val ${d.stat2_clase}">${d.stat2_valor}</div><div class="stat-sub">${d.stat2_sub}</div></div>
      <div class="stat-card"><div class="stat-label">${d.stat3_label}</div><div class="stat-val ${d.stat3_clase}">${d.stat3_valor}</div><div class="stat-sub">${d.stat3_sub}</div></div>
      <div class="stat-card"><div class="stat-label">${d.stat4_label}</div><div class="stat-val ${d.stat4_clase}">${d.stat4_valor}</div><div class="stat-sub">${d.stat4_sub}</div></div>
    </div>
    <div class="alert alert-yellow">
      <div class="alert-title">📌 Resumen ejecutivo del día</div>
      ${d.resumen_ejecutivo}
    </div>
  </div>

  <!-- ══ USA ══ -->
  <div id="tab-usa" class="tab-panel">
    <div class="sec-title">ÍNDICES & FUTUROS — TIEMPO REAL</div>
    <div style="font-size:9px;color:var(--accent);letter-spacing:1px;margin-bottom:8px;">⚡ YAHOO FINANCE API</div>
    <div id="tbl-usa-indices"></div>
    <div id="tbl-usa-futuros"></div>
    <div id="tbl-usa-bonos"></div>
    <div class="sec-title">SECTORES S&P 500</div>
    <div id="tbl-usa-sectores"></div>
    <div class="sec-title">🎖️ DEFENSA</div>
    <div id="tbl-usa-defensa"></div>
    <div class="sec-title">MEGA TECH</div>
    <div id="tbl-usa-tech"></div>
    <div class="sec-title">FEAR & GREED INDEX</div>
    <div style="border:1px solid var(--border);border-radius:4px;background:#0a1628;padding:16px;text-align:center;margin-bottom:12px;">
      <div style="font-size:11px;color:var(--dim);letter-spacing:2px;margin-bottom:8px;">SENTIMENT · ${fechaLarga.toUpperCase()}</div>
      <div style="background:linear-gradient(90deg,#00c853 0%,#ffeb3b 40%,#ff5722 75%,#b71c1c 100%);height:14px;border-radius:7px;position:relative;margin:0 auto 10px;max-width:300px;">
        <div style="position:absolute;left:${d.fear_greed_needle_pct}%;top:-6px;width:3px;height:26px;background:#fff;border-radius:2px;box-shadow:0 0 6px #fff;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;max-width:300px;margin:0 auto 14px;font-size:9px;color:var(--dim);">
        <span>MIEDO<br>EXTREMO</span><span>MIEDO</span><span>NEUTRAL</span><span>CODICIA</span><span>CODICIA<br>EXTREMA</span>
      </div>
      <div style="font-size:32px;font-weight:bold;color:${d.fear_greed_color};letter-spacing:2px;">${d.fear_greed_valor}</div>
      <div style="font-size:13px;color:${d.fear_greed_color};letter-spacing:3px;margin-top:4px;">${d.fear_greed_label}</div>
      <a href="https://edition.cnn.com/markets/fear-and-greed" target="_blank" style="display:inline-block;margin-top:10px;font-size:9px;color:var(--accent);letter-spacing:1px;text-decoration:none;border:1px solid var(--accent);padding:3px 10px;border-radius:3px;">VER EN CNN →</a>
    </div>
    <div class="alert alert-blue">
      <strong>Ganadores:</strong> ${d.ganadores_dia}<br/>
      <strong>Perdedores:</strong> ${d.perdedores_dia}
    </div>
  </div>

  <!-- ══ ARGENTINA ══ -->
  <div id="tab-argentina" class="tab-panel">
    <div class="sec-title">TIPO DE CAMBIO — ${fechaLarga.toUpperCase()}</div>
    <div class="fx-grid">
      <div class="fx-card" style="border-color:#4a9eff"><div class="fx-pair">OFICIAL BNA</div><div class="fx-name">Dólar Oficial</div><div class="fx-price">$${d.dolar_oficial_venta} <span style="font-size:11px;color:#4a9eff">venta</span></div></div>
      <div class="fx-card" style="border-color:#ff8c00"><div class="fx-pair">INFORMAL</div><div class="fx-name">Dólar Blue</div><div class="fx-price">$${d.dolar_blue_venta} <span style="font-size:11px;color:#ff8c00">venta</span></div></div>
      <div class="fx-card" style="border-color:#00d49a"><div class="fx-pair">BONOS AL30 (MEP)</div><div class="fx-name">Dólar MEP</div><div class="fx-price">$${d.dolar_mep_venta} <span style="font-size:11px;color:#00d49a">venta</span></div></div>
      <div class="fx-card" style="border-color:#8b5cf6"><div class="fx-pair">CONTADO CON LIQUI</div><div class="fx-name">Dólar CCL</div><div class="fx-price">$${d.dolar_ccl_venta} <span style="font-size:11px;color:#8b5cf6">venta</span></div></div>
      <div class="fx-card" style="border-color:#f0c040"><div class="fx-pair">USDT / CRIPTO</div><div class="fx-name">Dólar Cripto</div><div class="fx-price">$${d.dolar_cripto_venta} <span style="font-size:11px;color:#f0c040">venta</span></div></div>
      <div class="fx-card" style="border-color:#ff4060"><div class="fx-pair">OFICIAL + IMPUESTOS</div><div class="fx-name">Dólar Tarjeta</div><div class="fx-price">$${d.dolar_tarjeta_venta} <span style="font-size:11px;color:#ff4060">venta</span></div></div>
    </div>
    <div class="alert alert-blue" style="margin-top:16px;">
      <strong>📊 Brecha Blue/Oficial:</strong> ${d.brecha_blue} · <strong>MERVAL USD (CCL):</strong> ~${d.merval_usd} pts
    </div>
    <div class="sec-title">MERVAL & ACTIVOS LOCALES</div>
    <table class="mkt-table">
      <thead><tr><th>ACTIVO</th><th>PRECIO</th><th>VAR. DÍA</th><th>NOTA</th></tr></thead>
      <tbody>
        <tr><td><div class="name">S&P MERVAL</div><div class="sym">BYMA · ARS</div></td><td class="price">${d.merval_ars}</td><td id="merval-chg">—</td><td style="font-size:10px;color:#ff8060">USD ~${d.merval_usd}</td></tr>
        <tr><td><div class="name">Riesgo País</div><div class="sym">EMBI+ ARG</div></td><td class="price warn">${d.riesgo_pais} bps</td><td>—</td><td style="font-size:10px;color:var(--dim)"></td></tr>
        <tr><td><div class="name">Reservas BCRA</div><div class="sym">Brutas</div></td><td class="price">USD ${d.reservas_bcra}M</td><td>—</td><td></td></tr>
      </tbody>
    </table>
    <div class="sec-title">ADRs ARGENTINOS — TIEMPO REAL</div>
    <div style="font-size:9px;color:var(--accent);letter-spacing:1px;margin-bottom:8px;">⚡ YAHOO FINANCE API</div>
    <div id="tbl-adrs"><div class="live-loading">Cargando precios...</div></div>
    <div class="sec-title">BONOS SOBERANOS</div>
    <div id="tbl-bonos-arg"><div class="live-loading">Cargando precios...</div></div>
    <div class="sec-title">CRIPTO</div>
    <div id="tbl-cripto"><div class="live-loading">Cargando precios...</div></div>
  </div>

  <!-- ══ MUNDO ══ -->
  <div id="tab-mundo" class="tab-panel">
    <div class="sec-title">ÍNDICES GLOBALES — TIEMPO REAL</div>
    <div id="tbl-mundo-indices"><div class="live-loading">Cargando precios...</div></div>
    <div class="sec-title">DIVISAS FX</div>
    <div id="tbl-mundo-fx"><div class="live-loading">Cargando precios...</div></div>
  </div>

  <!-- ══ COMMODITIES ══ -->
  <div id="tab-commodities" class="tab-panel">
    <div class="alert alert-${d.commodities_tipo}" style="margin-bottom:12px;">
      <div class="alert-title">⚡ Commodities — ${fechaLarga}</div>
      ${d.commodities_alerta}
    </div>
    <div class="sec-title">ENERGÍA & METALES — TIEMPO REAL</div>
    <div id="tbl-commodities"><div class="live-loading">Cargando precios...</div></div>
    <div class="sec-title">AGRÍCOLAS CBOT</div>
    <div id="tbl-agricolas"><div class="live-loading">Cargando precios...</div></div>
  </div>

  <!-- ══ GEOPOLÍTICA ══ -->
  <div id="tab-geo" class="tab-panel">
    <div class="alert alert-red" style="margin-bottom:16px;">
      ⚠ EVENTOS DE RIESGO GEOPOLÍTICO EN MONITOREO — Hacé clic para ver el análisis
    </div>
    ${geoCards}
  </div>

  <!-- ══ CALENDARIO ══ -->
  <div id="tab-calendario" class="tab-panel">
    <div class="sec-title">PRÓXIMOS EVENTOS ECONÓMICOS CLAVE</div>
    ${calItems}
  </div>

  <!-- ══ ANÁLISIS ══ -->
  <div id="tab-analisis" class="tab-panel">
    <div class="sec-title">COMENTARIOS — ${fechaLarga.toUpperCase()}</div>
    <div class="comment-card" style="border-color:#ff4060">
      <div class="comment-header"><div class="comment-icon">🌍</div><div><div class="comment-author" style="color:#ff8080">Mercados Globales</div><div class="comment-time">Análisis de sesión</div></div></div>
      <div class="comment-body">${d.analisis_global}</div>
    </div>
    <div class="comment-card" style="border-color:#00d49a">
      <div class="comment-header"><div class="comment-icon">🇦🇷</div><div><div class="comment-author" style="color:#00d49a">Argentina</div><div class="comment-time">Cierre BYMA</div></div></div>
      <div class="comment-body">${d.analisis_argentina}</div>
    </div>
    <div class="comment-card" style="border-color:#ffaa00">
      <div class="comment-header"><div class="comment-icon">📊</div><div><div class="comment-author" style="color:#ffaa00">Técnico S&P 500</div><div class="comment-time">Análisis técnico</div></div></div>
      <div class="comment-body">${d.analisis_tecnico_sp}</div>
    </div>
    <div class="comment-card" style="border-color:#4a9eff">
      <div class="comment-header"><div class="comment-icon">🇧🇷</div><div><div class="comment-author" style="color:#4a9eff">Brasil & LatAm</div><div class="comment-time">Cierre B3</div></div></div>
      <div class="comment-body">${d.analisis_latam}</div>
    </div>
    <div class="alert alert-yellow" style="margin-top:8px;">
      <div class="alert-title">🔭 Outlook 48 horas</div>
      ${d.outlook_48h}
    </div>
    <div style="margin-top:16px;padding:14px;border-radius:8px;background:rgba(26,42,64,.4);border:1px solid var(--border);font-size:10px;color:var(--dim);line-height:1.7;text-align:center;">
      ⚡ Análisis editorial: Claude AI · Precios: Yahoo Finance API · CoinGecko<br/>
      Generado automáticamente · ${fechaLarga} · ${hora} hs Argentina
    </div>
  </div>

</div>

<div class="footer">MARKET TERMINAL · GENERADO AUTOMÁTICAMENTE · ${fechaLarga.toUpperCase()}</div>

<script>
// ── Price Engine ──────────────────────────────────────────
const YF = 'https://query1.finance.yahoo.com/v8/finance/chart/';
const PROXIES = [
  u => \`https://corsproxy.io/?\${encodeURIComponent(u)}\`,
  u => \`https://api.allorigins.win/raw?url=\${encodeURIComponent(u)}\`,
];

async function fetchPrice(ticker) {
  if (ticker.startsWith('CG:')) return fetchCG(ticker.slice(3));
  const url = YF + encodeURIComponent(ticker) + '?interval=1d&range=2d';
  for (const proxy of PROXIES) {
    try {
      const r = await fetch(proxy(url), {signal: AbortSignal.timeout(7000)});
      if (!r.ok) continue;
      const d = await r.json();
      const m = d.chart.result[0].meta;
      const prev = m.chartPreviousClose || m.previousClose;
      return { price: m.regularMarketPrice, chg: prev ? (m.regularMarketPrice-prev)/prev*100 : 0, mktState: m.marketState, currency: m.currency };
    } catch(e) { continue; }
  }
  return null;
}

async function fetchCG(id) {
  try {
    const r = await fetch(\`https://api.coingecko.com/api/v3/simple/price?ids=\${id}&vs_currencies=usd&include_24hr_change=true\`, {signal: AbortSignal.timeout(7000)});
    const d = await r.json();
    return { price: d[id].usd, chg: d[id].usd_24h_change, mktState: 'REGULAR', currency: 'USD' };
  } catch(e) { return null; }
}

function fmt(n, cur='USD') {
  if (!n && n !== 0) return '—';
  if (cur === 'ARS') return n.toLocaleString('es-AR', {maximumFractionDigits:0});
  if (n >= 10000) return n.toLocaleString('en-US', {maximumFractionDigits:0});
  if (n >= 1) return n.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
  return n.toLocaleString('en-US', {minimumFractionDigits:4, maximumFractionDigits:4});
}

function chgHtml(chg) {
  if (chg == null) return '<span style="color:var(--dim)">—</span>';
  const cls = chg > 0.05 ? 'lv-up' : chg < -0.05 ? 'lv-dn' : 'lv-flat';
  const arrow = chg > 0.05 ? '▲' : chg < -0.05 ? '▼' : '=';
  return \`<span class="\${cls}">\${arrow} \${Math.abs(chg).toFixed(2)}%</span>\`;
}

function buildTable(rows) {
  const body = rows.map(r => {
    const p = r.data;
    if (!p) return \`<tr><td><span class="lv-name">\${r.label}</span></td><td class="lv-sym">\${r.ticker}</td><td class="lv-err" colspan="2">⚠ Sin datos</td></tr>\`;
    const badge = p.mktState === 'REGULAR' ? '<span class="live-badge badge-live">● LIVE</span>' : '<span class="live-badge badge-closed">Cierre</span>';
    const sym = r.ticker.startsWith('CG:') ? r.ticker.slice(3) : r.ticker;
    return \`<tr><td><div class="lv-name">\${r.label}\${badge}</div><div class="lv-sym">\${r.sector||''}</div></td><td class="lv-sym">\${sym}</td><td class="lv-price">$\${fmt(p.price, p.currency)}</td><td>\${chgHtml(p.chg)}</td></tr>\`;
  }).join('');
  return \`<table class="live-tbl"><thead><tr><th>ACTIVO</th><th>SÍMBOLO</th><th>PRECIO</th><th>VAR. DÍA</th></tr></thead><tbody>\${body}</tbody></table>\`;
}

async function loadGroup(divId, items) {
  const el = document.getElementById(divId);
  if (!el) return;
  el.innerHTML = '<div class="live-loading">⏳ Cargando...</div>';
  const results = await Promise.all(items.map(async i => ({...i, data: await fetchPrice(i.ticker)})));
  el.innerHTML = buildTable(results);
}

// Hero strip quick updates
async function updateHero() {
  const heroes = [
    {id:'hs-sp500', idc:'hs-sp500c', t:'^GSPC'},
    {id:'hs-nq',    idc:'hs-nqc',    t:'^NDX'},
    {id:'hs-vix',   idc:'hs-vixc',   t:'^VIX'},
    {id:'hs-merv',  idc:'hs-mervc',  t:'^MERV'},
    {id:'hs-wti',   idc:'hs-wtic',   t:'CL=F'},
    {id:'hs-gold',  idc:'hs-goldc',  t:'GC=F'},
    {id:'hs-btc',   idc:'hs-btcc',   t:'CG:bitcoin'},
  ];
  await Promise.all(heroes.map(async h => {
    const p = await fetchPrice(h.t);
    if (!p) return;
    const el = document.getElementById(h.id);
    const elc = document.getElementById(h.idc);
    if (el) el.textContent = (h.t.startsWith('CG:') ? '$' : (h.t==='^VIX'?'':'$')) + fmt(p.price);
    if (elc) { elc.innerHTML = chgHtml(p.chg); }
  }));
}

// Ticker groups
const GROUPS = {
  'tbl-usa-indices':  [{label:'S&P 500',ticker:'^GSPC',sector:'Índice EEUU'},{label:'Nasdaq 100',ticker:'^NDX',sector:'Tech'},{label:'Dow Jones',ticker:'^DJI',sector:'Industrial'},{label:'Russell 2000',ticker:'^RUT',sector:'Small Caps'},{label:'VIX',ticker:'^VIX',sector:'Volatilidad 😱'}],
  'tbl-usa-futuros':  [{label:'S&P Fut.',ticker:'ES=F',sector:'CME'},{label:'Nasdaq Fut.',ticker:'NQ=F',sector:'CME'},{label:'Dow Fut.',ticker:'YM=F',sector:'CME'},{label:'Gold Fut.',ticker:'GC=F',sector:'COMEX'}],
  'tbl-usa-bonos':    [{label:'T-Note 10Y',ticker:'^TNX',sector:'Tesoro'},{label:'T-Bond 30Y',ticker:'^TYX',sector:'Tesoro'},{label:'T-Note 2Y',ticker:'^IRX',sector:'Tesoro'},{label:'Dólar Index',ticker:'DX-Y.NYB',sector:'DXY'}],
  'tbl-usa-sectores': [{label:'🖥️ Tech',ticker:'XLK',sector:'ETF'},{label:'🛢️ Energía',ticker:'XLE',sector:'ETF'},{label:'🏦 Financiero',ticker:'XLF',sector:'ETF'},{label:'🏥 Salud',ticker:'XLV',sector:'ETF'},{label:'🏗️ Industrial',ticker:'XLI',sector:'ETF'},{label:'⚙️ Materiales',ticker:'XLB',sector:'ETF'},{label:'🛒 Cons. Básico',ticker:'XLP',sector:'ETF'},{label:'🛍️ Cons. Discr.',ticker:'XLY',sector:'ETF'},{label:'📡 Comunic.',ticker:'XLC',sector:'ETF'},{label:'💡 Utilities',ticker:'XLU',sector:'ETF'}],
  'tbl-usa-defensa':  [{label:'Lockheed Martin',ticker:'LMT',sector:'Defensa'},{label:'Northrop Grumman',ticker:'NOC',sector:'Defensa'},{label:'RTX Corp',ticker:'RTX',sector:'Defensa'},{label:'General Dynamics',ticker:'GD',sector:'Defensa'},{label:'AeroVironment',ticker:'AVAV',sector:'Drones'}],
  'tbl-usa-tech':     [{label:'Nvidia',ticker:'NVDA',sector:'Semis'},{label:'Apple',ticker:'AAPL',sector:'Tech'},{label:'Microsoft',ticker:'MSFT',sector:'Tech'},{label:'Alphabet',ticker:'GOOGL',sector:'Tech'},{label:'Meta',ticker:'META',sector:'Tech'},{label:'Amazon',ticker:'AMZN',sector:'Tech'},{label:'Tesla',ticker:'TSLA',sector:'EV'},{label:'ExxonMobil',ticker:'XOM',sector:'Energía'},{label:'Chevron',ticker:'CVX',sector:'Energía'}],
  'tbl-adrs':         [{label:'Grupo Galicia',ticker:'GGAL',sector:'Banco·NASDAQ'},{label:'Banco Macro',ticker:'BMA',sector:'Banco·NYSE'},{label:'BBVA Argentina',ticker:'BBAR',sector:'Banco·NYSE'},{label:'Supervielle',ticker:'SUPV',sector:'Banco·NYSE'},{label:'YPF',ticker:'YPF',sector:'Energía·NYSE'},{label:'Vista Energy',ticker:'VIST',sector:'Vaca Muerta·NYSE'},{label:'Pampa Energía',ticker:'PAM',sector:'Energía·NYSE'},{label:'TGS',ticker:'TGS',sector:'Gas·NYSE'},{label:'Central Puerto',ticker:'CEPU',sector:'Energía·NYSE'},{label:'MercadoLibre',ticker:'MELI',sector:'Tech·NASDAQ'},{label:'Globant',ticker:'GLOB',sector:'Tech·NYSE'},{label:'Telecom',ticker:'TEO',sector:'Telecom·NYSE'},{label:'Edenor',ticker:'EDN',sector:'Utilities·NYSE'},{label:'Tenaris',ticker:'TS',sector:'Acero·NYSE'},{label:'Corp. Américas',ticker:'CAAP',sector:'Infra·NYSE'},{label:'IRSA',ticker:'IRS',sector:'Real Estate·NYSE'},{label:'Loma Negra',ticker:'LOMA',sector:'Cemento·NYSE'},{label:'Cresud',ticker:'CRESY',sector:'Agro·NASDAQ'}],
  'tbl-bonos-arg':    [{label:'GD30·Global 2030',ticker:'GD30=F',sector:'Ley NY'},{label:'GD35·Global 2035',ticker:'GD35=F',sector:'Ley NY'},{label:'AL30·Bonar 2030',ticker:'AL30=F',sector:'Ley ARG'},{label:'AL35·Bonar 2035',ticker:'AL35=F',sector:'Ley ARG'}],
  'tbl-cripto':       [{label:'Bitcoin',ticker:'CG:bitcoin',sector:'Cripto'},{label:'Ethereum',ticker:'CG:ethereum',sector:'Cripto'},{label:'Solana',ticker:'CG:solana',sector:'Cripto'},{label:'BNB',ticker:'CG:binancecoin',sector:'Cripto'},{label:'XRP',ticker:'CG:ripple',sector:'Cripto'}],
  'tbl-mundo-indices':[{label:'Euro Stoxx 50',ticker:'^STOXX50E',sector:'Europa 🇪🇺'},{label:'DAX',ticker:'^GDAXI',sector:'Alemania 🇩🇪'},{label:'FTSE 100',ticker:'^FTSE',sector:'UK 🇬🇧'},{label:'CAC 40',ticker:'^FCHI',sector:'Francia 🇫🇷'},{label:'Nikkei 225',ticker:'^N225',sector:'Japón 🇯🇵'},{label:'Hang Seng',ticker:'^HSI',sector:'HK 🇭🇰'},{label:'Bovespa',ticker:'^BVSP',sector:'Brasil 🇧🇷'},{label:'MERVAL',ticker:'^MERV',sector:'Argentina 🇦🇷'}],
  'tbl-mundo-fx':     [{label:'EUR/USD',ticker:'EURUSD=X',sector:'Forex'},{label:'USD/JPY',ticker:'JPY=X',sector:'Forex'},{label:'USD/BRL',ticker:'BRL=X',sector:'Forex'},{label:'GBP/USD',ticker:'GBPUSD=X',sector:'Forex'},{label:'USD/CNY',ticker:'CNY=X',sector:'Forex'}],
  'tbl-commodities':  [{label:'WTI Crude',ticker:'CL=F',sector:'NYMEX'},{label:'Brent Crude',ticker:'BZ=F',sector:'ICE'},{label:'Gas Natural',ticker:'NG=F',sector:'NYMEX'},{label:'Oro',ticker:'GC=F',sector:'COMEX'},{label:'Plata',ticker:'SI=F',sector:'COMEX'},{label:'Cobre',ticker:'HG=F',sector:'COMEX'}],
  'tbl-agricolas':    [{label:'Soja',ticker:'ZS=F',sector:'CBOT 🇦🇷'},{label:'Maíz',ticker:'ZC=F',sector:'CBOT 🇦🇷'},{label:'Trigo',ticker:'ZW=F',sector:'CBOT 🇦🇷'}],
};

// Tab lazy loading
const loaded = new Set();
const TAB_GROUPS = {
  usa: ['tbl-usa-indices','tbl-usa-futuros','tbl-usa-bonos','tbl-usa-sectores','tbl-usa-defensa','tbl-usa-tech'],
  argentina: ['tbl-adrs','tbl-bonos-arg','tbl-cripto'],
  mundo: ['tbl-mundo-indices','tbl-mundo-fx'],
  commodities: ['tbl-commodities','tbl-agricolas'],
};

function showTab(id, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + id).classList.add('active');
  if (btn) { btn.classList.add('active'); btn.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'}); }
  if (!loaded.has(id) && TAB_GROUPS[id]) {
    loaded.add(id);
    TAB_GROUPS[id].forEach(g => loadGroup(g, GROUPS[g]));
  }
}

// Init
updateHero();
</script>
</body>
</html>`;
}

// ── Main ──────────────────────────────────────────────────
async function main() {
  const data = await getEditorialContent();
  const html = generateHTML(data);

  // Guardar informe del día
  const filename = `informe-mercado-${fechaCorta}.html`;
  writeFileSync(filename, html, 'utf-8');
  console.log(`✅ Informe guardado: ${filename}`);

  // Actualizar index.html (página principal que siempre muestra el más reciente)
  const index = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8"/>
<meta http-equiv="refresh" content="0;url=${filename}"/>
<title>Market Terminal — Redirigiendo...</title>
</head><body>
<p>Redirigiendo al informe de hoy: <a href="${filename}">${fechaLarga}</a></p>
</body></html>`;
  writeFileSync('index.html', index, 'utf-8');
  console.log(`✅ index.html actualizado → ${filename}`);
}

main().catch(e => { console.error('❌ Error:', e); process.exit(1); });
