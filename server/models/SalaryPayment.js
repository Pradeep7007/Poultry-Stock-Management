const mongoose = require('mongoose');

const salaryPaymentSchema = mongoose.Schema(
  {
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true },
    paymentDate: { type: Date, required: [true, 'Payment date is required'] },
    amount: { type: Number, required: [true, 'Amount is required'], min: 0 },
    paymentMethod: { 
      type: String, 
      enum: ['Cash', 'Bank Transfer', 'UPI', 'Other'], 
      required: [true, 'Payment method is required'] 
    },
    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

salaryPaymentSchema.index({ workerId: 1 });
salaryPaymentSchema.index({ paymentDate: 1 });

const SalaryPayment = mongoose.model('SalaryPayment', salaryPaymentSchema);

module.exports = SalaryPayment;
