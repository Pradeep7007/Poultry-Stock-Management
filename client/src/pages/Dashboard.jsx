import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { 
  TrendingUp, Package, DollarSign, Activity, Egg, Calendar, Filter, Syringe, Users, Clock
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
  
  const [dateFilter, setDateFilter] = useState('monthly');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustom, setShowCustom] = useState(false);

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
    filteredEntries.forEach(e => {
      const d = new Date(e.date);
      let key = formatDate(e.date); // daily
      
      if (dateFilter === 'weekly') {
        const firstDay = new Date(d.setDate(d.getDate() - d.getDay())).toISOString();
        key = `Week of ${formatDate(firstDay)}`;
      } else if (dateFilter === 'monthly') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      } else if (dateFilter === 'yearly') {
        key = `${d.getFullYear()}`;
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

      {/* Charts Grid */}
      <div className="row g-4">
        
        {/* 1. Production Chart */}
        <div className="col-12 col-xl-6">
          <div className="saas-card p-4 h-100">
            <h5 className="fw-bold mb-4">Egg Production Graph</h5>
            <div style={{ height: '350px' }}>
              <Line 
                data={{
                  labels,
                  datasets: [{
                    label: 'Eggs Produced',
                    data: labels.map(l => groupedData[l].produced),
                    borderColor: '#3B82F6', backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true, tension: 0.4, borderWidth: 2, pointRadius: 2, pointHoverRadius: 6
                  }]
                }} 
                options={getChartOptions('Total Eggs')} 
              />
            </div>
          </div>
        </div>

        {/* 2. Sales Chart */}
        <div className="col-12 col-xl-6">
          <div className="saas-card p-4 h-100">
            <h5 className="fw-bold mb-4">Egg Sales Graph</h5>
            <div style={{ height: '350px' }}>
              <Bar 
                data={{
                  labels,
                  datasets: [{
                    label: 'Eggs Sold',
                    data: labels.map(l => groupedData[l].sold),
                    backgroundColor: '#10B981', borderRadius: 4, barThickness: 'flex', maxBarThickness: 40
                  }]
                }} 
                options={getChartOptions('Total Eggs Sold')} 
              />
            </div>
          </div>
        </div>

        {/* 3. Profit Graph */}
        <div className="col-12 col-xl-6">
          <div className="saas-card p-4 h-100">
            <h5 className="fw-bold mb-4">Egg Profit Graph</h5>
            <div style={{ height: '350px' }}>
              <Line 
                data={{
                  labels,
                  datasets: [{
                    label: 'Total Profit (₹)',
                    data: labels.map(l => groupedData[l].profit),
                    borderColor: '#4F46E5', backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    fill: true, tension: 0.4, borderWidth: 2, pointRadius: 2, pointHoverRadius: 6
                  }]
                }} 
                options={getChartOptions('Profit Amount (₹)', true)} 
              />
            </div>
          </div>
        </div>

        {/* 4. Damaged Eggs Chart */}
        <div className="col-12 col-xl-6">
          <div className="saas-card p-4 h-100">
            <h5 className="fw-bold mb-4">Egg Damaged Graph</h5>
            <div style={{ height: '350px' }}>
              <Bar 
                data={{
                  labels,
                  datasets: [{
                    label: 'Damaged Eggs',
                    data: labels.map(l => groupedData[l].damaged),
                    backgroundColor: '#F43F5E', borderRadius: 4, barThickness: 'flex', maxBarThickness: 40
                  }]
                }} 
                options={getChartOptions('Total Damaged Eggs')} 
              />
            </div>
          </div>
        </div>

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
  );
};

export default Dashboard;
