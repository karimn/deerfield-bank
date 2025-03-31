const mongoose = require('mongoose');

const RecurringTransactionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    amount: {
      type: Number,
      required: [true, 'Please add an amount']
    },
    type: {
      type: String,
      enum: ['allowance', 'subscription', 'interest', 'other'],
      required: [true, 'Please specify transaction type']
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
      required: [true, 'Please specify frequency']
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    distribution: {
      // For allowance type, to store percentage distribution
      spending: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
      },
      saving: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
      },
      donation: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
      }
    },
    nextDate: {
      type: Date,
      required: [true, 'Please add the next date']
    },
    lastProcessed: {
      type: Date,
      default: null
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('RecurringTransaction', RecurringTransactionSchema);