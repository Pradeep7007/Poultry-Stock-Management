import React, { useState } from 'react';
import { useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { KEYS, fetchBatches, fetchHens } from '../services/queries';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useNotifications } from '../context/NotificationContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { 
  Plus, Edit2, Trash2, Search, Download, Printer,  ChevronLeft, ChevronRight,
  Activity, Users, Skull, Clock, AlertCircle,
} from 'lucide-react';
import { formatDate } from '../utils/dateFormatter';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const HenManagement = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: '', name: '', date: new Date().toISOString().split('T')[0],
    deadToday: '', enteredBy: ''
  });

  // Tab state (0: Batches, 1: Mortality)
  const [activeTab, setActiveTab] = useState(1);
  
  // Table state
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [chartType, setChartType] = useState('line');

  const results = useQueries({
    queries: [
      { queryKey: KEYS.BATCHES, queryFn: fetchBatches },
      { queryKey: KEYS.HENS, queryFn: fetchHens }
    ]
  });

  const loading = results.some(r => r.isLoading);
  const isError = results.some(r => r.isError);
  if (isError) toast.error('Failed to load data');

  const batches = results[0].data || [];
  const deaths = results[1].data || [];

  const handleResetForm = () => {
    setFormData({ id: '', name: '', date: new Date().toISOString().split('T')[0], deadToday: '', enteredBy: '' });
    setIsEditing(false);
    setShowForm(false);
  };

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/hens', payload),
    onSuccess: (res, payload) => {
      if (res.data.sheetSync === false) {
        toast.success(res.data.message);
        addNotification('warning', 'Hen Sync Warning', res.data.message);
      } else {
        toast.success('Record added successfully!');
        addNotification('error', 'Mortality Recorded', `${payload.deadToday} hen deaths recorded for batch ${payload.name}`);
      }
      queryClient.invalidateQueries({ queryKey: KEYS.HENS });
      queryClient.invalidateQueries({ queryKey: KEYS.BATCHES });
      handleResetForm();
    },
    onError: (error) => {
      const errMsg = error.response?.data?.message || 'Something went wrong';
      toast.error(errMsg);
      addNotification('error', 'Mortality Record Failed', errMsg);
    },
    onSettled: () => setIsSubmitting(false)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/hens/${id}`, payload),
    onSuccess: (res) => {
      toast.success('Record updated successfully!');
      addNotification('success', 'Mortality Record Updated', `Successfully updated mortality for batch ${res.data?.data?.name || ''}`);
      queryClient.invalidateQueries({ queryKey: KEYS.HENS });
      queryClient.invalidateQueries({ queryKey: KEYS.BATCHES });
      handleResetForm();
    },
    onError: (error) => {
      const errMsg = error.response?.data?.message || 'Something went wrong';
      toast.error(errMsg);
      addNotification('error', 'Mortality Update Failed', errMsg);
    },
    onSettled: () => setIsSubmitting(false)
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, type }) => type === 'death' ? api.delete(`/hens/${id}`) : api.delete(`/batches/${id}`),
    onSuccess: (_, { type }) => {
      toast.success('Record deleted');
      addNotification('warning', 'Record Deleted', `Successfully removed ${type === 'death' ? 'mortality' : 'batch'} record.`);
      queryClient.invalidateQueries({ queryKey: type === 'death' ? KEYS.HENS : KEYS.BATCHES });
    },
    onError: (error) => {
      toast.error('Failed to delete record');
      addNotification('error', 'Delete Failed', 'Could not delete the record.');
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = {
      name: formData.name,
      date: formData.date,
      deadToday: Number(formData.deadToday),
      enteredBy: formData.enteredBy
    };

    if (isEditing) {
      updateMutation.mutate({ id: formData.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (entry) => {
    setFormData({
      id: entry._id, name: entry.name, date: new Date(entry.date).toISOString().split('T')[0],
      deadToday: entry.deadToday, enteredBy: entry.enteredBy
    });
    setIsEditing(true);
    setShowForm(true);
    setActiveTab(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id, type) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      deleteMutation.mutate({ id, type });
    }
  };

  // --- Metrics ---
  const activeBatch = batches.find(b => b.status === 'Active');
  const startedHens = activeBatch ? activeBatch.startedHens : 0;
  const aliveHens = activeBatch ? activeBatch.aliveHens : 0;
  
  // Total dead in active batch
  const activeDeaths = deaths.filter(d => activeBatch && d.batchId === activeBatch._id);
  const totalDead = activeDeaths.reduce((acc, curr) => acc + curr.deadToday, 0);
  
  const mortalityPercentage = startedHens > 0 ? ((totalDead / startedHens) * 100).toFixed(2) : 0;
  
  let remainingDays = 0;
  let batchProgress = 0;
  if (activeBatch) {
    const start = new Date(activeBatch.startDate);
    const end = new Date(activeBatch.endDate);
    const now = new Date();
    
    const totalDays = Math.max(1, (end - start) / (1000 * 60 * 60 * 24));
    const passedDays = Math.max(0, (now - start) / (1000 * 60 * 60 * 24));
    
    remainingDays = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
    batchProgress = Math.min(100, (passedDays / totalDays) * 100).toFixed(0);
  }

  // --- Tables ---
  const currentDataset = activeTab === 0 ? batches : deaths;
  const searchedData = currentDataset.filter(e => 
    e.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (e.enteredBy && e.enteredBy.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  const totalPages = Math.ceil(searchedData.length / itemsPerPage) || 1;
  const tableData = searchedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // --- Exports ---
  const exportToExcel = () => {
    const formattedData = searchedData.map(e => ({
      ...e,
      date: e.date ? formatDate(e.date) : undefined,
      startDate: e.startDate ? formatDate(e.startDate) : undefined,
      endDate: e.endDate ? formatDate(e.endDate) : undefined
    }));
    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTab === 0 ? "Batches" : "Mortality");
    XLSX.writeFile(wb, `${activeTab === 0 ? 'Batches' : 'Mortality'}_Records.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text(`${activeTab === 0 ? 'Batches' : 'Mortality'} Report`, 14, 15);
    let tableColumn, tableRows;
    if (activeTab === 0) {
      tableColumn = ["Batch Name", "Start", "End", "Started", "Alive", "Status"];
      tableRows = searchedData.map(e => [e.name, formatDate(e.startDate), formatDate(e.endDate), e.startedHens, e.aliveHens, e.status]);
    } else {
      tableColumn = ["Name", "Date", "Dead Today", "Entered By"];
      tableRows = searchedData.map(e => [e.name, formatDate(e.date), e.deadToday, e.enteredBy]);
    }
    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 20 });
    doc.save(`${activeTab === 0 ? 'Batches' : 'Mortality'}_Records.pdf`);
  };

  // --- Chart Data ---
  const getChartData = () => {
    const grouped = {};
    activeDeaths.forEach(d => {
      const date = d.date.split('T')[0];
      if (!grouped[date]) grouped[date] = 0;
      grouped[date] += d.deadToday;
    });
    const labels = Object.keys(grouped).sort();
    
    if (chartType === 'pie' || chartType === 'doughnut') {
      return {
        labels: ['Alive Hens', 'Dead Hens'],
        datasets: [{
          data: [aliveHens, totalDead],
          backgroundColor: ['#10B981', '#F43F5E'],
          borderWidth: 0
        }]
      };
    }
    
    return {
      labels,
      datasets: [{
        label: 'Dead Hens',
        data: labels.map(l => grouped[l]),
        borderColor: '#F43F5E',
        backgroundColor: chartType === 'area' ? 'rgba(244, 63, 94, 0.1)' : '#F43F5E',
        fill: chartType === 'area'
      }]
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
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">Hen Management</h2>
          <p className="text-muted mb-0">Manage batches and track daily hen mortality.</p>
        </div>
        <button className="btn-primary-modern" onClick={() => { setShowForm(!showForm); setIsEditing(false); }}>
          {showForm ? 'Close Form' : <><Plus size={20} /> Add Mortality Record</>}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="saas-card p-4 mb-4 border-start border-danger border-4 animate-fade-in">
          <h5 className="fw-bold mb-4">{isEditing ? 'Edit Mortality' : 'Add Mortality Record'}</h5>
          <form onSubmit={handleSubmit}>
            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <label className="form-label small fw-semibold text-muted">Select Batch <span className="text-danger">*</span></label>
                <select className="form-select form-control-modern w-100" name="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required>
                  <option value="">-- Select Active Batch --</option>
                  {batches.filter(b => b.status === 'Active').map(b => (
                    <option key={b._id} value={b.name}>{b.name}</option>
                  ))}
                  {isEditing && !batches.filter(b => b.status === 'Active').find(b => b.name === formData.name) && formData.name && (
                    <option value={formData.name}>{formData.name} (Archived)</option>
                  )}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-semibold text-muted">Date <span className="text-danger">*</span></label>
                <input type="date" className="form-control-modern w-100" name="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-semibold text-muted">Hens Dead Today <span className="text-danger">*</span></label>
                <input type="number" min="0" className="form-control-modern w-100" name="deadToday" value={formData.deadToday} onChange={e => setFormData({...formData, deadToday: e.target.value})} required />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-semibold text-muted">Entered By <span className="text-danger">*</span></label>
                <input type="text" className="form-control-modern w-100" name="enteredBy" value={formData.enteredBy} onChange={e => setFormData({...formData, enteredBy: e.target.value})} required />
              </div>
            </div>
            <div className="d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-light fw-medium border" onClick={handleResetForm}>Cancel</button>
              <button type="submit" className="btn-primary-modern px-4" style={{ backgroundColor: 'var(--accent)' }} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Record'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Progress Bar */}
      {activeBatch && (
        <div className="saas-card p-4 mb-4">
          <div className="d-flex justify-content-between mb-2">
            <span className="fw-medium">Batch Progress</span>
            <span className="fw-bold">{batchProgress}%</span>
          </div>
          <div className="progress" style={{ height: '10px' }}>
            <div className="progress-bar bg-primary" role="progressbar" style={{ width: `${batchProgress}%` }}></div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        {[
          { title: 'Active Batch', value: activeBatch ? activeBatch.name : 'None', icon: <Activity size={20} />, color: 'primary' },
          { title: 'Started Hens', value: startedHens.toLocaleString(), icon: <Users size={20} />, color: 'info' },
          { title: 'Alive Hens', value: aliveHens.toLocaleString(), icon: <Users size={20} />, color: 'success' },
          { title: 'Total Dead', value: totalDead.toLocaleString(), icon: <Skull size={20} />, color: 'danger' },
          { title: 'Mortality %', value: `${mortalityPercentage}%`, icon: <AlertCircle size={20} />, color: 'warning' },
          { title: 'Remaining Days', value: remainingDays, icon: <Clock size={20} />, color: 'secondary' }
        ].map((stat, idx) => (
          <div className="col-6 col-md-4 col-xl-2" key={idx}>
            <div className="saas-card p-3 h-100 text-center">
              <div className={`mx-auto mb-2 text-${stat.color} bg-${stat.color} bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center`} style={{ width: '40px', height: '40px' }}>
                {stat.icon}
              </div>
              <h3 className="fw-bold m-0 text-dark">{stat.value}</h3>
              <p className="text-muted small fw-semibold text-uppercase mt-1 mb-0">{stat.title}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table & Chart */}
      <div className="row g-4 mb-4">
        <div className="col-12">
          <div className="saas-card h-100 d-flex flex-column">
            <div className="px-4 pt-3 border-bottom d-flex gap-3">
              <button className={`btn fw-medium pb-3 rounded-0 border-0 border-bottom border-2 ${activeTab === 0 ? 'border-primary text-primary' : 'border-transparent text-muted'}`} onClick={() => {setActiveTab(0); setCurrentPage(1);}}>Batches</button>
              <button className={`btn fw-medium pb-3 rounded-0 border-0 border-bottom border-2 ${activeTab === 1 ? 'border-primary text-primary' : 'border-transparent text-muted'}`} onClick={() => {setActiveTab(1); setCurrentPage(1);}}>Mortality Log</button>
            </div>
            
            <div className="p-3 border-bottom d-flex justify-content-between gap-2">
              <div className="position-relative w-100" style={{ maxWidth: '300px' }}>
                <Search size={16} className="position-absolute top-50 translate-middle-y text-muted" style={{ left: '12px' }} />
                <input type="text" className="form-control-modern w-100 form-control-sm" placeholder="Search..." value={searchTerm} onChange={e => {setSearchTerm(e.target.value); setCurrentPage(1);}} style={{ paddingLeft: '34px' }} />
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-light btn-sm border" onClick={exportToExcel}><Download size={14}/></button>
                <button className="btn btn-light btn-sm border" onClick={exportToPDF}><Printer size={14}/></button>
              </div>
            </div>

            <div className="table-responsive flex-grow-1">
              <table className="modern-table">
                <thead>
                  {activeTab === 0 ? (
                    <tr>
                      <th>Batch Name</th><th>Start</th><th>End</th><th>Started</th><th>Alive</th><th>Status</th><th>Actions</th>
                    </tr>
                  ) : (
                    <tr>
                      <th>Name</th><th>Date</th><th>Dead Today</th><th>Entered By</th><th className="text-end">Actions</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {loading ? <tr><td colSpan="7" className="text-center py-4"><div className="spinner-border text-primary"></div></td></tr> : tableData.length > 0 ? tableData.map(item => (
                    activeTab === 0 ? (
                      <tr key={item._id}>
                        <td className="fw-bold">{item.name}</td>
                        <td className="text-primary text-decoration-underline" style={{ cursor: 'pointer' }} onClick={() => setSelectedRecord({...item, isBatch: true})}>{formatDate(item.startDate)}</td>
                        <td className="text-muted">{formatDate(item.endDate)}</td>
                        <td>{item.startedHens?.toLocaleString()}</td>
                        <td>{item.aliveHens?.toLocaleString()}</td>
                        <td><span className={`badge-modern badge-${item.status === 'Active' ? 'success' : 'secondary'}`}>{item.status}</span></td>
                        <td><button className="btn btn-sm btn-light text-danger" onClick={() => handleDelete(item._id, 'batch')}><Trash2 size={16}/></button></td>
                      </tr>
                    ) : (
                      <tr key={item._id}>
                        <td className="fw-medium">{item.name}</td>
                        <td className="text-primary text-decoration-underline" style={{ cursor: 'pointer' }} onClick={() => setSelectedRecord({...item, isMortality: true})}>{formatDate(item.date)}</td>
                        <td><span className="badge-modern badge-danger">{item.deadToday}</span></td>
                        <td>{item.enteredBy || '-'}</td>
                        <td className="text-end">
                          <div className="d-flex justify-content-end gap-2">
                            <button className="btn btn-sm btn-light text-primary me-2" onClick={() => handleEdit(item)}><Edit2 size={16}/></button>
                            <button className="btn btn-sm btn-light text-danger" onClick={() => handleDelete(item._id, 'death')}><Trash2 size={16}/></button>
                          </div>
                        </td>
                      </tr>
                    )
                  )) : <tr><td colSpan="7" className="text-center py-4 text-muted"><AlertCircle size={32} className="opacity-50 mb-2" /><p className="mb-0">No records found.</p></td></tr>}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-3 border-top d-flex justify-content-end gap-1">
                <button className="btn btn-sm btn-light border" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft size={16} /></button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button key={i} className={`btn btn-sm ${currentPage === i + 1 ? 'btn-primary' : 'btn-light border'}`} onClick={() => setCurrentPage(i + 1)}>{i + 1}</button>
                ))}
                <button className="btn btn-sm btn-light border" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight size={16} /></button>
              </div>
            )}
          </div>
        </div>

        <div className="col-12">
          <div className="saas-card p-4 col-12 col-xl-6">
            <div className="d-flex justify-content-between mb-3">
              <h5 className="fw-bold m-0">Analytics</h5>
              <select className="form-select form-select-sm w-auto" value={chartType} onChange={e => setChartType(e.target.value)}>
                <option value="line">Line</option>
                <option value="area">Area</option>
                <option value="column">Bar</option>
                <option value="doughnut">Doughnut</option>
              </select>
            </div>
            <div style={{ height: '300px' }}>
              {renderChart()}
            </div>
          </div>
        </div>
      </div> 
      
      {selectedRecord && selectedRecord.isBatch && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)', zIndex: 1050 }} tabIndex="-1" onClick={(e) => { if (e.target.classList.contains('modal')) setSelectedRecord(null); }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg" style={{ maxHeight: '90vh' }}>
              <div className="modal-header bg-white border-bottom">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2"><Users size={20} className="text-primary"/> Batch Details</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedRecord(null)}></button>
              </div>
              <div className="modal-body p-4 bg-light" style={{ overflowY: 'auto' }}>
                <div className="card border-0 shadow-sm mb-4">
                  <div className="card-body p-4">
                    <h6 className="text-primary fw-bold mb-4 border-bottom pb-2">Timeline</h6>
                    <div className="row g-4">
                      <div className="col-12 col-md-4">
                        <p className="text-muted small fw-semibold mb-1">Batch Name</p>
                        <h6 className="fw-bold m-0">{selectedRecord.name}</h6>
                      </div>
                      <div className="col-12 col-md-4">
                        <p className="text-muted small fw-semibold mb-1">Start Date</p>
                        <h6 className="fw-bold m-0">{formatDate(selectedRecord.startDate)}</h6>
                      </div>
                      <div className="col-12 col-md-4">
                        <p className="text-muted small fw-semibold mb-1">End Date</p>
                        <h6 className="fw-bold m-0">{formatDate(selectedRecord.endDate)}</h6>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="card border-0 shadow-sm">
                  <div className="card-body p-4">
                    <h6 className="text-success fw-bold mb-4 border-bottom pb-2">Flock Status</h6>
                    <div className="row g-4">
                      <div className="col-12 col-md-6">
                        <p className="text-muted small fw-semibold mb-1">Started Hens</p>
                        <h6 className="fw-bold text-primary m-0">{selectedRecord.startedHens?.toLocaleString()}</h6>
                      </div>
                      <div className="col-12 col-md-6">
                        <p className="text-muted small fw-semibold mb-1">Alive Hens</p>
                        <h6 className="fw-bold text-success m-0">{selectedRecord.aliveHens?.toLocaleString()}</h6>
                      </div>
                      <div className="col-12 col-md-6">
                        <p className="text-muted small fw-semibold mb-1">Status</p>
                        <h6 className="fw-bold m-0"><span className={`badge-modern badge-${selectedRecord.status === 'Active' ? 'success' : 'secondary'}`}>{selectedRecord.status}</span></h6>
                      </div>
                      <div className="col-12 col-md-6">
                        <p className="text-muted small fw-semibold mb-1">Created By</p>
                        <h6 className="fw-bold m-0">{selectedRecord.enteredBy || '-'}</h6>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer bg-white border-top">
                <button type="button" className="btn btn-light border fw-medium" onClick={() => setSelectedRecord(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedRecord && selectedRecord.isMortality && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)', zIndex: 1050 }} tabIndex="-1" onClick={(e) => { if (e.target.classList.contains('modal')) setSelectedRecord(null); }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg" style={{ maxHeight: '90vh' }}>
              <div className="modal-header bg-white border-bottom">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2"><Skull size={20} className="text-danger"/> Mortality Record Details</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedRecord(null)}></button>
              </div>
              <div className="modal-body p-4 bg-light" style={{ overflowY: 'auto' }}>
                <div className="card border-0 shadow-sm">
                  <div className="card-body p-4">
                    <h6 className="text-danger fw-bold mb-4 border-bottom pb-2">Incident Details</h6>
                    <div className="row g-4">
                      <div className="col-12 col-md-6">
                        <p className="text-muted small fw-semibold mb-1">Batch Name</p>
                        <h6 className="fw-bold m-0">{selectedRecord.name}</h6>
                      </div>
                      <div className="col-12 col-md-6">
                        <p className="text-muted small fw-semibold mb-1">Date</p>
                        <h6 className="fw-bold m-0">{formatDate(selectedRecord.date)}</h6>
                      </div>
                      <div className="col-12 col-md-6">
                        <p className="text-muted small fw-semibold mb-1">Dead Today</p>
                        <h6 className="fw-bold text-danger m-0">{selectedRecord.deadToday} Hens</h6>
                      </div>
                      <div className="col-12 col-md-6">
                        <p className="text-muted small fw-semibold mb-1">Entered By</p>
                        <h6 className="fw-bold m-0">{selectedRecord.enteredBy || '-'}</h6>
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

export default HenManagement;
