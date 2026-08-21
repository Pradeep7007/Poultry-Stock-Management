import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { KEYS } from '../services/queries';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import './BatchCreation.css';

const BatchCreation = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const { user, currentUserName } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    startedHens: '',
    enteredBy: currentUserName
  });

  useEffect(() => {
    if (!formData.enteredBy) {
      setFormData(prev => ({ ...prev, enteredBy: currentUserName }));
    }
  }, [currentUserName]);
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Batch Name is required';
    if (!formData.startDate) newErrors.startDate = 'Start Date is required';
    if (!formData.endDate) newErrors.endDate = 'End Date is required';
    if (!formData.startedHens || Number(formData.startedHens) <= 0) newErrors.startedHens = 'Starting Hen Count must be positive';
    if (!formData.enteredBy.trim()) newErrors.enteredBy = 'Entered By is required';
    if (formData.startDate && formData.endDate && new Date(formData.startDate) > new Date(formData.endDate)) {
      newErrors.endDate = 'End Date must be after the Start Date';
    }
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/batches', payload),
    onSuccess: (res) => {
      toast.success('Batch created successfully!');
      addNotification('success', 'Batch Created', `Initialized new batch ${formData.name} with ${formData.startedHens} hens.`);
      queryClient.invalidateQueries({ queryKey: KEYS.BATCHES });
      navigate('/hens');
    },
    onError: (error) => {
      const errMsg = error.response?.data?.message || 'Failed to create batch';
      toast.error(errMsg);
      addNotification('error', 'Batch Creation Failed', errMsg);
    },
    onSettled: () => setIsSubmitting(false)
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    createMutation.mutate(formData);
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="container py-5 batch-creation-wrapper fade-in">
      <div className="row justify-content-center">
        <div className="col-12 col-md-10 col-lg-8">
          
          <div className="saas-card modern-card shadow-sm border-0">
            <div className="card-header bg-transparent border-0 pt-4 pb-0 px-4 px-md-5">
              <h2 className="fw-bold text-main mb-1">Create New Batch</h2>
              <p className="text-muted small">Enter the batch details below to initialize a new group.</p>
            </div>
            
            <div className="card-body p-4 p-md-5 pt-3">
              <form onSubmit={handleSubmit} noValidate>
                
                <div className="mb-4">
                  <label className="form-label fw-semibold text-secondary">Batch Name <span className="text-danger">*</span></label>
                  <input type="text" className={`form-control form-control-modern ${errors.name ? 'is-invalid' : ''}`} name="name" value={formData.name} onChange={handleChange} />
                  {errors.name && <div className="invalid-feedback fw-medium">{errors.name}</div>}
                </div>

                <div className="row g-4 mb-4">
                  <div className="col-12 col-sm-6">
                    <label className="form-label fw-semibold text-secondary">Start Date <span className="text-danger">*</span></label>
                    <input type="date" className={`form-control form-control-modern ${errors.startDate ? 'is-invalid' : ''}`} name="startDate" value={formData.startDate} onChange={handleChange} />
                    {errors.startDate && <div className="invalid-feedback fw-medium">{errors.startDate}</div>}
                  </div>
                  <div className="col-12 col-sm-6">
                    <label className="form-label fw-semibold text-secondary">End Date <span className="text-danger">*</span></label>
                    <input type="date" className={`form-control form-control-modern ${errors.endDate ? 'is-invalid' : ''}`} name="endDate" value={formData.endDate} onChange={handleChange} />
                    {errors.endDate && <div className="invalid-feedback fw-medium">{errors.endDate}</div>}
                  </div>
                </div>

                <div className="row g-4 mb-5">
                  <div className="col-12 col-sm-6">
                    <label className="form-label fw-semibold text-secondary">Starting Hen Count <span className="text-danger">*</span></label>
                    <input type="number" min="1" className={`form-control form-control-modern ${errors.startedHens ? 'is-invalid' : ''}`} name="startedHens" value={formData.startedHens} onChange={handleChange} />
                    {errors.startedHens && <div className="invalid-feedback fw-medium">{errors.startedHens}</div>}
                  </div>
                  <div className="col-12 col-sm-6">
                    <label className="form-label fw-semibold text-secondary">Created By (Name) <span className="text-danger">*</span></label>
                    <input type="text" className={`form-control form-control-modern ${errors.enteredBy ? 'is-invalid' : ''}`} name="enteredBy" value={formData.enteredBy} onChange={handleChange} placeholder="e.g. Pradeep Kumar" />
                    {errors.enteredBy && <div className="invalid-feedback fw-medium">{errors.enteredBy}</div>}
                  </div>
                </div>

                <div className="alert alert-primary bg-primary bg-opacity-10 text-primary border-0 rounded-3 d-flex align-items-center p-3 mb-4">
                  <div className="me-3 fs-4">ℹ️</div>
                  <div>
                    <strong className="d-block mb-1">Automatic Phase Assignment</strong>
                    <span className="small">The system automatically handles phase assignments and marks previous batches as Completed.</span>
                  </div>
                </div>

                <div className="d-flex flex-column flex-sm-row justify-content-end gap-3 mt-4">
                  <button type="button" className="btn btn-light btn-lg modern-btn px-4 fw-medium text-secondary border" onClick={handleCancel} disabled={isSubmitting}>Cancel</button>
                  <button type="submit" className="btn-primary-modern btn-lg px-5 fw-medium" disabled={isSubmitting}>
                    {isSubmitting ? <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Creating...</> : 'Create Batch'}
                  </button>
                </div>
              </form>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default BatchCreation;
