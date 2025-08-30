const mongoose = require('mongoose');
const invoiceSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  clientName: { type: String, required: true },
  dueDate: { type: Date, required: true },
  items: [{ description: String, quantity: Number, unitPrice: Number }],
  total: { type: Number, required: true },
  status: { type: String, default: 'Draft' },
  userId: { type: String, required: true },
}, { timestamps: { createdAt: 'issueDate' } });
module.exports = mongoose.model('Invoice', invoiceSchema);