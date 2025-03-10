const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: [true, 'Please add a description'],
      trim: true
    },
    amount: {
      type: Number,
      required: [true, 'Please add an amount']
    },
    type: {
      type: String,
      enum: ['deposit', 'withdrawal', 'interest', 'transfer', 'subscription'],
      required: [true, 'Please specify transaction type']
    },
    date: {
      type: Date,
      default: Date.now
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approved: {
      type: Boolean,
      default: function() {
        return this.type === 'interest';  // Auto-approve interest
      }
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Transaction', TransactionSchema);
