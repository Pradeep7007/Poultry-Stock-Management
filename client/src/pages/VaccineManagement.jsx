import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { 
  Plus, Edit2, Trash2, Search, Download, Printer, ChevronLeft, ChevronRight, AlertCircle, Syringe, Activity, DollarSign, Clock
} from 'lucide-react';
import { formatDate } from '../utils/dateFormatter';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const VaccineManagement = () => {
  const [entries, setEntries] = useState([]);
  const [activeBatch, setActiveBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: '', date: new Date().toISOString().split('T')[0], type: 'Medicine',
    medicineName: '', dosage: '', quantity: '', cost: '', notes: '', enteredBy: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [chartType, setChartType] = useState('line');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [vaccineRes, batchRes] = await Promise.all([
        api.get('/vaccines'),
        api.get('/batches')
      ]);
      setEntries(vaccineRes.data);
      const current = batchRes.data.find(b => b.status === 'Active');
      setActiveBatch(current);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleResetForm = () => {
    setFormData({ 
      id: '', date: new Date().toISOString().split('T')[0], type: 'Medicine',
      medicineName: '', dosage: '', quantity: '', cost: '', notes: '', enteredBy: '' 
    });
    setIsEditing(false);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeBatch) {
      toast.error("No active batch found!");
      return;
    }
    
    try {
      const payload = {
        name: activeBatch.name,
        date: formData.date,
        type: formData.type,
        medicineName: formData.medicineName,
        dosage: formData.dosage,
        quantity: Number(formData.quantity),
        cost: Number(formData.cost),
        notes: formData.notes,
        enteredBy: formData.enteredBy
      };

      if (isEditing) {
        await api.put(`/vaccines/${formData.id}`, payload);
        toast.success('Record updated successfully!');
      } else {
        const res = await api.post('/vaccines', payload);
        if (res.data.sheetSync === false) toast.success(res.data.message);
        else toast.success('Record added successfully!');
      }
      handleResetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Something went wrong');
    }
  };

  const handleEdit = (entry) => {
    setFormData({
      id: entry._id, date: new Date(entry.date).toISOString().split('T')[0], 
      type: entry.type, medicineName: entry.medicineName, dosage: entry.dosage, 
      quantity: entry.quantity, cost: entry.cost, notes: entry.notes || '', enteredBy: entry.enteredBy || ''
    });
    setIsEditing(true);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        await api.delete(`/vaccines/${id}`);
        toast.success('Record deleted');
        fetchData();
      } catch (error) {
        toast.error('Failed to delete record');
      }
    }
  };

  // --- Metrics ---
  const activeEntries = entries.filter(e => activeBatch && e.batchId === activeBatch._id);
  
  const medicines = entries.filter(e => e.type === 'Medicine');
  const vaccines = entries.filter(e => e.type === 'Vaccine');
  
  const totalMedicineCost = medicines.reduce((sum, e) => sum + e.cost, 0);
  const totalVaccineCost = vaccines.reduce((sum, e) => sum + e.cost, 0);
  const totalTreatmentCost = totalMedicineCost + totalVaccineCost;
  
  const aliveHens = activeBatch ? activeBatch.aliveHens : 0;
  const costPerHen = aliveHens > 0 ? (totalTreatmentCost / aliveHens).toFixed(2) : '0.00';
  
  const latestTreatment = entries.length > 0 ? entries[0] : null;

  // --- Table Data ---
  const searchedData = entries.filter(e => 
    e.medicineName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.type?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const totalPages = Math.ceil(searchedData.length / itemsPerPage) || 1;
  const tableData = searchedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(searchedData.map(e => ({
      ...e, date: formatDate(e.date)
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Treatments");
    XLSX.writeFile(wb, "Treatment_Records.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Treatment Management Report", 14, 15);
    const tableColumn = ["Date", "Type", "Name", "Dosage", "Qty", "Cost(Rs)", "Entered By"];
    const tableRows = searchedData.map(e => [
      formatDate(e.date), e.type, e.medicineName, e.dosage, e.quantity, e.cost, e.enteredBy
    ]);
    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 20 });
    doc.save("Treatment_Records.pdf");
  };

  // --- Chart Data ---
  const getChartData = () => {
    const grouped = {};
    entries.forEach(e => {
      const date = e.date.split('T')[0];
      if (!grouped[date]) grouped[date] = { medCost: 0, vacCost: 0 };
      if (e.type === 'Medicine') grouped[date].medCost += e.cost;
      else grouped[date].vacCost += e.cost;
    });
    const labels = Object.keys(grouped).sort();
    
    if (chartType === 'pie' || chartType === 'doughnut') {
      return {
        labels: ['Medicine Cost', 'Vaccine Cost'],
        datasets: [{
          data: [totalMedicineCost, totalVaccineCost],
          backgroundColor: ['#3B82F6', '#10B981'],
          borderWidth: 0
        }]
      };
    }
    
    return {
      labels,
      datasets: [
        {
          label: 'Medicine Cost (₹)',
          data: labels.map(l => grouped[l].medCost),
          borderColor: '#3B82F6', backgroundColor: chartType === 'area' ? 'rgba(59, 130, 246, 0.1)' : '#3B82F6', fill: chartType === 'area'
        },
        {
          label: 'Vaccine Cost (₹)',
          data: labels.map(l => grouped[l].vacCost),
          borderColor: '#10B981', backgroundColor: chartType === 'area' ? 'rgba(16, 185, 129, 0.1)' : '#10B981', fill: chartType === 'area'
        }
      ]
    };
  };

  const renderChart = () => {
    const data = getChartData();
    const options = { responsive: true, maintainAspectRatio: false };
    switch (chartType) {
      case 'line': case 'area': return <Line data={data} options={options} />;
      case 'column': return <Bar data={data} options={{...options, stacked: true}} />;
      case 'pie': return <Pie data={data} options={options} />;
      case 'doughnut': return <Doughnut data={data} options={options} />;
      default: return <Line data={data} options={options} />;
    }
  };

  return (
    <div className="animate-slide-up">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">Vaccines & Medicine</h2>
          <p className="text-muted mb-0">Track treatments, medicine usage, and vaccination schedules.</p>
        </div>
        <button className="btn-primary-modern" onClick={() => { setShowForm(!showForm); setIsEditing(false); }}>
          {showForm ? 'Close Form' : <><Plus size={20} /> Add Treatment</>}
        </button>
      </div>

      <div className="row g-3 mb-4">
        {[
          { title: 'Total Medicines', value: medicines.length, icon: <Activity size={20} />, color: 'primary' },
          { title: 'Total Vaccines', value: vaccines.length, icon: <Syringe size={20} />, color: 'info' },
          { title: 'Medicine Cost', value: `₹${totalMedicineCost.toLocaleString()}`, icon: <DollarSign size={20} />, color: 'warning' },
          { title: 'Vaccine Cost', value: `₹${totalVaccineCost.toLocaleString()}`, icon: <DollarSign size={20} />, color: 'success' },
          { title: 'Total Treatment Cost', value: `₹${totalTreatmentCost.toLocaleString()}`, icon: <DollarSign size={20} />, color: 'danger' },
          { title: 'Cost Per Hen', value: `₹${costPerHen}`, icon: <Activity size={20} />, color: 'secondary' }
        ].map((stat, idx) => (
          <div className="col-12 col-sm-6 col-md-4 col-xl" key={idx}>
            <div className="saas-card p-3 h-100 d-flex align-items-center gap-3">
              <div className={`text-${stat.color} bg-${stat.color} bg-opacity-10 rounded-circle p-3`}>{stat.icon}</div>
              <div><p className="text-muted small fw-semibold m-0 text-uppercase">{stat.title}</p><h5 className="fw-bold m-0">{stat.value}</h5></div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="saas-card p-4 mb-4 border-start border-primary border-4 animate-fade-in">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h5 className="fw-bold m-0">{isEditing ? 'Edit Treatment' : 'Add Treatment Record'}</h5>
            {activeBatch && <span className="badge bg-success bg-opacity-10 text-success border border-success">Active Batch: {activeBatch.name}</span>}
          </div>
          <form onSubmit={handleSubmit}>
            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <label className="form-label small fw-semibold text-muted">Date <span className="text-danger">*</span></label>
                <input type="date" className="form-control-modern w-100" name="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-semibold text-muted">Type <span className="text-danger">*</span></label>
                <select className="form-select form-control-modern w-100" name="type" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} required>
                  <option value="Medicine">Medicine</option>
                  <option value="Vaccine">Vaccine</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-semibold text-muted">Medicine/Vaccine Name <span className="text-danger">*</span></label>
                <input type="text" className="form-control-modern w-100" name="medicineName" value={formData.medicineName} onChange={e => setFormData({...formData, medicineName: e.target.value})} required />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-semibold text-muted">Dosage <span className="text-danger">*</span></label>
                <input type="text" className="form-control-modern w-100" name="dosage" placeholder="e.g., 5ml per 100 birds" value={formData.dosage} onChange={e => setFormData({...formData, dosage: e.target.value})} required />
              </div>
              <div className="col-md-2">
                <label className="form-label small fw-semibold text-muted">Quantity <span className="text-danger">*</span></label>
                <input type="number" min="0.01" step="0.01" className="form-control-modern w-100" name="quantity" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} required />
              </div>
              <div className="col-md-2">
                <label className="form-label small fw-semibold text-muted">Total Cost (₹) <span className="text-danger">*</span></label>
                <input type="number" min="0.01" step="0.01" className="form-control-modern w-100" name="cost" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} required />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-semibold text-muted">Entered By <span className="text-danger">*</span></label>
                <input type="text" className="form-control-modern w-100" name="enteredBy" value={formData.enteredBy} onChange={e => setFormData({...formData, enteredBy: e.target.value})} required />
              </div>
              <div className="col-md-5">
                <label className="form-label small fw-semibold text-muted">Notes (Optional)</label>
                <input type="text" className="form-control-modern w-100" name="notes" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
              </div>
            </div>
            <div className="d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-light fw-medium border" onClick={handleResetForm}>Cancel</button>
              <button type="submit" className="btn-primary-modern px-4">Save Record</button>
            </div>
          </form>
        </div>
      )}

      <div className="row g-4 mb-4">
        <div className="col-12 col-xl-4 d-flex flex-column gap-4">
          <div className="saas-card p-4 flex-grow-1">
            <div className="d-flex justify-content-between mb-3">
              <h5 className="fw-bold m-0">Cost Analytics</h5>
              <select className="form-select form-select-sm w-auto" value={chartType} onChange={e => setChartType(e.target.value)}>
                <option value="line">Line</option>
                <option value="area">Area</option>
                <option value="column">Bar</option>
                <option value="doughnut">Doughnut</option>
              </select>
            </div>
            <div style={{ height: '220px' }}>{renderChart()}</div>
          </div>

          <div className="saas-card p-4 bg-primary bg-opacity-10 border-0 text-primary">
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2"><Clock size={20}/> Latest Treatment</h5>
            {latestTreatment ? (
              <div>
                <h6 className="fw-bold mb-1">{latestTreatment.medicineName}</h6>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className={`badge bg-${latestTreatment.type === 'Vaccine' ? 'success' : 'primary'}`}>{latestTreatment.type}</span>
                  <span className="small fw-semibold">{formatDate(latestTreatment.date)}</span>
                </div>
                <p className="mb-0 small fw-medium">Dosage: {latestTreatment.dosage}</p>
              </div>
            ) : (
              <p className="mb-0 small">No treatments recorded yet.</p>
            )}
          </div>
        </div>

        <div className="col-12 col-xl-8">
          <div className="saas-card h-100 d-flex flex-column">
            <div className="p-3 border-bottom d-flex justify-content-between gap-2">
              <div className="position-relative w-100" style={{ maxWidth: '300px' }}>
                <Search size={16} className="position-absolute top-50 translate-middle-y text-muted" style={{ left: '12px' }} />
                <input type="text" className="form-control-modern w-100 form-control-sm" placeholder="Search medicines..." value={searchTerm} onChange={e => {setSearchTerm(e.target.value); setCurrentPage(1);}} style={{ paddingLeft: '34px' }} />
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-light btn-sm border" onClick={exportToExcel}><Download size={14}/></button>
                <button className="btn btn-light btn-sm border" onClick={exportToPDF}><Printer size={14}/></button>
              </div>
            </div>

            <div className="table-responsive flex-grow-1">
              <table className="modern-table">
                <thead>
                  <tr><th>Date</th><th>Type</th><th>Name</th><th>Dosage</th><th>Quantity</th><th>Cost</th><th className="text-end">Actions</th></tr>
                </thead>
                <tbody>
                  {loading ? <tr><td colSpan="7" className="text-center py-4"><div className="spinner-border text-primary"></div></td></tr> : tableData.length > 0 ? tableData.map(item => (
                    <tr key={item._id}>
                      <td className="text-primary text-decoration-underline" style={{ cursor: 'pointer' }} onClick={() => setSelectedRecord(item)}>{formatDate(item.date)}</td>
                      <td><span className={`badge-modern badge-${item.type === 'Vaccine' ? 'success' : 'primary'}`}>{item.type}</span></td>
                      <td className="fw-medium">{item.medicineName}</td>
                      <td>{item.dosage}</td>
                      <td>{item.quantity}</td>
                      <td className="fw-bold text-danger">₹{item.cost}</td>
                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-2">
                          <button className="btn btn-sm btn-light text-primary me-2" onClick={() => handleEdit(item)}><Edit2 size={16}/></button>
                          <button className="btn btn-sm btn-light text-danger" onClick={() => handleDelete(item._id)}><Trash2 size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  )) : <tr><td colSpan="7" className="text-center py-4 text-muted"><AlertCircle size={32} className="opacity-50 mb-2" /><p className="mb-0">No records found.</p></td></tr>}
                </tbody>
              </table>
            </div>
            
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
      </div>

      {/* Details Modal */}
      {selectedRecord && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)', zIndex: 1050 }} tabIndex="-1" onClick={(e) => { if (e.target.classList.contains('modal')) setSelectedRecord(null); }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg" style={{ maxHeight: '90vh' }}>
              <div className="modal-header bg-white border-bottom">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2"><Syringe size={20} className="text-primary"/> Treatment Details</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedRecord(null)}></button>
              </div>
              <div className="modal-body p-4 bg-light" style={{ overflowY: 'auto' }}>
                <div className="card border-0 shadow-sm mb-4">
                  <div className="card-body p-4">
                    <h6 className="text-primary fw-bold mb-4 border-bottom pb-2">Treatment Overview</h6>
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
                        <p className="text-muted small fw-semibold mb-1">Type</p>
                        <h6 className="fw-bold m-0">{selectedRecord.type}</h6>
                      </div>
                      <div className="col-12 col-md-6">
                        <p className="text-muted small fw-semibold mb-1">Medicine Name</p>
                        <h6 className="fw-bold m-0">{selectedRecord.medicineName}</h6>
                      </div>
                      <div className="col-12 col-md-6">
                        <p className="text-muted small fw-semibold mb-1">Entered By</p>
                        <h6 className="fw-bold m-0">{selectedRecord.enteredBy || '-'}</h6>
                      </div>
                    </div>
                  </div>
                </div>
                  
                <div className="card border-0 shadow-sm">
                  <div className="card-body p-4">
                    <h6 className="text-info fw-bold mb-4 border-bottom pb-2">Dosage & Cost</h6>
                    <div className="row g-4">
                      <div className="col-12 col-md-6">
                        <p className="text-muted small fw-semibold mb-1">Dosage</p>
                        <h6 className="fw-bold m-0">{selectedRecord.dosage}</h6>
                      </div>
                      <div className="col-12 col-md-6">
                        <p className="text-muted small fw-semibold mb-1">Quantity</p>
                        <h6 className="fw-bold m-0">{selectedRecord.quantity}</h6>
                      </div>
                      <div className="col-12 col-md-6">
                        <p className="text-muted small fw-semibold mb-1">Total Cost</p>
                        <h6 className="fw-bold text-danger m-0">₹{selectedRecord.cost}</h6>
                      </div>
                      <div className="col-12">
                        <p className="text-muted small fw-semibold mb-1">Notes</p>
                        <h6 className="fw-medium text-muted m-0">{selectedRecord.notes || 'No notes provided.'}</h6>
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

export default VaccineManagement;
