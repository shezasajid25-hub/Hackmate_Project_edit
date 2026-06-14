const mongoose = require('mongoose');

const HackathonSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    target_date: {
        type: String,
        required: true
    },
    tracks: {
        type: [String],
        default: []
    },
    is_paid: {
        type: Boolean,
        default: false
    },
    entry_fee: {
        type: Number,
        default: 0
    },
    location_name: {
        type: String,
        required: true,
        trim: true
    },
    registration_link: {
        type: String,
        required: true,
        trim: true
    },
    organizer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    status: {
        type: String,
        enum: ['PUBLISHED', 'UNPUBLISHED'],
        default: 'PUBLISHED'
    },
    poster: {
        type: String,
        default: ""
    }
}, {
    timestamps: true,
    collection: 'hackathons'
});

module.exports = mongoose.model('Hackathon', HackathonSchema);