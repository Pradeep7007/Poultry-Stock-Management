import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { KEYS, fetchWorkers } from '../services/queries';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useNotifications } from '../context/NotificationContext';
import { 
  Plus, Search, Users, UserCheck, Coins, DollarSign, Briefcase, 
  AlertCircle, Eye, SlidersHorizontal, ArrowUpDown
} from 'lucide-react';

const WorkerManagement = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();

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

  // Fetch Workers
  const { data: workers = [], isLoading, isError } = useQuery({
    queryKey: KEYS.WORKERS,
    queryFn: fetchWorkers
  });

  if (isError) {
    toast.error('Failed to load workers data');
  }

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
    </div>
  );
};

export default WorkerManagement;
