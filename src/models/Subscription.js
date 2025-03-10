const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a subscription name'],
      trim: true
    },
    amount: {
      type: Number,
      required: [true, 'Please add an amount']
    },
    frequency: {
      type: String,
      enum: ['weekly', 'monthly', 'yearly'],
      required: [true, 'Please specify frequency']
    },
    nextDate: {
      type: Date,
      required: [true, 'Please add the next date']
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true
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

module.exports = mongoose.model('Subscription', SubscriptionSchema);
