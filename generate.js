// ══════════════════════════════════════════════════════════
//  MARKET TERMINAL — Daily Report Generator v2
//  Edición MAÑANA (pre-apertura) / RUEDA / CIERRE
// ══════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync } from 'fs';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Fecha y edición ────────────────────────────────────────
const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
const nowNY = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));

const dias   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const meses  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const fechaLarga = `${dias[now.getDay()]} ${now.getDate()} de ${meses[now.getMonth()]}, ${now.getFullYear()}`;
const fechaCorta = `${String(now.getDate()).padStart(2,'0')}${meses[now.getMonth()].slice(0,3).toLowerCase()}${now.getFullYear()}`;
const hora       = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

// Detección de sesión basada en hora AR (= hora NY desde cambio de horario 2026)
const horaAR     = now.getHours() + now.getMinutes() / 60;
const esPreMarket = horaAR >= 9 && horaAR < 10.5;    // 9:00-10:30 AR (pre-apertura)
const esRueda     = horaAR >= 10.5 && horaAR < 17;   // 10:30-17:00 AR (rueda)
const esCierre    = horaAR >= 17 || horaAR < 9;      // 17:00+ AR (post-cierre)
const EDICION      = esCierre ? 'CIERRE' : esPreMarket ? 'MAÑANA' : 'RUEDA';
const EDICION_EMOJI = esCierre ? '🔴' : esPreMarket ? '🌅' : '📊';
const esManana     = EDICION === 'MAÑANA'; // compat

console.log(`📅 ${fechaLarga} · Edición ${EDICION} (${hora} AR / NY ${nowNY.getHours()}:${String(nowNY.getMinutes()).padStart(2,'0')})`);

// ── Prompt según edición ───────────────────────────────────
function buildPrompt() {
  const base = `Sos un analista financiero senior especializado en mercados argentinos y globales.
Hoy es ${fechaLarga}, hora actual en Argentina: ${hora}. Hora en NY: ${nowNY.getHours()}:${String(nowNY.getMinutes()).padStart(2,'0')}.
Edición: ${EDICION}.
Respondé SOLO con JSON válido, sin texto extra, sin markdown, sin backticks.

REGLAS CRÍTICAS:
1. NO inventes precios ni datos específicos de mercado que no conozcas con certeza.
2. Si no tenés el precio exacto de algo, describí el contexto general sin inventar números.
3. Para WTI y Brent: podés mencionar tendencias generales pero NO inventes un precio específico.
4. Para ADRs argentinos (GGAL, YPF, BMA, MELI): usá solo datos reales conocidos o describí tendencia general.
5. El análisis de Argentina debe ser coherente con el contexto global del día.`;

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
  "commodities_alerta": "texto sobre energía/commodities — NO inventés precio de WTI/Brent, describí tendencia",
  "commodities_tipo": "red|yellow|blue|green",
  "geo_eventos": [{"badge":"texto","badge_color":"#ff4060","badge_bg":"rgba(255,64,96,.15)","region":"región","headline":"titular","body":"análisis 2-3 oraciones","impacto":"impacto en mercados"}],
  "calendario_eventos": [
    GENERA 10 a 14 eventos para los próximos 7 días hábiles ordenados cronológicamente.
    OBLIGATORIO incluir: mínimo 4 datos USA (IPC/PPI/PCE, nóminas, jobless claims, ventas minoristas, ISM, Fed, balances si corresponde),
    mínimo 3 datos Argentina (IPC INDEC, reservas BCRA semanales, licitaciones Tesoro, balanza comercial, recaudación, vencimientos deuda),
    mínimo 2 internacionales (BCE/BOJ/BOE tasas, IPC Europa, PMI China, OPEP).
    {"dia":"Hoy|Mañana|Lun DD|Mar DD|Mie DD|Jue DD|Vie DD","hora":"HH:MM NY|HH:MM AR|HH:MM UE","flag":"🇺🇸|🇦🇷|🇪🇺|🇨🇳|🇬🇧|🇯🇵|🇧🇷|🏢","evento":"nombre EN ESPAÑOL con mes y año","impacto":"CRÍTICO|ALTO|MEDIO","impacto_color":"#ff4060|#ff8c00|#4a9eff","impacto_bg":"rgba(255,64,96,.12)|rgba(255,140,0,.12)|rgba(74,158,255,.12)","descripcion":"2 oraciones EN ESPAÑOL: qué mide + impacto esperado","previo":"valor anterior","consenso":"estimado consenso"}
  ],
  "bonos_arg": [{"ticker":"GD30|GD35|GD38|GD41|GD46|AL30|AL35|AL41","nombre":"nombre","precio_usd":68.50,"tir":11.5,"duracion":4.2,"ley":"NY|ARG"}],
  "analisis_global": "HTML análisis mercado global 4-5 oraciones — describí tendencias sin inventar precios específicos",
  "analisis_argentina": "HTML análisis mercado argentino 4-5 oraciones — los ADRs se cargan en tiempo real en la web, describí contexto macro",
  "analisis_tecnico_sp": "HTML análisis técnico S&P 500 con niveles de soporte y resistencia",
  "analisis_latam": "HTML análisis Brasil y LatAm",
  "merval_usd": "1750",
  "riesgo_pais": "573",
  "reservas_bcra": "45.566",
  "fear_greed_valor": 50,
  "fear_greed_label": "NEUTRAL",
  "fear_greed_color": "#ffaa00",
  "fear_greed_needle_pct": 50,
  "ganadores_dia": "sectores/activos ganadores del día en términos generales",
  "perdedores_dia": "sectores/activos perdedores del día en términos generales"`;

  if (EDICION === 'MAÑANA') {
    return `${base}

Es la EDICIÓN MAÑANA (pre-apertura, mercados USA cerrados). Generá el JSON con foco en:
- Cierres de Asia de anoche (Nikkei, Hang Seng, Shanghai, ASX)
- Estado de futuros pre-market de EE.UU.
- Noticias overnight bélicas/geopolíticas
- Datos económicos que salen HOY
- Qué hay que mirar durante la jornada

{
  "edicion": "MAÑANA",
  "asia_resumen": "HTML con resumen de cierres de Asia de anoche: Nikkei, Hang Seng, Shanghai, ASX. Variaciones y qué las movió.",
  "premarket_resumen": "HTML con estado de futuros pre-market USA y qué implica para la apertura.",
  "overnight_geo": "HTML con noticias geopolíticas/bélicas overnight más importantes.",
  "que_mirar_hoy": "HTML con lista de 3-4 cosas clave a monitorear durante la jornada de hoy.",
  ${camposComunes}
}`;
  } else if (EDICION === 'RUEDA') {
    return `${base}

Es la EDICIÓN RUEDA (mercados USA abiertos en este momento). Generá el JSON con foco en:
- Qué está pasando en este momento en los mercados
- Movimientos intraday relevantes
- Datos económicos que salieron hoy
- Argentina en tiempo real

{
  "edicion": "RUEDA",
  "rueda_resumen": "HTML con resumen de lo que está pasando en la rueda actual de Wall Street.",
  "datos_hoy": "HTML sobre datos económicos que salieron hoy y cómo reaccionó el mercado.",
  "argentina_rueda": "HTML sobre ADRs argentinos y Merval durante la rueda actual.",
  "que_vigilar": "HTML con 3-4 niveles técnicos o eventos a vigilar para el resto de la jornada.",
  ${camposComunes}
}`;
  } else {
    return `${base}

Es la EDICIÓN CIERRE (post-cierre NYSE). Generá el JSON con foco en:
- Resumen completo del cierre de Wall Street de hoy
- Ganadores y perdedores del día
- Cómo reaccionó el mercado a los datos del día
- Argentina y outlook para mañana

{
  "edicion": "CIERRE",
  "cierre_resumen": "HTML con resumen del cierre de Wall Street hoy: S&P, Nasdaq, Dow con variaciones y qué los movió.",
  "ganadores_detalle": "HTML con top 5 ganadores del día con empresa, sector y % de suba.",
  "perdedores_detalle": "HTML con top 5 perdedores del día con empresa, sector y % de baja.",
  "reaccion_datos": "HTML explicando cómo reaccionó el mercado a los datos económicos que salieron hoy.",
  "argentina_cierre": "HTML con resumen de la jornada argentina: MERVAL, ADRs destacados, dólar.",
  "outlook_manana": "HTML con outlook concreto para mañana: qué datos salen, qué niveles técnicos mirar.",
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
  const text = response.content[0].text.trim().replace(/^```json\s*/,'').replace(/^```\s*/,'').replace(/\s*```$/,'').trim();
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

  if (EDICION === 'MAÑANA') {
    tabEdicionBtn = `<button class="tab-btn" onclick="showTab('edicion',this)">🌅 Pre-Market</button>`;
    seccionEdicion = `
  <div id="tab-edicion" class="tab-panel">
    <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(0,212,154,.1);border:1px solid rgba(0,212,154,.3);border-radius:20px;padding:4px 14px;margin-bottom:16px;">
      <span style="font-size:11px;color:var(--up);letter-spacing:1px;font-weight:700;">🌅 EDICIÓN MAÑANA · ${hora} AR</span>
    </div>
    <div class="sec-title">🌏 CIERRES DE ASIA — ANOCHE</div>
    <div class="context-box">${d.asia_resumen||'Sin datos'}</div>
    <div class="sec-title">🔮 PRE-MARKET USA — FUTUROS</div>
    <div class="context-box">${d.premarket_resumen||'Sin datos'}</div>
    <div class="sec-title">⚔️ NOTICIAS OVERNIGHT</div>
    <div class="context-box">${d.overnight_geo||'Sin datos'}</div>
    <div class="sec-title">👁️ QUÉ MIRAR HOY</div>
    <div class="alert alert-yellow">${d.que_mirar_hoy||'Sin datos'}</div>
  </div>`;
  } else if (EDICION === 'RUEDA') {
    tabEdicionBtn = `<button class="tab-btn" onclick="showTab('edicion',this)">📈 En Rueda</button>`;
    seccionEdicion = `
  <div id="tab-edicion" class="tab-panel">
    <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(0,212,154,.15);border:1px solid rgba(0,212,154,.4);border-radius:20px;padding:4px 14px;margin-bottom:16px;">
      <span style="font-size:11px;color:var(--up);letter-spacing:1px;font-weight:700;">📈 MERCADOS ABIERTOS · ${hora} AR</span>
    </div>
    <div class="sec-title">📊 RUEDA EN CURSO — WALL STREET</div>
    <div class="context-box">${d.rueda_resumen||'Sin datos'}</div>
    <div class="sec-title">📋 DATOS ECONÓMICOS DE HOY</div>
    <div class="context-box">${d.datos_hoy||'Sin datos'}</div>
    <div class="sec-title">🇦🇷 ARGENTINA — DURANTE LA RUEDA</div>
    <div class="context-box">${d.argentina_rueda||'Sin datos'}</div>
    <div class="sec-title">🎯 QUÉ VIGILAR</div>
    <div class="alert alert-blue">${d.que_vigilar||'Sin datos'}</div>
  </div>`;
  } else {
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
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Market Terminal — ${fechaLarga} · ${EDICION_EMOJI} ${EDICION}</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Syne:wght@400;700;800&display=swap" rel="stylesheet"/>
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
  .edicion-rueda{background:rgba(0,212,154,.15);color:var(--up);border:1px solid rgba(0,212,154,.4);}
  .edicion-cierre{background:rgba(74,158,255,.1);color:var(--info);border:1px solid rgba(74,158,255,.3);}
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
      <div class="edicion-badge ${EDICION === 'MAÑANA' ? 'edicion-manana' : EDICION === 'RUEDA' ? 'edicion-rueda' : 'edicion-cierre'}">${EDICION_EMOJI} EDICIÓN ${EDICION}</div>
      <div style="font-size:11px;color:#4a9eff;margin-top:4px;">Riesgo geo: <strong style="color:${d.riesgo_geopolitico==='MÁXIMO'?'#ff4060':d.riesgo_geopolitico==='ALTO'?'#ff8c00':'#ffaa00'}">${d.riesgo_geopolitico}</strong></div>
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
      <div class="alert-title">📌 Resumen ejecutivo</div>
      ${d.resumen_ejecutivo}
    </div>
  </div>

  ${seccionEdicion}

  <!-- ══ USA ══ -->
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
      <div style="font-size:11px;color:var(--dim);letter-spacing:2px;margin-bottom:8px;">SENTIMENT · CNN</div>
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
        <div style="font-size:9px;color:var(--dim);margin-top:8px;line-height:1.6;">Mide la volatilidad del VIX.<br/>&gt;100 señala pánico extremo inminente</div>
        <div id="vvix-zona" style="font-size:10px;margin-top:6px;padding:3px 8px;border-radius:10px;display:inline-block;">—</div>
      </div>
    </div>
    <div class="alert alert-blue">
      <strong>Ganadores:</strong> ${d.ganadores_dia}<br/>
      <strong>Perdedores:</strong> ${d.perdedores_dia}
    </div>
  </div>

  <!-- ══ ARGENTINA ══ -->
  <div id="tab-argentina" class="tab-panel">
    <div class="sec-title">TIPO DE CAMBIO</div>
    <div style="font-size:9px;color:var(--accent);letter-spacing:1px;margin-bottom:8px;">⚡ DOLARAPI.COM — TIEMPO REAL</div>
    <div class="fx-grid" id="fx-dolar-grid">
      <div class="fx-card" style="border-color:#4a9eff"><div class="fx-pair">OFICIAL BNA</div><div class="fx-name">Dólar Oficial</div><div class="fx-price" id="fx-oficial">⏳</div><div style="font-size:9px;color:var(--dim)" id="fx-oficial-comp">cargando...</div></div>
      <div class="fx-card" style="border-color:#ff8c00"><div class="fx-pair">INFORMAL</div><div class="fx-name">Dólar Blue</div><div class="fx-price" id="fx-blue">⏳</div><div style="font-size:9px;color:var(--dim)" id="fx-blue-comp">cargando...</div></div>
      <div class="fx-card" style="border-color:#00d49a"><div class="fx-pair">MEP / BOLSA</div><div class="fx-name">Dólar MEP</div><div class="fx-price" id="fx-mep">⏳</div><div style="font-size:9px;color:var(--dim)" id="fx-mep-comp">cargando...</div></div>
      <div class="fx-card" style="border-color:#8b5cf6"><div class="fx-pair">CONTADO CON LIQUI</div><div class="fx-name">Dólar CCL</div><div class="fx-price" id="fx-ccl">⏳</div><div style="font-size:9px;color:var(--dim)" id="fx-ccl-comp">cargando...</div></div>
      <div class="fx-card" style="border-color:#f0c040"><div class="fx-pair">USDT / CRIPTO</div><div class="fx-name">Dólar Cripto</div><div class="fx-price" id="fx-cripto">⏳</div><div style="font-size:9px;color:var(--dim)" id="fx-cripto-comp">cargando...</div></div>
      <div class="fx-card" style="border-color:#ff4060"><div class="fx-pair">OFICIAL + IMPUESTOS</div><div class="fx-name">Dólar Tarjeta</div><div class="fx-price" id="fx-tarjeta">⏳</div><div style="font-size:9px;color:var(--dim)" id="fx-tarjeta-comp">cargando...</div></div>
    </div>
    <div class="alert alert-blue" style="margin-top:16px;" id="fx-brecha-alert">
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
    <div id="tbl-adrs"><div class="live-loading">⏳ Cargando ADRs...</div></div>
    <div class="sec-title">BONOS SOBERANOS</div>
    <div style="font-size:9px;color:var(--dim);letter-spacing:1px;margin-bottom:8px;">Estimados · TIR en USD</div>
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
    <div id="tbl-cripto"><div class="live-loading">⏳ Cargando...</div></div>
  </div>

  <!-- ══ MONEDAS ══ -->
  <div id="tab-monedas" class="tab-panel">
    <div class="alert alert-blue" style="margin-bottom:16px;">
      <div class="alert-title">💱 Divisas vs. USD — Tiempo Real</div>
      Valor mayor = moneda local más débil frente al dólar.
    </div>
    <div class="sec-title">🌎 LATINOAMÉRICA</div>
    <div id="tbl-monedas-latam"><div class="live-loading">⏳ Cargando...</div></div>
    <div class="sec-title">🌍 G10 — PRINCIPALES DIVISAS</div>
    <div id="tbl-monedas-g10"><div class="live-loading">⏳ Cargando...</div></div>
  </div>

  <!-- ══ MUNDO ══ -->
  <div id="tab-mundo" class="tab-panel">
    <div class="sec-title">ÍNDICES GLOBALES — TIEMPO REAL</div>
    <div id="tbl-mundo-indices"><div class="live-loading">⏳ Cargando...</div></div>
    <div class="sec-title">DIVISAS FX</div>
    <div id="tbl-mundo-fx"><div class="live-loading">⏳ Cargando...</div></div>
  </div>

  <!-- ══ COMMODITIES ══ -->
  <div id="tab-commodities" class="tab-panel">
    <div class="alert alert-${d.commodities_tipo}" style="margin-bottom:12px;">
      <div class="alert-title">⚡ Commodities · ${fechaLarga}</div>
      ${d.commodities_alerta}
    </div>
    <div class="sec-title">ENERGÍA & METALES — TIEMPO REAL</div>
    <div id="tbl-commodities"><div class="live-loading">⏳ Cargando...</div></div>
    <div class="sec-title">AGRÍCOLAS CBOT 🇦🇷</div>
    <div id="tbl-agricolas"><div class="live-loading">⏳ Cargando...</div></div>
  </div>

  <!-- ══ GEOPOLÍTICA ══ -->
  <div id="tab-geo" class="tab-panel">
    <div class="alert alert-red" style="margin-bottom:16px;">⚠ EVENTOS DE RIESGO EN MONITOREO — Clic para ver análisis</div>
    ${geoCards}
  </div>

  <!-- ══ CALENDARIO ══ -->
  <div id="tab-calendario" class="tab-panel">
    <div class="sec-title">AGENDA ECONÓMICA — PRÓXIMOS 7 DÍAS</div>
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
      <div class="comment-header"><div class="comment-icon">🇦🇷</div><div><div class="comment-author" style="color:#00d49a">Argentina</div><div class="comment-time">BYMA</div></div></div>
      <div class="comment-body">${d.analisis_argentina}</div>
    </div>
    <div class="comment-card" style="border-color:#ffaa00">
      <div class="comment-header"><div class="comment-icon">📊</div><div><div class="comment-author" style="color:#ffaa00">Técnico S&P 500</div></div></div>
      <div class="comment-body">${d.analisis_tecnico_sp}</div>
    </div>
    <div class="comment-card" style="border-color:#4a9eff">
      <div class="comment-header"><div class="comment-icon">🇧🇷</div><div><div class="comment-author" style="color:#4a9eff">Brasil & LatAm</div></div></div>
      <div class="comment-body">${d.analisis_latam}</div>
    </div>
    <div style="margin-top:16px;padding:14px;border-radius:8px;background:rgba(26,42,64,.4);border:1px solid var(--border);font-size:10px;color:var(--dim);line-height:1.7;text-align:center;">
      ⚡ Editorial: Claude AI · Precios: Yahoo Finance + CoinGecko (tiempo real)<br/>
      ${EDICION_EMOJI} Edición ${EDICION} · ${fechaLarga} · ${hora} hs AR
    </div>
  </div>

</div>

<div class="footer">MARKET TERMINAL · ${EDICION_EMOJI} EDICIÓN ${EDICION} · ${fechaLarga.toUpperCase()}</div>

<script>
const YF='https://query1.finance.yahoo.com/v8/finance/chart/';
async function fetchYahooRaw(url){
  try{const r=await fetch('https://api.allorigins.win/get?url='+encodeURIComponent(url),{signal:AbortSignal.timeout(9000)});if(r.ok){const w=await r.json();return JSON.parse(w.contents);}}catch(e){}
  return null;
}
async function fetchPrice(ticker){
  if(ticker.startsWith('CG:'))return fetchCG(ticker.slice(3));
  const url=YF+encodeURIComponent(ticker)+'?interval=1d&range=2d';
  try{const d=await fetchYahooRaw(url);if(d?.chart?.result?.[0]){const m=d.chart.result[0].meta;const prev=m.chartPreviousClose||m.previousClose;return{price:m.regularMarketPrice,chg:prev?(m.regularMarketPrice-prev)/prev*100:0,mktState:m.marketState,currency:m.currency};}}catch(e){}
  return null;
}
async function fetchCG(id){try{const r=await fetch(\`https://api.coingecko.com/api/v3/simple/price?ids=\${id}&vs_currencies=usd&include_24hr_change=true\`,{signal:AbortSignal.timeout(7000)});const d=await r.json();return{price:d[id].usd,chg:d[id].usd_24h_change,mktState:'REGULAR',currency:'USD'};}catch(e){return null;}}
function fmt(n,cur='USD'){if(!n&&n!==0)return'—';if(cur==='ARS')return n.toLocaleString('es-AR',{maximumFractionDigits:0});if(n>=10000)return n.toLocaleString('en-US',{maximumFractionDigits:0});if(n>=1)return n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});return n.toLocaleString('en-US',{minimumFractionDigits:4,maximumFractionDigits:4});}
function chgHtml(chg){if(chg==null)return'<span style="color:var(--dim)">—</span>';const cls=chg>0.05?'lv-up':chg<-0.05?'lv-dn':'lv-flat';const arrow=chg>0.05?'▲':chg<-0.05?'▼':'=';return\`<span class="\${cls}">\${arrow} \${Math.abs(chg).toFixed(2)}%</span>\`;}
function buildTable(rows){const body=rows.map(r=>{const p=r.data;if(!p)return\`<tr><td><span class="lv-name">\${r.label}</span></td><td class="lv-sym">\${r.ticker}</td><td class="lv-err" colspan="2">⚠ Sin datos</td></tr>\`;const badge=p.mktState==='REGULAR'?'<span class="live-badge badge-live">● LIVE</span>':'<span class="live-badge badge-closed">Cierre</span>';const sym=r.ticker.startsWith('CG:')?r.ticker.slice(3):r.ticker;return\`<tr><td><div class="lv-name">\${r.label}\${badge}</div><div class="lv-sym">\${r.sector||''}</div></td><td class="lv-sym">\${sym}</td><td class="lv-price">$\${fmt(p.price,p.currency)}</td><td>\${chgHtml(p.chg)}</td></tr>\`;}).join('');return\`<table class="live-tbl"><thead><tr><th>ACTIVO</th><th>SÍMBOLO</th><th>PRECIO</th><th>VAR. DÍA</th></tr></thead><tbody>\${body}</tbody></table>\`;}
async function loadGroup(divId,items){
  const el=document.getElementById(divId);if(!el)return;
  el.innerHTML='<div class="live-loading">⏳ Cargando...</div>';
  const results=[];
  for(const i of items){
    results.push({...i,data:await fetchPrice(i.ticker)});
    await new Promise(r=>setTimeout(r,300));
  }
  el.innerHTML=buildTable(results);
}
async function updateHero(){
  const heroes=[{id:'hs-sp500',idc:'hs-sp500c',t:'^GSPC'},{id:'hs-nq',idc:'hs-nqc',t:'^NDX'},{id:'hs-vix',idc:'hs-vixc',t:'^VIX'},{id:'hs-merv',idc:'hs-mervc',t:'^MERV'},{id:'hs-wti',idc:'hs-wtic',t:'CL=F'},{id:'hs-gold',idc:'hs-goldc',t:'GC=F'},{id:'hs-btc',idc:'hs-btcc',t:'CG:bitcoin'}];
  await Promise.all(heroes.map(async h=>{const p=await fetchPrice(h.t);if(!p)return;const el=document.getElementById(h.id);const elc=document.getElementById(h.idc);if(el)el.textContent=(h.t==='CL=F'||h.t==='GC=F'?'$':'')+(h.t==='^VIX'?fmt(p.price):(h.t.startsWith('CG:')?'$':'')+fmt(p.price));if(elc)elc.innerHTML=chgHtml(p.chg);}));
  const merv=await fetchPrice('^MERV');
  if(merv){const el=document.getElementById('merval-live');const elc=document.getElementById('merval-chg');if(el)el.textContent=fmt(merv.price,'ARS');if(elc)elc.innerHTML=chgHtml(merv.chg);}
  const vix=await fetchPrice('^VIX');
  if(vix){const vv=document.getElementById('vix-val');const vc=document.getElementById('vix-chg');const vz=document.getElementById('vix-zona');if(vv){vv.textContent=fmt(vix.price);vv.style.color=vix.price>30?'#ff4060':vix.price>20?'#ffaa00':'#00d49a';}if(vc)vc.innerHTML=chgHtml(vix.chg);if(vz){const[txt,bg,clr]=vix.price>30?['🚨 PÁNICO','rgba(255,64,96,.2)','#ff4060']:vix.price>20?['⚠️ ALERTA','rgba(255,170,0,.2)','#ffaa00']:vix.price>15?['😐 NORMAL','rgba(74,158,255,.2)','#4a9eff']:['😌 CALMA','rgba(0,212,154,.2)','#00d49a'];vz.textContent=txt;vz.style.background=bg;vz.style.color=clr;}}
  const vvix=await fetchPrice('^VVIX');
  if(vvix){const vv=document.getElementById('vvix-val');const vc=document.getElementById('vvix-chg');const vz=document.getElementById('vvix-zona');if(vv){vv.textContent=fmt(vvix.price);vv.style.color=vvix.price>120?'#ff4060':vvix.price>100?'#ffaa00':'#8b5cf6';}if(vc)vc.innerHTML=chgHtml(vvix.chg);if(vz){const[txt,bg,clr]=vvix.price>120?['🚨 EXTREMO','rgba(255,64,96,.2)','#ff4060']:vvix.price>100?['⚠️ ELEVADO','rgba(255,170,0,.2)','#ffaa00']:['✅ NORMAL','rgba(139,92,246,.2)','#8b5cf6'];vz.textContent=txt;vz.style.background=bg;vz.style.color=clr;}}
}
const GROUPS={
  'tbl-usa-indices':[{label:'S&P 500',ticker:'^GSPC',sector:'Índice EEUU'},{label:'Nasdaq 100',ticker:'^NDX',sector:'Tech'},{label:'Dow Jones',ticker:'^DJI',sector:'Industrial'},{label:'Russell 2000',ticker:'^RUT',sector:'Small Caps'},{label:'VIX',ticker:'^VIX',sector:'Volatilidad 😱'}],
  'tbl-usa-futuros':[{label:'S&P Fut.',ticker:'ES=F',sector:'CME'},{label:'Nasdaq Fut.',ticker:'NQ=F',sector:'CME'},{label:'Dow Fut.',ticker:'YM=F',sector:'CME'},{label:'Gold Fut.',ticker:'GC=F',sector:'COMEX'}],
  'tbl-usa-bonos':[{label:'T-Note 10Y',ticker:'^TNX',sector:'Tesoro'},{label:'T-Bond 30Y',ticker:'^TYX',sector:'Tesoro'},{label:'T-Note 2Y',ticker:'^IRX',sector:'Tesoro'},{label:'Dólar Index',ticker:'DX-Y.NYB',sector:'DXY'}],
  'tbl-usa-sectores':[{label:'🖥️ Tech',ticker:'XLK',sector:'ETF'},{label:'🛢️ Energía',ticker:'XLE',sector:'ETF'},{label:'🏦 Financiero',ticker:'XLF',sector:'ETF'},{label:'🏥 Salud',ticker:'XLV',sector:'ETF'},{label:'🏗️ Industrial',ticker:'XLI',sector:'ETF'},{label:'⚙️ Materiales',ticker:'XLB',sector:'ETF'},{label:'🛒 Cons. Básico',ticker:'XLP',sector:'ETF'},{label:'🛍️ Cons. Discr.',ticker:'XLY',sector:'ETF'},{label:'📡 Comunic.',ticker:'XLC',sector:'ETF'},{label:'💡 Utilities',ticker:'XLU',sector:'ETF'}],
  'tbl-usa-defensa':[{label:'Lockheed Martin',ticker:'LMT',sector:'Defensa'},{label:'Northrop Grumman',ticker:'NOC',sector:'Defensa'},{label:'RTX Corp',ticker:'RTX',sector:'Defensa'},{label:'General Dynamics',ticker:'GD',sector:'Defensa'},{label:'AeroVironment',ticker:'AVAV',sector:'Drones'}],
  'tbl-usa-tech':[{label:'Nvidia',ticker:'NVDA',sector:'Semis'},{label:'Apple',ticker:'AAPL',sector:'Tech'},{label:'Microsoft',ticker:'MSFT',sector:'Tech'},{label:'Alphabet',ticker:'GOOGL',sector:'Tech'},{label:'Meta',ticker:'META',sector:'Tech'},{label:'Amazon',ticker:'AMZN',sector:'Tech'},{label:'Tesla',ticker:'TSLA',sector:'EV'},{label:'ExxonMobil',ticker:'XOM',sector:'Energía'},{label:'Chevron',ticker:'CVX',sector:'Energía'}],
  'tbl-adrs':[{label:'Grupo Galicia',ticker:'GGAL',sector:'Banco·NASDAQ'},{label:'Banco Macro',ticker:'BMA',sector:'Banco·NYSE'},{label:'BBVA Argentina',ticker:'BBAR',sector:'Banco·NYSE'},{label:'Supervielle',ticker:'SUPV',sector:'Banco·NYSE'},{label:'YPF',ticker:'YPF',sector:'Energía·NYSE'},{label:'Vista Energy',ticker:'VIST',sector:'Vaca Muerta·NYSE'},{label:'Pampa Energía',ticker:'PAM',sector:'Energía·NYSE'},{label:'TGS',ticker:'TGS',sector:'Gas·NYSE'},{label:'Central Puerto',ticker:'CEPU',sector:'Energía·NYSE'},{label:'MercadoLibre',ticker:'MELI',sector:'Tech·NASDAQ'},{label:'Globant',ticker:'GLOB',sector:'Tech·NYSE'},{label:'Telecom',ticker:'TEO',sector:'Telecom·NYSE'},{label:'Edenor',ticker:'EDN',sector:'Utilities·NYSE'},{label:'Tenaris',ticker:'TS',sector:'Acero·NYSE'},{label:'IRSA',ticker:'IRS',sector:'Real Estate·NYSE'},{label:'Loma Negra',ticker:'LOMA',sector:'Cemento·NYSE'},{label:'Cresud',ticker:'CRESY',sector:'Agro·NASDAQ'}],
  'tbl-cripto':[{label:'Bitcoin',ticker:'CG:bitcoin',sector:'Cripto'},{label:'Ethereum',ticker:'CG:ethereum',sector:'Cripto'},{label:'Solana',ticker:'CG:solana',sector:'Cripto'},{label:'BNB',ticker:'CG:binancecoin',sector:'Cripto'},{label:'XRP',ticker:'CG:ripple',sector:'Cripto'}],
  'tbl-monedas-latam':[{label:'🇧🇷 Real Brasileño',ticker:'BRL=X',sector:'USD/BRL'},{label:'🇲🇽 Peso Mexicano',ticker:'MXN=X',sector:'USD/MXN'},{label:'🇨🇱 Peso Chileno',ticker:'CLP=X',sector:'USD/CLP'},{label:'🇨🇴 Peso Colombiano',ticker:'COP=X',sector:'USD/COP'},{label:'🇵🇪 Sol Peruano',ticker:'PEN=X',sector:'USD/PEN'},{label:'🇺🇾 Peso Uruguayo',ticker:'UYU=X',sector:'USD/UYU'}],
  'tbl-monedas-g10':[{label:'🇪🇺 Euro',ticker:'EURUSD=X',sector:'EUR/USD'},{label:'🇬🇧 Libra Esterlina',ticker:'GBPUSD=X',sector:'GBP/USD'},{label:'🇯🇵 Yen Japonés',ticker:'JPY=X',sector:'USD/JPY'},{label:'🇨🇳 Yuan Chino',ticker:'CNY=X',sector:'USD/CNY'},{label:'🇨🇭 Franco Suizo',ticker:'CHF=X',sector:'USD/CHF'},{label:'🇦🇺 Dólar Australiano',ticker:'AUDUSD=X',sector:'AUD/USD'},{label:'🇨🇦 Dólar Canadiense',ticker:'CAD=X',sector:'USD/CAD'}],
  'tbl-mundo-indices':[{label:'Euro Stoxx 50',ticker:'^STOXX50E',sector:'Europa 🇪🇺'},{label:'DAX',ticker:'^GDAXI',sector:'Alemania 🇩🇪'},{label:'FTSE 100',ticker:'^FTSE',sector:'UK 🇬🇧'},{label:'CAC 40',ticker:'^FCHI',sector:'Francia 🇫🇷'},{label:'Nikkei 225',ticker:'^N225',sector:'Japón 🇯🇵'},{label:'Hang Seng',ticker:'^HSI',sector:'HK 🇭🇰'},{label:'Bovespa',ticker:'^BVSP',sector:'Brasil 🇧🇷'},{label:'MERVAL',ticker:'^MERV',sector:'Argentina 🇦🇷'}],
  'tbl-mundo-fx':[{label:'EUR/USD',ticker:'EURUSD=X',sector:'Forex'},{label:'USD/JPY',ticker:'JPY=X',sector:'Forex'},{label:'USD/BRL',ticker:'BRL=X',sector:'Forex'},{label:'GBP/USD',ticker:'GBPUSD=X',sector:'Forex'},{label:'USD/CNY',ticker:'CNY=X',sector:'Forex'}],
  'tbl-commodities':[{label:'WTI Crude',ticker:'CL=F',sector:'NYMEX'},{label:'Brent Crude',ticker:'BZ=F',sector:'ICE'},{label:'Gas Natural',ticker:'NG=F',sector:'NYMEX'},{label:'Oro',ticker:'GC=F',sector:'COMEX'},{label:'Plata',ticker:'SI=F',sector:'COMEX'},{label:'Cobre',ticker:'HG=F',sector:'COMEX'}],
  'tbl-agricolas':[{label:'Soja',ticker:'ZS=F',sector:'CBOT 🇦🇷'},{label:'Maíz',ticker:'ZC=F',sector:'CBOT 🇦🇷'},{label:'Trigo',ticker:'ZW=F',sector:'CBOT 🇦🇷'}],
};
const loaded=new Set();
const TAB_GROUPS={
  usa:['tbl-usa-indices','tbl-usa-futuros','tbl-usa-bonos','tbl-usa-sectores','tbl-usa-defensa','tbl-usa-tech'],
  argentina:['tbl-adrs','tbl-cripto'],
  monedas:['tbl-monedas-latam','tbl-monedas-g10'],
  mundo:['tbl-mundo-indices','tbl-mundo-fx'],
  commodities:['tbl-commodities','tbl-agricolas'],
};
function showTab(id,btn){
  try{
    document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    const panel=document.getElementById('tab-'+id);
    if(panel)panel.classList.add('active');
    if(btn){btn.classList.add('active');btn.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'});}
    if(!loaded.has(id)&&TAB_GROUPS[id]){loaded.add(id);TAB_GROUPS[id].forEach(g=>{if(GROUPS[g])loadGroup(g,GROUPS[g]);});}
  }catch(e){console.error('showTab error:',e);}
}
updateHero();
fetchDolares();
async function fetchDolares(){
  try{
    const r=await fetch('https://dolarapi.com/v1/dolares',{signal:AbortSignal.timeout(8000)});
    const data=await r.json();
    const map={};
    data.forEach(d=>{map[d.casa.toLowerCase()]=d;});
    const set=(id,compId,casa)=>{
      const d=map[casa];
      if(!d)return;
      const el=document.getElementById(id);
      const elc=document.getElementById(compId);
      if(el)el.textContent='$'+Math.round(d.venta).toLocaleString('es-AR');
      if(elc)elc.textContent='C: $'+Math.round(d.compra).toLocaleString('es-AR')+' · V: $'+Math.round(d.venta).toLocaleString('es-AR');
      const hsEl=document.getElementById('hs-'+casa.replace('contadoconliqui','ccl').replace('blue','blue')+'-val');
      if(hsEl&&(casa==='blue'||casa==='contadoconliqui'))hsEl.textContent='$'+Math.round(d.venta).toLocaleString('es-AR');
    };
    set('fx-oficial','fx-oficial-comp','oficial');
    set('fx-blue','fx-blue-comp','blue');
    set('fx-mep','fx-mep-comp','bolsa');
    set('fx-ccl','fx-ccl-comp','contadoconliqui');
    set('fx-cripto','fx-cripto-comp','cripto');
    set('fx-tarjeta','fx-tarjeta-comp','tarjeta');
    // hero strip
    const blueEl=document.getElementById('hs-blue-val');
    const cclEl=document.getElementById('hs-ccl-val');
    if(map.blue&&blueEl)blueEl.textContent='$'+Math.round(map.blue.venta).toLocaleString('es-AR');
    if(map.contadoconliqui&&cclEl)cclEl.textContent='$'+Math.round(map.contadoconliqui.venta).toLocaleString('es-AR');
    // brecha
    if(map.oficial&&map.blue){
      const brecha=((map.blue.venta-map.oficial.venta)/map.oficial.venta*100).toFixed(1);
      const el=document.getElementById('fx-brecha');
      if(el)el.innerHTML='<strong style="color:'+(brecha>100?'#ff4060':brecha>50?'#ffaa00':'#00d49a')+'">'+(brecha>0?'+':'')+brecha+'%</strong>';
    }
  }catch(e){console.error('fetchDolares error:',e);}
}
</script>
</body>
</html>`;
}

async function main() {
  try {
    const d = await getEditorialContent();
    const filename = `informe-mercado-${fechaCorta}.html`;
    const html = generateHTML(d);
    writeFileSync(filename, html, 'utf8');
    console.log(`✅ Generado: ${filename}`);

    // index.html limpio
    const target = filename;
    const idx = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Market Terminal</title>
<style>
body{margin:0;background:#05080f;font-family:system-ui,sans-serif;}
.box{position:fixed;inset:0;background:#05080f;display:flex;align-items:center;justify-content:center;}
.card{text-align:center;padding:40px;background:#0a1020;border:1px solid #1a2a40;border-radius:12px;max-width:320px;width:90%;}
.title{font-size:20px;font-weight:800;color:#e8f4ff;margin:8px 0 4px;font-family:sans-serif;}
.sub{font-size:10px;color:#4a6a8a;letter-spacing:2px;margin-bottom:20px;}
input{width:100%;background:#0d1117;border:1px solid #1a2a40;border-radius:6px;padding:12px;color:#e8f4ff;font-size:14px;outline:none;text-align:center;margin-bottom:8px;box-sizing:border-box;}
input:focus{border-color:#4a9eff;}
button{width:100%;background:linear-gradient(135deg,#8b5cf6,#4a9eff);border:none;border-radius:6px;padding:12px;color:#fff;font-size:13px;font-weight:700;cursor:pointer;}
.err{color:#ff4060;font-size:11px;height:16px;margin-bottom:8px;}
</style>
</head>
<body>
<div class="box">
<div class="card">
<div style="font-size:28px">&#x1F4CA;</div>
<div class="title">Market Terminal</div>
<div class="sub">ACCESO RESTRINGIDO</div>
<input id="pi" type="password" placeholder="Ingres&#225; la clave..." autofocus/>
<div class="err" id="pe"></div>
<button onclick="cp()">Ingresar &#x2192;</button>
</div>
</div>
<script>
var P='290585',K='mkt_auth',T='${target}';
if(sessionStorage.getItem(K)===P){window.location.replace(T);}
document.getElementById('pi').addEventListener('keydown',function(e){if(e.key==='Enter')cp();});
function cp(){
  var v=document.getElementById('pi').value;
  if(v===P){sessionStorage.setItem(K,P);window.location.replace(T);}
  else{document.getElementById('pe').textContent='Clave incorrecta';document.getElementById('pi').value='';document.getElementById('pi').focus();}
}
</script>
</body>
</html>`;
    writeFileSync('index.html', idx, 'utf8');
    console.log(`✅ index.html → ${filename}`);
  } catch(e) {
    console.error('❌ Error:', e);
    process.exit(1);
  }
}

main();
