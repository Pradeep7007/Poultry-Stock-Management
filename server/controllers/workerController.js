const Worker = require('../models/Worker');
const DailyWorkEntry = require('../models/DailyWorkEntry');
const SalaryPayment = require('../models/SalaryPayment');
const WorkAssignment = require('../models/WorkAssignment');

// Helper to calculate statistics for workers
const calculateWorkerStats = async (workerId) => {
  const entries = await DailyWorkEntry.find({ workerId });
  const payments = await SalaryPayment.find({ workerId });

  let totalWorkingDays = entries.length;
  let presentDays = entries.filter(e => e.attendance === 'Present').length;
  let halfDays = entries.filter(e => e.attendance === 'Half Day').length;
  let absentDays = entries.filter(e => e.attendance === 'Absent').length;
  let leaveDays = entries.filter(e => e.attendance === 'Leave').length;

  let totalSalaryEarned = entries.reduce((acc, curr) => acc + (curr.dailyWage || 0), 0);
  let totalSalaryPaid = payments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  let outstandingSalary = totalSalaryEarned - totalSalaryPaid;

  return {
    totalWorkingDays,
    presentDays,
    halfDays,
    absentDays,
    leaveDays,
    totalSalaryEarned,
    totalSalaryPaid,
    outstandingSalary
  };
};

// @desc    Create new worker
// @route   POST /api/workers
const createWorker = async (req, res) => {
  try {
    const { 
      name, 
      enteredBy, 
      dateAdded, 
      defaultDailyWage, 
      phoneNumber, 
      address, 
      jobRole, 
      notes,
      confirmDuplicate
    } = req.body;

    if (!name || !enteredBy || defaultDailyWage === undefined) {
      return res.status(400).json({ message: 'Please provide name, enteredBy, and default daily wage.' });
    }

    const trimmedName = name.trim();

    // Check duplicate name
    const existingWorker = await Worker.findOne({ name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } });
    if (existingWorker && !confirmDuplicate) {
      return res.status(400).json({ 
        requiresConfirmation: true, 
        message: `A worker named "${existingWorker.name}" already exists. Do you want to add them anyway?` 
      });
    }

    const worker = await Worker.create({
      name: trimmedName,
      enteredBy: enteredBy.trim(),
      dateAdded: dateAdded || new Date(),
      defaultDailyWage: Number(defaultDailyWage),
      phoneNumber: phoneNumber ? phoneNumber.trim() : '',
      address: address ? address.trim() : '',
      jobRole: jobRole ? jobRole.trim() : '',
      notes: notes ? notes.trim() : '',
      status: 'Active'
    });

    res.status(201).json({ message: 'Worker added successfully', data: worker });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all workers with computed stats
// @route   GET /api/workers
const getWorkers = async (req, res) => {
  try {
    const workers = await Worker.find({}).sort({ name: 1 });
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

    const workerListWithStats = await Promise.all(workers.map(async (worker) => {
      const stats = await calculateWorkerStats(worker._id);
      
      // Calculate current month attendance
      const currentMonthEntries = await DailyWorkEntry.find({
        workerId: worker._id,
        date: { $gte: startOfMonth, $lte: endOfMonth }
      });

      const currentMonthAttendance = {
        present: currentMonthEntries.filter(e => e.attendance === 'Present').length,
        halfDay: currentMonthEntries.filter(e => e.attendance === 'Half Day').length,
        absent: currentMonthEntries.filter(e => e.attendance === 'Absent').length,
        leave: currentMonthEntries.filter(e => e.attendance === 'Leave').length,
      };

      // Calculate today's entry
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const todayEntry = await DailyWorkEntry.findOne({
        workerId: worker._id,
        date: { $gte: todayStart, $lte: todayEnd }
      });

      return {
        ...worker.toObject(),
        stats,
        currentMonthAttendance,
        todayEntry
      };
    }));

    res.json(workerListWithStats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single worker details
// @route   GET /api/workers/:id
const getWorkerById = async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    const stats = await calculateWorkerStats(worker._id);
    const entries = await DailyWorkEntry.find({ workerId: worker._id }).sort({ date: -1 });
    const payments = await SalaryPayment.find({ workerId: worker._id }).sort({ paymentDate: -1 });

    res.json({
      worker,
      stats,
      entries,
      payments
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update worker
// @route   PUT /api/workers/:id
const updateWorker = async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    const { name, enteredBy, defaultDailyWage, phoneNumber, address, jobRole, notes, status } = req.body;

    if (name) worker.name = name.trim();
    if (enteredBy) worker.enteredBy = enteredBy.trim();
    if (defaultDailyWage !== undefined) worker.defaultDailyWage = Number(defaultDailyWage);
    if (phoneNumber !== undefined) worker.phoneNumber = phoneNumber.trim();
    if (address !== undefined) worker.address = address.trim();
    if (jobRole !== undefined) worker.jobRole = jobRole.trim();
    if (notes !== undefined) worker.notes = notes.trim();
    if (status) worker.status = status;

    const updatedWorker = await worker.save();
    res.json(updatedWorker);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete worker
// @route   DELETE /api/workers/:id
const deleteWorker = async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    // Delete associated entries and payments
    await DailyWorkEntry.deleteMany({ workerId: worker._id });
    await SalaryPayment.deleteMany({ workerId: worker._id });
    await worker.deleteOne();

    res.json({ message: 'Worker and all associated history removed successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add daily work entry
// @route   POST /api/workers/:id/entries
const addDailyEntry = async (req, res) => {
  try {
    const { date, attendance, dailyWage, workDetails, createdBy } = req.body;
    const workerId = req.params.id;

    if (!date || !attendance || !createdBy) {
      return res.status(400).json({ message: 'Please provide date, attendance, and createdBy.' });
    }

    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    // Check if entry already exists for this date (ignoring time)
    const entryDate = new Date(date);
    const startOfDate = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
    const endOfDate = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate(), 23, 59, 59);

    const existingEntry = await DailyWorkEntry.findOne({
      workerId,
      date: { $gte: startOfDate, $lte: endOfDate }
    });

    if (existingEntry) {
      return res.status(400).json({ 
        message: 'An attendance or work entry already exists for this date. Please edit the existing entry.' 
      });
    }

    // Calculate daily wage if not overridden
    let finalWage = Number(dailyWage);
    if (dailyWage === undefined || dailyWage === null || dailyWage === '') {
      if (attendance === 'Present') {
        finalWage = worker.defaultDailyWage;
      } else if (attendance === 'Half Day') {
        finalWage = worker.defaultDailyWage / 2;
      } else {
        finalWage = 0;
      }
    }

    if (finalWage < 0) {
      return res.status(400).json({ message: 'Wage cannot be negative.' });
    }

    const entry = await DailyWorkEntry.create({
      workerId,
      date: entryDate,
      attendance,
      dailyWage: finalWage,
      workDetails: workDetails ? workDetails.trim() : '',
      createdBy: createdBy.trim()
    });

    res.status(201).json({ message: 'Daily work entry added successfully', data: entry });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update daily work entry
// @route   PUT /api/workers/:id/entries/:entryId
const updateDailyEntry = async (req, res) => {
  try {
    const { date, attendance, dailyWage, workDetails, createdBy } = req.body;
    const { id: workerId, entryId } = req.params;

    const entry = await DailyWorkEntry.findById(entryId);
    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    if (date) {
      const entryDate = new Date(date);
      const startOfDate = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
      const endOfDate = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate(), 23, 59, 59);

      // Check if another entry exists for this date
      const duplicateEntry = await DailyWorkEntry.findOne({
        _id: { $ne: entryId },
        workerId,
        date: { $gte: startOfDate, $lte: endOfDate }
      });

      if (duplicateEntry) {
        return res.status(400).json({ message: 'Another entry already exists for this date.' });
      }
      entry.date = entryDate;
    }

    if (attendance) entry.attendance = attendance;
    if (dailyWage !== undefined) {
      if (Number(dailyWage) < 0) {
        return res.status(400).json({ message: 'Wage cannot be negative.' });
      }
      entry.dailyWage = Number(dailyWage);
    }
    if (workDetails !== undefined) entry.workDetails = workDetails.trim();
    if (createdBy) entry.createdBy = createdBy.trim();

    const updatedEntry = await entry.save();
    res.json(updatedEntry);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete daily work entry
// @route   DELETE /api/workers/:id/entries/:entryId
const deleteDailyEntry = async (req, res) => {
  try {
    const entry = await DailyWorkEntry.findById(req.params.entryId);
    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    await entry.deleteOne();
    res.json({ message: 'Daily work entry removed.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add salary payment
// @route   POST /api/workers/:id/payments
const addSalaryPayment = async (req, res) => {
  try {
    const { paymentDate, amount, paymentMethod, notes } = req.body;
    const workerId = req.params.id;

    if (!paymentDate || amount === undefined || !paymentMethod) {
      return res.status(400).json({ message: 'Please provide payment date, amount, and payment method.' });
    }

    if (Number(amount) < 0) {
      return res.status(400).json({ message: 'Payment amount cannot be negative.' });
    }

    const payment = await SalaryPayment.create({
      workerId,
      paymentDate: new Date(paymentDate),
      amount: Number(amount),
      paymentMethod,
      notes: notes ? notes.trim() : ''
    });

    res.status(201).json({ message: 'Salary payment recorded successfully', data: payment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update salary payment
// @route   PUT /api/workers/:id/payments/:paymentId
const updateSalaryPayment = async (req, res) => {
  try {
    const { paymentDate, amount, paymentMethod, notes } = req.body;
    const { paymentId } = req.params;

    const payment = await SalaryPayment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found' });
    }

    if (paymentDate) payment.paymentDate = new Date(paymentDate);
    if (amount !== undefined) {
      if (Number(amount) < 0) {
        return res.status(400).json({ message: 'Payment amount cannot be negative.' });
      }
      payment.amount = Number(amount);
    }
    if (paymentMethod) payment.paymentMethod = paymentMethod;
    if (notes !== undefined) payment.notes = notes.trim();

    const updatedPayment = await payment.save();
    res.json(updatedPayment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete salary payment
// @route   DELETE /api/workers/:id/payments/:paymentId
const deleteSalaryPayment = async (req, res) => {
  try {
    const payment = await SalaryPayment.findById(req.params.paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found' });
    }

    await payment.deleteOne();
    res.json({ message: 'Salary payment record removed.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Assign work to a worker and automatically record attendance
// @route   POST /api/workers/assignments
const assignWork = async (req, res) => {
  try {
    const { workerId, workName, workDate, createdBy } = req.body;

    if (!workerId || !workName || !workDate || !createdBy) {
      return res.status(400).json({ message: 'Please provide workerId, workName, workDate, and createdBy.' });
    }

    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found.' });
    }

    // 1. Create a work assignment record
    const assignment = await WorkAssignment.create({
      workerId,
      workName: workName.trim(),
      workDate: new Date(workDate),
      createdBy: createdBy.trim()
    });

    // 2. Automatically create/update the worker's attendance for that date as Present
    const entryDate = new Date(workDate);
    const startOfDate = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
    const endOfDate = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate(), 23, 59, 59);

    let dailyEntry = await DailyWorkEntry.findOne({
      workerId,
      date: { $gte: startOfDate, $lte: endOfDate }
    });

    if (dailyEntry) {
      dailyEntry.attendance = 'Present';
      const existingDetails = dailyEntry.workDetails ? dailyEntry.workDetails.trim() : '';
      const newWork = workName.trim();
      if (existingDetails) {
        if (!existingDetails.includes(newWork)) {
          dailyEntry.workDetails = `${existingDetails}, ${newWork}`;
        }
      } else {
        dailyEntry.workDetails = newWork;
      }
      if (dailyEntry.dailyWage === 0 && worker.defaultDailyWage > 0) {
        dailyEntry.dailyWage = worker.defaultDailyWage;
      }
      dailyEntry.createdBy = createdBy.trim();
      await dailyEntry.save();
    } else {
      await DailyWorkEntry.create({
        workerId,
        date: startOfDate,
        attendance: 'Present',
        dailyWage: worker.defaultDailyWage,
        workDetails: workName.trim(),
        createdBy: createdBy.trim()
      });
    }

    res.status(201).json({ message: 'Work assigned and attendance updated to Present.', assignment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Save daily attendance and salary
// @route   POST /api/workers/attendance
const saveAttendance = async (req, res) => {
  try {
    const { workerId, date, attendance, dailySalary, createdBy } = req.body;

    if (!workerId || !date || !attendance || !createdBy) {
      return res.status(400).json({ message: 'Please provide workerId, date, attendance, and createdBy.' });
    }

    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found.' });
    }

    const entryDate = new Date(date);
    const startOfDate = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
    const endOfDate = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate(), 23, 59, 59);

    let dailyEntry = await DailyWorkEntry.findOne({
      workerId,
      date: { $gte: startOfDate, $lte: endOfDate }
    });

    const calculatedWage = attendance === 'Absent' ? 0 : Number(dailySalary);

    if (dailyEntry) {
      dailyEntry.attendance = attendance;
      dailyEntry.dailyWage = calculatedWage;
      dailyEntry.createdBy = createdBy.trim();
      await dailyEntry.save();
    } else {
      dailyEntry = await DailyWorkEntry.create({
        workerId,
        date: startOfDate,
        attendance,
        dailyWage: calculatedWage,
        workDetails: '',
        createdBy: createdBy.trim()
      });
    }

    res.status(201).json({ message: 'Attendance saved successfully.', data: dailyEntry });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createWorker,
  getWorkers,
  getWorkerById,
  updateWorker,
  deleteWorker,
  addDailyEntry,
  updateDailyEntry,
  deleteDailyEntry,
  addSalaryPayment,
  updateSalaryPayment,
  deleteSalaryPayment,
  assignWork,
  saveAttendance
};
