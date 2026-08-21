import React, { useState, useMemo, useEffect } from 'react';
import { useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { KEYS, fetchEggs, fetchBatches, fetchHens } from '../services/queries';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { 
  Search, Plus, Download, Printer, Edit2, Trash2, 
  ChevronLeft, ChevronRight, Filter, AlertCircle,
  Package, ShoppingCart, Egg, AlertTriangle, TrendingUp} from 'lucide-react';
import { formatDate } from '../utils/dateFormatter';

const EggManagement = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();
  const { user } = useAuth();
  const currentUserName = user?.username || user?.fullName || 'Admin';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const getInitialFormData = () => ({
    id: '', name: '', date: new Date().toISOString().split('T')[0],
    eggsProduced: '', eggsSold: '', damagedEggs: '', eggPrice: '', profitPerEgg: '', enteredBy: currentUserName
  });

  const [formData, setFormData] = useState(getInitialFormData);

  useEffect(() => {
    if (!isEditing && !formData.id) {
      setFormData(prev => ({ ...prev, enteredBy: currentUserName }));
    }
  }, [currentUserName, isEditing]);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const itemsPerPage = 7;

  const results = useQueries({
    queries: [
      { queryKey: KEYS.EGGS, queryFn: fetchEggs },
      { queryKey: KEYS.BATCHES, queryFn: fetchBatches },
      { queryKey: KEYS.HENS, queryFn: fetchHens }
    ]
  });

  const loading = results.some(r => r.isLoading);
  const isError = results.some(r => r.isError);

  if (isError) {
    toast.error('Failed to load records');
  }

  const eggData = results[0].data;
  const batchData = results[1].data;
  const henData = results[2].data;

  const rawEntries = useMemo(() => eggData || [], [eggData]);
  const batches = useMemo(() => batchData || [], [batchData]);
  const henDeaths = useMemo(() => henData || [], [henData]);

  const entries = useMemo(() => {
    if (!batches.length || !rawEntries.length) return rawEntries;
    return rawEntries.map(entry => {
      const batch = batches.find(b => b.name === entry.name);
      if (batch) {
        const entryDate = new Date(entry.date).toISOString().split('T')[0];
        const deathsUpToDate = henDeaths.filter(d => 
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
  }, [rawEntries, batches, henDeaths]);

  const activeBatches = batches.filter(b => b.status === 'Active');

  const handleResetForm = () => {
    setFormData(getInitialFormData());
    setIsEditing(false);
    setShowForm(false);
  };

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/eggs', payload),
    onSuccess: (res) => {
      if (res.data.sheetSync === false) {
        toast.success(res.data.message);
        addNotification('warning', 'Egg Sync Warning', res.data.message);
      } else {
        toast.success('Entry added successfully!');
        addNotification('success', 'Egg Entry Added', `Added egg record for batch ${res.data.data?.name || ''}`);
      }
      queryClient.invalidateQueries({ queryKey: KEYS.EGGS });
      handleResetForm();
    },
    onError: (error) => {
      const errMsg = error.response?.data?.message || 'Something went wrong';
      toast.error(errMsg);
      addNotification('error', 'Egg Entry Failed', errMsg);
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/eggs/${id}`, payload),
    onSuccess: (res) => {
      toast.success('Entry updated successfully!');
      addNotification('success', 'Egg Entry Updated', `Updated egg record for batch ${res.data?.data?.name || ''}`);
      queryClient.invalidateQueries({ queryKey: KEYS.EGGS });
      handleResetForm();
    },
    onError: (error) => {
      const errMsg = error.response?.data?.message || 'Something went wrong';
      toast.error(errMsg);
      addNotification('error', 'Egg Update Failed', errMsg);
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/eggs/${id}`),
    onSuccess: () => {
      toast.success('Record deleted');
      addNotification('warning', 'Egg Record Deleted', 'An egg production record has been removed.');
      queryClient.invalidateQueries({ queryKey: KEYS.EGGS });
    },
    onError: (error) => {
      toast.error('Failed to delete record');
      addNotification('error', 'Egg Delete Failed', 'Could not delete the egg record.');
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const eggsProduced = Number(formData.eggsProduced);
    const eggsSold = Number(formData.eggsSold);
    const damagedEggs = Number(formData.damagedEggs) || 0;

    let currentStock = entries.reduce((acc, curr) => acc + curr.eggsProduced - curr.eggsSold - (curr.damagedEggs || 0), 0);
    
    if (isEditing) {
      const oldEntry = entries.find(e => e._id === formData.id);
      if (oldEntry) {
        currentStock -= (oldEntry.eggsProduced - oldEntry.eggsSold - (oldEntry.damagedEggs || 0));
      }
    }

    if ((eggsSold + damagedEggs) > (eggsProduced + currentStock)) {
      toast.error('Eggs sold and damaged cannot exceed eggs produced today plus available stock.');
      setIsSubmitting(false);
      return;
    }

    const payload = {
      name: formData.name,
      date: formData.date,
      eggsProduced,
      eggsSold,
      damagedEggs,
      eggPrice: Number(formData.eggPrice),
      profitPerEgg: formData.profitPerEgg ? Number(formData.profitPerEgg) : 0,
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
      id: entry._id,
      name: entry.name,
      date: new Date(entry.date).toISOString().split('T')[0],
      eggsProduced: entry.eggsProduced,
      eggsSold: entry.eggsSold,
      damagedEggs: entry.damagedEggs || 0,
      eggPrice: entry.eggPrice,
      profitPerEgg: entry.profitPerEgg || 0,
      enteredBy: entry.enteredBy || ''
    });
    setIsEditing(true);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const processedEntries = useMemo(() => {
    let filtered = entries.filter(e => 
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      formatDate(e.date).includes(searchTerm)
    );

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        if (sortConfig.key === 'date') {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        }
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [entries, searchTerm, sortConfig]);

  const totalPages = Math.ceil(processedEntries.length / itemsPerPage) || 1;
  const currentTableData = processedEntries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalProduced = entries.reduce((acc, curr) => acc + curr.eggsProduced, 0);
  const totalSold = entries.reduce((acc, curr) => acc + curr.eggsSold, 0);
  const totalDamaged = entries.reduce((acc, curr) => acc + (curr.damagedEggs || 0), 0);
  const totalProfit = entries.reduce((acc, curr) => acc + (curr.profit || 0), 0);
  const availableStock = totalProduced - totalSold - totalDamaged;

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(processedEntries.map(e => ({
      Batch: e.name, Date: formatDate(e.date),
      'Alive Hens': e.aliveHens,
      Produced: e.eggsProduced, 
      'Production %': `${e.productionPercentage}%`,
      Sold: e.eggsSold, 
      Damaged: e.damagedEggs || 0,
      Price: e.eggPrice, 'Profit/Egg': e.profitPerEgg, TotalProfit: e.profit, Sales: e.salesAmount, EnteredBy: e.enteredBy
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Eggs");
    XLSX.writeFile(wb, "Egg_Records.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Egg Management Report", 14, 15);
    const tableColumn = ["Date", "Batch", "Alive Hens", "Produced", "Production %"];
    const tableRows = processedEntries.map(e => [
      formatDate(e.date), e.name, e.aliveHens, e.eggsProduced, `${e.productionPercentage}%`
    ]);
    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 20 });
    doc.save("Egg_Records.pdf");
  };

  return (
    <div className="animate-slide-up">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">Egg Management</h2>
          <p className="text-muted mb-0">Track, manage, and analyze your egg production.</p>
        </div>
        <button 
          className="btn-primary-modern"
          onClick={() => { setShowForm(!showForm); setIsEditing(false); }}
        >
          {showForm ? 'Close Form' : <><Plus size={20} /> Add New Record</>}
        </button>
      </div>

      {showForm && (
        <div className="saas-card p-4 mb-4 animate-fade-in border-start border-primary border-4">
          <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
            <Edit2 size={18} className="text-primary" /> 
            {isEditing ? 'Edit Record' : 'Create New Record'}
          </h5>
          <form onSubmit={handleSubmit}>
            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <label className="form-label small fw-semibold text-muted">Select Batch <span className="text-danger">*</span></label>
                <select className="form-select form-control-modern w-100" name="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required>
                  <option value="">-- Select Active Batch --</option>
                  {activeBatches.map(b => (
                    <option key={b._id} value={b.name}>{b.name} ({formatDate(b.startDate)})</option>
                  ))}
                  {isEditing && !activeBatches.find(b => b.name === formData.name) && (
                    <option value={formData.name}>{formData.name} (Archived)</option>
                  )}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-semibold text-muted">Date <span className="text-danger">*</span></label>
                <input type="date" className="form-control-modern w-100" name="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-semibold text-muted">Price Per Egg (₹ ) <span className="text-danger">*</span></label>
                <input type="number" min="0.01" step="0.01" className="form-control-modern w-100" name="eggPrice" value={formData.eggPrice} onChange={e => setFormData({...formData, eggPrice: e.target.value})} required />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-semibold text-muted">Entered By <span className="text-danger">*</span></label>
                <input type="text" className="form-control-modern w-100" name="enteredBy" value={formData.enteredBy} onChange={e => setFormData({...formData, enteredBy: e.target.value})} required placeholder="e.g. Anitha Devi" />
              </div>
              
              <div className="col-md-3">
                <label className="form-label small fw-semibold text-muted">Eggs Produced <span className="text-danger">*</span></label>
                <input type="number" min="0" className="form-control-modern w-100" name="eggsProduced" value={formData.eggsProduced} onChange={e => setFormData({...formData, eggsProduced: e.target.value})} required />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-semibold text-muted">Eggs Sold <span className="text-danger">*</span></label>
                <input type="number" min="0" className="form-control-modern w-100" name="eggsSold" value={formData.eggsSold} onChange={e => setFormData({...formData, eggsSold: e.target.value})} required />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-semibold text-muted">Damaged Eggs</label>
                <input type="number" min="0" className="form-control-modern w-100" name="damagedEggs" value={formData.damagedEggs} onChange={e => setFormData({...formData, damagedEggs: e.target.value})} />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-semibold text-muted text-primary">Estimated Profit Per Egg (₹ )</label>
                <input type="number" min="0" step="0.01" className="form-control-modern w-100 border-primary" name="profitPerEgg" value={formData.profitPerEgg} onChange={e => setFormData({...formData, profitPerEgg: e.target.value})} placeholder="e.g. 1.25" />
              </div>
            </div>
            <div className="d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-light fw-medium border" onClick={handleResetForm}>Cancel</button>
              <button type="submit" className="btn-primary-modern px-4" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : (isEditing ? 'Update Record' : 'Save Record')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="row g-3 mb-4">
        {[
          { title: 'Total Produced', value: totalProduced.toLocaleString(), icon: <Egg size={20} />, color: 'primary' },
          { title: 'Total Profit (₹ )', value: `₹ ${totalProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}`, icon: <TrendingUp size={20} />, color: 'warning' },
          { title: 'Available Stock', value: availableStock.toLocaleString(), icon: <Package size={20} />, color: 'success' },
          { title: 'Total Sold', value: totalSold.toLocaleString(), icon: <ShoppingCart size={20} />, color: 'info' },
          { title: 'Total Damaged', value: totalDamaged.toLocaleString(), icon: <AlertTriangle size={20} />, color: 'danger' }
        ].map((stat, idx) => (
          <div className="col-12 col-sm-6 col-md-4 col-xl" key={idx}>
            <div className="saas-card p-3 d-flex align-items-center gap-3">
              <div className={`bg-${stat.color} bg-opacity-10 text-${stat.color} rounded-circle p-3`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-muted small fw-semibold text-uppercase mb-1">{stat.title}</p>
                <h3 className="fw-bold m-0 text-dark">{stat.value}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      

      {/* {showForm && (
        <div className="saas-card p-4 mb-4 animate-fade-in border-start border-primary border-4">
          <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
            <Edit2 size={18} className="text-primary" /> 
            {isEditing ? 'Edit Record' : 'Create New Record'}
          </h5>
          <form onSubmit={handleSubmit}>
            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <label className="form-label small fw-semibold text-muted">Select Batch <span className="text-danger">*</span></label>
                <select className="form-select form-control-modern w-100" name="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required>
                  <option value="">-- Select Active Batch --</option>
                  {activeBatches.map(b => (
                    <option key={b._id} value={b.name}>{b.name} ({formatDate(b.startDate)})</option>
                  ))}
                  {isEditing && !activeBatches.find(b => b.name === formData.name) && (
                    <option value={formData.name}>{formData.name} (Archived)</option>
                  )}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-semibold text-muted">Date <span className="text-danger">*</span></label>
                <input type="date" className="form-control-modern w-100" name="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-semibold text-muted">Price Per Egg (₹ ) <span className="text-danger">*</span></label>
                <input type="number" min="0.01" step="0.01" className="form-control-modern w-100" name="eggPrice" value={formData.eggPrice} onChange={e => setFormData({...formData, eggPrice: e.target.value})} required />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-semibold text-muted">Entered By <span className="text-danger">*</span></label>
                <input type="text" className="form-control-modern w-100" name="enteredBy" value={formData.enteredBy} onChange={e => setFormData({...formData, enteredBy: e.target.value})} required placeholder="e.g. Anitha Devi" />
              </div>
              
              <div className="col-md-3">
                <label className="form-label small fw-semibold text-muted">Eggs Produced <span className="text-danger">*</span></label>
                <input type="number" min="0" className="form-control-modern w-100" name="eggsProduced" value={formData.eggsProduced} onChange={e => setFormData({...formData, eggsProduced: e.target.value})} required />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-semibold text-muted">Eggs Sold <span className="text-danger">*</span></label>
                <input type="number" min="0" className="form-control-modern w-100" name="eggsSold" value={formData.eggsSold} onChange={e => setFormData({...formData, eggsSold: e.target.value})} required />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-semibold text-muted">Damaged Eggs</label>
                <input type="number" min="0" className="form-control-modern w-100" name="damagedEggs" value={formData.damagedEggs} onChange={e => setFormData({...formData, damagedEggs: e.target.value})} />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-semibold text-muted text-primary">Estimated Profit Per Egg (₹ )</label>
                <input type="number" min="0" step="0.01" className="form-control-modern w-100 border-primary" name="profitPerEgg" value={formData.profitPerEgg} onChange={e => setFormData({...formData, profitPerEgg: e.target.value})} placeholder="e.g. 1.25" />
              </div>
            </div>
            <div className="d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-light fw-medium border" onClick={handleResetForm}>Cancel</button>
              <button type="submit" className="btn-primary-modern px-4" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : (isEditing ? 'Update Record' : 'Save Record')}
              </button>
            </div>
          </form>
        </div>
      )} */}

      <div className="saas-card printable-area">
        <div className="p-4 border-bottom d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div className="position-relative" style={{ maxWidth: '300px', width: '100%' }}>
            <Search size={18} className="position-absolute top-50 translate-middle-y text-muted" style={{ left: '12px' }} />
            <input 
              type="text" 
              className="form-control-modern w-100" 
              placeholder="Search records..." 
              value={searchTerm} 
              onChange={e => {setSearchTerm(e.target.value); setCurrentPage(1);}}
              style={{ paddingLeft: '38px' }}
            />
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-light border d-inline-flex align-items-center gap-2 btn-sm fw-medium" onClick={exportToExcel} title="Export Excel">
              <Download size={16} /> <span className="d-none d-md-inline">Excel</span>
            </button>
            <button className="btn btn-light border d-inline-flex align-items-center gap-2 btn-sm fw-medium" onClick={exportToPDF} title="Export PDF">
              <Filter size={16} /> <span className="d-none d-md-inline">PDF</span>
            </button>
            <button className="btn btn-light border d-inline-flex align-items-center gap-2 btn-sm fw-medium" onClick={() => window.print()} title="Print">
              <Printer size={16} />
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="modern-table">
            <thead>
              <tr>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('date')}>Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('name')}>Batch {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th className="text-end">Alive Hens</th>
                <th className="text-end">Produced</th>
                <th className="text-end">Production %</th>
                <th className="text-end">Total Profit (₹ )</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="text-center py-5"><div className="spinner-border text-primary"></div></td></tr>
              ) : currentTableData.length > 0 ? (
                currentTableData.map(entry => (
                  <tr key={entry._id}>
                    <td className="text-primary text-decoration-underline" style={{ cursor: 'pointer' }} onClick={() => setSelectedRecord(entry)}>{formatDate(entry.date)}</td>
                    <td className="fw-medium text-primary">{entry.name}</td>
                    <td className="text-end fw-medium">{entry.aliveHens?.toLocaleString() || '-'}</td>
                    <td className="text-end fw-medium">{entry.eggsProduced?.toLocaleString()}</td>
                    <td className="text-end fw-bold text-success">{entry.productionPercentage ? entry.productionPercentage.toFixed(2) : '0.00'}%</td>
                    <td className="text-end fw-bold text-warning">₹ {(entry.profit || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td className="text-end">
                      <div className="d-flex justify-content-end gap-2">
                        <button className="btn btn-sm btn-light border p-1 rounded d-flex align-items-center text-secondary" onClick={() => handleEdit(entry)} title="Edit">
                          <Edit2 size={16} />
                        </button>
                        <button className="btn btn-sm btn-light border p-1 rounded d-flex align-items-center text-danger" onClick={() => handleDelete(entry._id)} title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-5">
                    <div className="d-flex flex-column align-items-center text-muted">
                      <AlertCircle size={40} className="mb-3 opacity-50" />
                      <h5>No records found</h5>
                      <p className="small mb-0">Try adjusting your search criteria or add a new record.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-3 border-top d-flex justify-content-between align-items-center">
            <span className="small text-muted fw-medium">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, processedEntries.length)} of {processedEntries.length} entries
            </span>
            <div className="d-flex gap-1">
              <button className="btn btn-sm btn-light border" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button key={i} className={`btn btn-sm ${currentPage === i + 1 ? 'btn-primary' : 'btn-light border'} fw-medium px-3`} onClick={() => setCurrentPage(i + 1)}>
                  {i + 1}
                </button>
              ))}
              <button className="btn btn-sm btn-light border" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
      {selectedRecord && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)', zIndex: 1050 }} tabIndex="-1" onClick={(e) => { if (e.target.classList.contains('modal')) setSelectedRecord(null); }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg" style={{ maxHeight: '90vh' }}>
              <div className="modal-header bg-white border-bottom">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2"><Egg size={20} className="text-primary"/> Egg Record Details</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedRecord(null)}></button>
              </div>
              <div className="modal-body p-4 bg-light" style={{ overflowY: 'auto' }}>
                <div className="card border-0 shadow-sm mb-4">
                  <div className="card-body p-4">
                    <h6 className="text-primary fw-bold mb-4 border-bottom pb-2">Record Overview</h6>
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
                        <p className="text-muted small fw-semibold mb-1">Alive Hens</p>
                        <h6 className="fw-bold m-0">{selectedRecord.aliveHens?.toLocaleString() || '-'}</h6>
                      </div>
                      <div className="col-12 col-md-6">
                        <p className="text-muted small fw-semibold mb-1">Entered By</p>
                        <h6 className="fw-bold m-0">{selectedRecord.enteredBy || '-'}</h6>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row g-4">
                  <div className="col-12 col-lg-6">
                    <div className="card border-0 shadow-sm h-100">
                      <div className="card-body p-4">
                        <h6 className="text-info fw-bold mb-4 border-bottom pb-2">Production Metrics</h6>
                        <div className="row g-4">
                          <div className="col-12 col-sm-6">
                            <p className="text-muted small fw-semibold mb-1">Eggs Produced</p>
                            <h6 className="fw-bold m-0">{selectedRecord.eggsProduced?.toLocaleString()}</h6>
                          </div>
                          <div className="col-12 col-sm-6">
                            <p className="text-muted small fw-semibold mb-1">Production %</p>
                            <h6 className="fw-bold text-success m-0">{selectedRecord.productionPercentage ? selectedRecord.productionPercentage.toFixed(2) : '0.00'}%</h6>
                          </div>
                          <div className="col-12 col-sm-6">
                            <p className="text-muted small fw-semibold mb-1">Eggs Sold</p>
                            <h6 className="fw-bold m-0">{selectedRecord.eggsSold?.toLocaleString()}</h6>
                          </div>
                          <div className="col-12 col-sm-6">
                            <p className="text-muted small fw-semibold mb-1">Damaged Eggs</p>
                            <h6 className="fw-bold text-danger m-0">{selectedRecord.damagedEggs || 0}</h6>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-lg-6">
                    <div className="card border-0 shadow-sm h-100">
                      <div className="card-body p-4">
                        <h6 className="text-warning fw-bold mb-4 border-bottom pb-2">Financials</h6>
                        <div className="row g-4">
                          <div className="col-12 col-sm-6">
                            <p className="text-muted small fw-semibold mb-1">Price Per Egg</p>
                            <h6 className="fw-bold m-0">₹ {selectedRecord.eggPrice}</h6>
                          </div>
                          <div className="col-12 col-sm-6">
                            <p className="text-muted small fw-semibold mb-1">Est. Profit / Egg</p>
                            <h6 className="fw-bold m-0">₹ {selectedRecord.profitPerEgg || 0}</h6>
                          </div>
                          <div className="col-12 col-sm-6">
                            <p className="text-muted small fw-semibold mb-1">Total Sales</p>
                            <h6 className="fw-bold text-primary m-0">₹ {selectedRecord.salesAmount?.toLocaleString()}</h6>
                          </div>
                          <div className="col-12 col-sm-6">
                            <p className="text-muted small fw-semibold mb-1">Total Profit</p>
                            <h6 className="fw-bold text-warning m-0">₹ {selectedRecord.profit?.toLocaleString()}</h6>
                          </div>
                        </div>
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

export default EggManagement;
