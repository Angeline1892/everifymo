import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './lea-css.css';
import Sidebar from '../component/sidebar';
import TopBar from '../component/top-bar';
import {
  AlertTriangle,
  Footprints
} from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000';

function LeaDashboard() {
  const navigate = useNavigate();
  const [hoveredLineIndex, setHoveredLineIndex] = useState(null);
  const [hoveredBarGroupIndex, setHoveredBarGroupIndex] = useState(null);

  const [awaitingFdaCases, setAwaitingFdaCases] = useState([]);
  const [recentComplaints, setRecentComplaints] = useState([]);
  const [walkinCount, setWalkinCount] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [takedownsCount, setTakedownsCount] = useState(0);

  const [intakeData, setIntakeData] = useState([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [forwardedData, setForwardedData] = useState([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [pipelineData, setPipelineData] = useState([
    { label: '—', ops: 0, takedowns: 0 },
    { label: '—', ops: 0, takedowns: 0 },
    { label: '—', ops: 0, takedowns: 0 },
    { label: '—', ops: 0, takedowns: 0 }
  ]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const headers = { Authorization: `Bearer ${token}` };

    const fetchData = async () => {
      try {
        // 1. Fetch awaiting FDA cases
        const awaitingRes = await fetch(`${API_BASE}/verification-requests/awaiting-fda`, { headers });
        let awaitingData = [];
        if (awaitingRes.ok) {
          awaitingData = await awaitingRes.json();
          const mappedAwaiting = awaitingData.map(item => ({
            id: item.request_id,
            product: item.product_name,
            manufacturer: item.manufacturer || '—',
            caseNumber: item.case_reference,
            type: item.source === 'walk_in' ? 'Walk-in' : 'Extension'
          }));
          setAwaitingFdaCases(mappedAwaiting);
        }

        // 2. Fetch all walk-in complaints for count and recent table
        const complaintsRes = await fetch(`${API_BASE}/complaints/walkin/`, { headers });
        let complaintsData = [];
        if (complaintsRes.ok) {
          complaintsData = await complaintsRes.json();
        }

        // 3. Fetch counts
        const countsRes = await fetch(`${API_BASE}/verification-requests/counts`, { headers });
        if (countsRes.ok) {
          const countsData = await countsRes.json();
          setSentCount(countsData.verification_queue_count + countsData.completed_count + countsData.rejected_count);
        }

        const leaCountsRes = await fetch(`${API_BASE}/verification-requests/lea-counts`, { headers });
        if (leaCountsRes.ok) {
          const leaCountsData = await leaCountsRes.json();
          setTakedownsCount(leaCountsData.completed_count);
        }

        // 4. Fetch trends data
        const trendsRes = await fetch(`${API_BASE}/complaints/trends`, { headers });
        if (trendsRes.ok) {
          const trendsData = await trendsRes.json();
          setIntakeData(trendsData.intake_data);
          setForwardedData(trendsData.forwarded_data);
          if (trendsData.pipeline_data && trendsData.pipeline_data.length > 0) {
            setPipelineData(trendsData.pipeline_data);
          }
        }

        // Map real walk-in complaints for recent complaints table:
        const mappedRecent = complaintsData.map(c => {
          return {
            id: c.case_reference,
            product: c.product_title,
            manufacturer: c.manufacturer || '—',
            complainant: c.complainant_name || '—',
            status: c.status,
            logged: c.created_at ? new Date(c.created_at).toLocaleString() : '—',
            rawDate: c.created_at ? new Date(c.created_at) : new Date(0)
          };
        })
        .sort((a, b) => b.rawDate - a.rawDate)
        .slice(0, 4);

        setRecentComplaints(mappedRecent);

        // Walk-in intakes total count:
        setWalkinCount(complaintsData.length);

      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      }
    };

    fetchData();
  }, []);

  // Line chart dataset representing months of the year
  const lineDays = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // SVG Line Chart math
  const width = 800;
  const height = 250;
  const padX = 45;
  const padY = 25;
  
  // Calculate dynamic max value for Y axis (min 10)
  const maxIntake = Math.max(...intakeData);
  const maxForwarded = Math.max(...forwardedData);
  const maxY = Math.max(10, Math.ceil(Math.max(maxIntake, maxForwarded) * 1.2));

  const getX = (index) => padX + index * ((width - padX * 2) / (lineDays.length - 1));
  const getY = (val) => height - padY - (val / (maxY || 1)) * (height - padY * 2);

  // SVG Bar Chart math & data
  const barPadLeft = 50;
  const barPadRight = 20;
  const padT = 15;
  
  // Calculate dynamic max value for Bar Y axis (min 10)
  const maxOps = Math.max(...pipelineData.map(d => d.ops));
  const maxTakedowns = Math.max(...pipelineData.map(d => d.takedowns));
  const maxBarY = Math.max(10, Math.ceil(Math.max(maxOps, maxTakedowns) * 1.2));

  const plotWidth = width - barPadLeft - barPadRight;
  const groupWidth = plotWidth / (pipelineData.length || 4);
  const barWidth = 48; // Width of each column bar
  const barGap = 8;   // Gap between the two bars inside a group

  const getBarY = (val) => height - padY - (val / (maxBarY || 1)) * (height - padY - padT);
  const getBarHeight = (val) => (val / (maxBarY || 1)) * (height - padY - padT);

  // Live datasets loaded from backend APIs

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'queued':
        return 'WcStatus-queued';
      case 'pending':
        return 'WcStatus-pending';
      case 'confirmed_registered':
        return 'WcStatus-confirmed-registered';
      case 'confirmed_unregistered':
        return 'WcStatus-confirmed-unregistered';
      case 'rejected':
        return 'WcStatus-rejected';
      default:
        return '';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'queued':
        return 'Ready to Send';
      case 'pending':
        return 'Pending FDA Verification';
      case 'confirmed_registered':
        return 'Confirmed Registered';
      case 'confirmed_unregistered':
        return 'Confirmed Unregistered';
      case 'rejected':
        return 'Verification Rejected';
      default:
        return status;
    }
  };

  const intakePoints = intakeData.map((val, i) => ({ x: getX(i), y: getY(val), val, day: lineDays[i] }));
  const forwardedPoints = forwardedData.map((val, i) => ({ x: getX(i), y: getY(val), val, day: lineDays[i] }));

  // Smooth Bezier curve generator
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

  const intakePath = createSmoothPath(intakePoints);
  const forwardedPath = createSmoothPath(forwardedPoints);

  // Smooth Area generator for gradient fill
  const createAreaPath = (pts) => {
    const linePath = createSmoothPath(pts);
    if (!linePath) return '';
    const firstX = pts[0].x;
    const lastX = pts[pts.length - 1].x;
    const baselineY = height - padY;
    return `${linePath} L ${lastX},${baselineY} L ${firstX},${baselineY} Z`;
  };

  const intakeArea = createAreaPath(intakePoints);
  const forwardedArea = createAreaPath(forwardedPoints);

  // Dynamic Gridline Ticks for Line Chart
  const numLineTicks = 5;
  const lineTicks = Array.from({ length: numLineTicks }, (_, i) => {
    const val = (maxY / (numLineTicks - 1)) * i;
    return {
      value: Math.round(val),
      y: getY(val)
    };
  });

  // Dynamic Gridline Ticks for Bar Chart
  const numBarTicks = 5;
  const barTicks = Array.from({ length: numBarTicks }, (_, i) => {
    const val = (maxBarY / (numBarTicks - 1)) * i;
    return {
      value: Math.round(val),
      y: getBarY(val)
    };
  });



  return (
    <div className='LeaDashboardMain'>
      <Sidebar sidebarType="LEA" />
      <div className='LeaContentContainer'>
        <TopBar topbarType="LEA" />
        <div className='LeaMainfeed'>
          <div className='LeaHeader'>
            <div>
              <p>LEA-CIDG: DASHBOARD</p>
              <p>OVERVIEW OF VERIFICATION REQUESTS & COMPLAINTS</p>
            </div>
          </div>
          {/* Top 4 Stats Cards */}
          <div className='LeaStatsGrid'>
            <div className='LeaStatCard'>
              <div className='statTopRow'>
                <span className='statLabel'>Walk-in intakes</span>
              </div>
              <div className='statValue'>{walkinCount}</div>
            </div>

            <div className='LeaStatCard'>
              <div className='statTopRow'>
                <span className='statLabel'>Verification requests sent</span>
              </div>
              <div className='statValue'>{sentCount}</div>
            </div>

            <div className='LeaStatCard'>
              <div className='statTopRow'>
                <span className='statLabel'>Takedowns completed</span>
              </div>
              <div className='statValue'>{takedownsCount}</div>
            </div>
          </div>

          {/* Charts Row */}
          <div className='LeaChartsRow'>

            <div className='LeaChartsLeftCol'>
              {/* Left Line Chart Card */}
              <div className='LeaChartCard LineCard'>
                <div className='chartHeader'>
                  <div>
                    <h3>Walk-in intake vs Forwarded to FDA</h3>
                  </div>
                  <div className='chartLegendInline'>
                    <div className='legendItemInline'>
                      <span className='legendDotNavy'></span>
                      <span>Intake</span>
                    </div>
                    <div className='legendItemInline'>
                      <span className='legendDotTeal'></span>
                      <span>Forwarded</span>
                    </div>
                  </div>
                </div>

                 {/* Line Chart SVG */}
                 <div className='svgChartWrapper'>
                   <svg className='interactiveLineSvg' viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
                     <defs>
                       <linearGradient id="intakeGradient" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="0%" stopColor="#07476F" stopOpacity="0.25" />
                         <stop offset="100%" stopColor="#07476F" stopOpacity="0" />
                       </linearGradient>
                       <linearGradient id="forwardedGradient" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.25" />
                         <stop offset="100%" stopColor="#14B8A6" stopOpacity="0" />
                       </linearGradient>
                     </defs>
 
                     {/* Horizontal Dashed Gridlines */}
                     {lineTicks.map((tick, idx) => {
                       return (
                         <g key={idx}>
                           <line x1={padX} y1={tick.y} x2={width - padX} y2={tick.y} stroke="#e2e8f0" strokeDasharray="2 2" strokeWidth="1" />
                           <text x={padX - 10} y={tick.y + 4} className='yAxisText'>{tick.value}</text>
                         </g>
                       );
                     })}
 
                     {/* Gradient Fills under Curves */}
                     <path d={intakeArea} fill="url(#intakeGradient)" opacity="0.6" style={{ transition: 'all 0.3s ease' }} />
                     <path d={forwardedArea} fill="url(#forwardedGradient)" opacity="0.6" style={{ transition: 'all 0.3s ease' }} />
 
                     {/* Smooth Curves */}
                     <path d={intakePath} fill="none" stroke="#07476F" strokeWidth="2.5" strokeLinecap="round" />
                     <path d={forwardedPath} fill="none" stroke="#14B8A6" strokeWidth="2.5" strokeLinecap="round" />

                    {/* Points & Day Labels */}
                    {intakePoints.map((pt, i) => {
                      const fPt = forwardedPoints[i];
                      const isHovered = hoveredLineIndex === i;

                      return (
                        <g key={i}>
                          {/* X-axis Day Text */}
                          <text x={pt.x} y={height - 4} className='xAxisText'>{pt.day}</text>

                          {/* Interactive Invisible Hover Zone */}
                          <rect
                            x={pt.x - 22}
                            y={10}
                            width="44"
                            height={height - 30}
                            fill="transparent"
                            style={{ cursor: 'pointer' }}
                            onMouseEnter={() => setHoveredLineIndex(i)}
                            onMouseLeave={() => setHoveredLineIndex(null)}
                          />

                          {/* Vertical Guide Line on Hover */}
                          {isHovered && (
                            <line x1={pt.x} y1={20} x2={pt.x} y2={height - 25} stroke="#cbd5e1" strokeDasharray="3 3" strokeWidth="1.5" />
                          )}

                          {/* Intake Circle Dot */}
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isHovered ? "5" : "3.5"}
                            fill="#FFFFFF"
                            stroke="#07476F"
                            strokeWidth="2.5"
                            style={{ transition: 'all 0.15s ease' }}
                          />

                          {/* Forwarded Circle Dot */}
                          <circle
                            cx={fPt.x}
                            cy={fPt.y}
                            r={isHovered ? "5" : "3.5"}
                            fill="#FFFFFF"
                            stroke="#14B8A6"
                            strokeWidth="2.5"
                            style={{ transition: 'all 0.15s ease' }}
                          />

                          {/* Tooltip */}
                          {isHovered && (
                            <foreignObject x={Math.min(pt.x - 60, width - 130)} y={Math.max(pt.y - 65, 10)} width="120" height="54">
                              <div className='lineTooltipClean'>
                                <div className='ttDay'>{pt.day}</div>
                                <div className='ttRow navy'>Intake: <strong>{pt.val}</strong></div>
                                <div className='ttRow teal'>Forwarded: <strong>{fPt.val}</strong></div>
                              </div>
                            </foreignObject>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* Pipeline Chart Card */}
              <div className='LeaChartCard PipelineCard'>
                <div className='chartHeader'>
                  <div>
                    <h3>Verification actions pipeline</h3>
                  </div>
                  <div className='chartLegendInline'>
                    <div className='legendItemInline'>
                      <span className='legendDotNavy'></span>
                      <span>Confirm Unregistered</span>
                    </div>
                    <div className='legendItemInline'>
                      <span className='legendDotGreen'></span>
                      <span>Confirm Registered</span>
                    </div>
                  </div>
                </div>

                {/* Bar Chart SVG */}
                <div className='svgChartWrapper'>
                  <svg className='interactiveBarSvg' viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
                    {/* Horizontal Dashed Gridlines */}
                    {barTicks.map((tick, idx) => {
                      return (
                        <g key={idx}>
                          <line x1={barPadLeft} y1={tick.y} x2={width - barPadRight} y2={tick.y} stroke="#e2e8f0" strokeDasharray="2 2" strokeWidth="1" />
                          <text x={barPadLeft - 10} y={tick.y + 4} className='yAxisText'>{tick.value}</text>
                        </g>
                      );
                    })}

                    {/* Solid bottom axis line */}
                    <line x1={barPadLeft} y1={height - padY} x2={width - barPadRight} y2={height - padY} stroke="#cbd5e1" strokeWidth="1" />

                    {/* Bars and hover effects */}
                    {pipelineData.map((data, i) => {
                      const groupCenterX = barPadLeft + i * groupWidth + groupWidth / 2;
                      const isHovered = hoveredBarGroupIndex === i;

                      const opHeight = getBarHeight(data.ops);
                      const opY = getBarY(data.ops);
                      const opX = groupCenterX - barWidth - barGap / 2;

                      const tdHeight = getBarHeight(data.takedowns);
                      const tdY = getBarY(data.takedowns);
                      const tdX = groupCenterX + barGap / 2;

                      return (
                        <g key={i}>
                          {/* Hover background area */}
                          {isHovered && (
                            <rect
                              x={barPadLeft + i * groupWidth}
                              y={padT}
                              width={groupWidth}
                              height={height - padY - padT}
                              fill="#cbd5e1"
                              opacity="0.3"
                            />
                          )}

                          {/* Operations Bar (Navy) */}
                          <rect
                            x={opX}
                            y={opY}
                            width={barWidth}
                            height={opHeight}
                            fill="#07476F"
                            rx="3"
                            style={{ transition: 'all 0.15s ease' }}
                          />

                          {/* Takedowns Bar (Green) */}
                          <rect
                            x={tdX}
                            y={tdY}
                            width={barWidth}
                            height={tdHeight}
                            fill="#059669"
                            rx="3"
                            style={{ transition: 'all 0.15s ease' }}
                          />

                          {/* X-axis label (W18, W19, W20, W21) */}
                          <text x={groupCenterX} y={height - 4} className='xAxisText'>{data.label}</text>

                          {/* Invisible Hover Zone covering the entire group */}
                          <rect
                            x={barPadLeft + i * groupWidth}
                            y={padT}
                            width={groupWidth}
                            height={height - padY - padT}
                            fill="transparent"
                            style={{ cursor: 'pointer' }}
                            onMouseEnter={() => setHoveredBarGroupIndex(i)}
                            onMouseLeave={() => setHoveredBarGroupIndex(null)}
                          />

                          {/* Tooltip Card */}
                          {isHovered && (
                            <foreignObject
                              x={Math.min(groupCenterX - 60, width - 130)}
                              y={Math.max(Math.min(opY, tdY) - 85, 10)}
                              width="120"
                              height="75"
                            >
                              <div className='barTooltipClean'>
                                <div className='ttWeek'>{data.label}</div>
                                <div className='ttRow navy'>unregistered : <strong>{data.ops}</strong></div>
                                <div className='ttRow green'>registered : <strong>{data.takedowns}</strong></div>
                              </div>
                            </foreignObject>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            </div>

            <div className='LeaChartsRightCol'>


              {/* Awaiting FDA verification card */}
              <div className='LeaChartCard AwaitingFDACard'>
                <div className='chartHeader'>
                  <div>
                    <h3>Awaiting FDA verification</h3>
                  </div>
                  <span className='awaitingBadge'>
                    <AlertTriangle size={14} />
                    <span>{awaitingFdaCases.length}</span>
                  </span>
                </div>

                <div className='awaitingList'>
                  {awaitingFdaCases.map((item) => (
                    <div key={item.id} className='awaitingListItem'>
                      <div className='awaitingItemLeft'>
                        <span className='awaitingItemTitle'>{item.product}</span>
                        <span className='awaitingItemSubtitle'>
                          {item.manufacturer} · {item.caseNumber}
                        </span>
                      </div>
                      <div className='awaitingItemRight'>
                        <span className='walkinTag'>
                          <Footprints size={12} />
                          <span>{item.type}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recent walk-in complaints Table */}
          <div className='RecentComplaintsCard'>
            <div className='recentComplaintsHeader'>
              <h3>Recent walk-in complaints</h3>
              <div
                className='openFullTableBtn'
                onClick={() => navigate('/leacidgfolder/lea-walkin-complaints')}
              >
                <span>Open full table</span>
                <span className='arrowIcon'>&rarr;</span>
              </div>
            </div>

            <div className='RecentComplaintsTableWrapper'>
              <table className='RecentComplaintsTable'>
                <thead>
                  <tr>
                    <th>CASE ID</th>
                    <th>PRODUCT</th>
                    <th>COMPLAINANT</th>
                    <th>STATUS</th>
                    <th>LOGGED</th>
                  </tr>
                </thead>
                <tbody>
                  {recentComplaints.map((complaint) => (
                    <tr key={complaint.id}>
                      <td className='CaseIdCol'>{complaint.id}</td>
                      <td>
                        <div className='ProductCell'>
                          <span className='ProductNameText'>{complaint.product}</span>
                          <span className='ManufacturerText'>{complaint.manufacturer}</span>
                        </div>
                      </td>
                      <td className='ComplainantCol'>{complaint.complainant}</td>
                      <td>
                        <span className={`WcStatusBadge ${getStatusBadgeClass(complaint.status)}`}>
                          {getStatusLabel(complaint.status)}
                        </span>
                      </td>
                      <td className='LoggedCol'>{complaint.logged}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LeaDashboard;

