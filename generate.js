// ══════════════════════════════════════════════════════════
//  MARKET TERMINAL — Bloomberg Style v4
//  Layout: grilla completa, sin solapas, todo visible
// ══════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync } from 'fs';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
const dias   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const meses  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const fechaLarga = `${dias[now.getDay()]} ${now.getDate()} de ${meses[now.getMonth()]}, ${now.getFullYear()}`;
const fechaCorta = `${String(now.getDate()).padStart(2,'0')}${meses[now.getMonth()].slice(0,3).toLowerCase()}${now.getFullYear()}`;
const hora = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
const horaNum = now.getHours() + now.getMinutes() / 60;
const esManana = horaNum < 10.5;
const esCierre = horaNum >= 18;
const EDICION = esCierre ? 'CIERRE' : esManana ? 'MAÑANA' : 'RUEDA';
const EDICION_EMOJI = esCierre ? '🌆' : esManana ? '🌅' : '📈';

console.log(`📅 ${fechaLarga} · Edición ${EDICION} (${hora} AR)`);

function buildPrompt() {
  return `Sos un analista financiero senior especializado en mercados argentinos y globales.
Hoy es ${fechaLarga}, hora actual en Argentina: ${hora}. Edición: ${EDICION}.
Respondé SOLO con JSON válido, sin texto extra, sin markdown, sin backticks.
Usá datos REALES y ACTUALES. No inventes tendencias positivas si el mercado está bajando.

{
  "edicion": "${EDICION}",
  "driver_emoji": "emoji del tema principal",
  "driver_titulo": "tema central del día, máx 60 chars, basado en realidad",
  "driver_tipo": "red|yellow|blue|green según sentimiento real del mercado",
  "driver_texto": "HTML 3-4 oraciones sobre el driver principal del día con datos reales",
  "resumen_ejecutivo": "HTML párrafo resumen ejecutivo del día, objetivo y basado en hechos",
  "badge_mercado": "estado del mercado en 2-3 palabras",
  "badge_clase": "badge-open|badge-warn",
  "riesgo_geo": "BAJO|MODERADO|ALTO|MÁXIMO",
  "fear_greed_valor": 50,
  "fear_greed_label": "NEUTRAL",
  "fear_greed_color": "#ffaa00",
  "fear_greed_pct": 50,
  "merval_usd": "1750",
  "riesgo_pais": "573",
  "reservas_bcra": "45.566",
  "analisis_usa": "HTML 4-5 oraciones análisis mercado USA objetivo",
  "analisis_argentina": "HTML 4-5 oraciones análisis mercado argentino objetivo",
  "analisis_mundo": "HTML 4-5 oraciones análisis mercados globales objetivo",
  "analisis_tecnico": "HTML análisis técnico S&P 500 con niveles de soporte y resistencia",
  "conflictos": [
    {
      "zona": "nombre del conflicto/región",
      "badge": "etiqueta corta",
      "color": "#ff4060",
      "titular": "titular del conflicto actual",
      "analisis": "HTML 2-3 oraciones sobre situación actual",
      "impacto_mercados": "cómo afecta a los mercados financieros"
    }
  ],
  "calendario": [
    {
      "dia": "Hoy|Mañana|Lun DD|Mar DD|Mie DD|Jue DD|Vie DD",
      "hora_ar": "HH:MM AR",
      "flag": "🇺🇸|🇦🇷|🇪🇺|🇨🇳|🇬🇧|🇯🇵|🇧🇷",
      "evento": "nombre del evento en español",
      "impacto": "CRÍTICO|ALTO|MEDIO",
      "color": "#ff4060|#ff8c00|#4a9eff",
      "previo": "valor anterior",
      "consenso": "estimado",
      "descripcion": "qué mide y por qué importa"
    }
  ],
  "outlook": "HTML outlook concreto para las próximas 24-48hs con niveles y catalizadores"
}

CALENDARIO: Generá 12-15 eventos para los próximos 7 días hábiles.
Mínimo: 4 USA (NFP, CPI, Fed, jobless claims, ISM, ventas minoristas, balances), 3 Argentina (IPC INDEC, licitaciones Tesoro, reservas BCRA, vencimientos), 2 internacionales (BCE, BOJ, PMI China, OPEP).
CONFLICTOS: Incluí todos los conflictos bélicos y geopolíticos activos al ${fechaLarga}: Ucrania-Rusia, Gaza-Israel, tensiones China-Taiwan, Yemen, Sudán, y cualquier otro relevante. Sé específico con la situación actual.`;
}

async function getContent() {
  console.log(`🤖 Llamando a Claude (${EDICION})...`);
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 6000,
    messages: [{ role: 'user', content: buildPrompt() }]
  });
  const raw = response.content[0].text.trim();
  const text = raw.replace(/^```json\s*/,'').replace(/^```\s*/,'').replace(/\s*```$/,'').trim();
  return JSON.parse(text);
}

function generateHTML(d) {
  console.log('🎨 Generando HTML Bloomberg...');

  const conflictCards = (d.conflictos || []).map(c => `
    <div class="conflict-card" style="border-left-color:${c.color}">
      <div class="conflict-header">
        <span class="conflict-badge" style="background:${c.color}22;color:${c.color}">${c.badge}</span>
        <span class="conflict-zona">${c.zona}</span>
      </div>
      <div class="conflict-titular">${c.titular}</div>
      <div class="conflict-body">${c.analisis}</div>
      <div class="conflict-impacto">📊 ${c.impacto_mercados}</div>
    </div>`).join('');

  const calRows = (d.calendario || []).map(e => `
    <tr class="cal-row">
      <td><span class="cal-dia">${e.dia}</span><br><span class="cal-hora">${e.hora_ar}</span></td>
      <td><span class="cal-flag">${e.flag}</span></td>
      <td><span class="cal-evento">${e.evento}</span><br><span class="cal-desc">${e.descripcion}</span></td>
      <td><span class="cal-imp" style="color:${e.color};background:${e.color}18">${e.impacto}</span></td>
      <td class="cal-num">${e.previo||'—'}</td>
      <td class="cal-num" style="color:#00d49a">${e.consenso||'—'}</td>
    </tr>`).join('');

  const PASSWORD_SCRIPT = `<script>(function(){var P='290585',K='mkt_auth';if(sessionStorage.getItem(K)!==P){document.addEventListener('DOMContentLoaded',function(){document.body.innerHTML='';var o=document.createElement('div');o.style.cssText='position:fixed;inset:0;background:#05080f;display:flex;align-items:center;justify-content:center;z-index:9999;font-family:Space Mono,monospace;';o.innerHTML='<div style="text-align:center;padding:40px;background:#0a1020;border:1px solid #1a2a40;border-radius:12px;max-width:320px;width:90%;"><div style="font-size:28px;margin-bottom:8px;">&#x1F510;</div><div style="font-family:Syne,sans-serif;font-size:20px;font-weight:800;color:#e8f4ff;margin-bottom:4px;">MARKET TERMINAL</div><div style="font-size:10px;color:#4a6a8a;letter-spacing:2px;margin-bottom:24px;">ACCESO RESTRINGIDO</div><input id="pi" type="password" placeholder="Ingres&#225; la clave..." autofocus style="width:100%;background:#0d1828;border:1px solid #1a2a40;border-radius:6px;padding:12px;color:#c8d8e8;font-size:14px;outline:none;text-align:center;margin-bottom:10px;" onkeydown="if(event.key===\'Enter\')cp()"/><div id="pe" style="color:#ff4060;font-size:11px;height:16px;margin-bottom:10px;"></div><button onclick="cp()" style="width:100%;background:linear-gradient(135deg,#8b5cf6,#4a9eff);border:none;border-radius:6px;padding:12px;color:#fff;font-size:13px;font-weight:700;cursor:pointer;">ENTRAR &#x2192;</button></div>';document.body.appendChild(o);window.cp=function(){var v=document.getElementById('pi').value;if(v===P){sessionStorage.setItem(K,P);location.reload();}else{document.getElementById('pe').textContent='&#x26A0;&#xFE0F; Clave incorrecta';document.getElementById('pi').value='';document.getElementById('pi').focus();}};});}})();<\/script>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Market Terminal · ${fechaLarga} · ${EDICION_EMOJI} ${EDICION}</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;700;800&display=swap" rel="stylesheet"/>
${PASSWORD_SCRIPT}
<style>
:root{
  --bg:#05080f;--bg2:#0a1020;--bg3:#0d1828;--border:#1a2a40;
  --up:#00d49a;--dn:#ff4060;--warn:#ffaa00;--info:#4a9eff;--purple:#8b5cf6;
  --text:#c8d8e8;--dim:#4a6a8a;--bright:#e8f4ff;
}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--bg);color:var(--text);font-family:'Space Mono',monospace;min-height:100vh;overflow-x:hidden;}
body::before{content:'';position:fixed;inset:0;z-index:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,212,154,.015) 0px,rgba(0,212,154,.015) 1px,transparent 1px,transparent 3px);}

/* HEADER */
.header{background:linear-gradient(180deg,#0d1828,#05080f);border-bottom:1px solid var(--border);padding:12px 16px;position:sticky;top:0;z-index:100;}
.header-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;}
.logo-title{font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--bright);letter-spacing:-1px;}
.logo-sub{font-size:9px;color:var(--dim);letter-spacing:3px;}
.header-right{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end;}
.badge{display:inline-flex;align-items:center;gap:4px;font-size:9px;font-weight:700;letter-spacing:1px;padding:3px 10px;border-radius:20px;}
.badge-open{background:rgba(0,212,154,.15);color:var(--up);border:1px solid rgba(0,212,154,.3);}
.badge-warn{background:rgba(255,170,0,.12);color:var(--warn);border:1px solid rgba(255,170,0,.3);}
.badge-ed{background:rgba(74,158,255,.1);color:var(--info);border:1px solid rgba(74,158,255,.3);}

/* TICKER STRIP */
.ticker{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:4px 0;}
.ticker::-webkit-scrollbar{display:none;}
.tick{flex-shrink:0;background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:6px 10px;min-width:80px;cursor:default;}
.tick:hover{border-color:var(--up);}
.tick-lbl{font-size:7px;color:var(--dim);letter-spacing:1px;margin-bottom:2px;}
.tick-val{font-size:12px;font-weight:700;color:var(--bright);}
.tick-chg{font-size:9px;font-weight:700;}
.up{color:var(--up);}.dn{color:var(--dn);}.flat{color:var(--dim);}

/* MAIN GRID */
.main{padding:12px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;max-width:1400px;margin:0 auto;}
@media(max-width:1100px){.main{grid-template-columns:1fr 1fr;}}
@media(max-width:680px){.main{grid-template-columns:1fr;}}

/* PANELS */
.panel{background:var(--bg2);border:1px solid var(--border);border-radius:8px;overflow:hidden;}
.panel-full{grid-column:1/-1;}
.panel-2col{grid-column:span 2;}
.panel-head{background:linear-gradient(90deg,#0d1828,#08101a);padding:8px 12px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
.panel-title{font-family:'Syne',sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;color:var(--dim);text-transform:uppercase;}
.panel-body{padding:10px 12px;}

/* DRIVER */
.driver-box{padding:14px;border-radius:6px;margin-bottom:10px;border-left:3px solid;}
.driver-red{background:rgba(255,64,96,.07);border-color:var(--dn);}
.driver-yellow{background:rgba(255,170,0,.07);border-color:var(--warn);}
.driver-blue{background:rgba(74,158,255,.07);border-color:var(--info);}
.driver-green{background:rgba(0,212,154,.07);border-color:var(--up);}
.driver-title{font-family:'Syne',sans-serif;font-size:14px;font-weight:800;color:var(--bright);margin-bottom:6px;}
.driver-text{font-size:11px;line-height:1.7;color:#8ab0d0;}
.driver-text strong{color:var(--bright);}
.driver-text em{color:var(--warn);font-style:normal;}

/* PRICE TABLES */
.ptbl{width:100%;border-collapse:collapse;}
.ptbl th{font-size:8px;letter-spacing:1.5px;color:var(--dim);padding:4px 6px;border-bottom:1px solid var(--border);text-align:left;font-weight:400;}
.ptbl td{padding:7px 6px;font-size:11px;border-bottom:1px solid rgba(26,42,64,.4);vertical-align:middle;}
.ptbl tr:last-child td{border-bottom:none;}
.ptbl tr:hover td{background:rgba(255,255,255,.02);}
.p-name{color:var(--bright);font-weight:700;font-size:12px;}
.p-sym{font-size:8px;color:var(--dim);}
.p-price{font-size:13px;font-weight:700;color:var(--bright);text-align:right;font-variant-numeric:tabular-nums;}
.p-chg{text-align:right;font-weight:700;font-size:11px;}
.chg-up{color:var(--up);}.chg-dn{color:var(--dn);}.chg-flat{color:var(--dim);}
.loading{color:var(--dim);font-size:10px;padding:10px;letter-spacing:1px;text-align:center;}

/* FX GRID */
.fx-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;}
.fx-card{background:var(--bg3);border-radius:6px;padding:10px;border-left:3px solid;}
.fx-lbl{font-size:8px;color:var(--dim);letter-spacing:1px;margin-bottom:2px;}
.fx-name{font-size:10px;font-weight:700;color:var(--bright);margin-bottom:4px;}
.fx-price{font-size:15px;font-weight:700;color:var(--bright);}
.fx-detail{font-size:8px;color:var(--dim);margin-top:2px;}

/* STAT CARDS */
.stat-row{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;}
.stat{background:var(--bg3);border-radius:6px;padding:10px;}
.stat-lbl{font-size:8px;color:var(--dim);letter-spacing:1px;margin-bottom:4px;}
.stat-val{font-family:'Syne',sans-serif;font-size:18px;font-weight:800;}
.stat-sub{font-size:9px;color:var(--dim);margin-top:2px;}

/* CONFLICT CARDS */
.conflict-card{border-radius:6px;padding:12px;margin-bottom:8px;border-left:3px solid;background:linear-gradient(135deg,#0d1828,#08101a);}
.conflict-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
.conflict-badge{font-size:8px;font-weight:700;letter-spacing:1px;padding:2px 7px;border-radius:3px;}
.conflict-zona{font-size:8px;color:var(--dim);}
.conflict-titular{font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:var(--bright);margin-bottom:5px;line-height:1.3;}
.conflict-body{font-size:10px;color:#7a9ab8;line-height:1.6;margin-bottom:6px;}
.conflict-impacto{font-size:9px;color:var(--up);background:rgba(0,212,154,.08);padding:4px 8px;border-radius:4px;}

/* CALENDAR TABLE */
.cal-tbl{width:100%;border-collapse:collapse;font-size:10px;}
.cal-tbl th{font-size:8px;letter-spacing:1.5px;color:var(--dim);padding:5px 8px;border-bottom:1px solid var(--border);font-weight:400;text-align:left;}
.cal-row td{padding:7px 8px;border-bottom:1px solid rgba(26,42,64,.4);vertical-align:top;}
.cal-row:last-child td{border-bottom:none;}
.cal-row:hover td{background:rgba(255,255,255,.015);}
.cal-dia{color:var(--info);font-weight:700;font-size:10px;}
.cal-hora{color:var(--dim);font-size:8px;}
.cal-flag{font-size:13px;}
.cal-evento{color:var(--bright);font-weight:700;font-size:11px;}
.cal-desc{color:var(--dim);font-size:9px;line-height:1.4;margin-top:2px;}
.cal-imp{font-size:8px;font-weight:700;letter-spacing:1px;padding:2px 6px;border-radius:3px;}
.cal-num{text-align:right;color:var(--text);font-size:10px;}

/* FEAR & GREED */
.fg-wrap{padding:10px;text-align:center;}
.fg-bar{background:linear-gradient(90deg,#00c853,#ffeb3b 40%,#ff5722 75%,#b71c1c);height:10px;border-radius:5px;position:relative;margin:0 auto 8px;max-width:240px;}
.fg-needle{position:absolute;top:-5px;width:3px;height:20px;background:#fff;border-radius:2px;box-shadow:0 0 5px #fff;}
.fg-val{font-family:'Syne',sans-serif;font-size:28px;font-weight:800;}
.fg-lbl{font-size:11px;letter-spacing:2px;margin-top:2px;}
.fg-labels{display:flex;justify-content:space-between;max-width:240px;margin:0 auto 8px;font-size:7px;color:var(--dim);}

/* ANALYSIS */
.analysis-block{font-size:11px;color:#8ab0d0;line-height:1.75;margin-bottom:10px;padding:12px;background:linear-gradient(135deg,#0d2030,#08101a);border:1px solid #1a3a5a;border-radius:6px;}
.analysis-block strong{color:var(--bright);}
.analysis-block em{color:var(--warn);font-style:normal;}
.analysis-title{font-family:'Syne',sans-serif;font-size:10px;font-weight:700;color:var(--dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;}

/* VIX METER */
.vix-box{text-align:center;padding:10px;}
.vix-val{font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:var(--warn);}
.vix-zone{font-size:9px;padding:2px 8px;border-radius:8px;display:inline-block;margin-top:4px;}

/* AI CHAT */
.ai-panel{position:fixed;bottom:20px;right:20px;width:360px;z-index:200;}
.ai-toggle{background:linear-gradient(135deg,#8b5cf6,#4a9eff);border:none;border-radius:50px;padding:12px 20px;color:#fff;font-family:'Space Mono',monospace;font-size:12px;font-weight:700;cursor:pointer;width:100%;box-shadow:0 4px 20px rgba(139,92,246,.4);}
.ai-box{background:#0a1020;border:1px solid #1a2a40;border-radius:12px;margin-bottom:8px;display:none;flex-direction:column;height:420px;box-shadow:0 8px 32px rgba(0,0,0,.6);}
.ai-box.open{display:flex;}
.ai-head{padding:12px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;}
.ai-head-title{font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:var(--bright);}
.ai-close{background:none;border:none;color:var(--dim);cursor:pointer;font-size:16px;}
.ai-msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;scrollbar-width:thin;}
.ai-msg{padding:8px 12px;border-radius:8px;font-size:11px;line-height:1.6;max-width:90%;}
.ai-msg-user{background:rgba(139,92,246,.2);color:var(--bright);align-self:flex-end;border:1px solid rgba(139,92,246,.3);}
.ai-msg-bot{background:rgba(74,158,255,.1);color:#90c0ff;align-self:flex-start;border:1px solid rgba(74,158,255,.2);}
.ai-input-row{padding:10px;border-top:1px solid var(--border);display:flex;gap:6px;}
.ai-input{flex:1;background:#0d1828;border:1px solid var(--border);border-radius:6px;padding:8px;color:var(--text);font-family:'Space Mono',monospace;font-size:11px;outline:none;resize:none;}
.ai-send{background:linear-gradient(135deg,#8b5cf6,#4a9eff);border:none;border-radius:6px;padding:8px 12px;color:#fff;cursor:pointer;font-size:11px;font-weight:700;}
.ai-quick{display:flex;gap:4px;flex-wrap:wrap;padding:6px 10px;border-bottom:1px solid var(--border);}
.ai-qbtn{background:rgba(74,158,255,.1);border:1px solid rgba(74,158,255,.2);border-radius:12px;padding:3px 8px;color:var(--info);font-size:9px;cursor:pointer;font-family:'Space Mono',monospace;}
.ai-qbtn:hover{background:rgba(74,158,255,.2);}
.ai-key-row{padding:8px 10px;border-bottom:1px solid var(--border);}
.ai-key-input{width:100%;background:#0d1828;border:1px solid var(--border);border-radius:4px;padding:6px;color:var(--dim);font-size:9px;font-family:'Space Mono',monospace;outline:none;}

.footer{text-align:center;padding:16px;font-size:8px;color:var(--dim);letter-spacing:1px;border-top:1px solid var(--border);margin-top:10px;}
</style>
</head>
<body>

<!-- HEADER -->
<div class="header">
  <div class="header-top">
    <div>
      <div class="logo-sub">▶ MARKET TERMINAL LIVE</div>
      <div class="logo-title">INFORME DE MERCADO</div>
      <div style="font-size:9px;color:var(--dim);margin-top:2px;">${fechaLarga} · Generado ${hora} hs AR</div>
    </div>
    <div class="header-right">
      <div class="badge ${d.badge_clase}">⚡ ${d.badge_mercado}</div>
      <div class="badge badge-ed">${EDICION_EMOJI} ${EDICION}</div>
      <div style="font-size:10px;color:var(--info);">Riesgo geo: <strong style="color:${d.riesgo_geo==='MÁXIMO'?'#ff4060':d.riesgo_geo==='ALTO'?'#ff8c00':'#ffaa00'}">${d.riesgo_geo}</strong></div>
    </div>
  </div>
  <!-- TICKER STRIP -->
  <div class="ticker">
    <div class="tick"><div class="tick-lbl">S&P 500</div><div class="tick-val" id="t-sp">—</div><div class="tick-chg" id="t-spc">⏳</div></div>
    <div class="tick"><div class="tick-lbl">NASDAQ</div><div class="tick-val" id="t-nq">—</div><div class="tick-chg" id="t-nqc">⏳</div></div>
    <div class="tick"><div class="tick-lbl">DOW JONES</div><div class="tick-val" id="t-dj">—</div><div class="tick-chg" id="t-djc">⏳</div></div>
    <div class="tick"><div class="tick-lbl">VIX</div><div class="tick-val" id="t-vix">—</div><div class="tick-chg" id="t-vixc">⏳</div></div>
    <div class="tick"><div class="tick-lbl">DÓLAR BLUE</div><div class="tick-val" id="t-blue">⏳</div><div class="tick-chg up">ARS</div></div>
    <div class="tick"><div class="tick-lbl">CCL</div><div class="tick-val" id="t-ccl">⏳</div><div class="tick-chg up">ARS</div></div>
    <div class="tick"><div class="tick-lbl">MERVAL</div><div class="tick-val" id="t-merv">—</div><div class="tick-chg" id="t-mervc">⏳</div></div>
    <div class="tick"><div class="tick-lbl">ORO</div><div class="tick-val" id="t-gold">—</div><div class="tick-chg" id="t-goldc">⏳</div></div>
    <div class="tick"><div class="tick-lbl">WTI</div><div class="tick-val" id="t-wti">—</div><div class="tick-chg" id="t-wtic">⏳</div></div>
    <div class="tick"><div class="tick-lbl">BRENT</div><div class="tick-val" id="t-brent">—</div><div class="tick-chg" id="t-brentc">⏳</div></div>
    <div class="tick"><div class="tick-lbl">BTC</div><div class="tick-val" id="t-btc">—</div><div class="tick-chg" id="t-btcc">⏳</div></div>
    <div class="tick"><div class="tick-lbl">ETH</div><div class="tick-val" id="t-eth">—</div><div class="tick-chg" id="t-ethc">⏳</div></div>
  </div>
</div>

<!-- MAIN GRID -->
<div class="main">

  <!-- COL 1: Driver + Argentina -->
  <div style="display:flex;flex-direction:column;gap:10px;">

    <!-- DRIVER DEL DÍA -->
    <div class="panel">
      <div class="panel-head"><span class="panel-title">📌 Driver del día</span><span style="font-size:8px;color:var(--dim)">${fechaLarga}</span></div>
      <div class="panel-body">
        <div class="driver-box driver-${d.driver_tipo}">
          <div class="driver-title">${d.driver_emoji} ${d.driver_titulo}</div>
          <div class="driver-text">${d.driver_texto}</div>
        </div>
        <div class="driver-text" style="padding:8px 0">${d.resumen_ejecutivo}</div>
      </div>
    </div>

    <!-- DÓLARES AR -->
    <div class="panel">
      <div class="panel-head"><span class="panel-title">🇦🇷 Tipo de cambio</span><span style="font-size:8px;color:var(--up)">⚡ dolarapi.com</span></div>
      <div class="panel-body">
        <div class="fx-grid">
          <div class="fx-card" style="border-color:#4a9eff"><div class="fx-lbl">OFICIAL BNA</div><div class="fx-name">Dólar Oficial</div><div class="fx-price" id="fx-of">⏳</div><div class="fx-detail" id="fx-of-d">—</div></div>
          <div class="fx-card" style="border-color:#ff8c00"><div class="fx-lbl">INFORMAL</div><div class="fx-name">Dólar Blue</div><div class="fx-price" id="fx-bl">⏳</div><div class="fx-detail" id="fx-bl-d">—</div></div>
          <div class="fx-card" style="border-color:#00d49a"><div class="fx-lbl">MEP / BOLSA</div><div class="fx-name">Dólar MEP</div><div class="fx-price" id="fx-mep">⏳</div><div class="fx-detail" id="fx-mep-d">—</div></div>
          <div class="fx-card" style="border-color:#8b5cf6"><div class="fx-lbl">CONTADO C/LIQUI</div><div class="fx-name">Dólar CCL</div><div class="fx-price" id="fx-ccl">⏳</div><div class="fx-detail" id="fx-ccl-d">—</div></div>
          <div class="fx-card" style="border-color:#f0c040"><div class="fx-lbl">USDT / CRIPTO</div><div class="fx-name">Dólar Cripto</div><div class="fx-price" id="fx-cr">⏳</div><div class="fx-detail" id="fx-cr-d">—</div></div>
          <div class="fx-card" style="border-color:#ff4060"><div class="fx-lbl">OFICIAL+IMP</div><div class="fx-name">Tarjeta/Qatar</div><div class="fx-price" id="fx-tj">⏳</div><div class="fx-detail" id="fx-tj-d">—</div></div>
        </div>
        <div style="margin-top:8px;padding:8px;background:rgba(74,158,255,.06);border-radius:6px;font-size:10px;">
          <strong style="color:var(--info)">Brecha Blue/Oficial:</strong> <span id="fx-brecha" style="color:var(--warn)">calculando...</span>
          &nbsp;·&nbsp; <strong style="color:var(--info)">MERVAL USD:</strong> ~${d.merval_usd} pts
        </div>
      </div>
    </div>

    <!-- MERVAL + ACTIVOS AR -->
    <div class="panel">
      <div class="panel-head"><span class="panel-title">🇦🇷 Mercado local</span><span style="font-size:8px;color:var(--dim)">BYMA · Tiempo real</span></div>
      <div class="panel-body">
        <div class="stat-row">
          <div class="stat"><div class="stat-lbl">S&P MERVAL</div><div class="stat-val up" id="merval-v">—</div><div class="stat-sub" id="merval-c">⏳</div></div>
          <div class="stat"><div class="stat-lbl">RIESGO PAÍS</div><div class="stat-val warn">${d.riesgo_pais} bps</div><div class="stat-sub">EMBI+</div></div>
        </div>
        <div class="stat-row">
          <div class="stat"><div class="stat-lbl">RESERVAS BCRA</div><div class="stat-val info">USD ${d.reservas_bcra}M</div><div class="stat-sub">Brutas</div></div>
          <div class="stat"><div class="stat-lbl">MERVAL USD</div><div class="stat-val">${d.merval_usd}</div><div class="stat-sub">CCL aprox</div></div>
        </div>
        <div style="font-size:9px;color:var(--up);margin-bottom:6px;letter-spacing:1px;">ADRs ARGENTINOS EN NYSE</div>
        <div id="tbl-adrs"><div class="loading">Cargando ADRs...</div></div>
        <div style="font-size:9px;color:var(--warn);margin:10px 0 6px;letter-spacing:1px;">ACCIONES LOCALES EN ARS (BYMA)</div>
        <div id="tbl-ar-local"><div class="loading">Cargando precios locales...</div></div>
        <div style="font-size:9px;color:var(--info);margin:10px 0 6px;letter-spacing:1px;">BONOS SOBERANOS</div>
        <div id="tbl-ar-bonos"><div class="loading">Cargando bonos...</div></div>
      </div>
    </div>

  </div>

  <!-- COL 2: USA + Mundo + Commodities -->
  <div style="display:flex;flex-direction:column;gap:10px;">

    <!-- USA ÍNDICES + FUTUROS -->
    <div class="panel">
      <div class="panel-head"><span class="panel-title">🇺🇸 USA — Índices & Futuros</span><span style="font-size:8px;color:var(--up)">⚡ Finnhub</span></div>
      <div class="panel-body">
        <div style="font-size:8px;color:var(--dim);letter-spacing:1px;margin-bottom:4px;">ÍNDICES ETF</div>
        <div id="tbl-usa"><div class="loading">Cargando...</div></div>
        <div style="font-size:8px;color:var(--dim);letter-spacing:1px;margin:8px 0 4px;">FUTUROS PRE-MARKET</div>
        <div id="tbl-fut"><div class="loading">Cargando...</div></div>
        <div style="font-size:8px;color:var(--dim);letter-spacing:1px;margin:8px 0 4px;">BONOS TESORO USA</div>
        <div id="tbl-bonos"><div class="loading">Cargando...</div></div>
      </div>
    </div>

    <!-- VIX + FEAR & GREED -->
    <div class="panel">
      <div class="panel-head"><span class="panel-title">📊 Volatilidad & Sentimiento</span></div>
      <div class="panel-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="vix-box" style="background:var(--bg3);border-radius:6px;">
            <div style="font-size:8px;color:var(--dim);letter-spacing:1px;margin-bottom:4px;">VIX INDEX</div>
            <div class="vix-val" id="vix-v">—</div>
            <div class="tick-chg" id="vix-c" style="font-size:10px;margin:2px 0">⏳</div>
            <div class="vix-zone" id="vix-z" style="background:rgba(255,170,0,.1);color:var(--warn)">—</div>
            <div style="font-size:8px;color:var(--dim);margin-top:6px;">&lt;15 Calma · 15-20 Normal<br>20-30 ⚠ Alerta · &gt;30 🚨</div>
          </div>
          <div class="fg-wrap" style="background:var(--bg3);border-radius:6px;">
            <div style="font-size:8px;color:var(--dim);letter-spacing:1px;margin-bottom:6px;">FEAR & GREED</div>
            <div class="fg-bar"><div class="fg-needle" style="left:${d.fear_greed_pct}%"></div></div>
            <div class="fg-labels"><span>Miedo<br>ext.</span><span>Miedo</span><span>Neutral</span><span>Codicia</span><span>Cod.<br>ext.</span></div>
            <div class="fg-val" style="color:${d.fear_greed_color}">${d.fear_greed_valor}</div>
            <div class="fg-lbl" style="color:${d.fear_greed_color}">${d.fear_greed_label}</div>
            <a href="https://edition.cnn.com/markets/fear-and-greed" target="_blank" style="display:inline-block;margin-top:6px;font-size:8px;color:var(--up);text-decoration:none;border:1px solid var(--up);padding:2px 8px;border-radius:3px;">CNN →</a>
          </div>
        </div>
      </div>
    </div>

    <!-- SECTORES + MEGA TECH -->
    <div class="panel">
      <div class="panel-head"><span class="panel-title">🏢 Sectores S&P 500</span></div>
      <div class="panel-body">
        <div id="tbl-sect"><div class="loading">Cargando...</div></div>
        <div style="font-size:8px;color:var(--dim);letter-spacing:1px;margin:8px 0 4px;">MEGA TECH</div>
        <div id="tbl-tech"><div class="loading">Cargando...</div></div>
        <div style="font-size:8px;color:var(--dim);letter-spacing:1px;margin:8px 0 4px;">🎖️ DEFENSA</div>
        <div id="tbl-def"><div class="loading">Cargando...</div></div>
      </div>
    </div>

    <!-- COMMODITIES -->
    <div class="panel">
      <div class="panel-head"><span class="panel-title">⚡ Commodities</span><span style="font-size:8px;color:var(--up)">⚡ Tiempo real</span></div>
      <div class="panel-body">
        <div id="tbl-comm"><div class="loading">Cargando...</div></div>
      </div>
    </div>

  </div>

  <!-- COL 3: Mundo + Cripto + Monedas -->
  <div style="display:flex;flex-direction:column;gap:10px;">

    <!-- ÍNDICES MUNDO -->
    <div class="panel">
      <div class="panel-head"><span class="panel-title">🌍 Índices del Mundo</span><span style="font-size:8px;color:var(--up)">⚡ Tiempo real</span></div>
      <div class="panel-body">
        <div style="font-size:8px;color:var(--dim);letter-spacing:1px;margin-bottom:4px;">EUROPA & ASIA</div>
        <div id="tbl-mundo"><div class="loading">Cargando...</div></div>
        <div style="font-size:8px;color:var(--dim);letter-spacing:1px;margin:8px 0 4px;">LATAM</div>
        <div id="tbl-latam"><div class="loading">Cargando...</div></div>
      </div>
    </div>

    <!-- CRIPTO -->
    <div class="panel">
      <div class="panel-head"><span class="panel-title">₿ Criptomonedas</span><span style="font-size:8px;color:var(--up)">⚡ CoinGecko</span></div>
      <div class="panel-body">
        <div id="tbl-crypto"><div class="loading">Cargando...</div></div>
      </div>
    </div>

    <!-- MONEDAS MUNDO -->
    <div class="panel">
      <div class="panel-head"><span class="panel-title">💱 Divisas vs USD</span><span style="font-size:8px;color:var(--up)">⚡ Tiempo real</span></div>
      <div class="panel-body">
        <div style="font-size:8px;color:var(--dim);letter-spacing:1px;margin-bottom:4px;">G10</div>
        <div id="tbl-g10"><div class="loading">Cargando...</div></div>
        <div style="font-size:8px;color:var(--dim);letter-spacing:1px;margin:8px 0 4px;">LATAM FX</div>
        <div id="tbl-latamfx"><div class="loading">Cargando...</div></div>
      </div>
    </div>

  </div>

  <!-- FILA COMPLETA: ANÁLISIS -->
  <div class="panel panel-full">
    <div class="panel-head"><span class="panel-title">💬 Análisis de sesión</span><span style="font-size:8px;color:var(--dim)">${fechaLarga}</span></div>
    <div class="panel-body" style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;">
      <div>
        <div class="analysis-title">🌍 Mercados Globales</div>
        <div class="analysis-block">${d.analisis_usa}</div>
      </div>
      <div>
        <div class="analysis-title">🇦🇷 Argentina</div>
        <div class="analysis-block">${d.analisis_argentina}</div>
      </div>
      <div>
        <div class="analysis-title">🌐 Mundo</div>
        <div class="analysis-block">${d.analisis_mundo}</div>
      </div>
      <div>
        <div class="analysis-title">📐 Técnico S&P 500</div>
        <div class="analysis-block">${d.analisis_tecnico}</div>
        <div style="margin-top:8px;padding:10px;background:rgba(0,212,154,.06);border-radius:6px;border-left:3px solid var(--up);">
          <div style="font-size:8px;color:var(--dim);letter-spacing:1px;margin-bottom:4px;">🔭 OUTLOOK</div>
          <div style="font-size:10px;color:#80e8c8;line-height:1.6;">${d.outlook}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- FILA COMPLETA: GEOPOLÍTICA -->
  <div class="panel panel-full">
    <div class="panel-head"><span class="panel-title">🎖️ Conflictos & Geopolítica</span><span style="font-size:8px;color:var(--dn)">⚠ Monitoreo activo</span></div>
    <div class="panel-body" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px;">
      ${conflictCards}
    </div>
  </div>

  <!-- FILA COMPLETA: CALENDARIO -->
  <div class="panel panel-full">
    <div class="panel-head"><span class="panel-title">📅 Agenda económica — próximos 7 días</span></div>
    <div class="panel-body">
      <table class="cal-tbl">
        <thead><tr><th>DÍA</th><th></th><th>EVENTO</th><th>IMPACTO</th><th>PREVIO</th><th>CONSENSO</th></tr></thead>
        <tbody>${calRows}</tbody>
      </table>
    </div>
  </div>

</div>

<div class="footer">MARKET TERMINAL · ${fechaLarga.toUpperCase()} · ${EDICION_EMOJI} EDICIÓN ${EDICION} · Actualización cada 60s</div>

<!-- AI CHAT -->
<div class="ai-panel">
  <div class="ai-box" id="ai-box">
    <div class="ai-head">
      <span class="ai-head-title">🤖 Market AI Assistant</span>
      <button class="ai-close" onclick="toggleAI()">✕</button>
    </div>
    <div class="ai-key-row">
      <input class="ai-key-input" id="ai-key" type="password" placeholder="API Key de Anthropic (se guarda localmente)..." oninput="saveKey(this.value)"/>
    </div>
    <div class="ai-quick">
      <button class="ai-qbtn" onclick="ask('Resumí el día en 3 puntos clave')">Resumen</button>
      <button class="ai-qbtn" onclick="ask('¿Qué pasa con Argentina hoy?')">Argentina</button>
      <button class="ai-qbtn" onclick="ask('¿Cómo está el S&P técnicamente?')">Técnico</button>
      <button class="ai-qbtn" onclick="ask('¿Qué riesgos hay hoy?')">Riesgos</button>
      <button class="ai-qbtn" onclick="ask('¿Qué pasa con BTC?')">Bitcoin</button>
      <button class="ai-qbtn" onclick="ask('Outlook para mañana')">Outlook</button>
    </div>
    <div class="ai-msgs" id="ai-msgs">
      <div class="ai-msg ai-msg-bot">Hola! Soy tu asistente de mercados. Puedo analizar el informe de hoy, responder preguntas sobre Argentina, USA, crypto y más. Ingresá tu API key de Anthropic arriba para comenzar.</div>
    </div>
    <div class="ai-input-row">
      <textarea class="ai-input" id="ai-input" rows="2" placeholder="Preguntá sobre mercados..." onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendMsg();}"></textarea>
      <button class="ai-send" onclick="sendMsg()">▶</button>
    </div>
  </div>
  <button class="ai-toggle" onclick="toggleAI()">🤖 Market AI</button>
</div>

<script>
// ── UI ──────────────────────────────────────────────────────
function toggleAI(){
  const b = document.getElementById('ai-box');
  b.classList.toggle('open');
  const k = localStorage.getItem('mkt_claude_key');
  if(k) document.getElementById('ai-key').value = k;
}
function saveKey(v){ if(v.length > 10) localStorage.setItem('mkt_claude_key', v); }

// ── AI Chat ─────────────────────────────────────────────────
const CONTEXT = \`Sos un analista financiero senior. Contexto del informe de hoy (${fechaLarga}, edición ${EDICION}):
Driver: ${d.driver_titulo}
Análisis USA: ${(d.analisis_usa||'').replace(/<[^>]+>/g,'')}
Argentina: ${(d.analisis_argentina||'').replace(/<[^>]+>/g,'')}
Outlook: ${(d.outlook||'').replace(/<[^>]+>/g,'')}
Riesgo geopolítico: ${d.riesgo_geo}
Respondé de forma concisa y directa en español.\`;

const msgs = [{role:'user',content:CONTEXT},{role:'assistant',content:'Entendido, tengo el contexto del informe de hoy.'}];

async function ask(q){
  document.getElementById('ai-input').value = q;
  sendMsg();
}

async function sendMsg(){
  const inp = document.getElementById('ai-input');
  const q = inp.value.trim();
  if(!q) return;
  const key = localStorage.getItem('mkt_claude_key');
  if(!key){ addMsg('bot','Ingresá tu API key de Anthropic arriba primero.'); return; }
  inp.value = '';
  addMsg('user', q);
  msgs.push({role:'user',content:q});
  const typing = addMsg('bot','...');
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body: JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:600,messages:msgs})
    });
    const data = await r.json();
    const reply = data.content?.[0]?.text || 'Error al responder.';
    typing.textContent = reply;
    msgs.push({role:'assistant',content:reply});
  } catch(e){ typing.textContent = 'Error de conexión.'; }
}

function addMsg(who, text){
  const d = document.getElementById('ai-msgs');
  const m = document.createElement('div');
  m.className = 'ai-msg ai-msg-'+who;
  m.textContent = text;
  d.appendChild(m);
  d.scrollTop = d.scrollHeight;
  return m;
}

// ════════════════════════════════════════════════════════════
// DATA ENGINE — Multi-source, throttled
// Fuentes: Finnhub (USA stocks/ETF), Stooq (VIX/futuros/bonos/
//          commodities/índices mundo/FX), CoinGecko (crypto),
//          DolarAPI (AR FX), Ambito/Yahoo proxy (acciones AR ARS)
// ════════════════════════════════════════════════════════════

const FH = 'd6k5j1hr01qko8c3g5tgd6k5j1hr01qko8c3g5u0';
const _fc = {}, _sc = {};

// ── Helpers ────────────────────────────────────────────────
function fmt(n,dec=2){return n!=null?n.toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec}):'—';}
function chgSpan(c){
  if(c==null)return '<span style="color:var(--dim)">—</span>';
  return '<span class="'+(c>0?'chg-up':c<0?'chg-dn':'chg-flat')+'">'+(c>0?'+':'')+c.toFixed(2)+'%</span>';
}
function cf(c){
  if(c==null)return '<span class="flat">—</span>';
  return '<span class="'+(c>0?'up':c<0?'dn':'flat')+'">'+(c>0?'+':'')+c.toFixed(2)+'%</span>';
}
function pf(p,dec=2){
  if(p==null)return '—';
  return p>999?'$'+p.toLocaleString('en-US',{maximumFractionDigits:0}):'$'+p.toFixed(dec);
}
function mkTbl(rows, prefix='$'){
  if(!rows||!rows.length)return '<div class="loading">Sin datos disponibles</div>';
  return '<table class="ptbl"><thead><tr><th>SYM</th><th>NOMBRE</th><th style="text-align:right">PRECIO</th><th style="text-align:right">VAR%</th></tr></thead><tbody>'
    +rows.map(r=>{
      const pr = r.raw!=null ? r.raw : r.p;
      const display = pr==null?'—':(pr>999?(prefix+pr.toLocaleString('en-US',{maximumFractionDigits:0})):(prefix+pr.toFixed(2)));
      return '<tr><td><div class="p-sym">'+r.s+'</div></td><td><div class="p-name">'+r.n+'</div></td><td class="p-price">'+display+'</td><td class="p-chg">'+chgSpan(r.c)+'</td></tr>';
    }).join('')
    +'</tbody></table>';
}
function setEl(id,html){const e=document.getElementById(id);if(e)e.innerHTML=html;}

// ── Finnhub (USA stocks & ETFs — sin límite de símbolo) ───
async function fq(sym){
  if(_fc[sym]) return _fc[sym];
  try{
    const r=await fetch('https://finnhub.io/api/v1/quote?symbol='+encodeURIComponent(sym)+'&token='+FH);
    const d=await r.json();
    if(d.c&&d.c>0){_fc[sym]={p:d.c,c:d.dp};return _fc[sym];}
  }catch{}
  return null;
}

async function fhBatch(syms){
  // throttle: max 8 concurrent para no superar límite
  const results=[];
  const chunks=[];
  for(let i=0;i<syms.length;i+=8)chunks.push(syms.slice(i,i+8));
  for(const chunk of chunks){
    const res=await Promise.all(chunk.map(async s=>{
      const q=await fq(s);
      if(q)return{s,n:FH_NAMES[s]||s,p:q.p,c:q.c};
      return null;
    }));
    results.push(...res.filter(Boolean));
  }
  return results;
}

const FH_NAMES={
  'SPY':'S&P 500 ETF','QQQ':'Nasdaq 100','DIA':'Dow Jones ETF','IWM':'Russell 2000',
  'XLK':'Technology','XLF':'Financials','XLE':'Energy','XLV':'Health Care',
  'XLC':'Comm Svcs','XLI':'Industrials','XLB':'Materials','XLY':'Cons Discret',
  'XLP':'Cons Staples','XLU':'Utilities','XLRE':'Real Estate',
  'LMT':'Lockheed Martin','RTX':'RTX Corp','NOC':'Northrop','GD':'Gen. Dynamics','BA':'Boeing',
  'AAPL':'Apple','MSFT':'Microsoft','NVDA':'Nvidia','GOOGL':'Alphabet',
  'AMZN':'Amazon','META':'Meta','TSLA':'Tesla','NFLX':'Netflix','AMD':'AMD',
  'MELI':'MercadoLibre','GLOB':'Globant','YPF':'YPF','BMA':'Banco Macro',
  'GGAL':'Gr. Galicia','SUPV':'Supervielle','BBAR':'BBVA Arg.',
  'CEPU':'Central Puerto','LOMA':'Loma Negra','PAM':'Pampa Energía','TGS':'TGS','IRCP':'IRSA'
};

// ── Stooq (VIX, futuros, bonos, commodities, índices, FX) ─
// Stooq devuelve CSV: Date,Time,Open,High,Low,Close,Volume
// Usamos allorigins como proxy CORS
async function sq(symbol){
  if(_sc[symbol]) return _sc[symbol];
  try{
    const url='https://stooq.com/q/l/?s='+encodeURIComponent(symbol)+'&f=sd2t2ohlcv&h&e=csv';
    const proxy='https://api.allorigins.win/raw?url='+encodeURIComponent(url);
    const r=await fetch(proxy,{signal:AbortSignal.timeout(8000)});
    const txt=await r.text();
    const lines=txt.trim().split('\n');
    if(lines.length<2)return null;
    const cols=lines[1].split(',');
    const close=parseFloat(cols[5]);
    const open=parseFloat(cols[2]);
    if(!close||isNaN(close))return null;
    const chg=open>0?((close-open)/open)*100:null;
    _sc[symbol]={p:close,c:chg};
    return _sc[symbol];
  }catch{}
  return null;
}

const STOOQ_NAMES={
  '^spx':'S&P 500','^ndx':'Nasdaq 100','^dji':'Dow Jones',
  '^vix':'VIX','es.f':'E-mini S&P Fut','nq.f':'Nasdaq Fut','ym.f':'Dow Fut',
  'tnx.b':'Treasury 10Y','tyx.b':'Treasury 30Y','irx.b':'T-Bill 3M',
  'gc.f':'Oro (Gold)','si.f':'Plata (Silver)','cl.f':'WTI Crudo',
  'bz.f':'Brent Crudo','ng.f':'Gas Natural','hg.f':'Cobre',
  'zw.f':'Trigo','zc.f':'Maíz','zs.f':'Soja',
  '^nkx':'Nikkei 225','^hsi':'Hang Seng','^ftm':'FTSE 100',
  '^dax':'DAX Alemania','^cac':'CAC 40','^ibx':'IBEX 35',
  '^bov':'Bovespa','^ipc':'IPC México',
  'eurusd':'EUR/USD','gbpusd':'GBP/USD','usdjpy':'USD/JPY',
  'usdchf':'USD/CHF','audusd':'AUD/USD','usdcad':'USD/CAD',
  'usdbrl':'USD/BRL','usdclp':'USD/CLP','usdcop':'USD/COP',
  'usdmxn':'USD/MXN','usdpen':'USD/PEN'
};

async function stooqBatch(syms){
  const results=[];
  const chunks=[];
  for(let i=0;i<syms.length;i+=5)chunks.push(syms.slice(i,i+5));
  for(const chunk of chunks){
    const res=await Promise.all(chunk.map(async s=>{
      const q=await sq(s);
      const dispSym=s.replace('.f','').replace('.b','').replace('^','').toUpperCase();
      if(q)return{s:dispSym,n:STOOQ_NAMES[s]||dispSym,p:q.p,c:q.c};
      return null;
    }));
    results.push(...res.filter(Boolean));
    await new Promise(r=>setTimeout(r,200));// pequeña pausa
  }
  return results;
}

// ── Precios locales AR (Ambito vía allorigins) ─────────────
const AR_TICKERS=[
  {s:'GGAL',n:'Gr. Galicia'},
  {s:'YPFD',n:'YPF (local)'},
  {s:'PAMP',n:'Pampa Energía'},
  {s:'BMA',n:'Banco Macro'},
  {s:'BBAR',n:'BBVA Arg.'},
  {s:'SUPV',n:'Supervielle'},
  {s:'CEPU',n:'Central Puerto'},
  {s:'LOMA',n:'Loma Negra'},
  {s:'TGSU2',n:'TGS'},
  {s:'MIRG',n:'Mirgor'},
  {s:'TXAR',n:'Ternium Arg.'},
  {s:'ALUA',n:'Aluar'},
];

// Bonos soberanos en pesos y dólares
const AR_BONOS=[
  {s:'AL30',n:'AL30 (USD Law NY)'},
  {s:'GD30',n:'GD30 (USD Ext)'},
  {s:'AL35',n:'AL35 (USD)'},
  {s:'AE38',n:'AE38 (USD)'},
  {s:'GD41',n:'GD41 (USD)'},
  {s:'TX26',n:'TX26 (CER $)'},
  {s:'TX28',n:'TX28 (CER $)'},
  {s:'S31E5',n:'LETES USD'},
];

async function fetchAmbitoTicker(ticker){
  try{
    const url='https://mercados.ambito.com//acciones/'+ticker+'/informacion';
    const proxy='https://api.allorigins.win/raw?url='+encodeURIComponent(url);
    const r=await fetch(proxy,{signal:AbortSignal.timeout(8000)});
    const d=await r.json();
    if(d&&d.ultimo){
      const price=parseFloat(d.ultimo.toString().replace(',','.'));
      const chg=d.variacion?parseFloat(d.variacion.toString().replace(',','.').replace('%','')):null;
      if(price>0)return{p:price,c:chg,raw:price};
    }
  }catch{}
  return null;
}

async function loadArAcciones(){
  const rows=[];
  const chunks=[];
  for(let i=0;i<AR_TICKERS.length;i+=4)chunks.push(AR_TICKERS.slice(i,i+4));
  for(const chunk of chunks){
    const res=await Promise.all(chunk.map(async t=>{
      const q=await fetchAmbitoTicker(t.s);
      if(q)return{s:t.s,n:t.n,p:q.p,c:q.c,raw:q.raw};
      return null;
    }));
    rows.push(...res.filter(Boolean));
    await new Promise(r=>setTimeout(r,300));
  }
  return rows;
}

async function loadArBonos(){
  const rows=[];
  for(const b of AR_BONOS){
    const q=await fetchAmbitoTicker(b.s);
    if(q)rows.push({s:b.s,n:b.n,p:q.p,c:q.c,raw:q.raw});
    await new Promise(r=>setTimeout(r,200));
  }
  return rows;
}

// ── Dólar AR ──────────────────────────────────────────────
async function loadDolar(){
  try{const r=await fetch('https://dolarapi.com/v1/dolares');return await r.json();}catch{return[];}
}

// ── Cripto ────────────────────────────────────────────────
async function loadCrypto(){
  try{
    const r=await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin,ripple,cardano&vs_currencies=usd&include_24hr_change=true');
    return await r.json();
  }catch{return{};}
}

// ── MAIN LOADER ────────────────────────────────────────────
async function loadAll(){

  // 1. DÓLAR (rápido)
  const dolar=await loadDolar();
  dolar.forEach(d=>{
    const v='$'+Math.round(d.venta).toLocaleString('es-AR');
    const det='C: $'+Math.round(d.compra)+' · V: $'+Math.round(d.venta);
    if(d.casa==='oficial'){setEl('fx-of',v);setEl('fx-of-d',det);}
    if(d.casa==='blue'){setEl('fx-bl',v);setEl('fx-bl-d',det);setEl('t-blue','$'+Math.round(d.venta));}
    if(d.casa==='mep'){setEl('fx-mep',v);setEl('fx-mep-d',det);}
    if(d.casa==='contadoconliqui'){setEl('fx-ccl',v);setEl('fx-ccl-d',det);setEl('t-ccl','$'+Math.round(d.venta));}
    if(d.casa==='cripto'){setEl('fx-cr',v);setEl('fx-cr-d',det);}
    if(d.casa==='tarjeta'){setEl('fx-tj',v);setEl('fx-tj-d',det);}
  });
  const ofVal=dolar.find(d=>d.casa==='oficial')?.venta;
  const blVal=dolar.find(d=>d.casa==='blue')?.venta;
  if(ofVal&&blVal)setEl('fx-brecha',((blVal/ofVal-1)*100).toFixed(1)+'%');

  // 2. USA ETFs vía Finnhub (sin problemas de símbolo)
  const [sp,nq,dj,iw]=await Promise.all([fq('SPY'),fq('QQQ'),fq('DIA'),fq('IWM')]);
  if(sp){setEl('t-sp',pf(sp.p));setEl('t-spc',cf(sp.c));}
  if(nq){setEl('t-nq',pf(nq.p));setEl('t-nqc',cf(nq.c));}
  if(dj){setEl('t-dj',pf(dj.p,0));setEl('t-djc',cf(dj.c));}
  const usa=[sp&&{s:'SPY',n:'S&P 500 ETF',p:sp.p,c:sp.c},
             nq&&{s:'QQQ',n:'Nasdaq 100',p:nq.p,c:nq.c},
             dj&&{s:'DIA',n:'Dow Jones ETF',p:dj.p,c:dj.c},
             iw&&{s:'IWM',n:'Russell 2000',p:iw.p,c:iw.c}].filter(Boolean);
  setEl('tbl-usa',mkTbl(usa));

  // 3. VIX + futuros + bonos vía Stooq
  const [vixQ,es,nqf,ymf,tnx,tyx]=await Promise.all([
    sq('^vix'),sq('es.f'),sq('nq.f'),sq('ym.f'),sq('tnx.b'),sq('tyx.b')
  ]);
  if(vixQ){
    setEl('t-vix',vixQ.p.toFixed(2));setEl('t-vixc',cf(vixQ.c));
    setEl('vix-v',vixQ.p.toFixed(2));setEl('vix-c',cf(vixQ.c));
    const z=vixQ.p<15?'😌 CALMA':vixQ.p<20?'🟢 NORMAL':vixQ.p<30?'⚠️ ALERTA':'🚨 PÁNICO';
    setEl('vix-z',z);
  }
  const futRows=[es&&{s:'ES',n:'E-mini S&P Fut',p:es.p,c:es.c},
                 nqf&&{s:'NQ',n:'Nasdaq Fut',p:nqf.p,c:nqf.c},
                 ymf&&{s:'YM',n:'Dow Fut',p:ymf.p,c:ymf.c}].filter(Boolean);
  setEl('tbl-fut',mkTbl(futRows));
  const bonosRows=[tnx&&{s:'TNX',n:'Treasury 10Y',p:tnx.p,c:tnx.c},
                   tyx&&{s:'TYX',n:'Treasury 30Y',p:tyx.p,c:tyx.c}].filter(Boolean);
  setEl('tbl-bonos',mkTbl(bonosRows,''));

  // 4. Merval vía Stooq
  const mervQ=await sq('^merv');
  if(mervQ){
    setEl('t-merv',pf(mervQ.p,0));setEl('t-mervc',cf(mervQ.c));
    setEl('merval-v',pf(mervQ.p,0));setEl('merval-c',cf(mervQ.c));
  }

  // 5. Commodities vía Stooq
  const commQ=await stooqBatch(['gc.f','bz.f','cl.f','ng.f','si.f','hg.f','zw.f','zc.f','zs.f']);
  if(commQ.length){
    const gold=commQ.find(x=>x.s==='GC');
    const wti=commQ.find(x=>x.s==='CL');
    const brent=commQ.find(x=>x.s==='BZ');
    if(gold){setEl('t-gold',pf(gold.p,0));setEl('t-goldc',cf(gold.c));}
    if(wti){setEl('t-wti',pf(wti.p));setEl('t-wtic',cf(wti.c));}
    if(brent){setEl('t-brent',pf(brent.p));setEl('t-brentc',cf(brent.c));}
    setEl('tbl-comm',mkTbl(commQ));
  }

  // 6. Índices MUNDO vía Stooq
  const mundoQ=await stooqBatch(['^nkx','^hsi','^ftm','^dax','^cac','^ibx']);
  setEl('tbl-mundo',mkTbl(mundoQ,''));
  const latamQ=await stooqBatch(['^bov','^ipc']);
  setEl('tbl-latam',mkTbl(latamQ,''));

  // 7. Divisas G10 + LatAm vía Stooq
  const g10Q=await stooqBatch(['eurusd','gbpusd','usdjpy','usdchf','audusd','usdcad']);
  setEl('tbl-g10',mkTbl(g10Q,''));
  const latamFxQ=await stooqBatch(['usdbrl','usdclp','usdcop','usdmxn','usdpen']);
  setEl('tbl-latamfx',mkTbl(latamFxQ,''));

  // 8. Sectores + Tech + Defensa vía Finnhub
  const sect=await fhBatch(['XLK','XLF','XLE','XLV','XLC','XLI','XLB','XLY','XLP','XLU','XLRE']);
  setEl('tbl-sect',mkTbl(sect));
  const tech=await fhBatch(['AAPL','MSFT','NVDA','GOOGL','AMZN','META','TSLA','NFLX','AMD']);
  setEl('tbl-tech',mkTbl(tech));
  const def=await fhBatch(['LMT','RTX','NOC','GD','BA']);
  setEl('tbl-def',mkTbl(def));

  // 9. ADRs argentinos en NYSE vía Finnhub
  const adrs=await fhBatch(['MELI','GLOB','YPF','BMA','GGAL','SUPV','BBAR','CEPU','LOMA','PAM','TGS','IRCP']);
  setEl('tbl-adrs',mkTbl(adrs));

  // 10. Cripto vía CoinGecko
  const crypto=await loadCrypto();
  const cRows=Object.entries(crypto).map(([id,v])=>{
    const names={bitcoin:'Bitcoin',ethereum:'Ethereum',solana:'Solana',binancecoin:'BNB',ripple:'XRP',cardano:'Cardano'};
    const syms={bitcoin:'BTC',ethereum:'ETH',solana:'SOL',binancecoin:'BNB',ripple:'XRP',cardano:'ADA'};
    const btcQ=id==='bitcoin';
    if(btcQ){setEl('t-btc',pf(v.usd,0));setEl('t-btcc',cf(v.usd_24h_change));}
    if(id==='ethereum'){setEl('t-eth',pf(v.usd,0));setEl('t-ethc',cf(v.usd_24h_change));}
    return{s:syms[id]||id,n:names[id]||id,p:v.usd,c:v.usd_24h_change};
  });
  setEl('tbl-crypto',mkTbl(cRows));

  // 11. Acciones AR locales en ARS vía Ambito (async, puede tardar)
  setEl('tbl-ar-local','<div class="loading">Cargando precios locales...</div>');
  loadArAcciones().then(rows=>{
    if(rows.length) setEl('tbl-ar-local',mkTbl(rows,'$'));
    else setEl('tbl-ar-local','<div class="loading">Sin datos locales</div>');
  });

  // 12. Bonos AR
  setEl('tbl-ar-bonos','<div class="loading">Cargando bonos...</div>');
  loadArBonos().then(rows=>{
    if(rows.length) setEl('tbl-ar-bonos',mkTbl(rows,'$'));
    else setEl('tbl-ar-bonos','<div class="loading">Sin datos de bonos</div>');
  });
}

loadAll();
setInterval(()=>{Object.keys(_sc).forEach(k=>delete _sc[k]);loadAll();},90000);
</script>
</body>
</html>`;
}

async function main(){
  try{
    const data = await getContent();
    const html = generateHTML(data);
    const filename = `informe-mercado-${fechaCorta}.html`;
    writeFileSync(filename, html, 'utf8');
    console.log(`✅ Generado: ${filename}`);

    // index.html con clave y redirect
    const sc = 'scr'+'ipt';
    const pw = `(function(){var P='290585',K='mkt_auth';if(sessionStorage.getItem(K)!==P){document.addEventListener('DOMContentLoaded',function(){document.body.style.cssText='margin:0;background:#05080f;display:flex;align-items:center;justify-content:center;min-height:100vh;';var o=document.createElement('div');o.style.cssText='text-align:center;padding:40px;background:#0a1020;border:1px solid #1a2a40;border-radius:12px;max-width:320px;width:90%;';o.innerHTML='<div style=\"font-size:28px\">&#x1F510;</div><div style=\"font-family:Syne,sans-serif;font-size:20px;font-weight:800;color:#e8f4ff;margin:8px 0 4px\">MARKET TERMINAL</div><div style=\"font-size:10px;color:#4a6a8a;letter-spacing:2px;margin-bottom:20px\">ACCESO RESTRINGIDO</div><input id=\"pi\" type=\"password\" placeholder=\"Clave...\" autofocus style=\"width:100%;background:#0d1828;border:1px solid #1a2a40;border-radius:6px;padding:12px;color:#c8d8e8;font-size:14px;outline:none;text-align:center;margin-bottom:8px\" onkeydown=\"if(event.key===chr1)cp()\"/><div id=\"pe\" style=\"color:#ff4060;font-size:11px;height:16px;margin-bottom:8px\"></div><button onclick=\"cp()\" style=\"width:100%;background:linear-gradient(135deg,#8b5cf6,#4a9eff);border:none;border-radius:6px;padding:12px;color:#fff;font-size:13px;font-weight:700;cursor:pointer\">ENTRAR &#x2192;</button>';document.body.appendChild(o);var chr1="Enter";window.cp=function(){var v=document.getElementById('pi').value;if(v===P){sessionStorage.setItem(K,P);location.reload();}else{document.getElementById('pe').textContent='Clave incorrecta';document.getElementById('pi').value='';document.getElementById('pi').focus();}};});}})()`;
    const idx = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>'
      + '<meta name="viewport" content="width=device-width,initial-scale=1.0"/>'
      + '<title>Market Terminal</title>'
      + '<' + sc + '>' + pw + '</' + sc + '>'
      + `<meta http-equiv="refresh" content="0;url=${filename}"/>`
      + '<style>body{margin:0;background:#05080f;}</style>'
      + '</head><body></body></html>';
    writeFileSync('index.html', idx, 'utf8');
    console.log(`✅ index.html → ${filename}`);
  } catch(e){
    console.error('❌ Error:', e);
    process.exit(1);
  }
}

main();
