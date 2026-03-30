// ══════════════════════════════════════════════════════════
//  MARKET TERMINAL — Generator v3
//  Ediciones: MAÑANA / RUEDA / CIERRE (por hora NYSE)
//  Fixes: análisis real con web_search, bonos TIR live,
//         sin heatmap, sin precios inventados
// ══════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync } from 'fs';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Fecha y edición por hora NYSE ──────────────────────────
const now   = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
const nowNY = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));

const dias  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const fechaLarga = `${dias[now.getDay()]} ${now.getDate()} de ${meses[now.getMonth()]}, ${now.getFullYear()}`;
const fechaCorta = `${String(now.getDate()).padStart(2,'0')}${meses[now.getMonth()].slice(0,3).toLowerCase()}${now.getFullYear()}`;
const hora       = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
const horaNY     = `${String(nowNY.getHours()).padStart(2,'0')}:${String(nowNY.getMinutes()).padStart(2,'0')}`;

const horaNumNY  = nowNY.getHours() + nowNY.getMinutes() / 60;
const esManana   = horaNumNY >= 6  && horaNumNY < 9.5;   // 6-9:30 NY
const esRueda    = horaNumNY >= 9.5 && horaNumNY < 16;   // 9:30-16 NY
const esCierre   = !esManana && !esRueda;                 // resto

const EDICION       = esManana ? 'MAÑANA' : esRueda ? 'RUEDA' : 'CIERRE';
const EDICION_EMOJI = esManana ? '🌅' : esRueda ? '📈' : '🌆';

console.log(`📅 ${fechaLarga} · Edición ${EDICION} · AR ${hora} · NY ${horaNY}`);

// ── Prompt con web_search habilitado ──────────────────────
function buildPrompt() {

  const instrBase = `Sos un analista financiero senior especializado en mercados argentinos y globales.
Fecha: ${fechaLarga}. Hora Argentina: ${hora}. Hora Nueva York: ${horaNY}. Edición: ${EDICION}.

REGLAS CRÍTICAS — CUMPLIMIENTO OBLIGATORIO:
1. Usá la herramienta web_search para buscar datos REALES de hoy antes de escribir cualquier análisis.
2. Buscá: cierres de bolsas, precios WTI/Brent, noticias geopolíticas, datos macro publicados hoy.
3. Para Argentina buscá: dólar blue hoy, riesgo país hoy, Merval hoy, noticias locales.
4. NUNCA inventes precios. Si no encontrás un dato, decí "sin datos confirmados" en ese campo.
5. El dólar oficial en Argentina hoy está en torno a $1.060-$1.100 ARS (NO es $800 ni $900, eso era 2023).
6. Respondé SOLO con JSON válido al final, sin texto extra, sin markdown, sin backticks.
7. Los campos de análisis deben tener HTML con <strong> para destacar cifras y <em> para alertas.`;

  const camposComunes = `
  "driver_titulo": "título del tema central del día (máx 60 chars, basado en noticias reales de hoy)",
  "driver_emoji": "emoji relevante",
  "driver_alerta_tipo": "red|yellow|blue|green",
  "driver_alerta_titulo": "título concreto basado en lo que encontraste",
  "driver_alerta_texto": "texto HTML con datos reales — war, oil, stocks, Argentina",
  "driver_contexto": "párrafo HTML de contexto macro real del día, 3-4 oraciones con cifras",
  "stat1_label":"label","stat1_valor":"valor real","stat1_clase":"up|dn|warn|info","stat1_sub":"fuente o contexto",
  "stat2_label":"label","stat2_valor":"valor real","stat2_clase":"up|dn|warn|info","stat2_sub":"sub",
  "stat3_label":"label","stat3_valor":"valor real","stat3_clase":"up|dn|warn|info","stat3_sub":"sub",
  "stat4_label":"label","stat4_valor":"valor real","stat4_clase":"up|dn|warn|info","stat4_sub":"sub",
  "resumen_ejecutivo": "HTML resumen ejecutivo del día con datos reales",
  "badge_mercado": "estado real del mercado",
  "badge_clase": "badge-open|badge-warn",
  "riesgo_geopolitico": "BAJO|MODERADO|ALTO|MÁXIMO",
  "commodities_alerta": "HTML sobre petróleo y commodities — usá precios REALES de WTI/Brent encontrados, si no encontrás decí tendencia sin inventar número exacto",
  "commodities_tipo": "red|yellow|blue|green",
  "geo_eventos": [{"badge":"ZONA CALIENTE|ESCALADA|TENSIÓN|ACUERDO","badge_color":"#ff4060|#ff8c00|#ffaa00|#00d49a","badge_bg":"rgba(255,64,96,.15)","region":"región","headline":"titular real","body":"análisis 2-3 oraciones con datos reales","impacto":"impacto concreto en mercados"}],
  "calendario_eventos": [
    10 a 14 eventos REALES para los próximos 7 días hábiles.
    Mínimo 4 USA, 3 Argentina, 2 internacionales. Fechas y horas precisas.
    {"dia":"Hoy|Mañana|Lun DD|Mar DD|Mie DD|Jue DD|Vie DD","hora":"HH:MM NY","flag":"🇺🇸|🇦🇷|🇪🇺|🇨🇳|🇬🇧|🇯🇵|🇧🇷|🏢","evento":"nombre EN ESPAÑOL","impacto":"CRÍTICO|ALTO|MEDIO","impacto_color":"#ff4060|#ff8c00|#4a9eff","impacto_bg":"rgba(255,64,96,.12)|rgba(255,140,0,.12)|rgba(74,158,255,.12)","descripcion":"qué mide y por qué importa hoy","previo":"valor anterior real","consenso":"estimado consenso real"}
  ],
  "bonos_arg": [
    Incluí estos 8 bonos con precios y TIR ESTIMADOS basados en el riesgo país actual y la curva soberana argentina.
    Si el riesgo país está ~600 bps los GD30 rinden ~10-11%, GD35 ~11-12%, etc. Calculá coherentemente.
    {"ticker":"GD30","nombre":"Global 2030 Ley NY","precio_usd":68.5,"tir":10.8,"duracion":3.2,"ley":"NY"},
    {"ticker":"GD35","nombre":"Global 2035 Ley NY","precio_usd":65.0,"tir":11.5,"duracion":5.8,"ley":"NY"},
    {"ticker":"GD38","nombre":"Global 2038 Ley NY","precio_usd":62.0,"tir":12.0,"duracion":7.2,"ley":"NY"},
    {"ticker":"GD41","nombre":"Global 2041 Ley NY","precio_usd":60.0,"tir":12.2,"duracion":8.8,"ley":"NY"},
    {"ticker":"GD46","nombre":"Global 2046 Ley NY","precio_usd":58.0,"tir":12.5,"duracion":10.5,"ley":"NY"},
    {"ticker":"AL30","nombre":"Bonar 2030 Ley ARG","precio_usd":65.0,"tir":11.0,"duracion":3.1,"ley":"ARG"},
    {"ticker":"AL35","nombre":"Bonar 2035 Ley ARG","precio_usd":61.0,"tir":11.8,"duracion":5.6,"ley":"ARG"},
    {"ticker":"AL41","nombre":"Bonar 2041 Ley ARG","precio_usd":58.0,"tir":12.3,"duracion":8.5,"ley":"ARG"}
    — ajustá estos valores según el riesgo país que encontraste hoy con web_search
  ],
  "analisis_global": "HTML análisis mercado global REAL del día — qué pasó hoy en bolsas mundiales con cifras reales de lo que buscaste, contexto guerra/geopolítica, petróleo, macro USA. 5-6 oraciones sustanciales.",
  "analisis_argentina": "HTML análisis Argentina REAL — Merval, ADRs, dólar (recordá: oficial ~$1060-1100, NO $800), riesgo país, bonos. Cómo impacta el contexto global en Argentina hoy. 5-6 oraciones con datos reales.",
  "analisis_tecnico_sp": "HTML análisis técnico S&P 500 con niveles reales — soporte, resistencia, medias móviles, RSI estimado, outlook.",
  "analisis_latam": "HTML análisis Brasil y LatAm con datos reales de Bovespa, real brasileño, contexto regional.",
  "merval_usd": "estimado en USD CCL basado en datos reales",
  "riesgo_pais": "valor real encontrado con web_search",
  "reservas_bcra": "valor real en millones USD",
  "fear_greed_valor": 50,
  "fear_greed_label": "NEUTRAL|MIEDO|CODICIA|MIEDO EXTREMO|CODICIA EXTREMA",
  "fear_greed_color": "#ffaa00",
  "fear_greed_needle_pct": 50,
  "ganadores_dia": "sectores o acciones ganadoras del día con % reales si los encontraste",
  "perdedores_dia": "sectores o acciones perdedoras del día con % reales"`;

  if (esManana) {
    return `${instrBase}

Es la EDICIÓN MAÑANA (pre-apertura NYSE, ${horaNY} NY).

BUSCÁ CON WEB_SEARCH ANTES DE RESPONDER:
- "stock futures today premarket ${new Date().toDateString()}"
- "Nikkei Hang Seng close today"
- "oil price WTI Brent today"
- "geopolitical news today markets"
- "dolar blue argentina hoy" 
- "riesgo pais argentina hoy"

Luego generá el JSON:
{
  "edicion": "MAÑANA",
  "asia_resumen": "HTML con cierres reales de Asia de anoche: Nikkei con %, Hang Seng con %, Shanghai con %, ASX con %. Qué los movió.",
  "premarket_resumen": "HTML con estado real de futuros pre-market USA: S&P fut, Nasdaq fut, Dow fut con %. Qué implica para la apertura.",
  "overnight_geo": "HTML con noticias reales geopolíticas/bélicas overnight: guerra, tensiones, petróleo, macro.",
  "que_mirar_hoy": "HTML con 4-5 cosas concretas a monitorear hoy: datos que salen, niveles técnicos, eventos.",
  ${camposComunes}
}`;
  } else if (esRueda) {
    return `${instrBase}

Es la EDICIÓN RUEDA (mercados USA abiertos, ${horaNY} NY).

BUSCÁ CON WEB_SEARCH ANTES DE RESPONDER:
- "S&P 500 today live ${new Date().toDateString()}"
- "stock market today news"
- "oil WTI price today"
- "Argentina ADR today GGAL YPF"
- "dolar blue argentina hoy"
- "riesgo pais argentina hoy"

Luego generá el JSON:
{
  "edicion": "RUEDA",
  "rueda_resumen": "HTML con qué está pasando AHORA en Wall Street: S&P, Nasdaq, Dow con % actuales, sectores líderes y rezagados.",
  "datos_hoy": "HTML sobre datos macro que salieron hoy (jobs, inflation, etc.) y cómo reaccionó el mercado.",
  "argentina_rueda": "HTML sobre ADRs y Merval durante la rueda: GGAL, YPF, BMA, MELI con contexto. Dólar hoy.",
  "que_vigilar": "HTML con 4 niveles técnicos o eventos clave para el resto de la jornada.",
  ${camposComunes}
}`;
  } else {
    return `${instrBase}

Es la EDICIÓN CIERRE (post-cierre NYSE, ${horaNY} NY).

BUSCÁ CON WEB_SEARCH ANTES DE RESPONDER:
- "S&P 500 close today ${new Date().toDateString()}"
- "stock market close today winners losers"
- "oil WTI Brent close today"
- "Argentina merval cierre hoy"
- "dolar blue argentina hoy"
- "riesgo pais argentina hoy"
- "geopolitical news today"

Luego generá el JSON:
{
  "edicion": "CIERRE",
  "cierre_resumen": "HTML con cierre real de Wall Street: S&P %, Nasdaq %, Dow % con cifras reales. Qué los movió hoy.",
  "ganadores_detalle": "HTML con top 5 ganadores reales del día: empresa, sector, % de suba.",
  "perdedores_detalle": "HTML con top 5 perdedores reales del día: empresa, sector, % de baja.",
  "reaccion_datos": "HTML cómo reaccionó el mercado a datos económicos de hoy.",
  "argentina_cierre": "HTML resumen jornada argentina: MERVAL, ADRs, dólar (oficial ~$1060-1100), riesgo país.",
  "outlook_manana": "HTML outlook concreto para mañana: datos que salen, niveles técnicos a vigilar.",
  ${camposComunes}
}`;
  }
}

// ── Llamada a Claude con web_search ───────────────────────
async function getEditorialContent() {
  console.log(`🤖 Llamando a Claude con web_search (${EDICION})...`);
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    messages: [{ role: 'user', content: buildPrompt() }]
  });

  // Extraer el último bloque de texto (después de los tool_use)
  const textBlocks = response.content.filter(b => b.type === 'text');
  if (!textBlocks.length) throw new Error('No text block in response');
  const raw = textBlocks[textBlocks.length - 1].text.trim()
    .replace(/^```json\s*/,'').replace(/^```\s*/,'').replace(/\s*```$/,'').trim();

  try {
    return JSON.parse(raw);
  } catch(e) {
    // Intentar extraer JSON si hay texto antes/después
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('JSON parse failed: ' + e.message + '\n' + raw.slice(0,200));
  }
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

  // Tabla de bonos con TIR visual
  const bonosRows = (d.bonos_arg||[]).map(b => {
    const tirColor = b.tir < 10 ? '#00d49a' : b.tir < 12 ? '#ffaa00' : b.tir < 15 ? '#ff8c00' : '#ff4060';
    const tirBg    = b.tir < 10 ? 'rgba(0,212,154,.12)' : b.tir < 12 ? 'rgba(255,170,0,.12)' : 'rgba(255,64,96,.12)';
    const tirPct   = Math.min(100, Math.max(0, (b.tir - 5) / 15 * 100)); // escala 5-20%
    return `<tr>
      <td>
        <div class="name">${b.ticker}</div>
        <div class="sym">${b.nombre||''}</div>
      </td>
      <td>
        <span style="font-size:9px;padding:2px 7px;border-radius:3px;font-weight:700;
          background:${b.ley==='NY'?'rgba(74,158,255,.15)':'rgba(139,92,246,.15)'};
          color:${b.ley==='NY'?'#4a9eff':'#8b5cf6'}">${b.ley}</span>
      </td>
      <td class="price">$${typeof b.precio_usd==='number'?b.precio_usd.toFixed(2):b.precio_usd}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:13px;font-weight:700;color:${tirColor};min-width:40px">${typeof b.tir==='number'?b.tir.toFixed(1):b.tir}%</span>
          <div style="flex:1;height:6px;background:#0d1828;border-radius:3px;min-width:60px;max-width:100px;">
            <div style="width:${tirPct}%;height:100%;background:${tirColor};border-radius:3px;"></div>
          </div>
        </div>
      </td>
      <td style="font-size:11px;color:var(--dim)">${b.duracion} yr</td>
    </tr>`;
  }).join('');

  // Sección edición
  let seccionEdicion = '';
  let tabEdicionBtn  = '';
  if (esManana) {
    tabEdicionBtn = `<button class="tab-btn" onclick="showTab('edicion',this)">🌅 Pre-Market</button>`;
    seccionEdicion = `
  <div id="tab-edicion" class="tab-panel">
    <div class="edicion-header edicion-manana">🌅 EDICIÓN MAÑANA · ${hora} AR · ${horaNY} NY</div>
    <div class="sec-title">🌏 CIERRES DE ASIA — ANOCHE</div>
    <div class="context-box">${d.asia_resumen||'Sin datos'}</div>
    <div class="sec-title">🔮 PRE-MARKET USA — FUTUROS</div>
    <div class="context-box">${d.premarket_resumen||'Sin datos'}</div>
    <div class="sec-title">⚔️ GEOPOLÍTICA OVERNIGHT</div>
    <div class="context-box">${d.overnight_geo||'Sin datos'}</div>
    <div class="sec-title">👁️ QUÉ MIRAR HOY</div>
    <div class="alert alert-yellow">${d.que_mirar_hoy||'Sin datos'}</div>
  </div>`;
  } else if (esRueda) {
    tabEdicionBtn = `<button class="tab-btn" onclick="showTab('edicion',this)">📈 En Rueda</button>`;
    seccionEdicion = `
  <div id="tab-edicion" class="tab-panel">
    <div class="edicion-header edicion-rueda">📈 RUEDA EN CURSO · ${hora} AR · ${horaNY} NY</div>
    <div class="sec-title">📊 WALL STREET — AHORA</div>
    <div class="context-box">${d.rueda_resumen||'Sin datos'}</div>
    <div class="sec-title">📋 DATOS MACRO DEL DÍA</div>
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
    <div class="edicion-header edicion-cierre">🌆 EDICIÓN CIERRE · ${hora} AR · ${horaNY} NY</div>
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
    <div class="sec-title">🇦🇷 ARGENTINA — CIERRE</div>
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
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;700;800&display=swap" rel="stylesheet"/>
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
  .hero-strip{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:10px 0 6px;}
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
  .context-box{background:linear-gradient(135deg,#0d2030,#08101a);border:1px solid #1a3a5a;border-radius:10px;padding:18px;margin-bottom:16px;line-height:1.8;font-size:12px;color:#8ab0d0;}
  .context-box strong{color:var(--bright);}.context-box em{color:var(--warn);font-style:normal;}
  .stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;}
  .stat-card{background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:14px 12px;}
  .stat-label{font-size:9px;color:var(--dim);letter-spacing:1.5px;margin-bottom:5px;}
  .stat-val{font-family:'Syne',sans-serif;font-size:22px;font-weight:800;}
  .stat-sub{font-size:10px;color:var(--dim);margin-top:3px;}
  .mkt-table{width:100%;border-collapse:collapse;}
  .mkt-table th{font-size:9px;letter-spacing:2px;color:var(--dim);text-align:left;padding:6px 10px;border-bottom:1px solid var(--border);font-weight:400;}
  .mkt-table td{padding:9px 10px;font-size:12px;border-bottom:1px solid rgba(26,42,64,.5);vertical-align:middle;}
  .mkt-table tr:hover td{background:rgba(255,255,255,.02);}
  .sym{font-size:10px;color:var(--dim);}.name{color:var(--bright);font-weight:700;font-size:13px;}
  .price{font-size:14px;color:var(--bright);font-weight:700;font-variant-numeric:tabular-nums;}
  .fx-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
  .fx-card{background:var(--bg2);border-radius:8px;padding:12px;border-left:3px solid var(--info);display:flex;flex-direction:column;gap:3px;}
  .fx-name{font-size:11px;font-weight:700;color:var(--bright);}
  .fx-pair{font-size:9px;color:var(--dim);}
  .fx-price{font-size:16px;font-weight:700;color:var(--bright);font-variant-numeric:tabular-nums;}
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
  .edicion-header{font-size:11px;letter-spacing:1px;font-weight:700;padding:6px 16px;border-radius:20px;display:inline-flex;align-items:center;gap:6px;margin-bottom:16px;}
  .edicion-manana{background:rgba(0,212,154,.1);color:var(--up);border:1px solid rgba(0,212,154,.3);}
  .edicion-rueda{background:rgba(0,212,154,.15);color:var(--up);border:1px solid rgba(0,212,154,.4);}
  .edicion-cierre{background:rgba(74,158,255,.1);color:var(--info);border:1px solid rgba(74,158,255,.3);}
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
      <div class="market-badge ${d.badge_clase||'badge-warn'}">⚡ ${d.badge_mercado||'CARGANDO'}</div>
      <div class="edicion-header ${esManana?'edicion-manana':esRueda?'edicion-rueda':'edicion-cierre'}" style="margin-bottom:0;margin-top:4px;">${EDICION_EMOJI} ${EDICION}</div>
      <div style="font-size:11px;color:#4a9eff;margin-top:4px;">Riesgo geo: <strong style="color:${d.riesgo_geopolitico==='MÁXIMO'?'#ff4060':d.riesgo_geopolitico==='ALTO'?'#ff8c00':'#ffaa00'}">${d.riesgo_geopolitico||'—'}</strong></div>
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
    <div class="alert alert-${d.driver_alerta_tipo||'blue'}">
      <div class="alert-title">${d.driver_emoji||'📊'} ${d.driver_alerta_titulo||'Cargando...'}</div>
      ${d.driver_alerta_texto||''}
    </div>
    <div class="context-box">${d.driver_contexto||''}</div>
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-label">${d.stat1_label||'—'}</div><div class="stat-val ${d.stat1_clase||'info'}">${d.stat1_valor||'—'}</div><div class="stat-sub">${d.stat1_sub||''}</div></div>
      <div class="stat-card"><div class="stat-label">${d.stat2_label||'—'}</div><div class="stat-val ${d.stat2_clase||'info'}">${d.stat2_valor||'—'}</div><div class="stat-sub">${d.stat2_sub||''}</div></div>
      <div class="stat-card"><div class="stat-label">${d.stat3_label||'—'}</div><div class="stat-val ${d.stat3_clase||'info'}">${d.stat3_valor||'—'}</div><div class="stat-sub">${d.stat3_sub||''}</div></div>
      <div class="stat-card"><div class="stat-label">${d.stat4_label||'—'}</div><div class="stat-val ${d.stat4_clase||'info'}">${d.stat4_valor||'—'}</div><div class="stat-sub">${d.stat4_sub||''}</div></div>
    </div>
    <div class="alert alert-yellow">
      <div class="alert-title">📌 Resumen ejecutivo</div>
      ${d.resumen_ejecutivo||''}
    </div>
  </div>

  ${seccionEdicion}

  <!-- ══ USA ══ -->
  <div id="tab-usa" class="tab-panel">
    <div class="sec-title">ÍNDICES — TIEMPO REAL</div>
    <div id="tbl-usa-indices"></div>
    <div class="sec-title">FUTUROS</div>
    <div id="tbl-usa-futuros"></div>
    <div class="sec-title">BONOS TESORO USA</div>
    <div id="tbl-usa-bonos"></div>
    <div class="sec-title">SECTORES S&P 500</div>
    <div id="tbl-usa-sectores"></div>
    <div class="sec-title">🎖️ DEFENSA</div>
    <div id="tbl-usa-defensa"></div>
    <div class="sec-title">MEGA TECH</div>
    <div id="tbl-usa-tech"></div>
    <div class="sec-title">FEAR & GREED INDEX</div>
    <div style="border:1px solid var(--border);border-radius:8px;background:#0a1628;padding:16px;text-align:center;margin-bottom:12px;">
      <div style="font-size:11px;color:var(--dim);letter-spacing:2px;margin-bottom:8px;">CNN FEAR & GREED · HOY</div>
      <div style="background:linear-gradient(90deg,#00c853 0%,#ffeb3b 40%,#ff5722 75%,#b71c1c 100%);height:14px;border-radius:7px;position:relative;margin:0 auto 10px;max-width:300px;">
        <div style="position:absolute;left:${d.fear_greed_needle_pct||50}%;top:-6px;width:3px;height:26px;background:#fff;border-radius:2px;box-shadow:0 0 6px #fff;transform:translateX(-50%);"></div>
      </div>
      <div style="display:flex;justify-content:space-between;max-width:300px;margin:0 auto 14px;font-size:9px;color:var(--dim);">
        <span>MIEDO<br>EXTREMO</span><span>MIEDO</span><span>NEUTRAL</span><span>CODICIA</span><span>CODICIA<br>EXTREMA</span>
      </div>
      <div style="font-size:32px;font-weight:bold;color:${d.fear_greed_color||'#ffaa00'};">${d.fear_greed_valor||'—'}</div>
      <div style="font-size:13px;color:${d.fear_greed_color||'#ffaa00'};letter-spacing:3px;margin-top:4px;">${d.fear_greed_label||'NEUTRAL'}</div>
      <a href="https://edition.cnn.com/markets/fear-and-greed" target="_blank" style="display:inline-block;margin-top:10px;font-size:9px;color:var(--accent);letter-spacing:1px;text-decoration:none;border:1px solid var(--accent);padding:3px 10px;border-radius:3px;">VER EN CNN →</a>
    </div>
    <div class="sec-title">VOLATILIDAD — VIX & VVIX</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:9px;color:var(--dim);letter-spacing:2px;margin-bottom:6px;">VIX</div>
        <div id="vix-val" style="font-family:'Syne',sans-serif;font-size:28px;font-weight:800;color:var(--warn);">—</div>
        <div id="vix-chg" style="font-size:11px;margin-top:4px;">⏳</div>
        <div style="font-size:9px;color:var(--dim);margin-top:8px;line-height:1.6;">&lt;15 Calma · 15-20 Normal<br/>20-30 ⚠ Alerta · &gt;30 🚨 Pánico</div>
        <div id="vix-zona" style="font-size:10px;margin-top:6px;padding:3px 8px;border-radius:10px;display:inline-block;">—</div>
      </div>
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:9px;color:var(--dim);letter-spacing:2px;margin-bottom:6px;">VVIX — VIX DEL VIX</div>
        <div id="vvix-val" style="font-family:'Syne',sans-serif;font-size:28px;font-weight:800;color:var(--purple);">—</div>
        <div id="vvix-chg" style="font-size:11px;margin-top:4px;">⏳</div>
        <div style="font-size:9px;color:var(--dim);margin-top:8px;line-height:1.6;">Volatilidad del VIX.<br/>&gt;100 = pánico extremo</div>
        <div id="vvix-zona" style="font-size:10px;margin-top:6px;padding:3px 8px;border-radius:10px;display:inline-block;">—</div>
      </div>
    </div>
    <div class="alert alert-blue">
      <strong>🏆 Ganadores:</strong> ${d.ganadores_dia||'—'}<br/>
      <strong>📉 Perdedores:</strong> ${d.perdedores_dia||'—'}
    </div>
  </div>

  <!-- ══ ARGENTINA ══ -->
  <div id="tab-argentina" class="tab-panel">
    <div class="sec-title">TIPO DE CAMBIO — TIEMPO REAL</div>
    <div style="font-size:9px;color:var(--accent);letter-spacing:1px;margin-bottom:8px;">⚡ DOLARAPI.COM</div>
    <div class="fx-grid">
      <div class="fx-card" style="border-color:#4a9eff"><div class="fx-pair">OFICIAL BNA</div><div class="fx-name">Dólar Oficial</div><div class="fx-price" id="fx-oficial">⏳</div><div style="font-size:9px;color:var(--dim)" id="fx-oficial-comp">cargando...</div></div>
      <div class="fx-card" style="border-color:#ff8c00"><div class="fx-pair">INFORMAL</div><div class="fx-name">Dólar Blue</div><div class="fx-price" id="fx-blue">⏳</div><div style="font-size:9px;color:var(--dim)" id="fx-blue-comp">cargando...</div></div>
      <div class="fx-card" style="border-color:#00d49a"><div class="fx-pair">MEP / BOLSA</div><div class="fx-name">Dólar MEP</div><div class="fx-price" id="fx-mep">⏳</div><div style="font-size:9px;color:var(--dim)" id="fx-mep-comp">cargando...</div></div>
      <div class="fx-card" style="border-color:#8b5cf6"><div class="fx-pair">CONTADO C/LIQUI</div><div class="fx-name">Dólar CCL</div><div class="fx-price" id="fx-ccl">⏳</div><div style="font-size:9px;color:var(--dim)" id="fx-ccl-comp">cargando...</div></div>
      <div class="fx-card" style="border-color:#f0c040"><div class="fx-pair">USDT / CRIPTO</div><div class="fx-name">Dólar Cripto</div><div class="fx-price" id="fx-cripto">⏳</div><div style="font-size:9px;color:var(--dim)" id="fx-cripto-comp">cargando...</div></div>
      <div class="fx-card" style="border-color:#ff4060"><div class="fx-pair">OFICIAL+IMPUESTOS</div><div class="fx-name">Dólar Tarjeta</div><div class="fx-price" id="fx-tarjeta">⏳</div><div style="font-size:9px;color:var(--dim)" id="fx-tarjeta-comp">cargando...</div></div>
    </div>
    <div class="alert alert-blue" style="margin-top:14px;">
      <strong>📊 Brecha Blue/Oficial:</strong> <span id="fx-brecha">calculando...</span> &nbsp;·&nbsp; <strong>MERVAL USD:</strong> ~${d.merval_usd||'—'} pts
    </div>
    <div class="sec-title">MERVAL & MACRO</div>
    <table class="mkt-table">
      <thead><tr><th>ACTIVO</th><th>VALOR</th><th>VAR.</th><th></th></tr></thead>
      <tbody>
        <tr><td><div class="name">S&P MERVAL</div><div class="sym">BYMA · ARS</div></td><td class="price" id="merval-live">—</td><td id="merval-chg">⏳</td><td style="font-size:10px;color:#ff8060">~USD ${d.merval_usd||'—'}</td></tr>
        <tr><td><div class="name">Riesgo País</div><div class="sym">EMBI+ Argentina</div></td><td class="price warn">${d.riesgo_pais||'—'} bps</td><td>—</td><td><span style="font-size:9px;color:var(--dim)">EMBI+</span></td></tr>
        <tr><td><div class="name">Reservas BCRA</div><div class="sym">Brutas</div></td><td class="price">USD ${d.reservas_bcra||'—'}M</td><td>—</td><td></td></tr>
      </tbody>
    </table>
    <div class="sec-title">ADRs ARGENTINOS — TIEMPO REAL</div>
    <div id="tbl-adrs"><div class="live-loading">⏳ Cargando ADRs...</div></div>

    <div class="sec-title">BONOS SOBERANOS — PRECIO & TIR</div>
    <div style="font-size:9px;color:var(--dim);letter-spacing:1px;margin-bottom:10px;">
      TIR estimada según riesgo país actual · <a href="https://www.rava.com/cotizaciones/bonos" target="_blank" style="color:var(--accent)">Rava.com</a> · <a href="https://bondterminal.com" target="_blank" style="color:var(--accent)">BondTerminal</a>
    </div>
    <table class="mkt-table">
      <thead>
        <tr>
          <th>BONO</th>
          <th>LEY</th>
          <th>PRECIO USD</th>
          <th>TIR ANUAL</th>
          <th>DUR.</th>
        </tr>
      </thead>
      <tbody>${bonosRows}</tbody>
    </table>
    <div style="font-size:9px;color:var(--dim);margin-top:8px;line-height:1.6;">
      📌 TIR = Tasa Interna de Retorno anual en USD · Estimada en base a riesgo país y curva soberana · No constituye asesoramiento de inversión
    </div>

    <div class="sec-title">CRIPTO</div>
    <div id="tbl-cripto"><div class="live-loading">⏳ Cargando...</div></div>
  </div>

  <!-- ══ MONEDAS ══ -->
  <div id="tab-monedas" class="tab-panel">
    <div class="alert alert-blue" style="margin-bottom:16px;">
      <div class="alert-title">💱 Divisas vs. USD — Tiempo Real</div>
      Valor mayor = moneda más débil. Ideal para monitorear devaluaciones regionales.
    </div>
    <div class="sec-title">🌎 LATINOAMÉRICA</div>
    <div id="tbl-monedas-latam"><div class="live-loading">⏳ Cargando...</div></div>
    <div class="sec-title">🌍 G10 — PRINCIPALES</div>
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
    <div class="alert alert-${d.commodities_tipo||'blue'}" style="margin-bottom:12px;">
      <div class="alert-title">⚡ Commodities · ${fechaLarga}</div>
      ${d.commodities_alerta||''}
    </div>
    <div class="sec-title">ENERGÍA & METALES — TIEMPO REAL</div>
    <div id="tbl-commodities"><div class="live-loading">⏳ Cargando...</div></div>
    <div class="sec-title">AGRÍCOLAS CBOT 🇦🇷</div>
    <div id="tbl-agricolas"><div class="live-loading">⏳ Cargando...</div></div>
  </div>

  <!-- ══ GEOPOLÍTICA ══ -->
  <div id="tab-geo" class="tab-panel">
    <div class="alert alert-red" style="margin-bottom:16px;">⚠ EVENTOS DE RIESGO — Clic en cada card para ver análisis</div>
    ${geoCards}
  </div>

  <!-- ══ CALENDARIO ══ -->
  <div id="tab-calendario" class="tab-panel">
    <div class="sec-title">AGENDA ECONÓMICA — PRÓXIMOS 7 DÍAS</div>
    <div style="font-size:9px;color:var(--dim);margin-bottom:16px;letter-spacing:1px;">🇺🇸 EE.UU. · 🇦🇷 Argentina · 🌍 Internacional · 🏢 Corporativos</div>
    ${calItems}
  </div>

  <!-- ══ ANÁLISIS ══ -->
  <div id="tab-analisis" class="tab-panel">
    <div class="sec-title">ANÁLISIS — ${fechaLarga.toUpperCase()}</div>
    <div class="comment-card" style="border-color:#ff4060">
      <div class="comment-header">
        <div class="comment-icon">🌍</div>
        <div>
          <div class="comment-author" style="color:#ff8080">Mercados Globales</div>
          <div class="comment-time">${EDICION_EMOJI} Edición ${EDICION} · ${hora} AR</div>
        </div>
      </div>
      <div class="comment-body">${d.analisis_global||'—'}</div>
    </div>
    <div class="comment-card" style="border-color:#00d49a">
      <div class="comment-header">
        <div class="comment-icon">🇦🇷</div>
        <div>
          <div class="comment-author" style="color:#00d49a">Argentina</div>
          <div class="comment-time">BYMA · Dólar · Macro local</div>
        </div>
      </div>
      <div class="comment-body">${d.analisis_argentina||'—'}</div>
    </div>
    <div class="comment-card" style="border-color:#ffaa00">
      <div class="comment-header">
        <div class="comment-icon">📊</div>
        <div>
          <div class="comment-author" style="color:#ffaa00">Técnico S&P 500</div>
          <div class="comment-time">Soportes · Resistencias · Tendencia</div>
        </div>
      </div>
      <div class="comment-body">${d.analisis_tecnico_sp||'—'}</div>
    </div>
    <div class="comment-card" style="border-color:#4a9eff">
      <div class="comment-header">
        <div class="comment-icon">🇧🇷</div>
        <div>
          <div class="comment-author" style="color:#4a9eff">Brasil & LatAm</div>
          <div class="comment-time">Bovespa · BRL · Contexto regional</div>
        </div>
      </div>
      <div class="comment-body">${d.analisis_latam||'—'}</div>
    </div>
    <div style="margin-top:16px;padding:14px;border-radius:8px;background:rgba(26,42,64,.4);border:1px solid var(--border);font-size:10px;color:var(--dim);line-height:1.7;text-align:center;">
      ⚡ Editorial: Claude AI + Web Search · Precios: Yahoo Finance · DolarAPI · CoinGecko<br/>
      ${EDICION_EMOJI} Edición ${EDICION} · ${fechaLarga} · ${hora} hs AR
    </div>
  </div>

</div>

<div class="footer">MARKET TERMINAL · ${EDICION_EMOJI} ${EDICION} · ${fechaLarga.toUpperCase()}</div>

<script>
// ── Yahoo Finance + CoinGecko — tiempo real ────────────────
const YF='https://query1.finance.yahoo.com/v8/finance/chart/';
const PROXIES=[
  u=>\`https://corsproxy.io/?\${encodeURIComponent(u)}\`,
  u=>\`https://api.allorigins.win/raw?url=\${encodeURIComponent(u)}\`
];
async function fetchPrice(ticker){
  if(ticker.startsWith('CG:'))return fetchCG(ticker.slice(3));
  const url=YF+encodeURIComponent(ticker)+'?interval=1d&range=2d';
  for(const proxy of PROXIES){
    try{
      const r=await fetch(proxy(url),{signal:AbortSignal.timeout(8000)});
      if(!r.ok)continue;
      const data=await r.json();
      const m=data?.chart?.result?.[0]?.meta;
      if(!m)continue;
      const prev=m.chartPreviousClose||m.previousClose||m.regularMarketPrice;
      return{price:m.regularMarketPrice,chg:prev?(m.regularMarketPrice-prev)/prev*100:0,mktState:m.marketState,currency:m.currency};
    }catch(e){continue;}
  }
  return null;
}
async function fetchCG(id){
  try{
    const r=await fetch(\`https://api.coingecko.com/api/v3/simple/price?ids=\${id}&vs_currencies=usd&include_24hr_change=true\`,{signal:AbortSignal.timeout(8000)});
    const d=await r.json();
    if(!d[id])return null;
    return{price:d[id].usd,chg:d[id].usd_24h_change||0,mktState:'REGULAR',currency:'USD'};
  }catch(e){return null;}
}
function fmt(n,cur='USD'){
  if(n==null||isNaN(n))return'—';
  if(cur==='ARS')return n.toLocaleString('es-AR',{maximumFractionDigits:0});
  if(n>=100000)return n.toLocaleString('en-US',{maximumFractionDigits:0});
  if(n>=10)return n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  return n.toLocaleString('en-US',{minimumFractionDigits:4,maximumFractionDigits:4});
}
function chgHtml(chg){
  if(chg==null||isNaN(chg))return'<span style="color:var(--dim)">—</span>';
  const cls=chg>0.05?'lv-up':chg<-0.05?'lv-dn':'lv-flat';
  const arrow=chg>0.05?'▲':chg<-0.05?'▼':'=';
  return\`<span class="\${cls}">\${arrow} \${Math.abs(chg).toFixed(2)}%</span>\`;
}
function buildTable(rows){
  const body=rows.map(r=>{
    const p=r.data;
    if(!p||p.price==null)return\`<tr><td colspan="4"><span class="lv-name">\${r.label}</span> <span class="lv-err">⚠ Sin datos</span></td></tr>\`;
    const badge=p.mktState==='REGULAR'?'<span class="live-badge badge-live">● LIVE</span>':'<span class="live-badge badge-closed">Cierre</span>';
    const sym=r.ticker.startsWith('CG:')?r.ticker.slice(3):r.ticker;
    const prefix=(r.ticker==='^VIX'||r.ticker==='^VVIX'||r.ticker==='^TNX'||r.ticker==='^TYX'||r.ticker==='^IRX')?'':'\$';
    return\`<tr>
      <td><div class="lv-name">\${r.label}\${badge}</div><div class="lv-sym">\${r.sector||''}</div></td>
      <td class="lv-sym">\${sym}</td>
      <td class="lv-price">\${prefix}\${fmt(p.price,p.currency)}</td>
      <td>\${chgHtml(p.chg)}</td>
    </tr>\`;
  }).join('');
  return\`<table class="live-tbl"><thead><tr><th>ACTIVO</th><th>SÍMBOLO</th><th>PRECIO</th><th>VAR. DÍA</th></tr></thead><tbody>\${body}</tbody></table>\`;
}
async function loadGroup(divId,items){
  const el=document.getElementById(divId);
  if(!el)return;
  el.innerHTML='<div class="live-loading">⏳ Cargando...</div>';
  const results=await Promise.all(items.map(async i=>({...i,data:await fetchPrice(i.ticker)})));
  el.innerHTML=buildTable(results);
}

// Hero strip + VIX cards
async function updateHero(){
  const heroes=[
    {id:'hs-sp500',idc:'hs-sp500c',t:'^GSPC'},
    {id:'hs-nq',idc:'hs-nqc',t:'^NDX'},
    {id:'hs-vix',idc:'hs-vixc',t:'^VIX'},
    {id:'hs-merv',idc:'hs-mervc',t:'^MERV'},
    {id:'hs-wti',idc:'hs-wtic',t:'CL=F'},
    {id:'hs-gold',idc:'hs-goldc',t:'GC=F'},
    {id:'hs-btc',idc:'hs-btcc',t:'CG:bitcoin'}
  ];
  await Promise.all(heroes.map(async h=>{
    const p=await fetchPrice(h.t);
    if(!p)return;
    const el=document.getElementById(h.id);
    const elc=document.getElementById(h.idc);
    const noPrefix=(h.t==='^VIX');
    if(el)el.textContent=(noPrefix?'':'\$')+fmt(p.price);
    if(elc)elc.innerHTML=chgHtml(p.chg);
  }));
  // Merval
  const merv=await fetchPrice('^MERV');
  if(merv){
    const el=document.getElementById('merval-live');
    const elc=document.getElementById('merval-chg');
    if(el)el.textContent=fmt(merv.price,'ARS');
    if(elc)elc.innerHTML=chgHtml(merv.chg);
  }
  // VIX card
  const vix=await fetchPrice('^VIX');
  if(vix){
    const vv=document.getElementById('vix-val');
    const vc=document.getElementById('vix-chg');
    const vz=document.getElementById('vix-zona');
    if(vv){vv.textContent=fmt(vix.price);vv.style.color=vix.price>30?'#ff4060':vix.price>20?'#ffaa00':'#00d49a';}
    if(vc)vc.innerHTML=chgHtml(vix.chg);
    if(vz){
      const[txt,bg,clr]=vix.price>30?['🚨 PÁNICO','rgba(255,64,96,.2)','#ff4060']:vix.price>20?['⚠️ ALERTA','rgba(255,170,0,.2)','#ffaa00']:vix.price>15?['😐 NORMAL','rgba(74,158,255,.2)','#4a9eff']:['😌 CALMA','rgba(0,212,154,.2)','#00d49a'];
      vz.textContent=txt;vz.style.background=bg;vz.style.color=clr;
    }
  }
  // VVIX card
  const vvix=await fetchPrice('^VVIX');
  if(vvix){
    const vv=document.getElementById('vvix-val');
    const vc=document.getElementById('vvix-chg');
    const vz=document.getElementById('vvix-zona');
    if(vv){vv.textContent=fmt(vvix.price);vv.style.color=vvix.price>120?'#ff4060':vvix.price>100?'#ffaa00':'#8b5cf6';}
    if(vc)vc.innerHTML=chgHtml(vvix.chg);
    if(vz){
      const[txt,bg,clr]=vvix.price>120?['🚨 EXTREMO','rgba(255,64,96,.2)','#ff4060']:vvix.price>100?['⚠️ ELEVADO','rgba(255,170,0,.2)','#ffaa00']:['✅ NORMAL','rgba(139,92,246,.2)','#8b5cf6'];
      vz.textContent=txt;vz.style.background=bg;vz.style.color=clr;
    }
  }
}

// Grupos de activos
const GROUPS={
  'tbl-usa-indices':[{label:'S&P 500',ticker:'^GSPC',sector:'Índice EEUU'},{label:'Nasdaq 100',ticker:'^NDX',sector:'Tech'},{label:'Dow Jones',ticker:'^DJI',sector:'Industrial'},{label:'Russell 2000',ticker:'^RUT',sector:'Small Caps'},{label:'VIX',ticker:'^VIX',sector:'Volatilidad 😱'},{label:'VVIX',ticker:'^VVIX',sector:'Vol. de vol.'}],
  'tbl-usa-futuros':[{label:'S&P Fut.',ticker:'ES=F',sector:'CME'},{label:'Nasdaq Fut.',ticker:'NQ=F',sector:'CME'},{label:'Dow Fut.',ticker:'YM=F',sector:'CME'},{label:'Russell Fut.',ticker:'RTY=F',sector:'CME'}],
  'tbl-usa-bonos':[{label:'T-Note 10Y',ticker:'^TNX',sector:'Tesoro USA'},{label:'T-Bond 30Y',ticker:'^TYX',sector:'Tesoro USA'},{label:'T-Bill 3M',ticker:'^IRX',sector:'Tesoro USA'},{label:'Dólar Index DXY',ticker:'DX-Y.NYB',sector:'USD Index'}],
  'tbl-usa-sectores':[{label:'🖥️ Tech',ticker:'XLK',sector:'ETF'},{label:'🛢️ Energía',ticker:'XLE',sector:'ETF'},{label:'🏦 Financiero',ticker:'XLF',sector:'ETF'},{label:'🏥 Salud',ticker:'XLV',sector:'ETF'},{label:'🏗️ Industrial',ticker:'XLI',sector:'ETF'},{label:'⚙️ Materiales',ticker:'XLB',sector:'ETF'},{label:'🛒 Básico',ticker:'XLP',sector:'ETF'},{label:'🛍️ Discrecional',ticker:'XLY',sector:'ETF'},{label:'📡 Comunicación',ticker:'XLC',sector:'ETF'},{label:'💡 Utilities',ticker:'XLU',sector:'ETF'}],
  'tbl-usa-defensa':[{label:'Lockheed Martin',ticker:'LMT',sector:'Defensa'},{label:'Northrop Grumman',ticker:'NOC',sector:'Defensa'},{label:'RTX Corp',ticker:'RTX',sector:'Defensa'},{label:'General Dynamics',ticker:'GD',sector:'Defensa'},{label:'AeroVironment',ticker:'AVAV',sector:'Drones'},{label:'Palantir',ticker:'PLTR',sector:'Inteligencia'}],
  'tbl-usa-tech':[{label:'Nvidia',ticker:'NVDA',sector:'Semis'},{label:'Apple',ticker:'AAPL',sector:'Tech'},{label:'Microsoft',ticker:'MSFT',sector:'Tech'},{label:'Alphabet',ticker:'GOOGL',sector:'Tech'},{label:'Meta',ticker:'META',sector:'Tech'},{label:'Amazon',ticker:'AMZN',sector:'Tech'},{label:'Tesla',ticker:'TSLA',sector:'EV'},{label:'ExxonMobil',ticker:'XOM',sector:'Energía'},{label:'Chevron',ticker:'CVX',sector:'Energía'}],
  'tbl-adrs':[{label:'Grupo Galicia',ticker:'GGAL',sector:'Banco·NASDAQ'},{label:'Banco Macro',ticker:'BMA',sector:'Banco·NYSE'},{label:'BBVA Argentina',ticker:'BBAR',sector:'Banco·NYSE'},{label:'Supervielle',ticker:'SUPV',sector:'Banco·NYSE'},{label:'YPF',ticker:'YPF',sector:'Energía·NYSE'},{label:'Vista Energy',ticker:'VIST',sector:'Vaca Muerta·NYSE'},{label:'Pampa Energía',ticker:'PAM',sector:'Energía·NYSE'},{label:'TGS',ticker:'TGS',sector:'Gas·NYSE'},{label:'Central Puerto',ticker:'CEPU',sector:'Energía·NYSE'},{label:'MercadoLibre',ticker:'MELI',sector:'Tech·NASDAQ'},{label:'Globant',ticker:'GLOB',sector:'Tech·NYSE'},{label:'Telecom',ticker:'TEO',sector:'Telecom·NYSE'},{label:'Edenor',ticker:'EDN',sector:'Utilities·NYSE'},{label:'Tenaris',ticker:'TS',sector:'Acero·NYSE'},{label:'IRSA',ticker:'IRS',sector:'Real Estate·NYSE'},{label:'Loma Negra',ticker:'LOMA',sector:'Cemento·NYSE'},{label:'Cresud',ticker:'CRESY',sector:'Agro·NASDAQ'}],
  'tbl-cripto':[{label:'Bitcoin',ticker:'CG:bitcoin',sector:'Cripto'},{label:'Ethereum',ticker:'CG:ethereum',sector:'Cripto'},{label:'Solana',ticker:'CG:solana',sector:'Cripto'},{label:'BNB',ticker:'CG:binancecoin',sector:'Cripto'},{label:'XRP',ticker:'CG:ripple',sector:'Cripto'}],
  'tbl-monedas-latam':[{label:'🇧🇷 Real Brasileño',ticker:'BRL=X',sector:'USD/BRL'},{label:'🇲🇽 Peso Mexicano',ticker:'MXN=X',sector:'USD/MXN'},{label:'🇨🇱 Peso Chileno',ticker:'CLP=X',sector:'USD/CLP'},{label:'🇨🇴 Peso Colombiano',ticker:'COP=X',sector:'USD/COP'},{label:'🇵🇪 Sol Peruano',ticker:'PEN=X',sector:'USD/PEN'},{label:'🇺🇾 Peso Uruguayo',ticker:'UYU=X',sector:'USD/UYU'}],
  'tbl-monedas-g10':[{label:'🇪🇺 Euro',ticker:'EURUSD=X',sector:'EUR/USD'},{label:'🇬🇧 Libra',ticker:'GBPUSD=X',sector:'GBP/USD'},{label:'🇯🇵 Yen',ticker:'JPY=X',sector:'USD/JPY'},{label:'🇨🇳 Yuan',ticker:'CNY=X',sector:'USD/CNY'},{label:'🇨🇭 Franco Suizo',ticker:'CHF=X',sector:'USD/CHF'},{label:'🇦🇺 AUD',ticker:'AUDUSD=X',sector:'AUD/USD'},{label:'🇨🇦 CAD',ticker:'CAD=X',sector:'USD/CAD'}],
  'tbl-mundo-indices':[{label:'Euro Stoxx 50',ticker:'^STOXX50E',sector:'🇪🇺'},{label:'DAX',ticker:'^GDAXI',sector:'🇩🇪'},{label:'FTSE 100',ticker:'^FTSE',sector:'🇬🇧'},{label:'CAC 40',ticker:'^FCHI',sector:'🇫🇷'},{label:'Nikkei 225',ticker:'^N225',sector:'🇯🇵'},{label:'Hang Seng',ticker:'^HSI',sector:'🇭🇰'},{label:'Shanghai',ticker:'000001.SS',sector:'🇨🇳'},{label:'Bovespa',ticker:'^BVSP',sector:'🇧🇷'},{label:'MERVAL',ticker:'^MERV',sector:'🇦🇷'}],
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
    if(!loaded.has(id)&&TAB_GROUPS[id]){
      loaded.add(id);
      TAB_GROUPS[id].forEach(g=>{if(GROUPS[g])loadGroup(g,GROUPS[g]);});
    }
  }catch(e){console.error('showTab:',e);}
}

// DolarAPI
async function fetchDolares(){
  try{
    const r=await fetch('https://dolarapi.com/v1/dolares',{signal:AbortSignal.timeout(8000)});
    const data=await r.json();
    const map={};
    data.forEach(d=>{map[d.casa.toLowerCase()]=d;});
    const setCard=(id,compId,casa)=>{
      const d=map[casa];if(!d)return;
      const el=document.getElementById(id);
      const elc=document.getElementById(compId);
      if(el)el.textContent='\$'+Math.round(d.venta).toLocaleString('es-AR');
      if(elc)elc.textContent='C: \$'+Math.round(d.compra).toLocaleString('es-AR')+' · V: \$'+Math.round(d.venta).toLocaleString('es-AR');
    };
    setCard('fx-oficial','fx-oficial-comp','oficial');
    setCard('fx-blue','fx-blue-comp','blue');
    setCard('fx-mep','fx-mep-comp','bolsa');
    setCard('fx-ccl','fx-ccl-comp','contadoconliqui');
    setCard('fx-cripto','fx-cripto-comp','cripto');
    setCard('fx-tarjeta','fx-tarjeta-comp','tarjeta');
    // Hero strip
    const blueEl=document.getElementById('hs-blue-val');
    const cclEl=document.getElementById('hs-ccl-val');
    if(map.blue&&blueEl)blueEl.textContent='\$'+Math.round(map.blue.venta).toLocaleString('es-AR');
    if(map.contadoconliqui&&cclEl)cclEl.textContent='\$'+Math.round(map.contadoconliqui.venta).toLocaleString('es-AR');
    // Brecha
    if(map.oficial&&map.blue){
      const brecha=((map.blue.venta-map.oficial.venta)/map.oficial.venta*100).toFixed(1);
      const el=document.getElementById('fx-brecha');
      if(el)el.innerHTML=\`<strong style="color:\${brecha>50?'#ff4060':brecha>20?'#ffaa00':'#00d49a'}">\${brecha>0?'+':''}\${brecha}%</strong>\`;
    }
  }catch(e){console.error('fetchDolares:',e);}
}

// Arranque
updateHero();
fetchDolares();
</script>
</body>
</html>`;
}

async function main(){
  try{
    const d = await getEditorialContent();
    const filename = \`informe-mercado-\${fechaCorta}.html\`;
    const html = generateHTML(d);
    writeFileSync(filename, html, 'utf8');
    console.log(\`✅ Generado: \${filename}\`);

    const target = filename;
    const idx = \`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Market Terminal</title>
<style>
body{margin:0;background:#05080f;font-family:system-ui,sans-serif;}
.box{position:fixed;inset:0;background:#05080f;display:flex;align-items:center;justify-content:center;}
.card{text-align:center;padding:40px;background:#0a1020;border:1px solid #1a2a40;border-radius:12px;max-width:320px;width:90%;}
.title{font-size:20px;font-weight:800;color:#e8f4ff;margin:8px 0 4px;}
.sub{font-size:10px;color:#4a6a8a;letter-spacing:2px;margin-bottom:20px;}
input{width:100%;background:#0d1117;border:1px solid #1a2a40;border-radius:6px;padding:12px;color:#e8f4ff;font-size:14px;outline:none;text-align:center;margin-bottom:8px;box-sizing:border-box;}
input:focus{border-color:#4a9eff;}
button{width:100%;background:linear-gradient(135deg,#8b5cf6,#4a9eff);border:none;border-radius:6px;padding:12px;color:#fff;font-size:13px;font-weight:700;cursor:pointer;}
.err{color:#ff4060;font-size:11px;height:16px;margin-bottom:8px;}
</style>
</head>
<body>
<div class="box"><div class="card">
<div style="font-size:28px">📊</div>
<div class="title">Market Terminal</div>
<div class="sub">ACCESO RESTRINGIDO</div>
<input id="pi" type="password" placeholder="Clave de acceso..." autofocus/>
<div class="err" id="pe"></div>
<button onclick="cp()">Ingresar →</button>
</div></div>
<script>
var P='290585',K='mkt_auth',T='\${target}';
if(sessionStorage.getItem(K)===P)window.location.replace(T);
document.getElementById('pi').addEventListener('keydown',function(e){if(e.key==='Enter')cp();});
function cp(){var v=document.getElementById('pi').value;if(v===P){sessionStorage.setItem(K,P);window.location.replace(T);}else{document.getElementById('pe').textContent='Clave incorrecta';document.getElementById('pi').value='';document.getElementById('pi').focus();}}
<\/script>
</body></html>\`;
    writeFileSync('index.html', idx, 'utf8');
    console.log(\`✅ index.html → \${filename}\`);
  }catch(e){
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

main();
