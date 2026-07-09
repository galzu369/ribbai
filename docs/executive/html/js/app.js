/**
 * RIBBAI 2.0 Executive Manual - Interactive Components
 * Premium Corporate JavaScript
 */

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeInteractiveElements();
    generateSVGDiagrams();
    animateOnScroll();
});

/**
 * Initialize interactive elements
 */
function initializeInteractiveElements() {
    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Animated counters for KPI cards
    animateCounters();

    // Interactive table enhancements
    enhanceTables();
}

/**
 * Animate counter numbers in KPI cards
 */
function animateCounters() {
    const counters = document.querySelectorAll('[data-counter]');
    
    const observerOptions = {
        threshold: 0.5,
        rootMargin: '0px 0px -50px 0px'
    };

    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const target = parseInt(counter.getAttribute('data-counter'));
                const duration = 2000; // 2 seconds
                const start = performance.now();

                const animate = (currentTime) => {
                    const elapsed = currentTime - start;
                    const progress = Math.min(elapsed / duration, 1);
                    const easeOutQuart = 1 - Math.pow(1 - progress, 4);
                    const current = Math.floor(target * easeOutQuart);

                    counter.textContent = formatNumber(current);

                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    } else {
                        counter.textContent = formatNumber(target);
                    }
                };

                requestAnimationFrame(animate);
                counterObserver.unobserve(counter);
            }
        });
    }, observerOptions);

    counters.forEach(counter => {
        counterObserver.observe(counter);
    });
}

/**
 * Format numbers with appropriate suffixes
 */
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
}

/**
 * Enhance tables with hover effects and sorting
 */
function enhanceTables() {
    const tables = document.querySelectorAll('table');
    
    tables.forEach(table => {
        // Add hover class to rows
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            row.addEventListener('mouseenter', function() {
                this.style.transform = 'scale(1.01)';
                this.style.transition = 'all 0.2s ease';
            });
            
            row.addEventListener('mouseleave', function() {
                this.style.transform = 'scale(1)';
            });
        });
    });
}

/**
 * Generate SVG diagrams and graphics
 */
function generateSVGDiagrams() {
    generateArchitectureDiagram();
    generateInventoryFlow();
    generateBusinessIntelligenceDiagram();
    generateRoadmapTimeline();
    generateProcessFlow();
    generateFinancialFlow();
    generateROICalculator();
    generateEnhancedRoadmap();
}

/**
 * Generate Architecture Diagram SVG
 */
function generateArchitectureDiagram() {
    const container = document.getElementById('architecture-diagram');
    if (!container) return;

    const svg = `
        <svg viewBox="0 0 800 600" class="architecture-svg">
            <defs>
                <linearGradient id="layerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#1e293b;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#0d9488;stop-opacity:1" />
                </linearGradient>
                <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="2" dy="4" stdDeviation="3" flood-opacity="0.1"/>
                </filter>
            </defs>
            
            <!-- Background -->
            <rect width="800" height="600" fill="#f8fafc"/>
            
            <!-- Presentation Layer -->
            <rect x="50" y="50" width="700" height="80" fill="url(#layerGradient)" rx="8" filter="url(#shadow)"/>
            <text x="400" y="85" text-anchor="middle" fill="white" font-size="18" font-weight="600">Presentation Layer (UI/UX)</text>
            <text x="400" y="105" text-anchor="middle" fill="#e2e8f0" font-size="12">Next.js App Router • React Components • Responsive Design</text>
            
            <!-- Controllers Layer -->
            <rect x="50" y="160" width="700" height="80" fill="url(#layerGradient)" rx="8" filter="url(#shadow)"/>
            <text x="400" y="195" text-anchor="middle" fill="white" font-size="18" font-weight="600">Controllers (Server Actions)</text>
            <text x="400" y="215" text-anchor="middle" fill="#e2e8f0" font-size="12">API Routes • Authentication • Request Validation</text>
            
            <!-- Services Layer -->
            <rect x="50" y="270" width="700" height="80" fill="url(#layerGradient)" rx="8" filter="url(#shadow)"/>
            <text x="400" y="305" text-anchor="middle" fill="white" font-size="18" font-weight="600">Business Services</text>
            <text x="400" y="325" text-anchor="middle" fill="#e2e8f0" font-size="12">CMP Calculations • Health Score • Analytics Engine • BI Logic</text>
            
            <!-- Data Layer -->
            <rect x="50" y="380" width="700" height="80" fill="url(#layerGradient)" rx="8" filter="url(#shadow)"/>
            <text x="400" y="415" text-anchor="middle" fill="white" font-size="18" font-weight="600">Data Access (Repositories)</text>
            <text x="400" y="435" text-anchor="middle" fill="#e2e8f0" font-size="12">Prisma ORM • PostgreSQL • Audit Logging</text>
            
            <!-- Database -->
            <rect x="50" y="490" width="700" height="80" fill="url(#layerGradient)" rx="8" filter="url(#shadow)"/>
            <text x="400" y="525" text-anchor="middle" fill="white" font-size="18" font-weight="600">Database Layer</text>
            <text x="400" y="545" text-anchor="middle" fill="#e2e8f0" font-size="12">Immutable Ledger • Transaction Log • Backup & Recovery</text>
            
            <!-- Arrows -->
            ${generateArrows()}
        </svg>
    `;
    
    container.innerHTML = svg;
}

/**
 * Generate arrows for architecture diagram
 */
function generateArrows() {
    const arrows = [];
    const positions = [130, 240, 350, 460];
    
    positions.forEach((y, index) => {
        if (index < positions.length - 1) {
            arrows.push(`
                <path d="M 390 ${y + 10} L 390 ${positions[index + 1] - 10}" 
                      stroke="#0d9488" stroke-width="3" fill="none" marker-end="url(#arrowhead)"/>
                <path d="M 410 ${positions[index + 1] - 10} L 410 ${y + 10}" 
                      stroke="#64748b" stroke-width="2" fill="none" stroke-dasharray="5,5" marker-end="url(#arrowhead-dashed)"/>
            `);
        }
    });
    
    return `
        <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#0d9488"/>
            </marker>
            <marker id="arrowhead-dashed" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#64748b"/>
            </marker>
        </defs>
        ${arrows.join('')}
    `;
}

/**
 * Generate Inventory Flow Diagram
 */
function generateInventoryFlow() {
    const container = document.getElementById('inventory-flow');
    if (!container) return;

    const svg = `
        <svg viewBox="0 0 900 400" class="flow-svg">
            <defs>
                <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#059669"/>
                    <stop offset="50%" style="stop-color:#0d9488"/>
                    <stop offset="100%" style="stop-color:#1e293b"/>
                </linearGradient>
            </defs>
            
            <!-- Background -->
            <rect width="900" height="400" fill="#f8fafc"/>
            
            <!-- Input Flow -->
            <rect x="50" y="150" width="120" height="60" fill="#059669" rx="8"/>
            <text x="110" y="175" text-anchor="middle" fill="white" font-size="12" font-weight="600">ENTRADA</text>
            <text x="110" y="190" text-anchor="middle" fill="white" font-size="10">Fornecedores</text>
            
            <!-- CMP Engine -->
            <rect x="250" y="100" width="140" height="100" fill="url(#flowGradient)" rx="8"/>
            <text x="320" y="130" text-anchor="middle" fill="white" font-size="14" font-weight="600">MOTOR CMP</text>
            <text x="320" y="150" text-anchor="middle" fill="white" font-size="10">Custo Médio</text>
            <text x="320" y="165" text-anchor="middle" fill="white" font-size="10">Ponderado</text>
            <text x="320" y="185" text-anchor="middle" fill="white" font-size="10">Real-time</text>
            
            <!-- Stock Valuation -->
            <rect x="470" y="80" width="120" height="60" fill="#0d9488" rx="8"/>
            <text x="530" y="105" text-anchor="middle" fill="white" font-size="12" font-weight="600">VALORAÇÃO</text>
            <text x="530" y="120" text-anchor="middle" fill="white" font-size="10">Stock Total</text>
            
            <!-- Analytics -->
            <rect x="470" y="180" width="120" height="60" fill="#1e293b" rx="8"/>
            <text x="530" y="205" text-anchor="middle" fill="white" font-size="12" font-weight="600">ANALYTICS</text>
            <text x="530" y="220" text-anchor="middle" fill="white" font-size="10">KPIs & Trends</text>
            
            <!-- Output Flow -->
            <rect x="680" y="150" width="120" height="60" fill="#dc2626" rx="8"/>
            <text x="740" y="175" text-anchor="middle" fill="white" font-size="12" font-weight="600">SAÍDA</text>
            <text x="740" y="190" text-anchor="middle" fill="white" font-size="10">Consumo/Quebra</text>
            
            <!-- Arrows -->
            <path d="M 170 180 L 240 180" stroke="#059669" stroke-width="3" fill="none" marker-end="url(#greenArrow)"/>
            <path d="M 390 130 L 460 110" stroke="#0d9488" stroke-width="3" fill="none" marker-end="url(#tealArrow)"/>
            <path d="M 390 170 L 460 190" stroke="#1e293b" stroke-width="3" fill="none" marker-end="url(#navyArrow)"/>
            <path d="M 320 200 L 320 250 L 740 250 L 740 210" stroke="#dc2626" stroke-width="3" fill="none" marker-end="url(#redArrow)"/>
            
            <defs>
                <marker id="greenArrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#059669"/>
                </marker>
                <marker id="tealArrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#0d9488"/>
                </marker>
                <marker id="navyArrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#1e293b"/>
                </marker>
                <marker id="redArrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#dc2626"/>
                </marker>
            </defs>
        </svg>
    `;
    
    container.innerHTML = svg;
}

/**
 * Generate Business Intelligence Diagram
 */
function generateBusinessIntelligenceDiagram() {
    const container = document.getElementById('bi-diagram');
    if (!container) return;

    const svg = `
        <svg viewBox="0 0 800 500" class="bi-svg">
            <defs>
                <radialGradient id="biGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" style="stop-color:#0d9488"/>
                    <stop offset="100%" style="stop-color:#1e293b"/>
                </radialGradient>
            </defs>
            
            <!-- Background -->
            <rect width="800" height="500" fill="#f8fafc"/>
            
            <!-- Central Hub - Health Score -->
            <circle cx="400" cy="250" r="80" fill="url(#biGradient)" filter="url(#shadow)"/>
            <text x="400" y="240" text-anchor="middle" fill="white" font-size="14" font-weight="600">HEALTH</text>
            <text x="400" y="255" text-anchor="middle" fill="white" font-size="14" font-weight="600">SCORE</text>
            <text x="400" y="275" text-anchor="middle" fill="#e2e8f0" font-size="24" font-weight="700" id="health-score-display">87%</text>
            
            <!-- Data Sources -->
            ${generateBINodes()}
            
            <!-- Connections -->
            ${generateBIConnections()}
        </svg>
    `;
    
    container.innerHTML = svg;
    animateHealthScore();
}

/**
 * Generate BI diagram nodes
 */
function generateBINodes() {
    const nodes = [
        { x: 200, y: 120, label: 'Inventário', color: '#059669' },
        { x: 600, y: 120, label: 'Financeiro', color: '#0d9488' },
        { x: 150, y: 300, label: 'Operacional', color: '#1e293b' },
        { x: 650, y: 300, label: 'RH/Escalas', color: '#64748b' },
        { x: 300, y: 380, label: 'Analytics', color: '#dc2626' },
        { x: 500, y: 380, label: 'Reporting', color: '#d97706' }
    ];
    
    return nodes.map(node => `
        <circle cx="${node.x}" cy="${node.y}" r="45" fill="${node.color}" opacity="0.9"/>
        <text x="${node.x}" y="${node.y + 5}" text-anchor="middle" fill="white" font-size="11" font-weight="600">${node.label}</text>
    `).join('');
}

/**
 * Generate BI connections
 */
function generateBIConnections() {
    const connections = [
        { from: [200, 120], to: [400, 250] },
        { from: [600, 120], to: [400, 250] },
        { from: [150, 300], to: [400, 250] },
        { from: [650, 300], to: [400, 250] },
        { from: [300, 380], to: [400, 250] },
        { from: [500, 380], to: [400, 250] }
    ];
    
    return connections.map(conn => `
        <path d="M ${conn.from[0]} ${conn.from[1]} L ${conn.to[0]} ${conn.to[1]}" 
              stroke="#0d9488" stroke-width="2" opacity="0.6" stroke-dasharray="5,5">
            <animate attributeName="stroke-dashoffset" values="0;-10" dur="2s" repeatCount="indefinite"/>
        </path>
    `).join('');
}

/**
 * Animate Health Score
 */
function animateHealthScore() {
    const display = document.getElementById('health-score-display');
    if (!display) return;
    
    let score = 0;
    const target = 87;
    const duration = 3000;
    const start = performance.now();
    
    const animate = (currentTime) => {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        score = Math.floor(target * easeOutCubic);
        
        display.textContent = score + '%';
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    };
    
    requestAnimationFrame(animate);
}

/**
 * Generate Roadmap Timeline
 */
function generateRoadmapTimeline() {
    const container = document.getElementById('roadmap-timeline');
    if (!container) return;

    const svg = `
        <svg viewBox="0 0 1000 300" class="roadmap-svg">
            <defs>
                <linearGradient id="timelineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#059669"/>
                    <stop offset="25%" style="stop-color:#0d9488"/>
                    <stop offset="50%" style="stop-color:#1e293b"/>
                    <stop offset="75%" style="stop-color:#64748b"/>
                    <stop offset="100%" style="stop-color:#dc2626"/>
                </linearGradient>
            </defs>
            
            <!-- Background -->
            <rect width="1000" height="300" fill="#f8fafc"/>
            
            <!-- Timeline Line -->
            <line x1="100" y1="150" x2="900" y2="150" stroke="url(#timelineGradient)" stroke-width="4"/>
            
            <!-- Phase Markers -->
            ${generateRoadmapPhases()}
        </svg>
    `;
    
    container.innerHTML = svg;
}

/**
 * Generate roadmap phases
 */
function generateRoadmapPhases() {
    const phases = [
        { x: 100, label: 'Fase 1', status: 'Concluída', color: '#059669' },
        { x: 260, label: 'Fase 2', status: 'Atual', color: '#d97706' },
        { x: 420, label: 'Fase 3', status: 'Próxima', color: '#64748b' },
        { x: 580, label: 'Fase 4', status: 'Planejada', color: '#64748b' },
        { x: 740, label: 'Fase 5', status: 'Futuro', color: '#64748b' }
    ];
    
    return phases.map((phase, index) => `
        <g>
            <circle cx="${phase.x}" cy="150" r="20" fill="${phase.color}" stroke="white" stroke-width="3"/>
            <text x="${phase.x}" y="125" text-anchor="middle" font-size="12" font-weight="600" fill="#1e293b">${phase.label}</text>
            <text x="${phase.x}" y="190" text-anchor="middle" font-size="10" fill="#64748b">${phase.status}</text>
            ${index === 1 ? `<circle cx="${phase.x}" cy="150" r="25" fill="none" stroke="${phase.color}" stroke-width="2" opacity="0.5">
                <animate attributeName="r" values="25;35;25" dur="2s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite"/>
            </circle>` : ''}
        </g>
    `).join('');
}

/**
 * Generate Process Flow
 */
function generateProcessFlow() {
    const container = document.getElementById('process-flow');
    if (!container) return;

    const svg = `
        <svg viewBox="0 0 800 400" class="process-svg">
            <!-- Process steps with connecting lines -->
            <rect x="50" y="150" width="100" height="60" fill="#0d9488" rx="8"/>
            <text x="100" y="175" text-anchor="middle" fill="white" font-size="11" font-weight="600">Dados</text>
            <text x="100" y="190" text-anchor="middle" fill="white" font-size="11" font-weight="600">Entrada</text>
            
            <rect x="200" y="150" width="100" height="60" fill="#1e293b" rx="8"/>
            <text x="250" y="175" text-anchor="middle" fill="white" font-size="11" font-weight="600">Validação</text>
            <text x="250" y="190" text-anchor="middle" fill="white" font-size="11" font-weight="600">Processamento</text>
            
            <rect x="350" y="150" width="100" height="60" fill="#059669" rx="8"/>
            <text x="400" y="175" text-anchor="middle" fill="white" font-size="11" font-weight="600">Auditoria</text>
            <text x="400" y="190" text-anchor="middle" fill="white" font-size="11" font-weight="600">Registo</text>
            
            <rect x="500" y="150" width="100" height="60" fill="#dc2626" rx="8"/>
            <text x="550" y="175" text-anchor="middle" fill="white" font-size="11" font-weight="600">Relatórios</text>
            <text x="550" y="190" text-anchor="middle" fill="white" font-size="11" font-weight="600">Automáticos</text>
            
            <!-- Arrows -->
            <path d="M 150 180 L 190 180" stroke="#64748b" stroke-width="3" fill="none" marker-end="url(#processArrow)"/>
            <path d="M 300 180 L 340 180" stroke="#64748b" stroke-width="3" fill="none" marker-end="url(#processArrow)"/>
            <path d="M 450 180 L 490 180" stroke="#64748b" stroke-width="3" fill="none" marker-end="url(#processArrow)"/>
            
            <defs>
                <marker id="processArrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#64748b"/>
                </marker>
            </defs>
        </svg>
    `;
    
    container.innerHTML = svg;
}

/**
 * Animate elements on scroll
 */
function animateOnScroll() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    // Observe all cards and diagrams
    const animatableElements = document.querySelectorAll('.card, .kpi-card, .timeline-item, [id$="-diagram"], [id$="-flow"]');
    animatableElements.forEach(el => {
        observer.observe(el);
    });
}

// CSS for animations (added dynamically)
const style = document.createElement('style');
style.textContent = `
    .card, .kpi-card, .timeline-item, [id$="-diagram"], [id$="-flow"] {
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.6s ease;
    }
    
    .animate-in {
        opacity: 1 !important;
        transform: translateY(0) !important;
    }
    
    .architecture-svg, .flow-svg, .bi-svg, .roadmap-svg, .process-svg {
        width: 100%;
        height: auto;
        border-radius: 12px;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        background: white;
        padding: 20px;
        margin: 20px 0;
    }
`;
document.head.appendChild(style);

/**
 * Generate Financial Flow Diagram - Complete financial workflow
 */
function generateFinancialFlow() {
    const container = document.getElementById('financial-flow');
    if (!container) return;

    const svg = `
        <svg viewBox="0 0 1200 400" class="financial-flow-svg">
            <defs>
                <linearGradient id="financialGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#10b981"/>
                    <stop offset="50%" style="stop-color:#059669"/>
                    <stop offset="100%" style="stop-color:#047857"/>
                </linearGradient>
            </defs>
            
            <!-- Background -->
            <rect width="1200" height="400" fill="#f8fafc"/>
            
            <!-- Title -->
            <text x="600" y="30" text-anchor="middle" fill="#1e293b" font-size="18" font-weight="800">FLUXO FINANCEIRO COMPLETO</text>
            <text x="600" y="50" text-anchor="middle" fill="#64748b" font-size="14">Do Evento Operacional ao Relatório Executivo</text>
            
            <!-- Flow Steps -->
            <rect x="50" y="80" width="150" height="60" fill="#3b82f6" rx="8"/>
            <text x="125" y="105" text-anchor="middle" fill="white" font-size="12" font-weight="600">Evento</text>
            <text x="125" y="120" text-anchor="middle" fill="white" font-size="12" font-weight="600">Operacional</text>
            
            <rect x="280" y="80" width="150" height="60" fill="#8b5cf6" rx="8"/>
            <text x="355" y="105" text-anchor="middle" fill="white" font-size="12" font-weight="600">Processamento</text>
            <text x="355" y="120" text-anchor="middle" fill="white" font-size="12" font-weight="600">Tempo Real</text>
            
            <rect x="510" y="80" width="150" height="60" fill="url(#financialGradient)" rx="8"/>
            <text x="585" y="105" text-anchor="middle" fill="white" font-size="12" font-weight="600">Tradução</text>
            <text x="585" y="120" text-anchor="middle" fill="white" font-size="12" font-weight="600">Financeira</text>
            
            <rect x="740" y="80" width="150" height="60" fill="#f59e0b" rx="8"/>
            <text x="815" y="105" text-anchor="middle" fill="white" font-size="12" font-weight="600">Business</text>
            <text x="815" y="120" text-anchor="middle" fill="white" font-size="12" font-weight="600">Intelligence</text>
            
            <rect x="970" y="80" width="150" height="60" fill="#dc2626" rx="8"/>
            <text x="1045" y="105" text-anchor="middle" fill="white" font-size="12" font-weight="600">Relatório</text>
            <text x="1045" y="120" text-anchor="middle" fill="white" font-size="12" font-weight="600">Executivo</text>
            
            <!-- Examples -->
            <text x="125" y="170" text-anchor="middle" fill="#1e40af" font-size="10">Ex: Quebra 2kg</text>
            <text x="355" y="170" text-anchor="middle" fill="#6b21a8" font-size="10">Motor CMP</text>
            <text x="585" y="170" text-anchor="middle" fill="#047857" font-size="10">-€4.73</text>
            <text x="815" y="170" text-anchor="middle" fill="#92400e" font-size="10">Alerta +10%</text>
            <text x="1045" y="170" text-anchor="middle" fill="#991b1b" font-size="10">2 segundos</text>
            
            <!-- Flow Arrows -->
            <path d="M 200 110 L 270 110" stroke="#64748b" stroke-width="3" fill="none" marker-end="url(#flowArrow)"/>
            <path d="M 430 110 L 500 110" stroke="#64748b" stroke-width="3" fill="none" marker-end="url(#flowArrow)"/>
            <path d="M 660 110 L 730 110" stroke="#64748b" stroke-width="3" fill="none" marker-end="url(#flowArrow)"/>
            <path d="M 890 110 L 960 110" stroke="#64748b" stroke-width="3" fill="none" marker-end="url(#flowArrow)"/>
            
            <defs>
                <marker id="flowArrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#64748b"/>
                </marker>
            </defs>
        </svg>
    `;
    
    container.innerHTML = svg;
}

/**
 * Generate ROI Calculator
 */
function generateROICalculator() {
    const container = document.getElementById('roi-calculator');
    if (!container) return;

    const svg = `
        <svg viewBox="0 0 800 400" class="roi-calculator-svg">
            <defs>
                <linearGradient id="roiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#10b981"/>
                    <stop offset="100%" style="stop-color:#047857"/>
                </linearGradient>
            </defs>
            
            <!-- Background -->
            <rect width="800" height="400" fill="#f8fafc"/>
            
            <!-- Title -->
            <text x="400" y="25" text-anchor="middle" fill="#1e293b" font-size="18" font-weight="800">ROI CALCULATOR - RIBBAI 2.0</text>
            
            <!-- Investment Box -->
            <rect x="50" y="50" width="180" height="80" fill="#ef4444" rx="8"/>
            <text x="140" y="70" text-anchor="middle" fill="white" font-size="14" font-weight="600">Investimento</text>
            <text x="140" y="90" text-anchor="middle" fill="white" font-size="20" font-weight="800">€45.000</text>
            <text x="140" y="110" text-anchor="middle" fill="white" font-size="10">Desenvolvimento + Setup</text>
            
            <!-- Savings Box -->
            <rect x="310" y="50" width="180" height="80" fill="url(#roiGradient)" rx="8"/>
            <text x="400" y="70" text-anchor="middle" fill="white" font-size="14" font-weight="600">Poupanças Mensais</text>
            <text x="400" y="90" text-anchor="middle" fill="white" font-size="20" font-weight="800">€3.247</text>
            <text x="400" y="110" text-anchor="middle" fill="white" font-size="10">Redução perdas + Eficiência</text>
            
            <!-- Payback Box -->
            <rect x="570" y="50" width="180" height="80" fill="#3b82f6" rx="8"/>
            <text x="660" y="70" text-anchor="middle" fill="white" font-size="14" font-weight="600">Payback</text>
            <text x="660" y="90" text-anchor="middle" fill="white" font-size="20" font-weight="800">13.8 meses</text>
            <text x="660" y="110" text-anchor="middle" fill="white" font-size="10">ROI 142% em 24m</text>
            
            <!-- ROI Chart -->
            <rect x="50" y="160" width="700" height="150" fill="white" rx="8" stroke="#e2e8f0"/>
            <text x="400" y="180" text-anchor="middle" fill="#1e293b" font-size="14" font-weight="600">Projeção ROI - 24 Meses</text>
            
            <!-- Break-even line -->
            <line x1="80" y1="235" x2="720" y2="235" stroke="#ef4444" stroke-width="2" stroke-dasharray="5,5"/>
            <text x="85" y="230" fill="#ef4444" font-size="10">Break-even</text>
            
            <!-- Break-even point -->
            <circle cx="395" cy="235" r="4" fill="#f59e0b"/>
            <text x="395" y="225" text-anchor="middle" fill="#f59e0b" font-size="9">Mês 14</text>
            
            <!-- ROI curve -->
            <polyline points="395,235 450,220 500,200 550,180 600,165 650,150 700,135" 
                      fill="none" stroke="#10b981" stroke-width="3"/>
            
            <!-- Final ROI point -->
            <circle cx="700" cy="135" r="6" fill="#10b981"/>
            <text x="700" y="125" text-anchor="middle" fill="#10b981" font-size="11" font-weight="600">142%</text>
            
            <!-- Benefits -->
            <text x="50" y="340" fill="#059669" font-size="11" font-weight="600">✓ Redução 65% perdas</text>
            <text x="200" y="340" fill="#059669" font-size="11" font-weight="600">✓ Automação 80%</text>
            <text x="350" y="340" fill="#059669" font-size="11" font-weight="600">✓ Tempo real</text>
            <text x="500" y="340" fill="#059669" font-size="11" font-weight="600">✓ Conformidade 98%</text>
        </svg>
    `;
    
    container.innerHTML = svg;
}

/**
 * Generate Enhanced Roadmap
 */
function generateEnhancedRoadmap() {
    const container = document.getElementById('enhanced-roadmap');
    if (!container) return;

    // Use existing roadmap functionality for now
    // Could be expanded with more detailed timeline in the future
}