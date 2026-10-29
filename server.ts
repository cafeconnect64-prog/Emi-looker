import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface PaymentHistoryItem {
  amount: number;
  date: string;
  method: string;
  receiptId?: string;
  notes?: string;
}

interface CustomerRecord {
  name: string;
  imei: string;
  dueDate: string;
  emiAmount: number;
  isLocked: boolean;
  lastChecked?: Date;
  paymentHistory?: PaymentHistoryItem[];
}

// Mongoose Customer Schema & Model
const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: String, default: () => new Date().toISOString() },
  method: { type: String, default: 'UPI' },
  receiptId: { type: String },
  notes: { type: String },
}, { _id: false });

const customerSchema = new mongoose.Schema({
  name: { type: String, default: 'Unknown' },
  imei: { type: String, required: true, unique: true, index: true },
  dueDate: { type: String, required: true },
  emiAmount: { type: Number, default: 0 },
  isLocked: { type: Boolean, default: false },
  lastChecked: { type: Date, default: Date.now },
  paymentHistory: [paymentSchema],
}, { timestamps: true });

const CustomerModel = mongoose.model('Customer', customerSchema);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Middleware to parse JSON request bodies
  app.use(express.json());

  // In-memory Database Fallback
  let inMemoryCustomers: CustomerRecord[] = [
    {
      name: 'Abhi Kumar',
      imei: '860293049182345',
      dueDate: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday (Overdue)
      emiAmount: 2499,
      isLocked: true,
      paymentHistory: [
        {
          amount: 2499,
          date: new Date(Date.now() - 31 * 86400000).toISOString(),
          method: 'UPI',
          receiptId: 'REC-918201',
          notes: 'GPay Installment #1'
        },
        {
          amount: 2499,
          date: new Date(Date.now() - 61 * 86400000).toISOString(),
          method: 'Bank Transfer',
          receiptId: 'REC-918200',
          notes: 'IMPS Initial Down-EMI'
        }
      ]
    },
    {
      name: 'Rahul Sharma',
      imei: '865120042918442',
      dueDate: new Date(Date.now() + 12 * 86400000).toISOString().split('T')[0],
      emiAmount: 1899,
      isLocked: false,
      paymentHistory: [
        {
          amount: 1899,
          date: new Date(Date.now() - 18 * 86400000).toISOString(),
          method: 'Cash',
          receiptId: 'REC-442101',
          notes: 'Shop counter cash payment'
        }
      ]
    },
    {
      name: 'Pooja Verma',
      imei: '867823059102391',
      dueDate: new Date(Date.now() + 24 * 86400000).toISOString().split('T')[0],
      emiAmount: 3200,
      isLocked: false,
      paymentHistory: [
        {
          amount: 3200,
          date: new Date(Date.now() - 6 * 86400000).toISOString(),
          method: 'Debit Card',
          receiptId: 'REC-239101',
          notes: 'POS Terminal Swipe'
        }
      ]
    },
  ];

  let isMongoConnected = false;
  let mongoConnectionNote = 'Running with high-performance in-memory database store.';

  const isPlaceholderMongoUri = (uri?: string): boolean => {
    if (!uri || !uri.trim()) return true;
    const trimmed = uri.trim();
    return /xxxxx|apka_|your_|example|<.*>|username:password|dummy/i.test(trimmed);
  };

  // Connect to MongoDB if a valid, non-placeholder MONGO_URI or MONGODB_URI is provided
  const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (MONGODB_URI && !isPlaceholderMongoUri(MONGODB_URI)) {
    try {
      await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 4000 });
      isMongoConnected = true;
      mongoConnectionNote = 'Connected to MongoDB Atlas successfully.';
      console.log('Connected to MongoDB Atlas via Mongoose successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      isMongoConnected = false;
      mongoConnectionNote = `Atlas cluster unreachable (${msg}). Using in-memory fallback.`;
      console.log('EMI Server: MongoDB connection offline, continuing seamlessly with in-memory store.');
    }
  } else if (MONGODB_URI) {
    mongoConnectionNote = 'Placeholder connection string detected in MONGO_URI. Using in-memory store.';
    console.log('EMI Server: Placeholder detected in MONGO_URI. Initialized with in-memory customer ledger.');
  }

  // API Health Status
  app.get('/api/health', async (_req, res) => {
    const count = isMongoConnected
      ? await CustomerModel.countDocuments()
      : inMemoryCustomers.length;

    res.json({
      status: 'online',
      service: 'EMI Financing Admin Server',
      database: isMongoConnected ? 'MongoDB Atlas (Connected)' : 'In-Memory Store (Active)',
      mongoStatus: isMongoConnected ? 'CONNECTED' : 'IN_MEMORY_ACTIVE',
      note: mongoConnectionNote,
      activeCustomers: count,
      timestamp: new Date().toISOString(),
    });
  });

  // Get all customers (for frontend inspection)
  app.get('/api/customers', async (_req, res) => {
    if (isMongoConnected) {
      const customers = await CustomerModel.find({});
      return res.json({ customers, source: 'mongoose' });
    }
    return res.json({ customers: inMemoryCustomers, source: 'in-memory' });
  });

  /**
   * 1. REGISTER / UPDATE CUSTOMER EMI
   * Shopkeeper ya Admin yahan customer ki details aur EMI due date save karega.
   */
  app.post('/api/customer', async (req, res) => {
    const { name, imei, dueDate, emiAmount } = req.body;

    if (!imei || !dueDate) {
      return res.status(400).json({ error: 'IMEI and Due Date are required fields.' });
    }

    const today = new Date();
    const due = new Date(dueDate);
    const isOverdue = today > due; // Agar aaj ki date due date se zyada hai toh overdue hai

    if (isMongoConnected) {
      try {
        let customer = await CustomerModel.findOne({ imei });
        if (customer) {
          if (name) customer.name = name;
          customer.dueDate = dueDate;
          if (emiAmount !== undefined) customer.emiAmount = emiAmount;
          customer.isLocked = isOverdue;
          await customer.save();
          return res.json({ success: true, message: 'Customer details updated successfully in MongoDB.', customer });
        } else {
          customer = await CustomerModel.create({
            name: name || 'Unknown',
            imei,
            dueDate,
            emiAmount: emiAmount || 0,
            isLocked: isOverdue,
          });
          return res.status(201).json({ success: true, message: 'Customer registered successfully in MongoDB.', customer });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return res.status(500).json({ error: 'Failed to persist customer in MongoDB', details: msg });
      }
    }

    // In-memory fallback
    let customer = inMemoryCustomers.find(c => c.imei === imei);
    if (customer) {
      customer.name = name || customer.name;
      customer.dueDate = dueDate || customer.dueDate;
      customer.emiAmount = emiAmount || customer.emiAmount;
      customer.isLocked = isOverdue;
      return res.json({ success: true, message: 'Customer details updated successfully.', customer });
    } else {
      const newCustomer: CustomerRecord = {
        name: name || 'Unknown',
        imei,
        dueDate,
        emiAmount: emiAmount || 0,
        isLocked: isOverdue,
      };
      inMemoryCustomers.push(newCustomer);
      return res.status(201).json({ success: true, message: 'Customer registered successfully.', customer: newCustomer });
    }
  });

  /**
   * 2. APP STATUS CHECK API (Called by Android App)
   * Android app har 24 ghante mein ya internet connect hone par is endpoint par request bhejega.
   */
  app.get('/api/check-status/:imei', async (req, res) => {
    const { imei } = req.params;
    const today = new Date();

    if (isMongoConnected) {
      try {
        const customer = await CustomerModel.findOne({ imei });
        if (!customer) {
          return res.status(404).json({ error: 'Device not found in financing database.' });
        }
        const dueDate = new Date(customer.dueDate);
        if (today > dueDate) {
          customer.isLocked = true;
          await customer.save();
        }
        return res.json({
          imei: customer.imei,
          isLocked: customer.isLocked,
          dueDate: customer.dueDate,
          message: customer.isLocked ? 'EMI overdue. Please lock device.' : 'Payment up to date. Device normal.',
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return res.status(500).json({ error: 'Database query failed', details: msg });
      }
    }

    const customer = inMemoryCustomers.find(c => c.imei === imei);
    if (!customer) {
      return res.status(404).json({ error: 'Device not found in financing database.' });
    }

    const dueDate = new Date(customer.dueDate);
    if (today > dueDate) {
      customer.isLocked = true;
    }

    return res.json({
      imei: customer.imei,
      isLocked: customer.isLocked,
      dueDate: customer.dueDate,
      message: customer.isLocked ? 'EMI overdue. Please lock device.' : 'Payment up to date. Device normal.',
    });
  });

  /**
   * 3. ADMIN MANUAL LOCK / UNLOCK API
   * Jab customer payment kar de, toh admin yahan se unka phone unlock kar sakta hai.
   */
  app.post('/api/admin/toggle-lock', async (req, res) => {
    const { imei, isLocked } = req.body;

    if (isMongoConnected) {
      try {
        const customer = await CustomerModel.findOne({ imei });
        if (!customer) {
          return res.status(404).json({ error: 'Customer not found.' });
        }
        customer.isLocked = isLocked;
        await customer.save();
        return res.json({
          success: true,
          message: `Device lock status changed to: ${isLocked ? 'LOCKED' : 'UNLOCKED'}`,
          customer,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return res.status(500).json({ error: 'Database update failed', details: msg });
      }
    }

    const customer = inMemoryCustomers.find(c => c.imei === imei);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    customer.isLocked = isLocked;
    return res.json({
      success: true,
      message: `Device lock status changed to: ${isLocked ? 'LOCKED' : 'UNLOCKED'}`,
      customer,
    });
  });

  /**
   * 4. RECORD PAYMENT & AUTO-EXTEND DUE DATE
   * Simulates customer paying installment at counter or via UPI.
   */
  app.post('/api/admin/payment', async (req, res) => {
    const { imei, amountPaid, method = 'UPI', receiptId, notes } = req.body;
    if (!imei) {
      return res.status(400).json({ error: 'IMEI is required.' });
    }

    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 30);
    const nextDueDateStr = nextDueDate.toISOString().split('T')[0];

    const paymentItem: PaymentHistoryItem = {
      amount: Number(amountPaid) || 0,
      date: new Date().toISOString(),
      method: method || 'UPI',
      receiptId: receiptId || `REC-${Date.now().toString().slice(-6)}`,
      notes: notes || 'EMI installment settled',
    };

    if (isMongoConnected) {
      try {
        const customer = await CustomerModel.findOne({ imei });
        if (!customer) {
          return res.status(404).json({ error: 'Customer not found.' });
        }
        customer.isLocked = false;
        customer.dueDate = nextDueDateStr;
        if (customer.paymentHistory) {
          customer.paymentHistory.push(paymentItem);
        } else {
          (customer as any).paymentHistory = [paymentItem];
        }
        await customer.save();
        return res.json({
          success: true,
          message: `Payment of ₹${paymentItem.amount} via ${paymentItem.method} received. Handset unlocked & due date extended to ${nextDueDateStr}.`,
          customer,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return res.status(500).json({ error: 'Database update failed', details: msg });
      }
    }

    const customer = inMemoryCustomers.find(c => c.imei === imei);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    customer.isLocked = false;
    customer.dueDate = nextDueDateStr;
    if (!customer.paymentHistory) {
      customer.paymentHistory = [];
    }
    customer.paymentHistory.push(paymentItem);
    return res.json({
      success: true,
      message: `Payment of ₹${paymentItem.amount} via ${paymentItem.method} received. Handset unlocked & due date extended to ${nextDueDateStr}.`,
      customer,
    });
  });

  /**
   * 5. DELETE CUSTOMER RECORD
   */
  app.delete('/api/customer/:imei', async (req, res) => {
    const { imei } = req.params;

    if (isMongoConnected) {
      try {
        const result = await CustomerModel.deleteOne({ imei });
        if (result.deletedCount === 0) {
          return res.status(404).json({ error: 'Customer not found.' });
        }
        return res.json({ success: true, message: `Customer with IMEI ${imei} deleted successfully.` });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return res.status(500).json({ error: 'Database deletion failed', details: msg });
      }
    }

    const initialLen = inMemoryCustomers.length;
    inMemoryCustomers = inMemoryCustomers.filter(c => c.imei !== imei);
    if (inMemoryCustomers.length === initialLen) {
      return res.status(404).json({ error: 'Customer not found.' });
    }
    return res.json({ success: true, message: `Customer with IMEI ${imei} deleted successfully.` });
  });

  /**
   * 6. TEST MONGODB CONNECTION STRING
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
        details: 'The URI contains placeholder text (such as "xxxxx" or "apka_username"). Please provide your active MongoDB Atlas cluster URL from mongodb.com.',
      });
    }

    try {
      // Disconnect current connection if open
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
      isMongoConnected = true;
      const count = await CustomerModel.countDocuments();
      return res.json({
        success: true,
        message: 'Successfully connected to MongoDB Atlas via Mongoose!',
        readyState: mongoose.connection.readyState,
        databaseName: mongoose.connection.name,
        existingCustomerCount: count,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      isMongoConnected = false;
      let friendlyDetails = msg;
      if (msg.includes('ENOTFOUND')) {
        friendlyDetails = 'MongoDB cluster hostname not found (DNS query failed). Double-check your cluster address.';
      }
      return res.status(400).json({
        success: false,
        error: 'Failed to connect to MongoDB',
        details: friendlyDetails,
      });
    }
  });

  // Full-Stack: Vite Middleware in dev or static dist in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`EMI Server with Mongoose ODM is running on port ${PORT}`);
  });
}

startServer();
