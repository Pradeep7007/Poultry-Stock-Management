import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { KEYS, fetchWorkerById } from '../services/queries';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, Calendar, Briefcase, Phone, MapPin, 
  Plus, Edit2, Trash2, ToggleLeft, ToggleRight,
  CreditCard, Clock, FileText, AlertCircle
} from 'lucide-react';
import { formatDate } from '../utils/dateFormatter';

const WorkerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();
  const { user, currentUserName } = useAuth();

  // Selected Month/Year Filter (for monthly summary and log views)
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  // Search & Filter state for Attendance Table
  const [entrySearch, setEntrySearch] = useState('');
  const [entryAttendanceFilter, setEntryAttendanceFilter] = useState('All');
  const [entryDateFilter, setEntryDateFilter] = useState('');

  // Modals visibility state
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Editing state
  const [isEditingEntry, setIsEditingEntry] = useState(false);
  const [editingEntryData, setEditingEntryData] = useState(null);
  
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [editingPaymentData, setEditingPaymentData] = useState(null);

  // Form states
  const [profileForm, setProfileForm] = useState({
    name: '', jobRole: '', defaultDailyWage: '', phoneNumber: '', address: '', notes: '', status: '', enteredBy: currentUserName
  });

  const [entryForm, setEntryForm] = useState({
    date: new Date().toISOString().split('T')[0],
    attendance: 'Present',
    dailyWage: '',
    workDetails: '',
    createdBy: currentUserName
  });

  useEffect(() => {
    setProfileForm(prev => ({ ...prev, enteredBy: currentUserName || 'Pradeep' }));
    setEntryForm(prev => ({ ...prev, createdBy: currentUserName || 'Pradeep' }));
  }, [currentUserName]);

  const [paymentForm, setPaymentForm] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    amount: '',
    paymentMethod: 'Cash',
    notes: ''
  });

  // Fetch Worker Details
  const { data, isLoading, isError } = useQuery({
    queryKey: ['worker', id],
    queryFn: () => fetchWorkerById(id)
  });

  const worker = data?.worker;
  const stats = data?.stats;

  const entries = useMemo(() => data?.entries || [], [data?.entries]);
  const payments = useMemo(() => data?.payments || [], [data?.payments]);

  // Initialize Profile form when worker details load
  React.useEffect(() => {
    if (worker) {
      setProfileForm({
        name: worker.name,
        jobRole: worker.jobRole || '',
        defaultDailyWage: worker.defaultDailyWage,
        phoneNumber: worker.phoneNumber || '',
        address: worker.address || '',
        notes: worker.notes || '',
        status: worker.status
      });
    }
  }, [worker]);

  // Mutations
  const updateWorkerMutation = useMutation({
    mutationFn: async (updatedData) => {
      const response = await api.put(`/workers/${id}`, updatedData);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['worker', id] });
      queryClient.invalidateQueries({ queryKey: KEYS.WORKERS });
      toast.success('Worker profile updated!');
      setShowEditProfileModal(false);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Error updating worker')
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (newStatus) => {
      const response = await api.put(`/workers/${id}`, { status: newStatus });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['worker', id] });
      queryClient.invalidateQueries({ queryKey: KEYS.WORKERS });
      toast.success(`Worker marked as ${data.status}`);
      addNotification({
        title: 'Worker Status Changed',
        message: `Worker "${data.name}" is now marked as ${data.status}.`,
        type: 'info'
      });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Error toggling worker status')
  });


  const dailyEntryMutation = useMutation({
    mutationFn: async ({ entryData, entryId }) => {
      if (isEditingEntry) {
        const response = await api.put(`/workers/${id}/entries/${entryId}`, entryData);
        return response.data;
      } else {
        const response = await api.post(`/workers/${id}/entries`, entryData);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker', id] });
      queryClient.invalidateQueries({ queryKey: KEYS.WORKERS });
      toast.success(isEditingEntry ? 'Daily work entry updated!' : 'Daily work entry recorded!');
      setShowEntryModal(false);
      resetEntryForm();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Error recording entry')
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (entryId) => {
      const response = await api.delete(`/workers/${id}/entries/${entryId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker', id] });
      queryClient.invalidateQueries({ queryKey: KEYS.WORKERS });
      toast.success('Daily entry deleted.');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Error deleting entry')
  });

  const paymentMutation = useMutation({
    mutationFn: async ({ paymentData, paymentId }) => {
      if (isEditingPayment) {
        const response = await api.put(`/workers/${id}/payments/${paymentId}`, paymentData);
        return response.data;
      } else {
        const response = await api.post(`/workers/${id}/payments`, paymentData);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker', id] });
      queryClient.invalidateQueries({ queryKey: KEYS.WORKERS });
      toast.success(isEditingPayment ? 'Payment record updated!' : 'Payment recorded successfully!');
      setShowPaymentModal(false);
      resetPaymentForm();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Error recording payment')
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId) => {
      const response = await api.delete(`/workers/${id}/payments/${paymentId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker', id] });
      queryClient.invalidateQueries({ queryKey: KEYS.WORKERS });
      toast.success('Payment record deleted.');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Error deleting payment')
  });

  // Reset forms
  const resetEntryForm = () => {
    setEntryForm({
      date: new Date().toISOString().split('T')[0],
      attendance: 'Present',
      dailyWage: worker ? worker.defaultDailyWage : '',
      workDetails: '',
      createdBy: 'Admin'
    });
    setIsEditingEntry(false);
    setEditingEntryData(null);
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      paymentDate: new Date().toISOString().split('T')[0],
      amount: '',
      paymentMethod: 'Cash',
      notes: ''
    });
    setIsEditingPayment(false);
    setEditingPaymentData(null);
  };

  // Pre-fill default wages dynamically in entry form based on attendance type
  React.useEffect(() => {
    if (!isEditingEntry && worker) {
      if (entryForm.attendance === 'Present') {
        setEntryForm(prev => ({ ...prev, dailyWage: worker.defaultDailyWage }));
      } else if (entryForm.attendance === 'Half Day') {
        setEntryForm(prev => ({ ...prev, dailyWage: worker.defaultDailyWage / 2 }));
      } else {
        setEntryForm(prev => ({ ...prev, dailyWage: 0 }));
      }
    }
  }, [entryForm.attendance, worker, isEditingEntry]);

  // Handle forms submit
  const handleProfileSubmit = (e) => {
    e.preventDefault();
    if (!profileForm.name.trim()) return toast.error('Worker name is required');
    updateWorkerMutation.mutate({
      ...profileForm,
      defaultDailyWage: Number(profileForm.defaultDailyWage)
    });
  };

  const handleEntrySubmit = (e) => {
    e.preventDefault();
    if (entryForm.dailyWage === '' || Number(entryForm.dailyWage) < 0) {
      return toast.error('Please enter a valid wage amount (0 or greater)');
    }
    
    dailyEntryMutation.mutate({
      entryData: {
        ...entryForm,
        dailyWage: Number(entryForm.dailyWage)
      },
      entryId: editingEntryData?._id
    });
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    if (paymentForm.amount === '' || Number(paymentForm.amount) < 0) {
      return toast.error('Please enter a valid payment amount (0 or greater)');
    }

    paymentMutation.mutate({
      paymentData: {
        ...paymentForm,
        amount: Number(paymentForm.amount)
      },
      paymentId: editingPaymentData?._id
    });
  };

  // Open Edit Daily Entry Modal
  const handleEditEntry = (entry) => {
    setIsEditingEntry(true);
    setEditingEntryData(entry);
    setEntryForm({
      date: new Date(entry.date).toISOString().split('T')[0],
      attendance: entry.attendance,
      dailyWage: entry.dailyWage,
      workDetails: entry.workDetails || '',
      createdBy: entry.createdBy || 'Admin'
    });
    setShowEntryModal(true);
  };

  // Open Edit Payment Modal
  const handleEditPayment = (payment) => {
    setIsEditingPayment(true);
    setEditingPaymentData(payment);
    setPaymentForm({
      paymentDate: new Date(payment.paymentDate).toISOString().split('T')[0],
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      notes: payment.notes || ''
    });
    setShowPaymentModal(true);
  };

  // Toggle status (Active / Inactive)
  const handleToggleStatus = () => {
    if (!worker) return;
    const newStatus = worker.status === 'Active' ? 'Inactive' : 'Active';
    toggleStatusMutation.mutate(newStatus);
  };


  // Delete daily entry confirm
  const handleDeleteEntry = (entryId) => {
    if (window.confirm('Are you sure you want to delete this daily work record?')) {
      deleteEntryMutation.mutate(entryId);
    }
  };

  // Delete payment record confirm
  const handleDeletePayment = (paymentId) => {
    if (window.confirm('Are you sure you want to delete this salary payment record?')) {
      deletePaymentMutation.mutate(paymentId);
    }
  };

  // Filtered lists for the tables
  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const entryDate = new Date(e.date);
      const matchesSearch = e.workDetails && e.workDetails.toLowerCase().includes(entrySearch.toLowerCase());
      const matchesAttendance = entryAttendanceFilter === 'All' ? true : e.attendance === entryAttendanceFilter;
      const matchesDate = entryDateFilter ? entryDate.toISOString().split('T')[0] === entryDateFilter : true;
      
      // Also filter by selected month/year from switcher
      const matchesMonth = entryDate.getMonth() === Number(selectedMonth) && entryDate.getFullYear() === Number(selectedYear);

      return (entrySearch ? matchesSearch : true) && matchesAttendance && matchesDate && matchesMonth;
    });
  }, [entries, entrySearch, entryAttendanceFilter, entryDateFilter, selectedMonth, selectedYear]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const payDate = new Date(p.paymentDate);
      return payDate.getMonth() === Number(selectedMonth) && payDate.getFullYear() === Number(selectedYear);
    });
  }, [payments, selectedMonth, selectedYear]);

  // Calculations for Selected Month Summary
  const monthlyStats = useMemo(() => {
    const monthEntries = entries.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === Number(selectedMonth) && d.getFullYear() === Number(selectedYear);
    });

    const monthPayments = payments.filter(p => {
      const d = new Date(p.paymentDate);
      return d.getMonth() === Number(selectedMonth) && d.getFullYear() === Number(selectedYear);
    });

    const present = monthEntries.filter(e => e.attendance === 'Present').length;
    const halfDay = monthEntries.filter(e => e.attendance === 'Half Day').length;
    const absent = monthEntries.filter(e => e.attendance === 'Absent').length;
    const leave = monthEntries.filter(e => e.attendance === 'Leave').length;

    const salaryEarned = monthEntries.reduce((sum, e) => sum + e.dailyWage, 0);
    const salaryPaid = monthPayments.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = salaryEarned - salaryPaid;

    return {
      workingDays: monthEntries.length,
      present,
      halfDay,
      absent,
      leave,
      salaryEarned,
      salaryPaid,
      outstanding
    };
  }, [entries, payments, selectedMonth, selectedYear]);

  // List of Month options for selector
  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const yearsList = useMemo(() => {
    const years = [];
    const currentYr = new Date().getFullYear();
    for (let y = currentYr - 5; y <= currentYr + 2; y++) {
      years.push(y);
    }
    return years;
  }, []);

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2 text-muted">Loading worker profile details...</p>
      </div>
    );
  }

  if (isError || !worker) {
    return (
      <div className="saas-card text-center p-5 animate-slide-up">
        <AlertCircle size={48} className="text-danger mb-3 mx-auto" />
        <h5 className="fw-bold">Worker Profile Not Found</h5>
        <p className="text-muted">The worker profile you are looking for does not exist or was removed.</p>
        <button className="btn btn-primary-modern mt-3" onClick={() => navigate('/workers')}>
          <ArrowLeft size={16} /> Back to Workers List
        </button>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      {/* Back & Profile Header */}
      <div className="mb-4">
        <button className="btn btn-sm btn-light border mb-3 d-flex align-items-center gap-1" onClick={() => navigate('/workers')}>
          <ArrowLeft size={16} /> Back to Workers
        </button>
        
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <h2 className="fw-bold m-0">{worker.name}</h2>
              <span className={`badge-modern ${worker.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>
                {worker.status}
              </span>
            </div>
            
            <div className="d-flex flex-wrap gap-3 mt-2 text-muted small">
              {worker.jobRole && <span className="d-flex align-items-center gap-1"><Briefcase size={14}/> {worker.jobRole}</span>}
              {worker.phoneNumber && <span className="d-flex align-items-center gap-1"><Phone size={14}/> {worker.phoneNumber}</span>}
              {worker.address && <span className="d-flex align-items-center gap-1"><MapPin size={14}/> {worker.address}</span>}
            </div>
          </div>

          <div className="d-flex gap-2">
            <button className="btn btn-light border d-flex align-items-center gap-1 text-dark" onClick={() => setShowEditProfileModal(true)}>
              <Edit2 size={16}/> Edit Profile
            </button>
            <button 
              className={`btn d-flex align-items-center gap-1 ${worker.status === 'Active' ? 'btn-outline-danger' : 'btn-outline-success'}`}
              onClick={handleToggleStatus}
            >
              {worker.status === 'Active' ? (
                <><ToggleRight size={18}/> Deactivate</>
              ) : (
                <><ToggleLeft size={18}/> Activate</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Stats Cards (All-time statistics) */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="saas-card p-3">
            <span className="small text-muted d-block text-uppercase fw-bold">Days Worked</span>
            <h3 className="m-0 fw-bold">{stats.presentDays + stats.halfDays} days</h3>
            <span className="small text-muted">{stats.totalWorkingDays} logs recorded</span>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="saas-card p-3">
            <span className="small text-muted d-block text-uppercase fw-bold">Salary Earned</span>
            <h3 className="m-0 fw-bold text-primary">₹ {stats.totalSalaryEarned.toLocaleString('en-IN')}</h3>
            <span className="small text-muted">Total wages accrued</span>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="saas-card p-3">
            <span className="small text-muted d-block text-uppercase fw-bold">Salary Paid</span>
            <h3 className="m-0 fw-bold text-success">₹ {stats.totalSalaryPaid.toLocaleString('en-IN')}</h3>
            <span className="small text-muted">Wages actually cleared</span>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="saas-card p-3">
            <span className="small text-muted d-block text-uppercase fw-bold">Outstanding Salary</span>
            <h3 className={`m-0 fw-bold ${stats.outstandingSalary > 0 ? 'text-danger' : 'text-success'}`}>
              ₹ {stats.outstandingSalary.toLocaleString('en-IN')}
            </h3>
            <span className="small text-muted">Pending balance due</span>
          </div>
        </div>
      </div>

      {/* Quick Actions & Month Switcher */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-md-7">
          <div className="saas-card p-4 h-100">
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2"><Calendar size={20} className="text-primary"/> Monthly Period Filter</h5>
            <div className="row g-3">
              <div className="col-6 col-sm-5">
                <label className="small text-muted fw-bold d-block mb-1">Select Month</label>
                <select 
                  className="form-select form-control-modern py-2 w-100"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                >
                  {monthsList.map((m, idx) => (
                    <option key={m} value={idx}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="col-6 col-sm-4">
                <label className="small text-muted fw-bold d-block mb-1">Select Year</label>
                <select 
                  className="form-select form-control-modern py-2 w-100"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                >
                  {yearsList.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-sm-3 d-flex align-items-end">
                <button className="btn btn-light border py-2 w-100 fw-medium text-dark" onClick={() => { setSelectedMonth(today.getMonth()); setSelectedYear(today.getFullYear()); }}>
                  Current Month
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-5">
          <div className="saas-card p-4 h-100 d-flex flex-column justify-content-center gap-3">
            <h5 className="fw-bold m-0 d-flex align-items-center gap-2"><Clock size={20} className="text-secondary"/> Quick Work Actions</h5>
            <div className="d-grid gap-2">
              <button 
                className="btn btn-primary-modern py-2"
                onClick={() => { resetEntryForm(); setShowEntryModal(true); }}
                disabled={worker.status === 'Inactive'}
              >
                <Plus size={16}/> Daily Attendance & Work Entry
              </button>
              <button 
                className="btn btn-light border py-2 text-dark d-flex align-items-center justify-content-center gap-2"
                onClick={() => { resetPaymentForm(); setShowPaymentModal(true); }}
              >
                <CreditCard size={16} className="text-success"/> Record Salary Payment
              </button>
            </div>
            {worker.status === 'Inactive' && (
              <span className="small text-danger text-center fw-medium">
                Note: Activate the worker profile to enable daily attendance logs.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Summary Statistics Box */}
      <div className="saas-card p-4 mb-4 bg-primary bg-opacity-5 border-start border-primary border-4">
        <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
          <FileText size={20} className="text-primary"/> 
          Summary for {monthsList[selectedMonth]} {selectedYear}
        </h5>
        
        <div className="row g-4 text-center">
          <div className="col-6 col-sm-4 col-md-2 border-end border-2">
            <span className="small text-muted d-block fw-semibold mb-1">Working Days</span>
            <h4 className="fw-bold m-0">{monthlyStats.workingDays}</h4>
          </div>
          <div className="col-6 col-sm-4 col-md-2 border-end border-2">
            <span className="small text-muted d-block fw-semibold mb-1 text-success">Present</span>
            <h4 className="fw-bold text-success m-0">{monthlyStats.present}</h4>
          </div>
          <div className="col-6 col-sm-4 col-md-2 border-end border-2">
            <span className="small text-muted d-block fw-semibold mb-1 text-primary">Half Days</span>
            <h4 className="fw-bold text-primary m-0">{monthlyStats.halfDay}</h4>
          </div>
          <div className="col-6 col-sm-4 col-md-2 border-end border-2">
            <span className="small text-muted d-block fw-semibold mb-1 text-danger">Absent / Leave</span>
            <h4 className="fw-bold text-danger m-0">{monthlyStats.absent} / {monthlyStats.leave}</h4>
          </div>
          <div className="col-6 col-sm-4 col-md-2 border-end border-2">
            <span className="small text-muted d-block fw-semibold mb-1 text-primary">Earned</span>
            <h4 className="fw-bold text-primary m-0">₹ {monthlyStats.salaryEarned.toLocaleString('en-IN')}</h4>
          </div>
          <div className="col-6 col-sm-4 col-md-2">
            <span className="small text-muted d-block fw-semibold mb-1 text-danger">Outstanding</span>
            <h4 className={`fw-bold m-0 ${monthlyStats.outstanding > 0 ? 'text-danger' : 'text-success'}`}>
              ₹ {monthlyStats.outstanding.toLocaleString('en-IN')}
            </h4>
          </div>
        </div>
      </div>

      {/* Attendance & Work History Log (Full Width Table) */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="saas-card p-4">
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-3 gap-2">
              <h5 className="fw-bold m-0">Attendance & Work History</h5>
              <div className="d-flex flex-wrap gap-2">
                <input
                  type="text"
                  className="form-control-modern py-1 px-2 form-control-sm"
                  placeholder="Search work details..."
                  style={{ maxWidth: '180px' }}
                  value={entrySearch}
                  onChange={(e) => setEntrySearch(e.target.value)}
                />
                <select 
                  className="form-select form-control-modern py-1 form-select-sm"
                  style={{ maxWidth: '140px' }}
                  value={entryAttendanceFilter}
                  onChange={(e) => setEntryAttendanceFilter(e.target.value)}
                >
                  <option value="All">All Attendance</option>
                  <option value="Present">Present</option>
                  <option value="Half Day">Half Day</option>
                  <option value="Absent">Absent</option>
                  <option value="Leave">Leave</option>
                </select>
                <input
                  type="date"
                  className="form-control-modern py-1 px-2 form-control-sm"
                  value={entryDateFilter}
                  onChange={(e) => setEntryDateFilter(e.target.value)}
                />
                {entryDateFilter && <button className="btn btn-sm btn-light border px-2 py-1" onClick={() => setEntryDateFilter('')}>Clear Date</button>}
              </div>
            </div>

            <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Attendance</th>
                    <th>Work Details</th>
                    <th>Daily Wage</th>
                    <th>Logged By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center text-muted py-4">
                        No work or attendance records logged for this month.
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map(entry => (
                      <tr key={entry._id}>
                        <td>{formatDate(entry.date)}</td>
                        <td>
                          <span className={`badge-modern ${
                            entry.attendance === 'Present' ? 'badge-success' :
                            entry.attendance === 'Half Day' ? 'badge-primary' :
                            entry.attendance === 'Leave' ? 'badge-warning' : 'badge-danger'
                          }`}>
                            {entry.attendance}
                          </span>
                        </td>
                        <td className="text-wrap" style={{ maxWidth: '280px' }}>
                          {entry.workDetails || <em className="text-muted small">No details recorded</em>}
                        </td>
                        <td>₹ {entry.dailyWage.toLocaleString('en-IN')}</td>
                        <td>{entry.createdBy || 'Admin'}</td>
                        <td>
                          <div className="d-flex gap-2">
                            <button className="btn btn-sm btn-light border p-1" onClick={() => handleEditEntry(entry)} title="Edit Record">
                              <Edit2 size={14} className="text-primary"/>
                            </button>
                            <button className="btn btn-sm btn-light border p-1" onClick={() => handleDeleteEntry(entry._id)} title="Delete Record">
                              <Trash2 size={14} className="text-danger"/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Salary Payments History Log */}
      <div className="row">
        <div className="col-12">
          <div className="saas-card p-4">
            <h5 className="fw-bold mb-3">Salary Payments Log</h5>
            
            <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Payment Date</th>
                    <th>Amount Paid</th>
                    <th>Payment Method</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center text-muted py-4">
                        No payments recorded for this month.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map(payment => (
                      <tr key={payment._id}>
                        <td>{formatDate(payment.paymentDate)}</td>
                        <td><strong className="text-success">₹ {payment.amount.toLocaleString('en-IN')}</strong></td>
                        <td>
                          <span className="badge-modern badge-primary">
                            {payment.paymentMethod}
                          </span>
                        </td>
                        <td className="text-wrap" style={{ maxWidth: '300px' }}>
                          {payment.notes || <em className="text-muted small">No notes</em>}
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <button className="btn btn-sm btn-light border p-1" onClick={() => handleEditPayment(payment)} title="Edit Payment">
                              <Edit2 size={14} className="text-primary"/>
                            </button>
                            <button className="btn btn-sm btn-light border p-1" onClick={() => handleDeletePayment(payment._id)} title="Delete Payment">
                              <Trash2 size={14} className="text-danger"/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditProfileModal && (
        <div className="modal fade show d-block animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-white border-bottom">
                <h5 className="modal-title fw-bold">Edit Worker Profile</h5>
                <button type="button" className="btn-close" onClick={() => setShowEditProfileModal(false)}></button>
              </div>
              <form onSubmit={handleProfileSubmit}>
                <div className="modal-body p-4 bg-light">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label">Worker Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control-modern w-100"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-12 col-sm-6">
                      <label className="form-label">Job/Role</label>
                      <input
                        type="text"
                        className="form-control-modern w-100"
                        value={profileForm.jobRole}
                        onChange={(e) => setProfileForm({ ...profileForm, jobRole: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-sm-6">
                      <label className="form-label">Default Daily Wage (₹ ) <span className="text-danger">*</span></label>
                      <input
                        type="number"
                        min="0"
                        className="form-control-modern w-100"
                        value={profileForm.defaultDailyWage}
                        onChange={(e) => setProfileForm({ ...profileForm, defaultDailyWage: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-12 col-sm-6">
                      <label className="form-label">Phone Number</label>
                      <input
                        type="text"
                        className="form-control-modern w-100"
                        value={profileForm.phoneNumber}
                        onChange={(e) => setProfileForm({ ...profileForm, phoneNumber: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-sm-6">
                      <label className="form-label">Entered By <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control-modern w-100"
                        value={profileForm.enteredBy}
                        onChange={(e) => setProfileForm({ ...profileForm, enteredBy: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Address</label>
                      <textarea
                        rows="2"
                        className="form-control-modern w-100"
                        value={profileForm.address}
                        onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Notes</label>
                      <textarea
                        rows="2"
                        className="form-control-modern w-100"
                        value={profileForm.notes}
                        onChange={(e) => setProfileForm({ ...profileForm, notes: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-white border-top">
                  <button type="button" className="btn btn-light border fw-medium" onClick={() => setShowEditProfileModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary-modern fw-medium" disabled={updateWorkerMutation.isPending}>
                    {updateWorkerMutation.isPending ? 'Updating...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Daily Entry Modal */}
      {showEntryModal && (
        <div className="modal fade show d-block animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-white border-bottom">
                <h5 className="modal-title fw-bold">
                  {isEditingEntry ? 'Edit Daily Work Record' : 'Record Daily Work & Attendance'}
                </h5>
                <button type="button" className="btn-close" onClick={() => { setShowEntryModal(false); resetEntryForm(); }}></button>
              </div>
              <form onSubmit={handleEntrySubmit}>
                <div className="modal-body p-4 bg-light">
                  <div className="row g-3">
                    <div className="col-12 col-sm-6">
                      <label className="form-label">Date <span className="text-danger">*</span></label>
                      <input
                        type="date"
                        className="form-control-modern w-100"
                        value={entryForm.date}
                        onChange={(e) => setEntryForm({ ...entryForm, date: e.target.value })}
                        required
                        disabled={isEditingEntry}
                      />
                    </div>
                    
                    <div className="col-12 col-sm-6">
                      <label className="form-label">Attendance Status <span className="text-danger">*</span></label>
                      <select
                        className="form-select form-control-modern py-2 w-100"
                        value={entryForm.attendance}
                        onChange={(e) => setEntryForm({ ...entryForm, attendance: e.target.value })}
                        required
                      >
                        <option value="Present">Present</option>
                        <option value="Half Day">Half Day</option>
                        <option value="Absent">Absent</option>
                        <option value="Leave">Leave</option>
                      </select>
                    </div>

                    <div className="col-12 col-sm-6">
                      <label className="form-label">Daily Wage (₹ ) <span className="text-danger">*</span></label>
                      <input
                        type="number"
                        min="0"
                        className="form-control-modern w-100"
                        value={entryForm.dailyWage}
                        onChange={(e) => setEntryForm({ ...entryForm, dailyWage: e.target.value })}
                        disabled={entryForm.attendance === 'Absent' || entryForm.attendance === 'Leave'}
                        required
                      />
                      <span className="small text-muted">{entryForm.attendance === 'Absent' || entryForm.attendance === 'Leave' ? 'Wage is ₹0 for absent/leave status.' : 'Defaults by status. Can override manually.'}</span>
                    </div>

                    <div className="col-12 col-sm-6">
                      <label className="form-label">Logged By <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control-modern w-100"
                        value={entryForm.createdBy}
                        onChange={(e) => setEntryForm({ ...entryForm, createdBy: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label">Work Done / Details <span className="text-muted">(Free Text)</span></label>
                      <textarea
                        rows="3"
                        className="form-control-modern w-100"
                        placeholder="e.g. Cleaning cages, Feeding birds, Maintenance, etc."
                        value={entryForm.workDetails}
                        onChange={(e) => setEntryForm({ ...entryForm, workDetails: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-white border-top">
                  <button type="button" className="btn btn-light border fw-medium" onClick={() => { setShowEntryModal(false); resetEntryForm(); }}>Cancel</button>
                  <button type="submit" className="btn btn-primary-modern fw-medium" disabled={dailyEntryMutation.isPending}>
                    {dailyEntryMutation.isPending ? 'Saving...' : 'Save Log'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="modal fade show d-block animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-white border-bottom">
                <h5 className="modal-title fw-bold">
                  {isEditingPayment ? 'Edit Payment Record' : 'Record Salary Payment'}
                </h5>
                <button type="button" className="btn-close" onClick={() => { setShowPaymentModal(false); resetPaymentForm(); }}></button>
              </div>
              <form onSubmit={handlePaymentSubmit}>
                <div className="modal-body p-4 bg-light">
                  <div className="row g-3">
                    <div className="col-12 col-sm-6">
                      <label className="form-label">Payment Date <span className="text-danger">*</span></label>
                      <input
                        type="date"
                        className="form-control-modern w-100"
                        value={paymentForm.paymentDate}
                        onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-12 col-sm-6">
                      <label className="form-label">Payment Method <span className="text-danger">*</span></label>
                      <select
                        className="form-select form-control-modern py-2 w-100"
                        value={paymentForm.paymentMethod}
                        onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                        required
                      >
                        <option value="Cash">Cash</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="UPI">UPI</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="col-12">
                      <label className="form-label">Amount (₹ ) <span className="text-danger">*</span></label>
                      <input
                        type="number"
                        min="0"
                        className="form-control-modern w-100"
                        placeholder="Enter paid amount"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label">Notes</label>
                      <textarea
                        rows="2"
                        className="form-control-modern w-100"
                        placeholder="Transaction details, bank reference, etc."
                        value={paymentForm.notes}
                        onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-white border-top">
                  <button type="button" className="btn btn-light border fw-medium" onClick={() => { setShowPaymentModal(false); resetPaymentForm(); }}>Cancel</button>
                  <button type="submit" className="btn btn-primary-modern fw-medium" disabled={paymentMutation.isPending}>
                    {paymentMutation.isPending ? 'Saving...' : 'Record Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerDetails;
