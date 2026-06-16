const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
    full_name: {
        type: String,
        required: true,
        trim: true
    },
    organization_name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    notifications: [
        {
            message: {
                type: String,
                required: true,
                trim: true
            },
            type: {
                type: String,
                default: 'info'
            },
            event: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Hackathon'
            },
            user_name: {
                type: String,
                trim: true
            },
            createdAt: {
                type: Date,
                default: Date.now
            }
        }
    ]
}, {
    timestamps: true,
    collection: 'admins'
});

module.exports = mongoose.model('Admin', AdminSchema);