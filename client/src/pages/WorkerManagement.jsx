import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { KEYS, fetchWorkers } from '../services/queries';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, Search, Users, Briefcase, 
  AlertCircle, Eye, SlidersHorizontal, ArrowUpDown, CheckCircle, CreditCard,
  Clock, Calendar
} from 'lucide-react';
import { formatDate } from '../utils/dateFormatter';

const WorkerManagement = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const { user, currentUserName } = useAuth();

  // Navigation tab state: 'workers', 'today', 'payments'
  const [activeTab, setActiveTab] = useState('workers');

  // Search & Filter state for Workers directory
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('name'); // name, recently_added

  // Date selection state for "Today's Entries" tab
  const [entriesDate, setEntriesDate] = useState(new Date().toISOString().split('T')[0]);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [todayAttendanceFilter, setTodayAttendanceFilter] = useState('All');

  // Bulk mode entries state
  const [bulkEntries, setBulkEntries] = useState([]);

  // Modals visibility state
  const [showAddModal, setShowAddModal] = useState(false);
  const [duplicateConfirm, setDuplicateConfirm] = useState(false);
  const [pendingWorkerData, setPendingWorkerData] = useState(null);

  // Single Daily Entry Modal state
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [selectedWorkerForEntry, setSelectedWorkerForEntry] = useState(null);
  const [isEditingEntry, setIsEditingEntry] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [entryForm, setEntryForm] = useState({
    date: new Date().toISOString().split('T')[0],
    attendance: 'Present',
    dailyWage: '',
    workDetails: '',
    createdBy: currentUserName
  });

  // Make Payment Modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedWorkerForPayment, setSelectedWorkerForPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    amount: '',
    paymentType: 'Cash',
    notes: '',
    createdBy: currentUserName
  });

  // Add worker form state
  const [formData, setFormData] = useState({
    name: '',
    jobRole: '',
    defaultDailyWage: '',
    phoneNumber: '',
    address: '',
    notes: '',
    enteredBy: currentUserName
  });

  useEffect(() => {
    setFormData(prev => ({ ...prev, enteredBy: currentUserName }));
    setEntryForm(prev => ({ ...prev, createdBy: currentUserName }));
    setPaymentForm(prev => ({ ...prev, createdBy: currentUserName }));
  }, [currentUserName]);

  // Fetch Workers with stats
  const { data: workers = [], isLoading: isWorkersLoading, isError } = useQuery({
    queryKey: KEYS.WORKERS,
    queryFn: fetchWorkers
  });

  if (isError) {
    toast.error('Failed to load workers data');
  }

  // Fetch Daily Entries for Selected Date
  const { data: dailyEntries = [], refetch: refetchDailyEntries, isLoading: isEntriesLoading } = useQuery({
    queryKey: ['daily-entries', entriesDate],
    queryFn: async () => {
      const response = await api.get(`/workers/daily-entries?date=${entriesDate}`);
      return response.data;
    }
  });

  const activeWorkers = useMemo(() => workers.filter(w => w.status === 'Active'), [workers]);

  // Compute Top Summary metrics
  const summaryStats = useMemo(() => {
    const total = workers.length;
    
    // Present Today count from daily entries where date is today (or selected date)
    const presentToday = dailyEntries.filter(d => d.entry?.attendance === 'Present').length;
    
    // Today's Work count (marked Present/Half Day and has work details)
    const todayWork = dailyEntries.filter(d => 
      (d.entry?.attendance === 'Present' || d.entry?.attendance === 'Half Day') && 
      d.entry?.workDetails && d.entry?.workDetails.trim() !== ''
    ).length;

    // Total Pending Outstanding Salary
    const pendingSalary = workers.reduce((sum, w) => sum + (w.stats?.outstandingSalary || 0), 0);

    return { total, presentToday, todayWork, pendingSalary };
  }, [workers, dailyEntries]);

  // Populate bulk attendance form
  React.useEffect(() => {
    if (isBulkMode && activeWorkers.length > 0) {
      setBulkEntries(activeWorkers.map(w => {
        const existing = dailyEntries.find(d => d.workerId === w._id)?.entry;
        return {
          workerId: w._id,
          workerName: w.name,
          attendanceStatus: existing?.attendance || 'Present',
          dailyWage: existing ? existing.dailyWage : w.defaultDailyWage,
          workDetails: existing ? (existing.workDetails || '') : '',
          defaultDailyWage: w.defaultDailyWage
        };
      }));
    }
  }, [isBulkMode, activeWorkers, dailyEntries]);

  // Mutations
  const addWorkerMutation = useMutation({
    mutationFn: async (workerData) => {
      const response = await api.post('/workers', workerData);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: KEYS.WORKERS });
      refetchDailyEntries();
      toast.success(data.message || 'Worker added successfully!');
      addNotification({
        title: 'New Worker Added',
        message: `Worker "${data.data.name}" was successfully registered.`,
        type: 'info'
      });
      handleCloseModal();
    },
    onError: (error) => {
      if (error.response?.data?.requiresConfirmation) {
        setPendingWorkerData(formData);
        setDuplicateConfirm(true);
      } else {
        toast.error(error.response?.data?.message || 'Error adding worker');
      }
    }
  });

  const saveDailyEntryMutation = useMutation({
    mutationFn: async ({ workerId, entryData, entryId }) => {
      if (isEditingEntry) {
        const response = await api.put(`/workers/${workerId}/entries/${entryId}`, entryData);
        return response.data;
      } else {
        const response = await api.post(`/workers/${workerId}/entries`, entryData);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.WORKERS });
      refetchDailyEntries();
      toast.success(isEditingEntry ? 'Daily work entry updated!' : 'Daily work entry saved!');
      setShowEntryModal(false);
      resetEntryForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error saving daily entry');
    }
  });

  const saveBulkAttendanceMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await api.post('/workers/bulk-attendance', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.WORKERS });
      refetchDailyEntries();
      toast.success('Bulk attendance saved successfully!');
      setIsBulkMode(false);
      addNotification({
        title: 'Bulk Attendance Saved',
        message: `Bulk attendance entries saved for ${formatDate(entriesDate)}`,
        type: 'success'
      });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error saving bulk attendance');
    }
  });

  const makePaymentMutation = useMutation({
    mutationFn: async ({ workerId, paymentData }) => {
      const response = await api.post(`/workers/${workerId}/payments`, paymentData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.WORKERS });
      refetchDailyEntries();
      toast.success('Payment recorded successfully!');
      setShowPaymentModal(false);
      addNotification({
        title: 'Payment Confirmed',
        message: `Confirmed payment of ₹${paymentForm.amount} for ${selectedWorkerForPayment?.name}.`,
        type: 'success'
      });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error recording payment');
    }
  });

  // Handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setDuplicateConfirm(false);
    setPendingWorkerData(null);
    setFormData({
      name: '',
      jobRole: '',
      defaultDailyWage: '',
      phoneNumber: '',
      address: '',
      notes: '',
      enteredBy: 'Admin'
    });
  };

  const handleConfirmDuplicate = () => {
    addWorkerMutation.mutate({ ...pendingWorkerData, confirmDuplicate: true });
  };

  const handleAddWorkerSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('Worker name is required');
    if (!formData.defaultDailyWage || Number(formData.defaultDailyWage) < 0) {
      return toast.error('Default wage is required and must be 0 or greater');
    }
    addWorkerMutation.mutate(formData);
  };

  // Single Entry Form state managers
  const resetEntryForm = () => {
    setEntryForm({
      date: entriesDate,
      attendance: 'Present',
      dailyWage: '',
      workDetails: '',
      createdBy: 'Admin'
    });
    setIsEditingEntry(false);
    setEditingEntryId(null);
    setSelectedWorkerForEntry(null);
  };

  const handleOpenAddEntry = (workerItem) => {
    setSelectedWorkerForEntry(workerItem);
    setEntryForm({
      date: entriesDate,
      attendance: 'Present',
      dailyWage: workerItem.defaultDailyWage,
      workDetails: '',
      createdBy: 'Admin'
    });
    setIsEditingEntry(false);
    setEditingEntryId(null);
    setShowEntryModal(true);
  };

  const handleOpenEditEntry = (workerItem, entryRecord) => {
    setSelectedWorkerForEntry(workerItem);
    setEntryForm({
      date: new Date(entryRecord.date).toISOString().split('T')[0],
      attendance: entryRecord.attendance,
      dailyWage: entryRecord.dailyWage,
      workDetails: entryRecord.workDetails || '',
      createdBy: entryRecord.createdBy || 'Admin'
    });
    setIsEditingEntry(true);
    setEditingEntryId(entryRecord._id);
    setShowEntryModal(true);
  };

  // Adjust daily entry wages automatically
  React.useEffect(() => {
    if (selectedWorkerForEntry && !isEditingEntry) {
      if (entryForm.attendance === 'Present') {
        setEntryForm(prev => ({ ...prev, dailyWage: selectedWorkerForEntry.defaultDailyWage }));
      } else if (entryForm.attendance === 'Half Day') {
        setEntryForm(prev => ({ ...prev, dailyWage: selectedWorkerForEntry.defaultDailyWage / 2 }));
      } else {
        setEntryForm(prev => ({ ...prev, dailyWage: 0 }));
      }
    }
  }, [entryForm.attendance, selectedWorkerForEntry, isEditingEntry]);

  const handleEntrySubmit = (e) => {
    e.preventDefault();
    if (!selectedWorkerForEntry) return;
    if (entryForm.dailyWage === '' || Number(entryForm.dailyWage) < 0) {
      return toast.error('Please enter a valid daily wage');
    }
    saveDailyEntryMutation.mutate({
      workerId: selectedWorkerForEntry.workerId || selectedWorkerForEntry._id,
      entryData: {
        ...entryForm,
        dailyWage: Number(entryForm.dailyWage)
      },
      entryId: editingEntryId
    });
  };

  // Bulk attendance state managers
  const handleBulkAttendanceChange = (workerId, status) => {
    setBulkEntries(prev => prev.map(item => {
      if (item.workerId === workerId) {
        let wage = item.dailyWage;
        if (status === 'Present') {
          wage = item.defaultDailyWage;
        } else if (status === 'Half Day') {
          wage = item.defaultDailyWage / 2;
        } else {
          wage = 0;
        }
        return { ...item, attendanceStatus: status, dailyWage: wage };
      }
      return item;
    }));
  };

  const handleBulkEntryFieldChange = (workerId, field, value) => {
    setBulkEntries(prev => prev.map(item => {
      if (item.workerId === workerId) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleBulkAttendanceSubmit = (e) => {
    e.preventDefault();
    const payload = {
      date: entriesDate,
      entries: bulkEntries.map(b => ({
        workerId: b.workerId,
        attendanceStatus: b.attendanceStatus,
        dailyWage: Number(b.dailyWage || 0),
        workDetails: b.workDetails,
        createdBy: 'Admin'
      }))
    };
    saveBulkAttendanceMutation.mutate(payload);
  };

  // Payment State managers
  const handleOpenPayment = (workerItem) => {
    setSelectedWorkerForPayment(workerItem);
    setPaymentForm({
      paymentDate: new Date().toISOString().split('T')[0],
      amount: workerItem.stats?.outstandingSalary || 0,
      paymentType: 'Cash',
      notes: '',
      createdBy: 'Admin'
    });
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    if (!selectedWorkerForPayment) return;
    const amount = Number(paymentForm.amount);
    if (!amount || amount <= 0) {
      return toast.error('Payment amount must be greater than ₹0');
    }
    const outstanding = selectedWorkerForPayment.stats?.outstandingSalary || 0;
    if (amount > outstanding) {
      return toast.error(`Payment amount cannot exceed outstanding balance of ₹${outstanding}`);
    }

    makePaymentMutation.mutate({
      workerId: selectedWorkerForPayment._id,
      paymentData: {
        paymentDate: paymentForm.paymentDate,
        amount,
        paymentMethod: paymentForm.paymentType,
        notes: paymentForm.notes,
        createdBy: paymentForm.createdBy
      }
    });
  };

  // Filter and sort workers list
  const filteredWorkers = useMemo(() => {
    return workers.filter(w => {
      const matchesSearch = w.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (w.jobRole && w.jobRole.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'All' ? true : w.status === statusFilter;

      return matchesSearch && matchesStatus;
    }).sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else {
        return new Date(b.createdAt || b.dateAdded) - new Date(a.createdAt || a.dateAdded);
      }
    });
  }, [workers, searchTerm, statusFilter, sortBy]);

  // Filter Today's Entries tab table
  const filteredTodayEntries = useMemo(() => {
    return dailyEntries.filter(d => {
      if (todayAttendanceFilter === 'All') return true;
      if (todayAttendanceFilter === 'Not Marked') return !d.entry;
      return d.entry?.attendance === todayAttendanceFilter;
    });
  }, [dailyEntries, todayAttendanceFilter]);

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">Worker Management</h2>
          <p className="text-muted mb-0">Track attendance, manage daily work entries, and clear pending salaries.</p>
        </div>
      </div>

      {/* Top Compact Summary Dashboard */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="saas-card p-4 border-top border-4 border-primary h-100">
            <span className="small text-muted d-block text-uppercase fw-bold mb-1">Total Workers</span>
            <div className="d-flex align-items-center gap-2">
              <Users size={24} className="text-primary" />
              <h3 className="m-0 fw-bold">{summaryStats.total}</h3>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="saas-card p-4 border-top border-4 border-success h-100">
            <span className="small text-muted d-block text-uppercase fw-bold mb-1">Present Today</span>
            <div className="d-flex align-items-center gap-2">
              <CheckCircle size={24} className="text-success" />
              <h3 className="m-0 fw-bold">{summaryStats.presentToday}</h3>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="saas-card p-4 border-top border-4 border-info h-100">
            <span className="small text-muted d-block text-uppercase fw-bold mb-1">Today's Work</span>
            <div className="d-flex align-items-center gap-2">
              <Briefcase size={24} className="text-info" />
              <h3 className="m-0 fw-bold">{summaryStats.todayWork}</h3>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="saas-card p-4 border-top border-4 border-danger h-100">
            <span className="small text-muted d-block text-uppercase fw-bold mb-1">Pending Salary</span>
            <div className="d-flex align-items-center gap-2">
              <CreditCard size={24} className="text-danger" />
              <h3 className="m-0 fw-bold text-danger">₹{summaryStats.pendingSalary.toLocaleString('en-IN')}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Segment Control Tab Navigation Bar */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
        <div className="d-flex bg-light p-1 rounded-3 border" style={{ gap: '4px' }}>
          <button 
            className={`btn btn-sm px-4 py-2 rounded-2 fw-semibold transition-all ${activeTab === 'workers' ? 'btn-primary-modern shadow-sm' : 'btn-light border-0 text-muted'}`}
            onClick={() => setActiveTab('workers')}
          >
            <Users size={16} className="me-2" /> Workers Directory
          </button>
          <button 
            className={`btn btn-sm px-4 py-2 rounded-2 fw-semibold transition-all ${activeTab === 'today' ? 'btn-primary-modern shadow-sm' : 'btn-light border-0 text-muted'}`}
            onClick={() => { setActiveTab('today'); refetchDailyEntries(); }}
          >
            <Clock size={16} className="me-2" /> Daily Entries
          </button>
          <button 
            className={`btn btn-sm px-4 py-2 rounded-2 fw-semibold transition-all ${activeTab === 'payments' ? 'btn-primary-modern shadow-sm' : 'btn-light border-0 text-muted'}`}
            onClick={() => setActiveTab('payments')}
          >
            <CreditCard size={16} className="me-2" /> Salary Payments
          </button>
        </div>
        <button className="btn btn-primary-modern" onClick={() => setShowAddModal(true)}>
          <Plus size={20} className="me-2" /> Add Worker
        </button>
      </div>

      {/* -------------------- TAB 1: WORKERS DIRECTORY -------------------- */}
      {activeTab === 'workers' && (
        <div className="animate-fade-in">
          {/* Filters Row */}
          <div className="saas-card p-3 mb-4">
            <div className="row g-2 align-items-center">
              <div className="col-12 col-md-5">
                <div className="input-group">
                  <span className="input-group-text bg-transparent border-end-0 border-modern"><Search size={18} className="text-muted" /></span>
                  <input
                    type="text"
                    className="form-control form-control-modern border-start-0 ps-0"
                    placeholder="Search by worker name or job role..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="d-flex align-items-center gap-2">
                  <SlidersHorizontal size={18} className="text-muted" />
                  <select
                    className="form-select form-control-modern w-100"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Active">Active Only</option>
                    <option value="Inactive">Inactive Only</option>
                  </select>
                </div>
              </div>
              <div className="col-6 col-md-4">
                <div className="d-flex align-items-center gap-2">
                  <ArrowUpDown size={18} className="text-muted" />
                  <select
                    className="form-select form-control-modern w-100"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="name">Sort by Name (A-Z)</option>
                    <option value="recently_added">Recently Added First</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Workers list grid */}
          {isWorkersLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : filteredWorkers.length === 0 ? (
            <div className="saas-card text-center p-5 text-muted">
              No workers profiles matching current filter settings.
            </div>
          ) : (
            <div className="row g-3">
              {filteredWorkers.map(w => {
                const todayAttendance = w.todayEntry?.attendance || 'Not Marked';
                const todayWork = w.todayEntry?.workDetails || 'None logged';
                const todayWage = w.todayEntry ? `₹${w.todayEntry.dailyWage}` : '—';
                const outstanding = w.stats?.outstandingSalary || 0;

                let attendanceBadgeClass = 'badge-secondary';
                if (todayAttendance === 'Present') attendanceBadgeClass = 'badge-success';
                else if (todayAttendance === 'Half Day') attendanceBadgeClass = 'badge-warning';
                else if (todayAttendance === 'Absent') attendanceBadgeClass = 'badge-danger';
                else if (todayAttendance === 'Leave') attendanceBadgeClass = 'badge-info';

                return (
                  <div key={w._id} className="col-12 col-md-6 col-lg-4">
                    <div className="saas-card p-4 hover-card h-100 d-flex flex-column justify-content-between">
                      <div>
                        {/* Title and Active Status */}
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <div>
                            <h5 className="fw-bold m-0 text-dark">{w.name}</h5>
                            <span className="small text-muted">{w.jobRole || 'General Worker'}</span>
                          </div>
                          <span className={`badge-modern ${w.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>
                            {w.status}
                          </span>
                        </div>

                        {/* Today's log box */}
                        <div className="bg-light p-3 rounded-3 mb-3 border">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="small text-muted fw-semibold">Today's Status</span>
                            <span className={`badge-modern ${attendanceBadgeClass}`}>{todayAttendance}</span>
                          </div>
                          <div className="d-flex justify-content-between mb-2">
                            <span className="small text-muted">Today's Work</span>
                            <span className="small fw-semibold text-end text-truncate" style={{ maxWidth: '160px' }} title={todayWork}>
                              {todayWork}
                            </span>
                          </div>
                          <div className="d-flex justify-content-between">
                            <span className="small text-muted">Today's Wage</span>
                            <span className="small fw-semibold text-primary">{todayWage}</span>
                          </div>
                        </div>

                        {/* Outstanding pending box */}
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <span className="small text-muted fw-bold">Salary Pending</span>
                          <span className={`fw-bold ${outstanding > 0 ? 'text-danger' : 'text-success'}`}>
                            ₹{outstanding.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* View Details button */}
                      <button 
                        className="btn btn-light border w-100 py-2 fw-semibold text-dark d-flex align-items-center justify-content-center gap-2"
                        onClick={() => navigate(`/workers/${w._id}`)}
                      >
                        <Eye size={16} /> View Worker
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* -------------------- TAB 2: DAILY ENTRIES -------------------- */}
      {activeTab === 'today' && (
        <div className="animate-fade-in">
          {/* Header toolbar */}
          <div className="saas-card p-3 mb-4">
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3">
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <div className="d-flex align-items-center gap-2">
                  <Calendar size={18} className="text-muted" />
                  <input
                    type="date"
                    className="form-control form-control-modern py-1 px-3"
                    value={entriesDate}
                    onChange={(e) => setEntriesDate(e.target.value)}
                  />
                </div>
                {!isBulkMode && (
                  <select
                    className="form-select form-control-modern py-1"
                    style={{ width: '170px' }}
                    value={todayAttendanceFilter}
                    onChange={(e) => setTodayAttendanceFilter(e.target.value)}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Present">Present Only</option>
                    <option value="Half Day">Half Day Only</option>
                    <option value="Absent">Absent Only</option>
                    <option value="Leave">Leave Only</option>
                    <option value="Not Marked">Not Marked</option>
                  </select>
                )}
              </div>

              {/* Bulk Toggle Button */}
              <button 
                type="button" 
                className={`btn btn-sm px-4 py-2 fw-bold transition-all ${isBulkMode ? 'btn-warning text-dark' : 'btn-light border text-dark'}`}
                onClick={() => setIsBulkMode(!isBulkMode)}
              >
                {isBulkMode ? 'Cancel Bulk Attendance' : 'Mark Bulk Attendance'}
              </button>
            </div>
          </div>

          {/* View Mode */}
          {!isBulkMode ? (
            <div className="saas-card p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold m-0">Daily Logs for {formatDate(entriesDate)}</h5>
              </div>

              {isEntriesLoading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : filteredTodayEntries.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  No worker entry logs matching the filter.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>Worker</th>
                        <th>Attendance</th>
                        <th>Work Details</th>
                        <th className="text-end">Wage</th>
                        <th className="text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTodayEntries.map(item => {
                        const entry = item.entry;
                        let badgeClass = 'badge-secondary';
                        if (entry?.attendance === 'Present') badgeClass = 'badge-success';
                        else if (entry?.attendance === 'Half Day') badgeClass = 'badge-warning';
                        else if (entry?.attendance === 'Absent') badgeClass = 'badge-danger';
                        else if (entry?.attendance === 'Leave') badgeClass = 'badge-info';

                        return (
                          <tr key={item.workerId}>
                            <td className="fw-bold">{item.workerName}</td>
                            <td>
                              <span className={`badge-modern ${badgeClass}`}>
                                {entry ? entry.attendance : 'Not Marked'}
                              </span>
                            </td>
                            <td>{entry?.workDetails || '—'}</td>
                            <td className="text-end fw-bold text-primary">
                              {entry ? `₹${entry.dailyWage}` : '—'}
                            </td>
                            <td className="text-center">
                              {entry ? (
                                <button className="btn btn-sm btn-light border py-1 px-3" onClick={() => handleOpenEditEntry(item, entry)}>
                                  Edit
                                </button>
                              ) : (
                                <button 
                                  className="btn btn-sm btn-primary-modern py-1 px-3" 
                                  onClick={() => handleOpenAddEntry(item)}
                                  disabled={item.status === 'Inactive'}
                                >
                                  + Log Entry
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* Bulk Attendance Mode */
            <form onSubmit={handleBulkAttendanceSubmit}>
              <div className="saas-card p-4">
                <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2">
                  <div>
                    <h5 className="fw-bold m-0 text-warning">Bulk Attendance Session</h5>
                    <p className="text-muted small m-0">Quickly check active workers. Wage auto-calculates from status default daily wages.</p>
                  </div>
                  <span className="badge bg-warning text-dark px-3 py-2 fw-bold">Date: {entriesDate}</span>
                </div>

                {bulkEntries.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    No active workers found to mark attendance.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="modern-table">
                      <thead>
                        <tr>
                          <th>Worker</th>
                          <th style={{ minWidth: '320px' }}>Attendance Status</th>
                          <th>Work Done / Details</th>
                          <th style={{ width: '130px' }} className="text-end">Wage (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkEntries.map(b => (
                          <tr key={b.workerId}>
                            <td className="fw-bold align-middle">{b.workerName}</td>
                            <td className="align-middle">
                              <div className="d-flex gap-3">
                                {['Present', 'Half Day', 'Absent', 'Leave'].map(st => (
                                  <div key={st} className="form-check m-0">
                                    <input
                                      className="form-check-input"
                                      type="radio"
                                      name={`bulk-status-${b.workerId}`}
                                      id={`bulk-status-${b.workerId}-${st}`}
                                      checked={b.attendanceStatus === st}
                                      onChange={() => handleBulkAttendanceChange(b.workerId, st)}
                                    />
                                    <label className="form-check-label small m-0" htmlFor={`bulk-status-${b.workerId}-${st}`}>{st}</label>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td>
                              <input
                                type="text"
                                className="form-control-modern py-1 w-100"
                                placeholder="Details..."
                                value={b.workDetails}
                                onChange={(e) => handleBulkEntryFieldChange(b.workerId, 'workDetails', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                className="form-control-modern text-end py-1 w-100"
                                value={b.dailyWage}
                                onChange={(e) => handleBulkEntryFieldChange(b.workerId, 'dailyWage', e.target.value)}
                                disabled={b.attendanceStatus === 'Absent' || b.attendanceStatus === 'Leave'}
                                required
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {bulkEntries.length > 0 && (
                  <div className="d-flex justify-content-end gap-3 mt-4 pt-3 border-top">
                    <button type="button" className="btn btn-light border px-4" onClick={() => setIsBulkMode(false)}>Cancel</button>
                    <button type="submit" className="btn btn-success px-4" disabled={saveBulkAttendanceMutation.isPending}>
                      {saveBulkAttendanceMutation.isPending ? 'Saving...' : 'Save Attendance'}
                    </button>
                  </div>
                )}
              </div>
            </form>
          )}
        </div>
      )}

      {/* -------------------- TAB 3: SALARY PAYMENTS -------------------- */}
      {activeTab === 'payments' && (
        <div className="animate-fade-in saas-card p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold m-0">Workers Salary Accounts Summary</h5>
          </div>

          {isWorkersLoading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : workers.length === 0 ? (
            <div className="text-center py-4 text-muted">No worker profiles registered.</div>
          ) : (
            <div className="table-responsive">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Worker</th>
                    <th>Role / Job</th>
                    <th className="text-end">Salary Earned</th>
                    <th className="text-end">Already Paid</th>
                    <th className="text-end">Outstanding Pending</th>
                    <th>Status</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.map(w => {
                    const earned = w.stats?.totalSalaryEarned || 0;
                    const paid = w.stats?.totalSalaryPaid || 0;
                    const pending = w.stats?.outstandingSalary || 0;
                    const isPending = pending > 0;

                    return (
                      <tr key={w._id}>
                        <td className="fw-bold">{w.name}</td>
                        <td>{w.jobRole || 'General Worker'}</td>
                        <td className="text-end">₹{earned.toLocaleString('en-IN')}</td>
                        <td className="text-end text-success">₹{paid.toLocaleString('en-IN')}</td>
                        <td className={`text-end fw-bold ${isPending ? 'text-danger' : 'text-success'}`}>
                          ₹{pending.toLocaleString('en-IN')}
                        </td>
                        <td>
                          <span className={`badge-modern ${isPending ? 'badge-warning' : 'badge-success'}`}>
                            {isPending ? 'Pending' : 'Settled'}
                          </span>
                        </td>
                        <td className="text-center">
                          {isPending ? (
                            <button className="btn btn-sm btn-primary-modern py-1 px-3" onClick={() => handleOpenPayment(w)}>
                              Make Payment
                            </button>
                          ) : (
                            <span className="text-muted small">No balance</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* -------------------- MODALS -------------------- */}

      {/* Add Worker Modal */}
      {showAddModal && (
        <div className="modal fade show d-block animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-white border-bottom">
                <h5 className="modal-title fw-bold">Register New Worker Profile</h5>
                <button type="button" className="btn-close" onClick={handleCloseModal}></button>
              </div>
              {!duplicateConfirm ? (
                <form onSubmit={handleAddWorkerSubmit}>
                  <div className="modal-body p-4 bg-light">
                    <div className="row g-3">
                      <div className="col-12 col-sm-6">
                        <label className="form-label">Worker Name <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          className="form-control-modern w-100"
                          name="name"
                          placeholder="e.g. Ramesh Kumar"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                        />
                      </div>

                      <div className="col-12 col-sm-6">
                        <label className="form-label">Role / Job Position</label>
                        <input
                          type="text"
                          className="form-control-modern w-100"
                          name="jobRole"
                          placeholder="e.g. Cages cleaner, Feeder"
                          value={formData.jobRole}
                          onChange={handleInputChange}
                        />
                      </div>

                      <div className="col-12 col-sm-6">
                        <label className="form-label">Default Daily Wage (₹ ) <span className="text-danger">*</span></label>
                        <input
                          type="number"
                          min="0"
                          className="form-control-modern w-100"
                          name="defaultDailyWage"
                          placeholder="e.g. 700"
                          value={formData.defaultDailyWage}
                          onChange={handleInputChange}
                          required
                        />
                      </div>

                      <div className="col-12 col-sm-6">
                        <label className="form-label">Phone Number</label>
                        <input
                          type="text"
                          className="form-control-modern w-100"
                          name="phoneNumber"
                          placeholder="Enter contact number"
                          value={formData.phoneNumber}
                          onChange={handleInputChange}
                        />
                      </div>

                      <div className="col-12 col-sm-6">
                        <label className="form-label">Date Added</label>
                        <input
                          type="date"
                          className="form-control-modern w-100"
                          name="dateAdded"
                          value={formData.dateAdded ? formData.dateAdded.split('T')[0] : new Date().toISOString().split('T')[0]}
                          onChange={handleInputChange}
                        />
                      </div>

                      <div className="col-12 col-sm-6">
                        <label className="form-label">Added By <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          className="form-control-modern w-100"
                          name="enteredBy"
                          value={formData.enteredBy}
                          onChange={handleInputChange}
                          required
                        />
                      </div>

                      <div className="col-12">
                        <label className="form-label">Home Address</label>
                        <textarea
                          rows="2"
                          className="form-control-modern w-100"
                          name="address"
                          placeholder="Enter address details..."
                          value={formData.address}
                          onChange={handleInputChange}
                        />
                      </div>

                      <div className="col-12">
                        <label className="form-label">Profile Notes</label>
                        <textarea
                          rows="2"
                          className="form-control-modern w-100"
                          name="notes"
                          placeholder="Add any additional notes about worker..."
                          value={formData.notes}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer bg-white border-top">
                    <button type="button" className="btn btn-light border fw-medium" onClick={handleCloseModal}>Cancel</button>
                    <button type="submit" className="btn btn-primary-modern fw-medium" disabled={addWorkerMutation.isPending}>
                      {addWorkerMutation.isPending ? 'Saving...' : 'Add Worker'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="modal-body p-4 text-center">
                  <AlertCircle size={48} className="text-warning mb-3 mx-auto animate-bounce" />
                  <h5 className="fw-bold">Duplicate Name Warning</h5>
                  <p className="text-muted">
                    A worker named <strong>{pendingWorkerData?.name}</strong> is already registered. Do you still want to create another profile with this name?
                  </p>
                  <div className="d-flex justify-content-center gap-3 mt-4">
                    <button type="button" className="btn btn-light border px-4" onClick={() => setDuplicateConfirm(false)}>
                      Go Back
                    </button>
                    <button type="button" className="btn btn-warning px-4" onClick={handleConfirmDuplicate} disabled={addWorkerMutation.isPending}>
                      {addWorkerMutation.isPending ? 'Processing...' : 'Yes, Create Duplicate'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Daily Entry Modal (Add / Edit) */}
      {showEntryModal && selectedWorkerForEntry && (
        <div className="modal fade show d-block animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-white border-bottom">
                <h5 className="modal-title fw-bold">
                  {isEditingEntry ? 'Edit Daily Entry' : `Record Daily Entry: ${selectedWorkerForEntry.workerName || selectedWorkerForEntry.name}`}
                </h5>
                <button type="button" className="btn-close" onClick={resetEntryForm}></button>
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
                      <label className="form-label">Attendance <span className="text-danger">*</span></label>
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
                      <label className="form-label">Work Details</label>
                      <textarea
                        rows="3"
                        className="form-control-modern w-100"
                        placeholder="e.g. Cleaning cages, animal feeding..."
                        value={entryForm.workDetails}
                        onChange={(e) => setEntryForm({ ...entryForm, workDetails: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-white border-top">
                  <button type="button" className="btn btn-light border fw-medium" onClick={resetEntryForm}>Cancel</button>
                  <button type="submit" className="btn btn-primary-modern fw-medium" disabled={saveDailyEntryMutation.isPending}>
                    {saveDailyEntryMutation.isPending ? 'Saving...' : 'Save Entry'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Make Payment Modal */}
      {showPaymentModal && selectedWorkerForPayment && (
        <div className="modal fade show d-block animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-white border-bottom">
                <h5 className="modal-title fw-bold">Salary Payment: {selectedWorkerForPayment.name}</h5>
                <button type="button" className="btn-close" onClick={() => setShowPaymentModal(false)}></button>
              </div>
              <form onSubmit={handlePaymentSubmit}>
                <div className="modal-body p-4 bg-light">
                  <div className="row g-3">
                    <div className="col-6">
                      <label className="form-label">Total Earned</label>
                      <div className="form-control-modern bg-white text-dark fw-bold">
                        ₹{(selectedWorkerForPayment.stats?.totalSalaryEarned || 0).toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="col-6">
                      <label className="form-label">Already Paid</label>
                      <div className="form-control-modern bg-white text-success fw-bold">
                        ₹{(selectedWorkerForPayment.stats?.totalSalaryPaid || 0).toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="col-12 bg-white border p-3 rounded-3 d-flex justify-content-between align-items-center">
                      <span className="fw-bold text-muted">Outstanding Balance:</span>
                      <span className="h4 fw-bold text-danger m-0">
                        ₹{(selectedWorkerForPayment.stats?.outstandingSalary || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="col-12">
                      <label className="form-label">Payment Amount (₹) <span className="text-danger">*</span></label>
                      <input
                        type="number"
                        min="1"
                        max={selectedWorkerForPayment.stats?.outstandingSalary || 0}
                        className="form-control-modern w-100"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-12 col-sm-6">
                      <label className="form-label">Payment Type <span className="text-danger">*</span></label>
                      <select
                        className="form-select form-control-modern w-100"
                        value={paymentForm.paymentType}
                        onChange={(e) => setPaymentForm({ ...paymentForm, paymentType: e.target.value })}
                        required
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

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

                    <div className="col-12">
                      <label className="form-label">Notes</label>
                      <textarea
                        rows="2"
                        className="form-control-modern w-100"
                        placeholder="Optional payment notes or transaction reference..."
                        value={paymentForm.notes}
                        onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-white border-top">
                  <button type="button" className="btn btn-light border fw-medium" onClick={() => setShowPaymentModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary-modern fw-medium" disabled={makePaymentMutation.isPending}>
                    {makePaymentMutation.isPending ? 'Processing...' : 'Confirm Payment'}
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

export default WorkerManagement;
