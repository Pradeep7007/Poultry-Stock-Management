import React, { useState, useEffect } from 'react';
import { useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { KEYS, fetchFeed, fetchEggs, fetchBatches } from '../services/queries';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  Plus, Edit2, Trash2, Search, Download, Printer, ChevronLeft, ChevronRight,
  TrendingUp, Calendar, AlertCircle, ShoppingBag, DollarSign, Database
} from 'lucide-react';
import { formatDate } from '../utils/dateFormatter';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const FeedManagement = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();
  const { currentUserName } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const getInitialFormData = () => ({
    id: '',
    name: '',
    date: new Date().toISOString().split('T')[0],
    currentFeedWeightInSilo: '',
    purchasedFeedWeightInSilo: '',
    feedWeight: '',
    feedCost: '',
    feedType: '',
    supplier: '',
    enteredBy: currentUserName
  });

  const [formData, setFormData] = useState(getInitialFormData);

  // Keep enteredBy synced with logged-in user when creating new entry
  useEffect(() => {
    if (!isEditing && (!formData.id || !formData.enteredBy)) {
      setFormData(prev => ({
        ...prev,
        enteredBy: currentUserName || ''
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserName, isEditing, showForm]);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [chartType, setChartType] = useState('line');

  const results = useQueries({
    queries: [
      { queryKey: KEYS.FEED, queryFn: fetchFeed },
      { queryKey: KEYS.EGGS, queryFn: fetchEggs },
      { queryKey: KEYS.BATCHES, queryFn: fetchBatches }
    ]
  });

  const loading = results.some(r => r.isLoading);
  const isError = results.some(r => r.isError);
  if (isError) toast.error('Failed to load feed data');

  const entries = results[0].data || [];
  const eggEntries = results[1].data || [];
  const activeBatches = (results[2].data || []).filter(b => b.status === 'Active');

  const handleResetForm = () => {
    setFormData(getInitialFormData());
    setIsEditing(false);
    setShowForm(false);
  };

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/feed', payload),
    onSuccess: (res, payload) => {
      if (res.data.sheetSync === false) {
        toast.success(res.data.message);
        addNotification('warning', 'Feed Sync Warning', res.data.message);
      } else {
        toast.success('Feed entry added successfully!');
        addNotification('success', 'Feed Record Created', `Added feed entry for ${payload.name}: ${payload.feedWeight || payload.purchasedFeedWeightInSilo} kg`);
      }
      queryClient.invalidateQueries({ queryKey: KEYS.FEED });
      handleResetForm();
    },
    onError: (error) => {
      const errMsg = error.response?.data?.message || 'Something went wrong while saving feed record';
      toast.error(errMsg);
      addNotification('error', 'Feed Creation Failed', errMsg);
    },
    onSettled: () => setIsSubmitting(false)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/feed/${id}`, payload),
    onSuccess: (res) => {
      toast.success('Feed entry updated!');
      addNotification('success', 'Feed Record Updated', `Updated feed entry for ${res.data?.name || ''}`);
      queryClient.invalidateQueries({ queryKey: KEYS.FEED });
      handleResetForm();
    },
    onError: (error) => {
      const errMsg = error.response?.data?.message || 'Failed to update record';
      toast.error(errMsg);
      addNotification('error', 'Feed Update Failed', errMsg);
    },
    onSettled: () => setIsSubmitting(false)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/feed/${id}`),
    onSuccess: () => {
      toast.success('Record deleted');
      addNotification('warning', 'Feed Record Deleted', 'A feed record has been removed.');
      queryClient.invalidateQueries({ queryKey: KEYS.FEED });
    },
    onError: () => {
      toast.error('Failed to delete record');
      addNotification('error', 'Feed Delete Failed', 'Could not delete the feed record.');
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const currentWeight = Number(formData.currentFeedWeightInSilo || 0);
    const purchasedWeight = Number(formData.purchasedFeedWeightInSilo || 0);
    const totalWeight = purchasedWeight > 0 ? purchasedWeight : (formData.feedWeight ? Number(formData.feedWeight) : currentWeight);

    const payload = {
      name: formData.name,
      date: formData.date,
      currentFeedWeightInSilo: currentWeight,
      purchasedFeedWeightInSilo: purchasedWeight,
      feedWeight: totalWeight,
      feedCost: Number(formData.feedCost || 0),
      feedType: formData.feedType || '',
      supplier: formData.supplier || '',
      enteredBy: formData.enteredBy || currentUserName
    };

    if (isEditing) {
      updateMutation.mutate({ id: formData.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (entry) => {
    setFormData({
      id: entry._id,
      name: entry.name,
      date: new Date(entry.date).toISOString().split('T')[0],
      currentFeedWeightInSilo: entry.currentFeedWeightInSilo !== undefined ? entry.currentFeedWeightInSilo : '',
      purchasedFeedWeightInSilo: entry.purchasedFeedWeightInSilo !== undefined ? entry.purchasedFeedWeightInSilo : entry.feedWeight || '',
      feedWeight: entry.feedWeight || '',
      feedCost: entry.feedCost || '',
      feedType: entry.feedType || '',
      supplier: entry.supplier || '',
      enteredBy: entry.enteredBy || currentUserName
    });
    setIsEditing(true);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this feed record?')) {
      deleteMutation.mutate(id);
    }
  };

  // --- Metrics ---
  const totalPurchasedWeight = entries.reduce((acc, curr) => acc + (curr.purchasedFeedWeightInSilo || curr.feedWeight || 0), 0);
  const totalCurrentSiloWeight = entries.reduce((acc, curr) => acc + (curr.currentFeedWeightInSilo || 0), 0);
  const totalCost = entries.reduce((acc, curr) => acc + (curr.feedCost || 0), 0);
  const avgCostPerKg = totalPurchasedWeight > 0 ? (totalCost / totalPurchasedWeight).toFixed(2) : '0.00';

  const totalEggs = eggEntries.reduce((acc, curr) => acc + (curr.eggsProduced || 0), 0);
  const feedCostPerEgg = totalEggs > 0 ? (totalCost / totalEggs).toFixed(2) : '0.00';

  // --- Tables ---
  const searchedData = entries.filter(e =>
    e.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.supplier && e.supplier.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (e.enteredBy && e.enteredBy.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(searchedData.length / itemsPerPage) || 1;
  const tableData = searchedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(searchedData.map(e => ({
      Batch: e.name,
      Date: formatDate(e.date),
      'Current Silo Weight (KG)': e.currentFeedWeightInSilo || 0,
      'Purchased Silo Weight (KG)': e.purchasedFeedWeightInSilo || e.feedWeight || 0,
      Supplier: e.supplier || '-',
      'Feed Cost (INR)': e.feedCost || 0,
      'Entered By': e.enteredBy || '-'
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Feed_Management");
    XLSX.writeFile(wb, "Feed_Management_Records.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Feed Management Details Report", 14, 15);
    const tableColumn = ["Batch", "Date", "Current Silo (KG)", "Purchased Silo (KG)", "Supplier", "Cost (INR)", "Entered By"];
    const tableRows = searchedData.map(e => [
      e.name,
      formatDate(e.date),
      e.currentFeedWeightInSilo || 0,
      e.purchasedFeedWeightInSilo || e.feedWeight || 0,
      e.supplier || '-',
      e.feedCost || 0,
      e.enteredBy || '-'
    ]);
    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 20 });
    doc.save("Feed_Management_Report.pdf");
  };

  // --- Chart Data ---
  const getChartData = () => {
    const grouped = {};
    entries.forEach(e => {
      const date = e.date ? e.date.split('T')[0] : 'Unknown';
      if (!grouped[date]) grouped[date] = { weight: 0, cost: 0 };
      grouped[date].weight += (e.purchasedFeedWeightInSilo || e.feedWeight || 0);
      grouped[date].cost += (e.feedCost || 0);
    });
    const labels = Object.keys(grouped).sort();

    return {
      labels,
      datasets: [
        {
          label: 'Purchased Weight (KG)',
          data: labels.map(l => grouped[l].weight),
          borderColor: '#10B981',
          backgroundColor: chartType === 'area' ? 'rgba(16, 185, 129, 0.1)' : '#10B981',
          fill: chartType === 'area'
        },
        {
          label: 'Feed Cost (₹)',
          data: labels.map(l => grouped[l].cost),
          borderColor: '#F59E0B',
          backgroundColor: chartType === 'area' ? 'rgba(245, 158, 11, 0.1)' : '#F59E0B',
          fill: chartType === 'area',
          hidden: true
        }
      ]
    };
  };

  const renderChart = () => {
    const data = getChartData();
    const isDark = document.body.classList.contains('dark-mode');
    const textColor = isDark ? '#9CA3AF' : '#4B5563';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0,0,0,0.05)';
    
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: textColor }
        }
      }
    };

    if (chartType !== 'pie' && chartType !== 'doughnut') {
      options.scales = {
        x: {
          grid: { display: false },
          ticks: { color: textColor }
        },
        y: {
          grid: { borderDash: [4, 4], color: gridColor },
          ticks: { color: textColor }
        }
      };
    }

    if (chartType === 'pie' || chartType === 'doughnut') {
      const typeGroup = {};
      entries.forEach(e => {
        const type = e.supplier || e.name || 'Batch';
        if (!typeGroup[type]) typeGroup[type] = 0;
        typeGroup[type] += (e.purchasedFeedWeightInSilo || e.feedWeight || 0);
      });
      data.labels = Object.keys(typeGroup);
      data.datasets = [{ data: Object.values(typeGroup), backgroundColor: ['#4F46E5', '#10B981', '#F59E0B', '#F43F5E', '#3B82F6'] }];
    }

    switch (chartType) {
      case 'line': case 'area': return <Line data={data} options={options} />;
      case 'column': return <Bar data={data} options={options} />;
      case 'pie': return <Pie data={data} options={options} />;
      case 'doughnut': return <Doughnut data={data} options={options} />;
      default: return <Line data={data} options={options} />;
    }
  };

  return (
    <div className="animate-slide-up">
      {/* Header Bar */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">Feed Management</h2>
          <p className="text-muted mb-0">Track batch feed logs, silo stock, supplier purchases, and cost details.</p>
        </div>
        <button
          className="btn-primary-modern d-flex align-items-center gap-2"
          onClick={() => {
            if (!showForm) {
              setFormData(getInitialFormData());
              setIsEditing(false);
            }
            setShowForm(!showForm);
          }}
        >
          {showForm ? 'Close Form' : <><Plus size={20} /> Add Feed Record</>}
        </button>
      </div>

      {/* Entry Form */}
      {showForm && (
        <div className="saas-card p-4 mb-4 border-start border-warning border-4 animate-fade-in">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h5 className="fw-bold m-0">{isEditing ? 'Edit Feed Record' : 'Add New Feed Record'}</h5>
            <span className="badge bg-warning bg-opacity-10 text-dark px-3 py-2 rounded-pill small fw-semibold">
              Logged in as: <strong>{currentUserName}</strong>
            </span>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="row g-3 mb-4">
              {/* 1. Select Batch */}
              <div className="col-12 col-md-4 col-lg-3">
                <label className="form-label small fw-semibold text-muted">
                  Batch <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select form-control-modern w-100"
                  name="name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                >
                  <option value="">-- Select Active Batch --</option>
                  {activeBatches.map(b => (
                    <option key={b._id} value={b.name}>{b.name}</option>
                  ))}
                  {isEditing && !activeBatches.find(b => b.name === formData.name) && formData.name && (
                    <option value={formData.name}>{formData.name} (Archived)</option>
                  )}
                </select>
              </div>

              {/* 2. Date */}
              <div className="col-12 col-md-4 col-lg-3">
                <label className="form-label small fw-semibold text-muted">
                  Date <span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  className="form-control-modern w-100"
                  name="date"
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              {/* 3. Current Feed Weight in Silo */}
              <div className="col-12 col-md-4 col-lg-3">
                <label className="form-label small fw-semibold text-muted">
                  Current Feed Weight in Silo (KG)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control-modern w-100"
                  name="currentFeedWeightInSilo"
                  placeholder="e.g. 1500"
                  value={formData.currentFeedWeightInSilo || ''}
                  onChange={e => setFormData({ ...formData, currentFeedWeightInSilo: e.target.value })}
                />
              </div>

              {/* 4. Purchased Feed Weight in Silo */}
              <div className="col-12 col-md-4 col-lg-3">
                <label className="form-label small fw-semibold text-muted">
                  Purchased Feed Weight in Silo (KG) <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="form-control-modern w-100"
                  name="purchasedFeedWeightInSilo"
                  placeholder="e.g. 500"
                  value={formData.purchasedFeedWeightInSilo || ''}
                  onChange={e => setFormData({ ...formData, purchasedFeedWeightInSilo: e.target.value })}
                  required
                />
              </div>

              {/* 5. Supplier Name */}
              <div className="col-12 col-md-4 col-lg-4">
                <label className="form-label small fw-semibold text-muted">Supplier Name</label>
                <input
                  type="text"
                  className="form-control-modern w-100"
                  name="supplier"
                  placeholder="e.g. Quality Feeds Ltd"
                  value={formData.supplier || ''}
                  onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                />
              </div>

              {/* 6. Feed Cost */}
              <div className="col-12 col-md-4 col-lg-4">
                <label className="form-label small fw-semibold text-muted">
                  Feed Cost (₹) <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="form-control-modern w-100"
                  name="feedCost"
                  placeholder="e.g. 12500"
                  value={formData.feedCost || ''}
                  onChange={e => setFormData({ ...formData, feedCost: e.target.value })}
                  required
                />
              </div>

              {/* 7. Entered By (Automatically prefilled with logged-in user name) */}
              <div className="col-12 col-md-4 col-lg-4">
                <label className="form-label small fw-semibold text-muted">
                  Entered By <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control-modern w-100 bg-light"
                  name="enteredBy"
                  value={formData.enteredBy || ''}
                  onChange={e => setFormData({ ...formData, enteredBy: e.target.value })}
                  required
                  placeholder="Logged in user"
                />
                <span className="text-muted" style={{ fontSize: '11px' }}>
                  Auto-filled with currently logged-in user account.
                </span>
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-light fw-medium border" onClick={handleResetForm}>Cancel</button>
              <button type="submit" className="btn-primary-modern px-4" style={{ backgroundColor: 'var(--warning)', color: '#000' }} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : (isEditing ? 'Update Feed Record' : 'Save Feed Record')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Key Metric Summary Cards */}
      <div className="row g-3 mb-4">
        {[
          { title: 'Purchased Feed (KG)', value: totalPurchasedWeight.toLocaleString(), icon: <ShoppingBag size={20} />, color: 'primary' },
          { title: 'Current Silo (KG)', value: totalCurrentSiloWeight.toLocaleString(), icon: <Database size={20} />, color: 'info' },
          { title: 'Total Feed Cost', value: `₹ ${totalCost.toLocaleString()}`, icon: <DollarSign size={20} />, color: 'danger' },
          { title: 'Avg Cost / KG', value: `₹ ${avgCostPerKg}`, icon: <TrendingUp size={20} />, color: 'warning' },
          { title: 'Feed Cost / Egg', value: `₹ ${feedCostPerEgg}`, icon: <Calendar size={20} />, color: 'success' }
        ].map((stat, idx) => (
          <div className="col-12 col-sm-6 col-md-4 col-xl" key={idx}>
            <div className="saas-card p-3 h-100 d-flex align-items-center gap-3">
              <div className={`text-${stat.color} bg-${stat.color} bg-opacity-10 rounded-circle p-3`}>{stat.icon}</div>
              <div>
                <p className="text-muted small fw-semibold text-uppercase mb-1">{stat.title}</p>
                <h3 className="fw-bold m-0 text-dark">{stat.value}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Table & Analytics Section */}
      <div className="row g-4 mb-4">
        <div className="col-12">
          <div className="saas-card h-100 d-flex flex-column w-100">
            {/* Table Search & Export Action Bar */}
            <div className="p-3 border-bottom d-flex justify-content-between gap-2 flex-wrap">
              <div className="position-relative w-100" style={{ maxWidth: "320px" }}>
                <Search
                  size={16}
                  className="position-absolute top-50 translate-middle-y text-muted"
                  style={{ left: "12px" }}
                />
                <input
                  type="text"
                  className="form-control-modern w-100 form-control-sm"
                  placeholder="Search by batch, supplier, or entered by..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ paddingLeft: "34px" }}
                />
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-light btn-sm border d-flex align-items-center gap-1" onClick={exportToExcel} title="Export Excel">
                  <Download size={14} /> <span>Excel</span>
                </button>
                <button className="btn btn-light btn-sm border d-flex align-items-center gap-1" onClick={exportToPDF} title="Export PDF">
                  <Printer size={14} /> <span>PDF</span>
                </button>
              </div>
            </div>

            {/* Data Table */}
            <div className="table-responsive flex-grow-1 w-100">
              <table className="modern-table w-100">
                <thead>
                  <tr>
                    <th>Batch</th>
                    <th>Date</th>
                    <th>Current Weight in Silo</th>
                    <th>Purchased Weight in Silo</th>
                    <th>Supplier Name</th>
                    <th>Feed Cost</th>
                    <th>Entered By</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="text-center py-4">
                        <div className="spinner-border text-primary" role="status"></div>
                      </td>
                    </tr>
                  ) : tableData.length > 0 ? (
                    tableData.map((item) => (
                      <tr key={item._id}>
                        <td className="fw-bold text-dark"> {item.name} </td>
                        <td
                          className="text-primary text-decoration-underline"
                          style={{ cursor: "pointer" }}
                          onClick={() => setSelectedRecord(item)}
                        >
                          {formatDate(item.date)}
                        </td>
                        <td>
                          <span className="badge bg-secondary bg-opacity-10 text-secondary fw-semibold px-2 py-1">
                            {item.currentFeedWeightInSilo !== undefined ? `${item.currentFeedWeightInSilo} KG` : '-'}
                          </span>
                        </td>
                        <td>
                          <span className="badge-modern badge-success">
                            {item.purchasedFeedWeightInSilo || item.feedWeight || 0} KG
                          </span>
                        </td>
                        <td> {item.supplier || "-"} </td>
                        <td className="fw-bold text-danger"> ₹ {item.feedCost} </td>
                        <td>
                          <span className="badge bg-primary bg-opacity-10 text-primary fw-medium px-2 py-1">
                            👤 {item.enteredBy || '-'}
                          </span>
                        </td>
                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-light text-primary me-2"
                            onClick={() => handleEdit(item)}
                            title="Edit Record"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            className="btn btn-sm btn-light text-danger"
                            onClick={() => handleDelete(item._id)}
                            title="Delete Record"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="text-center py-4 text-muted">
                        <AlertCircle size={32} className="opacity-50 mb-2" />
                        <p className="mb-0"> No feed records found. </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-3 border-top d-flex justify-content-end gap-1 flex-wrap">
                <button
                  className="btn btn-sm btn-light border"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    className={`btn btn-sm ${
                      currentPage === i + 1 ? "btn-primary" : "btn-light border"
                    }`}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  className="btn btn-sm btn-light border"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Feed Analytics Graph */}
        <div className="col-12">
          <div className="saas-card p-4 col-12 col-xl-6">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold m-0">Feed Stock & Cost Trends</h5>
              <select className="form-select form-select-sm w-auto" value={chartType} onChange={e => setChartType(e.target.value)}>
                <option value="line">Line Chart</option>
                <option value="area">Area Chart</option>
                <option value="column">Bar Chart</option>
                <option value="pie">Pie (by Supplier/Batch)</option>
              </select>
            </div>
            <div style={{ height: '300px' }}>{renderChart()}</div>
          </div>
        </div>
      </div>

      {/* Record Details Modal */}
      {selectedRecord && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)', zIndex: 1050 }}
          tabIndex="-1"
          onClick={(e) => { if (e.target.classList.contains('modal')) setSelectedRecord(null); }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg" style={{ maxHeight: '90vh' }}>
              <div className="modal-header bg-white border-bottom">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <ShoppingBag size={20} className="text-primary" /> Feed Record Details
                </h5>
                <button type="button" className="btn-close" onClick={() => setSelectedRecord(null)}></button>
              </div>

              <div className="modal-body p-4 bg-light" style={{ overflowY: 'auto' }}>
                <div className="card border-0 shadow-sm mb-4">
                  <div className="card-body p-4">
                    <h6 className="text-primary fw-bold mb-3 border-bottom pb-2">Feed Entry Details</h6>
                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <p className="text-muted small fw-semibold mb-1">Batch</p>
                        <h6 className="fw-bold m-0">{selectedRecord.name}</h6>
                      </div>
                      <div className="col-12 col-md-6">
                        <p className="text-muted small fw-semibold mb-1">Date</p>
                        <h6 className="fw-bold m-0">{formatDate(selectedRecord.date)}</h6>
                      </div>
                      <div className="col-12 col-md-6">
                        <p className="text-muted small fw-semibold mb-1">Current Feed Weight in Silo</p>
                        <h6 className="fw-bold text-dark m-0">{selectedRecord.currentFeedWeightInSilo || 0} KG</h6>
                      </div>
                      <div className="col-12 col-md-6">
                        <p className="text-muted small fw-semibold mb-1">Purchased Feed Weight in Silo</p>
                        <h6 className="fw-bold text-success m-0">{selectedRecord.purchasedFeedWeightInSilo || selectedRecord.feedWeight || 0} KG</h6>
                      </div>
                      <div className="col-12 col-md-6">
                        <p className="text-muted small fw-semibold mb-1">Supplier Name</p>
                        <h6 className="fw-bold m-0">{selectedRecord.supplier || '-'}</h6>
                      </div>
                      <div className="col-12 col-md-6">
                        <p className="text-muted small fw-semibold mb-1">Feed Cost</p>
                        <h6 className="fw-bold text-danger m-0">₹ {selectedRecord.feedCost}</h6>
                      </div>
                      <div className="col-12 col-md-6">
                        <p className="text-muted small fw-semibold mb-1">Entered By</p>
                        <h6 className="fw-bold text-primary m-0">👤 {selectedRecord.enteredBy || '-'}</h6>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer bg-white border-top">
                <button type="button" className="btn btn-light border fw-medium" onClick={() => setSelectedRecord(null)}>Close</button>
                <button type="button" className="btn btn-primary-modern fw-medium d-flex align-items-center gap-2" onClick={() => { handleEdit(selectedRecord); setSelectedRecord(null); }}>
                  <Edit2 size={16} /> Edit Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedManagement;
