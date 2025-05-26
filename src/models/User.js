const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true
    },
    firstName: {
      type: String,
      trim: true
    },
    lastName: {
      type: String,
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
      type: Date
    },
    phone: {
      type: String,
      trim: true
    },
    auth0Id: {
      type: String,
      unique: true,
      sparse: true
    },
    role: {
      type: String,
      enum: ['parent', 'child'],
      default: 'child'
    },
    parents: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    // Legacy field for backward compatibility - will be migrated to parents array
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
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

// Helper methods for managing parents
UserSchema.methods.addParent = function(parentId) {
  if (!this.parents.includes(parentId)) {
    this.parents.push(parentId);
  }
  return this.save();
};

UserSchema.methods.removeParent = function(parentId) {
  this.parents = this.parents.filter(id => !id.equals(parentId));
  return this.save();
};

UserSchema.methods.hasParent = function(parentId) {
  return this.parents.some(id => id.equals(parentId));
};

UserSchema.methods.getAllParents = function() {
  // Include both new parents array and legacy parent field
  const allParents = [...this.parents];
  if (this.parent && !allParents.some(id => id.equals(this.parent))) {
    allParents.push(this.parent);
  }
  return allParents;
};

// Static method to find children of a parent
UserSchema.statics.findChildrenOfParent = function(parentId) {
  return this.find({
    $or: [
      { parents: parentId },
      { parent: parentId } // Include legacy parent field
    ],
    role: 'child'
  });
};

module.exports = mongoose.model('User', UserSchema);
