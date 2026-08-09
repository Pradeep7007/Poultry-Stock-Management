import React, { useState, useEffect } from 'react';
// import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { 
  TrendingUp, Package, DollarSign, Activity, Egg, Filter, Syringe, Users, Clock, Settings
} from 'lucide-react';
import { formatDate } from '../utils/dateFormatter';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const Dashboard = () => {
  const [entries, setEntries] = useState([]);
  const [vaccines, setVaccines] = useState([]);
  const [batches, setBatches] = useState([]);
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [dateFilter, setDateFilter] = useState('daily');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustom, setShowCustom] = useState(false);


const DEFAULT_CHART_CONFIG = [
  {
    id: 'eggsProduced',
    title: 'Eggs Produced',
    enabled: false,
    chartType: 'line',
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    formatCurrency: false
  },
  {
    id: 'eggsDamaged',
    title: 'Eggs Damaged',
    enabled: false,
    chartType: 'line',
    color: '#F43F5E',
    bgColor: 'rgba(244, 63, 94, 0.1)',
    formatCurrency: false
  },
  {
    id: 'eggSales',
    title: 'Egg Sales',
    enabled: false,
    chartType: 'line',
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    formatCurrency: false
  },
  {
    id: 'revenue',
    title: 'Revenue',
    enabled: false,
    chartType: 'line',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    formatCurrency: true
  },
  {
    id: 'feedCost',
    title: 'Feed Cost',
    enabled: false,
    chartType: 'line',
    color: '#8B5CF6',
    bgColor: 'rgba(139, 92, 246, 0.1)',
    formatCurrency: true
  },
  {
    id: 'treatmentCost',
    title: 'Treatment Cost',
    enabled: false,
    chartType: 'line',
    color: '#06B6D4',
    bgColor: 'rgba(6, 182, 212, 0.1)',
    formatCurrency: true
  },
  {
    id: 'profit',
    title: 'Profit',
    enabled: false,
    chartType: 'line',
    color: '#4F46E5',
    bgColor: 'rgba(79, 70, 229, 0.1)',
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
    const saved = localStorage.getItem('dashboardChartConfig');
    if (saved) return JSON.parse(saved);
    return DEFAULT_CHART_CONFIG;
  });
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [tempConfig, setTempConfig] = useState([...chartConfig]);
  
  const [henDeaths, setHenDeaths] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eggRes, vaccineRes, batchRes, feedRes, henRes] = await Promise.all([
        api.get('/eggs'),
        api.get('/vaccines'),
        api.get('/batches'),
        api.get('/feed'),
        api.get('/hens')
      ]);
      
      const batchesData = batchRes.data;
      const henDeathsData = henRes.data;

      const dynamicEntries = eggRes.data.map(entry => {
        const batch = batchesData.find(b => b.name === entry.name);
        if (batch) {
          const entryDate = new Date(entry.date).toISOString().split('T')[0];
          const deathsUpToDate = henDeathsData.filter(d => 
            d.batchId === batch._id && new Date(d.date).toISOString().split('T')[0] <= entryDate
          );
          const totalDead = deathsUpToDate.reduce((sum, d) => sum + d.deadToday, 0);
          const aliveHensOnDate = batch.startedHens - totalDead;
          
          return {
            ...entry,
            aliveHens: aliveHensOnDate > 0 ? aliveHensOnDate : 0,
            productionPercentage: aliveHensOnDate > 0 ? (entry.eggsProduced / aliveHensOnDate) * 100 : 0
          };
        }
        return entry;
      });

      setEntries(dynamicEntries);
      setVaccines(vaccineRes.data);
      setBatches(batchesData);
      setFeeds(feedRes.data);
      setHenDeaths(henDeathsData);
    } catch (error) {
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredData = () => {
    let filtered = [...entries];
    const now = new Date();
    
    if (dateFilter === 'daily') {
      const past = new Date(now.setDate(now.getDate() - 7)); // Last 7 days for daily
      filtered = filtered.filter(e => new Date(e.date) >= past);
    } else if (dateFilter === 'weekly') {
      const past = new Date(now.setDate(now.getDate() - 30));
      filtered = filtered.filter(e => new Date(e.date) >= past);
    } else if (dateFilter === 'monthly') {
      const past = new Date(now.setMonth(now.getMonth() - 6));
      filtered = filtered.filter(e => new Date(e.date) >= past);
    } else if (dateFilter === 'yearly') {
      const past = new Date(now.setFullYear(now.getFullYear() - 5));
      filtered = filtered.filter(e => new Date(e.date) >= past);
    } else if (dateFilter === 'custom' && customStart && customEnd) {
      filtered = filtered.filter(e => new Date(e.date) >= new Date(customStart) && new Date(e.date) <= new Date(customEnd));
    }
    
    return filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const filteredEntries = getFilteredData();

  // Metrics
  const totalProduced = filteredEntries.reduce((acc, curr) => acc + curr.eggsProduced, 0);
  // const totalSold = filteredEntries.reduce((acc, curr) => acc + curr.eggsSold, 0);
  // const totalDamaged = filteredEntries.reduce((acc, curr) => acc + (curr.damagedEggs || 0), 0);
  const totalRevenue = filteredEntries.reduce((acc, curr) => acc + curr.salesAmount, 0);
  const totalProfit = filteredEntries.reduce((acc, curr) => acc + (curr.profit || 0), 0);
  
  const overallProduced = entries.reduce((acc, curr) => acc + curr.eggsProduced, 0);
  const overallSold = entries.reduce((acc, curr) => acc + curr.eggsSold, 0);
  const overallDamaged = entries.reduce((acc, curr) => acc + (curr.damagedEggs || 0), 0);
  const currentStock = overallProduced - overallSold - overallDamaged;
  
  const avgProductionPercentage = filteredEntries.length > 0 
    ? (filteredEntries.reduce((acc, curr) => acc + (curr.productionPercentage || 0), 0) / filteredEntries.length) 
    : 0;

  // --- Operational Costs ---
  const activeBatch = batches.find(b => b.status === 'Active');
  const totalMedicineCost = vaccines.filter(v => v.type === 'Medicine').reduce((acc, curr) => acc + curr.cost, 0);
  const totalVaccineCost = vaccines.filter(v => v.type === 'Vaccine').reduce((acc, curr) => acc + curr.cost, 0);
  const totalFeedCost = feeds.reduce((acc, curr) => acc + curr.feedCost, 0);
  const totalOperationalCost = totalMedicineCost + totalVaccineCost + totalFeedCost;
  const vaccineCostPerHen = activeBatch && activeBatch.aliveHens > 0 
    ? ((totalMedicineCost + totalVaccineCost) / activeBatch.aliveHens).toFixed(2) 
    : '0.00';

  // --- Current Batch Timeline ---
  const activeVaccines = activeBatch 
    ? vaccines.filter(v => v.batchId === activeBatch._id).sort((a,b) => new Date(a.date) - new Date(b.date))
    : [];

  const isWithinFilter = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    if (dateFilter === 'daily') {
      const past = new Date(now.setDate(now.getDate() - 7));
      return d >= past;
    } else if (dateFilter === 'weekly') {
      const past = new Date(now.setDate(now.getDate() - 30));
      return d >= past;
    } else if (dateFilter === 'monthly') {
      const past = new Date(now.setMonth(now.getMonth() - 6));
      return d >= past;
    } else if (dateFilter === 'yearly') {
      const past = new Date(now.setFullYear(now.getFullYear() - 5));
      return d >= past;
    } else if (dateFilter === 'custom' && customStart && customEnd) {
      return d >= new Date(customStart) && d <= new Date(customEnd);
    }
    return true;
  };

  const groupDataByFilter = () => {
    const grouped = {};
    const getDateKey = (dateStr) => {
      const d = new Date(dateStr);
      if (dateFilter === 'weekly') {
        const firstDay = new Date(d.setDate(d.getDate() - d.getDay())).toISOString();
        return `Week of ${formatDate(firstDay)}`;
      } else if (dateFilter === 'monthly') {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      } else if (dateFilter === 'yearly') {
        return `${d.getFullYear()}`;
      }
      return formatDate(dateStr);
    };

    const initGroup = (key) => {
      if (!grouped[key]) {
        grouped[key] = { eggsProduced: 0, eggSales: 0, eggsDamaged: 0, profit: 0, revenue: 0, feedCost: 0, treatmentCost: 0, mortality: 0 };
      }
    };

    filteredEntries.forEach(e => {
      const key = getDateKey(e.date);
      initGroup(key);
      grouped[key].eggsProduced += e.eggsProduced || 0;
      grouped[key].eggSales += e.eggsSold || 0;
      grouped[key].eggsDamaged += e.damagedEggs || 0;
      grouped[key].profit += e.profit || 0;
      grouped[key].revenue += e.salesAmount || 0;
    });

    feeds.forEach(e => {
       if (!isWithinFilter(e.date)) return;
       const key = getDateKey(e.date);
       initGroup(key);
       grouped[key].feedCost += e.feedCost || 0;
    });

    vaccines.forEach(e => {
       if (!isWithinFilter(e.date)) return;
       const key = getDateKey(e.date);
       initGroup(key);
       grouped[key].treatmentCost += e.cost || 0;
    });

    henDeaths.forEach(e => {
       if (!isWithinFilter(e.date)) return;
       const key = getDateKey(e.date);
       initGroup(key);
       grouped[key].mortality += e.deadToday || 0;
    });

    return grouped;
  };

  const groupedData = groupDataByFilter();
  const labels = Object.keys(groupedData);

  const getChartOptions = (yAxisTitle, formatCurrency = false) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        mode: 'index', intersect: false,
        backgroundColor: 'rgba(17, 24, 39, 0.9)', titleColor: '#fff', padding: 12, cornerRadius: 8,
        callbacks: {
          label: (context) => {
            let val = context.raw;
            return formatCurrency ? `${context.dataset.label}: ₹${val.toLocaleString(undefined, {minimumFractionDigits: 2})}` : `${context.dataset.label}: ${val.toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      x: { grid: { display: false } },
      y: { 
        title: { display: true, text: yAxisTitle },
        grid: { borderDash: [4, 4], color: 'rgba(0,0,0,0.05)' },
        ticks: {
          callback: (value) => formatCurrency ? `₹${value}` : value
        }
      }
    },
    interaction: { mode: 'nearest', axis: 'x', intersect: false }
  });

  const renderChartComponent = (configItem, labels, groupedData) => {
    const dataKey = configItem.id;
    const dataVals = labels.map(l => groupedData[l][dataKey] || 0);

    const isArea = configItem.chartType === 'area';
    // const isLine = configItem.chartType === 'line';
    
    const dataset = {
      label: configItem.title,
      data: dataVals,
      borderColor: configItem.color,
      backgroundColor: (isArea || configItem.chartType === 'bar') ? configItem.bgColor : configItem.color,
      fill: isArea,
      tension: 0.4, borderWidth: 2, pointRadius: 2, pointHoverRadius: 6,
      borderRadius: configItem.chartType === 'bar' ? 4 : 0,
      barThickness: 'flex', maxBarThickness: 40
    };

    const dataObj = { labels, datasets: [dataset] };
    const options = getChartOptions(configItem.title, configItem.formatCurrency);

    if (configItem.chartType === 'bar') {
      return <Bar data={dataObj} options={options} />;
    } else {
      return <Line data={dataObj} options={options} />;
    }
  };

  if (loading) {
    return <div className="d-flex justify-content-center align-items-center h-100 p-5"><div className="spinner-border text-primary"></div></div>;
  }

  return (
    <>
      <div className="animate-slide-up pb-5">
        <div className="d-flex flex-column flex-xl-row justify-content-between align-items-xl-end mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">Enterprise Analytics</h2>
          <p className="text-muted mb-0">Comprehensive overview of poultry operations.</p>
        </div>
        
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-light border d-inline-flex align-items-center gap-2 fw-medium" onClick={() => { setTempConfig([...chartConfig]); setShowConfigModal(true); }}>
            <Settings size={18} /> Customize Dashboard
          </button>
          <div className="d-flex flex-wrap gap-2 align-items-center bg-white p-2 rounded-3 border saas-card">
          <Filter size={18} className="text-muted ms-2" />
          <select 
            className="form-select border-0 bg-transparent fw-medium" 
            style={{ width: 'auto', minWidth: '130px', boxShadow: 'none' }}
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setShowCustom(e.target.value === 'custom');
            }}
          >
            <option value="daily">Daily View</option>
            <option value="weekly">Weekly View</option>
            <option value="monthly">Monthly View</option>
            <option value="yearly">Yearly View</option>
            <option value="custom">Custom Range</option>
          </select>

          {showCustom && (
            <div className="d-flex align-items-center gap-2 border-start ps-3">
              <input type="date" className="form-control form-control-sm border-0" value={customStart} onChange={e => setCustomStart(e.target.value)} />
              <span className="text-muted">to</span>
              <input type="date" className="form-control form-control-sm border-0" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Production KPIs */}
      <div className="row g-4 mb-4">
        {[
          { title: 'Total Revenue', value: `₹${totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}`, icon: <DollarSign size={24} />, color: 'primary' },
          { title: 'Total Profit', value: `₹${totalProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}`, icon: <TrendingUp size={24} />, color: 'success' },
          { title: 'Eggs Produced', value: totalProduced.toLocaleString(), icon: <Egg size={24} />, color: 'info' },
          { title: 'Production %', value: `${avgProductionPercentage.toFixed(2)}%`, icon: <Activity size={24} />, color: 'danger' },
          { title: 'Current Stock', value: currentStock.toLocaleString(), icon: <Package size={24} />, color: 'warning' }
        ].map((stat, idx) => (
          <div className="col-12 col-sm-6 col-xl flex-grow-1" key={idx}>
            <div className="saas-card p-4 h-100 d-flex flex-column justify-content-between border-0" style={{ borderTop: `4px solid var(--${stat.color})` }}>
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div className={`text-${stat.color} bg-${stat.color} bg-opacity-10 rounded-3 d-flex align-items-center justify-content-center`} style={{ width: '48px', height: '48px' }}>
                  {stat.icon}
                </div>
              </div>
              <div>
                <p className="text-muted small fw-semibold text-uppercase mb-1">{stat.title}</p>
                <h3 className="fw-bold m-0 text-dark">{stat.value}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Operational KPIs */}
      <div className="row g-4 mb-5">
        {[
          { title: 'Total Operational Cost', value: `₹${totalOperationalCost.toLocaleString()}`, icon: <TrendingUp size={24} />, color: 'danger' },
          { title: 'Total Medicine Cost', value: `₹${totalMedicineCost.toLocaleString()}`, icon: <Activity size={24} />, color: 'primary' },
          { title: 'Total Vaccine Cost', value: `₹${totalVaccineCost.toLocaleString()}`, icon: <Syringe size={24} />, color: 'success' },
          { title: 'Treatment / Hen', value: `₹${vaccineCostPerHen}`, icon: <Users size={24} />, color: 'info' },
        ].map((stat, idx) => (
          <div className="col-12 col-sm-6 col-xl flex-grow-1" key={`op-${idx}`}>
            <div className="saas-card p-4 h-100 d-flex flex-column justify-content-between border-0" style={{ borderTop: `4px solid var(--${stat.color})` }}>
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div className={`text-${stat.color} bg-${stat.color} bg-opacity-10 rounded-3 d-flex align-items-center justify-content-center`} style={{ width: '48px', height: '48px' }}>
                  {stat.icon}
                </div>
              </div>
              <div>
                <p className="text-muted small fw-semibold text-uppercase letter-spacing-1 mb-1">{stat.title}</p>
                <h3 className="fw-bold m-0 text-dark">{stat.value}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="row g-4">
        {chartConfig.filter(c => c.enabled).map((configItem) => (
          <div className="col-12 col-xl-6" key={configItem.id}>
            <div className="saas-card p-4 h-100">
              <h5 className="fw-bold mb-4">{configItem.title} Graph</h5>
              <div style={{ height: '350px' }}>
                {renderChartComponent(configItem, labels, groupedData)}
              </div>
            </div>
          </div>
        ))}
        {chartConfig.filter(c => c.enabled).length === 0 && (
          <div className="col-12">
            <div className="saas-card p-5 text-center text-muted">
              <h5 className="mb-2">No charts selected</h5>
              <p className="mb-0">Click "Customize Dashboard" to select statistics to display.</p>
            </div>
          </div>
        )}
      </div>

      {/* Timeline Section */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="saas-card p-4">
            <h5 className="fw-bold mb-4 d-flex align-items-center gap-2"><Clock size={20} className="text-primary"/> Current Batch Timeline (Treatments)</h5>
            {activeBatch ? (
              activeVaccines.length > 0 ? (
                <div className="timeline-container px-3 py-2" style={{ borderLeft: '3px solid var(--primary-light)' }}>
                  {activeVaccines.map((v, i) => {
                    const daysSinceStart = Math.floor((new Date(v.date) - new Date(activeBatch.startDate)) / (1000 * 60 * 60 * 24));
                    return (
                      <div key={v._id} className="position-relative mb-4 ps-4">
                        <div className={`position-absolute rounded-circle bg-${v.type === 'Vaccine' ? 'success' : 'primary'} border border-3 border-white`} style={{ width: '16px', height: '16px', left: '-25.5px', top: '5px' }}></div>
                        <h6 className="fw-bold text-dark mb-1">Day {Math.max(0, daysSinceStart)} - {v.medicineName}</h6>
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <span className={`badge bg-${v.type === 'Vaccine' ? 'success' : 'primary'} bg-opacity-10 text-${v.type === 'Vaccine' ? 'success' : 'primary'} border border-${v.type === 'Vaccine' ? 'success' : 'primary'} rounded-pill px-2 py-0 small`}>{v.type}</span>
                          <span className="text-muted small fw-semibold">{formatDate(v.date)}</span>
                        </div>
                        <p className="text-muted small mb-0 fw-medium">Dosage: {v.dosage} | Cost: ₹{v.cost}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted small">No treatments recorded for this batch yet.</p>
              )
            ) : (
              <p className="text-muted small">No active batch to track.</p>
            )}
          </div>
        </div>
      </div>
    </div>
      
      {showConfigModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)', zIndex: 1050 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg" style={{ maxHeight: '90vh' }}>
              <div className="modal-header bg-white border-bottom">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2"><Settings size={20} className="text-primary"/> Customize Dashboard</h5>
                <button type="button" className="btn-close" onClick={() => setShowConfigModal(false)}></button>
              </div>
              <div className="modal-body p-4 bg-light" style={{ overflowY: 'auto' }}>
                <div className="row g-3">
                  {tempConfig.map((item, idx) => (
                    <div className="col-12 col-md-6" key={item.id}>
                      <div className="card border-0 shadow-sm h-100">
                        <div className="card-body p-3 d-flex justify-content-between align-items-center">
                          <div className="form-check form-switch mb-0">
                            <input 
                              className="form-check-input" type="checkbox" id={`switch-${item.id}`} 
                              checked={item.enabled} 
                              onChange={(e) => {
                                const newConfig = [...tempConfig];
                                newConfig[idx].enabled = e.target.checked;
                                setTempConfig(newConfig);
                              }}
                            />
                            <label className="form-check-label fw-medium ms-2" htmlFor={`switch-${item.id}`}>{item.title}</label>
                          </div>
                          <select 
                            className="form-select form-select-sm w-auto fw-medium border-0 bg-light"
                            value={item.chartType}
                            onChange={(e) => {
                                const newConfig = [...tempConfig];
                                newConfig[idx].chartType = e.target.value;
                                setTempConfig(newConfig);
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
                <button type="button" className="btn btn-light border fw-medium" onClick={() => { setTempConfig(DEFAULT_CHART_CONFIG); }}>Reset to Default</button>
                <div className="ms-auto d-flex gap-2">
                  <button type="button" className="btn btn-light border fw-medium" onClick={() => setShowConfigModal(false)}>Cancel</button>
                  <button type="button" className="btn btn-primary-modern fw-medium" onClick={() => {
                    setChartConfig(tempConfig);
                    localStorage.setItem('dashboardChartConfig', JSON.stringify(tempConfig));
                    setShowConfigModal(false);
                  }}>Save Changes</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Dashboard;
