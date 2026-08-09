const fs = require('fs');
const path = require('path');

const dashboardPath = path.join(__dirname, 'Dashboard.jsx');
let content = fs.readFileSync(dashboardPath, 'utf-8');

// ---------------------------------------------------------
// 1. Add Settings icon
// ---------------------------------------------------------
const lucideImportRegex =
  /import\s*{\s*TrendingUp,([^}]*)}\s*from\s*['"]lucide-react['"];/;

if (lucideImportRegex.test(content) && !content.includes('Settings } from')) {
  content = content.replace(
    lucideImportRegex,
    "import { TrendingUp,$1 Settings } from 'lucide-react';"
  );
}

// ---------------------------------------------------------
// 2. Add states/config only if not already present
// ---------------------------------------------------------
if (!content.includes('const [henDeaths, setHenDeaths]')) {
  content = content.replace(
    /const \[feeds, setFeeds\] = useState\(\[\]\);/,
    `const [feeds, setFeeds] = useState([]);
  const [henDeaths, setHenDeaths] = useState([]);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const DEFAULT_CHART_CONFIG = [
    {
      id: 'eggsProduced',
      title: 'Eggs Produced',
      enabled: true,
      chartType: 'line',
      color: '#3B82F6',
      bgColor: 'rgba(59, 130, 246, 0.1)',
      formatCurrency: false
    },
    {
      id: 'eggSales',
      title: 'Egg Sales',
      enabled: true,
      chartType: 'bar',
      color: '#10B981',
      bgColor: 'rgba(16, 185, 129, 0.1)',
      formatCurrency: false
    },
    {
      id: 'revenue',
      title: 'Revenue',
      enabled: true,
      chartType: 'area',
      color: '#F59E0B',
      bgColor: 'rgba(245, 158, 11, 0.1)',
      formatCurrency: true
    },
    {
      id: 'profit',
      title: 'Profit',
      enabled: true,
      chartType: 'line',
      color: '#4F46E5',
      bgColor: 'rgba(79, 70, 229, 0.1)',
      formatCurrency: true
    },
    {
      id: 'eggsDamaged',
      title: 'Eggs Damaged',
      enabled: true,
      chartType: 'bar',
      color: '#F43F5E',
      bgColor: 'rgba(244, 63, 94, 0.1)',
      formatCurrency: false
    },
    {
      id: 'feedCost',
      title: 'Feed Cost',
      enabled: false,
      chartType: 'bar',
      color: '#8B5CF6',
      bgColor: 'rgba(139, 92, 246, 0.1)',
      formatCurrency: true
    },
    {
      id: 'treatmentCost',
      title: 'Treatment Cost',
      enabled: false,
      chartType: 'bar',
      color: '#06B6D4',
      bgColor: 'rgba(6, 182, 212, 0.1)',
      formatCurrency: true
    },
    {
      id: 'mortality',
      title: 'Mortality',
      enabled: false,
      chartType: 'line',
      color: '#EF4444',
      bgColor: 'rgba(239, 68, 68, 0.1)',
      formatCurrency: false
    }
  ];

  const [chartConfig, setChartConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboardChartConfig');

      if (saved) {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (error) {
      console.warn('Invalid dashboard chart configuration:', error);
      localStorage.removeItem('dashboardChartConfig');
    }

    return DEFAULT_CHART_CONFIG.map(item => ({ ...item }));
  });

  const [tempConfig, setTempConfig] = useState(() =>
    DEFAULT_CHART_CONFIG.map(item => ({ ...item }))
  );`
  );
}
content = content.replace(
  /setFeeds\(feedRes\.data\);\s*setHenDeaths\(henDeathsData\);/,
  `setFeeds(feedRes.data);
      setHenDeaths([]);`
);

// Also handle if only the undefined line exists.
content = content.replace(
  /setHenDeaths\(henDeathsData\);/g,
  `setHenDeaths([]);`
);

// ---------------------------------------------------------
// 4. Replace Chart Grouping
// ---------------------------------------------------------
const oldGroupData = `  // Chart Grouping
  const groupDataByFilter = () => {
    const grouped = {};
    filteredEntries.forEach(e => {
      const d = new Date(e.date);
      let key = formatDate(e.date); // daily
      
      if (dateFilter === 'weekly') {
        const firstDay = new Date(d.setDate(d.getDate() - d.getDay())).toISOString();
        key = \`Week of \${formatDate(firstDay)}\`;
      } else if (dateFilter === 'monthly') {
        key = \`\${d.getFullYear()}-\${String(d.getMonth() + 1).padStart(2, '0')}\`;
      } else if (dateFilter === 'yearly') {
        key = \`\${d.getFullYear()}\`;
      }
      
      if (!grouped[key]) {
        grouped[key] = { produced: 0, sold: 0, damaged: 0, profit: 0, revenue: 0 };
      }
      grouped[key].produced += e.eggsProduced;
      grouped[key].sold += e.eggsSold;
      grouped[key].damaged += (e.damagedEggs || 0);
      grouped[key].profit += (e.profit || 0);
      grouped[key].revenue += e.salesAmount;
    });
    return grouped;
  };`;

const newGroupData = `  const isWithinFilter = (dateStr) => {
    if (!dateStr) return false;

    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return false;

    const now = new Date();

    if (dateFilter === 'daily') {
      const past = new Date(now);
      past.setDate(past.getDate() - 7);
      return d >= past;
    }

    if (dateFilter === 'weekly') {
      const past = new Date(now);
      past.setDate(past.getDate() - 30);
      return d >= past;
    }

    if (dateFilter === 'monthly') {
      const past = new Date(now);
      past.setMonth(past.getMonth() - 6);
      return d >= past;
    }

    if (dateFilter === 'yearly') {
      const past = new Date(now);
      past.setFullYear(past.getFullYear() - 5);
      return d >= past;
    }

    if (dateFilter === 'custom' && customStart && customEnd) {
      const start = new Date(customStart);
      const end = new Date(customEnd);

      // Include the complete end date.
      end.setHours(23, 59, 59, 999);

      return d >= start && d <= end;
    }

    return true;
  };

  const groupDataByFilter = () => {
    const grouped = {};

    const getDateKey = (dateStr) => {
      const d = new Date(dateStr);

      if (dateFilter === 'weekly') {
        const firstDay = new Date(d);
        firstDay.setDate(firstDay.getDate() - firstDay.getDay());
        return \`Week of \${formatDate(firstDay.toISOString())}\`;
      }

      if (dateFilter === 'monthly') {
        return \`\${d.getFullYear()}-\${String(d.getMonth() + 1).padStart(2, '0')}\`;
      }

      if (dateFilter === 'yearly') {
        return \`\${d.getFullYear()}\`;
      }

      return formatDate(dateStr);
    };

    const initGroup = (key) => {
      if (!grouped[key]) {
        grouped[key] = {
          eggsProduced: 0,
          eggSales: 0,
          eggsDamaged: 0,
          profit: 0,
          revenue: 0,
          feedCost: 0,
          treatmentCost: 0,
          mortality: 0
        };
      }
    };

    filteredEntries.forEach(e => {
      const key = getDateKey(e.date);

      initGroup(key);

      grouped[key].eggsProduced += Number(e.eggsProduced) || 0;
      grouped[key].eggSales += Number(e.eggsSold) || 0;
      grouped[key].eggsDamaged += Number(e.damagedEggs) || 0;
      grouped[key].profit += Number(e.profit) || 0;
      grouped[key].revenue += Number(e.salesAmount) || 0;
    });

    feeds.forEach(e => {
      if (!isWithinFilter(e.date)) return;

      const key = getDateKey(e.date);

      initGroup(key);

      grouped[key].feedCost += Number(e.feedCost) || 0;
    });

    vaccines.forEach(e => {
      if (!isWithinFilter(e.date)) return;

      const key = getDateKey(e.date);

      initGroup(key);

      grouped[key].treatmentCost += Number(e.cost) || 0;
    });

    henDeaths.forEach(e => {
      if (!isWithinFilter(e.date)) return;

      const key = getDateKey(e.date);

      initGroup(key);

      grouped[key].mortality += Number(e.deadToday) || 0;
    });

    return grouped;
  };

  const renderChartComponent = (configItem, labels, groupedData) => {
    const dataKey = configItem.id;

    const dataVals = labels.map(
      label => groupedData[label]?.[dataKey] || 0
    );

    const isArea = configItem.chartType === 'area';

    const dataset = {
      label: configItem.title,
      data: dataVals,
      borderColor: configItem.color,
      backgroundColor:
        isArea || configItem.chartType === 'bar'
          ? configItem.bgColor
          : configItem.color,
      fill: isArea,
      tension: 0.4,
      borderWidth: 2,
      pointRadius: 2,
      pointHoverRadius: 6,
      borderRadius: configItem.chartType === 'bar' ? 4 : 0,
      barThickness: 'flex',
      maxBarThickness: 40
    };

    const dataObj = {
      labels,
      datasets: [dataset]
    };

    const options = getChartOptions(
      configItem.title,
      configItem.formatCurrency
    );

    if (configItem.chartType === 'bar') {
      return <Bar data={dataObj} options={options} />;
    }

    return <Line data={dataObj} options={options} />;
  };`;

if (content.includes(oldGroupData)) {
  content = content.replace(oldGroupData, newGroupData);
}

// ---------------------------------------------------------
// 5. Add Customize Dashboard button
// ---------------------------------------------------------
if (
  !content.includes('setShowConfigModal(true)') &&
  content.includes(
    '<div className="d-flex flex-wrap gap-2 align-items-center bg-white p-2 rounded-3 border saas-card">'
  )
) {
  content = content.replace(
    '<div className="d-flex flex-wrap gap-2 align-items-center bg-white p-2 rounded-3 border saas-card">',
    `<button
          className="btn btn-light border d-inline-flex align-items-center gap-2 fw-medium me-2"
          onClick={() => {
            setTempConfig(chartConfig.map(item => ({ ...item })));
            setShowConfigModal(true);
          }}
        >
          <Settings size={18} />
          Customize Dashboard
        </button>

        <div className="d-flex flex-wrap gap-2 align-items-center bg-white p-2 rounded-3 border saas-card">`
  );
}

// ---------------------------------------------------------
// 6. Replace Charts Grid
// ---------------------------------------------------------
const oldChartsGrid =
  /{\s*\/\*\s*Charts Grid\s*\*\/\}([\s\S]*?)(?={\s*\/\*\s*Timeline Section\s*\*\/\})/;

const newChartsGrid = `{/* Charts Grid */}
      <div className="row g-4">
        {chartConfig
          .filter(config => config.enabled)
          .map(configItem => (
            <div className="col-12 col-xl-6" key={configItem.id}>
              <div className="saas-card p-4 h-100">
                <h5 className="fw-bold mb-4">
                  {configItem.title} Graph
                </h5>

                <div style={{ height: '350px' }}>
                  {renderChartComponent(
                    configItem,
                    labels,
                    groupedData
                  )}
                </div>
              </div>
            </div>
          ))}

        {chartConfig.filter(config => config.enabled).length === 0 && (
          <div className="col-12">
            <div className="saas-card p-5 text-center text-muted">
              <h5 className="mb-2">No charts selected</h5>
              <p className="mb-0">
                Click "Customize Dashboard" to select statistics to display.
              </p>
            </div>
          </div>
        )}
      </div>

      `;

if (oldChartsGrid.test(content)) {
  content = content.replace(oldChartsGrid, newChartsGrid);
}

// ---------------------------------------------------------
// 7. Add configuration modal
// ---------------------------------------------------------
if (!content.includes('{showConfigModal && (')) {
  const configModal = `
      {showConfigModal && (
        <div
          className="modal fade show d-block"
          style={{
            backgroundColor: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(3px)',
            zIndex: 1050
          }}
          tabIndex="-1"
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div
              className="modal-content border-0 shadow-lg"
              style={{ maxHeight: '90vh' }}
            >
              <div className="modal-header bg-white border-bottom">
                <h5 className="modal-title fw-bold">
                  Customize Dashboard
                </h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowConfigModal(false)}
                  aria-label="Close"
                />
              </div>

              <div
                className="modal-body p-4 bg-light"
                style={{ overflowY: 'auto' }}
              >
                <div className="row g-3">
                  {tempConfig.map((item, idx) => (
                    <div className="col-12 col-md-6" key={item.id}>
                      <div className="card border-0 shadow-sm">
                        <div className="card-body p-3 d-flex justify-content-between align-items-center">
                          <div className="form-check form-switch mb-0">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id={\`switch-\${item.id}\`}
                              checked={item.enabled}
                              onChange={e => {
                                setTempConfig(prev =>
                                  prev.map((config, configIndex) =>
                                    configIndex === idx
                                      ? {
                                          ...config,
                                          enabled: e.target.checked
                                        }
                                      : config
                                  )
                                );
                              }}
                            />

                            <label
                              className="form-check-label fw-medium ms-2"
                              htmlFor={\`switch-\${item.id}\`}
                            >
                              {item.title}
                            </label>
                          </div>

                          <select
                            className="form-select form-select-sm w-auto"
                            value={item.chartType}
                            onChange={e => {
                              setTempConfig(prev =>
                                prev.map((config, configIndex) =>
                                  configIndex === idx
                                    ? {
                                        ...config,
                                        chartType: e.target.value
                                      }
                                    : config
                                )
                              );
                            }}
                          >
                            <option value="line">Line</option>
                            <option value="bar">Bar</option>
                            <option value="area">Area</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-footer bg-white border-top">
                <button
                  type="button"
                  className="btn btn-light border fw-medium"
                  onClick={() => {
                    setTempConfig(
                      DEFAULT_CHART_CONFIG.map(item => ({ ...item }))
                    );
                  }}
                >
                  Reset to Default
                </button>

                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-light border fw-medium"
                    onClick={() => setShowConfigModal(false)}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary-modern fw-medium"
                    onClick={() => {
                      const newConfig = tempConfig.map(item => ({
                        ...item
                      }));

                      setChartConfig(newConfig);

                      try {
                        localStorage.setItem(
                          'dashboardChartConfig',
                          JSON.stringify(newConfig)
                        );
                      } catch (error) {
                        console.warn(
                          'Could not save dashboard configuration:',
                          error
                        );
                      }

                      setShowConfigModal(false);
                    }}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
`;

  content = content.replace(
    /(\s*<\/div>\s*\);\s*};\s*\n\s*export default Dashboard;)/,
    `${configModal}$1`
  );
}

// ---------------------------------------------------------
// 8. Write file
// ---------------------------------------------------------
fs.writeFileSync(dashboardPath, content, 'utf-8');

console.log('Dashboard.jsx modified successfully.');