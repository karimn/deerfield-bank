const mongoose = require('mongoose');

// IMPORTANT: Turn off strict schemas to support additional fields
mongoose.set('strict', false);

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email'
      ]
    },
    dateOfBirth: {
      type: Date,
      required: false // Not required to support existing users
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true
    },
    role: {
      type: String,
      enum: ['parent', 'child'],
      default: 'child'
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function() {
        return this.role === 'child';
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for user's accounts
UserSchema.virtual('accounts', {
  ref: 'Account',
  localField: '_id',
  foreignField: 'owner',
  justOne: false
});

module.exports = mongoose.model('User', UserSchema);
