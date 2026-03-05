// ══════════════════════════════════════════════════════════
//  MARKET TERMINAL — Daily Report Generator v3
//  Horarios AR: Mañana < 10:30 · Rueda 10:30-18:00 · Cierre > 18:00
//  Wall Street: 11:30-18:00 AR · BYMA: 10:30-17:00 AR
// ══════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync } from 'fs';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Fecha y edición ────────────────────────────────────────
const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
const dias   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const meses  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const fechaLarga = `${dias[now.getDay()]} ${now.getDate()} de ${meses[now.getMonth()]}, ${now.getFullYear()}`;
const fechaCorta = `${String(now.getDate()).padStart(2,'0')}${meses[now.getMonth()].slice(0,3).toLowerCase()}${now.getFullYear()}`;
const hora       = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

// Horarios correctos en AR: Wall St 11:30-18:00 / BYMA 10:30-17:00
const horaNum    = now.getHours() + now.getMinutes() / 60;
const esManana   = horaNum < 10.5;
const esCierre   = horaNum >= 18;
const EDICION    = esCierre ? 'CIERRE' : esManana ? 'MAÑANA' : 'RUEDA';
const EDICION_EMOJI = esCierre ? '🌆' : esManana ? '🌅' : '📈';

console.log(`📅 ${fechaLarga} · Edición ${EDICION} (${hora} AR)`);

// ── Prompt según edición ───────────────────────────────────
function buildPrompt() {
  const base = `Sos un analista financiero senior especializado en mercados argentinos y globales.
Hoy es ${fechaLarga}, hora actual en Argentina: ${hora}.
Respondé SOLO con JSON válido, sin texto extra, sin markdown, sin backticks.`;

  const camposComunes = `
  "driver_titulo": "título del tema central del día (máx 60 chars)",
  "driver_emoji": "emoji relevante",
  "driver_alerta_tipo": "red|yellow|blue|green",
  "driver_alerta_titulo": "título del alert",
  "driver_alerta_texto": "texto HTML del alert con <strong> y <em>",
  "driver_contexto": "párrafo HTML de contexto, 3-4 oraciones",
  "stat1_label":"label","stat1_valor":"valor","stat1_clase":"up|dn|warn|info","stat1_sub":"sub",
  "stat2_label":"label","stat2_valor":"valor","stat2_clase":"up|dn|warn|info","stat2_sub":"sub",
  "stat3_label":"label","stat3_valor":"valor","stat3_clase":"up|dn|warn|info","stat3_sub":"sub",
  "stat4_label":"label","stat4_valor":"valor","stat4_clase":"up|dn|warn|info","stat4_sub":"sub",
  "resumen_ejecutivo": "HTML del resumen del día",
  "badge_mercado": "texto badge estado mercado",
  "badge_clase": "badge-open|badge-warn",
  "riesgo_geopolitico": "BAJO|MODERADO|ALTO|MÁXIMO",
  "commodities_alerta": "texto sobre energía/commodities",
  "commodities_tipo": "red|yellow|blue|green",
  "geo_eventos": [{"badge":"texto","badge_color":"#ff4060","badge_bg":"rgba(255,64,96,.15)","region":"región","headline":"titular","body":"análisis 2-3 oraciones","impacto":"impacto en mercados"}],
  "calendario_eventos": [
    GENERA 10 a 14 eventos para los próximos 7 días hábiles ordenados cronológicamente.
    OBLIGATORIO incluir: mínimo 4 datos USA (IPC/PPI/PCE, nóminas, jobless claims, ventas minoristas, ISM, Fed, balances NVDA/AAPL/MSFT/META si corresponde esa semana),
    mínimo 3 datos Argentina (IPC INDEC, reservas BCRA semanales, licitaciones Tesoro, balanza comercial, recaudación, vencimientos deuda),
    mínimo 2 internacionales (BCE/BOJ/BOE tasas, IPC Europa, PMI China, OPEP).
    {"dia":"Hoy|Mañana|Lun DD|Mar DD|Mie DD|Jue DD|Vie DD","hora":"HH:MM NY|HH:MM AR|HH:MM UE","flag":"🇺🇸|🇦🇷|🇪🇺|🇨🇳|🇬🇧|🇯🇵|🇧🇷|🏢","evento":"nombre EN ESPAÑOL con mes y año","impacto":"CRÍTICO|ALTO|MEDIO","impacto_color":"#ff4060|#ff8c00|#4a9eff","impacto_bg":"rgba(255,64,96,.12)|rgba(255,140,0,.12)|rgba(74,158,255,.12)","descripcion":"2 oraciones EN ESPAÑOL: qué mide + impacto esperado","previo":"valor anterior","consenso":"estimado consenso"}
  ],
  "bonos_arg": [{"ticker":"GD30|GD35|GD38|GD41|GD46|AL30|AL35|AL41","nombre":"nombre","precio_usd":68.50,"tir":11.5,"duracion":4.2,"ley":"NY|ARG"}],
  "analisis_global": "HTML análisis mercado global 4-5 oraciones",
  "analisis_argentina": "HTML análisis mercado argentino 4-5 oraciones",
  "analisis_tecnico_sp": "HTML análisis técnico S&P 500",
  "analisis_latam": "HTML análisis Brasil y LatAm",
  "dolar_oficial_venta":"1425","dolar_blue_venta":"1425","dolar_mep_venta":"1438","dolar_ccl_venta":"1485","dolar_cripto_venta":"1476","dolar_tarjeta_venta":"1865",
  "brecha_blue":"0%","merval_ars":"2.597.000","merval_usd":"1.750","riesgo_pais":"573","reservas_bcra":"45.566",
  "fear_greed_valor":50,"fear_greed_label":"NEUTRAL","fear_greed_color":"#ffaa00","fear_greed_needle_pct":50,
  "ganadores_dia":"texto ganadores","perdedores_dia":"texto perdedores"`;

  if (esManana) {
    return `${base}

Es la EDICIÓN MAÑANA (pre-apertura). Generá el JSON con foco en:
- Cierres de Asia de anoche (Nikkei, Hang Seng, Shanghai, ASX)
- Futuros pre-market de EE.UU. al momento
- Noticias overnight bélicas/geopolíticas
- Datos económicos que salen HOY
- Qué hay que mirar durante la jornada

{
  "edicion": "MAÑANA",
  "asia_resumen": "HTML con resumen de cierres de Asia de anoche",
  "premarket_resumen": "HTML con estado de futuros pre-market USA",
  "overnight_geo": "HTML con noticias geopolíticas overnight",
  "que_mirar_hoy": "HTML con lista de 3-4 cosas clave a monitorear hoy",
  ${camposComunes}
}`;
  } else if (esCierre) {
    return `${base}

Es la EDICIÓN CIERRE (post-cierre NYSE 18hs AR). Generá el JSON con foco en:
- Resumen del cierre de Wall Street de hoy
- Ganadores y perdedores del día con porcentajes
- Cómo reaccionó el mercado a los datos que salieron hoy
- Qué pasó en Argentina durante la jornada
- Outlook concreto para mañana

{
  "edicion": "CIERRE",
  "cierre_resumen": "HTML con resumen del cierre de Wall Street hoy",
  "ganadores_detalle": "HTML con top 5 ganadores del día con empresa, sector y % de suba",
  "perdedores_detalle": "HTML con top 5 perdedores del día con empresa, sector y % de baja",
  "reaccion_datos": "HTML explicando cómo reaccionó el mercado a los datos de hoy",
  "argentina_cierre": "HTML con resumen de la jornada argentina: MERVAL, ADRs, dólar",
  "outlook_manana": "HTML con outlook concreto para mañana: datos y niveles técnicos",
  ${camposComunes}
}`;
  } else {
    return `${base}

Es la EDICIÓN RUEDA (mercados abiertos, 10:30-18:00 AR). Generá el JSON con foco en:
- Qué está moviendo al mercado AHORA
- Performance en tiempo real de índices y sectores
- Datos económicos que ya salieron hoy
- Niveles técnicos clave a monitorear
- Qué esperar para el cierre

{
  "edicion": "RUEDA",
  "rueda_resumen": "HTML con resumen de lo que está pasando en la rueda ahora",
  "sectores_resumen": "HTML con qué sectores lideran y cuáles caen en la rueda",
  "datos_hoy": "HTML con datos económicos que ya salieron hoy y cómo reaccionó el mercado",
  "niveles_tecnicos": "HTML con niveles técnicos clave del S&P 500 y MERVAL para hoy",
  "outlook_cierre": "HTML con qué esperar para el cierre de hoy",
  ${camposComunes}
}`;
  }
}

async function getEditorialContent() {
  console.log(`🤖 Llamando a Claude (edición ${EDICION})...`);
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 6000,
    messages: [{ role: 'user', content: buildPrompt() }]
  });
  const raw = response.content[0].text.trim();
  const text = raw.replace(/^```json\s*/,'').replace(/^```\s*/,'').replace(/\s*```$/,'').trim();
  return JSON.parse(text);
}

// ── HTML Generator ─────────────────────────────────────────
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
        ${(e.previo||e.consenso) ? `<div style="display:flex;gap:12px;margin-top:5px;">${e.previo?`<span style="font-size:9px;color:var(--dim)">Prev: <strong style="color:var(--text)">${e.previo}</strong></span>`:''}${e.consenso?`<span style="font-size:9px;color:var(--dim)">Consenso: <strong style="color:var(--up)">${e.consenso}</strong></span>`:''}</div>` : ''}
        <div style="font-size:10px;color:var(--dim);margin-top:4px">${e.descripcion}</div>
      </div>
    </div>`).join('\n');

  // Sección especial según edición
  let seccionEdicion = '';
  let tabEdicionBtn = '';

  if (esManana) {
    tabEdicionBtn = `<button class="tab-btn" onclick="showTab('edicion',this)">🌅 Pre-Market</button>`;
    seccionEdicion = `
  <div id="tab-edicion" class="tab-panel">
    <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(0,212,154,.1);border:1px solid rgba(0,212,154,.3);border-radius:20px;padding:4px 14px;margin-bottom:16px;">
      <span style="font-size:11px;color:var(--up);letter-spacing:1px;font-weight:700;">🌅 EDICIÓN MAÑANA · ${hora} AR</span>
    </div>
    <div class="sec-title">🌏 CIERRES DE ASIA — ANOCHE</div>
    <div class="context-box">${d.asia_resumen||'Sin datos'}</div>
    <div class="sec-title">🔮 PRE-MARKET USA — FUTUROS AHORA</div>
    <div class="context-box">${d.premarket_resumen||'Sin datos'}</div>
    <div class="sec-title">⚔️ NOTICIAS OVERNIGHT</div>
    <div class="context-box">${d.overnight_geo||'Sin datos'}</div>
    <div class="sec-title">👁️ QUÉ MIRAR HOY</div>
    <div class="alert alert-yellow">${d.que_mirar_hoy||'Sin datos'}</div>
  </div>`;
  } else if (esCierre) {
    tabEdicionBtn = `<button class="tab-btn" onclick="showTab('edicion',this)">🌆 Cierre</button>`;
    seccionEdicion = `
  <div id="tab-edicion" class="tab-panel">
    <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(74,158,255,.1);border:1px solid rgba(74,158,255,.3);border-radius:20px;padding:4px 14px;margin-bottom:16px;">
      <span style="font-size:11px;color:var(--info);letter-spacing:1px;font-weight:700;">🌆 EDICIÓN CIERRE · ${hora} AR</span>
    </div>
    <div class="sec-title">📊 CIERRE WALL STREET</div>
    <div class="context-box">${d.cierre_resumen||'Sin datos'}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
      <div>
        <div class="sec-title">🏆 GANADORES</div>
        <div class="context-box" style="border-color:var(--up)">${d.ganadores_detalle||'Sin datos'}</div>
      </div>
      <div>
        <div class="sec-title">📉 PERDEDORES</div>
        <div class="context-box" style="border-color:var(--dn)">${d.perdedores_detalle||'Sin datos'}</div>
      </div>
    </div>
    <div class="sec-title">🇦🇷 ARGENTINA — CIERRE LOCAL</div>
    <div class="context-box">${d.argentina_cierre||'Sin datos'}</div>
    <div class="sec-title">🔭 OUTLOOK MAÑANA</div>
    <div class="alert alert-blue">${d.outlook_manana||'Sin datos'}</div>
  </div>`;
  } else {
    tabEdicionBtn = `<button class="tab-btn" onclick="showTab('edicion',this)">📈 Rueda</button>`;
    seccionEdicion = `
  <div id="tab-edicion" class="tab-panel">
    <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(0,212,154,.1);border:1px solid rgba(0,212,154,.3);border-radius:20px;padding:4px 14px;margin-bottom:16px;">
      <span style="font-size:11px;color:var(--up);letter-spacing:1px;font-weight:700;">📈 EN RUEDA · ${hora} AR · Wall St 11:30-18:00 · BYMA 10:30-17:00</span>
    </div>
    <div class="sec-title">🔴 MERCADOS EN VIVO AHORA</div>
    <div class="context-box">${d.rueda_resumen||'Sin datos'}</div>
    <div class="sec-title">📊 SECTORES</div>
    <div class="context-box">${d.sectores_resumen||'Sin datos'}</div>
    <div class="sec-title">📋 DATOS DE HOY</div>
    <div class="context-box">${d.datos_hoy||'Sin datos'}</div>
    <div class="sec-title">📐 NIVELES TÉCNICOS</div>
    <div class="alert alert-blue">${d.niveles_tecnicos||'Sin datos'}</div>
    <div class="sec-title">🔭 OUTLOOK CIERRE</div>
    <div class="alert alert-yellow">${d.outlook_cierre||'Sin datos'}</div>
  </div>`;
  }

  const PASSWORD_SCRIPT = `<script>(function(){var P='290585',K='mkt_auth';if(sessionStorage.getItem(K)!==P){document.addEventListener('DOMContentLoaded',function(){document.body.innerHTML='';var o=document.createElement('div');o.style.cssText='position:fixed;inset:0;background:#05080f;display:flex;align-items:center;justify-content:center;z-index:9999;font-family:Space Mono,monospace;';o.innerHTML='<div style="text-align:center;padding:40px;background:#0a1020;border:1px solid #1a2a40;border-radius:12px;max-width:320px;width:90%;"><div style="font-size:28px;margin-bottom:8px;">&#x1F510;</div><div style="font-family:Syne,sans-serif;font-size:20px;font-weight:800;color:#e8f4ff;margin-bottom:4px;">MARKET TERMINAL</div><div style="font-size:10px;color:#4a6a8a;letter-spacing:2px;margin-bottom:24px;">ACCESO RESTRINGIDO</div><input id="pi" type="password" placeholder="Ingres&#225; la clave..." autofocus style="width:100%;background:#0d1828;border:1px solid #1a2a40;border-radius:6px;padding:12px;color:#c8d8e8;font-size:14px;outline:none;text-align:center;margin-bottom:10px;" onkeydown="if(event.key===\'Enter\')cp()"/><div id="pe" style="color:#ff4060;font-size:11px;height:16px;margin-bottom:10px;"></div><button onclick="cp()" style="width:100%;background:linear-gradient(135deg,#8b5cf6,#4a9eff);border:none;border-radius:6px;padding:12px;color:#fff;font-size:13px;font-weight:700;cursor:pointer;">ENTRAR &#x2192;</button></div>';document.body.appendChild(o);window.cp=function(){var v=document.getElementById('pi').value;if(v===P){sessionStorage.setItem(K,P);location.reload();}else{document.getElementById('pe').textContent='&#x26A0;&#xFE0F; Clave incorrecta';document.getElementById('pi').value='';document.getElementById('pi').focus();}};});}})();<\/script>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Market Terminal — ${fechaLarga} · ${EDICION_EMOJI} ${EDICION}</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Syne:wght@400;700;800&display=swap" rel="stylesheet"/>
${PASSWORD_SCRIPT}
<style>
  :root{--bg:#05080f;--bg2:#0a1020;--bg3:#0d1828;--border:#1a2a40;--up:#00d49a;--dn:#ff4060;--warn:#ffaa00;--info:#4a9eff;--purple:#8b5cf6;--text:#c8d8e8;--dim:#4a6a8a;--bright:#e8f4ff;--accent:#00d49a;}
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:var(--bg);color:var(--text);font-family:'Space Mono',monospace;min-height:100vh;overflow-x:hidden;}
  body::before{content:'';position:fixed;inset:0;z-index:1000;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,212,154,.018) 0px,rgba(0,212,154,.018) 1px,transparent 1px,transparent 3px);}
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
  .edicion-badge{display:inline-flex;align-items:center;gap:5px;font-size:9px;letter-spacing:1px;font-weight:700;padding:3px 10px;border-radius:20px;margin-top:4px;}
  .edicion-manana{background:rgba(0,212,154,.1);color:var(--up);border:1px solid rgba(0,212,154,.3);}
  .edicion-cierre{background:rgba(74,158,255,.1);color:var(--info);border:1px solid rgba(74,158,255,.3);}
  .edicion-rueda{background:rgba(255,64,96,.1);color:var(--dn);border:1px solid rgba(255,64,96,.3);}
  .hero-strip{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:10px 0 6px;flex-wrap:nowrap;}
  .hero-strip::-webkit-scrollbar{display:none;}
  .hero-chip{flex-shrink:0;background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:7px 12px;display:flex;flex-direction:column;gap:1px;min-width:90px;}
  .chip-label{font-size:8px;color:var(--dim);letter-spacing:1px;}
  .chip-val{font-size:13px;font-weight:700;color:var(--bright);}
  .chip-chg{font-size:10px;font-weight:700;}
  .up{color:var(--up);}.dn{color:var(--dn);}.warn{color:var(--warn);}.info{color:var(--info);}
  .tab-bar{display:flex;gap:2px;overflow-x:auto;scrollbar-width:none;border-top:1px solid var(--border);margin-top:8px;}
  .tab-bar::-webkit-scrollbar{display:none;}
  .tab-btn{flex-shrink:0;background:none;border:none;border-bottom:2px solid transparent;color:var(--dim);cursor:pointer;padding:10px 14px;font-size:11px;font-family:'Space Mono',monospace;white-space:nowrap;transition:all .18s;}
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
  .chg-up{color:var(--up);font-weight:700;}.chg-dn{color:var(--dn);font-weight:700;}.chg-flat{color:var(--dim);}
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
  .context-box strong{color:var(--bright);}.context-box em{color:var(--warn);font-style:normal;}
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
  .lv-up{color:var(--up);font-weight:700;}.lv-dn{color:var(--dn);font-weight:700;}.lv-flat{color:var(--dim);}
  .lv-err{color:var(--warn);font-size:10px;}
  .live-badge{display:inline-block;font-size:8px;padding:1px 5px;border-radius:3px;margin-left:4px;vertical-align:middle;}
  .badge-live{background:rgba(0,212,154,.15);color:var(--up);border:1px solid rgba(0,212,154,.3);}
  .badge-closed{background:rgba(255,170,0,.15);color:var(--warn);border:1px solid rgba(255,170,0,.3);}
  .footer{text-align:center;padding:20px;font-size:9px;color:var(--dim);letter-spacing:1px;border-top:1px solid var(--border);}
  @media(max-width:600px){.fx-grid{grid-template-columns:1fr;}.stat-grid{grid-template-columns:1fr;}.logo-title{font-size:20px;}}
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
      <div class="edicion-badge ${esCierre ? 'edicion-cierre' : esManana ? 'edicion-manana' : 'edicion-rueda'}">${EDICION_EMOJI} EDICIÓN ${EDICION}</div>
      <div style="font-size:11px;color:#4a9eff;margin-top:4px;">Riesgo geopolítico: <strong style="color:${d.riesgo_geopolitico==='MÁXIMO'?'#ff4060':d.riesgo_geopolitico==='ALTO'?'#ff8c00':'#ffaa00'}">${d.riesgo_geopolitico}</strong></div>
    </div>
  </div>

  <div class="hero-strip">
    <div class="hero-chip"><span class="chip-label">S&P 500</span><span class="chip-val" id="hs-sp500">—</span><span class="chip-chg" id="hs-sp500c">⏳</span></div>
    <div class="hero-chip"><span class="chip-label">NASDAQ</span><span class="chip-val" id="hs-nq">—</span><span class="chip-chg" id="hs-nqc">⏳</span></div>
    <div class="hero-chip"><span class="chip-label">VIX</span><span class="chip-val" id="hs-vix">—</span><span class="chip-chg" id="hs-vixc">⏳</span></div>
    <div class="hero-chip"><span class="chip-label">DÓLAR BLUE</span><span class="chip-val" id="hs-blue-val">⏳</span><span class="chip-chg up">ARS</span></div>
    <div class="hero-chip"><span class="chip-label">CCL</span><span class="chip-val" id="hs-ccl-val">⏳</span><span class="chip-chg up">ARS</span></div>
    <div class="hero-chip"><span class="chip-label">MERVAL</span><span class="chip-val" id="hs-merv">—</span><span class="chip-chg" id="hs-mervc">⏳</span></div>
    <div class="hero-chip"><span class="chip-label">WTI</span><span class="chip-val" id="hs-wti">—</span><span class="chip-chg" id="hs-wtic">⏳</span></div>
    <div class="hero-chip"><span class="chip-label">ORO</span><span class="chip-val" id="hs-gold">—</span><span class="chip-chg" id="hs-goldc">⏳</span></div>
    <div class="hero-chip"><span class="chip-label">BTC</span><span class="chip-val" id="hs-btc">—</span><span class="chip-chg" id="hs-btcc">⏳</span></div>
  </div>

  <div class="tab-bar">
    <button class="tab-btn active" onclick="showTab('contexto',this)">📊 Contexto</button>
    ${tabEdicionBtn}
    <button class="tab-btn" onclick="showTab('usa',this)">🇺🇸 USA</button>
    <button class="tab-btn" onclick="showTab('argentina',this)">🇦🇷 Argentina</button>
    <button class="tab-btn" onclick="showTab('monedas',this)">💱 Monedas</button>
    <button class="tab-btn" onclick="showTab('mundo',this)">🌍 Mundo</button>
    <button class="tab-btn" onclick="showTab('commodities',this)">⚡ Commodities</button>
    <button class="tab-btn" onclick="showTab('geo',this)">🎖️ Geopolítica</button>
    <button class="tab-btn" onclick="showTab('calendario',this)">📅 Calendario</button>
    <button class="tab-btn" onclick="showTab('analisis',this)">💬 Análisis</button>
  </div>
</div>

<div class="content">

  <!-- CONTEXTO -->
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
      <div class="alert-title">📌 Resumen ejecutivo</div>
      ${d.resumen_ejecutivo}
    </div>
  </div>

  ${seccionEdicion}

  <!-- USA -->
  <div id="tab-usa" class="tab-panel">
    <div class="sec-title">ÍNDICES & FUTUROS — TIEMPO REAL</div>
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
      <div style="font-size:32px;font-weight:bold;color:${d.fear_greed_color};">${d.fear_greed_valor}</div>
      <div style="font-size:13px;color:${d.fear_greed_color};letter-spacing:3px;margin-top:4px;">${d.fear_greed_label}</div>
      <a href="https://edition.cnn.com/markets/fear-and-greed" target="_blank" style="display:inline-block;margin-top:10px;font-size:9px;color:var(--accent);letter-spacing:1px;text-decoration:none;border:1px solid var(--accent);padding:3px 10px;border-radius:3px;">VER EN CNN →</a>
    </div>
    <div class="sec-title">VOLATILIDAD — VIX & VVIX</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:9px;color:var(--dim);letter-spacing:2px;margin-bottom:6px;">VIX — ÍNDICE DE VOLATILIDAD</div>
        <div id="vix-val" style="font-family:'Syne',sans-serif;font-size:28px;font-weight:800;color:var(--warn);">—</div>
        <div id="vix-chg" style="font-size:11px;margin-top:4px;">⏳</div>
        <div style="font-size:9px;color:var(--dim);margin-top:8px;line-height:1.6;">&lt;15 Calma · 15-20 Normal<br/>20-30 ⚠ Alerta · &gt;30 🚨 Pánico</div>
        <div id="vix-zona" style="font-size:10px;margin-top:6px;padding:3px 8px;border-radius:10px;display:inline-block;">—</div>
      </div>
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:9px;color:var(--dim);letter-spacing:2px;margin-bottom:6px;">VVIX — VIX DEL VIX</div>
        <div id="vvix-val" style="font-family:'Syne',sans-serif;font-size:28px;font-weight:800;color:var(--purple);">—</div>
        <div id="vvix-chg" style="font-size:11px;margin-top:4px;">⏳</div>
        <div style="font-size:9px;color:var(--dim);margin-top:8px;line-height:1.6;">Mide volatilidad del VIX.<br/>&gt;100 señala pánico extremo inminente</div>
        <div id="vvix-zona" style="font-size:10px;margin-top:6px;padding:3px 8px;border-radius:10px;display:inline-block;">—</div>
      </div>
    </div>
    <div class="alert alert-blue">
      <strong>Ganadores:</strong> ${d.ganadores_dia}<br/>
      <strong>Perdedores:</strong> ${d.perdedores_dia}
    </div>
  </div>

  <!-- ARGENTINA -->
  <div id="tab-argentina" class="tab-panel">
    <div class="sec-title">TIPO DE CAMBIO</div>
    <div style="font-size:9px;color:var(--accent);letter-spacing:1px;margin-bottom:8px;">⚡ DOLARAPI.COM — TIEMPO REAL</div>
    <div class="fx-grid">
      <div class="fx-card" style="border-color:#4a9eff"><div class="fx-pair">OFICIAL BNA</div><div class="fx-name">Dólar Oficial</div><div class="fx-price" id="fx-oficial">⏳</div><div style="font-size:9px;color:var(--dim)" id="fx-oficial-comp">cargando...</div></div>
      <div class="fx-card" style="border-color:#ff8c00"><div class="fx-pair">INFORMAL</div><div class="fx-name">Dólar Blue</div><div class="fx-price" id="fx-blue">⏳</div><div style="font-size:9px;color:var(--dim)" id="fx-blue-comp">cargando...</div></div>
      <div class="fx-card" style="border-color:#00d49a"><div class="fx-pair">MEP / BOLSA</div><div class="fx-name">Dólar MEP</div><div class="fx-price" id="fx-mep">⏳</div><div style="font-size:9px;color:var(--dim)" id="fx-mep-comp">cargando...</div></div>
      <div class="fx-card" style="border-color:#8b5cf6"><div class="fx-pair">CONTADO CON LIQUI</div><div class="fx-name">Dólar CCL</div><div class="fx-price" id="fx-ccl">⏳</div><div style="font-size:9px;color:var(--dim)" id="fx-ccl-comp">cargando...</div></div>
      <div class="fx-card" style="border-color:#f0c040"><div class="fx-pair">USDT / CRIPTO</div><div class="fx-name">Dólar Cripto</div><div class="fx-price" id="fx-cripto">⏳</div><div style="font-size:9px;color:var(--dim)" id="fx-cripto-comp">cargando...</div></div>
      <div class="fx-card" style="border-color:#ff4060"><div class="fx-pair">OFICIAL + IMPUESTOS</div><div class="fx-name">Dólar Tarjeta</div><div class="fx-price" id="fx-tarjeta">⏳</div><div style="font-size:9px;color:var(--dim)" id="fx-tarjeta-comp">cargando...</div></div>
    </div>
    <div class="alert alert-blue" style="margin-top:16px;">
      <strong>📊 Brecha Blue/Oficial:</strong> <span id="fx-brecha">calculando...</span> · <strong>MERVAL USD (CCL):</strong> ~${d.merval_usd} pts
    </div>
    <div class="sec-title">MERVAL & ACTIVOS LOCALES</div>
    <table class="mkt-table">
      <thead><tr><th>ACTIVO</th><th>PRECIO</th><th>VAR.</th><th>NOTA</th></tr></thead>
      <tbody>
        <tr><td><div class="name">S&P MERVAL</div><div class="sym">BYMA · ARS</div></td><td class="price" id="merval-live">—</td><td id="merval-chg">⏳</td><td style="font-size:10px;color:#ff8060">USD ~${d.merval_usd}</td></tr>
        <tr><td><div class="name">Riesgo País</div><div class="sym">EMBI+</div></td><td class="price warn">${d.riesgo_pais} bps</td><td>—</td><td></td></tr>
        <tr><td><div class="name">Reservas BCRA</div><div class="sym">Brutas</div></td><td class="price">USD ${d.reservas_bcra}M</td><td>—</td><td></td></tr>
      </tbody>
    </table>
    <div class="sec-title">ADRs ARGENTINOS — TIEMPO REAL</div>
    <div id="tbl-adrs"><div class="live-loading">Cargando...</div></div>
    <div class="sec-title">BONOS SOBERANOS — PRECIO & TIR</div>
    <table class="mkt-table">
      <thead><tr><th>BONO</th><th>LEY</th><th>PRECIO USD</th><th>TIR</th><th>DURACIÓN</th></tr></thead>
      <tbody>
        ${(d.bonos_arg||[]).map(b=>`
        <tr>
          <td><div class="name">${b.ticker}</div><div class="sym">${b.nombre}</div></td>
          <td><span style="font-size:9px;padding:2px 6px;border-radius:3px;background:${b.ley==='NY'?'rgba(74,158,255,.15)':'rgba(139,92,246,.15)'};color:${b.ley==='NY'?'#4a9eff':'#8b5cf6'}">${b.ley}</span></td>
          <td class="price">$${b.precio_usd}</td>
          <td class="${b.tir<10?'chg-up':b.tir>15?'chg-dn':'warn'}">${b.tir}%</td>
          <td style="font-size:11px;color:var(--dim)">${b.duracion} años</td>
        </tr>`).join('')}
      </tbody>
    </table>
    <div class="sec-title">CRIPTO</div>
    <div id="tbl-cripto"><div class="live-loading">Cargando...</div></div>
  </div>

  <!-- MONEDAS -->
  <div id="tab-monedas" class="tab-panel">
    <div class="alert alert-blue" style="margin-bottom:16px;">
      <div class="alert-title">💱 Divisas vs. USD — Tiempo Real</div>
      <strong>Valor mayor = moneda local más débil frente al dólar.</strong>
    </div>
    <div class="sec-title">🌎 LATINOAMÉRICA</div>
    <div id="tbl-monedas-latam"><div class="live-loading">Cargando...</div></div>
    <div class="sec-title">🌍 G10 — PRINCIPALES DIVISAS</div>
    <div id="tbl-monedas-g10"><div class="live-loading">Cargando...</div></div>
  </div>

  <!-- MUNDO -->
  <div id="tab-mundo" class="tab-panel">
    <div class="sec-title">ÍNDICES GLOBALES — TIEMPO REAL</div>
    <div id="tbl-mundo-indices"><div class="live-loading">Cargando...</div></div>
    <div class="sec-title">DIVISAS FX</div>
    <div id="tbl-mundo-fx"><div class="live-loading">Cargando...</div></div>
  </div>

  <!-- COMMODITIES -->
  <div id="tab-commodities" class="tab-panel">
    <div class="alert alert-${d.commodities_tipo}" style="margin-bottom:12px;">
      <div class="alert-title">⚡ Commodities · ${fechaLarga}</div>
      ${d.commodities_alerta}
    </div>
    <div class="sec-title">ENERGÍA & METALES — TIEMPO REAL</div>
    <div id="tbl-commodities"><div class="live-loading">Cargando...</div></div>
    <div class="sec-title">AGRÍCOLAS CBOT 🇦🇷</div>
    <div id="tbl-agricolas"><div class="live-loading">Cargando...</div></div>
  </div>

  <!-- GEOPOLÍTICA -->
  <div id="tab-geo" class="tab-panel">
    <div class="alert alert-red" style="margin-bottom:16px;">⚠ EVENTOS DE RIESGO EN MONITOREO — Clic para ver análisis</div>
    ${geoCards}
  </div>

  <!-- CALENDARIO -->
  <div id="tab-calendario" class="tab-panel">
    <div class="sec-title">AGENDA ECONÓMICA — PRÓXIMOS 7 DÍAS</div>
    <div style="font-size:9px;color:var(--dim);margin-bottom:16px;letter-spacing:1px;">🇺🇸 EE.UU. · 🇦🇷 Argentina · 🌍 Internacional · 🏢 Corporativos</div>
    ${calItems}
  </div>

  <!-- ANÁLISIS -->
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
      <div class="comment-header"><div class="comment-icon">📊</div><div><div class="comment-author" style="color:#ffaa00">Análisis Técnico S&P</div><div class="comment-time">Niveles clave</div></div></div>
      <div class="comment-body">${d.analisis_tecnico_sp}</div>
    </div>
    <div class="comment-card" style="border-color:#4a9eff">
      <div class="comment-header"><div class="comment-icon">🌎</div><div><div class="comment-author" style="color:#4a9eff">LatAm & Brasil</div><div class="comment-time">Mercados regionales</div></div></div>
      <div class="comment-body">${d.analisis_latam}</div>
    </div>
  </div>

</div>

<div class="footer">MARKET TERMINAL · ${fechaLarga.toUpperCase()} · ${EDICION_EMOJI} EDICIÓN ${EDICION} · Datos en tiempo real vía Yahoo Finance & DolarAPI</div>

<script>
function showTab(id, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + id).classList.add('active');
  btn.classList.add('active');
}

// ── Live Data ──────────────────────────────────────────────
function fmtN(n, dec=2) { return n != null ? n.toLocaleString('en-US', {minimumFractionDigits:dec,maximumFractionDigits:dec}) : '—'; }
function chgHtml(c) {
  if (c == null) return '<span style="color:var(--dim)">—</span>';
  const cls = c > 0 ? 'lv-up' : c < 0 ? 'lv-dn' : 'lv-flat';
  return '<span class="'+cls+'">'+(c>0?'+':'')+c.toFixed(2)+'%</span>';
}
function liveTbl(rows) {
  return '<table class="live-tbl"><thead><tr><th>ACTIVO</th><th>NOMBRE</th><th>PRECIO</th><th>VAR. %</th></tr></thead><tbody>'
    + rows.map(r => '<tr><td><div class="lv-sym">'+r.s+'</div></td><td><div class="lv-name">'+r.n+'</div></td><td class="lv-price">$'+fmtN(r.p)+'</td><td>'+chgHtml(r.c)+'</td></tr>').join('')
    + '</tbody></table>';
}

const FINNHUB_KEY = 'd6k5j1hr01qko8c3g5tgd6k5j1hr01qko8c3g5u0';

const SYM_MAP = {
  '^VIX':'VIX','ES=F':'ES1!','NQ=F':'NQ1!','YM=F':'YM1!','RTY=F':'RTY1!',
  '^TNX':'TNX','^TYX':'TYX','^IRX':'IRX',
  'GC=F':'OANDA:XAUUSD','SI=F':'OANDA:XAGUSD',
  'CL=F':'NYMEX:CL1!','NG=F':'NYMEX:NG1!','HG=F':'COMEX:HG1!',
  'ZW=F':'CBOT:ZW1!','ZC=F':'CBOT:ZC1!','ZS=F':'CBOT:ZS1!',
  'BTC-USD':'BINANCE:BTCUSDT',
  '^MERV':'BYMA:IMV',
  '^N225':'TVC:NI225','^HSI':'TVC:HSI',
  '^FTSE':'TVC:UKX','^GDAXI':'TVC:DAX','^FCHI':'TVC:CAC40',
  '^BVSP':'BMFBOVESPA:IBOV','^MXX':'BMV:IPC',
  'BRL=X':'OANDA:USDBRL','CLP=X':'OANDA:USDCLP',
  'COP=X':'OANDA:USDCOP','PEN=X':'OANDA:USDPEN',
  'MXN=X':'OANDA:USDMXN','UYU=X':'OANDA:USDUYU',
  'EURUSD=X':'OANDA:EURUSD','GBPUSD=X':'OANDA:GBPUSD',
  'JPY=X':'OANDA:USDJPY','CHF=X':'OANDA:USDCHF',
  'AUD=X':'OANDA:AUDUSD','CAD=X':'OANDA:USDCAD'
};

const SYM_NAMES = {
  'SPY':'S&P 500 ETF','QQQ':'Nasdaq 100 ETF','DIA':'Dow Jones ETF','IWM':'Russell 2000',
  'VIX':'VIX Volatilidad','ES1!':'S&P Futuro','NQ1!':'Nasdaq Futuro','YM1!':'Dow Futuro','RTY1!':'Russell Futuro',
  'TNX':'T-Note 10Y','TYX':'T-Bond 30Y','IRX':'T-Bill 3M',
  'OANDA:XAUUSD':'Oro','OANDA:XAGUSD':'Plata',
  'NYMEX:CL1!':'WTI Crudo','NYMEX:NG1!':'Gas Natural','COMEX:HG1!':'Cobre',
  'CBOT:ZW1!':'Trigo','CBOT:ZC1!':'Maíz','CBOT:ZS1!':'Soja',
  'BINANCE:BTCUSDT':'Bitcoin','BYMA:IMV':'S&P Merval',
  'TVC:NI225':'Nikkei 225','TVC:HSI':'Hang Seng','TVC:UKX':'FTSE 100',
  'TVC:DAX':'DAX','TVC:CAC40':'CAC 40','BMFBOVESPA:IBOV':'Bovespa','BMV:IPC':'IPC México',
  'OANDA:USDBRL':'USD/BRL','OANDA:USDCLP':'USD/CLP','OANDA:USDCOP':'USD/COP',
  'OANDA:USDPEN':'USD/PEN','OANDA:USDMXN':'USD/MXN','OANDA:USDUYU':'USD/UYU',
  'OANDA:EURUSD':'EUR/USD','OANDA:GBPUSD':'GBP/USD','OANDA:USDJPY':'USD/JPY',
  'OANDA:USDCHF':'USD/CHF','OANDA:AUDUSD':'AUD/USD','OANDA:USDCAD':'USD/CAD',
  'XLK':'Technology','XLF':'Financials','XLE':'Energy','XLV':'Health Care',
  'XLC':'Comm Services','XLI':'Industrials','XLB':'Materials','XLY':'Cons Discret',
  'XLP':'Cons Staples','XLU':'Utilities','XLRE':'Real Estate',
  'LMT':'Lockheed Martin','RTX':'RTX Corp','NOC':'Northrop Grumman','GD':'General Dynamics','BA':'Boeing',
  'AAPL':'Apple','MSFT':'Microsoft','NVDA':'Nvidia','GOOGL':'Alphabet',
  'AMZN':'Amazon','META':'Meta','TSLA':'Tesla','NFLX':'Netflix','AMD':'AMD',
  'MELI':'MercadoLibre','GLOB':'Globant','YPF':'YPF','BMA':'Banco Macro',
  'GGAL':'Grupo Galicia','SUPV':'Supervielle','BBAR':'BBVA Argentina',
  'CEPU':'Central Puerto','LOMA':'Loma Negra','IRCP':'IRSA CP','PAM':'Pampa Energía','TGS':'TGS'
};

const _fhCache = {};
async function fhQuote(sym) {
  if (_fhCache[sym]) return _fhCache[sym];
  try {
    const r = await fetch('https://finnhub.io/api/v1/quote?symbol='+encodeURIComponent(sym)+'&token='+FINNHUB_KEY);
    const d = await r.json();
    if (d.c && d.c > 0) { _fhCache[sym] = {p:d.c,c:d.dp}; return _fhCache[sym]; }
  } catch {}
  return null;
}

async function loadYahoo(yahooSymbols) {
  const results = [];
  const promises = yahooSymbols.map(async ys => {
    const fs = SYM_MAP[ys] || ys;
    const q = await fhQuote(fs);
    if (q) results.push({s:ys, n:SYM_NAMES[fs]||SYM_NAMES[ys]||ys, p:q.p, c:q.c});
  });
  await Promise.all(promises);
  return results;
}

async function loadDolar() {
  try {
    const r = await fetch('https://dolarapi.com/v1/dolares');
    return await r.json();
  } catch { return []; }
}

async function loadCrypto() {
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin,ripple&vs_currencies=usd&include_24hr_change=true');
    return await r.json();
  } catch { return {}; }
}

function setEl(id, html) { const e = document.getElementById(id); if(e) e.innerHTML = html; }

async function loadAll() {
  // Hero chips — índices
  const idx = await loadYahoo(['SPY','QQQ','^VIX','GC=F','CL=F','BTC-USD','^MERV']);
  idx.forEach(q => {
    const pf = (p, dec=2) => p != null ? (p > 1000 ? '$'+p.toLocaleString('en-US',{maximumFractionDigits:0}) : '$'+p.toFixed(dec)) : '—';
    const cf = c => c != null ? '<span style="color:'+(c>0?'var(--up)':c<0?'var(--dn)':'var(--dim)')+';">'+(c>0?'+':'')+c.toFixed(2)+'%</span>' : '⏳';
    if(q.s==='SPY')    { setEl('hs-sp500',pf(q.p)); setEl('hs-sp500c',cf(q.c)); }
    if(q.s==='QQQ')    { setEl('hs-nq',pf(q.p)); setEl('hs-nqc',cf(q.c)); }
    if(q.s==='^VIX')   { setEl('hs-vix',q.p?.toFixed(2)||'—'); setEl('hs-vixc',cf(q.c));
                         setEl('vix-val',q.p?.toFixed(2)||'—'); setEl('vix-chg',cf(q.c));
                         const zona = q.p<15?'Calma 😌':q.p<20?'Normal':'⚠️ Alerta';
                         setEl('vix-zona','<span style="background:rgba(255,170,0,.1);color:var(--warn);padding:2px 8px;border-radius:8px;">'+zona+'</span>'); }
    if(q.s==='GC=F')   { setEl('hs-gold',pf(q.p,0)); setEl('hs-goldc',cf(q.c)); }
    if(q.s==='CL=F')   { setEl('hs-wti',pf(q.p)); setEl('hs-wtic',cf(q.c)); }
    if(q.s==='BTC-USD') { setEl('hs-btc',pf(q.p,0)); setEl('hs-btcc',cf(q.c)); }
    if(q.s==='^MERV')  { setEl('hs-merv',pf(q.p,0)); setEl('hs-mervc',cf(q.c));
                         setEl('merval-live',pf(q.p,0)); setEl('merval-chg',cf(q.c)); }
  });

  // Dólar AR
  const dolar = await loadDolar();
  dolar.forEach(d => {
    const v = '$'+Math.round(d.venta).toLocaleString('es-AR');
    const comp = 'C: $'+Math.round(d.compra)+' · V: $'+Math.round(d.venta);
    if(d.casa==='oficial')  { setEl('fx-oficial',v); setEl('fx-oficial-comp',comp); setEl('hs-blue-val','$'+Math.round(d.venta)); }
    if(d.casa==='blue')     { setEl('fx-blue',v); setEl('fx-blue-comp',comp); }
    if(d.casa==='mep')      { setEl('fx-mep',v); setEl('fx-mep-comp',comp); }
    if(d.casa==='contadoconliqui') { setEl('fx-ccl',v); setEl('fx-ccl-comp',comp); setEl('hs-ccl-val','$'+Math.round(d.venta)); }
    if(d.casa==='cripto')   { setEl('fx-cripto',v); setEl('fx-cripto-comp',comp); }
    if(d.casa==='tarjeta')  { setEl('fx-tarjeta',v); setEl('fx-tarjeta-comp',comp); }
  });
  const of = dolar.find(d=>d.casa==='oficial')?.venta;
  const bl = dolar.find(d=>d.casa==='blue')?.venta;
  if(of&&bl) setEl('fx-brecha', ((bl/of-1)*100).toFixed(1)+'%');

  // USA Indices
  const usa = await loadYahoo(['SPY','QQQ','DIA','IWM','^VIX']);
  setEl('tbl-usa-indices', liveTbl(usa.map(q=>({s:q.s,n:q.n,p:q.p,c:q.c}))));

  // Futuros
  const fut = await loadYahoo(['ES=F','NQ=F','YM=F','RTY=F']);
  setEl('tbl-usa-futuros', fut.length ? liveTbl(fut.map(q=>({s:q.s,n:q.n,p:q.p,c:q.c}))) : '');

  // Bonos USA
  const bonos = await loadYahoo(['^TNX','^TYX','^IRX']);
  setEl('tbl-usa-bonos', bonos.length ? liveTbl(bonos.map(q=>({s:q.s,n:q.n,p:q.p,c:q.c}))) : '');

  // Sectores
  const sect = await loadYahoo(['XLK','XLF','XLE','XLV','XLC','XLI','XLB','XLY','XLP','XLU','XLRE']);
  setEl('tbl-usa-sectores', liveTbl(sect.map(q=>({s:q.s,n:q.n,p:q.p,c:q.c}))));

  // Defensa
  const def = await loadYahoo(['LMT','RTX','NOC','GD','BA']);
  setEl('tbl-usa-defensa', liveTbl(def.map(q=>({s:q.s,n:q.n,p:q.p,c:q.c}))));

  // Mega Tech
  const tech = await loadYahoo(['AAPL','MSFT','NVDA','GOOGL','AMZN','META','TSLA','NFLX','AMD']);
  setEl('tbl-usa-tech', liveTbl(tech.map(q=>({s:q.s,n:q.n,p:q.p,c:q.c}))));

  // ADRs AR
  const adrs = await loadYahoo(['MELI','GLOB','YPF','BMA','GGAL','SUPV','BBAR','CEPU','LOMA','IRCP','PAM','TGS']);
  setEl('tbl-adrs', liveTbl(adrs.map(q=>({s:q.s,n:q.n,p:q.p,c:q.c}))));

  // Crypto
  const crypto = await loadCrypto();
  const cNames = {bitcoin:'Bitcoin',ethereum:'Ethereum',solana:'Solana',binancecoin:'BNB',ripple:'XRP'};
  const cSyms = {bitcoin:'BTC',ethereum:'ETH',solana:'SOL',binancecoin:'BNB',ripple:'XRP'};
  const cRows = Object.entries(crypto).map(([id,v])=>({s:cSyms[id],n:cNames[id],p:v.usd,c:v.usd_24h_change}));
  setEl('tbl-cripto', liveTbl(cRows));

  // Commodities
  const comm = await loadYahoo(['GC=F','SI=F','CL=F','NG=F','HG=F','ZW=F','ZC=F','ZS=F']);
  setEl('tbl-commodities', liveTbl(comm.map(q=>({s:q.s,n:q.n,p:q.p,c:q.c}))));
  setEl('tbl-agricolas', '');

  // Monedas LATAM
  const latam = await loadYahoo(['BRL=X','CLP=X','COP=X','PEN=X','MXN=X','UYU=X']);
  setEl('tbl-monedas-latam', liveTbl(latam.map(q=>({s:q.s,n:q.n,p:q.p,c:q.c}))));

  // G10
  const g10 = await loadYahoo(['EURUSD=X','GBPUSD=X','JPY=X','CHF=X','AUD=X','CAD=X']);
  setEl('tbl-monedas-g10', liveTbl(g10.map(q=>({s:q.s,n:q.n,p:q.p,c:q.c}))));

  // Mundo
  const mundo = await loadYahoo(['^N225','^HSI','^FTSE','^GDAXI','^FCHI','^BVSP','^MXX']);
  setEl('tbl-mundo-indices', liveTbl(mundo.map(q=>({s:q.s,n:q.n,p:q.p,c:q.c}))));
}

loadAll();
setInterval(loadAll, 60000);
</script>
</body>
</html>`;
}

// ── Main ───────────────────────────────────────────────────
async function main() {
  try {
    const data = await getEditorialContent();
    const html = generateHTML(data);
    const filename = `informe-mercado-${fechaCorta}.html`;
    writeFileSync(filename, html, 'utf8');
    console.log(`✅ Generado: ${filename}`);

    // Actualizar index.html
    const indexHTML = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Market Terminal</title>
<script>(function(){var P='290585',K='mkt_auth';if(sessionStorage.getItem(K)!==P){document.addEventListener('DOMContentLoaded',function(){document.body.style.cssText='margin:0;background:#05080f;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:Space Mono,monospace;';var o=document.createElement('div');o.style.cssText='text-align:center;padding:40px;background:#0a1020;border:1px solid #1a2a40;border-radius:12px;max-width:320px;width:90%;';o.innerHTML='<div style="font-size:28px;margin-bottom:8px;">&#x1F510;</div><div style="font-family:Syne,sans-serif;font-size:20px;font-weight:800;color:#e8f4ff;margin-bottom:4px;">MARKET TERMINAL</div><div style="font-size:10px;color:#4a6a8a;letter-spacing:2px;margin-bottom:24px;">ACCESO RESTRINGIDO</div><input id="pi" type="password" placeholder="Ingres&#225; la clave..." autofocus style="width:100%;background:#0d1828;border:1px solid #1a2a40;border-radius:6px;padding:12px;color:#c8d8e8;font-size:14px;outline:none;text-align:center;margin-bottom:10px;" onkeydown="if(event.key===\'Enter\')cp()"/><div id="pe" style="color:#ff4060;font-size:11px;height:16px;margin-bottom:10px;"></div><button onclick="cp()" style="width:100%;background:linear-gradient(135deg,#8b5cf6,#4a9eff);border:none;border-radius:6px;padding:12px;color:#fff;font-size:13px;font-weight:700;cursor:pointer;">ENTRAR &#x2192;</button>';document.body.appendChild(o);window.cp=function(){var v=document.getElementById('pi').value;if(v===P){sessionStorage.setItem(K,P);location.reload();}else{document.getElementById('pe').textContent='&#x26A0;&#xFE0F; Clave incorrecta';document.getElementById('pi').value='';document.getElementById('pi').focus();}};});}})();<\/script>
<meta http-equiv="refresh" content="0;url=${filename}"/>
<style>body{margin:0;background:#05080f;}</style>
</head>
<body></body>
</html>`;
    writeFileSync('index.html', indexHTML, 'utf8');
    console.log('✅ index.html actualizado → ' + filename);
  } catch (e) {
    console.error('❌ Error:', e);
    process.exit(1);
  }
}

main();
