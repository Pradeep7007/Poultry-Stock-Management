import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { KEYS, fetchWorkers } from '../services/queries';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useNotifications } from '../context/NotificationContext';
import { 
  Plus, Search, Users, UserCheck, Coins, DollarSign, Briefcase, 
  AlertCircle, Eye, SlidersHorizontal, ArrowUpDown, CheckCircle, CreditCard
} from 'lucide-react';

const WorkerManagement = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();

  // Fetch Workers
  const { data: workers = [], isLoading, isError } = useQuery({
    queryKey: KEYS.WORKERS,
    queryFn: fetchWorkers
  });

  if (isError) {
    toast.error('Failed to load workers data');
  }

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('name'); // name, recently_added

  // Form / Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [duplicateConfirm, setDuplicateConfirm] = useState(false);
  const [pendingWorkerData, setPendingWorkerData] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    jobRole: '',
    defaultDailyWage: '',
    phoneNumber: '',
    address: '',
    notes: '',
    enteredBy: 'Admin'
  });

  // Assign Work Form State
  const [showAssignWorkModal, setShowAssignWorkModal] = useState(false);
  const [assignWorkForm, setAssignWorkForm] = useState({
    workerId: '',
    workName: '',
    workDate: new Date().toISOString().split('T')[0],
    createdBy: 'Admin'
  });

  // Attendance Form State
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceForm, setAttendanceForm] = useState({
    workerId: '',
    date: new Date().toISOString().split('T')[0],
    attendance: 'Present',
    dailySalary: '',
    createdBy: 'Admin'
  });

  // Payment Table State
  const [showPaymentTableModal, setShowPaymentTableModal] = useState(false);
  const [paymentTableMonth, setPaymentTableMonth] = useState(new Date().getMonth());
  const [paymentTableYear, setPaymentTableYear] = useState(new Date().getFullYear());

  // Make Payment Form State
  const [showMakePaymentModal, setShowMakePaymentModal] = useState(false);
  const [selectedWorkerForPayment, setSelectedWorkerForPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentType: 'Cash',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: '',
    createdBy: 'Admin'
  });

  // active workers list
  const activeWorkers = React.useMemo(() => workers.filter(w => w.status === 'Active'), [workers]);

  const resetAssignWorkForm = () => {
    setAssignWorkForm({
      workerId: activeWorkers[0]?._id || '',
      workName: '',
      workDate: new Date().toISOString().split('T')[0],
      createdBy: 'Admin'
    });
  };

  const resetAttendanceForm = () => {
    setAttendanceForm({
      workerId: activeWorkers[0]?._id || '',
      date: new Date().toISOString().split('T')[0],
      attendance: 'Present',
      dailySalary: activeWorkers[0]?.defaultDailyWage || '',
      createdBy: 'Admin'
    });
  };

  const handleAttendanceWorkerChange = (e) => {
    const wId = e.target.value;
    const selectedWorker = activeWorkers.find(w => w._id === wId);
    setAttendanceForm(prev => ({
      ...prev,
      workerId: wId,
      dailySalary: prev.attendance === 'Present' && selectedWorker ? selectedWorker.defaultDailyWage : 0
    }));
  };

  const handleAttendanceStatusChange = (status) => {
    const selectedWorker = activeWorkers.find(w => w._id === attendanceForm.workerId);
    setAttendanceForm(prev => ({
      ...prev,
      attendance: status,
      dailySalary: status === 'Present' && selectedWorker ? selectedWorker.defaultDailyWage : 0
    }));
  };

  // Queries & Mutations for new workflows
  const { data: paymentSummaries = [], refetch: refetchPaymentSummary, isLoading: isPaymentSummaryLoading } = useQuery({
    queryKey: ['payment-summary', paymentTableMonth, paymentTableYear],
    queryFn: async () => {
      const response = await api.get(`/workers/payment-summary?month=${paymentTableMonth}&year=${paymentTableYear}`);
      return response.data;
    },
    enabled: showPaymentTableModal
  });

  const assignWorkMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await api.post('/workers/assignments', payload);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: KEYS.WORKERS });
      toast.success(data.message || 'Work assigned successfully!');
      addNotification({
        title: 'Work Assigned',
        message: `Assigned "${data.assignment.workName}" to worker.`,
        type: 'success'
      });
      setShowAssignWorkModal(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error assigning work');
    }
  });

  const saveAttendanceMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await api.post('/workers/attendance', payload);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: KEYS.WORKERS });
      toast.success(data.message || 'Attendance saved successfully!');
      addNotification({
        title: 'Attendance Saved',
        message: `Saved attendance for worker on ${new Date(variables.date).toLocaleDateString()}.`,
        type: 'success'
      });
      setShowAttendanceModal(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error saving attendance');
    }
  });

  const makePaymentMutation = useMutation({
    mutationFn: async ({ workerId, paymentData }) => {
      const response = await api.post(`/workers/${workerId}/payments`, paymentData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.WORKERS });
      refetchPaymentSummary();
      toast.success('Payment recorded successfully!');
      addNotification({
        title: 'Payment Recorded',
        message: `Recorded payment of ₹${paymentForm.amount} for worker.`,
        type: 'success'
      });
      setShowMakePaymentModal(false);
      setShowPaymentTableModal(true); // reopen summaries table
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error recording payment');
    }
  });

  const handleAssignWorkSubmit = (e) => {
    e.preventDefault();
    if (!assignWorkForm.workerId) return toast.error('Please select a worker');
    if (!assignWorkForm.workName.trim()) return toast.error('Work name is required');
    assignWorkMutation.mutate(assignWorkForm);
  };

  const handleAttendanceSubmit = (e) => {
    e.preventDefault();
    if (!attendanceForm.workerId) return toast.error('Please select a worker');
    if (attendanceForm.attendance === 'Present' && (attendanceForm.dailySalary === '' || Number(attendanceForm.dailySalary) < 0)) {
      return toast.error('Please enter a valid daily salary');
    }
    saveAttendanceMutation.mutate({
      ...attendanceForm,
      dailySalary: Number(attendanceForm.dailySalary || 0)
    });
  };

  const handleMakePaymentSubmit = (e) => {
    e.preventDefault();
    const amount = Number(paymentForm.amount);
    if (!amount || amount <= 0) {
      return toast.error('Payment amount must be greater than ₹0');
    }
    if (amount > selectedWorkerForPayment.pendingAmount) {
      return toast.error(`Payment amount cannot exceed pending salary of ₹${selectedWorkerForPayment.pendingAmount}`);
    }
    makePaymentMutation.mutate({
      workerId: selectedWorkerForPayment.workerId,
      paymentData: {
        paymentDate: paymentForm.paymentDate,
        amount,
        paymentMethod: paymentForm.paymentType,
        notes: paymentForm.notes
      }
    });
  };

  const handleOpenMakePayment = (summary) => {
    setSelectedWorkerForPayment(summary);
    setPaymentForm({
      amount: summary.pendingAmount,
      paymentType: 'Cash',
      paymentDate: new Date().toISOString().split('T')[0],
      notes: '',
      createdBy: 'Admin'
    });
    setShowMakePaymentModal(true);
    setShowPaymentTableModal(false);
  };

  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const yearsList = React.useMemo(() => {
    const list = [];
    const current = new Date().getFullYear();
    for (let y = current - 5; y <= current + 2; y++) {
      list.push(y);
    }
    return list;
  }, []);



  // Mutation to Add Worker
  const addWorkerMutation = useMutation({
    mutationFn: async (workerData) => {
      const response = await api.post('/workers', workerData);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: KEYS.WORKERS });
      toast.success(data.message || 'Worker added successfully!');
      addNotification({
        title: 'New Worker Added',
        message: `Worker "${data.data.name}" was successfully registered.`,
        type: 'info'
      });
      handleCloseModal();
    },
    onError: (error) => {
      const errorData = error.response?.data;
      if (errorData?.requiresConfirmation) {
        // Requires confirmation for duplicate name
        setDuplicateConfirm(true);
        setPendingWorkerData(JSON.parse(error.config.data));
      } else {
        toast.error(errorData?.message || 'Error adding worker');
      }
    }
  });

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('Worker Name is required');
    if (formData.defaultDailyWage === '' || Number(formData.defaultDailyWage) < 0) {
      return toast.error('Please enter a valid default daily wage (0 or greater)');
    }

    addWorkerMutation.mutate({
      ...formData,
      defaultDailyWage: Number(formData.defaultDailyWage)
    });
  };

  const handleConfirmDuplicate = () => {
    if (!pendingWorkerData) return;
    addWorkerMutation.mutate({
      ...pendingWorkerData,
      confirmDuplicate: true
    });
  };

  // Calculations for Summary Cards
  const totalWorkersCount = workers.length;
  const activeWorkersCount = workers.filter(w => w.status === 'Active').length;
  
  // Present Today
  const presentTodayCount = workers.filter(w => 
    w.todayEntry && (w.todayEntry.attendance === 'Present' || w.todayEntry.attendance === 'Half Day')
  ).length;

  // Absent Today
  const absentTodayCount = workers.filter(w => 
    w.status === 'Active' && w.todayEntry && w.todayEntry.attendance === 'Absent'
  ).length;

  // Today's Wage/Salary cost
  const todaySalaryCost = workers.reduce((sum, w) => {
    return sum + (w.todayEntry ? w.todayEntry.dailyWage : 0);
  }, 0);

  // Total Outstanding Salary
  const pendingSalaryTotal = workers.reduce((sum, w) => {
    return sum + (w.stats ? w.stats.outstandingSalary : 0);
  }, 0);

  // Filtered and Sorted workers list
  const filteredWorkers = workers
    .filter(w => {
      const matchesSearch = w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (w.jobRole && w.jobRole.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'All' ? true : w.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'recently_added') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      return 0;
    });

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">Worker Management</h2>
          <p className="text-muted mb-0">Track attendance, manage daily work, and record salary payments.</p>
        </div>
        <button className="btn-primary-modern" onClick={() => setShowAddModal(true)}>
          <Plus size={20} /> Add Worker
        </button>
      </div>

      {/* Action Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-4">
          <div className="saas-card cursor-pointer hover-card border-top border-4 border-primary p-4 h-100 d-flex flex-column justify-content-between" onClick={() => { resetAssignWorkForm(); setShowAssignWorkModal(true); }}>
            <div>
              <div className="d-flex align-items-center gap-3 mb-3">
                <div className="bg-primary bg-opacity-10 text-primary rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: '44px', height: '44px' }}>
                  <Briefcase size={20} />
                </div>
                <h5 className="fw-bold m-0 text-primary">Assign Work</h5>
              </div>
              <p className="text-muted small m-0">Assign work to a worker and automatically record attendance.</p>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="saas-card cursor-pointer hover-card border-top border-4 border-success p-4 h-100 d-flex flex-column justify-content-between" onClick={() => { resetAttendanceForm(); setShowAttendanceModal(true); }}>
            <div>
              <div className="d-flex align-items-center gap-3 mb-3">
                <div className="bg-success bg-opacity-10 text-success rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: '44px', height: '44px' }}>
                  <CheckCircle size={20} />
                </div>
                <h5 className="fw-bold m-0 text-success">Attendance</h5>
              </div>
              <p className="text-muted small m-0">Mark a worker as Present or Absent and manage daily salary.</p>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="saas-card cursor-pointer hover-card border-top border-4 border-warning p-4 h-100 d-flex flex-column justify-content-between" onClick={() => { setShowPaymentTableModal(true); refetchPaymentSummary(); }}>
            <div>
              <div className="d-flex align-items-center gap-3 mb-3">
                <div className="bg-warning bg-opacity-10 text-warning rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: '44px', height: '44px' }}>
                  <CreditCard size={20} />
                </div>
                <h5 className="fw-bold m-0 text-warning">Payment</h5>
              </div>
              <p className="text-muted small m-0">View pending worker payments and record completed payments.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="saas-card p-3 d-flex align-items-center gap-3">
            <div className="bg-primary bg-opacity-10 text-primary rounded-circle p-3 d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px' }}>
              <Users size={24} />
            </div>
            <div>
              <p className="text-uppercase text-muted m-0 small fw-bold">Total Workers</p>
              <h3 className="m-0 fw-bold">{totalWorkersCount}</h3>
              <p className="text-muted m-0 small">{activeWorkersCount} Active</p>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="saas-card p-3 d-flex align-items-center gap-3">
            <div className="bg-success bg-opacity-10 text-success rounded-circle p-3 d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px' }}>
              <UserCheck size={24} />
            </div>
            <div>
              <p className="text-uppercase text-muted m-0 small fw-bold">Present Today</p>
              <h3 className="m-0 fw-bold text-success">{presentTodayCount}</h3>
              <p className="text-muted m-0 small">{absentTodayCount} Absent Today</p>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="saas-card p-3 d-flex align-items-center gap-3">
            <div className="bg-warning bg-opacity-10 text-warning rounded-circle p-3 d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px' }}>
              <Coins size={24} />
            </div>
            <div>
              <p className="text-uppercase text-muted m-0 small fw-bold">Today's Salary</p>
              <h3 className="m-0 fw-bold text-warning">₹ {todaySalaryCost.toLocaleString('en-IN')}</h3>
              <p className="text-muted m-0 small">Accrued cost</p>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="saas-card p-3 d-flex align-items-center gap-3">
            <div className="bg-danger bg-opacity-10 text-danger rounded-circle p-3 d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px' }}>
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-uppercase text-muted m-0 small fw-bold">Pending Salary</p>
              <h3 className="m-0 fw-bold text-danger">₹ {pendingSalaryTotal.toLocaleString('en-IN')}</h3>
              <p className="text-muted m-0 small">Outstanding pay</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="saas-card p-3 mb-4">
        <div className="row g-3 align-items-center">
          <div className="col-12 col-md-5">
            <div className="position-relative">
              <Search size={18} className="position-absolute top-50 translate-middle-y text-muted" style={{ left: '12px' }} />
              <input
                type="text"
                className="form-control-modern w-100 ps-5 py-2"
                placeholder="Search worker by name or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="col-12 col-sm-6 col-md-3">
            <div className="d-flex align-items-center gap-2">
              <SlidersHorizontal size={16} className="text-muted" />
              <select 
                className="form-select form-select-sm form-control-modern py-2 flex-grow-1"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="col-12 col-sm-6 col-md-4">
            <div className="d-flex align-items-center gap-2">
              <ArrowUpDown size={16} className="text-muted" />
              <select 
                className="form-select form-select-sm form-control-modern py-2 flex-grow-1"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="name">Sort by Name</option>
                <option value="recently_added">Recently Added</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2 text-muted">Loading worker profiles...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredWorkers.length === 0 && (
        <div className="saas-card text-center p-5 mb-4">
          <Users size={48} className="text-muted mb-3 mx-auto" />
          <h5 className="fw-bold">No Workers Found</h5>
          <p className="text-muted max-w-md mx-auto">
            Try adjusting your search criteria or register a new worker to start tracking daily attendance and wages.
          </p>
          <button className="btn btn-primary-modern mt-3" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Add First Worker
          </button>
        </div>
      )}

      {/* Workers Grid */}
      {!isLoading && filteredWorkers.length > 0 && (
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4 mb-4">
          {filteredWorkers.map((worker) => {
            const daysWorked = worker.stats ? (worker.stats.presentDays + worker.stats.halfDays) : 0;
            const outstanding = worker.stats ? worker.stats.outstandingSalary : 0;

            return (
              <div key={worker._id} className="col">
                <div 
                  className="saas-card h-100 d-flex flex-column justify-content-between p-4 cursor-pointer hover-card border-top border-4"
                  style={{ 
                    borderTopColor: worker.status === 'Active' ? 'var(--secondary)' : 'var(--accent)',
                    cursor: 'pointer' 
                  }}
                  onClick={() => navigate(`/workers/${worker._id}`)}
                >
                  <div>
                    {/* Header Details */}
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <h5 className="fw-bold mb-1 text-truncate" style={{ maxWidth: '180px' }}>{worker.name}</h5>
                        {worker.jobRole ? (
                          <span className="small text-muted d-flex align-items-center gap-1">
                            <Briefcase size={12} /> {worker.jobRole}
                          </span>
                        ) : (
                          <span className="small text-muted">General Worker</span>
                        )}
                      </div>
                      <span className={`badge-modern ${worker.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>
                        {worker.status}
                      </span>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="row g-2 bg-light rounded p-2 mb-3">
                      <div className="col-6">
                        <span className="small text-muted d-block">Days Worked</span>
                        <strong className="text-dark">{daysWorked} days</strong>
                      </div>
                      <div className="col-6">
                        <span className="small text-muted d-block">Pending Pay</span>
                        <strong className={outstanding > 0 ? 'text-danger' : 'text-success'}>
                          ₹ {outstanding.toLocaleString('en-IN')}
                        </strong>
                      </div>
                    </div>

                    {/* Attendance Summary */}
                    {worker.currentMonthAttendance && (
                      <div className="mb-3">
                        <span className="small text-muted fw-bold d-block mb-1">This Month Attendance</span>
                        <div className="d-flex gap-2">
                          <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25" title="Present">
                            P: {worker.currentMonthAttendance.present}
                          </span>
                          <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25" title="Half Day">
                            HD: {worker.currentMonthAttendance.halfDay}
                          </span>
                          <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25" title="Absent">
                            A: {worker.currentMonthAttendance.absent}
                          </span>
                          <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25" title="Leave">
                            L: {worker.currentMonthAttendance.leave}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Footer info */}
                  <div className="border-top pt-3 mt-auto d-flex justify-content-between align-items-center">
                    <span className="small text-muted">Wage: ₹ {worker.defaultDailyWage}/day</span>
                    <button className="btn btn-sm btn-link p-0 text-primary fw-bold d-flex align-items-center gap-1" onClick={(e) => { e.stopPropagation(); navigate(`/workers/${worker._id}`); }}>
                      View Details <Eye size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Worker Modal */}
      {showAddModal && (
        <div className="modal fade show d-block animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-white border-bottom">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <Users size={20} className="text-primary" /> Add New Worker
                </h5>
                <button type="button" className="btn-close" onClick={handleCloseModal}></button>
              </div>

              {!duplicateConfirm ? (
                <form onSubmit={handleSubmit}>
                  <div className="modal-body p-4 bg-light">
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label">Worker Name <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          className="form-control-modern w-100"
                          name="name"
                          placeholder="Enter full name"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      
                      <div className="col-12 col-sm-6">
                        <label className="form-label">Job/Role <span className="text-muted">(Optional)</span></label>
                        <input
                          type="text"
                          className="form-control-modern w-100"
                          name="jobRole"
                          placeholder="e.g. Feeder, Cleaner"
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
                        <label className="form-label">Phone Number <span className="text-muted">(Optional)</span></label>
                        <input
                          type="text"
                          className="form-control-modern w-100"
                          name="phoneNumber"
                          placeholder="10-digit number"
                          value={formData.phoneNumber}
                          onChange={handleInputChange}
                        />
                      </div>

                      <div className="col-12 col-sm-6">
                        <label className="form-label">Entered By <span className="text-danger">*</span></label>
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
                        <label className="form-label">Address <span className="text-muted">(Optional)</span></label>
                        <textarea
                          rows="2"
                          className="form-control-modern w-100"
                          name="address"
                          placeholder="Enter home address"
                          value={formData.address}
                          onChange={handleInputChange}
                        />
                      </div>

                      <div className="col-12">
                        <label className="form-label">Notes <span className="text-muted">(Optional)</span></label>
                        <textarea
                          rows="2"
                          className="form-control-modern w-100"
                          name="notes"
                          placeholder="Add any extra notes about worker..."
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

      {/* Assign Work Modal */}
      {showAssignWorkModal && (
        <div className="modal fade show d-block animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-white border-bottom">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <Briefcase size={20} className="text-primary" /> Assign Work
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowAssignWorkModal(false)}></button>
              </div>
              <form onSubmit={handleAssignWorkSubmit}>
                <div className="modal-body p-4 bg-light">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label">Worker <span className="text-danger">*</span></label>
                      <select
                        className="form-select form-control-modern w-100"
                        value={assignWorkForm.workerId}
                        onChange={(e) => setAssignWorkForm({ ...assignWorkForm, workerId: e.target.value })}
                        required
                      >
                        <option value="" disabled>Select Worker</option>
                        {activeWorkers.map(w => (
                          <option key={w._id} value={w._id}>{w.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12">
                      <label className="form-label">Work Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control-modern w-100"
                        placeholder="e.g. Cleaning cages"
                        value={assignWorkForm.workName}
                        onChange={(e) => setAssignWorkForm({ ...assignWorkForm, workName: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label">Date <span className="text-danger">*</span></label>
                      <input
                        type="date"
                        className="form-control-modern w-100"
                        value={assignWorkForm.workDate}
                        onChange={(e) => setAssignWorkForm({ ...assignWorkForm, workDate: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-white border-top">
                  <button type="button" className="btn btn-light border fw-medium" onClick={() => setShowAssignWorkModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary-modern fw-medium" disabled={assignWorkMutation.isPending}>
                    {assignWorkMutation.isPending ? 'Assigning...' : 'Assign Work'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {showAttendanceModal && (
        <div className="modal fade show d-block animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-white border-bottom">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <CheckCircle size={20} className="text-success" /> Attendance
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowAttendanceModal(false)}></button>
              </div>
              <form onSubmit={handleAttendanceSubmit}>
                <div className="modal-body p-4 bg-light">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label">Worker <span className="text-danger">*</span></label>
                      <select
                        className="form-select form-control-modern w-100"
                        value={attendanceForm.workerId}
                        onChange={handleAttendanceWorkerChange}
                        required
                      >
                        <option value="" disabled>Select Worker</option>
                        {activeWorkers.map(w => (
                          <option key={w._id} value={w._id}>{w.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12">
                      <label className="form-label">Date <span className="text-danger">*</span></label>
                      <input
                        type="date"
                        className="form-control-modern w-100"
                        value={attendanceForm.date}
                        onChange={(e) => setAttendanceForm({ ...attendanceForm, date: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label d-block">Attendance <span className="text-danger">*</span></label>
                      <div className="d-flex gap-4 mt-2">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="attendanceStatus"
                            id="statusPresent"
                            value="Present"
                            checked={attendanceForm.attendance === 'Present'}
                            onChange={() => handleAttendanceStatusChange('Present')}
                          />
                          <label className="form-check-label" htmlFor="statusPresent">Present</label>
                        </div>
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="attendanceStatus"
                            id="statusAbsent"
                            value="Absent"
                            checked={attendanceForm.attendance === 'Absent'}
                            onChange={() => handleAttendanceStatusChange('Absent')}
                          />
                          <label className="form-check-label" htmlFor="statusAbsent">Absent</label>
                        </div>
                      </div>
                    </div>

                    <div className="col-12">
                      <label className="form-label">Daily Salary (₹)</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control-modern w-100"
                        value={attendanceForm.dailySalary}
                        onChange={(e) => setAttendanceForm({ ...attendanceForm, dailySalary: e.target.value })}
                        disabled={attendanceForm.attendance === 'Absent'}
                        placeholder={attendanceForm.attendance === 'Absent' ? '0' : 'Enter wage'}
                        required={attendanceForm.attendance === 'Present'}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-white border-top">
                  <button type="button" className="btn btn-light border fw-medium" onClick={() => setShowAttendanceModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-success fw-medium animate-fade-in" style={{ backgroundColor: 'var(--secondary)', borderColor: 'var(--secondary)' }} disabled={saveAttendanceMutation.isPending}>
                    {saveAttendanceMutation.isPending ? 'Saving...' : 'Save Attendance'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Payment Summary Table Modal */}
      {showPaymentTableModal && (
        <div className="modal fade show d-block animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg" style={{ maxWidth: '1200px' }}>
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-white border-bottom d-flex justify-content-between align-items-center">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <CreditCard size={20} className="text-warning" /> Pending Payments
                </h5>
                <div className="d-flex align-items-center gap-2">
                  <select
                    className="form-select form-select-sm form-control-modern py-1"
                    style={{ width: '130px' }}
                    value={paymentTableMonth}
                    onChange={(e) => setPaymentTableMonth(Number(e.target.value))}
                  >
                    {monthsList.map((m, idx) => (
                      <option key={m} value={idx}>{m}</option>
                    ))}
                  </select>
                  <select
                    className="form-select form-select-sm form-control-modern py-1"
                    style={{ width: '90px' }}
                    value={paymentTableYear}
                    onChange={(e) => setPaymentTableYear(Number(e.target.value))}
                  >
                    {yearsList.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <button type="button" className="btn-close ms-2" onClick={() => setShowPaymentTableModal(false)}></button>
                </div>
              </div>
              <div className="modal-body p-4 bg-light">
                {isPaymentSummaryLoading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : paymentSummaries.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    No payment records available.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="modern-table">
                      <thead>
                        <tr>
                          <th>Worker</th>
                          <th>Period/Date</th>
                          <th className="text-end">Days Worked</th>
                          <th className="text-end">Salary Earned</th>
                          <th className="text-end">Amount Paid</th>
                          <th className="text-end">Pending Amount</th>
                          <th>Status</th>
                          <th className="text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentSummaries.map((summary) => (
                          <tr key={summary.workerId}>
                            <td className="fw-bold">{summary.workerName}</td>
                            <td>{summary.period}</td>
                            <td className="text-end">{summary.daysWorked}</td>
                            <td className="text-end">₹{summary.salaryEarned.toLocaleString('en-IN')}</td>
                            <td className="text-end">₹{summary.amountPaid.toLocaleString('en-IN')}</td>
                            <td className="text-end fw-bold text-danger">₹{summary.pendingAmount.toLocaleString('en-IN')}</td>
                            <td>
                              <span className={`badge-modern ${summary.pendingAmount > 0 ? 'badge-warning' : 'badge-success'}`}>
                                {summary.pendingAmount > 0 ? 'Pending' : 'Completed'}
                              </span>
                            </td>
                            <td className="text-center">
                              {summary.pendingAmount > 0 ? (
                                <button className="btn btn-sm btn-primary-modern py-1 px-3" onClick={() => handleOpenMakePayment(summary)}>
                                  Make Payment
                                </button>
                              ) : (
                                <span className="text-muted small">View Only</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer bg-white border-top">
                <button type="button" className="btn btn-light border fw-medium" onClick={() => setShowPaymentTableModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Make Payment Form Modal */}
      {showMakePaymentModal && selectedWorkerForPayment && (
        <div className="modal fade show d-block animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-white border-bottom">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <CreditCard size={20} className="text-success" /> Make Payment
                </h5>
                <button type="button" className="btn-close" onClick={() => { setShowMakePaymentModal(false); setShowPaymentTableModal(true); }}></button>
              </div>
              <form onSubmit={handleMakePaymentSubmit}>
                <div className="modal-body p-4 bg-light">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label">Worker</label>
                      <input
                        type="text"
                        className="form-control-modern w-100 bg-white"
                        value={selectedWorkerForPayment.workerName}
                        disabled
                      />
                    </div>

                    <div className="col-6">
                      <label className="form-label">Pending Amount</label>
                      <input
                        type="text"
                        className="form-control-modern w-100 bg-white text-danger fw-bold"
                        value={`₹${selectedWorkerForPayment.pendingAmount.toLocaleString('en-IN')}`}
                        disabled
                      />
                    </div>

                    <div className="col-6">
                      <label className="form-label">Remaining Balance</label>
                      <input
                        type="text"
                        className="form-control-modern w-100 bg-white text-success fw-bold"
                        value={`₹${(Math.max(0, selectedWorkerForPayment.pendingAmount - Number(paymentForm.amount || 0))).toLocaleString('en-IN')}`}
                        disabled
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label">Payment Amount (₹) <span className="text-danger">*</span></label>
                      <input
                        type="number"
                        min="1"
                        max={selectedWorkerForPayment.pendingAmount}
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
                      <label className="form-label">Notes <span className="text-muted">(Optional)</span></label>
                      <textarea
                        rows="2"
                        className="form-control-modern w-100"
                        placeholder="Add transaction notes..."
                        value={paymentForm.notes}
                        onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-white border-top">
                  <button type="button" className="btn btn-light border fw-medium" onClick={() => { setShowMakePaymentModal(false); setShowPaymentTableModal(true); }}>Back</button>
                  <button type="submit" className="btn btn-primary-modern fw-medium" disabled={makePaymentMutation.isPending}>
                    {makePaymentMutation.isPending ? 'Processing...' : 'Make Payment'}
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
