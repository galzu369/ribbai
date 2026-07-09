export interface ExecutivePDFTheme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
    background: string;
    surface: string;
    text: {
      primary: string;
      secondary: string;
      muted: string;
    };
  };
  typography: {
    fontFamily: string;
    sizes: {
      h1: string;
      h2: string;
      h3: string;
      h4: string;
      body: string;
      small: string;
      caption: string;
    };
    weights: {
      light: number;
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  shadows: {
    card: string;
    elevated: string;
    dramatic: string;
  };
  borders: {
    radius: {
      sm: string;
      md: string;
      lg: string;
      xl: string;
    };
    width: {
      thin: string;
      medium: string;
      thick: string;
    };
  };
}

export class ExecutivePDFStyling {
  /**
   * Executive Blue Theme - Professional and trustworthy
   */
  static readonly EXECUTIVE_BLUE_THEME: ExecutivePDFTheme = {
    name: 'Executive Blue',
    colors: {
      primary: '#1e40af',
      secondary: '#64748b',
      accent: '#7c3aed',
      success: '#059669',
      warning: '#d97706',
      danger: '#dc2626',
      info: '#0891b2',
      background: '#f8fafc',
      surface: '#ffffff',
      text: {
        primary: '#0a1628',
        secondary: '#475569',
        muted: '#94a3b8'
      }
    },
    typography: {
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      sizes: {
        h1: '28px',
        h2: '22px',
        h3: '18px',
        h4: '16px',
        body: '11px',
        small: '9px',
        caption: '8px'
      },
      weights: {
        light: 300,
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700
      }
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '12px',
      lg: '16px',
      xl: '24px',
      xxl: '32px'
    },
    shadows: {
      card: '0 1px 3px rgba(0, 0, 0, 0.1)',
      elevated: '0 4px 6px rgba(0, 0, 0, 0.1)',
      dramatic: '0 10px 25px rgba(0, 0, 0, 0.15)'
    },
    borders: {
      radius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px'
      },
      width: {
        thin: '1px',
        medium: '2px',
        thick: '3px'
      }
    }
  };

  /**
   * Executive Dark Theme - Modern and sophisticated
   */
  static readonly EXECUTIVE_DARK_THEME: ExecutivePDFTheme = {
    ...this.EXECUTIVE_BLUE_THEME,
    name: 'Executive Dark',
    colors: {
      ...this.EXECUTIVE_BLUE_THEME.colors,
      primary: '#3b82f6',
      background: '#0f172a',
      surface: '#1e293b',
      text: {
        primary: '#f1f5f9',
        secondary: '#cbd5e1',
        muted: '#64748b'
      }
    }
  };

  /**
   * Generate complete CSS styling for executive PDFs
   */
  static generateExecutiveCSS(theme: ExecutivePDFTheme = this.EXECUTIVE_BLUE_THEME): string {
    return `
      /* Executive PDF Base Styles */
      @page {
        size: A4;
        margin: 8mm 6mm 10mm;
        background: ${theme.colors.background};
      }

      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      body {
        font-family: ${theme.typography.fontFamily};
        font-size: ${theme.typography.sizes.body};
        line-height: 1.5;
        color: ${theme.colors.text.primary};
        background: ${theme.colors.background};
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      /* Executive Typography */
      h1 {
        font-size: ${theme.typography.sizes.h1};
        font-weight: ${theme.typography.weights.bold};
        color: ${theme.colors.primary};
        line-height: 1.2;
        margin-bottom: ${theme.spacing.lg};
        letter-spacing: -0.02em;
      }

      h2 {
        font-size: ${theme.typography.sizes.h2};
        font-weight: ${theme.typography.weights.semibold};
        color: ${theme.colors.text.primary};
        line-height: 1.3;
        margin-bottom: ${theme.spacing.md};
        letter-spacing: -0.01em;
      }

      h3 {
        font-size: ${theme.typography.sizes.h3};
        font-weight: ${theme.typography.weights.semibold};
        color: ${theme.colors.text.primary};
        line-height: 1.4;
        margin-bottom: ${theme.spacing.sm};
      }

      h4 {
        font-size: ${theme.typography.sizes.h4};
        font-weight: ${theme.typography.weights.medium};
        color: ${theme.colors.text.secondary};
        line-height: 1.4;
        margin-bottom: ${theme.spacing.sm};
      }

      p {
        font-size: ${theme.typography.sizes.body};
        line-height: 1.6;
        color: ${theme.colors.text.secondary};
        margin-bottom: ${theme.spacing.sm};
      }

      /* Executive Layout Components */
      .executive-container {
        max-width: 100%;
        margin: 0 auto;
        background: ${theme.colors.surface};
        box-shadow: ${theme.shadows.elevated};
        border-radius: ${theme.borders.radius.lg};
        overflow: hidden;
      }

      .executive-header {
        background: linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.accent} 100%);
        color: ${theme.colors.surface};
        padding: ${theme.spacing.xxl};
        position: relative;
        overflow: hidden;
      }

      .executive-header::before {
        content: '';
        position: absolute;
        top: -50px;
        right: -50px;
        width: 200px;
        height: 200px;
        background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
        border-radius: 50%;
      }

      .header-content {
        position: relative;
        z-index: 1;
      }

      .header-title {
        font-size: ${theme.typography.sizes.h1};
        font-weight: ${theme.typography.weights.bold};
        margin-bottom: ${theme.spacing.sm};
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .header-subtitle {
        font-size: ${theme.typography.sizes.h4};
        font-weight: ${theme.typography.weights.normal};
        opacity: 0.9;
        margin-bottom: ${theme.spacing.md};
      }

      .header-meta {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: ${theme.spacing.lg};
        font-size: ${theme.typography.sizes.small};
        opacity: 0.8;
      }

      /* Executive Section Styling */
      .executive-section {
        padding: ${theme.spacing.xl};
        border-bottom: ${theme.borders.width.thin} solid rgba(${this.hexToRgb(theme.colors.text.muted)}, 0.2);
        position: relative;
      }

      .executive-section:last-child {
        border-bottom: none;
      }

      .section-header {
        display: flex;
        align-items: center;
        gap: ${theme.spacing.md};
        margin-bottom: ${theme.spacing.xl};
        padding-bottom: ${theme.spacing.md};
        border-bottom: ${theme.borders.width.medium} solid ${theme.colors.primary};
      }

      .section-number {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.accent} 100%);
        color: ${theme.colors.surface};
        border-radius: ${theme.borders.radius.md};
        font-weight: ${theme.typography.weights.bold};
        font-size: ${theme.typography.sizes.h4};
        box-shadow: ${theme.shadows.card};
      }

      .section-title h2 {
        margin: 0;
        font-size: ${theme.typography.sizes.h2};
        color: ${theme.colors.text.primary};
      }

      .section-subtitle {
        font-size: ${theme.typography.sizes.small};
        color: ${theme.colors.text.muted};
        margin-top: ${theme.spacing.xs};
      }

      /* Executive Card System */
      .executive-card {
        background: ${theme.colors.surface};
        border: ${theme.borders.width.thin} solid rgba(${this.hexToRgb(theme.colors.text.muted)}, 0.15);
        border-radius: ${theme.borders.radius.lg};
        padding: ${theme.spacing.lg};
        margin-bottom: ${theme.spacing.lg};
        position: relative;
        overflow: hidden;
        box-shadow: ${theme.shadows.card};
        transition: all 0.2s ease;
      }

      .executive-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 3px;
        background: var(--card-accent, ${theme.colors.primary});
      }

      .executive-card:hover {
        box-shadow: ${theme.shadows.elevated};
        transform: translateY(-1px);
      }

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: ${theme.spacing.md};
      }

      .card-title {
        font-size: ${theme.typography.sizes.h4};
        font-weight: ${theme.typography.weights.semibold};
        color: ${theme.colors.text.primary};
        margin: 0;
      }

      .card-subtitle {
        font-size: ${theme.typography.sizes.small};
        color: ${theme.colors.text.muted};
        margin-top: ${theme.spacing.xs};
      }

      .card-metric {
        font-size: ${theme.typography.sizes.h1};
        font-weight: ${theme.typography.weights.bold};
        color: ${theme.colors.primary};
        line-height: 1;
        margin: ${theme.spacing.md} 0;
      }

      .card-trend {
        display: inline-flex;
        align-items: center;
        gap: ${theme.spacing.xs};
        padding: ${theme.spacing.xs} ${theme.spacing.sm};
        border-radius: ${theme.borders.radius.xl};
        font-size: ${theme.typography.sizes.caption};
        font-weight: ${theme.typography.weights.semibold};
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      /* Status Indicators */
      .status-excellent {
        background: rgba(${this.hexToRgb(theme.colors.success)}, 0.1);
        color: ${theme.colors.success};
        border: ${theme.borders.width.thin} solid rgba(${this.hexToRgb(theme.colors.success)}, 0.2);
      }

      .status-good {
        background: rgba(${this.hexToRgb(theme.colors.info)}, 0.1);
        color: ${theme.colors.info};
        border: ${theme.borders.width.thin} solid rgba(${this.hexToRgb(theme.colors.info)}, 0.2);
      }

      .status-fair {
        background: rgba(${this.hexToRgb(theme.colors.warning)}, 0.1);
        color: ${theme.colors.warning};
        border: ${theme.borders.width.thin} solid rgba(${this.hexToRgb(theme.colors.warning)}, 0.2);
      }

      .status-poor {
        background: rgba(${this.hexToRgb(theme.colors.danger)}, 0.1);
        color: ${theme.colors.danger};
        border: ${theme.borders.width.thin} solid rgba(${this.hexToRgb(theme.colors.danger)}, 0.2);
      }

      .trend-up {
        background: rgba(${this.hexToRgb(theme.colors.success)}, 0.1);
        color: ${theme.colors.success};
      }

      .trend-down {
        background: rgba(${this.hexToRgb(theme.colors.danger)}, 0.1);
        color: ${theme.colors.danger};
      }

      .trend-stable {
        background: rgba(${this.hexToRgb(theme.colors.text.muted)}, 0.1);
        color: ${theme.colors.text.muted};
      }

      /* Executive Grid System */
      .executive-grid {
        display: grid;
        gap: ${theme.spacing.lg};
        margin: ${theme.spacing.lg} 0;
      }

      .grid-1 { grid-template-columns: 1fr; }
      .grid-2 { grid-template-columns: repeat(2, 1fr); }
      .grid-3 { grid-template-columns: repeat(3, 1fr); }
      .grid-4 { grid-template-columns: repeat(4, 1fr); }

      /* Executive Tables */
      .executive-table {
        width: 100%;
        border-collapse: collapse;
        margin: ${theme.spacing.lg} 0;
        font-size: ${theme.typography.sizes.small};
        background: ${theme.colors.surface};
        border-radius: ${theme.borders.radius.md};
        overflow: hidden;
        box-shadow: ${theme.shadows.card};
      }

      .executive-table th {
        background: linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.accent} 100%);
        color: ${theme.colors.surface};
        font-weight: ${theme.typography.weights.semibold};
        padding: ${theme.spacing.md} ${theme.spacing.sm};
        text-align: left;
        font-size: ${theme.typography.sizes.caption};
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .executive-table td {
        padding: ${theme.spacing.sm};
        border-bottom: ${theme.borders.width.thin} solid rgba(${this.hexToRgb(theme.colors.text.muted)}, 0.1);
      }

      .executive-table tr:last-child td {
        border-bottom: none;
      }

      .executive-table tr:hover {
        background: rgba(${this.hexToRgb(theme.colors.primary)}, 0.02);
      }

      /* SWOT Analysis Styling */
      .swot-matrix {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: ${theme.spacing.lg};
        margin: ${theme.spacing.xl} 0;
      }

      .swot-quadrant {
        padding: ${theme.spacing.lg};
        border-radius: ${theme.borders.radius.lg};
        min-height: 200px;
        position: relative;
        overflow: hidden;
      }

      .swot-strengths {
        background: linear-gradient(135deg, rgba(${this.hexToRgb(theme.colors.success)}, 0.1) 0%, rgba(${this.hexToRgb(theme.colors.success)}, 0.05) 100%);
        border-left: 4px solid ${theme.colors.success};
      }

      .swot-weaknesses {
        background: linear-gradient(135deg, rgba(${this.hexToRgb(theme.colors.danger)}, 0.1) 0%, rgba(${this.hexToRgb(theme.colors.danger)}, 0.05) 100%);
        border-left: 4px solid ${theme.colors.danger};
      }

      .swot-opportunities {
        background: linear-gradient(135deg, rgba(${this.hexToRgb(theme.colors.info)}, 0.1) 0%, rgba(${this.hexToRgb(theme.colors.info)}, 0.05) 100%);
        border-left: 4px solid ${theme.colors.info};
      }

      .swot-threats {
        background: linear-gradient(135deg, rgba(${this.hexToRgb(theme.colors.warning)}, 0.1) 0%, rgba(${this.hexToRgb(theme.colors.warning)}, 0.05) 100%);
        border-left: 4px solid ${theme.colors.warning};
      }

      /* KPI Dashboard Styling */
      .kpi-dashboard {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: ${theme.spacing.lg};
        margin: ${theme.spacing.xl} 0;
      }

      .kpi-card {
        background: ${theme.colors.surface};
        border: ${theme.borders.width.thin} solid rgba(${this.hexToRgb(theme.colors.text.muted)}, 0.15);
        border-radius: ${theme.borders.radius.lg};
        padding: ${theme.spacing.lg};
        text-align: center;
        position: relative;
        overflow: hidden;
        box-shadow: ${theme.shadows.card};
      }

      .kpi-value {
        font-size: 32px;
        font-weight: ${theme.typography.weights.bold};
        color: ${theme.colors.primary};
        line-height: 1;
        margin-bottom: ${theme.spacing.sm};
      }

      .kpi-label {
        font-size: ${theme.typography.sizes.small};
        color: ${theme.colors.text.muted};
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: ${theme.spacing.xs};
      }

      .kpi-change {
        font-size: ${theme.typography.sizes.caption};
        font-weight: ${theme.typography.weights.medium};
      }

      /* Progress Bars */
      .progress-bar {
        width: 100%;
        height: 8px;
        background: rgba(${this.hexToRgb(theme.colors.text.muted)}, 0.1);
        border-radius: ${theme.borders.radius.sm};
        overflow: hidden;
        margin: ${theme.spacing.sm} 0;
      }

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, ${theme.colors.primary} 0%, ${theme.colors.accent} 100%);
        border-radius: ${theme.borders.radius.sm};
        transition: width 0.3s ease;
      }

      /* Footer */
      .executive-footer {
        background: rgba(${this.hexToRgb(theme.colors.text.muted)}, 0.05);
        padding: ${theme.spacing.lg};
        border-top: ${theme.borders.width.thin} solid rgba(${this.hexToRgb(theme.colors.text.muted)}, 0.15);
        font-size: ${theme.typography.sizes.caption};
        color: ${theme.colors.text.muted};
        text-align: center;
      }

      /* Print Optimizations */
      @media print {
        body {
          background: white;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        .executive-container {
          box-shadow: none;
        }
        
        .executive-section {
          page-break-inside: avoid;
        }
        
        .executive-card {
          page-break-inside: avoid;
        }
        
        .swot-matrix {
          page-break-inside: avoid;
        }
        
        .executive-table {
          page-break-inside: avoid;
        }
      }

      /* Responsive Adjustments */
      @media (max-width: 768px) {
        .executive-grid {
          grid-template-columns: 1fr !important;
        }
        
        .swot-matrix {
          grid-template-columns: 1fr;
        }
        
        .kpi-dashboard {
          grid-template-columns: repeat(2, 1fr);
        }
      }
    `;
  }

  /**
   * Generate custom header for executive reports
   */
  static generateExecutiveHeader(
    title: string,
    subtitle: string,
    metadata: {
      period: string;
      generatedAt: Date;
      status: string;
    },
    theme: ExecutivePDFTheme = this.EXECUTIVE_BLUE_THEME
  ): string {
    return `
      <div class="executive-header">
        <div class="header-content">
          <div class="header-title">${title}</div>
          <div class="header-subtitle">${subtitle}</div>
          <div class="header-meta">
            <div>
              <strong>Período:</strong> ${metadata.period}
            </div>
            <div>
              <strong>Status:</strong> ${metadata.status}
            </div>
            <div>
              <strong>Gerado:</strong> ${metadata.generatedAt.toLocaleDateString('pt-PT')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate executive performance badge
   */
  static generatePerformanceBadge(score: number, label: string): string {
    const status = score >= 90 ? 'excellent' : score >= 75 ? 'good' : score >= 60 ? 'fair' : 'poor';
    
    return `
      <div class="executive-card kpi-card">
        <div class="kpi-value status-${status}">${score.toFixed(1)}</div>
        <div class="kpi-label">${label}</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${score}%;"></div>
        </div>
      </div>
    `;
  }

  /**
   * Convert hex to RGB values
   */
  private static hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '0, 0, 0';
    
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    
    return `${r}, ${g}, ${b}`;
  }
}