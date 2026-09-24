
//desktopfrontend/src/pages/fdafolder/fda-dashboard.jsx
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from "../component/sidebar";
import TopBar from "../component/top-bar";
import { apiFetch } from '../../utils/apiFetch';
import './fda-css.css';
import {
    AlertTriangle,
    Footprints,
    Globe,
    CheckCircle,
    Package
} from 'lucide-react';
function FDADashboard() {
    const navigate = useNavigate();
    const [hoveredMonthIndex, setHoveredMonthIndex] = useState(null);
    const [hoveredTakedownIndex, setHoveredTakedownIndex] = useState(null);
    const [reports, setReports] = useState([]);
    const [awaitingVerificationCases, setAwaitingVerificationCases] = useState([]);
    const [completedUnregisteredProducts, setCompletedUnregisteredProducts] = useState([]);

    const [registeredCount, setRegisteredCount] = useState(0);
    const [unregisteredCount, setUnregisteredCount] = useState(0);
    const [convertedToRegCount, setConvertedToRegCount] = useState(0);
    const [convertedToUnregCount, setConvertedToUnregCount] = useState(0);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const regRes = await apiFetch('/registered-products/');
                if (regRes.ok) {
                    const regData = await regRes.json();
                    setRegisteredCount(regData.length);
                    const convertedReg = regData.filter(item => item.converted_from_advisory_id).length;
                    setConvertedToRegCount(convertedReg);
                }

                const unregRes = await apiFetch('/unregistered-advisories/');
                if (unregRes.ok) {
                    const unregData = await unregRes.json();
                    setUnregisteredCount(unregData.length);
                    const convertedUnreg = unregData.filter(item => item.converted_from_product_id).length;
                    setConvertedToUnregCount(convertedUnreg);
                }

                const repRes = await apiFetch('/complaints/fda-reports');
                if (repRes.ok) {
                    const repData = await repRes.json();
                    setReports(repData);
                }

                const awaitRes = await apiFetch('/verification-requests/awaiting-fda');
                if (awaitRes.ok) {
                    const awaitData = await awaitRes.json();
                    setAwaitingVerificationCases(awaitData.map(item => ({
                        id: item.request_id,
                        caseId: item.case_reference,
                        product: item.product_name,
                        manufacturer: item.manufacturer || '—',
                        status: "Pending Verification",
                        leaConfirmation: true
                    })));
                }

                const unregCompletedRes = await apiFetch('/verification-requests/completed?verification_result=unregistered&page=1&page_size=500');
                if (unregCompletedRes.ok) {
                    const unregCompletedData = await unregCompletedRes.json();
                    setCompletedUnregisteredProducts(unregCompletedData.items || []);
                }
            } catch (err) {
                console.error("Error fetching dashboard data:", err);
            }
        };
        fetchDashboardData();

        // Auto-fetch data every 3 seconds to keep dashboard updated in real-time
        const interval = setInterval(fetchDashboardData, 3000);
        return () => clearInterval(interval);
    }, []);

    const normalizedReports = useMemo(() => {
        return reports.map(r => {
            let sourceLabel = r.source;
            if (r.source === 'extension') sourceLabel = 'Browser Extension';
            if (r.source === 'walk_in') sourceLabel = 'Walk-in';

            let statusLabel = r.status;
            if (r.status === 'under_review') statusLabel = 'Under Review';
            else if (r.status === 'takedown_requested') statusLabel = 'Forwarded to LEA';
            else if (r.status === 'takedown_initiated') statusLabel = 'Operation in Progress';
            else if (r.status === 'completed') statusLabel = 'Takedown Completed';
            else if (r.status === 'dismissed') statusLabel = 'Case Closed';

            let dateStr = '—';
            if (r.created_at) {
                const d = new Date(r.created_at);
                const pad = (num) => String(num).padStart(2, '0');
                dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
            }

            return {
                id: r.complaint_id,
                caseId: r.case_reference,
                product: r.product_title,
                manufacturer: r.manufacturer || '—',
                category: r.product_category || '—',
                source: sourceLabel,
                status: statusLabel,
                dateReceived: dateStr,
                created_at: r.created_at
            };
        });
    }, [reports]);

    const reportStats = useMemo(() => {
        const total = normalizedReports.length;
        const browserExtension = normalizedReports.filter(r => r.source === 'Browser Extension').length;
        const walkIn = normalizedReports.filter(r => r.source === 'Walk-in').length;
        const takedownCompleted = normalizedReports.filter(r => r.status === 'Takedown Completed').length;

        return {
            browserExtension,
            walkIn,
            takedownsCompleted: takedownCompleted,
            total
        };
    }, [normalizedReports]);

    const unregisteredCategoryStats = useMemo(() => {
        const total = completedUnregisteredProducts.length;

        const categoryCounts = {
            "Cosmetics": 0,
            "Food": 0,
            "Drugs": 0,
            "Medical Devices": 0
        };

        completedUnregisteredProducts.forEach(item => {
            const cat = item.product_category;
            if (cat === "Cosmetics") {
                categoryCounts["Cosmetics"] += 1;
            } else if (cat === "Food" || cat === "Supplement") {
                categoryCounts["Food"] += 1;
            } else if (cat === "Pharmaceutical" || cat === "Drugs") {
                categoryCounts["Drugs"] += 1;
            } else if (cat === "Medical Device" || cat === "Med Device" || cat === "Devices" || cat === "Medical Devices") {
                categoryCounts["Medical Devices"] += 1;
            }
        });

        const categoryMix = [
            { label: 'Cosmetics', value: categoryCounts['Cosmetics'], color: '#2563eb' },
            { label: 'Food', value: categoryCounts['Food'], color: '#10b981' },
            { label: 'Drugs', value: categoryCounts['Drugs'], color: '#06b6d4' },
            { label: 'Medical Devices', value: categoryCounts['Medical Devices'], color: '#f59e0b' }
        ];

        return {
            total,
            categoryMix
        };
    }, [completedUnregisteredProducts]);

    const recentComplaints = useMemo(() => {
        return [...normalizedReports]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 6);
    }, [normalizedReports]);

    const trendData = useMemo(() => {
        const browserValues = Array(12).fill(0);
        const walkinValues = Array(12).fill(0);

        normalizedReports.forEach(report => {
            if (!report.created_at) return;
            const date = new Date(report.created_at);
            const monthIndex = date.getMonth();
            if (monthIndex >= 0 && monthIndex < 12) {
                if (report.source === 'Browser Extension') {
                    browserValues[monthIndex] += 1;
                } else if (report.source === 'Walk-in') {
                    walkinValues[monthIndex] += 1;
                }
            }
        });

        return {
            months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            browserValues,
            walkinValues
        };
    }, [normalizedReports]);

    const takedownData = useMemo(() => {
        const requested = Array(12).fill(0);
        const completed = Array(12).fill(0);

        normalizedReports.forEach(report => {
            if (!report.created_at) return;
            const date = new Date(report.created_at);
            const monthIndex = date.getMonth();
            if (monthIndex >= 0 && monthIndex < 12) {
                if (report.status === 'Forwarded to LEA' || report.status === 'Operation in Progress' || report.status === 'Takedown Completed') {
                    requested[monthIndex] += 1;
                }
                if (report.status === 'Takedown Completed') {
                    completed[monthIndex] += 1;
                }
            }
        });

        return {
            months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            requested,
            completed
        };
    }, [normalizedReports]);

    const maxVal = useMemo(() => {
        return Math.max(4, ...trendData.browserValues, ...trendData.walkinValues);
    }, [trendData]);

    const maxTakedownVal = useMemo(() => {
        return Math.max(10, ...takedownData.requested, ...takedownData.completed);
    }, [takedownData]);

    const getBarY = (val) => 195 - (val / maxTakedownVal) * 150;
    const getBarHeight = (val) => (val / maxTakedownVal) * 150;

    const categoryGradient = useMemo(() => {
        return unregisteredCategoryStats.categoryMix.reduce((acc, item) => {
            const previous = acc.ranges[acc.ranges.length - 1]?.end ?? 0;
            const size = unregisteredCategoryStats.total > 0 ? Math.round((item.value / unregisteredCategoryStats.total) * 100) : 0;
            const start = previous;
            const end = start + size;
            acc.ranges.push({ color: item.color, start, end });
            return acc;
        }, { ranges: [] }).ranges;
    }, [unregisteredCategoryStats]);

    const donutStyle = useMemo(() => ({
        background: unregisteredCategoryStats.total > 0 && categoryGradient.length > 0
            ? `conic-gradient(${categoryGradient.map(seg => `${seg.color} ${seg.start}% ${seg.end}%`).join(', ')})`
            : '#e2e8f0'
    }), [categoryGradient, unregisteredCategoryStats.total]);

    const chartConfig = useMemo(() => ({
        width: 640,
        height: 280,
        paddingX: 45,
        paddingY: 35,
        maxValue: maxVal
    }), [maxVal]);

    const xStep = (chartConfig.width - chartConfig.paddingX * 2) / (trendData.months.length - 1);

    const getPointY = (value) =>
        chartConfig.height - chartConfig.paddingY - (value / chartConfig.maxValue) * (chartConfig.height - chartConfig.paddingY * 2);

    const gridTicks = useMemo(() => {
        const step = maxVal / 4;
        return Array.from({ length: 5 }, (_, i) => Number((step * i).toFixed(1)));
    }, [maxVal]);

    const takedownTicks = useMemo(() => {
        const step = maxTakedownVal / 5;
        return Array.from({ length: 6 }, (_, i) => Number((step * i).toFixed(1)));
    }, [maxTakedownVal]);

    const buildPointData = (values) => values.map((value, index) => ({
        x: chartConfig.paddingX + index * xStep,
        y: getPointY(value),
        value
    }));

    // Smooth Bezier curve path generator
    const createSmoothPath = (pts) => {
        if (!pts.length) return '';
        let d = `M ${pts[0].x},${pts[0].y}`;
        for (let i = 0; i < pts.length - 1; i++) {
            const curr = pts[i];
            const next = pts[i + 1];
            const cp1x = curr.x + (next.x - curr.x) / 2.2;
            const cp1y = curr.y;
            const cp2x = curr.x + (next.x - curr.x) / 2.2;
            const cp2y = next.y;
            d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`;
        }
        return d;
    };

    const createAreaPath = (pts) => {
        const linePath = createSmoothPath(pts);
        if (!linePath) return '';
        const firstX = pts[0].x;
        const lastX = pts[pts.length - 1].x;
        const baselineY = chartConfig.height - chartConfig.paddingY;
        return `${linePath} L ${lastX},${baselineY} L ${firstX},${baselineY} Z`;
    };

    const browserPoints = buildPointData(trendData.browserValues);
    const walkinPoints = buildPointData(trendData.walkinValues);
    const browserArea = createAreaPath(browserPoints);
    const walkinArea = createAreaPath(walkinPoints);
    const browserPath = createSmoothPath(browserPoints);
    const walkinPath = createSmoothPath(walkinPoints);



    return (
        <div className="FdaDashboardMain">
            <style>{`
                .FdaMetricGridFour {
                    display: grid !important;
                    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
                    gap: 16px !important;
                    margin-bottom: 28px !important;
                }
                @media (max-width: 1200px) {
                    .FdaMetricGridFour {
                        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                    }
                }
                @media (max-width: 576px) {
                    .FdaMetricGridFour {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
            <Sidebar sidebarType="FDA" />
            <div className="FdaContentContainer">
                <TopBar topbarType="FDA" />
                <div className="FdaMainFeed">
                    <div className="FdaHeader">
                        <div className="FdaHeaderLeft">
                            <p className="FdaEyebrow">Dashboard</p>
                            <h1 className="FdaHeaderTitle">FDA Overview</h1>
                            <p className="FdaSubtitle">Category mix of unregistered product reports.</p>
                        </div>
                    </div>

                    <div className="FdaMetricGrid">
                        <div
                            className="FdaMetricCard FdaMetricCardLink"
                            role="button"
                            tabIndex={0}
                            onClick={() => navigate('/fdafolder/fda-view-reports', { state: { selectedTab: 'Browser Extension' } })}
                        >
                            <span className="FdaMetricLabel">Browser extension reports</span>
                            <span className="FdaMetricNumber">{reportStats.browserExtension}</span>

                        </div>
                        <div
                            className="FdaMetricCard FdaMetricCardLink"
                            role="button"
                            tabIndex={0}
                            onClick={() => navigate('/fdafolder/fda-view-reports', { state: { selectedTab: 'Walk-in' } })}
                        >
                            <span className="FdaMetricLabel">Walk-in reports</span>
                            <span className="FdaMetricNumber">{reportStats.walkIn}</span>

                        </div>
                        <div className="FdaMetricCard">
                            <span className="FdaMetricLabel">Takedowns completed</span>
                            <span className="FdaMetricNumber">{reportStats.takedownsCompleted}</span>

                        </div>
                    </div>

                    {/* Database Metrics Section */}
                    <div className="FdaHeader" style={{ marginTop: '24px', marginBottom: '16px' }}>
                        <div className="FdaHeaderLeft">
                            <p className="FdaEyebrow">Database Summary</p>
                            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#030303', margin: '4px 0 0 0' }}>FDA Product Directory</h2>
                        </div>
                    </div>
                    <div className="FdaMetricGridFour">
                        <div
                            className="FdaMetricCard FdaMetricCardLink"
                            role="button"
                            tabIndex={0}
                            onClick={() => navigate('/fdafolder/fda-product-db', { state: { selectedTab: 'registered' } })}
                        >
                            <span className="FdaMetricLabel">Registered Products</span>
                            <span className="FdaMetricNumber">{registeredCount}</span>
                        </div>
                        <div
                            className="FdaMetricCard FdaMetricCardLink"
                            role="button"
                            tabIndex={0}
                            onClick={() => navigate('/fdafolder/fda-product-db', { state: { selectedTab: 'advisories' } })}
                        >
                            <span className="FdaMetricLabel">Unregistered Advisories</span>
                            <span className="FdaMetricNumber">{unregisteredCount}</span>
                        </div>
                        <div className="FdaMetricCard">
                            <span className="FdaMetricLabel">Converted to Registered</span>
                            <span className="FdaMetricNumber">{convertedToRegCount}</span>
                        </div>
                        <div className="FdaMetricCard">
                            <span className="FdaMetricLabel">Converted to Unregistered</span>
                            <span className="FdaMetricNumber">{convertedToUnregCount}</span>
                        </div>
                    </div>

                    <div className="FdaOverviewGrid">
                        <div className="FdaOverviewLeftColumn">
                            <div className="FdaChartCard">
                                <div className="FdaChartHeader">
                                    <div>
                                        <div className="FdaChartTitle">Reports trend</div>
                                        <div className="FdaChartSubtitle">Monthly report volume across the year</div>
                                    </div>
                                    <div className="FdaTrendLegend">
                                        <span className="FdaTrendBadge browser">Browser Extension</span>
                                        <span className="FdaTrendBadge walkin">Walk-in</span>
                                    </div>
                                </div>
                                <div
                                    className="FdaTrendChart"
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => navigate('/fdafolder/fda-view-reports', { state: { selectedTab: 'All' } })}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            navigate('/fdafolder/fda-view-reports', { state: { selectedTab: 'All' } });
                                        }
                                    }}
                                >
                                    <svg viewBox="0 0 640 280" role="img" aria-label="Reports trend line chart" className="FdaTrendSvg">
                                        <defs>
                                            <linearGradient id="browserGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                                                <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                                            </linearGradient>
                                            <linearGradient id="walkinGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                                                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>

                                        {/* Y-Axis Gridlines */}
                                        {gridTicks.map((val) => {
                                            const y = getPointY(val);
                                            return (
                                                <g key={val}>
                                                    <line x1="45" y1={y} x2="595" y2={y} stroke="#e2e8f0" strokeDasharray="3 3" strokeWidth="1" />
                                                    <text x="32" y={y + 4} textAnchor="end" fontSize="11" fill="rgba(31, 41, 55, 0.45)" fontWeight="500">{val}</text>
                                                </g>
                                            );
                                        })}

                                        {/* Gradients Area */}
                                        <path d={browserArea} fill="url(#browserGradient)" opacity="0.6" style={{ transition: 'all 0.3s ease' }} />
                                        <path d={walkinArea} fill="url(#walkinGradient)" opacity="0.6" style={{ transition: 'all 0.3s ease' }} />

                                        {/* Smooth Vector Lines */}
                                        <path className="FdaTrendPath browser" d={browserPath} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                        <path className="FdaTrendPath walkin" d={walkinPath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                                        {/* Vertical Hover Guide Line */}
                                        {hoveredMonthIndex !== null && (
                                            <line
                                                x1={45 + hoveredMonthIndex * 50}
                                                y1={35}
                                                x2={45 + hoveredMonthIndex * 50}
                                                y2={245}
                                                stroke="#94a3b8"
                                                strokeDasharray="3 3"
                                                strokeWidth="1.5"
                                            />
                                        )}

                                        {/* Browser Points Dots */}
                                        {browserPoints.map((point, index) => {
                                            const isHovered = hoveredMonthIndex === index;
                                            return (
                                                <circle
                                                    key={`b-${index}`}
                                                    cx={point.x}
                                                    cy={point.y}
                                                    r={isHovered ? "5.5" : "3.5"}
                                                    fill="#ffffff"
                                                    stroke="#2563eb"
                                                    strokeWidth="2.5"
                                                    style={{ transition: 'all 0.15s ease' }}
                                                />
                                            );
                                        })}

                                        {/* Walk-in Points Dots */}
                                        {walkinPoints.map((point, index) => {
                                            const isHovered = hoveredMonthIndex === index;
                                            return (
                                                <circle
                                                    key={`w-${index}`}
                                                    cx={point.x}
                                                    cy={point.y}
                                                    r={isHovered ? "5.5" : "3.5"}
                                                    fill="#ffffff"
                                                    stroke="#10b981"
                                                    strokeWidth="2.5"
                                                    style={{ transition: 'all 0.15s ease' }}
                                                />
                                            );
                                        })}

                                        {/* X-Axis Month Labels */}
                                        {trendData.months.map((month, index) => (
                                            <text
                                                key={month}
                                                x={45 + index * 50}
                                                y="266"
                                                textAnchor="middle"
                                                fontSize="11"
                                                fill="rgba(31, 41, 55, 0.5)"
                                                fontWeight={hoveredMonthIndex === index ? "700" : "500"}
                                                style={{ transition: 'font-weight 0.15s ease' }}
                                            >
                                                {month}
                                            </text>
                                        ))}

                                        {/* Transparent Hover Guide Columns */}
                                        {trendData.months.map((month, index) => {
                                            const x = 45 + index * 50;
                                            return (
                                                <rect
                                                    key={`hover-${month}`}
                                                    x={x - 25}
                                                    y={20}
                                                    width="50"
                                                    height="240"
                                                    fill="transparent"
                                                    style={{ cursor: 'pointer' }}
                                                    onMouseEnter={() => setHoveredMonthIndex(index)}
                                                    onMouseLeave={() => setHoveredMonthIndex(null)}
                                                />
                                            );
                                        })}

                                        {/* Dynamic Tooltip */}
                                        {hoveredMonthIndex !== null && (
                                            <foreignObject
                                                x={Math.min(45 + hoveredMonthIndex * 50 - 67, 640 - 150)}
                                                y={Math.max(Math.min(browserPoints[hoveredMonthIndex].y, walkinPoints[hoveredMonthIndex].y) - 95, 10)}
                                                width="140"
                                                height="85"
                                                style={{ pointerEvents: 'none' }}
                                            >
                                                <div className="FdaChartTooltip">
                                                    <div className="tooltipMonth">{trendData.months[hoveredMonthIndex]} 2026</div>
                                                    <div className="tooltipRow browser">
                                                        <span className="tooltipDot blue"></span>
                                                        <span>Browser: <strong>{trendData.browserValues[hoveredMonthIndex]}</strong></span>
                                                    </div>
                                                    <div className="tooltipRow walkin">
                                                        <span className="tooltipDot green"></span>
                                                        <span>Walk-in: <strong>{trendData.walkinValues[hoveredMonthIndex]}</strong></span>
                                                    </div>
                                                </div>
                                            </foreignObject>
                                        )}
                                    </svg>
                                </div>
                            </div>

                            {/* New Takedown Actions Chart */}
                            <div className="FdaChartCard">
                                <div className="FdaChartHeader">
                                    <div>
                                        <div className="FdaChartTitle">Takedown actions</div>
                                        <div className="FdaChartSubtitle">Takedowns requested vs completed reports</div>
                                    </div>
                                    <div className="FdaTrendLegend">
                                        <span className="FdaTrendBadge takedown-requested">Request Takedown</span>
                                        <span className="FdaTrendBadge takedown-completed">Takedown Completed</span>
                                    </div>
                                </div>
                                <div className="FdaTrendChart">
                                    <svg viewBox="0 0 640 240" role="img" aria-label="Takedown actions bar chart" className="FdaTrendSvg">
                                        {/* Y-Axis Gridlines */}
                                        {takedownTicks.map((val) => {
                                            const y = getBarY(val);
                                            return (
                                                <g key={val}>
                                                    <line x1="45" y1={y} x2="595" y2={y} stroke="#e2e8f0" strokeDasharray="3 3" strokeWidth="1" />
                                                    <text x="32" y={y + 4} textAnchor="end" fontSize="11" fill="rgba(31, 41, 55, 0.45)" fontWeight="500">{val}</text>
                                                </g>
                                            );
                                        })}

                                        {/* Columns data */}
                                        {takedownData.months.map((month, index) => {
                                            const groupCenterX = 45 + index * 45.83 + 22.9;
                                            const isHovered = hoveredTakedownIndex === index;

                                            const reqVal = takedownData.requested[index];
                                            const reqH = getBarHeight(reqVal);
                                            const reqY = getBarY(reqVal);
                                            const reqX = groupCenterX - 17;

                                            const compVal = takedownData.completed[index];
                                            const compH = getBarHeight(compVal);
                                            const compY = getBarY(compVal);
                                            const compX = groupCenterX + 1;

                                            return (
                                                <g key={month}>
                                                    {/* Hover Overlay Background */}
                                                    {isHovered && (
                                                        <rect
                                                            x={45 + index * 45.83 + 3}
                                                            y={35}
                                                            width="39"
                                                            height="165"
                                                            fill="#f1f5f9"
                                                            opacity="0.6"
                                                            rx="4"
                                                        />
                                                    )}

                                                    {/* Requested Column (Indigo) */}
                                                    <rect
                                                        x={reqX}
                                                        y={reqY}
                                                        width="16"
                                                        height={reqH}
                                                        fill="#4f46e5"
                                                        rx="3"
                                                        style={{ transition: 'all 0.2s ease' }}
                                                    />

                                                    {/* Completed Column (Teal) */}
                                                    <rect
                                                        x={compX}
                                                        y={compY}
                                                        width="16"
                                                        height={compH}
                                                        fill="#0d9488"
                                                        rx="3"
                                                        style={{ transition: 'all 0.2s ease' }}
                                                    />
                                                </g>
                                            );
                                        })}

                                        {/* X-Axis Month Labels */}
                                        {takedownData.months.map((month, index) => (
                                            <text
                                                key={month}
                                                x={45 + index * 45.83 + 22.9}
                                                y="215"
                                                textAnchor="middle"
                                                fontSize="11"
                                                fill="rgba(31, 41, 55, 0.5)"
                                                fontWeight={hoveredTakedownIndex === index ? "700" : "500"}
                                                style={{ transition: 'font-weight 0.15s ease' }}
                                            >
                                                {month}
                                            </text>
                                        ))}

                                        {/* Transparent Hover Interactivity Rects */}
                                        {takedownData.months.map((month, index) => {
                                            const x = 45 + index * 45.83;
                                            return (
                                                <rect
                                                    key={`t-hover-${month}`}
                                                    x={x}
                                                    y={20}
                                                    width="45.83"
                                                    height="200"
                                                    fill="transparent"
                                                    style={{ cursor: 'pointer' }}
                                                    onMouseEnter={() => setHoveredTakedownIndex(index)}
                                                    onMouseLeave={() => setHoveredTakedownIndex(null)}
                                                />
                                            );
                                        })}

                                        {/* Dynamic Tooltip */}
                                        {hoveredTakedownIndex !== null && (
                                            <foreignObject
                                                x={Math.min(45 + hoveredTakedownIndex * 45.83 - 48, 640 - 150)}
                                                y={Math.max(getBarY(Math.max(takedownData.requested[hoveredTakedownIndex], takedownData.completed[hoveredTakedownIndex])) - 95, 10)}
                                                width="140"
                                                height="85"
                                                style={{ pointerEvents: 'none' }}
                                            >
                                                <div className="FdaChartTooltip">
                                                    <div className="tooltipMonth">{takedownData.months[hoveredTakedownIndex]} 2026</div>
                                                    <div className="tooltipRow indigo">
                                                        <span className="tooltipDot indigo"></span>
                                                        <span>Requested: <strong>{takedownData.requested[hoveredTakedownIndex]}</strong></span>
                                                    </div>
                                                    <div className="tooltipRow teal">
                                                        <span className="tooltipDot teal"></span>
                                                        <span>Completed: <strong>{takedownData.completed[hoveredTakedownIndex]}</strong></span>
                                                    </div>
                                                </div>
                                            </foreignObject>
                                        )}
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="FdaOverviewRightColumn">
                            <div className="FdaCategoryCard">
                                <div className="FdaCategoryTitle">Category mix</div>
                                <div className="FdaCategorySubtitle">Unregistered product reports</div>
                                <div className="FdaDonutChartWrapper">
                                    <div className="FdaDonutChart" style={donutStyle}>
                                        <div className="FdaDonutCenter">{unregisteredCategoryStats.total}</div>
                                    </div>
                                    <div className="FdaCategoryLegend">
                                        {unregisteredCategoryStats.categoryMix.map((item) => (
                                            <div key={item.label} className="FdaCategoryLegendItem">
                                                <span className="FdaLegendMarker" style={{ background: item.color }} />
                                                <span>{item.label}</span>
                                                <strong>{unregisteredCategoryStats.total > 0 ? Math.round((item.value / unregisteredCategoryStats.total) * 100) : 0}%</strong>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Awaiting your verification card */}
                            <div className="FdaCategoryCard FdaAwaitingCard">
                                <div className="FdaAwaitingHeader">
                                    <div className="FdaCategoryTitle" style={{ marginBottom: 0 }}>Awaiting your verification</div>
                                    <span className="FdaAwaitingBadge">
                                        <AlertTriangle size={14} />
                                        <span>{awaitingVerificationCases.length}</span>
                                    </span>
                                </div>

                                <div className="FdaAwaitingList">
                                    {awaitingVerificationCases.map((item) => (
                                        <div key={item.id} className="FdaAwaitingListItem">
                                            <div className="FdaAwaitingItemTopRow">
                                                <span className="FdaAwaitingItemTitle">{item.product}</span>
                                                <span className="FdaAwaitingItemTag pending">
                                                    <AlertTriangle size={12} />
                                                    <span>{item.status}</span>
                                                </span>
                                            </div>
                                            <span className="FdaAwaitingItemSubtitle">
                                                {item.manufacturer} · {item.caseId}
                                            </span>
                                            {item.leaConfirmation && (
                                                <div className="FdaAwaitingItemConfirmation">
                                                    <CheckCircle size={14} />
                                                    <span>LEA confirmation attached</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent complaint activity Table */}
                    <div className="FdaRecentComplaintsCard">
                        <div className="recentComplaintsHeader">
                            <h3>Recent complaint activity</h3>
                            <div
                                className="openFullTableBtn"
                                onClick={() => navigate('/fdafolder/fda-view-reports')}
                            >
                                <span>Open full table</span>
                                <span className="arrowIcon">&rarr;</span>
                            </div>
                        </div>

                        <div className="RecentComplaintsTableWrapper">
                            <table className="RecentComplaintsTable">
                                <thead>
                                    <tr>
                                        <th>CASE ID</th>
                                        <th>PRODUCT</th>
                                        <th>SOURCE</th>
                                        <th>STATUS</th>
                                        <th>SUBMITTED</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentComplaints.map((report) => (
                                        <tr key={report.id}>
                                            <td className="CaseIdCol">{report.caseId}</td>
                                            <td>
                                                <div className="ProductCell">
                                                    <span className="ProductNameText">{report.product}</span>
                                                    <span className="ManufacturerText">{report.manufacturer}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`FdaSourceBadge ${report.source === "Browser Extension" ? "extension" : "walkin"}`}>
                                                    {report.source === "Browser Extension" ? <Globe size={12} /> : <Footprints size={12} />}
                                                    <span>{report.source === "Browser Extension" ? "Browser Ext" : "Walk-in"}</span>
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`FdaStatusBadge badge-${report.status.toLowerCase().replace(/\s+/g, '-')}`}>
                                                    {report.status}
                                                </span>
                                            </td>
                                            <td className="LoggedCol">{report.dateReceived}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default FDADashboard