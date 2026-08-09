const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/workerController');

router.route('/')
  .post(createWorker)
  .get(getWorkers);

router.post('/assignments', assignWork);
router.post('/attendance', saveAttendance);

router.route('/:id')
  .get(getWorkerById)
  .put(updateWorker)
  .delete(deleteWorker);

router.route('/:id/entries')
  .post(addDailyEntry);

router.route('/:id/entries/:entryId')
  .put(updateDailyEntry)
  .delete(deleteDailyEntry);

router.route('/:id/payments')
  .post(addSalaryPayment);

router.route('/:id/payments/:paymentId')
  .put(updateSalaryPayment)
  .delete(deleteSalaryPayment);

module.exports = router;
