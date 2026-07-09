import { formatDuration } from "./leaderboard-report-parser.mjs";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatNumber(value, options = {}) {
  return Number(value).toLocaleString("pt-PT", {
    maximumFractionDigits: options.maximumFractionDigits ?? 1,
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
  });
}

function formatGeneratedAt(value) {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  }).format(new Date(value));
}

function getInitials(name) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function renderScoreBar(value, maxValue) {
  const width = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0;

  return `
    <div class="score-bar" aria-label="${escapeHtml(value)} pontos">
      <span style="width: ${width}%"></span>
    </div>
  `;
}

function renderPodium(leaderboard) {
  const podium = leaderboard.slice(0, 3);

  if (!podium.length) {
    return '<p class="muted">Sem dados suficientes para gerar pódio.</p>';
  }

  return `
    <div class="podium">
      ${podium
        .map(
          (entry, index) => `
            <article class="podium-card podium-${index + 1}">
              <span class="rank-label">${index + 1}.º lugar</span>
              <div class="avatar">${escapeHtml(getInitials(entry.staffMember))}</div>
              <h3>${escapeHtml(entry.staffMember)}</h3>
              <strong>${formatNumber(entry.total)} pts</strong>
              <p>${formatNumber(entry.averagePerDay)} pts/dia · ${entry.daysWorked} dias avaliados</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderLeaderboardTable(report) {
  const maxScore = Math.max(...report.leaderboard.map((entry) => entry.total), 1);

  return `
    <table>
      <thead>
        <tr>
          <th>Lugar</th>
          <th>Colaborador</th>
          <th>Pontos</th>
          <th>Média/dia</th>
          <th>Dias</th>
          <th>Horas extra</th>
          <th>Progresso</th>
        </tr>
      </thead>
      <tbody>
        ${report.leaderboard
          .map(
            (entry, index) => `
              <tr>
                <td class="rank">${index + 1}.º</td>
                <td><strong>${escapeHtml(entry.staffMember)}</strong></td>
                <td>${formatNumber(entry.total)}</td>
                <td>${formatNumber(entry.averagePerDay)}</td>
                <td>${entry.daysWorked}</td>
                <td>${escapeHtml(entry.overtimeLabel)}</td>
                <td>${renderScoreBar(entry.total, maxScore)}</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderCategoryCards(report) {
  return `
    <div class="category-grid">
      ${report.scoringRules.categories
        .map(
          (category) => `
            <article class="category-card">
              <span>${escapeHtml(category.label)}</span>
              <strong>Até ${category.maxDailyPoints} pts/dia</strong>
              <p>${escapeHtml(category.description)}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderSummaryCards(report) {
  const totalPoints = report.leaderboard.reduce((sum, entry) => sum + entry.total, 0);
  const totalOvertime = report.leaderboard.reduce((sum, entry) => sum + entry.overtimeMinutes, 0);

  return `
    <div class="kpi-grid">
      <article class="kpi-card">
        <span>Relatórios analisados</span>
        <strong>${report.weeklySignals.reportsScanned}</strong>
      </article>
      <article class="kpi-card">
        <span>Dias de alta pressão</span>
        <strong>${report.weeklySignals.highPressureDays}</strong>
      </article>
      <article class="kpi-card">
        <span>Dias sem ocorrências relevantes</span>
        <strong>${report.weeklySignals.noIncidentDays}</strong>
      </article>
      <article class="kpi-card">
        <span>Pontos distribuídos</span>
        <strong>${formatNumber(totalPoints)}</strong>
      </article>
      <article class="kpi-card">
        <span>Horas extra registadas</span>
        <strong>${escapeHtml(formatDuration(totalOvertime))}</strong>
      </article>
    </div>
  `;
}

function renderHighlights(report) {
  return `
    <div class="highlight-grid">
      ${report.leaderboard
        .map(
          (entry) => `
            <article class="highlight-card">
              <h3>${escapeHtml(entry.staffMember)}</h3>
              <p class="points">${formatNumber(entry.total)} pts · ${formatNumber(entry.averagePerDay)} pts/dia</p>
              <ul>
                ${entry.highlights
                  .slice(0, 3)
                  .map((highlight) => `<li>${escapeHtml(highlight)}</li>`)
                  .join("")}
              </ul>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderDailyBreakdown(report) {
  return report.dailyReports
    .map(
      (dailyReport) => `
        <section class="daily-card">
          <div>
            <h3>${escapeHtml(dailyReport.dateLabel)} · ${escapeHtml(dailyReport.dayLabel)}</h3>
            <p>${dailyReport.signals.highPressure ? "Dia de pressão elevada" : "Dia operacional estável"} · ${
              dailyReport.signals.noRelevantIncidents ? "sem ocorrências relevantes" : "com pontos de atenção"
            }</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Total</th>
                <th>Execução</th>
                <th>Qualidade</th>
                <th>Modelo</th>
                <th>Compromisso</th>
              </tr>
            </thead>
            <tbody>
              ${dailyReport.staffScores
                .map(
                  (score) => `
                    <tr>
                      <td><strong>${escapeHtml(score.staffMember)}</strong></td>
                      <td>${formatNumber(score.total)}</td>
                      <td>${formatNumber(score.categories.operationalExecution.points)}</td>
                      <td>${formatNumber(score.categories.serviceQuality.points)}</td>
                      <td>${formatNumber(score.categories.sectorModel.points)}</td>
                      <td>${formatNumber(score.categories.commitment.points)}</td>
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>
        </section>
      `
    )
    .join("");
}

function renderWeeklyNotes(report) {
  const notes = report.weeklySignals.topOperationalNotes.length
    ? report.weeklySignals.topOperationalNotes
    : ["Semana analisada com base nos relatórios operacionais diários existentes."];

  return `
    <ul class="notes-list">
      ${notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}
    </ul>
  `;
}

export function renderWeeklyLeaderboardHtml(report) {
  const leader = report.leaderboard[0];

  return `<!doctype html>
<html lang="pt-PT">
  <head>
    <meta charset="utf-8" />
    <title>Ranking semanal RIBBAI OPS</title>
    <style>
      @page {
        size: A4;
        margin: 16mm 14mm 18mm;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        background: #ffffff;
        color: #172033;
        font-family: Arial, sans-serif;
        font-size: 10px;
        line-height: 1.5;
      }

      .cover {
        min-height: 260mm;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        page-break-after: always;
      }

      .brand {
        color: #f97316;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.12em;
      }

      h1 {
        margin: 18mm 0 8mm;
        max-width: 150mm;
        font-size: 38px;
        line-height: 1.05;
      }

      h2 {
        margin: 0 0 12px;
        font-size: 18px;
        page-break-after: avoid;
      }

      h3 {
        margin: 0 0 4px;
        font-size: 12px;
      }

      p {
        margin: 0;
      }

      .subtitle {
        max-width: 132mm;
        color: #5d667a;
        font-size: 13px;
      }

      .meta-card,
      .section,
      .daily-card {
        border: 1px solid #d9dde7;
        border-radius: 16px;
        background: #ffffff;
      }

      .meta-card {
        width: 96mm;
        padding: 18px;
      }

      .meta-row {
        display: flex;
        justify-content: space-between;
        gap: 18px;
        padding: 8px 0;
        border-bottom: 1px solid #edf0f5;
      }

      .meta-row:last-child {
        border-bottom: 0;
      }

      .muted,
      .meta-row span,
      .kpi-card span,
      .category-card span,
      .rank-label {
        color: #5d667a;
      }

      .section {
        margin-bottom: 18px;
        padding: 18px;
        page-break-inside: avoid;
      }

      .section.page {
        page-break-before: always;
      }

      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 10px;
      }

      .kpi-card,
      .category-card,
      .highlight-card,
      .podium-card {
        border: 1px solid #d9dde7;
        border-radius: 14px;
        background: #f6f7fa;
        padding: 12px;
      }

      .kpi-card strong {
        display: block;
        margin-top: 6px;
        font-size: 20px;
      }

      .podium {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }

      .podium-card {
        min-height: 120px;
        background: #172033;
        color: #ffffff;
      }

      .podium-card p,
      .podium-card .rank-label {
        color: #d9dde7;
      }

      .podium-card strong {
        display: block;
        margin: 8px 0 4px;
        color: #f97316;
        font-size: 22px;
      }

      .avatar {
        width: 34px;
        height: 34px;
        margin: 12px 0;
        border-radius: 999px;
        background: #f97316;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th,
      td {
        padding: 8px 7px;
        border-bottom: 1px solid #e7eaf1;
        text-align: left;
        vertical-align: top;
      }

      th {
        background: #f6f7fa;
        color: #5d667a;
        font-size: 8.5px;
        font-weight: 700;
      }

      .rank {
        color: #f97316;
        font-weight: 700;
      }

      .score-bar {
        width: 100%;
        height: 8px;
        overflow: hidden;
        border-radius: 999px;
        background: #e7eaf1;
      }

      .score-bar span {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: #f97316;
      }

      .category-grid,
      .highlight-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }

      .category-card strong {
        display: block;
        margin: 5px 0;
        font-size: 15px;
      }

      .highlight-card {
        page-break-inside: avoid;
      }

      .points {
        margin-bottom: 8px;
        color: #9a3412;
        font-weight: 700;
      }

      ul {
        margin: 8px 0 0;
        padding-left: 16px;
      }

      li {
        margin-bottom: 5px;
      }

      .notes-list {
        columns: 2;
        column-gap: 22px;
      }

      .daily-card {
        margin-bottom: 14px;
        padding: 14px;
        page-break-inside: avoid;
      }

      .footer-note {
        color: #5d667a;
        font-size: 8.5px;
      }
    </style>
  </head>
  <body>
    <main>
      <section class="cover">
        <div>
          <div class="brand">RIBBAI OPS</div>
          <h1>${report.dailyReports.length >= 10 ? "Ranking mensal da equipa" : "Ranking semanal da equipa"}</h1>
          <p class="subtitle">
            Relatório de performance, adaptação ao modelo de setores e resumo operacional da semana.
          </p>
        </div>
        <div class="meta-card">
          <div class="meta-row"><span>Restaurante</span><strong>${escapeHtml(report.restaurant)}</strong></div>
          <div class="meta-row"><span>Período</span><strong>${escapeHtml(report.period.label)}</strong></div>
          <div class="meta-row"><span>Relatórios</span><strong>${report.weeklySignals.reportsScanned}</strong></div>
          <div class="meta-row"><span>Primeiro lugar</span><strong>${escapeHtml(leader?.staffMember ?? "N/D")}</strong></div>
          <div class="meta-row"><span>Gerado em</span><strong>${escapeHtml(formatGeneratedAt(report.generatedAt))}</strong></div>
        </div>
      </section>

      <section class="section">
        <h2>Resumo executivo</h2>
        ${renderSummaryCards(report)}
      </section>

      <section class="section">
        <h2>Pódio da semana</h2>
        ${renderPodium(report.leaderboard)}
      </section>

      <section class="section">
        <h2>Ranking geral</h2>
        ${renderLeaderboardTable(report)}
      </section>

      <section class="section page">
        <h2>Forma de avaliação</h2>
        <p class="muted">
          A pontuação combina desempenho operacional, qualidade, adaptação ao novo modelo e compromisso.
          Folgas ou dias não escalados não retiram pontos; por isso o relatório mostra também média por dia avaliado.
        </p>
        <br />
        ${renderCategoryCards(report)}
      </section>

      <section class="section">
        <h2>Resumo semanal operacional</h2>
        ${renderWeeklyNotes(report)}
      </section>

      <section class="section page">
        <h2>Destaques individuais</h2>
        ${renderHighlights(report)}
      </section>

      <section class="section page">
        <h2>Detalhe diário</h2>
        ${renderDailyBreakdown(report)}
      </section>

      <p class="footer-note">
        Documento gerado automaticamente a partir dos relatórios operacionais diários. Deve ser usado como apoio à conversa de equipa e pode ser ajustado pela gestão quando existir contexto operacional adicional.
      </p>
    </main>
  </body>
</html>`;
}
