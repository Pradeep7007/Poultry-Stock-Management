import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { 
  TrendingUp, Package, DollarSign, Activity, Egg, Calendar, Filter, Syringe, Users, Clock, Settings, X, ArrowUp, ArrowDown
} from 'lucide-react';
import { formatDate } from '../utils/dateFormatter';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const defaultChartConfig = [
  { id: 'eggsProduced', label: 'Eggs Produced', enabled: true, chartType: 'line' },
  { id: 'eggsDamaged', label: 'Eggs Damaged', enabled: true, chartType: 'bar' },
  { id: 'eggSales', label: 'Egg Sales', enabled: true, chartType: 'bar' },
  { id: 'revenue', label: 'Revenue', enabled: true, chartType: 'area' },
  { id: 'profit', label: 'Profit', enabled: true, chartType: 'line' },
  { id: 'feedConsumption', label: 'Feed Consumption', enabled: false, chartType: 'bar' },
  { id: 'feedCost', label: 'Feed Cost', enabled: false, chartType: 'line' },
  { id: 'medicineCost', label: 'Medicine & Vaccination Cost', enabled: false, chartType: 'bar' },
  { id: 'mortality', label: 'Mortality', enabled: false, chartType: 'line' },
  { id: 'expenses', label: 'Total Expenses', enabled: false, chartType: 'area' },
];

const Dashboard = () => {
  const [entries, setEntries] = useState([]);
  const [vaccines, setVaccines] = useState([]);
  const [batches, setBatches] = useState([]);
  const [feeds, setFeeds] = useState([]);
  const [deaths, setDeaths] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [dateFilter, setDateFilter] = useState('monthly');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const [chartConfig, setChartConfig] = useState(() => {
    const saved = localStorage.getItem('dashboard_chart_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge missing keys in case of update
        const merged = defaultChartConfig.map(def => {
          const found = parsed.find(p => p.id === def.id);
          return found ? { ...def, ...found } : def;
        });
        // Keep custom order
        const ordered = [];
        parsed.forEach(p => {
          const item = merged.find(m => m.id === p.id);
          if (item) ordered.push(item);
        });
        merged.forEach(m => {
          if (!ordered.find(o => o.id === m.id)) ordered.push(m);
        });
        return ordered;
      } catch(e) {}
    }
    return defaultChartConfig;
  });
  
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [tempConfig, setTempConfig] = useState([]);

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
      setDeaths(henDeathsData);
    } catch (error) {
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredData = (items, dateField = 'date') => {
    let filtered = [...items];
    const now = new Date();
    let start = new Date(0);
    let end = new Date();
    
    if (dateFilter === 'daily') {
      start = new Date(now.setDate(now.getDate() - 7));
    } else if (dateFilter === 'weekly') {
      start = new Date(now.setDate(now.getDate() - 30));
    } else if (dateFilter === 'monthly') {
      start = new Date(now.setMonth(now.getMonth() - 6));
    } else if (dateFilter === 'yearly') {
      start = new Date(now.setFullYear(now.getFullYear() - 5));
    } else if (dateFilter === 'custom' && customStart && customEnd) {
      start = new Date(customStart);
      end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
    }

    filtered = filtered.filter(e => {
      const d = new Date(e[dateField]);
      if (dateFilter === 'custom') return d >= start && d <= end;
      return d >= start;
    });
    
    return filtered.sort((a, b) => new Date(a[dateField]) - new Date(b[dateField]));
  };

  const filteredEntries = getFilteredData(entries);

  // Metrics
  const totalProduced = filteredEntries.reduce((acc, curr) => acc + curr.eggsProduced, 0);
  const totalSold = filteredEntries.reduce((acc, curr) => acc + curr.eggsSold, 0);
  const totalDamaged = filteredEntries.reduce((acc, curr) => acc + (curr.damagedEggs || 0), 0);
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

  // Chart Grouping
  const groupDataByFilter = () => {
    const grouped = {};
    
    const getKey = (dateStr) => {
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
        grouped[key] = { 
          produced: 0, sold: 0, damaged: 0, profit: 0, revenue: 0,
          feedConsumption: 0, feedCost: 0,
          medicineCost: 0, mortality: 0, expenses: 0
        };
      }
      return grouped[key];
    };

    filteredEntries.forEach(e => {
      const g = initGroup(getKey(e.date));
      g.produced += e.eggsProduced || 0;
      g.sold += e.eggsSold || 0;
      g.damaged += e.damagedEggs || 0;
      g.profit += e.profit || 0;
      g.revenue += e.salesAmount || 0;
    });

    getFilteredData(feeds).forEach(f => {
      const g = initGroup(getKey(f.date));
      g.feedConsumption += f.quantity || 0;
      g.feedCost += f.feedCost || 0;
      g.expenses += f.feedCost || 0;
    });

    getFilteredData(vaccines).forEach(v => {
      const g = initGroup(getKey(v.date));
      g.medicineCost += v.cost || 0;
      g.expenses += v.cost || 0;
    });

    getFilteredData(deaths).forEach(d => {
      const g = initGroup(getKey(d.date));
      g.mortality += d.deadToday || 0;
    });

    // Sort keys based on date (very simplistic sort, keys like "2024-05" sort naturally)
    return Object.keys(grouped).sort().reduce((acc, key) => {
      acc[key] = grouped[key];
      return acc;
    }, {});
  };

  const groupedData = groupDataByFilter();
  const labels = Object.keys(groupedData);

  const getDatasetProps = (id, label, data, type) => {
    let borderColor = '#3B82F6';
    let bgColor = '#3B82F6';
    let isCurrency = false;
    
    switch(id) {
      case 'eggsProduced': borderColor = '#3B82F6'; bgColor = '#3B82F6'; break;
      case 'eggSales': borderColor = '#10B981'; bgColor = '#10B981'; break;
      case 'eggsDamaged': borderColor = '#F43F5E'; bgColor = '#F43F5E'; break;
      case 'profit': borderColor = '#4F46E5'; bgColor = '#4F46E5'; isCurrency=true; break;
      case 'revenue': borderColor = '#8B5CF6'; bgColor = '#8B5CF6'; isCurrency=true; break;
      case 'feedConsumption': borderColor = '#F59E0B'; bgColor = '#F59E0B'; break;
      case 'feedCost': borderColor = '#D97706'; bgColor = '#D97706'; isCurrency=true; break;
      case 'medicineCost': borderColor = '#06B6D4'; bgColor = '#06B6D4'; isCurrency=true; break;
      case 'mortality': borderColor = '#DC2626'; bgColor = '#DC2626'; break;
      case 'expenses': borderColor = '#EC4899'; bgColor = '#EC4899'; isCurrency=true; break;
    }
    
    const ds = {
      label,
      data,
      borderColor,
      backgroundColor: bgColor,
      borderWidth: 2,
    };
    
    if (type === 'line' || type === 'area') {
      ds.fill = type === 'area';
      ds.tension = 0.4;
      ds.pointRadius = 2;
      ds.pointHoverRadius = 6;
      // Convert hex/rgb to rgba for area fill
      if (type === 'area') {
        if (bgColor.startsWith('#')) {
          const r = parseInt(bgColor.slice(1, 3), 16), g = parseInt(bgColor.slice(3, 5), 16), b = parseInt(bgColor.slice(5, 7), 16);
          ds.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.1)`;
        }
      } else {
        ds.backgroundColor = 'transparent';
      }
    } else if (type === 'bar') {
      ds.borderRadius = 4;
      ds.barThickness = 'flex';
      ds.maxBarThickness = 40;
    }
    
    return { dataset: ds, isCurrency };
  };

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

  const openConfigModal = () => {
    setTempConfig(JSON.parse(JSON.stringify(chartConfig)));
    setShowConfigModal(true);
  };

  const saveConfig = () => {
    setChartConfig(tempConfig);
    localStorage.setItem('dashboard_chart_config', JSON.stringify(tempConfig));
    setShowConfigModal(false);
    toast.success('Dashboard layout saved');
  };

  const resetConfig = () => {
    setTempConfig(JSON.parse(JSON.stringify(defaultChartConfig)));
  };

  const moveConfigItem = (index, direction) => {
    if (index + direction < 0 || index + direction >= tempConfig.length) return;
    const newConfig = [...tempConfig];
    const temp = newConfig[index];
    newConfig[index] = newConfig[index + direction];
    newConfig[index + direction] = temp;
    setTempConfig(newConfig);
  };

  if (loading) {
    return <div className="d-flex justify-content-center align-items-center h-100 p-5"><div className="spinner-border text-primary"></div></div>;
  }

  return (
    <div className="animate-slide-up pb-5">
      <div className="d-flex flex-column flex-xl-row justify-content-between align-items-xl-end mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">Enterprise Analytics</h2>
          <p className="text-muted mb-0">Comprehensive overview of poultry operations.</p>
        </div>
        
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <div className="d-flex align-items-center bg-white p-2 rounded-3 border saas-card">
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
          <button className="btn btn-white border bg-white saas-card px-3 py-2 fw-medium d-flex align-items-center gap-2 text-dark" onClick={openConfigModal}>
            <Settings size={18} /> Customize
          </button>
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
                <p className="text-muted small fw-semibold text-uppercase letter-spacing-1 mb-1">{stat.title}</p>
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

      {/* Charts Grid - Dynamic */}
      <div className="row g-4">
        {chartConfig.filter(c => c.enabled).map(configItem => {
          const dataMap = {
            eggsProduced: l => groupedData[l]?.produced || 0,
            eggsDamaged: l => groupedData[l]?.damaged || 0,
            eggSales: l => groupedData[l]?.sold || 0,
            revenue: l => groupedData[l]?.revenue || 0,
            profit: l => groupedData[l]?.profit || 0,
            feedConsumption: l => groupedData[l]?.feedConsumption || 0,
            feedCost: l => groupedData[l]?.feedCost || 0,
            medicineCost: l => groupedData[l]?.medicineCost || 0,
            mortality: l => groupedData[l]?.mortality || 0,
            expenses: l => groupedData[l]?.expenses || 0,
          };
          
          const rawData = labels.map(dataMap[configItem.id]);
          const { dataset, isCurrency } = getDatasetProps(configItem.id, configItem.label, rawData, configItem.chartType);
          
          const chartData = { labels, datasets: [dataset] };
          const options = getChartOptions(`${configItem.label} ${isCurrency ? '(₹)' : ''}`, isCurrency);
          
          return (
            <div className="col-12 col-xl-6" key={configItem.id}>
              <div className="saas-card p-4 h-100">
                <h5 className="fw-bold mb-4">{configItem.label} Graph</h5>
                <div style={{ height: '350px' }}>
                  {configItem.chartType === 'bar' ? (
                    <Bar data={chartData} options={options} />
                  ) : (
                    <Line data={chartData} options={options} />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {chartConfig.filter(c => c.enabled).length === 0 && (
          <div className="col-12 text-center py-5">
            <p className="text-muted">No charts selected. Click <b>Customize</b> to add charts.</p>
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
                  {activeVaccines.map((v) => {
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

      {/* Customize Modal */}
      {showConfigModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-light border-bottom-0 py-3">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2"><Settings size={20} className="text-primary"/> Customize Dashboard</h5>
                <button type="button" className="btn-close" onClick={() => setShowConfigModal(false)}></button>
              </div>
              <div className="modal-body p-0 bg-light">
                <div className="p-4">
                  <p className="text-muted mb-4 small">Select which charts to display on your dashboard, choose their type, and reorder them as needed.</p>
                  
                  <div className="d-flex flex-column gap-2" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    {tempConfig.map((item, idx) => (
                      <div key={item.id} className="d-flex align-items-center justify-content-between p-3 bg-white rounded-3 border shadow-sm">
                        <div className="d-flex align-items-center gap-3">
                          <div className="form-check form-switch mb-0">
                            <input 
                              className="form-check-input fs-5 cursor-pointer" 
                              type="checkbox" 
                              checked={item.enabled}
                              onChange={(e) => {
                                const newConfig = [...tempConfig];
                                newConfig[idx].enabled = e.target.checked;
                                setTempConfig(newConfig);
                              }}
                            />
                          </div>
                          <span className="fw-medium text-dark">{item.label}</span>
                        </div>
                        <div className="d-flex align-items-center gap-3">
                          <select 
                            className="form-select form-select-sm fw-medium"
                            style={{ width: '110px' }}
                            value={item.chartType}
                            onChange={(e) => {
                              const newConfig = [...tempConfig];
                              newConfig[idx].chartType = e.target.value;
                              setTempConfig(newConfig);
                            }}
                          >
                            <option value="line">Line</option>
                            <option value="area">Area</option>
                            <option value="bar">Bar</option>
                          </select>
                          <div className="d-flex flex-column">
                            <button 
                              className="btn btn-link p-0 text-muted" 
                              disabled={idx === 0}
                              onClick={() => moveConfigItem(idx, -1)}
                            >
                              <ArrowUp size={16} />
                            </button>
                            <button 
                              className="btn btn-link p-0 text-muted" 
                              disabled={idx === tempConfig.length - 1}
                              onClick={() => moveConfigItem(idx, 1)}
                            >
                              <ArrowDown size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer border-top-0 bg-light">
                <button type="button" className="btn btn-light fw-medium border" onClick={resetConfig}>Reset to Default</button>
                <button type="button" className="btn btn-primary fw-medium px-4" onClick={saveConfig}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
