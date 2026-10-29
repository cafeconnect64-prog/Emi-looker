/**
 * EMI Mobile Financing Backend Server
 * Run with: node server.js
 */
import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';

const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());

// Connect to MongoDB (Replace with your MongoDB Atlas URI for cloud or local URI for testing)
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

let isMongoConnected = false;

const isPlaceholderMongoUri = (uri) => {
  if (!uri || !uri.trim()) return true;
  return /xxxxx|apka_|your_|example|<.*>|username:password|dummy|localhost:27017/i.test(uri.trim());
};

if (MONGO_URI && !isPlaceholderMongoUri(MONGO_URI)) {
  mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 4000 })
    .then(() => {
      isMongoConnected = true;
      console.log('Connected to MongoDB Atlas successfully!');
    })
    .catch(err => {
      isMongoConnected = false;
      console.log('EMI Server note: MongoDB Atlas offline, running with fallback store:', err.message);
    });
} else if (MONGO_URI) {
  console.log('EMI Server note: Placeholder detected in MONGO_URI. Initialized with in-memory store.');
}

// Define Payment Schema & Customer Schema
const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  method: { type: String, default: 'UPI' }, // e.g. 'UPI', 'Cash', 'Card', 'Bank Transfer'
  receiptId: { type: String },
  notes: { type: String }
}, { _id: false });

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  imei: { type: String, required: true, unique: true },
  dueDate: { type: Date, required: true },
  emiAmount: { type: Number, required: true },
  isLocked: { type: Boolean, default: false },
  paymentHistory: [paymentSchema]
}, { timestamps: true });

const Customer = mongoose.model('Customer', customerSchema);

// In-memory fallback dataset for sandbox/local testing without mongod
let inMemoryCustomers = [
  {
    name: "Abhi Kumar",
    imei: "860293049182345",
    dueDate: new Date(Date.now() - 86400000), // Yesterday (Overdue)
    emiAmount: 2499,
    isLocked: true,
    paymentHistory: [
      {
        amount: 2499,
        date: new Date(Date.now() - 31 * 86400000),
        method: "UPI",
        receiptId: "REC-918201",
        notes: "GPay Installment #1"
      },
      {
        amount: 2499,
        date: new Date(Date.now() - 61 * 86400000),
        method: "Bank Transfer",
        receiptId: "REC-918200",
        notes: "IMPS Initial Down-EMI"
      }
    ]
  },
  {
    name: "Rahul Sharma",
    imei: "865120042918442",
    dueDate: new Date(Date.now() + 12 * 86400000),
    emiAmount: 1899,
    isLocked: false,
    paymentHistory: [
      {
        amount: 1899,
        date: new Date(Date.now() - 18 * 86400000),
        method: "Cash",
        receiptId: "REC-442101",
        notes: "Shop counter cash payment"
      }
    ]
  },
  {
    name: "Pooja Verma",
    imei: "867823059102391",
    dueDate: new Date(Date.now() + 24 * 86400000),
    emiAmount: 3200,
    isLocked: false,
    paymentHistory: [
      {
        amount: 3200,
        date: new Date(Date.now() - 6 * 86400000),
        method: "Debit Card",
        receiptId: "REC-239101",
        notes: "POS Terminal Swipe"
      }
    ]
  }
];

// Health / Status endpoint
app.get('/api', async (req, res) => {
  const count = isMongoConnected 
    ? await Customer.countDocuments().catch(() => inMemoryCustomers.length)
    : inMemoryCustomers.length;

  res.json({
    status: "online",
    service: "EMI Mobile Financing Device Admin Backend",
    mongoStatus: isMongoConnected ? "CONNECTED" : "FALLBACK_IN_MEMORY (Start MongoDB or set MONGO_URI)",
    mongoUri: MONGO_URI.replace(/\/\/.*@/, '//***:***@'),
    routes: [
      "POST /api/customer",
      "GET /api/check-status/:imei",
      "POST /api/admin/toggle-lock",
      "GET /api/customers"
    ],
    totalCustomers: count
  });
});

app.get('/api/customers', async (req, res) => {
  if (isMongoConnected) {
    try {
      const customers = await Customer.find({});
      return res.json({ customers, storage: 'mongodb' });
    } catch {
      // fallback
    }
  }
  res.json({ customers: inMemoryCustomers, storage: 'in-memory' });
});

/**
 * 1. REGISTER / UPDATE CUSTOMER EMI
 */
app.post('/api/customer', async (req, res) => {
  try {
    const { name, imei, dueDate, emiAmount } = req.body;
    
    if (!imei || !dueDate) {
      return res.status(400).json({ error: "IMEI and Due Date are required fields." });
    }

    const today = new Date();
    const due = new Date(dueDate);
    const isOverdue = today > due;

    if (isMongoConnected) {
      let customer = await Customer.findOne({ imei });

      if (customer) {
        customer.name = name || customer.name;
        customer.dueDate = due;
        customer.emiAmount = emiAmount !== undefined ? emiAmount : customer.emiAmount;
        customer.isLocked = isOverdue;
        await customer.save();
        return res.json({ success: true, message: "Customer details updated successfully.", customer });
      } else {
        customer = new Customer({
          name: name || "Unknown",
          imei,
          dueDate: due,
          emiAmount: emiAmount || 0,
          isLocked: isOverdue
        });
        await customer.save();
        return res.status(201).json({ success: true, message: "Customer registered successfully.", customer });
      }
    }

    // In-Memory Fallback
    let customer = inMemoryCustomers.find(c => c.imei === imei);
    if (customer) {
      customer.name = name || customer.name;
      customer.dueDate = due;
      customer.emiAmount = emiAmount !== undefined ? emiAmount : customer.emiAmount;
      customer.isLocked = isOverdue;
      return res.json({ success: true, message: "Customer details updated successfully.", customer });
    } else {
      const newCustomer = {
        name: name || "Unknown",
        imei,
        dueDate: due,
        emiAmount: emiAmount || 0,
        isLocked: isOverdue
      };
      inMemoryCustomers.push(newCustomer);
      return res.status(201).json({ success: true, message: "Customer registered successfully.", customer: newCustomer });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 2. APP STATUS CHECK API (Called by Android App)
 */
app.get('/api/check-status/:imei', async (req, res) => {
  try {
    const { imei } = req.params;
    const today = new Date();

    if (isMongoConnected) {
      const customer = await Customer.findOne({ imei });

      if (!customer) {
        return res.status(404).json({ error: "Device not found in financing database." });
      }

      const dueDate = new Date(customer.dueDate);
      
      if (today > dueDate && !customer.isLocked) {
        customer.isLocked = true;
        await customer.save();
      }

      return res.json({
        imei: customer.imei,
        isLocked: customer.isLocked,
        dueDate: customer.dueDate,
        message: customer.isLocked ? "EMI overdue. Please lock device." : "Payment up to date. Device normal."
      });
    }

    // In-Memory Fallback
    const customer = inMemoryCustomers.find(c => c.imei === imei);
    if (!customer) {
      return res.status(404).json({ error: "Device not found in financing database." });
    }

    const dueDate = new Date(customer.dueDate);
    if (today > dueDate && !customer.isLocked) {
      customer.isLocked = true;
    }

    res.json({
      imei: customer.imei,
      isLocked: customer.isLocked,
      dueDate: customer.dueDate,
      message: customer.isLocked ? "EMI overdue. Please lock device." : "Payment up to date. Device normal."
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 3. ADMIN MANUAL LOCK / UNLOCK API
 */
app.post('/api/admin/toggle-lock', async (req, res) => {
  try {
    const { imei, isLocked } = req.body;

    if (isMongoConnected) {
      const customer = await Customer.findOne({ imei });

      if (!customer) {
        return res.status(404).json({ error: "Customer not found." });
      }

      customer.isLocked = isLocked;
      await customer.save();

      return res.json({ 
        success: true, 
        message: `Device lock status changed to: ${isLocked ? "LOCKED" : "UNLOCKED"}`,
        customer 
      });
    }

    // In-Memory Fallback
    const customer = inMemoryCustomers.find(c => c.imei === imei);
    if (!customer) {
      return res.status(404).json({ error: "Customer not found." });
    }

    customer.isLocked = isLocked;
    res.json({ 
      success: true, 
      message: `Device lock status changed to: ${isLocked ? "LOCKED" : "UNLOCKED"}`,
      customer 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 4. RECORD PAYMENT & EXTEND DUE DATE
 */
app.post('/api/admin/payment', async (req, res) => {
  try {
    const { imei, amountPaid, method = 'UPI', notes, receiptId } = req.body;
    if (!imei) {
      return res.status(400).json({ error: "IMEI is required." });
    }

    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 30);

    const paymentEntry = {
      amount: Number(amountPaid) || 0,
      date: new Date(),
      method: method || 'UPI',
      receiptId: receiptId || `REC-${Date.now().toString().slice(-6)}`,
      notes: notes || 'EMI installment settled'
    };

    if (isMongoConnected) {
      const customer = await Customer.findOne({ imei });
      if (!customer) {
        return res.status(404).json({ error: "Customer not found." });
      }
      customer.isLocked = false;
      customer.dueDate = nextDueDate;
      if (!customer.paymentHistory) {
        customer.paymentHistory = [];
      }
      customer.paymentHistory.push(paymentEntry);
      await customer.save();
      return res.json({
        success: true,
        message: `Payment of ₹${paymentEntry.amount} via ${paymentEntry.method} received. Device unlocked & due date extended to ${nextDueDate.toISOString().split('T')[0]}.`,
        customer
      });
    }

    const customer = inMemoryCustomers.find(c => c.imei === imei);
    if (!customer) {
      return res.status(404).json({ error: "Customer not found." });
    }
    customer.isLocked = false;
    customer.dueDate = nextDueDate;
    if (!customer.paymentHistory) {
      customer.paymentHistory = [];
    }
    customer.paymentHistory.push(paymentEntry);
    res.json({
      success: true,
      message: `Payment of ₹${paymentEntry.amount} via ${paymentEntry.method} received. Device unlocked & due date extended to ${nextDueDate.toISOString().split('T')[0]}.`,
      customer
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 5. DELETE CUSTOMER
 */
app.delete('/api/customer/:imei', async (req, res) => {
  try {
    const { imei } = req.params;
    if (isMongoConnected) {
      const result = await Customer.deleteOne({ imei });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "Customer not found." });
      }
      return res.json({ success: true, message: "Customer deleted successfully." });
    }

    const initialLen = inMemoryCustomers.length;
    inMemoryCustomers = inMemoryCustomers.filter(c => c.imei !== imei);
    if (inMemoryCustomers.length === initialLen) {
      return res.status(404).json({ error: "Customer not found." });
    }
    res.json({ success: true, message: "Customer deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 6. TEST MONGODB ATLAS CONNECTION STRING
 */
app.post('/api/test-mongo', async (req, res) => {
  const { uri } = req.body;
  if (!uri) {
    return res.status(400).json({ error: 'MongoDB connection string (URI) is required.' });
  }

  if (isPlaceholderMongoUri(uri)) {
    return res.status(400).json({
      success: false,
      error: 'Placeholder connection string detected',
      details: 'The URI contains placeholder text (such as "xxxxx" or "apka_username"). Please provide your active MongoDB Atlas cluster URL from mongodb.com.'
    });
  }

  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
    isMongoConnected = true;
    const count = await Customer.countDocuments();
    return res.json({
      success: true,
      message: 'Successfully connected to MongoDB Atlas via Mongoose!',
      readyState: mongoose.connection.readyState,
      databaseName: mongoose.connection.name,
      existingCustomerCount: count
    });
  } catch (err) {
    isMongoConnected = false;
    let friendly = err.message;
    if (friendly.includes('ENOTFOUND')) {
      friendly = 'Could not reach cluster host (DNS lookup failed). Verify your cluster hostname.';
    }
    return res.status(400).json({
      success: false,
      error: 'Failed to connect to MongoDB',
      details: friendly
    });
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`EMI Server with MongoDB is running on port ${PORT}`);
});
