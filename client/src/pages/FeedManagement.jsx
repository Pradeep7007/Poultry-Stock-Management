import React, { useState, useEffect} from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  Plus, Edit2, Trash2, Search, Download, Printer, ChevronLeft, ChevronRight,
  TrendingUp, Calendar, AlertCircle, ShoppingBag, DollarSign
} from 'lucide-react';
import { formatDate } from '../utils/dateFormatter';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const FeedManagement = () => {
  const [entries, setEntries] = useState([]);
  const [eggEntries, setEggEntries] = useState([]);
  const [activeBatches, setActiveBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: '', name: '', date: new Date().toISOString().split('T')[0],
    feedWeight: '', feedCost: '', feedType: '', supplier: '', enteredBy: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [chartType, setChartType] = useState('line');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [feedRes, eggRes, batchRes] = await Promise.all([
        api.get('/feed'),
        api.get('/eggs'),
        api.get('/batches')
      ]);
      setEntries(feedRes.data);
      setEggEntries(eggRes.data);
      setActiveBatches(batchRes.data.filter(b => b.status === 'Active'));
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleResetForm = () => {
    setFormData({ id: '', name: '', date: new Date().toISOString().split('T')[0], feedWeight: '', feedCost: '', feedType: '', supplier: '', enteredBy: '' });
    setIsEditing(false);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name, date: formData.date,
        feedWeight: Number(formData.feedWeight), feedCost: Number(formData.feedCost),
        feedType: formData.feedType, supplier: formData.supplier, enteredBy: formData.enteredBy
      };

      if (isEditing) {
        await api.put(`/feed/${formData.id}`, payload);
        toast.success('Feed entry updated!');
      } else {
        const res = await api.post('/feed', payload);
        if (res.data.sheetSync === false) toast.success(res.data.message);
        else toast.success('Feed entry added!');
      }
      handleResetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (entry) => {
    setFormData({
      id: entry._id, name: entry.name, date: new Date(entry.date).toISOString().split('T')[0],
      feedWeight: entry.feedWeight, feedCost: entry.feedCost, feedType: entry.feedType || '',
      supplier: entry.supplier || '', enteredBy: entry.enteredBy || ''
    });
    setIsEditing(true);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        await api.delete(`/feed/${id}`);
        toast.success('Record deleted');
        fetchData();
      } catch (error) {
        toast.error('Failed to delete record');
      }
    }
  };

  // --- Metrics ---
  const totalWeight = entries.reduce((acc, curr) => acc + curr.feedWeight, 0);
  const totalCost = entries.reduce((acc, curr) => acc + curr.feedCost, 0);
  const avgCostPerKg = totalWeight > 0 ? (totalCost / totalWeight).toFixed(2) : '0.00';

  const totalEggs = eggEntries.reduce((acc, curr) => acc + curr.eggsProduced, 0);
  const feedCostPerEgg = totalEggs > 0 ? (totalCost / totalEggs).toFixed(2) : '0.00';

  const thisMonthStr = new Date().toISOString().substring(0, 7);
  const monthEntries = entries.filter(e => e.date.startsWith(thisMonthStr));
  const weightThisMonth = monthEntries.reduce((acc, curr) => acc + curr.feedWeight, 0);

  // --- Tables ---
  const searchedData = entries.filter(e =>
    e.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.supplier && e.supplier.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(searchedData.length / itemsPerPage) || 1;
  const tableData = searchedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(searchedData.map(e => ({
      ...e,
      date: formatDate(e.date)
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Feed");
    XLSX.writeFile(wb, "Feed_Records.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Feed Management Report", 14, 15);
    const tableColumn = ["Name", "Date", "Weight(KG)", "Cost(Rs)", "Type", "Supplier", "Entered By"];
    const tableRows = searchedData.map(e => [
      e.name, formatDate(e.date), e.feedWeight, e.feedCost, e.feedType, e.supplier, e.enteredBy
    ]);
    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 20 });
    doc.save("Feed_Records.pdf");
  };

  // --- Chart Data ---
  const getChartData = () => {
    const grouped = {};
    entries.forEach(e => {
      const date = e.date.split('T')[0];
      if (!grouped[date]) grouped[date] = { weight: 0, cost: 0 };
      grouped[date].weight += e.feedWeight;
      grouped[date].cost += e.feedCost;
    });
    const labels = Object.keys(grouped).sort();

    return {
      labels,
      datasets: [
        {
          label: 'Weight (KG)',
          data: labels.map(l => grouped[l].weight),
          borderColor: '#10B981', backgroundColor: chartType === 'area' ? 'rgba(16, 185, 129, 0.1)' : '#10B981', fill: chartType === 'area'
        },
        {
          label: 'Cost (₹)',
          data: labels.map(l => grouped[l].cost),
          borderColor: '#F59E0B', backgroundColor: chartType === 'area' ? 'rgba(245, 158, 11, 0.1)' : '#F59E0B', fill: chartType === 'area',
          hidden: true
        }
      ]
    };
  };

  const renderChart = () => {
    const data = getChartData();
    const options = { responsive: true, maintainAspectRatio: false };
    if (chartType === 'pie' || chartType === 'doughnut') {
      const typeGroup = {};
      entries.forEach(e => {
        const type = e.feedType || 'Unknown';
        if (!typeGroup[type]) typeGroup[type] = 0;
        typeGroup[type] += e.feedWeight;
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
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">Feed Management</h2>
          <p className="text-muted mb-0">Track feed inventory, purchases, and costs.</p>
        </div>
        <button className="btn-primary-modern" onClick={() => { setShowForm(!showForm); setIsEditing(false); }}>
          {showForm ? 'Close Form' : <><Plus size={20} /> Add Feed Record</>}
        </button>
      </div>

      <div className="row g-3 mb-4">
        {[
          { title: 'Total Feed (KG)', value: totalWeight.toLocaleString(), icon: <ShoppingBag size={20} />, color: 'primary' },
          { title: 'This Month (KG)', value: weightThisMonth.toLocaleString(), icon: <Calendar size={20} />, color: 'info' },
          { title: 'Total Cost (₹)', value: `₹${totalCost.toLocaleString()}`, icon: <DollarSign size={20} />, color: 'danger' },
          { title: 'Avg Cost / KG', value: `₹${avgCostPerKg}`, icon: <TrendingUp size={20} />, color: 'warning' },
          { title: 'Feed Cost / Egg', value: `₹${feedCostPerEgg}`, icon: <TrendingUp size={20} />, color: 'success' }
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

      {showForm && (
        <div className="saas-card p-4 mb-4 border-start border-warning border-4 animate-fade-in">
          <h5 className="fw-bold mb-4">{isEditing ? 'Edit Feed Record' : 'Add Feed Record'}</h5>
          <form onSubmit={handleSubmit}>
            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <label className="form-label small fw-semibold text-muted">Select Batch <span className="text-danger">*</span></label>
                <select className="form-select form-control-modern w-100" name="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required>
                  <option value="">-- Select Active Batch --</option>
                  {activeBatches.map(b => (
                    <option key={b._id} value={b.name}>{b.name}</option>
                  ))}
                  {isEditing && !activeBatches.find(b => b.name === formData.name) && formData.name && (
                    <option value={formData.name}>{formData.name} (Archived)</option>
                  )}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-semibold text-muted">Date <span className="text-danger">*</span></label>
                <input type="date" className="form-control-modern w-100" name="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-semibold text-muted">Weight (KG) <span className="text-danger">*</span></label>
                <input type="number" min="0.01" step="0.01" className="form-control-modern w-100" name="feedWeight" value={formData.feedWeight} onChange={e => setFormData({ ...formData, feedWeight: e.target.value })} required />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-semibold text-muted">Total Cost (₹) <span className="text-danger">*</span></label>
                <input type="number" min="0.01" step="0.01" className="form-control-modern w-100" name="feedCost" value={formData.feedCost} onChange={e => setFormData({ ...formData, feedCost: e.target.value })} required />
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-semibold text-muted">Feed Type (Optional)</label>
                <input type="text" className="form-control-modern w-100" name="feedType" value={formData.feedType} onChange={e => setFormData({ ...formData, feedType: e.target.value })} />
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-semibold text-muted">Supplier (Optional)</label>
                <input type="text" className="form-control-modern w-100" name="supplier" value={formData.supplier} onChange={e => setFormData({ ...formData, supplier: e.target.value })} />
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-semibold text-muted">Entered By <span className="text-danger">*</span></label>
                <input type="text" className="form-control-modern w-100" name="enteredBy" value={formData.enteredBy} onChange={e => setFormData({ ...formData, enteredBy: e.target.value })} required />
              </div>
            </div>
            <div className="d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-light fw-medium border" onClick={handleResetForm}>Cancel</button>
              <button type="submit" className="btn-primary-modern px-4" style={{ backgroundColor: 'var(--warning)', color: '#000' }} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Record'}
              </button>
            </div>
          </form>
        </div>
      )}

     <div className="col-12">
  {" "}
  <div className="saas-card h-100 d-flex flex-column w-100">
    {" "}
    <div className="p-3 border-bottom d-flex justify-content-between gap-2 flex-wrap">
      {" "}
      <div className="position-relative w-100" style={{ maxWidth: "300px" }}>
        {" "}
        <Search
          size={16}
          className="position-absolute top-50 translate-middle-y text-muted"
          style={{ left: "12px" }}
        />{" "}
        <input
          type="text"
          className="form-control-modern w-100 form-control-sm"
          placeholder="Search..."
          value={searchTerm}
          onChange={function (e) {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          style={{ paddingLeft: "34px" }}
        />{" "}
      </div>{" "}
      <div className="d-flex gap-2">
        {" "}
        <button className="btn btn-light btn-sm border" onClick={exportToExcel}>
          {" "}
          <Download size={14} />{" "}
        </button>{" "}
        <button className="btn btn-light btn-sm border" onClick={exportToPDF}>
          {" "}
          <Printer size={14} />{" "}
        </button>{" "}
      </div>{" "}
    </div>{" "}
    <div className="table-responsive flex-grow-1 w-100">
      {" "}
      <table className="modern-table w-100" style={{ minWidth: "900px" }}>
        {" "}
        <thead>
          {" "}
          <tr>
            {" "}
            <th>Name</th> <th>Date</th> <th>Type</th> <th>Supplier</th>{" "}
            <th>Weight</th> <th>Cost</th> <th>Entered By</th>{" "}
            <th className="text-end">Actions</th>{" "}
          </tr>{" "}
        </thead>{" "}
        <tbody>
          {" "}
          {loading ? (
            <tr>
              {" "}
              <td colSpan="8" className="text-center py-4">
                {" "}
                <div className="spinner-border text-primary"></div>{" "}
              </td>{" "}
            </tr>
          ) : tableData.length > 0 ? (
            tableData.map((item) => (
              <tr key={item._id}>
                {" "}
                <td className="fw-medium"> {item.name} </td>{" "}
                <td
                  className="text-primary text-decoration-underline"
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedRecord(item)}
                >
                  {" "}
                  {formatDate(item.date)}{" "}
                </td>{" "}
                <td> {item.feedType || "-"} </td>{" "}
                <td> {item.supplier || "-"} </td>{" "}
                <td>
                  {" "}
                  <span className="badge-modern badge-success">
                    {" "}
                    {item.feedWeight} KG{" "}
                  </span>{" "}
                </td>{" "}
                <td className="fw-bold text-danger"> ₹{item.feedCost} </td>{" "}
                <td> {item.enteredBy} </td>{" "}
                <td className="text-end">
                  {" "}
                  <button
                    className="btn btn-sm btn-light text-primary me-2"
                    onClick={() => handleEdit(item)}
                  >
                    {" "}
                    <Edit2 size={16} />{" "}
                  </button>{" "}
                  <button
                    className="btn btn-sm btn-light text-danger"
                    onClick={() => handleDelete(item._id)}
                  >
                    {" "}
                    <Trash2 size={16} />{" "}
                  </button>{" "}
                </td>{" "}
              </tr>
            ))
          ) : (
            <tr>
              {" "}
              <td colSpan="8" className="text-center py-4 text-muted">
                {" "}
                <AlertCircle size={32} className="opacity-50 mb-2" />{" "}
                <p className="mb-0"> No records found. </p>{" "}
              </td>{" "}
            </tr>
          )}{" "}
        </tbody>{" "}
      </table>{" "}
    </div>{" "}
    {totalPages > 1 && (
      <div className="p-3 border-top d-flex justify-content-end gap-1 flex-wrap">
        {" "}
        <button
          className="btn btn-sm btn-light border"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((p) => p - 1)}
        >
          {" "}
          <ChevronLeft size={16} />{" "}
        </button>{" "}
        {Array.from({ length: totalPages }).map((_, i) => (
          <button
            key={i}
            className={`btn btn-sm ${
              currentPage === i + 1 ? "btn-primary" : "btn-light border"
            }`}
            onClick={() => setCurrentPage(i + 1)}
          >
            {" "}
            {i + 1}{" "}
          </button>
        ))}{" "}
        <button
          className="btn btn-sm btn-light border"
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage((p) => p + 1)}
        >
          {" "}
          <ChevronRight size={16} />{" "}
        </button>{" "}
      </div>
    )}{" "}
  </div>{" "}
</div>;


      <div className="col-12 col-xl-4 mt-3">
        <div className="saas-card p-4 h-100">
          <div className="d-flex justify-content-between mb-3">
            <h5 className="fw-bold m-0">Analytics</h5>
            <select className="form-select form-select-sm w-auto" value={chartType} onChange={e => setChartType(e.target.value)}>
              <option value="line">Line</option>
              <option value="area">Area</option>
              <option value="column">Bar</option>
              <option value="pie">Pie (by Type)</option>
            </select>
          </div>
          <div style={{ height: '300px' }}>{renderChart()}</div>
        </div>
      </div>

      {selectedRecord && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)', zIndex: 1050 }} tabIndex="-1" onClick={(e) => { if (e.target.classList.contains('modal')) setSelectedRecord(null); }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg" style={{ maxHeight: '90vh' }}>
              <div className="modal-header bg-white border-bottom">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2"><ShoppingBag size={20} className="text-primary" /> Feed Record Details</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedRecord(null)}></button>
              </div>
              <div className="modal-body p-4 bg-light" style={{ overflowY: 'auto' }}>
                <div className="card border-0 shadow-sm mb-4">
                  <div className="card-body p-4">
                    <h6 className="text-primary fw-bold mb-4 border-bottom pb-2">Feed Information</h6>
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
                        <p className="text-muted small fw-semibold mb-1">Feed Type</p>
                        <h6 className="fw-bold m-0">{selectedRecord.feedType || '-'}</h6>
                      </div>
                      <div className="col-12 col-md-6">
                        <p className="text-muted small fw-semibold mb-1">Supplier</p>
                        <h6 className="fw-bold m-0">{selectedRecord.supplier || '-'}</h6>
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
                    <h6 className="text-success fw-bold mb-4 border-bottom pb-2">Metrics & Cost</h6>
                    <div className="row g-4">
                      <div className="col-12 col-md-6">
                        <p className="text-muted small fw-semibold mb-1">Weight</p>
                        <h6 className="fw-bold text-success m-0">{selectedRecord.feedWeight} KG</h6>
                      </div>
                      <div className="col-12 col-md-6">
                        <p className="text-muted small fw-semibold mb-1">Total Cost</p>
                        <h6 className="fw-bold text-danger m-0">₹{selectedRecord.feedCost}</h6>
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
