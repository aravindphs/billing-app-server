const express = require('express');
const Invoice = require('../models/Invoice');
const Client = require('../models/Client');
const auth = require('../middleware/auth');
const nodemailer = require('nodemailer');
const router = express.Router();
const PdfPrinter = require("pdfmake");
const htmlToPdfmake = require("html-to-pdfmake");
const fs = require("fs");
const path = require("path");
const {JSDOM} = require("jsdom");

const { window } = new JSDOM('');

const fonts = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

const printer = new PdfPrinter(fonts);

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

// @route   GET api/invoices/:id/download
// @desc    Download invoice as PDF
router.get('/:id/download', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice || invoice.userId.toString() !== req.user.id) {
      return res.status(404).json({ msg: 'Invoice not found' });
    }

    // Build minimal HTML (add more fields/table if you want)
    const html = `
      <h1>Invoice</h1>
      <p><b>Client:</b> ${invoice.clientName}</p>
      <p><b>Issue Date:</b> ${new Date(invoice.issueDate).toDateString()}</p>
      <p><b>Due Date:</b> ${new Date(invoice.dueDate).toDateString()}</p>
      <h3>Items</h3>
      <ul>
        ${invoice.items
          .map(i => `<li>${i.description} — ${i.quantity} × $${Number(i.unitPrice).toFixed(2)}</li>`)
          .join('')}
      </ul>
      <h2>Total: $${Number(invoice.total).toFixed(2)}</h2>
    `;

    // Convert HTML → pdfmake structure (with window)
    const content = htmlToPdfmake(html, { window });

    const docDefinition = {
      content,
      defaultStyle: { font: 'Helvetica' },
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="invoice-${invoice._id}.pdf"`
    );

    pdfDoc.on('error', (err) => {
      console.error('PDF generation error:', err);
      if (!res.headersSent) res.status(500).end('Failed to generate PDF');
    });

    pdfDoc.pipe(res);
    pdfDoc.end();
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
    if (!client || !client.email) {
      return res.status(400).json({ msg: 'Client email not found' });
    }

    console.log("Sending email to:", client.email);

    const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
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
    console.error("EMAIL ERROR:", error);
    res.status(500).json({ message: 'Failed to send email', error: error.message });
  }
});


module.exports = router;