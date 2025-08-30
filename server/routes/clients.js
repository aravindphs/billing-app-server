const express = require('express');
const Client = require('../models/Client');
const auth = require('../middleware/auth');
const router = express.Router();

// @route   GET api/clients
// @desc    Get all user's clients
router.get('/', auth, async (req, res) => {
  try {
    const clients = await Client.find({ userId: req.user.id }).sort({ name: 1 });
    res.json(clients);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/clients
// @desc    Add new client
router.post('/', auth, async (req, res) => {
  const { name, email } = req.body;
  try {
    const newClient = new Client({
      name,
      email,
      userId: req.user.id,
    });
    const client = await newClient.save();
    res.json(client);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/clients/:id
// @desc    Update client
router.put('/:id', auth, async (req, res) => {
  const { name, email } = req.body;
  const clientFields = { name, email };

  try {
    let client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ msg: 'Client not found' });
    if (client.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }
    client = await Client.findByIdAndUpdate(
      req.params.id,
      { $set: clientFields },
      { new: true }
    );
    res.json(client);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/clients/:id
// @desc    Delete client
router.delete('/:id', auth, async (req, res) => {
  try {
    let client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ msg: 'Client not found' });
    if (client.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }
    await Client.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Client removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;