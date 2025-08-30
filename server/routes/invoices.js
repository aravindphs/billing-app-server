const express = require('express');
const Invoice = require('../models/Invoice');
const Client = require('../models/Client');
const auth = require('../middleware/auth');
const nodemailer = require('nodemailer');
const router = express.Router();

// @route   GET api/invoices
// @desc    Get all user's invoices
router.get('/', auth, async (req, res) => {
  try {
    const invoices = await Invoice.find({ userId: req.user.id }).sort({ issueDate: -1 });
    res.json(invoices);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/invoices/:id
// @desc    Get a single invoice
router.get('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice || invoice.userId.toString() !== req.user.id) {
      return res.status(404).json({ msg: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


// @route   POST api/invoices
// @desc    Create a new invoice
router.post('/', auth, async (req, res) => {
  const { clientId, dueDate, items, total } = req.body;
  try {
    const client = await Client.findById(clientId);
    if (!client || client.userId.toString() !== req.user.id) {
      return res.status(404).json({ msg: 'Client not found for this user' });
    }

    const newInvoice = new Invoice({
      userId: req.user.id,
      clientId,
      clientName: client.name,
      dueDate,
      items,
      total,
      status: 'Draft',
    });

    const invoice = await newInvoice.save();
    res.json(invoice);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/invoices/:id/send
// @desc    Send invoice email to client
router.post('/:id/send', auth, async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice || invoice.userId.toString() !== req.user.id) {
          return res.status(404).json({ msg: 'Invoice not found' });
        }
        
        const client = await Client.findById(invoice.clientId);

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD,
            },
        });

        await transporter.sendMail({
            from: `"Your Agency" <${process.env.GMAIL_USER}>`,
            to: client.email,
            subject: `Invoice from Your Agency`,
            html: `<h1>Invoice</h1><p>Hi ${client.name}, here is your invoice for $${invoice.total}.</p>`,
        });

        invoice.status = 'Sent';
        await invoice.save();
        res.json({ message: 'Email sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to send email' });
    }
});

module.exports = router;