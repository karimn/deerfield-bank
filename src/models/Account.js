const mongoose = require('mongoose');

const AccountSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add an account name'],
      trim: true
    },
    type: {
      type: String,
      enum: ['spending', 'saving', 'donation'],
      required: [true, 'Please specify account type']
    },
    balance: {
      type: Number,
      default: 0
    },
    interestRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for account's transactions
AccountSchema.virtual('transactions', {
  ref: 'Transaction',
  localField: '_id',
  foreignField: 'account',
  justOne: false
});

module.exports = mongoose.model('Account', AccountSchema);
