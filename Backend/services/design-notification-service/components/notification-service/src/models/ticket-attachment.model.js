const mongoose = require('mongoose');

const ticketAttachmentSchema = new mongoose.Schema(
    {
        filename: { type: String, required: true, unique: true, index: true },
        originalName: { type: String, default: '' },
        contentType: { type: String, required: true },
        size: { type: Number, default: 0 },
        data: { type: Buffer, required: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model('TicketAttachment', ticketAttachmentSchema);
